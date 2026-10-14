(function () {
  'use strict';
  // 버티기 틀 세계: 적·구슬·줍는 것·효과 목록과 그 움직임. 그리기는 scene.js, 무기는 weapons.js가 맡는다.
  // 좌표는 세계 칸(작은 캔버스 1칸 = 1). 효과를 부를 때만 toCss로 화면 CSS px로 바꾼다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules;
  const CELL = 32, SPAN = 64, MASK = SPAN - 1, FAR = 400, HERO_R = 7, GEM_MAX = 250, ITEM_MAX = 80, FX_MAX = 220, NUM_MAX = 40;
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const cellIndex = (cx, cy) => (cx & MASK) * SPAN + (cy & MASK);
  const gemTier = v => v >= 8 ? 2 : v >= 3 ? 1 : 0;

  function create() {
    return {
      begun: false, t: 0, play: 'none', battle: null, tier: 1, loop: 0, era: 0, eraStart: 0, ground: 'field',
      hero: { x: 0, y: 0, hp: 100, hpMax: 100, invuln: 0, hurt: 0, faceX: 1, dx: 1, dy: 0, moving: false, anim: 0, person: 0 },
      heroDef: null, shop: {}, stats: null, fever: false,
      kit: { weapons: [], relics: [], allies: [] },
      level: 1, xp: 0, queue: [], choice: null, after: [], firstLevel: true,
      asked: new Set(), crackOf: new Map(),
      seen: { people: new Set(), weapons: new Set(), relics: new Set(), evolutions: new Set(), foes: new Set() },
      foes: [], gems: [], items: [], shots: [], traps: [], fx: [], nums: [], allyBodies: [], trail: [], orbs: [],
      wrun: new Map(), arun: new Map(),
      grid: { head: new Int32Array(SPAN * SPAN).fill(-1), next: new Int32Array(512) },
      alive: 0, spawnAcc: 0, nextElite: Infinity, nextChest: Infinity, nextRing: Infinity, bossAt: Infinity, minionAt: Infinity, boss: null,
      chests: 0, bosses: 0, coinsPicked: 0, extraCoins: 0, kills: 0, dealt: 0, rival: false, falls: 0,
      lastHit: -1, lastSwing: -1, lastGem: -1, gemPitch: 0, gemMerge: 0, flash: 0, scrollAt: 0,
      cam: { x: 0, y: 0 }, tmp: [], tmp2: []
    };
  }

  // 세계 칸 → 세계 사각형 안 CSS px (효과·글 자리)
  function toCss(w, x, y) {
    const px = w.px, cam = w.sv.cam, k = px ? px.s / px.dpr : 1;
    return { x: (x - cam.x) * k, y: (y - cam.y) * k };
  }
  // 주인공이 놀이 칸(윗줄 아래) 가운데에 오게 카메라를 둔다.
  function camera(w) {
    const px = w.px, h = w.sv.hero; if (!px) return;
    w.sv.cam.x = Math.round(h.x - px.W / 2);
    w.sv.cam.y = Math.round(h.y - (px.top + (px.H - px.top) / 2));
  }

  // 쓰러진 적을 걸러 내고 칸 격자를 다시 짠다. 한 걸음에 한 번, 맨 앞에서.
  function grid(sv) {
    const foes = sv.foes; let n = 0;
    for (let i = 0; i < foes.length; i++) if (!foes[i].dead) foes[n++] = foes[i];
    foes.length = n;
    const g = sv.grid;
    if (g.next.length < n) g.next = new Int32Array(Math.max(n, g.next.length * 2));
    g.head.fill(-1);
    for (let i = 0; i < n; i++) {
      const f = foes[i], c = cellIndex(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
      g.next[i] = g.head[c]; g.head[c] = i;
    }
    g.size = n;
  }
  // (x,y)에서 r 안에 몸이 닿는 적. out을 비우고 채워 돌려준다.
  function near(sv, x, y, r, out) {
    out.length = 0;
    const foes = sv.foes;
    if (r > FAR) {
      for (const f of foes) if (!f.dead) { const dx = f.x - x, dy = f.y - y, rr = r + f.r; if (dx * dx + dy * dy <= rr * rr) out.push(f); }
      return out;
    }
    const g = sv.grid, m = r + 28, x0 = Math.floor((x - m) / CELL), x1 = Math.floor((x + m) / CELL), y0 = Math.floor((y - m) / CELL), y1 = Math.floor((y + m) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      for (let i = g.head[cellIndex(cx, cy)]; i >= 0; i = g.next[i]) {
        if (i >= g.size) break;
        const f = foes[i]; if (f.dead) continue;
        const dx = f.x - x, dy = f.y - y, rr = r + f.r;
        if (dx * dx + dy * dy <= rr * rr) out.push(f);
      }
    }
    return out;
  }
  function nearest(sv, x, y, range, skip) {
    let best = null, bd = Infinity;
    for (const f of near(sv, x, y, range, sv.tmp)) {
      if (skip && skip.has(f)) continue;
      const d = (f.x - x) ** 2 + (f.y - y) ** 2; if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function nearestK(sv, x, y, range, k) {
    const list = near(sv, x, y, range, sv.tmp).slice();
    list.sort((a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2));
    return list.length > k ? list.slice(0, k) : list;
  }
  // 화면 사각형을 pad만큼 넓힌 테두리 위, 화면 가운데에서 ang 쪽 점
  function ringPoint(w, ang, pad = 40) {
    const px = w.px, cam = w.sv.cam, W = px ? px.W : 360, H = px ? px.H : 360;
    const cx = cam.x + W / 2, cy = cam.y + H / 2, hw = W / 2 + pad, hh = H / 2 + pad, c = Math.cos(ang), s = Math.sin(ang);
    const t = Math.min(Math.abs(c) > 1e-6 ? hw / Math.abs(c) : Infinity, Math.abs(s) > 1e-6 ? hh / Math.abs(s) : Infinity);
    return { x: cx + c * t, y: cy + s * t };
  }

  function spawnFoe(w, kind, at) {
    const sv = w.sv, ids = sv.battle.foes, def = byId(w.content.foes, ids[Math.floor(w.rng() * ids.length)]);
    if (!def) return null;
    const st = R.foeStats(def, { tier: sv.tier, minutes: sv.t / 60, loop: sv.loop, kind }, w.family.tuning);
    const p = at || ringPoint(w, w.rng() * Math.PI * 2);
    const f = { def, sprite: def.sprite, kind, boss: false, x: p.x, y: p.y, hp: st.hp, hpMax: st.hp, speed: st.speed * (.9 + w.rng() * .2), dmg: st.dmg,
      r: kind === 'elite' ? 16 : 9, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: w.fxRng() * 6.283 };
    sv.foes.push(f); sv.alive++;
    return f;
  }
  function spawnBoss(w) {
    const sv = w.sv, def = byId(w.content.bosses, sv.battle.boss);
    if (!def) return null;
    const st = R.bossStats(def, { tier: sv.tier, loop: sv.loop }, w.family.tuning), p = ringPoint(w, w.rng() * Math.PI * 2);
    const f = { def, sprite: def.sprite, kind: 'boss', boss: true, x: p.x, y: p.y, hp: st.hp, hpMax: st.hp, speed: st.speed, dmg: st.dmg,
      r: 26, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: 0 };
    sv.foes.push(f); sv.boss = f; sv.minionAt = sv.t + 3; sv.seen.foes.add(def.id);
    const b = w.effectBounds();
    w.juice.moment('special', { x: b.x + b.w / 2, y: b.y + b.h / 2, label: R.T.bossCome });
    return f;
  }
  // 초마다 나오는 수는 시간에 따라 는다. 연습 판은 적게. 강한 적·상자·둘러싸기는 정해진 때마다.
  function spawnStep(w, dt) {
    const sv = w.sv, T = w.family.tuning, sp = T.spawn, practice = !!w.practice, h = sv.hero;
    const cap = practice ? 40 : sp.max, rate = (sp.start + sp.perMin * sv.t / 60) * (practice ? .3 : 1);
    sv.spawnAcc += rate * dt;
    while (sv.spawnAcc >= 1) {
      sv.spawnAcc -= 1;
      if (sv.alive >= cap) { sv.spawnAcc = 0; break; }
      spawnFoe(w, sv.t >= T.foe.fastFrom && w.rng() < .3 ? 'fast' : 'normal');
    }
    if (practice) return;
    if (sv.t >= sv.nextElite) { sv.nextElite += sp.eliteEvery; if (sv.alive < cap) spawnFoe(w, 'elite'); }
    if (sv.t >= sv.nextChest) {
      sv.nextChest += sp.chestEvery;
      const a = w.rng() * Math.PI * 2, d = 60 + w.rng() * 60;
      addItem(sv, 'chest', h.x + Math.cos(a) * d, h.y + Math.sin(a) * d);
    }
    if (sv.t >= sv.nextRing) {
      sv.nextRing += sp.ringEvery;
      const n = sp.ringN, px = w.px, rad = Math.hypot(px.W, px.H) / 2 + 20;
      for (let i = 0; i < n && sv.alive < cap; i++) { const a = i / n * Math.PI * 2; spawnFoe(w, 'normal', { x: h.x + Math.cos(a) * rad, y: h.y + Math.sin(a) * rad }); }
    }
    if (!sv.boss && sv.t >= sv.bossAt) { sv.bossAt = Infinity; spawnBoss(w); }
    if (sv.boss && !sv.boss.dead && sv.t >= sv.minionAt) {
      sv.minionAt = sv.t + 3;
      const b = sv.boss;
      for (let i = 0; i < T.boss.minions && sv.alive < cap; i++) { const a = w.rng() * Math.PI * 2, d = 34 + w.rng() * 24; spawnFoe(w, 'normal', { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d }); }
    }
  }

  // 주인공 쪽으로 걷기, 밀려남 줄이기, 너무 먼 적은 가는 쪽 앞으로 옮기기, 서로 밀어내기, 주인공에 닿기.
  function moveFoes(w, dt) {
    const sv = w.sv, h = sv.hero, px = w.px, farX = (px ? px.W : 360) * .75 + 80, farY = (px ? px.H : 360) * .75 + 80, decay = Math.exp(-10 * dt);
    for (const f of sv.foes) {
      if (f.dead) continue;
      const dx = h.x - f.x, dy = h.y - f.y, d = Math.hypot(dx, dy) || 1;
      f.x += (dx / d * f.speed + f.kbx) * dt; f.y += (dy / d * f.speed + f.kby) * dt;
      f.kbx *= decay; f.kby *= decay;
      if (Math.abs(dx) > 2) f.faceX = dx < 0 ? -1 : 1;
      if (f.flash > 0) f.flash -= dt;
      if (!f.boss && (Math.abs(dx) > farX || Math.abs(dy) > farY)) {
        const ang = h.moving ? Math.atan2(h.dy, h.dx) + (w.rng() - .5) * 1.4 : w.rng() * Math.PI * 2, p = ringPoint(w, ang);
        f.x = p.x; f.y = p.y; f.kbx = f.kby = 0;
      }
    }
    const tmp = sv.tmp2;
    for (const f of sv.foes) {
      if (f.dead || f.boss) continue;
      near(sv, f.x, f.y, f.r, tmp);
      for (const o of tmp) {
        if (o === f) continue;
        let dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy;
        const m = f.r + o.r;
        if (d2 >= m * m) continue;
        if (d2 < 1e-6) { dx = w.rng() - .5; dy = w.rng() - .5; d2 = dx * dx + dy * dy; }
        const d = Math.sqrt(d2), push = (m - d) / d * (o.boss ? .5 : .25);
        f.x += dx * push; f.y += dy * push;
      }
    }
    if (h.invuln <= 0 && h.hp > 0) {
      let hit = null;
      for (const f of near(sv, h.x, h.y, HERO_R, tmp)) if (!hit || f.dmg > hit.dmg) hit = f;
      if (hit) hurtHero(w, hit.dmg);
    }
  }
  function hurtHero(w, dmg) {
    const sv = w.sv, h = sv.hero, d = Math.max(1, Math.round(dmg - (sv.stats?.armor || 0)));
    h.hp = Math.max(0, h.hp - d); h.invuln = w.family.tuning.hero.invuln; h.hurt = .22;
    const p = toCss(w, h.x, h.y - 16);
    w.juice.moment('dizzy', { x: p.x, y: p.y, suppressText: true });
  }

  // 맞히기. kx·ky는 밀려나는 빠르기(초당 칸). 보스는 밀리지 않고 강한 적은 덜 밀린다.
  function hitFoe(w, f, dmg, kx = 0, ky = 0) {
    if (!f || f.dead) return false;
    const sv = w.sv, v = Math.max(1, Math.round(dmg));
    f.hp -= v; f.flash = .08; sv.dealt += v;
    if (!f.boss) { const k = f.kind === 'elite' ? .3 : 1; f.kbx += kx * k; f.kby += ky * k; }
    addNum(sv, f.x, f.y - f.r * 1.6, v, w.fxRng);
    if (sv.t - sv.lastHit >= .065) { sv.lastHit = sv.t; const p = toCss(w, f.x, f.y - f.r); w.juice.moment('hit', { x: p.x, y: p.y, suppressText: true }); }
    if (f.hp <= 0) killFoe(w, f);
    return true;
  }
  function killFoe(w, f) {
    const sv = w.sv, T = w.family.tuning;
    f.dead = true; sv.kills++; sv.seen.foes.add(f.def.id);
    addFx(sv, 'smoke', f.x, f.y - f.r * .8, { life: .42, size: f.boss ? 3 : f.kind === 'elite' ? 2 : 1 });
    if (f.boss) { bossDown(w, f); return; }
    sv.alive--;
    dropGem(w, f.x, f.y, T.xp.gem[f.kind === 'elite' ? 2 : f.kind === 'fast' ? 1 : 0]);
    if (f.kind === 'elite') { addItem(sv, 'chest', f.x, f.y); return; }
    const r = w.rng(), drop = T.coins.drop;
    if (r < drop) addItem(sv, 'coin', f.x, f.y);
    else if (r < drop + .006) addItem(sv, 'food', f.x, f.y);
    else if (r < drop + .008) addItem(sv, 'magnet', f.x, f.y);
  }
  function bossDown(w, f) {
    const sv = w.sv, T = w.family.tuning;
    sv.bosses++; sv.boss = null; sv.flash = .15;
    addFx(sv, 'boom', f.x, f.y - 24, { life: .55, size: 3 });
    for (let i = 0; i < 6; i++) dropGem(w, f.x + (w.rng() - .5) * 40, f.y + (w.rng() - .5) * 30, T.xp.gem[2]);
    addItem(sv, 'chest', f.x, f.y);
    const b = w.effectBounds();
    w.juice.moment('mission', { x: b.x + b.w / 2, y: b.y + b.h / 2, label: R.T.bossDown });
  }

  function dropGem(w, x, y, v) {
    const gems = w.sv.gems;
    if (gems.length >= GEM_MAX) { const g = gems[w.sv.gemMerge++ % gems.length]; g.v += v; g.tier = gemTier(g.v); return g; }
    const g = { x: x + (w.fxRng() - .5) * 6, y: y + (w.fxRng() - .5) * 6, v, tier: gemTier(v), pull: false, sp: 0 };
    gems.push(g);
    return g;
  }
  function addItem(sv, type, x, y, extra) {
    if (sv.items.length >= ITEM_MAX && type !== 'chest' && type !== 'scroll') return null;
    const it = { type, x, y, pull: false, sp: 0, t: 0, ...extra };
    sv.items.push(it);
    return it;
  }
  function addFx(sv, kind, x, y, o = {}) {
    if (sv.fx.length >= FX_MAX) sv.fx.shift();
    const e = { kind, x, y, t: 0, life: .4, ...o };
    sv.fx.push(e);
    return e;
  }
  function addNum(sv, x, y, v, rnd) {
    if (sv.nums.length >= NUM_MAX) sv.nums.shift();
    sv.nums.push({ x: x + (rnd() - .5) * 8, y, v, t: 0 });
  }
  function stepFx(sv, dt) {
    let n = 0;
    for (const e of sv.fx) { e.t += dt; if (e.t < e.life) sv.fx[n++] = e; }
    sv.fx.length = n; n = 0;
    for (const e of sv.nums) { e.t += dt; if (e.t < .6) sv.nums[n++] = e; }
    sv.nums.length = n;
    if (sv.flash > 0) sv.flash = Math.max(0, sv.flash - dt);
  }

  // 줍는 거리 안의 구슬·엽전·떡·자석은 끌려오고, 상자·두루마리는 닿아야 줍는다. on(it)은 상자·두루마리를 넘겨받는다.
  function pickups(w, dt, on) {
    const sv = w.sv, h = sv.hero, T = w.family.tuning, range = T.hero.pickup * (sv.stats?.pickup || 1), r2 = range * range;
    const pull = (o, d, dx, dy) => { o.sp = Math.min(460, (o.sp || 70) + 1100 * dt); const s = Math.min(d, o.sp * dt); o.x += dx / d * s; o.y += dy / d * s; };
    const gems = sv.gems;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i], dx = h.x - g.x, dy = h.y - g.y, d2 = dx * dx + dy * dy;
      if (!g.pull && d2 <= r2) g.pull = true;
      if (!g.pull) continue;
      const d = Math.sqrt(d2) || 1e-6;
      if (d < 8) {
        sv.xp += g.v * (sv.stats?.xp || 1);
        gems[i] = gems[gems.length - 1]; gems.pop();
        if (sv.t - sv.lastGem > .05) {
          sv.gemPitch = sv.t - sv.lastGem < .4 ? Math.min(12, sv.gemPitch + 1) : 0; sv.lastGem = sv.t;
          window.GFJuice?.sound?.play?.('count', { vol: .16, semitones: sv.gemPitch });
        }
        continue;
      }
      pull(g, d, dx, dy);
    }
    const items = sv.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      const dx = h.x - it.x, dy = h.y - it.y, d2 = dx * dx + dy * dy, touch = it.type === 'chest' || it.type === 'scroll';
      if (!touch && !it.pull && d2 <= r2) it.pull = true;
      const d = Math.sqrt(d2) || 1e-6;
      if (d2 > (touch ? 256 : 64)) { if (it.pull) pull(it, d, dx, dy); continue; }
      items[i] = items[items.length - 1]; items.pop();
      const p = toCss(w, it.x, it.y - 6);
      if (it.type === 'coin') { sv.coinsPicked++; w.juice.moment('coin', { x: p.x, y: p.y, suppressText: true }); }
      else if (it.type === 'food') { h.hp = Math.min(h.hpMax, h.hp + Math.round(h.hpMax * .2)); w.juice.moment('coin', { x: p.x, y: p.y, suppressText: true }); addFx(sv, 'heal', h.x, h.y - 10, { life: .5 }); }
      else if (it.type === 'magnet') { for (const g of gems) g.pull = true; w.juice.emit?.({ x: p.x, y: p.y }, { n: 16, shapes: ['spark'], size: [3, 7], speed: [80, 220], life: [250, 450] }); window.GFJuice?.sound?.play?.('special', { vol: .5 }); }
      else on?.(it);
    }
  }

  S.world = { create, toCss, camera, grid, near, nearest, nearestK, ringPoint, spawnFoe, spawnBoss, spawnStep, moveFoes, hurtHero, hitFoe, killFoe,
    dropGem, addItem, addFx, addNum, stepFx, pickups, HERO_R };
})();
