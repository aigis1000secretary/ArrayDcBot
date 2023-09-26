
module.exports = {      // KTG
    name: 'KTG',
    perfix: /(^[\/\-!~])[\S]/,

    memberChecker4: [
        {
            holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB

            streamChannelID: '1024627739023650827',      // #⚫_stream
            memberChannelID: '1024627744681771108',      // #⚫_member

            expiresKey: 'ssrb_expires',
            logChannelID: '1024627281592848434',         // #⁠_bot-test
            memberRoleID: '1009001004454383656',          // @&TEST1
        },
        {
            holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,

            streamChannelID: '1110077306053070920',      // #直播配信討論區
            memberChannelID: '1110077379994472540',      // #會限配信討論區

            expiresKey: 'kzmi_expires',
            logChannelID: '1024627281592848434',         // #⁠_bot-test
            memberRoleID: '1110090223821520906',          // @&TEST2
        },
        // {
        //     holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB
        //     holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama
        //     holoChannelID: 'UCc88OV45ICgHbn3ZqLLb52w',   // Fuma
        //     holoChannelID: 'UCmbs8T6MWqUHP1tIQvSgKrg',   // Kronii
        //     holoChannelID: 'UC-hM6YJuNYVAmUWxeIr9FeA',   // mikp
        //     holoChannelID: 'UCFTLzh12_nrtzqBPsTCqenA',   // aki
        //     holoChannelID: 'UCs9_O1tRPMQTHQ-N_L6FU2g',   // rui
        //     holoChannelID: 'UC1uv2Oq6kNxgATlCiez59hw',   // towa
        //     holoChannelID: 'UCFKOVgVbGmX65RxO3EtH3iw',   // lamy
        //     holoChannelID: 'UCZlDXzGoo7d44bwdNObFacg',   // kanata
        // }
    ],
    reportThread: {
        REPORT_CHANNEL_ID: '1024627536862400582',      // #_report
        ADMIN_ROLE_ID: '881775866835763240',      // @&==BOT==
    },

    // /*
    spamBotKicker: {
        LOG_CHANNEL_ID: '1024627281592848434',      // #_log
        PERMISSION_ROLE_ID: '1009001004454383656',      // @&TEST
        // PERMISSION_ROLE_ID: null,
        BAN_CHANNEL_ID: '1024627481111691275'      // #_ban
    },//*/



    messageLogger: { LOG_CHANNEL_ID: '1024627281592848434' },      // #_bot-test
    memberCounter: { COUNTER_CHANNEL_ID: '1024628239865491486' },      // #群組人數: 4,840
    reactionRole: { RULE_CHANNEL_ID: '1024628143232925706' },      // #_role

    delall: {},
    dlsitebot: {},
    ping: {},
    reboot: {},
    streamStartTime: {},
    // uptimer: {},
}