(function () {
  'use strict';
  const rules = window.GFFamilies.mole.rules, shell = window.GFShell, juice = window.GFJuice;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function setup(w) {
    Object.assign(w, { holes: [], moles: [], card: null, hammer: null, dirt: [], cooldownUntil: .4, botCount: 0, bg: null, oneLine: new Set() });
    w.question = w.play.rule; w.picker = rules.picker(w.content, w.grade, w.rng);
    for (const item of Object.values(w.content.bands).flat()) if (item.wrong.some(word => word.replace(/\s/g, '') === item.right.replace(/\s/g, ''))) for (const word of [item.right, ...item.wrong]) w.oneLine.add(word);
  }
  function geometry(w, hole, k = 1, sprite = 'mole-up') {
    const s = w.art.slots[sprite], a = s.anchors, sc = hole.w / a.holeW * k, clipY = hole.y + .25 * hole.h;
    const box = { x: hole.x - a.base.x * sc, y: clipY - a.base.y * sc, w: s.w * sc, h: s.h * sc };
    const sign = a.sign ? { x: box.x + a.sign.x * sc, y: box.y + a.sign.y * sc, w: a.sign.w * sc, h: a.sign.h * sc } : null;
    return { box, sign, clipY };
  }
  function fitK(w, hole, word) {
    for (let n = 0; n <= 5; n++) {
      const k = 1 + n * .05, { box, sign } = geometry(w, hole, k);
      if (shell.fits(word, sign, { min: 32 * w.fontScale, max: Math.round(64 * w.fontScale), lines: w.oneLine.has(word) ? 1 : 2 })) return box.y >= w.view.top + 8 - 1e-7 ? k : null;
    }
    return null;
  }
  function layout(w) {
    const { w: W, h: H, top } = w.view, slot = W / H >= 1 ? 'bg-wide' : 'bg-tall', s = w.art.slots[slot], up = w.art.slots['mole-up'].anchors;
    const source = s.anchors.holes, used = source.slice(w.duo ? 3 : 0);
    const span0 = Math.min(...used.map(h => h.x - h.w / 2)), span1 = Math.max(...used.map(h => h.x + h.w / 2));
    const B = Math.max(...used.map(h => h.y + h.h / 2)), T = Math.min(...used.map(h => h.y + .25 * h.h - up.base.y * h.w / up.holeW));
    const scale = Math.min(Math.max(W / s.w, H / s.h), W * .94 / (span1 - span0), (H - top - 10) / (B - T));
    const dw = s.w * scale, dh = s.h * scale;
    let dx = W / 2 - (span0 + span1) / 2 * scale;
    dx = dw >= W ? clamp(dx, W - dw, 0) : (W - dw) / 2;
    const dy0 = H - dh, dMax = Math.max(0, Math.floor(H - (dy0 + scale * B)));
    const d = clamp(Math.ceil(top + 8 - (dy0 + scale * T) - 1e-9), 0, dMax), dy = dy0 + d;
    w.bg = { slot, s: scale, dx, dy, dw, dh, d };
    w.holes = source.map((h, i) => {
      const hole = { x: dx + h.x * scale, y: dy + h.y * scale, w: h.w * scale, h: h.h * scale };
      hole.usable = (!w.duo || i >= 3) && hole.x - hole.w / 2 >= -1e-7 && hole.x + hole.w / 2 <= W + 1e-7 && geometry(w, hole).box.y >= top + 8 - 1e-7;
      return hole;
    });
    for (const mole of w.moles) { mole.k = fitK(w, w.holes[mole.hole], mole.word) ?? 1; mole.box = geometry(w, w.holes[mole.hole], mole.k, mole.sprite).box; }
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function transition(w, mole, state) { mole.state = state; mole.stateAt = w.time; }
  function step(w, dt) {
    const keep = [];
    for (const m of w.moles) {
      const elapsed = w.time - m.stateAt;
      if (m.state === 'rise' && elapsed >= .15 - 1e-9) transition(w, m, 'up');
      else if (m.state === 'up' && elapsed >= m.upTime - 1e-9 || m.state === 'hit' && elapsed >= .35 - 1e-9 || m.state === 'taunt' && elapsed >= .5 - 1e-9) transition(w, m, 'fall');
      else if (m.state === 'fall' && elapsed >= .15 - 1e-9) {
        if (m.hittable && !m.quiet) {
          const h = w.holes[m.hole];
          if (m.right) { w.combo.miss(); w.stats.missed++; w.mult = 1; w.fx.text(h.x, h.y, '놓쳤어요', { size: Math.round(32 * w.fontScale) }); }
          else { w.score += 3; w.fx.text(h.x, h.y, '잘 참았어요', { size: Math.round(26 * w.fontScale) }); }
        }
        w.cooldownUntil = w.time + .25 + w.rng() * .45; continue;
      }
      keep.push(m);
    }
    w.moles = keep;
    for (const d of w.dirt) { d.age += dt; d.vy += 600 * w.fontScale * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    w.dirt = w.dirt.filter(d => d.age < .4);
    if (w.card && w.time >= w.card.until - 1e-9) w.card = null;
    if (w.hammer && w.time - w.hammer.t0 >= .28) w.hammer = null;
    if (w.card || w.time < w.cooldownUntil - 1e-9 || w.moles.length >= rules.maxUp(w.time)) return;
    for (let attempt = 0; attempt < 5; attempt++) {
      const choice = w.picker.next(), holes = [];
      w.holes.forEach((hole, i) => {
        if (!hole.usable || w.moles.some(m => m.hole === i)) return;
        const k = fitK(w, hole, choice.word);
        if (k !== null) { const box = geometry(w, hole, k).box; if (!w.moles.some(m => overlap(box, m.box))) holes.push({ i, k, box }); }
      });
      if (!holes.length) continue;
      const { i, k, box } = holes[Math.floor(w.rng() * holes.length)], hole = w.holes[i];
      w.moles.push({ hole: i, ...choice, state: 'rise', t0: w.time, stateAt: w.time, hittable: true, k, box, sprite: 'mole-up', upTime: rules.upTime(w.time), botDecided: false, quiet: false });
      for (const sign of [-1, 1]) w.dirt.push({ x: hole.x, y: hole.y, vx: sign * 60 * w.fontScale, vy: -180 * w.fontScale, age: 0, size: hole.w * .22 });
      w.cooldownUntil = w.time + .25 + w.rng() * .45; return;
    }
    w.cooldownUntil = w.time + .2;
  }
  function swing(w, x, y, hole) { w.hammer = { x, y, height: (hole || w.holes[7]).w * 1.1, t0: w.time }; }
  function whiff(w, x, y, hole) { juice.react.press(w.fx, x, y); w.fx.burst(x, y, { count: 6, colors: ['#8a5a2b', '#6b4423'] }); swing(w, x, y, hole); }
  function bodyTarget(w, m) {
    const hole = w.holes[m.hole], slot = w.art.slots[m.sprite], a = slot.anchors, sc = hole.w / a.holeW * m.k;
    const shape = geometry(w, hole, m.k, m.sprite), bodyTop = a.sign ? a.sign.y + a.sign.h : 0;
    return { x: hole.x, y: shape.box.y + (bodyTop + a.base.y) / 2 * sc };
  }
  function hit(w, m) {
    if (!m.hittable || w.card) return;
    const h = w.holes[m.hole], { x, y } = bodyTarget(w, m);
    m.hittable = false; swing(w, x, y, h);
    if (m.right) {
      const points = rules.points(w.combo.steps.filter(s => w.combo.count + 1 >= s).length);
      juice.react.hit(w.fx, x, y); juice.react.right(w.fx, x, y, { points, combo: w.combo });
      w.score += points; w.stats.right++; w.stats.maxCombo = Math.max(w.stats.maxCombo, w.combo.count); w.mult = 1 + w.combo.level;
      m.sprite = 'mole-hit'; transition(w, m, 'hit');
    } else {
      juice.react.wrong(w.fx, x, y, { combo: w.combo }); w.stats.wrong++; if (w.duo) w.score = Math.max(0, w.score - 10); w.mult = 1;
      m.sprite = 'mole-taunt'; transition(w, m, 'taunt');
      w.card = { wrong: m.word, right: m.item.right, tip: m.item.tip, until: w.time + (w.duo ? 1 : 1.5) };
      for (const other of w.moles) if (other !== m) { other.quiet = true; other.hittable = false; transition(w, other, 'fall'); }
    }
    m.box = geometry(w, h, m.k, m.sprite).box;
  }
  function key(w, i) {
    if (w.card) return;
    const n = (w.duo ? 3 : 0) + i, hole = w.holes[n];
    if (!hole?.usable) return;
    const m = w.moles.find(m => m.hole === n);
    if (m?.hittable) hit(w, m);
    else { const target = m ? bodyTarget(w, m) : hole; whiff(w, target.x, target.y, hole); }
  }
  function press(w, x, y) {
    if (w.card) return;
    const m = w.moles.filter(m => {
      const b = m.box; return m.hittable && x >= b.x - b.w * .05 && x <= b.x + b.w * 1.05 && y >= b.y - b.h * .05 && y <= b.y + b.h * 1.05;
    }).sort((a, b) => w.holes[b.hole].y - w.holes[a.hole].y)[0];
    if (m) hit(w, m); else whiff(w, x, y);
  }
  function bot(w) {
    if (w.card) return null;
    const m = w.moles.find(m => !m.botDecided && m.hittable && w.time >= m.t0 + w.botDelay - 1e-9);
    if (!m) return null;
    m.botDecided = true;
    return rules.botChoice(w.botKind, m.right, ++w.botCount) ? { key: m.hole - (w.duo ? 3 : 0) } : null;
  }
  function icon(g, kind, x, y, size) {
    g.strokeStyle = kind === 'cross' ? '#d33a2c' : kind === 'circle' ? '#397a58' : '#3b2a1a'; g.lineWidth = size / 8; g.lineCap = 'round'; g.beginPath();
    if (kind === 'cross') { g.moveTo(x - size * .25, y - size * .25); g.lineTo(x + size * .25, y + size * .25); g.moveTo(x + size * .25, y - size * .25); g.lineTo(x - size * .25, y + size * .25); }
    else if (kind === 'circle') g.arc(x, y, size * .3, 0, Math.PI * 2);
    else { g.moveTo(x - size * .3, y); g.lineTo(x + size * .3, y); g.moveTo(x + size * .05, y - size * .22); g.lineTo(x + size * .3, y); g.lineTo(x + size * .05, y + size * .22); }
    g.stroke();
  }
  function card(w, g) {
    const c = w.card, s = w.fontScale, pad = 20 * s, width = w.view.w * .9, measure = (text, px) => { g.font = `${px}px DoHyeon, sans-serif`; return g.measureText(text).width; };
    let size = Math.round(56 * s), single = false;
    for (; size >= Math.ceil(40 * s); size--) if (measure(c.wrong, size) + measure(c.right, size) + size * 3 <= width - pad * 2) { single = true; break; }
    if (!single) {
      size = Math.round(56 * s);
      while (size > Math.ceil(40 * s) && Math.max(measure(c.wrong, size) + size, measure(c.right, size) + size * 2) > width - pad * 2) size--;
    }
    const rowH = size * 1.3, mainH = rowH * (single ? 1 : 2);
    const tip = c.tip ? shell.layoutText(c.tip, { w: width - pad * 2, h: Math.round(34 * s) * 2.3 }, { min: 28 * s, max: Math.round(34 * s), lines: 2 }, measure) : null;
    const tipH = tip ? tip.lines.length * tip.size * 1.15 + pad / 2 : 0, height = pad * 2 + mainH + tipH;
    const x = (w.view.w - width) / 2, y = Math.max(w.view.top + 8, (w.view.top + w.view.h - height) / 2);
    g.save(); g.fillStyle = '#fff4d6'; g.strokeStyle = '#3b2a1a'; g.lineWidth = 4; g.beginPath(); g.roundRect(x, y, width, height, 16 * s); g.fill(); g.stroke();
    function label(text, xx, yy) { g.font = `${size}px DoHyeon, sans-serif`; g.fillStyle = '#3b2a1a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, xx, yy); }
    if (single) {
      const length = measure(c.wrong, size) + measure(c.right, size) + size * 3; let xx = x + (width - length) / 2, yy = y + pad + rowH / 2;
      icon(g, 'cross', xx + size / 2, yy, size); xx += size; label(c.wrong, xx, yy); xx += measure(c.wrong, size);
      icon(g, 'arrow', xx + size / 2, yy, size); xx += size; icon(g, 'circle', xx + size / 2, yy, size); xx += size; label(c.right, xx, yy);
    } else {
      let xx = x + (width - measure(c.wrong, size) - size) / 2, yy = y + pad + rowH / 2;
      icon(g, 'cross', xx + size / 2, yy, size); label(c.wrong, xx + size, yy);
      xx = x + (width - measure(c.right, size) - size * 2) / 2; yy += rowH;
      icon(g, 'arrow', xx + size / 2, yy, size); icon(g, 'circle', xx + size * 1.5, yy, size); label(c.right, xx + size * 2, yy);
    }
    if (tip) shell.text(g, c.tip, { x: x + pad, y: y + pad + mainH + pad / 2, w: width - pad * 2, h: tipH - pad / 2 }, { min: tip.size, max: tip.size, lines: 2, color: '#3b2a1a', outline: null });
    g.restore();
  }
  function draw(w, g) {
    const b = w.bg, s = w.art.slots[b.slot];
    if (b.dy > 0) shell.img(g, b.slot, b.dx, 0, b.dw, b.dy, 0, { x: 0, y: 0, w: s.w, h: 1 });
    if (b.dw < w.view.w) {
      shell.img(g, b.slot, 0, b.dy, b.dx + 1, b.dh, 0, { x: 0, y: 0, w: 1, h: s.h });
      shell.img(g, b.slot, b.dx + b.dw - 1, b.dy, w.view.w - b.dx - b.dw + 1, b.dh, 0, { x: s.w - 1, y: 0, w: 1, h: s.h });
      if (b.dy > 0) { shell.img(g, b.slot, 0, 0, b.dx + 1, b.dy, 0, { x: 0, y: 0, w: 1, h: 1 }); shell.img(g, b.slot, b.dx + b.dw - 1, 0, w.view.w - b.dx - b.dw + 1, b.dy, 0, { x: s.w - 1, y: 0, w: 1, h: 1 }); }
    }
    shell.img(g, b.slot, b.dx, b.dy, b.dw, b.dh);
    for (const m of w.moles.slice().sort((a, b) => w.holes[a.hole].y - w.holes[b.hole].y)) {
      const shape = geometry(w, w.holes[m.hole], m.k, m.sprite), elapsed = w.time - m.stateAt;
      const offset = (m.state === 'rise' ? 1 - clamp(elapsed / .15, 0, 1) : m.state === 'fall' ? clamp(elapsed / .15, 0, 1) : 0) * (shape.clipY - shape.box.y);
      g.save(); g.beginPath(); g.rect(0, 0, w.view.w, shape.clipY); g.clip();
      shell.img(g, m.sprite, shape.box.x, shape.box.y + offset, shape.box.w, shape.box.h);
      if (m.sprite === 'mole-up') shell.text(g, m.word, { ...shape.sign, y: shape.sign.y + offset }, { min: 32 * w.fontScale, max: Math.round(64 * w.fontScale), lines: w.oneLine.has(m.word) ? 1 : 2, color: '#3b2a1a', outline: null });
      g.restore();
    }
    for (const d of w.dirt) shell.img(g, 'dirt', d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
    if (w.card) card(w, g);
    if (w.hammer) {
      const h = w.hammer, elapsed = w.time - h.t0, slot = w.art.slots.hammer, a = slot.anchors, sc = h.height / slot.h;
      const raised = elapsed < .08 ? 1 - elapsed / .08 : elapsed < .2 ? 0 : clamp((elapsed - .2) / .08, 0, 1);
      // The head is left of the grip. A clockwise turn raises it on this drawing.
      const angle = raised * 40 * Math.PI / 180;
      const pivotX = h.x - (a.head.x - a.grip.x) * sc, pivotY = h.y - (a.head.y - a.grip.y) * sc;
      g.save(); g.translate(pivotX, pivotY); g.rotate(angle); shell.img(g, 'hammer', -a.grip.x * sc, -a.grip.y * sc, slot.w * sc, slot.h * sc); g.restore();
    }
  }
  function fits(w, word) { return w.holes.some(h => h.usable && fitK(w, h, word) !== null); }
  function effectLabels(w) {
    return w.moles.filter(m => m.sprite === 'mole-up').map(m => {
      const shape = geometry(w, w.holes[m.hole], m.k, m.sprite), elapsed = w.time - m.stateAt;
      const offset = (m.state === 'rise' ? 1 - clamp(elapsed / .15, 0, 1) : m.state === 'fall' ? clamp(elapsed / .15, 0, 1) : 0) * (shape.clipY - shape.box.y);
      return { x: shape.sign.x + w.fx.shakeX - 2, y: shape.sign.y + offset + w.fx.shakeY - 2, w: shape.sign.w + 4, h: shape.sign.h + 4 };
    });
  }
  const cfg = { family: 'mole', combo: { steps: [5, 10, 15] }, setup, layout, step, draw, press, key, bot, hooks: { fits, effectLabels } };
  window.GFFamilies.mole.engine = cfg; window.GFShell.play(cfg);
})();
