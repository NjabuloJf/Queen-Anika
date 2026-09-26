const { cmd } = require('../command');
const config = require('../config');
const { tiny } = require("../lib/fancy_font/fancy");
const axios = require('axios');
const { downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// ==================== VIEW ONCE RECOVERY ====================
cmd({
    pattern: "vv",
    alias: ["viewonce", "vo", "reveal"],
    desc: "Recover View Once message (reply to it)",
    category: "utility",
    filename: __filename
}, async (conn, mek, m, { from, quoted, isOwner, reply }) => {
    try {
        if (!quoted) {
            return reply(tiny("Reply to a *View Once* message with `.vv`"));
        }

        // Get the real quoted message
        let msg = quoted.message || quoted;
        let type = getContentType(msg);

        // Unwrap viewOnce wrappers
        if (type === "viewOnceMessage" || type === "viewOnceMessageV2" || type === "viewOnceMessageV2Extension") {
            msg = msg[type].message;
            type = getContentType(msg);
        }

        const mediaMsg = msg[type];
        if (!mediaMsg) {
            return reply(tiny("This is not a valid View Once media message."));
        }

        // Download the media
        const buffer = await downloadMediaMessage(
            { message: msg, key: quoted.key || mek.key },
            "buffer",
            {},
            { logger: console, reuploadRequest: conn.updateMediaMessage }
        );

        if (!buffer) {
            return reply(tiny("Failed to download the media."));
        }

        const caption = mediaMsg.caption ? `*Recovered View Once*\n\n${mediaMsg.caption}` : "*Recovered View Once Message*";

        if (type === "imageMessage") {
            await conn.sendMessage(from, {
                image: buffer,
                caption: caption
            }, { quoted: mek });
        }
        else if (type === "videoMessage") {
            await conn.sendMessage(from, {
                video: buffer,
                caption: caption
            }, { quoted: mek });
        }
        else if (type === "audioMessage") {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: mediaMsg.ptt || false
            }, { quoted: mek });
        }
        else {
            return reply(tiny("Unsupported View Once type."));
        }

    } catch (err) {
        console.error("ViewOnce Error:", err);
        reply(tiny("Failed to recover View Once message.\nMake sure you replied to a valid View Once media."));
    }
});
