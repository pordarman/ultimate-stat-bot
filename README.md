# 📊 Ultimate Stat Bot - Gelişmiş İstatistik Sistemi

Merhaba! Bu proje, Discord sunucunuzdaki üye etkileşimlerini (ses ve mesaj) takip etmek, analiz etmek ve sıralamak için geliştirilmiş gelişmiş bir istatistik botudur. Sunucu aktivitesini ölçmek, en aktif üyeleri ödüllendirmek ve topluluk yönetimini veriye dayalı hale getirmek için ideal bir çözümdür.

> Bot, üyelerin ses kanallarında ne kadar süre geçirdiğini ve metin kanallarına kaç mesaj attığını anlık olarak takip eder. MongoDB veritabanı sayesinde bu verileri kalıcı olarak saklar ve çeşitli komutlarla detaylı raporlar sunar.

---

## 🚀 Özellikler

-   📈 **Kapsamlı İstatistik Takibi:** Ses kanallarında geçirilen süre ve metin kanallarında atılan mesaj sayısını kullanıcı bazlı olarak takip eder.
-   🏆 **Liderlik Tabloları:** Sunucunun en aktif üyelerini ses, mesaj ve genel kategorilerde listeleyen komutlar (`!top`, `!sesliste`, `!mesajliste`).
-   👤 **Kişisel İstatistikler:** Her üyenin kendi veya başkasının detaylı istatistiklerini görmesini sağlayan `!ben` komutu.
-   📢 **Kanal Bazlı Analiz:** Belirli bir metin veya ses kanalının aktivite raporunu sunan `!kanal` komutu.
-   🛡️ **Karaliste Sistemi:** Belirtilen kullanıcıların istatistiklerinin sayılmasını engelleme özelliği.
-   💾 **MongoDB Veritabanı:** Tüm istatistik verilerini güvenli ve kalıcı bir şekilde MongoDB (Atlas uyumlu) üzerinde saklar.
-   ⚙️ **Hibrit Komut Desteği:** Hem `prefix (!)` hem de `slash (/)` komutlarını destekler.
-   🔧 **Yeniden Yükleme:** Botu kapatmadan komutları ve eventleri yeniden yüklemek için `!reload` komutu (Sadece bot sahibi).
-   💨 **Performans Odaklı:** Veritabanı sorguları ve veri işleme, performansı en üst düzeyde tutacak şekilde optimize edilmiştir.

---

## 📂 Kurulum Aşamaları

### 1. Projeyi Klonla veya İndir

Projeyi bilgisayarınıza klonlayarak başlayın.
```bash
git clone https://github.com/pordarman/ultimate-stat-bot.git
cd ultimate-stat-bot
```

### 2. Gerekli Paketleri Yükle

Projenin çalışması için gerekli olan Node.js modüllerini yükleyin.
```bash
npm install
```

### 3. `.env` Dosyasını Yapılandır

Projenin ana dizininde `.env.example` dosyasını kopyalayıp `.env` adında yeni bir dosya oluşturun. Ardından bu dosyanın içini kendi bilgilerinizle doldurun.

```env
# --------------------------------- #
#      BOT & VERİTABANI AYARLARI      #
# --------------------------------- #

DISCORD_TOKEN= # Botunuzun tokeni
PREFIX=! # Botunuzun kullanacağı ön-ek (prefix)
MONGO_URI= # MongoDB Atlas bağlantı URI'niz

# --------------------------------- #
#         YETKİLENDİRME AYARLARI        #
# --------------------------------- #

OWNER_IDS= # Bot sahibi ID'leri (Birden fazlaysa virgülle ayırın, boşluk bırakmayın)
MOD_ROLE_IDS= # Yönetici rollerinin ID'leri (Birden fazlaysa virgülle ayırın, boşluk bırakmayın)

# --------------------------------- #
#        İSTATİSTİK AYARLARI         #
# --------------------------------- #

STAT_ACTIVE=1 # İstatistik sayımını aktif etmek için 1, pasif etmek için 0 yapın
GUILD_ID= # Botun çalışacağı sunucunun ID'si
VOICE_CHANNEL_ID= # Botun sürekli kalacağı ses kanalının ID'si (İsteğe bağlı)
```

> 📃 Değişkenlerin açıklamaları ve nasıl alınacakları aşağıda belirtilmiştir.

---

### 🔑 Gerekli ID ve Token'lar Nasıl Alınır?

-   **DISCORD_TOKEN:**
    1.  [Discord Developer Portal](https://discord.com/developers/applications)'a gidin.
    2.  "New Application" diyerek yeni bir bot oluşturun.
    3.  "Bot" sekmesine gelin ve "Reset Token" butonuna tıklayarak token'ınızı alın. **Bu token'ı kimseyle paylaşmayın!**
    4.  **Privileged Gateway Intents** kısmından `MESSAGE CONTENT INTENT` ve `SERVER MEMBERS INTENT` seçeneklerini aktif edin.

-   **MONGO_URI:**
    1.  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)'a kaydolun ve ücretsiz bir cluster oluşturun.
    2.  "Database Access" bölümünden bir kullanıcı adı ve şifre oluşturun.
    3.  "Network Access" bölümünden `0.0.0.0/0` (her yerden erişim) IP adresini ekleyin.
    4.  "Database" sekmesinden "Connect" > "Drivers" seçeneğine tıklayın ve size verilen bağlantı linkini kopyalayın. Şifre kısmını kendi belirlediğiniz şifre ile güncelleyin.

-   **Diğer ID'ler (Sunucu, Kanal, Rol):**
    1.  Discord ayarlarından "Gelişmiş" sekmesine girin ve "Geliştirici Modu"nu aktif edin.
    2.  ID'sini almak istediğiniz sunucuya, kanala veya role sağ tıklayıp "ID'yi Kopyala" seçeneğini kullanın.

---

## ⚙️ Botu Çalıştırma

### Windows
Terminali açıp aşağıdaki komutu yazın:
```bash
node index.js
```
Veya, `start.bat` dosyasına çift tıklayarak botu kolayca başlatabilirsiniz. Bu dosya, bot çöktüğünde otomatik olarak yeniden başlatacaktır.

### Linux (PM2 ile Önerilir)
PM2, botunuzun sürekli olarak online kalmasını ve kolayca yönetilmesini sağlar.
```bash
npm i -g pm2
pm2 start index.js --name StatBot
```
Logları (kayıtları) görmek için:
```bash
pm2 logs StatBot
```

> ✅ `.env` dosyasındaki tüm gerekli alanlar doldurulmadan bot başlamayacaktır.

---

## 📄 Komut Listesi

| Komut | Alternatifler | Açıklama | Yetki |
| :---- | :------------ | :------- | :---- |
| `!topstat` | `top` | Genel ses ve mesaj istatistiklerini gösterir. | Herkes |
| `!topüye` | `topmembers` | En çok mesaj atan ve seste kalan üyeleri gösterir. | Herkes |
| `!mesaj` | `m`, `message` | Sunucudaki genel mesaj istatistiklerini gösterir. | Herkes |
| `!ses` | `s`, `voice` | Sunucudaki genel ses istatistiklerini gösterir. | Herkes |
| `!ben` | `me`, `user` | Kendi veya belirtilen bir üyenin istatistiklerini gösterir. | Herkes |
| `!kanal` | `channel` | Belirtilen veya bulunulan kanalın istatistiklerini gösterir. | Herkes |
| `!mesajliste`| `ml`, `msglist`| Sunucudaki tüm üyelerin mesaj sıralamasını gösterir. | Herkes |
| `!sesliste` | `sl`, `voicelist`| Sunucudaki tüm üyelerin ses sıralamasını gösterir. | Herkes |
| `!mesajkliste`|`mkl`, `msgclist`| Sunucudaki tüm kanalların mesaj sıralamasını gösterir. | Herkes |
| `!seskliste`|`skl`, `voiceclist`| Sunucudaki tüm kanalların ses sıralamasını gösterir. | Herkes |
| `!karaliste`| `blacklist` | Belirtilen kullanıcıyı istatistik takibinden çıkarır/ekler. | Admin |
| `!yardım` | `help`, `komutlar`| Tüm komutları içeren bir yardım menüsü gösterir. | Admin |
| `!reload` | `r`, `yenile` | Bot komutlarını ve olaylarını yeniden yükler. | Sahip |

---

## 🌟 Final Notu

Bu bot ile sunucunuzun aktivitesini sayılara dökebilir ve topluluğunuzu daha iyi anlayabilirsiniz. Kod yapısı açık, geliştirilebilir ve modülerdir. Artık kontrol sizde! ✨

