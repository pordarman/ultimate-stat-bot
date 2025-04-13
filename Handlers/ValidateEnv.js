"use strict";
const requiredEnvVariables = [
    "DISCORD_TOKEN",
    "PREFIX",
    "STAT_ACTIVE",
    "MONGO_URI",
    "OWNER_IDS",
];
const Util = require("../Helpers/Util.js");

module.exports = function validateEnv() {
    const missing = [];

    for (const key of requiredEnvVariables) {
        if (!process.env[key] || process.env[key].trim() === "") {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        Util.console.error("\n🚨 .env dosyasında eksik değişkenler bulundu:");
        for (const key of missing) {
            Util.console.error(`- ${key}`);
        }
        Util.console.error("\nLütfen .env dosyanı kontrol et ve eksik değerleri tamamla.\n");
        process.exit(1); // Uygulama başlatılmasın
    }
};
