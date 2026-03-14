const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const express = require('express');

// نظام تشغيل البوت 24 ساعة
const app = express();
app.get('/', (req, res) => res.send('System Online ✅'));
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
    welcomeChannelId: "1479292362675982497", // روم الترحيب
    autoRoleId: "1479291984836427978",      // رتبة المواطن
    invitedById: "1193908571096756298"      // الشخص الداعي
};

// نظام مانع التكرار (Anti-Spam) لضمان عدم إرسال رسالتين
let antiSpam = new Set();

// --- [ 1. نظام إضافة الرتبة + الترحيب ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // منع التكرار اللحظي
    if (antiSpam.has(member.id)) return;
    antiSpam.add(member.id);
    setTimeout(() => antiSpam.delete(member.id), 10000);

    // أ- إضافة الرتبة تلقائياً
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) await member.roles.add(role).catch(() => console.log("فشل إضافة الرتبة"));

    // ب- إرسال الترحيب (صورة HD أولاً ثم نص)
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            // سحب الصورة من ملفاتك مباشرة لضمان أعلى جودة
            const background = await Canvas.loadImage(path.join(__dirname, 'background.png'));
            const canvas = Canvas.createCanvas(background.width, background.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // رسم دائرة الصورة الشخصية
            const radius = 65;
            const centerX = canvas.width - radius - 60;
            const centerY = radius + 60;

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

            // إرسال الصورة أولاً
            await channel.send({ files: [attachment] });
            
            // إرسال النص تحتها مباشرة
            await channel.send({ 
                content: `**| - Welcome To SYNC RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`
            });
        } catch (e) { console.error("تأكد من رفع ملف background.png بجانب index.js"); }
    }
});

// --- [ 2. نظام البرودكاست (الخاص) ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة التي تريد إرسالها للجميع.");

    const members = await message.guild.members.fetch();
    let success = 0;
    let status = await message.channel.send(`⏳ جاري إرسال البرودكاست...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
        } catch (e) {}
    }
    await status.edit(`✅ تم الإرسال لـ ${success} عضو بنجاح.`);
});

client.once('ready', () => console.log(`✅ ${client.user.tag} جاهز بجميع الأنظمة!`));
client.login(process.env.TOKEN);
