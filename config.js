
const fs = require('fs');

// online bot cfg
module.exports = {
    DISCORD: {
        BOT: [{
            botName: 'SSRB',
            botID: '713624995372466179',
            DISCORD_TOKEN: process.env.DISCORD_713624995372466179_BOTTOKEN,
            CLIENT_SECRET: process.env.DISCORD_713624995372466179_SECRET,
            RESONANCE: 'ぼた',
            PLUGINS: ['timeTag.js', 'memberChecker.js', 'streamStartTime.js',
                'spambotkicker.js', 'delmsgLogger.js', 'reportThread.js',
                'twitter.js', 'twitterListener.js',
                // 'reactionRole.js', 'reactionVote.js', 'reboot.js', 'botResonance.js',
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

                    delmsgLogger: {
                        LOG_CHANNEL_ID: '713623232070156309',
                    },

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

                    delmsgLogger: {
                        LOG_CHANNEL_ID: '888239393716981830',
                    },

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
                    // reactionVote: { VOTE_CHANNELS: ['827129069178978324'] },

                    timeTag: {
                        TIME_TAG_CHANNEL_ID: '828259412257800222',
                        DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
                    },

                    reportThread: {
                        REPORT_CHANNEL_ID: '850912764967780372',
                        ADMIN_ROLE_ID: '766316861427023882',
                    },
                },
            }
        }, {
            botName: 'POKOBE',
            botID: '928492714482343997',
            DISCORD_TOKEN: process.env.DISCORD_928492714482343997_BOTTOKEN,
            CLIENT_SECRET: process.env.DISCORD_928492714482343997_SECRET,
            RESONANCE: 'ジャキン',
            PLUGINS: ['timeTag.js', 'memberChecker.js', 'streamStartTime.js',
                'spambotkicker.js', // 'delmsgLogger.js',
                'twitter.js', // 'twitterListener.js',
                // 'reactionRole.js', 'reactionVote.js', 'reboot.js', 'botResonance.js',
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

                    twitterListener: [{
                        RETWEET_CHANNEL_ID: '928838586957197345',
                        RETWEET_KEYWORD: '(#いろはにも絵を)'
                    }],

                    // reactionRole: { RULE_CHANNEL_ID: '826994163907428382' },
                    // reactionVote: { VOTE_CHANNELS: ['861842027048861706'] },
                },

                '914037840034299954': {
                    NAME: 'いろは幕府',
                    perfix: /^[\/\-!][\S]/,
                    fixMessage(message) {
                        let args, command;
                        if (this.perfix.test(message)) {
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
                        apiKey: [process.env.YOUTUBE_APIKEY_8, process.env.YOUTUBE_APIKEY_9]
                    }],

                    spambotKicker: {
                        LOG_CHANNEL_ID: '917998055012302918',
                        PERMISSION_ROLE_ID: null,
                        BAN_CHANNEL: null
                    },

                    timeTag: {
                        TIME_TAG_CHANNEL_ID: '929329040479887450',
                        DEBUG_TAG_LOG_CHANNEL_ID: '851618481350770738',
                    },
                }
            }
        }, {
            botName: 'DLsite',
            botID: '920485085935984641',
            DISCORD_TOKEN: process.env.DISCORD_920485085935984641_BOTTOKEN,
            CLIENT_SECRET: null,
            RESONANCE: 'ぬる',
            PLUGINS: [
                'spambotkicker.js',
                'reportThread.js',
                'dlsitebot.js',
            ],
            CONFIG: {
                '713622845682614302': {
                    NAME: 'KTG',
                    perfix: /(^[\/\-!~])[\S]/,
                    fixMessage(message) {
                        let args, command;
                        if (this.perfix.test(message)) {
                            args = message.slice(1).split(/\s+/);
                            command = args.shift().toLowerCase();
                        }
                        return { args, command }
                    },

                    spambotKicker: {
                        LOG_CHANNEL_ID: '938143077166612512',
                        // PERMISSION_ROLE_ID: '827153475891626025',
                        PERMISSION_ROLE_ID: null,
                        BAN_CHANNEL: '938143126843973693'
                    },

                    // reportThread:{
                    //     REPORT_CHANNEL_ID: '938342278500593714',
                    //     ADMIN_ROLE_ID: '881775866835763240',
                    // },
                },

                '254526419953123330': {
                    NAME: 'K島同人音聲',
                    perfix: /^[!][\S]/,
                    fixMessage(message) {
                        let args, command;
                        if (this.perfix.test(message)) {
                            args = message.slice(1).split(/\s+/);
                            command = args.shift().toLowerCase();
                        }
                        return { args, command }
                    },

                    spambotKicker: {
                        LOG_CHANNEL_ID: '713623232070156309',
                        PERMISSION_ROLE_ID: null,
                        BAN_CHANNEL: null
                    },
                }
            }
        }],

        getBot(uID) {
            return this.BOT.find((bot) => { return bot.botID == uID; });
        },
    },

    DEBUG_CHANNEL_ID: '826992877925171250',

    TWITTER: {
        CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
        CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET,
        ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
        ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    },

    YOUTUBE: {
        APIKEY: [
            // process.env.YOUTUBE_APIKEY_1, process.env.YOUTUBE_APIKEY_2, process.env.YOUTUBE_APIKEY_3,
            // process.env.YOUTUBE_APIKEY_4, process.env.YOUTUBE_APIKEY_5, process.env.YOUTUBE_APIKEY_6, 
            process.env.YOUTUBE_APIKEY_A, process.env.YOUTUBE_APIKEY_B,
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
