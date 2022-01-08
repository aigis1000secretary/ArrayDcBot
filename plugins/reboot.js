const { CONFIG } = require('../config.js');

module.exports = {
    name: 'reboot',
    description: "reboot command",
    execute(message) {
        if (!message.guild) { return false; }
        const { command, args } = CONFIG[message.guild.id].fixMessage(message.content);

        if ('reboot' != command) { return; }
        if (message.author.id != '353625493876113440') { return; }

        require('../index.js').terminate();
        return true;
    },
}