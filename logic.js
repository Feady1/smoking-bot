// 📁 logic.js
const fs = require('fs');
const path = './data.json';
const rewards = require('./rewards.json');

function loadData() {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify({ today: 0, yesterday: 0, streak: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(path));
}

function saveData(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function handlePlusOne(event, client, amount = 1) {
  const data = loadData();
  data.today += amount;
  saveData(data);

  let response = `今天第 ${data.today} 支菸。`;
  if (data.today < data.yesterday) {
    response += `\n比昨天少了 ${data.yesterday - data.today} 支，不錯喔！`;
  } else if (data.today === data.yesterday) {
    response += `\n已經跟昨天一樣多了，要克制唷。`;
  } else {
    response += `\n超過昨天了，現在是 ${data.today} 支。還想拿獎勵嗎？`;
  }
  return client.replyMessage(event.replyToken, { type: 'text', text: response });
}

function handleCommand(msg, event, client) {
  const data = loadData();
  if (msg === '/查詢今日') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `今日已抽 ${data.today} 支，昨日 ${data.yesterday} 支，連續減量天數：${data.streak} 天。`
    });
  }
  if (msg === '/重設') {
    data.today = 0;
    saveData(data);
    return client.replyMessage(event.replyToken, { type: 'text', text: '今日紀錄已重設為 0。' });
  }
  return client.replyMessage(event.replyToken, { type: 'text', text: '無效指令。' });
}

function resetDaily() {
  const data = loadData();
  data.yesterday = data.today;
  data.today = 0;
  saveData(data);
  console.log('每日重置完成');
}

function summarizeDay(client) {
  const data = loadData();
  let reward = null;

  if (data.today < data.yesterday) {
    data.streak += 1;
    const stage = Math.min(data.streak, rewards.length);
    reward = rewards[stage - 1];
  } else {
    data.streak = 0;
  }

  saveData(data);

  const messages = [
    {
      type: 'text',
      text: `今日抽 ${data.today} 支，昨日 ${data.yesterday} 支，連續減量：${data.streak} 天。`
    }
  ];
  if (reward) {
    messages.push({ type: 'image', originalContentUrl: reward.image, previewImageUrl: reward.image });
    messages.push({ type: 'text', text: reward.text });
  }
  client.pushMessage(process.env.USER_ID, messages);
  console.log('日結訊息發送完畢');
}

module.exports = { handlePlusOne, handleCommand, resetDaily, summarizeDay };
