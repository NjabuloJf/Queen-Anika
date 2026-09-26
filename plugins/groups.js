/**
 * groups.js
 * Group management: lock, unlock, promote, demote, remove
 * BULLETPROOF admin check — handles LID, device suffixes, everything.
 */

const { cmd } = require('../command');
const config = require("../config");

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
        mentions: mentions,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Extract JID safely ==========
function extractJid(user) {
    if (!user) return null;
    if (typeof user === 'string') return user;
    if (typeof user === 'object') return user.id || user.jid || user.phoneNumber || null;
    return null;
}

// ========== HELPER: Just the number part ==========
function numOf(jid) {
    if (!jid) return null;
    return String(jid).split('@')[0].split(':')[0];
}

// ========== BULLETPROOF: Is the bot an admin? ==========
async function checkBotAdmin(conn, groupJid) {
    try {
        const metadata = await conn.groupMetadata(groupJid);
        if (!metadata || !metadata.participants) return false;

        // Collect ALL possible identifiers for the bot
        const botIds = new Set();
        if (conn.user?.id) botIds.add(numOf(conn.user.id));
        if (conn.user?.lid) botIds.add(numOf(conn.user.lid));
        // Sometimes the bot's JID is in creds.me
        if (conn.authState?.creds?.me?.id) botIds.add(numOf(conn.authState.creds.me.id));
        if (conn.authState?.creds?.me?.lid) botIds.add(numOf(conn.authState.creds.me.lid));

        console.log('[BOT-ADMIN CHECK] Bot identifiers:', [...botIds]);

        for (const p of metadata.participants) {
            const pIdNum = numOf(p.id);
            const pLidNum = numOf(p.lid);

            const isBot = botIds.has(pIdNum) || botIds.has(pLidNum);
            if (!isBot) continue;

            const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
            console.log(`[BOT-ADMIN CHECK] Found bot as participant — admin=${p.admin}, isAdmin=${isAdmin}`);
            return isAdmin;
        }

        console.log('[BOT-ADMIN CHECK] Bot not found in participants list');
        return false;
    } catch (e) {
        console.error('[BOT-ADMIN CHECK] Error:', e.message);
        return false;
    }
}

// ========== HELPER: Get target user ==========
function getTargetJid(quoted, mek, m) {
    if (quoted) {
        return quoted.sender || quoted.participant || quoted.key?.participant;
    }
    const ci = mek.message?.extendedTextMessage?.contextInfo;
    if (ci?.mentionedJid && ci.mentionedJid.length > 0) return ci.mentionedJid[0];
    if (m.mentionedJid && m.mentionedJid.length > 0) return m.mentionedJid[0];
    return null;
}

function isBotItself(conn, jid) {
    if (!jid) return false;
    const targetNum = numOf(jid);
    const botNum = numOf(conn.user?.id);
    const botLid = numOf(conn.user?.lid);
    return targetNum === botNum || targetNum === botLid;
}

function isSender(sender, jid) {
    return jid && sender && numOf(sender) === numOf(jid);
}

// ========== HELPER: Bot needs admin message ==========
function botNeedsAdminMsg(conn) {
    return `🚫 I need to be an admin to do this.

👉 Make me admin first!
My number: +${numOf(conn.user?.id) || 'unknown'}

📌 Steps:
1. Open group info
2. Tap "Members"
3. Find me: +${numOf(conn.user?.id) || 'unknown'}
4. Tap "Make group admin"

⚠️ If I already look like admin, try restarting the bot.`;
}

// ═════════════════════════════════════════════════════════════
// 🔒 LOCK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "lock",
    alias: ["lockgroup", "close"],
    desc: "Lock group — only admins can send",
    category: "group",
    react: "🔒",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const botIsAdmin = await checkBotAdmin(conn, from);
        if (!botIsAdmin) return reply(botNeedsAdminMsg(conn));

        await conn.groupSettingUpdate(from, 'announcement');
        await sendBranded(conn, from, mek, "🔒 *GROUP LOCKED*\n\n✅ Only admins can send messages now.");
    } catch (e) {
        console.error('[LOCK]', e.message);
        reply(`❌ Failed to lock group: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 🔓 UNLOCK
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "unlock",
    alias: ["unlockgroup", "open"],
    desc: "Unlock group — everyone can send",
    category: "group",
    react: "🔓",
    filename: __filename
},
async (conn, mek, m, { from, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const botIsAdmin = await checkBotAdmin(conn, from);
        if (!botIsAdmin) return reply(botNeedsAdminMsg(conn));

        await conn.groupSettingUpdate(from, 'not_announcement');
        await sendBranded(conn, from, mek, "🔓 *GROUP UNLOCKED*\n\n✅ Everyone can send messages now.");
    } catch (e) {
        console.error('[UNLOCK]', e.message);
        reply(`❌ Failed to unlock group: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 👑 PROMOTE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "promote",
    alias: ["makeadmin", "admin"],
    desc: "Promote a user to admin",
    category: "group",
    react: "👑",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const botIsAdmin = await checkBotAdmin(conn, from);
        if (!botIsAdmin) return reply(botNeedsAdminMsg(conn));

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the user to promote.");
        if (isBotItself(conn, target)) return reply("❌ I can't promote myself.");
        if (isSender(sender, target)) return reply("❌ You can't promote yourself.");

        await conn.groupParticipantsUpdate(from, [target], 'promote');
        await sendBranded(conn, from, mek,
            `👑 *PROMOTED*\n\n✅ @${numOf(target)} is now an admin.`,
            [target]
        );
    } catch (e) {
        console.error('[PROMOTE]', e.message);
        reply(`❌ Failed to promote: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 📉 DEMOTE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "demote",
    alias: ["removeadmin", "unadmin"],
    desc: "Demote an admin",
    category: "group",
    react: "📉",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const botIsAdmin = await checkBotAdmin(conn, from);
        if (!botIsAdmin) return reply(botNeedsAdminMsg(conn));

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the admin to demote.");
        if (isBotItself(conn, target)) return reply("❌ I can't demote myself.");
        if (isSender(sender, target)) return reply("❌ You can't demote yourself.");

        await conn.groupParticipantsUpdate(from, [target], 'demote');
        await sendBranded(conn, from, mek,
            `📉 *DEMOTED*\n\n✅ @${numOf(target)} is no longer an admin.`,
            [target]
        );
    } catch (e) {
        console.error('[DEMOTE]', e.message);
        reply(`❌ Failed to demote: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 👢 REMOVE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "remove",
    alias: ["kick", "ban"],
    desc: "Remove a user from the group",
    category: "group",
    react: "👢",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner, quoted }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const botIsAdmin = await checkBotAdmin(conn, from);
        if (!botIsAdmin) return reply(botNeedsAdminMsg(conn));

        const target = getTargetJid(quoted, mek, m);
        if (!target) return reply("❌ Please reply to a message or mention the user to remove.");
        if (isBotItself(conn, target)) return reply("❌ I can't remove myself.");
        if (isSender(sender, target)) return reply("❌ You can't remove yourself.");

        // Prevent removing admins unless you're the owner
        try {
            const meta = await conn.groupMetadata(from);
            const found = meta.participants?.find(p =>
                numOf(p.id) === numOf(target) || numOf(p.lid) === numOf(target)
            );
            if (found && (found.admin === 'admin' || found.admin === 'superadmin') && !isOwner) {
                return reply("❌ Cannot remove another admin. Only the group creator can.");
            }
        } catch {}

        await conn.groupParticipantsUpdate(from, [target], 'remove');
        await sendBranded(conn, from, mek,
            `👢 *REMOVED*\n\n✅ @${numOf(target)} has been removed from the group.`,
            [target]
        );
    } catch (e) {
        console.error('[REMOVE]', e.message);
        reply(`❌ Failed to remove user: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 📋 HELP
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "grouphelp",
    alias: ["ghelp", "groupmenu"],
    desc: "Show group management commands",
    category: "group",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    const menu =
`📋 *GROUP MANAGEMENT*

*🔒 Lock/Unlock*
• .lock — Only admins can send
• .unlock — Everyone can send

*👑 Promote/Demote*
• .promote — Make user admin
• .demote — Remove admin

*👢 Remove*
• .remove — Kick from group

*📌 Usage:*
• Reply to the user's message, OR
• Mention them: .promote @user`;

    await sendBranded(conn, from, mek, menu);
});