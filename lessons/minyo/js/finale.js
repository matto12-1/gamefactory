// 팔도 장단 끝 장면 「소리 지도 완성」(2026-11-22 대표 「추천대로 가자」, 기획서 판 19 · DECISIONS 2026-11-22 오전).
// 아홉 고장에서 도장을 하나씩 다 받으면 끝 화면에서 나갈 때 한 번 나온다(팔도 잔치를 안 해도).
// 저녁 지도 → 제주부터 잔치 차례로 고장 땅이 등불빛으로 밝아지고 그 고장 꼬마가 뛰며 받는 소리를 한 마디씩 이어 부른다 →
// 「칭칭 나네」 뒤 지도가 밝아지고 제주 바닷가에서 앞소리꾼 · 구덕 꼬마가 한 마디씩 → 지도로 돌아와 제목 옆에 「소리 지도」 도장.
// 2026-11-27 연출 새로(대표 「소리지도 누르니까 나오는 효과가 너무 별로」): 지도 오른쪽 빈 바다에 족자 도장판(3×3)을 두고
// 고장마다 그 곡에서 받은 도장이 「쿵」 찍힌다. 아홉 칸이 차면 큰 「소리 지도」 도장 · 꽃가루. 흐름(차례 · 소리 · 말 둘)은 그대로.
// 지도에서 다시 보기도 여기서 연다(첫머리 이야기 · 소리 지도). 시험 자동 손에는 주소 ?finale=1일 때만 뜬다.
let finale = null, finaleRunId = 0;
// 잔치 차례(판 13): 남쪽에서 올라가 북쪽을 돌고 내려온다. 고장마다 먼저 쓸 곡
const FINALE_ORDER = [['제주', ['myeolchi']], ['전라', ['ganggang', 'geomun', 'dungdang']], ['충청', ['garae']], ['경기', ['baennorae']], ['황해', ['punggu']], ['평안', ['jajinari']], ['함경', ['singosan']], ['강원', ['unjae']], ['경상', ['kwaeji', 'wolwol']]];
const FINALE_KID = {
  myeolchi: 'art/myeolchi/hero-cheer.png', ganggang: 'art/ganggang/hero-jump.png', geomun: 'art/geomun/hero-cheer.png', garae: 'art/garae/hero-cheer.e1941001722f.png',
  baennorae: 'art/jajin/hero-cheer.9b7cb26e19f8.png', punggu: 'art/punggu/hero-cheer.09c6a43c9d76.png', jajinari: 'art/jajinari/hero-cheer.e0dfa55b4b80.png',
  dungdang: 'art/dungdang/hero-cheer.185bd3824663.png', singosan: 'art/singosan/hero-cheer.f1b77f67de1f.png', unjae: 'art/unjae/hero-cheer.7ae28ee3c870.png', kwaeji: 'art/kwaeji/hero-jump.png', wolwol: 'art/wolwol/hero-jump.png',
};
const FINALE_LEAD = 'art/myeolchi/leader-cheer.png';
// 고장 하나의 받는 소리는 2.6초까지(마지막 경상은 끝까지). 앞 소리 끝 0.35초에 다음 고장이 겹쳐 들어온다
const FINALE_CLIP = 2.6, FINALE_LAP = .35, FINALE_LAST = 5.2, FINALE_LOAD_MS = 4000;
const FINALE_LINES = [[1.3, 2.2, 'lead', '팔도 소리를 다 받았구나!'], [3.7, 2.4, 'kid', '다음 앞소리는 제가 메길래요!']];
// 도장판: 고장 불이 켜지고 0.22초 뒤 그 곡에서 받은 도장이 찍힌다. 칸은 잔치 차례대로 읽는 차례로 찬다. 도장마다 조금씩 기울인다
const FINALE_STAMP_AT = .22, FINALE_ROT = [-6, 4, -3, 7, -5, 2, -8, 5, -2];
const FINALE_BITS = ['#c8452e', '#e9b949', '#3f7f7a', '#f4ead2', '#8f2f1c', '#f0c46a'];
const FINALE_RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

const finaleSongs = () => window.MINYO.SONGS.filter(s => !s.later && s.bars && !s.hidden);
const finaleDue = () => !save.soundMapSeen && Rules.soundMapOpen(save, finaleSongs()) && BOT === null && (Q.get('finale') === '1' || (!navigator.webdriver && Q.get('finale') !== '0'));
// 고장마다 도장 받은 곡 하나와 그 곡에서 가장 짧은 받는 마디(빠른 대목)
function finalePlan() {
  const open = finaleSongs(), plan = [];
  for (const [region, prefer] of FINALE_ORDER) {
    const got = open.filter(s => s.region === region && save.stamps[s.id] >= 1);
    const s = prefer.map(id => got.find(x => x.id === id)).find(Boolean) || got[0];
    if (!s) continue;
    const v = s.voice, rs = (s.voice ? s.bars() : []).filter(b => !b.call && b.clip && !b.chorus && !b.finale)
      .map(b => ({ clip: b.clip, base: b.vfrom !== undefined ? b.vfrom : b.half * v.bar + v.grid, len: Math.min(b.vlen || v.bar, b.voiceCut ?? Infinity) }))
      .filter(r => Number.isFinite(r.base) && r.len > .5).sort((a, b) => a.len - b.len);
    plan.push({ region, song: s, kid: FINALE_KID[s.id] || null, clip: rs[0] || null, gain: v ? v.gain || 1 : 1, pre: v ? v.pre || 0 : 0 });
  }
  return plan;
}

const finaleLayer = document.createElement('div');
finaleLayer.id = 'finaleLayer'; finaleLayer.hidden = true; finaleLayer.dataset.test = 'finale';
finaleLayer.innerHTML = '<button type="button" class="btnPaper" id="finaleSkip" data-test="finale-skip">건너뛰기</button>';
document.body.append(finaleLayer);
const finaleCss = document.createElement('style');
finaleCss.textContent = `
#finaleLayer{position:fixed;inset:0;z-index:9;pointer-events:auto;overflow:hidden}
#finaleSkip{position:absolute;right:16px;bottom:16px;z-index:2;font-size:18px;min-width:112px;min-height:44px}
@media(max-height:420px),(max-width:700px){#finaleSkip{font-size:16px;bottom:10px;right:12px}}
/* 저녁빛: 반투명 먹색 대신 곱하기 섞기라 바다는 쪽빛, 땅은 자줏빛 그늘로 색이 남는다 */
#mapArt svg.finale .finaleDim{fill:#58528a;mix-blend-mode:multiply;opacity:0;transition:opacity 1s ease-in-out;pointer-events:none}
#mapArt svg.finaleDark .finaleDim{opacity:1}
#mapArt svg.finaleBright .finaleDim{opacity:0;transition-duration:1.2s}
#mapArt svg.finale #finaleG{pointer-events:none}
/* 고장 이름은 끝 장면 동안 감춘다: 불 · 꼬마가 이름 위에 겹친다 */
#mapArt svg.finale .tag,#mapArt svg.finale .lead-line{opacity:0;transition:opacity .4s;pointer-events:none}
/* 소리가 닿은 고장은 땅 전체가 등불빛으로 밝아진다(화면 섞기라 산 · 물결 그림이 비친다) */
#mapArt .finaleLand{fill:#ffc96a;mix-blend-mode:screen;opacity:0;animation:finaleLand 1s ease-out forwards}
#mapArt svg.finaleBright .finaleLand{animation:none;opacity:.18;transition:opacity 1.2s}
#mapArt .finaleLine{stroke:#ffd77a;stroke-width:6;stroke-linecap:round;opacity:.95;transition:stroke-dashoffset .7s ease-out}
#mapArt .finaleGlow{mix-blend-mode:screen;animation:finaleGlow .9s ease-out both}
#mapArt .finaleRing{fill:none;stroke:#ffe6a8;stroke-width:3;vector-effect:non-scaling-stroke;transform-box:fill-box;transform-origin:center;opacity:0;animation:finaleRing 1.25s ease-out both}
#mapArt .finaleCore{fill:#fffbe8;stroke:#e08a2c;stroke-width:3;animation:finaleCore .5s ease-out both}
#mapArt .finaleKid,#mapArt .finaleLead{image-rendering:pixelated}
#mapArt .finaleKid{animation:finalePop .6s cubic-bezier(.3,1.6,.5,1) both}
#mapArt .finaleKid.finaleKidEnd{animation:finaleJump .5s ease-out .15s,finaleJump .5s ease-out .85s}
#mapArt .finaleLead{animation:finalePop .6s cubic-bezier(.3,1.6,.5,1) .5s both}
@keyframes finaleLand{0%{opacity:0}30%{opacity:.9}100%{opacity:.6}}
@keyframes finaleGlow{0%{opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.3)}50%{opacity:1}100%{opacity:.85;transform-box:fill-box;transform-origin:center;transform:scale(1)}}
@keyframes finaleRing{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(5.5)}}
@keyframes finaleCore{0%{opacity:0}100%{opacity:1}}
@keyframes finalePop{0%{opacity:0;transform:translateY(0) scale(.6)}35%{opacity:1;transform:translateY(-34px) scale(1.08)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes finaleJump{0%,100%{transform:translateY(0)}45%{transform:translateY(-30px)}}
/* 도장판: 곡 소개 · 멈춤 창과 같은 족자. 크기(--S 도장 한 칸 · --s 족자 테)는 finaleBoardPlace가 남은 바다 칸에 맞춰 정한다 */
#finaleBoard{--s:.5;--S:120px;--pv:16px;--ph:18px;--T:30px;--L:17px;--gx:19px;--gy:12px;position:absolute;box-sizing:border-box;isolation:isolate;color:#342b22;padding:calc(144px * var(--s) + var(--pv)) calc(74px * var(--s) + var(--ph)) calc(146px * var(--s) + var(--pv));filter:drop-shadow(0 18px 24px rgba(0,0,0,.45));opacity:0;translate:0 28px;transition:opacity .6s ease-out,translate .6s ease-out;pointer-events:none}
#finaleBoard.on{opacity:1;translate:0 0}
#finaleBoard::before{content:'';position:absolute;inset:0;z-index:-1;border-style:solid;border-width:calc(160px * var(--s)) calc(150px * var(--s));border-image:var(--scrollArt) 160 150 fill / calc(160px * var(--s)) calc(150px * var(--s)) stretch}
#finaleBoard h2{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 8px;font:700 var(--T)/1.25 "Minyo Hahmlet";letter-spacing:.04em;color:#342b22}
#finaleBoard .fbSpot{flex:none;width:calc(var(--T) * 1.6);height:calc(var(--T) * 1.6);box-sizing:border-box;border:2px dashed #c9b893;border-radius:4px;transition:border-color .3s}
#finaleBoard .fbSpot.got{border-color:transparent}
#finaleBoard .fbGrid{position:relative;display:grid;grid-template-columns:repeat(3,var(--S));gap:var(--gy) var(--gx);justify-content:center}
#finaleBoard .fbSlot{display:flex;flex-direction:column;align-items:center;gap:4px;margin:0}
#finaleBoard .fbMark{position:relative;display:block;width:var(--S);height:var(--S);box-sizing:border-box;border:2px dashed #c9b893;border-radius:4px;transition:border-color .2s}
#finaleBoard .fbMark img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;mix-blend-mode:multiply;opacity:0}
#finaleBoard figcaption{font:700 var(--L)/1.3 "Minyo Hahmlet";color:#a2927a;transition:color .3s}
#finaleBoard .fbSlot.got .fbMark{border-color:transparent}
#finaleBoard .fbSlot.got img{opacity:1;rotate:var(--rot);animation:fbStamp .42s cubic-bezier(.2,.9,.3,1.25) both}
#finaleBoard .fbSlot.got figcaption{color:#342b22}
#finaleBoard.noLab figcaption{display:none}
#finaleBoard .fbSeal{position:absolute;left:50%;top:50%;width:calc(var(--S) * 2.2);height:calc(var(--S) * 2.2);margin:calc(var(--S) * -1.1) 0 0 calc(var(--S) * -1.1);image-rendering:pixelated;mix-blend-mode:multiply;opacity:0;rotate:-8deg}
#finaleBoard .fbSeal.on{opacity:.92;animation:fbBig .5s cubic-bezier(.2,.9,.3,1.25) both}
/* 찍힌 뒤에는 제목 옆으로 작아지며 옮겨 가서 아홉 도장을 다시 드러낸다(finaleSealRest가 --tx · --ty · --ts를 잰다) */
#finaleBoard .fbSeal.rest{translate:var(--tx) var(--ty);scale:var(--ts);transition:translate .7s cubic-bezier(.5,0,.25,1),scale .7s cubic-bezier(.5,0,.25,1)}
#finaleBoard.thud{animation:fbThud .22s ease-out}
#finaleBoard.boom{animation:fbBoom .42s ease-out}
@keyframes fbStamp{0%{opacity:0;transform:scale(1.9)}55%{opacity:1;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}
@keyframes fbBig{0%{opacity:0;transform:scale(2.4)}60%{opacity:1;transform:scale(.92)}100%{opacity:.92;transform:scale(1)}}
@keyframes fbThud{0%,100%{transform:none}40%{transform:translateY(3px)}}
@keyframes fbBoom{0%,100%{transform:none}20%{transform:translate(-5px,6px)}45%{transform:translate(4px,-3px)}70%{transform:translate(-2px,2px)}}
/* 꽃가루: 도트 그림에 맞춘 네모 조각 */
.fcBit{position:absolute;top:-20px;width:var(--z);height:var(--z);background:var(--c);opacity:0;pointer-events:none;animation:fcFall var(--d) linear var(--w) forwards}
@keyframes fcFall{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(var(--x),calc(100vh + 40px)) rotate(var(--r))}}
@media(prefers-reduced-motion:reduce){#mapArt .finaleKid,#mapArt .finaleKid.finaleKidEnd,#mapArt .finaleLead,#mapArt .finaleGlow,#mapArt .finaleCore,#mapArt .finaleLand{animation:none}#mapArt .finaleLand{opacity:.6}#mapArt .finaleRing{display:none}#mapArt svg.finale .finaleDim{transition:none}#finaleBoard,#finaleBoard *{animation:none!important;transition:none!important}.fcBit{display:none}}
#songPanel h2 .mapSeal{width:48px;height:48px;margin-left:10px;vertical-align:middle;image-rendering:pixelated}
#songPanel .storyAgain{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}
#songPanel .storyAgain .btnPaper{min-height:44px;font-size:17px;padding:6px 14px}
`;
document.head.append(finaleCss);
const finaleSays = new Map();
function finaleSay(key, text, at) {
  let el = finaleSays.get(key);
  if (!el) { el = document.createElement('div'); el.className = 'storySay'; el.dataset.test = 'finale-say'; finaleLayer.append(el); finaleSays.set(key, el); el.textContent = text; }
  const w = el.offsetWidth, h = el.offsetHeight, [cx, headY] = at, top = headY - h - 12;
  const left = Math.max(8, Math.min(innerWidth - w - 8, cx - w / 2));
  el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(Math.max(8, top)) + 'px';
  el.style.setProperty('--tail', Math.round(Math.max(14, Math.min(w - 14, cx - left))) + 'px');
}
function finaleClearSays(keep) { for (const [k, el] of finaleSays) if (!keep || !keep.has(k)) { el.remove(); finaleSays.delete(k); } }

// ───────── 도장판 ─────────
let finaleBoardEl = null;
// 그 곡에서 받은 도장 그림. 지도 목록 · 곡 소개처럼 앞소리꾼 · 풍년 같은 특별 도장을 먼저 쓴다
function finaleSealSrc(s) {
  const st = Math.max(1, Math.min(3, save.stamps[s.id] || 1)), n = Rules.sealFor(s, st, { top: !!save.top?.[s.id], perfect: !!save.perfect?.[s.id] });
  return s.sealFiles?.[n] || `art/${s.sealDir || 'onghe'}/seal-${n}.png`;
}
function finaleBoardClear() { finaleBoardEl?.remove(); finaleBoardEl = null; for (const e of finaleLayer.querySelectorAll('.fcBit')) e.remove(); }
function finaleBoardBuild(plan) {
  finaleBoardClear();
  const b = document.createElement('div'); b.id = 'finaleBoard'; b.dataset.test = 'finale-board';
  // 제목 옆 점선 칸은 아홉 칸이 다 차면 찍히는 큰 「소리 지도」 도장 자리
  const title = document.createElement('h2'), name = document.createElement('span'), spot = document.createElement('span');
  name.textContent = '소리 지도'; spot.className = 'fbSpot'; title.append(name, spot); b.append(title);
  const grid = document.createElement('div'); grid.className = 'fbGrid'; b.append(grid);
  plan.forEach((p, i) => {
    const slot = document.createElement('figure'); slot.className = 'fbSlot'; slot.dataset.region = p.region; slot.dataset.test = `finale-slot-${p.region}`;
    const mark = document.createElement('span'); mark.className = 'fbMark';
    const img = document.createElement('img'); img.alt = ''; img.src = finaleSealSrc(p.song); img.style.setProperty('--rot', FINALE_ROT[i % FINALE_ROT.length] + 'deg');
    const name = document.createElement('figcaption'); name.textContent = p.region;
    mark.append(img); slot.append(mark, name); grid.append(slot);
  });
  const seal = document.createElement('img'); seal.className = 'fbSeal'; seal.alt = ''; seal.src = 'art/finale/seal-soundmap.png'; seal.dataset.test = 'finale-big-seal'; grid.append(seal);
  finaleLayer.append(b); finaleBoardEl = b; finaleBoardPlace();
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('on')));
}
// 도장 한 칸 크기 S를 남은 바다 칸에 맞춰 고른다(큰 화면 150px까지). 작아지면 족자 테도 얇게, 그래도 안 들어가면(780×290) 칸 아래 고장 이름을 뺀다
function finaleBoardSize(aw, ah) {
  for (const lab of [true, false]) for (let S = 150; S >= 30; S -= 2) {
    const s9 = S >= 96 ? .5 : S >= 64 ? .3 : .18, pv = S >= 64 ? 16 : 8, ph = S >= 64 ? 18 : 10;
    const T = Math.max(S >= 64 ? 20 : 16, Math.round(S * .26)), L = Math.max(13, Math.round(S * .14)), gx = Math.round(S * .16), gy = Math.round(S * .1);
    const w = 3 * S + 2 * gx + 2 * (74 * s9 + ph), h = T * 1.6 + 8 + 3 * (S + (lab ? L * 1.3 + 4 : 0)) + 2 * gy + (144 + 146) * s9 + 2 * pv;
    // 제목 줄(글 넉 자 반 + 도장 칸)이 아홉 칸 폭 안에 들어가야 한다
    if (w <= aw && h <= ah && 3 * S + 2 * gx >= T * 6.2 + 10) return { S, s9, pv, ph, T, L, gx, gy, w, h, lab };
  }
  return null;
}
function finaleBoardPlace() {
  const b = finaleBoardEl; if (!b) return;
  const land = Screens.finale.landBox(), x0 = land ? Math.max(0, land.right) + 12 : innerWidth * .45;
  // 오른쪽 모서리 단추(소리 켬 · 건너뛰기) 줄 130px은 비워 둔다
  const aw = innerWidth - 130 - x0, ah = innerHeight - 24, z = finaleBoardSize(aw, ah);
  b.hidden = !z; if (!z) return;
  b.classList.toggle('noLab', !z.lab);
  for (const [k, v] of Object.entries({ S: z.S + 'px', s: z.s9, pv: z.pv + 'px', ph: z.ph + 'px', T: z.T + 'px', L: z.L + 'px', gx: z.gx + 'px', gy: z.gy + 'px' })) b.style.setProperty('--' + k, String(v));
  b.style.width = Math.round(z.w) + 'px'; b.style.left = Math.round(x0 + (aw - z.w) / 2) + 'px';
  b.style.top = Math.round(Math.max(12, (innerHeight - (b.offsetHeight || z.h)) / 2)) + 'px';
}
addEventListener('resize', () => { if (!finale) return; finaleBoardPlace(); if (finaleBoardEl?.querySelector('.fbSeal.rest')) finaleSealRest(); });
// 큰 도장이 갈 자리: 제목 옆 점선 칸
function finaleSealRest() {
  const b = finaleBoardEl, seal = b && b.querySelector('.fbSeal'), spot = b && b.querySelector('.fbSpot'); if (!seal || !spot) return;
  seal.classList.remove('rest'); spot.classList.add('got');
  const s = seal.getBoundingClientRect(), r = spot.getBoundingClientRect(), want = r.width, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  seal.style.setProperty('--tx', Math.round(cx - (s.left + s.width / 2)) + 'px'); seal.style.setProperty('--ty', Math.round(cy - (s.top + s.height / 2)) + 'px');
  seal.style.setProperty('--ts', (want / Math.max(1, seal.offsetWidth)).toFixed(3));
  seal.classList.add('rest');
}
function finaleStamp(i) {
  const b = finaleBoardEl, slot = b && b.querySelectorAll('.fbSlot')[i]; if (!slot) return;
  slot.classList.add('got');
  b.classList.remove('thud'); void b.offsetWidth; b.classList.add('thud');
  if (ctx) sample('buk', ctx.currentTime + .01, .5, sfx, 1, true);
}
// 도장 · 큰 도장 소리 넷은 곡을 하나도 안 연 채 지도에서 다시 볼 때도 들리게 따로 받는다(sfxReady는 곡이 있어야 부른다)
const FINALE_SFX = ['buk', 'jg-deong', 'kkw-gaeng', 'jing'];
function finaleSfx() {
  if (!ctx || ctx.silent) return Promise.resolve();
  return Promise.all(FINALE_SFX.filter(n => !sfxBuf[n]).map(n => fetch(`sfx/${n}.wav`).then(r => (r.ok ? r.arrayBuffer() : null)).then(b => b && ctx.decodeAudioData(b)).then(b => { if (b && !sfxBuf[n]) sfxBuf[n] = b; }).catch(() => {})));
}
// 아홉 칸이 다 차면: 큰 「소리 지도」 도장 · 판 흔들림 · 꽃가루
function finaleBigSeal() {
  const b = finaleBoardEl;
  if (b) { b.querySelector('.fbSeal')?.classList.add('on'); b.classList.remove('thud', 'boom'); void b.offsetWidth; b.classList.add('boom'); }
  if (FINALE_RM) return;
  for (let i = 0; i < 72; i++) {
    const e = document.createElement('i'), st = e.style; e.className = 'fcBit';
    st.left = (Math.random() * 100).toFixed(1) + '%';
    st.setProperty('--c', FINALE_BITS[i % FINALE_BITS.length]); st.setProperty('--z', (7 + Math.floor(Math.random() * 6)) + 'px');
    st.setProperty('--x', Math.round((Math.random() - .5) * 240) + 'px'); st.setProperty('--r', Math.round((Math.random() - .5) * 1080) + 'deg');
    st.setProperty('--d', (1.9 + Math.random() * 1.1).toFixed(2) + 's'); st.setProperty('--w', (Math.random() * .7).toFixed(2) + 's');
    finaleLayer.append(e);
  }
}

// replay: 지도에서 다시 보기(저장 · 도장 연출 없이 같은 장면)
function finaleStart(replay = false) {
  const plan = finalePlan();
  toMap(); Screens.showMap(save, null);
  if (!plan.length || !Screens.finale.begin()) { finaleDone(); return; }
  initAudio(); setMuted(!window.GF.sound); if (ctx.state !== 'running') ctx.resume();
  state = 'finale';
  finale = { id: ++finaleRunId, plan, replay, t0: nowS(), step: -1, stamped: 0, at: [], brightAt: Infinity, endAt: Infinity, said: new Set(), timers: [] };
  finaleLayer.hidden = false;
  finaleBoardBuild(plan);
  log('stage', { name: 'finale', regions: plan.map(p => p.region).join(','), replay });
  // 녹음은 고장마다 쓸 조각 하나만 받는다(가래 · 자진뱃노래는 한 곡 통째 파일이라 각 1MB 남짓)
  const loads = plan.filter(p => p.clip).map(p => voiceReady({ voice: { files: [p.clip.clip] } }));
  // 불러오는 중 나갔다가 다시 보면 앞 차례의 기다림이 새 차례를 건드리지 않게 차례 번호로 가른다
  const id = finale.id, mine = () => finale && finale.id === id;
  const go = () => { if (mine() && finale.step === -1) finaleRun(); };
  Promise.race([Promise.all([...loads, song ? sfxReady() : null, finaleSfx()]), new Promise(done => { if (mine()) finale.timers.push(setTimeout(done, FINALE_LOAD_MS)); })]).then(() => { if (mine()) finale.timers.push(setTimeout(go, Math.max(0, 1100 - (nowS() - finale.t0) * 1000))); });
}
// 고장마다 시작 시각을 소리 길이로 정한다
function finaleRun() {
  const f = finale; let t = nowS() - f.t0 + .05;
  f.plan.forEach((p, i) => {
    const last = i === f.plan.length - 1, len = p.clip ? Math.min(p.clip.len, last ? FINALE_LAST : FINALE_CLIP) : 1.6;
    f.at.push({ t, len }); t += last ? len : Math.max(1.4, len - FINALE_LAP);
  });
  f.step = 0; f.brightAt = t + .4; f.endAt = f.brightAt + 6.4;
}
// 고장마다 녹음 크기가 8dB까지 달라서(가래 -15.5 · 신고산 -23.8dB) 조각의 평균 크기를 -20dB에 맞춘다(0.5 ~ 2배 안)
function finaleGain(b, from, len) {
  const d = b.getChannelData(0), a = Math.floor(from * b.sampleRate), z = Math.min(d.length, Math.floor((from + len) * b.sampleRate));
  let sum = 0, n = 0; for (let i = a; i < z; i += 4) { sum += d[i] * d[i]; n++; }
  const rms = n ? Math.sqrt(sum / n) : 0;
  return rms > 1e-5 ? Math.min(2, Math.max(.5, Math.pow(10, -20 / 20) / rms)) : 1;
}
function finaleUpdate() {
  if (!finale || finale.step < 0) return;
  const f = finale, t = nowS() - f.t0;
  while (f.step < f.plan.length && t >= f.at[f.step].t) {
    const p = f.plan[f.step], prev = f.plan[f.step - 1];
    Screens.finale.light(p.region, p.kid, prev && prev.region);
    if (ctx && p.clip && voiceBuf[p.clip.clip]) {
      const from = Math.max(0, p.clip.base - p.pre), len = f.at[f.step].len + (p.clip.base - from);
      playVoice(p.clip.clip, from, len, ctx.currentTime + .02, finaleGain(voiceBuf[p.clip.clip], from, len), music, 1, 0, f.step === f.plan.length - 1 ? .5 : .35, .02);
    }
    log('finale-region', { region: p.region, song: p.song.id, clip: p.clip && p.clip.clip, len: f.at[f.step].len });
    f.step++;
  }
  while (f.stamped < f.step && t >= f.at[f.stamped].t + FINALE_STAMP_AT) finaleStamp(f.stamped++);
  if (f.step >= f.plan.length && f.stamped >= f.plan.length && t >= f.brightAt && !f.said.has('bright')) {
    f.said.add('bright');
    Screens.finale.bright(FINALE_LEAD);
    finaleBigSeal();
    if (ctx) { const c = ctx.currentTime + .05; sample('jg-deong', c, 1, sfx, 1, true); sample('kkw-gaeng', c + .04, .75, sfx, 1, true); sample('jing', c + .45, .5, sfx, 1, true); }
  }
  if (f.said.has('bright') && !f.said.has('rest') && t >= f.brightAt + 1.3) { f.said.add('rest'); finaleSealRest(); }
  if (f.said.has('bright')) {
    const k = t - f.brightAt, heads = Screens.finale.heads(), keep = new Set();
    if (heads && k >= 1.1) for (const [at, dur, who, text] of FINALE_LINES) if (k >= at && k < at + dur) { keep.add(at); finaleSay(at, text, heads[who]); }
    finaleClearSays(keep);
  }
  if (t >= f.endAt) finaleDone();
}
function finaleDone() {
  const replay = finale ? finale.replay : true;
  if (finale) for (const id of finale.timers) clearTimeout(id);
  finale = null; finaleLayer.hidden = true; finaleClearSays(); finaleBoardClear();
  if (ctx) killSound();
  if (!replay) { save = { ...save, soundMapSeen: true }; window.GF.save(save); }
  state = 'map';
  Screens.finale.end(save);
  log('stage', { name: 'finale-end', replay });
}
document.getElementById('finaleSkip').addEventListener('click', () => { if (!finale) return; log('stage', { name: 'finale-skip', step: finale.step }); finaleDone(); });
// 지도에서 이야기 다시 보기: 첫머리(① ② 뒤 ④ ⑤, 처음 배우기 · 본곡 없이) 또는 소리 지도
function storyAgain(kind) {
  if (finale) return;
  if (kind === 'finale') { finaleStart(true); return; }
  storyStart(); story.replay = true;
  document.getElementById('storyGo').click();
}
