const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const express = require('express');

// نظام تشغيل 24 ساعة لـ Render
const app = express();
app.get('/', (req, res) => res.send('System is Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ الإعدادات - تأكد من صحة الآيديات ] ---
const CONFIG = {
    welcomeChannelId: "1479292362675982497", // آيدي روم الترحيب
    autoRoleId: "1479291984836427978",      // آيدي الرتبة التلقائية (المواطن)
    invitedById: "1193908571096756298",     // آيدي الشخص المنشن في الصورة
    prefix: "!",
    // رابط الصورة المباشر الذي أرسلته
    backgroundImage: "https://i.ibb.co/XfZTmbfV/background.png" 
};

// --- [ نظام الترحيب وإعطاء الرتبة ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // 1. محاولة إعطاء الرتبة تلقائياً
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) {
        await member.roles.add(role).catch(err => console.error("فشل إعطاء الرتبة: تأكد أن رتبة البوت أعلى من رتبة العضو"));
    }

    // 2. إرسال الترحيب (صورة Canvas + نص)
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            // تحميل الخلفية من الرابط
            const background = await Canvas.loadImage(CONFIG.backgroundImage);
            const canvas = Canvas.createCanvas(700, 250); // حجم افتراضي مناسب
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // رسم صورة العضو بشكل دائري (على اليمين كما في الصورة)
            ctx.save();
            ctx.beginPath();
            ctx.arc(580, 125, 65, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
            ctx.drawImage(avatar, 515, 60, 130, 130);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

            // إرسال الصورة أولاً ثم النص المطلوب
            await channel.send({ files: [attachment] });
            await channel.send({
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@
