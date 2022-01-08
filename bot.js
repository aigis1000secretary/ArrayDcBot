
const fs = require('fs');
const { DEBUG_CHANNEL_ID } = require('./config.js');
// discord
const Discord = require('discord.js');

module.exports = {
    async init({ BOT_NAME, DISCORD_TOKEN, PLUGINS }) {
        // client init
        const client = new Discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
        client.commands = new Discord.Collection();

        // load plugins
        if (fs.existsSync(`./plugins/`)) {
            // get js file list
            const pluginFiles = fs.readdirSync(`./plugins/`)
                .filter(file => file.endsWith('.js'));

            for (const file of pluginFiles) {
                if (!PLUGINS.includes(file)) { continue; }

                const plugin = require(`./plugins/${file}`);
                client.commands.set(plugin.name, plugin);
            }
        }



        // text command 
        client.on('message', async (message) => {
            // Emitted 
            for (let [key, value] of client.commands) {
                if (!value.execute || typeof (value.execute) != "function") { continue; }

                value.execute(message)
                // .then(result => { console.log(`${value.name.padEnd(20, ' ')}: ${result}`); }); 
            }
        });
        // for discord.js v13
        // client.on('interactionCreate', async (interaction) => {
        //     // Emitted 
        //     for (let [key, value] of client.commands) {
        //         if (!value.interacted || typeof (value.interacted) != "function") { continue; }

        //         value.interacted(interaction);
        //     }
        // });



        // auto update guild member count
        client.once('ready', async () => {

            // dc bot online
            console.log(`=====${BOT_NAME} is online!=====`);
            if (!fs.existsSync("./.env")) {
                const nowDate = new Date(Date.now());
                const channel = client.channels.cache.get(DEBUG_CHANNEL_ID);
                await channel.send(`${BOT_NAME} is online! <${nowDate.getHours()}:${nowDate.getMinutes()}>`)
            }

            // setup
            console.log(`setup plugins(${client.commands.size}):`);
            for (let [key, value] of client.commands) {
                if (!!value.setup && typeof (value.setup) == "function") {
                    console.log(`  ${value.name.padEnd(20, ' ')} <${value.description}>`);
                    value.setup(client);
                }
            }
            console.log(``);
        });

        client.once('close', () => {
            // offline msg
            console.log(`${BOT_NAME} is offline!`);

            // destroy dc thread
            client.destroy();
        });

        // dc login
        await client.login(DISCORD_TOKEN);  //.then(console.log);
        return client;
    },
}
