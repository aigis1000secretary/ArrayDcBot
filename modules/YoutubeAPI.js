
const request = require('../modules/undici-request.js');

const { Innertube } = require('youtubei.js');
/** @type {import('youtubei.js').Innertube} */
let innertube;
Innertube.create().then(res => innertube = res);




// case 'UCUKD-uaobj9jiqB-VXt71mA': apiKey = [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7]; break; // SSRB
// case 'UC_vMYWcDjmfdpH6r4TTn1MQ': apiKey = [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9]; break; // KZMI
// case 'UCWQtYtq9EOB4-I5P-3fh8lA': apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break; // OTOSE
// default: apiKey = [process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B]; break;                         // TEST

const apiKeys = [];
class YoutubeApiKey {
    key;
    quotaExceeded = false;
    constructor(key) { this.key = key; }
    exceeded() { this.quotaExceeded = true; }
}
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_0));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_7));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_8));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_9));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_A));
apiKeys.push(new YoutubeApiKey(process.env.YOUTUBE_APIKEY_B));

// youtube api
class YoutubeAPI {

    // youtube api
    async getStreamStatus(vID) {
        let data = await this.getVideoStatusByInTube({ vID });
        if (!data) { return false; }

        let status = data.snippet.liveBroadcastContent;
        if (status != "upcoming") { return false; }

        let startTime = new Date(Date.parse(data.liveStreamingDetails.scheduledStartTime));
        return `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}`;
    };






    async getVideoStatus(vID) {
        return await getVideoStatusByApi({ vID }) ||
            await getVideoStatusByInTube({ vID });

    };
    async getVideoStatusByApi({ vID, apiKey = 4 }) {
        if (apiKeys[apiKey].quotaExceeded) { return null; }

        const url = 'https://www.googleapis.com/youtube/v3/videos';
        const qs = {
            part: 'id,snippet,liveStreamingDetails',
            id: vID,
            key: apiKeys[apiKey].key
        }

        const res = await request.get({ url, qs });


        if (res.statusCode == 403 && res.error == 'quotaExceeded') {
            quotaExceeded[0] = true;
            console.log(`[YoutubeAPI] getVideoStatusByApi error. quotaExceeded`);
            return null;

        } else if (res.statusCode == 404) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error. Error 404 (Not Found)!!`);
            return null;

        } else if (res.statusCode != 200) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error.`, res.error?.message);
            return null;

        }

        // get response data
        const data = res.body;
        if (data.pageInfo.totalResults == 0) {
            console.log(`[YoutubeAPI] getVideoStatusByApi error. video not found.`, vID);
            return null;
        }
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
    };
    async getVideoStatusByInTube({ vID }) {
        const videoInfos = await innertube.getInfo(vID);
        const basic_info = videoInfos.basic_info;

        try {
            const result = {
                id: basic_info.id,
                snippet: {
                    publishedAt: new Date(basic_info.start_timestamp).toISOString(),
                    channelId: basic_info.channel_id, channelTitle: basic_info.author,
                    title: basic_info.title, description: basic_info.short_description,
                    thumbnails: {
                        maxres: basic_info.thumbnail?.[0], high: basic_info.thumbnail?.[1], standard: basic_info.thumbnail?.[2],
                        medium: basic_info.thumbnail?.[3], default: basic_info.thumbnail?.[4],
                    },
                    liveBroadcastContent: basic_info.is_live ? "live" : (basic_info.is_upcoming ? "upcoming" : "none")
                },
                liveStreamingDetails: {
                    scheduledStartTime: new Date(basic_info.start_timestamp).toISOString(),
                    activeLiveChatId: null
                }
            };

            return result;
        } catch (e) {
            console.log(`[YoutubeAPI] getVideoStatusByInTube error.`, vID, e.message);
        }
        return null;
    }







}

module.exports = new YoutubeAPI();