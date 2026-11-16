// 낚시왕 사이트 연결: 실행 묶음의 문서 몸체와 꾸밈을 이 문서에 올린 뒤 app.mjs를 한 번만 부른다.
// 묶음 폴더 이름은 빌드가 채운다(tools/pack-fishing.mjs). 원본은 tools/fishing-feel 한 벌이다.
const base = new URL('./runtime/eb71e71f3915/', import.meta.url);
const GF = window.GF;
import { createRecordLink } from './record-link.js?v=4e75caa237';
let host = null, app = null;
// 같은 출처의 부모 놀이 화면만 다룬다.
let parentDoc = null;
try { if (GF.inFrame) parentDoc = window.parent.document; } catch { parentDoc = null; }

async function mount() {
  const response = await fetch(new URL('index.html', base));
  if (!response.ok) throw new Error(`낚시 문서 ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  // 문서 안 상대 주소(꾸밈 · 그림 · 미리 받기)를 실행 묶음 기준으로 읽는다.
  const mark = document.createElement('base');
  mark.href = base.href;
  document.head.prepend(mark);
  const sheets = [];
  for (const node of doc.head.children) {
    if (node.tagName === 'STYLE') document.head.append(document.importNode(node, true));
    else if (node.tagName === 'LINK' && /\b(?:stylesheet|preload)\b/.test(node.rel)) {
      const link = document.importNode(node, true);
      if (/\bstylesheet\b/.test(node.rel)) sheets.push(new Promise(done => { link.onload = link.onerror = done; }));
      document.head.append(link);
    }
  }
  for (const attr of doc.body.attributes) document.body.setAttribute(attr.name, attr.value);
  document.body.append(...[...doc.body.childNodes].filter(node => node.nodeName !== 'SCRIPT').map(node => document.importNode(node, true)));
  await Promise.all(sheets);
  return import(new URL('app.mjs', base).href);
}

function showFail() {
  const box = document.createElement('div');
  box.setAttribute('role', 'status');
  box.style.cssText = 'position:fixed;inset:0;display:grid;place-content:center;justify-items:center;gap:16px;font:700 22px/1.4 sans-serif;color:#26414d;text-align:center';
  const text = document.createElement('p');
  text.textContent = '활동을 불러오지 못했어요';
  const again = document.createElement('button');
  again.type = 'button';
  again.textContent = '다시 불러오기';
  again.style.cssText = 'min-height:48px;padding:0 24px;font:inherit';
  again.onclick = () => location.reload();
  box.append(text, again);
  document.body.append(box);
}

// 놀이 중에는 게임 위 띠의 소리 · 멈춤 단추를 쓰고, 부모의 나가기 · 소리 단추는 감춘다(같은 단추가 두 벌 보이지 않게).
function paintParent(view) {
  if (!parentDoc) return;
  parentDoc.body.dataset.uiState = view.playing ? (view.paused ? 'pause' : 'play') : 'title';
  for (const test of ['exit-x', 'sound']) {
    const button = parentDoc.querySelector(`[data-test="${test}"]`);
    if (button) button.style.display = view.playing ? 'none' : '';
  }
  hostOff = !!view.playing;
  if (!hostOff) placeHostButtons(true);
}

// ---- 놀이 밖 화면의 사이트 단추 자리(q04): 나가기 · 소리는 사이트 틀이 게임 위에 띄운다 ----
// 화면 · 크기 · 쪽마다 게임 단추와 글 자리가 달라 표로 적지 못한다. 기본 자리가 가리면 안 가리는 가장 가까운 가장자리로 옮긴다.
// 짧은 변 600 아래는 다른 게임과 같은 작은 그림 단추(공용 gf-compact-host)를 쓴다. 공용 꾸밈(play.css)은 고치지 않으니 다른 게임은 그대로다.
let hostOff = true, hostKey = '';
function gameBlocks() {
  const shown = new Map(), out = [];
  const isShown = el => {
    if (shown.has(el)) return shown.get(el);
    let on = !!el.getClientRects().length;
    if (on && el.parentElement && el !== document.body) on = isShown(el.parentElement);
    if (on) { const s = getComputedStyle(el); on = !/inset\(50%/.test(s.clipPath) && +s.opacity !== 0; }
    shown.set(el, on);
    return on;
  };
  const add = r => { if (r.width > 2 && r.height > 2) out.push(r); };
  for (const el of document.querySelectorAll('button,a,input,select,[role="button"],[data-act]')) if (isShown(el)) add(el.getBoundingClientRect());
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), range = document.createRange();
  while (walk.nextNode()) {
    const n = walk.currentNode, el = n.parentElement;
    if (!n.data.trim() || !el || el.closest('script,style,svg,canvas') || !isShown(el)) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) add(r);
  }
  return out;
}
// 물고기 그림도 되도록 피한다. 빈자리가 없으면 그림 위에는 올라가도 단추 · 글은 가리지 않는다.
const fishPictures = () => [...document.querySelectorAll('#end .sticker-scene,#dex .dex-portrait')].filter(el => el.getClientRects().length && !el.closest('[hidden]')).map(el => el.getBoundingClientRect());
const HOST_GAP = 3, HOST_SHADOW = 4;
const hostHit = (x, y, w, h, blocks) => blocks.some(b => x - HOST_GAP < b.right && x + w + HOST_GAP > b.left && y - HOST_GAP < b.bottom && y + h + HOST_SHADOW + HOST_GAP > b.top);
// 안 가리는 자리 가운데 집(왼쪽 위 · 오른쪽 위)에서 가깝고 가장자리에 붙은 곳.
function freeSpot(w, h, side, blocks) {
  const W = innerWidth, H = innerHeight, homeX = side === 'left' ? 6 : W - w - 6;
  let best = null, score = Infinity;
  for (let y = 4; y <= H - h - HOST_SHADOW - 2; y += 6) for (let x = 4; x <= W - w - 4; x += 6) {
    const edge = Math.min(x, W - w - x, y, H - h - y), d = Math.hypot(x - homeX, y - 4) + edge * 3;
    if (d < score && !hostHit(x, y, w, h, blocks)) { best = { x, y }; score = d; }
  }
  return best;
}
function placeHostButtons(fresh = false) {
  if (!parentDoc || hostOff) return;
  const exit = parentDoc.querySelector('[data-test="exit-x"]'), sound = parentDoc.querySelector('[data-test="sound"]');
  if (!exit || !sound) return;
  const key = `${innerWidth}x${innerHeight}`;
  if (key !== hostKey) { fresh = true; hostKey = key; }
  const small = Math.min(innerWidth, innerHeight) < 600, body = parentDoc.body;
  if (small !== body.classList.contains('gf-compact-host')) { body.classList.toggle('gf-compact-host', small); fresh = true; }
  const blocks = gameBlocks(), wide = [...blocks, ...fishPictures()];
  for (const [button, side] of [[exit, 'left'], [sound, 'right']]) {
    const free = () => { const r = button.getBoundingClientRect(); return !hostHit(r.left, r.top, r.width, r.height, wide); };
    if (fresh) button.style.left = button.style.top = button.style.right = button.style.bottom = '';
    if (!free()) {
      const r = button.getBoundingClientRect(), spot = freeSpot(r.width, r.height, side, wide) ?? freeSpot(r.width, r.height, side, blocks);
      if (spot) Object.assign(button.style, { left: `${spot.x}px`, top: `${spot.y}px`, right: 'auto', bottom: 'auto' });
    }
    const placed = button.getBoundingClientRect();
    blocks.push(placed); wide.push(placed);
  }
}
if (parentDoc) setInterval(placeHostButtons, 400);

try {
  app = await mount();
  let recordStorage = null;
  try { recordStorage = localStorage; } catch { /* 기기 저장 없이도 낚시한다. */ }
  const records = createRecordLink({ game: GF.gameId, storage: recordStorage,
    ledger: () => import('../../js/ledger.js?v=4e75caa237'), nametag: async () => (await import('../../js/store.js?v=4e75caa237')).getNametag() });
  app.linkRecord(records);
  host = app.attachHost({
    onReady: () => GF.ready(),
    // 판 시작 알림은 기다리지 않는다(부모 답이 늦어도 놀이는 바로 간다).
    onStart: () => { records.start(); },
    onScreen: paintParent,
    onSoundRequest: () => parentDoc?.querySelector('[data-test="sound"]')?.click(),
  });
} catch (error) {
  console.error(error);
  showFail();
}
if (host) {
  host.sound({ on: GF.sound });
  GF.on('sound', ({ on }) => host.sound({ on }));
  GF.on('pause', () => host.pause());
  GF.on('resume', () => host.resume());
  // 부모 멈춤 창이 읽는 값: 놀이 밖 화면이면 나가기 단추가 바로 사이트로 나간다.
  window.__GAME = { pauseUI: () => {
    const view = host.view(), cup = app.contestState?.();
    return { menu: !view.playing, line: (cup?.on && view.playing ? `오늘의 대회 ${view.placeName}` : view.placeName) || undefined };
  } };
}
