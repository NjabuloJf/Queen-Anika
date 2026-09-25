/**
 * welcome.js
 * Group welcome + goodbye system.
 * Commands to enable/disable and customize messages.
 * No fancy font. Plain text. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

// ========== SETTINGS STORE ==========
// Structure: groupSettings.set(groupJid, { welcome: {on, message}, goodbye: {on, message} })
const groupSettings = new Map();

function getSettings(groupId) {
    if (!groupSettings.has(groupId)) {
        groupSettings.set(groupId, {
            welcome: {
                on: false,
                message: "👋 Welcome {user} to *{group}*!\n\nYou are member #{count}. Enjoy your stay! 🩷"
            },
            goodbye: {
                on: false,
                message: "👋 Goodbye {user}!\n\nWe hope to see you again in *{group}*. 🩷"
            }
        });
    }
    return groupSettings.get(groupId);
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

// ========== HELPER: send branded message ==========
async function sendBranded(conn, dest, ms, text) {
    await conn.sendMessage(dest, {
        image: { url: BRAND_IMAGE },
        caption: text,
        contextInfo: ctxInfo()
    }, { quoted: ms });
}

// ========== HELPER: replace placeholders ==========
function fillTemplate(template, vars) {
    return template
        .replace(/{user}/g, vars.user)
        .replace(/{group}/g, vars.group)
        .replace(/{count}/g, vars.count)
        .replace(/{time}/g, vars.time);
}

// ═════════════════════════════════════════════════════════════
// .welcome — toggle / set / status
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "welcome",
    desc: "Toggle welcome messages or set custom text",
    category: "group",
    react: "👋",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const settings = getSettings(from);
        const action = (args[0] || '').toLowerCase();

        // .welcome on
        if (action === 'on') {
            settings.welcome.on = true;
            return sendBranded(conn, from, mek,
`👋 *WELCOME ENABLED*

✅ Welcome messages are now ON for this group.

*Current message:*
${settings.welcome.message}

_Use .setwelcome <text> to change it._`);
        }

        // .welcome off
        if (action === 'off') {
            settings.welcome.on = false;
            return sendBranded(conn, from, mek,
`👋 *WELCOME DISABLED*

✅ Welcome messages are now OFF for this group.`);
        }

        // .setwelcome <text>  (also .welcome set <text>)
        const setText = action === 'set' ? args.slice(1).join(' ') : args.slice(1).join(' ');
        if (action === 'set' || args[0]) {
            if (!setText) {
                return reply(
`📝 *Please provide the welcome message!*

*Placeholders you can use:*
{user} — mentions the new member
{group} — group name
{count} — new member count
{time} — current time

📌 Example:
.welcome set Welcome {user} to {group}! 🩷`
                );
            }
            settings.welcome.message = setText;
            return sendBranded(conn, from, mek,
`✅ *Welcome message updated!*

*Preview:*
${settings.welcome.message}`);
        }

        // .welcome  → show status
        return sendBranded(conn, from, mek,
`👋 *WELCOME STATUS*

📊 *Status:* ${settings.welcome.on ? '✅ ON' : '❌ OFF'}

📝 *Message:*
${settings.welcome.message}

📌 *Commands:*
│ .welcome on — enable
│ .welcome off — disable
│ .welcome set <text> — set message`);
    } catch (e) {
        console.error('[WELCOME] Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// .goodbye — toggle / set / status
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "goodbye",
    alias: ["bye"],
    desc: "Toggle goodbye messages or set custom text",
    category: "group",
    react: "👋",
    filename: __filename
},
async (conn, mek, m, { from, reply, args, isGroup, isAdmins, isOwner }) => {
    try {
        if (!isGroup) return reply("🚫 This command is for group use only.");
        if (!isAdmins && !isOwner) return reply("🚫 Only group admins can use this command.");

        const settings = getSettings(from);
        const action = (args[0] || '').toLowerCase();

        // .goodbye on
        if (action === 'on') {
            settings.goodbye.on = true;
            return sendBranded(conn, from, mek,
`👋 *GOODBYE ENABLED*

✅ Goodbye messages are now ON for this group.

*Current message:*
${settings.goodbye.message}

_Use .setgoodbye <text> to change it._`);
        }

        // .goodbye off
        if (action === 'off') {
            settings.goodbye.on = false;
            return sendBranded(conn, from, mek,
`👋 *GOODBYE DISABLED*

✅ Goodbye messages are now OFF for this group.`);
        }

        // .goodbye set <text>
        const setText = action === 'set' ? args.slice(1).join(' ') : args.slice(1).join(' ');
        if (action === 'set' || args[0]) {
            if (!setText) {
                return reply(
`📝 *Please provide the goodbye message!*

*Placeholders you can use:*
{user} — mentions the member
{group} — group name
{time} — current time

📌 Example:
.goodbye set Goodbye {user}! 🩷`
                );
            }
            settings.goodbye.message = setText;
            return sendBranded(conn, from, mek,
`✅ *Goodbye message updated!*

*Preview:*
${settings.goodbye.message}`);
        }

        // .goodbye → show status
        return sendBranded(conn, from, mek,
`👋 *GOODBYE STATUS*

📊 *Status:* ${settings.goodbye.on ? '✅ ON' : '❌ OFF'}

📝 *Message:*
${settings.goodbye.message}

📌 *Commands:*
│ .goodbye on — enable
│ .goodbye off — disable
│ .goodbye set <text> — set message`);
    } catch (e) {
        console.error('[GOODBYE] Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// EVENT HANDLER — call this from index.js
// ═════════════════════════════════════════════════════════════
async function handleGroupParticipants(conn, event) {
    try {
        const { id: groupJid, participants, action } = event;
        if (!groupJid?.endsWith('@g.us')) return;

        const settings = getSettings(groupJid);
        const groupMetadata = await conn.groupMetadata(groupJid).catch(() => null);
        const groupName = groupMetadata?.subject || 'the group';
        const memberCount = groupMetadata?.participants?.length || 0;
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        if (action === 'add' && settings.welcome.on) {
            for (const userJid of participants) {
                const userNum = userJid.split('@')[0];
                const text = fillTemplate(settings.welcome.message, {
                    user: `@${userNum}`,
                    group: groupName,
                    count: memberCount,
                    time
                });

                try {
                    await conn.sendMessage(groupJid, {
                        image: { url: BRAND_IMAGE },
                        caption: text,
                        mentions: [userJid],
                        contextInfo: ctxInfo()
                    });
                } catch (e) {
                    console.error('[WELCOME] Failed to send:', e.message);
                }
            }
        }

        if (action === 'remove' && settings.goodbye.on) {
            for (const userJid of participants) {
                const userNum = userJid.split('@')[0];
                const text = fillTemplate(settings.goodbye.message, {
                    user: `@${userNum}`,
                    group: groupName,
                    count: memberCount,
                    time
                });

                try {
                    await conn.sendMessage(groupJid, {
                        image: { url: BRAND_IMAGE },
                        caption: text,
                        mentions: [userJid],
                        contextInfo: ctxInfo()
                    });
                } catch (e) {
                    console.error('[GOODBYE] Failed to send:', e.message);
                }
            }
        }
    } catch (err) {
        console.error('[WELCOME/GOODBYE] Handler error:', err);
    }
}

// ========== EXPORTS ==========
module.exports = {
    handleGroupParticipants,
    getSettings,
    groupSettings
};
