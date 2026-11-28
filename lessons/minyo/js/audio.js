// 팔도 장단 소리: 받아 둔 소리 파일(sfx/)을 먼저 쓰고, 없으면 합성. 실제 녹음 곡은 voice/의 조각을 마디마다 정확한 때에 튼다
// ───────── 소리 ─────────
let ctx = null, master, music, sfx, noiseBuf, limiter, songTrim, mixOut;
const MASTER = 0.72; // 악기가 다 들어온 판도 -18 LUFS 안에 들게 한다
// 곡마다 크기 맞춤(dB, 없으면 0). 2026-11-20 열한 곡을 다 맞힘 판으로 녹음해 잼(출시 판정 소리 분야, tools/minyo-loudness.mjs).
// -18.5 LUFS보다 작던 여섯 곡을 -18 언저리로 올렸다. 쾌지나(-16.4)는 곡 사이 폭을 줄이려고 -1.6(2026-11-21 그래프 검수 R5-03). 나머지는 그대로(거문도 -18.4 등)
const SONG_DB = { kwaeji: -1.6, garae: -.2, myeolchi: -.4, geomun: -1.7, baennorae: -1.7, unjae: -.7, punggu: 1, jajinari: 1, singosan: 1.3 };
// 끝 단 최고값 막기: -6dB 위만 부드럽게 눌러 -2dB 밑에 둔다. 큰 순간이 겹칠 때만 닿는다(곡마다 50ms 칸 1,000여 개 중 3~44칸).
// 압축기를 하나 더 두면 미리 보기만큼(약 6ms) 소리가 늦어 박 판정이 밀리므로 파형 깎기를 쓴다. 앞에서 반으로 줄여 넣어 +6dB까지 받는다
function clipCurve() {
  const K = Math.pow(10, -6 / 20), W = Math.pow(10, -2 / 20) - K, n = 4097, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1) * 2 - 1) * 2, a = Math.abs(x); c[i] = Math.sign(x) * (a <= K ? a : K + W * Math.tanh((a - K) / W)); }
  return c;
}
let crowd, doubles, band; // 내 손을 따라오는 소리: 받는 소리 · 받는 소리 겹 · 뒤에 들어오는 악기
function makeBuses() {
  music = ctx.createGain(); music.gain.value = 0.6; music.connect(master);
  sfx = ctx.createGain(); sfx.gain.value = 1.0; sfx.connect(master);
  crowd = ctx.createGain(); crowd.connect(music);
  doubles = ctx.createGain(); doubles.connect(music);
  band = ctx.createGain(); band.connect(music);
}
// 맞히면 다 같이 들어오고, 놓치면 겹소리가 빠지고 악기와 받는 소리가 줄어든다
const HAND_LEVELS = { hit: [1, 1, 1], miss: [0.72, 0.0001, 0.4] };
function followHand(kind, t = ctx.currentTime) {
  const v = HAND_LEVELS[kind];
  [crowd, doubles, band].forEach((g, i) => {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v[i], t + 0.05);
  });
}
// 소리 파일: 먼저 받아 두고, 첫 누름 때 푼다. 없거나 못 풀면 합성으로 이어 간다
const SFX_FILES = ['flail-1', 'flail-2', 'flail-3', 'straw-1', 'straw-2', 'whoosh', 'jg-deong', 'jg-deok', 'jg-kung', 'jg-kideok', 'jg-deoreoreo', 'kkw-gaeng', 'kkw-dak', 'kkw-dak-soft', 'buk', 'sogo', 'sogo-2', 'sogo-3', 'jing', 'quail', 'flap', 'pop',
  'step', 'step-2', 'step-soft', 'step-soft-2', 'shuffle', 'clap', 'clap-2', 'clap-3']; // 강강술래: 발 구르기 · 원 발소리 · 발 끄는 소리 · 구경꾼 박수
const NET_SFX_FILES = ['pull', 'pull-2', 'pull-soft', 'pull-soft-2', 'creak', 'creak-2', 'creak-3', 'splash', 'flop', 'gull-1', 'gull-2', 'wave-1', 'wave-2'];
const RING_SFX_FILES = ['step', 'step-2', 'step-soft', 'step-soft-2', 'shuffle', 'clap', 'clap-2', 'clap-3'];
const BOAT_SFX_FILES = ['row', 'row-2', 'row-soft', 'row-soft-2', 'oar-creak', 'drip', 'fish-jump', 'flag-up', 'splash', 'wave-1', 'wave-2', 'gull-1', 'gull-2'];
SFX_FILES.push(...NET_SFX_FILES);
SFX_FILES.push(...BOAT_SFX_FILES.filter(n => !SFX_FILES.includes(n)));
// 풍구 · 자진아리 도리깨: flail 세 벌의 몸통을 다른 곡 치는 소리(가장 큰 50ms -12.5dBFS)만큼 키우고 끝을 -1dBFS로 눌러 만든 벌(2026-11-21). 그 곡을 열 때 받는다
const DOLI_SFX_FILES = ['doli', 'doli-2', 'doli-3'];
SFX_FILES.push(...DOLI_SFX_FILES);
// 쾌지나 장구 반주 · 추임새 벌(그래프 검수 5회차 R6-01): 기덕 · 더러러러 · 쿵 둘째는 국립국악원 단음의 다른 타, 덩 · 덕 · 쿵 셋째는 첫 벌 높이 ±3%. 마당 곡을 열 때 받는다
const JANG_VAR_FILES = ['jg-deong-2', 'jg-deong-3', 'jg-deok-2', 'jg-deok-3', 'jg-kideok-2', 'jg-kideok-3', 'jg-kung-2', 'jg-kung-3', 'jg-deoreoreo-2', 'jg-deoreoreo-3'];
SFX_FILES.push(...JANG_VAR_FILES);
// 자주 나는 소리는 벌을 돌려 쓴다(이름-2 · 이름-3). 바로 앞 벌은 피한다
const SFX_VARS = {}, lastVar = {};
for (const n of SFX_FILES) { const m = n.match(/^(.+)-([23])$/); if (m && SFX_FILES.includes(m[1])) (SFX_VARS[m[1]] = SFX_VARS[m[1]] || [m[1]]).push(n); }
function varOf(n) {
  const list = SFX_VARS[n] && SFX_VARS[n].filter(k => sfxBuf[k] && k !== lastVar[n]);
  if (!list || !list.length) return sfxBuf[lastVar[n]] ? lastVar[n] : n; // 풀린 벌이 하나뿐이면 그것을 다시 쓴다
  return (lastVar[n] = list[Math.floor(Math.random() * list.length)]);
}
const sfxRaw = {}, sfxBuf = {};
// 기본 효과음은 곡 · 이야기 · 잔치를 처음 고를 때(setSong → fetchSongSfx) 받는다. 지도만 볼 때는 받지 않는다(그래프 검수 3회차 R5-05, 첫 화면 약 0.67MB)
let sfxFetchedP = null;
const sfxFetched = () => sfxFetchedP || (sfxFetchedP = Promise.all(SFX_FILES.filter(n => !NET_SFX_FILES.includes(n) && !RING_SFX_FILES.includes(n) && !BOAT_SFX_FILES.includes(n) && !DOLI_SFX_FILES.includes(n) && !JANG_VAR_FILES.includes(n)).map(n => fetch(`sfx/${n}.wav`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => { if (b) sfxRaw[n] = b; }).catch(() => {}))));
let sfxDecoding = null;
const songSfxPromises = {};
function fetchSongSfx(s) {
  sfxFetched();
  const names = s.boat ? [...BOAT_SFX_FILES,...(s.boatScene?.river?['clap','clap-2','clap-3']:[])] : s.net ? [...NET_SFX_FILES, 'step-soft', 'step-soft-2', ...(s.netScene?.yard ? ['shuffle', 'clap', 'clap-2'] : s.netScene?.slope ? ['shuffle', 'clap', 'clap-2', 'flap'] : s.netScene?.kind === 'forge' ? ['shuffle', 'clap', 'clap-2', 'daljip-fire'] : s.netScene?.kind === 'dance' ? ['shuffle', 'clap', 'clap-2', 'clap-3'] : s.netScene?.kind === 'dungdang' ? ['shuffle', 'clap', 'clap-2', 'buk', 'sogo', 'sogo-2', 'drip', 'splash'] : s.netScene?.kind ? ['shuffle', 'clap', 'clap-2'] : []), ...(s.voice?.hit === 'doli' ? DOLI_SFX_FILES : [])] : s.ring ? [...RING_SFX_FILES, ...(s.ringArt === 'wolwol' ? ['daljip-fire'] : [])] : ['step-soft', 'step-soft-2', 'shuffle']; // 마당 판(쾌지나) 놓침 · 주저앉음 소리(그래프 검수 5회차 R1-01). 장구 벌은 fetchJangVars가 판 시작 뒤에 받는다
  if (!names.length) return Promise.resolve();
  if (!songSfxPromises[s.id]) {
    sfxDecoding = null;
    songSfxPromises[s.id] = Promise.all(names.filter(n => !sfxRaw[n]).map(n => fetch(`sfx/${n}.wav`).then(r => { if (!r.ok) throw Error(n); return r.arrayBuffer(); }).then(b => { sfxRaw[n] = b; }).catch(e => { log('sound-load-error', { file: n, detail: String(e) }); return false; }))).then(results => { if (results.includes(false)) delete songSfxPromises[s.id]; });
  }
  return songSfxPromises[s.id];
}
// 장구 벌(-2 · -3, 10개 428KB)은 없어도 varOf가 기본 벌을 쓰니 놀이 시작까지 받는 양에 넣지 않고, 쾌지나 판이 시작된 뒤 뒤에서 받아 푼다(그래프 검수 5회차 R6-01)
let jangVarP = null;
function fetchJangVars() {
  if (jangVarP || !ctx || ctx.silent) return jangVarP;
  return (jangVarP = Promise.all(JANG_VAR_FILES.map(n => fetch(`sfx/${n}.wav`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => b && ctx.decodeAudioData(b)).then(b => { if (b) sfxBuf[n] = b; }).catch(() => {}))));
}
function sfxReady() {
  if (!ctx || ctx.silent) return Promise.resolve();
  if (!sfxDecoding) sfxDecoding = Promise.all([sfxFetched(), fetchSongSfx(song)]).then(() => Promise.all(Object.keys(sfxRaw).map(n => ctx.decodeAudioData(sfxRaw[n].slice(0)).then(b => { sfxBuf[n] = b; }).catch(() => {}))));
  return Promise.race([sfxDecoding, new Promise(done => setTimeout(done, 1500))]);
}
function sample(n, t, v = 1, bus = sfx, rate = 1, fixed = false) { // fixed: 벌을 돌리지 않고 첫 벌(박 맞추기 장구)
  const b = sfxBuf[fixed ? n : varOf(n)]; if (!b) return false;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const gn = ctx.createGain(); gn.gain.value = v; s.connect(gn); gn.connect(bus); s.start(t);
  return true;
}
// 실제 민요 녹음: 시작 창에서 미리 받아 두고, 첫 누름 때 푼다
const voiceRaw = {}, voiceBuf = {};
let continuousVoice = null;
function voiceFetch(s) {
  if (!s || !s.voice) return Promise.resolve();
  // 못 받은 녹음도 치는 소리(sfx)처럼 기록에 남긴다(그래프 검수 R5-06). log는 game.js에 있고 부를 때는 이미 실려 있다
  const miss = n => { if (typeof log === 'function') log('sound-load-error', { file: `voice/${n}.mp3` }); };
  return Promise.all(s.voice.files.map(n => (voiceRaw[n] ? null : fetch(`voice/${n}.mp3`).then(r => (r.ok ? r.arrayBuffer() : (miss(n), null))).then(b => { if (b) voiceRaw[n] = b; }).catch(() => miss(n)))));
}
function voiceReady(s) {
  if (!s || !s.voice || !ctx || ctx.silent) return Promise.resolve();
  return voiceFetch(s).then(() => Promise.all(s.voice.files.map(n => (voiceBuf[n] || !voiceRaw[n] ? null : ctx.decodeAudioData(voiceRaw[n].slice(0)).then(b => { voiceBuf[n] = b; }).catch(() => {})))));
}
// 조각의 from초부터 dur초를 t에 튼다. 양 끝을 XF초씩 줄여 같은 조각을 이을 때 소리 크기가 그대로다
const XF = 0.02;
const voiceOk = s => !ctx || ctx.silent || s.voice.files.every(n => voiceBuf[n]);
function playVoice(n, from, dur, t, v = 1, bus = music, rate = 1, pan = 0, fadeOut = XF, fadeIn = XF) {
  const b = voiceBuf[n]; if (!b) return false;
  const late = Math.max(0, ctx.currentTime - t);
  const t0 = t + late, left = Math.min(dur - late, b.duration - from - late);
  if (left <= 0) return false;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.linearRampToValueAtTime(v, t0 + fadeIn);
  gn.gain.setValueAtTime(v, t0 + Math.max(fadeIn + 0.001, left - fadeOut)); gn.gain.linearRampToValueAtTime(0.0001, t0 + left);
  s.connect(gn);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; gn.connect(p); p.connect(bus); } else gn.connect(bus);
  s.start(t0, from + late, left + 0.01);
  return true;
}
let lastFlail = 0, lastStraw = 0;
function silentContext() {
  const node = () => new Proxy(function () {}, {
    get: (t, k) => (typeof k === 'symbol' ? undefined : k === 'length' ? 0 : k === 'valueOf' || k === 'toString' ? () => 0 : node()),
    set: () => true, apply: () => node(),
  });
  const started = performance.now(); let frozen = null, lost = 0;
  const make = () => node();
  return {
    silent: true, state: 'running', destination: node(), sampleRate: 44100,
    get currentTime() { return ((frozen === null ? performance.now() : frozen) - started - lost) / 1000; },
    resume() { if (frozen !== null) { lost += performance.now() - frozen; frozen = null; } return Promise.resolve(); },
    suspend() { if (frozen === null) frozen = performance.now(); return Promise.resolve(); },
    createGain: make, createOscillator: make, createBufferSource: make, createBiquadFilter: make, createDynamicsCompressor: make, createBuffer: make, createStereoPanner: make, createWaveShaper: make,
  };
}
function initAudio() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
  // 소리 오류는 놀이를 멈추지 않는다: 소리를 못 내는 기기에서는 조용한 시계로 이어 간다
  try { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); }
  catch (e) { ctx = silentContext(); }
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  limiter = comp;
  master = ctx.createGain(); master.gain.value = MASTER; master.connect(comp); songTrim = ctx.createGain(); comp.connect(songTrim);
  const clipIn = ctx.createGain(); clipIn.gain.value = .5; mixOut = ctx.createWaveShaper(); mixOut.curve = clipCurve(); mixOut.oversample = '2x';
  songTrim.connect(clipIn); clipIn.connect(mixOut); mixOut.connect(ctx.destination);
  makeBuses();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function killSound() { // 걸어 둔 소리를 모두 끊는다
  try { music.disconnect(); sfx.disconnect(); } catch (e) {}
  makeBuses();
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function env(gn, t, a, peak, hold, rel) {
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(peak, t + a);
  gn.gain.setValueAtTime(peak, t + a + hold);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  return t + a + hold + rel;
}
function noise(t, dur, type, freq, q, peak, bus, rate = 1) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rate;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = ctx.createGain(); const end = env(gn, t, 0.002, peak, 0, dur);
  s.connect(f); f.connect(gn); gn.connect(bus); s.start(t, Math.random() * 0.5); s.stop(end + 0.02);
  return f;
}
function tone(t, type, f0, f1, dur, peak, bus) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const gn = ctx.createGain(); const end = env(gn, t, 0.003, peak, 0, dur);
  o.connect(gn); gn.connect(bus); o.start(t); o.stop(end + 0.02);
}
function leadNote(t, dur, m, vol = 0.16) { // 메기는 소리: 피리 결
  const f = hz(m);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 6;
  [o1, o2].forEach(o => { o.frequency.setValueAtTime(f * 0.982, t); o.frequency.linearRampToValueAtTime(f, t + 0.07); });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.6;
  const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.011, t + Math.min(dur * 0.8, 0.45));
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 1.2;
  const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1200; pk.gain.value = 5;
  const gn = ctx.createGain(); const hold = Math.max(0, dur - 0.06);
  const end = env(gn, t, 0.025, vol, hold * 0.85, Math.max(0.06, hold * 0.2));
  o1.connect(lp); o2.connect(lp); lp.connect(pk); pk.connect(gn); gn.connect(music);
  [o1, o2, lfo].forEach(o => { o.start(t); o.stop(end + 0.03); });
}
function chorusNote(t, dur, m) { // 받는 소리: 여럿이
  [-11, 0, 9].forEach((dt, i) => {
    const o = ctx.createOscillator(); o.type = i === 1 ? 'sawtooth' : 'triangle'; o.frequency.value = hz(m - 12); o.detune.value = dt;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const gn = ctx.createGain(); const hold = Math.max(0, dur - 0.05);
    const end = env(gn, t + i * 0.008, 0.03, 0.07, hold * 0.85, Math.max(0.06, hold * 0.2));
    o.connect(lp); lp.connect(gn); gn.connect(music); o.start(t); o.stop(end + 0.03);
  });
}
// 국립국악원 단음(공공누리 제1유형)을 다듬은 실제 장구 소리
// 기덕 세 벌은 덕이 소리 시작 90 ~ 95ms에 온다. 노랫말은 덕을 기 뒤 1/6박에 두어서 반주 기덕은 그만큼 늦게 놓는다(그래프 검수 8회차 R3-03). 내 손 소리는 누른 때 그대로
const kideokLag = beat => Math.max(0, beat / 6 - 0.09);
const JANG = { 덩: 'jg-deong', 쿵: 'jg-kung', 덕: 'jg-deok', 기덕: 'jg-kideok', 더러러러: 'jg-deoreoreo' };
// 반주 · 추임새는 벌을 돌리고 높이 ±1.5% · 크기 -1.2 ~ +1.1dB로 흔든다(장단이 흔들려 들리지 않게 내 손 소리보다 좁게, 그래프 검수 5회차 R6-01). exact: 박 맞추기는 늘 같은 첫 벌
function janggu(t, k, v = 1, exact = false) {
  if (exact ? sample(JANG[k] || 'jg-deok', t, 0.8 * v, music, 1, true) : sample(JANG[k] || 'jg-deok', t, 0.8 * v * (0.87 + Math.random() * 0.26), music, 0.985 + Math.random() * 0.03)) return;
  if (k === '덩' || k === '쿵') tone(t, 'sine', 150, 72, 0.22, 0.42 * v, music);
  if (k === '덩' || k === '덕') { noise(t, 0.05, 'bandpass', 2600, 1.4, 0.28 * v, music); tone(t, 'triangle', 1700, 1500, 0.03, 0.08 * v, music); }
}
function flailHit(t, v = 1, bus = sfx) { // 도리깨가 보리를 치는 「탁」
  lastFlail = (lastFlail + 1 + Math.floor(Math.random() * 2)) % 3;
  if (sample(`flail-${lastFlail + 1}`, t, v * (0.88 + Math.random() * 0.24), bus, 0.96 + Math.random() * 0.08)) return;
  const r = 0.95 + Math.random() * 0.1;
  noise(t, 0.045, 'bandpass', 1900 * r, 0.9, 0.5 * v, bus, r);
  tone(t, 'sine', 170 * r, 85, 0.09, 0.35 * v, bus);
  noise(t + 0.01, 0.16, 'highpass', 3500, 0.7, 0.09 * v, bus, r);
}
// 맞힘 소리: 실제 녹음 곡은 그 곡의 악기로(내 소고와 앞 · 뒷사람 소리를 가른다), 옹헤야는 도리깨로
// 흔들기는 높이 ±4% · 크기 -1.5 ~ +1.1dB(규칙 손맛-소리 12절 (12)), 내 손 소리만 곡마다 hitGain을 곱한다(신고산 손뼉)
function hitSound(t, v = 1, bus = sfx) {
  const vc = song && song.voice, own = bus !== music, hit = vc && (own ? vc.hit : vc.npcHit);
  if (hit && sample(hit, t, v * (own && vc.hitGain || 1) * (0.84 + Math.random() * 0.3), bus, 0.96 + Math.random() * 0.08)) return;
  flailHit(t, v, bus);
}
// 두 손 곡 물방구: 둥(왼손)은 낮고 둥근 소리, 당(오른손)은 높고 단단한 소리. 물 튀는 소리를 작게 얹는다
function bowlSound(t, side, v = 1) {
  const g = 0.84 + Math.random() * 0.3;
  if (side === 'L') sample('buk', t, 0.9 * v * g, sfx, 1.25 + Math.random() * 0.04);
  else sample(Math.random() < .5 ? 'sogo' : 'sogo-2', t, 0.8 * v * g, sfx, 1.05 + Math.random() * 0.04);
  sample('drip', t + 0.02, 0.25 * v, sfx, side === 'L' ? 0.8 : 1.15);
}
function straw(t) { lastStraw = 1 - lastStraw; sample(`straw-${lastStraw + 1}`, t, 0.5, sfx, 0.95 + Math.random() * 0.1); }
function whoosh(t, v = 1) {
  if (sample('whoosh', t, 0.7 * v)) return;
  const f = noise(t, 0.2, 'bandpass', 700, 1.2, 0.13 * v, sfx);
  f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.18);
}
function woodClick(t) { tone(t, 'triangle', 2300, 2100, 0.035, 0.17, music); noise(t, 0.02, 'bandpass', 3200, 2, 0.12, music); }
function sparkle(t) { if (song && (song.net || song.boat)) return; tone(t, 'triangle', hz(91), hz(91), 0.12, 0.05, sfx); }
// 맺음 소리: 풍물 곡은 장구 · 꽹과리, 강강술래는 녹음에 없는 악기 대신 발 구르기와 박수(ring.js)
function accent(kind, t) {
  if (song && song.boat) { boatAccent(kind, t); return; }
  if (song && song.net) { netAccent(kind, t); return; }
  if (song && song.ring) { ringAccent(kind, t); return; }
  if (kind === 'level') sample('kkw-dak', t, 0.6);
  else if (kind === 'enter') sample('kkw-gaeng', t, 0.6);
  else if (kind === 'charge') janggu(t, '더러러러', 0.45);
  else if (kind === 'full') sample('kkw-gaeng', t, 0.4);
  else if (kind === 'burst') sample('kkw-gaeng', t, 0.7);
}
// 끝 칠 곳 앞 쌓기 소리(그래프 검수 8회차 R2-01): 쌓기 45%에 한 번, 75%에 조금 크게 한 번. 곡 종류마다 그 곡의 꾹 소리를 꾹보다 작게
function buildRoll(t, n) {
  const v = n === 1 ? 0.5 : 0.75;
  if (song && song.boat) sample('oar-creak', t, 0.8 * v);
  else if (song && song.net) { const k = netKind(); sample(k === 'field' ? 'shuffle' : k === 'yard' || !k ? 'creak' : k === 'forge' ? 'creak' : 'step-soft', t, 0.6 * v); }
  else if (song && song.ring) sample('shuffle', t, 0.55 * v);
  else janggu(t, '더러러러', 0.5 * v);
}
function cheerSound(t, beat = BEAT) {
  if (song && song.boat) { boatAccent('cheer', t, beat); return; }
  if (song && song.net) { netAccent('cheer', t, beat); return; }
  if (song && song.ring) { ringAccent('cheer', t, beat); return; }
  const b = Math.min(beat, 0.625); janggu(t, '덩', 0.9); janggu(t + b * 0.5, '덕', 0.7); janggu(t + b * 0.75, '덕', 0.7);
}
function duck(t, hold = 0.45, back = 0.6) { const p = music.gain; p.cancelScheduledValues(t); p.setValueAtTime(0.3, t); p.setValueAtTime(0.3, t + hold); p.linearRampToValueAtTime(0.6, t + hold + back); }
function bigCheerSound(t, beat = BEAT) {
  cheerSound(t, beat); duck(t);
  if (song && song.boat) { sample('splash', t, .6); return; }
  // 운재 눈 산비탈: 사람이 붙는 「와!」 여섯 번마다 바다 그물 곡의 물 첨벙이 났다. 통나무 끌림 · 눈 밟는 발소리로(곡별 검수 08 R1-05). 다른 줄 판 곡은 그대로
  if (song && song.net) { if (netSlope()) { sample('shuffle', t, .6); sample('step-soft', t + .12, .4); } else sample('splash', t, .6); return; }
  if (song && song.ring) { sample('step', t, 0.8); claps(t + 0.08, 6, 0.5, 0.4); return; }
  if (!sample('kkw-gaeng', t, 0.75)) { tone(t, 'triangle', hz(79), hz(79), 0.5, 0.07, sfx); tone(t + 0.08, 'triangle', hz(83), hz(83), 0.5, 0.06, sfx); }
}
// 끝 화면: 구슬이 하나씩 차는 소리, 맞힌 자리는 5음 음계로 오른다
const PENTA = [0, 2, 4, 7, 9, 12];
function beadTick(i, hit) {
  const t = ctx.currentTime;
  if (hit) tone(t, 'triangle', hz(72 + PENTA[i % PENTA.length]), null, 0.07, 0.07, sfx);
  else tone(t, 'sine', 330, 300, 0.03, 0.025, sfx);
}
function sealSound(stamp) {
  if (song && song.boat) { boatAccent('seal', ctx.currentTime + .02, stamp); return; }
  if (song && song.net) { netAccent('seal', ctx.currentTime + .02, stamp); return; }
  const t = ctx.currentTime + 0.02;
  if (song && song.ring) { ringAccent('seal', t, stamp); return; }
  janggu(t, '덩', 1.1);
  const b = Math.min(BEAT, 0.625);
  if (stamp === 3) { sample('kkw-gaeng', t + 0.05, 0.8); janggu(t + b * 0.5, '덕', 0.8); janggu(t + b * 0.75, '덕', 0.8); janggu(t + b, '덩', 1); }
}

// 들리는 때(소리가 귀에 닿는 시각)를 오디오 시계로
const clampHeard = t => Math.max(ctx.currentTime - 0.6, Math.min(ctx.currentTime, t));
function heardNow() {
  if (!ctx) return 0;
  const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return clampHeard(ts.contextTime + (performance.now() - ts.performanceTime) / 1000);
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
}
function heardAtEvent(e) {
  if (!ctx) return 0;
  const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if (ts && ts.contextTime > 0 && ts.performanceTime > 0 && e && e.timeStamp > 0) return clampHeard(ts.contextTime + (e.timeStamp - ts.performanceTime) / 1000);
  return heardNow();
}
function songLevel() { if (songTrim) songTrim.gain.value = Math.pow(10, (song && SONG_DB[song.id] || 0) / 20); }
function setMuted(m) { if (master) master.gain.value = m ? 0 : MASTER; songLevel(); }

// 노래 알기는 별도 소리 줄을 써서 넘기기·닫기 때 예약한 소리까지 끊는다.
// 판의 시계·판정·음원 파일은 바꾸지 않는다. 준비 실패는 족자에 표시하고 다시 듣게 한다.
window.MinyoBookAudio = {
  async prepare(s, clips, rhythm = null) {
    initAudio();
    await ctx.resume();
    if (ctx.silent || ctx.state !== 'running') throw Error('audio-unavailable');
    setMuted(!window.GF.sound);
    await (rhythm ? sfxReady() : voiceReady(s));
    const sources = [], bus = ctx.createGain(); bus.connect(music);
    const segments = []; let duration = 0;
    if (rhythm) {
      for (const name of new Set(rhythm.pattern.map(p => JANG[p[1]]))) if (!sfxBuf[name]) { bus.disconnect(); throw Error('drum-unavailable'); }
      duration = rhythm.beat * 8;
    } else {
      for (const c of clips) {
        if (!voiceBuf[c.file]) { bus.disconnect(); throw Error('voice-unavailable'); }
        // mp3의 끝은 조사에 적힌 반올림 값과 1ms 미만 차이날 수 있다.
        const len = Math.min(c.to, voiceBuf[c.file].duration) - c.from;
        if (!(len > 0) || len < c.to - c.from - .002) { bus.disconnect(); throw Error('voice-range'); }
        segments.push({ ...c, at: duration, len }); duration += len;
      }
    }
    let stopped = false, t0 = null;
    const put = (buffer, at, from, len, gain = 1) => {
      const source = ctx.createBufferSource(), level = ctx.createGain();
      source.buffer = buffer; level.gain.value = gain; source.connect(level); level.connect(bus);
      source.start(at, from, len); sources.push(source);
    };
    return {
      duration, segments,
      start() {
        if (stopped) return;
        t0 = ctx.currentTime + .12;
        if (rhythm) for (let cycle = 0; cycle < 2; cycle++) for (const [beat, k, v = 1] of rhythm.pattern) {
          const b = sfxBuf[JANG[k]]; put(b, t0 + (cycle * 4 + beat) * rhythm.beat + (k === '기덕' ? kideokLag(rhythm.beat) : 0), 0, b.duration, .8 * v);
        }
        else for (const c of segments) put(voiceBuf[c.file], t0 + c.at, c.from, c.len, s.voice.gain || 1);
      },
      elapsed(e) { return t0 === null ? -.12 : (e ? heardAtEvent(e) : heardNow()) - t0; },
      stop() {
        if (stopped) return; stopped = true;
        for (const source of sources) source.stop();
        bus.disconnect();
      },
    };
  },
};
