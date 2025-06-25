
const fs = require('fs');
const compressing = require('compressing');
const request = require('../modules/undici-request.js');
const YoutubeAPI = require('../modules/YoutubeAPI.js');
// discord
const { EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, Colors } = require('discord.js');


const debug = fs.existsSync("./.env");
const isLinux = (require("os").platform() == 'linux');

// url regex
const regUrl = /(?:https?:\/\/)(?:(?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(?:\/(?:watch|v|embed|shorts|live|attribution_link(?:[\?&][^\/&]+)*))?\/(?:(?:(?:watch\?(?:[^\/&]*&)*)?v=)|(?:multiview\/\w{4}))?([\w-]{11})/;

// discord webhook
const redirectUri = process.env.HOST_URL;
// API endpoint
const API_ENDPOINT = 'https://discord.com/api';


// method
let mclog = debug ? console.log : () => { };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const md5 = (source) => require('crypto').createHash('md5').update(source).digest('hex');




// ****** database api ******
const { Pool } = require('pg');
const pgConfig = { connectionString: process.env.DATABASE_URL, ssl: false };
const pool = new Pool(pgConfig);
pool.connect().then(p => { p.end(); }).catch(e => console.log(`[Pg]`, e.message)); // test connect
const memberTime = 1000 * 60 * 60 * 24 * 35;    // 1000 ms  *  60 sec  *  60 min  *  24 hr  *  35 days

class Pg {
    // <discord_id>, <discord_id, youtube_id, ****_expires>
    static dataCache = new Map();
    static state = 'none';

    static async init() {
        this.state = 'init';
        // check table
        if ((await this.checkTable())?.rowCount == 0) {
            console.log(`[Pg] init user_connections database!`);
            await this.creatTable();
        }

        // load data to cache
        const sql = `SELECT * FROM user_connections;`
        const res = await pool.query(sql).catch(e => console.log(`[Pg]`, e.message));
        if (res) {
            for (const pgUser of res.rows) {
                pgUser.discord_id = pgUser.discord_id.trim();
                pgUser.youtube_id = pgUser.youtube_id.trim();
                for (let key of Object.keys(pgUser)) { if (key.includes('_expires')) { pgUser[key] = parseInt(pgUser[key]); } }
                this.dataCache.set(pgUser.discord_id, pgUser);
            }
        }
        if (this.dataCache.size == 0) {
            this.state = 'fail';
            return;
        }

        console.log(`[Pg] Pg.init done, dataCache[${this.dataCache.size}]`);
        this.state = 'ready';
    };

    static async backup(client) {
        for (let i = 0; i < 300; ++i) {
            if (this.state == 'ready' || this.state == 'fail') { break; }
            await sleep(1000); continue;
        }
        if (this.dataCache.size < 300 || debug) { console.log(`[PG] db size: ${this.dataCache.size}`); return; }

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
        const channel = await client.channels.fetch(`872122458545725451`).catch(() => null);
        if (!channel) { console.log(`[PG] can't found: <#872122458545725451> ${client.username}`); return; }
        const msg = await channel.messages.fetch({ message: `1386991400020607006`, force: true }).catch(() => null);
        if (!msg) { console.log(`[PG] can't found message: 1386991400020607006 ${client.username}`); return; }

        // zip db files
        const nowDate = (new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' }))
            .replace(/[\/:]/g, '').replace(', ', '_');
        const filePath = `${nowDate}.zip`;
        await compressing.zip.compressFile(jsonFile, zipFile).catch(() => { });

        // upload zip file
        let files = [new AttachmentBuilder(zipFile, { name: filePath })];
        await msg.edit({ files, embeds: [] }).catch(e => console.log(`[Pg]`, e.message));

        console.log(`[PG] backup to message: 1386991400020607006`);
        // https://discord.com/channels/713622845682614302/872122458545725451/1386991400020607006

        if (fs.existsSync(jsonFile)) { fs.unlinkSync(jsonFile); }
        if (fs.existsSync(zipFile)) { fs.unlinkSync(zipFile); }
    }

    static async initColumn(expiresKey) {
        // check column
        if (!await this.checkColumn(expiresKey)) {
            console.log(`[Pg] init column <${expiresKey}>!`);
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
        return await pool.query(sql).catch((error) => console.log(`[PG] listTable`, error.message));
    };
    static async checkTable() {
        const sql = `SELECT * FROM pg_catalog.pg_tables WHERE tablename='user_connections';`
        return await pool.query(sql).catch((error) => console.log(`[PG] checkTable`, error.message));
    };
    static async creatTable() {
        const sql = [
            `CREATE TABLE user_connections (`,
            `discord_id char(19) PRIMARY KEY,`,
            `youtube_id char(80) NOT NULL`,
            `);`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => console.log(`[PG] creatTable`, error.message));
        return res ? res.rows : null;
    };

    // column api
    static async checkColumn(expiresKey) {
        const sql = `SELECT ${expiresKey} FROM user_connections;`
        return await pool.query(sql).catch((error) => console.log(`[PG] checkColumn`, error.message));
    };
    static async creatColumn(expiresKey) {
        const sql = `ALTER TABLE user_connections ADD COLUMN ${expiresKey} bigint NOT NULL DEFAULT 0;`
        return await pool.query(sql).catch((error) => console.log(`[PG] creatColumn`, error.message));
    };
    static async deleteColumn(expiresKey) {
        const sql = `ALTER TABLE user_connections DROP COLUMN ${expiresKey};`
        return await pool.query(sql).catch((error) => console.log(`[PG] deleteColumn`, error.message));
    };

    // list api
    static async listUserID() {
        return { rows: this.dataCache.keys() };

        // const sql = `SELECT discord_id FROM user_connections;`
        // const res = await pool.query(sql).catch((error) => console.log(`[PG] listUserID`, error.message));
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async listUserData() {
        return { rows: this.dataCache };

        // const sql = `SELECT * FROM user_connections;`
        // const res = await pool.query(sql).catch((error) => console.log(`[PG] listUserData`, error.message));
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
        // const res = await pool.query(sql).catch((error) => console.log(`[PG] listExpiresUserID`, error.message));
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
        // const res = await pool.query(sql).catch((error) => console.log(`[PG] getDataByDiscordID`, error.message));
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async getDataByYoutubeID(youtubeID) {
        return { rows: Array.from(this.dataCache.values()).filter((pgUser) => (pgUser.youtube_id.includes(youtubeID))) };

        // const sql = [
        //     `SELECT * FROM user_connections`,
        //     `WHERE youtube_id='${youtubeID}';`
        // ].join(' ');
        // const res = await pool.query(sql).catch((error) => console.log(`[PG] getDataByYoutubeID`, error.message));
        // if (res) { for (const row of res.rows) { row.discord_id = row.discord_id.trim(); } }
        // return res;
    };
    static async creatData(discordID, youtubeID) {
        const sql = [
            `INSERT INTO user_connections (discord_id, youtube_id)`,
            `VALUES ('${discordID}', '${youtubeID}');`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => console.log(`[PG] creatData`, error.message));

        if (res) {
            const sql = [
                `SELECT * FROM user_connections`,
                `WHERE discord_id='${discordID}';`
            ].join(' ');
            const res2 = await pool.query(sql).catch((error) => console.log(`[PG] creatData`, error.message));
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
        const res = await pool.query(sql).catch((error) => console.log(`[PG] deleteData`, error.message));
        return res;
    };

    static async updateYoutubeID(discordID, youtubeID) {
        this.dataCache.get(discordID).youtube_id = youtubeID;

        const sql = [
            `UPDATE user_connections`,
            `SET youtube_id='${youtubeID}'`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => console.log(`[PG] updateYoutubeID`, error.message));
        return res;
    };
    static async updateExpires(discordID, expiresKey, expires = (Date.now() + memberTime)) {
        this.dataCache.get(discordID)[expiresKey] = expires;

        const sql = [
            `UPDATE user_connections`,
            `SET ${expiresKey}=${expires}`,
            `WHERE discord_id='${discordID}';`
        ].join(' ');
        const res = await pool.query(sql).catch((error) => console.log(`[PG] updateExpires`, error.message));
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

    guild = null;   // 713622845682614302
    /** @type {Map<string, object>} */
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
                        .then(() => { mclog('[MC5] delete emoji.'); })
                        .catch((e) => mclog(`[MC5] delete emoji fail: ${e.message}`));
                    this.guildEmojis = await this.guild.emojis.fetch();
                    if (this.guildEmojis.size < 50) { break; }
                }
            }
        }

        // create new emoji
        let attachment = url.replace(/=s\d+/, `=s256`).replace(/=w\d+/, `=w256`).replace(/-h\d+/, `-h256`)
        let emoji = await this.guild.emojis.create({ attachment, name: md5Name })
            .catch((e) => { mclog(`[MC5] create emoji fail: ${e.message}`); return null; });

        this.guildEmojis = await this.guild.emojis.fetch();

        setTimeout(() => { this.checkEmoji(md5Name); }, 500);
        return emoji;
    }

    checkEmoji(md5Name) {

        let foundEmoji = false;
        for (const [eID, emoji] of this.guildEmojis) {

            if (!emoji.author.bot || emoji.name != md5Name) { continue; }   // skip other emoji

            if (!foundEmoji) { foundEmoji = true; continue; } // found first emoji

            // delete repeat emoji
            emoji.delete()
                .then(() => { mclog('[MC5] delete repeat emoji.'); })
                .catch((e) => mclog(`[MC5] delete repeat emoji fail: ${e.message}`));
        }
    }
}




class RoleManager {
    client = null;

    // guild obj
    guild = null;
    expiresKey = null;
    ytChannelID = null;

    // log method
    dcPushEmbed = async () => { };

    // role obj
    logChannel = null;
    memberRole = null;
    memberLevel = [];

    // config = { client, gID, expiresKey, logChannelID, memberRoleID, memberLevelID: Array }
    constructor(client, gID, config) { if (!client) { return; } this.init(client, gID, config); };
    async init(client, gID, config) {

        this.client = client;

        // get guild, expiresKey
        const { expiresKey, ytChannelID } = config;
        this.guild = await this.client.guilds.fetch(gID);
        this.expiresKey = expiresKey;
        this.ytChannelID = ytChannelID;

        // get log channel
        const { logChannelID } = config;
        const channel = await this.client.channels.fetch(logChannelID);
        if (channel) {
            this.logChannel = channel;
            this.dcPushEmbed = async (embed) => { return await channel.send({ embeds: [embed] }).catch(e => console.log(`[MC5]`, e.message)); };
        } else {
            this.dcPushEmbed = (embeds) => { console.log(embeds?.[0].description || embeds?.[0].data.description); };
        }

        // get guild roles
        const { memberRoleID, memberLevelID = [] } = config;
        this.memberRole = await this.guild.roles.fetch(memberRoleID) || null;
        for (const roleID of memberLevelID) {
            const mRole = await this.guild.roles.fetch(roleID);
            if (!mRole) { continue; }

            this.memberLevel.push(mRole);
        }

        for (let i = 0; i < 300; ++i) {
            if (Pg.state == 'fail') { break; }
            if (Pg.state != 'ready') { await sleep(1000); continue; }
            await this.checkExpiresUser(); break;
        }
    }

    // call on startup
    async checkExpiresUser() {
        // get discord users cache
        await this.guild.members.fetch({ force: true }).catch(e => console.log(`[MC5]`, e.message));

        const pgData = (await Pg.listUserData())?.rows || [];
        mclog(`[MC5] Pg.listUserData[${pgData.size}]`);

        //
        const roles = [this.memberRole].concat(this.memberLevel);
        for (let [dID, guildMember] of this.memberRole.members) {

            const pgData = (await Pg.getDataByDiscordID(dID))?.rows || [];
            if (pgData.length > 0) { continue; }

            // user with role but not in database, remove role
            mclog(`[MC5] checkExpiresUser`, dID.toString().padStart(20, ' '), guildMember.user.tag.toString().padStart(40, ' '));
            for (const role of roles) {
                if (!guildMember.roles.cache.has(role.id)) { continue; }
                guildMember.roles.remove(role).catch((e) => { console.log('[MC5]', e.message) });
                // console.log(this.client.user.tag, `roles.remove`, guildMember.user.id, role.name);
            }
        }

        // check user who in database
        for (const [dID, pgUser] of pgData) {
            // pgUser = { discord_id: '244255110572670987', youtube_id: 'UCgUpDIQ7Cq4kJETqZhGk7Kg', ssrb_expires: '0', kzmi_expires: '0' }

            // get user data from guild
            let dcUser = this.guild.members.cache.get(dID);
            if (!dcUser) {
                // mclog(`[MC5] User <@${dID}> not in guild <${this.guild}>`);
                continue;
            }

            // check user level
            const isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);

            // check user expires
            const userExpires = pgUser[this.expiresKey];
            const isExpiredUser = (userExpires <= Date.now());  // 過期
            if (userExpires == 0 && !debug) { continue; }


            if (isExpiredUser) {
                Pg.updateExpires(dID, this.expiresKey, 0);

                if (isSpecalUser) {
                    mclog(`[MC5] User <@${dID}> expired, Remove role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`認證過期, 刪除身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));

                    // remove roles
                    for (const role of roles) {
                        if (!dcUser.roles.cache.has(role.id)) { continue; }
                        dcUser.roles.remove(role).catch((e) => { console.log('[MC5]', e.message) });
                        // console.log(this.client.user.tag, `roles.remove`, dcUser.user.id, role.name);
                    }
                }
                // else { mclog(`[MC5] In guild without role <${this.memberRole.name}>, User <@${dcUser.user.tag}>.`); }
            } else {
                if (!isSpecalUser) {
                    mclog(`[MC5] User <@${dID}> without role, Add role!`);
                    this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(`確認期限, 恢復身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));
                    dcUser.roles.add(this.memberRole).catch(() => null);
                    // console.log(this.client.user.tag, `roles.add`, dcUser.user.id, this.memberRole.name);
                }
                // else { mclog(`[MC5] In guild with role <${this.memberRole.name}>, User <@${dcUser.user.tag}>.`); }
            }
        }
    }


    // <youtubeID, isChatSponsor>
    /** @type {Map<string, boolean>} */
    memberCache = new Map();
    // method for outside call
    async roleManagerOnLiveChat({ auDetails }) {   // rm.onLiveChat

        // get user cID
        const userYoutubeID = auDetails.channelId;

        if (Pg.state != 'ready') { return; }
        // get dbData 
        const pgUser = ((await Pg.getDataByYoutubeID(userYoutubeID))?.rows || [null])[0];
        // mclog(`[MC5] User not in database: ${auDetails.displayName}`);
        if (!pgUser) { return; }

        const dID = pgUser.discord_id;
        const dcUser = this.guild.members.cache.get(dID);
        // mclog(`[MC5] User <@${dID}> not in guild <${this.guild}>`);
        if (!dcUser) { return; }


        // check user level
        const isSpecalUser = dcUser.roles.cache.has(this.memberRole.id);
        const isChatSponsor = (auDetails.isChatSponsor || auDetails.isChatOwner || auDetails.isChatModerator);
        const sponsorLevel = auDetails.sponsorLevel;

        // skip if sponsor statu didnt change
        if (this.memberCache.has(userYoutubeID)) {
            if (this.memberCache.get(userYoutubeID) == isChatSponsor) { return; }
            // sponsor statu changed, need to set user role again
        } else {
            // set sponsor statu flag to cache space
            this.memberCache.set(userYoutubeID, isChatSponsor);
        }

        // set user role
        if (isChatSponsor) {
            await Pg.updateExpires(dID, this.expiresKey);

            if (isSpecalUser) {
                mclog(`[MC5] Guild <${this.guild}>, found User <${auDetails.displayName}>, Update Expires <${this.expiresKey}>!`);
                const embedLog = `認證成功, 延展期限`
                    + ((sponsorLevel <= 0) ? ': ' : `(Lv.${sponsorLevel}): `)
                    + `@${dcUser.user.tag} ${dcUser.toString()}`;
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Aqua).setDescription(embedLog));
            }
            if (!isSpecalUser) {
                mclog(`[MC5] Guild <${this.guild}>, found User <${auDetails.displayName}>, Add Role!`);
                const embedLog = `認證成功, 新增身分組`
                    + ((sponsorLevel <= 0) ? `(${this.memberRole}): ` : `(${this.memberRole} Lv.${sponsorLevel}): `)
                    + `@${dcUser.user.tag} ${dcUser.toString()}`;
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Blue).setDescription(embedLog));
                dcUser.roles.add(this.memberRole).catch(e => console.log(`[MC5]`, e.message));
                // console.log(this.client.user.tag, `roles.add`, dcUser.user.id, this.memberRole.name);
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
                        // console.log(this.client.user.tag, `roles.add`, dcUser.user.id, role.name);
                    } else {
                        dcUser.roles.remove(role).catch(() => { });
                        // console.log(this.client.user.tag, `roles.remove`, dcUser.user.id, role.name);
                    }
                }
            }
        }
        if (!isChatSponsor) {
            if (pgUser[this.expiresKey] != 0) { Pg.updateExpires(dID, this.expiresKey, 0); }

            if (isSpecalUser) {
                mclog(`[MC5] Guild <${this.guild}>, found User <${auDetails.displayName}>, Remove role!`);
                await this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Red).setDescription(`非會員, 刪除身分組(${this.memberRole}): @${dcUser.user.tag} ${dcUser.toString()}`));
                dcUser.roles.remove(this.memberRole).catch(() => null);
                // console.log(this.client.user.tag, `roles.remove`, dcUser.user.id, this.memberRole.name);
            }
            // if (!isSpecalUser) {
            //     mclog(`[MC5] Guild <${this.guild}>, found User <${auDetails.displayName}>.`);
            //     this.dcPushEmbed(new EmbedBuilder().setColor(Colors.Orange).setDescription(`${pgUser[this.expiresKey] > 0 ? '申請無效, 清除申請' : '申請無效'}: @${dcUser.user.tag} ${dcUser.toString()}`));
            // }
            // remove level role
            for (const role of this.memberLevel) {
                if (!dcUser.roles.cache.has(role.id)) { continue; }
                dcUser.roles.remove(role).catch(() => null);
                // console.log(this.client.user.tag, `roles.remove`, dcUser.user.id, role.name);
            }
        }

        // console.log(
        //     `[Livechat ${this.ytChannelID}]`,
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

}




async function livechatToEmbed(vID, auDetails) {

    const embed = new EmbedBuilder();
    // set color
    if (auDetails.isChatOwner) { embed.setColor(0xFFD600); }
    else if (auDetails.isChatModerator) { embed.setColor(0x5F84F1); }
    else if (auDetails.isVerified) { embed.setColor(0x16C60C); }
    else if (auDetails.isChatSponsor) { embed.setColor(0x13B56E); }

    if (auDetails.message) {
        let message = auDetails.message;
        let message2 = auDetails.message;

        // fix emojis text
        if (auDetails.emojis && auDetails.emojis.size > 0) {

            for (const [name, { url }] of auDetails.emojis) {
                // check emoji in guild or not
                // check emoji text valid
                let md5Name = /^[A-Za-z0-9_]+$/.test(name) ? name : md5(name);
                let emoji = await mainMcCore.emojiManager.getEmoji(url, md5Name);

                if (!emoji) { continue; }   // something wrong?
                // now emoji in guild
                // replace message emoji string
                message = message.replaceAll(`${name}`, `<:${emoji.name}:${emoji.id}>`);
                message2 = message2.replaceAll(`${name}`, '');
                // next custom emoji
            }
        }

        if (message2.trim() == '') { message = '# ' + message; }
        embed.setDescription(message);
    }

    let footerText = vID;
    if (auDetails.timestampUsec) {
        const timestamp = parseInt(auDetails.timestampUsec / 1000);
        // if (Date.now() - timestamp > 30 * 1000) { timestamp = null; } 
        const timestampString = new Date(timestamp).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' });
        footerText += ` - ${timestampString}`;
    }
    // else if (auDetails.videoOffsetTimeMsec) {         // for upcoming & live, need video data
    //     const offsetTimeMsec = auDetails.videoOffsetTimeMsec;
    //     if (offsetTimeMsec < -30 * 1000) { timestamp = null; }
    //     timestamp = `scheduledStartTime` + offsetTimeMsec;
    // }
    embed.setFooter({ text: footerText });


    let url = `https://youtu.be/${vID}`;
    if (auDetails.timestampText) {                      // for archive
        let timeText = '00:00:' + auDetails.timestampText;
        let [, hrs, min, sec] = timeText.match(/(\d+):(\d+):(\d+)$/) || [, '00', '00', '00'];
        timeText = `${hrs}h${min}m${sec}s`.replace(/^[0hm]+/, '');

        url = `https://youtu.be/${vID}&t=${timeText}`;
        const offsetTimeMsec = ((hrs * 60 + parseInt(min)) * 60 + parseInt(sec)) * 1000;
    }


    embed.setAuthor({
        name: auDetails.displayName, url,
        iconURL: auDetails.profileImageUrl
    });

    return embed;
}




class YoutubeChannelTracer {

    ytChannelID = null;
    apikey = 4;
    once = false;
    constructor(cID, once = false) {
        this.ytChannelID = cID

        if (cID == 'UCUKD-uaobj9jiqB-VXt71mA') { this.apikey = 0; }
        else if (cID == 'UC_vMYWcDjmfdpH6r4TTn1MQ') { this.apikey = 1; }
        else if (cID == 'UC1iA6_NT4mtAcIII6ygrvCw') { this.apikey = 2; }
        else { this.apikey = 3; }

        this.once = once;
    };

    // <vID>, <video>
    /** @type {Map<string, object>} */
    videos = new Map();
    // update video list, get upcoming / live video ID
    // call on starup / by time
    async getVideoSearch({ eventType, useAPI = false, useInTube = true }) {

        let source = [];
        if (useAPI && !debug) { source = source.concat(await YoutubeAPI.getVideoSearchByApi({ channelId: this.ytChannelID, eventType })); }
        if (useInTube) {
            source = source.concat(await YoutubeAPI.getVideoSearchByInTube({ channelId: this.ytChannelID, eventType, isMemberOnly: false }));
            source = source.concat(await YoutubeAPI.getVideoSearchByInTube({ channelId: this.ytChannelID, eventType, isMemberOnly: true }));
        }

        for (const video of source) {
            const vID = video?.id?.videoId || video?.id || null;
            if (!vID) { continue; }

            this.videos.set(vID, video);
            mclog(`[MC5] Tracing <${this.ytChannelID}> videos add <${vID} ${video.snippet.liveBroadcastContent}>`);
        }
        mclog(`[MC5] Tracing <${this.ytChannelID}> videos[${this.videos.size}]`);
    }

    // channel name
    // set on startup
    dcChannels = [];
    moChannels = [];
    // call by time
    setChannelsName() {
        const { onLive, onMoLive } = this.getLiveStatu();

        for (const channel of this.dcChannels) {
            this.setChannelName(channel, onLive);
        }
        for (const channel of this.moChannels) {
            this.setChannelName(channel, onMoLive);
        }
    }
    getLiveStatu() {
        let onLive = false;
        let onMoLive = false;

        for (const [vID, video] of this.videos) {
            if (video.snippet?.liveBroadcastContent != 'live') { continue; }
            if (video.isMemberOnly) { onMoLive = true; }
            else { onLive = true; }
        }
        return { onLive, onMoLive };
    }
    settingChannel = new Set();
    setChannelName(channel, onLive) {
        if (this.settingChannel.has(channel.id)) { return; }

        // skip unset channel
        if (!/^[🔴⚫]/.test(channel.name)) { return; }
        let channelName = `${(onLive ? '🔴' : '⚫')}${channel.name.replace(/^[🔴⚫]+/, '')}`;

        if (channel.name == channelName) { return; }

        // setting
        this.settingChannel.add(channel.id);
        console.log(`[MC5] <#${channel.id}> set name to ${channelName}, tasks[${this.settingChannel.size}]`);

        channel.setName(channelName)
            .then((newChannel) => {
                this.settingChannel.delete(channel.id);
                console.log(`[MC5] <#${channel.id}> now name is ${newChannel.name}, tasks[${this.settingChannel.size}]`);
            })
            .catch((error) => {
                console.log(`[MC5]`, channel.client.username, channel.name, error.message);
                // console.log(permissions.has(PermissionFlagsBits.ManageChannels));
                this.settingChannel.delete(channel.id);
            });
    }


    // user role
    /** @type {Array<RoleManager>} */
    guildRoleManagers = [];
    addGuildRoleManager(client, gID, config) {
        this.guildRoleManagers.push(new RoleManager(client, gID, config));
    }

    // <vID>, <LiveChat>
    /** @type {Map<string, LiveChat>} */
    tracingLiveChats = new Map();
    tracingLive = 0;
    async startTraceLivechat() {
        // update video status
        for (const [vID, video] of this.videos) {

            // get stream statu
            const status = video?.snippet?.liveBroadcastContent;

            if (status == 'upcoming') {
                const startTime = video.liveStreamingDetails?.scheduledStartTime || 0;
                if (Date.parse(startTime) > Date.now()) { continue; }   // skip real upcoming video

                // it's live time, update video data
                const _video = await YoutubeAPI.getVideoStatusByInTube({ vID });
                this.videos.set(vID, _video);
            }
        }

        // start trace
        for (const [vID, video] of this.videos) {
            if (this.tracingLiveChats.has(vID)) { continue; }

            // get stream statu
            const status = video?.snippet?.liveBroadcastContent;

            if (['upcoming', 'live'].includes(status)) {
                this.tracingLiveChats.set(vID, null);

                const livechat = await YoutubeAPI.getFetchingLiveChatByInTube(vID);
                this.tracingLiveChats.set(vID, livechat);

                livechat.on('chat-update', async (raw) => {
                    if (!raw.item) { return; }
                    const author = raw.item.author;
                    const message = raw.item.message;
                    if (!author || !message) { return; }


                    // livechat object
                    const auDetails = {
                        channelId: author.id, channelUrl: `https://www.youtube.com/channel/${author.id}`,
                        displayName: author.name, profileImageUrl: author.thumbnails?.pop()?.url || null,
                        timestampUsec: parseInt(raw.item.timestamp_usec) || null,
                        videoOffsetTimeMsec: parseInt(Date.now() - Date.parse(video.liveStreamingDetails.scheduledStartTime)) || null,

                        isChatOwner: false, isChatSponsor: false,
                        isChatModerator: author.is_moderator,
                        isVerified: author.is_verified || author.is_verified_artist,
                        sponsorLevel: -1,
                        timestampText: null,    // 12:34:56
                        message: null, emojis: new Map(), superchat: null
                    }

                    // member badge
                    for (const badge of author.badges || []) {
                        const tooltip = badge.tooltip || 'null';

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
                                default: { auDetails.sponsorLevel = -1; console.log(`[MC5] unknown tooltip:`, tooltip); } break;
                            }
                        }
                        else if (tooltip == 'Verified') { auDetails.isVerified = true; }
                        else if (tooltip == 'Moderator') { auDetails.isChatModerator = true; }
                        else if (tooltip == 'Owner') { auDetails.isChatOwner = true; }
                    }


                    // update user role
                    for (const rm of this.guildRoleManagers) {
                        rm.roleManagerOnLiveChat({ auDetails });
                    }

                    // send spacel message to this channels
                    const channels = [];
                    const isSpacelUserMsg = auDetails.isVerified || auDetails.isChatModerator || auDetails.isChatOwner;
                    if (isSpacelUserMsg ||
                        (video.snippet.liveBroadcastContent == 'upcoming') ||
                        (debug && Math.floor(Math.random() * 100) == 0)   // debug code
                    ) {
                        // send spacel message to channel
                        const video = this.videos.get(vID);
                        const isMemberOnly = video.isMemberOnly;
                        for (const channel of (isMemberOnly ? this.moChannels : this.dcChannels)) {

                            if (isSpacelUserMsg || channel.guildId == '713622845682614302') {
                                channels.push(channel);
                            }
                        }
                    }
                    // skip if don't need to send msg (skip emoji method)
                    if (channels.length <= 0) { return; }


                    // timestamp
                    const videoOffsetTimeMsec = parseInt(auDetails.videoOffsetTimeMsec / 1000);
                    if (videoOffsetTimeMsec > 0) {
                        const sec = parseInt(videoOffsetTimeMsec % 60).toString().padStart(2, '0');
                        const min = parseInt((videoOffsetTimeMsec / 60) % 60).toString().padStart(2, '0');
                        const hrs = parseInt(videoOffsetTimeMsec / 3600).toString().padStart(2, '0');
                        auDetails.timestampText = hrs + ':' + min + ':' + sec;
                    }

                    // message text
                    let messageStr = message.text || '';
                    for (const run of message?.runs || []) {
                        if (!run?.emoji) { continue; }

                        const emoji_id = run.emoji.emoji_id;
                        // if (emoji_id.length <= 1) { continue; }

                        const shortcuts = run.emoji.shortcuts?.pop();
                        const emojiImg = run.emoji.image?.pop();
                        if (!shortcuts || !emojiImg) { continue; }
                        auDetails.emojis.set(shortcuts, emojiImg);

                        messageStr = messageStr.replaceAll(emoji_id, shortcuts);
                    }
                    auDetails.message = messageStr;

                    // send embed
                    const embed = await livechatToEmbed(vID, auDetails);
                    for (const channel of channels) {
                        channel.send({ embeds: [embed] }).catch(e => console.log(`[MC5]`, e.message));
                    }
                });

                livechat.once('start', (initial_data) => { console.log(`[MC5] <${vID}> start at`, new Date(Date.now()).toISOString()); });
                livechat.once('end', async () => {
                    console.log(`[MC5] <${vID}> end at`, new Date(Date.now()).toISOString());
                    // update video when end
                    const _video = await YoutubeAPI.getVideoStatusByInTube({ vID });
                    this.videos.set(vID, _video);
                });

                livechat.start();

            } else {
                this.tracingLiveChats.delete(vID);
                this.videos.delete(vID);
                continue;
            }
        }

        this.tracingLive = 0;
        for (const [vID, livechat] of this.tracingLiveChats) {
            const video = this.videos.get(vID) || null;
            const status = video?.snippet?.liveBroadcastContent || 'none';
            if (status == 'live') { ++this.tracingLive; }
        }
    }

    destroy() {
        for (const [vID, livechat] of this.tracingLiveChats) {
            livechat.stop();
        }
    }
}




class MainMemberCheckerCore {
    emojiManager = new EmojiManager();

    // <ytID>, <tracer>
    /** @type {Map<string, YoutubeChannelTracer>} */
    tracerList = new Map();

    constructor() {
        Pg.init();
        // clock method
        this.interval = setTimeout(this.timeoutMethod, 2000);
    }

    async addNewTracer(client, gID, config, once = false) {

        const ytID = config.ytChannelID;

        const tracer = this.tracerList.get(ytID) || new YoutubeChannelTracer(ytID, once);
        if (!once) {
            // get upcoming by API when start up, skip if is trace cmd
            tracer.getVideoSearch({ eventType: 'upcoming', useAPI: true, useInTube: false });
            tracer.getVideoSearch({ eventType: 'live' });
        }
        if (config.streamChannelID) {
            const channel = await client.channels.fetch(config.streamChannelID).catch(() => null);
            if (channel) {
                // check channel permissions
                let permissions = channel.permissionsFor(channel.guild.members.me);
                if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
                    mclog(`[MC5] Missing Permissions: MANAGE_CHANNELS in <#${ytID}>`);
                } else {
                    tracer.dcChannels.push(channel);
                }
            }
        }
        if (config.memberChannelID) {
            const channel = await client.channels.fetch(config.memberChannelID).catch(() => null);
            if (channel) {
                // check channel permissions
                let permissions = channel.permissionsFor(channel.guild.members.me);
                if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
                    mclog(`[MC5] Missing Permissions: MANAGE_CHANNELS in <#${ytID}>`);
                } else {
                    tracer.moChannels.push(channel);
                }
            }
        }

        if (config.memberRoleID) {
            tracer.addGuildRoleManager(client, gID, config);
        }

        this.tracerList.set(ytID, tracer);

        mclog(`[MC5] MMCCore ytChannel tracerList[${this.tracerList.size}]`);
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

        if (minutes % 15 == 5 && seconds == 0) {
            for (const [ytID, tracer] of this.tracerList) {
                // update video list
                tracer.getVideoSearch({ eventType: 'upcoming' });
                tracer.getVideoSearch({ eventType: 'live' });
            }
        }

        if (seconds % 10 == 0) {
            for (const [ytID, tracer] of this.tracerList) {
                if (!debug || 1) {
                    // update channel name
                    tracer.setChannelsName();
                }
                // update live trace statu
                tracer.startTraceLivechat();
            }
        }
    }

    destroy() {
        for (const [ytID, tracer] of this.tracerList) {
            tracer.destroy();
        }
        clearTimeout(this.interval);
    }
}
const mainMcCore = new MainMemberCheckerCore();




module.exports = {
    name: 'member checker v5',
    description: "check who is SSRB",

    async execute(message, pluginConfig, command, args, lines) {

        if (!command) { return false; }
        const { client, guild, channel } = message;
        const gID = guild.id;

        const guildConfig = client.getPluginConfig(gID, 'memberChecker5');
        if (!guildConfig) { return; }

        // check cmd in any config's log channel or not
        const isLogChannel = (() => {
            for (const config of guildConfig) {
                if (channel.id == config.logChannelID) { return true; }
            } return false;
        })();


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
        if (isLogChannel && command == 'user') {

            // need searcg args
            const dID = args[0];
            if (!dID) { channel.send({ embeds: [new EmbedBuilder().setDescription(`!user <user discord ID>`)] }); return; }

            // find data by discordID in database
            let data = ((await Pg.getDataByDiscordID(dID.trim()))?.rows || [])[0];
            if (data) { channel.send({ content: `\`\`\`js\n${dID}\n${JSON.stringify(data, null, 2)}\`\`\`` }); return; }

            // find databy youtubeID in
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

            // need searcg args
            let dID = args[0];
            if (!dID) { channel.send({ embeds: [new EmbedBuilder().setDescription(`!removeuser <user discord ID>`)] }); return; }

            // remove data by discordID in database
            let data = ((await Pg.deleteData(dID.trim()))?.rows || [])[0];
            if (data) { channel.send({ content: `\`\`\`js\n${dID}\n${JSON.stringify(data, null, 2)}\`\`\`` }); return; }

            channel.send({ content: "```js\n" + dID + `\nResult: 0` + "```" });
            return;
        }
        // clear member cache
        if (isLogChannel && command == 'membercache') {

            for (const [ytID, tracer] of mainMcCore.tracerList) {
                for (const rm of tracer.guildRoleManagers) {
                    if (rm.guild.id != gID) { continue; }
                    rm.memberCache.clear();
                }
            }

            channel.send({ embeds: [new EmbedBuilder().setDescription(`Member cache Cleared!`)] });
            return;
        }

        // get member url
        if (command == 'member') {

            for (const [ytID, tracer] of mainMcCore.tracerList) {
                for (const rm of tracer.guildRoleManagers) {
                    if (rm.client.user.id != client.user.id || rm.guild.id != gID) { continue; }
                    channel.send({ content: `<${rm.get301Url()}>` });
                    // return;
                }
            }
            return;
        }

        if (command == 'stream') {

            if (regUrl.test(args[0])) { // get vID
                const [, vID] = args[0].match(regUrl);
                const video = await YoutubeAPI.getVideoStatusByInTube({ vID });
                console.log(video?.snippet?.liveBroadcastContent, video?.snippet?.channelId)
                if (!video) { return; }
                if (!['upcoming', 'live'].includes(video.snippet.liveBroadcastContent)) { return; }

                const ytChannelId = video.snippet.channelId;
                if (!mainMcCore.tracerList.has(ytChannelId)) { return; }

                mainMcCore.tracerList.get(ytChannelId).videos.set(vID, video);

                // send log
                for (const rm of mainMcCore.tracerList.get(ytChannelId).guildRoleManagers) {
                    rm.dcPushEmbed(new EmbedBuilder().setColor(Colors.DarkGold).setDescription(`手動新增直播清單`).setFooter({ text: ytChannelId }));
                }

            } else {
                if (isLogChannel) {
                    // update all videos
                    for (const [ytID, tracer] of mainMcCore.tracerList) {
                        if (tracer.once) { continue; }  // skip if tracer generate by trace cmd

                        tracer.getVideoSearch({ eventType: 'upcoming' });
                        tracer.getVideoSearch({ eventType: 'live' });
                    }
                } else {
                    // show all videos

                    // get tracer by ytID
                    for (const { ytChannelID } of guildConfig) {
                        const tracer = mainMcCore.tracerList.get(ytChannelID);
                        if (!tracer) { continue; }

                        // check tracer's rm
                        for (const rm of tracer.guildRoleManagers) {
                            // if tracer with rm in this guild
                            if (rm.client.user.id != client.user.id || rm.guild.id != gID) { continue; }


                            // set stream list for msg
                            const upcomingList = [];
                            const liveList = [];

                            for (const [vID, video] of tracer.videos) {
                                // get cache
                                if (!video) { mclog(`[MC5]         null <null>`); continue; }

                                // check stream start time
                                let status = video.snippet.liveBroadcastContent;
                                mclog(`[MC5] ${status.padStart(12, ' ')} <${video.snippet.title}>`);

                                // get video data
                                let description = video ? video.snippet.title : vID;
                                if (status == 'upcoming') {
                                    upcomingList.push(`[${description}](https://youtu.be/${vID})`);
                                } else if (status == 'live') {
                                    liveList.push(`[${description}](https://youtu.be/${vID})`);
                                }
                            }
                            const streamList = [].concat(['直播中:'], liveList, ['待機台:'], upcomingList);


                            // send/show stream list msg
                            const embed = new EmbedBuilder().setColor(Colors.DarkGold);
                            if (streamList.length <= 0) { embed.setDescription(`目前沒有直播台/待機台`); }
                            else { embed.setDescription(streamList.join('\n')); }
                            embed.setFooter({ text: rm.ytChannelID });
                            channel.send({ embeds: [embed] });
                        }
                    }
                }
            }
        }

        if (command == 'trace' && regUrl.test(args[0]) && message.author?.id == '353625493876113440') {
            // get vID 
            const [, vID] = args[0].match(regUrl) || [, null];
            const video = await YoutubeAPI.getVideoStatusByInTube({ vID });
            if (!video) { return; }
            if (!['upcoming', 'live'].includes(video.snippet.liveBroadcastContent)) { return; }

            const ytChannelId = video.snippet.channelId;
            if (!mainMcCore.tracerList.has(ytChannelId)) {
                const config = {
                    ytChannelID: ytChannelId,
                    streamChannelID: channel.id,
                    memberChannelID: null,

                    memberRoleID: null,
                    expiresKey: null,
                    logChannelID: null,
                    memberLevelID: [],
                }
                await mainMcCore.addNewTracer(client, gID, config, true)
            }
            mainMcCore.tracerList.get(ytChannelId).videos.set(vID, video);
        }

    },

    async setup(client) {

        await YoutubeAPI.waitInnertubeInit();


        for (let gID of client.guildConfigs.keys()) {

            const pluginConfig = client.getPluginConfig(gID, 'memberChecker5');
            if (!pluginConfig) { continue; }

            // const config = {
            //     ytChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,

            //     streamChannelID: '775100135515750470',  // #⚫🌿獅白直播-streamchat <#775100135515750470>
            //     memberChannelID: '790236195794976808',  // #⚫獅白會限直播討論用 <#790236195794976808>

            //     memberRoleID: '847652060903243846',      // ししろん的勞工 <@&847652060903243846>
            //     expiresKey: 'ssrb_expires',
            //     logChannelID: '904053455377825833',      // #獅白yt會限認證紀錄 <#904053455377825833>
            //     memberLevelID: [
            //         '1140986754170638418', '1140986852908728340', '1140986897758441582', '1140986950837354607',    // 新會員 <@&1140986754170638418>
            //         '1140987055296487535', '1140987107905638441', '1140987355403132928', '1140987431521366107'    // 第 12 個月 <@&1140987055296487535>
            //     ],
            // }


            // pick SSRB bot for emoji manager
            // pick SSRB bot for PG backup
            if (client.user.id == '713624995372466179' && gID == '713622845682614302') {
                // mclog(`[MC5] EmojiManager.init`);
                mainMcCore.emojiManager.init(client);

                Pg.backup(client);
            }

            for (let config of pluginConfig) {
                // get guild object
                const guild = client.guilds.cache.get(gID);
                if (!guild) { continue; }    // bot not in guild
                if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) { console.log(`[MC5] Missing Permissions: MANAGE_ROLES in <${gID}>`); continue; }
                if (!guild.members.me.permissions.has(PermissionFlagsBits.SendMessages)) { console.log(`[MC5] Missing Permissions: SEND_MESSAGES in <${gID}>`); continue; }

                await mainMcCore.addNewTracer(client, gID, config);
            }
        }



        client.once('close', () => {
            // offline msg
            mainMcCore.destroy();
        });
    },


    // async clockMethod(client, { hours, minutes, seconds }) {
    //     mainMcCore.clockMethod({ hours, minutes, seconds });
    // },

    idleCheck() {
        // todo
        // tracer:client pair for idleCheck result
        for (const [ytID, tracer] of mainMcCore.tracerList) {
            if (tracer.tracingLive > 0) {
                return false;
            }
            return true;
        }
    }
}




// express
const app = require('../server.js').app;
app.all(`/member/:botid/:ekey`, async (req, res) => {
    const botID = req.params.botid;
    const expiresKey = req.params.ekey;

    for (const [ytID, tracer] of mainMcCore.tracerList) {
        for (const rm of tracer.guildRoleManagers) {
            if (rm.client.user.id == botID && rm.expiresKey == expiresKey) {
                res.redirect(301, rm.getAuthorizeUrl());
                return;
            }
        }
    }

    res.send(`不明的參數組! 請聯絡管理員或製作者\n${botID}, ${expiresKey}`);
});

app.all('/callback', async (req, res) => {
    const param = req.query.state || '';
    const [, botID, expiresKey] = (param.match(/^(\d{17,19})(\S+)$/) || [, 'null', 'null']);

    const rmList = [];
    for (const [ytID, tracer] of mainMcCore.tracerList) {
        for (const rm of tracer.guildRoleManagers) {
            if (rm.client.user.id == botID && rm.expiresKey == expiresKey) {
                rmList.push(rm);
            }
        }
    }

    if (rmList.length <= 0) {
        res.status(404).send(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        console.log(`ERR! cant found member checker core (${botID}, ${expiresKey})`);
        return;
    }

    let rm = rmList[0];
    try {
        let headers = { "Content-Type": "application/x-www-form-urlencoded" };
        let form = {
            client_id: rm.client.user.id,
            client_secret: rm.client.mainConfig.clientSecret,
            grant_type: `authorization_code`,
            code: req.query.code,
            redirect_uri: `${redirectUri}/callback`,
            scope: `connections`
        }

        // get oauth2 token
        let tokenResponse = await request.post({ url: `${API_ENDPOINT}/oauth2/token`, headers, form })
        let { access_token } = tokenResponse.body;
        // response.body = {
        //     access_token: '------------------------------', expires_in: 604800,
        //     refresh_token: '------------------------------', scope: 'connections', token_type: 'Bearer'
        // }

        // get user connections
        headers = { Authorization: "Bearer " + access_token }
        let identify = await request.get({ url: `${API_ENDPOINT}/users/@me`, headers })
        let connections = await request.get({ url: `${API_ENDPOINT}/users/@me/connections`, headers })
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
                `               : 錯誤! 找不到 Discord 對 Youtube 的帳號連結資訊!`
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

        const vIDs = new Set();
        for (const [ytID, tracer] of mainMcCore.tracerList) {
            for (const rm of tracer.guildRoleManagers) {
                if (rm.client.user.id == botID && rm.expiresKey == expiresKey) {
                    for (const [vID, livechat] of tracer.tracingLiveChats) {
                        vIDs.add(vID);
                    }
                }
            }
        }
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

        for (rm of rmList) {
            // log
            rm.dcPushEmbed(new EmbedBuilder().setColor(Colors.Green).setDescription(`申請完成: @${username}#${tag} <@${dID}>`));
        }

        // delete yt user from all roleManagers cache
        for (const rm of rmList) {
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