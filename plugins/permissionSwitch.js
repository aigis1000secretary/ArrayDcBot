
const [EMOJI_LOCK, EMOJI_UNLOCK] = ['🔒', '🔓']

const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'permissionSwitch',
    description: "permissionSwitch",

    async execute(message, pluginConfig, command, args, lines) {

        const { guild, channel, author, content } = message;

        if (![EMOJI_LOCK, EMOJI_UNLOCK].includes(content)) { return false; }

        for (const config of pluginConfig) {

            const { CHANNEL_ID, TARGET_ROLE_ID } = config;

            // const CHANNEL_ID = '775100135515750470';
            // const TARGET_ROLE_ID = '777779439122776064';

            // check work channel
            if (channel.id != CHANNEL_ID) { continue; }

            // check user permissions
            const permissions = channel.permissionsFor(author);
            if (!permissions.has(PermissionFlagsBits.ManageChannels)) {
                continue;
            }

            // get target role
            const targetRole = guild.roles.cache.get(TARGET_ROLE_ID);
            if (!targetRole) { continue; }

            await channel.permissionOverwrites.edit(targetRole, { SendMessages: (content == EMOJI_UNLOCK) })
                .catch(console.error);
        }

        return true;
    },
}