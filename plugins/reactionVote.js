
const { CONFIG } = require('../config.js');

module.exports = {
    name: 'reactionVote',
    description: "Sets up some reaction for vote!",
    execute(message) {
        // skip DM
        if (!message.guild) { return false; }
        // get config
        const config = CONFIG[message.guild.id].reactionVote;
        const { channel, content } = message;
        if (!config || !config.VOTE_CHANNELS.includes(channel.id)) { return false; }

        // get message
        const lines = content.split('\n');
        for (const line of lines) {
            if (!line.includes('=')) { return false; }

            const split = line.split('=');
            const emoji = split[0].trim();
            message.react(emoji);
        }
    }
}
