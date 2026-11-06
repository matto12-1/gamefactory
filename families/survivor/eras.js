(function () {
  'use strict';
  // 시대 꾸러미(content.packs)와 13칸 지도(content.map)를 엔진이 쓰는 꼴로 바꾼다. 문서 없이 도는 순수 함수만 둔다.
  // 꾸러미 꼴은 tools/lib/survivor-era.mjs 맨 위 주석, 칸 번호는 계획서 Global Constraints.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const CELLS = S.rules.CELLS;
  const ENDLESS_NEED = 3;
  const cellNo = id => CELLS.indexOf(id) + 1;
  const cellId = n => CELLS[n - 1] ?? null;
  const slotNo = (s, pre) => { const m = new RegExp(`^${pre}-(\\d+)$`).exec(s || ''); return m ? Number(m[1]) : null; };
  const rows = content => content.map?.rows || [];
  const packOf = (content, id) => (content.packs || []).find(p => p.id === id) || null;
  const rowOf = (content, id) => rows(content).findIndex(r => r.eras.includes(id));
  const put = (list, key, value, item) => { const i = list.findIndex(x => x[key] === value); if (i >= 0) list[i] = { ...list[i], ...item }; else list.push(item); };

  // 꾸러미 사람·적·보스를 지금 내용 목록에 덧붙인다. 이미 있는 사람(주몽 등)은 칸만 바꾸고 소개를 얹는다.
  // 수치는 꾸러미에 없다: 동료 값·주인공 덤·적·보스 몸은 family.json tuning에서 온다.
  function expand(content, tuning) {
    if (content._expanded) return content;
    for (const k of ['eras', 'people', 'heroes', 'allies', 'foes', 'bosses']) content[k] = [...(content[k] || [])];
    // 동료 단계 값은 늘 family.json 한 곳에서 온다(꾸러미 밖 옛 동료도).
    content.allies = content.allies.map(a => tuning.allyValues?.[a.does] ? { ...a, values: [...tuning.allyValues[a.does]] } : a);
    for (const pack of content.packs || []) {
      put(content.eras, 'id', pack.id, { id: pack.id, name: pack.name });
      for (const p of pack.people) {
        const old = content.people.find(x => x.id === p.id);
        put(content.people, 'id', p.id, { id: p.id, name: p.name, person: slotNo(p.sprite, 'person') ?? old?.person ?? 0, era: pack.id, story: old?.story || p.intro, intro: p.intro, facts: p.facts, cell: pack.id });
        if (p.hero) put(content.heroes, 'person', p.id, { person: p.id, weapon: p.hero.weapon, perk: { stat: p.hero.perk, add: tuning.perkAdd[p.hero.perk] }, unlock: { stage: 0, coins: 0 }, cell: pack.id, first: p.hero.first });
        if (p.ally) put(content.allies, 'person', p.id, { person: p.id, does: p.ally.does, values: [...tuning.allyValues[p.ally.does]], story: p.ally.story, cell: pack.id });
      }
      for (const f of pack.foes) put(content.foes, 'id', f.id, { id: f.id, name: f.name, sprite: slotNo(f.sprite, 'foe') ?? 0, kind: f.kind, cell: pack.id, ...tuning.foeKinds[f.kind], shot: f.shot });
      const boss = (b, role) => put(content.bosses, 'id', b.id, { id: b.id, name: b.name, sprite: slotNo(b.sprite, 'boss') ?? 0, role, moves: [...b.moves], retreat: b.retreat, story: b.story, real: b.real, cell: pack.id, ...tuning.bossRoles[role] });
      pack.deputies.forEach(b => boss(b, 'deputy')); boss(pack.general, 'general');
    }
    content._expanded = true;
    return content;
  }

  // 지도 칸 상태. 첫 줄은 열려 있고, 줄마다 need칸을 깨야 다음 줄이 열린다. chain 줄은 왼쪽 칸을 깨야 다음 칸이 열린다.
  // 꾸러미가 없는 칸(ready:false)은 열려도 누를 수 없다.
  function mapState(content, cleared) {
    const out = []; let open = true;
    for (const row of rows(content)) {
      row.eras.forEach((id, i) => out.push({ id, no: cellNo(id), row: row.id, rowName: row.name, years: row.years, name: packOf(content, id)?.name ?? null,
        ready: !!packOf(content, id), cleared: cleared.has(id), unlocked: open && (!row.chain || i === 0 || cleared.has(row.eras[i - 1])) }));
      open = open && row.eras.filter(id => cleared.has(id)).length >= row.need;
    }
    return out;
  }
  const endlessOrder = (content, cleared) => rows(content).flatMap(r => r.eras).filter(id => cleared.has(id) && packOf(content, id));
  const endlessSegments = (content, cleared) => {
    const order = endlessOrder(content, cleared), n = order.length;
    return n <= 5 ? order : Array.from({ length: 5 }, (_, i) => order[Math.round(i * (n - 1) / 4)]);
  };
  const endlessOpen = (content, cleared) => endlessOrder(content, cleared).length >= ENDLESS_NEED;

  // 칸 하나의 시대 무기 묶음: 공통(content.common) + 꾸러미 kit. borrow는 빌려 온 칸 묶음을 쓰고, 빌려 온 칸이 또 빌리면 묶음이 없다.
  // 묶음이 없는 칸(옛 칸)은 null. evolutions는 묶음 안 무기·유물로 만들 수 있는 진화 전부(공통 진화 포함).
  function kitOf(content, id) {
    const own = packOf(content, id)?.kit, kit = own?.borrow ? packOf(content, own.borrow)?.kit : own;
    if (!Array.isArray(kit?.weapons)) return null;
    const common = content.common || {};
    const weapons = new Set([...(common.weapons || []), ...kit.weapons]), relics = new Set([...(common.relics || []), ...(kit.relics || [])]);
    const evolutions = new Set((content.evolutions || []).filter(e => weapons.has(e.weapon) && relics.has(e.relic)).map(e => e.id));
    return { start: kit.start, weapons, relics, evolutions };
  }
  // 새 카드로 나올 무기·유물. 묶음이 있는 칸은 그 묶음이고, 무한은 지금 도는 칸(cell)의 묶음이다.
  // 묶음이 없는 옛 칸은 옛 규칙: 무기는 옛 칸 주인공 무기와 가장 늦은 옛 칸의 줄까지 나온 무기, 유물은 content.old.relics(묶음 전 유물 10개).
  // 이름으로 못 박아서 묶음이 옛 유물을 다시 써도(고려 후기 염초) 옛 칸에 남고, 아직 초안인 칸의 새 유물도 섞이지 않는다(10-21).
  // old가 없는 판(시험 꾸러미)은 예전처럼 어느 칸 묶음에도 없는 유물.
  function gear(content, { mode = 'stage', cell, cleared = new Set() } = {}) {
    const kit = kitOf(content, cell);
    if (kit) return { weapons: new Set(kit.weapons), relics: new Set(kit.relics) };
    const old = (mode === 'endless' ? endlessOrder(content, cleared) : [cell].filter(id => packOf(content, id))).filter(id => !kitOf(content, id));
    const last = Math.max(-1, ...old.map(id => rowOf(content, id))), weapons = new Set();
    for (const id of old) for (const x of packOf(content, id).people) if (x.hero) weapons.add(x.hero.weapon);
    rows(content).forEach((row, i) => { if (i <= last) for (const id of row.eras) if (!kitOf(content, id)) for (const w of packOf(content, id)?.weapons || []) weapons.add(w); });
    if (content.old?.relics) return { weapons, relics: new Set(content.old.relics) };
    const common = new Set(content.common?.relics || []), kitted = new Set((content.packs || []).flatMap(p => p.kit?.relics || []).filter(id => !common.has(id)));
    return { weapons, relics: new Set((content.relics || []).map(r => r.id).filter(id => !kitted.has(id))) };
  }

  // 이 판에 허락된 것. 시대 따라가기는 그 칸, 무한은 깬 칸 전부(사람·문제). 무기·유물은 gear: 무한은 첫 칸 것이고, 칸이 바뀌면 엔진이 다시 부른다.
  function allowed(content, { mode = 'stage', cell, cleared = new Set() } = {}) {
    const cells = mode === 'endless' ? endlessOrder(content, cleared) : [cell].filter(id => packOf(content, id));
    const allies = new Set(), heroes = new Set(), questions = [];
    for (const id of cells) {
      const p = packOf(content, id);
      for (const x of p.people) { if (x.ally) allies.add(x.id); if (x.hero) heroes.add(x.id); }
      for (const q of p.questions) questions.push({ ...q, cell: id });
    }
    return { cells, allies, heroes, ...gear(content, { mode, cell: cell ?? cells[0], cleared }), questions };
  }

  S.eras = { CELLS, ENDLESS_NEED, cellNo, cellId, packOf, rowOf, expand, mapState, endlessOrder, endlessSegments, endlessOpen, kitOf, gear, allowed };
})();
