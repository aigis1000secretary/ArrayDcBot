
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

// const
const [EMOJI_RECYCLE] = ['♻️']
const regUrl = /https:\/\/twitter\.com\/([a-zA-Z0-9_]+)(?:\/status\/)(\d+)/;
const EMBED_BY_DISCORD = false;

let tllog = fs.existsSync("./.env") ? console.log : () => { };

const getDiscordSnowflake = (time) => (BigInt(time - 14200704e5) << 22n);
const getTwitterSnowflake = (time) => (BigInt(time - 1288834974657) << 22n);
const getTimeFromDiscordSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 14200704e5);
const getTimeFromTwitterSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 1288834974657);

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

// let tweetEmbedsCache = new Map();
let sending = new Set();
const chromeDriverSearchTweet = async ({ after, before, keywords, channel }) => {
    if (sending.has(channel?.id)) { return; }

    chromeDriver.searchKeywords(keywords, { after, before })
        .then(async (searchResult) => {
            if (searchResult.size == 0) { return; }

            // searchResult = Map(<tID>, <tweet>)
            tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);
            sending.add(channel?.id);

            let tIDs = Array.from(searchResult.keys()).sort();
            for (let i = 0; i < tIDs.length; ++i) {
                let tID = tIDs[i];

                tllog(`Discord send. [${(i + 1).toString().padStart(4, ' ')}/${tIDs.length.toString().padStart(4, ' ')}]`);

                let { url, timestamp, description, author, media } = searchResult.get(tID);
                media = media || [];

                if (EMBED_BY_DISCORD) {
                    // embed by discord
                    await channel.send({ content: url }).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                } else {
                    // embed from crawler data
                    // /*
                    let embeds = [], files;
                    if (author) {
                        let embed = new EmbedBuilder()
                            .setURL(url).setDescription(description)
                            .setTimestamp(timestamp).setAuthor(author)
                            // .setColor(1942002);
                            .setColor(0);
                        embed.data.type = 'rich';

                        embed.setFooter({ text: `Twitter`, iconURL: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png` });

                        embeds.push(embed);
                    }
                    for (let i = 0; i < media.length; ++i) {

                        if (!embeds[i]) {
                            embeds[i] = new EmbedBuilder().setURL(url);
                            embeds[i].data.type = 'rich';
                        }

                        let m = media[i];
                        if (m.image) { embeds[i].setImage(m.image.url); }
                        if (m.video) {
                            embeds[i].setImage(m.video.url);
                            files = [new AttachmentBuilder('./video.png', { name: `video.png` })];
                            embeds[0].setThumbnail(`attachment://video.png`);
                        }
                    }

                    let payload = { content: `<${url}>`, embeds, files };
                    // tweetEmbedsCache.set(tID, payload);
                    await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                    //*/
                }
            }

            tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);
            sending.delete(channel?.id);
        });
}





module.exports = {
    name: 'twitterListener3',
    description: "search twitter every hour",

    async execute(message, pluginConfig, command, args, lines) {

        if (command == 'tldebug' && message.client.id == client.user.id) {
            tllog = (tllog == console.log) ? () => { } : console.log;
            return;
        }

        if (!chromeDriver.isWin32) { return; }

        if (command == 'tl3') {

            let { client, channel } = message;

            // get channel id
            const cID = channel.id;

            // get last times tweet ID
            const before = getTwitterSnowflake(Date.now());
            let after;
            let lastMessage = await findLastTwitterMessage(channel, client.user.id)
            let [, , tID] = lastMessage.content.match(regUrl) || [];
            if (tID) { after = BigInt(tID); }
            else if (args[0]) { after = BigInt(args[0]); }

            // get keywords from config
            const config = pluginConfig.find((cfg) => { return cID == cfg.RETWEET_CHANNEL_ID });
            if (!config) { return; }
            let keywords = config.RETWEET_KEYWORD;

            chromeDriverSearchTweet({ after, before, keywords, channel });
            setTimeout(() => message.delete().catch(() => { }), 250);

        } else if (command == 'getuid') {

            if (args[0] && regUrl.test(args[0])) {
                let [, username, tID] = args[0].match(regUrl);

                let { uID } = await chromeDriver.getUserData({ username });
                if (!uID) { return; }

                if (EMBED_BY_DISCORD) {
                    await message.channel.send(`https://twitter.com/${uID}/status/${tID}`).catch(() => { });
                } else {
                    let tweet = await chromeDriver.getTweetByTID({ tID, username });
                    if (tweet) {
                        let { url, timestamp, description, author, media } = tweet;

                        // embed from crawler data
                        // /*
                        let embeds = [], files;
                        if (author) {
                            let embed = new EmbedBuilder()
                                .setURL(url).setDescription(description)
                                .setTimestamp(timestamp).setAuthor(author)
                                // .setColor(1942002);
                                .setColor(0);
                            embed.data.type = 'rich';

                            embed.setFooter({ text: `Twitter`, iconURL: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png` });

                            embeds.push(embed);
                        }
                        for (let i = 0; i < media.length; ++i) {

                            if (!embeds[i]) {
                                embeds[i] = new EmbedBuilder().setURL(url);
                                embeds[i].data.type = 'rich';
                            }

                            let m = media[i];
                            if (m.image) { embeds[i].setImage(m.image.url); }
                            if (m.video) {
                                embeds[i].setImage(m.video.url);
                                files = [new AttachmentBuilder('./video.png', { name: `video.png` })];
                                embeds[0].setThumbnail(`attachment://video.png`);
                            }
                        }

                        let payload = { content: `<https://twitter.com/${uID}/status/${tID}>`, embeds, files };

                        await message.channel.send(payload).catch(() => { });
                    }
                }

                setTimeout(() => message.delete().catch(() => { }), 250);

            } else if (chromeDriver.searching) {
                message.channel.send(`chromeDriver.searching...`).catch(() => { });
            } else if (args[0]) {
                let { uID } = await chromeDriver.getUserData({ username: args[0] });
                if (!uID) { return; }

                message.channel.send(`adduid ${args[0]} ${uID}`).catch(() => { });
            } else {

                const { channel } = message;
                await message.delete().catch(() => { });

                let before;
                while (1) {
                    let msgs = await channel.messages.fetch({ before, force: true });
                    if (Array.from(msgs.keys()).find((mID) => (before == mID))) { break; };

                    for (let [mID, msg] of msgs) {
                        before = mID;

                        let [, username] = msg.content?.match(/^\[\+\] ([^-\.]+)$/) || [, null];
                        if (!username) { console.log(mID, msg.content); continue; }

                        let userData = await chromeDriver.getUserData({ username });

                        console.log(mID, 'delete:', (!userData.uID && userData.suspended), `[+]`, username);

                        if (userData.uID) { continue; }
                        if (!userData.suspended) { continue; }

                        await msg.delete().catch(() => { });
                    }
                }
            }

        } else if (command == 'fixembed') {

            const { channel, client } = message;

            await message.delete().catch(() => { });

            let before;
            while (1) {
                let msgs = await channel.messages.fetch({ before, force: true });
                if (msgs.size <= 0 || Array.from(msgs.keys()).find((mID) => (before == mID))) { break; };

                for (let [mID, msg] of msgs) {
                    before = mID;

                    const { content, embeds } = msg;
                    if (!content || !content.match(regUrl)) { continue; }   // skip not tweet url msg
                    if (content.startsWith('<') || content.endsWith('>')) { continue; } // skip non-embed msg
                    if (embeds && embeds[0]) { continue; }  // skip msg with embed

                    // get username & tID
                    let [, username, tID] = content.match(regUrl) || [null, null];

                    // get tweet data
                    let tweet = await chromeDriver.getTweetByTID({ tID, username });
                    if (!tweet) { continue; }
                    else {
                        let { url, timestamp, description, author, media } = tweet;

                        // embed from crawler data
                        // /*
                        let embeds = [], files;
                        if (author) {
                            let embed = new EmbedBuilder()
                                .setURL(url).setDescription(description)
                                .setTimestamp(timestamp).setAuthor(author)
                                // .setColor(1942002);
                                .setColor(0);
                            embed.data.type = 'rich';

                            embed.setFooter({ text: `Twitter`, iconURL: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png` });

                            embeds.push(embed);
                        }
                        for (let i = 0; i < media.length; ++i) {

                            if (!embeds[i]) {
                                embeds[i] = new EmbedBuilder().setURL(url);
                                embeds[i].data.type = 'rich';
                            }

                            let m = media[i];
                            if (m.image) { embeds[i].setImage(m.image.url); }
                            if (m.video) {
                                embeds[i].setImage(m.video.url);
                                files = [new AttachmentBuilder('./video.png', { name: `video.png` })];
                                embeds[0].setThumbnail(`attachment://video.png`);
                            }
                        }

                        let payload = { content: `<${url}>`, embeds, files };
                        // tweetEmbedsCache.set(tID, payload);
                        if (msg.author.id == client.user.id) {
                            await msg.edit(payload).catch(() => { });
                        } else {
                            await msg.delete().catch(() => { });
                            await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                        }
                    }
                }

                if (Date.now() - getTimeFromDiscordSnowflake(before) > 86400000 * 7) { break; } // only check last 1 week
            }

            console.log('fixembed done!')
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

        // if (true) { return; }

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
                const before = getTwitterSnowflake(Date.now());
                let after;
                let lastMessage = await findLastTwitterMessage(channel, client.user.id)
                let [, , tID] = lastMessage.content.match(regUrl) || [];
                if (tID) { after = BigInt(tID); }

                // get keywords from config
                let keywords = config.RETWEET_KEYWORD;

                chromeDriverSearchTweet({ after, before, keywords, channel });
            }
        }
    },
}