const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('System HD Online 🍊'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚙️ الإعدادات ] ---
const CONFIG = {
    prefix: "!",
    welcomeChannelId: "1467260591767949609",
    autoRoleId: "1479291984836427978", // رتبة المواطن (موجودة ✅)
    invitedById: "1193908571096756298"
};

let antiSpam = new Set();

// --- [ 1. نظام إضافة الرتبة + الترحيب ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // منع التكرار (رسالة واحدة فقط)
    if (antiSpam.has(member.id)) return;
    antiSpam.add(member.id);
    setTimeout(() => antiSpam.delete(member.id), 10000); 

    // أ- إضافة الرتبة التلقائية (تمت الإضافة ✅)
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) {
        await member.roles.add(role).catch(err => console.log("خطأ في الرتبة: تأكد من رفع رتبة البوت فوق رتبة المواطن."));
    }

    // ب- إرسال الترحيب بصورة HD
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            const background = await Canvas.loadImage(path.join(__dirname, 'background.png'));
            const canvas = Canvas.createCanvas(background.width, background.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            const radius = 75; 
            const centerX = canvas.width / 2; 
            const centerY = 145; 

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-hd.png' });

            await channel.send({ files: [attachment] });
            await channel.send({ 
                content: `**| - Welcome To SYNC RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`
            });
        } catch (e) { console.error("تأكد من وجود background.png"); }
    }
});

// --- [ 2. نظام البرودكاست (الخاص)  ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة للإرسال في الخاص!");

    const members = await message.guild.members.fetch();
    let success = 0;
    let status = await message.channel.send(`⏳ جاري الإرسال للجميع...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**سيرفر: ${message.guild.name}**`);
            success++;
        } catch (e) {}
    }
    await status.edit(`✅ تم الإرسال لـ ${success} عضو بنجاح.`);
});

client.login(process.env.TOKEN);
