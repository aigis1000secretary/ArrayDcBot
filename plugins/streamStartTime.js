const { YOUTUBE } = require('../config.js');
const { MessageEmbed } = require('discord.js');

const CLOCK_A = ['<:clocka_0:895230067104440350>', '<:clocka_1:895230174382129162>', '<:clocka_2:895230190169509919>'];
const CLOCK_B = ['<:clockb_0:895230403164655627>', '<:clockb_1:895230447334866944>', '<:clockb_2:895230469992505355>', '<:clockb_3:895230483783368705>', '<:clockb_4:895230502397677628>', '<:clockb_5:895230515752357888>', '<:clockb_6:895230534169530390>', '<:clockb_7:895230548958654474>', '<:clockb_8:895230563835863072>', '<:clockb_9:895230578725638154>'];
const CLOCK_C = ['<:clockc_0:895230214026723358>', '<:clockc_1:895230244976488459>', '<:clockc_2:895230274487603220>', '<:clockc_3:895230287817084949>', '<:clockc_4:895230308239175701>', '<:clockc_5:895230324139761674>'];
const CLOCK_D = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const CLOCK_Colon = '🔹';
const EMOJI_RECYCLE = '♻️';
const regUrl = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?/;

// youtube api
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);
const getVideoStatus = async (vID) => {
    let key = YOUTUBE.getRandomAPIKey();
    try {
        const url = 'https://www.googleapis.com/youtube/v3/videos';
        const params = {
            part: 'id,snippet,liveStreamingDetails',
            id: vID,
            key
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (!data) return null;
        if (data.error) { throw data.error; }
        if (data.pageInfo.totalResults == 0) { throw 'video not found.'; }

        return data.items[0];
    } catch (error) {
        // quotaExceeded
        if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
            console.log(`ERR! quotaExceeded key: <${key}>`);
            let keyValid = YOUTUBE.keyQuotaExceeded(key);
            // retry
            if (keyValid) { return await getVideoStatus(vID); }
        }

        else {
            console.log(error);
        }
        return null;
    }
}

const getStreamStatus = async (vID) => {
    let data = await getVideoStatus(vID);
    if (!data) { return false; }

    let status = data.snippet.liveBroadcastContent;
    if (status != "upcoming") { return false; }

    let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
    return `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = {
    name: 'Stream Start Time',
    description: "rection stream start time",
    async execute(message) {
        const { content } = message;
        if (!regUrl.test(content)) { return; }

        // get vID
        const [, , , , , vID] = content.match(regUrl);
        let time = await getStreamStatus(vID);
        // console.log(time)

        if (time) {
            await message.react(CLOCK_A[parseInt(time[0])]).catch(() => { });
            await message.react(CLOCK_B[parseInt(time[1])]).catch(() => { });
            await message.react(CLOCK_Colon).catch(() => { });
            await message.react(CLOCK_C[parseInt(time[2])]).catch(() => { });
            await message.react(CLOCK_D[parseInt(time[3])]).catch(() => { });
        }
    },
    setup(client) {
        client.on('messageReactionAdd', async (reaction, user) => {
            if (reaction.emoji.name != CLOCK_Colon) { return false; }
            if (user.bot) { return false; }
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });

            const { message: rawMessage } = reaction;
            const { content, channel } = rawMessage;
            if (!regUrl.test(content)) { return; }

            // get vID
            const [, , , , , vID] = content.match(regUrl);
            let data = await getVideoStatus(vID);

            // get image
            let thumbnails = '';
            thumbnails = data.snippet.thumbnails.default.url ? data.snippet.thumbnails.default.url : thumbnails;
            thumbnails = data.snippet.thumbnails.medium.url ? data.snippet.thumbnails.medium.url : thumbnails;
            thumbnails = data.snippet.thumbnails.high.url ? data.snippet.thumbnails.high.url : thumbnails;

            // set embed
            let embed = new MessageEmbed()
                .setAuthor({
                    name: `${user.username} ${user.toString()}`,
                    iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
                })
                .setColor('#FF0000')
                .setTitle(data.snippet.channelTitle)
                // .setURL(`https://www.youtube.com/channel/${data.snippet.channelId}`)
                .setDescription(`**[${data.snippet.title}](http://youtu.be/${vID})**`)
            if (thumbnails != '') { embed.setImage(thumbnails); }

            // reply new embed
            let message = await channel.send({ embeds: [embed] });

            let status = data.snippet.liveBroadcastContent;
            if (status == "upcoming") {
                let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
                let time = `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;

                await message.react(CLOCK_A[parseInt(time[0])]).catch(() => { });
                await message.react(CLOCK_B[parseInt(time[1])]).catch(() => { });
                await message.react(CLOCK_Colon).catch(() => { });
                await message.react(CLOCK_C[parseInt(time[2])]).catch(() => { });
                await message.react(CLOCK_D[parseInt(time[3])]).catch(() => { });
            }
            await message.react(EMOJI_RECYCLE).catch(() => { });
        });


        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });
            if (reaction.partial) await reaction.fetch().catch(() => { });

            // skip other emoji
            if (reaction.emoji.toString() != EMOJI_RECYCLE) { return; }
            // skip bot reaction
            if (user.bot) { return; }

            // get msg data
            const { message } = reaction;
            // not send by bot
            if (message.author.id != client.user.id) { return; }
            // // skip not-deletable
            // if (!message.deletable) { return; }

            // check origin author
            if (message.embeds.length <= 0 ||                                           // no embeds
                !message.embeds[0].author ||                                            // no author
                !message.embeds[0].author.name ||                                       // no author name
                !message.embeds[0].author.name.includes(`${user.toString()}`)) { return; }    // user is not author

            setTimeout(() => message.delete().catch(() => { }), 250);

        });
    }
}