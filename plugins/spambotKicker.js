
const fs = require('fs');

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// regex
const regexToken = /([A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{27,})/;
const regexMentions = /(@here|@everyone)/i;
const regexInviteUrl = /(https?:\/\/)?discord.gg\/\S+/;
let regexAnti = null;

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
            content: content.replace(regexToken, `<Bot Token: ${token.length}>`),
            reason: `<Bot Token: ${token.length}>`,
            delete: true, kick: false, forceDel: true,
        }
    },

    // normal bot spam
    ({ message }) => {
        const { guild, client, content, author, createdTimestamp } = message;
        const gID = guild.id;
        let spamMessage = [];

        const spamFilter = (count, sec) => {
            let tempMessage = guildMessagesCache[client.user.id][gID].filter(
                (msg) => (
                    msg.author.id == author.id && msg.content == content &&
                    (Math.abs(msg.createdTimestamp - createdTimestamp) < (sec * 1000))
                ));

            if (tempMessage.length >= count) { return true; }
            return false;
        }

        // 3 same message in 20.000 sec
        // 6 same message in 60.000 sec
        if (!spamFilter(3, 20) &&
            !spamFilter(6, 60)) { return null; }

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
            reason: `高頻率訊息`,
            // delete: true, kick: true, forceDel: true,
            delete: true, kick: false, forceDel: true, silent: true,  // test run
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
            reason,
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

    // anti
    ({ message }) => {
        if (!regexAnti) { return null; }
        const { content, client } = message;

        const match = content.match(regexAnti);
        if (!match) { return null; }

        // result
        return {
            content,
            reason: `ANTI`,
            delete: true, kick: false, forceDel: true, silent: true,
        }
    },
];

let guildMessagesCache = {};

module.exports = {
    name: 'spambotKicker',
    description: "kick spam bot",

    async updateRegexAnti() {
        const filepath = `./blacklist/blacklist.txt`;
        if (!fs.existsSync(filepath)) { console.log('waiting blacklist.txt ...'); return; }

        let blacklist = [];
        const text = fs.readFileSync(filepath, 'utf8');
        for (let _line of text.split(/\r?\n/)) {
            let line = _line.trim();
            if (!!line && !blacklist.includes(line)) {
                blacklist.push(line);
            }
        }
        regexAnti = new RegExp(`twitter\.com/(${blacklist.join('|')})/?`, 'i');
        console.log(`loading blacklist[${blacklist.length}]`);
        // console.log(regexAnti);
    },

    async execute(message, pluginConfig, command, args, lines) {
        // // skip server bot
        // if (message.author.bot) return;

        // skip DM
        if (!message.content) { return false; }

        if ('regexanti' == command && message.client.user.id == `920485085935984641`) {
            this.updateRegexAnti();
            return;
        }

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
            punish = punish || result;
            if (punish) { break; }
        }
        // check result
        if (!punish) { return; }

        // exempt admin or not?
        const authorInGuild = guild.members.cache.get(author.id);
        const authorPermissions = channel.permissionsFor(authorInGuild);
        // admin mentions  // if (message.mentions.everyone){}
        if (authorPermissions.has(PermissionFlagsBits.MentionEveryone)) {
            punish.kick = false;
            punish.delete = punish.forceDel;
        };


        // log to LOG_CHANNEL
        if (LOG_CHANNEL_ID && punish.delete) {
            // get role data
            let roleList = [], roleLog = [];
            for (let [rID, role] of authorInGuild.roles.cache) {
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
                    { name: `Reason:`, value: `${punish.reason}` },
                    { name: `Channel:`, value: `[${channel.toString()}](${message.url})` },
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
                let embed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setAuthor({
                        name: `${author.username} ${author.toString()}`,
                        iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
                    })
                    .setDescription(`自動刪除: ${punish.reason}${punishText.length > 0 ? `\n處置: ${punishText.join(', ')}` : ''}`);
                channel.send({ embeds: [embed] });
            } else {
                console.log('[SBK] Missing Permissions: MANAGE_MESSAGES');
            }
        }
    }
}
