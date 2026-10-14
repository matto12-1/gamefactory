(function () {
  'use strict';
  if (window.GFShell) return;
  const scriptSrc = typeof document !== 'undefined' ? document.currentScript?.src : null;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function compactBar(node,value) {
    const scale=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;
    if(node._gfScale!==scale){node.style.transform=`scaleX(${scale})`;node._gfScale=scale;}
  }
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
      if (k === 'missions') return v === 'all' && stats.missions === true;
      return false;
    })).map(s => s.id);
  }
  function missionIds(missions, stats) {
    return (missions || []).filter(m => (stats[{ combo:'maxCombo', special:'special', fever:'fever', right:'right' }[m.kind]] || 0) >= (m.kind === 'special' ? 1 : m.n)).map(m => m.id);
  }
  function bestStore(storage, gameId, grade, error = e => window.console?.error(e)) {
    const key = `gf:best:${gameId}:${grade}`;
    const getStorage = () => typeof storage === 'function' ? storage() : storage;
    return {
      read() {
        try { const value = getStorage().getItem(key); if (value === null) return null; const n = Number(value); return Number.isSafeInteger(n) && n >= 0 ? n : null; }
        catch (e) { error(`최고 기록을 읽지 못했어요: ${e.message}`); return null; }
      },
      write(score) {
        const old = this.read(); if (old !== null && score <= old) return false;
        try { getStorage().setItem(key, String(score)); return true; }
        catch (e) { error(`최고 기록을 저장하지 못했어요: ${e.message}`); return false; }
      }
    };
  }
  function endSequence({ duo = false, sim = false, stage = () => {}, progress = () => {}, finish = () => {} } = {}) {
    const durations = duo ? [.3, 1.2, .5, 2] : [.3, 1.2, .75, 1.2, 1.5];
    let current = 1, elapsed = 0, done = false;
    const api = {
      get stage() { return current; },
      advance(dt) {
        if (done || current === 6) return;
        elapsed += Math.max(0, dt);
        while (current <= durations.length && elapsed >= durations[current - 1] - 1e-9) {
          elapsed -= durations[current - 1]; current++; stage(current);
        }
        if (duo && current === 5) { current = 6; api.finish(); }
        else progress(current, Math.min(1, elapsed / (durations[current - 1] || 1)));
      },
      skip() { if (current > 4 || done) return false; current = duo ? 4 : 5; elapsed = 0; stage(current); return true; },
      finish() { if (done) return; done = true; finish(); }
    };
    if (sim) { for (let n = 1; n <= 6; n++) stage(n); current = 6; api.finish(); } else stage(1);
    return api;
  }
  const immersionOn = opts => opts.family.endShow === true && opts.game.endShow !== false;
  // Runner notices have their own compact layout; other games keep the shared renderer.
  function runnerNotices(w, juice) {
    const pending=[], showing=[], scores=[], sprites=new Map();
    const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const praise=e=>e.name==='combo'&&(e.combo||0)<15;
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    function start() {
      for(let i=pending.length-1;i>=0;i--)if(praise(pending[i])&&juice.clock-pending[i].at>1.5){const e=pending.splice(i,1)[0];w.record('textDropped',{name:e.name,text:e.text,waitMs:(juice.clock-e.at)*1000});}
      while(showing.length<2&&pending.length)showing.push(pending.shift());
    }
    function sprite(g,e,size) {
      const font=`${size}px DoHyeon, sans-serif`,key=`${font}:${e.text}`;
      let cached=sprites.get(key);if(cached)return cached;
      g.font=font;g.textAlign='center';g.textBaseline='middle';const m=g.measureText(e.text),pad=4;
      const left=m.actualBoundingBoxLeft??m.width/2,right=m.actualBoundingBoxRight??m.width/2,asc=m.actualBoundingBoxAscent??size/2,desc=m.actualBoundingBoxDescent??size/2;
      const canvas=document.createElement('canvas');canvas.width=Math.ceil((left+right+pad*2)*2);canvas.height=Math.ceil((asc+desc+pad*2)*2);
      const c=canvas.getContext('2d');c.setTransform(2,0,0,2,(left+pad)*2,(asc+pad)*2);c.font=font;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=6;c.strokeStyle='#302019';c.fillStyle='#ffe17b';c.strokeText(e.text,0,0);c.fillText(e.text,0,0);
      canvas.gfEffectText={text:e.text,ink:{x:-left-3,y:-asc-3,w:left+right+6,h:asc+desc+6}};cached={canvas,w:canvas.width/2,h:canvas.height/2};
      if(sprites.size>=64)sprites.delete(sprites.keys().next().value);sprites.set(key,cached);return cached;
    }
    function paint(g,e,b,avoid,{pill=true,row=0}={}) {
      e.rect=undefined;if(b.h<=0||b.w<=0)return;
      const size=Math.min(44,Math.max(24,w.view.h*.042)),s=sprite(g,e,size),padding=pill?14:0;
      const fit=Math.min(1,(b.w-2)/((s.w+padding*2)*1.1),(b.h-2)/((s.h+12)*1.1));
      if(size*fit<12)return;
      const pop=reduced()?1:e.age<.09?.55+.55*e.age/.09:e.age<.15?1.1-.1*(e.age-.09)/.06:1;
      const exit=reduced()?0:clamp((e.age-(e.life-.18))/.18,0,1),width=(s.w+padding*2)*fit*1.1,height=(s.h+12)*fit*1.1;
      const x=clamp(e.x,b.x+width/2+1,b.x+b.w-width/2-1),y=b.y+b.h/2-(pill?exit*12:e.age*30)*fit;
      const candidates=[{x:x-width/2,y:clamp(y-height/2,b.y+1,b.y+b.h-height-1),w:width,h:height}];
      for(const a of avoid)candidates.push({x:a.x-width-2,y:candidates[0].y,w:width,h:height},{x:a.x+a.w+2,y:candidates[0].y,w:width,h:height},{x:candidates[0].x,y:a.y-height-2,w:width,h:height},{x:candidates[0].x,y:a.y+a.h+2,w:width,h:height});
      const rect=candidates.find(r=>r.x>=b.x&&r.x+r.w<=b.x+b.w&&r.y>=b.y&&r.y+r.h<=b.y+b.h&&!avoid.some(a=>overlap(r,a)));
      if(!rect)return;
      e.rect=rect;e.region=b;e.log.params.textRect=rect;e.scale=pop;e.opacity=1-exit;e.color='#ffe17b';e.background='#302019';e.row=row;
      g.save();g.globalAlpha=1-exit;g.translate(rect.x+rect.w/2,rect.y+rect.h/2);g.scale(fit*pop,fit*pop);
      if(pill){g.fillStyle='#302019';g.beginPath();g.roundRect(-(s.w+padding*2)/2,-(s.h+12)/2,s.w+padding*2,s.h+12,(s.h+12)/2);g.fill();}
      g.imageSmoothingEnabled=true;g.drawImage(s.canvas,-s.w/2,-s.h/2,s.w,s.h);g.restore();
    }
    return {
      get feel(){return juice.feel;},get clock(){return juice.clock;},
      emit:(...args)=>juice.emit(...args),endConfetti:(...args)=>juice.endConfetti(...args),shakeOffset:()=>juice.shakeOffset(),
      moment(name,c={}) {
        const recipe=window.GFFeel?window.GFFeel.recipe(juice.feel,name,{combo:c.combo||0,reduced:!!reduced(),light:!!w.fxScreen.light,delayMs:c.delayMs||0}):{steps:[],delayMs:0};
        const log=juice.moment(name,{...c,suppressText:true});
        if(!c.suppressText&&!w.effectsOff)for(const step of recipe.steps)if(['popup','label','banner'].includes(step.kind)){
          const text=step.kind==='popup'?c.points===undefined?null:`+${c.points}`:c.label??step.text;
          if(text==null)continue;
          const e={name,text:String(text),combo:c.combo,x:c.x??w.view.w/2,bounds:c.bounds,age:0,at:juice.clock+recipe.delayMs/1000,life:Math.max(.6,(step.ms??((step.popMs||0)+(step.riseMs||450)))/1000),log};
          if(step.kind==='popup'){scores.push(e);if(scores.length>12)scores.shift();}else pending.push(e);
        }
        start();return log;
      },
      update(dt) {
        juice.update(dt);
        for(const list of [showing,scores])for(let i=list.length-1;i>=0;i--){const e=list[i];if(e.rect)e.age+=Math.max(0,dt);if(e.age>=e.life||(list===scores||praise(e))&&!e.rect&&juice.clock-e.at>1.5)list.splice(i,1);}
        start();
      },
      textState(){return {active:showing.map(e=>({name:e.name,text:e.text,rect:e.rect,bounds:e.region,age:e.age,scale:e.scale,opacity:e.opacity,color:e.color,background:e.background})),queued:pending.map(e=>({name:e.name,text:e.text,waitMs:(juice.clock-e.at)*1000}))};},
      draw(g) {
        juice.draw(g);g.save();const bounds=w.effectBounds(),avoid=w.effectLabels(),drawn=[];
        const child=window.GFRunnerScene.child(w),scoreY=Math.max(w.sign? w.sign.y+w.sign.h+12:0,child.y-w.view.h*.12),scoreBounds={x:8,y:scoreY,w:w.view.w-16,h:Math.max(0,child.y-5-scoreY)};
        for(const [row,e] of showing.entries()){
          if(juice.clock<e.at)continue;
          const b=e.bounds||(e.name==='coin'?scoreBounds:{...bounds,y:bounds.y+row*bounds.h/2,h:bounds.h/2});if(e.name==='coin')e.x=child.x+child.w/2;paint(g,e,b,[...avoid,...drawn],{row});if(e.rect)drawn.push(e.rect);
        }
        // Score numbers rise above the child independently of the notice queue.
        for(const e of scores){e.x=child.x+child.w/2;paint(g,e,scoreBounds,[...avoid,...drawn],{pill:false});if(e.rect)drawn.push(e.rect);}
        w.runnerScoreText=scores.map(e=>({text:e.text,rect:e.rect,age:e.age}));g.restore();
      }
    };
  }
  function immersionMoment(w, name, extra = {}) {
    const b = w.effectBounds();
    return w.juice.moment(name, { x:b.x + b.w / 2, y:b.y + b.h / 2, ...extra });
  }
  function checkMissions(w) {
    for (const id of missionIds(w.missions, w.stats)) if (!w.missionDone.has(id)) {
      w.missionDone.add(id); const m = w.missions.find(m => m.id === id);
      if (w.art.ui?.runner) {
        immersionMoment(w, 'mission', { label:'도전 성공!' });
        immersionMoment(w, 'mission', { label:m.text });
      } else immersionMoment(w, 'mission', { label:`도전 성공! ${m.text}` });
    }
    w.stats.missions = w.missions.length > 0 && w.missionDone.size === w.missions.length;
  }
  function immersionStep(w) {
    if (w.fever.active && w.roundTime >= w.fever.until - 1e-9) {
      w.fever.active = false; immersionMoment(w, 'feverEnd');
    }
    if (!w.last10 && w.timeLeft <= 10 + 1e-9) { w.last10 = true; immersionMoment(w, 'last10'); }
    w.boost = w.fever.active || w.last10 ? 2 : 1;
    const second = Math.ceil(w.timeLeft - 1e-9);
    if (second <= 5 && second > 0 && w.heartbeat !== second) { w.heartbeat = second; immersionMoment(w, 'last5'); }
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
  const duoNote = data => (matchMedia?.('(pointer:coarse)').matches && data.play.noteDuoTouch) || data.play.noteDuo;
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
  function canvasTextWidth(g,str,px) {
    const cache = active?.cfg?.cacheTextMeasure ? active.textWidthCache ||= new Map() : null, key = `${px}:${str}`;
    if(cache?.has(key))return cache.get(key);
    g.font = `${px}px DoHyeon, sans-serif`;const width=g.measureText(str).width;
    if(cache){if(cache.size>=2048)cache.delete(cache.keys().next().value);cache.set(key,width);}return width;
  }
  function measureText(str, px) {
    if (active?.measure) return active.measure(str, px);
    const g = active?.g;
    if (g) return canvasTextWidth(g,str,px);
    return [...str].length * px;
  }
  function fits(str, box, opts) { return !!layoutText(str, box, opts, opts.measure || measureText); }
  function img(g, slot, x, y, w, h, frame = 0, src) {
    const s = active?.art?.slots[slot], picture = active?.images?.[slot];
    if (!g || !s || !picture) return;
    const fx = src && src.w === undefined ? src : null;
    const pixelArt = active.art.pixel === true;
    const softArt = active.art.pixel === false;
    const crop = fx ? { x:0,y:0,w:s.w,h:s.h } : src || { x: 0, y: 0, w: s.w, h: s.h };
    if (fx) {
      g.save();
      if (!pixelArt) { g.translate(x+w/2,y+h); g.rotate(fx.rot || 0); g.scale(fx.sx ?? 1,fx.sy ?? 1); x=-w/2; y=-h; }
    }
    g.imageSmoothingEnabled = softArt || !pixelArt && w * (active.dpr || 1) / crop.w < .75;
    if (g.imageSmoothingEnabled) g.imageSmoothingQuality = 'high';
    const coords = softArt ? [x,y,w,h] : [Math.round(x),Math.round(y),Math.round(w),Math.round(h)];
    let copy;
    if (softArt && active.cfg?.softImageSteps && !slot.startsWith('bg-') && slot !== 'road-surface' && typeof document !== 'undefined' && w > 0 && h > 0) {
      const dpr = active.dpr || 1, step = active.cfg.softImageSteps;
      const height = Math.max(1, Math.round(Math.pow(step, Math.round(Math.log(Math.max(1,h*dpr))/Math.log(step)))));
      const width = Math.max(1, Math.round(height*w/h));
      const key = `${slot}:${frame}:${crop.x}:${crop.y}:${crop.w}:${crop.h}:${width}:${height}`;
      const cache = active.softImages ||= new Map(), bytes = width*height*4, budget = 16*1024*1024;
      copy = cache.get(key);
      if (!copy && bytes <= budget) {
        while (cache.size && (cache.size >= 512 || (active.softImageBytes || 0)+bytes > budget)) {
          const first = cache.keys().next().value, old = cache.get(first);
          active.softImageBytes -= old.width*old.height*4; old.gfBitmap?.close(); cache.delete(first);
        }
        copy = document.createElement('canvas'); copy.width = width; copy.height = height;
        const context = copy.getContext('2d',{willReadFrequently:true}); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
        context.drawImage(picture,frame*s.w+crop.x,crop.y,crop.w,crop.h,0,0,width,height);
        copy.gfRunnerImage = {slot,frame}; cache.set(key,copy); active.softImageBytes = (active.softImageBytes || 0)+bytes;
        if (window.createImageBitmap) {
          const current=copy; window.createImageBitmap(current).then(bitmap=>{
            if(cache.get(key)===current){bitmap.gfRunnerImage=current.gfRunnerImage;current.gfBitmap=bitmap;}else bitmap.close();
          });
        }
      } else if (copy) { cache.delete(key); cache.set(key,copy); }
      if (active.world) { active.world().softImages = cache; active.world().softImageBytes = active.softImageBytes; }
    }
    if (copy) {
      g.imageSmoothingQuality = 'low';
      g.drawImage(copy.gfBitmap||copy,0,0,copy.width,copy.height,...coords);
    } else g.drawImage(picture, frame * s.w + crop.x, crop.y, crop.w, crop.h, ...coords);
    if (fx) {
      const color = fx.flash > 0 ? '#ffffff' : fx.tint?.color, a = fx.flash > 0 ? fx.flash : fx.tint?.a;
      if (color && a > 0 && typeof document !== 'undefined') {
        const cache = active.tintCache ||= new Map(), key = `${slot}:${frame}:${color}`;
        let mask = cache.get(key);
        if (!mask) { mask=document.createElement('canvas');mask.width=s.w;mask.height=s.h;const c=mask.getContext('2d');c.drawImage(picture,frame*s.w,0,s.w,s.h,0,0,s.w,s.h);c.globalCompositeOperation='source-in';c.fillStyle=color;c.fillRect(0,0,s.w,s.h);cache.set(key,mask); }
        g.globalAlpha *= clamp(a,0,1);g.drawImage(mask,...coords);
      }
      g.restore();
    }
  }
  function text(g, str, box, opts) {
    if (!g) return false;
    const cache=active?.cfg?.cacheTextLayout&&opts.min===opts.max&&opts.lines===1?(active.textPaintCache||=new Map()):null,key=`${opts.max}:${!!opts.math}:${str}`;
    let prepared=cache?.get(key);
    const layout=prepared&&prepared.width<=box.w&&prepared.height<=box.h?prepared.layout:layoutText(str, box, opts, (s, px) => canvasTextWidth(g,s,px));
    if (!layout) return false;
    const { size, lines } = layout, color = opts.color || '#fff9e9', outline = opts.outline === undefined ? '#2b1d10' : opts.outline;
    if(!prepared||prepared.layout!==layout){
      const heights=lines.map(line=>size*(opts.math&&/(\d+|□)\/(\d+|□)/.test(line)?1.6:1.15)),parts=lines.map(line=>pieces(line,size,(s,px)=>canvasTextWidth(g,s,px),opts.math)),widths=parts.map(row=>row.reduce((sum,p)=>sum+p.width,0));
      prepared={layout,heights,parts,widths,width:Math.max(0,...widths),height:heights.reduce((a,b)=>a+b,0)};
      if(cache){if(cache.size>=2048)cache.delete(cache.keys().next().value);cache.set(key,prepared);}
    }
    const {heights}=prepared;
    let y = box.y + (box.h - heights.reduce((a, b) => a + b, 0)) / 2;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.strokeStyle = outline; g.lineWidth = Math.max(2, Math.round(size / 8)); g.lineJoin = 'round';
    function write(value, x, yy, px) { g.font = `${px}px DoHyeon, sans-serif`; if (outline !== null) g.strokeText(value, x, yy); g.fillText(value, x, yy); }
    lines.forEach((line, i) => {
      const parts = prepared.parts[i];
      let x = box.x + (box.w - prepared.widths[i]) / 2;
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
  function effectHooks(cfg) {
    // Runner already supplies the same answer rectangles under its old name.
    const hooks = { ...cfg.hooks, effectLabels:cfg.hooks?.effectLabels || cfg.hooks?.labels };
    const missing = ['effectBounds','effectLabels'].filter(k => typeof hooks[k] !== 'function');
    if (missing.length) { const error = Error(`놀이 틀 고리가 없어요: ${missing.join(', ')}`); error.hooks = missing; throw error; }
    return hooks;
  }
  function runner(cfg, opts) {
    const hooks = effectHooks(cfg);
    const run = { cfg, art: opts.art, measure: opts.measure, worlds: [], status: 'play', paused: false, ticks: 0, ...opts };
    run.sim = opts.sim ?? (window.GF?.sim > 0);
    run.elapsed = 0; run.real = 0;
    run.fxScreen = { particles:[], flashes:[], maxParticles:0, screenFlashPerSec:0, lightMode:0, light:false, ...(opts.log ? {log:[]} : {}) };
    run.advanceFx = dt => { run.real += dt; for (const w of run.worlds) { w.real = run.real; w.juice.update(dt); } };
    const seconds = opts.practice ? 30 : opts.duo ? opts.family.round.duoSeconds : opts.family.round.seconds;
    const index = side => side === 1 || side === 'right' ? 1 : 0;
    run.world = side => run.worlds[index(side)] || null;
    run.input = (side, kind, a, b, bot = false) => {
      active = run;
      const w = run.world(side);
      if (run.status !== 'play' || run.paused || run.modeSession?.state.paused || run.modeSession?.state.ended || !w || w.over) return;
      if (w.freezeLeft > 1e-9) {
        if (w.pressQueue.length < 3) { w.pressQueue.push({kind,a,b,bot});w.record('pressQueued',{}); }
        else w.record('pressDropped',{});
        return;
      }
      w.inputs.push({ t: w.clock, kind, ...(kind === 'key' ? { i: a } : { x: a, y: b }), bot });
      if (w.inputs.length > 200) w.inputs.shift();
      if (kind === 'key') cfg.key(w, a); else cfg.press(w, a, b);
    };
    run.tick = (effects = true) => {
      // 엔진이 고르기 창을 띄운 동안(hold)은 시간, 모드 시계, 걸음이 모두 멈춘다.
      if (run.status !== 'play' || run.paused || run.modeSession?.state.paused || run.worlds.some(w => w.hold)) return;
      active = run; run.ticks++;
      if (effects) run.advanceFx(1/60);
      const cards = run.worlds.map(w => !!(w.learning && w.card));
      const frozen = run.worlds.map(w => Math.min(1/60,w.freezeLeft));
      run.elapsed += 1/60 - (opts.duo ? 0 : frozen[0]);
      run.modeSession?.tick(1/60 - frozen[0]);
      for (const [i, w] of run.worlds.entries()) {
        w.clock = run.ticks / 60; w.timeLeft = Math.max(0, seconds - (opts.duo || !w.learning && run.worlds[0].freezeTotal === 0 ? w.clock : run.elapsed));
        if(w.learning && w.timeLeft < 1e-9)w.timeLeft=0;
        w.roundTime = opts.duo ? w.clock : run.elapsed;
        if (run.modeSession) { w.timeLeft = run.modeSession.state.remaining; w.lives = run.modeSession.state.hearts; }
        if (cards[i]) { w.card.ageMs += 1000/60; if (w.card.ageMs + 1e-7 >= w.card.autoMs) w.closeCard(true); }
        if (w.over) continue;
        if (w.immersion) immersionStep(w);
        hooks.roundStep?.(w);
        const stopped = Math.min(1/60,w.freezeLeft);w.freezeLeft = Math.max(0,w.freezeLeft-1/60);
        if (w.freezeLeft < 1e-9) { w.freezeLeft=0;while(w.pressQueue.length && w.freezeLeft === 0){const p=w.pressQueue.shift();run.input(w.side,p.kind,p.a,p.b,p.bot);} }
        w.fx.update(1 / 60); const dt = w.fx.timeScale() * (1/60-stopped);
        if (dt > 0) {
          w.time += dt;
          const input = w.botKind ? cfg.bot?.(w) : null;
          if (input?.key !== undefined) run.input(w.side, 'key', input.key, undefined, true);
          else if (input?.press) run.input(w.side, 'press', ...input.press, true);
          cfg.step(w, dt);
        }
        if (!opts.duo && !cfg.ownLives) w.lives = run.modeSession ? run.modeSession.state.hearts : w.practice ? null : Math.max(0, opts.family.round.lives - w.stats.wrong);
      }
      const w = run.world();
      if (opts.duo ? w.timeLeft === 0 || run.worlds.every(p => p.over) : w.over || (run.modeSession ? run.modeSession.state.ended : w.timeLeft <= 1e-9 || w.lives === 0)) {
        run.status = 'end'; run.onEnd?.();
      }
    };
    run.step = seconds => { for (let i = 0, n = Math.round(seconds * 60); i < n && run.status === 'play' && !run.paused; i++) { if(run.modeSession?.state.paused){run.onPowerStep?.();if(run.modeSession.state.paused)break;}run.tick(); } };
    active = run;
    for (const side of opts.duo ? ['left', 'right'] : ['solo']) {
      const view = { ...opts.view, tall: opts.view.h > opts.view.w };
      const w = { rng: rng(opts.seed), fxRng:rng((opts.seed >>> 0) ^ 0x9e3779b9), grade: opts.grade, content: opts.content, art: opts.art, family: opts.family, play: { ...opts.family.play, ...opts.game.play }, view, side, duo: opts.duo,
        time: 0, clock: 0, timeLeft: seconds, lives: opts.duo ? null : opts.family.round.lives, score: 0, over: false,
        stats: { right: 0, wrong: 0, missed: 0, maxCombo: 0 }, mult: 1, question: null, reveal: null, botKind: opts.botKind, botDelay: side === 'right' ? .9 : .6,
        fontScale: scaleFor(view.w, view.h), fx: new window.GFJuice.Fx({ seed: opts.seed }), combo: new window.GFJuice.Combo(cfg.combo || {}), inputs: [] };
      Object.assign(w,{ real:0, boost:1, freezeLeft:0, freezeTotal:0, pressQueue:[], fxScreen:run.fxScreen, sfxRoot:opts.sfxRoot, version:opts.version, effectsOff:!!opts.effectsOff });
      w.record = (name,params) => { const row = {t:w.time,real:w.real*1000,name,side:opts.duo?side:null,params};if(run.fxScreen.log){run.fxScreen.log.push(row);if(run.fxScreen.log.length>500)run.fxScreen.log.shift();}return row; };
      w.freeze = ms => { w.record('freeze',{ms});if(!run.sim && Number.isFinite(ms) && ms>0){const duration=ms/1000;w.freezeTotal+=Math.max(0,duration-w.freezeLeft);w.freezeLeft=Math.max(w.freezeLeft,duration);} };
      w.effectBounds = () => hooks.effectBounds(w); w.effectLabels = () => hooks.effectLabels(w);
      if (hooks.effectSprite) w.effectSprite = (g, particle) => hooks.effectSprite(w, g, particle);
      if (hooks.effectImpact) w.effectImpact = (g, effect) => hooks.effectImpact(w, g, effect);
      w.juice = window.GFJuice.create({world:w,canvas:opts.canvas,hud:opts.hud?.(w),feel:opts.feel,side:opts.duo?side:null});
      if(w.art.ui?.runner)w.juice=runnerNotices(w,w.juice);
      w.fx.juice = w.juice; w.fx.reactMoments = cfg.reactMoments || {}; w.avoidEffectText = cfg.avoidEffectText === true;
      w.effectSmoothingQuality = cfg.effectSmoothingQuality;
      w.pixelEffects = cfg.pixelEffects;
      w.cacheEffectText = cfg.cacheEffectText;
      w.immersion = immersionOn(opts);
      w.learning = opts.family.learn === true && !!window.GFLearn && typeof hooks.card === 'function';
      w.practice = opts.practice || null;
      if(w.practice)w.lives=null;
      if (w.learning) {
        w.review = opts.review || [];
        w.showCard = (item, kind) => {
          w.card = {...hooks.card(w,item,kind),question:w.question,ageMs:0,minMs:0,autoMs:2500};
          w.record('card', {right:w.card.right,autoMs:w.card.autoMs}); window.GFJuice.sound.play('card');
        };
        w.closeCard = (auto = false) => {
          if (!w.card) return false;
          w.card = null; return true;
        };
      }
      if (w.immersion) {
        w.musicMode = () => run.worlds.some(p => p.last10) ? 'last10' : run.worlds.some(p => p.fever.active) ? 'fever' : 'normal';
        Object.assign(w, { roundTime:0, specialRng:rng((opts.seed >>> 0) ^ 0x51ed270b), fever:{gauge:0,active:false,until:0}, last10:false,
          missions:opts.game.missions || [], missionDone:new Set() });
        Object.assign(w.stats, { special:0, fever:0, overcome:0, missions:false });
        w.judge = kind => {
          if (w.practice) return;
          if (!w.fever.active) {
            w.fever.gauge = clamp(w.fever.gauge + (kind === 'right' ? 1 : kind === 'wrong' ? -3 : 0), 0, 10);
            if (w.fever.gauge === 10) {
              Object.assign(w.fever, { gauge:0, active:true, until:w.roundTime + 6 });
              w.stats.fever++; w.boost = 2; immersionMoment(w, 'feverStart');
            }
          }
          checkMissions(w);
        };
      }
      run.worlds.push(w); w.fx.width = view.w; w.fx.height = view.h; cfg.setup(w);
      if (run.modeSession) {
        w.modeSession = run.modeSession; w.timeLeft=run.modeSession.state.remaining; w.lives=run.modeSession.state.hearts; w.modePowers = { combo: 0, shield: 0, slow: 0 };
        w.protectCombo = () => { if (!w.modePowers.combo) return false; w.modePowers.combo--; w.modeKeptMult = w.mult; return true; };
        const judge = w.judge;
        w.judge = kind => { judge?.(kind); const protectedWrong = kind === 'wrong' && w.modePowers.shield > 0; if (protectedWrong) w.modePowers.shield--; if (kind === 'wrong' && w.modeKeptMult) { w.mult = w.modeKeptMult; w.modeKeptMult = null; } run.modeSession.judge(kind, w.combo.count, {protectedWrong}); };
      }
      if (!opts.deferLayout) cfg.layout(w);
    }
    return run;
  }
  function headless(cfg, opts) {
    const run = runner(cfg, { seed: 1, botKind: null, duo: false, ...opts });
    return { world: run.world, input: run.input, step: run.step, state: () => run.status };
  }
  function artLoader(art, images, version, extraImages = {}) {
    const jobs = [], files = new Map();
    function visit(value, bank, name) {
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'defer') && typeof value.defer !== 'boolean') throw Error('art.json: defer는 참 또는 거짓이어야 해요');
      if (typeof value.file === 'string') { jobs.push({ value, bank, name }); return; }
      for (const [key, child] of Object.entries(value)) visit(child, bank, key);
    }
    visit(art.slots, images); visit(art.ui, {}); visit(art.yard?.assets, extraImages);
    const load = ({value, bank, name}) => {
      const url = /\.[a-f0-9]{8,64}\.(?:webp|png)$/.test(value.file) ? value.file : withV(value.file, version);
      if (!files.has(url)) files.set(url, new Promise((resolve, reject) => {
        const picture = new Image(); picture.onload = () => resolve(picture);
        picture.onerror = () => reject(Error(`${url}: 그림을 불러오지 못했어요`)); picture.src = url;
      }));
      return files.get(url).then(picture => { bank[name] = picture; });
    };
    let pending;
    return { deferred: jobs.some(j => j.value.defer === true), first: Promise.all(jobs.filter(j => j.value.defer !== true).map(load)),
      background() { return pending ||= Promise.all(jobs.filter(j => j.value.defer === true).map(load)); } };
  }
  function play(cfg) {
    remembered = cfg;
    if (typeof document === 'undefined') { effectHooks(cfg); return; }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(cfg), { once: true }); else boot(cfg);
  }
  async function boot(cfg) {
    const gf = window.GF, juice = window.GFJuice;
    let status = 'load', run, grade, data, images = {}, started = false, paused = false, previous, lastTick;
    let labSpeed = 1;
    let endShow, best, bestScore = null, todayTop = null, goalNode, feverNodes = [], modeCache;
    let modeStore, selectedPlay = 'quick', selectedStage = 1, modeResult, powerup, modeGoal, rendering = false, menu = null;
    const bestErrors = [];
    function bestError(message) { window.console.error(message); bestErrors.push(message); run?.world()?.record('bestError', { message }); }
    function bestForGrade() { return modeStore && !duo ? { read: () => modeStore.best(grade, selectedPlay), write: n => modeStore.record(grade, selectedPlay, n) } : bestStore(() => window.localStorage, data.game.id, grade, bestError); }
    let musicDucked = false, pauseMusic;
    const labMode = new URLSearchParams(window.location.search).get('lab') === '1' && ['127.0.0.1', 'localhost'].includes(window.location.hostname);
    const labSounds = new Map();
    let labMusic;
    function initMusic(url) {
      const music = data?.feel.music;
      window.GFMusic?.init({ ...music, src: url ?? (labMusic && labMusic.track === music?.track ? labMusic.url : music?.track ? withV(new URL(`../../assets/music/${music.track}`, window.location.href).href, data.version) : null) });
    }
    function musicButton(parent) {
      if (!data?.feel.music?.track) return;
      const b = el('button', 'gf-button gf-music', undefined, parent); b.dataset.test = 'music';
      const icon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13M9 7l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/></svg>';
      const update = () => { b.innerHTML = icon; const label = document.createElement('span'); label.textContent = window.GFMusic.enabled() ? '음악 켜짐' : '음악 꺼짐'; b.appendChild(label); b.setAttribute('aria-pressed', String(window.GFMusic.enabled())); };
      b.onclick = () => { window.GFMusic.setEnabled(!window.GFMusic.enabled()); for (const doc of new Set([document, b.ownerDocument])) doc.querySelectorAll('[data-test="music"]').forEach(n => { n.querySelector('span').textContent = window.GFMusic.enabled() ? '음악 켜짐' : '음악 꺼짐'; n.setAttribute('aria-pressed', String(window.GFMusic.enabled())); }); }; update();
    }
    const accumulator = stepper(), gate = keyGate(), durations = [];
    let frames = 0, totalMs = 0, dpr = 1, rects = [], questionNodes = [], goal, hudSize, hudGeometryDirty = true, hudNoteHidden;
    const duo = gf.mode === 'duo';
    function perf({ reset = false } = {}) { const sorted=durations.slice().sort((a,b)=>a-b), result={frames,avgMs:frames?totalMs/frames:0,p95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:0,p99Ms:sorted.length?sorted[Math.ceil(sorted.length*.99)-1]:0,maxMs:sorted.at(-1)||0};if(reset){durations.length=0;frames=0;totalMs=0;}return result; }
    window.__GAME = { state: () => status, world: side => run?.world(side) || null, score: side => run?.world(side)?.score ?? null, perf,
      step(seconds) { if (status === 'play') { if (run.modeSession?.state.paused) powerup?.advance(seconds); else run.step(seconds); draw(); } },
      modes: () => run?.modeSession?.state ?? null,
      milestone: () => run?.modeSession && showPowerup(),
      choosePowerup: i => powerup?.choose(i),
      modeResult: () => modeResult, pauseUI: () => pauseInfo() };
    // What the site's pause screen shows: one line about this round and up to three numbers.
    function pauseInfo() {
      if (!data) return null;
      if (status !== 'play' && status !== 'count') return data.art.ui ? { menu: true } : null;
      if (!run) return null;
      const w = run.world(), s = run.modeSession?.state, play = s?.play ?? null, level = s?.stage ?? null;
      const clock = sec => { const t = Math.max(0, Math.ceil(sec - 1e-9)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
      const score = (p, label = '점수') => ({ icon: 'star', label, value: (p?.score ?? 0).toLocaleString('ko-KR'), ...(p?.mult > 1 ? { mult: `×${p.mult}` } : {}) });
      const hearts = n => Number.isInteger(n) ? [{ icon: 'heart', label: '하트', hearts: { on: n, total: Math.max(n, level?.hearts ?? data.game.modeKit?.endless?.heartMax ?? n) } }] : [];
      const time = sec => ({ icon: 'clock', label: '남은 시간', value: clock(sec) });
      let stats;
      if (duo) { const wide = window.innerWidth >= window.innerHeight; stats = [0, 1].map(i => score(run.world(i), (wide ? ['왼쪽', '오른쪽'] : ['위', '아래'])[i])); }
      else if (play === 'stage') stats = [{ icon: 'flag', label: level.goal.label, value: `${s.progress} / ${level.goal.target}` }, ...hearts(s.hearts), time(s.remaining)];
      else if (play === 'endless') stats = [score(w), ...hearts(s.hearts), { icon: 'ok', label: '맞힘', value: `${s.right}개` }];
      else if (play === 'quick') stats = [score(w), time(s.remaining), { icon: 'bolt', label: '연속 맞힘', value: `${s.combo}번` }];
      else stats = [score(w), ...(Number.isFinite(w.timeLeft) ? [time(w.timeLeft)] : []), ...hearts(w.lives)];
      const file = data.art.yard?.assets?.cheer?.file ?? data.art.ui?.runner?.cheer?.file;
      const line = duo ? `2인용 게임 · ${grade}학년` : level ? `단계 지도 · ${level.id}단계 ${level.title}` : play ? `${window.GFModes.names[play]} · ${grade}학년` : `${grade}학년`;
      return { line, stats, cheer: file ? new URL(file, window.location.href).href : null, play, stage: level?.id ?? null, grade };
    }
    if (labMode) window.__GAME.lab = {
      fire(name, c = {}) {
        if (!run) return;
        const w = run.world(), b = w.effectBounds();
        return w.juice.moment(name, { x: b.x + b.w / 2, y: b.y + b.h / 2, target: w.moles?.find(m => m.hittable), points: 10, combo: 1, ...c });
      },
      setFeel(feel) {
        data.feel = window.GFFeel.merge(feel, {});
        if (run) {
          run.fxScreen.particles.length = 0;
          for (const w of run.worlds) { w.juice = juice.create({ world: w, canvas, hud: w.labHUD, feel: data.feel, side: duo ? w.side : null }); w.fx.juice=w.juice; }
          run.meter = juice.lightMeter(data.feel.limits?.light || {});
        }
        for (const [slot, url] of labSounds) juice.sound.use(slot, url);
        initMusic();
      },
      getFeel: () => window.GFFeel.merge(data?.feel || {}, {}),
      speed(value) { if (value !== 1 && value !== .25) throw Error('빠르기는 1배 또는 0.25배예요'); labSpeed = value; },
      stats: () => ({ fps: frames ? 1000 / (totalMs / frames) : 0, particles: run?.fxScreen.particles.length || 0, lightMode: !!run?.fxScreen.light }),
      useSound(slot, url) { labSounds.set(slot, url); juice.sound.audition(slot, url); },
      useMusic(url) { labMusic = { track: data.feel.music?.track, url }; initMusic(url); window.GFMusic.play(); }
    };
    for (const [name, fn] of Object.entries(cfg.hooks || {})) window.__GAME[name] = (...args) => { active = run; return run ? fn(run.world(), ...args) : null; };
    document.body.classList.add('gf-stage');
    if (!gf.inFrame) document.body.style.setProperty('--gf-band', '0px');
    function el(tag, className, content, parent = document.body) { const node = document.createElement(tag); node.className = className; if (content !== undefined) node.textContent = content; parent.appendChild(node); return node; }
    const canvas = el('canvas', 'gf-canvas'),surface=cfg.directSurface&&canvas.transferControlToOffscreen?canvas.transferControlToOffscreen():canvas;
    const g = surface.getContext('2d',{alpha:cfg.opaqueCanvas!==true,desynchronized:cfg.lowLatencyCanvas===true,willReadFrequently:cfg.cpuCanvas===true});
    if(surface!==canvas){canvas.getContext=(...args)=>surface.getContext(...args);for(const key of ['width','height'])Object.defineProperty(canvas,key,{get:()=>surface[key],set:value=>{surface[key]=value;}});}
    const vignetteCanvas=cfg.layeredEffects?el('canvas','gf-canvas gf-vignette-canvas'):null, effectsCanvas=cfg.layeredEffects?el('canvas','gf-canvas gf-effects-canvas'):null;
    const vignetteContext=vignetteCanvas?.getContext('2d'),effectsContext=effectsCanvas?.getContext('2d');let vignetteKey;
    for(const layer of [vignetteCanvas,effectsCanvas])if(layer)layer.style.pointerEvents='none';
    const hud = el('div', duo ? 'gf-hud gf-hud-duo' : 'gf-hud'); hud.hidden = true;
    const assists = el('div', 'gf-assists');
    const hudObserver = cfg.cacheHUDGeometry && window.ResizeObserver ? new ResizeObserver(() => { hudGeometryDirty = true; }) : null;
    hudObserver?.observe(hud); hudObserver?.observe(assists);
    Object.assign(assists.style, { position: 'absolute', left: '12px', right: '12px', display: 'flex', gap: '8px', alignItems: 'start', pointerEvents: 'none' });
    const note = el('section', 'gf-note gf-chip', undefined, assists); note.hidden = true;
    Object.assign(note.style, { position: 'static', flex: '1', minWidth: '0', padding: '8px 12px' });
    let scoreNodes, timeNode, bar, hearts, mult;
    const hudRows=[],multNodes=[],timeNodes=[];
    function chip(label, strongClass, parent=hud) { const section = el('section', 'gf-chip', undefined, parent); el('p', 'gf-label', label, section); return el('strong', strongClass, '0', section); }
    if (cfg.compactHUD) {
      document.body.classList.add('gf-compact');
      document.body.style.setProperty('--gf-band','0px');
      if(gf.inFrame) {
        const host=window.parent.document;
        if(host.body.classList.contains('play-page')){
          host.body.classList.add('gf-compact-host');
          host.querySelector('[data-test="exit-x"]').setAttribute('aria-label','그만하기');
          host.querySelector('[data-test="sound"]').setAttribute('aria-label','소리 켜고 끄기');
        }
      }
      scoreNodes=Array.from({length:duo?2:1},(_,i)=>{
        const row=el('div','gf-hud-row',undefined,hud);hudRows.push(row);
        const score=chip(duo?i?'오른쪽':'왼쪽':'점수',`gf-score${duo?i?' gf-side-right':' gf-side-left':''}`,row);
        score._gfFastBump=true;
        multNodes.push(el('span','gf-mult','',score.parentElement));
        const time=chip('남은 시간','gf-time',row);timeNodes.push(time);
        const ring=el('div','gf-time-ring-wrap',undefined,time.parentElement);
        ring.innerHTML='<svg class="gf-time-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="gf-time-track" cx="22" cy="22" r="19"/><circle class="gf-time-progress" cx="22" cy="22" r="19" pathLength="1" stroke-dasharray="1"/></svg>';
        time._ring=ring.querySelector('.gf-time-progress');
        const track=el('i','',undefined,el('div','gf-bar',undefined,time.parentElement));
        time._bar=track;
        if(i===0){timeNode=time;bar=track;mult=multNodes[0];}
        const section=el('section','gf-chip gf-life-chip',undefined,row);section.setAttribute('aria-label',duo?'함께 겨뤄요':'목숨');
        const life=el('div','gf-hearts',duo?'♥':undefined,section);if(!duo)hearts=life;
        return score;
      });
      if(!duo){goalNode=el('section','gf-goal gf-chip',undefined,assists);goalNode.hidden=true;goalNode.dataset.test='goal';el('p','gf-label','오늘의 도전',goalNode);el('strong','','',goalNode);}
    } else if (duo) {
      scoreNodes = [chip('왼쪽 ▲', 'gf-score gf-side-left'), null]; timeNode = chip('남은 시간', 'gf-time'); scoreNodes[1] = chip('오른쪽 ●', 'gf-score gf-side-right');
    } else {
      scoreNodes = [chip('점수', 'gf-score')]; mult = el('span', 'gf-mult', '', scoreNodes[0].parentElement);
      timeNode = chip('남은 시간', 'gf-time'); bar = el('i', '', undefined, el('div', 'gf-bar', undefined, timeNode.parentElement));
      const section = el('section', 'gf-chip', undefined, hud); el('p', 'gf-label', '목숨', section); hearts = el('div', 'gf-hearts', undefined, section);
      const target = el('section', 'gf-goal gf-chip', undefined, assists); goalNode = target; target.dataset.test = 'goal'; target.hidden = true; el('p', 'gf-label', '오늘의 도전', target);
      Object.assign(target.style, { position: 'static', width: '164px', maxWidth: '55%', minHeight: '60px', flexShrink: '0', padding: '8px 12px', marginLeft: 'auto' });
      const label = el('strong', '', '오늘 첫 1등이 되어 보세요', target); Object.assign(label.style, { fontSize: '16px', margin: '2px 0' });
    }
    gf.on('goal', ({ top }) => { todayTop = top; if (run?.world().immersion && !duo) updateBestGoal(); });
    function updateBestGoal() {
      if (!goalNode || !run) return;
      const w = run.world(); let label = '';
      if(w.practice){goalNode.hidden=true;return;}
      if (bestScore !== null && w.score <= bestScore) label = `최고 기록까지 ${bestScore - w.score}점`;
      else if (w.score > (bestScore ?? 0) && !w.bestAnnounced) {
        w.bestAnnounced = true; w.bestBannerUntil = w.roundTime + 1.2;
        immersionMoment(w, 'best');
      }
      if (w.bestBannerUntil > w.roundTime) label = '최고 기록!';
      else if (!label && todayTop !== null && w.score <= todayTop) label = `오늘 1등까지 ${todayTop - w.score + 1}점`;
      if (goalNode.hidden !== !label) goalNode.hidden = !label;
      const strong = goalNode._strong ||= goalNode.querySelector('strong');
      if (strong.textContent !== label) {
        strong.textContent = label;
        strong.style.fontSize = '16px';
        if (label && strong.scrollWidth > strong.clientWidth) strong.style.fontSize = `${Math.max(9, Math.floor(16 * strong.clientWidth / strong.scrollWidth))}px`;
      }
    }
    function updateImmersionHUD() {
      for (const [i, w] of run.worlds.entries()) {
        const node = feverNodes[i]; if (!node) continue;
        const value = w.fever.active ? Math.max(0, (w.fever.until - w.roundTime) / 6) : w.fever.gauge / 10;
        const key = `${w.fever.active}:${Math.round(value * 100)}`;
        if (node._value !== key) { node._value = key; node.classList.toggle('gf-fever-active', w.fever.active); if(cfg.compactHUD)node.firstElementChild.style.transform=`scaleX(${value})`;else node.firstElementChild.style.width = `${value * 100}%`; node.setAttribute('aria-valuenow', String(Math.round(value * 10))); node.setAttribute('aria-valuetext', w.fever.active ? '피버 중이에요' : `피버 ${w.fever.gauge}칸`); }
      }
      const mode = run.worlds.some(w => w.last10) ? 'last10' : run.worlds.some(w => w.fever.active) ? 'fever' : 'normal';
      if (mode !== modeCache) { window.GFMusic?.setMode(mode); modeCache = mode; }
      if (!duo) updateBestGoal();
    }
    function resize() {
      hudGeometryDirty = true;
      const W = window.innerWidth, H = window.innerHeight, tall = H > W;
      dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      for(const layer of [vignetteCanvas,effectsCanvas])if(layer){layer.width=canvas.width;layer.height=canvas.height;}vignetteKey=null;
      rects = !duo ? [{ x: 0, y: 0, w: W, h: H }] : tall ? [{ x: 0, y: 0, w: W, h: Math.floor(H / 2) }, { x: 0, y: Math.floor(H / 2), w: W, h: H - Math.floor(H / 2) }] : [{ x: 0, y: 0, w: Math.floor(W / 2), h: H }, { x: Math.floor(W / 2), y: 0, w: W - Math.floor(W / 2), h: H }];
      if (duo) { scoreNodes[0].previousElementSibling.textContent = tall ? '위쪽 ▲' : '왼쪽 ▲'; scoreNodes[1].previousElementSibling.textContent = tall ? '아래쪽 ●' : '오른쪽 ●'; }
      if (!run) return;
      active = run; run.dpr = dpr;
      if (!duo && !cfg.compactHUD) {
        const section = scoreNodes[0].parentElement;
        if (W <= 600) section.style.minWidth = '0px';
        else {
          const score = scoreNodes[0].cloneNode(false), badge = mult.cloneNode(false);
          score.textContent = run.world().immersion ? String(data.game.ranking?.maxScore || 0) : (data.game.ranking?.maxScore || 0).toLocaleString('ko-KR');
          badge.textContent = `×${((cfg.combo?.steps?.length || 0) + 1) * (run.world().immersion ? 2 : 1)}`; badge.hidden = false;
          for (const probe of [score, badge]) { probe.style.position = 'absolute'; probe.style.visibility = 'hidden'; section.appendChild(probe); }
          const css = getComputedStyle(section);
          const width = score.getBoundingClientRect().width + badge.getBoundingClientRect().width + parseFloat(getComputedStyle(badge).marginLeft) + parseFloat(css.paddingLeft) + parseFloat(css.paddingRight) + 2;
          section.style.minWidth = `${Math.ceil(width)}px`; score.remove(); badge.remove();
        }
      }
      run.worlds.forEach((w, i) => { w.view = { ...rects[i], tall: rects[i].h > rects[i].w, top: 8 }; w.fontScale = scaleFor(w.view.w, w.view.h); w.fx.width = w.view.w; w.fx.height = w.view.h; });
      questionNodes.forEach(q => { q._frame = null; q._compactFit = null; q.style.height = ''; });
      if (run.world().immersion && goalNode?._strong) goalNode._strong.textContent = '';
      assists._height = null; assists.style.minHeight = '';
      fitQuestions(); run.worlds.forEach((w,i) => {cfg.layout(w);w._compactGeometryChanged=false;if(cfg.cacheVignette&&w.immersion&&!w.effectsOff&&!vignetteCanvas)prepareVignettes(w,rects[i]);});
      draw();
    }
    function fitQuestions() {
      if(cfg.compactHUD){fitCompactQuestions();return;}
      const band = parseFloat(getComputedStyle(document.body).getPropertyValue('--gf-band')) || 0;
      const info = hud.getBoundingClientRect();
      let contentBottom = info.bottom;
      run.worlds.forEach((w, i) => {
        const r = rects[i], q = questionNodes[i], big = q.firstElementChild;
        const reveal = w.reveal && w.time < w.reveal.until ? w.reveal.answer : undefined;
        const question = w.card ? w.card.question : w.question;
        const html = question === null ? '' : questionHTML(question, reveal);
        const sideBySide = !duo && !w.view.tall;
        let width = sideBySide ? Math.min(2 * (r.w / 2 - info.right - 8), .56 * r.w) : .92 * r.w;
        let top = sideBySide ? band + 2 : (r.y === 0 ? info.bottom + 8 : r.y + 8);
        const min = Math.ceil(40 * w.fontScale), max = Math.round(56 * w.fontScale);
        let lineHeight = 1.2;
        q.style.left = `${r.x + r.w / 2}px`; q.style.padding = `${Math.round(12 * w.fontScale)}px`;
        function fit() {
          const key=`${big._html}:${width}:${lineHeight}:${min}:${max}:${q._frame?.height}`;
          if(cfg.cacheQuestionFit&&q._fit?.key===key)return q._fit.ok;
          const result=ok=>{q._fit={key,ok};return ok;};
          q.style.width = `${Math.max(1, width)}px`; big.style.lineHeight = String(lineHeight);
          for (const lines of [1, 2]) for (let px = max; px >= min; px--) {
            big.style.fontSize = `${px}px`;
            if (big.getBoundingClientRect().height <= lines * lineHeight * px + 2 && big.scrollWidth <= big.clientWidth + 1 &&
                (!q._frame || big.getBoundingClientRect().height <= q._frame.height - 2 * Math.round(12 * w.fontScale) - 2)) return result(true);
          }
          return result(false);
        }
        if (w.immersion && !cfg.reserveQuestionLines && q._html !== html) { q._frame = null; q.style.height = ''; }
        // Legacy families retain their reserved question frame.
        // Refit content inside that frame; only a window resize may replace it.
        if (!q._frame) {
          q.hidden = false; big._html = w.immersion ? html : questionHTML(w.play.rule);big.innerHTML=big._html;
          if (!fit() && sideBySide) { top = info.bottom + 8; width = .56 * r.w; fit(); }
          const height = w.immersion && !cfg.reserveQuestionLines ? q.getBoundingClientRect().height : Math.max(q.getBoundingClientRect().height,
            (cfg.reserveQuestionLines || 2) * (cfg.reserveQuestionLines ? max : min) * (cfg.questionLineHeight || 1.2) + 2 * Math.round(12 * w.fontScale) + 2);
          q._frame = { top, width, height }; q.style.height = `${height}px`;
        }
        ({ top, width } = q._frame);
        if(!cfg.cacheQuestionFit||big._html!==html){big.innerHTML=html;big._html=html;}q._html=html;q._question=question;q._reveal=reveal;q.hidden=question===null;
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
    function fitCompactQuestions() {
      run.worlds.forEach((w,i)=>{
        const r=rects[i],row=hudRows[i],q=questionNodes[i],big=q.firstElementChild;
        const question=w.question,reveal=w.reveal&&w.time<w.reveal.until?w.reveal.answer:undefined;
        const html=question===null?'':questionHTML(question,reveal);
        if(q._question!==question){w.ruleIntroUntil=w.clock+3;q._question=question;}
        const intro=cfg.ruleIntro&&w.clock<w.ruleIntroUntil,key=`${r.x}:${r.y}:${r.w}:${r.h}:${dpr}:${html}:${!!intro}:${question===null}`;
        if(q._compactFit===key)return;
        const previousTop=w.view.top,previousReserve=w.cardReserve;
        const pill=window.GFUI?.hudSize(window.innerWidth,window.innerHeight)||44,limit=window.GFUI?.topLimit(duo?window.innerWidth:r.w,duo?window.innerHeight:r.h)||r.h*.2;
        const margin=4,controlSide=duo&&window.innerWidth>window.innerHeight?1:0,controls=i===controlSide?2*pill+20:0;
        Object.assign(row.style,{left:`${r.x+6}px`,top:`${r.y+margin}px`,width:`${r.w-controls-12}px`,height:`${pill}px`});
        row.style.setProperty('--hud-pill',`${pill}px`);
        if(big._html!==html){big.innerHTML=html;if(data.art.ui)window.GFUI.symbols(big);big._html=html;}
        const inline=r.w>r.h, maxHeight=inline?pill:Math.max(18,Math.floor(limit)-pill-margin-4);
        const px=cfg.ruleIntro?(intro?Math.min(24,r.w/17,maxHeight/1.2):16):Math.min(32,r.w/14,maxHeight/(html.includes('gf-frac')?1.65:1.2));
        Object.assign(q.style,{left:`${r.x+r.w/2}px`,top:`${r.y+(inline?margin:pill+margin+2)}px`,width:inline?`${r.w*.36}px`:'max-content',maxWidth:`${inline?r.w*.36:r.w-16}px`,padding:'1px 6px',height:'auto'});
        big.style.fontSize=`${Math.floor(px)}px`;big.style.lineHeight='1.1';
        for(let font=Math.floor(px);font>12&&(big.scrollWidth>big.clientWidth+1||q.getBoundingClientRect().height>maxHeight-2);font--)big.style.fontSize=`${font-1}px`;
        q.classList.toggle('gf-rule-small',cfg.ruleIntro&&!intro);q.hidden=question===null;
        q._html=html;q._reveal=reveal;
        w.view.top=Math.floor(limit);
        w.cardReserve=Math.min(duo?150:r.w<=600?170:250,Math.floor(r.h*(duo?.31:.33)));
        q._compactFit=key;w._compactGeometryChanged=previousTop!==w.view.top||previousReserve!==w.cardReserve;
      });
      Object.assign(assists.style,{top:'auto',bottom:'4px',left:'8px',right:'8px',minHeight:'0'});
    }
    const cardNodes = new Map();
    function modeChanged(kind, amount) {
      if (kind === 'time') {
        timeNode.parentElement.querySelectorAll('.gf-mode-time-float').forEach(n=>n.remove());
        const node = el('span', `gf-mode-time-float${amount < 0 ? ' loss' : ''}`, `${amount > 0 ? '+' : ''}${Number(amount.toFixed(1))}`, timeNode.parentElement);
        window.setTimeout(() => node.remove(), 950);
      } else if (kind === 'heart') {
        hearts.classList.remove('gf-heart-loss', 'gf-heart-gain');
        hearts.classList.add(amount < 0 ? 'gf-heart-loss' : 'gf-heart-gain');
        window.setTimeout(() => hearts.classList.remove('gf-heart-loss', 'gf-heart-gain'), 750);
      }
    }
    function showPowerup() {
      if (!run?.modeSession || selectedPlay === 'stage' || run.modeSession.state.ended || run.modeSession.state.paused || status !== 'play') return;
      const pool = data.game.modeKit.powerups.filter(p => !p.plays || p.plays.includes(selectedPlay));
      if (!pool.length) return;
      run.modeSession.pause(true); gate.clear();
      const offset = run.world().modePowerCount || 0, options = Array.from({length:3}, (_,i) => pool[(offset+i)%pool.length]);
      powerup = window.GFModesUI.powerup(document.body, {art:data.art, family:cfg.family, options, paused:() => paused, choose: p => {
        const w = run.world();
        if (p.id === 'clock') run.modeSession.addTime(10);
        if (p.id === 'combo') w.modePowers.combo++;
        if (p.id === 'shield') w.modePowers.shield++;
        if (p.id === 'slow') w.modePowers.slow++;
        if (p.id === 'golden') { const at = w.roundTime + 5; w.specialTimes.push(at); w.specialTimes.sort((a,b)=>a-b); }
        w.modePowerCount = offset + 1; w.record('powerup', {id:p.id}); run.modeSession.pause(false); powerup = null; previous = undefined; accumulator.reset();
      }});
    }
    function updateHUD(layout = true) {
      if (!run) return;
      run.worlds.forEach((w, i) => { if (scoreNodes[i]._score !== w.score) { if(w.effectsOff)scoreNodes[i].textContent=w.immersion?String(w.score):w.score.toLocaleString('ko-KR');else if(w.immersion)juice.rollPlainNumber(scoreNodes[i],w.score);else juice.rollNumber(scoreNodes[i], w.score); scoreNodes[i]._score = w.score; if (i === 0) goal?.update(w.score); } });
      const w = run.world(), mode = run.modeSession?.state, seconds = Math.ceil(mode?.play === 'endless' ? mode.elapsed : w.timeLeft), duration = w.practice ? 30 : mode?.play === 'quick' ? data.game.modeKit.quick.maxSec : mode?.stage?.timeSec ?? (duo ? data.family.round.duoSeconds : data.family.round.seconds);
      // Replacing unchanged text forces layout again at the geometry read below.
      if (timeNode._seconds !== seconds) {
        timeNode.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        timeNode.parentElement.classList.toggle('gf-hurry', seconds <= 10); timeNode._seconds = seconds;
      }
      if (bar) { if(cfg.compactHUD)compactBar(bar,w.timeLeft/duration);else bar.style.width = `${w.timeLeft / duration * 100}%`; }
      if (!w.immersion && status === 'play' && seconds <= 10 && seconds > 0 && lastTick !== seconds) juice.sfx.play('tick'); lastTick = seconds;
      if (hearts && !w.practice && hearts._lives !== w.lives) { hearts.innerHTML = '♥'.repeat(w.lives ?? 0) + '<span>♥</span>'.repeat(Math.max(0,(mode?.stage?.hearts ?? data.game?.modeKit?.endless.heartMax ?? data.family.round.lives) - (w.lives ?? 0))); hearts._lives = w.lives; hearts.setAttribute?.('aria-label', `하트 ${w.lives ?? 0}개`); }
      if (mode) {
        if(timeNode._play!==mode.play){timeNode.parentElement.hidden = !cfg.stageOnly && mode.play !== 'quick'; hearts.parentElement.hidden = mode.play === 'quick';if(modeGoal)modeGoal.hidden=cfg.stageOnly||mode.play!=='stage';timeNode._play=mode.play;}
        if (modeGoal && mode.stage) { const text = `${mode.stage.goal.label} ${mode.progress} / ${mode.stage.goal.target}`; if (modeGoal.textContent !== text) { modeGoal.textContent = text; modeGoal.style.setProperty('--goal-progress', `${Math.min(100,mode.progress/mode.stage.goal.target*100)}%`); modeGoal.setAttribute('aria-valuenow', mode.progress); } }
      }
      else if (modeStore && timeNode._play) { timeNode.parentElement.hidden=false; if(modeGoal)modeGoal.hidden=true;timeNode._play=null; }
      const displayMult = w.mult * (w.immersion ? w.boost : 1);
      const showBaseMult = mode && !duo;
      if (mult && mult._mult !== displayMult) { mult.textContent = displayMult > 1 || showBaseMult ? `×${displayMult}` : ''; mult.hidden = displayMult <= 1 && !showBaseMult; mult._mult = displayMult; }
      if(cfg.compactHUD){
        run.worlds.forEach((p,i)=>{const m=multNodes[i],n=timeNodes[i],value=p.mult*(p.boost||1);if(m._mult!==value){m.textContent=value>1||showBaseMult?`×${value}`:'';m.hidden=value<=1&&!showBaseMult;m._mult=value;}
          const ring=n._ring,seconds=Math.ceil(p.timeLeft);if(ring&&ring._seconds!==seconds){ring.style.strokeDashoffset=String(1-Math.max(0,p.timeLeft/duration));ring._seconds=seconds;}
          if(i){if(n.textContent!==timeNode.textContent)n.textContent=timeNode.textContent;compactBar(n._bar,p.timeLeft/duration);}});
      }
      if (w.immersion) updateImmersionHUD();
      const hideNote = status !== 'play' || w.clock >= 3 || w.inputs.some(p=>!p.bot); if (note.hidden !== hideNote) note.hidden = hideNote;
      const questionChanged = run.worlds.some((w, i) => {
        const question=cfg.compactHUD?w.question:w.card?w.card.question:w.question;
        const reveal=w.reveal&&w.time<w.reveal.until?w.reveal.answer:undefined,node=questionNodes[i];
        return question!==node._question||reveal!==node._reveal;
      });
      let size = hudSize;
      if (!hudObserver || hudGeometryDirty || hudNoteHidden !== note.hidden || questionChanged) {
        const info = hud.getBoundingClientRect(); size = `${info.width}:${info.height}:${note.hidden}:${assists.getBoundingClientRect().height}`;
        hudGeometryDirty = false; hudNoteHidden = note.hidden;
      }
      const changed = size !== hudSize || questionChanged || cfg.ruleIntro&&questionNodes.some((q,i)=>q.classList.contains('gf-rule-small')===(run.worlds[i].clock<run.worlds[i].ruleIntroUntil));
      hudSize = size;
      if (changed) { fitQuestions(); if (layout) run.worlds.forEach(w => {if(!cfg.compactHUD||w._compactGeometryChanged)cfg.layout(w);w._compactGeometryChanged=false;}); }
    }
    function cardHTML(card, options) {
      // 놀 때는 이유를 적지 않는다(Matto: 게임하는데 이유까지 볼 시간이 없다). 끝난 뒤 복습 카드에서만 보여 준다.
      const quiet = options?.note === false;
      const note = quiet ? '' : `<p class="gf-learn-note">${escapeHTML(card.note)}</p>`;
      const strategy = quiet ? '' : `<p class="gf-learn-strategy">${escapeHTML(card.strategy||'')}</p>`;
      if(card.presentation==='mole-b2')return `<span class="gf-b2-check" aria-hidden="true">✓</span><div class="gf-b2-copy"><div class="gf-learn-word gf-learn-right"><span class="gf-b2-label">바른 말: </span>${card.diff.right.map(p=>`<span data-mark="${p.mark}">${escapeHTML(p.s)}</span>`).join('')}</div>${note}</div>`;
      if(card.diff===false) {
        const plain=(value,side)=>`<div class="gf-learn-word gf-learn-${side}"><span class="gf-learn-symbol" aria-label="${side==='wrong'?'틀린 답':'바른 답'}"></span><span data-mark="diff">${escapeHTML(value)}</span></div>`;
        const frames=(card.frames||[]).map((n,k)=>`<span>${card.frameLabels?.[k]?`<small>${escapeHTML(card.frameLabels[k])}</small>`:''}<span class="gf-ten-frame" aria-label="${escapeHTML(card.frameLabels?.[k]||'열 칸')} 중 ${n}개">${Array.from({length:10},(_,i)=>`<i class="${i<n?'gf-dot-filled':''}"></i>`).join('')}</span></span>`).join('');
        return plain(card.wrong,'wrong')+plain(card.right,'right')+note+strategy+(frames?`<div class="gf-ten-frames" data-test="ten-frame">${frames}</div>`:'');
      }
      const line = (parts, side) => `<div class="gf-learn-word gf-learn-${side}"><span class="gf-learn-symbol" aria-label="${side==='wrong'?'틀린 말':'바른 말'}"></span>${parts.map(p=>`<span data-mark="${p.mark}">${escapeHTML(p.s)}</span>`).join('')}</div>`;
      return line(card.diff.wrong,'wrong')+line(card.diff.right,'right')+note;
    }
    function updateCards() {
      for(const [i,w] of run.worlds.entries()) {
        let node=cardNodes.get(i);
        if(!w.learning||!w.card||status!=='play') {if(node){node.remove();cardNodes.delete(i);}continue;}
        if(!node) {
          node=el('div',`gf-learn-layer${duo?' gf-learn-duo':''}`);cardNodes.set(i,node);
          const box=el('section','gf-learn-card',undefined,node);box.dataset.test='card';box.setAttribute('role','status');
          node.onclick=()=>w.closeCard();
        }
        if(node._card!==w.card){node._card=w.card;node.classList.toggle('gf-mole-b2',w.card.presentation==='mole-b2');node.firstElementChild.innerHTML=cardHTML(w.card,{note:false});}
        const r=rects[i],key=`${r.x}:${r.y}:${r.w}:${r.h}:${w.cardReserve}`;
        if(node._rect!==key){node._rect=key;node.style.setProperty('--gf-card-height',`${(w.cardReserve||r.h*.27)-12}px`);Object.assign(node.style,{left:`${r.x+6}px`,top:`${r.y+r.h-(w.cardReserve||r.h*.27)+6}px`,width:`${r.w-12}px`,height:`${(w.cardReserve||r.h*.27)-12}px`});}
      }
    }
    function paintVignette(w,r,target,last10=w.last10){
      const gradient=target.createRadialGradient(r.w/2,r.h/2,Math.min(r.w,r.h)*.25,r.w/2,r.h/2,Math.max(r.w,r.h)*.65);
      gradient.addColorStop(0,'transparent');gradient.addColorStop(1,last10?'rgba(237,104,96,.15)':'rgba(255,198,74,.15)');target.fillStyle=gradient;target.fillRect(0,w.view.top,r.w,r.h-w.view.top);
    }
    function prepareVignettes(w,r){
      const key=`${r.w}:${r.h}:${w.view.top}:${dpr}`;if(w.vignettePrepared?.key===key)return;
      const layers=[false,true].map(last10=>{const layer=document.createElement('canvas');layer.width=Math.round(r.w*dpr);layer.height=Math.round(r.h*dpr);const context=layer.getContext('2d',{willReadFrequently:true});context.setTransform(dpr,0,0,dpr,0,0);paintVignette(w,r,context,last10);return layer;});
      w.vignettePrepared={key,layers};
    }
    function draw() {
      if (!run) return;
      const duck = status === 'end' || run.worlds.some(p => p.card || p.reveal && p.time < p.reveal.until);
      if (duck !== musicDucked) { musicDucked = duck; window.GFMusic?.duck(duck); }
      active = run; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      if(effectsContext){effectsContext.setTransform(dpr,0,0,dpr,0,0);effectsContext.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);}
      run.worlds.forEach((w, i) => { const r = rects[i]; g.save(); g.translate(w.art.pixel === true ? Math.round(r.x) : r.x, w.art.pixel === true ? Math.round(r.y) : r.y); g.beginPath(); g.rect(0, 0, r.w, r.h); g.clip();
        const shake=w.juice.shakeOffset();
        if (w.art.pixel === true || cfg.pixelShake && w.art.pixel !== false) { shake.x = Math.round(shake.x); shake.y = Math.round(shake.y); }
        // Keep the scenery behind translucent information chips stationary too.
        if(shake.x||shake.y){g.save();g.beginPath();g.rect(0,0,r.w,w.view.top);g.clip();(cfg.drawBehindHUD||cfg.draw)(w,g);g.restore();}
        g.save();if(shake.x||shake.y){g.beginPath();g.rect(0,w.view.top,r.w,r.h-w.view.top);g.clip();}w.fx.camera(g);g.translate(shake.x,shake.y);cfg.draw(w,g);g.restore();
        if (!vignetteCanvas && w.immersion && !w.effectsOff && (w.fever.active || w.last10)) {
          if(cfg.cacheVignette){
            const key=`${r.w}:${r.h}:${w.view.top}:${dpr}:${!!w.last10}`;
            if(w.vignetteKey!==key){prepareVignettes(w,r);w.vignetteLayer=w.vignettePrepared.layers[Number(!!w.last10)];w.vignetteKey=key;}
            g.drawImage(w.vignetteLayer,0,0,r.w,r.h);
          }else paintVignette(w,r,g);
        }
        const effectG=effectsContext||g;
        if(effectsContext){effectG.save();effectG.translate(r.x,r.y);effectG.beginPath();effectG.rect(0,0,r.w,r.h);effectG.clip();}
        if(!w.effectsOff){
          if(w.fx.hasDrawing?.()!==false)w.fx.draw(effectG, { width: r.w, height: r.h, textBounds: w.effectBounds(), textAvoid: w.effectLabels() });else{w.fx.width=r.w;w.fx.height=r.h;}w.juice.draw(effectG);
        }if(effectsContext)effectG.restore();g.restore(); });
      if(vignetteContext){
        const key=run.worlds.map((w,i)=>`${rects[i].x}:${rects[i].y}:${rects[i].w}:${rects[i].h}:${w.view.top}:${w.immersion&&!w.effectsOff&&(w.fever.active||w.last10)}:${!!w.last10}`).join('|');
        if(vignetteKey!==key){vignetteKey=key;vignetteContext.setTransform(dpr,0,0,dpr,0,0);vignetteContext.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);run.worlds.forEach((w,i)=>{if(w.immersion&&!w.effectsOff&&(w.fever.active||w.last10)){const r=rects[i];vignetteContext.save();vignetteContext.translate(r.x,r.y);vignetteContext.beginPath();vignetteContext.rect(0,0,r.w,r.h);vignetteContext.clip();paintVignette(w,r,vignetteContext);vignetteContext.restore();}});}
      }
      if (duo) { const divider=effectsContext||g;divider.fillStyle = '#3c382e'; if (window.innerHeight > window.innerWidth) divider.fillRect(0, rects[1].y - 2, window.innerWidth, 4); else divider.fillRect(rects[1].x - 2, 0, 4, window.innerHeight); }
      updateHUD();
      if(run.world().learning)updateCards();
    }
    function frame(time) {
      if (!run) { previous=undefined;window.requestAnimationFrame(frame);return; }
      const hidden = run?.world().learning && document.hidden;
      const held = run?.modeSession?.state.paused;
      const live = status === 'play' && !paused && !hidden && !held;
      if (previous !== undefined && !paused && !hidden && !held) {
        const interval=Math.max(0,time-previous),dt=Math.min(.1,interval/1000) * labSpeed;
        if (live) { durations.push(interval);frames++;totalMs+=interval;const light=run.meter.frame(interval);if(light!==run.fxScreen.light){run.fxScreen.light=light;run.fxScreen.lightMode++;run.world().record('lightMode',{on:light});}
          if(run.decorMeter){const sparse=run.decorMeter.frame(interval);if(sparse!==run.world().decorLight){for(const w of run.worlds)w.decorLight=sparse;run.world().record('decorLight',{on:sparse});}}
        }
        run.advanceFx(dt);
        if (endShow && status === 'end') endShow.advance(dt);
        if(live){const n=accumulator.add(dt);for(let i=0;i<n;i++)run.tick(false);}
      }
      previous = paused || hidden || held ? undefined : time; draw();
      window.requestAnimationFrame(frame);
    }
    function showEnd() {
      if(data.art.ui&&gf.inFrame)window.parent.document.body.dataset.uiState='end';
      const mainRun=run, mainWorld=run.world(), mainScore=mainWorld.score;
      const screen = el('section', 'gf-end-show'); screen.dataset.test = 'end-show';
      if(data.art.ui){window.GFUI.theme(screen,cfg.family);window.GFUI.background(screen,data.art,'result');window.GFUI.license(screen);}
      const panel = el('div', 'gf-end-panel', undefined, screen);
      const heading = el('h2', '', '그만!', panel);
      const scores = el('div', duo ? 'gf-end-scores gf-end-duo' : 'gf-end-scores', undefined, panel);
      const scoreLabels = run.worlds.map((w, i) => {
        const col = el('div', 'gf-end-side', undefined, scores);
        if (duo) el('p', '', window.innerHeight > window.innerWidth ? i ? '아래쪽' : '위쪽' : i ? '오른쪽' : '왼쪽', col);
        const value = el('strong', '', '0점', col); value.dataset.test = `end-score-${i}`;
        return value;
      });
      const missions = el('ol', 'gf-end-missions', undefined, panel);
      const missionLabels = (data.game.missions || []).map(m => {
        const item = el('li', '', m.text, missions); item.dataset.earned = String(run.world().missionDone.has(m.id)); return item;
      });
      const message = el('p', 'gf-end-message', '', panel); message.setAttribute('role', 'status');
      const result = el('button', 'gf-button gf-primary', '결과 보기', panel); result.dataset.test = 'to-result'; result.hidden = true;
      let sharedSummary,learning,actions,winnerNode,duoScoreNodes;
      if(data.art.ui){
        sharedSummary=window.GFUI.summary(panel,{score:mainScore,stats:mainWorld.stats,best:bestScore??0,thresholds:data.game.ranking.stars});
        if (modeResult) window.GFModesUI.decorateResult(sharedSummary, modeResult);
        learning=el('section','gf-result-learning',undefined,panel);el('h3','','오늘 고친 것',learning);
        actions=el('div','gf-result-actions',undefined,screen);
        const replay=el('button','gf-button gf-primary','한 판 더',actions);replay.dataset.test='end-replay';replay.onclick=()=>{if(gf.inFrame){window.__GAME.replayRequested=true;sendResult(true);}else window.location.reload();};
        const other=el('button','gf-button','다른 게임',actions);other.dataset.test='end-other';other.onclick=()=>gf.exit();
        if (modeResult?.play === 'stage') {
          replay.textContent = modeResult.passed && selectedStage < 10 ? '다음 단계' : '다시 도전';
          replay.dataset.test = 'end-next';
          replay.onclick = () => { window.__GAME.nextStage = modeResult.passed && selectedStage < 10 ? selectedStage + 1 : selectedStage; window.__GAME.replayRequested = true; if(gf.inFrame)sendResult(true);else {const url=new URL(location.href);url.searchParams.set('play','stage');url.searchParams.set('stage',window.__GAME.nextStage);location.href=url.href;} };
          other.textContent = '지도'; other.dataset.test = 'end-map'; other.onclick = () => {screen.remove();endShow=null;run=null;status='title';started=false;hud.hidden=true;modeGoal?.remove();modeGoal=null;feverNodes.forEach(n=>n.remove());feverNodes=[];showStageMap();};
        }
        result.classList.remove('gf-primary');screen.append(result);
        // 「결과 보기」는 처음부터 둔다. 복습이 뜰 때 나타나면 그 순간 화면이 달라 보인다.
        if(!duo){result.hidden=false;el('i','gf-next-triangle',undefined,result);}
        if(!duo)window.GFUI.animateResult(panel,mainScore,window.GFUI.starLevel(mainScore,data.game.ranking.stars),name=>juice.sound.play(name));
        if(duo){sharedSummary.classList.add('gf-result-duo');sharedSummary.querySelector('.gf-result-heading').textContent='함께 한 판, 정말 잘했어요!';
          // 승패 글은 요약 카드 안에 처음부터 넣는다. 4단계에 새 칸으로 띄우면 그때 카드가 밀려 올라간다.
          // 자리는 혼자 판의 최고 기록 뱃지 자리를 쓴다. 최고 기록은 둘이 하는 판과 상관없는 값이다.
          winnerNode=sharedSummary.querySelector('.gf-result-record');winnerNode.textContent=winnerText(run.world().score,run.world(1).score,window.innerHeight>window.innerWidth);winnerNode.dataset.test='winner';
          // 통계 줄은 쪽마다의 맞힌 수로 바꾼다. 혼자 판의 「맞힌 수·최대 콤보」는 한쪽 것뿐이라 둘이 판에서 뜻이 없다.
          const side=i=>window.innerHeight>window.innerWidth?(i?'아래쪽':'위쪽'):(i?'오른쪽':'왼쪽');
          const counts=sharedSummary.querySelector('.gf-result-stats');counts.textContent='';
          run.worlds.forEach((w,i)=>el('span','',`${side(i)} ${w.stats.right||0}개`,counts));
          // 점수를 쪽마다 나눠 둔다. 이긴 쪽 왕관은 그 위에 얹어 칸을 차지하지 않게 한다.
          const number=sharedSummary.querySelector('.gf-result-number');number.textContent='';
          duoScoreNodes=run.worlds.map((w,i)=>{if(i)el('span','gf-duo-gap',' : ',number);return el('span','gf-duo-score',w.score.toLocaleString('ko-KR'),number);});
          learning.hidden=true;}
      }
      cfg.resultExtra?.(panel,{world:mainWorld,mode:modeResult,data,images,el});
      let finished = false;
      function sendResult(requested = false) {
        if(!duo&&mainWorld.learning&&mainWorld.review.length&&!requested){showReview();return;}
        if (finished) return; finished = true;
        if (!duo) for (const id of earned(data.game.stamps, mainWorld.stats, mainScore)) gf.stamp(id);
        gf.finish(duo ? undefined : { score:mainScore });
      }
      let reviewNode, practiceButton;
      function showReview(focus = true) {
        if(!mainWorld.learning||duo)return;
        reviewNode?.remove();reviewNode=el('div','gf-review',undefined,learning||panel);reviewNode.dataset.test='review';
        heading.textContent='오늘 헷갈린 것';scores.hidden=true;missions.hidden=true;message.hidden=true;
        const selected=window.GFLearn.pickReview(mainWorld.review);
        // 다 맞혔으면 칸이 비어 휑하다. 복습 카드 자리에 칭찬 카드를 둔다.
        if(!selected.length){const clear=el('article','gf-learn-card gf-review-card gf-review-clear',undefined,reviewNode);
          el('strong','','오늘은 고칠 게 없어요',clear);el('span','','하나도 안 틀렸어요. 다음엔 더 어려운 판에 도전해 볼까요?',clear);}
        for(const row of selected){const c=el('article','gf-learn-card gf-review-card',undefined,reviewNode);c.innerHTML=cardHTML(cfg.hooks.card(mainWorld,row.item,row.kind));el('small','',row.overcome?'극복!':row.kind==='missed'?'놓친 것':'다시 도전해요',c);}
        if(learning)learning.querySelector('h3').textContent=selected.length?'오늘 헷갈린 것':'오늘 고친 것';
        if(learning)window.GFUI.reviewHint(learning,reviewNode);
        practiceButton?.remove();
        practiceButton=el('button','gf-button','틀린 것만 다시 30초',actions||panel);practiceButton.dataset.test='practice';practiceButton.hidden=!selected.length;practiceButton.onclick=startPractice;
        if(actions)actions.insertBefore(practiceButton,actions.children[1]);
        result.hidden=false;result.textContent='결과 보기';if(!result.querySelector('.gf-next-triangle'))el('i','gf-next-triangle',undefined,result);(learning?screen:panel).appendChild(result);if(focus)result.focus();
      }
      function startPractice(after) {
        screen.hidden=true;endShow=null;status='play';
        if(data.art.ui&&gf.inFrame)window.parent.document.body.dataset.uiState='play';
        run=runner(cfg,{...data,seed:mainRun.seed,grade,duo:false,practice:{items:mainWorld.review.map(r=>r.item)},review:mainWorld.review,botKind:null,sim:gf.sim>0,view:rects[0],deferLayout:true,images,g,dpr,canvas,log:!!mainRun.fxScreen.log,sfxRoot:mainRun.sfxRoot});
        run.meter=juice.lightMeter(data.feel?.limits?.light||{});
        run.onEnd=()=>{
          run=mainRun;active=run;status='end';screen.hidden=false;
          if(data.art.ui&&gf.inFrame)window.parent.document.body.dataset.uiState='end';
          scoreNodes[0].previousElementSibling.textContent='점수';hearts.parentElement.hidden=false;feverNodes.forEach(n=>n.hidden=false);showReview();resize();window.GFMusic?.stop(300);
          if(typeof after==='function')after();
        };
        scoreNodes[0].previousElementSibling.textContent='연습';hearts.parentElement.hidden=true;feverNodes.forEach(n=>n.hidden=true);goalNode.hidden=true;
        previous=undefined;accumulator.reset();resize();window.GFMusic?.play();
      }
      if(data.art.ui){window.__GAME.practiceUI=startPractice;window.__GAME.resultUI=()=>({art:data.art,family:cfg.family,base:window.location.href,score:mainScore,stats:{...mainWorld.stats},best:bestScore??0,thresholds:data.game.ranking.stars,modeResult,reviewHTML:reviewNode?.innerHTML||'',canPractice:!!mainWorld.review.length,fast:gf.sim>0,winner:duo?winnerText(mainRun.world().score,mainRun.world(1).score,window.innerHeight>window.innerWidth):null,duoScores:duo?mainRun.worlds.map(w=>w.score):null});}
      function count(t) {
        const ease = 1 - (1 - t) ** 3;
        scoreLabels.forEach((node, i) => { const value = `${Math.round(run.world(i).score * ease)}점`; if (node.textContent !== value) node.textContent = value; });
      }
      function crown() {
        if (screen.querySelector('[data-test="crown"]')) return;
        const max = Math.max(...run.worlds.map(w => w.score)), tie = run.world().score === run.world(1).score;
        run.worlds.forEach((w, i) => { if (w.score !== max) return;
          const icon = el('span', `gf-crown${tie ? ' gf-crown-small' : ''}`, undefined, duoScoreNodes ? duoScoreNodes[i] : scoreLabels[i].parentElement);
          icon.dataset.test = 'crown'; icon.setAttribute('aria-label', tie ? '함께 받은 왕관' : '이긴 쪽 왕관');
          const b = w.effectBounds(); w.juice.endConfetti({ x:b.x+b.w/2,y:b.y+b.h*.2 });
        });
      }
      const stage = n => {
        if (duo && n >= 5) return;
        screen.dataset.stage = String(n); run.world().record('endStage', { stage:n });
        const headings = duo ? ['그만!', '점수를 세어요', '왕관을 받아요', '한 판이 끝났어요'] : ['그만!', '점수를 세어요', '도전을 확인해요', '내 기록을 확인해요', '오늘 헷갈린 것', '한 판이 끝났어요'];
        heading.textContent = headings[n - 1];
        scores.hidden = n < 2;
        if (n >= 3) count(1);
        missions.hidden = duo || n < 3;
        if (n === 1) for (const w of run.worlds) immersionMoment(w, 'end', { suppressText:true });
        if (n === 2) juice.sound.play('count');
        if (n === 3 && duo) crown();
        if (n === 4 && duo) {
          crown();
          if (!winnerNode) { winnerNode = el('p', 'gf-end-winner', winnerText(run.world().score, run.world(1).score, window.innerHeight > window.innerWidth), panel); winnerNode.dataset.test = 'winner'; }
        }
        if (n === 4 && !duo) {
          const w = run.world(), isBest = w.score > (bestScore ?? 0);
          message.textContent = isBest ? '최고 기록!' : `최고 기록까지 ${(bestScore ?? 0) - w.score + 1}점`;
          if (isBest) immersionMoment(w, 'best');
        }
        if (n === 5) { message.textContent = run.world().stats.wrong || run.world().stats.missed ? '헷갈린 말도 다시 도전해 봐요' : '다 맞혔어요!';if(mainWorld.learning)reviewNode?result.focus():showReview(); }
        if (n === 6) { if(mainWorld.learning)reviewNode?result.focus():showReview();else message.textContent = run.world().stats.missions ? '도전 완료! 도장을 받아요' : '도장과 점수를 확인해요'; result.hidden = false; result.focus(); }
      };
      const progress = (n, t) => {
        if (n === 2) count(t);
        if (n === 3 && !duo) missionLabels.forEach((node, i) => {
          if (t < i / 3 || node.dataset.shown) return;
          node.dataset.shown = 'true'; juice.sound.play('stamp');
        });
      };
      if (data.art.ui && !duo && mainWorld.learning) showReview(false);
      endShow = endSequence({ duo, sim:gf.sim > 0||data.art.ui&&window.matchMedia('(prefers-reduced-motion: reduce)').matches, stage, progress, finish:sendResult });
      result.onclick = () => mainWorld.learning && !duo ? sendResult(true) : endShow.finish();
      screen.addEventListener('pointerdown', event => { if (!event.target.closest('button')) endShow?.skip(); });
      window.addEventListener('keydown', event => { if (status === 'end' && endShow?.stage < (duo ? 4 : 5) && !event.repeat) { event.preventDefault(); endShow.skip(); } });
    }
    async function finish() {
      status = 'end';
      powerup?.remove(); powerup=null;
      if (run.modeSession) { modeResult = run.modeSession.result(run.world().stats); if (modeResult.play === 'stage') modeStore.complete(grade, selectedStage, modeResult.stars); }
      window.GFMusic?.stop(300);
      if (run.world().immersion) {
        if (!duo && !run.world().practice) best.write(run.world().score);
        showEnd(); return;
      }
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
      if (started) return; started = true; if (button) button.disabled = true;
      if(data.art.ui&&gf.inFrame)window.parent.document.body.dataset.uiState='play';
      window.GFMusic?.play();
      title?.remove(); hud.hidden = false; note.textContent = duo ? duoNote(data) : data.play.note;
      if(window.matchMedia('(pointer: coarse)').matches)note.textContent=note.textContent.split('·')[0].trim();
      resize();
      const seed = gf.seed !== null && gf.seed !== undefined ? gf.seed : window.crypto.getRandomValues(new Uint32Array(1))[0];
      const query = new URLSearchParams(window.location.search), value = query.get('bot');
      const botKind = ['127.0.0.1', 'localhost'].includes(window.location.hostname) && ['right', 'wrong', 'mix'].includes(value) ? value : null;
      function hudFor(w) {
        const node = name => name==='score'?scoreNodes[w.side==='right'?1:0]:name==='combo'?mult:name==='lives'?hearts:name==='time'?timeNode:null;
        const adapter = {
          rect(name) {const n=node(name);if(!n)return null;const r=n.getBoundingClientRect(),v=rects[w.side==='right'?1:0];return {x:r.x-v.x,y:r.y-v.y,w:r.width,h:r.height};},
          bump(name,scale,ms){const n=node(name);if(!n)return;
            if(cfg.animateHUD&&n.animate){n._gfBump?.cancel();if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)n._gfBump=n.animate([{transform:`scale(${scale})`},{transform:'scale(1)'}],{duration:ms,easing:'ease-out'});return;}
            n.style.setProperty('--gf-fx-scale',scale);n.style.setProperty('--gf-fx-ms',`${ms}ms`);n.classList.remove('gf-fx-bump');void n.offsetWidth;n.classList.add('gf-fx-bump');},
          crack(name){const n=node(name);if(!n)return;n.classList.remove('gf-fx-crack');void n.offsetWidth;n.classList.add('gf-fx-crack');}
        };
        if (labMode) w.labHUD = adapter;
        return adapter;
      }
      const effectsOff=['localhost','127.0.0.1'].includes(window.location.hostname)&&query.get('effects')==='off';
      const modeSession = modeStore && !duo ? (cfg.createModeSession || window.GFModes.create)(data.game.modeKit, {play:selectedPlay,stage:selectedStage,onChange:modeChanged,onMilestone:showPowerup}) : null;
      run = runner(cfg, { ...data, modeSession, seed, grade, duo, botKind, effectsOff, view: rects[0], deferLayout: true, images, g, dpr, canvas, hud:hudFor, log:gf.sim>0||query.get('log')==='1'||labMode, sfxRoot:new URL('../../assets/sfx/',window.location.href).href });
      run.onPowerStep = () => powerup?.advance(3);
      if (modeSession) {
        modeResult = null; modeGoal?.remove(); modeGoal = el('span', 'gf-mode-goal', '', hearts.parentElement.parentElement); modeGoal.dataset.test='mode-goal';modeGoal.setAttribute('role','progressbar');modeGoal.setAttribute('aria-label','단계 목표');modeGoal.setAttribute('aria-valuemin','0');modeGoal.setAttribute('aria-valuemax',modeSession.state.stage?.goal.target??0);
      }
      if (run.world().immersion) {
        document.body.classList.add('gf-immersion');
        feverNodes = run.worlds.map((w, i) => {
          const parent = duo ? scoreNodes[i].parentElement : timeNode.parentElement;
          const node = el('div', 'gf-fever', undefined, parent); node.dataset.test = 'fever';
          node.setAttribute('role','progressbar'); node.setAttribute('aria-label',duo ? i ? '오른쪽 피버' : '왼쪽 피버' : '피버'); node.setAttribute('aria-valuemin','0'); node.setAttribute('aria-valuemax','10'); el('i','',undefined,node); return node;
        });
        for (const message of bestErrors) run.world().record('bestError', { message });
        if (!duo) { goalNode.querySelector('p').hidden = true; goal = { update:updateBestGoal }; }
      }
      run.meter=juice.lightMeter(data.feel?.limits?.light || {});
      if(cfg.lightDecor)run.decorMeter=juice.lightMeter(cfg.lightDecor);
      if(run.fxScreen.log){window.__GAME.juice=run.fxScreen;for(const url of data.feelErrors)run.world().record('feelError',{url});}
      if(query.get('log')==='1'&&['localhost','127.0.0.1'].includes(window.location.hostname))window.__GAME.fire=(name,c={})=>{const w=run.world(),b=w.effectBounds();return w.juice.moment(name,{x:b.x+b.w/2,y:b.y+b.h/2,target:w.moles?.find(m=>m.hittable),...c});};
      run.status = 'count'; run.onEnd = () => { finish().catch(loadError); };
      questionNodes = run.worlds.map((w, i) => { const q = el('section', 'gf-question gf-chip'); q.dataset.test = duo ? `question-${w.side}` : 'question'; el('div', 'gf-big', '', q); return q; });
      updateHUD(false); resize(); await gf.start(modeSession ? {play:selectedPlay,stage:selectedPlay==='stage'?selectedStage:undefined} : undefined); status = 'count';
      // Keep the paused countdown world, then gate play on every declared picture.
      const tutorial=data.art.ui&&gf.sim===0?(cfg.guide||window.GFUI.guide)(document.body,cfg.family,data.game.id,data.art):null;
      const prepared = Promise.all([data.assets.background(), data.playFonts()]); let complete = false;
      prepared.then(() => { complete = true; }, () => {});
      // 3초를 세는 동안 검은 화면 대신 곧 놀 마당이 보이게 그리기를 먼저 켠다(status가 'play'가 아니라 시간은 아직 흐르지 않는다).
      draw(); if (!rendering) { rendering = true; window.requestAnimationFrame(frame); }
      // 대문에서 바로 들어오면 그림이 오는 중에 셋을 세기 시작한다. 거의 다 왔으니 잠깐만 기다렸다 센다.
      if (gf.sim === 0 && !complete) {
        await Promise.race([prepared.catch(() => {}), new Promise(done => window.setTimeout(done, 1000))]);
        if (complete && data.assets.deferred) for (const w of run.worlds) cfg.layout(w);
        draw();
      }
      await juice.countdown({ parent: document.body });
      const waiting = complete ? null : el('section', 'gf-load-error', '준비 중', document.body);
      if (waiting) waiting.dataset.test = 'art-preparing';
      try { await prepared; } finally { waiting?.remove(); }
      if(data.assets.deferred)for(const w of run.worlds)cfg.layout(w);
      tutorial?.remove();status = 'play'; run.status = 'play';
      previous = undefined; accumulator.reset(); if (gf.sim > 0) run.step(gf.sim); draw(); if(!rendering){rendering=true;window.requestAnimationFrame(frame);}
    }
    function chooseMode(play, button, screen) {
      selectedPlay = play; modeStore.select(grade, play); best=bestForGrade();bestScore=best.read();
      if (play === 'stage') { screen.remove(); showStageMap(); } else start(button, screen).catch(loadError);
    }
    function showStageMap() {
      status='map'; if(gf.inFrame)window.parent.document.body.dataset.uiState='title';if(gf.inFrame)delete window.parent.document.body.dataset.uiMenu;
      const screen=(cfg.stageMap||window.GFModesUI.map)({parent:document.body,art:data.art,family:cfg.family,grade,data,config:data.game.modeKit,store:modeStore,back:cfg.stageOnly?()=>{selectedStage=1;titleScreen();}:titleScreen,start:(id,button)=>{selectedPlay='stage';selectedStage=id;best=bestForGrade();bestScore=best.read();start(button,screen).catch(loadError);}});
      const requested=Number(new URLSearchParams(location.search).get('stage'));if(!cfg.stageOnly&&requested&&modeStore.unlocked(grade,requested))screen.querySelector(`[data-test="stage-${requested}"]`)?.click();
    }
    function menuScreen(screen, duoMode) {
      const ui=window.GFModesUI,art=data.art;
      screen.classList.add('gf-menu-screen');if(gf.inFrame)window.parent.document.body.dataset.uiMenu='1';
      window.GFUI.theme(screen,cfg.family);window.GFUI.background(screen,art,art.ui.map&&!art.ui.map.defer?'map':'start');
      el('div','gf-menu-veil',undefined,screen);
      const page=el('div','gf-menu',undefined,screen),top=el('div','gf-menu-top',undefined,page);
      const left=el('div','gf-menu-side',undefined,top);el('span','gf-menu-slot',undefined,left);
      if(duoMode){const b=el('button','gf-button gf-menu-duo',undefined,left);b.dataset.test='solo-select';b.innerHTML=`${ui.glyph('play')}<span>혼자 하기</span>`;b.onclick=()=>{const url=new URL(gf.inFrame?window.parent.location.href:location.href);url.searchParams.delete('m');(gf.inFrame?window.parent:window).location.href=url.href;};}
      else if(data.game.modes.includes('duo')){const b=el('button','gf-button gf-menu-duo',undefined,left);b.dataset.test='duo-select';b.innerHTML=`${ui.glyph('users')}<span>2인용 게임</span>`;b.onclick=()=>{const url=new URL(gf.inFrame?window.parent.location.href:location.href);url.searchParams.set('m','duo');(gf.inFrame?window.parent:window).location.href=url.href;};}
      const sign=el('div','gf-menu-sign',undefined,top);if(art.ui.sign){const img=el('img','',undefined,sign);img.src=new URL(art.ui.sign.file,location.href).href;img.alt='';}else sign.classList.add('is-plain');
      el('h1','',data.game.title,sign);
      const right=el('div','gf-menu-side gf-menu-side-r',undefined,top);musicButton(right);el('span','gf-menu-slot',undefined,right);
      const tag=el('p','gf-menu-tag',undefined,page);el('span','gf-menu-subj',data.game.subjects[0],tag);tag.append(data.game.summary);
      const tabs=el('div','gf-menu-grades',undefined,page);tabs.setAttribute('role','group');tabs.setAttribute('aria-label','학년 고르기');el('span','gf-menu-q','몇 학년인가요?',tabs);
      const label=el('span','',`${grade}학년 문제`,screen);label.dataset.test='grade-label';label.hidden=true;
      const record=el('p','gf-title-best','',screen);record.dataset.test='best';record.hidden=true;
      for(let n=data.game.grades[0];n<=data.game.grades[1];n++){const b=el('button','gf-grade-tab',undefined,tabs);b.dataset.test=`grade-${n}`;b.dataset.grade=String(n);b.setAttribute('aria-label',`${n}학년`);b.innerHTML=`${n}<small>학년</small><span class="gf-grade-check">${ui.glyph('check')}</span>`;b.onclick=()=>pick(n);}
      const mid=el('div','gf-menu-mid',undefined,page);
      let solo=null;
      if(duoMode){
        const wrap=el('div','gf-deck gf-deck-one',undefined,mid),row=el('div','gf-deck-row',undefined,wrap);
        const b=el('button','gf-deck-card gf-deck-duo',undefined,row);b.type='button';b.dataset.test='start';b.dataset.spot='main';
        const pic=el('span','gf-deck-pic',undefined,b),shot=art.ui.start?.landscape?.file;if(shot)pic.style.backgroundImage=`url("${new URL(shot,location.href).href}")`;
        const badge=el('span','gf-deck-badge',undefined,b);badge.innerHTML=ui.glyph('users');
        const body=el('span','gf-deck-body',undefined,b);el('span','gf-deck-name','2인용 게임',body);el('span','gf-deck-desc',duoNote(data)||'한 화면에서 둘이 겨뤄요',body);
        const act=el('span','gf-deck-act',undefined,body),go=el('span','gf-deck-go',undefined,act);go.innerHTML=`${ui.glyph('play')}<span>시작</span><span class="gf-kbd">Enter</span>`;
        b.onclick=()=>start(b,screen).catch(loadError);solo=b;
      }else menu=ui.deck(mid,{art,config:data.game.modeKit,store:modeStore,grade,selected:selectedPlay,choose:(play,button)=>chooseMode(play,button,screen),onSelect:play=>{selectedPlay=play;}});
      const kbd=k=>`<span class="gf-kbd">${k}</span>`,keys=el('p','gf-menu-keys',undefined,page);
      keys.innerHTML=(duoMode?[`${kbd(data.game.grades[0])}~${kbd(data.game.grades[1])} 학년`,`${kbd('Enter')} 시작`]:[`${kbd(data.game.grades[0])}~${kbd(data.game.grades[1])} 학년`,`${kbd('←')}${kbd('→')} 고르고 ${kbd('Enter')}`]).join('<span class="gf-menu-dot">·</span>');
      function pick(n){grade=n;gf.save({...gf.load(),grade});label.textContent=`${grade}학년 문제`;tabs.querySelectorAll('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.grade)===n)));best=bestForGrade();bestScore=duoMode?null:best.read();if(menu){modeStore.select(grade,selectedPlay);menu.setGrade(grade);}}
      pick(grade);(menu||solo).focus({preventScroll:true});
      cfg.titleExtra?.(page,{data,images,el,grade:()=>grade});
    }
    function titleScreen() {
      if (cfg.stageOnly) {
        selectedPlay = 'stage';
        best = bestForGrade(); bestScore = best.read();
        return start().catch(loadError);
      }
      document.querySelector('.gf-grade-picker')?.remove(); status = 'title'; menu=null;if(gf.inFrame)delete window.parent.document.body.dataset.uiMenu;
      const screen = el('section', 'gf-title-screen'); screen.dataset.test = 'title-screen';
      if(data.art.ui){
        if(gf.inFrame)window.parent.document.body.dataset.uiState='title';if(modeStore)return menuScreen(screen,duo);
        window.GFUI.theme(screen,cfg.family);window.GFUI.background(screen,data.art,'start');
        const heading=el('h1','gf-ui-outline',undefined,screen);const parts=data.game.title.split(' ');parts.forEach((part,i)=>el('span','',part+(i<parts.length-1?' ':''),heading));
        el('p','gf-title-rule',data.game.summary,screen);
        const controls=el('div','gf-title-controls',undefined,screen);el('p','gf-title-grade-label','몇 학년인가요?',controls);
        const chips=el('div','gf-grade-chips',undefined,controls);chips.setAttribute('role','group');chips.setAttribute('aria-label','학년 고르기');
        const label=el('span','',`${grade}학년 문제`,screen);label.dataset.test='grade-label';label.hidden=true;
        const record=el('p','gf-title-best','',screen);record.dataset.test='best';
        function select(n){grade=n;gf.save({...gf.load(),grade});label.textContent=`${grade}학년 문제`;chips.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.grade)===n)));best=bestForGrade();bestScore=duo?null:best.read();record.textContent=bestScore===null?'':`내 최고 ${bestScore}점`;record.hidden=bestScore===null;}
        for(let n=data.game.grades[0];n<=data.game.grades[1];n++){const b=el('button','gf-grade-chip',String(n),chips);b.dataset.test=`grade-${n}`;b.dataset.grade=String(n);b.setAttribute('aria-label',`${n}학년`);b.onclick=()=>select(n);}
        const button=el('button','gf-button gf-primary',duo?'2인용 게임 시작':'시작',controls);button.dataset.test='start';button.onclick=()=>start(button,screen).catch(loadError);
        musicButton(screen);select(grade);cfg.titleExtra?.(controls,{data,images,el,grade:()=>grade});return;
      }
      const scenes = data.family.art.filter(s => s.kind === 'scene');
      const scene = scenes.sort((a, b) => Math.abs(Math.log(a.size[0] / a.size[1] / (window.innerWidth / window.innerHeight))) - Math.abs(Math.log(b.size[0] / b.size[1] / (window.innerWidth / window.innerHeight))))[0];
      if (scene) screen.style.backgroundImage = `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url("${images[scene.slot].src}")`;
      el('h1', '', data.game.title, screen);
      const sprite = data.art.slots[data.family.title.sprite], portrait = el('canvas', 'gf-title-sprite', undefined, screen);
      portrait.width = sprite.w; portrait.height = sprite.h; portrait.style.aspectRatio = `${sprite.w}/${sprite.h}`; portrait.getContext('2d').drawImage(images[data.family.title.sprite], 0, 0, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
      el('p', 'gf-title-rule', data.play.rule, screen);
      if (immersionOn(data)) {
        screen.classList.add('gf-title-immersion');
        const missions = el('ul', 'gf-title-missions', undefined, screen); missions.dataset.test = 'missions';
        for (const m of data.game.missions || []) el('li', '', m.text, missions);
        best = bestForGrade(); bestScore = duo ? null : best.read();
        const record = el('p','gf-title-best', bestScore === null ? '' : `내 최고 ${bestScore}점`,screen); record.dataset.test = 'best'; record.hidden = bestScore === null;
      }
      const button = el('button', 'gf-button gf-primary', '시작', screen); button.dataset.test = 'start'; button.onclick = () => start(button, screen).catch(loadError);
      musicButton(screen);
      el('p', 'gf-title-note', duo ? duoNote(data) : data.play.note, screen);
      const change = el('div', 'gf-title-grade', undefined, screen); const label = el('span', '', `${grade}학년 문제`, change); label.dataset.test = 'grade-label';
      const pick = el('button', 'gf-button', '학년 바꾸기', change); pick.dataset.test = 'grade-change'; pick.onclick = () => { screen.remove(); gradePicker(); };
      cfg.titleExtra?.(screen,{data,images,el,grade:()=>grade});
    }
    function gradePicker() {
      status = 'grade'; const picker = el('section', 'gf-grade-picker'); picker.dataset.test = 'grade-picker'; el('h1', '', '몇 학년 문제를 할까요?', picker);
      const buttons = el('div', '', undefined, picker);
      for (let n = data.game.grades[0]; n <= data.game.grades[1]; n++) { const b = el('button', 'gf-button gf-primary', `${n}학년`, buttons); b.dataset.test = `grade-${n}`; b.onclick = () => { grade = n; gf.save({ ...(gf.load() || {}), grade }); titleScreen(); }; }
    }
    function loadError(error) { if(status==='error')return;status = 'error'; if (run) run.status = 'error'; const node = el('section', 'gf-load-error', error.hooks?error.message:'게임을 불러오지 못했어요'); node.dataset.test = 'load-error'; window.console.error(error.message); gf.ready(); }
    gf.on('pause', () => { paused = true; if (run) run.paused = true; gate.clear(); });
    gf.on('resume', () => { paused = false; if (run) run.paused = false; accumulator.reset(); previous = undefined; });
    gf.on('pause', () => {
      const dialog = gf.inFrame ? window.parent.document.querySelector('[data-test="exit-confirm"]') : null;
      if (dialog && data?.feel.music?.track && !pauseMusic) { pauseMusic = el('div', 'gf-pause-music', undefined, dialog.querySelector('[data-music-slot]') ?? dialog); musicButton(pauseMusic); }
    });
    gf.on('resume', () => { pauseMusic?.remove(); pauseMusic = null; });
    document.addEventListener('visibilitychange',()=>{if(run?.world().learning){previous=undefined;accumulator.reset();gate.clear();if(!document.hidden)resize();}});
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', e => {
      if (!data) return;
      // Esc asks the site for its pause screen while a round runs.
      if (e.code === 'Escape' && gf.inFrame && (status === 'play' || status === 'count')) { e.preventDefault(); if (!e.repeat) gf.menu(); return; }
      if(status==='title'&&!e.repeat&&document.querySelector('.gf-menu')){
        const digit=Number(e.key);
        if(digit>=1&&digit<=6){document.querySelector(`.gf-menu [data-grade="${digit}"]`)?.click();e.preventDefault();return;}
      }
      // Letters stay with the players in a two-player round, so only the solo deck reads them.
      if(status==='title'&&menu&&!e.repeat){
        const direct={KeyQ:'quick',KeyE:'endless',KeyS:'stage'}[e.code];
        if(direct){menu.launch(direct);e.preventDefault();return;}
        if(e.code==='ArrowLeft'||e.code==='ArrowRight'){menu.step(e.code==='ArrowRight'?1:-1);menu.focus();e.preventDefault();return;}
        if(e.code==='Enter'&&!document.activeElement?.closest('button')){menu.launch();e.preventDefault();return;}
      }
      const key = keyFor(e.code, data.family.keys, duo); if (key) e.preventDefault(); if (gate.down(e.code, e.repeat) && key) run?.input(key.side, 'key', key.i);
    });
    window.addEventListener('keyup', e => gate.up(e.code)); window.addEventListener('blur', () => gate.clear());
    canvas.addEventListener('pointerdown', e => { if (!run) return; const i = duo && (window.innerHeight > window.innerWidth ? e.clientY >= rects[1].y : e.clientX >= rects[1].x) ? 1 : 0; const r = rects[i]; run.input(i, 'press', e.clientX - r.x, e.clientY - r.y); });
    try {
      effectHooks(cfg);
      const params = new URLSearchParams(window.location.search), v = params.get('v') || (scriptSrc ? new URL(scriptSrc).searchParams.get('v') : null);
      async function json(path) { const url = withV(path, v); try { const response = await fetch(url); if (!response.ok) throw new Error(`상태 ${response.status}`); return await response.json(); } catch (e) { throw new Error(`${url}: ${e.message}`); } }
      const [game, content, art, family] = await Promise.all([json('game.json'), json('content.json'), json('art.json'), json(`../../families/${cfg.family}/family.json`)]);
      if(family.learn && !window.GFLearn) await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=withV('../../kit/gf-learn.js',v);script.onload=resolve;script.onerror=()=>reject(new Error('배움 도구를 불러오지 못했어요'));document.head.appendChild(script);
      });
      if (art.pixel !== undefined && typeof art.pixel !== 'boolean') throw new Error('art.json: pixel은 참 또는 거짓이어야 해요');
      if (game.family !== cfg.family) throw new Error('game.json: 놀이 틀이 달라요');
      const feelErrors=[];
      async function feelJSON(path){try{return await json(path);}catch(error){window.console.error(error.message);feelErrors.push(withV(path,v));return null;}}
      const [kitFeel,familyFeel]=await Promise.all([feelJSON('../../kit/feel.json'),family.feel?feelJSON(`../../families/${cfg.family}/${family.feel}`):Promise.resolve({})]);
      const feel=kitFeel&&familyFeel?window.GFFeel.merge(kitFeel,familyFeel):window.GFFeel.FALLBACK;
      juice.feelLoaded=feelErrors.length===0;
      if(juice.feelLoaded){const errors=window.GFFeel.validate(feel);if(errors.length)window.console.error(errors.join('\n'));}
      data = { game, content, art, family, feel, feelErrors, version:v, play: { ...family.play, ...game.play } };
      if(art.ui){
        await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=withV('../../kit/gf-ui.js',v);script.onload=resolve;script.onerror=()=>reject(new Error('공용 화면을 불러오지 못했어요'));document.head.appendChild(script);});
        if(game.modeKit){
          for(const file of ['gf-modes.js','gf-modes-ui.js'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=withV(`../../kit/${file}`,v);script.onload=resolve;script.onerror=()=>reject(new Error('모드 화면을 불러오지 못했어요'));document.head.appendChild(script);});
          modeStore=window.GFModes.store(()=>window.localStorage,game.id,bestError);
          const requested=new URLSearchParams(location.search).get('play');selectedPlay=cfg.stageOnly?'stage':Object.hasOwn(window.GFModes.names,requested)?requested:modeStore.last()?.play??'quick';
        }
        window.GFUI.theme(document.body,cfg.family);
        if(gf.inFrame){window.GFUI.theme(window.parent.document.body,cfg.family);}
        await document.fonts.load('40px Jua');
      }
      if (!duo && !immersionOn(data)) goal = juice.goal(goalNode);
      initMusic();
      data.assets = artLoader(art, images, v, window.GFMoleYard?.images);
      await data.assets.first;
      if (!art.ui) await document.fonts.load('40px DoHyeon');
      let playFonts;
      // Four seconds of real time covers ordinary slow fonts without stranding
      // children in preparation. A worker clock is independent of simulation
      // and of tests that pause the window clock.
      data.playFonts = () => playFonts ||= (() => {
        const url = URL.createObjectURL(new Blob(['setTimeout(() => postMessage("timeout"), 4000)'], {type:'text/javascript'}));
        const worker = new Worker(url);
        const deadline = new Promise(resolve => { worker.onmessage = () => { window.console.warn('놀이 글씨체를 4초 기다려 대체 글씨체로 시작해요'); resolve(); }; });
        const loaded = Promise.allSettled([
        document.fonts.load('40px DoHyeon'),
        ...(immersionOn(data) ? [document.fonts.load('400 16px Pretendard'), document.fonts.load('900 38px Pretendard'), document.fonts.load('700 16px Pretendard')] : [])
      ]).then(results => {
        for (const result of results) if (result.status === 'rejected') window.console.warn('놀이 글씨체를 받지 못해 대체 글씨체를 써요', result.reason);
        if (run) resize();
        });
        return Promise.race([loaded, deadline]).finally(() => { worker.terminate(); URL.revokeObjectURL(url); });
      })();
      await document.fonts.ready; document.title = game.title; gf.ready();
      grade = cfg.stageOnly ? 1 : chooseGrade({ url: gf.grade, saved: modeStore?.last()?.grade??gf.load()?.grade, grades: game.grades, sim: gf.sim });
      if (cfg.stageOnly) {
        // 이전 학년별 별을 한 기록으로 모으고, 새로 입장하면 1단계부터 시작한다.
        for (let id = 1; id <= 10; id++) {
          const stars = Math.max(...Array.from({ length: 6 }, (_, i) => modeStore.stars(i + 1, id)));
          if (stars > modeStore.stars(1, id)) modeStore.complete(1, id, stars);
        }
        const requested = Number(params.get('stage'));
        selectedStage = Number.isInteger(requested) && requested >= 1 && requested <= 10 && modeStore.unlocked(1, requested) ? requested : 1;
      }
      if(data.art.ui&&grade===null)grade=data.game.grades[0];
      if (cfg.stageOnly && params.get('map') === '1') showStageMap(); else if (grade === null) gradePicker(); else titleScreen(); resize();
      window.requestAnimationFrame(() => window.setTimeout(() => Promise.all([data.assets.background(), data.playFonts()]).catch(loadError), 0));
      if(!cfg.stageOnly&&modeStore&&!duo&&new URLSearchParams(location.search).get('play')==='stage'){document.querySelector('.gf-title-screen')?.remove();showStageMap();}
    } catch (e) { loadError(e); }
  }
  window.GFShell = { rng, earned, missionIds, bestStore, endSequence, clampGrade, chooseGrade, stepper, keyFor, keyGate, withV, winnerText, scaleFor, layoutText, mathHTML, questionHTML, img, text, fits, play, headless,
    get fontScale() { return active?.worlds?.[0]?.fontScale || 1; } };
})();
