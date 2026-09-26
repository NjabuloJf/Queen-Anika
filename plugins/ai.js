/**
 * ai.js — AI (GPT + Meta AI) + gstatus + vv
 * No API key needed — uses free Pollinations endpoint.
 * Debug logs included so we can see what's happening.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require("axios");
const {
    downloadContentFromMessage,
    getContentType
} = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

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

async function sendBranded(conn, dest, ms, text, mentions = []) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        mentions,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ═════════════════════════════════════════════════════════════
//   🤖 AI — GPT + Meta AI (FREE, no API key needed)
// ═════════════════════════════════════════════════════════════

// Pollinations free endpoints (no key required)
const POLLINATIONS_TEXT_URL = "https://text.pollinations.ai";

async function callAI(prompt, model = "openai") {
    console.log(`[AI] Calling ${model} with prompt: "${prompt.substring(0, 60)}..."`);

    // Method 1: POST to OpenAI-compatible endpoint (no key needed for free tier)
    try {
        const { data } = await axios.post(
            "https://text.pollinations.ai/openai",
            {
                model: model,
                messages: [
                    { role: "system", content: "You are a helpful WhatsApp assistant. Keep answers short and friendly." },
                    { role: "user", content: prompt }
                ]
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 45000
            }
        );

        const text = data?.choices?.[0]?.message?.content;
        if (text) {
            console.log(`[AI] ✅ Success via POST`);
            return text.trim();
        }
    } catch (e) {
        console.log(`[AI] POST failed: ${e.message}`);
    }

    // Method 2: Simple GET fallback
    try {
        const url = `${POLLINATIONS_TEXT_URL}/${encodeURIComponent(prompt)}?model=${model}`;
        const { data } = await axios.get(url, { timeout: 45000 });

        if (typeof data === 'string' && data.trim()) {
            console.log(`[AI] ✅ Success via GET`);
            return data.trim();
        }
        if (data?.content) return data.content;
        if (data?.text) return data.text;
    } catch (e) {
        console.log(`[AI] GET failed: ${e.message}`);
    }

    throw new Error("AI is not responding. Please try again in a moment.");
}

async function handleAI(conn, mek, from, reply, args, model, label) {
    const input = (args || []).join(" ").trim();
    console.log(`[${label}] Input: "${input}"`);

    if (!input) {
        return reply(`❌ Usage: .${label.toLowerCase()} <your question>\n\nExample: .${label.toLowerCase()} what is coding?`);
    }

    try { await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } }); } catch {}

    try {
        const answer = await callAI(input, model);
        await sendBranded(conn, from, mek, `🤖 *${label}*\n\n${answer}`);
        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
    } catch (e) {
        console.error(`[${label}] Error:`, e.message);
        reply(`❌ ${e.message}`);
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
    await handleAI(conn, mek, from, reply, args, "openai", "GPT");
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
async (conn, mek, from2, ctx) => {
    await handleAI(conn, mek, ctx.from, ctx.reply, ctx.args, "llama", "META AI");
});

// .aihelp
cmd({
    pattern: "aihelp",
    alias: ["aimenu", "aicommands"],
    desc: "AI help menu",
    category: "AI",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    const menu =
`🤖 *AI COMMANDS*

• .gpt <question> — Ask GPT
• .meta <question> — Ask Meta AI (Llama)

*Examples:*
• .gpt what is JavaScript
• .meta tell me a joke
• .ai hello (uses GPT)`;

    await sendBranded(conn, from, mek, menu);
});

// ═════════════════════════════════════════════════════════════
//   📸 GROUP STATUS (.gstatus)
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
        console.log(`[GSTATUS] Triggered in ${from}, isGroup=${isGroup}`);

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

        // Check own message
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
            if (quoted.imageMessage) {
                sourceMsg = quoted.imageMessage;
                mediaType = "image";
                caption = quoted.imageMessage?.caption || inlineText || null;
            } else if (quoted.videoMessage) {
                sourceMsg = quoted.videoMessage;
                mediaType = "video";
                caption = quoted.videoMessage?.caption || inlineText || null;
            } else if (quoted.audioMessage) {
                sourceMsg = quoted.audioMessage;
                mediaType = "audio";
            } else if (quoted.conversation) {
                caption = quoted.conversation || inlineText || null;
            } else if (quoted.extendedTextMessage?.text) {
                caption = quoted.extendedTextMessage.text || inlineText || null;
            }
        } else {
            caption = inlineText || null;
        }

        if (!mediaType && !caption) {
            return reply("❌ Reply to an image, video, audio, or include text.");
        }

        console.log(`[GSTATUS] Type: ${mediaType || 'text'}, Target: ${targetGroupJid}`);

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
//   👁️ VIEW ONCE SAVER (.vv)
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
async (conn, mek, m, { from, reply, quoted }) => {
    console.log(`[VV] Triggered. quoted=${quoted ? 'yes' : 'no'}`);

    if (!quoted) {
        return reply("👁️ Reply to a view-once message you want to save");
    }

    try {
        const content = unwrapViewOnce(quoted);
        if (!content) return reply("❌ Cannot unwrap this message.");

        const type = getContentType(content);
        console.log(`[VV] Detected type: ${type}`);

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