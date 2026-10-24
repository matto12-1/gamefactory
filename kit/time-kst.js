const DAY = 86400000, OFFSET = 9 * 3600000;
export function kstDayIndex(ms = Date.now()) { return Math.floor((ms + OFFSET) / DAY); }
export function kstDate(ms = Date.now()) { return new Date(ms + OFFSET).toISOString().slice(0, 10); }
export function kstHour(ms = Date.now()) { return new Date(ms + OFFSET).getUTCHours(); }
export function kstWeek(ms = Date.now()) {
  const date = new Date(ms + OFFSET);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
