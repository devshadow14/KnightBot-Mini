/**
 * Menu Command - Display all available commands
 */

const os = require('os');
const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');

// Catégories réellement utilisées dans le projet, avec leur titre/emoji d'affichage
const CATEGORY_DISPLAY = {
  general:   { emoji: '🏠', title: '𝐌𝐀𝐈𝐍' },
  group:     { emoji: '👥', title: '𝐆𝐑𝐎𝐔𝐏' },
  admin:     { emoji: '🛡️', title: '𝐌𝐎𝐃𝐄𝐑𝐀𝐓𝐈𝐎𝐍' },
  owner:     { emoji: '👑', title: '𝐎𝐖𝐍𝐄𝐑' },
  media:     { emoji: '🎵', title: '𝐌𝐄𝐃𝐈𝐀' },
  fun:       { emoji: '😂', title: '𝐅𝐔𝐍' },
  utility:   { emoji: '🛠️', title: '𝐓𝐎𝐎𝐋𝐒' },
  anime:     { emoji: '👾', title: '𝐀𝐍𝐈𝐌𝐄' },
  ai:        { emoji: '🤖', title: '𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋 𝐈𝐍𝐓𝐄𝐋𝐋𝐈𝐆𝐄𝐍𝐂𝐄' },
  textmaker: { emoji: '🖋️', title: '𝐓𝐄𝐗𝐓𝐌𝐀𝐊𝐄𝐑' }
};

function buildCategoryBox(prefix, key, cmds) {
  const meta = CATEGORY_DISPLAY[key] || { emoji: '📂', title: key.toUpperCase() };
  let box = `╭━━〔 ${meta.emoji} ${meta.title} 〕━━╮\n`;
  cmds.forEach(cmd => {
    box += `┃ ✦ ${prefix}${cmd.name}\n`;
  });
  box += `╰${'━'.repeat(Math.max(meta.title.length + meta.emoji.length + 6, 14))}╯\n\n`;
  return box;
}

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',

  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};

      // Regroupe les commandes par catégorie (uniquement les noms principaux, pas les alias)
      commands.forEach((cmd, name) => {
        if (cmd.name === name) {
          if (!categories[cmd.category]) categories[cmd.category] = [];
          categories[cmd.category].push(cmd);
        }
      });

      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
      const displayOwner = ownerNames[0] || config.ownerName || 'Bot Owner';

      // Uptime
      const uptimeSec = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;

      // Mémoire
      const usedMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
      const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(0);

      const botTitle = (config.botName || 'BOT').toString();
      const sender = extra.sender.split('@')[0];

      let menuText = `╭━━━〔 👑 ${botTitle} 〕━━━╮\n`;
      menuText += `┃\n`;
      menuText += `┃  ◈ 👤 𝐔𝐒𝐄𝐑 : @${sender}\n`;
      menuText += `┃  ◈ ⚙️ 𝐏𝐑𝐄𝐅𝐈𝐗 : ${config.prefix}\n`;
      menuText += `┃  ◈ ⚡ 𝐔𝐏𝐓𝐈𝐌𝐄 : ${hours}h ${minutes}m ${seconds}s\n`;
      menuText += `┃  ◈ 💾 𝐌𝐄𝐌𝐎𝐑𝐘 : ${usedMemory} MB / ${totalMemory} MB\n`;
      menuText += `┃  ◈ 📦 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 : ${commands.size}\n`;
      menuText += `┃  ◈ 👑 𝐎𝐖𝐍𝐄𝐑 : ${displayOwner}\n`;
      menuText += `┃\n`;
      menuText += `╰${'━'.repeat(botTitle.length + 10)}╯\n\n`;

      // Un seul ordre d'affichage, uniquement pour les catégories qui ont au moins une commande
      const order = ['general', 'group', 'admin', 'owner', 'media', 'fun', 'utility', 'anime', 'ai', 'textmaker'];
      order.forEach(key => {
        if (categories[key] && categories[key].length) {
          menuText += buildCategoryBox(config.prefix, key, categories[key]);
        }
      });

      // Catégories non prévues dans l'ordre ci-dessus (sécurité si un nouveau dossier est ajouté)
      Object.keys(categories).forEach(key => {
        if (!order.includes(key)) {
          menuText += buildCategoryBox(config.prefix, key, categories[key]);
        }
      });

      menuText += `╭━━━━━━━━━━━━━━━━\n`;
      menuText += `┃  ®${new Date().getFullYear()} © by 𝐃𝐄𝐕 𝐌𝐈𝐂𝐇𝐀𝐄𝐋 𝐒𝐂𝐎𝐅𝐈𝐄𝐋𝐃™\n`;
      menuText += `╰━━━━━━━━━━━━━━━━╯`;

      // Envoi du menu avec image si disponible
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');

      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        await sock.sendMessage(extra.from, {
          image: imageBuffer,
          caption: menuText,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363161513685998@newsletter',
              newsletterName: config.botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } else {
        await sock.sendMessage(extra.from, {
          text: menuText,
          mentions: [extra.sender]
        }, { quoted: msg });
      }

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
