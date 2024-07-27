
module.exports = {      // 一条株式會社
    name: '一条株式會社',
    perfix: /^[\/\-!][\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UCtyWhCj3AqKh2dXctLkDtng',   // ririka,

            streamChannelID: '1266613788573175869',      // #⚫社長開會中 <#1266613788573175869>
            memberChannelID: '1266640894430285914',      // #社長的秘密會議 <#1266640894430285914>

            expiresKey: 'rrka_expires',
            logChannelID: '1266707330372735033',      // #會員驗證紀錄 <#1266707330372735033>
            memberRoleID: '1266660671941120062',      // 正社員 <@&1266660671941120062>
        },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '1266710458979848344',      // #bot-log <#1266710458979848344>
        PERMISSION_ROLE_ID: '1266639722202140684',    // 秘書見習生 <@&1266639722202140684>
        BAN_CHANNEL_ID: null
    },



    messageLogger: { LOG_CHANNEL_ID: '1266710458979848344' },      // #bot-log <#1266710458979848344>



    streamStartTime: {},
    twitterAntiFilter: {},
}