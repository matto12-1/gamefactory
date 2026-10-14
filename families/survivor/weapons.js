(function () {
  'use strict';
  // 버티기 틀 무기: 가진 무기·진화가 저절로 싸우고, 동료는 주인공 뒤를 줄지어 따라다니며 돕는다.
  // 수치는 rules.levelValue(단계·금)에 이번 판 힘(sv.stats)을 곱해 쓴다. 발사체·덫은 땅 높이 좌표, 그릴 때 위로 올린다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const SHOT_R = { arrow: 5, dart: 4, blade: 6, stone: 5, rock: 10, ball: 6, rocket: 5, bomb: 7, rider: 16, wave: 18 };
  // 차례로 몰아 쏘는 종류(0.07초 간격, 북은 0.15초). 나머지는 한꺼번에.
  const BURST = new Set(['nearest', 'swing', 'thrust', 'lob', 'ring', 'wave', 'spin', 'bomb']), GAP = { ring: .15 };
  const SHOT_MAX = 420, TRAP_MAX = 60;
  const bufA = [], bufB = [];
  const faceOf = h => Math.atan2(h.dy, h.dx);

  function stats(w, own) {
    const c = w.content, def = own.evo ? byId(c.evolutions, own.evo) : byId(c.weapons, own.id);
    const v = R.levelValue(def, own.level, own.cracks), s = w.sv.stats;
    return { def, kind: def.kind, shot: def.shot, dmg: v.dmg * s.might, cd: v.cd * s.cd, n: Math.max(1, (v.n || 1) + s.n), pierce: v.pierce || 0,
      speed: (v.speed || 0) * s.shotSpeed, area: (v.area || 0) * s.area, dur: (v.dur || 0) * s.duration };
  }

  function shoot(w, st, x, y, ang, o = {}) {
    const sv = w.sv; if (sv.shots.length >= SHOT_MAX) return null;
    const shot = o.shot || st.shot, sp = o.speed ?? st.speed;
    const s = { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang, t: 0, life: o.life ?? st.dur, dmg: o.dmg ?? st.dmg, pierce: o.pierce ?? st.pierce,
      area: o.area || 0, boom: !!o.boom, kb: o.kb ?? 40, r: o.r ?? SHOT_R[shot] ?? 5, slot: 'shot-' + shot, spin: o.spin || 0,
      back: !!o.back, fuse: !!o.fuse, drag: o.drag || 0, upright: !!o.upright, turned: false, hit: new Set() };
    sv.shots.push(s);
    return s;
  }
  function explode(w, x, y, r, dmg, kb = 60, fx = 'boom') {
    const sv = w.sv;
    for (const f of W.near(sv, x, y, r, bufB)) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1; W.hitFoe(w, f, dmg, dx / d * kb, dy / d * kb); }
    if (fx) W.addFx(sv, fx, x, y, { life: .36, size: r >= 40 ? 2 : r >= 20 ? 1.5 : 1 });
  }
  function around(w, x, y, r, dmg, kb) {
    for (const f of W.near(w.sv, x, y, r, bufA)) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1; W.hitFoe(w, f, dmg, dx / d * kb, dy / d * kb); }
  }
  function swingSound(w, x, y) {
    const sv = w.sv; if (sv.t - sv.lastSwing < .15) return;
    sv.lastSwing = sv.t; const p = W.toCss(w, x, y - 12);
    w.juice.moment('swing', { x: p.x, y: p.y, suppressText: true });
  }
  function addTrap(sv, t) {
    if (sv.traps.length >= TRAP_MAX) sv.traps.shift();
    sv.traps.push({ ...t, t: 0, tick: 0 });
  }

  // 몰아 쏘는 종류의 k번째 한 발. 과녁이 없어 못 쐈으면 false.
  function one(w, st, run, k) {
    const sv = w.sv, h = sv.hero;
    switch (st.kind) {
      case 'nearest': {
        if (k === 0) { run.targets = W.nearestK(sv, h.x, h.y, st.speed * st.dur, st.n); if (!run.targets.length) return false; }
        const f = run.targets[k % run.targets.length], ang = f && !f.dead ? Math.atan2(f.y - h.y, f.x - h.x) : run.lastAng;
        run.lastAng = ang;
        shoot(w, st, h.x, h.y, ang, { area: st.area, boom: st.area > 0, kb: st.area > 0 ? 60 : 40 });
        return true;
      }
      case 'swing': {
        const side = k % 2 === 0 ? h.faceX : -h.faceX, ox = side * st.area * .5, cx = h.x + ox, cy = h.y - 2;
        for (const f of W.near(sv, cx, cy, st.area * .55, bufA)) W.hitFoe(w, f, st.dmg, side * 90, 0);
        W.addFx(sv, 'img', cx, cy, { slot: 'shot-swing', life: Math.max(.16, st.dur), flip: side < 0, scale: st.area / 40, follow: true, ox, oy: -2 });
        swingSound(w, cx, cy);
        return true;
      }
      case 'thrust': {
        const f = W.nearest(sv, h.x, h.y, st.area + 40), ang = f ? Math.atan2(f.y - h.y, f.x - h.x) : faceOf(h);
        const dx = Math.cos(ang), dy = Math.sin(ang), L = st.area, mx = h.x + dx * L * .5, my = h.y + dy * L * .5;
        for (const g of W.near(sv, mx, my, L * .5 + 4, bufA)) {
          const t = Math.max(0, Math.min(L, (g.x - h.x) * dx + (g.y - h.y) * dy)), px = h.x + dx * t - g.x, py = h.y + dy * t - g.y;
          if (px * px + py * py <= (g.r + 5) ** 2) W.hitFoe(w, g, st.dmg, dx * 70, dy * 70);
        }
        W.addFx(sv, 'img', mx, my, { slot: 'shot-spear', life: Math.max(.16, st.dur), ang, scale: L / 32, follow: true, ox: dx * L * .5, oy: dy * L * .5, slide: 8 });
        swingSound(w, mx, my);
        return true;
      }
      case 'lob': {
        const list = W.near(sv, h.x, h.y, 160, bufA);
        let tx, ty;
        if (list.length) { const f = list[Math.floor(w.rng() * list.length)]; tx = f.x; ty = f.y; }
        else { const a = w.rng() * Math.PI * 2, d = 30 + w.rng() * 60; tx = h.x + Math.cos(a) * d; ty = h.y + Math.sin(a) * d; }
        if (sv.shots.length < SHOT_MAX) sv.shots.push({ lob: true, x: h.x, y: h.y, x0: h.x, y0: h.y, x1: tx, y1: ty, z: 0, t: 0, life: Math.max(.3, st.dur),
          dmg: st.dmg, area: st.area, kb: 60, slot: 'shot-' + st.shot, ang: 0, spin: 9, hit: null });
        return true;
      }
      case 'ring':
        around(w, h.x, h.y, st.area, st.dmg, 120);
        W.addFx(sv, 'ring', h.x, h.y, { r: st.area, life: .3, color: '#f2d27a', follow: true, ox: 0, oy: 0 });
        return true;
      case 'wave': {
        const ang = faceOf(h) + (k ? (k % 2 ? .22 : -.22) * Math.ceil(k / 2) : 0);
        shoot(w, st, h.x, h.y, ang, { r: st.area * .5, kb: 160 });
        return true;
      }
      case 'spin':
        around(w, h.x, h.y, st.area, st.dmg, 90);
        W.addFx(sv, 'spin', h.x, h.y, { slot: 'shot-swing', r: st.area, life: Math.max(.25, st.dur), follow: true, ox: 0, oy: 0 });
        swingSound(w, h.x, h.y);
        return true;
      case 'bomb': {
        if (k === 0) run.targets = W.nearestK(sv, h.x, h.y, 200, st.n);
        const f = run.targets.length ? run.targets[k % run.targets.length] : null;
        const ang = f && !f.dead ? Math.atan2(f.y - h.y, f.x - h.x) : w.rng() * Math.PI * 2, dist = f ? Math.hypot(f.x - h.x, f.y - h.y) : 80;
        // 끌림 3으로 줄어드는 빠르기가 dur 동안 과녁 거리만큼 가게: 거리 = v0/3·(1 − e^(−3·dur))
        const v0 = Math.min(700, dist * 3 / (1 - Math.exp(-3 * Math.max(.3, st.dur))));
        shoot(w, st, h.x, h.y, ang, { speed: v0, drag: 3, fuse: true, area: st.area, kb: 100, spin: 8 });
        return true;
      }
    }
    return false;
  }

  // 한꺼번에 쏘는 종류.
  function all(w, st) {
    const sv = w.sv, h = sv.hero, face = faceOf(h), n = st.n;
    switch (st.kind) {
      case 'throw':
        for (let i = 0; i < n; i++) shoot(w, st, h.x, h.y, face + (i - (n - 1) / 2) * .15, { spin: 16 });
        return true;
      case 'trap': case 'mine':
        for (let i = 0; i < n; i++) {
          const a = w.rng() * Math.PI * 2, d = 12 + w.rng() * 48;
          addTrap(sv, { x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, dmg: st.dmg, area: st.area, life: st.dur, mine: st.kind === 'mine', slot: 'shot-' + st.shot });
        }
        return true;
      case 'spread': case 'fan': {
        const f = W.nearest(sv, h.x, h.y, 240), base = f ? Math.atan2(f.y - h.y, f.x - h.x) : face, half = st.kind === 'fan' ? .5 : .3;
        for (let i = 0; i < n; i++) shoot(w, st, h.x, h.y, base + (n > 1 ? (i / (n - 1) - .5) * 2 * half : 0), { area: st.area, boom: st.area > 0, kb: 50 });
        return true;
      }
      case 'boomerang':
        for (let i = 0; i < n; i++) shoot(w, st, h.x, h.y, face + i * Math.PI * 2 / n, { back: true, spin: 18, r: 8, kb: 50 });
        return true;
      case 'charge': {
        const dx = Math.cos(face), dy = Math.sin(face);
        for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 40; shoot(w, st, h.x - dx * 120 - dy * off, h.y - dy * 120 + dx * off, face, { upright: true, kb: 140 }); }
        return true;
      }
      case 'thunder':
        around(w, h.x, h.y, st.area, st.dmg, 100);
        W.addFx(sv, 'ring', h.x, h.y, { r: st.area, life: .3, color: '#bfe4ff', follow: true, ox: 0, oy: 0 });
        for (const f of W.nearestK(sv, h.x, h.y, 200, n)) { W.addFx(sv, 'bolt', f.x, f.y, { life: .22, seed: w.fxRng() }); explode(w, f.x, f.y, 20, st.dmg, 60, null); }
        window.GFJuice?.sound?.play?.('hit', { vol: .5, semitones: -5 });
        return true;
      case 'flood': {
        const px = w.px, cam = sv.cam, cx = cam.x + px.W / 2, cy = cam.y + px.H / 2, hw = px.W / 2 + 20, hh = px.H / 2 + 20;
        for (const f of sv.foes) {
          if (f.dead || Math.abs(f.x - cx) > hw || Math.abs(f.y - cy) > hh) continue;
          const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1;
          W.hitFoe(w, f, st.dmg, dx / d * 300, dy / d * 300);
        }
        W.addFx(sv, 'flood', h.x, h.y, { life: 1 });
        window.GFJuice?.sound?.play?.('special', { vol: .45, semitones: -7 });
        return true;
      }
    }
    return false;
  }

  // 거북선: 주인공 둘레를 돌며 닿은 적을 치고(같은 적 0.5초에 한 번), cd마다 포탄을 쏜다.
  function orbit(w, st, run, dt) {
    const sv = w.sv, h = sv.hero, n = st.n, rad = st.area;
    run.ang += st.speed / Math.max(1, rad) * dt;
    run.hitAt ||= new Map(); if (run.hitAt.size > 400) run.hitAt.clear();
    run.cd -= dt;
    const shootNow = run.cd <= 0; if (shootNow) run.cd = st.cd;
    for (let i = 0; i < n; i++) {
      const a = run.ang + i * Math.PI * 2 / n, x = h.x + Math.cos(a) * rad, y = h.y + Math.sin(a) * rad;
      sv.orbs.push({ x, y, slot: 'shot-' + st.shot, flip: -Math.sin(a) < 0, scale: 1 });
      for (const f of W.near(sv, x, y, 16, bufA)) {
        const last = run.hitAt.get(f); if (last != null && sv.t - last < .5) continue;
        run.hitAt.set(f, sv.t); W.hitFoe(w, f, st.dmg, Math.cos(a) * 60, Math.sin(a) * 60);
      }
      if (shootNow) { const f = W.nearest(sv, x, y, 220); if (f) shoot(w, st, x, y, Math.atan2(f.y - y, f.x - x), { shot: 'ball', speed: 220, area: 20, boom: true, life: 1.2, pierce: 0, kb: 60, dmg: st.dmg * .8 }); }
    }
  }

  function moveShots(w, dt) {
    const sv = w.sv, h = sv.hero, shots = sv.shots; let n = 0;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      s.t += dt; if (s.spin) s.ang += s.spin * dt;
      if (s.lob) {
        const k = Math.min(1, s.t / s.life);
        s.x = s.x0 + (s.x1 - s.x0) * k; s.y = s.y0 + (s.y1 - s.y0) * k; s.z = 144 * k * (1 - k);
        if (k >= 1) { explode(w, s.x1, s.y1, s.area, s.dmg, s.kb, 'dust'); continue; }
        shots[n++] = s; continue;
      }
      if (s.back && !s.turned && s.t >= s.life * .5) { s.turned = true; s.hit.clear(); }
      if (s.turned) {
        const dx = h.x - s.x, dy = h.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy);
        if (d < 10 || s.t > s.life * 2) continue;
        s.vx = dx / d * sp; s.vy = dy / d * sp;
      }
      if (s.drag) { const k = Math.exp(-s.drag * dt); s.vx *= k; s.vy *= k; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t >= s.life && !s.back) { if (s.fuse) explode(w, s.x, s.y, s.area, s.dmg, s.kb); continue; }
      if (!s.fuse) {
        let gone = false;
        for (const f of W.near(sv, s.x, s.y, s.r, bufA)) {
          if (s.hit.has(f)) continue;
          s.hit.add(f);
          if (s.boom) { explode(w, s.x, s.y, s.area, s.dmg, s.kb); gone = true; break; }
          const sp = Math.hypot(s.vx, s.vy) || 1;
          W.hitFoe(w, f, s.dmg, s.vx / sp * s.kb, s.vy / sp * s.kb);
          if (--s.pierce < 0) { gone = true; break; }
        }
        if (gone) continue;
      }
      shots[n++] = s;
    }
    shots.length = n;
  }
  function stepTraps(w, dt) {
    const sv = w.sv; let n = 0;
    for (const t of sv.traps) {
      t.t += dt;
      if (t.t >= t.life) continue;
      if (t.mine) {
        if (W.near(sv, t.x, t.y, 4, bufA).length) { explode(w, t.x, t.y, t.area, t.dmg, 90); continue; }
      } else if ((t.tick -= dt) <= 0) {
        t.tick = .5;
        for (const f of W.near(sv, t.x, t.y, t.area, bufA)) W.hitFoe(w, f, t.dmg, 0, 0);
      }
      sv.traps[n++] = t;
    }
    sv.traps.length = n;
  }

  function update(w, dt) {
    const sv = w.sv;
    sv.orbs.length = 0;
    for (const own of sv.kit.weapons) {
      let run = sv.wrun.get(own.id);
      if (!run) sv.wrun.set(own.id, run = { cd: .25, burst: 0, burstT: 0, k: 0, ang: 0, lastAng: faceOf(sv.hero), targets: [], st: null, hitAt: null });
      const st = stats(w, own);
      if (st.kind === 'orbit') { orbit(w, st, run, dt); continue; }
      if (run.burst > 0 && (run.burstT -= dt) <= 0) { one(w, run.st, run, run.k++); run.burst--; run.burstT += GAP[st.kind] ?? .07; }
      if ((run.cd -= dt) > 0) continue;
      let ok;
      if (BURST.has(st.kind)) {
        run.st = st; run.k = 0; ok = one(w, st, run, run.k++);
        if (ok) { run.burst = st.n - 1; run.burstT = GAP[st.kind] ?? .07; }
      } else ok = all(w, st);
      run.cd = ok ? st.cd : .1;
    }
    moveShots(w, dt);
    stepTraps(w, dt);
  }

  // 진화: 무기 자리는 그대로, 수치표를 진화 것으로 바꾼다. 금은 지운다.
  function evolve(w, evo) {
    const sv = w.sv, own = sv.kit.weapons.find(x => x.id === evo.weapon && !x.evo);
    if (!own) return false;
    own.evo = evo.id; own.cracks = 0; sv.wrun.delete(own.id); sv.seen.evolutions.add(evo.id); sv.flash = .15;
    return true;
  }

  // 동료: 주인공이 지나간 자리(trail)를 따라 줄지어 걷는다. 벤다·돌진·밀어내기·떡은 스스로, 나머지는 힘(statsOf)에만.
  function allies(w, dt) {
    const sv = w.sv, h = sv.hero, c = w.content, tr = sv.trail, last = tr[tr.length - 1], list = sv.kit.allies;
    if (!last || (h.x - last.x) ** 2 + (h.y - last.y) ** 2 > 9) { tr.push({ x: h.x, y: h.y }); if (tr.length > 120) tr.shift(); }
    for (let i = 0; i < list.length; i++) {
      const own = list[i], def = (c.allies || []).find(a => a.person === own.id); if (!def) continue;
      let b = sv.allyBodies[i];
      if (!b || b.id !== own.id) b = sv.allyBodies[i] = { id: own.id, person: byId(c.people, own.id)?.person ?? 0, x: h.x - h.faceX * 16 * (i + 1), y: h.y + 2,
        faceX: h.faceX, anim: 0, moving: false, dash: 0, vx: 0, vy: 0, hit: null, t: 1.5 + i * .7, act: 0 };
      const v = R.allyValue(def, own.level, own.cracks);
      if (b.act > 0) b.act -= dt;
      if (b.dash > 0) {
        b.dash -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.moving = true; b.anim += dt * 2;
        for (const f of W.near(sv, b.x, b.y, 10, bufA)) if (!b.hit.has(f)) { b.hit.add(f); W.hitFoe(w, f, v * sv.stats.might, b.vx * .3, b.vy * .3); }
        if (b.dash <= 0) W.addFx(sv, 'smoke', b.x, b.y - 6, { life: .3, size: 1 });
      } else {
        const p = tr[Math.max(0, tr.length - 1 - (i + 1) * 6)] || h, dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        b.moving = d > 1.5;
        if (b.moving) {
          const step = Math.min(d, Math.max(w.family.tuning.hero.speed * 1.25, d * 6) * dt);
          b.x += dx / d * step; b.y += dy / d * step; b.anim += dt;
          if (Math.abs(dx) > .5) b.faceX = dx < 0 ? -1 : 1;
        }
      }
      if ((b.t -= dt) > 0) continue;
      switch (def.does) {
        case 'slash': {
          const f = W.nearest(sv, b.x, b.y, 40);
          if (!f) { b.t = .2; break; }
          const side = f.x < b.x ? -1 : 1; b.faceX = side; b.act = .2;
          around(w, b.x, b.y, 40, v * sv.stats.might, 80);
          W.addFx(sv, 'img', b.x + side * 14, b.y - 2, { slot: 'shot-swing', life: .2, flip: side < 0, scale: 1 });
          swingSound(w, b.x, b.y); b.t = 1.2;
          break;
        }
        case 'dash': {
          const f = W.nearest(sv, b.x, b.y, 160);
          if (!f) { b.t = .5; break; }
          const dx = f.x - b.x, dy = f.y - b.y, d = Math.hypot(dx, dy) || 1;
          b.dash = .4; b.vx = dx / d * 300; b.vy = dy / d * 300; b.hit = new Set(); b.faceX = dx < 0 ? -1 : 1; b.t = 6;
          W.addFx(sv, 'smoke', b.x, b.y - 4, { life: .3, size: 1 });
          break;
        }
        case 'push': {
          if (!W.near(sv, h.x, h.y, v, bufA).length) { b.t = .5; break; }
          for (const f of bufA) { const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1; f.kbx += dx / d * 260; f.kby += dy / d * 260; }
          W.addFx(sv, 'ring', h.x, h.y, { r: v, life: .4, color: '#e8f4ff', follow: true, ox: 0, oy: 0 });
          b.act = .3; b.t = 5;
          break;
        }
        case 'feed':
          W.addItem(sv, 'food', b.x + b.faceX * 8, b.y + 2); b.act = .3; b.t = 20;
          break;
        default: b.t = 999;
      }
    }
    sv.allyBodies.length = list.length;
  }

  S.weapons = { stats, update, allies, evolve, explode };
})();
