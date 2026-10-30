(function () {
  'use strict';
  const rules = window.GFFamilies.mole.rules, shell = window.GFShell, juice = window.GFJuice;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const pixel = w => w.art.pixel !== false;
  const layoutSlot = (w, name) => w.art.slots[name].layout || w.art.slots[name];
  function pose(w, m) {
    if (!pixel(w)) return m.visual && w.juice.clock < m.visual.contact ? 'mole-up' : m.pose || m.sprite;
    const elapsed = m.visual ? (w.juice.clock - m.visual.contact) * 1000 : -1;
    let name = 'mole-up';
    if (elapsed >= 0 && m.right) {
      const hitMs = Math.min(m.visual.dizzyMs, w.juice.feel.moments.right?.squash?.ms ?? 220);
      name = elapsed < hitMs ? 'mole-hit' : elapsed < hitMs + (m.visual.dizzyMs - hitMs) / 2 ? 'mole-dizzy-1' : 'mole-dizzy-2';
    } else if (elapsed >= 0) name = elapsed % Math.max(1, m.visual.dizzyMs) < m.visual.dizzyMs / 2 ? 'mole-taunt' : 'mole-wink-2';
    else if (m.state === 'up' && !w.effectsOff) {
      const idle = w.juice.feel.moments.idle || {}, period = Math.max(1, (idle.blinkEvery?.[0] ?? 2000) + (m.hole / 8) * ((idle.blinkEvery?.[1] ?? 4000) - (idle.blinkEvery?.[0] ?? 2000)));
      name = w.juice.clock * 1000 % period < (idle.blinkMs ?? 120) ? 'mole-blink' : Math.floor(w.juice.clock * (idle.bobHz ?? 1.2) * 2) % 2 ? 'mole-idle-2' : 'mole-up';
    }
    if (m.golden) name = name.replace('mole-', 'gold-mole-');
    return w.art.slots[name] ? name : m.sprite;
  }
  function pixelImage(w, g, name, x, y, width, height, fx, scale) {
    const s = w.art.slots[name]; if (!s) return;
    const k = scale ?? Math.max(1, Math.min(s.maxScale ?? Infinity, Math.round(Math.min(width / s.w, height / s.h))));
    const dw = s.w * k, dh = s.h * k;
    shell.img(g, name, Math.round(x + (width - dw) / 2), Math.round(y + height - dh), dw, dh, 0, fx && { flash: fx.flash, tint: fx.tint });
  }
  function pixelHole(w, g, name, hole) {
    const s = w.art.slots[name]; if (!s) return;
    const k = Math.max(1, Math.min(s.maxScale ?? Infinity, Math.round(hole.w / s.w)));
    shell.img(g, name, Math.round(hole.x - s.w * k / 2), Math.round(hole.y - s.h * k / 2), s.w * k, s.h * k);
  }
  function pixelBoardScale(w, shape) {
    const board = w.art.slots['sign-blank'];
    let k = Math.max(1, Math.min(board.maxScale ?? Infinity, Math.ceil(shape.sign.w / board.w)));
    if (w.immersion) {
      k = Math.max(1, Math.min(k, Math.floor((w.view.w - 16) / board.w)));
    }
    return k;
  }
  function pixelBodyScale(w, shape) {
    const up = w.art.slots['mole-up'], board = w.art.slots['sign-blank'];
    let k = Math.max(1, Math.min(up.maxScale ?? Infinity, Math.round(Math.min(shape.box.w / up.w, shape.box.h / up.h))));
    if (w.immersion && up.ink && board) {
      const boardK = pixelBoardScale(w, shape);
      while (k > 1 && Math.round(shape.box.y + shape.box.h - up.h * k) + up.ink[1] * k - board.h * boardK - 6 < w.view.top + 8) k--;
    }
    return k;
  }
  function pixelSign(w, shape, offset) {
    const board = w.art.slots['sign-blank'], up = w.art.slots['mole-up'];
    if (!board || !up.ink) return { ...shape.sign, y: shape.sign.y + offset };
    const bodyScale = pixelBodyScale(w, shape);
    const headY = Math.round(shape.box.y + offset + shape.box.h - up.h * bodyScale) + up.ink[1] * bodyScale;
    const k = pixelBoardScale(w, shape), x = Math.round(shape.sign.x + shape.sign.w / 2 - board.w * k / 2);
    return { x:w.immersion ? clamp(x, 8, w.view.w - board.w * k - 8) : x, y: Math.round(headY - board.h * k - 6), w: board.w * k, h: board.h * k };
  }
  function setup(w) {
    Object.assign(w, { holes: [], moles: [], visualMoles:[], card: null, hammer: null, dirt: [], cooldownUntil: .4, botCount: 0, bg: null, oneLine: new Set() });
    w.question = w.play.rule;
    w.adapt = w.learning && !w.duo && !w.practice ? window.GFLearn.adapt.create({grade:w.grade,packs:{base:w.content.mix[w.grade],order:Object.keys(w.content.bands)},warmup:0}) : null;
    w.reask = w.learning && !w.duo && !w.practice ? window.GFLearn.reask.create({rng:w.rng}) : null;
    w.picker = rules.picker(w.content, w.grade, w.rng, w.adapt);
    w.practiceIndex = 0; w.pendingReask = null;
    w.warmupCount = 0;
    w.specialTimes = w.immersion && !w.practice ? rules.specialTimes(w.specialRng, w.duo) : [];
    w.specialIndex = 0;
    for (const item of Object.values(w.content.bands).flat()) if (item.wrong.some(word => word.replace(/\s/g, '') === item.right.replace(/\s/g, ''))) for (const word of [item.right, ...item.wrong]) w.oneLine.add(word);
  }
  function geometry(w, hole, k = 1, sprite = 'mole-up') {
    const s = layoutSlot(w, sprite), a = s.anchors, sc = hole.w / a.holeW * k, clipY = hole.y + .25 * hole.h;
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
    const { w: W, top } = w.view, H=w.view.h-(w.cardReserve||0), slot = W / H >= 1 ? 'bg-wide' : 'bg-tall', s = layoutSlot(w, slot), up = layoutSlot(w, 'mole-up').anchors;
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
  function review(w, item, kind) {
    if (!w.learning || w.duo || w.practice) return;
    const row = w.review.find(r=>r.item===item);
    if (row) {if(kind==='wrong')row.kind='wrong';row.overcome=false;}
    else w.review.push({item,kind,overcome:false});
  }
  function judgeLearn(w, kind, m) {
    if (!w.adapt || m.warmup) return;
    const before=w.adapt.level();
    if(kind!=='missed')w.adapt.judge(kind==='right');
    if(m.right)w.adapt.stay.note(kind);
    if(before!==w.adapt.level())w.record('adapt',{level:w.adapt.level()});
  }
  // Hitting a re-asked word's right form, or holding back on its wrong form, overcomes it.
  function overcome(w,m,delayMs=0) {
    const row=w.review.find(r=>r.item===m.item);if(row)row.overcome=true;
    w.reask?.result(m.item,'right',w.roundTime);
    if(!w.practice){w.score+=15;w.stats.overcome++;}
    const h=w.holes[m.hole];w.juice.moment('overcome',{x:h.x,y:h.y,points:w.practice?undefined:15,item:m.item,delayMs});
  }
  function step(w, dt) {
    const keep = [];
    for (const m of w.moles) {
      const elapsed = w.time - m.stateAt;
      if (m.state === 'rise' && elapsed >= .15 - 1e-9) transition(w, m, 'up');
      else if (m.state === 'up' && elapsed >= m.upTime - 1e-9 || m.state === 'hit' && elapsed >= .35 - 1e-9 || m.state === 'taunt' && elapsed >= .5 - 1e-9) transition(w, m, 'fall');
      else if (m.state === 'fall' && elapsed >= .15 - 1e-9) {
        if (m.hittable && !m.quiet && !m.golden) {
          const h = w.holes[m.hole];
          if (m.right) { w.combo.miss(); w.stats.missed++; w.mult = 1; w.juice.moment('miss',{x:h.x,y:h.y,item:m.item}); w.judge?.('miss'); review(w,m.item,'missed');judgeLearn(w,'missed',m);if(m.reask)w.reask?.result(m.item,'missed',w.roundTime); }
          else if (m.reask) overcome(w,m);
          else { w.score += 3; w.fx.text(h.x, h.y, '잘 참았어요', { size: Math.round(26 * w.fontScale) }); }
        }
        w.cooldownUntil = w.time + (.25 + w.rng() * .45) * (w.fever?.active ? .8 : 1) * (w.adapt?.spawnSlow() || 1); continue;
      }
      keep.push(m);
    }
    w.moles = keep;
    for (const d of w.dirt) { d.age += dt; d.vy += 600 * w.fontScale * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    w.dirt = w.dirt.filter(d => d.age < .4);
    if (!w.learning && w.card && w.time >= w.card.until - 1e-9) w.card = null;
    w.visualMoles=w.visualMoles.filter(m=>w.juice.clock<m.visual.until);
    const limit = w.practice ? 2 : w.immersion && w.warmupCount < 3 ? 1 : Math.min(rules.maxUp(w.time),w.adapt?.level()===-2?2:3);
    if (w.card && !w.learning || w.time < w.cooldownUntil - 1e-9 || w.moles.length >= limit) return;
    // Keep easy rounds from buying extra scoring opportunities through fewer decoys.
    if(w.adapt?.level()<0&&w.time<(w.lastOrdinarySpawn??-Infinity)+(rules.upTime(w.time)+.3)*(w.adapt.spawnSlow()))return;
    if(w.practice) {if(!w.moles.length)spawnItem(w,w.practice.items[w.practiceIndex++%w.practice.items.length],true);}
    else spawn(w);
  }
  function roundStep(w) {
    const specialDue=w.specialIndex < w.specialTimes.length && w.roundTime >= w.specialTimes[w.specialIndex] - 1e-9;
    if(w.reask&&!specialDue&&!w.card&&!w.moles.some(m=>m.golden||m.reask&&m.hittable)) {
      w.pendingReask ||= w.reask.due(w.roundTime);
      if(w.pendingReask&&spawnItem(w,w.pendingReask,true))w.pendingReask=null;
    }
    if (specialDue && !(w.adapt?.level()===-2 && w.moles.some(m=>m.reask&&m.hittable))) {
      // An announced special replaces ordinary occupants without a missed-word penalty.
      w.moles = w.moles.filter(m=>m.reask&&m.hittable);
      if (spawn(w, true)) w.specialIndex++;
    }
  }
  // A re-asked word comes back alone, as either its right or its wrong form, in place of the ordinary occupants.
  function spawnItem(w,item,reask) {
    const right=w.rng()<.5,word=right?item.right:item.wrong[Math.floor(w.rng()*item.wrong.length)];
    const holes=w.holes.flatMap((h,i)=>{if(!h.usable)return [];const k=fitK(w,h,word);return k===null?[]:[{i,k,box:geometry(w,h,k).box}];});
    if(!holes.length)return false;
    const {i,k,box}=holes[Math.floor(w.rng()*holes.length)],h=w.holes[i];
    const mole={hole:i,k,box,reask,item,word,right,golden:false,warmup:false,state:'rise',t0:w.time,stateAt:w.time,hittable:true,sprite:'mole-up',upTime:rules.upTime(w.time),botDecided:false,quiet:false};
    w.moles=[mole];w.juice.moment('rise',{x:h.x,y:h.y,target:mole,item});
    if(reask&&!w.practice)w.record('reask',{right:item.right,at:w.roundTime});
    w.cooldownUntil=w.time+.5;return true;
  }
  function spawn(w, golden = false) {
    const warmup = w.immersion && w.warmupCount < 3 && !golden;
    for (let attempt = 0; attempt < 5; attempt++) {
      const choice = w.picker.next(golden || warmup), holes = [];
      if (rules.clash(rules.shown(w), choice.item)) continue;
      w.holes.forEach((hole, i) => {
        if (!hole.usable || w.moles.some(m => m.hole === i)) return;
        const k = fitK(w, hole, choice.word);
        if (k !== null) { const box = geometry(w, hole, k).box; if (!w.moles.some(m => overlap(box, m.box))) holes.push({ i, k, box }); }
      });
      if (!holes.length) continue;
      const { i, k, box } = holes[Math.floor(w.rng() * holes.length)], hole = w.holes[i];
      const mole={ hole: i, ...choice, golden, warmup, state: 'rise', t0: w.time, stateAt: w.time, hittable: true, k, box, sprite: 'mole-up', upTime: golden ? 1 : rules.upTime(w.time) * (warmup ? 1.3 : w.adapt?.stay.factor() || 1) + rules.readTime(choice.word), botDecided: false, quiet: false };
      if (warmup) w.warmupCount++;
      if(!golden)w.lastOrdinarySpawn=w.time;
      w.moles.push(mole);w.juice.moment('rise',{x:hole.x,y:hole.y,target:mole,item:mole.item});
      if (golden) { const row = w.juice.moment('special', {x:hole.x,y:hole.y,target:mole,item:mole.item}); row.params.at = w.roundTime; }
      w.cooldownUntil = w.time + (.25 + w.rng() * .45) * (w.fever?.active ? .8 : 1) * (w.adapt?.spawnSlow() || 1); return true;
    }
    w.cooldownUntil = w.time + .2;
  }
  function swingShape(w) { return w.juice.feel.moments.swing || {windupDeg:-15,windupMs:40,strikeDeg:40,strikeMs:60,holdMs:80,backMs:120}; }
  function contactMs(w) { const s=swingShape(w);return s.windupMs===0?0:s.windupMs+s.strikeMs; }
  function swing(w, x, y, hole, hit=false) { w.hammer = { x, y, height: (hole || w.holes[7]).w * 1.1, t0: w.juice.clock };w.juice.moment('swing',{x,y,hit}); }
  function whiff(w, x, y, hole) { swing(w, x, y, hole); }
  function bodyTarget(w, m) {
    const hole = w.holes[m.hole], slot = layoutSlot(w, m.sprite), a = slot.anchors, sc = hole.w / a.holeW * m.k;
    const shape = geometry(w, hole, m.k, m.sprite), bodyTop = a.sign ? a.sign.y + a.sign.h : 0;
    return { x: hole.x, y: shape.box.y + (bodyTop + a.base.y) / 2 * sc };
  }
  function hit(w, m) {
    if (!m.hittable || w.card && !w.learning) return;
    const h = w.holes[m.hole], { x, y } = bodyTarget(w, m);
    m.hittable = false; swing(w, x, y, h,true);
    const delayMs=contactMs(w),dizzyMs=w.juice.feel.moments.dizzy?.ms??400,sinkMs=w.juice.feel.moments.sink?.ms??180;
    m.visual={contact:w.juice.clock+delayMs/1000,dizzyMs,sinkMs,until:w.juice.clock+(delayMs+dizzyMs+sinkMs)/1000};w.visualMoles.push(m);
    if (m.right) {
      w.closeCard?.();
      const points = rules.points(w.combo.steps.filter(s => w.combo.count + 1 >= s).length) * w.boost;
      const suppressText=!!m.reask;
      w.combo.hit();w.juice.moment('right',{x,y,target:m,points,combo:w.combo.count,item:m.item,delayMs,suppressText});
      if(window.GFFeel?.comboTier(w.juice.feel,w.combo.count))w.juice.moment('combo',{x,y,combo:w.combo.count,delayMs,suppressText});
      w.juice.moment('dizzy',{x,y,target:m,delayMs});w.juice.moment('sink',{x,y,target:m,delayMs:delayMs+dizzyMs});
      w.score += points + (m.golden ? 50 : 0); w.stats.right++; w.stats.maxCombo = Math.max(w.stats.maxCombo, w.combo.count); w.mult = 1 + w.combo.level;
      if (m.golden) { w.stats.special++; w.juice.moment('specialGet', {x,y,target:m,points:50,item:m.item,delayMs}); }
      w.judge?.('right');
      judgeLearn(w,'right',m);if(m.reask)overcome(w,m,delayMs);
      m.sprite = 'mole-hit'; transition(w, m, 'hit');
    } else {
      w.hammer.bounce = true;
      if (!w.protectCombo?.()) w.combo.miss();w.juice.moment('wrong',{x,y,target:m,item:m.item,delayMs});w.juice.moment('sink',{x,y,target:m,delayMs:delayMs+dizzyMs});w.stats.wrong++; if (w.duo) w.score = Math.max(0, w.score - 10); w.mult = 1;
      w.judge?.('wrong');
      m.sprite = 'mole-taunt'; transition(w, m, 'taunt');
      if(w.learning) {
        review(w,m.item,'wrong');judgeLearn(w,'wrong',m);
        if(m.reask)w.reask?.result(m.item,'wrong',w.roundTime);else w.reask?.add(m.item,w.roundTime,w.roundTime+w.timeLeft);
        w.showCard({...m.item,selectedWrong:m.word},'wrong');
      } else w.card = { wrong: m.word, right: m.item.right, tip: m.item.tip, until: w.time + (w.duo ? 1 : 1.5) };
      if(!w.duo&&!w.practice&&!w.modeSession)w.lives=Math.max(0,w.family.round.lives-w.stats.wrong);
    }
    m.box = geometry(w, h, m.k, m.sprite).box;
  }
  function key(w, i) {
    if (w.card && !w.learning) return;
    const n = (w.duo ? 3 : 0) + i, hole = w.holes[n];
    if (!hole?.usable) return;
    const m = w.moles.find(m => m.hole === n);
    if (m?.hittable) hit(w, m);
    else { const target = m ? bodyTarget(w, m) : hole; whiff(w, target.x, target.y, hole); }
  }
  function press(w, x, y) {
    if (w.card && !w.learning) return;
    const m = w.moles.filter(m => {
      const b = m.box; return m.hittable && x >= b.x - b.w * .05 && x <= b.x + b.w * 1.05 && y >= b.y - b.h * .05 && y <= b.y + b.h * 1.05;
    }).sort((a, b) => w.holes[b.hole].y - w.holes[a.hole].y)[0];
    if (m) hit(w, m); else whiff(w, x, y);
  }
  function bot(w) {
    if (w.card && !w.learning) return null;
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
    // 놀 때는 이유를 적지 않는다(끝난 뒤 복습 카드에서만).
    const height = pad * 2 + mainH;
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
    g.restore();
  }
  function draw(w, g) {
    const b = w.bg, s = w.art.slots[b.slot];
    if (pixel(w)) {
      const k = Math.max(1, Math.ceil(Math.max(w.view.w / s.w, w.view.h / s.h)));
      shell.img(g, b.slot, Math.round((w.view.w - s.w * k) / 2), Math.round((w.view.h - s.h * k) / 2), s.w * k, s.h * k);
      for (const [i, name] of ['cloud-1', 'cloud-2'].entries()) {
        const c = w.art.slots[name]; if (!c) continue;
        const scale = Math.max(1, Math.min(c.maxScale ?? Infinity, Math.round(w.view.w / 480)));
        shell.img(g, name, Math.round(((w.juice.clock * (3 + i) + w.view.w * (.1 + i * .55)) % (w.view.w + c.w * scale)) - c.w * scale), Math.max(0, Math.round(w.view.top - c.h * scale - 12)), c.w * scale, c.h * scale);
      }
    } else {
    if (b.dy > 0) shell.img(g, b.slot, b.dx, 0, b.dw, b.dy, 0, { x: 0, y: 0, w: s.w, h: 1 });
    if (b.dw < w.view.w) {
      shell.img(g, b.slot, 0, b.dy, b.dx + 1, b.dh, 0, { x: 0, y: 0, w: 1, h: s.h });
      shell.img(g, b.slot, b.dx + b.dw - 1, b.dy, w.view.w - b.dx - b.dw + 1, b.dh, 0, { x: s.w - 1, y: 0, w: 1, h: s.h });
      if (b.dy > 0) { shell.img(g, b.slot, 0, 0, b.dx + 1, b.dy, 0, { x: 0, y: 0, w: 1, h: 1 }); shell.img(g, b.slot, b.dx + b.dw - 1, 0, w.view.w - b.dx - b.dw + 1, b.dy, 0, { x: s.w - 1, y: 0, w: 1, h: 1 }); }
    }
    shell.img(g, b.slot, b.dx, b.dy, b.dw, b.dh);
    }
    const visible = [...w.moles.filter(m=>!m.visual),...w.visualMoles.filter(m=>w.juice.clock<m.visual.until)];
    for (const [index, hole] of w.holes.entries()) {
      if (pixel(w)) pixelHole(w, g, 'hole-back', hole);
      for (const m of visible.filter(m => m.hole === index)) {
      const visual=m.visual,slot=pose(w, m);
      const shape = geometry(w, w.holes[m.hole], m.k, pixel(w) ? 'mole-up' : slot), elapsed = w.time - m.stateAt;
      const idle=w.juice.feel.moments.idle||{},bob=!pixel(w)&&!w.effectsOff&&m.state==='up'?Math.sin(w.juice.clock*Math.PI*2*(idle.bobHz||0))*(idle.bobPx||0)*w.fontScale:0;
      const sink=visual?clamp((w.juice.clock-visual.contact-visual.dizzyMs/1000)/(visual.sinkMs/1000),0,1):m.state==='fall'?clamp(elapsed/.15,0,1):0;
      const offset = ((m.state === 'rise' && !visual ? 1 - clamp(elapsed / .15, 0, 1) : sink) * (shape.clipY - shape.box.y))+bob;
      g.save(); g.beginPath(); g.rect(0, 0, w.view.w, pixel(w) ? Math.round(shape.clipY) : shape.clipY); g.clip();
      if (pixel(w)) pixelImage(w, g, slot, shape.box.x, shape.box.y + Math.round(offset), shape.box.w, shape.box.h, m, pixelBodyScale(w, shape));
      else shell.img(g, slot, shape.box.x, shape.box.y + offset, shape.box.w, shape.box.h,0,m);
      if (!visual || w.juice.clock < visual.contact) {
        const pivot={x:shape.box.x+shape.box.w/2,y:shape.box.y+offset+shape.box.h};
        g.save();
        if (!pixel(w)) {g.translate(pivot.x,pivot.y);g.rotate(m.rot||0);g.scale(m.sx??1,m.sy??1);g.translate(-pivot.x,-pivot.y);}
        const sign = pixel(w) ? pixelSign(w, shape, offset) : { ...shape.sign, y: shape.sign.y + offset };
        if (pixel(w)) shell.img(g, 'sign-blank', sign.x, sign.y, sign.w, sign.h);
        const pad = pixel(w) ? Math.max(2, sign.w / w.art.slots['sign-blank'].w * 2) : 0;
        shell.text(g, m.word, { x: sign.x + pad, y: sign.y + pad, w: sign.w - pad * 2, h: sign.h - pad * 2 }, { min: 32 * w.fontScale, max: Math.round(64 * w.fontScale), lines: w.oneLine.has(m.word) ? 1 : 2, color: '#3b2a1a', outline: null });
        g.restore();
      }
      g.restore();
      }
      if (pixel(w)) pixelHole(w, g, 'hole-front', hole);
    }
    for (const d of w.dirt) shell.img(g, 'dirt', d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
    if (w.card && !w.learning) card(w, g);
    if (w.hammer && !w.effectsOff) {
      if (pixel(w)) {
        const h = w.hammer, elapsed = (w.juice.clock - h.t0) * 1000, s = swingShape(w), contact = contactMs(w);
        if (elapsed >= contact + s.holdMs + s.backMs) return;
        const name = elapsed < contact ? 'hammer-windup' : elapsed < contact + s.holdMs ? 'hammer-strike' : 'hammer-return';
        const slot = w.art.slots[name]; if (!slot) return;
        const k = Math.max(1, Math.min(slot.maxScale ?? Infinity, Math.round(h.height / slot.h))), strike = w.art.slots['hammer-strike'].anchors;
        const pivotX = Math.round(h.x - (strike.head.x - strike.grip.x) * k), pivotY = Math.round(h.y - (strike.head.y - strike.grip.y) * k);
        const bounce=h.bounce?clamp((elapsed-contact)/s.backMs,0,1):0;
        g.save();g.translate(pivotX,pivotY-bounce*holeLift(w,h));if(bounce)g.rotate(-bounce*1.8);
        shell.img(g, name, -slot.anchors.grip.x * k, -slot.anchors.grip.y * k, slot.w * k, slot.h * k);g.restore();
        return;
      }
      const h = w.hammer, elapsed = (w.juice.clock - h.t0)*1000, slot = w.art.slots.hammer, a = slot.anchors, sc = h.height / slot.h,s=swingShape(w),contact=contactMs(w);
      if(elapsed>=contact+s.holdMs+s.backMs)return;
      const mix=(from,to,t)=>from+(to-from)*clamp(t,0,1);
      const deg=elapsed<s.windupMs?mix(0,s.windupDeg,elapsed/Math.max(1,s.windupMs)):elapsed<contact?mix(s.windupDeg,s.strikeDeg,(elapsed-s.windupMs)/Math.max(1,s.strikeMs)):elapsed<contact+s.holdMs?s.strikeDeg:mix(s.strikeDeg,0,(elapsed-contact-s.holdMs)/Math.max(1,s.backMs));
      // Clockwise raises this sprite; a resting 40 degrees makes the strike land flat.
      const angle = (40-deg)*Math.PI/180;
      const pivotX = h.x - (a.head.x - a.grip.x) * sc, pivotY = h.y - (a.head.y - a.grip.y) * sc;
      const after=s.afterimage?.on&&!w.fxScreen.light&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&elapsed>=s.windupMs&&elapsed<contact;
      if(after){g.save();g.globalAlpha=.22;g.translate(pivotX,pivotY);g.rotate(angle+.2);shell.img(g,'hammer',-a.grip.x*sc,-a.grip.y*sc,slot.w*sc,slot.h*sc);g.restore();}
      g.save(); g.translate(pivotX, pivotY); g.rotate(angle); shell.img(g, 'hammer', -a.grip.x * sc, -a.grip.y * sc, slot.w * sc, slot.h * sc); g.restore();
    }
  }
  function holeLift(w,h) { return h.height*.8; }
  function fits(w, word) { return w.holes.some(h => h.usable && fitK(w, h, word) !== null); }
  function effectLabels(w) {
    return [...w.moles.filter(m => m.sprite === 'mole-up'),...w.visualMoles.filter(m=>w.juice.clock<m.visual.contact)].map(m => {
      const shape = geometry(w, w.holes[m.hole], m.k, 'mole-up'), elapsed = w.time - m.stateAt;
      const offset = (m.state === 'rise' ? 1 - clamp(elapsed / .15, 0, 1) : m.state === 'fall' ? clamp(elapsed / .15, 0, 1) : 0) * (shape.clipY - shape.box.y);
      const shake=w.juice.shakeOffset(),pad=4+Math.abs((w.juice.feel.moments.idle?.bobPx||0)*w.fontScale);
      if (pixel(w)) {
        const sign = pixelSign(w, shape, offset);
        return { x: sign.x + Math.round(shake.x) - pad, y: sign.y + Math.round(shake.y) - pad, w: sign.w + pad * 2, h: sign.h + pad * 2 };
      }
      const pivot={x:shape.box.x+shape.box.w/2,y:shape.box.y+offset+shape.box.h},angle=pixel(w)?0:m.rot||0;
      const corners=[0,1].flatMap(i=>[0,1].map(j=>{
        const x=(shape.sign.x+shape.sign.w*i-pivot.x)*(pixel(w)?1:m.sx??1),y=(shape.sign.y+offset+shape.sign.h*j-pivot.y)*(pixel(w)?1:m.sy??1);
        return {x:pivot.x+x*Math.cos(angle)-y*Math.sin(angle),y:pivot.y+x*Math.sin(angle)+y*Math.cos(angle)};
      }));
      const x0=Math.min(...corners.map(p=>p.x)),x1=Math.max(...corners.map(p=>p.x)),y0=Math.min(...corners.map(p=>p.y)),y1=Math.max(...corners.map(p=>p.y));
      return { x: x0 + w.fx.shakeX + shake.x - pad, y: y0 + w.fx.shakeY + shake.y - pad, w: x1-x0 + pad*2, h: y1-y0 + pad*2 };
    });
  }
  function effectBounds(w){return {x:8,y:w.view.top+8,w:w.view.w-16,h:Math.max(0,w.view.h-w.view.top-16)};}
  function effectSprite(w, g, p) {
    const name = p.shape === 'star' ? 'fx-star' : p.shape === 'dot' ? 'fx-dot' : ['dirt', 'dust'].includes(p.shape) ? 'dirt' : null;
    if (!pixel(w) || !name || !w.art.slots[name]) return false;
    pixelImage(w, g, name, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); return true;
  }
  function effectImpact(w, g, e) {
    if (!pixel(w) || !w.art.slots['fx-impact']) return false;
    const size = 64 * w.fontScale;
    pixelImage(w, g, 'fx-impact', e.c.x - size / 2, e.c.y - size / 2, size, size); return true;
  }
  function learnCard(w, item) {
    const wrong=item.selectedWrong || item.wrong[0], right=item.right;
    return {wrong,right,note:item.tip || `바르게 쓰면 ${right}`,diff:window.GFLearn.diff(wrong,right)};
  }
  const cfg = { family: 'mole', compactHUD:true, ruleIntro:true, cacheHUDGeometry:true, combo: { steps: [5, 10, 15] }, setup, layout, step, draw, press, key, bot, hooks: { fits, effectLabels, effectBounds, effectSprite, effectImpact, roundStep, card:learnCard } };
  window.GFMoleYard?.attach(cfg);
  window.GFFamilies.mole.engine = cfg;
  if (window.GFMoleYard) window.GFMoleYard.ready.then(() => window.GFShell.play(cfg)).catch(error => {
    console.error(`art/: ${error.message}`);
    if (typeof document !== 'undefined') {
      const node=document.createElement('section');node.className='gf-load-error';node.dataset.test='load-error';node.textContent='활동을 불러오지 못했어요';document.body.replaceChildren(node);
      window.__GAME={state:()=> 'error'};window.GF.ready();
    }
  });
  else window.GFShell.play(cfg);
})();
