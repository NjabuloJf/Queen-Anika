/**
 * ai.js
 * AI commands: .ai, .gpt, .meta
 * Uses fallback API chain (Mistral + Llama workers).
 * cmd() handler. No fancy font. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require('axios');

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
            thumbnailUrl: BRAND_IMAGE,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
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

// ═════════════════════════════════════════════════════════════
// 🤖 AI APIS (fallback chain)
// ═════════════════════════════════════════════════════════════
const AI_APIS = [
    async (q) => {
        const url = `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || data?.response || null;
    }
];

// ========== AI FETCHER WITH FALLBACK ==========
async function askAI(query) {
    for (const api of AI_APIS) {
        try {
            console.log(`[AI] Trying API...`);
            const response = await api(query);
            if (response && typeof response === 'string' && response.trim().length > 0) {
                console.log(`[AI] ✅ Success`);
                return response.trim();
            }
        } catch (error) {
            console.log(`[AI] ❌ Failed: ${error.message}`);
            continue;
        }
    }
    return "⚠️ AI service is currently unavailable. Please try again later.";
}

// ========== HANDLE AI COMMAND ==========
async function handleAI(conn, mek, from, reply, args, label) {
    const query = (args || []).join(" ").trim();

    if (!query) {
        return reply(
`❌ *Usage:* .${label.toLowerCase()} <message>

📌 Example:
.${label.toLowerCase()} What is coding?`
        );
    }

    console.log(`[${label}] Input: "${query}"`);

    try { await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } }); } catch {}
    await conn.sendPresenceUpdate('composing', from);

    try {
        let response = await askAI(query);

        // Truncate if too long
        if (response.length > 3800) {
            response = response.substring(0, 3770) + "\n\n...[truncated]";
        }

        await sendBranded(conn, from, mek, `🤖 *${label}*\n\n${response}`);

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
    } catch (error) {
        console.error(`[${label}] Error:`, error.message);
        reply("❌ Error: Could not process your request. Please try again.");
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
    }
}

// ═════════════════════════════════════════════════════════════
// 🧠 .ai COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "ai",
    alias: ["artificial", "intelligence"],
    desc: "Ask AI anything",
    category: "AI",
    react: "🧠",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, "AI");
});

// ═════════════════════════════════════════════════════════════
// 🤖 .gpt COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "gpt",
    alias: ["chatgpt", "gptai", "openai"],
    desc: "Ask GPT AI anything",
    category: "AI",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, "GPT");
});

// ═════════════════════════════════════════════════════════════
// 🦙 .meta COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "meta",
    alias: ["metaai", "llama", "ilama"],
    desc: "Ask Meta AI (Llama) anything",
    category: "AI",
    react: "🦙",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, "META AI");
});
