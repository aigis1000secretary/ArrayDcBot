
module.exports = {
    botName: 'DLsite',
    botID: '920485085935984641',
    DISCORD_TOKEN: process.env.DISCORD_920485085935984641_BOTTOKEN,
    CLIENT_SECRET: null,
    RESONANCE: 'ぬる',
    PLUGINS: [
        'spambotkicker.js',
        // 'reportThread.js',
        'twitterListener.js',
        'dlsitebot.js',
        'reboot.js',
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
                RETWEET_CHANNEL_ID: '977860525830586379',
                RETWEET_KEYWORD: '(#アイギスお絵かき)'
            }],

            spambotKicker: {
                LOG_CHANNEL_ID: '938143077166612512',
                // PERMISSION_ROLE_ID: '827153475891626025',
                PERMISSION_ROLE_ID: null,
                BAN_CHANNEL: '938143126843973693'
            },

            // reportThread: {
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
}