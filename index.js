const { Client, GatewayIntentBits, Partials, Events, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('System Online ✅'));
app.listen(process.env.PORT || 10000);

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
        // قراءة الصورة بطريقة تضمن عدم حدوث Input Stream Error
        const imagePath = path.join(__dirname, 'background.png');
        
        // محاولة تحميل الصورة المحلية، وإذا فشلت يستخدم رابط خارجي (عشان تضمن إنه يرسل)
        const background = await Canvas.loadImage(imagePath).catch(async () => {
            console.log("فشل قراءة الملف المحلي، جاري استخدام الرابط الاحتياطي...");
            return await Canvas.loadImage('https://r2.dotphoto.com/u/f/666/36886e8a-e522-4217-9150-f8600f912e75.png'); 
        });
        
        const canvas = Canvas.createCanvas(background.width, background.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // --- [ وضع صورة العضو في الزاوية العلوية اليمنى ] ---
        const radius = 65;
        const centerX = canvas.width - radius - 55; 
        const centerY = radius + 60;               

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
        console.error("خطأ قاتل في الترحيب:", e.message);
    }
});

client.login(process.env.TOKEN);
