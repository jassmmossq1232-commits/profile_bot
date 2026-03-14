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

// سطر الدخول النهائي
client.login(token);
