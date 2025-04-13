"use strict";
const {
    Message
} = require("discord.js");
const database = require("../../../Helpers/Database.js");
const Util = require("../../../Helpers/Util.js");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows.js");

module.exports = {
    name: "sesliste", // Komutun ismi
    id: "sesliste", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "sesliste",
        "sl",
        "seslistesi",
        "voicelist",
    ],
    description: "Sunucudaki en çok seste duran kişileri gösterir", // Komutun açıklaması
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

        const sortUsers = [];
        let messageAuthorVoiceTime = 0;


        const allVoiceStats = await database.getAllVoices();

        for (let i = 0; i < allVoiceStats.length; i++) {
            const voiceStat = allVoiceStats[i];
            let totalVoiceTime = voiceStat.total;

            // Eğer şu anda bir ses kanalında varsa bunu da ekle
            if (voiceStat.current.channelId) {
                const total = NOW_TIME - voiceStat.current.startedTimestamp;
                totalVoiceTime += total;
            }

            // Eğer ses süresi 0'dan büyükse ekle
            if (totalVoiceTime > 0) {
                sortUsers.push([voiceStat.userId, totalVoiceTime]);

                // Eğer mesajı atan kişi ise süresini kaydet
                if (voiceStat.userId == authorId) messageAuthorVoiceTime = totalVoiceTime;
            }
        }

        const userIndex = Util.binarySearch(sortUsers, messageAuthorVoiceTime, authorId);
        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        return createMessageArrows({
            msg,
            array: sortUsers,
            arrayValuesFunc({ index, result: [userId, totalVoiceTime] }) {
                return `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> **${Time.duration(totalVoiceTime)}**`
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
                description: `• Sese giren bütün kişiler kişiler\n` +
                    `• Sen  **${userIndex + 1}.** sıradasın! (**__${Util.duration(messageAuthorVoiceTime, { dateStyle: "short" })}__**) 🎉`,
                thumbnail: guildIcon,
            },
            forwardAndBackwardCount: 10,
            VALUES_PER_PAGE: 15,
        });

    },
};