
const fs = require('fs');

// online bot cfg
module.exports = {
    DISCORD: {
        BOT: [
            require('./configs/SSRB.js'),
            require('./configs/POKOBE.js'),
            require('./configs/DLSITE.js'),
        ],

        getBot(uID) {
            return this.BOT.find((bot) => { return bot.botID == uID; });
        },
    },

    DEBUG_CHANNEL_ID: '826992877925171250',

    HEROKU_TOKEN: process.env.HEROKU_TOKEN,

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
