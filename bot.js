
const fs = require('fs');
const path = require('path');

// discord
const Discord = require('discord.js');
const { GatewayIntentBits, Partials } = require('discord.js');

const DEBUG_CHANNEL_ID = '826992877925171250';
const [EMOJI_HAMMER_AND_WRENCH, EMOJI_BIRD, EMOJI_ALARM_CLOCK, EMOJI_BUILDING_CONSTRUCTION] = ['🛠️', '🐦', '⏰', '🏗️']
const [EMOJI_VIBRATION, EMOJI_PHONE_OFF] = ['📳', '📴'];
const EMOJI_REBOOTED = (process.env.HOST_TYPE == 'FLY_IO' ? EMOJI_BIRD : EMOJI_ALARM_CLOCK);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let recentlyBootMsg = null;

async function configFormat(client, filepath) {
    const raw = fs.readFileSync(filepath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const newConfig = [];

    for (const _line of lines) {
        let line = _line;

        const reg = /["'`](\d+)["'`][^\/]*(\/\/[^\/]+)?$/;

        if (reg.test(line)) {

            const [, id, comment] = line.match(reg);
            if (!id) { continue; }

            const channel = await client.channels.fetch(id).catch(e => { });
            if (channel) {
                line = comment ?
                    line.replace(comment, `// #${channel.name} <#${channel.id}>`) :
                    `${line}    // #${channel.name} <#${channel.id}>`;
            }

            for (const [gID, guild] of client.guilds.cache) {
                const role = await guild.roles.fetch(id).catch(e => { });
                if (role) {
                    line = comment ?
                        line.replace(comment, `// ${role.name} <@&${role.id}>`) :
                        `${line}    // ${role.name} <@&${role.id}>`;
                    break;
                }
            }

        }
        newConfig.push(line);
    }
    fs.writeFileSync(filepath, newConfig.join('\r\n'));
}

module.exports = {
    async init(filepath) {

        // configs
        let mainConfig = null;
        const guildConfigs = new Map();

        // require configs
        // get all js file list
        // const configPath = `./configs/${bot}/`;  
        const hostType = process.env.HOST_TYPE || 'debug';
        const configFiles = fs.readdirSync(filepath).filter(file => file.endsWith('.js'));
        for (const file of configFiles) {
            const { name } = path.parse(file);

            if (name == hostType) {
                // main config
                mainConfig = require(`${filepath}${file}`);

            } else if (/^\d+$/.test(name)) {
                // guild config 
                guildConfigs.set(name, require(`${filepath}${file}`));

            }
        }
        // check bot token
        if (!mainConfig?.discordToken) {
            if (mainConfig) { console.log(`[Discord] bot <${filepath}> init fail: login token undefined`); }
            return null;
        }


        const getCommandLineArgs = function (msg) {
            const cmd = { command: null, args: null };
            if (this.perfix.test(msg)) {
                const [, perfix] = msg.match(this.perfix);
                cmd.args = msg.replace(perfix, '').split(/\s+/);
                cmd.command = cmd.args.shift().toLowerCase();
            }
            return cmd;
        }
        // get plugin list
        const plugins = [];
        for (const [gID, gConfig] of guildConfigs) {

            // get plugins name
            for (const pluginName of Object.keys(gConfig)) {

                if (['name', 'perfix'].includes(pluginName)) { continue; }
                if (plugins.includes(pluginName)) { continue; }

                plugins.push(pluginName);
            }

            guildConfigs.get(gID).getCommandLineArgs = getCommandLineArgs;
        }

        // require plugins
        const commands = new Map();
        // require plugins
        const pluginsPath = path.join(__dirname, `./plugins/`);
        if (fs.existsSync(pluginsPath)) {

            // get all js file list 
            for (const file of fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'))) {
                const { name } = path.parse(file);

                if (!plugins.includes(name)) { continue; }
                if (!mainConfig.plugins.includes(name)) { continue; }

                commands.set(name, require(`${pluginsPath}${file}`));

            }
        }



        if (commands.size <= 0) { return null; }

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

        client.mainConfig = mainConfig;
        client.guildConfigs = guildConfigs;
        client.commands = commands;



        // plugins config method
        client.getPluginConfig = function (gID, pluginNname) {
            return this.guildConfigs.get(gID)?.[pluginNname] || null;
            // let guildConfig = this.guildConfigs.get(gID);
            // if (!guildConfig) { return null; }
            // return guildConfig[pluginNname] || null;
        }

        // emit
        // text command
        client.on('messageCreate', async function (message) {
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
                value.execute(message, pluginConfig, command, args, lines);
            }
        });

        client.on('messageDelete', async function (message) {
            if (message.partial) { await message.fetch().catch(() => { }); }

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

        client.on('messageUpdate', async function (oldMessage, newMessage) {

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

        client.on('interactionCreate', async function (interaction) {
            const { message, client } = interaction;
            if (message?.partial) { await message.fetch().catch(() => { }); }

            // Emitted
            for (let [key, value] of client.commands) {
                if (!value.interactionCreate || typeof (value.interactionCreate) != "function") { continue; }

                // get pluginConfig
                let { client, guildId } = message || interaction;
                const pluginConfig = client.getPluginConfig(guildId, key);
                if (!pluginConfig) { continue; }

                value.interactionCreate(interaction, pluginConfig);
            }
        });

        client.on('messageReactionAdd', async function (reaction, user) {
            if (reaction.partial) { await reaction.fetch().catch(() => { }); }
            const { message } = reaction;

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

        client.on('messageReactionRemove', async function (reaction, user) {
            if (reaction.partial) { await reaction.fetch().catch(() => { }); }
            const { message } = reaction;

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
        client.once('ready', async function () {

            // dc bot online
            console.log(`=====${client.mainConfig.botName.padEnd(6, ' ')} is online!=====    setup plugins(${client.commands.size}):`);

            // if (!fs.existsSync("./.env"))
            {
                // const nowDate = new Date(Date.now());
                // const hours = nowDate.getHours().toString().padStart(2, '0');
                // const minutes = nowDate.getMinutes().toString().padStart(2, '0');
                // await channel.send({ content: `<${hours}:${minutes}> ${botName} is online!` })

                const channel = await client.channels.fetch(DEBUG_CHANNEL_ID)
                    .catch((e => { console.log(`[Discord] Can't read channel <#${DEBUG_CHANNEL_ID}>.`, e.message); return null; }));
                if (!channel) { return; }

                const nowHours = new Date(Date.now()).getHours();
                const nowMinutes = new Date(Date.now()).getMinutes();
                const rebooted =
                    ([1, 9, 17].includes(nowHours) && nowMinutes >= 55) ||  // in reboot time
                    ([2, 10, 18].includes(nowHours) && nowMinutes < 5);     // really reboot time
                const bootType = process.env.HOST_TYPE == 'debug' ? EMOJI_BUILDING_CONSTRUCTION : (rebooted ? EMOJI_REBOOTED : EMOJI_HAMMER_AND_WRENCH);
                const nowDate = parseInt(Date.now() / 1000);

                if (!recentlyBootMsg) {
                    recentlyBootMsg = await channel.send({ content: `<t:${nowDate}>  <t:${nowDate}:R> ${EMOJI_VIBRATION}! ${bootType}` }).catch(() => null);

                    if (fs.existsSync("./.env")) {
                        process.on('SIGINT', async () => { await recentlyBootMsg?.delete().catch(() => { }); process.exit(0); });
                        process.on('SIGHUP', async () => { await recentlyBootMsg?.delete().catch(() => { }); process.exit(0); });
                    } else {
                        // github deploy
                        process.on('SIGINT', async () => { await recentlyBootMsg?.react(EMOJI_VIBRATION).catch(() => null); process.exit(0); });
                    }
                    
                } else {
                    recentlyBootMsg = await channel.messages.fetch({ message: recentlyBootMsg.id }).catch(() => null);
                }

                recentlyBootMsg?.react(bootType).catch(e => console.log(`[Discord] Can't send react <${bootType}>.`, e.message));
            }


            // Emitted
            let slashCommands = [];
            for (let [key, value] of client.commands) {

                if (fs.existsSync("./.env")) {
                    console.log(`··${value.name.padEnd(20, ' ')} <${value.description}>`);
                }

                if (!value.setup || typeof (value.setup) != "function") { continue; }

                value.setup(client);

                if (Array.isArray(value.commands)) {
                    slashCommands = slashCommands.concat(value.commands);
                }
            }

            if (!fs.existsSync("./.env")) {
                /* // old version
                await client.application.commands.fetch();
                for (let [key, value] of client.application.commands.cache) { await value.delete(); }    // delete all slash command
                //*/

                // Registering slash commands
                const rest = new Discord.REST().setToken(client.mainConfig.discordToken);
                await rest.put(Discord.Routes.applicationCommands(client.user.id), { body: slashCommands })    // .then(() => console.log('Successfully deleted all application commands.'))
                    .catch(console.error);
            }


            // clock
            const timeoutMethod = function () {
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
        client.once('close', async function () {
            // offline msg
            console.log(`${client.mainConfig.botName} is offline!`);

            clearTimeout(client.interval);

            if (recentlyBootMsg) {
                const channel = await client.channels.fetch(DEBUG_CHANNEL_ID);
                const bootMsg = await channel.messages.fetch({ message: recentlyBootMsg.id });
                bootMsg?.react(EMOJI_PHONE_OFF).catch(e => console.log(console.log(`[Discord] Can't send react <${EMOJI_PHONE_OFF}>.`, e.message)));
            }

            // destroy dc thread
            client.destroy();
        });

        // dc login
        await client.login(client.mainConfig.discordToken).catch(e => console.log(`[Discord] bot init error.`, e.message)); // .then(console.log);

        if (fs.existsSync("./.env")) {
            for (const file of configFiles) {
                const { name } = path.parse(file);
                if (!/^\d+$/.test(name)) { continue; }

                configFormat(client, `${filepath}${file}`);
            }
        }

        // for (let i = 0; i < 10; ++i) { if (recentlyBootMsg) { break; } else { await sleep(500); } }
        return client;
    }
}