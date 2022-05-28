const [EMOJI_RECYCLE] = ['♻️']

const { MessageEmbed } = require('discord.js');
// const server = require('../server');
const xml2js = require(`xml2js`);
// const express = require('express');
// let client = null;

const request = require('request');
const util = require('util');
const requestGet = util.promisify(request.get);

const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };

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



const checkRss = async (client) => {

    // get each guild config
    const configs = client.config;
    for (const gID of Object.keys(configs)) {

        // get single guild config
        const config = configs[gID];
        if (!config.rssbot) { continue; }

        // get each rss config
        for (const { RSS_CHANNEL_ID, RSS_FEEDURL } of config.rssbot) {
            // check config data
            if (!RSS_CHANNEL_ID || !RSS_FEEDURL) { continue; }

            // check discord channel
            const channel = client.channels.cache.get(RSS_CHANNEL_ID);
            if (!channel) { continue; }
            // get message log
            let messages = await channel.messages.fetch().catch(() => { });
            let lastPostTimestamp = 0;
            for (let key of messages.keys()) {
                let message = messages.get(key);
                lastPostTimestamp = Math.max(lastPostTimestamp, message.embeds[0].timestamp);
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
            for (let embed of embeds) {
                // check last post time
                if (embed.timestamp > lastPostTimestamp) {
                    channel.send({ embeds: [embed] }).then(msg => { msg.react(EMOJI_RECYCLE) });
                }
            }
        }
    }
}


const itemsToEmbeds = async (items) => {
    let result = [];
    // get feed items
    for (const item of items) {
        let { title, link, pubDate, category, guid, description } = item;
        let contentEncoded = '';
        try {
            title = title[0]; link = link[0]; pubDate = pubDate[0];
            category = category[0]; guid = guid[0]; description = description[0];
            contentEncoded = item['content:encoded'][0]

            link = guid._ || link;
        } catch (error) {
            console.log(`[rssbot] item read error!`);
            console.log(error);
            continue;
        }

        const pubTime = Date.parse(pubDate);
        // const pubLocaleDate = new Date(pubTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

        let embed = new MessageEmbed()
            // .setColor(0xFF0000)
            // .setAuthor({
            //     name: `${authorName} ${message.author.toString()}`,
            //     iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
            // })
            // .setTitle(title)
            .setURL(link)
            // .setDescription(contentEncoded)
            .addField('category', category)
            .setTimestamp(pubTime);

        let match = null;
        // get title
        let reg1 = new RegExp('Title:\<\/span ?\>([^\<]+)\<');
        match = contentEncoded.match(reg1);
        if (match) { embed.setTitle(match[1]); }
        else { embed.setTitle(title); }

        // get Circle
        let reg2 = new RegExp('Circle ?\/ ?Brand:\<\/span ?\>([^\<]+)\<');
        match = contentEncoded.match(reg2);
        if (match) { embed.setAuthor({ name: decodeEntities(match[1]) }); }

        // get image
        let reg3 = new RegExp('\<img src=\"([^\"]+)\" ?\/\>');
        match = contentEncoded.match(reg3);
        if (match) { embed.setImage(match[1]); }

        result.push(embed);

    }
    return result;
}

const randomChoice = (array) => {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}
const my_headers = [
    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/537.75.14",
    "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)",
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11',
    'Opera/9.25 (Windows NT 5.1; U; en)',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
    'Mozilla/5.0 (compatible; Konqueror/3.5; Linux) KHTML/3.5.5 (like Gecko) (Kubuntu)',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Ubuntu/11.04 Chromium/16.0.912.77 Chrome/16.0.912.77 Safari/535.7",
    "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0 "
]
const getXML = async (url) => {
    try {
        const userAgent = randomChoice(my_headers);
        const req = await requestGet({ url, headers: { 'User-Agent': userAgent } });

        // chekc error
        if (req.error || req.statusCode != 200) {
            console.log(`[rssbot] Cannot get rss feed! statusCode: ${req.statusCode}`);
            console.log(`url: ${url}`);
            console.log(`userAgent: ${userAgent}`);
            console.log(req.error)
            console.log(` `)
            throw req.error;
        }

        const res = req.body;
        // console.log(`[rssbot] Got rss feed!`);
        return res;

    } catch (error) {
        return null;
    }
};
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

module.exports = {
    name: 'rssbot',
    description: "check rss every hour",
    async setup(client) {

        while (1) {
            if (Date.now() % 1000 == 0) { break; }
            await sleep(1);
        }
        // auto search every 10min
        let interval = setInterval(async () => {

            const nowSeconds = new Date(Date.now()).getSeconds();
            if (nowSeconds != 0) { return; }

            const nowMinutes = new Date(Date.now()).getMinutes();
            if (nowMinutes % 10 != 0) { return; }

            checkRss(client);
        }, 1000);  // check every 1sec
        client.once('close', () => {
            clearInterval(interval);
        });

        // start up
        checkRss(client);

        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });
            if (reaction.partial) await reaction.fetch().catch(() => { });
            if (reaction.users.partial) await reaction.users.fetch().catch(() => { });

            // skip other emoji
            if (reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

            // get msg data
            const { message } = reaction;
            const { guild } = message;

            // skip not-deletable
            if (!message.deletable) { return; }
            if (message.author.id != guild.me.id) { return; }

            if (!guild) { return; }  // skip PM
            if (user.bot) { return; }   // skip bot reaction

            // get config
            const { client } = reaction;
            const config = client.config[message.guild.id];
            if (!config || !config.rssbot) { return false; }

            // skip not target
            if (!config.rssbot.find((cfg) => { return message.channel.id == cfg.RSS_CHANNEL_ID })) { return; }
            // if (reaction.count <= 5) { return; }

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
