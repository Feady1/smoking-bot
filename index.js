// 📁 index.js
const express = require('express');
const line = require('@line/bot-sdk');
const schedule = require('node-schedule');
const fs = require('fs');
// Import updated handlers from logic: handleAdjust for numeric adjustments, handleCommand for slash commands,
// handleInteraction for generic messages, resetDaily and summarizeDay for scheduled tasks.
const {
  handleAdjust,
  handleCommand,
  resetDaily,
  summarizeDay,
  handleInteraction,
  getTaipeiWeather,
  composeWeatherReport
} = require('./logic');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Global error handlers to prevent the process from crashing on unhandled errors.
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      const msg = event.message.text.trim();
      // Determine if message is a numeric adjustment: +n, -n, /+n, /-n
      if (/^[+/\-][+\-]?\d+$/.test(msg)) {
        // Strip leading slash if present and parse signed integer value
        const cleaned = msg.startsWith('/') ? msg.slice(1) : msg;
        const amount = parseInt(cleaned);
        return handleAdjust(event, client, amount);
      }
      // Slash commands
      if (msg.startsWith('/')) {
        return handleCommand(msg, event, client);
      }
      // Other messages are interactions with 悠悠
      return handleInteraction(event, client, msg);
    }
    // Ignore non-text events
    return Promise.resolve(null);
  }));
  res.json(results);
});

// 每日 00:05 依台北時區重置
schedule.scheduleJob('5 0 * * *', { tz: 'Asia/Taipei' }, () => resetDaily());
// 每日 23:50 依台北時區統計與發獎勵
schedule.scheduleJob('50 23 * * *', { tz: 'Asia/Taipei' }, async () => {
  try {
    await summarizeDay(client);
  } catch (err) {
    console.error('日結訊息發送失敗', err);
  }
});

// 每日 06:30 發送台北市天氣預報
schedule.scheduleJob('30 6 * * *', { tz: 'Asia/Taipei' }, async () => {
  try {
    const weather = await getTaipeiWeather();
    const report = composeWeatherReport(weather);
    await client.pushMessage(process.env.USER_ID, { type: 'text', text: report });
    console.log('天氣預報已發送');
  } catch (err) {
    console.error('天氣預報發送失敗', err);
  }
});

app.get('/', (req, res) => res.send('LINE Bot Running.'));

app.listen(port, () => console.log(`Bot running on ${port}`));
