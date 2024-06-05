
const EMOJI_SMALL_BLUE_DIAMOND = '🔹';
const EMOJI_RECYCLE = '♻️';

const regUrl = /https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/(\S+)\/status\/(\d+)/;

module.exports = {
    name: 'fxtwitter',
    description: "emoji it to fxtwitter!",

    execute(message, pluginConfig, command, args, lines) {
        const { content, author, components } = message;

        if (author.bot) {
            const url = (message.components || [])[0]?.components[0].url
            if (!regUrl.test(url)) { return; }

            message.reply({ content: url.replace('twitter', 'fxtwitter') }).catch(() => { });
            return;

        } else {
            /*
            if (!regUrl.test(content)) { return; }

            message.react(EMOJI_SMALL_BLUE_DIAMOND).catch(() => { });  // EMOJI_SMALL_BLUE_DIAMOND
            return;
            //*/
        }

    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (user.bot) { return false; }

        const { message } = reaction;
        const { client, content } = message;

        if (reaction.emoji.name == EMOJI_SMALL_BLUE_DIAMOND) {
            // 🔹

            // check message target
            if (!regUrl.test(content)) { return; }
            const [, userID, tweetID] = content.match(regUrl);

            const fxUrl = `https://fxtwitter.com/${userID}/status/${tweetID}`;

            // reply new embed
            await message
                .reply({ content: fxUrl, allowedMentions: { repliedUser: false } })
                .then(msg => msg.react(EMOJI_RECYCLE))
                .catch(() => { });

            // message.suppressEmbeds(true).catch(() => { });

        } else if (reaction.emoji.name == EMOJI_RECYCLE) {
            // ♻️

            // check deletable
            if (message.author.id != client.user.id || !message.deletable) { return; }

            // check message target
            if (!content.startsWith(`https://fxtwitter.com/`)) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
        }
    },
}