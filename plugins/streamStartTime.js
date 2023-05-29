// const { youtube } = require('../config.js');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const CLOCK_A = ['<:clocka_0:895230067104440350>', '<:clocka_1:895230174382129162>', '<:clocka_2:895230190169509919>'];
const CLOCK_B = ['<:clockb_0:895230403164655627>', '<:clockb_1:895230447334866944>', '<:clockb_2:895230469992505355>', '<:clockb_3:895230483783368705>', '<:clockb_4:895230502397677628>', '<:clockb_5:895230515752357888>', '<:clockb_6:895230534169530390>', '<:clockb_7:895230548958654474>', '<:clockb_8:895230563835863072>', '<:clockb_9:895230578725638154>'];
const CLOCK_C = ['<:clockc_0:895230214026723358>', '<:clockc_1:895230244976488459>', '<:clockc_2:895230274487603220>', '<:clockc_3:895230287817084949>', '<:clockc_4:895230308239175701>', '<:clockc_5:895230324139761674>'];
const CLOCK_D = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const EMOJI_SMALL_BLUE_DIAMOND = '🔹';
const EMOJI_RECYCLE = '♻️';
const regUrl = /((?:https?:)?\/\/)?((?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(\/(?:embed|live|v|attribution_link)(?:\?(?:[\w\-]+=[\w\-]*&?)*)?)?(\/(?:watch(?:\?(?:[\w\-]+=[\w\-]*&)*v=|\/)|v[=\/])?)([\w\-]+)/;

// youtube api
const get = require('util').promisify(require('request').get);

class youtube {
    apiKey = [];
    quotaExceeded = [false, false];
    constructor(config = {}) { this.init(config); };
    init({ apiKey }) {
        this.apiKey = apiKey;
    };

    // youtube api
    async getStreamStatus(vID) {
        let data = await this.getVideoStatus(vID);
        if (!data) { return false; }

        let status = data.snippet.liveBroadcastContent;
        if (status != "upcoming") { return false; }

        let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
        return `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;
    };
    async getVideoStatus(vID) {
        // mclog(`youtube.getVideoStatus( ${vID} )`);
        if (this.quotaExceeded[0]) {
            // return {
            //     code: 403, message: 'quotaExceeded', reason: 'quotaExceeded',
            //     variabale: { vID }
            // };
            return null;
        }

        try {
            const url = 'https://www.googleapis.com/youtube/v3/videos';
            const params = {
                part: 'id,snippet,liveStreamingDetails',
                id: vID,
                key: this.apiKey[0]
            }
            const res = await get({ url, qs: params, json: true });

            // throw error
            if (res.statusCode != 200 || (res.body && res.body.error)) {
                if (res.statusCode == 404) {
                    throw {
                        code: 404, message: 'Error 404 (Not Found)!!',
                        errors: [{
                            message: 'Error 404 (Not Found)!!',
                            domain: 'global', reason: 'Not Found'
                        }],
                    };
                }
                else if (res.body) { throw res.body.error ? res.body.error : res.body; }
                else throw res;
            }

            // get response data
            const data = res.body;
            if (data.pageInfo.totalResults == 0) {
                console.log('[MC] video not found.');
                // return {
                //     code: 200, message: 'video not found', reason: 'video not found',
                //     variabale: { vID }
                // };
                return null;
            }
            return data.items[0];
            // return {
            //     id: '3gH2la1zZ3A', kind: 'youtube#video', etag: 'ktzgCNL-70YVg2aP-FcihaZ_vKA',
            //     snippet: {
            //         publishedAt: '2022-08-17T00:46:24Z', channelId: 'UCc88OV45ICgHbn3ZqLLb52w',
            //         title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
            //         description: '#ドラゴンクエスト11s\n #ゲーム実況',
            //         thumbnails: { default: [Object], medium: [Object], high: [Object], standard: [Object], maxres: [Object] },
            //         channelTitle: 'Fuma Ch. 夜十神封魔 - UPROAR!! -',
            //         categoryId: '20',
            //         liveBroadcastContent: 'upcoming',
            //         localized: {
            //             title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
            //             description: '#ドラゴンクエスト11s\n #ゲーム実況'
            //         }
            //     },
            //     liveStreamingDetails: {
            //         scheduledStartTime: '2022-08-17T01:30:00Z',
            //         activeLiveChatId: 'Cg0KCzNnSDJsYTF6WjNBKicKGFVDYzg4T1Y0NUlDZ0hibjNacUxMYjUydxILM2dIMmxhMXpaM0E'
            //     }
            // }

        } catch (error) {
            // unknown error
            if (!Array.isArray(error.errors) || !error.errors[0]) {
                console.log(error);
                // return { code: error.code || null, error };
                return null;
            }

            if (error.code == 403 && error.errors[0].reason == 'quotaExceeded') {
                this.quotaExceeded[0] = true;
            }
            console.log(`youtube.getVideoStatus ${error.errors[0].reason}`);
            // return {
            //     code: error.code,
            //     message: error.message,
            //     reason: error.errors[0].reason,
            //     variabale: { vID }
            // }
            return null;
        }
    };
}

const cores = new Map();

module.exports = {
    name: 'Stream Start Time',
    description: "reaction stream start time",

    setup(client) {
        const apiKey = client.mainConfig.youtube.apiKey;
        const uID = client.user.id;
        cores.set(uID, new youtube({ apiKey }));
    },

    async execute(message, pluginConfig, command, args, lines) {
        const { content } = message;
        if (!regUrl.test(content)) { return; }

        const core = cores.get(message.client.user.id);
        if (!core) { return; }

        // get vID
        const [, , , , , vID] = content.match(regUrl);
        let time = await core.getStreamStatus(vID);
        // console.log(time)

        if (time) {
            await message.react(CLOCK_A[parseInt(time[0])]).catch(() => { });
            await message.react(CLOCK_B[parseInt(time[1])]).catch(() => { });
            await message.react(EMOJI_SMALL_BLUE_DIAMOND).catch(() => { });
            await message.react(CLOCK_C[parseInt(time[2])]).catch(() => { });
            await message.react(CLOCK_D[parseInt(time[3])]).catch(() => { });
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        // skip bot reaction
        if (user.bot) { return; }

        // skip other emoji
        if (reaction.emoji.toString() != EMOJI_SMALL_BLUE_DIAMOND &&
            reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

        // get msg data
        const { message, client } = reaction;

        // EMOJI_RECYCLE
        if (reaction.emoji.name == EMOJI_RECYCLE) {
            // ♻️

            // check deletable
            if (message.author.id != client.user.id || !message.deletable) { return; }

            // check message target
            let [embed] = message.embeds || [];
            if (!embed) { return; }

            if (!regUrl.test(embed.description) ||
                !embed.description.startsWith('**')) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
            return;
        }

        // EMOJI_SMALL_BLUE_DIAMOND
        if (reaction.emoji.name == EMOJI_SMALL_BLUE_DIAMOND) {

            const { message: rawMessage } = reaction;
            const { guild, channel, content } = rawMessage;

            // check message target
            if (!regUrl.test(content)) { return; }

            const core = cores.get(client.user.id);
            if (!core) { return; }

            // check user who use reaction have permissions for send message
            const guildAuthor = guild.members.cache.get(user.id);
            if (!channel.permissionsFor(guildAuthor).has(PermissionFlagsBits.SendMessages)) { return; };

            // get vID
            const [, , , , , vID] = content.match(regUrl);
            let data = await core.getVideoStatus(vID);
            if (!data) { return false; }

            // get image
            let thumbnails = (
                // data.snippet.thumbnails.maxres ||
                data.snippet.thumbnails.standard ||
                data.snippet.thumbnails.high ||
                data.snippet.thumbnails.medium ||
                data.snippet.thumbnails.default ||
                { url }).url

            // set embed
            let embed = new EmbedBuilder()
                .setAuthor({
                    name: `${user.username} ${user.toString()}`,
                    iconURL: user.displayAvatarURL({ format: 'png', size: 256 })
                })
                .setColor('#FF0000')
                .setTitle(data.snippet.channelTitle)
                // .setURL(`https://www.youtube.com/channel/${data.snippet.channelId}`)
                .setDescription(`**[${data.snippet.title}](http://youtu.be/${vID})**`)
            if (thumbnails != '') { embed.setImage(thumbnails); }

            // reply new embed
            let message = await channel.send({ embeds: [embed] }).catch(() => { });

            let status = data.snippet.liveBroadcastContent;
            if (status == "upcoming") {
                let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
                let time = `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;

                await message.react(CLOCK_A[parseInt(time[0])]).catch(() => { });
                await message.react(CLOCK_B[parseInt(time[1])]).catch(() => { });
                await message.react(EMOJI_SMALL_BLUE_DIAMOND).catch(() => { });
                await message.react(CLOCK_C[parseInt(time[2])]).catch(() => { });
                await message.react(CLOCK_D[parseInt(time[3])]).catch(() => { });
            }
            await message.react(EMOJI_RECYCLE).catch(() => { });
        }
    },
}