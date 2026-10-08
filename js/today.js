import { kstDate, kstDayIndex } from '../kit/time-kst.js?v=399a5c8957';
import { TODAY_LEAD_DAYS } from './config.js?v=399a5c8957';
export function occasionDate(occasion, year) { return occasion.date ?? occasion.dates?.[String(year)] ?? null; }
export function todaysGame(games, ms = Date.now()) {
  if (!games.length) return null;
  const sorted = [...games].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const year = Number(kstDate(ms).slice(0, 4)), day = kstDayIndex(ms), candidates = [];
  for (const game of sorted) for (const occasion of game.occasions ?? []) for (const y of [year, year + 1]) {
    const date = occasionDate(occasion, y); if (!date) continue;
    const at = Date.parse(`${y}-${date}T00:00:00+09:00`);
    if (!Number.isFinite(at) || kstDate(at) !== `${y}-${date}`) continue;
    const distance = kstDayIndex(at) - day;
    if (distance >= 0 && distance <= (occasion.leadDays ?? TODAY_LEAD_DAYS)) candidates.push({ game, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance || (a.game.id < b.game.id ? -1 : a.game.id > b.game.id ? 1 : 0));
  return candidates[0]?.game ?? sorted[((day % sorted.length) + sorted.length) % sorted.length];
}
export function todaysChallenge(games, ms = Date.now()) { return todaysGame(games.filter(g => g.ranking?.enabled), ms); }
