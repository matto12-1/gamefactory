(function () {
  'use strict';
  // 버티기 고르기 창(DOM). 레벨업 카드 셋, 문제, 결과를 덮개 하나에서 보여 준다.
  // 엔진이 sv.choice를 바꿀 때마다 show(w, choice, api)를 다시 부르고, 다 끝나면 close()를 부른다.
  // 봇과 시뮬레이션은 창 없이 엔진이 바로 정한다. 창이 열린 동안 판은 멈춰 있다(w.hold).
  // 1 2 3 4(카드와 보기), Enter와 Space(계속), 화살표(옮겨 다니기)는 창이 먼저 받는다(capture). Esc는 껍데기 몫이라 건드리지 않는다.
  // choice 꼴: { type:'level'|'chest'|'scroll', stage:'cards'|'question'|'result', level, cards, card, evo, bonus, coins, q, opts, sel, ok }
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules;
  const doc = typeof document !== 'undefined';
  const ARM_MS = 350, RIGHT_MS = 600, EVO_MS = 1500, WAIT_MS = 1200;
  const prose=(node,text,w,from,keys)=>S.prose.fill(node,text,w.content,{pack:w.sv.cell,from,keys});
  const CSS = `
.sv-pick{position:fixed;inset:0;z-index:22;display:flex;padding:16px;overflow:auto;background:rgba(10,12,24,.93);font-family:DoHyeon,sans-serif;color:#141826;-webkit-tap-highlight-color:transparent;user-select:none}
.sv-pick:has(.sv-story){padding:8px}
.sv-pick,.sv-pick *{word-break:keep-all;overflow-wrap:break-word}
.sv-q,.sv-intro,.sv-note,.sv-hint-box,.sv-does,.sv-ans,.sv-pick-sub{text-wrap:balance}
.sv-pick-box{margin:auto;width:min(900px,100%);display:flex;flex-direction:column;align-items:center;gap:14px;animation:sv-in .18s ease-out}
.sv-pick-title{font-size:clamp(30px,5vw,52px);line-height:1.1;color:#e6b653;-webkit-text-stroke:2px #141826;paint-order:stroke fill;text-shadow:0 4px 0 #141826}
.sv-pick-sub{font-size:clamp(17px,2.2vw,24px);color:#fff7e6}
.sv-cards{display:flex;gap:14px;width:100%;justify-content:center}
.sv-card{position:relative;flex:1 1 0;max-width:260px;min-height:220px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 14px 16px;background:#fff7e6;border:3px solid #141826;border-radius:12px;box-shadow:0 6px 0 #141826;font:inherit;color:inherit;cursor:pointer;transition:transform .08s}
.sv-card:hover,.sv-card:focus-visible{transform:translateY(-4px);outline:3px solid #e6b653;outline-offset:2px}
.sv-card:active{transform:translateY(2px);box-shadow:0 3px 0 #141826}
.sv-key{position:absolute;left:9px;top:6px;font-size:15px;color:#8a7a5a}
.sv-icon{width:64px;height:64px;image-rendering:pixelated;flex:none}
.sv-name{font-size:clamp(20px,2.4vw,26px)}
.sv-badge{font-size:15px;padding:2px 10px;border-radius:999px;background:#141826;color:#fff7e6}
.sv-badge.sv-new{background:#e6b653;color:#141826}
.sv-progress{font-size:17px;letter-spacing:2px;color:#355c82;white-space:nowrap}
.sv-ally-icon{width:24px;height:24px;image-rendering:pixelated;vertical-align:middle;margin-right:4px}
.sv-evo-path{font-size:14px;line-height:1.55;text-align:center;white-space:normal;color:#6f4d1d}
.sv-remaining{font-size:14px;color:#355c82}
.sv-awaken{font-size:14px;line-height:1.45;color:#8a5a00;text-align:center}
.sv-awaken.sv-now{padding:1px 8px;border:2px solid #e6b653;border-radius:6px;background:#fff1c9}
.sv-only{font-size:14px;line-height:1.45;color:#6a3d8a;text-align:center}
.sv-reroll{min-height:44px;padding:0 16px;font:inherit;font-size:18px;color:#fff7e6;background:#3a4a7a;border:2px solid #e6b653;border-radius:10px;cursor:pointer}
.sv-reroll:focus-visible{outline:3px solid #fff7e6}
.sv-does{font-size:clamp(14px,1.5vw,16px);line-height:1.5;text-align:center;white-space:pre;color:#3b3328;max-width:100%}
.sv-icon-wrap{position:relative;display:inline-flex;flex:none}
.sv-crack{position:absolute;inset:0;pointer-events:none}
.sv-crack svg{width:100%;height:100%;filter:drop-shadow(1px 1px 0 #fff7e6)}
.sv-power-note{padding:10px 12px;border:2px solid #b43230;border-radius:8px;background:#fbd9d6;color:#802423;font-size:clamp(17px,2vw,21px);line-height:1.5;text-align:center}
.sv-power-note.sv-restored{border-color:#22633c;background:#d9f5d0;color:#22633c}
.sv-pair{font-size:14px;padding:2px 8px;border:2px solid #e6b653;border-radius:6px;color:#8a5a00;background:#fff1c9}
.sv-panel{width:min(640px,100%);display:flex;flex-direction:column;align-items:center;gap:12px;padding:18px 20px;background:#fff7e6;border:3px solid #141826;border-radius:12px;box-shadow:0 6px 0 #141826}
.sv-panel.sv-good{border-color:#22633c;box-shadow:0 6px 0 #22633c}
.sv-mini{display:flex;align-items:center;gap:10px;font-size:20px}
.sv-mini .sv-icon{width:48px;height:48px}
.sv-evo{display:flex;align-items:center;gap:10px;font-size:28px}
.sv-arrow{width:0;height:0;border-left:14px solid #141826;border-top:10px solid transparent;border-bottom:10px solid transparent}
.sv-evo .sv-goal{filter:brightness(0) opacity(.35)}
.sv-open .sv-evo .sv-goal{filter:none;animation:sv-pop .35s ease-out}
.sv-q{font-size:clamp(21px,2.8vw,30px);line-height:1.45;text-align:center;word-break:keep-all}
.sv-qtag{font-size:clamp(16px,2vw,20px);padding:2px 12px;border-radius:999px;background:#141826;color:#fff7e6}
.sv-l-picture .sv-qpic{box-sizing:content-box;object-fit:contain}
.sv-l-ox .sv-ans,.sv-l-two .sv-ans{flex:1 1 200px;min-height:84px}
.sv-l-ox .sv-ans span:last-child{font-size:clamp(40px,6vw,60px);line-height:1}
.sv-l-ox .sv-ans.sv-o span:last-child{color:#1f5fbf}.sv-l-ox .sv-ans.sv-x span:last-child{color:#c23b2a}
.sv-pick-box.sv-story{width:min(1240px,100%);max-width:1240px}
.sv-story{max-width:1240px}
.sv-story-pic{width:100%;max-width:720px;height:auto;max-height:46vh;object-fit:contain;image-rendering:pixelated;border:3px solid #141826;border-radius:10px;background:#e9dcc0}
.sv-story-text{font-size:clamp(19px,2.1vw,26px);line-height:1.75;text-align:left;word-break:keep-all;overflow-wrap:normal;text-wrap:wrap}
.sv-story-dots{font-size:14px;letter-spacing:4px;color:#8a7a5a}
.sv-story-btns{display:flex;gap:10px;align-items:center}
.sv-story .sv-meet{border-top:0;padding-top:0}
.sv-panel.sv-story{width:100%;box-sizing:border-box;padding:24px;gap:18px}
.sv-story-pic{max-width:none;max-height:58vh;box-sizing:border-box}
@media(min-width:900px){.sv-panel.sv-story:has(.sv-story-pic){display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:20px 26px;align-items:center}.sv-story-pic{grid-row:1/4;width:100%;max-height:64vh}.sv-story-btns{justify-content:flex-start}.sv-story-time{grid-column:1/-1}}
@media(max-width:899px){.sv-panel.sv-story{padding:12px;gap:14px}.sv-story-pic{max-height:38vh}.sv-story-text{font-size:19px;line-height:1.7}}
.sv-story-time{width:100%;height:3px;border:0;appearance:none;background:#d9c8a8}
.sv-story-time::-webkit-progress-bar{background:#d9c8a8}
.sv-story-time::-webkit-progress-value{background:#947038}
.sv-story-time::-moz-progress-bar{background:#947038}
.sv-skip{min-height:44px;padding:0 14px;font:inherit;font-size:18px;color:#3b3328;background:transparent;border:2px solid #8a7a5a;border-radius:10px;cursor:pointer}
.sv-skip:focus-visible{outline:3px solid #e6b653}
.sv-meet{display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:8px;border-top:2px dashed #c9b48a;width:100%}
.sv-meet .sv-face{width:128px;height:128px;image-rendering:pixelated;border:3px solid #141826;border-radius:10px;background:#f3e3c3}
.sv-meet .sv-name{font-size:clamp(26px,3.4vw,34px)}
.sv-hint{align-self:center;font:inherit;font-size:16px;padding:6px 16px;border:2px dashed #8a6d3b;border-radius:999px;background:#fff7e6;color:#5a4320;cursor:pointer}
.sv-hint:hover,.sv-hint:focus-visible{background:#ffe9b8;outline:none}
.sv-hint-note{align-self:center;font-size:13px;color:#7a6a52}
.sv-hint-box{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;padding:10px 14px;border-radius:10px;background:#fff7e6;border:2px solid #e2c48a;font-size:clamp(16px,1.9vw,19px);line-height:1.55;word-break:keep-all;color:#3b3328}
.sv-hint-head{font-size:14px;color:#8a6d3b}
.sv-meet .sv-boss-face{width:auto;height:112px;background:#efe2c6}
.sv-meet .sv-intro{font-size:clamp(17px,2vw,21px);line-height:1.55;text-align:center;word-break:keep-all;color:#3b3328;max-width:520px}
.sv-qpic{width:120px;height:120px;image-rendering:pixelated;border:3px solid #141826;border-radius:8px;background:#e9dcc0;flex:none}
.sv-answers{display:flex;flex-wrap:wrap;gap:10px;width:100%;justify-content:center}
.sv-ans{position:relative;flex:1 1 150px;min-height:56px;padding:10px 14px 10px 30px;font:inherit;font-size:clamp(19px,2.3vw,24px);background:#ffffff;color:#141826;border:3px solid #141826;border-radius:10px;box-shadow:0 4px 0 #141826;cursor:pointer}
.sv-ans .sv-key{top:50%;transform:translateY(-50%)}
.sv-ans:hover:not(:disabled),.sv-ans:focus-visible{outline:3px solid #e6b653;outline-offset:2px}
.sv-ans:disabled{cursor:default}
.sv-ans.sv-right{background:#d9f5d0;border-color:#22633c;color:#22633c}
.sv-ans.sv-wrong{background:#fbd9d6;border-color:#b43230;color:#b43230}
.sv-result{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
.sv-big{font-size:clamp(26px,3.6vw,38px)}
.sv-ok .sv-big{color:#22633c}
.sv-half{font-size:22px;color:#b43230}
.sv-answer{font-size:22px}
.sv-answer .sv-tag{margin-right:8px;padding:1px 8px;border-radius:6px;background:#22633c;color:#ffffff}
.sv-note{font-size:clamp(15px,1.8vw,19px);line-height:1.55;text-align:center;word-break:keep-all;color:#3b3328}
.sv-gain{font-size:19px;color:#8a5a00}
.sv-stamp{display:inline-block;padding:4px 10px;border:3px solid currentColor;border-radius:6px;transform:rotate(-6deg);font-size:18px}
.sv-stamp.sv-real{color:#b43230}
.sv-stamp.sv-imagined{color:#3a62b5}
.sv-cont{min-width:160px;min-height:52px;font:inherit;font-size:22px;color:#141826;background:#e6b653;border:3px solid #141826;border-radius:10px;box-shadow:0 4px 0 #141826;cursor:pointer}
.sv-cont:disabled{opacity:.45;cursor:default}
.sv-cont:focus-visible{outline:3px solid #fff7e6;outline-offset:2px}
@keyframes sv-in{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
@keyframes sv-pop{0%{transform:scale(.6)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
@media (max-width:600px){
  .sv-cards{flex-direction:column;align-items:stretch}
  .sv-card{flex:none;max-width:none;min-height:76px;display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:4px 10px;padding:12px 12px 12px 30px;text-align:left}
  .sv-card .sv-icon,.sv-card .sv-icon-wrap{width:48px;height:48px;grid-row:span 2}
  .sv-card .sv-does{grid-column:1/4;text-align:left;font-size:14px}
  .sv-card .sv-pair{grid-column:2/4;justify-self:start}
  .sv-card .sv-remaining{grid-column:2/4}
  .sv-card .sv-evo-path{grid-column:1/4}
  .sv-card .sv-awaken,.sv-card .sv-only{grid-column:1/4;text-align:left}
  .sv-card .sv-key{top:50%;transform:translateY(-50%)}
  .sv-qpic{width:96px;height:96px}
  .sv-ans{flex-basis:100%}
}
@media (max-height:520px){
  .sv-pick{padding:8px}.sv-pick-box{gap:8px}.sv-pick-title{font-size:28px}
  .sv-card{min-height:0;padding:12px 10px 10px}.sv-card .sv-icon{width:40px;height:40px}
  .sv-panel{padding:10px 14px;gap:8px}.sv-qpic{width:72px;height:72px}.sv-ans{min-height:44px}
}
@media (prefers-reduced-motion:reduce){.sv-pick-box,.sv-open .sv-evo .sv-goal{animation:none}.sv-card{transition:none}}`;

  let layer = null, cur = null, watch = 0, armedAt = 0, rerolledAt = -1e9, autoFrame = 0, readPaused = false, pauseBound = false;
  const timers = [];

  function el(tag, cls, text, parent) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (parent) parent.appendChild(n);
    return n;
  }
  function style() {
    if (document.getElementById('sv-pick-style')) return;
    const s = el('style'); s.id = 'sv-pick-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); cancelAnimationFrame(autoFrame); autoFrame = 0; }
  function sound(slot) { try { window.GFJuice?.sound?.play?.(slot, cur?.w.soundLimits); } catch { /* 소리는 없어도 된다 */ } }

  // 새 사람 그림과 얼굴은 내용 해시가 있는 전장 묶음에서 찾는다. 신라부터의 적·장수·불가사리는 전장 묶음에만 있다.
  function asset(art, slot) {
    return art?.ui?.people?.faces?.[slot] || (/^person-\d+-[ab]$/.test(slot) && art?.ui?.battle?.sprites?.[slot]) || art?.slots?.[R.slotIn(art, slot)]
      || art?.ui?.battle?.sprites?.[slot];
  }
  // 그림 칸 하나를 도트 그대로 키운 <img>로. 해시 붙은 파일은 주소를 그대로, 아니면 판 번호를 붙인다(껍데기와 같은 규칙).
  function pic(parent, w, slot, cls) {
    const s = slot && asset(w.art, slot); if (!s?.file) return null;
    const img = el('img', cls, null, parent);
    img.alt = ''; img.draggable = false; img.decoding = 'async';
    if (s.finedot || s.display || s.grid) img.style.imageRendering = 'pixelated';
    // 걷는 그림이 한 줄로 붙은 전장 그림(장수·불가사리)은 첫 장만 보인다.
    if ((s.frames || 1) > 1 && s.w && s.h) Object.assign(img.style, { aspectRatio: `${s.w} / ${s.h}`, objectFit: 'cover', objectPosition: '0 0' });
    const file=/\.[a-f0-9]{8,64}\.(?:webp|png)$/.test(s.file) ? s.file : window.GFShell?.withV ? window.GFShell.withV(s.file, w.version) : s.file;
    // 바깥 결과 창에 붙일 때도 그림 주소는 게임 폴더를 기준으로 쓴다.
    img.src=parent.ownerDocument&&parent.ownerDocument!==document?new URL(file,window.location.href).href:file;
    if (cls === 'sv-qpic') {
      const scale = Math.max(1, Math.ceil(160 / (s.w || 64)));
      img.style.width = (s.w || 64) * scale + 'px'; img.style.height = (s.h || 64) * scale + 'px';
      img.dataset.test = 'question-picture'; img.dataset.slot = slot;
    }
    return img;
  }
  function cardOptions(w) { return { kit: w.sv.kit, tuning: w.family.tuning, hero: w.sv.heroDef, shop: w.sv.shop, fever: w.sv.fever }; }
  function cardPic(parent, w, id, cracked) {
    const wrap = el('span', 'sv-icon-wrap', null, parent);
    pic(wrap, w, S.evolution.icon(w, id), 'sv-icon');
    if (cracked) {
      crackMark(wrap);
    }
  }
  function crackMark(wrap) {
    const mark = el('span', 'sv-crack', null, wrap); mark.dataset.test = 'card-crack'; mark.setAttribute('aria-label', R.T.half);
    mark.innerHTML = '<svg aria-hidden="true" viewBox="0 0 48 48"><path d="M29 2 18 17 28 23 15 35 20 46" fill="none" stroke="#b43230" stroke-width="4" stroke-linejoin="miter"/></svg>';
  }
  function button(parent, cls, test, fn) {
    const b = el('button', cls, null, parent); b.type = 'button'; b.dataset.test = test;
    b.addEventListener('click', e => { e.preventDefault(); fn(); });
    cur.buttons.push(b); return b;
  }
  function badge(parent, card) {
    if (!['weapon', 'relic', 'ally'].includes(card.kind)) return;
    if (card.kind==='weapon') {
      const p=R.weaponProgress(card.level,cur.w.family.tuning),mark=el('span','sv-progress',p.dots,parent);
      mark.dataset.test='weapon-progress';mark.setAttribute('aria-label',p.left ? `끝 단계까지 ${p.left}번 더 고르기` : '끝 단계');
      el('span','sv-remaining',p.left ? `${p.left}번 더 고르면 끝` : '끝 단계',parent);
      return;
    }
    if (card.kind === 'ally') {
      // 동료도 무기처럼 고른 횟수 점. 다음 고르기가 각성이면 「다음에 각성: …」, 각성 카드면 「각성: …」.
      const x = R.allyLines(cur.w.content, cur.w.family.tuning, card.id, card.level); if (!x) return;
      const does = cur.w.content.allies?.find(a => a.person === card.id)?.does, ic = does && S.allies?.icon(cur.w, does);
      if (ic) { const im = pic(parent, cur.w, ic, 'sv-ally-icon'); if (im) im.dataset.test = 'ally-icon'; }
      const mark = el('span', 'sv-progress', x.progress.dots, parent); mark.dataset.test = 'ally-progress';
      mark.setAttribute('aria-label', x.progress.awake ? R.T.awakenBadge : R.fmt(R.T.awakenLeft, x.progress.left));
      if (card.isNew) el('span', 'sv-badge sv-new', R.T.isNew, parent);
      else if (x.progress.awake) el('span', 'sv-badge sv-new', R.T.awakenBadge, parent);
      return;
    }
    el('span', 'sv-badge' + (card.isNew ? ' sv-new' : ''), card.isNew ? R.T.isNew : R.fmt(R.T.step, card.level), parent);
  }
  // 동료 카드 아래 두 줄: 각성 안내와 「이 사람만」.
  function allyNotes(parent, w, card) {
    const x = R.allyLines(w.content, w.family.tuning, card.id, card.level); if (!x) return;
    const a = el('span', 'sv-awaken' + (x.progress.awake ? ' sv-now' : ''), x.awaken, parent); a.dataset.test = 'ally-awaken';
    if (x.only) { const o = el('span', 'sv-only', x.only, parent); o.dataset.test = 'ally-only'; }
  }
  function title(c) { return c.type === 'story' ? c.title : c.type === 'chest' ? R.T.chest : c.type === 'scroll' ? R.T.scroll : c.type === 'boss' ? R.T.bossQ : R.fmt(R.T.levelUp, c.level); }
  // 문제 모양(엔진 questionView의 layout): ox 큰 두 단추 · two 두 사건(먼저 일어난 일) · picture 큰 그림과 보기 · three 보통
  const SHOW = { O: '○', X: '×' };
  // 이야기 장면: 그림 한 장과 글, 「다음」「건너뛰기」. 끝 장(적장을 물리친 뒤)은 「계속」 하나.
  function storyPage(box, c, w) {
    const T = R.T, n = c.pages.length, i = Math.min(cur.page || 0, n - 1), p = c.pages[i], last = i === n - 1;
    const panel = el('div', 'sv-panel sv-story' + (c.auto > 0 ? ' sv-act' : ''), null, box);
    if (p.face) meetCard(panel, p.face, w, R.T.heroTeach);
    const illustration = p.pic ? pic(panel, w, p.pic, 'sv-story-pic') : null;
    if (p.text) prose(el('div', 'sv-story-text', null, panel),p.text,w,p.from||c.from);
    if (p.from && p.text) w.sv.told?.add(p.from);
    if (n > 1) el('div', 'sv-story-dots', Array.from({ length: n }, (_, k) => k === i ? '●' : '○').join(' '), panel);
    const row = el('div', 'sv-story-btns', null, panel);
    const go = button(row, 'sv-cont', 'story-next', () => { if (last) act('cont'); else { cur.page = i + 1; render(); } });
    go.textContent = c.ending ? T.cont : last ? T.storyGo : T.storyNext;
    if (!last) button(row, 'sv-skip', 'story-skip', () => act('cont')).textContent = T.storySkip;
    if (c.auto > 0 && n === 1 && !c.ending) {
      const me = cur, bar = el('progress', 'sv-story-time', null, panel);
      bar.max = c.auto; bar.value = c.auto; bar.dataset.test = 'story-time'; bar.setAttribute('aria-label', '남은 읽기 시간');
      const startClock = () => {
      if (cur !== me) return;
      const readable = () => !readPaused && !document.hidden && !w.modeSession?.state.paused;
      let previous = performance.now(), active = readable(), left = c.auto;
      const update = () => {
        if (cur !== me) return;
        const now = performance.now(), live = readable();
        if (active && live) left = Math.max(0, left - (now - previous));
        previous = now; active = live; bar.value = left;
        if (left <= 0) act('cont');
      };
      me.readClock = update;
      const tick = () => {
        update();
        if (cur !== me) return;
        if (bar.value > 0) autoFrame = requestAnimationFrame(tick);
      };
      autoFrame = requestAnimationFrame(tick);
      };
      // 그림을 못 받아도(느린 망) 글은 제 시간에 넘어간다.
      if (illustration && !illustration.complete) { illustration.addEventListener('load', startClock, { once: true }); illustration.addEventListener('error', startClock, { once: true }); }
      else startClock();
      panel.addEventListener('click', e => { if (!e.target.closest('button') && cur === me) act('cont'); });
    }
    go.focus({ preventScroll: true });
  }
  // 처음 만난 동료 소개: 문제 결과 칸 안에 얼굴·이름·소개 두세 줄
  function meetCard(parent, id, w, badgeText = R.T.meet, cracked = false) {
    const p = w.content.people.find(x => x.id === id) || {};
    const box = el('div', 'sv-meet', null, parent);
    el('span', 'sv-badge sv-new', badgeText, box);
    const portrait = el('span', 'sv-icon-wrap', null, box);
    pic(portrait, w, R.picSlot(w.content, id), 'sv-face');
    if (cracked) crackMark(portrait);
    el('div', 'sv-name', p.name || '', box);
    prose(el('div', 'sv-intro', null, box),p.intro||'',w,'person:'+id);
  }

  // 물리친 장수: 그림·이름·이야기(그 이야기에서 문제가 나온다)
  function bossCard(parent, def, w) {
    const box = el('div', 'sv-meet sv-boss-teach', null, parent);
    el('span', 'sv-badge', R.T.bossTeach, box);
    pic(box, w, 'boss-' + def.sprite, 'sv-face sv-boss-face');
    el('div', 'sv-name', def.name || '', box);
    if (def.story) prose(el('div', 'sv-intro', null, box),def.story,w,'boss:'+def.id);
  }
  function cardFace(b, w, card, i) {
    el('span', 'sv-key', i + 1, b);
    const key = { weapon: 'weapons', relic: 'relics', ally: 'allies' }[card.kind];
    cardPic(b, w, card.id, key && w.sv.kit[key].some(o => o.id === card.id && o.cracks));
    el('span', 'sv-name', R.cardName(w.content, card), b);
    badge(b, card);
    const does = R.cardText(w.content, card, cardOptions(w)); if (does) el('span', 'sv-does', does, b);
    if (card.kind === 'ally') allyNotes(b, w, card);
    if(card.kind==='weapon') {
      const e=R.evolutionPath(w.content,card.id,{allow:w.sv.allow,kit:w.sv.kit,relicsMax:w.family.tuning.level.relicsMax}),name=w.content.relics.find(r=>r.id===e?.relic)?.name;
      if(name)el('span','sv-evo-path',`진화: ${name} 유물이 있으면 끝 단계에서 상자로`,b);
    }
    if (R.evoHint(w.content, w.sv.kit, card)) el('span', 'sv-pair', R.T.pair, b);
  }
  // 문제 위에 무엇을 걸고 푸는지 보여 준다: 고른 카드, 진화 짝, 상자 덤.
  function stake(panel, c, w) {
    if (c.evo) {
      const row = el('div', 'sv-evo', null, panel);
      pic(row, w, R.picSlot(w.content, c.evo.weapon), 'sv-icon'); el('span', '', '+', row);
      pic(row, w, R.picSlot(w.content, c.evo.relic), 'sv-icon'); el('span', 'sv-arrow', null, row);
      pic(row, w, S.evolution.icon(w, c.evo.id), 'sv-icon sv-goal');
      el('div', 'sv-does', R.cardText(w.content, { kind: 'evolution', id: c.evo.id, level: 1 }, cardOptions(w)), panel);
      el('div', 'sv-pair', R.T.pair, panel);
      prose(el('div', 'sv-note', null, panel),R.T.evoNote,w);
      return;
    }
    if (c.card) {
      const row = el('div', 'sv-mini', null, panel);
      cardPic(row, w, c.card.id, c.stage === 'result' && c.ok === false);
      el('span', '', R.cardName(w.content, c.card), row); badge(row, c.card);
      if (c.card.kind === 'ally') prose(el('div', 'sv-note', null, panel),R.T.allyNote,w);
      return;
    }
    if (c.type === 'chest' || c.chest) {
      const row = el('div', 'sv-mini', null, panel);
      pic(row, w, 'chest', 'sv-icon');
      if (c.bonus) el('span', 'sv-gain', R.fmt(R.T.chestBonus, c.bonus), row);
      return;
    }
    if (c.type === 'scroll') pic(el('div', 'sv-mini', null, panel), w, 'scroll', 'sv-icon');
  }

  function render() {
    const T = R.T, c = cur.choice, w = cur.w;
    clearTimers(); cur.buttons.length = 0;
    layer.replaceChildren();
    const box = el('div', 'sv-pick-box sv-' + c.type, null, layer);
    el('div', 'sv-pick-title', title(c), box);
    if (c.type === 'story') { storyPage(box, c, w); return; }
    if (c.stage === 'cards') {
      el('div', 'sv-pick-sub', T.pick, box);
      const row = el('div', 'sv-cards', null, box);
      c.cards.forEach((card, i) => cardFace(button(row, 'sv-card', 'pick-' + i, () => act('pick', i)), w, card, i));
      // 선덕 여왕: 카드 다시 뽑기(남은 번수).
      if (c.rerolls > 0) { const rb = button(box, 'sv-reroll', 'reroll', () => act('reroll')); rb.textContent = R.fmt(T.reroll, c.rerolls); }
      armedAt = performance.now() + (S.feedback?.config(w).cardLockMs ?? 400); sound('card');
      focus(0); return;
    }
    const layout = c.layout || 'three', panel = el('div', 'sv-panel sv-l-' + layout, null, box);
    // 알려 주고 묻기: 처음 만난 동료·물리친 장수의 소개를 문제 위에 먼저. 아니면 「단서 보기」.
    if (c.meet) meetCard(panel, c.meet, w, T.meet, c.stage === 'result' && c.ok === false);
    else if (c.type === 'boss' && c.boss) bossCard(panel, c.boss, w);
    else stake(panel, c, w);
    if (c.hint && c.src) { const h = el('div', 'sv-hint-box', null, panel); el('b', 'sv-hint-head', T.hintHead, h); prose(el('span', '', null, h),c.src,w,c.q.from); }
    if (layout === 'ox') el('span', 'sv-qtag', T.oxQ, panel);
    if (layout === 'two') el('span', 'sv-qtag', T.orderQ, panel);
    if (c.q.pic) pic(panel, w, R.questionPic(w.content, w.art, c.q), 'sv-qpic');
    el('div', 'sv-q', c.q.q, panel);
    const row = el('div', 'sv-answers', null, panel), done = c.stage === 'result';
    c.opts.forEach((o, i) => {
      const b = button(row, 'sv-ans' + (layout === 'ox' ? ' sv-' + o.toLowerCase() : ''), 'answer-' + i, () => act('answer', i));
      el('span', 'sv-key', i + 1, b); el('span', '', layout === 'ox' ? SHOW[o] || o : o, b);
      if (layout === 'ox') b.setAttribute('aria-label', o === 'O' ? T.oxO : T.oxX);
      if (done) { b.disabled = true; if (o === c.q.a) b.classList.add('sv-right'); else if (i === c.sel) b.classList.add('sv-wrong'); }
    });
    if (!done) {
      if (c.src && !c.hint && !c.meet && c.type !== 'boss') { const hb = button(panel, 'sv-hint', 'hint', () => act('hint')); hb.textContent = T.hint; el('div', 'sv-hint-note', T.hintNote, panel); }
      armedAt = performance.now() + ARM_MS; focus(0); return;
    }

    const res = el('div', 'sv-result ' + (c.ok ? 'sv-ok' : 'sv-no'), null, panel);
    if (c.ok) {
      panel.classList.add('sv-good');
      if (c.evo) {
        panel.classList.add('sv-open');
        el('div', 'sv-big', T.evo, res);
        const line = el('div', 'sv-mini', null, res);
        el('span', '', c.evo.name, line);
        el('span', 'sv-stamp ' + (c.evo.real ? 'sv-real' : 'sv-imagined'), c.evo.historicity || (c.evo.real ? T.real : T.imagined), line);
      } else if (c.type === 'chest' || c.chest) el('div', 'sv-big', R.fmt(T.chestBonus, c.bonus), res);
      else if (c.type === 'boss') el('div', 'sv-big', T.bossGain, res);
      else el('div', 'sv-big', c.restored ? R.fmt(T.restored, c.restored) : T.full, res);
      if (c.hint) el('div', 'sv-power-note sv-restored', c.card ? T.hintGain : T.hintResult, res);
      if (c.coins) el('div', 'sv-gain', R.fmt(T.coins, c.coins), res);
      sound('stamp');
    } else {
      const ans = el('div', 'sv-answer', null, res);
      el('span', 'sv-tag', T.answer, ans); el('span', '', c.layout === 'ox' ? SHOW[c.q.a] || c.q.a : c.q.a, ans);
      if (c.q.note) prose(el('div', 'sv-note', null, res),c.q.note,w,c.q.from,[c.q.a]);
      if (c.type === 'level' || c.card) el('div', 'sv-power-note', T.halfNote, res);
      if (c.type === 'boss') {
        // 장수 이야기에서 낸 문제는 about이 장수 id나 사건이라, 사람이 아니면 지금 물리친 장수 이름으로.
        const who = w.content.people.find(p => p.id === c.q.about)?.name || w.content.bosses?.find(b => b.id === c.q.about)?.name || c.boss?.name || '';
        prose(el('div', 'sv-note', null, res),R.fmt(T.bossMiss, who),w);
      }
      if (c.coins) el('div', 'sv-gain', R.fmt(T.coins, c.coins), res);
      sound('button');
    }
    const go = button(res, 'sv-cont', 'pick-continue', () => act('cont'));
    go.textContent = c.ok ? T.cont : T.confirm; cur.cont = go;
    if (c.ok && !c.hint && !c.restored) later(() => act('cont'), c.evo ? EVO_MS : RIGHT_MS);
    else { go.disabled = true; later(() => { go.disabled = false; if (cur?.cont === go) go.focus({ preventScroll: true }); }, WAIT_MS); }
    if (!go.disabled) go.focus({ preventScroll: true });
  }

  function focus(i) { const b = cur?.buttons.filter(n => !n.disabled)[i]; b?.focus({ preventScroll: true }); }
  function act(kind, i) {
    if (!cur || cur.busy) return;
    const c = cur.choice, me = cur;
    if (kind === 'pick' && (c.stage !== 'cards' || i >= c.cards.length)) return;
    if (kind === 'answer' && (c.stage !== 'question' || i >= c.opts.length)) return;
    if (kind === 'hint' && (c.stage !== 'question' || c.hint)) return;
    if (kind === 'reroll' && (c.stage !== 'cards' || !(c.rerolls > 0))) return;
    if (kind === 'cont' && (c.stage !== 'result' || cur.cont?.disabled)) return;
    // 잘못 누름 막기 잠금은 답·카드에만(단서 보기는 바로 열린다)
    if (kind !== 'cont' && kind !== 'hint' && kind !== 'reroll' && performance.now() < armedAt) return;
    // 다시 뽑기는 처음엔 바로 되지만, 다시 뽑은 뒤 같은 자리에 새로 생긴 단추를 두 번째 누름으로 또 쓰지 않게 잠깐 막는다.
    if (kind === 'reroll') { if (performance.now() - rerolledAt < 400) return; rerolledAt = performance.now(); }
    me.busy = true;
    if (kind === 'pick') sound('button');
    try { kind === 'pick' ? me.api.pick(i) : kind === 'answer' ? me.api.answer(i) : kind === 'hint' ? me.api.hint() : kind === 'reroll' ? me.api.reroll?.() : me.api.cont(); }
    finally { if (cur === me) me.busy = false; }
  }
  function stop(e) { e.preventDefault(); e.stopPropagation(); }
  function onKey(e) {
    if (!cur || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const code = e.code, d = /^(?:Digit|Numpad)([1-4])$/.exec(code), stage = cur.choice.stage;
    if (d && cur.choice.type === 'story') { stop(e); return; }
    if (d) { stop(e); if (!e.repeat) act(stage === 'cards' ? 'pick' : 'answer', Number(d[1]) - 1); return; }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      stop(e); if (e.repeat) return;
      if (cur.choice.type === 'story' && cur.choice.auto > 0) { act('cont'); return; }
      if (stage === 'result' && cur.choice.type !== 'story') { act('cont'); return; }
      const b = document.activeElement; if (b && cur.buttons.includes(b) && !b.disabled) b.click();
      return;
    }
    if (/^Arrow(Left|Right|Up|Down)$/.test(code)) {
      stop(e);
      const live = cur.buttons.filter(n => !n.disabled); if (!live.length) return;
      const at = live.indexOf(document.activeElement), step = /Left|Up/.test(code) ? -1 : 1;
      live[at < 0 ? 0 : (at + step + live.length) % live.length].focus({ preventScroll: true });
    }
  }
  // Space는 손을 뗄 때 단추를 누르므로 그것도 막는다(누르기는 keydown에서 이미 했다).
  function onKeyUp(e) { if (cur && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) e.preventDefault(); }
  // 판이 끝났거나 첫 화면으로 돌아갔는데 창이 남아 있으면 닫는다.
  function check() {
    if (!cur) return;
    const canvas = document.querySelector('.gf-canvas');
    if (!canvas?.isConnected || document.querySelector('[data-test="title-screen"]') || cur.w.sv?.choice !== cur.choice) close();
  }

  function show(w, choice, api) {
    if (!doc || !choice) return;
    if (!pauseBound && window.GF?.on) {
      pauseBound = true;
      window.GF.on('pause', () => { readPaused = true; cur?.readClock?.(); });
      window.GF.on('resume', () => { readPaused = false; cur?.readClock?.(); });
      document.addEventListener?.('visibilitychange', () => cur?.readClock?.());
    }
    if (cur && cur.choice === choice && cur.stage === choice.stage && cur.hint === !!choice.hint) return;
    style();
    if (!layer) {
      layer = el('div', 'sv-pick'); layer.dataset.test = 'picker';
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
      document.body.appendChild(layer);
      window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);
      watch = setInterval(check, 500);
    }
    clearTimers();
    cur = { w, choice, api, stage: choice.stage, hint: !!choice.hint, buttons: [], cont: null, busy: false };
    render();
  }
  function close() {
    if (!doc) return;
    clearTimers(); clearInterval(watch); watch = 0;
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
    layer?.remove(); layer = null; cur = null;
  }

  S.picker = { show, close, open: () => !!cur, pic, asset };
})();
