/**
 * combined.js
 * Includes: gstatus, AI (GPT + Meta AI only), viewonce
 * Uses cmd() handler. No fancy font. No buttons. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require("axios");
const {
    downloadContentFromMessage,
    getContentType
} = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

// ═════════════════════════════════════════════════════════════
// BRANDING & HELPERS
// ═════════════════════════════════════════════════════════════
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png";

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

async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));


// ═════════════════════════════════════════════════════════════
// 1. 📸 GROUP STATUS (.gstatus)
// ═════════════════════════════════════════════════════════════
async function getBufferFromMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

function statusContext(sourceType) {
    return {
        isGroupStatus: true,
        statusSourceType: sourceType,
        statusAttributions: [{ type: 10 }],
        statusAudienceMetadata: { audienceType: "CLOSE_FRIENDS" }
    };
}

cmd({
    pattern: "gstatus",
    alias: ["groupstatus", "gs"],
    desc: "Post media or text as a silent group status",
    category: "group",
    react: "👥",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, quoted }) => {
    try {
        const afterCmd = (args || []).join(" ").trim();
        let targetGroupJid = null;
        let inlineText = null;

        if (isGroup) {
            targetGroupJid = from;
            inlineText = afterCmd || null;
        } else {
            if (!afterCmd) {
                return reply(
`👥 *GROUP STATUS*

Reply to media and provide a group link or JID.

📌 Example:
.gstatus https://chat.whatsapp.com/xxxxx
.gstatus 120363@g.us`
                );
            }
            const parts = afterCmd.split(/\s+/);
            const input = parts[0];
            const rest = parts.slice(1).join(" ").trim();

            if (input.includes("chat.whatsapp.com")) {
                let code;
                try {
                    const url = new URL(input);
                    code = url.pathname.replace(/^\/+/, "");
                } catch {
                    code = input.split("/").pop();
                }
                try {
                    const res = await conn.groupGetInviteInfo(code);
                    targetGroupJid = res?.id || res?.groupId || res?.gid;
                    if (!targetGroupJid) throw new Error("no id");
                } catch {
                    return reply("❌ Invalid or expired group link.");
                }
            } else if (input.includes("@g.us")) {
                targetGroupJid = input.trim();
            } else {
                return reply("❌ Invalid group link or JID.");
            }
            inlineText = rest || null;
        }

        try { await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } }); } catch {}

        let caption = null;
        let sourceMsg = null;
        let mediaType = null;

        if (mek.message?.imageMessage) {
            sourceMsg = mek.message.imageMessage;
            mediaType = "image";
            caption = mek.message.imageMessage?.caption || inlineText || null;
        } else if (mek.message?.videoMessage) {
            sourceMsg = mek.message.videoMessage;
            mediaType = "video";
            caption = mek.message.videoMessage?.caption || inlineText || null;
        } else if (mek.message?.audioMessage) {
            sourceMsg = mek.message.audioMessage;
            mediaType = "audio";
        } else if (quoted) {
            const q = quoted;
            if (q.imageMessage) {
                sourceMsg = q.imageMessage;
                mediaType = "image";
                caption = q.imageMessage?.caption || inlineText || null;
            } else if (q.videoMessage) {
                sourceMsg = q.videoMessage;
                mediaType = "video";
                caption = q.videoMessage?.caption || inlineText || null;
            } else if (q.audioMessage) {
                sourceMsg = q.audioMessage;
                mediaType = "audio";
            } else if (q.conversation) {
                caption = q.conversation || inlineText || null;
            } else if (q.extendedTextMessage?.text) {
                caption = q.extendedTextMessage.text || inlineText || null;
            }
        } else {
            caption = inlineText || null;
        }

        if (!mediaType && !caption) {
            return reply("❌ Reply to an image, video, audio, or include text.");
        }

        if (mediaType === "image") {
            const buffer = await getBufferFromMedia(sourceMsg, "image");
            const obj = { image: buffer, contextInfo: statusContext("IMAGE") };
            if (caption) obj.caption = caption;
            await conn.sendMessage(targetGroupJid, obj);
        } else if (mediaType === "video") {
            const buffer = await getBufferFromMedia(sourceMsg, "video");
            const obj = { video: buffer, contextInfo: statusContext("VIDEO") };
            if (caption) obj.caption = caption;
            await conn.sendMessage(targetGroupJid, obj);
        } else if (mediaType === "audio") {
            const buffer = await getBufferFromMedia(sourceMsg, "audio");
            await conn.sendMessage(targetGroupJid, {
                audio: buffer,
                mimetype: "audio/mp4",
                contextInfo: statusContext("AUDIO")
            });
        } else {
            await conn.sendMessage(targetGroupJid, {
                text: caption,
                contextInfo: statusContext("TEXT")
            });
        }

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
        if (!isGroup) {
            await sendBranded(conn, from, mek, "✅ Status posted to group!");
        }
    } catch (error) {
        console.error("GStatus Error:", error);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
        reply(`❌ Error: ${error.message}`);
    }
});


// ═════════════════════════════════════════════════════════════
// 2. 🤖 AI COMMANDS (GPT + Meta AI only)
// ═════════════════════════════════════════════════════════════
const POLLINATIONS_KEY = config.POLLINATIONS_API_KEY || "";
const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";

// Only 2 models: GPT and Meta AI
const MODELS = {
    gpt: "openai-fast",   // GPT (fast)
    meta: "llama"         // Meta AI (Llama)
};

async function callAI(prompt, model) {
    if (!POLLINATIONS_KEY) throw new Error("POLLINATIONS_API_KEY missing in config.js");

    const { data } = await axios.post(
        POLLINATIONS_URL,
        {
            model: model,
            messages: [
                { role: "system", content: "You are a helpful WhatsApp AI assistant. Keep answers concise and friendly. Use emojis sparingly." },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${POLLINATIONS_KEY}`
            },
            timeout: 60000
        }
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from AI");
    return text.trim();
}

async function handleAI(conn, mek, from, reply, args, model, label) {
    const input = (args || []).join(" ").trim();
    if (!input) {
        return reply(`❌ Usage: .${label.toLowerCase()} <your input>`);
    }

    try { await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } }); } catch {}

    try {
        const answer = await callAI(input, model);
        await sendBranded(conn, from, mek, `🤖 *${label}*\n\n${answer}`);
        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
    } catch (e) {
        console.error(`[AI:${label}]`, e.message);
        reply(`⏳ ${e.message}\n\n_Tip: Wait a minute and try again._`);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
    }
}

// .gpt — GPT
cmd({
    pattern: "gpt",
    alias: ["ai", "chatgpt", "ask"],
    desc: "Ask GPT AI anything",
    category: "AI",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, MODELS.gpt, "GPT");
});

// .meta — Meta AI (Llama)
cmd({
    pattern: "meta",
    alias: ["metaai", "llama", "llama4"],
    desc: "Ask Meta AI (Llama) anything",
    category: "AI",
    react: "🦙",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, MODELS.meta, "META AI");
});




// ═════════════════════════════════════════════════════════════
// 3. 👁️ VIEW ONCE SAVER (.vv)
// ═════════════════════════════════════════════════════════════
function unwrapViewOnce(input) {
    if (!input) return null;
    const message = input.message || input;
    return (
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.viewOnceMessageV2Extension?.message ||
        message
    );
}

async function downloadMedia(mediaMsg, type) {
    const stream = await downloadContentFromMessage(mediaMsg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

cmd({
    pattern: "vv",
    alias: ["viewonce", "keep"],
    desc: "Save a view-once message (reply to it)",
    category: "general",
    react: "👁️",
    filename: __filename
},
async (conn, mek, m, { from, reply, quoted }) {
    if (!quoted) {
        return reply("👁️ Reply to a view-once message you want to save");
    }

    try {
        const content = unwrapViewOnce(quoted);
        if (!content) return reply("❌ Cannot unwrap this message.");

        const type = getContentType(content);
        let msg;

        if (type === "imageMessage") {
            const buf = await downloadMedia(content.imageMessage, "image");
            msg = { image: buf, caption: content.imageMessage.caption || "" };
        } else if (type === "videoMessage") {
            const buf = await downloadMedia(content.videoMessage, "video");
            msg = { video: buf, caption: content.videoMessage.caption || "" };
        } else if (type === "audioMessage") {
            const buf = await downloadMedia(content.audioMessage, "audio");
            msg = { audio: buf, mimetype: "audio/mp4" };
        } else if (type === "stickerMessage") {
            const buf = await downloadMedia(content.stickerMessage, "sticker");
            const sticker = new Sticker(buf, {
                pack: "Njabulo",
                author: "Njabulo-Jb",
                type: StickerTypes.FULL,
                quality: 70
            });
            msg = { sticker: await sticker.toBuffer() };
        } else if (type === "conversation" || type === "extendedTextMessage") {
            msg = {
                text: content.conversation || content.extendedTextMessage?.text || ""
            };
        } else {
            return reply("❌ Unsupported message type");
        }

        await conn.sendMessage(from, msg, { quoted: mek });
        await sendBranded(conn, from, mek, "✅ Saved successfully!");
    } catch (e) {
        console.error("viewonce error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
