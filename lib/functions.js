const axios = require('axios')
const fs = require('fs')
const path = require('path')

// =================== CACHED PHOTO BUFFERS ===================
// Loaded once at startup instead of re-reading the /lib/photos folder
// from disk on every single command call. fs.readdirSync/readFileSync
// are synchronous and block Node's entire event loop while they run,
// which was previously happening on almost every command (ping, menu,
// alive, uptime, weather, song, etc). Reading once here and reusing
// the buffers removes that per-command disk I/O entirely.
const photosDir = path.join(__dirname, 'photos')
const validPhotoExt = ['.jpg', '.jpeg', '.png', '.webp']
let photoBuffers = []
try {
    if (fs.existsSync(photosDir)) {
        photoBuffers = fs.readdirSync(photosDir)
            .filter(f => validPhotoExt.includes(path.extname(f).toLowerCase()))
            .map(f => fs.readFileSync(path.join(photosDir, f)))
    }
} catch (e) {
    console.log("Error pre-loading photo buffers:", e.message || e)
}

const getRandomPhotoBuffer = () => {
    if (!photoBuffers.length) return null
    return photoBuffers[Math.floor(Math.random() * photoBuffers.length)]
}

const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1,
                ...(options.headers || {})
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (e) {
        console.log("Error in getBuffer:", e.message || e)
        return null
    }
}

const getGroupAdmins = (participants) => {
    var admins = []
    for (let i of participants) {
        if (i.admin) admins.push(i.id)
    }
    return admins
}

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
    if (!eco || isNaN(eco)) return '0'
    var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
    var ma = Math.log10(Math.abs(eco)) / 3 | 0
    if (ma == 0) return eco
    var ppo = lyrik[ma]
    var scale = Math.pow(10, ma * 3)
    var scaled = eco / scale
    var formatt = scaled.toFixed(1)
    if (/\.0$/.test(formatt))
        formatt = formatt.substr(0, formatt.length - 2)
    return formatt + ppo
}

const isUrl = (url) => {
    if (!url) return false
    return url.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
            'gi'
        )
    )
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
    seconds = Number(seconds)
    if (isNaN(seconds)) return '0 seconds'
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    var s = Math.floor(seconds % 60)
    var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
    var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
    var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
    var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
    let result = dDisplay + hDisplay + mDisplay + sDisplay
    return result.trim() ? result.replace(/,\s*$/, '') : '0 seconds'
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                ...(options.headers || {})
            },
            ...options
        })
        return res.data
    } catch (err) {
        console.log("Error in fetchJson:", err.message || err)
        return { error: true, message: err.message }
    }
}

module.exports = { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, getRandomPhotoBuffer }