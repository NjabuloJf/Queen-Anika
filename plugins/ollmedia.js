/**
 * Mediasocual.js — Instagram Downloader
 * Uses cmd() handler. No buttons. No translation.
 * Branding image: Queen-Anika.png
 */

const { cmd } = require('../command');
const fs = require('fs');
const { default: axios } = require('axios');
const config = require("../set");
const { tiny } = require("../lib/fancy_font/fancy");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== STORE FOR ACTIVE DOWNLOADS ==========
const activeDownloads = {};

// ========== IS NUMBER SELECTION ==========
const isNumberSelection = (text) => {
    const num = parseInt(text);
    return num >= 1 && num <= 5 && !isNaN(num);
};

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

// ========== FETCH INSTAGRAM INFO USING NOOBS API ==========
async function fetchInstagramInfo(url) {
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        console.log(`🔄 Fetching Instagram: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log(`📡 Response status:`, response.status);

        if (response.status === 200 && response.data) {
            const data = response.data;

            let result = {
                title: data.videoTitle || data.title || data.caption || "Instagram Post",
                author: data.author || data.username || "Unknown",
                likes: data.likes || data.like_count || 0,
                comments: data.comments || data.comment_count || 0,
                thumbnail: data.imageUrl || data.thumbnail || data.cover || BRAND_IMAGE,
                videoUrl: data.result || data.video || data.video_url || null,
                images: data.imageUrl ? [data.imageUrl] : (data.images || []),
                isVideo: true,
                isCarousel: false,
                audioUrl: null,
                raw: data
            };

            if (data.result) {
                result.videoUrl = data.result;
            }

            if (data.images && data.images.length > 1) {
                result.isCarousel = true;
                result.isVideo = false;
                result.videoUrl = null;
            }

            if (data.imageUrl && !data.result) {
                result.isVideo = false;
                result.images = [data.imageUrl];
            }

            console.log(`✅ Instagram data parsed: Video=${result.isVideo}, Images=${result.images.length}`);
            return result;
        }

        throw new Error('No data received from API');

    } catch (error) {
        console.error('❌ Instagram API error:', error.message);
        throw error;
    }
}

// ═════════════════════════════════════════════════════════════
// INSTAGRAM DOWNLOADER COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "instagram",
    alias: ["ig", "igdl", "igdown", "insta"],
    desc: "Download Instagram videos, images, and carousels",
    category: "download",
    react: "📸",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, args }) => {
    try {
        // ── Handle number reply (format selection) ──
        const replyText = args ? args.join(' ') : '';
        if (replyText && isNumberSelection(replyText)) {
            const selectedNumber = parseInt(replyText);
            const senderJid = from;

            if (!activeDownloads[senderJid]) {
                return reply(tiny("❌ No active download. Send an Instagram link first."));
            }

            const data = activeDownloads[senderJid];
            delete activeDownloads[senderJid];

            switch (selectedNumber) {
                case 1: return downloadInstagramAudio(conn, from, mek, data);
                case 2: return downloadInstagramVideo(conn, from, mek, data, false);
                case 3: return downloadInstagramVideo(conn, from, mek, data, true);
                case 4: return downloadInstagramImage(conn, from, mek, data);
                case 5: return downloadInstagramCarousel(conn, from, mek, data);
                default:
                    return reply(tiny("❌ Invalid choice! Please reply with 1, 2, 3, 4, or 5."));
            }
        }

        // ── Normal URL processing ──
        if (!args[0]) {
            return reply(tiny(
`⚠️ *Please insert a public Instagram link!*

📌 Example:
.instagram https://www.instagram.com/p/xxxxx`
            ));
        }

        const queryURL = args.join(" ");
        await conn.sendPresenceUpdate('composing', from);
        await conn.sendMessage(from, { text: tiny("📡 Fetching media info...") }, { quoted: mek });

        const result = await fetchInstagramInfo(queryURL);

        if (!result || (!result.videoUrl && (!result.images || result.images.length === 0))) {
            throw new Error("No media found for this link.");
        }

        // Store media info for later
        activeDownloads[from] = {
            mediaInfo: result,
            title: result.title || "Instagram Post",
            url: queryURL,
            thumbnail: result.thumbnail || BRAND_IMAGE,
            videoUrl: result.videoUrl,
            images: result.images || [],
            isVideo: result.isVideo || false,
            isCarousel: result.isCarousel || (result.images && result.images.length > 1),
            audioUrl: result.audioUrl,
            author: result.author,
            likes: result.likes,
            comments: result.comments,
            timestamp: Date.now()
        };

        const isCarousel = result.isCarousel || (result.images && result.images.length > 1);
        const imageCount = result.images ? result.images.length : 0;

        const infoText =
`📥 *INSTAGRAM POST*
│ 📹 *Title:* ${result.title || 'Instagram Post'}
│ 👤 *Author:* ${result.author || 'Unknown'}
│ ❤️ *Likes:* ${(result.likes || 0).toLocaleString()}
│ 💬 *Comments:* ${(result.comments || 0).toLocaleString()}
${isCarousel ? `│ 📸 *Images:* ${imageCount}\n` : ''}│ ${result.isVideo ? '🎬 Video' : '🖼️ Image'}
│
📌 *Select format:*
│ 1️⃣ Audio (MP3)
│ 2️⃣ Video (MP4)
│ 3️⃣ Video Document
│ 4️⃣ Image
${isCarousel ? '│ 5️⃣ All Images (Carousel)\n' : ''}│
*(Reply with 1, 2, 3, 4, or 5)*`;

        // Send preview with Queen-Anika image
        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: tiny(infoText),
            contextInfo: ctxInfo()
        }, { quoted: mek });

        // ── Timeout for selection ──
        setTimeout(async () => {
            if (activeDownloads[from]) {
                delete activeDownloads[from];
                try {
                    await conn.sendMessage(from, {
                        text: tiny("⏰ Timeout! Please try again.")
                    }, { quoted: mek });
                } catch (e) {}
            }
        }, 60000);

    } catch (error) {
        console.error("Instagram Error:", error);
        reply(tiny("⚠️ API is currently unavailable. Please try again later.\n\n❌ Error downloading\n\nPlease check the link and try again."));
    }
});

// ═════════════════════════════════════════════════════════════
// DOWNLOAD INSTAGRAM VIDEO
// ═════════════════════════════════════════════════════════════
async function downloadInstagramVideo(conn, from, mek, data, isDocument) {
    try {
        const videoUrl = data.videoUrl;
        if (!videoUrl) {
            await conn.sendMessage(from, { text: tiny("❌ Error downloading") }, { quoted: mek });
            return;
        }

        await conn.sendPresenceUpdate('recording', from);
        await conn.sendMessage(from, { text: tiny("⏳ Processing...") }, { quoted: mek });

        const title = data.title || "Instagram Video";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp4`;

        const caption =
`📥 *INSTAGRAM POST*

📹 *Title:* ${title}
👤 *Author:* ${data.author || 'Unknown'}

✅ *Download complete!*`;

        if (isDocument) {
            await conn.sendMessage(from, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: tiny(caption),
                contextInfo: ctxInfo()
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: videoUrl },
                caption: tiny(caption),
                contextInfo: ctxInfo()
            }, { quoted: mek });
        }
    } catch (error) {
        console.error("Video download error:", error);
        await conn.sendMessage(from, { text: tiny("❌ Failed to download video. Please try again.") }, { quoted: mek });
    }
}

// ═════════════════════════════════════════════════════════════
// DOWNLOAD INSTAGRAM IMAGE
// ═════════════════════════════════════════════════════════════
async function downloadInstagramImage(conn, from, mek, data) {
    try {
        let imageUrl = null;

        if (data.images && data.images.length > 0) {
            const firstImage = data.images[0];
            imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url || firstImage;
        }

        if (!imageUrl) imageUrl = data.thumbnail;
        if (!imageUrl) {
            await conn.sendMessage(from, { text: tiny("❌ Error downloading") }, { quoted: mek });
            return;
        }

        await conn.sendPresenceUpdate('composing', from);

        const title = data.title || "Instagram Image";
        const caption =
`🖼️ *Your image is ready!*

📹 *Title:* ${title}
👤 *Author:* ${data.author || 'Unknown'}

✅ *Download complete!*`;

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: tiny(caption),
            contextInfo: ctxInfo()
        }, { quoted: mek });

    } catch (error) {
        console.error("Image download error:", error);
        await conn.sendMessage(from, { text: tiny("❌ Failed to download image. Please try again.") }, { quoted: mek });
    }
}

// ═════════════════════════════════════════════════════════════
// DOWNLOAD INSTAGRAM CAROUSEL
// ═════════════════════════════════════════════════════════════
async function downloadInstagramCarousel(conn, from, mek, data) {
    try {
        const images = data.images || [];
        if (images.length === 0) {
            await conn.sendMessage(from, { text: tiny("❌ Error downloading") }, { quoted: mek });
            return;
        }

        await conn.sendPresenceUpdate('composing', from);
        await conn.sendMessage(from, { text: tiny("📤 Sending images...") }, { quoted: mek });

        const title = data.title || "Instagram Carousel";
        const totalImages = Math.min(images.length, 10);

        for (let i = 0; i < totalImages; i++) {
            const img = images[i];
            const imageUrl = typeof img === 'string' ? img : img.url || img;
            if (!imageUrl) continue;

            await conn.sendMessage(from, {
                image: { url: imageUrl },
                caption: tiny(
`📥 *INSTAGRAM POST*

📸 *Image ${i + 1}/${totalImages}*
📹 *Title:* ${title}
👤 *Author:* ${data.author || 'Unknown'}`
                ),
                contextInfo: ctxInfo()
            }, { quoted: mek });

            if (i < totalImages - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await conn.sendMessage(from, {
            text: tiny(`✅ *Download complete!*\n📸 ${totalImages} images sent`)
        }, { quoted: mek });

    } catch (error) {
        console.error("Carousel download error:", error);
        await conn.sendMessage(from, { text: tiny("❌ Failed to download carousel. Please try again.") }, { quoted: mek });
    }
}

// ═════════════════════════════════════════════════════════════
// DOWNLOAD INSTAGRAM AUDIO
// ═════════════════════════════════════════════════════════════
async function downloadInstagramAudio(conn, from, mek, data) {
    try {
        const audioUrl = data.audioUrl || data.videoUrl;
        if (!audioUrl) {
            await conn.sendMessage(from, { text: tiny("❌ Error downloading") }, { quoted: mek });
            return;
        }

        await conn.sendPresenceUpdate('recording', from);
        await conn.sendMessage(from, { text: tiny("⏳ Downloading audio...") }, { quoted: mek });

        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        if (!response.data) throw new Error('Failed to download audio');

        const tempFile = `./temp_${Date.now()}.mp4`;
        const audioFile = `./audio_${Date.now()}.mp3`;

        fs.writeFileSync(tempFile, response.data);

        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
            ffmpeg(tempFile)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(audioFile);
        });

        const title = data.title || "Instagram Audio";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp3`;

        await conn.sendMessage(from, {
            audio: { url: audioFile },
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(audioFile);
        } catch (e) {}

        await conn.sendMessage(from, { text: tiny("✅ *Download complete!*") }, { quoted: mek });

    } catch (error) {
        console.error("Audio download error:", error);
        await conn.sendMessage(from, { text: tiny("❌ Failed to extract audio. Please try again.") }, { quoted: mek });
    }
}
