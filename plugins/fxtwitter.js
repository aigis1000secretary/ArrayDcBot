
const EMOJI_SMALL_BLUE_DIAMOND = '🔹';
const EMOJI_RECYCLE = '♻️';

const regUrl = /https?:\/\/(www\.|mobile\.)?twitter\.com\/(\S+)\/status\/(\d+)/;

module.exports = {
    name: 'fxtwitter',
    description: "emoji it to fxtwitter!",

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (user.bot) { return false; }

        const { message } = reaction;
        const { client, content } = message;

        if (reaction.emoji.name == EMOJI_SMALL_BLUE_DIAMOND) {
            // 🔹

            // check message target
            if (!regUrl.test(content)) { return; }
            const [, , userID, tweetID] = content.match(regUrl);

            const fxUrl = `https://vxtwitter.com/${userID}/status/${tweetID}`;

            // reply new embed
            await message
                .reply({ content: fxUrl, allowedMentions: { repliedUser: false } })
                .then(msg => msg.react(EMOJI_RECYCLE))
                .catch(() => { });

            message.suppressEmbeds(true).catch(() => { });

        } else if (reaction.emoji.name == EMOJI_RECYCLE) {
            // ♻️

            // check deletable
            if (message.author.id != client.user.id || !message.deletable) { return; }

            // check message target
            if (!content.startsWith(`https://vxtwitter.com/`)) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
        }
    },
}