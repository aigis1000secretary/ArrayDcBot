
const { PermissionFlagsBits, ChannelType, ButtonStyle } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

async function executeReport({ user, message, pluginConfig }) {

    const { channel } = message;
    const { ADMIN_ROLE_ID } = pluginConfig;

    // check permissions
    let permissions = channel.permissionsFor(message.guild.members.me);
    if (!permissions.has(PermissionFlagsBits.CreatePrivateThreads)) {
        channel.send({ content: 'Missing Permissions: CREATE_PRIVATE_THREADS' });
        return false;
    }
    // if (!permissions.has(PermissionFlagsBits.CreatePublicThreads)) {
    //     channel.send({ content: 'Missing Permissions: CREATE_PUBLIC_THREADS' });
    //     return false;
    // }
    if (!permissions.has(PermissionFlagsBits.SendMessagesInThreads)) {
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
        invitable: false,
        autoArchiveDuration: 1440,
        type: ChannelType.PrivateThread,
        // type: ChannelType.PublicThread,
        reason: 'Needed a separate thread for report',
    }).catch(error => {
        channel.send({ content: `\`\`\`${error.toString()}\`\`\`` });
        console.log(`[Report]`, error.toString());
    });

    if (!thread) { return false; }
    console.log(`討論串建立完成: ${thread.name}`);

    // add user
    thread.members.add(user.id);
    thread.send({
        content: [
            `${user.toString()}您好`,
            `請放心，這個討論串只有您與 <@&${ADMIN_ROLE_ID}> 看的見`,
            `請將您要投訴的內容、訊息鏈結、截圖都貼在這個地方，會由管理員進行處置。`,
            `※請注意若標註 @ 某人即會邀請對方進入此討論串。`
        ].join('\n')
    });
}

module.exports = {
    name: 'reportThread',
    description: "report thread",

    async execute(message, pluginConfig, command, args, lines) {

        const { channel, member } = message;
        const { ADMIN_ROLE_ID, REPORT_CHANNEL_ID } = pluginConfig;

        // check channel
        if (message.channel?.id != REPORT_CHANNEL_ID) { return false; }

        // check cmd
        if (command == 'report') {
            executeReport({ user: message.author, message, pluginConfig });
            return false;
        }
        if (command == 'reportbtn') {

            // check permissions
            let permissions = channel.permissionsFor(message.guild.members.me);
            if (!permissions.has(PermissionFlagsBits.CreatePrivateThreads)) { channel.send({ content: 'Missing Permissions: CREATE_PRIVATE_THREADS' }); return; }
            // if (!permissions.has(PermissionFlagsBits.CreatePublicThreads)) { channel.send({ content: 'Missing Permissions: CREATE_PUBLIC_THREADS' }); return; }
            if (!permissions.has(PermissionFlagsBits.SendMessagesInThreads)) { channel.send({ content: 'Missing Permissions: SEND_MESSAGES_IN_THREADS' }); return; }
            if (!permissions.has(PermissionFlagsBits.ManageRoles)) { channel.send({ content: 'Missing Permissions: MANAGE_ROLES' }); return; }

            // check admin or not
            const isAdmin = member.roles.cache.get(ADMIN_ROLE_ID);
            if (!isAdmin) {
                channel.send({ content: '[錯誤] 權限錯誤 #02!' }).catch(() => { });
                return;
            }

            const description = `處理人員: <@&${ADMIN_ROLE_ID}>`;
            const embed = new EmbedBuilder()
                // .setColor('#010d85')
                .setDescription(description)

            const actionRow =
                new ActionRowBuilder()
                    .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                        .setLabel('回報')
                        .setCustomId('report')
                    )

            // add user
            await channel.send({ embeds: [embed], components: [actionRow] });
        }
    },

    async interactionCreate(interaction, pluginConfig) {
        if (!interaction.isButton()) { return false; }
        if (interaction.customId != 'report') { return false; }

        const { message, user } = interaction;
        const command = interaction.customId;
        if (!user || user.bot) { return; }
        if (!message) { return; }

        // check channel
        if (message.channel?.id != pluginConfig.REPORT_CHANNEL_ID) { return false; }

        // mute reply
        // interaction.reply({ content: ' ' }).catch(() => { });
        interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(e => console.log(`[Report]`, e.message));

        // check channel & cmd
        if (command == 'report') {
            executeReport({ user, message, pluginConfig });
            return false;
        }
    },


}