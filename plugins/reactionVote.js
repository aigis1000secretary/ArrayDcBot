
module.exports = {
    name: 'reactionVote',
    description: "Sets up some reaction for vote!",

    execute(message, pluginConfig, command, args, lines) {

        // get config
        const { channel, content } = message;
        if (!pluginConfig.VOTE_CHANNELS.includes(channel.id)) { return false; }

        // get message
        for (const line of content.split('\n')) {
            if (!line.includes('=')) { continue; }

            const split = line.split('=');
            const emoji = split[0].trim();
            message.react(emoji).catch(console.log);
        }
    }
}
