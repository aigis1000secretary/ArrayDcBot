

const { Permissions, MessageEmbed } = require('discord.js');

// @everyone 
module.exports = {
    name: 'spambotKicker',
    description: "kick @everyone spam bot",
    async execute(message) {
        // skip server bot
        if (message.author.bot) return;
        // skip DM
        if (!message.guild) { return false; }

        // get config
        const { client, guild, channel, author, content } = message;
        const config = client.config[message.guild.id];
        if (!config || !config.spambotKicker) { return false; }
        const { LOG_CHANNEL_ID, PERMISSION_ROLE_ID, BAN_CHANNEL } = config.spambotKicker;

        // kick?
        let kick = false;
        if (content.includes('@everyone') ||
            content.includes('@here')) { kick = true; }   // try mentions everyone message
        if (BAN_CHANNEL && channel.id == BAN_CHANNEL) { kick = true; }  // msg in decoy channel
        // exempt?
        const guildAuthor = guild.members.cache.get(author.id);
        // if (content == '!kick me') { kick = true; }  // test cmd
        if (channel.permissionsFor(guildAuthor).has(Permissions.FLAGS.MENTION_EVERYONE)) { kick = false; };  // admin mentions  // if (message.mentions.everyone){}

        if (!kick) { return; }

        // let gID = `<${guild.name}> [${guild.id}]`;
        // let cID = `<${channel.name}> [${channel.id}]`;
        // let uID = `<${author.username}> [${author.id}]`;
        // console.log(`\n${gID}\n${cID}\n${uID} : ${content.trim()}`);

        // log to LOG_CHANNEL
        if (LOG_CHANNEL_ID) {
            // get role data
            let roleList = [], roleLog = [];
            for (let [rID, role] of guildAuthor.roles.cache) {
                if (role.name == '@everyone') continue;
                roleList.push(role);
            }
            // roleList.sort(RoleManager.comparePositions).reverse();
            for (let role of roleList) { roleLog.push(role.name); }

            // log
            let embed = new MessageEmbed()
                .setColor('#FF0000')
                .setAuthor({
                    name: `${author.username} ${author.toString()}`,
                    iconURL: `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=256`
                })
                .setTitle(`洗頻訊息:`).setDescription(content)
                .addField(`訊息位置:`, `[${channel.toString()}](${message.url})`)
                .addField(`所屬身分組:`, roleLog.join('\n') || 'null')
                .setTimestamp();

            let logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) { await logChannel.send({ embeds: [embed] }); }
        }

        // // DM
        // message.author.send({ embeds: [embed] });

        // get bot permissions
        let permissions = message.channel.permissionsFor(message.member.guild.me);
        // remove role
        if (PERMISSION_ROLE_ID) {
            if (permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
                let role = guild.roles.cache.get(PERMISSION_ROLE_ID);  // 已驗證V粉
                if (role) { await guildAuthor.roles.remove(role).catch(console.log); }
            } else {
                console.log('Missing Permissions: MANAGE_ROLES');
            }
        } else {
            if (permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
                // kick
                guildAuthor.kick().catch(console.log);
            } else {
                console.log('Missing Permissions: KICK_MEMBERS');
            }
        }

        // delete msg
        const botPerms = channel.memberPermissions(guild.me);
        if (botPerms.has(Permissions.FLAGS.MANAGE_MESSAGES)) { message.delete().catch(() => { }); }
    }
}
