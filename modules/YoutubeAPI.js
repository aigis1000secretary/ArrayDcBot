
const request = require('../modules/undici-request.js');

const { Innertube } = require('youtubei.js');

/** @type {import('youtubei.js').Innertube} */
let innertube = null;
Innertube.create().then(res => innertube = res);


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// case 'UCUKD-uaobj9jiqB-VXt71mA': apiKey = [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7]; break; // SSRB
// case 'UC_vMYWcDjmfdpH6r4TTn1MQ': apiKey = [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9]; break; // KZMI
// case 'UC1iA6_NT4mtAcIII6ygrvCw': apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break; // todoroki
// default: apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break;                         // TEST

/** @type {Array<YoutubeApiKey>} */
const apiKeys = [];
class YoutubeApiKey {
    key;
    quotaExceeded = false;
    constructor(key) { this.key = key; }
    exceeded() { this.quotaExceeded = true; }
}
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_0)); apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_7));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_8)); apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_9));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_A)); apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_B));



// youtube api
class YoutubeAPI {

    async waitInnertubeInit() {
        for (let i = 0; i < 300; ++i) {
            if (innertube != null) { break; }
            await sleep(1000); continue;
        }
    }

    // youtube api
    async getStreamStatus(vID) {
        const data = await this.getVideoStatusByInTube({ vID });
        if (!data) { return false; }

        const status = data.snippet.liveBroadcastContent;
        if (status != "upcoming") { return false; }

        const startTime = data.liveStreamingDetails?.scheduledStartTime || 0;
        if (!startTime || Date.parse(startTime) > Date.now() + (1000 * 60 * 60 * 10)) { return false; }
        // skip  video when upcoming after 10hr

        // const startTimeStr = new Date(Date.parse(startTime));
        // return `${startTimeStr.getHours().toString().padStart(2, '0')}${startTimeStr.getMinutes().toString().padStart(2, '0')}`;

        const startTimeStr = new Date(Date.parse(startTime)).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })
        return startTimeStr.replace(/^[\d\/]{10},\s/, '').replace(/:\d+$/, '').replace(':', '');
    }


    async getVideoStatus({ vID, apiKey = 4 }) {
        const result = apiKeys[apiKey].quotaExceeded ? null :
            await this.getVideoStatusByApi({ vID, apiKey });

        return result || await this.getVideoStatusByInTube({ vID });
    }
    async getVideoStatusByApi({ vID, apiKey = 4 }) {
        if (apiKeys[apiKey].quotaExceeded) { return null; }

        const url = 'https://www.googleapis.com/youtube/v3/videos';
        const qs = {
            part: 'id,snippet,liveStreamingDetails',
            id: vID,
            key: apiKeys[apiKey].key
        }

        const res = await request.get({ url, qs });

        if (res.statusCode == 403 && res.body?.error?.message.includes('quota')) {
            apiKeys[apiKey].exceeded();
            console.log(`[YoutubeAPI] getVideoStatusByApi error. quotaExceeded`);
            return null;

        } else if (res.statusCode == 404) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error. Error 404 (Not Found)!!`);
            return null;

        } else if (res.statusCode != 200) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error.`, res.body?.error?.message || res);
            return null;

        }

        // get response data
        const data = res.body;
        if (data.pageInfo.totalResults == 0) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error. video not found.`, vID);
            return null;
        }
        data.items[0].isMemberOnly = await this.getVideoIsMemberOnly({ vID });
        return data.items[0];
        // return {
        //     id: '3gH2la1zZ3A', kind: 'youtube#video', etag: 'ktzgCNL-70YVg2aP-FcihaZ_vKA',
        //     snippet: {
        //         publishedAt: '2022-08-17T00:46:24Z', channelId: 'UCc88OV45ICgHbn3ZqLLb52w',
        //         title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
        //         description: '#ドラゴンクエスト11s\n #ゲーム実況',
        //         thumbnails: { default: [Object], medium: [Object], high: [Object], standard: [Object], maxres: [Object] },
        //         channelTitle: 'Fuma Ch. 夜十神封魔 - UPROAR!! -',
        //         categoryId: '20',
        //         liveBroadcastContent: 'upcoming',
        //         localized: {
        //             title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
        //             description: '#ドラゴンクエスト11s\n #ゲーム実況'
        //         }
        //     },
        //     liveStreamingDetails: {
        //         scheduledStartTime: '2022-08-17T01:30:00Z',
        //         activeLiveChatId: 'Cg0KCzNnSDJsYTF6WjNBKicKGFVDYzg4T1Y0NUlDZ0hibjNacUxMYjUydxILM2dIMmxhMXpaM0E'
        //     }
        // }
    }
    async getVideoStatusByInTube({ vID }) {
        const videoInfos = await innertube.getInfo(vID).catch(e => console.log(`[YoutubeAPI] getVideoStatusByInTube error.`, vID, e.message) || null);
        if (!videoInfos) { return null; }

        const basicInfo = videoInfos.basic_info;

        try {
            const result = {
                id: basicInfo.id,
                snippet: {
                    publishedAt: new Date(basicInfo.start_timestamp).toISOString(),
                    channelId: basicInfo.channel_id, channelTitle: basicInfo.author,
                    title: basicInfo.title, description: basicInfo.short_description,
                    // thumbnails: {
                    //     maxres: basicInfo.thumbnail[0], high: basicInfo.thumbnail[1], standard: basicInfo.thumbnail[2],
                    //     medium: basicInfo.thumbnail[3], default: basicInfo.thumbnail[4],
                    // },
                    liveBroadcastContent: basicInfo.is_live ? "live" : (basicInfo.is_upcoming ? "upcoming" : "none")
                },
                liveStreamingDetails: {
                    scheduledStartTime: new Date(basicInfo.start_timestamp).toISOString(),
                    activeLiveChatId: null
                },
                isMemberOnly: await this.getVideoIsMemberOnly({ vID })
            };

            return result;
        } catch (e) {
            console.log(`[YoutubeAPI] getVideoStatusByInTube error.`, vID, e.message);
        }
        return null;
    }


    async getVideoSearchByApi({ channelId, eventType, order, publishedAfter, apiKey = 4 }) {
        if (apiKeys[apiKey].quotaExceeded) { return []; }

        const url = 'https://www.googleapis.com/youtube/v3/search';
        const qs = {
            part: 'id,snippet', channelId,
            eventType, order, publishedAfter,
            maxResults: 5, type: "video",
            key: apiKeys[apiKey].key
        }

        const res = await request.get({ url, qs }); // response

        if (res.statusCode == 403 && res.body?.error?.message.includes('quota')) {
            apiKeys[apiKey].exceeded();
            console.log(`[YoutubeAPI] getVideoSearchByApi error. quotaExceeded`);
            return [];

        } else if (res.statusCode == 404) {
            console.log(`[YoutubeAPI] getVideoSearchByApi error. Error 404 (Not Found)!!`);
            return [];

        } else if (res.statusCode != 200) {
            console.log(`[YoutubeAPI] getVideoSearchByApi error.`, res.body?.error?.message || res);
            return [];

        }

        // get response data
        const data = res.body;
        const result = [];
        for (const item of data.items) {
            const vID = item.id?.videoId || item.id;
            if (!vID) { continue; }

            item.isMemberOnly = await this.getVideoIsMemberOnly({ vID });
            result.push(item);
        }
        return result;
        // return [
        //     {
        //         kind: 'youtube#searchResult', etag: '07WUPWqVpujODorWqJyH8Zs29PI', id: { kind: 'youtube#video', videoId: '3gH2la1zZ3A' },
        //         snippet: {
        //             publishedAt: '2022-08-17T00:46:24Z', publishTime: '2022-08-17T00:46:24Z',
        //             channelId: 'UCc88OV45ICgHbn3ZqLLb52w', channelTitle: 'Fuma Ch. 夜十神封魔 - UPROAR!! -',
        //             title: '#8【ドラゴンクエストXI S】最後の旅・・・。【#夜十神封魔/#ホロスターズ/#アップロー】※ネタバレあり',
        //             description: 'ドラゴンクエスト11s 本動画のゲームプレイ映像は、株式会社スクウェア・エニックスの許諾を受けて使用しています。 この動画 ...',
        //             liveBroadcastContent: 'upcoming', thumbnails: [Object]
        //         }
        //         isMemberOnly: 0
        //     }
        // ]
    }
    async getVideoSearchByInTube({ channelId, eventType, isMemberOnly = false }) {
        const playlistID = isMemberOnly ? channelId.replace(/^UC/, `UUMO`) : channelId.replace(/^UC/, `UU`);
        const playlistInfos = (await innertube?.getPlaylist(playlistID)
            .catch(e => console.log(`[YoutubeAPI] getPlaylist Error.`, e.message))) || { video: [] };

        const results = [];

        for (const video of playlistInfos.videos) {
            const liveBroadcastContent = video.is_live ? "live" : (video.is_upcoming ? "upcoming" : "none");
            if (eventType != liveBroadcastContent) { continue; }

            const _video = await this.getVideoStatusByInTube({ vID: video.id });
            if (!_video) { continue; }

            _video.isMemberOnly = isMemberOnly;
            results.push(_video);

            // results.push({
            //     id: { videoId: video.id },
            //     snippet: {
            //         publishedAt: new Date(basic_info.start_timestamp).toISOString(),
            //         channelId: video.author.id, channelTitle: video.author.name,
            //         title: video.title.text,
            //         liveBroadcastContent
            //     },
            //     liveStreamingDetails: {
            //         scheduledStartTime: null,
            //         activeLiveChatId: null
            //     },
            //     isMemberOnly
            // });
            if (results.length >= 3) { break; }
        }

        return results;
    }


    async getVideoIsMemberOnly({ vID }) {
        // get isMemberOnly by  yt.lemnoslife.com
        // https://yt.lemnoslife.com/videos?part=isMemberOnly&id=U_7Pn04cip4
        const url = 'https://yt.lemnoslife.com/videos';
        const qs = {
            part: 'isMemberOnly',
            id: vID
        }

        const res = await request.get({ url, qs });

        if (res.statusCode != 200) { return null; }

        // return ((res?.body?.items || [])[0] || {}).isMemberOnly ? 1 : 0;
        return res?.body?.items?.[0]?.isMemberOnly ? 1 : 0;
    };


    async getFetchingLiveChatByInTube(videoId) {
        const videoInfos = await innertube.getInfo(videoId);

        try {
            const livechat = videoInfos.getLiveChat();

            livechat.on('error', (err) => {
                console.log(`[${videoId}] error at`, new Date(Date.now()).toISOString(), err.message);
            });

            return livechat;
        } catch (e) { }
        
        return null;
    }
}

module.exports = new YoutubeAPI();