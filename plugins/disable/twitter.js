
const { TWITTER } = require('../config.js');
const [EMOJI_RECYCLE] = ['♻️'];
const { Permissions, MessageEmbed } = require('discord.js');

const request = require("request");
const util = require('util');
const get = util.promisify(request.get);

const oAuthConfig = {
    consumer_key: TWITTER.CONSUMER_KEY,
    consumer_secret: TWITTER.CONSUMER_SECRET,
    token: TWITTER.ACCESS_TOKEN,
    token_secret: TWITTER.ACCESS_TOKEN_SECRET
};

const getTweet = async (id) => {
    const endpointURL = new URL('https://api.twitter.com/labs/2/tweets/' + id);
    const params = {
        'expansions': 'attachments.media_keys,author_id',
        'media.fields': 'url',
        'tweet.fields': 'created_at',
        'user.fields': 'name,profile_image_url'
    };

    const req = await get({ url: endpointURL, oauth: oAuthConfig, qs: params, json: true });

    if (req.body) {
        return req.body;
    } else {
        // throw new Error(`Cannot get tweet <${id}>`);
        console.log(`[twitterBot] Cannot get tweet <${id}>`);
        console.log(req.body.errors)
        return null;
    }
}

module.exports = {
    name: 'twitterBot',
    description: "get twitter really images",
    async execute(message) {
        if (!message.guild) { return false; }

        // get config
        const { client, content } = message;
        let config = client.config[message.guild.id];
        if (!config) { return false; }

        const { command, args } = config.fixMessage(content);
        if (!command) { return false; }

        // get args
        if (command.toLowerCase() != 'twitter') { return; }
        if (args.length < 1 || !/(\/)(\d{18,19})(\?|\/|$)/.test(args[0])) { return; }
        const tweetId = /\d{18,19}/.exec(args[0]).toString();

        // get bot permission
        const guild = message.guild;
        if (!guild) { return console.log("[twitterBot] !guild"); }  // skip PM

        const botPerms = message.channel.memberPermissions(guild.me);
        if (!botPerms.has(Permissions.FLAGS.SEND_MESSAGES)) { return console.log("[twitterBot] SEND_MESSAGES"); }

        // send image msg
        let tweet_data = await getTweet(tweetId);
        if (!tweet_data.includes) { return console.log("[twitterBot] !tweet_data.includes"); }

        // set author info embed
        let embed = new MessageEmbed()
            .setColor(0x333333)
            .setAuthor({
                name: `${tweet_data.includes.users[0].name} @${tweet_data.includes.users[0].username} ${message.author.toString()}`,
                iconURL: tweet_data.includes.users[0].profile_image_url
            })
            .setDescription(tweet_data.data.text)
        message.channel.send({ embeds: [embed] }).then(reply => reply.react(EMOJI_RECYCLE));

        // reply image
        if (Array.isArray(tweet_data.includes.media) && tweet_data.includes.media.length > 0) {
            for (let media of tweet_data.includes.media) {
                if (media.type == "photo") {
                    embed = new MessageEmbed()
                        .setColor(0x333333)
                        .setAuthor({
                            name: `${tweet_data.includes.users[0].name} @${tweet_data.includes.users[0].username} ${message.author.toString()}`,
                            iconURL: tweet_data.includes.users[0].profile_image_url
                        })
                        .setImage(media.url);
                    message.channel.send({ embeds: [embed] }).then(reply => reply.react(EMOJI_RECYCLE));
                }
            }
        }

        if (!botPerms.has(Permissions.FLAGS.MANAGE_MESSAGES)) { return console.log("[twitterBot] MANAGE_MESSAGES"); }
        setTimeout(() => message.delete().catch(() => { }), 250); // Attempt at preventing client glitch where messages don't dissapear
        return true;
    },

    setup(client) {
        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });
            if (reaction.partial) await reaction.fetch().catch(() => { });

            // get msg data
            const message = reaction.message;
            const guild = message.guild;

            if (!guild) { return; }  // skip PM
            if (user.bot) { return; }   // skip bot reaction

            // skip other emoji
            if (reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

            // skip not-deletable
            if (message.author.id != guild.me.id) { return; }
            if (!message.deletable) { return; }

            // check origin author
            if (message.embeds.length <= 0 ||                                           // no embeds
                !message.embeds[0].author ||                                            // no author
                !message.embeds[0].author.name ||                                       // no author name
                !message.embeds[0].author.name.endsWith(`<${user.id}>`)) { return; }    // user is not author

            // // dont need to check this?
            // // // skip msg which didnt react recycle reaction(not this command's reply)
            // // if (!reaction.me) { return console.log(`[twitterBot] reaction.me = ${reaction.me}`); }   // reaction.me only work once?
            // let reactionMe = reaction.users.cache.has(guild.me.id);
            // if (!reactionMe) {
            //     await reaction.users.fetch().catch(() => { });   // re-check cache
            //     reactionMe = reaction.users.cache.has(guild.me.id);
            // }
            // if (!reactionMe) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
        });
    }
}
