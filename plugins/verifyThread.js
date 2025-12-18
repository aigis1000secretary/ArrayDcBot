
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits, ChannelType, ButtonStyle } = require('discord.js');

const [EMOJI_CHECK_MARK, EMOJI_ENVELOPE_WITH_ARROW] = ['✔️', '📩']

module.exports = {
    name: 'verifyThread',
    description: "verify thread",

    async execute(message, pluginConfig, command, args, lines) {
        // get config
        const { channel, member } = message;

        // check cmd
        if (command != 'verify') { return false; }


        // check user
        if (!['353625493876113440', '453038786633400340'].includes(message.author?.id)) { channel.send({ content: '[錯誤] 使用者錯誤!' }).catch(() => { }); return false; }

        const [VERIFT_ROLE_ID, VERIFT_CHANNEL_ID, ADMIN_ROLE_ID] = args;
        if (!VERIFT_ROLE_ID || !VERIFT_CHANNEL_ID || !ADMIN_ROLE_ID) { return false; }

        // check channel
        if (channel.id != VERIFT_CHANNEL_ID) { channel.send({ content: '[錯誤] 頻道錯!' }).catch(() => { }); return false; }

        // check permissions
        let permissions = channel.permissionsFor(message.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.CreatePrivateThreads)) { channel.send({ content: 'Missing Permissions: CREATE_PRIVATE_THREADS' }); return false; }
        // if (!permissions.has(PermissionFlagsBits.CreatePublicThreads)) { channel.send({ content: 'Missing Permissions: CREATE_PUBLIC_THREADS' }); return false; }
        if (!permissions.has(PermissionFlagsBits.SendMessagesInThreads)) { channel.send({ content: 'Missing Permissions: SEND_MESSAGES_IN_THREADS' }); return false; }
        if (!permissions.has(PermissionFlagsBits.ManageRoles)) { channel.send({ content: 'Missing Permissions: MANAGE_ROLES' }); return false; }

        // check admin or not
        const isAdmin = member.roles.cache.get(ADMIN_ROLE_ID);
        if (!isAdmin) {
            channel.send({ content: '[錯誤] 權限錯誤 #02!' }).catch(() => { });
            return false;
        }

        const description = [`驗證人員: <@&${ADMIN_ROLE_ID}>`, `驗證身分組: <@&${VERIFT_ROLE_ID}>`].join('\n');
        const embed = new EmbedBuilder()
            // .setColor('#010d85')
            .setDescription(description)

        const actionRow =
            new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                    .setLabel('開始驗證')
                    .setCustomId('start authorize')
                )
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                    .setLabel('🔧停用')
                    .setCustomId('switch')
                )

        // add user
        await channel.send({ embeds: [embed], components: [actionRow] });
        return false;

    },

    async interactionCreate(interaction, pluginConfig) {
        if (!interaction.isButton()) { return false; }
        if (!['start authorize', 'authorize', 'cancel', 'switch'].includes(interaction.customId)) { return false; }

        // get button parameter
        const { message, member } = interaction;
        const { guild, channel, embeds, components, content, author, client } = message;
        if (author.id != client.user.id) { return false; }

        const embedDescription = (Array.isArray(embeds) && !!embeds[0] && !!embeds[0].description)
            ? embeds[0].description : '';


        // in VERIFT_CHANNEL_ID
        if (interaction.customId == 'start authorize') {

            // get verify var
            const [, adminRoleID, roleID] = embedDescription.match(/\<@&(\d+)\>[\s\S]*\<@&(\d+)\>/i) || [, null, null];
            if (!adminRoleID || !roleID) { return false; }

            // creat thread
            const thread = await channel.threads.create({
                name: `${EMOJI_ENVELOPE_WITH_ARROW}驗證 [${member.user.tag}]`,
                autoArchiveDuration: 1440,
                type: ChannelType.PrivateThread,
                // type: ChannelType.PublicThread,
                reason: 'Needed a separate thread for verify',
            }).catch(error => {
                channel.send({ content: `\`\`\`${error.toString()}\`\`\`` });
                e => console.log(`[VeriftT]`, e.message);
            });

            if (!thread) { return false; }
            console.log(`討論串建立完成: ${thread.name}`);

            const description = [`User ID: <@${member.user.id}>`, `Role ID: <@&${roleID}>`].join('\n');
            const embed = new EmbedBuilder()
                // .setColor('#010d85')
                .setDescription(description)

            const actionRow =
                new ActionRowBuilder()
                    .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                        .setLabel('認證')
                        .setCustomId('authorize')
                    )
                    .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                        .setLabel('撤銷')
                        .setCustomId('cancel')
                    )

            const replyMsg = {
                content: [
                    `${member.toString()}您好`,
                    `這個討論串只有您與 <@&${adminRoleID}> 看的見`,
                    `請將您要驗證的內容、訊息鏈結、截圖都貼在這個地方，會由管理員進行處理。`
                ].join('\n'),
                embeds: [embed], components: [actionRow]
            };

            // add user
            thread.members.add(member.id);
            thread.send(replyMsg);

            // mute reply
            // interaction.reply({ content: ' ' }).catch(() => { });
            interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(e => console.log(`[VeriftT]`, e.message));
            return true;
        }

        else if (interaction.customId == 'switch') {

            // get verify var
            const [, adminRoleID, roleID] = embedDescription.match(/\<@&(\d+)\>[\s\S]*\<@&(\d+)\>/i) || [, null, null];
            if (!adminRoleID || !roleID) { return false; }
            // check admin or not
            const isAdmin = member.roles.cache.get(adminRoleID);
            if (!isAdmin) { return false; }

            // check buttons
            if (!Array.isArray(components) || !components[0]) { return false; }
            let actionRow = components[0];
            let buttons = actionRow.components;
            if (!Array.isArray(buttons) || !buttons[0]) { return false; }

            // get button state
            if (buttons[0].customId != 'start authorize') { return false; }
            let active = buttons[0].disabled;

            // new actions
            actionRow = new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setStyle(active ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(!active)
                    .setLabel(active ? '開始驗證' : '停止驗證中')
                    .setCustomId('start authorize')
                )
                .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary)
                    .setLabel(active ? '🔧停用' : '🔧啟用')
                    .setCustomId('switch')
                )
            await message.edit({ embeds, components: [actionRow] });

            // mute reply
            // interaction.reply({ content: ' ' }).catch(() => { });
            interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(e => console.log(`[VeriftT]`, e.message));
            return true;
        }

        else if (['authorize', 'cancel'].includes(interaction.customId)) {
            // in Thread
            // check admin or not
            const [, adminRoleID] = content.match(/\<@&(\d+)\>/i) || [, null];
            if (!adminRoleID) { channel.send({ content: '[錯誤] 權限錯誤 #01!' }).catch(() => { }); return false; }
            const isAdmin = member.roles.cache.get(adminRoleID);
            if (!isAdmin) { return false; }

            // get target user data
            const [, targetID, roleID] = embedDescription.match(/\<@(\d+)\>[\s\S]*\<@&(\d+)\>/i) || [, null, null];
            if (!targetID || !roleID) {
                channel.send({ content: '[錯誤] 不明的對象 #02!' }).catch(() => { }); return false;
            }
            // get target user object
            const user = await guild.members.fetch(targetID);
            const role = await guild.roles.fetch(roleID);
            if (!user || !role) {
                channel.send({ content: '[錯誤] 不明的對象 #03!' }).catch(() => { }); return false;
            }

            // work
            let channelName = channel.name.replace(/[✔️📩]+/, '');
            switch (interaction.customId) {
                case "authorize": {
                    user.roles.add(role).catch(e => console.log(`[VeriftT]`, e.message));
                    channelName = `${EMOJI_CHECK_MARK}${channelName}`;
                    if (channel.name != channelName) { channel.setName(channelName); }
                } break;
                case "cancel": {
                    user.roles.remove(role).catch(e => console.log(`[VeriftT]`, e.message));
                    channelName = `${EMOJI_ENVELOPE_WITH_ARROW}${channelName}`;
                    if (channel.name != channelName) { channel.setName(channelName); }
                } break;
            }

            let description = [
                `動作: ${interaction.customId == 'authorize' ? `驗證` : '撤銷'}`,
                `驗證人員: <@${member.id}>`,
                `驗證日期: <t:${parseInt(Date.now() / 1000)}>`
            ].join('\n');

            channel.send({ embeds: [new EmbedBuilder().setDescription(description)] }).catch(() => { });

            // mute reply
            // interaction.reply({ content: ' ' }).catch(() => { });
            interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(e => console.log(`[VeriftT]`, e.message));

            if (interaction.customId == 'authorize') {
                setTimeout(() => { channel.setArchived(true).catch(() => { }); }, 20000);
            }

            return false;
        }
    },
}