
module.exports = {      // KTG
    name: 'KTG',
    perfix: /^([\/\-!~])\S+/,

    memberChecker5: [
        // /*
        {
            ytChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB

            streamChannelID: '1024627739023650827',      // #⚫_stream <#1024627739023650827>
            memberChannelID: '1024627744681771108',      // #⚫_member <#1024627744681771108>

            memberRoleID: '1009001004454383656',          // TEST1 <@&1009001004454383656>
            expiresKey: 'ssrb_expires',
            logChannelID: '1024627281592848434',         // #_log <#1024627281592848434>
            // memberLevelID: [
            //     '1150843451726905375', '1150843463420612800', '1150843475324047401', '1150843481095413760',
            //     '1150843488125059143', '1150843493254713404', '1150843498598236240', '1150843504738713762'
            // ],
        },//*/
        /*
        {
            ytChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,

            streamChannelID: '1236925125434146816',      // #⚫_stream2 <#1236925125434146816>
            memberChannelID: '1236925146674106441',      // #⚫_member2 <#1236925146674106441>

            memberRoleID: '1110090223821520906',          // TEST2 <@&1110090223821520906>
            expiresKey: 'kzmi_expires',
            logChannelID: '1024627281592848434',         // #_log <#1024627281592848434>
        },//*/
        /*
        {
            ytChannelID: 'UCWQtYtq9EOB4-I5P-3fh8lA',   // otonose,

            streamChannelID: '1024627739023650827',      // #⚫_stream <#1024627739023650827>
            memberChannelID: '1024627744681771108',      // #⚫_member <#1024627744681771108>

            memberRoleID: '1179351663925022850',          // TEST3 <@&1179351663925022850>
            expiresKey: 'otos_expires',
            logChannelID: '1024627281592848434',         // #_log <#1024627281592848434>
        },//*/
    ],

    // manual bulk download img
    // twitterListener3: [
    //     // #dl
    //     {
    //         RETWEET_CHANNEL_ID: '1169461312657567765', RETWEET_KEYWORD: [    // #dlimg <#1169461312657567765>
    //             '(from:AtedayoAigis) until:2021-03-18 filter:links'
    //         ],
    //     },
    // ],



    reportThread: {
        REPORT_CHANNEL_ID: '1024627536862400582',      // #_report <#1024627536862400582>
        ADMIN_ROLE_ID: '881775866835763240',      // ==BOT== <@&881775866835763240>
    },

    // /*
    spamBotKicker: {
        LOG_CHANNEL_ID: '1024627281592848434',      // #_log <#1024627281592848434>
        PERMISSION_ROLE_ID: '1009001004454383656',      // TEST1 <@&1009001004454383656>
        // PERMISSION_ROLE_ID: null,
        BAN_CHANNEL_ID: '1024627481111691275'      // #_ban <#1024627481111691275>
    },//*/



    messageLogger: { LOG_CHANNEL_ID: '1024627281592848434' },      // #_log <#1024627281592848434>
    memberCounter: { COUNTER_CHANNEL_ID: '1024628239865491486' },      // #群組人數-15 <#1024628239865491486>

    // uptimer: {},
    delall: {},
    dlimg: {},
    dlsitebot: {},
    ip: {},
    reboot: {},
    rssbot: [],
    streamStartTime: {},
}