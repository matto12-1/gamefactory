(function () {
  'use strict';
  window.GFFamilies = window.GFFamilies || {};
  // 버티기 틀 규칙: 창·문서 없이 도는 순수 함수만 둔다. 난수는 넘겨받은 rnd만 쓴다.
  function rng(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const allyOf = (content, id) => (content.allies || []).find(a => a.person === id) || null;
  const GROUNDS = ['field', 'hill', 'shore', 'snow', 'stone'];
  const WEAPON_KINDS = ['nearest', 'throw', 'swing', 'thrust', 'slash', 'lob', 'ring', 'trap', 'wave', 'spread', 'fan', 'charge', 'bomb', 'mine'];
  const EVO_KINDS = [...WEAPON_KINDS, 'boomerang', 'spin', 'charge', 'thunder', 'mine', 'orbit', 'flood', 'bomb', 'fan', 'crescent', 'stampede', 'rain', 'homing', 'nova', 'beam', 'cluster'];
  const EVO_LIMITS = { crescent: [1, 4], stampede: [3, 5], rain: [1, 24], homing: [1, 6], nova: [8, 16], beam: [1, 1], volley: [3, 5], cluster: [4, 8] };
  const RELIC_STATS = ['might', 'shotSpeed', 'armor', 'move', 'area', 'cd', 'hpPct', 'n', 'regen', 'duration', 'xp', 'heal'];
  const ATTACK_STATS = ['might', 'area', 'cd', 'n'];
  const PERK_STATS = ['might', 'shotSpeed', 'armor', 'move', 'area', 'cd', 'hp', 'xp'];
  // 동료 능력 12가지. 옛 cd(더 자주)는 rally(북소리), pickup(줍기)은 magnet(모아 오기)으로 옮겼다.
  const ALLY_DOES = ['shoot', 'slash', 'dash', 'orbit', 'push', 'guard', 'trap', 'bomb', 'rally', 'magnet', 'feed', 'xp'];
  // 피해를 주는 동료(카드 수치에 이번 판 힘을 곱한다)와, 값이 작을수록 좋은 간격(초) 동료.
  const ALLY_DAMAGE = new Set(['shoot', 'slash', 'dash', 'orbit', 'trap', 'bomb']), ALLY_SECONDS = new Set(['guard', 'magnet']);
  const LEVEL_KEYS = ['dmg', 'cd', 'n', 'pierce', 'speed', 'area', 'dur'];
  // 뒤 넷은 지도 줄이 열려야 산다(tuning.shop.row, 10-21 대표 「새 강화 종류 열기」): 고려 줄에 막기·간격, 조선 줄에 범위·지속.
  const SHOP = ['might', 'hp', 'speed', 'pickup', 'wisdom', 'regen', 'armor', 'cd', 'area', 'duration'];
  const SHOP_STAT = { might: 'might', hp: 'hp', speed: 'move', pickup: 'pickup', wisdom: 'xp', regen: 'regen', armor: 'armor', cd: 'cd', area: 'area', duration: 'duration' };
  const PCT = new Set(['dmg', 'area', 'cd', 'speed', 'dur', 'might', 'shotSpeed', 'move', 'hpPct', 'duration', 'xp', 'pickup', 'heal']);
  // 화면에 나오는 고정 글. {n} 자리에 수가 들어간다. texts()가 모두 도현체·줄표 검사에 넘긴다.
  // 13칸 차례. 칸 번호(1~13)는 이 순서이고 GFModes 별 기록·단계 번호와 같다. eras.js도 이것을 쓴다.
  const CELLS = ['gojoseon', 'goguryeo', 'baekje', 'silla', 'gaya', 'unifiedsilla', 'balhae', 'husamguk', 'goryeo1', 'goryeo2', 'joseon1', 'joseon2', 'joseon3'];
  const T = {
    followName: '시대 따라가기', followText: '나라마다 세 막을 버티고 실제 적장과 맞서요. 깨면 그 시대 인물이 주인공이 돼요', clearedN: '깬 시대 {n} / {n}',
    endlessName: '무한 모드', endlessText: '깬 시대를 돌며 15분을 버텨요. 끝에는 무적의 불가사리가 깨어나요', endlessRank: '오늘의 전국 순위에 올라가요', endlessLock: '시대 셋을 깨면 열려요 ({n} / {n})',
    toHome: '처음 화면', needChain: '앞 칸부터 차례로 열려요', needSome: '{n}개 중 {n}개를 깨면 다음 시대', soon: '곧 열려요', mapLocked: '앞 시대를 깨면 열려요',
    cellGoal: '세 막을 버티고 적장 {n}을 물리쳐요', star1: '적장 물리치기', star2: '문제 {n}% 이상 맞히기', star3: '틀린 답 {n}번 이하', startCell: '출발!', close: '닫기',
    level: '레벨', levelUp: '레벨 {n}!', isNew: '새로!', step: '{n}단계', full: '온전한 힘!', half: '반쪽 힘', cont: '계속', confirm: '확인', fillerCoins: '다 키웠어요! 엽전 +{n}', fillerFood: '다 키웠어요! 떡을 먹었어요',
    halfNote: '틀려서 힘이 반만 들어왔어요. 두루마리 문제를 맞히면 다시 차요', restored: '{n}의 힘이 다시 찼어요',
    hintGain: '단서를 봐서 점수는 없지만 카드는 그대로 받아요', hintResult: '단서를 봐서 이번 문제 점수는 없어요', cracked: '(지금 반쪽)',
    pick: '카드 하나를 골라요', chest: '보물상자!', chestBonus: '다음 카드 강화 +{n}단계', evo: '진화!', real: '역사 속 무기와 전술', imagined: '상상 조합',
    evoNote: '재료를 합치는 방법과 효과는 게임 속 상상이에요', allyNote: '시대를 넘어 돕는 게임 속 동료예요', scoreWord: '점수', generalTag: '적장', deputyTag: '부장', heroTeach: '이번 주인공', hint: '단서 보기', hintHead: '단서', hintNote: '단서를 보고 맞히면 점수는 없어요', bossTeach: '물리친 장수',
    rival: '맞수 출전', pair: '진화 짝', answer: '정답', scroll: '다시 묻는 두루마리', coins: '엽전 +{n}', coinsDoes: '판이 끝나면 받아요',
    food: '떡', foodDoes: '최대 체력의 20%를 채워요', boss: '보스', bossCome: '보스가 나타났어요!', bossDown: '보스를 쓰러뜨렸어요!', eraNext: '다음 시대로!', fell: '쓰러졌어요!',
    deputyCome: '{n} 등장!', generalCome: '적장 {n} 등장!', warn: '{n}의 대군이 몰려와요!', act: '{n}막', bossQ: '장수를 물리쳤어요!', bossGain: '다음 카드 강화!', oxQ: '맞으면 ○, 틀리면 ×', orderQ: '먼저 일어난 일은?',
    ready: '준비', heroes: '주인공', shop: '강화', book: '도감', locked: '잠김', chooseHero: '이 주인공으로', chosen: '고른 주인공',
    buy: '올리기', maxed: '다 올렸어요', needCoins: '엽전이 모자라요', unlockStage: '단계 {n}칸을 깨면 열려요', unlockCell: '{n}을 깨면 열려요', meet: '처음 만났어요!', storyNext: '다음', survived: '버틴 시간', nowAct: '지금', toNext: '다음 막까지', generalNow: '적장과 싸우는 중', loopN: '무한 {n}바퀴', storyGo: '출발!', storySkip: '건너뛰기', oxO: '맞아요', oxX: '아니에요', bossMiss: '덤 레벨업은 다음 장수에서! {n} 이야기를 기억해 둬요', newFacts: '새로 알아낸 사실', heroRule: '처음 가는 시대는 그 시대 주인공으로 떠나요. 깬 시대와 무한 모드에서는 연 주인공 누구든 골라요.', facts: '알아낸 사실 {n} / {n}', factLocked: '이 사람 문제를 맞히면 열려요', unlockCoins: '엽전 {n}개로 열기',
    gotCoins: '받은 엽전 +{n}', heartBack: '하트 하나가 다시 찼어요', coinWord: '엽전', haveCoins: '가진 엽전 {n}',
    failBuy: '지금 엽전으로 강화할 수 있어요! 강화하고 다시 도전해요', failFarm: '져도 엽전이 쌓여요. 깬 시대를 다시 해도 엽전을 모을 수 있어요', failRetry: '져도 엽전이 쌓여요. 모아서 강화하면 더 세져요', newHero: '새로 열린 주인공', firstMet: '처음 만난 것', close: '닫기',
    people: '사람', weapons: '무기', relics: '유물', evolutions: '진화', foes: '적', unknown: '아직 몰라요',
    shopName: { might: '힘', hp: '체력', speed: '빠르기', pickup: '줍기', wisdom: '지혜', regen: '회복', armor: '막기', cd: '간격', area: '범위', duration: '지속' },
    shopLocked: '{n} 줄이 열리면 살 수 있어요', newShop: '새로 열린 강화',
    stat: { dmg: '피해 +{n}%', n: '개수 +{n}', area: '범위 +{n}%', pierce: '뚫기 +{n}', cd: '더 자주 +{n}%', speed: '발사 빠르기 +{n}%', dur: '지속 +{n}%',
      might: '피해 +{n}%', shotSpeed: '발사 빠르기 +{n}%', armor: '받는 피해 -{n}', move: '이동 +{n}%', hpPct: '최대 체력 +{n}%', hp: '체력 +{n}',
      regen: '1분 회복 +{n}', duration: '지속 +{n}%', xp: '경험치 +{n}%', pickup: '줍기 +{n}%', heal: '음식 회복 +{n}%' },
    allyDoes: { shoot: '가까운 적에게 화살을 쏴요', slash: '앞쪽 반원을 함께 베어요', dash: '적이 많은 쪽으로 돌진해요', orbit: '주인공 둘레를 돌며 지켜요',
      push: '둘레 적을 멀리 밀어내요', guard: '한 번 맞는 피해를 막아요', trap: '지나간 자리에 덫을 놓아요', bomb: '적이 몰린 곳에 불 항아리를 던져요',
      rally: '북을 울려 잠깐 빨라지게 해요', magnet: '화면의 구슬을 한꺼번에 모아요', feed: '가끔 음식을 떨어뜨려요', xp: '경험치를 더 받아요' },
    // 5단계 각성: 카드의 「다음에 각성: …」과 각성 띠에 쓴다.
    allyAwaken: { shoot: '화살 셋을 부채꼴로', slash: '한 바퀴 돌려 베기', dash: '돌진 끝에 충격파', orbit: '둘이 마주 보며 돌기',
      push: '밀려난 적이 잠깐 멈춤', guard: '깨질 때 둘레에 피해', trap: '덫이 터지며 둘레 피해', bomb: '항아리 두 개씩',
      rally: '더 길게, 받는 피해 줄임', magnet: '모을 때 경험치 덤', feed: '회복 두 배, 가득 차면 보호막', xp: '레벨업 카드 하나 더' },
    // 인물마다 하나씩 더하는 「이 사람만」 효과(family.json tuning.allyOnly의 kind).
    allyOnly: { quiz: '문제를 맞히면 잠깐 경험치 덤 두 배', coins: '모은 구슬 일부가 엽전으로 바뀌어요', chill: '보호막이 있으면 가까운 적이 느려져요',
      slam: '밀린 적이 벽에 부딪히면 피해', lure: '덫이 둘레 적을 꾀어 모아요', pierce: '화살이 적 하나를 꿰뚫어요', dust: '지나간 길의 흙먼지가 적을 느리게 해요',
      grow: '적을 잡을수록 조금씩 세져요', desperate: '체력이 낮을수록 더 세게 베어요', far: '항아리를 화면 끝까지 던져요', near: '음식이 주인공 바로 곁에 떨어져요',
      band: '북소리가 동료도 빠르게 해요', wind: '벨 때 칼바람이 앞으로 날아가요', reroll: '레벨업 카드를 다시 뽑아요 (한 판 {n}번)', halt: '가끔 화면의 적이 모두 1초 멈춰요',
      volley: '북이 울리면 모든 무기가 바로 공격해요', scatter: '음식이 여러 개 흩어져 떨어져요', haul: '상자와 음식도 끌어와요',
      dragon: '쓰러질 공격을 한 판 {n}번 막아요', stele: '밀칠 때 {n}초간 적을 막는 비석', forge: '구슬 {n}개마다 힘 증가 (열 번까지)',
      calm: '회복하면 둘레 적 화살이 사라져요', strings: '북소리에 물결 {n}갈래로 치고 밀어요', twin: '반대쪽에 {n}개 더 돌아요 (힘 절반)',
      return: '온 길을 되돌아오며 한 번 더 쳐요', fear: '밀린 적이 {n}초 동안 멀리 달아나요', share: '{n}레벨마다 약한 동료가 자라요 ({n}번)',
      layers: '보호막 {n}겹이 차례로 막아 줘요', bounce: '가까운 적에게 화살이 {n}번 이어져요', reach: '막이 바뀔 때마다 베는 범위가 넓어져요',
      split: '작은 항아리 {n}개가 더 떨어져요', order: '모으면 다른 동료가 {n}초 빨리 해요',
      honor: '북이 울리면 약한 동료가 잠깐 각성해요', decoy: '보호막이 깨지면 허수아비가 적을 끌어가요', riders: '양옆에서 기병 둘이 함께 달려요',
      ripen: '오래 놓인 덫일수록 세져요', ambush: '덫 하나가 밟히면 둘레 덫도 터져요', combo: '이어 벨수록 세져요 ({n}번까지)',
      squad: '기병과 스님이 함께 돌며 밀고 늦춰요', ignite: '불이 적에게 옮겨붙어 번져요', helm: '장수를 맞히면 {n}초 동안 더 세게 맞아요',
      unite: '동료가 많을수록 북소리가 세져요', onhit: '주인공이 맞으면 베기가 세져요',
      council: '레벨업 카드가 한 장 더 나와요', forts: '보호막이 막은 쪽에 작은 진이 서요', fourth: '네 번째 돌진마다 두 배로 들이받아요',
      crane: '{n}초마다 학의 날개처럼 펼쳐 쳐요', hold: '멈춰 서 있으면 폭발이 넓어져요', clones: '붉은 옷 분신들이 사방에서 쳐요',
      ring: '{n}초마다 덫을 빙 둘러 놓아요', range: '멀리 있는 적일수록 세게 맞혀요', rampart: '둘레 적이 많을수록 세게 밀어요',
      parade: '레벨업 때 행차 줄이 적을 밀어요' },
    onlyHead: '이 사람만: {n}', awakenNext: '다음에 각성: {n}', awakenNow: '각성: {n}', awakenLeft: '{n}번 더 고르면 각성', awakenBadge: '각성!', awakenBanner: '각성! {n}',
    reroll: '다시 뽑기 {n}번', bulgasari: '불가사리', bulgasariWarn: '불가사리가 깨어난다!',
    bulgasariLore: '쇠를 먹고 자라 무엇으로도 죽일 수 없다는 옛이야기 속 괴물', endlessSurvived: '15분을 버텼어요!'
  };
  // {n} 자리를 차례로 채운다. 값이 모자라면 마지막 값을 되풀이한다.
  // {n} 바로 뒤의 을/를은 넣는 말의 받침을 따라 고른다(고조선을, 신라를, 순체를).
  const batchim = v => { const s = String(v), c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 > 0; };
  const fmt = (t, ...a) => { let i = 0; return t.replace(/{n}(을|를)?/g, (_, j) => { const v = a[Math.min(i++, a.length - 1)]; return j ? v + (batchim(v) ? '을' : '를') : v; }); };
  const statText = (stat, v) => fmt(T.stat[stat], Math.round(v * (PCT.has(stat) ? 100 : stat === 'regen' ? 60 : 1)));

  function xpNeed(level, xp, cell) {
    if (level === 1 && xp.firstNeed?.[cell] != null) return xp.firstNeed[cell];
    const local = xp.cellNeed?.[cell], needs = Array.isArray(local) ? local : xp.needs;
    if (needs) return needs[Math.min(level - 1, needs.length - 1)] * (level > needs.length ? (level / needs.length) ** 2 : 1) * (typeof local === 'number' ? local : 1);
    return (xp.base + xp.step * (level - 1) + Math.floor(xp.square * (level - 1) ** 2)) * (level >= (xp.slowAt ?? Infinity) ? xp.slowScale ?? 1 : 1) * (level >= (xp.softAt ?? Infinity) ? xp.softScale ?? 1 : 1);
  }
  const crackFactor = (level, cracks) => level > 0 && cracks > 0 ? .5 : 1;
  function levelValue(def, level = 1, cracks = 0) {
    const base = def.stats || def.levels[clamp(level, 1, def.levels.length) - 1];
    return { ...base, dmg: base.dmg * crackFactor(def.stats ? 1 : level, cracks) };
  }
  // 카드와 전투가 같은 계산을 쓴다. 화면 반올림은 이 값에 손대지 않는다.
  function weaponStats(content, tuning, own, s) {
    const def = byId(own.evo ? content.evolutions : content.weapons, own.evo || own.id);
    const v = levelValue(def, own.level, own.cracks);
    const n = Math.max(1, (v.n || 1) + s.n), limit = own.evo && (def.kind === 'cluster' && ['caltrop', 'suroe'].includes(def.weapon) ? [4, 16] : EVO_LIMITS[def.kind === 'beam' && def.weapon === 'musket' ? 'volley' : def.kind]);
    return { def, kind: def.kind, shot: def.shot, dmg: v.dmg * s.might * (tuning?.combat?.weaponDamage ?? 1.5), cd: v.cd * s.cd,
      n: limit ? clamp(n, ...limit) : n, pierce: v.pierce || 0, speed: (v.speed || 0) * s.shotSpeed,
      area: (v.area || 0) * s.area, size: v.area > 0 ? 1 : Math.min(2, s.area), dur: (v.dur || 0) * s.duration };
  }
  const relicMax = (relic, limit) => Array.isArray(relic.per) ? relic.per.length : limit.relicMax;
  const relicValue = (relic, level) => level <= 0 ? 0 : Array.isArray(relic.per) ? relic.per[Math.min(level, relic.per.length) - 1] : relic.per * level;
  // 반쪽 힘은 값의 절반. 간격(초) 동료는 반대로 간격이 두 배가 된다.
  const allyValue = (ally, level, cracks = 0) => {
    if (level <= 0) return 0;
    const v = ally.values[clamp(level, 1, ally.values.length) - 1], k = crackFactor(level, cracks);
    return ALLY_SECONDS.has(ally.does) ? v / k : v * k;
  };
  // 동료 카드 칸: 무기처럼 「고른 횟수」 점과, 다음 고르기가 각성인지.
  function allyProgress(level, tuning) {
    const L = tuning.level, step = L.upgradeStep || 1, max = L.allyMax, total = 1 + Math.ceil((max - 1) / step);
    const left = Math.max(0, Math.ceil((max - level) / step)), filled = total - left;
    return { total, left, filled, dots: '●'.repeat(filled) + '○'.repeat(left), awake: level >= max, nextAwake: level < max && left === 1 };
  }
  // 「이 사람만」 글에 넣을 값: 종류마다 쓰는 값이 다르다(카드·도감·검수실이 같이 쓴다).
  const onlyValues = only => !only ? [] : ({ fear: [only.time], share: [only.every, only.n], order: [only.cut], combo: [only.max], helm: [only.time], crane: [only.every], ring: [only.every] }[only.kind] || [only.n ?? only.per ?? only.life ?? '']);
  // 카드·도감에 보이는 동료 글 세 가지: 각성 안내, 「이 사람만」.
  function allyLines(content, tuning, id, level) {
    const a = allyOf(content, id); if (!a) return null;
    const p = allyProgress(level, tuning), only = tuning.allyOnly?.[id], awaken = T.allyAwaken[a.does];
    const values = onlyValues(only);
    const onlyText = only && T.allyOnly[only.kind] ? fmt(T.onlyHead, fmt(T.allyOnly[only.kind], ...values)) : null;
    const awakeText = p.awake ? fmt(T.awakenNow, awaken) : p.nextAwake ? fmt(T.awakenNext, awaken) : fmt(T.awakenLeft, p.left);
    return { progress: p, awaken: awakeText, only: onlyText };
  }

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

  // 시대 꾸러미 문제: 새 무기·새 동료 카드만 문제를 낸다(강화와 유물은 바로 준다).
  const needsQuestion = card => !!card?.isNew && (card.kind === 'weapon' || card.kind === 'ally');
  // pool에서 아직 안 물은 문제를 고른다. hide에 든 것(카드·창에 이름이 보이는 사람·물건)의 이름 묻기는 빼고,
  // prefer에 든 것에 대한 문제를 먼저 고른다. 새 문제가 없으면 그 pool의 물은 기록을 지우고 다시. 돌려준 문제를 asked에 넣는 일은 부르는 쪽.
  // told(q)가 거짓인 문제(아직 게임이 알려 주지 않은 글에서 나온 문제)는 고르지 않는다. prefer는 about이나 from으로 맞춘다.
  function pickEraQuestion(pool, { asked = new Set(), hide = new Set(), prefer = new Set(), rnd, told = () => true, content, art } = {}) {
    const ok = q => !(q.asks === 'name' && hide.has(q.about)) && told(q) && (q.kind !== 'picture' || questionPic(content, art, q));
    const from = list => list.length ? list[Math.floor(rnd() * list.length)] : null;
    const pickFrom = list => from(list.filter(q => prefer.has(q.about) || prefer.has(q.from))) || from(list);
    let fresh = pool.filter(q => ok(q) && !asked.has(q.id));
    if (!fresh.length) { for (const q of pool) if (ok(q)) asked.delete(q.id); fresh = pool.filter(ok); }
    return pickFrom(fresh);
  }
  // 알려 주고 묻기: 문제의 from이 가리키는 꾸러미 글(tools/lib/survivor-era.mjs sourceText와 같은 규칙).
  function sourceText(pack, from) {
    if (from === 'battle') return pack?.battle?.story ?? null;
    const m = /^(story|act|person|boss)[-:]([a-z0-9-]+)$/.exec(String(from || ''));
    if (!m) return null;
    if (m[1] === 'story') return pack?.story?.[+m[2] - 1]?.text ?? null;
    if (m[1] === 'act') return pack?.acts?.[+m[2] - 1] ?? null;
    if (m[1] === 'person') return (pack?.people || []).find(p => p?.id === m[2])?.intro ?? null;
    return [...(pack?.deputies || []), pack?.general].find(b => b?.id === m[2])?.story ?? null;
  }
  // 보기 순서. O·X는 늘 O 먼저, 나머지는 섞는다.
  function questionView(q, rnd) {
    if (q.kind === 'ox') return { layout: 'ox', opts: ['O', 'X'] };
    const opts = [q.a, ...(q.wrong || [])];
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return { layout: q.kind === 'order' ? 'two' : q.kind === 'picture' ? 'picture' : 'three', opts };
  }

  // kit = {weapons:[{id,level,cracks,evo}], relics:[{id,level,cracks}], allies:[{id,level,cracks}]} (동료 id는 사람 id)
  // opt.allow({weapons:Set, relics:Set, allies:Set})가 있으면 그 밖의 새 무기·새 유물·새 동료 카드는 내지 않는다. 가진 것 강화는 그대로.
  // 같은 갈래(line) 무기는 한 판에 하나: 가진 무기와 갈래가 같은 새 무기 카드는 내지 않는다(무한 모드에서 칸이 바뀌어도).
  function sameThing(content, a, b) {
    const relic = card => card.kind === 'relic' ? byId(content.relics, card.id)?.stat : null;
    const does = card => card.kind === 'ally' ? allyOf(content, card.id)?.does : null;
    if (relic(a) && relic(a) === relic(b)) return true;
    if (relic(a) === 'xp' && does(b) === 'xp' || relic(b) === 'xp' && does(a) === 'xp') return true;
    if (a.isNew && b.isNew && a.kind === b.kind) {
      if (a.kind === 'weapon') { const line = byId(content.weapons, a.id)?.line; return !!line && line === byId(content.weapons, b.id)?.line; }
      if (a.kind === 'ally') return !!does(a) && does(a) === does(b);
    }
    return false;
  }
  const isAttackCard = (content, card) => card.kind === 'weapon' && !card.isNew || card.kind === 'relic' && ATTACK_STATS.includes(byId(content.relics, card.id)?.stat);
  const weaponRole = def => def.role || (['slash', 'swing', 'thrust', 'ring', 'charge', 'spin', 'crescent', 'stampede', 'thunder'].includes(def.kind) ? 'melee'
    : ['nearest', 'fan', 'spread', 'throw', 'boomerang', 'homing', 'beam', 'rain', 'orbit'].includes(def.kind) ? 'shot' : 'trap');
  const toughLine = def => def.tough > 1 ? `정예와 장수에게 피해 ×${def.tough}` : null;
  const weaponDescription = def => [def.does, toughLine(def)].filter(Boolean);
  function offerPool(content, tuning, kit, opt = {}) {
    const L = tuning.level, pool = [], own = (list, id) => list.find(x => x.id === id), allow = opt.allow;
    const may = (set, id) => !allow || !set || set.has(id), lines = new Set(kit.weapons.map(o => byId(content.weapons, o.id)?.line).filter(Boolean));
    for (const w of content.weapons) { const o = own(kit.weapons, w.id); if (o) { if (!o.evo && o.level < L.weaponMax) pool.push({ kind: 'weapon', id: w.id, level: o.level + 1, w: 3 }); } else if (kit.weapons.length < L.weaponsMax && may(allow?.weapons, w.id) && !lines.has(w.line)) pool.push({ kind: 'weapon', id: w.id, level: 1, isNew: true, w: 1.5 }); }
    for (const r of content.relics) { const o = own(kit.relics, r.id); if (o) { if (o.level < relicMax(r, L)) pool.push({ kind: 'relic', id: r.id, level: o.level + 1, w: 2 }); } else if (kit.relics.length < L.relicsMax && may(allow?.relics, r.id)) pool.push({ kind: 'relic', id: r.id, level: 1, isNew: true, w: 1 }); }
    // 같은 능력 동료는 한 판에 하나만: 가진 동료와 능력이 같은 다른 동료 카드는 내지 않는다.
    const ownDoes = new Set(kit.allies.map(o => allyOf(content, o.id)?.does).filter(Boolean));
    for (const a of content.allies || []) { const o = own(kit.allies, a.person); if (o) { if (o.level < L.allyMax) pool.push({ kind: 'ally', id: a.person, level: o.level + 1, w: 2 }); } else if (kit.allies.length < L.alliesMax && may(allow?.allies, a.person) && a.person !== opt.hero && !ownDoes.has(a.does)) pool.push({ kind: 'ally', id: a.person, level: opt.rival === a.person ? 2 : 1, isNew: true, w: 1 }); }
    return pool;
  }
  function offers(content, tuning, kit, rnd, opt = {}) {
    const L = tuning.level, pool = offerPool(content, tuning, kit, opt);
    const out = [], forced = new Set(), cards = opt.cards ?? L.cards;
    if (opt.mustAlly && out.length < cards) { const i = pool.findIndex(c => c.kind === 'ally' && c.id === opt.mustAlly); if (i >= 0) { const card = pool.splice(i, 1)[0]; out.push(card); forced.add(card); } }
    // 무기 칸이 찰 때까지 새 무기 카드 하나를 꼭 낸다.
    if (kit.weapons.length < L.weaponsMax && out.length < cards) { const news = pool.filter(c => c.kind === 'weapon' && c.isNew); if (news.length) { const c = news[Math.floor(rnd() * news.length)]; out.push(pool.splice(pool.indexOf(c), 1)[0]); forced.add(c); } }
    const weighted = list => {
      let roll = rnd() * list.reduce((s, c) => s + c.w, 0), i = 0;
      for (; i < list.length - 1; i++) { roll -= list[i].w; if (roll < 0) break; }
      return list[i];
    };
    while (out.length < cards && pool.length) {
      const eligible = pool.filter(c => !out.some(a => sameThing(content, a, c)));
      if (!eligible.length) break;
      const card = weighted(eligible); out.push(pool.splice(pool.indexOf(card), 1)[0]);
    }
    if (out.length < cards) out.push({ kind: 'coins', id: 'coins', level: 0, amount: tuning.coins?.card ?? 20 });
    if (out.length < cards) out.push({ kind: 'food', id: 'food', level: 0 });
    if (!out.some(c => isAttackCard(content, c))) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (forced.has(out[i])) continue;
        const attacks = pool.filter(c => isAttackCard(content, c) && !out.some((a, j) => j !== i && sameThing(content, a, c)));
        if (attacks.length) { out[i] = weighted(attacks); break; }
      }
    }
    return out.map(({ w, ...card }) => {
      const max = card.kind === 'weapon' ? L.weaponMax : card.kind === 'ally' ? L.allyMax : card.kind === 'relic' ? relicMax(byId(content.relics, card.id), L) : 0;
      return max ? { ...card, level: Math.min(max, card.level + (card.isNew ? 0 : (L.upgradeStep ?? 1) - 1) + (opt.boost || 0)) } : card;
    });
  }
  // 표 위쪽이 먼저: 무기가 끝 단계이고 짝 유물이 있으면 그 진화.
  function evolutionFor(content, kit, max = 8) {
    for (const e of content.evolutions || []) {
      const w = kit.weapons.find(x => x.id === e.weapon && !x.evo && x.level >= max);
      if (w && kit.relics.some(r => r.id === e.relic && r.level >= 1)) return e;
    }
    return null;
  }
  function weaponProgress(level, tuning) {
    const L=tuning.level, total=1+Math.ceil((L.weaponMax-1)/(L.upgradeStep || 1));
    const left=Math.max(0,Math.ceil((L.weaponMax-level)/(L.upgradeStep || 1))), filled=total-left;
    return {total,left,filled,dots:'●'.repeat(filled)+'○'.repeat(left)};
  }
  // 카드의 진화 안내: o.allow(이 판 새 카드 거르기)가 있으면 짝 유물을 가졌거나 새 카드로 얻을 수 있는 진화만(묶음 칸은 묶음 밖 유물이 안 나온다).
  // o.relicsMax를 주면 유물 칸이 다 찼을 때 갖지 않은 짝 유물은 새 카드로 못 얻으니 안내하지 않는다.
  const evolutionPath = (content,id,o={}) => (content.evolutions || []).find(e=>e.weapon===id && (o.kit?.relics?.some(r=>r.id===e.relic)
    || (!o.allow?.relics || o.allow.relics.has(e.relic)) && !((o.kit?.relics?.length ?? 0) >= o.relicsMax))) || null;
  const evolutionReady = (content,kit,own,tuning) => !own.evo && own.level>=tuning.level.weaponMax && (content.evolutions || []).some(e=>e.weapon===own.id && kit.relics.some(r=>r.id===e.relic && r.level>=1));
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
    if (o.play === 'endless') {
      const E = tuning.endless, m = Math.max(0, o.minutes || 0);
      const base = tuning.foeKinds[foe.kind] || foe;
      return { hp: Math.max(1, Math.round(base.hp * (1 + E.hpPerMin * m) ** E.hpPower * E.loopHp ** (o.loop || 0) * (o.kind === 'elite' ? f.eliteHp : 1))),
        speed: base.speed * (1 + E.speedPerMin * m), dmg: base.dmg * (tuning.combat?.enemyDamage ?? 1) * (E.damageStart + E.damageCubic * Math.max(0, m - E.damageFromMin) ** 3) };
    }
    const minutes = o.minutes || 0;
    const rampMinutes = Math.min(Math.max(0, minutes - (f.minuteHpFrom ?? 1)), f.minuteHpRampCap ?? Infinity);
    const timeHp = (1 + f.minuteHp * minutes) * (1 + (f.minuteHpRamp || 0) * rampMinutes);
    let hp = foe.hp * (1 + f.tierHp * ((o.tier || 1) - 1)) * timeHp, speed = foe.speed;
    if (o.kind === 'fast') { speed *= f.fastSpeed; hp *= f.fastHp; } else if (o.kind === 'elite') hp *= f.eliteHp;
    hp *= (f.loopHp ?? 1.35) ** (o.loop || 0);
    hp *= f.cellHp?.[o.cell] ?? 1;
    speed *= (f.actSpeed ?? 1.1) ** Math.max(0, (o.act || 1) - 1);
    return { hp: Math.max(1, Math.round(hp)), speed, dmg: foe.dmg * (tuning.combat?.enemyDamage ?? 1) * (1 + (f.actDmg ?? .2) * Math.max(0, (o.act || 1) - 1)) * (f.cellDamage?.[o.cell] ?? 1) };
  }
  function bossStats(boss, o, tuning) {
    const f = tuning.foe;
    const role = tuning.bossRoles?.[boss.role], base = (o.deputyIndex === 1 ? role?.secondHp?.[(o.tier || 1) - 1] : null) ?? role?.cellHp?.[(o.tier || 1) - 1] ?? boss.hp;
    const E = tuning.endless, damageScale = o.play === 'endless' ? E.bossDamageStart + E.bossDamageCubic * Math.max(0, (o.minutes || 0) - E.bossDamageFromMin) ** 3 : 1;
    // 칸마다 장수 피해·체력 배수(boss.cellDamage·cellHp). 새 줄은 처음 들어가면 어렵고 강화해야 깬다(10-20 대표). 무한 모드는 시간으로 따로 오른다.
    const stage = o.play !== 'endless', cellDamage = stage ? tuning.boss?.cellDamage?.[o.cell] ?? 1 : 1, cellHp = stage ? tuning.boss?.cellHp?.[o.cell] ?? 1 : 1;
    return { hp: Math.round(base * (1 + f.tierHp * ((o.tier || 1) - 1)) * (f.loopHp ?? 1.35) ** (o.loop || 0) * cellHp), speed: boss.speed, dmg: boss.dmg * (tuning.combat?.enemyDamage ?? 1) * damageScale * cellDamage };
  }
  // 실제로 살 수 있는 이동 유물·주인공 덤·상점 끝 단계와 북소리의 최고 빠르기를 모두 합친 상한.
  function maxHeroSpeed(content, tuning) {
    const relics = (content.relics || []).filter(r => r.stat === 'move').map(r => relicValue(r, relicMax(r, tuning.level))).sort((a, b) => b - a).slice(0, tuning.level.relicsMax);
    const perk = Math.max(0, ...(content.heroes || []).map(h => h.perk?.stat === 'move' ? h.perk.add : 0));
    const rally = Math.max(0, ...(content.allies || []).filter(a => a.does === 'rally').flatMap(a => a.values));
    return tuning.hero.speed * (1 + relics.reduce((a, b) => a + b, 0) + perk + shopMax('speed', tuning) * tuning.shop.per.speed) * (1 + rally);
  }
  // 유물·동료·주인공 덤·판 사이 강화·기세를 모아 이번 판의 힘을 낸다.
  function statsOf(content, tuning, o = {}) {
    const kit = o.kit || { weapons: [], relics: [], allies: [] }, per = tuning.shop?.per || {}, shop = o.shop || {};
    const s = { might: 1, area: 1, shotSpeed: 1, cd: 1, n: 0, duration: 1, move: 1, hpMax: 0, armor: 0, regen: tuning.hero.regen || 0, pickup: 1, xp: 1, heal: 1 };
    let hp = tuning.hero.hp, hpPct = 0;
    const add = (stat, v) => { if (stat === 'cd') s.cd -= v; else if (stat === 'hpPct') hpPct += v; else if (stat === 'hp') hp += v; else if (stat === 'n') s.n += Math.round(v); else s[stat] += v; };
    for (const own of kit.relics) { const r = byId(content.relics, own.id); if (r) add(r.stat, relicValue(r, own.level) * crackFactor(own.level, own.cracks)); }
    // 동료 가운데 늘 켜져 있는 힘은 배움(xp)뿐이다. 나머지는 allies.js가 판에서 직접 움직인다.
    for (const own of kit.allies) {
      const a = allyOf(content, own.id);
      if (a?.does === 'xp') s.xp += allyValue(a, own.level, own.cracks);
      const only = tuning.allyOnly?.[own.id];
      if (only?.kind === 'forge') s.might += Math.min(only.max, o.forge?.[own.id]?.stacks || 0) * only.add;
    }
    if (o.hero?.perk) add(o.hero.perk.stat, o.hero.perk.add);
    for (const k of SHOP) add(SHOP_STAT[k], (shop[k] || 0) * (per[k] || 0));
    if (o.fever) s.might *= tuning.fever?.dmg || 2;
    s.xp *= tuning.xp.cellGain?.[o.cell] ?? 1;
    s.cd = Math.max(.4, s.cd); s.hpMax = Math.round(hp * (1 + hpPct));
    return s;
  }
  const scoreOf = (o, score) => Math.floor(o.sec || 0) * score.perSec + (o.right || 0) * score.right + (o.chests || 0) * score.chest + (o.bosses || 0) * score.boss;
  // 이번 판에 지금까지 모은 엽전. 게임 중 오른쪽 위 숫자와 판 끝 정산(meta.settle)이 같이 쓴다.
  const coinsNow = (sv, coins) => coinsOf({ sec: sv.t, drops: sv.coinsPicked, chests: sv.chests, bosses: sv.bosses, extra: sv.extraCoins, rival: sv.rival }, coins);
  const coinsOf = (o, coins) => Math.round((Math.floor((o.sec || 0) / 60 * coins.perMin) + (o.drops || 0) + (o.chests || 0) * coins.chest + (o.bosses || 0) * coins.boss + (o.extra || 0)) * (o.rival ? 1 + coins.rivalBonus : 1));

  const numberText = v => String(Math.round(v));
  const COUNT_WORD = { bow: ['화살', '발'], dagger: ['던지는 칼', '개'], sword: ['베기', '번'], spear: ['찌르기', '번'], sling: ['돌', '개'], drum: ['북 울림', '번'], caltrop: ['마름쇠', '개'], wave: ['물결', '개'], cannon: ['포탄', '발'], rocket: ['불화살', '발'],
    crossbow: ['쇠뇌 화살', '발'], gyerim: ['베기', '번'], ringsword: ['베기', '번'], horsespear: ['말 탄 창병', '명'], quiver: ['화살', '발'],
    cheonja: ['큰 화살', '발'], seungja: ['탄환', '발'], musket: ['탄환', '발'], bigyeok: ['포탄', '발'], breech: ['포탄', '발'], flail: ['휘두르기', '번'], suroe: ['폭탄', '개'] };
  const RELIC_WORD = { might: ['무기 피해', '%', '모든 무기의 피해를 늘려요'], shotSpeed: ['탄환 빠르기', '%', '쏜 것이 더 빨리 날아가요'], armor: ['피해 줄이기', '', '맞을 때 피해를 줄여요'], move: ['이동 빠르기', '%', '주인공이 더 빨리 움직여요'], area: ['공격 범위', '%', '모든 무기의 범위를 넓혀요'], cd: ['공격 간격', '%', '모든 무기가 더 자주 공격해요'], hpPct: ['최대 체력', '%', '주인공의 최대 체력을 늘려요'], n: ['추가 공격', '회', '모든 무기가 한 번 더 공격해요'], regen: ['1분 회복', '', '체력이 조금씩 다시 차요'], duration: ['무기 지속', '%', '날아간 무기와 덫이 오래 남아요'],
    xp: ['받는 경험치', '%', '구슬로 얻는 경험치가 늘어요'], heal: ['음식 회복', '%', '음식을 먹으면 체력이 더 많이 차요'] };
  const ALLY_WORD = { shoot: ['화살 피해', ''], slash: ['베기 피해', ''], dash: ['돌진 피해', ''], orbit: ['호위 피해', ''], push: ['밀기 범위', '칸'], guard: ['보호막 간격', '초'],
    trap: ['덫 피해', ''], bomb: ['항아리 피해', ''], rally: ['북소리 빠르기', '%'], magnet: ['모으기 간격', '초'], feed: ['음식 회복', '%'], xp: ['받는 경험치', '%'] };
  const EVO_DOES = { nearest: '가까운 적을 겨눠요', boomerang: '던진 칼이 돌아와요', spin: '둘레를 휩쓸어요', charge: '기병이 앞으로 달려요', lob: '큰 돌이 떨어져 터져요', thunder: '북 울림과 번개로 쳐요', mine: '밟으면 덫이 터져요', orbit: '둘레를 돌며 포탄을 쏴요', flood: '온 화면의 적을 밀어요', bomb: '폭탄이 크게 터져요', fan: '포탄을 넓게 쏴요', spread: '불화살을 함께 쏴요', crescent: '금빛 검기가 날아가 적을 꿰뚫어요', stampede: '기병 떼가 적이 많은 줄을 휩쓸어요', rain: '표시한 원 안에 화살 비가 내려요', homing: '화살이 가까운 적을 쫓아가요', nova: '사방으로 한꺼번에 뻗어요', beam: '화면 끝까지 한 줄로 꿰뚫어요', cluster: '터진 뒤 파편이 다시 터져요' };
  // 판의 유물·동료·주인공 덤까지 넣어 실제 공격 계산과 같은 값으로 비교한다.
  // changes는 시험에서도 쓰는 원래 수치, lines는 카드 한 칸의 두 줄이다.
  function cardDetails(content, card, opt = {}) {
    const key = { weapon: 'weapons', relic: 'relics', ally: 'allies', evolution: 'weapons' }[card.kind];
    if (!key) return { lines: [card.kind === 'coins' ? T.coinsDoes : T.foodDoes], changes: [] };
    const evo = card.kind === 'evolution' ? byId(content.evolutions, card.id) : null;
    const id = evo?.weapon || card.id, own = opt.kit?.[key]?.find(x => x.id === id);
    const first = !!card.isNew || card.level <= 1, level = own?.level ?? (first ? 0 : card.level - 1), cracks = own?.cracks || 0;
    const baseKit = opt.kit || { weapons: [], relics: [], allies: [] };
    const kit = !own && level > 0 ? { ...baseKit, [key]: [...baseKit[key], { id, level, cracks }] } : baseKit;
    const nextKit = { ...kit, [key]: [...kit[key].filter(x => x.id !== id), { id, level: card.level, cracks }] };
    const globals = opt.tuning ? statsOf(content, opt.tuning, { ...opt, kit }) : { might: 1, n: 0, area: 1, cd: 1, shotSpeed: 1, duration: 1 };
    const nextGlobals = opt.tuning ? statsOf(content, opt.tuning, { ...opt, kit: nextKit }) : null;
    const changes = [], change = (stat, label, unit, before, after) => changes.push({ stat, label, unit, before, after, displayScale: stat === 'regen' ? 60 : 1 });
    let intro = '';
    if (card.kind === 'weapon' || evo) {
      const def = byId(content.weapons, id);
      const from = weaponStats(content, opt.tuning, { id, level: evo ? own?.level || def.levels.length : Math.max(1, level), cracks }, globals);
      const to = weaponStats(content, opt.tuning, { id, level: card.level, cracks: evo ? 0 : cracks, evo: evo?.id }, nextGlobals || globals);
      const count = evo ? ({ crescent: ['검기', '줄'], stampede: ['기병', '명'], rain: ['화살', '발'], nova: ['방향', '갈래'], beam: ['사격', '줄'], cluster: ['파편', '개'] }[evo.kind] || COUNT_WORD[id] || ['공격', '회']) : COUNT_WORD[id] || ['공격', '회'];
      // 기병은 달린다. 비·즉시 줄·파편의 이동 시간은 공격 모양이 정하므로
      // 공통 자료의 speed·dur를 실제 빠르기·지속 시간처럼 카드에 쓰지 않는다.
      const fixedTiming = evo && (['rain', 'beam', 'cluster'].includes(evo.kind) || evo.kind === 'nova' && evo.weapon === 'longspear');
      const words = { n: count, dmg: ['피해', ''], cd: ['공격 간격', '초'], area: ['공격 범위', '칸'], pierce: ['뚫는 적', '명'], speed: [['charge', 'stampede'].includes((evo || def).kind) ? '달리는 빠르기' : '날아가는 빠르기', ''], dur: ['무기 지속', '초'] };
      for (const stat of ['n', 'dmg', 'area', 'pierce', 'cd', 'speed', 'dur']) if (to[stat] !== from[stat] && !(stat === 'pierce' && to[stat] >= 99) && !(fixedTiming && (stat === 'speed' || stat === 'dur'))) change(stat, ...words[stat], from[stat], to[stat]);
      if (first && !evo) { changes.length = 0; change('dmg', '피해', '', 0, to.dmg); change('n', ...count, 0, to.n); }
      intro = evo ? `${def.name} + ${byId(content.relics, evo.relic).name}` : def.does;
    } else if (card.kind === 'ally') {
      // 피해 동료는 이번 판 힘을 곱한 한 번 피해, 배움은 실제 받는 경험치, 나머지는 단계 값 그대로(범위 칸·간격 초·%).
      const def = allyOf(content, id), does = def.does, words = ALLY_WORD[does];
      const value = (v, s) => ALLY_DAMAGE.has(does) ? v * globals.might : does === 'xp' ? (s ? s.xp : 1 + v) * 100 : words[1] === '%' ? v * 100 : v;
      change(does, words[0], words[1], value(allyValue(def, level, cracks), opt.tuning ? globals : null), value(allyValue(def, card.level, cracks), nextGlobals));
      intro = T.allyDoes[does];
    } else {
      const def = byId(content.relics, id), stat = def.stat;
      const a = relicValue(def, level) * crackFactor(level, cracks), b = relicValue(def, card.level) * crackFactor(card.level, cracks);
      const words = RELIC_WORD[stat], globalKey = { hpPct: 'hpMax' }[stat] || stat;
      const percent = words[1] === '%';
      const value = (v, s) => s ? s[globalKey] * (percent && stat !== 'hpPct' ? 100 : 1) : percent ? (stat === 'cd' ? 1 - v : 1 + v) * 100 : stat === 'n' ? Math.round(v) : v;
      change(stat, words[0], stat === 'hpPct' && opt.tuning ? '' : words[1], value(a, opt.tuning ? globals : null), value(b, nextGlobals));
      intro = words[2];
    }
    const amount = (c, v) => c.unit === '초' ? String(Math.round(v * 100) / 100) : numberText(v * c.displayScale);
    const line = c => `${c.label} ${amount(c, c.before)}${c.unit} → ${amount(c, c.after)}${c.unit}`;
    const stronger = changes.find(c => c.stat === 'dmg' && c.after > c.before) || changes.find(c => c.stat === 'n' && c.after > c.before) || changes.find(c => c.stat === 'cd' && c.after < c.before) || changes[0];
    const doing = evo?.kind === 'homing' && evo.target === 'strongest' ? '장수와 정예부터, 체력이 큰 적을 쫓아요' : evo?.kind === 'beam' && evo.weapon === 'musket' ? '나란한 여러 줄이 끝까지 꿰뚫어요' : EVO_DOES[evo?.kind];
    let lines = evo ? [intro, `${doing || '더 강하게 공격해요'}, ${line(stronger)}`]
      : first ? [intro, changes.map(c => `${c.label} ${amount(c, c.after)}${c.unit}`).join(', ')] : changes.slice(0, 2).map(line);
    if (cracks && !evo) { if (lines.length === 1) lines.push(T.cracked); else lines[1] += ' ' + T.cracked; }
    const bonus = (card.kind === 'weapon' || evo) && toughLine(evo || byId(content.weapons, id));
    if (bonus) lines.push(bonus);
    return { lines, changes };
  }
  function cardText(content, card, opt) {
    const details = cardDetails(content, card, opt);
    const def = card.kind === 'weapon' ? byId(content.weapons, card.id) : card.kind === 'evolution' ? byId(content.evolutions, card.id) : null;
    if (!(def?.tough > 1)) return details.lines.join('\n');
    // Keep the individual facts for value comparisons; fit the new bonus into the existing two card lines.
    const words = [...details.lines.slice(0, -1).join(' ').split(' '), `정예와 장수 ${def.tough}배`];
    const width = text => [...text].reduce((sum, ch) => sum + (ch === ' ' ? .35 : ch.charCodeAt(0) < 256 ? .6 : 1), 0);
    let split = 1, best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const balance = Math.max(width(words.slice(0, i).join(' ')), width(words.slice(i).join(' ')));
      if (balance < best) { best = balance; split = i; }
    }
    return [words.slice(0, split).join(' '), words.slice(split).join(' ')].join('\n');
  }
  function cardName(content, card) {
    if (card.kind === 'weapon') return byId(content.weapons, card.id).name;
    if (card.kind === 'relic') return byId(content.relics, card.id).name;
    if (card.kind === 'ally') return byId(content.people, card.id).name;
    if (card.kind === 'evolution') return byId(content.evolutions, card.id).name;
    return card.kind === 'coins' ? fmt(T.coins, card.amount) : T.food;
  }
  // 카드·문제 그림 칸 이름: 무기·유물·진화는 아이콘, 사람은 얼굴.
  function picSlot(content, id, art) {
    if (art?.slots?.[slotIn(art, id)]) return slotIn(art, id);
    const p = byId(content.people, id); if (p) return `face-${p.person}`;
    const x = byId(content.weapons, id) || byId(content.relics, id) || byId(content.evolutions, id);
    return x ? `icon-${x.icon}` : id === 'coins' ? 'coin' : id === 'food' ? 'food' : null;
  }
  // 얼굴 그림이 아직 없는 사람(시대 꾸러미 새 인물)은 몸 그림 첫 자세로 대신한다
  const slotIn = (art, slot) => {
    if (!slot || art?.slots?.[slot]) return slot;
    const hashed = Object.keys(art?.slots || {}).find(k => k.replace(/-[a-f0-9]{12}$/, '') === slot);
    if (hashed) return hashed;
    return /^face-\d+$/.test(slot) && art?.slots?.[slot.replace('face', 'person') + '-a'] ? slot.replace('face', 'person') + '-a' : slot;
  };
  const questionPic = (content, art, q) => {
    const slot = slotIn(art, picSlot(content || {}, q.pic, art));
    return slot && art?.slots?.[slot]?.file ? slot : null;
  };
  const shopText = (key, tuning) => statText(SHOP_STAT[key], tuning.shop.per[key]);
  // 강화 한 가지의 끝 단계. 빠르기만 세 단계(한 단계 +8%로 보이고 다 올리면 +25%, 10-21 대표 「8퍼씩 총 25퍼만」), 나머지는 shop.max.
  const shopMax = (key, tuning) => tuning?.shop?.maxOf?.[key] ?? tuning?.shop?.max ?? 5;

  function check(content, family, game = {}) {
    const errors = [], add = e => errors.push(e), L = family.limits;
    const str = (s, min, max) => typeof s === 'string' && s.trim() !== '' && [...s].length >= min && [...s].length <= max;
    const list = k => Array.isArray(content?.[k]) ? content[k] : (add(`${k}: 목록이 필요해요`), []);
    if (typeof content?.about !== 'string' || !content.about.trim()) add('내용 설명이 필요해요');
    // 시대 꾸러미 판(content.map이 있음): 옛 싸움·띠·열 단계 대신 13칸과 무한 모드를 본다. 꾸러미 자체는 tools/check-survivor-eras.mjs가 본다.
    const era = !!content?.map;
    const eras = list('eras'), people = list('people'), heroes = list('heroes'), allies = list('allies'), weapons = list('weapons'), relics = list('relics');
    const evos = list('evolutions'), foes = list('foes'), bosses = list('bosses'), battles = era ? content.battles || [] : list('battles');
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
    for (const p of people) { name(p, p.id); story(p, p.id); slot(persons, p.person, 63, p.id, '사람 그림'); if (kindOf(p.era) !== 'eras') add(`${p.id}: 시대를 확인해요`); }
    if (!era && !heroes.some(h => h?.unlock?.stage === 0 && h.unlock.coins === 0)) add('처음부터 쓸 수 있는 주인공이 하나 있어야 해요');
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
      if (family.tuning?.allyKit && ALLY_DOES.includes(a?.does) && !family.tuning.allyKit[a.does]) add(`${where}: 능력 설정(allyKit)이 필요해요`);
      if (!Array.isArray(a?.values) || a.values.length !== 5 || a.values.some(v => !(v > 0))) add(`${where}: 단계 값 다섯 개가 필요해요`);
      story(a, where);
    }
    const icons = new Set(), shots = new Set((family.art || []).filter(s => s.slot.startsWith('shot-')).map(s => s.slot));
    const shot = (x, where) => { if (x.shot != null && !shots.has(x.shot)) add(`${where}: 발사체 그림을 확인해요`); };
    const level = (v, where) => { if (!v || LEVEL_KEYS.some(k => !Number.isFinite(v[k])) || !(v.dmg > 0) || !(v.cd > 0) || !Number.isInteger(v.n) || v.n < 1 || !Number.isInteger(v.pierce) || v.pierce < 0 || v.speed < 0 || v.area < 0 || !(v.dur > 0)) add(`${where}: 단계 값을 확인해요`); };
    const iconMax = Math.max(33, ...(family.art || []).map(s => /^icon-(\d+)$/.exec(s.slot)?.[1]).filter(Boolean).map(Number));
    for (const w of weapons) {
      name(w, w.id); story(w, w.id); slot(icons, w.icon, iconMax, w.id, '아이콘'); shot(w, w.id);
      if (w.line != null && !/^[a-z][a-z0-9]*$/.test(w.line)) add(`${w.id}: 갈래(line)를 확인해요`);
      if (!WEAPON_KINDS.includes(w.kind)) add(`${w.id}: 무기 종류를 확인해요`);
      if (!str(w.does, 2, L.does)) add(`${w.id}: 하는 일은 ${L.does}자 이하여야 해요`);
      if (!Array.isArray(w.levels) || w.levels.length !== 8) add(`${w.id}: 단계는 8개여야 해요`); else w.levels.forEach((v, i) => level(v, `${w.id} ${i + 1}단계`));
    }
    for (const r of relics) {
      name(r, r.id); story(r, r.id); slot(icons, r.icon, iconMax, r.id, '아이콘');
      if (!RELIC_STATS.includes(r.stat)) add(`${r.id}: 유물 힘을 확인해요`);
      const p = r.per; if (!(Array.isArray(p) ? p.length >= 1 && p.length <= 5 && p.every((v, i) => v > 0 && (i === 0 || v >= p[i - 1])) : p > 0)) add(`${r.id}: 단계마다 오르는 값을 확인해요`);
    }
    const pairs = new Set();
    for (const e of evos) {
      name(e, e.id); story(e, e.id); slot(icons, e.icon, iconMax, e.id, '아이콘'); shot(e, e.id); level(e.stats, e.id);
      if (kindOf(e.weapon) !== 'weapons' || kindOf(e.relic) !== 'relics') add(`${e.id}: 진화 짝을 확인해요`);
      else if (pairs.has(e.weapon + '+' + e.relic)) add(`${e.id}: 진화 짝이 겹쳐요`); else pairs.add(e.weapon + '+' + e.relic);
      if (typeof e.real !== 'boolean') add(`${e.id}: 진짜 역사인지 정해 주세요`);
      if (!EVO_KINDS.includes(e.kind)) add(`${e.id}: 진화 종류를 확인해요`);
    }
    const foeSlots = new Set(), bossSlots = new Set(), stat3 = (x, where) => { if (!(x.hp > 0 && x.speed > 0 && x.dmg > 0)) add(`${where}: 체력, 빠르기, 피해를 확인해요`); };
    for (const f of foes) { name(f, f.id); slot(foeSlots, f.sprite, 63, f.id, '적 그림'); stat3(f, f.id); }
    for (const b of bosses) { name(b, b.id); slot(bossSlots, b.sprite, 63, b.id, '보스 그림'); stat3(b, b.id); }
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
    if (era) {
      const cells = CELLS, stages = game.modeKit?.stage?.stages;
      if (JSON.stringify((content.map.rows || []).flatMap(r => r.eras)) !== JSON.stringify(cells)) add('지도 칸 순서가 13칸 번호와 달라요');
      if (game.modeKit) {
        if (!Array.isArray(stages) || stages.length !== cells.length) add('시대 칸 열세 개가 필요해요');
        else for (const [i, s] of stages.entries()) if (s.id !== i + 1 || s.cell !== cells[i] || s.goal?.kind !== 'general' || !(s.hearts > 0) || !(s.timeSec > 0)) add(`${i + 1}단계 칸·적장 목표·목숨을 확인해요`);
        if (!(game.modeKit.endless?.hearts > 0)) add('무한 모드 목숨이 필요해요');
      }
      return [...new Set(errors)];
    }
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
    const flat = v => typeof v === 'string' ? push(v.replaceAll('{n}', '0123456789.')) : v && typeof v === 'object' && Object.values(v).forEach(flat);
    flat(T); flat(COUNT_WORD); flat(RELIC_WORD); flat(ALLY_WORD); flat(EVO_DOES);
    try {
      for (const w of content.weapons || []) for (let l = 1; l <= (w.levels || []).length; l++) push(cardText(content, { kind: 'weapon', id: w.id, level: l }));
      for (const r of content.relics || []) for (let l = 1; l <= 5; l++) push(cardText(content, { kind: 'relic', id: r.id, level: l }));
      for (const a of content.allies || []) for (let l = 1; l <= 5; l++) push(cardText(content, { kind: 'ally', id: a.person, level: l }));
      for (const e of content.evolutions || []) push(cardText(content, { kind: 'evolution', id: e.id, level: 1 }));
    } catch { /* 모양 오류는 check가 잡는다 */ }
    return out;
  }
  (window.GFFamilies.survivor ||= {}).rules = { rng, xpNeed, crackFactor, levelValue, weaponStats, relicMax, relicValue, allyValue, allyProgress, allyLines, onlyValues, ALLY_DOES, ALLY_DAMAGE, mixRoll, pickQuestion, topicsFor, chestTopics, needsQuestion, pickEraQuestion, sourceText, questionView,
    offers, offerPool, sameThing, isAttackCard, ATTACK_STATS, weaponRole, weaponDescription, toughLine, evolutionFor, evoHint, weaponProgress, evolutionPath, evolutionReady, battleFor, foeStats, bossStats, maxHeroSpeed, statsOf, scoreOf, coinsOf, coinsNow, cardDetails, cardText, cardName, picSlot, questionPic, slotIn, shopText, shopMax, statText, SHOP_STAT, fmt, T, SHOP, CELLS,
    botChoice: (kind, n) => kind === 'right' || kind === 'mix' && n % 2 === 1, check, checkArt, texts };
})();
