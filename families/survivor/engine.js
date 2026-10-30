(function () {
  'use strict';
  // 버티기 엔진: 껍데기(GFShell)와 rules·world·weapons·scene·picker·meta를 잇는다.
  // 카드·상자·두루마리 창이 열리면 w.hold로 판 전체를 멈추고, 맞힘·틀림에 따라 힘을 준다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world, E = S.eras;
  const doc = typeof document !== 'undefined' ? document : null;
  const STICK_R = 40;
  const held = new Set();
  const stick = (S.stick ||= { on: false, id: null, w: null, x0: 0, y0: 0, x: 0, y: 0, ox: 0, oy: 0 });
  let lastDown = null;
  const downs = new Set(); // 지금 눌려 있는 손가락·마우스(pointerId)
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
    const drop = () => { held.clear(); downs.clear(); stick.on = false; stick.id = null; };
    window.addEventListener('keydown', e => { if (MOVE.has(e.code) && !S.picker?.open?.()) held.add(e.code); }, true);
    window.addEventListener('keyup', e => held.delete(e.code), true);
    window.addEventListener('blur', drop);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) drop(); });
    window.addEventListener('pointerdown', e => { lastDown = { x: e.clientX, y: e.clientY, id: e.pointerId }; downs.add(e.pointerId); }, true);
    window.addEventListener('pointermove', e => {
      if (!stick.on || e.pointerId !== stick.id) return;
      let x = e.clientX - stick.ox, y = e.clientY - stick.oy;
      const dx = x - stick.x0, dy = y - stick.y0, d = Math.hypot(dx, dy);
      if (d > STICK_R) { x = stick.x0 + dx / d * STICK_R; y = stick.y0 + dy / d * STICK_R; }
      stick.x = x; stick.y = y;
    }, true);
    const up = e => { downs.delete(e.pointerId); if (e.pointerId === stick.id) { stick.on = false; stick.id = null; } };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  function setup(w) {
    w.sv = W.create();
    S.feedback.bind(w);
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
  // 칸 하나의 바닥·적 셋·이름을 세계에 싣는다(무한 모드는 3분마다 다시 부른다).
  function setCell(w, id) {
    const sv = w.sv, c = w.content, pack = E.packOf(c, id);
    if (!pack) return false;
    const foe = kind => c.foes.find(x => x.cell === id && x.kind === kind);
    sv.cell = pack; sv.ground = pack.ground; sv.era = E.cellNo(id); sv.tier = sv.era;
    sv.foeDefs = { foot: foe('foot'), horse: foe('horse') || foe('foot'), archer: foe('archer') || foe('foot') };
    sv.battle = { id, name: pack.battle.name, year: pack.battle.year, era: id };
    return true;
  }
  const bossDef = (w, id) => w.content.bosses.find(b => b.id === id);
  // The opening era needs four basic weapons to fill the four combat slots. 시대 무기 묶음(kit)이 있는 칸은 묶음 그대로.
  function fillGear(w, id) {
    const sv = w.sv, c = w.content;
    if (!E.kitOf(c, id) && sv.allow.weapons.size < tun(w).level.weaponsMax) for (const x of ['bow', 'spear', 'dagger', 'sling']) if (c.weapons.some(y => y.id === x)) sv.allow.weapons.add(x);
  }
  function begin(w) {
    const sv = w.sv, c = w.content, T = tun(w), ms = w.modeSession;
    E.expand(c, T);
    const meta = S.meta.read(c, T), cleared = new Set(meta.cleared.map(E.cellId));
    sv.play = ms?.state.play === 'endless' ? 'endless' : 'stage';
    const want = w.practice ? S.lastCell : ms?.state.stage?.cell;
    sv.order = sv.play === 'endless' ? E.endlessSegments(c, cleared) : [want].filter(id => E.packOf(c, id));
    if (!sv.order.length) sv.order = [(c.packs || [])[0]?.id].filter(Boolean);
    setCell(w, sv.order[0]); S.lastCell = sv.order[0];
    sv.allow = E.allowed(c, { mode: sv.play, cell: sv.order[0], cleared }); sv.cleared = cleared;
    fillGear(w, sv.order[0]);
    sv.bossAt = Infinity; sv.burst = !w.practice;
    sv.nextElite = T.spawn.eliteEvery; sv.nextChest = T.spawn.chestEvery; sv.nextRing = T.spawn.ringEvery ?? Infinity;
    sv.acts = sv.play === 'stage' ? S.acts.start(T, 0) : {};
    sv.known = new Set(meta.seen.people);
    S.meta.applyStart(w, sv, { cleared });
    const hd = sv.heroDef;
    sv.known.add(hd.person);
    sv.rival = false;
    sv.allow.weapons.add(hd.weapon);
    sv.kit.weapons.push({ id: hd.weapon, level: 1, cracks: 0 });
    sv.seen.weapons.add(hd.weapon);
    S.meta.runClear();

    w.reask = w.learning && !w.practice && !w.duo ? reaskCreate(w) : null;
    recompute(w);
    sv.hero.hp = sv.hero.hpMax;
    sv.scrollAt = 2; sv.pi = 0; sv.opened = 0; sv.botN = 0; sv.openAt = 0; sv.intro = true;
    // 화면 판은 읽은 글에서만 문제를 낸다. 새 판에서는 처음부터 다시 알려 준다.
    sv.told = sv.play === 'stage' && storyOn(w) ? new Set(['battle', ...(sv.cell?.story || []).map((_, i) => 'story-' + (i + 1)), ...[...sv.known].map(id => 'person:' + id)]) : null;
    // 시대 이야기 세 장(처음 들어갈 때만). 화면 있는 실제 판에서만 연다(봇·시뮬레이션·시험은 건너뛴다).
    // 끝 장은 이번 주인공 소개(주인공은 동료 카드로 만나지 않으니 여기서 알려 준다)
    const heroP = w.content.people.find(p => p.id === hd.person);
    if (sv.play === 'stage' && storyOn(w) && sv.cell?.story?.length) sv.queue.unshift({ type: 'story', pages: [...sv.cell.story, ...(heroP?.intro ? [{ face: hd.person }] : [])], title: sv.cell.name });
    held.clear(); stick.on = false;
    sv.begun = true;
    if (w.px) W.camera(w);
    // 이야기·셋 세기 동안에도 위쪽 시계가 game.json의 180초가 아니라 1막 길이를 보이게.
    if (ms && sv.play === 'stage') ms.setProgress(0, remaining(w));
  }
  // 무기·유물·상점·기세가 바뀔 때마다 능력치를 다시 센다. 체력 상한이 늘면 늘어난 만큼 채운다.
  function recompute(w) {
    const sv = w.sv, h = sv.hero;
    sv.stats = R.statsOf(w.content, tun(w), { kit: sv.kit, hero: sv.heroDef, shop: sv.shop, fever: sv.fever, cell: sv.cell?.id, forge: sv.ally?.forge });
    const max = Math.max(1, Math.round(sv.stats.hpMax));
    if (max > h.hpMax) h.hp += max - h.hpMax;
    h.hpMax = max; h.hp = Math.min(h.hp, max);
  }

  function step(w, dt) {
    const sv = ensure(w), T = tun(w), h = sv.hero, ms = w.modeSession;
    sv.lightFx = !!(w.decorLight || w.fxScreen?.light);
    if (w.over || sv.choice) return;
    sv.feelClock += dt;
    if (S.moments.victoryStep(w, dt)) return;
    if (S.moments.fallenStep(w, dt)) return;
    dt = S.moments.advance(w, dt);
    dt = S.evolution.combatStep(w, dt);
    dt = S.moments.combat(w, dt);
    if (dt <= 0) return;
    sv.t += dt;
    if (sv.intro) { sv.intro = false; banner(w, sv.battle.name); }
    W.grid(sv);
    if (sv.burst) {
      sv.burst = false;
      const radius = T.spawn.openingRadius?.[sv.cell?.id];
      const closeCount = T.spawn.openingCount?.[sv.cell?.id] ?? 8;
      for (let i = 0; i < 8 && sv.alive < W.capOf(w); i++) {
        const angle = i / 8 * Math.PI * 2;
        W.spawnFoe(w, 'foot', radius == null || i >= closeCount ? W.ringPoint(w, angle, 10) : { x: h.x + Math.cos(angle) * radius, y: h.y + Math.sin(angle) * radius });
      }
    }
    const d = direction(w);
    h.px = h.x; h.py = h.y;
    h.moving = d.x !== 0 || d.y !== 0;
    if (h.moving) {
      const n = Math.hypot(d.x, d.y), v = T.hero.speed * sv.stats.move * S.allies.moveScale(w);
      h.dx = d.x / n; h.dy = d.y / n;
      if (Math.abs(d.x) > .01) h.faceX = d.x > 0 ? 1 : -1;
      W.moveBody(w,h,d.x*v*dt,d.y*v*dt,W.HERO_R); h.anim += dt;
    } else h.anim = 0;
    W.camera(w);
    W.spawnStep(w, dt);
    if (S.evolution.presenting(w)) for (const f of sv.foes) { f.evoX = f.x; f.evoY = f.y; }
    W.moveFoes(w, dt);
    if (ms?.state.ended) return;
    S.weapons.update(w, dt);
    S.allies.update(w, dt);
    W.pickups(w, dt, it => found(w, it));
    if (h.invuln > 0) h.invuln = Math.max(0, h.invuln - dt);
    if (h.hurt > 0) h.hurt = Math.max(0, h.hurt - dt);
    if (sv.stats.regen > 0 && h.hp > 0) h.hp = Math.min(h.hpMax, h.hp + sv.stats.regen * dt);
    // 같은 장면에 맞고 적장도 쓰러뜨렸으면 이긴 판(world.hurtHero와 같은 규칙).
    if (h.hp <= 0) { if (sv.generalDown && sv.play === 'stage') h.hp = 1; else fall(w); }
    if (sv.fallenMoment) return;
    scrolls(w);
    const fever = !!w.fever?.active;
    if (fever !== sv.fever) { sv.fever = fever; recompute(w); }
    w.score = R.scoreOf({ sec: sv.t, right: w.stats.right, chests: sv.opened, bosses: sv.bosses }, T.score);
    if (ms) w.lives = ms.state.hearts;
    if (!w.practice && !w.over && !w.svReview?.clockOff) {
      events(w);
      if (ms) ms.setProgress(sv.t, remaining(w));
      if (sv.generalDown && !sv.choice && !sv.queue.length && sv.play === 'stage' && !sv.endingShown && storyOn(w) && sv.cell.ending) {
        sv.endingShown = true; sv.queue.push({ type: 'story', pages: [sv.cell.ending], title: sv.cell.battle.name, ending: true });
      } else if (sv.generalDown && sv.slowLeft <= 1e-9 && !S.evolution.presenting(w) && !sv.choice && !sv.queue.length) {
        sv.generalDown = false;
        if (sv.play === 'stage') {
          S.moments.success(w, () => { S.meta.runClear?.(); if (ms) ms.state.next = nextCell(w); ms?.end('goal'); });
          return;
        }
      }
    }
    if (ms?.state.ended) return;
    W.stepFx(sv, dt);
    levelCheck(w);
    if (!w.over && !sv.choice && sv.queue.length && sv.t >= sv.openAt) openNext(w);
  }
  // 막 사건(시대 따라가기)과 칸 바꾸기(무한). 사건 목록은 acts.js.
  function events(w) {
    const sv = w.sv, T = tun(w), pack = sv.cell;
    if (sv.play === 'stage') for (const e of S.acts.step(sv.acts, sv.t)) {
      if (e.type === 'act') {
        sv.act = e.act; if (w.modeSession) w.modeSession.state.act = e.act;
        // 2막·3막이 열리면 하트를 하나 채운다(세 개까지). 몰래 차면 목숨이 넷처럼 느껴져 막 글과 하트 칸에 알린다(10-26 대표).
        const had = w.modeSession?.state.hearts; if (e.act > 1) w.modeSession?.addHeart(1);
        const heal = !!w.modeSession && w.modeSession.state.hearts > had; if (heal) sv.heartPop = { i: w.modeSession.state.hearts - 1, t: sv.t };
        for (const f of sv.foes) if (!f.dead && !f.boss) { f.speed *= (T.foe.actSpeed ?? 1.1) ** Math.max(0, e.act - (f.act || 1)); f.act = e.act; }
        // 막 글은 판을 멈추고 한 장으로 읽힌다(화면 있는 판). 문제는 이 글을 본 뒤에만 낸다.
        const line = pack.acts[e.act - 1] || '';
        if (sv.told && line) {
          if (!sv.told.has('act-' + e.act)) sv.queue.push({ type: 'story', from: 'act-' + e.act, pages: [{ text: line, pic: pack.actPics?.[e.act - 1] }], title: R.fmt(R.T.act, e.act), heal, auto: Math.max(3000, [...line].length * 90) + 5000 });
        }
        else banner(w, R.fmt(R.T.act, e.act) + (line ? ' · ' + line : '') + (heal ? ' · ' + R.T.heartBack : ''));
      }
      else if (e.type === 'deputy') S.bosses.spawn(w, bossDef(w, pack.deputies[e.n].id));
      else if (e.type === 'warn') banner(w, R.fmt(R.T.warn, pack.general.name));
      else if (e.type === 'general') S.bosses.spawn(w, bossDef(w, pack.general.id));
    }
    else for (const e of S.acts.endlessStep(sv.acts, sv.t, sv.order.length, T)) {
      if (e.type === 'cell') {
        if (e.loop > sv.loop) { sv.loop = e.loop; sv.loopStart = sv.t; }
        // 막은 15분의 구간 차례(k)로 오른다(1·1·2·2·3). 깬 시대 수로 나누면 시대가 많을수록 1막에 머물러 궁수가 안 나왔다.
        setCell(w, sv.order[e.i]); sv.act = Math.min(3, 1 + Math.floor(e.k * 3 / Math.ceil(T.endless.durationSec / T.endless.segmentSec)));
        // 새 칸의 벽이 가만히 선 주인공 자리에 생기면 밖으로 민다(벽 속에서는 적이 닿지 못한다).
        W.unwall(w, sv.hero, W.HERO_R);
        // 새 무기·유물 카드는 지금 칸 묶음을 따른다. 가진 것은 묶음 밖이어도 계속 강화된다(rules.offers).
        Object.assign(sv.allow, E.gear(w.content, { mode: 'endless', cell: sv.order[e.i], cleared: sv.cleared })); fillGear(w, sv.order[e.i]); sv.allow.weapons.add(sv.heroDef.weapon);
        banner(w, sv.cell.name + ' · ' + sv.cell.battle.name);
      } else if (e.type === 'deputy') S.bosses.spawn(w, bossDef(w, sv.cell.deputies[e.n].id));
      else if (e.type === 'general') S.bosses.spawn(w, bossDef(w, sv.cell.general.id));
      else if (e.type === 'bulgasariWarn') S.moments.arrival(w, { dead: false, def: S.bosses.bulgasariDef }, { label: R.T.bulgasariWarn, duration: T.endless.warningSec });
      else if (e.type === 'bulgasari') S.bosses.spawnBulgasari(w);
    }
  }
  // 껍데기 시계에 보일 남은 초: 다음 막 또는 적장까지. 적장이 나온 뒤는 0.
  function remaining(w) {
    const sv = w.sv; if (sv.play !== 'stage') return Infinity;
    // 지금 막(판 시작 때 아직 남은 「0초 1막」)은 건너뛰고 다음 막까지 센다.
    const next = sv.acts.list.slice(sv.acts.next).find(e => (e.type === 'act' || e.type === 'general') && e.at > sv.t);
    return next ? Math.max(0, next.at - sv.t) : 0;
  }
  function banner(w, label) { const b = bounds(w); moment(w, 'special', { x: b.x + b.w / 2, y: b.y + b.h * .3, label }); }
  // 이 칸을 깬 뒤 바로 갈 다음 칸 번호: 깬 칸에 이 칸을 더한 지도에서 열렸고 꾸러미가 있고 아직 못 깬 첫 칸. 없으면 null.
  function nextCell(w) {
    const c = w.content, cleared = new Set([...S.meta.read(c, tun(w)).cleared.map(E.cellId), w.sv.cell.id]);
    return E.mapState(c, cleared).find(x => x.unlocked && x.ready && !x.cleared)?.no ?? null;
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
  // 마지막 하트면 다시 서지 않고, 판이 멈춘 채 화면이 어두워지는 쓰러짐 장면이 끝날 때 하트를 잃어 판이 끝난다(10-20 대표).
  function fall(w) {
    const sv = w.sv, h = sv.hero, F = tun(w).fall, ms = w.modeSession;
    sv.falls++;
    if (!w.practice) {
      if (ms && Number.isFinite(ms.state.hearts) && ms.state.hearts <= 1) {
        const p = above(w, 20);
        moment(w, 'fall', { x: p.x, y: p.y, label: R.T.fell });
        S.moments.fallen(w, () => { ms.addHeart(-1); w.lives = ms.state.hearts; });
        return;
      }
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
    if (it.type === 'chest') { sv.chests++; sv.queue.unshift({ type: 'chest' }); }
    else if (it.type === 'scroll') sv.queue.unshift({ type: 'scroll', item: it.item });
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
    // 두루마리는 한 번에 하나라 벽 속에 박히면 그 판의 다시 묻기가 다 멈춘다. 벽 밖으로 민다.
    const it = W.addItem(sv, 'scroll', sv.hero.x + Math.cos(a) * d, sv.hero.y + Math.sin(a) * d, { item }); if (it) W.unwall(w, it, 3);
  }
  function levelCheck(w) {
    if (w.svReview?.cardsOff) return;
    const sv = w.sv, X = tun(w).xp;
    if (sv.choice || sv.queue.some(c => c.type === 'level')) return;
    for (let need = R.xpNeed(sv.level, X, sv.cell?.id); need > 0 && sv.xp >= need; need = R.xpNeed(sv.level, X, sv.cell?.id)) {
      sv.xp -= need; sv.level++;
      S.allies.leveled(w);
      // 첫 성장의 빛 전환만 0.3초. 경험치와 레벨은 이 장면에 반영한다.
      sv.openAt = sv.t + (sv.level === 2 ? .3 : 0);
      sv.queue.push({ type: 'level', level: sv.level });
      const p = above(w, 24);
      // 글은 고르기 창 제목이 보여 준다(같은 글이 겹쳐 보이지 않게 빛만). 주인공 자리에 빛기둥.
      moment(w, 'rise', { x: p.x, y: p.y });
      W.addFx(sv, 'pillar', sv.hero.x, sv.hero.y, { life: .55, follow: true });
      break;
    }
  }

  // 고르기 창: level(카드 셋 → 문제 → 결과), chest(문제 → 결과), scroll(다시 묻기 → 결과)
  function openNext(w) {
    if (w.svReview?.cardsOff) { w.sv.queue.length = 0; return; }
    const sv = w.sv, c = w.content, T = tun(w);
    while (sv.queue.length && !sv.choice && !w.over) {
      if (!w.botKind && sv.queue[0].type === 'boss' && sv.slowLeft > 1e-9) return;
      const next = sv.queue.shift();
      let ch = null;
      if (next.type === 'level') {
        const opt = { allow: sv.allow, hero: sv.heroDef.person, boost: sv.cardBoost || 0, cards: S.allies.cardCount(w) }, cards = R.offers(c, T, sv.kit, w.rng, opt);
        sv.cardBoost = 0;
        sv.firstLevel = false;
        if (!cards.length) continue;
        if (cards.every(card => card.kind === 'coins' || card.kind === 'food')) {
          const h = sv.hero, before = h.hp;
          let label;
          if (h.hp < h.hpMax) {
            h.hp = Math.min(h.hpMax, h.hp + h.hpMax * (T.level.foodHeal ?? 1));
            S.allies.healed(w, before); label = R.T.fillerFood;
          } else { sv.extraCoins += T.coins.card; label = R.fmt(R.T.fillerCoins, T.coins.card); }
          sv.fillerNotice = { label, until: sv.t + 2.4 };
          w.record?.('autoFiller', { level: next.level, label });
          levelCheck(w);
          continue;
        }
        ch = { type: 'level', stage: 'cards', level: next.level, extra: !!next.extra, cards, opt, rerolls: S.allies.rerolls(w) };
      } else if (next.type === 'chest') {
        const evo = R.evolutionFor(c, sv.kit, T.level.weaponMax);
        ch = { type: 'chest', chest: true, evo, bonus: evo ? 0 : 1 + Math.floor(w.rng() * 3), coins: T.coins.chest };
        const q = w.practice ? null : newQ(w, evo ? [evo.weapon] : []);
        if (!q) { openChest(w, evo, ch.bonus); continue; }
        setQ(w, ch, q);
      } else if (next.type === 'boss') {
        // 물리친 장수의 이야기를 문제 위에 보여 주고, 그 이야기에서 나온 문제를 먼저 낸다.
        ch = { type: 'boss', boss: next.def };
        sv.told?.add('boss:' + next.def.id);
        const q = w.practice ? null : newQ(w, ['boss:' + next.def.id]);
        if (!q) continue;
        setQ(w, ch, q);
      } else if (next.type === 'story') {
        ch = { type: 'story', stage: 'result', ok: true, pages: next.pages, title: next.title, from: next.from, ending: !!next.ending, heal: !!next.heal, auto: next.auto || 0 };
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
  // 그 판 허락 문제에서 고른다. about(카드에 이름이 보이는 사람·물건)은 이름 묻기를 빼고 그것에 대한 문제를 먼저.
  // 원본을 복사해서 쓴다(틀린 답·상자 표시를 붙이니까).
  function newQ(w, about) {
    const sv = w.sv, set = new Set(about), told = sv.told ? q => !q.from || sv.told.has(q.from) : undefined;
    const raw = R.pickEraQuestion(sv.allow.questions, { asked: sv.asked, hide: set, prefer: set, rnd: w.rng, told, content: w.content, art: w.art });
    if (!raw) return null;
    sv.asked.add(raw.id);
    return { ...raw };
  }
  function setQ(w, ch, q) {
    const view = R.questionView(q, w.rng);
    ch.q = q; ch.opts = view.opts; ch.layout = view.layout; ch.stage = 'question'; ch.sel = -1; ch.ok = null;
    // 단서: 이 문제의 답을 알려 준 글. 고르기 창이 「단서 보기」로 보여 준다(보고 맞히면 점수 없음).
    ch.src = R.sourceText(E.packOf(w.content, q.cell) || w.sv.cell, q.from); ch.hint = false;
  }
  function hint(w) {
    const ch = w.sv.choice;
    if (!ch || ch.stage !== 'question' || !ch.src || ch.hint) return false;
    ch.hint = true; w.record?.('hint', { q: ch.q.q }); refresh(w); return true;
  }
  function present(w, ch) {
    w.sv.choice = ch;
    if (w.botKind) { botPlay(w, ch); return; }
    w.hold = true;
    S.picker.show(w, ch, apiOf(w));
    if (ch.type === 'story' && ch.from) w.sv.told?.add(ch.from);
  }
  function refresh(w) { if (!w.botKind && w.sv.choice) S.picker.show(w, w.sv.choice, apiOf(w)); }
  const apiOf = w => (w.sv.api ||= { pick: i => pick(w, i), answer: i => answer(w, i), cont: () => cont(w), hint: () => hint(w), reroll: () => reroll(w) });
  // 선덕 여왕: 레벨업 카드를 다시 뽑는다(한 판 정해진 번수). 같은 조건(강화 덤·카드 수)으로 새로 고른다.
  function reroll(w) {
    const sv = w.sv, ch = sv.choice;
    if (!ch || ch.type !== 'level' || ch.stage !== 'cards' || !S.allies.useReroll(w)) return false;
    ch.cards = R.offers(w.content, tun(w), sv.kit, w.rng, ch.opt); ch.rerolls = S.allies.rerolls(w);
    w.record?.('reroll', { left: ch.rerolls });
    if (!w.botKind) { S.picker.close(); S.picker.show(w, ch, apiOf(w)); }
    return true;
  }
  function pick(w, i) {
    const sv = w.sv, ch = sv.choice;
    if (!ch || ch.stage !== 'cards' || !(i >= 0 && i < ch.cards.length)) return false;
    const card = ch.card = ch.cards[i];
    // 처음 만난 동료는 소개를 문제 위에 먼저 보여 준다(알려 주고 묻기). 소개를 본 뒤라 그 사람 문제가 열린다.
    const met = !w.practice && R.needsQuestion(card) ? meet(w, card) : null;
    if (met) sv.told?.add('person:' + met);
    const review = ch.type === 'level' && ch.level % 3 === 0 && w.stats.right + w.stats.wrong < 12;
    const q = !w.practice && (R.needsQuestion(card) || review) ? newQ(w, [card.id]) : null;
    // 강화·유물·엽전·떡 카드, 연습 판, 남은 문제가 없을 때는 묻지 않고 바로 준다
    if (!q) { apply(w, card, true, null); finish(w); return true; }
    ch.meet = met;
    setQ(w, ch, q); refresh(w);
    return true;
  }
  function answer(w, i) {
    const ch = w.sv.choice;
    if (!ch || ch.stage !== 'question' || !(i >= 0 && i < ch.opts.length)) return false;
    const ok = ch.opts[i] === ch.q.a;
    ch.sel = i; ch.ok = ok; ch.stage = 'result';
    const restored = ok && ch.type === 'scroll' && w.sv.crackOf.get(ch.q.id);
    if (restored) ch.restored = R.cardName(w.content, { kind: w.sv.kit.weapons.includes(restored) ? 'weapon' : w.sv.kit.relics.includes(restored) ? 'relic' : 'ally', id: restored.id });
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
    levelCheck(w);
    if (sv.queue.length && !w.over) openNext(w);
  }
  function settle(w, ch) {
    const sv = w.sv, ok = ch.ok !== false;
    if (ch.type === 'chest' && !ok) ch.q.chest = true;
    if (ch.q) judged(w, ch, ok);
    if (ch.type === 'level') apply(w, ch.card, ok, ch.q);
    else if (ch.type === 'chest' && ok) openChest(w, ch.evo, ch.bonus);
    else if (ch.type === 'boss' && ok) { sv.cardBoost = (sv.cardBoost || 0) + 1; }
    else if (ch.type === 'scroll' && ok && ch.chest) { ch.q.chest = false; openChest(w, ch.evo, ch.bonus); }
  }
  // 맞힘·틀림 기록: 이어 맞히기, 기세·미션(judge), 다시 묻기, 끝 화면 복습 줄
  function judged(w, ch, ok) {
    const sv = w.sv, q = ch.q, st = w.stats, p = above(w, 30), scroll = ch.type === 'scroll';
    // 도감 사실: 그 사람에 대한 문제를 맞힌 수만큼 판이 끝날 때 열린다(meta.settle)
    if (ok && q.about && !w.practice) sv.facts[q.about] = (sv.facts[q.about] || 0) + 1;
    if (ok && ch.hint) {
      // 단서를 보고 맞히면 카드는 받지만 점수·이어 맞히기는 없다
      st.hinted = (st.hinted || 0) + 1;
    } else if (ok) {
      const react = window.GFJuice?.react;
      if (react?.right) react.right(w.fx, p.x, p.y, { points: tun(w).score.right, combo: w.combo }); else w.combo?.hit?.();
      st.right++;
      S.allies.answered(w);
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
    if (!ok && !scroll && w.reask) w.reask.add(q, sv.t, Infinity);
    if (ok && (ch.type === 'chest' || scroll && ch.chest)) st.special = (st.special || 0) + 1;
    w.judge?.(ok ? 'right' : 'wrong');
  }
  // 공용 재질문과 같은 대기 시간·횟수·상한. 한 판 안에서만 기억한다.
  function reaskCreate(w) {
    const queue = [], counts = new Map(), inFlight = new Set();
    const api = {
      add(item, now, endAt) {
        if (queue.length >= 3 || queue.some(q => q.item === item) || inFlight.has(item) || (counts.get(item) || 0) >= 2) return false;
        const T = tun(w).reask, at = Math.min(now + T.minS + w.rng() * (T.maxS - T.minS), endAt - 5);
        if (at - now < 8) return false;
        queue.push({ item, at }); queue.sort((a, b) => a.at - b.at); return true;
      },
      due(now) {
        if (!queue.length || queue[0].at > now + 1e-9) return null;
        const { item } = queue.shift();
        counts.set(item, (counts.get(item) || 0) + 1);
        inFlight.add(item); return item;
      },
      result(item, kind, now) { inFlight.delete(item); if (kind !== 'right') api.add(item, now, Infinity); },
      size: () => queue.length
    };
    return api;
  }
  // 카드 적용: 맞히면 온전한 힘, 틀리면 금(crack)이 하나 가서 반쪽 힘. 그 문제를 다시 맞히면 금이 메워진다.
  function apply(w, card, ok, q) {
    const sv = w.sv, h = sv.hero;
    if (!card) return;
    if (card.kind === 'coins') { const n = card.amount || 0; sv.extraCoins += n; const p = above(w, 30); moment(w, 'coin', { x: p.x, y: p.y, label: R.fmt(R.T.coins, n) }); return; }
    if (card.kind === 'food') { const before = h.hp; h.hp = Math.min(h.hpMax, h.hp + h.hpMax * (tun(w).level.foodHeal ?? 1)); S.allies.healed(w, before); const p = above(w, 30); moment(w, 'coin', { x: p.x, y: p.y, label: R.T.food }); return; }
    const key = { weapon: 'weapons', relic: 'relics', ally: 'allies' }[card.kind];
    if (!key) return;
    const list = sv.kit[key];
    let own = list.find(o => o.id === card.id);
    if (!own) { own = { id: card.id, level: 0, cracks: 0 }; list.push(own); sv.seen[key === 'allies' ? 'people' : key].add(card.id); }
    const before = own.level;
    own.level = Math.max(own.level, card.level);
    if (!ok && q) { own.cracks = (own.cracks || 0) + 1; sv.crackOf.set(q.id, own); }
    if (key === 'allies') S.allies.gain(w, own, before);
  }
  const storyOn = w => typeof document !== 'undefined' && !(window.GF?.sim > 0) && !w.botKind && !w.practice && !w.duo;
  // 처음 만난 동료(이 기기에서 처음)면 그 id. 고르기 창이 문제 결과 칸에 소개를 함께 보여 준다. 판을 따로 멈추지 않는다.
  function meet(w, card) {
    const sv = w.sv, id = card.id;
    if (card.kind !== 'ally' || !card.isNew || sv.known.has(id) || !w.content.people.find(p => p.id === id)?.intro) return null;
    sv.known.add(id); return id;
  }
  // 상자: 진화할 무기가 있으면 진화, 없으면 다음에 고르는 카드에 강화 단계를 합친다.
  function openChest(w, evo, bonus) {
    const sv = w.sv;
    sv.opened++;
    if (evo && S.weapons.evolve(w, evo)) {
      S.moments.chest(w, { evo: evo.id, name: evo.name, slot: S.evolution.icon(w, evo.id), coins: tun(w).coins.chest });
      return;
    }
    sv.cardBoost = (sv.cardBoost || 0) + Math.max(1, bonus || 0);
    S.moments.chest(w, { bonus: Math.max(1, bonus || 0), slot: 'chest', coins: tun(w).coins.chest });
  }

  // 봇(시험·균형 맞추기용): 가까운 적은 피하고 상자·두루마리, 없으면 구슬로 간다. 창은 그 자리에서 고른다.
  function botDir(w) {
    const sv = w.sv, h = sv.hero;
    let x = 0, y = 0;
    for (const f of sv.foes) {
      if (f.dead) continue;
      const dx = h.x - f.x, dy = h.y - f.y, d = Math.hypot(dx, dy) || 1;
      if (d < 90) { const k = (90 - d) / 90 * (h.invuln > .5 ? .7 : 2.5) / d; x += dx * k; y += dy * k; }
    }
    // All answer bots react to visible warnings and approaching arrows alike.
    for (const t of sv.tele) {
      const dx = h.x - t.x, dy = h.y - t.y, d = Math.hypot(dx, dy) || 1;
      if (t.kind === 'line') {
        const c = Math.cos(t.ang), s = Math.sin(t.ang), along = dx * c + dy * s, across = -dx * s + dy * c;
        if (along > -20 && along < t.len + 20 && Math.abs(across) < (t.f?.r || 24) + W.HERO_R + 12) { const side = across < 0 ? -1 : 1; x -= s * side * 4; y += c * side * 4; }
      } else if (t.kind === 'fan') {
        const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - t.ang), Math.cos(Math.atan2(dy, dx) - t.ang));
        if (d < t.r + 20 && Math.abs(delta) < t.spread + .15) { const side = delta < 0 ? -1 : 1; x -= Math.sin(t.ang) * side * 3; y += Math.cos(t.ang) * side * 3; }
      } else if (d < t.r + 22) { x += dx / d * 4; y += dy / d * 4; }
    }
    for (const s of sv.foeShots) {
      const dx = h.x - s.x, dy = h.y - s.y, speed2 = s.vx * s.vx + s.vy * s.vy, time = (dx * s.vx + dy * s.vy) / Math.max(1, speed2);
      if (time < 0 || time > .55 || (dx - s.vx * time) ** 2 + (dy - s.vy * time) ** 2 > 22 ** 2) continue;
      const side = s.vx * dy - s.vy * dx < 0 ? -1 : 1, speed = Math.sqrt(speed2) || 1;
      x -= s.vy / speed * side * 3; y += s.vx / speed * side * 3;
    }
    let goal = null, best = Infinity;
    if (h.hp < h.hpMax * .45) for (const it of sv.items) if (it.type === 'food') { const d = Math.hypot(it.x - h.x, it.y - h.y); if (d < Math.min(best, 240)) { best = d; goal = it; } }
    if (!goal) for (const it of sv.items) if (it.type === 'chest' || it.type === 'scroll') { const d = Math.hypot(it.x - h.x, it.y - h.y); if (d < best) { best = d; goal = it; } }
    if (!goal) { best = 200; for (const g of sv.gems) { const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < best) { best = d; goal = g; } } }
    if (goal) {
      // 줍는 물건까지의 길만 우회한다. 위에서 계산한 공격 회피는 매 걸음 그대로 더한다.
      h.r=W.HERO_R;const aim=W.steer(w,h,goal.x,goal.y);x+=aim.x;y+=aim.y;
    } else h.wallPath=null;
    x += Math.cos(sv.t * .4) * .35; y += Math.sin(sv.t * .4) * .35;
    const n = Math.hypot(x, y);
    return n > 1e-6 ? { x: x / n, y: y / n } : { x: 0, y: 0 };
  }
  function botPlay(w, ch) {
    const sv = w.sv;
    for (let n = 0; n < 4 && sv.choice === ch; n++) {
      if (ch.stage === 'cards') {
        const score = c => {
          if (c.kind === 'weapon') return c.isNew ? 100 : 40 + c.level * 2;
          if (c.kind === 'relic') { const stat = w.content.relics.find(r => r.id === c.id)?.stat; return ['might', 'cd', 'n'].includes(stat) ? 30 : stat === 'armor' ? 24 : 12; }
          if (c.kind === 'ally') return 18;
          return c.kind === 'food' && sv.hero.hp < sv.hero.hpMax * .4 ? 35 : 0;
        };
        let best = 0; for (let i = 1; i < ch.cards.length; i++) if (score(ch.cards[i]) > score(ch.cards[best])) best = i;
        pick(w, best);
      }
      else if (ch.stage === 'question') { const right = R.botChoice(w.botKind, ++sv.botN); answer(w, right ? ch.opts.indexOf(ch.q.a) : ch.opts.findIndex(o => o !== ch.q.a)); }
      else cont(w);
    }
  }
  // 캔버스를 누르면 그 자리가 조이스틱 가운데가 된다. 껍데기 좌표(캔버스 기준)와 화면 좌표의 차이를 기억해 둔다.
  function press(w, x, y) {
    const d = lastDown;
    // 잠깐 멈춤(상자·장수 처치) 동안 줄 섰다 뒤늦게 온 누르기: 그 손가락을 이미 놓았으면 조이스틱을 켜지 않는다(켜진 채 남아 키가 안 먹었다).
    if (doc && d && !downs.has(d.id)) return;
    // 다른 손가락이 조이스틱을 쥐고 있으면 빼앗지 않는다.
    if (doc && stick.on && stick.id != null && downs.has(stick.id) && d?.id !== stick.id) return;
    Object.assign(stick, { on: true, w, id: d ? d.id : null, ox: d ? d.x - x : 0, oy: d ? d.y - y : 0, x0: x, y0: y, x, y });
  }

  function look(w) {
    const sv = w.sv;
    if (!sv) return null;
    const ch = sv.choice, own = list => list.map(o => ({ id: o.id, level: o.level, cracks: o.cracks || 0, evo: o.evo || null }));
    return {
      begun: !!sv.begun, t: sv.t, play: sv.play, battle: sv.battle?.id ?? null, cell: sv.cell?.id ?? null, act: sv.act, tier: sv.tier, era: sv.era, hero: sv.heroDef?.person ?? null, rival: sv.rival,
      bossOn: sv.bossOn.map(b => b.def.id), foeShots: sv.foeShots.length, cap: W.capOf(w), loop: sv.loop,
      level: sv.level, xp: sv.xp, hp: sv.hero.hp, hpMax: sv.hero.hpMax, x: sv.hero.x, y: sv.hero.y,
      kit: { weapons: own(sv.kit.weapons), relics: own(sv.kit.relics), allies: own(sv.kit.allies) },
      choice: ch ? { type: ch.type, stage: ch.stage, cards: ch.cards?.map(c => `${c.kind}:${c.id}`) ?? null, q: ch.q?.q ?? null, a: ch.q?.a ?? null, ok: ch.ok ?? null, evo: ch.evo?.id ?? null, bonus: ch.bonus ?? null, auto: ch.auto || 0 } : null,
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
      return [r.lv, r.xp, r.clock, r.icons, r.right, r.boss, S.scene.evolutionRect(w), S.scene.giftRect(w), S.scene.defeatRect(w)].filter(Boolean).map(b => ({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }));
    },
    // 아래는 시험 고리. 모든 hooks가 window.__GAME에 드러나므로 스스로 막는다.
    sv: w => dev() ? (ensure(w), look(w)) : null,
    levelUp: w => {
      if (!dev()) return null;
      const sv = ensure(w);
      sv.xp = R.xpNeed(sv.level, tun(w).xp, sv.cell?.id); levelCheck(w); sv.openAt = 0;
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
    boss: (w, role = 'deputy') => { if (!dev()) return null; const sv = ensure(w), p = sv.cell; S.bosses.spawn(w, bossDef(w, role === 'general' ? p.general.id : p.deputies[0].id)); return true; },
    jump: (w, t) => { if (!dev()) return null; const sv = ensure(w); sv.t = Number(t); return look(w); },
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
    storyFirst: true,
    beforeCountdown(w) {
      const sv = ensure(w);
      S.scene.prepareStageBosses(w);
      if (!storyOn(w)) { S.scene.prepareStageBanners(w); return; }
      events(w);
      openNext(w);
    },
    // 남은 시간은 「다음 막까지」(칸 판)·「버틴 시간」(무한)이다. 공용 「마지막 10초」는 1막 80초·무한 시작에 켜져 판 끝까지 남았다.
    stageOnly: true, noCountdown: true, createModeSession: S.stages.create,
    stageMap: S.stages.map, home: S.stages.home, stageOpen: S.stages.stageOpen, endlessOpen: S.stages.endlessOpen, stageCount: 13, quietFirstBest: true,
    // 멈춤 판: 시대 따라가기는 「몇 막 · 하트 · 다음 막까지」, 무한은 「점수 · 하트 · 버틴 시간」
    pauseInfo: (w, s, { score, hearts, time, clock }) => {
      if (!s || !w.sv) return null;
      const sv = w.sv, name = sv.cell?.name || '';
      if (s.play === 'endless') return { line: `${R.T.endlessName} · ${name}`, stats: [score(w), ...hearts(s.hearts), { icon: 'clock', label: R.T.survived, value: clock(sv.t) }] };
      return { line: `${R.T.followName} · ${s.stage?.title || name}`, stats: [{ icon: 'flag', label: R.T.nowAct, value: R.fmt(R.T.act, sv.act || 1) }, ...hearts(s.hearts), { ...time(s.remaining), label: sv.bossOn.some(b => b.def.role === 'general') ? R.T.generalNow : R.T.toNext }] };
    },
    guide: (parent, family, id, art) => {
      const guide = window.GFUI.guide(parent, family, id, art);
      const label = parent.querySelector('.gf-guide-caption');
      if (label) label.textContent = '누르고 끌어 움직여요 · 공격은 자동이에요';
      return guide;
    },
    // ownHUD: 점수·시계·하트 칩을 껍데기가 아니라 이 틀(scene.hud)이 그린다
    family: 'survivor', compactHUD: true, ownHUD: true, pixelEffects: true, pixelShake: true, cacheEffectText: true, avoidEffectText: true, ownLives: true,
    // 60장 화면에서는 낮은 사양 전환 뒤 높은 해상도로 되돌아가며 느려지는 반복을 막는다.
    cacheVignette: true, directSurface: true, lightDecor: { slowMs: 17.2, backMs: 16 }, layeredEffects: false,
    cacheTextMeasure: true, cacheHUDGeometry: true, cacheTextLayout: true,
    combo: { steps: [3, 5, 10] },
    titleExtra: S.meta.titleExtra, resultExtra: S.meta.resultExtra,
    resultReport: (w, options) => S.result.report(w, options), resultScreen: (parent, options) => S.result.render(parent, options),
    setup, layout: w => S.scene.layout(w), step,
    draw: (w, g) => { ensure(w); S.scene.draw(w, g); },
    drawBehindHUD: (w, g) => { ensure(w); S.scene.drawBehindHUD(w, g); },
    key() {}, press, bot: () => null, hooks
  };
  S.engine = cfg;
  // 검수실은 같은 출처의 바깥 주소도 읽는다. 공용 틀에는 검수 경로를 넣지 않는다.
  let review = false;
  if (doc) { review = new URLSearchParams(window.location.search).get('review') === '1';
    try { review ||= new URLSearchParams(window.parent.location.search).get('review') === '1'; } catch {} }
  if (review) {
    const base = new URL('.', document.currentScript.src), version = new URL(document.currentScript.src).search;
    (async () => {
      for (const name of ['review-core.js', 'review.js']) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = new URL(name, base).href + version;
        script.onload = resolve; script.onerror = reject; document.head.append(script);
      });
      await S.review.open();
    })().catch(error => { console.error(error); document.body.textContent = '검수실을 불러오지 못했어요. ' + error.message; });
    return;
  }
  window.GFShell.play(cfg);
})();
