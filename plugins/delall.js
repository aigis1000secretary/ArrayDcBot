
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const EMOJI_WASTEBASKET = '🗑️';

const DEBUG_CHANNEL_ID = '826992877925171250';
const workspaceChannelIDs = [
    DEBUG_CHANNEL_ID,
    '977860525830586379',   // #_aigis_retweet
    '1009645372831977482',  // #_bot-test
    '1054284227375542333',  // #sao
    '1113369067177381918',  // #sao2
    '713623232070156309',   // #_log
    '1008565763260551188',  // #⚫_stream
    '1010005672152281218'   // #⚫_member
]

const deleteAllMessage = async (message) => {

    let { channel, author } = message;
    const cID = channel.id;

    if (!workspaceChannelIDs.includes(cID)) { return; }
    if (author?.id != '353625493876113440') { return; }

    // console.log(`bulkDelete ${channel.name}`);

    let delcount = 0, before;
    while (1) {
        let msgs = await channel.messages.fetch({ before, force: true });
        let bulkDel = [];
        for (let key of msgs.keys()) {
            let msg = msgs.get(key);
            before = key;

            // check time
            let delFlag = false;

            // only del old log in DEBUG_CHANNEL_ID
            if ([DEBUG_CHANNEL_ID].includes(cID) && Date.now() - msg.createdTimestamp > 90000000) { delFlag = true; };

            // del not-arraydcbot log in DEBUG_CHANNEL_ID /  #_aigis_retweet
            if ([DEBUG_CHANNEL_ID, '977860525830586379'].includes(cID) &&
                !['713624995372466179', '928492714482343997', '920485085935984641'].includes(msg.author.id)) { delFlag = true; };

            // del all log in other channel
            if (![DEBUG_CHANNEL_ID, '977860525830586379'].includes(cID)) { delFlag = true; };

            // skip delall button
            if (((msg.components || [])[0]?.components || [])[0]?.customId == 'delall') { delFlag = false; };

            if (!delFlag) { continue; }

            // await msg.delete().then(msg => console.log(`Del msg: ${msg.content}`)).catch(() => { });
            // await msg.delete().catch(() => { });
            bulkDel.push(msg);

            ++delcount;
        }
        if (require('fs').existsSync("./.env")) {
            console.log(`     Checked ${msgs.size} messages in ${channel.name}`)
        }

        await channel.bulkDelete(bulkDel).catch(console.error);
        if (msgs.size != 50) { break; }
    }
    if (require('fs').existsSync("./.env")) {
        console.log(`Bulk deleted ${delcount} messages in ${channel.name}`)
    }

}

module.exports = {
    name: 'delall',
    description: 'delall msg',

    execute(message, pluginConfig, command, args, lines) {

        if (command == 'delall') {

            deleteAllMessage(message);
            return;
        }

        else if (command == 'delbtn') {

            let { channel, author } = message;

            if (!workspaceChannelIDs.includes(channel.id)) { return; }
            if (author?.id != '353625493876113440') { return; }

            let actionRow = new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(false)
                    .setLabel(EMOJI_WASTEBASKET)
                    .setCustomId("delall")
                );

            channel.send({ components: [actionRow] }).catch(() => { });

            return;
        }
    },

    async interactionCreate(interaction, pluginConfig) {
        let { message, user } = interaction;
        let { channel } = message;

        if (!user || user.bot) { return; }

        if (!interaction.isButton()) { return false; }
        if (interaction.customId != 'delall') { return false; }

        // mute reply
        interaction.reply({ content: ' ' }).catch(() => { });

        deleteAllMessage({ channel, author: user });
    },

    async setup(client) {
        await deleteAllMessage({ client, author: { id: '353625493876113440' }, channel: await client.channels.fetch(DEBUG_CHANNEL_ID) })
        await deleteAllMessage({ client, author: { id: '353625493876113440' }, channel: await client.channels.fetch('1009645372831977482') })
    }
}