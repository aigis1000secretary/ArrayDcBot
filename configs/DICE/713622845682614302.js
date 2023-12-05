
module.exports = {      // KTG
    name: 'KTG',
    perfix: /(^[\/\-!~])[\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB

            streamChannelID: '1024627739023650827',      // #_stream
            memberChannelID: '1024627744681771108',      // #_member

            expiresKey: 'ssrb_expires',
            logChannelID: '1024627281592848434',         // #⁠_bot-test
            memberRoleID: '1009001004454383656',          // @&TEST1
            memberLevelID: [
                `1150843451726905375`, `1150843463420612800`, `1150843475324047401`, `1150843481095413760`,
                `1150843488125059143`, `1150843493254713404`, `1150843498598236240`, `1150843504738713762`
            ],
        },
        {
            holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,

            streamChannelID: '1024627739023650827',      // #_stream
            memberChannelID: '1024627744681771108',      // #_member

            expiresKey: 'kzmi_expires',
            logChannelID: '1024627281592848434',         // #⁠_bot-test
            memberRoleID: '1110090223821520906',          // @&TEST2
        },
        {
            holoChannelID: 'UCWQtYtq9EOB4-I5P-3fh8lA',   // otonose,

            streamChannelID: '1024627739023650827',      // #_stream
            memberChannelID: '1024627744681771108',      // #_member

            expiresKey: 'otos_expires',
            logChannelID: '1024627281592848434',         // #⁠_bot-test
            memberRoleID: '1179351663925022850',          // @&TEST3
        },
    ],

    // manual bulk download img
    // twitterListener3: [
    //     // #dl
    //     {
    //         RETWEET_CHANNEL_ID: '1169461312657567765', RETWEET_KEYWORD: [
    //             '(from:AtedayoAigis) until:2021-03-18 filter:links'
    //         ],
    //     },
    // ],



    reportThread: {
        REPORT_CHANNEL_ID: '1024627536862400582',      // #_report
        ADMIN_ROLE_ID: '881775866835763240',      // @&==BOT==
    },

    // /*
    spamBotKicker: {
        LOG_CHANNEL_ID: '1024627281592848434',      // #_log
        PERMISSION_ROLE_ID: '1009001004454383656',      // @&TEST
        // PERMISSION_ROLE_ID: null,
        BAN_CHANNEL_ID: '1024627481111691275'      // #_ban
    },//*/



    messageLogger: { LOG_CHANNEL_ID: '1024627281592848434' },      // #_bot-test
    memberCounter: { COUNTER_CHANNEL_ID: '1024628239865491486' },      // #群組人數: 4,840
    reactionRole: { RULE_CHANNEL_ID: '1024628143232925706' },      // #_role

    delall: {},
    dlimg: {},
    dlsitebot: {},
    ping: {},
    reboot: {},
    rssbot: [],
    streamStartTime: {},
    // uptimer: {},
}