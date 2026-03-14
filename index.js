const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const express = require('express');

// نظام تشغيل 24 ساعة لـ Render
const app = express();
app.get('/', (req, res) => res.send('Bot Online ✅'));
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

// --- [ ⚙️ الإعدادات - تأكد من الآيديات ] ---
const CONFIG = {
    prefix: "!",
    welcomeChannelId: "1479292362675982497", 
    autoRoleId: "1479291984836427978",      
    invitedById: "1193908571096756298",     
    backgroundImage: "https://i.ibb.co/XfZTmbfV/background.png" 
};

// --- [ 1. نظام الترحيب والرتبة التلقائية ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // إعطاء الرتبة تلقائياً (المواطن)
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) await member.roles.add(role).catch(() => console.log("فشل إضافة الرتبة"));

    // إرسال صورة الترحيب بالأبعاد المطلوبة (738x916)
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            const background = await Canvas.loadImage(CONFIG.backgroundImage);
            const canvas = Canvas.createCanvas(738, 916); 
            const ctx = canvas.getContext('2d');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // إحداثيات صورة العضو الشخصية
            const radius = 95;
            const centerX = 540; 
            const centerY = 240; 

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 512 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
            
            // نص الترحيب المطابق لطلبك السابق
            await channel.send({ 
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`,
                files: [attachment] 
            });
        } catch (e) { console.error("Welcome Error:", e); }
    }
});

// --- [ 2. نظام البرودكاست (الإرسال للخاص مع تقرير) ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة التي تريد إرسالها للجميع.");

    const members = await message.guild.members.fetch();
    const totalMembers = members.filter(m => !m.user.bot).size;
    let success = 0;
    let failed = 0;

    let status = await message.channel.send(`⏳ جاري بدء الإرسال لـ **${totalMembers}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
            // تحديث الرسالة كل 5 أشخاص لمتابعة العدد
            if (success % 5 === 0) await status.edit(`⏳ جاري الإرسال... (تم: ${success} | فشل: ${failed})`);
        } catch (e) {
            failed++;
        }
    }
    await status.edit(`✅ **انتهى البرودكاست!**\n\n👥 الإجمالي: \`${totalMembers}\`\n✅ ناجح: \`${success}\`\n❌ فشل (خاص مغلق): \`${failed}\``);
});

client.once('ready', () => console.log(`✅ ${client.user.tag} جاهز (ترحيب + رتبة + برودكاست)`));
client.login(process.env.TOKEN);
