// 와르르 돼지성 놀이 계산. 화면·소리를 모른다. 거리 단위는 층.
(function (root) {
'use strict';
const TM = { LEAP: .05, STUN: .4, INTRO: .75, REST: .9, BOUNCE: .18 };
const FZ = { small: .04, mid: .06, chae: .12, big: .15 };
const DASH = { at: 1.5, warn: .8, drop: 1 }; // 빠른 층: 나오고 1.5초 뒤 한 층 쑥, 0.8초 전에 흔들린다
const TEACH_MAX = 7;
const BOMB_FULL = 7;
const STREAK_STEPS = [5, 10, 15, 20, 30];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
// 채마다 구간: [이 문제까지(15문제 기준), 압박 값, 틈 천장]. 압박 값 = 건물이 한 층 내려오는 시간 ÷ 내 최근 한 문제 시간(1보다 작으면 밀린다)
const PRESS = [[[5, 2, 3], [11, 1.4, 3], [14, 1.05, 2.3]], [[3, 1.05, 2.3], [10, 1, 2.2], [14, .95, 2]], [[3, .95, 2], [10, .92, 1.8], [14, .88, 1.6]]]; // 건물이 바뀌어도 앞 건물 끝 빠르기를 잇는다
const START_GAP = [4, 3.3, 3];
// 둘째 단계부터: 세 채 아홉 구간의 압박 값. 처음은 앞 단계 끝 압박의 70~85%(값이 클수록 느슨하다)
const teeth = v => [[[5, v[0], 3], [11, v[1], 3], [14, v[2], 2.3]], [[3, v[3], 2.3], [10, v[4], 2.2], [14, v[5], 2]], [[3, v[6], 2], [10, v[7], 1.8], [14, v[8], 1.6]]];
const ease = (p, k) => p.map(b => b.map(([q, v, c]) => [q, +(v * k).toFixed(3), c])); // 압박 값을 k배 느슨하게. 2026-11-07 불꽃 이점(1.3층 튕김 · 천장 0.6층)을 빼며 단계마다 400판으로 맞춤
const latePress = (p, cut) => p.map((b, bi) => b.map(([q, v, c], i) => [q, bi || i ? +(v * (1 - cut)).toFixed(5) : v, c])); // 단계 맨 첫 구간만 두고 나머지를 조인다
const HARD = { 0: 0, 1: 0, 2: 1, 5: 1, 3: 2, 4: 3, 6: 4, 9: 4, 7: 5, 8: 5 };
const keyOf = (a, b) => a < b ? `${a}x${b}` : `${b}x${a}`;
const isZero = f => f.a === 0 || f.b === 0;

// 단계 표. 값은 기획서 「단계 표」와 판 4 「바뀐 값」에서 왔다.
const ALL_DANS = [2, 3, 4, 5, 6, 7, 8, 9];
const STAGES = [{
  id: 1, name: '돼지네 집', dans: [2, 5], perB: 24, help: 'always',
  plan: [{ dans: [2], flip: false }, { dans: [5], flip: false }, { dans: [2, 5], flip: true }],
}, {
  id: 2, name: '나무 창고', dans: [3, 6], perB: 22, help: 'always', power: true, press: latePress(ease(teeth([1.05, 1.03, 1, 1, .96, .91, .91, .88, .85]), 1.2), .06), // 첫머리는 앞 단계 끝 압박의 70~85% 안으로
  plan: [{ dans: [3] }, { dans: [6] }, { dans: [3, 6], flip: true }],
}, {
  id: 3, name: '폭탄 창고', dans: [4, 8], perB: 22, help: 'miss2', power: true, bomb: true, press: latePress(ease(teeth([1, .94, .89, .89, .85, .82, .82, .78, .75]), 1.25), .08),
  plan: [{ dans: [4] }, { dans: [8] }, { dans: [4, 8], flip: true }],
}, {
  id: 4, name: '돌 성벽', dans: [7], perB: 16, sameA: 9, sameB: 11, help: 'miss2', power: true, bomb: true, press: latePress(ease(teeth([.94, .88, .83, .83, .79, .77, .77, .73, .7]), 1.22), .0125),
  plan: [{ dans: [7], hard: 5 }, { dans: [7], flip: true, hard: 4 }, { dans: [7], flip: true, hard: 3 }],
}, {
  id: 5, name: '높은 탑', dans: [9], perB: 16, sameA: 9, sameB: 11, help: 'miss2', power: true, bomb: true, press: latePress(ease(teeth([.95, .89, .85, .85, .81, .78, .78, .75, .73]), 1.2), .02),
  plan: [{ dans: [9], dash: 6 }, { dans: [9], flip: true, dash: 4 }, { dans: [9], flip: true, dash: 3 }],
}, {
  id: 6, name: '빈 상자 창고', dans: [1, 0], perB: 20, help: 'miss2', power: true, bomb: true, press: latePress(ease(teeth([1, .9, .83, .83, .77, .73, .73, .7, .66]), 1.2), .062),
  plan: [{ dans: [1] }, { dans: [1, 0], zeroRun: 3 }, { dans: [1, 0], flip: true, zeroRun: 5 }],
}, {
  id: 7, name: '돼지 왕의 성', final: true, dans: ALL_DANS, perB: 46, help: 'none', power: true, bomb: true, healEvery: 15,
  press: ease([[[3, .78, 2.6], [6, .73, 2.2], [10, .7, 2], [13, .67, 1.8], [15, .64, 1.6]]], 1.25),
  plan: [{ dans: ALL_DANS, flip: true, review: true, hard: 8, dash: 11, sprinkle: [[1, 7], [0, 6], [8, 1], [9, 0]] }],
}, {
  id: 8, name: '끝없는 성', endless: true, dans: ALL_DANS, perB: 12, help: 'none', power: true, bomb: true, press: teeth([1.05, 1, .96, .96, .94, .92, .92, .9, .88]),
  plan: [{ dans: [2, 3, 4, 5], flip: true }, { dans: [6, 7, 8, 9], flip: true, hard: 6 }, { dans: ALL_DANS, flip: true, dash: 5 }],
}];
// 단 연습(판 5): 2~9단을 하나씩. 늘 열려 있다. 방 · 곡 · 보기 갈래는 그 단이 든 모험 단계 것(look). 복습 곱 · 빠른 층 · 0 층은 모험에만
const PRAC_PRESS = {
  2: ease(teeth([.78, .73, .68, .68, .64, .61, .61, .58, .55]), 1.3),
  3: latePress(ease(teeth([.92, .86, .8, .8, .76, .73, .73, .7, .67]), 1.3), .105),
  4: latePress(ease(teeth([1, .94, .89, .89, .85, .82, .82, .78, .75]), 1.25), .045),
  7: ease(teeth([.94, .88, .83, .83, .79, .77, .77, .73, .7]), 1.22),
  9: latePress(ease(teeth([.95, .89, .85, .85, .81, .78, .78, .75, .73]), 1.2), .01),
}; // 모험과 연습을 따로 맞춘다. 2 · 5단과 7단은 그대로
PRAC_PRESS[5] = PRAC_PRESS[2]; PRAC_PRESS[6] = PRAC_PRESS[3];
PRAC_PRESS[8] = PRAC_PRESS[4];
const PRACTICE = ALL_DANS.map(d => {
  const home = STAGES.find(st => !st.final && !st.endless && st.dans.includes(d));
  return { id: 10 + d, name: `${d}단`, practice: true, look: home.id, dans: [d], perB: 16, sameA: 9, sameB: 11, help: 'miss2', power: true, bomb: true, press: PRAC_PRESS[d] || home.press,
    plan: [{ dans: [d] }, { dans: [d], flip: true }, { dans: [d], flip: true, hard: 5 }] };
});
STAGES.forEach((st, i) => { if (i && !st.final && !st.endless) st.back = [...new Set(STAGES.slice(Math.max(0, i - 2), i).flatMap(v => v.dans))]; }); // 앞 두 단계의 단을 몇 문제씩 섞는다
const BASE = { hearts: 3, maxGap: 3, hitDown: .5, hitFast: 1.6, fastWrong: .35, T0: 1.8, endlessT: 2.4, pressMul: 1.6, capMul: .9, fallMin: .55, fallMax: 5, sameA: 6, sameB: 8 };
// 처음 연습은 지도 · 열림 · 단계 기록에 들어가지 않는 한 채다.
const FIRST_PRACTICE = { id: 0, name: '처음 연습', firstPractice: true, look: 1, dans: [2], perB: 6, sameA: 1, sameB: 1, help: 'always', press: [[PRESS[0][0]]], plan: [{ dans: [2], flip: false }] };

function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 오답은 잘못 생각한 갈래에서만 뽑는다(지어낸 오답 0)
function wrongOptions(a, b, more = false) {
  const ans = a * b, out = [];
  const add = (v, why) => { if (v > 0 && v !== ans && !out.some(o => o.v === v)) out.push({ v, why }); };
  if (a === 0 || b === 0) { const n = a || b; add(n, '0을 빠뜨림'); add(n * 10, '0을 옆에 붙임'); add(1, '0과 1을 헷갈림'); return out; } // 정답 0은 늘 제일 작은 값이다. 「0을 곱하면 0」을 아는 것이 곧 배움이라 요령으로 치지 않는다
  if (more && (a === 1 || b === 1)) { add(1, '1의 곱을 1로 봄'); if (ans !== 0) out.push({ v: 0, why: '0과 1을 헷갈림' }); } // 둘째 단계부터. 단계 1의 보기는 그대로 둔다
  if (b > 1) add(a * (b - 1), '옆칸아래');
  if (b < 9) add(a * (b + 1), '옆칸위');
  if (a > 1) add((a - 1) * b, '이웃단');
  if (a < 9) add((a + 1) * b, '이웃단');
  add(a + b, '덧셈');
  if (ans >= 10 && ans % 10) add(+String(ans).split('').reverse().join(''), '자리바꿈');
  if (b > 2) add(a * (b - 2), '두칸');
  if (b < 8) add(a * (b + 2), '두칸');
  if (more && b >= 8) add(a * 10, '한 칸 더'); // 큰 곱에도 정답보다 큰 오답이 있어야 「제일 큰 값 고르기」가 안 통한다
  if (more && a === 9) add(10 * b, '이웃단');
  if (ans > 10) add(ans - 10, '십의자리');
  add(ans + 10, '십의자리');
  return out;
}
function makeChoices(a, b, rng, more = false) {
  const ans = a * b, opts = wrongOptions(a, b, more), pairs = [];
  for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) {
    if (opts[i].why.startsWith('옆칸') && opts[j].why.startsWith('옆칸')) continue; // 같이 쓰면 정답이 늘 가운데 값
    pairs.push([opts[i], opts[j]]);
  }
  if (more && rng() < .6) { // 둘째 단계부터는 「10 차이 나는 둘 중 하나」 요령을 줄인다. 단계 1의 보기는 그대로 둔다
    const far = pairs.filter(p => Math.abs(p[0].v - ans) !== 10 && Math.abs(p[1].v - ans) !== 10);
    if (far.length) { pairs.length = 0; pairs.push(...far); }
  }
  // 찍기 요령 막기: 정답 순위(가운데 값)와 무리(5단은 끝자리 0 · 5, 그 밖은 홀짝)로 맞히지 못하게 한다. 오답을 정답과 같은 무리에서 많이 뽑으면 무리로 고르는 요령이 33%에 가까워진다
  const rank = p => (p[0].v < ans) + (p[1].v < ans);
  const kin = v => a === 5 || b === 5 ? v % 5 === 0 : (v - ans) % 2 === 0;
  const same = p => +kin(p[0].v) + +kin(p[1].v);
  const r = rng(), wantSame = r < .02 ? 0 : r < .15 ? 1 : 2, want = Math.floor(rng() * 3);
  const notMid = p => want === 1 || rank(p) !== 1; // 원하는 순위가 없는 곱(2×1처럼)도 정답이 가운데로 쏠리지 않게
  const nearSame = p => Math.abs(same(p) - wantSame) <= 1 && same(p) >= Math.min(1, wantSame);
  let pool = pairs.filter(p => rank(p) === want && same(p) === wantSame);
  if (!pool.length) pool = pairs.filter(p => notMid(p) && same(p) === wantSame);
  if (!pool.length) pool = pairs.filter(p => rank(p) === want && nearSame(p));
  if (!pool.length) pool = pairs.filter(p => notMid(p) && nearSame(p));
  if (!pool.length) pool = pairs.filter(notMid);
  if (!pool.length) pool = pairs;
  const p = pool[Math.floor(rng() * pool.length)];
  const list = [{ v: ans, ok: true, why: '정답' }, { v: p[0].v, ok: false, why: p[0].why }, { v: p[1].v, ok: false, why: p[1].why }];
  for (let i = 2; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

function createSim(o = {}) {
  const stage = o.stage || STAGES[0];
  const cfg = Object.assign({}, BASE, { stageId: stage.id, look: stage.look || stage.id, firstPractice: !!stage.firstPractice, practice: !!stage.practice, dans: stage.dans, perB: stage.perB, plan: stage.plan, buildings: stage.endless ? 1e9 : stage.plan.length, help: stage.help, power: !!stage.power, bomb: !!stage.bomb, final: !!stage.final, endless: !!stage.endless, press: stage.press || PRESS, healEvery: stage.healEvery || 0, backDans: stage.back || [], sameA: stage.sameA || BASE.sameA, sameB: stage.sameB || BASE.sameB, tutorial: !!stage.firstPractice, seed: null, boardWeak: [], missList: [], taught: null, resume: null }, o);
  const rng = rngOf(cfg.seed == null ? Math.random() * 2147483647 : cfg.seed);
  const shuffled = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const s = {
    phase: 'intro', t: 0, introT: 0, floors: [], building: 0, bb: 0, restT: 0, total: cfg.perB * cfg.buildings, broken: 0,
    gap: 6.5, hearts: cfg.hearts, streak: 0, best: 0, score: 0, atk: null, stun: 0, freeze: 0, after: null,
    pendUp: 0, pendDown: 0, nearAt: -99, okAt: -99, okCol: -1, queue: null, heat: 0, cur: null, blocked: [false, false, false], tries: 0, shownAt: 0, tut: cfg.tutorial, T: cfg.T0, segAt: null,
    perf: {}, count: {}, hits: {}, okKeys: {}, wrongList: [], stats: { press: 0, ok: 0, wrong: 0, crush: 0, near: 0, firstPress: null, firstHit: null, seen: [], bombs: 0, dash: 0 }, events: [],
    teach: null, teachT: 0, charge: 0, capBoost: 0, dashAt: null, dashWarned: false, maxGapReached: false, segCapReached: false,
  };
  if (cfg.resume) Object.assign(s, cfg.resume);
  const push = (t, d) => s.events.push(Object.assign({ t }, d));
  function teach(id) { // 새 것은 처음 나올 때 놀이를 멈추고 한 번만 알려 준다. taught가 없으면(봇 판 · ?tut=0) 건너뛴다
    if (!cfg.taught || cfg.taught.includes(id) || s.teach) return;
    cfg.taught.push(id); s.teach = id; s.teachT = 0; push('teach', { id });
  }
  function endTeach() { s.teach = null; s.shownAt = s.t - 1; s.stun = Math.max(s.stun, .3); push('teachEnd', {}); } // 닫는 손이 바로 답이 되거나 찍은 답으로 벌받지 않게
  function dismissTeach() { if (!s.teach) return false; if (s.teachT > .5) endTeach(); return true; }

  // 문제 구성: 쉬운 곱에서 어려운 곱으로. 둘째 채부터 끝 문제는 그 판에서 틀린 곱 → 곱 판에서 남은 곱 → 오래 걸린 곱 → 어려운 곱
  function newFloors() {
    const spec = cfg.plan[cfg.endless ? s.building % cfg.plan.length : Math.min(s.building, cfg.plan.length - 1)], per = cfg.perB, tail = s.building === 0 ? 0 : Math.min(4, per - 1), body = [], plan = {};
    const cnt = k => (s.count[k] || 0) + (plan[k] || 0);
    const add = (a, b) => { const k = keyOf(a, b); if (body.length < per - tail && cnt(k) < cfg.sameA) { plan[k] = (plan[k] || 0) + 1; body.push({ a, b, retry: 0 }); } };
    const facts = [], known = new Set();
    spec.dans.forEach(d => { for (let n = 1; n <= 9; n++) { const k = keyOf(d, n); if (!known.has(k)) { known.add(k); facts.push([d, n]); } } });
    const turn = ([d, n]) => spec.flip && n > 1 && n !== d && rng() < .5 ? [n, d] : [d, n];
    if (spec.review) cfg.missList.slice(0, 14).forEach(([a, b]) => { add(a, b); add(a, b); }); // 앞에서 틀린 곱을 먼저 넣는다
    else if (cfg.backDans.length) { // 건물마다 세 문제는 앞에서 틀린 곱과 앞 단 곱(복습)
      const old = cfg.missList.filter(([a, b]) => !spec.dans.includes(a) && !spec.dans.includes(b)).slice(s.building * 2, s.building * 2 + 2);
      old.forEach(([a, b]) => add(a, b));
      const nums = [3, 4, 6, 7, 8, 9].filter(n => !spec.dans.includes(n));
      const ds = shuffled(cfg.backDans), got = new Set(old.map(([a, b]) => keyOf(a, b))); // 앞 단이 둘뿐이어도 세 곱이 다 다르게
      for (let i = 0; i < 3 - old.length; i++) { const d = ds[i % ds.length], n = shuffled(nums).find(v => !got.has(keyOf(d, v))); if (n != null) { got.add(keyOf(d, n)); add(d, n); } }
    }
    for (let round = 0; round < cfg.sameA && body.length < per - tail; round++) shuffled(facts).forEach(f => { const [a, b] = turn(f); add(a, b); });
    const out = [], seen = new Set();
    const pick = (a, b) => { const k = keyOf(a, b); if (out.length < tail && !seen.has(k) && cnt(k) < cfg.sameB) { seen.add(k); plan[k] = (plan[k] || 0) + 1; out.push({ a, b, retry: 0, tail: true }); } };
    Object.values(s.perf).filter(p => p.wrong > 0).sort((x, y) => y.wrong - x.wrong).forEach(p => pick(p.a, p.b));
    cfg.boardWeak.filter(([d]) => spec.dans.includes(d)).forEach(([d, n]) => pick(d, n));
    Object.values(s.perf).filter(p => p.rt != null).sort((x, y) => y.rt - x.rt).slice(0, 6).forEach(p => pick(p.a, p.b));
    spec.dans.forEach(d => [8, 7, 6, 9, 4, 3].forEach(n => pick(d, n)));
    const sorted = body.map(f => ({ f, w: HARD[f.a] + HARD[f.b] + rng() * 3 })).sort((x, y) => x.w - y.w).map(x => x.f);
    let L = [...sorted, ...out.reverse()]; const last = s.stats.seen.slice(-2).map(v => v.key);
    if (spec.sprinkle) spec.sprinkle.forEach(([a, b], i) => { L[Math.min(L.length - 2, 8 + i * 10)] = { a, b, retry: 0 }; });
    if (spec.zeroRun) { // 0 층은 몇 층씩 잇달아 온다
      const zero = L.filter(isZero), rest = L.filter(f => !isZero(f)); L = [];
      while (zero.length || rest.length) { L.push(...rest.splice(0, 3), ...zero.splice(0, spec.zeroRun)); }
    }
    const key = i => i >= 0 ? keyOf(L[i].a, L[i].b) : last[last.length + i] || null;
    const clash = i => { const q = key(i); return q === key(i - 1) || q === key(i - 2) || (i + 1 < L.length && q === key(i + 1)) || (i + 2 < L.length && q === key(i + 2)); };
    for (let i = 0; i < L.length; i++) { // 같은 곱은 3문제 이상 띄운다
      if (!clash(i)) continue;
      for (let j = L.length - 1; j >= 0; j--) {
        if (j === i) continue;
        [L[i], L[j]] = [L[j], L[i]];
        if (!clash(i) && !clash(j)) break;
        [L[i], L[j]] = [L[j], L[i]];
      }
    }
    const mark = (every, prop) => { let c = every; for (const f of L) { if (--c > 0 || f.hard || isZero(f) || (prop === 'hard' && f.a === f.b)) continue; f[prop] = true; c = every; } };
    if (spec.hard) mark(spec.hard, 'hard');
    if (spec.dash) mark(spec.dash, 'dash');
    return L;
  }
  s.floors = newFloors();
  function seg() { const t = cfg.press[Math.min(s.building, cfg.press.length - 1)], m = cfg.perB / 15; return t.find(q => s.bb <= q[0] * m) || t[t.length - 1]; }
  function fallTime() {
    const c = s.cur, p = c && s.perf[keyOf(c.a, c.b)];
    if (cfg.endless) return clamp(seg()[1] * Math.max(.2, 1 - Math.max(0, s.building - 2) * .07) * cfg.pressMul * cfg.endlessT, cfg.fallMin, cfg.fallMax); // 끝없는 성은 누구나 같은 빠르기(기록을 견줄 수 있게), 건물마다 빨라져 잘하는 손도 끝이 난다
    return clamp(seg()[1] * cfg.pressMul * s.T, cfg.fallMin, cfg.fallMax) * (p && p.wrong > 0 ? 1.25 : 1); // 틀렸던 곱은 틈을 더 준다
  }
  function setFloor() {
    const f = s.floors[0], k = keyOf(f.a, f.b), ans = f.a * f.b, ch = makeChoices(f.a, f.b, rng, cfg.look > 1);
    if (s.tut) { const i = ch.findIndex(c => c.ok); [ch[i], ch[2]] = [ch[2], ch[i]]; } // 첫 층은 손가락이 오른쪽 칸을 가리킨다
    s.cur = { a: f.a, b: f.b, ans, choices: ch };
    s.blocked = [false, false, false]; s.tries = 0; s.shownAt = s.t;
    s.count[k] = (s.count[k] || 0) + 1;
    s.stats.seen.push({ a: f.a, b: f.b, retry: f.retry, at: s.broken, building: s.building, key: k });
    const p = seg();
    if (s.segAt && p[2] < s.segAt[2]) push('squeeze', {});
    s.segAt = p;
    push('floor', { last: s.floors.length === 1, left: s.floors.length, again: f.cracked });
    s.dashAt = f.dash ? s.t + Math.max(DASH.at, s.T * 1.1) : null; s.dashWarned = false; // 그 아이의 빠르기로 피할 수 있게
    if (f.hard) teach('hard');
    else if (f.dash) teach('dash');
    else if (isZero(f)) teach('zero');
  }
  function crackFloor(col) { // 단단한 층: 금이 가고 같은 층에 곱을 뒤집은 문제가 나온다(답은 같다)
    const f = s.floors[0], g0 = s.gap; f.cracked = true; [f.a, f.b] = [f.b, f.a];
    s.gap = Math.max(g0, Math.min(g0 + .5, cfg.maxGap));
    push('crack', { col, streak: s.streak, left: s.floors.length, g0 });
    setFloor();
  }
  function breakFloor(col, tier, edge) {
    const g0 = s.gap, f0 = s.floors[0], kind = f0.hard ? 'panelHard' : f0.dash ? 'panelFast' : undefined;
    s.floors.shift(); s.broken++; s.bb++; s.gap = Math.max(g0, Math.min(g0 + 1, cfg.maxGap)); // 불꽃 왕은 잘한다는 표시일 뿐 건물을 더 밀지 않는다(2026-11-07 대표) s.dashAt = null;
    push('break', { col, tier, streak: s.streak, left: s.floors.length, g0, near: edge.near, kind });
    if (s.tut) { s.tut = false; s.phase = 'play'; push('tutDone', {}); }
    if (!s.floors.length) {
      s.queue = null;
      if (s.building < cfg.buildings - 1) {
        s.building++; s.phase = 'next'; s.restT = 0; s.pendUp = 0; s.pendDown = 0;
        if (s.hearts < cfg.hearts) { s.hearts++; push('heal', { i: s.hearts - 1 }); }
        push('next', { building: s.building }); return;
      }
      s.phase = 'clear'; push('clear', {}); return;
    }
    if (edge.push) s.pendUp = 1; // 아슬아슬하게 맞히면 한 층 더 튕겨 오른다
    if (cfg.healEvery && s.bb % cfg.healEvery === 0 && s.hearts < cfg.hearts) { s.hearts++; push('heal', { i: s.hearts - 1 }); }
    setFloor();
    if (cfg.power && s.streak === 5) teach('power');
    if (cfg.bomb && s.charge === BOMB_FULL) teach('bomb');
  }
  function resolve() {
    const { col, ok } = s.atk; s.atk = null;
    const f = s.floors[0], rt = s.t - TM.LEAP - s.shownAt, k = keyOf(f.a, f.b), p = s.perf[k] || (s.perf[k] = { a: f.a, b: f.b, wrong: 0, rt: null });
    if (ok) {
      const clean = s.tries === 0, tight = s.gap < 1, near = tight && s.t - s.nearAt >= 15; // 아슬아슬 큰 반응은 15초에 한 번
      if (near) s.nearAt = s.t;
      s.stats.ok++;
      if (clean) {
        s.streak++; s.heat = Math.max(0, s.heat - .5); s.best = Math.max(s.best, s.streak);
        if (cfg.bomb) s.charge = Math.min(BOMB_FULL, s.charge + 1);
        s.T = .7 * s.T + .3 * Math.max(.3, rt + TM.LEAP);
        p.rt = rt;
        s.okKeys[k] = 1; // 틀린 곱 기록은 단과 상관없이 곧장 맞힌 곱마다 한 번 준다
        if (cfg.dans.includes(f.a) && f.b > 0) { const h = `${f.a}x${f.b}`; s.hits[h] = Math.min(s.hits[h] ?? 99, rt); }
        if (cfg.dans.includes(f.b) && f.a > 0) { const h = `${f.b}x${f.a}`; s.hits[h] = Math.min(s.hits[h] ?? 99, rt); }
      }
      if (s.stats.firstHit == null) s.stats.firstHit = s.t;
      if (tight) s.stats.near++;
      const speed = clean ? clamp((3 - rt) / 2.2, 0, 1) * .2 : 0;
      const base = !clean ? 0 : f.retry > 0 ? 50 : 100; // 틀린 뒤 고쳐 맞힌 층은 0점, 다시 나온 문제는 절반
      const pts = Math.round(base * Math.min(3, 1 + s.streak / 10) * (1 + speed));
      s.score += pts;
      const crack = f.hard && !f.cracked, last = s.floors.length === 1 && !crack, tier = crack ? 'mid' : last ? (s.building === cfg.buildings - 1 ? 'big' : 'chae') : (clean && STREAK_STEPS.includes(s.streak)) || near ? 'mid' : 'small';
      push('contact', { col, ok: true, streak: s.streak, tier, pts, last, near, q: { a: f.a, b: f.b } });
      const edge = { near, push: s.gap < .7 };
      s.freeze = FZ[tier]; s.after = crack ? () => crackFloor(col) : () => breakFloor(col, tier, edge);
    } else {
      s.streak = 0; if (s.charge < BOMB_FULL) s.charge = 0; s.queue = null; s.blocked[col] = true; s.tries++; s.stats.wrong++; p.wrong++;
      s.wrongList.push({ a: f.a, b: f.b, picked: s.cur.choices[col].v, why: s.cur.choices[col].why });
      const same = s.floors.filter(q => keyOf(q.a, q.b) === k).length - 1;
      if (!cfg.firstPractice && s.tries === 1 && f.retry < 2 && s.floors.length >= 3 && (s.count[k] || 0) + same < cfg.sameB) { // 3~6문제 뒤에 다시, 채움 문제를 대신해 한 채 길이를 지킨다
        const b0 = Math.floor(rng() * 4);
        for (let n = 0; n < 4; n++) {
          const at = Math.min(s.floors.length, 3 + (b0 + n) % 4);
          if ([at - 2, at - 1, at, at + 1].some(i => i >= 1 && s.floors[i] && keyOf(s.floors[i].a, s.floors[i].b) === k)) continue;
          let drop = -1;
          for (let i = s.floors.length - 1; i >= at && drop < 0; i--) if (!s.floors[i].retry && !s.floors[i].tail) drop = i;
          for (let i = s.floors.length - 1; i >= at && drop < 0; i--) if (!s.floors[i].retry) drop = i;
          if (drop < 0) continue;
          s.floors.splice(drop, 1);
          s.floors.splice(Math.min(at, s.floors.length), 0, { a: f.a, b: f.b, retry: f.retry + 1 });
          break;
        }
      }
      if (s.tries === 1) s.heat = Math.min(4, s.heat + 1); // 문제마다 한 번. 잇달아 틀린 문제가 쌓일수록 엉덩방아가 길어진다(아는 손은 거의 안 걸림)
      s.stun = TM.STUN * (1 + Math.max(0, s.heat - 1)); s.pendDown += rt < cfg.fastWrong ? cfg.hitFast : cfg.hitDown; // 찍은 답은 크게, 생각한 답은 작게 내려온다
      push('wrong', { col });
    }
  }
  function pend(dt) {
    if (s.pendUp > 0) { const u = s.pendUp * (1 - Math.exp(-dt * 14)); s.pendUp -= u; s.gap += u; if (s.pendUp < .002) s.pendUp = 0; }
    if (s.pendDown > 0) { const d = s.pendDown * (1 - Math.exp(-dt * 22)); s.pendDown -= d; s.gap -= d; if (s.pendDown < .002) { s.gap -= s.pendDown; s.pendDown = 0; } }
    if (s.gap <= cfg.maxGap) s.maxGapReached = true;
    if (s.maxGapReached && s.gap > cfg.maxGap) s.gap = cfg.maxGap;
  }
  function step(dt) {
    if (s.teach) { s.teachT += dt; if (s.teachT >= TEACH_MAX) endTeach(); return; }
    s.t += dt;
    if (s.phase === 'clear' || s.phase === 'over') return;
    if (s.freeze > 0) { s.freeze -= dt; if (s.freeze <= 0 && s.after) { const f = s.after; s.after = null; f(); } return; }
    if (s.phase === 'next') { // 무너진 뒤 잠깐 쉬고 다음 건물이 떨어진다
      s.restT += dt;
      if (s.restT >= TM.REST) { if (cfg.endless) s.count = {}; s.floors = newFloors(); s.bb = 0; s.segAt = null; s.phase = 'intro'; s.introT = 0; s.gap = 6.5; push('drop', { building: s.building }); }
      return;
    }
    if (s.phase === 'intro') {
      s.introT += dt; const k = Math.min(1, s.introT / TM.INTRO); s.gap = lerp(6.5, START_GAP[Math.min(s.building, 2)] * cfg.capMul, k * k);
      if (k >= 1) { s.maxGapReached = false; s.segCapReached = false; s.phase = s.tut ? 'tutorial' : 'play'; push('land', {}); setFloor(); }
      return;
    }
    if (s.stun > 0) s.stun -= dt;
    if (s.atk) { s.atk.t += dt; if (s.atk.t >= TM.LEAP) { resolve(); if (s.freeze > 0) return; } }
    if (s.queue != null && canPress()) { const q = s.queue; s.queue = null; press(q); } // 빠른 손이 먼저 누른 답을 버리지 않는다
    if (s.phase === 'play') s.gap -= dt / fallTime();
    if (s.dashAt != null && s.phase === 'play') { // 빠른 층: 흔들려 알리고 쑥 내려온다. 그 전에 맞히면 피한다
      if (!s.dashWarned && s.dashAt - s.t <= DASH.warn) { s.dashWarned = true; push('dashWarn', {}); }
      if (s.t >= s.dashAt) { s.dashAt = null; if (s.gap >= 1) { s.pendDown += DASH.drop; s.stats.dash++; push('dash', {}); } } // 이미 위험하면 더 누르지 않는다
    }
    pend(dt);
    if (s.capBoost > 0) s.capBoost = Math.max(0, s.capBoost - dt * .5);
    const cap = seg()[2] * cfg.capMul + s.capBoost;
    if (s.gap <= cap) s.segCapReached = true;
    if (s.segCapReached && s.gap > cap) s.gap -= (s.gap - cap) * (1 - Math.exp(-dt / .09)); // 처음 천장 아래로 내려온 뒤부터, 앞서가면 벤 자리로 내려온다
    if (s.gap <= 0) {
      s.gap = 0; s.pendDown = 0; s.atk = null; s.queue = null; if (!cfg.firstPractice) s.hearts--; s.streak = 0; if (s.charge < BOMB_FULL) s.charge = 0; s.dashAt = null; s.stats.crush++;
      push('crush', { hearts: s.hearts });
      if (s.hearts <= 0) { s.phase = 'over'; push('over', {}); return; }
      s.pendUp = 2; s.stun = Math.max(s.stun, .6); s.freeze = FZ.mid;
    }
  }
  const canPress = () => (s.phase === 'play' || s.phase === 'tutorial') && !s.atk && s.stun <= 0 && s.freeze <= 0 && !s.teach;
  function useBomb() { // 방어 막대를 폭탄으로 그렸다: 7번 이어 맞히면 가득, 쓰면 건물을 두 층 밀어 올리고 빈다
    if (!cfg.bomb || s.charge < BOMB_FULL || s.phase !== 'play' || s.teach || s.freeze > 0) return false;
    s.charge = 0; s.capBoost = 2; s.pendUp += 2; s.pendDown = 0; s.stats.bombs++; s.freeze = FZ.mid; push('bomb', {});
    return true;
  }
  function press(col) {
    if ((s.phase !== 'play' && s.phase !== 'tutorial') || s.teach) return 'idle';
    if (col === s.okCol && s.t - s.okAt < TM.BOUNCE) return 'bounce'; // 맞힌 손이 튕겨 같은 칸을 또 누른 것은 다음 문제의 답으로 치지 않는다
    if (s.phase === 'play' && (s.atk || s.freeze > 0)) { s.queue = col; return 'queued'; }
    if (!canPress()) { push('tick', { col }); return 'lock'; }
    if (s.blocked[col]) { push('tick', { col }); return 'blocked'; }
    const c = s.cur.choices[col];
    if (s.phase === 'tutorial' && !c.ok) { push('tick', { col }); return 'tut'; }
    s.stats.press++; if (s.stats.firstPress == null) s.stats.firstPress = s.t;
    s.atk = { col, t: 0, ok: c.ok };
    if (c.ok) { s.okCol = col; s.okAt = s.t; }
    push('press', { col, ok: c.ok, rt: s.t - s.shownAt });
    return c.ok ? 'ok' : 'wrong';
  }
  return { s, cfg, step, press, canPress, fallTime, seg, useBomb, dismissTeach };
}

// 봇: 판단에 delay초, 정확도 acc. acc가 null이면 아무 데나(연타)
function makeBot(delay, acc, rng) {
  let wait = null;
  return sim => dt => {
    if (acc != null && sim.s.charge >= BOMB_FULL && sim.s.gap < 1.1) sim.useBomb(); // 찍는 손은 폭탄을 안 쓴다
    if (!sim.canPress()) { wait = null; return; }
    if (wait == null) wait = delay * (.75 + rng() * .5);
    wait -= dt; if (wait > 0) return;
    wait = null;
    const s = sim.s, ch = s.cur.choices, right = ch.findIndex(c => c.ok), idx = ch.map((_, i) => i), others = idx.filter(c => c !== right && !s.blocked[c]);
    if (s.phase === 'tutorial') { sim.press(right); return; }
    if (acc == null) { const any = idx.filter(c => !s.blocked[c]); sim.press(any[Math.floor(rng() * any.length)]); return; }
    if (rng() < acc || !others.length) sim.press(right); else sim.press(others[Math.floor(rng() * others.length)]);
  };
}

// 저장: 곱 판은 단마다 9칸. 0 아직 서 있음 · 1 은(부숨) · 2 금(다른 판에서 3초 안에 또). 줄지 않는다. 단계마다 깼는지와 최고 기록, 알려 준 새 것, 틀린 곱 횟수
function cleanSave(raw) {
  const out = { v: 2, tutDone: false, board: {}, best: { floors: 0, streak: 0 }, stages: {}, taught: [], miss: {} };
  if (!raw || typeof raw !== 'object') return out;
  out.tutDone = raw.tutDone === true;
  const b = raw.board && typeof raw.board === 'object' ? raw.board : {};
  for (const d of Object.keys(b)) {
    if (!/^[0-9]$/.test(d) || !b[d] || typeof b[d] !== 'object') continue;
    const row = {};
    for (const n of Object.keys(b[d])) if (/^[1-9]$/.test(n) && (b[d][n] === 1 || b[d][n] === 2)) row[n] = b[d][n];
    out.board[d] = row;
  }
  const num = v => Number.isSafeInteger(v) && v >= 0 ? v : 0;
  if (raw.best && typeof raw.best === 'object') { out.best.floors = num(raw.best.floors); out.best.streak = num(raw.best.streak); }
  const st = raw.stages && typeof raw.stages === 'object' ? raw.stages : {};
  for (const stage of [...STAGES, ...PRACTICE]) { const r = st[stage.id]; if (r && typeof r === 'object') out.stages[stage.id] = { clear: r.clear === true, floors: num(r.floors), streak: num(r.streak) }; }
  if (raw.v !== 2 && out.best.floors > 0) out.stages[1] = { clear: out.best.floors >= STAGES[0].perB * STAGES[0].plan.length, floors: out.best.floors, streak: out.best.streak }; // 옛 저장은 판이 하나뿐이었다
  if (Array.isArray(raw.taught)) out.taught = raw.taught.filter(v => typeof v === 'string').slice(0, 10);
  const miss = raw.miss && typeof raw.miss === 'object' ? raw.miss : {};
  for (const k of Object.keys(miss)) if (/^[0-9]x[0-9]$/.test(k) && num(miss[k]) > 0) out.miss[k] = num(miss[k]);
  return out;
}
const stageOpen = (save, id) => { const i = STAGES.findIndex(v => v.id === id); return i <= 0 || !!(save.stages[STAGES[i - 1].id] && save.stages[STAGES[i - 1].id].clear); };
function applyMiss(save, okKeys, wrongList) { // 곧장 맞힌 곱은 하나 줄고(7×8 · 8×7은 한 곱), 틀린 곱은 하나 는다
  for (const key of new Set(Object.keys(okKeys).map(k => { const [a, b] = k.split('x').map(Number); return keyOf(a, b); }))) if (save.miss[key] > 0) { save.miss[key]--; if (!save.miss[key]) delete save.miss[key]; }
  for (const w of wrongList) { const key = keyOf(w.a, w.b); save.miss[key] = (save.miss[key] || 0) + 1; }
}
function missList(save) { return Object.entries(save.miss).sort((x, y) => y[1] - x[1]).map(([k]) => k.split('x').map(Number)).filter(([a, b]) => a > 1 && b > 1); }
function applyHits(save, hits) {
  const news = [];
  for (const key of Object.keys(hits)) {
    const [d, n] = key.split('x'), row = save.board[d] || (save.board[d] = {}), was = row[n] || 0, now = was === 0 ? 1 : was === 1 && hits[key] <= 3 ? 2 : was;
    if (now > was) { row[n] = now; news.push(key); }
  }
  return news;
}
function boardWeak(save, dans) {
  const list = [];
  dans.forEach(d => { for (let n = 1; n <= 9; n++) { const st = (save.board[d] || {})[n] || 0; if (st < 2) list.push({ d, n, st }); } });
  return list.sort((x, y) => x.st - y.st || HARD[y.n] - HARD[x.n]).map(x => [x.d, x.n]);
}

const api = { TM, FZ, DASH, BOMB_FULL, HARD, STREAK_STEPS, START_GAP, STAGES, PRACTICE, FIRST_PRACTICE, stageOpen, missList, applyMiss, isZero, clamp, lerp, keyOf, rngOf, wrongOptions, makeChoices, createSim, makeBot, cleanSave, applyHits, boardWeak };
root.WreckRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
