(function () {
  'use strict';
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const KEY = 'gf:survivor:effects:v1';
  const defaults = { shake: true, flash: true, numbers: true, vibration: true, opacity: 80 };
  let saved = null, motionQuery = null;
  const clean = value => {
    const p = { ...defaults };
    for (const key of ['shake', 'flash', 'numbers', 'vibration']) if (typeof value?.[key] === 'boolean') p[key] = value[key];
    if (Number.isFinite(value?.opacity)) p.opacity = Math.max(30, Math.min(100, Math.round(value.opacity)));
    return p;
  };
  function read() {
    if (saved) return saved;
    try { saved = clean(JSON.parse(window.localStorage?.getItem(KEY) || 'null')); }
    catch { saved = clean(null); }
    return saved;
  }
  function write(value) {
    saved = clean({ ...read(), ...value });
    try { window.localStorage?.setItem(KEY, JSON.stringify(saved)); }
    catch { /* A blocked device store keeps the settings for this session. */ }
    return saved;
  }
  const reduced = () => { motionQuery ||= window.matchMedia?.('(prefers-reduced-motion: reduce)'); return !!motionQuery?.matches; };
  const config = w => w.juice?.feel?.feedback || {};
  const on = (w, key) => !w.effectsOff && read()[key] && (!['shake', 'flash'].includes(key) || !reduced());
  const flashing = (w, foe) => foe.flash > 0 && w.sv.feelClock < (foe.whiteUntil ?? 0) && on(w, 'flash');
  function bind(w) {
    w.sv.stopFn = ms => {
      const added = Math.max(0, ms / 1000 - (w.freezeLeft || 0));
      w.freeze?.(ms); return added;
    };
    w.sv.feedback = config(w);
    w.soundLimits = { maxVoices: 4, minIntervalMs: 50, ...(config(w).sound || {}) };
    // Shared celebration recipes must obey the battlefield's camera and stop policy.
    w.effectAllowed = (kind, name) => {
      if (kind === 'shake' || kind === 'hitstop' || ['hit', 'swing'].includes(name) && ['burst', 'ring'].includes(kind)) return false;
      return kind !== 'flash' || on(w, 'flash');
    };
  }
  function reserveStop(sv, seconds = .1, kind = 'accent') {
    const now = sv.feelClock || 0;
    if (kind !== 'boss' && now - (sv.lastStop ?? -Infinity) < Math.max(1, sv.feedback?.stopCooldown ?? 1) - 1e-9) return false;
    const duration = Math.min(kind === 'boss' ? .2 : Math.max(.08, Math.min(.12, seconds)), S.moments?.remaining(sv) ?? Infinity);
    if (duration <= 1e-9) return false;
    sv.lastStop = now;
    sv.stopCount = (sv.stopCount || 0) + 1;
    return duration;
  }
  function stop(sv, seconds = .1, kind = 'accent') {
    const duration = reserveStop(sv, seconds, kind);
    if (duration) {
      const added = sv.stopFn?.(duration * 1000);
      S.moments?.spend(sv, kind, typeof added === 'number' ? added : duration, 0);
    }
    return duration;
  }
  function flash(w, field = 'battleFlash', seconds = .15) {
    if (!on(w, 'flash')) return false;
    const screen = w.fxScreen, now = w.real ?? w.sv.feelClock ?? 0;
    const flashes = screen ? screen.flashes : (w.sv.flashTimes ||= []);
    for (let i = flashes.length - 1; i >= 0; i--) if (now - flashes[i] >= 1 - 1e-9) flashes.splice(i, 1);
    if (flashes.length >= 3) return false;
    flashes.push(now); w.sv[field] = seconds; w.sv[field+'Until'] = now + seconds;
    if (screen) screen.screenFlashPerSec = Math.max(screen.screenFlashPerSec || 0, flashes.length);
    return true;
  }
  function sound(w, slot, options) { window.GFJuice?.sound?.play?.(slot, { ...w.soundLimits, ...options }); }
  function left(w, field) {
    const sv=w.sv,until=sv[field+'Until'];
    return until==null?sv[field]||0:Math.min(sv[field]||0,Math.max(0,until-(w.real??sv.feelClock)));
  }
  function vibrate(w) {
    if (on(w, 'vibration') && window.GF?.sound !== false && typeof window.navigator?.vibrate === 'function') window.navigator.vibrate(30);
  }
  function settings(parent) {
    if (typeof document === 'undefined' || !parent || parent.querySelector('[data-test="feel-settings"]')) return;
    if (!document.querySelector('style[data-survivor-feel]')) {
      const style = document.createElement('style'); style.dataset.survivorFeel = '';
      style.textContent = '.sv-feel-open{position:relative;z-index:3;cursor:pointer;font:18px Jua,sans-serif;min-height:44px;padding:8px 16px;color:#fff7e6;background:#1d2543;border:2px solid #e6b653;border-radius:10px}.sv-feel-dialog::backdrop{background:rgba(8,12,24,.78)}'; document.head.append(style);
    }
    const open = document.createElement('button'); open.type = 'button'; open.dataset.test = 'feel-settings'; open.textContent = '효과 설정';
    open.className = 'sv-feel-open'; open.setAttribute('aria-label', '효과 설정');
    const panel = document.createElement('dialog'); panel.className = 'sv-feel-dialog'; panel.dataset.test = 'feel-dialog';
    panel.setAttribute('aria-label', '효과 설정');
    panel.style.cssText = 'position:fixed;inset:0;margin:auto;width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;padding:20px;overflow:auto;color:#fff7e6;font:20px/1.5 Jua,sans-serif;background:#1d2543;border:3px solid #e6b653;border-radius:14px;box-shadow:0 6px 0 #141826';
    const header = document.createElement('div'); header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px';
    const title = document.createElement('h2'); title.textContent = '효과 설정'; title.style.cssText = 'font:26px Jua,sans-serif;margin:0';
    const close = document.createElement('button'); close.type = 'button'; close.dataset.test = 'feel-close'; close.textContent = '닫기'; close.autofocus = true;
    close.style.cssText = 'cursor:pointer;min-width:64px;min-height:44px;padding:6px 12px;color:#1d2543;font:20px Jua,sans-serif;background:#fff1be;border:2px solid #e6b653;border-radius:8px';
    close.onclick = () => panel.close(); header.append(title, close); panel.append(header);
    for (const [key, label] of [['shake', '화면 흔들림'], ['flash', '화면 번쩍임 효과'], ['numbers', '피해 숫자'], ['vibration', '진동']]) {
      const row = document.createElement('label'); row.dataset.feelRow = key; row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:52px;cursor:pointer;font-size:20px'; row.append(label);
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = read()[key]; input.dataset.test = 'feel-' + key; input.style.cssText = 'width:24px;height:24px;accent-color:#e6b653';
      input.onchange = () => write({ [key]: input.checked }); row.append(input); panel.append(row);
    }
    const row = document.createElement('label'); row.dataset.feelRow = 'opacity'; row.textContent = '내 공격 효과 진하기 '; row.style.cssText = 'display:block;padding-top:16px;font-size:20px';
    const output = document.createElement('output'); output.textContent = read().opacity + '%'; row.append(output);
    const range = document.createElement('input'); range.type = 'range'; range.min = '30'; range.max = '100'; range.value = String(read().opacity); range.dataset.test = 'feel-opacity'; range.style.cssText = 'display:block;width:100%;height:48px;margin:4px 0 0;accent-color:#e6b653;cursor:pointer';
    range.oninput = () => { output.textContent = write({ opacity: Number(range.value) }).opacity + '%'; };
    row.append(range); panel.append(row); parent.append(open, panel);
    open.onclick = () => panel.showModal();
    panel.addEventListener('close', () => { if (open.isConnected) open.focus(); });
    panel.addEventListener('click', event => {
      const r = panel.getBoundingClientRect();
      if (event.target === panel && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) panel.close();
    });
    for (const node of [open, panel]) node.addEventListener('keydown', e => e.stopPropagation());
  }
  S.feedback = { read, write, clean, config, on, flashing, bind, stop, reserveStop, flash, sound, left, vibrate, settings };

  // Presentation clocks never use combat randomness or hold the question picker.
  // The ledger counts full affected wall time, not just time lost at quarter speed.
  const LIMIT = 10, SKIP = .5;
  let active = null;
  const ledger = sv => (sv.momentTime ||= { total: 0, rows: {} });
  // 고르기 창(레벨업 카드·문제)이 떠 있으면 이 창은 가려져 안 보인다. 그동안 흐른 진짜 시간은 세지 않는다(꾸러미가 가려진 채 사라졌다).
  const age = (w,state) => {
    if (w.real != null) { if (w.sv?.choice) state.born = (state.born ?? w.real) + (w.real - (state.seen ?? w.real)); state.seen = w.real; }
    return Math.max(state.age, (w.real??0)-(state.born??w.real??0));
  };
  const remaining = sv => Math.max(0, LIMIT - ledger(sv).total);
  function spend(sv, kind, stopped, slowed) {
    const time = ledger(sv), row = (time.rows[kind] ||= { stopped: 0, slowed: 0 });
    row.stopped += stopped; row.slowed += slowed; time.total += stopped + slowed;
  }
  function chest(w, reward) {
    active = w;
    // 판은 멈추지 않고 창만 떠 있다. 0.8초는 받은 것을 읽기 전에 사라졌다(대표 10-18) → 첫 상자 4초, 다음부터 3초.
    const n = w.sv.opened, duration = n === 1 ? 4 : 3;
    // Values are copied after settlement. Drawing or skipping cannot change them.
    w.sv.gift = { ...reward, age: 0, born:w.real??0, duration, skipped: false, number: n };
    sound(w, 'button', { vol: .3 });
  }
  function arrival(w, foe, { label, duration = 1.5 } = {}) {
    active = w;
    w.sv.arrival = { foe, label, age: 0, born:w.real??0, duration, sounded: false, skipped: false };
    sound(w, 'heartbeat', { vol: .45, semitones: 12 });
  }
  function defeated(w, foe) {
    active = w;
    const sv = w.sv;
    // Replace the previous accent, including an evolution stop pending this frame.
    if (sv.evolution) sv.evolution.stopLeft = 0;
    const stopped = stop(sv, .2, 'boss') || 0;
    // Retain the previous combat slices; stretch their presentation over 0.5s.
    // Changing the collision step even slightly changes crowded-battle targeting.
    const slices = []; for (let left = .4; left > 0; left -= 1/60) slices.push(1/240);
    sv.bossMoment = { age: .2, born:w.real??0, duration: .7, skipped: false, stopped, x: foe.x, y: foe.y, label:foe.def?.retreat||S.rules.T.bossDown, released: false, slices, slice: 0 };
    sv.slowLeft = .5;
  }
  function collect(w) {
    active = w;
    const targets = new Set(w.sv.gems);
    const state = w.sv.collection = { age: 0, born:w.real??0, targets, count: targets.size, skipped: false, done: false };
    for (const gem of targets) { gem.pull = true; gem.collection = state; }
    if (!targets.size) { w.sv.collection.done = true; sound(w, 'count', { vol: .35, semitones: 12 }); }
  }
  function collected(w, gem) {
    const c = w.sv.collection;
    if (!c || c.done || !c.targets.delete(gem) || c.targets.size) return;
    c.done = true; c.doneAt = c.age;
    if (!c.skipped) sound(w, 'count', { vol: .45, semitones: 12, minIntervalMs: 0 });
  }
  function success(w, finish) {
    active = w;
    const sv = w.sv;
    // No kill, drop, score or RNG calls: these are retreating survivors.
    for (const fx of sv.fx) sv.fxPool.push(fx);
    sv.fx.length = 0;
    for (const death of sv.deaths) { death.foe = null; sv.deathPool.push(death); }
    sv.deaths.length = 0;
    for (const foe of sv.foes) if (!foe.dead) {
      foe.dead = true;
      S.world.addFx(sv, 'smoke', foe.x, foe.y - 10, { life: .3, size: foe.boss ? 2 : 1 });
    }
    sv.alive = 0; sv.foeShots.length = 0; sv.tele.length = 0;
    const duration = Math.min(.3, remaining(sv));
    sv.victoryMoment = { age: 0, duration, finish };
    if (duration <= 1e-9) { sv.victoryMoment.finish = null; finish(); }
  }
  const overlap = (a, dt, start, end) => Math.max(0, Math.min(a + dt, end) - Math.max(a, start));
  function advance(w, dt) {
    const sv = w.sv;
    const cinematic = S.evolution.presenting(w);
    for (const state of [sv.gift, sv.arrival, sv.collection]) if (state) {
      const before = state.age; state.age += dt;
      if (state === sv.arrival && !state.foe.dead && !state.skipped && !state.sounded && before < .45 && state.age >= .45) {
        state.sounded = true; sound(w, 'heartbeat', { vol: .4, semitones: 12 });
      }
    }
    const e = sv.evolution, beforeStop = e?.stopElapsed || 0, beforeAffected = e?.affectedElapsed || 0;
    const evoDt = S.evolution.step(w, dt);
    let bossSlow = 0;
    const boss = sv.bossMoment;
    if (boss && !boss.skipped && boss.age < boss.duration) {
      bossSlow = overlap(boss.age, dt, .2, boss.duration); boss.age += dt;
      sv.slowLeft = Math.max(0, boss.duration - boss.age);
      if (!boss.released && boss.age >= boss.duration - 1e-9) {
        boss.released = true;
        // Existing coins and gems are visual copies only; rewards stay unchanged.
        for (let i = 0; i < 12; i++) {
          const p = sv.flightPool.pop(); if (!p) break;
          const a = i * Math.PI / 6;
          Object.assign(p, { x: boss.x + Math.cos(a) * 30, y: boss.y + Math.sin(a) * 24, t: 0, life: .5, tier: 2, type: i % 2 ? 'gem' : 'coin', collection: null });
          sv.flights.push(p);
        }
      }
    } else if (!boss && sv.slowLeft > 0) {
      bossSlow = Math.min(dt, sv.slowLeft); sv.slowLeft = Math.max(0, sv.slowLeft - dt);
    }
    const stopped = (e?.stopElapsed || 0) - beforeStop;
    const evoAffected = (e?.affectedElapsed || 0) - beforeAffected;
    const affected = Math.max(evoAffected, bossSlow), available = remaining(sv);
    const actual = Math.min(affected, available), ratio = affected > 0 ? actual / affected : 1;
    const bossPart = Math.min(bossSlow, Math.max(0, actual - stopped * ratio));
    if (bossPart > 0) spend(sv, 'boss', 0, bossPart);
    if (actual - bossPart > 0) spend(sv, 'evolution', stopped * ratio, Math.max(0, actual - bossPart - stopped * ratio));
    if (actual + 1e-9 < affected) {
      if (e) { e.skipped = true; e.stopLeft = 0; }
      if (boss) boss.skipped = true;
      sv.slowLeft = 0;
    }
    sv.bossFrameScale = !cinematic && bossSlow > 0 ? 1 - bossSlow / dt * .75 * ratio : 1;
    sv.bossFrame = !cinematic && bossSlow > 0 && boss && !boss.skipped ? boss : null;
    return dt - (dt - (cinematic ? Math.min(evoDt, dt - bossSlow * .75) : evoDt)) * ratio;
  }
  function combat(w, dt) {
    const sv=w.sv,boss=sv.bossFrame;
    if(dt<=0)return dt;
    if(!boss)return dt*sv.bossFrameScale;
    const target=Math.min(boss.slices.length,Math.floor((boss.age-.2)/.5*boss.slices.length+1e-8));
    if(boss.slice>=target)return 0;
    return boss.slices[boss.slice++];
  }
  function victoryStep(w, dt) {
    const v = w.sv.victoryMoment;
    if (!v) return false;
    const elapsed = Math.min(dt, Math.max(0, v.duration - v.age));
    spend(w.sv, 'success', elapsed, 0);
    v.age += dt; S.world.stepFx(w.sv, dt);
    if (v.age + 1e-9 >= v.duration && v.finish) { const done = v.finish; v.finish = null; done(); }
    return true;
  }
  // 마지막 하트를 잃으면 판을 멈추고 화면을 천천히 어둡게 한 뒤 끝낸다(대표 10-20 「천천히 화면이 어두워지면서 스르륵」).
  // 판 결과·기록은 그대로이고, 전투 보고는 result.js가 이 어둠 위로 서서히 띄운다.
  const FALLEN = 1.6, FALLEN_DARK = .9;
  function fallen(w, finish) {
    w.sv.fallenMoment = { age: 0, duration: FALLEN, finish };
    // 바깥 놀이 페이지의 ✕·소리 단추도 같이 흐려진다(play.css). 끝나면 껍데기가 'end'로 바꾼다.
    try { const host = window.parent !== window ? window.parent.document.body : null; if (host?.dataset.uiState === 'play') host.dataset.uiState = 'fallen'; } catch {}
  }
  function fallenStep(w, dt) {
    const f = w.sv.fallenMoment;
    if (!f) return false;
    f.age += dt; S.world.stepFx(w.sv, dt);
    if (f.age + 1e-9 >= f.duration && f.finish) { const done = f.finish; f.finish = null; done(); }
    return true;
  }
  // 0에서 FALLEN_DARK까지, 처음엔 느리게 어두워진다.
  function fallenDark(sv) {
    const f = sv?.fallenMoment;
    if (!f) return 0;
    const t = Math.min(1, f.age / f.duration);
    return FALLEN_DARK * t * t * (3 - 2 * t);
  }
  // gift: 선물 창도 닫을지. 선물 창은 판을 멈추지 않으니 움직이는 키·창 밖 누르기로는 닫지 않는다
  // (방향을 바꾸거나 손가락을 대는 순간 0.5초 만에 사라져 무엇을 받았는지 못 봤다, 대표 10-18).
  function skip(w, { gift = true } = {}) {
    if (!w?.sv || w.sv.choice) return false;
    let changed = false;
    for (const state of [gift && w.sv.gift, w.sv.arrival, w.sv.bossMoment, w.sv.collection]) {
      if (!state || state.skipped || age(w,state) + 1e-9 < SKIP || age(w,state) >= (state.duration ?? Infinity)) continue;
      state.skipped = true; changed = true;
      if (state === w.sv.bossMoment) w.sv.slowLeft = 0;
    }
    return changed;
  }
  if (typeof document !== 'undefined') {
    const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
    const onGift = e => { const r = active && S.scene?.giftRect?.(active); return !!r && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h; };
    window.addEventListener('pointerdown', e => skip(active, { gift: onGift(e) }), true);
    window.addEventListener('keydown', e => { if (e.code !== 'Escape' && !e.repeat) skip(active, { gift: !MOVE_KEYS.has(e.code) }); }, true);
  }
  S.moments = { age, remaining, spend, chest, arrival, defeated, collect, collected, success, advance, combat, victoryStep, fallen, fallenStep, fallenDark, skip, timing: { limit: LIMIT, skip: SKIP, fallen: FALLEN } };
})();
