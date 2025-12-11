
const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');


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
                .then((audit) => audit.entries.first())
                .catch(() => null);

            // Check channel and if message author deleted it
            if (deletor?.target.id === author.id &&
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
        if (content) { fields.push({ name: `Content:`, value: content.length > 1017 ? md5(content) : "```" + content + "```" }); }
        if (message.url) { fields.push({ name: `Channel:`, value: message.url }); }

        if (Array.isArray(message.embeds) && message.embeds.length > 0) {
            const hashData = [];
            for (const embed of message.embeds) {
                const { thumbnail } = embed;

                let embedHash = null;
                const url = thumbnail?.proxy_url || thumbnail?.url || embed.url || null;
                if (url) { embedHash = await md5FromUrl(url); }
                if (!embedHash) { embedHash = md5(JSON.stringify(embed)); }

                if (embedHash && thumbnail?.width && thumbnail?.height) { embedHash += ` <${thumbnail.width}x${thumbnail.height}>` }
                if (embedHash) { hashData.push(embedHash); }
            }
            if (hashData.length > 0) {
                fields.push({ name: `Embeds:`, value: hashData.join('\n') });
            }
        }

        if (attachments?.size > 0) {
            const hashData = [];
            for (const [aID, attachment] of attachments) {

                let attachHash = null;
                const url = attachment.proxyURL || attachment.url || null;
                if (url) { attachHash = await md5FromUrl(url); }
                if (!attachHash) { attachHash = md5(JSON.stringify(attachment)); }

                if (attachHash && attachment.width && attachment.height) { attachHash += ` <${attachment.width}x${attachment.height}>` }
                if (attachHash) { hashData.push(attachHash); }
            }
            if (hashData.length > 0) {
                fields.push({ name: `Attachments:`, value: hashData.join('\n') });
            }
        }

        if (deletor?.executor?.toString().trim()) {
            fields.push({ name: `Deletor:`, value: deletor.executor.toString() });
        }

        try {
            logEmbed.addFields(fields);
        } catch (e) {
            console.log(`[MsgLogger] execute() Fields: `, JSON.stringify(fields, null, 2));
            console.log(e.message);
        }


        const { LOG_CHANNEL_ID } = pluginConfig;
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(
                { embeds: [logEmbed].concat(embeds), attachments }
            ).catch(e => console.log(`[MsgLogger]`, e.message));
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
        fields.push({ name: `Channel:`, value: newMessage.url });

        try {
            logEmbed.addFields(fields);
        } catch (e) {
            console.log(`marge`, marge);
            console.log(`newMessage.url`, newMessage.url);
        }

        const { LOG_CHANNEL_ID } = pluginConfig;
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        logChannel?.send({ embeds: [logEmbed] }).catch(e => console.log(`[MsgLogger]`, e.message));
    },

    async execute(message, pluginConfig, command, args, lines) {

        const { guildId } = message;
        if (guildId != "1303956221308571689") { return; }

        // Define the data
        let { client, channel, author, content, embeds, attachments } = message;
        if (!author) { return; }
        if (!content && attachments?.size <= 0 && embeds.length <= 0) { return; }

        if (client.user.id == author.id) { return; }

        // Generate embed
        const logEmbed = new EmbedBuilder()
            .setColor(0x0D5E53)
            .setAuthor({
                name: `${author.username} ${author.toString()}`,
                iconURL: author.displayAvatarURL({ format: 'png', size: 256 })
            })
            .setTitle(`發送訊息:`)
            .setTimestamp();

        // event data
        let fields = [];
        if (content) { fields.push({ name: `Content:`, value: content.length > 1017 ? md5(content) : "```" + content + "```" }); }
        if (message.url) { fields.push({ name: `Channel:`, value: message.url }); }

        if (Array.isArray(message.embeds) && message.embeds.length > 0) {
            const hashData = [];
            for (const embed of message.embeds) {
                const { thumbnail } = embed;

                let embedHash = null;
                const url = thumbnail?.proxy_url || thumbnail?.url || embed.url || null;
                if (url) { embedHash = await md5FromUrl(url); }
                if (!embedHash) { embedHash = md5(JSON.stringify(embed)); }

                if (embedHash && thumbnail?.width && thumbnail?.height) { embedHash += ` <${thumbnail.width}x${thumbnail.height}>` }
                if (embedHash) { hashData.push(embedHash); }
            }
            if (hashData.length > 0) {
                fields.push({ name: `Embeds:`, value: hashData.join('\n') });
            }
        }

        if (attachments?.size > 0) {
            const hashData = [];
            for (const [aID, attachment] of attachments) {

                let attachHash = null;
                const url = attachment.proxyURL || attachment.url || null;
                if (url) { attachHash = await md5FromUrl(url); }
                if (!attachHash) { attachHash = md5(JSON.stringify(attachment)); }

                if (attachHash && attachment.width && attachment.height) { attachHash += ` <${attachment.width}x${attachment.height}>` }
                if (attachHash) { hashData.push(attachHash); }
            }
            if (hashData.length > 0) {
                fields.push({ name: `Attachments:`, value: hashData.join('\n') });
            }
        }

        try {
            if (fields.length > 0) { logEmbed.addFields(fields); }
        } catch (e) {
            console.log(`[MsgLogger] messageDelete() Fields: `, JSON.stringify(fields, null, 2));
            console.log(e.message);
        }


        // const { LOG_CHANNEL_ID } = pluginConfig;
        // const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        const logChannel = await client.channels.fetch(`1448488983872143412`);
        if (logChannel) {
            logChannel.send(
                { embeds: [logEmbed].concat(embeds), attachments }
            ).catch(e => console.log(`[MsgLogger]`, e.message));
        }
    },

    setup(client) {
        client.on('guildMemberAdd',
            async (member) => {
                let guild = member.guild;
                if (guild.id != "1303956221308571689") { return; }


                // Generate embed
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setAuthor({
                        name: `${member.displayName} ${member.toString()}`,
                        iconURL: member.displayAvatarURL({ format: 'png', size: 256 })
                    })
                    .setTitle(`加入群組`)
                    .setTimestamp();

                // const { LOG_CHANNEL_ID } = pluginConfig;
                // const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                const logChannel = await client.channels.fetch(`1448488983872143412`);
                if (logChannel) {
                    logChannel.send(
                        { embeds: [logEmbed] }
                    ).catch(e => console.log(`[MsgLogger]`, e.message));
                }


            });
    }
}