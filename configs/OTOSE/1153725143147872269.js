
module.exports = {      // 奏的樂音工坊
    name: '奏的樂音工坊',
    perfix: /^[\/\-!][\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UCWQtYtq9EOB4-I5P-3fh8lA',   // otonose,

            streamChannelID: '1153725144309702767',      // #⁠奏醬華麗出演中！
            memberChannelID: '1153725144309702771',      // #⁠會限交流

            expiresKey: 'otos_expires',
            logChannelID: '1153725144309702770',      // #⁠會限認證紀錄
            memberRoleID: '1179703410182856826',      // @&會限身分組(自動)
        },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '1153725144494243966',      // #機器人後台
        PERMISSION_ROLE_ID: '1153725143147872270',
        BAN_CHANNEL_ID: null
    },



    streamStartTime: {},
    twitterAntiFilter: {},
}