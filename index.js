const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// --- [ نظام تشغيل 24 ساعة ] ---
const app = express();
app.get('/', (req, res) => res.send('Comprehensive Bot is Online! ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚙️ الإعدادات - ضع الآيديات هنا ] ---
const CONFIG = {
    adminRoleId: "1479291690094428300",
    logsChannelId: "1479291991471952024",
    welcomeChannelId: "1479292362675982497",
    embedColor: "#2b2d31",
    prefix: "!" // البريفكس الخاص بالأوامر
};

const token = process.env.TOKEN;

// --- [ 1. نظام الترحيب ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(CONFIG.embedColor)
            .setTitle("عضو جديد وصل! 🎉")
            .setDescription(`أهلاً بك <@${member.id}> في السيرفر، نورتنا!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        channel.send({ embeds: [welcomeEmbed] });
    }
});

// --- [ 2. الرد التلقائي ] ---
client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    const autoReplies = {
        "السلام عليكم": "وعليكم السلام ورحمة الله وبركاته، نورت يا بطل! ❤️",
        "كيفك": "بخير عساك بخير، كيف أقدر أخدمك؟ ✨",
        "مساعدة": "أهلاً بك، يمكنك كتابة `!setup` لفتح نظام التذاكر."
    };

    if (autoReplies[message.content]) {
        message.reply(autoReplies[message.content]);
    }
});

// --- [ 3. نظام البرودكاست (إرسال للكل) ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.content.startsWith(CONFIG.prefix + 'bc') && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const args = message.content.split(' ').slice(1).join(' ');
        if (!args) return message.reply("❌ يرجى كتابة الرسالة بعد الأمر. مثال: `!bc السلام عليكم`.");

        message.guild.members.cache.forEach(member => {
            if (member.user.bot) return;
            member.send(`${args}\n\n**من سيرفر: ${message.guild.name}**`).catch(() => console.log(`فشل الإرسال لـ ${member.user.tag}`));
        });
        message.reply("✅ جاري إرسال البرودكاست لجميع الأعضاء...");
    }
});

// --- [ 4. نظام التذاكر واللوق ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.content === CONFIG.prefix + 'setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle("مركز الدعم الفني 🎫")
            .setDescription("اختر القسم المناسب لفتح تذكرة وسيتم الرد عليك.")
            .setColor(CONFIG.embedColor);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('إختر نوع القسم')
                .addOptions([
                    { label: "دعم فني", emoji: "🛠️", value: "دعم_فني" },
                    { label: "تقديم بلاغ", emoji: "🚫", value: "بلاغ" }
                ])
        );
        await message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    // فتح التذكرة
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        await interaction.deferReply({ ephemeral: true });
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel] },
            ],
        });
        const closeBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
        await channel.send({ content: `<@${interaction.user.id}> | <@&${CONFIG.adminRoleId}>`, embeds: [new EmbedBuilder().setDescription(`مرحباً بك، لقد فتحت تذكرة في قسم: **${interaction.values[0]}**`).setColor(CONFIG.embedColor)], components: [closeBtn] });
        await interaction.editReply(`✅ تم فتح تذكرتك بنجاح: ${channel}`);
    }

    // إغلاق التذكرة واللوق
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        await interaction.reply("🔒 جاري إغلاق التذكرة وحفظ السجلات...");
        const messages = await interaction.channel.messages.fetch();
        const logContent = messages.reverse().map(m => `${m.author.tag}: ${m.content}`).join('\n');
        const logChannel = interaction.guild.channels.cache.get(CONFIG.logsChannelId);
        
        if (logChannel) {
            await logChannel.send({ 
                content: `📄 سجل إغلاق تذكرة: ${interaction.channel.name}`, 
                files: [{ attachment: Buffer.from(logContent), name: `log-${interaction.channel.name}.txt` }] 
            });
        }
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.once('ready', () => console.log(`✅ ${client.user.tag} جاهز للعمل!`));
client.login(token);
