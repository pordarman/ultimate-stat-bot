"use strict";
const fs = require("fs");
const pathModule = require("path");
const Util = require("../Helpers/Util.js");
const { Client } = require("discord.js");

/**
 * Prefix, buton ve slash komutlarını yükler
 * @param {Client} _ - Discord.js istemcisi
 * @param {String} dirname - Klasör yolu (Ana dizin)
 * @param {Boolean} printConsole - Konsola çıktı verilsin mi? (Eğer false ise bir dizi oluşturulur ve hata mesajları buraya eklenir)
 * @returns {Array} - Eğer printConsole false ise hata mesajlarını içeren bir dizi döner
 */
module.exports = (_, dirname, printConsole = true) => {

    const result = [];
    Util.clearPrefixCommands();
    Util.clearPrefixCommandWithId();
    Util.clearButtonCommands();
    Util.clearSlashCommands();
    Util.clearSlashDataJSON();

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
            const fileName = message.match(/^\S+/)?.[0] || message;
            result.push(
                `**Commands/${fileName}**`
            );
        }
    }
    
    // Bütün komutları yükleme fonksiyonu
    function loadAllCommands(path) {

        // Prefix komutlarını yükleme fonksiyonu
        function loadPrefixCommands(_path) {
            let files;

            try {
                files = fs.readdirSync(_path);
            } catch (error) {
                printOrAddToOutput(error.stack, "error", true);
                return;
            }

            for (const file of files) {
                const filePath = pathModule.join(_path, file);
                if (fs.statSync(filePath).isDirectory()) {
                    // Eğer dosya bir klasör ise onun da içini kontrol et
                    loadPrefixCommands(filePath);
                } else if (file.endsWith(".js")) {
                    try {
                        delete require.cache[require.resolve(filePath)];

                        // Komut verileri
                        const command = require(filePath);

                        // Eğer komut daha hazırlanmamışsa ("name" değeri yoksa) döngüyü geç
                        if (command.name == "") continue;

                        Util.setPrefixCommandWithId(command.id, command.name);

                        command.dirname = filePath.split(`Commands${pathModule.sep}`)[1];

                        const commandNames = new Set(command.aliases).add(command.name);

                        // Ttürkçe karakterleri ingilizceye çevir ve her ikisini de komutlara ekle
                        const removeTurkishChar = {
                            "ç": "c",
                            "ğ": "g",
                            "ı": "i",
                            "ö": "o",
                            "ş": "s",
                            "ü": "u"
                        };

                        // İngilizce klavye kullananlar için türkçe harfleri ingilizceye çevir ve onları da ekle
                        for (const commandName of command.aliases) {
                            commandNames.add(
                                commandName.replace(
                                    new RegExp(`[${Object.keys(removeTurkishChar).join("")}]`, "g"),
                                    char => removeTurkishChar[char] || char
                                )
                            )
                        }

                        // Komutları ekle
                        const commandNamesArr = [...commandNames];
                        command.aliases = commandNamesArr;
                        commandNamesArr.forEach((commandName) => {
                            // Komut isimlerini küçük harfe dönüştür ve boşlukları sil
                            commandName = commandName.toLocaleLowerCase("tr").replace(/\s+/g, "");

                            // Eğer bu isimde bir komut bulunuyorsa hata döndür
                            if (Util.getPrefixCommand(commandName)) {
                                printOrAddToOutput(`${file} - ${commandName} adlı komut zaten bulunuyor!`, "warn");
                                return;
                            }

                            Util.setPrefixCommand(commandName, command);
                            printOrAddToOutput(`${commandName} adlı komut yüklendi!`, "success");
                        });

                    } catch (error) {
                        printOrAddToOutput(`${file} adlı komut yüklenirken bir hata oluştu!`, "error");
                        printOrAddToOutput(error.stack, "error", true);
                    }
                }
            }


        }
        loadPrefixCommands(pathModule.join(path, "Prefix"));

        // Buton komutlarını yükleme fonksiyonu
        function loadButtonCommands(_path) {
            let files;

            try {
                files = fs.readdirSync(_path);
            } catch (error) {
                printOrAddToOutput(error.stack, "error", true);
                return;
            }

            for (const file of files) {
                const filePath = pathModule.join(_path, file);
                if (fs.statSync(filePath).isDirectory()) {
                    // Eğer dosya bir klasör ise onun da içini kontrol et
                    loadButtonCommands(filePath);
                } else if (file.endsWith(".js")) {
                    try {
                        delete require.cache[require.resolve(filePath)];

                        const command = require(filePath);
                        command.dirname = filePath.split(`Commands${pathModule.sep}`)[1];

                        Util.setButtonCommand(command.name, command);
                        printOrAddToOutput(`${command.name} adlı komut yüklendi!`, "success");
                    } catch (error) {
                        printOrAddToOutput(`${file} adlı komut yüklenirken bir hata oluştu!`, "error");
                        printOrAddToOutput(error.stack, "error", true);
                    }
                }
            }
        }
        loadButtonCommands(pathModule.join(path, "Button"));

        // Slash komutlarını yükleme fonksiyonu
        function loadSlashCommands(_path) {
            let files;

            try {
                files = fs.readdirSync(_path);
            } catch (error) {
                printOrAddToOutput(error.stack, "error", true);
                return;
            }

            for (const file of files) {
                const filePath = pathModule.join(_path, file);
                if (fs.statSync(filePath).isDirectory()) {
                    // Eğer dosya bir klasör ise onun da içini kontrol et
                    loadSlashCommands(filePath);
                } else if (file.endsWith(".js")) {
                    try {
                        delete require.cache[require.resolve(filePath)];

                        const command = require(filePath);
                        command.dirname = filePath.split(`Commands${pathModule.sep}`)[1];

                        Util.setSlashCommand(command.name, command);
                        Util.pushSlashDataJSON(command.data.toJSON());
                        printOrAddToOutput(`${command.name} adlı komut yüklendi!`, "success");
                    } catch (error) {
                        printOrAddToOutput(`${file} adlı komut yüklenirken bir hata oluştu!`, "error");
                        printOrAddToOutput(error.stack, "error", true);
                    }
                }
            }
        }
        loadSlashCommands(pathModule.join(path, "Slash"));
    }

    loadAllCommands(pathModule.join(dirname, "Commands"));

    // Eğer printConsole false ise hata mesajlarını döndür
    if (!printConsole) {
        return result;
    }
};
