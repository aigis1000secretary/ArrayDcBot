const { YOUTUBE_APIKEY } = require('../config.js');
const [EMOJI_SLEEPINGFACE, EMOJI_CINEMA] = ['😴', '🎦']
const EMOJI_DIGIT = (num) => {
    if (EMOJI_DIGIT < 10) {
        return ['0️⃣', '1️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][num];
    } else { return ''; }
};

let client = null;

const ApplicationCommandOptionType = {
    SUB_COMMAND: 1, SUB_COMMAND_GROUP: 2,
    STRING: 3, INTEGER: 4, BOOLEAN: 5,
    USER: 6, CHANNEL: 7, ROLE: 8, MENTIONABLE: 9
}

const dataArray = {
    "[0] ときのそら": { channelID: "UCp6993wxpyDPHUpavwDFqgg" },
    "[0] ロボ子さん": { channelID: "UCDqI2jOz0weumE8s7paEk6g" },
    "[0] さくらみこ": { channelID: "UC-hM6YJuNYVAmUWxeIr9FeA" },
    "[0] 星街すいせい": { channelID: "UC5CwaMl1eIgY8h02uZw7u8A" },

    "[I] AZKi": { channelID: "UC0TXe_LYZ4scaW2XMyi5_kw" },

    "[1] 夜空メル": { channelID: "UCD8HOxPs4Xvsm8H0ZxXGiBw" },
    "[1] アキ・ローゼンタール": { channelID: "UCFTLzh12_nrtzqBPsTCqenA" },
    "[1] 赤井はあと": { channelID: "UC1CfXB_kRs3C-zaeTG3oGyg" },
    "[1] 白上フブキ": { channelID: "UCdn5BQ06XqgXoAxIhbqw5Rg" },
    "[1] 夏色まつり": { channelID: "UCQ0UDLQCjY0rmuxCDE38FGg" },

    "[2] 湊あくあ": { channelID: "UC1opHUrw8rvnsadT-iGp7Cg" },
    "[2] 紫咲シオン": { channelID: "UCXTpFs_3PqI41qX2d9tL2Rw" },
    "[2] 百鬼あやめ": { channelID: "UC7fk0CB07ly8oSl0aqKkqFg" },
    "[2] 癒月ちょこ": { channelID: "UC1suqwovbL1kzsoaZgFZLKg" },
    "[2] 大空スバル": { channelID: "UCvzGlP9oQwU--Y0r9id_jnA" },

    "[G] 大神ミオ": { channelID: "UCp-5t9SrOQwXMU7iIjQfARg" },
    "[G] 猫又おかゆ": { channelID: "UCvaTdHTWBGv3MKj3KVqJVCw" },
    "[G] 戌神ころね": { channelID: "UChAnqc_AY5_I3Px5dig3X1Q" },

    "[3] 兎田ぺこら": { channelID: "UC1DCedRgGHBdm81E1llLhOQ" },
    "[3] 潤羽るしあ": { channelID: "UCl_gCybOJRIgOXw6Qb4qJzQ" },
    "[3] 不知火フレア": { channelID: "UCvInZx9h3jC2JzsIzoOebWg" },
    "[3] 白銀ノエル": { channelID: "UCdyqAaZDKHXg4Ahi7VENThQ" },
    "[3] 宝鐘マリン": { channelID: "UCCzUftO8KOVkV4wQG1vkUvg" },

    "[4] 天音かなた": { channelID: "UCZlDXzGoo7d44bwdNObFacg" },
    "[4] 桐生ココ［卒業］": { channelID: "UCS9uQI-jC3DE0L4IpXyvr6w" },
    "[4] 角巻わため": { channelID: "UCqm3BQLlJfvkTsX_hvm0UmA" },
    "[4] 常闇トワ": { channelID: "UC1uv2Oq6kNxgATlCiez59hw" },
    "[4] 姫森ルーナ": { channelID: "UCa9Y57gfeY0Zro_noHRVrnw" },

    "[5] 雪花ラミィ": { channelID: "UCFKOVgVbGmX65RxO3EtH3iw" },
    "[5] 桃鈴ねね": { channelID: "UCAWSyEs_Io8MtpY3m-zqILA" },
    "[5] 獅白ぼたん": { channelID: "UCUKD-uaobj9jiqB-VXt71mA" },
    "[5] 魔乃アロエ［卒業］": { channelID: "UCgZuwn-O7Szh9cAgHqJ6vjw" },
    "[5] 尾丸ポルカ": { channelID: "UCK9V2B22uJYu3N7eR_BT9QA" },

    "[ID1] アユンダ・リス": { channelID: "UCOyYb1c43VlX9rc_lT6NKQw" },
    "[ID1] ムーナ・ホシノヴァ": { channelID: "UCP0BspO_AMEe3aQqqpo89Dg" },
    "[ID1] アイラニ・イオフィフティーン": { channelID: "UCAoy6rzhSf4ydcYjJw3WoVg" },

    "[ID2] クレイジー・オリー": { channelID: "UCYz_5n-uDuChHtLo7My1HnQ" },
    "[ID2] アーニャ・メルフィッサ": { channelID: "UC727SQYUvx5pDDGQpTICNWg" },
    "[ID2] パヴォリア・レイネ": { channelID: "UChgTyjG-pdNvxxhdsXfHQ5Q" },

    "[EN1] 森美声": { channelID: "UCL_qhgtOy0dy1Agp8vkySQg" },
    "[EN1] 小鳥遊キアラ": { channelID: "UCHsx4Hqa-1ORjQTh9TYDhww" },
    "[EN1] 一伊那尓栖": { channelID: "UCMwGHR0BTZuLsmjY_NT5Pwg" },
    "[EN1] がうる・ぐら": { channelID: "UCoSrY_IQQVpmIRZ9Xf-y93g" },
    "[EN1] ワトソン・アメリア": { channelID: "UCyl1z3jo3XHR1riLFKG5UAg" },

    "[EN2] 九十九佐命": { channelID: "UCsUj0dszADCGbF3gNrQEuSQ" },
    "[EN2] セレス・ファウナ": { channelID: "UCO_aKKYxn4tvrqPjcTzZ6EQ" },
    "[EN2] オーロ・クロニー": { channelID: "UCmbs8T6MWqUHP1tIQvSgKrg" },
    "[EN2] 七詩ムメイ": { channelID: "UC3n5uGu18FoCy23ggWWp8tA" },
    "[EN2] ハコス・ベールズ": { channelID: "UCgmPnx-EEeOrZSg5Tiw7ZRQ" },

    "[HOPE] アイリス": { channelID: "UC8rcEBzJSleTkf_-agPM20g" }
}

// youtube api
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);

const getVideoSearch = async (cID) => {
    let date = new Date(Date.now() - 1000 * 60 * 60 * 24);  // last day
    date = new Date(date.setHours(3, 0, 0, 0));             // last day 03:00
    let url = 'https://www.googleapis.com/youtube/v3/search';
    let params = {
        part: 'snippet',
        channelId: cID,
        order: 'date', publishedAfter: `${date.toISOString()}`,
        maxResults: 5, type: "video",
        key: YOUTUBE_APIKEY
    }

    try {
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) { throw data.error; }
        if (data.items.length == 0) { throw 'videos not found.'; }

        return data.items;
    } catch (e) {
        console.log(e);
        return [];
    }
}
const getVideoStatus = async (vID) => {
    try {
        let url = 'https://www.googleapis.com/youtube/v3/videos';
        let params = {
            part: 'id,snippet,liveStreamingDetails',
            id: vID,
            key: YOUTUBE_APIKEY
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) { throw data.error; }
        if (data.pageInfo.totalResults == 0) { throw 'video not found.'; }

        return data.items[0];
    } catch (error) {
        console.log(error.errors || error);
        return null;
    }
}

module.exports = {
    name: 'holo channel link',
    description: "holo channel link",
    setup(_client) {
        client = _client;

        /* // Slash Commands 
        // Register some Command
        const dcRegisterCommand = (cmd, description, options) => {
            // console.log(cmd, description);
            let data = { name: cmd, description, options };

            // // debug mode
            // client.api.applications(client.user.id).guilds(GUILD_ID).commands.post({ data });

            // global mode
            client.api.applications(client.user.id).commands.post({ data }).then(console.log);
        }

        let choices1 = [], choices2 = [], choices3 = [];
        for (let str of [
            "[0] ときのそら", "[0] ロボ子さん", "[0] さくらみこ", "[0] 星街すいせい",
            "[I] AZKi",
            "[1] 夜空メル", "[1] アキ・ローゼンタール", "[1] 赤井はあと", "[1] 白上フブキ", "[1] 夏色まつり",
            "[2] 湊あくあ", "[2] 紫咲シオン", "[2] 百鬼あやめ", "[2] 癒月ちょこ", "[2] 大空スバル",
            "[G] 大神ミオ", "[G] 猫又おかゆ", "[G] 戌神ころね",
            "[3] 兎田ぺこら", "[3] 潤羽るしあ", "[3] 不知火フレア", "[3] 白銀ノエル", "[3] 宝鐘マリン"
        ]) { choices1.push({ name: str, value: str }); }
        for (let str of [
            "[4] 天音かなた", "[4] 桐生ココ［卒業］", "[4] 角巻わため", "[4] 常闇トワ", "[4] 姫森ルーナ",
            "[5] 雪花ラミィ", "[5] 桃鈴ねね", "[5] 獅白ぼたん", "[5] 魔乃アロエ［卒業］", "[5] 尾丸ポルカ"
        ]) { choices2.push({ name: str, value: str }); }
        for (let str of [
            "[ID1] アユンダ・リス", "[ID1] ムーナ・ホシノヴァ", "[ID1] アイラニ・イオフィフティーン",
            "[ID2] クレイジー・オリー", "[ID2] アーニャ・メルフィッサ", "[ID2] パヴォリア・レイネ",
            "[EN1] 森美声", "[EN1] 小鳥遊キアラ", "[EN1] 一伊那尓栖", "[EN1] がうる・ぐら", "[EN1] ワトソン・アメリア",
            "[HOPE] アイリス",
            "[EN2] 九十九佐命", "[EN2] セレス・ファウナ", "[EN2] オーロ・クロニー", "[EN2] 七詩ムメイ", "[EN2] ハコス・ベールズ"
        ]) { choices3.push({ name: str, value: str }); }

        dcRegisterCommand("holo", "頻道連結", [{
            name: "0-3", description: "0~3期生",
            type: ApplicationCommandOptionType.STRING, required: "False",
            choices: choices1
        }, {
            name: "4-5", description: "4~5期生",
            type: ApplicationCommandOptionType.STRING, required: "False",
            choices: choices2
        }, {
            name: "other", description: "海外組",
            type: ApplicationCommandOptionType.STRING, required: "False",
            choices: choices3
        }]);//*/

        {
            // Receiving an Interaction
            const response = (interaction, { content, embeds }) => {
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: { type: 4, data: { content, embeds } }
                })
            }

            // EventEmitter
            client.ws.on('INTERACTION_CREATE', async (interaction) => {
                const command = interaction.data.name.toLowerCase();
                // console.log(command)
                if (command != 'holo') { return; }

                let args = [];
                if (interaction.data.options) { for (let option of interaction.data.options) { args.push(option.value); } }
                // console.log(interaction)
                // console.log(args)

                // let embeds = [];
                let content = '';
                // get reply data
                for (let cmd of args) {
                    let cID = dataArray[cmd].channelID;
                    // content += `\nhttps://www.youtube.com/channel/${cID}`

                    let streams = [];
                    for (let _video of await getVideoSearch(cID)) {

                        // get REALLY video data
                        let vID = _video.id.videoId;
                        let video = await getVideoStatus(vID);

                        // check result status AGAIN
                        let status = video.snippet.liveBroadcastContent;
                        if (!['upcoming', 'live'].includes(status)) { continue; }

                        streams.push(video)
                        content += `\nhttp://youtu.be/${vID}`;
                    }

                    content = ((streams.length == 0) ?
                        `\n${cmd}${EMOJI_SLEEPINGFACE}` :
                        `\n${cmd}${EMOJI_CINEMA}${EMOJI_DIGIT(streams.length)}`
                    ) + content;

                }
                content = content.trim();
                content = (content == '') ? '👍' : content;
                response(interaction, { content });
            });
        }
    }
}