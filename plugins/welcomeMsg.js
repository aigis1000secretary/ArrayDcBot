
module.exports = {
    name: 'welcomeMsg',
    description: "welcome message",

    setup(client) {
        client.on('guildMemberAdd',
            (member) => {
                let guild = member.guild;

                const pluginConfig = client.getPluginConfig(guild.id, 'welcomeMsg');
                if (!pluginConfig) { return false; }

                let memberName = member.toString();
                let welcomeMsg = eval(pluginConfig.WELCOME_MSG);

                let channel = guild.channels.cache.get(pluginConfig.WELCOME_CHANNEL_ID);

                // welcome message
                channel.send(welcomeMsg).catch(e => console.log(e.message));
            });
    }
}
