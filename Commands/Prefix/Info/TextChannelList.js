"use strict";   
const {
    Message
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const statMessages = require("../../../Helpers/StatMessages.js");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows.js");

module.exports = {
    name: "mesajkliste", // Komutun ismi
    id: "mesajkliste", // Komutun ID'si
    cooldown: 30, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "mesajkanalliste",
        "mesajkliste",
        "mkl",
        "msgclist",
        "msgkliste"
    ],
    description: "Sunucudaki mesaj atılan bütün kanalları gösterir", // Komutun açıklaması
    isAdmin: false, // Komutun sadece adminler tarafından kullanılmasını ayarlar
    isOwner: false, // Komutun sadece owner tarafından kullanılmasını ayarlar

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const channelDatas = {};

        const allMessageStats = await database.getAllMessages();

        for (let i = 0; i < allMessageStats.length; i++) {
            const messageStat = allMessageStats[i];

            for (const channelId in messageStat.channels) {
                const length = messageStat.channels[channelId].length;

                // Kanala atılan mesaj sayısını ekle
                channelDatas[channelId] = channelDatas[channelId] + length || length;
            }
        }
        const sortChannels = Object.entries(channelDatas).sort((a, b) => b[1] - a[1]);

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        return createMessageArrows({
            msg,
            array: sortChannels,
            arrayValuesFunc({ index, result: [channelId, messageCount] }) {
                return `• \`#${index + 1}\` <#${channelId}> => **${Util.toHumanize(messageCount)}** ${statMessages.message}`
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
                thumbnail: guildIcon,
            },
            forwardAndBackwardCount: 20,
            VALUES_PER_PAGE: 20,
        });

    },
};