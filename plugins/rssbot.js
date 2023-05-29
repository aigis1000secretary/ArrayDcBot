const [EMOJI_RECYCLE, EMOJI_ENVELOPE_WITH_ARROW] = ['♻️', '📩']

const { EmbedBuilder } = require('discord.js');
// const server = require('../server');
const xml2js = require(`xml2js`);
// const express = require('express');
// let client = null;

const requestGet = require('util').promisify(require('request').get);
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };

// check rss and send embeds
const checkRss = async (client, nowMinutes) => {
    if (require('fs').existsSync("./.env")) { console.log('checkRss') }

    // get each guild config
    for (let gID of client.guildConfigs.keys()) {

        // get single guild config
        const config = client.getPluginConfig(gID, 'rssbot');
        if (!config) { continue; }

        // get each rss config
        for (const { RSS_CHANNEL_ID, RSS_FEEDURL } of config) {
            // check config data
            if (!RSS_CHANNEL_ID || !RSS_FEEDURL) { continue; }

            if (nowMinutes % 30 != 0 && RSS_FEEDURL.includes('hentai-share.com')) { continue; }

            // check discord channel
            const channel = await client.channels.fetch(RSS_CHANNEL_ID);
            if (!channel) { continue; }
            // get message log
            let messages = await channel.messages.fetch().catch(() => { }) || [];
            let lastPostTimestamp = 0;
            for (let key of messages.keys()) {
                let message = messages.get(key);
                // only check bot message
                if (message.author?.id != client.user.id) { continue; }
                // only check message with embed;
                if (!message.embeds[0]) { continue; }

                // only check embed url in same host;
                let workUrl = new URL(RSS_FEEDURL);
                let oldUrl = new URL(message.embeds[0].url || 'https://127.0.0.1/');
                if (workUrl.host != oldUrl.host) { continue; }

                let messageTimestamp = new Date(message.embeds[0].timestamp).getTime();
                lastPostTimestamp = Math.max(lastPostTimestamp, messageTimestamp);
            }

            // get rss feed xml
            const xml = await getXML(RSS_FEEDURL);
            if (!xml) { continue; }
            const items = (await xmlTojson(xml)).item;

            // set rss embed
            const embeds = await itemsToEmbeds(items);
            // sort
            embeds.sort((a, b) => {
                let tA = a.timestamp, tB = b.timestamp;
                return (tA == tB) ? 0 : (tA > tB) ? 1 : -1;
            })
            // send embeds
            let newRss = false;
            for (let embed of embeds) {
                // check last post time
                if (embed.timestamp > lastPostTimestamp) {
                    // send msg
                    channel.send({ embeds: [new EmbedBuilder(embed)] })
                        .then(async (msg) => {
                            await msg.react(EMOJI_RECYCLE).catch(() => { });

                            let field = embed.fields.find(field => field.name == 'Product id');
                            if (field) { await msg.react(EMOJI_ENVELOPE_WITH_ARROW).catch(() => { }); }
                        });
                    newRss = true;
                } else {
                    let message = messages.find((msg) => (msg && msg.embeds && msg.embeds[0]?.url == embed.url))

                    if (message) {
                        let embed0 = message.embeds[0];
                        if ((embed.author?.name != embed0.author?.name) ||
                            (JSON.stringify(embed.fields) != JSON.stringify(embed0.fields)) ||
                            (embed.image?.url != embed0.image?.url) ||
                            (embed.timestamp != new Date(embed0.timestamp).getTime()) ||
                            (embed.title != embed0.title)) {
                            message.edit({ embeds: [new EmbedBuilder(embed)] })
                                // .catch(() => { })
                                .catch(console.log);
                        }
                    }
                }
            }
            // check old rss
            if (newRss) { checkLastRss(client, RSS_CHANNEL_ID, RSS_FEEDURL); }
        }
    }
}
// http decode
const decodeEntities = (encodedString) => {
    let translate_re = /&(nbsp|amp|quot|lt|gt);/g;
    let translate = {
        "nbsp": " ",
        "amp": "&",
        "quot": "\"",
        "lt": "<",
        "gt": ">"
    };
    return encodedString.replace(translate_re, function (match, entity) {
        return translate[entity];
    }).replace(/&#(\d+);/gi, function (match, numStr) {
        let num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    });
}
const reg2 = new RegExp(/(Circle[：:])|(Brand[：:])(\<\/span ?\>)?([^\<]+)\</, 'i');
const reg3 = new RegExp(/\<img[^>]*src=\"([^\"]+)\"/, 'i');
const reg4 = new RegExp(/[_\/]([RBV]J\d{6,})[_\.]/, 'i');
// rss feed item to discord embeds
const itemsToEmbeds = async (items) => {
    let result = [];

    if (!Array.isArray(items)) {
        console.log(items);
        return result;
    }

    // get feed items
    for (const item of items) {
        let { title, link, pubDate, category, guid, description } = item;
        let contentEncoded = '';
        try {
            title = title[0]; link = link[0]; pubDate = pubDate[0];
            category = category[0]; guid = guid[0]; description = description[0];
            contentEncoded = item['content:encoded'] ? item['content:encoded'][0] : description;

            link = guid._ || link;
        } catch (error) {
            console.log(`[rssbot] item read error!`);
            console.log(error);
            continue;
        }

        const pubTime = Date.parse(pubDate);
        // const pubLocaleDate = new Date(pubTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        let color = parseInt(require('crypto').createHash('md5').update((new URL(link)).host).digest('hex').substring(0, 6), 16);
        let embed = {
            color,
            url: link,
            // description: contentEncoded,
            fields: [{ name: 'category', value: category, inline: false }],
            timestamp: pubTime,
        };

        let match = null;
        // get title
        if (title) { embed.title = title.replace(/\[\d{6,}]/, '').trim(); }

        // get Circle
        match = contentEncoded.match(reg2);
        if (match && match[4]) { embed.author = { name: decodeEntities(match[4]).trim() }; }

        // get image
        match = contentEncoded.match(reg3);
        if (match && match[1]) { embed.image = { url: match[1].trim() }; }

        // get url
        match = description.match(reg4);
        if (match && match[1]) { embed.fields.push({ name: 'Product id', value: match[1].toUpperCase().trim(), inline: false }); }

        result.push(embed);
    }
    return result;
}
// get xml http request
const randomChoice = (array) => {
    const index = Math.floor(Math.random() * array.length);
    return index;
}
const my_headers = [
    // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/112.0.5615.46 Mobile/15E148 Safari/604.1',
    // 'Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/112.0.5615.46 Mobile/15E148 Safari/604.1',
    // 'Mozilla/5.0 (iPod; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/112.0.5615.46 Mobile/15E148 Safari/604.1',
    // 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; SM-A102U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; SM-N960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; LM-Q720) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; LM-X420) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 10; LM-Q710(FGN)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.48 Mobile Safari/537.36',

    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/537.75.14",
    "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0",
    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Ubuntu/11.04 Chromium/16.0.912.77 Chrome/16.0.912.77 Safari/535.7",
    "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0 ",
    "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)",
    'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Mozilla/5.0 (compatible; Konqueror/3.5; Linux) KHTML/3.5.5 (like Gecko) (Kubuntu)',
    'Opera/9.25 (Windows NT 5.1; U; en)',
]
const getXML = async (url) => {
    if (require('fs').existsSync("./.env")) { console.log('url:', url); }

    const i = randomChoice(my_headers);
    const userAgent = my_headers[i];
    try {
        const req = await requestGet({ url, headers: { 'User-Agent': userAgent } });

        // chekc error
        if (req && req.statusCode != 200) {
            console.log(
                `[rssbot] RSS error!`,
                `userAgent: ${`#${i}`.padStart(3, ' ')}`,
                req.statusCode ? `code: ${req.statusCode}` : '',
                `url: ${url}`
            );
            return null;
        }

        const res = req.body;
        // console.log(`[rssbot] Got rss feed!`);
        return res;

    } catch (error) {
        console.log(
            `[rssbot] RSS error!`,
            `userAgent: ${`#${i}`.padStart(3, ' ')}`,
            `url: ${url}`
        );
        return null;
    }
};
// read rss xml feed
const xmlTojson = async (xml) => {

    return await new Promise((resolve, reject) => {

        xml2js.parseString(xml, (err, result) => {
            // error
            // if (err) { reject(err); }
            if (err) {
                console.error(err);
                resolve({});
            }

            // done
            resolve(result.rss.channel[0]);
        });
    });
}


// get last rss message
const checkLastRss = async (client, RSS_CHANNEL_ID, RSS_FEEDURL) => {

    // check discord channel
    const channel = await client.channels.fetch(RSS_CHANNEL_ID);
    if (!channel) { return; }
    // get message log
    let messages = await channel.messages.fetch().catch(() => { });
    for (let key of messages.keys()) {
        let message = messages.get(key);
        // only check bot message
        if (message.author?.id != client.user.id) { continue; }
        // only check message with embed;
        if (!message.embeds[0]) { continue; }

        // only check embed url in same host;
        let workUrl = new URL(RSS_FEEDURL);
        let oldUrl = new URL(message.embeds[0].url || 'https://127.0.0.1/');
        if (workUrl.host != oldUrl.host) { continue; }

        // get react count
        message = await message.channel.messages.fetch({ message: message.id });
        let reacts = message.reactions.cache.get(EMOJI_RECYCLE);
        let reactsCount = reacts ? reacts.count : 0;

        if (reactsCount <= 1) { continue; }
        // delete
        if (!message.deletable) { continue; }
        setTimeout(async () => {
            await message.suppressEmbeds(true).catch(() => { });
            await message.delete().catch(() => { });
        }, 250);
    }
}


module.exports = {
    name: 'rssbot',
    description: "check rss every hour",

    async clockMethod(client, { hours, minutes, seconds }) {
        // check every 15 min
        if (minutes % 15 != 0 || seconds != 0) { return; }

        checkRss(client, minutes);
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        // skip bot reaction
        if (user.bot) { return; }

        // skip other emoji
        if (reaction.emoji.toString() != EMOJI_ENVELOPE_WITH_ARROW &&
            reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

        // get msg data
        const { message } = reaction;
        const { channel, client } = message;

        // EMOJI_RECYCLE
        if (reaction.emoji.name == EMOJI_RECYCLE) {
            // ♻️

            // check deletable
            if (message.author.id != client.user.id || !message.deletable) { return; }

            // skip not target channel
            if (!pluginConfig.find((cfg) => (channel.id == cfg.RSS_CHANNEL_ID))) { return; }

            // check message target
            let [embed] = message.embeds || [];
            if (!embed) { return; }
            let del = false, host = (new URL(embed.url)).host;

            // check host
            if (host == 'www.dlsite.com') { del = true; }
            else if (pluginConfig.find((cfg) => (host == (new URL(cfg.RSS_FEEDURL)).host))) {
                // delete last feed later
                // get message log
                let notLastMessage = false;

                let oldMessages = await channel.messages.fetch().catch(() => { });
                for (let key of oldMessages.keys()) {
                    let oldMessage = oldMessages.get(key);
                    // only check bot message
                    if (oldMessage.author.id != client.user.id) { continue; }
                    // only check message with embed;
                    if (!oldMessage.embeds[0]) { continue; }

                    // only check embed url in same host;
                    let oldUrl = new URL(oldMessage.embeds[0].url || 'https://127.0.0.1/');
                    if (host != oldUrl.host) { continue; }

                    // check embed timestamp
                    let workTimestamp = new Date(embed.timestamp).getTime();
                    let oldTimestamp = new Date(oldMessage.embeds[0].timestamp).getTime();
                    if (oldTimestamp > workTimestamp) {
                        notLastMessage = true;
                        break;
                    }
                }
                del = notLastMessage;
            }

            if (del) {
                setTimeout(async () => {
                    await message.suppressEmbeds(true).catch(() => { });
                    await message.delete().catch(() => { });
                }, 250);
            }
            return;
        }

        // EMOJI_ENVELOPE_WITH_ARROW
        if (reaction.emoji.name == EMOJI_ENVELOPE_WITH_ARROW) {

            let [embed] = message.embeds || [{ fields: [] }];
            if (!embed) { return; }
            let field = embed.fields.find(field => field.name == 'Product id');
            if (!field) { return; }

            let productID = field.value;
            channel.send({ content: `!${productID}` });
            return;
        }

        return;
    },

    async execute(message, pluginConfig, command, args, lines) {

        // get config
        const { client } = message;
        if (!command) { return false; }

        if ('rss' != command) { return; }
        if (message.author?.id != '353625493876113440') { return; }

        await message.delete().catch(() => { });

        checkRss(client);

        return true;
    },
}
