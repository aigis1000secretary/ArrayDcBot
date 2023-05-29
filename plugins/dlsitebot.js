const [EMOJI_RECYCLE] = ['♻️']

// const fs = require('fs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits, ButtonStyle } = require('discord.js');

// web crawler
const get = require('util').promisify(require('request').get);
const cheerio = require("cheerio");

const indexReg = /([RBV]J\d{6,})/i;

const getDLsitePage = async (index) => {
    let req, url;

    try {
        url = `https://www.dlsite.com/home/announce/=/product_id/${index}.html`;

        // request
        req = await get({ url });
        // retry
        if (req.body && req.statusCode != 200) {
            url = url.replace('announce', 'work')
            req = await get({ url });
        };
        if (!req.body || req.statusCode != 200) return null;
        // fs.writeFileSync(`./${index}.html`, req.body);  // save data

        let result = { index, url };

        // load html body
        let html = req.body;
        let $ = cheerio.load(html);
        let res;

        // price
        res = $('#right .work_buy_content .price');
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.text().trim();
            if (!temp || temp[0] == '{') { continue; }
            result.price = temp;
        }

        // schedule
        res = $('#right .work_buy_content .work_date_ana');
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.text().trim();
            if (!temp || temp[0] == '{') { continue; }
            result.schedule = temp;
        }

        // images
        result.thumb = [];
        res = $(".product-slider-data div");
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.attr('data-src');
            result.thumb.push(`https:${temp}`);
        }

        // title
        res = $("#work_name");
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.html();
            result.title = temp;
        }

        // maker
        result.table = [];
        res = $("#work_right_inner tr");
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.html().replace(/(\<[^\>]+\>)+/g, '\n').trim().split(/\s+/);
            let head = temp.shift();
            let body = temp.join(' ').replace('&nbsp;', ' ');
            if (head == 'サークル名') { body = body.replace(' フォローする', ''); }
            result.table.push([head, body]);
        }

        // maker url
        res = $("#work_maker a");
        for (let i = 0; i < res.length; i++) {
            const ele = res.eq(i);

            let temp = ele.attr('href');
            result.makerUrl = temp;
        }

        // check price again from maker page
        url = result.makerUrl.replace('=/', '=/per_page/100/');
        req = await get({ url });
        if (req.body && req.statusCode == 200) {
            // let [, mIndex] = url.match(/(RG\d{5})/);
            // fs.writeFileSync(`./${mIndex}.html`, req.body);  // save data

            // load html body
            let html = req.body;
            let $ = cheerio.load(html);

            let ele = $(`.search_result_img_box_inner > div[data-product_id=${index}]`).eq(0).prev();
            result.price = ele.find('.work_price_wrap .work_price').eq(0).text().trim() || result.price;
            result.strike = ele.find('.work_price_wrap .strike').eq(0).text().trim();
            result.point = ele.find('.work_price_wrap .work_point').eq(0).text().trim();
            result.deals = ele.children('.work_deals').eq(0).text().trim();
        }

        return result;
    } catch (e) {
        console.log(`statusCode = ${req.statusCode}`);
        console.log(e);

        if (req.body) {
            let html = req.body;
            let [, title] = (temp = html.match(/\<title\>(.*)\<\/title\>/)) ? temp : [, null];
            if (title) {
                console.log(`title= ${title}`);
                return null;
            }
        }
        return null;
    }
}

const createDLsitePageMessage = (result, imageIndex = 0) => {

    // build result embed
    let description = '';
    if (result.schedule) {
        description += `発売予定日： ${result.schedule}`;
        description += `\n**予定価格： ${result.price}**`;
    } else {
        description += `**価格： ${result.price}**`;
    }
    if (result.strike) { description += `　  ~~${result.strike}~~`; } // 原価
    if (result.deals || result.point) {
        description += '```css\n'
        if (result.deals) { description += ` [${result.deals}]`; }
        if (result.point) { description += ` ${result.point}還元`; }
        description += '```';
    }
    for (let pair of result.table) {
        if (pair[0] == 'サークル名') {
            description += `\n${pair[0]}： [${pair[1]}](${result.makerUrl})`;
            continue;
        }
        description += `\n${pair[0]}： ${pair[1]}`;
    }

    imageIndex = Math.min(Math.max(imageIndex, 0), result.thumb.length - 1);

    const embed0 = new EmbedBuilder()
        .setColor('#010d85')
        .setTitle(`${result.title} [${result.index}]`)
        .setURL(result.url)
        .setDescription(description)
        .setThumbnail(result.thumb[imageIndex] || null)
        .setImage(result.thumb[imageIndex] || null);
    embed0.data.type = 'rich';
    embed0.data.url = result.url;

    let embeds = [embed0];
    for (let i = 1; i < 4; ++i) {
        let ii = imageIndex + i;
        if (ii >= result.thumb.length) { break; }

        const embed = new EmbedBuilder().setImage(result.thumb[ii]);
        embed.data.type = 'rich';
        embed.data.url = result.url;
        embeds.push(embed);
    }

    // image switch button
    // get last img tag
    let disabled = (result.thumb.length <= 1);

    let actionRow =
        new ActionRowBuilder()
            .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(disabled)
                .setCustomId("dlThumbMain").setLabel("|<")
            )
            .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(disabled)
                .setCustomId("dlThumbPrve").setLabel("<<")
            )
            .addComponents(new ButtonBuilder().setStyle(result.schedule ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setCustomId("dlThumbNumb").setLabel(`${imageIndex + 1}/${result.thumb.length}`)
            )
            .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(disabled)
                .setCustomId("dlThumbNext").setLabel(">>")
            )
            .addComponents(new ButtonBuilder().setStyle(ButtonStyle.Primary).setDisabled(disabled)
                .setCustomId("dlThumbLast").setLabel(">|")
            );

    return { embeds, components: [actionRow] };
}


module.exports = {
    name: 'DLsiteBot',
    description: "get dl page data",

    async execute(message, pluginConfig, command, args, lines) {

        // check index code
        if (!command) { return false; }
        if (!indexReg.test(command)) { return false; }
        let [, index] = command.match(indexReg);

        // get permissions
        let permissions = message.channel.permissionsFor(message.member.guild.members.me);
        // check permissions
        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
            console.log('Missing Permissions: SEND_MESSAGES');
            return false;
        }
        if (!permissions.has(PermissionFlagsBits.EmbedLinks)) {
            console.log('Missing Permissions: EMBED_LINKS');
            message.channel.send({ content: 'Missing Permissions: EMBED_LINKS' });
            return false;
        }

        // keep message space
        let embed = new EmbedBuilder().setDescription('Loading...');
        let replyMsg = await message.channel.send({ embeds: [embed] }).catch(console.log);

        // download dlsite page
        let result = await getDLsitePage(index.toUpperCase());
        if (!result) {
            embed = new EmbedBuilder().setColor('#FF0000').setDescription('Data Error!');
            await replyMsg.edit({ embeds: [embed] }).catch(console.log);
            setTimeout(() => replyMsg.delete().catch(() => { }), 30000);
            return false;
        }

        // create Message Payload
        let messagePayload = createDLsitePageMessage(result);
        await replyMsg.edit(messagePayload).catch(console.log);
        if (message.author.bot) {
            replyMsg.react(EMOJI_RECYCLE).catch(() => { });
            message.delete().catch(() => { });
            return true;
        }

        // check manager permissions
        if (!permissions.has(PermissionFlagsBits.ManageMessages)) {
            console.log('Missing Permissions: MANAGE_MESSAGES');
            return true;
        } else {
            message.suppressEmbeds(true).catch(() => { });
        }

        return true;
    },

    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isButton()) { return false; }
        if (!interaction.customId.startsWith("dlThumb")) { return false; }

        // get button parameter
        const { message } = interaction;

        // mute reply
        interaction.reply({ content: ' ' }).catch(() => { });

        // get RJ index
        const embed = message.embeds[0];
        let [, index] = embed.url.match(indexReg);

        // download dlsite page
        let result = await getDLsitePage(index.toUpperCase());
        if (!result) { return false; }

        // get image index
        const btn = message.components[0].components.find(btn => btn.customId.startsWith('dlThumbNum'));
        let [, imageIndex, imageLength] = btn.label.match(/(\d+)\/(\d+)/);
        imageIndex -= 1; imageLength = Number(imageLength);
        switch (interaction.customId) {
            case "dlThumbMain": { imageIndex -= 4; } break;
            case "dlThumbPrve": { imageIndex -= 1; } break;
            case "dlThumbNext": { imageIndex += 1; } break;
            case "dlThumbLast": { imageIndex += 4; } break;
        }
        imageIndex = Math.min(Math.max(imageIndex, 0), imageLength - 1);

        // create Message Payload
        let messagePayload = createDLsitePageMessage(result, imageIndex);
        // edit message
        message.edit(messagePayload).catch(console.log);
        return false;
    }
}