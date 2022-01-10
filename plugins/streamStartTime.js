const { YOUTUBE } = require('../config.js');

const CLOCK_A = ['<:clocka_0:895230067104440350>', '<:clocka_1:895230174382129162>', '<:clocka_2:895230190169509919>'];
const CLOCK_B = ['<:clockb_0:895230403164655627>', '<:clockb_1:895230447334866944>', '<:clockb_2:895230469992505355>', '<:clockb_3:895230483783368705>', '<:clockb_4:895230502397677628>', '<:clockb_5:895230515752357888>', '<:clockb_6:895230534169530390>', '<:clockb_7:895230548958654474>', '<:clockb_8:895230563835863072>', '<:clockb_9:895230578725638154>'];
const CLOCK_C = ['<:clockc_0:895230214026723358>', '<:clockc_1:895230244976488459>', '<:clockc_2:895230274487603220>', '<:clockc_3:895230287817084949>', '<:clockc_4:895230308239175701>', '<:clockc_5:895230324139761674>'];
const CLOCK_D = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const CLOCK_Colon = '🔹';
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
        const req = await get({ url, qs: params });
        // console.log(JSON.stringify(req, null, 2));

        if (!req.body) return null;

        let result = JSON.parse(req.body);
        if (result.pageInfo.totalResults == 0) return null;

        return result.items[0];
    } catch (e) {
        // quotaExceeded
        if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
            console.log(`ERR! quotaExceeded key: <${key}>`);
            let keyValid = YOUTUBE.keyQuotaExceeded(key);
            // retry
            if (keyValid) { return await getVideoStatus(vID); }
        }

        console.log(e);
        console.log(req.body);
        return null;
    }
}

const getStreamStatus = async (vID) => {
    let data = await getVideoStatus(vID);
    let status = data.snippet.liveBroadcastContent;
    if (status != "upcoming") { return false; }

    let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
    return `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = {
    name: 'Stream Start Time',
    description: "rection stream start time",
    async execute(message) {
        try {
            const { content } = message;
            if (!regUrl.test(content)) { return; }

            // get vID
            const [, , , , , vID] = content.match(regUrl);
            let time = await getStreamStatus(vID);
            // console.log(time)

            await message.react(CLOCK_A[parseInt(time[0])]);
            await message.react(CLOCK_B[parseInt(time[1])]);
            await message.react(CLOCK_Colon);
            await message.react(CLOCK_C[parseInt(time[2])]);
            await message.react(CLOCK_D[parseInt(time[3])]);
        } catch (e) { }
    }
}