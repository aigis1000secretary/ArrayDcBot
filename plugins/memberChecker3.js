
// node base
const fs = require('fs');
const debug = fs.existsSync("./.env");

const { default: YTDlpWrap } = require("yt-dlp-wrap");
const ytdlpPath = (require("os").platform() == 'linux' ? './yt-dlp' : '.\\yt-dlp.exe');


let mclog = debug ? console.log : () => { };
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };
const md5 = (source) => require('crypto').createHash('md5').update(source).digest('hex');

// discord
const { EmbedBuilder, PermissionFlagsBits, Colors } = require('discord.js');

// http request
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);
const post = util.promisify(request.post);

// discord webhook
const redirectUri = process.env.HOST_URL;
// API endpoint
const API_ENDPOINT = 'https://discord.com/api';

// config
const regUrl = /(?:https?:\/\/)(?:(?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(?:\/?(?:watch|v|embed|shorts|live|attribution_link(?:[\?&][^\/]+=[^\/]*)*)?\/)(?:(?:watch)?(?:[\?&][^\?&\/]+=[^\?&\/]*)*[\?&]?v=)?(?:multiview\/\w{4})?([\w\-]+)/

// database api
const { Pool } = require('pg');
const pgConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: false,
};
const pool = new Pool(pgConfig);
pool.connect().then(p => { p.end(); }).catch(console.error); // test connect
const memberTime = 1000 * 60 * 60 * 24 * 35;    // 1000 ms  *  60 sec  *  60 min  *  24 hr  *  35 days
// const memberTemp = 1000 * 60 * 60 * 24;         // 1000 ms  *  60 sec  *  60 min  *  24 hr

class Pg {
    static dataCache = new Map();

    static async init() {
        // check table
        if ((await this.checkTable())?.rowCount == 0) {
            console.log(`init user_connections database!`);
            await this.creatTable();
        }

        // load cache
        const sql = `SELECT * FROM user_connections;`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        if (res) {
            for (let pgUser of res.rows) {
                pgUser.discord_id = pgUser.discord_id.trim();
                this.dataCache.set(pgUser.discord_id, pgUser);
            }
        }
    };

    static async initColumn(expiresKey) {
        // check column
        if (!await this.checkColumn(expiresKey)) {
            console.log(`init column <${expiresKey}>!`);
            await this.creatColumn(expiresKey);
        }

        // update cache
        for (let key of this.dataCache.keys()) {
            this.dataCache.get(key)[expiresKey] = '0';
        }
    };

    // table api
    static async listTable() {
        const sql = `SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';`;
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };
    static async checkTable() {
        const sql = `SELECT * FROM pg_catalog.pg_tables WHERE tablename='user_connections';`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };
    static async creatTable() {
        const sql = [
            `CREATE TABLE user_connections (`,
            `discord_id char(19) PRIMARY KEY,`,
            `youtube_id char(24) NOT NULL,`,
            `);`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res ? res.rows : null;
    };

    // column api
    static async checkColumn(expiresKey) {
        const sql = `SELECT ${expiresKey} FROM user_connections;`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };
    static async creatColumn(expiresKey) {
        const sql = `ALTER TABLE user_connections ADD COLUMN ${expiresKey} bigint NOT NULL DEFAULT 0;`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };
    static async deleteColumn(expiresKey) {
        const sql = `ALTER TABLE user_connections DROP COLUMN ${expiresKey};`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };

    // list api
    static async listUserID() {
        return { rows: this.dataCache.keys() };

        // const sql = `SELECT discord_id FROM user_connections;`
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async listUserData() {
        return { rows: this.dataCache };

        // const sql = `SELECT * FROM user_connections;`
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async listExpiresUserID(expiresKey, expires = Date.now()) {
        return { rows: Array.from(this.dataCache.values()).filter((pgUser) => (pgUser[expiresKey] < expires && pgUser[expiresKey] > 0)) };

        // const sql = [
        //     `SELECT (discord_id) FROM user_connections`,
        //     `WHERE ${expiresKey}<=${expires}`,
        //     `AND ${expiresKey}>0;`
        // ].join(' ');
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };

    // data api
    static async getDataByDiscordID(discordID) {
        return { rows: Array.from(this.dataCache.values()).filter((pgUser) => (pgUser.discord_id == discordID)) };

        // const sql = [
        //     `SELECT * FROM user_connections`,
        //     `WHERE discord_id='${discordID}';`
        // ].join(' ');
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async getDataByYoutubeID(youtubeID) {
        return { rows: Array.from(this.dataCache.values()).filter((pgUser) => (pgUser.youtube_id == youtubeID)) };

        // const sql = [
        //     `SELECT * FROM user_connections`,
        //     `WHERE youtube_id='${youtubeID}';`
        // ].join(' ');
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async creatData(discordID, youtubeID) {
        const sql = [
            `INSERT INTO user_connections (discord_id, youtube_id)`,
            `VALUES ('${discordID}', '${youtubeID}');`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });

        {
            const sql = [
                `SELECT * FROM user_connections`,
                `WHERE discord_id='${discordID}';`
            ].join(' ');
            const res = await pool.query(sql).catch((error) => { console.log(error.message) });
            if (res) { for (let row of res.rows) { row.discord_id = row.discord_id.trim(); } }
            this.dataCache.set(discordID, res.rows[0]);
            return res;
        }

        return res;
    };
    static async deleteData(discordID) {
        this.dataCache.delete(discordID);

        const sql = [
            `DELETE FROM user_connections`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };

    static async updateYoutubeID(discordID, youtubeID) {
        this.dataCache.get(discordID).youtube_id = youtubeID;

        const sql = [
            `UPDATE user_connections`,
            `SET youtube_id='${youtubeID}'`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        return res;
    };
    static async updateExpires(discordID, expiresKey, expires = (Date.now() + memberTime)) {
        this.dataCache.get(discordID)[expiresKey] = expires;

        const sql = [
            `UPDATE user_connections`,
            `SET ${expiresKey}=${expires}`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(sql); console.log(error.message) });
        return res;
    };
}

class YoutubeAPI {
    holoChannelID = 'holoChannelID';
    apiKey = [];
    quotaExceeded = [false, false];

    constructor(config = {}) { this.init(config); };
    init({ holoChannelID, apiKey }) {
        this.holoChannelID = holoChannelID;
        this.apiKey = apiKey;
    };

    // youtube api
    async getVideoSearch({ channelId = this.holoChannelID, eventType, order, publishedAfter } = {}) {
        mclog(`[MC3] youtube.getVideoSearch( ${channelId}, ${eventType} )`);
        if (this.quotaExceeded[0]) {
            return {
                code: 403, message: 'quotaExceeded', reason: 'quotaExceeded',
                variabale: { channelId, eventType, order, publishedAfter }
            };
        }

        try {
            const url = 'https://www.googleapis.com/youtube/v3/search';
            const params = {
                part: 'id,snippet', channelId,
                eventType, order, publishedAfter,
                maxResults: 5, type: "video",
                key: this.apiKey[0]
            }
            const res = await get({ url, qs: params, json: true }); // response

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
            return data.items;
            // return [
            //     {
            //         kind: 'youtube#searchResult', etag: '07WUPWqVpujODorWqJyH8Zs29PI',
            //         id: { kind: 'youtube#video', videoId: '3gH2la1zZ3A' },
            //         snippet: {
            //             publishedAt: '2022-08-17T00:46:24Z', publishTime: '2022-08-17T00:46:24Z',
            //             channelId: 'UCc88OV45ICgHbn3ZqLLb52w', channelTitle: 'Fuma Ch. 夜十神封魔 - UPROAR!! -',
            //             title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
            //             description: 'ドラゴンクエスト11s 本動画のゲームプレイ映像は、株式会社スクウェア・エニックスの許諾を受けて使用しています。 この動画 ...',
            //             liveBroadcastContent: 'upcoming', thumbnails: [Object]
            //         }
            //     }
            // ]

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
            console.log(`youtube.getVideoSearch ${error.errors[0].reason}`);
            // return {
            //     code: error.code,
            //     message: error.message,
            //     reason: error.errors[0].reason,
            //     variabale: { channelId, eventType, order, publishedAfter }
            // }
            return null;
        }
    };
    async getVideoStatus(vID) {
        mclog(`[MC3] youtube.getVideoStatus( ${vID} )`);
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
                console.log(`[MC3] video not found. ${vID}`);
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

    async getStreamChat(liveChatId, pageToken) {
        if (this.quotaExceeded[1]) {
            return {
                code: 403, message: 'quotaExceeded', reason: 'quotaExceeded',
                variabale: { liveChatId, pageToken }
            };
        }

        try {
            const url = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
            const params = {
                part: 'id,snippet,authorDetails',
                // part: 'id,authorDetails',
                key: this.apiKey[1],
                liveChatId,
                pageToken
            }
            mclog(`[MC3] youtube.getStreamChat( ${liveChatId}, ${pageToken} )`);
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
            return data;
            // return
            // const returnResult = {
            //     kind: 'youtube#liveChatMessageListResponse',
            //     etag: 'k2roznPdnguYKdn3FWiXBQQrv6w',
            //     pollingIntervalMillis: 5008,
            //     pageInfo: { totalResults: 200, resultsPerPage: 200 },
            //     nextPageToken: 'GKvSj6q1z_kCIJmkya21z_kC',
            //     items: [
            //         {
            //             kind: 'youtube#liveChatMessage',
            //             etag: 'JlqT1lUOml7QnSJvw8q-3RsVYCU',
            //             id: 'LCC.CjgKDQoLWEZGYmtnejZ5QmsqJwoYVUMtaE02WUp1TllWQW1VV3hlSXI5RmVBEgtYRkZia2d6NnlCaxJFChpDT2FSaHFHMXpfa0NGWk1DclFZZFpPY0JzQRInQ0txT3B2SzB6X2tDRmZlUlZnRWRPTUFEbmcxNjYwNzkyMjQ5MjA4',
            //             authorDetails: [Object]
            //         }
            //     ]
            // }

        } catch (error) {
            // unknown error
            if (!Array.isArray(error.errors) || !error.errors[0]) {
                console.log(error);
                return { code: error.code || null, error };
            }

            if (error.code == 403 && error.errors[0].reason == 'quotaExceeded') {
                this.quotaExceeded[1] = true;
            }
            console.log(`youtube.getStreamChat ${error.errors[0].reason}`);
            return {
                code: error.code,
                message: error.message,
                reason: error.errors[0].reason,
                variabale: { liveChatId, pageToken }
            }
        }
    };
}

class McChannelCore {

    // add api key
    holoChannelID = '';
    youtube = new YoutubeAPI();

    constructor({ holoChannelID, apiKey }) {
        this.holoChannelID = holoChannelID;
        this.youtube = new YoutubeAPI({ holoChannelID, apiKey });
    };

    // get live/upcoming stream by channel ID
    streamList = new Map(); // <vID, video>
    async getVideoList() {

        for (let eventType of ['upcoming', 'live']) {
            // get search
            let _videos = await this.youtube.getVideoSearch({ eventType });

            // check result
            if (!Array.isArray(_videos)) {
                console.log(`getVideoLists error:`, this.holoChannelID);
                console.log(_videos)
                _videos = [];
            }   // something is wrong

            for (let video of _videos) {
                let vID = video.id.videoId;

                // update liveBroadcastContent
                if (this.streamList.has(vID)) {
                    video.memberOnly = this.streamList.get(vID)?.memberOnly;
                }

                // cache video data
                this.streamList.set(vID, video);
            }
        }


        // ready to show search result
        sleep(1000).then(() => {
            mclog(`[MC3] now time:`, new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }));
        });

        // get REALLY video data
        for (let [vID, video] of this.streamList) {

            // get REALLY video data & liveStreamingDetails
            let videoStatus = await this.youtube.getVideoStatus(vID);

            // API error, quotaExceeded
            if (!videoStatus.snippet) {
                // video not found
                if (videoStatus.code == 200) {
                    // delete empty data video (search not found)
                    if (this.streamList.has(vID)) { this.streamList.delete(vID); }
                    continue;
                }

                // set fake ISO time string
                let fakeTime = new Date(0);
                if (video.snippet.liveBroadcastContent == 'upcoming') { fakeTime.setFullYear(2200); }
                fakeTime = fakeTime.toISOString();

                // set fake data object
                videoStatus = {
                    id: vID, snippet: video.snippet,
                    liveStreamingDetails: {
                        scheduledStartTime: fakeTime,
                        activeLiveChatId: null
                    }
                };
            }

            // check result status AGAIN
            let status = videoStatus.snippet.liveBroadcastContent;
            let startTime = videoStatus.liveStreamingDetails.scheduledStartTime;

            // show search result
            sleep(1000).then(() => {
                mclog(`[MC3] stream at`,
                    new Date(Date.parse(startTime)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }),
                    vID,
                    status.padStart(8, ' '),
                    videoStatus.snippet.title);
            });

            // update liveBroadcastContent
            if (this.streamList.has(vID)) {
                videoStatus.memberOnly = this.streamList.get(vID)?.memberOnly;
            }

            // cache video data
            this.streamList.set(vID, videoStatus);
        }
    }


    // working video
    cacheStreamID = null;
    cacheStreamMemberOnly = () => { return this.streamList.get(this.cacheStreamID)?.memberOnly || false; }

    interval = null;
    // get stream chat by youtube api
    async traceStreamChat({ vID, liveChatId, pageToken, loop = false }) {

        // check liveChatId
        if (!liveChatId) {
            mclog(`[MC3] traceStreamChat: ${vID}`);

            if (!this.streamList.has(vID)) {
                mclog(`[MC3] Can't found video data`);
                // return;

                let videoStatus = await this.youtube.getVideoStatus(vID);
                this.streamList.set(vID, videoStatus);
            }

            let video = this.streamList.get(vID);
            liveChatId = video?.liveStreamingDetails?.activeLiveChatId;
            if (!liveChatId) {
                mclog(`[MC3] Can't found video liveChatId`);
                return;
            }
        }

        // get chat data
        let data = await this.youtube.getStreamChat(liveChatId, pageToken);

        if (Array.isArray(data.items)) {
            this.readStreamChatData(data);

            // once for freechat
            if (!loop) { return; }

            // only trace 1 stream in same time
            if (this.cacheStreamID != null && this.cacheStreamID != vID) { return; }
            // set working video id
            this.cacheStreamID = vID;

            // next request
            pageToken = data.nextPageToken;
            let nextTime = data.pollingIntervalMillis;
            let length = data.items.length;
            if (length == 0) { nextTime *= 3; }
            mclog(`[MC3] -- ${length.toString().padStart(3, ' ')} messages returned -- ${nextTime} ${pageToken}`)

            this.interval = setTimeout(arg => this.traceStreamChat(arg), nextTime, { vID, liveChatId, pageToken, loop });
            return;

        } else {
            // got some error

            if (data.reason == 'liveChatEnded') {
                // liveChatEnded

                // disable working video id
                this.cacheStreamID = null;

                // // force update video status to none
                // this.streamList.get(vID).snippet.liveBroadcastContent = 'none';
                // delete video data
                this.streamList.delete(vID);

                // finish catch loop
                this.interval = null;
                return;

            } else if (data.reason == 'quotaExceeded') {
                // quotaExceeded

                // disable working video id
                this.cacheStreamID = null;

                // finish catch loop, 
                // this.youtube.quotaExceeded[1] will block method startGetStreamChat()
                this.interval = null;
                return;

            } else if (data.reason == 'forbidden' && data.message.includes('permissions')) {
                // 'You do not have the necessary permissions to retrieve messages for the specified chat.'     // 2022/01/08
                // 'You do not have the permissions required to retrieve messages for the specified live chat.' // 2022/08/18

                // forbidden, member only stream

                // disable working video id
                this.cacheStreamID = null;

                // get video & set member only flag
                if (this.streamList.has(vID)) {
                    this.streamList.get(vID).memberOnly = true;
                }

                // finish catch loop, 
                // memberOnly flag will block method startGetStreamChat()
                this.interval = null;
                return;

            } else {
                // API error, try again later
                this.interval = setTimeout(this.traceStreamChat, 1000, { vID, liveChatId, pageToken, loop });
                return;
            }
        }
    }
    async readStreamChatData(data = { items: [] }, force = false) {
        if (!data.items || !(typeof data.items[Symbol.iterator] === 'function')) { data = { items: [] } }

        for (let chatMessage of data.items) {
            // check user is Chat Sponsor or not
            // get user data
            let auDetails = chatMessage.authorDetails;
            // let auDetails = {
            //     channelId: 'UCBcPAHz9RxwYkcpWs8XwkRw',
            //     channelUrl: 'http://www.youtube.com/channel/UCBcPAHz9RxwYkcpWs8XwkRw',
            //     displayName: 'Detron',
            //     isChatModerator: false,
            //     isChatOwner: false,
            //     isChatSponsor: false,
            //     isVerified: false,
            //     profileImageUrl: 'https://yt3.ggpht.com/ytc/AGIKgqNMdgsY_f_3yAnQQgKqKVRnfEnuPaTfaAGwgItm4w=s88-c-k-c0x00ffffff-no-rj'
            // }

            let message = chatMessage.snippet?.textMessageDetails?.messageText || '';
            let superchat = chatMessage.snippet?.superChatDetails?.amountDisplayString || '';

            // callback
            await mainMcCore.onLiveChat(this.holoChannelID, auDetails, message, superchat);
        }
    }

    // === yt-dlp-wrap ===
    ytDlpController = null;
    livechatRawPool = new Map();
    async traceStreamChatByYtdlp({ vID, memberOnly }) {

        // only trace 1 stream in same time
        if (this.cacheStreamID != null) { return; }
        // set working video id
        this.cacheStreamID = vID;

        if (!this.streamList.has(vID)) {
            mclog(`[MC3] Can't found video data`);
            // return;

            let videoStatus = await this.youtube.getVideoStatus(vID);
            this.streamList.set(vID, videoStatus);
        }

        // Additionally you can set the options of the spawned process and abort the process.
        // The abortion of the spawned process is handled by passing the signal of an AbortController.
        this.ytDlpController = new AbortController();

        // Init an instance with a given binary path.
        // If none is provided "youtube-dl" will be used as command.
        const ytDlpWrap = new YTDlpWrap(ytdlpPath);

        // start stream
        let command = [
            `https://www.youtube.com/watch?v=${vID}`,
            '--skip-download', '--restrict-filenames',
            '--write-subs', '--sub-langs', 'live_chat',
            // '--cookies', 'cookies.txt'
        ];
        if (memberOnly) { command.push('--cookies'); command.push('cookies.txt'); }

        ytDlpWrap
            .exec(command, { shell: true, detached: false }, this.ytDlpController.signal)
            // .on('progress', (progress) => console.log(progress.percent, progress.totalSize, progress.currentSpeed, progress.eta))
            .on('ytDlpEvent', async (eventType, eventData) => {
                if (eventType != 'download' || !eventData.includes('frag')) {
                    // console.log(`[${eventType}]`, eventData);
                }

                // download live chat data
                if (eventType == 'download' && !eventData.includes('frag') &&
                    /Destination:\s*([\S\s]+\.live_chat\.json)/.test(eventData)
                ) {
                    // get data json filename
                    let [, filename] = eventData.match(/Destination:\s*([\S\s]+\.live_chat\.json)/);
                    console.log(filename)

                    // set file pool
                    if (!this.livechatRawPool.has(vID)) {
                        this.livechatRawPool.set(vID, { filename, indexOfLine: 0 });
                    }

                    // set working video id
                    this.cacheStreamID = vID;
                }
            })
            .on('error', (error) => {
                // clear file pool
                if (this.livechatRawPool.has(vID)) {
                    this.livechatRawPool.delete(vID);
                }

                // disable working video id
                this.cacheStreamID = null;

                // // delete video data
                // this.streamList.delete(vID);

                if (this.interval) { clearTimeout(this.interval); }

                // log
                if (error.toString().includes('members-only')) {
                    if (!memberOnly) {
                        // retry with cookie
                        this.traceStreamChatByYtdlp({ vID, memberOnly: true });
                        // get video & set member only flag
                        if (this.streamList.has(vID)) {
                            this.streamList.get(vID).memberOnly = true;
                        }
                    }
                } else {
                    console.error(error);
                }
            })
            .on('close', () => {
                // clear file pool
                if (this.livechatRawPool.has(vID)) {
                    this.livechatRawPool.delete(vID);
                }

                // disable working video id
                this.cacheStreamID = null;

                // delete video data
                this.streamList.delete(vID);

                if (this.interval) { clearTimeout(this.interval); }

                // log
                console.log(`ytDlpWrap all done`);
            }); //*/

        this.interval = setTimeout(() => this.readStreamChatFile(), 1000);


        // get chat data
    }
    async readStreamChatFile() {

        for (let [vID, livechatRaw] of this.livechatRawPool) {
            let { filename, indexOfLine } = livechatRaw;

            // check file exist
            if (!fs.existsSync(`${filename}.part`)) { continue; }

            // file read stream
            let fileStream = fs.createReadStream(`${filename}.part`, 'utf8');
            const rl = require('readline').createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let i = -1;
            for await (const line of rl) {
                ++i;
                if (i < indexOfLine) { continue; }

                // line to json
                let chatItem;
                try {
                    ++livechatRaw.indexOfLine;
                    chatItem = JSON.parse(line);
                } catch (e) { continue; }

                // get livechat object
                // try {
                // get main object
                let actions = chatItem.replayChatItemAction.actions[0];
                let item =
                    actions.addChatItemAction?.item ||            // normal chat
                    actions.addLiveChatTickerItemAction?.item ||  // super chat
                    actions.addBannerToLiveChatCommand?.bannerRenderer.liveChatBannerRenderer.contents;     // banner

                // check event type, pick normal chat
                let renderer = item?.liveChatTextMessageRenderer || item?.liveChatPaidMessageRenderer;
                // 'liveChatViewerEngagementMessageRendere', 'liveChatMembershipItemRenderer',
                // 'liveChatTickerSponsorItemRenderer',      'liveChatPaidMessageRenderer',
                // 'liveChatTickerPaidMessageItemRenderer',  'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer',
                // 'liveChatPaidStickerRendere',             'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer'
                if (!renderer) { continue; }


                // set result
                let auDetails = {
                    channelId: renderer.authorExternalChannelId,
                    channelUrl: `http://www.youtube.com/channel/${renderer.authorExternalChannelId}`,
                    displayName: renderer.authorName.simpleText,
                    isChatModerator: false, isChatOwner: false,
                    isChatSponsor: false, isVerified: false,
                    sponsorLevel: 0,
                    profileImageUrl: '',
                    timestampText: renderer.timestampText?.simpleText || null
                }
                // user level
                let authorBadges = renderer.authorBadges || [];
                for (let badge of authorBadges) {
                    let tooltip = badge?.liveChatAuthorBadgeRenderer.tooltip;

                    if (tooltip.includes('ember')) {
                        auDetails.isChatSponsor = true;
                        switch (tooltip) {
                            case 'New member': { auDetails.sponsorLevel = 1; } break;
                            case 'Member (1 month)': { auDetails.sponsorLevel = 2; } break;
                            case 'Member (2 months)': { auDetails.sponsorLevel = 3; } break;
                            case 'Member (6 months)': { auDetails.sponsorLevel = 4; } break;
                            case 'Member (1 year)': { auDetails.sponsorLevel = 5; } break;
                            case 'Member (2 years)': { auDetails.sponsorLevel = 6; } break;
                            default: {
                                auDetails.sponsorLevel = -1;
                                console.log(`[MC3] tooltip`, tooltip);
                            } break;
                        }
                    }
                    else if (tooltip == 'Verified') { auDetails.isVerified = true; }
                    else if (tooltip == 'Moderator') { auDetails.isChatModerator = true; }
                    else if (tooltip == 'Owner') { auDetails.isChatOwner = true; }
                }
                // user icon
                let thumbnails = renderer.authorPhoto?.thumbnails || [];
                auDetails.profileImageUrl = thumbnails.pop()?.url;
                // message
                let runs = renderer.message?.runs || [];
                let emojis = new Map();
                let message = '';
                for (let { text, emoji } of runs) {
                    if (text) { message += text; }
                    if (emoji) {
                        let name;

                        if (emoji.isCustomEmoji) {
                            // get emoji shortcuts
                            for (let term of emoji.searchTerms) {
                                name = term;
                                // discord emoji name rule
                                if (/^[A-Za-z0-9_]+$/.test(name)) { break; }
                            }
                            // get emoji image
                            let thumbnails = emoji.image?.thumbnails || [];
                            let url = thumbnails.pop()?.url;

                            emojis.set(name, url);

                            name = `:${name}:`;
                        } else {
                            name = emoji.emojiId;
                        }
                        message += ` ${name} `;
                    }
                }
                // SC
                let superchat = renderer.purchaseAmountText?.simpleText || '';
                // callback
                await mainMcCore.onLiveChat(this.holoChannelID, auDetails, message, superchat, emojis);
            }
        }

        this.interval = setTimeout(() => this.readStreamChatFile(), 500);
    }

    destroy() {
        if (this.interval) { clearTimeout(this.interval); }
        if (this.ytDlpController) { this.ytDlpController.abort(); }
    }
}

class McGuildCore {
    client = null;
    dcPushEmbed = async () => { };

    guildID = '';

    holoChannelID = '';
    expiresKey = '';

    memberRoleID = '';
    logChannelID = '';
    streamChannelID = '';
    memberChannelID = '';
    constructor({ holoChannelID, expiresKey, memberRoleID, logChannelID, streamChannelID, memberChannelID }, { client, gID }) {
        this.client = client;
        this.guildID = gID;

        this.holoChannelID = holoChannelID;
        this.expiresKey = expiresKey;
        this.memberRoleID = memberRoleID;
        this.logChannelID = logChannelID;
        this.streamChannelID = streamChannelID;
        this.memberChannelID = memberChannelID;
    };

    guild = null;
    memberRole = null;
    async init() {

        this.guild = await this.client.guilds.fetch(this.guildID);
        this.memberRole = await this.guild.roles.fetch(this.memberRoleID);

        let channel = await this.client.channels.fetch(this.logChannelID);
        if (channel) {
            this.dcPushEmbed = async (embed) => { return await channel.send({ embeds: [embed] }).catch(console.log); };
        } else {
            this.dcPushEmbed = (embed) => { console.log(embed.description || embed.data.description); };
        }

        await this.checkExpiresUser();
    }

    // check user role / membership expires
    async checkExpiresUser() {
        mclog('[MC3] core.checkExpiresUser');
        let pgData = [];

        // get discord users cache
        await this.guild.members.fetch({ force: true }).catch(console.log);

        pgData = (await Pg.listUserData())?.rows || [];
        mclog(`[MC3] Pg.listUserData`);
        for (let pgUser of pgData) {
            // pgUser = { discord_id: '244255110572670987', youtube_id: 'UCgUpDIQ7Cq4kJETqZhGk7Kg', ssrb_expires: '0', kzmi_expires: '0' }

            let dID = pgUser.discord_id;
            let userExpires = pgUser[this.expiresKey];
            if (userExpires == 0) { continue; }

            // get user data in guild
            let dcUser = this.guild.members.cache.get(dID);
            if (!dcUser) {
                // mclog(`[MC3] User <@${dID}> not in guild <${this.guild}>`);
                continue;
            }

            // check user level
            const isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);
            const isExpiredUser = (userExpires <= Date.now());

            if (isExpiredUser) {
                Pg.updateExpires(dID, this.expiresKey, 0);

                if (isSpecalUser) {
                    mclog(`[MC3] User <@${dID}> expired, Remove role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`認證過期, 刪除身分組(${this.memberRole}): ${dcUser.user.tag} ${dcUser.toString()}`));
                    dcUser.roles.remove(this.memberRole).catch(console.log);
                }
                // else { mclog(`[MC3] User <@${dcUser.user.tag}> in guild without role <${this.memberRole.name}>.`); }
            } else {
                if (!isSpecalUser) {
                    mclog(`[MC3] User <@${dID}> without role, Add role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(`確認期限, 恢復身分組(${this.memberRole}): ${dcUser.user.tag} ${dcUser.toString()}`));
                    dcUser.roles.add(this.memberRole).catch(console.log);
                }
                // else { mclog(`[MC3] User <@${dcUser.user.tag}> in guild with role <${this.memberRole.name}>.`); }
            }
        }
    }

    // let auDetails = {
    //     channelId: renderer.authorExternalChannelId,
    //     channelUrl: `http://www.youtube.com/channel/${renderer.authorExternalChannelId}`,
    //     displayName: renderer.authorName.simpleText,
    //     isChatModerator: false, isChatOwner: false,
    //     isChatSponsor: false, isVerified: false,
    //     sponsorLevel: 0,
    //     profileImageUrl: ''
    // }

    mamberCache = new Map();

    async onLiveChat(gID, auDetails, message, superchat) {

        let youtubeID = auDetails.channelId;
        let result = await Pg.getDataByYoutubeID(youtubeID);

        let pgUser = ((result)?.rows || [null])[0];
        if (!pgUser) {
            // mclog(`[MC3] User not in database: ${auDetails.displayName}`);
            return;
        }

        let dID = pgUser.discord_id;
        let dcUser = this.guild.members.cache.get(dID);
        if (!dcUser) {
            // mclog(`[MC3] User <@${dID}> not in guild <${this.guild}>`);
            return;
        }

        // check user level
        let isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);
        let isChatSponsor = (auDetails.isChatSponsor || auDetails.isChatOwner || auDetails.isChatModerator);

        if (this.mamberCache.has(youtubeID)) {
            // skip if sponsor statu didnt change
            if (this.mamberCache.get(youtubeID) == isChatSponsor) {
                return;
            }

            // sponsor statu changed, set user role again
        } else {
            // set sponsor statu flag to cache space
            this.mamberCache.set(youtubeID, isChatSponsor);
        }

        // set user role
        if (isChatSponsor) {
            await Pg.updateExpires(dID, this.expiresKey);

            if (isSpecalUser) {
                mclog(`[MC3] User <${auDetails.displayName}> in guild <${this.guild}>, Update Expires <${this.expiresKey}>!`);
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Aqua).setDescription(`認證成功, 延展期限: ${dcUser.user.tag} ${dcUser.toString()}`));
            }
            if (!isSpecalUser) {
                mclog(`[MC3] User <${auDetails.displayName}> in guild <${this.guild}>, Add Role!`);
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(`認證成功, 新增身分組(${this.memberRole}): ${dcUser.user.tag} ${dcUser.toString()}`));
                dcUser.roles.add(this.memberRole).catch(console.error);
            }
        }
        if (!isChatSponsor) {
            if (pgUser[this.expiresKey] != 0) { Pg.updateExpires(dID, this.expiresKey, 0); }

            if (isSpecalUser) {
                mclog(`[MC3] User <${auDetails.displayName}> in guild <${this.guild}>, Remove role!`);
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`非會員, 刪除身分組(${this.memberRole}): ${dcUser.user.tag} ${dcUser.toString()}`));
                dcUser.roles.remove(this.memberRole).catch(console.log);
            }
            // if (!isSpecalUser) {
            //     mclog(`[MC3] User <${auDetails.displayName}> in guild <${this.guild}>.`);
            //     this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Orange).setDescription(`${pgUser[this.expiresKey] > 0 ? '申請無效, 清除申請' : '申請無效'}: ${dcUser.user.tag} ${dcUser.toString()}`));
            // }
        }

        // console.log(
        //     `[Livechat ${this.holoChannelID}]`,
        //     (auDetails.isChatModerator ? '🔧' : '　'), (auDetails.isChatOwner ? '⭐' : '　'), (auDetails.isVerified ? '✔️' : '　'), (auDetails.isChatSponsor ? '🤝' : '　'),
        //     // (auDetails.isChatModerator ? 'T' : '_'), (auDetails.isChatOwner ? 'O' : '_'), (auDetails.isVerified ? 'V' : '_'), (auDetails.isChatSponsor ? 'S' : '_'),
        //     `<${auDetails.displayName}>`,
        //     superchat,
        //     message,
        //     (auDetails.profileImageUrl ? '' : '[-] Photo'),
        //     (auDetails.channelId ? '' : '[-] cID')
        // );

    }

    // command
    get301Url() {
        return `${redirectUri}/member/${this.client.user.id}/${this.expiresKey}`;
    }
    getAuthorizeUrl() {
        let url = `https://discord.com/api/oauth2/authorize?`
            + `client_id=${this.client.user.id}&`
            + `state=${this.client.user.id}${this.expiresKey}&`
            + `redirect_uri=${encodeURIComponent(redirectUri + "/callback")}&`
            + `response_type=code&`
            + `scope=identify%20connections`;
        return url;
    }
    cmdStreamList() {
        let upcomingList = [];
        let liveList = [];
        // holoChannelID

        for (let [vID, video] of mainMcCore.ytChannelCores.get(this.holoChannelID).streamList) {
            // get cache
            mclog(`[MC3] ${vID} ${video ? 'Object' : video}`);
            if (!video) { continue; }

            // check stream start time
            let status = video.snippet.liveBroadcastContent;
            mclog(`[MC3] ${status.padStart(12, ' ')} <${video.snippet.title}>`);

            // get video data
            let description = video ? video.snippet.title : vID;
            if (status == 'upcoming') {
                upcomingList.push(`[${description}](http://youtu.be/${vID})`);
            } else if (status == 'live') {
                liveList.push(`[${description}](http://youtu.be/${vID})`);
            }

            // // get video data
            // let description = video ? video.snippet.title : vID;
            // streamList.push(`[${description}](http://youtu.be/${vID})`);
        }

        return [].concat(['直播中:'], liveList, ['待機台:'], upcomingList);
    }
    async changeChannelName() {
        let channels = [this.streamChannelID, this.memberChannelID];
        let onLive = [false, false];

        let ytCore = mainMcCore.ytChannelCores.get(this.holoChannelID);

        let video = ytCore.streamList.get(ytCore.cacheStreamID) || null;
        if (!video) { }
        else {
            // onLive
            onLive = [!video.memberOnly, video.memberOnly];
        }

        for (let i = 0; i < 2; ++i) {
            const channel = await this.client.channels.fetch(channels[i]);

            // check channel permissions
            let permissions = channel.permissionsFor(channel.guild.members.me);
            if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
                mclog('[MC3] Missing Permissions: MANAGE_CHANNELS');
                continue;
            }

            let channelStatus = (onLive[i] ? '🔴' : '⚫');
            let channelName = `${channelStatus}${channel.name.replace(/^[🔴⚫]+/, '')}`;

            if (channel.name != channelName) {
                console.log(`Set Channel's name to ${channelName}`)
                channel.setName(channelName)
                    .then(newChannel => console.log(`Channel's name now is ${newChannel.name}`))
                    // .catch(console.log);
                    .catch((error) => {
                        console.log(this.client);
                        console.log(channel);
                        console.log(permissions.has(PermissionFlagsBits.ManageChannels));
                        console.log(error);
                    });
            }
        }
    }

    liveChatCache = new Set();

    async sendChatMessage(auDetails, message, superchat, isMemberOnly) {
        let vID = mainMcCore.ytChannelCores.get(this.holoChannelID).cacheStreamID;
        let now = new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' });

        let hash = md5(`${vID}${auDetails.channelId}${message}`.trim());
        if (this.liveChatCache.has(hash)) { return; }
        this.liveChatCache.add(hash);

        const cID = isMemberOnly ? this.memberChannelID : this.streamChannelID;
        const channel = await this.client.channels.fetch(cID);

        let embed = new EmbedBuilder();

        if (auDetails.isChatOwner) { embed.setColor(0xFFD600); }
        else if (auDetails.isChatModerator) { embed.setColor(0x5F84F1); }
        else if (auDetails.isChatSponsor) { embed.setColor(0x13B56E); }
        let url;
        if (auDetails.timestampText) {
            let timeText = '00:00:' + auDetails.timestampText;
            let [, hrs, min, sec] = timeText.match(/(\d+):(\d+):(\d+)$/) || [, '00', '00', '00'];
            timeText = `${hrs}h${min}m${sec}s`.replace(/^[0hm]+/, '');

            url = `https://youtu.be/${vID}&t=${timeText}`;
        }

        embed.setAuthor({
            name: auDetails.displayName,
            iconURL: auDetails.profileImageUrl, url
        })
        if (message) { embed.setDescription(message); }
        embed.setFooter({ text: `${vID} ${now}` });

        channel.send({ embeds: [embed] }).catch(console.log);
    }
}

class MainMemberCheckerCore {
    interval = null;
    guild = null;

    constructor() { this.init(); };
    initialization = 0;

    async init(client) {

        if (client && client.user.id != `713624995372466179`) {
            this.client = client;
            this.guild = await client.guilds.fetch('713622845682614302');
        }

        if (this.initialization != 0) {
            while (this.initialization != 2) {
                await sleep(500);
            }
            return;
        }
        this.initialization = 1;

        if (fs.existsSync(ytdlpPath)) { fs.unlinkSync(ytdlpPath); }
        // Download the youtube-dl binary for the given version and platform to the provided path.
        // By default the latest version will be downloaded to "./youtube-dl" and platform = os.platform().
        // await YoutubeDlWrap.downloadFromGithub('youtube-dl', '2023.03.04.1', '');
        await YTDlpWrap.downloadFromGithub().catch(() => { });

        // cookie.txt
        if (fs.existsSync('./cookies.txt') && !fs.existsSync('./cookies.enc')) {
            const key = process.env.JSONKEY;
            let rawData = fs.readFileSync('./cookies.txt', 'utf8');
            let encData = crypto.encrypt(rawData, key);
            fs.writeFileSync('./cookies.enc', encData);

        } else if (!fs.existsSync('./cookies.txt') && fs.existsSync('./cookies.enc')) {
            const key = process.env.JSONKEY;
            let encData = fs.readFileSync('./cookies.enc', 'utf8');
            let decData = crypto.decrypt(encData, key);
            fs.writeFileSync('./cookies.txt', decData);
        }

        await Pg.init();

        this.interval = setTimeout(this.timeoutMethod, 2000);

        const livechatFiles = fs.readdirSync('.').filter(file => file.includes('.live_chat.'));
        for (const file of livechatFiles) {
            fs.unlinkSync(file);
        }

        this.initialization = 2;
    }

    async onLiveChat(holoChannelID, auDetails, message, superchat, customEmojis) {
        // console.log(
        //     `[Livechat ${holoChannelID}]`,
        //     (auDetails.isChatModerator ? '🔧' : '　'), (auDetails.isChatOwner ? '⭐' : '　'), (auDetails.isVerified ? '✔️' : '　'), (auDetails.isChatSponsor ? '🤝' : '　'),
        //     // (auDetails.isChatModerator ? 'T' : '_'), (auDetails.isChatOwner ? 'O' : '_'), (auDetails.isVerified ? 'V' : '_'), (auDetails.isChatSponsor ? 'S' : '_'),
        //     `<${auDetails.displayName}>`,
        //     superchat,
        //     message,
        //     (auDetails.profileImageUrl ? '' : '[-] Photo'),
        //     (auDetails.channelId ? '' : '[-] cID')
        // );

        // get guild core
        for (let gCore of this.guildCores) {
            if (gCore.holoChannelID != holoChannelID) { continue; }

            // check guild role by livechat
            await gCore.onLiveChat(gCore.guildID, auDetails, message, superchat)


            // check special livechat
            if (auDetails.isChatOwner || auDetails.isChatModerator) {

                // fix emojis
                if (customEmojis && customEmojis.size > 0) {
                    let guildEmojis = await this.guild.emojis.fetch();

                    for (let [name, url] of customEmojis) {
                        // check emoji in guild or not
                        let emoji = null;
                        let md5Name = /^[A-Za-z0-9_]+$/.test(name) ? name : md5(name);
                        for (let [eID, _emoji] of guildEmojis) {
                            if (_emoji.name == md5Name) { emoji = _emoji; break; }
                        }

                        if (!emoji) {
                            // emoji not in guild

                            // check guild emoji volume, limit is 50 without nitro
                            if (guildEmojis.size >= 50) {

                                // emoji full, delete oldest emoji witch from bot
                                for (let [eID, emoji] of guildEmojis) {
                                    if (emoji.author.bot) {
                                        await emoji.delete()
                                            .then(() => { mclog('[MC3] delete emoji.'); })
                                            .catch(console.log);
                                        break;
                                    }
                                }
                            }

                            // create new emoji
                            emoji = await this.guild.emojis.create({ attachment: url, name: md5Name })
                                .catch((e) => { console.log(e.message); });
                            // mclog(`[MC3] create emoji ${emoji}`);
                        }

                        if (!emoji) { continue; }   // some error?
                        // now emoji in guild
                        // replace message emoji string
                        message = message.replaceAll(`:${name}:`, `<:${emoji.name}:${emoji.id}>`);
                        // next custom emoji
                    }
                }

                // yt livechat to discord message
                // get ytCore
                let ytCore = this.ytChannelCores.get(holoChannelID);
                // check target channel
                let isMemberOnly = ytCore.cacheStreamMemberOnly();

                const gCores = this.guildCores.filter((gCore) => (gCore.holoChannelID == holoChannelID));
                for (let gCore of gCores) {
                    // get channel from config ID
                    gCore.sendChatMessage(auDetails, message, superchat, isMemberOnly);
                }
            }
        }
    }

    // MemberCheckerCore by channel
    // 2 apikey for 1 channel
    ytChannelCores = new Map();
    async addYoutubeChannel(config) {
        if (!config.holoChannelID) { return; }
        if (this.ytChannelCores.has(config.holoChannelID)) { return; }

        let newCore = new McChannelCore(config, async (holoChannelID, auDetails, message, superchat) => await this.onLiveChat(holoChannelID, auDetails, message, superchat));
        this.ytChannelCores.set(config.holoChannelID, newCore);

        if (!config.expiresKey) { return; }
        await Pg.initColumn(config.expiresKey);
    }
    guildCores = [];
    async addGuild(config, { client, gID }) {
        let newCore = new McGuildCore(config, { client, gID });
        await newCore.init();
        this.guildCores.push(newCore);
    }

    // get stream (live/upcoming) videos
    async getVideoLists() {
        // get api object
        for (let [holoChannelID, core] of this.ytChannelCores) {
            await core.getVideoList();
        }
    }

    // clock
    timeoutMethod = () => {
        const now = Date.now();
        // get trim time
        const nowTime = (now % 1000 > 500) ? (now - (now % 1000) + 1000) : (now - (now % 1000));
        // check every 1sec
        const nextTime = nowTime + 1000;
        const offsetTime = nextTime - now;
        this.interval = setTimeout(this.timeoutMethod, offsetTime);

        const nowDate = new Date(nowTime);
        const hours = nowDate.getHours();
        const minutes = nowDate.getMinutes();
        const seconds = nowDate.getSeconds();

        this.clockMethod({ hours, minutes, seconds });
    }

    async clockMethod({ hours, minutes, seconds }) {

        // check stream task list at XX:03:00
        if (![3, 4, 5, 7, 9, 11].includes(hours) &&
            minutes == 3 && seconds == 0) {
            this.getVideoLists();
        }

        // check channel name
        if (seconds % 10 == 0) {
            for (let [holoChannelID, ytCore] of this.ytChannelCores) {
                if (ytCore.cacheStreamID) { continue; }

                for (let [vID, video] of ytCore.streamList) {
                    let _video = video;
                    // check upcoming
                    if (video.snippet.liveBroadcastContent == 'upcoming') {
                        // skip freechat
                        let startTime = video.liveStreamingDetails?.scheduledStartTime || 0;
                        if (startTime && Date.parse(startTime) > Date.now()) { continue; }

                        // now on live time, recheck stream if status is upcoming
                        // get REALLY video data from API
                        _video = await ytCore.youtube.getVideoStatus(vID);

                        // API error, quotaExceeded
                        if (!_video.snippet) {
                            // delete nan data video
                            if (ytCore.streamList.has(vID)) {
                                ytCore.streamList.delete(vID);
                            }
                        }

                        _video.memberOnly = ytCore.streamList.get(vID)?.memberOnly;
                        ytCore.streamList.set(vID, _video);
                    }

                    if (_video.snippet.liveBroadcastContent == 'live') {
                        ytCore.traceStreamChatByYtdlp({ vID });
                        // ytCore.traceStreamChat({ vID });
                    }
                }
            }

            for (let gCore of this.guildCores) {
                gCore.changeChannelName();
            }
        }
    }

    destroy() {
        for (let [holoChannelID, core] of this.ytChannelCores) {
            core.destroy();
        }
        clearTimeout(this.interval);
    }
}
let mainMcCore = new MainMemberCheckerCore();


class crypto {
    // const ENCRYPTION_KEY = 'Put_Your_Password_Here'.padEnd(32, "_");
    // const ENCRYPTION_KEY = Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64')
    // const ENCRYPTION_KEY = process.env.JSONKEY;

    static decrypt(text, key) {
        if (!text) return null;
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = require('crypto').createDecipheriv('aes-256-ctr', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    static encrypt(text, key) {
        if (!text) return null;
        let iv = require('crypto').randomBytes(16);
        let cipher = require('crypto').createCipheriv('aes-256-ctr', Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
}





module.exports = {
    name: 'member checker v3',
    description: "check who is SSRB",


    async execute(message, pluginConfig, command, args, lines) {

        if (!command) { return false; }
        const { client, guild, channel } = message;

        const gCores = mainMcCore.guildCores.filter((gCore) => (gCore.guildID == guild.id));
        if (gCores.length <= 0) { return false; }

        for (let gCore of gCores) {
            const isLogChannel = (channel.id == gCore.logChannelID);

            if (isLogChannel && command == 'mcdebug') {
                mclog = (mclog == console.log) ?
                    (() => { }) : console.log;
                return;
            }

            if (isLogChannel && command == 'user') {
                let dID = args[0];
                if (!dID) {
                    channel.send({ content: `!user <user discord ID>` });
                    continue;
                }

                let data = ((await Pg.getDataByDiscordID(dID.trim()))?.rows || [])[0];
                console.log(data)

                channel.send({ content: `${dID}\n${JSON.stringify(data, null, 2)}` });
                continue;
            }

            if (command == 'member') {
                channel.send({ content: gCore.get301Url() });
                continue;
            }

            if (command == 'stream') {
                // force update all stream list cache by admin

                let ytCore = mainMcCore.ytChannelCores.get(gCore.holoChannelID);
                if (regUrl.test(args[0])) {
                    // get vID
                    const [, vID] = args[0].match(regUrl);

                    // get video data from API
                    let video = await ytCore.youtube.getVideoStatus(vID)
                    // update cache data
                    if (video && video.snippet && video.snippet.channelId == ytCore.holoChannelID) {

                        if (ytCore.streamList.has(vID)) {
                            // update liveBroadcastContent
                            video.memberOnly = ytCore.streamList.get(vID)?.memberOnly;
                        }
                        // cache video data
                        ytCore.streamList.set(vID, video);

                        gCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.DarkGold).setDescription(`手動新增直播清單`));
                    }
                } else if (isLogChannel) {
                    await ytCore.getVideoList();
                    gCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.DarkGold).setDescription(`更新直播清單`));
                }

                // get response
                let streamList = gCore.cmdStreamList();

                let embed = new EmbedBuilder().setColor(Colors.DarkGold);
                if (streamList.length <= 0) { embed.setDescription(`目前沒有直播台/待機台`); }
                else { embed.setDescription(streamList.join('\n')); }
                embed.setFooter({ text: gCore.holoChannelID });

                channel.send({ embeds: [embed] });

                continue;
            }

            if (command == 'freechat') {
                let ytCore = mainMcCore.ytChannelCores.get(gCore.holoChannelID);

                for (let [vID, video] of ytCore.streamList) {
                    // get cache
                    if (!video) { continue; }

                    // check stream start time
                    let status = video.snippet.liveBroadcastContent;

                    // get video data
                    if (status != 'upcoming') { continue; }

                    ytCore.traceStreamChat({ vID });
                }

                continue;
            }

            if (command == 'test' && message.author?.id == '353625493876113440') {
                let ytCore = mainMcCore.ytChannelCores.get('UCUKD-uaobj9jiqB-VXt71mA');
                ytCore?.traceStreamChatByYtdlp({ vID: args[0] || 'Vx1K89idggs' });
                return;
            }
        }
    },

    async setup(client) {

        for (let gID of client.guildConfigs.keys()) {

            const pluginConfig = client.getPluginConfig(gID, 'memberChecker3');
            if (!pluginConfig) { continue; }

            await mainMcCore.init(client);

            for (let config of pluginConfig) {
                // get guild object
                const guild = client.guilds.cache.get(gID);
                if (!guild) { continue; }    // bot not in guild
                if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) { console.log(`Missing Permissions: MANAGE_ROLES in <${gID}>`); continue; }
                if (!guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) { console.log(`Missing Permissions: SEND_MESSAGES in <${gID}>`); continue; }



                await mainMcCore.addYoutubeChannel(config);
                await mainMcCore.addGuild(config, { client, gID });
            }
        }
        // // test code
        // await sleep(1000)
        // mainMcCore.ytChannelCores.get(`UCUKD-uaobj9jiqB-VXt71mA`).traceStreamChatByYtdlp({ vID: 'Vx1K89idggs' });

        client.once('close', () => {
            // offline msg
            mainMcCore.destroy();
        });
    },

    idleCheck() {
        for (let [holoChannelID, core] of mainMcCore.ytChannelCores) {
            if (core.cacheStreamID != null) { return false };
        }
        return true;
    }
}



// express
const app = require('../server.js').app;
app.all(`/member/:botid/:ekey`, async (req, res) => {
    let botID = req.params.botid;
    let expiresKey = req.params.ekey;

    const gCore = mainMcCore.guildCores.find((gCore) => (gCore.client.user.id == botID && gCore.expiresKey == expiresKey));

    if (!gCore) {
        res.send(`不明的參數組! 請聯絡管理員或製作者\n${botID}, ${expiresKey}`);
        return;
    }

    res.redirect(301, gCore.getAuthorizeUrl());
    return;
});

app.all('/callback', async (req, res) => {
    const param = req.query.state || '';
    const [, botID, expiresKey] = (param.match(/^(\d{17,19})(\S+)$/) || [, 'null', 'null']);

    const gCores = mainMcCore.guildCores.filter((gCore) => (gCore.client.user.id == botID && gCore.expiresKey == expiresKey));

    if (gCores.length <= 0) {
        res.status(404).send(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        console.log(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        return;
    }

    let gCore = gCores[0];
    try {
        let headers = { "Content-Type": "application/x-www-form-urlencoded" };
        let body = [
            `client_id=${gCore.client.user.id}`,
            `&client_secret=${gCore.client.mainConfig.clientSecret}`,
            '&grant_type=authorization_code',
            `&code=${req.query.code}`,
            `&redirect_uri=${redirectUri}/callback`,
            '&scope=connections'
        ].join('');

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
        let cID = null;         // YT channel ID
        let dID = null;         // Discord user ID
        let username = null;    // Discord user name
        let tag = null;         // Discord user tag number

        if (identify.body) {
            dID = identify.body.id;
            username = identify.body.username;
            tag = identify.body.discriminator;
        }

        // get discord user connections data
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

        // check database
        pgData = (await Pg.getDataByDiscordID(dID))?.rows || [];
        if (pgData.length <= 0) {
            await Pg.creatData(dID, cID);
        } else if (pgData[0].youtube_id != cID) {
            await Pg.updateYoutubeID(dID, cID);
        }

        // get result
        let userData = await Pg.getDataByDiscordID(dID);
        let html = [
            `User: ${username}`,
            `Youtube channel: https://www.youtube.com/channel/${cID}`,
        ];
        if (parseInt(userData[gCore.expiresKey]) == 0) {
            html.push(`expires in time: ${new Date(parseInt(userData[gCore.expiresKey])).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);
        } else {
            html.push(`expires in time: waiting Authorize`);
        }
        res.send(html.join('<br>'));

        for (gCore of gCores) {
            // log
            gCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.Green).setDescription(`申請完成: ${username}@${tag} <@${dID}>`));
        }
        return;
    } catch (e) {
        console.log(e)
        res.send(e.message);
        return;
    }

    // {
    //     identify.body = {
    //         accent_color: null, avatar: '0b69434e070a29d575737ed159a29224',
    //         banner: null, banner_color: null, discriminator: '8676', flags: 0,
    //         id: '353625493876113440', locale: 'zh-TW', mfa_enabled: true,
    //         public_flags: 0, username: 'K.T.710'
    //     }

    //     connections.body[0] = {
    //         friend_sync: false, id: 'UC-JsTXzopVL28gQXEUV276w', name: 'K.T.',
    //         show_activity: true, type: 'youtube', verified: true, visibility: 1
    //     }
    // }
});