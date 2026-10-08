(function () {
  'use strict';
  if (window.GF) return;
  const params = new URLSearchParams(window.location.search);
  const integer = name => { const s = params.get(name); return s !== null && s.trim() !== '' && Number.isSafeInteger(Number(s)) ? Number(s) : null; };
  let inFrame = false;
  try { inFrame = window.parent !== window && window.parent.location.origin === window.location.origin; } catch { inFrame = false; }
  const gameId = params.get('g') || window.location.pathname.match(/\/games\/([^/]+)\//)?.[1] || window.location.pathname.split('/').pop() || 'game';
  const listeners = { pause: [], resume: [], sound: [], goal: [] }, pending = new Map(); let sequence = 0, goal;
  const send = (type, extra = {}) => { if (inFrame) window.parent.postMessage({ gf: 1, type, ...extra }, window.location.origin); };
  const grade = integer('grade'), sim = Number(params.get('sim'));
  window.GF = {
    mode: ['solo','duo','tv'].includes(params.get('m')) ? params.get('m') : 'solo',
    grade: grade >= 1 && grade <= 6 ? grade : null,
    seed: integer('seed'), sim: Number.isFinite(sim) && sim >= 0 ? sim : 0,
    gameId, inFrame, sound: params.get('sound') !== '0',
    ready() { send('ready'); },
    start() {
      if (!inFrame) return Promise.resolve();
      return new Promise(resolve => {
        const reqId = `${gameId}:${++sequence}`;
        const finish = () => { const p = pending.get(reqId); if (!p) return; clearTimeout(p.timer); pending.delete(reqId); resolve(); };
        // 일반 스크립트도 단독 실행되므로 메시지 약속의 3초 상한을 지켜요.
        const timer = setTimeout(finish, 3000);
        pending.set(reqId, { timer, finish }); send('start', { reqId });
      });
    },
    finish({ score } = {}) {
      if (score !== undefined && (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > Number.MAX_SAFE_INTEGER)) { window.console.warn('점수를 확인해 주세요'); return; }
      send('finish', score === undefined ? {} : { score: Math.floor(score) });
    },
    stamp(id) { send('stamp', { id }); },
    save(obj) {
      try { const text = JSON.stringify(obj); if (text === undefined || new TextEncoder().encode(text).length > 1024 * 1024) return false; window.localStorage.setItem(`gf:save:${gameId}`, text); return true; }
      catch { return false; }
    },
    load() { try { return JSON.parse(window.localStorage.getItem(`gf:save:${gameId}`)) ?? null; } catch { return null; } },
    exit() { send('exit'); },
    on(type, fn) {
      if (!listeners[type] || typeof fn !== 'function') return;
      listeners[type].push(fn);
      if (type === 'goal' && goal !== undefined) { const top = goal; setTimeout(() => fn({ top }), 0); }
    }
  };
  window.addEventListener('message', event => {
    if (!inFrame || event.origin !== window.location.origin || event.source !== window.parent || event.data?.gf !== 1) return;
    const message = event.data;
    if (message.type === 'start-ok') pending.get(message.reqId)?.finish();
    else if (message.type === 'sound') {
      if (typeof message.on !== 'boolean') return;
      window.GF.sound = message.on;
      for (const fn of listeners.sound) fn({ on: message.on });
    } else if (message.type === 'goal') {
      if (message.top !== null && (!Number.isSafeInteger(message.top) || message.top < 0)) return;
      goal = message.top;
      for (const fn of listeners.goal) fn({ top: goal });
    } else if (message.type === 'pause' || message.type === 'resume') for (const fn of listeners[message.type]) fn();
  });
})();
