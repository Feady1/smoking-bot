// 📁 index.js
const express = require('express');
const line = require('@line/bot-sdk');
const schedule = require('node-schedule');
const fs = require('fs');
const { handlePlusOne, handleCommand, resetDaily, summarizeDay } = require('./logic');
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
      if (msg === '+1') return handlePlusOne(event, client);
      if (/^\+\d+$/.test(msg)) return handlePlusOne(event, client, parseInt(msg.substring(1)));
      if (/^\/[-+]?\d+$/.test(msg)) return handlePlusOne(event, client, parseInt(msg.substring(1)));
      if (msg.startsWith('/')) return handleCommand(msg, event, client);
    }
    return Promise.resolve(null);
  }));
  res.json(results);
});

// 每日 00:05 重置
schedule.scheduleJob('5 0 * * *', () => resetDaily());
// 每日 23:50 統計與發獎勵
schedule.scheduleJob('50 23 * * *', () => summarizeDay(client));

app.get('/', (req, res) => res.send('LINE Bot Running.'));

app.listen(port, () => console.log(`Bot running on ${port}`));
