/**
 * main.js
 * Pont entre handler.js et pairing-api.js.
 * pairing-api.js attend des noms de fonctions différents de ceux exportés
 * par handler.js : ce fichier fait le lien sans modifier ni l'un ni l'autre.
 */

const handler = require('./handler');
const config = require('./config');

// Émojis utilisés pour réagir automatiquement aux statuts (un tiré au sort à chaque statut)
const STATUS_REACT_EMOJIS = ['💚', '💛', '💜', '💙', '🩵'];

// pairing-api.js attend "handleMessages" (avec S) -> relié vers handler.handleMessage
const handleMessages = async (sock, chatUpdate) => {
    const msg = chatUpdate.messages?.[0];
    if (!msg) return;
    await handler.handleMessage(sock, msg);
};

// pairing-api.js attend "handleGroupParticipantUpdate" -> relié vers handler.handleGroupUpdate
const handleGroupParticipantUpdate = async (sock, update) => {
    await handler.handleGroupUpdate(sock, update);
};

// Vue et réaction automatiques aux statuts, avec un cœur de couleur aléatoire (💚💛💜💙🩵)
const handleStatus = async (sock, chatUpdate) => {
    try {
        const msg = chatUpdate.messages?.[0];
        if (!msg) return;
        if (msg.key.remoteJid !== 'status@broadcast') return;
        if (msg.key.fromMe) return; // ne réagit pas à ses propres statuts

        // Peut être désactivé via config.autoStatusReact = false
        if (config.autoStatusReact === false) return;

        // Marque le statut comme vu
        try {
            await sock.readMessages([msg.key]);
        } catch (e) {
            // silencieux : certains statuts peuvent refuser la vue automatique
        }

        // Réagit avec un cœur de couleur choisi au hasard
        try {
            const emoji = STATUS_REACT_EMOJIS[Math.floor(Math.random() * STATUS_REACT_EMOJIS.length)];
            await sock.sendMessage('status@broadcast', {
                react: { text: emoji, key: msg.key }
            }, {
                statusJidList: [msg.key.participant, sock.user.id]
            });
        } catch (e) {
            // silencieux : certains statuts peuvent refuser la réaction
        }
    } catch (error) {
        console.error('Erreur handleStatus:', error);
    }
};

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus
};
