const { DISCORD, CONFIG } = require('../config.js');

module.exports = {
    name: 'resonance',
    description: "check arraybot in this guild",
    execute(message) {
        if (!message.guild) { return false; }
        if (!Object.keys(CONFIG).includes(message.guild.id)) { return false; }
        const { command, args } = CONFIG[message.guild.id].fixMessage(message.content);

        if ('共鳴' != command) { return; }
        if (message.author.id != '353625493876113440') { return; }

        const bot = DISCORD.getBot(message.client.user.id);
        message.channel.send(`${bot.RESONANCE}${bot.RESONANCE}${bot.RESONANCE}${bot.RESONANCE}`);
        return true;
    },
}