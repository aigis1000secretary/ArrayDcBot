
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const channelID = '1009645372831977482';

module.exports = {
    name: 'ping',
    description: 'pong',

    async execute(message, pluginConfig, command, args, lines) {
        let { channel, author: user } = message;

        // reply button message
        if (command == 'ping') {
            let actionRow = new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(false)
                    .setLabel("Ping!")
                    .setCustomId("ping")
                );

            message.reply({ content: `pong!`, components: [actionRow], allowedMentions: { repliedUser: false } }).catch(() => { });
        }

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `messageExecute`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageUpdate(oldMessage, message, pluginConfig) {
        let { channel, author: user } = message;

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `messageUpdate`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageDelete(message, pluginConfig) {
        let { channel, author: user } = message;

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `messageDelete`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async interactionCreate(interaction, pluginConfig) {
        let { message, user } = interaction;
        let { channel } = message;

        // button interaction
        if (!interaction.isButton()) { return false; }
        if (interaction.customId != 'ping') { return false; }
        // mute reply
        interaction.reply({ content: ' ' }).catch(() => { });

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `interactionCreate`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        let { message } = reaction;
        let { channel } = message;
        let content = message.content;

        if (message.author.id == message.client.user.id && !user?.bot) {
            message.edit({ content: `${content}?` })
                .then(message => {
                    message.edit({ content }).catch(() => { });
                }).catch(() => { });
        }

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `messageReactionAdd` })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageReactionRemove(reaction, user, pluginConfig) {
        let { message } = reaction;
        let { channel } = message;

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        message.reply({ content: `messageReactionRemove`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    setup(client) {
    },

}