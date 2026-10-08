(function () {
  'use strict';
  const rules = window.GFFamilies.runner.rules, shell = window.GFShell, juice = window.GFJuice;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), eps = 1e-9, dChild = 1.09375, pChild = .64 / .7;
  function setup(w) {
    Object.assign(w, { n: 0, gate: null, lane: 1, fallUntil: 0, cheerUntil: 0, nextAt: .3, reveal: null,
      appearLog: [], botCount: 0, dist: 0, runPhase: 0, faded: [], coins: [], bits: [], streaks: [], widths: new Map(), sceneryCount: 8,
      scenery: Array.from({ length: 8 }, (_, i) => ({ k: i + 1, z: 1.5 * (i + 1) })), slide: null });
    w.maker = rules.maker(w.content, w.grade, w.rng); w.question = w.play.rule;
    w.lastT = rules.gateTime(1, w.grade);
  }
  function geometry(w) {
    const { w: W, h: H } = w.view, top = w.sceneTop;
    w.hy = top + .3 * (H - top); w.feetY = H - .06 * (H - top); w.childH = (H - top) / 4;
  }
  const xAt = (w, lane, d) => w.view.w / 2 + (lane - 1) * w.bottomW / (3 * d);
  const yAt = (w, d) => w.hy + (w.view.h - w.hy) / d;
  function textWidth(w, t, px) {
    const key = `${px}|${t}`; if (w.widths.has(key)) return w.widths.get(key);
    const h = Math.ceil(px * (t.includes('/') ? 1.6 : 1.15)); let lo = 0, hi = Math.ceil(([...t].length + 4) * px);
    while (!shell.fits(t, { w: hi, h }, { min: px, max: px, lines: 1, math: true })) hi *= 2;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (shell.fits(t, { w: mid, h }, { min: px, max: px, lines: 1, math: true })) hi = mid; else lo = mid + 1; }
    w.widths.set(key, lo); return lo;
  }
  function appearanceDepth(w, gate) {
    const need = Math.max(...gate.answers.map(t => textWidth(w, t, w.minPx))) + 2 * Math.round(.3 * w.minPx);
    return clamp((w.bottomW / 3) / (need + 24), 1.2 * dChild, 12);
  }
  function layout(w) {
    const { w: W, h: H, top } = w.view, size = `${W}x${H}`;
    if (w.layoutSize !== size) { w.sceneTop = w.topGoal = top; w.layoutSize = size; w.widths.clear(); }
    else w.topGoal = Math.max(w.topGoal, top);
    w.bottomW = (w.view.tall ? 1.1 : .9) * W;
    w.minPx = Math.round(34 * w.fontScale); w.labelPx = clamp(Math.round(.05 * W), w.minPx, 64);
    geometry(w); if (w.gate) w.gate.dApp = appearanceDepth(w, w.gate);
    w.colors = Object.fromEntries(Object.entries(w.art.palette).map(([key, color]) => { const n = parseInt(color.slice(1), 16), r = n >>> 16, g = n >>> 8 & 255, b = n & 255; return [key, (255 << 24 | b << 16 | g << 8 | r) >>> 0]; }));
  }
  function progress(w, gate = w.gate) {
    if (!gate) return null;
    return clamp(gate.chosen === null ? (w.time - gate.t0) / gate.T : gate.fc + (1 - gate.fc) * (w.time - gate.tc) / (gate.te - gate.tc), 0, 1);
  }
  const depth = (w, gate) => gate.dApp - (gate.dApp - dChild) * progress(w, gate);
  function gateShapes(w, gate, d) {
    const p = 1 / d, gap = w.bottomW / (3 * d), bottom = yAt(w, d);
    const shapes = gate.answers.map((t, i) => {
      const slot = w.art.slots[`gate-${i}`], plate = slot.anchors.plate;
      const gs = Math.min(.92 * gap / slot.w, 2.6 * w.childH * p / pChild / slot.h);
      const box = { x: xAt(w, i, d) - slot.w * gs / 2, y: bottom - slot.h * gs, w: slot.w * gs, h: slot.h * gs };
      return { box, plate, gs, cx: box.x + (plate.x + plate.w / 2) * gs, cy: box.y + (plate.y + plate.h / 2) * gs, text: t };
    });
    let px = Math.round(Math.min(w.labelPx, Math.max(w.minPx, w.labelPx * p / pChild))), boxes;
    do {
      boxes = shapes.map(s => {
        const width = Math.max(textWidth(w, s.text, px) + 2 * Math.round(.3 * px), s.plate.w * s.gs);
        const height = Math.max(Math.ceil(px * (s.text.includes('/') ? 1.6 : 1.15)) + 2 * Math.round(.12 * px), s.plate.h * s.gs);
        return { x: s.cx - width / 2, y: s.cy - height / 2, w: width, h: height, px, text: s.text };
      });
      if (boxes.slice(0, 2).every((b, i) => (b.w + boxes[i + 1].w) / 2 + 16 <= shapes[i + 1].cx - shapes[i].cx + eps) || px <= w.minPx) break;
      px--;
    } while (true);
    return { shapes, boxes };
  }
  function labels(w) { return w.gate ? gateShapes(w, w.gate, depth(w, w.gate)).boxes : []; }
  function lanePosition(w) { if (!w.slide) return w.lane; const f = clamp((w.time - w.slide.at) / .15, 0, 1); return w.slide.from + (w.lane - w.slide.from) * f; }
  function move(w, lane) { if (lane === w.lane) return; const from = lanePosition(w); w.lane = lane; w.slide = { from, at: w.time }; }
  function choose(w, lane, x, y) {
    const g = w.gate; if (!g || g.chosen !== null || w.time < w.fallUntil - eps) return;
    const boxes = labels(w); juice.react.press(w.fx, x ?? boxes[lane].x + boxes[lane].w / 2, y ?? boxes[lane].y + boxes[lane].h / 2);
    move(w, lane); g.chosen = lane; g.tc = w.time; g.te = Math.min(w.time + .4, g.t0 + g.T); g.fc = clamp((w.time - g.t0) / g.T, 0, 1);
  }
  function key(w, i) {
    if (w.time < w.fallUntil - eps || w.gate?.chosen !== null && w.gate) return;
    if (i >= 0 && i <= 2) choose(w, i);
    else if (!w.duo && i >= 3 && i <= 5) choose(w, i - 3);
    else if (!w.duo && (i === 6 || i === 7)) move(w, clamp(w.lane + (i === 6 ? -1 : 1), 0, 2));
    else if (!w.duo && i === 8) choose(w, w.lane);
  }
  function press(w, x, y) {
    if (!w.gate) return;
    const d = depth(w, w.gate); let best = 0;
    for (let i = 1; i < 3; i++) if (Math.abs(x - xAt(w, i, d)) < Math.abs(x - xAt(w, best, d))) best = i;
    choose(w, best, x, y);
  }
  function bot(w) {
    const g = w.gate; if (!g || g.chosen !== null || w.time < g.t0 + w.botDelay - eps) return null;
    return { key: rules.botChoice(w.botKind, ++w.botCount) ? g.right : [0, 1, 2].find(i => i !== g.right) };
  }
  function judge(w) {
    const gate = w.gate, lane = gate.chosen ?? w.lane, boxes = gateShapes(w, gate, dChild).boxes;
    const b = boxes[lane], x = b.x + b.w / 2, y = b.y + b.h / 2, childX = xAt(w, lanePosition(w), dChild);
    if (lane === gate.right) {
      const mult = 1 + w.combo.steps.filter(s => s <= w.combo.count + 1).length;
      const points = rules.points(mult, gate.chosen !== null && gate.tc - gate.t0 < gate.T / 2);
      const res = juice.react.right(w.fx, x, y, { points, combo: w.combo });
      w.score += points; w.stats.right++; w.stats.maxCombo = Math.max(w.stats.maxCombo, w.combo.count); w.mult = 1 + w.combo.level;
      if (res.levelUp) { w.streaks.push({ at: w.time }); juice.sfx.play('whoosh'); }
      w.coins.push({ at: w.time, x: childX, y: w.feetY - w.childH, size: w.childH * .4, rise: .5 * w.childH });
      for (let i = 0; i < 6; i++) w.bits.push({ at: w.time, x, y, vx: (i - 2.5) * 80 * w.fontScale, vy: -220 * w.fontScale, gravity: 700 * w.fontScale, size: w.childH * .18 });
      w.cheerUntil = w.time + .3; w.nextAt = w.time + .3;
    } else {
      juice.react.wrong(w.fx, childX, w.feetY - w.childH / 2, { combo: w.combo, flash: false, shake: [4, 200] });
      w.stats.wrong++; w.mult = 1; w.fallUntil = w.time + (w.duo ? 1.2 : 1); w.reveal = { answer: gate.answers[gate.right], until: w.time + 1.5 }; w.nextAt = w.time + 1.5;
    }
    w.faded.push({ ...gate, at: w.time, z: w.dist + dChild, speed: (gate.dApp - dChild) / gate.T }); w.gate = null;
  }
  function step(w, dt) {
    w.sceneTop = Math.min(w.topGoal, w.sceneTop + 300 * dt); geometry(w);
    const g = w.gate, fallen = w.time < w.fallUntil - eps;
    const speed = fallen ? 0 : g ? g.chosen === null ? (g.dApp - dChild) / g.T : (1 - g.fc) * (g.dApp - dChild) / (g.te - g.tc) : w.lastSpeed ?? .5;
    w.dist += speed * dt;
    if (!fallen) w.runPhase += dt * 60 / (g?.T ?? w.lastT) * (g && g.chosen !== null ? 2 : 1);
    w.scenery = w.scenery.filter(s => s.z - w.dist >= .6);
    while ((w.scenery.at(-1)?.z ?? w.dist) < w.dist + 12) w.scenery.push({ k: ++w.sceneryCount, z: (w.scenery.at(-1)?.z ?? w.dist) + 1.5 });
    w.faded = w.faded.filter(f => w.time - f.at < .3 - eps && f.z - w.dist >= .6);
    w.coins = w.coins.filter(c => w.time - c.at < .6); w.bits = w.bits.filter(b => w.time - b.at < .5); w.streaks = w.streaks.filter(s => w.time - s.at < .6);
    if (g && progress(w, g) >= 1 - eps) { w.lastSpeed = (g.dApp - dChild) / g.T; judge(w); }
    if (!w.gate && w.time >= w.nextAt - eps) {
      const item = w.maker.next(++w.n), deal = rules.deal(item, w.rng);
      w.gate = { ...deal, t0: w.time, T: rules.gateTime(w.mult, w.grade), dApp: 0, chosen: null, tc: null, te: null, fc: null };
      w.gate.dApp = appearanceDepth(w, w.gate); w.lastT = w.gate.T; w.question = item.q; w.reveal = null;
      w.appearLog.push({ n: w.n, q: item.q, form: item.form, top: w.sceneTop, boxes: labels(w) }); if (w.appearLog.length > 100) w.appearLog.shift();
    }
  }
  function road(w, g) {
    const W = w.view.w, H = w.view.h, ow = Math.ceil(W / 3), oh = Math.ceil((H - w.hy) / 3);
    if (!w.road || w.road.width !== ow || w.road.height !== oh) {
      const off = window.document.createElement('canvas'); off.width = ow; off.height = oh;
      const context = off.getContext('2d'), data = context.createImageData(ow, oh); w.road = off; w.roadContext = context; w.roadData = data; w.roadPixels = new Uint32Array(data.data.buffer);
    }
    const colors = w.colors, pixels = w.roadPixels;
    for (let y = 0; y < oh; y++) {
      const d = Math.min(60, oh / (y + .5)), p = 1 / d, z = w.dist + d;
      const roadColor = colors[Math.floor(z / .5) % 2 ? 'roadAlt' : 'road'], curb = colors[Math.floor(z / .25) % 2 ? 'curbB' : 'curbA'], grass = colors[Math.floor(z / .6) % 2 ? 'grassB' : 'grassA'];
      const half = .5 * w.bottomW * p, edge = .04 * w.bottomW * p, lineX = w.bottomW / 6 * p, lineW = Math.max(1, .012 * w.bottomW * p), stripe = Math.floor(z / .4) % 2 === 0;
      for (let x = 0; x < ow; x++) { const offset = Math.abs((x + .5) * W / ow - W / 2); pixels[y * ow + x] = offset <= half ? stripe && Math.abs(offset - lineX) <= lineW / 2 ? colors.line : roadColor : offset <= half + edge ? curb : grass; }
    }
    w.roadContext.putImageData(w.roadData, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(w.road, 0, w.hy, W, H - w.hy);
  }
  function drawGate(w, g, gate, d, alpha = 1) {
    const { shapes, boxes } = gateShapes(w, gate, d); g.save(); g.globalAlpha = alpha;
    shapes.forEach((s, i) => {
      shell.img(g, `gate-${i}`, s.box.x, s.box.y, s.box.w, s.box.h);
      const b = boxes[i]; g.fillStyle = '#fff4d6'; g.strokeStyle = '#3b2a1a'; g.lineWidth = 3;
      g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x, b.y, b.w, b.h);
      shell.text(g, b.text, b, { min: b.px, max: b.px, lines: 1, color: '#3b2a1a', outline: null, math: true });
    }); g.restore();
  }
  function childBox(w, lane = lanePosition(w)) {
    const fallen = w.time < w.fallUntil - eps, cheer = w.time < w.cheerUntil - eps, slot = fallen ? 'runner-fall' : cheer ? 'runner-cheer' : 'runner-run';
    const s = w.art.slots[slot], scale = w.childH / w.art.slots['runner-run'].h;
    const bob = fallen || cheer ? 0 : w.childH * .035 * Math.abs(Math.sin(Math.PI * w.runPhase / 2.5));
    return { slot, x: xAt(w, lane, dChild) - s.w * scale / 2, y: w.feetY - s.h * scale - bob, w: s.w * scale, h: s.h * scale };
  }
  function drawChild(w, g) {
    const b = childBox(w);
    shell.img(g, b.slot, b.x, b.y, b.w, b.h, b.slot === 'runner-run' ? Math.floor(w.runPhase) % 5 : 0);
  }
  function draw(w, g) {
    const sky = w.art.slots['bg-sky'], scale = Math.max(w.view.w / sky.w, w.hy / sky.anchors.horizon);
    shell.img(g, 'bg-sky', (w.view.w - sky.w * scale) / 2, w.hy - sky.anchors.horizon * scale, sky.w * scale, sky.h * scale); road(w, g);
    const objects = w.scenery.map(s => ({ d: s.z - w.dist, draw() {
      const slot = s.k % 3 === 2 ? 'shop' : 'tree', art = w.art.slots[slot], h1 = (slot === 'tree' ? .55 : .5) * (w.view.h - w.hy), width1 = h1 * art.w / art.h, d = s.z - w.dist;
      const x = w.view.w / 2 + (s.k % 2 ? 1 : -1) * (.5 * w.bottomW + .6 * width1) / d;
      shell.img(g, slot, x - width1 / d / 2, yAt(w, d) - h1 / d, width1 / d, h1 / d);
    } }));
    if (w.gate) { const d = depth(w, w.gate); objects.push({ d, draw: () => drawGate(w, g, w.gate, d) }); }
    for (const f of w.faded) { const d = f.z - w.dist; objects.push({ d, draw: () => drawGate(w, g, f, d, 1 - (w.time - f.at) / .3) }); }
    objects.push({ d: dChild, draw: () => drawChild(w, g) }); objects.sort((a, b) => b.d - a.d).forEach(o => o.draw());
    for (const c of w.coins) { const f = (w.time - c.at) / .6; g.save(); g.globalAlpha = 1 - f; shell.img(g, 'coin', c.x - c.size / 2, c.y - c.rise * f - c.size / 2, c.size, c.size); g.restore(); }
    for (const b of w.bits) { const t = w.time - b.at; g.save(); g.globalAlpha = 1 - t / .5; shell.img(g, 'bits', b.x + b.vx * t - b.size / 2, b.y + b.vy * t + .5 * b.gravity * t * t - b.size / 2, b.size, b.size); g.restore(); }
    for (const s of w.streaks) {
      const f = (w.time - s.at) / .6; g.save(); g.globalAlpha = .7 * (1 - f); g.strokeStyle = '#ffffff'; g.lineWidth = 3 * w.fontScale;
      for (let i = 0; i < 14; i++) { const angle = i * Math.PI * 2 / 14, dx = Math.cos(angle) * w.view.w, dy = Math.sin(angle) * w.view.h; g.beginPath(); g.moveTo(w.view.w / 2 + dx * (.8 - .4 * f), w.hy + dy * (.8 - .4 * f)); g.lineTo(w.view.w / 2 + dx * (.55 - .4 * f), w.hy + dy * (.55 - .4 * f)); g.stroke(); } g.restore();
    }
  }
  function gate(w) { return { n: w.n, f: progress(w), chosen: w.gate?.chosen ?? null, lane: w.lane, fallen: w.time < w.fallUntil - eps, fallLeft: Math.max(0, w.fallUntil - w.time) }; }
  function doors(w) {
    const entries = w.gate ? [{ gate: w.gate, d: depth(w, w.gate) }] : [];
    entries.push(...w.faded.map(f => ({ gate: f, d: f.z - w.dist })));
    return entries.flatMap(({ gate, d }) => { const { shapes, boxes } = gateShapes(w, gate, d); return [...shapes.map(s => s.box), ...boxes]; });
  }
  function effectBounds(w) {
    const y = Math.max(w.feetY - w.childH, ...labels(w).map(b => b.y + b.h + 8 + w.fx.shakeY));
    return { x: 0, y, w: w.view.w, h: w.view.h - y };
  }
  const cfg = { family: 'runner', combo: { steps: [5, 10, 15] }, setup, layout, step, draw, press, key, bot, hooks: { labels, appeared: w => w.appearLog, gate,
    children: w => [0, 1, 2].map(lane => childBox(w, lane)),
    doors, effectBounds } };
  window.GFFamilies.runner.engine = cfg; window.GFShell.play(cfg);
})();
