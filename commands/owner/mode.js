/**
 * Mode Command
 * Toggle bot between private and public mode (PAR INSTANCE, pas global)
 */

const { getSelfMode, setSelfMode } = require('../../utils/instanceSettings');

module.exports = {
  name: 'mode',
  aliases: ['botmode', 'privatemode', 'publicmode'],
  description: 'Toggle bot between private and public mode',
  usage: '.mode <private/public>',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const isPrivate = getSelfMode(sock);

      if (!args[0]) {
        const currentMode = isPrivate ? 'private' : 'public';
        const description = isPrivate
          ? 'Only owner and sudo users can use commands'
          : 'Everyone can use commands';

        return extra.reply(
          `🤖 *Bot Mode*\n\n` +
          `Current Mode: *${currentMode.toUpperCase()}*\n` +
          `Status: ${description}\n\n` +
          `Usage:\n` +
          `  .mode private - Only owner can use\n` +
          `  .mode public - Everyone can use`
        );
      }

      const mode = args[0].toLowerCase();

      if (mode === 'private' || mode === 'priv') {
        if (isPrivate) {
          return extra.reply('🔒 Bot is already in *PRIVATE* mode.\nOnly owner can use commands.');
        }

        // Réglage propre à CETTE instance uniquement (ce numéro connecté)
        setSelfMode(sock, true);
        return extra.reply('🔒 Bot mode changed to *PRIVATE*\n\nOnly owner can use commands now.');
      }

      if (mode === 'public' || mode === 'pub') {
        if (!isPrivate) {
          return extra.reply('🌐 Bot is already in *PUBLIC* mode.\nEveryone can use commands.');
        }

        setSelfMode(sock, false);
        return extra.reply('🌐 Bot mode changed to *PUBLIC*\n\nEveryone can use commands now.');
      }

      return extra.reply('❌ Invalid mode!\nUsage: .mode <private/public>');

    } catch (error) {
      console.error('Mode command error:', error);
      await extra.reply('❌ Error changing bot mode.');
    }
  }
};
