
module.exports = {      // 體育館裏の真っす組
    name: '體育館裏の真っす組',
    perfix: /^[\/\-!][\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UC1iA6_NT4mtAcIII6ygrvCw',   // todoroki,

            streamChannelID: '1253245713048014880',      // #⚫番長直播中
            memberChannelID: '1253264373980463125',      // #⚫番長會限中

            expiresKey: 'banp_expires',
            logChannelID: '1253682052998369422',      // #⁠會限認證紀錄
            memberRoleID: '1253520063277957120',      // @&會限身分組(自動)
        },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '1253620343936122982',      // #機器人後台
        PERMISSION_ROLE_ID: '1253239141299388427',
        BAN_CHANNEL_ID: null
    },



    messageLogger: { LOG_CHANNEL_ID: '1253620343936122982' },      // #訊息刪除監視區



    streamStartTime: {},
    twitterAntiFilter: {},
}