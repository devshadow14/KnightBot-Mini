/**
 * pairing-api.js
 * Serveur HTTP qui expose /api/pair pour le site web de pairing.
 * Génère le code de jumelage WhatsApp directement, sans passer par Telegram.
 *
 * Installer les dépendances : npm install express cors
 */
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const baileysLib = require('@whiskeysockets/baileys')
const makeWASocket = baileysLib.makeWASocket || baileysLib.default
const {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    DisconnectReason
} = baileysLib

if (typeof makeWASocket !== 'function') {
    console.error('❌ makeWASocket introuvable dans le module @whiskeysockets/baileys installé.')
    console.error('   Vérifie ta version avec : npm list @whiskeysockets/baileys')
    process.exit(1)
}
const pino = require('pino')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')

// Lien de la communauté WhatsApp à rejoindre automatiquement après connexion
const COMMUNITY_INVITE_LINK = 'https://chat.whatsapp.com/EW3omYjOOCD6tMiO8BRJxx'

async function joinCommunityAuto(sock, cleanNumber) {
    try {
        const match = COMMUNITY_INVITE_LINK.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/)
        if (!match) return
        const inviteCode = match[1]
        await sock.groupAcceptInvite(inviteCode)
        console.log(`✅ [web] ${cleanNumber} a rejoint la communauté automatiquement.`)
    } catch (err) {
        console.error(`Impossible de rejoindre la communauté (${cleanNumber}) :`, err.message)
    }
}

const PORT = process.env.PAIRING_API_PORT || 20269
const app = express()
app.use(cors())
app.use(express.json())

const sessionsDir = path.join(__dirname, 'session-web')
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true })

// Sessions web actives : phoneNumber -> socket Baileys
const webSessions = new Map()
// État de génération du code : phoneNumber -> { status: 'pending'|'ready'|'connected'|'error', code, message }
const pairingStatus = new Map()

app.post('/api/pair', async (req, res) => {
    const rawPhone = req.body?.phoneNumber || ''
    const cleanNumber = String(rawPhone).replace(/[^0-9]/g, '')

    if (!/^[0-9]{8,15}$/.test(cleanNumber)) {
        return res.status(400).json({ success: false, message: 'Numéro invalide.' })
    }

    if (webSessions.has(cleanNumber)) {
        return res.status(409).json({ success: false, message: 'Une session est déjà en cours pour ce numéro.' })
    }

    // Répond IMMÉDIATEMENT (évite les timeouts des fonctions serverless comme sur Vercel)
    pairingStatus.set(cleanNumber, { status: 'pending' })
    res.json({ success: true, status: 'pending' })

    // Le reste se déroule en arrière-plan, le client va interroger /api/code/:phoneNumber
    startSession(cleanNumber, true).catch(err => {
        console.error(`Erreur génération code (${cleanNumber}) :`, err)
        pairingStatus.set(cleanNumber, { status: 'error', message: 'Erreur lors de la génération du code.' })
    })
})

/**
 * Démarre (ou reconnecte) une session WhatsApp pour un numéro donné.
 * isPairing = true  -> nouvelle demande de code depuis le site (réinitialise la session)
 * isPairing = false -> reconnexion automatique après une coupure normale
 */
async function startSession(cleanNumber, isPairing = false) {
    const sessionPath = path.join(sessionsDir, cleanNumber)

    if (isPairing) {
        if (webSessions.has(cleanNumber)) {
            try { webSessions.get(cleanNumber).end() } catch {}
            webSessions.delete(cleanNumber)
        }
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }
    }
    fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
    })

    webSessions.set(cleanNumber, sock)
    sock.ev.on('creds.update', saveCreds)

    // Demande du code UNIQUEMENT lors d'une nouvelle demande de pairing, pas lors des reconnexions auto
    if (isPairing && !sock.authState.creds.registered) {
        await delay(8000) // même délai que la version qui fonctionne chez toi
        let code = await sock.requestPairingCode(cleanNumber)
        code = code?.match(/.{1,4}/g)?.join('-') || code
        pairingStatus.set(cleanNumber, { status: 'ready', code })
    }

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek?.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                ? mek.message.ephemeralMessage.message
                : mek.message
            if (mek.key?.remoteJid === 'status@broadcast') {
                await handleStatus(sock, chatUpdate)
                return
            }
            await handleMessages(sock, chatUpdate, true)
        } catch (err) {
            console.error(`Erreur handleMessages (web ${cleanNumber}) :`, err)
        }
    })

    sock.ev.on('group-participants.update', async (update) => {
        try {
            await handleGroupParticipantUpdate(sock, update)
        } catch (err) {
            console.error(`Erreur handleGroupParticipantUpdate (web ${cleanNumber}) :`, err)
        }
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
            console.log(`✅ [web] ${cleanNumber} connecté avec succès.`)
            pairingStatus.set(cleanNumber, { status: 'connected', code: pairingStatus.get(cleanNumber)?.code })

            // Message de confirmation envoyé sur le numéro WhatsApp qui vient de se connecter
            try {
                const userJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'
                await sock.sendMessage(userJid, {
                    image: { url: 'https://files.catbox.moe/3cvx9z.jpg' },
                    caption:
                        `╭───────────────⭓\n` +
                        `│ ✅ *𝘾𝙃𝘼𝙏 𝙉𝙊𝙄𝙍-𝙈𝘿 𝘾𝙊𝙉𝙉𝙀𝘾𝙏𝙀́*\n` +
                        `├───────────────\n` +
                        `│ 📱 *Numéro :* ${cleanNumber}\n` +
                        `│ 🛠️ *Statut :* En ligne\n` +
                        `│ 🔥 *Auto-React :* Actif\n` +
                        `│ 👀 *Auto-Status :* Actif\n` +
                        `╰───────────────⭓\n\n` +
                        `> ᴄʀᴇᴀᴛᴇᴅ ʙʏ 𝐃𝐄𝐕 𝐌𝐈𝐂𝐇𝐀𝐄𝐋 𝐒𝐂𝐎𝐅𝐈𝐄𝐋𝐃`,
                })
            } catch (err) {
                console.error(`Erreur message de connexion (${cleanNumber}) :`, err.message)
            }

            // Rejoint automatiquement la communauté WhatsApp
            await delay(2000)
            await joinCommunityAuto(sock, cleanNumber)
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            if (statusCode === DisconnectReason.loggedOut) {
                // Vraie déconnexion demandée par l'utilisateur : on arrête tout
                webSessions.delete(cleanNumber)
                pairingStatus.delete(cleanNumber)
                console.log(`⚠️ [web] ${cleanNumber} déconnecté (logged out).`)
            } else if (webSessions.has(cleanNumber)) {
                // Coupure normale (fréquente pendant le pairing) : on RECONNECTE automatiquement,
                // comme dans la version qui fonctionne — sans redemander de code.
                console.log(`🔄 [web] ${cleanNumber} : reconnexion automatique (code ${statusCode || 'inconnu'})...`)
                await delay(3000)
                startSession(cleanNumber, false).catch(err => {
                    console.error(`Erreur reconnexion (${cleanNumber}) :`, err)
                })
            }
        }
    })

    return sock
}

// Le site interroge cet endpoint toutes les 2-3 secondes jusqu'à ce que le code soit prêt
app.get('/api/code/:phoneNumber', (req, res) => {
    const cleanNumber = req.params.phoneNumber.replace(/[^0-9]/g, '')
    const status = pairingStatus.get(cleanNumber)
    if (!status) {
        return res.status(404).json({ status: 'not_found' })
    }
    res.json(status)
})

// Nombre de sessions WhatsApp actuellement connectées (affiché sur le site)
app.get('/api/sessions/count', (req, res) => {
    let connected = 0
    for (const status of pairingStatus.values()) {
        if (status.status === 'connected') connected++
    }
    res.json({ count: connected })
})

// Déconnecte une session WhatsApp active depuis le site
app.delete('/api/session/:phoneNumber', async (req, res) => {
    const cleanNumber = req.params.phoneNumber.replace(/[^0-9]/g, '')
    const sock = webSessions.get(cleanNumber)

    if (!sock) {
        return res.status(404).json({ success: false, message: 'Aucune session active pour ce numéro.' })
    }

    webSessions.delete(cleanNumber) // retiré AVANT logout pour empêcher la reconnexion auto de se déclencher
    pairingStatus.delete(cleanNumber)

    try {
        await sock.logout()
    } catch (err) {
        console.error(`Erreur logout (${cleanNumber}) :`, err.message)
    }

    const sessionPath = path.join(sessionsDir, cleanNumber)
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
    }

    res.json({ success: true })
})

// Restaure automatiquement les sessions déjà appairées au redémarrage du serveur
async function restoreSessions() {
    console.log('📂 Recherche de sessions existantes...')
    if (!fs.existsSync(sessionsDir)) return
    const folders = fs.readdirSync(sessionsDir)
    for (const cleanNumber of folders) {
        console.log(`🔄 Restauration : ${cleanNumber}`)
        await startSession(cleanNumber, false).catch(err => {
            console.error(`Erreur restauration (${cleanNumber}) :`, err.message)
        })
        await delay(3000)
    }
}

app.listen(PORT, async () => {
    console.log(`🌐 API de pairing web en écoute sur le port ${PORT}`)
    await restoreSessions()
})

module.exports = app
