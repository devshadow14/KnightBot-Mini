/**
 * Ping Command - Check bot response time
 */

const config = require('../../config');

module.exports = {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check bot response time',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    try {
      const start = Date.now();
      const sent = await extra.reply('🏓 Ping...');
      const responseTime = Date.now() - start;

      const botTitle = (config.botName || 'BOT').toString();

      const text =
        `╭━━━〔 🏓 𝗣𝗢𝗡𝗚 〕━━━╮\n` +
        `┃\n` +
        `┃  ⚡ 𝐋𝐀𝐓𝐄𝐍𝐂𝐄 : ${responseTime}ms\n` +
        `┃  🐈‍⬛ ${botTitle}\n` +
        `┃  ✅ 𝐒𝐭𝐚𝐭𝐮𝐭 : En ligne\n` +
        `┃\n` +
        `╰${'━'.repeat(botTitle.length + 10)}╯`;

      await sock.sendMessage(extra.from, {
        text,
        edit: sent.key
      });

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
