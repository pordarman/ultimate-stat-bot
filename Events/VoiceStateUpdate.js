"use strict";
const {
    VoiceState,
    Events
} = require("discord.js");
const DiscordVoice = require("@discordjs/voice");
const database = require("../Helpers/Database.js");

module.exports = {
    name: Events.VoiceStateUpdate,
    /**
     * 
     * @param {VoiceState} oldVoice 
     * @param {VoiceState} newVoice 
     */
    async execute(oldVoice, newVoice) {
        // Eğer ses kanalları aynısa hiçbir şey yapma
        if (oldVoice.channelId == newVoice.channelId) return;

        // Eğer seste değişiklik yapan bir botsa
        if (newVoice.member.user.bot) {

            // Eğer process.env.VOICE_CHANNEL_ID varsa ve bot kendi botuysa ve ses kanalı yoksa
            if (process.env.VOICE_CHANNEL_ID && newVoice.member.id == newVoice.client.user.id && !newVoice.channelId) {

                // 1 saniye gecikmeli bir şekilde çalıştır
                setTimeout(async () => {
                    DiscordVoice.joinVoiceChannel({
                        channelId: process.env.VOICE_CHANNEL_ID.trim(),
                        guildId: oldVoice.guild.id,
                        adapterCreator: newVoice.guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: true
                    });
                }, 1 * 1000);
            }
            return;
        }

        // Eğer statistikler devre dışıysa hiçbir şey yapma
        if (process.env.STAT_ACTIVE == "0") return;

        const userId = newVoice.member.id;

        // Eğer kullanıcı karalisteye alınmışsa hiçbir şey yapma
        const isBlacklisted = await database.isBlacklisted(userId);
        if (isBlacklisted) return;

        // Kullanıcının ses kanalındaki değişiklikleri kaydet
        await database.updateVoiceCount(userId, newVoice.guild.id, oldVoice.channelId, newVoice.channelId);
    }
}