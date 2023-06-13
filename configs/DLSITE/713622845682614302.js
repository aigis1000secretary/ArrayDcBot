
module.exports = {      // KTG
    name: 'KTG',
    perfix: /(^[\/\-!~])[\S]/,

    twitterListener3: [
        // #_aigis_retweet
        {
            RETWEET_CHANNEL_ID: '977860525830586379', RETWEET_KEYWORD: [
                '#アイギスお絵かき', // '#アイギス10周年アートコン'
                '@Aigis1000', '@Aigis_PhotoMemo', '@Applesyrup14g', '@BadhabhCath',
                '@aigis2014', '@akagi_huyu', '@inoshishi4', '@koyaki93874607',
                '@nemui_', '@sakananoniboshi', '@sighaz', '@yomerinne',
                '@yuasa_akira',
            ],
        },
        // #sao
        {
            RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: [
                '#ししらーと', '#ししデコ', '#いろはにも絵を', '#ほしまちぎゃらりー',
                '#towart', '#百鬼絵巻', '#祭絵', '#かな絵', '#ルーナート', '#いぬいらすと',
                '#フレン見て', '#サロメ百万展', '#絵フブキ', '#詩子あーと', '#ジョー設展',
                '#絵こころ', '#泡色模様', '#べにっき', '#空澄絵',
            ],
        },
        // #sao2
        {
            RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: [
                '#レトロノーブル', '#猫神奉納品', '#KANGDANIELxSPAO', '#見てよねぇ七瀬',
                '#ヌォンタート', '#Yuuriart', '#jooin_art', '#iwa_art',
            ],
        },
    ],

    rssbot: [
        // #hentai-voice-音声
        // { RSS_CHANNEL_ID: `979765968727310336`, RSS_FEEDURL: `https://hentai-share.com/category/hentai-voice-%e9%9f%b3%e5%a3%b0/feed/` },
        { RSS_CHANNEL_ID: '979765968727310336', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-voice/feed/` },
        // #hentai-game
        // { RSS_CHANNEL_ID: '979815303749967932', RSS_FEEDURL: `https://hentai-share.com/category/h-game/feed/` },
        { RSS_CHANNEL_ID: '979815303749967932', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-game/feed/` },
        // #hentai-anime
        // { RSS_CHANNEL_ID: '979808194710880266', RSS_FEEDURL: `https://hentai-share.com/category/h-anime/feed/` },
        { RSS_CHANNEL_ID: '979808194710880266', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-animation/feed/` },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '713623232070156309',      // #_log
        PERMISSION_ROLE_ID: '1009001004454383656',      // @&TEST
        BAN_CHANNEL_ID: '928570341448626176'      // #_ban
    },

    timeTag2: {
        TIME_TAG_CHANNEL_ID: '827069773039796245',      // #直播時間軸tag
        DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',      // #_time-tag-log
    },


    eval: {},
    fxtwitter: {},
    delall: {},
    dlsitebot: {},
    ping: {},
    reboot: {},
    streamStartTime: {},
    twitterAntiFilter: {},
}