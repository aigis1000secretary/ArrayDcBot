
const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');


module.exports = {
    name: 'message logger',
    description: "log messageDelete & messageUpdate",

    async messageDelete(message, pluginConfig) {

        // Define the data
        let { client, channel, author, content, embeds, attachments } = message;
        if (!author) { return; }
        if (!content && attachments.size <= 0 && embeds.length <= 0) { return; }

        // Since there's only 1 audit log entry in this collection, grab the first one
        let deletor = null;
        if (message.guild && message.guild.members.me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            deletor = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete })
                .then((audit) => audit.entries.first());

            // Check channel and if message author deleted it
            if (deletor.target.id === author.id &&
                // Check time and count
                deletor.createdTimestamp > Date.now() - 5000 &&
                deletor.extra.count >= 1
            ) { } else { deletor = null; }
        }

        // Generate embed
        const logEmbed = new EmbedBuilder()
            .setColor(0xDD5E53)
            .setAuthor({
                name: `${author.username} ${author.toString()}`,
                iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
            })
            .setTitle(`刪除訊息:`)
            .setTimestamp();

        // event data
        let fields = [];
        if (content) {
            fields.push({ name: `Content:`, value: content });
        }
        fields.push({ name: `Channel:`, value: channel.toString() });
        if (attachments.size > 0) {
            let value = '';
            for (let [i, attachment] of message.attachments) {
                // Assign Attachments to messages
                value += attachment.name + '\n';
            }
            fields.push({ name: 'Attachments', value });
        }
        if (deletor) {
            fields.push({ name: `Deletor:`, value: deletor.executor.toString() });
        }
        logEmbed.addFields(fields);

        const { LOG_CHANNEL_ID } = pluginConfig;
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(
                { embeds: [logEmbed].concat(embeds), attachments }
            ).catch(console.log);
        }
    },

    async messageUpdate(oldMessage, newMessage, pluginConfig) {

        if (oldMessage.content && oldMessage.content == newMessage.content) {
            return;
        }

        // Define the data
        let { client, channel, author, content } = oldMessage;
        if (!author) { return; }
        if (!content) { return; }

        // Generate embed
        const logEmbed = new EmbedBuilder()
            .setColor(0x4286F4)
            .setAuthor({
                name: `${author.username} ${author.toString()}`,
                iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
            })
            .setTitle(`編輯訊息:`)
            .setTimestamp();

        let marge = ['```diff']
        let oldContent = oldMessage.content.split('\n');
        let newContent = newMessage.content.split('\n');
        let length = Math.max(oldContent.length, newContent.length);
        for (let i = 0; i < length; ++i) {
            if (oldContent[i] && !newContent.includes(oldContent[i])) { marge.push(`-- ${oldContent[i]}`); }
            if (newContent[i] && !oldContent.includes(newContent[i])) { marge.push(`++ ${newContent[i]}`); }
        }
        if (marge.length > 1) { marge.push('```'); }
        else { return; }

        // event data
        let fields = [];
        fields.push({ name: `Content:`, value: marge.join('\n') });
        fields.push({ name: `Channel:`, value: channel.toString() });

        logEmbed.addFields(fields);

        const { LOG_CHANNEL_ID } = pluginConfig;
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send({ embeds: [logEmbed] }).catch(console.log);
        }
    }
}