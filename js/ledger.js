import { LEDGER_URL, LEDGER_TIMEOUT_MS, SCORE_TIMEOUT_MS } from './config.js?v=663d2a871e';
import { deviceId } from './store.js?v=663d2a871e';
async function request(path, { body, token, timeoutMs = LEDGER_TIMEOUT_MS } = {}) {
  const controller = new AbortController(); let timer;
  try {
    const timeout = new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve({ ok: false, error: 'offline' }); }, timeoutMs); });
    const response = (async () => {
      const r = await fetch(`${LEDGER_URL.replace(/\/$/, '')}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
      if (r.status >= 500) return { ok: false, error: 'offline' };
      const data = await r.json();
      if (!data || typeof data.ok !== 'boolean' || (!r.ok && data.ok)) return { ok: false, error: 'offline' };
      return data;
    })().catch(() => ({ ok: false, error: 'offline' }));
    return await Promise.race([timeout, response]);
  } catch { return { ok: false, error: 'offline' }; }
  finally { clearTimeout(timer); }
}
export const rankingPlay = game => game?.ranking?.play ?? 'quick';
// 모드를 말하지 않고 시작할 때의 모드. 순위 모드를 정한 게임(분리배출 공장: 빠른 판 없음)만 GFModes 기본값을 쓰고, 다른 활동은 예전처럼 빠른 판이다(버티기 모험 판의 순위가 빠른 판으로 모인다).
export const startPlay = game => !game?.ranking?.play || game.modeKit?.quick ? 'quick' : game.modeKit?.stage ? 'stage' : game.modeKit?.endless ? 'endless' : 'quick';
export const rankingPlays = game => game?.ranking?.play ? [game.ranking.play] : ['quick','endless','stage'];
export const rankedResult = (game, play, result) => game.ranking?.play ? play === game.ranking.play && (result?.ranked ?? true) : result?.ranked ?? (play !== 'stage' || result?.stage === 10);
export async function startRun(game, mode, play = startPlay(game), stage) { return request('/run', { body: { game: typeof game === 'object' ? game.id : game, mode, play, stage } }); }
export async function submitScore({ token, score, name, dryRun, game, play = rankingPlay(game) }) {
  try { return await request('/score', { body: { token, score, name, dryRun, play, device: deviceId() }, timeoutMs: SCORE_TIMEOUT_MS }); } catch { return { ok: false, error: 'offline' }; }
}
export async function getRank({ game, period, grade = 0, limit = 50, play = rankingPlay(game) }) { return request(`/rank?${new URLSearchParams({ game: typeof game === 'object' ? game.id : game, period, grade, limit, play })}`); }
export async function getSchools() { return request('/schools'); }
export async function getPopular(limit = 10) { return request(`/popular?${new URLSearchParams({ limit })}`); }
export const admin = {
  recent(token, limit = 100) { return request(`/admin/recent?${new URLSearchParams({ limit })}`, { token }); },
  hide(token, id, hidden) { return request('/admin/hide', { token, body: { id, hidden } }); },
  ban(token, kind, value) { return request('/admin/ban', { token, body: { kind, value } }); },
  plays(token, days = 7) { return request(`/admin/plays?${new URLSearchParams({ days })}`, { token }); }
};
