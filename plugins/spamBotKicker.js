
const fs = require('fs');

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// regex
const regexToken = /(mfa\.[\w-]{84}|[\w-]{24}\.[\w-]{6}\.[\w-]{27})/;
const regexMentions = /(@here|@everyone)/i;
const regexInviteUrl = /(https?:\/\/)?discord.gg\/\S+/;
const blacklistUser = ['GrastonBerry', '_CMRA_', 'sui1911', '_fromCanadaorg', 'CannabisEDCA', 'cannabisORGca', 'CannabisCDN', 'gochidesu459', 'PagallKhana'];
const blacklistWord = ['PagallKhana'];
const regexTweet = new RegExp(`twitter\.com\/([^\/\s]+)\/?`);

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
        const { guild, client, content, author, createdTimestamp } = message;
        const gID = guild.id;
        let spamMessage = [];

        const spamFilter = (count, sec, blurMode = false) => {
            let tempMessage = guildMessagesCache[client.user.id][gID].filter(
                (msg) => (
                    msg.author.id == author.id &&   // same author
                    (msg.content == content || blurMode) && // same message
                    (Math.abs(msg.createdTimestamp - createdTimestamp) < (sec * 1000))  // in time
                ));

            if (tempMessage.length >= count) { return true; }   // is spam
            return false;
        }

        // 3 same message in 20.000 sec
        // 6 same message in 60.000 sec
        // 10 message in 4.000 sec
        const judge = [spamFilter(3, 20), spamFilter(6, 60), (spamFilter(10, 4, true) && client.user.id != author.id)];
        if (!(judge[0] || judge[1] || judge[2])) { return null; }

        // additional delete
        // filter target messages, pick all same message in 5 min
        spamMessage = guildMessagesCache[client.user.id][gID].filter(
            (msg) => (
                msg.author.id == author.id && msg.content == content && msg.deletable &&
                msg.createdTimestamp != createdTimestamp &&
                (Math.abs(msg.createdTimestamp - createdTimestamp) < (5 * 60 * 1000))
            ));
        // sort by channel
        let bulkDelMessage = {};
        for (let msg of spamMessage) {
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
                channel.bulkDelete(bulkDel).catch(console.log);
            }
        }

        // result
        return {
            content,
            reason: `洗頻訊息`,
            // delete: true, kick: true, forceDel: true,
            delete: true, kick: judge[2], forceDel: true, silent: !judge[2],  // test run
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
        // if (message.author.bot) return;

        // skip DM
        if (!message.content) { return false; }

        // get config
        const { client, guild, channel, author } = message;
        const { LOG_CHANNEL_ID, PERMISSION_ROLE_ID } = pluginConfig;

        // init cache
        if (!guildMessagesCache[client.user.id]) { guildMessagesCache[client.user.id] = []; }
        if (!guildMessagesCache[client.user.id][guild.id]) { guildMessagesCache[client.user.id][guild.id] = []; }
        // keep new message cache
        if (!guildMessagesCache[client.user.id][guild.id].find((msg) => (msg.id == message.id))) {
            let dammyMessage = {}
            dammyMessage.id = message.id;
            dammyMessage.author = { id: message.author.id };
            dammyMessage.content = message.content;
            dammyMessage.channel = message.channel;
            dammyMessage.deletable = message.deletable;
            dammyMessage.createdTimestamp = message.createdTimestamp;

            guildMessagesCache[client.user.id][guild.id].push(dammyMessage);
        }

        // kick?
        let punish = null;
        for (let checker of spamChecker) {
            let result = checker({ message, config: pluginConfig });
            if (!result) { continue; }

            punish = punish || {
                content: message.content,
                reason: []
            };

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

            // log
            let embed = new EmbedBuilder()
                .setColor('#FF0000')
                // .setColor('#FFFF00')
                .setAuthor({
                    name: `${author.username} ${author.toString()}`,
                    iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
                })
                .setTitle(`洗頻訊息:`).setDescription(punish.content)
                .addFields([
                    { name: `Reason:`, value: punish.reason.join('\n') },
                    { name: `Channel:`, value: message.url },
                    { name: `Roles:`, value: roleLog.join('\n') || 'null' }
                ])
                .setTimestamp();

            // log to log channel
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) { await logChannel.send({ embeds: [embed] }).catch(console.log); }

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

                if (role && botPermissions.has(PermissionFlagsBits.ManageRoles)) {
                    authorInGuild.roles.remove(role).catch(console.log);
                } else {
                    console.log(`[SBK] Missing Permissions: MANAGE_ROLES, role: ${role}`);
                }
            }

            // kick author
            if (!PERMISSION_ROLE_ID && punish.kick) {
                if (botPermissions.has(PermissionFlagsBits.KickMembers)) {
                    authorInGuild.kick().catch(console.log);
                } else {
                    console.log('[SBK] Missing Permissions: KICK_MEMBERS');
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
                channel.send({ embeds: [embed] });
            } else {
                console.log('[SBK] Missing Permissions: MANAGE_MESSAGES');
            }
        }
    }
}
