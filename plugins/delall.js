
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DEBUG_CHANNEL_ID = '826992877925171250';

const deleteAllMessage = async (message) => {

    let { channel, author } = message;
    const cID = channel.id;

    if (![
        DEBUG_CHANNEL_ID,
        '977860525830586379',   // #_aigis_retweet
        '1009645372831977482',  // #_bot-test
        '1054284227375542333',  // #sao
        '713623232070156309',   // #_log
        '1008565763260551188',  // #⚫_stream
        '1010005672152281218'   // #⚫_member
    ].includes(cID)) { return; }
    if (author?.id != '353625493876113440') { return; }

    // console.log(`bulkDelete ${channel}`);

    let delcount = 0;
    while (1) {
        let msgs = await channel.messages.fetch({ force: true });
        let bulkDel = [];
        for (let key of msgs.keys()) {
            let msg = msgs.get(key);

            // check time
            let delFlag = false;

            // only del old log in DEBUG_CHANNEL_ID
            if ([DEBUG_CHANNEL_ID].includes(cID) && Date.now() - msg.createdTimestamp > 90000000) { delFlag = true; };

            // del not-arraydcbot log in DEBUG_CHANNEL_ID /  #_aigis_retweet
            if ([DEBUG_CHANNEL_ID, '977860525830586379'].includes(cID) &&
                !['713624995372466179', '928492714482343997', '920485085935984641'].includes(msg.author.id)) { delFlag = true; };

            // del all log in other channel
            if (![DEBUG_CHANNEL_ID, '977860525830586379'].includes(cID)) { delFlag = true; };

            if (!delFlag) { continue; }

            // await msg.delete().then(msg => console.log(`Del msg: ${msg.content}`)).catch(() => { });
            // await msg.delete().catch(() => { });
            bulkDel.push(msg);

            ++delcount;
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

        if (command != 'delall') { return; }

        deleteAllMessage(message);
    },

    async setup(client) {
        await deleteAllMessage({ channel: await client.channels.fetch(DEBUG_CHANNEL_ID), author: { id: '353625493876113440' } })
        await deleteAllMessage({ channel: await client.channels.fetch('1009645372831977482'), author: { id: '353625493876113440' } })
    }
}