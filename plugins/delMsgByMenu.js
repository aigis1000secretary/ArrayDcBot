
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
    name: 'del msg by menu',
    description: 'delete message by Context Menu',


    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isMessageContextMenuCommand()) { return false; }
        if (interaction.commandName != '刪除訊息') { return false; }

        const { client, targetMessage } = interaction;
        // console.log(targetMessage.author.displayAvatarURL({ format: 'png', size: 1024 }).replace(/\.webp/, '.png'));
        // console.log(user.displayAvatarURL({ format: 'png', size: 1024 }).replace(/\.webp/, '.png'));

        if (!targetMessage.webhookId) { return false; }
        const webhook = await client.fetchWebhook(targetMessage.webhookId).catch(() => { });
        if (!webhook) { return false; }

        if (webhook.owner.id == client.user.id) {
            if (targetMessage.deletable) {
                targetMessage.delete().catch(() => { });
                interaction.reply({ content: '刪除成功', allowedMentions: { repliedUser: false }, ephemeral: true }).catch(() => { });
            } else {
                interaction.reply({ content: '刪除失敗', allowedMentions: { repliedUser: false }, ephemeral: true }).catch(() => { });
            }
        } else {
            interaction.reply({ content: '權限錯誤', allowedMentions: { repliedUser: false }, ephemeral: true }).catch(() => { });
        }
        return;
    },

    setup(client) {
    },
    commands: [
        new ContextMenuCommandBuilder()
            .setName('刪除訊息')
            .setType(ApplicationCommandType.Message)
    ]

}