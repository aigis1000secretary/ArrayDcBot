
// online bot cfg
module.exports = {
    botName: 'SSRB',
    botID: '713624995372466179',
    discordToken: process.env.DISCORD_713624995372466179_BOTTOKEN,
    clientSecret: process.env.DISCORD_713624995372466179_SECRET,
    resonance: 'ぼた',
    plugins: (process.env.HOST_TYPE == 'debug') ? [
        // 'twitterAntiFilter',        
        // 'memberChecker4',
        'twitterListener3',
    ] : [
        // 'delall',
        'delMsgByMenu',
        'fxtwitter',
        'hook',
        'memberChecker4',
        'memberCounter',
        'messageLogger',
        'permissionSwitch',
        // 'ping',
        'reactionRole',
        'reactionVote',
        // 'reboot',
        'reportThread',
        // 'rssbot',
        'search',
        'spamBotKicker',
        'streamStartTime',
        'superChat',
        // 'timeTag2',
        'twitterAntiFilter',
        'twitterListener3',
        // 'uptimer',
        'verifyThread',
        'welcomeMsg',
    ],

    youtube: {
        apiKey: [
            // process.env.YOUTUBE_APIKEY_1, process.env.YOUTUBE_APIKEY_2, process.env.YOUTUBE_APIKEY_3,
            // process.env.YOUTUBE_APIKEY_4, process.env.YOUTUBE_APIKEY_5, process.env.YOUTUBE_APIKEY_6, 
            process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B,
        ],
    }
}
