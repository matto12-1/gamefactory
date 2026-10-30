import { kstDate, kstDayIndex } from '../kit/time-kst.js?v=663d2a871e';
import { TODAY_LEAD_DAYS } from './config.js?v=663d2a871e';
export function occasionDate(occasion, year) { return occasion.date ?? occasion.dates?.[String(year)] ?? null; }
const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
export function todaysGame(games, ms = Date.now()) {
  if (!games.length) return null;
  const sorted = [...games].sort(byId);
  const year = Number(kstDate(ms).slice(0, 4)), day = kstDayIndex(ms), candidates = [];
  for (const game of sorted) for (const occasion of game.occasions ?? []) for (const y of [year, year + 1]) {
    const date = occasionDate(occasion, y); if (!date) continue;
    const at = Date.parse(`${y}-${date}T00:00:00+09:00`);
    if (!Number.isFinite(at) || kstDate(at) !== `${y}-${date}`) continue;
    const distance = kstDayIndex(at) - day;
    if (distance >= 0 && distance <= (occasion.leadDays ?? TODAY_LEAD_DAYS)) candidates.push({ game, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance || byId(a.game, b.game));
  return candidates[0]?.game ?? sorted[((day % sorted.length) + sorted.length) % sorted.length];
}
// 오늘의 도전은 오늘의 활동과 다른 순위 게임으로 고른다(진짜 게임만 남은 10-21, 대문 맨 위 두 칸이 같은 게임이었다). 순위 게임이 하나뿐이면 겹쳐도 그 게임.
export function todaysChallenge(games, ms = Date.now()) {
  const ranked = games.filter(g => g.ranking?.enabled), today = todaysGame(games, ms)?.id;
  return todaysGame(ranked.length > 1 ? ranked.filter(g => g.id !== today) : ranked, ms);
}

// 홈 맨 위 넘기기(10-29 저녁 대표 「넘기기 점 + 여러 장」): 첫 장은 오늘의 활동, 그 뒤는 이름 차례로 오늘의 활동 다음 게임부터
// (그래서 날마다 차례가 바뀐다) 오늘의 도전과 겹치지 않는 것을 넉 장까지. 도전 말고 남은 게 없으면 도전도 넣는다.
export function heroSlides(games, ms = Date.now(), max = 4) {
  const today = todaysGame(games, ms); if (!today) return [];
  const sorted = [...games].sort(byId), at = sorted.findIndex(g => g.id === today.id);
  const after = [...sorted.slice(at + 1), ...sorted.slice(0, at)], challenge = todaysChallenge(games, ms)?.id;
  const others = after.filter(g => g.id !== challenge);
  return [today, ...(others.length ? others : after)].slice(0, max);
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
