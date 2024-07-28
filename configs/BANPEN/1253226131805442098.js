
module.exports = {      // 體育館裏の真っす組
    name: '體育館裏の真っす組',
    perfix: /^[\/\-!][\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UC1iA6_NT4mtAcIII6ygrvCw',   // todoroki,

            streamChannelID: '1253245713048014880',      // #⚫番長直播中 <#1253245713048014880>
            memberChannelID: '1253264373980463125',      // #⚫番長會限中 <#1253264373980463125>

            expiresKey: 'banp_expires',
            logChannelID: '1253682052998369422',      // #會員驗證紀錄 <#1253682052998369422>
            memberRoleID: '1253520063277957120',      // ぶんぶん部社員 <@&1253520063277957120>
        },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '1253620343936122982',      // #訊息更動-刪除監視區 <#1253620343936122982>
        PERMISSION_ROLE_ID: '1253239141299388427',    // 真っす組 <@&1253239141299388427>
        BAN_CHANNEL_ID: null
    },

    reportThread: {
        REPORT_CHANNEL_ID: '1253554528683425802',      // #匿名檢舉 <#1253554528683425802>
        ADMIN_ROLE_ID: '1253247811298791434',      // 風紀委員 <@&1253247811298791434>
    },



    messageLogger: { LOG_CHANNEL_ID: '1253620343936122982' },      // #訊息更動-刪除監視區 <#1253620343936122982>



    streamStartTime: {},
    twitterAntiFilter: {},
}