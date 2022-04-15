
const fs = require('fs');
let mclog = fs.existsSync("./.env") ? console.log : () => { };
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };

// bot core
const { Permissions, MessageEmbed } = require('discord.js');
// discord api
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);
const post = util.promisify(request.post);

// webhook
const redirectUri = `https://arraydcbot.herokuapp.com`;
// const redirectUri = `https://a363-122-116-50-201.ngrok.io`;
// API endpoint
const API_ENDPOINT = 'https://discord.com/api'

// youtube API
const { DISCORD } = require('../config.js');

// database api
const { Pool } = require('pg');
const pgConfig = { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, };
const pool = new Pool(pgConfig);
pool.connect().then(p => { p.end(); }).catch(console.error); // test connect
const memberTime = 1000 * 60 * 60 * 24 * 35;    // 1000 ms  *  60 sec  *  60 min  *  24 hr  *  35 days
const memberTemp = 1000 * 60 * 60 * 24;         // 1000 ms  *  60 sec  *  60 min  *  24 hr

const coreArray = [];
class memberCheckerCore {
    cacheStreamList = {};
    cacheMemberList = [];
    cacheStreamID = null;

    // setting
    client = null;
    dcPushEmbed = () => { };
    holoChannelID; expiresKey;
    guild; memberRole; logChannelID; startTagChannelID;
    botID; clientSecret;
    apiKey;

    constructor(_client, config, guild, role) {
        if (fs.existsSync("./.env")) {
            console.log(`····memberCheckerCore.init ${guild} @${role.name}`)
        }
        this.client = _client;

        // set database var
        this.holoChannelID = config.holoChannelID;
        this.expiresKey = config.expiresKey;
        // set dc var
        this.guild = guild;
        this.memberRole = role;
        this.logChannelID = config.logChannelID;
        this.startTagChannelID = config.startTagChannelID;
        // set bot var
        this.botID = _client.user.id;
        this.clientSecret = DISCORD.getBot(_client.user.id).CLIENT_SECRET;

        // set dcPush method
        const channel = this.client.channels.cache.get(this.logChannelID);
        if (channel) {
            this.dcPushEmbed = (embed) => { return channel.send({ embeds: [embed] }).catch(console.error); };
        }

        // this.apiKey = YOUTUBE.pickRandomAPIKey();
        this.apiKey = config.apiKey;
    };

    async coreInit() {
        // check table
        if (!await this.pgCheckTable()) {
            console.log(`init user_connections database!`);
            await this.pgCreatTable();
        }
        if (!await this.pgCheckColumn()) {
            console.log(`init column <${this.expiresKey}>!`);
            await this.pgCreatColumn();
        }

        // check expires user
        await this.checkExpiresUser();

        // if (fs.existsSync("./.env")) {
        //     // debug
        //     this.cacheStreamLists();
        //     await this.traceStreamChat();
        // }

        // clock
        let interval = setInterval(async () => {

            // check upcoming stream
            if (this.cacheStreamID != null) { return; }

            // check stream task
            let nowTime = new Date(Date.now());
            if (![2, 3, 4, 5, 9, 10].includes(nowTime.getHours()) && nowTime.getMinutes() == 3 && nowTime.getSeconds() < 15) {
                await this.cacheStreamLists();
            }
            for (let vID of Object.keys(this.cacheStreamList)) {
                // get cache
                let video = this.cacheStreamList[vID];
                if (!video) { continue; }
                // check stream started
                if (video.snippet.liveBroadcastContent != 'upcoming') { continue; }
                // (disable free talk)
                let startTime = Date.parse(video.liveStreamingDetails.scheduledStartTime);
                if (startTime > Date.now()) { continue; }   // (disable free talk)

                // recheck upcoming
                // get REALLY video data
                let newStatus = await this.getVideoStatus(vID);
                if (!newStatus) { continue; }
                this.cacheStreamList[vID] = newStatus;
            }

            // try trace watching stream
            this.traceStreamChat();

        }, 15 * 1000);  // check every 5sec
        this.client.once('close', () => {
            clearInterval(interval);
        });
    }
    get301Url() {
        let url = `${redirectUri}/member/${this.botID}/${this.expiresKey}`;
        return url;
    }
    getAuthorizeUrl() {
        let url = `https://discord.com/api/oauth2/authorize?`
            + `client_id=${this.botID}&`
            + `state=${this.botID}${this.expiresKey}&`
            + `redirect_uri=${encodeURIComponent(redirectUri + "/callback")}&`
            + `response_type=code&`
            + `scope=identify%20connections`;
        return url;
    }



    // youtube api
    async getVideoSearch({ channelId = this.holoChannelID, eventType, order, publishedAfter }) {
        mclog(`youtube.getVideoSearch`, channelId, eventType);
        try {
            const url = 'https://www.googleapis.com/youtube/v3/search';
            const params = {
                part: 'id,snippet', channelId,
                eventType, order, publishedAfter,
                maxResults: 5, type: "video",
                key: this.apiKey[0]
            }
            const res = await get({ url, qs: params, json: true });
            const data = res.body;

            if (data.error) { throw data.error; }
            if (data.items.length == 0) { return []; } // throw 'videos not found.'; }

            return data.items;
        } catch (error) {
            // quotaExceeded
            if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
                console.log(`ERR! quotaExceeded key: <${this.apiKey[0]}>`);
                // let keyValid = YOUTUBE.keyQuotaExceeded(this.apiKey);
                // if (keyValid) {
                //     // retry            
                //     this.apiKey = YOUTUBE.pickRandomAPIKey();
                //     return await this.getVideoSearch({ channelId, eventType, order, publishedAfter });
                // }
            }

            else {
                console.log(error);
            }
            return [];
        }
    }
    async getVideoStatus(vID) {
        mclog(`youtube.getVideoStatus ${vID}`);
        try {
            const url = 'https://www.googleapis.com/youtube/v3/videos';
            const params = {
                part: 'id,snippet,liveStreamingDetails',
                id: vID,
                key: this.apiKey[0]
            }
            const res = await get({ url, qs: params, json: true });
            const data = res.body;

            if (data.error) { throw data.error; }
            if (data.pageInfo.totalResults == 0) { throw 'video not found.'; }

            return data.items[0];
        } catch (error) {
            // quotaExceeded
            if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
                console.log(`ERR! quotaExceeded key: <${this.apiKey[0]}>`);
                // let keyValid = YOUTUBE.keyQuotaExceeded(this.apiKey);
                // if (keyValid) {
                //     // retry            
                //     this.apiKey = YOUTUBE.pickRandomAPIKey();
                //     return await this.getVideoStatus(vID);
                // }
            }

            else {
                console.log(error.errors || error);
            }
            return null;
        }
    }
    async getStreamChat(liveChatId, pageToken) {
        try {
            const url = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
            const params = {
                // part: 'id,snippet,authorDetails',
                part: 'id,authorDetails',
                key: this.apiKey[1],
                liveChatId,
                pageToken
            }
            mclog(url, liveChatId, pageToken);
            const res = await get({ url, qs: params, json: true });
            const data = res.body;

            if (data.error) { throw data.error; }

            return data;

        } catch (error) {
            // quotaExceeded
            if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
                console.log(`ERR! quotaExceeded key: <${this.apiKey[1]}>`);
                // let keyValid = YOUTUBE.keyQuotaExceeded(this.apiKey);
                // if (keyValid) {
                //     // retry            
                //     this.apiKey = YOUTUBE.pickRandomAPIKey();
                //     return await this.getStreamChat(liveChatId, pageToken);
                // }
            }

            // liveChatEnded
            else if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'liveChatEnded') {
                console.log(`liveChatEnded!`);
                // clear cache
                // this.cacheStreamList = {};
                this.cacheMemberList = [];
            }

            // forbidden
            else if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'forbidden'
                // && error.message == 'You do not have the necessary permissions to retrieve messages for the specified chat.'
            ) {
                console.log(`forbidden!`, error.message);
                // clear cache
                this.cacheStreamList = {};
                this.cacheMemberList = [];
            }

            else {
                console.log('Oops!');
                console.log(error);
            }
            this.cacheStreamID = null;
            return null;
        }
    }



    // main logic method
    async loopgetStreamChat(liveChatId) {
        // get chat
        let pageToken = null;
        let vID = this.cacheStreamID;
        let data = await this.getStreamChat(liveChatId, pageToken);

        // todo
        // member only ?
        if (data == null) { return; }

        let video = this.cacheStreamList[vID];
        let description = video ? video.snippet.title : vID;
        let thumbnails;
        if (video) {
            thumbnails = video.snippet.thumbnails.default.url ? video.snippet.thumbnails.default.url : thumbnails;
            thumbnails = video.snippet.thumbnails.medium.url ? video.snippet.thumbnails.medium.url : thumbnails;
            thumbnails = video.snippet.thumbnails.high.url ? video.snippet.thumbnails.high.url : thumbnails;
        }
        this.dcPushEmbed(new MessageEmbed().setColor('DARK_GOLD').setDescription(`直播開始: [${description}](http://youtu.be/${vID})`).setThumbnail(thumbnails));
        if (this.startTagChannelID && this.client.channels.cache.has(this.startTagChannelID)) {
            const channel = this.client.channels.cache.get(this.startTagChannelID);
            channel.send({ content: `!yt_start http://youtu.be/${vID}` }).catch(console.error);
        }

        while (true) {

            // set database / discord role
            this.readStreamChatData(data);

            // next request
            pageToken = data.nextPageToken;
            let nextTime = data.pollingIntervalMillis;
            mclog(` -- ${data.items.length.toString().padStart(3, ' ')} messages returned -- ${nextTime} ${pageToken}`)
            await sleep(nextTime);

            // get chat
            data = await this.getStreamChat(liveChatId, pageToken);
            // liveChatEnded
            if (data === null) { break; }
        }
        this.cacheStreamList[vID] = null;
    }
    async cacheStreamLists() {
        mclog('cacheStreamLists');
        let date = new Date(Date.now() - 1000 * 60 * 60 * 24);  // last day
        date = new Date(date.setHours(3, 0, 0, 0));             // last day 03:00

        // search videos in last day
        // let videos = await this.getVideoSearch({ order: 'date', publishedAfter: date.toISOString() });
        let videos = await await this.getVideoSearch({ eventType: "live" });
        if (videos == null) { return; }
        videos = videos.concat(
            // get free chat video
            (await this.getVideoSearch({ eventType: "upcoming" })).filter((newVideo) => !videos.find((video) => video.id.videoId == newVideo.id.videoId)),
            // skip upcoming new video
        )

        sleep(1000).then(() => {
            mclog(`now time:`, new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }));
        });
        for (let video of videos) {
            // get REALLY video data
            let vID = video.id.videoId;
            let videoStatus = await this.getVideoStatus(vID);
            if (videoStatus == null) { break; }

            // check result status AGAIN
            let status = videoStatus.snippet.liveBroadcastContent;
            let startTime = videoStatus.liveStreamingDetails.scheduledStartTime;
            sleep(1000).then(() => {
                mclog(`stream at`, new Date(Date.parse(startTime)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }), vID, status.padStart(8, ' '), videoStatus.snippet.title);
            });

            if (!['upcoming', 'live'].includes(status)) { continue; }
            this.cacheStreamList[vID] = videoStatus;
        }
    }
    async traceStreamChat() {
        let vIDs = Object.keys(this.cacheStreamList);
        for (let vID of vIDs) {
            // get video from cache
            let video = this.cacheStreamList[vID];
            if (!video) { continue; }

            // check stream started
            if (video.snippet.liveBroadcastContent != 'live') { continue; }

            // get chat id
            this.cacheStreamID = vID;
            // start trace
            mclog(`start trace <${video.snippet.title}>`);
            this.loopgetStreamChat(video.liveStreamingDetails.activeLiveChatId);
        }
    }
    async readStreamChatData(data = { items: [] }, clear = false) {
        if (clear) { clear = []; }
        if (!data) { data = { items: [] } }
        // get all message
        for (let chatMessage of data.items) {
            // check user is Chat Sponsor or not
            // get user data
            let auDetails = chatMessage.authorDetails;
            let cID = auDetails.channelId;

            // check user in cache or not by youtube channel id
            if (this.cacheMemberList.includes(cID) || (clear && clear.includes(cID))) {
                mclog(`User in cache list : ${chatMessage.authorDetails.displayName}`);
                continue;
            }
            else if (clear) { clear.push(cID); }   // set cache
            else { this.cacheMemberList.push(cID); }   // set cache

            // check user is discord user or not
            let dbItem = await this.pgGetDataByYoutubeID(cID);
            if (!dbItem) {
                // not discord guild user
                mclog(`User not in discord: ${chatMessage.authorDetails.displayName}`);
                continue;
            }
            let dID = dbItem.discord_id;

            // get user data in guild
            let user = this.guild.members.cache.get(dID);
            if (!user) {
                mclog(`user <@${dID}> not in guild <${this.guild}>`);
                continue;
                // // debug code
                // user = {
                //     roles: {
                //         cache: { get: () => { return false } },
                //         add: async () => { },
                //         remove: async () => { }
                //     },
                //     user: { tag: `debug#0000 ` }
                // };
            }

            // check user level
            let isSpecalUser = user.roles.cache.has(this.memberRole.id);
            let isChatSponsor = (auDetails.isChatOwner || auDetails.isChatSponsor || auDetails.isChatModerator);

            // set user role
            if (isChatSponsor && isSpecalUser) {
                mclog(`found dc user, Update Expires! : ${chatMessage.authorDetails.displayName}`);
                this.dcPushEmbed(new MessageEmbed().setColor('AQUA').setDescription(`認證成功, 延展期限: ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, (Date.now() + memberTime));
            }
            if (isChatSponsor && !isSpecalUser) {
                mclog(`found dc user, Add Role! : ${chatMessage.authorDetails.displayName}`);
                this.dcPushEmbed(new MessageEmbed().setColor('BLUE').setDescription(`認證成功, 新增身分組(${this.memberRole}): ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, (Date.now() + memberTime));
                user.roles.add(this.memberRole).catch(console.error);
            }

            if (!isChatSponsor && isSpecalUser) {
                mclog(`found dc user, Disable role! : ${chatMessage.authorDetails.displayName}`);
                this.dcPushEmbed(new MessageEmbed().setColor('RED').setDescription(`非會員, 刪除身分組(${this.memberRole}): ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, 0);
                user.roles.remove(this.memberRole).catch(console.log);
            }
            if (!isChatSponsor && !isSpecalUser) {
                mclog(`found dc user, Delete apply! : ${chatMessage.authorDetails.displayName}`);
                this.dcPushEmbed(new MessageEmbed().setColor('ORANGE').setDescription(`${dbItem[this.expiresKey] > 0 ? '申請無效, 清除申請' : '申請無效'}: ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, 0);
            }
        }
    }
    // setup
    async checkExpiresUser() {
        mclog('checkExpiresUser');
        let data = [];

        // => del user role/del db data
        // sync run
        data = await this.pgListExpiresUserID();
        mclog(`pgListExpiresUserID`);

        // get users
        for (let _user of data) {
            let dID = _user.discord_id;

            // get user data in guild
            let user = this.guild.members.cache.get(dID);
            if (!user) {
                mclog(`user <@${dID}> not in guild <${this.guild}>`);
                continue;
            }

            // check user level
            let isSpecalUser = user.roles.cache.has(this.memberRole.id);

            // set user role
            if (isSpecalUser) {
                mclog(`found dc user, Disable role! : ${dID}`);
                this.dcPushEmbed(new MessageEmbed().setColor('RED').setDescription(`非會員, 刪除身分組(${this.memberRole}): ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, 0);
                user.roles.remove(this.memberRole).catch(console.log);
            } else {
                mclog(`found dc user, Delete apply! : ${dID}`);
                this.dcPushEmbed(new MessageEmbed().setColor('ORANGE').setDescription(`申請過期, 清除申請: ${user.user.tag} ${user.toString()}`));
                this.pgUpdateExpires(dID, 0);
            }
        }


        // set role again
        data = await this.pgListUserData();
        mclog(`pgListUserData`);

        // get users
        for (let _user of data) {
            let dID = _user.discord_id;
            let expires = _user[this.expiresKey];
            if (expires == 0) { continue; }

            // get user data in guild
            let user = this.guild.members.cache.get(dID);
            if (!user) {
                // mclog(`user <@${dID}> not in guild <${this.guild}>`);
                continue;
            }

            // check user level
            let isSpecalUser = user.roles.cache.has(this.memberRole.id);

            // set user role
            if (isSpecalUser) {
                // mclog(`found dc user with member role! : ${dID}`);
            } else if (expires > Date.now() + memberTemp) {
                mclog(`found dc user, add role! : ${dID}`);
                this.dcPushEmbed(new MessageEmbed().setColor('BLUE').setDescription(`確認期限, 恢復身分組(${this.memberRole}): ${user.user.tag} ${user.toString()}`));
                user.roles.add(this.memberRole).catch(console.log);
            }
        }
    }



    // table api
    async pgListTable() {
        const sql = `SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';`;
        const res = await pool.query(sql)//.catch(e => { throw e; });
        return res.rows
    }
    async pgCheckTable() {
        const sql = `SELECT * FROM pg_catalog.pg_tables WHERE tablename='user_connections';`
        const res = await pool.query(sql).catch(console.log);
        return res && res.rows.length;
    }
    async pgCreatTable() {
        const sql = [
            `CREATE TABLE user_connections (`,
            `discord_id char(18) PRIMARY KEY,`,
            `youtube_id char(24) NOT NULL,`,
            `${this.expiresKey} bigint NOT NULL DEFAULT 0`,
            `);`
        ].join(' ');
        return await pool.query(sql);
    }
    async pgCheckColumn() {
        const sql = `SELECT ${this.expiresKey} FROM user_connections;`
        const res = await pool.query(sql).catch(console.log);
        return res && res.rows.length;
    }
    async pgCreatColumn() {
        const sql = `ALTER TABLE user_connections ADD COLUMN ${this.expiresKey} bigint NOT NULL DEFAULT 0;`
        return await pool.query(sql);
    }
    // async pgDropTable(tableName = 'user_connections') {
    //     // delete table
    //     const sql = `DROP TABLE ${tableName};`
    //     return await pool.query(sql);
    // }
    // data api
    async pgListUserID() {
        const sql = `SELECT discord_id FROM user_connections;`
        const res = await pool.query(sql);
        return res.rows;
    }
    async pgListUserData() {
        const sql = `SELECT * FROM user_connections;`
        const res = await pool.query(sql);
        return res.rows;
    }
    async pgListExpiresUserID(expires = Date.now()) {
        const sql = [
            `SELECT (discord_id) FROM user_connections`,
            `WHERE ${this.expiresKey}<=${expires}`,
            `AND ${this.expiresKey}>0;`
        ].join(' ');
        const res = await pool.query(sql);
        return res.rows;
    }
    async pgGetDataByDiscordID(discordID) {
        const sql = [
            `SELECT * FROM user_connections`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql);
        return res.rows[0];
    }
    async pgGetDataByYoutubeID(youtubeID) {
        const sql = [
            `SELECT * FROM user_connections`,
            `WHERE youtube_id='${youtubeID}';`
        ].join(' ');
        const res = await pool.query(sql);
        return res.rows[0];
    }
    async pgInsertData(discordID, youtubeID) {
        let data = await this.pgGetDataByDiscordID(discordID);
        if (data) {
            // found old data
            if (data[this.expiresKey] == 0) {
                await this.pgUpdateExpires(discordID, (Date.now() + memberTemp));
            }
            return await this.pgGetDataByDiscordID(discordID);
        }

        // insert data
        const sql = [
            `INSERT INTO user_connections (discord_id, youtube_id, ${this.expiresKey})`,
            `VALUES ('${discordID}', '${youtubeID}', ${Date.now() + memberTemp});`
        ].join(' ');
        return await pool.query(sql);
    }
    // async pgDeleteData(discordID) {
    //     if (!await this.pgGetDataByDiscordID(discordID)) { return; }
    //     // insert data
    //     const sql = [
    //         `DELETE FROM user_connections`,
    //         `WHERE discord_id='${discordID}'`
    //     ].join(' ');
    //     return await pool.query(sql);
    // }
    async pgUpdateYoutubeID(discordID, youtubeID) {
        // insert data
        const sql = [
            `UPDATE user_connections`,
            `SET youtube_id='${youtubeID}'`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        return await pool.query(sql);
    }
    async pgUpdateExpires(discordID, expires = (Date.now() + memberTime)) {
        if (!await this.pgGetDataByDiscordID(discordID)) { return; }
        // insert data
        const sql = [
            `UPDATE user_connections`,
            `SET ${this.expiresKey}=${expires}`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        return await pool.query(sql);
    }
}



module.exports = {
    name: 'member checker',
    description: "check who is SSRB",

    async execute(message) {
        if (!message.guild) { return false; }

        // get config
        const { client, content } = message;
        let config = client.config[message.guild.id];
        if (!config) { return false; }

        const { command, args } = config.fixMessage(content);
        if (!command) { return false; }

        // check core
        let cores = coreArray.filter((core) => { return (core.botID == client.user.id && core.guild.id == message.guild.id); });
        if (cores.length <= 0) { return false; }

        for (let core of cores) {
            const isLogChannel = (message.channel.id == core.logChannelID);

            if (isLogChannel && command == 'mcdebug') {
                mclog = (mclog == console.log) ?
                    (() => { }) : console.log;
                return true;
            }
            if (isLogChannel && command == 'user') {
                let data = await core.pgGetDataByDiscordID(args[0].trim());
                message.channel.send({ content: args[0] });
                message.channel.send({ content: JSON.stringify(data, null, 2) });
                console.log(data)
                return true;
            }

            if (isLogChannel && command == 'database') {
                // get expires data
                let data = await core.pgListUserData();
                let expiresKey = core.expiresKey;
                let response = [];

                // sort
                data.sort((a, b) => a[expiresKey] == b[expiresKey] ? 0 : (a[expiresKey] > b[expiresKey] ? 1 : -1));
                // set log
                for (let user of data) {
                    let { discord_id: dID, youtube_id: yID } = user;
                    let expires = parseInt(user[expiresKey]);
                    if (expires == 0) { continue; }

                    let t = (expires - Date.now()) / (1000 * 60 * 60);
                    let timeLeft = `${parseInt(t / 24).toString().padStart(3, ' ')}days ${parseInt(t % 24).toString().padStart(2, ' ')}hours`;
                    let dateLimit = new Date(expires).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }).padStart(23, ' ');

                    mclog(dID, yID, timeLeft, dateLimit, expires);
                    if (t < (memberTemp / (1000 * 60 * 60))) {
                        response.push(`<@${dID}> ${yID}\n${timeLeft} ${dateLimit}`);
                    }
                }

                if (response.length > 0) {
                    let embeds = [new MessageEmbed().setDescription(response.join('\n'))];
                    message.channel.send({ embeds });
                }
                continue;
            }
            if (command == 'member') {
                message.channel.send({ content: core.get301Url() });
                continue;
            }
            if (command == 'freechat') {

                if (args[0]) {
                    // force update stream list cache
                    let vID = args[0].trim();
                    core.cacheStreamList[vID] = await core.getVideoStatus(vID);
                } else if (isLogChannel) {
                    // force update all stream list cache by admin
                    await core.cacheStreamLists();
                    core.dcPushEmbed(new MessageEmbed().setColor('DARK_GOLD').setDescription(`更新直播表`));
                }

                core.dcPushEmbed(new MessageEmbed().setColor('DARK_GOLD').setDescription(`手動認證: ${message.author.tag} ${message.author.toString()}`));

                mclog(`[MC] freechat keys: ${Object.keys(core.cacheStreamList).length}`);

                let vIDs = Object.keys(core.cacheStreamList);
                for (let vID of vIDs) {
                    // get cache
                    let video = core.cacheStreamList[vID];
                    mclog(`[MC] ${vID} ${video ? 'Object' : video}`);
                    if (!video) { continue; }

                    // check stream start time
                    let status = video.snippet.liveBroadcastContent;
                    mclog(`${status.padStart(12, ' ')} <${video.snippet.title}>`);
                    if (status != 'upcoming') { continue; }

                    // start trace
                    mclog(`trace <${video.snippet.title}>`);
                    let data = await core.getStreamChat(video.liveStreamingDetails.activeLiveChatId);
                    core.readStreamChatData(data, true);
                }

                continue;
            }
        }

        return false;
    },

    async setup(client) {
        // get guild list if bot made for it
        for (let gID of Object.keys(client.config)) {
            if (!client.config[gID].memberChecker) { continue; }

            for (let mcConfig of client.config[gID].memberChecker) {
                const guild = client.guilds.cache.get(gID);
                if (!guild) { continue; }    // bot not in guild
                if (!guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) { continue; }
                // if (!guild.me.permissions.has(Permissions.FLAGS.SEND_MESSAGES)) { continue; }

                const role = guild.roles.cache.get(mcConfig.memberRoleID);
                if (!role) { continue; }    // cant found role

                let newCore = new memberCheckerCore(client, mcConfig, guild, role);
                await newCore.coreInit();
                coreArray.push(newCore);
            }
        }
    }
}


// express
const app = require('../server.js').app;
app.all(`/member/:botid/:ekey`, async (req, res) => {
    let botID = req.params.botid;
    let expiresKey = req.params.ekey;

    let core = coreArray.find((core) => { return (core.botID == botID && core.expiresKey == expiresKey); });
    if (!core) {
        res.send(`不明的參數組! 請聯絡管理員或製作者`);
        return;
    }

    res.redirect(301, core.getAuthorizeUrl());
    return;
});
app.all('/callback', async (req, res) => {
    const param = req.query.state;
    const [, botID, expiresKey] = (param.match(/^(\d{18})(\S{12})$/) || [, 'null', 'null']);

    let cores = coreArray.filter((core) => { return (core.botID == botID && core.expiresKey == expiresKey); });
    if (cores.length <= 0) {
        res.status(404).send(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        console.log(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        return;
    }

    let core = cores[0];
    let cID = null, username = null;
    try {
        let headers = { "Content-Type": "application/x-www-form-urlencoded" };
        let body = `client_id=${core.botID}`
        body += `&client_secret=${core.clientSecret}`
        body += '&grant_type=authorization_code'
        body += `&code=${req.query.code}`
        body += `&redirect_uri=${redirectUri}/callback`
        body += '&scope=connections'
        // get oauth2 token
        let tokenResponse = await post({ url: `${API_ENDPOINT}/oauth2/token`, headers, body, json: true })
        let { access_token } = tokenResponse.body;
        // response.body = {
        //     access_token: '------------------------------', expires_in: 604800,
        //     refresh_token: '------------------------------', scope: 'connections', token_type: 'Bearer'
        // }

        // get user connections
        headers = { Authorization: "Bearer " + access_token }
        let identify = await get({ url: `${API_ENDPOINT}/users/@me`, headers, json: true })
        let connections = await get({ url: `${API_ENDPOINT}/users/@me/connections`, headers, json: true })
        // get user data
        let dID = identify.body.id;
        username = identify.body.username;
        let tag = identify.body.discriminator;

        // get connections data
        if (connections.body && Array.isArray(connections.body)) {
            for (let connect of connections.body) {
                if (connect.type != 'youtube') { continue; }
                cID = connect.id;
                break;
            }
        }

        // didn't found youtube cID
        if (cID == null) {
            let html = [
                `User: ${username}`,
                `Youtube channel: ERROR! Can't found connect data!`,
                `               : 錯誤! 找不到帳號連結資訊!`
            ].join('<br>')

            res.send(html);
            return;
        }

        // insert data
        let userData = await core.pgInsertData(dID, cID);

        let html = [
            `User: ${username}`,
            `Youtube channel: https://www.youtube.com/channel/${cID}`,
            `expires in time: ${new Date(parseInt(userData[core.expiresKey])).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`
        ].join('<br>')

        res.send(html);

        for (core of cores) {
            // log
            core.dcPushEmbed(new MessageEmbed().setColor('GREEN').setDescription(`申請完成: ${username}@${tag} <@${dID}>`));

            // delete this user's data from cache if on stream
            if (core.cacheMemberList.includes(cID)) { core.cacheMemberList = core.cacheMemberList.filter((e) => e != cID); }
        }
        return;
    } catch (e) {
        console.log(e)
        res.send(e.message);
        return;
    }

    {
        // identify.body = {
        //     accent_color: null, avatar: '0b69434e070a29d575737ed159a29224',
        //     banner: null, banner_color: null, discriminator: '8676', flags: 0,
        //     id: '353625493876113440', locale: 'zh-TW', mfa_enabled: true,
        //     public_flags: 0, username: 'K.T.710'
        // }
        //
        // connections.body[0] = {
        //     friend_sync: false, id: 'UC-JsTXzopVL28gQXEUV276w', name: 'K.T.',
        //     show_activity: true, type: 'youtube', verified: true, visibility: 1
        // }
    }
});

// 'UC1suqwovbL1kzsoaZgFZLKg'
// 'UCHsx4Hqa-1ORjQTh9TYDhww'






    // // test code
    // (async () => {
    //     console.log(`pgInsertData`);
    //     // await pgInsertData('353625493876113440', 'UC-JsTXzopVL28gQXEUV276w');

    //     console.log(`pgListdiscord_id`);
    //     for (let { discord_id: dID } of await pgListUserID()) {
    //         let { youtube_id: yID, expires } = await pgGetDataByID(dID);

    //         console.log(dID, yID, new Date(parseInt(expires)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }));
    //     }

    //     // update expires
    //     await pgUpdateExpires('353625493876113440');

    //     // check expires user
    //     // => del role/del db data
    //     console.log(`pgListdiscord_id`);
    //     for (let { discord_id: dID } of await pgListExpiresUserID()) {
    //         let { youtube_id: yID, expires } = await pgGetDataByID(dID);

    //         console.log(dID, yID, new Date(parseInt(expires)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }));
    //     }
    //     // await pgDeleteData('862357372592586772');

    //     console.log('pause')
    //     process.stdin.once('data', function () { continueDoingStuff(); });

    // })();

