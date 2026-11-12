// 화면: 낮은 해상도 판(점 하나 = 기기 화소 K)에 그림 묶음을 찍고 정수 배로 옮긴다. 놀이 값은 sim에서 읽기만 한다.
// 그림은 늘이지 않고 자세를 바꿔 끼운다. 그림 Pixel Frog 「Kings and Pigs」(CC BY 4.0), art/SOURCES.md
'use strict';
const { clamp, lerp, rngOf } = window.WreckRules;
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = k => 1 - (1 - k) * (1 - k);
const easeIn = k => k * k;
const cv = document.getElementById('c'), screenCtx = cv.getContext('2d', { alpha: false });
const dotBuf = document.createElement('canvas'), ctx = dotBuf.getContext('2d');
const ATLAS = window.WRECK_ATLAS, art = new Image();
let artReady = false;
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { wall: '#6A6080', ink: '#2B2540', cream: '#FFF6E5', sand: '#CDB48C', sandHi: '#E3CDA8', shade: '#A8906E', gold: '#FFC23C', pale: '#FFF3C4', amber: '#E28A2A', edge: '176,65,62' };
const ORD = ['첫 번째', '두 번째', '세 번째'];
const F = 16, BW = 96, CW = 32, PH = 26, SH = 15, ROPE = 2, GRAV = F * 10, PILE_STEP = 3, BOARD_W = 58, BOARD_H = 46;
const WALLS = ['wallBrick', 'wallWood', 'wallRed'];
const LOOK_OF = id => id === 1 ? WALLS : id === 2 ? ['wallWood', 'wallWood', 'wallWood'] : id === 7 ? ['w7a', 'w7a', 'w7a'] : id === 8 ? LOOK_OF(4) : [`w${id}a`, `w${id}b`, `w${id}c`];
const ROOF_OF = id => id === 1 || id === 2 ? 'roof' : id === 8 ? 'roof4' : `roof${id}`;
const kingFloor = v => sim.cfg.final && v % 10 === 5; // 왕의 성: 돼지 왕이 창에서 내다보다가 그 층이 깨지면 위로 달아난다
const CRACK = [[14, 1, 18, 6], [18, 6, 13, 10], [13, 10, 17, 15], [50, 1, 46, 5], [46, 5, 51, 9], [51, 9, 48, 15], [82, 2, 78, 7], [78, 7, 83, 11], [83, 11, 80, 15]];
let lookId = 1, curRoof = 'roof', slabKinds = {}, mapList = [], mapPath = true, forkOpen = null, forkEndless = false;
const bpmI = b => sim.cfg.final ? 2 : Math.min(b, 2);
let houseAt = null; // 위 표시 줄 흰 집 자리(점 좌표)
let Wc = 0, Hc = 0, DPR = 0, K = 1, U = 1, ox = 0, oy = 0, W = 0, H = 0, G = 12, GY = 0, BX = 0, WIDE = true, HUD_Y = 0, INSET = 0, RINSET = 0;
let bg, edgeImg, rubble, rubbleTop = 0, pieces = [], settled = 0, skipSign = null, skipKey = '', curWall = WALLS[0];
let pile = [], pileCap = 0;
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c, g, w: c.width, h: c.height }; }
const dotX = cx => (cx * DPR - ox) / K, dotY = cy => (cy * DPR - oy) / K;

function spr(name, i, x, y, flip = false, g = ctx) {
  const a = ATLAS[name], sx = a.x + (i % a.n) * a.w; x = Math.round(x); y = Math.round(y);
  if (flip) { g.save(); g.translate(x + a.w, y); g.scale(-1, 1); g.drawImage(art, sx, a.y, a.w, a.h, 0, 0, a.w, a.h); g.restore(); }
  else g.drawImage(art, sx, a.y, a.w, a.h, x, y, a.w, a.h);
}
const ADV = { digB: 9, digBHot: 9, digBDim: 9, digI: 8, digS: 8, digSHot: 8, digD: 7 }, GAP = { x: 10, '=': 11 };
function numW(t, set) { let w = 0; for (const c of t) w += c === ' ' ? 3 : ADV[set]; return w + ATLAS[set].w - ADV[set]; }
function drawNum(t, x, y, set, align = 'l', g = ctx) {
  x = Math.round(align === 'c' ? x - numW(t, set) / 2 : align === 'r' ? x - numW(t, set) : x);
  for (const c of t) { if (c === ' ') { x += 3; continue; } spr(set, c in GAP ? GAP[c] : +c, x, y, false, g); x += ADV[set]; }
}
const centerSpr = (name, cx, y, g = ctx) => spr(name, 0, Math.round(cx - ATLAS[name].w / 2), y, false, g);
function pxCircle(cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r); if (r < 1) return;
  ctx.fillStyle = c; let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) ctx.fillRect(cx + a, cy + b, 1, 1);
    y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}
function pxDisc(cx, cy, r, c, step = 1) { cx = Math.round(cx); cy = Math.round(cy); ctx.fillStyle = c; for (let d = -r; d <= r; d += step) { const w = Math.round(Math.sqrt(r * r - d * d)); ctx.fillRect(cx - w, cy + d, w * 2 + 1, 1); } }
function pxLine(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 600; n++) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function plate(g, x, y, w, h) { g.fillStyle = COL.ink; g.fillRect(x, y, w, h); g.fillStyle = COL.sand; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.fillStyle = COL.sandHi; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillStyle = COL.shade; g.fillRect(x + 1, y + h - 2, w - 2, 1); }

function layout() {
  Wc = innerWidth; Hc = innerHeight; DPR = devicePixelRatio || 1; WIDE = Wc > Hc * 1.05;
  const cw = Math.round(Wc * DPR), ch = Math.round(Hc * DPR);
  cv.width = cw; cv.height = ch; cv.style.width = `${cw / DPR}px`; cv.style.height = `${ch / DPR}px`;
  G = WIDE ? 12 : 30;
  const ideal = Math.min(Hc / ((Hc < 420 ? 5 : 7) * F + G), Wc / (WIDE ? 192 : 104));
  K = Math.max(1, Math.floor(ideal * DPR));
  if (scene === 'play' && WIDE) { // 낮은 가로 폰도 높아진 첫 채의 식 판과 아래층을 위 표시 줄 밑에 둔다.
    const gap = window.WreckRules.START_GAP[0] * sim.cfg.capMul;
    while (K > 1 && Math.floor(ch / K) - G - gap * F - F - SH - 1 < 17) K--;
  }
  // 세로 폰에서도 문 셋과 왕이 한 바닥을 쓴다. 방 전체가 같은 정수 배율이며 바닥 높이는 유지한다.
  if (scene === 'fork') { const floorK = K; K = Math.max(1, Math.min(K, Math.floor(cw / 192))); G = Math.round(G * floorK / K); }
  U = K / DPR;
  W = Math.ceil(cw / K); H = Math.ceil(ch / K);
  ox = Math.floor((cw - W * K) / 2); oy = ch - H * K;
  dotBuf.width = W; dotBuf.height = H; ctx.imageSmoothingEnabled = false;
  GY = H - G; BX = (W - BW) >> 1;
  // 사이트 안에서는 위 양쪽 구석에 나가기 · 소리 단추가 있다. 좁은 화면은 그 아래 줄로 내린다
  HUD_Y = window.GF.inFrame && Wc < 620 ? Math.ceil(50 / U) : 0;
  INSET = window.GF.inFrame && Wc >= 620 ? Math.ceil(130 / U) : 0;
  RINSET = window.GF.inFrame ? INSET : Math.ceil(56 / U);
  bakeBg(); bakeEdge(); bakeGold(); if (!pieces.length) bakePieces();
  rubbleTop = GY - Math.ceil(F * 1.5); rubble = mk(W, H - rubbleTop);
  pile = new Array(Math.ceil(W / PILE_STEP) + 2).fill(0);
  skipKey = ''; forkBg = null; forkSet = null; fitDom();
}
// 화면 글은 갈무리 12px 격자의 정수 배로, 테두리는 점 하나 굵기로 맞춘다
function fitDom() {
  const least = Math.ceil(DPR), snap = css => Math.max(least, Math.round(css * DPR / 12)) * 12 / DPR, root = document.documentElement.style;
  const set = (n, v) => root.setProperty(n, `${v}px`);
  set('--dot', K / DPR); set('--dot2', Math.max(1, Math.round(K / 3)) / DPR);
  set('--t1', snap(clamp(Math.min(Hc * .07, Wc * .08), 20, 54))); set('--t2', snap(clamp(Hc * .03, 14, 24))); set('--t3', snap(clamp(Math.min(Wc * .027, Hc * .03), 12, 24)));
  set('--go', snap(clamp(Hc * .045, 16, 36))); set('--go1', snap(clamp(Hc * .06, 18, 48)));
  set('--startY', Math.round((oy + titleLogoBottom() * K) / DPR) + 6);
  set('--frameRow', window.GF.inFrame ? 66 + 1 / DPR - 2 * K / DPR : 0); /* 위 여백 3점과 튀는 거리 1점, 반올림 여유 1화소까지 넣는다 */
  set('--backX', window.GF.inFrame && Wc >= 620 ? 136 : 8); set('--menuTop', window.GF.inFrame && Wc < 620 ? 74 : 8);
  set('--t4', snap(12)); set('--tt', snap(Hc < 500 ? 16 : clamp(Hc * .03, 14, 24))); // 도움 판: 폰 가로도 16px
  set('--creditBottom', G > 12 ? 8 : Math.ceil(Hc - (oy + GY * K) / DPR + 8)); // 이름표 아래가 넓으면 바닥 아래, 낮은 가로 화면은 문 오른쪽
  set('--te', snap(clamp(Math.min(Hc * .06, Wc * .045), 16, 48))); set('--fr', endFrameDots() * U);
  root.setProperty('--startX', WIDE ? `${Math.round((ox + ((W - BW - 6) >> 1) * K) / DPR)}px` : '50%');
}
// 단계마다 방(2026-11-07 대표가 방 시안을 다 고름). 재료는 묶음 그림을 단계 색으로 다시 칠한 것, 높은 탑의 구름 · 언덕만 직접 찍는다
const toneCache = {};
function toned(name, tone, gain) { // 밝기는 두고 색만 바꾼다
  const key = `${name}|${tone}|${gain}`; if (toneCache[key]) return toneCache[key];
  const a = ATLAS[name], c = mk(a.w, a.h); c.g.drawImage(art, a.x, a.y, a.w, a.h, 0, 0, a.w, a.h);
  const d = c.g.getImageData(0, 0, a.w, a.h), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = Math.min(1, (.3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]) / 255 * gain); p[i] = tone[0] * l; p[i + 1] = tone[1] * l; p[i + 2] = tone[2] * l; }
  c.g.putImageData(d, 0, 0); if (artReady) toneCache[key] = c.c; // 그림을 받기 전에 칠한 빈 판은 담아 두지 않는다
  return c.c;
}
// 단 표가 뜨는 단계는 그 자리에 꾸밈을 두지 않는다(판 뒤가 어지러우면 숫자가 안 읽힌다). 걸리면 판 아래로 내린다
function roomFree(x, y, w, h) {
  const st = window.WreckRules.STAGES.find(v => v.id === lookId); if (!WIDE || !st || st.help === 'none') return true;
  const p = skipPos(); return x + w <= p.x - 2 || x >= p.x + BOARD_W + 2 || y + h <= p.y - 2 || y >= p.y + BOARD_H + 2;
}
function roomLow(x, y, w, h) { if (roomFree(x, y, w, h)) return y; const d = skipPos().y + BOARD_H + 4; return d + h <= GY - 2 ? d : null; }
function roomPut(g, n, x, y) { const a = ATLAS[n]; if (roomFree(x, y, a.w, a.h)) spr(n, 0, x, y, false, g); }
function roomShelf(g, x, y, w) { const a = ATLAS.rmShelf; if (roomFree(x, y, w, a.h)) g.drawImage(art, a.x, a.y, w, a.h, x, y, w, a.h); }
function roomBanner(g, x, y, tone, gain) { const a = ATLAS.rmBanner; if (roomFree(x, y, a.w, a.h)) g.drawImage(toned('rmBanner', tone, gain), x, y); return a; }
function roomFloor(g, tone, gain = 1.2) {
  const band = tone && toned('floorBand', tone, gain), deep = tone && toned('floorDeep', tone, gain * .85);
  for (let x = 0; x < W; x += 32) {
    if (band) g.drawImage(band, x, GY); else spr('floorBand', 0, x, GY, false, g);
    if (G > 12) { if (deep) g.drawImage(deep, x, GY + 12); else spr('floorDeep', 0, x, GY + 12, false, g); }
  }
}
function roomWash(g, color) { g.fillStyle = color; g.fillRect(0, 0, W, GY); }
function woodWall(g, tone, gain) { const t = toned('rmWood', tone, gain); for (let y = 0, r = 0; y < GY; y += 64, r++) for (let x = r % 2 ? -32 : 0; x < W; x += 64) g.drawImage(t, x, y); } // 반 칸씩 밀어 무늬 줄이 안 맞게
function brickWall(g, name, tone, gain) { const t = toned(name, tone, gain); for (let y = 0, r = 0; y < GY; y += 16, r++) for (let x = r % 2 ? -48 : 0; x < W; x += 96) g.drawImage(t, x, y); }
function boxPile(g, right, rows) { const a = ATLAS.bxIdle; for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) roomPut(g, 'bxIdle', right - (i + 1) * (a.w - 2) - r * 10, GY - (r + 1) * (a.h - 1)); }
function bombPile(g, right, rows) { for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) roomPut(g, 'bmOff', right - (i + 1) * 12 - r * 6, GY - (r + 1) * 11 - 8); }
function cloud(g, x, y, w) {
  g.fillStyle = '#F4F8FF'; [[0, 3, w, 5], [w * .14, 0, w * .36, 7], [w * .44, 1, w * .34, 7]].forEach(p => g.fillRect(Math.round(x + p[0]), Math.round(y + p[1]), Math.round(p[2]), p[3]));
  g.fillStyle = '#D5E2F4'; g.fillRect(Math.round(x + 2), y + 7, Math.round(w - 4), 2);
}
const ROOMS = { // 왼쪽과 오른쪽 위는 표시 · 도움 판 자리라 꾸밈은 오른쪽 아래에 둔다
  1(g) { // 돼지네 집
    g.fillStyle = COL.wall; g.fillRect(0, 0, W, H);
    if (WIDE) { spr('winGroup', 0, (BX >> 1) - 48, 4, false, g); spr('winGroup', 0, W - (BX >> 1) - 16, 7, false, g); g.fillStyle = 'rgba(106,96,128,.55)'; g.fillRect(0, 0, W, GY); }
    roomFloor(g);
  },
  2(g) { // 나무 창고: 벽과 바닥이 나무판, 구석에 상자 더미
    woodWall(g, [178, 128, 92], 1.1); roomWash(g, 'rgba(70,44,40,.34)'); roomFloor(g, [186, 132, 88], 1.25);
    if (WIDE) boxPile(g, W - 2, 3);
  },
  3(g) { // 폭탄 창고: 어두운 벽돌, 선반 위 폭탄과 구석의 폭탄 더미
    brickWall(g, 'wallRed', [112, 86, 104], 1.05); roomWash(g, 'rgba(44,28,44,.42)'); roomFloor(g, [120, 96, 104], 1.1);
    if (WIDE) {
      const y = roomLow(W - BX + 4, GY - 80, BX - 4, 33); if (y != null) { roomShelf(g, W - BX + 4, y + 18, BX - 4); for (let i = 0; i < 3; i++) spr('bmOff', 0, W - 22 - i * 15, y, false, g); }
      bombPile(g, W - 1, 4);
    }
  },
  4(g) { // 돌 성벽: 회색 돌, 파란 깃발, 아치 창
    brickWall(g, 'wallBrick', [136, 150, 168], 1.05); roomWash(g, 'rgba(46,54,74,.42)'); roomFloor(g, [150, 160, 176], 1.15);
    if (WIDE) {
      const a = ATLAS.endArch, y = roomLow(W - 33, 24, a.w, a.h); if (y != null) roomPut(g, 'endArch', W - 33, y);
      roomBanner(g, BX - 28, 0, [86, 110, 150], 1.3); roomBanner(g, W - BX + 2, 0, [86, 110, 150], 1.3);
    }
  },
  5(g) { // 높은 탑: 꼭대기라 바깥 하늘이 보이고 땅이 저 아래에 있다
    const bands = ['#5F7FBE', '#6E8DC8', '#7E9BD1', '#8FAAD9', '#A0B9E0', '#B2C8E6'], bh = Math.ceil(GY / bands.length);
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * bh, W, bh + 1); });
    cloud(g, 8, 30, 38); cloud(g, W - 52, 22, 44); cloud(g, BX + BW + 2, 58, 26); cloud(g, 26, 66, 22);
    g.fillStyle = '#8FA8B8'; for (let x = 0; x < W; x += 4) { const h = 6 + Math.round(3 * Math.sin(x * .05)) + Math.round(2 * Math.sin(x * .13)); g.fillRect(x, GY - 8 - h, 4, h + 8); }
    g.fillStyle = '#7A97A0'; for (let x = 0; x < W; x += 4) { const h = 3 + Math.round(2 * Math.sin(x * .08 + 2)); g.fillRect(x, GY - 3 - h, 4, h + 3); }
    const m = toned('floorBand', [120, 132, 168], 1.2); for (let x = 0; x < W; x += 32) g.drawImage(m, 0, 0, 12, 12, x + 2, GY - 11, 12, 12); // 꼭대기 난간
    roomFloor(g, [120, 132, 168], 1.2);
  },
  6(g) { // 빈 상자 창고: 선반이 비었고 바닥에 상자 조각만 굴러다닌다
    woodWall(g, [118, 92, 142], 1.05); roomWash(g, 'rgba(44,30,66,.4)'); roomFloor(g, [132, 106, 150], 1.15);
    if (WIDE) {
      const y = roomLow(W - BX + 4, GY - 76, BX - 4, 41); if (y != null) [y, y + 26].forEach(v => roomShelf(g, W - BX + 4, v, BX - 4));
      [['chip1', 8], ['chip2', 30], ['chip3', W - 22], ['chip4', W - 42], ['chip1', W - 62], ['chip2', 48]].forEach(([n, x], i) => roomPut(g, n, x, GY - ATLAS[n].h + 1 - (i % 2)));
    }
  },
  7(g) { // 돼지 왕의 성: 붉은 벽돌, 왕관 깃발, 붉은 바닥에 금테
    brickWall(g, 'wallRed', [168, 70, 70], 1.05); roomWash(g, 'rgba(66,20,34,.42)'); roomFloor(g, [190, 60, 62], 1.2);
    g.fillStyle = '#FFC23C'; g.fillRect(0, GY, W, 1);
    if (WIDE) {
      roomPut(g, 'endArch', W - 33, 24);
      [BX - 29, W - BX + 3].forEach(x => { roomBanner(g, x, 0, [206, 58, 62], 1.35); spr('crown', 0, x + 5, 58, false, g); });
    }
  },
};
let bgRoom = 0;
const roomNow = () => lookId === 8 && sim && sim.cfg.endless ? 1 + Math.floor(sim.s.building / 3) % 7 : lookId; // 끝없는 성: 세 채마다 앞 단계 방을 차례로(곡과 같은 때)
function bakeBg() { bg = mk(W, H); bgRoom = roomNow(); (ROOMS[bgRoom] || ROOMS[1])(bg.g); }
function bakeFloor() { // 끝없는 성은 방과 건물을 세 채마다 같이 바꾼다
  const b = sim ? sim.s.building : 0, id = roomNow();
  curWall = LOOK_OF(id)[b % 3]; curRoof = ROOF_OF(id);
  if (id !== bgRoom) bakeBg();
}
function setLook(id) { lookId = id; bakeBg(); bakeFloor(); }
// 나뭇조각. 바닥에 남은 것은 벽 색으로 눌러 뒤로 물린다
function bakePieces() {
  const slabOf = n => { const pa = ATLAS[n]; return [0, 1, 2].map(i => { const sp = mk(CW, F); sp.g.drawImage(art, pa.x + i * CW, pa.y, CW, F, 0, 0, CW, F); return sp; }); };
  slabSp = slabOf('panel'); slabKinds = { panelHard: slabOf('panelHard'), panelFast: slabOf('panelFast') };
  pieces = [1, 2, 3, 4].map(i => {
    const n = `chip${i}`, a = ATLAS[n], sp = mk(a.w, a.h); spr(n, 0, 0, 0, false, sp.g);
    sp.dim = mk(a.w, a.h); sp.dim.g.drawImage(sp.c, 0, 0); sp.dim.g.globalCompositeOperation = 'source-atop'; sp.dim.g.fillStyle = 'rgba(106,96,128,.45)'; sp.dim.g.fillRect(0, 0, a.w, a.h);
    return sp;
  });
}
function bakeEdge() {
  edgeImg = mk(W, H); const g = edgeImg.g, st = Math.ceil(Math.min(W, H) * .15 / 3);
  [.32, .2, .1].forEach((a, i) => { const d = i * st; g.fillStyle = `rgba(${COL.edge},${a})`; g.fillRect(d, d, W - d * 2, st); g.fillRect(d, H - d - st, W - d * 2, st); g.fillRect(d, d + st, st, H - (d + st) * 2); g.fillRect(W - d - st, d + st, st, H - (d + st) * 2); });
}
function bakeGold() {
  edgeGold = mk(W, H); const g = edgeGold.g, st = Math.ceil(Math.min(W, H) * .1 / 2);
  [.34, .16].forEach((a, i) => { const d = i * st; g.fillStyle = `rgba(255,194,60,${a})`; g.fillRect(d, d, W - d * 2, st); g.fillRect(d, H - d - st, W - d * 2, st); g.fillRect(d, d + st, st, H - (d + st) * 2); g.fillRect(W - d - st, d + st, st, H - (d + st) * 2); });
}
function bakeCell(c) { // 막힌 칸에 금을 긋는다
  const x = BX + c * CW, lines = [];
  for (let n = 0; n < 3; n++) { let px0 = CW / 2 + rand(-8, 8), py0 = F - 2; for (let i = 0; i < 3; i++) { const px1 = px0 + rand(-5, 5), py1 = py0 - 4; lines.push([px0, py0, px1, py1]); px0 = px1; py0 = py1; } }
  cellCracks[c] = { x, lines };
}
function bakeCells() { cellCracks = [null, null, null]; }

// 뛰어 세기 판: 단계 1의 도움. 지금 식의 단 하나만. 가로 화면은 건물 옆, 세로 화면은 땅에 두 줄
function skipRow(d) { return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => d * n); }
function bakeSkip(d) {
  const key = `${d}|${W}x${H}`; if (key === skipKey) return; skipKey = key;
  if (!WIDE) {
    const cell = (W - 6) / 5;
    skipSign = mk(W - 4, G - 4); const g = skipSign.g; plate(g, 0, 0, skipSign.w, skipSign.h);
    drawNum(String(d), 3, 2, 'digI', 'l', g); spr('wDan', 0, 11, 2, false, g);
    skipRow(d).forEach((v, i) => { const n = i + 1; drawNum(String(v), 3 + cell * ((n % 5) + .5), n < 5 ? 3 : 15, 'digD', 'c', g); });
    return;
  }
  skipSign = mk(BOARD_W, BOARD_H); const g = skipSign.g; plate(g, 0, 0, BOARD_W, BOARD_H);
  const hx = (BOARD_W - 19) >> 1;
  drawNum(String(d), hx, 2, 'digI', 'l', g); spr('wDan', 0, hx + 8, 2, false, g);
  skipRow(d).forEach((v, i) => drawNum(String(v), 11 + 18 * (i % 3), 15 + 10 * Math.floor(i / 3), 'digD', 'c', g));
}

/* ---------- 효과 ---------- */
let stars = [], gems = [], embers = [], bubbles = [], emberAcc = 0, fxSlowT = 0, wasLow = false, lastBub = -9, scoreAt = { x: 0, y: 0 }, edgeGold; let slabs = [], slabSp = [], chunks = [], dust = [], sparks = [], puffs = [], floats = [], rings = [], streaks = [], ripples = [], cracks = [], booms = [], pigs = [];
let tapX = null, tapY = null, combo = 0, comboPop = 0, eqText = '', eqT = 0, cellCracks = [null, null, null];
let flash = null, screenFlash = 0, kick = 0, swing = 0, swingV = 0, bandT = 0, shake = { t: 0, dur: 1, amp: 0 }, pressAnim = [0, 0, 0], dori = [0, 0, 0], heartPop = [0, 0, 0], heartLost = [false, false, false], shownScore = 0, scorePop = 0;
let lastFloor = false, bigWord = 0, dangerBeat = 0, nextWord = null;
const hero = { x: 0, y: 0, mode: 'idle', t: 0, x0: 0, y0: 0, x1: 0, y1: 0, flip: 1, squash: 0, level: 0, slashT: 0, dur: .3 };
const crowd = [{ side: -1, x: 0, hop: 0, gone: false, moving: false }, { side: 1, x: 0, hop: 0, gone: false, moving: false }];
const crowdHome = c => c.side < 0 ? BX - 16 : BX + BW + 14;
const fireLevel = n => n >= 20 ? 4 : n >= 15 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0; // 왕 몸 불꽃: 5 · 10 · 15 · 20연속마다 세진다(2026-11-08 대표)
const bladeLevel = n => n >= 10 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
// 층마다 정해진 자리에 상자 돼지가 있다. 그 층이 맨 아래가 되면 뛰어내린다
const hasPig = v => v % 4 === 2, pigCol = v => ((v * 7) % 2) * 2; // 가운데 칸은 다음 식 판 자리라 비운다
function pileAt(x) { if (!pile.length) return 0; const f = clamp(x / PILE_STEP, 0, pile.length - 1.001), i = Math.floor(f), k = f - i; return pile[i] * (1 - k) + pile[i + 1] * k; }
const groundY = x => GY - pileAt(x) * .5;
const colX = c => BX + CW * (c + .5);
const bottomY = () => GY - sim.s.gap * F + kick;
function addShake(pct, dur) { if (CALM) return; const amp = Math.min(W, H) * pct / 100; if (amp >= shake.amp * Math.max(0, shake.t / shake.dur)) shake = { t: dur, dur, amp }; }
function addPuffs(x, y, n, s = 1) { for (let i = 0; i < n; i++) puffs.push({ x: x + rand(-F * .3, F * .3), y: y + rand(-F * .05, F * .05), vx: rand(-F * .9, F * .9), vy: rand(-F * .8, -F * .1), s: F * rand(.16, .28) * s, life: 0, max: rand(.3, .5) }); }
function addDust(x, y, n, pow = 1, fan = true) {
  const cols = ['#D18679', '#F0BE96', '#8E5A5A', COL.cream];
  for (let i = 0; i < n; i++) { const a = fan ? rand(-.25, Math.PI + .25) : rand(0, 6.28), v = F * rand(1, 4.2) * pow; dust.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8 - F * .6, s: Math.random() < .3 ? 2 : 1, c: cols[Math.floor(rand(0, 4))], life: 0, max: rand(.35, .75) }); }
}
function addSparks(x, y, n, pow = 1, c = COL.gold) { for (let i = 0; i < n; i++) { const a = rand(.1, Math.PI - .1), v = F * rand(3, 8) * pow; sparks.push({ x, y, vx: Math.cos(a) * v * (Math.random() < .5 ? 1 : -1), vy: -Math.sin(a) * v * .2 + F * rand(0, 3), life: 0, max: rand(.14, .3), c: Math.random() < .4 ? '#fff' : c }); } }
function addBoom(x, y, delay = 0) { booms.push({ x, y, t: -delay }); }
function spawnPig(x, y, kind = 'pig', tx = null, die = false) {
  if (kind === 'pig' && !die && pigs.filter(p => p.kind === 'pig' && !p.die).length >= 4) return;
  pigs.push({ kind, x, y, vy: -F * 3, mode: 'fall', t: 0, dir: x < W / 2 ? -1 : 1, tx, die });
}
// 조각을 그 자리에서 터뜨린다. top은 터지는 층의 윗면. 금방 사라지고 몇 개만 바닥에 남는다
function shatter(col, tier, streak, top) {
  const huge = tier === 'big' || tier === 'chae', lvl = bladeLevel(streak), n = huge ? 12 : tier === 'mid' ? 8 : 7 + lvl; // 작은 반응도 연속이 오르면 조각이 는다
  const hx = colX(col), hy = top + F, pow = (huge ? 1.5 : tier === 'mid' ? 1.2 : 1) * (1 + lvl * .12);
  for (let i = 0; i < n; i++) {
    const sp = pieces[i % 4], cx = huge ? BX + (i + .5) / n * BW : hx + rand(-CW * .45, CW * .45), cy = top + rand(3, F - 3);
    chunks.push({ sp, w: sp.w, h: sp.h, x: cx, y: cy, front: !huge, vx: huge ? (cx - hx) * rand(.9, 1.7) * pow + rand(-F * .4, F * .4) : (cx - hx) * rand(2, 3.4) * pow + rand(-F, F), vy: huge ? -F * rand(1, 3) * pow : F * rand(-1.8, .4) * pow, r: 0, vr: rand(4, 11) * (Math.random() < .5 ? 1 : -1), bounces: 0, keep: Math.random() < (huge ? .5 : .25), life: 0, max: huge ? 1.4 : .85 });
  }
}
const quarter = r => (Math.round(r / (Math.PI / 2)) & 3) * Math.PI / 2; // 돌리기는 90도씩(점이 비뚤어지지 않게)
function settle(c) {
  const y = clamp(c.y, 0, H), g = rubble.g;
  g.save(); g.translate(Math.round(c.x), Math.round(y - rubbleTop)); g.rotate(quarter(c.r)); g.drawImage(c.sp.dim.c, -(c.w >> 1), -(c.h >> 1)); g.restore(); settled++;
  const i = clamp(Math.round(c.x / PILE_STEP), 0, pile.length - 1), add = c.h * .14;
  for (let k = -3; k <= 3; k++) { const n = i + k; if (n >= 0 && n < pile.length) pile[n] = Math.min(pileCap, pile[n] + add * (1 - Math.abs(k) / 4)); }
}
function heroLeap(col) {
  if (door.mode === 'open' || door.mode === 'opening') castDoor(false); // 문에서 나오다 바로 답을 눌러도 문은 닫힌다
  hero.x0 = hero.x; hero.y0 = hero.y; hero.x1 = colX(col);
  hero.y1 = Math.min(groundY(hero.x1), bottomY() + 40); // 망치 머리가 맨 아래 층에 닿는 높이
  hero.flip = hero.x1 < hero.x - 1 ? -1 : hero.x1 > hero.x + 1 ? 1 : hero.flip;
  hero.mode = 'leap'; hero.t = 0;
  streaks.push({ x0: hero.x, y0: hero.y - 14, x1: hero.x1, y1: hero.y1 - 14, life: 0, max: .12 });
}
function resetFx() {
  stars = []; gems = []; embers = []; bubbles = []; emberAcc = 0; fxSlowT = 0; wasLow = false; slabs = []; chunks = []; dust = []; sparks = []; puffs = []; floats = []; rings = []; streaks = []; ripples = []; cracks = []; booms = []; pigs = [];
  combo = 0; comboPop = 0; eqT = 0; tapX = tapY = null; cellCracks = [null, null, null]; heartLost = [false, false, false];
  flash = null; screenFlash = 0; kick = 0; swing = 0; swingV = 0; bandT = 0; shake = { t: 0, dur: 1, amp: 0 }; heartPop = [0, 0, 0]; shownScore = sim.s.score;
  lastFloor = false; bigWord = 0; nextWord = null; pileCap = F * .45;
  pile.fill(0); rubble = mk(W, H - rubbleTop);
  hero.x = (W >> 1) - 34; hero.y = GY; hero.x1 = hero.x; hero.y1 = hero.y; hero.mode = 'idle'; hero.level = 0; hero.squash = 0; hero.flip = 1; settled = 0;
  for (const c of crowd) { c.hop = 0; c.moving = false; }
  castReset();
}
const BPM = [122, 128, 134], BPM_LAST = [134, 140, 150];
function onEvent(e) {
  const s = sim.s;
  castEvent(e);
  switch (e.t) {
    case 'land':
      kick = 3; addPuffs(BX, bottomY(), 4, .8); addPuffs(BX + BW, bottomY(), 4, .8); addDust(W / 2, bottomY(), 10, 1); addShake(.75, .12); sfxDrop(s.building > 0 ? 1 : .8);
      if (s.building > 0) { // 새 건물의 쿵에 잔해가 납작해진다(주인공 머리 위 틈을 지키려고)
        const old = rubble, base = GY - rubbleTop, k = .45;
        rubble = mk(W, H - rubbleTop); rubble.g.drawImage(old.c, 0, base * (1 - k), W, old.h * k);
        pile = pile.map(v => v * k); pileCap = F * .45; settled = 0;
        addPuffs(W / 2, GY, 10, 1.4); addShake(.5, .16);
        if (hero.mode === 'cheer') { hero.mode = 'idle'; hero.squash = .6; }
      }
      break;
    case 'next':
      lastFloor = false; musicAfter = .5;
      if (!sim.cfg.endless) nextWord = { t: -.95, img: e.building === sim.cfg.buildings - 1 ? 'wB3' : 'wB2' };
      gameLog('stage', { name: 'next', building: e.building, score: s.score, streak: s.streak, hearts: s.hearts });
      musBpm = BPM[bpmI(e.building)]; if (sim.cfg.endless) musicWant(musicTrack(0, true, e.building)); // 끝없는 성: 무너지는 순간과 같은 때라 곡은 무너지는 소리에 묻혀 바뀐다
      break;
    case 'heal': heartPop[e.i] = 1; heartLost[e.i] = false; sfxHeal(); break;
    case 'crack': { // 쇠 층: 금만 가고 층은 남는다
      const top = GY - (e.g0 + 1) * F, hy = top + F, x = colX(e.col);
      addSparks(x, hy, 12, 1.2, '#D6E0EC'); addDust(x, hy, 12, 1.1); addBoom(x, hy + 8); addShake(.75, .2); buzz(30); sfxBreak(2); sfxLevel();
      flash = null; kick = -F * .2; swingV = 4.5; combo = e.streak; comboPop = 1;
      hero.mode = 'fallOk'; hero.t = 0; hero.y0 = hero.y; hero.dur = .14 + .2 * clamp((groundY(hero.x) - hero.y) / (F * 3), 0, 1);
      break;
    }
    case 'dashWarn': sfxDanger(); addDust(BX + rand(0, BW), bottomY(), 6, .8); break;
    case 'dash': kick = 2; addPuffs(BX, bottomY(), 3, .8); addPuffs(BX + BW, bottomY(), 3, .8); addShake(.6, .16); sfxThud(.9); break;
    case 'bomb': { // 폭탄: 건물 밑에서 터져 두 층 밀어 올린다
      const y = bottomY(); [.1, .5, .9].forEach((k, i) => addBoom(BX + BW * k, y, i * .05));
      rings.push({ x: W / 2, y, r: 5, vr: Math.max(W, H) * .9, life: 0, max: .34, c: COL.gold });
      addDust(W / 2, y, 30, 1.5); addShake(.8, .25); buzz(40); sfxBomb(.4); kick = -F * .4; swingV = 4.5; for (const c of crowd) c.hop = 1;
      gameLog('stage', { name: 'bomb', gap: +s.gap.toFixed(2) });
      break;
    }
    case 'teach': gameLog('stage', { name: 'teach', id: e.id }); break;
    case 'squeeze': sfxThud(.7); kick = 1; addPuffs(BX, bottomY(), 3, .7); addPuffs(BX + BW, bottomY(), 3, .7); addShake(.35, .14); break;
    case 'drop': bakeFloor(); castStage(e.building); break;
    case 'floor':
      bakeCells(); swing = 0; swingV = 2.6;
      if (e.left <= 4 && s.phase === 'play') {
        musBpm = BPM_LAST[bpmI(s.building)];
        if (e.left === 4 && !e.again) nextWord = { t: .001, img: s.building === sim.cfg.buildings - 1 ? 'wLast' : 'wLeft4' }; // 막판은 마지막 건물에서만
      }
      if (e.last && !lastFloor) { lastFloor = true; musicLevel(MUS_VOL * .5); rumble(true); }
      break;
    case 'press':
      pressAnim[e.col] = 1; sfxTick(); sfxSwoosh(hero.level); heroLeap(e.col);
      if (e.ok) cracks.push({ x: tapX ?? colX(e.col), y: tapY ?? bottomY() - F * .5, a: rand(0, 1), life: 0 });
      tapX = tapY = null;
      gameLog('input', { q: `${s.cur.a}x${s.cur.b}`, col: e.col, val: s.cur.choices[e.col].v, ok: e.ok, rt: +e.rt.toFixed(2), gap: +s.gap.toFixed(2) });
      break;
    case 'tick': if (e.col != null) dori[e.col] = 1; sfxLow(); break;
    case 'contact': {
      hero.mode = 'slash'; hero.t = 0; hero.slashT = 0; hero.x = hero.x1; hero.y = hero.y1;
      hero.level = bladeLevel(e.streak);
      flash = { col: e.col, life: .075 };
      stars.push({ name: e.tier === 'big' ? 'fxStarL' : e.tier === 'small' ? 'fxStarS' : 'fxStarM', x: colX(e.col), y: bottomY() - F * .5, t: 0 });
      if (e.tier === 'big' && !CALM) screenFlash = .16;
      if (e.tier === 'mid') { rings.push({ x: hero.x, y: hero.y - 30, r: 5, vr: 130, life: 0, max: .26, c: COL.gold }); for (const c of crowd) c.hop = 1; } // 구경 돼지도 놀란다
      eqText = `${e.q.a}x${e.q.b}=${e.q.a * e.q.b}`; eqT = 1.2;
      gameLog('success', { streak: e.streak, pts: e.pts, tier: e.tier });
      break;
    }
    case 'break': {
      const lv = bladeLevel(e.streak), top = GY - (e.g0 + 1) * F, hy = top + F, x = colX(e.col);
      shatter(e.col, e.tier, e.streak, top);
      { const huge = e.tier === 'big' ? 12 : e.tier === 'chae' ? 6 : 0, n = huge || 1 + (lv >= 2 ? 1 : 0) + (lv >= 3 ? 1 : 0); for (let i = 0; i < n; i++) gems.push({ x, y: hy - 8, vx: rand(-F * 3.2, F * 3.2), vy: -F * rand(3.5, 6), t: -i * .04, fly: .22 }); } // 다이아가 튀어 점수로 날아간다
      if (e.tier !== 'big' && e.tier !== 'chae') for (let i = 0; i < 3; i++) if (i !== e.col) slabs.push({ sp: (slabKinds[e.kind] || slabSp)[i], x: BX + i * CW, y: top, vx: Math.sign(i - e.col) * F * (1.2 + Math.abs(i - e.col) * .8), vy: F * 2.5 }); // 다음 숫자를 오래 가리지 않게 금방 떨어진다
      if (!e.left && s.cur) floats.push({ x: W >> 1, y: bigWordY() + ATLAS.wBig.h + 2, t: `${s.cur.a} x ${s.cur.b} = ${s.cur.ans}`, life: 0, max: 1.5 });
      if (e.near) { nextWord = { t: .001, img: 'wNear' }; rings.push({ x: W / 2, y: hy, r: 5, vr: Math.max(W, H) * .9, life: 0, max: .34, c: COL.gold }); }
      if (kingFloor(s.bb - 1) && e.left > 0) { // 창에 있던 돼지 왕이 튀어나와 위로 달아난다
        spawnPig(W / 2, hy, 'kpr'); const kr = pigs[pigs.length - 1]; kr.vy = -F * 6; kr.dir = hero.x < W / 2 ? 1 : -1; kr.up = 34; bubbles.push({ name: 'bubNo', who: kr, t: 0, dur: .85 }); addShake(.75, .2);
      }
      if (e.tier === 'big' || e.tier === 'chae') {
        const fin = e.tier === 'big', spots = fin ? [.12, .88, .3, .7, .5] : [.28, .72];
        addDust(x, hy, fin ? 24 : 14, 1.6); addSparks(x, hy, fin ? 6 : 4, 1.5); addPuffs(W / 2, GY, fin ? 12 : 6, 1.5);
        spots.forEach((k, i) => { addBoom(BX + BW * k, hy - rand(0, 10), i * .06); stars.push({ name: fin ? 'fxStarL' : 'fxStarM', x: BX + BW * k, y: hy - rand(0, 12), t: -i * .07 }); });
        if (fin) fxSlowT = .42;
        for (let i = 0; i < (fin ? 16 : 6); i++) { const sp = pieces[i % 4]; chunks.push({ sp, w: sp.w, h: sp.h, x: W / 2 + rand(-BW * .55, BW * .55), y: rand(-H * .4, -F * .2), vx: rand(-F, F), vy: rand(0, F * 2), r: rand(0, 6), vr: rand(-6, 6), bounces: 0, keep: Math.random() < .5, life: 0, max: 2 }); }
        pileCap = F * .6; addShake(fin ? 1.4 : 1, fin ? .42 : .3); buzz(fin ? [70, 40, 80] : 50);
        for (const c of crowd) c.gone = true;
        if (fin) { // 마지막 건물만: 큰 글, 고리, 돼지 왕이 튀어 올랐다 떨어져 왕관이 벗겨진다
          bigWord = .001; nextWord = null; rings.push({ x: W / 2, y: hy, r: 5, vr: Math.max(W, H) * 1.5, life: 0, max: .5, c: '#fff' });
          const ex = kingSpot(); spawnPig(W / 2, hy, 'kp', ex - 30); pigs[pigs.length - 1].vy = -F * 7;
          spawnPig(BX + 18, hy, 'pig', null, true); spawnPig(BX + BW - 18, hy, 'pig', null, true); // 돼지 둘은 쓰러진 채 남는다
          gems.push({ big: true, x: W / 2, y: hy - 8, vx: 0, vy: -F * 7, t: -.1, fly: .55 });
        } else { // 앞 건물: 돼지 하나는 도망, 하나는 쓰러지고, 돼지 왕은 다음 건물로 달아난다
          spawnPig(BX + 24, hy); bubbles.push({ name: 'bubX', who: pigs[pigs.length - 1], t: 0, dur: .8 }); spawnPig(BX + BW - 24, hy, 'pig', null, true);
          spawnPig(W / 2, hy, 'kpr'); const kr = pigs[pigs.length - 1]; kr.vy = -F * 6; kr.dir = hero.x < W / 2 ? 1 : -1; kr.up = 34; bubbles.push({ name: 'bubNo', who: kr, t: 0, dur: .85 });
        }
        rumble(false); sfxCollapse(fin); musicLevel(MUS_VOL * .25, .1);
      } else {
        if (sim.cfg.power && e.streak >= 5) addSparks(x, hy, 6, 1.3, '#FF8A3C');
        addDust(x, hy, e.tier === 'mid' ? 20 : 7, 1 + .15 * lv); addSparks(x, hy, e.tier === 'mid' ? 10 : 5 + lv, 1 + .12 * lv);
        addPuffs(x, hy, e.tier === 'mid' ? 4 : 2, .8);
        if (e.tier === 'mid') { addBoom(x, hy + 8); addShake(.75, .2); buzz(30); sfxLevel(); stars.push(WIDE ? { name: 'fxStarM', x: BX >> 1, y: comboY() + 8, t: 0 } : { name: 'fxStarM', x: W >> 1, y: hudBottom() + 8, t: 0 }); }
        sfxBreak(lv + (e.tier === 'mid' ? 1 : 0));
      }
      if (e.streak > 0) sfxStreak(e.streak);
      flash = null; kick = -F * (.22 + .06 * lv); swingV = 4.5;
      combo = e.streak; comboPop = 1;
      if (e.left > 0) {
        addPuffs(BX, bottomY(), 1, .6); addPuffs(BX + BW, bottomY(), 1, .6); if (lv > 0) addShake(.75, .07);
        if (hasPig(s.bb)) spawnPig(colX(pigCol(s.bb)), bottomY());
      }
      musBpm = BPM[bpmI(s.building)] + Math.min(e.streak, 24);
      hero.mode = 'fallOk'; hero.t = 0; hero.y0 = hero.y; hero.dur = .14 + .2 * clamp((groundY(hero.x) - hero.y) / (F * 3), 0, 1);
      break;
    }
    case 'wrong':
      hero.level = 0; hero.mode = 'fallBad'; hero.t = 0; hero.x = hero.x1; hero.y = hero.y1; hero.y0 = hero.y; hero.x0 = hero.x;
      { // 맞고 튕겨 나가 식 판 옆에 나자빠진다(판 뒤에 숨지 않게)
        const dir = e.col === 1 ? hero.flip : e.col < 1 ? -1 : 1;
        hero.kx = clamp((W >> 1) + dir * (signHalf() + 16), 14, W - 14); hero.flip = -dir;
      }
      combo = 0; eqT = 0; musBpm = BPM[bpmI(s.building)];
      bakeCell(e.col); dori[e.col] = 1; bandT = .55;
      for (const c of crowd) c.hop = 1;
      addPuffs(BX + rand(0, F), bottomY(), 2, .6); addPuffs(BX + BW - rand(0, F), bottomY(), 2, .6);
      sfxWrong(); sfxThud(.2); bubbles.push({ name: 'bubQ', who: hero, t: 0, dur: .85 });
      gameLog('fail', { name: 'wrong', q: `${s.cur.a}x${s.cur.b}`, col: e.col });
      break;
    case 'crush':
      heartPop[e.hearts] = 1; heartLost[e.hearts] = true; hero.mode = 'flat'; hero.t = 0; hero.level = 0;
      hero.x = hero.x1 = colX(clampN(Math.floor((hero.x - BX) / CW), 0, 2)); // 한 칸 안에 눕는다
      for (const c of crowd) c.hop = 1;
      addPuffs(BX, GY, 5, 1); addPuffs(BX + BW, GY, 5, 1); addDust(W / 2, GY, 18, 1.1); addShake(.7, .22); sfxCrush(); buzz(30);
      gameLog('fail', { name: 'crush', hearts: e.hearts });
      break;
  }
}
let musicAfter = 0;
function updateFx(dt, rdt) {
  for (let i = slabs.length - 1; i >= 0; i--) {
    const b = slabs[i]; b.vy += GRAV * 2.2 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y + F >= GY) { addPuffs(b.x + CW / 2, GY, 1, .5); slabs.splice(i, 1); }
  }
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i];
    c.life += dt; c.vy += GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt;
    const gy = GY - pileAt(c.x) - 1;
    if (c.y >= gy) {
      if (c.bounces < 1) { c.bounces++; c.y = gy; c.vy *= -.3; c.vx *= .5; c.vr *= .5; }
      else { if (c.keep && settled < 8) settle(c); chunks.splice(i, 1); }
    } else if (c.x < -40 || c.x > W + 40 || c.life > c.max) chunks.splice(i, 1);
  }
  const stepAll = (arr, fn) => { for (let i = arr.length - 1; i >= 0; i--) { const p = arr[i]; p.life += dt; if (p.life >= p.max) { arr.splice(i, 1); continue; } fn(p); } };
  for (let i = stars.length - 1; i >= 0; i--) { const p = stars[i]; p.t += rdt; if (p.t >= ATLAS[p.name].n / 30) stars.splice(i, 1); }
  for (let i = bubbles.length - 1; i >= 0; i--) { const p = bubbles[i]; p.t += rdt; if (p.t >= p.dur) bubbles.splice(i, 1); }
  for (let i = gems.length - 1; i >= 0; i--) {
    const p = gems[i]; p.t += dt; if (p.t < 0) continue;
    if (p.t < p.fly) { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.x0 = p.x; p.y0 = p.y; }
    else { const k = Math.min(1, (p.t - p.fly) / .3), e = k * k; p.x = lerp(p.x0, scoreAt.x, e); p.y = lerp(p.y0, scoreAt.y, e); if (k >= 1) { scorePop = 1; if (p.big) { stars.push({ name: 'bigGemHit', x: scoreAt.x, y: scoreAt.y, t: 0 }, { name: 'fxStarM', x: scoreAt.x, y: scoreAt.y, t: 0 }); sfxLevel(); } else sfxGem(); gems.splice(i, 1); } }
  }
  { const lv = sim.cfg.power ? fireLevel(combo) : 0, play = sim.s.phase === 'play';
    if (play && lv >= 3) { emberAcc += dt * (lv >= 4 ? 30 : 16); while (emberAcc >= 1) { emberAcc--; embers.push({ x: hero.x + rand(-13, 13), y: hero.y - rand(0, 28), vx: rand(-F * .3, F * .3), vy: -F * rand(1.5, 3.5), c: ['#FFC23C', '#FFF3C4', '#E28A2A'][Math.floor(rand(0, 3))], life: 0, max: rand(.3, .6) }); } }
    const low = play && sim.s.gap < .9, nowS = performance.now() / 1000;
    if (low && !wasLow && nowS - lastBub > 3) { lastBub = nowS; bubbles.push({ name: 'bubX', who: hero, t: 0, dur: .8 }); }
    wasLow = low;
    if (fxSlowT > 0) fxSlowT -= rdt;
  }
  stepAll(embers, p => { p.x += p.vx * dt; p.y += p.vy * dt; });
  stepAll(dust, p => { p.vy += GRAV * .8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
  stepAll(sparks, p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += GRAV * .3 * dt; });
  stepAll(puffs, p => { p.x += p.vx * dt; p.y += p.vy * dt; });
  stepAll(floats, () => {});
  stepAll(rings, p => { p.r += p.vr * dt; });
  stepAll(streaks, () => {});
  for (let i = booms.length - 1; i >= 0; i--) { booms[i].t += dt > 0 ? rdt : 0; if (booms[i].t >= 6 / 18) booms.splice(i, 1); }
  for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].life += rdt; if (ripples[i].life > .18) ripples.splice(i, 1); }
  for (let i = cracks.length - 1; i >= 0; i--) { cracks[i].life += rdt; if (cracks[i].life > .16) cracks.splice(i, 1); }
  comboPop = Math.max(0, comboPop - rdt / .18); eqT = Math.max(0, eqT - rdt);
  kick *= Math.exp(-dt * 16);
  swingV += (-swing * 60 - swingV * 5) * dt; swing += swingV * dt;
  pressAnim = pressAnim.map(v => Math.max(0, v - rdt / .13));
  dori = dori.map(v => Math.max(0, v - rdt / .3));
  heartPop = heartPop.map(v => Math.max(0, v - rdt / .4));
  scorePop = Math.max(0, scorePop - rdt / .18);
  if (flash) { flash.life -= rdt; if (flash.life <= 0) flash = null; }
  if (screenFlash > 0) screenFlash -= rdt;
  if (bandT > 0) bandT -= rdt;
  if (shake.t > 0) shake.t -= dt;
  const sc = sim.s.score; if (shownScore < sc) { const before = shownScore; shownScore = Math.min(sc, shownScore + Math.max(4, (sc - shownScore) * dt * 12)); if (Math.floor(before / 50) !== Math.floor(shownScore / 50)) scorePop = 1; }
  if (bigWord > 0) bigWord += dt;
  if (nextWord) { nextWord.t += dt; if (nextWord.t > 1.5) nextWord = null; }
  if (musicAfter > 0) { musicAfter -= rdt; if (musicAfter <= 0) musicLevel(MUS_VOL, .6); }
  updateHero(dt); updatePigs(dt); castUpdate(dt, rdt);
}
function updateHero(dt) {
  const h = hero, s = sim.s, TM = window.WreckRules.TM;
  h.t += dt; h.squash = Math.max(0, h.squash - dt / .16);
  switch (h.mode) {
    case 'doorWait': if (door.mode === 'open') { h.mode = 'doorOut'; h.t = 0; } break;
    case 'doorOut': if (h.t >= 8 / 12) { h.mode = 'doorWalk'; h.t = 0; castDoor(false); } break;
    case 'doorWalk': case 'toDoor': { // 문에서 나와 제자리로, 끝나면 문으로
      const tx = h.mode === 'toDoor' ? doorX() : (W >> 1) - 34, d = tx - h.x, step = F * 9 * dt;
      h.flip = Math.sign(d) || h.flip; h.y = h.mode === 'toDoor' ? kingGroundY(h.x) : groundY(h.x);
      if (Math.abs(d) > step) h.x += Math.sign(d) * step;
      else { h.x = tx; if (h.mode === 'toDoor') { h.mode = 'doorEnter'; castDoor(true); } else { h.mode = 'idle'; h.flip = 1; } }
      break;
    }
    case 'doorEnter': if (door.mode === 'open') { h.mode = 'doorIn'; h.t = 0; } break;
    case 'doorIn':
      if (endTopPanel() && Hc < 320 && h.t >= 5 / 12 && door.mode === 'open') castDoor(false);
      if (h.t >= 8 / 12) { h.mode = 'gone'; if (door.mode === 'open') castDoor(false); }
      break;
    case 'idle': { // 건물 가운데 밑을 비켜 선다
      const half = signHalf() + 15, dx = h.x - (W >> 1), under = s.floors.length && s.phase !== 'intro' && Math.abs(dx) < half;
      h.walking = false;
      if (under && h.squash <= 0) { const dir = dx > 1 ? 1 : dx < -1 ? -1 : h.flip, tx = clamp((W >> 1) + dir * half, 14, W - 14), step = F * 9 * dt; if (Math.abs(tx - h.x) > step) { h.x += Math.sign(tx - h.x) * step; h.flip = Math.sign(tx - h.x); h.walking = true; } else h.x = tx; }
      h.y = groundY(h.x); break;
    }
    case 'leap': { const k = Math.min(1, h.t / TM.LEAP), e = easeOut(k); h.x = lerp(h.x0, h.x1, e); h.y = lerp(h.y0, h.y1, e); break; }
    case 'slash': h.slashT += dt; break;
    case 'fallOk': {
      const k = clamp((h.t - .04) / h.dur, 0, 1); h.y = lerp(h.y0, groundY(h.x), easeIn(k));
      if (k >= 1) { h.mode = s.phase === 'clear' || s.phase === 'next' ? 'cheer' : 'idle'; h.squash = 1; addPuffs(h.x, GY, 1, .5); sfxLand(.35); }
      break;
    }
    case 'fallBad': {
      const k = clamp(h.t / .24, 0, 1); h.x = lerp(h.x0, h.kx, easeOut(k)); h.y = lerp(h.y0, groundY(h.x), easeIn(k)) - Math.sin(k * Math.PI) * 8;
      if (k >= 1) { h.mode = 'sit'; h.t = 0; h.squash = 1; addPuffs(h.x, GY, 2, .6); }
      break;
    }
    case 'sit': h.y = groundY(h.x); if (s.stun <= 0 && s.phase === 'play') { h.mode = 'idle'; h.squash = .6; } break;
    case 'flat': h.y = GY; if (s.phase !== 'over' && h.t > .42) { h.mode = 'idle'; h.squash = 1; } break;
    case 'hop': { const k = Math.min(1, h.t / .42), ex = kingSpot(); h.x = lerp(h.x0, ex, k); h.y = lerp(h.y0, kingGroundY(ex), k) - Math.sin(k * Math.PI) * F * .9; if (k >= 1) { h.mode = 'cheer'; h.t = 0; h.squash = 1; } break; }
    case 'cheer': h.y = endTopPanel() && Hc < 320 && endT >= .95 ? kingGroundY(h.x) : groundY(h.x) - Math.round(Math.abs(Math.sin(h.t * 5)) * 2); if (scene === 'end' && s.phase === 'clear' && h.t > 1.2) { h.mode = 'toDoor'; h.t = 0; } break;
  }
}
const kingSpot = () => Hc < 420 ? W * .84 : W / 2;
const kingGroundY = x => endTopPanel() && Hc < 320 && sim.s.phase === 'clear' ? H - 2 : groundY(x);
function updatePigs(dt) {
  for (const c of crowd) {
    const tx = c.gone ? (c.side < 0 ? -24 : W + 24) : crowdHome(c), d = tx - c.x;
    c.moving = Math.abs(d) > 1; if (c.moving) c.x += Math.sign(d) * Math.min(Math.abs(d), F * 7 * dt);
    c.hop = Math.max(0, c.hop - dt / .5);
  }
  for (let i = pigs.length - 1; i >= 0; i--) {
    const p = pigs[i]; p.t += dt;
    if (p.mode === 'lie') { if (p.t > 1.5) { addPuffs(p.x, GY, 1, .5); pigs.splice(i, 1); } continue; } // 누운 그림은 오래 두면 숫자처럼 읽힌다. 깜빡이다 사라진다
    if (p.mode === 'fall') {
      p.vy += GRAV * dt; p.y += p.vy * dt; if (p.tx != null) p.x += (p.tx - p.x) * Math.min(1, dt * 6);
      const gy = groundY(p.x);
      if (p.y >= gy && p.vy > 0) { p.y = gy; p.mode = p.kind === 'kp' ? 'dead' : p.die ? 'lie' : 'land'; p.t = 0; addPuffs(p.x, GY, 1, .5); if (p.kind === 'kp') { sfxThud(1); addShake(.6, .18); pigs.push({ kind: 'crown', x: p.x + 5, y: p.y - 16, vy: -F * 3, mode: 'fall', t: 0, dir: 1, tx: p.x - 14 }); } else if (p.kind === 'crown') p.mode = 'rest'; }
    } else if (p.mode === 'land') { if (p.t > .1) { p.mode = 'run'; p.t = 0; } }
    else if (p.mode === 'run') { p.x += p.dir * F * 7 * dt; p.y = groundY(p.x); if (p.x < -24 || p.x > W + 24) pigs.splice(i, 1); }
  }
}

/* ---------- 그리기 ---------- */
const HEAD = (name, i, ay, ax = 31) => ({ name, i, ay, ax });
function heroPose() {
  const h = hero, s = sim.s, t = performance.now() / 1000;
  switch (h.mode) {
    case 'doorWait': case 'doorEnter': case 'gone': return h.mode === 'doorEnter' ? HEAD('heroIdle', Math.floor(t * 10), 44) : null;
    case 'doorOut': return HEAD('heroDoorOut', Math.min(7, Math.floor(h.t * 12)), 44);
    case 'doorIn': return endTopPanel() && Hc < 320 ? HEAD('heroGround', 0, 45) : HEAD('heroDoorIn', Math.min(7, Math.floor(h.t * 12)), 44);
    case 'doorWalk': case 'toDoor': return HEAD('heroRun', Math.floor(t * 16), 44);
    case 'leap': return HEAD('heroRaise', 0, 44, 32);
    case 'slash': return HEAD('heroSmash', 0, 44, 43);
    case 'fallOk': return h.t < .06 ? HEAD('heroAtk', 0, 44) : HEAD('heroFall', 0, 44);
    case 'fallBad': return HEAD('heroHit', h.t < .08 ? 0 : 1, 44);
    case 'sit': { const i = Math.min(3, Math.floor(h.t * 12)); return HEAD('heroDead', i, [44, 49, 47, 49][i]); }
    case 'flat': return HEAD('heroFlat', 0, 8, 20);
    case 'hop': return h.t < .21 ? HEAD('heroJump', 0, 44) : HEAD('heroFall', 0, 44);
    case 'cheer': return Hc < 420 ? HEAD('heroIdle', Math.floor(t * 10), 44) : HEAD('heroSmash', 0, 44); // 낮은 화면은 끝 판 밑에 들어가는 자세
    default:
      if (h.walking) return HEAD('heroRun', Math.floor(t * 16), 44);
      if (h.squash > 0 || (s.floors.length && s.gap * F < PH)) return HEAD('heroGround', 0, 45); // 몸보다 틈이 좁으면 움츠린다
      return HEAD('heroIdle', Math.floor(t * 10), 44);
  }
}
function drawHero() {
  const h = hero, p = heroPose(); if (!p) return;
  const flip = h.flip < 0, ax = flip ? ATLAS[p.name].w - p.ax : p.ax;
  const fire = sim.cfg.power ? fireLevel(sim.s.streak) : 0;
  if (fire && scene === 'play' && h.mode !== 'flat' && !CALM) { // 5연속 불 하나 · 10연속 세 갈래 · 15연속 불티 · 20연속 다섯 갈래와 불티 많이
    const fr = Math.floor(performance.now() / 90), a = ATLAS.flame;
    if (fire >= 4) { spr('flame', fr + 1, h.x - a.w - 5, h.y - a.h + 14); spr('flame', fr + 6, h.x + 5, h.y - a.h + 14); }
    if (fire >= 2) { spr('flame', fr + 3, h.x - a.w + 3, h.y - a.h + 8); spr('flame', fr + 5, h.x - 3, h.y - a.h + 8); }
    spr('flame', fr, h.x - (a.w >> 1), h.y - a.h + 2);
  }
  spr(p.name, p.i, h.x - ax, h.y - p.ay, flip);
  if (h.mode === 'sit' || h.mode === 'flat') {
    const t = performance.now() / 170, sy = h.mode === 'flat' ? 14 : 24; ctx.fillStyle = COL.gold;
    for (let i = 0; i < 3; i++) { const a = t + i * 2.1; ctx.fillRect(Math.round(h.x + Math.cos(a) * 9 + (flip ? 8 : -8)), Math.round(h.y - sy + Math.sin(a) * 2), 2, 2); }
  }
}
const heroInFront = () => ['leap', 'slash', 'flat', 'fallBad', 'sit'].includes(hero.mode); // 나자빠진 왕은 틈이 좁아도 보인다. 나머지 자세는 건물 뒤라 숫자를 가리지 않는다
function drawCrowd() {
  if (!WIDE) return;
  const t = performance.now() / 1000;
  for (const c of crowd) {
    if (c.x < -20 || c.x > W + 20) continue;
    const faceR = c.moving ? c.gone === (c.side > 0) : c.side < 0, ax = faceR ? 14 : 20, y = groundY(c.x) - 28;
    if (c.moving) spr('pigRun', Math.floor(t * 14), c.x - ax, y, faceR);
    else if (c.hop > 0) spr('pigJump', 0, c.x - ax, y - Math.round(Math.abs(Math.sin(c.hop * Math.PI * 2)) * 5), faceR); // 깔깔 두 번 뛴다
    else if (sim.s.phase === 'play' && sim.s.gap < .9) spr('pigAtk', Math.floor(t * 12), c.x - ax, y, faceR); // 위험하면 왕 쪽으로 망치를 휘두른다
    else spr('pigIdle', Math.floor(t * 10), c.x - ax, y, faceR);
  }
}
function drawPigs() {
  const t = performance.now() / 1000;
  for (const p of pigs) {
    const faceR = p.dir > 0;
    if (p.kind === 'crown') { spr('crown', 0, p.x - 7, p.y - 7); continue; }
    if (p.kind === 'kpr') { // 앞 건물에서 달아나는 돼지 왕
      const y = p.y - 28, ax = faceR ? 18 : 20;
      if (p.mode === 'fall') spr(p.vy < 0 ? 'kpJump' : 'kpFall', 0, p.x - ax, y, faceR);
      else if (p.mode === 'land') spr('kpGround', 0, p.x - ax, y, faceR);
      else spr('kpRun', Math.floor(t * 14), p.x - ax, y, faceR);
      continue;
    }
    if (p.kind === 'kp') {
      const y = p.y - 28;
      if (p.mode === 'fall') spr('kpFall', 0, p.x - (faceR ? 18 : 20), y, faceR);
      else if (p.t < .08) spr('kpGround', 0, p.x - (faceR ? 18 : 20), y, faceR);
      else if (p.t < .38) spr('kpDead', Math.floor((p.t - .08) * 10), p.x - (faceR ? 18 : 20), y, faceR);
      else { // 왕관이 벗겨진 채 벌렁 뒤집혀 별이 돈다
        spr('pigDead', 1, p.x - (faceR ? 10 : 24), y, faceR);
        ctx.fillStyle = COL.gold;
        for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillRect(Math.round(p.x + 5 + Math.cos(a) * 9), Math.round(p.y - 22 + Math.sin(a) * 2), 2, 2); }
      }
    } else {
      const ax = faceR ? 14 : 20, y = p.y - 28;
      if (p.mode === 'lie') { if (p.t < 1 || Math.floor(p.t * 12) % 2) spr('pgDead', Math.min(3, Math.floor(p.t * 10)), p.x - ax, y, faceR); }
      else if (p.mode === 'fall') spr(p.t < .16 ? 'pigHit' : 'pigFall', p.t < .16 ? Math.floor(p.t * 12) : 0, p.x - ax, y, faceR);
      else if (p.mode === 'land') spr('pigGround', 0, p.x - ax, y, faceR);
      else spr('pigRun', Math.floor(t * 14), p.x - ax, y, faceR);
    }
  }
}
const hudBottom = () => HUD_Y + (W < 150 ? 21 : 15); // 좁은 화면은 진행 막대가 둘째 줄로 간다
function drawBuilding(y0) {
  const s = sim.s, n = s.floors.length; if (!n) return;
  const above = n - 1, first = Math.min(above, Math.ceil(y0 / F) + 1), t = performance.now() / 1000;
  for (let i = first; i >= 1; i--) {
    const y = y0 - (i + 1) * F, v = s.bb + i;
    if (i === above) drawRoof(y);
    spr(curWall, v, BX, y);
    const fl = s.floors[i], ov = !fl ? null : Rules.isZero(fl) ? 'ovZero' : fl.hard ? 'ovHard' : fl.dash ? 'ovDash' : null; // 위층에서 무슨 층이 오는지 미리 보인다
    if (ov) spr(ov, 0, BX, y);
    if (kingFloor(v)) spr('kpHead', 0, BX + 6, y + 1);
    else if (hasPig(v) && ov !== 'ovZero') spr('pigWin', Math.floor(t * 1.2 + v) % 3, BX + pigCol(v) * CW + 6, y);
  }
  if (above === 0) drawRoof(y0 - F);
  const f0 = s.floors[0]; spr(f0.hard ? 'panelHard' : f0.dash ? 'panelFast' : 'panel', 0, BX, y0 - F);
  if (f0.cracked) for (const l of CRACK) pxLine(BX + l[0], y0 - F + l[1], BX + l[2], y0 - F + l[3], COL.ink);
}
// 답 칸 숫자는 조각 · 판자보다 앞에 그린다. 답은 늘 읽혀야 한다. top이면 별 · 다이아까지 다 그린 뒤 숫자만 한 번 더
function drawCells(y0, top = false) {
  const s = sim.s; if (!s.floors.length || !s.cur || s.phase === 'intro') return;
  for (let c = 0; c < 3; c++) {
    const ch = s.cur.choices[c]; if (ch.v == null || (hero.mode === 'flat' && hero.x >= BX + c * CW && hero.x < BX + (c + 1) * CW)) continue; // 납작한 왕이 누운 칸은 비운다
    const x = BX + c * CW, blocked = s.blocked[c], blank = s.tut && !ch.ok;
    const dx = dori[c] > 0 && !CALM ? Math.round(Math.sin(dori[c] * Math.PI * 6) * 2 * dori[c]) : 0, dy = pressAnim[c] > .4 ? 1 : 0;
    if (top && flash && flash.col === c) continue;
    if (blocked && !top) { ctx.fillStyle = 'rgba(43,37,64,.55)'; ctx.fillRect(x + 2, y0 - F + 2, CW - 4, F - 4); }
    if (blocked && !top && cellCracks[c]) for (const l of cellCracks[c].lines) pxLine(x + l[0], y0 - F + l[1], x + l[2], y0 - F + l[3], COL.ink);
    if (!blank) drawNum(String(ch.v), x + CW / 2 + dx, y0 - F + 1 + dy, blocked ? 'digBDim' : 'digB', 'c');
    if (!top && flash && flash.col === c) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y0 - F + 2, CW - 4, F - 4); }
  }
}
function drawRoof(floorTop) {
  const r = ATLAS.roof, x = BX - ((r.w - BW) >> 1), s = sim.s, t = performance.now() / 1000;
  if (s.building === sim.cfg.buildings - 1 || (sim.cfg.endless && s.building % 3 === 2)) { // 꼭대기의 돼지 왕: 층이 맞으면 방방, 막판에는 움찔, 왕이 틀리면 망치를 휘두른다
    const kx = BX + BW / 2 - 20, ky = floorTop - r.h + 1 - 28, kt = kpRoof.t; kpWho.x = BX + BW / 2; kpWho.y = ky;
    if (kpRoof.mode === 'hop') spr(kt < .22 ? 'kpJump' : 'kpGround', 0, kx, ky - (kt < .22 ? Math.round(Math.sin(kt / .22 * Math.PI) * 5) : 0));
    else if (kpRoof.mode === 'hit') spr('kpHit', Math.floor(kt * 10), kx, ky);
    else if (kpRoof.mode === 'attack') spr('kpAtk', Math.floor(kt * 12), kx, ky);
    else spr('kpIdle', Math.floor(t * 10), kx, ky);
  }
  spr(curRoof, 0, x, floorTop - r.h + 1);
}
function signText() { const c = sim.s.cur; return !c ? '2 x 8' : sim.s.tries > 0 ? `${c.a} x ${c.b} = ${c.ans}` : `${c.a} x ${c.b}`; }
const signHalf = () => (numW(signText(), 'digI') + 8) >> 1;
function signPlate(text, cx, y, done) {
  const sw = numW(text, 'digI') + 8, x = Math.round(cx - sw / 2);
  ctx.fillStyle = COL.ink; ctx.fillRect(x, y, sw, SH); ctx.fillStyle = done ? COL.pale : COL.gold; ctx.fillRect(x + 1, y + 1, sw - 2, SH - 2);
  ctx.fillStyle = done ? '#fff' : '#FFE08A'; ctx.fillRect(x + 1, y + 1, sw - 2, 1); ctx.fillStyle = done ? '#E5D6A0' : COL.amber; ctx.fillRect(x + 1, y + SH - 2, sw - 2, 1);
  drawNum(text, cx, y + 2, 'digI', 'c');
  return { x, sw };
}
function drawSign(y0) { // 답 칸 바로 위 식 판: 식 → 답 차례로 읽는다. 틀리면 답까지 보여 준다
  const s = sim.s; if (!s.cur || s.phase === 'intro' || s.phase === 'over' || !s.floors.length || hero.mode === 'flat') return;
  const cx = (W >> 1) + (CALM ? 0 : Math.round(swing * 3)), y = Math.max(1, y0 - F - SH - 1);
  signPlate(signText(), cx, y, s.tries > 0);
}
function helpOn() { // 도움 판: 늘 · 같은 문제를 2번 틀렸을 때 · 없음
  const s = sim.s, h = sim.cfg.help; if (!s.cur || h === 'none') return false; if (h !== 'miss2') return true;
  const p = s.perf[Rules.keyOf(s.cur.a, s.cur.b)]; return !!p && p.wrong >= 2;
}
function skipPos() { return WIDE ? { x: W - (BX >> 1) - (BOARD_W >> 1), y: Math.max(hudBottom() + 11, window.GF.inFrame ? Math.ceil(70 / U) : 0) } : { x: 2, y: GY + 3 }; }
function overBoard(x, y) { const s = sim.s; if (!WIDE || !skipSign || !s.cur || !helpOn()) return false; /* 폰 세로는 그 줄이 엄지 자리라 칸으로 둔다 */ const p = skipPos(); return x >= p.x && x < p.x + skipSign.w && y >= p.y && y < p.y + skipSign.h; }
function drawSkip() {
  const s = sim.s; if (!s.cur || scene !== 'play' || s.phase === 'clear' || s.phase === 'over' || !helpOn()) return;
  const cur = s.cur.a === 0 || s.cur.b === 0 ? 0 : sim.cfg.dans.includes(s.cur.a) ? s.cur.a : s.cur.b;
  if (!WIDE && s.phase === 'tutorial' && !sim.cfg.firstPractice) return;
  bakeSkip(cur);
  ctx.globalAlpha = combo >= 5 ? .5 : 1; // 이어 맞히면 판이 옅어진다(표를 안 보고 풀게)
  const p = skipPos(); ctx.drawImage(skipSign.c, p.x, p.y);
  ctx.globalAlpha = 1;
}
function drawTutorial(y0) {
  const s = sim.s;
  if (s.phase !== 'tutorial' || s.atk || s.freeze > 0) return;
  const c = s.cur.choices.findIndex(v => v.ok), x = BX + c * CW, t = performance.now() / 1000;
  if (Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = COL.gold; ctx.fillRect(x + 1, y0 - F + 1, CW - 2, 2); ctx.fillRect(x + 1, y0 - 3, CW - 2, 2); ctx.fillRect(x + 1, y0 - F + 1, 2, F - 2); ctx.fillRect(x + CW - 3, y0 - F + 1, 2, F - 2); }
  centerSpr('arrow', colX(c), y0 + 2 + Math.floor(t * 4) % 2);
  if (!WIDE && sim.cfg.firstPractice) return; // 세로 폰은 아래 도움 판을 가리지 않고 손가락만 보인다.
  const a = ATLAS.wTut, tx = (W - a.w) >> 1, ty = WIDE ? H - a.h : GY + 9;
  ctx.fillStyle = COL.ink; ctx.fillRect(tx - 3, ty, a.w + 6, a.h); spr('wTut', 0, tx, ty);
}
function drawHud() {
  if (scene !== 'play') return;
  const s = sim.s, top = HUD_Y, nb = sim.cfg.endless ? 1 : sim.cfg.buildings;
  const narrow = W < 150, goal = narrow ? 'crown' : 'kpHead', cr = ATLAS[goal].w + 1;
  ctx.fillStyle = 'rgba(43,37,64,.72)'; ctx.fillRect(0, top, W, hudBottom() - top);
  const txt = String(Math.floor(shownScore)), set = scorePop > 0 ? 'digSHot' : 'digS', tw = numW(txt, set), icon = narrow ? 0 : 11;
  const LP = ATLAS.livePlate, SOCK = [12, 23, 34];
  let bw = narrow ? W - 4 - cr - RINSET : Math.round(Math.min(W * .3, 66)), barX = narrow ? 2 : (W >> 1) - (bw >> 1); const hx0 = narrow ? 1 + INSET : Math.max(1 + INSET, barX - LP.w - 4 - icon);
  if (!narrow) { barX = Math.max(barX, hx0 + LP.w + 2 + icon); bw = Math.min(bw, W - 1 - RINSET - tw - 3 - barX - cr); }
  spr('livePlate', 0, hx0, top);
  for (let i = 0; i < sim.cfg.hearts; i++) {
    const x = hx0 + SOCK[i] - 4, pop = heartPop[i], on = i < s.hearts;
    if (on) spr('smHeart', Math.floor(performance.now() / 120), x, top + 4 - (pop > .5 ? 1 : 0));
    else if (pop > 0) spr('smHeartHit', pop > .5 ? 0 : 1, x - 1, top + 2);
  }
  heartAt = { x: hx0 + SOCK[Math.max(0, s.hearts - 1)], y: top + 7 };
  houseAt = null;
  if (s.phase !== 'clear' && s.phase !== 'over' && bw >= 16) {
    if (icon) { spr('iconHouse', 0, barX - icon, top + 3); houseAt = { x: barX - icon - 3, y: top, w: ATLAS.iconHouse.w + 6, h: hudBottom() - top }; } // 누르면 게임 첫 화면(game.js)
    const gapB = 2, cw = Math.floor((bw - gapB * (nb - 1)) / nb), by = top + (narrow ? 15 : 5);
    for (let i = 0; i < nb; i++) {
      const x = barX + i * (cw + gapB), done = sim.cfg.endless ? s.bb / Math.max(1, s.bb + s.floors.length) : i < s.building ? 1 : i > s.building || s.phase === 'next' ? 0 : s.bb / Math.max(1, s.bb + s.floors.length);
      ctx.fillStyle = COL.ink; ctx.fillRect(x, by, cw, 5); ctx.fillStyle = '#4A4060'; ctx.fillRect(x + 1, by + 1, cw - 2, 3);
      if (done > 0) { ctx.fillStyle = COL.gold; ctx.fillRect(x + 1, by + 1, Math.round((cw - 2) * done), 3); }
    }
    spr(goal, 0, barX + bw + 1, narrow ? by - 1 : top); // 끝에 돼지 왕이 있다
  }
  const scoreX = narrow ? W - 1 - RINSET - tw : Math.min(barX + Math.max(bw, 0) + cr + 3, W - 1 - RINSET - tw); scoreAt = { x: scoreX + (tw >> 1), y: top + 8 };
  drawNum(txt, scoreX, top + 3 - (scorePop > .5 ? 1 : 0), set);
}
function drawFx() {
  for (const p of sparks) { pxLine(p.x, p.y, p.x - p.vx * .02, p.y - p.vy * .02, p.c); }
  for (const p of rings) { pxCircle(p.x, p.y, p.r, p.c); pxCircle(p.x, p.y, p.r - 1, p.c); }
  for (const p of cracks) {
    const k = p.life / .16;
    for (let i = 0; i < 6; i++) { const a = p.a + i * 1.047, r = F * (.16 + .34 * k + (i % 2) * .13), r0 = r * .35; pxLine(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, i % 2 ? COL.gold : '#fff'); }
  }
  for (const p of ripples) { pxCircle(p.x, p.y, 2 + (p.life / .18) * 5, '#fff'); }
}
function drawStars() { for (const p of stars) { if (p.t < 0) continue; const a = ATLAS[p.name]; spr(p.name, Math.min(a.n - 1, Math.floor(p.t * 30)), Math.round(p.x - a.w / 2), Math.round(p.y - a.h / 2)); } }
function drawEmbers() { for (const p of embers) { ctx.fillStyle = p.c; const d = p.life / p.max < .5 ? 2 : 1; ctx.fillRect(Math.round(p.x), Math.round(p.y), d, d); } }
function drawBubbles() {
  for (const p of bubbles) {
    if (p.who === kpWho && kpWho.y - kpWho.up < hudBottom()) continue; // 지붕이 화면 밖이면 말하지 않는다
    const left = p.dur - p.t, i = left < .14 ? (left < .07 ? 4 : 3) : Math.min(2, Math.floor(p.t / .07)), up = p.who === hero ? (hero.mode === 'sit' ? 34 : 52) : p.who.up ?? 34, a = ATLAS[p.name];
    const bx = Math.round(clamp(p.who.x - 17, 0, W - a.w)), by = Math.round(Math.max(hudBottom(), p.who.y - up - (a.h - 16)));
    if (sim.s.phase === 'play' && bx < BX + BW && bx + a.w > BX && by < bottomY() && by + a.h > bottomY() - F) continue; // 답 칸을 가리는 말풍선은 띄우지 않는다
    if (overBoard(bx, by) || overBoard(bx + a.w - 1, by) || overBoard(bx, by + a.h - 1) || overBoard(bx + a.w - 1, by + a.h - 1)) continue; // 도움 판도 가리지 않는다
    spr(p.name, i, bx, by);
  }
}
function drawGems() { const t = Math.floor(performance.now() / 62); for (const p of gems) { if (p.t < 0) continue; if (p.big) spr('bigGem', t, Math.round(p.x) - 6, Math.round(p.y) - 5); else spr('gem', t, Math.round(p.x) - 9, Math.round(p.y) - 7); } }
const wordFloor = () => { if (WIDE || !sim.cfg.bomb) return hudBottom() + 2; const p = bombPos(); return p.y + p.h + 2; }; // 폰 세로는 폭탄 칸 아래로 내려 글자가 안 가리게
function bigWordY() { return Math.max(wordFloor(), Math.round(H * .2)); }
function drawFloats() {
  if (sim.s.phase === 'play') { // 연속과 맞힌 식은 건물 옆 한 자리에서 바뀐다
    const lv = bladeLevel(combo), cy = comboY(), hot = lv >= 2;
    if (combo >= 2) {
      const pop = comboPop > .5 ? 2 : 0, t = String(combo), set = hot ? 'digBHot' : 'digB', word = hot ? 'wComboHot' : 'wCombo';
      if (WIDE) { drawNum(t, BX >> 1, cy - pop, set, 'c'); centerSpr(word, BX >> 1, cy + 14 - pop); }
      else { const y = hudBottom() + 2 - pop, w = numW(t, set) + ATLAS[word].w + 1, x = (W - w) >> 1; drawNum(t, x, y, set); spr(word, 0, x + w - ATLAS[word].w, y); }
    }
    if (eqT > 0 && WIDE && Hc >= 420) { // 맞힌 식은 체크를 붙여 지금 식과 나눈다
      const ck = ATLAS.check, nw = numW(eqText, 'digS'), mark = ck.w + 1 + nw <= BX - 2, w = mark ? ck.w + 1 + nw : nw, x = Math.max(1, (BX >> 1) - (w >> 1)), y = cy + 30;
      if (mark) spr('check', 0, x, y + 1);
      drawNum(eqText, x + (mark ? ck.w + 1 : 0), y, 'digS');
    }
  }
  if (bigWord > 0 && bigWord < 1.5) {
    const ty = bigWordY(), h = ATLAS.wBig.h, y = bigWord < .18 ? lerp(-h, ty, easeIn(bigWord / .18)) : ty - Math.round(Math.sin(clamp((bigWord - .18) / .2, 0, 1) * Math.PI) * 5);
    centerSpr('wBig', W / 2, Math.round(y));
  }
  for (const p of floats) drawNum(p.t, p.x, p.y, 'digS', 'c');
  if (nextWord && nextWord.t > 0) centerSpr(nextWord.img, W / 2, Math.max(Math.round(H * .16), wordFloor()));
}
function comboY() { const y = Math.round(GY * .46); if (!sim.cfg.bomb || !WIDE) return y; const p = bombPos(); return Math.max(y, p.y + p.h + 1); } // 낮은 화면은 폭탄 칸 아래로 내린다
// 폭탄 칸: 이어 맞히면 차고, 가득 차면 누른다. 도움 판 맞은편
function bombPos() { return WIDE ? { x: (BX >> 1) - 20, y: Math.max(hudBottom() + 3, window.GF.inFrame ? Math.ceil(70 / U) : 0), w: 40, h: 30 } : { x: 2, y: hudBottom() + 2, w: 30, h: 30 }; }
function drawBomb() {
  const s = sim.s; if (!sim.cfg.bomb || scene !== 'play' || s.phase === 'clear' || s.phase === 'over') return;
  const p = bombPos(), full = s.charge >= Rules.BOMB_FULL, t = performance.now(), n = Rules.BOMB_FULL, cw = Math.floor((p.w - 4) / n), cx = p.x + ((p.w - cw * n) >> 1);
  plate(ctx, p.x, p.y, p.w, p.h);
  if (full && Math.floor(t / 180) % 2 === 0) { ctx.fillStyle = COL.gold; ctx.fillRect(p.x, p.y, p.w, 2); ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2); ctx.fillRect(p.x, p.y, 2, p.h); ctx.fillRect(p.x + p.w - 2, p.y, 2, p.h); }
  spr(full ? 'bmOn' : 'bmOff', Math.floor(t / 90), p.x + ((p.w - 18) >> 1), p.y + 1);
  for (let i = 0; i < n; i++) { const x = cx + i * cw, y = p.y + p.h - 7; ctx.fillStyle = COL.ink; ctx.fillRect(x, y, cw, 5); ctx.fillStyle = i < s.charge ? COL.gold : '#6A6080'; ctx.fillRect(x + 1, y + 1, cw - 2, 3); }
}
function placeBomb() {
  const el = document.getElementById('bombBtn'), on = scene === 'play' && sim.cfg.bomb; el.hidden = !on; if (!on) return;
  const p = bombPos(); el.style.cssText = `left:${(ox + p.x * K) / DPR}px;top:${(oy + p.y * K) / DPR}px;width:${p.w * U}px;height:${p.h * U}px`;
}
function drawTeachMark(y0) { // 새 것을 알려 줄 때 그것을 깜빡여 가리킨다
  const s = sim.s; if (Math.floor(performance.now() / 200) % 2) return; ctx.fillStyle = COL.gold;
  const box = (x, y, w, h) => { ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h); };
  if (s.teach === 'bomb') { const p = bombPos(); box(p.x - 2, p.y - 2, p.w + 4, p.h + 4); }
  else if (s.teach === 'power') box(Math.round(hero.x) - 20, Math.round(hero.y) - 50, 40, 52);
  else box(BX - 2, y0 - F - 2, BW + 4, F + 4);
}
// 단계 지도: 부순 건물에는 왕관, 다음 건물에는 화살표, 안 열린 건물은 어둡게
// 단계 지도: 줄마다 바닥에 건물이 선다(맨 아래 줄은 방 바닥). 다음 건물 지붕에 왕이 서니 맨 위 줄 위로 왕 키만큼 비운다
function menuHitBox(image, label, left, right) {
  // 그림과 이름표의 합. 이웃 칸 경계에서 나누고 화면 안에 둔다.
  left = Math.max(left, dotX(0)); right = Math.min(right, dotX(Wc));
  const top = dotY(0), bottom = dotY(Hc), least = 44 / U;
  let x = Math.min(image.x, label.x), y = Math.min(image.y, label.y);
  const w = Math.min(right - left, Math.max(least, image.x + image.w - x, label.x + label.w - x));
  const h = Math.min(bottom - top, Math.max(least, image.y + image.h - y, label.y + label.h - y));
  x = clamp(x, left, right - w); y = clamp(y, top, bottom - h);
  return { x, y, w, h };
}
function mapLabelBox(st, n) {
  const cx = n.x + 15, word = st.final ? 'wKing' : st.endless ? 'wEndless' : null;
  if (word && ATLAS[word].w + 6 <= n.cw - 2) {
    const w = ATLAS[word].w + 6;
    return { x: clamp(cx - (w >> 1), 1, W - w - 1), y: n.base, w, h: 12, word };
  }
  const ds = word ? [2, 9] : st.dans, w0 = ds.length * 7 + (ds.length - 1) * 5 + 4, showDan = w0 + 14 <= n.cw, w = w0 + (showDan ? 12 : 0);
  return { x: cx - (w >> 1), y: n.base, w, h: 12, ds, showDan, range: !!word };
}
function mapNodes(n) {
  const cols = H < 110 ? n : W >= 150 ? 4 : 3, rows = Math.ceil(n / cols), top = Math.max(2, Math.ceil(56 / U)); // 위 왼쪽에 「뒤로」(사이트 안에서는 나가기 · 소리)
  const rh = rows > 1 ? Math.max(46, Math.min(70, Math.floor((GY - top - 52) / (rows - 1)))) : 0;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c0 = i % cols, back = mapPath && r % 2 === 1, c = back ? cols - 1 - c0 : c0, base = GY - (rows - 1 - r) * rh; // 길이 있으면 줄마다 꺾어 돌고, 없으면(단 연습) 줄마다 왼쪽부터
    const node = { x: Math.round(W / cols * (c + .5) - 15), y: base - 25, base, left: back, cw: W / cols };
    node.label = mapLabelBox(mapList[i].st, node);
    node.hit = menuHitBox({ x: node.x, y: node.y, w: 30, h: 38 }, node.label, c * W / cols, (c + 1) * W / cols);
    return node;
  });
}
function mapPlate(x, y, w, m) { // 다음 단계는 금색 판, 잠긴 단계는 어둡게
  plate(ctx, x, y, w, 12);
  if (m.next) { ctx.fillStyle = COL.gold; ctx.fillRect(x + 1, y + 1, w - 2, 10); ctx.fillStyle = '#FFE08A'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillStyle = COL.amber; ctx.fillRect(x + 1, y + 10, w - 2, 1); }
}
function drawMap() {
  const t = performance.now() / 1000, nodes = mapNodes(mapList.length); ctx.drawImage(bg.c, 0, 0);
  for (const b of new Set(nodes.map(n => n.base))) if (b !== GY) { for (let x = 0; x < W; x += 32) spr('floorBand', 0, x, b); ctx.fillStyle = COL.ink; ctx.fillRect(0, b + 12, W, 1); } // 위 줄도 바닥에 선다
  const dots = (x0, y0, x1, y1) => { const k = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5)); for (let q = 0; q <= k; q++) ctx.fillRect(Math.round(x0 + (x1 - x0) * q / k) - 1, Math.round(y0 + (y1 - y0) * q / k) - 1, 3, 3); };
  for (let i = 0; mapPath && i + 1 < nodes.length; i++) { // 길(모험 지도만): 문 앞 바닥을 따라 가고, 줄이 바뀌면 건물 바깥쪽으로 내려간다. 깬 단계까지는 금색
    const a = nodes[i], b = nodes[i + 1], y = a.base - 3; ctx.fillStyle = mapList[i].clear ? COL.gold : COL.sand;
    if (a.base === b.base) { const l = Math.min(a.x, b.x) + 33, r = Math.max(a.x, b.x) - 3; if (r > l) dots(l, y, r, y); continue; }
    const right = !a.left, x = right ? Math.min(W - 3, a.x + 35) : Math.max(2, a.x - 5), ex = right ? a.x + 33 : a.x - 3;
    dots(ex, y, x, y); dots(x, y, x, b.base - 3); dots(x, b.base - 3, right ? b.x + 33 : b.x - 3, b.base - 3);
  }
  mapList.forEach((m, i) => {
    const n = nodes[i], lk = m.st.look || (m.st.id === 8 ? 4 : m.st.id), ra = ATLAS[ROOF_OF(lk)], wa = ATLAS[LOOK_OF(lk)[0]], cx = n.x + 15, py = n.base;
    const hb = Math.min(15, (Math.floor(n.cw) - 2) >> 1), bx = cx - hb; // 칸이 좁으면(폰 가로에 여덟 채) 건물을 좁힌다
    ctx.drawImage(art, wa.x + 4, wa.y, hb * 2 - 4, 16, bx + 2, n.y + ra.h - 1, hb * 2 - 4, 16);
    ctx.drawImage(art, ra.x, ra.y, hb, ra.h, bx, n.y, hb, ra.h); ctx.drawImage(art, ra.x + ra.w - hb, ra.y, hb, ra.h, cx, n.y, hb, ra.h);
    if (!m.open) { ctx.fillStyle = 'rgba(43,37,64,.62)'; ctx.fillRect(bx, n.y, hb * 2, 26); }
    if (m.clear) spr('crown', 0, n.x + 8, n.y - 5);
    // 이름표는 건물이 선 바닥 앞에. 왕의 성 · 끝없는 성은 이름, 나머지는 단(「25단」으로 읽히지 않게 가운데 점)
    const p = n.label; mapPlate(p.x, p.y, p.w, m);
    if (p.word) spr(p.word, 0, p.x + 3, p.y + 1); // 칸에 들면 이름, 아니면 「2-9」
    else {
      let tx = p.x + 2; p.ds.forEach((d, j) => { if (j) { ctx.fillStyle = COL.ink; if (p.range) ctx.fillRect(tx, py + 5, 4, 2); else ctx.fillRect(tx + 1, py + 5, 2, 2); tx += 5; } drawNum(String(d), tx, py + 2, 'digD'); tx += 7; }); // 섞은 단계는 「2-9」
      if (p.showDan) spr('wDan', 0, tx + 1, py + 1);
    }
    if (!m.open) { ctx.fillStyle = 'rgba(43,37,64,.55)'; ctx.fillRect(cx - 30, py, 60, 12); }
    if (m.next) spr('heroIdle', Math.floor(t * 10), n.left ? cx - 47 : cx - 31, n.y + 1 - 44, n.left); // 왕은 다음에 부술 건물 지붕에 선다
  });
}
// 갈림길: 문 셋과 왕은 모두 방 바닥에, 돼지와 폭탄은 선반에.
const DOORS = ['wPractice', 'wAdventure', 'wEndless']; let forkBg = null, forkSet = null;
function forkDoors() {
  const dw = ATLAS.drIdle.w, dh = ATLAS.drIdle.h, pw = w => ATLAS[w].w + 6;
  return DOORS.map((w, i) => {
    const cx = Math.round(W * (i + .5) / 3), base = GY;
    const d = { word: w, cx, base, x: cx - (dw >> 1), y: base - dh, w: dw, h: dh + 12, pw: pw(w) };
    d.label = { x: clamp(cx - (d.pw >> 1), 1, W - d.pw - 1), y: base, w: d.pw, h: 12 };
    d.hit = menuHitBox(d, d.label, i * W / 3, (i + 1) * W / 3);
    return d;
  });
}
const forkCross = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function forkCorners() {
  if (!window.GF.inFrame) return [];
  return ['exit-x', 'sound'].map(id => window.parent.document.querySelector(`[data-test="${id}"]`)).filter(Boolean).map(e => {
    const r = e.getBoundingClientRect(); return { x: dotX(r.x), y: dotY(r.y), w: r.width / U, h: r.height / U };
  });
}
function forkCast(doors) {
  if (forkSet) return forkSet;
  const corners = forkCorners(), busy = doors.flatMap(d => [{ x: d.x, y: d.y, w: d.w, h: 56 }, d.label]).concat(corners);
  // 왕의 몸과 달리는 길을 비워 두고, 꾸밈은 문 위로 올린다.
  busy.push({ x: 0, y: GY - 45, w: W, h: 45 });
  const hr = document.getElementById('homeBtn').getBoundingClientRect();
  if (hr.width) busy.push({ x: dotX(hr.x), y: dotY(hr.y), w: hr.width / U, h: hr.height / U });
  const cr = document.getElementById('creditBtn').getBoundingClientRect();
  if (cr.width) busy.push({ x: dotX(cr.x), y: dotY(cr.y), w: cr.width / U, h: cr.height / U });
  const actors = [], props = [], inside = r => r.x >= dotX(0) && r.y >= dotY(0) && r.x + r.w <= dotX(Wc) && r.y + r.h <= dotY(Hc);
  // 그림의 투명 여백을 뺀 네모. 네 장 반복 중 가장 넓은 몸을 잡고, 매번 배치하지 않는다.
  const put = (kind, frames, bounds, cx, bases, into, precise = false) => {
    let pixels;
    if (precise) {
      const a = ATLAS[kind], mask = mk(bounds.w, bounds.h);
      for (const i of frames) mask.g.drawImage(art, a.x + i * a.w + bounds.x, a.y + bounds.bottom - bounds.h, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
      const data = mask.g.getImageData(0, 0, bounds.w, bounds.h).data; pixels = [];
      for (let y = 0; y < bounds.h; y++) for (let x = 0; x < bounds.w; x++) if (data[(y * bounds.w + x) * 4 + 3]) pixels.push({ x, y, w: 1, h: 1 });
    }
    for (const base of [...new Set(bases)]) {
      const xs = Array.from({ length: Math.max(0, W - bounds.w) }, (_, x) => x + 1).sort((a, b) => Math.abs(a + bounds.w / 2 - cx) - Math.abs(b + bounds.w / 2 - cx));
      for (const x of xs) {
        const r = { x, y: base - bounds.h, w: bounds.w, h: bounds.h };
        if (!inside(r) || busy.some(b => precise
          ? forkCross(r, b) && pixels.some(p => forkCross({ x: r.x + p.x, y: r.y + p.y, w: 1, h: 1 }, b))
          : forkCross({ x: r.x - 1, y: r.y, w: r.w + 2, h: r.h }, b))) continue;
        const a = { kind, frames, bounds, rect: r, base, x: x - bounds.x, y: base - bounds.bottom };
        busy.push(r); into.push(a); return a;
      }
    }
    return null;
  };
  const top = Math.min(...doors.map(d => d.y));
  const king = { kind: 'heroIdle', frames: [0, 6, 8, 10], base: GY, x: doors[1].cx - 31, y: GY - 44 };
  king.rect = { x: king.x + 9, y: GY - 28, w: 37, h: 28 }; actors.push(king);
  const specs = [
    ['hpLook', [0, 1, 2, 1], { x: 3, w: 21, h: 18, bottom: 20 }],
    ['mpIdle', [0, 1, 2, 3], { x: 2, w: 22, h: 24, bottom: 26 }],
    ['pigIdle', [0, 7, 8, 10], { x: 10, w: 19, h: 19, bottom: 28 }],
  ];
  specs.slice(0, Wc < Hc ? 2 : 3).forEach(([kind, frames, bounds], i) => {
    const d = doors[i];
    const a = put(kind, frames, bounds, d.cx, [d.y - 3, top - 3], actors);
    if (a) a.door = i;
  });
  const last = doors[2], guard = actors.find(a => a.door === 2);
  if (guard) {
    for (let i = 0; i < 2; i++) put('bmOff', [0], { x: 1, w: 13, h: 16, bottom: 21 }, guard.rect.x - 10 - i * 15, [guard.base, last.y - 3, last.base], props);
  }
  forkSet = { king, actors, props, corners }; return forkSet;
}
function forkLedge(g, a) {
  if (a.base === GY || forkDoors().some(d => d.base === a.base)) return;
  const s = ATLAS.rmShelf, x = a.rect.x - 1, w = a.rect.w + 2;
  g.drawImage(art, s.x, s.y, w, 3, x, a.base, w, 3);
}
function bakeFork(doors, cast) {
  forkBg = mk(W, H); const g = forkBg.g;
  g.fillStyle = COL.wall; g.fillRect(0, 0, W, H);
  // 방 장식은 한 번만 그려 둔다. 창과 깃발도 다른 방과 같은 점 굵기.
  g.save(); g.beginPath(); g.rect(0, 0, W, GY);
  for (const r of cast.corners) g.rect(Math.floor(r.x), Math.floor(r.y), Math.ceil(r.w), Math.ceil(r.h));
  g.clip('evenodd');
  const top = Math.min(...doors.map(d => d.y)), wy = Math.max(2, Math.round((top - 64) / 2));
  if (W >= 150) {
    spr('winGroup', 0, Math.round(W / 2 - 32), wy, false, g);
    for (const x of [8, W - 34]) {
      const a = ATLAS.rmBanner, y = Math.ceil((Wc < Hc ? 130 : 74) / U), h = Math.min(64, top - y - 2);
      if (h < 45) continue;
      g.drawImage(art, a.x, a.y, a.w, 20, x, y, a.w, 20);
      g.drawImage(art, a.x, a.y + 20, a.w, h - 45, x, y + 20, a.w, h - 45);
      g.drawImage(art, a.x, a.y + a.h - 25, a.w, 25, x, y + h - 25, a.w, 25);
    }
  } else {
    for (const x of [2, W - 36]) spr('endArch', 0, x, Math.ceil(74 / U), false, g);
  }
  g.fillStyle = 'rgba(106,96,128,.22)'; g.fillRect(0, 0, W, GY); g.restore();
  roomFloor(g);
  for (let y = GY + 32; y < H; y += ATLAS.floorDeep.h) for (let x = 0; x < W; x += 32) spr('floorDeep', 0, x, y, false, g);
  for (const a of [...cast.actors, ...cast.props]) forkLedge(g, a);
  for (const a of cast.props) spr(a.kind, 0, a.x, a.y, false, g);
}
function drawFork() {
  const now = performance.now(), doors = forkDoors(), cast = forkCast(doors);
  if (!forkBg) bakeFork(doors, cast);
  ctx.drawImage(forkBg.c, 0, 0);
  for (const b of new Set(doors.map(d => d.base))) if (b !== GY) { for (let x = 0; x < W; x += 32) spr('floorBand', 0, x, b); ctx.fillStyle = COL.ink; ctx.fillRect(0, b + 12, W, 1); }
  doors.forEach((d, i) => {
    const locked = i === 2 && !forkEndless, p = d.label, px = p.x;
    if (forkOpen && !forkOpen.locked && forkOpen.i === i) spr('drOpen', Math.min(4, Math.floor((now - forkOpen.t0) / 50)), d.x, d.y); else spr('drIdle', 0, d.x, d.y);
    plate(ctx, p.x, p.y, p.w, p.h); spr(d.word, 0, p.x + 3, p.y + 1);
    if (locked) { ctx.fillStyle = 'rgba(43,37,64,.62)'; ctx.fillRect(d.x, d.y, d.w, d.h - 12); ctx.fillStyle = 'rgba(43,37,64,.55)'; ctx.fillRect(px, d.base, d.pw, 12); } // 왕의 성을 깨기 전에는 어둡다
  });
  for (const a of cast.actors) {
    if (a === cast.king && forkOpen) continue;
    const frame = CALM ? a.frames[0] : a.frames[Math.floor(now / 130 + (a.door || 0)) % a.frames.length];
    spr(a.kind, frame, a.x, a.y);
  }
  if (cast.king && forkOpen) {
    const a = cast.king, d = doors[forkOpen.i], t = clamp((now - forkOpen.t0) / 400, 0, 1), run = Math.min(1, t / .65);
    // 먼저 몇 걸음 달리고 마지막 0.14초에 문으로 들어간다. 서 있던 왕 한 명만 움직인다.
    // 왕관 중심은 오른쪽 보기 31.5점, 왼쪽 보기 46.5점. 돌아설 때 몸이 15점 튀지 않게 잇는다.
    const nx = lerp(a.x, d.cx - 31, run), flip = d.cx < doors[1].cx, x = nx - (flip ? 15 : 0);
    if (t < .65 || forkOpen.locked) { const f = Math.floor(t * 24) % 8; spr('heroRun', f, x, GY - [43, 42, 43, 45, 43, 42, 43, 45][f], flip); }
    else {
      ctx.globalAlpha = 1 - (t - .65) / .35;
      // doorIn의 첫 장은 몸을 문 쪽으로 돌리는 자세. 뛰는 뒷장은 쓰지 않고 발을 바닥에 붙여 사라진다.
      spr('heroDoorIn', 0, d.cx - 31, GY - 45);
      ctx.globalAlpha = 1;
    }
  }
}
function titleLogoBottom() { return WIDE ? 6 + ATLAS.logoA.h : 26 + ATLAS.logoA.h + ATLAS.logoB.h + 2; }
function drawTitle() {
  const t = performance.now() / 1000, cx = W >> 1, low = Hc < 420;
  ctx.drawImage(bg.c, 0, 0);
  const hx = WIDE ? W - BW - 6 : BX, y0 = GY - (low ? 10 : WIDE ? 24 : 31), floors = low ? 0 : 2, r = ATLAS.roof, top = y0 - F - floors * F;
  spr('kpIdle', Math.floor(t * 10), (WIDE ? hx - 76 : W - 26) - (WIDE ? 14 : 20), GY - 28, WIDE); // 부수러 가는 상대
  const kx = WIDE ? hx - 30 : 28;
  spr('heroIdle', Math.floor(t * 10), kx - 31, GY - 44);
  for (let i = floors; i >= 1; i--) { const y = y0 - F - i * F; spr(LOOK_OF(lookId)[0], i + 1, hx, y); if (i === 1) spr('pigWin', Math.floor(t * 1.2) % 3, hx + 6, y); }
  spr(ROOF_OF(lookId), 0, hx - ((r.w - BW) >> 1), top - r.h + 1);
  spr('panel', 0, hx, y0 - F);
  const d = scene === 'card' ? Math.max(STAGE.dans[0], STAGE.dans[1] || 0, 1) : 2; // 첫 화면과 단 카드의 본보기 층
  drawNum(String(d * 3), hx + 16, y0 - F + 1, 'digB', 'c'); drawNum(String(d * 8), hx + 48, y0 - F + 1, 'digB', 'c'); drawNum(String(d * 2), hx + 80, y0 - F + 1, 'digB', 'c');
  signPlate(`${d} x 8`, hx + 48, y0 - F - SH - 1, false);
  if (scene !== 'title') return;
  if (WIDE) { const a = ATLAS.logoA, b = ATLAS.logoB, w = a.w + b.w + 6, x = cx - (w >> 1); spr('logoA', 0, x, 6); spr('logoB', 0, x + a.w + 6, 6 + a.h - b.h); }
  else { centerSpr('logoA', cx, 26); centerSpr('logoB', cx, 28 + ATLAS.logoA.h); }
}
function blit() { screenCtx.imageSmoothingEnabled = false; screenCtx.drawImage(dotBuf, ox, oy, W * K, H * K); }
function drawChunk(c) { ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.rotate(quarter(c.r)); ctx.drawImage(c.sp.c, -(c.w >> 1), -(c.h >> 1)); ctx.restore(); }
function draw() {
  if (!artReady) return;
  if (scene === 'title' || scene === 'card') { drawTitle(); blit(); return; }
  if (scene === 'map') { drawMap(); blit(); return; }
  if (scene === 'fork') { drawFork(); blit(); return; }
  const s = sim.s, now = performance.now();
  let sx = 0, sy = 0;
  if (shake.t > 0) { const k = shake.t / shake.dur, a = shake.amp * k * k, t = now / 1000 * 20; sx = Math.round(Math.sin(t * 6.28) * a); sy = Math.round(Math.cos(t * 4.7) * a); }
  ctx.save(); ctx.translate(sx, sy);
  ctx.drawImage(bg.c, 0, 0);
  ctx.drawImage(rubble.c, 0, rubbleTop);
  for (const c of chunks) if (!c.front) drawChunk(c);
  for (const p of dust) { const k = 1 - p.life / p.max, d = k > .5 ? p.s : 1; ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), d, d); }
  ctx.restore();
  const trem = lastFloor && s.phase === 'play' && !CALM ? Math.round(Math.sin(now / 22) * clamp(1 + (1 - s.gap / 3), 1, 2) * .7) : s.dashWarned && s.dashAt != null && !CALM ? Math.round(Math.sin(now / 16) * 1.4) : 0;
  const y0 = Math.round(GY - s.gap * F + kick) + trem;
  castDrawBack();
  drawCrowd();
  for (const b of booms) { if (b.t >= 0) spr('boom', Math.floor(b.t * 18), b.x - 26 + sx, b.y - 30 + sy); }
  drawPigs();
  ctx.save(); ctx.translate(sx, sy);
  for (const p of puffs) {
    const k = p.life / p.max, r = Math.round(p.s * (k < .25 ? .6 + k * 1.6 : (1 - k) * 1.33)), step = k > .55 ? 2 : 1; if (r < 2) continue;
    pxDisc(p.x, p.y, r, '#CFC4B4', step); pxDisc(p.x - 1, p.y - 1, r - 1, '#F2EADC', step);
  }
  ctx.restore();
  for (const p of streaks) { pxLine(p.x0, p.y0 - 5, p.x1, p.y1 - 5, COL.cream); pxLine(p.x0, p.y0 + 5, p.x1, p.y1 + 5, COL.cream); }
  if (!heroInFront()) drawHero();
  drawBuilding(y0);
  for (const b of slabs) ctx.drawImage(b.sp.c, Math.round(b.x), Math.round(b.y)); // 다음 층에 가리지 않게 건물 앞에 그린다
  for (const c of chunks) if (c.front) drawChunk(c);
  if (heroInFront()) drawHero();
  drawCells(y0);
  drawEmbers();
  drawStars();
  drawFx();
  if ((sim.cfg.power ? combo >= 15 : combo >= 10) && s.phase === 'play' && !CALM) { ctx.globalAlpha = .55 + .35 * Math.sin(now / 130); ctx.drawImage(edgeGold.c, 0, 0); ctx.globalAlpha = 1; }
  if (bandT > 0) { ctx.globalAlpha = Math.min(1, bandT / .25); ctx.drawImage(edgeImg.c, 0, 0); ctx.globalAlpha = 1; }
  else if (s.phase === 'play' && s.gap < 1) { ctx.globalAlpha = .32 + .28 * Math.sin(now / 130); ctx.drawImage(edgeImg.c, 0, 0); ctx.globalAlpha = 1; }
  drawSkip();
  if (s.phase !== 'clear') drawTutorial(y0);
  drawFloats();
  drawBubbles();
  if (screenFlash > 0) { ctx.globalAlpha = clamp(screenFlash / .16, 0, 1) * .9; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  drawHud(); drawBomb(); if (s.teach) drawTeachMark(y0);
  drawGems();
  if (screenFlash <= 0) drawCells(y0, true); // 맞힌 칸에서 터지는 별 · 다이아가 다음 답을 가리지 않게
  drawSign(y0); // 낮은 화면에서 위 표시 줄에 닿아도, 다이아가 지나가도 문제는 늘 읽힌다
  castDrawTop();
  blit();
}
// 끝 화면 판: 글은 DOM, 틀 · 창 · 판자는 게임과 같은 점 굵기로 뒤 캔버스에 그린다
const endFrameDots = () => Hc < 420 ? 6 : WIDE ? 10 : 4;
const endTopPanel = () => matchMedia('(max-height:419.9px) and (min-width:640px)').matches; // 낮은 폰 가로: 끝 판을 위에 두고 아래로 놀이 장면을 남긴다(index.html과 같은 조건)
// 「다음: 빈 상자 창고」처럼 긴 단추 글이 좁은 화면에서 두 줄로 갈라지면 글을 격자 한 칸씩 줄인다. 높이는 그대로
function fitGo(b) {
  b.style.fontSize = ''; b.style.minHeight = ''; if (b.hidden) return;
  const g = 12 / DPR, h = b.offsetHeight, max = Math.min(Wc - 32, Wc < 520 ? 328 : 1e9); let k = Math.round(parseFloat(getComputedStyle(b).fontSize) / g);
  while (b.offsetWidth > max && (k - 1) * g >= 16) { k--; b.style.fontSize = `${k * g}px`; b.style.minHeight = `${h}px`; }
}
function paintEnd() {
  const el = document.getElementById('end'), c = document.getElementById('endBg'), h2 = document.getElementById('endT'), row = document.querySelector('#board .row');
  if (el.hidden || !artReady) return;
  fitGo(document.getElementById('again'));
  const atTop = endTopPanel() && !el.classList.contains('card'), t = endFrameDots(), pw = W, ph = (Hc < 420 && !atTop ? Math.floor : Math.ceil)(el.offsetHeight / U), B = ATLAS.endBlock, g = c.getContext('2d');
  c.width = pw; c.height = ph; c.style.width = `${pw * U}px`; c.style.height = `${ph * U}px`; c.style.left = `${ox / DPR}px`; g.imageSmoothingEnabled = false;
  g.fillStyle = '#3F3851'; g.fillRect(0, 0, pw, ph);
  const part = (sx, sy, w, h, x, y) => g.drawImage(art, B.x + sx, B.y + sy, w, h, x, y, w, h);
  for (let x = t; x < pw - t; x += 32) { const w = Math.min(32, pw - t - x); part(32, 0, w, t, x, 0); part(32, 96 - t, w, t, x, ph - t); }
  for (let y = t; y < ph - t; y += 32) { const h = Math.min(32, ph - t - y); part(0, 32, t, h, 0, y); part(96 - t, 32, t, h, pw - t, y); }
  part(0, 0, t, t, 0, 0); part(96 - t, 0, t, t, pw - t, 0); part(0, 96 - t, t, t, 0, ph - t); part(96 - t, 96 - t, t, t, pw - t, ph - t);
  const dotL = r => Math.round((r.left * DPR - ox) / K), dotT = r => Math.round((r.top * DPR - oy) / K), A = ATLAS.endArch, P = ATLAS.endPlank;
  if (row && WIDE && !atTop) { // 곱셈 칸 양옆에 자리가 남으면 아치 창을 건다
    const first = row.firstElementChild.getBoundingClientRect(), room = dotL(first) - t, ay = t + (window.GF.inFrame && Hc < 420 ? 14 : 4); /* 낮은 화면은 사이트 단추가 창을 덮지 않게 내린다 */
    if (room >= A.w + 2 && ay + A.h <= ph - t) { spr('endArch', 0, t, ay, false, g); spr('endArch', 0, pw - t - A.w, ay, false, g); }
  }
  // 제목 판자: 이음매 없는 줄로 늘이고, 높이는 제목에 맞춘다
  const r = h2.getBoundingClientRect(), px = dotL(r), py = dotT(r), pwid = Math.round(r.width / U), phei = Math.max(P.h, Math.round(r.height / U)), mid = 5;
  const pPart = (sx, sy, w, h, x, y, dw = w, dh = h) => g.drawImage(art, P.x + sx, P.y + sy, w, h, x, y, dw, dh);
  const rows = (sx, w, x, dw) => { pPart(sx, 0, w, mid, x, py, dw, mid); pPart(sx, mid, w, 1, x, py + mid, dw, phei - P.h + 1); pPart(sx, mid + 1, w, P.h - mid - 1, x, py + phei - (P.h - mid - 1), dw, P.h - mid - 1); };
  rows(10, 1, px + 10, pwid - 20); rows(0, 10, px, 10); rows(11, 10, px + pwid - 10, 10);
  const rg = document.createRange(); rg.selectNodeContents(document.getElementById('endP')); const sr = rg.getBoundingClientRect(); // 점수 왼쪽 큰 다이아
  if (sr.width) spr('bigGem', 0, dotL(sr) - 15, dotT(sr) + ((Math.round(sr.height / U) - ATLAS.bigGem.h) >> 1), false, g);
}
function cssMetrics() {
  const x = a => (ox + a * K) / DPR, y = a => (oy + a * K) / DPR;
  return { W: Wc, H: Hc, F: F * U, G: G * U, GY: y(GY), BW: BW * U, BX: x(BX), CW: CW * U, PH: PH * U, SH: SH * U, ROPE: ROPE * U, HUD_Y: HUD_Y * U, house: houseAt && { x: x(houseAt.x), y: y(houseAt.y), w: houseAt.w * U, h: houseAt.h * U }, K, DPR, U, dotsW: W, dotsH: H, cvW: cv.width, cvH: cv.height };
}
