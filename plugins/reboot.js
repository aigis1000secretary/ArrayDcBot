
// const path = require('path');
const DEBUG_CHANNEL_ID = '826992877925171250';
const EMOJI_REPEAT = '🔁';

let recentlyRebootMsg = null;

module.exports = {
    name: 'reboot',
    description: "reboot command",

    execute(message, pluginConfig, command, args, lines) {

        if (!(command == 'reboot' || (command == 'reboot2' && require('fs').existsSync("./.env")))) { return; }
        if (message.author.id != '353625493876113440') { return; }

        // let filepath = path.join(__dirname, `../index.js`);
        require(`../index.js`).terminate(args[0] == 'force');
        return true;
    },

    async clockMethod(client, { hours, minutes, seconds }) {
        // reboot at time

        // reboot flag
        let reboot = false;


        if (!(minutes == 55 && seconds == 0)) { return; }

        // reboot at 01:55, 09:55, 17:55 (every 8hr)
        if ([1, 9, 17].includes(hours)) { reboot = true; }

        const uptimeInSec = parseInt(client.uptime / 1000);
        const uptimeInHour = (uptimeInSec / 3600).toFixed(1);

        // 8.5hr < uptime < 12.5hr(16-3.5)
        if (30600 < uptimeInSec && uptimeInSec < 45000) { reboot = true; }

        // check uptime, uptime < 3.5hr skip this reboot
        if (uptimeInSec < 12600) { reboot = false; }

        if (reboot) {
            // get log channel            
            let channel = await client.channels.fetch(DEBUG_CHANNEL_ID);

            // log reboot time
            if (channel) {
                // const hours = nowHours.toString().padStart(2, '0');
                // const minutes = nowMinutes.toString().padStart(2, '0');
                // await channel.send({ content: `<${hours}:${minutes}> BOT reboot!` });

                const nowDate = parseInt(Date.now() / 1000);
                let content = `<t:${nowDate}>  <t:${nowDate}:R> ${EMOJI_REPEAT}! \`\`Uptime: ${uptimeInHour} hr\`\``;

                let rebootMsg = recentlyRebootMsg ? (await channel.messages.fetch({ message: recentlyRebootMsg })) : null;
                if (rebootMsg) {
                    // delete old reboot log
                    content = ((rebootMsg.content || '') + '\n' + content).trim();
                    await rebootMsg.delete().catch(() => { });
                }

                // send new reboot log
                rebootMsg = await channel.send({ content }).catch(() => { });
                recentlyRebootMsg = rebootMsg?.id;
            }
            // reboot
            console.log(`=====BOT reboot!=====`);
            require('../index.js').terminate();
        } else { { return; } }
    },


}