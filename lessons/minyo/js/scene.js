// 팔도 장단 장면: 320×180 점의 도트 마당을 작은 캔버스에 그리고 정수 배로만 늘린다(도트 흐림 0)
const OK = '옹헤야';
const TAU = Math.PI * 2;
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = k => Math.max(0, Math.min(1, k));
const easeOut = k => 1 - Math.pow(1 - k, 3);

// ───────── 그림: 마당은 모든 곡이 같이 쓰고, 일하는 사람과 소품은 곡마다 따로 둔다 ─────────
const YARD_NAMES = ['bg', 'bubble', 'finger-waiting', 'finger-holding', 'finger-released', 'spark', 'word-eolssu', 'word-jota', 'word-jalhanda',
  'spectator-idle', 'spectator-cheer', 'spectator2-idle', 'spectator2-cheer', 'spectator3-idle', 'spectator3-cheer', 'spectator4-idle', 'spectator4-cheer',
  'kid-a-idle', 'kid-a-hop', 'kid-a-run-1', 'kid-a-run-2', 'kid-a-cheer', 'kid-b-idle', 'kid-b-hop', 'kid-b-run-1', 'kid-b-run-2', 'kid-b-cheer',
  'tree-l-1', 'tree-l-2', 'tree-c-1', 'tree-c-2', 'tree-r-1', 'tree-r-2', 'cloud-1', 'cloud-2', 'cloud-3', 'chimney'];
const WORKER_NAMES = ['hero-idle', 'hero-raise', 'hero-swing', 'hero-strike', 'hero-rebound', 'hero-jump', 'hero-miss', 'hero-startle', 'hero-stop',
  'leader-idle', 'leader-raise', 'leader-swing', 'leader-strike', 'leader-palm',
  'follower-idle', 'follower-raise', 'follower-swing', 'follower-strike', 'follower-look'];
const SONG_ART = {
  onghe: { dir: 'art/onghe/', names: [...WORKER_NAMES, 'pile', 'pile-hit', 'heap-1', 'heap-2', 'heap-3', 'heap-4', 'heap-5', 'heap-6',
    'quail-walk-1', 'quail-walk-2', 'quail-lay', 'quail-proud', 'quail-peck-1', 'quail-peck-2', 'quail-flee-1', 'quail-flee-2', 'egg'] },
  kwaeji: { dir: 'art/kwaeji/', names: [...WORKER_NAMES, 'hero-hold-1', 'hero-hold-2', 'sun', 'rope-throw', 'rope-pull', 'rope-fly-1', 'rope-fly-2', 'moon', 'torch-1', 'torch-2', 'lanterns'] },
};
// 강강술래: 손잡고 도는 원 사람 셋 × 자세 다섯, 바닷가 배경. 달은 쾌지나 달을 옮겨 왔다
const RING_NAMES = ['a', 'b', 'c'].flatMap(k => ['stand', 'step-1', 'step-2', 'cheer', 'bump'].map(p => `ring-${k}-${p}`));
SONG_ART.ganggang = { dir: 'art/ganggang/', names: [...WORKER_NAMES, ...RING_NAMES, 'sea-bg', 'moon'] };
SONG_ART.wolwol = { dir: 'art/wolwol/', names: [...WORKER_NAMES, ...RING_NAMES, 'sea-bg', 'moon', 'moon-low', 'daljip-0',
  ...[1, 2, 3, 4, 5].flatMap(n => [`fire-${n}a`, `fire-${n}b`])] };
const NET_HERO_NAMES = ['hold', 'pull', 'pullbig', 'brace', 'early', 'drag', 'sit', 'cheer', 'stop', 'shower', 'proud'].map(p => `hero-${p}`);
const NET_NAMES = [...NET_HERO_NAMES, ...['hold', 'sing-a', 'sing-b', 'look', 'cheer'].map(p => `leader-${p}`),
  ...['a', 'b', 'c'].flatMap(k => ['hold', 'pull', 'cheer', 'stumble'].map(p => `puller-${k}-${p}`)), 'teu', 'gull-1', 'gull-2', 'catch', 'float', 'net-body', 'net-bg', 'anchovy'];
SONG_ART.myeolchi = { dir: 'art/myeolchi/', names: NET_NAMES };
// 충청 가래질: 줄 판 틀에 집터 배경 · 가래 한 틀 · 흙 무더기 다섯 · 흙 튀김 여섯
SONG_ART.garae = { dir: 'art/garae/', names: [...NET_NAMES.filter(n => !['teu', 'gull-1', 'gull-2', 'catch', 'float', 'net-body', 'anchovy'].includes(n)), ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`),
  'garae-planted', 'garae-pulled', ...[1, 2, 3, 4, 5].map(n => `soil-${n}`), ...[1, 2, 3, 4, 5, 6].map(n => `fx-soil-0${n}`)] };
// 강원 운재: 줄 판 틀에 눈 산비탈 배경 · 통나무 · 눈가루 여섯 · 깍장쇠 찍힘 넷
SONG_ART.unjae = { dir: 'art/unjae/', names: [...NET_NAMES.filter(n => !['teu', 'gull-1', 'gull-2', 'catch', 'float', 'net-body', 'anchovy'].includes(n)), ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`),
  'timber', ...[1, 2, 3, 4, 5, 6].map(n => `fx-snow-0${n}`), ...[1, 2, 3, 4].map(n => `fx-hook-0${n}`)] };
// 북쪽 세 곡(2026-11-13): 줄 판 틀에 곡마다 소품. 황해 대장간 · 평안 밭 · 함경 강가
const NET_LAND_BASE = NET_NAMES.filter(n => !['teu', 'gull-1', 'gull-2', 'catch', 'float', 'net-body', 'anchovy'].includes(n));
SONG_ART.dungdang = { dir: 'art/dungdang/', names: [...NET_LAND_BASE, 'hero-pullr', 'hero-cross', ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`), 'mulbanggu', 'mulbanggu-hit', 'moon', 'deco-1a', 'deco-1b', 'deco-2', 'deco-3', 'deco-4',
  ...[1, 2, 3, 4, 5].map(n => `fx-splash-0${n}`), ...[1, 2, 3].map(n => `fx-ring-0${n}`)] }; // 판 17 시제품
SONG_ART.punggu = { dir: 'art/punggu/', names: [...NET_LAND_BASE, ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`), 'furnace', ...[1, 2, 3, 4, 5].map(n => `flame-${n}`), 'bellows-up', 'bellows-down', 'molten', 'deco-1a', 'deco-1b', 'deco-2', 'deco-3', 'deco-4',
  ...[1, 2, 3, 4, 5, 6].map(n => `fx-spark-0${n}`), ...[1, 2, 3, 4].map(n => `fx-stomp-0${n}`)] };
SONG_ART.jajinari = { dir: 'art/jajinari/', names: [...NET_LAND_BASE, ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`), 'weed-a', 'weed-b', ...[1, 2, 3, 4, 5].map(n => `pile-${n}`), 'basket', 'deco-1', 'deco-2', 'deco-3a', 'deco-3b', 'deco-4a', 'deco-4b',
  ...[1, 2, 3, 4, 5, 6].map(n => `fx-weed-0${n}`)] };
SONG_ART.singosan = { dir: 'art/singosan/', names: [...NET_LAND_BASE, ...['a', 'b', 'c'].map(k => `puller-${k}-pullbig`), ...[0, 1, 2, 3, 4, 5].map(n => `swing-${n}`), 'deco-1', 'deco-2a', 'deco-2b', 'deco-3', 'deco-4',
  ...[1, 2, 3, 4, 5, 6].map(n => `fx-petal-0${n}`), ...[1, 2, 3, 4].map(n => `fx-step-0${n}`)] };
const NET_ART_IDS = ['myeolchi', 'garae', 'unjae', 'punggu', 'jajinari', 'singosan', 'dungdang'];
const BOAT_HERO_NAMES = ['hold', 'row', 'rowbig', 'brace', 'early', 'drag', 'grab', 'cheer', 'stop', 'wave-a', 'wave-b', 'proud'].map(p => `hero-${p}`);
const BOAT_NAMES = [...BOAT_HERO_NAMES, ...['hold', 'sing-a', 'sing-b', 'look', 'cheer'].map(p => `leader-${p}`),
  ...['a', 'b', 'c'].flatMap(k => ['hold', 'row', 'cheer', 'stumble'].map(p => `rower-${k}-${p}`)), 'boat', 'flags', 'splash', 'fish-1', 'fish-2', 'boat-bg'];
SONG_ART.geomun = { dir: 'art/geomun/', names: [...BOAT_NAMES,'basket'] };
SONG_ART.baennorae = { dir: 'art/jajin/', names: [...BOAT_NAMES,'bank','dock','guest-drum','guest-fan','guest-drum-wave','guest-fan-wave','onlooker','onlooker-wave'] };
const SPRITES = {}; const META = {};
let artTry = 0; // 응답 없는 요청을 버린 뒤에는 주소를 바꾼다. 같은 주소면 브라우저가 멈춘 요청에 그대로 붙인다
function loadArtSet(dir, names) {
  const set = { sprites: {}, meta: {}, missing: 0, done: false }, q = artTry ? `?r=${artTry}` : '';
  const manifest=fetch(dir + 'sprites.json' + q).then(r => (r.ok ? r.json() : Promise.reject())).then(j => { for (const k in j) set.meta[k.replace(/\.png$/, '')] = j[k]; }).catch(() => { set.missing++; });
  set.ready = Promise.all([
    manifest,
    ...names.map(n => manifest.then(()=>new Promise(done => { const im = new Image(); im.onload = () => { set.sprites[n] = im; done(); }; im.onerror = () => { set.missing++; done(); }; im.src = `${dir}${set.meta[n]?.file || ((n === 'net-bg' || n === 'boat-bg') && set.meta.bg?.file) || `${n === 'net-bg' || n === 'boat-bg' ? 'bg' : n}.png`}${q}`; }))),
  ]).then(() => { set.done = true; return set; });
  return set;
}
function putArt(set, names) { for (const n of names) { if (set.sprites[n]) SPRITES[n] = set.sprites[n]; if (set.meta[n]) META[n] = set.meta[n]; } }
// 마당 공용 그림. 다 받았으면 true, 못 받은 그림이 있으면 false(다음에 다시 받는다)
let yardSet = null;
function yardArtReady() {
  if (!yardSet) yardSet = loadArtSet('art/onghe/', YARD_NAMES);
  const set = yardSet;
  return set.ready.then(() => { putArt(set, YARD_NAMES); if (set.missing && yardSet === set) yardSet = null; return !set.missing; });
}
yardArtReady();
const artSets = {}; let artNow = null;
function dropArtWaits(id) {
  if (NET_ART_IDS.includes(id) && artNow !== id) { netArtPromise = null; artTry++; }
  if ((id === 'geomun' || id === 'baennorae') && artNow !== id) { boatArtPromise = null; artTry++; }
  if (yardSet && !yardSet.done) { yardSet = null; artTry++; }
  if (artSets[id] && !artSets[id].done) { delete artSets[id]; artTry++; }
}
// 곡의 사람과 소품으로 바꿔 끼운다. 전 곡 그림(낟알 더미 등)은 곡을 바꾸는 즉시 치운다. 다 받았으면 true, 못 받은 그림이 있으면 false(다음에 다시 받는다)
function songArtReady(id) {
  if (NET_ART_IDS.includes(id)) return netArtReady();
  if (id === 'geomun' || id === 'baennorae') return boatArtReady();
  const art = SONG_ART[id]; if (!art) return Promise.resolve(true);
  if (artNow === id) return Promise.resolve(true);
  if (artNow) { for (const n of SONG_ART[artNow].names) { delete SPRITES[n]; delete META[n]; } artNow = null; flashCache = null; }
  if (!artSets[id]) artSets[id] = loadArtSet(art.dir, art.names);
  const set = artSets[id];
  return set.ready.then(() => {
    if (set.missing) { if (artSets[id] === set) delete artSets[id]; return false; }
    if (artNow !== id && song && song.id === id) { putArt(set, art.names); artNow = id; flashCache = null; }
    return true;
  });
}

// ───────── 화면: 점 하나 = 기기 화소 K개(정수) ─────────
const cv = document.getElementById('cv');
const g = cv.getContext('2d');
const lo = document.createElement('canvas');
const lg = lo.getContext('2d');
const MIN_W = 212, MIN_H = 96, WORLD_W = 320, WORLD_H = 180;
let W = 0, H = 0, DPR = 1, K = 1, VW = 0, VH = 0, CVW = 0, CVH = 0, camX = 0, camY = 0, vx = 0, vy = 0;
let baseK = 1, wideOn = false, zoomStepAt = 0, learnStageViewWasOn = false;
function applyView(k) {
  K = k; VW = Math.ceil(CVW / K); VH = Math.ceil(CVH / K);
  lo.width = VW; lo.height = VH; lg.imageSmoothingEnabled = false; g.imageSmoothingEnabled = false;
  camX = Math.round(WORLD_W / 2 - VW / 2);
  document.body.classList.toggle('wideView', k !== baseK);
  const widest = k !== baseK && k === wideK();
  const bottom = (typeof song!=='undefined'&&captionDLive()&&song?.id==='kwaeji')&&H<=420?186:widest ? Math.min(186, Math.max(VH < 166 ? 172 : 176, VH)) : VH > 190 ? 186 + Math.round((VH - 190) * 0.35) : VH >= 120 ? 186 : 182;
  camY = bottom - VH; vx = camX; vy = camY;
  if ((typeof song !== 'undefined' && typeof wolwolOn === 'function' && wolwolOn()) && H > 420 && !onStartScreen()) {
    const room = H - (HERO.y - camY) * K / DPR;
    if (room < 72) { camY += Math.max(10, Math.ceil((72 - room) * DPR / K)); vy = camY; }
  }
  HEAP.y = VH < 120 ? 168 : 174;
}
// 넓은 화면: 앞소리꾼이 부르는 동안 물러나 하늘까지 보여 준다. 한 점이 1.5px 아래로는 가지 않는다
function wideK() {
  return Math.max(1, Math.min(baseK, Math.max(Math.ceil(1.5 * DPR), Math.floor(CVH / 166))));
}
// 점 크기가 정수라 한 칸씩 물러나고 다가간다. 뚝 끊기지 않고 움직이는 카메라로 보인다
function setWide(on, f) {
  wideOn = on;
  // D keeps one view for the round, including the incoming response beat.
  if(typeof captionD!=='undefined'&&captionDLive()){
    const viewKey=[song.id,W,H,DPR].join('|');
    const changed=captionD.viewKey!==viewKey;
    if(changed){captionD.viewKey=viewKey;captionD.viewK=boatOn()?boatViewK():netOn()?netCaptionK():wolwolOn()?wolViewK():wideK();}
    const fixed=captionD.viewK;
    if(changed||K!==fixed)applyView(fixed);
    return;
  }

  const learnWide = (!!learning && ringOn()) && H <= 420 && (learning.intro || learning.step < 4);

  let want = (learnWide ? wideK() : boatOn() ? boatViewK() : netOn() ? netViewK() : wolwolOn() ? wolViewK() : on ? wideK() : baseK);
  // 가로 태블릿 시작 · 배우기 소개 인물은 1280 화면의 85% 이상. 놀이 중 시야는 그대로 쓴다.
  const tabletIntro=!!learning?.intro&&!boatOn()&&!netOn()&&W>=900&&W<1280&&H>420;
  if((onStartScreen()&&!on||tabletIntro)&&!boatOn()&&!netOn()&&W>=900&&W<1280&&H>420)want=Math.max(want,Math.ceil(Math.floor(1280*DPR/MIN_W)*.85));
  const fixedLesson=(!!learning&&learning.step<4&&ringOn());
  if(fixedLesson)learnStageViewWasOn=true;
  else if(learnStageViewWasOn){learnStageViewWasOn=false;applyView(want);return;}
  if (K === want) {
    if ((wolwolOn()) && H > 420 && !onStartScreen() && H - (HERO.y - camY) * K / DPR < 72) applyView(want);
    return;
  }
  if ((RM || learnWide || tabletIntro)) { applyView(want); return; }
  if (f < zoomStepAt) return;
  zoomStepAt = f + 0.07;
  applyView(K + Math.sign(want - K));
}
function resetView() { wideOn = false; if (K !== baseK) applyView(baseK); }
// 낮은 해상도 판을 1:1로 옮기고 CSS로 K배 키운다(#cv image-rendering:pixelated). 기기 해상도 판에 화면마다 크게 옮겨 그리던 일(느린 기기에서 화면당 4.5ms)을 없앤다
// CSS 크기가 정수 px가 아니면 브라우저가 반올림해 점 줄이 한 줄씩 어긋난다(DPR 2 · 2.625에서 잼). 화면 밖에 빈 점을 몇 줄 덧대 정수 px로 맞추고, 24줄 안에 못 맞추면 옛 방식(기기 해상도 판)으로 그린다
let blitKey = '', blitLow = false;
const blitFit = n => { for (let e = 0; e <= 24; e++) { const c = (n + e) * K / DPR; if (Math.abs(c - Math.round(c)) < 1e-3) return n + e; } return 0; };
function blitLo() {
  const key = `${VW}|${VH}|${K}|${DPR}|${CVW}|${CVH}`;
  if (blitKey !== key) {
    blitKey = key; const bw = blitFit(VW), bh = blitFit(VH); blitLow = !!(bw && bh);
    cv.width = blitLow ? bw : CVW; cv.height = blitLow ? bh : CVH;
    cv.style.width = blitLow ? `${Math.round(bw * K / DPR)}px` : ''; cv.style.height = blitLow ? `${Math.round(bh * K / DPR)}px` : '';
    g.imageSmoothingEnabled = false;
  }
  if (blitLow) g.drawImage(lo, 0, 0); else g.drawImage(lo, 0, 0, VW * K, VH * K);
}
function resize() {
  DPR = window.devicePixelRatio || 1; W = innerWidth; H = innerHeight;
  CVW = Math.round(W * DPR); CVH = Math.round(H * DPR); // 기기 화소 크기. cv 바탕은 blitLo가 VW×VH로 맞춘다
  baseK = Math.max(1, Math.floor(Math.min(CVW / MIN_W, CVH / MIN_H)));
  applyView(wideOn ? wideK() : baseK);
  const root = document.documentElement.style;
  root.setProperty('--dot', `${baseK / DPR}px`);
  // 도장은 48점 원본의 기기 화소 정수 배. 끝 쪽지 도장과 상쇠 도장, 곡 줄 도장
  const sealPx = want => `${48 * Math.max(1, Math.round(want * DPR / 48)) / DPR}px`;
  root.setProperty('--seal', sealPx(H <= 420 ? 48 : (96)));
  root.setProperty('--sealTop', sealPx(H <= 420 ? 48 : (144)));
  root.setProperty('--chip', sealPx(40));
  root.setProperty('--chipS', sealPx(24));
}

// ───────── 놀이 판의 자리(세계 좌표, 발 기준) ─────────
// bx: 말풍선이 서는 가로 자리(발에서). 강강술래는 ring.js의 자리로 바꿔 끼운다
const LEAD = { x: 84, y: 158, dir: 1, name: 'leader', bx: 6 };
// 메기는 말풍선 꼬리 자리. 땅 줄 판(가래 · 운재)은 얼굴 칸(발 위 36점)까지 올라오니 8점 더 올린다
// 북쪽 세 판은 앞소리꾼이 서는 높이가 달라도(대장간 166 · 밭과 강가 160) 말풍선은 집터와 같은 116에 둔다. 낮으면 옆 일꾼 얼굴을 덮는다
const leadBubbleY = () => netOn() && netKind() ? 116 : LEAD.y - (netOn() && netLand() ? 42 : 34);
// 산비탈(운재)은 비탈 위쪽 줄꾼이 꼬마보다 높이 서서, 받는 말풍선을 3점 더 올려 그 얼굴 칸을 비킨다
// 받는 말풍선을 3점 올리는 판: 산비탈(위쪽 줄꾼이 높이 섬), 밭(꼬마가 쪼그려 앉아 낮고 앞소리꾼은 서 있어 세로 폰에서 얼굴을 4px 덮음, 6점)
const slopeLift = () => !netOn() ? 0 : netKind() === 'field' ? 6 : netSlope() ? 3 : 0; // 밭은 꾹 누를 때 꼬마가 3점 더 낮아져 6
const FOLLOW = { x: 136, y: 150, dir: 1, name: 'follower' };
const HERO = { x: 226, y: 168, dir: -1, name: 'hero', bx: -21 };
const PILE = { x: 155, y: 170 };
const HEAP = { x: 112, y: 174 };
const SPEC = [{ x: 78, name: 'spectator', side: 1 }, { x: 242, name: 'spectator2', side: -1 }];
const GROUND = '#e7d597'; // 배경 그림 맨 아래 땅과 같은 색(폰 세로에서 이음매가 안 보이게)
const specY = () => Math.max(song && song.ring ? RING_SEA.wallTop : 110, vy + 36);
addEventListener('resize', resize); resize();

function spr(name, x, y, dir = 1) {
  const im = SPRITES[name]; if (!im) return;
  if(captionDLive()&&!/^(hero-|leader-|follower-|ring-|puller-|rower-|spectator|kid-|dancer)/.test(name)&&name!=='bubble'&&!name.startsWith('word-')){
    captionD.props.push({pose:name,x,y,dir});
  }
  if(captionDLive()&&captionD.slots.me&&!netOn()&&!boatOn()&&!name.startsWith('rope-')){
    const moved=captionDAvoid({name,pose:name,x,y,dir});x=moved.x;y=moved.y;
  }
  if (learnDrawBodies) learnRecordBody(name, x, y, dir);
  const m = META[name], fx = m && m.foot ? m.foot[0] : im.width / 2, fy = m && m.foot ? m.foot[1] : im.height - 1;
  const top = Math.round(y - vy - fy);
  if (dir > 0) { lg.drawImage(im, Math.round(x - vx - fx), top); return; }
  const left = Math.round(x - vx - (im.width - fx));
  lg.setTransform(-1, 0, 0, 1, left + im.width, top); lg.drawImage(im, 0, 0); lg.setTransform(1, 0, 0, 1, 0, 0);
}
const FLIP_MID = 22;
// 원 판 내 꼬마는 몸 한가운데(발에서 오른쪽 7 · 위 16)를 축으로 돈다. 거꾸로 서도 몸 윗선이 그대로라 말풍선을 뚫고 오르지 않는다
const RING_FLIP_PIVOT = [7, 16];
// 원 판 받는 말풍선은 내 꼬마가 뛰어도 따라 오르지 않는다(칠 글자와 구슬이 그대로). 그래서 서 있을 때보다 RING_HEADROOM점 높이 두고,
// 뛰기 · 공중돌기는 그 안에서 한다. 공중돌기는 팔 든 그림으로 돌아 옆으로 누워도 꼬리와 2점 넘게 떨어진다(flip.mjs로 잼)
const RING_HEADROOM = 6, RING_JUMP = 6, RING_FLIP_RISE = 6;
const flipNow = f => { const k = RM ? 1 : (f - hero.flipT) / 0.42; return k >= 0 && k < 1 ? k : -1; };
// 도는 축은 발에서 오른쪽 piv[0] · 위 piv[1] 점. 없으면 발 위 FLIP_MID
function sprTurn(name, x, y, dir, q, piv) {
  const im = SPRITES[name]; if (!im) return;
  const m = META[name], fx = m && m.foot ? m.foot[0] : im.width / 2, fy = m && m.foot ? m.foot[1] : im.height - 1, px = piv ? piv[0] : 0, py = piv ? piv[1] : FLIP_MID;
  lg.save(); lg.translate(Math.round(x - vx + dir * px), Math.round(y - vy - py)); lg.rotate(q * dir * Math.PI / 2); lg.scale(dir, 1);
  lg.drawImage(im, -fx - px, -fy + py); lg.restore();
}
function anchor(name, key, fallback, a) {
  const m = META[name], p = m && m[key] ? m[key] : fallback, ft = m && m.foot ? m.foot : [32, 62];
  return { x: a.x + a.dir * (p[0] - ft[0]), y: a.y + (p[1] - ft[1]) };
}

// ───────── 입자: 낟알 · 짚 · 먼지. 모두 불투명 점 ─────────
const GRAIN = ['#d9ab3f', '#f2dc9a', '#b8862e'], STRAW = ['#e6c779', '#c9a24e'], DUST = ['#efe3c4', '#dccfa8'];
const pick = list => list[Math.floor(Math.random() * list.length)];
function part(o) { fxs.particles.push(o); if (fxs.particles.length > 240) fxs.particles.shift(); }
function grains(x, y, n, speed = 1, big = false) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, s = (35 + Math.random() * 55) * speed;
    part({ x: x + (Math.random() - 0.5) * 8, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (big ? 0.5 : 0.3) + Math.random() * 0.4, c: pick(GRAIN), w: big || Math.random() < 0.3 ? 2 : 1, h: big ? 2 : 1, grav: 240 });
  }
}
// 모으는 동안 발밑에서 오색 종이가 오른다. 많이 모을수록 빨리, 높이
let chargeEmit = 0;
const chargePower = () => (charge && !charge.pending && ctx ? clamp01((heardNow() - charge.t0) / chargeFullFor(charge.rec)) : 0);
function stepChargeFx(dt) {
  if (!charge) { hero.whirl = 0; return; }
  const k = chargePower();
  hero.whirl += dt * (5 + k * 15);
  chargeEmit -= dt;
  if (chargeEmit > 0 || RM) return;
  chargeEmit = 0.16 - k * 0.1;
  part({ x: HERO.x + (Math.random() - 0.5) * 34, y: HERO.y - 1, vx: (Math.random() - 0.5) * 8, vy: -22 - k * 34 - Math.random() * 12, life: 0.55 + k * 0.3, c: pick(PAPER), w: 2, h: 2, grav: 0 });
}
// 상모가 한 단 커질 때: 꼭지에서 오색 종이가 터지고 끈이 한 바퀴 돈다
function levelUpFx(level) {
  const f = performance.now() / 1000, m = META['hero-idle'], kn = m && m.knob ? m.knob : [27, 27], ft = m && m.foot ? m.foot : [21, 59];
  if (m && !m.knob) return;
  bits(HERO.x + HERO.dir * (kn[0] - ft[0]), HERO.y + (kn[1] - ft[1]), 10 + level * 8, 1 + level * 0.3);
  hero.spinT = f;
}
function chargeFullFx() {
  const p = heroHitPoint();
  fxs.sparks.push({ x: p.x, y: p.y - 18, t0: performance.now() / 1000 });
}
// 풍물 곡은 낟알 대신 오색 종이가 날린다
const PAPER = ['#e8a79a', '#f0d48a', '#9cc4a8', '#94b4d6', '#fbf6e6'];
const pung = () => !!(song && song.pungmul);
function paper(x, y, n, speed = 1, big = false) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (30 + Math.random() * 50) * speed, size = big ? 3 : 2;
    part({ x: x + (Math.random() - 0.5) * 8, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: big ? 1 + Math.random() * 0.8 : 0.5 + Math.random() * 0.5, c: pick(PAPER), w: size, h: size, grav: big ? 70 : 110 });
  }
}
const bits = (x, y, n, speed = 1, big = false) => (pung() ? paper(x, y, n, speed, big) : grains(x, y, n, speed, big));
function straws(x, y, n) {
  if (pung()) return;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 25 + Math.random() * 45;
    part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.3, c: pick(STRAW), w: 3, h: 1, flip: Math.random() * 6, grav: 170 });
  }
}
function dust(x, y, n) {
  for (let i = 0; i < n; i++) part({ x: x + (Math.random() - 0.5) * 16, y: y - Math.random() * 3, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 7, life: 0.32 + Math.random() * 0.18, c: pick(DUST), r: 3, grav: 0 });
}
function flyToHeap(x, y, n) {
  if (pung()) return;
  const tgt = heapTop();
  for (let i = 0; i < n; i++) part({ fly: true, x0: x, y0: y, x1: tgt.x + (Math.random() - 0.5) * 8, y1: tgt.y, t: -i * 0.03, dur: 0.38 + Math.random() * 0.12, x, y, life: 1, c: pick(GRAIN), w: 1, h: 1 });
}
function heapStage() {
  const total = Math.max(1, songTotal);
  return sc.hits <= 0 ? 0 : Math.min(6, 1 + Math.floor(5 * sc.hits / Math.ceil(total * 0.8)));
}
function heapTop() {
  const st = Math.max(1, heapStage()), im = SPRITES[`heap-${st}`];
  return { x: HEAP.x, y: HEAP.y - (im ? im.height : 6) + 2 };
}
function stepFx(dt) {
  stepBuild();
  const vbNow = ctx ? heardNow() - OFFSET : 0, gc = fxs.buildK > 0 || fxs.particles.some(p => p.gather) ? bigFxAt(PILE) : null;
  fxs.buildC = gc;
  for (const p of fxs.particles) {
    if (p.gather) { // 끝 칠 곳 앞 쌓기의 빛 알: 들리는 시각에 맞춰 내 둘레를 점점 빨리 돌며 좁혀 온다(stepBuild). 줄 · 배 판은 얼굴 · 손 둘레를 비워 두니 한 점으로 모으지 않는다
      const k = clamp01((vbNow - p.w0) / (p.w1 - p.w0)), r = 24 + (p.r0 - 24) * (1 - k) ** 1.5; // 끝 반지름 24점: 꼬마 얼굴 비움 칸(약 40점 폭) 밖
      p.a = p.a0 + k * k * 4.2; p.x = gc.x + Math.cos(p.a) * r; p.y = gc.y - 6 + Math.sin(p.a) * r * 0.55;
      p.hide = k < p.show || (k > 0.85 && ((Math.floor(vbNow * 20) + p.i) & 1)); p.big = k > 0.25; // 끝 무렵 하나 걸러 깜박
      if (vbNow > p.w1 + 0.6) p.life = 0;
      continue;
    }
    if (p.fly) { p.t += dt; const k = clamp01(p.t / p.dur); p.x = p.x0 + (p.x1 - p.x0) * k; p.y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 26; if (k >= 1) p.life = 0; continue; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
  }
  fxs.particles = fxs.particles.filter(p => p.life > 0);
  const f = performance.now() / 1000;
  fxs.bubbles = fxs.bubbles.filter(b => f - b.t0 < b.dur);
  fxs.sparks = fxs.sparks.filter(s => f - s.t0 < 0.3);
  stepChargeFx(dt);
  stepYard(dt, f);
}
function drawParticles() {
  for (const p of fxs.particles) {
    if (p.fly && p.t < 0 || p.hide) continue;
    lg.fillStyle = p.c;
    const x = Math.round(p.x - vx), y = Math.round(p.y - vy);
    if (p.gather) { if (!netOn()) gatherDot(p); continue; } // 쌓기 빛 알. 줄 판은 사람을 가루 뒤에 그려 알이 몸에 숨으니 사람 뒤에 따로 그린다(drawGather)
    if (p.r) {
      const r = p.life / 0.5 > 0.55 ? 3 : p.life / 0.5 > 0.25 ? 2 : 1;
      if (r === 3) { lg.fillRect(x - 2, y - 1, 5, 3); lg.fillRect(x - 1, y - 2, 3, 5); } else if (r === 2) { lg.fillRect(x - 1, y - 1, 3, 3); } else { lg.fillRect(x, y - 1, 1, 3); lg.fillRect(x - 1, y, 3, 1); }
    } else if (p.w === 3) {
      const up = Math.floor((p.life * 14 + p.flip) % 2) === 0;
      lg.fillRect(x, y, up ? 3 : 1, up ? 1 : 3);
    } else lg.fillRect(x, y, p.w, p.h);
  }
  // 쌓기 빛: 마당 판은 반이 지나면 도리깨가 내려칠 더미 위에 마름모 빛이 자란다(3 → 5 → 7점, 끝 무렵 깜박). 터지면 finaleFx 불꽃이 이어받는다.
  // 사람이 친 자리가 몸인 판(줄 · 배 · 원)은 빛이 몸을 덮으니 알 고리만 쓴다
  if (fxs.buildK > 0.4 && fxs.buildC && !stageSong()) {
    const f = performance.now() / 1000, r = Math.min(3, (fxs.buildK > 0.85 ? 3 - (Math.floor(f * 12) & 1) : fxs.buildK > 0.65 ? 2 : 1)), x = Math.round(fxs.buildC.x - vx), y = Math.round(fxs.buildC.y - 6 - vy);
    const diamond = (q, c) => { lg.fillStyle = c; for (let d = -q; d <= q; d++) { const w = q - Math.abs(d); lg.fillRect(x - w, y + d, w * 2 + 1, 1); } };
    diamond(r, '#f2b632'); diamond(r - 1, '#fffbe8');
  }
}

// ───────── 사건마다 효과 (12절 단계표) ─────────
// 1초 안에 효과가 겹치면 센 쪽 · 긴 쪽 하나로 합친다(12절). 사람이 붙는 「와!」(멈칫 0.14초 · 흔들림 2) 바로 뒤의 작은 맞힘 · 추임새가
// 멈칫을 0.03 · 0.07초로, 흔들림을 1로 줄여 덮었다(곡별 검수 07 R1-08, 모든 곡 공용)
function setShake(amp, dur) {
  if (RM) return; const f = performance.now() / 1000, s = fxs.shake;
  if (s && f - s.t0 < s.dur && s.amp * (1 - (f - s.t0) / s.dur) ** 2 > amp) return;
  fxs.shake = { amp, dur, t0: f };
}
function holdStop(f, sec) { fxs.stopUntil = Math.max(fxs.stopUntil, f + sec); }
// 강강술래는 소고 대신 발로 구른다: 맞힌 자리는 발밑
function heroHitPoint() { return boatOn() ? anchor(boat.heroPose || 'hero-hold', 'handB', [46, 50], HERO) : netOn() ? anchor(net.heroPose || 'hero-hold', 'handR', [42, 44], HERO) : ringOn() ? { x: HERO.x + 4, y: HERO.y - 1 } : anchor('hero-strike', 'flailTip', [62, 56], HERO); }
function onHitFx(perfect) { // 작은 단계
  const f = performance.now() / 1000, p = heroHitPoint();
  fxs.pileHit = f; fxs.pileFlash = perfect ? f : -9; holdStop(f, 0.03);
  if (ringOn()) sandKick(p.x, p.y, perfect ? 12 : 7);
  else {
    bits(p.x, p.y - 3, perfect ? 12 : 8); straws(p.x, p.y - 4, perfect ? 3 : 2); if (!pung()) dust(p.x, p.y, perfect ? 3 : 2);
    flyToHeap(p.x, p.y - 4, perfect ? 4 : 3);
  }
  if (perfect) fxs.sparks.push({ x: p.x, y: p.y - 4, t0: f });
  hero.spinT = f;
}
function npcHitFx() { // 앞사람 · 뒷사람도 함께 친다
  if (netOn() || boatOn()) return;
  const f = performance.now() / 1000;
  fxs.pileHit = Math.max(fxs.pileHit, f - 0.02);
  if (ringOn()) { ringNpcFx(); return; }
  for (const a of [{ ...LEAD, n: 'leader-strike' }, { ...FOLLOW, n: 'follower-strike' }]) { const p = anchor(a.n, 'flailTip', [62, 56], a); bits(p.x, p.y - 2, pung() ? 2 : 3, 0.7); if (!pung()) dust(p.x, p.y, 1); }
}
const WORDS = ['word-eolssu', 'word-jota', 'word-jalhanda'];
const CHEER_TEXT = { 'word-eolssu': '얼쑤!', 'word-jota': '좋다!', 'word-jalhanda': '잘한다!' };
const cheerTextNodes = new Map();
function clearCheerText() {
  for (const el of cheerTextNodes.values()) el.remove();
  cheerTextNodes.clear();
}
// 실수한 순간에는 앞 맞힘의 칭찬 말풍선(얼쑤 · 좋다 · 잘한다)을 거둔다(그래프 검수 3회차 R5-03). 아직 안 뜬 예약 말은 그대로
function hushCheers(f = performance.now() / 1000) {
  const n = fxs.bubbles.length;
  fxs.bubbles = fxs.bubbles.filter(b => b.t0 > f || !WORDS.includes(b.word));
  if (fxs.bubbles.length < n) clearCheerText();
}
const CHEER_FADE = 0.2;
let sceneFrameAt = null;
const cheerReadSeconds = word => Math.max(.9, .6 + .15 * Array.from(CHEER_TEXT[word]).length);
function cheerAlpha(b, f) {
  if (b.fullFrameAt != null) {
    const elapsed = (sceneFrameAt ?? f) - b.fullFrameAt, read = cheerReadSeconds(b.word);
    return elapsed <= read ? 1 : Math.max(0, 1 - (elapsed - read) / CHEER_FADE);
  }
  return Math.max(0, Math.min(1, (f - (b.shownAt ?? b.t0)) / CHEER_FADE, (b.t0 + b.dur - f) / CHEER_FADE));
}
// 추임새 말풍선. 원 판은 치는 글자 쪽을 피해 왼쪽 구경꾼이 하나씩만 말한다(폰 세로처럼 왼쪽이 화면 밖이면 오른쪽)
function sayWord(b) {
  if (stageSong()) {
    b.who = SPEC[0].x + SPEC[0].side * 24 >= vx + 8 ? 0 : 1;
  }
  b.dur = CHEER_FADE * 2 + cheerReadSeconds(b.word);
  b.shownAt = null;
  b.fullFrameAt = null;
  fxs.bubbles.push(b);
}
function cheerSize() {
  const bb=SPRITES.bubble, foot=META.bubble?.foot||[bb.width/2,bb.height-1];
  const scale=['kwaeji','myeolchi'].includes(song?.id)?Math.max(1,Math.ceil(16/(11*K/DPR))):1;
  return {bb,scale,ft:foot.map(n=>n*scale),dot:K/DPR};
}
function paintCheer(b, f, x, y, side = 1) {
  const {bb,scale,ft,dot}=cheerSize();
  if (b.shownAt == null) { b.shownAt = f; b.dur += Math.max(0, f - b.t0); }
  if (b.fullFrameAt == null && f - b.shownAt >= CHEER_FADE) {
    b.fullFrameAt = sceneFrameAt ?? f;
    b.dur = Math.max(b.dur, f - b.t0 + cheerReadSeconds(b.word) + CHEER_FADE);
  }
  lg.save(); lg.globalAlpha = cheerAlpha(b, f);
  const left = side > 0 ? x - ft[0] : x - (bb.width*scale - ft[0]);
  if(scale===1)spr('bubble',x,y,side);
  else {
    const px=Math.round(left-vx),py=Math.round(y-ft[1]-vy);
    lg.setTransform(side,0,0,1,side>0?px:px+bb.width*scale,py);
    lg.drawImage(bb,0,0,bb.width*scale,bb.height*scale);lg.setTransform(1,0,0,1,0,0);
  }
  let label = cheerTextNodes.get(b);
  if (!label) {
    label = document.createElement('span'); label.className = 'cheerText';
    label.textContent = CHEER_TEXT[b.word]; document.body.append(label); cheerTextNodes.set(b, label);
  }
  label.hidden = false;
  label.style.left = toCssX(left) + 'px'; label.style.top = toCssY(y - ft[1]) + 'px';
  label.style.width = bb.width * dot*scale + 'px'; label.style.height = (bb.height - 6) * dot*scale + 'px';
  label.style.fontSize = (song?.id==='geomun'?Math.max(16,11*dot*scale):11*dot*scale) + 'px'; label.style.opacity = cheerAlpha(b, f);
  label.style.lineHeight=['kwaeji','myeolchi'].includes(song?.id)?'1.3':'';
  lg.restore();
}
// 머무는 글은 앞 글을 지우지 않고, 현재 글 상자와 얼굴을 피해 놓는다.
function minyoFrameCorners(pad=12){
  const frame=window.frameElement?.getBoundingClientRect();if(!frame)return[];
  // checkVisibility는 사파리 17.4부터 있다. 옛 아이패드에서 없으면 상자가 있는지로 본다(없는 함수를 부르면 놀이가 멈춘다)
  return [...window.parent.document.querySelectorAll('[data-test="exit-x"],[data-test="sound"]')].filter(e=>e.checkVisibility?e.checkVisibility():e.getClientRects().length>0).map(e=>{
    const r=e.getBoundingClientRect();return{left:r.left-frame.left-pad,top:r.top-frame.top-pad,right:r.right-frame.left+pad,bottom:r.bottom-frame.top+pad};
  });
}
function cheerPlace(event, preferred, previous = [], extra = []) {
  const {bb,ft,scale,dot}=cheerSize();
  const w = bb.width * dot*scale, h = bb.height * dot*scale, obstacles = [...previous, ...extra, ...minyoFrameCorners()];
  if(captionDLive()){
    obstacles.push(...captionDReserve().map(r=>({left:r.x,top:r.y,right:r.x+r.w,bottom:r.y+r.h})));
    obstacles.push(...learnBodies().map(r=>({left:r.x,top:r.y,right:r.x+r.w,bottom:r.y+r.h})));
  }
  for (const el of document.querySelectorAll('.lyric,.msg,.combo,.ball,.plate,#learnSay,#learnSteps')) {
    if (!el.hidden && el.getClientRects().length) obstacles.push(el.getBoundingClientRect());
  }
  const bodies = netOn() ? net.geometry?.bodies || [] : boatOn() ? boat.geometry?.bodies || [] :
    [LEAD, HERO, FOLLOW, ...(ring.frontBodies || []), ...(ring.backBodies || [])].map(p => ({ ...p, pose: p.pose || (p.name === 'hero' ? 'hero-idle' : p.name === 'leader' ? 'leader-idle' : p.name === 'follower' ? 'follower-idle' : `${p.name}-stand`) }));
  for (const p of bodies) {
    const m = META[p.pose]; if (!m?.foot) continue;
    const a = m.face || [(m.mouth?.[0] || 26) - 12, (m.mouth?.[1] || 44) - 14, 28, 18];
    const x = p.dir === -1 ? p.x + m.foot[0] - a[0] - a[2] : p.x - m.foot[0] + a[0];
    obstacles.push({ left: toCssX(x), top: toCssY(p.y - m.foot[1] + a[1]), right: toCssX(x + a[2]), bottom: toCssY(p.y - m.foot[1] + a[1] + a[3]) });
  }
  const valid = r => r.left >= 8 && r.top >= 8 && r.right <= W - 8 && r.bottom <= H - 8 && obstacles.every(o => r.right <= o.left - 8 || r.left >= o.right + 8 || r.bottom <= o.top - 8 || r.top >= o.bottom + 8);
  const rect = (x, y) => ({ left: Math.round(x * DPR) / DPR, top: Math.round(y * DPR) / DPR, right: Math.round(x * DPR) / DPR + w, bottom: Math.round(y * DPR) / DPR + h });
  const base = rect(toCssX(preferred.x - ft[0]), toCssY(preferred.y - ft[1]));
  const cached=event.place&&rect(event.place.left,event.place.top);
  let chosen = cached && valid(cached) ? cached : valid(base) ? base : null;
  if (!chosen) {
    const xs = [base.left, 8, W - w - 8, ...obstacles.flatMap(o => [o.left - w - 8, o.right + 8])];
    const ys = [base.top, 8, H - h - 8, ...obstacles.flatMap(o => [o.top - h - 8, o.bottom + 8])];
    let cost = Infinity;
    for (const x of xs) for (const y of ys) { const r = rect(x, y); if (!valid(r)) continue; const d = Math.hypot(r.left - base.left, r.top - base.top); if (d < cost) { cost = d; chosen = r; } }
  }
  event.place = chosen;
  if (!chosen) { event.unplaced = true; return null; }
  return { x: vx + chosen.left / dot + ft[0], y: vy + chosen.top / dot + ft[1], rect: chosen };
}
// 쾌지나 마당 더미 자리에서 터지는 큰 효과. 원 판에는 더미가 없으니 내 발에서 터진다
const bigFxAt = base => (stageSong() ? heroHitPoint() : base);
function cheerFx(idx) { // 중간 단계
  const f = performance.now() / 1000, p = heroHitPoint();
  sayWord({ who: idx % 2, word: WORDS[idx % WORDS.length], t0: f, dur: 1.1 });
  bits(p.x, p.y - 4, 16, 1.2); setShake(1, calmShake() ? 0.1 : 0.2); holdStop(f, 0.07); hero.jumpT = f;
}
// 운재는 칠 곳 24곳이 모두 화면을 흔들어 1분 환산 약 9초 흔들렸다(12절 6초 이하). 꾹 뗌 · 묶음 추임새는 1점으로 짧게,
// 사람 붙음 · 끝 한 방은 그대로(곡별 검수 08 R1-08). 다른 곡은 그대로
const calmShake = () => song?.id === 'unjae';
function chargedFx(power, idx) { // 모아 터뜨림: 많이 모았을수록 크다
  const f = performance.now() / 1000, p = heroHitPoint();
  sayWord({ who: idx % 2, word: WORDS[idx % WORDS.length], t0: f, dur: 1.1 });
  bits(p.x, p.y - 6, Math.round(14 + power * 34), 1.2 + power, power >= 1);
  fxs.sparks.push({ x: p.x, y: p.y - 4, t0: f });
  if (calmShake()) setShake(1, 0.15); else setShake(power >= 0.6 ? 2 : 1, 0.25 + power * 0.1);
  holdStop(f, 0.06 + power * 0.06); hero.jumpT = f; hero.spinT = f;
}
function wowFx(noWord = false) { // 큰 단계 = 「와!」
  const f = performance.now() / 1000, p = heroHitPoint();
  if (!noWord) sayWord({ who: 0, word: 'word-eolssu', t0: f, dur: 1.4 });
  if (!stageSong() && !noWord) sayWord({ who: 1, word: 'word-jota', t0: f + 0.12, dur: 1.3 });
  const c = bigFxAt(PILE);
  bits(c.x, c.y - 16, 44, 2.1, true); bits(p.x, p.y - 6, 22, 1.7); straws(c.x, c.y - 16, 16); dust(c.x, c.y, 8);
  fxs.sparks.push({ x: c.x, y: c.y - (ringOn() ? 4 : 12), t0: f });
  setShake(2, 0.4); holdStop(f, 0.14); hero.jumpT = f; hero.spinT = f;
}
function finaleFx() { // 마지막 한 방: 판에서 가장 큰 순간
  const f = performance.now() / 1000;
  buildRelease(true);
  // 운재: 앞 맞힘의 「좋다!」가 사라지는 0.2초에 「얼쑤!」가 떠 둘이 겹쳐 보이고, 0.25초 뒤 「잘한다!」가 그 자리에 들어와
  // 말풍선 둘이 위아래로 붙었다. 끝 한 방에는 앞 말풍선을 지우고 「잘한다!」 하나만 바로 띄운다(곡별 검수 08 R2-05). 다른 곡은 그대로
  if (['unjae', 'punggu'].includes(song?.id)) { fxs.bubbles.length = 0; clearCheerText(); sayWord({ who: 1, word: 'word-jalhanda', t0: f, dur: 1.2 }); }
  else sayWord({ who: 1, word: 'word-jalhanda', t0: f + 0.2, dur: 1.2 });
  const c = bigFxAt(PILE);
  bits(c.x - 30, c.y - 14, 36, 2.4, true); bits(c.x + 30, c.y - 14, 36, 2.4, true); straws(c.x, c.y - 18, 18); dust(c.x, c.y, 10);
  fxs.sparks.push(ringOn() ? { x: c.x, y: c.y - 4, t0: f } : { x: c.x - 20, y: c.y - 10, t0: f });
  setShake(2, 0.5); holdStop(f, 0.2);
}
// 끝 칠 곳을 놓쳤을 때(그래프 검수 6회차 R2-03 · R3-02, 규칙 손맛-소리 12절 (4)): 터지기 대신 김빠짐. 가루 열 알이 힘없이 흘러내리고 먼지만 인다.
// 꼬마는 틀림 몸짓(휘청 · 끌림)이 끝나면 맥 풀린 자세로 0.5초 더(줄 · 배 판 hero-stop, 풍물 판 상모 처짐). 「잘한다!」 · 흔들림 · 멈춤은 없다
function finaleFizzle() {
  const f = performance.now() / 1000, c = bigFxAt(PILE);
  hero.fizzleT = f + 0.45;
  bits(c.x, c.y - 10, 10, 0.45); dust(c.x, c.y, 6);
}
// 끝 칠 곳 앞 쌓기(규칙 손맛-소리 12절 (4) 세 박자의 첫 박자, 그래프 검수 7회차 R2-01을 고쳐 넣음). 끝 칠 곳까지 남은 1초 동안(그 마디 앞 칠 곳 0.15초 뒤부터)
// 빛 알 12개가 하나씩 나타나 내 둘레(큰 효과 자리)를 점점 빨리 돌며 좁혀 오고, 반쯤 지나면 놀이 판이 1점씩 떤다. 마당 판은 더미 위 빛이 자란다.
// 맞히면 알이 밖으로 터지고(finaleFx), 놓치면 힘없이 떨어진다.
// 틀림 띠(#edgeBand)와 같은 꼴이 되지 않게 가장자리는 어둡게 하지 않는다. 끝 글자 소리가 박을 알려 주니 녹음 크기도 줄이지 않는다. 남은 틈이 0.35초 아래면 쌓지 않는다
const BUILD_N = 12, BUILD_C = ['#f2b632', '#fff6d8', '#e89a2a'];
function finaleWindow(vb) {
  if (state !== 'song' || !song) return null;
  for (const r of [currentRec(vb), upcomingBar(vb)]) {
    if (!r || !r.def || !r.def.finale || r.def.call) continue;
    const fb = r.def.finaleBeat ?? r.def.strikes?.[0]; if (fb === undefined) return null;
    const tFin = r.t0 + fb * r.beat; let prev = -Infinity; // 바로 앞 칠 곳: 끝 마디 안 앞 칠 곳과, 끝 칠 곳이 마디 첫머리면 앞 마디 칠 곳까지
    for (const b of r.def.strikes || []) if (b < fb - 1e-3) prev = Math.max(prev, r.t0 + b * r.beat);
    for (const tg of targets) if (tg.t < tFin - 1e-3) prev = Math.max(prev, tg.t);
    const t0 = Math.max(tFin - 1, prev + 0.15);
    return tFin - t0 >= 0.35 ? { t0, tFin, rec: r } : null;
  }
  return null;
}
function stepBuild() {
  fxs.buildK = 0;
  if (!ctx) return;
  const vb = heardNow() - OFFSET, w = finaleWindow(vb);
  if (!w || vb < w.t0 || vb > w.tFin + 0.3) return;
  if (targets.some(tg => tg.rec === w.rec && tg.judged && finaleTarget(tg))) return;
  if (!(Math.abs((fxs.buildAt ?? -99) - w.tFin) < 0.05)) { // 멈췄다가 그 마디를 처음부터 다시 부르면 새로 모은다
    fxs.buildAt = w.tFin; fxs.buildSnd = 0; fxs.particles = fxs.particles.filter(p => !p.gather);
    for (let i = 0; i < BUILD_N; i++) part({ gather: true, i, a0: i * TAU / BUILD_N + Math.random() * 0.4, r0: 44 + Math.random() * 12, show: i / BUILD_N * 0.5, w0: w.t0, w1: w.tFin, x: -99, y: -99, hide: true, life: 9, c: BUILD_C[i % 3], w: 1, h: 1, vx: 0, vy: 0, grav: 0 });
  }
  fxs.buildK = clamp01((vb - w.t0) / (w.tFin - w.t0));
  // 오르는 소리 두 번. 틈이 0.6초보다 짧으면 75% 한 번만, 꾹을 쥐고 있으면 꾹 소리가 이미 울려서 없음
  const lv = fxs.buildK >= 0.75 ? 2 : fxs.buildK >= 0.45 && w.tFin - w.t0 >= 0.6 ? 1 : 0;
  if (lv > (fxs.buildSnd || 0)) { fxs.buildSnd = lv; if (!(charge && !charge.pending) && !paused) buildRoll(ctx.currentTime, lv); }
}
// 쌓기 빛 알 한 개: 오는 동안 열십자, 끝 무렵 한 점
function gatherDot(p) { lg.fillStyle = p.c; const x = Math.round(p.x - vx), y = Math.round(p.y - vy); if (p.big) { lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x, y - 1, 1, 3); } else lg.fillRect(x, y, 1, 1); }
function drawGather() { for (const p of fxs.particles) if (p.gather && !p.hide) gatherDot(p); }
// 쌓기 떨림: 반이 지나면 놀이 판이 1점씩 떨고 끝 무렵 더 잦게(줄 · 배 판은 자기 카메라 줄에서 더한다)
const buildJit = f => fxs.buildK > 0.45 && !RM && !paused ? Math.floor(f * (fxs.buildK > 0.75 ? 24 : 16)) & 1 : 0;
// 모은 빛 알 놓기: 맞히면 밖으로 터지고, 놓치면 힘없이 떨어진다
function buildRelease(hit) {
  for (const p of fxs.particles) if (p.gather) {
    p.gather = false; const a = p.a ?? p.a0;
    if (p.hide) { p.life = 0; continue; }
    if (hit) { p.vx = Math.cos(a) * 90; p.vy = Math.sin(a) * 60 - 40; p.grav = 120; p.life = 0.5; p.w = p.h = 2; }
    else { p.vx = (Math.random() - 0.5) * 8; p.vy = 6; p.grav = 50; p.life = 0.7; p.w = p.h = 1; }
  }
  fxs.buildK = 0;
}
function endFx(stamp) {
  const p = heroHitPoint();
  const c = bigFxAt(HEAP);
  bits(c.x, c.y - 20, stamp === 3 ? 60 : stamp === 2 ? 26 : 8, stamp === 3 ? 2.1 : 1.2, stamp === 3);
  if (stamp === 3) setShake(2, 0.4);
  dust(p.x, p.y, 2);
}

// ───────── 사람 몸짓: 그림을 바꿔 끼운다(늘이지 않는다) ─────────
function workerPose(prefix, now, past, next, lead, opts = {}) {
  let tp = -1e9; for (const t of past) if (t <= now && t > tp) tp = t;
  const since = now - tp, to = next === null ? 1e9 : next - now;
  if (since < 0.1) return `${prefix}-strike`;
  if (since < 0.17) return `${prefix}-swing`;
  if (to < 0.055) return `${prefix}-swing`;
  if (to < lead) return `${prefix}-raise`;
  return opts.rest || `${prefix}-idle`;
}
function heroPose(vt, f, next, frozen, beat) {
  if (state === 'end') return endHappy() && Math.floor(f * 2.2) % 2 === 0 ? 'hero-jump' : 'hero-idle';
  if(song?.id==='kwaeji'&&charge&&!charge.pending)return charge.full?'hero-hold-2':'hero-hold-1';
  if (frozen || charge) return 'hero-raise';
  if (f - hero.wobbleT < (ringOn() ? 0.45 : 0.3)) return 'hero-miss';
  if (f - hero.stopT < 0.45 || f - hero.dropT < 0.5) return 'hero-stop';
  if (f - hero.startleT < (ringOn() ? 0.45 : 0.32)) return 'hero-startle';
  const since = f - hero.swingF;
  if (since < 0.1) return 'hero-strike';
  if (since < 0.19) return 'hero-rebound';
  if (f - hero.jumpT < 0.42) return 'hero-jump';
  if (next - vt < beat * 0.9) return 'hero-raise';
  return 'hero-idle';
}
function beatDip(vt, rec, frozen) { if (!rec || frozen) return 0; const b = (vt - rec.t0) / rec.beat; return b - Math.floor(b) < 0.14 ? 1 : 0; }
function notesOn(vt, rec, list) { if (!rec) return false; const b = (vt - rec.t0) / rec.beat; for (const [s, d] of list) if (b >= s && b < s + d) return true; return false; }
function mouth(name, a, y) {
  const m = META[name]; if (!m || !m.mouth || !m.foot) return;
  if(captionDLive()&&!netOn()&&!boatOn()&&!/^(hero-|leader-|rope-)/.test(name)){
    const p=captionDAvoid({pose:name,x:a.x,y,dir:a.dir});a={...a,x:p.x};y=p.y;
  }
  const [mx, my, mw, mh] = m.mouth, dx = a.dir > 0 ? mx - m.foot[0] : m.foot[0] - mx - mw;
  lg.fillStyle = '#6b3024'; lg.fillRect(Math.round(a.x - vx + dx), Math.round(y - vy + my - m.foot[1]), mw, mh + 1);
}
// 상모 끈: 꼭지에서 나와 등 뒤로 늘어지고, 맞히면 한 바퀴 돈다. 끝이 조금 늦게 따라온다
function drawStrap(frame, a, y, f) {
  if (!META[frame] || !META[frame].knob) return;
  const m = META[frame], kn = m && m.knob ? m.knob : [32, 28], ft = m && m.foot ? m.foot : [32, 62];
  let x = a.x - vx + a.dir * (kn[0] - ft[0]), yy = y - vy + (kn[1] - ft[1]);
  const fk = netOn() || boatOn() ? -1 : flipNow(f);
  if (fk >= 0) { // 공중돌기 중에는 꼭지가 몸과 함께 돈다(축은 sprTurn과 같다. 원 판은 몸 한가운데)
    const [px, py] = ringOn() ? RING_FLIP_PIVOT : [0, FLIP_MID];
    const q = Math.floor(fk * 4) * a.dir * Math.PI / 2, dx = a.dir * (kn[0] - ft[0] - px), dy = kn[1] - ft[1] + py, c = Math.cos(q), s = Math.sin(q);
    x = a.x - vx + a.dir * px + dx * c - dy * s; yy = y - vy - py + dx * s + dy * c;
  }
  const lv = pung() ? heatLevel() : 0, ck = chargePower();
  const ribbon = pung(), pts = [[x, yy]], sway = Math.sin(f * 2.1) * 0.05, N = ribbon ? 22 + lv * 5 : 14;
  // 신명이 오를수록 끈이 길어지고 박에 맞춰 돈다(1단은 박마다 반 바퀴, 3단은 한 바퀴 반)
  const beatTurn = lv > 0 && yard.beats !== null ? yard.beats * Math.PI * lv : 0;
  // 풍물 곡에서 두 번 이어 놓치면 끈이 얼굴로 축 늘어진다. 맞히면 한 바퀴 돌며 되살아난다
  // 너무 일찍 떼도 잠깐 풀썩 내려앉는다
  hero.droop = (hero.droop || 0) + ((pung() && (yard.misses >= 2 || f - hero.fizzleT < 0.7) && !charge ? 1 : 0) - (hero.droop || 0)) * 0.18;
  const SEG = ribbon ? 2.5 - 1.2 * hero.droop + ck * 0.9 + lv * 0.45 : 2.5; // 늘어지면 입 높이에서 끝나고, 모을수록 크게 돈다
  for (let i = 0; i < N; i++) {
    const k = clamp01((f - hero.spinT - i * 0.012) / 0.36);
    const up = -Math.PI / 2 - 0.45 - i * 0.17 + sway * (1 + i * 0.25) - (k > 0 && k < 1 ? TAU * easeOut(k) : 0) - beatTurn;
    const ang = charge ? -hero.whirl - i * 0.17 : up + (Math.PI / 2 + 0.2 + Math.sin(f * 3 + i * 0.5) * 0.08 - up) * hero.droop;
    x += Math.cos(ang) * SEG * a.dir; yy += Math.sin(ang) * SEG;
    pts.push([x, yy]);
  }
  if (ribbon) { // 풍물 상모는 이어진 흰 띠
    const dots = [pts[0]];
    for (let i = 1; i < pts.length; i++) for (let t = 1; t <= 3; t++) dots.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t / 3, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t / 3]);
    lg.fillStyle = '#6f4a33'; for (const [px, py] of dots) lg.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    lg.fillStyle = '#fbf6e6'; for (const [px, py] of dots) lg.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
  } else {
    lg.fillStyle = '#6f4a33'; for (const [px, py] of pts) lg.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    lg.fillStyle = '#fbf6e6'; for (const [px, py] of pts) lg.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  const [ex, ey] = pts[pts.length - 1], tx = Math.round(ex), ty = Math.round(ey);
  if (lv >= 2 && !RM && state === 'song' && Math.random() < (lv === 2 ? 0.1 : 0.25)) paper(tx + vx, ty + vy, 1, 0.5);
  lg.fillStyle = '#6f4a33'; lg.fillRect(tx - 3, ty - 2, 7, 5);
  [['#e39a86', -2], ['#efd27a', -1], ['#a7c98a', 0], ['#86aecb', 1], ['#e39a86', 2]].forEach(([c, dx]) => { lg.fillStyle = c; lg.fillRect(tx + dx, ty - 1, 1, 3); });
}

// ───────── 노랫말: 글 띠 없이 부르는 사람 머리 위 말풍선으로(카메라 · 흔들림과 상관없다) ─────────
['art/kwaeji/bead-best.png', 'art/onghe/bead-on.png', 'art/onghe/bead-off.png'].forEach(src => { new Image().src = src; }); // 구슬이 처음 뜰 때 늦지 않게
const elLyMe = document.getElementById('lyricMe'), elLyBa = document.getElementById('lyricBa'), elBall = elLyBa.querySelector('.ball');
const elCombo = elLyBa.querySelector('.combo');
const elTop = document.getElementById('topMsg'), elFb = document.getElementById('fbMsg'), elEdge = document.getElementById('edgeBand');
// 지도에서는 그리기가 멈추므로 마지막 그림에서 띄운 글과 효과를 이 길에서 걷는다.
function clearSongScene() {
  clearCheerText();
  holdIndicator.el.hidden = true; holdIndicator.releasedAt = -9; holdIndicator.geometry = null;
  for (const el of [elLyMe, elLyBa, elBall, elCombo, elTop, elFb]) {
    el.hidden = true;
    for (const animation of el.getAnimations()) animation.cancel();
  }
  elEdge.style.opacity = '0';
  g.clearRect(0, 0, cv.width, cv.height);
  lg.clearRect(0, 0, lo.width, lo.height);
}
const holdIndicator = { el: document.createElement('div'), releasedAt: -9, geometry: null };
const holdBodyBob = f => charge && !charge.pending && !RM ? Math.round(Math.sin(f * TAU * 2.5) * Math.max(3, Math.ceil(Math.min(W,H) * .008 / (K/DPR)))) : 0;
holdIndicator.el.id = 'holdCue'; holdIndicator.el.hidden = true;
holdIndicator.el.innerHTML = '<canvas></canvas><span></span>';
holdIndicator.el.style.cssText = 'position:fixed;pointer-events:none;z-index:9;text-align:center;color:#493425;font-weight:700;line-height:1.3;white-space:nowrap;text-shadow:-1px -1px 0 #fbf1dc,1px -1px 0 #fbf1dc,-1px 1px 0 #fbf1dc,1px 1px 0 #fbf1dc,0 0 3px #fbf1dc';
document.body.append(holdIndicator.el);
// 시안의 40줄 원본은 화면이 바뀔 때만 장면 격자로 옮긴다.
const cueHands = new Map(), cueRings = new Map();
function cueHandImage(status, enlarged = false, canvasRows = null, minimum = 0) {
  const dot=K/DPR,naturalRows=Math.max(1,Math.ceil(Math.max(minimum,(H<=420)?40:110)/dot)),rows=canvasRows?Math.min(naturalRows,Math.max(1,Math.floor((canvasRows-4)/1.3))):naturalRows,height=enlarged?Math.round(rows*1.3):rows;
  const key=`${status}|${height}`;
  if(cueHands.has(key))return cueHands.get(key);
  const im=SPRITES[`finger-${status}`];if(!im)return null;
  const c=document.createElement('canvas');c.height=height;c.width=Math.round(im.width*height/im.height);
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(im,0,0,c.width,c.height);
  const pixels=x.getImageData(0,0,c.width,c.height),alpha=new Uint8ClampedArray(pixels.data);
  for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
    const i=(y*c.width+xx)*4;if(!alpha[i+3])continue;
    if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>xx+dx<0||y+dy<0||xx+dx>=c.width||y+dy>=c.height||!alpha[((y+dy)*c.width+xx+dx)*4+3]))pixels.data.set([53,44,41,255],i);
  }
  x.putImageData(pixels,0,0);cueHands.set(key,c);return c;
}
function cueRingCells(radius, thickness) {
  const key=`${radius}|${thickness}`;if(cueRings.has(key))return cueRings.get(key);
  const cells=[];
  for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
    const d=x*x+y*y;if(d<=radius*radius&&d>(radius-thickness)**2)cells.push([x,y,((Math.atan2(y,x)+TAU*1.25)%TAU)/TAU]);
  }
  cueRings.set(key,cells);return cells;
}
function paintHoldRing(c, size, status, progress, f, pressAge, releaseAge, height=size) {
  const center=Math.floor(size/2),centerY=Math.floor(height/2),short=Math.min(size,height),room=Math.floor(short/2),radius=Math.min(Math.floor(short*.41),room-3),box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const ring=(r,th,color,amount=1)=>{c.fillStyle=color;for(const[x,y,a]of cueRingCells(r,th))if(a<amount)c.fillRect(center+x,centerY+y,1,1);};
  const full=status==='holding'&&progress>=.96;
  if(!full)c.holdFullAt=-Infinity;else if(!Number.isFinite(c.holdFullAt))c.holdFullAt=f;
  const pressFlash=status==='holding'&&pressAge>=0&&pressAge<.1,fullFlash=full&&f-c.holdFullAt<.1;
  let particleCount=0;
  if(status==='waiting')ring(radius,1,Math.floor(f*3)%2?'#aa4737':'#d78261');
  else if(status==='holding'){
    ring(radius,2,'#ebc564');ring(radius,4,'#fff0a7',progress);
    for(let j=0;j<18;j++){
      const a=j*TAU/18+.2,phase=(f*.8+j/18)%1;
      // 여섯 조각은 정수 칸으로 반올림해도 고리 밖에 남아 있다가 새로 모인다.
      const dist=j%3===0?radius+1.5+(room-radius-2.5)*(1-phase):radius*(1.16-.48*phase);
      box(center+Math.cos(a)*dist,centerY+Math.sin(a)*dist,1,1,j%2?'#fff0ca':'#f6d670');particleCount++;
    }
    if(pressFlash||fullFlash)ring(radius,5,'#fff9dc');
  }else if(releaseAge<.55){c.save();c.globalAlpha=clamp01(1-releaseAge/.55);ring(radius+Math.round(releaseAge/.55*short*.07),2,'#fff0a7');c.restore();}
  return {particleCount,pressFlash,fullFlash,orbitRadius:radius};
}
// 이어지는 메김 전체(첫 메김 마디 시작 ~ 첫 받는 마디 시작)에 걸쳐 고리가 한 번만 차서, 꽉 차는 때가 떼는 때가 된다
function callSpan(rec) {
  const first = callGroup(rec)[0]; let end = rec.t0 + rec.beat * barBeats(rec.def), open = true;
  for (const b of bars.slice(bars.indexOf(rec) + 1)) { if (b.def.countIn) continue; if (!b.def.call) { open = false; break; } end = b.t0 + b.beat * barBeats(b.def); }
  if (open) for (const q of queue) { if (!q.def.call) break; end += rec.beat * barBeats(q.def); }
  return { t0: first.t0, end, beat: rec.beat };
}
const callProgress = (rec, vt) => { if (!bars.includes(rec)) return clamp01((vt - rec.t0) / (rec.beat * barBeats(rec.def))); const s = callSpan(rec); return clamp01((vt - s.t0) / Math.max(.01, s.end - s.t0)); };
const callNearEnd = (rec, vt) => { if (!bars.includes(rec)) return false; const s = callSpan(rec); return s.end - vt < s.beat * 1.05; };
function drawHoldCue() {
  const el = holdIndicator.el, f = performance.now() / 1000, l = learning;
  const vt = l ? learnVisualTime() : ctx ? heardNow() : 0;
  const rec = l?.intro && l.step === 3 ? l.rec : currentRec(vt - OFFSET);
  const tutorial = l?.step === 3;
  const active = !paused && story?.scene !== 3.5 && (state === 'song' || state === 'practice') && holdSong() && !hardRun && // 첫머리 이야기 첫 메김은 듣기만 한다
    ((rec?.def.call && (!l || tutorial)) || f - holdIndicator.releasedAt < .65 || tutorial && l.intro);
  setHidden(el, !active);
  if (!active) { holdIndicator.geometry = null; return; }
  const demo = tutorial && l.intro && l.hand;
  const status = f - holdIndicator.releasedAt < .65 || demo?.release ? 'released' : charge || demo?.down ? 'holding' : 'waiting';
  if (el.dataset.status !== status) el.dataset.status = status;
  const text = el.querySelector('span'); setText(text, status === 'holding' ? (rec?.def.call && callNearEnd(rec, vt) ? '곧 떼요' : '누르는 중') : status === 'released' ? '받는 소리' : '꾹 누르기');
  // 배우는 중에는 이미 말풍선 곁에 있는 큰 손을 둘러 표시한다. 낮은 화면에 두 번째 손을 더 놓지 않는다.
  if (tutorial && l.geometry?.hand && !learnHandEl.hidden) {
    const r=l.geometry.hand,w=r.w,h=r.h,c=el.querySelector('canvas');text.hidden=true;
    el.style.width=w+'px';el.style.left=r.x+'px';el.style.top=r.y+'px';
    if(captionDLive()){el.hidden=true;holdIndicator.geometry={...r,status,progress:demo?.fill??0,handY:r.y,...l.hand?.effects};return;}
    c.style.cssText=`display:block;width:${w}px;height:${h}px;image-rendering:pixelated`;
    c.width=1;c.height=1;
    const progress=demo?demo.fill:charge&&rec?(rec.def.call?callProgress(rec,vt):clamp01((vt-rec.t0)/(rec.beat*barBeats(rec.def)))):status==='released'?1:0;
    holdIndicator.geometry={...r,status,progress,handY:r.y,orbitRadius:Math.max(w,h)/2,paintedAt:performance.now(),...l.hand?.effects};return;
  }
  // 2026-11-20 고치기 2: 기획서 11-14의 110~120px 손과 30% 커짐을 유지한다. 자진뱃노래 큰 손은 말풍선 곁 빈자리에 둔다.
  const riverHand=captionDLive()&&song?.id==='baennorae'&&H>420&&(!learning||learning.step===4&&!learning.intro);
  let cueMax=184;
  // 처음 배우기 4단계(노래)도 묶음이 말풍선에 붙으므로 같이 줄이고, 그때 뜬 단계 표 높이도 뺀다(곡별 검수 06 R2-02: 첫 받음에서 묶음 위 끝이 1280 −82px)
  // 가래질도 묶음이 말풍선 위에 붙으므로(곡별 검수 07 R1-01) 위 빈 칸에 맞춰 줄인다. 넉넉하면 다른 곡과 같은 184px
  const garaeAttached=captionDLive()&&song?.id==='garae'&&!learning;
  if(captionDLive()&&['myeolchi','geomun','garae','punggu','singosan'].includes(song?.id)&&!learning&&H>420){
    const who=captionDNoteOwner(rec),s=captionD.slots[who],others=[elTop,elFb,elCombo,learnStepsEl].filter(e=>!e.hidden&&e.offsetHeight).reduce((n,e)=>n+e.offsetHeight+12,0),cap=184;
    cueMax=s?Math.max(32,Math.min(cap,Math.floor(s.y-(who==='ba'?40:12)-8-others-18*1.3-12))):cap;
  }
  // 가래질 낮은 가로: 손 32px 하나만 떠 「누르는 중」을 못 읽었다. 손 44px 이상과 16px 글을 손 오른쪽에 둔다(곡별 검수 07 R1-01)
  // 운재도 꾹이 이 곡의 손인데 낮은 가로에서 32px 손 하나만 떴다. 같은 꼴(손 44px · 오른쪽 16px 글)로(곡별 검수 08 R1-04)
  // 운재 세로 폰도 손이 40px로 남아 한 곡 안에 손 크기가 둘이었다. 세로 폰(폭 500 아래)도 44px(곡별 검수 08 R2-04)
  const attached=captionDLive(),small=(H<=420),dot=K/DPR,lowHand=attached&&!learning&&H<=420;
  if(lowHand||riverHand){
    el.style.setProperty('position','fixed','important');el.style.setProperty('grid-column','auto','important');el.style.setProperty('grid-row','auto','important');
  }else{
    el.style.removeProperty('grid-column');el.style.removeProperty('grid-row');
    if(attached)el.style.removeProperty('position');else el.style.position='fixed';
    for(const k of ['left','top'])if(el.style.getPropertyPriority(k)==='important')el.style.removeProperty(k);
  }
  // 자진뱃노래에서 안내 셋이 함께 뜰 때 12점 하한은 큰 점 배율에서 60~72px이 되어 손이 화면 위로 나간다. 화면 크기 44px은 지킨다.
  const minGrid=attached&&song?.id==='baennorae'&&!small?Math.ceil(44/dot):12,gridSize=Math.max(minGrid,lowHand?Math.ceil(Math.ceil(44/dot)*1.3)+4:Math.floor((attached&&small?32:small?64:cueMax)/dot)),w=gridSize*dot,ch=w,fs=small?16:18,h=ch+(H<=420&&!lowHand?0:fs*1.3);
  setHidden(text, H <= 420 && !lowHand);
  // 운재 낮은 가로 · 세로 폰: 「누르는 중」 → 「곧 떼요」로 글이 짧아질 때 가운데 맞춤 묶음이라 손이 8px 옆으로 뛰었다. 글 칸 폭을 고정한다
  { const fix = lowHand ? '80px' : ''; if (text.style.minWidth !== fix) { text.style.minWidth = fix; text.style.textAlign = fix ? 'left' : ''; } }
  if (el.style.width !== w + 'px') el.style.width = w + 'px'; if (el.style.fontSize !== fs + 'px') el.style.fontSize = fs + 'px';
  // cssText는 같은 글을 넣어도 꼴을 다시 세게 하니, 바뀔 때만 쓴다
  const c = el.querySelector('canvas'); if (c.style.width !== w + 'px' || c.style.height !== ch + 'px' || c.style.display !== 'block' || c.style.imageRendering !== 'pixelated') c.style.cssText = `display:block;width:${w}px;height:${ch}px;image-rendering:pixelated`;
  if(c.width!==gridSize||c.height!==gridSize){c.width=gridSize;c.height=gridSize;}
  // 이미 뜬 글 · 구슬 · 얼굴을 피한다. 자리 찾기는 말풍선이 움직인 때만 한다.
  // 묶음에 붙은 보통 크기 손은 captionDAttach가 자리를 정하니, 피할 것(글 상자 · 얼굴)은 따로 자리를 찾는 때(붙지 않음 · 낮은 화면 · 강 배)만 모은다(그래프 검수 4회차 느린 기기)
  const avoid = !attached || lowHand || riverHand;
  if (!avoid && !elTop.hidden && rec?.def.call && msgTop?.text === (rec.def.holdHint || song.practiceCall?.holdHint)) elTop.hidden = true;
  const obstacles = [];
  if (avoid) for (const node of document.querySelectorAll('.lyric,.msg,.ball,.combo,#learnSay,#learnSteps,#learnHand')) {
    if (node.hidden || !node.getClientRects().length) continue;
    if (node === elTop && rec?.def.call && msgTop?.text === (rec.def.holdHint || song.practiceCall?.holdHint)) { node.hidden = true; continue; }
    const r = node.getBoundingClientRect(); obstacles.push({ x:r.x,y:r.y,w:r.width,h:r.height });
  }
  if (avoid) obstacles.push(...learnFaces(learnBodies()));
  if(song?.id==='baennorae'&&(riverHand||lowHand)&&captionD.slots.ba){const s=captionD.slots.ba;obstacles.push({x:s.x-24,y:s.y-64,w:s.w+48,h:64+s.h});}
  if(song?.boatScene?.river){
    obstacles.push(...(boat.geometry?.bodyRects||[]).map(r=>({x:r.left,y:r.top,w:r.right-r.left,h:r.bottom-r.top})));
    if((riverHand||lowHand)&&boat.geometry?.boat){const b=boat.geometry.boat;obstacles.push({x:toCssX(b.x),y:toCssY(b.y),w:b.w*dot,h:b.h*dot});}
  }
  // 집터: 가래 날과 흙 무더기도 피한다
  if(netYard()&&net.geometry?.yard){const g=net.geometry.yard;for(const [x0,y0,x1,y1] of [[g.x-20,g.y-30,g.x+28,g.y+2],[g.pileX-48,g.pileY-30,g.pileX+48,g.pileY+7]])obstacles.push({x:toCssX(x0),y:toCssY(y0),w:toCssX(x1)-toCssX(x0),h:toCssY(y1)-toCssY(y0)});}
  // 북쪽 세 판: 가마 · 풀무 · 풀 더미 · 그네도 피한다
  if(netKind()&&net.geometry?.kind)for(const [x0,y0,x1,y1] of net.geometry.kind.rects)obstacles.push({x:toCssX(x0),y:toCssY(y0),w:toCssX(x1)-toCssX(x0),h:toCssY(y1)-toCssY(y0)});
  // 산비탈: 통나무도 피한다
  if(netSlope()&&net.geometry?.slope?.log){const g=net.geometry.slope;obstacles.push({x:toCssX(g.x-56),y:toCssY(g.y-34),w:toCssX(g.x+56)-toCssX(g.x-56),h:toCssY(g.y+4)-toCssY(g.y-34)});}
  const bubbles = boatOn() ? boat.geometry?.bubbles || [] : wolwolOn() ? (ring.bubbles || []).map(b => ({left:toCssX(b.rect.left),top:toCssY(b.rect.top),right:toCssX(b.rect.right),bottom:toCssY(b.rect.bottom)})) : fxs.bubbles.flatMap(b => b.place ? [b.place] : []);
  obstacles.push(...bubbles.map(b => ({x:b.left,y:b.top,w:b.right-b.left,h:b.bottom-b.top})));
  if (tutorial) obstacles.push(...(l.geometry?.protectedRects || []));
  const hx = toCssX(HERO.x), hy = toCssY(HERO.y);
  const signature = `${W}|${H}|${K}|${rec?.def.i}|${l?.intro}|${obstacles.map(r=>[r.x,r.y,r.w,r.h].map(Math.round).join(',')).join(';')}`;
  let r = holdIndicator.geometry;
  if(attached){
    if(el.style.left)el.style.left='';if(el.style.top)el.style.top='';captionDAttach(rec);
    if(lowHand||riverHand){
      // 큰 손의 캔버스·글 높이와 말풍선 캐시를 쓴다. 낮은 화면의 기존 상자 재기만 유지한다.
      const box=riverHand?{w,h:Math.ceil(ch+fs*1.3+4)}:learnRect(el),width=box.w,height=box.h;
      const owner=rec?.def.call&&!elLyMe.hidden?'me':!elLyBa.hidden?'ba':null,target=owner?(riverHand?captionD.slots[owner]:learnRect(owner==='me'?elLyMe:elLyBa)):null;
      const cornerKey=[W,H,DPR,song.id,state].join('|');
      if(holdIndicator.cornerKey!==cornerKey){holdIndicator.cornerKey=cornerKey;holdIndicator.corners=minyoFrameCorners().map(c=>({x:c.left,y:c.top,w:c.right-c.left,h:c.bottom-c.top}));}
      const blocks=obstacles.concat(holdIndicator.corners);
      const fits=p=>p&&p.x>=8&&p.y>=8&&p.x+width<=W-8&&p.y+height<=H-8&&blocks.every(b=>learnGap({...p,w:width,h:height},b)>=8);
      const prefer=target?[[target.x-width-12,target.y-height+target.h],[target.x+target.w+12,target.y-height+target.h],[target.x,target.y-height-12],[target.x,target.y+target.h+12]]:[[8,76]];
      const kept=r?.signature===signature&&fits(r)?r:null;
      const chosen=kept||learnPlace(el,width,height,blocks,prefer,8,8);
      // 위로 올린 안내 묶음의 transform은 fixed 자식의 좌표 원점도 옮긴다.
      const origin=captionD.notes.style.transform&&captionD.notes.style.transform!=='none'?captionD.guideRect:{x:0,y:0};
      el.style.setProperty('left',(chosen.x-origin.x)+'px','important');el.style.setProperty('top',(chosen.y-origin.y)+'px','important');
    }
    r=holdIndicator.geometry={...learnRect(el),signature,status};
  }
  else if (!r || r.unplaced || r.signature !== signature) {
    const safe = r => r.x>=8 && r.y>=8 && r.x+w<=W-8 && r.y+h<=H-8 && obstacles.every(o=>r.x+w<=o.x-8||r.x>=o.x+o.w+8||r.y+h<=o.y-8||r.y>=o.y+o.h+8);
    const preferred = {x:Math.max(8,Math.min(W-w-8,hx-w/2)),y:Math.min(H-h-8,hy+10)};
    const chosen = r && r.w===w && r.h===h && safe(r) ? r : safe(preferred) ? preferred : learnPlace(el,w,h,obstacles,[[preferred.x,preferred.y]],8,8);
    if (!chosen) { el.hidden = true; holdIndicator.geometry = {unplaced:true,signature}; return; }
    r = holdIndicator.geometry = {...chosen,w,h,signature};
    el.style.left=r.x+'px';el.style.top=r.y+'px';
  }
  const x2=c.getContext('2d');x2.setTransform(1,0,0,1,0,0);x2.clearRect(0,0,c.width,c.height);x2.imageSmoothingEnabled=false;
  const prompt=status==='waiting'&&vt-(rec?.t0??vt)>.4;
  const progress=demo?demo.fill:charge&&rec?.def.call?callProgress(rec,vt):status==='released'?1:0;
  const effects=paintHoldRing(x2,gridSize,status,progress,f,charge?vt-charge.pressT:Infinity,f-holdIndicator.releasedAt);
  const dy=status==='holding'&&!RM?Math.round(Math.sin(f*38)):status==='waiting'&&!RM?Math.round((1-Math.cos(f*(prompt?12:5)))*.75):0;
  const hand=cueHandImage(status,prompt,attached?gridSize:null,lowHand?44:0),handY=(gridSize/2+dy)*dot;
  const handPaint=hand?{x:Math.round((gridSize-hand.width)/2),y:Math.round((gridSize-hand.height)/2)+dy,w:hand.width,h:hand.height,canvas:gridSize}:null;
  if(hand)x2.drawImage(hand,handPaint.x,handPaint.y);
  Object.assign(r,{status,progress,handY,handPaint,handHeight:hand?.height*dot,prompt,...effects,orbitRadius:effects.orbitRadius*dot,paintedAt:performance.now()});
}
function setText(el, t) { if (el.textContent !== t) el.textContent = t; }
// 두 문장 안내(「일찍 뗐어요\n구슬이 …에 닿을 때 떼요」)는 문장마다 줄 칸(.line)에 담는다. 좁은 칸에서 둘째 문장이 또 나뉠 때
// text-wrap:balance가 문장마다 돌아 「…닿을 / 때 떼요」 대신 「구슬이 첫 강에 / 닿을 때 떼요」가 된다(강제 줄바꿈이 섞인 글에는 balance가 안 먹음, 2026-11-20)
function setLines(el, t) {
  if (el.dataset.lines === t) return;
  el.dataset.lines = t;
  if (!t.includes('\n')) { el.textContent = t; return; }
  // 앞 칸 끝에 줄바꿈 글자를 남겨 글 전체(textContent)는 예전 그대로 둔다. 칸 안은 white-space:normal이라 보이지 않는다
  const parts = t.split('\n');
  el.replaceChildren(...parts.map((s, i) => { const line = document.createElement('span'); line.className = 'line'; line.textContent = i < parts.length - 1 ? s + '\n' : s; return line; }));
}
function setHidden(el, h) { if (el.hidden !== h) el.hidden = h; }
function lyricNow(vt, rec) {
  if (learning && (learning.intro || learning.mode === 'wait')) return learnLyric();
  if ((state !== 'practice' && state !== 'song') || !rec) return null;
  const def = rec.def, b = (vt - rec.t0) / rec.beat;
  if (def.rest) return null;
  if (def.clip || def.syl) {
    const seg = def.segs ? def.segs[b >= 2 ? 1 : 0] : def; // 어려움 판은 앞 두 박과 뒤 두 박을 나눠 보여 준다
    if (!seg) return null;
    const marks = def.call ? null : seg.syl.map(s => def.strikes.includes(s)); // 칠 글자
    if (waiting) return { who: 'ba', text: seg.lyric, p: 0, marks, sung: 0, syl: seg.syl, rec };
    if (b < 0 || b >= barBeats(def)) return null;
    if (def.call) {
      if (!def.times) return { who: 'me', text: seg.lyric, p: clamp01(b / 3.7) };
      const t = vt - rec.t0, times = def.times;
      if (!def.timedSyllables) return { who: 'me', text: seg.lyric, p: clamp01((t - times[0]) / (def.vend - times[0])) };
      let k = -1;
      for (let j = 0; j < times.length; j++) if (t >= times[j]) k = j;
      const slot = k < 0 ? 0 : k + clamp01((t - times[k]) / ((times[k + 1] ?? def.vend) - times[k]));
      return { who: 'me', text: seg.lyric, slot, p: slot / times.length };
    }
    let n = 0; for (const s of seg.syl) if (b >= s) n++;
    for (const group of def.groups || []) if (b >= seg.syl[group[0]]) n = Math.max(n, group.at(-1) + 1);
    return { who: 'ba', text: seg.lyric, p: n / seg.syl.length, marks, sung: n, syl: seg.syl, rec, big: !!def.finale && def.finaleBeat === undefined };
  }
  if (song.voice || b < 0 || b >= 4) return null;
  if (def.me && b < 2) return { who: 'me', text: def.me, p: clamp01(b / 2) };
  if (def.strikes && def.strikes.length && b >= 2) return { who: 'ba', text: def.baText || OK, p: clamp01((b - 2) / 2) };
  return null;
}
// 세계 좌표를 화면 글자 좌표로
const toCssX = x => ((x - vx) * K) / DPR, toCssY = y => ((y - vy) * K) / DPR;
// 받는 소리는 글자마다 칸을 나눠 칠 글자에 점을 찍고, 부른 글자까지 진하게 한다
function fillSyllables(span, text, marks) {
  span.textContent = '';
  let k = 0;
  for (const ch of text) {
    if (ch === ' ') { span.append(' '); continue; }
    const i = document.createElement('i');
    if (ch === '♪') i.append(noteIcon()); else i.textContent = ch;
    if (marks[k]) { i.className = 'hit'; const sd = song?.twoHand && song.sylSides?.[k]; if (sd) i.dataset.side = sd; } // 두 손 곡: 칠 글자에 손 빛(L 파랑 · R 빨강)
    span.append(i); k++;
  }
}
// 알아듣지 못한 노랫말의 음표는 글꼴 문자가 아니라 작은 그림이다.
function noteIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 32'); svg.setAttribute('class', 'noteIcon');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '노래');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M14 2h3c0 6 6 6 6 12-3-3-5-2-6-4v15c0 8-14 9-14 2 0-5 7-7 11-5Z');
  svg.append(path); return svg;
}
// 글자 아래에 내가 친 결과를 남긴다. 붉은 글자는 노래가 지나간 자리이고, 맞혔는지는 이 구슬이 말한다(끝 화면 구슬과 같은 그림)
function markResults(el, cue) {
  let sig = '';
  for (const t of targets) if (t.rec === cue.rec && t.judged) sig += `${t.beat}${t.res},`;
  if (el.resSig === sig) return;
  el.resSig = sig;
  [...el.firstElementChild.children].forEach((e, k) => {
    const t = targets.find(x => x.rec === cue.rec && x.judged && Math.abs(x.beat - cue.syl[k]) < 0.01);
    const first = !t && k === 0 && cue.rec.opts && cue.rec.opts.skipFirst; // 연습 첫 박은 누르면 맞은 것이다
    const r = first ? 'best' : !t ? '' : !Rules.isHit(t.res) ? 'off' : t.res === 'perfect' ? 'best' : 'ok';
    if (r) e.dataset.res = r; else delete e.dataset.res;
  });
}
function placeLyric(el, cue, x, y) {
  setHidden(el, !cue); if (!cue) return;
  // 낮은 화면에서 위로 잘리지 않게 말풍선 높이만큼은 내려 둔다. 글이나 화면이 바뀔 때만 잰다
  // D 판은 글자를 낱자로 나눠 채우므로, 같은 글이라도 D가 켜지고 꺼질 때(배우기 안내 → 실제) 다시 짓는다
  const key = `${cue.text}|${cue.marks || ''}|${!!cue.big}|${cue.slot !== undefined}|${W}|${H}|${K}|${captionDLive()}`, span = el.firstElementChild;
  if (el.dataset.key !== key) {
    el.dataset.key = key; el.captionXsFor = '';
    el.classList.toggle('marked', !!cue.marks);
    el.classList.toggle('big', !!cue.big);
    el.classList.toggle('short', cue.text.length <= 5); // 짧은 말풍선은 연속 수를 꼬리 오른쪽으로 비켜 단다
    if (cue.marks) {
      fillSyllables(span, cue.text, cue.marks); el.sung = -1; el.resSig = null;
      el.fs = parseFloat(getComputedStyle(el).fontSize);
      el.style.setProperty('--rb', `${12 * Math.max(1, Math.round(Math.min(el.fs, 40) * 0.6 * DPR / 12)) / DPR}px`); // 결과 구슬 칸. 기기 화소 정수 배
    } else {
      if (cue.text.includes('♪')) fillSyllables(span, cue.text, []); else span.textContent = cue.text;
      if(captionDLive()){
        span.textContent='';const index=callGlyphs(span,cue.text);
        el.callStops=Array.from({length:index+1},(_,i)=>i/index);
      }
      // 글꼴의 실제 폭으로 글자 앞을 잰다. 띄어쓰기는 앞 글자에 붙여 채운다
      if (cue.slot !== undefined && !captionDLive()) {
        const range = document.createRange(), node = span.firstChild, w = span.getBoundingClientRect().width;
        el.callStops = cue.text.includes('♪') ? [...span.children].map(e => e.offsetLeft / w) : [...cue.text.matchAll(/\S/g)].map(m => { range.setStart(node, 0); range.setEnd(node, m.index); return range.getBoundingClientRect().width / w; });
        el.callStops.push(1);
      }
    }
    el.h = el.offsetHeight; el.w = el.offsetWidth;
    if (cue.marks) { // 구슬 자리와 크기는 글이나 화면이 바뀔 때만 잰다. 구슬은 기기 화소 정수 배
      el.xs = [...span.children].map(e => e.offsetLeft + e.offsetWidth / 2);
      el.ball = 12 * Math.max(1, Math.round(Math.min(el.fs, 40) * 0.9 * DPR / 12)) / DPR;
      elBall.style.width = elBall.style.height = `${el.ball}px`;
      el.nextIdx = -1;
    }
  }
  if (cue.marks) {
    if (el.sung !== cue.sung) { el.sung = cue.sung; [...span.children].forEach((e, k) => { const lit = !wolwolOn() || cue.marks[k]; e.classList.toggle('on', lit && k < cue.sung); e.classList.toggle('now', lit && k === cue.sung - 1); }); }
    if (cue.rec) markResults(el, cue);
  } else {
    const k = cue.slot === undefined ? null : Math.min(el.callStops.length - 2, Math.floor(cue.slot));
    const p = k === null ? cue.p : el.callStops[k] + (el.callStops[k + 1] - el.callStops[k]) * clamp01(cue.slot - k);
    el.style.setProperty('--p', `${(p * 100).toFixed(3)}%`);
    if(captionDLive()){
      const count=el.callStops.length-1,at=cue.slot??cue.p*count;
      for(const part of span.querySelectorAll('i[data-call-index]')){const fill=clamp01(at-Number(part.dataset.callIndex))*100;if(part.callFill!==fill){part.callFill=fill;part.style.setProperty('--call-fill',fill+'%');}}
    }
  }
  if(captionDLive())return; // D 판의 자리는 captionDPlace가 한 번 정한다. 옛 자리를 장면마다 쓰지 않는다
  // 꼬리 자리: 받는 말풍선은 가운데(-50%), 메기는 말풍선은 왼쪽 22%(.lyric). 화면 양끝 8px 안에 둔다
  const tail = el === elLyBa ? .5 : .22;
  el.leftPx = Math.round(netOn() || boatOn() ? Math.max(el.w * tail + 8, Math.min(W - el.w * (1 - tail) - 8, toCssX(x))) : toCssX(x));
  el.style.left = `${el.leftPx}px`;
  el.topPx = Math.max(el.h + 3, Math.round(toCssY(y)));
  el.style.top = `${el.topPx}px`;
}
// 다음 마디: 이미 걸렸으면 그 마디, 아니면 줄의 맨 앞(마디는 0.5초 전에야 걸린다)
function upcomingBar(vt) {
  for (const r of bars) if (r.t0 > vt + 0.0001) return r;
  const q = queue[0];
  return q && nextT !== Infinity ? { t0: nextT, def: q.def, beat: barBeat(q.def) } : null;
}
const isBa = r => !!(r && !r.def.call && (r.def.clip || r.def.syl)); // 끝 한 방은 녹음이 아니어도 칠 글자가 있다
// 앞소리꾼이 부르거나 곡이 막 시작할 때: 받는 말풍선이 한 박 먼저 떠서 첫 글자를 미리 보여 준다
function leadCue(vt, rec) {
  if (learning?.intro && learning.step === 3) return learnReceiveCue();
  if (learning && (learning.intro || learning.mode === 'wait')) return null;
  if ((state !== 'practice' && state !== 'song') || waiting) return null;
  const up = upcomingBar(vt);
  if (!up) return null;
  const early = 1;
  if (!isBa(up) || vt < up.t0 - up.beat * early || (isBa(rec) && !up.def.finale)) return null;
  const seg = up.def.segs ? up.def.segs[0] : up.def;
  return { who: 'ba', text: seg.lyric, p: 0, marks: seg.syl.map(s => up.def.strikes.includes(s)), sung: 0, syl: seg.syl, big: !!up.def.finale && up.def.finaleBeat === undefined };
}
// 구슬: 칠 글자에서 칠 글자로 포물선을 그리며 뛰어 칠 때에 정확히 내려앉는다. 판정과 같은 시계라 소리 지연과 상관없이 닿는 때가 곧 칠 때다
function placeBall(vt, cue, rec) {
  if (!cue || !cue.marks || !elLyBa.xs) { setHidden(elBall, true); return; }
  if (learning && (learning.intro || learning.mode === 'wait')) { placeLearnBall(); return; }
  // rec는 그림 장면 첫머리 시각으로 고른 마디이고 구슬은 그 뒤에 다시 읽은 heardNow() - OFFSET으로 움직인다. 마디가 바뀌는 장면에서 두 시각이
  // 경계를 사이에 두면 막 시작한 마디가 목록에서 빠져 한 장면 동안 구슬이 다른 글자에 있었다(그래프 검수 6회차 R3-05, 자진뱃노래 62px). 구슬 시각으로 다시 고른다
  if (!waiting) rec = currentRec(vt) || rec;
  const beat = rec ? rec.beat : BEAT, xOf = s => {
    const k = cue.syl.findIndex(x => Math.abs(x - s) < 0.01);
    if (k >= 0) return k;
    // 어려움 판 말풍선은 두 토막이라, 다음 토막의 글자는 지금 토막의 같은 자리로 가서 내려앉는다
    return Math.max(0, cue.syl.findIndex(x => Math.abs(Math.abs(x - s) - 2) < 0.01));
  };
  let from = null, to = null, k = 0;
  if (waiting) to = { s: rec.def.strikes[0] }; // 연습 첫 박을 기다리는 동안은 그 자리에서 콩콩 뛴다
  else {
    const list = [], up = upcomingBar(vt);
    // 끝 한 방은 말풍선이 쾅으로 바뀐 뒤에 쫓는다. 그 전에 쫓으면 네에서 쾌로 되돌아 뛴다
    const far = up && up.def.finale && vt < up.t0 - up.beat;
    for (const r of far ? [rec] : [rec, up]) if (isBa(r)) r.def.strikes.forEach((s, j) => list.push({ t: r.t0 + s * r.beat, s, side: r.def.sides?.[j] }));
    for (const it of list) { if (it.t <= vt) from = it; else { to = it; break; } }
  }
  if (!waiting && !from && !to) { setHidden(elBall, true); return; }
  if (from && !to && vt > from.t + beat * 0.6) { setHidden(elBall, true); return; }
  const ball = elLyBa.ball, fs = elLyBa.fs, land = -ball * 0.7;
  let x, hop = 0;
  // 자막 D 낮은 화면: 안내 묶음이 위 띠에 서므로 구슬이 그 띠까지 뛰지 않게 한다(끝 한 방 큰 말풍선은 위로 커져 띠에 가깝다)
  const attached=['myeolchi','geomun','baennorae','garae','punggu','singosan'].includes(song.id)&&(!learning||song.id==='baennorae'&&learning.step===4&&!learning.intro);
  const band = captionDLive() ? attached ? captionD.guideRect : H <= 420 ? captionD.slots.ba?.notice : null : null;
  const room = Math.max(6, Math.min(elLyBa.topPx - elLyBa.h - ball - 2, band ? elLyBa.topPx - elLyBa.h - ball * 0.7 - 4 - (band.y + band.h + 4) : Infinity));
  if (waiting) { x = elLyBa.xs[xOf(to.s)]; hop = Math.min(room, fs * 0.8) * Math.abs(Math.sin(performance.now() / 1000 * Math.PI / BEAT)); }
  else if (from && to) {
    const gap = to.t - from.t; k = clamp01((vt - from.t) / gap);
    x = elLyBa.xs[xOf(from.s)] + (elLyBa.xs[xOf(to.s)] - elLyBa.xs[xOf(from.s)]) * k;
    hop = Math.min(room, fs * (0.5 + 0.35 * gap / beat)) * 4 * k * (1 - k);
  } else if (to) { // 말풍선 왼쪽에서 들어와 첫 글자에 내려앉는다
    k = clamp01(1 - (to.t - vt) / beat);
    x = elLyBa.xs[xOf(to.s)] - fs * 1.2 * (1 - k);
    hop = Math.min(room, fs * 0.9) * 4 * k * (1 - k);
  } else x = elLyBa.xs[xOf(from.s)];
  if (RM) { hop = 0; if (from && to) x = elLyBa.xs[xOf(to.s)]; }
  if((song?.id==='kwaeji')&&H<=420)x=Math.max(ball/2+2,Math.min(elLyBa.w-ball/2-2,x));
  if(captionDLive()){
    const left=elLyBa.leftPx-elLyBa.w/2;
    x=Math.max(8-left+ball/2,Math.min(W-8-left-ball/2,x));
  }
  const snap = v => Math.round(v * DPR) / DPR;
  setHidden(elBall, false);
  const side = (to || from)?.side || '';
  if (elBall.dataset.side !== side) elBall.dataset.side = side; // 두 손 곡: 다음 칠 글자의 손 빛
  elBall.style.transform = `translate(${snap(x - ball / 2)}px,${snap(land - hop)}px)`;
  const nextIdx = to ? xOf(to.s) : -1;
  if (elLyBa.nextIdx !== nextIdx) {
    elLyBa.nextIdx = nextIdx;
    [...elLyBa.firstElementChild.children].forEach((e, i) => e.classList.toggle('next', i === nextIdx));
  }
}
// 시작 창: 판을 시작하기 전에 누가 무엇을 부르는지 무대 위 말풍선으로 보여 준다. 어려움을 고르면 받는 글이 장단으로 바뀐다
const onStartScreen = () => state === 'start' || state === 'starting'; // 소리를 받는 동안에도 무대를 그대로 둔다
function startCue() {
  if (!onStartScreen() || !song || !song.startLine) return null;
  const d = songBars.find(b => !b.call && (b.clip || b.syl));
  const seg = d && (d.segs ? d.segs[0] : d);
  if (!seg || !seg.syl) return null;
  return { me: { who: 'me', text: song.startLine, p: 1 }, ba: { who: 'ba', text: seg.lyric, p: 0, marks: seg.syl.map(s => d.strikes.includes(s)), sung: 99, syl: seg.syl } };
}
// 시작 창 아래 띠가 발을 가리지 않게 장면을 올린다. 판을 시작하면 부드럽게 내려온다
let startLiftNow = 0, startLiftF = 0;
function startLift(f) {

  let want = 0;
  if (onStartScreen()) {
    const low = document.querySelector('.startFoot').getBoundingClientRect();
    if (low.height) want = Math.max(0, Math.ceil(lowestFoot() - camY - (low.top - cv.getBoundingClientRect().top) * DPR / K)); // VH는 올림한 값이라 위에서 잰다
  }
  const dt = Math.min(0.05, Math.max(0, f - startLiftF));
  startLiftF = f;
  startLiftNow += (want - startLiftNow) * Math.min(1, dt * 12);
  if (Math.abs(want - startLiftNow) < 0.5) startLiftNow = want;
  return Math.round(startLiftNow);
}
function drawLyric(vt, rec) {
  if(!captionDLive())captionDRestore();
  const start = startCue();
  // 4단계 안내가 남아 있어도 누른 뒤에는 본판의 글 크기와 빈자리를 쓴다.
  const kwaejiLive=song?.id==='kwaeji'&&!start&&(!learning||learning.step===4&&!learning.intro);
  if(elLyBa.classList.contains('kwaejiLive')!==kwaejiLive){elLyBa.classList.toggle('kwaejiLive',kwaejiLive);elLyBa.dataset.key='';}
  for(const el of[elLyMe,elLyBa])el.classList.remove('startTail');
  if(start&&!drawLyric.tailStyle){const style=document.createElement('style');style.textContent='#lyricMe.startTail::after,#lyricBa.startTail::after{left:var(--start-tail)}';document.head.append(style);drawLyric.tailStyle=style;}
  const startPad=(start)&&H<=420?'.16em':'';
  const startFont=startPad?Math.round(Math.max(20,Math.min(30,W*.026))*100)/100+'px':'';
  // D 판에서는 글 크기를 captionDLayout이 정한다. 여기서 지우면 장면마다 말풍선 글을 다시 짓고 짜임을 새로 잰다.
  const liveD=captionDLive();
  if(!liveD&&(elLyBa.style.paddingBottom!==startPad||elLyBa.style.fontSize!==startFont)){elLyBa.style.paddingBottom=startPad;elLyBa.style.fontSize=startFont;elLyBa.dataset.key='';}
  const startMeFont=startPad?Math.max(17,Math.min(24,W*.025))+'px':'';
  if(!liveD&&elLyMe.style.fontSize!==startMeFont){elLyMe.style.fontSize=startMeFont;elLyMe.dataset.key='';}
  if(liveD&&elLyBa.style.paddingBottom){elLyBa.style.paddingBottom='';elLyBa.dataset.key='';}
  document.body.classList.toggle('onStart', !!start);
  const cue = start ? start.me : lyricNow(vt, rec);
  const lead = start ? null : leadCue(vt, rec), ba = start ? start.ba : lead && isBa(rec) ? lead : cue && cue.who === 'ba' ? cue : lead;
  placeLyric(elLyMe, cue && cue.who === 'me' ? cue : null, LEAD.x + LEAD.bx, leadBubbleY());
  // 원 판 받는 말풍선: 꼬리 끝(글자 크기를 따라 길어진다. 멀리 볼 때 · 폰 세로 화면)을 머리 위 2점보다 RING_HEADROOM점 더 높이 두고, 뛰어도 따라 오르지 않는다
  placeLyric(elLyBa, ba, HERO.x + HERO.bx, HERO.y - slopeLift() - (!stageSong() ? 35 : Math.max(ba && ba.big ? 41 : 37, Math.ceil(34 + (elLyBa.fs ? (0.544 * elLyBa.fs - 1.59) * DPR / K : 0))) + RING_HEADROOM)); // 원 판은 말풍선이 머리 바로 위라 꼬리가 모자를 덮지 않게 올린다
  // 받는 말풍선이 미리 떠서 옆으로 겹치면 앞소리꾼 말풍선을 그 위로 올린다
  if (!captionDLive() && !(learning?.step < 4) && ba && cue && cue.who === 'me' && elLyMe.leftPx + elLyMe.w * 0.78 > elLyBa.leftPx - elLyBa.w / 2 - 4) {
    elLyMe.topPx = Math.max(elLyMe.h + 3, Math.min(elLyMe.topPx, elLyBa.topPx - elLyBa.h - (start ? 30 : 2)));
    elLyMe.style.top = `${elLyMe.topPx}px`;
  }
  if ((learning?.intro || learning?.step < 4) && !captionDLive()) learnLessonLyrics(ba);
  if(start)for(const el of [elLyMe,elLyBa]){
    el.classList.toggle('roleFit',netOn()||boatOn());
    const role=getComputedStyle(el,'::before'),fs=parseFloat(role.fontSize),line=parseFloat(role.lineHeight);
    const roleKey=`${role.content}|${role.font}|${role.paddingLeft}|${role.paddingRight}`;
    if(el.roleKey!==roleKey){const c=document.createElement('canvas').getContext('2d');c.font=`${role.fontWeight} ${role.fontSize} ${role.fontFamily}`;el.roleWidth=Math.max(parseFloat(role.minWidth)||0,c.measureText(role.content.replace(/^"|"$/g,'')).width+parseFloat(role.paddingLeft)+parseFloat(role.paddingRight));el.roleKey=roleKey;}
    const width=el.roleWidth,style=getComputedStyle(el),box=el.getBoundingClientRect(),left=box.left+parseFloat(style.borderLeftWidth)+parseFloat(role.left),top=box.top+parseFloat(style.borderTopWidth)-4-line;
    const fit=netOn()||boatOn(),groupLeft=fit?Math.min(box.left,left):left,groupRight=fit?Math.max(box.right,left+width):left+width;
    const dx=groupLeft<8?8-groupLeft:groupRight>W-8?W-8-groupRight:0,dy=top<8?8-top:0;
    if(dx){el.leftPx+=dx>0?Math.ceil(dx):Math.floor(dx);el.style.left=el.leftPx+'px';}
    if(dy){el.topPx+=Math.ceil(dy);el.style.top=el.topPx+'px';}
  }
  if(start){
    const group=el=>{
      const b=el.getBoundingClientRect(),s=getComputedStyle(el),r=getComputedStyle(el,'::before');
      const left=b.left+parseFloat(s.borderLeftWidth)+parseFloat(r.left),top=b.top+parseFloat(s.borderTopWidth)-4-parseFloat(r.lineHeight);
      return{left:Math.min(b.left,left),right:Math.max(b.right,left+el.roleWidth),top:Math.min(b.top,top),bottom:b.bottom+Math.max(0,.544*parseFloat(s.fontSize)-1.59)};
    };
    const a=group(elLyMe),b=group(elLyBa),gap=Math.max(b.left-a.right,a.left-b.right,b.top-a.bottom,a.top-b.bottom);
    if(gap<8){
      const move=(el,dx,dy)=>{el.leftPx+=dx;el.topPx+=dy;el.style.left=el.leftPx+'px';el.style.top=el.topPx+'px';};
      if(((a.right-a.left)+(b.right-b.left)+8<=W-16)){
        const first=a.left<b.left?{el:elLyMe,r:a}:{el:elLyBa,r:b},last=a.left<b.left?{el:elLyBa,r:b}:{el:elLyMe,r:a};
        const need=Math.ceil(first.r.right+8-last.r.left),left=Math.min(Math.ceil(need/2),Math.floor(first.r.left-8)),right=need-left;
        if(last.r.right+right<=W-8){move(first.el,-left,0);move(last.el,right,0);}
      }else if(a.top<=b.top)move(elLyBa,0,Math.ceil(a.bottom+8-b.top));
      else move(elLyMe,0,Math.ceil(b.bottom+8-a.top));
    }
    const card=document.querySelector('.startHead').getBoundingClientRect(),boxGap=(a,b)=>Math.max(a.left-b.right,b.left-a.right,a.top-b.bottom,b.top-a.bottom);
    if(card.width&&card.height)for(const el of [elLyMe,elLyBa]){
      const box=group(el);if(boxGap(box,card)>=8)continue;
      const other=group(el===elLyMe?elLyBa:elLyMe);
      const candidates=[{dx:Math.floor(card.left-8-box.right),dy:0},{dx:Math.ceil(card.right+8-box.left),dy:0},{dx:0,dy:Math.ceil(card.bottom+8-box.top)},{dx:0,dy:Math.floor(card.top-8-box.bottom)}].sort((a,b)=>Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
      const fit=candidates.find(p=>{const r={left:box.left+p.dx,right:box.right+p.dx,top:box.top+p.dy,bottom:box.bottom+p.dy};return r.left>=8&&r.right<=W-8&&r.top>=8&&r.bottom<=H-8&&boxGap(r,other)>=8;});
      if(fit){el.leftPx+=fit.dx;el.topPx+=fit.dy;el.style.left=el.leftPx+'px';el.style.top=el.topPx+'px';}
    }
    const head=document.querySelector('.startHead');
    if((H<=420)){
      head.classList.add('workTitle');head.dataset.startLow='1';
      const headH=feastRun?82:56;
      Object.assign(head.style,{display:'block',position:'absolute',left:'16px',top:(H-headH-10)+'px',width:'188px',height:headH+'px',padding:'0',boxSizing:'border-box'});
      if(song.id==='ganggang')Object.assign(head.style,{top:'8px',width:'136px',height:'44px'});
      const foot=learnRect(document.querySelector('.startFoot'));
      if(learnGap(learnRect(head),foot)<8)head.style.top=Math.max(8,foot.y-headH-8)+'px';
    }else if(head.dataset.startLow){head.style.cssText='';delete head.dataset.startLow;head.classList.toggle('workTitle',netOn()||boatOn());}
    // D 결정의 어두운 뒷줄은 종이 뒤로 지나간다. 그 줄까지 피하면 낮은 가로에서 후보가 사라져 앞줄도 겹쳤다.
    const bodies=learnBodies(),faces=learnFaces(bodies.filter(b=>!(ringOn()&&/^ring-[abc]-/.test(b.name)&&b.dir===-1)));
    // 낮은 가로 시작 화면: 제목판이 사람 얼굴을 덮으면 줄 판 장면을 오른쪽으로 비킨다(가래질 780×290). 한 번에 다 비키고 60점에서 멈춘다
    if(head.dataset.startLow&&netOn()&&(net.startNudge||0)<60){const h=learnRect(head),hit=faces.filter(f=>f.w>8*K/DPR&&learnGap(h,f)<4);if(hit.length)net.startNudge=Math.min(60,(net.startNudge||0)+Math.ceil(Math.max(...hit.map(f=>h.x+h.w+8-f.x))/(K/DPR)));}
    const buttons=[...document.querySelectorAll('.startHead,.startFoot button')].filter(e=>e.offsetWidth&&e.offsetHeight).map(learnRect);
    const frame=window.frameElement?.getBoundingClientRect();
    if(frame)for(const e of window.parent.document.querySelectorAll('[data-test="exit-x"],[data-test="sound"]')){const r=e.getBoundingClientRect();buttons.push({x:r.x-frame.x,y:r.y-frame.y,w:r.width,h:r.height});}
    const box=el=>{const r=group(el);return{x:r.left,y:r.top,w:r.right-r.left,h:r.bottom-r.top};};
    const moveTo=(el,r)=>{const old=box(el);el.leftPx+=r.x-old.x;el.topPx+=r.y-old.y;el.style.left=el.leftPx+'px';el.style.top=el.topPx+'px';};
    const obstacles=faces.concat(buttons),els=[elLyBa,elLyMe],initial=els.map(box);
    const key=JSON.stringify([song.id,W,H,DPR,initial,obstacles]);
    if(drawLyric.startKey!==key){
      const clear=b=>b.x>=8&&b.y>=8&&b.x+b.w<=W-8&&b.y+b.h<=H-8&&obstacles.every(o=>learnGap(b,o)>=8);
      const safe=b=>b.x>=9&&b.y>=9&&b.x+b.w<=W-9&&b.y+b.h<=H-9&&obstacles.every(o=>learnGap(b,o)>=9);
      let chosen=initial;
      if(!initial.every(clear)||learnGap(...initial)<8){
        const options=initial.map(r=>{
          const candidates=[r],add=(x,y)=>candidates.push({x,y,w:r.w,h:r.h});
          const edges=[...new Set(obstacles.flatMap(o=>[o.x-r.w-9,o.x+o.w+9]))];
          for(let y=9;y+r.h<=H-9;y+=4){add(r.x,y);add(9,y);add(W-r.w-9,y);for(const x of edges)add(x,y);for(let x=9;x+r.w<=W-9;x+=16)add(x,y);}
          for(const o of obstacles.concat(initial))for(const x of[r.x,o.x-r.w-9,o.x+o.w+9])for(const y of[r.y,o.y-r.h-9,o.y+o.h+9])add(x,y);
          return [...new Map(candidates.map(p=>[`${p.x}|${p.y}`,p])).values()].filter(safe).map(p=>({...p,cost:Math.hypot(p.x-r.x,p.y-r.y)})).sort((a,b)=>a.cost-b.cost);
        });
        let cost=Infinity;
        for(const a of options[0]){
          if(a.cost+(options[1][0]?.cost??Infinity)>=cost)break;
          for(const b of options[1]){if(a.cost+b.cost>=cost)break;if(learnGap(a,b)>=9){cost=a.cost+b.cost;chosen=[a,b];break;}}
        }
      }
      drawLyric.startKey=key;drawLyric.startPlaces=chosen;
    }
    els.forEach((el,i)=>moveTo(el,drawLyric.startPlaces[i]));
    els.forEach((el,i)=>{
      const r=box(el);if(netOn()||Math.abs(r.x-initial[i].x)<.01)return;
      const b=el.getBoundingClientRect(),s=getComputedStyle(el),pad=Math.ceil(parseFloat(s.fontSize)*.65+3),target=toCssX(el===elLyMe?LEAD.x+LEAD.bx:HERO.x+HERO.bx);
      el.style.setProperty('--start-tail',Math.max(pad,Math.min(b.width-pad,target-b.left-parseFloat(s.borderLeftWidth)))+'px');el.classList.add('startTail');
    });
  }
  if (captionDLive()) captionDPlace(cue, ba, rec);
  // 연속 수는 눈이 가 있는 말풍선에 붙인다
  const combo = (!learning || learning.step === 4 && !learning.intro) && !!ba && !!song && !!song.voice && sc.streak >= 2;
  setHidden(elCombo, !combo);
  if (combo && elCombo.dataset.n !== String(sc.streak)) {
    // 단계(5 · 10)를 넘을 때만 한 칸 커지고 색이 바뀐다(그래프 검수 8회차 R2-03, 규칙 손맛-소리 12절 (7))
    const tier = sc.streak >= 10 ? '3' : sc.streak >= 5 ? '2' : '1', up = elCombo.dataset.tier !== tier && tier !== '1';
    elCombo.dataset.n = sc.streak; elCombo.dataset.tier = tier; elCombo.textContent = `${sc.streak}번 연속`;
    if (!RM && elCombo.animate) elCombo.animate([{ transform: `scale(${up ? 1.5 : 1.3})` }, { transform: 'scale(1)' }], { duration: up ? 200 : 120 });
  }
  // 강강술래: 연속 수는 말풍선 오른쪽 바깥 8px라 「래」 아래 결과 구슬을 가리지 않는다. 화면 끝까지 8px가 안 남으면 왼쪽 바깥, 거기도 안 남으면 말풍선 위 8px
  if (combo && stageSong()) {
    if (elCombo.boxText !== elCombo.textContent || elCombo.boxW !== W || elCombo.boxTier !== elCombo.dataset.tier) { elCombo.boxText = elCombo.textContent; elCombo.boxW = W; elCombo.boxTier = elCombo.dataset.tier; elCombo.bw = elCombo.offsetWidth; elCombo.bh = elCombo.offsetHeight; }
    const roomR = elLyBa.leftPx + elLyBa.w / 2 + 16 + elCombo.bw <= W, roomL = elLyBa.leftPx - elLyBa.w / 2 - 16 - elCombo.bw >= 0;
    elLyBa.classList.toggle('comboL', !roomR && roomL); elLyBa.classList.toggle('comboUp', !roomR && !roomL);
  }
  if (captionDLive()) captionDAttach(rec);
  // 그때 말풍선에 붙인 안내 아래끝을 보고 구슬이 뛸 수 있는 높이를 센다.
  placeBall(heardNow() - OFFSET, start ? null : ba, rec);
}
// D: 부르는 사람 머리 위 두 자리. 글과 안내는 이 자리에서만 그린다.
const captionD = { key:'', slots:{}, lines:new Map(), guides:new Map(), sizes:{}, moves:new Map(),props:[] };
function captionDLive(){return !!song && (state==='practice'||state==='song') && !learning?.intro;}
function captionDRestore(){
  document.body.classList.remove('captionD');
  if(captionD.notes)captionD.notes.hidden=true;
  for(const el of [elLyMe,elLyBa])if(el.captionSlot){
    el.style.width='';el.style.height='';el.style.boxSizing='';delete el.captionSlot;el.dataset.key='';
  }
  if(elCombo.parentNode!==elLyBa)elLyBa.append(elCombo);
  for(const el of [elTop,elFb,holdIndicator.el,learnStepsEl,learnHandEl])if(el.parentNode!==document.body)document.body.append(el);
}
const captionDHeadInk=new WeakMap();
function captionDHeadTop(pose){
  const im=SPRITES[pose],m=META[pose];if(!im||!m)return 0;
  if(captionDHeadInk.has(im))return captionDHeadInk.get(im);
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height).data,mouth=m.mouth||[26,44];
  let top=mouth[1];
  find:for(let y=0;y<=mouth[1]+2;y++)for(let x=Math.max(0,mouth[0]-8);x<Math.min(c.width,mouth[0]+8);x++)if(data[(y*c.width+x)*4+3]){top=y;break find;}
  captionDHeadInk.set(im,top);return top;
}
function captionDHead(person,family){
  const pose=netOn()||boatOn()?family+'-hold':family+'-idle',m=META[pose],im=SPRITES[pose];
  if(!m||!im)return null;
  const ink=learnOpaque(im),mouth=m.mouth||[26,44],face=m.face||(netOn()?[mouth[0]-16,mouth[1]-20,36,25]:[mouth[0]-12,mouth[1]-14,28,18]),dir=person.dir??1,dot=K/DPR;
  const left=person.x-(dir===-1?im.width-m.foot[0]:m.foot[0]);
  const x=dir===-1?left+im.width-face[0]-face[2]/2:left+face[0]+face[2]/2;
  const offset=captionDHeadTop(pose)-m.foot[1];
  const normal=netOn()?[pose,family+'-pull',family+'-pullbig',family+'-sing-a',family+'-sing-b']:boatOn()?[pose,family+'-row',family+'-rowbig',family+'-sing-a',family+'-sing-b']:[pose,family+'-jump',family+'-sing'];
  const jump=netOn()||boatOn()?0:family==='hero'?(ringOn()?RING_JUMP:HERO_JUMP):3;
  const rise=(jump+Math.max(0,...normal.filter(n=>META[n]&&SPRITES[n]).map(n=>offset-captionDHeadTop(n)+META[n].foot[1])))*dot;
  return {x:Math.round((x-camX)*dot),y:Math.round((person.y+offset-camY)*dot),w:face[2]*dot,rise,
    world:{x:person.x,y:person.y},view:{K,camX,camY}};
}
function captionDSlot(head,size,width,height,top=8){
  const {w,h,pad}=size,tail=10,gap=(head.rise||0)+22;
  let x=Math.max(16,Math.min(width-w-16,head.x-w/2)),y=head.y-gap-tail-h,side='up',tip={x:head.x,y:head.y-gap};
  if(y-pad<top){
    side=head.x<width/2?'right':'left';
    x=side==='right'?head.x+head.w/2+22+tail:head.x-head.w/2-22-tail-w;
    x=Math.max(16,Math.min(width-w-16,x));
    y=Math.max(top+pad,Math.min(height-h-24,head.y-h/2));
    tip={x:side==='right'?head.x+head.w/2+22:head.x-head.w/2-22,y:head.y+6};
  }
  return {x:Math.round(x),y:Math.round(y),w,h,pad,side,tip,head};
}
// 메김 글을 글자마다 <i>로 짓는다. 곡 자료 callKeep의 뜻 덩이는 줄바꿈 없는 묶음(.callKeep)으로 감싼다. 돌려주는 값은 글자 수
// (가래질 세로 폰 메김 칸 122px에서 「터를 닦는 이 / 집터는」으로 꺾였다, 곡별 검수 07 R2-05. callKeep이 없는 곡은 전과 같다)
function callGlyphs(span,text,index=true){
  const keep=(song?.callKeep||[]).map(s=>{const i=text.indexOf(s);return i<0?null:[i,i+s.length];}).filter(Boolean);
  let n=0,box=span,at=0;
  for(const ch of text){
    const k=keep.find(([a,b])=>at>=a&&at<b);
    if(!k)box=span;else if(at===k[0]){box=document.createElement('span');box.className='callKeep';box.style.whiteSpace='nowrap';span.append(box);}
    at+=ch.length;
    if(ch===' '){box.append(' ');continue;}
    const part=document.createElement('i');if(ch==='♪')part.append(noteIcon());else part.textContent=ch;if(index)part.dataset.callIndex=n;n++;box.append(part);
  }
  return n;
}
function captionDCallHeight(el,width,font,lines=null){
  lines??=[...songBars,song.practiceCall].filter(d=>d?.call).flatMap(d=>(d.segs||[d]).filter(Boolean).map(s=>s.lyric||s.me||'')).filter(Boolean);
  const probe=el.cloneNode(false);probe.hidden=false;probe.style.cssText=`position:fixed;left:-10000px;top:0;visibility:hidden;width:${width}px;height:auto;box-sizing:border-box;transform:none;font-size:${font}px;overflow-wrap:${getComputedStyle(el).overflowWrap}`;
  const span=document.createElement('span');probe.append(span);document.body.append(probe);let height=0;
  for(const text of lines){
    span.replaceChildren();callGlyphs(span,text,false);
    const range=document.createRange();range.selectNodeContents(span);const top=probe.getBoundingClientRect().top;
    height=Math.max(height,probe.offsetHeight,...[...range.getClientRects()].map(r=>Math.ceil(r.bottom-top+parseFloat(getComputedStyle(probe).paddingBottom)+4)));
  }
  probe.remove();return height;
}
// 끝 한 방(쾅)은 D 전처럼 크게: 넓은 화면 5.6vw(34~60px), 낮은 화면 32px. 앞 받음 줄과 같은 꼬리 끝에 붙고 줄 동안 그대로다.
const captionDBigFont=()=>H<=420?32:Math.min(60,Math.max(34,Math.round(W*.056)));
const captionDBigLine=d=>!!d&&!d.call&&!!d.finale&&d.finaleBeat===undefined;
function captionDSize(el,who){
  const key=[song.id,W,H,DPR,SPRITES['hero-hold']?.src,SPRITES['hero-idle']?.src].join('|');
  if(captionD.key!==key){captionD.key=key;captionD.sizes={};captionD.lines.clear();captionD.guides.clear();captionD.guideRect=null;captionD.moves.clear();}
  if(captionD.sizes[who])return captionD.sizes[who];
  // baBig: 끝 한 방 줄. 글씨만 크게 재고, em 여백(위 · 양옆)은 글씨 크기를 따라 커진다.
  const big=who==='baBig',style=getComputedStyle(el),base=parseFloat(style.fontSize),font=big?captionDBigFont():base,scale=font/base,c=document.createElement('canvas').getContext('2d');
  c.font=big?style.fontStyle+' '+style.fontWeight+' '+font+'px '+style.fontFamily:style.font;
  const padL=parseFloat(style.paddingLeft)*scale,padR=parseFloat(style.paddingRight)*scale,padT=parseFloat(style.paddingTop)*scale,padB=parseFloat(style.paddingBottom);
  const defs=[...songBars,song.practiceBar,song.practiceCall].filter(Boolean);
  const lines=defs.filter(d=>big?captionDBigLine(d):!!d.call===(who==='me')).flatMap(d=>(d.segs||[d]).filter(Boolean).map(s=>s.lyric||s.me||'')).filter(Boolean);
  const measure=t=>t.split('♪').reduce((sum,part)=>sum+c.measureText(part).width,0)+(t.split('♪').length-1)*font*.75;
  const widest=Math.max(32,...lines.map(measure));

  const maxWidth=(W-32);
  const w=Math.min(maxWidth,Math.max(big?Math.ceil(font*2.5):0,Math.ceil(widest+padL+padR+4)));
  const rows=who==='me'?Math.ceil(widest/(w-padL-padR-4)):1;
  let h=Math.ceil(font*1.25*rows+padT+padB+4);
  if(who==='me')h=Math.max(h,captionDCallHeight(el,w,font,lines));
  const pad=who!=='me'?Math.ceil((el.ball||24)*.7+font*Math.max(.9,...defs.filter(d=>!d.call).flatMap(d=>(d.strikes||[]).slice(1).map((b,i)=>.5+.35*(b-d.strikes[i]))))+6):0;
  return captionD.sizes[who]={w,h,pad};
}
function captionDLayout(geom=null){
  document.body.classList.add('captionD');
  for(const [el,who]of [[elLyMe,'me'],[elLyBa,'ba']]){
    el.style.overflowWrap=who==='me'&&['punggu','singosan'].includes(song.id)?'normal':'';
    const longResponse=who==='ba'&&((H<=420))&&songBars.some(d=>!d.call&&(d.lyric||'').replaceAll(' ','').length>10);
    el.style.fontSize=((longResponse)||who==='me'&&H<=420&&song.id==='punggu'?16:W>=900&&H>420?28:20)+'px';
    if(song.id==='punggu'&&who==='ba'&&W>=900&&H>420)el.style.fontSize='24px';
    if(who==='ba'&&el.classList.contains('big')&&!el.hidden)el.style.fontSize=captionDBigFont()+'px';
    el.style.paddingLeft=el.style.paddingRight=longResponse?'2px':'';
    if(who==='ba'){el.style.setProperty('--rb','12px');el.ball=24;elBall.style.width=elBall.style.height='24px';}
  }
  const canonical=(family,fallback)=>{
    const body=geom?.bodies.find(b=>b.name===family);
    return body?{...body,x:body.baseX??body.captionX??body.x,y:body.captionY??(boatOn()?118:body.y)}:fallback;
  };
  captionDSize(elLyBa,'ba');
  const people={me:canonical('leader',LEAD),ba:canonical('hero',HERO)};
  const heads={me:captionDHead(people.me,'leader'),ba:captionDHead(people.ba,'hero')};
  const pair={};
  for(const [el,who]of [[elLyMe,'me'],[elLyBa,'ba']])if(heads[who])pair[who]=captionDSlot(heads[who],captionDSize(el,who),W,H,8);
  if(pair.me&&pair.ba&&pair.me.side==='up'&&pair.ba.side==='up'){
    const left=heads.me.x<heads.ba.x?'me':'ba',right=left==='me'?'ba':'me';
    const spread=()=>{pair[left].x=Math.round(Math.max(16,heads[left].x-pair[left].w+8));pair[right].x=Math.round(Math.min(W-pair[right].w-16,heads[right].x-8));};
    spread();


  }
  // 끝 한 방 자리는 본판에서만 예약한다. 연습 첫 안내가 그 자리까지 멀어지지 않게 한다.
  if(state==='song'&&pair.ba&&songBars.some(captionDBigLine))pair.baBig=captionDBigSlot(pair,captionDSize(elLyBa,'baBig'));
  for(const s of (song.id==='ganggang'?[pair.me,pair.ba,pair.baBig]:[pair.me,pair.baBig||pair.ba]).filter(Boolean)){
    // 운재 1280 · 1695: 360px 묶음에서 손 칸 188px을 빼면 글 칸이 170px라 뗌 안내가 「구슬이 ‘어’에 닿을 때 / 떼요」로 꺾였다.
    // 글 칸이 212px이 되게 묶음을 400px로(곡별 검수 08 R2-01). 다른 곡은 그대로
    const w=Math.min(W-48,Math.max(H<=420?520:W>=900?528:360,s.w)),floorY=H<=420?12:20;
    // 운재 낮은 가로는 꾹 손이 44px라(곡별 검수 08 R1-04) 32px 칸에서 손이 화면 위 끝(y 0 · 750×340은 −1px)으로 넘쳤다
    let h=H<=420?(['unjae','jajinari'].includes(song.id)?44:32):(224);
    const left=s.head.x<((pair.me||s).head.x+pair.ba.head.x)/2;
    const large=W>=900&&H>420;
    // 말풍선 위 빈 곳이 묶음보다 낮으면(780×421 같은 낮은 태블릿) 묶음을 그 빈 곳에 맞춘다. 안내는 묶음 바닥(말풍선 쪽)에 선다.
    if(!large&&H>420){const room=s.y-s.pad-20-floorY;if(room<h&&room>=64)h=room;}
    let x=left?s.x+s.w-w-(large?48:0):s.x,y=s.y-s.pad-h-20;
    if(song.id==='ganggang'&&large)y=s.y-s.pad-h-12;
    if(y<8&&!large){const outside=left?s.x-w-8:s.x+s.w+8;if(outside>=16&&outside+w<=W-16){x=outside;y=s.y-h;}}
    s.notice={x:Math.max(24,Math.min(W-w-24,x)),y:Math.max(floorY,y),w,h,edge:left?'left':'right'};
    if((song.id==='ganggang')&&H<=420&&s!==pair.me){
      s.notice.w=Math.min(360,W-16);
      s.notice.x=Math.max(8,Math.min(W-s.notice.w-8,s.x+s.w/2-s.notice.w/2));
      s.notice.y=Math.max(8,s.y-s.pad-h-6);
    }


  }
  // 끝 한 방이 있는 곡은 안내 묶음을 큰 말풍선 위에 한 번 정해 두고 판 내내 같은 자리에 둔다
  if(pair.baBig&&song.id!=='ganggang')pair.ba.notice=pair.baBig.notice;
  captionD.slots=pair;
  return {pair,canonical};
}
// 끝 한 방 말풍선: 앞 받음 줄의 꼬리 끝(tip)을 바닥 가운데로 삼아 위 · 옆으로 커진다. 화면 끝 8px 안으로, 메기는 말풍선과 겹치면 그 반대쪽으로 x만 민다.
function captionDBigSlot(pair,size){
  const n=pair.ba,tip={...n.tip},tail=10,{w,h,pad}=size;
  let x,y;
  if(n.side==='up'){x=tip.x-w/2;y=tip.y-tail-h;}
  else if(n.side==='right'){x=tip.x+tail;y=tip.y-6-h/2;}
  else{x=tip.x-tail-w;y=tip.y-6-h/2;}
  x=Math.max(8,Math.min(W-w-8,x));y=Math.max(8+pad,y);
  const me=pair.me;
  if(me&&n.side==='up'&&x<me.x+me.w+8&&x+w>me.x-8&&y-pad<me.y+me.h+8&&y+h>me.y-me.pad-8){
    const right=me.x+me.w+8,left=me.x-8-w,inTail=v=>tip.x>=v+12&&tip.x<=v+w-12;
    if(tip.x>=me.x+me.w/2&&inTail(right)&&right+w<=W-8)x=right;else if(inTail(left)&&left>=8)x=left;
  }
  return {x:Math.round(x),y:Math.round(y),w,h,pad,side:n.side,tip,head:n.head,big:true};
}
function captionDPlace(cue,ba,rec){
  const geom=boatOn()?boat.geometry:netOn()?net.geometry:null;
  const {pair,canonical}=captionDLayout(geom);
  for(const [el,who,line,person,family] of [
    [elLyMe,'me',cue?.who==='me'?cue:null,canonical('leader',LEAD),'leader'],
    [elLyBa,'ba',ba,canonical('hero',HERO),'hero']]){
    if(!line||el.hidden)continue;
    const big=who==='ba'&&!!line.big&&!!pair.baBig;
    if(big&&el.style.fontSize!==captionDBigFont()+'px')el.style.fontSize=captionDBigFont()+'px';
    const size=captionDSize(el,big?'baBig':who),head=captionDHead(person,family);if(!head)continue;
    const key=[song.id,who,line.rec?.t0??(who==='ba'&&rec?.def.call?upcomingBar(heardNow())?.t0:rec?.t0),line.text,big,W,H].join('|');
    let slot=captionD.lines.get(key);
    if(!slot){slot=big?pair.baBig:pair[who];captionD.lines.set(key,slot);}
    captionD.slots[who]=slot;el.captionSlot=slot;el.dataset.captionLine=key;el.dataset.captionSide=slot.side;
    el.style.width=size.w+'px';el.style.height=size.h+'px';el.style.boxSizing='border-box';
    el.w=size.w;el.h=size.h;el.leftPx=slot.x+size.w*(who==='ba'?.5:.22);el.topPx=slot.y+size.h;
    el.style.left=slot.x+'px';el.style.top=slot.y+'px';
    el.style.setProperty('--caption-tail-x',(slot.tip.x-slot.x)+'px');
    el.style.setProperty('--caption-tail-y',(slot.tip.y-slot.y)+'px');
    // 글자 자리는 줄 · 글 · 크기가 바뀔 때만 잰다(장면마다 재면 짜임을 강제로 다시 계산한다).
    const measureKey=[key,el.dataset.key,size.w,size.h,el.style.fontSize].join('#');
    if(who==='ba'&&el.captionXsFor!==measureKey){
      el.fs=parseFloat(getComputedStyle(el).fontSize);
      el.xs=[...el.firstElementChild.children].map(e=>e.offsetLeft+e.offsetWidth/2);
      el.captionXsFor=measureKey;
    }
  }
}
function captionDFaces(bodies){
  return bodies.flatMap(b=>/^kid-[ab]-/.test(b.pose)?[{x:b.x,y:b.y,w:b.w,h:b.h,name:b.name}]:learnFaces([b]));
}
function captionDReserve(){
  const slots=song.id==='ganggang'?[captionD.slots.me,captionD.slots.ba]:Object.values(captionD.slots);
  // 비어 있는 안내 묶음은 높이가 0이므로 소품이 피할 실체가 없다.
  return [...slots.filter(Boolean).map(s=>({x:s.x-8,y:s.y-s.pad-8,w:s.w+16,h:s.h+s.pad+30})),captionDNearResponse()||['geomun','baennorae','punggu','singosan'].includes(song.id)&&!learning?null:captionD.slots.ba?.notice,captionD.guideRect].filter(r=>r&&r.w>0&&r.h>0);
}
// Keep the fixed tail above the head. Only the height of an unusually large pose is reduced.
function captionDLimitY(pose,x,y,who='ba',q=0,pivot=null){
  if(!captionDLive()||!captionD.slots[who])return y;
  const rec=currentRec(heardNow()),show=who==='me'?rec?.def.call:rec&&!rec.def.call||rec?.def.call&&barEnd(rec)-heardNow()<=rec.beat;
  if(!show)return y;
  const slot=captionD.slots[who];if(slot.side!=='up')return y;
  const im=SPRITES[pose],m=META[pose];if(!im||!m)return y;
  const a=learnOpaque(im),mouth=m.mouth||[26,44],px=pivot?.[0]||0,py=pivot?.[1]??FLIP_MID;
  const large=q!==0||!!charge||/brace|cheer|shower|proud|pullbig|rowbig|wave/.test(pose);
  const top=large?a.top:captionDHeadTop(pose),left=large?a.left:mouth[0]-8,right=large?a.right:mouth[0]+8,bottom=large?a.bottom:mouth[1]+4;
  const angle=q*Math.PI/2;
  const offset=Math.min(...[[left,top],[right,top],[right,bottom],[left,bottom]].map(([u,v])=>q?(u-m.foot[0]-px)*Math.sin(angle)+(v-m.foot[1]+py)*Math.cos(angle)-py:v-m.foot[1]));
  const drawnTop=q?Math.round(y-vy-py)+offset+py:Math.round(y-vy-m.foot[1])+top;
  const required=Math.max(0,Math.ceil((slot.tip.y+4)/(K/DPR)-drawnTop));
  if(required){captionD.reductions??=new Map();const key=[song.id,W,H,pose,q].join('|');captionD.reductions.set(key,Math.max(captionD.reductions.get(key)||0,required*K/DPR));}
  return y+required;
}
// Move a complete prop assembly once. Its children keep their shared coordinates.
function captionDPropGroup(id,point,bounds){
  if(!captionDLive()||!captionD.slots.me)return point;
  const dot=K/DPR,key=[song.id,W,H,K,camX,camY,'assembly',id].join('|');
  let delta=captionD.moves.get(key);
  if(!delta){
    const r={x:(bounds.x-camX)*dot,y:(bounds.y-camY)*dot,w:bounds.w*dot,h:bounds.h*dot},blocks=[...captionDReserve().filter(b=>!bounds.omitNotice||b!==captionD.slots.ba?.notice),...(bounds.extraBlocks||[])];
    const clear=p=>blocks.every(b=>p.x+p.w<=b.x-2||p.x>=b.x+b.w+2||p.y+p.h<=b.y-2||p.y>=b.y+b.h+2);
    let chosen=r;
    const inside=p=>p.x>=8&&p.x+p.w<=W-8&&p.y>=8&&p.y+p.h<=H-8;
    if(!clear(r)||bounds.keepInside&&!inside(r)){
      const xs=bounds.axis==='y'?[r.x]:[r.x,8,W-r.w-8,...blocks.flatMap(b=>[b.x-r.w-2,b.x+b.w+2])];
      const ys=bounds.axis==='x'?[r.y]:[r.y,8,H-r.h-8,...blocks.flatMap(b=>[b.y-r.h-2,b.y+b.h+2]),Math.max(...blocks.map(b=>b.y+b.h))+4];
      // preferInside: 화면 안(끝 8px)에서 먼저 찾고, 안에 빈 곳이 없을 때만 화면 밖으로 비킨다
      const all=xs.flatMap(x=>ys.map(y=>({x,y,w:r.w,h:r.h}))),fits=(p,out)=>(out||p.w>W-32||p.x>=8&&p.x+p.w<=W-8)&&(out||p.y>=8&&p.y+p.h<=H-8)&&(!bounds.topOnly||p.y<=Math.max(r.y,8))&&(!bounds.bottomOnly||p.y>=r.y)&&clear(p);
      let candidates=all.filter(p=>fits(p,bounds.allowOutside&&!bounds.preferInside));
      // preferAxis 'y': 아래위로만 비킬 자리가 있으면 그쪽을 먼저(운재 줄꾼이 받는 말풍선을 옆으로 15점 비켜 이웃과 3점 간격으로 겹쳤다, 곡별 검수 08 R1-01)
      if(bounds.preferAxis==='y'){const v=candidates.filter(p=>p.x===r.x);if(v.length)candidates=v;}
      // 안에 빈 곳이 없으면 화면 밖으로. 끝에 조금 걸친 자리(잘린 달 · 몸 한 조각)는 고르지 않고 아예 밖에 둔다
      if(!candidates.length&&bounds.preferInside){const away=p=>p.x+p.w<=0||p.x>=W||p.y+p.h<=0||p.y>=H;candidates=[...all,...(bounds.axis==='y'?[]:[{x:-r.w-8,y:r.y,w:r.w,h:r.h},{x:W+8,y:r.y,w:r.w,h:r.h}]),...(bounds.axis==='x'?[]:[{x:r.x,y:-r.h-8,w:r.w,h:r.h}])].filter(p=>fits(p,true)&&away(p));}
      candidates.sort((a,b)=>Math.hypot(a.x-r.x,a.y-r.y)-Math.hypot(b.x-r.x,b.y-r.y));
      if(candidates.length)chosen=candidates[0];
    }
    const away=v=>Math.sign(v)*Math.ceil(Math.abs(v)/dot);
    delta={x:away(chosen.x-r.x),y:away(chosen.y-r.y),bounds:r,chosen,blocked:!clear(chosen)};captionD.moves.set(key,delta);
  }
  return {...point,x:point.x+delta.x,y:point.y+delta.y};
}
function captionDArtworkGroup(id,point,parts,pad=0,options={}){
  if(!captionDLive())return point;
  const boxes=parts.flatMap(p=>{const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m?.foot)return[];const a=learnOpaque(im);return[{x:p.x+a.left-m.foot[0],y:p.y+a.top-m.foot[1],w:a.right-a.left,h:a.bottom-a.top}];});
  if(!boxes.length)return point;
  const x=Math.min(...boxes.map(b=>b.x))-pad,y=Math.min(...boxes.map(b=>b.y))-pad;
  return captionDPropGroup(id,point,{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+pad,h:Math.max(...boxes.map(b=>b.y+b.h))-y+pad,allowOutside:true,...options});
}
function captionDAvoid(p){
  if(!captionDLive()||!captionD.slots.me||/^(hero-|leader-)/.test(p.pose)||['hero','leader'].includes(p.name))return p;
  const family=p.pose.match(/^(ring-[abc]|puller-[abc]|rower-[abc]|follower|spectator\d*|kid-[ab]|rope|onlooker)/)?.[0];
  if(!family)return p;
  const parts=Object.keys(META).filter(n=>(n===family||n.startsWith(family+'-'))&&SPRITES[n]).map(pose=>({pose,x:p.x,y:p.y}));
  const flip=p.dir===-1;
  const boxes=parts.map(part=>{const m=META[part.pose],im=SPRITES[part.pose],ink=learnOpaque(im);return{x:p.x+(flip?m.foot[0]-ink.right:ink.left-m.foot[0]),y:p.y-m.foot[1]+ink.top,w:ink.right-ink.left,h:ink.bottom-ink.top};});
  if(!boxes.length)return p;
  const pad=/^(ring-|kid-)/.test(family)?18:8;
  const x=Math.min(...boxes.map(b=>b.x))-pad,y=Math.min(...boxes.map(b=>b.y))-pad;
  // 원 곡(강강술래 · 월월이): 410px 한꺼번에 내리기 대신 사람마다 걸리는 만큼만 비킨다(2026-11-15 지시). 원 뒷줄은 sprIm에서 비키지 않고 말풍선 뒤로 지나간다.
  if(ringOn())return captionDRingPerson(p,family,parts,flip);
  if(!boatOn()&&(!netOn()||netKind()==='dance')){
    const floor=Math.max(...captionDReserve().map(r=>r.y+r.h))+8;
    const dy=Math.max(0,Math.ceil(camY+floor/(K/DPR)-y));
    if(dy){const key=[song.id,W,H,'row',family].join('|');captionD.moves.set(key,{x:0,y:dy});return{...p,y:p.y+dy};}
    return p;
  }
  if(netYard()){const moved=captionDYardPerson(p,boxes);if(moved)return moved;}
  return captionDPropGroup(['person',family,Math.round(p.x/30),p.dir===-1?'back':'front',Math.floor(p.y/64),yard.jumpT!==null?'dance':'wall'].join('|'),p,{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+pad,h:Math.max(...boxes.map(b=>b.y+b.h))-y+pad,bottomOnly:true,allowOutside:!netOn()&&!boatOn(),preferAxis:netSlope()?'y':undefined});
}
// 집터(가래질) 줄꾼: 말풍선 종이 · 꼬리 · 붙은 안내 묶음만 옆 2점 · 위 4점(얼굴 칸이 그림 위보다 3점 높다) 띄워 비키고, 아래로만 내려선다(화면 아래 4px 안까지).
// 둘레 8점 · 말풍선 아래 30px 띠까지 비키느라 780×290에서 꼬마 곁 줄꾼이 왼쪽 끝으로 몰려 겹치고 몸이 21~39% 잘렸다(곡별 검수 07 R2-02).
// 내려설 곳이 없으면 null(전과 같은 길로 비킨다)
function captionDYardPerson(p,boxes){
  const dot=K/DPR,g=2,x0=Math.min(...boxes.map(b=>b.x))-g,y0=Math.min(...boxes.map(b=>b.y))-4,x1=Math.max(...boxes.map(b=>b.x+b.w))+g,y1=Math.max(...boxes.map(b=>b.y+b.h));
  const r={x:(x0-camX)*dot,y:(y0-camY)*dot,w:(x1-x0)*dot,h:(y1-y0)*dot},blocks=captionDRingObstacles();
  let dy=0;
  for(let n=0;n<4;n++){const hit=blocks.filter(o=>r.x<o.x+o.w&&r.x+r.w>o.x&&r.y+dy<o.y+o.h&&r.y+r.h+dy>o.y);if(!hit.length)break;dy=Math.max(dy,...hit.map(o=>o.y+o.h-r.y));}
  if(!dy)return p;
  const move=Math.ceil(dy/dot-1e-9);
  return r.y+r.h+move*dot<=H-4?{...p,y:p.y+move}:null;
}
// 원 곡에서 사람이 비킬 것: 말풍선 종이(구슬 자리 포함) · 꼬리 · 붙은 안내 묶음. 화면 px.
function captionDRingObstacles(){
  const out=[];
  for(const o of (song.id==='ganggang'?[captionD.slots.me,captionD.slots.ba]:Object.values(captionD.slots)).filter(Boolean)){
    // 종이 그림은 자리보다 옆으로 8px, 위아래로 4px 크다(자막 D 시험이 재는 종이 상자)
    out.push({x:o.x-8,y:o.y-o.pad-4,w:o.w+16,h:o.h+o.pad+8});
    if(o.side==='up')out.push({x:o.tip.x-8,y:o.y+o.h,w:16,h:Math.max(0,o.tip.y-o.y-o.h)});
    else if(o.side==='right')out.push({x:o.tip.x,y:o.tip.y-8,w:Math.max(0,o.x-o.tip.x),h:16});
    else out.push({x:o.x+o.w,y:o.tip.y-8,w:Math.max(0,o.tip.x-o.x-o.w),h:16});
  }
  for(const n of [captionDNearResponse()?null:captionD.slots.ba?.notice,captionD.guideRect])if(n)out.push({x:n.x,y:n.y,w:n.w,h:n.h});
  return out;
}
// 원 곡의 앞줄 · 따라 도는 사람 · 담 위 구경꾼. 앞줄은 걸리는 만큼만 아래로, 화면 아래 끝에서 몸의 60% 넘게 안 보이면 아예 화면 밖으로.
// 담 위 구경꾼과 아이는 담을 따라 옆으로 비킨다(되도록 화면 안).
function captionDRingPerson(p,family,parts,flip){
  const s=K/DPR,m=learning?14:4,boxes=parts.map(part=>{const mm=META[part.pose],ink=learnOpaque(SPRITES[part.pose]);return{l:flip?mm.foot[0]-ink.right:ink.left-mm.foot[0],r:flip?mm.foot[0]-ink.left:ink.right-mm.foot[0],t:ink.top-mm.foot[1],b:ink.bottom-mm.foot[1]};});
  const l=Math.min(...boxes.map(b=>b.l)),r=Math.max(...boxes.map(b=>b.r)),t=Math.min(...boxes.map(b=>b.t)),b=Math.max(...boxes.map(b=>b.b));
  if(/^(spectator|kid-)/.test(family)){
    if(song.id==='ganggang')return ganggangCrowdPerson(p,family);
    // 구경꾼은 4px, 아이는 7px 뛰므로 위를 넉넉히 잡는다. 비킬 것(익히기 안내 칸 등)이 바뀌면 다시 찾는다
    const up=family.startsWith('kid-')?9:6,box={x:p.x+l-2,y:p.y+t-up,w:r-l+4,h:b-t+up+3},blocks=captionDReserve();
    // 담 끝에서 달려 들어오는 아이는 비킬 것과 겹치는 동안만 화면 밖에 둔다(자리마다 옆으로 밀면 달리는 내내 튄다)
    if(/-run-/.test(p.pose)){const dot=K/DPR,q={x:(box.x-camX)*dot,y:(box.y-camY)*dot,w:box.w*dot,h:box.h*dot};return blocks.every(o=>q.x+q.w<=o.x-2||q.x>=o.x+o.w+2||q.y+q.h<=o.y-2||q.y>=o.y+o.h+2)?p:{...p,y:p.y+Math.ceil(H/dot)+box.h+50};}
    const sig=blocks.map(q=>[q.x,q.y,q.w,q.h].map(Math.round).join(',')).join(';');
    return captionDPropGroup(['wall',family,Math.round(p.x/30),sig].join('|'),p,{...box,axis:'x',allowOutside:true,preferInside:true});
  }
  const x0=(p.x-vx+l)*s,x1=(p.x-vx+r)*s,top=(p.y-vy+t)*s,bottom=(p.y-vy+b)*s,height=bottom-top;
  // 낮춘 자리에서 아래 것에 다시 걸리면 그만큼 더 낮춘다
  let need=0;const obs=captionDRingObstacles();
  for(let pass=0;pass<4;pass++){
    let next=need;
    for(const o of obs){
      if(o.x-m>=x1||o.x+o.w+m<=x0||o.y-m>=bottom+need||o.y+o.h+m<=top+need)continue;
      next=Math.max(next,o.y+o.h+m-top);
    }
    if(next===need)break;
    need=next;
  }
  if(!need)return p;
  let newTop=top+need;
  if((H-newTop)/height<0.6)newTop=H+2;
  return{...p,y:p.y+Math.ceil((newTop-top)/s-1e-9)};
}
// 가래질·풍구·신고산은 받는 말풍선이 미리 떠도 메김을 누르는 동안 손 안내를 메김에 붙인다.
// 두 말풍선이 동시에 보일 때 받는 쪽 안내가 메김 글을 덮거나 손이 갑자기 건너뛰지 않게 한다.
function captionDNoteOwner(rec){return ['garae','punggu','singosan'].includes(song?.id)&&charge&&rec?.def.call&&!elLyMe.hidden?'me':!elLyBa.hidden?'ba':'me';}
function captionDNearResponse(){return !learning&&state==='practice'&&['kwaeji','wolwol'].includes(song.id);}
// 안내는 구슬 길 왼쪽, 받는 말풍선과 20px 간격. 글·곡·크기가 바뀔 때만 높이와 모서리를 잰다.
function captionDPlaceResponseNotes(notes,slot){
  const key=[song.id,W,H,DPR,slot.x,slot.y,slot.w,slot.h,...[elTop,elFb,elCombo,holdIndicator.el,learnStepsEl,learnHandEl].map(e=>e.hidden?'':e.textContent)].join('|');
  if(notes.responseKey!==key){
    const w=Math.min((W>=900?340:300),slot.x-36),x=slot.x-20-w;
    Object.assign(notes.style,{bottom:'auto',left:x+'px',width:w+'px',maxWidth:w+'px',height:'auto',transform:'none'});
    const h=notes.getBoundingClientRect().height;
    let y=slot.y+(h>slot.h?slot.h-h:(slot.h-h)/2);
    const corners=minyoFrameCorners();
    for(const c of corners)if(x<c.right&&x+w>c.left&&y<c.bottom&&y+h>c.top)y=c.bottom;
    y=Math.max(8,y);notes.style.top=y+'px';
    notes.responseKey=key;notes.responseRect={x,y,w,h};
  }
  captionD.guideRect=notes.responseRect;
}
function captionDAttach(rec=currentRec(heardNow())){
  if(!captionDLive())return;
  if(!captionD.notes){captionD.notes=document.createElement('div');captionD.notes.className='captionNotes';document.body.append(captionD.notes);}
  const notes=captionD.notes;notes.hidden=false;
  const nearResponse=captionDNearResponse();notes.classList.toggle('nearResponseNotes',nearResponse);
  if(!nearResponse)notes.responseKey=null;
  // 자진뱃노래: 처음 배우기 4단계(노래)는 소개가 끝나면 곧 판 첫 메김이다. 첫 받음이 끝날 때까지 learning이 남아 안내 묶음이 배우기 자리(1280 x 565 · y 72)에 떠
  // 메기는 말풍선(x 996 · y 244)과 떨어졌다. 그동안도 판처럼 그때 뜬 말풍선에 붙인다(곡별 검수 06 R2-02, DECISIONS 2026-11-14 D). 다른 곡은 그대로
  const songNow=!learning||song.id==='baennorae'&&learning.step===4&&!learning.intro;
  notes.classList.toggle('learningNotes',!songNow);
  notes.classList.toggle('lessonNotes',!!learning&&learning.step<4);
  // 가래질도 멸치와 같은 줄 판이라 같은 세로 묶음으로 쌓는다(곡별 검수 07 R1-01). garaeNotes: 세로 폰 160px 칸에서 두 줄을 고르게
  notes.classList.toggle('myeolchiNotes',['myeolchi','garae','punggu','singosan'].includes(song.id)&&!learning);
  notes.classList.toggle('garaeNotes',song.id==='garae'&&!learning);
  // 자진뱃노래도 거문도와 같은 배 틀이라 안내 묶음을 그때 뜬 말풍선 위에 붙인다(곡별 검수 06 R1-02, DECISIONS 2026-11-14 D)
  notes.classList.toggle('geomunNotes',['geomun','baennorae'].includes(song.id)&&songNow);
  notes.classList.toggle('jajinNotes',song.id==='baennorae'&&songNow);
  notes.classList.toggle('jajinLearnNotes',song.id==='baennorae'&&!!learning&&songNow);
  // 뗌 안내의 두 문장 줄 나눔(운재 곡별 검수 08 R2-01)은 이제 모든 곡 공통 규칙(ui-polish.css .captionNotes .msg pre-line)
  notes.classList.toggle('jajinariNotes',song.id==='jajinari'&&!learning);
  // 거문도 낮은 가로: 연속 수가 30% 커져도 아래끝은 고정해 24px 간격 안 구슬 길을 비운다(F-002).
  const comboOrigin=song.id==='geomun'&&H<=420?'50% 100%':'';
  if(elCombo.style.transformOrigin!==comboOrigin)elCombo.style.transformOrigin=comboOrigin;
  // 자리를 정하는 값(화면 · 곡 · 단계 · 말풍선 자리 · 묶음 안 글과 꼴)이 앞 부름과 같으면 쓰기와 글 상자 읽기를 건너뛴다.
  // 한 화면에 세 번(drawLyric · placeMsgs · drawHoldCue) 불려 메김 마디마다 레이아웃을 몇 번씩 다시 셌다(느린 기기 흉내 메김 마디 쉼 3%, 그래프 검수 4회차)
  const hc=holdIndicator.el.querySelector('canvas'),slotKey=t=>t?[t.x,t.y,t.w,t.h,!!t.big].join(','):'',who=captionDNoteOwner(rec);
  const placeKey=[W,H,K,DPR,song.id,state,songNow,learning?.step??'',!!learning?.intro,nearResponse,rec?.t0??'',who,slotKey(captionD.slots.me),slotKey(captionD.slots.ba),!!window.frameElement,hc?.style.cssText,
    ...[elTop,elFb,elCombo,holdIndicator.el,learnStepsEl,learnHandEl].map(e=>`${e.parentNode===notes?1:0}${e.hidden?0:1}${e.className}~${e.style.cssText}~${e.dataset.captionOwner||''}~${e.textContent}`)].join('|');
  if(notes.placeKey===placeKey&&captionD.guideRect)return; // 자막 배치 열쇠가 바뀌면(captionDSize) guideRect가 비니 다시 센다
  notes.placeKey=placeKey;
  for(const el of [elTop,elFb,elCombo,holdIndicator.el,learnStepsEl,learnHandEl]){
    if(el===learnHandEl&&learnHandBeside())continue; // 배우기 해 보기 손은 말풍선 옆(learn.js)
    if(el.parentNode!==notes)notes.append(el);
    if(el.dataset.captionOwner!==elLyBa.id)el.dataset.captionOwner=elLyBa.id;
    if((el===elTop||el===elFb)&&(el.style.cssText||el.classList.contains('byBa'))){el.classList.remove('byBa');el.style.cssText='';}
  }
  // 가래질: 꾹 표시 · 연속 수 · 틀림 글이 왼쪽 위 알림 칸(1280에서 메김 말풍선과 가로 473px)에 떴다. 그때 뜬 말풍선에 붙인다(곡별 검수 07 R1-01, DECISIONS 2026-11-14 D)
  if(['myeolchi','geomun','baennorae','garae','punggu','singosan'].includes(song.id)&&songNow){
    const slot=captionD.slots[who];
    if(slot){
      // 자막은 그대로 두고 안내만 붙인다. 구슬이 뛰는 높이까지 비운다.
      // 가래질 세로 폰은 240px: 160px에서는 「일찍 뗐어요 / 구슬이 ‘어’에 닿을 때 / 떼요」 세 줄로 잘게 나뉘었다(곡별 검수 07 R1-01)
      // 2026-11-18 저녁(20:48) F-002 곁에 모으기: 거문도 낮은 가로의 옆 손은 24px 간격으로 구슬 길을 비운다.
      let w=Math.min(W-32,(W>=900?528:360));const gap=song.id==='geomun'&&H<=420?24:who==='ba'?40:12,mid=slot.x+slot.w/2;
      if(song.id==='garae'&&H<=420)w=Math.min(520,2*Math.min(mid-16,W-16-mid));
      // 자진뱃노래 처음 배우기 4단계: 앞소리꾼 말풍선이 화면 오른쪽 16px까지 차서 360px 묶음이 46~58px 왼쪽으로 밀렸다. 말풍선 가운데에 맞게 좁힌다(240px 아래로는 안 좁힘, 곡별 검수 06 R2-02)
      if(song.id==='baennorae'&&learning)w=Math.max(Math.min(w,240),Math.min(w,Math.floor(2*(Math.min(mid,W-mid)-16))));
      if(song.id==='punggu'&&W<900&&state==='song')w=Math.min(w,slot.w);
      const x=Math.max(16,Math.min(W-w-16,mid-w/2)),bottom=slot.y-gap;
      Object.assign(notes.style,{bottom:'auto',top:bottom+'px',left:x+'px',width:w+'px',maxWidth:w+'px',height:'auto',transform:'translateY(-100%)'});
      captionDNoteCorners(notes);
      for(const el of [elTop,elFb,elCombo,holdIndicator.el])el.dataset.captionOwner=who==='ba'?elLyBa.id:elLyMe.id;
      const placed=notes.getBoundingClientRect();
      captionD.guideRect={x:placed.left,y:placed.top,w:placed.width,h:placed.height};
    }
    return;
  }
  if(nearResponse&&captionD.slots.ba){captionDPlaceResponseNotes(notes,captionD.slots.ba);return;}
  notes.style.transform='';
  const slot=captionD.slots.ba;
  // 해 보기 큰 화면(learnHandBeside): 손은 말풍선 곁(learn.js), 단계 표 · 판정 글은 위 가운데 370px 상자
  if(slot){const key=[song.id,rec?.t0,W,H,song.id==='ganggang'&&!!slot.big].join('|');if(!captionD.guides.has(key))captionD.guides.set(key,slot.notice);const n={...captionD.guides.get(key)};if(learning){n.h=H<=420?180:240;if(H<=420){n.x=8;n.y=12;n.w=W-16;}else {n.w=520;n.x=Math.max(24,Math.min(W-n.w-24,n.x));}if(learnHandBeside()){n.w=370;n.x=Math.round((W-n.w)/2);n.y=20;}}captionD.guideRect=n;notes.dataset.edge=n.edge||'right';
    // 낮은 가로 화면 배우기: 위 글은 단계 표 아래 줄에서 두 말풍선(구슬 길) · 손 칸 · 모서리 단추를 12px 비킨 빈 칸 가운데 둔다.
    // 위쪽 띠는 모서리 단추와 단계 표로 차서, 말풍선 위로 내려오면 구슬에 닿는다. 자리는 곡 · 크기 · 말풍선 자리가 바뀔 때만 다시 센다.
    if(learning&&H<=420)captionDTopBand(notes,n,slot);
    Object.assign(notes.style,{bottom:'auto',top:n.y+'px',left:n.x+'px',width:n.w+'px',maxWidth:n.w+'px',height:n.h+'px'});
    if(!learning){captionDNoteCorners(notes);
      if(song.id==='ganggang'&&H<=420&&!elTop.hidden){const r=elTop.getBoundingClientRect();if(r.top<8)elTop.style.translate='0 '+(8-r.top)+'px';}
      const r=notes.getBoundingClientRect();captionD.guideRect={x:r.left,y:r.top,w:r.width,h:r.height};}}
}
function captionDNoteCorners(notes){
  const r=notes.getBoundingClientRect(),corners=minyoFrameCorners();
  // 같은 글이어도 묶음 높이와 손·연속 수가 바뀌면 안쪽 글의 상대 자리를 다시 잰다.
  const key=[W,H,K,DPR,song.id,state,r.width,r.height,...[elTop,elFb,elCombo,holdIndicator.el,learnStepsEl,learnHandEl].map(e=>e.hidden?'hidden':e.textContent)].join('|');
  if(notes.cornerText?.key!==key){
    const text=[elTop,elFb].filter(e=>!e.hidden&&e.parentNode===notes).map(e=>e.getBoundingClientRect());
    notes.cornerText={key,left:Math.min(0,...text.map(b=>b.left-r.left)),right:Math.max(r.width,...text.map(b=>b.right-r.left)),top:Math.min(0,...text.map(b=>b.top-r.top)),bottom:Math.max(r.height,...text.map(b=>b.bottom-r.top))};
  }
  const extra=notes.cornerText,box={left:r.left+extra.left,right:r.left+extra.right,top:r.top+extra.top,bottom:r.top+extra.bottom,width:extra.right-extra.left};
  // 거문도 낮은 가로의 두 줄 틀림 안내는 위 4px까지 써서 말풍선과 8px 이상을 남긴다(2026-11-20 고치기 2).
  const topMargin=song.id==='geomun'&&H<=420?4:8;
  if(box.top<topMargin){const dy=topMargin-box.top;notes.style.top=(parseFloat(notes.style.top)+dy)+'px';box.top+=dy;box.bottom+=dy;}
  if(!corners.some(c=>box.left<c.right&&box.right>c.left&&box.top<c.bottom&&box.bottom>c.top))return;
  const band=corners.filter(c=>box.top<c.bottom&&box.bottom>c.top);
  const left=Math.max(8,...band.filter(c=>c.left<W/2).map(c=>c.right));
  const right=Math.min(W-8,...band.filter(c=>c.left>=W/2).map(c=>c.left));
  if(box.width<=right-left)notes.style.left=(r.left+Math.max(left,Math.min(right-box.width,box.left))-box.left)+'px';
}
function captionDTopBand(notes,n,slot){
  const me=captionD.slots.me,edge=notes.dataset.edge,key=[W,H,n.x,n.w,edge,...[slot,me].filter(Boolean).map(s=>Math.round(s.x)+','+Math.round(s.w))].join('|');
  if(notes.bandKey===key)return;
  notes.bandKey=key;
  const frame=window.frameElement?.getBoundingClientRect();
  const corners=frame?[...window.parent.document.querySelectorAll('[data-test="exit-x"],[data-test="sound"]')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left-frame.left,w:r.width};}).filter(r=>r.w):[];
  const hand=edge==='left'?{x:n.x,w:104}:{x:n.x+n.w-104,w:104};
  const blocks=[slot,me,hand,...corners].filter(Boolean).map(b=>[b.x-12,b.x+b.w+12]).sort((a,b)=>a[0]-b[0]),end=Math.min(n.x+n.w,W-9),free=[];
  let at=Math.max(n.x,9);
  for(const[a,b]of blocks){if(a>at)free.push([at,Math.min(a,end)]);at=Math.max(at,b);}
  if(at<end)free.push([at,end]);
  const mid=slot?slot.x+slot.w/2:W/2,wide=free.filter(([a,b])=>b-a>=150);
  const pick=wide.length?wide.sort((p,q)=>Math.abs((p[0]+p[1])/2-mid)-Math.abs((q[0]+q[1])/2-mid))[0]:free.sort((p,q)=>(q[1]-q[0])-(p[1]-p[0]))[0];
  if(!pick){for(const k of['--band-x','--band-r','--band-w'])notes.style.removeProperty(k);return;}
  notes.style.setProperty('--band-x',Math.round(pick[0]-n.x)+'px');
  notes.style.setProperty('--band-r',Math.round(n.x+n.w-pick[1])+'px');
  notes.style.setProperty('--band-w',Math.floor(pick[1]-pick[0])+'px');
}
function placeMsgs(){
  if(captionDLive()){captionDAttach();return;}
  if(!learning)for(const el of [elTop,elFb]){el.style.cssText='';if(el.parentNode!==document.body)document.body.append(el);}
}

function drawMsg(f) {
  let top = '', fb = '';
  if (msgTop) { if (f - msgTop.t0 > msgTop.dur) msgTop = null; else top = msgTop.text; }
  if (msg) { if (f - msg.t0 > msg.dur) msg = null; else fb = msg.text; }
  setText(elTop, top); setHidden(elTop, !top);
  setLines(elFb, fb); setHidden(elFb, !fb);
  elFb.classList.toggle('side', !!(msg && msg.side));
  placeMsgs();
}
// 판을 시작하면 풍물패가 제자리에서 뛰어오른다. 시작 창부터 무대에 서 있으니 다시 들어오지 않는다
const ENTRY_DUR = 0.8;
function entryHop(f) {
  const k = fxs.entryT === undefined ? 1 : clamp01((f - fxs.entryT) / ENTRY_DUR);
  return RM || k >= 1 ? 0 : Math.round(Math.abs(Math.sin(k * Math.PI * 4)) * 5);
}

// ───────── 그리기 ─────────
// 배경 층: 구름은 천천히 흐르고 잎덩이는 두 박마다 바람에 쏠린다. 바뀐 때만 다시 합친다
const bgLayer = document.createElement('canvas'); bgLayer.width = WORLD_W; bgLayer.height = WORLD_H;
const bgl = bgLayer.getContext('2d');
const CLOUD_SPEED = [0.45, 0.3, 0.55];
let bgKey = '';
function placed(name, x) { const im = SPRITES[name], m = META[name]; if (im && m && m.at) bgl.drawImage(im, x === undefined ? m.at[0] : x, m.at[1]); }
// 배경 그림의 하늘을 위쪽부터 지운다. 해가 산과 지붕 뒤로 넘어가고 하늘 색을 바꿀 수 있다
let skylessOf = null, skylessCv = null;
function skyless(im = SPRITES.bg) {
  if (skylessOf === im) return skylessCv;
  skylessOf = im; skylessCv = im;
  try {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0);
    const d = x2.getImageData(0, 0, c.width, c.height), px = d.data, w = c.width, h = c.height, seen = new Uint8Array(w * h);
    const [r0, g0, b0] = [px[0], px[1], px[2]], near = i => Math.abs(px[i] - r0) + Math.abs(px[i + 1] - g0) + Math.abs(px[i + 2] - b0) <= 6;
    const stack = []; for (let x = 0; x < w; x++) stack.push(x);
    while (stack.length) {
      const p = stack.pop(); if (seen[p] || !near(p * 4)) continue;
      seen[p] = 1; px[p * 4 + 3] = 0;
      const x = p % w; if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (p + w < w * h) stack.push(p + w); if (p - w >= 0) stack.push(p - w);
    }
    x2.putImageData(d, 0, 0); skylessCv = c;
  } catch (e) {}
  return skylessCv;
}
function backdrop(f, night, tint) {
  if (!SPRITES['tree-c-1'] || !META['tree-c-1']) return SPRITES.bg; // 층 그림이 오기 전에는 한 장 그대로
  const clock = yard.beats === null ? f / 1.25 : yard.beats / 2;
  const wind = RM ? 1 : (Math.floor(clock) % 2 + 2) % 2 + 1;
  const clouds = ['cloud-1', 'cloud-2', 'cloud-3'].map((n, i) => {
    const im = SPRITES[n], m = META[n]; if (!im || !m || !m.at) return 0;
    const span = WORLD_W + im.width;
    return RM ? m.at[0] : ((Math.floor(m.at[0] + im.width + f * CLOUD_SPEED[i]) % span) + span) % span - im.width;
  });
  const key = `${wind}|${clouds.join()}|${night}|${tint}`;
  if (key !== bgKey) {
    bgKey = key;
    bgl.clearRect(0, 0, WORLD_W, WORLD_H);
    bgl.drawImage(skyless(), 0, 0);
    if (!night) ['cloud-1', 'cloud-2', 'cloud-3'].forEach((n, i) => placed(n, clouds[i]));
    placed('chimney');
    ['tree-l', 'tree-c', 'tree-r'].forEach(n => placed(`${n}-${wind}`));
    if (tint) { bgl.globalCompositeOperation = 'source-atop'; bgl.fillStyle = tint; bgl.fillRect(0, 0, WORLD_W, WORLD_H); bgl.globalCompositeOperation = 'source-over'; }
  }
  return bgLayer;
}
function drawBg(f, st) {
  const mood = wolwolOn() ? wolMood(st) : moodNow(st), tint = moodTint(mood);
  lg.fillStyle = moodSky(mood); lg.fillRect(0, 0, VW, VH);
  const ground = 180 - vy, sea = ringOn() && !!SPRITES['sea-bg'];
  if (ground < VH) {
    lg.fillStyle = sea ? ringGround() : GROUND; lg.fillRect(0, ground, VW, VH - ground);
    if (tint) { lg.fillStyle = tint; lg.fillRect(0, ground, VW, VH - ground); }
  }
  if (wolwolOn()) drawWolMoon(st); else drawSkyActors(st, f);
  // 강강술래는 바닷가 마당 한 장(마을 마당의 나무 · 구름 층은 얹지 않는다)
  const im = sea ? seaLayer(tint) : SPRITES.bg ? backdrop(f, !!st && (st.scene === 'stars' || st.stage === 'night' || st.stage === 'dusk'), tint) : null; if (!im) return;
  lg.drawImage(im, -vx, -vy);
  if (vx < 0) { lg.setTransform(-1, 0, 0, 1, -vx, -vy); lg.drawImage(im, 0, 0); lg.setTransform(1, 0, 0, 1, 0, 0); }
  if (vx + VW > WORLD_W) { lg.setTransform(-1, 0, 0, 1, WORLD_W * 2 - vx, -vy); lg.drawImage(im, 0, 0); lg.setTransform(1, 0, 0, 1, 0, 0); }
  if (sea) { if (wolwolOn()) drawWolFire(f); else drawMoonPath(st, f); drawSand(); }
}
let flashCache = null;
function whiteOf(name) {
  const im = SPRITES[name]; if (!im) return null;
  if (flashCache && flashCache.name === name) return flashCache.c;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = '#fffdf2'; x2.fillRect(0, 0, c.width, c.height);
  flashCache = { name, c };
  return c;
}
function drawPile(f) {
  const hit = f - fxs.pileHit < 0.075, name = hit && SPRITES['pile-hit'] ? 'pile-hit' : 'pile';
  spr(name, PILE.x, PILE.y);
  if (f - fxs.pileFlash < 0.07) {
    const w = whiteOf(name), im = SPRITES[name], m = META[name];
    if (w) {
      const fx = m && m.foot ? m.foot[0] : im.width / 2, fy = m && m.foot ? m.foot[1] : im.height - 1, p = heroHitPoint();
      const sx = Math.max(0, Math.round(p.x - (PILE.x - fx)) - 16), sw = Math.min(im.width - sx, 32);
      lg.drawImage(w, sx, 0, sw, im.height, Math.round(PILE.x - vx - fx) + sx, Math.round(PILE.y - vy - fy), sw, im.height);
    }
  }
}
function drawSpectators(f, beats, hold) {
  if (wolwolOn()) return;
  const y0 = specY();
  lg.save();
  {lg.beginPath();lg.rect(0,0,VW,y0+1-vy);lg.clip();}
  drawExtraSpectators(f, y0, beats === null ? 0 : beats, hold, fxs.bubbles.some(b => f >= b.t0));
  if (yard.jumpT === null) SPEC.forEach((s, i) => {
    const cheering = fxs.bubbles.some(b => (b.who === i || ringOn()) && f >= b.t0); // 원 판은 말풍선이 하나라도 둘 다 팔을 든다
    const hop = cheering ? -Math.round(Math.abs(Math.sin(f * 11)) * 4) : (state === 'song' && !hold && Math.floor(beats + i) % 2 === 0 ? 1 : 0);
    let startX=(ringOn()&&!wolwolOn()&&onStartScreen())&&H<=420&&i===1?s.x-2:s.x;
    const pose=`${s.name}-${cheering ? 'cheer' : 'idle'}`;
    if((onStartScreen()||learning?.intro)&&!ringOn()&&K>baseK&&W>=900&&W<1280&&H>420){
      const im=SPRITES[pose],meta=META[pose];
      if(im&&meta?.foot){const ink=learnOpaque(im),foot=meta.foot[0],dot=K/DPR;
        startX=Math.max(vx+8/dot+foot-ink.left,Math.min(vx+(W-8)/dot+foot-ink.right,startX));}
    }
    spr(pose, startX, y0 + hop + 2);
  });
  lg.restore();
}
function drawBubbles(f) {
  for (const [event, el] of cheerTextNodes) {
    if (!fxs.bubbles.includes(event)) { el.remove(); cheerTextNodes.delete(event); }
    else el.hidden = true;
  }
  const y0 = specY();
  const placed=[], wolPlaced=[];if(wolwolOn())ring.bubbles=[];
  for (const b of fxs.bubbles) {
    if (f < b.t0) continue;
    const s = SPEC[b.who], rise = 0;
    // 담에서 뛰어내렸으면 마당 뒷줄에서 말한다
    const down = yard.jumpT !== null ? DANCERS[b.who] : null;
    const wolSpot=wolwolOn()?wolBubblePlace(b,f,rise,wolPlaced):null;if(wolwolOn()&&!wolSpot)continue;

    const bx = wolSpot?wolSpot.x:(down ? down.x + (down.x < 160 ? 24 : -24) : s.x + s.side * 24), by = wolSpot?wolSpot.y:(down ? DANCE_Y - 38 : Math.max(vy + 30, y0 - 18)) + rise;
    const side = wolSpot?wolSpot.side:down ? (down.x < 160 ? 1 : -1) : s.side;
    const wd = SPRITES[b.word], bb = SPRITES.bubble;
    // 크게 뜬 「쾅」과 겹치는 응원 말풍선은 빼고 팔 드는 몸짓만 남긴다
    if (!wd || !bb) continue;
    if(wolSpot){paintCheer(b,f,bx,by,side);wolPlaced.push(wolSpot.rect);ring.bubbles.push(wolSpot);}
    else { const spot=cheerPlace(b,{x:bx,y:by},placed);if(spot){paintCheer(b,f,spot.x,spot.y);placed.push(spot.rect);} }
  }
}
function drawSparks(f) {
  const im = SPRITES.spark; if (!im) return;
  const FW = 74, FH = 46, PX = 10, PY = 33;
  for (const s of fxs.sparks) {
    const fr = Math.floor((f - s.t0) * 30); if (fr > 8) continue;
    lg.setTransform(-1, 0, 0, 1, Math.round(s.x - vx + PX), Math.round(s.y - vy - PY));
    lg.drawImage(im, fr * FW, 0, FW, FH, 0, 0, FW, FH);
    lg.setTransform(1, 0, 0, 1, 0, 0);
  }
}
let animVt = 0;
// 끝 화면의 아래 판이 더미와 발을 가리지 않게 장면을 올린다. 주인공 머리가 위 판에 들어가기 전까지만
const HERO_TALL = 32, HERO_JUMP = 9;
function endLift(f) {
  if (state !== 'end') { fxs.endT = null; return 0; }
  if (fxs.endT == null) fxs.endT = f;
  const c = cv.getBoundingClientRect(), dots = DPR / K;
  const low = document.querySelector('.endBottom').getBoundingClientRect(), high = document.querySelector('.endTop').getBoundingClientRect();
  const bandY = low.height ? (low.top - c.top) * dots : (H - (VH < 120 ? 66 : 110)) * dots; // VH는 올림한 값이라 위에서 잰다. 판이 뜨기 전에는 어림값
  let need = Math.max(0, Math.ceil(lowestFoot() - camY - bandY));
  if ((wolwolOn()) && H <= 420 && high.height) need = Math.min(need, Math.max(0, wolEndHeadRoom(high, f)));
  fxs.endJump = HERO_JUMP;
  if (pung() && high.height) {
    const room = Math.floor(HERO.y - HERO_TALL - camY - (high.bottom - c.top) * dots);
    need = Math.min(need, Math.max(0, room));
    fxs.endJump = Math.max(0, Math.min(HERO_JUMP, room - need)); // 뛰어도 머리가 위 판에 들어가지 않을 만큼만
  }
  return Math.round(need * easeOut(clamp01((f - fxs.endT) / 0.35)));
}
function draw() { drawScene(); }
function drawScene() {
  captionD.props=[];
  learnDrawBodies = [];
  const f = learning?.intro ? learning.frozenF : learning?.resultUntil != null ? learning.resultF : performance.now() / 1000;
  const live = !!ctx && (state === 'practice' || state === 'song');
  const vt = learning ? learnVisualTime() : live ? heardNow() : 0;
  const rec = live ? (learning && (learning.intro || learning.mode === 'wait') ? learning.rec : waitRec || currentRec(vt)) : null;
  const frozen = !!learning?.intro || !!(waiting && waitRec);
  if (f >= fxs.stopUntil) animVt = learning ? vt : frozen ? waitRec.t0 + 2 * BEAT - 0.03 : vt;
  const vtx = animVt;
  // 앞소리꾼이 부르는 동안은 넓게, 받는 소리 앞에 다시 가깝게
  const beatNow = rec ? (vt - rec.t0) / rec.beat : -1;
  // 달밤에 들어서면 물러난 채로 끝까지 간다(마당 전체가 잔치판이다)
  // 강강술래: 느린 · 중간 대목은 메길 때만 물러나 달을 보여 주고 받을 때 다가간다. 빠른 대목부터는 끝까지 물러나 모인 사람과 달빛을 다 보여 준다
  const wideBar = !!rec && (ringOn() ? ringWide(rec, vt) : rec.def.stage === 'night' || (rec.def.scene && beatNow >= 0 && beatNow < WIDE_UNTIL));
  // 쾌지나 가로 폰은 가까이 오면 하늘 · 얼굴 · 받는 글의 칸이 함께 모자라 넓은 시야를 지킨다.
  setWide(netOn() || wideBar || (captionDLive()&&song?.id==='kwaeji')&&H<=420 || (pung() && (state === 'end' || (onStartScreen() && (H <= 420 || ringOn())))), f); // 끝 화면은 달밤 마당을 다 보여 준다. 낮은 화면 시작 창도 멀리서. 강강술래 시작 창은 어느 크기든 멀리서(바닷가와 원을 먼저 보여 준다)
  // 흔들림은 놀이 판만(글 칸은 DOM이라 그대로)
  vx = camX; vy = camY + endLift(f) + startLift(f);
  if (fxs.shake) { const k = (f - fxs.shake.t0) / fxs.shake.dur; if (k >= 1) fxs.shake = null; else { const a = fxs.shake.amp * (1 - k) * (1 - k); vx += Math.round(a * Math.sin(f * TAU * 19)); vy += Math.round(a * Math.cos(f * TAU * 23)); } }
  vx += buildJit(f);
  // 마지막 한 방 앞: 다 같이 도리깨를 들고 숨을 멈춘다
  const holdBeat = rec ? (vtx - rec.t0) / rec.beat : 0;
  const hold = !!(rec && (rec.def.finale ? holdBeat < rec.def.strikes[0] : rec.def.hush && song.voice && holdBeat >= 3.75)); // 쾌지나는 끝 마디 마지막 글자 뒤에 다 같이 든다
  const beats = rec ? (vtx - rec.t0) / rec.beat : null;
  yard.beats = hold ? 0 : beats;
  const still = frozen || hold;
  if (boatOn()) { drawBoat(f, vt, rec, frozen); return; }
  if (netOn()) { drawNet(f, vt, rec, frozen); return; }
  const rs = ringOn() ? ringFrame(vtx, still) : null; // 강강술래: 원이 함께 딛는 걸음 시계(모래가 흐르는 만큼도 여기서 센다)
  if(rs){const lift=captionDLive()&&H<=420?3:0;HERO.y=RING_CAST.HERO.y-lift;LEAD.y=RING_CAST.LEAD.y-lift;}
  const skySt = skyStage(rec, vtx);
  if(captionDLive())captionDLayout();
  if(wolwolOn()&&state==='end'){const worldY=vy;vy=camY;drawBg(f,skySt);vy=worldY;}else drawBg(f,skySt);
  if (wolwolOn()) { wolLimitParticles(); drawParticles(); }
  if (!wolwolOn()) drawSmoke();
  drawSpectators(f, beats, hold);
  if (!wolwolOn()) drawKids(f, beats, hold);
  if (rs) drawRingBack(f, rs, state === 'end' ? endHappy() && Math.floor(f * 2.2) % 2 === 0 : fxs.bubbles.some(b => f >= b.t0) || !!(hold && rec && rec.def.finale));
  drawNightProps(skySt, f);
  drawDancers(f, beats, hold);

  const npcPast = [], npcNext = [];
  for (const b of bars) for (const t of (b.npcStrikes || [])) (t <= vtx ? npcPast : npcNext).push(t);
  if (waitRec) npcNext.push(waitRec.t0 + 2 * BEAT);
  const nextNpc = npcNext.length ? Math.min(...npcNext) : null;
  const dip = rs ? (rs.planted ? 1 : 0) : beatDip(vtx, rec, still);
  const barLen = rec ? rec.beat : BEAT;
  // 원에서는 앞 · 뒷사람도 메기는 동안까지 큰박마다 걷는다
  const walkPast = rs ? rs.past : npcPast, walkNext = rs ? rs.next : nextNpc, walkHop = rs ? rs.hop : 0;

  drawRopeLine(skySt, f);
  const bandHop = entryHop(f);
  if (rs) drawRingFront(f, vtx, rs, rec, still, bandHop);

  // 뒷사람
  let fPose = still ? 'follower-raise' : workerPose('follower', vtx, walkPast, walkNext, rs ? rs.lift : barLen * 0.8);
  if (wolwolOn() && wolFinalShowing()) fPose = wolJoy(1) ? wolRaisePose('follower') : 'follower-idle';
  if (f - npc.lookT < 0.8) fPose = 'follower-look';
  const fDir = fPose === 'follower-look' && !rs ? -1 : FOLLOW.dir; // 원의 따라 도는 사람은 돌아보는 그림이 이미 내 꼬마 쪽을 본다
  const fX = FOLLOW.x + (rs ? ringKick(ring.pushT + 0.06, 0.4, 4, f) + ringKick(ring.dragT, 0.5, 3, f) : 0); // 내가 일찍 디디면 내 몸이 닿은 뒤 등을 떠밀린다. 늦으면 앞서가며 내 손을 끈다
  spr(fPose, fX, FOLLOW.y + dip - bandHop - walkHop, fDir);
  if (wolwolOn()) {wolRim(fPose, fX, FOLLOW.y + dip - bandHop - walkHop);ring.followBody={name:'follower',x:fX,y:FOLLOW.y+dip-bandHop-walkHop,pose:fPose,k:1};}
  if (rec && !(rec.opts && rec.opts.noBa) && notesOn(vtx, rec, rec.def.baN)) mouth(fPose, { ...FOLLOW, x: fX, dir: fDir }, FOLLOW.y + dip - walkHop);

  drawPile(f);

  // 앞사람: 신호(한 번 = 크게 들기, 두 번 = 딱딱 두 번 까딱). 같은 꼴을 두 번 놓치면 몸짓이 커진다
  const bigCue = !!(rec && rec.def.cue && leader.big[rec.def.cue]);
  let lPose = still ? 'leader-raise' : workerPose('leader', vtx, walkPast, walkNext, rs ? rs.lift : barLen * (bigCue ? 1.6 : 1));
  if (wolwolOn() && wolFinalShowing()) lPose = wolJoy(-3) ? wolRaisePose('leader') : 'leader-idle';
  if (rec && CUE_BEATS[rec.def.cue]) { const b = (vtx - rec.t0) / rec.beat; for (const c of CUE_BEATS[rec.def.cue]) { const k = b - c; if (k >= 0 && k < 0.3) lPose = 'leader-swing'; } }
  const lFall = !rs && f - hero.fallT >= 0.08 && f - hero.fallT < 0.7; // 마당 판: 내 꼬마가 주저앉으면 상쇠가 손바닥을 펴고 펄쩍(그래프 검수 5회차 R1-01)
  if (f - leader.stopT < 0.7 || lFall) lPose = 'leader-palm';
  const lStopped = !!rs && f - leader.stopT < 0.7; // 원 판: 부르다 끊기면 입을 닫고 펄쩍 뛴다
  const lHop = (lStopped || lFall) && !RM ? -Math.round(Math.abs(Math.sin((f - (lFall ? hero.fallT : leader.stopT)) * 9)) * 3) : bigCue && !still ? -Math.round(Math.abs(Math.sin(vtx * Math.PI / rec.beat)) * 3) : 0;
  spr(lPose, LEAD.x, LEAD.y + dip + lHop - bandHop - walkHop, LEAD.dir);
  if (wolwolOn()) wolRim(lPose, LEAD.x, LEAD.y + dip + lHop - bandHop - walkHop);
  // 원에서는 앞소리꾼도 받는 소리를 함께 부른다
  if (rec && !lStopped && (notesOn(vtx, rec, rec.def.meN) || (rs && !(rec.opts && rec.opts.noBa) && notesOn(vtx, rec, rec.def.baN)))) mouth(lPose, LEAD, LEAD.y + dip + lHop - walkHop);

  // 낟알 더미
  const st = heapStage();
  if (st > fxs.heapShown) { fxs.heapShown = st; fxs.heapPop = f; }
  if (st > 0) spr(`heap-${st}`, HEAP.x, HEAP.y - (f - fxs.heapPop < 0.1 ? 1 : 0));

  // 주인공
  const nextHero = targets.filter(t => !t.judged).reduce((m, t) => Math.min(m, t.t), 1e9);
  // 원에서는 한 박이 2초가 넘어도 발을 드는 것은 딛기 0.6초 앞부터
  let hPose = heroPose(vt, f, nextHero, still, rs ? Math.min(barLen, 0.67) : barLen);
  if (wolwolOn() && wolFinalShowing()) hPose = wolJoy(0) ? 'hero-jump' : 'hero-idle';
  if (rs && hold && rec && rec.def.finale) hPose = 'hero-jump'; // 끝 한 방 앞: 다 같이 잡은 손을 번쩍 든다
  if (rs && hPose === 'hero-rebound' && flipNow(f) >= 0) hPose = 'hero-jump'; // 원 판 공중돌기는 팔 든 그림으로 돈다(팔 벌린 그림은 옆으로 누우면 말풍선 꼬리에 닿는다)
  // 마당 판 이어 두 번 놓침(그래프 검수 5회차 R1-01): 0.08초 깜짝 → 0.52초 털썩 주저앉음(X 눈, 다리는 땅 밑으로 가림) → 0.2초 눈 감고 일어섬
  const fallK = !rs && state === 'song' ? f - hero.fallT : -1, sitting = fallK >= 0.08 && fallK < 0.6;
  if (fallK >= 0 && fallK < 0.08) hPose = 'hero-startle'; else if (sitting) hPose = 'hero-miss'; else if (fallK >= 0.6 && fallK < 0.8) hPose = 'hero-stop';
  if (sitting && !hero.fallDust) { hero.fallDust = true; if (!RM) dust(HERO.x, HERO.y, 6); }
  const sitDrop = sitting ? (fallK < 0.16 && !RM ? 7 : 5) : 0;
  let hy = HERO.y + (rs ? (f - hero.swingF < 0.1 ? 1 : 0) : dip) + holdBodyBob(f) + sitDrop, hop = 0;
  if (hPose === 'hero-jump' && !(rs && flipNow(f) >= 0)) { const k = state === 'end' ? (f * 2.2) % 1 : clamp01((f - hero.jumpT) / 0.42); hop = Math.round(Math.sin(k * Math.PI) * (state === 'end' ? fxs.endJump : rs ? RING_JUMP : HERO_JUMP)); }
  // 일찍: 마당 판은 ±2점 세 번 0.3초(손맛-소리 12절, 그래프 검수 3회차 R3-02). 원 판은 옆 사람과 손을 잡고 있어 ±1점 그대로(앞사람 등 밀림 5점이 따로 있다)
  const hx = hPose === 'hero-miss' ? HERO.x + Math.round((rs ? 1 : 2) * Math.sin((f - hero.wobbleT) * (rs ? 34 : 20 * Math.PI))) : charge && charge.full && !RM ? HERO.x + Math.round(Math.sin(f * 40)) : HERO.x;
  // 마당 판(그래프 검수 4회차): 늦거나 놓치면 앞사람에게 끌려 5점 나아갔다 돌아오고, 앞사람 차례에 치면 깜짝 6점 뛴다. 원 판은 손을 잡고 있어 뛰지 않는다
  const yardKick = !rs && !RM ? Math.round((fallK >= 0 && fallK < 0.8 ? 8 : 5) * Math.max(oopsBump(f - hero.startleT, .12, .4), oopsBump(f - hero.dropT, .12, .45))) : 0;
  const stopHop = !rs && !RM && f - hero.stopT >= 0 && f - hero.stopT < .3 ? Math.round(6 * Math.sin(Math.PI * (f - hero.stopT) / .3)) : 0;
  const heroX = hx + (rs ? ringKick(ring.dragT, 0.5, 6, f) + ringKick(ring.pushT, 0.35, 5, f) : yardKick); // 늦으면 앞사람에게 끌려가고, 일찍 디디면 앞사람 등으로 나아간다
  const heroAt = { ...HERO, x: heroX };
  if (flipNow(f) >= 0) hop += Math.round(Math.sin(flipNow(f) * Math.PI) * (rs ? RING_FLIP_RISE : 10));
  hy -= bandHop + hop + stopHop;
  hy=captionDLimitY(hPose,heroX,hy,'ba',flipNow(f)>=0?Math.floor(flipNow(f)*4):0,rs?RING_FLIP_PIVOT:null);
  ring.hop = rs ? hop : 0;
  // 끈이 늘어지면 몸 뒤로 숨지 않고 얼굴 앞으로 내려온다
  const strapFront = (hero.droop || 0) > 0.3;
  if (!strapFront) drawStrap(hPose, heroAt, hy, f);
  // 공중돌기: 네 칸으로 돈다(점이 흐려지지 않게 직각으로만)
  const flipK = flipNow(f);
  if (sitting) { lg.save(); lg.beginPath(); lg.rect(0, 0, lg.canvas.width, Math.round(HERO.y - vy) + 3); lg.clip(); } // 주저앉으면 다리는 땅 밑으로
  if (flipK >= 0) sprTurn(hPose, heroX, hy, HERO.dir, Math.floor(flipK * 4), rs ? RING_FLIP_PIVOT : null); else spr(hPose, heroX, hy, HERO.dir);
  if (sitting) lg.restore();
  if (wolwolOn() && flipK < 0) wolRim(hPose, heroX, hy);
  if (rec && !(rec.opts && rec.opts.noBa) && notesOn(vtx, rec, rec.def.baN) && hPose !== 'hero-miss' && hPose !== 'hero-startle' && !(rs && flipK >= 0)) mouth(hPose, heroAt, hy); // 원 판 공중돌기 중에는 입을 덧그리지 않는다
  if (strapFront) drawStrap(hPose, heroAt, hy, f);
  if (wolwolOn()) { wolGather(f); drawWolEmbers(f); } // 월월이 꾹 불티(곡별 검수 05 재미 F01). 다른 곡은 그리지 않는다
  if (f - hero.dropT < 0.9 && f - hero.dropT > 0.05) {
    // 화면이 좁으면 말풍선이 오른쪽 끝에서 잘리지 않게 안쪽으로 당긴다
    const bubbleX = Math.min(HERO.x + 20, camX + VW - 36);
    spr('bubble', bubbleX, HERO.y - 44);
    lg.fillStyle = '#6f4a33'; const dotY = Math.round(HERO.y - 44 - vy - 15), dotX = Math.round(bubbleX + 11 - vx);
    [-6, 0, 6].forEach(dx => lg.fillRect(dotX + dx - 1, dotY, 3, 3));
  }

  drawQuail();
  drawRopeKid(skySt, f);
  drawSparks(f);
  if (!wolwolOn()) drawParticles();
  // 첫 안내: 손가락 끝이 도리깨가 떨어질 더미를 가리킨다
  // 강강술래는 내 꼬마의 배를 가리킨다. 손끝이 입보다 아래라 노래하는 입은 가리지 않는다(손목은 화면 아래로 잘려도 된다)
  const fingerX = rs ? HERO.x + 8 : 188, fingerY = rs ? Math.min(HERO.y + 12, vy + VH + 8) : VH < 120 ? 168 : 176;
  if (!holdSong() && !learning && !activeSongHelp() && msg && msg.finger) spr(Math.floor(f * 3.2) % 2 ? 'finger-holding' : 'finger-waiting', fingerX, fingerY);

  // 틀림 띠: 놀이 판 가장자리만 은은하게(글 · 번쩍임 없이)
  const bk = (f - fxs.band) / 0.5;
  const edge = bk >= 0 && bk < 1 ? String(Math.round((1 - bk) * 100) / 100) : '0';
  if (elEdge.style.opacity !== edge) elEdge.style.opacity = edge;
  drawLyric(wolwolOn() ? vt : vtx, rec);
  drawMsg(f);
  drawBubbles(f);
  if(wolwolOn()&&state==='end'){const moon=wolMoonRect(skySt);Screens.placeEnd(moon?[moon]:[],12);}
  blitLo();
}
