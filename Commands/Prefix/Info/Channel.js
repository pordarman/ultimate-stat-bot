"use strict";
const Util = require("../../../Helpers/Util.js");
const {
    EmbedBuilder,
    ChannelType,
    Message
} = require("discord.js");
const statMessages = require("../../../Helpers/StatMessages.js");
const database = require("../../../Helpers/Database.js");

module.exports = {
    name: "kanal", // Komutun ismi
    id: "kanal", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "kanal",
        "channel",
    ],
    description: "Yazı ve ses kanallarında atılan mesaj ve durulan süreleri gösterir", // Komutun açıklaması
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

        const channel = msg.mentions.channels.first() || msg.guild.channels.cache.get(args[0]);
        const channelId = channel?.id || "";
        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });
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
        const channelMessagesCount = {};
        const channelVoiceTimes = {};
        let totalMessagesCount = 0;
        let totalVoiceTimes = 0;

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: guildIcon
            })
            .setThumbnail(guildIcon)
            .setColor("Blue")
            .setTimestamp();

        switch (channel?.type) {
            // Eğer yazı kanalı etiketlemişse
            case ChannelType.GuildText: {
                const USERS_IN_MESSAGE = 8;
                const allMessageDatas = [];
                let messageAuthorMessageCount = 0;

                const allMessageStats = await database.getAllMessages();

                // Bütün mesajları çek
                for (let i = 0; i < allMessageStats.length; i++) {
                    const textStat = allMessageStats[i];

                    let messageCount = 0;
                    totalMessagesCount += textStat.total;

                    // Kanalın bilgisini çek
                    const channelData = textStat.channels[channelId];

                    // Eğer kanalın bilgisi varsa
                    if (channelData) {
                        const length = channelData.length;
                        messageCount += length;

                        // Bütün mesajlarda dolaş ve atılan süreye göre mesaj sayısını kaydet
                        for (let i = 0; i < length; i++) {
                            const timestamp = channelData[i];

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

                    // Eğer mesaj sayısı 0'dan büyükse ekle
                    if (messageCount > 0) {
                        allMessageDatas.push([textStat.userId, messageCount]);

                        // Eğer mesajı atan kişi ise mesaj sayısını kaydet
                        if (textStat.userId == authorId) messageAuthorMessageCount = messageCount;
                    }
                }

                allMessageDatas.sort((a, b) => b[1] - a[1]);

                // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
                const authorPosition = Util.binarySearch(allMessageDatas, messageAuthorMessageCount, authorId);
                const authorDataCopy = allMessageDatas[authorPosition];
                const topMessages = allMessageDatas.slice(0, USERS_IN_MESSAGE);
                if (authorPosition > USERS_IN_MESSAGE) topMessages.push(authorDataCopy);

                embed
                    .setDescription(
                        statMessages.descriptions.textChannel(channelId, Util.toHumanize(totalMessagesCount))
                    )
                    .addFields(
                        {
                            name: statMessages.field.names.topMessageMember(USERS_IN_MESSAGE),
                            value: Util.stringOr(
                                topMessages.map(
                                    ([userId, messagesCount], index) => `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Util.toHumanize(messagesCount)}** ${statMessages.message}`
                                ).join("\n")
                            )
                        },
                        {
                            name: "\u200b",
                            value: statMessages.field.values.allMessages(lastMessagesObject),
                            inline: true
                        }
                    )
            }
                break;

            // Eğer ses kanalı etiketlemişse
            case ChannelType.GuildVoice: {
                const USERS_IN_MESSAGE = 8;
                const allVoiceDatas = [];
                let messageAuthorVoiceTime = 0;

                const allVoiceStats = await database.getAllVoices();

                // Bütün ses verilerini çek
                for (let i = 0; i < allVoiceStats.length; i++) {
                    const voiceStat = allVoiceStats[i];
                    let authorVoiceTime = 0;

                    totalVoiceTimes += voiceStat.total;

                    // Eğer şu anda bir ses kanalında varsa bunu da ekle
                    if (voiceStat.current?.channelId == channelId) {
                        const channelId = voiceStat.current.channelId;
                        const total = NOW_TIME - voiceStat.current.startedTimestamp;

                        totalVoiceTimes += total;

                        channelVoiceTimes[channelId] = channelVoiceTimes[channelId] + total || total;
                        voiceStat.channels[channelId] ??= Util.DEFAULTS.memberVoiceChannelStat;
                        voiceStat.channels[channelId].datas.unshift({
                            duration: total,
                            startedTimestamp: voiceStat.current.startedTimestamp,
                            endedTimestamp: NOW_TIME
                        });
                    }

                    const channelData = voiceStat.channels[channelId];
                    if (!channelData) continue;

                    authorVoiceTime += channelData.total;

                    const length = channelData.datas.length;

                    channelVoiceTimes[channelId] = channelVoiceTimes[channelId] + channelData.total || channelData.total;

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

                    // Eğer ses süresi 0'dan büyükse ekle
                    if (authorVoiceTime > 0) {
                        allVoiceDatas.push([voiceStat.userId, authorVoiceTime]);

                        // Eğer mesajı atan kişi ise süreyi kaydet
                        if (voiceStat.userId === authorId) messageAuthorVoiceTime = authorVoiceTime;
                    }
                }

                allVoiceDatas.sort((a, b) => b[1] - a[1]);

                // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
                const authorPosition = Util.binarySearch(allVoiceDatas, messageAuthorVoiceTime, authorId);
                const authorDataCopy = allVoiceDatas[authorPosition];
                const topVoices = allVoiceDatas.slice(0, USERS_IN_MESSAGE);
                if (authorPosition >= USERS_IN_MESSAGE) topVoices.push(authorDataCopy);

                embed
                    .setDescription(
                        statMessages.descriptions.voiceChannel(channelId, Util.duration(totalVoiceTimes))
                    )
                    .addFields(
                        {
                            name: statMessages.field.names.topVoiceMember(USERS_IN_MESSAGE),
                            value: Util.stringOr(
                                topVoices.map(
                                    ([userId, voiceTime], index) => `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Util.duration(voiceTime)}**`
                                ).join("\n")
                            )
                        },
                        {
                            name: "\u200b",
                            value: statMessages.field.values.allVoice(lastVoicesObject),
                            inline: true
                        }
                    )
            }
                break;

            // Eğer kanal veya geçerli bir kanal etiketlememişse hem ses hem de yazı kanal verilerini göster
            default: {
                const USERS_IN_MESSAGE = 8;

                const [allMessageStats, allVoiceStats] = await Promise.all([
                    database.getAllMessages(),
                    database.getAllVoices()
                ]);

                // Bütün mesaj verilerini çek
                for (let i = 0; i < allMessageStats.length; i++) {
                    const textStat = allMessageStats[i];

                    totalMessagesCount += textStat.total;

                    // Bütün mesajları çek
                    for (const messageChannelId in textStat.channels) {
                        const channelData = textStat.channels[messageChannelId];
                        const length = channelData.length;

                        channelMessagesCount[messageChannelId] = channelMessagesCount[messageChannelId] + length || length;

                        // Bütün mesajlarda dolaş ve atılan süreye göre mesaj sayısını kaydet
                        for (let i = 0; i < length; i++) {
                            const timestamp = channelData[i];

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
                }

                // Bütün ses verilerini çek
                for (let i = 0; i < allVoiceStats.length; i++) {
                    const voiceStat = JSON.parse(JSON.stringify(allVoiceStats[i]));

                    totalVoiceTimes += voiceStat.total;

                    // Eğer şu anda bir ses kanalında varsa bunu da ekle
                    if (voiceStat.current?.channelId) {
                        const channelId = voiceStat.current.channelId;
                        const total = NOW_TIME - voiceStat.current.startedTimestamp;

                        channelVoiceTimes[channelId] = channelVoiceTimes[channelId] + total || total;
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

                        channelVoiceTimes[voiceChannelId] = channelVoiceTimes[voiceChannelId] + channelData.total || channelData.total;

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
                }

                const topTextChannels = Object.entries(channelMessagesCount)
                    .sort(([_, count1], [__, count2]) => count2 - count1)
                    .slice(0, USERS_IN_MESSAGE);

                const topVoiceChannels = Object.entries(channelVoiceTimes)
                    .sort(([_, count1], [__, count2]) => count2 - count1)
                    .slice(0, USERS_IN_MESSAGE);

                embed
                    .setDescription(
                        statMessages.descriptions.allChannels
                    )
                    .addFields(
                        {
                            name: statMessages.field.names.message,
                            value: statMessages.field.values.messageSent(Util.toHumanize(totalMessagesCount))
                        },
                        {
                            name: statMessages.field.names.voice,
                            value: statMessages.field.values.voiceTime(Util.duration(totalVoiceTimes))
                        },
                        {
                            name: statMessages.field.names.topMessageChannel(USERS_IN_MESSAGE),
                            value: Util.stringOr(
                                topTextChannels.map(
                                    ([channelId, messagesCount], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.toHumanize(messagesCount)}** ${statMessages.message}`
                                ).join("\n")
                            )
                        },
                        {
                            name: statMessages.field.names.topVoiceChannel(USERS_IN_MESSAGE),
                            value: Util.stringOr(
                                topVoiceChannels.map(
                                    ([channelId, voiceCount], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.duration(voiceCount)}**`
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
            }
                break;
        }

        return msg.reply({
            embeds: [
                embed
            ]
        });
    },
};