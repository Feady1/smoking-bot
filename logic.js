// 📁 logic.js

// This module manages the smoking tracker’s data and messaging logic. It stores
// counts for today and yesterday, automatically resets counts when a new day
// begins, parses adjustment commands, and generates tailored feedback. When the
// count lies between 1 and 20, it uses a series of playful reactions from a
// virtual character named 悠悠.

const fs = require('fs');
const path = './data.json';
const rewards = require('./rewards.json');

/**
 * Get the current date in ISO (YYYY‑MM‑DD) format. This helper allows
 * detection of day changes for automatic resets. Timezone handling is left
 * to the scheduler in index.js, which runs jobs at specified times in
 * Asia/Taipei.
 */
function getToday () {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Ensure the data file exists. If it does not, create it with default
 * structure including a date field.
 */
function ensureDataFile () {
  if (!fs.existsSync(path)) {
    const initial = { date: getToday(), today: 0, yesterday: 0, streak: 0 };
    fs.writeFileSync(path, JSON.stringify(initial, null, 2));
  }
}

/**
 * Load persisted data from disk.
 */
function loadData () {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(path));
}

/**
 * Save data to disk.
 */
function saveData (data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

/**
 * Check if the stored date matches the current date. If not, roll today’s
 * count into yesterday, reset today to zero and update the date. Returns the
 * mutated data object.
 */
function autoResetIfNewDay (data) {
  const today = getToday();
  if (data.date !== today) {
    data.yesterday = data.today;
    data.today = 0;
    data.date = today;
  }
  return data;
}

/**
 * Array of custom reactions for counts 1–20. Each string contains the base
 * message plus a description of 悠悠’s reaction. These messages are used
 * verbatim when the daily count falls within this range.
 */
const reactions = [
  '今天第 1 支菸。\n超過昨天了，現在是 1 支。還想拿獎勵嗎？\n悠悠聽到後打了個哈欠，抱著自己的尾巴蜷縮在一起，眨了眨眼就睡著了(˘ω˘).｡oO💤～啾～',
  '今天第 2 支菸。\n超過昨天了，現在是 2 支。還想拿獎勵嗎？\n悠悠翻了個身，用小爪子拍拍自己的臉頰，又用尾巴在空中畫圈圈(˶˚ᴗ˚˶)｡oO',
  '今天第 3 支菸。\n超過昨天了，現在是 3 支。還想拿獎勵嗎？\n悠悠抱著小手輕輕揮手，眼睛瞇成一條線，發出輕輕的啾啾聲(๑˃̵ᴗ˂̵)و💨',
  '今天第 4 支菸。\n超過昨天了，現在是 4 支。還想拿獎勵嗎？\n悠悠雙手揣在胸前，腦袋歪了一下(｡･ω･｡)?，尾巴輕輕拍打地面撲通撲通',
  '今天第 5 支菸。\n超過昨天了，現在是 5 支。還想拿獎勵嗎？\n悠悠撓了撓肚子，伸出小爪子做出擁抱姿勢，眼神亮亮地看著你(*´∀`)ﾉ',
  '今天第 6 支菸。\n超過昨天了，現在是 6 支。還想拿獎勵嗎？\n悠悠悄悄地用爪子遮住眼睛，再忽然張開做出驚喜的動作(・∀・)ノ',
  '今天第 7 支菸。\n超過昨天了，現在是 7 支。還想拿獎勵嗎？\n悠悠輕輕搖晃著身體，尾巴繞成小圓圈，最後摟著自己的尾巴躺平嗚嗚～',
  '今天第 8 支菸。\n超過昨天了，現在是 8 支。還想拿獎勵嗎？\n悠悠用小手拍了拍水面，濺出小水花，揮手示意你靠近(*≧ω≦)ゞ',
  '今天第 9 支菸。\n超過昨天了，現在是 9 支。還想拿獎勵嗎？\n悠悠打了個滾，臉頰貼在地上，尾巴翹了起來，做出撒嬌的動作( ˘•ω•˘ )ゝ',
  '今天第 10 支菸。\n超過昨天了，現在是 10 支。還想拿獎勵嗎？\n悠悠撲通一下趴在你面前，用爪子輕撫自己的臉頰，露出期待的眼神(人´∀｀)♡',
  '今天第 11 支菸。\n超過昨天了，現在是 11 支。還想拿獎勵嗎？\n悠悠側身躺著，眼睛眨呀眨，尾巴繞著自己畫圓，像是在思考嗚嗚～',
  '今天第 12 支菸。\n超過昨天了，現在是 12 支。還想拿獎勵嗎？\n悠悠雙手合十放在胸前，臉頰微紅，用力搖頭表示撒嬌的拒絕(๑>◡<๑)',
  '今天第 13 支菸。\n超過昨天了，現在是 13 支。還想拿獎勵嗎？\n悠悠縮成一團，再慢慢伸展四肢，尾巴輕點地面發出啾啾聲(*˘︶˘*).｡oO',
  '今天第 14 支菸。\n超過昨天了，現在是 14 支。還想拿獎勵嗎？\n悠悠抱著自己的尾巴，眨眼微笑，尾巴輕輕拍打著小水花(≧▽≦)ゞ',
  '今天第 15 支菸。\n超過昨天了，現在是 15 支。還想拿獎勵嗎？\n悠悠用小爪子捂住嘴巴，像是在打呵欠，又伸手向你討摸摸(˶‾᷄ ⁻̫ ‾᷅˵)',
  '今天第 16 支菸。\n超過昨天了，現在是 16 支。還想拿獎勵嗎？\n悠悠用爪子拍拍水面，然後抬頭看著你，尾巴繞了幾圈後停在胸前(˘･ᴗ･˘)',
  '今天第 17 支菸。\n超過昨天了，現在是 17 支。還想拿獎勵嗎？\n悠悠將小手放在臉旁，眨眼賣萌，用尾巴輕拍自己像在自言自語(｡>﹏<｡)',
  '今天第 18 支菸。\n超過昨天了，現在是 18 支。還想拿獎勵嗎？\n悠悠在原地打了個滾，抱著自己的尾巴撒嬌，耳邊傳來輕輕的啾啾聲(づ｡◕‿‿◕｡)づ',
  '今天第 19 支菸。\n超過昨天了，現在是 19 支。還想拿獎勵嗎？\n悠悠把尾巴繞成愛心形狀，輕輕點頭又搖頭，像是在表示矛盾(♡˙︶˙♡)',
  '今天第 20 支菸。\n超過昨天了，現在是 20 支。還想拿獎勵嗎？\n悠悠抱著自己的尾巴在水面上慢慢打轉，最後靠在你腳邊睡著了( ᐡ-ܫ-ᐡ )💤'
];

/**
 * Generate a feedback message based on the current counts. Returns a
 * predefined reaction for counts between 1 and 20, a special message for
 * zero, or a generic comparison message for counts above 20.
 */
function generateResponse (data) {
  const n = data.today;
  if (n >= 1 && n <= 20) {
    return reactions[n - 1];
  }
  if (n === 0) {
    return '今天還沒抽菸，保持下去！悠悠雙手合掌為你打氣(๑˃̵ᴗ˂̵)و';
  }
  let message = `今天第 ${n} 支菸。`;
  if (n < data.yesterday) {
    message += `\n比昨天少了 ${data.yesterday - n} 支，不錯喔！`;
  } else if (n === data.yesterday) {
    message += `\n已經跟昨天一樣多了，要克制唷。`;
  } else {
    message += `\n超過昨天了，現在是 ${n} 支。還想拿獎勵嗎？`;
  }
  message += '\n悠悠歪著頭看看你，尾巴在身旁劃圈，似乎在思考(｡･ω･｡)?';
  return message;
}

/**
 * Adjust today’s count by a signed amount. Negative amounts decrease the count
 * but never allow it to drop below zero. After adjustment, persist the data
 * and send a feedback message via the client.
 */
function handleAdjust (event, client, amount) {
  const data = loadData();
  autoResetIfNewDay(data);
  data.today += amount;
  if (data.today < 0) data.today = 0;
  saveData(data);
  const response = generateResponse(data);
  return client.replyMessage(event.replyToken, { type: 'text', text: response });
}

/**
 * Handle command messages starting with '/'. Supports several commands:
 *  /查詢 或 /查詢今日 – report today, yesterday and streak counts
 *  /查詢昨日 – report yesterday’s count
 *  /重設 – reset today’s count to zero
 *  /說明 – display usage instructions
 */
function handleCommand (msg, event, client) {
  const data = loadData();
  autoResetIfNewDay(data);
  if (msg === '/查詢' || msg === '/查詢今日') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `今日已抽 ${data.today} 支，昨日 ${data.yesterday} 支，連續減量天數：${data.streak} 天。`
    });
  }
  if (msg === '/查詢昨日') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `昨日抽了 ${data.yesterday} 支。`
    });
  }
  if (msg === '/重設') {
    data.today = 0;
    saveData(data);
    return client.replyMessage(event.replyToken, { type: 'text', text: '今日紀錄已重設為 0。' });
  }
  if (msg === '/說明') {
    const help = [
      '可用指令：',
      '+1 或 +n：增加今日抽菸數',
      '-1 或 -n：減少今日抽菸數',
      '/查詢 或 /查詢今日：查看今日與昨日抽菸數以及連續減量天數',
      '/查詢昨日：查看昨日抽菸數',
      '/重設：重設今日計數為 0',
      '/說明：顯示這段說明'
    ].join('\n');
    return client.replyMessage(event.replyToken, { type: 'text', text: help });
  }
  return client.replyMessage(event.replyToken, { type: 'text', text: '無效指令。' });
}

/**
 * Reset counts at the scheduled reset time. Moves today’s count to yesterday
 * and zeroes today.
 */
function resetDaily () {
  const data = loadData();
  autoResetIfNewDay(data);
  data.yesterday = data.today;
  data.today = 0;
  saveData(data);
  console.log('每日重置完成');
}

/**
 * Summarize the day’s results and deliver them via push message. Adjusts
 * streaks and awards rewards based on whether the user smoked fewer
 * cigarettes today than yesterday.
 */
function summarizeDay (client) {
  const data = loadData();
  autoResetIfNewDay(data);
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

module.exports = { handleAdjust, handleCommand, resetDaily, summarizeDay };