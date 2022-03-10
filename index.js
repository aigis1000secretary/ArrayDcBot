
require('dotenv').config();
const { DEBUG_CHANNEL_ID, HEROKU_TOKEN } = require('./config.js');
const server = require('./server.js');
function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

let clients = [];
module.exports.terminate = async () => {
    for (let client of clients) {
        client.emit('close');
    }
    server.terminate();

    if (!require('fs').existsSync("./.env")) {
        // heroku API
        const apiUrl = 'https://api.heroku.com';
        const app_id_or_name = 'arraydcbot';
        const dyno_id_or_name = 'web.1';
        // util promisify
        const requestGet = require('util').promisify(require('request').get);
        const requestDelete = require('util').promisify(require('request').delete);

        // restart by heroku API
        await requestDelete({
            url: `${apiUrl}/apps/${app_id_or_name}/dynos/${dyno_id_or_name}`,
            headers: {
                Accept: 'application/vnd.heroku+json; version=3',
                Authorization: `Bearer ${HEROKU_TOKEN}`
            },
            json: true
        });

        await sleep(5000);
    }

    process.exit(1);
};

(async () => {
    // web server
    server.init();

    let bot = require('./bot.js')
    for (let config of require('./config.js').DISCORD.BOT) {
        clients.push(await bot.init(config));
        await sleep(500);
    }

    await sleep(1000);
    let client = clients[0];

    for (let cID of [DEBUG_CHANNEL_ID]) {
        // for (let cID of [DEBUG_CHANNEL_ID, '713623232070156309']) {
        // await client.channels.fetch();
        const logChannel = client.channels.cache.get(cID);
        let delcount = 0;
        let msgs = await logChannel.messages.fetch(true);
        for (let key of msgs.keys()) {
            let msg = msgs.get(key);

            // check time 
            if (cID == DEBUG_CHANNEL_ID && Date.now() - msg.createdTimestamp < 90000000) { continue; };

            // await msg.delete().then(msg => console.log(`Del msg: ${msg.content}`)).catch(() => { });
            await msg.delete().catch(() => { });
            ++delcount;
        }
        console.log(`Bulk deleted ${delcount} messages in ${logChannel.name}`)
    }//*/
    /*
    for (let cID of [DEBUG_CHANNEL_ID, '713623232070156309']) {
        const logChannel = client.channels.cache.get(cID);
        logChannel.bulkDelete(100)
            .then(messages => console.log(`Bulk deleted ${messages.size} messages in ${logChannel.name}`))
            .catch(console.error);
    }//*/

})();//*/
