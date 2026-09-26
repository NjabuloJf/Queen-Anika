/**
 * channelreact.js
 * React to a WhatsApp channel post with a single emoji.
 * Uses cmd() handler. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require('../config');

// ========== BRANDING ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png";

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

// ========== EMOJI MAP ==========
const emojiMap = {
    heart: '❤️', love: '❤️', hearts: '❤️',
    like: '👍', thumbs: '👍', good: '👍',
    haha: '😂', laugh: '😂', happy: '😂',
    fire: '🔥', hot: '🔥',
    wow: '😮', shocked: '😮',
    party: '🎉', clap: '👏',
    star: '⭐', favorite: '⭐',
    cool: '😎', rich: '😎',
    sad: '😢', cry: '😢',
    angry: '😠', rage: '😠',
    pray: '🙏', respect: '🙏',
    money: '💰', cash: '💰',
    skull: '☠️', dead: '☠️',
    check: '✅', done: '✅',
    smile: '😊',
    kiss: '💋',
    rocket: '🚀',
    mind: '🤯',
    brain: '🧠'
};

// ========== PARSE CHANNEL LINK ==========
function parseChannelLink(link) {
    try {
        const url = new URL(link);
        const parts = url.pathname.split('/').filter(Boolean);

        if (!parts.length) return null;

        // Format: /channel/INVITECODE/MESSAGEID
        if (parts[0] === 'channel' && parts.length >= 3) {
            return {
                inviteCode: parts[1],
                messageId: Number(parts[2])
            };
        }

        // Fallback: last two segments
        const messageId = Number(parts[parts.length - 1]);
        const inviteCode = parts[parts.length - 2];

        if (!inviteCode || !Number.isFinite(messageId)) return null;

        return { inviteCode, messageId };
    } catch {
        return null;
    }
}

// ========== NORMALIZE EMOJI ==========
function normalizeEmoji(input) {
    if (!input) return '❤️';
    const text = String(input).trim().toLowerCase();
    if (emojiMap[text]) return emojiMap[text];
    // If it's a raw emoji, use it directly
    return input.trim() || '❤️';
}

// ========== RESOLVE CHANNEL JID FROM INVITE CODE ==========
async function resolveChannelJid(conn, inviteCode) {
    try {
        // Try the newsletterMetadata method
        if (typeof conn.newsletterMetadata === 'function') {
            const meta = await conn.newsletterMetadata("invite", inviteCode);
            const jid = meta?.id || meta?.jid;
            if (jid) return jid;
        }
    } catch (e) {
        console.log('[REACT] newsletterMetadata failed:', e.message);
    }

    // Fallback: assume inviteCode IS the JID (some channels use this)
    if (inviteCode.includes('@newsletter')) return inviteCode;
    return `${inviteCode}@newsletter`;
}

// ═════════════════════════════════════════════════════════════
// 💬 CHANNEL REACT COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "channelreact",
    alias: ["creact", "channel-react", "react"],
    react: "💬",
    desc: "React to a WhatsApp channel post with an emoji",
    category: "channel",
    filename: __filename
},
async (conn, mek, m, { from, q, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command");

        if (!q) {
            return reply(
`💬 *CHANNEL REACT*

📌 Usage:
.react <channel-link> <emoji>

*Examples:*
.react https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u/123 ❤️
.react https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u/123 heart
.react https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u/123 fire`
            );
        }

        const parts = q.trim().split(/\s+/);
        const link = parts[0];
        const emojiInput = parts[1] || 'heart';

        const parsedLink = parseChannelLink(link);
        if (!parsedLink) {
            return reply("❌ Invalid channel link format.\n\nExample:\nhttps://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u/123");
        }

        const selectedEmoji = normalizeEmoji(emojiInput);

        console.log(`[REACT] Invite: ${parsedLink.inviteCode}, Msg: ${parsedLink.messageId}, Emoji: ${selectedEmoji}`);

        // Resolve the real channel JID
        const channelJid = await resolveChannelJid(conn, parsedLink.inviteCode);
        console.log(`[REACT] Resolved JID: ${channelJid}`);

        // Build the reaction key
        const reactKey = {
            remoteJid: channelJid,
            fromMe: false,
            id: String(parsedLink.messageId),
            participant: channelJid
        };

        // Send the reaction
        await conn.sendMessage(channelJid, {
            react: {
                text: selectedEmoji,
                key: reactKey
            }
        });

        console.log(`[REACT] ✅ Reaction sent`);

        // Confirm to user
        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption:
`✅ *REACTION SENT*

📢 *Channel:* ${parsedLink.inviteCode}
💬 *Post ID:* ${parsedLink.messageId}
${selectedEmoji} *Emoji:* ${selectedEmoji}

_Powered by Queen-Anika 🩷_`,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}

    } catch (error) {
        console.error('[REACT] Error:', error);
        return reply(`❌ Failed: ${error.message}`);
    }
});
