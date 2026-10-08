import { SOUND_DEFAULT } from './config.js?v=399a5c8957';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keyName = key => String(key).startsWith('gf:') ? String(key) : `gf:${key}`;
let temporaryDevice;
// randomUUID는 https·localhost에서만 있어요. 교실에서 일반 주소로 열어도 번호를 만들 수 있게 해요.
function newDeviceId() {
  try { if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID(); } catch { /* 아래로 */ }
  const bytes = new Uint8Array(16);
  try { globalThis.crypto.getRandomValues(bytes); } catch { for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256); }
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function getJSON(key, fallback) {
  try { const text = globalThis.localStorage.getItem(keyName(key)); return text === null ? fallback : JSON.parse(text); } catch { return fallback; }
}
export function setJSON(key, value) {
  try { const text = JSON.stringify(value); if (text === undefined) return false; globalThis.localStorage.setItem(keyName(key), text); return true; } catch { return false; }
}
export function deviceId() {
  const saved = getJSON('gf:device', null);
  if (typeof saved === 'string' && saved.length) return saved;
  if (!temporaryDevice) temporaryDevice = newDeviceId();
  setJSON('gf:device', temporaryDevice); return temporaryDevice;
}
export function getNametag() {
  const tag = getJSON('gf:nametag', null);
  return object(tag) && typeof tag.schoolCode === 'string' && typeof tag.schoolName === 'string' && Number.isInteger(tag.grade) && tag.grade >= 1 && tag.grade <= 6 && typeof tag.nickname === 'string' ? tag : null;
}
export function setNametag(tag) { return setJSON('gf:nametag', tag); }
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
  return { sfx: typeof prefs.sfx === 'boolean' ? prefs.sfx : SOUND_DEFAULT.sfx, bgm: typeof prefs.bgm === 'boolean' ? prefs.bgm : SOUND_DEFAULT.bgm, filters: { grade: Number.isInteger(filters.grade) && filters.grade >= 0 && filters.grade <= 6 ? filters.grade : 0, subject: typeof filters.subject === 'string' ? filters.subject : '', kind: typeof filters.kind === 'string' ? filters.kind : '' } };
}
export function setPrefs(patch) {
  try { if (!object(patch)) return false; const old = getPrefs(); return setJSON('gf:prefs', { ...old, ...patch, filters: { ...old.filters, ...(object(patch.filters) ? patch.filters : {}) } }); } catch { return false; }
}
export function sessionEntered() { try { return globalThis.sessionStorage.getItem('gf:entered') === '1'; } catch { return false; } }
export function markEntered() { try { globalThis.sessionStorage.setItem('gf:entered', '1'); return true; } catch { return false; } }
