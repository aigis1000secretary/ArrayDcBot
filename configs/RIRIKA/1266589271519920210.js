
module.exports = {      // 一条株式會社
    name: '一条株式會社',
    perfix: /^[\/\-!][\S]/,

    /*
    memberChecker4: [
        {
            holoChannelID: 'UCtyWhCj3AqKh2dXctLkDtng',   // ririka,

            streamChannelID: '1266613788573175869',      // #⚫社長開會中 <#1266613788573175869>
            memberChannelID: '1266640894430285914',      // #社長的秘密會議 <#1266640894430285914>

            expiresKey: 'rrka_expires',
            logChannelID: '1266707330372735033',      // #會員驗證紀錄 <#1266707330372735033>
            memberRoleID: '1266660671941120062',      // 正式社員 <@&1266660671941120062>
        },
    ],//*/



    spamBotKicker: {
        LOG_CHANNEL_ID: '1266710458979848344',      // #bot-log <#1266710458979848344>
        PERMISSION_ROLE_ID: '1266639722202140684',    // 秘書見習生 <@&1266639722202140684>
        BAN_CHANNEL_ID: null
    },
    
    welcomeMsg: {
        WELCOME_CHANNEL_ID: '1266589272694329488',      // #新秘書見習生報到處 <#1266589272694329488>
        WELCOME_MSG: '`歡迎${memberName}加入，請先去 https://discord.com/channels/0/1266592205343035483/1266765645748506766 看一下規則和群組內的導覽，然後拿取你的身份組。<#1266592333294469211>這邊有其他身分組。`'      // #伺服器規則中文版
    },



    messageLogger: { LOG_CHANNEL_ID: '1266710458979848344' },      // #bot-log <#1266710458979848344>



    streamStartTime: {},
    twitterAntiFilter: {},
}