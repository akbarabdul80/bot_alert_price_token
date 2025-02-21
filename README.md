# 📊 Telegram Token Price Alert Bot

Bot Telegram untuk memantau harga token di jaringan blockchain tertentu menggunakan API OKX. Bot ini memungkinkan pengguna untuk menambahkan token yang ingin dipantau, menetapkan target harga, dan mendapatkan notifikasi otomatis ketika harga mencapai target.

## 🚀 Fitur

- ✅ Menambahkan token yang ingin dipantau (bisa multiple)
- ✅ Menetapkan target harga untuk setiap token
- ✅ Mendukung multiple Chain ID dan nama token
- ✅ Notifikasi otomatis ketika harga mencapai target
- ✅ Notifikasi hanya dikirim sekali per pencapaian target
- ✅ Mendukung grup Telegram
- ✅ Tombol untuk mengedit target harga setelah alert
- ✅ Perintah untuk melihat daftar token yang dipantau beserta harga sekarang

## 🛠 Teknologi

- **Node.js** - Backend utama
- **Telegraf.js** - Library untuk integrasi dengan Telegram Bot
- **SQLite** - Database ringan untuk menyimpan data token
- **Axios** - Untuk mengambil data harga token dari API OKX

## 📦 Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/username/token-price-bot.git
   cd token-price-bot
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create Database**
   ```bash
   sqlite3 tokens.db
   ```

  ```bash
  CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      chain_id INTEGER,
      address TEXT,
      token_name TEXT,
      target_price REAL,
      alert_sent INTEGER DEFAULT 0
  );
  ```
5. **Buat file konfigurasi **.env**:**
   ```
   BOT_TOKEN=your_telegram_bot_token
   ```
6. **Jalankan bot:**
   ```bash
   node index.js
   ```

## 📜 Penggunaan

### **Tambahkan Token ke Pemantauan**

```bash
/addtoken <chain_id> <token_address> <token_name> <target_price>
```

*Contoh:*

```bash
/addtoken 8453 0x276449c108dfc6932923740905ca8990a39c7e8f HLC 0.000051
```

### **Lihat Daftar Token yang Dipantau**

```bash
/listtoken
```

*Bot akan menampilkan semua token yang sedang dipantau beserta harga terkini.*

### **Edit Target Harga Token**

```bash
/edittarget <token_address> <new_target_price>
```

*Contoh:*

```bash
/edittarget 0x276449c108dfc6932923740905ca8990a39c7e8f 0.000055
```

## 🏗 Struktur Database (SQLite)

Tabel `tokens`:

```sql
CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    user_id INTEGER,
    chain_id TEXT,
    address TEXT,
    token_name TEXT,
    target_price REAL,
    alert_sent BOOLEAN DEFAULT 0
);
```

## 🎯 Roadmap

-

## 📌 Lisensi

MIT License

