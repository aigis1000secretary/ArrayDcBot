
// const { TWITTER } = require('../config.js');
const [EMOJI_RECYCLE] = ['♻️']

// const Discord = require('discord.js');
// const server = require('../server');
// const express = require('express');
// let client = null;

const { ETwitterStreamEvent, TwitterApi } = require('twitter-api-v2');

// const request = require('request');
// const util = require('util');
// const get = util.promisify(request.get);
// const post = util.promisify(request.post);
function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

class Twitter {

    client = new TwitterApi();
    constructor() {
        this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    }

    async getUserID(username) {
        const user = await this.client.v2.userByUsername(username);
        return user?.data?.id || null;
    }

    async getUsers(IDs) {
        const users = await this.client.v2.users(IDs);
        return users?.data || [];
        // [{ id: '2186926766', name: 'タクシキ', username: 'z1022001' }]
    }

    async getFollowingIDs(userID) {
        const followings = await this.client.v2.following(userID);
        let usernames = [];
        for (let followingUser of followings?.data || []) {
            usernames.push(followingUser.username);
        }
        return usernames;
    }

    async getStreamRules() {
        let rules = await this.client.v2.streamRules();
        return rules?.data || [];
    }

    getUserByUsername(username, options = this._options.default) {
        return this.client.v2.userByUsername(username, options).catch(console.log);
    }

    getTweet(tweetId, options = this._options.default) {
        return this.client.v2.singleTweet(tweetId, options).catch(console.log);
    }

    getTweetsList(username, options = this._options.default) {
        return this.client.v2.search(`from:${username} -is:retweet`, options).catch(console.log);
    }

    getTweets(query, options = this._options.default) {
        return this.client.v2.search(query, options).catch(console.log);
    }

    // stream
    stream = null;
    streamError = '';
    async fillback(timeInMin) {
        const nowTime = Date.now();
        let fillback = [];

        // check online filter rule
        let onlineRules = await this.getStreamRules();
        for (let { id, value, tag } of onlineRules) {

            // get recent tweets
            let recentTweets = await this.getTweets(value);
            for await (const tweet of recentTweets) {

                // filter tweet in 20 min
                let createTime = new Date(tweet.created_at).getTime();
                if (nowTime - createTime > 1000 * 60 * timeInMin) { break; }

                // set dummy event data
                let eventData =
                    fillback.find((eventData) => (eventData.data?.id == tweet.id))  // check fillback array
                    || { data: tweet, matching_rules: [] };  // build new eventData
                eventData.matching_rules.push({ id, tag })  // set match rule
                // keep event data
                if (!fillback.includes(eventData)) { fillback.push(eventData); }
            }
        }
        // sort by time
        fillback.sort((a, b) => {
            let iA = (new Date(a.data?.created_at).getTime());
            let iB = (new Date(b.data?.created_at).getTime());
            return iA == iB ? 0 : (iA < iB ? -1 : 1);
        });
        return fillback;
    }

    initStream() {
        // normal init
        let options = this._options.stream;
        options.autoConnect = false;

        let stream = this.client.v2.searchStream(options);

        // normal event
        // stream.on(ETwitterStreamEvent.ConnectError, (err) => console.log('[TL2] Connect error: ', err.message || err));
        stream.on(ETwitterStreamEvent.ConnectionClosed, () => console.log('[TL2] Connection has been closed.'));
        stream.on(ETwitterStreamEvent.ConnectionLost, () => console.log('[TL2] Connection lost.'));

        // stream.on(ETwitterStreamEvent.ReconnectAttempt, () => console.log('[TL2] Reconnect attempt'));
        // stream.on(ETwitterStreamEvent.ReconnectError, (err) => console.log('[TL2] Reconnect error: ', err.message || err));
        stream.on(ETwitterStreamEvent.ReconnectLimitExceeded, () => console.log('[TL2] Reconnect limit exceeded'));

        stream.on(ETwitterStreamEvent.DataError, (err) => console.log('[TL2] Data twitter error: ', err.message || err));
        stream.on(ETwitterStreamEvent.TweetParseError, (err) => console.log('[TL2] Data tweet parse error: ', err.message || err));

        // keep connect alive
        stream.on(ETwitterStreamEvent.DataKeepAlive, () => {
            // console.log('[TL2] Received keep alive event');
            (() => { })();
        });

        // Connected / Reconnected
        stream.on(ETwitterStreamEvent.Connected, async () => console.log('[TL2] Connected!'));
        stream.on(ETwitterStreamEvent.Reconnected, async () => {
            console.log(`[TL2] Reconnected!`, this.streamError ? this.streamError : '');
            this.streamError = '';
        });

        // ECONNRESET
        stream.on(ETwitterStreamEvent.ConnectionError, (err) => {
            let error = `[TL2] Connection error!: ${err.message || err}`;
            if (error.includes('ECONNRESET')) { this.streamError = error; }
            else { console.log(error); }
        });
        stream.on(ETwitterStreamEvent.Error, async (err) => {
            let error = `Stream error: ${err.message || err}`;
            if (error.includes('Connection lost')) { console.log(this.streamError, error); this.streamError = ''; }
            if (error.includes('Reconnect error')) { this.streamError = error; }
            else { console.log(`[TL2]`, error); }
        });

        return stream;
    }
    async listen(callback) {
        // init stream
        if (!this.stream) {
            this.stream = this.initStream();
        }

        // manual fillback data for debug
        if (process.env.HOST_TYPE == 'debug') {
            console.log(`manual fillback data for debug`)
            let fillback = await this.fillback(90);
            for (let eventData of fillback) { await callback(eventData); }
            return;
        }

        // backfill 30 minutes data
        this.stream.on(ETwitterStreamEvent.Connected, async () => {
            // fillback data to callback
            let fillback = await this.fillback(30);
            for (let eventData of fillback) { await callback(eventData); }
        });
        this.stream.on(ETwitterStreamEvent.Reconnected, async () => {
            // fillback data to callback
            let fillback = await this.fillback(30);
            for (let eventData of fillback) { await callback(eventData); }
        });

        // data event
        this.stream.on(ETwitterStreamEvent.Data, callback);

        if (this.interval != null) { clearTimeout(this.interval); }
        // start connect
        this.interval = setTimeout(async () => {
            await this.stream.connect({
                autoReconnect: true, autoReconnectRetries: Infinity,
                nextRetryTimeout:
                    (tryOccurence) => (([5, 10, 15, 30, 60, 90, 120, 150, 180, 360, 600][tryOccurence - 1] || 900) * 1000)
            })
                .catch((e) => { console.log(`[TL2] v2.searchStream() error! ${e.message}`) });
        }, 5000);
    }
    // async forceReconnect() {
    //     this.stream?.destroy();
    //     await sleep(30 * 1000);
    //     // restart stream
    //     await this.listen();
    // }

    _options = {
        full: {
            'expansions': ['attachments.poll_ids', 'attachments.media_keys', 'author_id', 'entities.mentions.username', 'geo.place_id', 'in_reply_to_user_id', 'referenced_tweets.id', 'referenced_tweets.id.author_id'],
            'media.fields': ['duration_ms', 'height', 'media_key', 'preview_image_url', 'type', 'url', 'width', 'public_metrics', 'alt_text', 'variants'],
            'place.fields': ['contained_within', 'country', 'country_code', 'full_name', 'geo', 'id', 'name', 'place_type'],
            'poll.fields': ['duration_minutes', 'end_datetime', 'id', 'options', 'voting_status'],
            'tweet.fields': ['attachments', 'author_id', 'context_annotations', 'conversation_id', 'created_at', 'entities', 'geo', 'id', 'in_reply_to_user_id', 'lang', 'public_metrics', 'possibly_sensitive', 'referenced_tweets', 'reply_settings', 'source', 'text', 'withheld'],
            'user.fields': ['created_at', 'description', 'entities', 'id', 'location', 'name', 'pinned_tweet_id', 'profile_image_url', 'protected', 'public_metrics', 'url', 'username', 'verified', 'withheld'],
        },
        default: {
            'expansions': ['attachments.media_keys', 'author_id', 'entities.mentions.username'],
            'media.fields': ['height', 'media_key', 'preview_image_url', 'type', 'url', 'width', 'alt_text'],
            'tweet.fields': ['attachments', 'author_id', 'created_at', 'entities', 'id', 'source', 'text'],
            'user.fields': ['created_at', 'description', 'entities', 'id', 'location', 'name', 'profile_image_url', 'public_metrics', 'url', 'username']
        },
        stream: {
            'expansions': ['author_id'],
            'media.fields': ['url', 'alt_text'],
            'tweet.fields': ['author_id', 'created_at', 'entities', 'id', 'text'],
        }
    }
}
// const twitter = new Twitter();

module.exports = {
    name: 'twitter listener',
    description: "search twitter every hour",
    twitter: new Twitter(),
    async setup(client) {

        // debug method
        {
            /*
            // Log every rule ID
            await this.twitter.client.v2.streamRules()
                .then((_rules) => console.log(_rules.data?.map(rule => rule) || _rules));//*/
            /*
            // force delete all online rules (for debug bearer_token)
            await this.twitter.client.v2.updateStreamRules({
                delete: {
                    // ids: ['1595678639596589058']
                    // ids: (await this.twitter.getStreamRules())
                    //     .filter((rule) => rule.tag == 'twitterListener')
                    //     .map(rule => rule.id)
                }
            })
                .then(console.log)
                .catch(console.log);//*/
        }

        // collect configs
        let rules = [];
        for (let gID of Object.keys(client.config)) {
            if (!client.config[gID].twitterListener2) { continue; }

            for (const { RETWEET_CHANNEL_ID, RETWEET_KEYWORD } of client.config[gID].twitterListener2) {
                const rtChannel = await client.channels.fetch(RETWEET_CHANNEL_ID);
                if (!rtChannel) { continue; }

                // set rule
                let rule = {
                    cID: RETWEET_CHANNEL_ID,
                    keyword: RETWEET_KEYWORD || ''
                }
                rules.push(rule);
            }
        }

        // setup rule
        const ruleTag = client.user.id;
        let localRules = [];
        if (rules.length > 0) {
            let localRule = '(';
            const ruleEnd = ') -is:retweet';  // -is:reply -is:quote

            for (let { keyword } of rules) {
                // skip same keyword
                if (localRule.includes(keyword) ||
                    localRules.find((rule) => (rule.value.includes(keyword)))) { continue; }

                // temp
                let temp = '';
                if (localRule.length <= 1) { // temp =           `(#hashA`
                    temp = `(${keyword}`;
                } else {                     // temp = `(#hash0 OR #hashA`
                    temp = `${localRule} OR ${keyword}`;
                }

                // set keyword
                if (temp.length < 512 - ruleEnd.length) {
                    localRule = temp;
                } else {
                    localRule = `${localRule}${ruleEnd}`;
                    localRules.push({ value: localRule, tag: ruleTag });
                    localRule = `(${keyword}`;
                }
            }
            // set last keyword
            localRule = `${localRule}${ruleEnd} `;
            localRules.push({ value: localRule, tag: ruleTag });
        }


        // check online rules
        let onlineRules = (await this.twitter.getStreamRules()).filter((rule) => rule.tag == ruleTag);

        // check online rule valid or not
        let deleteIDs = [];
        for (let { value, id, tag } of onlineRules) {
            // same rule exist
            if (localRules.find((rule) => (rule.value == value))) { continue; }
            // keep id for delete
            deleteIDs.push(id);
        }
        // delete all old rules
        if (deleteIDs.length > 0) {
            console.log(`[TL2] updateStreamRules delete`);
            await this.twitter.client.v2.updateStreamRules({ delete: { ids: deleteIDs } }).then(console.log);
        }

        // check lost rules & set append list
        let appendRuels = [];
        for (let { value, tag } of localRules) {
            // same rule exist
            if (onlineRules.find((rule) => (rule.value == value))) { continue; }
            // keep id for delete
            appendRuels.push({ value, tag });
        }
        // update rules
        if (appendRuels.length > 0) {
            await this.twitter.client.v2.updateStreamRules({ add: appendRuels }).then((res) => {
                console.log(`[TL2] updateStreamRules add`);
                if (res.errors) { console.log({ add: appendRuels }) }
                // console.log(res)
            });
        }

        // // Log every rule ID
        // await this.twitter.client.v2.streamRules()
        //     .then((_rules) => console.log(_rules.data?.map(rule => rule) || _rules));


        // listen 
        const callback = async (eventData) => {
            if (!eventData.data?.id) { return; }

            // console.log(`====Twitter has sent something: ${eventData.data?.id}`);
            // console.log(new Date(eventData.data?.created_at));
            // console.log(JSON.stringify(eventData, null, 2));

            // check match rule
            let matchRuleValues = [];
            for (let match of eventData.matching_rules) {
                let rule = onlineRules.find((onlineRule) => (onlineRule.id == match.id && onlineRule.tag == ruleTag));
                if (rule && !matchRuleValues.includes(rule.value)) { matchRuleValues.push(rule.value); }
            } // value = `(#hashA OR #hashB) -is:retweet`
            if (matchRuleValues.length <= 0) { return; }

            // get really tweet
            let tweet = eventData.data || null;
            if (!tweet) { return; }

            // get user name for url
            let user = (await this.twitter.getUsers([tweet.author_id]))[0] || { username };
            // check match rules
            for (let value of matchRuleValues) {
                // check config rules & get cID
                let matchRules = rules.filter((rule) => (value.includes(rule.keyword)))
                let cIDs = [];
                for (let { cID, keyword } of matchRules) {
                    // keyword filter
                    if (keyword.startsWith('#') && !tweet.text?.includes(keyword)) { continue; }
                    if (keyword.startsWith('from:') && `from:${user.username}` != keyword) { continue; }
                    if (cIDs.includes(cID)) { continue; }
                    cIDs.push(cID);
                }
                for (let cID of cIDs) {
                    // chekc channel
                    const rtChannel = await client.channels.fetch(cID);
                    if (!rtChannel) { continue; }

                    // check message
                    const content = `https://twitter.com/${user.username}/status/${tweet.id}`;
                    // get message id by timestamp
                    const createTime = BigInt(new Date(tweet.created_at).getTime());
                    const around = (createTime - 1420070400000n) * 4194304n;
                    const msgs = await rtChannel.messages.fetch({ around: around.toString(), cache: true }).catch(() => { return null; });
                    const msg = msgs?.find((oldmsg) => (oldmsg.content == content && oldmsg.author.id == client.user.id));

                    // found duplicate data
                    if (msg) { continue; }

                    // send fillback
                    const message = await rtChannel.send({ content }).catch(console.log);
                    message.react(EMOJI_RECYCLE).catch(() => { });  // RECYCLE EMOJI
                }
            }
        }
        await this.twitter.listen(callback);

        client.once('close', () => {
            this.twitter.stream.destroy();
        });

    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        // skip bot reaction
        if (user.bot) { return false; }

        const { message } = reaction;
        const { client, content } = message;

        if (reaction.emoji.name != EMOJI_RECYCLE) { return false; }

        // ♻️

        // check deletable
        if (message.author.id != client.user.id || !message.deletable) { return; }

        // check message target
        // delete bot message not retweet message
        if (!message.content.startsWith(`https://twitter.com/`)) { return; }

        // skip not target channel
        const config = pluginConfig.find((cfg) => { return message.channel.id == cfg.RETWEET_CHANNEL_ID });
        if (!config || reaction.count <= (config.RETWEET_DELCOUNT || 1)) { return; }

        setTimeout(() => message.delete().catch(() => { }), 250);
    },
}
