
const [EMOJI_RECYCLE] = ['♻️']

const fs = require('fs');
const compressing = require('compressing');
const { AttachmentBuilder } = require('discord.js');

const regUrl = /^\<?https:\/\/twitter\.com\/([a-zA-Z0-9_]+)(?:\/status\/(\d+))?[\>\?]*$/;
// const regUsername = /\(@([a-zA-Z0-9_]+)\)$/;

const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };
const downloadFile = (url, filepath) => new Promise((resolve) => { require('request')(url).pipe(fs.createWriteStream(filepath)).on('close', resolve); })

let dilog = fs.existsSync('./.env') ? console.log : () => { };

const downloadImage = async ({ channel, fastmode }) => {

    let before;
    while (1) {
        let newimg = false;
        let msgs = await channel.messages.fetch({ before, force: true });
        for (let [mID, message] of msgs) {
            before = mID;


            let reacts = message.reactions.cache.get(EMOJI_RECYCLE);
            if (!reacts || reacts.count < 1) { continue; }


            let { embeds } = message;
            if (!embeds || !embeds[0]) { continue; }
            let embed = embeds[0];

            // get embed data
            const [, , tID] = (embed.url || '').match(regUrl) || [, null, null];
            if (!tID) { continue; }

            const [, username] = (embed.author?.url || '').match(regUrl) || [, null];
            if (!username) { continue; }

            const timestamp = embed.timestamp;
            if (!timestamp) { continue; }
            const nowDate = (new Date(timestamp).toLocaleString('en-ZA'))
                .replace(/[\/:]/g, '').replace(', ', '_');


            // download images
            let i = 1;
            for (let embed of embeds) {
                let image = embed.image?.url || '';
                const [, ext] = image.match(/([^\.]+)$/) || [, null];
                if (!image || !ext) { continue; }
                image = image.replace(`.${ext}`, `?format=${ext}&name=orig`);

                let filename = `${username}-${tID}-${nowDate}-img${i}.${ext}`
                let filepath = `./image/${username}`;

                if (fastmode) {
                    image = image.replace(`name=orig`, `name=thumb`);
                    filepath = `./image`;
                }

                // set folder
                if (!fs.existsSync(filepath)) { fs.mkdirSync(filepath, { recursive: true }); }

                // download
                if (!fs.existsSync(`${filepath}/${filename}`)) { await downloadFile(image, `${filepath}/${filename}`); }
                dilog(`mID: ${mID}, donwload image ${filename}`);
                ++i;
                newimg = true;  // set flag

            }
        }

        if (!newimg) { break; }
    }

    dilog(`donwload image done.`);

    if (fs.existsSync('./image') && !fs.existsSync('./.env')) {

        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA'))
            .replace(/[\/:]/g, '').replace(', ', '_');

        // zip blacklist files
        const filePath = `./${nowDate}.zip`;
        await compressing.zip.compressDir(`./image`, filePath).catch((e) => console.log(e.message || e));

        // upload zip file
        const attachment = new AttachmentBuilder(filePath, { name: `${nowDate}.zip` });
        await channel.send({ content: ' ', files: [attachment] }).catch((e) => console.log(e.message || e));

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
            await message.delete().catch(console.error);
            downloadImage({ channel, fastmode: command == 'img3' });
            return;
        }
    },

    // async setup(client) { },
}