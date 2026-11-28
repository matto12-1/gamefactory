// 팔도 장단 마당 식구: 메추리 · 더 오는 구경꾼 · 동네 아이 · 연기. 판정과 점수에는 손대지 않는다
// 그림이 없으면 spr가 그냥 넘어간다
const yard = { quail: null, eggs: [], misses: 0, nextVisit: 0, extraT: [null, null], kidT: [null, null, null, null], smoke: [], smokeKey: null, gagRec: null, beats: null, jumpT: null, fallN: 0, fallen: false };
// 메추리와 알은 낟알 더미와 같은 땅에 선다(아래 글 띠에 가리지 않는다)
const quailY = () => HEAP.y - 2, EGG_X = 172;
const EXTRA_SPEC = [{ x: 116, name: 'spectator3', at: 4 }, { x: 204, name: 'spectator4', at: 8 }];
// 아이들은 담 위로 올라와 가운데 나무 앞에서 뛴다(일꾼과 도리깨에 가리지 않는다)
const KIDS = [{ name: 'kid-a', at: 12, x: 146, y: 110, from: -1, dir: 1 }, { name: 'kid-b', at: 18, x: 176, y: 110, from: 1, dir: -1 }];
// 풍물 곡은 맞힌 수만큼 마당이 찬다: 끝 무렵에는 아이들이 마당까지 들어와 함께 뛴다
const GROUND_KIDS = [{ name: 'kid-b', at: 28, x: 168, y: 170, from: 1, dir: -1 }, { name: 'kid-a', at: 36, x: 192, y: 176, from: -1, dir: 1 }];
// 줄 꼬마(kid-a)가 해에 끌려간 뒤에 담장에 돌아오도록 차례를 바꾼다
const KIDS_PUNG = [{ ...KIDS[0], at: 18 }, { ...KIDS[1], at: 12 }, ...GROUND_KIDS];
const kidsNow = () => (ringOn() ? ringKids() : pung() ? KIDS_PUNG : KIDS); // 강강술래는 담 위 아이 둘만(마당은 원이 돈다)
const crowdCount = () => (pung() ? sc.hits : sc.best);
// 땅에 선 사람과 더미 가운데 가장 아래 끝: 끝 화면의 아래 판이 여기까지 가리지 않게 한다
const lowestFoot = () => (pung() ? Math.max(HERO.y, ...kidsNow().filter((k, i) => yard.kidT[i] !== null).map(kidY)) : HEAP.y) + 2;
// 낮은 화면은 더미처럼 마당 아이도 조금 위에 세운다(끝 화면 아래 판에 발이 가리지 않게)
function kidY(k) { return VH < 120 ? Math.min(k.y, 170) : k.y; }
const leftEdge = () => camX - 14, rightEdge = () => camX + VW + 14;

function yardReset() {
  yard.quail = null; yard.eggs = []; yard.misses = 0; yard.nextVisit = 0; yard.extraT = [null, null]; yard.kidT = [null, null, null, null];
  yard.smoke = []; yard.smokeKey = null; yard.gagRec = null; yard.beats = null; yard.jumpT = null; yard.fallN = 0; yard.fallen = false;
}

// 이어 하기: 이미 온 구경꾼과 아이는 놓쳐도 가지 않는 것과 같이 그대로 둔다
function yardSnapshot() { return { quail: yard.quail && { ...yard.quail }, eggs: yard.eggs.slice(), misses: yard.misses }; }
function yardRestore(s) { yard.quail = s.quail && { ...s.quail }; yard.eggs = s.eggs.slice(); yard.misses = s.misses; yard.fallN = 0; yard.fallen = false; }

// ───────── 메추리 ─────────
// 노랫말 장면: 「메추리란 놈이」에 들어와 「보리밭에」까지 걷고 「알을 낳네」에 알을 낳고 나간다
function quailGag(kind, rec) {
  const q = yard.quail;
  if (q && q.mode !== 'cross') return; // 더미에 와 있으면 노랫말 장면은 건너뛴다
  if (kind === 'in') {
    const x = rightEdge();
    yard.quail = { mode: 'cross', x, dir: -1, vx: -(x - (EGG_X + 10)) / (rec.beat * 8), t: 0 };
  } else if (kind === 'lay' && q) {
    q.mode = 'lay'; q.rec = rec; q.popped = yard.eggs.length > 0;
  }
}
function heapSide() {
  const st = Math.max(1, heapStage()), im = SPRITES[`heap-${st}`];
  return HEAP.x + (im ? Math.floor(im.width / 2) : 14) + 4;
}
// 마당 판(쾌지나) 놓침(그래프 검수 5회차 R1-01): 첫 놓침은 발이 밀리는 소리, 이어 두 번 놓치면 털썩 주저앉고 상쇠 · 장구잡이가 돌아본다.
// 줄 판 엉덩방아와 같은 규칙: 일찍 · 늦게면 다시 세고, 맞힐 때까지 한 번
function yardOops(kind) {
  yard.fallN = kind === 'none' ? yard.fallN + 1 : 0;
  if (!ctx || kind !== 'none') return;
  const t = ctx.currentTime;
  if (yard.fallN < 2 || yard.fallen) { sample('step-soft', t + 0.1, 0.5); return; }
  yard.fallen = true;
  const f = performance.now() / 1000;
  hero.fallT = f; hero.fallDust = false; npc.lookT = f;
  sample('shuffle', t, 0.45); sample('step-soft', t + 0.1, 0.9);
}
function yardMiss(kind) {
  yard.misses++;
  if (!stageSong()) yardOops(kind);
  if (pung()) return;
  const f = performance.now() / 1000, q = yard.quail;
  if (yard.misses < 2 || f < yard.nextVisit) return;
  if (q && (q.mode === 'run' || q.mode === 'peck' || q.mode === 'flee')) return;
  const x = q ? q.x : rightEdge();
  yard.quail = { mode: 'run', x, dir: heapSide() < x ? -1 : 1, t: 0 };
  if (ctx) sample('quail', ctx.currentTime, 0.5);
}
function yardHit() {
  yard.misses = 0; yard.fallN = 0; yard.fallen = false;
  if (pung()) return;
  const q = yard.quail;
  if (!q || (q.mode !== 'run' && q.mode !== 'peck')) return;
  q.dir = q.x > camX + VW / 2 ? 1 : -1;
  q.mode = 'flee'; q.t = 0;
  yard.nextVisit = performance.now() / 1000 + 5;
  for (let i = 0; i < 5; i++) part({ x: q.x, y: quailY() - 8, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.45, c: pick(['#8a6a48', '#f2e6cc']), w: 1, h: 1, grav: 90 });
  if (ctx) { sample('flap', ctx.currentTime, 0.6); sample('quail', ctx.currentTime + 0.04, 0.5, sfx, 1.25); }
}
function stepQuail(dt) {
  const q = yard.quail; if (!q) return;
  q.t += dt;
  if (q.mode === 'cross') q.x = Math.max(EGG_X + 10, q.x + q.vx * dt);
  else if (q.mode === 'lay') {
    const b = (heardNow() - q.rec.t0) / q.rec.beat;
    if (b >= 2 && !q.popped) {
      q.popped = true;
      yard.eggs.push({ x: EGG_X });
      dust(EGG_X, HEAP.y - 1, 1);
      sample('pop', ctx.currentTime, 0.8);
    }
    if (b >= 4) { q.mode = 'leave'; q.t = 0; }
  } else if (q.mode === 'leave') {
    q.x -= 46 * dt;
    if (q.x < leftEdge()) yard.quail = null;
  } else if (q.mode === 'run') {
    const tx = heapSide();
    q.x += q.dir * 130 * dt;
    if ((q.dir < 0 && q.x <= tx) || (q.dir > 0 && q.x >= tx)) { q.x = tx; q.dir = -1; q.mode = 'peck'; q.t = 0; q.down = false; }
  } else if (q.mode === 'peck') {
    const down = Math.floor(q.t / 0.2) % 2 === 1;
    if (down && !q.down) part({ x: q.x - 8, y: quailY() - 4, vx: (Math.random() - 0.5) * 22, vy: -30, life: 0.26, c: pick(GRAIN), w: 1, h: 1, grav: 200 });
    q.down = down;
  } else if (q.mode === 'flee') {
    q.x += q.dir * 230 * dt;
    if (q.x < leftEdge() || q.x > rightEdge()) yard.quail = null;
  }
}
function quailFrame(q) {
  if (q.mode === 'lay') return q.popped ? 'quail-proud' : 'quail-lay';
  if (q.mode === 'peck') return q.down ? 'quail-peck-2' : 'quail-peck-1';
  if (q.mode === 'flee') return Math.floor(q.t / 0.07) % 2 ? 'quail-flee-2' : 'quail-flee-1';
  return Math.floor(q.t / (q.mode === 'run' ? 0.07 : 0.16)) % 2 ? 'quail-walk-2' : 'quail-walk-1';
}
function drawQuail() {
  for (const e of yard.eggs) spr('egg', e.x, HEAP.y - 1);
  const q = yard.quail; if (!q) return;
  const shake = q.mode === 'lay' && !q.popped ? Math.round(Math.sin(q.t * 40) * 0.6) : 0;
  spr(quailFrame(q), q.x + shake, quailY(), q.dir);
}

// ───────── 더 오는 구경꾼 · 동네 아이: 이어 맞힌 수가 쌓이면 오고, 놓쳐도 가지 않는다 ─────────
function stepCrowd(f) {
  if (state !== 'song') return;
  const n = crowdCount();
  let came = false;
  EXTRA_SPEC.forEach((s, i) => { if (yard.extraT[i] === null && n >= s.at) { yard.extraT[i] = f; came = true; } });
  kidsNow().forEach((k, i) => { if (yard.kidT[i] === null && n >= k.at) yard.kidT[i] = f; });
  // 마당 판(쾌지나): 담 뒤 구경꾼 둘이 들어서는 순간 조용한 「와」(줄 판 사람 합류 net-person과 같은 꼴, 그래프 검수 5회차 R1-02). 아이들까지 걸면 한 판 「와」가 11번이라 구경꾼만
  if (came && !stageSong()) wow('yard-guest');
}
function drawExtraSpectators(f, y0, beats, hold, cheering) {
  EXTRA_SPEC.forEach((s, i) => {
    const t = yard.extraT[i]; if (t === null || yard.jumpT !== null) return;
    const rise = Math.round((1 - easeOut(clamp01((f - t) / 0.25))) * 26);
    const hop = cheering ? -Math.round(Math.abs(Math.sin(f * 11 + i)) * 3) : (state === 'song' && !hold && Math.floor(beats + i) % 2 === 0 ? 1 : 0);
    spr(`${s.name}-${cheering ? 'cheer' : 'idle'}`, s.x, y0 + 2 + hop + rise);
  });
}
// 끝 무렵 잔치: 절반 넘게 맞혔으면 담 위 구경꾼이 뛰어내려 마당 뒷줄에서 춤춘다(놓쳐도 돌아가지 않는다)
const DANCE_AT = 17, DANCE_Y = 138;
const DANCERS = [{ who: 0, name: 'spectator', x: 30 }, { who: 1, name: 'spectator2', x: 292 }, { who: 2, name: 'spectator3', x: 110 }, { who: 3, name: 'spectator4', x: 268, y: 164 }];
const dancerOn = d => (d.who < 2 ? true : yard.extraT[d.who - 2] !== null);
function dancersJumped(f) { return yard.jumpT !== null && f >= yard.jumpT; }
function stepDance(f) {
  if (state !== 'song' || yard.jumpT !== null) return;
  const r = bars.length ? currentRec(heardNow()) : null;
  if (r && r.def.dance && sc.hits >= DANCE_AT) yard.jumpT = f;
}
function drawDancers(f, beats, hold) {
  if (yard.jumpT === null) return;
  const y0 = specY();
  DANCERS.forEach((d, i) => {
    if (!dancerOn(d)) return;
    const from = d.who < 2 ? SPEC[d.who].x : EXTRA_SPEC[d.who - 2].x;
    const toY = d.y || DANCE_Y;
    const k = clamp01((f - yard.jumpT - i * 0.12) / 0.5);
    if (k < 1) { // 담에서 뛰어내린다
      spr(`${d.name}-cheer`, from + (d.x - from) * k, y0 + 2 + (toY - y0 - 2) * k - Math.sin(k * Math.PI) * 22, d.x > from ? 1 : -1);
      return;
    }
    const dancing = state === 'end' ? endJoy(i, f) : !hold;
    const phase = beats === null ? f * 2.2 : beats + i * 0.5;
    const up = dancing ? Math.abs(Math.sin(phase * Math.PI)) : 0;
    const flip = dancing && Math.floor(phase) % 2 === 0 ? 1 : -1;
    spr(`${d.name}-${dancing ? 'cheer' : 'idle'}`, d.x, toY - Math.round(up * 4), flip);
  });
}
function drawKids(f, beats, hold) {
  const cheering = fxs.bubbles.some(b => f >= b.t0);
  kidsNow().forEach((k, i) => {
    const t = yard.kidT[i]; if (t === null) return;
    const run = clamp01((f - t) / 0.9);
    if (run < 1) {
      const edge = k.from < 0 ? leftEdge() : rightEdge();
      spr(`${k.name}-run-${Math.floor((f - t) / 0.1) % 2 + 1}`, edge + (k.x - edge) * run, kidY(k), k.dir);
      return;
    }
    const happy = state === 'end' ? endJoy(i, f) : state === 'song' && !hold;
    const phase = beats === null ? f * 2.2 : beats + i;
    const up = happy && Math.floor(phase) % 2 === 0 ? Math.sin((phase % 1) * Math.PI) : 0;
    const pose = cheering ? 'cheer' : up > 0.2 ? 'hop' : 'idle';
    // 뛰는 그림은 이미 발이 떠 있다
    const lift = cheering ? Math.abs(Math.sin(f * 11 + i)) * 7 : up * 3;
    spr(`${k.name}-${pose}`, k.x, kidY(k) - Math.round(lift), k.dir);
  });
}

// ───────── 굴뚝 연기: 박마다 한 번 피어오른다 ─────────
function stepSmoke(dt, f) {
  const m = META.chimney; if (RM || !m || !m.smoke || ringOn()) return; // 바다 원 판에는 굴뚝이 없다
  const key = yard.beats === null ? Math.floor(f / 0.7) : Math.floor(yard.beats);
  if (key !== yard.smokeKey) {
    yard.smokeKey = key;
    yard.smoke.push({ x: m.smoke[0], y: m.smoke[1], age: 0, life: 2.4 + Math.random() * 0.6 });
    if (yard.smoke.length > 7) yard.smoke.shift();
  }
  for (const p of yard.smoke) { p.age += dt; p.y -= 9 * dt; p.x += (3 + Math.sin(p.age * 2) * 3) * dt; }
  yard.smoke = yard.smoke.filter(p => p.age < p.life);
}
// 줄마다 가운데서 좌우로 뻗는 칸 수
const PUFF = { 1: [0, 1, 0], 2: [1, 2, 2, 2, 1], 3: [1, 2, 3, 3, 3, 2, 1] };
function drawSmoke() {
  for (const p of yard.smoke) {
    const x = Math.round(p.x - vx), y = Math.round(p.y - vy), k = p.age / p.life;
    // 커지다가 끝에 잘게 흩어지는 동그란 덩이
    const r = k < 0.15 ? 1 : k < 0.45 ? 2 : k < 0.85 ? 3 : 1;
    PUFF[r].forEach((half, row) => {
      lg.fillStyle = r > 1 && row >= r * 2 - 1 ? '#ddd6c6' : '#f4efe3';
      lg.fillRect(x - half, y - r + row, half * 2 + 1, 1);
    });
  }
}

function stepYard(dt, f) {
  stepQuail(dt);
  stepCrowd(f);
  stepDance(f);
  stepSmoke(dt, f);
}
