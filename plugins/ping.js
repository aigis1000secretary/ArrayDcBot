
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const channelID = '1009645372831977482';

module.exports = {
    name: 'ping',
    description: 'pong',
    
    async execute(message, pluginConfig, command, args, lines) {

        if (command != 'ping') { return; }

        let actionRow =
            new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(false)
                    .setLabel("Ping!")
                    .setCustomId("ping")
                );
        
        let embeds = [];
        if (args[0]){
            let msg = `${args[0]}`

            let emojis = await message.guild.emojis.fetch();
            for(let [eID, emoji]  of emojis) {
                msg = msg.replaceAll(`:${emoji.name}:`, `<:${emoji.name}:${emoji.id}>`);
            }
            
            embeds.push(new EmbedBuilder().setDescription(msg));
        }
        if (args[0]){
            let msg = `# ${args[0]}`

            let emojis = await message.guild.emojis.fetch();
            for(let [eID, emoji]  of emojis) {
                msg = msg.replaceAll(`:${emoji.name}:`, `<:${emoji.name}:${emoji.id}>`);
            }
            
            embeds.push(new EmbedBuilder().setDescription(msg));
        }
        
        message.reply({ content: `pong!`, embeds, components: [actionRow], allowedMentions: { repliedUser: false } }).catch(() => { });
    },

    async messageDelete(message, pluginConfig) {
        let { channel, author: user } = message;

        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        let msg = await channel.send({ content: `messageDelete!` }).catch(() => { });

        await sleep(3000);
        msg.delete().catch(() => { });
    },

    async interactionCreate(interaction, pluginConfig) {
        let { message, user } = interaction;
        let { channel } = message;

        // if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        if (!interaction.isButton()) { return false; }
        if (interaction.customId != 'ping') { return false; }

        // mute reply
        interaction.reply({ content: ' ' }).catch(() => { });

        let msg = await channel.send({ content: `interactionCreate!` }).catch(() => { });

        await sleep(3000);
        msg.delete().catch(() => { });
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        let { message } = reaction;
        let { channel } = message;

        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        let msg = await channel.send({ content: `messageReactionAdd!` }).catch(() => { });

        await sleep(3000);
        msg.delete().catch(() => { });
    },

    async messageReactionRemove(reaction, user, pluginConfig) {
        let { message } = reaction;
        let { channel } = message;

        if (!channel || channel.id != channelID) { return; }
        if (!user || user.bot) { return; }

        let msg = await channel.send({ content: `messageReactionRemove!` }).catch(() => { });

        await sleep(3000);
        msg.delete().catch(() => { });
    },

    setup(client) {
    },

}