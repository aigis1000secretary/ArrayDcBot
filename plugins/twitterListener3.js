
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const request = require('../modules/undici-request.js');

// const
const [EMOJI_RECYCLE] = ['♻️']
const regUrl = /https:\/\/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)(?:\/status\/)(\d+)/;

const EMBED_BY_DISCORD = false;
const DISABLE_CLOCK_METHOD = false;

let tllog = fs.existsSync("./.env") ? console.log : () => { };
const getDiscordSnowflake = (time) => (BigInt(time - 14200704e5) << 22n);
const getTwitterSnowflake = (time) => (BigInt(time - 1288834974657) << 22n);
const getTimeFromDiscordSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 14200704e5);
const getTimeFromTwitterSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 1288834974657);

// tl3-dlimg
// const downloadFile = (url, filepath) => request.request({ url }).then((response) => request.pipe(response.body, fs.createWriteStream(filepath)));

const { chromeDriver, webLog } = require('./webdriver.js');

const findLastTwitterMessage = async (channel, uID) => {
    let oldMessages = await channel.messages.fetch().catch((e) => {
        console.log(channel, uID, e.message)
    });
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
const chromeDriverSearchTweet = async ({ dataNum, after, before, keywords, channel }) => {
    if (sending.has(channel?.id)) { return; }
    sending.add(channel?.id);

    let unitl = '';
    if (!!after && !!before && getTimeFromTwitterSnowflake(before) - getTimeFromTwitterSnowflake(after) > 1 * 24 * 60 * 60 * 1000) {
        let timeAfter = new Date(getTimeFromTwitterSnowflake(after) + 1 * 24 * 60 * 60 * 1000);
        unitl = `until:${timeAfter.getFullYear()}-${(timeAfter.getMonth() + 1).toString().padStart(2, '0')}-${timeAfter.getDate().toString().padStart(2, '0')} `;
    }
    let uKeywords = [];
    for (let keyword of keywords) {
        uKeywords.push(unitl + keyword);
    }

    let searchResult = await chromeDriver.searchKeywords(uKeywords, { dataNum, after, before });
    if (searchResult.size == 0) { sending.delete(channel?.id); return; }

    // searchResult = Map(<tID>, <tweet>)
    tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);

    let tIDs = Array.from(searchResult.keys()).sort();

    let lastTID = tIDs.length > 0 ? tIDs[tIDs.length - 1] : null;

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
            // tl3-dlimg
            // let images = [];

            let embeds = [];
            if (author) {
                try {
                    let embed = new EmbedBuilder()
                        .setURL(url).setDescription(description)
                        .setTimestamp(timestamp).setAuthor(author)
                        // .setColor(1942002);
                        .setColor(0);
                    embed.data.type = 'rich';

                    embed.setFooter({ text: `Twitter`, iconURL: `https://abs.twimg.com/icons/apple-touch-icon-192x192.png` });

                    embeds.push(embed);
                } catch (e) {
                    console.log(`/plugins/twitterListener3.js:65:42`, e.message);
                    console.log('url', url);
                    console.log('description', description);
                    console.log('timestamp', timestamp);
                    console.log('author', author);
                }
            }
            for (let i = 0; i < media.length; ++i) {

                if (!embeds[i]) {
                    embeds[i] = new EmbedBuilder().setURL(url);
                    embeds[i].data.type = 'rich';
                }

                let m = media[i];
                if (m.image) {
                    embeds[i].setImage(m.image.url);
                    // tl3-dlimg
                    // images.push(m.image.url);
                }
                if (m.video) {
                    embeds[i].setImage(m.video.url);
                    embeds[0].setThumbnail(`https://media.discordapp.net/attachments/947064593329557524/1160521922828832859/video.png`);
                }
            }

            let payload = { content: `<${url}>`, embeds, files: [] };
            // tweetEmbedsCache.set(tID, payload);

            /*
            // tl3-dlimg
            if (images.length > 0) {

                const username = author.url.replace('https://twitter.com/', '');
                const nowDate = (new Date(timestamp).toLocaleString('en-ZA'))
                    .replace(/[\/:]/g, '').replace(', ', '_');

                let j = 0, lastTID = '';
                for (const image of images) {
                    if (lastTID != tID) {
                        j = 1;
                        lastTID = tID;
                    } else {
                        ++j;
                    }

                    const [, ext] = image.match(/([^\.]+)$/) || [, null];
                    if (!image || !ext) { continue; }
                    let dlImage = image.replace(`.${ext}`, `?format=${ext}&name=orig`);

                    let folderPath = `./image/${username}`;
                    let filename = `${username}-${tID}-${nowDate}-img${j}.${ext}`
                    let filePath = `${folderPath}/${filename}`;

                    // set folder
                    if (!fs.existsSync(folderPath)) { fs.mkdirSync(folderPath, { recursive: true }); }

                    // download
                    if (!fs.existsSync(filePath)) {

                        await downloadFile(dlImage, filePath);
                        if (!fs.statSync(filePath)?.size) {
                            fs.unlinkSync(filePath);
                            await downloadFile(image, filePath);
                        }

                        console.log(`donwload image ${filename}`);
                    } else {
                        console.log(`    skip image ${filename}`);
                    }
                }
                contniue;
            }//*/

            await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
            //*/
        }
    }

    tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);
    sending.delete(channel?.id);

    if (unitl != '' && !!lastTID) {
        // sending.delete(channel?.id);
        let _after = after;
        if (lastTID) { _after = BigInt(lastTID); }
        chromeDriverSearchTweet({ dataNum, after: _after, before, keywords, channel });
    }
}





module.exports = {
    name: 'twitterListener3',
    description: "search twitter every hour",

    async execute(message, pluginConfig, command, args, lines) {

        const { channel, client } = message;

        if (command == 'tldebug' && message.client.user.id == client.user.id) {
            tllog = (tllog == console.log) ? () => { } : console.log;
            webLog();
            return;
        }

        if (!chromeDriver.active) { return; }

        if (command == 'tl3') {

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
            // chromeDriverSearchTweet({ dataNum: 1000, after, before, keywords, channel });
            setTimeout(() => message.delete().catch(() => { }), 250);

        } else if (command == 'getuid') {

            if (args[0]) {

                if (regUrl.test(args[0])) {
                    // !getuid https://twitter.com/<username>/status/<tID>

                    let [, username, tID] = args[0].match(regUrl);

                    let { uID } = await chromeDriver.getUserData({ username });
                    if (!uID) { channel.send(`[TL3] getudi fail`).catch(() => { }); return; }

                    // reply
                    if (EMBED_BY_DISCORD) {
                        await channel.send(`https://twitter.com/${uID}/status/${tID}`).catch(() => { });
                    } else {
                        let tweet = await chromeDriver.getTweetByTID({ tID, username });
                        if (tweet) {
                            let { url, timestamp, description, author, media } = tweet;

                            // embed from crawler data
                            // /*
                            let embeds = [];
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
                                    embeds[0].setThumbnail(`https://media.discordapp.net/attachments/947064593329557524/1160521922828832859/video.png`);
                                }
                            }

                            let payload = { content: `<https://twitter.com/${uID}/status/${tID}>`, embeds, files: [] };

                            await channel.send(payload).catch(console.error);
                        }
                    }

                    if (message.author.id == client.user.id) { await message.delete().catch(() => { }); }

                    return;

                } else {
                    // !getuid <username>

                    let { uID } = await chromeDriver.getUserData({ username: args[0] });
                    if (uID) {
                        channel.send(`adduid ${args[0]} ${uID}`).catch(() => { });
                    } else {
                        channel.send(`[TL3] getudi fail`).catch(() => { });
                    }
                    return;
                }

            } else {

                if (channel.id == '872122458545725451') {

                    await message.delete().catch(() => { });

                    let before;
                    let usernames = [];
                    while (1) {
                        let msgs = await channel.messages.fetch({ before, force: true });
                        if (msgs.size <= 0) { break; };

                        for (let [mID, msg] of msgs) {
                            before = mID;

                            if (!msg.content) { continue; }
                            if (msg.content.includes('\n')) { continue; }

                            let [, username] = msg.content.match(/^\[\+\] ([^-\.]+)$/) || [, null];
                            if (!username) { console.log(mID, msg.content); continue; }

                            usernames.push({ username, mID, msg });
                        }
                    }
                    usernames.reverse();
                    for (let { username, mID, msg } of usernames) {

                        let userData = await chromeDriver.getUserData({ username });

                        console.log(mID, 'delete:', (!userData.uID && userData.suspended), `[+]`, username);

                        if (userData.uID) { continue; }
                        if (!userData.suspended) { continue; }

                        await msg.delete().catch(() => { });
                    }
                }
                return;
            }

        } else if (command == 'report') {

            let userList = ['null'];
            // get usernames
            if (fs.existsSync(`./blacklist`) && fs.existsSync(`./blacklist/fakeuser`)) {
                userList = userList.concat(fs.readdirSync(`./blacklist/fakeuser`));
            }

            if (args.length > 1 && userList.includes(args[0])) {
                let names = args.concat();
                let fakeuser = names.shift();

                for (let username of names) {
                    // !report <username>
                    await chromeDriver.reportUser({ username, fakeuser });
                }
                return;

            } else if (userList.length > 0) {
                let description = [];
                for (let username of userList) {
                    description.push(`!report ${username} ${args.join(' ')}`)
                }

                let embed = new EmbedBuilder()
                    .setTitle(`fakeuser list:`).setDescription(description.join('\n\n'))
                await channel.send({ embeds: [embed] });
            }

        } else if (command == 'mute' && args.length > 0) {

            for (let username of args) {
                // !mute <username> <username>
                await chromeDriver.muteUser({ username });
            }
            return;

        } else if (command == 'block' && args.length > 0) {

            for (let username of args) {
                // !mute <username> <username>
                await chromeDriver.blockUser({ username });
            }
            return;

        } else if (command == 'fixembed') {

            await message.delete().catch(() => { });

            let before;
            while (1) {
                let msgs = await channel.messages.fetch({ before, force: true });
                if (msgs.size <= 0) { break; };

                msgs = msgs.reverse();

                for (let [mID, msg] of msgs) {
                    before = mID;
                    console.log(mID, msg.content)

                    const { content, embeds } = msg;
                    if (embeds && embeds[0] && !embeds[0].color) { continue; }  // skip msg with embed
                    if (!content || !content.match(regUrl)) { continue; }   // skip not tweet url msg
                    // if (content.startsWith('<') || content.endsWith('>')) { continue; } // skip non-embed msg
                    // if (embeds && embeds[0]) { continue; }  // skip msg with embed

                    // get username & tID
                    let [, username, tID] = content.match(regUrl) || [null, null];

                    // get tweet data
                    let tweet = await chromeDriver.getTweetByTID({ tID, username });
                    if (!tweet) { continue; }
                    else {
                        let { url, timestamp, description, author, media } = tweet;

                        // embed from crawler data
                        // /*
                        let embeds = []
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
                                embeds[0].setThumbnail(`https://media.discordapp.net/attachments/947064593329557524/1160521922828832859/video.png`);
                            }
                        }

                        let payload = { content: `<${url}>`, embeds, files: [], allowedMentions: { repliedUser: false } };
                        // tweetEmbedsCache.set(tID, payload);
                        if (msg.author.id == client.user.id) {
                            // await msg.edit(payload).catch((e) => console.error(e));
                            await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE)).catch((e) => console.error(e));
                        } else {
                            // await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                            // await msg.delete().catch(() => { });
                            await channel.send(payload).then(msg => msg.react(EMOJI_RECYCLE)).catch((e) => console.error(e));
                        }
                    }
                }

                if (Date.now() - getTimeFromDiscordSnowflake(before) > 86400000 * 7) { break; } // only check last 1 week

                if (args[0] != 'all') { break; }
            }

            console.log('fixembed done!')
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        // only run in ubuntu
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
            setTimeout(() => message.delete().catch(console.log), 250);
        }
    },

    async setup(client) {

        if (!chromeDriver.active) { return; }

        client.once('close', () => {
            chromeDriver.close();
        });
    },

    async clockMethod(client, { hours, minutes, seconds }) {

        if (!chromeDriver.active) { return; }

        if (DISABLE_CLOCK_METHOD) { return; }

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