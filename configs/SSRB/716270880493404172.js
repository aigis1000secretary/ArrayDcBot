
module.exports = {      // SSRB的聚集地
    name: 'SSRB的聚集地',
    perfix: /^[\/\-!][\S]/,

    memberChecker3: [
        {
            holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,
            apiKey: [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7],   // SSRB
            expiresKey: 'ssrb_expires',

            memberRoleID: '847652060903243846',      // @&ししろん的食物
            logChannelID: '904053455377825833',      // #會限認證紀錄
            streamChannelID: '775100135515750470',      // #🌿獅白直播-streamchat
            memberChannelID: '790236195794976808',  // #獅白會限直播討論用
        },
    ],

    twitterListener3: [
        // #ssrb們站起來-art
        { RETWEET_CHANNEL_ID: '771351460097032193', RETWEET_DELCOUNT: 5, RETWEET_KEYWORD: ['#ししらーと'] },
        // #ししデコ
        { RETWEET_CHANNEL_ID: '998634189257719828', RETWEET_DELCOUNT: 5, RETWEET_KEYWORD: ['#ししデコ'] }
    ],



    reportThread: {
        REPORT_CHANNEL_ID: '850912764967780372',      // #舉報區
        ADMIN_ROLE_ID: '766316861427023882',      // @&cover
    },

    spamBotKicker: {
        LOG_CHANNEL_ID: '888239393716981830',      // #訊息刪除區-測試版
        PERMISSION_ROLE_ID: '777779439122776064',      // @&已驗證V粉
        BAN_CHANNEL_ID: '890150363305504798'      // #自爆按鈕
    },

    timeTag2: {
        TIME_TAG_CHANNEL_ID: '828259412257800222',      // #✏直播時間tag
        DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738', // #_time-tag-log
    },

    verifyThread: [
        // //                                                                                 ADMIN_ROLE_ID: '1049958100897124352',    // @人工認證通知

        // // #twinkle-4-you    
        // { VERIFT_CHANNEL_ID: '1119482232197873735', VERIFT_ROLE_ID: '1138651403561226301', ADMIN_ROLE_ID: '1049958100897124352', }, // @SPLASH PARTY~2day~
        // { VERIFT_CHANNEL_ID: '1119482232197873735', VERIFT_ROLE_ID: '1138662724272935133', ADMIN_ROLE_ID: '1049958100897124352', }, // @SPLASH PARTY~sunshine~
        // { VERIFT_CHANNEL_ID: '1119482232197873735', VERIFT_ROLE_ID: '1138662844989198418', ADMIN_ROLE_ID: '1049958100897124352', }, // @SPLASH PARTY~night~
        // { VERIFT_CHANNEL_ID: '1119482232197873735', VERIFT_ROLE_ID: '1119482471407423550', ADMIN_ROLE_ID: '1049958100897124352', }, // @Twinkle 4 You

        // // #holo官方頻道人工認證
        // { VERIFT_CHANNEL_ID: '1049971164962889778', VERIFT_ROLE_ID: '1049699122845847612', ADMIN_ROLE_ID: '1049958100897124352', }, // @官方頻道會員認證

        // // #4th-fes演唱會驗證辦法
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1070306016253726782', ADMIN_ROLE_ID: '1049958100897124352', }, // @4th演唱會Day1
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1070306395292971018', ADMIN_ROLE_ID: '1049958100897124352', }, // @4th演唱會holo27
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1070306512586686524', ADMIN_ROLE_ID: '1049958100897124352', }, // @4th演唱會Day2
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1070337499668430949', ADMIN_ROLE_ID: '1049958100897124352', }, // @4th演唱會Day1+2
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1077581715586949182', ADMIN_ROLE_ID: '1049958100897124352', }, // @クイズ王
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1077581946718273538', ADMIN_ROLE_ID: '1049958100897124352', }, // @大懺悔室
        // { VERIFT_CHANNEL_ID: '1070303214924210217', VERIFT_ROLE_ID: '1077582045536059444', ADMIN_ROLE_ID: '1049958100897124352', }, // @expo內派出所

    ],

    welcomeMsg: {
        WELCOME_CHANNEL_ID: '781156278252208169',      // #菜兵著陸
        WELCOME_MSG: '`歡迎${memberName}加入，請先去<#767724012934791168>看一下規則然後拿取你的身份組，<#781159554159345724>這邊有群組內的導覽。`'      // #伺服器規則中文版
    },



    messageLogger: { LOG_CHANNEL_ID: '888239393716981830' },      // #訊息刪除監視區
    memberCounter: { COUNTER_CHANNEL_ID: '860528144367878154', },      // #群組人數: 4,840
    reactionRole: { RULE_CHANNEL_ID: '775754378736173087' },      // #特殊身份組領取區-role
    reactionVote: { VOTE_CHANNELS: ['827129069178978324'] },      // #投票區



    fxtwitter: {},
    hook: {},
    streamStartTime: {},
    superChat: {},
    twitterAntiFilter: {},
}