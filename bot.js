
const fs = require('fs');
const { DEBUG_CHANNEL_ID } = require('./config.js');
// discord
const Discord = require('discord.js');

module.exports = {
    async init({ botName, DISCORD_TOKEN, PLUGINS, CONFIG }) {
        // client init
        const client = new Discord.Client({
            intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS'],
            partials: ["MESSAGE", "CHANNEL", "REACTION"]
        });
        client.config = CONFIG;
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
        client.on('messageCreate', async (message) => {
            // Emitted 
            for (let [key, value] of client.commands) {
                if (!value.execute || typeof (value.execute) != "function") { continue; }

                value.execute(message)
                // .then(result => { console.log(`${value.name.padEnd(20, ' ')}: ${result}`); }); 
            }
        });
        // for discord.js v13
        client.on('interactionCreate', async (interaction) => {
            // Emitted 
            for (let [key, value] of client.commands) {
                if (!value.interacted || typeof (value.interacted) != "function") { continue; }

                value.interacted(interaction);
            }
        });



        // auto update guild member count
        client.once('ready', async () => {

            // dc bot online
            console.log(`=====${botName} is online!=====    setup plugins(${client.commands.size}):`);
            if (!fs.existsSync("./.env")) {

                // const nowDate = new Date(Date.now());
                // const hours = nowDate.getHours().toString().padStart(2, '0');
                // const minutes = nowDate.getMinutes().toString().padStart(2, '0');
                // await channel.send({ content: `<${hours}:${minutes}> ${botName} is online!` })

                const channel = client.channels.cache.get(DEBUG_CHANNEL_ID);

                const nowHours = new Date(Date.now()).getHours();
                const nowMinutes = new Date(Date.now()).getMinutes();
                const rebooted =
                    ([1, 9, 17].includes(nowHours) && nowMinutes >= 55) ||  // in reboot time
                    ([2, 10, 18].includes(nowHours) && nowMinutes < 5);     // really reboot time
                const type = rebooted ? '⏰' : '🛠️';
                const nowDate = parseInt(Date.now() / 1000);
                await channel.send({ content: `<t:${nowDate}>  <t:${nowDate}:R> 📳! ${type}` })
            }

            // setup
            for (let [key, value] of client.commands) {
                // setup
                if (!!value.setup && typeof (value.setup) == "function") {
                    value.setup(client);
                }

                if (fs.existsSync("./.env")) {
                    console.log(`··${value.name.padEnd(20, ' ')} <${value.description}>`);
                }
            }
            // console.log(``);
        });

        client.once('close', () => {
            // offline msg
            console.log(`${botName} is offline!`);

            // destroy dc thread
            client.destroy();
        });

        // dc login
        await client.login(DISCORD_TOKEN);  //.then(console.log);
        return client;
    },
}
