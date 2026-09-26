/**
 * antilink.js
 * Anti-link system with warn/delete/remove modes.
 * Uses cmd() handler + bot's built-in admin/group flags.
 * No fancy font. Plain text only.
 */

const { cmd } = require('../command');
const config = require("../config");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png";

// ========== STORE ==========
const groupAntiLinkSettings = new Map();
const userWarnCount = new Map();

function getGroupAntiLinkSetting(groupId) {
    return groupAntiLinkSettings.get(groupId) || 'off';
}
function setGroupAntiLinkSetting(groupId, status) {
    groupAntiLinkSettings.set(groupId, status);
}
function getUserWarnCount(groupId, userId) {
    return userWarnCount.get(`${groupId}_${userId}`) || 0;
}
function incrementUserWarnCount(groupId, userId) {
    const key = `${groupId}_${userId}`;
    const newCount = (userWarnCount.get(key) || 0) + 1;
    userWarnCount.set(key, newCount);
    return newCount;
}
function resetUserWarnCount(groupId, userId) {
    userWarnCount.delete(`${groupId}_${userId}`);
}

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

// ========== LINK DETECTION ==========
function containsLink(text) {
    if (!text) return false;
    const urlPatterns = [
        /(https?:\/\/[^\s]+)/gi,
        /(www\.[^\s]+)/gi,
        /(chat\.whatsapp\.com\/[^\s]+)/gi,
        /(youtu\.be\/[^\s]+)/gi,
        /(youtube\.com\/[^\s]+)/gi,
        /(t\.me\/[^\s]+)/gi,
        /(telegram\.me\/[^\s]+)/gi,
        /(bit\.ly\/[^\s]+)/gi,
        /(tinyurl\.com\/[^\s]+)/gi,
        /(wa\.me\/[^\s]+)/gi,
        /(instagram\.com\/[^\s]+)/gi,
        /(facebook\.com\/[^\s]+)/gi,
        /(twitter\.com\/[^\s]+)/gi,
        /(x\.com\/[^\s]+)/gi,
        /(tiktok\.com\/[^\s]+)/gi,
        /(discord\.gg\/[^\s]+)/gi,
        /(reddit\.com\/[^\s]+)/gi,
        /(linkedin\.com\/[^\s]+)/gi,
        /(pinterest\.com\/[^\s]+)/gi,
        /(snapchat\.com\/[^\s]+)/gi,
        /(spotify\.com\/[^\s]+)/gi,
        /(soundcloud\.com\/[^\s]+)/gi,
        /(twitch\.tv\/[^\s]+)/gi,
        /(github\.com\/[^\s]+)/gi,
    ];
    return urlPatterns.some(pattern => pattern.test(text));
}

// ========== HELPER: send branded message ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ═════════════════════════════════════════════════════════════
// ANTI-LINK WARN MODE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "antilinkwarn",
    alias: ["antilink1"],
    desc: "Enable anti-link WARN mode (3 warnings then remove)",
    category: "group",
    react: "⚠️",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        if (getGroupAntiLinkSetting(from) === 'warn') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link WARN mode is already enabled.");
        }

        setGroupAntiLinkSetting(from, 'warn');
        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`⚠️ *ANTI-LINK WARN*

✅ Anti-link WARN mode enabled.
Links will be deleted and sender will be warned.
After 3 warnings, user will be removed.`);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ANTI-LINK DELETE MODE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "antilinkdelete",
    alias: ["antilink2", "antilinkdel"],
    desc: "Enable anti-link DELETE mode",
    category: "group",
    react: "🗑️",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        if (getGroupAntiLinkSetting(from) === 'delete') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link DELETE mode is already enabled.");
        }

        setGroupAntiLinkSetting(from, 'delete');
        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`╭─「 *QUEEN-ANIKA* 」
│〕.🗑️ *ANTI-LINK DELETE*
│〕.
│〕.✅ Anti-link DELETE mode enabled.
│〕.Links will be deleted automatically.
╰─────────〔🌸〕`);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ANTI-LINK REMOVE MODE
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "antilinkremove",
    alias: ["antilink3", "antilinkkick"],
    desc: "Enable anti-link REMOVE mode (instant kick)",
    category: "group",
    react: "👢",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        if (getGroupAntiLinkSetting(from) === 'remove') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link REMOVE mode is already enabled.");
        }

        setGroupAntiLinkSetting(from, 'remove');
        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`╭─「 *QUEEN-ANIKA* 」
│〕.👢 *ANTI-LINK REMOVE*
│〕.
│〕.✅ Anti-link REMOVE mode enabled.
│〕.Links will be deleted and sender will be removed from group immediately.
╰─────────〔🌸〕`);

 
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ANTI-LINK OFF
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "antilinkoff",
    desc: "Disable anti-link",
    category: "group",
    react: "🔓",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        if (getGroupAntiLinkSetting(from) === 'off') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link is already disabled.");
        }

        setGroupAntiLinkSetting(from, 'off');
        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`╭─「 *QUEEN-ANIKA* 」
│〕.🔓 *ANTI-LINK OFF*
│〕.
│〕.✅ Anti-link has been disabled.
╰─────────〔🌸〕`);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ANTI-LINK STATUS
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "antilink",
    alias: ["antilinkstatus"],
    desc: "Show anti-link status for this group",
    category: "group",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");

        const currentSetting = getGroupAntiLinkSetting(from);
        let statusDisplay = "Disabled";
        if (currentSetting === 'warn') statusDisplay = "Warn Mode (Delete + Warn — 3 warnings then remove)";
        else if (currentSetting === 'delete') statusDisplay = "Delete Mode (Delete Only)";
        else if (currentSetting === 'remove') statusDisplay = "Remove Mode (Delete + Remove immediately)";

        let userWarns = '';
        let hasWarns = false;
        for (const [key, count] of userWarnCount) {
            if (key.startsWith(from)) {
                const userId = key.slice(from.length + 1);
                const name = userId.split('@')[0];
                userWarns += `\n👤 @${name}: ${count}/3 warnings`;
                hasWarns = true;
            }
        }

        const infoText =
`╭─「 *QUEEN-ANIKA* 」
│〕.🔗 *ANTI-LINK STATUS*
│〕.
│〕.📊 *Current Status:* ${statusDisplay}
│〕.
│〕.📌 *Commands:*
│〕. .antilinkwarn — Warn mode (3 warnings then remove)
│〕. .antilinkdelete — Delete mode
│〕. .antilinkremove — Remove mode (instant kick)
│〕. .antilinkoff — Disable anti-link
│〕. .resetwarns — Clear all warnings
${hasWarns ? `\n📊 *Warning Count:*${userWarns}` : ''}
╰─────────〔🌸〕`;

        await sendBranded(conn, from, mek, infoText);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// RESET WARNS
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "resetwarns",
    alias: ["resetwarn", "clearwarns"],
    desc: "Reset all anti-link warnings in this group",
    category: "group",
    react: "🔄",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        let count = 0;
        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) {
                userWarnCount.delete(key);
                count++;
            }
        }

        await sendBranded(conn, from, mek,
`🔄 *RESET WARNS*

✅ All warning counts have been reset. (${count} users reset)`);
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// AUTO DELETE LINKS — MESSAGE HANDLER
// ═════════════════════════════════════════════════════════════
async function handleAntiLink(message, conn) {
    try {
        const remoteJid = message.key?.remoteJid;
        if (!remoteJid || !remoteJid.endsWith('@g.us')) return;

        const setting = getGroupAntiLinkSetting(remoteJid);
        if (setting === 'off') return;

        // Extract text
        let text = '';
        if (message.message?.conversation) text = message.message.conversation;
        else if (message.message?.extendedTextMessage?.text) text = message.message.extendedTextMessage.text;
        else if (message.message?.imageMessage?.caption) text = message.message.imageMessage.caption;
        else if (message.message?.videoMessage?.caption) text = message.message.videoMessage.caption;
        else if (message.message?.documentMessage?.caption) text = message.message.documentMessage.caption;

        if (!text || !containsLink(text)) return;

        const groupMetadata = await conn.groupMetadata(remoteJid);
        const sender = message.key?.participant || message.key?.remoteJid;

        // Robust admin check (handles device suffix + LID)
        const senderNum = String(sender).split('@')[0].split(':')[0];
        const found = groupMetadata.participants?.find(p => {
            const pIdNum = (p.id || '').split('@')[0].split(':')[0];
            const pLidNum = (p.lid || '').split('@')[0].split(':')[0];
            return pIdNum === senderNum || pLidNum === senderNum;
        });
        const isAdmin = found && (found.admin === 'admin' || found.admin === 'superadmin');
        if (isAdmin) return;

        // Delete the message
        await conn.sendMessage(remoteJid, {
            delete: {
                remoteJid,
                fromMe: false,
                id: message.key.id,
                participant: message.key.participant
            }
        });

        if (setting === 'warn') {
            const warnCount = incrementUserWarnCount(remoteJid, sender);
            await conn.sendMessage(remoteJid, {
                text: `⚠️ Links are not allowed in this group. Your message has been deleted. Warning ${warnCount}/3. After 3 warnings, you will be removed.`,
                mentions: [sender]
            });

            if (warnCount >= 3) {
                try {
                    await conn.groupParticipantsUpdate(remoteJid, [sender], "remove");
                    await conn.sendMessage(remoteJid, {
                        text: "🚫 User has been removed for sending links after 3 warnings.",
                        mentions: [sender]
                    });
                    resetUserWarnCount(remoteJid, sender);
                } catch (e) {
                    console.error('[ANTI-LINK] Failed to remove user:', e);
                    await conn.sendMessage(remoteJid, {
                        text: "⚠️ Failed to remove user after 3 warnings. Please remove manually.",
                        mentions: [sender]
                    });
                }
            }
        } else if (setting === 'delete') {
            // silently deleted
        } else if (setting === 'remove') {
            try {
                await conn.groupParticipantsUpdate(remoteJid, [sender], "remove");
                await conn.sendMessage(remoteJid, {
                    text: "⚠️ Links are not allowed in this group. You have been removed for sending a link.",
                    mentions: [sender]
                });
            } catch (e) {
                console.error('[ANTI-LINK] Failed to remove user:', e);
                await conn.sendMessage(remoteJid, {
                    text: "⚠️ Links are not allowed. Failed to remove user, but message deleted.",
                    mentions: [sender]
                });
            }
        }
    } catch (error) {
        console.error('[ANTI-LINK] Error:', error);
    }
}

// ========== EXPORTS ==========
module.exports = {
    handleAntiLink,
    getGroupAntiLinkSetting,
    setGroupAntiLinkSetting,
    containsLink,
    groupAntiLinkSettings,
    userWarnCount,
    getUserWarnCount,
    incrementUserWarnCount,
    resetUserWarnCount
};
