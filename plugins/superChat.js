
const Canvas = require('canvas')

// discord
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const color = {
    blue: ['#1565C0', '#000000'],
    cyan: ['#00B8D4', '#00E5FF'],
    green: ['#00BFA5', '#1DE9B6'],
    yellow: ['#FFB300', '#FFCA28'],
    orange: ['#E65100', '#F57C00'],
    pink: ['#C2185B', '#E91E63'],
    red: ['#D00000', '#E62117'],

    black: '#000000',
    white: '#FFFFFF',
}

const superChat = async ({ iconUrl, username, donate, content }) => {

    const iconSize = 86;
    if (donate < 200) { content = ''; }
    const donateText = `JPY¥ ${new Intl.NumberFormat('ja-JP', { currency: 'JPY' }).format(donate)}`;

    // set color
    let [bgColor, fgColor] = [color.black, color.black];
    let fontColor = color.black;

    switch (true) {
        case donate < 0: { return null; }; break;
        case donate < 200: { [bgColor, fgColor] = color.blue; fontColor = color.white; } break;
        case donate < 500: { [bgColor, fgColor] = color.cyan; } break;
        case donate < 1000: { [bgColor, fgColor] = color.green; } break;
        case donate < 2000: { [bgColor, fgColor] = color.yellow; } break;
        case donate < 5000: { [bgColor, fgColor] = color.orange; fontColor = color.white; } break;
        case donate < 10000: { [bgColor, fgColor] = color.pink; fontColor = color.white; } break;
        case donate >= 10000: { [bgColor, fgColor] = color.red; fontColor = color.white; } break;
        default: {
            console.log(`Sorry, we are out of ${donate}.`);
            return null;
        }
    }

    // set size
    let width = 800;
    let height = 114;
    if (!!content) { height += 68; }

    // Canvas
    let mainCanvas = Canvas.createCanvas(width, height)
    let ctx = mainCanvas.getContext('2d');

    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height)
    if (!!content) {
        ctx.fillStyle = fgColor;
        ctx.fillRect(0, 114, width, height - 114)
    }

    // text
    // username
    ctx.fillStyle = fontColor;
    ctx.font = '200 42px OpenSans'        // ctx.font = '42px helvetica-neue';
    ctx.fillText(username, 115, 55)

    // donate
    ctx.font = '600 34px OpenSans'
    ctx.fillText(donateText, 120, 95)

    // content
    if (!!content) {
        ctx.font = '200 36px OpenSans'
        // ctx.fillText(content, 15, 160)
        ctx.fillText(content, 15, 160)
    }

    // icon image
    // draw circle mask (15, 15) d=iconSize
    const circle = {
        x: 15 + iconSize * 0.5,
        y: 15 + iconSize * 0.5,
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
    name: 'superChat',
    description: "super chat image",

    async execute(message, pluginConfig, command, args, lines) {

        // get config
        const { author } = message;

        if ('sc' != command) { return; }
        const { channel } = message;

        if (!args[0]) { return; }

        const superCharPayload = {
            iconUrl: author.displayAvatarURL({ format: 'png', size: 1024 }).replace(/\.webp/, '.png'), // size: 4096
            username: author.username,
            donate: parseInt(args[0]) || -1,
            content: args[1] || ''
        };
        // const iconUrl = `https://cdn.discordapp.com/avatars/353625493876113440/0b69434e070a29d575737ed159a29224.png?size=256`;
        // const username = `Username`;
        // const donate = 1000000000;
        // const content = `しし🎲🔑`

        const canvas = await superChat(superCharPayload).catch(error => error);
        if (!canvas) { return; }
        // catch error
        if (canvas.message) {
            console.log(canvas)

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setAuthor({
                    name: `${author.username} ${author.toString()}`,
                    iconURL: superCharPayload.iconUrl
                })
                .setDescription(canvas.message);
            channel.send({ embeds: [embed] }).catch(e => console.log(e.message));
        }

        // send 
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'superchat-image.png' });
        channel.send({ files: [attachment] }).catch(e => console.log(e.message));

        return true;
    },
}