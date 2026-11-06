export const NICK_MIN = 2, NICK_MAX = 8;
export function normalizeForBadword(s) { return String(s).toLowerCase().replace(/[^가-힣a-z0-9]/g, ''); }
export function parseBadwords(text) {
  return [...new Set(text.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(normalizeForBadword).filter(Boolean))];
}
export function checkNickname(nick, badwords = []) {
  if (typeof nick !== 'string') return { ok: false, reason: 'chars' };
  const value = nick.trim();
  const length = [...value].length;
  if (length < NICK_MIN || length > NICK_MAX) return { ok: false, reason: 'length' };
  if (/[ㄱ-ㅣ]/.test(value)) return { ok: false, reason: 'jamo' };
  if (!/^[가-힣a-zA-Z0-9]+$/.test(value)) return { ok: false, reason: 'chars' };
  const normalized = normalizeForBadword(value), noDigits = normalized.replace(/[0-9]/g, '');
  // 숫자를 끼워 넣은 우회(씨1발)도 잡아요.
  if (badwords.some(word => { const w = normalizeForBadword(word); return w && (normalized.includes(w) || noDigits.includes(w)); })) return { ok: false, reason: 'badword' };
  return { ok: true, value };
}
