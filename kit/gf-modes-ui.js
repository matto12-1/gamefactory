(function () {
 'use strict';
 if (window.GFModesUI) return;
 const el = (...args) => window.GFUI.node(...args);
 const starSVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 63 34 93 38 71 59 77 91 50 76 23 91 29 59 7 38 37 34Z"/><path class="shine" d="M49 19 40 39 23 42"/></svg>';
 function icon(parent, art, n, base = location.href) { const img = el('img', 'gf-mode-icon', undefined, parent); img.src = new URL(art.ui.icons[n].file, base).href; img.alt = ''; return img; }
 function stars(parent, n, cls = '') { const row = el('div', `gf-stage-stars ${cls}`, undefined, parent); row.setAttribute('role', 'img'); row.setAttribute('aria-label', `별 ${n} / 3`); for (let i = 0; i < 3; i++) { const s = el('span', i < n ? 'filled' : '', undefined, row); s.innerHTML = starSVG; } return row; }
 function cards(parent, { art, config, store, grade, selected, choose }) {
  const row = el('div', 'gf-mode-cards', undefined, parent); row.setAttribute('role', 'group'); row.setAttribute('aria-label', '모드 고르기');
  const descriptions = describe(config);
  Object.entries(window.GFModes.names).forEach(([play, name], i) => {
   const b = el('button', `gf-button gf-mode-card gf-mode-${play}`, undefined, row); b.dataset.test = i ? `mode-${play}` : 'start'; b.dataset.play = play; b.setAttribute('aria-pressed', String(selected === play));
   icon(b, art, i); const text = el('div', 'gf-mode-copy', undefined, b); el('h4', '', name, text); el('p', '', descriptions[i], text); el('small', '', play === 'stage' ? `★ ${store.total(grade)} / 30` : `내 최고 ${store.best(grade, play).toLocaleString('ko-KR')}점`, text);
   b.onclick = () => choose(play, b);
  }); return row;
 }
 function describe(config) {
  const seconds = config.quick.startSec, time = seconds % 60 === 0 ? `${seconds / 60}분` : `${seconds}초`;
  const hearts = ['', '하나가', '둘이', '셋이'][config.endless.hearts] || `${config.endless.hearts}개가`;
  return [`${time}, 맞히면 시간이 늘어요`, `하트 ${hearts} 다 떨어질 때까지`, `${config.stage.stages.length}단계, 별을 모아요`];
 }
 const line = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
 const glyphs = {
  users: '<circle fill="currentColor" cx="8.6" cy="8.2" r="3.4"/><circle fill="currentColor" cx="16.6" cy="9" r="2.9"/><path fill="currentColor" d="M2.6 19.4c.4-3.8 2.9-6 6-6s5.6 2.2 6 6c0 .5-.4.9-.9.9H3.5c-.5 0-.9-.4-.9-.9z"/><path fill="currentColor" d="M15.6 13.6c.3-.1.7-.1 1-.1 2.8 0 4.6 2 4.9 5.2 0 .5-.4.9-.9.9h-3.8c.1-2.4-.4-4.4-1.2-6z"/>',
  check: `<path ${line} stroke-width="3.2" d="M5 12.8l4.4 4.4L19.2 7.4"/>`,
  star: '<path fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M12 2.9l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1.1-6-4.4-4.2 6-.9z"/>',
  trophy: `<path fill="currentColor" d="M7 3.6h10v5.2a5 5 0 0 1-10 0z"/><path ${line} stroke-width="2.2" d="M7 5.6H4.4A2.6 2.6 0 0 0 7.3 9.8M17 5.6h2.6a2.6 2.6 0 0 1-2.9 4.2"/><path fill="currentColor" d="M10.4 13.4h3.2l.6 3.6h-4.4z"/><rect fill="currentColor" x="7.4" y="16.8" width="9.2" height="3.6" rx="1.2"/>`,
  play: '<path fill="currentColor" d="M7.2 5.3c0-1.2 1.3-1.9 2.3-1.3l10 6.6c.9.6.9 2 0 2.6l-10 6.6c-1 .7-2.3 0-2.3-1.2z"/>',
  left: `<path ${line} stroke-width="3.2" d="M14.8 5.2L8 12l6.8 6.8"/>`,
  right: `<path ${line} stroke-width="3.2" d="M9.2 5.2L16 12l-6.8 6.8"/>`
 };
 function glyph(name) { return `<svg class="gf-glyph" viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>`; }
 function deck(parent, { art, config, store, grade, selected = 'quick', choose, onSelect, base = location.href }) {
  const plays = Object.keys(window.GFModes.names), names = Object.values(window.GFModes.names), descriptions = describe(config), shots = ['start', 'result', 'map'];
  const wrap = el('div', 'gf-deck', undefined, parent), row = el('div', 'gf-deck-row', undefined, wrap); row.setAttribute('role', 'group'); row.setAttribute('aria-label', '놀이 고르기');
  const arrow = (side, label) => { const b = el('button', `gf-button gf-deck-arrow gf-deck-arrow-${side}`, undefined, row); b.type = 'button'; b.dataset.test = side === 'l' ? 'deck-prev' : 'deck-next'; b.setAttribute('aria-label', label); b.innerHTML = glyph(side === 'l' ? 'left' : 'right'); return b; };
  const prev = arrow('l', '앞 놀이'), next = arrow('r', '다음 놀이');
  const cards = plays.map((play, i) => {
   const b = el('button', `gf-deck-card gf-deck-${play}`, undefined, row); b.type = 'button'; b.dataset.test = i ? `mode-${play}` : 'start'; b.dataset.play = play;
   const pic = el('span', 'gf-deck-pic', undefined, b), shot = art.ui[shots[i]]?.landscape?.file; if (shot) b.dataset.pic = new URL(shot, base).href;
   const badge = el('span', 'gf-deck-badge', undefined, b), img = el('img', '', undefined, badge); img.src = new URL(art.ui.icons[i].file, base).href; img.alt = '';
   const body = el('span', 'gf-deck-body', undefined, b); el('span', 'gf-deck-name', names[i], body); el('span', 'gf-deck-desc', descriptions[i], body);
   const act = el('span', 'gf-deck-act', undefined, body); el('span', 'gf-deck-rec', undefined, act);
   const go = el('span', 'gf-deck-go', undefined, act); go.innerHTML = `${glyph('play')}<span>시작</span><span class="gf-kbd">Enter</span>`;
   b.onclick = () => { if (swiped) { swiped = false; return; } return b.dataset.spot === 'main' ? choose(play, b) : select(play); };
   return b;
  });
  // The first screen only pays for the card in front; the neighbours load once the browser is idle.
  const paint = b => { if (!b.dataset.pic) return; b.querySelector('.gf-deck-pic').style.backgroundImage = `url("${b.dataset.pic}")`; delete b.dataset.pic; };
  const dots = el('div', 'gf-deck-dots', undefined, wrap); dots.setAttribute('aria-hidden', 'true'); plays.forEach(() => el('i', '', undefined, dots));
  let current = Math.max(0, plays.indexOf(selected));
  function records() { cards.forEach((b, i) => { const play = plays[i], rec = b.querySelector('.gf-deck-rec'); rec.innerHTML = glyph(play === 'stage' ? 'star' : 'trophy'); el('span', '', play === 'stage' ? `별 ${store.total(grade)} / ${config.stage.stages.length * 3}` : `내 최고 ${store.best(grade, play).toLocaleString('ko-KR')}점`, rec); b.setAttribute('aria-label', `${names[i]}, ${descriptions[i]}, ${rec.textContent}`); }); }
  function place(animate) {
   const before = animate && !matchMedia('(prefers-reduced-motion: reduce)').matches ? cards.map(b => b.getBoundingClientRect()) : null;
   cards.forEach((b, i) => { const spot = i === current ? 'main' : i === (current + 1) % 3 ? 'right' : 'left'; if (spot === 'main') paint(b); b.dataset.spot = spot; b.setAttribute('aria-pressed', String(spot === 'main')); b.tabIndex = spot === 'main' ? 0 : -1; });
   [...dots.children].forEach((d, i) => d.classList.toggle('on', i === current));
   // 카드를 옮긴 뒤에는 한 번 더 눌러야 시작한다. 그 한 번을 알리려고 시작 알약을 튕긴다.
   if (animate) { const go = cards[current].querySelector('.gf-deck-go'); go.classList.remove('is-hint'); void go.offsetWidth; go.classList.add('is-hint'); }
   if (before) cards.forEach((b, i) => { const r = b.getBoundingClientRect(), o = before[i]; if (!r.width) return; b.animate([{ transform: `translate(${o.left + o.width / 2 - r.left - r.width / 2}px,${o.top + o.height / 2 - r.top - r.height / 2}px) scale(${o.width / r.width})` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
  }
  function select(play) { const i = plays.indexOf(play); if (i < 0 || i === current) return; current = i; place(true); onSelect?.(play); }
  const step = dir => select(plays[(current + dir + 3) % 3]);
  let drag = null, swiped = false;
  row.addEventListener('pointerdown', e => { swiped = false; drag = e.pointerType === 'mouse' || e.target.closest('.gf-deck-arrow') ? null : { x: e.clientX, y: e.clientY }; });
  row.addEventListener('pointerup', e => { const d = drag; drag = null; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.4) return; swiped = true; step(dx < 0 ? 1 : -1); });
  row.addEventListener('pointercancel', () => { drag = null; });
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  records(); place(false);
  (window.requestIdleCallback || (fn => setTimeout(fn, 800)))(() => cards.forEach(paint));
  return { el: wrap, select, step, launch(play = plays[current]) { select(play); choose(play, cards[current]); }, setGrade(g) { grade = g; records(); }, focus() { cards[current].focus({ preventScroll: true }); }, current: () => plays[current] };
 }
 const positions = {
  mole: { portrait: [[28,86],[70,78],[28,70],[70,62],[28,54],[70,46],[28,38],[70,30],[28,22],[70,14]], landscape: [[10,40],[19,52],[27,65],[38,61],[46,50],[57,47],[65,58],[73,62],[84,51],[92,43]] },
  runner: { portrait: [[28,86],[70,78],[28,70],[70,62],[28,54],[70,46],[28,38],[70,30],[28,22],[70,14]], landscape: [[9,55],[18,45],[28,42],[37,53],[45,60],[57,59],[66,51],[75,46],[85,54],[92,59]] },
 };
 function map({ parent, art, family, grade, config, store, back, start }) {
  const screen = el('section', 'gf-mode-map', undefined, parent); screen.dataset.test = 'stage-map'; window.GFUI.theme(screen, family); window.GFUI.background(screen, art, 'map');
  const top = el('div', 'gf-map-top', undefined, screen), exit = el('button', 'gf-button', '‹', top); exit.dataset.test = 'map-back'; exit.setAttribute('aria-label', '시작 화면으로'); exit.onclick = () => { screen.remove(); back(); };
  el('span', 'gf-map-pill', `${grade}학년`, top); el('span', 'gf-map-pill gf-map-total', `★ ${store.total(grade)} / 30`, top);
  let current = config.stage.stages.find(s => !store.stars(grade, s.id))?.id ?? 10;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); path.setAttribute('viewBox', '0 0 100 100'); path.setAttribute('preserveAspectRatio', 'none'); path.classList.add('gf-map-path'); path.setAttribute('aria-hidden', 'true'); screen.append(path);
  function update() {
   const points = positions[family][innerHeight > innerWidth ? 'portrait' : 'landscape'];
   const d = points.slice(1).reduce((d,p,i)=>{const a=points[i],m=(a[1]+p[1])/2;return `${d} C ${a[0]} ${m}, ${p[0]} ${m}, ${p[0]} ${p[1]}`;},`M ${points[0].join(' ')}`);
   path.innerHTML = `<path d="${d}"/>`;
   screen.querySelectorAll('.gf-level-slot').forEach((slot, i) => { slot.style.left = `${points[i][0]}%`; slot.style.top = `${points[i][1]}%`; });
  }
  for (const stage of config.stage.stages) {
   const n = stage.id, level = store.stars(grade, n), locked = !store.unlocked(grade, n), boss = config.stage.bossAt.includes(n);
   const slot = el('div', `gf-level-slot${boss ? ' gf-level-boss' : ''}`, undefined, screen), b = el('button', `gf-level-node${n === current && !locked ? ' gf-level-current' : ''}`, undefined, slot); b.dataset.test = `stage-${n}`; b.disabled = locked;
   b.setAttribute('aria-label', `${n}단계 ${stage.title}${locked ? ' 잠김' : ` 별 ${level}개`}`);
   if (boss || n === current && !locked) { icon(b, art, boss ? n === 5 ? 6 : 7 : 8); if(boss&&n===current&&!locked)icon(b,art,8).classList.add('gf-boss-hero');el('span', 'gf-node-badge', String(n), b); }
   else if (locked) b.innerHTML = '<svg class="gf-lock" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 12V7a6 6 0 0 1 12 0v5M3 12h18v13H3zM12 17v4"/></svg>';
   else b.textContent = n;
   if(boss&&locked){const lock=el('span','gf-boss-lock',undefined,b);lock.innerHTML='<svg class="gf-lock" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 12V7a6 6 0 0 1 12 0v5M3 12h18v13H3zM12 17v4"/></svg>';}
   stars(slot, level, 'gf-node-stars');
   b.onclick = () => stageDialog(screen, { art, stage, boss, start: button => { window.removeEventListener('resize', update); screen.remove(); start(stage.id, button); } });
  }
  el('p', 'gf-map-hint', '별 하나를 모으면 다음 단계가 열려요!', screen); update(); window.addEventListener('resize', update);
  const observer = new MutationObserver(() => { if (!screen.isConnected) { window.removeEventListener('resize', update); observer.disconnect(); } }); observer.observe(parent, { childList: true }); return screen;
 }
 function stageDialog(parent, { art, stage, boss, start }) {
  const overlay = el('div', 'gf-mode-overlay', undefined, parent); overlay.dataset.test = 'stage-dialog'; const panel = el('section', 'gf-stage-dialog', undefined, overlay); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', `${stage.id}단계 목표`);
  icon(panel, art, boss ? stage.id === 5 ? 6 : 7 : 8); el('h3', '', `${stage.id}단계 · ${stage.title}`, panel); el('p', 'gf-stage-goal', `${stage.goal.text || `${stage.goal.label} ${stage.goal.target}개를 맞혀요`} · ${stage.timeSec}초 · 하트 ${stage.hearts}`, panel);
  const rules = el('div', 'gf-stage-criteria', undefined, panel);
  for (const [n, label] of [[1,'목표 달성'],[2,`정확도 ${Math.round(stage.starRules.accuracy * 100)}% 이상`],[3,`실수 ${stage.starRules.maxWrong}번 이하`]]) { const p = el('p', '', undefined, rules); stars(p, n); el('span', '', label, p); }
  const b = el('button', 'gf-button gf-primary', '시작', panel); b.dataset.test = 'stage-start'; b.onclick = () => start(b);
  const close = el('button', 'gf-button gf-stage-close', '닫기', panel); close.dataset.test = 'stage-close'; close.onclick = () => { overlay.remove(); parent.querySelector(`[data-test="stage-${stage.id}"]`)?.focus(); }; b.focus();
  const key = e => { if (!overlay.isConnected) { window.removeEventListener('keydown', key); return; } if (e.key === 'Escape') { e.preventDefault(); close.click(); } if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === b ? close : b).focus(); } }; window.addEventListener('keydown', key);
 }
 function powerup(parent, { art, family, options, choose, paused = () => false, fast = false }) {
  const overlay = el('section', 'gf-mode-overlay gf-powerup', undefined, parent); overlay.dataset.test = 'powerup'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', '강해지기 고르기'); window.GFUI.theme(overlay, family);
  el('h3', 'gf-powerup-title gf-ui-outline', '하나 골라요!', overlay); const row = el('div', 'gf-mode-cards', undefined, overlay);
  let done = false, left = 3, previous, raf;
  const finish = i => { if (done) return; done = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', key); overlay.remove(); choose(options[i]); };
  options.forEach((option, i) => { const b = el('button', 'gf-button gf-mode-card', undefined, row); b.dataset.test = `powerup-${i+1}`; icon(b, art, option.icon); const copy = el('div', 'gf-mode-copy', undefined, b); el('h4', '', option.name, copy); el('p', '', option.desc, copy); b.onclick = () => finish(i); });
  const timer = el('p', 'gf-powerup-timer', undefined, overlay); timer.setAttribute('role', 'status');
  const timerText = el('span', '', '3초 · 안 고르면 가운데 도구로!', timer); el('i', '', undefined, timer);
  const key = e => { if (paused()) return; if (['1','2','3'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); finish(Number(e.key)-1); } else if (e.key === 'Tab') { e.preventDefault(); const buttons = [...row.children], index = buttons.indexOf(document.activeElement); buttons[(index + (e.shiftKey ? 2 : 1)) % 3].focus(); } };
  window.addEventListener('keydown', key, false); row.children[1].focus();
  function tick(now) { if (!overlay.isConnected || done) return; if (previous !== undefined && !document.hidden && !paused()) left = Math.max(0, left - (now-previous)/1000); previous = document.hidden || paused() ? undefined : now; const s = Math.ceil(left); if (timer.dataset.seconds !== String(s)) { timer.dataset.seconds = s; timerText.textContent = `${s}초 · 안 고르면 가운데 도구로!`; } timer.style.setProperty('--gf-left', String(left / 3)); if (left <= 0) finish(1); else raf = requestAnimationFrame(tick); } raf = requestAnimationFrame(tick);
  return { choose: finish, advance: sec => { if (!paused() && !done) { left = Math.max(0, left-sec); if (!left) finish(1); } }, remove: () => { if (!done) { done = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', key); overlay.remove(); } } };
 }
 function decorateResult(summary, result) {
  summary.classList.add('gf-mode-summary'); summary.dataset.play = result.play;
  const heading = summary.querySelector('.gf-result-heading'); heading.textContent = result.play === 'stage' ? `${result.stage}단계 · ${result.title}${result.passed ? ' 성공!' : ' 다시 도전!'}` : `${result.name} · ${result.reason === 'five-minutes' ? '시간 끝까지 버텼다!' : '한 판이 끝났어요!'}`;
  if (result.play === 'stage') { const old = summary.querySelector('.gf-result-stars'); const replacement = stars(summary, result.stars, 'gf-stage-result-stars'); old.replaceWith(replacement); summary.querySelector('.gf-star-level').textContent = `별 ${result.stars} / 3`; }
  const time = el('p', 'gf-mode-duration', `${result.name} · ${Math.floor(result.elapsed / 60)}분 ${Math.floor(result.elapsed % 60)}초`, summary);
  return time;
 }
 window.GFModesUI = { icon, stars, cards, deck, glyph, map, stageDialog, powerup, decorateResult };
})();
