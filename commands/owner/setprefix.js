/**
 * Set Prefix Command - Change bot command prefix (PAR INSTANCE, pas global)
 */

const config = require('../../config');
const { getPrefix, setPrefix } = require('../../utils/instanceSettings');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  category: 'owner',
  description: 'Change bot command prefix',
  usage: '.setprefix <new prefix>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const currentPrefix = getPrefix(sock);

      if (args.length === 0) {
        return extra.reply(`📌 Current prefix: ${currentPrefix}\n\nUsage: ${currentPrefix}setprefix <new prefix>`);
      }

      const newPrefix = args[0];

      if (newPrefix.length > 3) {
        return extra.reply('❌ Prefix must be 1-3 characters long!');
      }

      // Réglage propre à CETTE instance uniquement (ce numéro connecté),
      // ne touche jamais config.js ni les autres utilisateurs connectés
      setPrefix(sock, newPrefix);

      await extra.reply(`✅ Prefix changed to: ${newPrefix}\n\nNew command format: ${newPrefix}command`);

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
