
const fs = require('fs');

// online bot cfg
module.exports = {
    DISCORD: {
        BOT: [{
            BOT_NAME: 'SSRB',
            botID: '713624995372466179',
            DISCORD_TOKEN: process.env.DISCORD_713624995372466179_BOTTOKEN,
            CLIENT_SECRET: process.env.DISCORD_713624995372466179_SECRET,
            RESONANCE: 'ぼた',
            PLUGINS: ['timeTag.js', 'memberChecker.js',
                'spambotkicker.js', 'streamStartTime.js',
                'delmsgLogger.js', 'twitterListener.js', 'twitter.js',
                // 'reactionRole.js', 'reactionVote.js', 'reboot.js', 'botResonance.js',
            ]
        }, {
            BOT_NAME: 'POKOBE',
            botID: '928492714482343997',
            DISCORD_TOKEN: process.env.DISCORD_928492714482343997_BOTTOKEN,
            CLIENT_SECRET: process.env.DISCORD_928492714482343997_SECRET,
            RESONANCE: 'ジャキン',
            PLUGINS: ['timeTag.js', 'memberChecker.js',
                'spambotkicker.js', 'streamStartTime.js', 'twitter.js',
                // 'reactionRole.js', 'reactionVote.js', 'reboot.js', 'botResonance.js', 'delmsgLogger.js', 'twitterListener.js',
            ]
            // }, {
            //     BOT_NAME: 'DLsite',
            //     botID: '920485085935984641',
            //     DISCORD_TOKEN: process.env.DISCORD_920485085935984641_BOTTOKEN,
            //     CLIENT_SECRET: null,
            //     RESONANCE: 'ぬる',
            //     PLUGINS: ['dlsitebot.js']
        }],

        getBot(uID) {
            return this.BOT.find((bot) => { return bot.botID == uID; });
        },
    },

    DEBUG_CHANNEL_ID: '826992877925171250',

    CONFIG: {
        '713622845682614302': {
            NAME: 'KTG',
            PREFIX: /(^[\/\-!~])[\S]/,
            fixMessage(message) {
                let args, command;
                if (this.PREFIX.test(message)) {
                    args = message.slice(1).split(/\s+/);
                    command = args.shift().toLowerCase();
                }
                return { args, command }
            },

            delmsgLogger: {
                LOG_CHANNEL_ID: '713623232070156309',
            },

            // memberChecker: [{
            //     holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,
            //     botID: '713624995372466179',
            //     expiresKey: 'ssrb_expires',
            //     memberRoleID: '927501058484371487',
            //     logChannelID: '927500904410787871',
            // }, {
            //     holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,
            //     botID: '928492714482343997',
            //     expiresKey: 'kzmi_expires',
            //     memberRoleID: '928092487044710441',
            //     logChannelID: '927500904410787871',
            // }],

            twitterListener: [{
                RETWEET_CHANNEL_ID: '928838586957197345',
                RETWEET_KEYWORD: '(#ししらーと)'
            }, {
                RETWEET_CHANNEL_ID: '928838586957197345',
                RETWEET_KEYWORD: '(#いろはにも絵を)'
            }],

            spambotKicker: {
                LOG_CHANNEL_ID: '713623232070156309',
                PERMISSION_ROLE_ID: '827153475891626025',
                BAN_CHANNEL: '928570341448626176'
            },

            // reactionRole: { RULE_CHANNEL_ID: '826994163907428382' },
            // reactionVote: { VOTE_CHANNELS: ['861842027048861706'] },

            // timeTag: {
            //     botID: '928492714482343997',
            //     TIME_TAG_CHANNEL_ID: '827069773039796245',
            //     DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
            // },
        },

        '716270880493404172': {
            NAME: 'SSRB的聚集地',
            PREFIX: /^[\/\-!][\S]/,
            fixMessage(message) {
                let args, command;
                if (this.PREFIX.test(message)) {
                    args = message.slice(1).split(/\s+/);
                    command = args.shift().toLowerCase();
                }
                return { args, command }
            },

            delmsgLogger: {
                LOG_CHANNEL_ID: '888239393716981830',
            },

            memberChecker: [{
                holoChannelID: 'UCUKD-uaobj9jiqB-VXt71mA',   // SSRB,
                botID: '713624995372466179',
                expiresKey: 'ssrb_expires',
                memberRoleID: '847652060903243846',
                logChannelID: '904053455377825833',
                startTagChannelID: '775100135515750470',
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
            // reactionVote: { VOTE_CHANNELS: ['827129069178978324'] },

            timeTag: {
                botID: '713624995372466179',
                TIME_TAG_CHANNEL_ID: '828259412257800222',
                DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
            },
        },

        '914037840034299954': {
            NAME: 'いろは幕府',
            PREFIX: /^[\/\-!][\S]/,
            fixMessage(message) {
                let args, command;
                if (this.PREFIX.test(message)) {
                    args = message.slice(1).split(/\s+/);
                    command = args.shift().toLowerCase();
                }
                return { args, command }
            },

            memberChecker: [{
                holoChannelID: 'UC_vMYWcDjmfdpH6r4TTn1MQ',   // kazama,
                botID: '928492714482343997',
                expiresKey: 'kzmi_expires',
                memberRoleID: '929327680216780841',
                logChannelID: '929328558684405790',
            }],

            spambotKicker: {
                LOG_CHANNEL_ID: '917998055012302918',
                PERMISSION_ROLE_ID: null,
                BAN_CHANNEL: null
            },

            timeTag: {
                botID: '928492714482343997',
                TIME_TAG_CHANNEL_ID: '929329040479887450',
                DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
            },
        },
    },

    TWITTER: {
        CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
        CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET,
        ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
        ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    },

    YOUTUBE: {
        APIKEY: [
            process.env.YOUTUBE_APIKEY_0,
            // process.env.YOUTUBE_APIKEY_1, process.env.YOUTUBE_APIKEY_2, process.env.YOUTUBE_APIKEY_3,
            // process.env.YOUTUBE_APIKEY_4, process.env.YOUTUBE_APIKEY_5, process.env.YOUTUBE_APIKEY_6, 
            process.env.YOUTUBE_APIKEY_7, process.env.YOUTUBE_APIKEY_8,
            process.env.YOUTUBE_APIKEY_9, process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B,
        ],
        PICKKEY: [
        ],
        quotaExceeded: [
        ],

        keyQuotaExceeded(key) {
            let i = this.APIKEY.indexOf(key);
            this.quotaExceeded.push(this.APIKEY.splice(i, 1));
            return !!this.getRandomAPIKey();
        },

        getRandomAPIKey() {
            if (this.APIKEY.length > 0) {
                let index = parseInt(Math.random() * this.APIKEY.length);
                return this.APIKEY[index];
            }
            return null;
        },

        pickRandomAPIKey() {
            if (this.APIKEY.length > 0) {
                let i = parseInt(Math.random() * this.APIKEY.length);
                let key = this.APIKEY[i];
                this.PICKKEY.push(this.APIKEY.splice(i, 1));
                return key;
            }
            return null;
        }
    }
}
