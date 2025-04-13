"use strict";

const { Client } = require("discord.js");
const fs = require("fs");
const pathModule = require("path");
const Util = require("../Helpers/Util.js");


/**
 * Eventleri yükler
 * @param {Client} client - Discord Client 
 * @param {String} dirname - Klasör yolu (Ana dizin)
 * @param {Boolean} printConsole - Konsola çıktı verilsin mi? (Eğer false ise bir dizi oluşturulur ve hata mesajları buraya eklenir)
 * @returns {Array} - Eğer printConsole false ise hata mesajlarını içeren bir dizi döner
 */
module.exports = (client, dirname, printConsole = true) => {

    const result = [];

    client.removeAllListeners(); // Tüm eventleri kaldır

    /**
      * Konsola yazdırma veya hata mesajları dizisine ekleme fonksiyonu
      * @param {String} message - Konsola yazdırılacak veya hata mesajları dizisine eklenecek mesaj
      * @param {"log"|"warn"|"success"|"error"} type - Konsola yazdırılacak mesajın tipi (log, warn, success, error)
      * @param {Boolean} [onlyConsole=false] - Sadece konsola yazdırılsın mı? (Eğer true ise hata mesajları dizisine eklenmez)
      */
    function printOrAddToOutput(message, type, onlyConsole = false) {
        if (onlyConsole || printConsole) {
            Util.console[type](message);
        } else if (type == "error") {
            result.push(message);
        }
    }


    function loadEvents(path) {
        let files;

        try {
            files = fs.readdirSync(path);
        } catch (error) {
            printOrAddToOutput(error.stack, "error", true);
            return;
        }

        for (const file of files) {
            const filePath = pathModule.join(path, file);
            if (fs.statSync(filePath).isDirectory()) {
                // Eğer dosya bir klasör ise onun da içini kontrol et
                loadEvents(filePath);
            } else if (file.endsWith(".js")) {
                try {
                    delete require.cache[require.resolve(filePath)];

                    const command = require(filePath);
                    client[command.once ? "once" : "on"](command.name, (...args) => command.execute(...args));
                    printOrAddToOutput(`${command.name} adlı event yüklendi!`, "success");
                } catch (error) {
                    printOrAddToOutput(`${file} adlı komut yüklenirken bir hata oluştu!`, "error");
                    printOrAddToOutput(error.stack, "error", true);
                }
            }
        }

    }
    loadEvents(pathModule.join(dirname, "Events"));

    // Eğer printConsole false ise hata mesajlarını döndür
    if (!printConsole) {
        return result;
    }
};
