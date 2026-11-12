import { kstDate, kstDayIndex } from '../kit/time-kst.js?v=bb38d3d327';

export const NEW_ACTIVITY_DAYS = 14;

// 공개일과 보는 날을 모두 한국 날짜로 센다. 빌드 날짜나 손 꼬리표는 쓰지 않는다.
export function isNewActivity(game, now = Date.now()) {
  if (typeof game.released !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(game.released)) return false;
  const releasedAt = Date.parse(`${game.released}T00:00:00+09:00`);
  if (!Number.isFinite(releasedAt) || kstDate(releasedAt) !== game.released) return false;
  const days = kstDayIndex(now) - kstDayIndex(releasedAt);
  return days >= 0 && days <= NEW_ACTIVITY_DAYS;
}
