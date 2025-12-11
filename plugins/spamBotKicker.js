
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// regex
const regexToken = /(mfa\.[\w-]{84}|[\w-]{24}\.[\w-]{6}\.[\w-]{27})/;
const regexMentions = /(@here|@everyone)/i;
const regexInviteUrl = /(https?:\/\/)?discord.gg\/\S+/i;
const regexPhishing = /\[steamcommunity.+\]\(<?http/i;
const blacklistUser = ['GrastonBerry', '_CMRA_', 'sui1911', '_fromCanadaorg', 'CannabisEDCA', 'cannabisORGca', 'CannabisCDN', 'gochidesu459', 'PagallKhana'];
const blacklistWord = ['PagallKhana'];
const regexTweet = new RegExp(`twitter\.com\/([^\/\s]+)\/?`);


const md5 = (source) => require('crypto').createHash('md5').update(source).digest('hex');
const md5FromUrl = async (url) => {
    // 取得回應
    const res = await fetch(url).catch(() => null); if (!res?.ok) { return null; };
    // 建立 MD5 hash
    const hash = require('crypto').createHash('md5');
    // 將回傳的 stream 直接導入 hash
    await require('util').promisify(require('stream').pipeline)(res.body, hash);
    // 取得 md5 字串
    return hash.digest('hex');
}


// spam bot Level 1 (only delete message)
const spamChecker = [

    // bot token spam
    ({ message }) => {
        const { content } = message;

        // regex
        const match = content.match(regexToken);
        if (!match) { return null; }

        // result
        const [, token] = match;
        return {
            content: content.replace(regexToken, `<Bot Token: String[${token.length}]>`),
            reason: `Discord Bot Token`,
            delete: true, kick: false, forceDel: true,
        }
    },

    // normal bot spam
    ({ message }) => {
        const { guild, client, author, createdTimestamp, content, embeds, attachments } = message;
        const gID = guild.id;


        const spamFilter = function (args) {

            for (const [count, sec, blurMode] of args) {

                let tempMessage = guildMessagesCache[client.user.id][gID]
                    .filter((msg) => (
                        msg.author.id == author.id &&   // same author
                        msg.author.displayName == author.displayName &&  // same author for wehhook msg
                        (
                            (content.length > 0 && msg.content == content) ||                                   // same message  or
                            (embeds.length > 0 && msg.embeds.join('\n') == embeds.join('\n')) ||                // same embed  or
                            (attachments.length > 0 && msg.attachments.join('\n') == attachments.join('\n')) || // same attachment  or
                            blurMode                                                                            // random spam message
                        ) &&
                        (Math.abs(msg.createdTimestamp - createdTimestamp) < (sec * 1000))  // in time
                    ));

                if (tempMessage.length >= count) {
                    return tempMessage;
                }   // is spam
            }
            return false;
        }

        let spamMessage = spamFilter([
            [20, 4, true],              // 20 random message in 4.000 sec
            [12, 2, true]               // 12 random message in 2.000 sec
        ]);

        const judgeKick = !!spamMessage;
        if (!judgeKick) {
            spamMessage = spamFilter([
                [3, 20, false],         // 3 same message in 20.000 sec
                [6, 60, false]          // 6 same message in 60.000 sec
            ]);

            if (!spamMessage) { return null; }
        }

        // Prepare to delete
        // sort by channel
        let bulkDelMessage = {};
        for (let dMsg of spamMessage) {
            const msg = dMsg.raw;
            const { channel } = msg;
            const cID = channel.id;
            if (!bulkDelMessage[cID]) { bulkDelMessage[cID] = { channel, messages: [] }; }
            bulkDelMessage[cID].messages.push(msg);
        }
        // bulkDelete by channel
        for (let cID of Object.keys(bulkDelMessage)) {
            const channel = bulkDelMessage[cID].channel;
            if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
                const bulkDel = bulkDelMessage[cID].messages;
                channel.bulkDelete(bulkDel).catch((err) => { if (err.message != 'Unknown Message') { console.log(`[SBK] ${err.message}`); } });
            }
        }

        // result
        return {
            content,
            reason: `洗頻訊息`,
            // delete: true, kick: true, forceDel: true,
            delete: true, kick: judgeKick, forceDel: true, silent: !judgeKick,  // test run
        }
    },

    // @everyone
    // @here
    // try mentions everyone messages
    ({ message }) => {
        const { content } = message;

        // regex
        const match = content.match(regexMentions);
        if (!match) { return null; }

        // result
        const [, reason] = match;
        return {
            content,
            reason, // everyone
            delete: true, kick: true, forceDel: false,
        }
    },

    // msg in decoy channel
    ({ message, config }) => {
        const { content, channel } = message;
        const { BAN_CHANNEL_ID } = config;

        if (!BAN_CHANNEL_ID || channel.id != BAN_CHANNEL_ID) { return null; }

        // result
        return {
            content,
            reason: `自爆按鈕`,
            delete: true, kick: true, forceDel: false,
        }
    },

    // invite url
    ({ message }) => {
        const { content } = message;

        // regex
        const match = content.match(regexInviteUrl);
        if (!match) { return null; }

        // result
        return {
            content,
            reason: `群組邀請連結`,
            delete: true, kick: false, forceDel: false,
        }
    },

    // Phishing
    ({ message }) => {
        const { content } = message;

        // regex
        const match = content.match(regexPhishing);
        if (!match) { return null; }

        // result
        return {
            content,
            reason: `偽裝連結`,
            delete: true, kick: true, forceDel: true,
        }
    },

    // spam tweet
    ({ message }) => {
        if (!regexTweet) { return null; }   // unknown regex

        const { content } = message;
        let [, twitteUser] = content.match(regexTweet) || [, null];
        if (!twitteUser) { return null; }

        // twitter user name in blacklist or not
        if (!blacklistUser.includes(twitteUser)) { twitteUser = null; }

        // twitter description found keyword in blacklist or not
        let tweetDescription = null;
        // check embed
        if (message.embeds && Array.isArray(message.embeds) && message.embeds[0]?.description) {
            const description = message.embeds[0].description;
            for (const keyword of blacklistWord) {
                // found keyword in blacklist
                if (description.includes(keyword)) {
                    tweetDescription = keyword;
                    break;
                }
            }
        }

        // normal tweet
        if (twitteUser == null && tweetDescription == null) { return null; }

        return {
            content,
            reason: `SPAM tweet`,
            delete: true, kick: false, forceDel: true, silent: true,
        }
    },
];

let guildMessagesCache = {};

module.exports = {
    name: 'spamBotKicker',
    description: "kick spam bot",

    async messageUpdate(oldMessage, message, pluginConfig) {
        module.exports.execute(message, pluginConfig);
    },

    async execute(message, pluginConfig, command, args, lines) {
        // // skip server bot
        // if (message.author.bot) { return false; }
        if (message.client.user.id == message.author.id) { return false; }

        // skip message only has embed
        if (!message.content && !(message.attachments?.size > 0)) { return false; }

        // get config
        const { client, guild, channel, author } = message;
        const { LOG_CHANNEL_ID, PERMISSION_ROLE_ID } = pluginConfig;

        // set dummy message
        let dammyMessage = {};
        {
            dammyMessage.raw = message;
            dammyMessage.client = message.client;

            dammyMessage.id = message.id;
            dammyMessage.guild = message.guild;
            dammyMessage.channel = message.channel;

            dammyMessage.deletable = message.deletable;
            dammyMessage.createdTimestamp = message.createdTimestamp;

            dammyMessage.author = { id: message.author.id, displayName: message.author.displayName };
            dammyMessage.content = message.content || "";
            dammyMessage.embeds = [];
            if (Array.isArray(message.embeds) && message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    // dammyMessage.embeds.push(embed);
                    // dammyMessage.embeds.push({ description: description || "" });

                    const { thumbnail } = embed;

                    let embedHash = null;
                    const url = thumbnail?.proxy_url || thumbnail?.url || embed.url || null;
                    if (url) { embedHash = await md5FromUrl(url); }
                    if (!embedHash) { embedHash = md5(JSON.stringify(embed)); }

                    if (embedHash && thumbnail?.width && thumbnail?.height) { embedHash += ` <${thumbnail.width}x${thumbnail.height}>` }
                    if (embedHash) { dammyMessage.embeds.push(embedHash); }
                }
            }

            dammyMessage.attachments = [];
            if (message.attachments?.size > 0) {
                for (const [aID, attachment] of message.attachments) {
                    // dammyMessage.attachments.push(attachment);

                    let attachHash = null;
                    const url = attachment.proxyURL || attachment.url || null;
                    if (url) { attachHash = await md5FromUrl(url); }
                    if (!attachHash) { attachHash = md5(JSON.stringify(attachment)); }

                    if (attachHash && attachment.width && attachment.height) { attachHash += ` <${attachment.width}x${attachment.height}>` }
                    if (attachHash) { dammyMessage.attachments.push(attachHash); }
                }
            }
        }

        // init cache
        if (!guildMessagesCache[client.user.id]) { guildMessagesCache[client.user.id] = []; }
        if (!guildMessagesCache[client.user.id][guild.id]) { guildMessagesCache[client.user.id][guild.id] = []; }
        // keep new message cache
        if (!guildMessagesCache[client.user.id][guild.id].find((msg) => (msg.id == dammyMessage.id))) {
            guildMessagesCache[client.user.id][guild.id].push(dammyMessage);
        }

        // kick?
        let punish = null;
        for (let checker of spamChecker) {
            let result = checker({ message: dammyMessage, config: pluginConfig });
            if (!result) { continue; }

            const content = [
                (dammyMessage.content ? '**Content:**' + dammyMessage.content : ''),
                (dammyMessage.embeds.length > 0 ? '**Embeds:**' + dammyMessage.embeds.join('\n') : ''),
                (dammyMessage.attachments.length > 0 ? '**Attachments:**' + dammyMessage.attachments.join('\n') : '')
            ].join('\n');

            punish = punish || { content, reason: [] };

            if (result.reason == 'Discord Bot Token') {
                punish.content = result.content
            }

            punish.reason.push(result.reason)

            for (let key of ['delete', 'kick', 'forceDel', 'silent']) {
                punish[key] = punish[key] || result[key];
            }
        }
        // check result
        if (!punish) { return; }

        // exempt admin or not?
        const authorInGuild = guild.members.cache.get(author.id);
        const authorPermissions = channel.permissionsFor(authorInGuild);
        // admin mentions  // if (message.mentions.everyone){}
        if (authorPermissions?.has(PermissionFlagsBits.MentionEveryone)) {
            // is admin
            punish.kick = false;
            punish.delete = punish.forceDel;
        };


        // log to LOG_CHANNEL
        if (LOG_CHANNEL_ID && punish.delete) {
            // get role data
            let roleList = [], roleLog = [];
            for (let [rID, role] of authorInGuild?.roles.cache || []) {
                if (role.name == '@everyone') continue;
                roleList.push(role);
            }
            // roleList.sort(RoleManager.comparePositions).reverse();
            for (let role of roleList) { roleLog.push(role.name); }

            const fields = [
                { name: `Reason:`, value: punish.reason.join('\n') },
                { name: `Channel:`, value: message.url },
                { name: `Roles:`, value: roleLog.join('\n') || 'null' }
            ];

            // punish
            let punishText = [];
            if (punish.delete) { punishText.push('刪除'); }
            if (!PERMISSION_ROLE_ID && punish.kick) { punishText.push('踢出'); }
            if (PERMISSION_ROLE_ID && punish.kick) { punishText.push('刪除身分組'); }
            if (punishText.length > 0) { fields.push({ name: `Punish:`, value: punishText.join(', ') }); }

            // log
            let embed = new EmbedBuilder()
                .setColor('#FF0000')
                // .setColor('#FFFF00')
                .setAuthor({
                    name: `${author.username} ${author.toString()}`,
                    iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
                })
                .setTitle(`洗頻訊息:`)
                .setDescription(punish.content || "empty")
                .addFields(fields)
                .setTimestamp();

            // log to log channel
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) { await logChannel.send({ embeds: [embed] }).catch(e => console.log(`[SBK]`, e.message)); }

            // // log to DM
            // author.send({ embeds: [embed] });
        }

        // get bot permissions
        const botInGuild = guild.members.me;
        const botPermissions = channel.permissionsFor(botInGuild);

        if (authorInGuild) {
            // remove role
            if (PERMISSION_ROLE_ID && punish.kick) {
                let role = guild.roles.cache.get(PERMISSION_ROLE_ID);  // 已驗證V粉

                if (role && botInGuild.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    authorInGuild.roles.remove(role).catch(e => console.log(`[SBK]`, e.message));
                } else {
                    console.log(`[SBK] Missing Permissions: MANAGE_ROLES, role: ${role}`);
                }
            }

            // kick author
            if (!PERMISSION_ROLE_ID && punish.kick) {
                if (botInGuild.permissions.has(PermissionFlagsBits.KickMembers)) {
                    authorInGuild.kick().catch(e => console.log(`[SBK]`, e.message));
                } else {
                    console.log(`[SBK] Missing Permissions: KICK_MEMBERS in ${guild.toString()}, User: <@${authorInGuild.id}>`);
                }
            }
        }

        // delete msg
        if (punish.delete) {
            if (botPermissions.has(PermissionFlagsBits.ManageMessages)) {
                message.delete().catch(() => { });

                if (punish.silent) { return; } // test run

                // punish
                let punishText = [];
                if (punish.delete) { punishText.push('刪除'); }
                if (!PERMISSION_ROLE_ID && punish.kick) { punishText.push('踢出'); }
                if (PERMISSION_ROLE_ID && punish.kick) { punishText.push('刪除身分組'); }

                // log
                let fields = [{ name: `自動刪除:`, value: punish.reason.join('\n') }];
                if (punishText.length > 0) { fields.push({ name: `處置:`, value: punishText.join(', ') }); }
                let embed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setAuthor({
                        name: `${author.username} ${author.toString()}`,
                        iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
                    })
                    .addFields(fields);
                channel.send({ embeds: [embed] }).catch(e => console.log(`[SBK]`, e.message));
            } else {
                console.log(`[SBK] Missing Permissions: MANAGE_MESSAGES ${channel.toString()} <@${client.user.id}>`);
            }
        }
    }
}
