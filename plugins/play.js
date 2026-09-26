/**
 * play.js
 * YouTube Audio & Video Downloader
 * Uses Noobs API.
 * No fancy font. Plain text.
 * Includes Document fallback for broken/dark videos.
 */

const { cmd } = require('../command');
const config = require("../config"); // 👈 FIXED: was "../set"
const axios = require('axios');
const yts = require('yt-search');

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

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

// ═════════════════════════════════════════════════════════════
// 🎧 AUDIO COMMAND (MP3)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "play",
    alias: ["song", "audio", "mp3", "ytmp3"],
    desc: "Search YouTube and download audio (MP3)",
    category: "download",
    react: "🎧",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        const query = args.join(' ').trim();
        if (!query) {
            return reply(
`╭─「 *QUEEN-ANIKA* 」
│〕.⚠️ *Please provide a song name or YouTube link!*
│〕.
│〕.📌 Example:
│〕..play shape of you
│〕..play https://youtu.be/xxxxx
╰─────────〔🌸〕`
            );
        }

        await conn.sendMessage(from, { text: "🎧 Searching audio..." }, { quoted: mek });

        const search = await yts(query);
        if (!search.videos.length) {
            return reply("❌ Song not found.");
        }

        const video = search.videos[0];
        console.log('[PLAY] Video found:', video.title);

        const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '').substring(0, 60);
        const fileName = `${safeTitle}.mp3`;

        const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;
        console.log('[PLAY] API URL:', apiURL);

        const { data } = await axios.get(apiURL, { timeout: 30000 });
        if (!data || !data.downloadLink) {
            return reply("❌ Failed to retrieve the audio download link.");
        }

        const caption =`╭─「 *QUEEN-ANIKA* 」
│〕.🎧 *Title:* ${video.title}
│〕.🎼 *Views:* ${video.views.toLocaleString()}
│〕.🎻 *Uploaded:* ${video.ago}
│〕.⏱️ *Duration:* ${video.timestamp}
│〕.👤 *Author:* ${video.author?.name || 'Unknown'}
│〕.
│〕.⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻
╰─────────〔🌸〕`;

        // Send thumbnail preview
        try {
            await conn.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: caption,
                
            }, { quoted: mek });
        } catch (e) {
            console.log('[PLAY] Thumbnail failed, sending text only');
            await conn.sendMessage(from, {
                text: caption,
                
            }, { quoted: mek });
        }

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: data.downloadLink },
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false,
            
        }, { quoted: mek });

    } catch (error) {
        console.error('[PLAY] Error:', error.message);
        reply(`❌ Error: ${error.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 🎬 VIDEO COMMAND (MP4)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "video",
    alias: ["vid", "mp4", "ytmp4", "ytvideo"],
    desc: "Search YouTube and download video (MP4)",
    category: "download",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        const query = args.join(' ').trim();
        if (!query) {
            return reply(
`╭─「 *QUEEN-ANIKA* 」
│〕.⚠️ *Please provide a video name or YouTube link!*
│〕.
│〕.📌 Example:
│〕..video shape of you
│〕..video https://youtu.be/xxxxx
╰─────────〔🌸〕`
            );
        }

        await conn.sendMessage(from, { text: "🎬 Searching video..." }, { quoted: mek });

        const search = await yts(query);
        if (!search.videos.length) {
            return reply("❌ Video not found.");
        }

        const video = search.videos[0];
        console.log('[VIDEO] Video found:', video.title);

        const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '').substring(0, 60);
        const fileName = `${safeTitle}.mp4`;

        const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
        console.log('[VIDEO] API URL:', apiURL);

        const { data } = await axios.get(apiURL, { timeout: 30000 });
        if (!data || !data.downloadLink) {
            return reply("❌ Failed to retrieve the video download link.");
        }

        const caption =`╭─「 *QUEEN-ANIKA* 」
│〕.🎬 *Title:* ${video.title}
│〕.🎼 *Views:* ${video.views.toLocaleString()}
│〕.🎻 *Uploaded:* ${video.ago}
│〕.⏱️ *Duration:* ${video.timestamp}
│〕.👤 *Author:* ${video.author?.name || 'Unknown'}
│〕.
│〕.⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻
╰─────────〔🌸〕`;

        // Send thumbnail preview
        try {
            await conn.sendMessage(from, {
                image: { url: video.thumbnail },
                caption: caption,
                
            }, { quoted: mek });
        } catch (e) {
            console.log('[VIDEO] Thumbnail failed, sending text only');
            await conn.sendMessage(from, {
                text: caption,
                
            }, { quoted: mek });
        }

        // ========== FIX: SEND VIDEO WITH DOCUMENT FALLBACK ==========
        try {
            // First try sending as a normal Video message
            await conn.sendMessage(from, {
                video: { url: data.downloadLink },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `🎬 ${video.title}`,
                
            }, { quoted: mek });
            console.log('[VIDEO] Sent as native video successfully.');
        } catch (videoError) {
            console.log('[VIDEO] Native video failed, falling back to document...', videoError.message);
            // If it fails (dark video / codec issue), send as a Document instead
            await conn.sendMessage(from, {
                document: { url: data.downloadLink },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `🎬 *${video.title}*\n(Document Format)`,
                
            }, { quoted: mek });
            console.log('[VIDEO] Sent as document successfully.');
        }

    } catch (error) {
        console.error('[VIDEO] Error:', error.message);
        reply(`❌ Error: ${error.message}`);
    }
});
