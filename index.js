
require('dotenv').config();
const server = require('./server.js');

const fs = require('fs');
const sleep = (ms) => { return new Promise((resolve) => { setTimeout(resolve, ms); }); };

const rebootByHerokuAPI = async () => {
    if (!fs.existsSync("./.env")) {
        // heroku API
        const apiUrl = 'https://api.heroku.com';
        const app_id_or_name = 'arraydcbot';
        const dyno_id_or_name = 'web.1';
        // util promisify
        // const requestGet = require('util').promisify(require('request').get);
        const requestDelete = require('util').promisify(require('request').delete);

        // restart by heroku API
        await requestDelete({
            url: `${apiUrl}/apps/${app_id_or_name}/dynos/${dyno_id_or_name}`,
            headers: {
                Accept: 'application/vnd.heroku+json; version=3',
                Authorization: `Bearer ${process.env.HEROKU_TOKEN}`
            },
            json: true
        });

        await sleep(5000);
    }
};

let clients = [];
module.exports.terminate = async () => {
    // check all clients
    for (let client of clients) {
        // check all plugins
        for (let [key, value] of client.commands) {
            // idleCheck method
            if (!!value.idleCheck && typeof (value.idleCheck) == "function") {
                let idle = value.idleCheck();

                if (!idle) {
                    console.log(`${client.mainConfig.botName} is busy, terminate fail.`);
                    return;
                }
            }
        }
    }

    // emit all client
    for (let client of clients) {
        client.emit('close');
    }
    // terminate http server
    server.terminate();

    if (process.env.HOST_TYPE == 'HEROKU') { await rebootByHerokuAPI(); }

    process.exit(1);
};

(async () => {

    // defind host
    if (process.env.HOST_TYPE == 'HEROKU') { process.env.HOST_URL = 'https://arraydcbot.herokuapp.com'; }
    if (process.env.HOST_TYPE == 'FLY_IO') { process.env.HOST_URL = 'https://arraydcbot.fly.dev'; }
    if (process.env.HOST_TYPE == 'debug') { process.env.HOST_URL = 'https://2897-114-36-103-113.ngrok-free.app'; }

    // web server
    server.init();

    for (const bot of [
        'SSRB',
        'POKOBE',
        'DLSITE',
        // 'DICE'
    ]) {
        const configPath = `./configs/${bot}/`;


        if (fs.existsSync(`./bot.js`)) {
            let botJs = require(`./bot.js`);

            let client = await botJs.init(configPath);
            clients.push(client);
        }
    }






})();