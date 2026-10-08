(function () {
  'use strict';
  if (window.GFShell) return;
  const scriptSrc = typeof document !== 'undefined' ? document.currentScript?.src : null;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  let active = null, remembered;
  function rng(seed) {
    let state = seed >>> 0;
    return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function earned(stamps, stats, score) {
    return (stamps || []).filter(({ rule }) => Object.entries(rule).every(([k, v]) => {
      if (k === 'finish') return v === true;
      if (k === 'score') return score >= v;
      if (k === 'combo') return stats.maxCombo >= v;
      if (k === 'right') return stats.right >= v;
      if (k === 'wrong') return stats.wrong <= v;
      return false;
    })).map(s => s.id);
  }
  const clampGrade = (g, grades) => clamp(g, grades[0], grades[1]);
  function chooseGrade({ url, saved, grades, sim }) {
    for (const g of [url, saved]) if (typeof g === 'number' && Number.isFinite(g)) return clampGrade(g, grades);
    return sim > 0 ? grades[0] : null;
  }
  function stepper() {
    let acc = 0;
    return { add(dt) { acc += dt; let n = Math.floor(acc * 60 + 1e-9); if (n > 15) { n = 15; acc = 0; } else acc -= n / 60; return n; }, reset() { acc = 0; } };
  }
  function keyFor(code, keys, duo) {
    for (const side of duo ? ['left', 'right'] : ['solo']) { const i = keys[side].indexOf(code); if (i >= 0) return { side, i }; }
    return null;
  }
  function keyGate() {
    const held = new Set();
    return { down(code, repeat) { if (repeat || held.has(code)) return false; held.add(code); return true; }, up(code) { held.delete(code); }, clear() { held.clear(); } };
  }
  function withV(url, v) {
    if (!v) return url;
    const [path, hash] = url.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}${hash === undefined ? '' : '#' + hash}`;
  }
  function winnerText(l, r, tall) { return l === r ? '비겼어요!' : `${l > r ? (tall ? '위쪽' : '왼쪽') : (tall ? '아래쪽' : '오른쪽')}이 이겼어요!`; }
  const scaleFor = (w, h) => clamp(Math.min(w, h) / 768, 0.5, 1);
  const fracRE = /(\d+|□)\/(\d+|□)/g;
  function pieces(str, size, measure, math) {
    if (!math) return [{ text: str, width: measure(str, size) }];
    const result = []; let end = 0;
    for (const m of str.matchAll(fracRE)) {
      if (m.index > end) { const text = str.slice(end, m.index); result.push({ text, width: measure(text, size) }); }
      result.push({ num: m[1], den: m[2], width: Math.max(measure(m[1], size * .75), measure(m[2], size * .75)) + size * .2 }); end = m.index + m[0].length;
    }
    if (end < str.length) { const text = str.slice(end); result.push({ text, width: measure(text, size) }); }
    return result;
  }
  function layoutText(str, box, { min, max = Math.floor(box.h / 1.15), lines = 2, math = false }, measure) {
    const width = (s, px) => pieces(s, px, measure, math).reduce((sum, p) => sum + p.width, 0);
    for (let size = Math.floor(max); size >= Math.ceil(min); size--) {
      const rows = []; let line = '', failed = false;
      for (const word of String(str).trim().split(/\s+/u)) {
        if (width(word, size) > box.w) { failed = true; break; }
        const candidate = line ? line + ' ' + word : word;
        if (width(candidate, size) <= box.w) line = candidate;
        else { rows.push(line); line = word; }
      }
      if (line) rows.push(line);
      const height = rows.reduce((sum, row) => sum + size * (math && /(\d+|□)\/(\d+|□)/.test(row) ? 1.6 : 1.15), 0);
      if (!failed && rows.length <= lines && height <= box.h) return { size, lines: rows };
    }
    return null;
  }
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderMath(str, reveal) {
    let used = false, result = '', end = 0;
    const blank = () => { if (reveal !== undefined && reveal !== null && !used) { used = true; return `<span class="gf-reveal">${escapeHTML(reveal)}</span>`; } return '<span class="gf-blank"></span>'; };
    for (const m of String(str).matchAll(/(\d+|□)\/(\d+|□)|□/g)) {
      result += escapeHTML(String(str).slice(end, m.index));
      result += m[1] ? `<span class="gf-frac"><b>${m[1] === '□' ? blank() : m[1]}</b><b>${m[2] === '□' ? blank() : m[2]}</b></span>` : blank();
      end = m.index + m[0].length;
    }
    result += escapeHTML(String(str).slice(end));
    if (reveal !== undefined && reveal !== null && !used) result += `<br><span class="gf-reveal">정답: ${escapeHTML(reveal)}</span>`;
    return result;
  }
  const mathHTML = str => renderMath(str);
  const questionHTML = (str, reveal) => renderMath(str, reveal);
  function measureText(str, px) {
    if (active?.measure) return active.measure(str, px);
    const g = active?.g;
    if (g) { g.font = `${px}px DoHyeon, sans-serif`; return g.measureText(str).width; }
    return [...str].length * px;
  }
  function fits(str, box, opts) { return !!layoutText(str, box, opts, opts.measure || measureText); }
  function img(g, slot, x, y, w, h, frame = 0, src) {
    const s = active?.art?.slots[slot], picture = active?.images?.[slot];
    if (!g || !s || !picture) return;
    const crop = src || { x: 0, y: 0, w: s.w, h: s.h };
    g.imageSmoothingEnabled = w * (active.dpr || 1) / crop.w < .75;
    if (g.imageSmoothingEnabled) g.imageSmoothingQuality = 'high';
    g.drawImage(picture, frame * s.w + crop.x, crop.y, crop.w, crop.h, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function text(g, str, box, opts) {
    if (!g) return false;
    const layout = layoutText(str, box, opts, (s, px) => { g.font = `${px}px DoHyeon, sans-serif`; return g.measureText(s).width; });
    if (!layout) return false;
    const { size, lines } = layout, color = opts.color || '#fff9e9', outline = opts.outline === undefined ? '#2b1d10' : opts.outline;
    const heights = lines.map(line => size * (opts.math && /(\d+|□)\/(\d+|□)/.test(line) ? 1.6 : 1.15));
    let y = box.y + (box.h - heights.reduce((a, b) => a + b, 0)) / 2;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.strokeStyle = outline; g.lineWidth = Math.max(2, Math.round(size / 8)); g.lineJoin = 'round';
    function write(value, x, yy, px) { g.font = `${px}px DoHyeon, sans-serif`; if (outline !== null) g.strokeText(value, x, yy); g.fillText(value, x, yy); }
    lines.forEach((line, i) => {
      const parts = pieces(line, size, (s, px) => { g.font = `${px}px DoHyeon, sans-serif`; return g.measureText(s).width; }, opts.math);
      let x = box.x + (box.w - parts.reduce((a, p) => a + p.width, 0)) / 2;
      const yy = y + heights[i] / 2;
      for (const p of parts) {
        if (p.text !== undefined) write(p.text, x + p.width / 2, yy, size);
        else { write(p.num, x + p.width / 2, yy - size * .42, size * .75); write(p.den, x + p.width / 2, yy + size * .42, size * .75); g.strokeStyle = color; g.lineWidth = Math.max(1, size / 16); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + p.width, yy); g.stroke(); g.strokeStyle = outline; g.lineWidth = Math.max(2, Math.round(size / 8)); }
        x += p.width;
      }
      y += heights[i];
    });
    g.restore(); return layout;
  }
  function runner(cfg, opts) {
    const run = { cfg, art: opts.art, measure: opts.measure, worlds: [], status: 'play', paused: false, ticks: 0, ...opts };
    const seconds = opts.duo ? opts.family.round.duoSeconds : opts.family.round.seconds;
    const index = side => side === 1 || side === 'right' ? 1 : 0;
    run.world = side => run.worlds[index(side)] || null;
    run.input = (side, kind, a, b, bot = false) => {
      active = run;
      const w = run.world(side);
      if (run.status !== 'play' || run.paused || !w || w.over) return;
      w.inputs.push({ t: w.clock, kind, ...(kind === 'key' ? { i: a } : { x: a, y: b }), bot });
      if (w.inputs.length > 200) w.inputs.shift();
      if (kind === 'key') cfg.key(w, a); else cfg.press(w, a, b);
    };
    run.tick = () => {
      if (run.status !== 'play' || run.paused) return;
      active = run; run.ticks++;
      for (const w of run.worlds) {
        w.clock = run.ticks / 60; w.timeLeft = Math.max(0, seconds - w.clock);
        if (w.over) continue;
        w.fx.update(1 / 60); const dt = w.fx.timeScale() / 60;
        if (dt > 0) {
          w.time += dt;
          const input = w.botKind ? cfg.bot?.(w) : null;
          if (input?.key !== undefined) run.input(w.side, 'key', input.key, undefined, true);
          else if (input?.press) run.input(w.side, 'press', ...input.press, true);
          cfg.step(w, dt);
        }
        if (!opts.duo) w.lives = Math.max(0, opts.family.round.lives - w.stats.wrong);
      }
      const w = run.world();
      if (opts.duo ? w.timeLeft === 0 || run.worlds.every(p => p.over) : w.over || w.timeLeft === 0 || w.lives === 0) {
        run.status = 'end'; run.onEnd?.();
      }
    };
    run.step = seconds => { for (let i = 0, n = Math.round(seconds * 60); i < n && run.status === 'play' && !run.paused; i++) run.tick(); };
    active = run;
    for (const side of opts.duo ? ['left', 'right'] : ['solo']) {
      const view = { ...opts.view, tall: opts.view.h > opts.view.w };
      const w = { rng: rng(opts.seed), grade: opts.grade, content: opts.content, art: opts.art, family: opts.family, play: { ...opts.family.play, ...opts.game.play }, view, side, duo: opts.duo,
        time: 0, clock: 0, timeLeft: seconds, lives: opts.duo ? null : opts.family.round.lives, score: 0, over: false,
        stats: { right: 0, wrong: 0, missed: 0, maxCombo: 0 }, mult: 1, question: null, reveal: null, botKind: opts.botKind, botDelay: side === 'right' ? .9 : .6,
        fontScale: scaleFor(view.w, view.h), fx: new window.GFJuice.Fx({ seed: opts.seed }), combo: new window.GFJuice.Combo(cfg.combo || {}), inputs: [] };
      run.worlds.push(w); w.fx.width = view.w; w.fx.height = view.h; cfg.setup(w);
      if (!opts.deferLayout) cfg.layout(w);
    }
    return run;
  }
  function headless(cfg, opts) {
    const run = runner(cfg, { seed: 1, botKind: null, duo: false, ...opts });
    return { world: run.world, input: run.input, step: run.step, state: () => run.status };
  }
  function play(cfg) {
    remembered = cfg;
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(cfg), { once: true }); else boot(cfg);
  }
  async function boot(cfg) {
    const gf = window.GF, juice = window.GFJuice;
    let status = 'load', run, grade, data, images = {}, started = false, paused = false, previous, lastTick;
    const accumulator = stepper(), gate = keyGate(), durations = [];
    let frames = 0, totalMs = 0, dpr = 1, rects = [], questionNodes = [], goal, hudSize;
    const duo = gf.mode === 'duo';
    function perf() { const sorted = durations.slice().sort((a, b) => a - b); return { frames, avgMs: frames ? totalMs / frames : 0, p99Ms: sorted.length ? sorted[Math.ceil(sorted.length * .99) - 1] : 0 }; }
    window.__GAME = { state: () => status, world: side => run?.world(side) || null, score: side => run?.world(side)?.score ?? null, perf,
      step(seconds) { if (status === 'play') { run.step(seconds); draw(); } } };
    for (const [name, fn] of Object.entries(cfg.hooks || {})) window.__GAME[name] = (...args) => { active = run; return run ? fn(run.world(), ...args) : null; };
    document.body.classList.add('gf-stage');
    if (!gf.inFrame) document.body.style.setProperty('--gf-band', '0px');
    function el(tag, className, content, parent = document.body) { const node = document.createElement(tag); node.className = className; if (content !== undefined) node.textContent = content; parent.appendChild(node); return node; }
    const canvas = el('canvas', 'gf-canvas'), g = canvas.getContext('2d');
    const hud = el('div', duo ? 'gf-hud gf-hud-duo' : 'gf-hud'); hud.hidden = true;
    const assists = el('div', 'gf-assists');
    Object.assign(assists.style, { position: 'absolute', left: '12px', right: '12px', display: 'flex', gap: '8px', alignItems: 'start', pointerEvents: 'none' });
    const note = el('section', 'gf-note gf-chip', undefined, assists); note.hidden = true;
    Object.assign(note.style, { position: 'static', flex: '1', minWidth: '0', padding: '8px 12px' });
    let scoreNodes, timeNode, bar, hearts, mult;
    function chip(label, strongClass) { const section = el('section', 'gf-chip', undefined, hud); el('p', 'gf-label', label, section); return el('strong', strongClass, '0', section); }
    if (duo) {
      scoreNodes = [chip('왼쪽 ▲', 'gf-score gf-side-left'), null]; timeNode = chip('남은 시간', 'gf-time'); scoreNodes[1] = chip('오른쪽 ●', 'gf-score gf-side-right');
    } else {
      scoreNodes = [chip('점수', 'gf-score')]; mult = el('span', 'gf-mult', '', scoreNodes[0].parentElement);
      timeNode = chip('남은 시간', 'gf-time'); bar = el('i', '', undefined, el('div', 'gf-bar', undefined, timeNode.parentElement));
      const section = el('section', 'gf-chip', undefined, hud); el('p', 'gf-label', '목숨', section); hearts = el('div', 'gf-hearts', undefined, section);
      const target = el('section', 'gf-goal gf-chip', undefined, assists); target.dataset.test = 'goal'; target.hidden = true; el('p', 'gf-label', '오늘의 도전', target);
      Object.assign(target.style, { position: 'static', width: '164px', maxWidth: '55%', minHeight: '60px', flexShrink: '0', padding: '8px 12px', marginLeft: 'auto' });
      const label = el('strong', '', '오늘 첫 1등이 되어 보세요', target); Object.assign(label.style, { fontSize: '16px', margin: '2px 0' }); goal = juice.goal(target);
    }
    function resize() {
      const W = window.innerWidth, H = window.innerHeight, tall = H > W;
      dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      rects = !duo ? [{ x: 0, y: 0, w: W, h: H }] : tall ? [{ x: 0, y: 0, w: W, h: Math.floor(H / 2) }, { x: 0, y: Math.floor(H / 2), w: W, h: H - Math.floor(H / 2) }] : [{ x: 0, y: 0, w: Math.floor(W / 2), h: H }, { x: Math.floor(W / 2), y: 0, w: W - Math.floor(W / 2), h: H }];
      if (duo) { scoreNodes[0].previousElementSibling.textContent = tall ? '위쪽 ▲' : '왼쪽 ▲'; scoreNodes[1].previousElementSibling.textContent = tall ? '아래쪽 ●' : '오른쪽 ●'; }
      if (!run) return;
      active = run; run.dpr = dpr;
      if (!duo) {
        const section = scoreNodes[0].parentElement;
        if (W <= 600) section.style.minWidth = '0px';
        else {
          const score = scoreNodes[0].cloneNode(false), badge = mult.cloneNode(false);
          score.textContent = (data.game.ranking?.maxScore || 0).toLocaleString('ko-KR');
          badge.textContent = `×${(cfg.combo?.steps?.length || 0) + 1}`; badge.hidden = false;
          for (const probe of [score, badge]) { probe.style.position = 'absolute'; probe.style.visibility = 'hidden'; section.appendChild(probe); }
          const css = getComputedStyle(section);
          const width = score.getBoundingClientRect().width + badge.getBoundingClientRect().width + parseFloat(getComputedStyle(badge).marginLeft) + parseFloat(css.paddingLeft) + parseFloat(css.paddingRight) + 2;
          section.style.minWidth = `${Math.ceil(width)}px`; score.remove(); badge.remove();
        }
      }
      run.worlds.forEach((w, i) => { w.view = { ...rects[i], tall: rects[i].h > rects[i].w, top: 8 }; w.fontScale = scaleFor(w.view.w, w.view.h); w.fx.width = w.view.w; w.fx.height = w.view.h; });
      questionNodes.forEach(q => { q._frame = null; q.style.height = ''; });
      assists._height = null; assists.style.minHeight = '';
      fitQuestions(); run.worlds.forEach(w => cfg.layout(w)); draw();
    }
    function fitQuestions() {
      const band = parseFloat(getComputedStyle(document.body).getPropertyValue('--gf-band')) || 0;
      const info = hud.getBoundingClientRect();
      let contentBottom = info.bottom;
      run.worlds.forEach((w, i) => {
        const r = rects[i], q = questionNodes[i], big = q.firstElementChild;
        const reveal = w.reveal && w.time < w.reveal.until ? w.reveal.answer : undefined;
        const html = w.question === null ? '' : questionHTML(w.question, reveal);
        const sideBySide = !duo && !w.view.tall;
        let width = sideBySide ? Math.min(2 * (r.w / 2 - info.right - 8), .56 * r.w) : .92 * r.w;
        let top = sideBySide ? band + 2 : (r.y === 0 ? info.bottom + 8 : r.y + 8);
        const min = Math.ceil(40 * w.fontScale), max = Math.round(56 * w.fontScale);
        let lineHeight = 1.2;
        q.style.left = `${r.x + r.w / 2}px`; q.style.padding = `${Math.round(12 * w.fontScale)}px`;
        function fit() {
          q.style.width = `${Math.max(1, width)}px`; big.style.lineHeight = String(lineHeight);
          for (const lines of [1, 2]) for (let px = max; px >= min; px--) {
            big.style.fontSize = `${px}px`;
            if (big.getBoundingClientRect().height <= lines * lineHeight * px + 2 && big.scrollWidth <= big.clientWidth + 1 &&
                (!q._frame || big.getBoundingClientRect().height <= q._frame.height - 2 * Math.round(12 * w.fontScale) - 2)) return true;
          }
          return false;
        }
        // Reserve the rule and two minimum-size question lines before countdown.
        // Refit content inside that frame; only a window resize may replace it.
        if (!q._frame) {
          q.hidden = false; big.innerHTML = questionHTML(w.play.rule);
          if (!fit() && sideBySide) { top = info.bottom + 8; width = .56 * r.w; fit(); }
          const height = Math.max(q.getBoundingClientRect().height,
            2 * min * (cfg.family === 'runner' ? 1.6 : 1.2) + 2 * Math.round(12 * w.fontScale) + 2);
          q._frame = { top, width, height }; q.style.height = `${height}px`;
        }
        ({ top, width } = q._frame);
        big.innerHTML = html; q._html = html; q.hidden = w.question === null;
        lineHeight = html.includes('gf-frac') ? 1.6 : 1.2;
        if (!q.hidden) fit();
        q.style.top = `${top}px`;
        const bottom = top + q._frame.height;
        if (r.y === 0) contentBottom = Math.max(contentBottom, bottom);
        const infoBottom = info.bottom > r.y && info.top < r.y + r.h ? info.bottom : r.y;
        w.view.top = Math.max(r.y, band > r.y ? band : r.y, infoBottom, bottom) - r.y + 8;
      });
      assists.style.top = `${contentBottom + 8}px`;
      // Hidden assists still occupy their measured space throughout the round.
      const visibility = [...assists.children].map(n => n.hidden);
      [...assists.children].forEach(n => { n.hidden = false; });
      if (assists._height === null || assists._height === undefined) assists._height = assists.getBoundingClientRect().height;
      assists.style.minHeight = `${assists._height}px`;
      const assistBottom = contentBottom + 8 + assists._height;
      run.worlds.forEach((w, i) => {
        const r = rects[i];
        if (contentBottom < r.y + r.h && assistBottom > r.y) w.view.top = Math.max(w.view.top, assistBottom - r.y + 8);
      });
      [...assists.children].forEach((n, i) => { n.hidden = visibility[i]; });
    }
    function updateHUD(layout = true) {
      if (!run) return;
      run.worlds.forEach((w, i) => { if (scoreNodes[i]._score !== w.score) { juice.rollNumber(scoreNodes[i], w.score); scoreNodes[i]._score = w.score; if (i === 0) goal?.update(w.score); } });
      const w = run.world(), seconds = Math.ceil(w.timeLeft), duration = duo ? data.family.round.duoSeconds : data.family.round.seconds;
      timeNode.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      timeNode.parentElement.classList.toggle('gf-hurry', seconds <= 10); if (bar) bar.style.width = `${w.timeLeft / duration * 100}%`;
      if (status === 'play' && seconds <= 10 && seconds > 0 && lastTick !== seconds) juice.sfx.play('tick'); lastTick = seconds;
      if (hearts) { hearts.innerHTML = '♥'.repeat(w.lives) + '<span>♥</span>'.repeat(data.family.round.lives - w.lives); mult.textContent = w.mult > 1 ? `×${w.mult}` : ''; mult.hidden = w.mult <= 1; }
      note.hidden = status !== 'play' || w.clock >= 10;
      const info = hud.getBoundingClientRect(), size = `${info.width}:${info.height}:${note.hidden}:${assists.getBoundingClientRect().height}`;
      const changed = size !== hudSize || run.worlds.some((w, i) => (w.question === null ? '' : questionHTML(w.question, w.reveal && w.time < w.reveal.until ? w.reveal.answer : undefined)) !== questionNodes[i]._html);
      hudSize = size;
      if (changed) { fitQuestions(); if (layout) run.worlds.forEach(w => cfg.layout(w)); }
    }
    function draw() {
      if (!run) return;
      active = run; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      run.worlds.forEach((w, i) => { const r = rects[i]; g.save(); g.translate(r.x, r.y); g.beginPath(); g.rect(0, 0, r.w, r.h); g.clip();
        g.save(); w.fx.camera(g); cfg.draw(w, g); g.restore();
        w.fx.draw(g, { width: r.w, height: r.h, textBounds: cfg.hooks?.effectBounds?.(w), textAvoid: cfg.hooks?.effectLabels?.(w) }); g.restore(); });
      if (duo) { g.fillStyle = '#3c382e'; if (window.innerHeight > window.innerWidth) g.fillRect(0, rects[1].y - 2, window.innerWidth, 4); else g.fillRect(rects[1].x - 2, 0, 4, window.innerHeight); }
      updateHUD();
    }
    function frame(time) {
      const live = status === 'play' && !paused, begin = window.performance.now();
      if (live && previous !== undefined) { const n = accumulator.add((time - previous) / 1000); for (let i = 0; i < n; i++) run.tick(); }
      previous = paused ? undefined : time; draw();
      if (live) { const ms = window.performance.now() - begin; durations.push(ms); frames++; totalMs += ms; }
      window.requestAnimationFrame(frame);
    }
    async function finish() {
      status = 'end';
      if (duo) {
        const winner = el('div', 'gf-winner gf-chip', winnerText(run.world().score, run.world(1).score, window.innerHeight > window.innerWidth)); winner.dataset.test = 'winner';
        if (!(gf.sim > 0)) await new Promise(resolve => window.setTimeout(resolve, 2000));
        gf.finish();
      } else {
        await juice.finale({ parent: document.body });
        for (const id of earned(data.game.stamps, run.world().stats, run.world().score)) gf.stamp(id);
        gf.finish({ score: run.world().score });
      }
    }
    async function start(button, title) {
      if (started) return; started = true; button.disabled = true;
      title.remove(); hud.hidden = false; note.textContent = duo ? data.play.noteDuo : data.play.note;
      resize();
      const seed = gf.seed !== null && gf.seed !== undefined ? gf.seed : window.crypto.getRandomValues(new Uint32Array(1))[0];
      const query = new URLSearchParams(window.location.search), value = query.get('bot');
      const botKind = ['127.0.0.1', 'localhost'].includes(window.location.hostname) && ['right', 'wrong', 'mix'].includes(value) ? value : null;
      run = runner(cfg, { ...data, seed, grade, duo, botKind, view: rects[0], deferLayout: true, images, g, dpr });
      run.status = 'count'; run.onEnd = () => { finish().catch(loadError); };
      questionNodes = run.worlds.map((w, i) => { const q = el('section', 'gf-question gf-chip'); q.dataset.test = duo ? `question-${w.side}` : 'question'; el('div', 'gf-big', '', q); return q; });
      updateHUD(false); resize(); await gf.start(); status = 'count'; await juice.countdown({ parent: document.body }); status = 'play'; run.status = 'play';
      previous = undefined; accumulator.reset(); if (gf.sim > 0) run.step(gf.sim); draw(); window.requestAnimationFrame(frame);
    }
    function titleScreen() {
      document.querySelector('.gf-grade-picker')?.remove(); status = 'title';
      const screen = el('section', 'gf-title-screen'); screen.dataset.test = 'title-screen';
      const scenes = data.family.art.filter(s => s.kind === 'scene');
      const scene = scenes.sort((a, b) => Math.abs(Math.log(a.size[0] / a.size[1] / (window.innerWidth / window.innerHeight))) - Math.abs(Math.log(b.size[0] / b.size[1] / (window.innerWidth / window.innerHeight))))[0];
      if (scene) screen.style.backgroundImage = `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url("${images[scene.slot].src}")`;
      el('h1', '', data.game.title, screen);
      const sprite = data.art.slots[data.family.title.sprite], portrait = el('canvas', 'gf-title-sprite', undefined, screen);
      portrait.width = sprite.w; portrait.height = sprite.h; portrait.style.aspectRatio = `${sprite.w}/${sprite.h}`; portrait.getContext('2d').drawImage(images[data.family.title.sprite], 0, 0, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
      el('p', 'gf-title-rule', data.play.rule, screen);
      const button = el('button', 'gf-button gf-primary', '시작', screen); button.dataset.test = 'start'; button.onclick = () => start(button, screen).catch(loadError);
      el('p', 'gf-title-note', duo ? data.play.noteDuo : data.play.note, screen);
      const change = el('div', 'gf-title-grade', undefined, screen); const label = el('span', '', `${grade}학년 문제`, change); label.dataset.test = 'grade-label';
      const pick = el('button', 'gf-button', '학년 바꾸기', change); pick.dataset.test = 'grade-change'; pick.onclick = () => { screen.remove(); gradePicker(); };
    }
    function gradePicker() {
      status = 'grade'; const picker = el('section', 'gf-grade-picker'); picker.dataset.test = 'grade-picker'; el('h1', '', '몇 학년 문제를 할까요?', picker);
      const buttons = el('div', '', undefined, picker);
      for (let n = data.game.grades[0]; n <= data.game.grades[1]; n++) { const b = el('button', 'gf-button gf-primary', `${n}학년`, buttons); b.dataset.test = `grade-${n}`; b.onclick = () => { grade = n; gf.save({ ...(gf.load() || {}), grade }); titleScreen(); }; }
    }
    function loadError(error) { status = 'error'; if (run) run.status = 'error'; const node = el('section', 'gf-load-error', '게임을 불러오지 못했어요'); node.dataset.test = 'load-error'; window.console.error(error.message); gf.ready(); }
    gf.on('pause', () => { paused = true; if (run) run.paused = true; gate.clear(); });
    gf.on('resume', () => { paused = false; if (run) run.paused = false; accumulator.reset(); previous = undefined; });
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', e => { if (!data) return; const key = keyFor(e.code, data.family.keys, duo); if (key) e.preventDefault(); if (gate.down(e.code, e.repeat) && key) run?.input(key.side, 'key', key.i); });
    window.addEventListener('keyup', e => gate.up(e.code)); window.addEventListener('blur', () => gate.clear());
    canvas.addEventListener('pointerdown', e => { if (!run) return; const i = duo && (window.innerHeight > window.innerWidth ? e.clientY >= rects[1].y : e.clientX >= rects[1].x) ? 1 : 0; const r = rects[i]; run.input(i, 'press', e.clientX - r.x, e.clientY - r.y); });
    try {
      const params = new URLSearchParams(window.location.search), v = params.get('v') || (scriptSrc ? new URL(scriptSrc).searchParams.get('v') : null);
      async function json(path) { const url = withV(path, v); try { const response = await fetch(url); if (!response.ok) throw new Error(`상태 ${response.status}`); return await response.json(); } catch (e) { throw new Error(`${url}: ${e.message}`); } }
      const [game, content, art, family] = await Promise.all([json('game.json'), json('content.json'), json('art.json'), json(`../../families/${cfg.family}/family.json`)]);
      if (game.family !== cfg.family) throw new Error('game.json: 놀이 틀이 달라요');
      data = { game, content, art, family, play: { ...family.play, ...game.play } };
      await Promise.all(Object.entries(art.slots).map(([slot, s]) => new Promise((resolve, reject) => { const picture = new Image(), url = withV(s.file, v); picture.onload = () => { images[slot] = picture; resolve(); }; picture.onerror = () => reject(new Error(`${url}: 그림을 불러오지 못했어요`)); picture.src = url; })));
      await document.fonts.load('40px DoHyeon'); await document.fonts.ready; document.title = game.title; gf.ready();
      grade = chooseGrade({ url: gf.grade, saved: gf.load()?.grade, grades: game.grades, sim: gf.sim });
      if (grade === null) gradePicker(); else titleScreen(); resize();
    } catch (e) { loadError(e); }
  }
  window.GFShell = { rng, earned, clampGrade, chooseGrade, stepper, keyFor, keyGate, withV, winnerText, scaleFor, layoutText, mathHTML, questionHTML, img, text, fits, play, headless,
    get fontScale() { return active?.worlds?.[0]?.fontScale || 1; } };
})();
