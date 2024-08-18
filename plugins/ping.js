
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const channelID = '1009645372831977482';

module.exports = {
    name: 'ping',
    description: 'pong',

    async execute(message, pluginConfig, command, args, lines) {
        const { channel, author } = message;

        // reply button message
        if (command == 'ping') {
            let actionRow = new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(false)
                    .setLabel("Ping!")
                    .setCustomId("ping")
                );

            message.reply({ content: `pong! ${args[0]}`, components: [actionRow], allowedMentions: { repliedUser: false } }).catch(() => { });
        }
        if (command == 'echo') {
            channel.send({ content: args.join(' ') }).catch(() => { });
            return;
        }

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!author || author.bot) { return; }

        message.reply({ content: `messageExecute`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageUpdate(oldMessage, message, pluginConfig) {
        const { channel, author } = message;

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!author || author.bot) { return; }

        message.reply({ content: `messageUpdate`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async messageDelete(message, pluginConfig) {
        const { channel, author } = message;

        // pong!
        if (!channel || channel.id != channelID) { return; }
        if (!author || author.bot) { return; }

        message.reply({ content: `messageDelete`, allowedMentions: { repliedUser: false } })
            .then(async (msg) => {
                await sleep(3000);
                return msg.delete();
            })
            .catch(() => { });
    },

    async interactionCreate(interaction, pluginConfig) {

        // button interaction
        if (interaction.isButton()) {

            if (interaction.customId != 'ping') { return false; }

            let { message } = interaction;

            // emtpy reply
            // interaction.reply({ content: ' ' }).catch(() => { });
            interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(console.error);

            // pong!
            message.reply({ content: `interactionCreate isButton`, allowedMentions: { repliedUser: false } })
                .then(async (msg) => {
                    await sleep(3000);
                    return msg.delete();
                })
                .catch(() => { });
        }

        if (interaction.isCommand()) {

            if (interaction.commandName != 'ping') { return false; }

            let { user } = interaction;

            // pong!
            interaction.reply({ content: `interactionCreate isCommand`, allowedMentions: { repliedUser: false }, ephemeral: true })
                .then(async (msg) => {
                    await sleep(3000);
                    return msg.delete();
                })
                .catch(() => { });
        }

        if (interaction.isUserContextMenuCommand()) {

            if (interaction.commandName != 'ping') { return false; }

            const { user, targetMessage, targetUser } = interaction;

            // pong!
            interaction.reply({ content: `interactionCreate isUserContextMenuCommand`, allowedMentions: { repliedUser: false }, ephemeral: true })
                .then(async (msg) => {
                    await sleep(3000);
                    return msg.delete();
                })
                .catch(() => { });
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        const { message } = reaction;
        const { channel, content } = message;

        if (message.author?.id == message.client.user.id && !user?.bot) {
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
        const { message } = reaction;
        const { channel } = message;

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

    async setup(client) {

        // old version
        // slash commands

        // // registre slash command
        // if (!client.application.commands.cache.find(c => c.name == 'search')) {
        //     client.application.commands.create({
        //         name: 'ping', description: 'ping!',
        //     });
        // }
    },
    commands: [
        new SlashCommandBuilder().setName('ping').setDescription('ping!'),
        new ContextMenuCommandBuilder().setName('ping').setType(ApplicationCommandType.Message)
    ]

}