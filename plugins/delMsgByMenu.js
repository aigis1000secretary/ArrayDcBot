
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
    name: 'del msg by menu',
    description: 'delete message by Context Menu',


    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isMessageContextMenuCommand()) { return false; }
        if (interaction.commandName != '刪除訊息') { return false; }

        const { user, targetMessage } = interaction;

        if (targetMessage.author.id == user.id) {
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