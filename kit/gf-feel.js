(function () {
  'use strict';
  if (window.GFFeel) return;
  const SHARED_MOMENTS = ['right','wrong','miss','combo','feverStart','feverEnd','special','specialGet','mission','overcome','best','last10','last5','end'];
  const MOMENTS = [...SHARED_MOMENTS, 'rise','swing','dizzy','sink','idle','lane','gatePass','fall','coin','treasure','press','hit'];
  const SHAPE_KEYS = { swing: ['windupDeg','windupMs','strikeDeg','strikeMs','holdMs','backMs','afterimage','impact','empty'], idle: ['bobPx','bobHz','blinkMs','blinkEvery'], dizzy: ['ms'], sink: ['ms'], lane:['tiltDeg','tiltMs'] };
  const INGREDIENTS = ['hitstop','shake','flash','squash','tint','pose','burst','ring','popup','fly','hudBump','crack','label','banner','vignette','confetti','sound','music'];
  const SLOTS = ['rise','hit','wrong','miss','swing','comboTier','feverStart','feverEnd','special','specialGet','mission','overcome','last10','heartbeat','end','count','stamp','best','card','button'];
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const safeKeys = x => Object.keys(x || {}).filter(k => !['__proto__','constructor','prototype'].includes(k));
  const copy = x => Array.isArray(x) ? x.map(copy) : object(x) ? Object.fromEntries(safeKeys(x).map(k => [k, copy(x[k])])) : x;
  function merge(kit, family) {
    const out = copy(kit || {});
    for (const k of safeKeys(family)) out[k] = object(out[k]) && object(family[k]) ? merge(out[k], family[k]) : copy(family[k]);
    return out;
  }
  function split(feel, kit, family) {
    const result = { kit: {}, family: {} };
    function visit(value, a, b, left, right) {
      for (const k of safeKeys(value)) {
        if (object(value[k])) {
          const l = {}, r = {}; visit(value[k], a?.[k], b?.[k], l, r);
          if (Object.keys(l).length) left[k] = l;
          if (Object.keys(r).length) right[k] = r;
          if (!Object.keys(value[k]).length) (Object.hasOwn(b || {}, k) ? right : left)[k] = {};
        } else (Object.hasOwn(b || {}, k) ? right : left)[k] = copy(value[k]);
      }
    }
    visit(feel, kit, family, result.kit, result.family); return result;
  }
  function comboTier(feel, n) {
    const c = feel.combo;
    if (!c || !Number.isSafeInteger(n) || n < 1) return null;
    const i = c.tiers.findIndex(t => t.n === n);
    if (i >= 0) return { n, text: c.tiers[i].text, step: i + 1 };
    const last = c.tiers.at(-1)?.n || 0;
    if (c.every > 0 && n > last && (n - last) % c.every === 0) return { n, text: c.everyText.replace('{n}', String(n)), step: c.tiers.length + (n - last) / c.every };
    return null;
  }
  function recipe(feel, name, { combo = 0, reduced = false, light = false, delayMs = 0 } = {}) {
    const steps = [], params = {}, tier = name === 'combo' ? comboTier(feel, combo) : null;
    if (delayMs > 0) params.delayMs = delayMs;
    if (name === 'combo' && !tier) return { name, delayMs, steps, params };
    for (const kind of INGREDIENTS) {
      const value = feel.moments?.[name]?.[kind];
      if (!value || value.on !== true) continue;
      if (reduced && (kind === 'shake' || kind === 'flash' && value.target === false) || light && kind === 'ring') continue;
      const step = { kind, ...copy(value) };
      if (combo >= 10) { if (step.msCombo10 !== undefined) step.ms = step.msCombo10; if (step.pxCombo10 !== undefined) step.px = step.pxCombo10; }
      if (tier && kind === 'label') { step.text = tier.text; const sizes = feel.combo.labelPx; step.px = sizes[Math.min(tier.step - 1, sizes.length - 1)]; }
      if (tier && kind === 'burst') step.n = Math.round(step.n * (1 + feel.combo.particleGrow * (tier.step - 1)));
      if (kind === 'burst' || kind === 'confetti') { if (reduced) step.n = Math.round(step.n * .3); if (light) step.n = Math.floor(step.n / 2); }
      if (kind === 'banner' && reduced) step.slide = false;
      if (kind === 'sound') step.semitones = ['right','gatePass'].includes(name) ? Math.min(step.pitchMax ?? 12, Math.max(0, combo - 1) * (step.pitchPerCombo ?? 0)) : 0;
      if (kind === 'hitstop') params.hitstop = step.ms;
      if (kind === 'shake') params.shake = step.px;
      if (kind === 'burst' || kind === 'confetti') params[kind] = step.n;
      if (kind === 'ring') params.ring = step.r;
      if (kind === 'popup') params.popup = step.px;
      if (kind === 'flash') params.flash = step.target ? 'target' : 'screen';
      if (kind === 'sound') { params.sound = step.slot; params.semitones = step.semitones; }
      if (kind === 'label' || kind === 'banner') params[kind] = step.text;
      if (kind === 'vignette') params.vignette = step.alpha;
      steps.push(step);
    }
    return { name, delayMs, steps, params };
  }
  function validate(feel) {
    const errors = [], fail = (path, text) => errors.push(`${path}: ${text}`);
    if (!object(feel)) return ['feel: 기준표가 필요해요'];
    const range = (path, value, lo, hi) => { if (!Number.isFinite(value) || value < lo || value > hi) fail(path, `${lo}~${hi} 사이여야 해요`); };
    for (const [name, moment] of Object.entries(feel.moments || {})) {
      if (!MOMENTS.includes(name)) { fail(`moments.${name}`, '모르는 순간이에요'); continue; }
      if (!object(moment)) { fail(`moments.${name}`, '순간 표가 필요해요'); continue; }
      for (const [kind, value] of Object.entries(moment)) {
        const path = `moments.${name}.${kind}`;
        if (!INGREDIENTS.includes(kind) && !SHAPE_KEYS[name]?.includes(kind)) { fail(path, '모르는 재료예요'); continue; }
        if (INGREDIENTS.includes(kind) && (!object(value) || typeof value.on !== 'boolean')) fail(`${path}.on`, '켜기는 참 또는 거짓이어야 해요');
        if (kind === 'flash' && value?.target === false && value.on) range(`${path}.alpha`, value.alpha, 0, feel.limits?.screenFlashAlpha ?? .35);
        if (kind === 'shake') for (const key of ['px','pxCombo10']) if (value?.[key] !== undefined) range(`${path}.${key}`, value[key], 0, 40);
        if (['burst','confetti'].includes(kind) && value?.n !== undefined) range(`${path}.n`, value.n, 0, 120);
      }
    }
    function scan(value, path) {
      if (Array.isArray(value)) { value.forEach((v, i) => scan(v, `${path}.${i}`)); return; }
      if (!object(value)) return;
      for (const [key, v] of Object.entries(value)) {
        const p = `${path}.${key}`;
        if (key === 'on' && typeof v !== 'boolean' && !INGREDIENTS.includes(path.split('.').at(-1))) fail(p, '켜기는 참 또는 거짓이어야 해요');
        if (/^(ms|msCombo10)$|Ms$/.test(key) && !['minMs','autoMs'].includes(key)) range(p, v, 0, 3000);
        if (key === 'life' || key === 'blinkEvery') { if (Array.isArray(v)) v.forEach((n, i) => range(`${p}.${i}`, n, 0, key === 'life' ? 3000 : 5000)); }
        if (key === 'vol' || key === 'volume') range(p, v, 0, 1.5);
        if (key === 'pitchMax') range(p, v, 0, 12);
        if (object(v) || Array.isArray(v)) scan(v, p);
      }
    }
    scan(feel, 'feel');
    const l = feel.limits || {};
    range('limits.particles', l.particles, 0, 160); range('limits.screenFlashPerSec', l.screenFlashPerSec, 0, 3); range('limits.screenFlashAlpha', l.screenFlashAlpha, 0, .35);
    for (const slot of SLOTS) {
      const s = feel.sounds?.[slot];
      if (!object(s) || typeof s.src !== 'string' || !s.src || s.vol === undefined) fail(`sounds.${slot}`, '소리 출처와 크기가 필요해요');
    }
    for (const [key, rate] of Object.entries(feel.music?.rates || {})) range(`music.rates.${key}`, rate, 1, 1.25);
    if (feel.card) {
      if (!Number.isFinite(feel.card.minMs) || feel.card.minMs < 1000) fail('card.minMs', '1000 이상이어야 해요');
      for (const [key, ms] of Object.entries(feel.card.autoMs || {})) if (!Number.isFinite(ms) || ms < feel.card.minMs) fail(`card.autoMs.${key}`, '최소 읽는 시간 이상이어야 해요');
    }
    const r = feel.moments?.right || {}, w = feel.moments?.wrong || {};
    const n = (m, k, key) => m[k]?.on ? m[k][key] || 0 : 0;
    const volume = m => n(m, 'sound', 'vol') * (feel.sounds?.[m.sound?.slot]?.vol || 0);
    for (const [key, a, b] of [['shake', n(r,'shake','px'), n(w,'shake','px')], ['burst', n(r,'burst','n'), n(w,'burst','n')], ['sound', volume(r), volume(w)]]) if (!(a > b)) fail(`moments.right.${key} / moments.wrong.${key}`, '맞음이 틀림보다 커야 해요');
    return errors;
  }
  const FALLBACK = {
    version: 1, moments: {
      right: { popup: { on: true, px: 32, pop: [1,1,1], popMs: 0, riseMs: 450 }, sound: { on: true, slot: 'hit', vol: .5 } },
      wrong: { sound: { on: true, slot: 'wrong', vol: .2 } }, miss: { sound: { on: true, slot: 'miss', vol: .15 } }
    }, sounds: Object.fromEntries(SLOTS.map(slot => [slot, { src: 'synth', vol: 1 }])),
    limits: { particles: 160, screenFlashPerSec: 3, screenFlashAlpha: .35, light: { slowMs: 24, backMs: 18 } }
  };
  window.GFFeel = { SHARED_MOMENTS, MOMENTS, SHAPE_KEYS, INGREDIENTS, SLOTS, FALLBACK, merge, split, validate, recipe, comboTier };
})();
