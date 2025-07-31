// 📁 logic.js

// This module handles data persistence, daily resets, command parsing and messaging
// for the smoking tracker bot. It maintains counts of cigarettes smoked today and
// yesterday, resets counts when a new day begins, and returns context-sensitive
// feedback messages. In addition, it implements a series of cute reactions from
// a virtual character named 悠悠 for counts from 1–20.

const fs = require('fs');
const path = './data.json';
const rewards = require('./rewards.json');

/**
 * Returns the current date in YYYY‑MM‑DD format (Asia/Taipei timezone).
 * A new date is computed on each call; this allows us to detect when a new day starts.
 */
function getToday () {
  const now = new Date();
  // Get local date string in ISO format without the time component.
  return now.toISOString().slice(0, 10);
}

/**
 * Ensure data.json exists. If not, create a fresh file with default fields.
 */
function ensureDataFile () {
  if (!fs.existsSync(path)) {
    const initial = { date: getToday(), today: 0, yesterday: 0, streak: 0 };
    fs.writeFileSync(path, JSON.stringify(initial, null, 2));
  }
}

/**
 * Load persisted counts from disk.
 */
function loadData () {
  ensureDataFile();
  const raw = fs.readFileSync(path);
  return JSON.parse(raw);
}

/**
 * Persist counts to disk.
 */
function saveData (data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

/**
 * If the stored date is different from today, move today’s count to yesterday
 * and reset today’s count. Also reset the streak if we did not smoke fewer than
 * the previous day. This function mutates the provided data object and returns it.
 */
function autoResetIfNewDay (data) {
  const today = getToday();
  if (data.date !== today) {
    // Move today's count to yesterday and reset today
    data.yesterday = data.today;
    data.today = 0;
    data.date = today;
  }
  return data;
}

/**
 * Predefined reactions for each count from 1 to 20, inspired by the virtual
 * character 悠悠. Each entry contains a complete message that includes the
 * cigarette count and a description of 悠悠’s behaviour. These messages are
 * returned verbatim when the current daily count is within the range.
 */
const reactions = [
  // 1
  '今天第 1 支菸。\n超過昨天了，現在是 1 支。還想拿獎勵嗎？\n悠悠聽到後打了個哈欠，抱著自己的尾巴蜷縮在一起，眨了眨眼就睡著了(˘ω˘).｡oO💤～啾～',
  // 2
  '今天第 2 支菸。\n超過昨天了，現在是 2 支。還想拿獎勵嗎？\n悠悠翻了個身，用小爪子拍拍自己的臉頰，又用尾巴在空中畫圈圈(˶˚ᴗ˚˶)｡oO',
  // 3
  '今天第 3 支菸。\n超過昨天了，現在是 3 支。還想拿獎勵嗎？\n悠悠抱著小手輕輕揮手，眼睛瞇成一條線，發出輕輕的啾啾聲(๑˃̵ᴗ˂̵)و💨',
  // 4
  '今天第 4 支菸。\n超過昨天了，現在是 4 支。還想拿獎勵嗎？\n悠悠雙手揣在胸前，腦袋歪了一下(｡･ω･｡)?，尾巴輕輕拍打地面撲通撲通',
  // 5
  '今天第 5 支菸。\n超過昨天了，現在是 5 支。還想拿獎勵嗎？\n悠悠撓了撓肚子，伸出小爪子做出擁抱姿勢，眼神亮亮地看著你(*´∀`)ﾉ',
  // 6
  '今天第 6 支菸。\n超過昨天了，現在是 6 支。還想拿獎勵嗎？\n悠悠悄悄地用爪子遮住眼睛，再忽然張開做出驚喜的動作(・∀・)ノ',
  // 7
  '今天第 7 支菸。\n超過昨天了，現在是 7 支。還想拿獎勵嗎？\n悠悠輕輕搖晃著身體，尾巴繞成小圓圈，最後摟著自己的尾巴躺平嗚嗚～',
  // 8
  '今天第 8 支菸。\n超過昨天了，現在是 8 支。還想拿獎勵嗎？\n悠悠用小手拍了拍水面，濺出小水花，揮手示意你靠近(*≧ω≦)ゞ',
  // 9
  '今天第 9 支菸。\n超過昨天了，現在是 9 支。還想拿獎勵嗎？\n悠悠打了個滾，臉頰貼在地上，尾巴翹了起來，做出撒嬌的動作( ˘•ω•˘ )ゝ',
  // 10
  '今天第 10 支菸。\n超過昨天了，現在是 10 支。還想拿獎勵嗎？\n悠悠撲通一下趴在你面前，用爪子輕撫自己的臉頰，露出期待的眼神(人´∀｀)♡',
  // 11
  '今天第 11 支菸。\n超過昨天了，現在是 11 支。還想拿獎勵嗎？\n悠悠側身躺著，眼睛眨呀眨，尾巴繞著自己畫圓，像是在思考嗚嗚～',
  // 12
  '今天第 12 支菸。\n超過昨天了，現在是 12 支。還想拿獎勵嗎？\n悠悠雙手合十放在胸前，臉頰微紅，用力搖頭表示撒嬌的拒絕(๑>◡<๑)',
  // 13
  '今天第 13 支菸。\n超過昨天了，現在是 13 支。還想拿獎勵嗎？\n悠悠縮成一團，再慢慢伸展四肢，尾巴輕點地面發出啾啾聲(*˘︶˘*).｡oO',
  // 14
  '今天第 14 支菸。\n超過昨天了，現在是 14 支。還想拿獎勵嗎？\n悠悠抱著自己的尾巴，眨眼微笑，尾巴輕輕拍打著小水花(≧▽≦)ゞ',
  // 15
  '今天第 15 支菸。\n超過昨天了，現在是 15 支。還想拿獎勵嗎？\n悠悠用小爪子捂住嘴巴，像是在打呵欠，又伸手向你討摸摸(˶‾᷄ ⁻̫ ‾᷅˵)',
  // 16
  '今天第 16 支菸。\n超過昨天了，現在是 16 支。還想拿獎勵嗎？\n悠悠用爪子拍拍水面，然後抬頭看著你，尾巴繞了幾圈後停在胸前(˘･ᴗ･˘)',
  // 17
  '今天第 17 支菸。\n超過昨天了，現在是 17 支。還想拿獎勵嗎？\n悠悠將小手放在臉旁，眨眼賣萌，用尾巴輕拍自己像在自言自語(｡>﹏<｡)',
  // 18
  '今天第 18 支菸。\n超過昨天了，現在是 18 支。還想拿獎勵嗎？\n悠悠在原地打了個滾，抱著自己的尾巴撒嬌，耳邊傳來輕輕的啾啾聲(づ｡◕‿‿◕｡)づ',
  // 19
  '今天第 19 支菸。\n超過昨天了，現在是 19 支。還想拿獎勵嗎？\n悠悠把尾巴繞成愛心形狀，輕輕點頭又搖頭，像是在表示矛盾(♡˙︶˙♡)',
  // 20
  '今天第 20 支菸。\n超過昨天了，現在是 20 支。還想拿獎勵嗎？\n悠悠抱著自己的尾巴在水面上慢慢打轉，最後靠在你腳邊睡著了( ᐡ-ܫ-ᐡ )💤'
];

/**
 * Generate a response string based on the current counts. For counts between 1
 * and 20 inclusive, a predefined reaction from the virtual character 悠悠 is
 * returned. For zero or counts above 20, a generic response reflecting the
 * relationship to yesterday’s count is constructed. This keeps feedback
 * informative even when counts exceed the predefined range.
 */
function generateResponse (data) {
  const n = data.today;
  // Use customised reactions for 1–20 cigarettes.
  if (n >= 1 && n <= 20) {
    return reactions[n - 1];
  }
  // Generic message for zero cigarettes
  if (n === 0) {
    return '今天還沒抽菸，保持下去！悠悠雙手合掌為你打氣(๑˃̵ᴗ˂̵)و';
  }
  // Generic message for counts over 20
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
 * Update the count based on the provided amount. Positive amounts increment
 * today’s count, and negative amounts decrement it. Counts never fall below
 * zero. After updating, a reaction message is sent via the client.
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
 * Process bot commands. Recognised commands:
 *  - /查詢 或 /查詢今日：回覆今日抽菸數、昨日、以及連續減量天數。
 *  - /查詢昨日：回覆昨日抽菸數。
 *  - /重設：將今日計數歸零。
 *  - /說明：顯示可用指令與說明。
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
 * Resets the daily count at the end of the day. This function is scheduled to
 * run via node‑schedule. When executed, today’s count becomes yesterday’s count
 * and today resets to zero. The streak persists and will be updated in
 * summarizeDay().
 */
function resetDaily () {
  const data = loadData();
  autoResetIfNewDay(data);
  // At reset time, data.date should already equal today. We need to move
  // today’s count to yesterday and zero out today.
  data.yesterday = data.today;
  data.today = 0;
  saveData(data);
  console.log('每日重置完成');
}

/**
 * Summarize the day’s results and send a push message to the user. If the user
 * smoked fewer cigarettes today than yesterday, increment the streak and award
 * a reward based on the streak count (capped by the length of rewards.json).
 * Otherwise reset the streak. Sends both text and image messages when
 * appropriate.
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