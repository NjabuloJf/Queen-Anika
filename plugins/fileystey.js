/**
 * main.js
 * Commands: ping, uptime, alive, menu, repo
 * Uses cmd() handler. No fancy font. Plain text.
 * Branding image: Queen-Anika.png
 */

const { cmd } = require('../command');
const config = require("../config"); // 👈 FIXED: was "../set"
const os = require('os');

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

// ========== HELPER: Get formatted uptime ==========
function getFormattedUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// ═════════════════════════════════════════════════════════════
// 🏓 PING COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "ping",
    desc: "Measure bot response speed.",
    category: "tools",
    react: "🏓",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const start = Date.now();
        const sent = await conn.sendMessage(from, { text: "🏓 Pinging..." }, { quoted: mek });
        const ping = Date.now() - start;

        let rating = '🐢 Slow';
        if (ping < 200) rating = '⚡ Lightning';
        else if (ping < 500) rating = '🚀 Fast';
        else if (ping < 1000) rating = '✅ Good';
        else if (ping < 2000) rating = '🐇 Okay';

        const text =`╭─「 *QUEEN-ANIKA* 」
│〕.
│〕.⚡ *Speed:* ${ping} ms
│〕.📊 *Rating:* ${rating}
│〕.⏱️ *Uptime:* ${getFormattedUptime()}
╰─────────〔🌸〕`;

        await conn.sendMessage(from, {
          image: { url: BRAND_IMAGE },
            caption : text,
            contextInfo: ctxInfo()
        });
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// ⏳ UPTIME COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "uptime",
    desc: "Shows how long the bot has been running.",
    category: "tools",
    react: "⏳",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const formattedUptime = getFormattedUptime();
        const botMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const hostMemUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);
        const hostMemTotal = (os.totalmem() / 1024 / 1024).toFixed(2);

        const text =`╭─「 *QUEEN-ANIKA* 」
│〕.
│〕.🕒 *Running:* ${formattedUptime}
│〕.🖥️ *Platform:* ${os.platform()}
│〕.🤖 *Bot Memory:* ${botMemMB} MB
│〕.🖴 *Host Memory:* ${hostMemUsed} MB / ${hostMemTotal} MB (shared)
╰─────────〔🌸〕`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: text,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 💚 ALIVE COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "alive",
    alias: ["status"],
    desc: "Check if the bot is alive and show system info.",
    category: "tools",
    react: "💚",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const botMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const hostMemUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);
        const hostMemTotal = (os.totalmem() / 1024 / 1024).toFixed(2);

        const text =`╭─「 *QUEEN-ANIKA* 」
│〕.
│〕.⏱️ *Uptime:* ${getFormattedUptime()}
│〕.🖥️ *Platform:* ${os.platform()} (${os.arch()})
│〕.🤖 *Bot Memory:* ${botMemMB} MB
│〕.🖴 *Host Memory:* ${hostMemUsed} MB / ${hostMemTotal} MB (shared)
╰─────────〔🌸〕`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: text,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 📋 MENU COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "men",
    alias: ["help", "commands"],
    desc: "Show all available commands.",
    category: "tools",
    react: "📋",
    filename: __filename
},
async (conn, mek, m, { from, reply, pushname }) => {
    try {
        // Load commands dynamically from your command handler
        const { commands } = require('../command');
        
        // Group commands by category
        const categories = {};
        commands.forEach(c => {
            if (!c.pattern || c.on) return; // Skip 'on' handlers
            const cat = c.category || 'general';
            if (!categories[cat]) categories[cat] = [];
            // Only add once
            if (!categories[cat].includes(c.pattern)) {
                categories[cat].push(c.pattern);
            }
        });

        // Build the menu text
        let menuText = `📋 *QUEEN-ANIKA MENU*\n\n`;
        menuText += `👤 *User:* ${pushname || 'User'}\n`;
        menuText += `⏱️ *Uptime:* ${getFormattedUptime()}\n`;
        menuText += `🔧 *Prefix:* ${config.PREFIX || '.'}\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const [cat, cmds] of Object.entries(categories)) {
            menuText += `*${cat.toUpperCase()}*\n`;
            // Sort alphabetically
            cmds.sort();
            menuText += cmds.map(c => `│ ${config.PREFIX || '.'}${c}`).join('\n');
            menuText += `\n\n`;
        }

        menuText += `━━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `_Powered by Queen-Anika_`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: menuText,
            contextInfo: ctxInfo()
        }, { quoted: mek });

    } catch (e) {
        console.error('[MENU] Error:', e);
        reply(`❌ Failed to load menu: ${e.message}`);
    }
});

// ═════════════════════════════════════════════════════════════
// 📦 REPO COMMAND
// ═════════════════════════════════════════════════════════════
cmd({
    pattern: "rep",
    alias: ["repository", "github", "source"],
    desc: "Get the bot's GitHub repository link.",
    category: "tools",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // 🔧 CHANGE THIS to your actual repository URL
        const repoUrl = config.REPO_URL || "https://github.com/NjabuloJf/Queen-Anika";

        const text =`╭─「 *QUEEN-ANIKA* 」
│〕.
│〕.🔗 *Link:*
│〕. Telegram bot
│〕. ${repoUrl}
│〕. Website njabulo-ai.vercel.app
│〕.⭐ *Don't forget to star the repo if you like it!*
╰─────────〔🌸〕`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: text,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});


            cmd({
    pattern: "menu",
    alias: ["repository", "github", "source"],
    desc: "Get the bot's GitHub repository link.",
    category: "tools",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        // 🔧 CHANGE THIS to your actual repository URL
        const repoUrl = config.REPO_URL || "https://github.com/NjabuloJf/Queen-Anika";

        const text =`╭─「 *QUEEN-ANIKA* 」
」
」〔👤 *User:* ${pushname || 'User'}
」〔⏱️ *Uptime:* ${getFormattedUptime()}
」〔🔧 *Prefix:* ${config.PREFIX || '.'}
╰─────」
╭─「 *GROUP* 」
│〕 .antilink
│〕 .antilinkdelete
│〕 .antilinkoff
│〕 .antilinkremove
│〕 .antilinkwarn
│〕 .goodbye
│〕 .resetwarns
│〕 .welcome
╰─────」
╭─「 *TOOLS* 」
│〕 .getpp
│〕 .alive
│〕 .menu
│〕 .ping
│〕 .repo
│〕 .shazam
│〕 .uptime
╰─────」
╭─「 *DOWNLOAD* 」
│〕.apk
│〕.facebook
│〕.img
│〕.instagram
│〕.play
│〕.playstore
│〕.tiktok
│〕.lyrics
│〕.video
│〕.youtube
╰─────────〔🌸〕`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: text,
            contextInfo: ctxInfo()
        }, { quoted: mek });
    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});
