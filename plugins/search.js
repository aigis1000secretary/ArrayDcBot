const { EmbedBuilder } = require("@discordjs/builders");

const getTimeFromDiscordSnowflake = (snowflake) => (Number(BigInt(snowflake) >> 22n) + 14200704e5);

module.exports = {
    name: 'search',
    description: "search string in guild",

    async execute(message, pluginConfig, command, args, lines) {
        const { client, guild } = message;

        if (command == 'search') {


            let reply = await message.reply({
                embeds: [new EmbedBuilder().setDescription(`Searching...`)], allowedMentions: { repliedUser: false }
            }).catch(() => { });

            const channels = await guild.channels.fetch();

            // set time limit
            const now = Date.now() - 28800000;  // search msg in 8 hrs
            let result = [];

            for (const [cID] of channels) {
                const channel = await client.channels.fetch(cID);

                let before;
                while (1) {
                    // console.log(`<#${cID}>`, channel.name);

                    if (!channel?.lastMessageId || ![0, 10, 11, 12, 14, 15, 16].includes(channel.type)) { break; }
                    if (now > getTimeFromDiscordSnowflake(channel.lastMessageId)) { break; }

                    const msgs = await channel.messages.fetch({ before, force: true });
                    const keys = Array.from(msgs.keys());

                    for (const mID of keys) {
                        const msg = msgs.get(mID);
                        before = mID;

                        if (msg.id == message.id) { continue; }

                        // check time limit
                        if (now > msg.createdTimestamp) { before = -1; break; }

                        // found
                        if (msg.content.includes(args[0]) ||
                            msg.embeds && Array.isArray(msg.embeds) && msg.embeds[0]?.description
                            && msg.embeds[0].description.includes(args[0])) {

                            result.push(msg);
                            continue;
                        }
                    }

                    if (before == -1 || keys.length == 0) { break; }
                }
            }

            let description = [];
            for (let i = 0; (i < 20 && i < result.length); ++i) {
                description.push(result[i].url);
            }
            if (result.length > 20) {
                description.push(`... and more ${result.length - 20} result ...`);
            }
            if (description.length == 0) {
                description = ['Not found.'];
            }

            let embed = new EmbedBuilder()
                .setTitle(`Search: ${args[0]}`)
                .setDescription(description.join('\n'));

            // let fields = [];
            // fields.push({ name: `Search:`, value: args[0] });
            // fields.push({ name: `Result:`, value: result.length });
            // fields.push({ name: `Position`, value: description.join('\n') });
            // let embed = new EmbedBuilder().addFields(fields);

            reply.edit({ embeds: [embed], allowedMentions: { repliedUser: false } })
                .catch(() => { });
        }

        return;
    },
}