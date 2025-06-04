
const fs = require('fs');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ip',
    description: 'feedback bot status',

    async execute(message, pluginConfig, command, args, lines) {
        let { client, author: user } = message;

        // reply button message
        if (command == 'ip' && user.id == '353625493876113440') {

            let req = await axios.get(`https://myexternalip.com/raw`);

            let ip = req.status == 200 ? req.data : 'Failed to obtain IP address';
            let uptime = parseInt((Date.now() - client.uptime) / 1000);

            let fields = [];
            fields.push({ name: `IP:`, value: `\`\`${ip}\`\`` });
            fields.push({ name: `BOT Started at:`, value: `<t:${uptime}>  <t:${uptime}:R>` });
            fields.push({ name: `.env exists:`, value: `\`\`${fs.existsSync("./.env")}\`\`` });

            let embed = new EmbedBuilder().addFields(fields);

            message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                .catch(() => { });

            return;
        }
    },

    setup(client) {
    },

}