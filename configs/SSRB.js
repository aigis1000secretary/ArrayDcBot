
module.exports = {
    botName: 'SSRB',
    botID: '713624995372466179',
    DISCORD_TOKEN: process.env.DISCORD_713624995372466179_BOTTOKEN,
    CLIENT_SECRET: process.env.DISCORD_713624995372466179_SECRET,
    RESONANCE: 'ぼた',
    PLUGINS: [
        'timeTag.js',
        'memberChecker.js',
        'streamStartTime.js',
        'spambotkicker.js',
        'delmsgLogger.js',
        'reportThread.js',
        'fxtwitter.js',
        'twitterListener.js',
        'memberCounter.js',
        // 'reactionRole.js',
        'reactionVote.js',
        // 'reboot.js', 
        // 'botResonance.js',
        'welcomeMsg.js',
    ],
    CONFIG: {
        '713622845682614302': {
            NAME: 'KTG',
            perfix: /(^[\/\-!~])[\S]/,
            fixMessage(message) {
                let args = null, command = null;
                if (this.perfix.test(message)) {
                    args = message.slice(1).split(/\s+/);
                    command = args.shift().toLowerCase();
                }
                return { args, command }
            },

            // delmsgLogger: { LOG_CHANNEL_ID: '713623232070156309', },

            // memberChecker: [{
            //     holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,
            //     expiresKey: 'ssrb_expires',
            //     memberRoleID: '927501058484371487',
            //     logChannelID: '713623232070156309',
            //     startTagChannelID: null,
            //     apiKey: [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7]
            // }, {
            //     holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,
            //     botID: '928492714482343997',
            //     expiresKey: 'kzmi_expires',
            //     memberRoleID: '928092487044710441',
            //     logChannelID: '713623232070156309',
            //     startTagChannelID: null,
            //     apiKey: [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9]
            // }],

            twitterListener: [{
                RETWEET_CHANNEL_ID: '928838586957197345',
                RETWEET_KEYWORD: '(#ししらーと)'
            }],

            // spambotKicker: {
            //     LOG_CHANNEL_ID: '713623232070156309',
            //     PERMISSION_ROLE_ID: '827153475891626025',
            //     BAN_CHANNEL: '928570341448626176'
            // },

            // reactionRole: { RULE_CHANNEL_ID: '826994163907428382' },
            // reactionVote: { VOTE_CHANNELS: ['861842027048861706'] },
        },

        '716270880493404172': {
            NAME: 'SSRB的聚集地',
            perfix: /^[\/\-!][\S]/,
            fixMessage(message) {
                let args, command;
                if (this.perfix.test(message)) {
                    args = message.slice(1).split(/\s+/);
                    command = args.shift().toLowerCase();
                }
                return { args, command }
            },

            delmsgLogger: { LOG_CHANNEL_ID: '888239393716981830', },

            memberChecker: [{
                holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,
                expiresKey: 'ssrb_expires',
                memberRoleID: '847652060903243846',
                logChannelID: '904053455377825833',
                startTagChannelID: '775100135515750470',
                apiKey: [process.env.YOUTUBE_APIKEY_0, process.env.YOUTUBE_APIKEY_7]
            }],

            twitterListener: [{
                RETWEET_CHANNEL_ID: '771351460097032193',
                RETWEET_KEYWORD: '(#ししらーと)'
            }],

            spambotKicker: {
                LOG_CHANNEL_ID: '888239393716981830',
                PERMISSION_ROLE_ID: '777779439122776064',
                BAN_CHANNEL: '890150363305504798'
            },

            // reactionRole: { RULE_CHANNEL_ID: '767724012934791168' },
            reactionVote: { VOTE_CHANNELS: ['827129069178978324'] },

            timeTag: {
                TIME_TAG_CHANNEL_ID: '828259412257800222',
                DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
            },

            reportThread: {
                REPORT_CHANNEL_ID: '850912764967780372',
                ADMIN_ROLE_ID: '766316861427023882',
            },

            memberCounter: { COUNTER_CHANNEL_ID: '860528144367878154', },

            welcomeMsg: {
                WELCOME_CHANNEL_ID: '781156278252208169',
                WELCOME_MSG: '`歡迎${memberName}加入，請先去<#767724012934791168>看一下規則然後拿取你的身份組，<#781159554159345724>這邊有群組內的導覽。`'
            }
        },
    }
}