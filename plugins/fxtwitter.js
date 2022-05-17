
const CLOCK_Colon = '🔹';
const EMOJI_RECYCLE = '♻️';

let regUrl = /https?:\/\/(www\.|mobile\.)?twitter\.com\/(\S+)\/status\/(\d+)/;

module.exports = {
    name: 'fxtwitter',
    description: "emoji it to fxtwitter!",
    // execute(message) { },
    setup(client) {
        client.on('messageReactionAdd', async (reaction, user) => {
            if (reaction.emoji.name != CLOCK_Colon) { return false; }
            if (user.bot) { return false; }
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });

            const { message } = reaction;
            const { content, channel } = message;
            if (!regUrl.test(content)) { return; }

            const [, , userID, tweetID] = content.match(regUrl);
            const fxUrl = `https://vxtwitter.com/${userID}/status/${tweetID}`;

            // reply new embed
            (await message.reply({ content: fxUrl, allowedMentions: { repliedUser: false } }))
                .react(EMOJI_RECYCLE).catch(() => { });

            message.suppressEmbeds(true).catch(() => { });
        });


        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });
            if (reaction.partial) await reaction.fetch().catch(() => { });

            // skip other emoji
            if (reaction.emoji.toString() != EMOJI_RECYCLE) { return; }
            // skip bot reaction
            if (user.bot) { return; }

            // get msg data
            const { message } = reaction;
            // not send by bot
            if (message.author.id != client.user.id) { return; }
            // // skip not-deletable
            // if (!message.deletable) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
        });
    }
}
