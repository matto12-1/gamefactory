// 팔도 잔치(판 13, 2026-11-13 아홉 마을로): 아홉 지역 곡을 마을마다 몇 쌍씩 이어 부른다. 곡의 놀이 틀 · 그림 · 소리 · 판정은 그 곡 그대로 쓰고,
// 마을이 바뀔 때 화면이 왼쪽으로 흘러가고 다음 마을이 오른쪽에서 들어온다. 점수는 아홉 마을 칠 곳을 모두 더한다.
// song은 늘 지금 마을의 진짜 곡이다. 잔치인지는 feastRun 하나로 가린다(game.js가 몇 줄로 잇는다)
const FEAST = {
  id: 'feast', title: '팔도 잔치', work: '잔치', level: '어려움', region: null,
  about: '아홉 지역 노래를 마을마다 이어 불러요', startWork: '아홉 마을 노래를 이어 불러요',
  // 마을마다 마디 구간(곡의 bars() 번호, 양끝 포함). 15~22초 · 칠 곳 5~8. 신고산은 메김 둘째 줄부터. 강강술래는 느린 대목 뒤, 쾌지나는 끝 한 방까지.
  // 남쪽에서 올라가 북쪽을 돌고 강원 · 경상으로 내려와 쾌지나로 끝낸다(제주 → 전라 → 충청 → 경기 → 황해 → 평안 → 함경 → 강원 → 경상)
  parts: [
    { id: 'myeolchi', from: 1, to: 4 }, { id: 'ganggang', from: 5, to: 8 }, { id: 'garae', from: 1, to: 4 },
    { id: 'baennorae', from: 3, to: 8 }, { id: 'punggu', from: 1, to: 4 }, { id: 'jajinari', from: 1, to: 2 }, { id: 'singosan', from: 2, to: 4 },
    { id: 'unjae', from: 1, to: 8 }, { id: 'kwaeji', from: 13, to: 17 },
  ],
  stamps: [null, '한 고을', '여러 고을', '팔도'], fullStamp: '팔도 잔치', topStamp: '앞소리꾼', sealDir: 'feast', fullSeal: 5,
  sealFiles: { 1: 'art/feast/seal-1.88ca099a05e5.png', 2: 'art/feast/seal-2.182f1955ab8b.png', 3: 'art/feast/seal-3.8c16faa8ceb6.png', 4: 'art/feast/seal-4.73c498c083a2.png', 5: 'art/feast/seal-5.0130fb7daac1.png' },
  say: { zero: '마을 사람들이 기다리다 돌아갔네', 1: '한 고을이 따라 불렀네', 2: '여러 고을이 들썩였네', 3: '팔도 사람이 다 모였네!', full: '팔도 잔치가 열렸다!', top: '다음 앞소리는 네가 메겨라!' },
};
let feastRun = null;
const FEAST_LEAD = 4.5; // 마을 이름과 여러 줄 출처를 읽은 뒤 메김을 시작한다. 띠와 말풍선은 함께 뜨지 않는다
const feastSong = k => window.MINYO.SONGS.find(s => s.id === FEAST.parts[k].id);
// 잔치 마디: 고른 구간만, 번호는 0부터 다시(songBars[i]와 맞게)
function feastBars(s) {
  const p = FEAST.parts[feastRun.i];
  return s.bars().filter(b => b.i >= p.from && b.i <= p.to).map((b, i) => ({ ...b, i }));
}
function feastNew() { return { i: 0, results: [], charged: 0, best: 0, extra: 0, gap: false, ready: false, tryNo: 0 }; }
const feastArtId = s => (s.ring ? s.ringArt || 'ganggang' : s.id);
// 지도 곡 목록의 「팔도 잔치」를 누르면: 첫 마을 곡으로 시작 창을 열고 글만 잔치로 바꾼다. 녹음은 미리 받아 둔다
function toFeast() {
  feastRun = feastNew();
  toStart(feastSong(0));
  // 첫 마을 그림이 온 뒤에 나머지 마을을 받는다(함께 받으면 시작 창 장면이 늦게 뜬다)
  const f = feastRun;
  Promise.resolve(songArtReady(feastArtId(feastSong(0)))).then(() => {
    if (feastRun !== f) return;
    for (let k = 1; k < FEAST.parts.length; k++) { const s = feastSong(k); voiceFetch(s); fetchSongSfx(s).catch(() => {}); feastPrefetchArt(s); }
  });
}
// 다음 마을 그림을 지금 장면을 바꾸지 않고 받아 둔다(같은 주소라 바꿀 때는 받아 둔 것을 쓴다)
function feastPrefetchArt(s) {
  const id = feastArtId(s), art = SONG_ART[id]; if (!art) return;
  if (s.net || s.boat) loadArtSet(art.dir, art.names);
  else if (!artSets[id]) artSets[id] = loadArtSet(art.dir, art.names);
}
function feastRestart() { feastRun = feastNew(); setSong(feastSong(0)); }
// 한 마을의 결과를 잔치 장부에 옮긴다
function feastKeep() {
  for (const t of targets) if (typeof t.part === 'number') feastRun.results.push({ res: t.res, d: t.d, part: t.part, second: t.second, song: song.id });
  feastRun.charged += sc.charged; feastRun.best = Math.max(feastRun.best, sc.best); feastRun.extra += sc.extra;
}
// 마을 끝: 꽹과리 한 번, 지금 화면을 찍어 두고 다음 곡을 받는 동안 멈춰 있다가 흘러 들어온다
function feastNext() {
  const f = feastRun; f.gap = true;
  feastKeep();
  log('feast-part', { i: f.i, song: song.id, n: f.results.length });
  killSound(); sample('kkw-gaeng', ctx.currentTime + .02, .7);
  feastShotTake();
  f.i++;
  const s = feastSong(f.i);
  setSong(s);
  feastLoad(f, s, ++f.tryNo);
}
// 다음 마을 그림 · 녹음이 다 와야 시작한다. 못 받으면 지금까지 결과는 그대로 두고 「다시 불러오기」
function feastLoad(f, s, tryNo) {
  const loaded = Promise.all([songArtReady(feastArtId(s)), voiceReady(s), sfxReady(), fetchSongSfx(s).catch(() => {}), new Promise(r => setTimeout(r, 600))]).then(r => r[0] !== false);
  Promise.race([loaded, new Promise(done => setTimeout(() => done(false), LOAD_LIMIT_MS))]).then(ok => {
    if (feastRun !== f || f.tryNo !== tryNo || state !== 'song') return;
    // 줄 판은 그림을 못 받으면 강강술래 사람으로 대신 그린다(net.placeholder). 잔치에서는 그것도 못 받은 것으로 보고 다시 받는다
    if (ok && s.net && net.placeholder) { ok = false; artNow = null; netArtPromise = null; artTry++; }
    if (!ok || (s.voice && !voiceOk(s))) { dropArtWaits(feastArtId(s)); feastLoadFail(f, s); return; }
    f.ready = true;
    if (!paused) feastGo(); // 마을 사이에 멈췄으면 이어 하기에서 시작한다(resumeGame)
  });
}
function feastGo() {
  const f = feastRun; if (!f || !f.gap || !f.ready || paused) return;
  f.ready = false;
  startSong(false);
  if (song.boat || song.net || song.ring) sample('kkw-gaeng', ctx.currentTime + .05, .5); // 들어올 때 꽹과리. 풍물 곡(쾌지나)은 enterBand가 이미 친다
  f.gap = false;
  feastSlideIn();
}
function feastLoadFail(f, s) {
  log('feast-load-error', { i: f.i, song: s.id });
  const el = document.getElementById('feastBand'), retry = document.getElementById('feastRetry');
  clearTimeout(feastBandTimer);
  el.querySelector('span').textContent = `${f.i + 1} / ${FEAST.parts.length}`;
  el.querySelector('b').textContent = '다음 마을 노래를 못 불러왔어요';
  el.querySelector('small').textContent = '';
  retry.hidden = false; el.hidden = false;
  retry.onclick = () => { retry.hidden = true; el.hidden = true; feastLoad(f, s, ++f.tryNo); };
}
// 멈춘 화면 사진을 캔버스 위에 덮는다(다음 마을이 그려지는 동안 보이지 않게)
let feastShot = null, feastWords = null;
function feastShotTake() {
  if (!feastShot) { feastShot = document.createElement('canvas'); feastShot.id = 'feastShot'; cv.after(feastShot); }
  if (!feastWords) { feastWords = document.createElement('div'); feastWords.id = 'feastWords'; feastShot.after(feastWords); }
  // 말풍선 종이는 그림 판, 글은 화면 글자다. 둘을 함께 묶어야 마을이 밀려갈 때 빈 종이만 남지 않는다.
  feastWords.replaceChildren(...[...cheerTextNodes.values()].filter(el => !el.hidden && +getComputedStyle(el).opacity > 0).map(el => el.cloneNode(true)));
  feastWords.style.transition = 'none'; feastWords.style.transform = ''; feastWords.hidden = false;
  feastShot.width = CVW; feastShot.height = CVH; const shot = feastShot.getContext('2d'); shot.imageSmoothingEnabled = false; shot.drawImage(cv, 0, 0, VW * K, VH * K);
  feastShot.style.transition = 'none'; feastShot.style.transform = ''; feastShot.hidden = false;
  document.body.classList.add('feastGap');
}
function feastSlideIn() {
  const done = () => { feastShot.hidden = true; feastWords.hidden = true; feastWords.replaceChildren(); feastWords.style.transition = feastWords.style.transform = ''; feastShot.style.transition = cv.style.transition = ''; feastShot.style.transform = cv.style.transform = ''; document.body.classList.remove('feastGap'); };
  if (RM) { done(); return; }
  cv.style.transition = 'none'; cv.style.transform = 'translateX(100%)';
  void cv.offsetWidth;
  requestAnimationFrame(() => {
    cv.style.transition = feastShot.style.transition = feastWords.style.transition = 'transform .9s ease-in-out';
    cv.style.transform = ''; feastShot.style.transform = feastWords.style.transform = 'translateX(-100%)';
    setTimeout(done, 950);
  });
}
// 마을 띠: 새 마을이 시작할 때 위에 「강원도 · 화천 운재소리」와 출처. 첫 메김 바로 전에 내린다(낮은 화면에서는 띠가 말풍선 자리까지 내려온다)
let feastBandTimer = 0;
function feastBand(s) {
  const el = document.getElementById('feastBand');
  el.querySelector('b').textContent = `${window.MINYO.REGIONS[s.region].full} · ${s.title}`;
  el.querySelector('small').textContent = (s.credit || '').replace('CC BY 표시', '저작자 표시');
  el.querySelector('span').textContent = `${feastRun.i + 1} / ${FEAST.parts.length}`;
  document.getElementById('feastRetry').hidden = true; el.hidden = false; clearTimeout(feastBandTimer);
  feastBandTimer = setTimeout(() => { el.hidden = true; }, Math.max(600, (nextT - ctx.currentTime - .05) * 1000));
}
function feastClear() {
  feastRun = null; clearTimeout(feastBandTimer);
  const el = document.getElementById('feastBand'); if (el) el.hidden = true;
  const retry = document.getElementById('feastRetry'); if (retry) retry.hidden = true;
  if (feastShot) feastShot.hidden = true;
  if (feastWords) { feastWords.hidden = true; feastWords.replaceChildren(); }
  document.body.classList.remove('feastGap'); cv.style.transform = cv.style.transition = '';
}
// 잔치 끝: 아홉 마을 칠 곳을 더해 도장 하나
function feastFinish() {
  state = 'end';
  feastKeep();
  const list = feastRun.results, res = Rules.summarize(list), stamp = Rules.stampFor(res.ratio), perfect = res.n > 0 && res.hits === res.n;
  const topInput = { ...res, charged: feastRun.charged }, top = Rules.isTop(topInput); // 앞소리꾼: 곡 하나일 때와 같은 기준(딱 맞음 비율 · 꾹 눌렀다 떼기 수)
  save = Rules.recordSong(save, FEAST.id, stamp, perfect, top);
  lastStamp = stamp;
  const saved = window.GF.save(save);
  window.GF.stamp('first');
  lastSummary = { song: FEAST.id, feast: true, ...res, stamp, top, hard: false, best: feastRun.best, charged: feastRun.charged, extra: feastRun.extra, parts: FEAST.parts.map(p => p.id) };
  log('end', lastSummary);
  const mistake = Rules.mainMistake(list);
  Screens.showEnd(FEAST, res, stamp, list.map(t => (!Rules.isHit(t.res) ? 0 : t.res === 'perfect' ? 2 : 1)), {
    say: top ? FEAST.say.top : FEAST.say[Rules.sayKey(res, stamp)], perfect, top, hardOk: false, hardRun: false, hardOpen: false,
    tip: saved === false ? '이 기기에는 기록이 남지 않아요' : window.MINYO.TIPS[mistake] || '',
    next: top ? '' : perfect ? `${FEAST.topStamp}까지 ${[Rules.topNeed(res) && `딱 맞음 ${Rules.topNeed(res)}번`, Rules.topHoldNeed(topInput) && `꾹 눌렀다 떼기 ${Rules.topHoldNeed(topInput)}번`].filter(Boolean).join(', ')} 더` : stamp === 3 ? `${FEAST.fullStamp}까지 ${res.n - res.hits}곳 더` : `${FEAST.stamps[stamp + 1]}까지 ${Rules.hitsFor(res.n, stamp + 1) - res.hits}곳 더`,
    up: '', calib: false,
  });
}
