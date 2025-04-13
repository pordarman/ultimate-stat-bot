"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const statMessages = require("../../../Helpers/StatMessages.js");

module.exports = {
    name: "ben", // Komutun ismi
    id: "ben", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "ben",
        "me",
        "user",
        "member",
        "kişi",
        "kullanıcı",
    ],
    description: "Sunucunuzdaki bir üyenin mesaj ve ses istatistiklerini gösterir", // Komutun açıklaması
    isAdmin: false, // Komutun sadece adminler tarafından kullanılmasını ayarlar
    isOwner: false, // Komutun sadece owner tarafından kullanılmasını ayarlar

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const member = msg.mentions.members.first() || msg.guild.members.cache.get(args[0]) || msg.member;

        const memberId = member.id;
        const memberAvatar = member.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 });

        const NOW_TIME = Date.now();

        const DATAS_IN_MESSAGE = 8;
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
        let {
            messages: userMessageData,
            voices: userVoiceData
        } = await database.getUser(memberId);

        if (!userMessageData && !userVoiceData) return Util.error(msg, "Bu kullanıcıya ait istatistik bulunamadı.");

        // Eğer mesaj verisi varsa mesaj verisini çek
        if (userMessageData) {
            for (const channelId in userMessageData.channels) {
                const channelMessages = userMessageData.channels[channelId];
                const length = channelMessages.length;

                // Kanala atılan mesaj sayısını kaydet
                channelMessagesCount[channelId] = channelMessagesCount[channelId] + length || length;

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
        }

        // Eğer ses verisi varsa ses verisini çek
        if (userVoiceData) {
            // Bu objeyi json ile kopyala
            userVoiceData = JSON.parse(JSON.stringify(userVoiceData));

            // Eğer şu anda bir ses kanalında varsa bunu da ekle
            if (userVoiceData.current.channelId) {
                const channelId = userVoiceData.current.channelId;
                const total = NOW_TIME - userVoiceData.current.startedTimestamp;

                totalVoiceTimes += total;
                channelVoiceTimes[channelId] = channelVoiceTimes[channelId] + total || total;
                userVoiceData.channels[channelId] ??= Util.DEFAULTS.memberVoiceChannelStat;
                userVoiceData.channels[channelId].datas.unshift({
                    duration: total,
                    startedTimestamp: userVoiceData.current.startedTimestamp,
                    endedTimestamp: NOW_TIME
                })
            }

            // Bütün kanallarda dolaş ve süreyi yazdır
            for (const channelId in userVoiceData.channels) {
                const {
                    total,
                    datas
                } = userVoiceData.channels[channelId];
                channelVoiceTimes[channelId] = channelVoiceTimes[channelId] + total || total;

                // Bütün ses verilerinde dolaş ve süreyi yazdır
                for (let i = 0; i < datas.length; i++) {
                    const {
                        duration,
                        endedTimestamp,
                        startedTimestamp
                    } = datas[i];

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
            .slice(0, DATAS_IN_MESSAGE);

        const topVoiceChannels = Object.entries(channelVoiceTimes)
            .sort(([_, count1], [__, count2]) => count2 - count1)
            .slice(0, DATAS_IN_MESSAGE);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: memberAvatar
            })
            .setDescription(
                statMessages.descriptions.me(memberId)
            )
            .addFields(
                {
                    name: statMessages.field.names.messageStats,
                    value: statMessages.field.values.meMessage(Util.toHumanize(totalMessagesCount)) +
                        Util.stringOr(
                            topTextChannels.map(
                                ([channelId, messagesCount], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.toHumanize(messagesCount)}** ${statMessages.message}`
                            ).join("\n")
                        )
                },
                {
                    name: statMessages.field.names.voiceStats,
                    value: statMessages.field.values.meVoice(Util.duration(totalVoiceTimes)) +
                        Util.stringOr(
                            topVoiceChannels.map(
                                ([channelId, voiceTime], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.duration(voiceTime)}**`
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
            .setThumbnail(memberAvatar)
            .setColor("Random")
            .setTimestamp();

        return msg.reply({
            embeds: [
                embed
            ]
        });

    },
};