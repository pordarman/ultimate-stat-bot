"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const statMessages = require("../../../Helpers/StatMessages.js");

module.exports = {
    name: "topüye", // Komutun ismi
    id: "topüye", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
            "topüye",
            "topüyeler",
            "topmembers"
        ],
    description: "Sunucuda en çok mesaj atan ve en çok ses kanalında bulunan üyeleri gösterir", // Komutun açıklaması
    isAdmin: false, // Komutun sadece adminler tarafından kullanılmasını ayarlar
    isOwner: false, // Komutun sadece owner tarafından kullanılmasını ayarlar

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const NOW_TIME = Date.now();

        const authorId = msg.author.id;
        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        const USERS_IN_MESSAGE = 15;
        const lastMessagesObject = {
            hour: 0,
            hour12: 0,
            day: 0,
            week: 0,
            month: 0
        };
        const lastVoicesObject = {
            hour: 0,
            hour12: 0,
            day: 0,
            week: 0,
            month: 0
        };
        const TIMES = {
            hour: 60 * 60 * 1000,
            hour12: 12 * 60 * 60 * 1000,
            day: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000
        };
        let totalMessagesCount = 0;
        let totalVoiceTimes = 0;
        const authorStatDatas = {
            message: 0,
            voice: 0
        };

        const allMessageDatas = [];
        const allVoiceDatas = [];

        const [allMessageStats, allVoiceStats] = await Promise.all([
            database.getAllMessages(),
            database.getAllVoices()
        ]);

        // Kullanıcıların mesaj verilerini çek
        for (let i = 0; i < allMessageStats.length; i++) {
            const messageStat = allMessageStats[i];

            totalMessagesCount += messageStat.total;

            // Kullanıcının mesaj verisini çek
            for (const channelId in messageStat.channels) {
                const channelMessages = messageStat.channels[channelId];
                const length = channelMessages.length;

                // Bütün mesajlarda dolaş ve atılan süreye göre mesaj sayısını kaydet
                for (let i = 0; i < length; i++) {
                    const timestamp = channelMessages[i];

                    // Mesaj son 1 saatte atıldıysa
                    if (NOW_TIME - TIMES.hour <= timestamp) lastMessagesObject.hour += 1;

                    // Mesaj son 12 saatte atıldıysa
                    if (NOW_TIME - TIMES.hour12 <= timestamp) lastMessagesObject.hour12 += 1;

                    // Mesaj son 1 günde atıldıysa
                    if (NOW_TIME - TIMES.day <= timestamp) lastMessagesObject.day += 1;

                    // Mesaj son 1 haftada atıldıysa
                    if (NOW_TIME - TIMES.week <= timestamp) lastMessagesObject.week += 1;

                    // Mesaj son 1 ayda atıldıysa
                    if (NOW_TIME - TIMES.month <= timestamp) lastMessagesObject.month += 1;
                    // Eğer mesaj son 1 aydan daha sonra atıldıysa döngüyü bitir
                    else break;
                }
            }

            // Eğer mesaj sayısı 0'dan büyükse diziye ekle
            if (messageStat.total > 0) {
                allMessageDatas.push([messageStat.userId, messageStat.total]);
            }

            // Eğer mesajı atan kişi ise süresini kaydet
            if (messageStat.userId == authorId) {
                authorStatDatas.message = messageStat.total;
            }
        }

        // Kullanıcıların ses verilerini çek
        for (let i = 0; i < allVoiceStats.length; i++) {
            const voiceStat = JSON.parse(JSON.stringify(allVoiceStats[i]));
            let authorVoiceTime = voiceStat.total;

            totalVoiceTimes += voiceStat.total;

            // Eğer şu anda bir ses kanalında varsa bunu da ekle
            if (voiceStat.current?.channelId) {
                const channelId = voiceStat.current.channelId;
                const total = NOW_TIME - voiceStat.current.startedTimestamp;

                authorVoiceTime += total;

                voiceStat.channels[channelId] ??= Util.DEFAULTS.memberVoiceChannelStat;
                voiceStat.channels[channelId].datas.unshift({
                    duration: total,
                    startedTimestamp: voiceStat.current.startedTimestamp,
                    endedTimestamp: NOW_TIME
                });
            }

            for (const voiceChannelId in voiceStat.channels) {
                const channelData = voiceStat.channels[voiceChannelId];
                const length = channelData.datas.length;

                // Bütün ses verilerinde dolaş ve süreyi yazdır
                for (let i = 0; i < length; i++) {
                    const {
                        duration,
                        endedTimestamp,
                        startedTimestamp
                    } = channelData.datas[i];

                    // Ses verisi son 1 saat içindeyse
                    if (NOW_TIME - TIMES.hour <= startedTimestamp) lastVoicesObject.hour += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.hour));

                    // Ses verisi son 12 saat içindeyse
                    if (NOW_TIME - TIMES.hour12 <= startedTimestamp) lastVoicesObject.hour12 += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.hour12));

                    // Ses verisi son 1 gün içindeyse
                    if (NOW_TIME - TIMES.day <= startedTimestamp) lastVoicesObject.day += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.day));

                    // Ses verisi son 1 hafta içindeyse
                    if (NOW_TIME - TIMES.week <= startedTimestamp) lastVoicesObject.week += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.week));

                    // Ses verisi son 1 ay içindeyse
                    if (NOW_TIME - TIMES.month <= startedTimestamp) lastVoicesObject.month += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.month));
                    // Eğer ses 1 aydan önceyse döngüyü bitir
                    else break;
                }
            }

            // Eğer ses sayısı 0'dan büyükse diziye ekle
            if (authorVoiceTime > 0) {
                allVoiceDatas.push([voiceStat.userId, authorVoiceTime]);
            }

            // Eğer ses kaydeden kişi ise süresini kaydet
            if (voiceStat.userId == authorId) {
                authorStatDatas.voice = authorVoiceTime;
            }
        }

        // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
        const authorMessagePosition = Util.binarySearch(allMessageDatas, authorStatDatas.message, authorId);
        const authorMessageDataCopy = allMessageDatas[authorMessagePosition];
        const topMessages = allMessageDatas.slice(0, USERS_IN_MESSAGE);
        if (authorMessagePosition >= USERS_IN_MESSAGE) topMessages.push(authorMessageDataCopy);

        // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
        const authorVoicePosition = Util.binarySearch(allVoiceDatas, authorStatDatas.voice, authorId);
        const authorVoiceDataCopy = allVoiceDatas[authorVoicePosition];
        const topVoices = allVoiceDatas.slice(0, USERS_IN_MESSAGE);
        if (authorVoicePosition >= USERS_IN_MESSAGE) topVoices.push(authorVoiceDataCopy);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: guildIcon
            })
            .setDescription(
                statMessages.descriptions.allMembers
            )
            .addFields(
                {
                    name: statMessages.field.names.topMessageMemberExtra(USERS_IN_MESSAGE),
                    value: Util.stringOr(
                        topMessages.map(
                            ([userId, messages], index) => `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Util.toHumanize(messages)}** ${statMessages.message}`
                        ).join("\n")
                    )
                },
                {
                    name: statMessages.field.names.topVoiceMemberExtra(USERS_IN_MESSAGE),
                    value: Util.stringOr(
                        topVoices.map(
                            ([userId, voice], index) => `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Util.duration(voice)}**`
                        ).join("\n")
                    )
                },
                {
                    name: "\u200b",
                    value: statMessages.field.values.allMessages(lastMessagesObject),
                    inline: true
                },
                {
                    name: "\u200b",
                    value: "\u200b",
                    inline: true
                },
                {
                    name: "\u200b",
                    value: statMessages.field.values.allVoice(lastVoicesObject),
                    inline: true
                }
            )
            .setThumbnail(guildIcon)
            .setColor("Random")
            .setTimestamp();

        return msg.reply({
            embeds: [
                embed
            ]
        });

    },
};