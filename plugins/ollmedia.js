/**
 * mediadl.js
 * Facebook • TikTok • Instagram • YouTube downloader
 * Uses exact string matching for replies (Shazam style).
 * Primary: Noobs API. Fallbacks included.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require('axios');

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png";

// ========== ACTIVE DOWNLOADS STORE ==========
const activeDownloads = new Map();

// ========== CONTEXT INFO ==========
function ctxInfo() {
    return {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363402336733732@newsletter',
            newsletterName: 'Queen-Anika'
        }
    };
}

// ========== HELPER: Send branded ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ═════════════════════════════════════════════════════════════
// UNIVERSAL MEDIA FETCHER
// ═════════════════════════════════════════════════════════════
async function fetchMedia(url) {
    let data = null;
    let apiSource = "Noobs";
    let title = "Media Download";

    // ─── Try Noobs API first ───
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        console.log(`🔄 [Noobs] ${apiUrl}`);
        const res = await axios.get(apiUrl, {
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (res.data && (res.data.result || res.data.url || res.data.medias || res.data.video)) {
            data = res.data;
        }
    } catch (e) {
        console.log("[MEDIA] Noobs API failed:", e.message);
    }

    // ─── Fallback: btch-downloader ───
    if (!data) {
        try {
            apiSource = "btch";
            const apiUrl = `https://btch-downloader-api-green.vercel.app/api/download/aio?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            if (res.data) data = res.data;
        } catch (e) {
            console.log("[MEDIA] btch API failed:", e.message);
        }
    }

    // ─── Fallback: tikwm for TikTok only ───
    if (!data && (url.includes('tiktok.com') || url.includes('vm.tiktok'))) {
        try {
            apiSource = "tikwm";
            const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            if (res.data && res.data.data) {
                const r = res.data.data;
                return {
                    title: r.title || "TikTok Video",
                    apiSource,
                    formats: [
                        { url: r.play, quality: 'SD', ext: 'mp4', type: 'video' },
                        { url: r.hd_play || r.play, quality: 'HD', ext: 'mp4', type: 'video' },
                        { url: r.music, quality: 'Audio', ext: 'mp3', type: 'audio' }
                    ].filter(f => f.url),
                    formatList: ""
                };
            }
        } catch (e) {
            console.log("[MEDIA] tikwm API failed:", e.message);
        }
    }

    if (!data) throw new Error("All APIs failed to fetch media.");

    // ─── Parse the response ───
    title = data.title || data.videoTitle || data.caption || data.result?.title || "Media Download";
    let medias = [];

    if (data.medias && Array.isArray(data.medias)) {
        medias = data.medias;
    } else if (data.links && Array.isArray(data.links)) {
        medias = data.links;
    } else if (data.result && Array.isArray(data.result)) {
        medias = data.result;
    } else if (data.data && Array.isArray(data.data)) {
        medias = data.data;
    } else {
        // Single result format
        const videoUrl = data.result || data.url || data.video || data.video_url || data.download_url;
        const audioUrl = data.audio || data.audio_url || data.music;
        if (videoUrl) medias.push({ url: videoUrl, quality: 'HD', ext: 'mp4' });
        if (audioUrl) medias.push({ url: audioUrl, quality: 'Audio', ext: 'mp3' });
    }

    if (medias.length === 0) throw new Error("No media found in the API response.");

    // Build formats
    const formats = [];
    let formatList = "";
    const usedUrls = new Set();

    medias.slice(0, 5).forEach((item) => {
        const itemUrl = typeof item === 'string' ? item : (item.url || item.link || item.download);
        if (!itemUrl || usedUrls.has(itemUrl)) return;
        usedUrls.add(itemUrl);

        const ext = typeof item === 'object' 
            ? (item.ext || item.extension || 'mp4').toLowerCase() 
            : (itemUrl.includes('.mp3') ? 'mp3' : 'mp4');
        const quality = typeof item === 'object'
            ? (item.quality || item.label || item.resolution || 'Default')
            : 'Default';

        const isAudio = ext === 'mp3' || ext === 'm4a' || quality.toLowerCase().includes('audio');
        const label = isAudio ? `Audio (${quality})` : `Video (${quality})`;

        formats.push({ url: itemUrl, ext, type: isAudio ? 'audio' : 'video' });
        formatList += `${formats.length}️⃣ ${label}\n`;
    });

    if (formats.length === 0) throw new Error("No valid formats found.");

    return { title, formats, formatList, apiSource };
}

// ═════════════════════════════════════════════════════════════
// HANDLE DOWNLOAD REQUEST
// ═════════════════════════════════════════════════════════════
async function handleDownload(conn, mek, m, { from, reply, args }, platformName) {
    try {
        if (!args[0]) {
            return reply(
`⚠️ Please insert a ${platformName} link!

📌 Example:
.${platformName.toLowerCase()} <link>`
            );
        }

        const url = args.join(" ");
        await conn.sendPresenceUpdate('composing', from);

        const { title, formats, formatList, apiSource } = await fetchMedia(url);

        // Save for reply handler
        activeDownloads.set(from, { title, formats, timestamp: Date.now() });

        // Auto-expire after 60s
        setTimeout(() => {
            if (activeDownloads.has(from)) activeDownloads.delete(from);
        }, 60000);

        const caption =`╭─「 *QUEEN-ANIKA* 」
│〕.📥 *${platformName.toUpperCase()} DOWNLOADER*
│〕.📹 *Title:* ${title}
│〕.📌 *Reply with a number to select format:*
│〕.${formatList}
│〕.video and audio
│〕.⇆ㅤ || *[1]*,
│〕.⇆ㅤ || *[2]*,
│〕.⇆ㅤ || *[3]*, etc.)*
╰─────────〔🌸〕`;

        await sendBranded(conn, from, mek, caption);

    } catch (error) {
        console.error(`[${platformName}] Error:`, error.message);
        reply(`❌ Error: Failed to fetch media.\nThe link might be private, invalid, or all APIs are down.`);
    }
}

// ═════════════════════════════════════════════════════════════
// COMMANDS
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "facebook",
    alias: ["fb", "fbdown", "fbvideo", "fbdl"],
    desc: "Download Facebook videos",
    category: "download",
    react: "📘",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "Facebook"));

cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdown", "ttdl", "tik"],
    desc: "Download TikTok videos",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "TikTok"));

cmd({
    pattern: "instagram",
    alias: ["ig", "igdown", "igdl", "insta"],
    desc: "Download Instagram media",
    category: "download",
    react: "📸",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "Instagram"));

cmd({
    pattern: "youtube",
    alias: ["yt", "ytdown", "ytdl", "ytvideo"],
    desc: "Download YouTube videos/audio",
    category: "download",
    react: "▶️",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "YouTube"));

// ═════════════════════════════════════════════════════════════
// 🔢 SHAZAM-STYLE REPLY HANDLER (EXACT MATCHING)
// ═════════════════════════════════════════════════════════════
cmd({
    on: "text",
    filename: __filename
},
async (conn, mek, m, { from, reply, body }) => {
    try {
        // 1. Check for pending download
        if (!activeDownloads.has(from)) return;

        // 2. Exact string matching
        const clean = String(body || "").trim();
        if (clean !== "1" && clean !== "2" && clean !== "3" && clean !== "4" && clean !== "5") return;

        // 3. Get data and clear cache
        const data = activeDownloads.get(from);
        activeDownloads.delete(from);

        const index = parseInt(clean) - 1;
        const selected = data.formats[index];
        if (!selected) return reply("❌ Invalid number. Please start over with a link.");

        await conn.sendPresenceUpdate('recording', from);
        const safeTitle = data.title.replace(/[^\w\s-]/g, '').substring(0, 40) || 'media';

        // 4. Send the media based on the exact number
        if (clean === "1") {
            await sendMedia(conn, from, mek, selected, data.title, safeTitle);
        } 
        else if (clean === "2") {
            await sendMedia(conn, from, mek, selected, data.title, safeTitle);
        } 
        else if (clean === "3") {
            await sendMedia(conn, from, mek, selected, data.title, safeTitle);
        } 
        else if (clean === "4") {
            await sendMedia(conn, from, mek, selected, data.title, safeTitle);
        } 
        else if (clean === "5") {
            await sendMedia(conn, from, mek, selected, data.title, safeTitle);
        }

    } catch (error) {
        console.error("[MEDIA] Selection error:", error);
        reply("❌ Failed to send the media. Please try again.");
    }
});

// ========== HELPER: Send Media (with Document Fallback) ==========
async function sendMedia(conn, from, mek, selected, title, safeTitle) {
    if (selected.type === 'audio') {
        await conn.sendMessage(from, {
            audio: { url: selected.url },
            mimetype: 'audio/mpeg',
            fileName: `${safeTitle}.mp3`,
            ptt: false,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    } else {
        try {
            await conn.sendMessage(from, {
                video: { url: selected.url },
                mimetype: 'video/mp4',
                fileName: `${safeTitle}.mp4`,
                caption: `🎬 *${title}*`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
            console.log('[MEDIA] Sent as native video.');
        } catch (videoError) {
            console.log('[MEDIA] Native video failed, sending as document...', videoError.message);
            await conn.sendMessage(from, {
                document: { url: selected.url },
                mimetype: 'video/mp4',
                fileName: `${safeTitle}.mp4`,
                caption: `🎬 *${title}*\n_(Document format)_`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
            console.log('[MEDIA] Sent as document.');
        }
    }
                                                         }
