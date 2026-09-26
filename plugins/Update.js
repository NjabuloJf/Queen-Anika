/* Credits:
Mr Frank
 Dont remove this credits 
 */

const { cmd } = require("../command");
const axios = require('axios');
const fs = require('fs');
const path = require("path");
const AdmZip = require("adm-zip");
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

cmd({
    pattern: "update",
    alias: ["upgrade", "sync"],
    react: '🚀',
    desc: "Update the bot to the latest version",
    category: "system",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender, isOwner }) => {
    if (!isOwner) return reply("❌ Owner only command!");

    try {
        await conn.sendMessage(from, { react: { text: '🚀', key: mek.key } });

        // 👇 YOUR repo now
        const repoUrl = config.REPO || "https://github.com/NjabuloJf/Queen-Anika";
        const repoName = repoUrl.split('/').pop();

        await reply("📥 Downloading updates directly...");

        // Download main branch ZIP
        const { data } = await axios.get(`${repoUrl}/archive/refs/heads/main.zip`, {
            responseType: "arraybuffer",
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const zip = new AdmZip(Buffer.from(data));
        const zipEntries = zip.getEntries();

        // Protected files — never overwritten
        const protectedFiles = ["config.js", "app.json", "data", "auth_info_baileys", "session", "node_modules", ".env"];
        const basePath = `${repoName}-main/`;

        await reply("🔄 Applying updates...");

        let updatedCount = 0;

        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;

            const relativePath = entry.entryName.replace(basePath, '');
            if (!relativePath) continue;

            const destPath = path.join(__dirname, '..', relativePath);

            if (protectedFiles.some(f => destPath.includes(f))) continue;

            const dir = path.dirname(destPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            zip.extractEntryTo(entry, dir, false, true, entry.name);
            updatedCount++;
        }

        const successText =
`✅ *Status:* Update complete!
📦 *Files:* ${updatedCount} updated
🔄 *Action:* Restarting...
`;

        await conn.sendMessage(from, {
            image: { url: BRAND_IMAGE },
            caption: successText,
            contextInfo: ctxInfo()
        }, { quoted: mek });

        setTimeout(() => process.exit(0), 2000);

    } catch (error) {
        console.error("Update error:", error);
        const errorText = `❌ Update failed: ${error.message}\n\nPlease update manually from:\n${config.REPO || "https://github.com/NjabuloJf/Queen-Anika"}`;
        reply(errorText);
    }
}); 
