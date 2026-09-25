/**
 * antilink.js
 * Anti-link system with warn/delete/remove modes.
 * Uses cmd() handler. No buttons. No translation.
 * Branding image: Queen-Anika.png
 */

const { cmd } = require('../command');
const config = require("../set");
const { tiny } = require("../lib/fancy_font/fancy");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== STORE FOR GROUP SETTINGS ==========
const groupAntiLinkSettings = new Map();
const userWarnCount = new Map();

// ========== GET GROUP SETTING ==========
function getGroupAntiLinkSetting(groupId) {
    return groupAntiLinkSettings.get(groupId) || 'off';
}

// ========== SET GROUP SETTING ==========
function setGroupAntiLinkSetting(groupId, status) {
    groupAntiLinkSettings.set(groupId, status);
}

// ========== GET USER WARN COUNT ==========
function getUserWarnCount(groupId, userId) {
    const key = `${groupId}_${userId}`;
    return userWarnCount.get(key) || 0;
}

// ========== INCREMENT USER WARN COUNT ==========
function incrementUserWarnCount(groupId, userId) {
    const key = `${groupId}_${userId}`;
    const current = userWarnCount.get(key) || 0;
    const newCount = current + 1;
    userWarnCount.set(key, newCount);
    return newCount;
}

// ========== RESET USER WARN COUNT ==========
function resetUserWarnCount(groupId, userId) {
    const key = `${groupId}_${userId}`;
    userWarnCount.delete(key);
}

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

// ========== HELPER: Send branded message ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: tiny(text),
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: Check if group ==========
function isGroupJid(jid) {
    return jid && jid.endsWith('@g.us');
}

// ========== HELPER: Check if sender is admin ==========
async function isSenderAdmin(conn, groupJid, senderJid) {
    try {
        const meta = await conn.groupMetadata(groupJid);
        return meta.participants?.some(p => p.id === senderJid && p.admin);
    } catch (e) {
        return false;
    }
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));
        const admin = await isSenderAdmin(conn, from, sender);
        if (!admin) return reply(tiny("🚫 Only group admins can use this command."));

        const currentSetting = getGroupAntiLinkSetting(from);
        if (currentSetting === 'warn') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link is already enabled.");
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
        reply(tiny(`❌ Error: ${e.message}`));
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));
        const admin = await isSenderAdmin(conn, from, sender);
        if (!admin) return reply(tiny("🚫 Only group admins can use this command."));

        const currentSetting = getGroupAntiLinkSetting(from);
        if (currentSetting === 'delete') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link is already enabled.");
        }

        setGroupAntiLinkSetting(from, 'delete');

        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`🗑️ *ANTI-LINK DELETE*

✅ Anti-link DELETE mode enabled.
Links will be deleted automatically.`);
    } catch (e) {
        console.error(e);
        reply(tiny(`❌ Error: ${e.message}`));
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));
        const admin = await isSenderAdmin(conn, from, sender);
        if (!admin) return reply(tiny("🚫 Only group admins can use this command."));

        const currentSetting = getGroupAntiLinkSetting(from);
        if (currentSetting === 'remove') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link is already enabled.");
        }

        setGroupAntiLinkSetting(from, 'remove');

        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`👢 *ANTI-LINK REMOVE*

✅ Anti-link REMOVE mode enabled.
Links will be deleted and sender will be removed from group immediately.`);
    } catch (e) {
        console.error(e);
        reply(tiny(`❌ Error: ${e.message}`));
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));
        const admin = await isSenderAdmin(conn, from, sender);
        if (!admin) return reply(tiny("🚫 Only group admins can use this command."));

        const currentSetting = getGroupAntiLinkSetting(from);
        if (currentSetting === 'off') {
            return sendBranded(conn, from, mek, "⚠️ Anti-link is already disabled.");
        }

        setGroupAntiLinkSetting(from, 'off');

        for (const key of userWarnCount.keys()) {
            if (key.startsWith(from)) userWarnCount.delete(key);
        }

        await sendBranded(conn, from, mek,
`🔓 *ANTI-LINK OFF*

✅ Anti-link has been disabled.`);
    } catch (e) {
        console.error(e);
        reply(tiny(`❌ Error: ${e.message}`));
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));

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
`🔗 *ANTI-LINK STATUS*

📊 *Current Status:* ${statusDisplay}

📌 *Commands:*
│ .antilinkwarn — Warn mode (3 warnings then remove)
│ .antilinkdelete — Delete mode
│ .antilinkremove — Remove mode (instant kick)
│ .antilinkoff — Disable anti-link
│ .resetwarns — Clear all warnings
${hasWarns ? `\n📊 *Warning Count:*${userWarns}` : ''}`;

        await sendBranded(conn, from, mek, infoText);
    } catch (e) {
        console.error(e);
        reply(tiny(`❌ Error: ${e.message}`));
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
async (conn, mek, m, { from, sender, reply }) => {
    try {
        if (!isGroupJid(from)) return reply(tiny("🚫 This command is for group use only."));
        const admin = await isSenderAdmin(conn, from, sender);
        if (!admin) return reply(tiny("🚫 Only group admins can use this command."));

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
        reply(tiny(`❌ Error: ${e.message}`));
    }
});

// ═════════════════════════════════════════════════════════════
// AUTO DELETE LINKS — MESSAGE HANDLER
// ═════════════════════════════════════════════════════════════
async function handleAntiLink(message, conn) {
    try {
        const remoteJid = message.key?.remoteJid;
        if (!remoteJid) return;
        if (!remoteJid.endsWith('@g.us')) return;

        const setting = getGroupAntiLinkSetting(remoteJid);
        if (setting === 'off') return;

        // Extract text
        let text = '';
        if (message.message?.conversation) {
            text = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            text = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage?.caption) {
            text = message.message.imageMessage.caption;
        } else if (message.message?.videoMessage?.caption) {
            text = message.message.videoMessage.caption;
        } else if (message.message?.documentMessage?.caption) {
            text = message.message.documentMessage.caption;
        }

        if (!text || !containsLink(text)) return;

        // Check admin status
        const groupMetadata = await conn.groupMetadata(remoteJid);
        const sender = message.key?.participant || message.key?.remoteJid;
        const isAdmin = groupMetadata.participants?.some(p => p.id === sender && p.admin);
        if (isAdmin) return;

        // Delete the offending message
        await conn.sendMessage(remoteJid, {
            delete: {
                remoteJid: remoteJid,
                fromMe: false,
                id: message.key.id,
                participant: message.key.participant
            }
        });

        // Handle by mode
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
            // Already deleted
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

// ========== EXPORT FUNCTIONS ==========
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
