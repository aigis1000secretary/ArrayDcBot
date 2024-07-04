
module.exports = {      // KTG
    name: 'KTG',
    perfix: /(^[\/\-!~])[\S]/,

    twitterListener3: [
        // #_aigis_retweet
        {
            RETWEET_CHANNEL_ID: '977860525830586379', RETWEET_KEYWORD: [    // #_aigis_retweet <#977860525830586379>
                '#アイギスお絵かき', '#アイギス10周年アートコン',
                'filter:links (from:Aigis1000)', '(from:aigis2014)',
                'filter:links (from:AtedayoAigis)', 'filter:links (from:Aigis_PhotoMemo)',
                'filter:links (from:akagi_huyu)', 'filter:links (from:inoshishi4)',
                'filter:links (from:koyaki93874607)', 'filter:links (from:nemui_)',
                'filter:links (from:sighaz)', 'filter:links (from:tami_na2)',
                'filter:links (from:yomerinne)', 'filter:links (from:yuasa_akira)',
                // 'filter:links (from:BadhabhCath)',
                // 'filter:links (from:Applesyrup14g)', // uID: 2545528232 ｱｲｷﾞｽ/邦ﾛｯｸ🤘⚠RT多め⚠ 🎨https://t.co/EKvrlujZVS ✏https://t.co/mfCSWb1Y7W 日常と雑多☞＠sakananoniboshi
            ],
        },
        // #sao
        {
            RETWEET_CHANNEL_ID: '1054284227375542333', RETWEET_KEYWORD: [    // #sao <#1054284227375542333>
                '(#ししらーと OR #ししデコ)', '#いろはにも絵を', '#ほしまちぎゃらりー',
                '#towart', '#百鬼絵巻', '#祭絵', '#絵フブキ', '#ルーナート',
                '(#サロメ百万展 OR #かな絵)', '(#いぬいらすと OR #フレン見て)',
                '(#詩子あーと OR #ジョー設展)', '(#絵こころ OR #泡色模様)', '(#べにっき OR #空澄絵)',
            ],
        },
        // #sao2
        {
            RETWEET_CHANNEL_ID: '1113369067177381918', RETWEET_KEYWORD: [    // #sao2 <#1113369067177381918>
                '(#レトロノーブル OR #猫神奉納品)', '(#見てよねぇ七瀬 OR #ヌォンタート)',
                '(#Yuuriart OR #jooin_art)', '#iwa_art',
            ],
        },
    ],

    rssbot: [
        // #hentai-voice-音声
        { RSS_CHANNEL_ID: '979765968727310336', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-voice/feed/` },    // #hentai-voice-音声 <#979765968727310336>
        // #hentai-game
        { RSS_CHANNEL_ID: '979815303749967932', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-game/feed/` },    // #hentai-game <#979815303749967932>
        // #hentai-anime
        { RSS_CHANNEL_ID: '979808194710880266', RSS_FEEDURL: `https://www.vivahentai4u.net/category/hentai-animation/feed/` },    // #hentai-anime <#979808194710880266>
        // #dlsite
        { RSS_CHANNEL_ID: '1156057315829624933', RSS_FEEDURL: `https://rsshub.app/dlsite/maniax/new` },    // #dlsite <#1156057315829624933>
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '713623232070156309',      // #_log <#713623232070156309>
        PERMISSION_ROLE_ID: '1009001004454383656',      // TEST1 <@&1009001004454383656>
        BAN_CHANNEL_ID: '928570341448626176'      // #_ban <#928570341448626176>
    },

    timeTag2: {
        TIME_TAG_CHANNEL_ID: '827069773039796245',      // #_time-tag <#827069773039796245>
        DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',      // #_time-tag-log <#851618481350770738>
    },


    eval: {},
    fxtwitter: {},
    delall: {},
    dlimg: {},
    dlsitebot: {},
    ip: {},
    memberChecker4: [],
    ping: {},
    reboot: {},
    streamStartTime: {},
    twitterAntiFilter: {},
}