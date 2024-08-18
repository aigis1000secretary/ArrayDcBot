
// online bot cfg
module.exports = {
    botName: 'RIRIKA',
    botID: '1266703631697182801',
    discordToken: process.env.DISCORD_1266703631697182801_BOTTOKEN,
    clientSecret: process.env.DISCORD_1266703631697182801_SECRET,
    resonance: 'こんりり',
    plugins: (process.env.HOST_TYPE == 'debug') ? [
    ] : [
        // 'delall',
        // 'fxtwitter',
        // 'hook',
        // 'memberChecker4',
        // 'memberCounter',
        'messageLogger',
        // 'permissionSwitch',
        // 'ping',
        // 'reactionRole',
        // 'reactionVote',
        // 'reboot',
        // 'reportThread',
        // 'rssbot',
        'spamBotKicker',
        'streamStartTime',
        // 'superChat',
        // 'timeTag2',
        'twitterAntiFilter',
        // 'twitterListener3',
        // 'uptimer',
        // 'verifyThread',
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
