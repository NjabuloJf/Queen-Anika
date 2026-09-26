/**
 * tagall.js
 * Tag all members in a group.
 * Uses cmd() handler. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");

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
        },
        externalAdReply: {
            title: "Queen-Anika",
            body: "Powered by Njabulo Jb",
            thumbnailUrl: "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png",
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
        }
    };
}

// ========== HELPER: Number from JID ==========
function numOf(jid) {
    return jid ? String(jid).split('@')[0].split(':')[0] : '';
}

// ═════════════════════════════════════════════════════════════
// 📢 TAGALL COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "tagall",
    alias: ["mentionall", "everyone", "all"],
    desc: "Tag all members in the group",
    category: "group",
    react: "📢",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, isAdmins, isOwner, sender, pushname, groupMetadata }) => {
    try {
        // ─── Group only ───
        if (!isGroup) return reply("🚫 This command is for group use only.");

        // ─── Must be admin or owner ───
        if (!isAdmins && !isOwner) {
            return reply("🚫 Only group admins can use this command.");
        }

        // ─── Get the group metadata ───
        const metadata = groupMetadata || await conn.groupMetadata(from);
        if (!metadata || !metadata.participants) {
            return reply("❌ Could not fetch group members.");
        }

        const participants = metadata.participants;
        const groupName = metadata.subject || "Group";
        const totalMembers = participants.length;

        // ─── Get the custom message from args ───
        const customMessage = (args || []).join(" ").trim();
        const message = customMessage || "Attention everyone! 📢";

        // ─── Build the mentions array ───
        const mentions = participants.map(p => p.id).filter(Boolean);

        // ─── Build the tag list ───
        let tagList = "";
        participants.forEach((p, i) => {
            tagList += `${i + 1}. @${numOf(p.id)}\n`;
        });

        // ─── Build the final caption ───
        const caption =
`📢 *TAG ALL*

📌 *Group:* ${groupName}
👥 *Members:* ${totalMembers}
👤 *By:* ${pushname || "Admin"}

━━━━━━━━━━━━━━━━━
💬 *Message:*
${message}
━━━━━━━━━━━━━━━━━

${tagList}`;

        // ─── Send with mentions ───
        await conn.sendMessage(from, {
            text: caption,
            mentions,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}

    } catch (e) {
        console.error("[TAGALL] Error:", e.message);
        reply(`❌ Failed to tag all: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 🚫 HIDDEN TAG COMMAND (tags without showing the list)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "hidetag",
    alias: ["htag", "hmention"],
    desc: "Tag all members without showing the list",
    category: "group",
    react: "🤫",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, isAdmins, isOwner, groupMetadata }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const metadata = groupMetadata || await conn.groupMetadata(from);
        if (!metadata || !metadata.participants) {
            return reply("❌ Could not fetch group members.");
        }

        const customMessage = (args || []).join(" ").trim();
        if (!customMessage) {
            return reply("❌ Please provide a message to send.\n\n📌 Example: .hidetag Hello everyone");
        }

        const mentions = metadata.participants.map(p => p.id).filter(Boolean);

        await conn.sendMessage(from, {
            text: customMessage,
            mentions,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}

    } catch (e) {
        console.error("[HIDETAG] Error:", e.message);
        reply(`❌ Failed: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 👤 TAG ONE USER
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "tag",
    alias: ["mention", "at"],
    desc: "Tag a single user",
    category: "group",
    react: "👤",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");

        // Get target from reply, mention, or number
        let target = null;
        if (quoted) {
            target = quoted.sender || quoted.participant;
        }
        const ci = mek.message?.extendedTextMessage?.contextInfo;
        if (!target && ci?.mentionedJid?.length > 0) target = ci.mentionedJid[0];
        if (!target && m.mentionedJid?.length > 0) target = m.mentionedJid[0];
        if (!target && args?.[0]) {
            const num = String(args[0]).replace(/[^0-9]/g, '');
            if (num.length >= 8) target = `${num}@s.whatsapp.net`;
        }

        if (!target) {
            return reply(
`❌ *Specify a user to tag.*

📌 *Examples:*
• Reply to their message → .tag
• Mention them → .tag @user
• Type number → .tag 26773968411`
            );
        }

        const message = args.slice(1).join(" ").trim() || "Hey! 👋";

        await conn.sendMessage(from, {
            text: `👤 @${numOf(target)}\n\n${message}`,
            mentions: [target],
            contextInfo: ctxInfo()
        }, { quoted: mek });

    } catch (e) {
        console.error("[TAG] Error:", e.message);
        reply(`❌ Failed to tag: ${e.message}`);
    }
}); 
