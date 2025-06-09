
const server = require('./server.js');
const botJs = require(`./bot.js`);

require('dotenv').config();

const fs = require('fs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clients = [];
module.exports.terminate = async (force = false) => {
    // check all clients
    const busy = [];
    for (const client of clients) {
        // check all plugins
        for (const [key, value] of client.commands) {
            // idleCheck method
            const idle = typeof (value?.idleCheck) == "function" ? value.idleCheck() : null;

            if (idle) { continue; }

            busy.push(`${client.mainConfig.botName}:${key}`);
        }
    }

    // log logs
    if (busy.length > 0 && !force) { console.log(`[${busy.join(', ')}] is busy, terminate fail.`); return; }

    // emit all client
    for (const client of clients) {
        client.emit('close');
    }

    // terminate http server
    server.terminate();

    await sleep(1500);

    // shutdown app
    process.exit(1);
};

module.exports.getBotIDs = () => {
    let botIDs = [];
    for (const client of clients) {
        botIDs.push(client.user.id);
    }
    return botIDs;
};

(async () => {

    // defind host
    if (process.env.HOST_TYPE == 'HEROKU') { process.env.HOST_URL = 'https://arraydcbot.herokuapp.com'; }
    if (process.env.HOST_TYPE == 'FLY_IO') { process.env.HOST_URL = 'https://arraydcbot.fly.dev'; }
    if (process.env.HOST_TYPE == 'debug') { process.env.HOST_URL = 'https://2897-114-36-103-113.ngrok-free.app'; }

    // web server
    // process.env.PORT = 3001;    // for dice debug
    // server.init();

    for (const bot of [
        'DLSITE',
        'SSRB', 'POKOBE', 'OTOSE', 'BANPEN', 'RIRIKA', 'AOKU',  /*
        'DICE'   //*/
    ]) {
        const configPath = `./configs/${bot}/`;

        if (!fs.existsSync(`./bot.js`)) { break; }
        if (!fs.existsSync(configPath)) { continue; }

        let client = await botJs.init(configPath);
         if (!client) { continue; }

        clients.push(client);
    }

    // // load modules
    // const modulesFiles = fs.readdirSync(`./modules/`)
    //     .filter(file => file.endsWith('.js'));

    // for (const file of modulesFiles) {
    //     require(`./modules/${file}`);
    // }

})();