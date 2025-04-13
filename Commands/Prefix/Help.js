"use strict";
const {
    Message,
} = require("discord.js");
const Util = require("../../Helpers/Util.js");
const createMessageArrows = require("../../Helpers/CreateMessageArrows.js");

module.exports = {
    name: "yardım", // Komutun ismi
    id: "yardım", // Komutun ID'si
    cooldown: 5, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "yardım-komut",
        "komutlar",
        "komut",
        "help",
        "help-command",
        "commands",
        "command",
        "helpcommands",
        "helpcommand",
    ],
    description: "Yardım komutunu gösterir", // Komutun açıklaması
    isAdmin: true, // Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
    isOwner: false, // Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir.

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg
     */
    async execute(msg) {

        // Bütün komutları çek ve alfabetik sıraya göre sırala
        const ownerIds = process.env?.OWNER_IDS?.split(",")?.map(id => id.trim()) || [];
        const isOwner = ownerIds.includes(msg.author.id); // Eğer kullanıcı owner ise true döner
        const commands = [...Util.getPrefixCommandIds().values()]
            .map(commandId => Util.getPrefixCommand(commandId)) // Komutları al
            .filter(command => command.isOwner ? isOwner : true) // Eğer komut owner ise ve kullanıcı owner değilse komutu gösterme
            .sort((first, second) => first.name.localeCompare(second.name, "tr", { sensitivity: "base" })); // Alfabetik sıraya göre sırala

        if (!commands || commands.length === 0) return Util.error(msg, `Komutları çekemiyorum! Bir hata oluştu.`);

        const guildIcon = msg.guild.iconURL({ extension: "png", forceStatic: true, size: 1024 });

        const prefix = process.env.PREFIX || "!";

        // Eğer ticket log dizisinin uzunluğu 0 değilse sayfalar şeklinde gösterilecek
        return createMessageArrows({
            msg,
            array: commands,
            async arrayValuesFunc({
                result: {
                    name,
                    description,
                    isAdmin,
                    isOwner
                },
                index
            }) {
                return `\`#${index + 1}\` \`${prefix}${name}\`: ${description} ${isAdmin ? "(Admin komutu)" : ""} ${isOwner ? "(Sahip komutu)" : ""}`
            },
            embed: {
                author: {
                    name: msg.guild.name,
                    iconURL: guildIcon
                },
            },
            arrowLength: "long",
            forwardAndBackwardCount: 5,
            VALUES_PER_PAGE: 8,
            pageJoin: "\n",
            arrowTimeout: 1000 * 60 * 10, // 10 dakika
        })
    },
};