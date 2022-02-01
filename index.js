
require('dotenv').config();
const { DEBUG_CHANNEL_ID } = require('./config.js');
const server = require('./server.js');
function sleep(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

let clients = [];
module.exports.terminate = () => {
    for (let client of clients) {
        client.emit('close');
    }
    server.terminate();
};

(async () => {
    // web server
    server.init();

    let bot = require('./bot.js')
    for (let config of require('./config.js').DISCORD.BOT) {
        clients.push(await bot.init(config));
        await sleep(100);
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

            await msg.delete().then(msg => console.log(`${msg.content}`)).catch(console.error);
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
