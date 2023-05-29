
// online bot cfg
module.exports = {
    botName: 'DICE',
    botID: '427025310291197954',
    discordToken: process.env.DISCORD_427025310291197954_BOTTOKEN,
    clientSecret: process.env.null,
    resonance: 'ダイ',
    debugPlugins: [
        // `ping`,
        // // 'uptimer',
        // 'rssbot', 'dlsitebot',
        // 'memberCounter',
        // // 'spambotKicker',
        // 'streamStartTime',
        // 'reactionRole',
        // 'superChat',
        // 'memberChecker3',
        'reboot',
    ],

    youtube: {
        apiKey: [
            // process.env.YOUTUBE_APIKEY_1, process.env.YOUTUBE_APIKEY_2, process.env.YOUTUBE_APIKEY_3,
            // process.env.YOUTUBE_APIKEY_4, process.env.YOUTUBE_APIKEY_5, process.env.YOUTUBE_APIKEY_6, 
            process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B,
        ],
    }
}
