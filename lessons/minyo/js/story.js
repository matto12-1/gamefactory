// 팔도 장단 첫머리 이야기(기획서 판 19, 대표 승인 장면 ① ~ ⑤, 2026-11-20). 처음 하는 아이(처음 배우기 전)만 한 번 본다.
// 시작 창(제목 · 시작) → ① 엉망인 그물질 약 10초 → ② 앞소리꾼이 메김 약 5초 → ③ 앞소리꾼 첫 메김을 듣고 처음 배우기(톡 · 박 · 꾹,
// 꼬마가 맞힐 때마다 넘어진 줄꾼이 하나씩 일어남) → 「됐다!」 → 노래 알기 네 장(멸치) → 본곡.
// 멸치 끝 화면에서 처음 나갈 때 ④ 다른 고장 소문 약 7초 → ⑤ 지도(제주에서 물러나며 작은 배가 전라 앞바다로, 전라 깜박임).
// 놀이 장면은 멸치 판 그림 그대로(12:10 「게임 장면 그대로 움직이는 연극」). 사람 자세는 net.js가 storyBody로 묻는다.
// 시험 자동 손(Playwright, navigator.webdriver)에는 주소에 ?story=1일 때만 뜬다(옛 시험은 빈 저장으로 지도부터 연다).
let story = null;
const STORY_SONG = 'myeolchi';
// 주소 ?story=: '1' 첫머리부터(저장과 상관없이) · 'rumor' ④ ⑤만 볼 수 있게 · '0' 끔. Q는 game.js에 있어 부를 때만 읽는다
const storyQ = () => Q.get('story');
const storyAuto = () => storyQ() !== '0' && !navigator.webdriver;
const storyOn = () => !!story && !!song && song.id === STORY_SONG;
// 게임을 열면 지도부터(2026-11-27 대표). 처음 하는 아이는 제주(또는 멸치)를 누를 때 이야기를 본다. ?story=1은 열자마자(시험)
const storyDue = () => storyQ() === '1';
const storyFirst = () => (storyAuto() || storyQ() === 'first') && BOT === null && !save.learned && !save.storySeen; // 시험은 ?story=first
const rumorDue = () => !!song && song.id === STORY_SONG && save.storySeen && !save.rumorSeen && (storyQ() === '1' || storyQ() === 'rumor' || storyAuto() && BOT === null);
// 이야기 동안에만 덧붙는 그림(넘어짐 · 엉덩방아 · 가리킴 · 「저요?」, 2026-11-21 Codex). 없으면 있는 그림을 눕혀 대신한다
const STORY_ART = ['puller-a-flop', 'puller-b-flop', 'puller-c-flop', 'puller-a-bump', 'puller-b-bump', 'puller-c-bump', 'leader-bump', 'leader-point', 'hero-me', 'boat-small'];
const storyIm = {};
let storyArtAsked = false;
function storyLoadArt() {
  if (storyArtAsked) return; storyArtAsked = true;
  const take = (dir, names, into) => fetch(dir + 'sprites.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => {
    for (const n of names) {
      const m = j[n + '.png']; if (!m && into) continue;
      const im = new Image();
      im.onload = () => { if (into) { SPRITES[n] = im; META[n] = m; } else storyIm[n] = { im, m: m || { foot: [im.width >> 1, im.height - 4] } }; };
      im.src = dir + (m?.file || n + '.png');
    }
  });
  take('art/myeolchi/', STORY_ART.filter(n => n !== 'boat-small'), true);
  take('art/myeolchi/', ['boat-small'], false);
  take('art/geomun/', ['rower-a-stumble', 'rower-a-hold', 'boat'], false); // ④ 거문도 뱃사람과 배(거문도 판 그림)
}
// 멸치 판 처음 자리 번호(net.js 배역 sid): 0 맨 뒤 줄꾼 · 1 앞소리꾼 · 2 · 3 줄꾼 · 4 꼬마 · 5 · 6 그물 쪽 줄꾼
const STORY_FRONT = [6, 5], STORY_BACK = [0, 1, 2], STORY_RISE = [6, 5, 3, 2, 0];
const STORY_LINES = {
  1: [[.5, 1.4, 3, '당겨!'], [2.4, 1.3, 2, '당겨!'], [3.8, 1.9, 2, '하나 둘에 당기라니까!'], [4.7, 1.8, 5, '셋에 당긴다며!'], [8.6, 2.1, 1, '소리도 없이 무슨 일을 해!']],
  2: [[.5, 1.8, 1, '내가 메기면 다 같이 받아!'], [2.4, 1.6, 1, '거기 꼬마, 너부터!']],
  6: [[.1, 2.2, 1, '됐다! 이제 처음부터 한 판 하자!']],
  4: [[2.4, 1.6, 'sailor', '거문도는 노가 다 엉켰소!'], [4.0, 1.3, 1, '뱃노래는 어쩌고?'], [5.3, 2.0, 'sailor', '메기는 사람은 있는데 받는 사람이 없소!']],
};
const STORY_LEN = { 1: 10.8, 2: 5.0, 4: 7.4 };
const nowS = () => performance.now() / 1000;
const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

// ───────── 글판 · 말풍선 · 건너뛰기 ─────────
const storyLayer = document.createElement('div');
storyLayer.id = 'storyLayer'; storyLayer.hidden = true; storyLayer.dataset.test = 'story';
storyLayer.innerHTML = '<div id="storyGate" data-test="story-gate"><h1>팔도 장단</h1><button type="button" class="btnRed" id="storyGo" data-test="story-start">시작</button></div><button type="button" class="btnPaper" id="storySkip" data-test="story-skip">건너뛰기</button>';
document.body.append(storyLayer);
const storyCss = document.createElement('style');
storyCss.textContent = `
#storyLayer{position:fixed;inset:0;z-index:9;pointer-events:none}
#storyGate{position:absolute;left:50%;top:12%;transform:translateX(-50%);pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px 34px 22px;border:3px solid transparent;border-image:url(art/ui/polish/note-paper.webp) 80 85 81 84 fill / 26px 28px / 8px 10px stretch}
#storyGate h1{margin:0;font:800 clamp(30px,4.2vw,46px)/1.15 "Minyo Hahmlet",serif;color:#4a3a28;letter-spacing:.04em}
#storyGate #storyGo{min-width:200px;font-size:24px;padding:10px 28px}
#storySkip{position:absolute;right:16px;bottom:16px;pointer-events:auto;font-size:18px;min-width:112px}
.storySay{position:absolute;max-width:min(300px,calc(100vw - 32px));padding:6px 10px;border:2px solid;background:none;border-color:transparent;border-image:var(--notePaper);font:700 20px/1.3 "Minyo Hahmlet",serif;color:#3a2c1e;word-break:keep-all;text-align:center}
.storySay::after{content:"";position:absolute;left:var(--tail,50%);bottom:-20px;width:30px;height:20px;margin-left:-15px;background:url(art/ui/polish/note-tail.webp) center/100% 100% no-repeat}
@media(max-height:420px),(max-width:700px){.storySay{font-size:17px;padding:4px 8px}#storyGate{top:8%;padding:12px 24px 16px;gap:10px}#storySkip{font-size:16px;bottom:10px;right:12px}}
#mapArt .storyBoat{image-rendering:pixelated;pointer-events:none}
#mapArt .tag text{transition:opacity .3s}#mapArt svg.storyZoom .tag:not([data-tag="전라"]) text{opacity:0}
#mapArt path.reg.storyBlink{animation:storyBlink 1.4s ease-in-out infinite}
@keyframes storyBlink{0%,100%{fill:rgba(205,112,52,.16)}50%{fill:rgba(205,112,52,.58)}}
@media(prefers-reduced-motion:reduce){#mapArt path.reg.storyBlink{animation:none;fill:rgba(205,112,52,.45)}}
body.storyRise #cv{transition:transform .6s ease-in,opacity .6s ease-in;transform:translateY(38%);opacity:0}
`;
document.head.append(storyCss);
const storyGate = document.getElementById('storyGate'), storySkipEl = document.getElementById('storySkip');
const storySays = new Map();
function storySay(key, text, x, headY) {
  let el = storySays.get(key);
  if (!el) { el = document.createElement('div'); el.className = 'storySay'; el.dataset.test = 'story-say'; storyLayer.append(el); storySays.set(key, el); }
  if (el.textContent !== text) el.textContent = text;
  const w = el.offsetWidth, h = el.offsetHeight, cx = toCssX(x), top = toCssY(headY) - h - 12;
  const left = Math.max(8, Math.min(innerWidth - w - 8, cx - w / 2));
  el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(Math.max(8, top)) + 'px';
  el.style.setProperty('--tail', Math.round(Math.max(14, Math.min(w - 14, cx - left))) + 'px');
}
function storyClearSays(keep) { for (const [k, el] of storySays) if (!keep || !keep.has(k)) { el.remove(); storySays.delete(k); } }
// 말하는 사람 머리 위(세계 좌표)
function storyHead(b) {
  const im = SPRITES[b.pose] || storyIm[b.pose]?.im, m = META[b.pose] || storyIm[b.pose]?.m;
  if (!im || !m?.foot) return b.y - 44;
  const a = learnOpaque(im);
  return b.turn ? b.y - 24 : b.y - (m.foot[1] - a.top);
}

// ───────── 차례 ─────────
function storyStart(go) {
  storyLoadArt();
  const s = window.MINYO.SONGS.find(x => x.id === STORY_SONG);
  feastClear(); window.MinyoIntro.hide(); window.MinyoSongbook.hide();
  setSong(s); resetRun(); Screens.hide();
  state = 'story';
  story = { scene: 0, t0: nowS(), fallen: {}, up: {}, said: new Set(), bodies: [], loaded: null };
  storyLayer.hidden = false; storyGate.hidden = false; storySkipEl.hidden = true;
  log('stage', { name: 'story', scene: 0 });
  if (go) storyBegin(); // 지도에서 제주를 눌러 시작: 소리 안내 덮개에서 이미 눌렀으니 제목 창 없이 바로
}
document.getElementById('storyGo').addEventListener('click', storyBegin);
function storyBegin() {
  if (!story || story.scene !== 0) return;
  initAudio(); setMuted(!window.GF.sound); if (ctx.state !== 'running') ctx.resume();
  story.loaded = Promise.all([window.GF.start(), yardArtReady(), songArtReady(song.id), sfxReady(), voiceReady(song)]).then(r => r[1] && r[2]);
  storyGate.hidden = true;
  // ① ② 는 민화 채색 컷 애니메이션(2026-11-27, storycuts.js). 끝나면 무대가 걷히며 넘어진 사람들 앞에서 ③ 첫 메김
  storyFallAll(); story.kidSit = true; story.scene = 'cuts'; storySkipEl.hidden = false;
  log('stage', { name: 'story', scene: 'cuts' });
  window.MinyoCuts.play('intro', () => {
    if (!story) return;
    storySkipEl.hidden = true;
    if (story.replay) { storyRumor(); return; } // 지도에서 다시 보기는 처음 배우기 없이 ④로
    window.MinyoCuts.fadeOut(); story.kidSit = false; storyCall();
  }, { sound: storySnd });
}
const storySnd = (n, v = 1) => { if (ctx) sample(n, ctx.currentTime, v); };
storySkipEl.addEventListener('click', () => {
  if (!story) return;
  log('stage', { name: 'story-skip', scene: story.scene });
  if (story.scene === 'cuts' || story.scene === 'rumorCuts') { window.MinyoCuts.skip(); return; }
  if ((story.scene === 1 || story.scene === 2) && story.replay) storyRumor();
  else if (story.scene === 1 || story.scene === 2) { storyFallAll(); storyCall(); }
  else if (story.scene === 4) storyMap();
});
function storyScene(n) {
  story.scene = n; story.t0 = nowS(); story.said.clear(); storyClearSays();
  storySkipEl.hidden = !(n === 1 || n === 2 || n === 4);
  log('stage', { name: 'story', scene: n });
}
// ①이 끝난 모습: 줄꾼 다섯이 넘어져 있다(그물 쪽 사람은 고꾸라짐, 나머지는 엉덩방아)
function storyFallAll() { story.fallen = { 0: 'bump', 1: 'bump', 2: 'bump', 3: 'bump', 5: 'bump', 6: 'flop' }; story.up = {}; }
// ③ 앞소리꾼 첫 메김: 연습 판을 열고 메기는 마디 하나만 튼다. 끝나면 처음 배우기
function storyCall() {
  storyClearSays(); storySkipEl.hidden = true;
  story.scene = 3; story.t0 = nowS();
  const go = () => {
    if (!story || story.scene !== 3) return;
    if (!voiceOk(song)) { const s = song; story = null; storyLayer.hidden = true; toStart(s); Screens.startNote('노래를 못 불러왔어요. 시작을 다시 눌러요'); return; }
    save = { ...save, storySeen: true }; window.GF.save(save);
    killSound(); resetRun(); state = 'practice'; learning = null; nextT = Infinity; queue = [];
    timing.playStart = timing.playStart || performance.now();
    // 곡의 첫 메김 「당선에서 멜발을 보고」(국악원 녹음, 13:15 장면 ③)
    const first = song.bars().find(b => b.call) || song.practiceCall;
    const rec = scheduleBar({ ...first, i: -1, holdHint: undefined }, ctx.currentTime + .35); rec.hintDone = true;
    story.callEnd = barEnd(rec); story.scene = 3.5;
    log('stage', { name: 'story', scene: 3 });
  };
  Promise.race([story.loaded || Promise.resolve(true), new Promise(done => setTimeout(() => done(false), LOAD_LIMIT_MS))]).then(go);
}
const STORY_CALL_HINT = '앞소리꾼이 메기는 동안 들어요';
function storyHintOff() { if (msg && msg.text === STORY_CALL_HINT) msg = null; }
// 이야기 동안 누름: 시작 창 · 장면 ① ② ④는 받지 않고(판이 아님), 첫 메김을 듣는 동안은 「들어 봐요」
function storyBlocksPress() {
  if (!story || story.scene !== 3.5) return false;
  showFeedback('앞소리꾼 차례예요', 1.1);
  return true;
}
// 처음 배우기에서 맞힐 때마다 넘어진 줄꾼이 그물 쪽부터 하나씩 일어나 줄을 다시 잡는다
function storyHit() {
  if (!storyOn() || !learning) return;
  const sid = STORY_RISE.find(k => story.fallen[k]);
  if (sid === undefined) return;
  delete story.fallen[sid]; story.up[sid] = nowS();
  if (ctx) sample('step-soft', ctx.currentTime, .5);
}
// 처음 배우기를 다 했다(learnStage 4 대신): 저장은 learnStage(4)와 같게, 「됐다!」 뒤 곡 소개 한 장(멸치) → 본곡
function storyLearned(l) {
  save = { ...save, learned: true, storySeen: true, practiced: { ...save.practiced, [song.id]: true } };
  window.GF.save(save); lastLearning = l.history;
  hideLearningUi(); killSound(); resetRun();
  state = 'story'; story.fallen = {}; storyScene(6);
  if (ctx) accent('full', ctx.currentTime + .05);
}
// ④ 다른 고장 소문: 멸치 끝 화면에서 처음 나갈 때(「다시 하기」는 나중으로 미룬다)
function storyRumor() {
  storyLoadArt();
  killSound(); feastClear(); resetRun(); Screens.hide();
  state = 'story';
  story = { scene: 'rumorCuts', t0: nowS(), fallen: {}, up: {}, said: new Set(), bodies: [] };
  storyLayer.hidden = false; storyGate.hidden = true; storyClearSays(); storySkipEl.hidden = false;
  log('stage', { name: 'story', scene: 'rumorCuts' });
  // ④ 소문도 민화 컷(2026-11-27): 멸치 담기 · 거문도 뱃사람 · 하늘로 올라 남해. 끝나면 ⑤ 지도
  window.MinyoCuts.play('rumor', () => { if (!story) return; storyMap(); window.MinyoCuts.fadeOut(900); }, { sound: storySnd });
}
// ⑤ 지도: 하늘로 올라가며 지도로 바뀌고, 제주에서 팔도 전체로 물러난다
function storyMap() {
  if (!story || story.scene === 5) return;
  story.scene = 5; storyClearSays(); storySkipEl.hidden = true;
  save = { ...save, rumorSeen: true }; window.GF.save(save);
  document.body.classList.add('storyRise');
  setTimeout(() => {
    story = null; storyLayer.hidden = true; document.body.classList.remove('storyRise');
    toMap(); Screens.showMap(save, null);
    if (!story && typeof finaleDue === 'function' && finaleDue()) { finaleStart(); return; } // 제주를 마지막으로 마쳐 아홉 고장이 찼으면 소문 뒤 끝 장면
    Screens.mapStory(); // 멸치를 끝낸 뒤라 지도가 제주 확대로 열린다. 팔도 전체에서 시작한다
    log('stage', { name: 'story', scene: 5 });
  }, RM ? 0 : 620);
}
function storyUpdate() {
  if (!story) return;
  const t = nowS() - story.t0;
  if (story.scene === 3.5 && ctx) {
    if (heardNow() >= story.callEnd + .05) { storyHintOff(); story.scene = 3.6; startLearning(); return; }
    // 첫 메김 동안 기다리는 때라는 것을 글로(그래프 검수 2회차 R1-06). 누르면 잠깐 「앞소리꾼 차례예요」로 바뀌었다가 돌아온다
    if (!msg) showFeedback(STORY_CALL_HINT, Math.max(.5, story.callEnd - heardNow()));
  }
  if ((story.scene === 1 || story.scene === 2 || story.scene === 4) && t >= STORY_LEN[story.scene]) {
    if (story.scene === 1) storyScene(2);
    else if (story.scene === 2) { if (story.replay) storyRumor(); else storyCall(); } // 지도에서 다시 보기는 처음 배우기 없이 ④로
    else storyMap();
    return;
  }
  if (story.scene === 6 && t >= 2.5) { const s = song; story = null; storyLayer.hidden = true; storyClearSays(); toStart(s); if (BOT === null) introNext(s); return; } // 곡 소개 한 장 뒤 본곡(2026-11-27, 노래 알기 네 장은 단추로만). 자동 손은 시작 창이 바로 시작을 누른다
  storyEvents(t);
  // 말풍선
  const lines = STORY_LINES[Math.floor(story.scene)] || [], keep = new Set();
  if (state === 'story') for (const [at, dur, who, text] of lines) {
    if (t < at || t >= at + dur) continue;
    const key = `${story.scene}:${at}`, b = who === 'sailor' ? story.sailor : story.bodies.find(p => p.sid === who);
    if (!b) continue;
    keep.add(key); storySay(key, text, b.x + (b.sayDx || 0), storyHead(b));
  }
  storyClearSays(keep);
}
// 장면 소리 · 한 번만 일어나는 일
function storyEvents(t) {
  const once = (key, at, fn) => { if (t >= at && !story.said.has(key)) { story.said.add(key); fn(); } };
  const T = ctx ? ctx.currentTime : 0, snd = (n, v = 1) => { if (ctx) sample(n, T, v); };
  if (story.scene === 1) {
    once('jerk', .9, () => { net.earlyT = nowS(); snd('pull', .9); snd('creak', .5); });
    once('yank', 2.8, () => { snd('pull', .8); });
    once('flop', 3.0, () => { story.fallen[6] = 'flop'; snd('flop', .8); dust(story.bodies.find(p => p.sid === 6)?.x ?? 250, 162, 4); });
    once('all', 6.2, () => { snd('pull-2', 1); snd('creak', .8); });
    once('fall', 6.8, () => { storyFallAll(); story.kidSit = true; snd('step', .9); snd('whoosh', .6); for (const p of story.bodies) dust(p.x, 162, 2); });
    once('fish', 6.9, () => { story.fishT = nowS(); snd('splash', .9); });
    once('gull', 7.6, () => snd('gull-1', .6));
    once('leaderUp', 8.4, () => { story.leaderUp = nowS(); const b = story.bodies.find(p => p.sid === 1); if (b) dust(b.x, 162, 3); });
  } else if (story.scene === 2) {
    once('kidUp', .1, () => { story.kidSit = false; story.up[4] = nowS(); });
  } else if (story.scene === 4) {
    once('land', 1.5, () => snd('splash', .5));
    once('jump', 1.7, () => snd('whoosh', .5));
    once('thud', 2.2, () => { snd('step', .8); if (story.sailor) dust(story.sailor.x, 162, 3); });
  }
}
// net.js가 사람마다 묻는다: 이야기 동안의 자세 · 자리. 없으면 null(놀이 그대로)
function storyBody(p, pose, f) {
  if (!storyOn() || p.sid === undefined) return null;
  const s = story, sid = p.sid, sc = s.scene, t = nowS() - s.t0, fam = p.name, out = {};
  const fallPose = kind => {
    const want = fam === 'leader' ? 'leader-bump' : `${fam}-${kind}`;
    if (SPRITES[want]) return { pose: want, noRope: true };
    return fam === 'leader' ? { pose: 'leader-hold', turn: -1, noRope: true } : kind === 'flop' ? { pose: `${fam}-stumble`, turn: 1, noRope: true } : { pose: `${fam}-hold`, turn: -1, noRope: true };
  };
  const rising = s.up[sid] !== undefined && nowS() - s.up[sid] < .45 ? -Math.round(Math.abs(Math.sin((nowS() - s.up[sid]) * 14)) * 3) : 0;
  if (fam === 'hero') {
    if (sc === 1 && s.kidSit) return { pose: 'hero-sit' };
    if (sc === 1 && t >= 6.2 && t < 6.8) return { pose: 'hero-pullbig' };
    if (sc === 2) {
      if (t >= 2.9 && t < 3.5) return { pose: 'hero-hold', dir: -1, noRope: true, dy: rising };
      if (t >= 3.5 && t < 4.9) return { pose: SPRITES['hero-me'] ? 'hero-me' : 'hero-brace', noRope: true, dy: rising };
      return { pose: 'hero-hold', dy: rising };
    }
    if (sc === 4 && t >= 2.2) return { pose: t < 2.8 ? 'hero-drag' : 'hero-hold' };
    if (sc === 6) return { pose: 'hero-cheer' };
    return null;
  }
  if (fam === 'leader') {
    if (sc === 1) {
      if (s.fallen[1] && !(s.leaderUp && nowS() >= s.leaderUp)) return fallPose('bump');
      if (t >= 6.2 && t < 6.8) return { pose: 'leader-hold', dx: -2 };
      if (s.leaderUp) return { pose: 'leader-look', noRope: true, dy: nowS() - s.leaderUp < .45 ? -Math.round(Math.abs(Math.sin((nowS() - s.leaderUp) * 14)) * 3) : 0 };
      if (t >= 2.8 && t < 3.6) return { pose: 'leader-hold', dx: -2 };
      return null;
    }
    if (sc === 2) {
      const k = t < .5 ? ease(t / .5) : t > 4.5 ? 1 - ease((t - 4.5) / .5) : 1;
      const step = { dx: Math.round(8 * k), dy: Math.round(7 * k), noRope: true };
      if (t >= .5 && t < 2.3) return { ...step, pose: 'leader-cheer' };
      if (t >= 2.3 && t < 4.5) return { ...step, pose: SPRITES['leader-point'] ? 'leader-point' : 'leader-look' };
      return { ...step, pose: 'leader-hold' };
    }
    if (sc === 4 && t >= 3.9 && t < 5.3) return { pose: 'leader-look' };
    if (sc === 6) return { pose: 'leader-cheer' };
    return null;
  }
  if (!fam.startsWith('puller-')) return null;
  if (s.fallen[sid]) return fallPose(s.fallen[sid]);
  if (sc === 1) {
    if (t >= .9 && t < 1.8 && STORY_FRONT.includes(sid)) return { pose: `${fam}-pullbig`, dx: -2 };
    if (t >= 1.8 && t < 2.3 && STORY_FRONT.includes(sid)) return { pose: `${fam}-stumble` };
    if (t >= 2.8 && t < 3.6 && STORY_BACK.includes(sid)) return { pose: `${fam}-pullbig`, dx: -2 };
    if (t >= 3.0 && t < 3.6 && sid === 5) return { pose: `${fam}-stumble` };
    if (t >= 6.2 && t < 6.8) return { pose: `${fam}-pullbig`, dx: -2 };
    return { pose: `${fam}-hold` };
  }
  if (sc === 6) return { pose: `${fam}-cheer` };
  if (rising) return { pose: `${fam}-hold`, dy: rising };
  return null;
}
// 장면 뒤쪽(바다 띠): ④ 작은 배가 들어와 모래톱에 닿는다
function storyDrawBack(f) {
  if (!storyOn() || story.scene !== 4) return;
  const t = nowS() - story.t0, b = storyIm['boat-small'] || null, big = storyIm.boat;
  const x = Math.round(352 - 92 * ease(t / 1.5)), y = 121 + (t > 1.5 ? Math.round(Math.sin(t * 3)) : 0);
  story.boatAt = { x, y };
  if (b) lg.drawImage(b.im, Math.round(x - vx - b.im.width / 2), Math.round(y - vy - b.im.height));
  else if (big) { const w = 96, h = 28; lg.drawImage(big.im, Math.round(x - vx - w / 2), Math.round(y - vy - h), w, h); }
}
// 장면 앞쪽: ① 그물 사이로 빠져나가는 멸치, ④ 배에서 뛰어내려 비틀거리는 뱃사람
function storyDrawFront(f, bodies, floatEnd) {
  if (!storyOn()) return;
  story.bodies = bodies.map(p => ({ sid: p.sid, name: p.name, x: p.x, y: p.y, pose: p.pose, turn: p.turn }));
  const t = nowS() - story.t0;
  if (story.scene === 1 && story.fishT && floatEnd) {
    const k = nowS() - story.fishT, im = SPRITES.anchovy;
    for (let i = 0; i < 9; i++) {
      const q = (k - i * .07) / .9; if (q <= 0 || q >= 1) continue;
      const x = floatEnd.x + 6 + i * 3 + q * (26 + i % 3 * 8), y = floatEnd.y - Math.sin(Math.PI * q) * (14 + i % 4 * 4) + q * 4;
      if (im) { lg.save(); lg.globalAlpha = 1 - Math.max(0, q - .75) * 4; lg.drawImage(im, Math.round(x - vx - 3), Math.round(y - vy - 1)); lg.restore(); }
      else { lg.fillStyle = '#cfe3e6'; lg.fillRect(Math.round(x - vx - 2), Math.round(y - vy), 4, 1); }
    }
  }
  if (story.scene === 4) {
    const a = storyIm['rower-a-stumble'], h = storyIm['rower-a-hold'], from = story.boatAt || { x: 262, y: 121 };
    if (t < 1.7) { story.sailor = null; if (a && t >= 1.0) storySailor(h || a, from.x + 4, from.y - 10, 1); return; }
    const k = Math.min(1, (t - 1.7) / .5), x = from.x + 4 + (296 - from.x - 4) * k, y = from.y - 10 + (163 - from.y + 10) * k - Math.sin(Math.PI * k) * 18;
    const wob = t >= 2.2 && t < 3.1 ? Math.sin((t - 2.2) * 22) * .18 : 0;
    const im = t < 3.1 ? a : h || a;
    if (im) storySailor(im, x, y, -1, wob);
    story.sailor = { x, y, pose: 'rower', sayDx: 0, turn: 0 };
    if (im) story.sailor.headY = y - (im.m.foot[1] - learnOpaque(im.im).top);
  }
}
function storySailor(s, x, y, dir, wob = 0) {
  const fx = s.m.foot[0], fy = s.m.foot[1];
  lg.save(); lg.translate(Math.round(x - vx), Math.round(y - vy)); if (wob) lg.rotate(wob); lg.scale(dir, 1);
  lg.drawImage(s.im, -fx, -fy); lg.restore();
}
