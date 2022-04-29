module.exports = {
    name: 'memberCounter',
    description: "member counter",

    setup(client) {

        let interval = setInterval(async () => {

            for (let gID of Object.keys(client.config)) {
                const config = client.config[gID];
                if (!config.memberCounter) { continue; }
                const cID = config.memberCounter.COUNTER_CHANNEL_ID;

                const guild = client.guilds.cache.get(gID);
                const memberCount = guild.memberCount;
                const channel = guild.channels.cache.get(cID);
                const channelName = channel.name;

                await channel.setName(`群組人數: ${memberCount.toLocaleString()}`).catch(console.log);

                if (channelName != channel.name) {
                    console.log('Updating Member Count');
                }
            }
        }, 5000);

        client.once('close', () => {
            clearInterval(interval);
        });

    }
}