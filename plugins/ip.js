
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

const request = require('../modules/undici-request.js');

module.exports = {
    name: 'ip',
    description: 'feedback bot status',

    async execute(message, pluginConfig, command, args, lines) {
        const { client, author: user } = message;

        // reply button message
        if (command == 'ip' && user.id == '353625493876113440') {

            const req = await request.get({ url: `https://myexternalip.com/raw` });

            const ip = req.statusCode == 200 ? req.body : `Failed to obtain IP address, Error: <${req.statusCode}>`;
            const uptime = parseInt((Date.now() - client.uptime) / 1000);

            const fields = [];
            fields.push({ name: `IP:`, value: `\`\`${ip}\`\`` });
            fields.push({ name: `BOT Started at:`, value: `<t:${uptime}>  <t:${uptime}:R>` });
            fields.push({ name: `.env exists:`, value: `\`\`${fs.existsSync("./.env")}\`\`` });

            const embed = new EmbedBuilder().addFields(fields);

            message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                .catch(() => { });

            return;
        }
    },
}