"use strict";
const {
    Message
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const database = require("../../../Helpers/Database.js");
const createMessageArrows = require("../../../Helpers/CreateMessageArrows.js");

module.exports = {
    name: "seskliste", // Komutun ismi
    id: "seskliste", // Komutun ID'si
    cooldown: 10, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "seskanalliste",
        "seskliste",
        "skl",
        "voiceclist",
        "voicekliste"
    ],
    description: "Sunucudaki en çok seste durulan kanalları gösterir", // Komutun açıklaması
    isAdmin: false, // Komutun sadece adminler tarafından kullanılmasını ayarlar
    isOwner: false, // Komutun sadece owner tarafından kullanılmasını ayarlar

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const channelDatas = {};

        const allVoiceStats = await database.getAllVoices();

        for (let i = 0; i < allVoiceStats.length; i++) {
            const voiceStat = allVoiceStats[i];

            for (const channelId in voiceStat.channels) {
                const total = voiceStat.channels[channelId].total;

                // Kanala girilen süreyi ekle
                channelDatas[channelId] = channelDatas[channelId] + total || total;
            }
        }
        const sortChannels = Object.entries(channelDatas).sort((a, b) => b[1] - a[1]);

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        return createMessageArrows({
            msg,
            array: sortChannels,
            arrayValuesFunc({ index, result: [channelId, duration] }) {
                return `• \`#${index + 1}\` <#${channelId}> => **${Util.duration(duration)}**`
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