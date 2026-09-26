/**
 * tools.js
 * Combined: Image Search, Get Profile Pic, APK Downloader, and Lyrics.
 * Uses cmd() handler. No fancy font. No buttons. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config"); // 👈 FIXED: was "../set"
const axios = require('axios');

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// Google Custom Search API credentials (for .img)
const GCSE_KEY = 'AIzaSyDMbI3nvmQUrfjoCJYLS69Lej1hSXQjnWI';
const GCSE_CX = 'baf9bdb0c631236e5';

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

// ========== HELPER: Send branded text ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: File Size Formatter (for APK) ==========
function formatFileSize(bytes) {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ═════════════════════════════════════════════════════════════
// 1. 🖼️ IMAGE SEARCH (.img / .image)
// ═════════════════════════════════════════════════════════════
async function searchImages(query) {
    try {
        const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                q: query,
                key: GCSE_KEY,
                cx: GCSE_CX,
                searchType: 'image',
                num: 8,
                safe: 'off'
            },
            timeout: 15000
        });

        if (!data.items || data.items.length === 0) return [];

        return data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
        }));
    } catch (error) {
        console.error("Google Images API error:", error.response?.data || error.message);
        return [];
    }
}

cmd({
    pattern: "img",
    alias: ["image", "images"],
    desc: "Search Google Images",
    category: "download",
    react: "☘️",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    try {
        if (!args[0]) {
            return sendBranded(conn, from, mek, "❓ Which image? Provide a search query.");
        }

        const query = args.join(" ");

        // Loading message
        const loadingMsg = await conn.sendMessage(from, {
            text: `⏳ Searching for "${query}" images...`
        }, { quoted: mek });

        const images = await searchImages(query);

        if (!images || images.length === 0) {
            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
            return sendBranded(conn, from, mek, "❌ No images found.");
        }

        const results = images.slice(0, 8);

        // Download each image buffer
        const picked = await Promise.all(
            results.map(async (img) => {
                try {
                    const bufferRes = await axios.get(img.url, {
                        responseType: "arraybuffer",
                        timeout: 10000
                    });
                    return { buffer: bufferRes.data, directLink: img.url };
                } catch {
                    console.error("Image download failed:", img.url);
                    return null;
                }
            })
        );

        const validImages = picked.filter(Boolean);
        if (validImages.length === 0) {
            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
            return sendBranded(conn, from, mek, "❌ No images could be downloaded.");
        }

        // Delete loading
        await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});

        // Send each image individually
        for (let i = 0; i < validImages.length; i++) {
            try {
                await conn.sendMessage(from, {
                    image: validImages[i].buffer,
                    caption: `📸 *Image ${i + 1}/${validImages.length}*\n🔍 Search: ${query}\n\n🔗 `,
                    contextInfo: ctxInfo()
                }, { quoted: mek });

                // Small delay to avoid spam
                await new Promise(r => setTimeout(r, 800));
            } catch (e) {
                console.error(`[IMG] Failed to send image ${i + 1}:`, e.message);
            }
        }
    } catch (error) {
        console.error("Error searching images:", error.message);
        reply(`❌ Error: ${error.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 2. 📷 GET PROFILE PIC (.getpp / .profile)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "getpp",
    alias: ["profile", "pp", "getpic"],
    desc: "Get a user's profile picture by replying to them.",
    category: "general",
    react: "📷",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, quoted, senderNumber, pushname }) => {
    try {
        if (!quoted) {
            return reply(
`❌ *Reply to someone's message* to get their profile picture!

📌 Example:
Reply to a message → .getpp`
            );
        }

        // Identify the target user
        const targetJid = quoted.sender || quoted.participant || quoted.key?.participant;
        if (!targetJid) {
            return reply("❌ Could not identify the target user.");
        }

        const targetNum = String(targetJid).split('@')[0].split(':')[0];

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } }).catch(() => {});

        // Try to fetch the target's profile pic
        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(targetJid, "image");
        } catch {
            // Fallback to brand image
            try {
                await conn.sendMessage(from, {
                    text: `⚠️ @${targetNum}'s profile picture is locked or unavailable. Sending brand image instead.`,
                    mentions: [targetJid]
                }, { quoted: mek });
            } catch {}
            ppUrl = BRAND_IMAGE;
        }

        // Send the picture
        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption:
`📸 *PROFILE PICTURE*

👤 *User:* @${targetNum}
📥 *Requested by:* ${pushname || 'User'}

✅ *Downloaded successfully!*`,
            mentions: [targetJid],
            contextInfo: ctxInfo()
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (error) {
        console.error("Error in .getpp command:", error);
        reply(`❌ Failed: ${error.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 3. 📦 APK DOWNLOADER (.apk)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "apk",
    alias: ["app", "apkdownload", "downloadapk"],
    desc: "Search and download APK files",
    category: "download",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    try {
        if (!args || !args[0]) {
            return reply(
`📌 *Please provide an app name*

📝 *Example:*
.apk whatsapp
.apk instagram
.apk download whatsapp`
            );
        }

        await conn.sendPresenceUpdate('composing', from);

        const query = args.join(" ");
        const isDownload = query.toLowerCase().includes("download");
        const searchQuery = isDownload ? query.replace(/download/gi, '').trim() : query;

        const loadingMsg = await conn.sendMessage(from, {
            text: `🔍 Searching for "${searchQuery}" APK...`
        }, { quoted: mek });

        try {
            const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(searchQuery)}/limit=1`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            if (!data?.datalist?.list?.length) {
                await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
                return reply(`❌ No APK found for "${searchQuery}". Please try a different name.`);
            }

            const app = data.datalist.list[0];
            const appSize = formatFileSize(app.file?.filesize || app.size);
            const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;

            // Fetch icon
            let imageBuffer = null;
            try {
                const iconUrl = app.icon || app.media?.icon || BRAND_IMAGE;
                const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
                imageBuffer = imgRes.data;
            } catch {}

            // Send app info
            const infoCaption =
`📦 *${app.name}*

📱 *Name:* ${app.name}
📦 *Package:* \`${app.package}\`
🏋️ *Size:* ${appSize}
📅 *Updated:* ${app.updated || "Unknown"}
👨‍💻 *Developer:* ${app.developer?.name || "Unknown"}
📊 *Version:* ${app.version_name || app.version || "Unknown"}
⭐ *Rating:* ${app.stats?.rating?.avg || app.rating || "N/A"}
📥 *Downloads:* ${app.stats?.downloads || "Unknown"}`;

            // Delete loading
            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});

            // Send info with icon
            if (imageBuffer) {
                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: infoCaption,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    image: { url: BRAND_IMAGE },
                    caption: infoCaption,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            }

            // Download APK
            if (isDownload) {
                const dlMsg = await conn.sendMessage(from, {
                    text: `⏳ Downloading ${app.name} APK...\n📦 Size: ${appSize}\n⏱️ Please wait...`
                }, { quoted: mek });

                try {
                    if (!downloadUrl) throw new Error("No download URL available");

                    const apkResponse = await axios({
                        method: 'GET',
                        url: downloadUrl,
                        responseType: 'arraybuffer',
                        timeout: 120000
                    });

                    const apkBuffer = Buffer.from(apkResponse.data);
                    const safeName = app.name.replace(/[^a-zA-Z0-9]/g, '_');

                    await conn.sendMessage(from, {
                        document: apkBuffer,
                        fileName: `${safeName}.apk`,
                        mimetype: "application/vnd.android.package-archive",
                        caption:
`📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *Download complete!*

⚠️ *Installation Tips:*
• Enable 'Unknown Sources' in Settings
• Open the downloaded file
• Click 'Install'`,
                        contextInfo: ctxInfo()
                    }, { quoted: mek });

                    await conn.sendMessage(from, { delete: dlMsg.key }).catch(() => {});

                } catch (downloadError) {
                    console.error("Download error:", downloadError.message);
                    await conn.sendMessage(from, { delete: dlMsg.key }).catch(() => {});
                    await reply(`❌ *Download failed*\n\nCould not download ${app.name}.\nReason: ${downloadError.message}`);
                }
            } else {
                await conn.sendMessage(from, {
                    text: `💡 To download, type: .apk download ${app.name}`
                }, { quoted: mek });
            }

        } catch (error) {
            console.error("APK search error:", error);
            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
            reply("❌ *Error searching APK*\n\nPlease try again later.");
        }
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 4. 📦 PLAYSTORE APK AUTO-DOWNLOAD (.playstore)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "playstore",
    alias: ["ps", "getapk"],
    desc: "Search and auto-download APK from PlayStore",
    category: "download",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    try {
        if (!args || !args[0]) {
            return reply(
`📌 *Please provide an app name*

📝 *Example:*
.playstore whatsapp
.playstore instagram`
            );
        }

        await conn.sendPresenceUpdate('composing', from);

        const searchQuery = args.join(" ").replace(/download/gi, '').trim();

        const loadingMsg = await conn.sendMessage(from, {
            text: `🔍 Searching for "${searchQuery}" APK...`
        }, { quoted: mek });

        try {
            const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(searchQuery)}/limit=1`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            if (!data?.datalist?.list?.length) {
                await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
                return reply(`❌ No APK found for "${searchQuery}". Please try a different name.`);
            }

            const app = data.datalist.list[0];
            const appSize = formatFileSize(app.file?.filesize || app.size);
            const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;

            // Fetch icon
            let imageBuffer = null;
            try {
                const iconUrl = app.icon || app.media?.icon || BRAND_IMAGE;
                const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
                imageBuffer = imgRes.data;
            } catch {}

            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});

            // Send info
            const infoCaption =
`📦 *${app.name}*

📱 *Name:* ${app.name}
📦 *Package:* \`${app.package}\`
🏋️ *Size:* ${appSize}
📅 *Updated:* ${app.updated || "Unknown"}
👨‍💻 *Developer:* ${app.developer?.name || "Unknown"}
📊 *Version:* ${app.version_name || app.version || "Unknown"}`;

            if (imageBuffer) {
                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: infoCaption,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    image: { url: BRAND_IMAGE },
                    caption: infoCaption,
                    contextInfo: ctxInfo()
                }, { quoted: mek });
            }

            // Always download
            const dlMsg = await conn.sendMessage(from, {
                text: `⏳ Downloading ${app.name} APK...\n📦 Size: ${appSize}\n⏱️ Please wait...`
            }, { quoted: mek });

            try {
                if (!downloadUrl) throw new Error("No download URL available");

                const apkResponse = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'arraybuffer',
                    timeout: 120000
                });

                const apkBuffer = Buffer.from(apkResponse.data);
                const safeName = app.name.replace(/[^a-zA-Z0-9]/g, '_');

                await conn.sendMessage(from, {
                    document: apkBuffer,
                    fileName: `${safeName}.apk`,
                    mimetype: "application/vnd.android.package-archive",
                    caption:
`📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *Download complete!*

⚠️ *Installation Tips:*
• Enable 'Unknown Sources' in Settings
• Open the downloaded file
• Click 'Install'`,
                    contextInfo: ctxInfo()
                }, { quoted: mek });

                await conn.sendMessage(from, { delete: dlMsg.key }).catch(() => {});

            } catch (downloadError) {
                console.error("Download error:", downloadError.message);
                await conn.sendMessage(from, { delete: dlMsg.key }).catch(() => {});
                await reply(`❌ *Download failed*\n\nCould not download ${app.name}.\nReason: ${downloadError.message}`);
            }

        } catch (error) {
            console.error("APK search error:", error);
            await conn.sendMessage(from, { delete: loadingMsg.key }).catch(() => {});
            reply("❌ *Error searching APK*\n\nPlease try again later.");
        }
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 5. 📜 LYRICS (.lyrics)
// ═════════════════════════════════════════════════════════════
const LRCLIB_HEADERS = {
    "User-Agent": "NjabuloBot/1.0 (https://github.com/NjabuloJf)",
    "Lrclib-Client": "NjabuloBot v1.0 (https://github.com/NjabuloJf)",
    "Accept": "application/json"
};

async function lrclibSearch(query) {
    try {
        const { data } = await axios.get("https://lrclib.net/api/search", {
            params: { q: query },
            headers: LRCLIB_HEADERS,
            timeout: 20000
        });
        if (Array.isArray(data) && data.length > 0) {
            const withLyrics = data.filter(x => x.plainLyrics || x.syncedLyrics);
            return withLyrics.length > 0 ? withLyrics : data;
        }
        return null;
    } catch (e) {
        console.error("[LRCLIB search]", e.message);
        return null;
    }
}

async function lrclibGet(artist, title) {
    try {
        const { data } = await axios.get("https://lrclib.net/api/get", {
            params: { track_name: title, artist_name: artist },
            headers: LRCLIB_HEADERS,
            timeout: 20000
        });
        if (data && (data.plainLyrics || data.syncedLyrics)) return data;
        return null;
    } catch (e) {
        console.error("[LRCLIB get]", e.message);
        return null;
    }
}

async function lyricsOvh(artist, title) {
    try {
        const { data } = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
            { timeout: 20000, headers: { "User-Agent": "NjabuloBot/1.0" } }
        );
        if (data?.lyrics?.trim()) return data.lyrics.trim();
        return null;
    } catch (e) {
        console.error("[lyrics.ovh]", e.message);
        return null;
    }
}

async function textylSearch(query) {
    try {
        const { data } = await axios.get(
            `https://api.textyl.co/api/lyrics?q=${encodeURIComponent(query)}`,
            { timeout: 20000 }
        );
        if (Array.isArray(data) && data.length > 0) {
            return data.map(x => x.lyrics).join("\n");
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function findLyricsSmart(input) {
    if (input.includes(" - ")) {
        const [artist, title] = input.split(" - ").map(s => s.trim());
        const data = await lrclibGet(artist, title);
        if (data) {
            return {
                title: data.trackName || title,
                artist: data.artistName || artist,
                album: data.albumName,
                duration: data.duration,
                plain: data.plainLyrics || null,
                synced: data.syncedLyrics || null,
                source: "LRCLIB"
            };
        }
    }

    const results = await lrclibSearch(input);
    if (results && results.length > 0) {
        const best = results.find(r => r.plainLyrics) || results[0];
        if (best.plainLyrics || best.syncedLyrics) {
            return {
                title: best.trackName || best.name || input,
                artist: best.artistName || "Unknown",
                album: best.albumName || null,
                duration: best.duration || null,
                plain: best.plainLyrics || null,
                synced: best.syncedLyrics || null,
                source: "LRCLIB"
            };
        }
    }

    const textylResult = await textylSearch(input);
    if (textylResult) {
        return {
            title: input,
            artist: "Unknown",
            album: null,
            duration: null,
            plain: textylResult,
            synced: null,
            source: "textyl.co"
        };
    }

    if (input.includes(" - ")) {
        const [artist, title] = input.split(" - ").map(s => s.trim());
        const lyrics = await lyricsOvh(artist, title);
        if (lyrics) {
            return {
                title, artist,
                album: null, duration: null,
                plain: lyrics,
                synced: null,
                source: "lyrics.ovh"
            };
        }
    }

    return null;
}

cmd({
    pattern: "lyrics",
    alias: ["lyric", "lirik", "songlyrics", "letras", "ly"],
    desc: "Find lyrics for a song",
    category: "music",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    try {
        const query = (args || []).join(" ").trim();

        if (!query) {
            return sendBranded(conn, from, mek,
`📜 *LYRICS*

❌ Usage: .lyrics <song name>

*Examples:*
• .lyrics faded
• .lyrics coldplay yellow
• .lyrics ed sheeran perfect`);
        }

        await conn.sendMessage(from, { react: { text: "🔎", key: mek.key } }).catch(() => {});

        console.log(`[Lyrics] Searching: "${query}"`);
        const result = await findLyricsSmart(query);

        if (!result || (!result.plain && !result.synced)) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return sendBranded(conn, from, mek,
`📜 *NOT FOUND*

❌ Could not find lyrics for: *${query}*

*Tips:*
• Check spelling
• Add artist: .lyrics <song> <artist>
• Try: .lyrics <artist> - <title>`);
        }

        const lyricsText = result.plain || result.synced;
        const maxDisplay = 3000;
        const displayTrim = lyricsText.length > maxDisplay
            ? lyricsText.slice(0, maxDisplay) + "\n\n_...truncated_"
            : lyricsText;

        const caption =
`📜 *${result.title}*
👤 *Artist:* ${result.artist}${result.album ? `\n💿 *Album:* ${result.album}` : ''}

━━━━━━━━━━━━━━━━━
${displayTrim}
━━━━━━━━━━━━━━━━━

📡 Source: ${result.source}`;

        await sendBranded(conn, from, mek, caption);
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (e) {
        console.error("[Lyrics] error:", e.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 6. 🎼 SYNCED LYRICS (.slyrics)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "slyrics",
    alias: ["syncedlyrics", "lrc", "synclyrics"],
    desc: "Find synced lyrics for a song",
    category: "music",
    react: "🎼",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    try {
        const query = (args || []).join(" ").trim();

        if (!query) {
            return sendBranded(conn, from, mek,
`🎼 *SYNCED LYRICS*

❌ Usage: .slyrics <song name>

📌 Example: .slyrics faded`);
        }

        await conn.sendMessage(from, { react: { text: "🔎", key: mek.key } }).catch(() => {});

        const result = await findLyricsSmart(query);

        if (!result || !result.synced) {
            await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
            return sendBranded(conn, from, mek,
`🎼 *NOT AVAILABLE*

⚠️ Synced lyrics not available for *${query}*.

_Try .lyrics ${query} for plain lyrics_`);
        }

        const maxDisplay = 3000;
        const displayTrim = result.synced.length > maxDisplay
            ? result.synced.slice(0, maxDisplay) + "\n\n_...truncated_"
            : result.synced;

        const caption =
`🎼 *${result.title}*
👤 *Artist:* ${result.artist}

━━━━━━━━━━━━━━━━━
${displayTrim}
━━━━━━━━━━━━━━━━━

📡 Source: ${result.source}`;

        await sendBranded(conn, from, mek, caption);
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (e) {
        console.error("[Synced] error:", e.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        reply(`❌ Error: ${e.message}`);
    }
});

