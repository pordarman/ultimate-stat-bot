"use strict";
const mongodb = require("mongodb");
const client = new mongodb.MongoClient(process.env.MONGO_URI);
const LRUCache = require("lru-cache");
const os = require("os");
const Util = require("./Util.js");

// Bunları Map yapmamızın sebebi
// Sürekli bütün kullanıcılara erişim sağlayacağız, çoğu komut bütün kullanıcıların verisini alacağı için Map kullanıyoruz
// Yoksa her seferinde database'e erişim sağlamak zorunda kalırız ve bu da performansı etkiler
// Bu yüzden Map kullanıyoruz, eğer cache'de yoksa database'e erişim sağlıyoruz ve cache'e ekliyoruz
// Fakat bu da belleği etkiliyor bu yüzden belleği yüksek olan sunucularda kullanılması önerilir
// Eğer belleği düşük olan bir sunucuda kullanıyorsanız, cache'i silmek için cache.delete(userId) yapabilirsiniz
const messageCaches = new Map();
const voiceCaches = new Map();

const blacklistCaches = new LRUCache.LRUCache({
    max: 50_000,
    ttl: 1000 * 60 * 60, // 1 saat
    updateAgeOnGet: true
});

const updateCache = new Map();
const updateTimers = new Map();
const UPDATE_TIMEOUT = 5000;

let isClosing = false;

/**
 * @typedef {Object} MemberStatVoiceDatasObject
 * @property {Number} duration - Ses süresi
 * @property {Number} startedTimestamp - Ses kanalına giriş zamanı
 * @property {Number} endedTimestamp - Ses kanalından çıkış zamanı
*/

/**
 * @typedef {Object} MemberStatVoiceChannelObject
 * @property {Number} total - Toplam ses süresi
 * @property {MemberStatVoiceDatasObject[]} datas - Ses süresi bilgileri
 */

/**
 * @typedef {Object} MemberStatCurrVoiceObject
 * @property {string} channelId - Ses kanalının ID'si
 * @property {Number} startedTimestamp - Ses kanalına giriş zamanı
*/

/**
 * @typedef {Object} MemberStatVoiceObject
 * @property {String} userId - Kullanıcının ID'si
 * @property {String} guildId - Kullanıcının bulunduğu sunucunun ID'si
 * @property {Number} total - Toplam ses süresi
 * @property {MemberStatCurrVoiceObject} current - Şu anda ses kanalında olan üye bilgileri
 * @property {Object<string, MemberStatVoiceChannelObject>} channels - Kullanıcının ses kanalları ve süreleri
 */

/**
 * @typedef {Object} MemberStatMessageObject
 * @property {String} userId - Kullanıcının ID'si
 * @property {Number} total - Toplam mesaj sayısı
 * @property {Object<string, Array<Number>>} channels - Kullanıcının mesajları ve zamanları
 */

/**
 * @typedef {Object} BlacklistObject
 * @property {String} userId - Kullanıcının ID'si
 * @property {String} moderatorId - Kullanıcıyı karalisteye ekleyen moderatörün ID'si
 * @property {String} reason - Karalisteye eklenme sebebi
 * @property {Number} createdTimestamp - Karalisteye eklenme zamanı
 */

class MongoDB {


    /**
     * @async
     * Bütün ayarlamaları otomatik olarak yapar
     * @returns {Promise<Boolean>}
     */
    async init() {
        // Eğer daha önceden bağlantı varsa bağlantıyı kapat
        await client.close(true);
        const isConnected = await this.connect();

        // Bağlantı başarısız oldu
        if (!isConnected) {
            Util.console.error(`Şu anda MongoDB sunucusuna bağlanamıyoruz, lütfen daha sonra yeniden deneyiniz!`);
            process.exit(1);
        }

        const db = client.db("Main");

        this.messages = db.collection("Messages");
        this.voices = db.collection("Voices");

        this.messages.createIndex({ userId: 1 }, { unique: true });
        this.voices.createIndex({ userId: 1 }, { unique: true });

        // Uygulamada bir hata olduğunda konsola yazdır
        client.on("error", (error) => {
            Util.console.error(error);
        });

        // Uygulama kapatıldığında MongoDB bağlantısını kapat
        const shutdown = async () => {
            if (isClosing) return;
            isClosing = true;

            Util.console.log("Uygulama kapanıyor, MongoDB bağlantısı kapatılıyor...");

            // MongoDB bağlantısını kapatmadan önce bütün timeout'ları çalıştır
            await Promise.all([...updateTimers.keys()].map(async (key) => {
                clearTimeout(updateTimers.get(key));
                const [collection, fileId] = key.split(".");

                await this.updateFile(
                    fileId,
                    updateCache.get(fileId),
                    collection,
                    true
                );
            }));

            await client.close(true);
            Util.console.log("MongoDB bağlantısı kapatıldı!");
            process.exit(0);
        };

        // PM2 üzerinden kapatma sinyalleri için
        process.on(
            os.platform() == "win32" ? "SIGINT" : "SIGTERM",
            shutdown
        );

        return true;
    }


    /**
     * @async
     * MongoDB sunucusuna bağlanılır
     * @param {Number} timeout - Sunucuya yeniden bağlanma süresi
     * @returns {Promise<Boolean>}
     */
    async connect() {
        try {
            await client.connect();
            return true;
        } catch (error) {
            Util.console.error(error);
            return false;
        }
    }


    /**
     * İki mongodb objesini birleştirir
     * @param {String} fileName - Birleştirilecek ilk objenin ismi
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Birleştirilecek ikinci obje
     * @returns {void} - Birleştirilmiş obje ilk objenin üzerine yazılır
     */
    combineTwoMongoDBObject(fileName, updateObject) {
        if (!updateCache.has(fileName)) {
            updateCache.set(fileName, { $set: {}, $push: {}, $unset: {}, $inc: {} });
        }

        const cache = updateCache.get(fileName);

        cache.$set ??= {};
        cache.$push ??= {};
        cache.$unset ??= {};
        cache.$inc ??= {};

        // $set işlemlerini birleştir
        if (updateObject.$set) {
            for (const key in updateObject.$set) {
                cache.$set[key] = updateObject.$set[key];

                // Eğer $set işlemi $unset key'lerinin içinde varsa $unset işlemini sil
                for (const cacheKey in cache.$unset) {
                    if (key.startsWith(cacheKey) || cacheKey.startsWith(key)) delete cache.$unset[cacheKey];
                }
            }
        }

        // $push işlemlerini birleştir
        if (updateObject.$push) {
            for (const key in updateObject.$push) {
                cache.$push[key] ??= { $each: [] };

                const pushOrUnshift = updateObject.$push[key].$position == 0 ? "unshift" : "push";
                const eachArray = "$each" in updateObject.$push[key] ? updateObject.$push[key].$each : [updateObject.$push[key]];

                cache.$push[key].$each[pushOrUnshift](...eachArray);
            }
        }

        // $unset işlemlerini birleştir
        if (updateObject.$unset) {
            for (const key in updateObject.$unset) {
                cache.$unset[key] = "";

                // Eğer $unset işlemi $set key'lerinin içinde varsa $set işlemini sil
                for (const cacheKey in cache.$set) {
                    if (key.startsWith(cacheKey) || cacheKey.startsWith(key)) delete cache.$set[cacheKey];
                }
            }
        }

        // $inc işlemlerini birleştir
        if (updateObject.$inc) {
            for (const key in updateObject.$inc) {
                cache.$inc[key] = (cache.$inc[key] ?? 0) + updateObject.$inc[key];
            }
        }
    }


    // #region Get
    /**
     * @async
     * Kullanıcının mesaj verisini döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<MemberStatMessageObject|null>}
     */
    async getUserMessages(userId) {
        const cacheUser = messageCaches.get(userId);
        if (cacheUser) return cacheUser;

        const user = await this.messages.findOne({ userId }, { projection: { _id: 0 } });
        if (user) {
            messageCaches.set(userId, user);
            return user;
        }

        return null;
    }


    /**
     * @async
     * Kullanıcının ses verisini döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<MemberStatVoiceObject|null>}
     */
    async getUserVoices(userId) {
        const cacheUser = voiceCaches.get(userId);
        if (cacheUser) return cacheUser;

        const user = await this.voices.findOne({ userId }, { projection: { _id: 0 } });
        if (user) {
            voiceCaches.set(userId, user);
            return user;
        }

        return null;
    }

    /**
     * @async
     * Kullanıcının hem ses hem de mesaj verisini döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<{ messages: MemberStatMessageObject, voices: MemberStatVoiceObject }>}
     */
    async getUser(userId) {
        const [messages, voices] = await Promise.all([
            this.getUserMessages(userId),
            this.getUserVoices(userId)
        ]);

        return { messages, voices };
    }


    /**
     * @async
     * MongoDB'den belirli bir filtreye göre kullanıcıların mesaj verisini döndürür
     * @param {mongodb.Filter<mongodb.BSON.Document>} filter - Filtre
     * @returns {Promise<MemberStatMessageObject[]>}
     */
    async getMessagesByFilter(filter) {
        const users = await this.messages.find(filter).toArray();
        return users;
    }

    /**
     * @async
     * Bütün kullanıcıların mesaj verisini döndürür
     * @param {Boolean} [cache=true] - Cache'den döndürülüp döndürülmeyeceği
     * @return {Promise<MemberStatMessageObject[]>}
     */
    async getAllMessages(cache = true) {
        return cache ? [...messageCaches.values()] : this.getMessagesByFilter({});
    }

    /**
     * @async
     * MongoDB'den belirli bir filtreye göre kullanıcıların ses verisini döndürür
     * @param {mongodb.Filter<mongodb.BSON.Document>} filter - Filtre
     * @return {Promise<MemberStatVoiceObject[]>}
     */
    async getVoicesByFilter(filter) {
        const users = await this.voices.find(filter).toArray();
        return users;
    }

    /**
     * @async
     * Bütün kullanıcıların ses verisini döndürür
     * @param {Boolean} [cache=true] - Cache'den döndürülüp döndürülmeyeceği
     * @returns {Promise<MemberStatVoiceObject[]>}
     */
    async getAllVoices(cache = true) {
        return cache ? [...voiceCaches.values()] : this.getVoicesByFilter({});
    }


    /**
     * @async
     * MongoDB'den karalistede olan bir kullanıcıyı döndürür
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<BlacklistObject>}
     */
    async getBlacklistedUser(userId) {
        const cacheUser = blacklistCaches.get(userId);
        if (cacheUser) return cacheUser;

        const user = await this.blacklist.findOne({ userId }, { projection: { _id: 0 } });
        if (user) {
            blacklistCaches.set(userId, user);
            return user;
        }

        return null;
    }


    /**
     * @async
     * MongoDB'den belirli bir filtreye göre karalistedeki kullanıcıları döndürür
     * @param {mongodb.Filter<mongodb.BSON.Document>} filter 
     * @returns {Promise<BlacklistObject[]>}
     */
    async getBlacklistedUsersByFilter(filter) {
        const users = await this.blacklist.find(filter).toArray();
        return users;
    }


    /**
     * @async
     * Bütün karalistedeki kullanıcıları döndürür
     * @returns {Promise<BlacklistObject[]>}
     */
    async getAllBlacklistedUsers() {
        return this.getBlacklistedUsersByFilter({});
    }
    // #endregion

    // #region Has
    /**
     * @async
     * Girilen ID'deki kullanının karalistede olup olmadığını kontrol eder
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async isBlacklisted(userId) {
        return Boolean(await this.getBlacklistedUser(userId));
    }
    // #endregion

    // #region Create
    /**
     * @async
     * Kullanıcının mesaj verisini oluşturur
     * @param {MemberStatMessageObject} userData - Kullanıcının mesaj verisi
     * @returns {Promise<MemberStatMessageObject>}
     */
    async createUserMessages(userData) {
        await this.messages.insertOne(userData);
        messageCaches.set(userId, userData);
        return userData;
    }

    /**
     * @async
     * Kullanıcının ses verisini oluşturur
     * @param {MemberStatVoiceObject} userData - Kullanıcının ses verisi
     * @returns {Promise<MemberStatVoiceObject>}
     */
    async createUserVoices(userData) {
        await this.voices.insertOne(userData);
        voiceCaches.set(userId, userData);
        return userData;
    }


    /**
     * @async
     * Bir kullanıcıyı karalisteye ekler
     * @param {String} userId - Kullanıcının id'si
     * @param {String} moderatorId - Kullanıcıyı karalisteye ekleyen moderatörün id'si
     * @param {String} reason - Karalisteye eklenme sebebi
     * @returns {Promise<Boolean>}
     */
    async addUserToBlacklist(userId, moderatorId, reason) {
        const blacklist = {
            userId,
            moderatorId,
            reason,
            createdTimestamp: Date.now()
        };

        await this.blacklist.insertOne(blacklist);
        blacklistCaches.set(userId, blacklist);
        return true;
    }
    // #endregion

    // #region Delete
    /**
     * @async
     * Karalistedeki bir kişiyi siler
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async removeUserFromBlacklist(userId) {
        await this.blacklist.deleteOne({ userId });
        blacklistCaches.delete(userId);
        return true;
    }

    /**
     * @async
     * Bir kişinin mesaj geçmişini siler
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async deleteUserMessages(userId) {
        messageCaches.delete(userId);
        await this.messages.deleteOne({ userId });
        return true;
    }

    /**
     * @async
     * Bir kişinin mesaj geçmişini siler
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async deleteUserVoices(userId) {
        voiceCaches.delete(userId);
        await this.voices.deleteOne({ userId });
        return true;
    }

    /**
     * @async
     * Bir kişinin hem mesaj hem de ses verilerini siler
     * @param {String} userId - Kullanıcının id'si
     * @returns {Promise<Boolean>}
     */
    async deleteUser(userId) {
        await Promise.all([
            this.deleteUserMessages(userId),
            this.deleteUserVoices(userId),
        ]);
        return true;
    }
    // #endregion


    // #region Update
    /**
     * @async
     * MongoDB'deki kullanıcıyı veya ticket'i günceller
     * @param {String} fileId - Güncellenecek verinin ismi (userId veya channelId)
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @param {"messages" | "voices"} collection - Güncellenecek koleksiyon
     * @param {Boolean} force - Güncelleme işlemini zorlaştırır
     * @returns {Promise<Boolean>}
     */
    async updateFile(fileId, updateObject, collection, force = false) {
        if (Object.values(updateObject).every((value) => Object.keys(value).length == 0)) {
            return false;
        }

        this.combineTwoMongoDBObject(fileId, updateObject);

        const key = {
            messages: "userId",
            voices: "userId",
        }[collection];

        // Eğer hemen güncelleme yapılmasını istiyorsa
        if (force) {
            await this[collection].updateOne({ [key]: fileId }, updateCache.get(fileId));
            updateCache.delete(fileId);
            return true;
        }

        // Eğer şu anda devam eden bir setTimeout varsa hiçbir şey yapma
        if (updateTimers.has(`${collection}.${fileId}`)) {
            return true;
        }

        // 5 saniye sonra güncelleme yap
        updateTimers.set(`${collection}.${fileId}`, setTimeout(async () => {
            const cache = updateCache.get(fileId);

            // Bütün keylerde dolaş ve boş bir objesi olan keyleri sil
            for (const key in cache) {
                if (Object.keys(cache[key]).length == 0) {
                    delete cache[key];
                }
            }

            // Database'deki sunucuyu güncelle
            try {
                await this[collection].updateOne({ [key]: fileId }, cache);
            } catch (error) {
                Util.console.error(error);
                Util.console.error(cache);
            } finally {
                updateCache.delete(fileId);
                updateTimers.delete(`${collection}.${fileId}`);
            }
        }, UPDATE_TIMEOUT));

        return true;
    }

    /**
     * @async
     * MongoDB'deki kullanıcının mesaj verilerini günceller
     * @param {String} userId - Güncellenecek kullanıcının id'si
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @returns {Promise<Boolean>}
     */
    async updateMessage(userId, updateObject) {
        return this.updateFile(userId, updateObject, "messages");
    }


    /**
     * @async
     * MongoDB'deki kullanıcının ses verilerini günceller
     * @param {String} userId - Güncellenecek kullanıcının id'si
     * @param {mongodb.UpdateFilter<mongodb.BSON.Document>} updateObject - Güncellenecek veriler
     * @returns {Promise<Boolean>}
     */
    async updateVoice(userId, updateObject) {
        return this.updateFile(userId, updateObject, "voices");
    }


    /**
     * @async
     * Kullanıcının mesaj sayısını günceller
     * @param {String} authorId - Kullanıcının id'si
     * @param {String} channelId - Mesaj atılan kanalın id'si
     * @param {Number} createdTimestamp - Mesajın oluşturulma zamanı
     * @returns {Promise<Boolean>}
     */
    async updateMessageCount(authorId, channelId, createdTimestamp) {
        const user = await this.getUserMessages(authorId);

        if (!user) return this.createUserMessages({
            userId: authorId,
            total: 1,
            channels: {
                [channelId]: [createdTimestamp]
            }
        });

        const channelMessages = user.channels[channelId] ??= [];

        channelMessages.unshift(createdTimestamp);
        user.total++;

        return this.updateMessage(authorId, {
            $push: {
                [`channels.${channelId}`]: {
                    $each: [createdTimestamp],
                    $position: 0
                }
            },
            $inc: { total: 1 }
        });
    }

    /**
     * @async
     * Kullanıcının ses süresini günceller
     * @param {String} userId - Kullanıcının id'si
     * @param {String} guildId - Kullanıcının bulunduğu sunucunun id'si
     * @param {String} oldChannelId - Kullanıcının eski ses kanalının id'si
     * @param {String} channelId - Kullanıcının yeni ses kanalının id'si
     * @returns {Promise<Boolean>}
     */
    async updateVoiceCount(userId, guildId, oldChannelId, channelId) {
        const NOW_TIME = Date.now();

        const user = await this.getUserVoices(userId);

        if (!user) return this.createUserVoices({
            userId,
            guildId,
            total: 0,
            current: channelId ? {
                channelId,
                startedTimestamp: NOW_TIME
            } : {},
            channels: {}
        });

        const setObject = {};
        const pushObject = {};

        // Eğer ses kanalına giriş yapmışsa (Yani önceki ses kanalı yoksa)
        if (!oldChannelId) {
            user.current = setObject[`current`] = {
                startedTimestamp: NOW_TIME,
                channelId
            };
        }
        // Eğer ses kanalını değiştirmişse
        else if (user.current.channelId) {
            // Ses kanalı verisini çek ve veriyi sil
            const {
                startedTimestamp,
                channelId: currChannelId
            } = user.current;

            user.current = setObject[`current`] = channelId ? {
                startedTimestamp: NOW_TIME,
                channelId
            } : {};

            // Seste kaldığı süre
            const time = NOW_TIME - startedTimestamp;

            user.total = setObject[`total`] = (user.total + time);

            const voiceChannel = user.channels[currChannelId] ??= Util.DEFAULTS.memberVoiceStat;
            voiceChannel.total = setObject[`channels.${currChannelId}.total`] = (voiceChannel.total + time);

            const voiceChannelObject = {
                startedTimestamp: NOW_TIME,
                endedTimestamp: NOW_TIME,
                duration: time
            };
            voiceChannel.datas.unshift(voiceChannelObject);
            pushObject[`channels.${channelId}.datas`] = {
                $each: [voiceChannelObject],
                $position: 0
            };
        }

        const channelData = user.channels[channelId] ??= Util.DEFAULTS.memberVoiceStat;
        channelData.total += endedTimestamp - startedTimestamp;

        user.total += endedTimestamp - startedTimestamp;
        user.current.channelId = channelId;
        user.current.startedTimestamp = startedTimestamp;

        return this.updateVoice(userId, {
            $set: setObject,
            $push: pushObject
        });
    }

    // #endregion

    // #region General

    /**
     * @async
     * Önbellekleri temizler
     * @returns {void}
     */
    resetCache() {
        messageCaches.clear();
        voiceCaches.clear();
        blacklistCaches.clear();
    }


    /**
     * @async
     * Önbelleği doldurur
     * @returns {void}
     */
    async initCache() {
        const [messages, voices] = await Promise.all([
            this.getAllMessages(false),
            this.getAllVoices(false)
        ]);

        messages.forEach((user) => messageCaches.set(user.userId, user));
        voices.forEach((user) => voiceCaches.set(user.userId, user));
    }

    /**
     * @async
     * Databasenin ping değerini döndürür
     * @param {String} guildId - Ping değeri alınacak sunucunun verileri
     * @returns {Promise<Number>}
     */
    async ping() {
        const startTime = Date.now();
        await client.db("Main").command({ ping: 1 });
        return Date.now() - startTime;
    }



    /**
     * @async
     * MongoDB'nin versiyonunu döndürür
     * @returns {Promise<String>}
     */
    async version() {
        return (await client.db("Main").admin().serverInfo()).version;
    }

    // #endregion
}

module.exports = new MongoDB();