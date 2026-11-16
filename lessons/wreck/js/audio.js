// 소리. 사건 소리와 음악은 파일(sfx/, CC0), 누름 · 연속 음계 · 낮은 몸통은 합성. 파일을 못 받으면 합성으로 대신한다. 소리 오류는 놀이를 멈추지 않는다.
'use strict';
const A = { ctx: null, muted: false };
const MUS_VOL = 1, MASTER = .41; // 봇 한 판 녹음이 -18 LUFS 안에 들게 맞춘 값
function audioInit() {
  try {
    if (A.ctx) { if (A.ctx.state !== 'running') A.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const a = A.ctx = new C(); audioBuild(a);
    loadSfx(a); if (MUS.want) musicWant(MUS.want);
  } catch (e) { A.ctx = null; }
}
function audioBuild(a) {
  const lim = A.lim = a.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12; lim.connect(a.destination);
  A.master = a.createGain(); A.master.gain.value = A.muted ? 0 : MASTER; A.master.connect(lim);
  A.sfx = a.createGain(); A.sfx.gain.value = 1.8; A.sfx.connect(A.master);
  A.mus = a.createGain(); A.mus.gain.value = MUS_VOL; A.mus.connect(A.master);
  const len = a.sampleRate; A.noise = a.createBuffer(1, len, a.sampleRate); const d = A.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
const SFX_FILES = ['plank-1', 'plank-2', 'plank-3', 'plank-4', 'wood-1', 'wood-2', 'wood-3', 'thud', 'step', 'hit-1', 'hit-2', 'hit-3', 'gem-1', 'gem-2', 'gem-3', 'jump-1', 'jump-2', 'jump-3', 'level', 'wrong', 'crush', 'land'].map(n => n + '.wav').concat(['chae', 'big', 'clear', 'over'].map(n => n + '.mp3')), BUF = {};
function loadSfx(a) { SFX_FILES.forEach(f => fetch(`sfx/${f}`).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && a.decodeAudioData(b)).then(d => { if (d) BUF[f.split('.')[0]] = d; }).catch(() => {})); }
// 파일이 아직 없거나 못 받았으면 false를 돌려주고 합성 소리로 대신한다
function playBuf(name, vol, rate = 1, when = 0, hp = 0) { // hp: 이 높이(Hz) 아래를 깎는다
  const b = BUF[name]; if (!A.ctx || !b) return false;
  const a = A.ctx, s = a.createBufferSource(), g = a.createGain(), t = a.currentTime + when;
  s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; g.connect(A.sfx); s.start(t);
  if (hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(g); } else s.connect(g);
  return true;
}
function audioMute(on) { A.muted = on; if (A.ctx) A.master.gain.setTargetAtTime(on ? 0 : MASTER, A.ctx.currentTime, .02); }
function audioSuspend() { try { if (A.ctx) A.ctx.suspend(); } catch (e) {} }
function audioResume() { try { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume(); } catch (e) {} }
function tone(f, type, dur, vol, when = 0, to = null) {
  if (!A.ctx) return; const a = A.ctx, t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, fc, q = 1, when = 0, fcTo = null, type = 'bandpass', dest = null) {
  if (!A.ctx) return null; const a = A.ctx, t = a.currentTime + when, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = A.noise; s.loop = true; f.type = type; f.frequency.setValueAtTime(fc, t); f.Q.value = q;
  if (fcTo) f.frequency.exponentialRampToValueAtTime(fcTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || A.sfx); s.start(t, Math.random() * .8); s.stop(t + dur + .02);
  return s;
}
const sndRand = (a, b) => a + Math.random() * (b - a);
const PENTA = [0, 2, 4, 7, 9, 12];
let lastSlash = -1, lastBreak = -1;
// 벌마다 최고값은 같아도 들리는 크기(50ms)가 다르다. hit-3 · jump-2는 뾰족한 점만 커서 키워 맞춘다
const HIT_VOL = [.85, 1, 2.6], JUMP_VOL = [1, 2.2, 1];
function pickVar(n, last) { let v = Math.floor(Math.random() * n); if (v === last) v = (v + 1) % n; return v; }
function sfxTick() { tone(1500, 'square', .025, .11); noise(.02, .24, 3200, 1.5); }
function sfxLow() { tone(240, 'square', .05, .06); }
function sfxSwoosh(level) {
  lastSlash = pickVar(3, lastSlash); const p = sndRand(.95, 1.05), b = [1000, 1300, 800][lastSlash] * p;
  if (playBuf(`jump-${lastSlash + 1}`, .14 * JUMP_VOL[lastSlash] * sndRand(.8, 1), p * (1 + .03 * level))) return;
  noise(.13, .85 + .08 * level, b, 1, 0, b * [4.6, 3.8, 5.4][lastSlash]);
}
function sfxBreak(level) { // 망치 쾅 + 나무 부서짐 + 낮은 몸통. 이어 맞힐수록 겹이 늘어난다
  lastBreak = pickVar(3, lastBreak);
  const rate = sndRand(.94, 1.06), loud = sndRand(.9, .92);
  if (playBuf(`hit-${lastBreak + 1}`, .35 * HIT_VOL[lastBreak] * loud, rate)) {
    tone(150, 'sine', .16, .16, 0, 58);
    if (level > 0) playBuf(`wood-${lastBreak + 1}`, .08 + .03 * level, rate * .92);
    if (level > 1) playBuf(`plank-${lastBreak + 2}`, .1 + .03 * level, rate * 1.12, .05);
    return;
  }
  tone(150, 'sine', .16, .4, 0, 58);
  noise(.05, .5, sndRand(1700, 2400), 1.1);
  const n = 5 + level * 2;
  for (let i = 0; i < n; i++) noise(sndRand(.03, .07), sndRand(.3, .6), sndRand(900, 3300), sndRand(1.2, 3), .02 + i * sndRand(.02, .055));
}
function sfxStreak(n) { const f = 523.25 * Math.pow(2, PENTA[Math.min(n - 1, 5)] / 12); tone(f, 'triangle', .16, .2, .015); tone(f * 2, 'sine', .09, .06, .015); }
function sfxWrong() {
  if (playBuf('wrong', .1, 1, 0, 250)) return; // 맞힘보다 4~6dB 작게, 폰이 못 내는 저음은 뺀다(손맛-소리 25 · 43줄)
  tone(2140, 'sine', .2, .17); tone(3180, 'sine', .13, .1); noise(.03, .2, 4200, 3);
  tone(392, 'triangle', .12, .1, .08); tone(311, 'triangle', .16, .1, .2);
}
function sfxThud(v = 1) { tone(96, 'sine', .2, .42 * v, 0, 46); noise(.03, .2 * v, 1500, 1); if (!playBuf('thud', .3 * v, sndRand(.95, 1.05))) noise(.14, .14 * v, 500, .8); }
function sfxLand(v = .5) { tone(120, 'sine', .08, .25 * v, 0, 70); if (!playBuf('step', .22 * v, sndRand(.95, 1.05))) noise(.03, .1 * v, 1400, 1); }
let lastGem = -1, gemAt = 0;
function sfxGem() { // 한꺼번에 날아와도 한 번씩 또렷이 들리게 간격을 둔다
  if (!A.ctx || A.ctx.currentTime - gemAt < .05) return; gemAt = A.ctx.currentTime; lastGem = pickVar(3, lastGem);
  if (!playBuf(`gem-${lastGem + 1}`, .16, sndRand(.97, 1.03))) { tone(1320, 'square', .05, .05); tone(1980, 'square', .08, .04, .04); }
}
function sfxLevel() { playBuf('level', .3); }
function sfxThrow() { noise(.13, .45, 1000, 1, 0, 4200); }
function sfxBoxBreak() { playBuf('wood-2', .24, sndRand(.9, 1.1)); }
function sfxBomb(v = .24) { playBuf('chae', v, 1.25); }
function sfxCannon() { playBuf('chae', .26, .85); }
function sfxDoor() { playBuf('step', .22, .7); }
function sfxClear() { playBuf('clear', .5); }
function sfxCrush() { if (!playBuf('crush', .42)) sfxThud(1.2); }
function sfxDrop(v = .8) { if (playBuf('land', .5 * v, sndRand(.97, 1.03))) tone(96, 'sine', .2, .2 * v, 0, 46); else { sfxLand(v); sfxThud(v * .85); } }
function sfxHeal() { tone(660, 'triangle', .14, .16); tone(990, 'triangle', .18, .14, .09); }
function sfxDanger() { tone(82, 'sine', .14, .1); tone(1800, 'triangle', .05, .2, 0, 1300); } // 낮은 쿵에 짧은 「딱」을 얹어 폰 스피커에서도 들린다
function sfxCollapse(fin) {
  if (playBuf(fin ? 'big' : 'chae', .54)) { tone(120, 'sine', .8, .1, 0, 32); if (!fin) noise(.06, .5, 2400, .8); for (let i = 0; i < 12; i++) playBuf(`plank-${(i % 4) + 1}`, .16 * (1 - i / 18), sndRand(.72, 1.08), .05 + i * .09 + sndRand(-.02, .02)); return; }
  tone(120, 'sine', .8, .9, 0, 32); tone(70, 'sine', 1, .5); noise(.08, .8, 2100, .9); noise(1, .6, 1500, .6, 0, 240, 'lowpass');
  if (BUF['plank-1']) for (let i = 0; i < 16; i++) playBuf(`plank-${(i % 4) + 1}`, .3 * (1 - i / 22), sndRand(.72, 1.08), .03 + i * .085 + sndRand(-.02, .02));
  else for (let i = 0; i < 26; i++) noise(sndRand(.04, .09), .28 * (1 - i / 32), sndRand(800, 3400), sndRand(1.5, 4), .03 + i * .05 + sndRand(-.02, .02));
}
function sfxOver() { if (playBuf('over', .5)) return; tone(420, 'triangle', .9, .2, 0, 90); noise(.5, .2, 500, .8, 0, 120); }
let rumbleSrc = null, rumbleGain = null;
function rumble(on) {
  if (!A.ctx) return; const a = A.ctx, t = a.currentTime;
  if (on && !rumbleSrc) {
    rumbleSrc = a.createBufferSource(); rumbleSrc.buffer = A.noise; rumbleSrc.loop = true;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; rumbleGain = a.createGain();
    rumbleGain.gain.setValueAtTime(.001, t); rumbleGain.gain.exponentialRampToValueAtTime(.2, t + 1.4);
    rumbleSrc.connect(f); f.connect(rumbleGain); rumbleGain.connect(A.sfx); rumbleSrc.start();
  } else if (!on && rumbleSrc) { rumbleGain.gain.setTargetAtTime(.0001, t, .03); rumbleSrc.stop(t + .2); rumbleSrc = null; }
}
function musicLevel(v, time = .3) { if (A.ctx) A.mus.gain.setTargetAtTime(v, A.ctx.currentTime, time / 3); }
let musicOn = false, musBpm = 122, musSrc = null, musGain = null;
const MUSIC_INFO = { 1: [41.143, 0.000], 2: [56.104, 0.000], 3: [74.254, 0.000], 4: [72.796, 0.000], 5: [81.896, 0.000], 6: [21.333, 0.000], 7: [71.724, 0.000] }; // 곡마다 [길이, 앞 침묵](초). make_music.py가 고쳐 쓴다
// 곡은 단계마다 하나(sfx/music-N.mp3, 모노). 풀린 소리 합 20MB를 지키려고 한 번에 한 곡만 풀어 두고, 곡이 바뀌면 앞 곡을 버린 뒤 받는다
const MUS = { want: 0, id: 0, buf: null, busy: 0 };
function musicTrack(id, endless, building = 0) { return endless ? 1 + Math.floor(building / 3) % 7 : id; } // 끝없는 성은 세 채마다 1~7번 곡을 차례로
function musicWant(n) {
  MUS.want = n; if (!A.ctx || MUS.busy || !n) return; // 받는 중이면 끝난 뒤 다시 본다
  if (MUS.id === n && MUS.buf) return;
  const fade = musSrc && A.ctx.state === 'running' ? .3 : 0;
  const faded = musicStop(fade); MUS.buf = null; MUS.id = 0; MUS.busy = n; const a = A.ctx;
  // 앞 곡을 0.3초에 걸쳐 줄인 뒤 다음 곡을 푼다. 풀린 곡 두 개를 함께 들고 있지 않는다.
  // 못 받으면 음악 없이 놀고, 다음에 곡을 부를 때(단계 시작, 건물이 바뀔 때) 다시 받는다
  fetch(`sfx/music-${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : null).then(async b => { await faded; return b && a.decodeAudioData(b); }).catch(() => null).then(d => {
    MUS.busy = 0; if (d && MUS.want === n) { MUS.buf = d; MUS.id = n; }
    if (MUS.want !== n) musicWant(MUS.want); else musicTick();
  });
}
// mp3는 앞에 틈이 붙고 브라우저마다 길이가 달라, 풀린 소리에서 첫 소리 자리를 재서 고리를 맞춘다
function musicLoop(b, n) {
  const [len, lead] = MUSIC_INFO[n] || [b.duration, 0];
  const x = b.getChannelData(0), m = Math.min(x.length, b.sampleRate * 3); let i = 0;
  while (i < m && Math.abs(x[i]) < .01) i++;
  const start = Math.max(0, i / b.sampleRate - lead);
  return [start, Math.min(b.duration, start + len)];
}
function musicStop(after = 0) {
  if (!musSrc) return Promise.resolve();
  const t = A.ctx.currentTime, s = musSrc, ended = s.onended;
  let done; const stopped = new Promise(resolve => { done = resolve; });
  s.onended = () => { if (ended) ended(); done(); };
  if (after && musGain) { musGain.gain.cancelScheduledValues(t); musGain.gain.setValueAtTime(musGain.gain.value, t); musGain.gain.linearRampToValueAtTime(0, t + after); }
  try { musSrc.stop(t + after); } catch (e) { done(); } musSrc = null; musGain = null;
  return stopped;
}
function musicMenu(n = 1) { musicOn = true; musBpm = 122; musicLevel(MUS_VOL * .7); musicWant(n); musicTick(); }
function musicTick() {
  if (!A.ctx || A.ctx.state !== 'running' || document.hidden) return;
  if (!musicOn) { musicStop(.3); return; }
  if (!musSrc && MUS.buf && MUS.id === MUS.want) {
    const s = musSrc = A.ctx.createBufferSource(); s.buffer = MUS.buf; s.loop = true; [s.loopStart, s.loopEnd] = musicLoop(MUS.buf, MUS.id);
    const g = musGain = A.ctx.createGain(), t = A.ctx.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .1);
    s.connect(g); g.connect(A.mus); s.onended = () => { s.disconnect(); g.disconnect(); }; s.start(0, s.loopStart);
  }
  if (musSrc) musSrc.playbackRate.setTargetAtTime(1 + (musBpm - 122) * .0025, A.ctx.currentTime, .25); // 건물이 바뀌고 이어 맞히면 조금 빨라진다
}
function buzz(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
