const { cmd } = require('../command');
const os = require('os');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { tiny } = require("../lib/fancy_font/fancy");
const { getRandomPhotoBuffer } = require('../lib/functions');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ALIVE_IMAGE_URL = 'https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png';

// Shared context info for all 3 commands
const contextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '1203634129500689311@newsletter',
    newsletterName: 'Queen-Anika'
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER: Fetch image from URL with local fallback
// ─────────────────────────────────────────────────────────────
async function getAliveImage() {
  try {
    const response = await axios.get(ALIVE_IMAGE_URL, {
      responseType: 'arraybuffer',
      timeout: 8000
    });
    return Buffer.from(response.data);
  } catch (err) {
    console.log('[alive] Failed to fetch remote image:', err.message);
    return getRandomPhotoBuffer();
  }
}

// Helper: formatted uptime string
function getFormattedUptime() {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// ─────────────────────────────────────────────────────────────
// ⏳ UPTIME COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
  pattern: "uptime",
  desc: "Shows how long the bot has been running.",
  category: "tools",
  react: "⏳",
  filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
  try {
    const formattedUptime = getFormattedUptime();
    const botMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const hostMemUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);
    const hostMemTotal = (os.totalmem() / 1024 / 1024).toFixed(2);

    const uptimeLayout =
`Queen-Anika
⏱️ *Uptime:* ${formattedUptime}
🖥️ *Platform:* ${os.platform()}
🤖 *Bot Memory:* ${botMemMB} MB
🖴 *Host Memory:* ${hostMemUsed} MB / ${hostMemTotal} MB (shared)
*`;

    const styledText = tiny(uptimeLayout);
    const photoBuffer = await getAliveImage();

    if (photoBuffer) {
      await conn.sendMessage(from, { image: photoBuffer, caption: styledText, contextInfo });
    } else {
      await conn.sendMessage(from, { text: styledText, contextInfo });
    }
  } catch (e) {
    console.log(e);
    reply(tiny(`❌ Error: ${e.message}`));
  }
});

// ─────────────────────────────────────────────────────────────
// 🏓 PING COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
  pattern: "ping",
  desc: "Measure bot response speed.",
  category: "tools",
  react: "🏓",
  filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
  try {
    const start = Date.now();
    // Measure real round-trip: send a placeholder, then compute
    const sent = await conn.sendMessage(from, { text: tiny('🏓 Pinging...') });
    const ping = Date.now() - start;

    // Speed rating
    let rating = '🐢 Slow';
    if (ping < 200) rating = '⚡ Lightning';
    else if (ping < 500) rating = '🚀 Fast';
    else if (ping < 1000) rating = '✅ Good';
    else if (ping < 2000) rating = '🐇 Okay';

    const pingLayout =
`Queen-Anika
🏓 *Pong!*
⚡ *Speed:* ${ping} ms
📊 *Rating:* ${rating}
⏱️ *Uptime:* ${getFormattedUptime()}
*`;

    const styledText = tiny(pingLayout);

    // Edit the placeholder message with the final result
    try {
      await conn.sendMessage(from, { text: styledText, edit: sent.key, contextInfo });
    } catch {
      // Fallback if edit isn't supported
      await conn.sendMessage(from, { text: styledText, contextInfo });
    }
  } catch (e) {
    console.log(e);
    reply(tiny(`❌ Error: ${e.message}`));
  }
});

// ─────────────────────────────────────────────────────────────
// 💚 ALIVE COMMAND
// ─────────────────────────────────────────────────────────────
cmd({
  pattern: "alive",
  alias: ["status"],
  desc: "Check if the bot is alive with full system info.",
  category: "tools",
  react: "💚",
  filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
  try {
    const botMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const hostMemUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);
    const hostMemTotal = (os.totalmem() / 1024 / 1024).toFixed(2);

    const aliveLayout =
`Queen-Anika
💚 *Status:* Alive & Online
⏱️ *Uptime:* ${getFormattedUptime()}
🖥️ *Platform:* ${os.platform()} (${os.arch()})
🤖 *Bot Memory:* ${botMemMB} MB
🖴 *Host Memory:* ${hostMemUsed} MB / ${hostMemTotal} MB (shared)
*`;

    const styledText = tiny(aliveLayout);
    const photoBuffer = await getAliveImage();

    if (photoBuffer) {
      await conn.sendMessage(from, { image: photoBuffer, caption: styledText, contextInfo });
    } else {
      await conn.sendMessage(from, { text: styledText, contextInfo });
    }
  } catch (e) {
    console.log(e);
    reply(tiny(`❌ Error: ${e.message}`));
  }
}); 
