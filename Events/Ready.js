"use strict";
const {
    Events,
    Client
} = require("discord.js");
const DiscordVoice = require("@discordjs/voice");
const database = require("../Helpers/Database.js");
const Util = require("../Helpers/Util.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

module.exports = {
    name: Events.ClientReady,
    once: true, // Bu event sadece bir kez çalıştırılacak

    /**
     * Parametrelerdeki isimlerin ne olduklarını tanımlar
     * @param {Client} client - Discord istemcisi
     */
    async execute(client) {

        const NOW = Date.now();

        Util.console.log(`${client.user.tag} hazır!`);

        if (process.env.GUILD_ID && process.env.VOICE_CHANNEL_ID) {

            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            const channel = client.channels.cache.get(process.env.VOICE_CHANNEL_ID);

            // Eğer sunucu veya kanal yoksa hiçbir şey yapma
            if (!guild || !channel) return;

            DiscordVoice.joinVoiceChannel({
                channelId: process.env.VOICE_CHANNEL_ID,
                guildId: process.env.GUILD_ID,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
        }

        const allVoiceUsers = await database.getVoicesByFilter({ "current.channelId": { $exists: true, $ne: null } });
        await Promise.all(
            allVoiceUsers.map(async (userData) => {
                async function deleteCurrentAndSave() {
                    await database.updateVoice(userData.userId, {
                        $unset: {
                            current: 1
                        }
                    })
                }

                // Eğer istatistik kaydetme devre dışıysa current'i sil
                if (process.env.STAT_ACTIVE == "0") {
                    return deleteCurrentAndSave();
                }

                // Eğer kişi sunucudan çıkmışsa hiçbir şey yapma
                const guild = client.guilds.cache.get(userData.guildId);
                if (!guild) {
                    return deleteCurrentAndSave();
                }

                const member = guild.members.cache.get(userData.userId);
                if (!member) {
                    return deleteCurrentAndSave();
                }

                if (member.voice.channelId != userData.current.channelId) {
                    await database.updateVoiceCount(userData.userId, userData.guildId, userData.current.channelId, member.voice.channelId);
                }
            })
        );

        // Daha sonrasında bütün cache'yi temizle ve 30 saniye sonra tekrardan bütün cacheleri yükle
        database.resetCache();
        setTimeout(() => {
            database.initCache(); // Bütün cache'leri yükle
        }, 30 * 1000);

        // Slash komutlarını yükle
        client.guilds.cache.forEach(async (guild) => {
            try {
                await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
                    body: Util.getSlashDataJSON()
                });
                Util.console.log(`Slash komutları yüklendi!`);
            } catch (error) {
                Util.console.error(`Slash komutları yüklenirken hata oluştu: ${error}`);
            }
        });
    }
}