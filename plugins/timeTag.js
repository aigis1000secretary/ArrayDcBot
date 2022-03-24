

const { YOUTUBE } = require('../config.js');
const { DEBUG_CHANNEL_ID } = require('../config.js');

// DEBUG_TAG_LOG_CHANNEL_ID perfix, TIME_TAG_CHANNEL_ID

const { MessageEmbed } = require('discord.js');
const [EMOJI_OCTAGONAL_SIGN, EMOJI_THUMBSUP, EMOJI_INFINITY, EMOJI_QUESTION, EMOJI_CROSS, EMOJI_LABEL] = ['🛑', '👍', '♾️', '❓', '❌', '🏷️']

// base class
class timeTag {
    text; time;
    constructor(text = '', time = 0) {
        this.text = text;
        this.time = time;
    }
}
const ApplicationCommandOptionType = {
    SUB_COMMAND: 1, SUB_COMMAND_GROUP: 2,
    STRING: 3, INTEGER: 4, BOOLEAN: 5,
    USER: 6, CHANNEL: 7, ROLE: 8, MENTIONABLE: 9
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
        this.startTime = Date.now();
        this.status = '';
        this.thumbnails = '';
        this.tagList = [];
        this.logMsgs = [];
    }

    async init() {
        try {
            let data = await getVideoStatus(this.vID);
            this.title = data.snippet.title;
            this.status = data.snippet.liveBroadcastContent;

            if (this.status == "live") {
                this.startTime = Date.parse(data.liveStreamingDetails.actualStartTime);
            } else if (this.status == "upcoming") {
                this.startTime = Date.parse(data.liveStreamingDetails.scheduledStartTime);
            } else if (this.status == "none") {
                this.startTime = Date.now();
            }

            this.thumbnails = data.snippet.thumbnails.default.url ? data.snippet.thumbnails.default.url : this.thumbnails;
            this.thumbnails = data.snippet.thumbnails.medium.url ? data.snippet.thumbnails.medium.url : this.thumbnails;
            this.thumbnails = data.snippet.thumbnails.high.url ? data.snippet.thumbnails.high.url : this.thumbnails;
        } catch (e) {
            this.title = this.vID;
            this.status = 'unknown'
        }
        return;
    }

    async checkStatus() {
        let data = await getVideoStatus(this.vID);
        this.title = data.snippet.title;
        this.status = data.snippet.liveBroadcastContent;

        if (this.status == "live") {
            this.startTime = Date.parse(data.liveStreamingDetails.actualStartTime);
        }
    }

    async addTag(text, ms = null) {
        // get start data
        // await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return null; }

        // get time
        let dTime = Date.now() - this.startTime;
        if (this.status != "none") { dTime = dTime - 12000; }  // 12sec time lag
        if (!ms && dTime < 0) { return null; }  // not set tag

        // console.log(text, time, dTime)

        let tag = new timeTag(text, ms || dTime);
        this.tagList.push(tag);
        return `!set ${parseInt((ms || dTime) / 1000)} ${text}`;
    }

    async adjTag(ms) {
        // get start data
        // await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return null; }

        // shift last tag
        let i = this.tagList.length - 1;
        if (!this.tagList[i]) { return null; }
        this.tagList[i].time += ms;
        return `!set ${parseInt(this.tagList[i].time / 1000)} ${this.tagList[i].text}`;
    }

    async fixTag(newTag) {
        // get start data
        await this.checkStatus();

        // wait live start
        if (this.status == "upcoming") { return null; }

        // shift last tag
        let i = this.tagList.length - 1;
        if (!this.tagList[i]) { return null; }
        this.tagList[i].text = newTag;
        return `!set ${parseInt(this.tagList[i].time / 1000)} ${this.tagList[i].text}`;
    }

    // only call by core
    delTag(text, time = null) {
        let targets = this.tagList.filter(tag => tag.text == text);
        if (targets.length < 1) { return false; }
        else if (targets.length == 1) {
            // del tag
            let del = `${parseInt(targets[0].time / 1000)} ${targets[0].text}`;
            this.tagList = this.tagList.filter(tag => !(tag.text == text));
            return del;

        } else if (time == null) {  // targets.length > 1
            // find the last tag
            let nTime = 0;
            for (let tar of targets) {
                nTime = Math.max(nTime, tar.time);
            }

            // del tag
            let del = `${parseInt(nTime / 1000)} ${targets[0].text}`;
            this.tagList = this.tagList.filter(tag => !(tag.text == text && tag.time == nTime));
            return del;
            // } else if (time != null) {  // targets.length > 1
            //     // find the most close tag
            //     let nTime = time, dTime = Infinity;
            //     for (let tar of targets) {
            //         if (Math.abs(tar.time - time) < dTime) {
            //             dTime = Math.min(Math.abs(tar.time - time), dTime);
            //             nTime = tar.time;
            //         }
            //     }

            //     // del tag
            //     let del = `${parseInt(nTime / 1000)} ${targets[0].text}`;
            //     this.tagList = this.tagList.filter(tag => !(tag.text == text && tag.time == nTime));
            //     return del;
        }
        return false;
    }

    output() {
        if (this.tagList.length <= 0) { return null; }
        // tag list format
        this.tagList = this.tagList.filter(tag => tag.time > 0);
        let timeLength = 0;
        this.tagList.sort((a, b) => {
            let tA = a.time, tB = b.time;
            if (timeLength == 0 && (tA > 60000 || tB > 60000)) { timeLength = 1; }
            if (timeLength == 1 && (tA > 3600000 || tB > 3600000)) { timeLength = 2; }
            return (tA == tB) ? 0 : (tA > tB) ? 1 : -1;
        })

        // output result 
        let result = [];

        // set first embed
        let embed = new MessageEmbed()
            .setColor('BLUE')
            .setTitle(`Tags ${this.vID}`)
            .setDescription(`[${this.title}](http://youtu.be/${this.vID})`);
        if (this.thumbnails) {
            embed.setThumbnail(this.thumbnails);
        }

        // set tags
        for (let tag of this.tagList) {
            // get time
            let tagTime = tag.time;
            let ts = parseInt(tagTime / 1000) % 60;     // 1000ms
            let tm = parseInt(tagTime / 60000) % 60;    // 60sec * 1000ms
            let th = parseInt(tagTime / 3600000);       // 60min * 60sec * 1000ms
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
                embed = new MessageEmbed()
                    .setColor('BLUE')
                    .setDescription(newString);
                // .setTitle(`Tags ${this.vID}`)
                // .setDescription(`[${this.title}](http://youtu.be/${this.vID})\n${newString}`);
            }
        }
        // push last embed
        result.push(embed);

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
        let logBuffer = [`@yt_start <https://www.youtube.com/watch?v=${this.vID}>`];

        // set tags
        for (let tag of this.tagList) {
            // get time
            let tagTime = tag.time;

            // set tag log string
            let newString = `@set ${parseInt(tagTime / 1000)} ${tag.text}`;

            // check length
            if (logBuffer[logBuffer.length - 1].length + newString.length < 1999) {
                logBuffer[logBuffer.length - 1] += '\n' + newString;
            } else {
                // too long
                // new logText
                logBuffer.push(newString);
            }
        }

        for (let key in logBuffer) {
            let log = logBuffer[key];

            if (!this.logMsgs[key]) {
                // set new dc msg object if didn't exist
                let channel = client.channels.cache.get(channelID)
                if (channel) {
                    this.logMsgs[key] = await channel.send({ content: log }).catch(console.log);
                } else {
                    console.log(`ERR! cant backup message to <#${channelID}>`)
                }

            } else if (this.logMsgs[key].content != log) {
                // update dc msg obj text
                this.logMsgs[key] = await this.logMsgs[key].edit({ content: log }).catch(console.log);

            } else {
                // dc msg obj exist, text same with this log, skip
            }
        }
    }
}

const coreArray = [];
const regTime = /[\+\-]?\d+/;
const regUrl = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?/;
// cmd core
class timeTagCore {
    client; config; guild;
    workingVideo;

    constructor(client, config, guild) {
        this.client = client;
        this.config = config;
        this.guild = guild;
        this.workingVideo = null;
        console.log(`····timeTagCore.init ${guild} ${client.user.tag}`)
    }

    async timeTagCore(cmd, args = [], line = '') {
        if (!line) { line = args.join(' '); }
        line = line.trim();

        if (cmd == 'yt_start') {

            // check working video
            if (this.workingVideo != null) {
                let embed = new MessageEmbed()
                    .setColor('RED')
                    .setDescription(`bot is now watching ${this.workingVideo.title || this.workingVideo.vID}`);

                return { success: false, message: [embed] };
            }

            // check arg
            if (args.length <= 0) {
                let embed = new MessageEmbed()
                    .setColor('YELLOW')
                    .setDescription(`!yt_start https://www.youtube.com/watch?v=tUJ0atwgQ48`);
                // .setDescription(`!yt_start youtu.be/tUJ0atwgQ48`);

                return { success: false, message: [embed] };
            }
            // regex check url
            if (!regUrl.test(args[0])) {
                let embed = new MessageEmbed()
                    .setColor('RED')
                    .setDescription(`不明的網址\nUnknown url`);

                return { success: false, message: [embed] };
            }
            // get video id
            const [, , , , , vID] = args[0].match(regUrl);

            // set now working live
            this.workingVideo = new youtubeVideo(vID);
            await this.workingVideo.init();

            if (this.workingVideo.status != 'live' && this.workingVideo.status != 'none') {
                this.workingVideo = null;
                return { success: false, emoji: EMOJI_INFINITY };
            }

            // set dc status
            this.client.user.setPresence({ activities: [{ name: this.workingVideo.title, type: 'WATCHING' }] });

            // reply
            const embed = new MessageEmbed()
                .setColor('GREEN')
                .setTitle(`Tags ${this.workingVideo.vID}`)
                .setDescription(`[${this.workingVideo.title}](https://www.youtube.com/watch?v=${this.workingVideo.vID})\nNow ${this.workingVideo.status}`);
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
                "```!deltag <TAG>```",
                "結束標記",
                "```!yt_end```"
            ].join('\n');

            let embed = new MessageEmbed()
                .setColor('BLUE')
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
            let array = this.workingVideo.output();
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
                let embed = new MessageEmbed()
                    .setColor('YELLOW')
                    .setDescription(`!t <TAG>`);

                return { success: false, message: [embed] };
            }

            let r1 = await this.workingVideo.addTag(line);
            let r2 = true;

            if (/t[\+\-]?\d+/i.test(cmd)) {
                let timeInSec = cmd.substring(1);
                let shift = parseInt(timeInSec) * 1000;
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
                let embed = new MessageEmbed()
                    .setColor('YELLOW')
                    .setDescription(`!adjust -10`);

                return { success: false, message: [embed] };
            }

            // check time
            if (typeof (args[0]) != 'number' && !regTime.test(args[0])) {
                let embed = new MessageEmbed()
                    .setColor('RED')
                    .setDescription(`不明的時間量\nUnknown time shift`);

                return { success: false, message: [embed] };
            }

            let shift = (typeof (args[0]) == 'number' ? args[0] : parseInt(args[0])) * 1000;
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
                let embed = new Discord.MessageEmbed()
                    .setColor('YELLOW')
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
            let timeStr, newTag;
            let match = [, timeStr, newTag] = line.match(/^(\d+:\d+:\d+|\d+:\d+|\d+)\s+([\s\S]+)$/i);
            if (args.length < 2 || !match || !timeStr || !newTag) {
                let embed = new MessageEmbed()
                    .setColor('YELLOW')
                    .setDescription(`!set hh:mm:ss <TAG>`);

                return { success: false, message: [embed] };
            }

            // get time in sec
            let th = 0, tm = 0, ts = 0;
            if (match = timeStr.match(/(\d+):(\d+):(\d+)/)) {
                [, th, tm, ts] = match;
            } else if (match = timeStr.match(/(\d+):(\d+)/)) {
                [, tm, ts] = match;
            } else if (match = timeStr.match(/(\d+)/)) {
                [, ts] = match;
            }
            th = parseInt(th || 0);
            tm = parseInt(tm || 0);
            ts = parseInt(ts || 0);
            // console.log(th, tm, ts, newTag);

            let timeInSec = th * 60 * 60 + tm * 60 + ts;
            let r = await this.workingVideo.addTag(newTag, timeInSec * 1000);
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
            let array = this.workingVideo.output();

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
                let embed = new MessageEmbed()
                    .setColor('YELLOW')
                    .setDescription(`!deltag <TAG>`);

                return { success: false, message: [embed] };
            }

            let r = false;
            if (args.length == 1) {
                r = await this.workingVideo.delTag(line);
            } else {
                // get args time
                let timeStr, newTag;
                let match = [, timeStr, newTag] = line.match(/^(\d+:\d+:\d+|\d+:\d+|\d+)\s+([\s\S]+)$/i);

                // get time in sec
                let th = 0, tm = 0, ts = 0;
                if (match = timeStr.match(/(\d+):(\d+):(\d+)/)) {
                    [, th, tm, ts] = match;
                } else if (match = timeStr.match(/(\d+):(\d+)/)) {
                    [, tm, ts] = match;
                } else if (match = timeStr.match(/(\d+)/)) {
                    [, ts] = match;
                }
                th = parseInt(th || 0);
                tm = parseInt(tm || 0);
                ts = parseInt(ts || 0);
                // console.log(th, tm, ts, newTag);

                let timeInSec = th * 60 * 60 + tm * 60 + ts;
                r = await this.workingVideo.delTag(newTag, parseInt(timeInSec * 1000));
            }

            if (r) {
                let embed = new MessageEmbed()
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
    name: 'timeTag',
    description: "timeTag cmd for youtube",
    async execute(message) {
        if (!message.guild) { return false; }
        // if (message.author.bot) { return false; }

        // get config
        const { client, content, author } = message;
        let config = client.config[message.guild.id];
        if (!config) { return false; }

        const core = coreArray.find((core) => { return (core.client.user.id == client.user.id && core.guild.id == message.guild.id); });
        if (!core) { return false; }

        let executed = false;

        // get args
        let resultSuccess = null, resultEmoji = [], resultMessage = [], resultOutput = [], resultTimeout = -1, resultDelete = false;
        for (let line of content.split('\n')) {
            const { command, args } = config.fixMessage(line);
            if (!command) continue;

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
        // skip fail command form bot self
        if (resultSuccess === false && author.id == client.user.id) {
            console.log(`[TT] ${content}`);
            message.delete().catch(() => { });    // delete bug cmd
            return true;    // skip reply
        }

        // embed array
        if (resultMessage.length > 0) {
            while (resultMessage.length >= 3) {
                let r = await message.channel.send({ embeds: [resultMessage.shift(), resultMessage.shift(), resultMessage.shift()] });
                if (resultTimeout != -1) {
                    setTimeout(() => r.delete().catch(() => { }), resultTimeout);
                }
            }
            let r = await message.channel.send({ embeds: resultMessage });
            if (resultTimeout != -1) {
                setTimeout(() => r.delete().catch(() => { }), resultTimeout);
            }
            executed = true;
        }

        // backup tag
        if (core.workingVideo) {
            await core.workingVideo.outputLog(core.client, core.config.DEBUG_TAG_LOG_CHANNEL_ID);
        }

        // output array
        if (resultOutput.length > 0) {
            let channel = core.client.channels.cache.get(core.config.TIME_TAG_CHANNEL_ID)
            if (channel) {
                while (resultOutput.length >= 3) {
                    let r = await channel.send({ embeds: [resultOutput.shift(), resultOutput.shift(), resultOutput.shift()] });
                    if (resultTimeout != -1) {
                        setTimeout(() => r.delete().catch(() => { }), resultTimeout);
                    }
                }
                await channel.send({ embeds: resultOutput });
            } else {
                console.log(`ERR! cant output message to <#${core.config.TIME_TAG_CHANNEL_ID}>`)
            }
            executed = true;
        }

        // emoji
        for (let emoji of resultEmoji) {
            await message.react(emoji);
            executed = true;
        }

        if (resultDelete) {
            message.delete().catch(() => { });
        }

        return executed;
    },

    setup(client) {
        // get guild list if bot made for it
        for (let gID of Object.keys(client.config)) {
            if (!client.config[gID].timeTag) { continue; }

            let config = client.config[gID].timeTag;
            if (!config) { continue; }

            const guild = client.guilds.cache.get(gID);
            if (!guild) { continue; }    // bot not in guild

            let newCore = new timeTagCore(client, config, guild);
            coreArray.push(newCore);
        }

        // auto reboot by time
        let interval = setInterval(async () => {
            // check time
            let nowHours = new Date(Date.now()).getHours();
            let nowMinutes = new Date(Date.now()).getMinutes();
            // reboot at 01:55, 09:55, 17:55
            if ([1, 9, 17].includes(nowHours) && nowMinutes >= 55 && nowMinutes < 58) {
                // reboot = true;
            } else { return; }

            let reboot = true;
            let log = [];
            for (let core of coreArray) {
                if (core.workingVideo == null) { continue; }

                reboot = false;
                let userName = core.client ? core.client.user.username : "UNKNOWN";
                log.push(`${userName} workingVideo not null <http://youtu.be/${core.workingVideo.vID}>`);
            }

            let channel = client.channels.cache.get(DEBUG_CHANNEL_ID);

            if (reboot === false) {
                // keep reboot fail log
                if (channel) {
                    await channel.send({
                        content: `BOT can't reboot!\n${log.join('\n')}`
                    })
                }

                return;
            }

            if (channel) {
                // const hours = nowHours.toString().padStart(2, '0');
                // const minutes = nowMinutes.toString().padStart(2, '0');
                // await channel.send({ content: `<${hours}:${minutes}> BOT reboot!` });

                const nowDate = parseInt(Date.now() / 1000);
                await channel.send({ content: `<t:${nowDate}>  <t:${nowDate}:R> 🔁!` })
            }
            console.log(`=====BOT reboot!=====`);
            require('../index.js').terminate();

        }, 3 * 60 * 1000);  // check every 3min
        client.once('close', () => {
            clearInterval(interval);
        });


        const reactionRole = async (reaction, user, add) => {
            if (reaction.emoji.name != EMOJI_LABEL) { return false; }
            if (reaction.message.partial) await reaction.message.fetch();

            const { message } = reaction;
            if (!message.guild) { return false; }
            if (message.author.bot) { return false; }

            // get config
            const { client, content, createdTimestamp } = message;
            let config = client.config[message.guild.id];
            if (!config) { return false; }

            const core = coreArray.find((core) => { return (core.client.user.id == client.user.id && core.guild.id == message.guild.id); });
            if (!core) { return false; }

            // get message time
            let resultEmoji = [];
            let dTime = createdTimestamp - core.workingVideo.startTime;
            if (core.status != "none") { dTime = dTime - 12000; }  // 12sec time lag
            if (dTime < 0) { return null; }  // not set tag

            const command = add ? 'set' : 'deltag';
            const args = [`${parseInt(dTime / 1000)}`, `${content.split('\n').shift()}`];

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
        }

        client.on('messageReactionAdd', async (reaction, user) => {
            await reactionRole(reaction, user, true);
        });

        client.on('messageReactionRemove', async (reaction, user) => {
            await reactionRole(reaction, user, false);
        });

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
    }
}

// youtube api
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);

const getVideoStatus = async (vID) => {
    let key = YOUTUBE.getRandomAPIKey();
    try {
        let url = 'https://www.googleapis.com/youtube/v3/videos';
        let params = {
            part: 'id,snippet,liveStreamingDetails',
            id: vID,
            key
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) { throw data.error; }
        if (data.pageInfo.totalResults == 0) { throw 'video not found.'; }

        return data.items[0];
    } catch (error) {
        // quotaExceeded
        if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
            console.log(`ERR! quotaExceeded key: <${key}>`);
            let keyValid = YOUTUBE.keyQuotaExceeded(key);
            // retry
            if (keyValid) { return await getVideoStatus(vID); }
        }

        else {
            console.log(error.errors[0]);
            console.log(error);
        }
        return null;
    }
}
// const getTimeString = (time) => {
//     return new Date(time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
// }