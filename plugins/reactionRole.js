
const { Permissions } = require('discord.js');

const reactionRole = async (reaction, user, add) => {
    // skip bot
    if (user.bot) return;
    // skip DM
    if (!reaction.message.guild) return;
    // get full message
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();

    const message = reaction.message;

    // get config
    const { client, channel, content } = message;
    let config = client.config[message.guild.id];
    if (!config || !config.reactionRole) { return false; }
    if (channel.id != config.reactionRole.RULE_CHANNEL_ID) { return false; }

    // get message
    const emojiRoles = [];
    const lines = content.split('\n');
    const reg = /\s*(\S+)\s*=.+\<@&(\d+)\>/;
    for (const line of lines) {
        if (!reg.test(line)) { continue; }

        const [, emoji, roleID] = line.match(reg);
        const role = message.guild.roles.cache.get(roleID);

        if (!role) { continue; }
        emojiRoles.push({ emoji, role });
    }

    // work
    const emojiRole = emojiRoles.find(({ emoji }) => { return emoji == reaction.emoji.name; });
    if (!emojiRole) { return; }

    if (!message.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) { return; }

    const target = message.guild.members.cache.get(user.id);
    if (add) { await target.roles.add(emojiRole.role).catch(console.log); }
    else { await target.roles.remove(emojiRole.role).catch(console.log); }

    return;
}

module.exports = {
    name: 'reactionRole',
    description: "Sets up a reaction role message!",
    async execute(message) {
        // skip DM
        if (!message.guild) { return false; }

        // get config
        const { client, channel, content } = message;
        let config = client.config[message.guild.id];
        if (!config || !config.reactionRole) { return false; }
        if (channel.id != config.reactionRole.RULE_CHANNEL_ID) { return false; }

        // get message
        const lines = content.split('\n');
        const reg = /\s*(\S+)\s*=.+\<@&(\d+)\>/;
        for (const line of lines) {
            if (!reg.test(line)) { continue; }

            const [, emoji, roleID] = line.match(reg);
            const role = message.guild.roles.cache.get(roleID);

            if (!role) { continue; }
            message.react(emoji);
        }

        // set emoji
        return true;
    },

    setup(client) {
        client.on('messageReactionAdd', async (reaction, user) => {
            await reactionRole(reaction, user, true);
        });

        client.on('messageReactionRemove', async (reaction, user) => {
            await reactionRole(reaction, user, false);
        });
        // client.on('messageReactionRemoveAll', async (reaction, user) => {
        //     console.log('messageReactionRemoveAll')
        //     await this.execute(reaction.message);
        // });
        // client.on('messageReactionRemoveEmoji', async (reaction, user) => {
        //     console.log('messageReactionRemoveEmoji')
        //     await this.execute(reaction.message);
        // });
    }
}
