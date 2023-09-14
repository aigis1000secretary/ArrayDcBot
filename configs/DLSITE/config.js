
// online bot cfg
module.exports = {
    botName: 'DLsite',
    botID: '920485085935984641',
    discordToken: process.env.DISCORD_920485085935984641_BOTTOKEN,
    clientSecret: null,
    resonance: 'ぬる',
    plugins: (process.env.HOST_TYPE == 'debug') ? [
        // 'delall',
        // 'twitterAntiFilter',
        'dlimg',
        'ip',
        'reboot',
        `twitterListener3`,
    ] : [
        'eval',
        'delall',
        'dlimg',
        'dlsitebot',
        'fxtwitter',
        // 'hook',
        'ip',
        // 'memberChecker4',
        // 'memberCounter',
        // 'messageLogger',
        // `ping`,
        // 'reactionRole',
        // 'reactionVote',
        'reboot',
        // 'reportThread',
        'rssbot',
        'spamBotKicker',
        'streamStartTime',
        // 'superChat',
        // 'timeTag2',
        'twitterAntiFilter',
        'twitterListener3',
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
