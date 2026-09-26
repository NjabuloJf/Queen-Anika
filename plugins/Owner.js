/**
 * owner.js
 * Commands: block, unblock, del, save (statuses)
 * Uses cmd() handler. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");
const {
    downloadContentFromMessage,
    getContentType
} = require("@whiskeysockets/baileys");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

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
async function sendBranded(conn, dest, ms, text, mentions = []) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        mentions,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Extract target JID ==========
function getTargetJid(quoted, mek, m, args) {
    if (quoted) {
        return quoted.sender || quoted.participant || quoted.key?.participant;
    }
    const ci = mek.message?.extendedTextMessage?.contextInfo;
    if (ci?.mentionedJid && ci.mentionedJid.length > 0) return ci.mentionedJid[0];
    if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0];
    if (args && args[0]) {
        let num = String(args[0]).replace(/[^0-9]/g, '');
        if (num.length >= 8) return `${num}@s.whatsapp.net`;
    }
    return null;
}

// ========== HELPER: Number from JID ==========
function numOf(jid) {
    return jid ? String(jid).split('@')[0].split(':')[0] : 'unknown';
}

// ========== HELPER: Download media into buffer ==========
async function downloadMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// ========== HELPER: Unwrap view-once ==========
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

// ═════════════════════════════════════════════════════════════
// 🚫 BLOCK COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "block",
    alias: ["banuser"],
    desc: "Block a user (reply, mention, or type number)",
    category: "owner",
    react: "🚫",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isOwner, quoted }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command!");

        const target = getTargetJid(quoted, mek, m, args);
        if (!target) {
            return reply(
`❌ *Please specify a user to block.*

📌 *Examples:*
• Reply to their message → .block
• Mention them → .block @user
• Type number → .block 26773968411`
            );
        }

        if (numOf(target) === numOf(conn.user?.id)) {
            return reply("❌ I can't block myself.");
        }

        await conn.updateBlockStatus(target, "block");

        await sendBranded(conn, from, mek,
            `🚫 *USER BLOCKED*\n\n+${numOf(target)} has been blocked.`,
            [target]
        );
    } catch (e) {
        console.error("[BLOCK] Error:", e.message);
        reply(`❌ Failed to block: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ✅ UNBLOCK COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "unblock",
    alias: ["unbanuser"],
    desc: "Unblock a user (reply, mention, or type number)",
    category: "owner",
    react: "✅",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isOwner, quoted }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command!");

        const target = getTargetJid(quoted, mek, m, args);
        if (!target) {
            return reply(
`❌ *Please specify a user to unblock.*

📌 *Examples:*
• Reply to their message → .unblock
• Mention them → .unblock @user
• Type number → .unblock 26773968411`
            );
        }

        await conn.updateBlockStatus(target, "unblock");

        await sendBranded(conn, from, mek,
            `✅ *USER UNBLOCKED*\n\n+${numOf(target)} has been unblocked.`,
            [target]
        );
    } catch (e) {
        console.error("[UNBLOCK] Error:", e.message);
        reply(`❌ Failed to unblock: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 🗑️ DEL COMMAND — works in both private chats and groups
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "del",
    alias: ["delete", "rm"],
    desc: "Delete a message (reply to it) — works in chats and groups",
    category: "owner",
    react: "🗑️",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, isAdmins, quoted }) => {
    try {
        console.log(`[DEL] Triggered in ${from} | owner=${isOwner} admin=${isAdmins}`);

        // Allow owner anywhere, and admins in groups
        if (!isOwner && !isAdmins) {
            return reply("❌ Owner or admin only command!");
        }

        if (!quoted) {
            return reply(
`🗑️ *Reply to a message to delete it.*

📌 Example:
1. Long-press the message
2. Tap Reply
3. Send: .del`
            );
        }

        // Get the message key safely
        const msgKey = quoted.key || quoted;

        // Build the delete key
        const deleteKey = {
            remoteJid: from,
            fromMe: msgKey.fromMe || false,
            id: msgKey.id,
            participant: msgKey.participant || quoted.sender || quoted.participant
        };

        console.log("[DEL] Delete key:", JSON.stringify(deleteKey));

        // Send delete request
        await conn.sendMessage(from, { delete: deleteKey });

        console.log("[DEL] ✅ Message deleted");

    } catch (e) {
        console.error("[DEL] Error:", e.message);
        reply(`❌ Failed to delete: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 💾 SAVE COMMAND — save status media (reply to a status)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "save",
    alias: ["savestatus", "keepstatus", "savestat"],
    desc: "Save a status (reply to a status with .save)",
    category: "owner",
    react: "💾",
    filename: __filename
},
async (conn, mek, m, { from, reply, isOwner, quoted }) => {
    try {
        console.log(`[SAVE] Triggered in ${from}`);

        if (!isOwner) return reply("❌ Owner only command!");

        if (!quoted) {
            return reply(
`💾 *Reply to a status to save it.*

📌 How to save a status:
1. Open WhatsApp Status
2. View the status you want to save
3. Reply to it with: .save

_Or send the status media to the bot and reply with .save_`
            );
        }

        // Unwrap view-once in case status is view-once
        const content = unwrapViewOnce(quoted);
        if (!content) return reply("❌ Cannot read this status.");

        const type = getContentType(content);
        console.log(`[SAVE] Detected type: ${type}`);

        let msg;

        if (type === "imageMessage") {
            const buf = await downloadMedia(content.imageMessage, "image");
            msg = {
                image: buf,
                caption: content.imageMessage.caption || ""
            };
            await conn.sendMessage(from, msg, { quoted: mek });
            await sendBranded(conn, from, mek, "💾 *STATUS SAVED!*\n\n✅ Image saved successfully.");
        } else if (type === "videoMessage") {
            const buf = await downloadMedia(content.videoMessage, "video");
            msg = {
                video: buf,
                caption: content.videoMessage.caption || ""
            };
            await conn.sendMessage(from, msg, { quoted: mek });
            await sendBranded(conn, from, mek, "💾 *STATUS SAVED!*\n\n✅ Video saved successfully.");
        } else if (type === "audioMessage") {
            const buf = await downloadMedia(content.audioMessage, "audio");
            msg = {
                audio: buf,
                mimetype: "audio/mp4"
            };
            await conn.sendMessage(from, msg, { quoted: mek });
            await sendBranded(conn, from, mek, "💾 *STATUS SAVED!*\n\n✅ Audio saved successfully.");
        } else if (type === "conversation" || type === "extendedTextMessage") {
            const text = content.conversation || content.extendedTextMessage?.text || "";
            await sendBranded(conn, from, mek, `💾 *STATUS SAVED!*\n\n📝 Text:\n${text}`);
        } else {
            return reply(`❌ Unsupported status type: ${type}`);
        }

    } catch (e) {
        console.error("[SAVE] Error:", e.message);
        reply(`❌ Failed to save: ${e.message}`);
    }
});

