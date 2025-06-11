
const [EMOJI_LOCK, EMOJI_UNLOCK] = ['🔒', '🔓']

module.exports = {
    name: 'permissionSwitch',
    description: "permissionSwitch",

    async execute(message, pluginConfig, command, args, lines) {

        const { guild, channel, content } = message;

        if (![EMOJI_LOCK, EMOJI_UNLOCK].includes(content)) { return false; }

        for (const config of pluginConfig) {

            const { CHANNEL_ID, ADMIN_ROLE_ID, TARGET_ROLE_ID } = config;

            // const CHANNEL_ID = '775100135515750470';
            // const ADMIN_ROLE_ID = '766316861427023882';
            // const TARGET_ROLE_ID = '777779439122776064';

            // check work channel
            if (channel.id != CHANNEL_ID) { continue; }
            // check user is admin
            if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) { continue; }

            // get target role
            const targetRole = guild.roles.cache.get(TARGET_ROLE_ID);
            if (!targetRole) { continue; }

            await channel.permissionOverwrites.edit(targetRole, { SendMessages: (content == EMOJI_UNLOCK) })
                .catch(console.error);
        }

        return true;
    },
}