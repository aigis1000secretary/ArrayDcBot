
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const YoutubeAPI = require('../modules/YoutubeAPI.js');

const CLOCK_A = ['<:clocka_0:895230067104440350>', '<:clocka_1:895230174382129162>', '<:clocka_2:895230190169509919>'];
const CLOCK_B = ['<:clockb_0:895230403164655627>', '<:clockb_1:895230447334866944>', '<:clockb_2:895230469992505355>', '<:clockb_3:895230483783368705>', '<:clockb_4:895230502397677628>', '<:clockb_5:895230515752357888>', '<:clockb_6:895230534169530390>', '<:clockb_7:895230548958654474>', '<:clockb_8:895230563835863072>', '<:clockb_9:895230578725638154>'];
const CLOCK_C = ['<:clockc_0:895230214026723358>', '<:clockc_1:895230244976488459>', '<:clockc_2:895230274487603220>', '<:clockc_3:895230287817084949>', '<:clockc_4:895230308239175701>', '<:clockc_5:895230324139761674>'];
const CLOCK_D = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const EMOJI_SMALL_BLUE_DIAMOND = '🔹';
const EMOJI_SMALL_ORANGE_DIAMOND = '🔸';
const EMOJI_RECYCLE = '♻️';
const regUrl = /(?:https?:\/\/)(?:(?:www\.|m\.)?youtube\.com|youtu\.be|holodex\.net)(?:\/(?:watch|v|embed|shorts|live|attribution_link(?:[\?&][^\/&]+)*))?\/(?:(?:(?:watch\?(?:[^\/&]*&)*)?v=)|(?:multiview\/\w{4}))?([\w-]{11})/;

module.exports = {
    name: 'Stream Start Time',
    description: "reaction stream start time",


    async execute(message, pluginConfig, command, args, lines) {
        const { content } = message;
        if (!regUrl.test(content)) { return; }

        // get vID
        const [, vID] = content.match(regUrl);
        if (['post', 'channel'].includes(vID)) { return; }
        let time = await YoutubeAPI.getStreamStatus(vID);
        // console.log(vID, time)

        if (time) {
            await message.react(CLOCK_A[parseInt(time[0])]).catch(e => console.log(`[SST]`, e.message));
            await message.react(CLOCK_B[parseInt(time[1])]).catch(e => console.log(`[SST]`, e.message));
            await message.react(EMOJI_SMALL_BLUE_DIAMOND).catch(e => console.log(`[SST]`, e.message));
            await message.react(CLOCK_C[parseInt(time[2])]).catch(e => console.log(`[SST]`, e.message));
            await message.react(CLOCK_D[parseInt(time[3])]).catch(e => console.log(`[SST]`, e.message));
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        // skip bot reaction
        if (user.bot) { return; }

        // skip other emoji
        if (reaction.emoji.toString() != EMOJI_SMALL_ORANGE_DIAMOND &&
            reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

        // get msg data
        const { message, client } = reaction;

        // EMOJI_RECYCLE
        if (reaction.emoji.name == EMOJI_RECYCLE) {
            // ♻️

            // check deletable
            if (message.author.id != client.user.id || !message.deletable) { return; }

            // check message target
            let [embed] = message.embeds || [];
            if (!embed) { return; }

            if (!regUrl.test(embed.description) ||
                !embed.description.startsWith('**')) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
            return;
        }

        // EMOJI_SMALL_ORANGE_DIAMOND
        if (reaction.emoji.name == EMOJI_SMALL_ORANGE_DIAMOND) {

            const { message: rawMessage } = reaction;
            const { guild, channel, content } = rawMessage;

            // check message target
            if (!regUrl.test(content)) { return; }

            // check user who use reaction have permissions for send message
            const guildAuthor = guild.members.cache.get(user.id);
            if (!channel.permissionsFor(guildAuthor).has(PermissionFlagsBits.SendMessages)) { return; };

            // get vID
            const [, vID] = content.match(regUrl);
            if (['post', 'channel'].includes(vID)) { return; }
            let data = await YoutubeAPI.getVideoStatus({ vID });
            if (!data) { return false; }

            // get image
            let thumbnails = (
                // data.snippet.thumbnails.maxres ||
                data.snippet.thumbnails.standard ||
                data.snippet.thumbnails.high ||
                data.snippet.thumbnails.medium ||
                data.snippet.thumbnails.default ||
                { url }).url.replace('_live.', '.');

            // set embed
            let embed = new EmbedBuilder()
                .setAuthor({
                    name: `${user.username} ${user.toString()}`,
                    iconURL: user.displayAvatarURL({ format: 'png', size: 256 })
                })
                .setColor('#FF0000')
                .setTitle(data.snippet.channelTitle)
                // .setURL(`https://www.youtube.com/channel/${data.snippet.channelId}`)
                .setDescription(`**[${data.snippet.title}](http://youtu.be/${vID})**`)
            if (thumbnails != '') { embed.setImage(thumbnails); }

            // reply new embed
            let message = await channel.send({ embeds: [embed] }).catch(() => { });

            let status = data.snippet.liveBroadcastContent;
            if (status == "upcoming") {
                let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
                let time = `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;

                await message.react(CLOCK_A[parseInt(time[0])]).catch(() => { });
                await message.react(CLOCK_B[parseInt(time[1])]).catch(() => { });
                await message.react(EMOJI_SMALL_BLUE_DIAMOND).catch(() => { });
                await message.react(CLOCK_C[parseInt(time[2])]).catch(() => { });
                await message.react(CLOCK_D[parseInt(time[3])]).catch(() => { });
            }
            await message.react(EMOJI_RECYCLE).catch(() => { });
        }
    },
}