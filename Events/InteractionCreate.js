"use strict";
const {
    BaseInteraction,
    Events,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const Util = require("../Helpers/Util.js");
const database = require("../Helpers/Database.js");

module.exports = {
    name: Events.InteractionCreate,
    
    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {BaseInteraction} int - Etkileşim
     */
    async execute(int) {
        // Eğer butona tıkladıysa veya modal gönderdiyse
        if (int.isButton() || int.isModalSubmit()) {

            const [customId, ...args] = int.customId.split("-");

            // Eğer customId COMMAND diye başlıyorsa hiçbir şey yapma
            if (customId.startsWith("COMMAND")) return;

            const command = Util.getButtonCommand(customId);
            if (!command) return;

            const isBlacklisted = await database.isBlacklisted(int.user.id);
            if (isBlacklisted) return;

            // Eğer komutun çalışması için gerekli rolleri veya yetkisi yoksa
            if (command.isAdmin && !int.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const memberRoles = new Set(Array.isArray(msg.member.roles) ? msg.member.roles : msg.member.roles.cache.map(role => role.id));
                const requiredRoles = process.env.MOD_ROLE_IDS?.split(",")?.map(role => role.trim()) || [];

                const hasRequiredRole = requiredRoles.some(role => memberRoles.has(role));
                if (!hasRequiredRole) return Util.error(int, `Bu işlemi yapamazsın!`);
            }

            // Komutu çalıştırmaya çalış
            try {
                Util.console.log(`Kullanıcı: ${int.user.tag} | Buton: ${customId} | Argümanlar: ${args}`);
                await command.execute(int, ...args);
            } catch (error) {
                int.reply({
                    content: "Komut çalıştırılırken bir hata oluştu! Hata bilgileri konsolda gösterilecektir",
                    flags: MessageFlags.Ephemeral
                });
                Util.console.error(error.stack);
            }
        }

        // Eğer slash komutuysa
        if (int.isChatInputCommand()) {
            const command = Util.getSlashCommand(int.commandName);
            if (!command) return;

            const isBlacklisted = await database.isBlacklisted(int.user.id);
            if (isBlacklisted) return;

            // Komutu çalıştırmaya çalış
            try {
                Util.console.log(`Kullanıcı: ${int.user.tag} | Slash: ${int.commandName}`);
                await command.execute(int);
            } catch (error) {
                int.reply({
                    content: "Komut çalıştırılırken bir hata oluştu! Hata bilgileri konsolda gösterilecektir",
                    flags: MessageFlags.Ephemeral
                });
                Util.console.error(error.stack);
            }
        }
    },
};
