const { DISCORD } = require('../config.js');

module.exports = {
    name: 'resonance',
    description: "check arraybot in this guild",
    execute(message) {
        if (!message.guild) { return false; }

        // get config
        const { client, content } = message;
        let config = client.config[message.guild.id];
        if (!config) { return false; }

        const { command, args } = config.fixMessage(content);
        if (!command) { return false; }

        if ('共鳴' != command) { return; }
        if (message.author.id != '353625493876113440') { return; }

        const bot = DISCORD.getBot(message.client.user.id);
        message.channel.send({ content: `${bot.RESONANCE}${bot.RESONANCE}${bot.RESONANCE}${bot.RESONANCE}` });
        return true;
    },
}