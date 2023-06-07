
module.exports = {      // KTG
    name: 'KTG',
    perfix: /(^[\/\-!~])[\S]/,

    twitterListener2: [
        // #_aigis_retweet
        { RETWEET_CHANNEL_ID: '977860525830586379', RETWEET_KEYWORD: '#アイギスお絵かき', },
        // { RETWEET_CHANNEL_ID: '977860525830586379', RETWEET_KEYWORD: '#アイギス10周年アートコン', },
        // #sao
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#ししらーと', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#ししデコ', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#いろはにも絵を', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#ほしまちぎゃらりー', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#towart', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#百鬼絵巻', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#祭絵', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#かな絵', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#ルーナート', },
        { RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: '#いぬいらすと', },
        // #sao2
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#レトロノーブル', },
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#猫神奉納品', },
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#KANGDANIELxSPAO', },
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#見てよねぇ七瀬', },
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#ヌォンタート', },
        { RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: '#Yuuriart', },
    ],

    rssbot: [
        // #hentai-voice-音声
        { RSS_CHANNEL_ID: `979765968727310336`, RSS_FEEDURL: `https://hentai-share.com/category/hentai-voice-%e9%9f%b3%e5%a3%b0/feed/` },
        { RSS_CHANNEL_ID: '979765968727310336', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-voice/feed/` },
        // #hentai-game
        { RSS_CHANNEL_ID: '979815303749967932', RSS_FEEDURL: `https://hentai-share.com/category/h-game/feed/` },
        { RSS_CHANNEL_ID: '979815303749967932', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-game/feed/` },
        // #hentai-anime
        { RSS_CHANNEL_ID: '979808194710880266', RSS_FEEDURL: `https://hentai-share.com/category/h-anime/feed/` },
        { RSS_CHANNEL_ID: '979808194710880266', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-animation/feed/` },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '713623232070156309',      // #_log
        PERMISSION_ROLE_ID: '1009001004454383656',      // @&TEST
        BAN_CHANNEL_ID: '928570341448626176'      // #_ban
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