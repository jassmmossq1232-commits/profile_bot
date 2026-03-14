const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('System is Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚠️ إعدادات هامة - استبدل الكلمات بالعناوين الحقيقية ] ---
const CONFIG = {
    prefix: "!",
    embedColor: "#ff0000", // اللون الأحمر مثل صورتك الأخيرة
    welcomeChannelId: "1479292362675982497", // ضع هنا آيدي روم الترحيب (أرقام فقط)
    thirdPersonMentionId: "1479291984836427978", // ضع هنا آيدي الشخص أو الرتبة التي تود منشنها (أرقام فقط)
    adminRoleId: "123456789", // آيدي رتبة الإدارة
    logsChannelId: "123456789", // آيدي روم اللوق
    welcomeImage: "https://ibb.co/XfZTmbfV" // تأكد من أن الرابط يعمل وينتهي بصيغة صورة
};

// نظام الترحيب (صورة + نص)
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // إضافة الرتبة التلقائية
    const role = member.guild.roles.cache.get(settings.autoRole);
    if (role) await member.roles.add(role).catch(() => {});

    const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannel);
    if (welcomeChannel) {
        try {
            // رسم صورة الترحيب
            const background = await Canvas.loadImage(path.join(__dirname, 'https://ibb.co/XfZTmbfV'));
            const canvas = Canvas.createCanvas(background.width, background.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // إضافة صورة العضو بشكل دائري
            const radius = 65;
            const centerX = canvas.width - radius - 60;
            const centerY = radius + 60;
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            ctx.restore();

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

            // إرسال الصورة أولاً
            await welcomeChannel.send({ files: [attachment] });

            // إرسال الرسالة النصية المطابقة لطلبك
            await welcomeChannel.send({
                content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** ${member}\n**| - Invited By :** <@${settings.invitedBy}>`
            });

        } catch (e) {
            console.error("خطأ في ترحيب العضو:", e);
        }
    }
});

client.once('ready', () => console.log(`✅ تم تسجيل الدخول باسم ${client.user.tag}`));
client.login(process.env.TOKEN);

// --- [ نظام البرودكاست المتطور ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة!");

    const members = await message.guild.members.fetch();
    const total = members.filter(m => !m.user.bot).size;
    let success = 0;

    let progressMsg = await message.channel.send(`⏳ جاري الإرسال لـ **${total}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
        } catch (e) {}
    }
    await progressMsg.edit(`✅ تم الإرسال بنجاح لـ: \`${success}\` عضو.`);
});

// --- [ نظام التذاكر ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.content === CONFIG.prefix + 'setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('إختر نوع القسم').addOptions([
                { label: "دعم فني", emoji: "🛠️", value: "support" },
                { label: "تقديم شكوى", emoji: "🚫", value: "report" }
            ])
        );
        message.channel.send({ embeds: [new EmbedBuilder().setTitle("نظام التذاكر").setDescription("اختر من القائمة أدناه").setColor(CONFIG.embedColor)], components: [menu] });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: CONFIG.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('c_t').setLabel('إغلاق').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [new EmbedBuilder().setDescription(`تم فتح التذكرة بنجاح.`).setColor(CONFIG.embedColor)], components: [btn] });
        interaction.reply({ content: `✅ تذكرتك: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'c_t') {
        const msgs = await interaction.channel.messages.fetch();
        const log = msgs.reverse().map(m => `${m.author.tag}: ${m.content}`).join('\n');
        const logChan = interaction.guild.channels.cache.get(CONFIG.logsChannelId);
        if (logChan) await logChan.send({ content: `سجل تذكرة ${interaction.channel.name}`, files: [{ attachment: Buffer.from(log), name: 'log.txt' }] });
        await interaction.reply("🔒 سيتم الحذف...");
        setTimeout(() => interaction.channel.delete(), 3000);
    }
});

client.login(process.env.TOKEN);
