
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
    '1156057315829624933',  // #dls
    '1169461312657567765',  // #dlimg   // for DICE

    // delall
    '713623232070156309',   // #_log
    '1008565763260551188',  // #⚫_stream
    '1010005672152281218',  // #⚫_member

    // delall, for DICE
    '1024627281592848434',  // #⁠_bot-test
    '1024627739023650827',  // #⚫_stream
    '1024627744681771108',  // #⚫_member 
    '1110077306053070920',  // #⚫_stream2
    '1110077379994472540',  // #⚫_member2
]

const botIDs = new Set(['713624995372466179', '928492714482343997', '1179344721047474207', '920485085935984641']);
for (let botID of require(`../index.js`).getBotIDs()) { botIDs.add(botID); }

const deleteAllMessage = async ({ channel, author }) => {

    const cID = channel?.id;

    if (!workspaceChannelIDs.includes(cID)) { return; }
    if (!['353625493876113440', '920485085935984641'].includes(author?.id)) { return; }

    // console.log(`bulkDelete ${channel.name}`);

    let delcount = 0, before;
    while (1) {
        let msgs = await channel.messages.fetch({ before, force: true });
        let keys = Array.from(msgs.keys());
        let bulkDel = [];
        for (let i = 0; i < keys.length; ++i) {
            let key = keys[i];
            let msg = msgs.get(key);

            // check delete flag
            let delFlag = false;

            if ([DEBUG_CHANNEL_ID].includes(cID)) {
                if (!botIDs.has(msg.author.id)) { delFlag = true; }                                                     // del not-arraydcbot log
                if (Date.now() - msg.createdTimestamp > 90000000) { delFlag = true; }                                   // delete old log (after 25hr)
                if (msg.content.includes('🛠️') && Date.now() - msg.createdTimestamp > 28800000) { delFlag = true; }     // delete old log (after 8hr)
                if (msg.content.includes('🏗️')) { delFlag = true; }
            }

            // #_aigis_retweet
            else if (['977860525830586379'].includes(cID)) {
                if (!botIDs.has(msg.author.id)) { delFlag = true; }                                                     // del not-arraydcbot log
            }

            // #_bot-test
            else if (['1009645372831977482'].includes(cID)) {
                if (Date.now() - msg.createdTimestamp > 90000) { delFlag = true; }                                      // delete old log (after 1.5min)
            }

            // #sao / #sao2 / #dls / #dlimg
            else if (['1054284227375542333', '1113369067177381918', '1156057315829624933', '1169461312657567765'].includes(cID)) {
                delFlag = (before || i > 0);                                                                            // skip last message    (before == true => not first fetch; ) || (i > 0          => not last message;)
            }

            else {
                delFlag = true;                                                                                         // del all log in other channel
            };


            // skip delall button
            if (((msg.components || [])[0]?.components || [])[0]?.customId == 'delall') { delFlag = false; };

            before = key;
            if (!delFlag) { continue; }

            // await msg.delete().then(msg => console.log(`Del msg: ${msg.content}`)).catch(() => { });
            // await msg.delete().catch(() => { });
            bulkDel.push(msg);

            ++delcount;
        }
        if (require('fs').existsSync("./.env")) {
            console.log(`     Checked ${msgs.size} messages in ${channel.name}, before: ${before}`)
        }

        await channel.bulkDelete(bulkDel)
            .catch(async (e) => {
                if (e.message.includes('old')) { for (let msg of bulkDel) { await msg.delete().catch(() => null); } }
            });
        if (msgs.size != 50) { break; }
    }
    if (require('fs').existsSync("./.env")) {
        console.log(`Bulk deleted ${delcount} messages in ${channel.name}`)
    }

}

module.exports = {
    name: 'delall',
    description: 'delall msg',

    async execute(message, pluginConfig, command, args, lines) {

        if (command == 'delall' || (command == 'delall2' && require('fs').existsSync("./.env"))) {

            let { channel, author } = message;
            await message.delete().catch((e) => console.log(e.message));
            deleteAllMessage({ channel, author });
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
        await deleteAllMessage({ author: client.user, channel: await client.channels.fetch(DEBUG_CHANNEL_ID).catch(() => null) });
        await deleteAllMessage({ author: client.user, channel: await client.channels.fetch('1009645372831977482').catch(() => null) });
    }
}