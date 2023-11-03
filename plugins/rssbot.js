const [EMOJI_RECYCLE, EMOJI_ENVELOPE_WITH_ARROW] = ['♻️', '📩'];
const rssIcon = 'https://www.rssboard.org/images/rss-feed-icon-96-by-96.png';
const dlsiteIcon = 'https://media.discordapp.net/attachments/947064593329557524/1156438574997184562/RBIlIWRJ2HEHkWiTV4ng_gt_icon020.png';

const { EmbedBuilder } = require('discord.js');
// const server = require('../server');
const xml2js = require(`xml2js`);
// const express = require('express');
// let client = null;

const requestGet = require('util').promisify(require('request').get);
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };

// check rss and send embeds
const checkRss = async (client, nowMinutes) => {
    if (require('fs').existsSync("./.env")) { console.log('checkRss'); }

    // get each guild config
    for (let gID of client.guildConfigs.keys()) {

        // get single guild config
        const config = client.getPluginConfig(gID, 'rssbot');
        if (!config) { continue; }

        // get each rss config
        for (const { RSS_CHANNEL_ID, RSS_FEEDURL } of config) {
            // check config data
            if (!RSS_CHANNEL_ID || !RSS_FEEDURL) { continue; }

            // get discord channel
            const channel = await client.channels.fetch(RSS_CHANNEL_ID);
            if (!channel) { continue; }

            // get rss feed xml
            const xml = await getXML(RSS_FEEDURL);
            if (!xml) { continue; }
            const items = (await xmlTojson(xml)).item;

            // send rss embeds
            await sendRssItems(client, channel, getColor(RSS_FEEDURL), items);
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
    return encodedString
        .replace(translate_re, (match, entity) => { return translate[entity]; })
        .replace(/&#(\d+);/gi, (match, numStr) => { return String.fromCharCode(parseInt(numStr, 10)); });
}
const getColor = (link) => parseInt(require('crypto').createHash('md5').update(link.replace(/\/*$/, '\/')).digest('hex').substring(0, 6), 16);
const reg1 = /[RBV]J\d{6,}/i;
const reg2 = /(Circle[：:])|(Brand[：:])(\<\/span ?\>)?([^\<]+)\</i;
const reg3 = /\<img[^>]*src=\"([^\"]+)\"/i;
const reg4 = /[_\/]([RBV]J\d{6,})[_\.]/i;
const reg5 = /https:\/\/www\.dlsite\.com\/maniax\/fsr\/=\/work_type\/([^"]+)/i;
// rss feed item to discord embeds
const itemsToEmbeds = async (items, hostColor) => {
    let result = [];

    if (!Array.isArray(items)) {
        console.log(`itemsToEmbeds(`, items, ')');
        return result;
    }

    // get feed items
    for (const item of items) {
        let { title, link, pubDate, author, category, guid, description } = item;
        let contentEncoded = '';
        try {
            // array first element
            title = title?.shift();
            link = link?.shift();
            pubDate = pubDate?.shift();
            author = author?.shift();
            category = category?.shift();
            guid = guid?.shift();
            description = description?.shift();
            contentEncoded = item['content:encoded']?.shift() || description;

            // trim
            title = title?.trim();
            category = category?.trim();

            link = guid?._ || link;

            if (link.startsWith('dlsite-')) { link = link.replace('dlsite-', `https://www.dlsite.com/maniax/work/=/product_id/`); }
        } catch (error) {
            console.log(`[rssbot] item read error!`);
            console.log(error);
            continue;
        }

        const pubTime = Date.parse(pubDate);
        // const pubLocaleDate = new Date(pubTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        let embed = {
            color: hostColor,
            url: link,
            thumbnail: { url: rssIcon },
            // description: contentEncoded,
            // fields: [{ name: 'category', value: category, inline: false }],
            timestamp: pubTime,
        };

        let match = null;
        // get title
        if (title) { embed.title = title; }

        // dlsite category
        match = description.match(reg5);
        if (match && match[1]) {

            switch (match[1]) {

                case 'SOU': { category = 'ボイス・ASMR'; }; break;

                case 'RPG': { category = 'ロールプレイング'; }; break;
                case 'SLN': { category = 'シミュレーション'; }; break;
                case 'ADV': { category = 'アドベンチャー'; }; break;
                case 'ACN': { category = 'アクション'; }; break;
                case 'STG': { category = 'シューティング'; }; break;
                case 'PZL': { category = 'パズル'; }; break;
                case 'ETC': { category = 'その他ゲーム'; }; break;

                case 'ICG': { category = 'CG・イラスト'; }; break;
                case 'NRE': { category = 'ノベル'; }; break;
                case 'DNV': { category = 'デジタルノベル'; }; break;
                case 'MNG': { category = 'マンガ'; }; break;
                case 'VCM': { category = 'ボイスコミック'; }; break;
                case 'MOV': { category = '動画'; }; break;

                case 'AMT': { category = '音素材'; }; break;
                case 'IMT': { category = '画像素材'; }; break;
                case 'MUS': { category = '音楽'; }; break;
                case 'TOL': { category = 'ツール/アクセサリ'; }; break;
                case 'ET3': { category = 'その他'; }; break;
                
                default: { category = match[1]; } break;
            }

        }

        // get Circle
        match = contentEncoded.match(reg2);
        if (match && match[4]) { embed.author = { name: ((category ? `(${category}) ` : '') + (decodeEntities(match[4])).trim()) }; }
        if (author) { embed.author = { name: ((category ? `(${category}) ` : '') + (author.replace(/\<!\[CDATA/, '').replace(/\]\>/, ''))) }; }

        // get image
        match = contentEncoded.match(reg3);
        if (match && match[1]) { embed.image = { url: match[1].trim() }; }

        // get url
        match = description.match(reg4);
        if (match && match[1]) { embed.footer = { text: match[1].toUpperCase().trim() }; }

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
const xmlTojson = (xml) => {

    return new Promise((resolve, reject) => {

        xml = xml.replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;');

        xml2js.parseString(xml, (err, result) => {

            // error
            // if (err) { reject(err); }
            if (err) {
                console.error(err.message);
                if (err.message.match(/line:\s*(\d+)\s/i)) {
                    let [, i] = err.message.match(/line:\s*(\d+)\s/i);
                    console.log(xml.split('\n')[i - 1]);
                    console.log(xml.split('\n')[i]);
                    console.log(xml.split('\n')[i + 1]);
                }
                resolve({
                    item: [{
                        title: ['ERROR'], link: ['https://127.0.0.1/'],
                        pubDate: [new Date(Date.now())], category: [], guid: [{ _: '' }], description: ['']
                    }]
                });
            }

            // done
            resolve(result.rss.channel[0]);
        });
    });
}

// get last rss message
const checkLastRss = async (client, channel, hostColor) => {

    // get message log
    let messages = await channel.messages.fetch().catch(() => { });
    // filter target messages
    let tarMsgIDs = [];
    for (let key of messages.keys()) {
        let message = messages.get(key);

        // only check bot message
        if (message.author?.id != client.user.id) { continue; }
        // only check message with embed;
        if (!message.embeds[0]) { continue; }

        // only check embed is rss embed
        if (message.embeds[0].thumbnail?.url != rssIcon) { continue; }

        // only check embed url in same host by host color
        if (message.embeds[0].color != hostColor) { continue; }

        // skip error log message
        if (message.embeds[0].url.includes('127.0.0.1')) { continue; }

        // keep msg
        tarMsgIDs.push(BigInt(message.id));
    }

    if (tarMsgIDs.length <= 0) { return; }

    // // set last message object
    // let lastMsg = { id: 0, embeds: [{ timestamp: 0 }] };
    // // check cache
    // const key = `${channel.id}-${hostColor}`;
    // if (lastMsgCache.has(key) && Date.now() - lastMsgCache.get(key).cacheTime < 600000) {
    //     // get cache
    //     lastMsg = lastMsgCache.get(key).message;
    // } else {
    //     tarMsgs.sort(({ id: iA }, { id: iB }) => (iA == iB ? 0 : (iA < iB ? 1 : -1)));
    //     tarMsgs.reverse();
    //     // update cache
    //     lastMsg.id = tarMsgs[0].id;
    //     lastMsg.embeds[0].timestamp = tarMsgs[0].embeds[0].timestamp;
    //     lastMsgCache.set(key, { message: lastMsg, cacheTime: Date.now() });
    // }

    // tarMsgs.shift();

    tarMsgIDs.sort((a, b) => a > b || -(a < b));
    let lastMsgID = tarMsgIDs.pop().toString();

    // get react count
    for (let mID of tarMsgIDs) {
        let message = await channel.messages.fetch({ message: mID.toString() });
        let reacts = message.reactions.cache.get(EMOJI_RECYCLE);
        let reactsCount = reacts ? reacts.count : 0;

        if (reactsCount <= 1) { continue; }
        if (!message.deletable) { continue; }

        // delete
        setTimeout(async () => {
            await message.suppressEmbeds(true).catch(() => { });
            // await message.delete().catch(() => { });
            addBulkDelete(channel.id, message);
        }, 250);
    };

    return await channel.messages.fetch({ message: lastMsgID });;
}

// send embeds
const sendRssItems = async (client, channel, hostColor, items) => {

    // set rss embed
    const embeds = await itemsToEmbeds(items, hostColor);
    // sort
    embeds.sort((eA, eB) => {
        const tA = eA.timestamp; const coA = parseInt(eA.footer?.text.replace('RJ', '')); const caA = eA.author?.name;
        const tB = eB.timestamp; const coB = parseInt(eB.footer?.text.replace('RJ', '')); const caB = eB.author?.name;
        if (tA != tB) { return (tA > tB) ? 1 : -1; }    // sort by time
        if (caA != caB) { return (caA > caB) ? 1 : -1; }    // sort by type (for dl)
        if (coA != coB) { return (coA > coB) ? 1 : -1; }    // sort by rjid
        return 0;
    });

    // debug
    if (require('fs').existsSync("./.env")) {
        let messages = await channel.messages.fetch().catch(() => { }) || [];

        for (let embed of embeds) {
            // debug
            console.log(embed.url);
            let message = messages.find((msg) => (msg && msg.embeds && msg.embeds[0]) && (msg.embeds[0].url == embed.url));
            if (message) {
                await message.edit({ embeds: [new EmbedBuilder(embed)] })
                    // .catch(() => { })
                    .catch(console.log);
                continue;
            }
        }
    }

    // get message log
    let lastMessage = await checkLastRss(client, channel, hostColor);
    let lastPostTimestamp = new Date((lastMessage?.embeds || [])[0]?.timestamp || 0).getTime();

    // send embeds
    let newRss = false;
    for (let embed of embeds) {
        // check last post time
        if (embed.timestamp > lastPostTimestamp) {
            // send msg
            channel.send({ embeds: [new EmbedBuilder(embed)] })
                .then(async (msg) => {
                    await msg.react(EMOJI_RECYCLE).catch(() => { });

                    if (reg1.test(embed.footer?.text)) { await msg.react(EMOJI_ENVELOPE_WITH_ARROW).catch(() => { }); }
                }).catch(console.log);
            newRss = true;
        }
    }

    return newRss;
}


let bulkDelete = new Map();
const addBulkDelete = (cID, message) => {
    if (!bulkDelete.has(cID)) {
        bulkDelete.set(cID, new Set());
    }
    bulkDelete.get(cID).add(message);
}

let client = null;
module.exports = {
    name: 'rssbot',
    description: "check rss every hour",

    async clockMethod(client, { hours, minutes, seconds }) {

        if (seconds % 15 == 0 && bulkDelete.size > 0) {

            for (let [cID, msgSet] of bulkDelete) {

                if (msgSet.size > 0) {
                    let _bulkDelete = Array.from(msgSet);
                    msgSet.clear();
                    let channel = _bulkDelete[0].channel;
                    await channel.bulkDelete(_bulkDelete)
                        .then(() => console.log(`Bulk deleted ${_bulkDelete.length} messages in ${channel.name}`))
                        .catch((e) => console.log(e.message));
                // } else {
                //     bulkDelete.delete(cID);
                }
            }
        }

        if (require('fs').existsSync("./.env")) { return; }

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

            // skip not target channel. to-do: change rule
            if (!pluginConfig.find((cfg) => (channel.id == cfg.RSS_CHANNEL_ID))) { return; }

            // check message target
            let [embed] = message.embeds || [];
            if (!embed) { return; }

            // check host
            let host = (new URL(embed.url)).host;
            if (
                host == 'www.dlsite.com' &&
                // embed.thumbnail == dlsiteIcon
                embed.thumbnail?.url != rssIcon
            ) {
                setTimeout(async () => {
                    await message.suppressEmbeds(true).catch(() => { });
                    // await message.delete().catch(() => { });
                    addBulkDelete(message.channel.id, message);
                }, 250);
                return;
            }

            // check embed type
            if (embed.thumbnail?.url == rssIcon) {
                // delete last feed later
                // get message log

                let lastMessage = await checkLastRss(client, channel, embed.color);

                // let notLastMessage = lastMessage.id != message.id;
                // if (notLastMessage) {
                //     setTimeout(async () => {
                //         await message.suppressEmbeds(true).catch(() => { });
                //         await message.delete().catch(console.log);
                //     }, 250);
                //     return;
                // }
            }
        }

        // EMOJI_ENVELOPE_WITH_ARROW
        if (reaction.emoji.name == EMOJI_ENVELOPE_WITH_ARROW) {

            let [embed] = message.embeds || [{ fields: [] }];
            if (!embed) { return; }
            if (!reg1.test(embed.footer?.text)) { return; }

            let productID = embed.footer.text;
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

    setup(_client) { client = _client; }
}


const app = require('../server.js').app;

const cors = require('cors');
app.use(cors());

const multer = require('multer');
app.post('/rssbot', multer().array(), async (req, res) => {
    if (!client) { return; }

    res.sendStatus(200);

    // get rss feed xml
    const xml = req.body.text;
    if (!xml) { return; }

    // get discod channel id
    let cID;
    const href = req.body.href;
    if (href.includes('voice') || href.includes('audio')) { cID = '979765968727310336'; }
    if (href.includes('game')) { cID = '979815303749967932'; }
    if (href.includes('anim') || href.includes('ova')) { cID = '979808194710880266'; }
    if (href.includes('rsshub')) { cID = '1156057315829624933'; }
    if (!cID) { return; }

    // get discord channel
    const channel = await client.channels.fetch(cID);
    if (!channel) { return; }

    // get rss feed xml
    const items = (await xmlTojson(xml)).item;

    // send rss embeds
    await sendRssItems(client, channel, getColor(href), items);

    return;
});
