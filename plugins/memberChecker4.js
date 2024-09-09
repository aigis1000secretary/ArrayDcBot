
// node base
const fs = require('fs');
const compressing = require('compressing');
const debug = fs.existsSync("./.env");
const isLinux = (require("os").platform() == 'linux');

// yt-dlp-wrap
const { default: YTDlpWrap } = require("yt-dlp-wrap");
const ytdlpPath = (isLinux ? './yt-dlp' : '.\\yt-dlp.exe');

// method
let mclog = debug ? console.log : () => { };
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)); };
const md5 = (source) => require('crypto').createHash('md5').update(source).digest('hex');

// discord
const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, Colors } = require('discord.js');


// http request
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);
const post = util.promisify(request.post);

// discord webhook
const redirectUri = process.env.HOST_URL;
// API endpoint
const API_ENDPOINT = 'https://discord.com/api';



// ****** youtube api ******

// url regex
const regUrl = /(?:https?:\/\/)(?:(?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(?:\/(?:watch|v|embed|shorts|live|attribution_link(?:[\?&][^\/&]+)*))?\/(?:(?:(?:watch\?(?:[^\/&]*&)*)?v=)|(?:multiview\/\w{4}))?([\w-]{11})/;

class YoutubeAPI {
    holoChannelID = 'holoChannelID';
    apiKey = [];
    quotaExceeded = [false, false];

    constructor(config = null) { if (config == null) { return; } this.init(config); };
    init({ holoChannelID, apiKey }) {
        this.holoChannelID = holoChannelID;
        this.apiKey = apiKey;
    };

    // youtube api
    async getVideoSearch({ channelId = this.holoChannelID, eventType, order, publishedAfter, memberOnly } = {}) {
        mclog(`[MC4] youtube.getVideoSearch( ${channelId}, ${eventType} )`);
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
            //         kind: 'youtube#searchResult', etag: '07WUPWqVpujODorWqJyH8Zs29PI', id: { kind: 'youtube#video', videoId: '3gH2la1zZ3A' },
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
        mclog(`[MC4] youtube.getVideoStatus( ${vID} )`);
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
                console.log(`[MC4] video not found. ${vID}`);
                // return {
                //     code: 200, message: 'video not found', reason: 'video not found',
                //     variabale: { vID }
                // };
                return null;
            }

            const result = data.items[0];
            {   // get isMemberOnly by  yt.lemnoslife.com
                // https://yt.lemnoslife.com/videos?part=isMemberOnly&id=U_7Pn04cip4
                const url = 'https://yt.lemnoslife.com/videos';
                const params = {
                    part: 'isMemberOnly',
                    id: vID
                }
                const res = await get({ url, qs: params, json: true });

                result.memberOnly = ((res.body?.items || [])[0] || {}).isMemberOnly ? 1 : 0;
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
    async getVideoIsMemberOnly(vID) {
        try {
            // get isMemberOnly by  yt.lemnoslife.com
            // https://yt.lemnoslife.com/videos?part=isMemberOnly&id=U_7Pn04cip4
            const url = 'https://yt.lemnoslife.com/videos';
            const params = {
                part: 'isMemberOnly',
                id: vID
            }
            const res = await get({ url, qs: params, json: true });

            const memberOnly = ((res.body?.items || [])[0] || {}).isMemberOnly ? 1 : 0;

            return memberOnly;

        } catch (error) {
            return null;
        }
    };

    // youtube api by yt-dlp
    async getVideoSearchByYtdlp({ channelId = this.holoChannelID, eventType, order, publishedAfter, memberOnly } = {}) {
        const ytDlpWrap = new YTDlpWrap(ytdlpPath);

        const playlistID = memberOnly ? channelId.replace(/^UC/, `UUMO`) : channelId.replace(/^UC/, `UU`);

        // start stream
        const command = [
            `https://youtube.com/playlist?list=${playlistID}`,
            `-O "%(id)s %(release_timestamp)s %(live_status)s %(channel_id)s %(title)s"`,
            `--skip-download`, `--no-warning`, `--ignore-no-formats`, `--flat-playlist`
        ];
        // if (debug) { console.log(`[ytDlpWrap] (${channelId})`); console.log(`yt-dlp ${command.join(' ')}`); }

        const stdout = await ytDlpWrap.execPromise(command, { shell: true, detached: false });

        let results = [];
        for (const _line of stdout.split('\n')) {
            const line = _line.trim();
            if (!line) { continue; }

            const [, _vID, releaseTimestamp, liveStatus, channelId] = line.match(/([\w-]{11}) ([NA\d]+) ([\w_]+) ([\w-_]+) /) || [];
            const title = line.replace(`${_vID} ${releaseTimestamp} ${liveStatus} ${channelId} `, '');   // in win32 title has encode error

            // check match data
            if (!_vID) { continue; }
            const liveBroadcastContent = (liveStatus == 'is_live' ? `live` : (liveStatus == 'is_upcoming' ? `upcoming` : 'none'));
            const scheduledStartTime = /^\d+$/.test(releaseTimestamp) ? new Date(parseInt(releaseTimestamp) * 1000).toISOString() : null;

            // check tule
            if (eventType && !eventType.includes(liveBroadcastContent)) { continue; }

            // set result ro youtube API format
            results.push({
                id: _vID,
                snippet: { channelId, title, liveBroadcastContent },
                liveStreamingDetails: { scheduledStartTime, activeLiveChatId: null },
                memberOnly
            });
        }

        mclog(`[ytDlpWrap] (${channelId}) getVideoSearch(memberOnly: ${memberOnly}), ${results.length} results`);
        return results;
    };
    async getVideoStatusByYtdlp(vID) {
        const ytDlpWrap = new YTDlpWrap(ytdlpPath);

        // start stream
        const command = [
            `https://youtu.be/${vID}`,
            `-O "%(id)s %(release_timestamp)s %(live_status)s %(channel_id)s %(availability)s %(title)s"`,
            `--skip-download`, `--no-warning`, `--ignore-no-formats`, `--flat-playlist`
        ];
        if (debug) { console.log(`[ytDlpWrap] (${vID})`); console.log(`yt-dlp ${command.join(' ')}`); }

        const stdout = await ytDlpWrap.execPromise(command, { shell: true, detached: false });

        let result = null;
        for (const _line of stdout.split('\n')) {
            const line = _line.trim();
            if (!line) { continue; }

            const [, _vID, releaseTimestamp, liveStatus, channelId, availability, title] = line.match(/([\w-]{11}) ([NA\d]+) ([\w_]+) ([\w-_]+) ([\w_]+) (.+)$/) || [];

            // check match data
            if (!_vID) { continue; }
            const liveBroadcastContent = (liveStatus == 'is_live' ? `live` : (liveStatus == 'is_upcoming' ? `upcoming` : 'none'));
            const scheduledStartTime = /^\d+$/.test(releaseTimestamp) ? new Date(parseInt(releaseTimestamp) * 1000).toISOString() : null;

            const memberOnly = (availability == 'public' ? 0 : (availability == 'subscriber_only' ? 1 : 2));

            // set result ro youtube API format
            result = {
                id: _vID,
                snippet: { channelId, title, liveBroadcastContent },
                liveStreamingDetails: { scheduledStartTime, activeLiveChatId: null },
                memberOnly
            };
        }

        mclog(`[ytDlpWrap] (${vID}) getVideoStatus`, result === null ? 'fail.' : 'done.');
        return result;
    }
}



// ****** database api ******
const { Pool } = require('pg');
const pgConfig = { connectionString: process.env.DATABASE_URL, ssl: false };
const pool = new Pool(pgConfig);
pool.connect().then(p => { p.end(); }).catch(console.error); // test connect
const memberTime = 1000 * 60 * 60 * 24 * 35;    // 1000 ms  *  60 sec  *  60 min  *  24 hr  *  35 days

class Pg {
    static dataCache = new Map();

    static async init() {
        // check table
        if ((await this.checkTable())?.rowCount == 0) {
            console.log(`init user_connections database!`);
            await this.creatTable();
        }

        // load data to cache
        const sql = `SELECT * FROM user_connections;`
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        if (res) {
            for (const pgUser of res.rows) {
                pgUser.discord_id = pgUser.discord_id.trim();
                pgUser.youtube_id = pgUser.youtube_id.trim();
                for (let key of Object.keys(pgUser)) { if (key.includes('_expires')) { pgUser[key] = parseInt(pgUser[key]); } }
                this.dataCache.set(pgUser.discord_id, pgUser);
            }
        }
    };

    static async backup(client) {
        if (this.dataCache.size < 300) { return; }

        const jsonFile = `./pgdbBackup.json`;
        const zipFile = `./pgdbBackup.zip`;

        if (fs.existsSync(jsonFile)) { fs.unlinkSync(jsonFile); }
        if (fs.existsSync(zipFile)) { fs.unlinkSync(zipFile); }

        const dataArray = [];
        for (const [key, pgUser] of this.dataCache) {
            dataArray.push(JSON.stringify(pgUser).replace(/,/g, ', ').replace('{', '{ ').replace('}', ' }'));
        }
        fs.writeFileSync(jsonFile, `[\r\n${dataArray.join(',\r\n')}\r\n]`);

        // get channel/message by id
        const channel = await client.channels.fetch(`872122458545725451`).catch(() => { return null; });
        if (!channel) { return; }
        const msg = await channel.messages.fetch({ message: `1055852678913196042`, force: true }).catch(() => { return null; });
        if (!msg) { return; }

        // zip db files
        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }))
            .replace(/[\/:]/g, '').replace(', ', '_');
        const filePath = `${nowDate}.zip`;
        await compressing.zip.compressFile(jsonFile, zipFile).catch(() => { });

        // upload zip file
        let files = [new AttachmentBuilder(zipFile, { name: zipFile })];
        await msg.edit({ files }).catch(console.log);

        fs.unlinkSync(jsonFile);
        fs.unlinkSync(zipFile);
    }

    static async initColumn(expiresKey) {
        // check column
        if (!await this.checkColumn(expiresKey)) {
            console.log(`init column <${expiresKey}>!`);
            await this.creatColumn(expiresKey);
        }

        // // update cache
        // for (const key of this.dataCache.keys()) {
        //     this.dataCache.get(key)[expiresKey] = '0';
        // }
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
            `youtube_id char(80) NOT NULL`,
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
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async listUserData() {
        return { rows: this.dataCache };

        // const sql = `SELECT * FROM user_connections;`
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
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
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
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
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async getDataByYoutubeID(youtubeID) {
        return { rows: Array.from(this.dataCache.values()).filter((pgUser) => (pgUser.youtube_id.includes(youtubeID))) };

        // const sql = [
        //     `SELECT * FROM user_connections`,
        //     `WHERE youtube_id='${youtubeID}';`
        // ].join(' ');
        // const res = await pool.query(sql).catch((error) => { console.log(error.message) });
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async creatData(discordID, youtubeID) {
        const sql = [
            `INSERT INTO user_connections (discord_id, youtube_id)`,
            `VALUES ('${discordID}', '${youtubeID}');`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => { console.log(error.message) });

        if (res) {
            const sql = [
                `SELECT * FROM user_connections`,
                `WHERE discord_id='${discordID}';`
            ].join(' ');
            const res2 = await pool.query(sql).catch((error) => { console.log(error.message) });
            if (res2) {
                for (const row of res2.rows) { row.discord_id = row.discord_id.trim(); }
                this.dataCache.set(discordID, res2.rows[0]);
            }
            return res2;
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



// ****** crypto method ******
class crypto {
    // const ENCRYPTION_KEY = 'Put_Your_Password_Here'.padEnd(32, "_");
    // const ENCRYPTION_KEY = Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64')
    // const ENCRYPTION_KEY = process.env.JSONKEY;
    static key = process.env.JSONKEY;

    static decrypt(text, key = crypto.key) {
        if (!text) return null;
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = require('crypto').createDecipheriv('aes-256-ctr', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    static encrypt(text, key = crypto.key) {
        if (!text) return null;
        let iv = require('crypto').randomBytes(16);
        let cipher = require('crypto').createCipheriv('aes-256-ctr', Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
}



// ****** emoji manager ******
class EmojiManager {

    guild = null;
    guildEmojis = new Map(); // [eID, _emoji]

    constructor(client) { if (!client) { return; } this.init(client); };
    async init(client) {
        // get KTG
        this.guild = await client.guilds.fetch('713622845682614302');
        this.guildEmojis = await this.guild.emojis.fetch();
    }

    // get or create emoji
    // return emoji of null
    async getEmoji(url, md5Name) {
        // try to find emoji with md5Name
        for (const [eID, emoji] of this.guildEmojis) {
            if (emoji.name == md5Name) { return emoji; }
        }
        // fail, create new emoji
        return await this.createEmoji(url, md5Name);
    }

    // create new emoji
    // return emoji of null
    async createEmoji(url, md5Name) {

        // check guild emoji volume, limit is 50 without nitro
        if (this.guildEmojis.size >= 50) {

            // emoji full, delete oldest emoji which from bot
            for (const [eID, emoji] of this.guildEmojis) {
                if (emoji.author.bot) {
                    await emoji.delete()
                        .then(() => { mclog('[MC4] delete emoji.'); })
                        .catch((e) => mclog(`[MC4] delete emoji fail: ${e.message}`));
                    this.guildEmojis = await this.guild.emojis.fetch();
                    if (this.guildEmojis.size < 50) { break; }
                }
            }
        }

        // create new emoji
        let emoji = await this.guild.emojis.create({ attachment: url, name: md5Name })
            .catch((e) => { mclog(e.message); return null; });
        // mclog(`[MC4] create emoji ${emoji}`);

        this.guildEmojis = await this.guild.emojis.fetch();

        setTimeout(() => { this.checkEmoji(md5Name); }, 500);
        return emoji;
    }

    checkEmoji(md5Name) {

        let foundEmoji = false;
        for (const [eID, emoji] of this.guildEmojis) {

            if (emoji.name != md5Name || !emoji.author.bot) { continue; }   // skip other emoji

            if (!foundEmoji) { foundEmoji = true; continue; } // found first emoji

            // delete repeat emoji
            emoji.delete()
                .then(() => { mclog('[MC4] delete repeat emoji.'); })
                .catch((e) => mclog(`[MC4] delete repeat emoji fail: ${e.message}`));
        }
    }
}



// ****** role manager ******
// Map <gID-cID>, RoleManager
class RoleManager {

    client = null;

    // guild obj
    guild = null;
    expiresKey = null;

    // log method
    dcPushEmbed = async () => { };

    // role obj
    logChannelID = null;
    memberRole = null;
    memberLevel = [];

    // config = { client, gID, expiresKey, logChannelID, memberRoleID, memberLevelID }
    constructor(config = null) { if (config == null) { return; } this.init(config); };
    async init(config) {

        const { client } = config;
        this.client = client;

        // get guild, expiresKey
        const { gID, expiresKey } = config;
        this.guild = await this.client.guilds.fetch(gID);
        this.expiresKey = expiresKey;

        // get log channel
        const { logChannelID } = config;
        this.logChannelID = logChannelID;
        let channel = await this.client.channels.fetch(logChannelID);
        if (channel) {
            this.dcPushEmbed = async (embed) => { return await channel.send({ embeds: [embed] }).catch(console.log); };
        } else {
            this.dcPushEmbed = (embed) => { console.log(embed.description || embed.data.description); };
        }

        // get guild roles
        const { memberRoleID, memberLevelID = [] } = config;
        this.memberRole = await this.guild.roles.fetch(memberRoleID);
        for (const roleID of memberLevelID) {
            this.memberLevel.push(await this.guild.roles.fetch(roleID));
        }

        await this.checkExpiresUser();

        // /*
        {
            const roles = [this.memberRole].concat(this.memberLevel);
            for (let [dID, guildMember] of this.memberRole.members) {

                let pgData = (await Pg.getDataByDiscordID(dID))?.rows || [];

                if (pgData.length <= 0) {
                    console.log(dID.toString().padStart(20, ' '), guildMember.user.tag.toString().padStart(40, ' '));

                    // user with role but not in database, remove role
                    await guildMember.roles.remove(roles).catch((e) => { console.log('[MC4]', e.message) });
                }
            }
        }//*/
    }

    // method for init
    // check user role / membership expires
    async checkExpiresUser() {
        mclog('[MC4] core.checkExpiresUser');
        let pgData = [];

        // get discord users cache
        await this.guild.members.fetch({ force: true }).catch(console.log);

        pgData = (await Pg.listUserData())?.rows || [];
        mclog(`[MC4] Pg.listUserData[${pgData.size}]`);
        for (const [dID, pgUser] of pgData) {
            // pgUser = { discord_id: '244255110572670987', youtube_id: 'UCgUpDIQ7Cq4kJETqZhGk7Kg', ssrb_expires: '0', kzmi_expires: '0' }

            let userExpires = pgUser[this.expiresKey];
            if (userExpires == 0) { continue; }

            // get user data in guild
            let dcUser = this.guild.members.cache.get(dID);
            if (!dcUser) {
                // mclog(`[MC4] User <@${dID}> not in guild <${this.guild}>`);
                continue;
            }

            // check user level
            const isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);
            const isExpiredUser = (userExpires <= Date.now());

            if (isExpiredUser) {
                Pg.updateExpires(dID, this.expiresKey, 0);

                if (isSpecalUser) {
                    mclog(`[MC4] User <@${dID}> expired, Remove role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`認證過期, 刪除身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));
                    dcUser.roles.remove(this.memberRole).catch((e) => { console.log('[MC4]', e.message) });
                    // remove level role
                    for (const role of this.memberLevel) {
                        if (!dcUser.roles.cache.has(role.id)) { continue; }
                        dcUser.roles.remove(role).catch((e) => { console.log('[MC4]', e.message) });
                    }
                }
                else { mclog(`[MC4] In guild without role <${this.memberRole.name}>, User <@${dcUser.user.tag}>.`); }
            } else {
                if (!isSpecalUser) {
                    mclog(`[MC4] User <@${dID}> without role, Add role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(`確認期限, 恢復身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));
                    dcUser.roles.add(this.memberRole).catch(console.log);
                }
                else { mclog(`[MC4] In guild with role <${this.memberRole.name}>, User <@${dcUser.user.tag}>.`); }
            }
        }
    }

    // <youtubeID, isChatSponsor>
    memberCache = new Map();
    // method for outside call
    async onLiveChat({ auDetails }) {   // rm.onLiveChat

        // get user cID
        let youtubeID = auDetails.channelId;
        // get dbData
        let result = await Pg.getDataByYoutubeID(youtubeID);

        let pgUser = ((result)?.rows || [null])[0];
        if (!pgUser) {
            // mclog(`[MC4] User not in database: ${auDetails.displayName}`);
            // mclog(`[MC4] User not in database`);
            return;
        }

        let dID = pgUser.discord_id;
        let dcUser = this.guild.members.cache.get(dID);
        if (!dcUser) {
            // mclog(`[MC4] User <@${dID}> not in guild <${this.guild}>`);
            // mclog(`[MC4] User not in guild <${this.guild}>`);
            return;
        }

        // check user level
        let isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);
        let isChatSponsor = (auDetails.isChatSponsor || auDetails.isChatOwner || auDetails.isChatModerator);
        let sponsorLevel = auDetails.sponsorLevel;

        if (this.memberCache.has(youtubeID)) {
            // skip if sponsor statu didnt change
            if (this.memberCache.get(youtubeID) == isChatSponsor) {
                return;
            }

            // sponsor statu changed, set user role again
        } else {
            // set sponsor statu flag to cache space
            this.memberCache.set(youtubeID, isChatSponsor);
        }

        // set user role
        if (isChatSponsor) {
            await Pg.updateExpires(dID, this.expiresKey);

            if (isSpecalUser) {
                mclog(`[MC4] Guild <${this.guild}>, found User <${auDetails.displayName}>, Update Expires <${this.expiresKey}>!`);
                const embedLog = `認證成功, 延展期限`
                    + ((sponsorLevel <= 0) ? ': ' : `(Lv.${sponsorLevel}): `)
                    + `@${dcUser.user.tag} ${dcUser.toString()}`;
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Aqua).setDescription(embedLog));
            }
            if (!isSpecalUser) {
                mclog(`[MC4] Guild <${this.guild}>, found User <${auDetails.displayName}>, Add Role!`);
                const embedLog = `認證成功, 新增身分組`
                    + ((sponsorLevel <= 0) ? `(${this.memberRole}): ` : `(${this.memberRole} Lv.${sponsorLevel}): `)
                    + `@${dcUser.user.tag} ${dcUser.toString()}`;
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(embedLog));
                dcUser.roles.add(this.memberRole).catch(console.error);
            }
            // update level role
            if (sponsorLevel !== undefined) {
                for (const i in this.memberLevel) {
                    let role = this.memberLevel[i];
                    let isThisLevel = (i == sponsorLevel);
                    // is this level & has role / NOT this level & NOT has role : skip
                    if (isThisLevel == dcUser.roles.cache.has(role.id)) { continue; }
                    if (isThisLevel) {
                        dcUser.roles.add(role).catch(() => { });
                    } else {
                        dcUser.roles.remove(role).catch(() => { });
                    }
                }
            }
        }
        if (!isChatSponsor) {
            if (pgUser[this.expiresKey] != 0) { Pg.updateExpires(dID, this.expiresKey, 0); }

            if (isSpecalUser) {
                mclog(`[MC4] Guild <${this.guild}>, found User <${auDetails.displayName}>, Remove role!`);
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`非會員, 刪除身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));
                dcUser.roles.remove(this.memberRole).catch(console.log);
            }
            // if (!isSpecalUser) {
            //     mclog(`[MC4] Guild <${this.guild}>, found User <${auDetails.displayName}>.`);
            //     this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Orange).setDescription(`${pgUser[this.expiresKey] > 0 ? '申請無效, 清除申請' : '申請無效'}: @${dcUser.user.tag} ${dcUser.toString()}`));
            // }
            // remove level role
            for (const role of this.memberLevel) {
                if (!dcUser.roles.cache.has(role.id)) { continue; }
                dcUser.roles.remove(role).catch(() => { });
            }
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
        let url = `${API_ENDPOINT}/oauth2/authorize?`
            + `client_id=${this.client.user.id}&`
            + `state=${this.client.user.id}${this.expiresKey}&`
            + `redirect_uri=${encodeURIComponent(redirectUri + "/callback")}&`
            + `response_type=code&`
            + `scope=identify%20connections`;
        return url;
    }
    cmdStreamList(holoChannelID) {
        let upcomingList = [];
        let liveList = [];
        // holoChannelID

        for (const [vID, video] of mainMcCore.ytChannelCores.get(holoChannelID).streamList) {
            // get cache
            mclog(`[MC4] ${vID} ${video ? 'Object' : video}`);
            if (!video) { continue; }

            // check stream start time
            let status = video.snippet.liveBroadcastContent;
            mclog(`[MC4] ${status.padStart(12, ' ')} <${video.snippet.title}>`);

            // get video data
            let description = video ? video.snippet.title : vID;
            if (status == 'upcoming') {
                upcomingList.push(`[${description}](https://youtu.be/${vID})`);
            } else if (status == 'live') {
                liveList.push(`[${description}](https://youtu.be/${vID})`);
            }

            // // get video data
            // let description = video ? video.snippet.title : vID;
            // streamList.push(`[${description}](https://youtu.be/${vID})`);
        }

        return [].concat(['直播中:'], liveList, ['待機台:'], upcomingList);
    }
}



// ****** guild manager ******
// Map <gID>, GuildManager 
class GuildManager {

    client = null;

    // guild obj
    guild = null;

    // channel obj
    streamChannelID = null;
    memberChannelID = null;

    // config = { client, gID, streamChannelID, memberChannelID }
    constructor(config = null) { if (config == null) { return; } this.init(config); };
    async init(config) {

        const { client } = config;
        this.client = client;

        // get guild
        const { gID } = config;
        this.guild = await this.client.guilds.fetch(gID);

        // get stream channel
        const { streamChannelID, memberChannelID } = config;
        this.streamChannelID = streamChannelID;
        this.memberChannelID = memberChannelID;
    }


    settingChannel = new Set();
    async changeChannelName(cID, onLive = false) {
        if (this.settingChannel.has(cID)) { return; }

        const channel = await this.client.channels.fetch(cID);
        // skip unset channel
        if (!/^[🔴⚫]/.test(channel.name)) { return; }

        // check channel permissions
        let permissions = channel.permissionsFor(channel.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
            mclog(`[MC4] Missing Permissions: MANAGE_CHANNELS in <#${cID}>`);
            return;
        }

        let channelStatus = (onLive ? '🔴' : '⚫');
        let channelName = `${channelStatus}${channel.name.replace(/^[🔴⚫]+/, '')}`;

        if (channel.name != channelName) {
            // setting
            this.settingChannel.add(channel.id);
            mclog(`<#${channel.id}> set name to ${channelName}`);

            channel.setName(channelName)
                .then((newChannel) => {
                    mclog(`<#${channel.id}> now name is ${newChannel.name}`);
                    this.settingChannel.delete(channel.id);
                })
                .catch((error) => {
                    console.log(this.client);
                    console.log(channel);
                    console.log(permissions.has(PermissionFlagsBits.ManageChannels));
                    console.log(error);
                    this.settingChannel.delete(channel.id);
                });
        }
    }

    liveChatCache = new Set();
    // method for outside call
    async onLiveChat({ auDetails, message, superchat, vID, isMemberOnly, startTime }) {    // gm.onLiveChat

        // get Date
        const now = new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' });

        // get livechat hash, avoid double send
        const hash = md5(`${vID}${auDetails.channelId}${message}`.trim());
        if (this.liveChatCache.has(hash)) { return; }
        this.liveChatCache.add(hash);

        // get send channel
        const channel = await this.client.channels.fetch(isMemberOnly ? this.memberChannelID : this.streamChannelID);

        // build embed
        let embed = new EmbedBuilder();
        // set color
        if (auDetails.isChatOwner) { embed.setColor(0xFFD600); }
        else if (auDetails.isChatModerator) { embed.setColor(0x5F84F1); }
        else if (auDetails.isVerified) { embed.setColor(0x16C60C); }
        else if (auDetails.isChatSponsor) { embed.setColor(0x13B56E); }
        // set url
        let url = `https://youtu.be/${vID}`;

        embed.setAuthor({
            name: auDetails.displayName,
            iconURL: auDetails.profileImageUrl, url
        })
        if (message) { embed.setDescription(message); }

        if (startTime) {
            let timestamp;

            if (auDetails.timestampText) {                      // for archive
                let timeText = '00:00:' + auDetails.timestampText;
                let [, hrs, min, sec] = timeText.match(/(\d+):(\d+):(\d+)$/) || [, '00', '00', '00'];
                timeText = `${hrs}h${min}m${sec}s`.replace(/^[0hm]+/, '');

                url = `https://youtu.be/${vID}&t=${timeText}`;
                const offsetTimeMsec = ((hrs * 60 + parseInt(min)) * 60 + parseInt(sec)) * 1000;

                timestamp = startTime + offsetTimeMsec;

            } else if (auDetails.videoOffsetTimeMsec) {         // for upcoming & live
                const offsetTimeMsec = parseInt(auDetails.videoOffsetTimeMsec);
                if (offsetTimeMsec < -30 * 1000) { return; }
                timestamp = Date.now() + offsetTimeMsec;
            }

            const timestampString = new Date(timestamp).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' });
            embed.setFooter({ text: `${vID} - ${timestampString}` });

        } else { embed.setFooter({ text: `${vID} - ${now}` }); }

        channel.send({ embeds: [embed] }).catch(console.log);
    }
}



// ****** youtube core ******
class YoutubeCore {

    // add api key
    holoChannelID = '';
    youtubeAPI = new YoutubeAPI();

    constructor(config = null) { if (config == null) { return; } this.init(config); };
    async init({ holoChannelID }) {
        this.holoChannelID = holoChannelID;

        let apiKey;
        switch (holoChannelID) {
            case 'UCUKD-uaobj9jiqB-VXt71mA': apiKey = [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7]; break; // SSRB
            case 'UC_vMYWcDjmfdpH6r4TTn1MQ': apiKey = [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9]; break; // KZMI
            case 'UCWQtYtq9EOB4-I5P-3fh8lA': apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break; // OTOSE
            default: apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break;                         // TEST
        }

        this.youtubeAPI = new YoutubeAPI({ holoChannelID, apiKey });
    };

    // get live/upcoming stream by channel ID
    streamList = new Map(); // <vID, video>
    async getVideoList(byYtdlp = true) {

        let newStreamList = new Set();

        let _videos = [];
        if (byYtdlp) {

            // get videos by yt-dlp 
            _videos = _videos.concat(
                await this.youtubeAPI.getVideoSearchByYtdlp({ eventType: ['live', 'upcoming'], memberOnly: false }),
                await this.youtubeAPI.getVideoSearchByYtdlp({ eventType: ['live', 'upcoming'], memberOnly: true })
            );

        } else {

            // get videos by youtube api
            for (const eventType of ['live', 'upcoming']) {
                // get search
                let videos = await this.youtubeAPI.getVideoSearch({ eventType });

                // check result
                if (!Array.isArray(videos)) {
                    console.log(`getVideoLists error:`, this.holoChannelID);
                    if (videos?.reason == 'quotaExceeded') {
                        console.log(`{ code: 403, message: 'quotaExceeded', reason: 'quotaExceeded',`)
                        console.log(`  variabale: { channelId: '${this.holoChannelID}', eventType: 'live' } }`)
                    } else {
                        console.log(videos)
                    }
                    videos = [];
                }   // something is wrong

                _videos = _videos.concat(videos);
            }

        }

        for (let video of _videos) {
            let vID = video.id.videoId || video.id;

            // update liveBroadcastContent
            if (this.streamList.has(vID)) {
                video.memberOnly = (this.streamList.get(vID))?.memberOnly;  // maybe no need
            } else if (['live', 'upcoming'].includes(video.snippet?.liveBroadcastContent)) {
                newStreamList.add(vID);
            }

            // cache video data
            this.streamList.set(vID, video);
        }


        // ready to show search result
        let searchResult = [[`[MC4] now time:`, new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })].join(' ')];

        // get REALLY video data
        // data array
        let streamList = [];
        // set promise
        for (let [vID, video] of this.streamList) {

            const videoStatus = byYtdlp ?
                await this.youtubeAPI.getVideoStatusByYtdlp(vID) :
                await this.youtubeAPI.getVideoStatus(vID);

            if (byYtdlp) {
                const _memberOnly = await this.youtubeAPI.getVideoIsMemberOnly(vID);
                if ([0, 1].includes(_memberOnly)) { videoStatus.memberOnly = _memberOnly; }
            }

            streamList.push([vID, video, videoStatus]);
        }
        // promise.all
        for (let [, , promise] of streamList) { await promise; }

        // for out-of-memory
        if (streamList.length > 2) {
            let maxDate = 0;
            let minDate = Infinity;
            for (let [vID, video, videoStatus] of streamList) {
                let startDate = Date.parse(videoStatus.liveStreamingDetails.scheduledStartTime);
                maxDate = Math.max(maxDate, startDate);
                minDate = Math.min(minDate, startDate);
            }
            streamList = streamList.filter(([vID, video, videoStatus]) => [maxDate, minDate].includes(Date.parse(videoStatus.liveStreamingDetails.scheduledStartTime)));

            let delKeys = Array.from(this.streamList.keys()).filter((_vID) => {
                for (let [vID, ,] of streamList) { if (_vID == vID) { return false; } }
                return true;
            })
            for (let key of delKeys) {
                this.streamList.delete(key);
                newStreamList.delete(key);
            }
        }

        for (let [vID, video, videoStatus] of streamList) {

            // get REALLY video data & liveStreamingDetails
            if (!videoStatus) { continue; }

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
            searchResult.push([`[MC4] stream at`,
                new Date(Date.parse(startTime)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }),
                vID,
                status.padStart(8, ' '),
                videoStatus.snippet.title].join(' '));

            // update liveBroadcastContent
            if (this.streamList.has(vID)) {
                videoStatus.memberOnly = (this.streamList.get(vID))?.memberOnly;
            }

            // cache video data
            this.streamList.set(vID, videoStatus);
        }

        for (let line of searchResult) { mclog(line); }

        // trace livechat
        for (let vID of newStreamList) {
            const memberOnly = (this.streamList.get(vID).memberOnly == 1);
            this.traceStreamChatByYtdlp({ vID, memberOnly });
        }
    }

    streamIsMemberOnly = (vID) => { return this.streamList.get(vID)?.memberOnly || false; }


    // === yt-dlp-wrap ===
    ytDlpArray = new Map();
    async traceStreamChatByYtdlp({ vID, memberOnly }) {


        if (!this.streamList.has(vID)) {
            mclog(`[MC4] Can't found video data`);
            // return;

            let videoStatus = await this.youtubeAPI.getVideoStatus(vID);

            const _memberOnly = await this.youtubeAPI.getVideoIsMemberOnly(vID);
            if ([0, 1].includes(_memberOnly)) { videoStatus.memberOnly = _memberOnly; }

            this.streamList.set(vID, videoStatus);
        }

        let ytDlpData = { ytDlpController: null, livechatFile: null, indexOfLine: 0, readFileCount: 0, readFileInterval: null };

        // Additionally you can set the options of the spawned process and abort the process.
        // The abortion of the spawned process is handled by passing the signal of an AbortController. 
        ytDlpData.ytDlpController = new AbortController();

        // Init an instance with a given binary path.
        // If none is provided "youtube-dl" will be used as command.
        const ytDlpWrap = new YTDlpWrap(ytdlpPath);

        // start stream
        const command = [
            `https://youtu.be/${vID}`,
            `--skip-download`, `--ignore-no-formats`,
            `--write-subs`, `--sub-langs live_chat`,
            // `--restrict-filenames`, (isLinux ? `--no-windows-filenames` : `--windows-filenames`),
            `-o "livechat_%(id)s"`,
            // `--cookies ytcookies.txt`
        ];
        if (memberOnly) { command.push(`--cookies`); command.push(`ytcookies.txt`); }
        if (debug) { console.log(`[ytDlpWrap] (${vID})`); console.log(`yt-dlp ${command.join(' ')}`); }
        console.log(`[ytDlpWrap] (${vID}) Execute.`);

        this.ytDlpArray.set(vID, ytDlpData);

        ytDlpWrap
            .exec(command, { shell: true, detached: false }, (this.ytDlpArray.get(vID)).signal)
            // .on('progress', (progress) => console.log(progress.percent, progress.totalSize, progress.currentSpeed, progress.eta))
            .on('ytDlpEvent', async (eventType, eventData) => {
                // if (eventType != 'download' || !eventData.includes('frag')) {
                //     mclog(`[ytDlpWrap] (${vID}) [${eventType}]`, eventData);
                // }

                // download live chat data
                if (eventType == 'download' && !eventData.includes('frag') &&
                    /Destination:\s*([\S\s]+\.live_chat\.json)/.test(eventData)
                ) {
                    // get data json filename
                    let [, filename] = eventData.match(/Destination:\s*([\S\s]+\.live_chat\.json)/);
                    console.log(`[ytDlpWrap] (${vID}) ${filename}`);

                    // set filename
                    (this.ytDlpArray.get(vID)).livechatFile = filename;

                    // get livechat data
                    (this.ytDlpArray.get(vID)).readFileInterval = setTimeout(() => this.readStreamChatFile(vID), 1000);
                }
            })
            .on('error', (error) => {
                mclog(`[ytDlpWrap] (${vID}) ${error.toString()}`);
                // log
                if (error.toString().includes('members-only')) {

                    // destroy ytDlp data, if need, rebuild after retry.
                    this.destroyByVid(vID);

                    console.log(`[MC4] Join this channel to get access to members-only content and other exclusive perks. memberOnly: ${memberOnly}`);
                    if (!memberOnly) {
                        // retry with cookie
                        this.traceStreamChatByYtdlp({ vID, memberOnly: true });
                        // get video & set member-only flag
                        if (this.streamList.has(vID)) {
                            this.streamList.get(vID).memberOnly = 1;
                        }
                    } else {
                        // get video & update member-only flag
                        if (this.streamList.has(vID)) {
                            this.streamList.get(vID).memberOnly = 2;
                        }
                    }

                } else if (error.toString().includes('Private video')) {

                    // destroy ytDlp data
                    this.destroyByVid(vID);

                    // delete video data
                    this.streamList.delete(vID);

                    // for trace temporary ytCore
                    if (this.getVideoList == null) {

                        for (let mKey of mainMcCore.guildManagers.keys()) {
                            let [, gID, cID] = mKey.match(/^(\d+)-(.+)$/) || [, null, null];
                            if (!gID || !cID) { continue; }     // unknown mkey

                            if (this.holoChannelID == cID) {
                                mainMcCore.guildManagers.delete(mKey);
                                mainMcCore.configs = mainMcCore.configs.filter((config) => (config.gID != gID || config.holoChannelID != cID));
                            }
                        }

                        // delete youtube core
                        mainMcCore.ytChannelCores.delete(this.holoChannelID);
                    }

                    // log
                    console.log(`[ytDlpWrap] (${vID}) Private video.`);

                } else if (error.toString().includes('Unable to rename file: [WinError 32]')) {
                    console.log(`ERROR: Unable to rename file: [WinError 32]`);

                } else if (error.toString().includes('aQvGIIdgFDM')) {
                    mclog(`[ytDlpWrap] (${vID}) Warning:`);
                    mclog(`WARNING: [youtube] Skipping player responses from android clients (got player responses for video "aQvGIIdgFDM" instead of "IiVnwOy_CP0")`);
                } else {
                    console.log(`[ytDlpWrap] (${vID}) Error.`);
                    console.error(error.toString());
                    // shouldn't here
                }
            })
            .on('close', () => {

                // destroy ytDlp data
                this.destroyByVid(vID, false);

                // delete video data if normal end
                if (this.streamList.has(vID) && this.streamList.get(vID).memberOnly != 2) {
                    // if memberOnly == 2, it's member only video but without membership
                    this.streamList.delete(vID);
                }

                // for trace temporary ytCore
                if (this.getVideoList == null) {

                    for (let mKey of mainMcCore.guildManagers.keys()) {
                        let [, gID, cID] = mKey.match(/^(\d+)-(.+)$/) || [, null, null];
                        if (!gID || !cID) { continue; }     // unknown mkey

                        if (this.holoChannelID == cID) {
                            mainMcCore.guildManagers.delete(mKey);
                            mainMcCore.configs = mainMcCore.configs.filter((config) => (config.gID != gID || config.holoChannelID != cID));
                        }
                    }

                    // delete youtube core
                    mainMcCore.ytChannelCores.delete(this.holoChannelID);
                }

                // log
                console.log(`[ytDlpWrap] (${vID}) All done.`);
            }); //*/

    }
    async readStreamChatFile(vID) {
        if (!this.ytDlpArray.has(vID)) { return; }

        let { livechatFile, indexOfLine, readFileCount } = this.ytDlpArray.get(vID);

        // check file exist
        if (!fs.existsSync(`${livechatFile}.part`)) { return; }

        // test livechat file for debug, don't forgot change start time in filename
        if (fs.existsSync(`${livechatFile}.test.part`)) { livechatFile = `${livechatFile}.test`; }

        // file read stream
        let fileStream = fs.createReadStream(`${livechatFile}.part`, 'utf8');
        const rl = require('readline').createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const video = this.streamList.get(vID);
        let onLive = video?.snippet.liveBroadcastContent == 'live';
        let startTime = null;
        if (video) {
            startTime = video.liveStreamingDetails?.scheduledStartTime || video.snippet?.publishedAt || null;
            startTime = startTime ? Date.parse(startTime) : null;
        }

        let i = -1;
        for await (const line of rl) {
            ++i;
            if (i < indexOfLine) { continue; }

            // line to json
            let chatItem;
            try {
                ++indexOfLine;
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
            if (!renderer || !renderer.authorName) { continue; }


            // set result
            let auDetails = {
                channelId: renderer.authorExternalChannelId,
                channelUrl: `https://www.youtube.com/channel/${renderer.authorExternalChannelId}`,
                displayName: renderer.authorName.simpleText,
                isChatModerator: false, isChatOwner: false,
                isChatSponsor: false, isVerified: false,
                sponsorLevel: -1,
                profileImageUrl: '',
                timestampText: renderer.timestampText?.simpleText || null,
                videoOffsetTimeMsec: chatItem.replayChatItemAction.videoOffsetTimeMsec || chatItem.videoOffsetTimeMsec || null
            }
            // user level
            let authorBadges = renderer.authorBadges || [];
            for (const badge of authorBadges) {
                let tooltip = badge?.liveChatAuthorBadgeRenderer.tooltip;

                if (tooltip.includes('ember')) {
                    auDetails.isChatSponsor = true;
                    switch (tooltip) {
                        case 'New member': { auDetails.sponsorLevel = 0; } break;
                        case 'Member (1 month)': { auDetails.sponsorLevel = 1; } break;
                        case 'Member (2 months)': { auDetails.sponsorLevel = 2; } break;
                        case 'Member (6 months)': { auDetails.sponsorLevel = 3; } break;
                        case 'Member (1 year)': { auDetails.sponsorLevel = 4; } break;
                        case 'Member (2 years)': { auDetails.sponsorLevel = 5; } break;
                        case 'Member (3 years)': { auDetails.sponsorLevel = 6; } break;
                        case 'Member (4 years)': { auDetails.sponsorLevel = 7; } break;
                        default: {
                            auDetails.sponsorLevel = -1;
                            console.log(`[MC4] tooltip`, tooltip);
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
            for (const { text, emoji } of runs) {
                if (text) { message += text; }
                if (emoji) {
                    let name;

                    if (emoji.isCustomEmoji) {
                        // get emoji shortcuts
                        for (const term of emoji.searchTerms) {
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
            await mainMcCore.onLiveChat({ holoChannelID: this.holoChannelID, vID, auDetails, message, superchat, customEmojis: emojis, startTime });
        }

        if (readFileCount % (onLive ? 10 : 100) == 0) { mclog(`[MC4] ${vID} -- ${indexOfLine.toString().padStart(8, ' ')} messages returned --`); }

        fileStream.destroy();

        // update ytDlpData
        if (this.ytDlpArray.has(vID)) { // sometimes run after destroy
            (this.ytDlpArray.get(vID)).indexOfLine = indexOfLine;
            (this.ytDlpArray.get(vID)).readFileCount = readFileCount + 1;
            (this.ytDlpArray.get(vID)).readFileInterval = setTimeout(() => this.readStreamChatFile(vID), 500);
        }
    }

    destroyByVid(vID, abort = true) {
        if (!this.ytDlpArray.has(vID)) { return; }

        // ytDlpData = { ytDlpController: null, livechatFile: null, indexOfLine: 0, readFileCount: 0, readFileInterval: null };
        let ytDlpData = this.ytDlpArray.get(vID);

        if (ytDlpData.ytDlpController) {
            if (abort) { ytDlpData.ytDlpController.abort(); }
            else { ytDlpData.ytDlpController = null; }
        }

        if (ytDlpData.livechatFile && fs.existsSync(ytDlpData.livechatFile)) {
            try { fs.unlinkSync(ytDlpData.livechatFile); } catch (e) { console.log(e.message); }
        }

        if (ytDlpData.readFileInterval) { clearTimeout(ytDlpData.readFileInterval); }

        this.ytDlpArray.delete(vID);
    }

    destroy() {
        const keys = this.ytDlpArray.keys();
        for (let vID of keys) {
            this.destroyByVid(vID);
        }
    }
}



class MainMemberCheckerCore {
    emojiManager = new EmojiManager();

    ytChannelCores = new Map();

    roleManagers = new Map();
    guildManagers = new Map();

    constructor() { this.preInit(); };
    initialization = 0;

    async preInit() {
        this.initialization = 1;

        // download yt-dlp-wrap
        if (fs.existsSync(ytdlpPath)) { fs.unlinkSync(ytdlpPath); }
        // Download the youtube-dl binary for the given version and platform to the provided path.
        // By default the latest version will be downloaded to "./youtube-dl" and platform = os.platform().
        // await YoutubeDlWrap.downloadFromGithub('youtube-dl', '2023.03.04.1', '');
        await YTDlpWrap.downloadFromGithub().catch(() => { });

        // cookie.txt
        if (fs.existsSync('./exported-cookies.json') && !fs.existsSync('./ytcookies.txt')) {
            let rawData = fs.readFileSync('./exported-cookies.json', 'utf8');

            let jsonData = [];
            let cookieData = [`# Netscape HTTP Cookie File`, `# This file is generated by yt-dlp.  Do not edit.\n`];

            try {
                jsonData = JSON.parse(rawData);
            } catch (e) { }

            for (let c of jsonData) {
                let cookieLine = [c.domain.replace(/^www/, ''), 'TRUE', c.path, c.secure.toString().toUpperCase(), parseInt(c.expirationDate) || 0, c.name, c.value].join('\t');
                cookieData.push(cookieLine);
            }
            fs.writeFileSync('./ytcookies.txt', cookieData.join('\n'));
        }

        if (fs.existsSync('./cookies.enc')) {
            let encData = fs.readFileSync('./cookies.enc', 'utf8');
            let decData = crypto.decrypt(encData);
            fs.writeFileSync('./ytcookies.txt', decData);
        } else if (fs.existsSync('./ytcookies.txt')) {
            let rawData = fs.readFileSync('./ytcookies.txt', 'utf8');
            let encData = crypto.encrypt(rawData);
            fs.writeFileSync('./cookies.enc', encData);
        }

        // pg init
        await Pg.init();

        // clock method
        this.interval = setTimeout(this.timeoutMethod, 2000);

        // clear livechat files (only work when local)
        const livechatFiles = fs.readdirSync('.').filter(file => (file.includes('.live_chat.') && !file.endsWith('.test.part')));
        for (const file of livechatFiles) { fs.unlinkSync(file); }

        this.initialization = 2;
    }

    // set discord emoji manager & upload db backup
    async init(client) {

        // pick SSRB bot for emoji manager
        if (client && [`713624995372466179`, `427025310291197954`].includes(client.user.id)) {
            this.emojiManager = new EmojiManager(client);
        }

        // hold until pre init done
        while (this.initialization != 2) {
            await sleep(500);
        }

        // pick DLS bot for emoji manager
        if (client && [`920485085935984641`].includes(client.user.id)) {
            await Pg.backup(client);
        }
    }

    configs = [];
    async addConfig(rawConfig) {

        // rawConfig = {
        //     client, gID, holoChannelID,
        //     pluginConfig: {
        //         streamChannelID, memberChannelID,
        //         expiresKey, logChannelID, memberRoleID, memberLevelID
        //     }
        // }

        // main config variable
        const { client, gID, pluginConfig } = rawConfig;
        const { holoChannelID } = pluginConfig;

        // add new youtube core
        if (!this.ytChannelCores.has(holoChannelID)) {
            let ytCore = new YoutubeCore({ holoChannelID });
            ytCore.getVideoList(true);
            this.ytChannelCores.set(holoChannelID, ytCore);
        }

        const managerKey = `${gID}-${holoChannelID}`;

        // role manager
        if (pluginConfig.expiresKey) {

            // get variable
            const { expiresKey, logChannelID, memberRoleID, memberLevelID } = pluginConfig

            let rm = new RoleManager({ client, gID, expiresKey, logChannelID, memberRoleID, memberLevelID });

            this.roleManagers.set(managerKey, rm);

            await Pg.initColumn(pluginConfig.expiresKey);
        }

        // guild manager
        if (pluginConfig.streamChannelID || pluginConfig.memberChannelID) {

            // get variable
            const { streamChannelID, memberChannelID } = pluginConfig

            let gm = new GuildManager({ client, gID, streamChannelID, memberChannelID });

            this.guildManagers.set(managerKey, gm);
        }

        // set config object
        let config = { gID, holoChannelID };
        for (const key of ['streamChannelID', 'memberChannelID', 'expiresKey', 'logChannelID', 'memberRoleID', 'memberLevelID']) {
            config[key] = pluginConfig[key];
        }
        this.configs.push(config);
    }

    async onLiveChat({ holoChannelID, vID, auDetails, message, superchat, customEmojis, startTime }) {  // mainMcCore.onLiveChat
        // console.log(
        //     `[Livechat ${holoChannelID}]`,
        //     (auDetails.isChatModerator ? '🔧' : '　'), (auDetails.isChatOwner ? '⭐' : '　'), (auDetails.isVerified ? '✔️' : '　'), (auDetails.isChatSponsor ? '🤝' : '　'),
        //     (auDetails.isChatModerator ? 'T' : '_'), (auDetails.isChatOwner ? 'O' : '_'), (auDetails.isVerified ? 'V' : '_'), (auDetails.isChatSponsor ? 'S' : '_'),
        //     `<${auDetails.displayName}>`, superchat, message,
        //     (auDetails.channelId ? '' : '[-] cID')
        //     (auDetails.profileImageUrl ? '' : '[-] Photo'),
        // );


        // check special livechat
        let messagePayload = null;
        if (auDetails.isChatOwner || auDetails.isChatModerator || auDetails.isVerified
            // || !parseInt(Math.random() * 5000)      // 1/5000
            // || auDetails.isChatSponsor              // all ChatSponsor livechat
        ) {
            // fix emojis text
            if (customEmojis && customEmojis.size > 0) {

                for (const [name, url] of customEmojis) {
                    // check emoji in guild or not
                    // check emoji text valid
                    let md5Name = /^[A-Za-z0-9_]+$/.test(name) ? name : md5(name);
                    let emoji = await this.emojiManager.getEmoji(url, md5Name);

                    if (!emoji) { continue; }   // something wrong?
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
            const isMemberOnly = ytCore.streamIsMemberOnly(vID);

            messagePayload = { auDetails, message, superchat, vID, isMemberOnly, startTime };
        }


        // get config
        for (const config of this.configs) {
            // config = { gID, holoChannelID, expiresKey, memberRoleID, memberLevelID, logChannelID, streamChannelID, memberChannelID };

            // skip other channel config
            if (holoChannelID != config.holoChannelID) { continue; }

            // call role manager
            if (config.expiresKey) {

                // get yt core
                const ytCore = this.ytChannelCores.get(holoChannelID);
                if (ytCore) {
                    const video = ytCore.streamList.get(vID);

                    // update role script if:
                    // > live or upcoming
                    // > none when debug
                    if (['live', 'upcoming'].includes(video?.snippet.liveBroadcastContent) ||
                        (debug && video?.snippet.liveBroadcastContent == 'none')
                    ) {
                        for (const [managerKey, rm] of this.roleManagers) {
                            if (managerKey != `${config.gID}-${holoChannelID}`) { continue; }

                            rm.onLiveChat({ auDetails });
                        }
                    }
                }
            }

            // call guild manager
            if (messagePayload && (config.streamChannelID || config.memberChannelID)) {
                for (const [managerKey, gm] of this.guildManagers) {
                    if (managerKey != `${config.gID}-${holoChannelID}`) { continue; }

                    gm.onLiveChat(messagePayload);
                }
            }
        }
    }

    // get stream (live/upcoming) videos
    async getVideoLists(byYtdlp) {
        for (const [holoChannelID, ytCore] of this.ytChannelCores) {
            if (ytCore.getVideoList == null) { continue; }
            ytCore.getVideoList(byYtdlp);
        }
    }

    interval = null;
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
        if (minutes == 3 && seconds == 0) {
            if ([3, 4, 5, 7, 9, 11].includes(hours)) {
                // check stream by ytdlp in midnight
                // this.getVideoLists(true);    // disable for memoery leak error
            } else {
                this.getVideoLists(false);
            }
        } else if ([23, 43].includes(minutes) && seconds == 0) {
            // this.getVideoLists(true);
        }

        // check every 10sec
        if (seconds % 10 == 0
            && !debug    // don't change channel name in debug mode
        ) {
            // check channel name
            let channelStatus = new Map();

            for (const [managerKey, gm] of this.guildManagers) {
                // get gm's youtube channel ID
                const gmYtChannelID = managerKey.replace(/^\d+-/, '');  // managerKey = `${config.gID}-${holoChannelID}`

                // register channel
                for (let cID of [gm.streamChannelID, gm.memberChannelID]) {
                    if (channelStatus.has(cID)) {
                        // add yt channel
                        channelStatus.get(cID).gmYtChannelID.push(gmYtChannelID);
                    } else {
                        // register channel
                        channelStatus.set(cID, { onLive: false, gm, gmYtChannelID: [gmYtChannelID] });
                    }
                }
            }

            // check all channel stream statu
            for (const [holoChannelID, ytCore] of this.ytChannelCores) {

                // get video from ytCore
                for (const [vID, video] of ytCore.streamList) {

                    let _video = video;
                    // get stream statu
                    const status = video?.snippet?.liveBroadcastContent;

                    // try to update video if upcoming
                    if (status == 'upcoming') {

                        // skip freechat by starttime
                        let startTime = video.liveStreamingDetails?.scheduledStartTime || 0;
                        if (startTime && Date.parse(startTime) > Date.now()) { continue; }
                        if (Date.now() > (Date.parse(startTime) + 43200000)) { continue; }  // skip upcoming video after 12hr

                        // now is live time, recheck stream if status is upcoming
                        // get REAL video data from API
                        _video = await ytCore.youtubeAPI.getVideoStatus(vID);

                        // API error, quotaExceeded
                        if (!_video?.snippet) {
                            // delete nan data video
                            if (ytCore.streamList.has(vID)) {
                                ytCore.streamList.delete(vID);
                            }
                            continue;
                        }

                        // update video data
                        _video.memberOnly = (ytCore.streamList.get(vID))?.memberOnly;
                        ytCore.streamList.set(vID, _video);
                    }

                    // set channel onLive flag
                    if (status == 'live') {

                        // get member only or not
                        const memberOnly = ytCore.streamIsMemberOnly(vID);

                        for (const [cID, { onLive, gm, gmYtChannelID }] of channelStatus) {
                            if (!gmYtChannelID.includes(holoChannelID)) { continue; }

                            // set onlive statu
                            if (memberOnly) { (channelStatus.get(gm.memberChannelID)).onLive = true; }
                            else { (channelStatus.get(gm.streamChannelID)).onLive = true; }
                        }
                    }
                }
            }

            for (const [cID, { onLive, gm }] of channelStatus) {
                gm.changeChannelName(cID, onLive);
            }
        }
    }

    destroy() {
        for (const [holoChannelID, core] of this.ytChannelCores) {
            core.destroy();
        }
        clearTimeout(this.interval);
    }
}
let mainMcCore = new MainMemberCheckerCore();



module.exports = {
    name: 'member checker v4',
    description: "check who is SSRB",

    async execute(message, pluginConfig, command, args, lines) {

        if (!command) { return false; }
        const { client, guild, channel } = message;

        let video;

        for (const [managerKey, rCore] of mainMcCore.roleManagers) {
            // check workspace
            if (rCore.client.user.id != client.user.id) { continue; }
            if (rCore.guild.id != guild.id) { continue; }
            const isLogChannel = (channel.id == rCore.logChannelID);
            const holoChannelID = managerKey.replace(/^\d+-/, '');

            // switch mclog
            if (isLogChannel && command == 'mcdebug') {

                const showLog = (mclog == console.log);
                if (showLog) {
                    setTimeout(() => { mclog = (() => { }); }, 500);
                    console.log('[MC4] debug log off');
                } else {
                    setTimeout(() => { mclog = console.log; }, 500);
                    console.log('[MC4] debug log on');
                }

                return;
            }
            // get user db data
            if (isLogChannel && command == 'user') {
                let dID = args[0];
                if (!dID) {
                    channel.send({ embeds: [new EmbedBuilder().setDescription(`!user <user discord ID>`)] });
                    return;
                }

                let data = ((await Pg.getDataByDiscordID(dID.trim()))?.rows || [])[0];
                if (data) {
                    channel.send({ content: `\`\`\`js\n${dID}\n${JSON.stringify(data, null, 2)}\`\`\`` });
                    return;
                }

                data = (await Pg.getDataByYoutubeID(dID.trim()))?.rows || [];
                if (data.length > 0) {
                    let content = ["```", dID];
                    for (let d of data) {
                        content.push(JSON.stringify(d, null, 2));
                    }
                    content.push("```");
                    channel.send({ content: content.join('\n') });
                    return;
                }

                channel.send({ content: "```js\n" + dID + `\nResult: 0` + "```" });
                return;
            }
            // remove user db data
            if (isLogChannel && command == 'removeuser') {
                let dID = args[0];
                if (!dID) {
                    channel.send({ embeds: [new EmbedBuilder().setDescription(`!removeuser <user discord ID>`)] });
                    return;
                }

                let data = ((await Pg.deleteData(dID.trim()))?.rows || [])[0];
                if (data) {
                    channel.send({ content: `\`\`\`js\n${dID}\n${JSON.stringify(data, null, 2)}\`\`\`` });
                    return;
                }

                channel.send({ content: "```js\n" + dID + `\nResult: 0` + "```" });
                return;
            }

            // clear member cache
            if (isLogChannel && command == 'membercache') {
                rCore.memberCache = new Map();

                channel.send({ embeds: [new EmbedBuilder().setDescription(`Clear member cache done!`)] });
                continue;
            }

            // get member url
            if (command == 'member') {
                channel.send({ content: `<${rCore.get301Url()}>` });
                continue;
            }

            if (command == 'stream') {
                // force update all stream list cache by admin

                const ytCore = mainMcCore.ytChannelCores.get(holoChannelID);
                if (regUrl.test(args[0])) {
                    // get vID
                    const [, vID] = args[0].match(regUrl);

                    if (!video) {
                        // get video data from API
                        video = await ytCore.youtubeAPI.getVideoStatus(vID);
                    }

                    // update cache data
                    if (video && video.snippet && video.snippet.channelId == holoChannelID) {

                        if (ytCore.streamList.has(vID)) {
                            // update liveBroadcastContent
                            video.memberOnly = (ytCore.streamList.get(vID))?.memberOnly;
                        }
                        // cache video data
                        ytCore.streamList.set(vID, video);

                        if (['live', 'upcoming'].includes(video?.snippet?.liveBroadcastContent)) {
                            ytCore.traceStreamChatByYtdlp({ vID, memberOnly: (video.memberOnly == 1) });
                        }

                        rCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.DarkGold).setDescription(`手動新增直播清單`).setFooter({ text: holoChannelID }));
                    }
                    continue;

                } else if (isLogChannel) {

                    if (ytCore.getVideoList == null) { continue; }
                    ytCore.getVideoList(true).then(() => {
                        rCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.DarkGold).setDescription(`更新直播清單`).setFooter({ text: holoChannelID }));
                    });
                    continue;
                }

                // get response
                const streamList = rCore.cmdStreamList(holoChannelID);

                let embed = new EmbedBuilder().setColor(Colors.DarkGold);
                if (streamList.length <= 0) { embed.setDescription(`目前沒有直播台/待機台`); }
                else { embed.setDescription(streamList.join('\n')); }
                embed.setFooter({ text: holoChannelID });

                channel.send({ embeds: [embed] });

                continue;
            }

            //    !trace <https://youtube.com/watch/Vx1K89idggs>    // member
            //    !trace <https://youtube.com/watch/-ni8_BFjjB8>    // short live
            //    !trace <https://youtube.com/watch/37YNx2Gag4g>    // long live
            //    !trace <https://youtube.com/watch/0ZSnVjrZA_Q>    // subaru live
            if (command == 'trace' && message.author?.id == '353625493876113440') {

                if (!regUrl.test(args[0])) { return; }

                // get vID
                const [, vID] = args[0].match(regUrl);

                // get video channel             
                let ytCore = new YoutubeCore({ holoChannelID: null });  // dummy core for API
                const video = await ytCore.youtubeAPI.getVideoStatusByYtdlp(vID);
                const newChannelID = video?.snippet?.channelId;
                const status = video?.snippet?.liveBroadcastContent;

                // skip if not live
                // if (status == 'upcoming') { console.log(`[MC4] Can't trace upcoming video`); return; }
                if (!newChannelID) { console.log(`[MC4] Can't trace video without channel ID`); return; }

                let isDummyCore = false;
                // set youtube core
                if (!mainMcCore.ytChannelCores.has(newChannelID)) {
                    const _ytCore = new YoutubeCore({ holoChannelID: newChannelID });
                    mainMcCore.ytChannelCores.set(newChannelID, _ytCore);
                    isDummyCore = true;
                }
                ytCore = mainMcCore.ytChannelCores.get(newChannelID);

                // trace archive
                if (video.snippet.liveBroadcastContent == 'none') {
                    console.log(`[MC4] Trace archive ${vID}`, debug ? `in debug mode.` : `, skip rm.onLiveChat method.`);
                }


                if (isDummyCore) {
                    const cID = channel.id;
                    const gID = guild.id;

                    // set new channel ID
                    ytCore.init({ holoChannelID: newChannelID });
                    // block clock method
                    ytCore.getVideoList = null;

                    // get variable
                    const newManagerKey = `${gID}-${newChannelID}`;

                    // set guild manager
                    let gm = new GuildManager({ client, gID, streamChannelID: cID, memberChannelID: cID });
                    mainMcCore.guildManagers.set(newManagerKey, gm);

                    // set config object 
                    mainMcCore.configs.push({ gID, holoChannelID: newChannelID, streamChannelID: cID, memberChannelID: cID });
                }

                ytCore.streamList.set(vID, video);
                ytCore.traceStreamChatByYtdlp({ vID, memberOnly: (video.memberOnly == 1) });
                return;
            }
        }
    },

    async setup(client) {

        for (let gID of client.guildConfigs.keys()) {

            const pluginConfig = client.getPluginConfig(gID, 'memberChecker4');
            if (!pluginConfig) { continue; }

            // mainMcCore.init
            await mainMcCore.init(client);

            for (let config of pluginConfig) {
                // get guild object
                const guild = client.guilds.cache.get(gID);
                if (!guild) { continue; }    // bot not in guild
                if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) { console.log(`Missing Permissions: MANAGE_ROLES in <${gID}>`); continue; }
                if (!guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) { console.log(`Missing Permissions: SEND_MESSAGES in <${gID}>`); continue; }


                await mainMcCore.addConfig({ client, gID, pluginConfig: config });
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
        for (let [holoChannelID, ytCore] of mainMcCore.ytChannelCores) {
            // get video from ytCore
            for (const [vID, video] of ytCore.streamList) {

                // check stream start time
                const status = video?.snippet?.liveBroadcastContent;

                // skip if not live
                if (status != 'live') { continue; }
                return false;
            }
        }
        return true;
    }
}



// express
const app = require('../server.js').app;
app.all(`/member/:botid/:ekey`, async (req, res) => {
    let botID = req.params.botid;
    let expiresKey = req.params.ekey;

    let rCore = null;
    for (const [managerKey, rm] of mainMcCore.roleManagers) {
        if (rm.client.user.id == botID && rm.expiresKey == expiresKey) {
            rCore = mainMcCore.roleManagers.get(managerKey); break;
        }
    }

    if (!rCore) {
        res.send(`不明的參數組! 請聯絡管理員或製作者\n${botID}, ${expiresKey}`);
        return;
    }

    res.redirect(301, rCore.getAuthorizeUrl());
    return;
});

app.all('/callback', async (req, res) => {
    const param = req.query.state || '';
    const [, botID, expiresKey] = (param.match(/^(\d{17,19})(\S+)$/) || [, 'null', 'null']);

    let rCores = [];
    for (const [managerKey, rm] of mainMcCore.roleManagers) {
        if (rm.client.user.id == botID && rm.expiresKey == expiresKey) {
            rCores.push(mainMcCore.roleManagers.get(managerKey));
        }
    }

    if (rCores.length <= 0) {
        res.status(404).send(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        console.log(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        return;
    }

    let rCore = rCores[0];
    try {
        let headers = { "Content-Type": "application/x-www-form-urlencoded" };
        let body = [
            `client_id=${rCore.client.user.id}`,
            `client_secret=${rCore.client.mainConfig.clientSecret}`,
            `grant_type=authorization_code`,
            `code=${req.query.code}`,
            `redirect_uri=${redirectUri}/callback`,
            `scope=connections`
        ].join('&');

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
        let cIDs = [];          // YT channel ID list
        let cIDstring = '';
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
            for (const connect of connections.body) {
                if (connect.type != 'youtube') { continue; }
                cIDs.push(connect.id);
                if (cIDs.length >= 3) { break; }
            }
        }

        // didn't found youtube cID
        if (cIDs.length <= 0) {
            let html = [
                `User: ${username}`,
                `Youtube channel: ERROR! Can't found connect data!`,
                `               : 錯誤! 找不到帳號連結資訊!`
            ].join('<br>')

            res.send(html);
            return;
        } else {
            cIDstring = cIDs.join(',').substring(0, 80);
        }

        // check database
        pgData = (await Pg.getDataByDiscordID(dID))?.rows || [];
        if (pgData.length <= 0) {
            await Pg.creatData(dID, cIDstring);
        } else if (pgData[0].youtube_id != cIDstring) {
            await Pg.updateYoutubeID(dID, cIDstring);
        }

        // get result
        let userData = Pg.dataCache.get(dID);
        let html = [`User: ${username}`,];
        for (let cID of cIDs) {
            html.push(`Youtube channel: https://www.youtube.com/channel/${cID}`);
        }
        for (let key of Object.keys(userData)) {
            if (key != expiresKey) { continue; }
            if (parseInt(userData[key]) != 0) {
                html.push(`${key} in time: ${new Date(parseInt(userData[key])).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);
            } else {
                html.push(`${key} in time: waiting Authorize`);
            }
        }

        const keys = new Set();
        const vIDs = new Set();
        for (const config of mainMcCore.configs) { if (config.expiresKey == expiresKey) { keys.add(config.holoChannelID); } }
        for (const holoChannelID of keys) { for (const [vID, video] of mainMcCore.ytChannelCores.get(holoChannelID).streamList) { vIDs.add(vID); } }
        if (vIDs.size >= 1) {
            html.push(`可在此留言等待bot驗證:`);
            let array = [[], []];

            for (const vID of vIDs) {
                array[0].push(`<iframe width="280" height="157" src="https://www.youtube.com/embed/${vID}"></iframe>`);
                array[1].push(`<iframe width="280" height="400" src="https://www.youtube.com/live_chat?v=${vID}&embed_domain=${redirectUri.replace('https:\/\/', '')}"></iframe>`);
            }

            html.push(array[0].join(' '));
            html.push(array[1].join(' '));
        }

        res.send(html.join('<br>'));

        for (rCore of rCores) {
            // log
            rCore.dcPushEmbed(new EmbedBuilder().setColor(Colors.Green).setDescription(`申請完成: @${username}#${tag} <@${dID}>`));
        }

        // delete yt user from all roleManagers cache
        for (const [managerKey, rm] of mainMcCore.roleManagers) {
            for (let cID of cIDs) {
                rm.memberCache.delete(cID)
            }
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