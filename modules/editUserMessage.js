
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
            console.log('[Modules] Missing Permissions: MANAGE_WEBHOOKS');
            return;
        }


        // get channel webhook
        let hook;
        const hooks = await channel.fetchWebhooks().catch(console.error);
        if (hooks) {
            // get webhook
            for (let [key, value] of hooks) {
                if (value.owner.id == message.client.user.id && value.name == webhookName) {
                    hook = value;
                    break;
                }
            }
        }
        // create webhook if not exist
        hook = hook || await channel.createWebhook({ name: webhookName }).catch(console.error);


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
            .catch(console.error);

        // // delete webhook
        // await webhook.delete()
        //     // .then(console.log)
        //     .catch(console.error);

        return;

    }
}