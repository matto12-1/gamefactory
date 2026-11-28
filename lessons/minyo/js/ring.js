// 팔도 장단 「강강술래」 판: 손잡은 원을 옆에서 본다. 앞줄은 화면에 선 채 걷고 발밑 모래가 왼쪽으로 흘러 원이 오른쪽으로 도는 것이 보인다
// 원 건너편 뒷줄은 어둡게, 두 배 빠르기로 왼쪽으로 지나간다(앞줄을 따라가는 눈에는 그렇게 보인다). 마디와 박만 보고 그린다. 판정과 점수에는 손대지 않는다
const ringOn = () => !!(song && song.ring);
const wolwolOn = () => !!(song && song.ringArt === 'wolwol');
const WOL_MOON_HIGH = 52;
function wolViewK() {
  const wide=wideK();if((H<=420)||onStartScreen())return wide;
  const want=Math.max(wide,Math.min(baseK,Math.floor(5*DPR)));if(want===wide)return want;
  const height=Math.ceil(CVH/want),bottom=height>190?186+Math.round((height-190)*.35):height>=120?186:182;
  const moon=wolBounds('moon',240,WOL_MOON_HIGH,true);
  return !moon||(moon.top-bottom+height)*(want/DPR)>=16?want:wide;
}

// 바닷가 배경 그림(art/ganggang/sea-bg.png)을 재서 얻은 자리(세계 좌표): 바다 y84~103, 돌담 윗선 y104, 모래 y125부터.
// 바다는 x 40~300 사이(왼쪽 초가, 오른쪽 바위 곶). 달은 화면 넓이와 상관없이 바다 위 moonX에 뜬다
const RING_SEA = { horizon: 84, seaBottom: 103, wallTop: 104, moonX: 246, bottomColor: null };
const RING_GAP = 30; // 이웃과 손이 닿는 간격
// 앞줄: 원의 가까운 쪽이라 가운데가 가장 아래, 양 끝은 조금 위로 굽는다. 뒷줄은 그 반대
// 양 끝이 모여 원으로 읽히게 앞줄 · 뒷줄을 굽힌다. 굽음은 화면 끝쯤에서 멈춘다. 아주 넓은 창에서 뒷줄이 앞줄 아래로 내려오지 않게
const ringBend = x => Math.min(1.1, ((x - 160) / 180) ** 2);
const ringFrontY = x => 170 - Math.round(14 * ringBend(x));
const ringBackY = x => 136 + Math.round(10 * ringBend(x));
const RING_HERO_X = 196;
// 내 꼬마에서 몇 칸 떨어졌나와 누구인가. 앞소리꾼은 셋 왼쪽, 따라 도는 사람은 바로 오른쪽(원이 도는 쪽, 곧 앞사람)
// 폰 가로처럼 아주 넓게 물러나면 세계 밖(-96 ~ 416)까지 보여 양쪽을 더 채운다
// 그보다 바깥(아주 넓은 창)은 셋을 차례로 돌려 끝까지 채운다. 보이지 않는 사람은 그리지 않는다
const RING_CYCLE = ['ring-a', 'ring-b', 'ring-c'];
const RING_FRONT = [...Array.from({ length: 30 }, (_, j) => [j - 40, RING_CYCLE[(40 - j) % 3]]),
  [-10, 'ring-b'], [-9, 'ring-a'], [-8, 'ring-c'], [-7, 'ring-a'], [-6, 'ring-b'], [-5, 'ring-c'], [-4, 'ring-a'], [-2, 'ring-c'], [-1, 'ring-a'],
  [2, 'ring-c'], [3, 'ring-a'], [4, 'ring-b'], [5, 'ring-c'], [6, 'ring-a'], [7, 'ring-b'], [8, 'ring-c'],
  ...Array.from({ length: 32 }, (_, j) => [j + 9, RING_CYCLE[(j + 9) % 3]])]
  .map(([k, name]) => ({ k, name, x: RING_HERO_X + k * RING_GAP }));
RING_FRONT.forEach(p => { p.y = ringFrontY(p.x); });
const RING_BACK = ['ring-a', 'ring-b', 'ring-c', 'ring-b', 'ring-a', 'ring-c', 'ring-b', 'ring-c', 'ring-a'];
const RING_CAST = {
  LEAD: { x: RING_HERO_X - 3 * RING_GAP, y: ringFrontY(RING_HERO_X - 3 * RING_GAP), dir: 1, bx: 2 },
  FOLLOW: { x: RING_HERO_X + RING_GAP, y: ringFrontY(RING_HERO_X + RING_GAP), dir: 1 },
  HERO: { x: RING_HERO_X, y: ringFrontY(RING_HERO_X), dir: 1, bx: 6 },
};
const CAST_HOME = { LEAD: { ...LEAD }, FOLLOW: { ...FOLLOW }, HERO: { ...HERO }, spec: SPEC.map(s => s.x), extra: EXTRA_SPEC.map(s => s.x) };
// 담 위 구경꾼은 달빛 길(x 240~252)을 가리지 않게 왼쪽으로 모인다
const RING_SPEC_X = [52, 212], RING_EXTRA_X = [86, 178];
// 곡을 고르면 놀이 판의 자리를 바꿔 끼운다
function placeCast(s) {
  const on = !!(s && s.ring), isNet = !!(s && s.net), isBoat = !!(s && s.boat), set = isBoat ? s.boatScene?.positions || BOAT_CAST : isNet ? s.netScene?.positions || NET_CAST : on ? RING_CAST : CAST_HOME;
  document.body.classList.toggle('ringSong', stageSong(s)); document.body.classList.toggle('netSong', isNet); document.body.classList.toggle('boatSong', isBoat);
  document.body.classList.toggle('wolSong', s?.ringArt === 'wolwol');
  document.body.classList.toggle('ganggangSong', s?.id === 'ganggang');
  document.body.classList.toggle('riverSong', !!s?.boatScene?.river);
  Object.assign(LEAD, set.LEAD); Object.assign(FOLLOW, set.FOLLOW); Object.assign(HERO, set.HERO);
  SPEC.forEach((p, i) => { p.x = on ? RING_SPEC_X[i] : CAST_HOME.spec[i]; });
  EXTRA_SPEC.forEach((p, i) => { p.x = on ? RING_EXTRA_X[i] : CAST_HOME.extra[i]; });
}
// 아이들은 담 윗선에 올라서서 뛴다. 마당 아이는 원과 겹쳐 오지 않는다
let RING_KIDS = null;
const ringKids = () => (RING_KIDS || (RING_KIDS = KIDS_PUNG.slice(0, 2).map((k, i) => ({ ...k, x: [116, 146][i], y: RING_SEA.wallTop + 1, at: [36, 28][i] }))));

// hop: 이 프레임에 내 꼬마가 뛰어오른 높이(뛰기 · 공중돌기). 받는 말풍선은 따라 오르지 않는다(scene.js RING_HEADROOM)
const ring = { scroll: 0, lastVt: null, dragT: -9, bumpT: -9, pushT: -9, hop: 0, dark: new Map(), fireT: -9, finalT: -9, rims: new Map(), raised: new Map(), crowd:null, crowdInk:new Map(), glowT:-9, glowFrom:0, moonBurstT:-9, backCheerT:-9 };
function ringReset() { ring.scroll = 0; ring.lastVt = null; ring.dragT = -9; ring.bumpT = -9; ring.pushT = -9; ring.hop = 0; ring.fireT = -9; ring.finalT = -9; ring.crowd=null;ring.crowdInk.clear();ring.glowT=ring.moonBurstT=ring.backCheerT=-9;ring.glowFrom=0;ring.embers=[];ring.boostT=-9;ring.sungLayer=0; }
// 같은 담 위 여섯 사람을 한 번에 놓는다. 모든 자세의 잉크와 뛰는 높이를 예약해 이웃과 달빛 길을 비킨다.
function ganggangCrowdInk(family,dir){
  const key=family+'|'+dir;if(ring.crowdInk.has(key))return ring.crowdInk.get(key);
  const boxes=Object.keys(META).filter(n=>(n===family||n.startsWith(family+'-'))&&SPRITES[n]&&!n.includes('-run-')).map(n=>{
    const m=META[n],ink=learnOpaque(SPRITES[n]);return{l:dir<0?m.foot[0]-ink.right:ink.left-m.foot[0],r:dir<0?m.foot[0]-ink.left:ink.right-m.foot[0],t:ink.top-m.foot[1],b:ink.bottom-m.foot[1]};
  });
  const box={l:Math.min(...boxes.map(b=>b.l)),r:Math.max(...boxes.map(b=>b.r)),t:Math.min(...boxes.map(b=>b.t))-(family.startsWith('kid-')?9:6),b:Math.max(...boxes.map(b=>b.b))+2};
  ring.crowdInk.set(key,box);return box;
}
function ganggangCrowdPerson(p,family){
  const dot=K/DPR,baseY=specY()+2;
  const people=[...SPEC.map(s=>({...s,y:baseY,dir:1})),...EXTRA_SPEC.filter((s,i)=>yard.extraT[i]!==null).map(s=>({...s,y:baseY,dir:1})),...ringKids().filter((k,i)=>yard.kidT[i]!==null)];
  const blocks=captionDRingObstacles(),mo=moonPlace(skyStage(currentRec(heardNow()),heardNow()));
  if(mo)blocks.push({x:(mo.x-camX-21)*dot,y:(RING_SEA.horizon-camY)*dot,w:42*dot,h:(RING_SEA.seaBottom-RING_SEA.horizon)*dot});
  const key=[W,H,K,camX,camY,people.map(s=>s.name).join(','),...blocks.flatMap(b=>[b.x,b.y,b.w,b.h].map(Math.round))].join('|');
  if(ring.crowd?.key!==key){
    const placed=new Map(),occupied=[...blocks],gap=4*dot;
    const clear=r=>occupied.every(o=>r.x+r.w<=o.x-gap||r.x>=o.x+o.w+gap||r.y+r.h<=o.y-gap||r.y>=o.y+o.h+gap);
    people.forEach((s,i)=>{
      const ink=ganggangCrowdInk(s.name,s.dir??1),w=(ink.r-ink.l)*dot,h=(ink.b-ink.t)*dot;
      const desiredX=((s.x+ink.l-camX)*dot);
      const footY=((s.y-camY)*dot),y=footY+ink.t*dot;
      const candidates=[desiredX,8,W-w-8,...occupied.flatMap(o=>[o.x-w-gap,o.x+o.w+gap])].map(x=>({x:Math.round(x/dot)*dot,y,w,h})).filter(r=>r.x>=8&&r.x+r.w<=W-8&&r.y>=8&&r.y+r.h<=H-8&&clear(r)).sort((a,b)=>Math.abs(a.x-desiredX)-Math.abs(b.x-desiredX));
      const chosen=candidates[0];
      if(chosen){occupied.push(chosen);placed.set(s.name,{x:camX+chosen.x/dot-ink.l,y:camY+footY/dot,baseY:s.y,rect:chosen});}
      else placed.set(s.name,{x:camX+W/dot+100,y:s.y,baseY:s.y,rect:null});
    });
    ring.crowd={key,people:placed};
  }
  const at=ring.crowd.people.get(family);return at?{...p,x:at.x,y:at.y+p.y-at.baseY}:p;
}
const ganggangVoices = () => (song.id==='ganggang'?song.doubles||[]:[]).filter(d=>sc.hits>=d.at).length;
// 세로 폰에서 모래로 옮긴 구경꾼의 추임새도 그 사람 머리를 따라간다. 빈 말풍선은 띄우지 않는다.

// 틀린 까닭 글. 연습과 노래가 같은 말을 쓴다(「빨라져요」와 헷갈리지 않게 「빨라요」 대신 「일찍」)
// 노래 중에는 1.5초: 중간 대목 칠 자리 사이가 길어야 1.42초라, 같은 실수가 이어지는 동안 글이 꺼졌다 켜지지 않는다
const RING_MISS_SAY = { early: '일찍 쳤어요', late: '늦게 쳤어요', none: '놓쳤어요' }, RING_MISS_DUR = 1.5;
// 카메라: 느린 · 중간 대목은 메길 때만 물러나고, 받는 소리 첫 「강」 0.7초 전에 다가가 뗄 때는 화면이 멈춰 있다. 빠른 대목부터는 끝까지 물러나 있다
// 빠른 대목은 첫 「강」 0.6초 전에 물러나기 시작한다(중간 대목 마지막 「래」를 0.2초 지난 때라 그 판정 폭과 안 겹친다)
function ringWide(r, vt) {
  if (wolwolOn()) return true;
  if (r.def.part >= 3) return true;
  if (r.def.rest) return r.def.part >= 3; // 쉼은 받던 거리, 메기는 마디부터 다시 물러난다
  const nx = songBars[r.def.i + 1], left = barEnd(r) - vt, fastNext = !!nx && nx.part >= 3;
  if (!r.def.call) return fastNext && left < 0.6;
  return fastNext || left > 0.7;
}
// 늦거나 놓치면 앞사람에게 끌려가고 뒷사람이 등에 부딪힌다. 이르면 앞사람 등에 부딪혀 앞사람이 돌아본다
function ringDrag(f) { ring.dragT = f; ring.bumpT = f + 0.1; if (ctx) { sample('shuffle', ctx.currentTime, 0.5); sample('step-soft', ctx.currentTime + 0.3, 0.9); } } // 끌려간 몸이 돌아오는 때 뒷사람이 닿는다
function ringPush(f) { ring.pushT = f; npc.lookT = f; if (ctx) sample('step-soft', ctx.currentTime + 0.02, 0.8); }
// 몸이 밀렸다가 돌아오는 거리(점). t부터 dur초 동안
const ringKick = (t, dur, amp, f) => { const k = (f - t) / dur; return k >= 0 && k < 1 ? Math.round(Math.sin(k * Math.PI) * amp) : 0; };

// ───────── 걸음 시계: 받는 마디는 노랫말 글자마다(강 · 강 · 술 · 래), 메기는 마디는 큰박마다 한 걸음 ─────────
// 맨 앞 마디 · 끝 한 방 · 이어 하기 앞 장구 동안은 서 있는다
function ringStepsOf(r) {
  if (!r || !r.def || r.def.intro || r.def.countIn || r.def.outro) return [];
  if (r.def.call || r.def.rest) return Array.from({ length: barBeats(r.def) }, (_, k) => ({ t: r.t0 + k * r.beat, beat: r.beat, k }));
  if (r.def.clip) return r.def.strikes.map((s, k) => ({ t: r.t0 + s * r.beat, beat: r.beat, k }));
  return [];
}
const ringLift = s => Math.min(0.55, s.beat * 0.45); // 발을 들고 있는 때
const ringStride = s => Math.max(6, Math.min(14, Math.round(16 - 4 * s.beat))); // 한 걸음에 흐르는 모래(점). 느리면 걷고 빠르면 뛴다
const easeInOut = k => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
// 한 그림마다 한 번: 걸음 목록, 지난 걸음과 다음 걸음
function ringFrame(vt, still) {
  const steps = [];
  for (const b of bars) steps.push(...ringStepsOf(b));
  const up = upcomingBar(vt);
  if (up && !bars.includes(up)) steps.push(...ringStepsOf(up));
  steps.sort((a, b) => a.t - b.t);
  let p = null, n = null;
  for (const s of steps) { if (s.t <= vt) p = s; else { n = s; break; } }
  // 땅이 흐르는 만큼: 발을 드는 동안 한 걸음씩 미끄러지고, 딛는 순간 멈춘다. 움직임 줄이기면 땅과 뒷줄은 멈추고 제자리걸음만 한다
  const from = ring.lastVt; ring.lastVt = vt;
  if (!still && !RM && from !== null && vt > from && vt - from < 0.5) {
    for (const s of steps) {
      const L = ringLift(s), a = clamp01((from - (s.t - L)) / L), b = clamp01((vt - (s.t - L)) / L);
      if (b > a) ring.scroll += ringStride(s) * (easeInOut(b) - easeInOut(a));
    }
  }
  const lifted = !still && !!n && n.t - vt < ringLift(n);
  return { steps, p, n, lifted, past: steps.filter(s => s.t <= vt).map(s => s.t), next: n ? n.t : null, lift: n ? ringLift(n) : 0.5,
    planted: !still && !!p && vt - p.t < 0.1, hop: lifted && n.beat < 0.8 ? Math.round(Math.sin(clamp01(1 - (n.t - vt) / ringLift(n)) * Math.PI) * 2) : 0 };
}
// 원 사람 자세: 발을 들면 걸음, 딛으면 섬. 응원 소리가 나면 잡은 손을 번쩍 든다
function ringPose(name, rs, cheer) {
  if (cheer) return `${name}-cheer`;
  if (rs && rs.lifted) return `${name}-step-${rs.n.k % 2 + 1}`;
  return `${name}-stand`;
}

// ───────── 그리기 ─────────
// 그림 한 장을 발 기준으로(spr와 같은 자리 셈, 그림 대신 다른 캔버스를 받는다)
// behind: 원 뒷줄처럼 말풍선 뒤로 지나가는 그림은 자막 D 비키기를 하지 않는다
function sprIm(im, name, x, y, dir = 1, behind = false) {
  if (!im) return;
  if(captionDLive()&&!behind){const p=captionDAvoid({name,pose:name,x,y,dir});x=p.x;y=p.y;}
  if (learnDrawBodies) learnRecordBody(name, x, y, dir);
  const m = META[name], fx = m && m.foot ? m.foot[0] : im.width / 2, fy = m && m.foot ? m.foot[1] : im.height - 1;
  const top = Math.round(y - vy - fy);
  if (dir > 0) { lg.drawImage(im, Math.round(x - vx - fx), top); return; }
  const left = Math.round(x - vx - (im.width - fx));
  lg.setTransform(-1, 0, 0, 1, left + im.width, top); lg.drawImage(im, 0, 0); lg.setTransform(1, 0, 0, 1, 0, 0);
}
// 뒷줄은 같은 그림을 남색으로 어둡게 칠한다(점은 그대로 불투명)
function ringDark(name) {
  const im = SPRITES[name]; if (!im) return null;
  const level=ganggangVoices(),key=name+'|'+level;
  let c = ring.dark.get(key);
  if (c && c.src === im) return c;
  c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.src = im;
  const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0);
  x2.globalCompositeOperation = 'source-atop'; x2.fillStyle = `rgba(38,50,96,${.6-level*.1})`; x2.fillRect(0, 0, c.width, c.height);
  ring.dark.set(key, c);
  return c;
}
// 원 뒷줄(먼 쪽, 어둡게 칠한 사람)은 자막 D에서도 D 전 자리 · 간격 그대로 돈다. 말풍선 · 붙은 안내는 화면 위 글이라
// 늘 캔버스보다 위에 그려지므로 뒷줄은 그 뒤로 지나간다(2026-11-15 결정). 그래서 비키기(captionDAvoid)를 건너뛴다.
// 월월이 받는 소리 겹(곡별 검수 05 재미 F03): 맞힌 수 8에 뒷줄 왼쪽 절반, 20에 뒷줄 모두가 받는 소리를 따라 입을 연다.
// 겹이 붙은 마디에서 놓치면 겹소리가 빠지므로(HAND_LEVELS.miss) 그 마디는 입도 닫는다. 처음 입을 여는 마디에는 머리 위로 음표 점이 0.6초 오른다
function wolBackLayers() {
  if (state !== 'song' || !ctx) return 0;
  const vt = heardNow(), rec = currentRec(vt);
  if (!rec || rec.def.call || rec.def.rest || !rec.def.clip || !notesOn(vt, rec, rec.def.baN)) return 0;
  rec.wolLayers ??= (song.doubles || []).filter(d => sc.hits >= d.at).length; // 겹소리는 마디를 걸 때의 맞힌 수로 붙는다
  if (!rec.wolLayers || targets.some(t => t.rec === rec && t.judged && !Rules.isHit(t.res))) return 0;
  return rec.wolLayers;
}
function wolBackMouth(pose, x, y) {
  const m = META[pose]; if (!m?.mouth || !m.foot) return;
  const [mx, my, mw, mh] = m.mouth; // 뒷줄은 거울로 그린다(sprIm dir -1)
  lg.fillStyle = '#4b2a2a'; lg.fillRect(Math.round(x - vx + m.foot[0] - mx - mw), Math.round(y - vy + my - m.foot[1]), mw, mh + 1);
}
function wolBackNote(pose, x, y) {
  const m = META[pose], im = SPRITES[pose]; if (!m?.foot || !im || RM) return;
  const a = learnOpaque(im), hx = Math.round(x + m.foot[0] - (a.left + a.right) / 2), hy = y - m.foot[1] + a.top - 3;
  part({ x: hx, y: hy, vx: 0, vy: -16, life: .6, c: '#fbf6e6', w: 2, h: 2, grav: 0 });
  part({ x: hx + 1, y: hy - 2, vx: 0, vy: -16, life: .6, c: '#fbf6e6', w: 1, h: 2, grav: 0 });
}
function drawRingBack(f, rs, cheer) {
  if(song.id==='ganggang'&&!RM&&f>=ring.backCheerT&&f-ring.backCheerT<.4)cheer=true;
  if(wolwolOn())ring.backBodies=[];
  const layers = wolwolOn() ? wolBackLayers() : 0, sung = ring.sungLayer || 0, fresh = layers > sung;
  const shift = ring.scroll * 2, n0 = Math.floor(shift / RING_GAP), frac = shift - n0 * RING_GAP;
  const k0 = Math.floor((vx - 40) / RING_GAP), k1 = Math.ceil((vx + VW + 40) / RING_GAP);
  const lift = rs && rs.lifted ? -1 : 0;
  for (let k = k0; k <= k1; k++) {
    const x = k * RING_GAP - frac + 15, idx = k + n0, name = RING_BACK[((idx % RING_BACK.length) + RING_BACK.length) % RING_BACK.length];
    const pose = ringPose(name, rs, wolwolOn() && wolFinalShowing() ? wolRank() >= 3 && (wolRank() >= 4 || k % 2 === 0) : wolwolOn() ? wolCheering(f) : cheer);
    const y = ringBackY(x) + (rs && rs.planted ? 1 : 0) + lift - ((0));
    sprIm(ringDark(pose), pose, x, y, -1, true);
    if (wolwolOn()) {wolRim(pose, x, y, -1, true);ring.backBodies.push({x,y,name,pose,dir:-1,k:`back-${k}`});}
    const left = x - vx < VW / 2;
    if (layers >= 2 || layers === 1 && left) { wolBackMouth(pose, x, y); if (fresh && (sung === 0 && (layers === 2 || left) || sung === 1 && !left)) wolBackNote(pose, x, y); }
  }
  if (fresh) ring.sungLayer = layers;
}
// 앞줄 원 사람(앞소리꾼 · 따라 도는 사람 · 내 꼬마는 draw가 따로 그린다)
function drawRingFront(f, vt, rs, rec, still, hop) {
  if(wolwolOn())ring.frontBodies=[];
  const cheering = wolwolOn() ? wolCheering(f) : fxs.bubbles.some(b => f >= b.t0);
  const sing = !!(rec && !(rec.opts && rec.opts.noBa) && notesOn(vt, rec, rec.def.baN));
  const hold = still && rec && rec.def.finale;
  RING_FRONT.forEach((p, i) => {
    if (p.x < vx - 40 || p.x > vx + VW + 40) return;
    const cheer = wolwolOn() && wolFinalShowing() ? wolJoy(p.k) : state === 'end' ? endJoy(i, f) : cheering || hold;
    let pose = ringPose(p.name, still ? null : rs, cheer), x = p.x;
    // 내 꼬마 바로 뒷사람: 내가 늦으면 등에 부딪혀 휘청한다
    if (p.k === -1 && f - ring.bumpT >= 0 && f - ring.bumpT < 0.5) { pose = `${p.name}-bump`; x += ringKick(ring.bumpT, 0.5, 8, f); }
    const y = p.y + (rs && rs.planted ? 1 : 0) - (rs ? rs.hop : 0) - hop;
    spr(pose, x, y);
    // 몸 목록은 spr가 비킨 자리로(테두리 빛은 sprIm이 같은 셈으로 비킨다)
    const at = captionDLive() ? captionDAvoid({ name: pose, pose, x, y, dir: 1 }) : { x, y };
    if (wolwolOn()) {wolRim(pose, x, y);ring.frontBodies.push({...p,x:at.x,y:at.y,pose});}
    if (sing && !pose.endsWith('-bump')) mouth(pose, { x, y: p.y, dir: 1 }, y);
  });
}
// 모래 자국: 원이 돌면 왼쪽으로 흐른다. 같은 땅이라 앞줄 발밑이든 원 건너편이든 같은 빠르기
const SAND_MARKS = (() => {
  const list = []; let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const fore = i < 16; // 앞줄 발 아래: 사람에 안 가려져 원이 도는 빠르기가 바로 보인다
    const y = fore ? 173 + Math.floor(rnd() * 12) : 129 + Math.floor(rnd() * 50);
    list.push({ x: rnd() * WORLD_W, y, w: fore ? 3 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2) + Math.floor((y - 129) / 18), shell: !fore && rnd() < 0.22, fore });
  }
  return list;
})();
function drawSand() {
  for (const m of SAND_MARKS) {
    if (m.y - vy < 0 || m.y - vy >= VH) continue;
    const base = ((m.x - ring.scroll) % WORLD_W + WORLD_W) % WORLD_W;
    for (let x = base - WORLD_W; x < vx + VW + 4; x += WORLD_W) {
      if (x < vx - 6) continue;
      const sx = Math.round(x - vx), sy = Math.round(m.y - vy);
      if (m.shell) { lg.fillStyle = 'rgba(255,250,236,0.55)'; lg.fillRect(sx, sy, 2, 1); }
      else { lg.fillStyle = m.fore ? 'rgba(96,70,40,0.32)' : 'rgba(96,70,40,0.2)'; lg.fillRect(sx, sy, m.w + 1, 1); lg.fillStyle = m.fore ? 'rgba(255,246,220,0.45)' : 'rgba(255,246,220,0.28)'; lg.fillRect(sx, sy - 1, m.w, 1); }
    }
  }
}
// 달빛 길: 달이 바다 위로 오르면 생기고, 맞힐수록 길고 밝아진다(구경꾼이 오는 수에 맞춤)
const RING_GLOW_AT = [0, 4, 8, 12, 18, 28, 36];
const ringGlow = () => { let l = 0; RING_GLOW_AT.forEach((v, k) => { if (sc.hits >= v) l = k; }); return sc.hits > 0 ? l : 0; };
function ganggangMoonHalo(mo,alpha){
  const im=SPRITES.moon;if(!im)return;
  if(ring.moonHalo?.im!==im){
    const c=document.createElement('canvas');c.width=im.width+4;c.height=im.height+4;
    const x=c.getContext('2d');x.drawImage(im,2,2);const src=x.getImageData(0,0,c.width,c.height),out=x.createImageData(c.width,c.height);
    for(let y=2;y<c.height-2;y++)for(let px=2;px<c.width-2;px++)if(src.data[(y*c.width+px)*4+3]){
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5){const at=((y+dy)*c.width+px+dx)*4;if(!src.data[at+3])out.data.set([255,251,226,255],at);}
    }
    x.clearRect(0,0,c.width,c.height);x.putImageData(out,0,0);ring.moonHalo={im,c};
  }
  // 하늘의 달은 발 기준 spr가 아니라 48점 그림의 가운데로 그린다(sky.js drawSkyProps와 같은 자리).
  lg.save();lg.globalAlpha=alpha;lg.drawImage(ring.moonHalo.c,Math.round(mo.x-vx)-26,Math.round(mo.y-vy)-26);lg.restore();
}
function drawMoonPath(st, f) {
  const mo = moonPlace(st); if (!mo) return;
  const rise = clamp01((RING_SEA.horizon + 20 - mo.y) / 26); if (rise <= 0) return;
  // 맞힌 수 단마다 한 줄 길어지고 한 점 넓어진다. 끝까지 맞혀야 바다 끝(9줄)에 닿는다
  const lv = ringGlow(),age=f-ring.glowT,burstAge=f-ring.moonBurstT,burst=!RM&&burstAge>=0&&burstAge<1.2?Math.sin(Math.PI*burstAge/1.2):0;
  const growing=!RM&&age>=0&&age<.5,rows=Math.round((burst?9:3+lv)*rise),shimmer=RM?0:Math.floor(f*3);
  if(growing&&age<.3)ganggangMoonHalo(mo,.8*(1-age/.3));
  for (let i = 0; i < rows; i++) {
    const y = RING_SEA.horizon + 1 + i * 2; if (y >= RING_SEA.seaBottom) break;
    const w = Math.round((3 + Math.floor(i * 0.8) + lv)*(1+burst)), jit = ((shimmer + i) % 3) - 1;
    const newRow=i>=3+ring.glowFrom&&i<=3+ring.glowFrom+Math.floor(age/.5*Math.max(1,lv-ring.glowFrom));
    lg.fillStyle = burst||growing&&newRow ? '#fffbe2' : (i + shimmer) % 4 === 0 ? '#fffbe2' : lv >= 4 ? '#f6ebbd' : '#e4dbb4';
    lg.fillRect(Math.round(mo.x - vx - w / 2 + jit), Math.round(y - vy), w, 1);
  }
}
// 바닷가 배경 층: 하늘을 지운 그림에 무대 색을 덮는다. 바뀐 때만 다시 합친다
const seaCv = document.createElement('canvas'); seaCv.width = WORLD_W; seaCv.height = WORLD_H;
const seaG = seaCv.getContext('2d');
let seaKey = '';
function seaLayer(tint) {
  const im = SPRITES['sea-bg'], key = `${tint}`;
  if (seaCv.src !== im || seaKey !== key) {
    seaCv.src = im; seaKey = key;
    seaG.clearRect(0, 0, WORLD_W, WORLD_H); seaG.drawImage(skyless(im), 0, 0);
    if (tint) { seaG.globalCompositeOperation = 'source-atop'; seaG.fillStyle = tint; seaG.fillRect(0, 0, WORLD_W, WORLD_H); seaG.globalCompositeOperation = 'source-over'; }
  }
  return seaCv;
}
// 배경 그림 맨 아랫줄 색: 폰 세로에서 그림 아래 땅을 같은 색으로 잇는다
function ringGround() {
  const im = SPRITES['sea-bg'];
  if (!im) return GROUND;
  if (RING_SEA.bottomColor && RING_SEA.bottomColor.src === im) return RING_SEA.bottomColor.c;
  let c = GROUND;
  try { const t = document.createElement('canvas'); t.width = 1; t.height = 1; const x2 = t.getContext('2d'); x2.drawImage(im, 4, im.height - 1, 1, 1, 0, 0, 1, 1); const d = x2.getImageData(0, 0, 1, 1).data; c = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) {}
  RING_SEA.bottomColor = { src: im, c };
  return c;
}

// ───────── 효과 ─────────
const SAND = ['#efe2b8', '#dccb98', '#c7b07a'];
function sandKick(x, y, n) { // 발 구르기: 모래알이 튀고 먼지가 핀다
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = 22 + Math.random() * 40;
    part({ x: x + (Math.random() - 0.5) * 10, y: y - 1, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.28 + Math.random() * 0.25, c: pick(SAND), w: 1, h: 1, grav: 260 });
  }
  dust(x, y, 2);
}
function ringNpcFx() { // 원이 함께 딛으면 발밑에 먼지가 조금씩
  for (const p of [...RING_FRONT, LEAD, FOLLOW]) if (p.x > vx - 10 && p.x < vx + VW + 10 && Math.random() < 0.35) dust(p.x + 4, p.y, 1);
}

// ───────── 소리 ─────────
// 원 발소리와 구경꾼 박수. 받는 마디의 발소리는 앞 · 뒷사람 소리(hitSound)가 이미 낸다. 녹음에 없는 악기는 얹지 않는다
function ringBar(rec) {
  if (!ringOn() || !ctx || rec.def.outro || rec.def.intro) return;
  const def = rec.def;
  if (def.call || def.rest) { Array.from({ length: barBeats(def) }, (_, k) => sample('step-soft', rec.t0 + k * rec.beat, 0.24, band)); if (def.rest) log('rest-step', { t: rec.t0, i: def.i }); return; }
  if (!def.clip || state !== 'song') return;
  const n = sc.hits;
  def.strikes.forEach((s, k) => {
    const t = rec.t0 + s * rec.beat;
    if (n >= 4 && k % 2 === 0) sample('clap', t, 0.42, band, 0.97 + Math.random() * 0.06);
    if (n >= 12 && k % 2 === 1) sample('clap', t, 0.36, band, 0.97 + Math.random() * 0.06);
    if (n >= 28) sample('clap', t + 0.11, 0.24, band, 1.03);
  });
}
// 구경꾼 박수 여럿: spread초 안에 흩어 친다
function claps(t, n, spread, v) { for (let i = 0; i < n; i++) sample('clap', t + Math.random() * spread, v * (0.75 + Math.random() * 0.35), sfx, 0.92 + Math.random() * 0.16); }
// 곡마다 다른 맺음 소리(audio.js accent가 부른다)
function ringAccent(kind, t, v) {
  if (kind === 'enter') sample('step', t, 0.5);
  else if (kind === 'charge') sample('shuffle', t, 0.55);
  else if (kind === 'full') { sample('clap', t, 0.5); sample('clap', t + 0.09, 0.42); }
  else if (kind === 'level') { sample('clap', t, 0.5); sample('clap', t + 0.1, 0.4); }
  else if (kind === 'burst') { sample('step', t, 0.9, sfx, 0.92); claps(t + 0.04, 4, 0.22, 0.4); }
  else if (kind === 'finale') { sample('step', t, 1.3); sample('step', t + 0.014, 0.9, sfx, 0.86); claps(t + 0.06, 10, 0.75, 0.42); }
  else if (kind === 'cheer') { const b = Math.min(v, 0.625); sample('clap', t, 0.55); sample('clap', t + b * 0.5, 0.42); sample('clap', t + b * 0.75, 0.48); }
  else if (kind === 'seal') { sample('step', t, 0.9); claps(t + 0.05, v === 3 ? 9 : 3, v === 3 ? 0.7 : 0.25, 0.4); }
}

// 월월이 달집: 쌓인 맞힘은 놓쳐도 줄지 않는다. 달과 불빛은 원 모듈의 그림 뒤에 둔다
const WOL_FIRE_AT = [1, 6, 12, 18, 24], WOL_DALJIP = { x: 80, y: 120 };
const WOL_FIRE_POSES = ['daljip-0', ...[1, 2, 3, 4, 5].flatMap(n => ['a', 'b'].map(k => 'fire-' + n + k))];
const wolDaljip = () => {
  const p={x:Math.max(WOL_DALJIP.x,camX+34),y:WOL_DALJIP.y};
  if(!captionDLive()||!captionD.slots.me)return p;
  return wolPlace('fire',p,()=>{const ink=wolInk(WOL_FIRE_POSES);ink.t-=12;return ink;},{lift:8,topSlack:8})||p; // 끝 한 방 불꽃은 12점 더 솟는다(0.6초 중 꼭대기 한때라 화면 위 끝 여백은 0px까지)
};
// 월월이 달집 · 달 자리(곡별 검수 05 R1-02 · R1-03). 말풍선 종이 · 꼬리 · 구슬 길과 8px 넘게, 화면 끝에서 8px 넘게 떨어진 곳.
// 달집은 언덕을 따라 옆으로 가거나 8점까지만 올라간다(땅에서 뜨지 않게). 세로 폰처럼 언덕이 두 말풍선에 다 가리면 앞줄 아래 마당에 선다.
// 안내 묶음 칸은 글이 칸 가운데에 뜨므로, 덜 겹치는 자리를 고른다. 자리는 말풍선 짜임이 바뀔 때만 다시 찾는다(판 내내 한 자리).
function wolInk(names, centered = false) {
  const boxes = names.filter(n => SPRITES[n] && (centered || META[n]?.foot)).map(n => {
    const im = SPRITES[n], a = learnOpaque(im), fx = centered ? im.width / 2 : META[n].foot[0], fy = centered ? im.height / 2 : META[n].foot[1];
    return { l: a.left - fx, t: a.top - fy, r: a.right - fx, b: a.bottom - fy };
  });
  return boxes.length ? { l: Math.min(...boxes.map(b => b.l)), t: Math.min(...boxes.map(b => b.t)), r: Math.max(...boxes.map(b => b.r)), b: Math.max(...boxes.map(b => b.b)) } : null;
}
function wolBlocks() {
  const hard = [], soft = [];
  // 말풍선과는 12px(자리 상자 8px + 4px, 월월이 3회차 W-E 「달 · 불과 12px」), 화면 끝과는 8px
  for (const o of Object.values(captionD.slots).filter(Boolean)) {
    hard.push({ x: o.x - 12, y: o.y - o.pad - 8, w: o.w + 24, h: o.h + o.pad + 16 }); // 종이 그림과 구슬이 뛰는 높이
    if (o.side === 'up') hard.push({ x: o.tip.x - 12, y: o.y + o.h, w: 24, h: Math.max(0, o.tip.y - o.y - o.h) + 4 });
    else if (o.side === 'right') hard.push({ x: o.tip.x - 4, y: o.tip.y - 12, w: Math.max(0, o.x - o.tip.x) + 4, h: 24 });
    else hard.push({ x: o.x + o.w, y: o.tip.y - 12, w: Math.max(0, o.tip.x - o.x - o.w) + 4, h: 24 });
  }
  // 노래 동안은 판 내내 같은 안내 묶음 자리만 잰다. 처음 배우기 4단계(노래)의 넓은 안내 칸이 끝나면 불 · 달이 노래 도중 옆으로 뛰었다(곡별 검수 05 R2-01)
  for (const n of [captionD.slots.ba?.notice, state === 'song' ? null : captionD.guideRect]) if (n) soft.push({ x: n.x, y: n.y, w: n.w, h: n.h });
  return { hard, soft };
}
// point: 세계 좌표 발(달은 가운데). ink(): 그 점에서 잉크 상자(세계 점). opts.lift: 위로 올려도 되는 점 수, opts.yard: 앞줄 아래 마당 후보,
// opts.column: [위쪽 y, 아래쪽 y] 사이를 오르내리는 것(달, 기둥 전체를 비킨다). opts.up: 위로는 끝까지 비켜도 됨
function wolPlace(id, point, inkOf, opts = {}) {
  const dot = K / DPR, { hard, soft: liveSoft } = wolBlocks(), soft = opts.soft || liveSoft, extra = opts.blocks || []; // opts.soft: 그때그때 바뀌는 안내 칸 대신 쓸 덜 피할 것
  const sig = [id, W, H, K, DPR, camX, camY, point.x, point.y, ...[...hard, ...soft, ...extra].flatMap(b => [b.x, b.y, b.w, b.h].map(Math.round))].join('|');
  ring.places ??= new Map();
  const old = ring.places.get(id); if (old?.sig === sig) return old.at;
  const ink = inkOf(); if (!ink) return null;
  const col = opts.column || [point.y, point.y], pad = 8, horizon = Infinity; // 수평선 밑(바다에 가린 낮은 달)도 말풍선과 띄운다(W-E는 달 상자 전체를 잰다)
  const box = (fx, fy) => {
    const x = (fx + ink.l - camX) * dot, top = (fy - point.y + col[0] + ink.t - camY) * dot;
    let bottom = (fy - point.y + col[1] + ink.b - camY) * dot; if (bottom > horizon) bottom = Math.max(top, horizon);
    return { x: x - pad, y: top - pad, w: (ink.r - ink.l) * dot + 2 * pad, h: bottom - top + 2 * pad, ink: { x, y: top, w: (ink.r - ink.l) * dot, h: bottom - top } };
  };
  const cut = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const blocks = [...hard, ...extra], all = [...blocks, ...soft];
  const fxs = new Set([point.x, Math.ceil(camX + pad / dot - ink.l), Math.floor(camX + (W - pad) / dot - ink.r),
    ...all.flatMap(b => [Math.floor(camX + (b.x - pad) / dot - ink.r), Math.ceil(camX + (b.x + b.w + pad) / dot - ink.l)])]);
  const fys = [];
  for (let d = 0; d <= (opts.lift || 0); d++) fys.push({ y: point.y - d, cost: 3 * d * dot });
  if (opts.up) { // 위 끝이 화면 끝 8px에 닿을 때까지, 또는 막을 것 바로 위까지 올린다(d < 0)
    const top = Math.ceil(camY + pad / dot - col[0] - ink.t);
    for (const d of [top, ...all.map(b => Math.floor(camY + (b.y - pad) / dot - col[1] - ink.b))]) if (d < 0 && d >= top) fys.push({ y: point.y + d, cost: -d * dot });
  }
  if (opts.yard) { // 앞줄 발밑(가장 아래로 내려온 발) 아래 마당. 마당이 낮으면(세로 폰 배율 3) 화면 아래 끝 8px에 발을 두고, 큰 불 끝만 앞줄 발 뒤로 지난다
    const feet = (Math.max(...RING_FRONT.map(p => p.y)) + 1 - camY) * dot;
    fys.push({ y: Math.min(Math.ceil(camY + (feet + pad) / dot - ink.t), Math.floor(camY + (H - pad) / dot - ink.b)), cost: 5000 });
  }
  let best = null;
  for (const fx of fxs) for (const fy of fys) {
    const r = box(fx, fy.y);
    if (r.x < 0 || r.y + (opts.topSlack || 0) < 0 || r.x + r.w > W || r.y + r.h > H) continue; // topSlack: 위 끝 여백을 덜 받는 몫(끝 한 방 불꽃 끝)
    const hit = blocks.reduce((n, b) => n + cut(r, b), 0);
    const score = [hit, soft.reduce((n, b) => n + cut(r.ink, b), 0), Math.abs(fx - point.x) * dot + fy.cost];
    if (!best || score[0] < best.score[0] || score[0] === best.score[0] && (score[1] < best.score[1] || score[1] === best.score[1] && score[2] < best.score[2])) best = { fx, fy: fy.y, score, r };
  }
  const at = best ? { ...point, x: best.fx, y: best.fy } : null;
  ring.places.set(id, { sig, at, rect: best?.r, score: best?.score }); return at;
}
const wolFireLevel = (n = sc.hits) => WOL_FIRE_AT.filter(at => n >= at).length;
function wolLimitParticles() { if (fxs.particles.length > 80) fxs.particles.splice(0, fxs.particles.length - 80); }
function wolEmbers(final = false) {
  const lv = wolFireLevel(), p = wolDaljip(); if (!lv || RM) return;
  for (let i = 0; i < (final ? 38 : 18); i++) part({ x: p.x + (Math.random() - .5) * 20, y: p.y - 24 - lv * 6,
    vx: (Math.random() - .5) * (final ? 55 : 30), vy: -28 - Math.random() * (final ? 80 : 40), life: final ? .6 : .4,
    c: pick(['#f7d68d', '#e89a54', '#ca6e42']), w: 1, h: 1, grav: -20 });
}
function wolHit() {
  if (!WOL_FIRE_AT.includes(sc.hits)) return;
  ring.fireT = performance.now() / 1000;
  wow('wol-fire'); wolEmbers();
  fxs.stopUntil = Math.max(fxs.stopUntil, ring.fireT + .14);
  if (ctx) sample('daljip-fire', ctx.currentTime, .30);
  log('wol-fire', { level: wolFireLevel(), hits: sc.hits, stopMs: 140 });
}
function wolUpdate(rec, vt) {
  if (state !== 'song' || !rec || !rec.def.finale || ring.finalT >= 0 || vt < rec.t0 + rec.def.finaleBeat * rec.beat) return;
  ring.finalT = performance.now() / 1000; wolEmbers(true); wolLimitParticles();
  ringAccent('finale', ctx.currentTime);
  if (wolFireLevel()) sample('daljip-fire', ctx.currentTime, .4);
  log('wol-final', { level: wolFireLevel(), hits: sc.hits, durationMs: 600 });
}
// 꾹 불티(곡별 검수 05 재미 F01): 메기는 소리 동안 꾹 누르고 있으면 달집 불티가 0.15초마다 하나씩 날아와 내 꼬마 둘레를 돈다(불이 붙은 뒤, 12개까지).
// 첫 「월」에 제때 떼면 모인 불티가 달집으로 날아가고 불이 0.25초 동안 한 단 크게 솟는다. 일찍 떼거나 놓치면 바닥에 떨어져 잿빛으로 꺼진다.
// 판정 · 점수 · 도장에는 손대지 않는다(그림과 소리만)
const WOL_EMBER = ['#f7d68d', '#e89a54'], WOL_ASH = '#8a7f74';
function wolHeroRing() {
  const m = META['hero-idle'], im = SPRITES['hero-idle']; if (!m || !im) return { x: HERO.x, y: HERO.y - 20, rx: 20, ry: 14 };
  const a = learnOpaque(im);
  return { x: HERO.x + (a.left + a.right) / 2 - m.foot[0], y: HERO.y + (a.top + a.bottom) / 2 - m.foot[1], rx: (a.right - a.left) / 2 + 5, ry: (a.bottom - a.top) / 2 * .6 };
}
function wolFireMouth() { const p = wolDaljip(), lv = wolFireLevel(), a = wolInk([lv ? `fire-${lv}a` : 'daljip-0']); return { x: p.x, y: p.y + (a ? Math.round(a.t * .6) : -30) }; }
function wolEmberAt(e, f, c) {
  const ang = e.slot * 2.4 + f * 4, ox = c.x + Math.cos(ang) * c.rx, oy = c.y + Math.sin(ang) * c.ry;
  if (e.mode === 'come') { const k = clamp01((f - e.t0) / .45); if (k >= 1) e.mode = 'hold'; return { x: e.x0 + (ox - e.x0) * k, y: e.y0 + (oy - e.y0) * k - Math.sin(k * Math.PI) * 18 }; }
  if (e.mode === 'hold') return { x: ox, y: oy };
  if (e.mode === 'go') { const k = clamp01((f - e.t0) / e.dur); return { x: e.x0 + (e.x1 - e.x0) * k, y: e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * 24 }; }
  const t = Math.max(0, f - e.t0); return { x: e.x0 + e.vx * t, y: Math.min(e.floor, e.y0 + e.vy * t + 160 * t * t) };
}
function wolGather(f) {
  ring.embers ??= [];
  const rec = state === 'song' ? currentRec(heardNow()) : null, live = ring.embers.filter(e => e.mode === 'come' || e.mode === 'hold');
  if (!paused && !RM && charge && !charge.pending && rec?.def.call && wolFireLevel() >= 1) {
    if (f - (ring.emberT ?? -9) >= .15 && live.length < 12) {
      ring.emberT = f; const s = wolFireMouth();
      ring.embers.push({ mode: 'come', t0: f, x0: s.x + Math.round((Math.random() - .5) * 10), y0: s.y, slot: live.length, c: WOL_EMBER[live.length % 2] });
    }
  } else if (!charge && live.length) wolDrop(f);
  ring.embers = ring.embers.filter(e => !(e.mode === 'fall' && f - e.t0 > .4) && !(e.mode === 'go' && f - e.t0 > e.dur));
}
function wolThrow() {
  const f = performance.now() / 1000, c = wolHeroRing(), s = wolFireMouth(); let n = 0;
  for (const e of ring.embers || []) if (e.mode === 'come' || e.mode === 'hold') {
    const p = wolEmberAt(e, f, c);
    Object.assign(e, { mode: 'go', t0: f + n * .02, x0: p.x, y0: p.y, x1: s.x + Math.round((Math.random() - .5) * 12), y1: s.y, dur: .3 }); n++;
  }
  if (!n) return;
  ring.boostT = f + .3; // 첫 불티가 닿는 때부터 0.25초
  if (ctx) sample('daljip-fire', ctx.currentTime + .3, .2);
  log('wol-throw', { embers: n });
}
function wolDrop(f) {
  const c = wolHeroRing(), floor = HERO.y - 1;
  for (const e of ring.embers || []) if (e.mode === 'come' || e.mode === 'hold') {
    const p = wolEmberAt(e, f, c);
    Object.assign(e, { mode: 'fall', t0: f, x0: p.x, y0: p.y, vx: Math.round((Math.random() - .5) * 30), vy: -10 - Math.random() * 10, c: WOL_ASH, floor });
  }
}
function drawWolEmbers(f) {
  if (!ring.embers?.length) return;
  const c = wolHeroRing();
  for (const e of ring.embers) {
    const p = wolEmberAt(e, f, c), s = e.mode === 'fall' && f - e.t0 > .2 ? 1 : 2;
    lg.fillStyle = e.mode === 'fall' ? WOL_ASH : e.c; lg.fillRect(Math.round(p.x - vx) - 1, Math.round(p.y - vy) - 1, s, s);
  }
}
const wolFinalShowing = () => state === 'end' || ring.finalT >= 0;
const wolCheering = f => fxs.bubbles.some(b => f >= b.t0 && f - b.t0 < .45);
function wolEndHeadRoom(note, f) {
  const people = [...RING_FRONT, { ...LEAD, name: 'leader' }, { ...HERO, name: 'hero' }, { ...FOLLOW, name: 'follower' }];
  const heads = people.map(p => {
    const m = META[`${p.name}-${p.name.startsWith('ring-') ? 'stand' : 'idle'}`];
    if (!m) return null;
    const mouth = m.mouth || [26, 44], face = m.face || [mouth[0] - 16, mouth[1] - 20, 36, 25];
    const left = toCssX(p.x - m.foot[0] + face[0]), right = left + face[2] * K / DPR;
    return right > note.left - 8 && left < note.right + 8 ? p.y - m.foot[1] + face[1] : null;
  }).filter(y => y !== null);
  const shake = fxs.shake && f >= fxs.shake.t0 && f - fxs.shake.t0 < fxs.shake.dur ? Math.ceil(fxs.shake.amp) : 0;
  return heads.length ? Math.floor(Math.min(...heads) - entryHop(f) - shake - camY - (note.bottom + 8) * DPR / K) : Infinity;
}
function wolRank() {
  const res = Rules.summarize(targets.filter(t => typeof t.part === 'number'));
  return !res.hits ? 0 : res.hits === res.n ? 4 : Rules.stampFor(res.ratio);
}
function wolJoy(k) {
  const rank = wolRank(); if (!rank) return false; if (rank >= 3) return true;
  const people = [...RING_FRONT.filter(p => p.x >= vx - 20 && p.x <= vx + VW + 20).map(p => ({ k: p.k, x: p.x })),
    { k: -3, x: LEAD.x }, { k: 0, x: HERO.x }, { k: 1, x: FOLLOW.x }].sort((a, b) => Math.abs(a.x - HERO.x) - Math.abs(b.x - HERO.x));
  return people.slice(0, rank === 1 ? 2 : 4).some(p => p.k === k);
}
// 앞소리꾼과 따라 도는 사람은 얼굴과 몸을 두고, 같은 원 사람 그림의 올린 팔만 겹친다
function wolRaisePose(role) {
  const name = `wol-${role}-cheer`, im = SPRITES[`${role}-idle`], base = SPRITES['ring-c-stand'], up = SPRITES['ring-c-cheer'];
  if (!im || !base || !up) return `${role}-raise`;
  let cached = ring.raised.get(name);
  if (!cached || cached.src !== im) {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
    const target = cx.getImageData(0, 0, c.width, c.height), a = document.createElement('canvas'); a.width = base.width; a.height = base.height;
    const ax = a.getContext('2d'); ax.drawImage(base, 0, 0); const old = ax.getImageData(0, 0, a.width, a.height).data;
    ax.clearRect(0, 0, a.width, a.height); ax.drawImage(up, 0, 0); const next = ax.getImageData(0, 0, a.width, a.height).data;
    const meta = META[`${role}-idle`], from = META['ring-c-stand'], dx = meta.foot[0] - from.foot[0], dy = meta.foot[1] - from.foot[1];
    for (let y = 20; y < 53; y++) for (let x = 0; x < a.width; x++) {
      if (x >= 17 && x <= 40) continue;
      const p = (y * a.width + x) * 4, xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= c.width || yy >= c.height || old.slice(p, p + 4).every((v, k) => v === next[p + k])) continue;
      target.data.set(next.slice(p, p + 4), (yy * c.width + xx) * 4);
    }
    const raised = META['ring-c-cheer'];
    cx.putImageData(target, 0, 0); cached = { src: im, cv: c, meta: { ...meta,
      handL: [raised.handL[0] + dx, raised.handL[1] + dy], handR: [raised.handR[0] + dx, raised.handR[1] + dy] } }; ring.raised.set(name, cached);
  }
  SPRITES[name] = cached.cv; META[name] = cached.meta; return name;
}
// 바퀴 첫 2초만 달을 옮긴다. 첫 바퀴는 첫 받는 소리부터 수평선에서 뜬다
// 달은 말풍선 · 달집을 비키되 화면 안(끝에서 8px)에 둔다. 옆으로 가거나 위로만 비킨다(아래로 가면 땅에 박힌다).
// 세 바퀴 높이(y115 → 52)를 한 기둥으로 재서 한 자리에 두므로 바퀴가 바뀌어도 옆으로 뛰지 않는다(곡별 검수 05 R1-03).
// 덜 피할 것은 판 내내 그대로인 것만 쓴다: 안내 묶음의 정한 자리와 소나무. 처음 배우기의 넓은 안내 칸처럼 그때그때 바뀌는 칸을 넣으면
// 그 칸이 바뀔 때 달 자리를 새로 찾아 노래 도중 옆으로 뛴다(곡별 검수 05 R2-01: 처음 배우기가 끝날 때 780×290 221px · 1695×902 576px).
function wolMoonPlace(st) {
  const p = wolMoonPlaceRaw(st);
  if (!p || state !== 'song' || !captionDLive() || !captionD.slots.me) return p;
  const ref = { x: 240, y: 115 }; wolDaljip();
  const fire = ring.places?.get('fire')?.rect?.ink, dot = K / DPR;
  const tall = wolTallBoxes().map(b => ({ x: (b.l - camX) * dot, y: (b.t - camY) * dot, w: (b.r - b.l) * dot, h: (RING_SEA.horizon - b.t) * dot }));
  const at = wolPlace('moon', ref, () => wolInk(['moon', 'moon-low'], true), { column: [WOL_MOON_HIGH, 115], up: true, blocks: fire ? [fire] : [], soft: [captionD.slots.ba?.notice, ...tall].filter(Boolean) });
  return at ? { ...p, x: p.x + at.x - ref.x, y: p.y + at.y - ref.y } : p;
}
// 바닷가 그림에서 수평선 위로 솟은 것(소나무)의 세계 상자. 달은 배경보다 먼저 그려져 이 뒤에 서면 가린다(곡별 검수 05 R2-01, 780×290 소나무 둘).
// 배경은 x<0 · x>WORLD_W에서 거울로 접어 그리므로(scene.js drawBg) 접힌 쪽 상자도 넣는다. 2점 안 틈은 한 그루로 본다
function wolTallBoxes() {
  const im = SPRITES['sea-bg']; if (!im) return [];
  if (ring.tall?.src === im) return ring.tall.boxes;
  const src = skyless(im), top = RING_SEA.horizon, c = document.createElement('canvas'); c.width = src.width; c.height = top;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, c.width, top).data, boxes = [];
  let cur = null;
  for (let x = 0; x < c.width; x++) {
    let t = -1; for (let y = 0; y < top; y++) if (d[(y * c.width + x) * 4 + 3] > 8) { t = y; break; }
    if (t < 0) continue;
    if (cur && x <= cur.r + 2) { cur.r = x + 1; cur.t = Math.min(cur.t, t); } else boxes.push(cur = { l: x, r: x + 1, t });
  }
  const all = boxes.flatMap(b => [b, { l: -b.r, r: -b.l, t: b.t }, { l: 2 * WORLD_W - b.r, r: 2 * WORLD_W - b.l, t: b.t }]);
  ring.tall = { src: im, boxes: all }; return all;
}
function wolMoonPlaceRaw(st) {
  if (state === 'end') {
    if ((H <= 420)) {
      const bounds = wolBounds('moon', 0, 0, true), width = document.querySelector('.endTop').getBoundingClientRect().width;
      const x = Math.max(W * (710 / 780), W * (324 / 780) + width + 13 - bounds.left * K / DPR);
      return { x: vx + x * DPR / K, y: vy + H * (108 / 290) * DPR / K, name: 'moon', round: 3 };
    }
    return { x: 240, y: WOL_MOON_HIGH + vy - camY, name: 'moon', round: 3 };
  }
  if (state !== 'song' || !st || st.i < 0) return null;
  const def = songBars[st.i]; if (!def || !def.part || def.intro) return null;
  const round = Math.min(3, def.part), first = songBars.findIndex(b => b.part === round);
  let elapsed = st.b * barBeat(def);
  for (let i = first; i < st.i; i++) elapsed += barSpan(songBars[i]);
  if (round === 1) {
    const response = barSpan(songBars[first]); if (elapsed < response) return null;
    return { x: 240, y: Math.round(115 - 33 * clamp01((elapsed - response) / 2)), name: 'moon-low', round };
  }
  const k = RM ? 1 : easeInOut(clamp01(elapsed / 2)), from = round === 2 ? 82 : 68, to = round === 2 ? 68 : WOL_MOON_HIGH;
  return { x: 240, y: Math.round(from + (to - from) * k), name: 'moon', round };
}
function wolMood(st) {
  if (state === 'end') return MOOD_NIGHT;
  if (!st || st.i < 0 || state !== 'song') return MOOD_DUSK;
  const def = songBars[st.i];
  if (!def || !def.part || def.intro) return MOOD_DUSK;
  const first = songBars.findIndex(b => b.part === def.part);
  const k = def.part === 1 ? .25 : def.part === 2 ? .65 : 1;
  const prev = def.part === 1 ? 0 : def.part === 2 ? .25 : .65;
  return mixMood(MOOD_DUSK, MOOD_NIGHT, prev + (k - prev) * (st.i === first ? step6(st.b * barBeat(def) / 2) : 1));
}
function drawWolMoon(st) {
  const mo = wolMoonPlace(st); if (!mo) return;
  const im = SPRITES[mo.name]; if (!im) return;
  lg.drawImage(im, Math.round(mo.x - vx - im.width / 2), Math.round(mo.y - vy - im.height / 2));
}
const wolBoundsCache = new WeakMap();
function wolBounds(name, x, y, centered = false, dir = 1) {
  const im=SPRITES[name],m=META[name];if(!im)return null;
  let b=wolBoundsCache.get(im);
  if(!b){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
    b={left:im.width,top:im.height,right:0,bottom:0};for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++)if(d[(yy*c.width+xx)*4+3]){b.left=Math.min(b.left,xx);b.top=Math.min(b.top,yy);b.right=Math.max(b.right,xx+1);b.bottom=Math.max(b.bottom,yy+1);}wolBoundsCache.set(im,b);}
  const ox=Math.round(x-(centered?im.width/2:dir<0?im.width-m.foot[0]:m.foot[0])),oy=Math.round(y-(centered?im.height/2:m.foot[1]));
  return{left:ox+(dir<0?im.width-b.right:b.left),top:oy+b.top,right:ox+(dir<0?im.width-b.left:b.right),bottom:oy+b.bottom};
}
function wolMoonRect(st) {
  const mo=wolMoonPlace(st),b=mo&&wolBounds(mo.name,mo.x,mo.y,true);if(!b)return null;
  return{left:toCssX(b.left),right:toCssX(b.right),top:toCssY(b.top),bottom:toCssY(b.bottom)};
}
function wolFireRect(final = false) {
  const p = wolDaljip(), lv = wolFireLevel(), a = wolBounds(lv ? `fire-${lv}a` : 'daljip-0', p.x, p.y);
  const b = lv && wolBounds(`fire-${lv}b`, p.x, p.y);
  if (b) for (const key of ['left', 'top', 'right', 'bottom']) a[key] = (key === 'left' || key === 'top' ? Math.min : Math.max)(a[key], b[key]);
  if (lv && final) a.top -= 12;
  return { x: toCssX(a.left), y: toCssY(a.top), w: (a.right - a.left) * K / DPR, h: (a.bottom - a.top) * K / DPR };
}
function wolBubblePlace(event, f, rise, blocked) {
  const bb=SPRITES.bubble,ft=META.bubble.foot,p=wolDaljip(),lv=wolFireLevel();if(!bb)return null;
  const fire=wolBounds(lv?`fire-${lv}a`:'daljip-0',p.x,p.y),other=lv&&wolBounds(`fire-${lv}b`,p.x,p.y);
  if(other)for(const key of ['left','top','right','bottom'])fire[key]=(key==='left'||key==='top'?Math.min:Math.max)(fire[key],other[key]);
  if(lv&&wolFinalShowing())fire.top-=12;
  const gap=(a,b)=>Math.max(a.left-b.right,b.left-a.right,a.top-b.bottom,b.top-a.bottom);
  const obstacles=[fire,...blocked];
  for(const el of [elLyMe,elLyBa,elCombo,elTop,elFb,elBall])if(!el.hidden&&el.getClientRects().length){const b=el.getBoundingClientRect(),tail=el===elLyBa?Math.max(0,.544*parseFloat(getComputedStyle(el).fontSize)-1.59):0;obstacles.push({left:vx+b.left/(K/DPR),right:vx+b.right/(K/DPR),top:vy+b.top/(K/DPR),bottom:vy+(b.bottom+tail)/(K/DPR)});}
  const people=[...(ring.frontBodies||[]),...(ring.followBody?[ring.followBody]:[]),...(ring.backBodies||[])].filter(p=>p.x>vx&&p.x<vx+VW).sort((a,b)=>event.who===0?a.x-b.x:b.x-a.x);
  for(const person of people){
    const headName=person.name==='follower'?'follower-idle':`${person.name}-stand`,head=wolBounds(headName,person.x,person.y,false,person.dir||1);
    const center=Math.round((head.left+head.right)/2),reach=Math.max(1,Math.floor((head.right-head.left)/8)),y=head.top-3;
    for(const x of [center,center-reach,center+reach]){
    for(const side of [event.who===0?1:-1,event.who===0?-1:1]){
      const r={left:side>0?x-ft[0]:x-(bb.width-ft[0]),right:side>0?x-ft[0]+bb.width:x+ft[0],top:y-ft[1],bottom:y+bb.height-ft[1]};
      if(toCssX(r.left)<8||toCssX(r.right)>W-8||toCssY(r.top)<8||toCssY(r.bottom)>H-8||obstacles.some(b=>b&&gap(r,b)<4))continue;
      return{x,y,side,rect:r,head,headName,owner:{x:person.x,y:person.y,dir:person.dir||1},person:person.k,tailGap:head.top-r.bottom};
    }
    }
  }
  return null;
}
function drawWolFire(f) {
  const lv = wolFireLevel(), p = wolDaljip();
  if (lv) for (const [pad, color] of [[16 + lv * 5, '#927253'], [10 + lv * 4, '#ad8057'], [5 + lv * 3, '#c5915e']]) {
    lg.fillStyle = color;
    for (let dy = -4; dy <= 5; dy++) {
      const w = Math.max(4, pad - Math.abs(dy) * 3);
      lg.fillRect(Math.round(p.x - vx - w), Math.round(p.y - vy + dy), w * 2 + 1, 1);
    }
  }
  spr('daljip-0', p.x, p.y);
  if (!lv) return;
  const name = `fire-${lv}${RM || Math.floor(f / .15) % 2 === 0 ? 'a' : 'b'}`;
  const burst = !RM && ring.finalT >= 0 ? Math.sin(clamp01((f - ring.finalT) / .6) * Math.PI) : 0;
  if (burst > .01) spr(name, p.x, p.y - Math.round(burst * 12));
  // 꾹 불티가 닿으면 0.25초 동안 한 단 위 그림으로 「훅」(5단계는 6점 솟는다). 그림은 자리 잴 때 넣은 열한 장 안에서만 고른다
  const boost = f >= (ring.boostT ?? -9) && f - ring.boostT < .25;
  if (boost) { if (lv < 5) spr(`fire-${lv + 1}a`, p.x, p.y); else spr(name, p.x, p.y - 6); }
  spr(name, p.x, p.y);
}
// 불투명 몸의 왼쪽 가장자리 2~3색 띠. 그림을 늘이거나 흐리지 않는다
function wolRim(name, x, y, dir = 1, behind = false) {
  const lv = wolFireLevel(), im = SPRITES[name], m = META[name]; if (!lv || !im || !m) return;
  let cached = ring.rims.get(name);
  if (!cached || cached.im !== im) {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const cx = c.getContext('2d'); cx.drawImage(im, 0, 0); const a = cx.getImageData(0, 0,c.width,c.height).data;
    // 행마다 몸 가장자리부터 칠한다. 6점 이하로 끊긴 덩이(올린 팔 · 손 · 발)는 건너뛰어 팔이 금빛 막대로 이어지지 않게 한다(곡별 검수 05 R1-05)
    const edge = [];
    for (let yy = 0; yy < c.height; yy++) {
      const runs = [];
      for (let xx = 0; xx < c.width; xx++) if (a[(yy * c.width + xx) * 4 + 3]) { const last = runs.at(-1); if (last && last[1] === xx - 1) last[1] = xx; else runs.push([xx, xx]); }
      const body = runs.filter(([s, e]) => e - s + 1 > 6);
      edge.push(body.length ? [body[0][0], body.at(-1)[1]] : [-1, -1]);
    }
    cached = { im, a, edge, masks: new Map() }; ring.rims.set(name, cached);
  }
  const key = `${lv}|${dir}`;
  let mask = cached.masks.get(key);
  if (!mask) {
    mask = document.createElement('canvas'); mask.width = im.width; mask.height = im.height;
    const cx = mask.getContext('2d'), pixels = cx.createImageData(mask.width, mask.height), width = [1, 1, 2, 2, 3][lv - 1];
    const palette = dir < 0 ? ['#865d46', '#a97e57', '#d0a46e'] : ['#b47c54', '#d5a16b', '#f0c481'];
    const colors = [[0], [1], [0, 1], [1, 2], [0, 1, 2]][lv - 1].map(i => palette[i]).map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
    cached.edge.forEach(([left, right], yy) => {
      if (left < 0) return;
      for (let d = 0; d < width; d++) {
        const xx = dir < 0 ? right - d : left + d, p = (yy * im.width + xx) * 4;
        if (xx < 0 || xx >= im.width || !cached.a[p + 3]) continue;
        pixels.data.set([...colors[Math.floor(d * colors.length / width)], 255], p);
      }
    });
    cx.putImageData(pixels, 0, 0); cached.masks.set(key, mask);
  }
  sprIm(mask, name, x, y, dir, behind);
}
