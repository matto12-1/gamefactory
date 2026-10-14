(function () {
  'use strict';
  window.GFFamilies = window.GFFamilies || {};
  // 버티기 틀 규칙: 창·문서 없이 도는 순수 함수만 둔다. 난수는 넘겨받은 rnd만 쓴다.
  function rng(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const allyOf = (content, id) => (content.allies || []).find(a => a.person === id) || null;
  const GROUNDS = ['field', 'hill', 'shore', 'snow', 'stone'];
  const WEAPON_KINDS = ['nearest', 'throw', 'swing', 'thrust', 'lob', 'ring', 'trap', 'wave', 'spread'];
  const EVO_KINDS = [...WEAPON_KINDS, 'boomerang', 'spin', 'charge', 'thunder', 'mine', 'orbit', 'flood', 'bomb', 'fan'];
  const RELIC_STATS = ['might', 'shotSpeed', 'armor', 'move', 'area', 'cd', 'hpPct', 'n', 'regen', 'duration'];
  const PERK_STATS = ['might', 'shotSpeed', 'armor', 'move', 'area', 'cd', 'hp', 'xp'];
  const ALLY_DOES = ['slash', 'dash', 'push', 'cd', 'feed', 'pickup', 'xp'];
  const LEVEL_KEYS = ['dmg', 'cd', 'n', 'pierce', 'speed', 'area', 'dur'];
  const SHOP = ['might', 'hp', 'speed', 'pickup', 'wisdom', 'regen'];
  const SHOP_STAT = { might: 'might', hp: 'hp', speed: 'move', pickup: 'pickup', wisdom: 'xp', regen: 'regen' };
  const PCT = new Set(['dmg', 'area', 'cd', 'speed', 'dur', 'might', 'shotSpeed', 'move', 'hpPct', 'duration', 'xp', 'pickup']);
  // 화면에 나오는 고정 글. {n} 자리에 수가 들어간다. texts()가 모두 도현체·줄표 검사에 넘긴다.
  const T = {
    level: '레벨', levelUp: '레벨 {n}!', isNew: '새로!', step: '{n}단계', full: '온전한 힘!', half: '반쪽 힘', cont: '계속',
    pick: '카드 하나를 골라요', chest: '보물상자!', chestBonus: '덤 레벨업 {n}번', evo: '진화!', real: '역사 속 무기와 전술', imagined: '상상 조합',
    evoNote: '재료를 합치는 방법과 효과는 게임 속 상상이에요', allyNote: '시대를 넘어 돕는 게임 속 동료예요',
    rival: '맞수 출전', pair: '진화 짝', answer: '정답', scroll: '다시 묻는 두루마리', coins: '엽전 +{n}', coinsDoes: '판이 끝나면 받아요',
    food: '떡', foodDoes: '체력을 채워요', boss: '보스', bossCome: '보스가 나타났어요!', bossDown: '보스를 쓰러뜨렸어요!', eraNext: '다음 시대로!', fell: '쓰러졌어요!',
    ready: '준비', heroes: '주인공', shop: '강화', book: '도감', locked: '잠김', chooseHero: '이 주인공으로', chosen: '고른 주인공',
    buy: '올리기', maxed: '다 올렸어요', needCoins: '엽전이 모자라요', unlockStage: '단계 {n}칸을 깨면 열려요', unlockCoins: '엽전 {n}개로 열기',
    gotCoins: '받은 엽전 +{n}', haveCoins: '가진 엽전 {n}', newHero: '새로 열린 주인공', firstMet: '처음 만난 것', close: '닫기',
    people: '사람', weapons: '무기', relics: '유물', evolutions: '진화', foes: '적', unknown: '아직 몰라요',
    shopName: { might: '힘', hp: '체력', speed: '빠르기', pickup: '줍기', wisdom: '지혜', regen: '회복' },
    stat: { dmg: '피해 +{n}%', n: '개수 +{n}', area: '범위 +{n}%', pierce: '뚫기 +{n}', cd: '더 자주 +{n}%', speed: '발사 빠르기 +{n}%', dur: '지속 +{n}%',
      might: '피해 +{n}%', shotSpeed: '발사 빠르기 +{n}%', armor: '받는 피해 -{n}', move: '이동 +{n}%', hpPct: '최대 체력 +{n}%', hp: '체력 +{n}',
      regen: '회복 +{n}', duration: '지속 +{n}%', xp: '경험치 +{n}%', pickup: '줍기 +{n}%' },
    allyDoes: { slash: '곁에서 함께 베어요', dash: '앞으로 힘껏 돌진해요', push: '둘레 적을 밀어내요', cd: '무기가 더 자주 싸워요', feed: '떡을 나눠 줘요', pickup: '구슬을 멀리서 모아요', xp: '경험치를 더 받아요' },
    allyUp: { slash: '함께 베기 +{n}', dash: '돌진 +{n}', push: '밀어내기 +{n}', cd: '더 자주 +{n}%', feed: '회복 +{n}', pickup: '줍기 +{n}%', xp: '경험치 +{n}%' }
  };
  const fmt = (t, n) => t.replace('{n}', n);
  const statText = (stat, v) => fmt(T.stat[stat], PCT.has(stat) ? Math.round(v * 100) : Math.round(v * 10) / 10);

  const xpNeed = (level, xp) => xp.base + xp.step * (level - 1) + Math.floor(xp.square * (level - 1) ** 2);
  const crackFactor = (level, cracks) => level > 0 ? 1 - .5 * Math.min(cracks || 0, level) / level : 1;
  function levelValue(def, level = 1, cracks = 0) {
    const base = def.stats || def.levels[clamp(level, 1, def.levels.length) - 1];
    return { ...base, dmg: base.dmg * crackFactor(def.stats ? 1 : level, cracks) };
  }
  const relicMax = (relic, limit) => Array.isArray(relic.per) ? relic.per.length : limit.relicMax;
  const relicValue = (relic, level) => level <= 0 ? 0 : Array.isArray(relic.per) ? relic.per[Math.min(level, relic.per.length) - 1] : relic.per * level;
  const allyValue = (ally, level, cracks = 0) => level <= 0 ? 0 : ally.values[clamp(level, 1, ally.values.length) - 1] * crackFactor(level, cracks);

  function mixRoll(weights, rnd) {
    const mix = Object.entries(weights), roll = rnd(); let sum = 0;
    for (const [band, weight] of mix) { sum += weight; if (roll < sum) return band; }
    return mix.length ? mix[mix.length - 1][0] : 'a';
  }
  // 5단계: 띠 굴림 → 그 띠의 주제 맞는 새 문제 → 다른 허용 띠의 주제 맞는 새 문제 → 그 띠의 새 문제 → 그 띠 기록을 비우고 다시.
  // 돌려준 문제를 asked에 넣는 일은 부르는 쪽이 한다.
  function pickQuestion(content, mix, topics, asked, rnd) {
    const band = mixRoll(mix, rnd), items = content.bands?.[band] || [];
    const fresh = q => !asked.has(q.id), on = q => (q.topic || []).some(t => topics.includes(t));
    const from = list => list.length ? list[Math.floor(rnd() * list.length)] : null;
    const others = Object.keys(mix).filter(b => b !== band && mix[b] > 0).flatMap(b => content.bands?.[b] || []);
    let q = from(items.filter(x => fresh(x) && on(x))) || from(others.filter(x => fresh(x) && on(x))) || from(items.filter(fresh));
    if (!q && items.length) { for (const x of items) asked.delete(x.id); q = from(items); }
    return q;
  }
  function topicsFor(content, card) {
    if (card.kind === 'weapon') return [card.id, ...(content.heroes || []).filter(h => h.weapon === card.id).map(h => h.person)];
    return card.kind === 'relic' || card.kind === 'ally' ? [card.id] : [];
  }
  const chestTopics = (evo, battle) => evo ? [evo.id, evo.weapon, evo.relic] : battle ? [battle.id] : [];

  // kit = {weapons:[{id,level,cracks,evo}], relics:[{id,level,cracks}], allies:[{id,level,cracks}]} (동료 id는 사람 id)
  function offers(content, tuning, kit, rnd, opt = {}) {
    const L = tuning.level, pool = [], own = (list, id) => list.find(x => x.id === id);
    for (const w of content.weapons) { const o = own(kit.weapons, w.id); if (o) { if (!o.evo && o.level < L.weaponMax) pool.push({ kind: 'weapon', id: w.id, level: o.level + 1, w: 3 }); } else if (kit.weapons.length < L.weaponsMax) pool.push({ kind: 'weapon', id: w.id, level: 1, isNew: true, w: 1.5 }); }
    for (const r of content.relics) { const o = own(kit.relics, r.id); if (o) { if (o.level < relicMax(r, L)) pool.push({ kind: 'relic', id: r.id, level: o.level + 1, w: 2 }); } else if (kit.relics.length < L.relicsMax) pool.push({ kind: 'relic', id: r.id, level: 1, isNew: true, w: 1 }); }
    for (const a of content.allies || []) { const o = own(kit.allies, a.person); if (o) { if (o.level < L.allyMax) pool.push({ kind: 'ally', id: a.person, level: o.level + 1, w: 2 }); } else if (kit.allies.length < L.alliesMax) pool.push({ kind: 'ally', id: a.person, level: opt.rival === a.person ? 2 : 1, isNew: true, w: 1 }); }
    const out = [];
    if (opt.mustAlly) { const i = pool.findIndex(c => c.kind === 'ally' && c.id === opt.mustAlly); if (i >= 0) out.push(pool.splice(i, 1)[0]); }
    while (out.length < L.cards && pool.length) {
      let roll = rnd() * pool.reduce((s, c) => s + c.w, 0), i = 0;
      for (; i < pool.length - 1; i++) { roll -= pool[i].w; if (roll < 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    for (const filler of [{ kind: 'coins', id: 'coins', level: 0, amount: tuning.coins?.card ?? 20 }, { kind: 'food', id: 'food', level: 0 }]) if (out.length < L.cards) out.push(filler);
    return out.map(({ w, ...card }) => card);
  }
  // 표 위쪽이 먼저: 무기가 끝 단계이고 짝 유물이 있으면 그 진화.
  function evolutionFor(content, kit, max = 8) {
    for (const e of content.evolutions || []) {
      const w = kit.weapons.find(x => x.id === e.weapon && !x.evo && x.level >= max);
      if (w && kit.relics.some(r => r.id === e.relic && r.level >= 1)) return e;
    }
    return null;
  }
  function evoHint(content, kit, card) {
    if (card.kind === 'weapon') return (content.evolutions || []).find(e => e.weapon === card.id && kit.relics.some(r => r.id === e.relic)) || null;
    if (card.kind === 'relic') return (content.evolutions || []).find(e => e.relic === card.id && kit.weapons.some(w => w.id === e.weapon && !w.evo)) || null;
    return null;
  }

  function battleFor(content, o = {}) {
    return byId(content.battles, content.stages[clamp(o.stageIndex || 0, 0, content.stages.length - 1)]);
  }
  // 단계 배수 × 시간 배수. kind: normal | fast | elite
  function foeStats(foe, o, tuning) {
    const f = tuning.foe;
    let hp = foe.hp * (1 + f.tierHp * ((o.tier || 1) - 1)) * (1 + f.minuteHp * (o.minutes || 0)), speed = foe.speed;
    if (o.kind === 'fast') { speed *= f.fastSpeed; hp *= f.fastHp; } else if (o.kind === 'elite') hp *= f.eliteHp;
    return { hp: Math.max(1, Math.round(hp)), speed, dmg: foe.dmg };
  }
  function bossStats(boss, o, tuning) {
    const f = tuning.foe;
    return { hp: Math.round(boss.hp * (1 + f.tierHp * ((o.tier || 1) - 1))), speed: boss.speed, dmg: boss.dmg };
  }
  // 유물·동료·주인공 덤·판 사이 강화·기세를 모아 이번 판의 힘을 낸다.
  function statsOf(content, tuning, o = {}) {
    const kit = o.kit || { weapons: [], relics: [], allies: [] }, per = tuning.shop?.per || {}, shop = o.shop || {};
    const s = { might: 1, area: 1, shotSpeed: 1, cd: 1, n: 0, duration: 1, move: 1, hpMax: 0, armor: 0, regen: tuning.hero.regen || 0, pickup: 1, xp: 1 };
    let hp = tuning.hero.hp, hpPct = 0;
    const add = (stat, v) => { if (stat === 'cd') s.cd -= v; else if (stat === 'hpPct') hpPct += v; else if (stat === 'hp') hp += v; else if (stat === 'n') s.n += Math.round(v); else s[stat] += v; };
    for (const own of kit.relics) { const r = byId(content.relics, own.id); if (r) add(r.stat, relicValue(r, own.level) * crackFactor(own.level, own.cracks)); }
    for (const own of kit.allies) {
      const a = allyOf(content, own.id), v = a ? allyValue(a, own.level, own.cracks) : 0;
      if (a?.does === 'cd') s.cd -= v; else if (a?.does === 'pickup') s.pickup += v; else if (a?.does === 'xp') s.xp += v; else if (a?.does === 'feed') s.regen += v;
    }
    if (o.hero?.perk) add(o.hero.perk.stat, o.hero.perk.add);
    for (const k of SHOP) add(SHOP_STAT[k], (shop[k] || 0) * (per[k] || 0));
    if (o.fever) s.might *= tuning.fever?.dmg || 2;
    s.cd = Math.max(.4, s.cd); s.hpMax = Math.round(hp * (1 + hpPct));
    return s;
  }
  const scoreOf = (o, score) => Math.floor(o.sec || 0) * score.perSec + (o.right || 0) * score.right + (o.chests || 0) * score.chest + (o.bosses || 0) * score.boss;
  const coinsOf = (o, coins) => Math.round((Math.floor((o.sec || 0) / 60 * coins.perMin) + (o.drops || 0) + (o.chests || 0) * coins.chest + (o.bosses || 0) * coins.boss + (o.extra || 0)) * (o.rival ? 1 + coins.rivalBonus : 1));

  function levelDiff(a, b) {
    const out = [];
    if (b.n !== a.n) out.push(statText('n', b.n - a.n));
    if (b.dmg !== a.dmg) out.push(statText('dmg', b.dmg / a.dmg - 1));
    if (b.area !== a.area && a.area > 0) out.push(statText('area', b.area / a.area - 1));
    if (b.pierce !== a.pierce && b.pierce < 99) out.push(statText('pierce', b.pierce - a.pierce));
    if (b.cd !== a.cd) out.push(statText('cd', 1 - b.cd / a.cd));
    if (b.speed !== a.speed && a.speed > 0) out.push(statText('speed', b.speed / a.speed - 1));
    if (b.dur !== a.dur) out.push(statText('dur', b.dur / a.dur - 1));
    return out.join(', ');
  }
  function cardText(content, card) {
    if (card.kind === 'weapon') { const w = byId(content.weapons, card.id); return card.isNew || card.level <= 1 ? w.does : levelDiff(w.levels[card.level - 2], w.levels[card.level - 1]); }
    if (card.kind === 'relic') { const r = byId(content.relics, card.id); return statText(r.stat, relicValue(r, card.level) - relicValue(r, card.level - 1)); }
    if (card.kind === 'ally') {
      const a = allyOf(content, card.id); if (card.isNew || card.level <= 1) return T.allyDoes[a.does];
      const v = a.values[card.level - 1] - a.values[card.level - 2];
      return fmt(T.allyUp[a.does], ['cd', 'pickup', 'xp'].includes(a.does) ? Math.round(v * 100) : Math.round(v * 10) / 10);
    }
    return card.kind === 'coins' ? T.coinsDoes : card.kind === 'food' ? T.foodDoes : '';
  }
  function cardName(content, card) {
    if (card.kind === 'weapon') return byId(content.weapons, card.id).name;
    if (card.kind === 'relic') return byId(content.relics, card.id).name;
    if (card.kind === 'ally') return byId(content.people, card.id).name;
    return card.kind === 'coins' ? fmt(T.coins, card.amount) : T.food;
  }
  // 카드·문제 그림 칸 이름: 무기·유물·진화는 아이콘, 사람은 얼굴.
  function picSlot(content, id) {
    const p = byId(content.people, id); if (p) return `face-${p.person}`;
    const x = byId(content.weapons, id) || byId(content.relics, id) || byId(content.evolutions, id);
    return x ? `icon-${x.icon}` : id === 'coins' ? 'coin' : id === 'food' ? 'food' : null;
  }
  const shopText = (key, tuning) => statText(SHOP_STAT[key], tuning.shop.per[key]);

  function check(content, family, game = {}) {
    const errors = [], add = e => errors.push(e), L = family.limits;
    const str = (s, min, max) => typeof s === 'string' && s.trim() !== '' && [...s].length >= min && [...s].length <= max;
    const list = k => Array.isArray(content?.[k]) ? content[k] : (add(`${k}: 목록이 필요해요`), []);
    if (typeof content?.about !== 'string' || !content.about.trim()) add('내용 설명이 필요해요');
    const eras = list('eras'), people = list('people'), heroes = list('heroes'), allies = list('allies'), weapons = list('weapons'), relics = list('relics');
    const evos = list('evolutions'), foes = list('foes'), bosses = list('bosses'), battles = list('battles');
    const ids = new Map();
    for (const [k, items] of Object.entries({ eras, people, weapons, relics, evolutions: evos, foes, bosses, battles })) for (const x of items) {
      if (typeof x?.id !== 'string' || !/^[a-z][a-z0-9]*$/.test(x.id)) { add(`${k}: 이름표를 확인해요`); continue; }
      if (ids.has(x.id)) add(`${x.id}: 이름표가 겹쳐요`); else ids.set(x.id, k);
    }
    const kindOf = id => ids.get(id);
    const name = (x, where) => { if (!str(x?.name, 1, L.name)) add(`${where}: 이름은 ${L.name}자 이하여야 해요`); };
    const story = (x, where) => { if (!str(x?.story, L.story[0], L.story[1])) add(`${where}: 이야기는 ${L.story[0]}자에서 ${L.story[1]}자 사이여야 해요`); };
    const slot = (set, v, max, where, what) => { if (!Number.isInteger(v) || v < 0 || v > max) add(`${where}: ${what} 칸은 0에서 ${max} 사이여야 해요`); else if (set.has(v)) add(`${where}: ${what} 칸이 겹쳐요`); else set.add(v); };
    for (const e of eras) name(e, e.id);
    const persons = new Set();
    for (const p of people) { name(p, p.id); story(p, p.id); slot(persons, p.person, 14, p.id, '사람 그림'); if (kindOf(p.era) !== 'eras') add(`${p.id}: 시대를 확인해요`); }
    if (!heroes.some(h => h?.unlock?.stage === 0 && h.unlock.coins === 0)) add('처음부터 쓸 수 있는 주인공이 하나 있어야 해요');
    const heroSet = new Set();
    for (const h of heroes) {
      const where = `주인공 ${h?.person}`;
      if (kindOf(h?.person) !== 'people') add(`${where}: 사람을 확인해요`); else if (heroSet.has(h.person)) add(`${where}: 주인공이 겹쳐요`); else heroSet.add(h.person);
      if (kindOf(h?.weapon) !== 'weapons') add(`${where}: 대표 무기를 확인해요`);
      if (!PERK_STATS.includes(h?.perk?.stat) || !(h.perk.add > 0)) add(`${where}: 덤을 확인해요`);
      const u = h?.unlock; if (!Number.isInteger(u?.stage) || u.stage < 0 || u.stage > 10 || !Number.isInteger(u.coins) || u.coins < 0) add(`${where}: 여는 조건을 확인해요`);
    }
    const allySet = new Set();
    for (const a of allies) {
      const where = `동료 ${a?.person}`;
      if (kindOf(a?.person) !== 'people') add(`${where}: 사람을 확인해요`); else if (allySet.has(a.person)) add(`${where}: 동료가 겹쳐요`); else allySet.add(a.person);
      if (!ALLY_DOES.includes(a?.does)) add(`${where}: 하는 일을 확인해요`);
      if (!Array.isArray(a?.values) || a.values.length !== 5 || a.values.some(v => !(v > 0))) add(`${where}: 단계 값 다섯 개가 필요해요`);
      story(a, where);
    }
    const icons = new Set(), shots = new Set((family.art || []).filter(s => s.slot.startsWith('shot-')).map(s => s.slot));
    const shot = (x, where) => { if (x.shot != null && !shots.has(x.shot)) add(`${where}: 발사체 그림을 확인해요`); };
    const level = (v, where) => { if (!v || LEVEL_KEYS.some(k => !Number.isFinite(v[k])) || !(v.dmg > 0) || !(v.cd > 0) || !Number.isInteger(v.n) || v.n < 1 || !Number.isInteger(v.pierce) || v.pierce < 0 || v.speed < 0 || v.area < 0 || !(v.dur > 0)) add(`${where}: 단계 값을 확인해요`); };
    for (const w of weapons) {
      name(w, w.id); story(w, w.id); slot(icons, w.icon, 33, w.id, '아이콘'); shot(w, w.id);
      if (!WEAPON_KINDS.includes(w.kind)) add(`${w.id}: 무기 종류를 확인해요`);
      if (!str(w.does, 2, L.does)) add(`${w.id}: 하는 일은 ${L.does}자 이하여야 해요`);
      if (!Array.isArray(w.levels) || w.levels.length !== 8) add(`${w.id}: 단계는 8개여야 해요`); else w.levels.forEach((v, i) => level(v, `${w.id} ${i + 1}단계`));
    }
    for (const r of relics) {
      name(r, r.id); story(r, r.id); slot(icons, r.icon, 33, r.id, '아이콘');
      if (!RELIC_STATS.includes(r.stat)) add(`${r.id}: 유물 힘을 확인해요`);
      const p = r.per; if (!(Array.isArray(p) ? p.length >= 1 && p.length <= 5 && p.every((v, i) => v > 0 && (i === 0 || v >= p[i - 1])) : p > 0)) add(`${r.id}: 단계마다 오르는 값을 확인해요`);
    }
    const pairs = new Set();
    for (const e of evos) {
      name(e, e.id); story(e, e.id); slot(icons, e.icon, 33, e.id, '아이콘'); shot(e, e.id); level(e.stats, e.id);
      if (kindOf(e.weapon) !== 'weapons' || kindOf(e.relic) !== 'relics') add(`${e.id}: 진화 짝을 확인해요`);
      else if (pairs.has(e.weapon + '+' + e.relic)) add(`${e.id}: 진화 짝이 겹쳐요`); else pairs.add(e.weapon + '+' + e.relic);
      if (typeof e.real !== 'boolean') add(`${e.id}: 진짜 역사인지 정해 주세요`);
      if (!EVO_KINDS.includes(e.kind)) add(`${e.id}: 진화 종류를 확인해요`);
    }
    const foeSlots = new Set(), bossSlots = new Set(), stat3 = (x, where) => { if (!(x.hp > 0 && x.speed > 0 && x.dmg > 0)) add(`${where}: 체력, 빠르기, 피해를 확인해요`); };
    for (const f of foes) { name(f, f.id); slot(foeSlots, f.sprite, 11, f.id, '적 그림'); stat3(f, f.id); }
    for (const b of bosses) { name(b, b.id); slot(bossSlots, b.sprite, 6, b.id, '보스 그림'); stat3(b, b.id); }
    for (const b of battles) {
      name(b, b.id); story(b, b.id);
      if (!str(b.year, 1, 14)) add(`${b.id}: 때를 확인해요`);
      if (kindOf(b.era) !== 'eras') add(`${b.id}: 시대를 확인해요`);
      if (!Array.isArray(b.foes) || !b.foes.length || b.foes.some(f => kindOf(f) !== 'foes')) add(`${b.id}: 적을 확인해요`);
      if (kindOf(b.boss) !== 'bosses') add(`${b.id}: 보스를 확인해요`);
      if (!GROUNDS.includes(b.ground)) add(`${b.id}: 바닥을 확인해요`);
      if (b.rival != null && kindOf(b.rival) !== 'people') add(`${b.id}: 맞수를 확인해요`);
      if (b.ally != null && !allySet.has(b.ally)) add(`${b.id}: 함께하는 동료를 확인해요`);
    }
    const battleList = (k, n) => { const v = content?.[k]; if (!Array.isArray(v) || (n ? v.length !== n : !v.length) || new Set(v).size !== v.length || v.some(id => kindOf(id) !== 'battles')) add(`${k}: 싸움 목록을 확인해요`); };
    battleList('stages', 10);
    if (game.modeKit) {
      const stages = game.modeKit.stage?.stages;
      if (!Array.isArray(stages) || stages.length !== 10 || game.modeKit.quick || game.modeKit.endless) add('생존 단계 열 개만 필요해요');
      else for (const [i, s] of stages.entries()) {
        if (s.id !== i + 1 || s.goal?.kind !== 'survival' || !(s.timeSec > 0) || s.goal.target !== s.timeSec || !(s.hearts > 0)) add(`${i + 1}단계 생존 시간과 목숨을 확인해요`);
      }
    }
    const bands = content?.bands;
    if (!bands || typeof bands !== 'object') add('문제 묶음이 필요해요');
    else {
      const qids = new Set();
      for (const band of ['a', 'b', 'c']) {
        const items = bands[band];
        if (!Array.isArray(items) || items.length < L.bandMin) add(`${band}: 문제 묶음은 ${L.bandMin}개 이상이어야 해요`);
        if (!Array.isArray(items)) continue;
        for (const q of items) {
          const where = `${band} ${q?.id}`, wrong = Array.isArray(q?.wrong) ? q.wrong : [];
          if (typeof q?.id !== 'string' || !q.id) add(`${band}: 문제 이름표가 필요해요`); else if (qids.has(q.id)) add(`${q.id}: 문제 이름표가 겹쳐요`); else qids.add(q.id);
          if (!str(q?.q, 4, L.q)) add(`${where}: 문제 글은 ${L.q}자 이하여야 해요`);
          if (!str(q?.a, 1, L.a)) add(`${where}: 정답은 ${L.a}자 이하여야 해요`);
          if (wrong.length < 2 || wrong.length > 3 || wrong.some(w => !str(w, 1, L.wrong))) add(`${where}: 틀린 답은 ${L.wrong}자 이하로 두세 개여야 해요`);
          else if (new Set(wrong.map(w => w.trim())).size !== wrong.length || wrong.some(w => w.trim() === String(q.a).trim())) add(`${where}: 보기가 겹쳐요`);
          if (!Array.isArray(q?.topic) || !q.topic.length || q.topic.some(t => !kindOf(t))) add(`${where}: 주제를 확인해요`);
          if (q?.pic != null && !['people', 'weapons', 'relics', 'evolutions'].includes(kindOf(q.pic))) add(`${where}: 그림을 확인해요`);
          if (band === 'a' && kindOf(q?.pic) !== 'people') add(`${where}: 쉬운 문제는 사람 얼굴 그림이 꼭 있어야 해요`);
          if (!str(q?.note, L.note[0], L.note[1])) add(`${where}: 풀이는 ${L.note[0]}자에서 ${L.note[1]}자 사이여야 해요`);
        }
      }
      const mixes = family.tuning.stageMix;
      if (!Array.isArray(mixes) || mixes.length !== 10) add('단계별 문제 비율 열 개가 필요해요');
      for (const [i, mix] of (Array.isArray(mixes) ? mixes : []).entries()) {
        const values = Object.values(mix || {});
        if (!mix || !values.length || Object.keys(mix).some(k => !Object.hasOwn(bands, k))) add(`${i + 1}단계 문제 묶음 비율을 확인해요`);
        if (!values.length || values.some(v => !Number.isFinite(v) || v < 0) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > .001) add(`${i + 1}단계 비율 합은 1이어야 해요`);
      }
    }
    return [...new Set(errors)];
  }
  function checkArt(art) {
    const errors = [], s = art?.slots || {};
    for (const [pre, n] of [['person', 15], ['foe', 12]]) for (let i = 0; i < n; i++) {
      const a = s[`${pre}-${i}-a`], b = s[`${pre}-${i}-b`];
      if (a && b && (a.w !== b.w || a.h !== b.h)) errors.push(`${pre}-${i}: 두 자세의 크기가 같아야 해요`);
    }
    return errors;
  }
  function texts(content) {
    const out = [], push = (...xs) => { for (const x of xs) if (typeof x === 'string' && x) out.push(x); };
    for (const e of content.eras || []) push(e.name);
    for (const p of content.people || []) push(p.name, p.story);
    for (const a of content.allies || []) push(a.story);
    for (const w of content.weapons || []) push(w.name, w.story, w.does);
    for (const r of content.relics || []) push(r.name, r.story);
    for (const e of content.evolutions || []) push(e.name, e.story);
    for (const f of [...(content.foes || []), ...(content.bosses || [])]) push(f.name);
    for (const b of content.battles || []) push(b.name, b.year, b.story);
    for (const q of Object.values(content.bands || {}).flat()) push(q.q, q.a, ...(q.wrong || []), q.note);
    const flat = v => typeof v === 'string' ? push(v.replace('{n}', '0123456789.')) : v && typeof v === 'object' && Object.values(v).forEach(flat);
    flat(T);
    try {
      for (const w of content.weapons || []) for (let l = 2; l <= (w.levels || []).length; l++) push(cardText(content, { kind: 'weapon', id: w.id, level: l }));
      for (const r of content.relics || []) for (let l = 1; l <= 5; l++) push(cardText(content, { kind: 'relic', id: r.id, level: l }));
      for (const a of content.allies || []) for (let l = 2; l <= 5; l++) push(cardText(content, { kind: 'ally', id: a.person, level: l }));
    } catch { /* 모양 오류는 check가 잡는다 */ }
    return out;
  }
  (window.GFFamilies.survivor ||= {}).rules = { rng, xpNeed, crackFactor, levelValue, relicMax, relicValue, allyValue, mixRoll, pickQuestion, topicsFor, chestTopics,
    offers, evolutionFor, evoHint, battleFor, foeStats, bossStats, statsOf, scoreOf, coinsOf, cardText, cardName, picSlot, shopText, statText, SHOP_STAT, fmt, T, SHOP,
    botChoice: (kind, n) => kind === 'right' || kind === 'mix' && n % 5 !== 0, check, checkArt, texts };
})();
