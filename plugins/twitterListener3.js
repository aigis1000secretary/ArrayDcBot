
const fs = require('fs');
const querystring = require('querystring');
const child_process = require('child_process');

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

// const
const [EMOJI_RECYCLE] = ['♻️']
const configPath = `./configs`;
const loginPath = `./configs/login.json`;
const regUrl = /^https:\/\/twitter\.com\/([a-zA-Z0-9_]+)(?:\/status\/)(\d+)$/;
const isWin32 = require("os").platform() == 'win32';

let tllog = fs.existsSync("./.env") ? console.log : () => { };

class UserData {
    dateCreated;
    uID = '';
    username = '';
    ssim = 0;
    suspended = false;
    // padding;
    following = 0;
    followers = 0;
    tweets = 0;
    icon;
    givenName;
    description;
    constructor(username) {
        this.username = username;
        this.suspended = false;
    }
}
class ChromeDriver {

    driver = null;
    constructor() {
        if (isWin32) {
            this.initBotChrome();
        }
    }

    constructed = false;
    async initBotChrome() {

        // chrome
        let chromeOptions = new chrome.Options();
        chromeOptions.addArguments('--disable-gpu');             // 關閉GPU 避免某些系統或是網頁出錯
        chromeOptions.addArguments('--window-size=800,600');
        // chromeOptions.addArguments('User-Agent=Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36')
        if (!process.env.SHOW) {
            chromeOptions.addArguments('--headless');                // 啟動Headless 無頭
        }
        // tab page
        this.driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();

        tllog('Chrome driver init.');

        while (!await this.login()) { };

        this.constructed = true;
    }

    async getLoginData() {
        let loginData = null;

        // 檢查登入資訊
        fs.mkdirSync(configPath, { recursive: true });
        while (1) {

            await sleep(500);

            if (!fs.existsSync(loginPath)) {
                let loginData = [{ username: '', password: '' }];
                fs.writeFileSync(loginPath, JSON.stringify(loginData, null, 2), 'utf8');
            }

            try {
                let raw = fs.readFileSync(loginPath, 'utf8');
                loginData = eval(raw);

            } catch (e) {
                fs.unlinkSync(loginPath);
                continue;
            }

            let username = (loginData || [])[0]?.username || '';
            if (username != '') {
                console.log(); break;
            }

            // let user set username/password
            child_process.execSync(`notepad.exe ${loginPath}`).toString();
        }

        return loginData;
    }

    async findElementByText(options, text) {
        let elements = await this.driver.findElements(options).catch(() => { });

        for (let ele of elements) {
            let eleText = await ele.getText().catch(() => 'error');
            if (eleText == text || eleText.includes(text)) {
                return ele;
            }
        }

        return null;
    }

    async scrollToElement(ele) {
        await this.driver.actions()
            .scroll(0, 0, 0, 0, ele).perform()
            .catch(e => console.log(e.message));
    }

    async login() {
        tllog('Chrome login');

        const loginBar = `input[autocomplete='username']`;
        const userBtn = 'a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-sdzlij.r-1phboty.r-rs99b7.r-1waj6vr.r-1loqt21.r-19yznuf.r-64el8z.r-1ny4l3l.r-o7ynqc.r-6416eg.r-lrvibr > div.css-901oao.r-1awozwy.r-6koalj.r-18u37iz.r-16y2uox.r-37j5jr.r-a023e6.r-b88u0q.r-1777fci.r-rjixqe.r-bcqeeo.r-q4m81j.r-qvutc0';

        // main page
        await this.driver.get('https://twitter.com/home');
        let ele = await Promise.race([
            this.driver.wait(until.elementLocated(By.css(userBtn)), 5000).catch(() => null),
            this.driver.wait(until.elementLocated(By.css(loginBar)), 5000).catch(() => null)
        ]);
        if (ele === null) { return false; }

        let logged = (await this.driver.getCurrentUrl().catch(() => '')).includes('home');
        if (logged) { return true; }



        // decrypt cookie from twitter.enc
        if (fs.existsSync('twitter.enc')) {
            const key = process.env.JSONKEY;
            let encData = fs.readFileSync('./twitter.enc', 'utf8');
            let decData = crypto.decrypt(encData, key);
            fs.writeFileSync('./twitter.json', decData);
        }

        // check login data
        if (fs.existsSync('./twitter.json')) {
            // login by cookies
            let cookiesJson = (fs.readFileSync('./twitter.json', 'utf8') || '').split(/\s*\r?\n\s*/);
            for (let cookie of cookiesJson) {
                await this.driver.manage().addCookie(JSON.parse(cookie));
            }

            // await home page
            await this.driver.get('https://twitter.com/home');
            await this.driver.wait(until.elementLocated(By.css(userBtn)), 5000).catch(() => null);
        } else {

            const userInput = `input[autocomplete='username']`;
            const passInput = `input[autocomplete='current-password']`;

            while (1) {
                await this.driver.get('https://twitter.com/i/flow/login');

                // login by username/password from file
                const loginData = (await this.getLoginData())[0];

                // username
                ele = await this.driver.wait(until.elementLocated(By.css(userInput)), 5000).catch(() => null)
                if (!ele) { await sleep(500); continue; }
                // typein
                await ele.clear().catch(() => { });
                await ele.sendKeys(loginData.username).catch(() => { });

                ele = await this.findElementByText(By.css(`span`), '下一步');
                if (!ele) { await sleep(500); continue; }
                // click 
                await ele.click().catch(() => { })

                // password
                ele = await this.driver.wait(until.elementLocated(By.css(passInput)), 5000).catch(() => null)
                if (!ele) { await sleep(500); continue; }
                // typein
                await ele.clear().catch(() => { });
                await ele.sendKeys(loginData.password).catch(() => { });

                ele = await this.findElementByText(By.css(`span`), '登入');
                if (!ele) { await sleep(500); continue; }
                // click 
                await ele.click().catch(() => { })

                break;
            }
        }

        // wait login done
        ele = await Promise.race([
            this.driver.wait(until.elementLocated(By.css(userBtn)), 5000).catch(() => null),
            this.driver.wait(until.elementLocated(By.css(loginBar)), 5000).catch(() => null)
        ]);
        if (ele === null) { return false; }

        logged = !(await ele.getText().catch(() => '')).includes('Twitter');
        if (logged) {
            let cookies = await this.driver.manage().getCookies();
            let cookiesJson = [];
            for (let cookie of cookies) {
                cookiesJson.push(JSON.stringify(cookie))
            }
            fs.writeFileSync('./twitter.json', cookiesJson.join('\r\n'), 'utf8');

            // encrypt cookie to twitter.enc
            if (!fs.existsSync('twitter.enc')) {
                const key = process.env.JSONKEY;
                let rawData = fs.readFileSync('./twitter.json', 'utf8');
                let encData = crypto.encrypt(rawData, key);
                fs.writeFileSync('./twitter.enc', encData);
            }
        }

        return logged;
    }

    searching = false;
    async searchTweet({ keywords, limit }) {
        // console.log({ keywords, limit })

        // waiting...
        while (!this.constructed || this.searching) {
            await sleep(500 + Math.floor(Math.random() * 100));
        }

        // start search
        this.searching = true;

        let searchResult = new Map();   // <tID>, <href>;
        for (let keyword of keywords) {
            tllog(`Chrome search ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} ${keyword}`);

            // search page
            let _keyword = keyword.startsWith('@') ? `(${keyword.replace(/^@/, 'from%3A')})` : querystring.escape(keyword);
            let url = `https://twitter.com/search?q=${_keyword}&src=typed_query&f=live`;
            while (1) {
                await this.driver.get(url);

                let ele = await this.driver.wait(until.elementLocated(By.partialLinkText('@')), 5000).catch(() => null);
                if (ele) { break; }
            }

            // get tweet & page down
            let done = false;
            let lastTweetID = null;
            let lastElement = null;
            while (1) {

                // get all hyperlink
                let elements = await this.driver.findElements(By.css(`a`));

                for (let ele of elements) {
                    // get link href
                    let href = await ele.getAttribute('href').catch(() => '');

                    // set scroll target
                    if (href.endsWith('analytics')) { lastElement = ele; continue; }

                    // check regex
                    if (!regUrl.test(href)) { continue; }

                    // get tID
                    let [, username, tID] = href.match(regUrl);

                    // can't found tID limit
                    if (!limit) {
                        if (keywords.length > 1) {
                            // last tweet, search 1 tweet for each keyword
                            // keep url
                            searchResult.set(tID, href);
                            done = true;

                        } else if (searchResult.size > 30) {
                            // only 1 keyword, search 30 tweet then end
                            done = true;
                        }
                    }

                    // search normal end
                    if (limit && BigInt(tID) <= limit) { done = true; }

                    if (done) { break; }

                    // keep url
                    searchResult.set(tID, href);
                }
                // break
                if (done) { break; }

                // scroll
                if (!lastElement) {
                    // error?
                    await sleep(500); continue;

                } else {
                    // lastElement exist
                    let href = (await lastElement.getAttribute('href').catch(() => '')).replace('/analytics', '');

                    // get tID
                    let [, username, tID] = href.match(regUrl) || [];
                    if (!tID) { await sleep(500); continue; }

                    if (lastTweetID == tID) {
                        // loading stuck
                        await this.driver.actions()
                            .sendKeys(Key.PAGE_UP)
                            .sendKeys(Key.END)
                            .perform()
                            .catch(console.log);
                        tllog('Key.PAGE_UP')
                    } else {
                        lastTweetID = tID;
                        await this.scrollToElement(lastElement);
                        tllog('scrollToElement')
                    }
                }
            }
        }

        // console.log(cID, keywords[0], limit);
        // // console.log(searchResult)
        // for (let tID of Array.from(searchResult.keys()).sort()) {
        //     console.log(`{"${tID}" => "${searchResult.get(tID)}"}`);
        // }

        for (let tID of Array.from(searchResult.keys())) {
            let href = searchResult.get(tID);
            let [, username] = href.match(regUrl);

            let uID = null;
            for (let i = 0; i < 10; ++i) {
                uID = (await this.getUserData(username))?.uID;
                if (uID) {
                    break;
                } else {
                    await this.driver.get('https://twitter.com');
                    await sleep(500);
                }
            }

            if (!uID) {
                await this.driver.get('https://twitter.com');
                this.searching = false;
                return new Map();
            }
            tllog(uID.padEnd(20, ' '), username)

            href = href.replace(`/${username}/`, `/${uID}/`);
            searchResult.set(tID, href);
        }

        await this.driver.get('https://twitter.com');
        this.searching = false;

        tllog(`Chrome search ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);

        return searchResult;
    }

    async getUserData(username, force = false) {
        if (!this.constructed) { return {}; }

        // get user id
        if (this.mainUserDB.has(username)) {

            if (this.mainUserDB.get(username).suspended) {
                return this.mainUserDB.get(username);
            }

            if (force == false && this.mainUserDB.get(username).uID) {
                return this.mainUserDB.get(username);
            }
        }
        {
            // get user obj
            let result = this.mainUserDB.has(username) ? this.mainUserDB.get(username) : new UserData(username);

            // crawle user page
            await this.driver.get(`https://twitter.com/${username}`);

            // get data object
            const suspendedText = 'div.css-1dbjc4n.r-aqfbo4.r-16y2uox > div.css-1dbjc4n.r-1oszu61.r-1niwhzg.r-18u37iz.r-16y2uox.r-1wtj0ep.r-2llsf.r-13qz1uu > div.css-1dbjc4n.r-14lw9ot.r-jxzhtn.r-1ljd8xs.r-13l2t4g.r-1phboty.r-16y2uox.r-1jgb5lz.r-11wrixw.r-61z16t.r-1ye8kvj.r-13qz1uu.r-184en5c:first-child > div.css-1dbjc4n > div.css-1dbjc4n:last-child > div.css-1dbjc4n.r-16y2uox > div.css-1dbjc4n.r-1jgb5lz.r-1ye8kvj.r-13qz1uu > div.css-1dbjc4n.r-1kihuf0.r-14lw9ot.r-1jgb5lz.r-764hgp.r-jzhu7e.r-d9fdf6.r-10x3wzx.r-13qz1uu:last-child > div.css-1dbjc4n > div.css-901oao.r-18jsvk2.r-37j5jr.r-1yjpyg1.r-1vr29t4.r-ueyrd6.r-5oul0u.r-bcqeeo.r-fdjqy7.r-qvutc0:first-child > span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0';
            const userDataScript = 'script[type="application/ld+json"]';
            const userProfileLock = 'svg.r-og9te1 > g';
            await Promise.race([
                this.driver.wait(until.elementLocated(By.css(suspendedText)), 5000).catch(() => null),
                this.driver.wait(until.elementLocated(By.css(userDataScript)), 5000).catch(() => null)
            ]);

            // locked profile
            let ele = await this.driver.findElement(By.css(userProfileLock)).catch(() => null);
            if (ele) { result.locked = true; }

            // read data
            ele = await this.driver.findElement(By.css(userDataScript)).catch(() => null);
            if (ele) {
                let innerHTML = await ele.getAttribute('innerHTML').catch(() => '{}') || '{}';
                innerHTML = JSON.parse(innerHTML);

                // get data
                result.dateCreated = innerHTML.dateCreated || null;
                result.uID = innerHTML.author?.identifier || null;
                result.following = 0;
                result.followers = 0;
                result.tweets = 0;
                for (let { name, userInteractionCount } of (innerHTML.author?.interactionStatistic || [])) {
                    if (name == 'Follows') { result.followers = userInteractionCount; }
                    else if (name == 'Friends') { result.following = userInteractionCount; }
                    else if (name == 'Tweets') { result.tweets = userInteractionCount; }
                }
                result.icon = innerHTML.author?.image?.contentUrl || '';

                result.givenName = innerHTML.author?.givenName || '';
                result.description = innerHTML.author?.description || '';
            } else if (await this.driver.findElement(By.css(suspendedText)).catch(() => null)) {
                result.suspended = true; this.mainUserDB.set(username, result); return result;
            }





            // get following
            // const followingSpan = 'div.css-1dbjc4n.r-1mf7evn:first-child > a.css-4rbku5.css-18t94o4.css-901oao.r-18jsvk2.r-1loqt21.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-qvutc0 > span.css-901oao.css-16my406.r-18jsvk2.r-poiln3.r-1b43r93.r-b88u0q.r-1cwl3u0.r-bcqeeo.r-qvutc0:first-child > span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0';
            // ele = await this.driver.findElement(By.css(followingSpan)).catch(() => null);

            // get followers
            // const followersSpan = 'div.css-1dbjc4n:last-child > a.css-4rbku5.css-18t94o4.css-901oao.r-18jsvk2.r-1loqt21.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-qvutc0 > span.css-901oao.css-16my406.r-18jsvk2.r-poiln3.r-1b43r93.r-b88u0q.r-1cwl3u0.r-bcqeeo.r-qvutc0:first-child > span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0';
            // ele = await this.driver.findElement(By.css(followersSpan)).catch(() => null);

            this.mainUserDB.set(username, result);
            return result;
        }
    }



    mainUserDB = new Map();  // <username>, <UserData>

    async close() {
        await this.driver.quit().catch(() => { });
    }

    // async get() {
    // }
}

let chromeDriver = new ChromeDriver();

let findLastTwitterMessage = async (channel, uID) => {
    let oldMessages = await channel.messages.fetch().catch(() => { });
    for (let key of Array.from(oldMessages.keys()).sort().reverse()) {
        let oldMessage = oldMessages.get(key);
        // only check bot message
        if (oldMessage.author?.id != uID) { continue; }
        // check message target
        if (!regUrl.test(oldMessage.content)) { continue; }

        return oldMessage;
    }
    return { content: '' };
}

class crypto {
    // const ENCRYPTION_KEY = 'Put_Your_Password_Here'.padEnd(32, "_");
    // const ENCRYPTION_KEY = Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64')
    // const ENCRYPTION_KEY = process.env.JSONKEY;

    static decrypt(text, key) {
        if (!text) return null;
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = require('crypto').createDecipheriv('aes-256-ctr', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    static encrypt(text, key) {
        if (!text) return null;
        let iv = require('crypto').randomBytes(16);
        let cipher = require('crypto').createCipheriv('aes-256-ctr', Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
}

if (isWin32) {
    const TEMP = process.env.TMP || process.env.TEMP;
    for (let dir of fs.readdirSync(TEMP)) {
        if (!dir.startsWith(`scoped_dir`) || !fs.lstatSync(`${TEMP}\\${dir}`).isDirectory()) { continue; }

        fs.rmSync(`${TEMP}\\${dir}`, { recursive: true, force: true });
    }
}





module.exports = {
    name: 'twitterListener3',
    description: "search twitter every hour",

    async execute(message, pluginConfig, command, args, lines) {

        if (!isWin32) { return; }

        if (command == 'tl3') {

            let { client, channel } = message;

            // get channel id
            const cID = channel.id;

            // get last times tweet ID
            let limit;
            let lastMessage = await findLastTwitterMessage(channel, client.user.id)
            let [, , tID] = lastMessage.content.match(regUrl) || [];
            if (tID) { limit = BigInt(tID); }

            // get keywords from config
            const config = pluginConfig.find((cfg) => { return cID == cfg.RETWEET_CHANNEL_ID });
            if (!config) { return; }
            let keywords = config.RETWEET_KEYWORD;

            chromeDriver.searchTweet({ limit, keywords })
                .then(async (searchResult) => {
                    // searchResult = Map(<tID>, <href>)
                    tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);

                    for (let tID of Array.from(searchResult.keys()).sort()) {
                        let url = searchResult.get(tID);

                        await channel.send(url).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                    }

                    tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);
                });
            setTimeout(() => message.delete().catch(() => { }), 250);

        } else if (command == 'tldebug') {

            tllog = (tllog == console.log) ? () => { } : console.log;

        } else if (command == 'getuid') {

            if (chromeDriver.searching) {
                message.channel.send(`chromeDriver.searching...`).catch(() => { });
            } else {
                let { uID } = await chromeDriver.getUserData(args[0]);
                if (!uID) { return; }
                message.channel.send(`adduid ${args[0]} ${uID}`).catch(() => { });
            }

        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {

        if (isWin32) { return; }

        // skip bot reaction
        if (user.bot) { return false; }

        const { message } = reaction;
        const { client, channel, content } = message;

        if (reaction.emoji.name != EMOJI_RECYCLE) { return false; }

        // ♻️

        // check deletable
        if (message.author.id != client.user.id || !message.deletable) { return; }

        // check message target
        if (!regUrl.test(content)) { return; }

        // skip not target channel
        const config = pluginConfig.find((cfg) => { return message.channel.id == cfg.RETWEET_CHANNEL_ID });
        if (!config || reaction.count <= (config.RETWEET_DELCOUNT || 1)) { return; }

        let lastMessage = await findLastTwitterMessage(channel, client.user.id)
        let [, , delTweetID] = content.match(regUrl);
        let [, , oldTweetID] = lastMessage.content.match(regUrl);
        if (BigInt(oldTweetID) > BigInt(delTweetID)) {
            setTimeout(() => message.delete().catch(() => { }), 250);
        }
    },

    async setup(client) {

        if (!isWin32) { return; }

        client.once('close', () => {
            chromeDriver.close();
        });
    },

    async clockMethod(client, { hours, minutes, seconds }) {

        if (!isWin32) { return; }

        // update tweet at time

        // update flag
        let update = ([0, 30].includes(minutes) && seconds == 0);
        if (!update) { return; }

        for (let gID of client.guildConfigs.keys()) {
            const pluginConfig = client.getPluginConfig(gID, 'twitterListener3');
            if (!pluginConfig) { continue; }

            for (const config of pluginConfig) {
                // get channel id
                const cID = config.RETWEET_CHANNEL_ID;
                const channel = await client.channels.fetch(cID);

                // get last times tweet ID
                let limit;
                let lastMessage = await findLastTwitterMessage(channel, client.user.id)
                let [, , tID] = lastMessage.content.match(regUrl) || [];
                if (tID) { limit = BigInt(tID); }

                // get keywords from config
                let keywords = config.RETWEET_KEYWORD;

                chromeDriver.searchTweet({ limit, keywords })
                    .then(async (searchResult) => {
                        // searchResult = Map(<tID>, <href>)
                        tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}`);

                        for (let tID of Array.from(searchResult.keys()).sort()) {
                            let url = searchResult.get(tID);

                            await channel.send(url).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                        }

                        tllog(`Discord send. ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);
                    });
            }
        }
    },
}