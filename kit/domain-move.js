(function (root) {
  'use strict';
  // One source for both origins. tools/build.mjs ships this as kit/domain-move.js.
  const OLD_HOST = 'game.matto.kr', NEW_ORIGIN = 'https://land.matto.kr';
  const MAX_BYTES = 512 * 1024, MAX_ENCODED = Math.ceil(MAX_BYTES / 3) * 4;
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const integer = x => Number.isSafeInteger(x) && x >= 0;
  const copy = x => Object.assign(Object.create(null), x);
  const parse = raw => { try { return JSON.parse(raw); } catch { return undefined; } };
  const union = (a, b) => [...new Set([...a, ...b])].sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
  function valid(payload) {
    return object(payload) && payload.v === 1 && payload.from === OLD_HOST && integer(payload.at)
      && object(payload.items) && Object.keys(payload.items).length <= 4096
      && Object.entries(payload.items).every(([k, v]) => k.length <= 1024 && typeof v === 'string')
      && (payload.hash === undefined || typeof payload.hash === 'string');
  }
  function packAll(items, hash = '', at = Date.now()) {
    try {
      const payload = { v: 1, from: OLD_HOST, at, items, ...(hash ? { hash: hash.replace(/^#/, '') } : {}) };
      if (!valid(payload)) return null;
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      if (bytes.length > MAX_BYTES) return null;
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch { return null; }
  }
  function unpack(raw) {
    try {
      if (typeof raw !== 'string' || !raw.length || raw.length > MAX_ENCODED || !/^[\w-]+$/.test(raw) || raw.length % 4 === 1) return null;
      const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
      if (binary.length > MAX_BYTES) return null;
      const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
      return valid(payload) ? payload : null;
    } catch { return null; }
  }
  function capture(storage) {
    try {
      const items = Object.create(null);
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i), value = storage.getItem(key);
        if (key !== null && value !== null) items[key] = value;
      }
      return items;
    } catch { return null; }
  }
  function numericMap(a, b, max = Number.MAX_SAFE_INTEGER) {
    const result = copy(a);
    for (const [k, v] of Object.entries(b)) {
      if (integer(v) && v <= max && (!Object.hasOwn(a, k) || integer(a[k]) && a[k] <= max)) result[k] = Math.max(a[k] || 0, v);
    }
    return result;
  }
  function legacyMeta(key, value) {
    // meta.clean refunds the removed speed levels (2026-10-21). Normalize each
    // side BEFORE taking maxima, or importing speed=5 again can refund it twice.
    if (key !== 'gf:meta:history-survivor' || !object(value.shop) || !integer(value.shop.speed) || value.shop.speed <= 3) return value;
    if (!integer(value.coins) || value.coins > 1e7) return null;
    return { ...value, coins: value.coins + 340 + (value.shop.speed >= 5 ? 460 : 0), shop: { ...value.shop, speed: 3 } };
  }
  function mergeMeta(key, a, b) {
    if (!object(a) || !object(b) || a.v !== 1 || b.v !== 1) return a;
    const left = legacyMeta(key, a), right = legacyMeta(key, b);
    if (!left || !right) return a;
    a = left; b = right;
    const result = copy(a);
    if ((a.coins === undefined || integer(a.coins)) && integer(b.coins)) result.coins = Math.max(a.coins || 0, b.coins);
    for (const key of ['shop', 'facts']) if ((a[key] === undefined || object(a[key])) && object(b[key])) result[key] = numericMap(a[key] || {}, b[key], key === 'facts' ? 6 : Number.MAX_SAFE_INTEGER);
    for (const key of ['heroes', 'cleared']) {
      const check = key === 'cleared' ? n => integer(n) && n > 0 : n => typeof n === 'string';
      if ((a[key] === undefined || Array.isArray(a[key]) && a[key].every(check)) && Array.isArray(b[key]) && b[key].every(check)) result[key] = union(a[key] || [], b[key]);
    }
    if ((a.seen === undefined || object(a.seen)) && object(b.seen)) {
      result.seen = copy(a.seen);
      for (const key of ['people', 'weapons', 'relics', 'evolutions', 'foes']) {
        const x = a.seen?.[key], y = b.seen[key];
        if ((x === undefined || Array.isArray(x)) && Array.isArray(y) && [...(x || []), ...y].every(n => typeof n === 'string')) result.seen[key] = union(x || [], y);
      }
    }
    return result;
  }
  function mergeValue(key, current, incoming) {
    if (current === null) return incoming;
    const a = parse(current), b = parse(incoming);
    let merged = a;
    if (/^gf:best:[^:]+:[^:]+$/.test(key)) {
      if (integer(a) && integer(b)) merged = Math.max(a, b);
    } else if (/^gf:modes:[^:]+:best:[^:]+:(quick|endless|stage)$/.test(key)) {
      if (number(a) && number(b)) merged = Math.max(a, b);
    } else if (/^gf:modes:[^:]+:stars:[^:]+:[^:]+$/.test(key)) {
      if (integer(a) && a <= 3 && integer(b) && b <= 3) merged = Math.max(a, b);
    } else if (/^gf:intro:/.test(key)) {
      return ['0', '1'].includes(current) && ['0', '1'].includes(incoming) && (current === '1' || incoming === '1') ? '1' : current;
    } else if (key === 'gf:stamps' && object(a) && object(b)) {
      merged = copy(a);
      for (const [game, stamps] of Object.entries(b)) if (object(stamps)) {
        if (Object.hasOwn(a, game) && !object(a[game])) continue;
        const known = Object.hasOwn(a, game) ? a[game] : {};
        const next = copy(known);
        for (const [id, date] of Object.entries(stamps)) if (!Object.hasOwn(known, id) && typeof date === 'string') next[id] = date;
        merged[game] = next;
      }
    } else if (/^gf:meta:[^:]+$/.test(key)) {
      merged = mergeMeta(key, a, b);
    } else if (/^gf:save:(_dummy-adventure|_sample-(hangul|earth|dokdo))$/.test(key)) {
      if (object(a) && object(b) && Object.keys(a).length === 1 && Object.keys(b).length === 1 && integer(a.scene) && integer(b.scene)) merged = { scene: Math.max(a.scene, b.scene) };
    } else if (key === 'gf:recent') {
      const recent = x => Array.isArray(x) && x.every(y => object(y) && typeof y.id === 'string' && y.id.length && number(y.at));
      if (recent(a) && recent(b)) {
        const entries = new Map();
        for (const { id, at } of [...a, ...b]) entries.set(id, Math.max(entries.get(id) || 0, at));
        merged = [...entries].map(([id, at]) => ({ id, at })).sort((x, y) => y.at - x.at || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
      }
    }
    // Settings, obsolete saves and unknown shapes keep the destination value byte for byte.
    return merged === a ? current : JSON.stringify(merged);
  }
  function mergeAll(storage, items) {
    for (const [key, value] of Object.entries(items)) {
      try {
        const current = storage.getItem(key), next = mergeValue(key, current, value);
        if (next !== current) storage.setItem(key, next);
      } catch { /* A blocked or full store must not prevent opening the site. */ }
    }
  }
  function receive(win) {
    if (!win.location.hash.startsWith('#move=')) return false;
    const payload = unpack(win.location.hash.slice(6));
    if (payload) { try { mergeAll(win.localStorage, payload.items); } catch { /* Storage access can throw. */ } }
    const hash = payload?.hash ? '#' + payload.hash : '';
    try { win.history.replaceState(win.history.state, '', win.location.pathname + win.location.search + hash); } catch { /* Sandboxed history can be unavailable. */ }
    return !!payload;
  }
  function destination(location, candidate) {
    // Public callers cannot override the destination, including a Pages preview.
    if (['localhost', '127.0.0.1'].includes(location.hostname) && typeof candidate === 'string' && /^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(candidate)) {
      try { const url = new URL(candidate); if (url.port && Number(url.port) <= 65535) return url.origin; } catch { /* Use the public origin. */ }
    }
    return NEW_ORIGIN;
  }
  function redirectURL(location, storage, candidate) {
    const origin = destination(location, candidate), items = capture(storage);
    const packed = items && Object.keys(items).length ? packAll(items, location.hash) : null;
    return origin + location.pathname + location.search + (packed ? '#move=' + packed : location.hash);
  }
  root.GFDomainMove = { OLD_HOST, NEW_ORIGIN, MAX_BYTES, MAX_ENCODED, packAll, unpack, capture, mergeValue, mergeAll, receive, destination, redirectURL };
  if (root.document?.currentScript?.hasAttribute('data-gf-move')) receive(root);
})(typeof window === 'undefined' ? globalThis : window);
