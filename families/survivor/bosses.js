(function () {
  'use strict';
  // 부장·적장. 걷다가 쉬는 틈마다 행동(moves) 하나를 예고하고 쓴다. 체력이 절반 아래면 틈이 짧아진다.
  // charge: 붉은 예고선 뒤 곧게 돌진 · volley: 부채꼴 화살 · summon: 부하 부르기 · quake: 둥근 예고 뒤 둘레 충격
  // 쓰러뜨리면 「물러갑니다」 글과 상자, 그리고 문제 하나(엔진 큐 {type:'boss'}). 적장이면 sv.generalDown.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const TELE = { charge: .8, volley: .8, summon: .8, quake: 1, barrage: .9, gunline: .8, cavalry: 1 };
  const CHARGE = { speed: 230, time: .9 }, QUAKE_R = 70, VOLLEY = { n: 7, spread: .6, speed: 110 };
  const bulgasariDef = { id: 'bulgasari', name: R.T.bulgasari, sprite: 'bulgasari', role: 'bulgasari', story: R.T.bulgasariLore };

  function spawnBulgasari(w) {
    const sv = w.sv;
    if (sv.bulgasari) return sv.bulgasari;
    const p = W.ringPoint(w, Math.atan2(sv.hero.dy, sv.hero.dx) + Math.PI, 80);
    const f = { def: bulgasariDef, sprite: 'bulgasari', kind: 'boss', boss: true, bulgasari: true, role: 'bulgasari',
      x: p.x, y: p.y, hp: 1, hpMax: 1, speed: R.maxHeroSpeed(w.content, w.family.tuning) * w.family.tuning.endless.bulgasariSpeedRatio,
      dmg: 0, r: 32, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: 0, born: sv.t };
    sv.foes.push(f); sv.bossOn.push(f); sv.bulgasari = f; sv.seen.foes.add(f.def.id);
    S.moments.arrival(w, f, { label: R.T.bulgasari + ' 등장!' });
    w.record?.('bulgasari-arrival', { at: sv.t });
    return f;
  }

  function spawn(w, def, at) {
    const sv = w.sv, T = w.family.tuning;
    const st = R.bossStats(def, { play: sv.play, minutes: sv.t / 60, tier: sv.tier, loop: sv.loop, deputyIndex: sv.cell?.deputies.findIndex(b => b.id === def.id), cell: sv.cell?.id }, T), ang = w.rng() * Math.PI * 2;
    const p = at || { x: sv.hero.x + Math.cos(ang) * 135, y: sv.hero.y + Math.sin(ang) * 135 };
    const f = { def, sprite: def.sprite, kind: 'boss', boss: true, role: def.role, x: p.x, y: p.y, hp: st.hp, hpMax: st.hp, speed: st.speed, dmg: st.dmg,
      r: def.role === 'general' ? 28 : 24, wallR: 16, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: 0,
      mode: 'walk', wait: 1.2, mi: 0, aim: 0, mt: 0, born: sv.t, enraged: false, baseDmg: st.dmg,
      moves: [...new Set([...def.moves, 'charge', 'volley', 'summon'])].slice(0, def.role === 'general' ? 3 : 2) };
    W.unwall(w,f,f.wallR); sv.foes.push(f); sv.bossOn.push(f); sv.boss = f; sv.seen.foes.add(def.id);
    if (def.role === 'general') for (const o of sv.foes) if (!o.boss && !o.dead && w.rng() < .6) { o.dead = true; sv.alive--; W.addFx(sv, 'smoke', o.x, o.y - 6, { life: .4 }); }
    W.reserve(w, 10);
    for (let i = 0; i < 10 && sv.alive < W.capOf(w); i++) { const a = i * Math.PI / 5; const o = W.spawnFoe(w, i % 3 ? 'foot' : 'horse', { x: f.x + Math.cos(a) * 42, y: f.y + Math.sin(a) * 42 }); if (o) o.guardOf = f.def.id; }
    S.moments.arrival(w, f);
    return f;
  }

  function begin(w, f, move, dx, dy) {
    f.mode = 'tele'; f.move = move; f.mt = TELE[move]; f.aim = Math.atan2(dy, dx);
    const config = w.family.tuning.boss.moves?.[move], sv = w.sv, h = sv.hero;
    if (config) f.mt = config.tele;
    if (move === 'charge') w.sv.tele.push({ kind: 'line', f, x: f.x, y: f.y, ang: f.aim, len: CHARGE.speed * CHARGE.time, t: 0, life: TELE.charge });
    if (move === 'quake') w.sv.tele.push({ kind: 'circle', f, x: f.x, y: f.y, r: QUAKE_R, t: 0, life: TELE.quake });
    if (move === 'volley') w.sv.tele.push({ kind: 'fan', f, x: f.x, y: f.y - 20, ang: f.aim, r: VOLLEY.speed * 2.5, spread: VOLLEY.spread, t: 0, life: TELE.volley });
    if (move === 'summon') w.sv.tele.push({ kind: 'circle', f, x: f.x, y: f.y, r: 84, t: 0, life: TELE.summon });
    if (move === 'barrage') {
      f.targets = [];
      const offset = w.rng() * Math.PI * 2;
      for (let i = 0; i < config.n; i++) {
        const a = offset + (i + w.rng() * .5) * Math.PI * 2 / config.n, d = config.minDistance + w.rng() * (config.maxDistance - config.minDistance);
        const p = { x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d };
        f.targets.push(p); sv.tele.push({ kind: 'circle', f, ...p, r: config.radius, t: 0, life: f.mt });
      }
    }
    if (move === 'gunline') {
      f.aim = Math.atan2(h.y - 6 - (f.y - 20), h.x - f.x); f.lines = [];
      for (let i = 0; i < config.n; i++) {
        const p = { x: f.x, y: f.y - 20, ang: f.aim + (i - (config.n - 1) / 2) * config.spread };
        f.lines.push(p); sv.tele.push({ kind: 'line', f, ...p, len: config.length, width: 8, t: 0, life: f.mt });
      }
    }
    if (move === 'cavalry') {
      f.aim = Math.atan2(h.y - f.y, h.x - f.x);
      const px = w.px, cam = sv.cam, width = px?.W ?? 360, height = px?.H ?? 360, top = px?.top ?? 0;
      const ux = Math.cos(f.aim), uy = Math.sin(f.aim), edge = (x, y) => Math.min(Math.abs(x) > 1e-6 ? ((x > 0 ? cam.x + width - h.x : h.x - cam.x) + 16) / Math.abs(x) : Infinity, Math.abs(y) > 1e-6 ? ((y > 0 ? cam.y + height - h.y : h.y - cam.y - top) + 16) / Math.abs(y) : Infinity);
      const before = edge(-ux, -uy), after = edge(ux, uy);
      f.lane = { x: h.x - ux * before, y: h.y - uy * before, ang: f.aim, len: before + after };
      sv.tele.push({ kind: 'line', f, ...f.lane, width: config.width, t: 0, life: f.mt });
    }
    w.record?.('boss-warning', { id: f.def.id, move, seconds: f.mt });
  }
  function act(w, f) {
    const sv = w.sv, h = sv.hero, config = w.family.tuning.boss.moves?.[f.move];
    if (f.move === 'charge') { f.mode = 'charge'; f.mt = CHARGE.time; return; }
    if (f.move === 'volley') {
      const volley = f.role === 'general' ? w.family.tuning.boss.cellVolley?.[sv.cell?.id] : null;
      const n = volley?.n ?? VOLLEY.n, damage = volley?.damage ?? .6;
      // 일제 사격은 발보다 20 위에서 나간다. 벽은 그려진 길과 땅 길 둘 다로 잰다(world.foeShoot lift).
      for (let i = 0; i < n; i++) W.foeShoot(w, f.x, f.y - 20, f.aim + (i / (n - 1) - .5) * 2 * VOLLEY.spread, VOLLEY.speed, Math.round(f.dmg * damage), undefined, undefined, 20);
    } else if (f.move === 'summon') {
      // 졸개도 전체 적 수 상한을 지킨다.
      W.reserve(w, w.family.tuning.boss.minions || 10);
      for (let i = 0; i < (w.family.tuning.boss.minions || 10) && sv.alive < W.capOf(w); i++) { const a = w.rng() * Math.PI * 2, d = 44 + w.rng() * 24; W.spawnFoe(w, 'foot', { x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d }); }
    } else if (f.move === 'quake') {
      W.addFx(sv, 'ring', f.x, f.y, { life: .45, r: QUAKE_R, color: '#ff8a5c' });
      if (h.invuln <= 0 && Math.hypot(h.x - f.x, h.y - f.y) < QUAKE_R) W.hurtHero(w, f.dmg);
    } else if (f.move === 'barrage') {
      for (const p of f.targets) {
        W.addFx(sv, 'boom', p.x, p.y, { life: .45, size: 2 });
        W.addFx(sv, 'ring', p.x, p.y, { life: .45, r: config.radius, color: '#ff8a5c' });
        if (h.invuln <= 0 && Math.hypot(h.x - p.x, h.y - p.y) < config.radius) W.hurtHero(w, f.dmg * config.damage);
      }
      f.targets = null;
    } else if (f.move === 'gunline') {
      for (const p of f.lines) W.foeShoot(w, p.x, p.y, p.ang, config.speed, f.dmg * config.damage, config.length / config.speed, w.family.tuning.foeShots.bullet.sprite, 20);
      f.lines = null;
    } else if (f.move === 'cavalry') {
      const p = f.lane, ux = Math.cos(p.ang), uy = Math.sin(p.ang), spacing = 28;
      const speed = (p.len + (config.n - 1) * spacing) / config.duration;
      for (let i = 0; i < config.n && sv.alive < W.capOf(w); i++) {
        const o = W.spawnFoe(w, 'horse', { x: p.x - ux * i * spacing, y: p.y - uy * i * spacing });
        if (o) Object.assign(o, { x: p.x - ux * i * spacing, y: p.y - uy * i * spacing, cavalry: true, rushAim: p.ang, rushSpeed: speed, rushUntil: sv.t + config.duration, rushEndX: p.x + ux * p.len, rushEndY: p.y + uy * p.len });
      }
      f.lane = null;
    }
    rest(w, f);
  }
  function rest(w, f) {
    const cadence = f.role === 'general' ? w.family.tuning.boss.cellCadence?.[w.sv.cell?.id] ?? 1 : 1;
    f.mode = 'walk'; f.wait = cadence * (f.hp < f.hpMax / 2 ? .6 : 1) * (2.6 + w.rng() * 1.2);
  }
  function rageWarning(w, f) {
    const sv = w.sv, h = sv.hero, aim = Math.atan2(h.dy, h.dx);
    f.rageAt = sv.t + .8; f.ragePoints = [];
    for (let i = 0; i < 12; i++) {
      const a = aim + .65 + i / 12 * (Math.PI * 2 - 1.3), p = { x: h.x + Math.cos(a) * 145, y: h.y + Math.sin(a) * 145, ang: a + Math.PI };
      f.ragePoints.push(p); sv.tele.push({ kind: 'circle', f, x: p.x, y: p.y, r: 14, t: 0, life: .8 });
    }
    w.record?.('boss-wave-warning', { id: f.def.id, seconds: .8 });
  }

  // 엔진의 moveFoes가 보스마다 부른다. dx, dy, d는 주인공까지.
  function step(w, f, dt, dx, dy, d) {
    const sv = w.sv;
    if (f.role === 'general') {
      const pressure = w.family.tuning.boss;
      const cell = pressure.cellPressure?.[sv.cell?.id];
      f.dmg = f.baseDmg * Math.min(cell?.max ?? pressure.pressureMax ?? 4, 1 + Math.max(0, sv.t - f.born - (cell?.after ?? pressure.pressureAfter ?? 45)) / (cell?.every ?? pressure.pressureEvery ?? 30));
    }
    if (f.role === 'general' && !f.enraged && f.hp <= f.hpMax / 2) {
      f.enraged = true; f.speed *= 1.3;
      // The wave waits for a full warning; it never appears on top of the hero.
      rageWarning(w, f);
      f.nextRageWave = sv.t + 8;
      W.addFx(sv, 'ring', f.x, f.y, { life: .8, r: 90, color: '#ff443c' });
      w.record?.('boss-enrage', { id: f.def.id });
    }
    if (f.enraged && sv.t >= f.nextRageWave) {
      f.nextRageWave = sv.t + 8; rageWarning(w, f);
      W.addFx(sv, 'ring', f.x, f.y, { life: .8, r: 90, color: '#ff443c' });
      w.record?.('boss-wave-warning', { id: f.def.id, seconds: .8 });
    }
    if (f.rageAt && sv.t >= f.rageAt) {
      f.rageAt = 0;
      W.reserve(w, f.ragePoints.length);
      for (const p of f.ragePoints) { if (sv.alive >= W.capOf(w)) break; const o = W.spawnFoe(w, 'horse', p); if (o) { o.rushUntil = sv.t + 1.8; o.rushAim = p.ang; } }
      f.ragePoints = null;
    }
    f.x += f.kbx * dt; f.y += f.kby * dt; f.kbx *= Math.exp(-10 * dt); f.kby *= Math.exp(-10 * dt);
    for (let i = sv.tele.length - 1; i >= 0; i--) { const t = sv.tele[i]; if (t.f !== f) continue; t.t += dt; if (t.t >= t.life || f.dead) sv.tele.splice(i, 1); }
    if (Math.abs(dx) > 2 && f.mode === 'walk') f.faceX = dx < 0 ? -1 : 1;
    if (f.mode === 'walk') {
      const approach = d > 65 ? Math.max(f.speed, w.family.tuning.hero.speed * 1.25) : f.speed;
      f.x += dx / d * approach * dt; f.y += dy / d * approach * dt;
      f.wait -= dt;
      if (f.wait <= 0 && d < 260) { const moves = f.moves; begin(w, f, moves[f.mi++ % moves.length], dx, dy); }
    } else if (f.mode === 'tele') {
      f.mt -= dt; if (f.mt <= 0) act(w, f);
    } else if (f.mode === 'charge') {
      f.x += Math.cos(f.aim) * CHARGE.speed * dt; f.y += Math.sin(f.aim) * CHARGE.speed * dt;
      f.mt -= dt; if (f.mt <= 0) rest(w, f);
    }
  }

  // 쓰러뜨림: 물러가는 글, 구슬·상자, 문제 하나. 적장이면 판을 끝낼 표시.
  function down(w, f) {
    const sv = w.sv, T = w.family.tuning;
    sv.bosses++; S.feedback.flash(w);
    const shake = S.feedback.config(w).bossShake;
    W.impact(w, shake?.px ?? 7, shake?.seconds ?? .4); S.moments.defeated(w, f);
    w.record?.('boss-down', { id: f.def.id, role: f.role, seconds: sv.t - f.born });
    sv.bossOn = sv.bossOn.filter(b => b !== f); sv.boss = sv.bossOn[sv.bossOn.length - 1] || null;
    sv.tele = sv.tele.filter(t => t.f !== f);
    W.addFx(sv, 'boom', f.x, f.y - 24, { life: .55, size: 3 });
    W.addFx(sv, 'smoke', f.x, f.y - 10, { life: .8, size: 3 });
    for (let i = 0; i < 6; i++) W.dropGem(w, f.x + (w.rng() - .5) * 40, f.y + (w.rng() - .5) * 30, T.xp.gem[2]);
    W.addItem(sv, 'chest', f.x, f.y);
    sv.queue.push({ type: 'boss', def: f.def });
    sv.openAt = Math.min(sv.openAt, sv.t + .8);
    if (f.def.role === 'general') sv.generalDown = true;
    const b = w.effectBounds();
    w.juice?.moment?.('mission', { x: b.x + b.w / 2, y: b.y + b.h / 2, suppressText:true });
  }

  S.bosses = { spawn, spawnBulgasari, bulgasariDef, step, down, TELE, QUAKE_R, CHARGE };
})();
