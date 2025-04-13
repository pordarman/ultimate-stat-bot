"use strict";

const Util = require("./Util.js");

function duration(time) {
    return Util.duration(time, { dateStyle: "short" });
}

module.exports = {
    botError: "Gerçekten botların istatistiklerine bakmayı düşünmedin değil mi?",
    message: "Mesaj",
    descriptions: {
        allChannels: `**• Bütün kanalların istatistikleri**`,
        all(messageCount, duration) {
            return `**• Bütün kanalların istatistikleri\n` +
                `• Toplamda ${messageCount} mesaj atılmış ve ${duration} seste durulmuş**`
        },
        textChannel(channelId, messageCount) {
            return `**• <#${channelId}> adlı kanalın bilgileri\n` +
                `• Kanala toplamda mesaj ${messageCount} mesaj atılmış**`
        },
        voiceChannel(channelId, duration) {
            return `**• <#${channelId}> adlı kanalın bilgileri\n` +
                `• Kanalda toplamda ${duration} seste durulmuş**`
        },
        me(authorId) {
            return `• <@${authorId}> adlı üyenin mesaj ve ses bilgileri`
        },
        allMembers: `**• Kullanıcıların istatistikleri!**`,
        allTextChannels(messageCount) {
            return `**• Bütün yazı kanallarının istatistikleri!\n` +
                `• Toplamda ${messageCount} mesaj atılmış**`
        },
        allVoiceChannels(duration) {
            return `**• Bütün ses kanallarının istatistikleri!\n` +
                `• Toplamda ${duration} seste durulmuş**`
        },
    },
    field: {
        names: {
            message: "📝 Mesaj",
            voice: "🔊 Ses",
            messageStats: "📝 Mesaj İstatistikleri",
            voiceStats: "🔊 Ses İstatistikleri",
            topMessageMember(memberCount) {
                return `📈 Top ${memberCount} üye`
            },
            topVoiceMember(memberCount) {
                return `📈 Top ${memberCount} üye`
            },
            topMessageMemberExtra(memberCount) {
                return `📈📝 Top ${memberCount} üye - Mesaj`
            },
            topVoiceMemberExtra(memberCount) {
                return `📈🔊 Top ${memberCount} üye - Ses`
            },
            topMessageChannel(memberCount) {
                return `📝 Top ${memberCount} kanal - Mesaj`
            },
            topVoiceChannel(memberCount) {
                return `🔊 Top ${memberCount} kanal - Ses`
            },
        },
        values: {
            messageSent(messageCount) {
                return `**• Atılan toplam mesaj:** ${messageCount} mesaj`
            },
            voiceTime(duration) {
                return `**• Seslerde durulan toplam süre:** ${duration}`
            },
            allMessages(lastMessagesObject) {
                return `📄 **Mesajlar**\n` +
                    `• __1 saat:__  **${Util.toHumanize(lastMessagesObject.hour)} mesaj**\n` +
                    `• __12 saat:__  **${Util.toHumanize(lastMessagesObject.hour12)} mesaj**\n` +
                    `• __24 saat:__  **${Util.toHumanize(lastMessagesObject.day)} mesaj**\n` +
                    `• __1 hafta:__  **${Util.toHumanize(lastMessagesObject.week)} mesaj**\n` +
                    `• __30 gün:__  **${Util.toHumanize(lastMessagesObject.month)} mesaj**`
            },
            allVoice(lastVoiceObject) {
                return `🗣️ **Ses**\n` +
                    `• __1 saat:__  **${duration(lastVoiceObject.hour)}**\n` +
                    `• __12 saat:__  **${duration(lastVoiceObject.hour12)}**\n` +
                    `• __24 saat:__  **${duration(lastVoiceObject.day)}**\n` +
                    `• __1 hafta:__  **${duration(lastVoiceObject.week)}**\n` +
                    `• __30 gün:__  **${duration(lastVoiceObject.month)}**`
            },
            meMessage(messageCount) {
                return `**• Toplamda ${messageCount} mesaj atmış**\n\n`
            },
            meVoice(duration) {
                return `**• Toplamda ${duration} seste durulmuş**\n\n`
            }
        }
    },
}