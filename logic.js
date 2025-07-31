// 📁 logic.js

// This module manages persistent data, daily reset logic, reward summarisation,
// numeric adjustments and interactive responses for the smoking bot. It also
// defines a rich set of reactions for the virtual character 悠悠 so that the
// bot can generate varied feedback based on both smoking counts and user
// interactions.

const fs = require('fs');
const https = require('https');
const path = './data.json';
const rewards = require('./rewards.json');

/* --------------------------------------------------------------------------
 * Helpers for loading, saving and resetting persistent data
 * ------------------------------------------------------------------------ */

// Return current date string (YYYY-MM-DD).
function getToday () {
  return new Date().toISOString().slice(0, 10);
}

// Ensure the data file exists; initialise with default values if absent.
function ensureDataFile () {
  if (!fs.existsSync(path)) {
    const initial = { date: getToday(), today: 0, yesterday: 0, streak: 0 };
    fs.writeFileSync(path, JSON.stringify(initial, null, 2));
  }
}

// Load persisted data.
function loadData () {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(path));
}

// Save data to disk.
function saveData (data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// If stored date differs from today, roll today into yesterday and reset today.
function autoResetIfNewDay (data) {
  const today = getToday();
  if (data.date !== today) {
    data.yesterday = data.today;
    data.today = 0;
    data.date = today;
  }
  return data;
}

/* --------------------------------------------------------------------------
 * Reaction templates for smoking counts 1–20
 * ------------------------------------------------------------------------ */

// Predefined messages for counts 1–20 including 悠悠’s reactions. Each string
// contains a base message with line breaks. If today’s count lies within
// 1..20, the corresponding entry will be used verbatim.
const countReactions = [
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

/* --------------------------------------------------------------------------
 * Components for constructing >1000 unique interaction responses
 * ------------------------------------------------------------------------ */

// Emoticons and expressive faces used by 悠悠 to convey emotion.
const emoticons = [
  '(˶˚ᴗ˚˶)', '(๑˃̵ᴗ˂̵)و', '(｡･ω･｡)?', '(≧▽≦)ゞ', '(˘ω˘)', '(づ｡◕‿‿◕｡)づ', '(｡>﹏<｡)', '(*´∀`)ﾉ'
];

// Sound words to accompany actions.
const sounds = ['啾啾', '撲通', '嗚嗚', '呀～'];

/* --------------------------------------------------------------------------
 * Weather utilities
 * ------------------------------------------------------------------------ */

// Mapping of Open‑Meteo weather codes to descriptive Chinese phrases.  The codes
// follow the WMO standard where 0 denotes clear skies and increasing numbers
// represent increasing severity.  Only commonly occurring codes are mapped; any
// unknown codes will fall back to showing the numeric code.
const weatherCodeMap = {
  0: '晴朗',
  1: '少雲',
  2: '半雲',
  3: '多雲',
  45: '有霧',
  48: '霧凇',
  51: '輕微霧雨',
  53: '中度霧雨',
  55: '強霧雨',
  56: '輕微冰霧雨',
  57: '強冰霧雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '輕微冰雨',
  67: '強冰雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '陣雨',
  81: '中陣雨',
  82: '大陣雨',
  85: '陣雪',
  86: '強陣雪',
  95: '雷雨',
  96: '雷雨伴有冰雹',
  99: '雷雨伴有強冰雹'
};

/**
 * Fetch the current and daily weather for Taipei City using the Open‑Meteo API.
 * The API does not require an API key.  Returns an object containing the
 * current temperature, maximum and minimum temperatures for today and a
 * descriptive string for the current weather code.  In case of failure, the
 * returned promise will reject.
 */
function getTaipeiWeather () {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=25.0478&longitude=121.5319&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTaipei';
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const currTemp = json.current_weather.temperature;
            const code = json.current_weather.weathercode;
            const max = json.daily.temperature_2m_max[0];
            const min = json.daily.temperature_2m_min[0];
            const desc = weatherCodeMap[code] || `代碼 ${code}`;
            resolve({ currentTemp: currTemp, max, min, codeDesc: desc });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', err => reject(err));
  });
}

/**
 * Compose a weather report string for Taipei using the given weather object.
 * Adds a cute reaction from 悠悠 to integrate with the virtual character’s
 * behaviour module.  The reaction is constructed using buildReaction.
 */
function composeWeatherReport (weather) {
  const base = '悠悠抬頭看看窗外的天氣，';
  const reaction = buildReaction(base);
  return (
    `台北市今日天氣：${weather.codeDesc}。\n` +
    `現在溫度 ${weather.currentTemp}°C，最高 ${weather.max}°C，最低 ${weather.min}°C。\n` +
    reaction
  );
}

// Base descriptions for various user actions. Each entry may contain
// multiple variations to allow additional combinations.
const actionBases = {
  morning: [
    '悠悠揉揉眼睛伸了個懶腰，向你揮爪打招呼',
    '悠悠從睡夢中醒來，眨著迷濛的眼睛對你點頭'
  ],
  night: [
    '悠悠打了個呵欠，用尾巴裹住自己準備睡覺',
    '悠悠窩成一團，慢慢閉上眼睛揮手道晚安'
  ],
  pat: [
    '悠悠眯起眼睛享受你的撫摸，抱著尾巴發出滿足的聲音',
    '悠悠把頭靠近你的手掌，輕輕蹭了蹭表示喜歡'
  ],
  tv: [
    '悠悠盯著螢幕看得目不轉睛，偶爾歪頭表達好奇',
    '悠悠坐在你旁邊看電視，時不時拍打尾巴示意你注意精彩畫面'
  ],
  default: [
    '悠悠歪著頭看看你，不太明白但還是可愛地揮了揮爪',
    '悠悠滾了個圈圈，尾巴輕拍地面示意牠聽不懂'
  ]
};

/**
 * Randomly select an element from an array.
 */
function choice (arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Construct a reaction string by combining a base description with a random
 * emoticon and a random sound word. This yields a large number of unique
 * combinations (8 emoticons × 4 sounds × variations of bases).
 */
function buildReaction (base) {
  const emoji = choice(emoticons);
  const sound = choice(sounds);
  return `${base}${emoji}～${sound}`;
}

/**
 * Determine the category of a user interaction message. Simple keyword
 * matching is used here; if no keywords match, returns 'default'.
 */
function getActionCategory (message) {
  if (/(早安|早上好|morning)/i.test(message)) return 'morning';
  if (/(晚安|good\s*night)/i.test(message)) return 'night';
  if (/(摸|撫摸|摸摸|pat)/i.test(message)) return 'pat';
  if (/(看電視|看电视|tv)/i.test(message)) return 'tv';
  return 'default';
}

/**
 * Handle interactive messages that are not numeric adjustments or commands.
 * Generates a rich reaction from 悠悠 based on the detected action category.
 */
function handleInteraction (event, client, message) {
  const data = loadData();
  autoResetIfNewDay(data);
  const category = getActionCategory(message);
  const base = choice(actionBases[category] || actionBases.default);
  const reaction = buildReaction(base);
  return client.replyMessage(event.replyToken, { type: 'text', text: reaction });
}

/* --------------------------------------------------------------------------
 * Functions for adjusting smoking counts and handling commands
 * ------------------------------------------------------------------------ */

/**
 * Adjust today’s smoking count by the provided signed integer amount. Counts
 * never fall below zero. After adjustment, reply with a corresponding
 * reaction. For counts between 1 and 20, a predefined reaction is used; for
 * other counts, a generic comparison message is constructed.
 */
function handleAdjust (event, client, amount) {
  const data = loadData();
  autoResetIfNewDay(data);
  data.today += amount;
  if (data.today < 0) data.today = 0;
  saveData(data);
  let response;
  const n = data.today;
  if (n >= 1 && n <= 20) {
    response = countReactions[n - 1];
  } else if (n === 0) {
    response = '今天還沒抽菸，保持下去！悠悠雙手合掌為你打氣(๑˃̵ᴗ˂̵)و';
  } else {
    response = `今天第 ${n} 支菸。`;
    if (n < data.yesterday) {
      response += `\n比昨天少了 ${data.yesterday - n} 支，不錯喔！`;
    } else if (n === data.yesterday) {
      response += `\n已經跟昨天一樣多了，要克制唷。`;
    } else {
      response += `\n超過昨天了，現在是 ${n} 支。還想拿獎勵嗎？`;
    }
    response += '\n悠悠歪著頭看看你，尾巴在身旁劃圈，似乎在思考(｡･ω･｡)?';
  }
  return client.replyMessage(event.replyToken, { type: 'text', text: response });
}

/**
 * Handle slash commands starting with '/'. Recognised commands include:
 *   /查詢 or /查詢今日 – report today/yesterday counts and streak.
 *   /查詢昨日 – report yesterday’s count only.
 *   /重設 – reset today’s count to zero.
 *   /說明 – provide help text.
 */
async function handleCommand (msg, event, client) {
  const data = loadData();
  autoResetIfNewDay(data);
  // Weather inquiry command: fetch Taipei weather and reply with a report.
  if (msg === '/天氣' || msg.toLowerCase() === '/weather') {
    try {
      const weather = await getTaipeiWeather();
      const report = composeWeatherReport(weather);
      return client.replyMessage(event.replyToken, { type: 'text', text: report });
    } catch (err) {
      return client.replyMessage(event.replyToken, { type: 'text', text: '取得天氣資料失敗。' });
    }
  }
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
      '/說明：顯示這段說明',
      '/天氣 或 /weather：查詢台北市今日氣象',
      '其他訊息將視為對悠悠的互動，牠會以可愛的動作回應喔'
    ].join('\n');
    return client.replyMessage(event.replyToken, { type: 'text', text: help });
  }
  return client.replyMessage(event.replyToken, { type: 'text', text: '無效指令。' });
}

/**
 * Reset today’s count at scheduled time; move today to yesterday and zero it.
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
 * Summarize the day’s results. If today’s count is less than yesterday’s,
 * increment the streak and award a prize (capped by rewards array length).
 * Sends messages via pushMessage including images and text where applicable.
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

module.exports = {
  handleAdjust,
  handleCommand,
  resetDaily,
  summarizeDay,
  handleInteraction,
  getTaipeiWeather,
  composeWeatherReport
};