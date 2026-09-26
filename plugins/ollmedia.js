/**
 * mediadl.js
 * Facebook • TikTok • Instagram • YouTube downloader
 * Uses exact string matching for replies (Shazam-style).
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require('axios');

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== ACTIVE DOWNLOADS STORE ==========
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

// ========== HELPER: Fetch Media (with Fallback) ==========
async function fetchMedia(url) {
    let data = null;
    let apiSource = "Noobs";

    // Try Noobs API first
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        const res = await axios.get(apiUrl, { timeout: 15000 });
        if (res.data && (res.data.medias || res.data.result || res.data.url)) {
            data = res.data;
        }
    } catch (e) {
        console.log("[MEDIA] Noobs API failed, trying fallback...");
    }

    // If Noobs failed, try Fallback API
    if (!data) {
        try {
            apiSource = "Fallback";
            const apiUrl = `https://api.akuari.my.id/downloader/alldl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl, { timeout: 15000 });
            if (res.data && (res.data.result || res.data.url || res.data.links)) {
                data = res.data;
            }
        } catch (e) {
            console.log("[MEDIA] Fallback API also failed.");
        }
    }

    if (!data) throw new Error("All APIs failed to fetch media.");

    // Parse the data into a standard format
    let medias = [];
    let title = data.title || data.result?.title || "Media Download";
    let thumbnail = data.thumbnail || data.result?.thumbnail || BRAND_IMAGE;

    if (data.medias && Array.isArray(data.medias)) {
        medias = data.medias;
    } else if (data.result && Array.isArray(data.result)) {
        medias = data.result;
    } else if (data.links && Array.isArray(data.links)) {
        medias = data.links;
    } else if (data.url) {
        medias = [{ url: data.url, quality: 'default', ext: 'mp4' }];
    } else if (data.result && data.result.url) {
        medias = [{ url: data.result.url, quality: 'default', ext: 'mp4' }];
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

    return { title, thumbnail, formats, formatList, apiSource };
}

// ========== HELPER: Handle Download Request ==========
async function handleDownload(conn, mek, m, { from, reply, args }, platformName) {
    try {
        if (!args[0]) {
            return reply(`⚠️ Please insert a ${platformName} link!\n\n📌 Example:\n.${platformName.toLowerCase()} <link>`);
        }

        const url = args.join(" ");
        await conn.sendPresenceUpdate('composing', from);

        const { title, formats, formatList, apiSource } = await fetchMedia(url);

        // Save for the number-reply handler
        activeDownloads.set(from, {
            title,
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
*(Reply with 1, 2, 3, etc.)*

_🔗 Source: ${apiSource}_`;

        await sendBranded(conn, from, mek, caption);

    } catch (error) {
        console.error(`[${platformName}] Error:`, error.message);
        reply(`❌ Error: Failed to fetch media.\nThe link might be private, invalid, or all APIs are down.`);
    }
}

// ═════════════════════════════════════════════════════════════
// 📘 FACEBOOK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "facebook",
    alias: ["fb", "fbdown", "fbvideo", "fbdl"],
    desc: "Download Facebook videos",
    category: "download",
    react: "📘",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "Facebook"));

// ═════════════════════════════════════════════════════════════
// 🎵 TIKTOK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdown", "ttdl", "tik"],
    desc: "Download TikTok videos",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "TikTok"));

// ═════════════════════════════════════════════════════════════
// 📸 INSTAGRAM
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "instagram",
    alias: ["ig", "igdown", "igdl", "insta"],
    desc: "Download Instagram media",
    category: "download",
    react: "📸",
    filename: __filename
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "Instagram"));

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
}, async (conn, mek, m, ctx) => handleDownload(conn, mek, m, ctx, "YouTube"));

// ═════════════════════════════════════════════════════════════
// 🔢 REPLY HANDLER — EXACT MATCHING (SHAZAM STYLE)
// ═════════════════════════════════════════════════════════════
cmd({
    on: "text",
    filename: __filename
},
async (conn, mek, m, { from, reply, body }) => {
    try {
        // 1. Check if this chat has a pending download
        if (!activeDownloads.has(from)) return;

        // 2. Get the exact text the user typed
        const clean = String(body || "").trim();

        // 3. Exact string matching (like Shazam)
        if (clean !== "1" && clean !== "2" && clean !== "3" && clean !== "4" && clean !== "5") return;

        // 4. Get the data and delete it from cache immediately
        const data = activeDownloads.get(from);
        activeDownloads.delete(from);

        // 5. Find the selected format based on the number
        const index = parseInt(clean) - 1;
        const selected = data.formats[index];

        if (!selected) return reply("❌ Invalid number. Please start over with a link.");

        await conn.sendPresenceUpdate('recording', from);
        const safeTitle = data.title.replace(/[^\w\s-]/g, '').substring(0, 40);

        // 6. Send the media (Audio or Video) based on exact number match
        if (clean === "1") {
            if (selected.type === 'audio') {
                await conn.sendMessage(from, {
                    audio: { url: selected.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek }).catch(async () => {
                    await conn.sendMessage(from, {
                        document: { url: selected.url },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}.mp4`,
                        caption: `🎬 *${data.title}* (Document)`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });
                });
            }
        } 
        else if (clean === "2") {
            if (selected.type === 'audio') {
                await conn.sendMessage(from, {
                    audio: { url: selected.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek }).catch(async () => {
                    await conn.sendMessage(from, {
                        document: { url: selected.url },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}.mp4`,
                        caption: `🎬 *${data.title}* (Document)`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });
                });
            }
        } 
        else if (clean === "3") {
            if (selected.type === 'audio') {
                await conn.sendMessage(from, {
                    audio: { url: selected.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek }).catch(async () => {
                    await conn.sendMessage(from, {
                        document: { url: selected.url },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}.mp4`,
                        caption: `🎬 *${data.title}* (Document)`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });
                });
            }
        } 
        else if (clean === "4") {
            if (selected.type === 'audio') {
                await conn.sendMessage(from, {
                    audio: { url: selected.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek }).catch(async () => {
                    await conn.sendMessage(from, {
                        document: { url: selected.url },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}.mp4`,
                        caption: `🎬 *${data.title}* (Document)`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });
                });
            }
        } 
        else if (clean === "5") {
            if (selected.type === 'audio') {
                await conn.sendMessage(from, {
                    audio: { url: selected.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: selected.url },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${data.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek }).catch(async () => {
                    await conn.sendMessage(from, {
                        document: { url: selected.url },
                        mimetype: 'video/mp4',
                        fileName: `${safeTitle}.mp4`,
                        caption: `🎬 *${data.title}* (Document)`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });
                });
            }
        }

    } catch (error) {
        console.error("[MEDIA] Selection error:", error);
        reply("❌ Failed to send the media. Please try again.");
    }
});
