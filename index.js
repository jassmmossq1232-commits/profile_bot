const { Client, GatewayIntentBits, Partials, Events, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('System Online ✅'));
app.listen(process.env.PORT || 10000); // المنفذ الصحيح لـ Render

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.GuildMember, Partials.User],
});

const CONFIG = {
    welcomeChannelId: "1479292362675982497",
    invitedById: "1193908571096756298"
};

client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!channel) return;

    try {
        // تحديد المسار بدقة لضمان قراءة ملف background.png
        const imagePath = path.resolve(__dirname, 'background.png');
        const background = await Canvas.loadImage(imagePath);
        
        // استخدام أبعاد صورتك العمودية الأصلية 100%
        const canvas = Canvas.createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // وضع صورة العضو في الزاوية العلوية (المكان الأسود)
        const radius = 65;
        const centerX = canvas.width - radius - 55; // يمين
        const centerY = radius + 60;               // أعلى

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
        ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-hd.png' });

        // الترتيب: الصورة أولاً ثم النص
        await channel.send({ files: [attachment] });
        await channel.send({ 
            content: `**| - Welcome To SYNC RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@${CONFIG.invitedById}>`
        });

    } catch (e) {
        console.error("فشل العثور على الصورة، تأكد من وجود background.png:", e.message);
    }
});

client.login(process.env.TOKEN);
