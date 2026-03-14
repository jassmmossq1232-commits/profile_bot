const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const express = require('express');

// نظام تشغيل 24 ساعة لـ Render
const app = express();
app.get('/', (req, res) => res.send('System Bot is Online! ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// بدلاً من السطر رقم 2 القديم الذي يسبب المشكلة
const token = process.env.TOKEN; 

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});
const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');

// 1. أمر إنشاء رسالة التذاكر (!setup)
client.on('messageCreate', async (message) => {
    if (message.content === '!setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle("مركز المساعدة | Help Center")
            .setDescription("اختر القسم المناسب من القائمة بالأسفل لفتح تذكرة")
            .setColor(TICKET_CONFIG.embedColor);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('إختر نوع التذكرة')
                .addOptions(TICKET_CONFIG.options)
        );

        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

// 2. التعامل مع اختيار العضو وافتتاح التذكرة
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'ticket_menu') return;

    await interaction.deferReply({ ephemeral: true });

    const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: TICKET_CONFIG.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
    });

    const ticketEmbed = new EmbedBuilder()
        .setColor(TICKET_CONFIG.embedColor)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(TICKET_CONFIG.welcomeMessage)
        .addFields({ name: "القسم", value: interaction.values[0] });

    const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await channel.send({ content: `<@${interaction.user.id}> | <@&${TICKET_CONFIG.adminRoleId}>`, embeds: [ticketEmbed], components: [closeBtn] });
    await interaction.editReply(`✅ تم فتح تذكرتك هنا: ${channel}`);
});

// 3. زر الإغلاق
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply("🔒 سيتم حذف التذكرة خلال 5 ثوانٍ...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});
// --- [ 1. نظام التصفير الصارم ] ---
const nuclearReset = async (member, reason) => {
    if (member.id === client.user.id || member.id === member.guild.ownerId) return;
    try {
        await member.roles.set([]); 
        console.log(`✅ تم تصفير رتب ${member.user.tag} بسبب: ${reason}`);
    } catch (err) { console.log(`❌ فشل التصفير!`); }
};

client.on(Events.ChannelDelete, async (channel) => {
    if (!settings.protection) return;
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: 26 }).catch(() => null);
    const log = logs?.entries.first();
    if (log && log.executor.id !== channel.guild.ownerId) {
        const member = await channel.guild.members.fetch(log.executor.id).catch(() => null);
        if (member) await nuclearReset(member, "حذف قناة");
    }
});

// --- [ 2. نظام الترحيب (صورة أولاً ثم نص) ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // الرتبة التلقائية
    if (settings.autoRole) {
        const role = member.guild.roles.cache.get('1479291984836427978');
        if (role) await member.roles.add(role).catch(() => {});
    }

    // الترحيب
    if (settings.welcome) {
        const welcomeChannel = member.guild.channels.cache.get('1479292362675982497');
        if (welcomeChannel) {
            try {
                const background = await Canvas.loadImage(path.join(__dirname, 'background.png'));
                const canvas = Canvas.createCanvas(background.width, background.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                const radius = 65; const centerX = canvas.width - radius - 60; const centerY = radius + 60;
                ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip();
                const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'jpg', size: 256 }));
                ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();

                const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

                // التعديل هنا: نرسل الصورة أولاً
                await welcomeChannel.send({ files: [attachment] });

                // ثم نرسل الرسالة النصية بعدها مباشرة
                await welcomeChannel.send({ 
                    content: `**| - Welcome To SYNCE RP**\n**| - Member Name :** ${member}\n**| - Invited By :** <@!1193908571096756298>` 
                });

            } catch (e) { console.error("خطأ في ترحيب العضو:", e); }
        }
    }
});

// --- [ 3. نظام البرودكاست ونظام التذاكر ورد السلام ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    // أمر البرودكاست !bc
    if (message.content.startsWith('!bc')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const broadcastMsg = message.content.slice(4).trim();
        if (!broadcastMsg) return message.reply("⚠️ اكتب الرسالة بعد الأمر.");
        const members = await message.guild.members.fetch();
        let successCount = 0;
        let failCount = 0;
        const statusMsg = await message.reply(`⏳ جاري الإرسال...`);
        for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
                await member.send({ files: [path.join(__dirname, 'background.png')] });
                await member.send(`${member}\n${broadcastMsg}`);
                successCount++;
            } catch (err) { failCount++; }
        }
        await statusMsg.edit(`✅ اكتمل! نجاح: ${successCount} | فشل: ${failCount}`);
    }

    if (message.content === 'السلام عليكم' || message.content === 'سلام') {
        return message.reply('وعليكم السلام ورحمة الله وبركاته');
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'open_ticket') return;
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
    });
    await interaction.reply({ content: `تم فتح تذكرتك: ${ticketChannel}`, ephemeral: true });
});

client.once(Events.ClientReady, () => { console.log(`✅ البرمجة الكلية تعمل: ترحيب (صورة ثم نص) مفعل.`); });

// سطر الدخول النهائي
client.login(token);
