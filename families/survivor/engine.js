(function () {
  'use strict';
  // 버티기 엔진: 껍데기(GFShell)와 rules·world·weapons·scene·picker·meta를 잇는다.
  // 카드·상자·두루마리 창이 열리면 w.hold로 판 전체를 멈추고, 맞힘·틀림에 따라 힘을 준다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const doc = typeof document !== 'undefined' ? document : null;
  const STICK_R = 40;
  const held = new Set();
  const stick = (S.stick ||= { on: false, id: null, w: null, x0: 0, y0: 0, x: 0, y: 0, ox: 0, oy: 0 });
  let lastDown = null;
  // 혼자 하면 화살표와 WASD 둘 다, 둘이 하면 왼쪽은 WASD·오른쪽은 화살표
  const KEYS = {
    solo: { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] },
    left: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] },
    right: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'] }
  };
  const MOVE = new Set(Object.values(KEYS.solo).flat());
  const has = list => list.some(k => held.has(k)) ? 1 : 0;
  const keysOf = w => KEYS[w.duo ? (w.side === 'right' ? 'right' : 'left') : 'solo'];
  const tun = w => w.family.tuning;
  // 시험 고리는 내 컴퓨터(localhost)와 화면 없는 시험(vm)에서만 연다
  const dev = () => { const host = window.location?.hostname; return !window.location || host === 'localhost' || host === '127.0.0.1'; };
  const bounds = w => ({ x: 8, y: w.view.top + 8, w: Math.max(1, w.view.w - 16), h: Math.max(1, w.view.h - w.view.top - 16) });
  const moment = (w, name, o) => w.juice?.moment?.(name, o);
  const above = (w, dy) => W.toCss(w, w.sv.hero.x, w.sv.hero.y - dy);

  // 껍데기는 keyup과 pointermove를 주지 않으므로 누르고 있는 키와 손가락 조이스틱은 여기서 직접 본다.
  if (doc) {
    const drop = () => { held.clear(); stick.on = false; stick.id = null; };
    window.addEventListener('keydown', e => { if (MOVE.has(e.code) && !S.picker?.open?.()) held.add(e.code); }, true);
    window.addEventListener('keyup', e => held.delete(e.code), true);
    window.addEventListener('blur', drop);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) drop(); });
    window.addEventListener('pointerdown', e => { lastDown = { x: e.clientX, y: e.clientY, id: e.pointerId }; }, true);
    window.addEventListener('pointermove', e => {
      if (!stick.on || e.pointerId !== stick.id) return;
      let x = e.clientX - stick.ox, y = e.clientY - stick.oy;
      const dx = x - stick.x0, dy = y - stick.y0, d = Math.hypot(dx, dy);
      if (d > STICK_R) { x = stick.x0 + dx / d * STICK_R; y = stick.y0 + dy / d * STICK_R; }
      stick.x = x; stick.y = y;
    }, true);
    const up = e => { if (e.pointerId === stick.id) { stick.on = false; stick.id = null; } };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  function setup(w) {
    w.sv = W.create();
    w.question = null; w.hold = false;
    held.clear(); stick.on = false; stick.id = null; stick.w = null;
    S.picker?.close?.();
  }
  // 모드는 setup 뒤에 붙으므로 판 준비는 첫 step이나 첫 그리기 때 한다.
  function ensure(w) {
    if (!w.sv) setup(w);
    if (!w.sv.begun) begin(w);
    if (!w.px) S.scene.layout(w);
    return w.sv;
  }
  function begin(w) {
    const sv = w.sv, c = w.content, T = tun(w), ms = w.modeSession;
    sv.play = 'stage';
    const i = Math.max(0, (ms?.state.stage?.id || 1) - 1);
    sv.battle = R.battleFor(c, { stageIndex: i });
    sv.tier = i + 1; sv.era = i; sv.bossAt = T.boss.stageAt;
    sv.duration = ms?.state.stage?.timeSec ?? 180;
    if (!sv.battle) sv.battle = c.battles[0];
    if (w.practice) sv.bossAt = Infinity;
    sv.ground = sv.battle.ground || 'field';
    sv.nextElite = T.spawn.eliteEvery; sv.nextChest = T.spawn.chestEvery; sv.nextRing = T.spawn.ringEvery ?? Infinity;
    S.meta.applyStart(w, sv);
    const hd = sv.heroDef;
    sv.rival = !!sv.battle.rival && sv.battle.rival === hd.person;
    sv.kit.weapons.push({ id: hd.weapon, level: Math.min(T.level.weaponMax, 1 + Math.floor(i / 3) + Number(sv.rival)), cracks: 0 });
    sv.seen.weapons.add(hd.weapon);
    w.reask = w.learning && !w.practice && !w.duo
      ? window.GFLearn?.reask?.create({ rng: w.rng, minS: T.reask.minS, maxS: T.reask.maxS }) || null : null;
    recompute(w);
    sv.hero.hp = sv.hero.hpMax;
    sv.scrollAt = 2; sv.pi = 0; sv.opened = 0; sv.botN = 0; sv.openAt = 0; sv.intro = true;
    held.clear(); stick.on = false;
    sv.begun = true;
    if (w.px) W.camera(w);
  }
  // 무기·유물·상점·기세가 바뀔 때마다 능력치를 다시 센다. 체력 상한이 늘면 늘어난 만큼 채운다.
  function recompute(w) {
    const sv = w.sv, h = sv.hero;
    sv.stats = R.statsOf(w.content, tun(w), { kit: sv.kit, hero: sv.heroDef, shop: sv.shop, fever: sv.fever });
    const max = Math.max(1, Math.round(sv.stats.hpMax));
    if (max > h.hpMax) h.hp += max - h.hpMax;
    h.hpMax = max; h.hp = Math.min(h.hp, max);
  }

  function step(w, dt) {
    const sv = ensure(w), T = tun(w), h = sv.hero, ms = w.modeSession;
    if (w.over || sv.choice) return;
    sv.t += dt;
    if (sv.intro) { sv.intro = false; const b = bounds(w); moment(w, 'special', { x: b.x + b.w / 2, y: b.y + b.h * .3, label: sv.battle.name }); }
    W.grid(sv);
    const d = direction(w);
    h.moving = d.x !== 0 || d.y !== 0;
    if (h.moving) {
      const n = Math.hypot(d.x, d.y), v = T.hero.speed * sv.stats.move;
      h.dx = d.x / n; h.dy = d.y / n;
      if (Math.abs(d.x) > .01) h.faceX = d.x > 0 ? 1 : -1;
      h.x += d.x * v * dt; h.y += d.y * v * dt; h.anim += dt;
    } else h.anim = 0;
    W.camera(w);
    W.spawnStep(w, dt);
    W.moveFoes(w, dt);
    S.weapons.update(w, dt);
    S.weapons.allies(w, dt);
    W.pickups(w, dt, it => found(w, it));
    if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
    if (h.hurt > 0) h.hurt = Math.max(0, h.hurt - dt);
    if (sv.stats.regen > 0 && h.hp > 0) h.hp = Math.min(h.hpMax, h.hp + sv.stats.regen * dt);
    if (h.hp <= 0) fall(w);
    scrolls(w);
    const fever = !!w.fever?.active;
    if (fever !== sv.fever) { sv.fever = fever; recompute(w); }
    w.score = R.scoreOf({ sec: sv.t, right: w.stats.right, chests: sv.opened, bosses: sv.bosses }, T.score);
    if (ms) w.lives = ms.state.hearts;
    if (!w.practice && !w.over) {
      if (ms) ms.setProgress(sv.t);
      else if (sv.t >= sv.duration - 1e-9) w.over = true;
    }
    if (ms?.state.ended) return;
    W.stepFx(sv, dt);
    levelCheck(w);
    if (!w.over && !sv.choice && sv.queue.length && sv.t >= sv.openAt) openNext(w);
  }
  // 갈 방향: 시험 고리 → 봇 → 손가락 조이스틱 → 키. 길이는 1을 넘지 않는다.
  function direction(w) {
    const sv = w.sv;
    let x = 0, y = 0;
    if (sv.testDir) ({ x, y } = sv.testDir);
    else if (w.botKind) ({ x, y } = botDir(w));
    else if (stick.on && (!stick.w || stick.w === w)) {
      const sx = stick.x - stick.x0, sy = stick.y - stick.y0, d = Math.hypot(sx, sy);
      if (d > 6) { const k = Math.min(1, d / 24) / d; x = sx * k; y = sy * k; }
    } else {
      const K = keysOf(w);
      x = has(K.right) - has(K.left); y = has(K.down) - has(K.up);
    }
    const n = Math.hypot(x, y);
    if (!(n > 1e-6)) return { x: 0, y: 0 };
    return n > 1 ? { x: x / n, y: y / n } : { x, y };
  }
  // 쓰러지면 하트를 잃고 둘레 적을 걷어 낸 뒤 다시 선다.
  function fall(w) {
    const sv = w.sv, h = sv.hero, F = tun(w).fall, ms = w.modeSession;
    sv.falls++;
    if (!w.practice) {
      if (ms) {
        ms.addHeart(-1);
        w.lives = ms.state.hearts;
      } else if (w.lives != null) {
        w.lives = Math.max(0, w.lives - 1);
        if (w.lives === 0) w.over = true;
      }
    }
    h.hp = h.hpMax; h.invuln = F.invuln; h.hurt = 0;
    for (const f of sv.foes) if (!f.dead && !f.boss && Math.hypot(f.x - h.x, f.y - h.y) < F.clearR) { f.dead = true; sv.alive--; }
    const p = above(w, 20);
    moment(w, 'fall', { x: p.x, y: p.y, label: R.T.fell });
  }
  function found(w, it) {
    const sv = w.sv;
    if (it.type === 'chest') { sv.chests++; sv.queue.push({ type: 'chest' }); }
    else if (it.type === 'scroll') sv.queue.push({ type: 'scroll', item: it.item });
    else return;
    sv.openAt = Math.min(sv.openAt, sv.t);
  }
  // 바닥에 두루마리는 하나만 둔다. 연습 판은 4초마다 틀렸던 문제를, 보통 판은 다시 물을 때가 된 문제를 놓는다.
  function scrolls(w) {
    const sv = w.sv;
    if (sv.choice || sv.items.some(it => it.type === 'scroll')) return;
    let item = null;
    if (w.practice) {
      const list = w.practice.items || [];
      if (!list.length || sv.t < sv.scrollAt) return;
      item = list[sv.pi++ % list.length]; sv.scrollAt = sv.t + 4;
    } else if (w.reask) item = w.reask.due(sv.t);
    if (!item) return;
    const a = w.rng() * Math.PI * 2, d = 50 + w.rng() * 30;
    W.addItem(sv, 'scroll', sv.hero.x + Math.cos(a) * d, sv.hero.y + Math.sin(a) * d, { item });
  }
  function levelCheck(w) {
    const sv = w.sv, X = tun(w).xp;
    for (let need = R.xpNeed(sv.level, X); need > 0 && sv.xp >= need; need = R.xpNeed(sv.level, X)) {
      sv.xp -= need; sv.level++;
      if (!sv.queue.length && !sv.choice) sv.openAt = sv.t + .3;
      sv.queue.push({ type: 'level', level: sv.level });
      const p = above(w, 24);
      moment(w, 'rise', { x: p.x, y: p.y, label: R.fmt(R.T.levelUp, sv.level) });
    }
  }

  // 고르기 창: level(카드 셋 → 문제 → 결과), chest(문제 → 결과), scroll(다시 묻기 → 결과)
  function openNext(w) {
    const sv = w.sv, c = w.content, T = tun(w);
    while (sv.queue.length && !sv.choice && !w.over) {
      const next = sv.queue.shift();
      let ch = null;
      if (next.type === 'level') {
        const cards = R.offers(c, T, sv.kit, w.rng, { rival: sv.battle?.rival, mustAlly: sv.firstLevel ? sv.battle?.ally : null });
        sv.firstLevel = false;
        if (!cards.length) continue;
        ch = { type: 'level', stage: 'cards', level: next.level, extra: !!next.extra, cards };
      } else if (next.type === 'chest') {
        const evo = R.evolutionFor(c, sv.kit, T.level.weaponMax);
        ch = { type: 'chest', chest: true, evo, bonus: evo ? 0 : 1 + Math.floor(w.rng() * 3), coins: T.coins.chest };
        const q = w.practice ? null : newQ(w, R.chestTopics(evo, sv.battle));
        if (!q) { openChest(w, evo, ch.bonus); continue; }
        setQ(w, ch, q);
      } else if (next.type === 'scroll' && next.item) {
        const q = next.item;
        ch = { type: 'scroll', scroll: true };
        // 상자 문제를 틀렸던 두루마리는 다시 맞히면 그때 상자를 연다
        if (q.chest) { ch.chest = true; ch.evo = R.evolutionFor(c, sv.kit, T.level.weaponMax); ch.bonus = ch.evo ? 0 : 1 + Math.floor(w.rng() * 3); }
        setQ(w, ch, q);
      }
      if (ch) present(w, ch);
    }
  }
  // pickQuestion은 내용 원본을 돌려주므로 복사해서 쓴다(틀린 답·상자 표시를 붙이니까).
  function newQ(w, topics) {
    const sv = w.sv, raw = R.pickQuestion(w.content, tun(w).stageMix[Math.min(sv.tier - 1, 9)], topics, sv.asked, w.rng);
    if (!raw) return null;
    sv.asked.add(raw.id);
    return { ...raw };
  }
  function setQ(w, ch, q) {
    const opts = [q.a, ...(q.wrong || [])];
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(w.rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    ch.q = q; ch.opts = opts; ch.stage = 'question'; ch.sel = -1; ch.ok = null;
  }
  function present(w, ch) {
    w.sv.choice = ch;
    if (w.botKind) { botPlay(w, ch); return; }
    w.hold = true;
    S.picker.show(w, ch, apiOf(w));
  }
  function refresh(w) { if (!w.botKind && w.sv.choice) S.picker.show(w, w.sv.choice, apiOf(w)); }
  const apiOf = w => (w.sv.api ||= { pick: i => pick(w, i), answer: i => answer(w, i), cont: () => cont(w) });
  function pick(w, i) {
    const sv = w.sv, ch = sv.choice;
    if (!ch || ch.stage !== 'cards' || !(i >= 0 && i < ch.cards.length)) return false;
    const card = ch.card = ch.cards[i];
    const topics = w.practice ? [] : R.topicsFor(w.content, card);
    const q = topics.length ? newQ(w, topics) : null;
    // 엽전·떡 카드, 연습 판, 남은 문제가 없을 때는 묻지 않고 바로 준다
    if (!q) { apply(w, card, true, null); finish(w); return true; }
    setQ(w, ch, q); refresh(w);
    return true;
  }
  function answer(w, i) {
    const ch = w.sv.choice;
    if (!ch || ch.stage !== 'question' || !(i >= 0 && i < ch.opts.length)) return false;
    const ok = ch.opts[i] === ch.q.a;
    ch.sel = i; ch.ok = ok; ch.stage = 'result';
    if (!ok) ch.q.selected = ch.opts[i];
    w.record?.('answer', { type: ch.type, ok, q: ch.q.q });
    refresh(w);
    return true;
  }
  function cont(w) {
    const sv = w.sv, ch = sv.choice;
    if (!ch || ch.stage !== 'result') return false;
    sv.choice = null;
    settle(w, ch);
    finish(w);
    return true;
  }
  function finish(w) {
    const sv = w.sv;
    sv.choice = null; w.hold = false;
    S.picker.close();
    recompute(w);
    if (sv.queue.length && !w.over) openNext(w);
  }
  function settle(w, ch) {
    const ok = ch.ok !== false;
    if (ch.type === 'chest' && !ok) ch.q.chest = true;
    if (ch.q) judged(w, ch, ok);
    if (ch.type === 'level') apply(w, ch.card, ok, ch.q);
    else if (ch.type === 'chest' && ok) openChest(w, ch.evo, ch.bonus);
    else if (ch.type === 'scroll' && ok && ch.chest) { ch.q.chest = false; openChest(w, ch.evo, ch.bonus); }
  }
  // 맞힘·틀림 기록: 이어 맞히기, 기세·미션(judge), 다시 묻기, 끝 화면 복습 줄
  function judged(w, ch, ok) {
    const sv = w.sv, q = ch.q, st = w.stats, p = above(w, 30), scroll = ch.type === 'scroll';
    if (ok) {
      const react = window.GFJuice?.react;
      if (react?.right) react.right(w.fx, p.x, p.y, { points: tun(w).score.right, combo: w.combo }); else w.combo?.hit?.();
      st.right++;
      st.maxCombo = Math.max(st.maxCombo || 0, w.combo?.count || 0);
    } else {
      w.combo?.miss?.();
      st.wrong++;
    }
    const row = w.review?.find(r => r.item === q);
    if (ok && (scroll || w.practice) && row) row.overcome = true;
    if (scroll && w.reask) w.reask.result(q, ok ? 'right' : 'wrong', sv.t);
    if (ok && scroll && !w.practice) {
      st.overcome = (st.overcome || 0) + 1;
      moment(w, 'overcome', { x: p.x, y: p.y - 30 });
      const own = sv.crackOf.get(q.id);
      if (own) { own.cracks = Math.max(0, (own.cracks || 0) - 1); sv.crackOf.delete(q.id); }
    }
    if (!ok && !scroll && !w.practice && !w.duo && w.review) {
      if (row) { row.kind = 'wrong'; row.overcome = false; } else w.review.push({ item: q, kind: 'wrong', overcome: false });
    }
    if (!ok && !scroll && w.reask) w.reask.add(q, sv.t, sv.t + (Number.isFinite(w.timeLeft) ? w.timeLeft : 1e9));
    if (ok && (ch.type === 'chest' || scroll && ch.chest)) st.special = (st.special || 0) + 1;
    w.judge?.(ok ? 'right' : 'wrong');
  }
  // 카드 적용: 맞히면 온전한 힘, 틀리면 금(crack)이 하나 가서 반쪽 힘. 그 문제를 다시 맞히면 금이 메워진다.
  function apply(w, card, ok, q) {
    const sv = w.sv, h = sv.hero;
    if (!card) return;
    if (card.kind === 'coins') { const n = card.amount || 0; sv.extraCoins += n; const p = above(w, 30); moment(w, 'coin', { x: p.x, y: p.y, label: R.fmt(R.T.coins, n) }); return; }
    if (card.kind === 'food') { h.hp = h.hpMax; const p = above(w, 30); moment(w, 'coin', { x: p.x, y: p.y, label: R.T.food }); return; }
    const key = { weapon: 'weapons', relic: 'relics', ally: 'allies' }[card.kind];
    if (!key) return;
    const list = sv.kit[key];
    let own = list.find(o => o.id === card.id);
    if (!own) { own = { id: card.id, level: 0, cracks: 0 }; list.push(own); sv.seen[key === 'allies' ? 'people' : key].add(card.id); }
    own.level = Math.max(own.level, card.level);
    if (!ok && q) { own.cracks = (own.cracks || 0) + 1; sv.crackOf.set(q.id, own); }
  }
  // 상자: 진화할 무기가 있으면 진화, 없으면 덤 레벨업(레벨 숫자는 그대로 두고 카드만 다시 연다)
  function openChest(w, evo, bonus) {
    const sv = w.sv, b = bounds(w), x = b.x + b.w / 2, y = b.y + b.h * .4;
    sv.opened++;
    if (evo && S.weapons.evolve(w, evo)) { moment(w, 'specialGet', { x, y, label: evo.name }); return; }
    for (let i = 0; i < Math.max(1, bonus || 0); i++) sv.queue.unshift({ type: 'level', level: sv.level, extra: true });
    moment(w, 'treasure', { x, y, points: tun(w).score.chest });
  }

  // 봇(시험·균형 맞추기용): 가까운 적은 피하고 상자·두루마리, 없으면 구슬로 간다. 창은 그 자리에서 고른다.
  function botDir(w) {
    const sv = w.sv, h = sv.hero;
    let x = 0, y = 0;
    for (const f of sv.foes) {
      if (f.dead) continue;
      const dx = h.x - f.x, dy = h.y - f.y, d = Math.hypot(dx, dy) || 1;
      if (d < 90) { const k = (90 - d) / 90 * 2.5 / d; x += dx * k; y += dy * k; }
    }
    let goal = null, best = Infinity;
    for (const it of sv.items) if (it.type === 'chest' || it.type === 'scroll') { const d = Math.hypot(it.x - h.x, it.y - h.y); if (d < best) { best = d; goal = it; } }
    if (!goal) { best = 200; for (const g of sv.gems) { const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < best) { best = d; goal = g; } } }
    if (goal) { const d = Math.hypot(goal.x - h.x, goal.y - h.y) || 1; x += (goal.x - h.x) / d; y += (goal.y - h.y) / d; }
    x += Math.cos(sv.t * .4) * .35; y += Math.sin(sv.t * .4) * .35;
    const n = Math.hypot(x, y);
    return n > 1e-6 ? { x: x / n, y: y / n } : { x: 0, y: 0 };
  }
  function botPlay(w, ch) {
    const sv = w.sv;
    for (let n = 0; n < 4 && sv.choice === ch; n++) {
      if (ch.stage === 'cards') { const i = ch.cards.findIndex(c => c.kind !== 'coins' && c.kind !== 'food'); pick(w, i < 0 ? 0 : i); }
      else if (ch.stage === 'question') { const right = R.botChoice(w.botKind, ++sv.botN); answer(w, right ? ch.opts.indexOf(ch.q.a) : ch.opts.findIndex(o => o !== ch.q.a)); }
      else cont(w);
    }
  }
  // 캔버스를 누르면 그 자리가 조이스틱 가운데가 된다. 껍데기 좌표(캔버스 기준)와 화면 좌표의 차이를 기억해 둔다.
  function press(w, x, y) {
    const d = lastDown;
    Object.assign(stick, { on: true, w, id: d ? d.id : null, ox: d ? d.x - x : 0, oy: d ? d.y - y : 0, x0: x, y0: y, x, y });
  }

  function look(w) {
    const sv = w.sv;
    if (!sv) return null;
    const ch = sv.choice, own = list => list.map(o => ({ id: o.id, level: o.level, cracks: o.cracks || 0, evo: o.evo || null }));
    return {
      begun: !!sv.begun, t: sv.t, play: sv.play, battle: sv.battle?.id ?? null, tier: sv.tier, era: sv.era, hero: sv.heroDef?.person ?? null, rival: sv.rival,
      level: sv.level, xp: sv.xp, hp: sv.hero.hp, hpMax: sv.hero.hpMax, x: sv.hero.x, y: sv.hero.y,
      kit: { weapons: own(sv.kit.weapons), relics: own(sv.kit.relics), allies: own(sv.kit.allies) },
      choice: ch ? { type: ch.type, stage: ch.stage, cards: ch.cards?.map(c => `${c.kind}:${c.id}`) ?? null, q: ch.q?.q ?? null, a: ch.q?.a ?? null, ok: ch.ok ?? null, evo: ch.evo?.id ?? null, bonus: ch.bonus ?? null } : null,
      queue: sv.queue.map(n => n.type), coins: sv.coinsPicked, extraCoins: sv.extraCoins, chests: sv.chests, opened: sv.opened,
      boss: !!sv.boss, bosses: sv.bosses, kills: sv.kills, alive: sv.alive, foes: sv.foes.length, falls: sv.falls,
      score: w.score, lives: w.lives, right: w.stats.right, wrong: w.stats.wrong, review: w.review?.length ?? 0, reask: w.reask?.size?.() ?? 0,
      hold: !!w.hold, over: !!w.over
    };
  }
  const hooks = {
    card: (w, item) => ({ wrong: item?.selected ?? item?.wrong?.[0] ?? '', right: item?.a ?? '', diff: false, note: item?.note || '', strategy: item?.q || '' }),
    effectBounds: w => bounds(w),
    // 효과 글자가 피해 갈 HUD 칸(경험치 띠, 아이콘 줄, 보스 체력)
    effectLabels: w => {
      const r = S.scene.hudRects?.(w);
      if (!r) return [];
      const o = w.juice?.shakeOffset?.() || { x: 0, y: 0 };
      return [r.xp, r.icons, r.stage, r.boss].filter(Boolean).map(b => ({ x: b.x + o.x - 4, y: b.y + o.y - 4, w: b.w + 8, h: b.h + 8 }));
    },
    // 아래는 시험 고리. 모든 hooks가 window.__GAME에 드러나므로 스스로 막는다.
    sv: w => dev() ? (ensure(w), look(w)) : null,
    levelUp: w => {
      if (!dev()) return null;
      const sv = ensure(w);
      sv.xp = R.xpNeed(sv.level, tun(w).xp); levelCheck(w); sv.openAt = 0;
      if (!sv.choice) openNext(w);
      return look(w);
    },
    chest: w => {
      if (!dev()) return null;
      const sv = ensure(w);
      sv.chests++; sv.queue.unshift({ type: 'chest' });
      if (!sv.choice) openNext(w);
      return look(w);
    },
    boss: w => { if (!dev()) return null; const sv = ensure(w); if (!sv.boss) sv.bossAt = sv.t; return true; },
    pick: (w, i) => dev() ? (pick(w, Number(i)), look(w)) : null,
    answer: (w, i) => dev() ? (answer(w, Number(i)), look(w)) : null,
    cont: w => dev() ? (cont(w), look(w)) : null,
    rightIndex: w => dev() ? (w.sv?.choice?.opts?.indexOf(w.sv.choice.q?.a) ?? -1) : null,
    move: (w, x, y) => {
      if (!dev()) return null;
      ensure(w).testDir = x == null ? null : { x: Number(x) || 0, y: Number(y) || 0 };
      return true;
    },
    crowd: (w, n = 200, god = true) => {
      if (!dev()) return null;
      const sv = ensure(w);
      for (let i = 0; i < n; i++) W.spawnFoe(w, 'normal');
      if (god) sv.hero.invuln = 1e9;
      return sv.alive;
    }
  };

  const cfg = {
    stageOnly: true, createModeSession: S.stages.create,
    stageMap: S.stages.map,
    guide: (parent, family, id, art) => {
      const guide = window.GFUI.guide(parent, family, id, art);
      const label = parent.querySelector('.gf-guide-caption');
      if (label) label.textContent = '누르고 끌어 움직여요 · 공격은 자동이에요';
      return guide;
    },
    family: 'survivor', compactHUD: true, pixelEffects: true, pixelShake: true, cacheEffectText: true, avoidEffectText: true, ownLives: true,
    cacheVignette: true, directSurface: true, lightDecor: { slowMs: 17.2, backMs: 17 }, layeredEffects: false,
    cacheTextMeasure: true, cacheHUDGeometry: true, cacheTextLayout: true,
    combo: { steps: [3, 5, 10] },
    titleExtra: S.meta.titleExtra, resultExtra: S.meta.resultExtra,
    setup, layout: w => S.scene.layout(w), step,
    draw: (w, g) => { ensure(w); S.scene.draw(w, g); },
    drawBehindHUD: (w, g) => { ensure(w); S.scene.drawBehindHUD(w, g); },
    key() {}, press, bot: () => null, hooks
  };
  S.engine = cfg;
  window.GFShell.play(cfg);
})();
