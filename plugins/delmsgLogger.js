
const { CONFIG } = require('../config.js');

const Discord = require('discord.js');

module.exports = {
    name: 'delmsgLogger',
    description: "log when someone del message",
    setup(client) {

        client.on('messageDelete', async (message) => {

            // Ignore direct messages
            if (!message.guild) return;
            if (!message.content && !message.author && !message.embeds.length) return;
            
            if (!Object.keys(CONFIG).includes(message.guild.id)) { return false; }
            if (!CONFIG[message.guild.id].delmsgLogger) return;
            const { LOG_CHANNEL_ID } = CONFIG[message.guild.id].delmsgLogger;

            // Define the author
            let author = message.author ? message.author.username : 'UNKNOWN';

            // Define the message
            let content = message.content || (message.embeds.length ? '*嵌入式訊息*' : '*不明訊息*');
            // Attachment Array - Used for pictures etc...
            for (let [i, attachment] of message.attachments) {
                // Assign Attachments to messages
                content += attachment.url + "\n\n";
            }

            // Since there's only 1 audit log entry in this collection, grab the first one
            let deletor = null;
            if (message.guild.me.permissions.has("VIEW_AUDIT_LOG")){
                deletor = await message.guild.fetchAuditLogs({ limit: 1, type: "MESSAGE_DELETE" })
                    .then((audit) => audit.entries.first());
                // Check channel and if message author deleted it
                if (deletor.target.id === message.author.id &&
                    // Check time and count
                    deletor.createdTimestamp > Date.now() - 5000 &&
                    deletor.extra.count >= 1
                ) { } else { deletor = null; }
            }

            // data
            // let gID = message.guild.id, cID = message.channel.id, mID = message.id, uID = message.author.id;

            // Generate embed
            const delMsg = new Discord.MessageEmbed()
                .setAuthor(`${author} ${message.author}`, `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`)
                .setTitle(`刪除訊息:`).setDescription(content)
                .setColor('RED')
                .addField(`訊息位置:`, `[${message.channel.toString()}](${message.url})`)
                .setTimestamp();

            if (deletor) {
                delMsg.addField(`刪除者:`, `${deletor.executor.username}`)
            }


            // // discord push
            // const dcPush = async (channelID, msg) => {
            //     const channel = message.client.channels.cache.get(channelID);
            //     return await channel.send(msg)
            // }

            const logChannel = message.client.channels.cache.get(LOG_CHANNEL_ID);

            await logChannel.send(delMsg)
            if (message.embeds.length) {
                await logChannel.send(message.embeds)
            }

            /*
            // Perform a coherence check to make sure that there's *something*
            if (!deletionLog) {
                return console.log(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`);
            }
            // Now grab the user object of the person who deleted the message
            // Also grab the target of this action to double-check things
            const { executor, target } = deletionLog;

            // Update the output with a bit more information
            // Also run a check to make sure that the log returned was for the same author's message
            let author = message.author || target;
            let content = message.content || (message.embeds.length ? '*嵌入式訊息*' : '*不明訊息*');
            const embed = new Discord.MessageEmbed()
                .addField(`${executor.tag} 刪除訊息`, `頻道: ${message.channel.toString()}`)
                .addField(`${author.tag}:`, `${content}`)
                .setTimestamp();

            const { LOG_CHANNEL_ID } = IDSET[message.guild.id];
            if (LOG_CHANNEL_ID) {
                dcPush(LOG_CHANNEL_ID, embed);
                if (message.embeds.length) {
                    dcPush(LOG_CHANNEL_ID, message.embeds);
                }
            }

            // if (message.author == null) {
            //     console.log(`A message by ${target.tag} was deleted by ${executor.tag}.`);
            // } else if (target.id === message.author.id) {
            //     console.log(`A message by ${message.author.tag} was deleted by ${executor.tag}.`);
            // } else {
            //     console.log(`A message by ${message.author.tag} was deleted, but we don't know by who.`);
            // }
            */
        });

    }
}
