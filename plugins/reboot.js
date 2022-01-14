
module.exports = {
    name: 'reboot',
    description: "reboot command",
    execute(message) {
        if (!message.guild) { return false; }

        // get config
        const { client, content } = message;
        let config = client.config[message.guild.id];
        if (!config) { return false; }

        const { command, args } = config.fixMessage(content);
        if (!command) { return false; }

        if ('reboot' != command) { return; }
        if (message.author.id != '353625493876113440') { return; }

        require('../index.js').terminate();
        return true;
    },
}