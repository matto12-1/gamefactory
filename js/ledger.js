import { LEDGER_URL, LEDGER_TIMEOUT_MS, SCORE_TIMEOUT_MS } from './config.js?v=1179d5aa40';
import { deviceId } from './store.js?v=1179d5aa40';
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
export async function startRun(game, mode, play = 'quick', stage) { return request('/run', { body: { game, mode, play, stage } }); }
export async function submitScore({ token, score, name, dryRun, play = 'quick' }) {
  try { return await request('/score', { body: { token, score, name, dryRun, play, device: deviceId() }, timeoutMs: SCORE_TIMEOUT_MS }); } catch { return { ok: false, error: 'offline' }; }
}
export async function getRank({ game, period, grade = 0, limit = 50, play = 'quick' }) { return request(`/rank?${new URLSearchParams({ game, period, grade, limit, play })}`); }
export async function getSchools() { return request('/schools'); }
export async function getPopular(limit = 10) { return request(`/popular?${new URLSearchParams({ limit })}`); }
export const admin = {
  recent(token, limit = 100) { return request(`/admin/recent?${new URLSearchParams({ limit })}`, { token }); },
  hide(token, id, hidden) { return request('/admin/hide', { token, body: { id, hidden } }); },
  ban(token, kind, value) { return request('/admin/ban', { token, body: { kind, value } }); },
  plays(token, days = 7) { return request(`/admin/plays?${new URLSearchParams({ days })}`, { token }); }
};
