const { EmbedBuilder, ApplicationCommandOptionType, MessagePayload } = require('discord.js');

const getTimeFromDiscordSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 14200704e5);

const searchKeyword = async (client, guild, keyword, days = 0) => {

    days = Math.min(7, days);   // set days max limit

    // get channels
    const channels = await guild.channels.fetch();

    // set time limit
    const timenow = Date.now() - 3000;
    const timelimit = Date.now() - ((days * 86400000) || 28800000);  // search msg in 8 hrs or n days
    let result = new Map();
    const resultLimit = 20;

    // search in channels
    for (const [cID] of channels) {

        // get channel
        const channel = await client.channels.fetch(cID);

        // skip invalid channel
        if (!channel?.lastMessageId || ![0, 10, 11, 12, 14, 15, 16].includes(channel.type)) { continue; }
        // skip old channel
        if (timelimit > getTimeFromDiscordSnowflake(channel.lastMessageId)) { continue; }

        // console.log(`<#${cID}>`, channel.name);
        let before;
        while (1) {

            // get messages
            const msgs = await channel.messages.fetch({ before, force: true });
            const keys = Array.from(msgs.keys());

            for (const mID of keys) {
                const msg = msgs.get(mID);
                before = mID;
                // console.log(`<-${mID}>`, (msg.content?.split('\n') || [])[0]?.trim());

                // check message timestamp
                if (timelimit > msg.createdTimestamp) { before = -1; break; }   // skip old message
                if (msg.createdTimestamp > timenow) { continue; }               // skip new message

                // found in content
                if (msg.content) {
                    const { content } = msg;

                    if (content.toLowerCase().includes(keyword.toLowerCase())) {
                        result.set(msg.id, msg);
                        continue;
                    }
                }
                // found in embeds
                if (Array.isArray(msg.embeds)) {
                    for (const embed of msg.embeds) {
                        const content = `${embed.title} ${embed.url} ${embed.description}` || '';

                        if (content.toLowerCase().includes(keyword.toLowerCase())) {
                            result.set(msg.id, msg);
                            break;
                        }
                    }
                }

            }

            if (before == -1) { break; }                // message too old, to next channel
            if (keys.length == 0) { break; }            // message not found, to next channel
        }
    }

    let description = [];
    for (const key of Array.from(result.keys()).sort().reverse()) {
        const msg = result.get(key);

        description.push(msg.url);

        if (description.length > resultLimit) {
            description.push(`... and more ${result.size - resultLimit} results ...`);
            break;
        }
    }
    if (description.length == 0) { description = ['Not found.']; }

    let embed = new EmbedBuilder()
        .setTitle(`Search: ${keyword}`)
        .setDescription(description.join('\n'));

    // let fields = [];
    // fields.push({ name: `Search:`, value: keyword });
    // fields.push({ name: `Result:`, value: result.length });
    // fields.push({ name: `Position`, value: description.join('\n') });
    // let embed = new EmbedBuilder().addFields(fields);

    return { embeds: [embed], allowedMentions: { repliedUser: false }, ephemeral: true };
}

module.exports = {
    name: 'search',
    description: "search string in guild",

    async setup(client) {

        await client.application.commands.fetch();

        // // delete all slash command
        // for (let [key, value] of client.application.commands.cache) {
        //     await value.delete();
        // }

        // registre slash command
        if (!client.application.commands.cache.find(c => c.name == 'search')) {
            client.application.commands.create({
                name: 'search', description: '搜尋',
                options: [{
                    name: 'keyeord', description: "關鍵字",
                    type: ApplicationCommandOptionType.String, required: true,
                }, {
                    name: 'days', description: "時間範圍(日)",
                    type: ApplicationCommandOptionType.Integer, required: false,
                }]
            });
        }
    },



    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isCommand()) { return false; }
        if (interaction.commandName != 'search') { return false; }

        // keep reply postion
        interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Searching...`)], allowedMentions: { repliedUser: false }, ephemeral: true })
            .catch((e) => console.log(e.message));

        // start search
        const { client, guild } = interaction;
        let keyword = interaction.options.data[0].value;
        let days = interaction.options.data[1].value;
        const messagePayload = await searchKeyword(client, guild, keyword, days);

        // reply result
        interaction.editReply(messagePayload).catch((e) => console.log(e.message));

        return true;
    },

    async execute(message, pluginConfig, command, args, lines) {
        const { client, guild } = message;

        if (command == 'search') {

            // keep reply postion
            let reply = await message.reply({ embeds: [new EmbedBuilder().setDescription(`Searching...`)], allowedMentions: { repliedUser: false } })
                .catch((e) => console.log(e.message));

            // start search
            const messagePayload = await searchKeyword(client, guild, keyword);

            // reply result
            reply.edit(messagePayload).catch((e) => console.log(e.message));
        }

        return;
    },
}