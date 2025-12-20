
const fs = require('fs');
const compressing = require('compressing');
const { AttachmentBuilder } = require('discord.js');
const request = require('../modules/undici-request.js');

const [EMOJI_RECYCLE] = ['♻️']

const regUrl = /^\<?https:\/\/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)(?:\/status\/(\d+))?[\>\?]*$/;
// const regUsername = /\(@([a-zA-Z0-9_]+)\)$/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const downloadFile = (url, filepath) => request.request({ url }).then((response) => request.pipe(response.body, fs.createWriteStream(filepath)));

let dilog = fs.existsSync('./.env') ? console.log : () => { };

const color = {
    Reset: `\x1b[0m`, Bright: `\x1b[1m`, Dim: `\x1b[2m`, Underscore: `\x1b[4m`, Blink: `\x1b[5m`, Reverse: `\x1b[7m`, Hidden: `\x1b[8m`,
    FgBlack: `\x1b[30m`, FgRed: `\x1b[31m`, FgGreen: `\x1b[32m`, FgYellow: `\x1b[33m`, FgBlue: `\x1b[34m`, FgMagenta: `\x1b[35m`, FgCyan: `\x1b[36m`, FgWhite: `\x1b[37m`, FgGray: `\x1b[90m`,
    BgBlack: `\x1b[40m`, BgRed: `\x1b[41m`, BgGreen: `\x1b[42m`, BgYellow: `\x1b[43m`, BgBlue: `\x1b[44m`, BgMagenta: `\x1b[45m`, BgCyan: `\x1b[46m`, BgWhite: `\x1b[47m`, BgGray: `\x1b[100m`,
}

async function downloadImage({ channel, fastmode, limit = 9999 }) {

    let before, first = null;
    let donelog = [`donwload image done.`];
    let editCount = 0;
    let emptyCount = 0;
    while (1) {
        let newimg = false;
        let msgs = (await channel.messages.fetch({ before, force: true }).catch(() => null)) || [];
        for (let [mID, message] of msgs) {
            before = mID;
            first = first || mID;

            let reacts = message.reactions.cache.get(EMOJI_RECYCLE);
            if (!reacts || reacts.count < 1) { continue; }


            let { embeds } = message;
            // if no any embed, try fix
            if (!embeds || !embeds[0]) {
                let { author, content } = message;
                if (author.id == channel.client.user.id) {
                    donelog.push(`message.edit ${content}`);
                    ++editCount;
                    // content = content.replace('twitter.com', 'fxtwitter.com');   // use fxtwitter
                    message.edit({ content }).catch(() => { });
                }
                continue;
            }

            // found embed(s)
            let embed = embeds[0];

            // get embed data
            const [, , tID] = (embed.url || '').match(regUrl) || [, null, null];
            if (!tID) { continue; } // not tweet embed

            const [, username] = (embed.author?.url || '').match(regUrl) || [, null];
            if (!username) { continue; }    // can't found username

            const timestamp = embed.timestamp;
            if (!timestamp) { continue; }   // can't found timestamp
            const tweetDate = (new Date(timestamp).toLocaleString('en-ZA'))
                .replace(/[\/:]/g, '').replace(', ', '_');

            // download images from all embeds
            let i = 1, invalidImage = false, emptyEmbed = true;
            for (let embed of embeds) {
                // get image url
                let image = embed.image?.url || '';
                const [, ext] = image.match(/([^\.]+)$/) || [, null];
                if (!image || !ext) { continue; } // embed without image

                let dlImage = image.replace(`.${ext}`, `?format=${ext}&name=orig`);

                let folderPath = `./image/${username}`;
                let filename = `${username}-${tID}-${tweetDate}-img${i}.${ext}`
                let filePath = `${folderPath}/${filename}`;

                if (fastmode) {
                    dlImage = dlImage.replace(`name=orig`, `name=thumb`);
                    folderPath = `./image`;
                    filePath = `${folderPath}/${filename}`;
                }

                // set folder
                if (!fs.existsSync(folderPath)) { fs.mkdirSync(folderPath, { recursive: true }); }

                // check file
                if (fs.existsSync(filePath) && !fs.statSync(filePath)?.size) { fs.unlinkSync(filePath); }

                // download
                if (!fs.existsSync(filePath)) {

                    // normal download
                    await downloadFile(dlImage, filePath);
                    emptyEmbed = false;

                    // retry again if fail
                    if (!fs.statSync(filePath)?.size) {
                        fs.unlinkSync(filePath);
                        await downloadFile(image, filePath);
                    }

                    // retry with proxyURL if fail again
                    if (!fs.statSync(filePath)?.size && embed.image?.proxyURL) {
                        fs.unlinkSync(filePath);
                        await downloadFile(embed.image?.proxyURL, filePath);
                    }

                    // still fail
                    if (!fs.statSync(filePath)?.size) {
                        fs.unlinkSync(filePath);
                        invalidImage = true;
                        emptyEmbed = true;
                    }

                    dilog(`mID: ${mID}, donwload image ${filename}`);
                    --limit;
                } else {
                    emptyEmbed = false;

                    dilog(`mID: ${mID},     skip image ${filename}`);
                }

                ++i;
                newimg = true;  // set flag
            }

            if (emptyEmbed) {
                donelog.push(`${color.FgYellow}mmessage without image ${message.content.replace(/[<>]/g, "")}${color.Reset}`);
                if (embed) { donelog.push(`${color.FgCyan}${embed.description}${color.Reset}`); }

                ++emptyCount;
            }

            // for img2, (not fastmode & image download success), delete message
            if (!fastmode && !invalidImage && (mID != first)) {
                await message.delete().catch(e => console.log(`[Dlimg]`, e.message));
            }
        }

        if (!newimg) { break; }
        if (limit < 0) { break; }
    }

    dilog(donelog.join('\n'));
    dilog('emptyCount:', emptyCount);
    dilog('editCount:', editCount);

    if (fs.existsSync('./image') && !fs.existsSync('./.env')) {

        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA'))
            .replace(/[\/:]/g, '').replace(', ', '_');

        // zip blacklist files
        const filePath = `./${nowDate}.zip`;
        await compressing.zip.compressDir(`./image`, filePath).catch(e => console.log(`[Dlimg]`, (e.message || e)));

        // upload zip file
        const attachment = new AttachmentBuilder(filePath, { name: `${nowDate}.zip` });
        await channel.send({ files: [attachment] }).catch(e => console.log(`[Dlimg]`, (e.message || e)));

        fs.rmSync('./image', { recursive: true, force: true });
        fs.unlinkSync(filePath);
        // if (fs.existsSync(filePath) && !fs.existsSync('./.env')) { fs.unlinkSync(filePath); }
    }
}

module.exports = {
    name: 'dlimg',
    description: 'download twitter image fromt discord messages',

    async execute(message, pluginConfig, command, args, lines) {

        if ((command == 'img' && !fs.existsSync('./.env')) ||
            (['img2', 'img3'].includes(command) && fs.existsSync('./.env'))) {

            let { channel } = message;
            await message.delete().catch(e => console.log(`[Dlimg]`, e.message));
            downloadImage({ channel, fastmode: command == 'img3', limit: parseInt(args[0]) || 9999 })
                .then(() => console.log('[Dlimg] done'));
            return;
        }
    },

    // async setup(client) { },
}