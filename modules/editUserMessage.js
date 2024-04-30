
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'edit user message',
    description: "replace user message by make a fake message",

    async editUserMessage(message, payload) {

        const { author, channel } = message;

        // check permissions
        let permissions = channel.permissionsFor(channel.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            console.log('[Modules] Missing Permissions: MANAGE_WEBHOOKS');
            return;
        }

        // get user
        const name = author.globalName || author.displayName || author.username;
        const avatar = author.displayAvatarURL({ format: 'png', size: 1024 }).replace(/\.webp/, '.png') // size: 4096

        // create webhook
        const webhook = await channel.createWebhook({ name, avatar })
            // .then(webhook => { console.log(webhook); return webhook; })
            .catch(console.error)

        // delete origin message
        if (message.deletable) { message.delete().catch(() => { }); }

        // send message by webhook
        await webhook.send(payload)
            // .then(message => { console.log(`Sent message: ${message.content}`); return message; })
            .catch(console.error);

        // delete webhook
        await webhook.delete()
            // .then(console.log)
            .catch(console.error);

        return;

    }
}