const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/Queen-Anika.png",
    ALIVE_MSG: process.env.ALIVE_MSG || "Hey there, I'm alive",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "26773968411",
    PRO_USERS: process.env.PRO_USERS || "26777821911",
    AUDD_API_TOKEN: process.env.AUDD_API_TOKEN || "b132bfc095eb6baf79e759c7f0f981b3",
    MODE: process.env.MODE || "public",
    PREFIX: process.env.PREFIX || ".",
    BOT_NAME: process.env.BOT_NAME || "Queen-Anika",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "False",
    OWNER_NAME: process.env.OWNER_NAME || "Njabulo-Jb",
    AUTO_CHATBOT: process.env.AUTO_CHATBOT || "true",
};
