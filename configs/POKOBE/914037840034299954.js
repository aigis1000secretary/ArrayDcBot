
module.exports = {      // いろは幕府
    name: 'いろは幕府',
    perfix: /^[\/\-!][\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,

            streamChannelID: '915171808402083910',      // #⚫隊長出動中！ <#915171808402083910>
            memberChannelID: '915171920129957898',      // #⚫隊士參上！ <#915171920129957898>

            expiresKey: 'kzmi_expires',
            logChannelID: '929328558684405790',      // #自動認證紀錄 <#929328558684405790>
            memberRoleID: '929327680216780841',      // 🍃かざま隊🍃 <@&929327680216780841>
            memberLevelID: [
                `1189838844758065212`, `1189839030720921631`, `1189839339945996288`,
                `1189839524868673607`, `1064894524930932807`, `1189555251762704425`
            ],
        },
    ],



    spamBotKicker: {
        LOG_CHANNEL_ID: '917998055012302918',      // #機器人紀錄 <#917998055012302918>
        PERMISSION_ROLE_ID: null,
        BAN_CHANNEL_ID: null
    },



    fxtwitter: {},
    streamStartTime: {},
    twitterAntiFilter: {},
}