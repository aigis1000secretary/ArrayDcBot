const [EMOJI_RECYCLE, EMOJI_ENVELOPE_WITH_ARROW] = ['♻️', '📩'];
const dlsiteIcon = 'https://media.discordapp.net/attachments/947064593329557524/1156438574997184562/RBIlIWRJ2HEHkWiTV4ng_gt_icon020.png';

// const fs = require('fs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits, ButtonStyle } = require('discord.js');

// web crawler
const debugGet = async (args) => {
    let res = await utilGet(args);
    console.log(args.url);
    console.log(`statusCode:`, res?.statusCode, !!res?.body);
    return res;
}
const utilGet = require('util').promisify(require('request').get);
let get = utilGet;
const cheerio = require("cheerio");

const indexReg = /([RBV]J\d{6,})/i;

const getDLsiteAjax = async (index) => {

    let res, url;
    try {
        // request
        url = `https://www.dlsite.com/home/product/info/ajax?product_id=${index}`;
        res = await get({ url, json: true });
        if (res?.statusCode == 200 && !!res?.body && !!res.body[index]) { return res; }

        // retry for proxy
        url = `https://dl.xn--4qs.club/home/product/info/ajax?product_id=${index}`;
        res = await get({ url, json: true });
        if (res?.statusCode == 200 && !!res?.body && !!res.body[index]) { return res; }

    } catch (e) { }

    return null;
}
const getDLsiteWork = async (host, siteID, index) => {

    let res, url;
    try {
        // request
        url = `https://${host}/${siteID}/announce/=/product_id/${index}.html`;
        res = await get({ url });
        if (res?.statusCode == 200 && !!res?.body) { return res; }

        // retry for work type
        url = `https://${host}/${siteID}/work/=/product_id/${index}.html`;
        res = await get({ url });
        if (res?.statusCode == 200 && !!res?.body) { return res; }

    } catch (e) { }

    return null;
}
const getDLsiteHtml = async (index) => {

    let ajax = await getDLsiteAjax(index);
    if (!ajax) { return null; }
    let host = ajax.req.host;
    let siteID = ajax.body[index].site_id || 'work';

    let res = await getDLsiteWork(host, siteID, index);
    if (!!res) { return res; }

    if (host != 'dl.xn--4qs.club') {
        res = await getDLsiteWork('dl.xn--4qs.club', siteID, index);
        if (!!res) { return res; }
    }

    return null;
}
const getDLsiteMakerPage = async (makerUrl) => {

    try {
        // request
        const url = makerUrl.replace('=/', '=/per_page/100/');
        let res = await get({ url });

        if (res?.statusCode == 200 && !!res?.body) {
            // let [, mIndex] = url.match(/(RG\d{5})/);
            // fs.writeFileSync(`./${mIndex}.html`, req.body);  // save data

            // load html body
            let html = req.body;
            let $ = cheerio.load(html);
            let result = {};

            let ele = $(`.search_result_img_box_inner > div[data-product_id=${index}]`).eq(0).prev();
            result.price = ele.find('.work_price_wrap .work_price').eq(0).text().trim();
            result.strike = ele.find('.work_price_wrap .strike').eq(0).text().trim();
            result.point = ele.find('.work_price_wrap .work_point').eq(0).text().trim();
            result.deals = ele.children('.work_deals').eq(0).text().trim();

            return result;
        }

    } catch (e) { }

    return null;
}

const getDLsitePage = async (index) => {
    // result object
    let result = { index };

    // get html
    let raw = await getDLsiteHtml(index);
    if (!raw) { return null; }
    result.url = `https://www.dlsite.com${raw.req.path}`;

    // load html body
    let html = raw.body;
    let $ = cheerio.load(html);
    // DOM
    let elements;

    // price
    elements = $('#right .work_buy_content .price');
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let temp = ele.text().trim();
        if (!temp || temp[0] == '{') { continue; }
        result.price = temp;
    }

    // schedule
    elements = $('#right .work_buy_content .work_date_ana');
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let temp = ele.text().trim();
        if (!temp || temp[0] == '{') { continue; }
        result.schedule = temp;
    }

    // images
    result.thumb = [];
    elements = $(".product-slider-data div");
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let temp = ele.attr('data-src');
        if (!temp) { continue; }
        result.thumb.push(`https:${temp}`);
    }
    if (result.thumb.length == 0) {
        elements = $("script");
        for (let i = 0; i < elements.length; i++) {
            const ele = elements.eq(i);

            let temp = ele.html();
            if (!temp || !temp.includes('var contents')) { continue; }

            try { eval(temp.replace('var contents', 'temp')); } catch (error) { temp = null; }
            if (!temp || !temp.detail[0] || !temp.detail[0].image_main) { continue; }

            [, temp] = temp.detail[0].image_main.match(/([RBV]J\d{6,})_img/) || [, null];
            if (!temp || temp == index) { continue; }

            temp = await getDLsitePage(temp);
            if (!temp) { continue; }

            result.thumb = temp.thumb;
            break;
        }
    }

    // title
    elements = $("#work_name");
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let temp = ele.html();
        if (!temp) { continue; }
        result.title = temp;
    }

    // maker
    result.table = [];
    elements = $("#work_right_inner tr");
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let thText = ele.find("th")?.text()?.trim() || null; // 1. 取得 th 的文字
        let body = [];
        ele.find("td a").each((index, a) => {
            let text = $(a).text().trim();
            let href = $(a).attr("href");
            if (['フォローする'].includes(text)) { return; }
            else if (['サークル名', '作者', 'シリーズ名'].includes(thText)) { body.push(`[${text}](${href})`); }
            else { body.push(text); }
        });
        let tdText = ele.find("td")?.text()?.trim() || null; // 2. 取得 td 的文字
        if (body.length == 0) { body.push(tdText); }

        result.table.push([thText, body]);
    }

    // maker url
    elements = $("#work_maker a");
    for (let i = 0; i < elements.length; i++) {
        const ele = elements.eq(i);

        let temp = ele.attr('href');
        if (!temp) { continue; }
        result.makerUrl = temp;
        break;
    }

    // check price again from maker page
    let makerPage = await getDLsiteMakerPage(result.makerUrl);
    if (makerPage) {
        result.price = makerPage.price || result.price;
        result.strike = makerPage.strike || result.strike;
        result.point = makerPage.point || result.point;
        result.deals = makerPage.deals || result.deals;
    }

    return result;
}

const createDLsitePageMessage = (result, imageIndex = 0, rich = true) => {

    // build result embed
    // let description = '';
    let field0 = [];
    let field1 = [];
    let field2 = [];
    let field3 = 'null';

    if (result.schedule) {
        field0.push(`発売予定日：\n-# ${result.schedule.replace(/(\d{4})年(\d{2})月(\d{2})日(?!中旬)/g, "$1/$2/$3")}`);
        field0.push(`予定価格：\n-# ${result.price}`);
    } else {
        field0.push(`価格：\n-# ${result.price}`);
    }
    if (result.strike) { field0.push(`　　~~${result.strike}~~`); } // 原価
    if (result.deals || result.point) {
        let des = '```css '
        if (result.deals) { des += ` [${result.deals}]`; }
        if (result.point) { des += ` ${result.point}還元`; }
        des += '```';
        field0.push(des);
    }

    for (let [head, body] of result.table) {
        let des = `${head}：\n-# ${body.join(' ')}`;
        if (/\d{4}年\d{2}月\d{2}日/.test(des)) {
            des = des.replace(/(\d{4})年(\d{2})月(\d{2})日(?!中旬)/g, "$1/$2/$3");
        }

        if ([`予告開始日`, `販売日`, `ブランド名`, `サークル名`, `作者`].includes(head)) {
            field0.push(des);

        } else if ([`シナリオ`, `イラスト`, `声優`, `音楽`, `シリーズ名`].includes(head)) {
            field1.push(des);

        } else if (head == `ジャンル`) {
            field3 = `-# ${body.join(', ')}`;

        } else {
            field2.push(des);
        }
    }

    imageIndex = Math.min(Math.max(imageIndex, 0), result.thumb.length - 1);

    const embed0 = new EmbedBuilder()
        .setColor('#010d85')
        .setTitle(`${result.title} [${result.index}]`)
        .setURL(result.url)
        // .setDescription(description)
        // .setThumbnail(dlsiteIcon)
        .setImage(result.thumb[imageIndex] || null);
    // embed0.data.type = 'rich';
    // embed0.data.url = result.url;  

    embed0.addFields({ name: '　', value: field0.join('\n'), inline: true });
    embed0.addFields({ name: '　', value: field1.join('\n'), inline: true });
    embed0.addFields({ name: '　', value: field2.join('\n'), inline: true });
    embed0.addFields({ name: 'ジャンル', value: field3, inline: false });

    let embeds = [embed0];
    for (let i = 1; i < 4; ++i) {
        let ii = imageIndex + i;
        if (ii >= result.thumb.length) { break; }

        const embed = new EmbedBuilder().setImage(result.thumb[ii]);

        // embed0.data.type = 'rich';
        // embed0.data.url = result.url;
        embed.setColor('#010d85')
        if (rich) { embed.setURL(result.url); }

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

    return { content: ' ', embeds, components: [actionRow] };
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
        let embed = new EmbedBuilder().setDescription(`Loading ${index.toUpperCase()}...`);
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

        } else {
            // check manager permissions
            if (!permissions.has(PermissionFlagsBits.ManageMessages)) {
                console.log(`Missing Permissions: MANAGE_MESSAGES ${message.channel.toString()} <@${message.client.user.id}>`);
                return true;
            } else {
                message.suppressEmbeds(true).catch(() => { });
            }
        }

        return true;
    },

    async messageReactionAdd(reaction, user, pluginConfig) {
        // skip bot reaction
        if (user.bot) { return; }

        // skip other emoji
        if (![EMOJI_ENVELOPE_WITH_ARROW].includes(reaction.emoji.toString())) { return; }

        // get msg data
        const { message } = reaction;

        // EMOJI_ENVELOPE_WITH_ARROW
        if (reaction.emoji.name == EMOJI_ENVELOPE_WITH_ARROW) {

            let [embed] = message.embeds || [{ fields: [] }];
            if (!indexReg.test(embed?.footer?.text || '')) { return; }

            let productID = embed.footer.text;

            const _msg = {
                channel: message.channel,
                member: message.member,
                author: message.author,
                suppressEmbeds: () => { }
            }

            module.exports.execute(_msg, pluginConfig, productID, [], [])
            return;
        }

        return;
    },

    async interactionCreate(interaction, pluginConfig) {
        // command type
        if (!interaction.isButton()) { return false; }
        if (!interaction.customId.startsWith("dlThumb")) { return false; }

        // get button parameter
        const { message } = interaction;

        // mute reply
        // interaction.reply({ content: ' ' }).catch(() => { });
        interaction.deferReply({ ephemeral: true }).then(({ interaction }) => interaction.deleteReply()).catch(() => { });


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


        const rich = !(message.reactions.cache.get(EMOJI_ENVELOPE_WITH_ARROW)?.count);

        // create Message Payload
        let messagePayload = createDLsitePageMessage(result, imageIndex, rich);
        // edit message
        message.edit(messagePayload).catch(console.log);
        return true;
    },

    debug() {
        get = (get == debugGet ? utilGet : debugGet);
    }
}