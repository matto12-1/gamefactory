(function () {
  'use strict';
  // 버티기 판 사이 기록. 엽전, 강화, 주인공, 도감은 이 기기에만 둔다(localStorage gf:meta:<게임 id>).
  // 첫 화면에는 「준비」 단추와 준비 창(주인공, 강화, 도감)을, 끝 화면에는 받은 엽전과 새로 열린 것을 덧붙인다.
  // 계산(clean, buy, unlock, choose, settle, applyStart)은 DOM 없이 돌아 vm 시험과 봇 판에서도 그대로 쓴다.
  // 창이 열린 동안 키는 창이 먼저 받는다(capture). 첫 화면의 숫자, Q E S, Enter가 창 뒤에서 판을 열지 않게 막는다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, T = R.T;
  const doc = typeof document !== 'undefined';
  const KINDS = ['people', 'weapons', 'relics', 'evolutions', 'foes'];
  // 강화 칸 그림: 같은 능력을 올리는 유물 아이콘, 맞는 유물이 없으면 줍는 것 그림
  const SHOP_PIC = { might: 'might', hp: 'hpPct', speed: 'move', pickup: 'magnet', wisdom: 'gem-2', regen: 'regen', armor: 'armor', cd: 'cd', area: 'area', duration: 'duration' };
  // 도감 칸 크기. 그림은 이 안에서 정수 배로 키운다(픽셀 그림이 고르게 보이게).
  const CELL = { people: 80, weapons: 64, relics: 64, evolutions: 64, foes: 72 };
  const STYLE = `
.gf-title-screen.gf-shared-ui,.gf-title-screen.gf-shared-ui *{font-family:Jua,sans-serif!important}
.sv-meta-open{font-family:Jua,sans-serif;font-weight:400;white-space:nowrap}
.sv-home .sv-meta-home{position:static;transform:none;display:flex;align-items:center;justify-content:center;gap:12px;box-sizing:border-box;width:min(520px,100%);min-height:64px;flex:none;padding:10px 18px;font-size:24px}
.sv-home .sv-meta-home .sv-mo-face{display:block}
.sv-hero-rule{margin:0 0 8px}
.sv-facts-head{display:block;margin:8px 0 4px}
.sv-facts{margin:0;padding-left:1.4em;display:grid;gap:4px}
.sv-fact-locked{color:#9a8a74}
.sv-meta-open .sv-mo-face{flex:none;margin-left:-4px;border-radius:6px;background:#f3e3c3}
.sv-coin{display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 5px;border-radius:999px;background:#141826;color:#ffe08a;line-height:1.1;font-weight:400}
.sv-coin img{flex:none}
@media (max-width:420px){.sv-meta-open .sv-mo-face{display:none}}
.sv-meta,.sv-meta *{word-break:keep-all;overflow-wrap:break-word}
.sv-story,.sv-detail p{text-wrap:balance}
.sv-meta{position:fixed;inset:0;z-index:40;display:flex;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:76px 12px 12px;background:rgba(20,24,38,.72);font-family:Jua,sans-serif;font-weight:400;color:#141826;-webkit-tap-highlight-color:transparent}
.sv-meta *{box-sizing:border-box}
.sv-meta img,.sv-gain-box img{image-rendering:pixelated}
.sv-meta-box{margin:auto;width:min(1000px,100%);padding:14px 16px 18px;background:#fff7e6;border:3px solid #141826;border-radius:18px;box-shadow:0 6px 0 #141826}
.sv-meta-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
.sv-meta-title{margin:0;font:inherit;font-size:30px;line-height:1.1}
.sv-meta-have{margin-left:auto;font-size:20px}
.sv-meta button{font:inherit;color:#141826;cursor:pointer;touch-action:manipulation}
.sv-meta button:focus-visible,.sv-hero:focus-visible,.sv-shop-row:focus-visible{outline:3px solid #429ce7;outline-offset:2px}
.sv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:6px 14px;font-size:18px;line-height:1.1;background:#e6b653;border:3px solid #141826;border-radius:12px;box-shadow:0 3px 0 #141826}
.sv-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #141826}
.sv-meta .sv-btn:disabled{background:#e4dccb;color:#7a7263;box-shadow:none;cursor:default}
.sv-meta-close{flex:none;background:#fff}
.sv-meta-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.sv-tab{min-height:44px;padding:6px 20px;font-size:21px;background:#fff;border:3px solid #141826;border-radius:999px}
.sv-tab[aria-selected="true"]{background:#141826;color:#fff7e6}
.sv-tag{display:inline-block;padding:3px 10px;font-size:15px;line-height:1.2;color:#fff7e6;background:#141826;border-radius:999px}
.sv-note{font-size:14px;color:#a3402f}
.sv-box{flex:none;display:grid;place-items:center}
.sv-box img{max-width:100%;max-height:100%;object-fit:contain}
.sv-heroes{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:10px}
.sv-hero{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 10px;text-align:center;background:#fff;border:3px solid #141826;border-radius:14px}
.sv-hero.sv-on{background:#ffeab0;box-shadow:inset 0 0 0 3px #e6b653}
.sv-hero.sv-locked{background:#f1ead9}
.sv-hero.sv-locked .sv-hero-face img{filter:brightness(0) opacity(.35)}
.sv-hero-face{width:80px;height:80px}
.sv-hero-name{font-size:22px;font-weight:400}
.sv-hero-weapon{display:inline-flex;align-items:center;gap:6px;font-size:16px}
.sv-hero-perk{font-size:16px;color:#6b4a1f}
.sv-hero-foot{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:4px}
.sv-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:10px}
.sv-shop-row{display:flex;align-items:center;gap:12px;padding:10px 12px;background:#fff;border:3px solid #141826;border-radius:14px}
.sv-shop-row .sv-box{width:64px;height:64px}
.sv-shop-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:16px}
.sv-shop-text b{font-size:21px;font-weight:400}
.sv-pips{display:flex;gap:4px}
.sv-pip{width:14px;height:14px;background:#fff7e6;border:2px solid #141826;border-radius:4px}
.sv-pip.sv-on{background:#e6b653}
.sv-shop-act{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.sv-shop-row.sv-locked{background:#f3ead8;border-style:dashed;color:#6d5f4c}
.sv-shop-row.sv-locked .sv-box{filter:grayscale(1);opacity:.6}
.sv-lock-note{font-size:14px;color:#8a6a3e}
.sv-kinds{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.sv-kind{display:inline-flex;align-items:baseline;gap:6px;min-height:40px;padding:6px 12px;font-size:18px;background:#fff;border:3px solid #141826;border-radius:12px}
.sv-kind[aria-pressed="true"]{background:#e6b653}
.sv-kind small{font-size:14px;opacity:.75}
.sv-book{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);grid-template-areas:"cells detail";gap:12px;align-items:start}
.sv-cells{grid-area:cells;display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
.sv-cell{position:relative;display:grid;place-items:center;aspect-ratio:1;padding:6px;background:#fff;border:3px solid #141826;border-radius:12px}
.sv-cell .sv-box{width:100%;height:100%}
.sv-cell.sv-on{background:#ffeab0}
.sv-unknown .sv-box img{filter:brightness(0) opacity(.3)}
.sv-book-question{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;pointer-events:none}
.sv-detail{grid-area:detail;position:sticky;top:0;padding:12px 14px;background:#fff;border:3px solid #141826;border-radius:14px}
.sv-detail-top{display:flex;align-items:center;gap:12px}
.sv-detail-top .sv-box{width:128px;height:128px;background:#fff7e6;border-radius:10px;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)}
.sv-detail-name{margin:0;font:inherit;font-size:26px;line-height:1.15}
.sv-tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}
.sv-detail p{margin:8px 0 0;font-size:17px;line-height:1.45}
.sv-detail .sv-story{font-size:16px;color:#3b2a1a}
.sv-detail .sv-ally-note{font-size:15px;line-height:1.5;color:#7a4d00}
.sv-detail .sv-only-note{color:#5f3580}
.sv-pair{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:16px}
@media (max-width:640px){
.sv-meta{padding:76px 8px 8px}.sv-meta-box{padding:12px 10px 14px}.sv-meta-title{font-size:24px}.sv-tab{padding:6px 14px;font-size:19px}
.sv-book{grid-template-columns:minmax(0,1fr);grid-template-areas:"detail" "cells"}.sv-detail{position:static}
.sv-detail-top .sv-box{width:96px;height:96px}.sv-cells{grid-template-columns:repeat(auto-fill,minmax(84px,1fr))}}
@media (max-height:520px) and (orientation:landscape){.sv-meta-head{margin-bottom:6px}.sv-meta-tabs{margin-bottom:8px}.sv-hero{padding:8px}}
@media (prefers-reduced-motion:reduce){.sv-meta *{transition:none!important;animation:none!important}.sv-btn:active:not(:disabled){transform:none}}
.sv-gain-box{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 14px;margin-top:8px;font:400 17px/1.3 Jua,sans-serif;color:var(--ui-ink,#3b2a1a)}
.sv-gain{display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 6px}
.sv-gain b{font-weight:400}
.sv-gain small{font-size:.85em;opacity:.75}
@media (orientation:landscape) and (max-height:820px){.sv-gain-box{font-size:clamp(13px,2.2vh,17px);margin-top:.6vh;gap:.5vh 1.6vh}}
@media (orientation:portrait) and (max-width:420px){
.gf-end-show.gf-shared-ui .sv-result-panel{top:2%;height:70vh;max-height:70vh;padding:12px 14px 10px;gap:6px}
.sv-result-panel .gf-result-stars{height:58px}
.sv-result-panel .gf-result-star{width:50px;height:48px}
.sv-result-panel .gf-result-star:nth-child(2){width:56px;height:54px}
.sv-result-panel .gf-stage-result-stars{height:58px}
.sv-result-panel .gf-stage-result-stars span{width:50px;height:48px}
.sv-result-panel .gf-stage-result-stars span:nth-child(2){width:56px;height:54px}
.sv-result-panel .gf-result-number{font-size:52px;line-height:1.1}
.sv-result-panel .gf-result-heading{font-size:21px}
.sv-result-panel .sv-gain img{max-width:24px;max-height:24px}
.sv-result-panel .gf-result-record{margin-bottom:4px!important}
.sv-result-panel .gf-result-stats{padding:6px 0}
.sv-result-panel .sv-gain-box{margin-top:4px;gap:2px 10px}
.sv-result-panel .gf-result-learning .gf-review{flex-shrink:0;max-height:none;overflow:visible;margin:0}}

/* A 군막 판: docs/refs/2026-10-18-topbar/variants/a.css */
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar [data-test="meta-open"]{
  width:184px!important;min-width:184px!important;margin:0!important;padding:0 10px!important;gap:8px!important;
  background:var(--tb-gold)!important;border-color:var(--tb-gold-edge)!important;color:var(--tb-gold-ink)!important;text-shadow:0 1px #fff5;
}
body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] .sv-mo-face{display:block!important;width:28px!important;height:28px!important;margin:0!important;border-radius:0!important;background:none!important;image-rendering:pixelated!important}
body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] .sv-coin{padding:2px 4px!important;border:1px solid #6d4c20!important;border-radius:2px!important;background:#5a3b1b!important;color:#fff1bd!important;font:400 16px/1 Jua,sans-serif!important;gap:4px!important}
body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] .sv-coin img{width:12px!important;height:12px!important;image-rendering:pixelated!important}
body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] :is(span,b){font-family:Jua,sans-serif!important;font-weight:400!important;white-space:nowrap!important}
@media(max-width:700px){
  body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar [data-test="meta-open"]{width:160px!important;min-width:160px!important;font-size:16px!important;padding:0 8px!important;gap:6px!important}
  body[data-ui-family="survivor"] .sv-map .sv-bar [data-test="meta-open"]{width:min(160px,100%)!important;min-width:0!important}
  body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] .sv-mo-face{display:none!important}
  body[data-ui-family="survivor"] .sv-bar [data-test="meta-open"] .sv-coin{font-size:16px!important}
}
@media (orientation: landscape) and (max-height: 500px){
 .sv-meta{padding:8px;overflow:hidden}
 .sv-meta-box{display:grid;grid-template-columns:106px minmax(0,1fr);grid-template-rows:44px minmax(0,1fr);gap:8px 12px;height:100%;min-height:0;margin:0 auto;padding:8px 10px;overflow:hidden}
 .sv-meta-head{grid-column:1/-1;grid-row:1;flex-wrap:nowrap;gap:8px;margin:0;padding:0 54px}
 .sv-meta-title{font-size:22px}.sv-meta-have{font-size:16px}
 .sv-meta .sv-meta-close{min-height:44px;font-size:16px;padding:6px 12px}
 .sv-meta-tabs{grid-column:1;grid-row:2;flex-direction:column;flex-wrap:nowrap;align-self:start;gap:8px;margin:0}
 .sv-meta .sv-tab{width:100%;min-height:44px;padding:6px 8px;font-size:17px}
 .sv-meta-body{grid-column:2;grid-row:2;min-width:0;min-height:0;padding:0 3px 4px 0;overflow:auto;overscroll-behavior:contain}
 .sv-meta .sv-note{font-size:13px;line-height:1.25}
 .sv-meta .sv-hero-rule{margin:0 0 6px}
 .sv-meta .sv-heroes{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
 .sv-meta .sv-hero{display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto auto auto auto;align-content:start;align-items:center;gap:3px 6px;padding:6px}
 .sv-meta .sv-hero-face{grid-column:1;grid-row:1/3;width:44px;height:44px}
 .sv-meta .sv-hero-name{grid-column:2;grid-row:1;font-size:18px;text-align:left}
 .sv-meta .sv-hero-weapon{grid-column:2;grid-row:2;gap:4px;font-size:13px;text-align:left}
 .sv-meta .sv-hero-weapon img{max-width:22px;max-height:22px}
 .sv-meta .sv-hero-perk{grid-column:1/-1;grid-row:3;font-size:14px}
 .sv-meta .sv-hero-foot{grid-column:1/-1;grid-row:4;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:4px;min-height:44px;margin:0;padding-top:2px}
 .sv-meta .sv-hero-foot .sv-note{flex:1;min-width:0}
 .sv-meta .sv-tag{font-size:13px;padding:3px 6px}
 .sv-meta .sv-hero .sv-btn{min-height:44px;font-size:16px}
 .sv-meta .sv-shop{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .sv-meta .sv-shop-row{gap:8px;padding:8px}
 .sv-meta .sv-shop-row .sv-box{width:40px;height:40px}
 .sv-meta .sv-shop-text{gap:3px;font-size:13px}.sv-meta .sv-shop-text b{font-size:18px}
 .sv-meta .sv-pips{flex-wrap:wrap;gap:3px}.sv-meta .sv-pip{width:10px;height:10px}
 .sv-meta .sv-shop-act .sv-btn{min-height:44px;padding:6px 8px;gap:4px;font-size:16px}
 .sv-meta .sv-lock-note{font-size:13px}
 .sv-meta .sv-kinds{gap:6px;margin-bottom:6px;flex-wrap:nowrap}
 .sv-meta .sv-kind{min-height:44px;padding:5px 7px;gap:4px;font-size:14px}.sv-meta .sv-kind small{font-size:13px}
 .sv-meta .sv-book{grid-template-columns:minmax(0,1fr) 220px;grid-template-areas:"cells detail";gap:10px}
 .sv-meta .sv-cells{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px}
 .sv-meta .sv-cell{height:96px;min-height:44px;aspect-ratio:auto}
 .sv-meta .sv-detail{position:static;padding:8px}
 .sv-meta .sv-detail-top{gap:8px}.sv-meta .sv-detail-top .sv-box{width:48px;height:48px}
 .sv-meta .sv-detail-name{font-size:18px}.sv-meta .sv-tags{gap:4px;margin:6px 0 4px}
 .sv-meta .sv-detail p,.sv-meta .sv-detail .sv-story{margin-top:6px;font-size:13px;line-height:1.4}
 .sv-meta .sv-detail .sv-pair{font-size:13px;gap:4px;margin-top:6px}
}
`;

  // 시대 판의 사람·적은 칸이 있는 것만(옛 목록은 남아 있어도 도감에 안 나온다)
  const listOf = (content, k) => { const all = k === 'foes' ? [...(content?.foes || []), ...(content?.bosses || []), S.bosses.bulgasariDef] : content?.[k] || []; return eraMode(content) && (k === 'people' || k === 'foes') ? all.filter(x => x.cell || x.id === 'bulgasari') : all; };
  const FACTS = 6;
  const isBoss = (content, id) => (content?.bosses || []).some(b => b.id === id);
  const slotOf = (content, k, x, manifest) => k === 'evolutions' && manifest?.evolutionFx?.weapons?.[x.id]?.icon
    ? manifest.evolutionFx.weapons[x.id].icon : k !== 'foes' ? R.picSlot(content, x.id) : x.id === 'bulgasari' || isBoss(content, x.id) ? `boss-${x.sprite}` : `foe-${x.sprite}-a`;
  const key = () => `gf:meta:${window.GF?.gameId || 'game'}`;
  const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
  const free = h => !h.unlock?.stage && !h.unlock?.coins;
  const byStage = (h, cleared) => !!h.unlock?.stage && cleared.some(n => n >= h.unlock.stage);
  const E = () => S.eras;
  const eraMode = content => !!content?.packs?.length;
  // 시대 판: 깬 칸의 주인공이 열린다. 옛 판: 처음부터·단계·엽전으로 연다.
  const opened = (h, cleared, content) => eraMode(content) ? !!h.cell && cleared.includes(E().cellNo(h.cell)) : free(h) || byStage(h, cleared);
  // 이번 판에 고를 수 있는 주인공. 시대 따라가기에서 아직 못 깬 칸은 그 칸 사람만, 깬 칸과 무한은 열린 주인공 누구나.
  function heroesFor(m, content, { play = 'stage', cell = null } = {}) {
    if (!eraMode(content)) return m.heroes;
    const mine = (content.heroes || []).filter(h => h.cell === cell).map(h => h.person);
    if (play === 'stage' && !m.cleared.includes(E().cellNo(cell))) return mine;
    return [...new Set([...mine.filter(p => play === 'stage'), ...m.heroes])];
  }

  function blank() {
    return { v: 1, coins: 0, shop: {}, hero: null, heroes: [], cleared: [], seen: { people: [], weapons: [], relics: [], evolutions: [], foes: [] }, facts: {} };
  }

  // 저장된 값은 믿지 않는다. 모르는 열쇠와 id는 버리고 수는 범위 안으로 자른다.
  function clean(raw, content, tuning) {
    const src = raw && typeof raw === 'object' ? raw : {};
    if (eraMode(content) && tuning) E().expand(content, tuning);
    const m = blank(), max = tuning?.shop?.max ?? 5;
    m.coins = int(src.coins, 0, 1e7);
    // 끝 단계가 줄어든 강화(10-21 빠르기 5→3)는 넘친 단계에 쓴 엽전을 돌려준다.
    for (const k of R.SHOP) {
      const had = int(src.shop?.[k], 0, max), n = Math.min(had, R.shopMax(k, tuning));
      if (n) m.shop[k] = n;
      for (let i = n; i < had; i++) m.coins += tuning?.shop?.cost?.[i] ?? 0;
    }
    const last = eraMode(content) ? E().CELLS.length : content?.stages?.length || 10;
    m.cleared = [...new Set((Array.isArray(src.cleared) ? src.cleared : []).map(Number))]
      .filter(n => Number.isInteger(n) && n >= 1 && n <= last).sort((a, b) => a - b);
    const had = new Set(Array.isArray(src.heroes) ? src.heroes : []);
    m.heroes = (content?.heroes || []).filter(h => opened(h, m.cleared, content) || !eraMode(content) && had.has(h.person)).map(h => h.person);
    m.hero = m.heroes.includes(src.hero) ? src.hero : m.heroes[0] ?? null;
    for (const k of KINDS) {
      const known = new Set(listOf(content, k).map(x => x.id));
      m.seen[k] = [...new Set(Array.isArray(src.seen?.[k]) ? src.seen[k] : [])].filter(id => known.has(id));
    }
    const people = new Set(listOf(content, 'people').map(x => x.id));
    for (const [id, n] of Object.entries(src.facts && typeof src.facts === 'object' ? src.facts : {})) { const v = int(n, 0, FACTS); if (people.has(id) && v) m.facts[id] = v; }
    return m;
  }

  function read(content, tuning) {
    let raw = null;
    try { raw = JSON.parse(window.localStorage?.getItem(key()) ?? 'null'); } catch { raw = null; }
    return clean(raw, content, tuning);
  }

  function write(m) {
    try { window.localStorage?.setItem(key(), JSON.stringify(m)); return true; } catch { return false; }
  }

  // 강화 한 칸 값. 다 올렸으면 null.
  function costOf(m, k, tuning) {
    const s = tuning?.shop || {}, n = m.shop[k] || 0;
    return n < R.shopMax(k, tuning) ? s.cost?.[n] ?? null : null;
  }

  // 지도 줄이 열려야 사는 강화(tuning.shop.row)는 그 줄 칸 하나라도 열리면 산다(10-21 고려 줄에 막기·간격, 조선 줄에 범위·지속).
  // 시대 판이 아니면 줄 강화는 없다.
  function shopOpen(m, k, tuning, content) {
    const row = tuning?.shop?.row?.[k];
    if (!row) return true;
    if (!eraMode(content)) return false;
    const cleared = new Set(m.cleared.map(n => E().cellId(n)));
    return E().mapState(content, cleared).some(c => c.row === row && c.unlocked);
  }
  const rowName = (content, id) => (content?.map?.rows || []).find(r => r.id === id)?.name ?? id;
  const shopSlot = (content, k) => { const want = SHOP_PIC[k], relic = (content.relics || []).find(r => r.stat === want); return relic ? `icon-${relic.icon}` : want; };

  // content를 주면 아직 안 열린 줄 강화는 사지 못한다(content 없이 부르는 시험·봇은 값만 본다).
  function buy(m, k, tuning, content) {
    const c = R.SHOP.includes(k) && (content === undefined || shopOpen(m, k, tuning, content)) ? costOf(m, k, tuning) : null;
    if (c == null || m.coins < c) return false;
    m.coins -= c; m.shop[k] = (m.shop[k] || 0) + 1;
    return true;
  }

  // 엽전으로 주인공 열기(단계 칸으로 여는 것은 settle이 한다)
  function unlock(m, person, content) {
    const c = content?.heroes?.find(h => h.person === person)?.unlock?.coins;
    if (!c || m.heroes.includes(person) || m.coins < c) return false;
    m.coins -= c; m.heroes.push(person);
    return true;
  }

  function choose(m, person) {
    if (!m.heroes.includes(person)) return false;
    m.hero = person;
    return true;
  }

  // 판 하나를 마치면 엽전을 더하고, 깬 단계 칸으로 주인공을 열고, 처음 본 것을 도감에 옮긴다.
  // 상자 엽전은 chests로 센다(엔진은 상자 엽전을 extraCoins에 넣지 않는다). extraCoins는 엽전 카드 몫.
  function settle(m, sv, { mode, content, tuning } = {}) {
    const coins = R.coinsNow(sv, tuning.coins);
    m.coins = Math.min(1e7, m.coins + coins);
    const stage = mode?.play === 'stage' && mode.passed ? Number(mode.stage) : 0, last = eraMode(content) ? E().CELLS.length : content.stages?.length || 10;
    const shut = R.SHOP.filter(k => !shopOpen(m, k, tuning, content));
    if (Number.isInteger(stage) && stage >= 1 && stage <= last && !m.cleared.includes(stage)) {
      m.cleared.push(stage); m.cleared.sort((a, b) => a - b);
    }
    const shops = shut.filter(k => shopOpen(m, k, tuning, content));
    const opened = [];
    for (const h of content.heroes || []) if (!m.heroes.includes(h.person) && (eraMode(content) ? !!h.cell && m.cleared.includes(E().cellNo(h.cell)) : byStage(h, m.cleared))) { m.heroes.push(h.person); opened.push(h.person); }
    const met = [];
    for (const k of KINDS) {
      const known = new Set(listOf(content, k).map(x => x.id));
      for (const id of sv.seen?.[k] || []) if (known.has(id) && !m.seen[k].includes(id)) { m.seen[k].push(id); met.push({ kind: k, id }); }
    }
    const learned = [], people = new Set(listOf(content, 'people').map(x => x.id));
    for (const [id, n] of Object.entries(sv.facts || {})) {
      const old = m.facts[id] || 0, now = Math.min(FACTS, old + int(n, 0, FACTS));
      if (people.has(id) && now > old) { m.facts[id] = now; learned.push({ id, n: now }); }
    }
    return { coins, opened, met, learned, shops };
  }

  // 판을 열 때 고른 주인공과 강화를 세계에 싣는다. 저장이 없으면(vm, 시험) 그 칸 처음 주인공에 강화 없음.
  // 시대 판: 고른 주인공이 이번 판에 허락되지 않으면 그 칸의 처음 주인공(first), 무한이면 열린 주인공 첫째.
  function applyStart(w, sv) {
    const content = w.content, m = read(content, w.family?.tuning);
    let def;
    if (eraMode(content)) {
      const cell = sv.cell?.id, ok = heroesFor(m, content, { play: sv.play, cell });
      const pick = ok.includes(sv.pickHero) ? sv.pickHero : ok.includes(m.hero) ? m.hero : null;
      def = content.heroes.find(h => h.person === pick)
        || content.heroes.find(h => h.cell === cell && h.first) || content.heroes.find(h => ok.includes(h.person)) || content.heroes.find(h => h.cell === sv.order?.[0]) || content.heroes[0];
    } else def = content.heroes.find(h => h.person === m.hero) || content.heroes[0];
    sv.heroDef = def;
    sv.shop = { ...m.shop };
    sv.hero.person = content.people.find(p => p.id === def.person)?.person ?? 0;
    sv.seen.people.add(def.person);
    return m;
  }

  // 이전 버전의 막 저장은 읽지 않고 지운다.
  const runKey = () => `gf:sv-run:${window.GF?.gameId || 'game'}`;
  function runClear() { try { window.localStorage?.removeItem(runKey()); } catch {} }

  // ---- 화면(document가 있을 때만) ----
  let cur = null, boughtAt = -1e9;

  function el(tag, cls, text, parent) {
    const n = (parent?.ownerDocument || document).createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function button(parent, text, test, cls = 'sv-btn') {
    const b = el('button', cls, text, parent);
    b.type = 'button';
    if (test) b.dataset.test = test;
    return b;
  }

  function sound(slot) { try { window.GFJuice?.sound?.play?.(slot); } catch {} }

  function style(target = document) {
    if (target.getElementById('sv-meta-style')) return;
    const s = el('style', null, STYLE, target.head);
    s.id = 'sv-meta-style';
  }

  // src는 .art와 .version이 있는 것(껍데기 data나 세계). box 안에 정수 배로 키우고, box보다 크면 부드럽게 줄인다.
  // 새 사람 얼굴은 작은 칸에서도 도트 경계를 유지한다.
  function art(parent, src, slot, cls, box) {
    const img = S.picker?.pic?.(parent, src, slot, cls) ?? null;
    const s = slot && (S.picker?.asset?.(src?.art, slot) || src?.art?.slots?.[R.slotIn(src?.art, slot)]);
    if (img && s?.w && s?.h && box) {
      const big = Math.max(...(s.legacySize || [s.w, s.h])), k = big > box ? box / big : Math.floor(box / big);
      img.style.width = `${Math.round(s.w * k)}px`;
      img.style.height = `${Math.round(s.h * k)}px`;
      if (big > box) img.style.imageRendering = s.finedot ? 'pixelated' : 'auto';
    }
    return img;
  }

  function framed(parent, src, slot, box, cls = 'sv-box') {
    const f = el('span', cls, null, parent);
    art(f, src, slot, null, box);
    return f;
  }

  function coin(parent, src, n, box = 16) {
    const s = el('span', 'sv-coin', null, parent);
    art(s, src, 'coin', null, box);
    el('b', null, String(n), s);
    return s;
  }

  function titleExtra(page, ctx) {
    S.picker?.close?.();
    const data = ctx?.data;
    if (!doc || !page || !data?.content?.heroes) return;
    style();
    const home=page.closest?.('.sv-home');
    const screen = home || page.closest?.('.gf-title-screen') || page;
    S.feedback.settings(page);
    if (screen.querySelector('[data-test="meta-open"]')) return;
    const b = button(home?.querySelector('.sv-home-main') || page.querySelector('.gf-menu-side') || page, null, 'meta-open', home?'sv-go sv-meta-open sv-meta-home':'gf-button gf-menu-duo sv-meta-open');
    paintOpen(b, data);
    b.addEventListener('click', e => { e.stopPropagation(); openMeta(data); });
  }

  // 강화 단추: 지금 주인공 얼굴, 가진 엽전
  function paintOpen(b, data) {
    const m = read(data.content, data.family?.tuning);
    const hero=m.hero||data.content.heroes.find(h=>h.cell===data.content.packs?.[0]?.id&&h.first)?.person||data.content.heroes[0]?.person;
    b.replaceChildren();
    art(b, data, R.picSlot(data.content, hero), 'sv-mo-face', 32);
    el('span', null, '강화하기', b);
    coin(b, data, m.coins);
    b.setAttribute('aria-label', `강화하기, ${R.fmt(T.haveCoins, m.coins)}`);
  }

  function openMeta(data, { parent = document.body, anchor = null, tab = 'heroes' } = {}) {
    closeMeta(false);
    S.picker?.close?.();
    const target=parent.ownerDocument,view=target.defaultView;
    style(target);
    const tuning = data.family?.tuning || {};
    const root = el('div', 'sv-meta', null, parent);
    root.dataset.test = 'meta';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'sv-meta-title');
    const box = el('div', 'sv-meta-box', null, root);
    const head = el('div', 'sv-meta-head', null, box);
    el('h2', 'sv-meta-title', T.ready, head).id = 'sv-meta-title';
    const have = el('span', 'sv-meta-have', null, head);
    button(head, T.close, 'meta-close', 'sv-btn sv-meta-close').addEventListener('click', () => closeMeta());
    const tabs = el('div', 'sv-meta-tabs', null, box);
    tabs.setAttribute('role', 'tablist');
    tabs.dataset.nav = 'tabs';
    const body = el('div', 'sv-meta-body', null, box);
    body.id = 'sv-meta-body';
    body.setAttribute('role', 'tabpanel');
    cur = { data, tuning, m: read(data.content, tuning), root, box, have, tabs, body, tab, kind: 'people', pick: null, timer: 0, target, view, anchor };
    for (const t of ['heroes', 'shop', 'book']) {
      const b = button(tabs, T[t], `meta-tab-${t}`, 'sv-tab');
      b.id = `sv-tab-${t}`;
      b.dataset.tab = t;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'sv-meta-body');
      b.addEventListener('click', () => { if (cur && cur.tab !== t) { cur.tab = t; sound('button'); render(); } });
    }
    // 창 안 누르기가 첫 화면까지 내려가지 않게 하고, 바깥 어두운 곳을 누르면 닫는다.
    root.addEventListener('pointerdown', e => e.stopPropagation());
    root.addEventListener('click', e => { e.stopPropagation(); if (e.target === root) closeMeta(); });
    view.addEventListener('keydown', onKey, true);
    view.addEventListener('keyup', onKeyUp, true);
    // 첫 화면이 사라지면(판이 열리는 등) 창도 닫는다
    cur.timer = setInterval(() => { if (anchor ? !anchor.isConnected : !target.querySelector('[data-test="meta-open"]')) closeMeta(false); }, 500);
    render();
    tabs.querySelector('[aria-selected="true"]')?.focus();
  }

  function closeMeta(refocus = true) {
    if (!cur) return;
    const c = cur;
    cur = null;
    clearInterval(c.timer);
    c.view.removeEventListener('keydown', onKey, true);
    c.view.removeEventListener('keyup', onKeyUp, true);
    c.root.remove();
    const open = [...c.target.querySelectorAll('[data-test="meta-open"]')];
    for (const b of open) paintOpen(b, c.data);
    if (refocus) (c.anchor?.isConnected ? c.anchor : open[0])?.focus();
  }

  // 바꿀 때마다 판 전체를 다시 그린다. 누르던 단추가 남아 있으면 포커스를 돌려준다.
  function render() {
    const c = cur;
    if (!c) return;
    const a = c.target.activeElement, keep = a && c.box.contains(a) ? a.dataset.test : null;
    c.have.replaceChildren();
    coin(c.have, c.data, c.m.coins, 20);
    for (const b of c.tabs.children) {
      const on = b.dataset.tab === c.tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    c.body.replaceChildren();
    c.body.setAttribute('aria-labelledby', `sv-tab-${c.tab}`);
    (c.tab === 'heroes' ? heroesTab : c.tab === 'shop' ? shopTab : bookTab)(c, c.body);
    if (!keep) return;
    // 누른 단추가 사라지거나 잠기면(고름, 다 올림, 엽전 모자람) 그 카드나 줄로 포커스를 옮긴다
    const find = t => c.box.querySelector(`[data-test="${window.CSS?.escape ? window.CSS.escape(t) : t}"]`);
    const again = find(keep), near = find(keep.replace(/^hero-(?:choose|unlock)-/, 'hero-').replace(/^shop-buy-/, 'shop-'));
    if (again && !again.disabled) again.focus();
    else if (near && near !== again) near.focus();
    else c.tabs.querySelector('[aria-selected="true"]')?.focus();
  }

  function heroesTab(c, body) {
    const content = c.data.content, m = c.m;
    if (eraMode(content)) el('p', 'sv-note sv-hero-rule', T.heroRule, body);
    const grid = el('div', 'sv-heroes', null, body);
    grid.dataset.nav = 'list';
    for (const h of eraMode(content) ? content.heroes.filter(x => x.cell) : content.heroes) {
      const p = content.people.find(x => x.id === h.person), wpn = content.weapons.find(x => x.id === h.weapon);
      const have = m.heroes.includes(h.person), on = m.hero === h.person;
      const card = el('div', `sv-hero${on ? ' sv-on' : ''}${have ? '' : ' sv-locked'}`, null, grid);
      card.dataset.test = `hero-${h.person}`;
      card.tabIndex = -1;
      framed(card, c.data, R.picSlot(content, h.person), 80, 'sv-box sv-hero-face');
      el('b', 'sv-hero-name', p?.name ?? h.person, card);
      if (wpn) {
        const line = el('span', 'sv-hero-weapon', null, card);
        art(line, c.data, R.picSlot(content, wpn.id), null, 32);
        el('span', null, wpn.name, line);
      }
      if (h.perk) el('span', 'sv-hero-perk', R.statText(h.perk.stat, h.perk.add), card);
      const foot = el('div', 'sv-hero-foot', null, card);
      if (on) { el('span', 'sv-tag', T.chosen, foot); continue; }
      if (have) {
        button(foot, T.chooseHero, `hero-choose-${h.person}`).addEventListener('click', () => {
          if (choose(m, h.person)) { write(m); sound('button'); render(); }
        });
        continue;
      }
      el('span', 'sv-tag', T.locked, foot);
      if (h.cell) { el('span', 'sv-note', R.fmt(T.unlockCell, E().packOf(content, h.cell)?.name ?? h.cell), foot); continue; }
      if (h.unlock?.stage) el('span', 'sv-note', R.fmt(T.unlockStage, h.unlock.stage), foot);
      if (h.unlock?.coins) {
        const b = button(foot, null, `hero-unlock-${h.person}`);
        el('span', null, R.fmt(T.unlockCoins, h.unlock.coins), b);
        b.disabled = m.coins < h.unlock.coins;
        if (b.disabled) el('span', 'sv-note', T.needCoins, foot);
        b.addEventListener('click', () => {
          if (unlock(m, h.person, content)) { choose(m, h.person); write(m); sound('stamp'); render(); }
        });
      }
    }
  }

  function shopTab(c, body) {
    const content = c.data.content, m = c.m;
    const list = el('div', 'sv-shop', null, body);
    list.dataset.nav = 'list';
    for (const k of R.SHOP) {
      const n = m.shop[k] || 0, cost = costOf(m, k, c.tuning), max = R.shopMax(k, c.tuning);
      const row = el('div', 'sv-shop-row', null, list);
      row.dataset.test = `shop-${k}`;
      row.tabIndex = -1;
      const shut = !shopOpen(m, k, c.tuning, content);
      if (shut) row.classList.add('sv-locked');
      framed(row, c.data, shopSlot(content, k), 64);
      const text = el('div', 'sv-shop-text', null, row);
      el('b', null, T.shopName?.[k] ?? k, text);
      el('span', null, R.shopText(k, c.tuning), text);
      const pips = el('span', 'sv-pips', null, text);
      pips.setAttribute('aria-label', `${n}/${max}`);
      for (let i = 0; i < max; i++) el('i', i < n ? 'sv-pip sv-on' : 'sv-pip', null, pips);
      const act = el('div', 'sv-shop-act', null, row);
      if (shut) { el('span', 'sv-lock-note', R.fmt(T.shopLocked, rowName(content, c.tuning.shop.row[k])), text); continue; }
      if (cost == null) { el('span', 'sv-tag', T.maxed, act); continue; }
      const b = button(act, null, `shop-buy-${k}`);
      el('span', null, T.buy, b);
      coin(b, c.data, cost);
      b.disabled = m.coins < cost;
      if (b.disabled) el('span', 'sv-note', T.needCoins, act);
      // 빠른 두 번 누름은 다시 그린 같은 자리 새 단추를 눌러 한 단계를 더 산다. 0.3초 안 두 번째는 버린다.
      b.addEventListener('click', () => { if (performance.now() - boughtAt < 300) return; if (buy(m, k, c.tuning, content)) { boughtAt = performance.now(); write(m); sound('stamp'); render(); } });
    }
  }

  function bookTab(c, body) {
    const content = c.data.content, m = c.m;
    const kinds = el('div', 'sv-kinds', null, body);
    kinds.dataset.nav = 'tabs';
    for (const k of KINDS) {
      const all = listOf(content, k), got = all.filter(x => m.seen[k].includes(x.id)).length;
      const b = button(kinds, null, `book-${k}`, 'sv-kind');
      b.setAttribute('aria-pressed', String(c.kind === k));
      el('span', null, T[k], b);
      el('small', null, `${got}/${all.length}`, b);
      b.addEventListener('click', () => { if (c.kind !== k) { c.kind = k; c.pick = null; sound('button'); render(); } });
    }
    const all = listOf(content, c.kind), seen = m.seen[c.kind];
    const wrap = el('div', 'sv-book', null, body);
    const detail = el('div', 'sv-detail', null, wrap);
    detail.dataset.test = 'book-detail';
    const cells = el('div', 'sv-cells', null, wrap);
    cells.dataset.nav = 'cells';
    const pick = all.find(x => x.id === c.pick) || all.find(x => seen.includes(x.id)) || all[0];
    for (const x of all) {
      const known = seen.includes(x.id);
      const b = button(cells, null, `book-cell-${x.id}`, `sv-cell${known ? '' : ' sv-unknown'}${x === pick ? ' sv-on' : ''}`);
      b.setAttribute('aria-label', known ? x.name : T.unknown);
      framed(b, c.data, slotOf(content, c.kind, x, c.data.art), CELL[c.kind]);
      if (!known) el('span', 'sv-book-question', '?', b);
      b.addEventListener('click', () => {
        c.pick = x.id; sound('button'); render();
        if (window.matchMedia?.('(max-width:640px)').matches) cur?.box.querySelector('.sv-detail')?.scrollIntoView({ block: 'nearest' });
      });
    }
    if (pick) describe(c, detail, pick);
  }

  // 도감 자세히 보기. 못 본 것은 그림자와 「아직 몰라요」만.
  function describe(c, box, x) {
    const content = c.data.content, k = c.kind, known = c.m.seen[k].includes(x.id);
    const top = el('div', `sv-detail-top${known ? '' : ' sv-unknown'}`, null, box);
    framed(top, c.data, slotOf(content, k, x, c.data.art), 128);
    el('h3', 'sv-detail-name', known ? x.name : '?', top);
    if (!known) { S.prose.fill(el('p',null,null,box),T.unknown,content); return; }
    const tags = el('div', 'sv-tags', null, box);
    const pair = (a, b) => {
      const row = el('div', 'sv-pair', null, box);
      for (const y of [a, b].filter(Boolean)) {
        if (y !== a) el('span', null, '+', row);
        art(row, c.data, R.picSlot(content, y.id), null, 32);
        el('span', null, y.name, row);
      }
      return row;
    };
    if (k === 'people' && x.facts?.length) {
      const pack = E().packOf(content, x.cell), got = c.m.facts[x.id] || 0;
      if (pack) el('span', 'sv-tag', pack.name, tags);
      if (x.intro) S.prose.fill(el('p', 'sv-story', null, box),x.intro,content,{pack,from:'person:'+x.id});
      const ally = content.allies?.find(a => a.person === x.id);
      if (ally) {
        el('p', null, T.allyDoes[ally.does], box);
        // 동료 각성과 「이 사람만」 효과도 도감에 적는다.
        el('p', 'sv-ally-note', R.fmt(T.awakenNow, T.allyAwaken[ally.does]), box);
        const only = c.tuning?.allyOnly?.[x.id];
        if (only && T.allyOnly[only.kind]) el('p', 'sv-ally-note sv-only-note', R.fmt(T.onlyHead, R.fmt(T.allyOnly[only.kind], ...R.onlyValues(only))), box);
      }
      el('b', 'sv-facts-head', R.fmt(T.facts, got, x.facts.length), box);
      const list = el('ol', 'sv-facts', null, box);
      x.facts.forEach((t, i) => S.prose.fill(el('li',i<got?'':'sv-fact-locked',null,list),i<got?t:T.factLocked,content,{pack}));
      if (!tags.childElementCount) tags.remove();
      return;
    }
    if (k === 'people') {
      const era = content.eras?.find(e => e.id === x.era);
      if (era) el('span', 'sv-tag', era.name, tags);
      const h = content.heroes?.find(y => y.person === x.id), a = content.allies?.find(y => y.person === x.id);
      if (h) {
        el('span', 'sv-tag', T.heroes, tags);
        pair(content.weapons.find(y => y.id === h.weapon));
        if (h.perk) el('p', null, R.statText(h.perk.stat, h.perk.add), box);
      }
      if (a) {
        el('p', null, T.allyDoes?.[a.does] ?? a.does, box);
        el('p', 'sv-ally-note', R.fmt(T.awakenNow, T.allyAwaken[a.does]), box);
        const only = c.tuning?.allyOnly?.[x.id];
        if (only && T.allyOnly[only.kind]) el('p', 'sv-ally-note sv-only-note', R.fmt(T.onlyHead, R.fmt(T.allyOnly[only.kind], ...R.onlyValues(only))), box);
        el('p', 'sv-story', T.allyNote, box);
      }
    } else if (k === 'weapons') {
      for (const line of R.weaponDescription(x)) el('p', null, line, box);
    } else if (k === 'relics') {
      el('p', null, R.statText(x.stat, Array.isArray(x.per) ? x.per[0] : x.per), box);
    } else if (k === 'evolutions') {
      if (R.toughLine(x)) el('p', null, R.toughLine(x), box);
      el('span', 'sv-tag', x.historicity || (x.real ? T.real : T.imagined), tags);
      el('span', 'sv-tag', T.pair, tags);
      pair(content.weapons.find(y => y.id === x.weapon), content.relics.find(y => y.id === x.relic));
      el('p', 'sv-story', T.evoNote, box);
    } else {
      if (isBoss(content, x.id)) el('span', 'sv-tag', T.boss, tags);
      const where = (content.battles || []).filter(b => b.boss === x.id || b.foes?.includes(x.id)).map(b => b.name);
      if (where.length) el('p', null, where.slice(0, 3).join(', '), box);
    }
    if (!tags.childElementCount) tags.remove();
    if (x.story) S.prose.fill(el('p', 'sv-story', null, box),x.story,content,{pack:E().packOf(content,x.cell)});
    for(const p of box.querySelectorAll('p:not(.sv-prose)'))S.prose.fill(p,p.textContent,content,{pack:E().packOf(content,x.cell)});
  }

  // 창이 열린 동안 모든 키를 창이 먼저 받고 첫 화면 처리기까지 내려보내지 않는다.
  // Enter와 Space의 기본 동작(포커스된 단추 누르기)은 그대로 둔다.
  function onKey(e) {
    if (!cur) return;
    e.stopPropagation();
    // Enter·Space를 누르고 있으면 키 반복이 다시 그린 같은 자리 단추를 또 눌러 여러 단계를 산다.
    if ((e.key === 'Enter' || e.key === ' ') && e.repeat) { e.preventDefault(); return; }
    if (e.key === 'Escape') { e.preventDefault(); closeMeta(); return; }
    if (e.key === 'Tab') { trap(e); return; }
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    const nav = step && e.target?.closest?.('[data-nav]');
    if (!nav || !cur.box.contains(nav)) return;
    const items = [...nav.querySelectorAll('button:not([disabled])')], i = items.indexOf(e.target);
    if (i < 0) return;
    e.preventDefault();
    const kind = nav.dataset.nav;
    let n = step;
    if (kind === 'cells' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const top = items[0].offsetTop;
      n = step * Math.max(1, items.filter(b => b.offsetTop === top).length);
    }
    const next = kind === 'tabs' ? items[(i + n + items.length) % items.length] : items[i + n];
    if (!next) return;
    next.focus();
    if (kind === 'tabs') next.click();
  }

  function onKeyUp(e) { if (cur) e.stopPropagation(); }

  // Tab은 창 안에서만 돈다
  function trap(e) {
    e.preventDefault();
    const f = [...cur.box.querySelectorAll('button:not([disabled])')].filter(b => b.tabIndex >= 0 && b.getClientRects().length);
    if (!f.length) return;
    const i = f.indexOf(cur.target.activeElement);
    f[i < 0 ? 0 : (i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
  }

  // 끝 화면: 엽전을 셈해 저장하고(한 판에 한 번), 받은 엽전, 새로 열린 주인공, 처음 만난 것을 결과 요약 안에 덧붙인다.
  function resultGain(w, mode) {
    const sv = w?.sv;
    if (!sv?.begun || w.practice) return null;
    const content = w.content, tuning = w.family?.tuning || {};
    if (!sv.gain) {
      const m = read(content, tuning), g = settle(m, sv, { mode, content, tuning });
      write(m);
      // next·cleared는 진 판 보고의 강화 길잡이가 쓴다(가장 싼 강화 값, 깬 칸 수).
      const next = Math.min(...R.SHOP.filter(k => shopOpen(m, k, tuning, content)).map(k => costOf(m, k, tuning)).filter(c => c != null));
      sv.gain = { ...g, have: m.coins, next, cleared: m.cleared.length };
    }
    return sv.gain;
  }
  function resultExtra(panel, ctx) {
    S.picker?.close?.();
    const w = ctx?.world, sv = w?.sv;
    if (!doc || !panel || !resultGain(w, ctx.mode)) return;
    const content = w.content;
    if (panel.querySelector('[data-test="meta-result"]')) return;
    style();
    panel.classList.add('sv-result-panel');
    const g = sv.gain, src = ctx.data?.art ? ctx.data : w;
    const box = el('div', 'sv-gain-box', null, panel.querySelector('.gf-result-summary') || panel);
    box.dataset.test = 'meta-result';
    const got = el('span', 'sv-gain', null, box);
    art(got, src, 'coin', null, 20);
    el('b', null, R.fmt(T.gotCoins, g.coins), got);
    el('small', null, R.fmt(T.haveCoins, g.have), got);
    if (g.opened.length) {
      const s = el('span', 'sv-gain', null, box);
      el('b', null, T.newHero, s);
      for (const id of g.opened) {
        art(s, src, R.picSlot(content, id), null, 40);
        el('span', null, content.people.find(p => p.id === id)?.name ?? id, s);
      }
    }
    if (g.shops?.length) {
      const s = el('span', 'sv-gain', null, box);
      s.dataset.test = 'meta-new-shop';
      el('b', null, T.newShop, s);
      for (const k of g.shops) { art(s, src, shopSlot(content, k), null, 32); el('span', null, T.shopName?.[k] ?? k, s); }
    }
    if (g.met.length) {
      const s = el('span', 'sv-gain', null, box);
      el('b', null, T.firstMet, s);
      for (const x of g.met.slice(0, 8)) {
        const y = listOf(content, x.kind).find(z => z.id === x.id);
        const img = y && art(s, src, slotOf(content, x.kind, y, src.art), null, 32);
        if (img) { img.title = y.name; img.alt = y.name; }
      }
      if (g.met.length > 8) el('small', null, `+${g.met.length - 8}`, s);
    }
    if (g.learned?.length) {
      const s = el('span', 'sv-gain', null, box);
      el('b', null, T.newFacts, s);
      for (const x of g.learned.slice(0, 5)) el('span', null, `${content.people.find(p => p.id === x.id)?.name ?? x.id} ${x.n}/${FACTS}`, s);
    }
  }

  S.meta = { titleExtra, resultExtra, resultGain, applyStart, read, write, clean, blank, buy, unlock, choose, settle, costOf, shopOpen, shopSlot, open: openMeta, close: closeMeta, heroesFor, runClear };
})();
