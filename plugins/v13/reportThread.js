module.exports = {
    // data: new SlashCommandBuilder().setName('report').setDescription('我要投訴！【投訴版】專用'),
    async execute(message) {
        if (message.channel.id === '850912764967780372') {
            const args = message.content.slice(1).split(/\s+/);
            if ('report' != args.shift().toLowerCase()) { return; }

            let minute = new Date().getMinutes().toString().padStart(2, '0');
            let second = new Date().getSeconds().toString().padStart(2, '0');
            let hour = new Date().getHours().toString().padStart(2, '0');
            let time = `${hour}${minute}${second}`;

            const thread = await message.channel.threads.create({
                name: `編號[${time}]`,
                autoArchiveDuration: 1440,
                type: 'GUILD_PRIVATE_THREAD',
                reason: 'Needed a separate thread for report',
            });
            console.log(`討論串建立完成: ${thread.name}`);
            thread.members.add(message.member.id);
            thread.send(`<@${message.member.id}>您好\n請放心，這個討論串只有您與 <@&766316861427023882> 看的見\n請將您要投訴的內容、訊息鏈結、截圖都貼在這個地方，會由管理員進行處置。`);
            // await message.reply({ content: '投訴專用討論串已為您建立，請放心的在該討論串進行投訴', ephemeral: true });
            message.delete();
        }
    }

};