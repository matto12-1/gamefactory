(function () {
  'use strict';
  const rules = window.GFFamilies.runner.rules, shell = window.GFShell, juice = window.GFJuice;
  const scene = window.GFRunnerScene;
  const rebuilt = w => scene?.enabled(w);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), eps = 1e-9, dChild = 1.09375, pChild = .64 / .7;
  function setup(w) {
    window.document?.querySelector?.(`.gf-runner-sky[data-side="${w.side}"]`)?.remove();
    Object.assign(w, { n: 0, gate: null, lane: 1, fallUntil: 0, cheerUntil: 0, nextAt: .3, reveal: null,
      appearLog: [], botCount: 0, dist: 0, runPhase: 0, faded: [], coins: [], bits: [], streaks: [], widths: new Map(), sceneryCount: 8,
      scenery: Array.from({ length: 8 }, (_, i) => ({ k: i + 1, z: 1.5 * (i + 1) })), slide: null, stride:0, practiceIndex:0, specialIndex:0,imageCache:new Map(),geometryCache:new WeakMap() });
    w.maker = rules.maker(w.content, w.grade, w.rng); w.question = w.play.rule;
    w.reask=w.learning&&!w.duo&&!w.practice?window.GFLearn.reask.create({rng:w.rng,end:w.family.round.seconds}):null;
    w.adapt=w.learning&&!w.duo&&!w.practice?window.GFLearn.adapt.runner():null;
    const duration=w.duo?w.family.round.duoSeconds:w.family.round.seconds;
    const count=w.immersion&&!w.practice?1+Math.floor(w.specialRng()*2):0;
    w.specialTimes=Array.from({length:count},(_,i)=>(w.duo?15:25)+(duration-(w.duo?30:45))*(i+w.specialRng())/count).sort((a,b)=>a-b);
    w.lastT = rules.gateTime(1, w.grade);
    if (rebuilt(w)) scene.setup(w);
  }
  function geometry(w) {
    if (rebuilt(w)) { scene.layout(w); return; }
    const W=w.view.w, H=w.view.h-(w.cardReserve||0), top = w.sceneTop;
    w.hy = top + .3 * (H - top); w.feetY = H - .06 * (H - top); w.childH = (H - top) / 4;
  }
  const xAt = (w, lane, d) => w.view.w / 2 + (lane - 1) * w.bottomW / (3 * d);
  const yAt = (w, d) => w.hy + (w.view.h - (w.cardReserve||0) - w.hy) / d;
  function textWidth(w, t, px) {
    const key = `${px}|${t}`; if (w.widths.has(key)) return w.widths.get(key);
    const h = Math.ceil(px * (t.includes('/') ? 1.6 : 1.15)); let lo = 0, hi = Math.ceil(([...t].length + 4) * px);
    while (!shell.fits(t, { w: hi, h }, { min: px, max: px, lines: 1, math: true })) hi *= 2;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (shell.fits(t, { w: mid, h }, { min: px, max: px, lines: 1, math: true })) hi = mid; else lo = mid + 1; }
    w.widths.set(key, lo); return lo;
  }
  function appearanceDepth(w, gate) {
    if (rebuilt(w)) return scene.pace(w).depth;
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
    w.paletteKey=Object.values(w.colors).join(':');
    if (rebuilt(w)) scene.layout(w);
  }
  function progress(w, gate = w.gate) {
    if (!gate) return null;
    return clamp(gate.chosen === null ? (w.time - gate.t0) / gate.T : gate.fc + (1 - gate.fc) * (w.time - gate.tc) / (gate.te - gate.tc), 0, 1);
  }
  const depth = (w, gate) => gate.dApp - (gate.dApp - dChild) * progress(w, gate);
  function gateShapes(w, gate, d) {
    if (rebuilt(w)) return scene.shapes(w, gate, d);
    const cached=w.geometryCache.get(gate);
    if(cached&&cached.d===d&&cached.hy===w.hy&&cached.W===w.view.w&&cached.H===w.view.h&&cached.reserve===w.cardReserve&&cached.childH===w.childH&&cached.bottomW===w.bottomW&&cached.minPx===w.minPx&&cached.labelPx===w.labelPx&&cached.answers===gate.answers)return cached.result;
    const p = 1 / d, gap = w.bottomW / (3 * d), bottom = yAt(w, d);
    const shapes = gate.answers.map((t, i) => {
      const art = w.art.slots[`gate-${i}`], slot = art.layout || art, plate = slot.anchors.plate;
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
    const result={shapes,boxes};w.geometryCache.set(gate,{d,hy:w.hy,W:w.view.w,H:w.view.h,reserve:w.cardReserve,childH:w.childH,bottomW:w.bottomW,minPx:w.minPx,labelPx:w.labelPx,answers:gate.answers,result});return result;
  }
  function labels(w) { return w.gate ? gateShapes(w, w.gate, depth(w, w.gate)).boxes : []; }
  function lanePosition(w) { if (!w.slide) return w.lane; const f = clamp((w.time - w.slide.at) / .15, 0, 1); return w.slide.from + (w.lane - w.slide.from) * f; }
  function move(w, lane) { if (lane === w.lane) return; const from = lanePosition(w); w.lane = lane; w.slide = { from, at: w.time }; w.juice.moment('lane',{x:xAt(w,lane,dChild),y:w.feetY}); }
  function choose(w, lane, x, y) {
    if(rebuilt(w)&&!w.gate){move(w,lane);return;}
    const g = w.gate; if (!g || g.chosen !== null || w.time < w.fallUntil - eps) return;
    const boxes = labels(w); juice.react.press(w.fx, x ?? boxes[lane].x + boxes[lane].w / 2, y ?? boxes[lane].y + boxes[lane].h / 2);
    move(w, lane); g.chosen = lane; g.tc = w.time; g.te = Math.min(w.time + .4, g.t0 + g.T); g.fc = clamp((w.time - g.t0) / g.T, 0, 1);
    if (rebuilt(w)) { g.selectedAt = w.time; g.chosen = null; }
  }
  function key(w, i) {
    if (w.time < w.fallUntil - eps || w.gate?.chosen !== null && w.gate) return;
    if (i >= 0 && i <= 2) choose(w, i);
    else if (!w.duo && i >= 3 && i <= 5) choose(w, i - 3);
    else if (!w.duo && (i === 6 || i === 7)) move(w, clamp(w.lane + (i === 6 ? -1 : 1), 0, 2));
    else if (!w.duo && i === 8) { if (rebuilt(w)) scene.dash(w); else choose(w, w.lane); }
    else if (!w.duo && i === 9) move(w, clamp(w.lane - 1, 0, 2));
    else if (!w.duo && i === 10) move(w, clamp(w.lane + 1, 0, 2));
    else if (!w.duo && (i === 11 || i === 12)) scene?.dash(w);
  }
  function press(w, x, y) {
    // The rebuilt road is three screen-wide lanes; far doors are too small to aim at.
    if (rebuilt(w)) { const lane = clamp(Math.floor(x / w.view.w * 3), 0, 2); if (!w.gate) move(w, lane); else choose(w, lane, x, y); return; }
    if (!w.gate) return;
    const d = depth(w, w.gate); let best = 0;
    for (let i = 1; i < 3; i++) if (Math.abs(x - xAt(w, i, d)) < Math.abs(x - xAt(w, best, d))) best = i;
    choose(w, best, x, y);
  }
  function bot(w) {
    const g = w.gate; if (!g || g.chosen !== null || w.time < g.t0 + w.botDelay - eps) return null;
    if (rebuilt(w)) {
      // Pick a lane first, then dash through it on a later frame (solo only).
      if (g.botPicked) return !w.duo && !w.botNoDash && w.lane === g.botLane ? { key: 8 } : null;
      g.botPicked = true;
      g.botLane = rules.botChoice(w.botKind, ++w.botCount) ? g.right : [0, 1, 2].find(i => i !== g.right);
      return { key: g.botLane };
    }
    return { key: rules.botChoice(w.botKind, ++w.botCount) ? g.right : [0, 1, 2].find(i => i !== g.right) };
  }
  function judge(w) {
    const gate = w.gate, lane = gate.chosen ?? w.lane, boxes = gateShapes(w, gate, dChild).boxes;
    const b = boxes[lane], x = b.x + b.w / 2, y = b.y + b.h / 2, childX = xAt(w, lanePosition(w), dChild);
    if (lane === gate.right) {
      w.closeCard?.();
      const mult = 1 + w.combo.steps.filter(s => s <= w.combo.count + 1).length;
      const fast=gate.chosen !== null && gate.tc - gate.t0 < gate.T / 2;
      const points = rules.points(mult, fast)*(w.boost||1)*(gate.challenge?2:1);
      const res = juice.react.right(w.fx, x, y, { points, combo: w.combo, suppressText:gate.reask||gate.treasure });
      w.score += points; w.stats.right++; w.stats.maxCombo = Math.max(w.stats.maxCombo, w.combo.count); w.mult = 1 + w.combo.level;
      if (res.levelUp) w.streaks.push({ at: w.time });
      w.juice.moment('coin',{x:childX,y:w.feetY-w.childH,label:fast?'번개!':'',textRow:.72,suppressText:!fast||gate.reask||gate.treasure});
      if(gate.treasure){w.score+=50;w.stats.special++;w.juice.moment('treasure',{x,y,points:50});}
      if(gate.reask||w.practice){const row=w.review?.find(r=>r.item===gate.item);if(row)row.overcome=true;if(gate.reask){w.score+=15;w.stats.overcome++;w.reask.result(gate.item,'right',w.roundTime);}w.juice.moment('overcome',{x,y,points:w.practice?undefined:15});}
      w.coins.push({ at: w.time, x: childX, y: w.feetY - w.childH, size: w.childH * .4, rise: .5 * w.childH });
      for (let i = 0; i < 6; i++) w.bits.push({ at: w.time, x, y, vx: (i - 2.5) * 80 * w.fontScale, vy: -220 * w.fontScale, gravity: 700 * w.fontScale, size: w.childH * .18 });
      w.cheerUntil = w.time + .3; w.nextAt = w.time + (rebuilt(w)?scene.pace(w).gap:.3*(w.fever?.active ? .8 : 1))*(w.adapt?.spawnSlow()||1);
      w.adapt?.judge(true);if (rebuilt(w)) scene.judge(w,true,gate); else w.judge?.('right');
    } else {
      juice.react.wrong(w.fx, childX, w.feetY - w.childH / 2, { combo: w.combo, flash: false, shake: [4, 200] });
      w.stats.wrong++; w.mult = 1; w.fallUntil = w.time + (w.duo ? 1.2 : 1); w.reveal = { answer: gate.answers[gate.right], until: w.time + 1.5 }; w.nextAt = w.time + 1.5;
      if(w.learning){
        const item={...gate.item,selected:gate.answers[lane]};w.showCard(item,'wrong');if(rebuilt(w)&&w.card)w.card.question=w.signText;
        if(!w.duo&&!w.practice){const row=w.review.find(r=>r.item===gate.item);if(row){row.kind='wrong';row.overcome=false;}else w.review.push({item:gate.item,kind:'wrong',overcome:false});gate.item.selected=gate.answers[lane];if(gate.reask)w.reask.result(gate.item,'wrong',w.roundTime);else w.reask.add(gate.item,w.roundTime,w.modeSession?.state.play==='endless'?Infinity:w.modeSession?300:w.family.round.seconds);}
        w.adapt?.judge(false);
      }
      if (rebuilt(w)) scene.judge(w,false,gate); else w.judge?.('wrong');
    }
    gate.judgedAt=w.roundTime;
    w.faded.push({ ...gate, at: w.time, z: w.dist + dChild, speed: (gate.dApp - dChild) / gate.T }); w.gate = null;
  }
  function step(w, dt) {
    w.sceneTop = Math.min(w.topGoal, w.sceneTop + 300 * dt); geometry(w);
    const g = w.gate, fallen = w.time < w.fallUntil - eps;
    const pace=rebuilt(w)&&scene.pace(w),dash=!!g&&g.chosen!==null;
    const travel=pace?pace.travel:g?g.dApp-dChild:0;
    // The rebuilt road keeps one running speed however long the doors take; a dash triples it.
    const speed = pace ? travel / pace.run * (dash ? 3 : 1) : g ? g.chosen === null ? travel / g.T : (1 - g.fc) * travel / (g.te - g.tc) : w.lastSpeed ?? .5;
    w.dist += speed * dt;
    if (!fallen) w.runPhase += dt * 60 / (pace ? pace.run : g?.T ?? w.lastT) * (dash ? 2 : 1);
    const stride=Math.floor(w.runPhase/2.5);if(!fallen&&stride!==w.stride){w.stride=stride;w.juice.emit({x:xAt(w,lanePosition(w),dChild),y:w.feetY},{n:w.decorLight?1:2,shapes:['dust'],size:[3,6],speed:[20,60],life:[180,300]});}
    w.scenery = w.scenery.filter(s => s.z - w.dist >= .6);
    while ((w.scenery.at(-1)?.z ?? w.dist) < w.dist + 12) w.scenery.push({ k: ++w.sceneryCount, z: (w.scenery.at(-1)?.z ?? w.dist) + 1.5 });
    w.faded = w.faded.filter(f => w.time - f.at < .3 - eps && f.z - w.dist >= .6);
    w.coins = w.coins.filter(c => w.time - c.at < .6); w.bits = w.bits.filter(b => w.time - b.at < .5); w.streaks = w.streaks.filter(s => w.time - s.at < .6);
    if (g && progress(w, g) >= 1 - eps) { w.lastSpeed = travel / g.T; judge(w); }
    if (!w.gate && w.time >= w.nextAt - eps && !(rebuilt(w) && w.card)) {
      const treasure=w.specialIndex<w.specialTimes.length&&w.roundTime>=w.specialTimes[w.specialIndex]-eps;
      const reask=!treasure&&w.reask?.due(w.roundTime);++w.n;
      const level=w.adapt?.next(w.n)||rules.levelOf(w.n);
      let item=w.practice?w.practice.items[w.practiceIndex++%w.practice.items.length]:reask||w.maker.next(w.n,level);
      if(rebuilt(w)&&!reask&&!w.practice) item=scene.item(w,item);
      const deal=rules.deal(item,w.rng);
      w.gate = { ...deal, item, reask:!!reask, treasure, t0: w.time, T: rules.gateTime(w.mult, w.grade, item)*(w.adapt?.factor()||1)*(w.fever?.active ? .8 : 1)+(w.modePowers?.slow||0), dApp: 0, chosen: null, tc: null, te: null, fc: null };
      if(rebuilt(w)) {
        w.gate.challenge=!reask&&!w.practice&&scene.challenge(w);
        w.gate.T=scene.pace(w,item).seconds;
      }
      if(treasure){w.specialIndex++;const b=w.effectBounds();w.juice.moment('special',{x:b.w/2,y:b.y+20});}
      if(reask)w.record('reask',{q:item.q,at:w.roundTime});
      if(w.adapt&&w.lastLevel!==level){w.record('adapt',{level});w.lastLevel=level;}
      w.gate.dApp = appearanceDepth(w, w.gate); w.lastT = w.gate.T; w.question = rules.ascii(item.q); w.reveal = null;
      if(rebuilt(w)) scene.question(w,item);
      w.appearLog.push({ n: w.n, q: item.q, form: item.form, level:item.level,treasure,reask:!!reask,top: w.sceneTop, boxes: rebuilt(w) ? gateShapes(w, w.gate, dChild).boxes : labels(w) }); if (w.appearLog.length > 100) w.appearLog.shift();
    }
    if(rebuilt(w)) scene.step(w,dt);
  }
  function road(w, g) {
    const W = w.view.w, H = w.view.h, soft = w.art.pixel === false, ow = Math.ceil(W / (soft ? 1 : 3)), oh = Math.ceil((H - w.hy) / (soft ? 1 : 3));
    const geometryKey=`${W}:${w.bottomW}:${w.paletteKey}`;
    if (!w.road || w.road.width !== ow || w.road.height !== oh || w.roadGeometry !== geometryKey) {
      const off = window.document.createElement('canvas'); off.width = ow; off.height = oh;
      const context = off.getContext('2d',{willReadFrequently:true}), data = context.createImageData(ow, oh); w.road = off; w.roadContext = context; w.roadData = data; w.roadPixels = new Uint32Array(data.data.buffer);
      w.roadGeometry = geometryKey;
      // Perspective boundaries stay fixed between layout changes. Keep the
      // original pixel comparisons here and fill their contiguous spans later.
      w.roadRows = Array.from({ length:oh }, (_,y) => {
        const d=Math.min(60,oh/(y+.5)),p=1/d,half=.5*w.bottomW*p,edge=.04*w.bottomW*p,lineX=w.bottomW/6*p,lineW=Math.max(1,.012*w.bottomW*p),spans=[];
        for(let x=0;x<ow;x++){
          const offset=Math.abs((x+.5)*W/ow-W/2),kind=offset<=half?Math.abs(offset-lineX)<=lineW/2?3:2:offset<=half+edge?1:0;
          const last=spans.at(-1);if(last?.kind===kind)last.end++;else spans.push({kind,start:y*ow+x,end:y*ow+x+1});
        }
        const variants=Array.from({length:16},(_,kind)=>{
          const row=new Uint32Array(ow),c=w.colors;
          for(const span of spans)row.fill(span.kind===0?c[kind&4?'grassB':'grassA']:span.kind===1?c[kind&2?'curbB':'curbA']:span.kind===3&&!(kind&8)?c.line:c[kind&1?'roadAlt':'road'],span.start-y*ow,span.end-y*ow);
          return row;
        });
        return {d,spans,variants,lastKind:-1,lastDist:Infinity,nextDist:-Infinity};
      });
      w.roadRenderData = soft ? data : null;
      w.roadRenderPixels = w.roadRenderData ? new Uint32Array(w.roadRenderData.data.buffer) : null;
      if(w.roadRenderData&&w.art.slots['road-surface']){
        // Blend the static surface into every stripe choice once. Runtime only
        // copies the chosen rows; there is no full-road alpha layer or clip.
        const texture=window.document.createElement('canvas');texture.width=ow;texture.height=oh;
        const c=texture.getContext('2d',{willReadFrequently:true});c.globalAlpha=.12;c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2+w.bottomW/2,H-w.hy);c.lineTo(W/2-w.bottomW/2,H-w.hy);c.closePath();c.clip();shell.img(c,'road-surface',0,0,W,H-w.hy);
        const rgba=c.getImageData(0,0,ow,oh).data;
        for(let y=0;y<oh;y++)for(const variant of w.roadRows[y].variants)for(let x=0;x<ow;x++){
          const at=(y*ow+x)*4,a=rgba[at+3];if(!a)continue;
          const base=variant[x],b=255-a,r=Math.round(((base&255)*b+rgba[at]*a)/255),green=Math.round(((base>>>8&255)*b+rgba[at+1]*a)/255),blue=Math.round(((base>>>16&255)*b+rgba[at+2]*a)/255);
          variant[x]=(255<<24|blue<<16|green<<8|r)>>>0;
        }
      }
      w.roadAtlasBitmaps?.forEach(bitmap=>bitmap?.close());w.roadAtlasBitmaps=null;
      w.roadAtlases=null;
      // Copy changed rows into one surface instead of submitting each stripe separately.
      context.imageSmoothingEnabled=false;
    }
    const pixels = w.roadPixels;let changed=false;
    for (let y = 0; y < oh; y++) {
      const row=w.roadRows[y];
      if(!(w.dist<row.nextDist&&w.dist>=row.lastDist)){
        const z=w.dist+row.d,a=Math.floor(z/.5),b=Math.floor(z/.25),c=Math.floor(z/.6),d=Math.floor(z/.4),kind=(a%2?1:0)|(b%2?2:0)|(c%2?4:0)|(d%2?8:0);
        // Recheck just before the next boundary so rounding cannot delay it.
        row.nextDist=Math.min((a+1)*.5,(b+1)*.25,(c+1)*.6,(d+1)*.4)-row.d-1e-10*Math.max(1,Math.abs(z));
        if(kind!==row.lastKind){
          pixels.set(row.variants[kind],y*ow);
          row.lastKind=kind;changed=true;
        }
      }
      row.lastDist=w.dist;
    }
    if(changed)w.roadContext.putImageData(w.roadRenderData||w.roadData,0,0);
    g.imageSmoothingEnabled=false;g.drawImage(w.road,0,w.hy,soft?ow:W,soft?oh:H-w.hy);
  }
  function drawGate(w, g, gate, d, alpha = 1) {
    const { shapes, boxes } = gateShapes(w, gate, d); g.save(); g.globalAlpha = alpha;if(w.cardReserve){g.beginPath();g.rect(0,0,w.view.w,w.view.h-w.cardReserve);g.clip();}
    shapes.forEach((s, i) => {
      image(w,g, gate.treasure&&w.art.slots['gate-gold']?'gate-gold':`gate-${i}`, s.box.x, s.box.y, s.box.w, s.box.h);
      if(gate.treasure&&!w.art.slots['gate-gold']){g.strokeStyle='#f4c53f';g.lineWidth=Math.max(4,s.gs*8);g.strokeRect(s.box.x,s.box.y,s.box.w,s.box.h);}
      const b = boxes[i]; g.fillStyle = gate.treasure?'#ffe17b':'#fff4d6'; g.strokeStyle = gate.treasure?'#b58219':'#3b2a1a'; g.lineWidth = 3;
      g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x, b.y, b.w, b.h);
      shell.text(g, b.text, b, { min: b.px, max: b.px, lines: 1, color: '#3b2a1a', outline: null, math: true });
    }); g.restore();
  }
  function childBox(w, lane = lanePosition(w)) {
    if(rebuilt(w)) return scene.child(w,lane);
    const fallen = w.time < w.fallUntil - eps, cheer = w.time < w.cheerUntil - eps, slot = fallen ? 'runner-fall' : cheer ? 'runner-cheer' : 'runner-run';
    const art = w.art.slots[slot], s = art.layout || art, run = w.art.slots['runner-run'], scale = w.childH / (run.layout || run).h;
    const bob = fallen || cheer ? 0 : w.childH * .035 * Math.abs(Math.sin(Math.PI * w.runPhase / 2.5));
    return { slot, x: xAt(w, lane, dChild) - s.w * scale / 2, y: w.feetY - s.h * scale - bob, w: s.w * scale, h: s.h * scale };
  }
  function drawChild(w, g) {
    const b = childBox(w);
    g.save();
    const laneFeel=w.juice.feel.moments.lane||{};
    if(w.art.pixel===false&&w.slide&&w.time-w.slide.at<(laneFeel.tiltMs??120)/1000){g.translate(b.x+b.w/2,b.y+b.h);g.rotate(Math.sign(w.lane-w.slide.from)*(laneFeel.tiltDeg??8)*Math.PI/180);g.translate(-b.x-b.w/2,-b.y-b.h);}
    const frames=w.art.slots[b.slot].frames;
    const frame=b.slot==='runner-run'?Math.floor(w.runPhase)%frames:b.slot==='runner-fall'?Math.min(frames-1,Math.floor((1-(w.fallUntil-w.time)/(w.duo?1.2:1))*frames)):0;
    image(w,g, b.slot, b.x, b.y, b.w, b.h, frame);
    if(b.slot==='runner-fall') {
      g.fillStyle='#ffe17b';g.strokeStyle='#765408';g.lineWidth=2;
      for(let i=0;i<3;i++){const angle=w.time*9+i*Math.PI*2/3,x=b.x+b.w/2+Math.cos(angle)*b.w*.35,y=b.y+Math.sin(angle)*8;
        g.beginPath();for(let j=0;j<10;j++){const a=j*Math.PI/5-Math.PI/2,r=j%2?3:7;j?g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();g.fill();g.stroke();}
    }
    g.restore();
  }
  function image(w,g,slot,x,y,width,height,frame=0){
    const shake=w.juice.shakeOffset(),padX=Math.abs(shake.x)+Math.abs(w.fx.shakeX||0)+1,padY=Math.abs(shake.y)+Math.abs(w.fx.shakeY||0)+1;
    if(x+width<=-padX||x>=w.view.w+padX||y+height<=-padY||y>=w.view.h+padY)return;
    if(!cfg.cacheImages&&!(w.art.pixel===false&&slot==='road-surface'))return shell.img(g,slot,x,y,width,height,frame);
    const soft=w.art.pixel===false,W=Math.max(1,Math.round(width)),H=Math.max(1,Math.round(height)),dpr=Math.min(2,window.devicePixelRatio||1),smooth=soft||w.art.pixel!==true&&width*dpr/w.art.slots[slot].w<.75,key=`${slot}:${frame}:${soft?width:W}:${soft?height:H}:${dpr}:${smooth}`;
    let canvas=w.imageCache.get(key);
    if(!canvas){
      const bytes=Math.round(W*dpr)*Math.round(H*dpr)*4,budget=8*1024*1024;
      if(bytes>budget)return shell.img(g,slot,x,y,width,height,frame);
      if(!w.imageCache.size)w.imageCacheBytes=0;
      while(w.imageCache.size&&(w.imageCache.size>=256||(w.imageCacheBytes||0)+bytes>budget)){const oldest=w.imageCache.keys().next().value,cached=w.imageCache.get(oldest);w.imageCacheBytes-=cached.width*cached.height*4;w.imageCache.delete(oldest);}
      canvas=window.document.createElement('canvas');canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);const context=canvas.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);shell.img(context,slot,0,0,width,height,frame);w.imageCache.set(key,canvas);w.imageCacheBytes=(w.imageCacheBytes||0)+bytes;
    }else{w.imageCache.delete(key);w.imageCache.set(key,canvas);}
    // The stored image was already filtered at its display size. Only interpolate
    // fractional placement here, rather than running the reduction filter again.
    g.imageSmoothingEnabled=soft;if(soft)g.imageSmoothingQuality='low';g.drawImage(canvas,soft?x:Math.round(x),soft?y:Math.round(y),soft?width:W,soft?height:H);
  }
  function drawSky(w, g) {
    if(w.art.pixel===false&&w.art.slots['bg-hills'])return drawSoftSky(w,g);
    const sky = w.art.slots['bg-sky'], scale = Math.max(w.view.w / sky.w, w.hy / sky.anchors.horizon);
    const dpr=Math.min(2,window.devicePixelRatio||1),tileWidth=Math.round(sky.w*scale),tileHeight=Math.round(sky.h*scale),key=`${tileWidth}:${tileHeight}:${dpr}`;
    if(w.skyTileKey!==key){const canvas=window.document.createElement('canvas');canvas.width=Math.round(tileWidth*dpr);canvas.height=Math.round(tileHeight*dpr);const context=canvas.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);shell.img(context,'bg-sky',0,0,tileWidth,tileHeight);w.skyBitmap?.close();w.skyBitmap=null;w.skyTile=canvas;w.skyTileKey=key;if(window.createImageBitmap)window.createImageBitmap(canvas).then(bitmap=>{if(w.skyTileKey===key)w.skyBitmap=bitmap;else bitmap.close();});}
    const width=sky.w*scale,layers=[[0,w.hy*.55,.1],[w.hy*.55,w.hy,.3]].map(([from,to,rate])=>({from,to,xs:[-1,0,1].map(repeat=>Math.round((w.view.w-width)/2-w.dist*rate*12%width+repeat*width))}));
    if(!cfg.cacheSkyComposite){for(const layer of layers){g.save();g.beginPath();g.rect(0,layer.from,w.view.w,layer.to-layer.from);g.clip();g.imageSmoothingEnabled=false;for(const x of layer.xs)if(x<w.view.w&&x+tileWidth>0){
      const left=Math.floor(Math.max(0,x)),right=Math.ceil(Math.min(w.view.w,x+tileWidth)),from=Math.floor(layer.from),to=Math.ceil(layer.to),y=Math.round(w.hy-sky.anchors.horizon*scale);
      // Crop the invisible part before submitting the tile. Its pixel mapping
      // and the fractional clip boundary are identical to the full image.
      const source=w.skyBitmap||w.skyTile,sx=source.width/tileWidth,sy=source.height/tileHeight;
      g.drawImage(source,(left-x)*sx,(from-y)*sy,(right-left)*sx,(to-from)*sy,left,from,right-left,to-from);
    }g.restore();}return;}
    const backgroundKey=`${key}:${w.view.w}:${w.hy}:${layers.flatMap(layer=>layer.xs).join(':')}`;
    if(w.skyBackgroundKey!==backgroundKey){
      const background=w.skyBackground||window.document.createElement('canvas'),W=Math.round(w.view.w*dpr),H=Math.ceil(w.hy*dpr);if(background.width!==W)background.width=W;if(background.height!==H)background.height=H;
      const context=background.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,W/dpr,H/dpr);
      for(const layer of layers){context.save();context.beginPath();context.rect(0,layer.from,w.view.w,layer.to-layer.from);context.clip();context.imageSmoothingEnabled=false;for(const x of layer.xs)if(x<w.view.w&&x+tileWidth>0)context.drawImage(w.skyTile,x,Math.round(w.hy-sky.anchors.horizon*scale),tileWidth,tileHeight);context.restore();}
      w.skyBackground=background;w.skyBackgroundKey=backgroundKey;w.skyBackgroundRenders=(w.skyBackgroundRenders||0)+1;
    }
    g.save();g.imageSmoothingEnabled=false;g.drawImage(w.skyBackground,0,0,w.skyBackground.width/dpr,w.skyBackground.height/dpr);g.restore();
  }
  function drawSoftSky(w,g){
    const dpr=Math.min(2,window.devicePixelRatio||1),width=Math.ceil(Math.max(w.view.w,w.hy*1376/384)),height=Math.ceil(width*768/1376),y=Math.ceil(w.hy)-height;
    const cache=w.softSkyTiles||=new Map(),layers=[];
    for(const [slot,rate]of [['bg-sky',.1],['bg-hills',.3]]){
      const key=`${slot}:${width}:${height}:${w.hy}:${dpr}`;let tile=cache.get(slot);
      if(!tile||tile.key!==key){
        tile?.bitmap?.close();const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(w.hy*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);shell.img(c,slot,0,y,width,height);tile={key,canvas,bitmap:null};cache.set(slot,tile);
        if(slot==='bg-sky'){w.skyTile=canvas;w.skyBitmap=null;}
        if(window.createImageBitmap){const current=tile;window.createImageBitmap(canvas).then(bitmap=>{if(cache.get(slot)===current){current.bitmap=bitmap;if(slot==='bg-sky')w.skyBitmap=bitmap;}else bitmap.close();});}
      }
      layers.push({slot,tile,offset:Math.round(((w.view.w-width)/2-w.dist*rate*12%width)*dpr)/dpr});
    }
    const main=window.document?.querySelector?.('canvas.gf-canvas');
    if(cfg.domSky&&!cfg.cacheSkyComposite&&main&&main.getContext('2d')===g){
      if(!w.domSky){
        const root=window.document.createElement('div');root.className='gf-runner-sky';root.dataset.side=w.side;Object.assign(root.style,{position:'fixed',overflow:'hidden',pointerEvents:'none'});main.before(root);
        const content=root.attachShadow({mode:'open'}),regions=[0,1].map(()=>{const clip=window.document.createElement('div');Object.assign(clip.style,{position:'absolute',overflow:'hidden',left:'0',width:'100%'});content.append(clip);return {clip,layers:new Map()};});w.domSky={root,regions};
      }
      const {root,regions}=w.domSky,top=Math.min(w.hy,w.view.top),shake=w.juice.shakeOffset(),shakeY=shake.y+(w.fx.shakeY||0),layoutKey=`${w.view.x}:${w.view.y}:${w.view.w}:${w.view.h}:${top}`;
      if(w.domSky.layoutKey!==layoutKey){Object.assign(root.style,{left:`${w.view.x||0}px`,top:`${w.view.y||0}px`,width:`${w.view.w}px`,height:`${w.view.h}px`});for(let i=0;i<2;i++){const from=i?top:0,to=i?w.view.h:top;Object.assign(regions[i].clip.style,{top:`${from}px`,height:`${to-from}px`});}w.domSky.layoutKey=layoutKey;}
      for(let i=0;i<2;i++){
        const region=regions[i],from=i?top:0;
        for(const {slot,tile,offset} of layers){
          let entry=region.layers.get(slot);
          if(!entry){const canvas=window.document.createElement('canvas');Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',willChange:'transform'});region.clip.append(canvas);entry={canvas,surface:canvas.transferControlToOffscreen?canvas.transferControlToOffscreen():canvas};region.layers.set(slot,entry);}
          if(entry.key!==tile.key){const surface=entry.surface;surface.width=tile.canvas.width*2;surface.height=tile.canvas.height;const context=surface.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(tile.canvas,0,0);context.drawImage(tile.canvas,tile.canvas.width,0);Object.assign(entry.canvas.style,{width:`${surface.width/dpr}px`,height:`${surface.height/dpr}px`});entry.key=tile.key;}
          const period=tile.canvas.width/dpr,position=offset+(i?shake.x+(w.fx.shakeX||0):0),x=((position%period)+period)%period-period,y=-from+(i?shakeY:0);
          const transform=`translate3d(${x}px,${y}px,0)`;if(entry.transform!==transform){entry.canvas.style.transform=transform;entry.transform=transform;}
        }
      }return;
    }
    function paint(target){
      target.save();target.beginPath();target.rect(0,0,w.view.w,w.hy);target.clip();target.imageSmoothingEnabled=false;
      for(const {slot,tile,offset}of layers){
      const source=slot==='bg-sky'?w.skyBitmap||tile.canvas:tile.bitmap||tile.canvas;
      for(const repeat of [-1,0,1]){const x=offset+repeat*width,left=Math.max(0,x),right=Math.min(w.view.w,x+width);if(right<=left)continue;
        const from=0,to=w.hy,sx=dpr,sy=dpr;
        // Retain whole-image sampling phase and a two-pixel filter margin.
        const x0=Math.max(0,Math.floor((left-x)*sx)-2),y0=0,x1=Math.min(source.width,Math.ceil((right-x)*sx)+2),y1=Math.min(source.height,Math.ceil(to*sy)+2);
        target.save();target.translate(x,0);target.scale(1/sx,1/sy);target.drawImage(source,x0,y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);target.restore();
      }}target.restore();
    }
    if(!cfg.cacheSkyComposite)return paint(g);
    const key=`${width}:${height}:${dpr}:${w.view.w}:${w.hy}:${layers.map(l=>l.offset).join(':')}`;
    if(w.skyBackgroundKey!==key){const canvas=w.skyBackground||window.document.createElement('canvas'),W=Math.ceil(w.view.w*dpr),H=Math.ceil(w.hy*dpr);if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W/dpr,H/dpr);paint(c);w.skyBackground=canvas;w.skyBackgroundKey=key;w.skyBackgroundRenders=(w.skyBackgroundRenders||0)+1;}
    g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='low';g.drawImage(w.skyBackground,0,0,w.skyBackground.width/dpr,w.skyBackground.height/dpr);g.restore();
  }
  function draw(w, g) {
    if(w.art.pixel===false&&window.createImageBitmap&&w.vignetteLayer?.getContext){
      const source=w.vignetteLayer,cache=w.vignetteBitmaps||=new Map();let entry=cache.get(source);
      if(!entry){
        while(cache.size>=2){const first=cache.keys().next().value;cache.get(first).bitmap?.close();cache.delete(first);}
        entry={bitmap:null};cache.set(source,entry);const current=entry;window.createImageBitmap(source).then(bitmap=>{if(cache.get(source)===current)current.bitmap=bitmap;else bitmap.close();});
      }
      if(entry.bitmap)w.vignetteLayer=entry.bitmap;
    }
    if(rebuilt(w)) { scene.draw(w,g); drawSpeedLines(w,g); return; }
    drawSky(w,g);
    road(w, g);
    const objects=w.renderObjects||=[];let count=0;
    function add(kind,value,d){const entry=objects[count]||={};entry.kind=kind;entry.value=value;entry.d=d;count++;}
    for(const s of w.scenery)add('scenery',s,s.z-w.dist);
    if(w.gate)add('gate',w.gate,depth(w,w.gate));
    for(const f of w.faded)add('faded',f,f.z-w.dist);
    add('child',null,dChild);objects.length=count;objects.sort((a,b)=>b.d-a.d);
    for(const o of objects){
      if(o.kind==='gate')drawGate(w,g,o.value,o.d);
      else if(o.kind==='faded')drawGate(w,g,o.value,o.d,1-(w.time-o.value.at)/.3);
      else if(o.kind==='child')drawChild(w,g);
      else {const s=o.value;
      const slot = s.k % 3 === 2 ? 'shop' : 'tree', art = w.art.slots[slot], h1 = (slot === 'tree' ? .55 : .5) * (w.view.h - w.hy), width1 = h1 * art.w / art.h, d = s.z - w.dist;
      const x = w.view.w / 2 + (s.k % 2 ? 1 : -1) * (.5 * w.bottomW + .6 * width1) / d;
      image(w,g, slot, x - width1 / d / 2, yAt(w, d) - h1 / d, width1 / d, h1 / d);
      }
    }
    for (const c of w.coins) { const f = (w.time - c.at) / .6; g.save(); g.globalAlpha = 1 - f; image(w,g, 'coin', c.x - c.size / 2, c.y - c.rise * f - c.size / 2, c.size, c.size,Math.floor(f*(w.art.slots.coin.frames||1))%(w.art.slots.coin.frames||1)); g.restore(); }
    if(w.art.slots.treasure)for(const f of w.faded)if(f.treasure&&f.chosen===f.right){const age=(w.time-f.at)/.3,size=w.childH*.5;g.save();g.globalAlpha=1-age;image(w,g,'treasure',xAt(w,f.right,dChild)-size/2,w.feetY-w.childH-size*age,size,size);g.restore();}
    for (let i=0;i<w.bits.length;i+=w.decorLight?2:1) { const b=w.bits[i],t = w.time - b.at; g.save(); g.globalAlpha = 1 - t / .5; image(w,g, 'bits', b.x + b.vx * t - b.size / 2, b.y + b.vy * t + .5 * b.gravity * t * t - b.size / 2, b.size, b.size); g.restore(); }
    drawSpeedLines(w,g);
  }
  function drawSpeedLines(w,g) {
    for (const s of [...w.streaks,...(w.fever?.active?[{at:w.time-(w.time%.6)}]:[])]) {
      const f = (w.time - s.at) / .6; g.save(); g.globalAlpha = .7 * (1 - f); g.strokeStyle = '#ffffff'; g.lineWidth = 3 * w.fontScale;
      g.beginPath();
      for (let i = 0; i < 14; i+=w.decorLight?2:1) { const angle = i * Math.PI * 2 / 14, dx = Math.cos(angle) * w.view.w, dy = Math.sin(angle) * w.view.h; g.moveTo(w.view.w / 2 + dx * (.8 - .4 * f), w.hy + dy * (.8 - .4 * f)); g.lineTo(w.view.w / 2 + dx * (.55 - .4 * f), w.hy + dy * (.55 - .4 * f)); } g.stroke(); g.restore();
    }
  }
  function drawBehindHUD(w,g){if(rebuilt(w))scene.background(w,g);else drawSky(w,g);drawSpeedLines(w,g);}
  function gate(w) { return { n: w.n, f: progress(w), chosen: w.gate?.chosen ?? null, lane: w.lane, fallen: w.time < w.fallUntil - eps, fallLeft: Math.max(0, w.fallUntil - w.time) }; }
  function doors(w) {
    const entries = w.gate ? [{ gate: w.gate, d: depth(w, w.gate) }] : [];
    if (!rebuilt(w)) entries.push(...w.faded.map(f => ({ gate: f, d: f.z - w.dist })));
    return entries.flatMap(({ gate, d }) => { const { shapes, boxes } = gateShapes(w, gate, d); return [...shapes.map(s => s.box), ...boxes]; }).map(b=>({...b,h:Math.max(0,Math.min(b.h,w.view.h-(w.cardReserve||0)-b.y))})).filter(b=>b.h>0);
  }
  function effectBounds(w) {
    if(rebuilt(w)){const bounds=scene.noticeBounds(w);return w.card?{...bounds,h:0}:bounds;}
    return { x: 8, y:w.sceneTop+8, w:w.view.w-16, h:Math.max(1,w.view.h-w.sceneTop-16) };
  }
  function effectLabels(w){const offset=w.juice.shakeOffset(),boss=rebuilt(w)&&scene.boss(w);return [...labels(w),childBox(w),...(rebuilt(w)&&w.gate&&w.sign?[w.sign]:[]),...(boss?[boss.bounds]:[])].map(b=>({x:b.x+offset.x-4,y:b.y+offset.y-4,w:b.w+8,h:b.h+8}));}
  function card(w,item){
    let question=item.q;
    if(rebuilt(w)&&item.form==='gcdLcm')question=`${item.ops[0]==='gcd'?'최대공약수':'최소공배수'}(${item.ops[1]},${item.ops[2]})=□`;
    return {wrong:rules.ascii(rebuilt(w)?question.replace('□',item.selected??item.wrong[0]):item.selected??item.wrong[0]),right:rules.ascii(rebuilt(w)?question.replace('□',item.a):item.a),diff:false,...rules.solution(item,w.grade)};
  }
  const cfg = { family: 'runner',compactHUD:true,cacheEffectText:true,cacheSkyComposite:false,cpuCanvas:false,pixelEffects:true, lowLatencyCanvas:false,cacheImages:false,cacheVignette:true,layeredEffects:false,pixelShake:true,opaqueCanvas:false,animateHUD:true,effectSmoothingQuality:'low',cacheTextMeasure:true,cacheHUDGeometry:true,questionLineHeight:1.6,reserveQuestionLines:2,avoidEffectText:true,reactMoments:{right:'gatePass',wrong:'fall'}, combo: { steps: [5, 10, 15] }, setup, layout, step, draw, drawBehindHUD, press, key, bot, hooks: { labels, effectLabels,card, appeared: w => w.appearLog, gate,
    children: w => [0, 1, 2].map(lane => childBox(w, lane)),
    effectSprite(w,g,p){if(p.shape!=='dust')return false;const size=p.size;if(rebuilt(w)){scene.image(w,g,'dust',{x:p.x-size/2,y:p.y-size/2,w:size,h:size});return true;}if(!w.art.slots.dust)return false;image(w,g,'dust',p.x-size/2,p.y-size/2,size,size);return true;},
    doors, effectBounds } };
  cfg.lightDecor={slowMs:17.2,backMs:17};
  cfg.cacheQuestionFit=true;
  cfg.directSurface=true;
  cfg.cacheTextLayout=true;
  cfg.softImageSteps=1.08;
  cfg.domSky=true;
  cfg.hooks.roundStep=w=>{if(rebuilt(w))scene.round(w);};
  cfg.hooks.roadScene=w=>rebuilt(w)?scene.inspect(w):null;
  cfg.hooks.dash=w=>scene?.dash(w);
  cfg.hooks.runnerPower=(w,id)=>scene?.grant(w,id);
  if(window.document?.head){const style=window.document.createElement('style');style.textContent='.gf-title-screen,.gf-title-sprite{image-rendering:auto}.gf-stage .gf-chip{backdrop-filter:none}';window.document.head.append(style);}
  window.GFFamilies.runner.engine = cfg;
  if(window.document&&scene) {
    // Read the mode tuning from the game itself, keeping the shared shell's
    // world interface and the factory's exact entry template unchanged.
    const url=new URL('game.json',location.href),version=new URL(location.href).searchParams.get('v');if(version)url.searchParams.set('v',version);
    fetch(url).then(async response=>{
      if(!response.ok)throw Error(`게임 설정을 받지 못했어요: ${response.status}`);
      const game=await response.json();scene.pacing=game.modeKit?.runnerPace;window.GFShell.play(cfg);
    }).catch(error=>{const node=document.createElement('section');node.className='gf-load-error';node.dataset.test='load-error';node.textContent='게임 설정을 불러오지 못했어요';document.body.append(node);console.error(error);window.GF.ready();});
  } else window.GFShell.play(cfg);
})();
