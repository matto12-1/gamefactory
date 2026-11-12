(function () {
  'use strict';
  // 버티기 동료: 능력 12가지, 5단계 각성, 인물마다 하나씩 더하는 「이 사람만」 효과.
  // 카드에 보이는 단계 값은 family.json tuning.allyValues, 능력별 간격·범위는 allyKit, 인물 효과는 allyOnly(kind).
  // 판을 멈추거나 느리게 하는 연출은 넣지 않는다(연출 시간 예산 밖). 그림은 이미 있는 발사체·효과를 돌려 쓰고
  // 새로 그리는 것(불 장판·보호막 고리·발밑 빛·어지럼 별)은 scene.js가 처음 한 번 그려 두고 복사한다.
  // 동료 피해는 무기 피해 막대(weaponDamage)에 섞지 않고 sv.ally.stats[사람 id]에 센다.
  // 적에게 거는 상태(느려짐 slowUntil·slowMul, 묶임 stunUntil, 꾀임 lureUntil·lureX·lureY)는 world.js moveFoes가 읽는다. 장수(보스)는 받지 않는다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const TAU = Math.PI * 2, GOLDEN = 2.399963;
  const bufA = [], bufB = [], picks = [];
  const FIRE_MAX = 10, DUST_MAX = 24, SLAM_MAX = 40;

  const tuning = w => w.family.tuning;
  const kitOf = (w, does) => tuning(w).allyKit?.[does] || {};
  const onlyOf = (w, id) => tuning(w).allyOnly?.[id] || null;
  // 새 그림이 들어오면 해시가 붙은 칸 이름도 받는다. 없을 때는 기존 효과를 쓴다.
  const onlyFx = (w, kind) => { const name = 'fx-only-' + kind; return Object.keys(w.art?.slots || {}).find(k => k === name || k.startsWith(name + '-')) || null; };
  const defOf = (w, id) => (w.content.allies || []).find(a => a.person === id) || null;
  const awakeAt = w => tuning(w).level.allyMax;

  // 동료 그림(art.json allyFx). 자리 이름에 내용 해시가 붙어 있어 이름표로 찾는다.
  const fx = (w, name) => w.art?.allyFx?.fx?.[name] || null;
  const icon = (w, does) => w.art?.allyFx?.icon?.[does] || null;
  function state(sv) {
    return sv.ally ||= { traps: [], fires: [], dust: [], slams: [], steles: [], burns: [], forge: Object.create(null), dragonUsed: Object.create(null), dustTick: 0,
      helm: Object.create(null), onhit: Object.create(null), clones: [], cloneTick: 0, parades: [], paradeDir: -1,
      guard: { up: false, owner: null, v: 0, awake: false, chill: null, chillTick: 0 }, food: { until: -1, owner: null },
      rally: { until: -1, haste: 1, guard: 1, band: false, owner: null, spark: 0, honor: null },
      xpUntil: -1, xpExtra: 0, xpOwner: null, rerolls: 0, rerollOwner: null, coins: 0, coinTick: 0, feedTick: 0,
      stats: Object.create(null), awake: Object.create(null), share: Object.create(null) };
  }
  // 동료마다 효과 기록(균형 측정·시험이 읽는다).
  function stat(sv, id) {
    return state(sv).stats[id] ||= { damage: 0, hits: 0, kills: 0, shots: 0, traps: 0, fires: 0, shocks: 0, bursts: 0, winds: 0,
      blocks: 0, pushed: 0, stunned: 0, slowed: 0, lured: 0, slams: 0, halts: 0, pulled: 0, coins: 0, items: 0, bonusXp: 0, quizXp: 0,
      foods: 0, eaten: 0, healed: 0, shields: 0, drums: 0, hasteTime: 0, volleys: 0, rerolls: 0, cards: 0,
      returns: 0, feared: 0, shared: 0, layerBlocks: 0, bounces: 0, reaches: 0, splits: 0, hurried: 0,
      honored: 0, decoys: 0, riders: 0, chained: 0, comboTop: 0, burns: 0, spreads: 0, helms: 0, onhits: 0,
      forts: 0, bigDashes: 0, wings: 0, clones: 0, rings: 0, parades: 0, awakeAt: null };
  }
  // 동료 한 번 치기. 남은 체력을 넘는 피해는 세지 않는다.
  function strike(w, id, f, dmg, kx = 0, ky = 0) {
    if (!f || f.dead) return false;
    const sv = w.sv, s = stat(sv, id), before = Math.max(0, f.hp), only = onlyOf(w, id);
    W.hitFoe(w, f, dmg, kx, ky, null, id, f.boss && only?.kind === 'strings');
    s.damage += before - Math.max(0, f.hp); s.hits++;
    if (f.dead) s.kills++;
    // 이성계: 화살이 장수를 맞히면 잠깐 장수가 모든 공격에 더 세게 맞는다(정해진 틈마다 한 번, 배수는 world.js hitFoe).
    if (f.boss && !f.dead && only?.kind === 'helm') {
      const A = state(sv);
      if (sv.t - (A.helm[id] ?? -Infinity) >= (only.cd || 10)) {
        A.helm[id] = sv.t; f.helmUntil = sv.t + (only.time || 3); f.helmMul = only.mul || 1.3; s.helms++;
        const slot = onlyFx(w, 'helm');
        if (slot) W.addFx(sv, 'img', f.x, f.y, { slot, life: .6, lift: f.r * 2 + 10 });
        else W.addFx(sv, 'ring', f.x, f.y, { r: f.r * 1.6, life: .4, color: '#ffd27a' });
      }
    }
    return true;
  }
  const stun = (sv, f, sec) => { if (f.boss || f.dead) return false; f.stunUntil = Math.max(f.stunUntil || 0, sv.t + sec); return true; };
  function slow(sv, f, sec, mul) {
    if (f.boss || f.dead) return false;
    f.slowMul = f.slowUntil > sv.t ? Math.min(f.slowMul, mul) : mul;
    f.slowUntil = Math.max(f.slowUntil || 0, sv.t + sec);
    return true;
  }
  const inView = (w, o, pad = 0) => { const px = w.px, cam = w.sv.cam; return !px || o.x >= cam.x - pad && o.x <= cam.x + px.W + pad && o.y >= cam.y + px.top - pad && o.y <= cam.y + px.H + pad; };
  const sound = (w, slot, o) => S.feedback?.sound?.(w, slot, o);

  // 2026-10-18 대표 결정: 싸움 주인공은 같은 키, 동료는 조금 작게. 그리기·옆자리·검수실이 같은 비율을 쓴다.
  // 예전 잉크 바닥 가운데를 기준점으로 보존하므로 키가 달라져도 발은 움직이지 않는다.
  function personDisplay(w, slot, ally = false) {
    const spec = w.art?.ui?.battle?.sprites?.[slot] || w.art?.slots?.[slot];
    if (!spec) return null;
    // 옛 그림을 다시 그린 사람은 display.ink가 옛 잉크다. 신라부터의 새 36×48 사람은 옛 그림이 없어 자기 잉크를 표시 비율로 줄여 쓴다.
    const ink = spec.ink || [0, 0, spec.w, spec.h], d = spec.display, old = d?.ink || (d ? ink.map(n => n * (d.scale ?? 1)) : ink);
    const height = w.family?.tuning?.hero?.inkHeight;
    const scale = height ? height * (ally ? w.family.tuning.allies.inkRatio : 1) / ink[3] : d?.scale ?? 1;
    return { spec, ink, scale, baseScale: d?.scale ?? 1, center: old[0] + old[2] / 2, canvasWidth: d?.canvas?.[0] || spec.w, bottom: -30 + old[1] + old[3] };
  }
  // personPicture의 발 기준 잉크 범위. 두 그림·좌우 보기를 함께 잡아 돌아서도 옆자리가 흔들리지 않는다.
  function personInk(w, person, ally = false) {
    let radius = 0, top = 0, bottom = 0;
    for (const phase of ['a', 'b']) {
      const picture = personDisplay(w, `person-${person}-${phase}`, ally);
      if (!picture) continue;
      const { ink, scale: k, canvasWidth: width, center } = picture;
      radius = Math.max(radius, ink[2] * k / 2 + Math.abs(center - 12), ink[2] * k / 2 + Math.abs(width - center - 12));
      top = Math.min(top, picture.bottom - ink[3] * k);
      bottom = Math.max(bottom, picture.bottom);
    }
    // 그릴 때 자리를 화소에 반올림하는 최대 반 칸도 비워 실제 잉크 사이 2화소를 지킨다.
    return { radius: Math.ceil(radius + .5), top, bottom };
  }
  function standing(w, i, side) {
    const sv = w.sv, h = sv.hero;
    let edge = personInk(w, h.person).radius;
    for (let j = 0; j <= i; j++) {
      const person = byId(w.content.people, sv.kit.allies[j].id)?.person ?? 0, ink = personInk(w, person, true);
      const distance = edge + 2 + ink.radius;
      if (j === i) return { x: h.x + side * distance, y: h.y + 2 };
      edge = distance + ink.radius;
    }
  }

  // 동료 몸. 시험이 일부 칸만 가진 몸을 넣어도 움직인다.
  function body(w, i, own) {
    const sv = w.sv, h = sv.hero; let b = sv.allyBodies[i];
    if (!b || b.id !== own.id) {
      b = sv.allyBodies[i] = { id: own.id, person: byId(w.content.people, own.id)?.person ?? 0, x: h.x - h.faceX * 16 * (i + 1), y: h.y + 2,
      faceX: h.faceX, anim: 0, moving: false, dash: 0, vx: 0, vy: 0, hit: null, t: 1.5 + i * .7, act: 0, ang: i * Math.PI, twin: null, awake: false };
      if (!h.moving) Object.assign(b, standing(w, i, -h.faceX));
    }
    return b;
  }
  // 서 있을 옆자리가 벽 속이면 반대쪽에 선다. 둘 다 벽 속이면 벽 밖으로 민 자리에(벽 속에서 쏜 화살·항아리는 바로 막혀 사라졌다).
  function clearSide(w, i, side) {
    const free = q => { const o = { x: q.x, y: q.y }; W.unwall(w, o, 2); return o.x === q.x && o.y === q.y ? q : null; };
    const a = standing(w, i, side), b = standing(w, i, -side);
    if (free(a)) return a;
    if (free(b)) return b;
    W.unwall(w, a, 2); return a;
  }
  function follow(w, b, i, dt) {
    const sv = w.sv, h = sv.hero, tr = sv.trail, gap = 16 * (i + 1);
    let p = tr[Math.max(0, tr.length - 1 - (i + 1) * 6)] || h;
    // 주인공이 서 있으면 발자국이 주인공 자리로 모여 동료가 주인공 위에 겹쳐 장면마다 깜빡였다(10-18 화면).
    // 그럴 땐 동료가 지금 있는 쪽 옆자리에 선다(주인공이 돌아설 때마다 반대편으로 뛰지 않게).
    // 서 있는 옆자리는 실제 잉크 폭과 표시 배율로 두 몸 사이 2화소를 비운다. 걷는 발자국 간격은 그대로다.
    if (!h.moving) p = clearSide(w, i, Math.sign(b.x - h.x) || -h.faceX);
    else if (Math.hypot(p.x - h.x, p.y - h.y) < gap) p = { x: h.x + (Math.sign(b.x - h.x) || -h.faceX) * gap, y: h.y + 2 };
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
    b.moving = d > 1.5;
    if (!b.moving) { if (!h.moving) { b.x = p.x; b.y = p.y; } return; }
    const step = Math.min(d, Math.max(tuning(w).hero.speed * 1.25, d * 6) * dt);
    b.x += dx / d * step; b.y += dy / d * step; b.anim += dt;
    if (Math.abs(dx) > .5) b.faceX = dx < 0 ? -1 : 1;
  }

  // ── 능력별 행동. c = { w, sv, h, b, own, def, does, v, awake, only, K } ──
  const ACT = {
    shoot(c) {
      const { w, sv, b, v, awake, only, K } = c, bow = byId(w.content.weapons, 'bow'), base = bow.levels[0];
      const f = W.nearest(sv, b.x, b.y, base.speed * base.dur);
      if (!f) { b.t = .2; return; }
      const ang = Math.atan2(f.y - b.y, f.x - b.x), n = awake ? K.awakenN || 3 : 1, spread = K.spread || .26;
      b.faceX = f.x < b.x ? -1 : 1; b.act = .2;
      // 주인공 활과 같은 그림·빠르기·벽 충돌. 주몽은 한 적을 꿰뚫는다.
      const st = { kind: 'nearest', shot: bow.shot, speed: base.speed, dur: base.dur, dmg: v * sv.stats.might, pierce: only?.kind === 'pierce' ? only.pierce ?? 1 : 0 };
      // 양헌수: 쏜 자리를 적어 두면 맞는 순간 거리만큼 세진다(weapons.js).
      for (let k = 0; k < n; k++) {
        const s = S.weapons.shoot(w, st, b.x, b.y, ang + (n > 1 ? (k - (n - 1) / 2) * spread : 0));
        if (s) { s.ally = b.id; if (only?.kind === 'bounce') s.bounce = { ...only, left: only.n }; if (only?.kind === 'range') s.range = { x: b.x, y: b.y, from: only.from ?? 80, to: only.to ?? 280, max: only.max ?? .6 }; }
      }
      stat(sv, b.id).shots += n;
      b.t = K.cd || 1.2;
    },
    slash(c) {
      const { w, sv, h, b, v, awake, only, K } = c;
      const reach = only?.kind === 'reach' ? 1 + Math.min(only.max, only.per * Math.max(0, sv.act - 1)) : 1;
      const r = (awake ? K.awakenR || 54 : K.r || 40) * reach;
      const f = W.nearest(sv, b.x, b.y, r);
      if (!f) { b.t = .2; return; }
      const aim = Math.atan2(f.y - b.y, f.x - b.x), ax = Math.cos(aim), ay = Math.sin(aim);
      b.faceX = ax < 0 ? -1 : 1; b.act = .2;
      let dmg = v * sv.stats.might;
      // 계백: 주인공 체력이 낮을수록 세게(체력 20% 이하에서 상한).
      if (only?.kind === 'desperate') dmg *= 1 + (only.max ?? .8) * Math.min(1, Math.max(0, (1 - h.hp / h.hpMax) / .8));
      // 양규: 정해진 틈(3초) 안에 이어 벨 때마다 조금씩 세진다(일곱 번까지). 틈을 넘기면 처음부터.
      if (only?.kind === 'combo') {
        b.combo = sv.t - (b.comboAt ?? -Infinity) <= (only.gap || 3) ? Math.min(only.max || 7, (b.combo || 0) + 1) : 1; b.comboAt = sv.t;
        dmg *= 1 + (only.per ?? .08) * (b.combo - 1);
        const s = stat(sv, b.id); s.comboTop = Math.max(s.comboTop, b.combo);
      }
      // 최영: 주인공이 실제로 맞은 뒤 잠깐 더 세게 벤다(hurt가 시각을 적는다).
      if (only?.kind === 'onhit' && (state(sv).onhit[b.id] ?? -1) > sv.t) dmg *= only.mul || 1.4;
      for (const g of W.near(sv, b.x, b.y, r, bufA)) {
        const dx = g.x - b.x, dy = g.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (!awake && dx * ax + dy * ay < -g.r) continue;
        strike(w, b.id, g, dmg, dx / d * 80, dy / d * 80);
      }
      if (only?.kind === 'reach') stat(sv, b.id).reaches++;
      if (awake) for (let k = 0; k < 2; k++) W.addFx(sv, 'img', b.x, b.y, { slot: 'shot-swing', life: .26, ang: aim + k * Math.PI, turn: Math.PI, scale: 1.3 * reach, lift: 8 });
      else W.addFx(sv, 'img', b.x + ax * 14, b.y + ay * 10, { slot: 'shot-swing', life: .2, ang: aim, scale: reach, lift: 8 });
      // 김유신: 칼바람이 앞으로 날아간다(벽에 막힌다).
      if (only?.kind === 'wind') {
        const s = S.weapons.shoot(w, { kind: 'nearest', shot: 'shot-swing', speed: only.speed || 200, dur: only.life || .8, dmg: dmg * (only.dmg ?? .6), pierce: 99 }, b.x, b.y, aim, { r: 10, kb: 60 });
        if (s) { s.ally = b.id; stat(sv, b.id).winds++; }
      }
      S.weapons.swingSound(w, b.x, b.y);
      b.t = K.cd || 1.2;
    },
    dash(c) {
      // 곽재우: 돌진하지 않고 붉은 옷 분신들이 주인공 둘레에 나타나 친다.
      if (c.only?.kind === 'clones') return clones(c);
      const { sv, b, K } = c, look = K.look || 150, list = W.near(sv, b.x, b.y, look, bufA);
      if (!list.length) { b.t = .5; return; }
      // 열두 방향 가운데 길목에 적이 가장 많은 쪽으로.
      let best = null, most = 0;
      for (let k = 0; k < 12; k++) {
        const a = k * TAU / 12, cx = Math.cos(a), cy = Math.sin(a); let n = 0;
        for (const f of list) { const dx = f.x - b.x, dy = f.y - b.y, along = dx * cx + dy * cy; if (along > 0 && along < look && Math.abs(dy * cx - dx * cy) < (K.r || 12) + f.r) n++; }
        if (n > most) { most = n; best = a; }
      }
      if (best == null) { b.t = .5; return; }
      const sp = K.speed || 320;
      b.dash = K.time || .4; b.vx = Math.cos(best) * sp; b.vy = Math.sin(best) * sp; b.hit = new Set(); b.faceX = b.vx < 0 ? -1 : 1; b.dustLeft = 0;
      b.returning = false; b.dashPath = c.only?.kind === 'return' ? [{ x: b.x, y: b.y }] : null;
      // 최윤덕: 네 번째 돌진마다 두 배 힘으로, 넓게 들이받는다(dashMove가 b.big을 읽는다).
      b.big = c.only?.kind === 'fourth' && (b.dashN = (b.dashN || 0) + 1) % (c.only.every || 4) === 0;
      if (b.big) { stat(sv, b.id).bigDashes++; W.addFx(sv, 'ring', b.x, b.y, { r: (K.r || 12) * (c.only.r || 1.5), life: .3, color: '#ffd27a' }); }
      // 유금필: 양옆에서 기병 둘이 나란히 달려 함께 들이받는다. 기마창의 말 탄 창병 살(벽 통과, 꿰뚫기)을 같은 빠르기·시간으로 빌린다.
      if (c.only?.kind === 'riders') {
        const px = -Math.sin(best), py = Math.cos(best), gap = c.only.gap || 22;
        for (let k = 0; k < (c.only.n || 2); k++) {
          const side = (k % 2 ? 1 : -1) * gap * (1 + (k >> 1));
          const s = S.weapons.shoot(c.w, { kind: 'charge', shot: 'shot-rider', speed: sp, dur: K.time || .4, dmg: c.v * sv.stats.might * (c.only.dmg ?? .6), pierce: 99 },
            b.x + px * side, b.y + py * side, best, { upright: true, kb: 80 });
          if (s) { s.ally = b.id; stat(sv, b.id).riders++; }
        }
      }
      b.t = K.cd || 4.5;
      W.addFx(sv, 'smoke', b.x, b.y - 4, { life: .3, size: 1 });
    },
    orbit(c) { c.b.t = 1; },
    push(c) {
      const { w, sv, h, b, v, awake, only, K } = c;
      if (!W.near(sv, h.x, h.y, v, bufA).length) { b.t = .5; return; }
      // 어재연: 둘레에 적이 많을수록 더 세게 민다(한 명마다 per, max까지).
      const ram = only?.kind === 'rampart' ? 1 + Math.min(only.max ?? 1, (only.per ?? .1) * W.near(sv, h.x, h.y, only.r || 90, bufB).length) : 1;
      const s = stat(sv, b.id), kb = (K.kb || 300) * ram, A = state(sv);
      for (const f of bufA) {
        if (f.bulgasari) continue;
        const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        f.kbx += ux * kb; f.kby += uy * kb; s.pushed++;
        if (only?.kind === 'fear' && !f.boss) {
          f.lureUntil = sv.t + only.time; f.lureX = f.x + ux * only.go; f.lureY = f.y + uy * only.go; s.feared++;
        }
        if (awake && stun(sv, f, K.stun || 1)) s.stunned++;
        // 성기: 밀려 가는 길에 벽(고인돌 등)이 있으면 닿는 때에 피해.
        if (only?.kind === 'slam' && !f.boss && A.slams.length < SLAM_MAX) {
          const go = only.look || 34;
          if (W.firstWall(w, f.x, f.y, f.x + ux * go, f.y + uy * go, f.r)) A.slams.push({ f, id: b.id, at: sv.t + .12, dmg: (only.dmg || 30) * sv.stats.might, ux, uy });
        }
      }
      W.addFx(sv, 'ring', h.x, h.y, { r: v, life: .4, color: awake ? '#ffe7a0' : '#e8f4ff', follow: true, ox: 0, oy: 0 });
      // 최치원: 밀어낼 때 격문 두루마리가 잠깐 펼쳐진다. 밀어내기 고리는 그대로 둔다.
      const fear = only?.kind === 'fear' && onlyFx(w, 'fear');
      if (fear) W.addFx(sv, 'img', h.x, h.y, { slot: fear, life: .4, scale: 1, lift: 18, follow: true, ox: 0, oy: 0 });
      if (only?.kind === 'stele') {
        const max = Math.max(1, only.max);
        while (A.steles.length >= max) A.steles.shift();
        A.steles.push({ id: b.id, x: h.x, y: h.y, r: only.r, until: sv.t + only.life, slot: onlyFx(w, 'stele') });
      }
      b.act = .3; b.t = K.cd || 5;
    },
    guard(c) {
      // 보호막이 깨진 뒤 단계 값(초)만큼 기다렸다가 다시 생긴다. 깨는 일은 hurt()가 한다.
      const { sv, b, v, awake, only } = c, g = state(sv).guard;
      if (!g.up) { g.up = true; g.layers = only?.kind === 'layers' ? only.n : 1; W.addFx(sv, 'ring', sv.hero.x, sv.hero.y, { r: 22, life: .3, color: '#bfe6ff', follow: true, ox: 0, oy: 0 }); }
      Object.assign(g, { owner: b.id, v, awake, chill: only?.kind === 'chill' ? only : null });
      b.t = 1e9;
    },
    trap(c) {
      const { w, sv, h, b, v, awake, only, K } = c, A = state(sv), tr = sv.trail, p = tr[Math.max(0, tr.length - 3)] || h;
      if (b.lastTrap && A.traps.includes(b.lastTrap) && Math.hypot(p.x - b.lastTrap.x, p.y - b.lastTrap.y) < (K.gap || 10)) { b.t = .25; return; }
      // 김시민이 빙 둘러 놓은 덫(ring)은 보통 덫 수에 세지 않는다.
      let mine = 0; for (const t of A.traps) if (t.id === b.id && !t.ring) mine++;
      if (mine >= (K.max || 6)) A.traps.splice(A.traps.findIndex(t => t.id === b.id && !t.ring), 1);
      A.traps.push({ id: b.id, x: p.x, y: p.y, t: 0, life: K.life || 10, dmg: v * sv.stats.might, awake, lure: only?.kind === 'lure' ? only : null, tick: 0,
        ripen: only?.kind === 'ripen' ? only : null, ambush: only?.kind === 'ambush' ? only : null });
      b.lastTrap = A.traps[A.traps.length - 1]; stat(sv, b.id).traps++;
      b.t = K.cd || 1.5;
    },
    bomb(c) {
      const { w, sv, b, v, awake, only, K } = c, far = only?.kind === 'far';
      const range = far ? (w.px ? Math.hypot(w.px.W, w.px.H - w.px.top) / 2 : 360) : K.range || 170, area = K.area || 34;
      const n = clusters(w, b.x, b.y, range, awake ? 2 : 1, area, far);
      if (!n) { b.t = .5; return; }
      // 권율: 주인공이 멈춰 선 시간만큼(after초마다 per씩, max까지) 폭발이 넓어진다. 멈춘 시간은 update가 b.still에 센다.
      const hold = only?.kind === 'hold' ? 1 + Math.min(only.max ?? .6, (only.per ?? .2) * Math.floor((b.still || 0) / (only.after || 1) + 1e-9)) : 1;
      const K2 = hold > 1 ? { ...K, area: area * hold } : K;
      for (let k = 0; k < n; k++) lob(w, b, picks[k].x, picks[k].y, v * sv.stats.might, K2, only?.kind === 'split' ? only : null);
      b.faceX = picks[0].x < b.x ? -1 : 1; b.act = .3;
      b.t = K.cd || 3;
    },
    rally(c) {
      const { w, sv, h, b, v, awake, only, K } = c, A = state(sv), s = stat(sv, b.id);
      // 김윤후: 함께하는 동료가 많을수록 북소리로 빨라지는 몫이 커진다(한 명마다 15%).
      const unite = only?.kind === 'unite' ? 1 + (only.per ?? .15) * sv.kit.allies.length : 1;
      Object.assign(A.rally, { until: sv.t + (awake ? K.awakenTime || 6 : K.time || 4), haste: 1 + v * unite, guard: awake ? K.guard ?? .6 : 1, band: only?.kind === 'band', owner: b.id, honor: null });
      s.drums++;
      // 왕건: 북소리 동안 단계가 가장 낮은 동료 하나가 각성한 것처럼 싸운다(이미 각성한 동료는 고르지 않는다, 같은 단계면 먼저 온 동료).
      // 왕건 자신과 배움 동료(각성해도 싸우는 게 달라지지 않는다)는 고르지 않는다.
      if (only?.kind === 'honor') {
        let pick = null;
        for (const o of sv.kit.allies) if (o.id !== b.id && defOf(w, o.id)?.does !== 'xp' && o.level < awakeAt(w) && (!pick || o.level < pick.level)) pick = o;
        if (pick) {
          A.rally.honor = pick.id; s.honored++;
          const p = sv.allyBodies.find(x => x?.id === pick.id) || h, slot = onlyFx(w, 'honor');
          if (slot) W.addFx(sv, 'img', p.x, p.y, { slot, life: .6, lift: 30 }); else W.addFx(sv, 'ring', p.x, p.y, { r: 20, life: .5, color: '#ffe7a0' });
        }
      }
      // 장영실: 북이 울리면 모든 무기가 바로 한 번 공격한다.
      if (only?.kind === 'volley') { for (const run of sv.wrun.values()) run.cd = Math.min(run.cd, 0); s.volleys++; }
      // 우륵: 기존 발사체의 수명·충돌·피해 기록을 쓰는 열두 갈래 소리 물결.
      if (only?.kind === 'strings') {
        const slot = onlyFx(w, 'strings');
        for (let k = 0; k < only.n; k++) {
          const shot = S.weapons.shoot(w, { kind: 'nearest', shot: 'shot-wave', speed: 200, dur: .8, dmg: only.dmg * sv.stats.might, pierce: 399 }, h.x, h.y, k * TAU / only.n, { r: 8, kb: only.kb });
          if (shot) { shot.ally = b.id; shot.wave = true; if (slot) shot.slot = slot; s.shots++; }
        }
      }
      const drum = fx(w, 'drum');
      if (drum) W.addFx(sv, 'img', h.x, h.y, { slot: drum, life: .6, scale: 1.4, grow: true, lift: 2, follow: true, ox: 0, oy: 0 });
      else { W.addFx(sv, 'ring', h.x, h.y, { r: 46, life: .45, color: '#ffd27a', follow: true, ox: 0, oy: 0 }); W.addFx(sv, 'ring', h.x, h.y, { r: 70, life: .6, color: '#ffe7a0', follow: true, ox: 0, oy: 0 }); }
      sound(w, 'hit', { vol: .45, semitones: -9 });
      b.act = .4; b.t = K.cd || 10;
    },
    magnet(c) {
      const { w, sv, h, b, v, awake, only, K } = c, A = state(sv), s = stat(sv, b.id), coinsOn = only?.kind === 'coins';
      const every = Math.max(1, Math.round(1 / (only?.share || .2))), gems = sv.gems;
      let n = 0, more = 0;
      for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i]; if (g.pull || g.bounce > 0 || !inView(w, g)) continue;
        // 위만: 다섯 개에 하나꼴로 엽전(판당 상한). 난수 대신 차례로 고른다.
        if (coinsOn && A.coins < (only.max ?? 40) && A.coinTick++ % every === 0) {
          const it = W.addItem(sv, 'coin', g.x, g.y, { bounce: 0, vx: 0, vy: 0, pull: true });
          if (it) { gems[i] = gems[gems.length - 1]; gems.pop(); A.coins++; s.coins++; more++; continue; }
        }
        g.pull = true; if (awake) g.bonus = 1 + (K.bonus ?? .2); n++;
      }
      if (only?.kind === 'haul') for (const it of sv.items) if (!it.pull && ['chest', 'food', 'coin'].includes(it.type) && inView(w, it)) { it.pull = true; s.items++; more++; }
      if (!n && !more) { b.t = 1; return; }
      s.pulled += n;
      if (only?.kind === 'order') for (const other of sv.allyBodies) {
        const does = defOf(w, other.id)?.does;
        if (other.id === b.id || !does || does === 'xp' || does === 'orbit' || other.t >= 1e8 || !(other.t > 0)) continue;
        other.t = Math.max(0, other.t - only.cut); s.hurried++;
      }
      W.addFx(sv, 'ring', h.x, h.y, { r: 150, life: .45, color: '#bfe6ff', follow: true, ox: 0, oy: 0, shrink: true });
      sound(w, 'count', { vol: .3, semitones: 7 });
      b.act = .3; b.t = v;
    },
    feed(c) {
      const { w, sv, h, b, v, awake, only, K } = c, A = state(sv), s = stat(sv, b.id), heal = v * (awake ? K.awakenHeal || 2 : 1);
      const scatter = only?.kind === 'scatter', n = scatter ? only.n || 3 : 1, each = scatter ? heal * (only.heal ?? .6) : heal, [d0, d1] = K.near || [90, 130];
      for (let k = 0; k < n; k++) {
        let x, y;
        // 무령왕: 주인공 바로 곁. 다른 동료는 조금 떨어진 곳(난수 대신 황금각으로 돌아가며).
        if (only?.kind === 'near') { x = h.x + h.faceX * 10; y = h.y + 3; }
        else { const a = A.feedTick++ * GOLDEN, d = scatter ? 60 + (k * 37 % 80) : d0 + (A.feedTick * 17 % Math.max(1, d1 - d0)); x = h.x + Math.cos(a) * d; y = h.y + Math.sin(a) * d; }
        if (W.addItem(sv, 'food', x, y, { heal: each, ally: b.id })) { s.foods++; W.addFx(sv, 'spark', x, y, { life: .3 }); }
      }
      b.act = .3; b.t = K.cd || 14;
    },
    xp(c) { c.b.t = 1e9; }
  };
  const FIRST = { rally: 'first', magnet: 'first', feed: 'first' };

  // 적이 가장 몰린 곳 몇 군데. 가까운 적 스물넷만 견주어 계산을 묶는다. 결과는 picks에.
  function clusters(w, x, y, range, n, area, screen) {
    const sv = w.sv, list = W.near(sv, x, y, range, bufA);
    let m = 0;
    if (!list.length) return 0;
    const stepN = Math.max(1, Math.ceil(list.length / 24)), cand = [];
    for (let i = 0; i < list.length; i += stepN) { const f = list[i]; if (!screen || inView(w, f)) cand.push(f); }
    const score = cand.map(f => W.near(sv, f.x, f.y, area, bufB).length);
    for (let k = 0; k < n; k++) {
      let best = -1;
      for (let i = 0; i < cand.length; i++) {
        if (score[i] < 0 || (best >= 0 && score[i] <= score[best])) continue;
        if (picks.slice(0, m).some(p => Math.hypot(p.x - cand[i].x, p.y - cand[i].y) < area * 1.2)) continue;
        best = i;
      }
      if (best < 0) break;
      (picks[m] ||= {}).x = cand[best].x; picks[m].y = cand[best].y; m++; score[best] = -1;
    }
    return m;
  }
  function lob(w, b, tx, ty, dmg, K, split = null) {
    const sv = w.sv; if (sv.shots.length >= 420) return;
    const life = Math.max(.45, Math.min(1, Math.hypot(tx - b.x, ty - b.y) / 300)) * (K.flight || .6) / .6;
    sv.shots.push({ lob: true, x: b.x, y: b.y, x0: b.x, y0: b.y, x1: tx, y1: ty, z: 0, t: 0, life, source: null, ally: b.id, dmg, area: K.area || 34, kb: 80,
      slot: fx(w, 'jar') || 'shot-ball', scale: 1, wallR: 5, ang: 0, spin: 9, hit: null, split, fire: { r: K.fireR || 30, life: K.fire || 2, tick: K.fireTick || .5, dmg: dmg * (K.fireDmg ?? .3) } });
  }
  // 작은 항아리는 한 번만 갈라지고 불 장판을 만들지 않는다.
  function split(w, s, x, y) {
    const only = s.split; if (!only) return;
    for (let k = 0; k < only.n && w.sv.shots.length < 420; k++) {
      const a = k * TAU / only.n;
      w.sv.shots.push({ ...s, x, y, x0: x, y0: y, x1: x + Math.cos(a) * only.r, y1: y + Math.sin(a) * only.r,
        t: 0, z: 0, life: .3, dmg: s.dmg * only.dmg, area: s.area * .6, scale: s.scale * .6, wallR: s.wallR * .6, split: null, fire: null });
      stat(w.sv, s.ally).splits++;
    }
  }
  // 항아리가 떨어진(또는 벽에 막힌) 자리의 불 장판.
  function fire(w, s, x, y) {
    const A = state(w.sv), only = onlyOf(w, s.ally);
    if (A.fires.length >= FIRE_MAX) A.fires.shift();
    A.fires.push({ id: s.ally, x, y, r: s.fire.r, t: 0, life: s.fire.life, tick: 0, every: s.fire.tick, dmg: s.fire.dmg, seed: A.fires.length,
      ignite: only?.kind === 'ignite' ? { time: only.time || 2, r: only.r || 50, max: only.max || 40, dmg: s.dmg * (only.dmg ?? .15) } : null });
    stat(w.sv, s.ally).fires++;
  }
  // 최무선: 불 장판에 닿은 적에게 불이 옮겨붙어 탄다. 처음 붙은 불은 타다 쓰러질 때 가까운 적 하나에게 한 번 옮는다. 장수는 받지 않는다.
  function burn(w, id, f, o, spread) {
    const sv = w.sv, A = state(sv);
    if (!f || f.boss || f.dead) return false;
    const old = A.burns.find(x => x.f === f);
    if (old) { old.until = Math.max(old.until, sv.t + o.time); old.spread ||= spread; return false; }
    if (A.burns.length >= o.max) return false;
    A.burns.push({ f, id, o, until: sv.t + o.time, tick: .5, spread });
    stat(sv, id).burns++;
    return true;
  }
  function spreadFire(w, b) {
    const sv = w.sv, A = state(sv); let best = null, d2 = b.o.r ** 2;
    for (const g of W.near(sv, b.f.x, b.f.y, b.o.r, bufB)) {
      if (g.boss || g.dead || A.burns.some(x => x.f === g)) continue;
      const d = (g.x - b.f.x) ** 2 + (g.y - b.f.y) ** 2; if (d <= d2) { d2 = d; best = g; }
    }
    if (best && burn(w, b.id, best, b.o, false)) { stat(sv, b.id).spreads++; W.addFx(sv, 'spark', best.x, best.y - 8, { life: .3 }); }
  }
  // 신숭겸: 보호막이 깨지면 그 자리에 주인공 옷을 입은 허수아비가 서서 둘레 적을 잠깐 끌어간다. 장수는 받지 않는다.
  function decoy(w, id) {
    const sv = w.sv, h = sv.hero, only = onlyOf(w, id), s = stat(sv, id), r = only.r || 90, time = only.time || 2;
    let k = 0;
    for (const f of W.near(sv, h.x, h.y, r, bufA)) {
      if (f.boss || f.dead || k >= (only.max || 10)) continue;
      f.lureUntil = sv.t + time; f.lureX = h.x; f.lureY = h.y; s.lured++; k++;
    }
    s.decoys++;
    const slot = onlyFx(w, 'decoy');
    if (slot) W.addFx(sv, 'img', h.x, h.y, { slot, life: time, lift: 4 });
    else { W.addFx(sv, 'ring', h.x, h.y, { r, life: .4, color: '#ffd27a' }); W.addFx(sv, 'smoke', h.x, h.y - 4, { life: .4, size: 1.5 }); }
  }
  // 강감찬: 밟힌 덫 둘레의 같은 주인 덫도 함께 터진다(각성 덫처럼 둘레 피해, 힘은 줄여서). 함께 터진 덫은 사라진다.
  function chain(w, t, traps) {
    const sv = w.sv, boomR = kitOf(w, 'trap').boomR || 40, r2 = (t.ambush.r || 120) ** 2;
    for (const o of traps) {
      if (o === t || o.gone || o.id !== t.id || o.t >= o.life || (o.x - t.x) ** 2 + (o.y - t.y) ** 2 > r2) continue;
      o.gone = true;
      const dmg = o.dmg * (t.ambush.dmg ?? .6);
      for (const g of W.near(sv, o.x, o.y, boomR, bufB)) { const dx = g.x - o.x, dy = g.y - o.y, d = Math.hypot(dx, dy) || 1; strike(w, o.id, g, dmg, dx / d * 90, dy / d * 90); }
      W.addFx(sv, 'boom', o.x, o.y, { life: .3, size: 1.2 }); stat(sv, o.id).chained++;
    }
  }
  // 곽재우 붉은 옷 분신술(10-18 대표 결정): 정해진 틈마다 분신 n개(각성 max개)가 주인공 둘레 near~far 아무 데나 한꺼번에 나타나
  // 그 자리 반지름 r 안을 한 번 치고 life초 뒤 연기처럼 사라진다. 자리는 난수 대신 황금각과 차례 거리로 고르고, 서로 gap보다 가까우면 다음 자리.
  function clones(c) {
    const { w, sv, h, b, v, awake, only } = c, A = state(sv), s = stat(sv, b.id);
    const near = only.near ?? 60, far = only.far ?? 150, r = only.r || 36, life = only.life || .4;
    if (!W.near(sv, h.x, h.y, far + r, bufA).length) { b.t = .5; return; }
    const n = awake ? only.max || 5 : only.n || 3, dmg = v * sv.stats.might * (only.dmg ?? 1), slot = onlyFx(w, 'clones'), placed = [];
    for (let k = 0; placed.length < n && k < n * 8; k++) {
      const i = ++A.cloneTick, a = i * GOLDEN, d = near + i * 37 % (far - near + 1), x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d;
      if (!placed.some(p => Math.hypot(p.x - x, p.y - y) < (only.gap || 40))) placed.push({ x, y });
    }
    for (const p of placed) {
      for (const f of W.near(sv, p.x, p.y, r, bufB)) { const dx = f.x - p.x, dy = f.y - p.y, dd = Math.hypot(dx, dy) || 1; strike(w, b.id, f, dmg, dx / dd * 80, dy / dd * 80); }
      // 그림은 fx-only-clones가 올 때까지 동료 분신 모습(person 그림 y판)으로 그린다(scene.js가 A.clones를 그린다).
      A.clones.push({ id: b.id, person: b.person, x: p.x, y: p.y, until: sv.t + life, faceX: p.x < h.x ? 1 : -1, twin: true, anim: 0, moving: false, act: 0, slot });
      W.addFx(sv, 'ring', p.x, p.y, { r, life: .3, color: '#e0473c' });
      s.clones++;
    }
    sound(w, 'hit', { vol: .35, semitones: 4 });
    b.act = .3; b.t = only.cd || 4;
  }
  // 김시민 진주성 대첩: every초마다 주인공 둘레 r에 덫 n개를 고르게 놓는다(보통 덫과 같은 힘·수명, 보통 덫 수에 세지 않는다).
  function ringTraps(c, dt) {
    const { sv, h, b, v, awake, only, K } = c, A = state(sv);
    if ((b.ringT = (b.ringT ?? only.every ?? 12) - dt) > 1e-9) return;
    b.ringT += only.every || 12;
    const n = only.n || 6, r = only.r || 90;
    for (let k = 0; k < n; k++) {
      const a = k * TAU / n;
      A.traps.push({ id: b.id, x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, t: 0, life: K.life || 10, dmg: v * sv.stats.might, awake, lure: null, tick: 0, ripen: null, ambush: null, ring: true });
    }
    stat(sv, b.id).rings++;
    W.addFx(sv, 'ring', h.x, h.y, { r, life: .4, color: '#ffe7a0' });
  }
  // 김종서 두만강 6진: 보호막이 막을 때마다 막은 쪽(가장 가까운 적 쪽)에 작은 진이 life초 서서 적을 막는다.
  // 막기는 진흥왕 비석(steles)과 같고, 그 사람 진은 max개까지(오래된 것부터 사라짐).
  function fort(w, id, only) {
    const sv = w.sv, h = sv.hero, A = state(sv), f = W.nearest(sv, h.x, h.y, 120);
    const a = f ? Math.atan2(f.y - h.y, f.x - h.x) : h.faceX < 0 ? Math.PI : 0, r = only.r || 16, d = r + 14;
    const mine = A.steles.filter(p => p.id === id);
    if (mine.length >= (only.max || 6)) A.steles.splice(A.steles.indexOf(mine[0]), 1);
    A.steles.push({ id, x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, r, until: sv.t + (only.life || 8), slot: onlyFx(w, 'forts'), fort: true });
    stat(sv, id).forts++;
  }
  // 정조 화성 행차: 레벨업 할 때마다 행차 줄(높이 w)이 주인공이 있는 줄을 따라 time초에 화면을 가로지른다(번갈아 왼쪽·오른쪽에서).
  function parade(w, id, only) {
    const sv = w.sv, h = sv.hero, A = state(sv), px = w.px, cam = sv.cam;
    const left = (px ? cam.x : h.x - 240) - 20, right = (px ? cam.x + px.W : h.x + 240) + 20, dir = A.paradeDir = -A.paradeDir;
    A.parades.push({ id, only, y: h.y, x0: dir > 0 ? left : right, x1: dir > 0 ? right : left, dir, t: 0, time: only.time || 1.5, w: only.w || 80, hit: new Set(), puff: 0 });
    stat(sv, id).parades++;
  }

  function dashMove(c, dt) {
    const { w, sv, b, v, awake, only, K } = c;
    const step = Math.min(dt, b.dash); b.dash = Math.max(0, b.dash - dt);
    const ox = b.x, oy = b.y;
    if (b.returning) {
      let left = Math.hypot(b.vx, b.vy) * step;
      while (b.dashPath.length && left > 0) {
        const p = b.dashPath.at(-1), dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        if (d <= left) { b.x = p.x; b.y = p.y; left -= d; b.dashPath.pop(); }
        else { b.x += dx / d * left; b.y += dy / d * left; left = 0; }
      }
      if (!b.dashPath.length) b.dash = 0;
    } else {
      W.moveBody(w, b, b.vx * step, b.vy * step, 6);
      if (b.dashPath) {
        // 같은 방향 구간은 끝점만 갱신해 작은 시간 간격에도 기록이 쌓이지 않는다.
        const path = b.dashPath, p = path.at(-1), q = path.at(-2);
        if (q && Math.abs((p.x - q.x) * (b.y - p.y) - (p.y - q.y) * (b.x - p.x)) < 1e-6 || path.length >= 128) path[path.length - 1] = { x: b.x, y: b.y };
        else path.push({ x: b.x, y: b.y });
      }
    }
    b.moving = true; b.anim += dt * 2;
    const big = b.big ? only : null;
    for (const f of W.near(sv, b.x, b.y, (K.r || 12) * (big ? big.r || 1.5 : 1), bufA)) if (!b.hit.has(f)) {
      b.hit.add(f); strike(w, b.id, f, v * sv.stats.might * (b.returning ? only.dmg : 1) * (big ? big.mul || 2 : 1), b.vx * .3, b.vy * .3);
    }
    // 광개토 대왕: 지나간 길에 흙먼지가 잠깐 남아 적을 느리게 한다.
    if (only?.kind === 'dust') {
      const A = state(sv); b.dustLeft = (b.dustLeft || 0) - Math.hypot(b.x - ox, b.y - oy);
      if (b.dustLeft <= 0) {
        b.dustLeft = 16;
        if (A.dust.length >= DUST_MAX) A.dust.shift();
        A.dust.push({ id: b.id, x: b.x, y: b.y, t: 0, life: only.life || 2, r: only.r || 14, slow: only.slow ?? .5 });
        if (!sv.lightFx) { const s = fx(w, 'dust'); if (s) W.addFx(sv, 'img', b.x, b.y, { slot: s, life: only.life || 2, lift: 4, flip: b.vx < 0 }); else W.addFx(sv, 'dust', b.x, b.y, { life: only.life || 2, size: 1 }); }
      }
    }
    if (b.dash > 0) return;
    if (only?.kind === 'return' && !b.returning) {
      b.returning = true; b.dash = K.time || .4; b.vx = -b.vx; b.vy = -b.vy; b.faceX = b.vx < 0 ? -1 : 1;
      b.hit = new Set(); b.dashPath.pop(); stat(sv, b.id).returns++; return;
    }
    W.addFx(sv, 'smoke', b.x, b.y - 6, { life: .3, size: 1 });
    // 각성: 돌진 끝자리 충격파.
    if (awake) {
      const r = K.shockR || 44;
      for (const f of W.near(sv, b.x, b.y, r, bufA)) { const dx = f.x - b.x, dy = f.y - b.y, d = Math.hypot(dx, dy) || 1; strike(w, b.id, f, v * sv.stats.might, dx / d * 120, dy / d * 120); }
      W.addFx(sv, 'ring', b.x, b.y, { r, life: .35, color: '#ffe7a0' }); W.addFx(sv, 'boom', b.x, b.y, { life: .3, size: 1.5 });
      stat(sv, b.id).shocks++;
    }
  }
  function orbitMove(c, dt) {
    const { w, sv, h, b, v, awake, only, K } = c, hitR = K.hitR || 12, again = K.again || .5;
    // 이순신: 정해진 틈(every초)마다 time초 동안 학의 날개처럼 r배까지 펼쳤다 오므리며 그동안 dmg배로 친다.
    let wing = 1, wingDmg = 1;
    if (only?.kind === 'crane') {
      if ((b.craneT = (b.craneT ?? only.every ?? 6) - dt) <= 1e-9) { b.craneT += only.every || 6; b.wingAt = sv.t; b.wingUntil = sv.t + (only.time || 1.2); stat(sv, b.id).wings++; }
      if (b.wingUntil > sv.t) { wing = 1 + ((only.r || 1.8) - 1) * Math.sin(Math.PI * (sv.t - b.wingAt) / (only.time || 1.2)); wingDmg = only.dmg || 1.3; }
    }
    // 각성하면 둘이 조금 더 넓게, 조금 더 빨리 돈다.
    const r = (awake ? K.awakenR || K.r || 34 : K.r || 34) * wing;
    b.ang = (b.ang || 0) + (awake ? K.awakenSpin || K.spin || 3.2 : K.spin || 3.2) * dt;
    // 장수왕: 잡은 적 수만큼 조금씩 세진다(상한).
    const grow = only?.kind === 'grow' ? 1 + Math.min(only.max ?? .5, stat(sv, b.id).kills * (only.per ?? .005)) : 1, dmg = v * sv.stats.might * grow * wingDmg;
    b.grow = grow;
    // 몸과 분신은 따로 센다(같은 적을 둘이 번갈아 칠 수 있다). 기록은 400개에서 비운다.
    const place = (o, a, scale = 1, kb = 1, chill = null) => {
      const ox = o.x; o.x = h.x + Math.cos(a) * r; o.y = h.y + Math.sin(a) * r * .8;
      o.moving = true; o.anim = (o.anim || 0) + dt; o.faceX = o.x < ox ? -1 : 1;
      const seen = o.hitAt ||= new Map(); if (seen.size > 400) seen.clear();
      for (const f of W.near(sv, o.x, o.y, hitR, bufA)) {
        const last = seen.get(f); if (last != null && sv.t - last < again) continue;
        seen.set(f, sv.t); strike(w, b.id, f, dmg * scale, Math.cos(a) * 60 * kb, Math.sin(a) * 60 * kb);
        if (chill && slow(sv, f, chill.time || 1, chill.slow ?? .5)) stat(sv, b.id).slowed++;
      }
    };
    place(b, b.ang);
    // 이진아시왕: 각성 분신과 별개로 절반 힘으로 도는 동료. 몸·분신·형제(m개)가 고르게 벌어져 겹치지 않는다.
    // 윤관: 별무반의 기병(세게 밀기)과 스님(1초 느리게)이 함께 돈다(힘 0.5배). 그림은 fx-only-squad-*가 올 때까지 분신 모습.
    const kind = only?.kind, squad = kind === 'squad', extras = b.onlyTwins ||= [], n = kind === 'twin' ? only.n : squad ? 2 : 0, m = n + (awake ? 2 : 1);
    if (awake) { b.twin ||= { id: b.id, person: b.person, x: b.x, y: b.y, faceX: 1, anim: 0, moving: true, act: 0, twin: true, awake: true }; b.twin.person = b.person; place(b.twin, b.ang + (n ? TAU / m : Math.PI)); }
    else b.twin = null;
    extras.length = n;
    for (let k = 0; k < n; k++) {
      const o = extras[k] ||= { id: b.id, person: b.person, x: b.x, y: b.y, faceX: 1, anim: 0, moving: true, act: 0, twin: true };
      o.person = b.person; o.look = squad ? (k ? 'monk' : 'rider') : null;
      place(o, b.ang + (k + m - n) * TAU / m, only.dmg, squad && !k ? only.kb || 2 : 1, squad && k ? only : null);
    }
  }

  // 동료와 상관없이 판에 남은 것들: 덫·불 장판·흙먼지·벽 충돌·북소리·보호막 둘레·서희의 멈춤.
  function shared(w, dt) {
    const sv = w.sv, h = sv.hero, A = state(sv), trapK = kitOf(w, 'trap');
    let live = 0;
    for (const p of A.steles) if (p.until > sv.t) A.steles[live++] = p;
    A.steles.length = live;
    // 덫: 밟으면 묶고 피해. 각성 덫은 터져 둘레 피해. 을지문덕 덫은 둘레 적을 꾀어 모은다.
    let n = 0;
    for (const t of A.traps) {
      t.t += dt;
      if (t.t >= t.life || t.gone) continue;
      const s = stat(sv, t.id);
      if (t.lure && (t.tick -= dt) <= 0) {
        t.tick = .5; let k = 0;
        for (const f of W.near(sv, t.x, t.y, t.lure.r || 90, bufA)) { if (f.boss || k >= (t.lure.max || 8)) continue; if (!(f.lureUntil > sv.t)) s.lured++; f.lureUntil = sv.t + .6; f.lureX = t.x; f.lureY = t.y; k++; }
      }
      const list = W.near(sv, t.x, t.y, trapK.r || 9, bufA);
      if (list.length) {
        // 궁예: 덫이 오래 놓여 있을수록 세진다(10초면 두 배).
        const f = list[0], dmg = t.ripen ? t.dmg * (1 + Math.min(t.ripen.max ?? 1, (t.ripen.per ?? .1) * t.t)) : t.dmg;
        if (t.awake) {
          const r = trapK.boomR || 40;
          for (const g of W.near(sv, t.x, t.y, r, bufB)) { const dx = g.x - t.x, dy = g.y - t.y, d = Math.hypot(dx, dy) || 1; strike(w, t.id, g, dmg, dx / d * 90, dy / d * 90); }
          { const s2 = fx(w, 'trap-burst'); if (s2) W.addFx(sv, 'img', t.x, t.y, { slot: s2, life: .32, scale: 1.3, grow: true, lift: 6 }); else W.addFx(sv, 'boom', t.x, t.y, { life: .3, size: 1.2 }); } s.bursts++;
        } else { strike(w, t.id, f, dmg, 0, 0); W.addFx(sv, 'spark', t.x, t.y, { life: .2 }); }
        if (stun(sv, f, trapK.stun || 1.2)) s.stunned++;
        if (t.ambush) chain(w, t, A.traps);
        continue;
      }
      A.traps[n++] = t;
    }
    A.traps.length = n; n = 0;
    // 함께 터진 덫(강감찬)은 이미 남긴 자리에서도 뺀다.
    for (const t of A.traps) if (!t.gone) A.traps[n++] = t;
    A.traps.length = n; n = 0;
    // 불 장판: 정해진 틈마다 안의 적에게 작은 피해. 최무선의 불은 닿은 적에게 옮겨붙는다.
    for (const p of A.fires) {
      p.t += dt; if (p.t >= p.life) continue;
      if ((p.tick -= dt) <= 0) { p.tick = p.every; for (const f of W.near(sv, p.x, p.y, p.r, bufA)) { strike(w, p.id, f, p.dmg, 0, 0); if (p.ignite) burn(w, p.id, f, p.ignite, true); } }
      A.fires[n++] = p;
    }
    A.fires.length = n; n = 0;
    // 옮겨붙은 불: 0.5초마다 작은 피해. 처음 붙은 불에 타던 적이 쓰러지면 가까운 적 하나에게 옮는다.
    for (const b of A.burns) {
      if (b.f.dead) { if (b.spread) spreadFire(w, b); continue; }
      if (b.until <= sv.t) continue;
      if ((b.tick -= dt) <= 0) {
        b.tick = .5; strike(w, b.id, b.f, b.o.dmg, 0, 0);
        if (!sv.lightFx) { const slot = onlyFx(w, 'ignite'); if (slot) W.addFx(sv, 'img', b.f.x, b.f.y, { slot, life: .3, lift: b.f.r + 6 }); else W.addFx(sv, 'spark', b.f.x, b.f.y - 8, { life: .25 }); }
        if (b.f.dead) { if (b.spread) spreadFire(w, b); continue; }
      }
      A.burns[n++] = b;
    }
    A.burns.length = n; n = 0;
    // 흙먼지: 0.2초마다 안의 적을 느리게.
    const dustTick = (A.dustTick -= dt) <= 0; if (dustTick) A.dustTick = .2;
    for (const p of A.dust) {
      p.t += dt; if (p.t >= p.life) continue;
      if (dustTick) for (const f of W.near(sv, p.x, p.y, p.r, bufA)) if (slow(sv, f, .4, p.slow)) stat(sv, p.id).slowed++;
      A.dust[n++] = p;
    }
    A.dust.length = n; n = 0;
    // 벽에 부딪힌 적(성기).
    for (const m of A.slams) {
      if (m.at > sv.t) { A.slams[n++] = m; continue; }
      if (m.f.dead) continue;
      strike(w, m.id, m.f, m.dmg, 0, 0); stat(sv, m.id).slams++;
      W.addFx(sv, 'dust', m.f.x + m.ux * 8, m.f.y + m.uy * 8, { life: .3, size: 1 }); W.addFx(sv, 'spark', m.f.x, m.f.y - 6, { life: .2 });
    }
    A.slams.length = n; n = 0;
    // 곽재우의 분신: 사라질 때 연기.
    for (const o of A.clones) { if (o.until > sv.t) A.clones[n++] = o; else W.addFx(sv, 'smoke', o.x, o.y - 6, { life: .3, size: 1.2 }); }
    A.clones.length = n; n = 0;
    // 정조의 행차 줄: 앞머리가 지나간 자리의 적을 한 번씩 민다(장수는 피해 없이 조금만 밀린다).
    for (const p of A.parades) {
      const at = k => p.x0 + (p.x1 - p.x0) * Math.min(1, k / p.time), prev = at(p.t); p.t += dt;
      const cur = at(p.t), lo = Math.min(prev, cur) - 16, hi = Math.max(prev, cur) + 16, kb = (kitOf(w, 'push').kb || 300) * (p.only.kb || 2), s = stat(sv, p.id);
      for (const f of W.near(sv, (lo + hi) / 2, p.y, Math.hypot((hi - lo) / 2, p.w / 2), bufA)) {
        if (p.hit.has(f) || f.x + f.r < lo || f.x - f.r > hi || Math.abs(f.y - p.y) > p.w / 2 + f.r) continue;
        p.hit.add(f); s.pushed++;
        if (f.boss) f.kbx += p.dir * kb * .2; else strike(w, p.id, f, f.hpMax * (p.only.dmg ?? .5), p.dir * kb, 0);
      }
      if (!sv.lightFx && (p.puff -= dt) <= 0) {
        p.puff = .08; const slot = onlyFx(w, 'parade');
        if (slot) W.addFx(sv, 'img', cur, p.y, { slot, life: .3, lift: 6, flip: p.dir < 0 }); else W.addFx(sv, 'dust', cur, p.y + 6, { life: .4, size: 1.4 });
      }
      if (p.t < p.time) A.parades[n++] = p;
    }
    A.parades.length = n;
    // 북소리 동안 주인공 둘레에 불똥, 빨라진 시간을 센다.
    if (A.rally.until > sv.t) {
      stat(sv, A.rally.owner).hasteTime += dt;
      if (!sv.lightFx && (A.rally.spark -= dt) <= 0) { A.rally.spark = .3; const a = sv.t * 7; W.addFx(sv, 'spark', h.x + Math.cos(a) * 12, h.y - 6 + Math.sin(a) * 6, { life: .3 }); }
    }
    // 우거왕: 보호막이 있는 동안 가까운 적이 느려진다.
    const g = A.guard;
    if (g.up && g.chill && (g.chillTick -= dt) <= 0) {
      g.chillTick = .2;
      for (const f of W.near(sv, h.x, h.y, g.chill.r || 56, bufA)) if (slow(sv, f, .3, g.chill.slow ?? .55)) stat(sv, g.owner).slowed++;
    }
  }
  // 서희: 정해진 틈마다 화면의 적이 모두 1초 멈춘다(게임은 계속).
  function halt(w, b, only, dt) {
    const sv = w.sv;
    if ((b.halt = (b.halt ?? only.cd ?? 15) - dt) > 0) return;
    b.halt = only.cd ?? 15;
    let n = 0;
    for (const f of sv.foes) if (!f.dead && inView(w, f, 16) && stun(sv, f, only.stun || 1)) n++;
    if (!n) return;
    const s = stat(sv, b.id); s.halts++; s.stunned += n;
    const px = w.px, cam = sv.cam;
    W.addFx(sv, 'ring', cam.x + (px ? px.W / 2 : 180), cam.y + (px ? (px.top + px.H) / 2 : 180), { r: px ? Math.hypot(px.W, px.H - px.top) / 2 : 200, life: .4, color: '#ffffff' });
    sound(w, 'special', { vol: .35, semitones: 5 });
  }

  function update(w, dt) {
    const sv = w.sv, h = sv.hero, list = sv.kit.allies, tr = sv.trail, last = tr[tr.length - 1], A = state(sv);
    if (!last || (h.x - last.x) ** 2 + (h.y - last.y) ** 2 > 9) { tr.push({ x: h.x, y: h.y }); if (tr.length > 120) tr.shift(); }
    shared(w, dt);
    const band = A.rally.band && A.rally.until > sv.t ? A.rally.haste : 1, max = awakeAt(w);
    for (let i = 0; i < list.length; i++) {
      const own = list[i], def = defOf(w, own.id); if (!def || !ACT[def.does]) continue;
      // 왕건의 북소리 동안 고른 동료 하나도 각성한 것처럼 싸운다.
      const b = body(w, i, own), awake = own.level >= max || A.rally.honor === own.id && A.rally.until > sv.t;
      const c = { w, sv, h, b, own, def, does: def.does, v: R.allyValue(def, own.level, own.cracks), awake, only: onlyOf(w, own.id), K: kitOf(w, def.does) };
      b.awake = awake;
      // 성왕의 북소리 동안에는 동료도 빨라진다(성왕 자신 포함).
      const t = dt * band;
      if (def.does === 'orbit') orbitMove(c, t);
      else if (b.dash > 0) dashMove(c, t);
      else follow(w, b, i, dt);
      if (c.only?.kind === 'halt') halt(w, b, c.only, t);
      if (c.only?.kind === 'ring') ringTraps(c, t);
      // 권율: 주인공이 멈춰 선 시간(움직이면 처음으로).
      if (c.only?.kind === 'hold') b.still = h.moving ? 0 : (b.still || 0) + dt;
      if (b.act > 0) b.act -= dt;
      if (b.first !== def.does) { b.first = def.does; if (FIRST[def.does] && c.K.first != null) b.t = Math.max(b.t, c.K.first); }
      if ((b.t -= t) > 0) continue;
      ACT[def.does](c);
    }
    sv.allyBodies.length = list.length;
  }

  // ── 엔진·세계가 부르는 고리 ──
  // 맞기 전에: 음식 보호막 → 방패 보호막 차례로 막는다. 북소리 각성 동안은 피해를 줄인다.
  function hurt(w, dmg) {
    const sv = w.sv, A = state(sv);
    const h = sv.hero;
    if (A.food.until > sv.t) {
      A.food.until = -1; if (A.food.owner) stat(sv, A.food.owner).blocks++;
      W.addFx(sv, 'ring', h.x, h.y, { r: 24, life: .3, color: '#9be38f', follow: true, ox: 0, oy: 0 }); sound(w, 'button', { vol: .4 });
      return 0;
    }
    const g = A.guard;
    if (g.up) {
      const s = stat(sv, g.owner), go = onlyOf(w, g.owner); s.blocks++;
      if (go?.kind === 'layers') s.layerBlocks++;
      if (go?.kind === 'forts') fort(w, g.owner, go);
      g.layers = Math.max(0, (g.layers || 1) - 1); g.up = g.layers > 0;
      const b = sv.allyBodies.find(x => x?.id === g.owner); if (b && !g.up) b.t = g.v || 10;
      W.addFx(sv, 'ring', h.x, h.y, { r: 26, life: .3, color: '#bfe6ff', follow: true, ox: 0, oy: 0 }); sound(w, 'button', { vol: .45, semitones: -3 });
      if (!g.up && onlyOf(w, g.owner)?.kind === 'decoy') decoy(w, g.owner);
      // 각성: 깨질 때 둘레에 피해.
      if (g.awake && !g.up) {
        const K = kitOf(w, 'guard'), r = K.burstR || 56, kb = K.kb || 160;
        for (const f of W.near(sv, h.x, h.y, r, bufA)) { const dx = f.x - h.x, dy = f.y - h.y, d = Math.hypot(dx, dy) || 1; strike(w, g.owner, f, (K.burst || 30) * sv.stats.might, dx / d * kb, dy / d * kb); }
        W.addFx(sv, 'ring', h.x, h.y, { r, life: .35, color: '#e8f4ff', follow: true, ox: 0, oy: 0 }); W.addFx(sv, 'boom', h.x, h.y - 4, { life: .3, size: 1.5 });
        s.bursts++;
      }
      return 0;
    }
    dmg = A.rally.until > sv.t ? dmg * A.rally.guard : dmg;
    // 문무왕: 일반 보호막과 피해 감소·방어력을 거친 뒤 쓰러질 공격만 대신 막는다.
    if (h.hp > 0 && Math.max(1, Math.round(dmg - (sv.stats?.armor || 0))) >= h.hp) {
      for (const own of sv.kit.allies) {
        const only = onlyOf(w, own.id);
        if (only?.kind !== 'dragon' || (A.dragonUsed[own.id] || 0) >= only.n) continue;
        A.dragonUsed[own.id] = (A.dragonUsed[own.id] || 0) + 1; stat(sv, own.id).blocks++;
        const slot = onlyFx(w, 'dragon');
        if (slot) W.addFx(sv, 'img', h.x, h.y, { slot, life: .6, lift: 18, follow: true, ox: 0, oy: 0 });
        else W.addFx(sv, 'ring', h.x, h.y, { r: 36, life: .5, color: '#7fdde8', follow: true, ox: 0, oy: 0 });
        sound(w, 'button', { vol: .45 }); return 0;
      }
    }
    // 최영: 보호막·용이 막지 못하고 주인공이 실제로 맞으면 잠깐 세게 벤다.
    for (const own of sv.kit.allies) {
      const only = onlyOf(w, own.id); if (only?.kind !== 'onhit') continue;
      if (!((A.onhit[own.id] ?? -1) > sv.t)) stat(sv, own.id).onhits++;
      A.onhit[own.id] = sv.t + (only.time || 3);
    }
    return dmg;
  }
  const haste = w => { const A = w.sv?.ally; return A && A.rally.until > w.sv.t ? A.rally.haste : 1; };
  const moveScale = haste;
  const xpExtra = w => { const A = w.sv.ally; return A && A.xpUntil > w.sv.t ? A.xpExtra : 0; };
  // 경험치 덤 기록(배움 동료의 두 배 시간, 모아 오기 각성 구슬).
  function gained(w, g, act, extra) {
    const sv = w.sv, A = state(sv), bonus = g.bonus || 1;
    if (extra && A.xpOwner) stat(sv, A.xpOwner).quizXp += g.v * extra * act * bonus;
    if (bonus > 1) { const m = sv.kit.allies.find(o => defOf(w, o.id)?.does === 'magnet'); if (m) stat(sv, m.id).bonusXp += g.v * ((sv.stats?.xp || 1) + extra) * act * (bonus - 1); }
    for (const own of sv.kit.allies) {
      const only = onlyOf(w, own.id); if (only?.kind !== 'forge') continue;
      const f = A.forge[own.id] ||= { gems: 0, stacks: 0 };
      f.gems = Math.min(only.per * only.max, f.gems + 1);
      const stacks = Math.min(only.max, Math.floor(f.gems / only.per));
      sv.stats.might += (stacks - f.stacks) * only.add * (sv.fever ? tuning(w).fever?.dmg || 2 : 1);
      f.stacks = stacks;
    }
  }
  // 음식·카드로 실제로 체력이 늘었을 때만 적 발사체를 지운다. 자동 회복은 장면마다 불려 늘 켜진 방패가 되므로 넣지 않는다.
  function healed(w, before) {
    const sv = w.sv, h = sv.hero;
    if (h.hp <= before || !sv.foeShots.length) return;
    for (const own of sv.kit.allies) {
      const only = onlyOf(w, own.id); if (only?.kind !== 'calm') continue;
      const total = sv.foeShots.length; let n = 0;
      for (const shot of sv.foeShots) if ((shot.x - h.x) ** 2 + (shot.y - h.y) ** 2 > only.r ** 2) sv.foeShots[n++] = shot;
      sv.foeShots.length = n;
      if (n < total) W.addFx(sv, 'ring', h.x, h.y, { r: only.r, life: .35, color: '#a4e4ed' });
    }
  }
  // 음식을 먹은 뒤: 동료 음식 회복 기록, 먹을거리 각성이면 가득 찬 채 먹을 때 보호막(쌓이지 않고 시간만 새로).
  function ate(w, it, before) {
    const sv = w.sv, h = sv.hero, A = state(sv);
    healed(w, before);
    if (it.ally) { const s = stat(sv, it.ally); s.eaten++; s.healed += h.hp - before; }
    const own = sv.kit.allies.find(o => defOf(w, o.id)?.does === 'feed');
    if (!own || own.level < awakeAt(w) || before < h.hpMax - 1e-6) return;
    if (!(A.food.until > sv.t)) stat(sv, own.id).shields++;
    A.food.until = sv.t + (kitOf(w, 'feed').shield || 6); A.food.owner = own.id;
    W.addFx(sv, 'ring', h.x, h.y, { r: 20, life: .35, color: '#9be38f', follow: true, ox: 0, oy: 0 });
  }
  // 문제를 맞혔을 때(단군왕검: 잠깐 경험치 덤 두 배).
  function answered(w) {
    const sv = w.sv;
    for (const own of sv.kit.allies) {
      const only = onlyOf(w, own.id), def = defOf(w, own.id);
      if (only?.kind !== 'quiz' || def?.does !== 'xp') continue;
      const A = state(sv); A.xpUntil = sv.t + (only.time || 10); A.xpExtra = R.allyValue(def, own.level, own.cracks); A.xpOwner = own.id;
    }
  }
  // 레벨업 카드 수: 배움 동료 각성이면 하나 더. 세종 대왕(집현전)은 그 위에 n장 더(레벨업 한 번에 한 번 불린다).
  function cardCount(w) {
    const sv = w.sv, max = awakeAt(w);
    let n = sv.kit.allies.some(o => o.level >= max && defOf(w, o.id)?.does === 'xp') ? kitOf(w, 'xp').awakenCards || 4 : undefined;
    for (const o of sv.kit.allies) {
      const only = onlyOf(w, o.id); if (only?.kind !== 'council') continue;
      n = (n ?? tuning(w).level.cards) + (only.n || 1); stat(sv, o.id).cards++;
    }
    return n;
  }
  const rerolls = w => { const A = w.sv?.ally; return A && w.sv.kit.allies.some(o => o.id === A.rerollOwner) ? A.rerolls : 0; };
  function useReroll(w) {
    const A = w.sv.ally; if (!rerolls(w)) return false;
    A.rerolls--; stat(w.sv, A.rerollOwner).rerolls++;
    return true;
  }
  // 동료 카드를 받은 뒤(엔진 apply). before는 받기 전 단계(새 동료면 0).
  function gain(w, own, before) {
    const sv = w.sv, def = defOf(w, own.id); if (!def) return;
    const A = state(sv), only = onlyOf(w, own.id), max = awakeAt(w);
    if (only?.kind === 'reroll' && A.rerollOwner !== own.id) { A.rerollOwner = own.id; A.rerolls = only.n ?? 3; }
    if (before < max && own.level >= max) awaken(w, own, def);
  }
  // 원효를 받은 뒤의 실제 레벨 상승만 세며, 같은 단계면 영입 차례를 지킨다.
  function leveled(w) {
    const sv = w.sv, A = state(sv), max = awakeAt(w);
    for (const own of sv.kit.allies) { const only = onlyOf(w, own.id); if (only?.kind === 'parade') parade(w, own.id, only); }
    for (const own of sv.kit.allies) {
      const only = onlyOf(w, own.id); if (only?.kind !== 'share') continue;
      const count = A.share[own.id] || 0;
      if (count >= only.every * only.n) continue;
      A.share[own.id] = count + 1;
      if ((count + 1) % only.every) continue;
      let target = null;
      for (const o of sv.kit.allies) if (o.level < max && (!target || o.level < target.level)) target = o;
      if (!target) continue;
      const before = target.level; target.level++; gain(w, target, before); stat(sv, own.id).shared++;
      const b = sv.allyBodies.find(o => o.id === target.id) || sv.hero, slot = onlyFx(w, 'share');
      if (slot) W.addFx(sv, 'img', b.x, b.y, { slot, life: .5, scale: 1 });
      else W.addFx(sv, 'ring', b.x, b.y, { r: 24, life: .5, color: '#ffe7a0' });
      sv.stats = R.statsOf(w.content, tuning(w), { kit: sv.kit, hero: sv.heroDef, shop: sv.shop, fever: sv.fever, cell: sv.cell?.id, forge: A.forge });
    }
  }
  // 각성 순간: 동료 자리에 빛기둥, 기존 specialGet 연출(불꽃·소리)과 「각성!」 띠. 판은 멈추지 않는다.
  function awaken(w, own, def) {
    const sv = w.sv, A = state(sv), b = sv.allyBodies.find(x => x?.id === own.id), p = b || sv.hero;
    A.awake[own.id] = sv.t; stat(sv, own.id).awakeAt = sv.t;
    { const s = fx(w, 'awaken'); if (s) W.addFx(sv, 'img', p.x, p.y, { slot: s, life: .8, scale: 1.4, lift: 60 }); else W.addFx(sv, 'pillar', p.x, p.y, { life: .7 }); }
    const at = W.toCss(w, p.x, p.y - 20), v = w.view, name = byId(w.content.people, own.id)?.name || '';
    w.juice?.moment?.('specialGet', { x: at.x, y: at.y });
    if (v) w.juice?.moment?.('special', { x: v.w / 2, y: (v.top || 0) + (v.h - (v.top || 0)) * .3, label: R.fmt(R.T.awakenBanner, `${name} · ${R.T.allyAwaken[def.does]}`) });
    w.record?.('ally-awaken', { id: own.id, does: def.does });
  }
  // 그리기·시험용: 동료 이름표별 기록 복사.
  const report = sv => JSON.parse(JSON.stringify(sv.ally?.stats || {}));

  // 진흥왕 비석: 이동 구간이 원을 가로질러도 첫 경계에서 멈춘다. 장수는 통과한다.
  function blockFoe(w, f, ox, oy) {
    const list = w.sv.ally?.steles, now = w.sv.t;
    if (f.boss || f.dead || !list?.length) return;
    for (const p of list) {
      if (p.until <= w.sv.t) continue;
      const r = p.r + f.r, x = ox - p.x, y = oy - p.y, dx = f.x - ox, dy = f.y - oy;
      const c = x * x + y * y - r * r, a = dx * dx + dy * dy;
      if (c >= -1e-6 && a > 0) {
        const b = x * dx + y * dy, disc = b * b - a * c;
        if (b >= 0 || disc < 0) continue;
        const t = (-b - Math.sqrt(disc)) / a;
        if (t < -1e-6 || t > 1) continue;
        f.x = ox + dx * Math.max(0, t); f.y = oy + dy * Math.max(0, t);
      } else if ((f.x - p.x) ** 2 + (f.y - p.y) ** 2 < r * r) {
        const dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy);
        f.x = p.x + (d ? dx / d : 1) * r; f.y = p.y + (d ? dy / d : 0) * r;
      }
    }
    // 두 원이 겹치면 한쪽에서 밀어낸 자리가 다른 원 안일 수 있다.
    // 각 원의 경계와 두 경계의 교점 중, 두 원 밖인 가장 가까운 자리를 쓴다.
    if (!list.some(p => p.until > now && (f.x - p.x) ** 2 + (f.y - p.y) ** 2 < (p.r + f.r) ** 2 - 1e-6)) return;
    let best = Infinity, bx = f.x, by = f.y;
    const candidate = (x, y) => {
      for (const p of list) if (p.until > now && (x - p.x) ** 2 + (y - p.y) ** 2 < (p.r + f.r) ** 2 - 1e-6) return;
      const d = (x - f.x) ** 2 + (y - f.y) ** 2;
      if (d < best) { best = d; bx = x; by = y; }
    };
    for (let i = 0; i < list.length; i++) {
      const p = list[i]; if (p.until <= now) continue;
      const r = p.r + f.r, dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy);
      candidate(p.x + (d ? dx / d : 1) * r, p.y + (d ? dy / d : 0) * r);
      for (let j = i + 1; j < list.length; j++) {
        const q = list[j]; if (q.until <= now) continue;
        const sx = q.x - p.x, sy = q.y - p.y, gap = Math.hypot(sx, sy), qr = q.r + f.r;
        if (!gap || gap > r + qr || gap < Math.abs(r - qr)) continue;
        const along = (r * r - qr * qr + gap * gap) / (2 * gap), side = Math.sqrt(Math.max(0, r * r - along * along));
        const x = p.x + sx / gap * along, y = p.y + sy / gap * along;
        candidate(x - sy / gap * side, y + sx / gap * side);
        candidate(x + sy / gap * side, y - sx / gap * side);
      }
    }
    f.x = bx; f.y = by;
  }
  S.allies = { fx, icon, onlyFx, personDisplay, personInk, standing, update, hurt, haste, moveScale, xpExtra, gained, healed, ate, answered, cardCount, rerolls, useReroll, gain, leveled, awaken, strike, fire, split, blockFoe, report, state, stat };
})();
