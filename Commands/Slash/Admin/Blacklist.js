"use strict";
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} = require("discord.js");
const Util = require("../../../Helpers/Util.js");
const prefixCommand = require("../../Prefix/Admin/Blacklist.js");

module.exports = {
    name: prefixCommand.name, // Komutun ismi
    id: prefixCommand.id, // Komutun ID'si
    data: new SlashCommandBuilder() // Komutun verileri
        .setName(prefixCommand.name)
        .setDescription(prefixCommand.description)
        .addSubcommand(subcommand =>
            subcommand
                .setName("ekle")
                .setDescription("Blacklist'e kullanıcı ekler")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Blacklist'e eklemek istediğiniz kullanıcı")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Blacklist'e ekleme sebebi")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("çıkar")
                .setDescription("Blacklist'ten kullanıcı çıkarır")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Blacklist'ten çıkarmak istediğiniz kullanıcı")
                        .setRequired(true)
                )
        ),

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {ChatInputCommandInteraction} int - Slash komut etkileşimi
     */
    async execute(int) {
        const subcommand = int.options.getSubcommand(true);
        const user = int.options.getUser("user");
        const reason = int.options.getString("reason");

        const message = Util.interactionToMessage(int, {
            content: `${subcommand} ${user.id} ${reason}`
        });

        return Util.getPrefixCommandWithId(this.id).execute(message, [subcommand, user.id, reason]);
    },
};