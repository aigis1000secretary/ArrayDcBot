
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
const regUrl = /^https:\/\/twitter\.com\/([a-zA-Z0-9_]{1,15})(?:\/status\/)(\d+)$/;

let tllog = fs.existsSync("./.env") ? console.log : () => { };

class ChromeDriver {

    driver = null;
    constructor() {
        this.initBotChrome();
    }

    constructed = false;
    async initBotChrome() {

        // chrome
        let chromeOptions = new chrome.Options();
        chromeOptions.addArguments('--disable-gpu');             // 關閉GPU 避免某些系統或是網頁出錯
        chromeOptions.addArguments('--window-size=800,600');
        // chromeOptions.addArguments('User-Agent=Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BLA-AL00 Build/HUAWEIBLA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/8.9 Mobile Safari/537.36')

        if (!fs.existsSync("./.env")) {
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

            // let user set username/passworf
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
            .catch(console.log);
    }

    async login() {
        tllog('Chrome login');

        const loginBar = 'div.css-1dbjc4n.r-aqfbo4.r-1p0dtai.r-1d2f490.r-12vffkv.r-1xcajam.r-zchlnj';
        const userBtn = 'div.css-1dbjc4n.r-13awgt0.r-12vffkv > div.css-1dbjc4n.r-13awgt0.r-12vffkv > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010:last-child > header.css-1dbjc4n.r-obd0qt.r-16y2uox.r-lrvibr.r-1g40b8q:nth-child(3) > div.css-1dbjc4n.r-f9dfq4 > div.css-1dbjc4n.r-aqfbo4.r-1pi2tsx.r-1xcajam.r-ipm5af > div.css-1dbjc4n.r-1pi2tsx.r-1wtj0ep.r-1rnoaur.r-1pn2ns4.r-f9dfq4 > div.css-1dbjc4n.r-1awozwy:first-child > div.css-1dbjc4n.r-1awozwy.r-1p6iasa.r-e7q0ms:last-child > a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-sdzlij.r-1phboty.r-rs99b7.r-1waj6vr.r-1loqt21.r-19yznuf.r-64el8z.r-1ny4l3l.r-o7ynqc.r-6416eg.r-lrvibr > div.css-901oao.r-1awozwy.r-6koalj.r-18u37iz.r-16y2uox.r-37j5jr.r-a023e6.r-b88u0q.r-1777fci.r-rjixqe.r-bcqeeo.r-q4m81j.r-qvutc0';

        // main page
        await this.driver.get('https://twitter.com');
        let ele = await Promise.race([
            this.driver.wait(until.elementLocated(By.css(userBtn)), 10000).catch(() => null),
            this.driver.wait(until.elementLocated(By.css(loginBar)), 10000).catch(() => null)
        ]);
        if (ele === null) { return false; }

        let logged = !(await ele.getText().catch(() => '')).includes('Twitter');
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
            await this.driver.get('https://twitter.com');
            await this.driver.wait(until.elementLocated(By.css(userBtn)), 10000).catch(() => null);
        } else {

            const userInput = `input[autocomplete='username']`;
            const passInput = `input[autocomplete='current-password']`;

            while (1) {
                await this.driver.get('https://twitter.com/i/flow/login');

                // login by username/password from file
                const loginData = (await this.getLoginData())[0];

                // username
                ele = await this.driver.wait(until.elementLocated(By.css(userInput)), 10000).catch(() => null)
                if (!ele) { await sleep(500); continue; }
                // typein
                await ele.clear().catch(() => { });
                await ele.sendKeys(loginData.username).catch(() => { });

                ele = await this.findElementByText(By.css(`span`), '下一步');
                if (!ele) { await sleep(500); continue; }
                // click 
                await ele.click().catch(() => { })

                // password
                ele = await this.driver.wait(until.elementLocated(By.css(passInput)), 10000).catch(() => null)
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
            this.driver.wait(until.elementLocated(By.css(userBtn)), 10000).catch(() => null),
            this.driver.wait(until.elementLocated(By.css(loginBar)), 10000).catch(() => null)
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
    async search({ cID, keywords, limit }) {
        // console.log({ cID, keywords, limit })

        // waiting...
        while (!this.constructed || this.searching) {
            await sleep(500 + Math.floor(Math.random() * 100));
        }

        // start search
        this.searching = true;

        let searchResult = new Map();
        for (let keyword of keywords) {
            tllog(`Chrome search: ${keyword}`);

            // search page
            let _keyword = querystring.escape(keyword);
            let url = `https://twitter.com/search?q=${_keyword}&src=typed_query&f=live`;
            while (1) {
                await this.driver.get(url);

                const tweetBtn = 'div.css-1dbjc4n.r-13awgt0.r-12vffkv > div.css-1dbjc4n.r-13awgt0.r-12vffkv > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010:last-child > main.css-1dbjc4n.r-1habvwh.r-16y2uox.r-1wbh5a2:last-child > div.css-1dbjc4n.r-150rngu.r-16y2uox.r-1wbh5a2.r-rthrr5 > div.css-1dbjc4n.r-aqfbo4.r-16y2uox > div.css-1dbjc4n.r-1oszu61.r-1niwhzg.r-18u37iz.r-16y2uox.r-1wtj0ep.r-2llsf.r-13qz1uu > div.css-1dbjc4n.r-14lw9ot.r-jxzhtn.r-1ljd8xs.r-13l2t4g.r-1phboty.r-16y2uox.r-1jgb5lz.r-11wrixw.r-61z16t.r-1ye8kvj.r-13qz1uu.r-184en5c:first-child > div.css-1dbjc4n > div.css-1dbjc4n:last-child > div.css-1dbjc4n > section.css-1dbjc4n > div.css-1dbjc4n:last-child > div > div:first-child > div.css-1dbjc4n.r-j5o65s.r-qklmqi.r-1adg3ll.r-1ny4l3l > div.css-1dbjc4n > article.css-1dbjc4n.r-1loqt21.r-18u37iz.r-1ny4l3l.r-1udh08x.r-1qhn6m8.r-i023vh.r-o7ynqc.r-6416eg > div.css-1dbjc4n.r-eqz5dr.r-16y2uox.r-1wbh5a2 > div.css-1dbjc4n.r-16y2uox.r-1wbh5a2.r-1ny4l3l > div.css-1dbjc4n.r-18u37iz:last-child > div.css-1dbjc4n.r-1iusvr4.r-16y2uox.r-1777fci.r-kzbkwu:last-child > div.css-1dbjc4n.r-zl2h9q:first-child > div.css-1dbjc4n.r-k4xj1c.r-18u37iz.r-1wtj0ep > div.css-1dbjc4n.r-1joea0r:last-child';
                let ele = this.driver.wait(until.elementLocated(By.css(tweetBtn)), 10000).catch(() => null);
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
        // for (let key of Array.from(searchResult.keys()).sort()) {
        //     console.log(`{"${key}" => "${searchResult.get(key)}"}`);
        // }

        await this.driver.get('https://twitter.com');
        this.searching = false;
        return searchResult;
    }

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





module.exports = {
    name: 'twitterListener3',
    description: "search twitter every hour",

    async execute(message, pluginConfig, command, args, lines) {

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

            chromeDriver.search({ cID, limit, keywords })
                .then(async (searchResult) => {
                    // searchResult = Map(<tID>, <href>)

                    for (let key of Array.from(searchResult.keys()).sort()) {
                        let url = searchResult.get(key);

                        await channel.send(url).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                    }
                });
            setTimeout(() => message.delete().catch(() => { }), 250);

        } else if (command == 'tldebug') {
            tllog = (tllog == console.log) ? () => { } : console.log;
        }
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
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

        client.once('close', () => {
            chromeDriver.close();
        });
    },

    async clockMethod(client, { hours, minutes, seconds }) {
        // update tweet at time

        // update flag
        let update = ([0, 30].includes(minutes) && seconds == 00);
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

                chromeDriver.search({ cID, limit, keywords })
                    .then(async (searchResult) => {
                        // searchResult = Map(<tID>, <href>)

                        for (let key of Array.from(searchResult.keys()).sort()) {
                            let url = searchResult.get(key);

                            await channel.send(url).then(msg => msg.react(EMOJI_RECYCLE).catch(() => { }));
                        }
                    });
            }
        }
    },
}