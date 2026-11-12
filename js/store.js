import { SOUND_DEFAULT } from './config.js?v=bb38d3d327';
import { parseRecent, pushRecent, seedRecent, pickBest } from './recent.js?v=bb38d3d327';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keyName = key => String(key).startsWith('gf:') ? String(key) : `gf:${key}`;
export function getJSON(key, fallback) {
  try { const text = globalThis.localStorage.getItem(keyName(key)); return text === null ? fallback : JSON.parse(text); } catch { return fallback; }
}
export function setJSON(key, value) {
  try { const text = JSON.stringify(value); if (text === undefined) return false; globalThis.localStorage.setItem(keyName(key), text); return true; } catch { return false; }
}
export function getRankRecords(now = Date.now()) {
  const rows = getJSON('gf:rank-records', []);
  return Array.isArray(rows) ? rows.filter(r => object(r) && typeof r.game === 'string' && ['quick', 'endless', 'stage'].includes(r.play) && Number.isSafeInteger(r.score) && Number.isSafeInteger(r.at) && r.at >= now - 90 * 86400000).slice(-500) : [];
}
export function rememberRank(record) {
  return setJSON('gf:rank-records', [...getRankRecords(), record].slice(-500));
}
export function isOwnRank(game, play, row) {
  return getRankRecords().some(r => r.game === game && r.play === play && r.score === row.score && r.at === row.at);
}
export function getStamps() {
  const raw = getJSON('gf:stamps', {}), result = {};
  if (object(raw)) for (const [game, stamps] of Object.entries(raw)) if (object(stamps)) Object.defineProperty(result, game, { enumerable: true, configurable: true, writable: true, value: Object.fromEntries(Object.entries(stamps).filter(([, date]) => typeof date === 'string')) });
  return result;
}
export function addStamp(gameId, stampId) {
  try {
    const stamps = getStamps(); const existing = Object.hasOwn(stamps, gameId) ? stamps[gameId] : {};
    if (Object.hasOwn(existing, stampId)) return false;
    return setJSON('gf:stamps', { ...stamps, [gameId]: { ...existing, [stampId]: new Date().toISOString() } });
  } catch { return false; }
}
export function getPrefs() {
  const saved = getJSON('gf:prefs', {}), prefs = object(saved) ? saved : {};
  const filters = object(prefs.filters) ? prefs.filters : {};
  return { volume: [.2,.35,.5].includes(prefs.volume) ? prefs.volume : .35, sfx: typeof prefs.sfx === 'boolean' ? prefs.sfx : SOUND_DEFAULT.sfx, bgm: typeof prefs.bgm === 'boolean' ? prefs.bgm : SOUND_DEFAULT.bgm, filters: { grade: Number.isInteger(filters.grade) && filters.grade >= 0 && filters.grade <= 6 ? filters.grade : 0, subject: typeof filters.subject === 'string' ? filters.subject : '', kind: typeof filters.kind === 'string' ? filters.kind : '' } };
}
export function setPrefs(patch) {
  try { if (!object(patch)) return false; const old = getPrefs(); return setJSON('gf:prefs', { ...old, ...patch, filters: { ...old.filters, ...(object(patch.filters) ? patch.filters : {}) } }); } catch { return false; }
}
export function sessionEntered() { try { return globalThis.sessionStorage.getItem('gf:entered') === '1'; } catch { return true; } }
export function markEntered() { try { globalThis.sessionStorage.setItem('gf:entered', '1'); return true; } catch { return false; } }

function storageEntries() {
  try { const s=globalThis.localStorage; return Array.from({length:s.length},(_,i)=>s.key(i)).filter(Boolean).map(k=>[k,s.getItem(k)]); } catch { return []; }
}
export function getRecent(games) {
  let raw; try { raw=globalThis.localStorage.getItem('gf:recent'); } catch { return []; }
  const list=raw===null?seedRecent(games,storageEntries().map(([k])=>k)):parseRecent(raw);
  const known=new Set(games.map(g=>g.id)), result=list.filter(x=>known.has(x.id));
  if(raw===null) setJSON('gf:recent',result);
  return result;
}
export function addRecent(id,at=Date.now()) {
  let raw; try { raw=globalThis.localStorage.getItem('gf:recent'); } catch { return false; }
  return setJSON('gf:recent',pushRecent(parseRecent(raw),id,at));
}
export function bestScore(id) { return pickBest(id,storageEntries()); }
