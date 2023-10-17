
const fs = require('fs');
const path = require('path');
const canvas = require('canvas');
const ssim = require('image-ssim');
const compressing = require('compressing');
const request = require('request');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const [EMOJI_LABEL] = ['🏷️']

const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); }
const md5 = (source) => require('crypto').createHash('md5').update(source).digest('hex');

// const { twitter } = require('./twitterListener2.js');
let imagesList = [];

const dataPath = `./blacklist`;

// resize image to 8x8
const imageToCompressData = (image, imgWidth = 8) => {
    const mainCanvas = canvas.createCanvas(imgWidth, imgWidth);
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, imgWidth, imgWidth);
    return ctx.getImageData(0, 0, imgWidth, imgWidth);;
};

const compressImageFile = async (file) => {
    if (!fs.existsSync(file)) { return false; }

    // read image
    let image = await canvas.loadImage(file).catch((e) => { return null; });
    if (!image) { return false; }

    const mainCanvas = canvas.createCanvas(8, 8);
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, 8, 8);

    const buffer = mainCanvas.toBuffer('image/png');
    fs.unlinkSync(file);
    fs.writeFileSync(file.replace('.jpg', '.png'), buffer);

    return true;
}

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
    image = imageToCompressData(image, 8);
    image.channels = 4;

    // del twitter image
    if (fs.existsSync(file)) { fs.unlinkSync(file); }

    return { canvas: image, url };
}

const imageComparison = async (image1) => {

    // get all blacklist images
    for (let file2 of imagesList) {
        let image2 = await canvas.loadImage(file2).catch((e) => { console.log(file2, e.message); return null; });
        if (!image2) { continue; }
        image2 = imageToCompressData(image2, 8);
        image2.channels = 4;

        // get ssim result
        let result = ssim.compare(image1, image2);
        if (result.ssim < 0.95) { continue; }   // different image

        return { ssim: result.ssim, image: file2 };
    }
    return false;
}

// JSON.stringify
const replacer = (key, value) => {
    if (value instanceof Map) {
        let result = {};
        for (let [k, v] of value) { result[k] = v; }
        return result
    }
    else if (value instanceof Set) { return [...value]; }
    else { return value; }
}

// [, username, , tID]
const regUrl = /https?:\/\/twitter\.com(?:\/([^\/]+)(?:\/status\/(\d+))?)?/i;
const regUsername = /\(@([A-Za-z0-9_]+)\)$/;
const CODE_CHANNEL = '872122458545725451';
const LOG1_CHANNEL = '713623232070156309';
const LOG2_CHANNEL = '1009645372831977482';
class AntiFilterCore {

    client = null;
    channels = new Map();
    constructor() { };

    async setClient(client) {
        this.client = client;

        // get channel/message by id
        for (let cID of [CODE_CHANNEL, LOG1_CHANNEL, LOG2_CHANNEL]) {
            client.channels.fetch(cID)
                .then((channel) => { if (channel) { this.channels.set(cID, channel); } })
                .catch(() => { return null; });
        }

    }

    tweetStatus = new Map();

    async getImageComparison(username, tID, embedImage) {

        // check process status
        let tweetStatu = this.tweetStatus.get(tID);

        if (tweetStatu === undefined) {
            // waiting process
            this.tweetStatus.set(tID, 0);
            tweetStatu = 0;
        } else if (this.tweetStatus.get(tID) == 1) {
            // 30sec timeout
            for (let i = 0; i < 60; ++i) {
                await sleep(500);

                tweetStatu = this.tweetStatus.get(tID);
                if (tweetStatu != 1) {
                    // process done, break
                    break;
                }
            }
        }

        // if process done, check result
        if (tweetStatu == 1) {
            // process still running, maybe error
            console.log(`getImageComparison timeout, mID: ${message.id}, tID: ${tID}`);
            return false;

        } else if (tweetStatu == 2) {
            // image not in blacklist
            return false;

        } else if (tweetStatu != 0 && tweetStatu.image) {
            imagesList.includes(tweetStatu.image)
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

        let imageInBlackList = await imageComparison(image.canvas).catch((e) => { console.log(e); return false });
        if (imageInBlackList) {
            // image in blacklist
            // process done, set result
            let result = { username, tID, ssim: imageInBlackList.ssim, image: imageInBlackList.image }
            this.tweetStatus.set(tID, result);
            return result;

        } else {    // imageInBlackList == false
            // image not in blacklist
            // check username

            if (spamUserList.userIDList.has(username)) {
                // username in blacklist, kuro, new spam image

                // set folder
                if (!fs.existsSync('./blacklist/new')) { fs.mkdirSync('./blacklist/new', { recursive: true }); }

                // get image data
                const url = image.url;
                const [, ext] = url.match(/([^\.]+)$/) || [, null];
                let filename = `${username}-${tID}-img1.${ext}`;
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
                mainAFCore.tweetStatus.set(tID, result);
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

    logedMsg = new Set();

    async logToDiscord(message, cID = CODE_CHANNEL) {

        {
            let msg = (typeof message == 'string') ? message : JSON.stringify(message);
            let hash = md5(msg.trim());

            if (this.logedMsg.has(hash)) { return; }

            this.logedMsg.add(hash);
        }

        if (this.channels.has(cID)) {
            const channel = this.channels.get(cID);

            let payload = (typeof message == 'string') ? { content: message } : message;
            channel.send(payload).catch((e) => console.log(e.message));

            if (/^\[\+\] \S+$/.test(message)) {
                // fetch messages
                let msgs = await channel.messages.fetch({ force: true });
                for (let [mID, msg] of msgs) {
                    if (msg.content?.startsWith(`[TAF] Get user ${message.replace('[+] ', '')} identifier fail!`)) {
                        msg.delete().catch(() => { });
                    }
                }
            }

        } else {
            console.log(`<#${cID}>`, message);
        }
    }

    async backupImageToDiscord(imageFile) {
        const channel = await this.client.channels.fetch('1152118664800260217');
        if (!channel) { console.log(`unknown channel <#1152118664800260217>`); return; }

        const { name } = path.parse(imageFile);
        const zipFile = `${name}.zip`;
        await compressing.zip.compressFile(imageFile, zipFile).catch(() => { });

        // upload zip file
        let files = [];
        files.push(new AttachmentBuilder(zipFile, { name: zipFile }));
        await channel.send({ content: ' ', files }).catch(console.log);
        console.log(`[TAF] upload ${zipFile} ${(fs.statSync(zipFile)?.size / 1024).toFixed(2)} KB`);

        fs.unlinkSync(zipFile);
    }

    uploadTimout = null;
    // upload blacklist to discord
    async uploadBlacklist(delay = 120 * 1000) {
        if (!this.client || !fs.existsSync(dataPath)) { return; }

        // let jsonStr = JSON.stringify(spamUserList, replacer, 2).replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
        let jsonStr = JSON.stringify(spamUserList, replacer);
        fs.writeFileSync(`${dataPath}/blacklist.json`, jsonStr, 'utf8');

        if (this.uploadTimout != null) { clearTimeout(this.uploadTimout); }
        this.uploadTimout = setTimeout(async () => { this._uploadBlacklist(); this.uploadTimout = null }, delay);
    }
    async _uploadBlacklist() {
        console.log(`[TAF] uploadBlacklist`);
        if (!this.client || !fs.existsSync(dataPath)) { return; }

        // if (fs.existsSync("./.env")) { return; }

        // get channel/message by id
        const channel = await this.client.channels.fetch(CODE_CHANNEL).catch(() => { return null; });
        if (!channel) { return; }
        const msg = await channel.messages.fetch({ message: `1111207166871871538`, force: true }).catch(() => { return null; });
        if (!msg) { return; }

        // zip blacklist files
        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }))
            .replace(/[\/:]/g, '').replace(', ', '_');
        const filePath = `${nowDate}.zip`;
        await compressing.zip.compressDir(dataPath, filePath).catch(() => { });

        // upload zip file
        let files = [];
        let filenames = fs.readdirSync('./').filter(file => /^\d{8}_\d{6}\.zip$/.test(file));
        if (filenames.length > 0) {
            filenames = filenames.sort().reverse();
            let fileDate = '';
            for (let file of filenames) {
                if (fileDate == file.substring(0, 8)) {
                    fs.unlinkSync(file);
                    continue;
                }
                fileDate = file.substring(0, 8);

                files.push(new AttachmentBuilder(file, { name: file }));
                console.log(`[TAF] upload ${file} ${((fs.statSync(file)?.size || 0) / 1024).toFixed(2)} KB`);
                if (files.length >= 3) { break; }
            }
        }

        if (files.length > 0) {
            await msg.edit({ content: ' ', files }).catch(console.log);
            console.log(`[TAF] uploadBlacklist done!`);
        }

        // if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    }

    async downloadBlacklist() {
        console.log(`[TAF] downloadBlacklist`);
        if (!this.client) { return; }
        if (fs.existsSync(dataPath)) {
            // if (fs.existsSync("./.env")) { return; }
            fs.rmSync(dataPath, { recursive: true, force: true });
        }

        // get channel/message by id
        const channel = await this.client.channels.fetch(CODE_CHANNEL).catch(() => { return null; });
        if (!channel) { return; }
        const msg = await channel.messages.fetch({ message: `1111207166871871538`, force: true }).catch(() => { return null; });
        if (!msg) { return; }

        // download blacklist files
        for (const [key, value] of msg.attachments) {
            const { name, url } = value;
            const filepath = `./${name}`;

            // download blacklist files
            if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); }
            await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); })
                .then(() => console.log(`[TAF] download ${filepath} ${(fs.statSync(filepath)?.size / 1024).toFixed(2)} KB`));
        }

        // unzip last version
        let filenames = fs.readdirSync('./').filter(file => /^\d{8}_\d{6}\.zip$/.test(file));
        if (filenames.length > 0) {
            filenames = filenames.sort().reverse();
            await compressing.zip.uncompress(filenames[0], './').catch(() => { })
                .then(() => console.log(`[TAF] unzip ${filenames[0]}`));
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

    async readBlacklist() {
        spamUserList = new SpamUserList();

        // get blacklist
        let raw = fs.readFileSync(`${dataPath}/blacklist.json`, 'utf8');
        let jsonRaw = JSON.parse(raw);

        for (let username of Object.keys(jsonRaw.userIDList)) {
            let uID = jsonRaw.userIDList[username];
            let user = jsonRaw.userList[uID];

            twitter.userIDs.set(username, uID);

            let { addTime } = user;
            await spamUserList.addUser(username, uID, addTime);

            for (let tID of Object.keys(user.tweetList)) {
                let tweet = user.tweetList[tID];

                let { image, ssim } = tweet
                spamUserList.addUserTweet(username, { tID, image, ssim });

                for (let tag of tweet.tags) {
                    spamUserList.addUserTweetTag(username, tID, tag);
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





class SpamTweet {
    tID;
    image = '';
    ssim = '';
    tags = new Set();

    constructor({ tID, image, ssim }) {
        this.tID = tID;
        this.image = image;
        this.ssim = ssim;
    };
}

class SpamUser {
    username;
    uID;
    addTime;

    // <tID>, <SpamTweet>
    tweetList = new Map();
    tags = new Set();

    constructor({ username, uID, addTime }) {
        this.uID = uID;
        this.username = username;
        this.addTime = addTime || Date.now();
    };

    updateTags(oldTag, newTag) {
        let keepTag = false;
        for (let [tID, tweet] of this.tweetList) {
            if (tweet.tags.has(oldTag)) { keepTag = true; break; }
        }
        if (!keepTag) { this.tags.delete(oldTag) }
        this.tags.add(newTag);

        return this.tags;
    }
}

class SpamUserList {
    // <uID>, <SpamUser>
    userList = new Map();
    // <username>, <uID>
    userIDList = new Map();

    constructor() { };

    async addUser(username, uID, addTime) {
        if (!uID) { uID = await twitter.getUserID(username) }

        if (!/^\d+$/.test(uID)) {

            // User has been suspended: [rXlxi7akZjaHCUG].
            console.log(`${username} uID: <${uID}>`)

            // check userIDList
            let _uID = this.userIDList.get(username);

            // still error, new user but already banned
            if (!/^\d+$/.test(_uID)) {
                let res = `[TAF] Get user ${username} identifier fail! uID: ${uID}`;
                console.log(res);
                return res;
            }

            uID = _uID;
        }

        if (this.userList.has(uID)) {
            let res = `[TAF] Add user ${username} fail, found exist uID!`;
            console.log(res);
            console.log(this.userList.get(uID));
            return res;
        }

        this.userList.set(uID, new SpamUser({ username, uID, addTime }));
        this.userIDList.set(username, uID);
        return true;
    }
    getUser(username) {
        let uID = this.userIDList.get(username);    // uID or undefined
        return this.userList.get(uID);              // user or undefined
    }
    removeUser(username) {

        let uID = this.userIDList.get(username);    // uID or undefined
        this.userIDList.delete(username);
        return this.userList.delete(uID);           // true or false
    }

    addUserTweet(username, { tID, image, ssim }) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        return user?.tweetList.set(tID, new SpamTweet({ tID, image, ssim }));    // tweetList or undefined
    }
    getUserTweets(username) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        return user?.tweetList;                     // tweetList or undefined
    }
    removeUserTweet(username, tID) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        return user?.tweetList.delete(tID);         // true or false or undefined
    }

    addUserTweetTag(username, tID, tag) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        user?.tags.add(tag);
        let tweet = user?.tweetList.get(tID);       // tweet or undefined
        return tweet?.tags.add(tag);                // tags or undefined
    }
    getUserTags(username) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        return user?.tags;                          // tags or undefined
    }
    getUserTweetTags(username, tID) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        let tweet = user?.tweetList.get(tID);       // tweet or undefined
        return tweet?.tags;                         // tags or undefined
    }
    removeUserTweetTag(username, tID, tag) {

        let uID = this.userIDList.get(username);    // uID or undefined
        let user = this.userList.get(uID);          // user or undefined
        let tweet = user?.tweetList.get(tID);       // tweet or undefined
        return tweet?.tags.delete(tag);             // true or false
    }
}

let spamUserList = new SpamUserList();










// https://twitter.com/
// https://twitter.com/fj_dragonage
// https://twitter.com/fj_dragonage/status/1689818919828180992
const messageExecute = async (message) => {

    // get message raw data
    const content = message.content || '';
    const embed = (message.embeds || [null])[0];  // embed or undefined
    const embedImage = embed?.image || embed?.thumbnail;        // image or undefined
    const author = embed?.author;

    // get embed image url
    const imageUrl = embedImage?.url || null;
    const imageProxyURL = embedImage?.proxyURL || null;
    // get display username
    const [, authorName] = (author?.name)?.match(regUsername) || [, null];
    // get username, tweetID
    let uID;
    let [, username, tID] = (content.match(regUrl) || [, null, null]);



    // embed without image or tweet embed wrong?
    if ((!imageUrl && !imageProxyURL) || !authorName) {
        // can't found image or embed
        // retrun false to call refresh method
        return false;
    }



    // === tweet with embed ===
    if ((!imageUrl && !imageProxyURL)) {
        // but without image

        // check db
        if (spamUserList.userIDList.has(authorName)) {
            // embed user in db, delete message
            message.delete().catch(() => { });
            // log
            const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
                .setTitle(`推特過濾器:`)
                .addFields([
                    { name: `Content:`, value: content },
                    { name: `Channel:`, value: message.url },
                    { name: `Username:`, value: authorName },
                ]);
            mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOG1_CHANNEL)

            // return true, end refresh method
            return true;
        }
    }



    // === tweet with embed & image ===

    // try get uID from db
    if (spamUserList.userIDList.has(authorName)) {
        uID = spamUserList.userIDList.get(authorName);
        username = authorName;
    }
    if (!uID && /^\d+$/.test(username) && [message.client.user.id, '353625493876113440'].includes(message.author?.id)) {
        uID = username;
        username = authorName;
    }
    // console.log(`username: <${username}>, uID: <${uID}>`)

    // check image
    // image in blacklist
    if (imageUrl || imageProxyURL) {

        let result = await mainAFCore.getImageComparison(username, tID, embedImage);

        // image in blacklist
        if (result) {
            let { ssim, image } = result;

            // image in blacklist
            console.log(`[TAF] image in blacklist. ${username} ${tID} ${ssim} ${image}`);

            // image in blacklist but username not, add to blacklist
            if (!spamUserList.userIDList.has(username) && !spamUserList.userList.has(tID)) {
                // if didn't got uID from crawler, uID == undefined
                // get uID by API in addUser, if uID == null, get uID in method
                let res = await spamUserList.addUser(username, uID, Date.now());
                mainAFCore.logToDiscord(res === true ? `[+] ${username}` : res);
            }

            // set data to db
            let res = spamUserList.addUserTweet(username, { tID, ssim, image })
            if (res) {
                // get tag from image filepath
                let [, tag] = image.match(/^\.\/blacklist\/(.+)\/[^\/]+$/) || [, null];
                if (tag) { spamUserList.addUserTweetTag(username, tID, tag); }
            } else {
                // add user tweet fail
                mainAFCore.logToDiscord(`!getuid <https://twitter.com/${username}/status/${tID}>`);
            }

            mainAFCore.uploadBlacklist();

            // embed image in db, delete message
            message.delete().catch(() => { });
            if (!image.includes('fakeuser')) {
                // log
                try {
                    let fields = []
                    if (content) { fields.push({ name: `Content:`, value: content }) }
                    if (message.url) { fields.push({ name: `Channel:`, value: message.url }) }
                    if (authorName) { fields.push({ name: `Username:`, value: authorName }) }
                    if (uID) { fields.push({ name: `uID:`, value: uID }) }
                    if (image) { fields.push({ name: `Image:`, value: image }) }

                    const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
                        .setTitle(`推特過濾器:`)
                        .addFields(fields);
                    mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOG1_CHANNEL)
                } catch (e) {
                    console.log(`/plugins/twitterAntiFilter.js:710:22`, e.message);
                }
            }

        } else {
            // image not in blacklist

            if (spamUserList.userIDList.has(authorName)) {
                // but user in blacklist, add new image to blacklist

                // set folder
                if (!fs.existsSync('./blacklist/new')) { fs.mkdirSync('./blacklist/new', { recursive: true }); }

                // get image data
                const url = imageUrl || imageProxyURL;
                const [, ext] = url.match(/([^\.]+)$/) || [, null];
                let filename = `${username}-${tID}-img1.${ext}`;
                let filepath = `./blacklist/new/${filename}`;
                for (let i = 1; true; ++i) {
                    if (fs.existsSync(filepath)) {
                        filename = filename.replace(`-img${i}.`, `-img${i + 1}.`);
                        filepath = filepath.replace(`-img${i}.`, `-img${i + 1}.`);
                    } else { break; }
                }

                // set image to blacklist
                imagesList.push(filepath);
                mainAFCore.logToDiscord(`[+] ${filename}`);

                // download image to blacklist
                await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); });
                // or use image.canvas ?

                let result = { username, tID, ssim: 1.0, image: filepath }

                // set status
                mainAFCore.tweetStatus.set(tID, result);

                // set data to db
                let res = spamUserList.addUserTweet(username, { tID, ssim: 1.0, image: filepath })
                if (res) {
                    spamUserList.addUserTweetTag(username, tID, 'new');
                } else {
                    mainAFCore.logToDiscord(`!getuid <https://twitter.com/${username}/status/${tID}>`);
                }

                mainAFCore.uploadBlacklist();

                // embed user in db, delete message
                message.delete().catch(() => { });
                // log
                const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
                    .setTitle(`推特過濾器:`)
                    .addFields([
                        { name: `Content:`, value: content },
                        { name: `Channel:`, value: message.url },
                        { name: `Username:`, value: authorName },
                        { name: `uID:`, value: uID },
                    ]);
                mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOG1_CHANNEL)

            }
        }

        // return true, end refresh method
        return true;
    }
    return false;
}











module.exports = {
    name: 'twitterAntiFilter',
    description: "twitterAntiFilter",

    async setup(client) {
        if (client.user.id == `920485085935984641`) {
            mainAFCore.setClient(client);

            // if (fs.existsSync(dataPath)) {
            //     await mainAFCore.readBlacklist();
            //     await mainAFCore.uploadBlacklist(0);
            //     return;
            // }

            await mainAFCore.downloadBlacklist();
            await mainAFCore.readBlacklist();
            return;
        }
    },

    async execute(message, pluginConfig, command, args, lines) {

        const { client, content, channel, embeds, id } = message;

        // is twitter url
        if (regUrl.test(content) && command != 'getuid') {

            let embedChecked = await messageExecute(message);

            if (!embedChecked && message.author?.id == client.user.id) {
                for (let i = 0; i < 20; ++i) {
                    await sleep(1000);

                    // check embed after 1 sec
                    const embed = (embeds || [null])[0];  // embed or null
                    const author = embed?.author;
                    const [, authorName] = (author?.name)?.match(regUsername) || [, null];
                    // found ebmed, break, wait messageUpdate => messageExecute result
                    if (authorName) { break; }

                    // edit message, trigger messageUpdate, wait 1 sec loop
                    message = await message.edit({ content: message.content }).catch(() => null);

                    // edit error, break
                    if (!message) { break; }
                }
            }

            return;
        }

        if (message.author?.id != `353625493876113440`) { return; }
        if (client.user.id != `920485085935984641`) { return; }

        if (command == 'updatabl') {

            if (/\d+/.test(args[0])) {
                let uID = args[0];
                // await twitter.getUsername(uID);
                // Array.from(spamUserList.userIDList.values()).includes(uID);

                let oldUsername, newUsername;
                // get old username
                for (let [username, _uID] of spamUserList.userIDList) {
                    if (_uID != args[0]) { continue; }
                    oldUsername = username;
                }
                // get new username
                newUsername = await twitter.getUsername(args[0]);

                if (oldUsername != newUsername) {
                    spamUserList.userIDList.delete(oldUsername);
                    spamUserList.userIDList.set(newUsername, uID);
                    spamUserList.userList.get(uID).username = newUsername;
                    mainAFCore.uploadBlacklist();
                }
            }

            return;
        }
        if (command == 'adduid') {

            if (!args[0] || !args[1]) {

                channel.send({ embeds: [new EmbedBuilder().setDescription([`!adduid <username> <userID>`, `Ex:`, `!move Mpwpwp1787259 1657108133142224896`].join('\n'))] });
                return;
            }

            let username = args[0];
            let uID = args[1];
            // !adduid Mpwpwp1787259 1657108133142224896
            // !adduid Zkiart168463 1657141092171620352

            twitter.userIDs.set(username, uID);

            let res = await spamUserList.addUser(username, uID, Date.now());
            mainAFCore.logToDiscord(res === true ? `[+] ${username}` : res);

            mainAFCore.uploadBlacklist();

        }
        if (command == 'rembl') {

            let log = [];
            for (let target of args) {
                if (spamUserList.userIDList.has(target)) {
                    spamUserList.removeUser(target);
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
            await mainAFCore.readBlacklist();
        }

        if (command == 'blimg') {
            let result = '';

            for (let file of imagesList) {

                const size = fs.statSync(file)?.size || 0;
                let sizeText = size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} B`;
                let line = `${sizeText.padStart(10, ' ')} ${file}`;

                if (result.length + line.length > 1980) {
                    await channel.send({ content: `\`\`\`${result}\`\`\`` }).catch((e) => console.log(e.message));
                    result = line;
                    continue;
                }

                result += `\n${line}`;
            }
            await channel.send({ content: `\`\`\`${result}\`\`\`` }).catch((e) => console.log(e.message));
        }

        if (command == 'move') {

            if (!/\d+/.test(args[0]) ||         // by tID
                !/^\S+$/.test(args[1])) {    // target file path

                channel.send({ embeds: [new EmbedBuilder().setDescription([`!move <tID> <type>`, `Ex:`, `!move 1639250471847333889 fakeuser/2K4S4_K4H4R4`].join('\n'))] });
                return;
            }

            const tID = args[0];
            const type = args[1];

            if (!['guro', 'other'].includes(type) &&
                !/^fakeuser\/[^\/]+$/.test(type)) {

                channel.send({ embeds: [new EmbedBuilder().setDescription(`Unknown type`)] });
                return;
            }

            // find target image
            const src = imagesList.find((img => img.includes(tID)));
            if (src) {
                // found target image

                const dir = `./blacklist/${type}`;
                fs.mkdirSync(dir, { recursive: true });

                const { base } = path.parse(src);
                let base_ = `${base}${type == 'guro' ? '_' : ''}`.replace(/_+$/, '_');
                const dest = `${dir}/${base_}`;
                if (src == dest) { return; }

                fs.copyFileSync(src, dest);
                if (fs.existsSync(src) && fs.existsSync(dest)) {
                    fs.unlinkSync(src);
                    imagesList = imagesList.filter((ele) => (ele !== src));
                    imagesList.push(dest);
                }

                // move url type                
                let [, oldTag] = src.match(/^\.\/blacklist\/(.+)\/[^\/]+$/) || [, null];
                let [, newTag] = dest.match(/^\.\/blacklist\/(.+)\/[^\/]+$/) || [, null];

                for (let [uID, spamUser] of spamUserList.userList) {
                    let update = false;
                    for (let [tID, SpamTweet] of spamUser.tweetList) {

                        if (SpamTweet.image != src) { continue; }

                        SpamTweet.image = dest;
                        SpamTweet.tags.delete(oldTag);
                        SpamTweet.tags.add(newTag);
                        update = true;
                    }
                    if (update) { spamUser.updateTags(oldTag, newTag); }
                }
            }

            mainAFCore.uploadBlacklist();
        }

        if (command == 'trimimg') {

            if (!/\d+/.test(args[0])) {           // by image tID

                channel.send({ embeds: [new EmbedBuilder().setDescription([`!trimimg <tID>`, `Ex:`, `!trimimg 1639250471847333889`].join('\n'))] })
                return;
            }

            message.delete().catch(() => { });

            const tID = args[0];

            // find target image
            const imageFile = imagesList.find((img => img.includes(tID)));
            if (imageFile) {
                // found target image

                await mainAFCore.backupImageToDiscord(imageFile);


                await compressImageFile(imageFile);

                const pngFile = imageFile.replace('.jpg', '.png');
                if (pngFile != imageFile) {

                    for (let [uID, spamUser] of spamUserList.userList) {
                        let update = false;
                        for (let [tID, SpamTweet] of spamUser.tweetList) {

                            if (SpamTweet.image != imageFile) { continue; }

                            SpamTweet.image = pngFile;
                        }
                    }

                    for (let i = 0; i < imagesList.length; ++i) {
                        if (imagesList[i] == imageFile) {
                            imagesList[i] = pngFile;
                        }
                    }
                }
            }

            mainAFCore.uploadBlacklist();
        }
    },

    async messageUpdate(oldMessage, message, pluginConfig) {
        // is twitter url
        if (regUrl.test(message.content || '')) {
            messageExecute(message);
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (user.bot) { return false; }
        if (user.id != `353625493876113440`) { return; }

        // get msg data
        const { message } = reaction;
        const { client, embeds } = message;
        const content = message.content || '';

        if (client.user.id != `920485085935984641`) { return; }

        // debug emoji
        if (reaction.emoji.toString() == '🔹' && content) {

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



        // get message raw data
        const embed = (embeds || [null])[0];  // embed or null
        const embedImage = embed?.image || embed?.thumbnail;        // image or undefined
        const author = embed?.author;

        // get embed image url
        const imageUrl = embedImage?.url || null;
        const imageProxyURL = embedImage?.proxyURL || null;
        // get display username
        const [, authorName] = (author?.name)?.match(regUsername) || [, null];
        // get username, tweetID
        let uID, username;
        const [, urlUsername, tID] = (content.match(regUrl) || [, null, null]);


        if (authorName) {
            // found username from embed
            username = authorName;

            // get real username, get uID from crawler db
            if (spamUserList.userIDList.has(username)) {
                uID = spamUserList.userIDList.get(username);
            }
            // can't get uid from IDList, urlUsername match \d+, msg author is this bot
            if (!uID && /^\d+$/.test(username) && [message.client.user.id, '353625493876113440'].includes(message.author?.id)) {
                uID = urlUsername;
                username = authorName;
            } else { /* got uid, got username */ }
        } else {
            // can't found embed, check url
            username = urlUsername;
            if (!/^\d+$/.test(username) && spamUserList.userIDList.has(username)) {
                // username is not uid, and found uid from ID List
                uID = spamUserList.userIDList.get(username);
            } else {
                // no username-uid, error
                // shouldn't here
                console.log(`[TAF] #EMOJI_LABEL get uid error`);
                reaction.users.remove(user).catch((e) => console.log(`[TAF] reac.remove error,`, e.message));
                return;
            }
        }


        // set username to blacklist
        if (!spamUserList.userIDList.has(username) && !spamUserList.userList.has(tID)) {
            // if didn't got uID from crawler, uID == undefined
            // get uID by API in addUser
            let res = await spamUserList.addUser(username, uID, Date.now());
            mainAFCore.logToDiscord(res === true ? `[+] ${username}` : res);
        }

        // get twitter image
        if (tID && embedImage) {

            let image = await downloadImage(imageUrl, imageProxyURL);
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
                    let filename = `${username}-${tID}-img1.${ext}`;
                    let filepath = `./blacklist/new/${filename}`;
                    for (let i = 1; true; ++i) {
                        if (fs.existsSync(filepath)) {
                            filename = filename.replace(`-img${i}.`, `-img${i + 1}.`);
                            filepath = filepath.replace(`-img${i}.`, `-img${i + 1}.`);
                        } else { break; }
                    }

                    // set image to blacklist
                    imagesList.push(filepath);
                    mainAFCore.logToDiscord(`[+] ${filename}`);

                    // download image to blacklist
                    await new Promise((resolve) => { request(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); });
                    // or use image.canvas ?

                    let result = { username, tID, ssim: 1.0, image: filepath }

                    // set status
                    mainAFCore.tweetStatus.set(tID, result);

                    // set data to db
                    let res = spamUserList.addUserTweet(username, { tID, ssim: 1.0, image: filepath })
                    if (res) {
                        spamUserList.addUserTweetTag(username, tID, 'new');
                    } else {
                        mainAFCore.logToDiscord(`!getuid <https://twitter.com/${username}/status/${tID}>`);
                    }
                }
            }
        }

        mainAFCore.uploadBlacklist();

        const logEmbed = new EmbedBuilder().setColor(0xDD5E53).setTimestamp()
            .setTitle(`推特過濾器:`)
            .addFields([{ name: `Content:`, value: content }]);
        mainAFCore.logToDiscord({ embeds: [logEmbed] }, LOG1_CHANNEL)

        message.delete().catch(() => { });
    },



    // // get config
    // const { channel, author } = message;
    // if (!author || !embeds) { return false; }
    // if (!/https:\/\/twitter\.com/i.test(content)) { return false; }
    // if (!['1054284227375542333'].includes(channel.id)) { return false; }

    // // get tweet from discord embed
    // let description = (embeds || [])[0]?.description || '';

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

/*
// webdav
const fullPath = path.resolve(`./blacklist`);
const webdav = require('webdav-server').v2;
const server = new webdav.WebDAVServer();
server.setFileSystem('/', new webdav.PhysicalFileSystem(fullPath));
app.use(webdav.extensions.express('/blacklist/', server)); // GET 以外
//*/

const { TwitterApi } = require('twitter-api-v2');
const { chromeDriver } = require('./webdriver.js') || require('./plugins/webdriver.js');;
class Twitter {

    client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    constructor() { }

    userIDs = new Map();
    async getUserID(username) {
        if (this.userIDs.has(username)) { return this.userIDs.get(username); }
        this.userIDs.set(username, 'Loading...');

        let { uID } = await chromeDriver.getUserData({ username });

        if (!uID) {
            // twitter API v2
            const user = await this.client.v2.userByUsername(username).catch((e) => console.log(e.message));
            uID = user?.data?.id || (user?.errors || [])[0]?.detail || null;

            mainAFCore.logToDiscord(`[TAF] v2.userByUsername(${username})`, LOG2_CHANNEL);
        }

        if (uID) { this.userIDs.set(username, uID); }    // keep uID cache
        return uID;
    }
    usernames = new Map();
    async getUsername(uID) {
        if (this.username.has(uID)) { return this.username.get(uID); }

        let { username } = await chromeDriver.getUserData({ uID });

        if (!username) {
            // twitter API v2
            const user = await this.client.v2.user(uID).catch((e) => console.log(e.message));
            username = user?.data?.username || (user?.errors || [])[0]?.detail || null;

            mainAFCore.logToDiscord(`[TAF] v2.user(${uID})`, LOG2_CHANNEL);
        }

        if (username) { this.userIDs.set(uID, username); }    // keep username cache
        return username;
    }
}
const twitter = new Twitter();

// const generateTimeline = (username) => {
//     return `<a class="twitter-timeline" data-width="460" data-height="200" data-w data-theme="dark" ` +
//         `href="https://twitter.com/${username}?ref_src=twsrc%5Etfw">Tweets by ${username}</a>`
// }

app.get('/blacklist/blacklist.html', async (req, res) => {
    // html head
    let html = [];
    html.push(
        '<html><head>',
        '<link href="https://fonts.googleapis.com/css?family=Roboto Condensed" rel="stylesheet">',
        '<style> body {font-family: "Roboto Condensed";font-size: 16px;} </style>',
        '<style> table,td {border: 1px solid #333;} </style>',
        '<script src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
        '<script src="https://www.kryogenix.org/code/browser/sorttable/sorttable.js" charset="utf-8"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/0.4.1/html2canvas.min.js"></script>',
        '</head><body>',
        `Now Time: ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Tokyo' })}`,

        `<input type="button" value="output" onclick="html2canvas(document.querySelector('body'), { onrendered: function (canvas) { var image = new Image(); image.src = canvas.toDataURL('image/png'); window.open().document.write('<img src=' + image.src + ' />'); } });"></input><br>`,

        `⚠️=不必要に<b>グロテスク</b>な画像/動画、露骨な暴力<br>`
    );
    // html.push(generateTimeline('kubihoto162794'));
    // html.push(generateTimeline('rXlxi7akZjaHCUG'));

    // @@@@@@@@@@@@@@@@@@@@@@@@@@
    // get user datas
    let userStatus = [], fakeuser = new Set();
    for (let username of spamUserList.userIDList.keys()) {
        let user = { username, fakeuser: {} };

        let uID = spamUserList.userIDList.get(username);
        let spamUser = spamUserList.userList.get(uID);
        let tags = [...spamUser.tags];

        for (let tag of tags) {
            if (['guro', 'new'].includes(tag)) {
                user[tag] = true;
            } else if (tag.startsWith('fakeuser/')) {
                let name = tag.replace('fakeuser/', '');
                user.fakeuser[name] = true;
                fakeuser.add(name);
            }
        }

        if (!user.guro && !user.name && !user.fakeuser) {
            user.other = true;
        }

        // get user id
        user.uID = await twitter.getUserID(username);

        userStatus.push(user);
    }

    // html table
    html.push('<table class="sortable">');
    let table = [], title = ['Username', 'UserID', '⚠️'];

    for (let user of userStatus) {
        let userData = [
            `<a href="https://twitter.com/${user.username}">@${user.username}</a>`,
            `=> ${user.uID}`,
            user.guro ? '⚠️' : ''
        ];

        for (let name of [...fakeuser]) {
            // set title
            if (!title.includes(`@${name}`)) { title.push(`@${name}`); }

            if (!user.fakeuser[name]) {
                userData.push(name.replace(/./g, '-'));
            } else {
                userData.push(`@${name}`);
            }
        }

        table.push('<tr><td>', userData.join('</td><td>'), '</td></tr>');
    }
    html.push('<tr><th>', title.join('</th><th>'), '</th></tr>');
    html.push(table.join(''));

    // // html footer
    html.push('</table></body></html>');

    // console.log(html.join(''))
    res.send(html.join(''));
});
