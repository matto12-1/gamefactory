// 흐름: 게임 첫 화면 → 놀이 → 끝 화면 → 다시. 저장 · 멈춤 · 입력 · 사이트 약속.
// 주소 뒤 붙임: ?log=1 사건 기록 · ?bot=1.6,90 자동 손(초,정확도) · ?bot=mash 연타 · ?seed=1 · ?manual=1 시험 대본용 수동 시계 · ?n=3 채 수 · ?per=24 한 채 문제 수 · ?tut=0 안내 끄기 · ?stage=3 그 단계로 바로 · ?all=1 지도를 다 연다 · ?reset=1 저장 지우기 · ?play=1 첫 화면 건너뛰기
'use strict';
const Rules = window.WreckRules;
const Q = new URLSearchParams(location.search);
const LOG = Q.get('log') === '1', MANUAL = Q.get('manual') === '1';
const SEED = Q.has('seed') ? +Q.get('seed') : (window.GF.seed ?? null);
const ALL = [...Rules.STAGES, ...Rules.PRACTICE], ADVENT = Rules.STAGES.filter(st => !st.endless), ENDLESS = Rules.STAGES.find(st => st.endless);
const stageById = id => id === Rules.FIRST_PRACTICE.id ? Rules.FIRST_PRACTICE : ALL.find(v => v.id === id) || Rules.STAGES[0];
let STAGE = Q.has('stage') ? stageById(+Q.get('stage')) : Rules.STAGES[0];
const OPEN_ALL = Q.get('all') === '1';
const isOpen = st => OPEN_ALL || Rules.stageOpen(save, st.id);
const openCount = () => ADVENT.filter(isOpen).length;
const canLeave = () => save.tutDone || openCount() > 1; // 갈림길을 보여 줄 때: 첫 판 안내를 마쳤거나 모험이 둘 이상 열림
const homeOf = st => st.practice ? 'prac' : st.endless ? 'fork' : 'adv'; // 카드 · 끝 화면에서 돌아갈 곳
const clearedStage = st => !!(save.stages[st.id] && save.stages[st.id].clear);
// 새 것은 처음 나오는 층에서 놀이를 멈추고 한 번만 알려 준다
const TEACH = {
  power: '5번 이어 맞히면 불꽃 왕이 돼요\n이어 맞힐수록 점수를 더 받아요',
  bomb: '폭탄을 쓸 수 있어요\n폭탄을 누르면 건물이 두 층 올라가요',
  hard: c => `쇠 층은 두 번 쳐야 깨져요\n${c.a}×${c.b} 다음엔 ${c.b}×${c.a}. 답은 같아요`, // 지금 나온 곱으로
  dash: '빨간 층은 곧 쑥 내려와요\n내려오기 전에 맞혀요',
  zero: '빈 상자 5개에 든 사과는 0개\n0을 곱하면 0이에요',
};
function cardLine(st) {
  if (st.id === 6) return '사과 1개씩 7상자면 사과 7개';
  if (st.final) return Rules.missList(save).length ? '앞에서 틀린 곱셈이 많이 나와요' : '2단부터 9단까지 다 나와요';
  if (st.endless && !isOpen(st)) return '돼지 왕의 성을 깨면 열려요';
  if (st.endless) { const best = save.stages[st.id]; return best && best.floors ? `지난 기록 ${best.floors}층` : '2단부터 9단까지 끝없이 떨어져요'; }
  return '';
}
const KOR = ['한', '두', '세'];
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
if (Q.get('reset') === '1') window.GF.save(Rules.cleanSave(null));
let save = Rules.cleanSave(window.GF.load());

const titleEl = document.getElementById('title'), endEl = document.getElementById('end'), endTEl = document.getElementById('endT'), endSEl = document.getElementById('endS'), endWEl = document.getElementById('endW');
const boardEl = document.getElementById('board'), againEl = document.getElementById('again'), again2El = document.getElementById('again2'), mapEl = document.getElementById('map'), mapBtn = document.getElementById('endMap'), teachEl = document.getElementById('teach'), backEl = document.getElementById('mapBack');
const homeEl = document.getElementById('homeBtn');
let mapKind = 'adv';
let endMain = null, endSub = null, shownTeach = null;
const pauseEl = document.getElementById('pause'), pauseBtn = document.getElementById('pauseBtn');
const creditBtn = document.getElementById('creditBtn'), creditShade = document.getElementById('creditShade'), creditPanel = document.getElementById('creditPanel');
const creditHostPress = e => {
  e.preventDefault(); e.stopImmediatePropagation(); const doc = e.currentTarget;
  closeCredits(); creditBtn.focus({ preventScroll: true });
  // 사이트 단추는 click을 쓴다. 닫는 손을 뗄 때 오는 click까지 같은 누름으로 막는다.
  const stop = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  doc.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => doc.removeEventListener('click', stop, true), 500);
};
function creditHost(on) {
  if (!window.GF.inFrame) return;
  const doc = window.parent.document;
  if (on) doc.addEventListener('pointerdown', creditHostPress, true);
  else doc.removeEventListener('pointerdown', creditHostPress, true);
}
function closeCredits() {
  creditShade.hidden = true; creditBtn.setAttribute('aria-expanded', 'false');
  creditHost(false);
  for (const el of [cv, titleEl, mapEl, backEl, homeEl]) el.inert = false;
}
function creditVisibility(on) { creditBtn.hidden = !on; if (!on) closeCredits(); }
function toggleCredits() {
  if (!creditShade.hidden) { closeCredits(); creditBtn.focus({ preventScroll: true }); return; }
  creditShade.hidden = false; creditBtn.setAttribute('aria-expanded', 'true');
  creditHost(true);
  for (const el of [cv, titleEl, mapEl, backEl, homeEl]) el.inert = true;
  creditPanel.focus({ preventScroll: true });
}
creditBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleCredits(); });
creditShade.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (e.target === creditShade) { closeCredits(); creditBtn.focus({ preventScroll: true }); } });
addEventListener('keydown', e => {
  if (!creditShade.hidden) {
    e.stopImmediatePropagation(); e.preventDefault();
    if (e.key === 'Escape') { closeCredits(); creditBtn.focus({ preventScroll: true }); }
    else if (e.key === 'Tab') creditBtn.focus({ preventScroll: true });
    else if (document.activeElement === creditBtn && ['Enter', ' '].includes(e.key) && !e.repeat) toggleCredits();
  } else if (document.activeElement === creditBtn && ['Enter', ' '].includes(e.key)) { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) toggleCredits(); }
}, true);
let sim = null, bot = null, runNo = 0, scene = 'title', paused = false, starting = false, lastEnd = 0;
let endT = -1, overT = -1, overShown = false;

// 사건 기록(시작 · 입력 · 성공 · 실패 · 끝 · 단계). 아이 시험 때 ?log=1 판의 기록을 기기에 남긴다
const events = [];
const timing = { shown: performance.now() };
function gameLog(type, data = {}) { events.push({ ms: Math.round(performance.now() - timing.shown), type, ...data }); if (events.length > 5000) events.shift(); }
// 아이 시험 기록 꺼내기: ?log=show 는 이 기기에 쌓인 기록을 글로 보여 준다. 서버로 나가지 않는다
if (Q.get('log') === 'show') {
  let all = []; try { all = JSON.parse(localStorage.getItem('wreck-log') || '[]'); } catch (e) {}
  const text = all.map(({ events: _, ...r }) => JSON.stringify(r)).join('\n'), box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;gap:8px;padding:12px;background:#3F3851;color:#FFF6E5;font-size:16px';
  const head = document.createElement('p'), area = document.createElement('textarea'), row = document.createElement('div'), copy = document.createElement('button'), wipe = document.createElement('button');
  head.textContent = `아이 시험 기록 ${all.length}판`; head.style.margin = '0';
  area.readOnly = true; area.value = text; area.dataset.test = 'log-text'; area.style.cssText = 'flex:1;width:100%;font:13px monospace';
  copy.className = 'go'; copy.textContent = '복사'; copy.onclick = () => { area.select(); navigator.clipboard?.writeText(text); copy.textContent = '복사했어요'; };
  wipe.className = 'go sub'; wipe.textContent = '기록 지우기'; wipe.style.marginLeft = '8px'; wipe.onclick = () => { if (confirm('기록을 지울까요?')) { localStorage.removeItem('wreck-log'); location.reload(); } };
  row.append(copy, wipe); box.append(head, area, row); document.body.append(box);
}
function saveLog(result) {
  if (!LOG) return;
  const s = sim.s;
  try {
    const k = 'wreck-log', all = JSON.parse(localStorage.getItem(k) || '[]');
    all.push({ who: Q.get('who') || '', run: runNo, result, at: new Date().toISOString(), best: s.best, score: s.score, building: s.building, left: s.floors.length, hearts: s.hearts, firstPress: s.stats.firstPress, firstHit: s.stats.firstHit, wrong: s.wrongList, events: events.slice() });
    localStorage.setItem(k, JSON.stringify(all));
  } catch (e) {}
}

function makeSim(tutorial, resume = null) {
  runNo++;
  const opt = { stage: STAGE, tutorial, resume, boardWeak: Rules.boardWeak(save, STAGE.dans), missList: Rules.missList(save), taught: Q.get('tut') === '0' ? null : save.taught, seed: SEED == null ? null : SEED + runNo - 1 };
  if (!STAGE.firstPractice && Q.has('per')) opt.perB = clampN(+Q.get('per') || STAGE.perB, 6, 40);
  if (!STAGE.firstPractice && Q.has('n')) { const n = clampN(+Q.get('n') || 3, 1, 3); opt.buildings = n; }
  return Rules.createSim(opt);
}
function makeHand() {
  const b = Q.get('bot'); if (!b) return null;
  const r = Rules.rngOf(SEED == null ? Date.now() & 0xffff : SEED + runNo);
  if (b === 'mash') return Rules.makeBot(.05, null, r)(sim);
  const [d, a] = b.split(',').map(Number);
  return Rules.makeBot(d || 1.6, (a || 90) / 100, r)(sim);
}
// 공용 화면 틀과 같이 부모 화면에 상태를 보낸다. 첫 화면 · 갈림길 · 지도에서는 「나가기」.
function siteState(state) { creditVisibility(state === 'title' && artReady); placeHome(); document.body.dataset.uiState = state; if (window.GF.inFrame) try { window.parent.document.body.dataset.uiState = state; } catch (e) {} }
window.__GAME = { pauseUI: () => ['title', 'fork', 'map'].includes(scene) ? { menu: true } : { stage: STAGE.id, line: STAGE.name, home: true } }; // 놀이 중 「처음부터」는 같은 단계로 바로 돌아온다
function placeHome() {
  homeEl.hidden = !artReady || !['fork', 'map', 'card', 'end'].includes(scene);
  homeEl.classList.toggle('panel', scene === 'card' || scene === 'end'); homeEl.style.left = '';
  if (scene === 'map') homeEl.style.left = `${backEl.getBoundingClientRect().right + 8}px`;
  if (!artReady) return;
  const c = document.getElementById('homeIcon'), a = ATLAS.iconHouse, k = Math.max(1, Math.round(parseFloat(getComputedStyle(homeEl).fontSize) * DPR / 12)), g = c.getContext('2d');
  c.width = a.w * k; c.height = a.h * k; c.style.width = `${c.width / DPR}px`; c.style.height = `${c.height / DPR}px`;
  g.imageSmoothingEnabled = false; g.drawImage(art, a.x, a.y, a.w, a.h, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = COL.ink; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
}
function goHome() {
  againId++; starting = false; forkOpen = null; paused = false; pauseEl.hidden = true;
  for (const key of ['stage', 'start', 'play', 'resume']) Q.delete(key);
  STAGE = Rules.STAGES[0]; acc = 0;
  scene = 'title'; titleEl.hidden = false; endEl.hidden = true; mapEl.hidden = true; backEl.hidden = true; teachEl.hidden = true; shownTeach = null;
  endT = overT = -1; overShown = false; bot = null; cv.style.filter = ''; rumble(false);
  layout(); setLook(1); resetFx(); placeBomb(); audioResume(); musicMenu(); lastFrame = performance.now(); siteState('title');
}
function startRun(tutorial, resume = null) {
  sim = makeSim(tutorial, resume); scene = 'play'; layout(); setLook(STAGE.look || STAGE.id); resetFx(); mapEl.hidden = true; backEl.hidden = true;
  endT = -1; overT = -1; overShown = false; endEl.hidden = true; endEl.className = ''; cv.style.filter = '';
  rumble(false); musicLevel(MUS_VOL); musBpm = BPM[bpmI(sim.s.building)]; musicWant(musicTrack(STAGE.look || STAGE.id, !!STAGE.endless, sim.s.building)); musicOn = true;
  bot = makeHand(); paused = false; document.body.dataset.uiState = 'play'; placeBomb();
  siteState('play');
  timing.shown = performance.now(); events.length = 0;
  gameLog('start', { run: runNo, stage: STAGE.id, W, H, tutorial, resume: !!resume });
}
// 첫 화면 뒤 단추: 사이트에 판 시작을 알리고(3초 상한) 시작한다
function placeTeach(id) { // 안내 글은 답 칸 아래가 비면 거기에 둔다(답 칸과 식을 가리지 않게). 불타는 왕 안내는 왕을 가리지 않게 위에
  teachEl.style.top = ''; if (id === 'power') return;
  const below = (oy + (GY - sim.s.gap * F + 2) * K) / DPR;
  if (below + teachEl.offsetHeight <= innerHeight - 4) teachEl.style.top = `${below}px`;
}
function firstTutorial() { return !!STAGE.firstPractice && Q.get('tut') !== '0'; }
function beginFromTitle() {
  if (starting || scene !== 'title') return;
  audioInit(); musicMenu(); audioMute(!window.GF.sound);
  if (!Q.has('stage') && canLeave()) { titleEl.hidden = true; showFork(); return; }
  if (!Q.has('stage')) STAGE = Rules.FIRST_PRACTICE;
  waitStart(startEl, () => { titleEl.hidden = true; startRun(firstTutorial()); });
}
// 사이트 답을 기다리는 동안(3초 상한) 단추에 표시한다. 두 번 눌러도 한 번만, 그 사이 지도로 가면 취소
function waitStart(btn, then) {
  if (starting) return;
  starting = true; const me = ++againId, label = btn.textContent, t = setTimeout(() => { btn.textContent = '준비 중'; }, 200);
  window.GF.start(STAGE && STAGE.endless ? { play: 'endless' } : undefined).then(() => { clearTimeout(t); btn.textContent = label; if (me !== againId) return; starting = false; then(); });
}
// 갈림길: 문 셋(단 연습 · 모험 · 끝없는 성). 누르면 문이 열리고 그 지도로. 잠긴 끝없는 성은 열리지 않고 카드로 까닭을 보여 준다
function showFork() {
  againId++; starting = false; scene = 'fork'; paused = false; forkOpen = null; setLook(1); titleEl.hidden = true; endEl.hidden = true; cv.style.filter = ''; mapEl.hidden = false; backEl.hidden = true; rumble(false); musicMenu(); placeBomb();
  layout(); siteState('title'); renderFork();
}
function renderFork() {
  forkEndless = isOpen(ENDLESS); mapEl.textContent = '';
  forkDoors().forEach((d, i) => {
    const b = document.createElement('button'), p = d.hit;
    b.className = 'node'; b.dataset.test = ['door-prac', 'door-adv', 'door-endless'][i]; b.setAttribute('aria-label', ['단 연습', '모험', '끝없는 성'][i]);
    b.style.cssText = `left:${(ox + p.x * K) / DPR}px;top:${(oy + p.y * K) / DPR}px;width:${p.w * U}px;height:${p.h * U}px`;
    once(b, () => enterDoor(i)); mapEl.append(b);
  });
}
function enterDoor(i) {
  if (scene !== 'fork' || forkOpen) return;
  audioInit(); audioMute(!window.GF.sound);
  const go = [() => showMap('prac'), () => showMap('adv'), () => showCard(ENDLESS)][i];
  const entry = forkOpen = { i, t0: performance.now(), locked: i === 2 && !forkEndless };
  if (!entry.locked) sfxDoor();
  // 연타해도 한 번만, 달리기와 들어가기를 합쳐 0.4초. 수동 시계 시험도 같은 실제 시간.
  setTimeout(() => { if (scene === 'fork' && forkOpen === entry) go(); }, 400);
}
function renderMap() {
  mapPath = mapKind === 'adv'; // 단추 자리를 재기 전에(길이 있으면 줄마다 꺾여서 자리가 달라진다)
  const list = mapKind === 'prac' ? Rules.PRACTICE : ADVENT, next = list.find(st => isOpen(st) && !clearedStage(st));
  mapList = list.map(st => ({ st, open: isOpen(st), clear: clearedStage(st), next: st === next }));
  const nodes = mapNodes(list.length);
  mapEl.textContent = '';
  list.forEach((st, i) => {
    const b = document.createElement('button'), p = nodes[i].hit;
    b.className = 'node'; b.dataset.test = `stage-${st.id}`; b.disabled = !isOpen(st); b.setAttribute('aria-label', st.final || st.practice ? st.name : `${st.name} ${st.dans.join(' ')}단`);
    b.style.cssText = `left:${(ox + p.x * K) / DPR}px;top:${(oy + p.y * K) / DPR}px;width:${p.w * U}px;height:${p.h * U}px`;
    once(b, () => showCard(st)); mapEl.append(b);
  });
}
function showMap(kind = mapKind) {
  mapKind = kind; againId++; starting = false; scene = 'map'; paused = false; setLook(1); titleEl.hidden = true; endEl.hidden = true; cv.style.filter = ''; mapEl.hidden = false; backEl.hidden = false; rumble(false); musicMenu(); placeBomb();
  layout(); siteState('title'); renderMap();
}
function renderTable(dans) { // 단 카드: 뛰어 세기를 칸으로
  boardEl.textContent = '';
  dans.forEach(d => {
    const row = document.createElement('div'); row.className = 'row';
    for (let n = 1; n <= 9; n++) { const el = document.createElement('div'), q = document.createElement('b'), v = document.createElement('i'); el.className = 'bc b1'; q.textContent = `${d}×${n}`; v.textContent = String(d * n); el.append(q, v); row.append(el); }
    boardEl.append(row);
  });
}
function showCard(st) {
  STAGE = st; setLook(st.look || st.id); musicMenu(musicTrack(st.look || st.id, !!st.endless)); titleEl.hidden = true; mapEl.hidden = true; backEl.hidden = true; scene = 'card'; placeBomb(); siteState('card');
  layout(); placeHome();
  endEl.className = 'card'; endTEl.textContent = st.name; document.getElementById('endP').textContent = ''; endSEl.textContent = ''; endWEl.textContent = cardLine(st);
  renderTable(st.final || st.endless ? [] : st.dans);
  const shut = !isOpen(st); // 잠긴 끝없는 성: 시작 없이 까닭과 「뒤로」만
  againEl.textContent = '시작'; againEl.hidden = shut; endMain = shut ? showFork : startFromCard; again2El.hidden = true; backLabel();
  cv.style.filter = ''; endEl.hidden = false; lastEnd = performance.now(); paintEnd();
}
function startFromCard() {
  if (scene !== 'card') return;
  audioInit(); audioMute(!window.GF.sound);
  waitStart(againEl, () => startRun(firstTutorial()));
}
function renderBoard(news) {
  boardEl.textContent = '';
  STAGE.dans.forEach(d => {
    const row = document.createElement('div'); row.className = 'row';
    for (let n = 1; n <= 9; n++) {
      const st = (save.board[d] || {})[n] || 0, key = `${d}x${n}`, isNew = news.includes(key), el = document.createElement('div'), q = document.createElement('b'), v = document.createElement('i');
      el.className = `bc b${st}${isNew ? ' new' : ''}`;
      if (isNew) el.style.animationDelay = `${.15 + news.indexOf(key) * .06}s`;
      q.textContent = `${d}×${n}`; v.textContent = st ? String(d * n) : '?';
      el.append(q, v); row.append(el);
    }
    boardEl.append(row);
  });
}
function showEnd(kind) {
  if (STAGE.firstPractice) { showFork(); return; } // 와르르 뒤 갈림길로. 연습에는 점수 끝 화면 · 곱 판 · 단계 기록이 없다.
  const s = sim.s, news = Rules.applyHits(save, s.hits), best = save.stages[STAGE.id] || { clear: false, floors: 0, streak: 0 }, was = best.streak, rec = s.broken > best.floors && best.floors > 0;
  best.floors = Math.max(best.floors, s.broken); best.streak = Math.max(best.streak, s.best); if (kind === 'clear') best.clear = true; save.stages[STAGE.id] = best;
  save.best.floors = Math.max(save.best.floors, s.broken); save.best.streak = Math.max(save.best.streak, s.best);
  Rules.applyMiss(save, s.okKeys, s.wrongList);
  window.GF.save(save);
  const floorsTxt = `부순 층 ${s.broken}${rec ? ' 새 기록' : ''}`, SEP = innerWidth < 520 ? '\n' : ' · ', SEP2 = endTopPanel() ? '\n' : SEP, streakTxt = s.best >= was ? `최고 ${s.best}연속` : `이번 ${s.best}연속 · 최고 ${was}연속`; // 좁은 화면은 줄을 나눈다
  const line = STAGE.practice ? Rules.PRACTICE : Rules.STAGES, next = line[line.indexOf(STAGE) + 1]; againEl.hidden = false;
  again2El.hidden = true; endSub = () => again(false); again2El.textContent = '처음부터';
  if (kind === 'clear') {
    endEl.className = '';
    endTEl.textContent = STAGE.final ? `${STAGE.name}을 다 부쉈어요` : `${STAGE.name} ${KOR[sim.cfg.buildings - 1]} 채 다 부쉈어요`;
    endSEl.textContent = floorsTxt + SEP + streakTxt;
    if (next) { againEl.textContent = `다음: ${next.name}`; endMain = () => showCard(next); again2El.textContent = '한 판 더'; again2El.hidden = false; }
    else { againEl.textContent = '한 판 더'; endMain = () => again(false); }
  } else {
    endEl.className = 'over';
    endTEl.textContent = '왕이 납작해졌어요';
    const leftN = s.floors.length, leftTxt = `${['', '한 ', '두 ', '세 ', '네 '][leftN] || leftN}층 남았어요`;
    endSEl.textContent = STAGE.endless ? [`${ORD[s.building] || `${s.building + 1}번째`} 건물까지 왔어요`, `${floorsTxt} · ${streakTxt}`].join(SEP2) : STAGE.final ? [leftTxt, floorsTxt].join(SEP) : [`${ORD[s.building]} 건물 ${leftTxt}`, floorsTxt].join(SEP2);
    endMain = () => again(true);
    if (s.building > 0 && !STAGE.endless) { againEl.textContent = '이 건물부터 다시'; again2El.hidden = false; }
    else againEl.textContent = '다시';
  }
  backLabel();
  document.getElementById('endP').textContent = `점수 ${s.score.toLocaleString('ko-KR')}`;
  if (STAGE.endless && kind === 'over') { rankWait = ++rankSeq; window.GF.score?.({ score: s.score }); } else rankWait = 0; // 순위는 끝없는 성만(2026-11-12 대표)
  if (STAGE.final || STAGE.endless) { // 곱 판이 너무 커서 이 판에 틀린 곱만 다시 보여 준다
    endEl.classList.add('wrongs'); // 낮은 폰 가로는 「틀린 곱셈」 글을 칸 바로 위에 둔다
    const wr = [...new Map(s.wrongList.map(w => [Rules.keyOf(w.a, w.b), w])).values()].slice(0, 9);
    boardEl.textContent = '';
    if (wr.length) { const row = document.createElement('div'); row.className = 'row'; for (const w of wr) { const el = document.createElement('div'), q = document.createElement('b'), v = document.createElement('i'); el.className = 'bc b1'; q.textContent = `${w.a}×${w.b}`; v.textContent = String(w.a * w.b); el.append(q, v); row.append(el); } boardEl.append(row); }
    endWEl.textContent = [wr.length ? '이번 판에 틀린 곱셈' : '', kind === 'clear' && next ? `${next.name}이 열렸어요` : ''].filter(Boolean).join(SEP2);
  } else {
    renderBoard(news);
    const all = STAGE.dans.flatMap(d => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (save.board[d] || {})[n] || 0)), left = all.filter(v => !v).length, gold = all.filter(v => v === 2).length;
    const tail = left ? `남은 곱셈 ${left}개` : '다음 판에 3초 안에 또 맞히면 금색';
    endWEl.textContent = gold === all.length ? '곱셈 판을 금색으로 다 채웠어요' : news.length ? [`새로 맞힌 곱셈 ${news.length}개`, tail].join(SEP2) : tail;
  }
  placeBomb();
  cv.style.filter = ''; endEl.hidden = false; lastEnd = performance.now(); scene = 'end'; document.body.dataset.uiState = 'end'; placeBomb();
  paintEnd();
  gameLog('end', { kind, score: s.score, broken: s.broken, best: s.best });
  saveLog(kind);
  siteState('end'); // 사이트 틀 안에서도 이 끝 화면만 쓴다. GF.finish는 공용 결과 판을 덮어 씌워 부르지 않는다(순위표를 켜면 점수 제출 길을 따로 짠다)
}
// 사이트가 돌려준 순위: 내 판이 1~5위 안이면 점수 옆에 「N위」
let rankSeq = 0, rankWait = 0;
window.GF.on('rank', r => {
  if (!rankWait || scene !== 'end' || !r.ok || !r.mine) return; rankWait = 0;
  const mine = r.rows.find(x => x.score === r.mine.score && x.at === r.mine.at);
  if (mine) document.getElementById('endP').textContent = `점수 ${r.mine.score.toLocaleString('ko-KR')} · ${mine.rank}위`;
});
function backLabel() { mapBtn.hidden = !canLeave(); mapBtn.textContent = homeOf(STAGE) === 'fork' ? '뒤로' : '지도'; }
function goBack() { const h = homeOf(STAGE); if (h === 'fork') showFork(); else showMap(h); }
let againId = 0;
function again(resumeKeep) {
  if (scene !== 'end') return;
  audioInit();
  gameLog('stage', { name: 'again', afterMs: Math.round(performance.now() - lastEnd) });
  const s = sim.s, resume = resumeKeep && s.phase === 'over' && s.building > 0 && !STAGE.endless ? { building: s.building, score: s.score, best: s.best, T: s.T, perf: s.perf, count: {}, broken: s.broken } : null;
  waitStart(resumeKeep ? againEl : again2El, () => startRun(false, resume)); // 두 번 눌러도 판은 한 번만 시작한다
}
function pauseGame(own = false) {
  audioSuspend();
  if (paused || scene !== 'play') return;
  paused = true; gameLog('stage', { name: 'pause' });
  if (own) pauseEl.hidden = false; // 사이트 안에서는 사이트 멈춤 창이 뜬다
}
function resumeGame() {
  if (document.hidden) return;
  audioResume();
  if (!paused) return;
  paused = false; pauseEl.hidden = true; lastFrame = performance.now(); gameLog('stage', { name: 'resume' });
}

/* ---------- 입력 ---------- */
function press(col) { audioInit(); if (A.ctx && !musicOn && sim.s.phase !== 'over' && sim.s.phase !== 'clear') musicOn = true; sim.press(col); }
cv.addEventListener('contextmenu', e => e.preventDefault());
const onHouse = (x, y) => scene === 'play' && houseAt && x >= houseAt.x && x <= houseAt.x + houseAt.w && y >= houseAt.y && y <= houseAt.y + houseAt.h;
cv.addEventListener('pointermove', e => { cv.style.cursor = !paused && onHouse(dotX(e.clientX), dotY(e.clientY)) ? 'pointer' : ''; });
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (scene !== 'play' || paused) return;
  const s = sim.s, x = dotX(e.clientX), y = dotY(e.clientY);
  if (onHouse(x, y)) { goHome(); return; } // 위 흰 집: 게임 첫 화면으로(도중 판은 버린다)
  const off = y < hudBottom() || overBoard(x, y); // 위 표시 줄과 도움 판은 짚어도 답이 아니다
  if (!off) ripples.push({ x, y, life: 0 });
  if (s.teach) { sim.dismissTeach(); return; }
  if (s.phase === 'over') { if (overT > .6 && !overShown) { overShown = true; showEnd('over'); } return; }
  if (s.phase === 'clear') { if (!STAGE.firstPractice && endT > 1 && !overShown) { overShown = true; showEnd('clear'); } return; } // 눌러 건너뛴다
  if (off) return;
  // 움직이는 칸을 겨누지 않는다. 화면 어디든 그 세로줄이 칸이다(바깥 칸은 화면 옆 끝까지)
  tapX = x >= BX && x <= BX + BW && y >= bottomY() - F && y <= bottomY() ? x : null; tapY = tapX == null ? null : y;
  press(clampN(Math.floor((x - BX) / CW), 0, 2));
});
let lastTap = { t: -1e9, x: 0, y: 0 };
const once = (el, fn) => el.addEventListener('pointerdown', e => { // 두 번 톡: 둘째 톡이 새 화면의 다른 단추를 누르지 않게 같은 자리 0.3초 안은 버린다
  e.preventDefault(); e.stopPropagation();
  const now = performance.now(), twice = now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 48;
  lastTap = { t: now, x: e.clientX, y: e.clientY };
  if (!twice) fn();
});
once(document.getElementById('start'), beginFromTitle);
once(againEl, () => { if (endMain) endMain(); });
once(again2El, () => { if (endSub) endSub(); });
once(mapBtn, () => { if (scene === 'end' || scene === 'card') goBack(); });
once(backEl, () => { if (scene === 'map') showFork(); });
once(homeEl, goHome);
homeEl.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) goHome(); } });
once(document.getElementById('bombBtn'), () => { audioInit(); if (scene !== 'play' || paused) return; if (sim.s.teach) { sim.dismissTeach(); return; } if (!sim.useBomb()) sfxLow(); });
once(document.getElementById('goOn'), resumeGame);
once(document.getElementById('restart'), () => { pauseEl.hidden = true; paused = false; audioResume(); startRun(firstTutorial()); });
once(pauseBtn, () => pauseGame(true));
const KEYS = { 1: 0, 2: 1, 3: 2, a: 0, s: 1, d: 2, arrowleft: 0, arrowdown: 1, arrowup: 1, arrowright: 2 };
addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'home' && (scene === 'fork' || scene === 'map')) { e.preventDefault(); goHome(); return; }
  if (scene === 'title') { if (k === 'enter' || k === ' ') { e.preventDefault(); beginFromTitle(); } return; }
  if (scene === 'end' || scene === 'card') { if ((k === 'enter' || k === ' ') && performance.now() - lastEnd > 400 && endMain) { e.preventDefault(); endMain(); } return; }
  if (scene === 'fork') { if (k === 'enter' || k === ' ') { e.preventDefault(); enterDoor(1); } else if (k === '1' || k === '2' || k === '3') enterDoor(+k - 1); return; }
  if (scene === 'map') { if (k === 'enter' || k === ' ') { e.preventDefault(); const sts = mapList.map(m => m.st), st = sts.find(v => isOpen(v) && !clearedStage(v)) || (sts.includes(STAGE) ? STAGE : sts[0]); showCard(st); } else if (k === 'escape' || k === 'backspace') showFork(); return; }
  if (scene === 'play' && !paused && sim.s.teach) { e.preventDefault(); sim.dismissTeach(); return; }
  if (scene === 'play' && !paused && (k === ' ' || k === 'b')) { e.preventDefault(); sim.useBomb(); return; }
  if (paused) { if (k === 'enter' || k === ' ') { e.preventDefault(); resumeGame(); } return; }
  if (k === 'escape' && !window.GF.inFrame) { pauseGame(true); return; }
  if (KEYS[k] == null) return;
  e.preventDefault(); press(KEYS[k]);
});
['dblclick', 'gesturestart'].forEach(ev => addEventListener(ev, e => e.preventDefault(), { passive: false }));

/* ---------- 돌리기: 놀이는 고정 간격, 효과는 흐른 시간 ---------- */
const STEP = 1 / 60; let acc = 0, lastFrame = performance.now();
function simStep(dt) {
  const s = sim.s;
  if (bot) { if (s.teach && s.teachT > 1) sim.dismissTeach(); bot(dt); }
  sim.step(dt);
  for (const e of s.events) {
    onEvent(e);
    if (e.t === 'teach') window.GF.save(save);
    if (e.t === 'clear') { // 사이트 도장 알림이 끝 화면 제목을 가리지 않게 와르르 순간에 받는다
      endT = 0; lastFloor = false;
      if (STAGE.firstPractice) save.tutDone = true;
      else {
        const best = save.stages[STAGE.id] || (save.stages[STAGE.id] = { clear: false, floors: 0, streak: 0 }); best.clear = true;
        if (STAGE.id === 1) window.GF.stamp('first'); if (STAGE.final) window.GF.stamp('castle');
      }
      window.GF.save(save);
    }
    if (e.t === 'over') { overT = 0; rumble(false); musicOn = false; musicLevel(0, .2); sfxOver(); cv.style.filter = 'grayscale(1) brightness(.92)'; }
    window.__wreck.counts[e.t] = (window.__wreck.counts[e.t] || 0) + 1;
  }
  s.events.length = 0;
}
function tick(rdt) {
  if (artReady && (devicePixelRatio || 1) !== DPR) relayout(); // 창을 옮기면 배율만 바뀌기도 한다
  if (scene === 'play' && !paused) {
    const slow = sim.s.phase === 'over' ? .4 : fxSlowT > 0 ? .35 : 1;
    acc += rdt * slow;
    while (acc >= STEP) { simStep(STEP); acc -= STEP; }
    const s = sim.s;
    updateFx(s.freeze > 0 ? 0 : rdt * slow, rdt);
    if (endT >= 0) {
      const before = endT; endT += rdt;
      if (before < .5 && endT >= .5) musicLevel(MUS_VOL, .6);
      if (before < .95 && endT >= .95) sfxClear();
      if (before < .95 && endT >= .95 && hero.mode !== 'hop') { hero.mode = 'hop'; hero.t = 0; hero.x0 = hero.x; hero.y0 = hero.y; } // 돼지 왕이 떨어진 뒤 그 앞으로 뛰어간다
      if (before < 2.4 && endT >= 2.4 && !overShown) { overShown = true; showEnd('clear'); }
    }
    if (overT >= 0) { overT += rdt; if (overT >= 2.2 && !overShown) { overShown = true; showEnd('over'); } }
    if (s.phase === 'play' && s.gap < .9 && !s.teach) { dangerBeat -= rdt; if (dangerBeat <= 0) { dangerBeat = .5; sfxDanger(); } }
  } else if (scene === 'end') { updateFx(rdt, rdt); }
  if (!paused) musicTick();
  const tid = scene === 'play' ? sim.s.teach : null;
  if (tid !== shownTeach) { shownTeach = tid; teachEl.hidden = !tid; if (tid) { teachEl.textContent = typeof TEACH[tid] === 'function' ? TEACH[tid](sim.s.cur) : TEACH[tid]; placeTeach(tid); } }
  draw();
}
function frame(now) {
  const rdt = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now;
  tick(rdt);
  requestAnimationFrame(frame);
}

window.GF.on('pause', () => pauseGame(false));
window.GF.on('resume', resumeGame);
window.GF.on('home', goHome);
window.GF.on('sound', ({ on }) => audioMute(!on));
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(!window.GF.inFrame); else if (scene !== 'play') audioResume(); });
function relayout() { layout(); placeHome(); placeBomb(); if (shownTeach) placeTeach(shownTeach); if (scene === 'map') renderMap(); if (scene === 'fork') renderFork(); if (hero.mode !== 'gone') { hero.x = clampN(hero.x, 0, W); hero.y = groundY(hero.x); } for (const c of crowd) c.x = c.gone ? (c.side < 0 ? -24 : W + 24) : crowdHome(c); castStage(sim.s.building, true); paintEnd(); }
addEventListener('resize', () => { const was = WIDE; if (artReady) relayout(); if (WIDE !== was && scene === 'play') pauseGame(true); }); // 폰을 돌리면 판이 바뀌니 멈춰 두고 이어 하게 한다(크기만 바뀌면 그대로)

window.__wreck = {
  counts: {}, events, hero, tick,
  showMap: (kind = 'adv') => showMap(kind), showFork: () => showFork(), showCard: id => showCard(stageById(id)), get mapKind() { return mapKind; },
  get stage() { return STAGE; }, get sim() { return sim; }, get scene() { return scene; }, get paused() { return paused; }, get save() { return save; },
  metrics: cssMetrics,
  get particles() { return { chunks: chunks.length, dust: dust.length, sparks: sparks.length, puffs: puffs.length, floats: floats.length }; },
};
pauseBtn.hidden = window.GF.inFrame;
siteState('title');
sim = makeSim(false);
const loadEl = document.getElementById('load'), startEl = document.getElementById('start');
// 그림 한 장을 받아야 화면을 그릴 수 있다. 못 받으면 까닭과 다시 불러오기를 보여 준다
art.onload = () => {
  artReady = true; loadEl.hidden = true; startEl.hidden = false; creditVisibility(scene === 'title');
  layout(); if (STAGE.id !== 1) setLook(STAGE.look || STAGE.id); resetFx(); window.GF.ready();
  if (Q.get('play') === '1') {
    titleEl.hidden = true;
    if (!Q.has('stage') && canLeave()) showFork();
    else { if (!Q.has('stage')) STAGE = Rules.FIRST_PRACTICE; startRun(firstTutorial()); }
  }
  else if (Q.get('start') === '1') beginFromTitle(); // 사이트 「처음부터」: 같은 단계로. 단계 번호 0인 처음 연습은 첫 판 흐름으로 돌아온다.
  if (!MANUAL) requestAnimationFrame(frame);
};
art.onerror = () => { document.getElementById('loadMsg').textContent = '그림을 불러오지 못했어요'; document.getElementById('reload').hidden = false; window.GF.ready(); };
once(document.getElementById('reload'), () => location.reload());
art.src = 'art/atlas.png';
