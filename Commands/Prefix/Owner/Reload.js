"use strict";
const {
    Message,
} = require("discord.js");
const path = require("path");

module.exports = {
    name: "reload", // Komutun ismi
    id: "reload", // Komutun ID'si
    cooldown: 5, // Komutun bekleme süresi
    aliases: [ // Komutun diğer çağırma isimleri
        "reload",
        "yenile",
        "yenileme",
        "komut-yenile",
        "komutreload",
        "komut-reload",
        "komutları-yenile",
        "komutlarıyenile",
        "r"
    ],
    description: "Komutları yeniden yükler. (Sadece bot sahibi tarafından kullanılabilir)", // Komutun açıklaması
    isAdmin: false, // Komutun sadece yönetici tarafından kullanılabilir olduğunu belirtir
    isOwner: true, // Komutun sadece bot sahibi tarafından kullanılabilir olduğunu belirtir.

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Message} msg - Mesaj objesi
     * @param {String[]} args - Komutun argümanları
     */
    async execute(msg, args) {

        const mainPath = __dirname.split(`${path.sep}Commands${path.sep}`)[0];

        // Helpers ve Handlers dizinlerini temizle
        const helpers = fs.readdirSync(path.join(mainPath, "Helpers"));
        for (const helper of helpers) {
            delete require.cache[require.resolve(`../Helpers/${helper}`)];
        }

        const handlers = fs.readdirSync(path.join(mainPath, "Handlers"));
        for (const handler of handlers) {
            delete require.cache[require.resolve(`../Handlers/${handler}`)];
        }

        // Komutları ve eventleri yeniden yükle
        const loadCommands = require("../../../Handlers/LoadCommands.js"); // Burada komutları otomatik olarak silen ve yükleyen bir fonksiyon var ve eğer hata varsa hata mesajını döner
        const loadEvents = require("../../../Handlers/LoadEvents.js"); // Burada eventleri otomatik olarak silen ve yükleyen bir fonksiyon var ve eğer hata varsa hata mesajını döner

        const errorResult = [
            ...loadCommands(null, mainPath, false),
            ...loadEvents(msg.client, mainPath, false),
        ];

        return msg.reply({
            content: errorResult.length > 0 ?
                (
                    `• Bazı komutlar yüklenirken bir hata oluştu! Lütfen konsolda hata mesajını kontrol edin!\n\n` +
                    `• Hata oluşan komutlar:\n` +
                    errorResult.map(line => `- ${line}`).join("\n")
                ) : `• Tüm komutlar başarıyla yüklendi!`,
        });

    },
};