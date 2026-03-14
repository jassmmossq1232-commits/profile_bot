const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// --- [ تشغيل 24 ساعة ] ---
const app = express();
app.get('/', (req, res) => res.send('System Active ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚙️ لوحة التحكم - عدل كل شيء من هنا بسهولة ] ---
const CONFIG = {
    prefix: "!",
    embedColor: "#2b2d31",
    welcomeChannelId: "1479292362675982497",
    mentionRoleId: "1479291984836427978", // المنشن الإضافي
    adminRoleId: "1479291690094428300",
    logsChannelId: "1479292317147070545",
    
    // تعديل أسامي التذاكر بسهولة هنا
    ticketOptions: [
        { label: "دعم فني", emoji: "🛠️", value: "support", desc: "فتح تذكرة للتحدث مع الدعم" },
        { label: "تقديم شكوى", emoji: "🚫", value: "report", desc: "فتح تذكرة لتقديم بلاغ" },
        { label: "استفسار عام", emoji: "❓", value: "ask", desc: "فتح تذكرة للاستفسارات" }
    ]
};

// --- [ 1. نظام الترحيب المطابق لطلبك ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(CONFIG.embedColor)
        .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() })
        .setTitle(`Welcome to ${member.guild.name}`) 
        .setDescription(`حياك الله يا <@${member.id}> في سيرفرنا!\nنتمنى لك أمتع الأوقات.\n\n**أنت العضو رقم:** \`${member.guild.memberCount}\``)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp();

    channel.send({ 
        content: `حياك الله <@${member.id}> | <@&${CONFIG.mentionRoleId}>`, 
        embeds: [welcomeEmbed] 
    });
});

// --- [ 2. برودكاست متطور مع العداد ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة! مثال: `!bc السلام عليكم`.");

    const members = await message.guild.members.fetch();
    const total = members.filter(m => !m.user.bot).size;
    let success = 0;
    let failed = 0;

    let statusMsg = await message.channel.send(`⏳ جاري الإرسال إلى **${total}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**Sent from: ${message.guild.name}**`);
            success++;
        } catch (e) {
            failed++;
        }
    }

    statusMsg.edit(`✅ **انتهى الإرسال بنجاح!**\n\n👥 إجمالي المحاولة: \`${total}\`\n✅ تم الإرسال لـ: \`${success}\`\n❌ فشل الإرسال لـ: \`${failed}\` (بسبب إغلاق الخاص)`);
});

// --- [ 3. نظام التذاكر (سهل التغيير) ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.content === CONFIG.prefix + 'setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle("نظام التذاكر | Support System")
            .setDescription("اختر القسم المناسب من القائمة بالأسفل")
            .setColor(CONFIG.embedColor);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('إختر نوع التذكرة')
                .addOptions(CONFIG.ticketOptions.map(opt => ({
                    label: opt.label,
                    emoji: opt.emoji,
                    value: opt.value,
                    description: opt.desc
                })))
        );
        message.channel.send({ embeds: [embed], components: [menu] });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.adminRoleId, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });
        const closeBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('c_t').setLabel('إغلاق').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [new EmbedBuilder().setDescription(`مرحباً بك، لقد اخترت قسم: **${interaction.values[0]}**`).setColor(CONFIG.embedColor)], components: [closeBtn] });
        interaction.reply({ content: `✅ تذكرتك جاهزة: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'c_t') {
        await interaction.reply("🔒 جاري إغلاق التذكرة...");
        const msgs = await interaction.channel.messages.fetch();
        const log = msgs.reverse().map(m => `${m.author.tag}: ${m.content}`).join('\n');
        const logChan = interaction.guild.channels.cache.get(CONFIG.logsChannelId);
        if (logChan) await logChan.send({ content: `سجل تذكرة ${interaction.channel.name}`, files: [{ attachment: Buffer.from(log), name: 'ticket-log.txt' }] });
        setTimeout(() => interaction.channel.delete(), 4000);
    }
});

client.once('ready', () => console.log(`✅ ${client.user.tag} Is Ready!`));
client.login(process.env.TOKEN);
