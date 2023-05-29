module.exports = {
    name: 'memberCounter',
    description: "member counter",

    async clockMethod(client, { hours, minutes, seconds }) {
        // check every 10 sec
        if (seconds % 10 != 0) { return; }

        for (let gID of client.guildConfigs.keys()) {

            const pluginConfig = client.getPluginConfig(gID, 'memberCounter');
            if (!pluginConfig) { continue; }
            const cID = pluginConfig.COUNTER_CHANNEL_ID;

            const guild = await client.guilds.fetch(gID);
            if (!guild) { continue; }
            const channel = await client.channels.fetch(cID);
            if (!channel) { continue; }

            const memberCount = guild.memberCount;
            const channelName = channel.name;
            const newName = `群組人數-${memberCount.toLocaleString()}`;

            if (channelName != newName) {
                channel.setName(newName)
                    .then(newChannel => console.log(`Updating Member Count ${newChannel.name}`))
                    .catch((error) => { console.log(error.message); });
            }
        }
    },
}