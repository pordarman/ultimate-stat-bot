"use strict";
const {
    Message
} = require("discord.js");
const database = require("../../../Helpers/Database.js");
const Util = require("../../../Helpers/Util.js");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows.js");
const statMessages = require("../../../Helpers/StatMessages.js");

module.exports = {
    name: "mesajliste", // Komutun ismi
    id: "mesajliste", // Komutun ID'si
    cooldown: 30, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
            "mesajliste",
            "ml",
            "messagelist",
            "msglist"
        ],
    description: "Sunucudaki mesaj atan bütün kişileri gösterir", // Komutun açıklaması
    isAdmin: false, // Komutun sadece adminler tarafından kullanılmasını ayarlar
    isOwner: false, // Komutun sadece owner tarafından kullanılmasını ayarlar

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const authorId = msg.author.id;
        let authorMessageData = 0;
        let allMessageStats = await database.getAllMessages();
        allMessageStats = allMessageStats.filter(userData => {
            if (userData.userId == authorId) authorMessageData = userData.total;

            return userData.total > 0;
        }).sort((a, b) => b.total - a.total);

        const userIndex = Util.binarySearch(allMessageStats, authorMessageData, authorId);
        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        return createMessageArrows({
            msg,
            array: allMessageStats,
            arrayValuesFunc({ index, result: [userId, datas] }) {
                return `${userId == authorId ? "📌" : "•"} \`#${index + 1}\` <@${userId}> => **${Util.toHumanize(datas.total)}** ${statMessages.message}`
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
                description: `• Sunucuya mesaj atan bütün kişiler\n` +
                    `• Sen  **${userIndex + 1}.** sıradasın! (**__${Util.toHumanize(authorMessageData)}__ mesaj**) 🎉`,
                thumbnail: guildIcon,
            },
            forwardAndBackwardCount: 20,
            VALUES_PER_PAGE: 20,
        });

    },
};