
const { PermissionFlagsBits } = require('discord.js');

const webhookName = 'dummy messenger';

module.exports = {
    name: 'edit user message',
    description: "replace user message by make a dummy message",

    async editUserMessage(message, payload) {

        const { author, channel } = message;


        // check permissions
        const permissions = channel.permissionsFor(channel.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            console.log('[EditMsg] Missing Permissions: MANAGE_WEBHOOKS');
            return;
        }


        // get channel webhook
        let hook;
        try {
            const hooks = await channel.fetchWebhooks().catch(e => console.log(`[EditMsg]`, e.message));
            if (hooks) {
                // get webhook
                for (let [key, value] of hooks) {
                    if (value.owner.id == message.client.user.id && value.name == webhookName) {
                        hook = value;
                        break;
                    }
                }
            }
        }
        catch (e) {
            // TypeError: channel.fetchWebhooks is not a function
            console.log(`[EditMsg] editUserMessage CName: ${channel.name}, CID: ${channel.id}`);
            console.log(e.message);
        }
        // create webhook if not exist
        hook = hook || await channel.createWebhook({ name: webhookName }).catch(e => console.log(`[EditMsg]`, e.message));


        // delete origin message
        if (message.deletable) { message.delete().catch(() => { }); }

        const guildMember = await channel.guild.members.fetch(message.author.id).catch(() => null);

        // send message by webhook
        // payload.username = (author.globalName || author.displayName || author.username) + ` <@${author.id}>`;
        payload.username = guildMember?.nickname || author.globalName || author.displayName || author.username || `<@${author.id}>`;
        payload.avatarURL = (guildMember?.displayAvatarURL({ format: 'png', size: 1024 }) || author.displayAvatarURL({ format: 'png', size: 1024 }))
            .replace(/\.webp/, '.png') // size: 4096
        await hook.send(payload)
            // .then(message => { console.log(`Sent message: ${message.content}`); return message; })
            .catch(e => console.log(`[EditMsg]`, e.message));

        // // delete webhook
        // await webhook.delete()
        //     // .then(console.log)
        //     .catch(console.error);

        return;

    }
}