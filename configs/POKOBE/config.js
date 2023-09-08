
// online bot cfg
module.exports = {
    botName: 'POKOBE',
    botID: '928492714482343997',
    discordToken: process.env.DISCORD_928492714482343997_BOTTOKEN,
    clientSecret: process.env.DISCORD_928492714482343997_SECRET,
    resonance: 'ジャキン',
    plugins: (process.env.HOST_TYPE == 'debug') ? [
        // 'memberChecker4',
    ] : [
        // 'delall',
        'fxtwitter',
        // 'hook',
        'memberChecker4',
        // 'memberCounter',
        // 'messageLogger',
        // `ping`,
        // 'reactionRole',
        // 'reactionVote',
        // 'reboot',
        // 'reportThread',
        // 'rssbot',
        'spamBotKicker',
        'streamStartTime',
        // 'superChat',
        'twitterAntiFilter',
        // 'twitterListener3',
        // 'uptimer',
        // 'verifyThread',
        // 'welcomeMsg',
    ],

    youtube: {
        apiKey: [
            // process.env.YOUTUBE_APIKEY_1, process.env.YOUTUBE_APIKEY_2, process.env.YOUTUBE_APIKEY_3,
            // process.env.YOUTUBE_APIKEY_4, process.env.YOUTUBE_APIKEY_5, process.env.YOUTUBE_APIKEY_6, 
            process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B,
        ],
    }
}
