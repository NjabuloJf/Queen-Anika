/**
 * ai.js
 * AI commands: .gpt and .meta
 * Uses Google Gemini API.
 * No fancy font. Queen-Anika branding.
 */

const { cmd } = require('../command');
const config = require("../config");
const axios = require("axios");

// ========== API KEY ==========
// Priority: config.GEMINI_API_KEY > hardcoded fallback
const GEMINI_API_KEY = config.GEMINI_API_KEY || "AQ.Ab8RN6LZnH1ERKPmzvY9jjPtHdULEniFFC3C2Hdmz9y4Fsg86Q";

// ========== BRANDING IMAGE ==========
const BRAND_IMAGE = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png";

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

// ========== GEMINI MODELS (fallback chain) ==========
const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash"
];

// ========== CALL GEMINI ==========
async function callGemini(prompt, modelIndex = 0) {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing");
    }

    const model = GEMINI_MODELS[modelIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    console.log(`[AI] Trying ${model}...`);

    try {
        const { data } = await axios.post(
            url,
            {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 1500,
                    topP: 0.95
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 60000
            }
        );

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
            console.log(`[AI] ✅ Success with ${model}`);
            return text.trim();
        }

        // Log why no text (blocked by safety, etc.)
        const finishReason = data?.candidates?.[0]?.finishReason;
        const blockReason = data?.promptFeedback?.blockReason;
        console.log(`[AI] No text. finishReason=${finishReason}, blockReason=${blockReason}`);

        throw new Error(`No response (${finishReason || blockReason || 'unknown'})`);
    } catch (e) {
        const status = e?.response?.status;
        const errMsg = e?.response?.data?.error?.message || e.message;
        console.log(`[AI] ${model} failed (${status}): ${errMsg}`);

        // Try next model in chain
        if (modelIndex + 1 < GEMINI_MODELS.length) {
            return callGemini(prompt, modelIndex + 1);
        }

        // All models failed
        if (status === 400) {
            throw new Error("Invalid API key or request format.");
        }
        if (status === 403) {
            throw new Error("API key rejected. Check that the Generative Language API is enabled for your key.");
        }
        if (status === 429) {
            throw new Error("Rate limit reached. Please wait a minute and try again.");
        }
        if (status === 503) {
            throw new Error("Gemini is temporarily overloaded. Please try again in a moment.");
        }
        throw new Error(`AI error: ${errMsg}`);
    }
}

// ========== HANDLE AI COMMAND ==========
async function handleAI(conn, mek, from, reply, args, label) {
    const input = (args || []).join(" ").trim();

    if (!input) {
        return reply(`❌ Usage: .${label.toLowerCase()} <your question>\n\nExample: .${label.toLowerCase()} what is JavaScript?`);
    }

    console.log(`[${label}] Input: "${input}"`);

    try {
        await conn.sendMessage(from, { react: { text: "⌛", key: mek.key } });
    } catch {}

    try {
        const answer = await callGemini(input);
        await sendBranded(conn, from, mek, `🤖 *${label}*\n\n${answer}`);

        try { await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }); } catch {}
    } catch (e) {
        console.error(`[${label}] Error:`, e.message);
        reply(`❌ ${e.message}`);
        try { await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }); } catch {}
    }
}

// ═════════════════════════════════════════════════════════════
// 🤖 .gpt COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "gpt",
    alias: ["ai", "chatgpt", "ask"],
    desc: "Ask AI anything (Gemini backend)",
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
    alias: ["metaai", "llama"],
    desc: "Ask Meta AI anything (Gemini backend)",
    category: "AI",
    react: "🦙",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    await handleAI(conn, mek, from, reply, args, "META AI");
});

// ═════════════════════════════════════════════════════════════
// 📋 .aihelp COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "aihelp",
    alias: ["aimenu", "aicommands"],
    desc: "AI commands help menu",
    category: "AI",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    const menu =
`🤖 *AI COMMANDS*

*Models:*
• .gpt <question> — Ask GPT
• .meta <question> — Ask Meta AI

*Examples:*
• .gpt what is coding
• .meta tell me a joke
• .ai hello (uses GPT)

_Powered by Queen-Anika 🩷_`;

    await sendBranded(conn, from, mek, menu);
});
