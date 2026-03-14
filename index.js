const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('System HD Online ✅'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const CONFIG = {
    welcomeChannelId: "1467260591767949609",
    autoRoleId: "1467259879029735465",
    // رابط صورتك العمودية الأصلية في جيت هاب
    imageUrl: "https://raw.githubusercontent.com/jassmmossq1232-commits/profile_bot/main/background.png"
};

client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;

    // 1. إضافة الرتبة (المواطن)
    const role = member.guild.roles.cache.get(CONFIG.autoRoleId);
    if (role) await member.roles.add(role).catch(() => {});

    // 2. إرسال الترحيب HD (عمودي)
    const channel = member.guild.channels.cache.get(CONFIG.welcomeChannelId);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setDescription(`**| - Welcome To SYNC RP**\n**| - Member Name :** <@${member.id}>\n**| - Invited By :** <@1193908571096756298>`)
            .setImage(CONFIG.imageUrl); 

        await channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
