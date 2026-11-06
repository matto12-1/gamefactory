const DAY = 86400000, OFFSET = 9 * 3600000;
// Date를 그대로 더하면 글자 이어 붙이기가 된다(사파리는 Invalid Date로 멈춘다). 숫자로 바꿔 센다.
const at = ms => Number(ms) + OFFSET;
export function kstDayIndex(ms = Date.now()) { return Math.floor(at(ms) / DAY); }
export function kstDate(ms = Date.now()) { return new Date(at(ms)).toISOString().slice(0, 10); }
export function kstHour(ms = Date.now()) { return new Date(at(ms)).getUTCHours(); }
export function kstWeek(ms = Date.now()) {
  const date = new Date(at(ms));
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
