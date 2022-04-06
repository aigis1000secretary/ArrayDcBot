module.exports = {
    name: 'reboot',
    description: "reboot command",
    execute(message) {
        if (message.author.id != '353625493876113440') { return; }

        console.log(message.guild.members.cache.get('353625493876113440'));
        console.log(message.guild.members.cache.get(`449551633693802536`));
        
        return true;
    },
}