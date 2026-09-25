
/**
 * mediadl.js
 * Separate downloaders: Facebook, TikTok, Instagram, YouTube
 * Uses Noobs API (alldl) under the hood.
 * Reply with a number to choose Audio/Video.
 * No fancy font. Document fallback for dark videos.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require('axios');

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== ACTIVE DOWNLOADS STORE ==========
// key = chatId, value = { title, thumbnail, formats: [] }
const activeDownloads = new Map();

// ========== CONTEXT INFO ==========
function ctxInfo() {
    return {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '1203634129500689311@newsletter',
            newsletterName: 'Queen-Anika'
        }
    };
}

// ========== HELPER: Send branded preview ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Call Noobs API and parse formats ==========
async function fetchMedia(url) {
    const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    let medias = [];
    let title = data.title || "Media Download";
    let thumbnail = data.thumbnail || BRAND_IMAGE;

    // The Noobs API returns different shapes — handle all of them
    if (data.medias && Array.isArray(data.medias)) {
        medias = data.medias;
    } else if (data.result && Array.isArray(data.result)) {
        medias = data.result;
    } else if (data.links && Array.isArray(data.links)) {
        medias = data.links;
    } else if (data.url) {
        medias = [{ url: data.url, quality: 'default', ext: 'mp4' }];
    }

    if (medias.length === 0) throw new Error("No media found in the API response.");

    // Build format list
    const formats = [];
    let formatList = "";

    medias.slice(0, 5).forEach((item, index) => {
        const itemUrl = item.url || item.link || item.download;
        const ext = (item.ext || item.extension || 'mp4').toLowerCase();
        const quality = item.quality || item.label || item.resolution || 'Default';

        const isAudio = ext === 'mp3' || ext === 'm4a' || quality.toLowerCase().includes('audio');
        const label = isAudio ? `Audio (${quality})` : `Video (${quality})`;

        formats.push({
            url: itemUrl,
            ext: ext,
            type: isAudio ? 'audio' : 'video'
        });

        formatList += `${index + 1}️⃣ ${label}\n`;
    });

    return { title, thumbnail, formats, formatList };
}

// ========== HELPER: The shared download handler ==========
async function handleDownload(conn, mek, m, { from, reply, args }, platformName) {
    try {
        if (!args[0]) {
            return reply(
`⚠️ *Please insert a ${platformName} link!*

📌 Example:
.${platformName.toLowerCase()} <link>`
            );
        }

        const url = args.join(" ");
        await conn.sendPresenceUpdate('composing', from);

        const { title, thumbnail, formats, formatList } = await fetchMedia(url);

        // Save for the number-reply handler
        activeDownloads.set(from, {
            title,
            thumbnail,
            formats,
            timestamp: Date.now()
        });

        // Auto-expire after 60s
        setTimeout(() => {
            if (activeDownloads.has(from)) activeDownloads.delete(from);
        }, 60000);

        const caption =
`📥 *${platformName.toUpperCase()} DOWNLOADER*

📹 *Title:* ${title}

📌 *Reply with a number to select format:*
${formatList}
*(Reply with 1, 2, 3, etc.)*`;

        await sendBranded(conn, from, mek, caption);

    } catch (error) {
        console.error(`[${platformName}] Error:`, error.message);
        reply(`❌ Error: Failed to fetch media.\nThe link might be private, invalid, or the API is down.`);
    }
}

// ═════════════════════════════════════════════════════════════
// 📘 FACEBOOK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "facebook",
    alias: ["fb", "fbdown", "fbvideo", "fbdl"],
    desc: "Download Facebook videos (HD/SD/Audio)",
    category: "download",
    react: "📘",
    filename: __filename
},
async (conn, mek, m, ctx) => {
    return handleDownload(conn, mek, m, ctx, "Facebook");
});

// ═════════════════════════════════════════════════════════════
// 🎵 TIKTOK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdown", "ttdl", "tik"],
    desc: "Download TikTok videos (no watermark)",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, ctx) => {
    return handleDownload(conn, mek, m, ctx, "TikTok");
});

// ═════════════════════════════════════════════════════════════
// 📸 INSTAGRAM
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "instagram",
    alias: ["ig", "igdown", "igdl", "insta"],
    desc: "Download Instagram videos/reels/images",
    category: "download",
    react: "📸",
    filename: __filename
},
async (conn, mek, m, ctx) => {
    return handleDownload(conn, mek, m, ctx, "Instagram");
});

// ═════════════════════════════════════════════════════════════
// ▶️ YOUTUBE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "youtube",
    alias: ["yt", "ytdown", "ytdl", "ytvideo"],
    desc: "Download YouTube videos/audio",
    category: "download",
    react: "▶️",
    filename: __filename
},
async (conn, mek, m, ctx) => {
    return handleDownload(conn, mek, m, ctx, "YouTube");
});

// ═════════════════════════════════════════════════════════════
// 🔢 REPLY HANDLER — catches number replies (1, 2, 3...)
// ═════════════════════════════════════════════════════════════
cmd({
    on: "text",
    filename: __filename
},
async (conn, mek, m, { from, reply, body }) => {
    try {
        if (!activeDownloads.has(from)) return;

        const num = parseInt(String(body).trim());
        if (isNaN(num) || num < 1 || num > 5) return;

        const data = activeDownloads.get(from);
        activeDownloads.delete(from);

        const selected = data.formats[num - 1];
        if (!selected) return reply("❌ Invalid number. Please start over with a link.");

        await conn.sendPresenceUpdate('recording', from);

        const safeTitle = data.title.replace(/[^\w\s-]/g, '').substring(0, 40);

        if (selected.type === 'audio') {
            // ========== SEND AUDIO ==========
            await conn.sendMessage(from, {
                audio: { url: selected.url },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false,
                contextInfo: ctxInfo()
            }, { quoted: mek });

        } else {
            // ========== SEND VIDEO (with document fallback) ==========
            try {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
                console.log('[MEDIA] Sent as native video.');

            } catch (videoError) {
                console.log('[MEDIA] Native video failed, falling back to document...', videoError.message);
                await conn.sendMessage(from, {
                    document: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*\n_(Document format)_`,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
                console.log('[MEDIA] Sent as document.');
            }
        }
    } catch (error) {
        console.error("[MEDIA] Selection error:", error);
        reply("❌ Failed to send the media. Please try again.");
    }
});
