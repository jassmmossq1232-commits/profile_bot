const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// --- [ نظام تشغيل 24 ساعة لـ Render ] ---
const app = express();
app.get('/', (req, res) => res.send('System Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- [ ⚙️ الإعدادات - عدل كل شيء من هنا بسهولة ] ---
const CONFIG = {
    prefix: "!",
    embedColor: "#000000",
    welcomeChannelId: "ضع_آيدي_روم_الترحيب",
    
    // منشن الشخص الثالث (اتركه كما هو أو ضع الآيدي)
    thirdPersonMention: "ضع_آيدي_الشخص_أو_الرتبة_هنا", 
    
    adminRoleId: "ضع_آيدي_رتبة_الإدارة",
    logsChannelId: "ضع_آيدي_روم_اللوق",

    // تعديل أسامي التذاكر بسهولة من هنا
    ticketOptions: [
        { label: "دعم فني", emoji: "🛠️", value: "support" },
        { label: "تقديم شكوى", emoji: "🚫", value: "report" },
        { label: "استفسار", emoji: "❓", value: "ask" }
    ]
};

// --- [ 1. نظام الترحيب المطابق للصورة ] ---
client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(CONFIG.embedColor)
        .setImage('https://i.imgur.com/39A5S57.png') // رابط الصورة الكبيرة (Coming Soon)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 })) // صورة الشخص على اليمين
        .setTimestamp();

    // نص الترحيب المطابق للصورة مع المنشن المزدوج
    channel.send({ 
        content: `**| - Welcome To ${member.guild.name}**\n**| - Member Name : <@${member.id}>**\n**| - Invited By : <@${CONFIG.thirdPersonMention}>**`, 
        embeds: [welcomeEmbed] 
    });
});

// --- [ 2. برودكاست متطور مع عداد حي وتقرير ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix + 'bc')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const bcMsg = message.content.split(' ').slice(1).join(' ');
    if (!bcMsg) return message.reply("❌ اكتب الرسالة!");

    const members = await message.guild.members.fetch();
    const total = members.filter(m => !m.user.bot).size;
    let success = 0;
    let failed = 0;

    let progressMsg = await message.channel.send(`⏳ جاري الإرسال لـ **${total}** عضو...`);

    for (const [id, member] of members) {
        if (member.user.bot) continue;
        try {
            await member.send(`${bcMsg}\n\n**رسالة من سيرفر: ${message.guild.name}**`);
            success++;
            if (success % 10 === 0) await progressMsg.edit(`⏳ تم إرسال: ${success} من أصل ${total}...`);
        } catch (e) {
            failed++;
        }
    }

    await progressMsg.edit(`✅ **تم الانتهاء!**\n\n👥 تم الإرسال لـ: \`${success}\`\n❌ فشل الإرسال لـ: \`${failed}\``);
});

// --- [ 3. نظام التذاكر المرن ] ---
client.on(Events.MessageCreate, async (message) => {
    if (message.content === CONFIG.prefix + 'setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle("Ticket System | نظام التذاكر")
            .setDescription("لفتح تذكرة، اختر القسم المناسب من القائمة")
            .setColor(CONFIG.embedColor);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_select')
                .setPlaceholder('إختر نوع القسم')
                .addOptions(CONFIG.ticketOptions.map(opt => ({
                    label: opt.label,
                    emoji: opt.emoji,
                    value: opt.value
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
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('c_t').setLabel('إغلاق').setStyle(ButtonStyle.Danger));
        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [new EmbedBuilder().setDescription(`تم فتح تذكرة في قسم: **${interaction.values[0]}**`).setColor(CONFIG.embedColor)], components: [btn] });
        interaction.reply({ content: `✅ تذكرتك: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'c_t') {
        const msgs = await interaction.channel.messages.fetch();
        const log = msgs.reverse().map(m => `${m.author.tag}: ${m.content}`).join('\n');
        const logChan = interaction.guild.channels.cache.get(CONFIG.logsChannelId);
        if (logChan) await logChan.send({ content: `سجل تذكرة ${interaction.channel.name}`, files: [{ attachment: Buffer.from(log), name: 'log.txt' }] });
        await interaction.reply("🔒 سيتم حذف القناة خلال 3 ثوانٍ...");
        setTimeout(() => interaction.channel.delete(), 3000);
    }
});

client.once('ready', () => console.log(`✅ ${client.user.tag} Online!`));
client.login(process.env.TOKEN);

client.once('ready', () => console.log(`✅ ${client.user.tag} Is Ready!`));
client.login(process.env.TOKEN);
