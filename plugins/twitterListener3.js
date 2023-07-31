
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

// const
const [EMOJI_RECYCLE] = ['♻️']
const regUrl = /https:\/\/twitter\.com\/([a-zA-Z0-9_]+)(?:\/status\/)(\d+)/;

let tllog = fs.existsSync("./.env") ? console.log : () => { };

const { chromeDriver } = require('./webdriver.js') || require('./plugins/webdriver.js');;

const findLastTwitterMessage = async (channel, uID) => {
    let oldMessages = await channel.messages.fetch().catch(() => { });
    for (let key of Array.from(oldMessages.keys()).sort().reverse()) {
        let oldMessage = oldMessages.get(key);
        // only check bot message
        if (oldMessage.author?.id != uID) { continue; }
        // check message target
        if (!regUrl.test(oldMessage.content)) { continue; }

        return oldMessage;
    }
    return { content: '' };
}

const chromeDriverSearchTweet = async ({ after, keywords, channel }) => {
    chromeDriver.searchKeywords(keywords, { after })
        .then(async (searchResult) => {
            if (searchResult.size == 0) { return; }

            // searchResult = Map(<tID>, <tweet>)
            tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);

            let tIDs = Array.from(searchResult.keys()).sort();
            for (let i = 0; i < tIDs.length; ++i) {
                let tID = tIDs[i];

                tllog(`Discord send. [${(i + 1).toString().padStart(4, ' ')}/${tIDs.length.toString().padStart(4, ' ')}]`);

                let { url, timestamp, description, author, media } = searchResult.get(tID);
                media = media || [];

                await channel.send({ content: url }).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));

                /*
                // disable crawler embed
                let embeds = [], files;
                if (author) {
                    let embed = new EmbedBuilder()
                        .setURL(url).setDescription(description)
                        .setColor(1942002).setTimestamp(timestamp)
                        .setAuthor(author);
                    embed.data.type = 'rich';
                    embed.setFooter({ text: `Twitter`, iconURL: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png` });

                    // if found video
                    for (let m of media) {
                        if (!m.video) { continue; }
                        files = [new AttachmentBuilder('./video.png', { name: `video.png` })];
                        embed.setThumbnail(`attachment://video.png`);
                        break;
                    }

                    embeds.push(embed);
                }
                for (let i = 0; i < media.length; ++i) {

                    if (!embeds[i]) {
                        embeds[i] = new EmbedBuilder().setURL(url);
                        embeds[i].data.type = 'rich';
                    }

                    let m = media[i];
                    if (m.image) { embeds[i].setImage(m.image.url); }
                    if (m.video) { embeds[i].setImage(m.video.url); }
                }

                await channel.send({ content: url, embeds, files }).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                //*/
            }

            tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);
        });
}





module.exports = {
    name: 'twitterListener3',
    description: "search twitter every hour",

    async execute(message, pluginConfig, command, args, lines) {

        if (!chromeDriver.isWin32) { return; }

        if (command == 'tl3') {

            let { client, channel } = message;

            // get channel id
            const cID = channel.id;

            // get last times tweet ID
            let after;
            let lastMessage = await findLastTwitterMessage(channel, client.user.id)
            let [, , tID] = lastMessage.content.match(regUrl) || [];
            if (tID) { after = BigInt(tID); }

            // get keywords from config
            const config = pluginConfig.find((cfg) => { return cID == cfg.RETWEET_CHANNEL_ID });
            if (!config) { return; }
            let keywords = config.RETWEET_KEYWORD;

            chromeDriverSearchTweet({ after, keywords, channel });
            setTimeout(() => message.delete().catch(() => { }), 250);

        } else if (command == 'tldebug') {

            tllog = (tllog == console.log) ? () => { } : console.log;

        } else if (command == 'getuid' && args[0]) {

            if (regUrl.test(args[0])) {
                let [, username, tID] = args[0].match(regUrl);
                let { uID } = await chromeDriver.getUserData({ username });

                message.channel.send(`https://twitter.com/${uID}/status/${tID}`).catch(() => { });
                setTimeout(() => message.delete().catch(() => { }), 250);

            } else if (chromeDriver.searching) {
                message.channel.send(`chromeDriver.searching...`).catch(() => { });
            } else {
                let { uID } = await chromeDriver.getUserData({ username: args[0] });
                if (!uID) { return; }
                message.channel.send(`adduid ${args[0]} ${uID}`).catch(() => { });
            }

        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (chromeDriver.isWin32) { return; }

        // skip bot reaction
        if (user.bot) { return false; }

        const { message } = reaction;
        const { client, channel, content } = message;

        if (reaction.emoji.name != EMOJI_RECYCLE) { return false; }

        // ♻️

        // check deletable
        if (message.author.id != client.user.id || !message.deletable) { return tllog('deletable'); }

        // check message target
        if (!regUrl.test(content)) { return tllog('content'); }

        // skip not target channel
        const config = pluginConfig.find((cfg) => { return message.channel.id == cfg.RETWEET_CHANNEL_ID });
        if (!config || reaction.count <= (config.RETWEET_DELCOUNT || 1)) { return tllog('RETWEET_DELCOUNT'); }

        let lastMessage = await findLastTwitterMessage(channel, client.user.id)
        let [, , delTweetID] = content.match(regUrl);
        let [, , oldTweetID] = lastMessage.content.match(regUrl);
        if (BigInt(oldTweetID) > BigInt(delTweetID)) {
            setTimeout(() => message.delete().catch(() => { }), 250);
        }
    },

    async setup(client) {

        if (!chromeDriver.isWin32) { return; }

        client.once('close', () => {
            chromeDriver.close();
        });
    },

    async clockMethod(client, { hours, minutes, seconds }) {

        if (!chromeDriver.isWin32) { return; }

        // update tweet at time

        // update flag
        let update = ([30].includes(minutes) && seconds == 0);
        if (!update) { return; }

        for (let gID of client.guildConfigs.keys()) {
            const pluginConfig = client.getPluginConfig(gID, 'twitterListener3');
            if (!pluginConfig) { continue; }

            for (const config of pluginConfig) {
                // get channel id
                const cID = config.RETWEET_CHANNEL_ID;
                const channel = await client.channels.fetch(cID);

                // get last times tweet ID
                let after;
                let lastMessage = await findLastTwitterMessage(channel, client.user.id)
                let [, , tID] = lastMessage.content.match(regUrl) || [];
                if (tID) { after = BigInt(tID); }

                // get keywords from config
                let keywords = config.RETWEET_KEYWORD;

                chromeDriverSearchTweet({ after, keywords, channel });
            }
        }
    },
}