
const fs = require('fs');
const path = require('path');
const canvas = require('canvas');
const ssim = require('image-ssim');
const compressing = require('compressing');
const request = require('request');
const { AttachmentBuilder } = require('discord.js');

const [EMOJI_LABEL] = ['🏷️']

function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

// const { twitter } = require('./twitterListener2.js');
let blacklist = [];
let imagesList = [];

const dataPath = `./blacklist`;
const listPath = `./blacklist/blacklist.txt`;

// resize image to 8x8
const toCompressData = (image, imgWidth = 8) => {
    const mainCanvas = canvas.createCanvas(imgWidth, imgWidth);
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, imgWidth, imgWidth);
    return ctx.getImageData(0, 0, imgWidth, imgWidth);;
};

const downloadImage = async (url) => {
    // get filename
    const [, filename, ext] = url.match(/\/([^\/]*)\.([^\/\.]*)$/) || [, null, null];
    if (!filename || !ext) { return false; }

    // download file
    const file = `./${filename}_${process.uptime().toString().replace('.', '')}.${ext}`;
    if (!fs.existsSync(file)) await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(file)).on('close', resolve); });
    await sleep(500);
    if (!fs.existsSync(file)) { return false; }

    // read image
    let image = await canvas.loadImage(file).catch((e) => { console.log(url); console.log(file, e.message); return null; });
    if (!image) { return false; }
    image = toCompressData(image, 8);
    image.channels = 4;

    // del twitter image
    if (fs.existsSync(file)) { fs.unlinkSync(file); }

    return image;
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

class AntiFilterCore {

    client = null;
    channel = null;
    constructor() {


    };

    async setClient(client) {
        this.client = client;

        // get channel/message by id
        this.channel = await client.channels.fetch(`872122458545725451`).catch(() => { return null; });
        if (this.channel) { return; }
        this.channel = null;
    }

    tweetStatus = new Map();

    async getImageComparison(message) {

        // check tweet url
        if (!regUrl.test(message.content)) { return false; }

        let [, username, , tID] = content.match(regUrl);
        if (tID) {

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
            if (this.tweetStatus.get(tID) == 1) {
                // process still running, mamby error
                console.log(`getImageComparison timeout, mID: ${message.id}, tID: ${tID}`);
                return false;

            } else if (this.tweetStatus.get(tID) == 2) {
                // image not in blacklist
                return false;

            } else if (imagesList.includes(this.tweetStatus.get(tID))) {
                // image in blacklist
                return { username, tID };

            }


            // start process
            this.tweetStatus.set(tID, 1);

            // empty embed
            if (!message.embeds ||
                !message.embeds[0] ||
                !message.embeds[0].image) {
                this.tweetStatus.set(tID, 0);
                return false;
            }

            // download image
            let embedImage = message.embeds[0].image;
            let image = await downloadImage(embedImage.url) || await downloadImage(embedImage.proxyURL);

            // download image fail
            if (!image) {
                this.tweetStatus.set(tID, 0);
                return false;
            }

            let imageInBlackList = await imageComparison(image).catch((e) => { return e });
            if (imageInBlackList) {
                // image in blacklist
                // process done, set result
                this.tweetStatus.set(tID, { username, tID, image: imageInBlackList.image });
                return { username, tID, ssim: imageInBlackList.ssim, image: imageInBlackList.image };

            } else {
                // image not in blacklist
                // process done
                this.tweetStatus.set(tID, 2);
                return false;
            }
        } else {
            return { username };
        }
    }

    logToDiscord(content) {
        this.channel.send({ content });
    }



    // upload blacklist to discord
    async uploadBlacklist() {
        if (!this.client || !fs.existsSync(dataPath)) { return; }

        // update blacklist
        if (fs.existsSync(listPath)) { fs.unlinkSync(listPath); }
        fs.writeFileSync(listPath, blacklist.join('\r\n'), 'utf8');

        // update blacklist detail
        // get cache data
        let detailData = { guro: [], other: [], fakeuser: {} };
        for (let { username, tID, image } of mainAFCore.tweetStatus) {
            let url = `https://twitter.com/${username}/status/${tID}`;

            if (image.includes('guro')) { detailData.guro.push(url); }
            else if (image.includes('other')) { detailData.other.push(url); }

            else if (image.includes('fakeuser')) {
                let [, victim] = image.match(/\.\/blacklist\/fakeuser\/[^\/]+\//) || [, 'null'];
                if (!detailData.fakeuser[victim]) { detailData.fakeuser[victim] = []; }
                detailData.fakeuser[victim].push(url);
            }
        }
        // get text files data
        const filenames = fs.readdirSync(dataPath).filter(file => file.endsWith('.txt'));
        for (let filename of filenames) {
            if (filename == 'blacklist.txt') { continue; }

            const filepath = `${dataPath}/${filename}`;
            let { name } = path.parse(filepath);

            let lines = fs.readFileSync(filepath, 'utf8').split(/\r?\n/);
            if (['guro', 'other'].includes(name)) {
                for (let url of lines) {
                    // detail for line
                    detailData[name].push(url);
                }
            } else {
                for (let url of lines) {
                    // detail for line
                    detailData.fakeuser[name].push(url);
                }
            }

            if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); }
        }
        // todo, check anti user dead or not, clear list
        // save to file
        fs.writeFileSync(`${dataPath}/guro.txt`, detailData.guro.join('\r\n'), 'utf8');
        fs.writeFileSync(`${dataPath}/other.txt`, detailData.other.join('\r\n'), 'utf8');
        for (let victim of Object.keys(detailData.fakeuser)) {
            fs.writeFileSync(`${dataPath}/${victim}.txt`, detailData.fakeuser[victim].join('\r\n'), 'utf8');
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
        if (!client) { return; }
        if (fs.existsSync(dataPath)) {
            fs.rmSync(dataPath, { recursive: true, force: true });
        }

        // get channel/message by id
        const channel = await client.channels.fetch(`872122458545725451`).catch(() => { return null; });
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
        if (fs.existsSync(listPath)) {
            blacklist = [];
            const text = fs.readFileSync(listPath, 'utf8');
            for (let _line of text.split(/\r?\n/)) {
                let line = _line.trim();
                if (!!line && !blacklist.includes(line)) {
                    blacklist.push(line);
                }
            }
        }

        // get image blacklist
        if (fs.existsSync(dataPath)) {
            imagesList = this.readdirSync(dataPath)
                .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
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

            await mainAFCore.uploadBlacklist();
            // await mainAFCore.downloadBlacklist();
            // mainAFCore.readBlacklist();
            return;
        }
    },

    async execute(message, pluginConfig, command, args, lines) {

        const { client, content, channel } = message;

        // twitter url
        if (regUrl.test(content)) {

            // 30sec timeout
            for (let i = 0; i < 30; ++i) {
                if (message.embeds.length > 0) {
                    // found discord embed, break
                    break;
                }
                // wait 2sec & update message
                await sleep(1000);
                message = await message.channel.messages.fetch({ message: message.id, force: true }).catch(() => { return null; });
                // can't found message, maybe deleted
                if (!message) { return false; }
            }

            // ckeck image, get result
            let result = await mainAFCore.getImageComparison(message);
            let { username, tID, ssim, image } = result;

            // found tID but tweet image not in blacklist
            if (!result) { return false; }

            // image in blacklist
            console.log(username, tID, ssim, image);

            // todo, dont delete message when testrun 
            // // delete message
            // message.delete().catch(() => { });
            mainAFCore.logToDiscord(`delete msg: ${message.url}`);

            // keep blacklist
            // image in blacklist but username not, add to blacklist
            if (username && !blacklist.includes(username)) {
                blacklist.push(username);
                mainAFCore.logToDiscord(`[+] ${username}`);
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

            if (!/\d+/.test(args[0])) { return; }
            if (!/^\..+\/$/.test(args[1])) { return; }

            // find target image
            let src = imagesList.find((img => img.includes(args[0])));
            if (!src) { return; }

            let { name, ext } = path.parse(src);
            let dest = `${args[1]}${name}${ext}`;

            fs.mkdirSync(args[1], { recursive: true });
            fs.copyFileSync(src, dest);
            if (fs.existsSync(src) && fs.existsSync(dest)) { fs.unlinkSync(src); }

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

        // skip other emoji
        if (reaction.emoji.toString() != EMOJI_LABEL) { return; }

        // is twitter url or not
        if (!regUrl.test(content)) { return; }

        // get tweet data
        const [, username, , tweetID] = (content.match(regUrl) || [, null, , null]);
        // get image data
        const embedImage = (((embeds || [])[0]) || {}).image || null;

        // check tweet data
        if (username == null || tweetID == null) { return; }

        let resultLog = [];

        // set username to blacklist
        if (!blacklist.includes(username)) {
            blacklist.push(username);
            resultLog.push(`[+] ${username}`);
        }

        // get twitter image
        if (embedImage) {

            let image = await downloadImage(embedImage.url) || await downloadImage(embedImage.proxyURL);
            if (image) {

                // check image in blacklist or not
                let imageInBlackList = await imageComparison(image).catch((e) => { return null });
                if (!imageInBlackList) {
                    // image not in blacklist
                    // set status
                    mainAFCore.tweetStatus.set(tweetID, { username, tweetID, image: imageInBlackList.image });

                    // get image data
                    const [, ext] = url.match(/([^\.]+)$/) || [, null];
                    const filename = `${username}-${tweetID}-img1.${ext}`;
                    const filepath = `./blacklist/new/${filename}`;
                    // download image to blacklist
                    if (!imagesList.includes(filepath)) {
                        imagesList.push(filepath);
                        resultLog.push(`[+] ${filename}`);
                        await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); });
                    }
                }
            }
        }

        if (resultLog.length > 0) {
            mainAFCore.logToDiscord(resultLog.join('\n'));
            mainAFCore.uploadBlacklist();
        }
        // message.delete().catch(() => { });
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

