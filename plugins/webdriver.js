
const fs = require('fs');
const querystring = require('querystring');
const child_process = require('child_process');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');


const configPath = `./configs`;
const loginPath = `./configs/login.json`;
const regUrl = /https:\/\/twitter\.com\/([a-zA-Z0-9_]+)(?:\/status\/)(\d+)/;
const regImage = /^(http[^\?]+)\?format=([^\&]+)/;

const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); }
const sleepr = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms + Math.floor(Math.random() * 100)); }); }


class UserData {
    dateCreated;
    uID = '';
    username = '';
    ssim = 0;
    suspended = false;
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

    isWin32 = require("os").platform() == 'win32';

    driver = null;
    constructor() {
        if (this.isWin32) {
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

        console.log('Chrome driver init.');

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
        console.log('Chrome login');

        const loginBar = `input[autocomplete='username']`;
        const userBtn = 'a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-sdzlij.r-1phboty.r-rs99b7.r-1waj6vr.r-1loqt21.r-19yznuf.r-64el8z.r-1ny4l3l.r-o7ynqc.r-6416eg.r-lrvibr > div.css-901oao.r-1awozwy.r-6koalj.r-18u37iz.r-16y2uox.r-37j5jr.r-a023e6.r-b88u0q.r-1777fci.r-rjixqe.r-bcqeeo.r-q4m81j.r-qvutc0';

        // home page
        await this.driver.get('https://twitter.com/home');
        let ele = await Promise.race([
            this.driver.wait(until.elementLocated(By.css(userBtn)), 5000).catch(() => null),
            this.driver.wait(until.elementLocated(By.css(loginBar)), 5000).catch(() => null)
        ]);
        if (ele === null) { return false; }

        let logged = (await this.driver.getCurrentUrl().catch(() => '')).includes('/home');
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
    searchingTask = 0;

    async searchTweet(keyword, { dataNum = 20, after }) {
        if (!this.isWin32) { return null; }

        // waiting login
        while (!this.constructed) {
            await sleepr(500);
        }

        // waiting searching...
        while (this.searching || this.searchingTask) {
            await sleepr(500);
        }

        // start search
        this.searching = true;

        let searchResult = new Map();   // <tID>, <tweet>;
        {
            console.log(`Chrome search ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} ${keyword}`);

            // search page
            let _keyword = querystring.escape(keyword);
            let searchUrl = `https://twitter.com/search?q=${_keyword}&src=typed_query&f=live`;
            // wait search page load
            while (1) {
                await this.driver.get(searchUrl);

                let ele = await this.driver.wait(until.elementLocated(By.partialLinkText('@')), 5000).catch(() => null);
                if (ele) { break; }
            }


            // get tweet & page down
            let done = false;
            let lastTweetID = null;
            let lastElement = null;
            while (1) {

                // get all tweet
                let elements = await this.driver.findElements(By.css(`main .r-14lw9ot section > .css-1dbjc4n > div.r-18u37iz > div.r-13qz1uu > div > div`)).catch(() => []);

                // div[data-testid="cellInnerDiv"]  // main .r-14lw9ot section > .css-1dbjc4n > div.r-18u37iz > div.r-13qz1uu > div > div
                // data-testid="tweet"
                // data-testid="Tweet-User-Avatar"
                // data-testid="tweetText"
                // data-testid="User-Name"
                // data-testid="tweetPhoto"

                // get single tweet
                for (let i = 0; i < elements.length; ++i) {
                    const elePath = `main .r-14lw9ot section > .css-1dbjc4n > div.r-18u37iz > div.r-13qz1uu > div > div:nth-child(${i + 1})`;

                    let textEle = await this.driver.wait(until.elementLocated(By.css(`${elePath} div[data-testid="tweetText"]`)), 2500).catch(() => null);
                    let authorImage = await this.driver.wait(until.elementLocated(By.css(`${elePath} div[data-testid="Tweet-User-Avatar"] img`)), 2500).catch(() => null);
                    let hrefs = await this.driver.findElements(By.css(`${elePath} a`)).catch(() => []);
                    let authorHrefs = await this.driver.findElements(By.css(`${elePath} div[data-testid="User-Name"] a`)).catch(() => []);
                    let mediaEle = await this.driver.findElements(By.css(`${elePath} div[data-testid="tweetPhoto"]`)).catch(() => []);

                    // get tweet text
                    if (textEle) { textEle = await textEle.getText().catch(() => { return }); }
                    // get tweet author image
                    if (authorImage) { authorImage = await authorImage.getAttribute('src').catch(() => { return; }); }

                    // check data
                    if (!(hrefs.length && !!textEle && authorHrefs.length && !!authorImage)) {
                        // console.log(elePath);
                        // console.log(hrefs.length, !!textEle, authorHrefs.length, !!authorImage, mediaEle.length);
                        i = elements.length;
                        continue;
                    }


                    // get tweet base-data
                    let tID, username, url;
                    for (let a of hrefs) {
                        // get link href
                        let href = await a.getAttribute('href').catch(() => '');

                        if (regUrl.test(href) && href.endsWith('/analytics')) {
                            // get username/ tID
                            let [, _username, _tID] = href.match(regUrl);

                            username = _username;
                            tID = _tID;
                            url = `https://twitter.com/${_username}/status/${_tID}`;

                            // set scroll target
                            lastElement = a;

                            console.log(after, '<', tID, (BigInt(after) < BigInt(tID)));

                            break;
                        }
                    }
                    if (!tID) { continue; }

                    // keep url
                    let tweet = { url };
                    tweet.timestamp = parseInt(BigInt(tID) >> BigInt(22)) + 1288834974657;

                    // get tweet text
                    tweet.description = textEle;

                    // get tweet author
                    for (let a of authorHrefs) {
                        // get link href
                        let href = await a.getAttribute('href').catch(() => '');

                        // skip tweet link
                        if (href.includes('/status/')) { continue; }

                        let text = await a.getText().catch(() => '');
                        if (a == `@${username}`) { continue; }

                        // set username/showname
                        tweet.author = {
                            name: `${text} (@${username})`,
                            url: `https://twitter.com/${username}`
                        };

                        tweet.author.iconURL = authorImage;
                        break;
                    }

                    // get media
                    let media = [];
                    for (let j = 0; j < mediaEle.length; ++j) {
                        const photoPath = `${elePath} div[data-testid="tweetPhoto"]:nth-child(${j + 1})`;

                        let image = await this.driver.findElement(By.css(`${photoPath} img`)).catch(() => null);
                        if (image) {
                            let src = await image.getAttribute('src').catch(() => '');
                            if (src) {
                                if (regImage.test(src)) {
                                    let [, url, ext] = src.match(regImage);
                                    src = `${url}.${ext}`;
                                }
                                media.push({ image: { url: src } });
                            }
                            continue;
                        }

                        let video = await this.driver.findElement(By.css(`${photoPath} video`)).catch(() => null);
                        if (video) {
                            // medias.push({ video: { url: `https://twitter.com/i/videos/tweet/${tID}` } });

                            let src = await video.getAttribute('poster').catch(() => '');
                            if (src) {
                                media.push({ video: { url: src } });
                            }
                            continue;
                        }
                    }
                    if (media.length > 0) {
                        tweet.media = media;
                    }




                    if (after) {

                        if (BigInt(tID) <= after) {
                            // tweet too old, normal end
                            done = true; break;

                        } else {
                            // add tweet
                            searchResult.set(tID, tweet);
                        }

                    } else {
                        // didn't set limit tID, check dataNum

                        if (searchResult.size > dataNum) {
                            done = true; break;

                        } else {
                            // add tweet
                            searchResult.set(tID, tweet);
                            continue;
                        }
                    }
                }

                // break
                if (done) { break; }

                // scroll
                if (!lastElement) {
                    // error?
                    await this.driver.actions()
                        .sendKeys(Key.UP)
                        .sendKeys(Key.DOWN)
                        .perform()
                        .catch(console.log);
                    await sleep(500); continue;

                } else {
                    // lastElement exist
                    let href = (await lastElement.getAttribute('href').catch(() => ''));

                    // get tID
                    let [, username, tID] = href.match(regUrl) || []; if (!tID) { await sleep(500); continue; }

                    if (lastTweetID == tID) {
                        // loading stuck
                        await this.driver.actions()
                            .sendKeys(Key.PAGE_UP)
                            .sendKeys(Key.END)
                            .perform()
                            .catch(console.log);
                        console.log('Key.PAGE_UP')
                    } else {
                        lastTweetID = tID;
                        await this.scrollToElement(lastElement);
                        console.log('scrollToElement')
                    }
                }
            }
        }

        await this.driver.get('https://twitter.com/notifications');
        this.searching = false;

        console.log(`Chrome search ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })} done`);

        return searchResult;
    }
    async searchKeywords(keywords, { dataNum, after }) {
        if (!dataNum) {
            dataNum = keywords.length > 1 ? 2 : 20;
        }

        let keywordsResult = new Map();   // <tID>, <tweet>;
        for (let keyword of keywords) {

            let searchResult = await this.searchTweet(keyword, { dataNum, after });
            if (!searchResult) { continue; }

            for (let [tID, tweet] of searchResult) {
                keywordsResult.set(tID, tweet);
            }
        }

        return keywordsResult;
    }

    getUsernameByUID(uID) {
        for (let [username, userData] of this.mainUserDB) {
            if (userData.uID == uID) {
                return username;
            }
        }
        return;
    }
    async getUserData({ username, uID, force = false }) {
        if (!this.isWin32) { return {}; }

        // waiting login
        while (!this.constructed) {
            await sleepr(500);
        }


        // check db get username
        if (!username && uID) { username = this.getUsernameByUID(uID); }


        // check db
        if (!force && this.mainUserDB.has(username)) {
            // not force search & verify data exist
            if (this.mainUserDB.get(username).suspended || this.mainUserDB.get(username).uID) {
                return this.mainUserDB.get(username);
            }
        }
        // data not exist, need to search


        // add task num hold searchTweet
        ++this.searchingTask;

        // waiting searching...
        while (this.searching) {
            await sleepr(500);
        }


        // check db, maybe other search done when waiting
        // check db get username
        if (!username && uID) { username = this.getUsernameByUID(uID); }
        if (this.mainUserDB.has(username)) {
            return this.mainUserDB.get(username);
        }
        // still no data


        // start search
        this.searching = true;
        // get user obj
        let result = this.mainUserDB.has(username) ? this.mainUserDB.get(username) : new UserData(username);
        {
            // crawle user page
            if (uID) {
                await this.driver.get(`https://twitter.com/i/user/${uID}`);
            } else {
                await this.driver.get(`https://twitter.com/${username}`);
            }

            // get data object
            const suspendedText = 'div.css-1dbjc4n.r-aqfbo4.r-16y2uox > div.css-1dbjc4n.r-1oszu61.r-1niwhzg.r-18u37iz.r-16y2uox.r-1wtj0ep.r-2llsf.r-13qz1uu > div.css-1dbjc4n.r-14lw9ot.r-jxzhtn.r-1ljd8xs.r-13l2t4g.r-1phboty.r-16y2uox.r-1jgb5lz.r-11wrixw.r-61z16t.r-1ye8kvj.r-13qz1uu.r-184en5c:first-child > div.css-1dbjc4n > div.css-1dbjc4n:last-child > div.css-1dbjc4n.r-16y2uox > div.css-1dbjc4n.r-1jgb5lz.r-1ye8kvj.r-13qz1uu > div.css-1dbjc4n.r-1kihuf0.r-14lw9ot.r-1jgb5lz.r-764hgp.r-jzhu7e.r-d9fdf6.r-10x3wzx.r-13qz1uu:last-child > div.css-1dbjc4n > div.css-901oao.r-18jsvk2.r-37j5jr.r-1yjpyg1.r-1vr29t4.r-ueyrd6.r-5oul0u.r-bcqeeo.r-fdjqy7.r-qvutc0:first-child > span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0';
            const userDataScript = 'script[type="application/ld+json"]';
            const userProfileLock = 'svg.r-og9te1 > g';
            // wait page load
            await Promise.race([
                this.driver.wait(until.elementLocated(By.css(suspendedText)), 5000).catch(() => null),
                this.driver.wait(until.elementLocated(By.css(userDataScript)), 5000).catch(() => null)
            ]);

            // locked profile
            let ele = await this.driver.findElement(By.css(userProfileLock)).catch(() => null);
            if (ele) { result.locked = true; }

            // read profile data
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

                let additionalName = innerHTML.additionalName;
                if (username != additionalName) {
                    // user changet username
                    this.mainUserDB.delete(username);
                    result.username = additionalName
                }

            } else if (await this.driver.findElement(By.css(suspendedText)).catch(() => null)) {
                result.suspended = true;
            }
        }
        --this.searchingTask;
        this.searching = false;

        if (this.searchingTask <= 0) {
            this.searchingTask = 0;
            await this.driver.get('https://twitter.com/notifications');
        }

        this.mainUserDB.set(username, result);
        return result;
    }

    mainUserDB = new Map();  // <username>, <UserData>

    async close() {
        if (!this.isWin32) { return null; }

        await this.driver.quit().catch(() => { });
    }

    // async get() {
    // }
}

const chromeDriver = new ChromeDriver();

if (chromeDriver.isWin32) {
    const TEMP = process.env.TMP || process.env.TEMP;
    for (let dir of fs.readdirSync(TEMP)) {
        if (!dir.startsWith(`scoped_dir`) || !fs.lstatSync(`${TEMP}\\${dir}`).isDirectory()) { continue; }

        fs.rmSync(`${TEMP}\\${dir}`, { recursive: true, force: true });
    }
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


module.exports = { chromeDriver };





