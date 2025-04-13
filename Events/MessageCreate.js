"use strict";
const {
    Message,
    Events,
    PermissionFlagsBits
} = require("discord.js");
const database = require("../Helpers/Database.js");
const Util = require("../Helpers/Util.js");

module.exports = {
    name: Events.MessageCreate,
    
    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj
     */
    async execute(msg) {

        // Eğer statistikler devre dışıysa hiçbir şey yapma
        if (process.env.STAT_ACTIVE == "0") return;

        // Eğer kişi karalistedeyse hiçbir şey yapma
        const isBlacklisted = await database.isBlacklisted(msg.author.id);
        if (isBlacklisted) return;

        // Mesajın oluşturulma zamanını kullanıcının databasesine kaydet 
        await database.updateMessageCount(msg.author.id, msg.channelId, msg.createdTimestamp);

        const prefix = process.env.PREFIX || "!"; // Varsayılan prefix

        // Eğer mesaj bir komut değilse veya bot mesajıysa görmezden gel
        if (msg.author.bot || !msg.content.startsWith(prefix)) return;

        const args = msg.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = Util.getPrefixCommand(commandName);
        if (!command) return;

        if (command.isOwner) {
            const owners = process.env.OWNER_IDS?.split(",")?.map(owner => owner.trim()) || [];
            if (!owners.includes(msg.author.id)) return Util.error(msg, "Bu komutu kullanmak için yetkiniz yok!");
        }

        const cooldown = command.cooldown || 3; // Komutun bekleme süresi
        const cooldownKey = `${command.id}-${msg.author.id}`;
        const authorCooldown = Util.getCooldown(cooldownKey); // Kullanıcının komut için bekleme süresi

        if (authorCooldown) {
            const timeLeft = ((authorCooldown - Date.now()) / 1000).toFixed(2); // Kalan süreyi hesapla
            return Util.error(msg, `Bu komutu kullanmak için ${timeLeft} saniye beklemelisin!`);
        }

        Util.setCooldown(cooldownKey, Date.now() + cooldown * 1000); // Kullanıcının komut için bekleme süresini ayarla
        setTimeout(() => {
            Util.deleteCooldown(cooldownKey); // Bekleme süresi dolduğunda süreyi sil
        }, cooldown * 1000);

        // Eğer komutun çalışması için gerekli rolleri veya yetkisi yoksa
        if (command.isAdmin && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const memberRoles = new Set(Array.isArray(msg.member.roles) ? msg.member.roles : msg.member.roles.cache.map(role => role.id));
            const requiredRoles = process.env.MOD_ROLE_IDS?.split(",")?.map(role => role.trim()) || [];

            const hasRequiredRole = requiredRoles.some(role => memberRoles.has(role));
            if (!hasRequiredRole) return Util.error(msg, "Bu işlemi yapamazsın!");
        }

        try {
            Util.console.log(`Kullanıcı: ${msg.author.tag} | Komut: ${commandName} | Argümanlar: ${args.join(" ") || "*Hiçbir argüman yok*"} | Kanal: ${msg.channel.name}`);
            await command.execute(msg, args);
        } catch (error) {
            msg.reply("Komut çalıştırılırken bir hata oluştu! Hata bilgileri konsolda gösterilecektir");
            Util.console.error(error.stack);
        }
    },
};
