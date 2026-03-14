const { Client, GatewayIntentBits, Partials, Events, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const express = require('express');

// نظام تشغيل البوت 24 ساعة
const app = express();
app.get('/', (req, res) => res.send('Welcome System HD Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // ضروري جداً لرصد دخول الأعضاء
    ],
    partials: [Partials.User, Partials.GuildMember],
});

// --- [ الإعدادات ] ---
const CONFIG = {
    welcomeChannelId: "1467260591767949609", // ايدي روم الترحيب
    invitedById: "1272279633341059146"       // ايدي الشخص الداعي
};

// نظام مانع التكرار لضمان إرسال رسالة واحدة فقط
let antiSpam = new Set();

client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // منع التكرار اللحظي
    if (antiSpam.has(member.id)) return;
    antiSpam.add(member.id);
    setTimeout(() => antiSpam.delete(member.id), 10000); 

    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!channel) return;

    try {
        // 1. تحميل الخلفية من ملفات البوت لضمان الجودة الأصلية HD
        // ملاحظة: يجب أن يكون اسم ملف الصورة في GitHub هو background.png
        const background = await Canvas.loadImage(path.join(__dirname, 'background.png'));
        
        // إنشاء الكانفاس بنفس أبعاد الصورة العمودية الأصلية
        const canvas = Canvas.createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        
        // رسم الخلفية
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // 2. ضبط صورة العضو في الزاوية العلوية اليمنى (المنطقة الفارغة)
        const radius = 65; // حجم الدائرة
        const centerX = canvas.width - radius - 50; // إزاحة من اليمين
        const centerY = radius + 50;               // إزاحة من الأعلى

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        // جلب صورة العضو بدقة 512
        const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
        ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-hd.png' });

        // 3. الترتيب: إرسال الصورة أولاً
        await channel.send({ files: [attachment] });
        
        // 4. إرسال النص تحت الصورة مباشرة
        await channel.send({ 
            content: `**| - Welcome To SYNC RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`
        });

    } catch (e) {
        console.error("خطأ: تأكد من رفع ملف الصورة باسم background.png في GitHub بجانب index.js");
    }
});

client.login(process.env.TOKEN);
