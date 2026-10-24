import { kstDate, kstDayIndex } from '../kit/time-kst.js?v=1179d5aa40';
import { TODAY_LEAD_DAYS } from './config.js?v=1179d5aa40';
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
// 오늘의 도전은 오늘의 게임과 다른 순위 게임으로 고른다(진짜 게임만 남은 10-21, 대문 맨 위 두 칸이 같은 게임이었다). 순위 게임이 하나뿐이면 겹쳐도 그 게임.
export function todaysChallenge(games, ms = Date.now()) {
  const ranked = games.filter(g => g.ranking?.enabled), today = todaysGame(games, ms)?.id;
  return todaysGame(ranked.length > 1 ? ranked.filter(g => g.id !== today) : ranked, ms);
}

export function nextOccasion(games, now=new Date(), limit=60) {
  const ms=Number(now), today=kstDayIndex(ms), year=Number(kstDate(ms).slice(0,4));
  let best=null;
  for(const game of games) for(const occasion of game.occasions??[]) for(const y of [year,year+1]) {
    const date=occasionDate(occasion,y); if(!date) continue;
    const at=Date.parse(`${y}-${date}T00:00:00+09:00`); if(!Number.isFinite(at)||kstDate(at)!==`${y}-${date}`) continue;
    const days=kstDayIndex(at)-today;
    if(days>=0&&days<=limit&&(!best||days<best.days)) best={game,name:occasion.name,days,dday:days};
  }
  return best;
}
