"use strict";
const {
    EmbedBuilder,
    ButtonInteraction,
    PermissionsBitField,
    GuildMember,
    User,
    Message,
    MessageFlags,
    ModalSubmitInteraction,
    TextChannel,
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
} = require("discord.js");
const { default: chalk } = require("chalk");

const cooldowns = new Map();
const prefixCommands = new Map();
const prefixCommandWithId = new Map();
const buttonCommands = new Map();
const slashCommands = new Map();
let slashDataJSON = [];

/**
 * @typedef {Object} Command
 * @property {String} name - Komut adı
 * @property {String} id - Komut ID'si
 * @property {Array<String>} aliases - Komutun diğer isimleri
 * @property {Boolean} isOwner - Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir
 * @property {Boolean} isAdmin - Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
 * @property {Function} execute - Komutun çalıştırılacağı fonksiyon
 */

/**
 * @typedef {Object} LogObject
 * @property {ButtonInteraction|Message} int - ButtonInteraction
 * @property {String} channelId - Kanal ID
 * @property {String} ticketId - Ticket numarası
 * @property {"ticket_opened" | "ticket_reopened" | "ticket_closed" | "ticket_permclosed" | "ticket_archived" | "user_call" | "channel_delete"} action - Log tipi
 * @property {Number} timestamp - Logun atıldığı zaman
 * @property {String} by - Logu yapan kişinin ID'si
 * @property {String} reason - Logun sebebi
 * @property {String} ticketAuthorId - Ticketin sahibinin ID'si
 * @property {{ ticketAuthorUserName: String, deleteUser?: User }} otherInfo - Diğer bilgiler
 */

/**
  * @typedef {Object} GuildChannelEditOptions
  * @property {string} [name] Kanal adı
  * @property {?string} [topic] Kanal konusu
  * @property {Number} [type] Kanal tipi
  * @property {Number} [parent] Kategorinin ID'si
  * @property {Array<({ id: String, allow: Array, deny: Array })>} [permissionOverwrites]
  */


class Util {

    /**
     * Bir hata mesajı gönderir 
     * @param {Message|ButtonInteraction|ModalSubmitInteraction} message - Mesaj
     * @param {String} content - Embed mesajın içeriği
     * @returns {Promise<Message>}
    */
    error(message, content) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`:x: ${content}`)
            ],
            flags: MessageFlags.Ephemeral
        });
    }


    get reasons() {
        return {
            archived: "Bilet arşivlendi!",
            closed: "Bilet kapatıldı!",
            permclosed: "Bilet kalıcı olarak kapatıldı!",
            call: "Kullanıcı çağrıldı!"
        }
    }

    /**
     * Bir prefix komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setPrefixCommand(commandName, command) {
        prefixCommands.set(commandName, command);
    }

    /**
     * Prefix komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getPrefixCommand(commandName) {
        return prefixCommands.get(commandName);
    }

    /**
     * Prefix komutlarını temizler
     */
    clearPrefixCommands() {
        prefixCommands.clear();
    }


    /**
     * Prefix komutunu ID'si ile yazar
     * @param {String} commandId - Komut ID'si
     * @param {String} commandName - Komut adı
     */
    setPrefixCommandWithId(commandId, commandName) {
        prefixCommandWithId.set(commandId, commandName);
    }


    /**
     * Girilen ID'ye göre prefix komutunu döndürür
     * @param {String} commandId - Komut ID'si
     * @returns {Command} - Komut
     */
    getPrefixCommandWithId(commandId) {
        return prefixCommands.get(prefixCommandWithId.get(commandId));
    }


    /**
     * Prefix komutlarının ID'sini ve komutları döndürür
     * @returns {Map<String, String>} - Komutlar
     */
    getPrefixCommandIds() {
        return prefixCommandWithId;
    }


    /**
     * Prefix komut ID'lerini temizler
     */
    clearPrefixCommandWithId() {
        prefixCommandWithId.clear();
    }

    /**
     * Bir buton komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setButtonCommand(commandName, command) {
        buttonCommands.set(commandName, command);
    }

    /**
     * Buton komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getButtonCommand(commandName) {
        return buttonCommands.get(commandName);
    }

    /**
     * Buton komutlarını temizler
     */
    clearButtonCommands() {
        buttonCommands.clear();
    }

    /**
     * Bir slash komutu ekler
     * @param {String} commandName - Komut adı 
     * @param {Command} command - Komut
     */
    setSlashCommand(commandName, command) {
        slashCommands.set(commandName, command);
    }

    /**
     * Slash komutunu döndürür
     * @param {String} commandName - Komut adı
     * @return {Command} - Komut
     */
    getSlashCommand(commandName) {
        return slashCommands.get(commandName);
    }

    /**
     * Slash komutlarını temizler
     */
    clearSlashCommands() {
        slashCommands.clear();
    }

    /**
     * Slash komutları için JSON verisini döndürür
     * @return {Array} - Slash komutları için JSON verisi
     */
    getSlashDataJSON() {
        return slashDataJSON;
    }

    /**
     * Slash komutları için JSON verisini ayarlar
     * @param {Object} data - Slash komutları için JSON verisi
     */
    pushSlashDataJSON(data) {
        slashDataJSON.push(data);
    }

    /**
     * Slash komutları için JSON verisini temizler
     */
    clearSlashDataJSON() {
        slashDataJSON = [];
    }

    /**
     * Bir Cooldown ekler
     * @param {String} key - Cooldown anahtarı
     * @param {Number} cooldown - Cooldown süresi
     */
    setCooldown(key, cooldown) {
        cooldowns.set(key, cooldown);
    }

    /**
     * Cooldown'u döndürür
     * @param {String} key - Cooldown anahtarı
     * @return {Number} - Cooldown süresi
     */
    getCooldown(key) {
        return cooldowns.get(key);
    }

    /**
     * Cooldownu temizler
     * @param {String} key - Cooldown anahtarı
     */
    deleteCooldown(key) {
        cooldowns.delete(key);
    }

    /**
     * Cooldownları temizler
     */
    clearCooldowns() {
        cooldowns.clear();
    }

    get DEFAULTS() {
        return {
            memberVoiceStat: {
                userId: "",
                total: 0,
                current: {},
                channels: {}
            },
            memberCurrentVoiceStat: {
                channelId: "",
                startedTimestamp: 0,
            },
            memberVoiceChannelStat: {
                total: 0,
                datas: [],
            },
            memberVoiceChannelStatData: {
                duration: 0,
                startedTimestamp: 0,
                endedTimestamp: 0,
            },
        }
    }

    get console() {
        return {
            /**
             * Log mesajı gönderir (Örnek: [2023-10-01 12:00:00] Log mesajı)
             * @param {String} message 
             * @returns 
             */
            log: (message) => console.log(chalk.hex("#00FFFF")(`[${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}] ${message}`)),

            /**
             * Yeşil bir başarılı mesajı gönderir (Örnek: [INFO] Başarılı log mesajı)
             * @param {String} message 
             * @returns 
             */
            success: (message) => console.log(chalk.green(`[INFO] ${message}`)),

            /**
             * Kırmızı bir hata mesajı gönderir (Örnek: [ERROR] Hata log mesajı)
             * @param {String} message 
             * @returns 
             */
            error: (message) => console.log(chalk.red(`[ERROR] ${message}`)),

            /**
             * Turuncu bir uyarı mesajı gönderir (Örnek: [WARN] Uyarı log mesajı)
             * @param {String} message 
             * @returns 
             */
            warn: (message) => console.log(chalk.hex("#FFA500")(`[WARN] ${message}`)),
        }
    }


    /**
     * Kullanıcının moderatör olup olmadığını kontrol eder
     * @param {GuildMember} member - Kullanıcı
     * @returns {Boolean} - Kullanıcı moderatör mü?
     */
    isModerator(member) {
        // Eğer kişi yönetici ise return true
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

        // Eğer mod rolleri yoksa false döndür
        if (process.env.MOD_ROLE_IDS == null) return false;

        const modRolesSet = new Set(process.env.MOD_ROLE_IDS.split(",").map(role => role.trim()));
        return member.roles.cache.some(role => modRolesSet.has(role.id));
    }


    /**
     * Girilen interaction'ı message objesine çevirir
     * @param {ChatInputCommandInteraction} int - Interaction objesi
     * @param {{ content: String, mentions: { user: User, member: GuildMember, role: Role, channel: Channel } }} options - Ekstra bilgiler
     * @returns {Message} - Message objesi
     */
    interactionToMessage(int, { content, mentions } = {}) {
        const message = int;

        // Eğer message objesinde "content: ''" ifadesi yoksa ekle
        if (!message.content) message.content = content || "";

        // message.author'u message.user yap ve sil
        message.author = message.user;
        delete message.user;

        // Eğer message, main, mentions objesi yoksa oluştur
        if (!mentions) mentions = {};

        // message objesine mentions.users, mentions.members, mentions.roles ve mentions.channels ekle
        message.mentions = {};
        const mentionsEntries = [["users", "user"], ["members", "member"], ["roles", "role"], ["channels", "channel"]];
        for (const [key, value] of mentionsEntries) {
            message.mentions[key] = {
                first() {
                    return mentions[value];
                }
            }
        }

        return message;
    }


    /**
     * Girilen message objesini buton interaction objesine çevirir
     * @param {Message} message - Message objesi
     * @returns {ButtonInteraction} - Interaction objesi
     */
    messageToButtonInteraction(message) {
        const int = message;
        int.user = int.author;

        return int;
    }


    /**
     * String'i belirtilen uzunluğa kısaltır ve sonuna "..." ekler
     * @param {String} string - Kısaltılacak string
     * @param {Number} length - Kısaltılacak uzunluk
     * @returns {String} - Kısaltılmış string   
     */
    truncateString(string, length) {
        return string.length > length ? string.slice(0, length - 3) + "..." : string;
    }


    /**
    * .slice .map ve .join komutlarını art arda kullanmaya gerek kalmadan hepsini tek bir döngüde yapmanızı sağlar
    * @param {Array|Collection} array 
    * @param {Number} startIndex
    * @param {Number} endIndex
    * @param {(any, index) => String} mapCallback 
    * @param {String} joinString 
    * @returns {String}
    */
    sliceMapAndJoin(array, startIndex, endIndex, mapCallback, joinString) {
        let finalStr = "";

        // Eğer array bir Collection ise array'a çevir
        if (array.size) array = [...array.values()];

        const minForLoop = Math.min(endIndex, array.length);

        for (let i = startIndex; i < minForLoop; ++i) {
            const result = mapCallback(array[i], i);

            // Eğer ilk döngüdeyse joinString'i ekleme
            finalStr += (i == 0 ? "" : joinString) + result
        }

        return finalStr;
    }


    /**
     * Girilen değerin bir Message olup olmadığını kontrol eder
     * @param {any} value - Kontrol edilecek değer
     * @returns {Boolean}
     */
    isMessage(value) {
        return value instanceof Message;
    }



    /**
     * Girilen sayıyı insan okunabilir bir formata çevirir (örneğin: 1000 -> 1.000)
     * @param {Number} number - Çevirilecek sayı
     * @returns {Boolean}
     */
    toHumanize(number) {
        return number.toLocaleString("tr-TR");
    }


    /**
     * Girilen milisaniye değerini insanların okuyabileceği bir şekilde yeniden düzenler
     * @param {Number} milisecond - Bir **milisaniye** değeri giriniz
     * @param {{ toNow: Boolean, dateStyle: "long" | "short" }} [options] - Döndürülen değeri özelleştirmenizi sağlar
     * @returns {String}
     */
    duration(milisecond, { toNow = false, dateStyle = "long" } = {}) {
        // Girilen değeri bir sayıya dönüştür
        milisecond = Number(milisecond);

        // Eğer girilen değer bir sayı değilse hata döndür
        if (isNaN(milisecond)) return "Geçersiz format (milisecond değeri bir sayı olmalı)";

        // Eğer zamanı şimdiden çıkarmamızı istiyorsa
        if (toNow) milisecond = Math.abs(milisecond - Date.now());

        const style = {
            long: {
                year: "yıl",
                month: "ay",
                day: "gün",
                hour: "saat",
                minute: "dakika",
                second: "saniye",
                milisecond: "milisaniye"
            },
            short: {
                year: "yıl",
                month: "ay",
                day: "gün",
                hour: "saat",
                minute: "dk",
                second: "sn",
                milisecond: "ms"
            }
        }[dateStyle];
        const TIMES = {
            year: 1000 * 60 * 60 * 24 * 365,
            month: 1000 * 60 * 60 * 24 * 30,
            day: 1000 * 60 * 60 * 24,
            hour: 1000 * 60 * 60,
            minute: 1000 * 60,
            second: 1000,
        };

        // Geri döndürülecek değerin array olmasının nedeni: 
        // Her zaman ifadesinin arasına virgül koyacağımız için işleri kolaylaştırmak için başka nedeni yok
        const resultArray = [];

        // Eğer değer 1 yıldan fazlaysa
        if (milisecond >= TIMES.year) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.year)} ${style.year}`
            );
            milisecond %= TIMES.year;
        }

        // Eğer değer 1 aydan fazlaysa
        if (milisecond >= TIMES.month) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.month)} ${style.month}`
            );
            milisecond %= TIMES.month;
        }

        // Eğer değer 1 günden fazlaysa
        if (milisecond >= TIMES.day) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.day)} ${style.day}`
            );
            milisecond %= TIMES.day;
        }

        // Eğer değer 1 saatten fazlaysa
        if (milisecond >= TIMES.hour) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.hour)} ${style.hour}`
            );
            milisecond %= TIMES.hour;
        }

        // Eğer değer 1 dakikadan fazlaysa
        if (milisecond >= TIMES.minute) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.minute)} ${style.minute}`
            );
            milisecond %= TIMES.minute;
        }

        // Eğer değer 1 saniyeden fazlaysa
        if (milisecond >= TIMES.second) {
            resultArray.push(
                `${Math.floor(milisecond / TIMES.second)} ${style.second}`
            );
            milisecond %= TIMES.second;
        }

        // Eğer değer 1 saniyeden bile azsa (yani dizide hiçbir değer yoksa)
        return resultArray.length == 0 ?
            `${milisecond} ${style.milisecond}` :
            resultArray.join(", ");
    }


    /**
     * Girilen string eğer boş ise varsayılan değeri döndürür
     * @param {String} string - Yazı
     * @returns {String}
     */
    stringOr(string) {
        return string || "• Burada gösterilecek hiçbir şey yok...";
    }


    /**
     * Kullanıcıyı alır
     * @param {Client} client - Discord Client
     * @param {String} userId - Kullanıcı ID'si
     * @returns {Promise<GuildMember | null>} - Kullanıcı bilgisi
     */
    async getUser(client, userId) {
        return client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
    }




    /**
     * Girilen sayıyı dizide arar ve bulursa index'ini döndürür
     * @param {Array} array - Aranacak dizi
     * @param {Number} number - Aranacak sayı
     * @param {String} id - Eğer birden fazla aynı sayı varsa hangi ID'ye ait olduğunu bulmak için kullanılır
     * @param {{ findIdCallback: (array: Array, index: Number) => String, findNumberCallback: (array: Array, index: Number) => Number }} options - Eğer birden fazla aynı sayı varsa hangi ID'ye ait olduğunu bulmak için kullanılır
     * @returns {Number}
     */
    binarySearch(array, number, id, { findIdCallback = (array, index) => array[index][0], findNumberCallback = (array, index) => array[index][1] } = {}) {
        let startIndex = 0;
        let endIndex = array.length;

        while (startIndex < endIndex) {

            const middleIndex = Math.floor((endIndex + startIndex) / 2);
            const middleNumber = findNumberCallback(array, middleIndex);

            if (middleNumber === number) {
                const callbackId = findIdCallback(array, middleIndex);
                if (callbackId == id) return middleIndex;

                for (let i = middleIndex - 1; i > -1; --i) {
                    const middleNumber = findNumberCallback(array, i);
                    const callbackId = findIdCallback(array, i);
                    if (middleNumber != number) break;
                    if (callbackId == id) return i;
                }
                for (let i = middleIndex + 1; i < array.length; ++i) {
                    const middleNumber = findNumberCallback(array, i);
                    const callbackId = findIdCallback(array, i);
                    if (middleNumber != number) break;
                    if (callbackId == id) return i;
                }

            } else if (middleNumber > number) {
                startIndex = middleIndex == startIndex ? middleIndex + 1 : middleIndex;
            } else {
                endIndex = middleIndex == endIndex ? middleIndex - 1 : middleIndex;
            }
        }

        return -1;
    }

    /**
     * Girilen sayıyı dizide hangi index'te olacağını döndürür (artan sıralı)
     * @param {Array} array 
     * @param {Number} number 
     * @param {(array: Array, index: Number) => Number} operator 
     * @returns 
     */
    binarySearchFindIndex(array, number, operator = (array, index) => array[index]) {
        let startIndex = 0;
        let endIndex = array.length;

        while (startIndex < endIndex) {
            const middleIndex = Math.floor((endIndex + startIndex) / 2);
            const middleValue = operator(array, middleIndex);

            if (middleValue === number) {
                return middleIndex + 1;
            } else if (middleValue > number) {
                endIndex = middleIndex == endIndex ? middleIndex - 1 : middleIndex;
            } else {
                startIndex = middleIndex == startIndex ? middleIndex + 1 : middleIndex;
            }
        }
        return startIndex;
    }

}

module.exports = new Util();