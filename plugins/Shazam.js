/**
 * shazam.js
 * Shazam — identify songs from audio/video, then download as MP3 or MP4.
 * Uses cmd() handler. No fancy font. Uses Noobs API (same as play.js).
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require('axios');
const FormData = require("form-data");
const yts = require('yt-search');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// ========== CONFIG ==========
const AUDD_TOKEN = config.AUDD_API_TOKEN || "";

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== SONG CACHE ==========
// key = chatId, value = { title, artist, albumArt, timestamp }
const songCache = new Map();
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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

// ========== HELPERS ==========
async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// ═════════════════════════════════════════════════════════════
// 🎼 SHAZAM COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "shazam",
    alias: ["findsong", "whatsong", "recognize", "songid"],
    desc: "Identify a song from a replied audio or video message.",
    category: "tools",
    react: "🎼",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, quoted }) => {
    try {
        // 1. Must reply to a message
        if (!quoted) {
            return conn.sendMessage(from, {
                image: { url: BRAND_IMAGE },
                caption:
`🎼 *SHAZAM*

Reply to an audio or video message with *.shazam* to identify the song.`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
        }

        const hasAudio = !!quoted.audioMessage;
        const hasVideo = !!quoted.videoMessage;

        if (!hasAudio && !hasVideo) {
            return conn.sendMessage(from, {
                image: { url: BRAND_IMAGE },
                caption:
`❌ *INVALID MEDIA*

Please reply to a *voice note*, *audio file*, or *video* with .shazam`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
        }

        if (!AUDD_TOKEN) {
            return conn.sendMessage(from, {
                image: { url: BRAND_IMAGE },
                caption: `❌ AUDD_API_TOKEN is missing in config.js`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
        }

        // React: processing
        try {
            await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } });
        } catch {}

        // 2. Download media buffer
        let buffer, mediaType;
        if (hasAudio) {
            buffer = await downloadMedia(quoted.audioMessage, "audio");
            mediaType = "audio";
        } else {
            buffer = await downloadMedia(quoted.videoMessage, "video");
            mediaType = "video";
        }

        if (!buffer || buffer.length < 1000) throw new Error("Media too small");

        // 3. Send to AudD API
        const form = new FormData();
        form.append("file", buffer, {
            filename: mediaType === "audio" ? "audio.mp3" : "video.mp4",
            contentType: mediaType === "audio" ? "audio/mpeg" : "video/mp4"
        });
        form.append("api_token", AUDD_TOKEN);
        form.append("return", "apple_music,spotify,deezer");

        const { data } = await axios.post("https://api.audd.io/", form, {
            headers: form.getHeaders(),
            timeout: 60000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        if (!data || data.status !== "success" || !data.result) {
            try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
            return conn.sendMessage(from, {
                image: { url: BRAND_IMAGE },
                caption:
`🎼 *NO MATCH*

❌ Could not identify the song.

*Tips:*
• Use a longer clip (5+ seconds)
• Clear music, not just vocals`,
                contextInfo: ctxInfo()
            }, { quoted: mek });
        }

        const song = data.result;
        const title = song.title || "Unknown";
        const artist = song.artist || "Unknown";

        // Try to grab album art
        let albumArt = BRAND_IMAGE;
        if (song.apple_music?.artwork?.url) {
            albumArt = song.apple_music.artwork.url.replace("{w}", "600").replace("{h}", "600");
        } else if (song.spotify?.album?.images?.[0]?.url) {
            albumArt = song.spotify.album.images[0].url;
        } else if (song.deezer?.album?.cover_xl) {
            albumArt = song.deezer.album.cover_xl;
        }

        // Save to cache for the number reply
        songCache.set(from, {
            title,
            artist,
            albumArt,
            timestamp: Date.now()
        });

        const bodyText =
`🎵 *Title:* ${title}
👤 *Artist:* ${artist}
${song.album ? `💿 *Album:* ${song.album}\n` : ""}${song.release_date ? `📅 *Released:* ${song.release_date}\n` : ""}
━━━━━━━━━━━━━━━━━

📥 *Reply with:*

 *1*  →  AUDIO 🎵
 *2*  →  VIDEO 🎬`;

        await conn.sendMessage(from, {
            image: { url: albumArt },
            caption: bodyText,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}

    } catch (e) {
        console.error("[Shazam] Error:", e.message);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: `❌ *ERROR*\n\n${e.message}`,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    }
});

// ═════════════════════════════════════════════════════════════
// 🔢 REPLY HANDLER — catches "1" and "2" (same style as mediadl.js)
// ═════════════════════════════════════════════════════════════
cmd({
    on: "text",
    filename: __filename
},
async (conn, mek, m, { from, reply, body }) => {
    try {
        // Must have a pending shazam result in this chat
        if (!songCache.has(from)) return;

        const clean = String(body || "").trim();
        if (clean !== "1" && clean !== "2") return;

        const cached = songCache.get(from);

        // Expired?
        if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
            songCache.delete(from);
            return;
        }

        // Remove cache immediately so double-replies don't fire twice
        songCache.delete(from);

        const query = `${cached.title} ${cached.artist}`;
        console.log(`[Shazam] User replied "${clean}" → searching: ${query}`);

        // ── Find the YouTube video via yt-search ──
        const search = await yts(query);
        if (!search.videos.length) {
            return reply("❌ Could not find this song on YouTube. Please try again later.");
        }

        const video = search.videos[0];

        try { await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } }); } catch {}

        // ═════════════════════════════════════════════════════
        // 1 → AUDIO
        // ═════════════════════════════════════════════════════
        if (clean === "1") {
            const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;
            const { data } = await axios.get(apiURL, { timeout: 30000 });

            if (!data || !data.downloadLink) {
                try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
                return reply("❌ Failed to fetch audio download link.");
            }

            const safeTitle = (video.title || cached.title).replace(/[\\/:*?"<>|]/g, "").substring(0, 60);

            await conn.sendMessage(from, {
                audio: { url: data.downloadLink },
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false,
                contextInfo: ctxInfo()
            }, { quoted: mek });

            try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
        }

        // ═════════════════════════════════════════════════════
        // 2 → VIDEO (with document fallback for dark video fix)
        // ═════════════════════════════════════════════════════
        if (clean === "2") {
            const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
            const { data } = await axios.get(apiURL, { timeout: 30000 });

            if (!data || !data.downloadLink) {
                try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
                return reply("❌ Failed to fetch video download link.");
            }

            const safeTitle = (video.title || cached.title).replace(/[\\/:*?"<>|]/g, "").substring(0, 60);

            try {
                await conn.sendMessage(from, {
                    video: { url: data.downloadLink },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${video.title}*`,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
                console.log('[Shazam] Sent as native video.');

            } catch (videoError) {
                console.log('[Shazam] Native video failed, sending as document...', videoError.message);
                await conn.sendMessage(from, {
                    document: { url: data.downloadLink },
                    mimetype: 'video/mp4',
                    fileName: `${safeTitle}.mp4`,
                    caption: `🎬 *${video.title}*\n_(Document format)_`,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            }

            try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
        }

    } catch (e) {
        console.error("[Shazam Reply] Error:", e.message);
        reply(`❌ Error: ${e.message}`);
    }
});
