"use strict";
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const prefixCommand = require("../../Prefix/Owner/Reload.js");

module.exports = {
    name: prefixCommand.name, // Komutun ismi
    id: prefixCommand.id, // Komutun ID'si
    data: new SlashCommandBuilder() // Komutun verileri
        .setName(prefixCommand.name)
        .setDescription(prefixCommand.description),

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ChatInputCommandInteraction} int - Slash komut etkileşimi
     */
    async execute(int) {
        const message = Util.interactionToMessage(int);

        return Util.getPrefixCommandWithId(this.id).execute(message);
    },
};