
module.exports = {
    name: 'welcomeMsg',
    description: "welcome message",

    setup(client) {
        client.on('guildMemberAdd',
            (member) => {
                let guild = member.guild;

                let config = client.config[guild.id];
                if (!config || !config.welcomeMsg) { return false; }

                let memberName = member.toString();
                let welcomeMsg = eval(config.welcomeMsg.WELCOME_MSG);

                let channel = guild.channels.cache.get(config.welcomeMsg.WELCOME_CHANNEL_ID);

                // welcome message
                channel.send(welcomeMsg);
            });
    }
}
