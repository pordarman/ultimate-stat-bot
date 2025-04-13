"use strict";
const {
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ActionRowBuilder,
    Message
} = require("discord.js");
const Util = require("./Util.js");

/**
 * @typedef {Object} EmbedOptions
 * @property {{ name: string, iconURL: string | null }} author
 * @property {String} description
 * @property {string} [thumbnail]
 * @property {string} [color]
 */

/**
 * @typedef {Object} arrayValuesFuncOptions
 * @property {any} result
 * @property {number} index
 * @property {number} length
 * @property {number} limit
 */

/**
 * @typedef {Object} createMessageArrowsOptions
 * @property {Message} msg - Mesaj
 * @property {Array} array - Dizi
 * @property {arrayValuesFuncOptions} arrayValuesFunc - Sayfada gözükecek verileri database'den çekme fonksiyonu
 * @property {Promise<({startIndex: number, limit: number}) => Array>} [result] - Sayfada gözükecek verileri database'den çekme fonksiyonu (Direkt dizi döndürür ve eğer verilmezse arrayValuesFunc kullanılır)
 * @property {"description" | "field"} [putDescriptionOrField="description"] - Embed'de verilerin nasıl gözükeceğini belirleme (Varsayılan: description)
 * @property {string} [authorId=msg.author.id] - Mesajı atan kişinin ID'si (Varsayılan: msg.author.id)
 * @property {EmbedOptions} embed - Embed seçenekleri
 * @property {"long" | "short"} [arrowLength="long"] - Okların uzunluğu (Varsayılan: long)
 * @property {number} [forwardAndBackwardCount=5] - Oklara basıldığında kaç sayfa ileri veya geri gideceğini belirleme (Varsayılan: 5)
 * @property {string} [pageJoin="\n"] - Sayfada gözükecek verileri birleştirme (Varsayılan: \n)
 * @property {number} [VALUES_PER_PAGE=8] - Sayfada kaç veri gözükeceğini belirleme (Varsayılan: 8)
 * @property {"en" | "tr"} [language="tr"] - Dil (Varsayılan: tr)
 * @property {number} [arrowTimeout=1000 * 60 * 5] - Butonların ne kadar süre aktif olacağını belirleme (Varsayılan: 5 dakika)
 */


/**
 * 
 * @param {createMessageArrowsOptions} param0 
 * @returns {Promise<void>}
 */
module.exports = async function createMessageArrows({
    msg,
    array,
    arrayValuesFunc,
    result,
    putDescriptionOrField = "description",
    authorId,
    embed,
    arrowLength = "long",
    forwardAndBackwardCount = 5,
    pageJoin = "\n",
    VALUES_PER_PAGE = 8,
    arrowTimeout = 1000 * 60 * 5 // 5 minutes
} = {}) {

    const length = array.length;
    const MAX_PAGE_NUMBER = Math.ceil(length / VALUES_PER_PAGE);

    authorId ??= msg.author.id;

    // Sayfaları tekrar yüklemek yerine önbelleğe kaydet
    const pages = new Map();

    // Sayfada gözükecek verileri database'den çekme fonksiyonu
    async function getValues(pageNum, limit) {
        const startIndex = (pageNum - 1) * limit;
        let resultArray = [];
        // Eğer direkt diziyi döndüren bir fonksiyon verilmişse
        if (result) resultArray = await result({ startIndex, limit });
        else {

            resultArray.push(
                ...(await Promise.all(
                    array.slice(startIndex, startIndex + limit).map(async (result, index) => {
                        try {
                            return await arrayValuesFunc({
                                result,
                                index: startIndex + index,
                                length,
                                limit
                            });
                        }
                        // Eğer olur da bir hata oluşursa döngüyü geç
                        catch (error) {
                            Util.console.error(error.stack);
                            return "**• Bir hata oluştu!**";
                        }
                    })
                ))
            );
        }
        const resultSting = putDescriptionOrField == "description" ? resultArray.flat().join(pageJoin) : resultArray;

        pages.set(pageNum, resultSting);
        return resultSting
    }
    async function getPage(pageNum) {
        return pages.get(pageNum) ?? await getValues(pageNum, VALUES_PER_PAGE)
    }

    let pageNumber = 1;

    // Girilen sayfa numarasına göre embed'i düzenleme fonksiyonu
    async function createEmbed(pageNum) {
        const page = await getPage(pageNum);
        const embedDescription = "description" in embed ? `${embed.description}\n\n` : "";
        const messageEmbed = new EmbedBuilder()
            .setAuthor({
                name: embed.author.name,
                iconURL: embed.author.iconURL || null
            })
            .setThumbnail(embed.thumbnail || null)
            .setColor(embed.color || "DarkPurple")
            .setFooter({
                text: `Sayfa ${pageNum}/${MAX_PAGE_NUMBER || 1}`
            });

        if (putDescriptionOrField == "description") {
            messageEmbed.setDescription(
                embedDescription + (page || "• Burada gösterilecek hiçbir şey yok...")
            );
        } else {
            messageEmbed
                .setDescription(embedDescription || null)
                .addFields(...page)
        }

        return messageEmbed;
    };

    const pageEmbed = await createEmbed(pageNumber);

    if (MAX_PAGE_NUMBER <= 1) return msg[msg.author.id == msg.client.user.id ? "edit" : "reply"]({
        embeds: [
            pageEmbed
        ],
        content: undefined,
    });

    const isLong = arrowLength == "long";

    // Mesaja butonlar ekle ve bu butonlar sayesinde sayfalar arasında geçişler yap
    const fastleftButton = isLong ? new ButtonBuilder() // Eğer uzun oklar seçilmişse
        .setEmoji("⏪")
        .setCustomId("COMMAND_BUTTON_FASTLEFT")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNumber == 1) : null;

    const leftButton = new ButtonBuilder()
        .setEmoji("◀")
        .setCustomId("COMMAND_BUTTON_LEFT")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNumber == 1);

    const deleteButton = new ButtonBuilder()
        .setEmoji("🗑️")
        .setCustomId("COMMAND_BUTTON_DELETE")
        .setStyle(ButtonStyle.Danger);

    const rightButton = new ButtonBuilder()
        .setEmoji("▶")
        .setCustomId("COMMAND_BUTTON_RIGHT")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNumber == MAX_PAGE_NUMBER);

    const fastrightButton = isLong ? new ButtonBuilder() // Eğer uzun oklar seçilmişse
        .setEmoji("⏩")
        .setCustomId("COMMAND_BUTTON_FASTRIGHT")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNumber == MAX_PAGE_NUMBER) : null;

    const allButtons = new ActionRowBuilder();
    const components = [
        leftButton,
        deleteButton,
        rightButton
    ];

    if (isLong) {
        components.unshift(fastleftButton);
        components.push(fastrightButton);
    }

    allButtons.addComponents(
        ...components
    );

    const waitMessage = await msg[msg.author.id == msg.client.user.id ? "edit" : "reply"]({
        content: "**• Eğer butonlara bastığınız halde sayfa geçişi olmuyorsa lütfen komutu bir kez daha çalıştırın!**",
        embeds: [
            pageEmbed
        ],
        components: [
            allButtons
        ],
    });

    // Eğer bir hata olur da mesaj atılamazsa hiçbir şey yapma
    if (!waitMessage) return;

    const waitComponents = waitMessage.createMessageComponentCollector({
        filter: (button) => button.user.id == authorId,
        time: arrowTimeout
    });

    // Eğer butona tıklarsa
    waitComponents.on("collect", async (button) => {
        switch (button.customId) {
            case "COMMAND_BUTTON_DELETE":
                // Mesajı sil
                return waitMessage.delete();

            case "COMMAND_BUTTON_FASTLEFT":
            case "COMMAND_BUTTON_LEFT":
                // Sağ okları yeniden aktif et    
                rightButton.setDisabled(false);
                if (isLong) {
                    fastrightButton.setDisabled(false);
                }

                // Kaç sayfa geriye gideceğini hesapla
                pageNumber = Math.max(1, pageNumber - (button.customId == "COMMAND_BUTTON_LEFT" ? 1 : forwardAndBackwardCount));

                // Eğer en başa geldiysek sol okları deaktif et
                if (pageNumber == 1) {
                    leftButton.setDisabled(true);
                    if (isLong) {
                        fastleftButton.setDisabled(true);
                    }
                }

                break;
            default:
                // Sol okları yeniden aktif et    
                leftButton.setDisabled(false);
                if (isLong) {
                    fastleftButton.setDisabled(false);
                }

                // Kaç sayfa ileriye gideceğini hesapla
                pageNumber = Math.min(MAX_PAGE_NUMBER, pageNumber + (button.customId == "COMMAND_BUTTON_RIGHT" ? 1 : forwardAndBackwardCount));

                // Eğer en sona geldiysek sağ okları deaktif et
                if (pageNumber == MAX_PAGE_NUMBER) {
                    rightButton.setDisabled(true);
                    if (isLong) {
                        fastrightButton.setDisabled(true);
                    }
                }

                break;
        }

        const pageEmbed = await createEmbed(pageNumber);

        return waitMessage.edit({
            embeds: [
                pageEmbed
            ],
            components: [
                allButtons
            ]
        })
    })

    // Süre biterse kullanıcının anlaması için mesajı düzenle ve butonları deaktif et
    waitComponents.on("end", () => {
        // Eğer mesaj silinmişse hiçbir şey yapma
        if (
            !msg.channel.messages.cache.has(waitMessage.id)
        ) return;

        // Butonları deaktif et
        if (isLong) {
            fastleftButton
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary);
            fastrightButton
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary);
        }
        leftButton
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);
        deleteButton
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);
        rightButton
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary);

        // Bellekten tasarruf etmek için Map fonksiyonunu temizle
        pages.clear();

        return waitMessage.edit({
            content: "• Bu mesaj artık aktif değil!",
            components: [
                allButtons
            ]
        })
    });
}