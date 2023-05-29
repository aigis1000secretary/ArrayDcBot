
module.exports = {      // いろは幕府
    name: 'いろは幕府',
    perfix: /^[\/\-!][\S]/,

    memberChecker3: [
        {
            holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,
            apiKey: [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9],    // KZMI
            expiresKey: 'kzmi_expires',

            memberRoleID: '929327680216780841',      // @&御前志士
            logChannelID: '929328558684405790',      // #自動認證紀錄
            streamChannelID: '915171808402083910',      // #直播配信討論區
            memberChannelID: '915171920129957898',      // #會限配信討論區
        },
    ],



    spambotKicker: {
        LOG_CHANNEL_ID: '917998055012302918',      // #機器人紀錄
        PERMISSION_ROLE_ID: null,
        BAN_CHANNEL_ID: null
    },



    fxtwitter: {},
    streamStartTime: {},
    twitterAntiFilter: {},
}