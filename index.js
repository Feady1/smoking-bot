// 📁 index.js
const express = require('express');
const line = require('@line/bot-sdk');
const schedule = require('node-schedule');
// Remove unused fs import; bring in new handler from logic.js
const { handleAdjust, handleCommand, resetDaily, summarizeDay } = require('./logic');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
      // Adjust counts when message starts with optional '/' followed by '+' or '-' and digits
      if (/^\/?[+-]\d+$/.test(msg)) {
        // Remove leading '/' if present before parsing integer
        const cleaned = msg.startsWith('/') ? msg.slice(1) : msg;
        return handleAdjust(event, client, parseInt(cleaned, 10));
      }
      // Delegate commands beginning with '/' that are not numeric adjustments
      if (msg.startsWith('/')) return handleCommand(msg, event, client);
    }
    return Promise.resolve(null);
  }));
  res.json(results);
});

// 每日 00:05（台北時間）重置
schedule.scheduleJob({ cron: '5 0 * * *', tz: 'Asia/Taipei' }, () => resetDaily());
// 每日 23:50（台北時間）統計與發獎勵
schedule.scheduleJob({ cron: '50 23 * * *', tz: 'Asia/Taipei' }, () => summarizeDay(client));

app.get('/', (req, res) => res.send('LINE Bot Running.'));

app.listen(port, () => console.log(`Bot running on ${port}`));
