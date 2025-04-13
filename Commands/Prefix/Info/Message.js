"use strict";
const {
    Message,
    EmbedBuilder
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const statMessages = require("../../../Helpers/StatMessages.js");

module.exports = {
    name: "mesaj", // Komutun ismi
    id: "mesaj", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
            "mesaj",
            "m",
            "message",
            "msg",
        ],
    description: "Sunucudaki en çok mesaj atanları ve kanalları gösterir", // Komutun açıklaması
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

        const allMessageStats = await database.getAllMessages();

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
        const channelMessagesCount = {};
        let totalMessagesCount = 0;
        let authorTotalMessage = 0;
        const allMessageDatas = [];

        // Kullanıcıların mesaj verilerini çek
        for (let i = 0; i < allMessageStats.length; i++) {
            const messageStat = allMessageStats[i];

            totalMessagesCount += messageStat.total;

            // Kullanıcının mesaj verisini çek
            for (const channelId in messageStat.channels) {
                const channelMessages = messageStat.channels[channelId];
                const length = channelMessages.length;

                // Kanala atılan mesaj sayısını kaydet
                channelMessagesCount[channelId] = channelMessagesCount[channelId] + length || length;

                // Bütün mesajlarda dolaş ve atılan süreye göre mesaj sayısını kaydet
                for (let i = 0; i < length; i++) {
                    const timestamp = channelMessages[i];

                    // Mesaj son 1 saatte atıldıysa
                    if (NOW_TIME - TIMES.hour <= timestamp) lastObject.hour += 1;

                    // Mesaj son 12 saatte atıldıysa
                    if (NOW_TIME - TIMES.hour12 <= timestamp) lastObject.hour12 += 1;

                    // Mesaj son 1 günde atıldıysa
                    if (NOW_TIME - TIMES.day <= timestamp) lastObject.day += 1;

                    // Mesaj son 1 haftada atıldıysa
                    if (NOW_TIME - TIMES.week <= timestamp) lastObject.week += 1;

                    // Mesaj son 1 ayda atıldıysa
                    if (NOW_TIME - TIMES.month <= timestamp) lastObject.month += 1;
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
                authorTotalMessage = messageStat.total;
            }
        }

        allMessageDatas.sort((a, b) => b[1] - a[1]);

        // Komutu kullanan kişinin sırasını çek, eğer mesajda gözükmeyecekse en sona ekle
        const authorPosition = Util.binarySearch(allMessageDatas, authorTotalMessage, authorId);
        const authorDataCopy = allMessageDatas[authorPosition];
        const topMessages = allMessageDatas.slice(0, USERS_IN_MESSAGE);
        if (authorPosition >= USERS_IN_MESSAGE) topMessages.push(authorDataCopy)

        const topChannels = Object.entries(channelMessagesCount)
            .sort(([_, count1], [__, count2]) => count2 - count1)
            .slice(0, USERS_IN_MESSAGE);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: msg.guild.name,
                iconURL: guildIcon
            })
            .setDescription(
                statMessages.descriptions.allTextChannels(Util.toHumanize(totalMessagesCount))
            )
            .addFields(
                {
                    name: statMessages.field.names.topMessageMember(USERS_IN_MESSAGE),
                    value: Util.stringOr(
                        topMessages.map(
                            ([userId, messagesCount], index) => `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Util.toHumanize(messagesCount)}** ${statMessages.message}`
                        ).join("\n")
                    ),
                },
                {
                    name: statMessages.field.names.topMessageChannel(USERS_IN_MESSAGE),
                    value: Util.stringOr(
                        topChannels.map(
                            ([channelId, messagesCount], index) => `• \`#${index + 1}\` <#${channelId}> **${Util.toHumanize(messagesCount)}** ${statMessages.message}`
                        ).join("\n")
                    ),
                },
                {
                    name: "\u200b",
                    value: statMessages.field.values.allMessages(lastObject),
                    inline: true
                },
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