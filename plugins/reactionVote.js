
module.exports = {
    name: 'reactionVote',
    description: "Sets up some reaction for vote!",
    execute(message) {
        // skip DM
        if (!message.guild) { return false; }

        // get config
        const { client, channel, content } = message;
        let config = client.config[message.guild.id];
        if (!config || !config.reactionVote) { return false; }
        if (!config.reactionVote.VOTE_CHANNELS.includes(channel.id)) { return false; }

        // get message
        const lines = content.split('\n');
        for (const line of lines) {
            if (!line.includes('=')) { continue; }

            const split = line.split('=');
            const emoji = split[0].trim();
            message.react(emoji);
        }
    }
}
