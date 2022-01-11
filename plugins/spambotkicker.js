
const { CONFIG } = require('../config.js');
const Discord = require('discord.js');

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
        if (!Object.keys(CONFIG).includes(message.guild.id)) { return false; }
        const config = CONFIG[message.guild.id].spambotKicker;
        if (!config) { return false; }
        const { LOG_CHANNEL_ID, PERMISSION_ROLE_ID, BAN_CHANNEL } = config;
        const { client, guild, channel, author, content } = message;

        // kick?
        let kick = false;
        if (content.includes('@everyone') ||
            content.includes('@here')) { kick = true; }   // try mentions everyone message
        if (BAN_CHANNEL && channel.id == BAN_CHANNEL) { kick = true; }  // msg in decoy channel
        // exempt?
        const guilAuthor = guild.members.cache.get(author.id);
        // if (content == '!kick me') { kick = true; }  // test cmd
        if (channel.memberPermissions(guilAuthor).has("MENTION_EVERYONE")) { kick = false; };  // admin mentions  // if (message.mentions.everyone){}

        if (!kick) { return; }

        // let gID = `<${guild.name}> [${guild.id}]`;
        // let cID = `<${channel.name}> [${channel.id}]`;
        // let uID = `<${author.username}> [${author.id}]`;
        // console.log(`\n${gID}\n${cID}\n${uID} : ${content.trim()}`);

        // log to LOG_CHANNEL
        if (LOG_CHANNEL_ID) {
            // get role data
            let roleList = [], roleLog = [];
            for (let [rID, role] of guilAuthor.roles.cache) {
                if (role.name == '@everyone') continue;
                roleList.push(role);
            }
            roleList.sort(Discord.Role.comparePositions).reverse();
            for (let role of roleList) { roleLog.push(role.name); }

            // log
            let embed = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setAuthor(`${author.username} ${author}`, `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png?size=256`)
                .setTitle(`洗頻訊息:`).setDescription(content)
                .addField(`訊息位置:`, `[${channel.toString()}](${message.url})`)
                .addField(`所屬身分組:`, roleLog.join('\n') || 'null')
                .setTimestamp();

            let logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) { await logChannel.send(embed); }
        }

        // // DM
        // message.author.send(`${roleLog}`);

        // remove role
        if (PERMISSION_ROLE_ID) {
            let roles = await guild.roles.fetch();
            let role = roles.cache.get(PERMISSION_ROLE_ID);  // 已驗證V粉
            if (role) { await guilAuthor.roles.remove(role); }
        } else {
            // kick
            guilAuthor.kick().catch(console.log);
        }

        // delete msg
        const botPerms = channel.memberPermissions(guild.me);
        if (botPerms.has("MANAGE_MESSAGES")) { message.delete(); }
    }
}
