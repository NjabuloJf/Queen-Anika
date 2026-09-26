/**
 * gstatus.js
 * Post media or text as a silent group status.
 * cmd() handler. Queen-Anika branding.
 */

const { cmd } = require('../command');
const {
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

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

// ========== HELPER: Send branded ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Download media into buffer ==========
async function getBufferFromMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// ========== HELPER: Status context ==========
function statusContext(sourceType) {
    return {
        isGroupStatus: true,
        statusSourceType: sourceType,
        statusAttributions: [{ type: 10 }],
        statusAudienceMetadata: { audienceType: "CLOSE_FRIENDS" }
    };
}

// ═════════════════════════════════════════════════════════════
// 📸 GROUP STATUS COMMAND
// ═════════════════════════════════════════════════════════════
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
        console.log(`[GSTATUS] Triggered in ${from} | isGroup=${isGroup}`);

        const afterCmd = (args || []).join(" ").trim();
        let targetGroupJid = null;
        let inlineText = null;

        // ─── If command is used inside a group ───
        if (isGroup) {
            targetGroupJid = from;
            inlineText = afterCmd || null;
        } else {
            // ─── If used in DM, expect a group link or JID ───
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
                } catch (e) {
                    console.error("[GSTATUS] Invite link failed:", e.message);
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

        // ─── Detect media/text to post ───
        let caption = null;
        let sourceMsg = null;
        let mediaType = null;

        // Check the current message first
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
        }
        // Check the quoted/replied message
        else if (quoted) {
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

        console.log(`[GSTATUS] Posting ${mediaType || 'text'} to ${targetGroupJid}`);

        // ─── Send as group status ───
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

        // Only send confirmation if used in DM (keeps groups clean)
        if (!isGroup) {
            await sendBranded(conn, from, mek, "✅ Status posted to group!");
        }

    } catch (error) {
        console.error("[GSTATUS] Error:", error);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
        reply(`❌ Error: ${error.message}`);
    }
});