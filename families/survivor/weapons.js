(function () {
  'use strict';
  // 버티기 틀 무기: 가진 무기·진화가 저절로 싸우고, 동료는 주인공 뒤를 줄지어 따라다니며 돕는다.
  // 수치는 rules.levelValue(단계·금)에 이번 판 힘(sv.stats)을 곱해 쓴다. 발사체·덫은 땅 높이 좌표, 그릴 때 위로 올린다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  // 무기 자료의 shot은 그림 칸 이름(shot-arrow) 그대로다. 옛 꼴(arrow)도 받는다. 앞말을 두 번 붙이면 그림을 못 찾아 발사체가 안 보인다.
  const slotOf = s => !s ? null : String(s).startsWith('shot-') ? s : 'shot-' + s, bare = s => String(s || '').replace(/^shot-/, '');
  const SHOT_R = { arrow: 5, dart: 4, blade: 6, stone: 5, rock: 10, ball: 6, rocket: 5, bomb: 7, rider: 16, wave: 18 };
  // 차례로 몰아 쏘는 종류(0.07초 간격, 북은 0.15초). 나머지는 한꺼번에.
  const BURST = new Set(['nearest', 'swing', 'thrust', 'slash', 'lob', 'ring', 'wave', 'spin', 'bomb']), GAP = { ring: .15 };
  const SHOT_MAX = 420, TRAP_MAX = 60;
  // Reset optional evolution state without deleting the reused body's fields.
  // A stable object layout avoids rebuilding a dictionary for every rain arrow.
  const SHOT_RESET = { halfLength:0,exit:null,right:false,
    rain:false,cx:0,cy:0,radius:0,dropAt:0,z:0,home:null,strong:false,cluster:null,
    fragment:false,mine:false,evoX:null,evoY:null,evoZ:null };
  const bufA = [], bufB = [];
  const faceOf = h => Math.atan2(h.dy, h.dx);
  const focus = (w, x, y, range) => w.sv.bossOn.find(f => !f.dead && (f.x - x) ** 2 + (f.y - y) ** 2 < range ** 2) || W.nearest(w.sv, x, y, range);

  function stats(w, own) {
    const value = R.weaponStats(w.content, w.family.tuning, own, w.sv.stats);
    value.source = own.evo || own.id;
    return S.evolution.decorate(w, value);
  }

  function shoot(w, st, x, y, ang, o = {}) {
    const sv = w.sv; if (sv.shots.length >= SHOT_MAX) return null;
    const shot = o.shot || st.shot, sp = o.speed ?? st.speed;
    const pooled = EVO2.has(st.kind), recycled = pooled ? (sv.shotPool ||= []).pop() : null, hit = recycled?.hit || new Set();
    hit.clear();
    const s = Object.assign(recycled || {}, pooled ? SHOT_RESET : null, { source: st.source, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang, t: 0, life: o.life ?? st.dur, dmg: o.dmg ?? st.dmg, pierce: o.pierce ?? st.pierce,
      area: o.area || 0, boom: !!o.boom, kb: o.kb ?? 40, r: o.r ?? SHOT_R[bare(shot)] ?? 5, slot: st.visual ? (o.shot ? S.evolution.utility(w, 'turtleBall') : st.visual.attack) : slotOf(shot), spin: o.spin || 0,
      scale: st.visualScale || 1, wave: st.kind === 'wave',
      throughWall: st.kind === 'wave' || st.kind === 'charge', blockWall: ['crescent', 'homing', 'nova'].includes(st.kind),
      back: !!o.back, fuse: !!o.fuse, drag: o.drag || 0, upright: !!o.upright, turned: false, hit, evo2: pooled });
    sv.shots.push(s);
    if (pooled && st.def?.hitLength) s.halfLength = Math.max(0, st.def.hitLength / 2 - s.r);
    return s;
  }
  // 동료가 쏜 것(ally 이름표)은 무기 피해 막대에 섞지 않고 동료 기록으로 센다.
  const strike = (w, f, dmg, kx, ky, source, ally) => ally ? S.allies.strike(w, ally, f, dmg, kx, ky) : W.hitFoe(w, f, dmg, kx, ky, source);
  function explode(w, x, y, r, dmg, kb = 60, fx = 'boom', source = null, ally = null) {
    const sv = w.sv;
    for (const f of W.near(sv, x, y, r, bufB)) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1; strike(w, f, dmg, dx / d * kb, dy / d * kb, source, ally); }
    const visual = S.evolution.visual(w, source);
    if (fx && visual) {
      // Show the area with separate, native-size bursts. Cosmetic placement must
      // not consume the combat random stream or change any collision radius.
      const width = w.art.slots[visual.hit]?.w || 40, wide = r * 2 > width * 2;
      const scale = wide ? 1 : Math.max(.5, r * 2 / width);
      W.addFx(sv, 'img', x, y, { slot: visual.hit, life: .3, scale, evo: true });
      if (wide) {
        W.addFx(sv, 'ring', x, y, { r, life: .3, fixed: true, color: '#dcc49a', evo: true });
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, d = r * .68;
          W.addFx(sv, 'img', x + Math.cos(a) * d, y + Math.sin(a) * d,
            { slot: visual.hit, life: .3, scale, evo: true });
        }
      }
    }
    else if (fx) W.addFx(sv, fx, x, y, { life: .36, size: r >= 40 ? 2 : r >= 20 ? 1.5 : 1 });
  }
  function around(w, x, y, r, dmg, kb, source = null) {
    for (const f of W.near(w.sv, x, y, r, bufA)) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1; W.hitFoe(w, f, dmg, dx / d * kb, dy / d * kb, source); }
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
        if (k === 0) {
          run.targets = W.nearestK(sv, h.x, h.y, st.speed * st.dur, st.n);
          const boss = focus(w, h.x, h.y, st.speed * st.dur);
          if (boss?.boss && !run.targets.includes(boss)) { run.targets.unshift(boss); run.targets.length = Math.min(st.n, run.targets.length); }
          if (!run.targets.length) return false;
        }
        const f = run.targets[k % run.targets.length], ang = f && !f.dead ? Math.atan2(f.y - h.y, f.x - h.x) : run.lastAng;
        run.lastAng = ang;
        shoot(w, st, h.x, h.y, ang, { area: st.area, boom: st.area > 0, kb: st.area > 0 ? 60 : 40 });
        return true;
      }
      case 'swing': {
        const side = k % 2 === 0 ? h.faceX : -h.faceX, ox = side * st.area * .5, cx = h.x + ox, cy = h.y - 2;
        for (const f of W.near(sv, cx, cy, st.area * .55, bufA)) W.hitFoe(w, f, st.dmg, side * 90, 0, st.source);
        W.addFx(sv, 'img', cx, cy, { slot: 'shot-swing', life: Math.max(.16, st.dur), flip: side < 0, scale: st.area / 40, follow: true, ox, oy: -2 });
        swingSound(w, cx, cy);
        return true;
      }
      case 'thrust': {
        const f = focus(w, h.x, h.y, st.area + 40), ang = f ? Math.atan2(f.y - h.y, f.x - h.x) : faceOf(h);
        const dx = Math.cos(ang), dy = Math.sin(ang), L = st.area, mx = h.x + dx * L * .5, my = h.y + dy * L * .5;
        for (const g of W.near(sv, mx, my, L * .5 + 4, bufA)) {
          const t = Math.max(0, Math.min(L, (g.x - h.x) * dx + (g.y - h.y) * dy)), px = h.x + dx * t - g.x, py = h.y + dy * t - g.y;
          if (px * px + py * py <= (g.r + 5) ** 2) W.hitFoe(w, g, st.dmg, dx * 70, dy * 70, st.source);
        }
        // 찌르기 그림은 무기의 shot(창은 shot-spear, 칼은 베기 자국)을 찌른 길이에 맞춰 늘인다.
        const slot = slotOf(st.shot) || 'shot-spear', width = w.art?.slots?.[slot]?.w || 32;
        W.addFx(sv, 'img', mx, my, { slot, life: Math.max(.16, st.dur), ang, scale: L / width, follow: true, ox: dx * L * .5, oy: dy * L * .5, slide: 8 });
        swingSound(w, mx, my);
        return true;
      }
      case 'slash': {
        // 겨눠 베기(칼): 휘두르기와 같은 반달 범위·그림 크기를 가까운 적 쪽 앞에 낸다. 휘두르기는 옆만 베어 첫 레벨업이 늦었다(10-19).
        // 여러 번 벨 때는 물결처럼 좌우로 조금씩 틀어 부채꼴로 벤다.
        const f = focus(w, h.x, h.y, st.area + 40), ang = (f ? Math.atan2(f.y - h.y, f.x - h.x) : faceOf(h)) + (k ? (k % 2 ? .5 : -.5) * Math.ceil(k / 2) : 0);
        const dx = Math.cos(ang), dy = Math.sin(ang), ox = dx * st.area * .5, oy = dy * st.area * .5 - 2, cx = h.x + ox, cy = h.y + oy;
        for (const g of W.near(sv, cx, cy, st.area * .55, bufA)) W.hitFoe(w, g, st.dmg, dx * 90, dy * 90, st.source);
        W.addFx(sv, 'img', cx, cy, { slot: slotOf(st.shot) || 'shot-swing', life: Math.max(.16, st.dur), ang, scale: st.area / 40, follow: true, ox, oy });
        swingSound(w, cx, cy);
        return true;
      }
      case 'lob': {
        const list = W.near(sv, h.x, h.y, 160, bufA);
        let tx, ty;
        if (list.length) { const f = list[Math.floor(w.rng() * list.length)]; tx = f.x; ty = f.y; }
        else { const a = w.rng() * Math.PI * 2, d = 30 + w.rng() * 60; tx = h.x + Math.cos(a) * d; ty = h.y + Math.sin(a) * d; }
        if (sv.shots.length < SHOT_MAX) sv.shots.push({ lob: true, x: h.x, y: h.y, x0: h.x, y0: h.y, x1: tx, y1: ty, z: 0, t: 0, life: Math.max(.3, st.dur),
          source: st.source, dmg: st.dmg, area: st.area, kb: 60, slot: st.visual?.attack || slotOf(st.shot), scale: st.visualScale || 1, wallR: SHOT_R[bare(st.shot)] ?? 5, ang: 0, spin: 9, hit: null });
        return true;
      }
      case 'ring':
        around(w, h.x, h.y, st.area, st.dmg, 120, st.source);
        W.addFx(sv, 'ring', h.x, h.y, { r: st.area, life: .3, color: '#f2d27a', follow: true, ox: 0, oy: 0 });
        return true;
      case 'wave': {
        const ang = faceOf(h) + (k ? (k % 2 ? .22 : -.22) * Math.ceil(k / 2) : 0);
        shoot(w, st, h.x, h.y, ang, { r: st.area * .5, kb: 160 });
        return true;
      }
      case 'spin':
        around(w, h.x, h.y, st.area, st.dmg, 90, st.source);
        W.addFx(sv, 'img', h.x, h.y, { slot: st.visual.attack, scale: st.visualScale, turn: Math.PI * 1.5, lift: 6, evo: true, life: Math.max(.25, st.dur), follow: true, ox: 0, oy: 0 });
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


  // Evolution-only patterns. Bounded volleys use the normal shot array and recycle
  // shot bodies and their hit sets; pictures use the existing bounded effect pool.
  const EVO2 = new Set(['crescent', 'stampede', 'rain', 'homing', 'nova', 'beam', 'cluster']);
  const laneEvents = [], lanePool = [];
  function inView(w, f) {
    const p = w.px, c = w.sv.cam;
    return !f.dead && f.x >= c.x && f.x <= c.x + (p?.W || 640) &&
      f.y >= c.y + (p?.top || 0) && f.y <= c.y + (p?.H || 640);
  }
  function aimed(w) {
    const h = w.sv.hero;
    if (Math.hypot(h.dx, h.dy) > .01) return faceOf(h);
    const f = W.nearest(w.sv, h.x, h.y, 1000);
    return f ? Math.atan2(f.y - h.y, f.x - h.x) : (h.faceX < 0 ? Math.PI : 0);
  }
  function homeTarget(w, x, y, strong, hit) {
    let best = null, rank = -1, value = -Infinity;
    for (const f of w.sv.foes) {
      if (!inView(w, f) || hit?.has(f)) continue;
      const r = strong && (f.boss || f.kind === 'elite') ? 1 : 0;
      const v = strong ? f.hp : -((f.x - x) ** 2 + (f.y - y) ** 2);
      if (r > rank || r === rank && v > value) { best = f; rank = r; value = v; }
    }
    return best;
  }
  function dense(w, radius) {
    const sv = w.sv, stride = Math.max(1, Math.ceil(sv.foes.length / 16));
    let point = sv.hero, best = 0;
    for (let i = 0; i < sv.foes.length; i += stride) {
      const f = sv.foes[i]; if (!inView(w, f)) continue;
      let count = 0;
      for (const g of W.near(sv, f.x, f.y, radius, bufB)) if (inView(w, g)) count++;
      if (count > best) { best = count; point = f; }
    }
    return point;
  }
  function cavalryLane(w, spread, top, height) {
    const low = top + spread, high = top + height - spread, heroY = Math.max(low, Math.min(high, w.sv.hero.y));
    let used = 0;
    const event = (y, delta) => { const e = lanePool[used] ||= {}; e.y = y; e.delta = delta; laneEvents[used++] = e; };
    for (const f of w.sv.foes) if (inView(w, f)) {
      const start = Math.max(low, f.y - spread - f.r), end = Math.min(high, f.y + spread + f.r);
      if (start <= end) { event(start, 1); event(end, -1); }
    }
    laneEvents.length = used; laneEvents.sort((a, b) => a.y - b.y || b.delta - a.delta);
    let count = 0, best = 0, cy = heroY;
    const consider = y => { if (count > best || count === best && Math.abs(y - heroY) < Math.abs(cy - heroY)) { best = count; cy = y; } };
    for (let i = 0; i < used;) {
      const y = laneEvents[i].y; let ends = 0;
      while (i < used && laneEvents[i].y === y) { if (laneEvents[i++].delta > 0) count++; else ends++; }
      consider(y); count -= ends;
      if (i < used) consider(Math.max(y, Math.min(laneEvents[i].y, heroY)));
    }
    return cy;
  }
  function segmentHit(w, x, y, angle, length, width, dmg, source) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    for (const f of W.near(w.sv, x + dx * length / 2, y + dy * length / 2, length / 2 + width, bufA)) {
      const along = (f.x - x) * dx + (f.y - y) * dy;
      const t = Math.max(0, Math.min(length, along));
      if ((f.x - x - dx * t) ** 2 + (f.y - y - dy * t) ** 2 <= (f.r + width / 2) ** 2)
        W.hitFoe(w, f, dmg, dx * 70, dy * 70, source);
    }
  }
  function linePicture(w, st, x, y, angle, length, width) {
    W.addFx(w.sv, 'evo-beam', x, y, { slot: st.visual?.attack || slotOf(st.shot),
      ang: angle, length, width, life: .22, evo: true });
  }
  function evoAll(w, st) {
    const sv = w.sv, h = sv.hero, face = aimed(w);
    switch (st.kind) {
      case 'crescent':
        for (let i = 0; i < Math.min(4, st.n); i++) shoot(w, st, h.x, h.y, face + (i - (Math.min(4, st.n) - 1) / 2) * .15,
          { r: st.area / 2, pierce: 999, kb: 80 });
        return true;
      case 'stampede': {
        const n = Math.max(3, Math.min(5, st.n)), p = w.px, c = sv.cam;
        const height = (p?.H || 640) - (p?.top || 0), top = c.y + (p?.top || 0), spread = (n - 1) * (st.area || 24) / 2 + 16;
        const cy = cavalryLane(w, spread, top, height), right = w.rng() < .5;
        const left = c.x - 64, edge = c.x + (p?.W || 640) + 64;
        for (let i = 0; i < n; i++) {
          const s = shoot(w, st, right ? left - i * 18 : edge + i * 18, cy + (i - (n - 1) / 2) * (st.area || 24), right ? 0 : Math.PI,
            { upright: true, r: 16, pierce: 999, life: ((p?.W || 640) + 240) / st.speed, kb: 140 });
          if (s) { s.exit = right ? edge : left; s.right = right; }
        }
        return true;
      }
      case 'rain': {
        const center = dense(w, st.area), cx = center.x, cy = center.y, n = Math.min(24, st.n);
        const targets = W.near(sv, cx, cy, st.area, bufA).filter(f => inView(w, f) && Math.hypot(f.x - cx, f.y - cy) <= st.area);
        W.addFx(sv, 'ring', cx, cy, { r: st.area, life: .35, color: st.source === 'firerain' ? '#ff9b38' : '#b9d6ec', fixed: true });
        for (let i = 0; i < n; i++) {
          const target = targets[i % Math.max(1, targets.length)], a = w.rng() * Math.PI * 2, r = Math.sqrt(w.rng()) * st.area;
          const x = target ? target.x : cx + Math.cos(a) * r, y = target ? target.y : cy + Math.sin(a) * r;
          const s = shoot(w, st, x, y, Math.PI / 2, { speed: 0, life: .5 + i * .035, r: st.source === 'firerain' ? 16 : 5, pierce: 999 });
          if (s) { s.rain = true; s.cx = cx; s.cy = cy; s.radius = st.area; s.dropAt = .22 + i * .035; s.z = 100; }
          W.addFx(sv, 'ring', x, y, { r: 9, life: .5 + i * .035, color: '#f1d887', fixed: true });
        }
        return true;
      }
      case 'homing': {
        const strong = st.def.target === 'strongest', target = homeTarget(w, h.x, h.y, strong);
        if (!target) return false;
        for (let i = 0; i < Math.min(6, st.n); i++) {
          const angle = Math.atan2(target.y - h.y, target.x - h.x) + (i - (Math.min(6, st.n) - 1) / 2) * .18;
          const s = shoot(w, st, h.x, h.y, angle, { r: st.def.hitRadius ?? (strong ? 9 : 5), pierce: 0 });
          if (s) { s.home = target; s.strong = strong; }
        }
        return true;
      }
      case 'nova': {
        const n = Math.max(8, Math.min(16, st.n));
        for (let i = 0; i < n; i++) {
          const a = face + i * Math.PI * 2 / n;
          if (st.def.weapon === 'longspear') {
            segmentHit(w, h.x, h.y, a, st.area, 12, st.dmg, st.source);
            linePicture(w, st, h.x, h.y, a, st.area, 12);
          } else shoot(w, st, h.x, h.y, a, { r: 5, area: st.area, boom: st.area > 0, pierce: st.pierce, kb: 70 });
        }
        return true;
      }
      case 'beam': {
        const target = W.nearest(sv, h.x, h.y, 1200), angle = target ? Math.atan2(target.y - h.y, target.x - h.x) : face;
        const dx = Math.cos(angle), dy = Math.sin(angle), p = w.px, c = sv.cam;
        const n = st.def.weapon === 'musket' ? Math.max(3, Math.min(5, st.n)) : 1;
        for (let i = 0; i < n; i++) {
          const offset = (i - (n - 1) / 2) * 18, x = h.x - dy * offset, y = h.y + dx * offset;
          const tx = Math.abs(dx) < 1e-8 ? Infinity : ((dx > 0 ? c.x + (p?.W || 640) : c.x) - x) / dx;
          const ty = Math.abs(dy) < 1e-8 ? Infinity : ((dy > 0 ? c.y + (p?.H || 640) : c.y + (p?.top || 0)) - y) / dy;
          const length = Math.max(0, Math.min(tx, ty));
          segmentHit(w, x, y, angle, length, st.area, st.dmg, st.source);
          linePicture(w, st, x, y, angle, length, st.area);
        }
        return true;
      }
      case 'cluster': {
        const f = dense(w, 60), angle = Math.atan2(f.y - h.y, f.x - h.x);
        const distance = Math.min(180, Math.hypot(f.x - h.x, f.y - h.y)), life = .6;
        const s = shoot(w, st, h.x, h.y, angle, { speed: distance / life, life, r: 8, pierce: 999, spin: 8 });
        if (s) s.cluster = st;
        return true;
      }
    }
    return false;
  }
  function splitCluster(w, s) {
    const st = s.cluster, ground = ['caltrop', 'suroe'].includes(st.def.weapon), n = Math.max(4, Math.min(ground ? 16 : 8, st.n));
    explode(w, s.x, s.y, st.area, s.dmg, 80, 'boom', s.source);
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n, chain = st.def.weapon === 'suroe';
      const scatter = ground ? st.area * 1.5 : st.area;
      const piece = shoot(w, st, chain ? s.x + Math.cos(a) * scatter : s.x, chain ? s.y + Math.sin(a) * scatter : s.y, a,
        { speed: chain ? 0 : ground ? 280 : 140, life: chain ? .2 + i * .1 : ground ? .4 : .3, r: 5, dmg: s.dmg * .5, pierce: 999 });
      if (piece) {
        piece.fragment = true; piece.mine = st.source === 'boomtrap'; piece.area = st.area * (ground ? .65 : .5);
        piece.slot = st.def.fragmentShot || st.visual?.hit || slotOf(st.shot); piece.scale = 1;
      }
    }
  }
  function moveEvoShot(w, s, dt) {
    const sv = w.sv;
    if (s.rain) {
      if (s.t < s.dropAt) return true;
      s.z = Math.max(0, 100 * (1 - (s.t - s.dropAt) / .28));
      if (s.t < s.life) return true;
      for (const f of W.near(sv, s.x, s.y, s.r, bufA))
        if (Math.hypot(f.x - s.cx, f.y - s.cy) <= s.radius) W.hitFoe(w, f, s.dmg, 0, 30, s.source);
      const v = S.evolution.visual(w, s.source);
      if (v) W.addFx(sv, 'img', s.x, s.y, { slot: v.hit, life: .2, scale: .65, evo: true });
      return false;
    }
    if (s.home) {
      if (s.home.dead || !inView(w, s.home)) s.home = homeTarget(w, s.x, s.y, s.strong, s.hit);
      if (!s.home) return false;
      const desired = Math.atan2(s.home.y - s.y, s.home.x - s.x);
      const delta = Math.atan2(Math.sin(desired - s.ang), Math.cos(desired - s.ang));
      s.ang += Math.max(-5 * dt, Math.min(5 * dt, delta));
      const speed = Math.hypot(s.vx, s.vy); s.vx = Math.cos(s.ang) * speed; s.vy = Math.sin(s.ang) * speed;
    }
    const ox = s.x, oy = s.y;
    const speed = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / speed, uy = s.vy / speed, half = s.halfLength || 0;
    if (s.blockWall && W.blockShot(w, s, s.x + s.vx * dt + ux * half, s.y + s.vy * dt + uy * half, s.r)) return false;
    if (!(s.fragment && s.mine && s.t >= s.life)) { s.x += s.vx * dt; s.y += s.vy * dt; }
    if (s.cluster && s.t >= s.life) { splitCluster(w, s); return false; }
    if (s.fragment) {
      if (s.t < s.life) return true;
      if (s.mine && s.t < s.life + .45 && !W.near(sv, s.x, s.y, 4, bufA).length) return true;
      explode(w, s.x, s.y, s.area, s.dmg, 60, 'boom', s.source);
      return false;
    }
    if (s.cluster) return true;
    if (s.t >= s.life || s.exit != null && (s.right ? s.x > s.exit : s.x < s.exit)) return false;
    const ax = ox - ux * half, ay = oy - uy * half;
    const dx = s.x + ux * half - ax, dy = s.y + uy * half - ay, length2 = dx * dx + dy * dy;
    for (const f of W.near(sv, (ox + s.x) / 2, (oy + s.y) / 2, Math.sqrt(length2) / 2 + s.r, bufA)) {
      if (s.hit.has(f) || s.home && s.home !== f) continue;
      const t = length2 ? Math.max(0, Math.min(1, ((f.x - ax) * dx + (f.y - ay) * dy) / length2)) : 0;
      if ((f.x - ax - dx * t) ** 2 + (f.y - ay - dy * t) ** 2 > (s.r + f.r) ** 2) continue;
      s.hit.add(f);
      if (s.boom) { explode(w, s.x, s.y, s.area, s.dmg, s.kb, 'boom', s.source); return false; }
      W.hitFoe(w, f, s.dmg, ux * s.kb, uy * s.kb, s.source);
      if (--s.pierce < 0) return false;
    }
    return true;
  }

  // 한꺼번에 쏘는 종류.
  function all(w, st) {
    const sv = w.sv, h = sv.hero, face = faceOf(h), n = st.n;
    if (EVO2.has(st.kind)) return evoAll(w, st);
    switch (st.kind) {
      case 'throw':
        for (let i = 0; i < n; i++) shoot(w, st, h.x, h.y, face + (i - (n - 1) / 2) * .15, { spin: 16 });
        return true;
      case 'trap': case 'mine':
        for (let i = 0; i < n; i++) {
          // 밟아야 터지는 덫이 벽 속 깊이 놓이면 적이 못 닿아 수명 내내 안 터진다. 벽 밖으로 민다.
          const a = w.rng() * Math.PI * 2, d = 12 + w.rng() * 48, p = { x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d }; W.unwall(w, p, 2);
          addTrap(sv, { source: st.source, x: p.x, y: p.y, dmg: st.dmg, area: st.area, life: st.dur, mine: st.kind === 'mine', slot: st.visual?.attack || slotOf(st.shot), scale: st.visualScale || 1 });
        }
        return true;
      case 'spread': case 'fan': {
        const f = W.nearest(sv, h.x, h.y, 240), base = f ? Math.atan2(f.y - h.y, f.x - h.x) : face, half = st.kind === 'fan' ? .5 : 1.2;
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
        around(w, h.x, h.y, st.area, st.dmg, 100, st.source);
        W.addFx(sv, 'img', h.x, h.y, { slot: st.visual.attack, scale: st.visualScale, life: .3, lift: 6, evo: true, follow: true, ox: 0, oy: 0 });
        for (const f of W.nearestK(sv, h.x, h.y, 200, n)) { W.addFx(sv, 'img', f.x, f.y, { slot: st.visual.hit, life: .22, lift: 48, evo: true }); explode(w, f.x, f.y, 20, st.dmg, 60, null, st.source); }
        window.GFJuice?.sound?.play?.('hit', { vol: .5, semitones: -5 });
        return true;
      case 'flood': {
        const px = w.px, cam = sv.cam, cx = cam.x + px.W / 2, cy = cam.y + px.H / 2, hw = px.W / 2 + 20, hh = px.H / 2 + 20;
        for (const f of sv.foes) {
          if (f.dead || Math.abs(f.x - cx) > hw || Math.abs(f.y - cy) > hh) continue;
          const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1;
          W.hitFoe(w, f, st.dmg, dx / d * 300, dy / d * 300, st.source);
        }
        W.addFx(sv, 'evo-flood', h.x, h.y, { slot: st.visual.attack, scale: st.visualScale, life: 1, evo: true });
        window.GFJuice?.sound?.play?.('special', { vol: .45, semitones: -7 });
        return true;
      }
    }
    return false;
  }

  // 거북선: 주인공 둘레를 돌며 닿은 적을 치고(같은 적 0.5초에 한 번), cd마다 포탄을 쏜다.
  function orbit(w, st, run, dt) {
    const sv = w.sv, h = sv.hero, n = st.n, rad = st.area;
    const previousAng = run.ang;
    run.ang += st.speed / Math.max(1, rad) * dt;
    run.hitAt ||= new Map(); if (run.hitAt.size > 400) run.hitAt.clear();
    run.cd -= dt;
    const shootNow = run.cd <= 0; if (shootNow) run.cd = st.cd;
    for (let i = 0; i < n; i++) {
      const a = run.ang + i * Math.PI * 2 / n, x = h.x + Math.cos(a) * rad, y = h.y + Math.sin(a) * rad;
      const pa = previousAng + i * Math.PI * 2 / n;
      sv.orbs.push({ x, y, evoX: (h.px ?? h.x) + Math.cos(pa) * rad, evoY: (h.py ?? h.y) + Math.sin(pa) * rad, slot: st.visual?.attack || slotOf(st.shot), flip: -Math.sin(a) < 0, scale: st.visualScale || 1 });
      for (const f of W.near(sv, x, y, 16, bufA)) {
        const last = run.hitAt.get(f); if (last != null && sv.t - last < .5) continue;
        run.hitAt.set(f, sv.t); W.hitFoe(w, f, st.dmg, Math.cos(a) * 60, Math.sin(a) * 60, st.source);
      }
      if (shootNow) { const f = W.nearest(sv, x, y, 220); if (f) shoot(w, st, x, y, Math.atan2(f.y - y, f.x - x), { shot: 'ball', speed: 220, area: 20, boom: true, life: 1.2, pierce: 0, kb: 60, dmg: st.dmg * .8 }); }
    }
  }

  function moveShots(w, dt) {
    const sv = w.sv, h = sv.hero, shots = sv.shots, count = shots.length, slow = S.evolution.presenting(w); let n = 0;
    for (let i = 0; i < count; i++) {
      const s = shots[i];
      if (slow) { s.evoX = s.x; s.evoY = s.y; s.evoZ = s.z || 0; }
      s.t += dt; if (s.spin) s.ang += s.spin * dt;
      if (s.evo2) {
        if (moveEvoShot(w, s, dt)) shots[n++] = s;
        else { s.home = null; s.cluster = null; s.hit.clear(); if (sv.shotPool.length < SHOT_MAX) sv.shotPool.push(s); }
        continue;
      }
      if (s.lob) {
        const k = Math.min(1, s.t / s.life);
        const tx=s.x0+(s.x1-s.x0)*k,ty=s.y0+(s.y1-s.y0)*k;
        if(W.blockShot(w,s,tx,ty,s.wallR??SHOT_R[bare(s.slot)]??5)) { explode(w,s.x,s.y,s.area,s.dmg,s.kb,s.ally?'boom':'dust',s.source,s.ally); if (s.fire) S.allies.fire(w, s, s.x, s.y); if (s.split) S.allies.split(w, s, s.x, s.y); continue; }
        s.x=tx;s.y=ty;s.z=144*k*(1-k);
        if (k >= 1) { explode(w, s.x1, s.y1, s.area, s.dmg, s.kb, s.ally?'boom':'dust', s.source, s.ally); if (s.fire) S.allies.fire(w, s, s.x1, s.y1); if (s.split) S.allies.split(w, s, s.x1, s.y1); continue; }
        shots[n++] = s; continue;
      }
      if (s.back && !s.turned && s.t >= s.life * .5) { s.turned = true; s.hit.clear(); }
      if (s.turned) {
        const dx = h.x - s.x, dy = h.y - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy);
        if (d < 10 || s.t > s.life * 2) continue;
        s.vx = dx / d * sp; s.vy = dy / d * sp;
      }
      if (s.drag) { const k = Math.exp(-s.drag * dt); s.vx *= k; s.vy *= k; }
      const tx=s.x+s.vx*dt,ty=s.y+s.vy*dt;
      if(!s.throughWall&&W.blockShot(w,s,tx,ty,s.r)) {
        if(s.boom||s.fuse)explode(w,s.x,s.y,s.area,s.dmg,s.kb,'boom',s.source,s.ally);
        continue;
      }
      s.x=tx;s.y=ty;
      if (s.t >= s.life && !s.back) { if (s.fuse) explode(w, s.x, s.y, s.area, s.dmg, s.kb, 'boom', s.source, s.ally); continue; }
      if (!s.fuse) {
        let gone = false;
        for (const f of W.near(sv, s.x, s.y, s.r, bufA)) {
          if (s.hit.has(f)) continue;
          s.hit.add(f);
          if (s.boom) { explode(w, s.x, s.y, s.area, s.dmg, s.kb, 'boom', s.source, s.ally); gone = true; break; }
          const sp = Math.hypot(s.vx, s.vy) || 1;
          // 양헌수(동료 화살 s.range): 쏜 자리에서 from~to 거리만큼 세지며 to에서 1+max배.
          const rg = s.range, dmg = rg ? s.dmg * (1 + rg.max * Math.min(1, Math.max(0, (Math.hypot(f.x - rg.x, f.y - rg.y) - rg.from) / (rg.to - rg.from)))) : s.dmg;
          strike(w, f, dmg, s.vx / sp * s.kb, s.vy / sp * s.kb, s.source, s.ally);
          if (s.bounce) {
            let target = null, best = s.bounce.r ** 2;
            if (s.bounce.left > 0) for (const other of W.near(sv, f.x, f.y, s.bounce.r, bufB)) {
              if (s.hit.has(other)) continue;
              const d = (other.x - f.x) ** 2 + (other.y - f.y) ** 2;
              if (d <= best) { target = other; best = d; }
            }
            if (!target) gone = true;
            else {
              s.bounce.left--; s.dmg *= s.bounce.dmg; s.x = f.x; s.y = f.y; s.t = 0;
              s.ang = Math.atan2(target.y - f.y, target.x - f.x); s.vx = Math.cos(s.ang) * sp; s.vy = Math.sin(s.ang) * sp;
              S.allies.stat(sv, s.ally).bounces++;
            }
            break;
          }
          if (--s.pierce < 0) { gone = true; break; }
        }
        if (gone) continue;
      }
      shots[n++] = s;
    }
    // 이번 장면에서 갈라진 작은 항아리는 다음 장면부터 움직인다.
    for (let i = count; i < shots.length; i++) shots[n++] = shots[i];
    shots.length = n;
  }
  function stepTraps(w, dt) {
    const sv = w.sv; let n = 0;
    for (const t of sv.traps) {
      t.t += dt;
      if (t.t >= t.life) continue;
      if (t.mine) {
        if (W.near(sv, t.x, t.y, 4, bufA).length) { explode(w, t.x, t.y, t.area, t.dmg, 90, 'boom', t.source); continue; }
      } else if ((t.tick -= dt) <= 0) {
        t.tick = .5;
        for (const f of W.near(sv, t.x, t.y, t.area, bufA)) W.hitFoe(w, f, t.dmg, 0, 0, t.source);
      }
      sv.traps[n++] = t;
    }
    sv.traps.length = n;
  }

  function update(w, dt) {
    const sv = w.sv, haste = S.allies ? S.allies.haste(w) : 1;
    sv.orbs.length = 0;
    for (const own of sv.kit.weapons) {
      let run = sv.wrun.get(own.id);
      if (!run) sv.wrun.set(own.id, run = { cd: .25, burst: 0, burstT: 0, k: 0, ang: 0, lastAng: faceOf(sv.hero), targets: [], st: null, hitAt: null });
      const st = stats(w, own);
      if (st.kind === 'orbit') { orbit(w, st, run, dt); S.evolution.attack(w, st); continue; }
      if (run.burst > 0 && (run.burstT -= dt) <= 0) { one(w, run.st, run, run.k++); run.burst--; run.burstT += GAP[st.kind] ?? .07; }
      // 북소리(rally) 동안은 공격 대기가 빨리 줄어든다. 없으면 haste는 1.
      if ((run.cd -= dt * haste) > 0) continue;
      let ok;
      if (BURST.has(st.kind)) {
        run.st = st; run.k = 0; ok = one(w, st, run, run.k++);
        if (ok) { run.burst = st.n - 1; run.burstT = GAP[st.kind] ?? .07; }
      } else ok = all(w, st);
      if (ok) {
        S.evolution.attack(w, st);
        if (st.source === 'hwacha' || st.source === 'munjong') W.addFx(sv, 'img', sv.hero.x - sv.hero.faceX * 24, sv.hero.y + 12, { slot: st.visual.icon, life: .28, scale: st.visualScale * 1.3, lift: 10, evo: true });
      }
      run.cd = ok ? st.cd : .1;
    }
    moveShots(w, dt);
    stepTraps(w, dt);
  }

  // 진화: 무기 자리는 그대로, 수치표를 진화 것으로 바꾼다. 금은 지운다.
  function evolve(w, evo) {
    const sv = w.sv, own = sv.kit.weapons.find(x => x.id === evo.weapon && !x.evo);
    if (!own) return false;
    own.evo = evo.id; own.cracks = 0; sv.wrun.delete(own.id); sv.seen.evolutions.add(evo.id);
    S.evolution.start(w, evo);
    return true;
  }

  // 동료는 allies.js가 맡는다. 옛 이름(S.weapons.allies)은 시험·대본이 그대로 쓸 수 있게 남긴다.
  const allies = (w, dt) => S.allies.update(w, dt);

  S.weapons = { stats, update, allies, evolve, explode, shoot, swingSound, SHOT_R };
})();
