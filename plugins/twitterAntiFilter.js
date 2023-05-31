
const fs = require('fs');
const path = require('path');
const canvas = require('canvas');
const ssim = require('image-ssim');
const compressing = require('compressing');
const request = require('request');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const [EMOJI_LABEL] = ['🏷️']

function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

// const { twitter } = require('./twitterListener2.js');
let blacklist = [];
let imagesList = [];
let detailData = { guro: [], other: [], new: [], fakeuser: {} };

const dataPath = `./blacklist`;

// resize image to 8x8
const toCompressData = (image, imgWidth = 8) => {
    const mainCanvas = canvas.createCanvas(imgWidth, imgWidth);
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, imgWidth, imgWidth);
    return ctx.getImageData(0, 0, imgWidth, imgWidth);;
};

const downloadImage = async (url, subUrl) => {
    // get filename
    const [, filename, ext] = url.match(/\/([^\/]*)\.([^\/\.]*)$/) || [, null, null];
    if (!filename || !ext) { return false; }

    // download file
    const file = `./${filename}_${process.uptime().toString().replace('.', '')}.${ext}`;
    if (!fs.existsSync(file)) await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(file)).on('close', resolve); });
    await sleep(500);
    if (!fs.existsSync(file)) { return false; }

    // read image
    let image = await canvas.loadImage(file).catch((e) => {
        console.log(`download image error: ${url}`);
        console.log(file, e.message);
        return null;
    });
    if (!image) {
        fs.unlinkSync(file);
        if (subUrl != null) {
            console.log(`try sub url: ${subUrl}`);
            return await downloadImage(subUrl, null);
        }
        return false;
    }
    image = toCompressData(image, 8);
    image.channels = 4;

    // del twitter image
    if (fs.existsSync(file)) { fs.unlinkSync(file); }

    return { canvas: image, url };
}

const imageComparison = async (image1) => {

    // get all blacklist images
    for (let file2 of imagesList) {
        let image2 = await canvas.loadImage(file2).catch((e) => { console.log(url); console.log(file2, e.message); return null; });
        if (!image2) { continue; }
        image2 = toCompressData(image2, 8);
        image2.channels = 4;

        // get ssim result
        let result = ssim.compare(image1, image2);
        if (result.ssim < 0.95) { continue; }   // different image

        return { ssim: result.ssim, image: file2 };
    }
    return false;
}


// [, username, , tID]
const regUrl = /https?:\/\/twitter\.com\/([^\/]+)(\/status\/(\d*))?/i;
const CODE_CHANNEL = '872122458545725451';
const LOGS_CHANNEL = '713623232070156309';
class AntiFilterCore {

    client = null;
    channels = new Map();
    constructor() { };

    async setClient(client) {
        this.client = client;

        // get channel/message by id
        client.channels.fetch(CODE_CHANNEL)
            .then((channel) => { if (channel) { this.channels.set(CODE_CHANNEL, channel); } })
            .catch(() => { return null; });

        client.channels.fetch(LOGS_CHANNEL)
            .then((channel) => { if (channel) { this.channels.set(LOGS_CHANNEL, channel); } })
            .catch(() => { return null; });

    }

    tweetStatus = new Map();

    async getImageComparison(username, tID, embedImage) {

        // check process status
        if (!this.tweetStatus.has(tID)) {
            // waiting process
            this.tweetStatus.set(tID, 0);
        }

        // process already started
        if (this.tweetStatus.get(tID) == 1) {
            // 30sec timeout
            for (let i = 0; i < 30; ++i) {
                if (this.tweetStatus.get(tID) != 1) {
                    // process done, break
                    break;
                }
                await sleep(1000);
            }
        }

        // if process done, check result
        let tweetStatu = this.tweetStatus.get(tID);
        if (tweetStatu == 1) {
            // process still running, maybe error
            console.log(`getImageComparison timeout, mID: ${message.id}, tID: ${tID}`);
            return false;

        } else if (tweetStatu == 2) {
            // image not in blacklist
            return false;

        } else if (imagesList.includes(tweetStatu.image)) {
            // image in blacklist
            return tweetStatu;

        }

        // tweetStatu == 0
        // start process
        this.tweetStatus.set(tID, 1);

        // empty embed
        if (!embedImage || (!embedImage.url && !embedImage.proxyURL)) {
            this.tweetStatus.set(tID, 0);   // try again if some thread waiting
            return false;
        }

        // download image
        let image = await downloadImage(embedImage.url, embedImage.proxyURL);

        // download image fail
        if (!image) {
            this.tweetStatus.set(tID, 0);   // try again if some thread waiting
            return false;
        }

        let imageInBlackList = await imageComparison(image.canvas).catch((e) => { return e });
        if (imageInBlackList) {
            // image in blacklist
            // process done, set result
            let result = { username, tID, ssim: imageInBlackList.ssim, image: imageInBlackList.image }
            this.tweetStatus.set(tID, result);
            return result;

        } else {    // imageInBlackList == false
            // image not in blacklist
            // check username

            if (blacklist.includes(username)) {
                // username in blacklist, kuro, new spam image

                // set folder
                if (!fs.existsSync('./blacklist/new')) { fs.mkdirSync('./blacklist/new', { recursive: true }); }

                // get image data
                const url = image.url;
                const [, ext] = url.match(/([^\.]+)$/) || [, null];
                let filename = `${username}-${tweetID}-img1.${ext}`;
                let filepath = `./blacklist/new/${filename}`;
                for (let i = 1; true; ++i) {
                    if (fs.existsSync(filepath)) {
                        filename = filename.replace(`-img${i}.`, `-img${i + 1}.`);
                        filepath = filepath.replace(`-img${i}.`, `-img${i + 1}.`);
                    } else { break; }
                }

                // set image to blacklist
                imagesList.push(filepath);
                this.logToDiscord(`[+] ${filename}`);

                // download image to blacklist
                await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); });
                // or use image.canvas ?

                let result = { username, tID, ssim: 1.0, image: filepath }

                // set status
                mainAFCore.tweetStatus.set(tweetID, result);
                return result;

            } else {
                // username not in blacklist, siro
                // process done
                this.tweetStatus.set(tID, 2);
                return false;

            }
            return false;
        }
    }

    logToDiscord(message, channel = CODE_CHANNEL) {
        if (this.channels.has(channel)) {
            let payload = (typeof message == 'string') ? { content: message } : message;
            this.channels.get(channel).send(payload).catch((e) => console.log(e.message));
        } else {
            console.log(message);
        }
    }



    // upload blacklist to discord
    async uploadBlacklist() {
        if (!this.client || !fs.existsSync(dataPath)) { return; }

        for (let [tID, status] of this.tweetStatus) {
            let { username, ssim, image } = status;
            if (!image) { continue; }

            const url = `https://twitter.com/${username}/status/${tID}`

            if (/\/fakeuser\/([^\/]+)\//.test(image)) {
                let [, username] = image.match(/\/fakeuser\/([^\/]+)\//);
                if (detailData.fakeuser[username].includes(url)) { continue; }
                detailData.fakeuser[username].push(url);

            } else if (image.includes(`/guro/`)) {
                if (detailData.guro.includes(url)) { continue; }
                detailData.guro.push(url);

            } else if (image.includes(`/new/`)) {
                if (detailData.new.includes(url)) { continue; }
                detailData.new.push(url);

            } else {
                if (detailData.other.includes(url)) { continue; }
                detailData.other.push(url);
            }
        }

        // update blacklist
        const names = ['blacklist', 'guro', 'other', 'new'].concat(Object.keys(detailData.fakeuser));
        for (let name of names) {

            const filepath = `${dataPath}/${name}.txt`;

            if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); }

            if (name == 'blacklist') {
                // blacklist
                fs.writeFileSync(filepath, blacklist.join('\r\n'), 'utf8');

            } else if (['guro', 'other', 'new'].includes(name)) {
                // other type
                fs.writeFileSync(filepath, detailData[name].join('\r\n'), 'utf8');

            } else {
                // fakeuser
                fs.writeFileSync(filepath, detailData.fakeuser[name].join('\r\n'), 'utf8');

            }
        }

        // get channel/message by id
        const channel = await this.client.channels.fetch(`872122458545725451`).catch(() => { return null; });
        if (!channel) { return; }
        const msg = await channel.messages.fetch({ message: `1111207166871871538`, force: true }).catch(() => { return null; });
        if (!msg) { return; }

        // zip blacklist files
        const filePath = `${dataPath}.zip`;
        await compressing.zip.compressDir(dataPath, filePath).catch(() => { });
        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }))
            .replace(/[\/:]/g, '').replace(', ', '_');

        // upload zip file
        const attachment = new AttachmentBuilder(filePath, { name: `${nowDate}.zip` });
        await msg.edit({ content: ' ', files: [attachment] }).catch(() => { });
        if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    }

    async downloadBlacklist() {
        if (!this.client) { return; }
        if (fs.existsSync(dataPath)) {
            fs.rmSync(dataPath, { recursive: true, force: true });
        }

        // get channel/message by id
        const channel = await this.client.channels.fetch(`872122458545725451`).catch(() => { return null; });
        if (!channel) { return; }
        const msg = await channel.messages.fetch({ message: `1111207166871871538`, force: true }).catch(() => { return null; });
        if (!msg) { return; }

        // download blacklist files
        for (const [key, value] of msg.attachments) {
            const { name, url } = value;
            const filename = `./${name}`;

            // download blacklist files
            await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filename)).on('close', resolve); });

            // unzip
            await compressing.zip.uncompress(filename, './').catch(() => { });
            if (fs.existsSync(filename)) { fs.unlinkSync(filename); }
        }
    }

    readdirSync(path) {
        let result = [];
        const files = fs.readdirSync(path);
        for (let file of files) {
            let nextPath = `${path}/${file}`;

            if (fs.lstatSync(nextPath).isDirectory()) {
                let nextFiles = this.readdirSync(nextPath);
                for (let nextFile of nextFiles) {
                    result.push(nextFile);
                }
            } else {
                result.push(nextPath);
            }
        }
        return result;
    }

    readBlacklist() {
        // get username blacklist
        // get tweet detailData
        const filenames = fs.readdirSync(dataPath).filter(file => file.endsWith('.txt'));
        blacklist = [];
        detailData = { guro: [], other: [], new: [], fakeuser: {} };

        for (let filename of filenames) {

            const filepath = `${dataPath}/${filename}`;
            const { name } = path.parse(filepath);

            // detail for line
            let lines = fs.readFileSync(filepath, 'utf8').split(/\r?\n/);

            if (name == 'blacklist') {
                // blacklist username
                for (let line of lines) {
                    line = line.trim();
                    if (!line) { continue; }
                    blacklist.push(line.trim());
                }

            } else if (['guro', 'other', 'new'].includes(name)) {
                // other type
                for (let url of lines) {
                    url = url.trim();
                    if (!url || detailData[name].includes(url)) { continue; }
                    detailData[name].push(url);
                }

            } else {
                if (!detailData.fakeuser[name]) { detailData.fakeuser[name] = []; }
                // fake user
                for (let url of lines) {
                    url = url.trim();
                    if (!url || detailData.fakeuser[name].includes(url)) { continue; }
                    detailData.fakeuser[name].push(url);
                }

            }
        }

        // get image blacklist
        if (fs.existsSync(dataPath)) {
            imagesList = this.readdirSync(dataPath)
                .filter(file => /\.jpg\_?$|\.png\_?$/.test(file));
        }
    }

}
let mainAFCore = new AntiFilterCore();





module.exports = {
    name: 'twitterAntiFilter',
    description: "twitterAntiFilter",

    async setup(client) {
        if (client.user.id == `920485085935984641`) {
            mainAFCore.setClient(client);

            // if (fs.existsSync(dataPath)) {
            //     mainAFCore.readBlacklist();
            //     await mainAFCore.uploadBlacklist();
            // }

            await mainAFCore.downloadBlacklist();
            mainAFCore.readBlacklist();
            return;
        }
    },

    async execute(message, pluginConfig, command, args, lines) {

        const { client, content, channel, embeds } = message;

        // twitter url
        if (regUrl.test(content)) {

            // 30sec timeout
            for (let i = 0; i < 60; ++i) {
                if (message.embeds.length > 0) {
                    // found discord embed, break
                    break;
                }
                // wait 2sec & update message
                await sleep(500);
                message = await message.channel.messages.fetch({ message: message.id, force: true }).catch(() => { return null; });
                // can't found message, maybe deleted
                if (!message) { return false; }
            }

            const [, username, , tID] = content.match(regUrl);
            const _embedImage = (((embeds || [])[0]) || {}).image || null;
            const embedImage = _embedImage ? { url: _embedImage.url, proxyURL: _embedImage.proxyURL } : null;

            let deleted = false;

            // username in blacklist
            if (blacklist.includes(username)) {

                const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
                    .setTitle(`推特過濾器:`)
                    .addFields([{ name: `Content:`, value: content }]);
                mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOGS_CHANNEL)

                // delete message
                message.delete().catch(() => { });
                deleted = true;
                // message.suppressEmbeds(true).catch(() => { });
            }

            // found tID & image
            if (tID && embedImage) {
                let result = await mainAFCore.getImageComparison(username, tID, embedImage);

                // found tID & image but tweet image not in blacklist
                if (!result) { return false; }
                let { ssim, image } = result;

                // image in blacklist
                console.log(`[TAF] image in blacklist. ${username} ${tID} ${ssim}`);
                console.log(` ${image}`);

                if (!deleted) {
                    const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
                        .setTitle(`推特過濾器:`)
                        .addFields([{ name: `Content:`, value: content }]);
                    mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOGS_CHANNEL)

                    message.delete().catch(() => { });
                }
                // mainAFCore.logToDiscord(`delete msg: ${message.url}`);

                // image in blacklist but username not, add to blacklist
                if (!blacklist.includes(username)) {
                    blacklist.push(username);
                    mainAFCore.logToDiscord(`[+] ${username}`);
                }
                mainAFCore.uploadBlacklist();
                return;
            }
        }

        if (message.author?.id != `353625493876113440`) { return; }
        if (client.user.id != `920485085935984641`) { return; }

        if (command == 'rembl') {

            let log = [];
            for (let target of args) {
                if (blacklist.includes(target)) {
                    blacklist.splice(blacklist.indexOf(target), 1);
                    log.push(`[-] ${target}`);
                }
            }
            mainAFCore.logToDiscord(log.join('\n'));
            mainAFCore.uploadBlacklist();
            return;
        }
        if (command == 'remimg') {

            let log = [];
            for (let target of args) {
                if (!/\d+/.test(target)) { continue; }

                // find target image
                target = imagesList.find((img => img.includes(target)));
                if (!target) { continue; }

                imagesList.splice(imagesList.indexOf(target), 1);
                if (fs.existsSync(target)) { fs.unlinkSync(target); }
                log.push(`[-] ${target}`);

            }
            mainAFCore.logToDiscord(log.join('\n'));
            mainAFCore.uploadBlacklist();
            return;
        }

        if (command == 'uploadbl') {
            mainAFCore.logToDiscord(`upload`);
            mainAFCore.uploadBlacklist();
        }
        if (command == 'reloadbl') {
            await mainAFCore.downloadBlacklist();
            mainAFCore.readBlacklist();
        }

        if (command == 'blimg') {
            channel.send({ content: imagesList.join('\n') });
        }

        if (command == 'move') {

            if (!/\d+/.test(args[0]) ||         // by tID
                !/^\..+[^\/]$/.test(args[1])) {    // target file path

                channel.send({
                    content: [
                        '```Format: ', `<tID> <file path>`, `Ex:`,
                        `1639250471847333889 ./blacklist/fakeuser/2K4S4_K4H4R4/Aid643-1639250471847333889-img1.jpg`,
                        '```'
                    ].join('\n')
                });
                return;
            }

            // find target image
            let src = imagesList.find((img => img.includes(args[0])));
            if (!src) { return; }

            let { dir } = path.parse(src);
            let dest = args[1];

            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(src, dest);
            if (fs.existsSync(src) && fs.existsSync(dest)) {
                fs.unlinkSync(src);
                imagesList = imagesList.filter((ele) => (ele !== src));
                imagesList.push(dest);
            }

            mainAFCore.uploadBlacklist();
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (user.bot) { return false; }
        if (user.id != `353625493876113440`) { return; }

        // get msg data
        const { message } = reaction;
        const { client, content, embeds } = message;

        if (client.user.id != `920485085935984641`) { return; }

        // debug emoji
        if (reaction.emoji.toString() == '🔹') {

            const guildConfig = client.guildConfigs.get(message.guildId);
            let lines = content.split('\n');
            for (let i = 0; i < lines.length; ++i) {
                lines[i] = guildConfig.getCommandLineArgs(lines[i]);
            }
            const { command, args } = lines[0];

            this.execute(message, pluginConfig, command, args, lines);
            return;
        }

        // skip other emoji
        if (reaction.emoji.toString() != EMOJI_LABEL) { return; }

        // is twitter url or not
        if (!regUrl.test(content)) { return; }

        // get tweet data
        const [, username, , tID] = (content.match(regUrl) || [, null, , null]);
        // get image data
        const embedImage = (((embeds || [])[0]) || {}).image || null;

        // check tweet data
        if (username == null || tID == null) { return; }

        let resultLog = [];

        // set username to blacklist
        if (!blacklist.includes(username)) {
            blacklist.push(username);
            resultLog.push(`[+] ${username}`);
        }

        // get twitter image
        if (embedImage) {

            let image = await downloadImage(embedImage.url, embedImage.proxyURL);
            if (image) {

                // check image in blacklist or not
                let imageInBlackList = await imageComparison(image.canvas).catch((e) => { return null });
                if (!imageInBlackList) {
                    // image not in blacklist

                    // set folder
                    if (!fs.existsSync('./blacklist/new')) { fs.mkdirSync('./blacklist/new', { recursive: true }); }

                    // get image data
                    const url = image.url;
                    const [, ext] = url.match(/([^\.]+)$/) || [, null];
                    let filename = `${username}-${tweetID}-img1.${ext}`;
                    let filepath = `./blacklist/new/${filename}`;
                    for (let i = 1; true; ++i) {
                        if (fs.existsSync(filepath)) {
                            filename = filename.replace(`-img${i}.`, `-img${i + 1}.`);
                            filepath = filepath.replace(`-img${i}.`, `-img${i + 1}.`);
                        } else { break; }
                    }

                    // set image to blacklist
                    imagesList.push(filepath);
                    resultLog.push(`[+] ${filename}`);

                    // download image to blacklist
                    await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); });
                    // or use image.canvas ?

                    let result = { username, tID, ssim: 1.0, image: filepath }

                    // set status
                    mainAFCore.tweetStatus.set(tweetID, result);
                }
            }
        }

        if (resultLog.length > 0) {
            mainAFCore.logToDiscord(resultLog.join('\n'));
            mainAFCore.uploadBlacklist();
        }

        const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
            .setTitle(`推特過濾器:`)
            .addFields([{ name: `Content:`, value: content }]);
        mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOGS_CHANNEL)

        message.delete().catch(() => { });
    },



    // // get config
    // const { channel, author } = message;
    // if (!author || !embeds) { return false; }
    // if (!/https:\/\/twitter\.com/i.test(content)) { return false; }
    // if (!['1054284227375542333'].includes(channel.id)) { return false; }

    // // get tweet from discord embed
    // let description = (((embeds || [])[0]) || {}).description || '';

    // (() => {
    //     let isAnti = false;
    //     // hashtag > 3
    //     isAnti |= ((description.match(/#/g) || []).length > 3);
    //     // // check twitter profile by api
    //     // if (isAnti) {
    //     //     let [, username] = (content.match(/https:\/\/twitter\.com\/([^\/]+)/i) || []);
    //     //     let user = await twitter.getUserByUsername(username, { 'user.fields': ['description'] });
    //     //     isAnti |= user.data?.description?.includes('kis_kirrrrrr');
    //     //     isAnti |= user.data?.name?.includes('如月キ');
    //     // }
    //     // keywords > 3
    //     let keywords = ['敗退', '戦犯', '夢見症候群', '放射能', '死ね', '殺す', '日本猿', '負け', '如月']
    //     let keywordsRegex = new RegExp(`(${keywords.join(')|(')})`, 'g');
    //     isAnti |= ((description.match(keywordsRegex) || []).length > 3);

    //     if (!isAnti) { return true; }
    //     // keep data
    //     channel.send({ content: content.replace('https', 'http') });
    // })();

    // // delete auto retweet
    // if (client.user.id != author.id) { return true; }
    // await message.delete().catch(console.log);
}


const express = require('express');
const app = require('../server.js').app;

// html serve index (only for get)
const serveIndex = require('serve-index');
app.get(/^\/blacklist(\/[^\/]*)*$/, express.static('.'), serveIndex('.', {
    'icons': true, stylesheet: './style.css', view: 'details'
}));

// webdav
const fullPath = path.resolve(`./blacklist`);
const webdav = require('webdav-server').v2;
const server = new webdav.WebDAVServer();
server.setFileSystem('/', new webdav.PhysicalFileSystem(fullPath));
app.use(webdav.extensions.express('/blacklist/', server)); // GET 以外
//*/

