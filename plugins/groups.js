/**
 * groups.js
 * Group management commands: lock, unlock, promote, demote, remove (kick)
 * Uses cmd() handler. No fancy font. Queen-Anika branding.
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
            newsletterJid: '1203634129500689311@newsletter',
            newsletterName: 'Queen-Anika'
        }
    };
}

// ========== HELPER: Send branded message ==========
async function sendBranded(conn, dest, ms, text, mentions = []) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        mentions: mentions,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Extract Target User JID ==========
function getTargetJid(quoted, mek, m) {
    // 1. Check if replying to a message
    if (quoted) {
        return quoted.sender || quoted.participant || quoted.key?.participant;
    }

    // 2. Check for mentions in the message context
    const contextInfo = mek.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
        return contextInfo.mentionedJid[0];
    }

    // 3. Check the direct mentions array passed by the bot
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        return m.mentionedJid[0];
    }

    return null;
}

// ========== HELPER: Check if target is the bot ==========
function isBot(conn, jid) {
    if (!jid) return false;
    const botNum = conn.user?.id?.split(':')[0];
    const targetNum = String(jid).split('@')[0].split(':')[0];
    return botNum === targetNum;
}

// ========== HELPER: Check if target is the sender ==========
function isSender(sender, jid) {
    if (!jid || !sender) return false;
    const senderNum = String(sender).split('@')[0].split(':')[0];
    const targetNum = String(jid).split('@')[0].split(':')[0];
    return senderNum === targetNum;
}

// ═════════════════════════════════════════════════════════════
// 🔒 LOCK COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "lock",
    alias: ["lockgroup", "close"],
    desc: "Lock the group (only admins can send messages)",
    category: "group",
    react: "🔒",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, isAdmins, isBotAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");
        if (!isBotAdmins) return reply("🚫 I need to be an admin to lock the group.");

        await conn.groupSettingUpdate(from, 'announcement');
        await sendBranded(conn, from, mek, "🔒 *GROUP LOCKED*\n\n✅ Only admins can send messages now.");
    } catch (e) {
        console.error('[LOCK]', e.message);
        reply(`❌ Failed to lock group: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 🔓 UNLOCK COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "unlock",
    alias: ["unlockgroup", "open"],
    desc: "Unlock the group (everyone can send messages)",
    category: "group",
    react: "🔓",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, isAdmins, isBotAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");
        if (!isBotAdmins) return reply("🚫 I need to be an admin to unlock the group.");

        await conn.groupSettingUpdate(from, 'not_announcement');
        await sendBranded(conn, from, mek, "🔓 *GROUP UNLOCKED*\n\n✅ Everyone can send messages now.");
    } catch (e) {
        console.error('[UNLOCK]', e.message);
        reply(`❌ Failed to unlock group: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 👑 PROMOTE COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "promote",
    alias: ["makeadmin", "admin"],
    desc: "Promote a user to admin (reply to or mention them)",
    category: "group",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isBotAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");
        if (!isBotAdmins) return reply("🚫 I need to be an admin to promote users.");

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the user to promote.");

        if (isBot(conn, target)) return reply("❌ I can't promote myself.");
        if (isSender(sender, target)) return reply("❌ You can't promote yourself.");

        await conn.groupParticipantsUpdate(from, [target], 'promote');
        await sendBranded(conn, from, mek,
            `👑 *PROMOTED*\n\n✅ @${target.split('@')[0]} is now an admin.`,
            [target]
        );
    } catch (e) {
        console.error('[PROMOTE]', e.message);
        reply(`❌ Failed to promote user: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 📉 DEMOTE COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "demote",
    alias: ["removeadmin", "unadmin"],
    desc: "Demote an admin (reply to or mention them)",
    category: "group",
    react: "📉",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isBotAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");
        if (!isBotAdmins) return reply("🚫 I need to be an admin to demote users.");

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the admin to demote.");

        if (isBot(conn, target)) return reply("❌ I can't demote myself.");
        if (isSender(sender, target)) return reply("❌ You can't demote yourself.");

        await conn.groupParticipantsUpdate(from, [target], 'demote');
        await sendBranded(conn, from, mek,
            `📉 *DEMOTED*\n\n✅ @${target.split('@')[0]} is no longer an admin.`,
            [target]
        );
    } catch (e) {
        console.error('[DEMOTE]', e.message);
        reply(`❌ Failed to demote user: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 👢 REMOVE COMMAND (KICK)
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "remove",
    alias: ["kick", "ban"],
    desc: "Remove a user from the group (reply to or mention them)",
    category: "group",
    react: "👢",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isBotAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");
        if (!isBotAdmins) return reply("🚫 I need to be an admin to remove users.");

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the user to remove.");

        if (isBot(conn, target)) return reply("❌ I can't remove myself.");
        if (isSender(sender, target)) return reply("❌ You can't remove yourself.");

        // Optional: prevent removing other admins (only owner/superadmin can do that in WhatsApp)
        // if target is admin, the API call will fail anyway, but we can give a nicer message.
        try {
            const groupMetadata = await conn.groupMetadata(from);
            const found = groupMetadata.participants?.find(p => {
                const pIdNum = (p.id || '').split('@')[0].split(':')[0];
                const targetNum = String(target).split('@')[0].split(':')[0];
                return pIdNum === targetNum;
            });
            if (found && (found.admin === 'admin' || found.admin === 'superadmin') && !isOwner) {
                return reply("❌ Cannot remove another admin. Only the group creator can.");
            }
        } catch { /* ignore metadata errors, try the kick anyway */ }

        await conn.groupParticipantsUpdate(from, [target], 'remove');
        await sendBranded(conn, from, mek,
            `👢 *REMOVED*\n\n✅ @${target.split('@')[0]} has been removed from the group.`,
            [target]
        );
    } catch (e) {
        console.error('[REMOVE]', e.message);
        reply(`❌ Failed to remove user: ${e.message}`);
    }
});

