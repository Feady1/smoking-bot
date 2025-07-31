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
/**
 * Fetch detailed weather and air quality data for Taipei City using the
 * Open‑Meteo Weather and Air Quality APIs.  In addition to the current
 * conditions and daily maximum/minimum temperatures, this function also
 * retrieves the next six hours of temperature, relative humidity and
 * precipitation probability along with air quality indices including UV
 * index and fine particulate concentrations.  All values are averaged or
 * summarised to present a concise overview.  The function returns a
 * promise that resolves to an object with the following properties:
 *   currentTemp – current temperature in °C
 *   max – daily maximum temperature
 *   min – daily minimum temperature
 *   codeDesc – Chinese description of the current weather code
 *   nextMax – maximum temperature over the next six hours
 *   nextMin – minimum temperature over the next six hours
 *   avgHumidity – average relative humidity (%) over the next six hours
 *   avgPrecip – average precipitation probability (%) over the next six hours
 *   uvIndex – current UV index
 *   pm25 – current PM2.5 concentration (µg/m³)
 *   pm10 – current PM10 concentration (µg/m³)
 */
function getTaipeiWeather () {
  // Endpoint for weather forecast with hourly variables: temperature, humidity and precipitation probability.
  const weatherUrl =
    'https://api.open-meteo.com/v1/forecast?latitude=25.0478&longitude=121.5319&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&forecast_hours=6&timezone=Asia%2FTaipei';
  // Endpoint for air quality including UV index and particulate matter for the next six hours.
  const airUrl =
    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=25.0478&longitude=121.5319&hourly=uv_index,pm2_5,pm10&forecast_hours=6&timezone=Asia%2FTaipei';
  // Helper to perform HTTPS GET and parse JSON.
  function fetchJSON (url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, res => {
          let body = '';
          res.on('data', chunk => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', err => reject(err));
    });
  }
  return Promise.all([fetchJSON(weatherUrl), fetchJSON(airUrl)]).then(([w, a]) => {
    // Extract current weather and daily max/min.
    const currTemp = w.current_weather.temperature;
    const code = w.current_weather.weathercode;
    const max = w.daily.temperature_2m_max[0];
    const min = w.daily.temperature_2m_min[0];
    const desc = weatherCodeMap[code] || `代碼 ${code}`;
    // Extract next 6 hours hourly arrays (length may be less than 6 if API returns shorter horizon).
    const temps = (w.hourly.temperature_2m || []).slice(0, 6);
    const hums = (w.hourly.relativehumidity_2m || []).slice(0, 6);
    const precs = (w.hourly.precipitation_probability || []).slice(0, 6);
    const nextMax = temps.length ? Math.max(...temps) : null;
    const nextMin = temps.length ? Math.min(...temps) : null;
    const avgHumidity = hums.length
      ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length)
      : null;
    const avgPrecip = precs.length
      ? Math.round(precs.reduce((a, b) => a + b, 0) / precs.length)
      : null;
    // Air quality: take first hour as representative for current values.
    const uvIndex = a.hourly && a.hourly.uv_index ? a.hourly.uv_index[0] : null;
    const pm25 = a.hourly && a.hourly.pm2_5 ? a.hourly.pm2_5[0] : null;
    const pm10 = a.hourly && a.hourly.pm10 ? a.hourly.pm10[0] : null;
    return {
      currentTemp: currTemp,
      max,
      min,
      codeDesc: desc,
      nextMax,
      nextMin,
      avgHumidity,
      avgPrecip,
      uvIndex,
      pm25,
      pm10
    };
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
  // Build lines for the detailed report.  Only include optional values when available.
  const lines = [];
  lines.push(`台北市今日天氣：${weather.codeDesc}。`);
  lines.push(`現在溫度 ${weather.currentTemp}°C，最高 ${weather.max}°C，最低 ${weather.min}°C。`);
  // Add next‑6‑hour summary if we have temperature range.
  if (weather.nextMin != null && weather.nextMax != null) {
    lines.push(`未來6小時氣溫範圍 ${weather.nextMin}°C～${weather.nextMax}°C。`);
  }
  // Add humidity and precipitation probability.
  if (weather.avgPrecip != null) {
    lines.push(`平均降雨機率 ${weather.avgPrecip}%` + (weather.avgHumidity != null ? `，平均濕度 ${weather.avgHumidity}%` : '') + '。');
  } else if (weather.avgHumidity != null) {
    lines.push(`平均濕度 ${weather.avgHumidity}%。`);
  }
  // Add UV index and particulate matter if available.
  if (weather.uvIndex != null) {
    lines.push(`紫外線指數 ${weather.uvIndex}` + (weather.pm25 != null ? `，PM2.5 ${weather.pm25}µg/m³` : '') + (weather.pm10 != null ? `，PM10 ${weather.pm10}µg/m³` : '') + '。');
  } else if (weather.pm25 != null || weather.pm10 != null) {
    const aq = [];
    if (weather.pm25 != null) aq.push(`PM2.5 ${weather.pm25}µg/m³`);
    if (weather.pm10 != null) aq.push(`PM10 ${weather.pm10}µg/m³`);
    lines.push(aq.join('，') + '。');
  }
  return lines.join('\n') + '\n' + reaction;
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
  // 呼喊名字時的反應
  name: [
    '悠悠聽到你叫牠名字，眨了眨眼，翻了個身抱著尾巴繼續打瞌睡',
    '悠悠抬起頭，耳朵動了動，用小爪子拍拍自己的胸口像是在回答'
  ],
  // 給點心或餵食時的反應
  feed: [
    '悠悠聞到點心的味道，眼睛瞬間亮了起來，雙手抱住點心啃啃啃',
    '悠悠伸出小爪子接過點心，尾巴開心地左右搖晃，嘴裡發出啾啾聲'
  ],
  // 擁抱或抱抱時的反應
  hug: [
    '悠悠被你抱在懷裡，乖乖地窩著，偶爾用小爪子拍拍你的手臂',
    '悠悠用尾巴纏住你的手臂，眼睛眯起來，一臉滿足地蹭著你'
  ],
  // 睡覺或打瞌睡相關的反應
  sleep: [
    '悠悠打了個大哈欠，伸展四肢後蜷縮成團慢慢閉上眼睛',
    '悠悠抱著自己的尾巴，眼皮越來越沉，最後發出均勻的呼吸聲睡著了'
  ],
  // 玩耍或逗弄時的反應
  play: [
    '悠悠興奮地在水面上撲騰，尾巴不時拍出水花，邀請你一起玩',
    '悠悠翻來覆去，抓起小石頭拋向空中又用爪子接住，玩得不亦樂乎'
  ],
  // 吃東西相關的反應
  eat: [
    '悠悠咬著小魚干，臉頰鼓鼓的，吃得津津有味',
    '悠悠拿起貝殼當盤子，慢慢品嚐著點心，偶爾抬眼看看你',
    '悠悠抱著食物啃啃啃，尾巴滿足地擺動'
  ],
  // 喝水相關的反應
  drink: [
    '悠悠捧起清水，嗅了嗅後慢慢啜飲，發出滿足的嘟嚕聲',
    '悠悠用爪子舀水喝，喝完打了個嗝，像是在說謝謝',
    '悠悠一邊喝水一邊用尾巴拍出水花，玩的很開心'
  ],
  // 運動或跑步相關的反應
  exercise: [
    '悠悠在水面上快速划動，小爪子撥水像是在運動',
    '悠悠跑來跑去，尾巴左右擺動，整個人活力十足',
    '悠悠伸展四肢做運動，最後躺下喘口氣'
  ],
  // 跳舞相關的反應
  dance: [
    '悠悠隨著無形的音樂在水中扭動，像是在跳舞',
    '悠悠站起來兩腳踩水，跟著節奏擺尾，很有節奏感',
    '悠悠雙爪交叉拍掌，轉圈圈跳起舞蹈'
  ],
  // 唱歌相關的反應
  sing: [
    '悠悠張開嘴巴發出啾啾聲，像在唱歌',
    '悠悠閉上眼睛輕哼著，尾巴隨節奏晃動',
    '悠悠拍著胸口發出和諧的音節，好像在演奏'
  ],
  // 看書閱讀相關的反應
  read: [
    '悠悠盯著書本的字，看得很認真，偶爾翻動頁面',
    '悠悠拿著一本小冊子，爪子指著字慢慢學習',
    '悠悠靠著枕頭看書，眼神專注，尾巴微微搖擺'
  ],
  // 畫畫相關的反應
  draw: [
    '悠悠用爪子在沙地上畫出圖案，畫完欣賞自己的作品',
    '悠悠抓起小石子當筆，在濕沙上畫畫，畫出可愛的心形',
    '悠悠把海藻排列成圖案，像在創作藝術'
  ],
  // 打掃或清潔相關的反應
  clean: [
    '悠悠用尾巴掃拂著身邊的沙子，把小窩整理乾淨',
    '悠悠拿起小刷子刷著自己的毛，打理得乾乾淨淨',
    '悠悠把貝殼堆疊整齊，整理完拍拍手滿意地點頭'
  ],
  // 工作相關的反應
  work: [
    '悠悠戴上小帽子，專注地忙著整理自己的藏寶箱',
    '悠悠仔細檢查每一顆貝殼，就像在專心工作',
    '悠悠在水中來回搬運小石頭，嘴裡發出努力的啾啾聲'
  ],
  // 購物或逛街相關的反應
  shop: [
    '悠悠抱著一堆貝殼像是在購物，挑挑選選',
    '悠悠看到漂亮的石頭興奮地拿起來，像是在逛街',
    '悠悠拿著小袋子裝滿小零食，開心地回家'
  ],
  // 烹飪相關的反應
  cook: [
    '悠悠把海藻和貝殼放在一起攪拌，像在做料理',
    '悠悠認真地用爪子捏著小魚干，做成漂亮的擺盤',
    '悠悠一邊烹飪一邊偷吃材料，眼睛眯成一條線'
  ],
  // 學習或讀書相關的反應
  study: [
    '悠悠戴著眼鏡記筆記，努力學習新知識',
    '悠悠把耳朵貼近書本，似乎想聽懂裡面的聲音',
    '悠悠看著教科書皺眉，尾巴拍打水面彷彿在思考'
  ],
  // 冥想或靜坐相關的反應
  meditate: [
    '悠悠閉上眼睛，雙爪合十，在水中靜靜冥想',
    '悠悠盤著尾巴，深呼吸放鬆，周圍氣氛平靜',
    '悠悠坐在石頭上沉思，偶爾發出柔和的啾聲'
  ],
  // 上網或滑手機相關的反應
  surf: [
    '悠悠用爪子敲敲貝殼，就像在上網搜尋東西',
    '悠悠盯著漂浮的海草，看得入神，像在刷社群',
    '悠悠滑動小石頭，翻看貝殼，就像在滑手機'
  ],
  // 旅行或冒險相關的反應
  travel: [
    '悠悠背著小包包，踏出小窩像要去冒險',
    '悠悠坐在漂浮的木頭上，眺望遠方像在旅行',
    '悠悠揮手告別，跳入水中展開新的旅程'
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
  // Detect calling the otter's name or similar phrases
  if (/(名字|叫悠悠|叫牠|叫你|呼喚)/i.test(message)) return 'name';
  // Detect feeding or giving snacks/food
  if (/(點心|餵|零食|食物|snack)/i.test(message)) return 'feed';
  // Detect hugging or cuddling actions
  if (/(抱抱|擁抱|抱你|抱緊)/i.test(message)) return 'hug';
  // Detect sleep related actions
  if (/(睡覺|打瞌睡|睡一下|sleep|nap)/i.test(message)) return 'sleep';
  // Detect play or game actions
  if (/(玩|遊戲|play|逗弄|耍|逗)/i.test(message)) return 'play';
  // Detect eating actions
  if (/(吃飯|吃東西|吃|用餐)/i.test(message)) return 'eat';
  // Detect drinking actions
  if (/(喝水|喝飲料|喝|飲)/i.test(message)) return 'drink';
  // Detect exercise or running
  if (/(運動|跑步|散步|健身|走路)/i.test(message)) return 'exercise';
  // Detect dancing
  if (/(跳舞|舞蹈|跳|舞)/i.test(message)) return 'dance';
  // Detect singing
  if (/(唱歌|唱|歌)/i.test(message)) return 'sing';
  // Detect reading
  if (/(看書|閱讀|讀書|書)/i.test(message)) return 'read';
  // Detect drawing or painting
  if (/(畫畫|畫圖|繪畫|畫)/i.test(message)) return 'draw';
  // Detect cleaning or washing
  if (/(打掃|清理|清潔|掃地|洗澡)/i.test(message)) return 'clean';
  // Detect working
  if (/(工作|上班|辦公)/i.test(message)) return 'work';
  // Detect shopping
  if (/(購物|買東西|逛街|shopping|買)/i.test(message)) return 'shop';
  // Detect cooking
  if (/(烹飪|煮飯|做菜|料理)/i.test(message)) return 'cook';
  // Detect studying
  if (/(學習|念書|study)/i.test(message)) return 'study';
  // Detect meditation
  if (/(冥想|靜坐|meditate)/i.test(message)) return 'meditate';
  // Detect surfing/internet usage
  if (/(上網|滑手機|用手機|internet|社群)/i.test(message)) return 'surf';
  // Detect travelling
  if (/(旅行|旅遊|出門|遠足|外出)/i.test(message)) return 'travel';
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
      '/天氣 或 /weather：查詢台北市今日氣象與未來 6 小時概況（溫度、降雨、濕度、紫外線、空氣品質）',
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
async function summarizeDay (client) {
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
  try {
    await client.pushMessage(process.env.USER_ID, messages);
    console.log('日結訊息發送完畢');
  } catch (err) {
    console.error('推送日結訊息失敗', err);
  }
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