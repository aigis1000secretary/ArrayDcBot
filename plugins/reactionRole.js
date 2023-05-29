
const { PermissionFlagsBits } = require('discord.js');

const reactionRole = async (reaction, user, pluginConfig, add) => {
    // skip bot
    if (user.bot) return;

    const { message } = reaction;

    // get config
    const { guild, channel, content } = message;
    if (channel.id != pluginConfig.RULE_CHANNEL_ID) { return false; }

    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.log('Missing Permissions: MANAGE_ROLES');
        return false;
    }

    // get message
    const emojiRoles = [];
    const lines = content.split('\n');
    const reg = /\s*(\S+)\s*=.+\<@&(\d+)\>/;
    for (const line of lines) {
        if (!reg.test(line)) { continue; }

        const [, emoji, roleID] = line.match(reg);
        const role = guild.roles.cache.get(roleID);

        if (!role) {
            console.log(`Unknown role: <@&${roleID}>`)
            continue;
        }
        emojiRoles.push({ emoji, role });
    }

    // work
    const emojiRole = emojiRoles.find(({ emoji }) => {
        const emojiName = reaction.emoji.name;
        return (emoji == emojiName || emoji.includes(`:${emojiName}:`));
    });
    if (!emojiRole) { return; }

    const target = guild.members.cache.get(user.id);
    if (add) { await target.roles.add(emojiRole.role).catch(console.log); }
    else { await target.roles.remove(emojiRole.role).catch(console.log); }

    return;
}

module.exports = {
    name: 'reactionRole',
    description: "Sets up a reaction role message!",

    execute(message, pluginConfig, command, args, lines) {
        // get config
        const { channel, content } = message;
        if (channel.id != pluginConfig.RULE_CHANNEL_ID) { return false; }

        // get message
        const reg = /\s*(\S+)\s*=.+\<@&(\d+)\>/;
        for (const line of content.split('\n')) {
            if (!reg.test(line)) { continue; }

            const [, emoji, roleID] = line.match(reg);
            const role = message.guild.roles.cache.get(roleID);

            if (!role) { continue; }
            message.react(emoji.trim()).catch(() => { });
        }

        // set emoji
        return true;
    },


    messageReactionAdd(reaction, user, pluginConfig) {
        reactionRole(reaction, user, pluginConfig, true);
    },

    messageReactionRemove(reaction, user, pluginConfig) {
        reactionRole(reaction, user, pluginConfig, false);
    },

}
