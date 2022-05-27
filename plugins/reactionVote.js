
module.exports = {
    name: 'reactionVote',
    description: "Sets up some reaction for vote!",
    execute(message) {
        // skip DM
        if (!message.guild) { return false; }

        // get config
        const { client, channel, content } = message;
        const config = client.config[message.guild.id];
        if (!config || !config.reactionVote) { return false; }
        if (!config.reactionVote.VOTE_CHANNELS.includes(channel.id)) { return false; }

        // get message
        for (const line of content.split('\n')) {
            if (!line.includes('=')) { continue; }

            const split = line.split('=');
            const emoji = split[0].trim();
            message.react(emoji).catch(console.log);
        }
    }
}
