
module.exports = {
    botName: 'POKOBE',
    botID: '928492714482343997',
    DISCORD_TOKEN: process.env.DISCORD_928492714482343997_BOTTOKEN,
    CLIENT_SECRET: process.env.DISCORD_928492714482343997_SECRET,
    RESONANCE: 'ジャキン',
    PLUGINS: ['timeTag.js',
        'memberChecker.js',
        'streamStartTime.js',
        'spambotkicker.js',
        // 'delmsgLogger.js',
        // 'reportThread.js',
        'twitter.js',
        // 'twitterListener.js',
        // 'reactionRole.js',
        // 'reactionVote.js',
        // 'reboot.js',
        // 'botResonance.js',
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
}