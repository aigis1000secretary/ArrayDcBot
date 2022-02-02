
const { Permissions } = require('discord.js');

module.exports = {
    name: 'reportThread',
    description: "report thread",
    async execute(message) {
        // skip DM
        if (!message.guild) { return false; }
        // get config
        const { client, channel, content } = message;
        let config = client.config[message.guild.id];
        if (!config || !config.reportThread) { return false; }
        const { REPORT_CHANNEL_ID, ADMIN_ROLE_ID } = config.reportThread;

        // check channel
        if (channel.id != REPORT_CHANNEL_ID) { return false; }

        // check cmd
        const { command } = config.fixMessage(content);
        if (command != 'report') { return false; }

        // check permissions
        let permissions = channel.permissionsFor(message.guild.me);
        if (!permissions.has(Permissions.FLAGS.CREATE_PRIVATE_THREADS)) {
            channel.send({ content: 'Missing Permissions: CREATE_PRIVATE_THREADS' });
            return false;
        }
        // if (!permissions.has(Permissions.FLAGS.CREATE_PUBLIC_THREADS)) {
        //     channel.send({ content: 'Missing Permissions: CREATE_PUBLIC_THREADS' });
        //     return false;
        // }
        if (!permissions.has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS)) {
            channel.send({ content: 'Missing Permissions: SEND_MESSAGES_IN_THREADS' });
            return false;
        }

        // get time stamp
        let minutes = new Date().getMinutes().toString().padStart(2, '0');
        let seconds = new Date().getSeconds().toString().padStart(2, '0');
        let hours = new Date().getHours().toString().padStart(2, '0');
        let time = `${hours}${minutes}${seconds}`;

        // creat thread
        const thread = await channel.threads.create({
            name: `編號[${time}]`,
            autoArchiveDuration: 1440,
            type: 'GUILD_PRIVATE_THREAD',
            // type: 'GUILD_PUBLIC_THREAD',
            reason: 'Needed a separate thread for report',
        }).catch(error => {
            channel.send({ content: error.toString() });
            console.log(error.toString());
        });

        if (!thread) { return false; }
        console.log(`討論串建立完成: ${thread.name}`);

        // add user
        thread.members.add(message.member.id);
        thread.send({
            content: [
                `${message.member.toString()}您好`,
                `請放心，這個討論串只有您與 <@&${ADMIN_ROLE_ID}> 看的見`,
                `請將您要投訴的內容、訊息鏈結、截圖都貼在這個地方，會由管理員進行處置。`
            ].join('\n')
        });
        await message.reply({ content: '投訴專用討論串已為您建立，請放心的在該討論串進行投訴', ephemeral: true });

        message.delete();
    }
}