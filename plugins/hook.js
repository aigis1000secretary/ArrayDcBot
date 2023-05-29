const Canvas = require('canvas')

// discord
const { EmbedBuilder, AttachmentBuilder, ApplicationCommandOptionType } = require('discord.js');

const hookImage = 'https://cdn.discordapp.com/stickers/1005497001460375702.png';
const hook = async ({ iconUrl }) => {

    const iconSize = 290;

    // set size
    let width = 580;
    let height = 430;

    // Canvas
    let mainCanvas = Canvas.createCanvas(width, height)
    let ctx = mainCanvas.getContext('2d');
    ctx.drawImage(await Canvas.loadImage(hookImage), 0, 0, width, height);

    // icon image
    // draw circle mask (15, 15) d=iconSize
    const circle = {
        x: 282 + iconSize * 0.5,
        y: 33 + iconSize * 0.5,
        radius: iconSize * 0.5,
    }
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // draw icon
    let icon = await Canvas.loadImage(iconUrl);
    // Compute aspectration
    const aspect = icon.height / icon.width;
    // Math.max is ued to have cover effect use Math.min for contain
    const hsx = circle.radius * Math.max(1.0 / aspect, 1.0);
    const hsy = circle.radius * Math.max(aspect, 1.0);
    // x - hsl and y - hsy centers the image
    ctx.drawImage(icon, circle.x - hsx, circle.y - hsy, hsx * 2, hsy * 2);

    return mainCanvas;
}


module.exports = {
    name: 'hook',
    description: "hook image",

    async setup(client) {

        await client.application.commands.fetch();

        // // delete all slash command
        // for (let [key, value] of client.application.commands.cache) {
        //     await value.delete();
        // }

        // registre slash command
        if (!client.application.commands.cache.find(c => c.name == 'hookup')) {
            client.application.commands.create({
                name: 'hookup', description: '夾！',
                options: [{
                    name: 'target', description: "夾誰？",
                    type: ApplicationCommandOptionType.User, required: true,
                }]
            });
        }
    },

    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isCommand()) { return false; }
        if (interaction.commandName != 'hookup') { return false; }

        // check user target
        let tID = interaction.options.data[0].value;
        let target = await interaction.guild.members.fetch({ user: tID });

        // set payload
        const hookPayload = {
            iconUrl: target.displayAvatarURL({ format: 'png', size: 1024 }).replace(/\.webp/, '.png'), // size: 4096
        };

        const canvas = await hook(hookPayload).catch(error => error);
        if (!canvas) { return; }
        // catch error
        if (canvas.message) {
            console.log(canvas)

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setAuthor({
                    name: `${target.user.username} ${target.toString()}`,
                    iconURL: hookPayload.iconUrl
                })
                .setDescription(canvas.message);
            interaction.reply({ content: ' ', embeds: [embed] }).catch(e => console.log(e.message));
            return true;
        }

        // send 
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'hook-image.png' });
        interaction.reply({ content: ' ', files: [attachment] }).catch(e => console.log(e.message));
        // let fileName = `tmp_${Date.now().toString()}ms`;
        // require('fs').writeFileSync(`./tmp/${fileName}.png`, canvas.toBuffer());

        return true;
    },
}