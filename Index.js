"use strict";

require("dotenv").config(); // .env dosyasını okuma

// Tanımlamalar
const {
    Client,
    GatewayIntentBits,
    RESTJSONErrorCodes,
} = require("discord.js");
const client = new Client({
    intents: [
        // Botun erişmesini istediğimiz özellikler
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
    presence: {
        status: "idle",
    },
    failIfNotExists: false, // Eğer cevap verdiği kullanıcının mesajı yoksa botun döndürip vermemesini ayarlar
});
const fs = require("fs");
const path = require("path");
const database = require("./Helpers/Database.js"); // Veritabanı bağlantısı
const Util = require("./Helpers/Util.js"); // Yardımcı fonksiyonlar

client.setMaxListeners(0); // Konsola hata vermemesi için

// Yardımcı komut yüklemeleri
const files = fs.readdirSync(path.join(__dirname, "Handlers"));

for (const file of files) {
    require(`./Handlers/${file}`)(client, __dirname);
};


(async () => {

    // Veritabanı bağlantısı
    await database.init();

    // Botu başlatma
    client.login(process.env.DISCORD_TOKEN).catch((error) => {
        Util.console.error(
            error.code === "TokenInvalid" ||
                error.code == RESTJSONErrorCodes.InvalidToken ?
                "Girdiğiniz token hatalı! Lütfen tokeninizi kontrol ediniz ve tekrar başlatınız" :
                error
        );
        return process.exit(1);
    });

})();

