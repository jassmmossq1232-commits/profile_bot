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

// سطر الدخول النهائي
client.login(token);
