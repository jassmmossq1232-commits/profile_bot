const { Client, GatewayIntentBits, Partials, Events, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const express = require('express');

// نظام تشغيل 24 ساعة ومنع التكرار
const app = express();
app.get('/', (req, res) => res.send('Bot HD is Active ✅'));
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

// --- [ ⚙️ الإعدادات - تأكد من صحة الآيديات ] ---
const CONFIG = {
    prefix: "!",
    welcomeChannelId: "1479292362675982497", 
    autoRoleId: "1479291984836427978",      
    invitedById: "1193908571096756298",     
    backgroundImage: "https://i.ibb.co/XfZTmbfV/background.png" 
};

// متغير لمنع التكرار اللحظي
let lastMemberId = null;

client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;
    
    // حل مشكلة إرسال رسالتين: التأكد من أن العضو لم يتم الترحيب به قبل ثانية
    if (lastMemberId === member.id) return;
    lastMemberId = member.id;
    setTimeout(() => { lastMemberId = null; }, 5000);

    // 1. إضافة الرتبة
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) await member.roles.add(role).catch(() => {});

    // 2. إرسال الترحيب بجودة HD
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        try {
            // استخدام أبعاد أفقية 800x400 لضمان أعلى وضوح في ديسكورد
            const canvas = Canvas.createCanvas(800, 400); 
            const ctx = canvas.getContext('2d');
            
            // رسم الخلفية السوداء والنص يدوياً لضمان النقاء (HD)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = 'bold 60px sans-serif';
            ctx.fillStyle = '#C5A059'; 
            ctx.textAlign = 'center';
            ctx.fillText('COMING SOON', canvas.width / 2, canvas.height / 2 + 50);

            // رسم صورة العضو الشخصية
            const radius = 85;
            const centerX = 650; 
            const centerY = 150; 

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-hd.png' });

            // إرسال الصورة والرسالة في رسالة واحدة مدمجة لمنع التكرار
            await channel.send({ 
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`,
                files: [attachment] 
            });

        } catch (e) { console.error(e); }
    }
});

// --- [ نظام البرودكاست المطور ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة!");

    const members = await message.guild.members.fetch();
    let success = 0;
    let status = await message.channel.send(`⏳ جاري الإرسال...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**سيرفر: ${message.guild.name}**`);
            success++;
        } catch (e) {}
    }
    await status.edit(`✅ تم الإرسال لـ ${success} عضو.`);
});

client.once('ready', () => console.log(`✅ ${client.user.tag} Online HD!`));
client.login(process.env.TOKEN);
