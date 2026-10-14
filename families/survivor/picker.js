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
  const CSS = `
.sv-pick{position:fixed;inset:0;z-index:22;display:flex;padding:16px;overflow:auto;background:rgba(10,12,24,.72);font-family:DoHyeon,sans-serif;color:#141826;-webkit-tap-highlight-color:transparent;user-select:none}
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
.sv-does{font-size:clamp(15px,1.7vw,18px);line-height:1.4;text-align:center;word-break:keep-all;color:#3b3328}
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
  .sv-card .sv-icon{width:48px;height:48px;grid-row:span 2}
  .sv-card .sv-does{grid-column:2/4;text-align:left}
  .sv-card .sv-pair{grid-column:2/4;justify-self:start}
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

  let layer = null, cur = null, watch = 0, armedAt = 0;
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
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }
  function sound(slot) { try { window.GFJuice?.sound?.play?.(slot); } catch { /* 소리는 없어도 된다 */ } }

  // 그림 칸 하나를 도트 그대로 키운 <img>로. 해시 붙은 파일은 주소를 그대로, 아니면 판 번호를 붙인다(껍데기와 같은 규칙).
  function pic(parent, w, slot, cls) {
    const s = slot && w.art?.slots?.[slot]; if (!s?.file) return null;
    const img = el('img', cls, null, parent);
    img.alt = ''; img.draggable = false; img.decoding = 'async';
    img.src = /\.[a-f0-9]{8,64}\.(?:webp|png)$/.test(s.file) ? s.file : window.GFShell?.withV ? window.GFShell.withV(s.file, w.version) : s.file;
    return img;
  }
  function button(parent, cls, test, fn) {
    const b = el('button', cls, null, parent); b.type = 'button'; b.dataset.test = test;
    b.addEventListener('click', e => { e.preventDefault(); fn(); });
    cur.buttons.push(b); return b;
  }
  function badge(parent, card) {
    if (!['weapon', 'relic', 'ally'].includes(card.kind)) return;
    el('span', 'sv-badge' + (card.isNew ? ' sv-new' : ''), card.isNew ? R.T.isNew : R.fmt(R.T.step, card.level), parent);
  }
  function title(c) { return c.type === 'chest' ? R.T.chest : c.type === 'scroll' ? R.T.scroll : R.fmt(R.T.levelUp, c.level); }

  function cardFace(b, w, card, i) {
    el('span', 'sv-key', i + 1, b);
    pic(b, w, R.picSlot(w.content, card.id), 'sv-icon');
    el('span', 'sv-name', R.cardName(w.content, card), b);
    badge(b, card);
    const does = R.cardText(w.content, card); if (does) el('span', 'sv-does', does, b);
    if (R.evoHint(w.content, w.sv.kit, card)) el('span', 'sv-pair', R.T.pair, b);
  }
  // 문제 위에 무엇을 걸고 푸는지 보여 준다: 고른 카드, 진화 짝, 상자 덤.
  function stake(panel, c, w) {
    if (c.evo) {
      const row = el('div', 'sv-evo', null, panel);
      pic(row, w, R.picSlot(w.content, c.evo.weapon), 'sv-icon'); el('span', '', '+', row);
      pic(row, w, R.picSlot(w.content, c.evo.relic), 'sv-icon'); el('span', 'sv-arrow', null, row);
      pic(row, w, R.picSlot(w.content, c.evo.id), 'sv-icon sv-goal');
      el('div', 'sv-pair', R.T.pair, panel);
      el('div', 'sv-note', R.T.evoNote, panel);
      return;
    }
    if (c.card) {
      const row = el('div', 'sv-mini', null, panel);
      pic(row, w, R.picSlot(w.content, c.card.id), 'sv-icon');
      el('span', '', R.cardName(w.content, c.card), row); badge(row, c.card);
      if (c.card.kind === 'ally') el('div', 'sv-note', R.T.allyNote, panel);
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
    layer.replaceChildren();
    const box = el('div', 'sv-pick-box sv-' + c.type, null, layer);
    el('div', 'sv-pick-title', title(c), box);
    if (c.stage === 'cards') {
      el('div', 'sv-pick-sub', T.pick, box);
      const row = el('div', 'sv-cards', null, box);
      c.cards.forEach((card, i) => cardFace(button(row, 'sv-card', 'pick-' + i, () => act('pick', i)), w, card, i));
      armedAt = performance.now() + ARM_MS; sound('card');
      focus(0); return;
    }
    const panel = el('div', 'sv-panel', null, box);
    stake(panel, c, w);
    el('div', 'sv-q', c.q.q, panel);
    if (c.q.pic) pic(panel, w, R.picSlot(w.content, c.q.pic), 'sv-qpic');
    const row = el('div', 'sv-answers', null, panel), done = c.stage === 'result';
    c.opts.forEach((o, i) => {
      const b = button(row, 'sv-ans', 'answer-' + i, () => act('answer', i));
      el('span', 'sv-key', i + 1, b); el('span', '', o, b);
      if (done) { b.disabled = true; if (o === c.q.a) b.classList.add('sv-right'); else if (i === c.sel) b.classList.add('sv-wrong'); }
    });
    if (!done) { armedAt = performance.now() + ARM_MS; focus(0); return; }

    const res = el('div', 'sv-result ' + (c.ok ? 'sv-ok' : 'sv-no'), null, panel);
    if (c.ok) {
      panel.classList.add('sv-good');
      if (c.evo) {
        panel.classList.add('sv-open');
        el('div', 'sv-big', T.evo, res);
        const line = el('div', 'sv-mini', null, res);
        el('span', '', c.evo.name, line);
        el('span', 'sv-stamp ' + (c.evo.real ? 'sv-real' : 'sv-imagined'), c.evo.real ? T.real : T.imagined, line);
      } else if (c.type === 'chest' || c.chest) el('div', 'sv-big', R.fmt(T.chestBonus, c.bonus), res);
      else el('div', 'sv-big', T.full, res);
      if (c.coins) el('div', 'sv-gain', R.fmt(T.coins, c.coins), res);
      sound('stamp');
    } else {
      const ans = el('div', 'sv-answer', null, res);
      el('span', 'sv-tag', T.answer, ans); el('span', '', c.q.a, ans);
      if (c.q.note) el('div', 'sv-note', c.q.note, res);
      if (c.type === 'level' || c.card) el('div', 'sv-half', T.half, res);
      if (c.coins) el('div', 'sv-gain', R.fmt(T.coins, c.coins), res);
      sound('button');
    }
    const go = button(res, 'sv-cont', 'pick-continue', () => act('cont'));
    go.textContent = T.cont; cur.cont = go;
    if (c.ok) later(() => act('cont'), c.evo ? EVO_MS : RIGHT_MS);
    else { go.disabled = true; later(() => { go.disabled = false; if (cur?.cont === go) go.focus({ preventScroll: true }); }, WAIT_MS); }
    if (!go.disabled) go.focus({ preventScroll: true });
  }

  function focus(i) { const b = cur?.buttons.filter(n => !n.disabled)[i]; b?.focus({ preventScroll: true }); }
  function act(kind, i) {
    if (!cur || cur.busy) return;
    const c = cur.choice, me = cur;
    if (kind === 'pick' && (c.stage !== 'cards' || i >= c.cards.length)) return;
    if (kind === 'answer' && (c.stage !== 'question' || i >= c.opts.length)) return;
    if (kind === 'cont' && (c.stage !== 'result' || cur.cont?.disabled)) return;
    if (kind !== 'cont' && performance.now() < armedAt) return;
    me.busy = true;
    if (kind === 'pick') sound('button');
    try { kind === 'pick' ? me.api.pick(i) : kind === 'answer' ? me.api.answer(i) : me.api.cont(); }
    finally { if (cur === me) me.busy = false; }
  }
  function stop(e) { e.preventDefault(); e.stopPropagation(); }
  function onKey(e) {
    if (!cur || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const code = e.code, d = /^(?:Digit|Numpad)([1-4])$/.exec(code), stage = cur.choice.stage;
    if (d) { stop(e); if (!e.repeat) act(stage === 'cards' ? 'pick' : 'answer', Number(d[1]) - 1); return; }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      stop(e); if (e.repeat) return;
      if (stage === 'result') { act('cont'); return; }
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
    if (cur && cur.choice === choice && cur.stage === choice.stage) return;
    style();
    if (!layer) {
      layer = el('div', 'sv-pick'); layer.dataset.test = 'picker';
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
      document.body.appendChild(layer);
      window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);
      watch = setInterval(check, 500);
    }
    clearTimers();
    cur = { w, choice, api, stage: choice.stage, buttons: [], cont: null, busy: false };
    render();
  }
  function close() {
    if (!doc) return;
    clearTimers(); clearInterval(watch); watch = 0;
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
    layer?.remove(); layer = null; cur = null;
  }

  S.picker = { show, close, open: () => !!cur, pic };
})();
