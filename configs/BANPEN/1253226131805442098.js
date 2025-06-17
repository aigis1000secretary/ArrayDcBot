
module.exports = {      // 體育館裏の真っす組
    name: '體育館裏の真っす組',
    perfix: /^([\/\-!])\S+/,

    memberChecker5: [
        {
            ytChannelID: 'UC1iA6_NT4mtAcIII6ygrvCw',   // todoroki,

            streamChannelID: '1253245713048014880',      // #⚫番長直播中 <#1253245713048014880>
            memberChannelID: '1253264373980463125',      // #⚫番長會限中 <#1253264373980463125>

            memberRoleID: '1253520063277957120',      // ぶんぶん部社員 <@&1253520063277957120>
            expiresKey: 'banp_expires',
            logChannelID: '1253682052998369422',      // #會員驗證紀錄 <#1253682052998369422>
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

    welcomeMsg: {
        WELCOME_CHANNEL_ID: '1253226132338380842',      // #體育館裏入口 <#1253226132338380842>
        WELCOME_MSG: '`歡迎${memberName}加入，請先去 https://discord.com/channels/0/1253235122518364160/1253369212102250577 看一下規則和群組內的導覽，然後拿取你的身份組。<#1253235302118461460>這邊有其他身分組。`'      // #伺服器規則中文版
    },



    messageLogger: { LOG_CHANNEL_ID: '1253620343936122982' },      // #訊息更動-刪除監視區 <#1253620343936122982>



    streamStartTime: {},
    twitterAntiFilter: {},
}