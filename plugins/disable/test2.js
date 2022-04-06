
module.exports = {
    name: 'test2',
    description: "test2",
    async setup(client) {

        const gID = '716270880493404172';
        const cID = '827129069178978324';
        const mID = '961264096752324669';

        const guild = client.guilds.cache.get(gID);
        const channel = guild.channels.cache.get(cID);
        const message = await channel.messages.fetch(mID);

        // console.log(guild.name);
        // console.log(channel.name);
        // console.log(message.id);

        const { content } = message;
        // console.log('content', content);
    }
}
