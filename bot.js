
const [EMOJI_HAMMER_AND_WRENCH, EMOJI_BIRD, EMOJI_ALARM_CLOCK, EMOJI_BUILDING_CONSTRUCTION] = ['🛠️', '🐦', '⏰', '🏗️']
const EMOJI_REBOOTED = (process.env.HOST_TYPE == 'FLY_IO' ? EMOJI_BIRD : EMOJI_ALARM_CLOCK);

const DEBUG_CHANNEL_ID = '826992877925171250';

const fs = require('fs');
const path = require('path');

// discord
const Discord = require('discord.js');
const { GatewayIntentBits, Partials } = require('discord.js');


module.exports = {
    async init(filepath) {
        // client init
        const client = new Discord.Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction
            ]
        });

        // configs
        client.mainConfig = new Object();
        client.guildConfigs = new Discord.Collection();

        if (!fs.existsSync(filepath)) { return null; }

        // require configs
        // get all js file list
        const configFiles = fs.readdirSync(filepath)
            .filter(file => file.endsWith('.js'));

        for (const file of configFiles) {
            const { name } = path.parse(file);

            if (name == 'config') {
                // main config
                client.mainConfig = require(`${filepath}${file}`);

            } else if (/^\d+$/.test(name)) {
                // guild config
                const config = require(`${filepath}${file}`);
                client.guildConfigs.set(name, config);

            }
        }

        const getCommandLineArgs = function (msg) {
            let args = null, command = null;
            if (this.perfix.test(msg)) {
                args = msg.slice(1).split(/\s+/);
                command = args.shift().toLowerCase();
            }
            return { command, args };
        }
        // get plugin list
        let plugins = [];
        for (let [gID, gConfig] of client.guildConfigs) {

            // get plugins name
            for (let pluginName of Object.keys(gConfig)) {

                if (['name', 'perfix'].includes(pluginName)) { continue; }
                if (plugins.includes(pluginName)) { continue; }

                plugins.push(pluginName);
            }

            client.guildConfigs.get(gID).getCommandLineArgs = getCommandLineArgs;
        }

        // plugins
        client.commands = new Discord.Collection();
        // require plugins
        filepath = path.join(__dirname, `./plugins/`);
        if (fs.existsSync(filepath)) {
            // get all js file list
            const pluginFiles = fs.readdirSync(filepath)
                .filter(file => file.endsWith('.js'));

            for (const file of pluginFiles) {
                const { name } = path.parse(file);

                if (!plugins.includes(name)) { continue; }
                // in debug mode, only run plugin in list
                if (process.env.HOST_TYPE == 'debug' &&
                    !client.mainConfig.debugPlugins.includes(name)) { continue; }

                const plugin = require(`${filepath}${file}`);
                client.commands.set(name, plugin);

            }
        }

        // config method
        client.getPluginConfig = function (gID, pluginNname) {
            let guildConfig = this.guildConfigs.get(gID);
            if (!guildConfig) { return null; }
            return guildConfig[pluginNname] || null;
        }

        // emit
        // text command
        client.on('messageCreate', async (message) => {
            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.execute || typeof (value.execute) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                // get cmd / args
                const guildConfig = client.guildConfigs.get(guildId);
                let lines = message.content.split('\n');
                for (let i = 0; i < lines.length; ++i) {
                    lines[i] = guildConfig.getCommandLineArgs(lines[i]);
                }
                const { command, args } = lines[0];

                // call funstion
                value.execute(message, pluginConfig, command, args);
            }
        });

        client.on('messageDelete', async (message) => {
            if (message.partial) {
                // console.log(`[messageDelete] partial`)
                await message.fetch().then(() => { }).catch(() => { });
            }

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.messageDelete || typeof (value.messageDelete) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.messageDelete(message, pluginConfig);
            }
        });

        client.on('messageUpdate', async (oldMessage, newMessage) => {

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.messageUpdate || typeof (value.messageUpdate) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = oldMessage;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.messageUpdate(oldMessage, newMessage, pluginConfig);
            }
        });

        client.on('interactionCreate', async (interaction) => {
            const { message } = interaction;
            if (message.partial) {
                await message.fetch().then(() => { }).catch(() => { });
            }

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.interactionCreate || typeof (value.interactionCreate) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.interactionCreate(interaction, pluginConfig);
            }
        });

        client.on('messageReactionAdd', async (reaction, user) => {
            const { message } = reaction;
            if (message.partial) {
                // console.log(`[messageReactionAdd] partial`)
                await message.fetch().then(() => { }).catch(() => { });
            }

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.messageReactionAdd || typeof (value.messageReactionAdd) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.messageReactionAdd(reaction, user, pluginConfig);
            }
        });

        client.on('messageReactionRemove', async (reaction, user) => {
            const { message } = reaction;
            if (message.partial) {
                await message.fetch().then(() => { }).catch(() => { });
            }

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.messageReactionRemove || typeof (value.messageReactionRemove) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.messageReactionRemove(reaction, user, pluginConfig);
            }
        });



        // auto update guild member count
        client.once('ready', async () => {

            // dc bot online
            console.log(`=====${client.mainConfig.botName} is online!=====    setup plugins(${client.commands.size}):`);

            // if (!fs.existsSync("./.env"))
            {

                // const nowDate = new Date(Date.now());
                // const hours = nowDate.getHours().toString().padStart(2, '0');
                // const minutes = nowDate.getMinutes().toString().padStart(2, '0');
                // await channel.send({ content: `<${hours}:${minutes}> ${botName} is online!` })

                const channel = await client.channels.fetch(DEBUG_CHANNEL_ID);

                const nowHours = new Date(Date.now()).getHours();
                const nowMinutes = new Date(Date.now()).getMinutes();
                const rebooted =
                    ([1, 9, 17].includes(nowHours) && nowMinutes >= 55) ||  // in reboot time
                    ([2, 10, 18].includes(nowHours) && nowMinutes < 5);     // really reboot time
                const type = process.env.HOST_TYPE == 'debug' ? EMOJI_BUILDING_CONSTRUCTION : (rebooted ? EMOJI_REBOOTED : EMOJI_HAMMER_AND_WRENCH);
                const nowDate = parseInt(Date.now() / 1000);
                await channel.send({ content: `<t:${nowDate}>  <t:${nowDate}:R> 📳! ${type}` }).catch(() => { });
            }


            // Emitted 
            for (let [key, value] of client.commands) {

                if (fs.existsSync("./.env")) {
                    console.log(`··${value.name.padEnd(20, ' ')} <${value.description}>`);
                }

                if (!value.setup || typeof (value.setup) != "function") { continue; }

                value.setup(client);
            }


            // clock
            const timeoutMethod = () => {
                const now = Date.now();
                // get trim time
                const nowTime = (now % 1000 > 500) ? (now - (now % 1000) + 1000) : (now - (now % 1000));
                // check every 1sec
                const nextTime = nowTime + 1000;
                const offsetTime = nextTime - now;
                client.interval = setTimeout(timeoutMethod, offsetTime);

                const nowDate = new Date(nowTime);
                const hours = nowDate.getHours();
                const minutes = nowDate.getMinutes();
                const seconds = nowDate.getSeconds();



                for (let [key, value] of client.commands) {

                    if (!value.clockMethod || typeof (value.clockMethod) != "function") { continue; }

                    value.clockMethod(client, { hours, minutes, seconds });
                }
            }
            client.interval = setTimeout(timeoutMethod, 2000);
        });

        client.interval = null;
        client.once('close', () => {
            // offline msg
            console.log(`${client.mainConfig.botName} is offline!`);

            clearTimeout(client.interval);
            // destroy dc thread
            client.destroy();
        });

        // dc login
        await client.login(client.mainConfig.discordToken);  //.then(console.log);
        return client;
    },
}
