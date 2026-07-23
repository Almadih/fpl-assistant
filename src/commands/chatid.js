module.exports = {
  name: 'chatid',
  description: 'Shows the current chat ID — use this to configure TARGET_GROUP_ID in .env.',
  async execute(client, message, args) {
    const chatId = message.from;
    await message.reply(
      `🆔 *Chat ID:*\n\`${chatId}\`\n\n` +
      `Copy the value above and set it in your \`.env\` file:\n` +
      `\`TARGET_GROUP_ID=${chatId}\``
    );
  }
};
