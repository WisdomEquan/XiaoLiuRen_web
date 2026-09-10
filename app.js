const GUA = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];
const SHICHEN = ["子时", "丑时", "寅时", "卯时", "辰时", "巳时", "午时", "未时", "申时", "酉时", "戌时", "亥时"];

function shichenIndex(hour) {
  if (hour === 23 || hour === 0) return 1;
  return Math.floor((hour - 1) / 2) + 2;
}

function parseChineseNumber(s) {
  const direct = {
    "正": 1, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
    "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12,
    "十三": 13, "十四": 14, "十五": 15, "十六": 16, "十七": 17, "十八": 18,
    "十九": 19, "二十": 20, "廿一": 21, "廿二": 22, "廿三": 23, "廿四": 24,
    "廿五": 25, "廿六": 26, "廿七": 27, "廿八": 28, "廿九": 29,
    "三十": 30
  };
  if (direct[s] !== undefined) return direct[s];
  if (/^\d+$/.test(s)) return Number(s);
  if (s.startsWith("闰")) return parseChineseNumber(s.slice(1));
  throw new Error("无法解析农历字段：" + s);
}

// 部分浏览器的 Intl 中国农历实现不会返回 relatedYear，而是返回干支年名。
// 将干支年名换算成对应的农历年份，避免出现“undefined年”。
function cyclicalYearToGregorianYear(name, solarYear) {
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const branches = "子丑寅卯辰巳午未申酉戌亥";
  const m = String(name).match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
  if (!m) return null;
  const text = m[0];
  const stem = stems.indexOf(text[0]);
  const branch = branches.indexOf(text[1]);
  const cycleIndex = Array.from({length: 60}, (_, i) => i).find(i => i % 10 === stem && i % 12 === branch);
  if (cycleIndex === undefined) return null;
  for (const y of [solarYear - 1, solarYear, solarYear + 1]) {
    if (((y - 4) % 60 + 60) % 60 === cycleIndex) return y;
  }
  return null;
}

function getLunarYear(parts, solarYear) {
  const related = parts.find(p => p.type === "relatedYear")?.value;
  if (related && /^\d+$/.test(related)) return Number(related);

  const year = parts.find(p => p.type === "year")?.value;
  if (year && /^\d+$/.test(year)) return Number(year);

  const yearName = parts.find(p => p.type === "yearName")?.value || year;
  const cyclical = cyclicalYearToGregorianYear(yearName, solarYear);
  if (cyclical !== null) return cyclical;

  // 最后兜底：不会再产生 undefined；对于无法提供年份字段的极少数实现，
  // 使用公历年份作为显示值。
  return solarYear;
}

function lunarFromSolar(year, month, day) {
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    year: "numeric", month: "numeric", day: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const get = type => parts.find(p => p.type === type)?.value;
  const monthText = get("month") || "";
  const dayText = get("day") || "";
  const lunarYear = getLunarYear(parts, year);
  const lunarMonth = parseChineseNumber(monthText.replace(/月$/, ""));
  const lunarDay = parseChineseNumber(dayText.replace(/日$/, ""));
  return { lunarYear, lunarMonth, lunarDay, leap: monthText.includes("闰") };
}

function pan(lunarMonth, lunarDay, hour) {
  // 大安是第1位。天从大安起按农历月数；地从天位重新计1按农历日数；
  // 人从地位重新计1按十二时辰序号。
  const tian = (lunarMonth - 1) % 6;
  const di = (tian + lunarDay - 1) % 6;
  const ren = (di + shichenIndex(hour) - 1) % 6;
  return { tian: GUA[tian], di: GUA[di], ren: GUA[ren], shichen: SHICHEN[shichenIndex(hour) - 1] };
}

function solarText(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日${String(d.getHours()).padStart(2,"0")}时${String(d.getMinutes()).padStart(2,"0")}分${String(d.getSeconds()).padStart(2,"0")}秒`;
}

function lunarText(l, shichen) {
  return `农历${l.leap ? "闰" : ""}${l.lunarMonth}月${l.lunarDay}日${shichen}`;
}

function parseInput(text) {
  const m = text.replace(/\s+/g, "").match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) throw new Error("请输入阳历时间，格式：2025.12.11.21");
  const [_, y, mo, d, h] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23) throw new Error("阳历时间无效");
  const date = new Date(y, mo - 1, d, h, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d || date.getHours() !== h) throw new Error("阳历时间无效");
  return date;
}

function updateLunarAndPan(date) {
  const lunar = lunarFromSolar(date.getFullYear(), date.getMonth()+1, date.getDate());
  const p = pan(lunar.lunarMonth, lunar.lunarDay, date.getHours());
  document.querySelector("#lunar").textContent = `${lunar.lunarYear}年${lunarText(lunar, p.shichen)}`;
  document.querySelector("#result").textContent = `天：${p.tian}、地：${p.di}、人：${p.ren}`;
}

const referenceNow = new Date();
document.querySelector("#solar").textContent = solarText(referenceNow);
updateLunarAndPan(referenceNow);

document.querySelector("#input").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  try {
    updateLunarAndPan(parseInput(event.target.value));
  } catch (e) {
    alert(e.message);
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=3').catch(() => {});
