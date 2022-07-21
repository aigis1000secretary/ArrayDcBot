
const { TWITTER } = require('../config.js');
const [EMOJI_RECYCLE] = ['♻️']

// const Discord = require('discord.js');
// const server = require('../server');
// const express = require('express');
// let client = null;
const request = require('request');

const util = require('util');
const requestGet = util.promisify(request.get);
const requestPost = util.promisify(request.post);

const oAuthConfig = {
    consumer_key: TWITTER.CONSUMER_KEY,
    consumer_secret: TWITTER.CONSUMER_SECRET,
    token: TWITTER.ACCESS_TOKEN,
    token_secret: TWITTER.ACCESS_TOKEN_SECRET
};

const getSearch = async (keyword, max_id) => {
    const endpointURL = 'https://api.twitter.com/1.1/search/tweets.json';
    const params = {
        q: keyword,
        result_type: 'recent',
        count: 100, // count <= 100
        include_entities: 'true',
        max_id
    };
    const req = await requestGet({ url: endpointURL, oauth: oAuthConfig, qs: params, json: true });

    if (req.body) {
        return req.body;
    } else {
        // throw new Error(`Cannot search tweet <${keyword}>`);
        console.log(`[twitterHook] Cannot search tweet <${keyword}>`);
        console.log(req.body.errors)
        return null;
    }
};
// search method
const searchNewTweet = async (keyword, rtChannel) => {
    // set timerange;
    let thisHour = new Date(Date.now());
    let lastHour = new Date(Date.now() - 3600000);
    thisHour.setMinutes(0, 0, 0);
    lastHour.setMinutes(0, 0, 0);

    // search tweet
    let results = [];
    let response = await getSearch(keyword);
    while (true) {
        // get result
        if (response.statuses && Array.isArray(response.statuses) && response.statuses.length > 0) {
            results = results.concat(response.statuses);
        }
        if (results.length <= 0 || !results[results.length - 1]) {
            console.log(JSON.stringify(results, null, 2));
            break;
        }
        // check time range
        let ct = new Date(Date.parse(results[results.length - 1].created_at));
        if (lastHour < ct) {
            response = await getSearch(keyword, results[results.length - 1].id_str);
            response.statuses.shift();  // delete repeat data
        } else { break; }
    }

    // sort result
    results.reverse();
    for (let result of results) {
        // check time
        let createdAt = new Date(Date.parse(result.created_at));
        if (createdAt < lastHour || thisHour < createdAt) { continue; }

        // skip retweet
        if (result.retweeted_status &&
            result.retweeted_status.id_str != result.id_str) {
            continue;
        }

        // get url data
        let tweetID = result.id_str;
        let screenName = result.user ? result.user.screen_name : null;
        if (!tweetID || !screenName) { continue; }

        // post
        const message = await rtChannel.send({ content: `https://twitter.com/${screenName}/status/${tweetID}` });
        message.react(EMOJI_RECYCLE);  // RECYCLE EMOJI

    }
};



module.exports = {
    name: 'twitter listener',
    description: "search twitter every hour",
    setup(client) {

        // auto search every hour
        let interval = setInterval(async () => {
            const nowMinutes = new Date(Date.now()).getMinutes();
            if (3 <= nowMinutes && nowMinutes < 6) {

                for (let gID of Object.keys(client.config)) {
                    if (!client.config[gID].twitterListener) { continue; }

                    for (const { RETWEET_CHANNEL_ID, RETWEET_KEYWORD } of client.config[gID].twitterListener) {
                        const rtChannel = client.channels.cache.get(RETWEET_CHANNEL_ID);
                        if (!rtChannel) { continue; }

                        searchNewTweet(RETWEET_KEYWORD, rtChannel);
                    }
                }
            }
        }, 3 * 60 * 1000);  // check every 3min
        client.once('close', () => {
            clearInterval(interval);
        });

        client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.partial) await reaction.message.fetch().catch(() => { });
            if (reaction.partial) await reaction.fetch().catch(() => { });
            if (reaction.users.partial) await reaction.users.fetch().catch(() => { });

            // skip other emoji
            if (reaction.emoji.toString() != EMOJI_RECYCLE) { return; }

            // get msg data
            const { message } = reaction;
            const { guild } = message;

            // skip not-deletable
            if (!message.deletable) { return; }
            if (message.author.id != guild.me.id) { return; }

            if (!guild) { return; }  // skip PM
            if (user.bot) { return; }   // skip bot reaction

            // get config
            const { client } = reaction;
            const configs = client.config[message.guild.id];
            if (!configs || !configs.twitterListener) { return false; }
            const config = configs.twitterListener.find((cfg) => { return message.channel.id == cfg.RETWEET_CHANNEL_ID });

            // skip not target
            if (!config) { return; }

            if (reaction.count <= (config.RETWEET_DELCOUNT || 5)) { return; }

            // // dont need to check this?
            // // // skip msg which didnt react recycle reaction(not this command's reply)
            // // if (!reaction.me) { return console.log(`[twitterBot] reaction.me = ${reaction.me}`); }   // reaction.me only work once?
            // let reactionMe = reaction.users.cache.has(guild.me.id);
            // if (!reactionMe) {
            //     await reaction.users.fetch().catch(() => { });   // re-check cache
            //     reactionMe = reaction.users.cache.has(guild.me.id);
            // }
            // if (!reactionMe) { return; }

            setTimeout(() => message.delete().catch(() => { }), 250);
        });
    }
}
