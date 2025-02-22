const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const { Telegraf } = require("telegraf");
const HttpsProxyAgent = require("https-proxy-agent");
require("dotenv").config();

// Load API key dari .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TELEGRAM_TOKEN);
const API_URL = "https://www.okx.com/priapi/v5/dex/token/market/history-dex-token-hlc-candles";
const API_URL_BTC = "https://www.okx.com/priapi/v5/market/candles?instId=BTC-USDT&bar=1s&limit=1";
const proxyUrl = process.env.PROXY_URL;
const agent = new HttpsProxyAgent(proxyUrl);


async function hitExternalApi(apiUrl, params = {}) {
    try {
        const response = await axios.get(apiUrl, {
            params,
            httpsAgent: agent, 
        });

        return response;
    } catch (error) {
        console.error("❌ Gagal mengambil data:", error.message);
        return null;
    }
}

// Koneksi ke SQLite
const db = new sqlite3.Database("tokens.db", (err) => {
    if (err) console.error("[ERROR] Gagal koneksi ke DB:", err.message);
    else console.log("[INFO] Database terhubung!");
});

// Fungsi untuk menambahkan token ke database
function addToken(chatID, chainId, tokenName, address, targetPrice, ctx) {
    db.run(
        "INSERT INTO tokens (chat_id, chain_id, token_name, address, target_price) VALUES (?, ?, ?, ?, ?)",
        [chatID, chainId, tokenName, address, targetPrice],
        (err) => {
            if (err) ctx.reply("❌ Gagal menambahkan token ke dalam daftar.");
            else ctx.reply(`✅ Token *${tokenName}* (${address}) di Chain ID *${chainId}* dengan target harga *${targetPrice}* telah ditambahkan!`, { parse_mode: "Markdown" });
        }
    );
}

// Fungsi untuk mendapatkan daftar token user
function getUserTokens(chatID, callback) {
    db.all("SELECT * FROM tokens WHERE chat_id = ?", [chatID], (err, rows) => {
        if (err) callback([]);
        else callback(rows);
    });
}


// Fungsi memantau harga token untuk semua pengguna
async function checkPrices() {
    db.all("SELECT * FROM tokens", async (err, tokens) => {
        if (err) return console.error("❌ Gagal mengambil token:", err);

        for (const token of tokens) {
            try {
                let response; // Deklarasikan response di luar if-else

                if (token.token_name === "BTC") {
                    console.log(`[INFO] BTC | Harga: ${token.target_price}`);
                    response = await hitExternalApi(API_URL_BTC);
                } else {
                    response = await hitExternalApi(API_URL, {
                        chainId: token.chain_id,
                        address: token.address,
                        bar: "1s",
                        limit: "1",
                    });
                }

                if (response.data.code === "0" && response.data.data.length > 0) {
                    const latestCandle = response.data.data[0];
                    const currentPrice = parseFloat(latestCandle[4]); // Harga penutupan (close)

                    console.log(`[INFO] ${token.token_name} | Chain ID: ${token.chain_id} | Harga: ${currentPrice} | Target: ${token.target_price}`);

                    if (currentPrice >= token.target_price && token.alert_sent === 0) {
                        bot.telegram.sendMessage(
                            token.chat_id,
                            `🚨 *Harga Tercapai!*\n\n🔹 *${token.token_name}*\n💰 *Harga Sekarang:* ${currentPrice}\n🎯 *Target:* ${token.target_price}\n🔗 *Chain ID:* ${token.chain_id}`,
                            {
                                parse_mode: "Markdown",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "✏️ Edit Target Harga", callback_data: `edit_${token.id}` }],
                                    ],
                                },
                            }
                        );

                        // Tandai alert sudah dikirim
                        db.run("UPDATE tokens SET alert_sent = 1 WHERE id = ?", [token.id]);
                    }
                }
            } catch (error) {
                console.error(`[ERROR] Gagal mengambil harga ${token.token_name}:`, error.message);
            }
        }
    });
}

// Fungsi untuk mengambil harga token yang dipantau user
async function checkUserTokenPrices(chatID, ctx) {
    db.all("SELECT * FROM tokens WHERE chat_id = ?", [chatID], async (err, tokens) => {
        if (err) return ctx.reply("❌ Gagal mengambil data token.");

        if (tokens.length === 0) return ctx.reply("📭 Anda belum menambahkan token untuk dipantau.");

        let message = "📊 *Harga Sekarang:*\n";
        
        for (const token of tokens) {
            try {
                let response; // Deklarasikan response di luar if-else

                if (token.token_name === "BTC") {
                    response = await hitExternalApi(API_URL_BTC);
                } else {
                    response = await hitExternalApi(API_URL, {
                        chainId: token.chain_id,
                        address: token.address,
                        bar: "1s",
                        limit: "1",
                    });
                }

                if (response.data.code === "0" && response.data.data.length > 0) {
                    const latestCandle = response.data.data[0];
                    const currentPrice = parseFloat(latestCandle[4]); // Harga penutupan (close)

                    console.log(`[INFO] ${token.token_name} | Chain ID: ${token.chain_id} | Harga: ${currentPrice} | Target: ${token.target_price}`);

                    message += `\n🔹 *${token.token_name}*\n   💰 Harga Sekarang: ${currentPrice}\n   🎯 Target: ${token.target_price}\n   🔗 Chain ID: ${token.chain_id}\n`;
                } else {
                    console.error(`[ERROR1] Gagal mengambil harga ${token.token_name}:`, response.data);
                    message += `\n⚠️ *${token.token_name}* (Chain ID: ${token.chain_id}) tidak ditemukan!\n`;
                }
            } catch (error) {
                console.error(`[ERROR] Gagal mengambil harga ${token.token_name}:`, error.message);
                message += `\n❌ *${token.token_name}* gagal diambil datanya.\n`;
            }
        }

        ctx.reply(message, { parse_mode: "Markdown" });
    });
}

// 🛠️ Perintah untuk menambahkan token
bot.command("add_token", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 5) {
        return ctx.reply("⚠️ *Format Salah!*\nGunakan format:\n`/addtoken [ChainID] [Nama Token] [Address] [Target Harga]`", { parse_mode: "Markdown" });
    }

    const chainId = args[1];
    const tokenName = args[2];
    const address = args[3];
    const targetPrice = parseFloat(args[4]);

    if (isNaN(targetPrice)) return ctx.reply("❌ Target harga harus berupa angka!");

    addToken(ctx.message.chat.id, chainId, tokenName, address, targetPrice, ctx);
});

// 🛠️ Perintah untuk melihat daftar token user
bot.command("list_token", (ctx) => {
    getUserTokens(ctx.message.chat.id, (tokens) => {
        console.log(ctx.message.chat.id);
        if (tokens.length === 0) {
            return ctx.reply("📭 Anda belum menambahkan token untuk dipantau.");
        }

        let message = "📌 *Token yang Anda Pantau:*\n";
        tokens.forEach((token, index) => {
            message += `\n${index + 1}. *${token.token_name}* - ${token.address}\n   🆔 Token ID: ${token.id}\n   🔗 Chain ID: ${token.chain_id}\n   🎯 Target: ${token.target_price}\n   ✅ Capai Target: ${token.alert_sent === 1 ? 'Sudah' : 'Belum'}\n`;
        });

        ctx.reply(message, { parse_mode: "Markdown" });
    });
});

// 🛠️ Perintah untuk menghapus token user
bot.command("remove_token", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("⚠️ *Format Salah!*\nGunakan format:\n`/removetoken [Address]`", { parse_mode: "Markdown" });

    const address = args[1];

    db.run("DELETE FROM tokens WHERE chat_id = ? AND address = ?", [ctx.message.chat.id, address], function (err) {
        if (err) return ctx.reply("❌ Gagal menghapus token.");
        if (this.changes === 0) return ctx.reply("❌ Token tidak ditemukan di daftar Anda.");
        ctx.reply("✅ Token berhasil dihapus dari daftar pemantauan.");
    });
});

// 🛠️ Perintah untuk cek harga terbaru semua token yang dipantau user
bot.command("price_now", (ctx) => {
    checkUserTokenPrices(ctx.message.chat.id, ctx);
});

bot.command("edit_target", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 3) return ctx.reply("⚠️ Format salah! Gunakan: \n/edit_target [token_id] [target_baru]");

    const tokenId = args[1];
    const newTarget = parseFloat(args[2]);

    if (isNaN(newTarget)) return ctx.reply("⚠️ Target harga harus berupa angka.");

    db.run("UPDATE tokens SET target_price = ?, alert_sent = 0 WHERE id = ?", [newTarget, tokenId], (err) => {
        if (err) return ctx.reply("❌ Gagal memperbarui target harga.");
        ctx.reply(`✅ Target harga berhasil diperbarui menjadi *${newTarget}* untuk Token ID: ${tokenId}`, { parse_mode: "Markdown" });
    });
});

bot.on("callback_query", async (ctx) => {
    const callbackData = ctx.callbackQuery.data;

    if (callbackData.startsWith("edit_")) {
        const tokenId = callbackData.split("_")[1];

        ctx.reply(`✏️ Kirim target harga baru dalam format: \n/edit_target ${tokenId} [harga_baru]`);
    }
});


// Mulai bot
bot.launch();
console.log("[INFO] Bot Telegram berjalan!");

// Jalankan pemantauan harga setiap 30 detik
setInterval(checkPrices, 30000);
