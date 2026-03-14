const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const express = require('express');

// نظام تشغيل 24 ساعة لضمان استقرار البوت على Render
const app = express();
app.get('/', (req, res) => res.send('System is Online ✅'));
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

// --- [ ⚙️ الإعدادات - تأكد من هذه الآيديات ] ---
const CONFIG = {
    welcomeChannelId: "1479292362675982497", // آيدي روم الترحيب
    autoRoleId: "1479291984836427978",      // آيدي رتبة المواطن (الرتبة التلقائية)
    invitedById: "1193908571096756298",     // آيدي الشخص المنشن في الصورة
    prefix: "!",
    backgroundImage: "https://i.ibb.co/XfZTmbfV/background.png" // رابط الصورة الذي أرسلته
};

// --- [ 1. نظام الترحيب وإعطاء الرتبة التلقائية ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // محاولة إعطاء الرتبة تلقائياً
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) {
        await member.roles.add(role).catch(err => console.error("❌ فشل إعطاء الرتبة: تأكد أن رتبة البوت أعلى من رتبة العضو في الإعدادات."));
    }

    // إرسال الترحيب (صورة Canvas + نص)
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            const background = await Canvas.loadImage(CONFIG.backgroundImage);
            const canvas = Canvas.createCanvas(700, 250);
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // رسم صورة العضو بشكل دائري على اليمين كما طلبت
            ctx.save();
            ctx.beginPath();
            ctx.arc(580, 125, 65, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
            ctx.drawImage(avatar, 515, 60, 130, 130);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

            // إرسال الصورة والرسالة النصية المطابقة للمثال
            await channel.send({ 
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`,
                files: [attachment] 
            });

        } catch (e) {
            console.error("❌ خطأ في رسم الصورة:", e);
        }
    }
});

// --- [ 2. نظام البرودكاست المتطور ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ يرجى كتابة الرسالة بعد الأمر.");

    const members = await message.guild.members.fetch();
    const total = members.filter(m => !m.user.bot).size;
    let success = 0;

    let status = await message.channel.send(`⏳ جاري الإرسال لـ **${total}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
        } catch (e) {}
    }

    await status.edit(`✅ تم الإرسال بنجاح لـ **${success}** عضو من أصل **${total}**.`);
});

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول وجاهز للعمل: ${client.user.tag}`);
});

client.login(process.env.TOKEN);
