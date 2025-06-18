
const { EmbedBuilder, Colors } = require('discord.js');

const request = require('../modules/undici-request.js');

const [EMOJI_OCTAGONAL_SIGN, EMOJI_THUMBSUP, EMOJI_INFINITY, EMOJI_QUESTION, EMOJI_CROSS, EMOJI_LABEL] = ['🛑', '👍', '♾️', '❓', '❌', '🏷️']

const DEBUG_CHANNEL_ID = '826992877925171250';
// DEBUG_TAG_LOG_CHANNEL_ID perfix, TIME_TAG_CHANNEL_ID

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// youtube api
class YoutubeAPI {
    apiKey = [];
    quotaExceeded = [false, false];

    constructor(config = {}) { this.init(config); };
    init({ apiKey }) {
        this.apiKey = apiKey;
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
            const qs = {
                part: 'id,snippet,liveStreamingDetails',
                id: vID,
                key: this.apiKey[0]
            }
            const res = await request.get({ url, qs, json: true });

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
                console.log(`video not found. ${vID}`);
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

let youtube = new YoutubeAPI();












// base class
class timeTag {
    text; time;
    constructor(text = '', timeInSec = 0) {
        this.text = text;
        this.time = parseInt(timeInSec);
    }
}

// youtube video class
class youtubeVideo {
    vID; title; startTime;
    status; thumbnails;
    tagList;
    logMsgs;
    constructor(vID) {
        this.vID = vID;
        this.title = '';
        this.status = '';
        this.startTime = null;
        this.thumbnails = '';
        this.tagList = [];
        this.logMsgs = [];
    }

    async init() {

        let data = await youtube.getVideoStatus(this.vID);
        if (!data || !data.snippet) { return false; }

        this.title = data.snippet.title;
        this.status = data.snippet.liveBroadcastContent;

        if (this.status == "live") {
            this.startTime = Date.parse(data.liveStreamingDetails?.actualStartTime);
        } else if (this.status == "upcoming") {
            this.startTime = Date.parse(data.liveStreamingDetails?.scheduledStartTime);
        } else if (this.status == "none") {
            this.startTime = Date.now();
        }
        if (!this.startTime) { return false; }

        this.thumbnails = (
            // data.snippet.thumbnails?.maxres ||
            data.snippet.thumbnails?.standard ||
            data.snippet.thumbnails?.high ||
            data.snippet.thumbnails?.medium ||
            data.snippet.thumbnails?.default ||
            { url }).url.replace('_live.', '.');

        return true;
    }

    async checkStatus() {
        let data = await youtube.getVideoStatus(this.vID);
        if (!data || !data.snippet) { return false; }

        this.title = data.snippet.title;
        this.status = data.snippet.liveBroadcastContent;

        if (this.status == "live") {
            this.startTime = Date.parse(data.liveStreamingDetails.actualStartTime);
        }
    }

    async addTag(text, sec = null) {
        // // get start data
        // await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return false; }

        // get time
        let dTime = (Date.now() - this.startTime) / 1000;
        if (this.status != "none") { dTime = dTime - 12; }  // 12sec time lag
        if (!sec && dTime < 0) { return false; }  // not set tag

        // console.log(text, time, dTime)

        let tag = new timeTag(text, (sec || dTime));
        this.tagList.push(tag);
        return true;
    }

    // adj last tag time
    async adjTag(sec) {
        // // get start data
        // await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return false; }

        // shift last tag
        let i = this.tagList.length - 1;
        if (!this.tagList[i]) { return false; }
        this.tagList[i].time += sec;
        return true;
    }

    // change last tag text
    async fixTag(newTag) {
        // // get start data
        // await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return false; }

        // shift last tag
        let i = this.tagList.length - 1;
        if (!this.tagList[i]) { return false; }
        this.tagList[i].text = newTag;
        return true;
    }

    // only call by core
    delTag(time) {
        let targets = this.tagList.filter(tag => tag.time == parseInt(time));
        if (targets.length >= 1) {
            let text = targets[0].text;
            // del tag
            this.tagList = this.tagList.filter(tag => !(tag.text == text && tag.time == parseInt(time)));
            // return log
            return `${time} ${text}`;
        }
        return false;
    }

    outputEmbed() {
        if (this.tagList.length <= 0) { return null; }
        // tag list format
        this.tagList = this.tagList.filter(tag => tag.time > 0);
        let timeLength = 0;
        this.tagList.sort((a, b) => {
            let tA = a.time, tB = b.time;
            if (timeLength == 0 && (tA > 60 || tB > 60)) { timeLength = 1; }
            if (timeLength == 1 && (tA > 3600 || tB > 3600)) { timeLength = 2; }
            return (tA == tB) ? 0 : (tA > tB) ? 1 : -1;
        })

        // output result
        let result = [];

        // set first embed
        let embed = {
            color: Colors.Blue,
            title: `Tags ${this.vID}`,
            description: `[${this.title}](http://youtu.be/${this.vID})`
        }
        if (this.thumbnails) {
            embed.thumbnail = this.thumbnails;
        }

        // set tags
        for (let tag of this.tagList) {
            // get time
            let tagTime = tag.time;
            let ts = parseInt(tagTime / 1) % 60;     // 1000ms
            let tm = parseInt(tagTime / 60) % 60;    // 60sec * 1000ms
            let th = parseInt(tagTime / 3600);       // 60min * 60sec * 1000ms
            // set time string
            let fTimeStr = `${ts.toString().padStart(2, '0')}`;
            let fTimeUrl = `${ts.toString().padStart(2, '0')}s`;
            if (tm || timeLength >= 1) {
                fTimeStr = `${tm.toString().padStart(2, '0')}:${fTimeStr}`;
                fTimeUrl = `${tm.toString().padStart(2, '0')}m${fTimeUrl}`;
            }
            if (th || timeLength >= 2) {
                fTimeStr = `${th.toString().padStart(2, '0')}:${fTimeStr}`;
                fTimeUrl = `${th.toString().padStart(2, '0')}h${fTimeUrl}`;
            }
            // set tag url string
            let newString = `[${fTimeStr}](http://youtu.be/${this.vID}&t=${fTimeUrl})\t${tag.text}`;

            // check length
            if (embed.description.length + newString.length <= 2000) {
                embed.description += '\n' + newString;
            } else {
                // too long
                result.push(embed);
                // new embed
                embed = {
                    color: Colors.Blue,
                    // title: `Tags ${this.vID}`,
                    description: newString
                }
            }
        }
        // push last embed
        result.push(embed);

        // Build embed
        for (let i = 0; i < result.length; ++i) {
            let embed = result[i];
            result[i] = new EmbedBuilder()
                .setColor(embed.color || null)
                .setTitle(embed.title || null)
                .setDescription(embed.description)
                .setThumbnail(embed.thumbnail || null);
        }

        return result;
    }

    async outputLog(client, channelID) {
        if (this.tagList.length <= 0) { return null; }
        // tag list format
        this.tagList = this.tagList.filter(tag => tag.time > 0);
        this.tagList.sort((a, b) => {
            let tA = a.time, tB = b.time;
            return (tA == tB) ? 0 : (tA > tB) ? 1 : -1;
        })

        // output result
        let logBuffer = [`@yt_start <https://youtu.be/${this.vID}>`];

        // set tags
        for (let tag of this.tagList) {
            // get time
            let tagTime = tag.time;

            // set tag log string
            let newString = `@set ${tagTime} ${tag.text}`;

            // check length
            if (logBuffer[logBuffer.length - 1].length + newString.length < 1999) {
                logBuffer[logBuffer.length - 1] += '\n' + newString;
            } else {
                // too long
                // new logText
                logBuffer.push(newString);
            }
        }

        for (let i in logBuffer) {
            let log = logBuffer[i];

            if (!this.logMsgs[i]) {
                // set new dc msg object if didn't exist
                let channel = await client.channels.fetch(channelID)
                if (channel) {
                    this.logMsgs[i] = await channel.send({ content: log }).catch(console.log);
                } else {
                    console.log(`ERR! cant backup message to <#${channelID}>`)
                }

            } else if (this.logMsgs[i].content != log) {
                // update dc msg obj text
                this.logMsgs[i] = await this.logMsgs[i].edit({ content: log }).catch(() => null);

            } else {
                // dc msg obj exist, text same with this log, skip
            }
        }
    }
}

const coreArray = [];
const regTime = /[\+\-]?\d+/;
const regUrl = /(?:https?:\/\/)(?:(?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(?:\/(?:watch|v|embed|shorts|live|attribution_link(?:[\?&][^\/&]+)*))?\/(?:(?:(?:watch\?(?:[^\/&]*&)*)?v=)|(?:multiview\/\w{4}))?([\w-]{11})/;
// cmd core
class timeTagCore {
    client; config; guild;
    workingVideo = new youtubeVideo();

    constructor(client, config, guild) {
        this.client = client;
        this.config = config;
        this.guild = guild;
        this.workingVideo = null;
        if (require('fs').existsSync("./.env")) {
            console.log(`····timeTagCore.init ${guild} ${client.user.tag}`)
        }
    }

    async timeTagCore(cmd, args = [], line = '') {
        if (!line) { line = args.join(' '); }
        line = line.trim();

        if (cmd == 'yt_start') {

            // check working video
            if (this.workingVideo != null) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(`bot is now watching ${this.workingVideo.title || this.workingVideo.vID}`);

                return { success: false, message: [embed] };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!yt_start https://youtu.be/tUJ0atwgQ48`);
                // .setDescription(`!yt_start youtu.be/tUJ0atwgQ48`);

                return { success: false, message: [embed] };
            }
            // regex check url
            if (!regUrl.test(args[0])) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(`不明的網址\nUnknown url`);

                return { success: false, message: [embed] };
            }
            // get video id
            const [, vID] = args[0].match(regUrl);

            // set now working live
            this.workingVideo = new youtubeVideo(vID);
            if (!await this.workingVideo.init()) {
                this.workingVideo = null;

                let embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(`Video 初始化失敗\nVideo initialize failed.`);

                return { success: false, message: [embed] };
            }

            if (this.workingVideo.status != 'live' && this.workingVideo.status != 'none') {
                this.workingVideo = null;
                return { success: false, emoji: EMOJI_INFINITY };
            }

            // set dc status
            this.client.user.setPresence({ activities: [{ name: this.workingVideo.title, type: 'WATCHING' }] });

            // reply
            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle(`Tags ${this.workingVideo.vID}`)
                .setDescription(`[${this.workingVideo.title}](https://youtu.be/${this.workingVideo.vID})\nNow ${this.workingVideo.status}`);
            if (this.workingVideo.thumbnails) {
                embed.setThumbnail(this.thumbnails);
            }

            return { success: true, message: [embed], delete: true };

        } else if (cmd == 'tthelp') {
            let res = [
                "開始標記TAG",
                "```!yt_start youtu.be/tUJ0atwgQ48```",
                "新增TAG",
                "```!t <TAG>```",
                "```!t-15 <TAG>```",
                "修改上一個TAG的秒數",
                "```!adj -10```",
                "修改上一個TAG的文字",
                "```!fix <TAG>```",
                "設置新TAG",
                "```!set hh:mm:ss <TAG>```",
                "確認當前TAG紀錄",
                "```!tags```",
                "刪除TAG",
                "```!deltag <TIME>```",
                "結束標記",
                "```!yt_end```"
            ].join('\n');

            let embed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setDescription(res);

            return { success: true, message: [embed] };
        }

        if (cmd == 'yt_end') {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // output working live
            let array = this.workingVideo.outputEmbed();
            this.workingVideo = null;

            // dc status
            this.client.user.setPresence({ activities: null });

            // reply
            return { success: true, emoji: EMOJI_OCTAGONAL_SIGN, output: array };

        } else if (cmd == 't' || /^t[\+\-]?\d+/i.test(cmd)) {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!t <TAG>`);

                return { success: false, message: [embed] };
            }

            let r1 = await this.workingVideo.addTag(line);
            let r2 = true;

            if (/t[\+\-]?\d+/i.test(cmd)) {
                let timeInSec = cmd.substring(1);
                let shift = parseInt(timeInSec);
                r2 = await this.workingVideo.adjTag(shift);
            }

            if (r1 && r2) {
                return { success: true, emoji: EMOJI_THUMBSUP };
            } else if (!r1) {
                return { success: false, emoji: EMOJI_INFINITY };
            } else if (!r2) {
                return { success: false, emoji: EMOJI_QUESTION };
            }

        } else if (cmd == 'adj' || cmd == 'adjust') {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!adjust -10`);

                return { success: false, message: [embed] };
            }

            // check time
            if (typeof (args[0]) != 'number' && !regTime.test(args[0])) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setDescription(`不明的時間值\nUnknown time shift`);

                return { success: false, message: [embed] };
            }

            let shift = (typeof (args[0]) == 'number' ? args[0] : parseInt(args[0]));
            let r = await this.workingVideo.adjTag(shift);

            if (r) {
                return { success: true, emoji: EMOJI_THUMBSUP };
            } else {
                return { success: false, emoji: EMOJI_QUESTION };
            }
        } else if (cmd == 'fix') {
            // check working video
            if (this.workingVideo == null) {
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!fix <NEW TAG>`);

                return { success: false, message: [embed] };
            }

            let r = await this.workingVideo.fixTag(line);

            if (r) {
                return { success: true, emoji: EMOJI_THUMBSUP };
            } else {
                return { success: false, emoji: EMOJI_QUESTION };
            }

        } else if (cmd == 'set') {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // check arg
            let timeStr = '00:00:' + args[0];
            let newTag = line.replace(args[0], '').trim();
            if (!args[0] || !newTag) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!${cmd} ${line}\n!set hh:mm:ss <TAG>`);

                return { success: false, message: [embed] };
            }

            let [, th, tm, ts] = timeStr.match(/(\d+):(\d+):(\d+)$/) || [, 0, 0, 0];
            th = parseInt(th || 0);
            tm = parseInt(tm || 0);
            ts = parseInt(ts || 0);
            // console.log(th, tm, ts, newTag);

            let timeInSec = (th * 60 + tm) * 60 + ts;
            let r = await this.workingVideo.addTag(newTag, timeInSec);
            if (r) {
                return { success: true, emoji: EMOJI_THUMBSUP };
            } else {
                return { success: false, emoji: EMOJI_INFINITY };
            }

        } else if (cmd == 'tags') {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // output working live
            let array = this.workingVideo.outputEmbed();

            // reply
            return { success: true, message: array, emoji: EMOJI_THUMBSUP, timeout: 15000 };

        } else if (cmd == 'deltag') {
            // check working video
            if (this.workingVideo == null) {
                // message.channel.send({ content: 'There is no live on work' });
                return { success: false, emoji: EMOJI_QUESTION };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new EmbedBuilder()
                    .setColor(Colors.Yellow)
                    .setDescription(`!deltag <TIME>`);

                return { success: false, message: [embed] };
            }

            let r = false;
            if (args[0].match(/(\d+:\d+:\d+|\d+:\d+|\d+)/)) {
                // get time in sec
                let match, th = 0, tm = 0, ts = 0;
                if (match = args[0].match(/(\d+):(\d+):(\d+)/)) {
                    [, th, tm, ts] = match;
                } else if (match = args[0].match(/(\d+):(\d+)/)) {
                    [, tm, ts] = match;
                } else if (match = args[0].match(/(\d+)/)) {
                    [, ts] = match;
                }
                th = parseInt(th || 0);
                tm = parseInt(tm || 0);
                ts = parseInt(ts || 0);
                // console.log(th, tm, ts, newTag);

                let timeInSec = th * 60 * 60 + tm * 60 + ts;
                r = await this.workingVideo.delTag(parseInt(timeInSec));
            }

            if (r) {
                let embed = new EmbedBuilder()
                    .setDescription("刪除TAG:\t```" + r + "```");
                return { success: true, message: [embed], emoji: EMOJI_THUMBSUP };
            } else {
                return { success: false, emoji: EMOJI_QUESTION };
            }

        }
        // return { success: true,  emoji: EMOJI_OCTAGONAL_SIGN,       output: array };
        // return { success: true,  emoji: EMOJI_THUMBSUP };
        // return { success: false, emoji: EMOJI_QUESTION };
        // return { success: false, message: [embed], delete: true };
        // return { success: true,  message: array, emoji: EMOJI_THUMBSUP, timeout: 15000 };

        return { success: null };
    }
}

// plugin core
module.exports = {
    name: 'timeTag2',
    description: "timeTag cmd for youtube",
    async execute(message, pluginConfig, command, args, lines) {
        const { client, content, author, guild } = message;

        const core = coreArray.find((core) => { return (core.client.user.id == client.user.id && core.guild.id == guild.id); });
        if (!core) { return false; }
        if (author.bot && core.workingVideo) { return false; }

        let executed = false;

        // get args
        let resultSuccess = null, resultEmoji = [], resultMessage = [], resultOutput = [], resultTimeout = -1, resultDelete = false;
        for (let line of lines) {
            const { command, args } = line;

            // console.log({ id: author.id, username: author.username, bot: author.bot })
            if (!command) continue;

            // skip fail command form bot self
            if (author.id == client.user.id                 // bot self cmd
                && command == 'yt_start'                    // fail start cmd
                && core.workingVideo                        // now working
                && args[0].includes(core.workingVideo.vID)  // same vID
            ) {
                console.log(`[TT] ${content}`);
                await sleep(250);
                message.delete().catch(() => { });          // delete bug cmd
                break;                                   // skip reply
            }

            let result = await core.timeTagCore(command, args);
            // collect result data
            // success?
            resultSuccess = resultSuccess || result.success;

            // emoji
            if (result.emoji) {
                if (!resultEmoji.includes(result.emoji)) {
                    resultEmoji.push(result.emoji);
                }
            }

            // embed or embed array
            if (result.message) {
                resultMessage = resultMessage.concat(result.message);
            }

            // output array
            if (result.output) {
                resultOutput = resultOutput.concat(result.output);
            }

            // timeout
            if (result.timeout) {
                resultTimeout = result.timeout;
            }

            // delete cmd message
            if (result.delete) {
                resultDelete = result.delete;
            }
        }

        // reply all data
        // embed array
        if (resultMessage.length > 0) {
            while (resultMessage.length >= 3) {
                let r = await message.channel.send({ embeds: [resultMessage.shift(), resultMessage.shift(), resultMessage.shift()] });
                if (resultTimeout != -1) {
                    setTimeout(async () => await r.suppressEmbeds().catch(() => { }) && await r.delete().catch(() => { }), resultTimeout);
                }
            }
            let r = await message.channel.send({ embeds: resultMessage });
            if (resultTimeout != -1) {
                setTimeout(async () => await r.suppressEmbeds().catch(() => { }) && await r.delete().catch(() => { }), resultTimeout);
            }
            executed = true;
        }

        // backup tag
        if (core.workingVideo) {
            await core.workingVideo.outputLog(core.client, core.config.DEBUG_TAG_LOG_CHANNEL_ID);
        }

        // output array
        if (resultOutput.length > 0) {
            let channel = await core.client.channels.fetch(core.config.TIME_TAG_CHANNEL_ID)
            if (channel) {
                while (resultOutput.length > 3) {
                    let r = await channel.send({ embeds: [resultOutput.shift(), resultOutput.shift(), resultOutput.shift()] });
                    if (resultTimeout != -1) {
                        setTimeout(async () => await r.suppressEmbeds().catch(() => { }) && await r.delete().catch(() => { }), resultTimeout);
                    }
                }
                await channel.send({ embeds: resultOutput }).catch(e => { console.log(e.name || e) });
            } else {
                console.log(`ERR! cant output message to <#${core.config.TIME_TAG_CHANNEL_ID}>`)
            }
            executed = true;
        }

        // emoji
        for (let emoji of resultEmoji) {
            await message.react(emoji).catch(() => { });
            executed = true;
        }

        if (resultDelete) {
            await message.suppressEmbeds().catch(() => { });
            message.delete().catch(() => { });
        }

        return executed;
    },

    async setup(client) {
        if (!youtube.apiKey) {
            youtube = new YoutubeAPI({ apiKey: client.mainConfig.youtube.apiKey });
        }

        // get guild list if bot made for it


        for (let gID of client.guildConfigs.keys()) {
            const pluginConfig = client.getPluginConfig(gID, 'timeTag2');
            if (!pluginConfig) { continue; }

            const guild = await client.guilds.fetch(gID).catch(() => null);
            if (!guild) { continue; }    // bot not in guild

            let newCore = new timeTagCore(client, pluginConfig, guild);
            coreArray.push(newCore);
        }

        /*// Slash Commands
        // Register some Command
        const dcRegisterCommand = (cmd, description, options) => {
            // console.log(cmd, description);
            let data = { name: cmd, description, options };

            // // debug mode
            // client.api.applications(client.user.id).guilds(GUILD_ID).commands.post({ data });

            // global mode
            client.api.applications(client.user.id).commands.post({ data }).then(console.log);
        }

        dcRegisterCommand("help", "列出命令表");

        dcRegisterCommand(t"y_start", "開始標記TAG", [{
            name: "url", description: "Youtube 網址",
            type: ApplicationCommandOptionType.STRING,
            required: "True",
        }]);
        dcRegisterCommand("yt_end", "結束標記");

        dcRegisterCommand("t", "新增TAG", [{
            name: "tag", description: "Tag text",
            type: ApplicationCommandOptionType.STRING,
            required: true,
        }]);
        dcRegisterCommand("adj", "修改上一個TAG的秒數", [{
            name: "time", description: "秒數",
            type: ApplicationCommandOptionType.INTEGER,
            required: true,
        }]);

        dcRegisterCommand("tags", "確認當前TAG紀錄");
        dcRegisterCommand("deltag", "刪除TAG", [{
            name: "tag", description: "tag text",
            type: ApplicationCommandOptionType.STRING,
            required: true,
        }]);
        //*/
    },

    async reactionRole(reaction, user, config, add) {
        if (reaction.emoji.name != EMOJI_LABEL) { return false; }

        const { message } = reaction;
        if (message.author.bot) { return false; }

        // get config
        const { client, content, createdTimestamp } = message;

        const core = coreArray.find((core) => { return (core.client.user.id == client.user.id && core.guild.id == message.guild.id); });
        if (!core || !core.workingVideo) { return false; }

        // get message time
        let resultEmoji = [];
        let dTime = (createdTimestamp - core.workingVideo.startTime) / 1000;
        if (core.status != "none") { dTime = dTime - 12; }  // 12sec time lag
        if (dTime < 0) { return null; }  // not set tag

        const command = add ? 'set' : 'deltag';
        const args = [`${parseInt(dTime)}`, `${content.split('\n').shift()}`];

        let result = await core.timeTagCore(command, args);
        // collect result data
        // emoji
        if (result.emoji) {
            if (!resultEmoji.includes(result.emoji)) {
                resultEmoji.push(result.emoji);
            }
        }

        // backup tag
        if (core.workingVideo) {
            await core.workingVideo.outputLog(core.client, core.config.DEBUG_TAG_LOG_CHANNEL_ID);
        }

        // emoji
        for (let emoji of resultEmoji) {
            await message.react(emoji);
        }
    },

    messageReactionAdd(reaction, user, pluginConfig) {
        return this.reactionRole(reaction, user, pluginConfig, true);
    },

    messageReactionRemove(reaction, user, pluginConfig) {
        return this.reactionRole(reaction, user, pluginConfig, false);
    },

    idleCheck() {
        for (let core of coreArray) {
            if (core.workingVideo) { return false };
        }
        return true;
    }
}

