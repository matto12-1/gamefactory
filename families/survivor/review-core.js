(function () {
  'use strict';
  // 이 파일은 검수 주소와 측정 대본에서만 읽는다. 보통 판에는 연결하지 않는다.
  const S = window.GFFamilies.survivor, R = S.rules, W = S.world;
  const copy = x => JSON.parse(JSON.stringify(x));
  const nameOf = (c, id) => c.people.find(p => p.id === id)?.name || id;
  function catalogue(c, tuning) {
    S.eras.expand(c, tuning);
    const erasFor = (d, boss) => d.cell ? [d.cell] : [...new Set((c.battles || []).filter(b => boss ? b.boss === d.id : b.foes?.includes(d.id)).map(b => b.era))];
    const person = (id, role, group) => {
      const p = c.people.find(p => p.id === id);
      return { id, name: p.name, era: p.cell || p.era, role, group, slots: [`person-${p.person}-a`, `person-${p.person}-b`] };
    };
    const people = [
      ...c.heroes.map(h => person(h.person, '주인공', 'heroes')),
      ...c.allies.map(a => person(a.person, `${R.T.allyDoes[a.does] || a.does} · 고유 효과`, 'allies')),
      ...c.bosses.map(b => ({ id: b.id, name: b.name, era: erasFor(b, true)[0], eras: erasFor(b, true), role: b.role === 'general' ? '대장' : b.role === 'deputy' ? '부장' : '장수', group: 'bosses', slots: [`boss-${b.sprite}`, `boss-${b.sprite}`] })),
      ...c.foes.map(f => ({ id: f.id, name: f.name, era: erasFor(f, false)[0], eras: erasFor(f, false), role: f.kind || '적 병사', group: 'foes', slots: [`foe-${f.sprite}-a`, `foe-${f.sprite}-b`] }))
    ];
    for (const p of c.people) if (!people.some(r => r.id === p.id)) people.push(person(p.id, '인물', 'allies'));
    const order = ['heroes', 'allies', 'bosses', 'foes'];
    const eraNo = id => R.CELLS.indexOf(({ goryeo: 'goryeo1', joseon: 'joseon1' })[id] || id);
    people.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || eraNo(a.era) - eraNo(b.era));
    return { people, heroes: c.heroes, allies: c.allies, weapons: c.weapons, evolutions: c.evolutions, bosses: c.bosses, foes: c.foes };
  }
  function meter(w) {
    const rows = new Map(), allHit = new WeakSet(); let unique = 0, hurt = 0;
    const get = key => {
      if (!rows.has(key)) rows.set(key, { key, damage: 0, kills: 0, targets: 0, hits: 0, ground: 0, fire: 0, buckets: [], seen: new WeakSet() });
      return rows.get(key);
    };
    const api = {
      hit(f, damage, source, ally, killed) {
        if (!(damage > 0)) return;
        const row = get(ally ? 'ally:' + ally : 'weapon:' + (source || 'unknown'));
        row.damage += damage; row.hits++; if (killed) row.kills++;
        if (!row.seen.has(f)) { row.seen.add(f); row.targets++; }
        if (!allHit.has(f)) { allHit.add(f); unique++; }
        const t = w.sv.t, bucket = row.buckets.at(-1);
        if (bucket && bucket.at === t) bucket.damage += damage;
        else row.buckets.push({ at: t, damage });
      },
      hurt(n) { hurt += n; },
      sample(dt) {
        const sv = w.sv, active = new Set(), fires = new Set();
        for (const t of sv.traps) active.add('weapon:' + t.source);
        for (const t of sv.ally?.traps || []) active.add('ally:' + t.id);
        for (const f of sv.ally?.fires || []) { active.add('ally:' + f.id); fires.add('ally:' + f.id); }
        for (const key of active) get(key).ground += dt;
        for (const key of fires) get(key).fire += dt;
        for (const row of rows.values()) {
          const first = row.buckets.findIndex(b => b.at > sv.t - 10);
          if (first < 0) row.buckets.length = 0; else if (first) row.buckets.splice(0, first);
        }
      },
      report() {
        const seconds = Math.max(1 / 60, w.sv.t);
        return { seconds, hurt, targets: unique, rows: [...rows.values()].map(({ seen, buckets, ...r }) => ({ ...r,
          dps: r.damage / seconds, recentDps: buckets.reduce((n, b) => n + b.damage, 0) / Math.min(10, seconds),
          groundRatio: r.ground / seconds, fireRatio: r.fire / seconds })) };
      }, get
    };
    w.reviewMeter = api; return api;
  }
  // 검수 세계는 저장 자료를 읽거나 지우지 않는다. 원래 applyStart의 닫힌 read도 피한다.
  function isolate() {
    S.meta.read = (c, t) => S.meta.blank(c, t);
    S.meta.write = () => false;
    S.meta.runClear = () => {};
    S.meta.applyStart = (w, sv) => {
      const def = w.content.heroes.find(h => h.person === w.svReview.hero) || w.content.heroes[0];
      sv.heroDef = def; sv.shop = {}; sv.hero.person = w.content.people.find(p => p.id === def.person).person;
      return S.meta.blank(w.content, w.family.tuning);
    };
  }
  // 측정 대본의 기존 create 기본값은 유지한다. 검수 화면은 yard:true로 연다.
  const defaults = c => ({ hero: c.heroes[0].person, cell: c.packs[0].id, weapons: [{ id: 'bow', level: 8 }], allies: [], relics: [],
    god: true, slow: false, paused: false, cardsOff: true, clockOff: true, density: 'normal', act: 1,
    yard: false, incoming: false, layout: 'circle', baseWeapon: false, levels: {} });
  function normalize(c, t, value = {}) {
    const opt = { ...defaults(c), ...value };
    if (!c.heroes.some(h => h.person === opt.hero)) opt.hero = c.heroes[0].person;
    if (!c.packs.some(p => p.id === opt.cell)) opt.cell = c.packs[0].id;
    const clean = (list, defs, max) => [...new Map((Array.isArray(list) ? list : []).filter(o => defs.some(d => (d.id || d.person) === o.id)).map(o => [o.id, { id: o.id,
      level: Math.max(1, Math.min(max(o.id), Math.round(Number(o.level) || 1))), ...(c.evolutions.some(e => e.id === o.evo && e.weapon === o.id) ? { evo: o.evo } : {}) }])).values()];
    opt.weapons = clean(opt.weapons, c.weapons, id => c.weapons.find(w => w.id === id).levels.length);
    opt.allies = clean(opt.allies, c.allies, () => t.level.allyMax);
    opt.relics = clean(opt.relics, c.relics, () => t.level.relicMax);
    opt.act = [1, 2, 3].includes(Number(opt.act)) ? Number(opt.act) : 1;
    opt.density = ['few', 'normal', 'many'].includes(opt.density) ? opt.density : 'normal';
    opt.layout = ['circle', 'line', 'cluster', 'boss'].includes(opt.layout) ? opt.layout : 'circle';
    opt.levels = opt.levels && typeof opt.levels === 'object' ? { ...opt.levels } : {};
    for (const k of ['god', 'slow', 'paused', 'cardsOff', 'clockOff', 'yard', 'incoming', 'baseWeapon']) opt[k] = !!opt[k];
    return opt;
  }
  const HP = 1e9;
  const empty = w => w.svReview?.yard && !w.svReview.incoming;
  // 검수 파일이 읽힌 세계만 가로챈다. 원래 출현·이동 함수는 실전처럼 볼 때 그대로 쓴다.
  const spawnStep = W.spawnStep, moveFoes = W.moveFoes, hitFoe = W.hitFoe;
  W.spawnStep = (w, dt) => { if (!empty(w)) spawnStep(w, dt); };
  W.moveFoes = (w, dt) => {
    if (!empty(w)) return moveFoes(w, dt);
    for (const f of w.sv.foes) if (f.reviewDummy) {
      f.x = f.homeX; f.y = f.homeY; f.kbx = f.kby = 0;
      f.squash = Math.max(0, (f.squash || 0) - dt); f.flash = Math.max(0, f.flash - dt);
      // 밀림은 기존 그리기의 recoil·squash가 보여 준다. 충돌 좌표는 고정한다.
      if (Math.abs(w.sv.hero.x - f.x) > 2) f.faceX = w.sv.hero.x < f.x ? -1 : 1;
    }
  };
  W.hitFoe = (w, f, ...args) => {
    if (f?.reviewDummy && empty(w) && f.hp <= 0) { f.hp = HP; f.dead = false; }
    return hitFoe(w, f, ...args);
  };
  function clearField(w) {
    const sv = w.sv;
    for (const f of sv.foes) f.dead = true;
    // 몸에 저장한 이전 벽 목록도 무효화해야 빈 마당에서 걸리지 않는다.
    sv.propOwner = null; sv.wallCache = new Map();
    for (const key of ['foes', 'bossOn', 'foeShots', 'tele', 'gems', 'items', 'flights', 'deaths']) sv[key].length = 0;
    // 실전 연출 중 돌아와도 이전 장수·선물·승리의 멈춤이 마당에 남지 않게 한다.
    for (const key of ['arrival', 'gift', 'collection', 'bossMoment', 'bossFrame', 'victoryMoment', 'evolution']) sv[key] = null;
    sv.stopLeft = sv.slowLeft = 0; sv.bossFrameScale = 1; w.freezeLeft = 0;
    sv.queue.length = 0; sv.choice = null; w.hold = false; S.picker.close();
    sv.alive = 0; sv.boss = null; sv.rush = null; sv.spawnAcc = 0; sv.generalDown = false;
    W.grid(sv);
  }
  function offsets(w) {
    const sv = w.sv, opt = w.svReview;
    const slot = opt.layout === 'boss' ? 'boss-' + w.content.bosses.find(b => b.id === sv.cell.general.id).sprite : 'foe-' + sv.foeDefs.foot.sprite + '-a';
    const spec = w.art.ui?.battle?.sprites?.[slot] || w.art.slots[slot];
    // 발은 화면 가운데에 있다. 위쪽 그림 높이까지 빼서 그림 전체가 들어오게 한다.
    const halfX = Math.max(0, (w.px?.W || 360) / 2 - spec.w / 2 - 4);
    const halfY = Math.max(0, (w.px?.H || 360) / 2 - spec.h - 4);
    const fit = Math.min(1, halfX / 220, halfY / 220);
    let points;
    if (opt.layout === 'line') points = Array.from({ length: 6 }, (_, i) => ({ x: (40 + i * 44) * Math.min(1, halfX / 260), y: 0 }));
    // 짧은 무기와 깔아 둔 덫도 같은 고정 장수로 시험할 거리다. 무기 수치는 그대로 쓴다.
    else if (opt.layout === 'boss') points = [{ x: Math.min(48, halfX), y: 0 }];
    else if (opt.layout === 'cluster') points = Array.from({ length: 14 }, (_, i) => {
      const a = i * Math.PI * (3 - Math.sqrt(5)), r = (30 + i / 13 * 60) * Math.min(1, halfX / 90, halfY / 90);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    else points = Array.from({ length: 16 }, (_, i) => {
      const a = (i % 8) * Math.PI / 4 + (i < 8 ? 0 : Math.PI / 8), r = (i < 8 ? 50 + i % 3 * 15 : 150 + i % 4 * 70 / 3) * fit;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    // 주인공 양옆의 동료 수만큼 잉크 띠를 비운다. 바깥 고리는 보존하고 겹치는 안쪽 점만 위·아래로 옮긴다.
    // 한 줄·장수는 동료를 켰을 때만 비킨다. 동료 없는 짧은 무기·덫 시험 거리는 보존한다.
    if ((opt.layout === 'line' || opt.layout === 'boss') && !sv.kit.allies.length) return points;
    const heroInk = S.allies.personInk(w, sv.hero.person), band = { left: -heroInk.radius, right: heroInk.radius, top: heroInk.top, bottom: heroInk.bottom };
    sv.kit.allies.forEach((own, i) => {
      const person = w.content.people.find(p => p.id === own.id)?.person ?? 0, ink = S.allies.personInk(w, person, true);
      const distance = S.allies.standing(w, i, 1).x - sv.hero.x;
      band.left = Math.min(band.left, -distance - ink.radius); band.right = Math.max(band.right, distance + ink.radius);
      band.top = Math.min(band.top, ink.top); band.bottom = Math.max(band.bottom, ink.bottom + 2);
    });
    return points.map((p, i) => {
      if (opt.layout === 'circle' && i >= 8) return p;
      const left = p.x - spec.w / 2, right = p.x + spec.w / 2, top = p.y - spec.h, bottom = p.y + 2;
      if (right <= band.left - 2 || left >= band.right + 2 || bottom <= band.top - 2 || top >= band.bottom + 2) return p;
      const above = band.top - 4, below = band.bottom + spec.h + 2;
      return { x: p.x, y: Math.abs(p.y - above) <= Math.abs(p.y - below) ? above : below };
    });
  }
  function fit(w) {
    if (!empty(w)) return;
    const center = w.sv.reviewCenter, points = offsets(w);
    w.sv.foes.filter(f => f.reviewDummy).forEach((f, i) => {
      const p = points[i];
      Object.assign(f, { x: center.x + p.x, y: center.y + p.y, homeX: center.x + p.x, homeY: center.y + p.y });
    });
    W.grid(w.sv);
  }
  function place(w, recenter = true) {
    const sv = w.sv, opt = w.svReview;
    clearField(w);
    if (!empty(w)) return;
    const center = recenter || !sv.reviewCenter ? { x: sv.hero.x, y: sv.hero.y } : sv.reviewCenter;
    sv.reviewCenter = center;
    const points = offsets(w);
    for (const offset of points) {
      const p = { x: center.x + offset.x, y: center.y + offset.y };
      const f = W.spawnFoe(w, 'foot', p);
      if (!f) continue;
      if (opt.layout === 'boss') {
        const def = w.content.bosses.find(b => b.id === sv.cell.general.id);
        Object.assign(f, { def, sprite: def.sprite, boss: true, kind: 'boss', role: 'general', r: 28, mode: 'walk', born: sv.t });
        sv.bossOn.push(f); sv.boss = f;
      }
      Object.assign(f, p, { homeX: p.x, homeY: p.y, reviewDummy: true, hp: HP, hpMax: HP, speed: 0, dmg: 0 });
    }
    W.grid(sv);
  }
  function setEra(w, id) {
    const sv = w.sv, pack = S.eras.packOf(w.content, id), foe = kind => w.content.foes.find(f => f.cell === id && f.kind === kind);
    sv.cell = pack; sv.ground = pack.ground; sv.era = S.eras.cellNo(id); sv.tier = sv.era;
    sv.foeDefs = { foot: foe('foot'), horse: foe('horse') || foe('foot'), archer: foe('archer') || foe('foot') };
    sv.battle = { id, name: pack.battle.name, year: pack.battle.year, era: id };
    sv.propOwner = null; sv.wallCache?.clear(); sv.propCache?.clear();
  }
  // same statsOf inputs and health-cap rule as engine.recompute, including hero bonus and fever.
  function recompute(w) {
    const sv = w.sv, h = sv.hero;
    sv.stats = R.statsOf(w.content, w.family.tuning, { kit: sv.kit, hero: sv.heroDef, shop: sv.shop, fever: sv.fever, cell: sv.cell?.id });
    const max = Math.max(1, Math.round(sv.stats.hpMax));
    if (max > h.hpMax) h.hp += max - h.hpMax;
    h.hpMax = max; h.hp = Math.min(h.hp, max);
  }
  function apply(w, opt, previous = {}) {
    const sv = w.sv, T = w.family.tuning, old = sv.kit, hero = w.content.heroes.find(h => h.person === opt.hero);
    const densities = { few: .5, normal: 1, many: 2 }, ratio = densities[opt.density] / densities[previous.density || opt.density];
    T.spawn.start *= ratio; T.spawn.perMin *= ratio;
    sv.heroDef = hero; sv.hero.person = w.content.people.find(p => p.id === hero.person).person;
    const weapons = copy(opt.weapons);
    if (opt.baseWeapon && !weapons.some(o => o.id === hero.weapon)) weapons.push({ id: hero.weapon, level: 1 });
    const same = (a, b) => a && b && a.id === b.id && a.evo === b.evo && a.level === b.level;
    // 바꾼 무기만 대기를 0으로 한다. 그대로 둔 무기의 연사·대기·날아가는 탄은 보존한다.
    const changed = new Set([...old.weapons, ...weapons].filter(o => !same(o, (old.weapons.includes(o) ? weapons : old.weapons).find(p => p.id === o.id))).map(o => o.evo || o.id));
    sv.shots = sv.shots.filter(s => s.ally || !changed.has(s.source));
    sv.traps = sv.traps.filter(t => !changed.has(t.source));
    for (const o of old.weapons) if (!weapons.some(p => p.id === o.id)) sv.wrun.delete(o.id);
    for (const o of weapons) if (!same(o, old.weapons.find(p => p.id === o.id)) || !sv.wrun.has(o.id)) {
      sv.wrun.set(o.id, { cd: 0, burst: 0, burstT: 0, k: 0, ang: 0, lastAng: Math.atan2(sv.hero.dy, sv.hero.dx), targets: [], st: null, hitAt: null });
    }
    const allyChanged = new Set([...old.allies, ...opt.allies].filter(o => !same(o, (old.allies.includes(o) ? opt.allies : old.allies).find(p => p.id === o.id))).map(o => o.id));
    const bodies = new Map(sv.allyBodies.filter(Boolean).map(b => [b.id, b]));
    const A = S.allies.state(sv);
    for (const key of ['traps', 'fires', 'dust', 'slams']) A[key] = A[key].filter(o => !allyChanged.has(o.id));
    for (const key of ['guard', 'food', 'rally']) if (allyChanged.has(A[key].owner)) {
      if (key === 'guard') Object.assign(A.guard, { up: false, owner: null, chill: null });
      else { A[key].until = -1; A[key].owner = null; }
    }
    sv.shots = sv.shots.filter(s => !allyChanged.has(s.ally));
    sv.kit = { weapons, allies: copy(opt.allies), relics: copy(opt.relics) };
    sv.allyBodies = opt.allies.map(o => bodies.get(o.id) || null);
    for (const o of opt.allies) if (allyChanged.has(o.id)) {
      const before = old.allies.find(p => p.id === o.id)?.level || 0;
      S.allies.gain(w, o, before);
      const b = bodies.get(o.id); if (b) { b.t = 0; b.first = null; }
    }
    if (!opt.allies.some(o => o.id === A.rerollOwner)) { A.rerolls = 0; A.rerollOwner = null; }
    if (!opt.allies.some(o => o.id === A.xpOwner)) { A.xpUntil = -1; A.xpExtra = 0; A.xpOwner = null; }
    recompute(w);
    for (const o of weapons) w.reviewMeter?.get('weapon:' + (o.evo || o.id));
    for (const o of opt.allies) w.reviewMeter?.get('ally:' + o.id);
    const fieldChanged = previous.cell !== opt.cell || previous.layout !== opt.layout || previous.incoming !== opt.incoming;
    if (previous.cell !== opt.cell) { setEra(w, opt.cell); recompute(w); }
    opt.empty = empty(w);
    if (opt.yard && fieldChanged) {
      place(w, previous.layout !== opt.layout || previous.incoming !== opt.incoming); sv.burst = opt.incoming;
      sv.nextElite = sv.t + T.spawn.eliteEvery; sv.nextChest = sv.t + T.spawn.chestEvery; sv.nextRing = sv.t + T.spawn.ringEvery;
      sv.acts = S.acts.start(T, sv.t);
    }
    // 멈춘 채 동료를 고르면 다음 걸음을 기다릴 수 없다. 실제 동료 갱신을 0초 실행해 그릴 몸을 먼저 준비한다.
    if (sv.allyBodies.some(b => !b)) S.allies.update(w, 0);
    if (empty(w) && !fieldChanged && (previous.hero !== opt.hero || allyChanged.size)) fit(w);
  }
  function create(data, value, extra = {}) {
    isolate();
    const content = copy(data.content); S.eras.expand(content, data.family.tuning);
    const opt = normalize(content, data.family.tuning, value), family = copy(data.family);
    opt.empty = opt.yard && !opt.incoming;
    opt.revive = f => { if (!empty(w) || !f.reviewDummy) return false; f.hp = HP; f.dead = false; return true; };
    const options = { ...data, ...extra, family, content, grade: 3, sim: true,
      view: extra.view || { w: 1366, h: 768, top: 0 }, modeSession: S.stages.create(data.game.modeKit, { stage: S.eras.cellNo(opt.cell) }) };
    // 출현 빈도만 검수 선택에 맞춘다. 피해·체력·무기·동료 수치는 그대로 둔다.
    const density = { few: .5, normal: 1, many: 2 }[opt.density];
    family.tuning.spawn.start *= density; family.tuning.spawn.perMin *= density;
    let elapsed = 0;
    const cfg = { ...S.engine, setup(w) { w.svReview = opt; S.engine.setup(w); }, step(w, dt) {
      if (opt.paused) return;
      if (empty(w)) {
        const sv = w.sv; sv.burst = false; sv.gems.length = sv.items.length = sv.queue.length = 0;
        sv.hero.hp = sv.hero.hpMax;
        for (const f of sv.foes) if (f.reviewDummy) { f.hp = HP; f.dead = false; }
      }
      if (opt.god || empty(w)) w.sv.hero.invuln = 1e9;
      else if (w.sv.hero.invuln > 1e8) w.sv.hero.invuln = 0;
      const before = w.sv.t, cards = opt.cardsOff, clock = opt.clockOff;
      if (empty(w)) opt.cardsOff = opt.clockOff = true;
      S.engine.step(w, dt); opt.cardsOff = cards; opt.clockOff = clock;
      if (empty(w)) { w.sv.gems.length = w.sv.items.length = 0; w.sv.xp = 0; }
      w.reviewMeter?.sample(w.sv.t - before);
      if (opt.clockOff || opt.yard) {
        w.sv.generalDown = false; w.modeSession.state.ended = false; w.modeSession.state.hearts = 3;
        if (opt.yard) w.over = false;
      }
      elapsed += dt;
    }, draw(w, g) {
      if (empty(w)) S.scene.battlefield(w, g, () => S.scene.drawBehindHUD(w, g));
      else S.engine.draw(w, g);
    } };
    const h = window.GFShell.headless(cfg, options), w = h.world();
    S.engine.step(w, 0);
    Object.assign(w.sv, { intro: false, act: opt.act, burst: true });
    w.sv.queue.length = 0; w.sv.choice = null; w.hold = false;
    if (opt.yard) apply(w, opt);
    else {
      w.sv.kit = { weapons: copy(opt.weapons), allies: copy(opt.allies), relics: copy(opt.relics) };
      recompute(w);
      for (const own of w.sv.kit.allies) S.allies.gain(w, own, 0);
    }
    w.sv.hero.hpMax = w.sv.stats.hpMax; w.sv.hero.hp = w.sv.hero.hpMax;
    const m = meter(w);
    for (const o of opt.weapons) m.get('weapon:' + (o.evo || o.id));
    for (const o of opt.allies) m.get('ally:' + o.id);
    return { ...h, options: opt, meter: m, cfg, elapsed: () => elapsed,
      apply(value) { const previous = { ...opt }, next = normalize(content, family.tuning, { ...opt, ...value }); Object.assign(opt, next); apply(w, opt, previous); return opt; },
      fit() { fit(w); },
      center() { const { x, y } = w.sv.reviewCenter || { x: 0, y: 0 }; Object.assign(w.sv.hero, { x, y, px: x, py: y, dx: 1, dy: 0, faceX: 1 }); W.camera(w); },
      boss(role) { const id = role === 'general' ? w.sv.cell.general.id : w.sv.cell.deputies[0].id;
        return S.bosses.spawn(w, content.bosses.find(b => b.id === id)); },
      clear() { for (const f of w.sv.foes) f.dead = true; w.sv.alive = 0; w.sv.bossOn.length = 0; w.sv.boss = null; w.sv.foeShots.length = 0; w.sv.tele.length = 0; },
      advance(seconds) { for (let rest = seconds; rest > 1e-9; rest -= 1 / 60) h.step(1 / 60); },
      name(key) { const [kind, id] = key.split(':'); return kind === 'ally' ? nameOf(content, id) : [...content.weapons, ...content.evolutions].find(d => d.id === id)?.name || id; }
    };
  }
  S.reviewCore = { catalogue, create, normalize, defaults, meter, nameOf };
})();
