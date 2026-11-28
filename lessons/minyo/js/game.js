// 팔도 장단 흐름: 지도 → 곡 고르기 → 시작 창 → 연습(곡마다 처음만) → 노래 → 끝 화면 → 다시
// 주소 뒤 붙임: ?song=onghe 바로 시작 창 · ?bot=40 자동 손(오차 ms) · ?bias=ms · ?skip=0.1 놓치는 비율 · ?short=1 짧은 곡 · ?offset=ms 판정 보정
// ?call=hold 메기는 동안 꾹 눌러 모으기(기본) · ?call=eolssu 줄 끝에 얼쑤 한 번 · ?call=none 듣기만 · ?hold=0 자동 손이 모으지 않음
const Q = new URLSearchParams(location.search);
const BOT = Q.has('bot') ? Math.max(0, +Q.get('bot') || 0) : null;
const BOT_BIAS = (+(Q.get('bias') || 0)) / 1000;
const BOT_SKIP = Math.min(1, Math.max(0, +(Q.get('skip') || 0)));
const BOT_WRONG = Math.min(1, Math.max(0, +(Q.get('wrong') || 0))); // 두 손 곡: 자동 손이 반대 손을 누르는 비율
const SHORT = Q.get('short') === '1';
const EVERY = Q.get('every') === '1';
const FROM = Math.max(0, +(Q.get('from') || 0)); // 시험용: 그 마디부터 바로 시작
const Rules = window.MinyoRules, Screens = window.MinyoScreens;
const CALL_MODE = ['hold', 'eolssu', 'none'].includes(Q.get('call')) ? Q.get('call') : 'hold';
const BOT_HOLD = !EVERY && Q.get('hold') !== '0';
const FORCE_HARD = Q.get('hard') === '1';
if (window.GF.inFrame) document.body.classList.add('inFrame'); // 사이트 틀 안에서는 모서리 단추를 피한다
let pickHard = false; // 시작 창에서 고른 판. 시작 창을 열 때마다 쉬운 판으로 돌아간다
let hardRun = FORCE_HARD; // 어려움 판: 내가 치는 소리가 곧 장구다

let save = Rules.cleanSave(window.GF.load());
let OFFSET = (Q.has('offset') ? +Q.get('offset') : save.offsetMs) / 1000;

// ───────── 상태 ─────────
let song = null, BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, BA_FIRST = [];
const stageSong = (s = song) => !!(s && (s.ring || s.net || s.boat));
let state = 'map', paused = false, pausedIdx = 0;
let bars = [], targets = [], queue = [], nextT = 0, songBars = [], songTotal = 0;
let waitRec = null, waiting = false;
let practiceOk = 0, practiceTries = 0, practiceHold = false;
let msg = null, msgTop = null;
let partOfLastBar = null;
const sc = { streak: 0, best: 0, extra: 0, stray: 0, strayTold: 0, cheers: 0, wows: 0, hits: 0, charged: 0, eolssu: 0, heat: 0 };
// 신명: 맞힐 때마다 오르고 8 · 16 · 24에서 상모가 한 단씩 커지며 공중돌기. 놓치면 한 단 내려간다.
// 칠 곳이 적은 곡은 단 사이를 칠 곳의 17%로 줄인다(4 ~ 8, 운재 24곳은 4 · 8 · 12). 어느 곡도 지금보다 어려워지지 않는다(2026-11-21 그래프 검수 R2-08)
let HEAT_AT = [0, 8, 16, 24];
const heatSteps = n => { const k = Math.max(4, Math.min(8, Math.round(n * .17))); return [0, k, 2 * k, 3 * k]; };
const heatLevel = () => { let l = 0; HEAT_AT.forEach((v, k) => { if (sc.heat >= v) l = k; }); return l; };
function heatUp() {
  const before = heatLevel();
  sc.heat++;
  const now = heatLevel();
  if (now > before) { levelUpFx(now); hero.flipT = performance.now() / 1000; hero.jumpT = hero.flipT; accent('level', ctx.currentTime); log('level', { level: now }); }
  else if (now === 3 && (sc.heat - HEAT_AT[3]) % 8 === 0) { hero.flipT = performance.now() / 1000; hero.jumpT = hero.flipT; } // 꼭대기에서는 8번마다 공중돌기
}
const heatDown = () => { sc.heat = HEAT_AT[Math.max(0, heatLevel() - 1)]; };
const fxs = { particles: [], bubbles: [], sparks: [], band: -9, pileHit: -9, pileFlash: -9, stopUntil: -9, shake: null, heapShown: 0, heapPop: -9 };
const hero = { swingF: -9, spinT: -9, dropT: -9, wobbleT: -9, stopT: -9, startleT: -9, jumpT: -9, fizzleT: -9, flipT: -9, fallT: -9, fallDust: true, whirl: 0 };
const leader = { stopT: -9, big: {} };
const npc = { lookT: -9 };
const missRun = { cue: null, n: 0 };
let cheerIdx = 0, lastStamp = 0, calib = null;
const endHappy = () => lastStamp === 3;
// 끝 화면 몸짓: 온 동네 이상은 다 같이 춤춘다. 아래 도장은 모여 온 사람이 돌아가며 반응해 얼어붙지 않는다
const endJoy = (i, f) => lastStamp >= 3 || (lastStamp === 2 ? Math.floor(f * 1.25 + i) % 2 === 0 : Math.floor(f * 1.25) % 4 === i % 4);
const timing = { shown: performance.now(), startPressed: null, playStart: null, firstTap: null, firstHit: null };
const events = [];
let lastSummary = null;
function log(type, data = {}) { events.push({ ms: Math.round(performance.now() - timing.shown), type, ...data }); if (events.length > 2000) events.shift(); }

function setSong(s) {
  placeCast(s); // 강강술래는 원의 자리로
  song = s; songLevel(); BPM = s.bpm; BEAT = 60 / BPM; BAR = BEAT * 4; // 잔치에서 마을이 바뀌어도 그 곡 크기로
  BA_FIRST = s.practiceBar.baN;
  voiceFetch(s); fetchSongSfx(s).catch(e => log('sound-load-error', { file: String(e) }));
  songArtReady(s.ring ? s.ringArt || 'ganggang' : s.id);
  songBars = hardRun && s.hardBars ? s.hardBars() : s.bars();
  if (SHORT) songBars = songBars.filter((b, i) => i < 7 || b.outro).map((b, i) => ({ ...b, i }));
  if (FROM) songBars = songBars.filter((b, i) => i >= FROM).map((b, i) => ({ ...b, i }));
  if (feastRun) songBars = feastBars(s); // 팔도 잔치: 그 마을 구간만(feast.js)
  songTotal = songBars.reduce((n, b) => n + (b.demo ? 0 : b.strikes.length), 0);
  HEAT_AT = heatSteps(songTotal);
}
function setHard(on) { hardRun = on && !!song.hardBars; setSong(song); }
function resetRun() {
  continuousVoice = null;
  clearCheerText();
  learning = null; resetSongHelp();
  hideLearningUi();
  bars = []; targets = []; queue = []; waitRec = null; waiting = false; msg = null; msgTop = null;
  Object.keys(sc).forEach(k => { sc[k] = 0; });
  fxs.particles = []; fxs.bubbles = []; fxs.sparks = []; fxs.band = -9; fxs.shake = null; fxs.heapShown = 0; fxs.stopUntil = -9; fxs.buildAt = null; fxs.buildK = 0;
  hero.swingF = -9; hero.dropT = -9; hero.wobbleT = -9; hero.stopT = -9; hero.startleT = -9; hero.jumpT = -9; hero.fallT = -9;
  leader.big = {}; missRun.cue = null; missRun.n = 0; lastStamp = 0;
  partOfLastBar = null; cheerIdx = 0; botPlanned.clear(); charge = null; heldOnTold = false; botCharged.clear(); hero.fizzleT = -9; hero.flipT = -9;
  yardReset(); ringReset(); netReset(); boatReset();
}

// ───────── 마디 걸기 ─────────
const barBeat = def => (def && def.bpm ? 60 / def.bpm : BEAT);
const barBeats = def => def.beats || 4;
const barSpan = def => barBeat(def) * barBeats(def);
const barEnd = rec => rec.t0 + rec.beat * barBeats(rec.def);
const CUE_BEATS = { double: [0, 1], triple: [0, 1, 1.5] };
const DRUM_FAST = [[0, '덩', 1], [1, '덕', .8], [1.5, '덕', .5], [2, '쿵', .9], [3, '덕', .8]];
function drumBar(t0, v = 0.85, beat = BEAT, def = null) {
  const pat = (song && song.drum) || DRUM_FAST, stop = def && def.drumStop !== undefined ? def.drumStop : 99;
  pat.forEach(([b, k, a]) => { if (b < stop) janggu(t0 + b * beat + (k === '기덕' ? kideokLag(beat) : 0), k, a * v); });
}
function scheduleBar(def, t0, opts = {}) {
  const beat = barBeat(def);
  const rec = { t0, def, opts, beat }; bars.push(rec);
  if (bars.length > 8) bars.shift();
  if (def.clip && song.voice.continuous && state === 'song') {
    if (!continuousVoice) {
      const from = def.vfrom || 0, len = song.voice.duration - from;
      continuousVoice = { clip: def.clip, from, t: t0, len };
      const played = playVoice(def.clip, from, len, t0, song.voice.gain, music, 1, 0, song.voice.fadeOut ?? .02, .01);
      log('continuous-clip', { ...continuousVoice, played });
    }
  } else if (def.clip) {
    // 실제 녹음: 소리꾼이 박보다 조금 먼저 들어가는 자리까지 튼다. 같은 조각의 다음 장단은 겹치지 않게 잇는다
    const v = song.voice, prev = bars[bars.length - 2];
    // 강강술래처럼 장단 길이가 대목마다 다른 곡은 마디가 제 자리(vfrom · vlen, 조각 안 초)를 갖는다
    const base = def.vfrom !== undefined ? def.vfrom : def.half * v.bar + v.grid;
    const pre = Math.min(base, prev && prev.def.clip === def.clip && prev.def.half + 1 === def.half ? XF : v.pre);
    const from = base - pre, len = Math.min(def.vlen || v.bar, def.voiceCut ?? Infinity) + pre + (def.tail || 0);
    const played = playVoice(def.clip, from, len, t0 - pre, v.gain, def.call ? music : crowd, 1, 0, def.fadeOut);
    log('clip', { clip: def.clip, half: def.half, played, t: t0 - pre, from, len });
    // 맞힌 수가 쌓일수록 받는 소리가 여러 사람 소리로 두꺼워진다. 같은 녹음을 조금 어긋나게 겹친다
    if (!def.call) (song.doubles || []).forEach(d => { if (sc.hits >= d.at) playVoice(def.clip, from, len, t0 - pre + d.delay, v.gain * d.gain, doubles, d.rate, d.pan, def.fadeOut); });
  } else if (!song.voice) {
    def.meN.forEach(([b, d, m]) => leadNote(t0 + b * beat, d * beat, m));
    if (!opts.noBa) def.baN.forEach(([b, d, m]) => chorusNote(t0 + b * beat, d * beat, m));
  }
  if (!opts.noDrum && !def.outro) drumBar(t0, hardRun && !def.call ? 0.35 : 0.85, beat, def); // 어려움 판은 앞사람 장구를 길잡이로만 작게
  if (song.band && !def.outro && state === 'song') bandBar(t0, beat, def);
  if (def.call && song.voice) followHand('hit', t0); // 새 줄은 새로 시작한다
  if (def.outro && song.ring && !wolwolOn()) ringAccent('finale', t0 + (def.finale ? def.strikes[0] * beat : 0)); // 다 같이 쾅 구르고 구경꾼이 박수
  else if (def.outro && !stageSong()) janggu(t0 + (def.finale ? def.strikes[0] * beat : 0), '덩', 1.3);
  if (def.finale && song.voice && !stageSong()) sample('jing', t0 + def.strikes[0] * beat, 0.9, music);
  ringBar(rec); netBar(rec); boatBar(rec);
  (CUE_BEATS[def.cue] || []).forEach(b => woodClick(t0 + b * beat));
  if (BOT !== null && EVERY && def.me) [0, 1].forEach(b => setTimeout(() => onTap(t0 + b * beat), Math.max(0, (t0 + b * beat - ctx.currentTime) * 1000)));
  rec.npcStrikes = [];
  def.strikes.forEach((b, k) => {
    const t = t0 + b * beat;
    if (!opts.noNpcHit) { if (!hardRun || def.finale) hitSound(t, def.finale ? 0.8 : 0.36, music); rec.npcStrikes.push(t); }
    // 느린 대목은 한 박이 2초가 넘는다. 받아 주는 폭은 쾌지나 한 박(1.25초)만큼까지만
    if (!def.demo && !opts.noTarget && !(opts.skipFirst && k === 0)) targets.push({ t, rec, beat: b, len: Math.min(beat, 1.25), judged: false, res: null, part: def.part, d: null, i: def.i, side: def.sides?.[k] || null, second: k > 0 && !stageSong() }); // 강강술래는 네 글자를 똑같이 치니 둘째 박 실수를 따로 세지 않는다
  });
  return rec;
}

// 맞힌 수만큼 들어온 악기. 앞소리꾼이 부를 때는 노랫말이 들리게 줄인다
// 북 · 꽹과리는 1분에 48번이라 칠 때마다 크기 ±1dB · 높이 ±1.5%를 흔든다. 징은 음높이가 길게 울려 ±0.5%만(그래프 검수 9회차 R3-01 · R5-01)
function bandBar(t0, beat, def) {
  const stop = def.drumStop !== undefined ? def.drumStop : 99, soft = def.call ? 0.55 : 1;
  for (const l of song.band) {
    if (sc.hits < l.at) continue;
    for (const [b, a, name] of l.pat) if (b < stop) sample(name, t0 + b * beat, a * l.v * soft * (0.89 + Math.random() * 0.23), band, name === 'jing' ? 0.995 + Math.random() * 0.01 : 0.985 + Math.random() * 0.03);
  }
}

// ───────── 시작 · 연습 · 노래 ─────────
function startPractice() {
  killSound(); resetRun();
  state = 'practice'; practiceOk = 0; practiceTries = 0; practiceHold = false;
  enterBand();
  timing.playStart = timing.playStart || performance.now();
  log('stage', { name: 'practice', song: song.id });
  if (song.voice) { // 실제 녹음: 앞사람이 들고 기다리다가 첫 누름에 받는 소리가 함께 시작한다
    waitRec = { t0: ctx.currentTime + 0.7, def: song.practiceBar, opts: { noBa: true }, beat: BEAT, npcStrikes: [] };
    bars.push(waitRec);
  } else waitRec = scheduleBar(song.practiceBar, ctx.currentTime + 0.7, { noDrum: true, noBa: true, noNpcHit: true, noTarget: true });
  nextT = Infinity;
  if (!song.voice) msgTop = { text: song.hint, t0: performance.now() / 1000, dur: 7 }; // 실제 녹음 곡은 첫 누름 뒤에 알린다. 그 전에는 「지금 화면을 눌러요」 하나만
}
function startSong(fromPractice) {
  if (!fromPractice) { killSound(); resetRun(); timing.playStart = timing.playStart || performance.now(); enterBand(); }
  if (fromPractice) { if(netOn())netReset(); if(boatOn())boatReset(); if(wolwolOn())ringReset(); }
  sc.streak = 0; sc.best = 0; sc.charged = 0; sc.cheers = 0; sc.stray = 0; sc.strayTold = 0; // 연습에서 터뜨린 것은 판에 안 세고, 첫 메기는 마디에서 손가락 안내를 다시 보여 준다
  state = 'song';
  if (!stageSong()) fetchJangVars(); // 쾌지나 장구 벌은 판이 시작된 뒤 받는다
  queue = songBars.map(def => ({ def, opts: {} }));
  nextT = fromPractice ? (song.voice ? nextT : nextT + BAR) : ctx.currentTime + (feastRun ? FEAST_LEAD : 0.6); // 잔치는 마을 띠를 읽을 틈을 두고 메긴다
  log('stage', { name: 'song', song: song.id });
  if (feastRun) feastBand(song);
}
// 풍물패가 제자리에서 뛰며 꽹과리를 한 번 친다
function enterBand() {
  fxs.entryT = performance.now() / 1000;
  if (song.voice && ctx) accent('enter', ctx.currentTime + 0.05);
}
const LOAD_LIMIT_MS = 20000;
let beginTry = 0; // 지도로 나갔다가 다시 눌렀을 때 옛 시도의 끝맺음이 새 시도를 건드리지 않게 한다
function begin(withPractice, withLearning = false) {
  const tryNo = ++beginTry;
  initAudio();
  setMuted(!window.GF.sound);
  // 녹음을 받는 동안은 시작 창을 그대로 두고 단추에 알린다
  if (song.voice) Screens.startBusy(true); else Screens.hide();
  timing.startPressed = timing.startPressed || performance.now();
  log('start', { song: song.id, practice: withPractice });
  state = 'starting';
  // 그림이나 노래가 끝내 안 오면 시작 창에 알린다. 다시 누르면 못 받은 것만 다시 받는다
  const loaded = Promise.all([window.GF.start(), yardArtReady(), songArtReady(song.id), sfxReady(), voiceReady(song)]).then(r => r[1] && r[2]);
  Promise.race([loaded, new Promise(done => setTimeout(() => done(false), LOAD_LIMIT_MS))]).then(ok => {
    if (tryNo !== beginTry) return;
    Screens.startBusy(false);
    if (!ok) dropArtWaits(song.id); // 응답 없는 요청을 버려 다음에 누르면 새로 받는다
    if (state !== 'starting') return;
    if (!ok || (song.voice && !voiceOk(song))) { toStart(song); Screens.startNote('노래를 못 불러왔어요. 시작을 다시 눌러요'); return; }
    Screens.hide();
    if (withLearning) startLearning(); else if (withPractice) startPractice(); else startSong(false);
  });
}
function resolveWait() {
  const tt = ctx.currentTime;
  waiting = false;
  const rec = waitRec; waitRec = null;
  if (song.voice) {
    bars.splice(bars.indexOf(rec), 1);
    scheduleBar(song.practiceBar, tt, { skipFirst: true });
    hero.swingF = performance.now() / 1000;
    hitSound(tt, 1);
    practiceOk = 1; practiceTries = 1; sc.streak = 1;
    onHitFx(true);
    netHit({part:'연습',rec,beat:0,res:'perfect'},0); boatHit({part:'연습',rec,beat:0,res:'perfect'},0);
    showFeedback('딱 맞아요');
    msgTop = { text: song.hint, t0: performance.now() / 1000, dur: 6 };
    noteFirst(true);
    log('success', { part: '연습', res: 'wait' });
    nextT = tt + barSpan(song.practiceBar);
    return;
  }
  rec.t0 = tt - 2 * BEAT;
  BA_FIRST.forEach(([b, d, m]) => chorusNote(tt + (b - 2) * BEAT, d * BEAT, m));
  hitSound(tt, 0.36, music); rec.npcStrikes = [tt]; npcHitFx();
  hero.swingF = performance.now() / 1000;
  hitSound(tt, 1);
  practiceOk = 1; sc.streak = 1;
  onHitFx(true);
  showFeedback('딱 맞아요');
  noteFirst(true);
  log('success', { part: '연습', res: 'wait' });
  nextT = tt + 2 * BEAT;
  queue.push({ def: song.practiceBar, opts: { noDrum: true } });
}

// ───────── 누르기 ─────────
function noteFirst(hit) {
  const now = performance.now();
  if (timing.firstTap === null) timing.firstTap = now - timing.playStart;
  if (hit && timing.firstHit === null) timing.firstHit = now - timing.playStart;
}
function currentRec(vt) {
  let r = null;
  for (const b of bars) if (b.t0 <= vt + 0.0001) r = b;
  return r;
}
// ───────── 모았다 터뜨리기 ─────────
// 어느 글자에 떼는지: 곧 올 받는 마디의 첫 글자
function releaseHint(vt) {
  if (song.releaseHint) return song.releaseHint;
  const up = upcomingBar(vt), def = up && (isBa(up) ? up.def : songBars[up.def.i + 1]), seg = def && (def.segs ? def.segs[0] : def);
  return `구슬이 ${song.ring ? '첫 ' : ''}${seg && seg.lyric ? seg.lyric[0] : '첫 글자'}에 닿을 때 떼요`;
}
// 앞소리꾼이 부르는 동안 꾹 누르고 있다가 받는 소리 첫 박에 떼면 크게 터진다. 안 눌러도 치면 맞고, 짧게 치면 메기는 소리에 친 것이다
const TAP_MAX = 0.25, CHARGE_FULL = 2.5;
// 꾹을 받음 첫 박에 떼는 곡 가운데 뗀 실수 도움말(tips.releaseEarly)이 있는 곡(멸치 · 거문도)은 「뗐어요」로 알리고 끝 도움말도 뗀 실수를 센다.
const releaseTold = () => !!song?.tips?.releaseEarly;
// 강강술래의 짧아지는 메김에서도 같은 비율만큼 모으면 손맛이 다 찬다. 판정 · 꾹 성공 셈은 그대로다.
const chargeFullFor = r => song?.id === 'ganggang' && r?.def.call ? Math.min(CHARGE_FULL, barSpan(r.def) * .65) : CHARGE_FULL;
let charge = null; // { t0: 누른 때(들리는 시계), rec: 누른 마디, full: 다 모았나 }
let heldOnTold = false; // 월월이: 받는 소리까지 손을 안 뗀 것을 이 판에서 알렸나(곡별 검수 05 R2-02)
const holdSong = () => CALL_MODE === 'hold' && !!(song && song.voice) && !song.twoHand; // 두 손 곡(둥당기)은 꾹이 없다: 메김 동안 듣는다
// 두 손 곡: 누른 손(L 화면 왼쪽 · R 오른쪽). 누르는 곳이 정해 두고 onTap이 읽는다
let pressSide = null;
// 두 손 곡: 화면 아래 양 끝 손 칸. 왼쪽 반 · 오른쪽 반을 누르면 그 칸이 반짝인다(누르는 자리는 화면 반쪽 전체)
const handPads = ['L', 'R'].map(side => { const el = document.createElement('div'); el.className = 'handPad'; el.dataset.side = side; el.hidden = true; el.textContent = side === 'L' ? '왼손 · F' : '오른손 · J'; document.body.append(el); return el; });
function paintHandPads() { const on = !!song?.twoHand && (state === 'practice' || state === 'song') && !paused; for (const el of handPads) if (el.hidden === on) el.hidden = !on; }
// 손 틀림: 맞는 쪽 손 칸이 0.7초 커지며 밝게 깜박인다(손이 가야 할 자리에서 알려 준다)
function wantHandPad(side) { const el = handPads[side === 'L' ? 0 : 1]; el.classList.remove('want'); void el.offsetWidth; el.classList.add('want'); }
function flashHandPad(side) { const el = handPads[side === 'L' ? 0 : 1]; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
const sideSay = side => (side === 'L' ? '왼손이에요' : '오른손이에요');
function nearestTarget(t) {
  let best = null, bd = 1e9;
  for (const tg of targets) {
    if (tg.judged) continue;
    const d = t - tg.t;
    if (Math.abs(d) < Math.abs(bd)) { bd = d; best = tg; }
  }
  return { tg: best, d: bd };
}
// 메기는 마디(또는 그 바로 앞 받는 마디의 칠 자리가 다 지난 뒤)에 눌렀고, 칠 자리 가까이가 아니어야 모으기다
// slack: 글자 사이가 2~3초로 긴 마디는 손 오차가 커서 판정 폭을 넓힌다(0.6이면 맞음 ±0.2초). 받아 주는 거리는 그대로
const judgeTarget = (tg, d, release = false) => {
  const s = tg.rec.def.slack || 1, res = Rules.judge(d * s, tg.len * s, release);
  if (!release && song.goodEarly !== undefined && song.goodLate !== undefined && res && res !== 'perfect') {
    if (Math.abs(d) <= (d < 0 ? song.goodEarly : song.goodLate)) return 'good';
    if (res === 'good') return d < 0 ? 'early' : 'late';
  }
  return res;
};
const chargeOn = () => holdSong() && (state === 'song' || (state === 'practice' && (learning ? learning.step === 3 : practiceHold)));
function canCharge(tHeard) {
  if (!chargeOn() || paused || charge) return false;
  const t = tHeard - OFFSET, rec = currentRec(t);
  if (!rec) return false;
  if (rec.def.rest) return true;
  const { tg, d } = nearestTarget(t);
  if (tg && judgeTarget(tg, d)) return false;
  if (rec.def.call) return true;
  if (rec.def.countIn) { const d = songBars[rec.def.i]; return !!(d.clip && !d.call); } // 곧 받는 마디면 앞 장구 동안 모아도 된다
  const next = songBars[rec.def.i + 1];
  return !!(next && (next.call || next.rest)) && !targets.some(x => x.rec === rec && !x.judged);
}
function startCharge(tHeard, pid) {
  netStopMotion();
  const rec = currentRec(tHeard - OFFSET);
  charge = { t0: tHeard, pressT: tHeard, rec, full: false, pid, pending: !!(rec && rec.def.rest) };
  if (rec?.def.call) { if (rec.holdPress === undefined) rec.holdPress = tHeard - OFFSET; else rec.holdBroken = true; }
  // 쉼에서 누른 손은 기억만 한다. 메기는 마디가 시작할 때부터 모으고 소리를 낸다
  if (charge.pending) return;
  log('charge', { i: charge.rec ? charge.rec.def.i : null });
  if (ctx) accent('charge', ctx.currentTime);
}
function releaseCharge(tHeard) {
  const c = charge; if (!c) return;
  charge = null;
  if (paused || !chargeOn()) return;
  if (c.pending && (song.net || boatOn() || wolwolOn())) {
    const r = currentRec(tHeard - OFFSET);
    if (r && r.def.call) { c.pending = false; c.t0 = r.t0; c.rec = r; }
  }
  if (c.pending) return;
  learnReleased(c, tHeard);
  const held = tHeard - c.t0, now = ctx.currentTime, fNow = performance.now() / 1000;
  if (((song.net || boatOn() || wolwolOn()) ? tHeard - c.pressT : held) < TAP_MAX) { onTap(c.t0); return; } // 짧게 쳤다: 누른 때로 친 것과 같다
  const { tg, d } = nearestTarget(tHeard - OFFSET);
  const res = tg ? judgeTarget(tg, d, true) : null;
  // 끝 도움말은 실제 뗀 실수를 센다. 판정 범위보다 일찍 뗀 손도 빠뜨리지 않는다.
  if(releaseTold()&&c.rec?.def.call&&!res&&tHeard-OFFSET<barEnd(c.rec)){
    (c.rec.releaseMistakes??=[]).push({res:'early',released:true});
  }
  if (res) holdIndicator.releasedAt = fNow;
  if (c.rec?.def.call) c.rec.holdRelease = res;
  log('release', { held: Math.round(held * 1000), res, d: tg ? Math.round(d * 1000) : null });
  if (!res) { // 너무 일찍 뗐다: 상모가 풀썩 내려앉고 끝. 다음 자리는 그대로 칠 수 있다
    hero.fizzleT = fNow; whoosh(now, 0.5);
    const r = currentRec(tHeard - OFFSET);
    if (r && (r.def.call || r.def.countIn)) {
      if (learning && learning.step <= 3) { showFeedback('끝까지 꾹', 1.2); msg.learnReason = true; }
      else {
        showFeedback(`일찍 뗐어요\n${releaseHint(tHeard - OFFSET)}`, 1.8, true);
        if (song.id === 'ganggang') msg.miss = true;
      }
    }
    return;
  }
  applyJudge(tg, d, res, now, fNow, Math.min(1, held / chargeFullFor(c.rec)), releaseTold());
  noteFirst(Rules.isHit(tg.res));
}
function applyJudge(best, bd, res, now, fNow, power = 0, released = false) {
  best.judged = true; best.d = bd; best.res = res;
  if(releaseTold())best.released=released;
  if (Rules.isHit(res)) {
    storyHit(); // 첫머리 이야기: 처음 배우기에서 맞히면 넘어진 줄꾼이 하나씩 일어난다
    hero.swingF = fNow;
    const stroke = hardRun && best.rec.def.segs && song.drum.find(([b]) => Math.abs(b - best.beat) < 0.01);
    if (stroke) janggu(now, stroke[1], 1.1); else if (song.twoHand && best.side) bowlSound(now, best.side, finaleTarget(best) ? 1.4 : 1); else hitSound(now, 1);
    if (!song.voice) straw(now + 0.012); if (res === 'perfect') sparkle(now + 0.01);
    judgeHit(best, power);
  } else {
    if (res === 'early') { whoosh(now); hero.wobbleT = fNow; if (song.ring) ringPush(fNow); } // 원에서는 앞사람 등에 부딪힌다
    else { hero.swingF = fNow; hero.startleT = fNow + 0.1; hitSound(now, 0.55); npc.lookT = fNow; if (song.ring) ringDrag(fNow); } // 앞사람에게 끌려가고 뒷사람이 부딪힌다
    judgeMiss(best, released);
  }
}
function pressAt(tHeard, pid) { if (storyBlocksPress()) return; if (learnPress(tHeard, pid)) return; if (canCharge(tHeard)) startCharge(tHeard, pid); else onTap(tHeard); }
function onTap(tHeard) {
  if (paused) return;
  netStopMotion();
  // 소리 시계가 멈춘 채면 판이 서 버린다: 누름으로 다시 깨운다
  if (ctx && ctx.state !== 'running') ctx.resume();
  if (state === 'calib') { calibTap(tHeard); return; }
  if (learnPress(tHeard)) return;
  if (state === 'practice' && waiting) { log('input', {}); resolveWait(); return; }
  if (state !== 'practice' && state !== 'song') return;
  const now = ctx.currentTime;
  const rec = currentRec(tHeard - OFFSET);
  if (learning?.step === 2 && learning.mode === 'rhythm' && learning.response) {
    const near = nearestTarget(tHeard - OFFSET);
    if (!near.tg || !judgeTarget(near.tg, near.d)) learning.extra++;
  }
  if (rec && rec.def.rest) return; // 쉼에 짧게 친 것은 판정도 벌도 소리도 없다
  log('input', {});
  const { tg: best, d: bd } = nearestTarget(tHeard - OFFSET);
  let res = best ? judgeTarget(best, bd) : null;
  const fNow = performance.now() / 1000;
  // 두 손 곡: 박은 맞아도 손이 다르면 「손 틀림」. 박이 틀린 것(일찍 · 늦게)과 따로 센다
  if (Rules.isHit(res) && song.twoHand && best.side && pressSide !== best.side) { res = 'hand'; log('hand', { want: best.side, got: pressSide, d: Math.round(bd * 1000) }); }
  if (res) applyJudge(best, bd, res, now, fNow);
  else {
    // 비교판 B: 메기는 줄 끝 박에 친 것은 추임새다
    if (CALL_MODE === 'eolssu' && rec && rec.def.call && !rec.eolDone && Math.abs(tHeard - OFFSET - (rec.t0 + 3 * rec.beat)) < 0.2) {
      rec.eolDone = true; sc.eolssu++; hitSound(now, 0.6); cheer(); noteFirst(false);
      return;
    }
    // 칠 자리가 아닌 데서 침
    whoosh(now, 0.6);
    if (!(rec && rec.def.demo)) {
      sc.extra++;
      const beatIn = rec ? (tHeard - OFFSET - rec.t0) / rec.beat : 9;
      sc.streak = 0;
      if (rec && beatIn >= 0 && (rec.def.clip ? rec.def.call : beatIn < 2 && rec.def.me)) {
        leader.stopT = fNow; hero.stopT = fNow; rec.spoiled = true; rec.spoils = (rec.spoils || 0) + 1; hushCheers(fNow);
        // 원 판 앞소리꾼은 두 손을 잡고 있어 손바닥이 작게 보인다. 부르던 말풍선이 흔들려 끊긴 것을 보여 준다
        if (stageSong() && !RM && elLyMe.animate) elLyMe.animate([{ translate: '0 0' }, { translate: '-7px 0' }, { translate: '6px 0' }, { translate: '-4px 0' }, { translate: '0 0' }], { duration: 320 });
        if (state === 'practice') showFeedback('아직이에요');
        else if (stageSong()) showFeedback('앞소리꾼 차례예요', 1.1, true);
        else showFeedback('앞사람 차례예요', 1.1); // 쾌지나도 헛손 그 순간에 까닭을 보인다
        if (boatOn()) { boatMiss('spoiled'); if (msg) msg.miss = true; }
      } else { // stray: 받는 마디에서 칠 글자가 아닌 데 친 헛손(끝 도움말 extra)
        hero.wobbleT = fNow; sc.stray++; if (boatOn()) boatMiss('early');
        // 같은 받는 마디 두 번째 헛손이면 그 자리에서 까닭을. 한 판 3번까지, 다른 글이 떠 있으면 건너뜀(그래프 검수 2회차 R4-02)
        if (state === 'song' && !learning && rec && beatIn >= 0 && !rec.def.call && (rec.strays = (rec.strays || 0) + 1) === 2 && sc.strayTold < 3 && !(msg && msg.text && fNow - msg.t0 <= msg.dur)) {
          sc.strayTold++; showFeedback(song.tips?.extra || window.MINYO.TIPS.extra, 1.1, stageSong()); log('stray-tip', { n: sc.strayTold });
        }
      }
    }
    log('fail', { res: 'extra' });
  }
  noteFirst(!!best && Rules.isHit(best.res));
}
// 메기는 소리에 쳤는가. 실제 녹음은 메기는 소리와 받는 소리가 마디째 나뉘니 바로 앞 마디를 본다. 앞 마디에서 친 수만큼 받는 자리를 깎는다
function spoiledBy(tg) {
  if (tg.rec.spoiled) return true;
  if (!tg.rec.def.clip) return false;
  const i = bars.indexOf(tg.rec); let p = i > 0 ? bars[i - 1] : null;
  if (p && p.def.countIn) p = i > 1 ? bars[i - 2] : null; // 이어 하기 앞 장구 너머의 메기는 마디를 본다
  // 앞 마디에 친 수는 그대로 두고 쓴 수를 이 마디에 센다. 이어 하면 이 마디가 새로 만들어져 몫이 다시 생긴다
  // 메기는 마디가 둘 이어지는 곡(풍구 · 신고산)은 두 마디에서 친 수를 함께 센다
  const spoils = !p ? 0 : (p.def.call ? callGroup(p) : [p]).reduce((n, b) => n + (b.spoils || 0), 0);
  if (spoils > (tg.rec.spoilsUsed || 0)) { tg.rec.spoilsUsed = (tg.rec.spoilsUsed || 0) + 1; return true; }
  return false;
}
function judgeHit(tg, power = 0) {
  const prac = tg.part === '연습';
  if (!prac) markBar(tg.rec); // 첫 박을 일찍 치면 마디에 들어서기 전에 판정이 난다. 그 전 값을 적어 둔다
  if (!prac && spoiledBy(tg)) { // 메기는 소리에 친 마디: 소리는 나지만 낟알은 안 나온다
    tg.res = 'spoiled'; sc.streak = 0;
    if (stageSong()) { showFeedback(song.spoilSay || '앞소리꾼 차례에 쳤어요', 1.5, true); msg.miss = true; } // 이 자리가 왜 안 맞았는지 그 자리에서 알려 준다. 가래질은 손 이름대로 「당겼어요」(곡별 검수 07 R1-02)
    yardMiss(); heatDown(); netMiss('spoiled'); boatMiss('spoiled');
    if (song.voice) followHand('miss');
    log('fail', { part: tg.part, res: 'spoiled' });
    return;
  }
  sc.streak++; sc.best = Math.max(sc.best, sc.streak);
  if (msg && msg.miss) msg = null; // 강강술래: 맞히면 앞 틀림 글을 바로 지운다(맞힌 구슬 옆에 틀린 글이 남지 않게)
  const glowBefore = song.id === 'ganggang' ? ringGlow() : 0, voicesBefore = song.id === 'ganggang' ? ganggangVoices() : 0;
  if (!prac) { sc.hits++; yardHit(); if (song.voice) { followHand('hit'); heatUp(); } }
  if (!prac && song.id === 'ganggang') {
    const f = performance.now() / 1000;
    if (ringGlow() > glowBefore) { ring.glowT = f; ring.glowFrom = glowBefore; }
    if (ganggangVoices() > voicesBefore) ring.backCheerT = f;
  }
  netHit(tg, power); boatHit(tg, power);
  missRun.n = 0; missRun.cue = null; leader.big[tg.rec.def.cue] = false;
  onHitFx(tg.res === 'perfect');
  log('success', { part: tg.part, res: tg.res, d: Math.round(tg.d * 1000) });
  if (prac) { practiceOk++; practiceTries++; showFeedback('딱 맞아요'); if (power > 0) chargedHit(power); }
  else if (finaleTarget(tg)) { wow('final'); finaleFx(); }
  else {
    // 숨을 멈추기 바로 앞 마디에는 긴 소리를 걸지 않는다
    if (power > 0 && (!tg.rec.def.hush || song.id === 'ganggang')) chargedHit(power, tg);
    if (!tg.rec.def.hush && power <= 0) {
      if (holdSong()) { if (!wolwolOn()) { if (!song.net && !boatOn() && sc.streak >= 16 && sc.streak % 16 === 0) wow('streak'); else if (sc.streak === 4 || baDone(tg)) cheer(); } } // 추임새는 모아 터뜨릴 때와 받는 소리 한 묶음을 다 맞혔을 때 나온다
      else if (sc.streak >= 16 && sc.streak % 8 === 0) wow('streak');
      else if (sc.streak === 4 || (sc.streak > 4 && (sc.streak - 4) % 6 === 0)) cheer();
    }
    if (!song.voice && sc.streak >= 2 && !tg.rec.def.hush) showFeedback(`${sc.streak}번 연속`, 1.5, true); // 실제 녹음 곡은 말풍선에 붙여 보여 준다
  }
  if (wolwolOn() && !prac) wolHit();
}
// 끝 칠 곳: 어려움 판은 끝 마디 안의 finaleBeat 한 곳
const finaleTarget = tg => !!tg.rec.def.finale && (tg.rec.def.finaleBeat === undefined || Math.abs(tg.beat - tg.rec.def.finaleBeat) < .001);
// 받는 소리 한 마디(두 곳 이상)를 이 자리로 다 맞혔다: 묶음 끝에 몸짓 · 추임새로 알려 준다(2026-11-13 검수 B07)
function baDone(tg) {
  const own = targets.filter(t => t.rec === tg.rec && typeof t.part === 'number');
  return own.length >= 2 && own.every(t => t.judged && Rules.isHit(t.res)) && own.every(t => t.beat <= tg.beat);
}
function judgeMiss(tg, released = false) {
  const prac = tg.part === '연습';
  if (!prac) { markBar(tg.rec); hushCheers(); }
  sc.streak = 0;
  if (!prac) { spoiledBy(tg); yardMiss(tg.res); if (song.voice) { followHand('miss'); heatDown(); } } // 이미 놓친 자리는 메기는 소리 몫을 또 깎지 않는다
  netMiss(tg.res); boatMiss(tg.res);
  const cue = tg.rec.def.cue;
  if (missRun.cue === cue) missRun.n++; else { missRun.cue = cue; missRun.n = 1; }
  if (missRun.n >= 2) leader.big[cue] = true;
  // 원 곡(강강술래 · 월월이): 이어 두 번 놓치면 끌려간 발밑에 먼지 6알(줄 · 마당 판 엉덩방아 먼지와 같은 수, 그래프 검수 6회차 R2-04)
  if (!prac && song.ring && missRun.n === 2 && !RM) dust(HERO.x + 4, HERO.y, 6);
  const f = performance.now() / 1000;
  fxs.band = f - fxs.band > 1 ? f : Math.max(fxs.band, f - 0.5);
  log('fail', { part: tg.part, res: tg.res, d: tg.d === null ? null : Math.round(tg.d * 1000) });
  const releaseSay = releaseTold() && released && ['early', 'late'].includes(tg.res)
    ? (tg.res === 'early' ? '일찍 뗐어요' : '늦게 뗐어요') : null;
  if (prac && tg.res === 'hand') { practiceTries++; showFeedback(sideSay(tg.side)); wantHandPad(tg.side); }
  else if (prac) { practiceTries++; showFeedback(stageSong() ? releaseSay || song.missSay?.[tg.res] || RING_MISS_SAY[tg.res]?.replace(' 쳤어요', ' 눌렀어요') || '놓쳤어요' : tg.res === 'early' ? '일찍 눌렀어요' : tg.res === 'late' ? '늦게 눌렀어요' : '놓쳤어요'); }
  else if (stageSong() || song.id === 'kwaeji') { // 같은 까닭은 이번 실수 뒤 RING_MISS_DUR초까지 늘린다
    if (tg.res === 'hand') wantHandPad(tg.side);
    const say = tg.res === 'hand' ? sideSay(tg.side) : releaseSay || song.missSay?.[tg.res] || RING_MISS_SAY[tg.res]?.replace(' 쳤어요', ' 눌렀어요') || '놓쳤어요', f = performance.now() / 1000;
    if (msg?.heldOn && f - msg.t0 <= msg.dur) {} // 월월이: 손을 떼라는 말(R2-02)이 떠 있는 동안은 「놓쳤어요」로 덮지 않는다
    else if (msg && msg.text === say && f - msg.t0 <= msg.dur) msg.dur = f - msg.t0 + RING_MISS_DUR;
    else { showFeedback(say, RING_MISS_DUR, true); msg.miss = true; } // miss: 다음 자리를 맞히면 지운다
  }
  // 끝 칠 곳을 놓치면 모은 빛 알이 떨어지고(7회차 쌓기), 터지기 대신 김빠짐(규칙 손맛-소리 12절 (4), 그래프 검수 6회차 R2-03 · R3-02). 월월이는 끝 장면이 판정과 따로 시각으로 나온다
  if (!prac && finaleTarget(tg)) buildRelease(false);
  if (!prac && !wolwolOn() && finaleTarget(tg)) { finaleFizzle(); if (ctx && tg.res !== 'early') whoosh(ctx.currentTime + 0.05, 0.5); log('fizzle', { res: tg.res }); }
}
function showFeedback(text, dur = 0.9, side = false) {
  if (learning?.step === 2 && !learning.intro && learning.mode === 'wait' && text !== '따라 하기') return;
  msg = { text, t0: performance.now() / 1000, dur, side };
}
const nowBeat = () => { const r = currentRec(heardNow()); return r ? r.beat : BEAT; };
function cheer() {
  sc.cheers++;
  cheerFx(cheerIdx++);
  cheerSound(ctx.currentTime + 0.05, nowBeat());
  log('cheer', { streak: sc.streak });
}
function chargedHit(power, tg) {
  sc.charged++; sc.cheers++;
  chargedFx(power, cheerIdx++);
  if (wolwolOn()) wolThrow(power); // 월월이: 꾹 동안 모은 불티를 달집에 던진다(곡별 검수 05 재미 F01)
  const moonLast = song.id === 'ganggang' && tg?.rec.def.hush;
  if (moonLast) { ring.moonBurstT = performance.now() / 1000; accent('full', ctx.currentTime); }
  else cheerSound(ctx.currentTime + 0.05, nowBeat());
  if (power >= 1) accent('burst', ctx.currentTime + 0.02);
  log('charged', { power: Math.round(power * 100) / 100 });
}
function wow(part) {
  const quiet = song.net && part === 'net-person' || boatOn() && part === 'boat-flag' || wolwolOn() && part === 'wol-fire' || part === 'yard-guest';
  sc.wows++; if (!quiet) sc.cheers++;
  if (wolwolOn() && part === 'wol-fire') { const f = performance.now() / 1000; setShake(2, .4); holdStop(f, .14); hero.jumpT = f; hero.spinT = f; }
  else wowFx(!!quiet);
  bigCheerSound(ctx.currentTime + 0.05, nowBeat());
  log('wow', { part });
}

// ───────── 갱신 ─────────
const botPlanned = new Set(), botCharged = new Set();
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
let lastNpcCheck = 0;
function update() {
  if (!paused && state === 'calib' && calib && ctx.currentTime >= calib.endAt) { stopCalib(); return; }
  if (paused || !ctx || (state !== 'practice' && state !== 'song')) return;
  const vt = heardNow();
  if (learning?.intro || learning?.mode === 'wait') { updateLearning(vt); return; }
  while (queue.length && nextT - ctx.currentTime < 0.5) {
    const q = queue.shift();
    scheduleBar(q.def, nextT, q.opts);
    nextT += barSpan(q.def);
  }
  // 연습 첫 번: 받는 자리에서 멈춰 기다린다(틀릴 수 없음)
  if (waitRec && !waiting && vt >= waitRec.t0 + (song.voice ? 0 : 2 * BEAT) - 0.02) {
    waiting = true; msg = { text: '지금 화면을 눌러요', t0: performance.now() / 1000, dur: 999, finger: true };
    if (BOT !== null) setTimeout(() => onTap(heardNow()), 700);
  }
  for (const tg of targets) {
    if (!tg.judged && vt - OFFSET - tg.t > tg.len * 0.45) {
      tg.judged = true; tg.res = 'none';
      if (song.ring) { const fNow = performance.now() / 1000; hero.startleT = fNow; ringDrag(fNow); } // 원에서는 디디지 않으면 앞사람에게 끌려간다
      else hero.dropT = performance.now() / 1000;
      judgeMiss(tg);
    }
  }
  for (const b of bars) for (const t of (b.npcStrikes || [])) if (t > lastNpcCheck && t <= vt) npcHitFx();
  lastNpcCheck = vt;
  // 연습 다음 마디: 세 번 맞히거나 여섯 번 해 보면 노래로 간다
  if (!learning && state === 'practice' && !waitRec && !queue.length && nextT !== Infinity && nextT - ctx.currentTime < 0.6 && !targets.some(t => !t.judged)) {
    // 노래 전에 꾹 눌렀다 떼기를 한 번 해 본다. 강강술래는 한 번도 못 터뜨렸으면 같은 두 마디를 한 번 더(두 번까지). 그 뒤에는 첫 메기는 마디의 손가락이 이어서 알려 준다
    if ((practiceOk >= 3 || practiceTries >= 6) && song.practiceCall && holdSong() && (!practiceHold || (stageSong() && practiceHold === 1 && !sc.charged))) {
      practiceHold = (practiceHold || 0) + 1;
      if (song.practiceRest) queue.push({ def: song.practiceRest, opts: {} });
      queue.push({ def: song.practiceCall, opts: {} }, { def: song.practiceBar, opts: {} });
      if (!song.practiceRest) msgTop = { text: song.practiceCall.holdHint, t0: performance.now() / 1000, dur: BEAT * 2.7 };
    } else if (practiceOk >= 3 || practiceTries >= 6) {
      msgTop = { text: '이제 노래 시작', t0: performance.now() / 1000, dur: 2 };
      log('stage', { name: 'practice_end', ok: practiceOk, tries: practiceTries });
      startSong(true);
    } else queue.push({ def: song.practiceBar, opts: song.voice ? {} : { noDrum: true } });
  }
  const rec = currentRec(vt);
  if (wolwolOn()) wolUpdate(rec, vt);
  // 연습도 쉼을 지난 메기는 마디 시작에만 안내한다
  if (!learning && state === 'practice' && song.practiceRest && rec && rec.def.call && !rec.hintDone) { rec.hintDone = true; msgTop = { text: rec.def.holdHint, t0: performance.now() / 1000, dur: rec.beat * 2.7 }; }
  stepCharge(vt, rec);
  if (learning) updateLearning(vt);
  if (state === 'song') {
    updateSongHelp(vt - OFFSET);
    if (activeSongHelp() && msg?.finger) msg = null;
  }
  if (state === 'song' && rec) {
    markBar(rec);
    const p = rec.def.part;
    if (!wolwolOn() && typeof partOfLastBar === 'number' && p !== partOfLastBar && partOfLastBar >= 1 && partOfLastBar <= 5 && !rec.def.finale) {
      const ts = targets.filter(t => t.part === partOfLastBar);
      if (ts.length && ts.filter(t => Rules.isHit(t.res)).length / ts.length >= 0.8) wow(partOfLastBar);
    }
    partOfLastBar = p;
    if (rec.def.gag && yard.gagRec !== rec) { yard.gagRec = rec; quailGag(rec.def.gag, rec); }
    if (rec.def.scene) gagSound(rec, (vt - rec.t0) / rec.beat);
    const repeat = song.sameWordHold, repeatCall = CALL_MODE === 'hold' && repeat && rec.def.call && rec.def.i === songBars.findIndex(b => b.call && b.clip === repeat.clip);
    const hint = (repeatCall && song.practiceCall.holdHint) || (CALL_MODE === 'hold' && rec.def.holdHint) || (CALL_MODE === 'eolssu' && rec.def.eolHint) || rec.def.hint;
    // 강강술래: 빨라진다는 안내는 새 빠르기의 첫 「강」 1.2초 전부터(앞 마디 마지막 「래」를 0.15초 지난 뒤에) 띄워 그 박 1초 뒤까지 둔다. 그 마디에 들어서서는 다시 띄우지 않는다
    const nxHint = song.ring && songBars[rec.def.i + 1], left = barEnd(rec) - vt, st = rec.def.strikes;
    const roundHint = song.roundHint;
    if (nxHint && nxHint.hint && !nxHint.call && !rec.hintAhead && left < 1.2 && (!st.length || vt > rec.t0 + st[st.length - 1] * rec.beat + 0.15)) { rec.hintAhead = true; msgTop = { text: nxHint.hint, t0: performance.now() / 1000, dur: left + 1, ba: true }; } // ba: 받는 말풍선 옆에 붙인다
    // 꾹 누르라는 안내는 뗄 때 안내가 나오기 전에 걷는다
    // 꾹 안내는 메김이 끝나면 걷는다: 자진뱃노래 짧은 메김(큰박 2번)에서 받음 첫 박까지 「꾹 눌러요」가 남았다(곡별 검수 06 R1-01). 메김이 큰박 2.7번보다 짧은 곡은 지금 자진뱃노래뿐
    if (hint && !rec.hintDone) { rec.hintDone = true; const prev = song.ring && bars[bars.indexOf(rec) - 1]; if (!(prev && prev.hintAhead && hint === rec.def.hint)) msgTop = { text: hint, t0: performance.now() / 1000, dur: repeatCall ? repeat.seconds : CALL_MODE === 'hold' && rec.def.holdHint ? Math.min((stageSong() ? rec.beat : BEAT) * 2.7, Math.max(0, callSpan(rec).end - vt)) : Math.min(BAR * 2, 6) }; }
    if (roundHint && nxHint && nxHint.i === songBars.findIndex(b => b.part === roundHint.part && b.clip && !b.call) && !rec.hintAhead && left < roundHint.before) {
      rec.hintAhead = true; msgTop = { text: song.roundTips[1], t0: performance.now() / 1000, dur: left + roundHint.after };
    }
  }
  if (BOT !== null) {
    for (const tg of targets) {
      if (tg.judged || botPlanned.has(tg) || tg.t - vt > 0.8) continue;
      botPlanned.add(tg);
      if (Math.random() < BOT_SKIP) continue;
      const when = tg.t + gauss() * BOT / 1000 + BOT_BIAS;
      // 월월이 001 · 003 첫 「월」은 소리가 터지는 때(마디 머리 + 0.09박)로 늦췄다(곡별 검수 05 R1-04). 봇은 그 마디 첫 칠 곳에서 뗀다
      const release = !!charge && tg.beat === tg.rec.def.strikes[0]; // 첫 칠 곳이 마디 머리가 아닌 곡(자진아리 · 신고산 0.08박)도 그 자리에서 뗀다(R3-05)
      const side = tg.side && Math.random() < BOT_WRONG ? (tg.side === 'L' ? 'R' : 'L') : tg.side; // ?wrong=0.1 열에 하나 반대 손
      setTimeout(() => { pressSide = side; if (release) releaseCharge(when); else onTap(when); }, Math.max(0, (when - heardNow()) * 1000));
    }
    if (holdSong() && BOT_HOLD && rec && rec.def.call && !charge && !botCharged.has(rec) && (vt - rec.t0) / rec.beat >= (learning ? .12 : 1.5)) { botCharged.add(rec); startCharge(vt); }
  }
  const last = bars[bars.length - 1];
  // 팔도 잔치: 끝 한 방이 없는 마을은 마지막 마디 소리가 끝나면 다음 마을로
  if (feastRun && !feastRun.gap && state === 'song' && !queue.length && last && !last.def.outro && vt > barEnd(last) + 0.35) { feastNext(); return; }
  // 끝 한 방이 마지막 칠 곳 뒤 2초는 보이게 한다(운재는 녹음 끝이 칠 곳 바로 뒤라 1.5초 사진에 이미 끝 화면이 덮였다. 그래프 검수 5회차 R5-01). 노래는 그대로 끝까지
  if (state === 'song' && !queue.length && last && last.def.outro && vt > Math.max((last.def.endAt === undefined ? barEnd(last) : last.t0 + last.def.endAt) + 0.6, OFFSET + targets.reduce((m, t) => Math.max(m, t.t), 0) + 2)) finish();
}
// 모으는 동안: 다 모으면 꽹과리 한 번, 처음 해 보는 아이에게 손가락과 뗄 때를 보여 준다. 떼지 않고 지나가면 그냥 놓친 것이다
function stepCharge(vt, rec) {
  if (!chargeOn()) return;
  const f = performance.now() / 1000;
  if (charge) {
    // 받는 마디 끝이나 쉼에서 잡은 손은 다음 메기는 마디로 이어 간다
    // 메기는 마디가 둘 이어지는 곡(풍구 · 신고산)은 둘째 메김 끝까지 쥐고 있어도 된다
    if (rec && charge.rec && rec !== charge.rec && (!charge.rec.def.call || rec.def.call) && (rec.def.rest || rec.def.call)) {
      // 받는 마디 끝에서 미리 쥔 손도 이 메김을 누른 것으로 적는다. 두 메김 줄은 한 번 꾹으로 센다
      if (rec.def.call && !charge.pending && rec.holdPress === undefined) rec.holdPress = charge.rec.def.call ? charge.rec.holdPress : rec.t0;
      charge.rec = rec;
      if (charge.pending && rec.def.call) { charge.pending = false; charge.t0 = rec.t0; rec.holdPress = rec.t0; log('charge', { i: rec.def.i }); accent('charge', ctx.currentTime); }
    }
    if (charge.pending) return;
    if (!charge.full && vt - charge.t0 >= chargeFullFor(charge.rec)) { charge.full = true; chargeFullFx(); accent('full', ctx.currentTime); }
    const r = charge.rec;
    if (r) { // 받는 마디 끝에 눌렀으면 다음 메기는 마디 끝까지 쥐고 있어도 된다. 마디 길이가 달라도 실제 길이로 잰다
      const nx = !r.def.call && !r.def.countIn && songBars[r.def.i + 1];
      if (!r.def.rest && vt - (r.def.call ? barEnd(r) : barEnd(r) + (nx ? barSpan(nx) : 4 * r.beat)) > r.beat * 0.45) {
        charge = null;
        // 월월이: 받는 소리가 와도 손을 안 떼면 꾹이 말없이 끝나 「놓쳤어요」만 네 번 떴다. 판에 한 번 뗄 때를 알린다(일찍 뗐을 때와 같은 자리 · 1.8초, 곡별 검수 05 R2-02)
        if (wolwolOn() && state === 'song' && !learning && r.def.call && !heldOnTold) { heldOnTold = true; showFeedback(releaseHint(vt), 1.8, true); msg.miss = true; msg.heldOn = true; }
      }
    }
  }
  if (learning || sc.charged || !rec || !rec.def.call) return;
  const b = (vt - rec.t0) / rec.beat;
  if (!charge && b >= 0 && b < 3) { if (!msg) msg = { text: '', t0: f, dur: 999, finger: true }; }
  else if (msg && msg.finger) msg = null;
  if (charge && b >= 2.75 && !rec.releaseHint) { rec.releaseHint = true; showFeedback(releaseHint(vt), stageSong() ? (barBeats(rec.def) - b) * rec.beat + 0.25 : 1.5, true); }
}
function finish() {
  if (feastRun) { feastFinish(); return; }
  state = 'end';
  const list = targets.filter(t => typeof t.part === 'number');
  const res = Rules.summarize(list);
  const stamp = Rules.stampFor(res.ratio);
  const before = save.stamps[song.id] || 0;
  const perfect = res.n > 0 && res.hits === res.n;
  const topInput = { ...res, charged: sc.charged, holdNeed: Rules.topHoldFor(songBars) };
  const top = !hardRun && !!song.topStamp && Rules.isTop(topInput);
  const hardOk = hardRun && stamp === 3;
  save = hardRun ? Rules.recordHard(save, song.id, hardOk) : Rules.recordSong(save, song.id, stamp, perfect, top);
  lastStamp = stamp;
  const saved = window.GF.save(save);
  window.GF.stamp('first');
  lastSummary = { song: song.id, ...res, stamp, top, hard: hardRun, hardOk, best: sc.best, cheers: sc.cheers, wows: sc.wows, extra: sc.extra, charged: sc.charged, eolssu: sc.eolssu, practiceOk, practiceTries,
    firstTapMs: timing.firstTap === null ? null : Math.round(timing.firstTap), firstHitMs: timing.firstHit === null ? null : Math.round(timing.firstHit) };
  log('end', lastSummary);
  const off = list.filter(t => t.d !== null).map(t => t.d);
  const needHits = Math.ceil(res.n * 0.8);
  const mistake = Rules.mainMistake(releaseTold()
    ? [...list,...bars.flatMap(r=>r.releaseMistakes||[])] : list,releaseTold(),sc.stray);
  Screens.showEnd(song, res, stamp, list.map(t => (!Rules.isHit(t.res) ? 0 : t.res === 'perfect' ? 2 : 1)), {
    say: song.say ? (hardOk ? song.say.hard : top ? song.say.top : song.say[Rules.sayKey(res, stamp)]) : '',
    perfect: perfect && !hardRun, top, hardOk, hardRun,
    hardOpen: !hardRun && !!song.hardBars && Rules.hardOpen(save, song.id),
    tip: saved === false ? '이 기기에는 기록이 남지 않아요' : (song.roundTips && mistake === 'none' ? song.roundTips[list.some(t => t.part >= 2 && t.res === 'none') ? 1 : 0] : (song.tips && song.tips[mistake]) || window.MINYO.TIPS[mistake] || ''),
    next: hardRun ? (hardOk ? '' : `${song.hardStamp}까지 ${needHits - res.hits}곳 더`) : top ? '' : perfect && song.topStamp ? `${song.topStamp}까지 ${[Rules.topNeed(res) && `딱 맞음 ${Rules.topNeed(res)}번`, Rules.topHoldNeed(topInput) && `꾹 눌렀다 떼기 ${Rules.topHoldNeed(topInput)}번`].filter(Boolean).join(', ')} 더` : perfect ? '' : stamp === 3 ? `${song.fullStamp || '풍년'}까지 ${res.n - res.hits}곳 더` : `${(song.stamps || Rules.STAMPS)[stamp + 1]}까지 ${Rules.hitsFor(res.n, stamp + 1) - res.hits}곳 더`,
    up: hardRun ? '' : song.hardBars && stamp >= Rules.HARD_AT && before < Rules.HARD_AT ? '어려움 판이 열렸어요' : stamp > before && before > 0 ? '도장이 한 칸 올랐어요' : '',
    calib: Rules.calibAdvice(res, off), // 늦거나 일찍 쏠린 손에 박 맞추기를 권한다(R3-08 · 그래프 검수 4회차 R3-03)
    saveFail: saved === false,
    onSong: !hardRun && stamp >= 1 ? nextOpenSong(song) : null,
  });
}

// ───────── 멈춤: 이어 하면 그 마디 처음으로 돌아가 장구 한 마디를 들려준 뒤 이어진다 ─────────
const playing = () => state === 'practice' || state === 'song' || state === 'calib';
function pauseGame() {
  if (paused || !playing()) return;
  if (state === 'calib') { paused = true; ctx.suspend(); log('stage', { name: 'pause', calib: true }); return; }
  if (feastRun?.gap) { paused = true; charge = null; log('stage', { name: 'pause', gap: true }); if (ctx) ctx.suspend(); return; } // 마을 사이: 다음 마을은 이어 하기 뒤에 시작
  paused = true; charge = null;
  const rec = currentRec(heardNow());
  if (state === 'song' && rec) markBar(rec);
  pausedIdx = pauseIndex(rec);
  log('stage', { name: 'pause', i: pausedIdx });
  if (ctx) ctx.suspend();
}
// 이어 하면 돌아갈 마디 번호: 쉼 마디면 다음 마디, 월월이 끝 쉼은 그 마디
function pauseIndex(rec) {
  if (!rec) return 0;
  return wolwolOn() && rec.def.rest && rec.def.outro ? rec.def.i : Math.max(0, rec.def.i + (rec.def.rest ? 1 : 0));
}
// 이어 하면 그 마디 처음으로 돌아간다: 마디가 시작할 때의 점수와 마당을 적어 둔다
function markBar(rec) { if (!rec.start) rec.start = { sc: { ...sc }, yard: yardSnapshot(), net: netSnapshot(), boat: boatSnapshot() }; }
function resumeGame() {
  if (!paused) return;
  paused = false;
  if (state === 'calib') { ctx.resume(); log('stage', { name: 'resume', calib: true }); return; }
  if (feastRun?.gap) { log('stage', { name: 'resume', gap: true }); ctx.resume().then(feastGo); return; }
  log('stage', { name: 'resume', i: pausedIdx });
  ctx.resume().then(() => {
    if (state === 'practice') {
      if (learning) { if (!learning.intro && learning.mode !== 'wait') learnCycle(); }
      else if (story && story.scene === 3.5) { storyHintOff(); story.scene = 3.6; startLearning(); } // 이야기 첫 메김 중 멈췄으면 처음 배우기부터
      else startPractice();
      return;
    }
    killSound(); continuousVoice = null;
    const from = bars.find(b => b.def.i === pausedIdx) || bars.find(b => b.def.rest && b.def.i + 1 === pausedIdx);
    if (from && from.start) { Object.assign(sc, from.start.sc); yardRestore(from.start.yard); netRestore(from.start.net); boatRestore(from.start.boat); }
    if (wolwolOn()) { ring.finalT = -9; ring.fireT = -9; }
    targets = targets.filter(t => t.i < pausedIdx);
    bars = bars.filter(b => b.def.i < pausedIdx);
    fxs.heapShown = Math.min(fxs.heapShown, heapStage());
    botPlanned.clear();
    const t = ctx.currentTime + 0.25;
    queue = songBars.filter(d => d.i >= pausedIdx).map(def => ({ def, opts: {} }));
    // 장구가 없는 곡은 나무 소리 네 번으로 들어간다. 느린 대목이라도 앞 박자는 빠르게
    const first = queue[0] && queue[0].def, free = !!song.drum && !song.drum.length, beat = free ? Math.min(barBeat(first), 0.6) : barBeat(first);
    // 앞 장구 동안을 빈 마디로 둔다. 치거나 꾹 눌러도 지난 마디에 들어가지 않고, 또 멈추면 같은 마디로 돌아온다
    bars.push({ t0: t - 1, beat, opts: {}, start: { sc: { ...sc }, yard: yardSnapshot() }, def: { i: pausedIdx, countIn: true, demo: true, part: first && first.part, me: '', meN: [], baN: [], strikes: [], cue: null } });
    if (free) [0, 1, 2, 3].forEach(k => woodClick(t + k * beat)); else drumBar(t, 0.85, beat);
    nextT = t + beat * 4;
  });
}
window.GF.on('pause', pauseGame);
// 세로 화면은 막는다(DECISIONS 2026-11-19 밤). 놀이 중에 세로가 되면 멈추고, 가로로 돌아오면 그 마디부터 잇는다.
// 세로인 동안 사이트 멈춤 창의 「계속하기」를 눌러도 가로가 될 때까지 기다린다.
const portraitView = matchMedia('(orientation: portrait)');
let turnHeld = false;
function resumeUnlessPortrait() { if (portraitView.matches) { turnHeld = paused; return; } resumeGame(); }
function paintTurn() {
  const cover = document.getElementById('turnCover'); if (!cover) return;
  if (portraitView.matches) {
    if (!cover.open) cover.showModal();
    if (!paused && playing()) { pauseGame(); turnHeld = paused; }
  } else if (cover.open) {
    cover.close();
    if (turnHeld) { turnHeld = false; resumeGame(); }
  }
}
{
  const cover = document.getElementById('turnCover'), rotate = document.getElementById('turnRotate');
  const orient = window.GF.inFrame ? window.parent.GFOrient : null;
  cover?.addEventListener('cancel', e => e.preventDefault()); // Esc로 덮개를 닫지 않는다
  if (rotate && orient?.canRotate()) { rotate.hidden = false; rotate.addEventListener('click', () => orient.lockLandscape()); }
  portraitView.addEventListener('change', paintTurn); paintTurn();
}
window.GF.on('resume', resumeUnlessPortrait);
window.GF.on('home', () => { paused = false; if (ctx?.state === 'suspended') ctx.resume(); toMap(); });
addEventListener('resize', () => { if (paused) draw(); }); // 크기를 바꾸면 캔버스가 비니 멈춘 동안에도 한 번 다시 그린다
window.GF.on('sound', ({ on }) => setMuted(!on));
// 사이트 밖에서 바로 열었을 때만 스스로 멈춘다(사이트 안에서는 사이트가 멈춤 창을 연다)
if (!window.GF.inFrame) document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else resumeUnlessPortrait(); });

// ───────── 입력 ─────────
const cvEl = document.getElementById('cv');
cvEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!playing()) return;
  try { cvEl.setPointerCapture(e.pointerId); } catch (err) {} // 손가락이 판 밖으로 나가도 떼는 때를 받는다
  if (song?.twoHand) { const r = cvEl.getBoundingClientRect(); pressSide = e.clientX < r.left + r.width / 2 ? 'L' : 'R'; }
  if (song?.twoHand) flashHandPad(pressSide);
  pressAt(heardAtEvent(e), e.pointerId);
});
addEventListener('pointerup', e => { if (charge && charge.pid === e.pointerId) releaseCharge(heardAtEvent(e)); });
addEventListener('pointercancel', e => { if (charge && charge.pid === e.pointerId) { if (charge.rec) charge.rec.holdBroken = true; charge = null; } });
const heldKeys = new Set(), blockedButtonKeys = new Set();
addEventListener('keydown', e => {
  if (e.code === 'Escape' && window.GF.inFrame && playing()) {
    e.preventDefault(); if (!e.repeat) window.GF.menu(); return;
  }
  // 두 손 곡: ← · F는 왼손, → · J는 오른손
  const keySide = song?.twoHand ? ({ ArrowLeft: 'L', KeyF: 'L', ArrowRight: 'R', KeyJ: 'R' })[e.code] : null;
  if (keySide) { if (e.repeat || !playing() || e.target.closest('input,select,textarea')) return; e.preventDefault(); pressSide = keySide; flashHandPad(keySide); pressAt(heardAtEvent(e)); return; }
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  const held = heldKeys.has(e.code); heldKeys.add(e.code);
  // 되풀이 누름과 창이 열릴 때 이미 누르고 있던 키는 단추도 누르지 않는다.
  if (e.repeat || held) { e.preventDefault(); blockedButtonKeys.add(e.code); return; }
  if (e.target.closest('button,a,input,select,textarea,[role=button]')) return;
  if (!playing()) return;
  if (song?.twoHand) { e.preventDefault(); return; } // 두 손 곡은 손을 정하는 키(← · F / → · J)만 받는다
  e.preventDefault(); if (!e.repeat) pressAt(heardAtEvent(e));
});
addEventListener('keyup', e => {
  heldKeys.delete(e.code);
  if (blockedButtonKeys.delete(e.code)) { e.preventDefault(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && charge) releaseCharge(heardAtEvent(e));
});
addEventListener('blur', () => { heldKeys.clear(); blockedButtonKeys.clear(); });
['contextmenu', 'dblclick', 'gesturestart'].forEach(ev => addEventListener(ev, e => e.preventDefault(), { passive: false }));

// ───────── 돌리기 ─────────
let lastF = performance.now();
// 사이트 틀의 모서리 단추: 놀이 중에는 「멈춤」, 지도 · 시작 창 · 끝 화면에서는 「나가기」
let hostShown = null;
function syncHost() {
  const s = playing() ? 'play' : 'title';
  if (s === hostShown || !window.GF.inFrame) return;
  hostShown = s;
  try { window.parent.document.body.dataset.uiState = s; } catch (e) { /* 틀을 못 만지면 그대로 둔다 */ }
}
function frame(frameAt) {
  const now = performance.now(), dt = Math.min(0.05, (now - lastF) / 1000); lastF = now;
  requestAnimationFrame(frame);
  syncHost(); paintHandPads();
  if (state === 'map') return;
  if (paused || feastRun?.gap) return; // 잔치 마을 사이에는 찍어 둔 화면이 덮고 있다
  update();
  if (!learning?.intro && now / 1000 >= fxs.stopUntil) stepFx(dt);
  sceneFrameAt = frameAt / 1000;
  draw();
  drawLearning();
  drawHoldCue();
  sceneFrameAt = null;
  if (story) storyUpdate(); // 첫머리 이야기(story.js): 장면 차례 · 말풍선
  if (finale) finaleUpdate(); // 끝 장면 소리 지도(finale.js)
}

// ───────── 화면 잇기 ─────────
// 끝 화면 「다음 곡」: 지도 차례로 이 고장 다음부터 돌며, 도장이 하나도 없는 고장의 첫 곡. 다 받았으면 아직 도장 없는 곡
function nextOpenSong(from) {
  const order = Rules.REGION_ORDER, open = window.MINYO.SONGS.filter(s => s.bars && !s.hidden && !s.later && (!window.MinyoLocking() || Rules.songOpen(save, s, window.MINYO.SONGS)));
  // 첫머리 이야기 ④에서 거문도 뱃사람이 도움을 청하니, 멸치 다음은 거문도 도장이 없을 때 거문도(그래프 검수 2회차 R1-01)
  if (from.id === 'myeolchi' && !save.stamps.geomun) { const g = open.find(s => s.id === 'geomun'); if (g) return g; }
  const at = Math.max(0, order.indexOf(from.region)), turn = order.slice(at + 1).concat(order.slice(0, at + 1));
  for (const region of turn) { const list = open.filter(s => s.region === region); if (list.length && !list.some(s => save.stamps[s.id])) return list[0]; }
  return open.find(s => s.id !== from.id && !save.stamps[s.id]) || null;
}
// 게임을 열 때마다 반투명 덮개 「소리를 켜 주세요」(2026-11-27 대표). 「시작」 · 아무 곳이나 누르면 소리를 켜고 닫는다. 시험 자동 손은 ?cover=1일 때만
const soundCoverDue = () => BOT === null && (!navigator.webdriver || Q.get('cover') === '1');
function soundCover() {
  const d = document.createElement('div'); d.id = 'soundCover'; d.dataset.test = 'sound-cover';
  d.innerHTML = '<svg width="112" height="98" viewBox="0 0 120 104" fill="none" stroke="#fff7e8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 38h20l28-24v76L34 66H14z" fill="#fff7e8"/><path d="M78 34c8 9 8 27 0 36"/><path d="M92 22c15 16 15 44 0 60"/></svg><h1>소리를 켜 주세요</h1><p>노래를 듣고 박자에 맞춰 치는 게임이에요</p><button type="button" class="btnRed" data-test="sound-go">시작</button>';
  document.body.append(d);
  const close = () => { initAudio(); setMuted(!window.GF.sound); if (ctx.state !== 'running') ctx.resume(); d.remove(); log('stage', { name: 'sound-cover' }); };
  d.addEventListener('click', close, { once: true });
  d.querySelector('button').focus();
}
function toMap() {
  if (story) { story = null; storyLayer.hidden = true; storyClearSays(); }
  window.MinyoCuts.clear();
  if (finale) { for (const id of finale.timers) clearTimeout(id); finale = null; finaleLayer.hidden = true; finaleClearSays(); finaleBoardClear(); Screens.finale.end(); } // 끝 장면 중 집 단추: 저장 없이 걷는다. 지도 쪽 끝 장면 상태도 비워야 창 크기가 바뀔 때 되살아나지 않는다
  feastClear(); window.MinyoIntro.hide(); window.MinyoSongbook.hide();
  calib = null;
  beginTry++; Screens.startBusy(false);
  paused = false;
  if (ctx) { killSound(); if (ctx.state === 'suspended') ctx.resume(); }
  resetRun(); resetView(); clearSongScene();
  state = 'map';
  Screens.showMap(save, song ? song.region : null);
  log('stage', { name: 'map' });
}
// 곡 소개를 새 판으로 띄울 때마다 곡별로 세어 저장한다. 곡 소개의 낯선 말이 그 수만큼 돌아간다(판 21)
function introNext(s) {
  const turn = save.introN[s.id] || 0;
  save = { ...save, introN: { ...save.introN, [s.id]: turn + 1 } };
  window.GF.save(save);
  window.MinyoIntro.open(s, { turn });
}
// 곡 소개 족자는 지도에서 고를 때 · 「다음 곡」일 때만. 자동 손(?bot=)은 바로 시작한다
// 처음 고른 곡도 곡 소개 한 장만 띄운다. 노래 알기 네 장은 곡 소개 · 끝 화면의 「노래 알기」 단추로 연다(2026-11-27 대표 「한장짜리 설명만 내놓고 바로 하게」)
function introFor(s) {
  if (BOT !== null) return;
  introNext(s);
}
window.MinyoSongbook.configure({
  map: toMap,
  seen(id) {
    if (save.songbookSeen[id]) return;
    save = { ...save, songbookSeen: { ...save.songbookSeen, [id]: true } };
    window.GF.save(save);
  },
});
function toStart(s) { pickHard = false; hardRun = false; setSong(s); state = 'start'; resetRun(); Screens.showStart(s, !!save.practiced[s.id], !!s.hardBars && Rules.hardOpen(save, s.id)); Screens.setMode(false); if (feastRun) Screens.showFeastStart(FEAST, s); log('stage', { name: 'start_screen', song: feastRun ? FEAST.id : s.id }); if (BOT !== null) setTimeout(() => document.getElementById('startGo').click(), 200); }
Screens.init({
  onSong: s => { if (s.id === STORY_SONG && storyFirst()) { storyStart(true); return; } feastClear(); toStart(s); introFor(s); },
  storyFirst: () => storyFirst(),
  onStoryFirst: () => storyStart(true),
  onFeast: toFeast,
  onStory: kind => storyAgain(kind), // 지도에서 이야기 다시 보기(finale.js)
  onBead: (i, hit) => { if (ctx) beadTick(i, hit); },
  onSeal: stamp => { endFx(stamp); if (ctx) sealSound(stamp); },
});
// 박 맞추기: 장구에 맞춰 8번 눌러 기기의 소리 늦음을 재서 판정에 더한다
function startCalib() {
  initAudio(); setMuted(!window.GF.sound);
  killSound();
  state = 'calib';
  const t0 = ctx.currentTime + 0.7, CB = Math.min(BEAT, 0.625);
  calib = { taps: [], seen: new Set(), t0, n: 8, beat: CB, endAt: t0 + 24 * CB + .3 };
  for (const key of heldKeys) blockedButtonKeys.add(key);
  for (let i = 0; i < 24; i++) janggu(t0 + i * CB, i % 4 === 0 ? '덩' : '덕', 0.9, true);
  Screens.showCalib(0, calib.n);
  log('stage', { name: 'calib' });
  if (BOT !== null) for (let i = 2; i < 10; i++) setTimeout(() => onTap(t0 + i * CB + gauss() * BOT / 1000 + BOT_BIAS), Math.max(0, (t0 + i * CB + BOT_BIAS - ctx.currentTime) * 1000));
}
function calibTap(tHeard) {
  const c = calib, i = Math.round((tHeard - c.t0) / c.beat);
  if (i < 0 || c.seen.has(i)) return;
  c.seen.add(i);
  c.taps.push(tHeard - (c.t0 + i * c.beat));
  Screens.showCalib(c.taps.length, c.n);
  if (c.taps.length < c.n) return;
  const sorted = c.taps.slice().sort((a, b) => a - b), mid = (sorted[3] + sorted[4]) / 2;
  OFFSET = Math.max(-0.5, Math.min(0.5, mid));
  save = { ...save, offsetMs: Math.round(OFFSET * 1000) };
  const saved = window.GF.save(save);
  log('calib', { offsetMs: save.offsetMs });
  stopCalib();
  if (saved === false) Screens.startNote('이 기기에는 소리 맞춘 값이 남지 않아요');
}
function stopCalib() {
  if (!calib) return;
  calib = null;
  killSound();
  toStart(song);
}
document.getElementById('startGo').addEventListener('click', () => { if (feastRun) { begin(false, false); return; } setHard(FORCE_HARD || pickHard); begin(!save.practiced[song.id] && !hardRun, !save.learned && !hardRun); });
for (const [id, on] of [['modeEasy', false], ['modeHard', true]]) document.getElementById(id).addEventListener('click', () => { pickHard = on; setHard(on); Screens.setMode(on); });
document.getElementById('endHard').addEventListener('click', () => { setHard(true); begin(false); });
document.getElementById('startPractice').addEventListener('click', () => { pickHard = false; setHard(false); begin(true, true); });
document.getElementById('startBack').addEventListener('click', toMap);
document.getElementById('endAgain').addEventListener('click', () => { if (feastRun) feastRestart(); begin(false); });
// 멸치 끝 화면에서 처음 나갈 때는 첫머리 이야기 ④ 다른 고장 소문 → ⑤ 지도(「다시 하기」는 나중으로 미룬다)
document.getElementById('endMap').addEventListener('click', () => { if (!feastRun && rumorDue()) storyRumor(); else if (finaleDue()) finaleStart(); else toMap(); });
// 끝 화면 「노래 알기」: 그 곡 시작 창으로 가서 노래 알기 1장을 연다. 닫으면 곡 소개로 돌아간다(새 판이라 낯선 말은 다음 낱말)
document.getElementById('endBook').addEventListener('click', () => { feastClear(); toStart(song); window.MinyoSongbook.open(song, { review: true, back: introNext }); });
document.getElementById('endOn').addEventListener('click', () => { if (!feastRun && rumorDue()) { storyRumor(); return; } if (finaleDue()) { finaleStart(); return; } const s = nextOpenSong(song); if (s) { feastClear(); toStart(s); introFor(s); } });
const calibEl = document.getElementById('calibScreen');
calibEl.addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'calib') onTap(heardAtEvent(e)); });
const calibBack = document.getElementById('calibBack');
document.getElementById('calibTap').addEventListener('click', e => { if (e.detail === 0 && state === 'calib') onTap(heardAtEvent(e)); });
calibBack.addEventListener('pointerdown', e => e.stopPropagation());
calibBack.addEventListener('click', stopCalib);
document.getElementById('startCalib').addEventListener('click', startCalib);
document.getElementById('endCalib').addEventListener('click', startCalib);

window.__GAME = {
  pauseForTest: pauseGame, resumeForTest: resumeGame,
  state: () => state,
  learn: () => learning && ({ step: learning.step, intro: learning.intro, mode: learning.mode, index: learning.index, progress: { ...learning.progress }, extra: learning.extra, history: learning.history, cycle: learning.cycle, hand: learning.hand, geometry: learning.geometry }),
  learnReport: () => lastLearning,
  hardRun: () => hardRun,
  paused: () => paused,
  song: () => song && song.id,
  feast: () => feastRun && { i: feastRun.i, gap: feastRun.gap, results: feastRun.results.length, part: FEAST.parts[feastRun.i]?.id },
  events,
  summary: () => lastSummary,
  offsetMs: () => Math.round(OFFSET * 1000),
  hits: () => sc.hits,
  startCalibForTest: startCalib,
  finishForTest: finish,
  view: () => ({ K, VW, VH, camX, camY, DPR }),
  yard: () => ({ quail: yard.quail && yard.quail.mode, eggs: yard.eggs.length, extra: yard.extraT.filter(t => t !== null).length, kids: yard.kidT.filter(t => t !== null).length }),
  targets: () => targets.map(t => ({ t: t.t, i: t.i, res: t.res, part: t.part })),
  charging: () => !!charge,
  charged: () => sc.charged,
  heat: () => heatLevel(),
  net: () => ({ on: netOn(), haul: net.haul, people: net.people.map(p => p.at), sit: net.sit, earlyT: net.earlyT, dragT: net.dragT, lookT: net.lookT, heroPose: net.heroPose, shore: net.finalT > 0, placeholder: net.placeholder, progress: net.progress, helpI: net.helpI }),
  boat: () => ({ on: boatOn(), distance: boat.distance, flags: boat.flags.map(p => p.at), fish: boat.fish.map(p => p.at), grab: boat.grab, earlyT: boat.earlyT, dragT: boat.dragT, lookT: boat.lookT, heroPose: boat.heroPose, final: boat.finalT > 0, helpI: boat.helpI, geometry: boat.geometry }),
  ring: () => ({ on: ringOn(), scroll: Math.round(ring.scroll * 10) / 10, dragT: ring.dragT, bumpT: ring.bumpT, pushT: ring.pushT, glow: ringGlow(), hero: { x: HERO.x, y: HERO.y } }),
  wolwol: () => ({ on: wolwolOn(), fire: wolFireLevel(), fireT: ring.fireT, finalT: ring.finalT, moon: wolMoonPlace(skyStage(currentRec(heardNow()), heardNow())) }),
  callMode: () => CALL_MODE,
  pauseUI() {
    if (!playing()) return { menu: true };
    // 멈춤 창 숫자는 이어 한 뒤의 값으로: 곡 판은 돌아갈 마디 앞까지만 센다(창 9 → 이어 한 뒤 6으로 줄어 보이던 것, R1-04)
    const back = state === 'song' && !feastRun?.gap ? pauseIndex(currentRec(heardNow())) : Infinity;
    const list = targets.filter(t => typeof t.part === 'number' && t.i < back);
    const wasLearning = !!learning, wasPractice = state === 'practice', wasCalib = state === 'calib';
    return { line: song.title, home: true, homeLabel: '지도', homeIcon: 'map', stats: [{ icon: 'star', value: String(list.filter(t => Rules.isHit(t.res)).length), label: '맞힌 자리' }], dress: window.MinyoPausePaper,
      restart() {
        paused = false; calib = null; killSound(); resetRun();
        if (feastRun) { feastClear(); feastRestart(); }
        if (wasCalib) { ctx.resume(); startCalib(); }
        else begin(wasPractice, wasLearning);
      },
    };
  },
};

// 글꼴이 준비된 뒤 첫 말풍선 폭을 잰다. 임시 시스템 글꼴 폭을 저장하지 않는다.
Promise.all([400, 700, 800].map(weight => document.fonts.load(`${weight} 20px "Minyo Hahmlet"`))).then(() => {
  window.MinyoShellFont();
  toMap();
  const directSong = window.MINYO.SONGS.find(s => s.id === Q.get('song') && s.bars);
  if (storyDue()) storyStart(); // ?story=1 시험만 열자마자 이야기. 처음 하는 아이는 제주를 누를 때(story.js)
  else {
    if (!directSong && soundCoverDue()) soundCover();
    if (directSong) toStart(directSong);
    else if (Q.get('song') === 'feast') toFeast(); // 미리보기 · 시험용: 도장 없이 잔치 시작 창으로
  }
  if (storyFirst()) window.MinyoCuts.preload('intro'); // 처음 하는 아이: 제주를 누르기 전에 이야기 그림을 미리 받는다
  requestAnimationFrame(frame);
  window.GF.ready();
});
