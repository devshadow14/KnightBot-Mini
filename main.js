/**
 * main.js
 * Pont entre handler.js et pairing-api.js.
 * pairing-api.js attend des noms de fonctions différents de ceux exportés
 * par handler.js : ce fichier fait le lien sans modifier ni l'un ni l'autre.
 */

const handler = require('./handler');

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

// handleStatus n'existe pas dans handler.js : version minimale ajoutée ici.
// Elle ne fait rien pour l'instant (aucune vue/réaction automatique des statuts).
const handleStatus = async (sock, chatUpdate) => {
    try {
        const msg = chatUpdate.messages?.[0];
        if (!msg) return;
        // Ajoute ici une logique d'auto-vue ou d'auto-réaction aux statuts si besoin.
    } catch (error) {
        console.error('Erreur handleStatus:', error);
    }
};

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus
};
