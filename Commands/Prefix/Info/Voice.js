"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const statMessages = require("../../../Helpers/StatMessages.js");

module.exports = {
    name: "ses", // Komutun ismi
    id: "ses", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "ses",
        "s",
        "voice",
        "v"
    ],
    description: "Sunucudaki en çok sesli sohbet yapanları ve kanalları gösterir", // Komutun açıklaması
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

        const USERS_IN_MESSAGE = 8;
        const lastObject = {
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
        const channelVoiceTimes = {};
        let totalVoiceTimes = 0;
        let authorTotalVoice = 0;

        const allVoiceDatas = [];

        const allVoiceStats = await database.getAllVoices();

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
                    if (NOW_TIME - TIMES.hour <= startedTimestamp) lastObject.hour += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.hour));

                    // Ses verisi son 12 saat içindeyse
                    if (NOW_TIME - TIMES.hour12 <= startedTimestamp) lastObject.hour12 += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.hour12));

                    // Ses verisi son 1 gün içindeyse
                    if (NOW_TIME - TIMES.day <= startedTimestamp) lastObject.day += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.day));

                    // Ses verisi son 1 hafta içindeyse
                    if (NOW_TIME - TIMES.week <= startedTimestamp) lastObject.week += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.week));

                    // Ses verisi son 1 ay içindeyse
                    if (NOW_TIME - TIMES.month <= startedTimestamp) lastObject.month += Math.min(duration, endedTimestamp - (NOW_TIME - TIMES.month));
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
                authorTotalVoice = authorVoiceTime;
            }
        }

        allVoiceDatas.sort((a, b) => b[1] - a[1]);

        // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
        const authorPosition = Util.binarySearch(allVoiceDatas, authorTotalVoice, authorId);
        const authorVoiceDataCopy = allVoiceDatas[authorPosition];
        const topVoices = allVoiceDatas.slice(0, USERS_IN_MESSAGE);
        if (authorPosition >= USERS_IN_MESSAGE) topVoices.push(authorVoiceDataCopy);

        const topVoiceChannels = Object.entries(channelVoiceTimes)
            .sort(([_, count1], [__, count2]) => count2 - count1)
            .slice(0, USERS_IN_MESSAGE);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: guildIcon
            })
            .setDescription(
                statMessages.descriptions.allVoiceChannels(Util.duration(totalVoiceTimes))
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
                    name: statMessages.field.names.topVoiceChannel(USERS_IN_MESSAGE),
                    value: Util.stringOr(
                        topVoiceChannels.map(
                            ([channelId, voiceTime], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.duration(voiceTime)}**`
                        ).join("\n")
                    )
                },
                {
                    name: "\u200b",
                    value: statMessages.field.values.allVoice(lastObject),
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