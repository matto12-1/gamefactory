import { LEDGER_URL, LEDGER_TIMEOUT_MS, SCORE_TIMEOUT_MS } from './config.js?v=399a5c8957';
import { deviceId } from './store.js?v=399a5c8957';
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
export async function startRun(game, mode) { return request('/run', { body: { game, mode } }); }
export async function submitScore({ token, score, name, dryRun }) {
  try { return await request('/score', { body: { token, score, name, dryRun, device: deviceId() }, timeoutMs: SCORE_TIMEOUT_MS }); } catch { return { ok: false, error: 'offline' }; }
}
export async function getRank({ game, period, grade = 0, limit = 50 }) { return request(`/rank?${new URLSearchParams({ game, period, grade, limit })}`); }
export async function getSchools() { return request('/schools'); }
export const admin = {
  recent(token, limit = 100) { return request(`/admin/recent?${new URLSearchParams({ limit })}`, { token }); },
  hide(token, id, hidden) { return request('/admin/hide', { token, body: { id, hidden } }); },
  ban(token, kind, value) { return request('/admin/ban', { token, body: { kind, value } }); },
  plays(token, days = 7) { return request(`/admin/plays?${new URLSearchParams({ days })}`, { token }); }
};
