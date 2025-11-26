
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const debug = require('fs').existsSync("./.env");

const EMOJI_WASTEBASKET = '🗑️';
const DEBUG_CHANNEL_ID = '826992877925171250';
const workspaceChannelIDs = [
    DEBUG_CHANNEL_ID,
    '977860525830586379',   // #_aigis_retweet
    '1009645372831977482',  // #_bot-test

    // skip last message
    '1054284227375542333', '1113369067177381918',  // #sao2
    '1156057315829624933',  // #dls
    '1169461312657567765',  // #dlimg, for DICE

    // delall
    '713623232070156309',   // #_log
    '1253632587226812466',  // #stream-log

    // delall, for DICE
    '1024627281592848434',  // #⁠_bot-test
    '1024627739023650827', '1024627744681771108',  // #⚫_member
    '1236925125434146816', '1236925146674106441',  // #⚫_member2 
]
const streamChannels = [
    // filter by embed color
    '1008565763260551188', '1010005672152281218',
    '1010167343378333768', '1010167418598981652',
    '1179351465765122058', '1179351515299852329',
    '1253621663187337267', '1253621682132877399',
    '1266709882455855165', '1266709915104313356',
]

const botIDs = new Set(['713624995372466179', '928492714482343997', '1179344721047474207', '920485085935984641']);

const getTimeFromDiscordSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 14200704e5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms, null));

async function deleteAllMessage({ channel, author }) {

    const cID = channel?.id;

    if (!workspaceChannelIDs.includes(cID) &&
        !streamChannels.includes(cID)) { return; }
    if (!['353625493876113440', '920485085935984641'].includes(author?.id)) { return; }

    const timelimit = Date.now() - 1209600000 + 60000;  // 14 days - 60 sec
    // console.log(`bulkDelete ${channel.name}`);

    let delcount = 0, before;
    while (1) {
        const msgs = await channel.messages.fetch({ before, force: true });
        const keys = Array.from(msgs.keys());
        const bulkDel = [];
        const delList = [];
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const msg = msgs.get(key);

            // check delete flag
            let delFlag = false;
            const dTime = Date.now() - msg.createdTimestamp;

            if ([DEBUG_CHANNEL_ID].includes(cID)) {
                if (!botIDs.has(msg.author.id)) { delFlag = true; }                        // del not-arraydcbot log
                if (dTime > 90000000) { delFlag = true; }                                  // delete old log (after 25hr)
                // if (msg.content.includes('🛠️') && dTime > 28800000) { delFlag = true; }    // delete old log (after 8hr)
                if (msg.content.includes('🏗️')) { delFlag = true; }
            }

            // #_aigis_retweet
            else if (['977860525830586379'].includes(cID)) {
                if (!botIDs.has(msg.author.id)) { delFlag = true; }                        // del not-arraydcbot log
            }

            // #_bot-test
            else if (['1009645372831977482'].includes(cID)) {
                if (dTime > 90000) { delFlag = true; }                                     // delete old log (after 1.5min)
            }

            // #sao / #sao2 / #dls / #dlimg
            else if (['1054284227375542333', '1113369067177381918', '1156057315829624933', '1169461312657567765'].includes(cID)) {
                delFlag = (before || i > 0);                                               // skip last message    (before == true => not first fetch; ) || (i > 0          => not last message;)
            }

            // stream channels
            else if (streamChannels.includes(cID)) {
                if (![0xFFD600, 0x5F84F1].includes(msg.embeds?.[0]?.color)) { delFlag = true; }
            }

            else {
                delFlag = true;                                                            // del all log in other channel
            };


            // skip delall button
            if (((msg.components || [])[0]?.components || [])[0]?.customId == 'delall') { delFlag = false; };

            before = key;
            if (!delFlag) { continue; }

            // await msg.delete().then(msg => console.log(`Del msg: ${msg.content}`)).catch(() => { });
            // await msg.delete().catch(() => { });
            if (timelimit < getTimeFromDiscordSnowflake(msg.id)) {
                bulkDel.push(msg);
            } else {
                delList.push(msg);
            }

            ++delcount;
        }
        if (debug) {
            console.log(`     Checked ${msgs.size} messages in ${channel.name}, before: ${before}`)
        }

        if (bulkDel.length > 0) {
            channel.bulkDelete(bulkDel).catch(e => console.log(`[Delall]`, e.message));
            await sleep(5000);
        }

        if (delList.length > 0) {
            let timeout = false;

            for (const msg of delList) {

                const sTime = Date.now();

                await Promise.race([
                    msg.delete().catch(e => console.log(`[Delall]`, e.message)),
                    sleep(10000)    // timeout in 10sec
                ]);

                const dTime = Date.now() - sTime;
                if (dTime >= 9999) { timeout = true; break; }

                if (debug) { console.log(`[Delall] delete ${msg.id} use ${dTime} ms.`); }
                await sleep(5000);
            }

            if (timeout) { console.log(`[Delall] delete message in ${channel.name} timeout!`); break; }
        }

        if (msgs.size < 50) { break; }
    }
    if (debug) {
        console.log(`Bulk deleted ${delcount} messages in ${channel.name}`)
    }
}

module.exports = {
    name: 'delall',
    description: 'delall msg',

    async execute(message, pluginConfig, command, args, lines) {

        if (command == 'delall' || (command == 'delall2' && debug)) {

            let { channel, author } = message;
            await message.delete().catch(e => console.log(`[Delall]`, e.message));
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

        if (!user || user.bot) { return; }

        if (!interaction.isButton()) { return false; }
        if (interaction.customId != 'delall') { return false; }

        if (!message) { return; }
        let { channel } = message;

        // mute reply
        // interaction.reply({ content: ' ' }).catch(() => { });
        interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(e => console.log(`[Delall]`, e.message));

        deleteAllMessage({ channel, author: user });
    },

    async setup(client) {
        for (let botID of require(`../index.js`).getBotIDs()) { botIDs.add(botID); }
        await deleteAllMessage({ author: client.user, channel: await client.channels.fetch(DEBUG_CHANNEL_ID).catch(() => null) });
        await deleteAllMessage({ author: client.user, channel: await client.channels.fetch('1009645372831977482').catch(() => null) });
    }
}