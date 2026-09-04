/**
 * instanceSettings.js
 * Réglages PAR NUMÉRO CONNECTÉ (préfixe, mode privé, etc.)
 *
 * Avant : les commandes comme .setprefix modifiaient l'objet `config` global,
 * partagé par TOUTES les instances (tous les numéros connectés via le site).
 * Résultat : un utilisateur changeait son préfixe (ou activait le mode privé)
 * et ça changeait pour TOUT LE MONDE.
 *
 * Ce module stocke chaque réglage séparément, par numéro de bot connecté,
 * dans un fichier JSON — sans jamais toucher à config.js ni à l'objet
 * config partagé.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const SETTINGS_PATH = path.join(__dirname, '..', 'database', 'instanceSettings.json');

// Même logique de normalisation que dans handler.js (numéro sans device id ni domaine)
function normalizeNumber(jid) {
  if (!jid || typeof jid !== 'string') return null;
  if (jid.includes(':')) return jid.split(':')[0];
  if (jid.includes('@')) return jid.split('@')[0];
  return jid;
}

function loadAll() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[instanceSettings] Erreur de sauvegarde :', err.message);
  }
}

// Clé = numéro du bot connecté à CETTE instance (sock.user.id normalisé)
function instanceKey(sock) {
  if (!sock || !sock.user || !sock.user.id) return null;
  return normalizeNumber(sock.user.id);
}

function getInstanceSettings(sock) {
  const key = instanceKey(sock);
  if (!key) return {};
  const all = loadAll();
  return all[key] || {};
}

function setInstanceSetting(sock, field, value) {
  const key = instanceKey(sock);
  if (!key) return false;
  const all = loadAll();
  if (!all[key]) all[key] = {};
  all[key][field] = value;
  saveAll(all);
  return true;
}

// ===== Préfixe =====
function getPrefix(sock) {
  const settings = getInstanceSettings(sock);
  return settings.prefix || config.prefix;
}
function setPrefix(sock, newPrefix) {
  return setInstanceSetting(sock, 'prefix', newPrefix);
}

// ===== Mode privé (self mode) =====
function getSelfMode(sock) {
  const settings = getInstanceSettings(sock);
  return typeof settings.selfMode === 'boolean' ? settings.selfMode : !!config.selfMode;
}
function setSelfMode(sock, value) {
  return setInstanceSetting(sock, 'selfMode', !!value);
}

module.exports = {
  getPrefix,
  setPrefix,
  getSelfMode,
  setSelfMode,
  getInstanceSettings
};
