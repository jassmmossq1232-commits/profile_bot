const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const express = require('express');

// نظام تشغيل 24 ساعة لـ Render ومنع التكرار
const app = express();
app.get('/', (req, res) => res.send('Bot Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚙️ الإعدادات - تأكد من صحة الآيديات ] ---
const CONFIG = {
    prefix: "!",
    welcomeChannelId: "1479292362675982497", // آيدي روم الترحيب
    autoRoleId: "1479291984836427978",      // آيدي رتبة المواطن
    invitedById: "1193908571096756298",     // آيدي الشخص المنشن
};

// متغير لمنع التكرار نهائياً
let lastMemberId = null;

// --- [ 1. نظام الترحيب بالصورة أولاً ثم النص عالي الوضوح ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // حل مشكلة تكرار الإرسال
    if (lastMemberId === member.id) return;
    lastMemberId = member.id;
    setTimeout(() => { lastMemberId = null; }, 5000);

    // إضافة الرتبة التلقائية (المواطن)
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) await member.roles.add(role).catch(() => console.log("Role Error"));

    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            // إنشاء لوحة رسم بأبعاد أفقية قياسية للوضوح (800x400) لضمان عدم ضغط الصورة
            const canvas = Canvas.createCanvas(800, 400); 
            const ctx = canvas.getContext('2d');
            
            // رسم خلفية سوداء نقية مصقولة بدقة
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // إضافة نص COMING SOON باللون الذهبي المطابق ( HD)
            ctx.font = 'bold 50px sans-serif';
            ctx.fillStyle = '#C5A059'; // لون ذهبي مطابق للمثال
            ctx.textAlign = 'center';
            ctx.fillText('COMING SOON', canvas.width / 2, canvas.height / 2 + 120);

            // رسم صورة العضو بشكل دائري عالي الدقة على اليمين
            const radius = 80;
            const centerX = canvas.width - radius - 50; 
            const centerY = radius + 50; 

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            // سحب الصورة بأعلى جودة (size: 512) لضمان النقاء
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-hd.png' });

            // ⚠️ التعديل الجوهري: إرسال الصورة أولاً
            await channel.send({ files: [attachment] });

            // ⚠️ التعديل الجوهري: إرسال النص المطابق لطلبك بعد الصورة
            await channel.send({ 
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`
            });

        } catch (e) {
            console.error("Welcome Error:", e);
        }
    }
});

// --- [ 2. نظام البرودكاست المطور (للخاص مع تقرير) ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة!");

    const members = await message.guild.members.fetch();
    const totalMembers = members.filter(m => !m.user.bot).size;
    let success = 0;
    let failed = 0;

    let status = await message.channel.send(`⏳ جاري الإرسال لـ **${totalMembers}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
            if (success % 10 === 0) await status.edit(`⏳ جاري الإرسال... (تم: ${success} | فشل: ${failed})`);
        } catch (e) {
            failed++;
        }
    }
    await status.edit(`✅ **انتهى البرودكاست!**\n\n👥 الإجمالي: \`${totalMembers}\`\n✅ ناجح: \`${success}\`\n❌ فشل (خاص مغلق): \`${failed}\``);
});

client.once('ready', () => console.log(`✅ ${client.user.tag} Online HD Welcome!`));
client.login(process.env.TOKEN);
