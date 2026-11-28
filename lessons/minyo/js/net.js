// 제주 바닷가 그물 판. 손 판정은 game.js, 이 파일은 줄과 사람과 바다를 그린다
const netOn = () => !!(song && song.net);
const netYard = () => !!song?.netScene?.yard; // 충청 가래질: 바다 대신 집터, 그물 대신 가래 한 틀과 흙 무더기
const YARD_GARAE = { x: 238, y: 172, dir: 1 }, YARD_PILE = { x: 286, y: 166 }, YARD_SOIL = ['#8a5a3c', '#a4724c', '#6e4630', '#b98a5e'];
const netSlope = () => !!song?.netScene?.slope; // 강원 운재: 눈 산비탈, 줄 대신 깍장쇠로 통나무를 잡고 비탈 아래 개울가로 나른다
// 북쪽 세 곡(2026-11-13): 황해 대장간 'forge' · 평안 밭 'field' · 함경 강가 'dance'. 줄 없이 사람만 가래질 판 자리에 선다
const netKind = () => song?.netScene?.kind || null;
const netLand = () => netYard() || netSlope() || !!netKind();
const FORGE = { furnace: { x: 262, y: 170, dir: 1 }, bellows: { x: 150, y: 168 }, stand: 158 }, FORGE_SPARK = ['#ffd36a', '#f59a3a', '#e8642c', '#fff2b0'], FORGE_COAL = ['#2b2420', '#4a3b33', '#f59a3a', '#6b5a50'];
function forgePlace(){
  const p={...FORGE.furnace,y:H<=420?166:FORGE.furnace.y},top=anchor('furnace','top',[32,6],p),hole=anchor('furnace','hole',[32,78],p);
  const parts=[{pose:'furnace',...p},...[1,2,3,4,5].map(n=>({pose:'flame-'+n,...top})),{pose:'molten',x:hole.x+14,y:p.y+6}];
  // 가마는 땅 높이를 지키고 옆으로만 비킨다. 위로 옮기면 지붕 위에 뜨고 아래로 옮기면 가로 폰에서 사라진다.
  return captionDArtworkGroup('furnace',p,parts,4,{axis:'x',keepInside:true,allowOutside:false});
}
function forgeBellowsPlace(){return {...FORGE.bellows,x:FORGE.bellows.x+(captionDLive()?(H<=420?-48:W>=900?-20:0):0)};}
// 후렴 001의 연달은 세 「불」만 센다. 다른 마디나 앞의 「불어라」, 놓친 자리는 잇지 않는다.
function forgeRunFor(tg){
  if(song?.id!=='punggu'||tg.part==='연습'||tg.rec?.def.clip!=='V5-011-001')return 0;
  const group=targets.filter(t=>t.rec===tg.rec),i=group.indexOf(tg);if(i<2||i>4)return 0;
  let n=1;for(let j=i-1;j>=2&&['perfect','good'].includes(group[j].res);j--)n++;
  return n;
}
function yardGaraePlace(){const p=YARD_GARAE;return captionDArtworkGroup('garae-tool',p,['garae-planted','garae-pulled'].map(pose=>({pose,...p})),3);}
function yardPilePlace(){return YARD_PILE;}
function danceTreePlace(){
  const p=captionDLive()?{x:camX+8/(K/DPR),y:0}:{x:DANCE_BG_X,y:0};
  if(captionDLive()&&((H<=420))){
    // 나무는 배경이고 그네는 자라는 전경 그림이다. 작은 화면에서는 여섯 그네 그림이 모두 보일 자리만 찾고 나무도 함께 옮긴다.
    const parts=[0,1,2,3,4,5].map(n=>{const pose='swing-'+n,off=anchor(pose,'top',[28,0],{x:0,y:0,dir:1});return{pose,x:p.x+56-off.x,y:p.y+DANCE_SWING.y-off.y};});
    return captionDArtworkGroup('small-swing-tree',p,parts,2,{axis:'x',keepInside:true,allowOutside:false});
  }
  return captionDPropGroup('swing-tree',p,{x:p.x,y:0,w:124,h:132,axis:'x',allowOutside:true});
}
let danceTreeSource=null,danceTreeCanvas=null;
function danceTreeImage(){
  const im=SPRITES['net-bg'];if(!im)return null;if(danceTreeSource===im)return danceTreeCanvas;
  const c=document.createElement('canvas');c.width=DANCE_TREE_W;c.height=126;c.captionProp='willow-tree';const g=c.getContext('2d');g.drawImage(im,0,0);
  const p=g.getImageData(0,0,c.width,c.height),data=p.data,ground=document.createElement('canvas');ground.width=ground.height=1;const gc=ground.getContext('2d');gc.drawImage(im,0,199,1,1,0,0,1,1);const sand=gc.getImageData(0,0,1,1).data;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,inside=y<80||y<96&&x<65||x<37;
    if(!inside||data[i+2]>=data[i+1]-3||data[i]===sand[0]&&data[i+1]===sand[1]&&data[i+2]===sand[2])data[i+3]=0;
  }
  g.putImageData(p,0,0);danceTreeSource=im;danceTreeCanvas=c;return c;
}
// 풀 더미는 오른쪽 밭머리(왼쪽은 뒤에서 붙는 일꾼에 가리고 세로 폰에선 화면 밖). 안 맨 풀은 꼬마와 더미 사이
const FIELD_WEEDS = [190, 204, 218, 250, 262, 274], FIELD_PILE = { x: 300, y: 164 }, FIELD_BASKET = { x: 266, y: 168 }, FIELD_BITS = ['#5d8a3a', '#86b04e', '#8a5a3c', '#b98a5e'];
function fieldPilePlace(){const edge=camX+(W-8)/(K/DPR)-24;return {...FIELD_PILE,x:(Math.min(FIELD_PILE.x,edge))};}
// 강가 배경은 30칸 오른쪽에 깐다. 세로 폰(화면 폭 180칸)에서도 그네와 앞소리꾼이 함께 들어오게
const DANCE_BG_X = 30, DANCE_SWING = { x: 56 + DANCE_BG_X, y: 42 }, DANCE_TREE_W = 85, KIND_VIEW = { forge: { left: 88, right: 330, tall: 204 }, field: { left: 88, right: 330, tall: 214 }, dance: { left: 30, right: 270, tall: 166 }, dungdang: { left: 80, right: 290, tall: 180 } }, DANCE_PETAL = ['#f4b6c8', '#fbe6ee', '#f6e7a8', '#ffffff'];
const DUNG_WATER = ['#bfe3ff', '#ffffff', '#7fb6e0', '#e8f4ff'], DUNG_SEAT = 168; // 둥당기: 물방울 빛, 앉은 사람 발 자리
const kindBits = () => ({ forge: FORGE_SPARK, field: FIELD_BITS, dance: DANCE_PETAL, dungdang: DUNG_WATER })[netKind()] || YARD_SOIL;
const kindStage = () => net.haul <= 0 ? 0 : Math.min(4, 1 + Math.floor(net.haul / 7)); // 5단계는 끝 한 방에만(운재 통나무가 개울가에 끝 한 방에만 닿는 것과 같음) // 맞힌 만큼 다섯 단계(가래질 흙 무더기와 같은 셈)
// 통나무 기준점은 당긴 만큼 x0,y0 → x1,y1(개울가)로 간다. 사람 줄은 통나무를 따라 비탈을 내려간다
// 개울가 x1은 250이었다. 한 곡 내내 36점만 가고 카메라가 절반을 따라가 화면에서 뗌 한 번 약 2px · 톡 약 1px라 「당겨서 내려갔다」가 안 보였다.
// 76점으로 늘리고(y1은 비탈 slopeY(290)+3) 맞힐 때마다 출렁임을 더한다(곡별 검수 08 R1-01)
const SLOPE_LOG = { x0: 214, y0: 174, x1: 290, y1: 189 }, SLOPE_SNOW = ['#f7f4ea', '#e3e9ec', '#c6d5de', '#ffffff'], SLOPE_RUT = '#c6d5de';
const slopeY = x => Math.round(160 + (x - 160) * .2);
// 사람이 붙는 자리(칠 곳 맞힘 수). 운재는 다섯째를 끝 한 방 앞(22)에 붙여 마지막 메김을 함께 버티게 한다(재미 F03, song.netAt)
const NET_AT = [4, 8, 12, 18, 24], NET_GAP = 30;
const netAtList = () => song?.netAt || NET_AT;
// 집터 · 산비탈 세로 판은 강 판처럼 점 배율 2부터(사람 넷과 소품이 폰 폭에 든다)
const netViewK = () => (Math.max(1, Math.min(baseK, Math.ceil(Math.min(W, H) * (net.people.length < 2 ? .21 : .17) / 35 * DPR))));
const netCaptionK = () => (Math.max(1,Math.min(baseK,['punggu','jajinari','singosan'].includes(song?.id)&&H>420?Math.floor(4*DPR):Math.ceil(Math.min(W,H)*.21/35*DPR))));
const NET_CAST = { LEAD: { x: 100, y: 162, dir: 1, bx: 0 }, FOLLOW: { x: 220, y: 162, dir: 1 }, HERO: { x: 190, y: 164, dir: 1, bx: 4 } };
const net = { haul: 0, hitT: -9, earlyT: -9, dragT: -9, handT: -9, side: null, lookT: -9, finalT: -9, power: 0, sit: false, misses: 0,
  error: null, errorN: 0, people: [], helpPending: false, helpI: null, heroPose: 'hero-hold', placeholder: false, progress: 0, creakT: -9, ropeFrom: 0, ropeStep: 0 };
function netReset() {
  Object.assign(net, { haul: 0, hitT: -9, earlyT: -9, dragT: -9, handT: -9, side: null, lookT: -9, finalT: -9, power: 0, sit: false, misses: 0,
    error: null, errorN: 0, people: [], helpPending: false, helpI: null, heroPose: 'hero-hold', progress: 0, creakT: -9, ropeFrom: 0, ropeStep: 0, endT: -9,
    motionQueue: [], motionRest: null, motionT: -9, motionBlocked: null, motionPose: null, pullDuration: null, slopeFrom: 0, hookT: -9, birdT: -9, startNudge: 0,
    clod: null, pileBumpT: -9, leaderLookT: -9, sitT: -9, digBeat: null, buildPuff: null, rut: null,
    forgeBeat: null, forgePulseT: -9, forgeRun: 0, forgeView: null });
}
const netSnapshot = () => ({ haul: net.haul, sit: net.sit, misses: net.misses, error: net.error, errorN: net.errorN, helpPending: net.helpPending, helpI: net.helpI });
function netRestore(s) { if (s) Object.assign(net, s, { finalT: -9, hitT: -9, earlyT: -9, dragT: -9, handT: -9, sitT: -9, leaderLookT: -9 }); }
let netArtPromise = null, netArtKey = null;
async function netArtReady() {
  const id = song?.net ? song.id : 'myeolchi';
  if (artNow === id) return true;
  if (netArtKey !== id) { netArtPromise = null; netArtKey = id; }
  for(const k of ['a','b','c'])if(!NET_NAMES.includes(`puller-${k}-pullbig`))NET_NAMES.push(`puller-${k}-pullbig`);
  if (!netArtPromise) netArtPromise = (async () => {
    const def = SONG_ART[id] || SONG_ART.myeolchi;
    const heroDir = `art/${song && song.heroArt || 'myeolchi'}/`;
    // 대표가 고른 아이는 heroArt 한 곳에서 바꾼다. 이름과 기준점은 같은 묶음이다
    const names = def.names.filter(n => !n.startsWith('hero-'));
    const heroNames = song?.twoHand ? [...NET_HERO_NAMES.filter(n => !['hero-brace', 'hero-shower'].includes(n)), 'hero-pullr', 'hero-cross'] : NET_HERO_NAMES; // 두 손 곡: 오른손 · 엇갈림 자세가 더 있고 꾹 · 뿌리기 자세는 없다
    const [base, heroSet] = await Promise.all([loadArtSet(def.dir, names).ready, loadArtSet(heroDir, heroNames).ready]);
    if (base.meta.bg) base.meta['net-bg'] = base.meta.bg;
    let ready = { sprites: { ...base.sprites, ...heroSet.sprites }, meta: { ...base.meta, ...heroSet.meta } };
    if (base.missing || heroSet.missing) {
      const fallback = await loadArtSet('art/ganggang/', [...WORKER_NAMES, ...RING_NAMES, 'sea-bg']).ready;
      if (fallback.missing) { netArtPromise = null; return null; }
      const map = { 'net-bg': 'sea-bg', 'hero-hold': 'hero-idle', 'hero-pull': 'hero-strike', 'hero-pullbig': 'hero-rebound', 'hero-brace': 'hero-raise', 'hero-early': 'hero-miss', 'hero-drag': 'hero-startle', 'hero-sit': 'hero-stop', 'hero-cheer': 'hero-jump', 'hero-stop': 'hero-stop',
        'leader-hold': 'leader-idle', 'leader-sing-a': 'leader-raise', 'leader-sing-b': 'leader-strike', 'leader-look': 'leader-palm', 'leader-cheer': 'leader-raise' };
      for (const k of ['a', 'b', 'c']) for (const p of ['hold', 'pull', 'cheer', 'stumble']) map[`puller-${k}-${p}`] = `ring-${k}-${({ hold: 'stand', pull: 'step-1', cheer: 'cheer', stumble: 'bump' })[p]}`;
      for(const k of ['a','b','c'])map[`puller-${k}-pullbig`]=`ring-${k}-step-1`;
      ready = { sprites: {}, meta: {} };
      for (const [n, old] of Object.entries(map)) { ready.sprites[n] = fallback.sprites[old]; ready.meta[n] = fallback.meta[old]; }
      net.placeholder = true;
    } else net.placeholder = false;
    return ready;
  })();
  const set = await netArtPromise; if (!set) return false;
  if (song && song.id === id) {
    if (artNow && artNow !== id) for (const n of SONG_ART[artNow].names) { delete SPRITES[n]; delete META[n]; }
    putArt(set, id === 'myeolchi' ? NET_NAMES : SONG_ART[id].names); artNow = id; flashCache = null;
  }
  return true;
}
function netHit(tg, power) {
  if (!netOn()) return;
  const f = performance.now() / 1000;
  net.ropeFrom=netKnotShift(f);
  if (tg.side) net.side = tg.side; // 두 손 곡: 친 손 쪽 자세 · 물방울
  if(netSlope())net.slopeFrom=slopeLogP(f);
  const fin=tg.rec?.def.finale&&Math.abs(tg.beat-tg.rec.def.finaleBeat)<.001, big=power>0||fin;
  net.forgeRun=forgeRunFor(tg);
  if(song.id==='punggu'&&net.forgeRun>=2&&!RM)setShake(net.forgeRun-1,.12);
  if (netKind() && !fin) {
    if(song.id==='punggu')sample('daljip-fire',ctx.currentTime+.03,net.forgeRun===3?.55:net.forgeRun===2?.42:.3);
    else kindAccent(netKind(), 'hit', ctx.currentTime + .03);
  }
  net.ropeStep=Math.ceil((big?80:40)/(K/DPR));
  net.hitT = f; net.power = power; net.sit = false; net.misses = 0; net.error = null; net.errorN = 0;
  net.pullDuration=netDuration(tg.rec,tg.beat,power>0?.4:.3);
  net.earlyT=net.dragT=net.lookT=-9;hero.fizzleT=-9;
  if (tg.part === '연습') return;
  net.haul = Math.min(35, net.haul + (power > 0 ? 2 : 1));
  for (const at of netAtList()) if (sc.hits >= at && !net.people.some(p => p.at === at)) {
    net.people.push({ at, t: f }); wow('net-person');
    if(at===12||at===18)net.motionQueue.push(at);
    log('net-person', { at, count: net.people.length });
    if (at === 8 || at === 18) {
      sample(netSlope() ? 'flap' : netYard() || netKind() ? 'step-soft' : `gull-${at === 8 ? 1 : 2}`, ctx.currentTime + .2, .6);
      if (netSlope()) { net.birdT = f + .2; net.birdN = at === 8 ? 3 : 5; } // 산새가 숲에서 날아오른다
    }
  }
  if (tg.rec.def.finale && Math.abs(tg.beat - tg.rec.def.finaleBeat) < .001) {
    net.finalT = f; netAccent('finale', ctx.currentTime); log('net-shore');
    // 산비탈 끝 한 방: 눈가루 60, 여운에 산새 다섯이 한 번 더 난다(재미 F02 · F03)
    if (netSlope()) { slopeSnow(60, 2.2, true); net.birdT = f + .5; net.birdN = 5; sample('flap', ctx.currentTime + .5, .5); } else if (netYard()) yardSoil(40, 2); else if (netKind()) { kindBurst(44, 2); if (netKind() === 'forge') forgeFountain(); } else netSilver(258, 152, 60, 2.2);
  } else if (power > 0) sample(netLand() ? 'shuffle' : 'splash', ctx.currentTime + .05, .5);
  // 산비탈 꾹 뗌 맞힘은 앞머리 눈가루 14 → 24(재미 F02)
  if (net.finalT !== f) { if (netYard()) yardSoil(power > 0 ? 16 : 9, power > 0 ? 1.4 : 1); else if (netSlope()) slopeSnow(power > 0 ? 24 : 8, power > 0 ? 1.4 : 1); else if (netKind()) kindBurst(song.id==='punggu'?(power>0?16+Math.round(8*clamp01(power)):[9,9,14,22][net.forgeRun]):power > 0 ? 16 : 9, power > 0 ? 1.4 : 1); }
  if (netYard() && !fin && baDone(tg)) yardClod(f); // 받음 한 묶음을 다 맞힘: 「세」에서 흙 덩이가 무더기로(재미 F02)
}
// 풍구 꾹 뗌: 밟은 0.2초 동안 풀무가 눌린다(R3-01)
function forgeStomped(f) { return !RM && net.power > 0 && f - net.hitT >= .1 && f - net.hitT < .3; }
// 풍구 끝 한 방(그래프 검수 5회차 R5-03): 가마 위로 불티 60알이 0.6 ~ 1초 솟고(forgeFountain), 대장간이 0.45초 붉게 밝아졌다 세 단계로 옅어진다(forgeGlow)
function forgeFountain() {
  if (RM) return;
  const top = anchor('furnace', 'top', [32, 6], forgePlace());
  for (let i = 0; i < 60; i++) part({ x: top.x + (Math.random() - .5) * 14, y: top.y + 4, vx: (Math.random() - .5) * 80, vy: -40 - Math.random() * 40, life: .6 + Math.random() * .4, c: FORGE_SPARK[i % 3], w: i % 3 ? 1 : 2, h: i % 4 ? 1 : 2, grav: 40, forge: 'hit' });
}
function forgeGlow(f) {
  const k = f - net.finalT; if (RM || k < 0 || k >= .45) return;
  lg.fillStyle = `rgba(255,150,60,${k < .15 ? .18 : k < .3 ? .11 : .05})`; lg.fillRect(0, 0, lg.canvas.width, lg.canvas.height);
}
// 맞힐 때 튀는 것: 대장간은 가마 입에서 불티가 위로, 밭은 호미 끝에서 흙과 풀이 앞으로, 강가는 두 손 위로 꽃잎이 흩날린다
function kindBurst(n, speed = 1) {
  const k = netKind();
  if (k === 'forge') {
    const hole = anchor('furnace', 'hole', [32, 78], forgePlace());
    for (let i = 0; i < n; i++) part({ x: hole.x + (Math.random() - .5) * 10, y: hole.y, vx: (Math.random() - .5) * 46 * speed, vy: -38 - Math.random() * 52 * speed,
      life: .4 + Math.random() * .5, c: FORGE_SPARK[i % 4], w: 1, h: i % 3 ? 1 : 2, grav: 70, forge:'hit' });
  } else if (k === 'field') {
    const x = HERO.x + 16, y = HERO.y - 2;
    for (let i = 0; i < n; i++) part({ x, y, vx: (8 + Math.random() * 34) * speed, vy: -22 - Math.random() * 36 * speed,
      life: .4 + Math.random() * .4, c: FIELD_BITS[i % 4], w: i % 3 ? 1 : 2, h: i % 4 ? 1 : 2, grav: 150 });
  } else {
    const x = HERO.x + 4, y = HERO.y - 54;
    for (let i = 0; i < n; i++) part({ x: x + (Math.random() - .5) * 24, y, vx: (Math.random() - .5) * 34 * speed, vy: -16 - Math.random() * 26 * speed,
      life: .7 + Math.random() * .6, c: DANCE_PETAL[i % 4], w: i % 3 ? 1 : 2, h: 1, grav: 28 });
  }
}
// 산비탈: 통나무가 간 몫(0~1). 맞힐 때마다 앞 자리에서 새 자리로 미끄러진다
function slopeLogP(f) {
  // 개울가(1)에는 끝 한 방에만 닿는다. 그 전에는 다 맞혀도 88%까지(꾹 성공은 2씩 쌓여 23번째에 35가 된다)
  const to = net.finalT > 0 ? 1 : .88 * clamp01(net.haul / 35), dur = net.finalT > 0 && net.finalT === net.hitT ? .7 : .28;
  const k = net.hitT < 0 ? 1 : easeOut(clamp01((f - net.hitT) / dur));
  return net.slopeFrom + (to - net.slopeFrom) * k;
}
// 맞힐 때 통나무와 사람 줄이 한 번 더 쑥 나갔다(0.08초) 0.26초에 제자리로 온다(뗌 4점 · 톡 2점 · 끝 한 방 6점, 곡별 검수 08 R1-01). 카메라는 이 출렁임을 따라가지 않는다
function slopeLurch(f) {
  const t = f - net.hitT; if (RM || net.hitT < 0 || t < 0 || t >= .26) return 0;
  const amp = net.finalT > 0 && net.finalT === net.hitT ? 6 : net.power > 0 ? 4 : 2;
  return amp * (t < .08 ? t / .08 : (1 - (t - .08) / .18) ** 2);
}
function slopeLog(f) {
  const p = slopeLogP(f), base = SLOPE_LOG.x0 + (SLOPE_LOG.x1 - SLOPE_LOG.x0) * p;
  return { x: Math.round(base + slopeLurch(f)), y: Math.round(SLOPE_LOG.y0 + (SLOPE_LOG.y1 - SLOPE_LOG.y0) * p), p, dir: 1, base: Math.round(base) };
}
// 통나무 앞머리 밑에서 눈가루가 튄다. 끝 한 방은 개울가에서 크게
function slopeSnow(n, speed = 1, wide = false) {
  const at = slopeLog(performance.now() / 1000), x = at.x + 40, y = at.y + 2;
  for (let i = 0; i < n; i++) part({ x: x - (wide ? Math.random() * 60 : 0), y, vx: (wide ? (Math.random() - .3) * 60 : 8 + Math.random() * 30) * speed, vy: -20 - Math.random() * 38 * speed,
    life: .45 + Math.random() * .45, c: SLOPE_SNOW[i % 4], w: i % 3 ? 1 : 2, h: i % 4 ? 1 : 2, grav: 130 });
}
function netMiss(kind) {
  if (!netOn()) return;
  const f = performance.now() / 1000;
  if (kind === 'early') { net.earlyT = f; net.lookT = f + .04; }
  else if (kind === 'hand') { net.handT = f; net.lookT = f + .04; }
  else if (kind !== 'spoiled') net.dragT = f;
  net.misses = kind === 'none' ? net.misses + 1 : 0;
  // 이어 두 번 놓쳐 엉덩방아를 찧는 순간: 앞소리꾼이 0.6초 돌아보고(집터 재미 F04를 줄 판 여섯 곡 모두로), 발밑 먼지 6알과 엉덩이 닿는 소리(멸치는 물소리, 땅 판은 발소리. 그래프 검수 4회차 R1-04)
  if (net.misses >= 2 && !net.sit) {
    net.leaderLookT = net.sitT = f;
    if (!RM) dust(HERO.x, HERO.y, 6);
    if (ctx) sample(netLand() ? 'step-soft' : 'flop', ctx.currentTime + .1, .8);
  }
  if (net.misses >= 2) net.sit = true;
  // 산비탈: 놓치면 고랑은 안 늘고 꼬마 발밑에서 눈가루 셋이 뒤로 튄다(미끄러짐, 재미 F02)
  if (netSlope() && kind !== 'spoiled' && !RM) for (let i = 0; i < 3; i++) part({ x: HERO.x - 4, y: HERO.y - 1, vx: -14 - Math.random() * 22, vy: -10 - Math.random() * 16,
    life: .35 + Math.random() * .2, c: SLOPE_SNOW[i % 4], w: 1, h: 1, grav: 120 });
  if (net.error === kind) net.errorN++; else { net.error = kind; net.errorN = 1; }
  if (net.errorN >= 2) net.helpPending = true;
  if (ctx && kind !== 'spoiled') sample('creak', ctx.currentTime, .65);
}
// 가래 날에서 흙이 오른쪽 뒤 무더기 쪽으로 튄다
function yardSoil(n, speed = 1) {
  const x = yardGaraePlace().x + 4, y = yardGaraePlace().y - 8;
  for (let i = 0; i < n; i++) part({ x, y, vx: (10 + Math.random() * 34) * speed, vy: -25 - Math.random() * 40 * speed,
    life: .45 + Math.random() * .4, c: YARD_SOIL[i % 4], w: i % 3 ? 1 : 2, h: i % 4 ? 1 : 2, grav: 150 });
}
function netSilver(x, y, n, speed = 1) {
  for (let i = 0; i < n; i++) part({ x, y, vx: (Math.random() - .5) * 70 * speed, vy: -15 - Math.random() * 35 * speed,
    life: .4 + Math.random() * .5, c: pick(['#f9faf0', '#c9e1df', '#90b6c9']), w: i % 3 ? 1 : 2, h: 1, grav: 120 });
}
function netBar(rec) {
  if (!netOn() || !ctx) return;
  if (rec.def.rest) { sample('step-soft', rec.t0, .24, band); log('rest-step', { t: rec.t0, i: rec.def.i }); }
  if (!rec.def.call && rec.def.clip && net.helpPending) { net.helpI = rec.def.i; net.helpPending = false; }
  if (rec.def.call && rec.def.i % 3 === 1 && !netLand()) sample(`wave-${Math.floor(rec.def.i / 3) % 2 + 1}`, rec.t0 + .2, .5, music);
}
function netAccent(kind, t, v) {
  // 산비탈: 꾹 누르면 깍장쇠가 나무에 박힌다
  if (netSlope() && kind === 'charge') { net.hookT = performance.now() / 1000; sample('pull-soft', t, .7); sample('creak', t + .05, .5); return; }
  if (netKind()) { kindAccent(netKind(), kind, t); return; }
  if (netLand() && kind !== 'charge' && kind !== 'full' && kind !== 'cheer') {
    if (kind === 'burst' || kind === 'level') { sample('pull', t, .8); sample('shuffle', t + .08, .55); }
    else if (kind === 'finale') { sample('pull', t, 1.2); sample('shuffle', t + .12, .9); sample('clap', t + .5, .7); sample('clap-2', t + .9, .6); }
    else if (kind === 'seal') { sample('pull', t, .9); sample('shuffle', t + .15, .7); }
    else if (kind === 'enter') sample('step-soft', t, .5);
    return;
  }
  if (kind === 'charge' || kind === 'full') sample('creak', t, kind === 'charge' ? .8 : 1);
  else if (kind === 'burst' || kind === 'level') { sample('pull', t, .8); sample('splash', t + .08, .5); }
  else if (kind === 'finale') { sample('pull', t, 1.2); sample('splash', t + .12, .85); sample('flop', t + .4, .9); sample('flop', t + 1.1, .7); sample('gull-1', t + 1.6, .7); }
  else if (kind === 'cheer') sample('pull-soft', t, .7);
  else if (kind === 'seal') { sample('pull', t, .9); sample('flop', t + .15, .7); }
  else if (kind === 'enter') sample('wave-1', t, .6, music);
}
// 북쪽 세 곡의 소리: 꾹은 발판 삐걱 · 호미 끌림 · 발 디딤, 맞히면 쿵+불 · 쿵+풀 · 손뼉
function kindAccent(k, kind, t) {
  if (kind === 'charge' || kind === 'full') { sample(k === 'forge' ? 'creak' : k === 'field' ? 'shuffle' : 'step-soft', t, kind === 'charge' ? .6 : .8); return; }
  if (kind === 'cheer') { sample('clap', t, .6); return; }
  if (kind === 'hit') { sample(k === 'forge' ? 'daljip-fire' : k === 'field' ? 'straw-1' : 'step-soft', t, k === 'forge' ? .3 : .45); return; }
  if (kind === 'burst' || kind === 'level') {
    if (k === 'forge') { sample('flail-2', t, .75); sample('daljip-fire', t + .05, .55); }
    else if (k === 'field') { sample('flail-2', t, .6); sample('straw-1', t + .04, .7); }
    else { sample('clap', t, .7); sample('step-soft', t + .03, .5); }
  } else if (kind === 'finale') {
    if (k === 'forge') { sample('flail-1', t, 1.1); sample('daljip-fire', t + .05, 1); sample('whoosh', t + .3, .7); }
    else if (k === 'field') { sample('flail-1', t, 1); sample('straw-2', t + .08, .9); }
    else { sample('clap', t, 1); sample('clap-3', t + .12, .9); }
    sample('clap', t + .6, .7); sample('clap-2', t + 1, .6);
  } else if (kind === 'seal') sample(k === 'dance' ? 'clap' : 'flail-2', t, .8);
  else if (kind === 'enter') sample('step-soft', t, .5);
}
// 2점 줄을 손 기준에서 다음 손 기준으로 잇는다. 줄 무늬는 맞힌 만큼 왼쪽으로 간다
function netLine(a, b, f, wobble = false, knots = false) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x-a.x, b.y-a.y)));
  for (let i = 0; i <= n; i++) {
    const k = i/n, x = a.x+(b.x-a.x)*k, y = a.y+(b.y-a.y)*k + (wobble ? Math.sin(k*18+f*25)*2*Math.sin(k*Math.PI) : 0);
    lg.fillStyle = (Math.floor(x + net.haul * 3) % 8 < 2) ? '#9b7450' : '#6f4a33';
    lg.fillRect(Math.round(x-vx), Math.round(y-vy), 2, 2);
  }
  if (knots) {
    const shift = netKnotShift(f), start = ((a.x + shift) % 12 + 12) % 12;
    for (let x = a.x + (12-start)%12; x <= b.x; x += 12) {
      const t = (x-a.x)/(b.x-a.x || 1), y = a.y+(b.y-a.y)*t;
      lg.fillStyle = '#c29b69'; lg.fillRect(Math.round(x-vx)-1, Math.round(y-vy)-1, 3, 4);
      lg.fillStyle = '#68442e'; lg.fillRect(Math.round(x-vx), Math.round(y-vy), 1, 2);
    }
  }
}
const netPulse = (t, f, duration) => t < 0 || f < t || f-t >= duration ? 0 : Math.sin(Math.PI*(f-t)/duration);
function netDuration(rec,strike,duration){
  const later=rec?.def.strikes?.find(s=>s>strike+1e-9);
  let interval=later===undefined?Infinity:(later-strike)*rec.beat;
  const at=rec?rec.t0+strike*rec.beat:Infinity;
  for(const t of targets)if(t.t>at+1e-9)interval=Math.min(interval,t.t-at);
  return interval<duration?interval*.8:duration;
}
function netBeatPull(rec,vt){
  if(!rec||rec.def.call||rec.def.rest)return false;
  return rec.def.strikes.some(s=>{const dt=vt-rec.t0-s*rec.beat;return dt>=-1e-9&&dt<netDuration(rec,s,.3)-1e-9;});
}
function netPull(f) {
  const final = net.finalT > 0 && f-net.finalT < .46;
  const duration=final ? .46 : net.pullDuration??(net.power>0?.4:.3);
  return { duration, active:net.hitT>=0&&f>=net.hitT&&f-net.hitT<duration-1e-9 };
}
function netKnotShift(f) {
  const {duration} = netPull(f);
  return net.ropeFrom + (net.hitT < 0 ? 0 : net.ropeStep*easeOut(clamp01((f-net.hitT)/Math.min(.2,duration*.5))));
}
function netTug(f) {
  if(net.finalT===net.hitT)return Math.round(netPulse(net.hitT,f,.18)*4);
  return Math.round(netPulse(net.hitT,f,netPull(f).duration)*(net.power>0?6:4));
}
// 0이면 빈 끝자락, 35이면 원래 그물 한 덩이. 물고기 수와 가로·세로 모두 누적 당김을 따른다.
function netCatchSize(haul) {
  const ratio = clamp01(haul/35);
  return { ratio, width: haul>0?48+24*ratio:8, height: haul>0?16+8*ratio:3, silver: Math.round(60*ratio) };
}
function netLandingTime(rec) {
  if (net.finalT > 0) return net.finalT;
  if (rec?.def.outro && ctx && heardNow() >= rec.t0+rec.def.finaleBeat*rec.beat) return performance.now()/1000-(heardNow()-rec.t0-rec.def.finaleBeat*rec.beat);
  return state === 'end' ? performance.now()/1000-1 : -9;
}
const netBottoms=new WeakMap();
const netLefts=new WeakMap();
const netFeet=new WeakMap();
function netBodyLeft(p) {
  const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m)return p.x-8;
  let left=netLefts.get(im);
  if(left===undefined){
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,c.width,c.height).data;left=c.width;
    for(let xx=0;xx<c.width&&left===c.width;xx++)for(let y=0;y<c.height;y++)if(d[(y*c.width+xx)*4+3]){left=xx;break;}
    netLefts.set(im,left);
  }
  return p.x-m.foot[0]+left;
}
function netBodyBottom(p) {
  const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m)return p.y;
  let bottom=netBottoms.get(im);
  if(bottom===undefined){
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,c.width,c.height).data;bottom=0;
    for(let y=c.height-1;y>=0&&!bottom;y--)for(let xx=0;xx<c.width;xx++)if(d[(y*c.width+xx)*4+3]){bottom=y+1;break;}
    netBottoms.set(im,bottom);
  }
  return p.y-m.foot[1]+bottom;
}
function netFootRect(p){
  const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m?.foot)return null;
  let r=netFeet.get(im);
  if(!r){
    const bottom=netBodyBottom(p)-p.y+m.foot[1],c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;
    let left=c.width,right=0;for(let y=Math.max(0,bottom-4);y<bottom;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);}
    r={left,right,top:bottom-4,bottom};netFeet.set(im,r);
  }
  return{x:p.x-m.foot[0]+r.left,y:p.y-m.foot[1]+r.top,w:r.right-r.left,h:r.bottom-r.top};
}
function drawNetCatch(f, landedAt, bodies, paint=true) {
  if (landedAt < 0) return null;
  const size=netCatchSize(net.haul), settled=f-landedAt>=.65-1e-9, im=SPRITES.catch;
  const foot=Math.max(...bodies.map(p=>toCssY(netBodyBottom(p))));
  let w=Math.round(size.width),h=Math.round(size.height),x,y;
  const dot=K/DPR,gap=8/dot,feet=bodies.map(netFootRect).filter(Boolean);
  // 아래끝을 화면 안에 묶으면 앞줄 발에 닿을 수 있다. 오른쪽 끝에서 비율을 지켜 빈 모래밭에 담는다.
  for(;;){
    y=Math.min(Math.ceil(vy+(foot+16)/dot),Math.floor(vy+(H-12)/dot)-h);x=Math.round(vx+VW-w-Math.max(4,Math.ceil(gap)));
    if(w<=8||feet.every(r=>x+w<=r.x-gap||x>=r.x+r.w+gap||y+h<=r.y-gap||y>=r.y+r.h+gap))break;
    w--;h=Math.max(3,Math.round(w*size.height/size.width));
  }
  const X=Math.round(x-vx),Y=Math.round(y-vy); // 무대 올림의 소수점에도 점이 번지지 않게
  if(paint && settled && im && net.haul>0) lg.drawImage(im,0,0,im.width,im.height,X,Y,w,h); // 하나도 못 당기면 그물은 바다에 남는다(「그물이 꿈쩍도 안 하네」)
  if (paint && settled && net.haul && Math.floor(f*7)%2) {
    lg.fillStyle='#f5f6e8'; for(let i=0;i<size.silver;i++)lg.fillRect(X+2+(i*11)%Math.max(1,w-4),Y+1+(i*7)%Math.max(1,h-2),1,1);
  }
  return {x,y,width:w,height:h,silver:size.silver,visible:settled&&net.haul>0,knot:netCatchKnot(im,x,y,w,h)};
}
const netCatchKnots=new WeakMap();
function netCatchKnot(im,x,y,w,h){
  if(!im)return{x:x+Math.round(w*.5),y:y+Math.round(h*.1)};
  let sizes=netCatchKnots.get(im);if(!sizes){sizes=new Map();netCatchKnots.set(im,sizes);}
  const key=`${w},${h}`;let knot=sizes.get(key);
  if(!knot){
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(im,0,0,w,h);
    const d=g.getImageData(0,0,w,h).data;let distance=Infinity;knot={x:Math.round(w*.5),y:Math.round(h*.1)};
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(d[(yy*w+xx)*4+3]){const v=Math.hypot(xx-w*.5,yy-h*.1);if(v<distance){distance=v;knot={x:xx,y:yy};}}
    sizes.set(key,knot);
  }
  return{x:x+knot.x,y:y+knot.y};
}
let netBgSource = null, netBgCanvas = null, netSeaLight = null, netGround = '#d9d2bd', netSky = null;
function netBackdrop() {
  const im = SPRITES['net-bg']; if (!im) return null;
  if (netBgSource === im) return netBgCanvas;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const p = x.getImageData(0, 0, c.width, c.height), d = p.data, rgb = [d[0], d[1], d[2]];
  const at = ((c.height - 1)*c.width+4)*4; netGround = `rgb(${d[at]},${d[at+1]},${d[at+2]})`; netSky = `rgb(${rgb.join(',')})`;
  // 바다 색 점만 밝힌다. 돌담·갯바위와 네모 덧칠의 세로 이음선을 남기지 않는다.
  netSeaLight=document.createElement('canvas');netSeaLight.width=c.width;netSeaLight.height=c.height;
  const sea=netSeaLight.getContext('2d'),light=sea.createImageData(c.width,c.height);
  const waterColors=new Set([90,112].map(y=>{const i=(y*c.width+220)*4;return `${d[i]},${d[i+1]},${d[i+2]}`;}));
  for(let y=80;y<Math.min(125,c.height);y++)for(let xx=0;xx<c.width;xx++){
    const i=(y*c.width+xx)*4;
    if(waterColors.has(`${d[i]},${d[i+1]},${d[i+2]}`)){light.data[i]=192;light.data[i+1]=229;light.data[i+2]=224;light.data[i+3]=255;}
  }
  sea.putImageData(light,0,0);
  for (let i = 0; i < d.length; i += 4) if (d[i] === rgb[0] && d[i+1] === rgb[1] && d[i+2] === rgb[2]) d[i+3] = 0;
  x.putImageData(p, 0, 0); netBgSource = im; netBgCanvas = c; return c;
}
function netProgress(rec, vt) {
  if (state === 'end') return 1;
  if (state !== 'song' || !rec) return 0;
  const before = songBars.slice(0, Math.max(0, rec.def.i)).reduce((n, b) => n + barSpan(b), 0);
  return clamp01((before + Math.max(0, vt - rec.t0)) / songBars.reduce((n, b) => n + barSpan(b), 0));
}
function drawNetBg(f, rec, vt, landingCatch) {
  const p = net.progress = netProgress(rec, vt), mood = mixMood([232, 193, 166, 0, 0, 0, 0], MOOD_DAY, step6(p));
  lg.fillStyle = moodSky(mood); lg.fillRect(0, 0, VW, VH);
  const im = netBackdrop();
  lg.fillStyle = netGround; lg.fillRect(0, Math.max(0, 126-vy), VW, VH);
  if (im) {
    lg.drawImage(im, -vx, -vy);
    if (vx < 0) { lg.save(); lg.translate(-vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
    if (vx + VW > 320) { lg.save(); lg.translate(640-vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
  }
  // 해는 수평선 오른쪽에서 한 판 동안 오른다. 바다와 모래의 밝음은 그물 거리와 함께 쌓인다
  const smallSun=captionDLive()&&song.id==='myeolchi'&&H<=420;
  let sunNotes=[];
  if(smallSun){
    const w=Math.min(W-32,360),s=getComputedStyle(elCombo);
    const line=parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.3,border=(parseFloat(s.borderTopWidth)||0)+(parseFloat(s.borderBottomWidth)||0);
    const pulse=Math.ceil((line+border)*.3/2);
    sunNotes=['me','ba'].flatMap(who=>{const slot=captionD.slots[who];if(!slot)return[];const x=Math.max(16,Math.min(W-w-16,slot.x+slot.w/2-w/2));return[{x,y:8,w,h:Math.max(0,slot.y-(who==='ba'?40:12)+pulse-8)}];});
  }
  // 이 곡의 안내는 말풍선에 붙으므로 옛 상단 안내 칸 대신 두 말풍선 위 묶음의 실제 자리를 비운다.
  const sun=captionDPropGroup('net-sun',{x:Math.min(263,vx+VW-20),y:Math.round(82-p*32)},{x:253,y:40,w:20,h:52,...smallSun?{axis:'x',keepInside:true,omitNotice:true,extraBlocks:sunNotes}:{}}),sunY=sun.y,sunX=sun.x;
  lg.fillStyle = '#f3d18c'; lg.fillRect(sunX-vx-6, sunY-vy-4, 12, 8); lg.fillRect(sunX-vx-4, sunY-vy-6, 8, 12);
  const shore = clamp01(net.haul/35);
  if(netSeaLight){
    lg.save();lg.globalAlpha=+( .08+shore*.18).toFixed(2);lg.drawImage(netSeaLight,-vx,-vy);
    if(vx<0){lg.translate(-vx,-vy);lg.scale(-1,1);lg.drawImage(netSeaLight,0,0);lg.setTransform(1,0,0,1,0,0);}
    if(vx+VW>320){lg.setTransform(-1,0,0,1,640-vx,-vy);lg.drawImage(netSeaLight,0,0);}
    lg.restore();
  }
  const wave = RM ? 0 : Math.floor(f*2)%3;
  lg.fillStyle = '#eff0dc';
  for (let x = Math.max(150, vx); x < vx+VW; x += 11) lg.fillRect(Math.round(x-vx), 125-vy+((x+wave)%3), 6, 1);
  if (rec && rec.def.scene === 'teu') {
    const teu=captionDArtworkGroup('teu',{x:224,y:99},[{pose:'teu',x:224,y:99}],8);
    spr('teu',teu.x,teu.y+(RM?0:Math.round(Math.sin(f*2))));
    for (let i = 0; i < 10; i++) { lg.fillStyle = i%2 ? '#f5f6e7' : '#aacfd4'; lg.fillRect(teu.x+11+i*3-vx,teu.y+(i%3)*2-vy, 2, 1); }
  }
  const landedAt=netLandingTime(rec),landed = landedAt>0&&net.haul>0;
  const landing=landed?(f-landedAt>=.65-1e-9?1:clamp01((f-landedAt)/.65)):0;
  const water=captionDPropGroup('water-net',{x:Math.min(vx+VW-23,294-shore*24)-netTug(f),y:102+shore*22},{x:194,y:70,w:145,h:76,allowOutside:true});
  // 첫 받음부터 몸통 2/3을 보이고, 맞힌 만큼 17점 더 다가온다.
  if(song.id==='myeolchi'&&W>=900)water.x=Math.min(water.x,vx+VW-8-shore*17-netTug(f));
  const nx=water.x,ny=water.y;
  const beforeFloats = state !== 'end' && (!rec || rec.def.intro || rec.def.clip === 'V5-054-003' || rec.def.rest && lastSceneBefore(rec.def.i) === 'teu');
  const opening = rec && rec.def.scene === 'floats' ? easeOut(clamp01((vt-rec.t0)/2)) : beforeFloats ? .15 : 1;
  const body=SPRITES['net-body'];let bodyRect=null;
  if(body&&(opening>.15||landed)&&landing<1){
    const open=landed?1:opening;
    const w=Math.round(48*open+(landingCatch?landingCatch.width-48*open:0)*landing),h=Math.round(16+(landingCatch?landingCatch.height-16:0)*landing);
    const x=Math.round(nx-24*opening+(landingCatch?landingCatch.x-(nx-24*opening):0)*landing),y=Math.round(ny-8+(landingCatch?landingCatch.y-(ny-8):0)*landing);
    lg.drawImage(body,0,0,body.width,body.height,Math.round(x-vx),Math.round(y-vy),w,h);
    // 위 1/3은 드러내고 물속 부분은 불투명한 물결 무늬로 가린다.
    if(!landed){lg.fillStyle='#aacfd4';for(let yy=y+5;yy<y+h;yy+=3)for(let xx=x+(yy%2)*3;xx<x+w;xx+=6)lg.fillRect(Math.round(xx-vx),Math.round(yy-vy),Math.min(3,x+w-xx),1);}
    bodyRect={x,y,width:w,height:h,aboveWater:Math.min(5,h),visibleHeight:h*(K/DPR)};
  }
  const points = [];
  for (let i = 0; i < 9 && !landed; i++) {
    const a = Math.PI*(.08+i*.84/8), x = nx+Math.cos(a)*25*opening, y = ny-Math.sin(a)*13*opening;
    const at = { x:Math.round(x+(landingCatch?landingCatch.x+landingCatch.width*(1-i/8)-x:0)*landing), y:Math.round(y+(landingCatch?landingCatch.y-y:0)*landing) };
    if (points.length) netLine(points.at(-1), at, f); points.push(at);
    spr('float', Math.round(at.x), Math.round(at.y));
  }
  if (!landed) {
    const count = Math.floor(sc.hits*1.4);
    for (let i = 0; i < count; i++) { lg.fillStyle = (i+Math.floor(f*4))%3 ? '#bdd8d9' : '#f2f5ea'; lg.fillRect(Math.round(nx-18+(i*17)%36-vx), Math.round(ny-4+(i*7)%9-vy), 2, 1); }
  }
  const gulls = sc.hits >= 18 ? 4 : sc.hits >= 8 ? 2 : 0;
  for (let i=0;i<gulls;i++) {
    const angle = RM ? i : (landed ? net.finalT : f)*.9+i*Math.PI/2;
    const down = landed ? RM ? 1 : easeOut(clamp01((f-net.finalT-.25)/1.3)) : 0;
    const flyX = Math.min(vx+VW-23,294-shore*24)-netTug(f)+Math.cos(angle)*29, flyY = 76+Math.sin(angle)*7+i*3;
    const x = flyX+(Math.min(238+i*13,vx+VW-12)-flyX)*down, y = flyY+(157-flyY)*down;
    const gull=captionDPropGroup('gull-flight',{x,y},{x:210,y:56,w:140,h:120,allowOutside:true});
    spr(`gull-${down===1 || RM ? 1 : Math.floor(f*5+i)%2+1}`,Math.round(gull.x),Math.round(gull.y));
  }
  net.waterGeometry={points:points.map(p=>({...p})),curves:Math.max(0,points.length-1),landing,body:bodyRect};
  return landed?(landing===1?landingCatch.knot:bodyRect&&netCatchKnot(body,bodyRect.x,bodyRect.y,bodyRect.width,bodyRect.height)):points.at(-1);
}
function netHeroPose(f, i=4+net.people.length) {
  if (net.finalT > 0 && f-net.finalT < .46) return 'hero-pullbig';
  if (netProud(net,f)) return 'hero-proud';
  if ((net.finalT > 0 || state === 'end') && netJoy(i, f)) return 'hero-cheer';
  if (net.sit || state === 'end' && netYard() && yardNoHits()) return 'hero-sit'; // 집터 0곳: 끝 화면에서 엉덩방아(곡별 검수 07 R1-06)
  if (f-net.earlyT < .45) return 'hero-early';
  if (f-net.handT < .5) return SPRITES['hero-cross'] ? 'hero-cross' : 'hero-drag'; // 두 손 곡: 손을 잘못 골랐다(박 틀림과 다른 자세)
  if (f-net.dragT < .5) return 'hero-drag';
  if (f-hero.fizzleT < .5) return 'hero-stop';
  if (charge && !charge.pending) return 'hero-brace';
  if (f-hero.stopT < .45) return 'hero-stop'; // 메길 때 치면 꼬마도 멈칫(그래프 검수 3회차 R1-07. 꾹 버팀 뒤라 꾹 시작 손은 그대로)
  if (netPull(f).active) return net.power > 0 ? 'hero-pullbig' : net.side === 'R' && SPRITES['hero-pullr'] ? 'hero-pullr' : 'hero-pull';
  if(net.motionPose)return net.motionPose;
  return 'hero-hold';
}
// 꼬마 틀림 몸짓 자리(그래프 검수 4회차, 기획서 틀림 표 · 손맛-소리 12절): 일찍은 혼자 당겨 뒤로 4점 휘청하며 ±2점 세 번 흔들리고(0.3초),
// 늦거나 놓치면 줄에 끌려 앞으로 5점(더 크면 옆 사람 얼굴을 덮는다), 메길 때 치면 깜짝 6점 뛴다. 집터 · 김매기 맞힘은 발은 두고 윗몸만 2점 기울인다(멸치 발 고정 결정과 같은 꼴)
// hold까지는 끝 자리에 머문다(실수 뒤 0.25초 사진에도 몸짓이 보이게, 그래프 검수 4회차 인물 · 웃음)
const oopsBump = (t, rise, end, hold = rise) => t < 0 || t >= end ? 0 : t < rise ? easeOut(t / rise) : t < hold ? 1 : 1 - (t - hold) / (end - hold);
function netHeroOops(f, pose) {
  if (RM) return null;
  const e = f - net.earlyT, d = f - net.dragT, s = f - hero.stopT, t = f - net.hitT, k = f - net.sitT;
  if (pose === 'hero-early' && e >= 0) return { dx: -Math.round(4 * oopsBump(e, .1, .45, .25)) + (e < .3 ? Math.round(2 * Math.sin(e * 20 * Math.PI)) : 0), dy: 0 };
  // 풍구 끌림 그림은 몸이 서 있기 그림보다 3점 뒤(왼쪽)에 그려져 있어 그 3점을 먼저 메운다(그래프 검수 6회차 R3-03: 5점을 밀어도 몸은 2점만 움직였다)
  if (pose === 'hero-drag' && d >= 0) { const q = oopsBump(d, .12, .5, .28); return { dx: (netKind() === 'forge' ? 3 : 0) + Math.round(5 * q), dy: Math.round(q) }; }
  // 엉덩방아: 발이 미끄러져 몸이 3점 떴다가 털썩(0.16초)
  if (pose === 'hero-sit' && k >= 0 && k < .16) return { dx: 0, dy: -Math.round(3 * Math.sin(Math.PI * k / .16)) };
  if (pose === 'hero-stop' && s >= 0 && s < .3) return { dx: 0, dy: -Math.round(6 * Math.sin(Math.PI * s / .3)) };
  // 풍구 꾹 뗌(그래프 검수 5회차 R3-01): 4점 뛰어올랐다가 풀무를 밟고, 발판이 1점 눌리며 윗몸이 3점 눌렸다 편다(0.3초)
  if (netKind() === 'forge' && pose === 'hero-pullbig' && t >= 0 && t < .3) {
    if (t < .1) return { dx: 0, dy: -Math.round(4 * Math.sin(Math.PI / 2 * t / .1)), squash: 0 };
    if (t < .16) { const k = (t - .1) / .06; return { dx: 0, dy: Math.round(-4 + 5 * k), squash: Math.round(3 * k) }; }
    return { dx: 0, dy: 1, squash: Math.round(3 * (1 - (t - .16) / .14)) };
  }
  // 자진아리 꾹 뗌(그래프 검수 8회차 R3-01): 앞으로 2점 기울인 채 윗몸이 4점 눌렸다가 0.3초에 편다. 발은 그대로
  if (netKind() === 'field' && pose === 'hero-pullbig' && t >= 0 && t < .3) return { dx: 0, dy: 0, lean: t < .2 ? -2 : -1, squash: t < .1 ? 4 : Math.round(4 * (1 - (t - .1) / .2)) };
  if ((netYard() || netKind() === 'field') && /^hero-pull/.test(pose) && t >= 0 && t < .3) return { dx: 0, dy: 0, lean: (netYard() ? 1 : -1) * (t < .2 ? 2 : 1) };
  return null;
}
function netStopMotion(){
  const work=netOn()?net:boatOn()?boat:null;if(!work||state!=='song')return;
  work.motionT=-9;work.motionPose=null;
  const rec=currentRec(heardNow());if(rec?.def.rest)work.motionBlocked=rec.def.i;
}
function netMotion(work,f,rec,duration,kind){
  work.motionPose=null;
  const vt=ctx?heardNow()-OFFSET:0,tail=rec&&!rec.def.call&&rec.def.strikes?.length&&vt>=rec.t0+rec.def.strikes.at(-1)*rec.beat+.22;
  const room=rec&&(work.motionRest===rec.def.i||barEnd(rec)-vt>=duration+.05);
  if(state!=='song'||!rec||!(rec.def.rest||tail&&room)){work.motionT=-9;return;}
  if(work.motionRest!==rec.def.i){
    work.motionRest=rec.def.i;
    const at=work.motionQueue.shift();
    if(at!==undefined){work.motionAt=at;work.motionLogged=false;work.motionT=Math.max(f,work.hitT+(kind==='shower'?netPull(f).duration:.46));}
  }
  if(charge||work.motionBlocked===rec.def.i){work.motionT=-9;return;}
  const t=f-work.motionT;if(work.motionT<0||t<0||t>=duration-1e-9)return;
  if(!work.motionLogged){
    work.motionLogged=true;log(kind==='shower'?'net-shower':'boat-wave',{at:work.motionAt,hits:sc.hits,i:rec.def.i,t:heardNow()});
    if(kind==='shower'&&ctx)sample('flop',ctx.currentTime,.35);
  }
  work.motionPose=kind==='shower'?'hero-shower':`hero-wave-${Math.floor((t+1e-9)/.15)%2?'b':'a'}`;
}
function netClearRects(child,keys){
  const m=META[child.pose],pad=Math.ceil(8/(K/DPR)),mouth=m?.mouth||[26,46],face=m?.face||[mouth[0]-16,mouth[1]-20,36,25],ft=m?.foot||[21,59];
  return[{x:child.x-ft[0]+face[0]-pad,y:child.y-ft[1]+face[1]-pad,w:face[2]+pad*2,h:face[3]+pad*2},...keys.map(key=>{const h=anchor(child.pose,key,[18,48],child);return{x:h.x-3-pad,y:h.y-3-pad,w:7+pad*2,h:7+pad*2};})];
}
function netClipRects(rects){for(const r of rects){lg.beginPath();lg.rect(0,0,VW,VH);lg.rect(Math.floor(r.x-vx),Math.floor(r.y-vy),Math.ceil(r.w),Math.ceil(r.h));lg.clip('evenodd');}}
// 줄꾼이 자막을 비킨 뒤에도 앞소리꾼 얼굴과 손은 앞에서 보인다.
function netLeaderDepth(bodies){
  if(!['myeolchi','garae'].includes(song.id))return; // 가래질: 자막을 비킨 줄꾼이 앞소리꾼 쪽으로 밀려도 앞소리꾼 얼굴 · 손은 앞에(곡별 검수 07 R1-05)
  const lead=bodies.find(p=>p.name==='leader'),clear=netClearRects(lead,['handL','handR']);
  for(const p of bodies){
    if(p===lead||p.name==='hero')continue;
    const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m?.foot)continue;
    const ink=learnOpaque(im);
    const box={x:p.x-m.foot[0]+ink.left,y:p.y-m.foot[1]+ink.top,w:ink.right-ink.left,h:ink.bottom-ink.top};
    p.behindLeader=clear.some(r=>box.x<r.x+r.w&&box.x+box.w>r.x&&box.y<r.y+r.h&&box.y+box.h>r.y);
    if(p.behindLeader)p.depth=Math.min(p.y,lead.y-1);
  }
}
// 구덕 입구의 멸치는 기존 7×3 그림을 정수 점으로 세워 쌓는다.
function drawNetBasket(child,f){
  const fish=[];
  if(song.id!=='myeolchi'||learning||!['song','end'].includes(state)||child.pose==='hero-shower')return fish;
  const im=SPRITES.anchovy,point=META[child.pose]?.basket;if(!im||!point)return fish;
  const n=[0,1,3,5,8][Math.min(4,Math.floor(net.haul/7))],at=anchor(child.pose,'basket',point,child);
  const jump=RM?0:net.power>0?Math.round(netPulse(net.hitT,f,.12)):Math.round(netPulse(net.hitT,f,.12)*2);
  const slot=captionDLive()&&captionD.slots.ba,dot=K/DPR;
  for(let i=0;i<n;i++){
    const x=Math.round(at.x-(n-1)*1.5+i*3),hops=net.power>0||i===n-1;let rest=Math.round(at.y);
    // 뜀의 꼭대기까지 종이 아래에 들도록 바닥을 정한 뒤 뛴다. 뜀을 잘라 1점으로 만들지 않는다.
    if(slot?.side==='up'&&(x-vx+2)*dot>slot.x-8&&(x-vx-1)*dot<slot.x+slot.w+8)rest=Math.max(rest,Math.ceil((slot.tip.y+1)/dot+vy+im.width)+(hops&&!RM?(net.power>0?1:2):0));
    const y=rest-(hops?jump:0);
    lg.save();lg.translate(Math.round(x-vx),Math.round(y-vy));lg.rotate(-Math.PI/2);lg.drawImage(im,0,-1);lg.restore();
    fish.push({x:x-1,y:y-7,w:3,h:7});
  }
  return fish;
}
const netBraceImages=new WeakMap();
function drawNetBrace(p){
  const im=SPRITES[p.pose],m=META[p.pose];let leaned=netBraceImages.get(im);
  if(!leaned){
    leaned=document.createElement('canvas');leaned.width=im.width;leaned.height=im.height;
    const g=leaned.getContext('2d');
    for(let y=0;y<im.height;y++)g.drawImage(im,0,y,im.width,1,y<m.foot[1]-24?-1:0,y,im.width,1);
    netBraceImages.set(im,leaned);
  }
  lg.drawImage(leaned,Math.round(p.x-vx-m.foot[0]),Math.round(p.y-vy-m.foot[1]));
}
// 집터 줄꾼 그림: lean 1 · 2는 몸 윗부분을 뒤(왼쪽)로 1 · 2점 기울이고(꾹 버티기, 재미 F01), dim은 뒷줄을 10% 어둡게 칠한다(R1-05)
const netBodyCache=new Map();
// squash: 허리(발 위 14점) 위를 그만큼 내려 그려 윗몸이 눌린다(풍구 꾹 뗌 밟기, 그래프 검수 5회차 R3-01)
function netBodyImage(pose,lean=0,dim=false,squash=0){
  const im=SPRITES[pose],m=META[pose];if(!im||!m?.foot||(!lean&&!dim&&!squash))return im;
  const key=`${pose}|${lean}|${dim}|${squash}`;let c=netBodyCache.get(key);if(c&&c.src===im)return c;
  c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.src=im;const g=c.getContext('2d');
  const s=Math.sign(lean),a=Math.abs(lean); // 음수면 앞(오른쪽)으로 기울인다(그래프 검수 4회차: 김매기 맞힘)
  for(let y=0;y<im.height;y++)g.drawImage(im,0,y,im.width,1,y<m.foot[1]-36&&a>1?-2*s:y<m.foot[1]-24&&a?-s:0,y+(squash&&y<m.foot[1]-14?squash:0),im.width,1);
  if(dim){g.globalCompositeOperation='source-atop';g.fillStyle='rgba(0,0,0,.1)';g.fillRect(0,0,c.width,c.height);}
  netBodyCache.set(key,c);return c;
}
// 집터 꾹(재미 F01): 메김 큰박마다 가래 날 밑에서 흙 부스러기가 낮게 인다
function yardDig(){
  const g=yardGaraePlace();
  for(let i=0;i<7;i++)part({x:g.x+2+(Math.random()-.5)*12,y:g.y-2,vx:(Math.random()-.5)*20,vy:-10-Math.random()*14,life:.4+Math.random()*.25,c:YARD_SOIL[i%4],w:i%3?2:1,h:2,grav:120});
}
// 받음 네 곳을 다 맞히면(재미 F02) 「세」에서 흙 한 덩이가 가래 날에서 무더기 꼭대기로 0.45초 날아가 떨어진다
function yardPileTop(){
  const n=Math.max(1,yardPileStage()),name=`soil-${n}`,im=SPRITES[name],m=META[name];
  const P=yardPilePlace();if(!im||!m?.foot)return{x:P.x,y:P.y-8};
  const a=learnOpaque(im);return{x:Math.round(P.x-m.foot[0]+(a.left+a.right)/2),y:P.y-m.foot[1]+a.top};
}
function yardClod(f){
  if(RM)return;
  const g=yardGaraePlace(),to=yardPileTop();
  net.clod={t0:f,x0:g.x+4,y0:g.y-10,x1:to.x,y1:to.y-1,landed:false,bits:[0,1,2,3,4,5,6].map(i=>({dx:(i%3)*2-2,dy:Math.floor(i/3)*2-2,c:YARD_SOIL[i%4]}))};
}
function drawYardClod(f){
  const c=net.clod;if(!c)return null;
  const q=(f-c.t0)/.45;
  if(q>=1){
    if(!c.landed){c.landed=true;net.pileBumpT=f;dust(c.x1,c.y1+2,3);if(ctx)sample('shuffle',ctx.currentTime,.4);log('yard-clod',{t:heardNow()});}
    net.clod=null;return null;
  }
  const x=c.x0+(c.x1-c.x0)*q,y=c.y0+(c.y1-c.y0)*q-Math.sin(Math.PI*q)*18;
  for(const b of c.bits){lg.fillStyle=b.c;lg.fillRect(Math.round(x+b.dx-vx),Math.round(y+b.dy-vy),2,2);}
  return{x:Math.round(x),y:Math.round(y),q};
}
function drawNetShower(child,f){
  const fish=[];if(child.pose!=='hero-shower')return fish;
  const origin=anchor(child.pose,'mouthOfBasket',[27,12],child),t=clamp01((f-net.motionT)/.8),im=SPRITES.anchovy;
  const slot=captionDLive()&&captionD.slots.ba,below=slot?.side==='up'?(slot.tip.y+4)/(K/DPR)+vy:null;
  for(let i=0;i<12;i++){
    const q=clamp01(t/(.72+i%4*.08)),side=i%2?1:-1;
    const rise=30+i%3*5,limited=below===null?rise:Math.min(rise,Math.max(0,origin.y-below-2));
    if(limited<rise){captionD.reductions??=new Map();const key=[song.id,W,H,'shower-fish'].join('|');captionD.reductions.set(key,Math.max(captionD.reductions.get(key)||0,(rise-limited)*K/DPR));}
    const x=Math.round(origin.x+side*(18+i%6*4)*easeOut(q)),y=Math.round(origin.y+(child.y+2-origin.y)*q-Math.sin(Math.PI*q)*limited);
    if(im)lg.drawImage(im,Math.round(x-vx-3),Math.round(y-vy-1));else if(netLand()){lg.fillStyle=(netSlope()?SLOPE_SNOW:netKind()==='forge'?FORGE_COAL:netKind()?kindBits():YARD_SOIL)[i%4];lg.fillRect(Math.round(x-vx-1),Math.round(y-vy-1),3,2);}fish.push({x:x-3,y:y-1,w:7,h:3});
  }
  return fish;
}
function netSeal(){
  const res=Rules.summarize(targets.filter(t=>typeof t.part==='number'));
  return Rules.isTop({...res,charged:sc.charged,holdNeed:typeof songBars==='undefined'?undefined:Rules.topHoldFor(songBars)})?5:res.n>0&&res.hits===res.n?4:Rules.stampFor(res.ratio);
}
function netProud(work,f){return netSeal()>=2&&(work.finalT>0?f-work.finalT>=1.3-1e-9:state==='end'&&work.endT>0&&f-work.endT>=.8-1e-9);}
const yardNoHits = () => sc.hits === 0;
// 앞소리꾼이 꼬마를 돌아본다: 집터 0곳 끝 화면(곡별 검수 07 R1-06)과, 줄 판 모두 꼬마가 두 번 놓쳐 엉덩방아를 찧은 때(재미 F04, 0.6초)
const yardLeaderLook = f => netYard() && state === 'end' && yardNoHits() || f - net.leaderLookT >= 0 && f - net.leaderLookT < .6;
function netJoy(i, f) {
  if (netOn()) {
    const seal=netSeal();
    // 집터에서 한 곳도 못 맞혔으면 아무도 만세를 하지 않는다(「흙이 꿈쩍도 안 하네」와 맞게, 곡별 검수 07 R1-06). 도장 칸은 그대로
    // 운재 산비탈도 0곳 끝 화면에서 꼬마 · 줄꾼 둘이 만세를 했다(「통나무가 꿈쩍도 안 하네」, 곡별 검수 08 R1-07)
    const count=(netYard()||netSlope())&&yardNoHits()?0:Math.min(7+net.people.length,[0,2,4,7,10,Infinity][seal]);
    // 꼬마를 첫째로, 앞소리꾼을 마지막으로 센다.
    const order=net.joyOrder||[];
    return order.indexOf(i)>=0&&order.indexOf(i)<count;
  }
  const stamp = state === 'end' ? lastStamp : Rules.stampFor(Rules.summarize(targets.filter(t=>typeof t.part==='number')).ratio);
  return stamp >= 3 || (stamp === 2 ? Math.floor(f*1.25+i)%2 === 0 : Math.floor(f*1.25)%4 === i%4);
}
function drawNet(f, vt, rec, frozen) {
  if(state==='end'&&net.endT<0)net.endT=f;
  netMotion(net,f,rec,.8,'shower');
  // 넓은 판은 왼쪽에서 오는 사람 다섯까지 담고, 작은 판은 주인공과 앞소리꾼을 함께 둔다
  const yard = netYard(), slope = netSlope(), kind = netKind(), view = KIND_VIEW[kind], land = yard || slope || !!kind, shakeX = vx-camX, shakeY=vy-camY, landedAt=netLandingTime(rec);
  const danceLayout=kind==='dance'&&(captionDLive()||state==='end');
  const log0 = slope ? slopeLog(f) : null, dx = slope ? log0.base - SLOPE_LOG.x0 : 0, lurch = slope ? log0.x - log0.base : 0;
  {
    const left=(view?view.left:land?88:58)-(captionDLive()?0:net.people.length*NET_GAP)+dx, right=view?view.right:land?330:314, center=Math.max((left+right)/2, right-VW/2);
    camX=Math.round(center-VW/2)-(state==='start'?net.startNudge||0:0); // 낮은 시작 화면에서 제목판이 얼굴을 덮으면 장면을 오른쪽으로 비킨다(scene.js)
    camY=Math.round((slope?170:164)-VH*.8+(landedAt>0&&!land&&!captionDLive() ? easeOut(clamp01((f-landedAt)/.65))*70/(K/DPR) : 0))-(captionDLive()&&H<=420?12:0)+(yard&&captionDLive()&&H>420&&net.yardDrop?.key===`${W}x${H}x${K}`?net.yardDrop.d:0);
  }
  vx = camX+shakeX+buildJit(f); vy=camY+shakeY;
  const final = landedAt>0 && (net.finalT<0 || f-net.finalT>=.46);
  const b = rec ? (vt-rec.t0)/rec.beat : 0;
  const bob = frozen || RM || !rec || rec.def.rest || final ? 0 : (Math.floor(b*3)%3 === 1 ? 1 : 0);
  const pull = !frozen && netBeatPull(rec,vt);
  const help = rec && net.helpI === rec.def.i;
  const sameCall=song.id==='myeolchi'&&rec?.def.call&&rec.def.clip===song.sameWordHold.clip&&!frozen;
  // 산비탈: 꼬마는 통나무 뒤 끝에서 깍장쇠를 박고, 앞소리꾼은 통나무 너머에서 황새목으로 앞머리를 든다
  const cast = slope ? [ { name:'puller-a', x:log0.x-110 }, { name:'puller-b', x:log0.x-84 }, { name:'hero', x:log0.x-58 }, { name:'leader', x:log0.x+34 } ]
    : yard ? [ { name:'puller-a', x:100 }, { name:'puller-b', x:130 }, { name:'hero', x:160 }, { name:'leader', x:212 } ]
    : kind === 'forge' ? [ { name:'puller-a', x:100 }, { name:'puller-b', x:130 }, { name:'hero', x:160 }, { name:'puller-c', x:190 }, { name:'leader', x:226 } ]
    : kind === 'field' ? [ { name:'puller-a', x:100 }, { name:'puller-b', x:130 }, { name:'hero', x:160 }, { name:'leader', x:236 } ]
    : kind === 'dance' ? [ { name:'puller-a', x:110 }, { name:'puller-b', x:140 }, { name:'hero', x:170 }, { name:'puller-c', x:200 }, { name:'leader', x:236 } ]
    : kind === 'dungdang' ? [ { name:'puller-a', x:96 }, { name:'puller-b', x:128 }, { name:'hero', x:160 }, { name:'puller-c', x:192 }, { name:'leader', x:236 } ]
    : [ { name: 'puller-c', x:70, sid:0 }, { name:'leader', x:100, sid:1 }, { name:'puller-a', x:130, sid:2 }, { name:'puller-b', x:160, sid:3 }, { name:'hero', x:190, sid:4 }, { name:'puller-a', x:220, sid:5 }, { name:'puller-c', x:250, sid:6 } ]; // sid: 첫머리 이야기(story.js)가 사람을 가리키는 처음 자리 번호
  net.people.forEach((p,i) => {
    const dest = 40+dx-i*((NET_GAP)), k = easeOut(clamp01((f-p.t)/.8)), x0 = (dest-60);
    const x = x0+(dest-x0)*k;
    cast.push({ name: `puller-${['a','b','c'][i%3]}`, x, arrive: k<1, join:i, k });
    if (k<1 && !RM && Math.random()<.25) dust(x, slope ? slopeY(x) : 162, 1);
  });
  cast.sort((a,b) => a.x-b.x);

  if((net.people.length)&&kind!=='field'&&!danceLayout&&!(kind==='forge'&&captionDLive()&&W>=900)){
    const line=captionDLive()?cast.filter(p=>p.name!=='leader'&&p.name!=='hero'):land?cast.filter(p=>p.name!=='leader'):cast;
    const first=vx+24/(K/DPR)+18+Math.ceil(24/(K/DPR));
    // 집터(자막 D): 줄이 꼬마 · 앞소리꾼 자리까지 20점 간격으로 밀려 줄꾼이 앞소리꾼 앞에 서서 얼굴을 780×290 43% · 1280 35% 가렸다.
    // 오른쪽 끝은 앞소리꾼 30점 왼쪽까지, 앞줄은 24점 간격 자리만큼만 세우고 남는 사람(늦게 붙은 사람부터)은 뒷줄(6점 위 · 10% 어둡게, 앞줄보다 먼저 그림)로 보낸다(곡별 검수 07 R1-05)
    const yardRows=yard&&captionDLive(),leadX=yardRows?cast.find(p=>p.name==='leader').x:0;
    const right=yardRows?Math.max(first+20,leadX-30):Math.max(slope?log0.x-58:yard?160:kind==='forge'?190:kind==='dance'?200:kind?160:270,first+(line.length-1)*20);
    const arrive=(p,dest)=>p.join===undefined?dest:Math.max(vx+24/(K/DPR)+10,dest-32)+(dest-Math.max(vx+24/(K/DPR)+10,dest-32))*p.k;
    if(yardRows){
      // 앞줄 자리는 얼굴이 보이는 곳만: 꼬마 왼쪽(꼬마 22점 앞까지)과 꼬마 · 앞소리꾼 사이 한 자리, 24점 간격.
      // 남는 사람(늦게 붙은 사람부터)은 앞줄 사이 · 왼쪽으로 반 칸씩 비킨 뒷줄에 선다
      const heroX=cast.find(p=>p.name==='hero').x,slots=[];
      for(let x=first;x<=heroX-22+1e-9;x+=24)slots.push(x);
      if(right>=heroX+22)slots.push(right);
      if(!slots.length)slots.push(first);
      const late=line.filter(q=>q.join!==undefined).sort((a,b)=>b.join-a.join),back=new Set(late.slice(0,Math.max(0,line.length-slots.length)));
      const front=line.filter(p=>!back.has(p)),fs=slots.slice(0,front.length),bs=[];
      // 뒷줄 자리는 화면 안에서만 고른다. 전에는 첫 자리 왼쪽으로 24점씩 계속 밀어 1280에서 넷째 · 다섯째 사람이 몸 53~150% 화면 밖이었다(곡별 검수 07 R2-02).
      // 몸 왼쪽 끝(당김 자세 −12점)이 화면 4px 안. 잘 보이는 차례: 첫 자리 왼쪽(몸 왼쪽 반이 트임) → 앞줄 사이 → 앞줄 바로 뒤(꼬마 바로 뒤는 얼굴이 다 가려 뺀다)
      const minX=camX+12+4/(K/DPR),free=x=>x>=minX-1e-9&&Math.abs(x-heroX)>=18&&!bs.includes(x);
      for(let x=fs[0]-12;free(x);x-=24)bs.push(x);
      for(let i=0;i+1<fs.length;i++){const mid=(fs[i]+fs[i+1])/2;if(free(mid))bs.push(mid);}
      for(const x of fs)if(free(x))bs.push(x);
      while(bs.length<back.size)bs.push(Math.max(minX,fs[0]-12));
      front.forEach((p,i)=>{p.x=arrive(p,fs[i]);p.row=i%2;});
      // 막 붙은 사람이 가장 잘 보이는 뒷자리에 선다(다섯째 사람이 붙는 「와!」에 그 사람이 안 보였다). 자리를 내준 사람은 0.8초 걸어서 옮긴다
      [...back].sort((a,b)=>b.join-a.join).forEach((p,k)=>{
        const q=net.people[p.join],dest=bs[k];
        if(!q||p.k<1||RM||q.backTo===undefined){p.x=arrive(p,dest);if(q){q.backX=q.backFrom=q.backTo=dest;q.backT=-9;}}
        else{
          if(q.backTo!==dest){q.backFrom=q.backX;q.backTo=dest;q.backT=f;}
          q.backX=q.backFrom+(q.backTo-q.backFrom)*easeOut(clamp01((f-q.backT)/.8));p.x=q.backX;
        }
        p.row=-6;p.back=true;
      });
    }else{
    const gap=Math.min(NET_GAP,(right-first)/(line.length-1));
    line.forEach((p,i)=>{
      const dest=right-(line.length-1-i)*gap;
      p.x=arrive(p,dest);
      p.row=net.layout==='rows'&&p.join!==undefined?-8:i%2;
      if(net.layout==='rows'&&p.join!==undefined)p.x=55+p.join*43;
    });
    }
  }


  if((kind==='field')){
    // 가로 밭: 처음 네 사람과 합류 네 사람의 얼굴 자리를 미리 나눠 둔다. 말풍선을 비키며 같은 끝자리로 몰리지 않는다.
    const dot=K/DPR,pad=10*dot+4,step=(W-pad*2)/8;
    for(const p of cast){
      const n=p.join===undefined?({'puller-a':0,'puller-b':1,hero:2,leader:7})[p.name]:3+p.join,m=META[p.name+'-hold'];
      if(!m?.foot||!m.mouth)continue;
      const center=m.face?m.face[0]+m.face[2]/2:m.mouth[0]+2;
      p.x=camX+(pad+(n+.5)*step)/dot-center+m.foot[0]-(p.join===undefined?0:24*(1-p.k));
      p.stageY=p.name==='leader'?160:p.name==='hero'?164:162;
    }
    cast.sort((a,b)=>a.x-b.x);
  }
  if(captionDLive()&&kind==='forge'&&H<=420)for(const p of cast)p.x-=48;
  if(danceLayout){
    // 가로 폰은 아홉 자리 한 줄, 그 밖에는 먼저 온 다섯과 합류 넷이 마당의 두 줄에 선다.
    const dot=K/DPR,low=(H<=420),front=state==='end'?Math.min(H-12,document.querySelector('.endBottom').getBoundingClientRect().top-8):H-12;
    const back=low?front:front-((188));
    camY=156-(back-12)/dot;vy=camY+shakeY;

    for(const p of cast){
      const joined=p.join!==undefined,n=joined?(low?4+p.join:p.join):({'puller-a':0,'puller-b':1,hero:2,'puller-c':3,leader:low?8:4})[p.name],count=low?9:joined?4:5;
      const m=META[p.name+'-hold'],center=m.face?m.face[0]+m.face[2]/2:m.mouth[0]+2;
      p.x=camX+W*(n+.5)/count/dot-center+m.foot[0]-(joined?12*(1-p.k):0);
      p.stageY=camY+(joined?front:back)/dot;
      // 세로 메김은 넓은 두 줄 종이로, 소리꾼은 뒤쪽 모래밭에 세워 받는 종이와 겹치지 않게 한다.

      p.fore=joined;
    }
    cast.sort((a,b)=>a.x-b.x);
  }
  if(captionDLive()&&kind==='forge'){
    if(W>=900){
      // 앞줄 네 사람의 발은 풀무 위, 화로 입구 왼쪽에 둔다.
      for(const p of cast)if(p.join===undefined&&p.name!=='leader')p.x=({'puller-a':62,'puller-b':94,hero:126,'puller-c':158})[p.name]-(W>1300?8:0);
      if(W<=1300)cast.find(p=>p.name==='leader').x+=9;
    }
    // 붙는 다섯 사람은 화면 안 별도 줄. 앞줄을 조여 꼬마 옆 얼굴을 가리지 않는다.
    for(const p of cast.filter(p=>p.join!==undefined)){
      // 뒷줄 셋은 오른쪽 안내 칸(232px) 왼쪽에 둔다. 끝 한 방 연속 수가 마지막 일꾼 얼굴을 덮지 않게 한다.
      if(W>=900){p.x=camX+[18,50,138,170,202][p.join];p.stageY=camY+(H-24)/(K/DPR);}
    }
  }
  net.joyOrder=[cast.findIndex(p=>p.name==='hero'),...cast.map((p,i)=>p.name!=='hero'&&p.name!=='leader'?i:-1).filter(i=>i>=0),cast.findIndex(p=>p.name==='leader')];
  const lineCast=cast.filter(p=>!p.fore),lookAt=lineCast[lineCast.findIndex(p=>p.name==='hero')+(land?-1:1)]; // 집터 세로 폰 앞쪽 줄(fore)은 꼬마 곁 줄꾼이 아니다
  const action=netPull(f);
  // 산비탈 마지막 메김(「올리나 끄는구나」): 끝 한 방 앞 쌓기(재미 F03)
  const slopeBuild = slope && state === 'song' && !!rec?.def.call && !songBars.some(b => b.call && b.i > rec.def.i);
  const bodies = cast.map((p,i) => {
    let pose, y = slope ? (p.name === 'leader' ? log0.y-22 : slopeY(p.x)+(p.name === 'hero' ? 2 : p.row||0)) : kind === 'forge' && p.name !== 'leader' && Math.abs(p.x-forgeBellowsPlace().x) < 64 ? FORGE.stand+((0)) // 풀무 발판 위
      : kind === 'dungdang' ? DUNG_SEAT : p.name === 'hero' ? 164 : yard && p.name === 'leader' ? 158 : kind && p.name === 'leader' ? (kind === 'forge' ? 166 : 160) : 162+(p.row||0);

    if(p.stageY!==undefined)y=p.stageY;
    const yardLook = yardLeaderLook(f);
    // 집터 꼬마가 늦게 · 놓쳐 줄에 끌리면 바로 뒤 줄꾼도 0.4초 휘청(재미 F04. 일찍 당김의 휘청은 그대로)
    const yardDrag = yard && f-net.dragT >= 0 && f-net.dragT < .4;
    if (p.name === 'hero') pose = net.heroPose = netHeroPose(f,i);
    else if (p.name === 'leader') pose = final && netJoy(i,f) ? 'leader-cheer' : f-leader.stopT < .7 || sameCall&&vt-rec.t0<.5 || yardLook ? 'leader-look' : rec && rec.def.call && !frozen ? `leader-sing-${Math.floor(b*3)%2 ? 'a':'b'}` : 'leader-hold';
    else pose = `${p.name}-${final && netJoy(i,f) ? 'cheer' : help&&pull ? 'pullbig' : (f-net.lookT >= 0 && f-net.lookT < .65 || yardDrag) && p===lookAt ? 'stumble' : pull || action.active ? 'pull' : 'hold'}`;
    // 집터 꾹(재미 F01): 꼬마가 꾹 누르는 동안 줄꾼이 몸을 1점 뒤로 기울여 버티고, 메김 마지막 한 박(「곧 떼요」)에는 2점 기울여 1점 낮춘다
    // 산비탈 마지막 메김 쌓기(재미 F03): 꼬마가 꾹 버티는 동안 줄꾼도 같은 버팀(1점 뒤로, 마지막 한 박 2점 · 1점 낮춤)
    const yardBrace = (yard || slopeBuild) && !frozen && !RM && charge && !charge.pending && rec?.def.call && p.name !== 'hero' && p.name !== 'leader' && pose.endsWith('-hold') ? (callNearEnd(rec, vt) ? 2 : 1) : 0;
    const captionY=y;
    y += bob + (p.name === 'hero' ? holdBodyBob(f) : 0) - (p.arrive && !RM ? Math.round(Math.abs(Math.sin(f*14))*3) : 0) + (yardBrace === 2 ? 1 : 0);
    const st = storyBody(p, pose, f); // 첫머리 이야기(story.js): 넘어짐 · 일어남 · 가리킴
    if (st) { pose = st.pose || pose; y += st.dy || 0; }
    const oops = p.name === 'hero' && !st ? netHeroOops(f, pose) : null;
    if (oops) y += oops.dy;
    const base=(kind==='field')||danceLayout?META[p.name+'-hold']:null,frame=base&&META[pose];
    const faceX=m=>(m.face?m.face[0]+m.face[2]/2:m.mouth[0]+2)-m.foot[0];
    const x=frame?.mouth&&base.mouth?p.x+faceX(base)-faceX(frame):p.x;
    return { ...p, x:x+(st?.dx||0)+(oops?.dx||0), pose, y, captionY,captionX:p.x,dir:st?.dir||1,turn:st?.turn||0,noRope:!!st?.noRope,lean:oops?.lean||yardBrace,squash:oops?.squash||0,braceLean:!!(sameCall&&charge&&!charge.pending&&!RM&&p.name!=='hero'&&p.name!=='leader'&&Math.floor((vt-rec.t0)/.3)%2) };
  });

  if(captionDLive()){captionDLayout({bodies});for(const p of bodies)if(['hero','leader'].includes(p.name))p.y=captionDLimitY(p.pose,p.x,p.y,p.name==='hero'?'ba':'me');else if((!((kind==='field')))&&!danceLayout)Object.assign(p,captionDAvoid(p));}
  if(captionDLive()&&kind==='field'&&W>=900)for(const p of bodies)if(!['hero','leader'].includes(p.name))p.y=captionDLimitY(p.pose,p.x,captionDLimitY(p.pose,p.x,p.y,'me'),'ba');
  // 산비탈 줄: 말풍선을 비켜 아래로 내려선 줄꾼들 왼쪽에 비킬 일이 없던 한 사람만 비탈 위(1280에서 115px 높이)에 떠 보였다(통나무가 더 멀리 가며 카메라가 옮긴 뒤, R1-01).
  // 왼쪽 사람은 오른쪽 사람보다 비탈 기울기(0.2)만큼만 높게 선다. 아래로만 옮기고 화면 아래 2점 안
  if((slope&&captionDLive())){const line=bodies.filter(p=>/^puller/.test(p.name)).sort((a,b)=>b.x-a.x);
    for(let i=1;i<line.length;i++){const r=line[i-1],p=line[i],min=r.y+(p.row||0)-(r.row||0)-Math.ceil((r.x-p.x)*.2);if(p.y<min)p.y=Math.min(min,camY+VH-2);}}
  netLeaderDepth(bodies);
  for(const p of bodies)if(p.back)p.depth=Math.min(p.depth??p.y,p.y-12); // 집터 뒷줄은 자막을 비켜 내려와도 앞줄보다 먼저(뒤에) 그린다
  const child=bodies.find(p=>p.name==='hero');HERO.x=child.x;HERO.y=child.y;
  const leadBody=bodies.find(p=>p.name==='leader');LEAD.x=leadBody.x;LEAD.y=leadBody.y;
  if(!land&&state==='end'&&landedAt>0&&net.haul>0){
    const c=drawNetCatch(f,landedAt,bodies,false),dot=K/DPR,bottom=toCssY(c.y+c.height),band=document.querySelector('.endBottom')?.getBoundingClientRect();
    const need=band?.height?Math.max(0,Math.ceil((bottom-band.top+12)/dot)):0;
    const lift=Math.round(need*easeOut(clamp01((f-net.endT)/.3)));
    camY+=lift;vy+=lift;
  }
  const landingCatch=land?null:drawNetCatch(f,landedAt,bodies,false),floatEnd=slope?drawSlopeBg(f,rec,vt):yard?drawYardBg(f,rec,vt):kind?drawKindBg(f,rec,vt,pull||action.active||!!(charge&&!charge.pending),final):drawNetBg(f,rec,vt,landingCatch);
  storyDrawBack(f); // 첫머리 이야기 ④: 바다 띠의 작은 배(사람 뒤)
  // 얼굴과 손 둘레까지 빈 자리를 남긴다. 입자 수와 움직임은 바꾸지 않는다.
  const protectedRects=netClearRects(child,['handL','handR']);
  lg.save();
  netClipRects(protectedRects);
  drawSparks(f);drawParticles();
  if (f-net.hitT<.08 && net.power>0 && !RM) { const p=heroHitPoint(); lg.fillStyle='#fbf6e6'; lg.fillRect(Math.round(p.x-vx-3),Math.round(p.y-vy-2),6,3); }
  lg.restore();
  // 산비탈: 앞소리꾼은 통나무 너머에 서서 아랫몸이 나무에 가린다
  const slopeGeo=slope?{}:null;
  const byDepth=(a,b)=>slope&&(a.name==='leader'||b.name==='leader')?(a.name==='leader'?-1:1):(a.depth??a.y)-(b.depth??b.y);
  const drawOrder=kind==='field'||danceLayout?[...bodies].sort(byDepth):[...bodies.filter(p=>p.name!=='hero').sort(byDepth),child];
  let basket=[];
  for (const p of drawOrder) {
    if (slope && !slopeGeo.log && p.name !== 'leader') Object.assign(slopeGeo, drawSlopeFront(f,log0));
    if (p.name === 'hero' && META[p.pose]?.knob) drawStrap(p.pose,p,p.y,f);
    if(p.turn)sprTurn(p.pose,Math.round(p.x),p.y,1,p.turn,[0,13]); // 이야기: 넘어진 그림이 없으면 눕혀 그린다
    else if(p.braceLean)drawNetBrace(p);
    else if(p.lean||p.back||p.squash)sprIm(netBodyImage(p.pose,p.lean||0,!!p.back,p.squash||0),p.pose,Math.round(p.x),p.y,1,true); // 집터: 꾹 버티기 기울임 · 뒷줄 칠(자리는 위에서 이미 비킴)
    else spr(p.pose,Math.round(p.x),p.y,p.dir);
    if(p===child)basket=drawNetBasket(child,f);
    if (rec && !rec.def.call && !rec.def.rest && !frozen && !p.pose.endsWith('sit') && !p.pose.endsWith('stumble') && !p.noRope) mouth(p.pose,p,p.y);
  }
  lg.save();netClipRects(protectedRects);const shower=drawNetShower(child,f);lg.restore();
  // 사람 위로 줄 무늬를 잇고, 손의 작은 칸만 다시 찍는다.
  let prev = null;
  for (const p of bodies) {
    if (p.noRope || slope || kind || p.arrive || p.back || p.fore || ['hero-sit','hero-proud','hero-shower'].includes(p.pose) || yard && (p.name === 'leader' || final)) continue; // 집터는 끝 한 방 뒤 줄을 놓고 만세. 산비탈 · 북쪽 세 판은 줄이 없다. 집터 뒷줄은 건너편 줄을 잡아 앞 줄에 잇지 않는다
    const left = anchor(p.pose,'handL',[12,42],p), right = anchor(p.pose,'handR',[44,42],p);
    if (prev) netLine(prev,left,f,f-net.earlyT<.45,true);
    netLine(left,right,f,f-net.earlyT<.45,true); prev=right;
  }
  if (prev && floatEnd) netLine(prev,floatEnd,f,f-net.earlyT<.45,true);
  // 집터 세로 폰 앞쪽 줄(R2-01): 붙은 사람끼리 손을 잇고 가래 날 오른쪽 줄(ropeR)에 맨다. 끝 한 방 뒤에는 줄을 놓고 만세
  if (yard && !final) { let q = null; for (const p of bodies) { if (!p.fore || p.arrive || /-(sit|stumble|cheer)$/.test(p.pose)) continue; const l = anchor(p.pose,'handL',[12,42],p), r = anchor(p.pose,'handR',[44,42],p); if (q) netLine(q,l,f,f-net.earlyT<.45,true); netLine(l,r,f,f-net.earlyT<.45,true); q = r; } if (q) netLine(q,anchor('garae-planted','ropeR',[42,59],yardGaraePlace()),f,f-net.earlyT<.45,true); }
  for (const p of song.id==='myeolchi'?drawOrder:bodies) {
    const im=SPRITES[p.pose],m=META[p.pose]; if(p.noRope||p.dir<0||slope||kind||!im||!m||p.back||['hero-sit','hero-proud','hero-shower'].includes(p.pose)||yard&&p.name==='leader')continue;
    for(const key of ['handL','handR']) { const h=m[key]; if(h)lg.drawImage(im,h[0]-2,h[1]-2,5,5,Math.round(p.x-vx-m.foot[0]+h[0]-2),Math.round(p.y-vy-m.foot[1]+h[1]-2),5,5); }
  }
  storyDrawFront(f,bodies,floatEnd); // 첫머리 이야기: 빠져나가는 멸치 · 거문도 뱃사람
  const yardGeo=yard?drawYardFront(f,final,pull||action.active):null, kindGeo=kind?drawKindFront(f,bodies,final):null;
  if (kind === 'forge') forgeGlow(f);
  // 집터 넓은 가로: 가래가 앞소리꾼 말풍선을 비켜 29~32점 내려서며 날이 화면 아래로 1280 12% · 1695 15% 잘렸다. 위 하늘이 비어 있으니 그만큼 장면을 위로 올린다
  // (곡별 검수 07 R2-03). 크기마다 첫 장면에 한 번 정하고 말풍선 자리를 다시 잰다. 낮은 가로(높이 420 이하)는 위에 빈 곳이 없어 그대로
  if((yard&&captionDLive())&&H>420&&yardGeo){const low=Math.max(...['garae-planted','garae-pulled'].map(n=>SPRITES[n]&&META[n]?.foot?learnOpaque(SPRITES[n]).bottom-META[n].foot[1]:-99));
    if(low>-99){const key=`${W}x${H}x${K}`,d=net.yardDrop?.key===key?net.yardDrop.d:0,need=Math.ceil(yardGeo.y+low-(camY+VH-8/(K/DPR))-1e-9);
      if(need>0&&d+need<=24){net.yardDrop={key,d:d+need};captionD.lines.clear();captionD.moves.clear();}}}
  if(slope&&!slopeGeo.log)Object.assign(slopeGeo,drawSlopeFront(f,log0));
  net.geometry={K:K/DPR,vx,vy,bodies:bodies.map(p=>({...p})),drawOrder:drawOrder.map(p=>bodies.indexOf(p)),basket,knots:netKnotShift(f),catch:land?null:drawNetCatch(f,landedAt,bodies),water:land?null:net.waterGeometry,rope:prev&&floatEnd?{from:prev,to:floatEnd,width:2}:null,protectedRects,shower,yard:yardGeo,slope:slopeGeo,kind:kindGeo,forge:kind==='forge'?net.forgeView:null};
  if (charge && !charge.pending && ctx && vt-net.creakT>.55 && !kind && !yard) { net.creakT=vt; sample('creak',ctx.currentTime,.5*(.84+Math.random()*.3),sfx,.96+Math.random()*.08); }
  // 산비탈 마지막 메김 쌓기(재미 F03): 꾹 버티는 동안 0.5초마다 통나무 앞머리에서 눈가루 둘
  if (slopeBuild && charge && !charge.pending && !frozen && !RM) { const k = Math.floor((vt-rec.t0)/.5), key = `${rec.t0}:${k}`; if (net.buildPuff !== key) { net.buildPuff = key; if (k >= 1) slopeSnow(2, .6); } }
  // 집터 꾹(재미 F01): 메김 큰박을 지날 때마다 가래 날 밑 흙 부스러기와 삐걱 소리(0.55초마다 나던 삐걱을 큰박에 맞춤)
  if (yard && charge && !charge.pending && rec?.def.call && ctx && !frozen) {
    const k = Math.floor((vt-rec.t0)/rec.beat+1e-6), key = `${rec.t0}:${k}`;
    if (net.digBeat !== key) { net.digBeat = key; if (k >= 1 && vt-rec.t0-k*rec.beat < .12) { if (!RM) yardDig(); sample('creak',ctx.currentTime,.5*(.84+Math.random()*.3),sfx,.96+Math.random()*.08); } }
  }
  if (!holdSong() && msg && msg.finger) spr(Math.floor(f*3.2)%2?'finger-holding':'finger-waiting',HERO.x+8,Math.min(HERO.y+12,vy+VH+8));
  if (fxs.particles.some(p => p.gather)) { lg.save(); netClipRects(protectedRects); drawGather(); lg.restore(); } // 끝 칠 곳 앞 쌓기 빛 알은 사람 위에(꼬마 얼굴 · 손은 비움)
  const edge = clamp01(1-(f-fxs.band)/.5); elEdge.style.opacity=String(edge);
  drawLyric(vt,rec); drawMsg(f);
  // 새로 뜨는 손 안내까지 정한 뒤 추임새 자리를 찾는다.
  if(captionDLive()&&!learning)drawHoldCue();
  drawNetWords(f);
  blitLo();
}
// 집터: 하늘과 마당 배경. 줄 끝은 가래 날 왼쪽 줄고리
function drawYardBg(f, rec, vt) {
  net.progress = netProgress(rec, vt);
  lg.fillStyle = moodSky(MOOD_DAY); lg.fillRect(0, 0, VW, VH);
  const im = netBackdrop();
  lg.fillStyle = netGround; lg.fillRect(0, Math.max(0, 126 - vy), VW, VH);
  if (im) {
    lg.drawImage(im, -vx, -vy);
    if (vx < 0) { lg.save(); lg.translate(-vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
    if (vx + VW > 320) { lg.save(); lg.translate(640 - vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
  }
  net.waterGeometry = null;
  return anchor('garae-planted', 'ropeL', [22, 59], yardGaraePlace());
}
const yardPileStage = () => net.haul <= 0 ? 0 : Math.min(net.finalT > 0 ? 5 : 4, 1 + Math.floor(net.haul / 7));
// 흙 무더기는 가래 오른쪽 뒤에서 당긴 만큼 다섯 단계로 자라고, 가래는 그 앞에 선다
function drawYardFront(f, final, pulling) {
  const big = net.finalT > 0 && f - net.finalT < .46;
  const pose = big || pulling ? 'garae-pulled' : 'garae-planted';
  // 5단계는 끝 한 방을 맞혀야(바뀐 값 2026-11-13, 운재 통나무 · 북쪽 소품과 같음). 다 맞히면 22번째(65초)에 다 차서 끝 한 방에 그림이 안 바뀌었다(곡별 검수 07 R1-04)
  const n = yardPileStage();
  const P = yardPilePlace();
  if (n) spr(`soil-${n}`, P.x, P.y - (f - net.pileBumpT >= 0 && f - net.pileBumpT < .12 && !RM ? 1 : 0));
  spr(pose, yardGaraePlace().x, yardGaraePlace().y);
  const k = Math.floor((f - net.hitT) / .06);
  if (net.hitT > 0 && k >= 0 && k < 6 && !RM) spr(`fx-soil-0${k + 1}`, yardGaraePlace().x + 2, yardGaraePlace().y);
  const clod = drawYardClod(f);
  return { garae: pose, pile: n, haul: net.haul, final, x: yardGaraePlace().x, y: yardGaraePlace().y, pileX: P.x, pileY: P.y, clod, pileBump: f - net.pileBumpT >= 0 && f - net.pileBumpT < .12 };
}
// 산비탈: 겨울 하늘은 배경 그림의 하늘 빛 그대로. 산새는 사람이 붙을 때 왼쪽 숲에서 날아오른다
function drawSlopeBg(f, rec, vt) {
  net.progress = netProgress(rec, vt);
  const im = netBackdrop();
  lg.fillStyle = netSky || moodSky(MOOD_DAY); lg.fillRect(0, 0, VW, VH);
  lg.fillStyle = netGround; lg.fillRect(0, Math.max(0, 126 - vy), VW, VH);
  if (im) {
    lg.drawImage(im, -vx, -vy);
    if (vx < 0) { lg.save(); lg.translate(-vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
    if (vx + VW > 320) { lg.save(); lg.translate(640 - vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
  }
  const t = f - net.birdT;
  if (net.birdT > 0 && t >= 0 && t < 2.4 && !RM) for (let i = 0; i < (net.birdN || 3); i++) {
    const x = Math.round(58 + i * 11 + t * (26 + i * 6) - vx), y = Math.round(70 - i * 3 - t * (22 + i * 4) - vy), up = Math.floor(f * 8 + i) % 2;
    lg.fillStyle = '#4a3a34'; lg.fillRect(x - 2, y - up, 2, 1); lg.fillRect(x, y + 1 - up, 1, 1); lg.fillRect(x + 1, y - up, 2, 1);
  }
  slopeRut(f);
  net.waterGeometry = null;
  return null;
}
// 통나무가 지나간 비탈에 남는 눈 고랑 두 줄(2점 굵기, 사이 6점). 맞힌 만큼(통나무가 간 만큼) 길어지고 판 끝까지 남는다(재미 F02). 사람 · 통나무보다 먼저 그린다
function slopeRut(f) {
  const at = slopeLog(f), a = SLOPE_LOG.x0 - 50, b = at.base - 50; if (b <= a + 1) return (net.rut = null);
  const k = (SLOPE_LOG.y1 - SLOPE_LOG.y0) / (SLOPE_LOG.x1 - SLOPE_LOG.x0);
  lg.fillStyle = SLOPE_RUT;
  for (let x = a; x <= b; x++) { const y = Math.round(SLOPE_LOG.y0 + (x + 50 - SLOPE_LOG.x0) * k); lg.fillRect(Math.round(x - vx), y - 3 - vy, 1, 2); lg.fillRect(Math.round(x - vx), y + 3 - vy, 1, 2); }
  net.rut = { from: a, to: b };
  return net.rut;
}
// 통나무 한 그루. 꾹 누르면 꼬마 쪽 끝에 깍장쇠가 박히고, 당기면 앞머리 밑에서 눈가루가 튄다
function drawSlopeFront(f, at) {
  spr('timber', at.x, at.y);
  const hook = anchor('timber', 'hook', [72, 12], at), back = { x: at.x - 50, y: at.y - 14 };
  const h = Math.floor((f - net.hookT) / .07);
  if (net.hookT > 0 && h >= 0 && h < 4 && !RM) spr(`fx-hook-0${h + 1}`, back.x, back.y + 6);
  const k = Math.floor((f - net.hitT) / .06);
  if (net.hitT > 0 && k >= 0 && k < 6 && !RM) spr(`fx-snow-0${k + 1}`, at.x + 40, at.y + 4);
  // 꾹 뗌 맞힘: 앞머리 앞에 작은 눈 무더기(6×3점)가 0.25초 쌓였다 0.15초에 흩어진다(재미 F02)
  const m = f - net.hitT;
  if (net.hitT > 0 && net.power > 0 && m >= 0 && m < .4 && !RM) {
    // 통나무 머리 아래 모서리(그림 오른쪽 끝 x+56)에 붙은 둔덕: 아래 두 줄은 w, 맨 윗줄은 양쪽 한 점씩 좁게
    const w = m < .25 ? 6 : Math.round(6 * (1 - (m - .25) / .15)), mx = Math.round(at.x + 53 - vx), my = at.y - vy;
    if (w > 0) { lg.fillStyle = SLOPE_SNOW[3]; lg.fillRect(mx + 1, my - 3, Math.max(1, w - 2), 1); lg.fillStyle = SLOPE_SNOW[0]; lg.fillRect(mx, my - 2, w, 2); lg.fillStyle = SLOPE_RUT; lg.fillRect(mx, my, w, 1); }
  }
  return { log: 'timber', x: at.x, y: at.y, p: at.p, base: at.base, hook, back, haul: net.haul, final: net.finalT > 0, rut: net.rut || null };
}
// 맞힌 단계마다 하나씩 늘어 끝까지 남는 소품(2026-11-13 밤 대표 ⑨ 「노래가 짧아 배경이 꾸며지는 게 아쉽다, 특히 온 동네가 풀무질하는 노래」).
// [단계, 그림, x, y(배경 좌표 · 발 자리), 뒤/앞, 흔들림 장들, 한 장 초]. 처음 자리는 docs/games/minyo/refs/<곡>/deco.json. 강가 배경은 DANCE_BG_X만큼 오른쪽에 놓인다
// 판 화면은 배경 가운데만 보인다(가로 화면 모두 x 81~320 · y 69~194, 강가는 x 22~278). 풍구 등불 · 진열대는 그 안으로 옮기고 앞 소품은 아래가 잘리지 않게 올렸다.
// 허수아비 · 차일 · 오색 천은 그 칸에 맞게 다시 그렸다(Codex b807db200)
const KIND_DECO = {
  forge: [[1, 'deco-1', 312, 100, 'back', ['deco-1a', 'deco-1b'], .45], [2, 'deco-2', 200, 191, 'back'], [3, 'deco-3', 147, 121, 'back'], [4, 'deco-4', 306, 170, 'back']],
  field: [[1, 'deco-1', 204, 190, 'front'], [2, 'deco-2', 229, 110, 'back'], [3, 'deco-3', 201, 125, 'back', ['deco-3a', 'deco-3b'], .18], [4, 'deco-4', 150, 192, 'front', ['deco-4a', 'deco-4b'], .12]],
  dungdang: [[1, 'deco-1', 156, 134, 'back', ['deco-1a', 'deco-1b'], .3], [2, 'deco-2', 200, 128, 'back'], [3, 'deco-3', 104, 130, 'back'], [4, 'deco-4', 252, 100, 'back']], // 판 17 시제품: 모닥불 · 담 위 구경 아이 · 초롱(마당 왼쪽) · 고깃배(바닷가)
  dance: [[1, 'deco-1', 198, 120, 'back'], [2, 'deco-2', 198, 103, 'back', ['deco-2a', 'deco-2b'], .38], [3, 'deco-3', 76, 191, 'back'], [4, 'deco-4', 154, 192, 'back']],
};
function drawKindDeco(f, layer, s) {
  const k = netKind(), ox = k === 'dance' ? DANCE_BG_X : 0;
  // 큰 신고산 화면에서 장식은 나중에 뜨는 손·연속 수까지 피하도록 두 말풍선의 안내 자리를 미리 비운다.
  const notes=captionDLive()&&k==='dance'&&W>=900&&H>420&&!learning?['me','ba'].flatMap(who=>{
    const slot=captionD.slots[who];if(!slot)return[];
    const w=Math.min(W-32,360),bottom=slot.y-(who==='ba'?40:12);
    return[{x:Math.max(16,Math.min(W-w-16,slot.x+slot.w/2-w/2)),y:8,w,h:Math.max(0,bottom-8)}];
  }):[];
  for (const [stage, name, x, y, at, frames, sec] of KIND_DECO[k] || []) {
    if (at !== layer || s < stage) continue;
    // 모루는 낮은 화면에서도 밑까지 보이게 놓고 사람보다 먼저 그린다.
    const foot=k==='forge'&&name==='deco-2'?Math.min(y,camY+(H-8)/(K/DPR)-(learnOpaque(SPRITES[name]).bottom-META[name].foot[1])):y;
    const p=captionDArtworkGroup('decoration-'+name,{x:x+ox,y:foot},(frames||[name]).map(pose=>({pose,x:x+ox,y:foot})),8,{extraBlocks:notes});
    spr(frames ? frames[RM ? 0 : Math.floor(f / sec) % frames.length] : name, p.x, p.y);
  }
}
// 북쪽 세 판의 뒤: 대장간은 흙 가마 · 불길 · 디딤풀무(사람이 그 위에 선다), 밭은 뽑은 풀 더미, 강가는 버드나무 그네
function drawKindBg(f, rec, vt, pressing, final) {
  net.progress = netProgress(rec, vt);
  // 끝 모습(5단계)은 끝 한 방을 맞혔을 때만. 놓치면 맞힌 만큼에 머문다(가래질 흙 · 운재 통나무와 같음)
  const im = netBackdrop(), k = netKind(), done = final && net.finalT > 0, s = done ? 5 : kindStage();
  lg.fillStyle = netSky || moodSky(MOOD_DAY); lg.fillRect(0, 0, VW, VH);
  lg.fillStyle = netGround; lg.fillRect(0, Math.max(0, 126 - vy), VW, VH);
  if (im) {
    // 강가 배경은 왼쪽 끝에 버드나무가 붙어 있어 통째로 접으면 두 그루가 맞붙는다. 나무 뒤 칸부터 접는다
    const cut = k === 'dance' ? DANCE_TREE_W : 0, ox = k === 'dance' ? DANCE_BG_X : 0;
    if(k==='dance'&&captionDLive()){
      lg.save();lg.translate(ox+DANCE_TREE_W-vx,-vy);lg.scale(-1,1);lg.drawImage(im,DANCE_TREE_W,0,DANCE_TREE_W,im.height,0,0,DANCE_TREE_W,im.height);lg.restore();
      lg.drawImage(im,DANCE_TREE_W,0,im.width-DANCE_TREE_W,im.height,ox+DANCE_TREE_W-vx,-vy,im.width-DANCE_TREE_W,im.height);
    }else lg.drawImage(im,ox-vx,-vy);
    if (vx < ox) { lg.save(); lg.translate(ox - vx, -vy); lg.scale(-1, 1); lg.drawImage(im, cut, 0, 320 - cut, 200, 0, 0, 320 - cut, 200); lg.restore(); }
    if (vx + VW > 320 + ox) { lg.save(); lg.translate(640 + ox - vx, -vy); lg.scale(-1, 1); lg.drawImage(im, 0, 0); lg.restore(); }
    if(k==='dance'&&captionDLive()){const tree=danceTreePlace(),image=danceTreeImage();if(image)lg.drawImage(image,Math.round(tree.x-vx),Math.round(tree.y-vy));}
  }
  drawKindDeco(f, 'back', s);
  if (k === 'forge') {
    // 불길은 맞힌 만큼 다섯 단계. 밟은 순간엔 한 단계 더 솟고, 가만히 있을 땐 한 단계 아래로 일렁인다
    spr('furnace', forgePlace().x, forgePlace().y);
    const held=!paused&&charge&&!charge.pending&&rec?.def.call,phase=held?Math.floor((vt-rec.t0)/(rec.beat/2)+1e-6):-1,down=held?(RM||phase%2===1):pressing||forgeStomped(f);
    if(held){
      const key=`${rec.t0}:${phase}`;
      if(net.forgeBeat!==key){net.forgeBeat=key;if(down){net.forgePulseT=f;if(ctx)sample('creak',ctx.currentTime,.5*(.84+Math.random()*.3),sfx,.96+Math.random()*.08);if(!RM){const h=anchor('furnace','hole',[32,78],forgePlace());for(let i=0;i<2;i++)part({x:h.x-6+i*12,y:h.y-10,vx:i?-16:16,vy:24,grav:0,life:.3,w:1,h:1,c:FORGE_SPARK[i],forge:'air'});}}}
    }else net.forgeBeat=null;
    const top = anchor('furnace', 'top', [32, 6], forgePlace()),age=f-net.hitT;
    const up=age<(net.power>0?.5:net.forgeRun===3?.35:.25)?(net.forgeRun===3?2:1):f-net.forgePulseT<.15?1:0;
    const flick = RM || up || final ? 0 : Math.floor(f * 7) % 3 === 0 ? -1 : 0,flame=Math.max(1,Math.min(done?5:4,Math.max(1,s)+up+flick));
    spr(`flame-${flame}`,top.x,top.y);
    spr(down?'bellows-down':'bellows-up',forgeBellowsPlace().x,forgeBellowsPlace().y);
    net.forgeView={flame,bellowsDown:!!down,phase,pulse:up,run:net.forgeRun,held:!!held};
  } else if (k === 'field') { if (s) {const pile=fieldPilePlace();spr(`pile-${s}`,pile.x,pile.y);} }
  else if (k === 'dance') {
    // 그네는 맞힌 만큼 높이 차오르고, 한 단계 아래와 번갈아 흔들린다
    // 끝 한 방 뒤에는 그네가 끝까지 올랐다 내려오기를 크게 되풀이한다(2026-11-13 검수 B06)
    const big = done && !RM ? [5, 4, 3, 2, 3, 4][Math.floor((f - net.finalT) / .16) % 6] : null;
    const n = big ?? (RM || s === 0 ? s : Math.floor(f / .6) % 2 ? s : s - 1), name = `swing-${n}`, off = anchor(name, 'top', [28, 0], { x: 0, y: 0, dir: 1 });
    const tree=danceTreePlace();spr(name,tree.x+56-off.x,tree.y+DANCE_SWING.y-off.y);
  } else if (k === 'dungdang' && done) {
    // 끝 한 방: 바다 위로 보름달이 1초 동안 떠오른다
    const up = RM ? 1 : easeOut(clamp01((f - net.finalT) / 1));
    spr('moon', 270, Math.round(96 - 30 * up));
  }
  net.waterGeometry = null;
  return null;
}
// 북쪽 세 판의 앞: 맞힌 순간의 효과 그림, 밭의 풀 포기와 새참 광주리, 대장간 쇳물. 글자가 피할 소품 자리도 돌려준다
function drawKindFront(f, bodies, final) {
  const k = netKind(), done = final && net.finalT > 0, s = done ? 5 : kindStage(), child = bodies.find(p => p.name === 'hero'), h = Math.floor((f - net.hitT) / .06), on = net.hitT > 0 && h >= 0 && !RM, rects = [];
  drawKindDeco(f, 'front', s);
  if (k === 'forge') {
    const top = anchor('furnace', 'top', [32, 6], forgePlace()),hole=anchor('furnace','hole',[32,78],forgePlace());
    if (on && h < 6) spr(`fx-spark-0${h + 1}`, hole.x, hole.y);
    if (on && h < 4) spr(`fx-stomp-0${h + 1}`, child.x, child.y + 1);
    if (net.finalT > 0 && f - net.finalT >= .3) {
      const hole = anchor('furnace', 'hole', [32, 78], forgePlace()),spillX=hole.x+((14)); spr('molten', spillX, forgePlace().y + 6); // 세로폰도 쇳물 끝까지 화면 안
      // 쇳물이 나온 뒤 3초 동안 쇳물 위로 불꽃이 0.9초마다 튄다(B06)
      const age = f - net.finalT - .3, hs = Math.floor((age % .9) / .06);
      if (done && !RM && age < 3 && hs < 6) spr(`fx-spark-0${hs + 1}`, spillX, forgePlace().y - 4);
    }
    rects.push([forgePlace().x - 32, top.y - 48, forgePlace().x + 32, forgePlace().y + 3], [forgeBellowsPlace().x - 72, forgeBellowsPlace().y - 24, forgeBellowsPlace().x + 72, forgeBellowsPlace().y]);
  } else if (k === 'field') {
    if (!done) bodies.filter(p => p.name !== 'leader' && !p.arrive).forEach((p, i) => spr(i % 2 ? 'weed-b' : 'weed-a', Math.round(p.x + 18), p.fore?p.y+2:166 - (p.name === 'hero' && on && h < 3 ? 2 : 0)));
    for (const x of FIELD_WEEDS.slice(done ? 6 : s)) spr(x % 4 ? 'weed-b' : 'weed-a', x, 167);
    if (on && h < 6) { const tip = anchor(child.pose, 'handR', [40, 44], child); spr(`fx-weed-0${h + 1}`, tip.x + 6, child.y + 2); }
    if (net.finalT > 0 && f - net.finalT >= .5) {
      spr('basket', FIELD_BASKET.x, FIELD_BASKET.y);
      // 새참 광주리에서 김이 오른다: 세 줄기가 1.6초마다 올라가며 흔들리다 사라진다(B06)
      if (done && !RM) { lg.fillStyle = '#fffaf0'; for (let j = 0; j < 3; j++) { const p = ((f - net.finalT - .5) / 1.6 + j / 3) % 1; if (p > .85) continue; for (let k = 0; k < 3; k++) { const yy = FIELD_BASKET.y - 22 - p * 22 - k * 3, xx = FIELD_BASKET.x - 7 + j * 7 + Math.round(Math.sin((p * 3 + k * .5 + j) * Math.PI) * 1.5); lg.fillRect(Math.round(xx - vx), Math.round(yy - vy), 1, 2); } } }
    }
    const pile=fieldPilePlace();rects.push([pile.x - 24, pile.y - 24, pile.x + 24, pile.y + 2]);
    if (net.finalT > 0) rects.push([FIELD_BASKET.x - 20, FIELD_BASKET.y - 24, FIELD_BASKET.x + 20, FIELD_BASKET.y]);
  } else if (k === 'dance') {
    if (on && h < 6) { const a = anchor(child.pose, 'handL', [14, 6], child), b = anchor(child.pose, 'handR', [34, 6], child); spr(`fx-petal-0${h + 1}`, Math.round((a.x + b.x) / 2), Math.max(Math.max(a.y,b.y)+16,child.y-10)); }
    if (on && h < 4) spr(`fx-step-0${h + 1}`, child.x, child.y + 1);
    const tree=danceTreePlace();rects.push([tree.x+26,tree.y+DANCE_SWING.y,tree.x+116,tree.y+DANCE_SWING.y+82]);
  } else if (k === 'dungdang') {
    // 앉은 사람마다 앞에 물방구. 꼬마 것은 맞힌 순간 가라앉아 출렁이고 물방울 · 물결이 인다. 줄꾼 것은 함께 친 박에 가라앉는다
    const npcOn = netPull(f).active;
    for (const p of bodies) {
      if (p.name === 'leader' || p.arrive) continue;
      const mine = p.name === 'hero', hit = mine ? on && h < 3 : npcOn && /-pull/.test(p.pose), jx = Math.round(p.x), jy = p.y + 6;
      spr(hit && SPRITES['mulbanggu-hit'] ? 'mulbanggu-hit' : 'mulbanggu', jx, jy);
      const top = anchor('mulbanggu', 'top', [16, 4], { x: jx, y: jy, dir: 1 });
      if (mine && on && h < 5) spr(`fx-splash-0${h + 1}`, top.x + (net.side === 'L' ? -3 : 3), top.y);
      if (mine && on && h < 6) spr(`fx-ring-0${Math.min(3, (h >> 1) + 1)}`, top.x, top.y + 3);
      rects.push([jx - 16, jy - 24, jx + 16, jy]);
      // 물방구가 무릎 앞을 덮으니 손 칸만 다시 찍는다: 치는 주먹이 바가지 위에 보인다(줄 판이 줄 위로 손을 다시 찍는 것과 같음)
      const im = SPRITES[p.pose], m = META[p.pose];
      if (im && m?.foot) for (const key of ['handL', 'handR']) { const hd = m[key]; if (hd) lg.drawImage(im, hd[0] - 3, hd[1] - 3, 7, 7, Math.round(p.x - vx - m.foot[0] + hd[0] - 3), Math.round(p.y - vy - m.foot[1] + hd[1] - 3), 7, 7); }
    }
  }
  return { kind: k, stage: s, haul: net.haul, final: done, rects };
}
function drawNetWords(f) {
  for(const [event,el]of cheerTextNodes)if(!fxs.bubbles.includes(event)){el.remove();cheerTextNodes.delete(event);}
  const placed=[];
  for (const b of fxs.bubbles) {
    if (f<b.t0) continue;
    const bb=SPRITES.bubble,word=SPRITES[b.word]; if(!bb||!word)continue;
    const x=Math.max(vx+bb.width/2+4,LEAD.x-54),y=125,meta=META.bubble,ft=meta?.foot||[bb.width/2,bb.height-1];
    const avoid=song.id==='punggu'?(net.geometry?.kind?.rects||[]).map(([x0,y0,x1,y1])=>({left:toCssX(x0),top:toCssY(y0),right:toCssX(x1),bottom:toCssY(y1)})):[];
    const spot=cheerPlace(b,{x,y},placed,avoid);
    if(spot){paintCheer(b,f,spot.x,spot.y);placed.push(spot.rect);}
  }
}
