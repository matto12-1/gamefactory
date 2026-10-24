(function () {
  'use strict';
  if (window.GFJuice) return;
  const gf = window.GF;
  const on = (type, fn) => gf?.on?.(type, fn);
  const sim = () => (gf?.sim ?? 0) > 0;
  const now = () => performance.now();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  let enabled = gf?.sound !== false, paused = false, audio, master, noise;
  const voices = [], lastSounds = new Map();
  function context() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    if (!audio) {
      audio = new Audio(); master = audio.createGain(); master.gain.value = 0.35; master.connect(audio.destination);
      noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.2), audio.sampleRate);
      const data = noise.getChannelData(0); let n = 12345;
      for (let i = 0; i < data.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; data[i] = n / 2147483648 - 1; }
    }
    return audio;
  }
  function wake() { if (enabled && !paused && !sim()) { const a = context(); if (a?.state === 'suspended') a.resume(); } }
  window.addEventListener?.('pointerdown', wake);
  window.addEventListener?.('keydown', wake);
  function silence() {
    for (const voice of voices.splice(0)) for (const node of voice.nodes) node.stop();
  }
  const sounds = {
    tap: [['square',880,660,0.04]], hit: [['triangle',220,880,0.06],['noise',900,900,0.03,0,0.22]],
    pop: [['sine',300,900,0.07]], right: [['triangle',1046,1046,0.07],['triangle',1318,1318,0.11,0.07]],
    wrong: [['square',196,150,0.18,0,0.45]], coin: [['square',988,988,0.05],['square',1319,1319,0.12,0.05]],
    whoosh: [['noise',400,2000,0.16,0,0.35]], tick: [['triangle',660,660,0.05]], go: [['triangle',990,1100,0.25]],
    end: [523,659,784,1046].map((f,i) => ['triangle',f,f,i === 3 ? 0.3 : 0.09,i * 0.09]),
    best: [1568,1976,1760,2093,2489].map((f,i) => ['sine',f,f,0.04,i * 0.04])
  };
  const sfx = {
    get enabled() { return enabled && gf?.sound !== false && !sim(); },
    setEnabled(value) { enabled = !!value; if (gf) gf.sound = enabled; if (!enabled) silence(); },
    play(name, { level = 1, volume = 1 } = {}) {
      if (!this.enabled || paused) return;
      let notes = sounds[name];
      if (name === 'combo') { const shift = 2 ** (clamp(level,1,3) * 4 / 12); notes = [1046,1318,1568].map((f,i) => ['triangle',f * shift,f * shift,0.07,i * 0.07]); }
      if (!notes || now() - (lastSounds.get(name) ?? -Infinity) < 30) return;
      const a = context(); if (!a) return;
      for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= a.currentTime) voices.splice(i,1);
      if (voices.length >= 8) return;
      wake(); lastSounds.set(name, now());
      const voice = { end: a.currentTime, nodes: [] }; voices.push(voice);
      for (const [type, from, to, duration, delay = 0, gain = 0.55] of notes) {
        const start = a.currentTime + delay, end = start + duration;
        const node = type === 'noise' ? a.createBufferSource() : a.createOscillator();
        if (type === 'noise') node.buffer = noise;
        else { node.type = type; node.frequency.setValueAtTime(from,start); node.frequency.linearRampToValueAtTime(to,end); }
        const envelope = a.createGain(); envelope.gain.setValueAtTime(0,start);
        envelope.gain.linearRampToValueAtTime(clamp(volume,0,1) * gain,start + 0.004);
        envelope.gain.exponentialRampToValueAtTime(0.0001,end);
        if (type === 'noise' || name === 'wrong') {
          const filter = a.createBiquadFilter(); filter.type = name === 'wrong' ? 'lowpass' : 'bandpass';
          filter.frequency.setValueAtTime(name === 'wrong' ? 900 : from,start);
          filter.frequency.linearRampToValueAtTime(name === 'wrong' ? 900 : to,end); filter.Q.value = 0.7;
          node.connect(filter); filter.connect(envelope); node.onended = () => { node.disconnect(); filter.disconnect(); envelope.disconnect(); };
        } else { node.connect(envelope); node.onended = () => { node.disconnect(); envelope.disconnect(); }; }
        envelope.connect(master); node.start(start); node.stop(end); voice.nodes.push(node); voice.end = Math.max(voice.end,end);
      }
    }
  };
  on('sound', ({ on: value }) => sfx.setEnabled(value));
  on('pause', () => { paused = true; if (audio) audio.suspend(); });
  on('resume', () => { paused = false; if (audio && sfx.enabled) audio.resume(); });
  function random(seed) {
    let state = seed >>> 0;
    return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15,t | 1); t ^= t + Math.imul(t ^ t >>> 7,t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const presets = {
    star: { count:22, colors:['#ffe17b','#f2c94b','#fffef8','#cce5ca'], speed:170 },
    spark: { count:16, colors:['#fffef8','#ffe17b','#f2c94b'], speed:230 },
    confetti: { count:60, colors:['#ffe17b','#cce5ca','#fffef8','#f2c94b'], speed:170 },
    dust: { count:12, colors:['#b6a783','#d1c3a2','#fffef8'], speed:80 },
    fire: { count:24, colors:['#fff2a8','#ffc94a','#ff8a3d','#ff5a3d'], speed:140 }
  };
  class Fx {
    constructor({ seed = gf?.seed ?? 1, unit = 4, reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false } = {}) {
      this.unit = Math.max(1,unit); this.reduceMotion = reduceMotion; this.rng = random(seed);
      this.particles = []; this.texts = []; this.rings = []; this.punches = [];
      this.pool = []; this.textPool = []; this.ringPool = []; this.punchPool = [];
      this.clock = 0; this.flashes = []; this.width = 1366; this.height = 768; this.clear();
    }
    burst(x,y,{ kind = 'star', count, colors, speed } = {}) {
      const p = presets[kind] || presets.star;
      const total = Math.max(0,Math.floor((count ?? p.count) * (this.reduceMotion ? 0.5 : 1)));
      colors = colors?.length ? colors : p.colors; speed = speed ?? p.speed;
      for (let i = 0; i < Math.min(total,400); i++) {
        if (this.particles.length >= 400) this.pool.push(this.particles.shift());
        const item = this.pool.pop() || {}, angle = this.rng() * Math.PI * 2, v = speed * (0.35 + this.rng() * 0.65);
        Object.assign(item,{ x,y, vx:Math.cos(angle) * v, vy:kind === 'fire' ? -v : Math.sin(angle) * v - speed * 0.3,
          gravity:kind === 'fire' ? -65 : kind === 'confetti' ? 110 : 240, age:0, life:kind === 'confetti' ? 1.7 + this.rng() * 0.8 : 0.4 + this.rng() * 0.55,
          color:colors[Math.floor(this.rng() * colors.length)], kind }); this.particles.push(item);
      }
    }
    text(x,y,value,{ color = '#ffe17b', size = 36, ms = 800 } = {}) {
      if (this.texts.length >= 24) this.textPool.push(this.texts.shift());
      const item = this.textPool.pop() || {}; Object.assign(item,{ x,y,value:String(value),color,size,age:0,life:Math.max(0.001,ms / 1000) }); this.texts.push(item);
    }
    ring(x,y,{ color = '#ffe17b', radius = 40, ms = 240 } = {}) {
      if (this.rings.length >= 32) this.ringPool.push(this.rings.shift());
      const item = this.ringPool.pop() || {}; Object.assign(item,{ x,y,color,radius,age:0,life:Math.max(0.001,ms / 1000) }); this.rings.push(item);
    }
    shake(power,ms) { this.shakePower = power * (this.reduceMotion ? 0.25 : 1); this.shakeLife = this.shakeLeft = Math.max(0,ms / 1000); this.shakeX = this.shakePower; this.shakeY = -this.shakePower / 2; }
    camera(ctx) { ctx.translate(this.shakeX,this.shakeY); }
    flash(color,ms,alpha = 0.35) {
      this.flashes = this.flashes.filter(t => this.clock - t < 1);
      if (this.flashes.length >= 3) return;
      this.flashes.push(this.clock); this.flashColor = color; this.flashLife = this.flashLeft = Math.max(0,ms / 1000);
      this.flashAlpha = clamp(alpha,0,0.35) * (this.reduceMotion ? 0.5 : 1);
    }
    hitstop(ms) { this.stopLeft = Math.max(this.stopLeft,ms / 1000); }
    timeScale() { return this.stopLeft > 0 ? 0 : 1; }
    punch(obj,{ scale = 1.2, ms = 180 } = {}) {
      let item = this.punches.find(p => p.obj === obj);
      if (!item) { if (this.punches.length >= 64) { const old = this.punches.shift(); old.obj.sx = old.obj.sy = 1; this.punchPool.push(old); } item = this.punchPool.pop() || {}; this.punches.push(item); }
      Object.assign(item,{ obj,scale,age:0,life:Math.max(0.001,ms / 1000) }); obj.sx = 1 / scale; obj.sy = scale;
    }
    count() { return this.particles.length; }
    hasDrawing() { return !!(this.particles.length||this.rings.length||this.texts.length||this.flashLeft>0); }
    clear() {
      this.pool.push(...this.particles.splice(0)); this.textPool.push(...this.texts.splice(0)); this.ringPool.push(...this.rings.splice(0));
      for (const p of this.punches) p.obj.sx = p.obj.sy = 1;
      this.punchPool.push(...this.punches.splice(0));
      this.shakePower = this.shakeLife = this.shakeLeft = this.shakeX = this.shakeY = this.stopLeft = this.flashLeft = this.flashLife = this.flashAlpha = 0;
      // Flash history survives clear: clearing a scene must not bypass the safety limit.
    }
    update(dt) {
      dt = Math.max(0,Number.isFinite(dt) ? dt : 0); this.clock += dt;
      this.stopLeft = Math.max(0,this.stopLeft - dt); this.flashLeft = Math.max(0,this.flashLeft - dt); this.shakeLeft = Math.max(0,this.shakeLeft - dt);
      this.shakeX = this.shakeLeft ? (this.rng() * 2 - 1) * this.shakePower * this.shakeLeft / this.shakeLife : 0;
      this.shakeY = this.shakeLeft ? (this.rng() * 2 - 1) * this.shakePower * this.shakeLeft / this.shakeLife : 0;
      const advance = (items,pool,move) => {
        let keep = 0;
        for (let i = 0; i < items.length; i++) { const p = items[i]; p.age += dt; if (p.age >= p.life) { if (p.obj) p.obj.sx = p.obj.sy = 1; pool.push(p); } else { move?.(p); items[keep++] = p; } }
        items.length = keep;
      };
      advance(this.particles,this.pool,p => { p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      advance(this.texts,this.textPool); advance(this.rings,this.ringPool);
      advance(this.punches,this.punchPool,p => { const t = p.age / p.life, wave = Math.sin(t * Math.PI * 2) * (1 - t); p.obj.sx = 1 + (p.scale - 1) * wave; p.obj.sy = 1 - (p.scale - 1) * wave; });
    }
    draw(ctx, { width = ctx.canvas.width / (ctx.getTransform?.().a || 1), height = ctx.canvas.height / (ctx.getTransform?.().d || 1), textBounds, textAvoid = [] } = {}) {
      this.width = width; this.height = height;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const u = this.unit;
      for (const p of this.particles) {
        ctx.globalAlpha = Math.min(1,(1 - p.age / p.life) * 3); ctx.fillStyle = p.color;
        const x = Math.round(p.x), y = Math.round(p.y); ctx.fillRect(x,y,u,u);
        if (p.kind === 'star') { ctx.fillRect(x-u,y,u,u); ctx.fillRect(x+u,y,u,u); ctx.fillRect(x,y-u,u,u); ctx.fillRect(x,y+u,u,u); }
      }
      for (const p of this.rings) { ctx.globalAlpha = 1 - p.age / p.life; ctx.strokeStyle = p.color; ctx.lineWidth = u; ctx.beginPath(); ctx.arc(Math.round(p.x),Math.round(p.y),p.radius * p.age / p.life,0,Math.PI*2); ctx.stroke(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (const p of this.texts) {
        const t = p.age / p.life, b = Math.min(1,p.age / 0.12), scale = b < 0.6 ? 0.6 + b / 0.6 * 0.55 : 1.15 - (b - 0.6) / 0.4 * 0.15;
        ctx.font = `${p.size}px DoHyeon, sans-serif`;
        const metrics = ctx.measureText(p.value), halfW = (Math.max(metrics.width / 2, metrics.actualBoundingBoxLeft || 0, metrics.actualBoundingBoxRight || 0) + 3) * scale;
        const halfH = (Math.max(metrics.actualBoundingBoxAscent || p.size / 2, metrics.actualBoundingBoxDescent || p.size / 2) + 3) * scale;
        const bounds = textBounds || { x: 0, y: 0, w: this.width, h: this.height };
        // Keep combo and score in separate rows within the family's safe strip.
        const row = textBounds ? { ...bounds, y: bounds.y + (p.value.endsWith('연속!') ? 0 : bounds.h / 2), h: bounds.h / 2 } : bounds;
        let fit = Math.min(1, (row.w - 2) / (2 * halfW), (row.h - 2) / (2 * halfH)), position;
        const desiredY = textBounds ? row.y + row.h * .65 - p.age * 20 : p.y - p.age * 55;
        do {
          const hw = halfW * fit, hh = halfH * fit;
          const x = clamp(p.x, row.x + hw + 1, row.x + row.w - hw - 1);
          const y = clamp(desiredY, row.y + hh + 1, row.y + row.h - hh - 1);
          const xs = [x, ...textAvoid.flatMap(b => [b.x - hw - 1, b.x + b.w + hw + 1])];
          const ys = [y, ...textAvoid.flatMap(b => [b.y - hh - 1, b.y + b.h + hh + 1])];
          const candidates = xs.flatMap(xx => ys.map(yy => ({ x: xx, y: yy }))).filter(c =>
            c.x - hw >= row.x + .5 && c.x + hw <= row.x + row.w - .5 && c.y - hh >= row.y + .5 && c.y + hh <= row.y + row.h - .5 &&
            !textAvoid.some(b => c.x - hw < b.x + b.w && c.x + hw > b.x && c.y - hh < b.y + b.h && c.y + hh > b.y));
          candidates.sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2);
          position = candidates[0];
          if (!position) fit *= .9;
          if (fit < .01) throw Error('효과 글이 들어갈 자리가 없어요');
        } while (!position);
        const { x, y } = position;
        ctx.save(); ctx.translate(x,y); ctx.scale(scale * fit,scale * fit);
        ctx.globalAlpha = Math.min(1,(1-t)/0.3); ctx.font = `${p.size}px DoHyeon, sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = '#3c382e'; ctx.fillStyle = p.color;
        ctx.strokeText(p.value,0,0); ctx.fillText(p.value,0,0); ctx.restore();
      }
      if (this.flashLeft > 0) { ctx.globalAlpha = this.flashAlpha * this.flashLeft / this.flashLife; ctx.fillStyle = this.flashColor; ctx.fillRect(0,0,this.width,this.height); }
      ctx.restore();
    }
  }
  class Combo {
    constructor({ steps = [3,5,10] } = {}) { this.steps = steps.slice(0,3); this._count = 0; }
    get count() { return this._count; }
    get level() { return this.steps.filter(s => this._count >= s).length; }
    hit() { const previous = this.level; this._count++; return { count:this.count,level:this.level,levelUp:this.level > previous }; }
    miss() { const previous = this.count; this._count = 0; return previous; }
  }
  const react = {
    press(fx,x,y) { if(fx.juice){fx.juice.moment('press',{x,y});return;} sfx.play('tap'); fx.ring(x,y); },
    hit(fx,x,y) { if(fx.juice){fx.juice.moment('hit',{x,y});return;} sfx.play('hit'); fx.burst(x,y,{ kind:'spark' }); fx.shake(3,80); fx.hitstop(50); },
    right(fx,x,y,{ points = 120, combo, suppressText = false } = {}) {
      const result = combo?.hit() || { level:0,levelUp:false };
      if(fx.juice){const name=fx.reactMoments.right||'right';fx.juice.moment(fx.juice.feel.moments[name]?name:'right',{x,y,points,combo:result.count,suppressText});fx.juice.moment('combo',{x,y,combo:result.count,suppressText});return result;}
      sfx.play(result.level ? 'combo' : 'right',{ level:result.level }); fx.burst(x,y,{ kind:'star' }); fx.text(x,y,`+${points.toLocaleString('ko-KR')}`);
      if (result.levelUp) { fx.text(x,y-55,`${result.count}연속!`,{ size:48 }); fx.burst(x,y,{ kind:'fire' }); fx.flash('#fffef8',80,0.25); }
      return result;
    },
    wrong(fx,x,y,{ combo, flash = true, shake = [8, 220] } = {}) { combo?.miss(); if(fx.juice){const name=fx.reactMoments.wrong||'wrong';fx.juice.moment(fx.juice.feel.moments[name]?name:'wrong',{x,y});return;} sfx.play('wrong'); if (shake) fx.shake(...shake); if (flash) fx.flash('#ff5a3d',120,0.18); },
    best(fx) {
      if(fx?.juice){fx.juice.moment('best',{x:fx.width/2,y:40});return;}
      sfx.play('best');
      if (fx) for (let i = 1; i <= 3; i++) fx.burst(fx.width * i / 4,40,{ kind:'confetti',count:16 });
      else if (typeof document !== 'undefined') {
        const el = overlay(document.body,'gf-finale'); sprinkle(el,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 12 : 24);
        animate(900,t => { el.style.opacity = String(Math.min(1,(1-t)*4)); },() => el.remove());
      }
    }
  };
  // A shared active-time clock keeps overlays and rolling numbers paused together.
  const jobs = new Set(); let timer;
  function animate(duration,frame,finish) {
    const job = { elapsed:0,last:now(),duration,frame,finish }; jobs.add(job); frame(0);
    if (!timer) timer = setTimeout(tick,10);
    return job;
  }
  function tick() {
    timer = undefined; const time = now();
    for (const job of jobs) {
      if (!paused) job.elapsed = Math.min(job.duration,job.elapsed + Math.max(0,time - job.last));
      job.last = time; job.frame(job.elapsed / job.duration);
      if (job.elapsed >= job.duration) { jobs.delete(job); job.finish?.(); }
    }
    if (jobs.size) timer = setTimeout(tick,10);
  }
  function cssPause(value) { if (typeof document !== 'undefined') for (const el of document.querySelectorAll?.('.gf-finale i, .gf-bump, .gf-goal.gf-beat') || []) el.style.animationPlayState = value; }
  on('pause', () => { const time = now(); for (const j of jobs) { j.elapsed = Math.min(j.duration,j.elapsed + Math.max(0,time-j.last)); j.last = time; } cssPause('paused'); });
  on('resume', () => { for (const j of jobs) j.last = now(); cssPause('running'); });
  function overlay(parent,className) { const el = document.createElement('div'); el.className = className; el.setAttribute('aria-live','polite'); (parent || document.body).appendChild(el); return el; }
  function sprinkle(el,count) {
    const rng = random(gf?.seed ?? 1);
    for (let i = 0; i < count; i++) { const p = document.createElement('i'); p.style.left = `${rng()*100}%`; p.style.setProperty('--gf-fall-delay',`${-rng()*0.6}s`); p.style.animationPlayState = paused ? 'paused' : 'running'; el.appendChild(p); }
  }
  function countdown({ parent } = {}) {
    if (sim()) return Promise.resolve();
    return new Promise(resolve => {
      const el = overlay(parent,'gf-count'); let index = -1, resolved = false;
      animate(2400,t => {
        const i = Math.min(3,Math.floor((t * 2400 + 0.001) / 600));
        if (i !== index) { index = i; el.textContent = ['3','2','1','시작!'][i]; sfx.play(i === 3 ? 'go' : 'tick'); }
        const phase = (t * 2400 - i * 600) / 600; el.style.opacity = String(clamp((1-phase)*2,0,1));
        el.style.transform = `translate(-50%,-50%) scale(${1 + 0.6 * (1-Math.min(1,phase*3))})`;
        if (i === 3 && !resolved) { resolved = true; resolve(); }
      },() => el.remove());
    });
  }
  function finale({ parent, text = '끝!' } = {}) {
    if (sim()) return Promise.resolve();
    return new Promise(resolve => {
      const el = overlay(parent,'gf-finale'); const title = document.createElement('strong'); title.textContent = text; el.appendChild(title);
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      sprinkle(el,reduced ? 18 : 36);
      sfx.play('end'); animate(1200,t => { title.style.transform = `scale(${1 + 0.6 * Math.max(0,1-t*6)})`; el.style.opacity = String(Math.min(1,(1-t)*5)); },() => { el.remove(); resolve(); });
    });
  }
  const rolls = new WeakMap();
  function bump(el,className) {
    if(el._gfFastBump&&el.animate&&className==='gf-bump'){
      el._gfRollAnimation?.cancel();if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)el._gfRollAnimation=el.animate([{transform:'scale(.85)',offset:0},{transform:'scale(1.18)',offset:.35},{transform:'scale(1)',offset:1}],{duration:400,easing:'ease-out'});return;
    }
    el.classList.remove(className); void el.offsetWidth; el.classList.add(className);
  }
  function rollNumber(el,to,{ ms = 400 } = {}) {
    const old = rolls.get(el); if (old) jobs.delete(old);
    const from = Number(el.textContent.replaceAll(',','')) || 0;
    bump(el,'gf-bump');
    if (sim() || ms <= 0) { el.textContent = to.toLocaleString('ko-KR'); return; }
    const job = animate(ms,t => {
      const value = Math.round(from + (to-from) * (1-(1-t)**3));
      const text=(value === from && to !== from ? from + Math.sign(to-from) : value).toLocaleString('ko-KR');if(el.textContent!==text)el.textContent=text;
    },() => rolls.delete(el)); rolls.set(el,job);
  }
  function goal(sectionEl) {
    let top, exceeded = false; const label = sectionEl.querySelector('strong'); sectionEl.hidden = true;
    function setGoal(value) {
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) return;
      top = value; exceeded = false; sectionEl.hidden = false;
      label.textContent = top === null ? '오늘 첫 1등이 되어 보세요' : `오늘 1등 ${top.toLocaleString('ko-KR')}점`;
    }
    on('goal',({ top: value }) => setGoal(value));
    return { update(score) { if (typeof top === 'number' && score > top && !exceeded) { exceeded = true; label.textContent = '1등 점수를 넘었어요!'; bump(sectionEl,'gf-beat'); react.best(); } }, setGoal };
  }
  function rollPlainNumber(el, to, { ms = 400 } = {}) {
    const old = rolls.get(el); if (old) jobs.delete(old);
    const from = Number(el.textContent.replaceAll(',', '')) || 0;
    bump(el, 'gf-bump');
    if (sim() || ms <= 0) { el.textContent = String(to); return; }
    const job = animate(ms, t => {
      const value = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
      const text=String(value === from && to !== from ? from + Math.sign(to - from) : value);if(el.textContent!==text)el.textContent=text;
    }, () => rolls.delete(el)); rolls.set(el, job);
  }
  window.GFJuice = { sfx,Fx,Combo,react,countdown,finale,rollNumber,rollPlainNumber,goal };
  // Version two is independent of the legacy effects used by runner.
  function lightMeter({ slowMs = 24, backMs = 18 } = {}) {
    let light = false, slow = [], fast = [], slowTime = 0, fastTime = 0;
    const average = a => a.reduce((sum, v) => sum + v, 0) / a.length;
    return { frame(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return light;
      if (!light) {
        slow.push(ms); slowTime += ms;
        while (slow.length > 1 && slowTime - slow[0] >= 1000) slowTime -= slow.shift();
        if (slowTime >= 1000 && average(slow) > slowMs) { light = true; fast = []; fastTime = 0; }
      } else {
        fast.push(ms); fastTime += ms;
        while (fast.length > 1 && fastTime - fast[0] >= 5000) fastTime -= fast.shift();
        if (fastTime >= 5000 && average(fast) < backMs) { light = false; slow = []; slowTime = 0; }
      }
      return light;
    } };
  }
  const slotNames = ['rise','hit','wrong','miss','swing','comboTier','feverStart','feverEnd','special','specialGet','mission','overcome','last10','heartbeat','end','count','stamp','best','card','button'];
  const slotNotes = {
    rise: [420,840,.07], hit: [660,1320,.1], wrong: [240,180,.12], miss: [200,160,.09], swing: [320,220,.05],
    comboTier: [880,1760,.18], feverStart: [780,1560,.22], feverEnd: [600,400,.12], special: [1100,1650,.13], specialGet: [1320,1980,.2],
    mission: [740,1480,.17], overcome: [820,1230,.16], last10: [540,810,.14], heartbeat: [95,80,.1], end: [520,1040,.23],
    count: [460,460,.045], stamp: [180,360,.065], best: [1560,2340,.2], card: [380,570,.06], button: [900,720,.035]
  };
  let awakened = false, played = 0, skipped = 0;
  const selections = new Map(), buffers = new Map(), fallbackSlots = new Set(), slotRequests = new Map();
  function wakeNew() { awakened = true; wake(); }
  window.addEventListener?.('pointerdown', wakeNew); window.addEventListener?.('keydown', wakeNew);
  function fallbackSound(slot, error, record) {
    if (fallbackSlots.has(slot)) return;
    fallbackSlots.add(slot); window.console?.error?.(`assets/sfx/${slot}.mp3: ${error.message}`); record?.('soundFallback', { slot });
  }
  function loadSound(slot, url, record) {
    if (buffers.has(url)) return buffers.get(url);
    const task = (async () => {
      try {
        const response = await fetch(url); if (!response.ok) throw Error(`상태 ${response.status}`);
        const bytes = await response.arrayBuffer(), a = context();
        if (!a) throw Error('소리판을 쓸 수 없어요');
        return await a.decodeAudioData(bytes);
      } catch (error) { fallbackSound(slot, error, record); return null; }
    })();
    buffers.set(url, task); return task;
  }
  function soundNodes(slot, options, buffer) {
    if (!enabled || gf?.sound === false || paused || sim() || !awakened) { skipped++; return; }
    const a = context(); if (!a) { skipped++; return; }
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= a.currentTime) voices.splice(i, 1);
    if (voices.length >= 8 || voices.filter(v => v.slot === slot).length >= options.maxVoices) { skipped++; return; }
    wake(); const [from, to, duration] = slotNotes[slot], ratio = 2 ** (options.semitones / 12);
    const start = a.currentTime, end = start + (buffer ? buffer.duration / ratio : duration);
    const node = buffer ? a.createBufferSource() : a.createOscillator();
    if (buffer) { node.buffer = buffer; node.playbackRate.value = ratio; }
    else { node.type = slot === 'hit' || slot === 'comboTier' ? 'triangle' : 'sine'; node.frequency.setValueAtTime(from * ratio, start); node.frequency.exponentialRampToValueAtTime(to * ratio, end); }
    const envelope = a.createGain(); envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(clamp(options.vol,0,1.5) * .55, start + .004); envelope.gain.exponentialRampToValueAtTime(.0001, end);
    node.connect(envelope); envelope.connect(master); node.onended = () => { node.disconnect(); envelope.disconnect(); }; node.start(start); node.stop(end);
    voices.push({ end, slot, nodes: [node] }); played++;
  }
  const sound = {
    play(slot, { semitones = 0, vol = 1, maxVoices = Infinity, minIntervalMs = 0 } = {}) {
      if (!slotNames.includes(slot)) return;
      if (!enabled || gf?.sound === false || paused || sim() || !awakened) { skipped++; return; }
      const now = context()?.currentTime || 0;
      if (now - (slotRequests.get(slot) ?? -Infinity) < minIntervalMs / 1000 - 1e-9) { skipped++; return; }
      slotRequests.set(slot, now);
      const selected = selections.get(slot), options = { semitones, vol: vol * (selected?.vol ?? 1), maxVoices };
      if (selected?.url) loadSound(slot, selected.url, selected.record).then(buffer => soundNodes(slot, options, buffer));
      else soundNodes(slot, options, null);
    },
    use(slot, url) { if (slotNames.includes(slot)) selections.set(slot, { ...selections.get(slot), url }); },
    audition(slot, url) { wakeNew(); sound.use(slot, url); sound.play(slot); },
    stats: () => ({ played, skipped })
  };
  const spriteCache = new Map();
  const effectTextCache=new Map();let effectTextBytes=0;
  function particleSprite(shape, color) {
    if (typeof document === 'undefined') return null;
    const key = `${shape}:${color}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'); g.fillStyle = color; g.beginPath();
    if (shape === 'star' || shape === 'spark') {
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 6 : 15; const x = 16 + Math.cos(a) * r, y = 16 + Math.sin(a) * r; if (!i) g.moveTo(x,y); else g.lineTo(x,y); } g.closePath();
    } else if (shape === 'dirt' || shape === 'dust') g.rect(6,9,20,15);
    else g.arc(16,16,13,0,Math.PI*2);
    g.fill();c.gfParticle={shape,color};spriteCache.set(key,c);
    if(window.createImageBitmap)window.createImageBitmap(c).then(bitmap=>{bitmap.gfParticle=c.gfParticle;c.gfBitmap=bitmap;});
    return c;
  }
  const freezeObject = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freezeObject); Object.freeze(x); } return x; };
  function create({ world, canvas, hud, feel, side = null }) {
    const f = window.GFFeel, table = freezeObject(f ? f.merge({moments:{press:{ring:{on:true,r:30,ms:150},sound:{on:true,slot:'button',vol:.4}},hit:{hitstop:{on:true,ms:50},burst:{on:true,n:16,shapes:['spark']},sound:{on:true,slot:'hit',vol:1}}}},feel || f.FALLBACK) : { moments: {} });
    const screen = world.fxScreen ||= { particles: [], flashes: [], maxParticles: 0, screenFlashPerSec: 0, lightMode: 0 };
    const limits = table.limits || { particles:160, screenFlashPerSec:3, screenFlashAlpha:.35 }, randomFx = world.fxRng || random(1);
    const jobs = [], effects = [], textQueue = []; let clock = 0, shake = null, offset = { x:0, y:0 };
    const isText = e => ['popup','label','banner'].includes(e.kind);
    const lowPraise = e => e.log.name==='combo' && (e.c.combo||0)<15;
    const record = (name, params) => world.record?.(name, params) || { name, params };
    const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const px = n => n * (world.fontScale || 1), coords = c => Number.isFinite(c.x) && Number.isFinite(c.y);
    for (const slot of slotNames) {
      const s = table.sounds?.[slot]; if (!s) continue;
      const url = s.src === 'synth' ? null : `${world.sfxRoot || '../../assets/sfx/'}${slot}.mp3${world.version ? '?v=' + encodeURIComponent(world.version) : ''}`;
      const old = selections.get(slot); if (!old || old.src !== s.src) selections.set(slot, { src:s.src, url, vol:s.vol, record });
      else old.vol = s.vol;
    }
    function particles(c, step, kind = 'burst') {
      if (!coords(c)) return;
      const count = Math.max(0, Math.min(160, world.decorLight ? Math.ceil((step.n || 0)/2) : step.n || 0)), shapes = step.shapes || (kind === 'confetti' ? ['dot','star'] : ['star']);
      const range = (pair, defaults) => { const [a,b] = pair || defaults; return a + (b-a) * randomFx(); };
      for (let i = 0; i < count; i++) {
        const angle = randomFx() * Math.PI*2, speed = px(range(step.speed, [80,180])), shape = shapes[Math.floor(randomFx()*shapes.length)];
        const earthy = shape === 'dirt' || shape === 'dust', colors = step.colors || (earthy ? ['#b58b55','#d6b689'] : ['#ffe17b','#fff8d5','#ffbd43','#b4dfb1']);
        const p = { owner: api, x:c.x, y:c.y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-speed*.2, age:0, life:range(step.life,[500,900])/1000, size:px(range(step.size,[6,14])), shape, color:colors[Math.floor(randomFx()*colors.length)], gravity:kind === 'confetti' ? 110 : 500 };
        screen.particles.push(p);
        while (screen.particles.length > Math.min(160,limits.particles)) screen.particles.shift();
      }
      screen.maxParticles = Math.max(screen.maxParticles, screen.particles.length);
    }
    function startTexts() {
      if(!textQueue.length)return;
      for (let i=textQueue.length-1;i>=0;i--) {
        const e=textQueue[i];
        if(lowPraise(e) && clock-e.queuedAt>1.5+1e-9){textQueue.splice(i,1);record('textDropped',{name:e.log.name,text:e.step.text,waitMs:(clock-e.queuedAt)*1000});}
      }
      let slots=2;for(const e of effects)if(isText(e))slots--;
      while(slots-->0 && textQueue.length)effects.push(textQueue.shift());
    }
    function effect(kind, c, step, log) {
      const e={ kind, c, step, log, age:0, queuedAt:clock, life:Math.max(.001,(step.ms ?? ((step.popMs || 0) + (step.riseMs || 450))) / 1000) };
      if(isText(e)){textQueue.push(e);startTexts();}else effects.push(e);
    }
    function execute(recipe, c, log) {
      const bumpStep = recipe.steps.find(s => s.kind === 'hudBump'), fly = recipe.steps.some(s => s.kind === 'fly');
      for (const s of recipe.steps) {
        if (world.effectAllowed?.(s.kind, log.name, s) === false) continue;
        // Local profiling can isolate rendering costs without changing hitstop or scoring.
        if (world.effectsOff && s.kind !== 'hitstop') continue;
        if (s.kind === 'hitstop') { if (!world.learning || !['wrong','fall'].includes(log.name)) world.freeze?.(s.ms); }
        else if (s.kind === 'shake') { shake = { power:px(s.px), ms:s.ms, left:s.ms }; offset = { x:shake.power, y:-shake.power/2 }; }
        else if (s.kind === 'flash' && !s.target) {
          screen.flashes = screen.flashes.filter(t => (world.real || 0) - t < 1 - 1e-9);
          if (screen.flashes.length >= Math.min(3, limits.screenFlashPerSec)) record('flashSkipped', {});
          else { screen.flashes.push(world.real || 0); screen.screenFlashPerSec = Math.max(screen.screenFlashPerSec, screen.flashes.length); effect(s.kind,c,{...s,alpha:Math.min(.35,limits.screenFlashAlpha,s.alpha ?? .25)},log); }
        } else if (['squash','tint','pose','flash'].includes(s.kind)) {
          if (!c.target) continue;
          if (s.kind === 'pose' && !world.art?.slots?.[s.name]) continue;
          // A new effect on this target supersedes the previous one of its kind.
          for (let i = effects.length - 1; i >= 0; i--) if (effects[i].kind === s.kind && effects[i].c.target === c.target) effects.splice(i,1);
          effect(s.kind,c,s,log);
          if (s.kind === 'squash') { c.target.sx = s.sx; c.target.sy = s.sy; }
          if (s.kind === 'flash') c.target.flash = 1;
          if (s.kind === 'tint') c.target.tint = { color:s.color, a:s.a };
          if (s.kind === 'pose') c.target.pose = s.name;
        } else if (s.kind === 'burst' || s.kind === 'confetti') particles(c,s,s.kind);
        else if (['popup','label','banner'].includes(s.kind)) {
          if (c.suppressText) continue;
          const value = s.kind === 'popup' ? c.points === undefined ? null : `+${c.points}` : c.label || s.text;
          if (value !== null && value !== undefined && coords(c)) effect(s.kind,c,{...s,text:String(value)},log);
        } else if (s.kind === 'ring') { if (coords(c)) effect(s.kind,c,s,log); }
        else if (s.kind === 'fly') {
          if (!coords(c)) continue;
          const r = hud?.rect(s.to), to = r ? { x:r.x+r.w/2, y:r.y+r.h/2 } : { x:c.x, y:world.view?.top || 0 };
          effect(s.kind,c,{...s,to,bump:bumpStep},log);
        } else if (s.kind === 'hudBump') { if (!fly) hud?.bump(s.to,s.scale,s.ms); }
        else if (s.kind === 'crack') hud?.crack(s.to);
        else if (s.kind === 'vignette') {
          // The new shell sustains one edge light for the entire fever/final act.
          if (!(world.immersion && ['feverStart','last10'].includes(recipe.name))) effect(s.kind,c,s,log);
        }
        else if (s.kind === 'sound') { const semitones = world.soundLimits && log.name === 'hit' ? 12 * Math.log2(.95 + randomFx() * .1) : s.semitones + (s.jitter ? (randomFx()*2-1)*s.jitter : 0); sound.play(s.slot,{...world.soundLimits,semitones,vol:s.vol}); }
        else if (s.kind === 'music') { if (s.mode) window.GFMusic?.setMode(world.musicMode?.() || s.mode); if (s.duck !== undefined) window.GFMusic?.duck(s.duck); }
      }
    }
    function schedule(at, fn) { if (at <= clock + 1e-9) fn(); else jobs.push({ at, fn }); }
    const api = {
      get feel() { return table; }, get clock() { return clock; },
      textState() { return {active:effects.filter(isText).map(e=>({name:e.log.name,text:e.step.text,rect:e.rect,age:e.age})),queued:textQueue.map(e=>({name:e.log.name,text:e.step.text,waitMs:(clock-e.queuedAt)*1000}))}; },
      emit(c, spec) {
        if(world.effectsOff)return;
        let n=spec.n||0;if(reduced())n=Math.round(n*.3);if(screen.light)n=Math.floor(n/2);
        particles(c,{...spec,n});
      },
      endConfetti(c) {
        const spec = f?.recipe(table, 'end', { reduced:reduced(), light:!!screen.light }).steps.find(s => s.kind === 'confetti');
        if (spec && !world.effectsOff) { particles(c, spec, 'confetti'); record('endConfetti', { n:spec.n }); }
      },
      moment(name, c = {}) {
        const r = f ? f.recipe(table,name,{combo:c.combo || 0, reduced:reduced(),light:!!screen.light,delayMs:c.delayMs || 0}) : { name, delayMs:c.delayMs || 0, steps:[], params:{} };
        for (const step of r.steps) if (['label','banner'].includes(step.kind) && c.label !== undefined) {
          step.text = String(c.label); r.params[step.kind] = step.text;
        }
        if (name === 'swing') r.params.hit = !!c.hit;
        const log = record(name, r.params), copy = { ...c };
        if(c.points!==undefined)log.params.points=c.points;
        schedule(clock+r.delayMs/1000, () => execute(r,copy,log));
        if (!world.effectsOff && name === 'swing' && coords(c)) {
          const shape = table.moments.swing;
          if (shape) {
            const contactMs = shape.windupMs === 0 ? 0 : shape.windupMs + shape.strikeMs;
            const light = !!screen.light, motion = reduced();
            schedule(clock+contactMs/1000, () => {
              const spec = c.hit ? shape.impact : shape.empty;
              if (!spec?.on) return;
              let n = c.hit ? spec.dust : spec.dirt;
              if (motion) n = Math.round(n*.3); if (light) n = Math.floor(n/2);
              particles(c,{n,shapes:[c.hit?'dust':'dirt'],size:[6,12],speed:[80,180],life:[300,500]});
              if (c.hit) { effect('impact',c,{ms:180},log); effect('label',c,{text:spec.text,px:28,ms:300},log); }
              else sound.play(spec.sound.slot,{vol:spec.sound.vol});
            });
          }
        }
        return log;
      },
      update(realDt) {
        const dt = Math.max(0,Number.isFinite(realDt) ? realDt : 0); clock += dt;
        const due = jobs.filter(j => j.at <= clock + 1e-9).sort((a,b) => a.at-b.at);
        for (const j of due) jobs.splice(jobs.indexOf(j),1);
        // Advance existing effects before starting newly due effects.
        for (const p of screen.particles) if (p.owner === api) { p.age += dt; p.vy += p.gravity*dt; p.x += p.vx*dt; p.y += p.vy*dt; }
        screen.particles = screen.particles.filter(p => p.age < p.life);
        if (shake) { shake.left = Math.max(0,shake.left-dt*1000); const strength = shake.power*shake.left/Math.max(1,shake.ms); offset = {x:(randomFx()*2-1)*strength,y:(randomFx()*2-1)*strength}; if (!shake.left) shake = null; }
        for (let i = effects.length-1; i >= 0; i--) {
          const e = effects[i]; if(!e.deferred)e.age += dt; const t = Math.min(1,e.age/e.life), target = e.c.target;
          if(isText(e)&&e.deferred&&lowPraise(e)&&clock-e.queuedAt>1.5+1e-9){effects.splice(i,1);record('textDropped',{name:e.log.name,text:e.step.text,waitMs:(clock-e.queuedAt)*1000});continue;}
          if (e.kind === 'squash') { const over = e.step.over ?? 1, mix = (a,b,u) => a+(b-a)*u; target.sx = t < .65 ? mix(e.step.sx,over,t/.65) : mix(over,1,(t-.65)/.35); target.sy = t < .65 ? mix(e.step.sy,over,t/.65) : mix(over,1,(t-.65)/.35); }
          if (e.kind === 'flash' && e.step.target) target.flash = 1-t;
          if (t === 1) {
            if (e.kind === 'squash') target.sx = target.sy = 1;
            if (e.kind === 'tint') target.tint = null;
            if (e.kind === 'pose') target.pose = null;
            if (e.kind === 'fly' && e.step.bump) hud?.bump(e.step.bump.to,e.step.bump.scale,e.step.bump.ms);
            effects.splice(i,1);
          }
        }
        for (const j of due) j.fn();
        startTexts();
      },
      shakeOffset() { return { ...offset }; },
      draw(g) {
        if(!effects.length&&!screen.particles.some(p=>p.owner===api))return;
        const bounds = world.effectBounds?.() || {x:0,y:world.view?.top || 0,w:world.view?.w || canvas?.width || 1366,h:(world.view?.h || canvas?.height || 768)-(world.view?.top || 0)};
        const avoid = world.effectLabels?.() || [], W = world.view?.w || canvas?.width || 1366, H = world.view?.h || canvas?.height || 768;
        g.save();
        if(world.effectSmoothingQuality)g.imageSmoothingQuality=world.effectSmoothingQuality;
        for (const p of screen.particles) if (p.owner === api) {
          g.globalAlpha = Math.min(1,(1-p.age/p.life)*3);
          if (world.effectSprite?.(g, p)) continue;
          const sprite = particleSprite(p.shape,p.color);
          if (sprite) { const size=world.pixelEffects?Math.max(1,Math.round(p.size)):p.size;g.drawImage(sprite.gfBitmap||sprite,world.pixelEffects?Math.round(p.x-size/2):p.x-size/2,world.pixelEffects?Math.round(p.y-size/2):p.y-size/2,size,size); }
          else { g.fillStyle = p.color; g.fillRect(p.x,p.y,p.size,p.size); }
        }
        const drawnText=[];
        for (const e of effects) {
          const t = e.age/e.life, {c,step:s} = e; g.globalAlpha = Math.min(1,(1-t)*3);
          if (e.kind === 'ring') { g.strokeStyle=s.color||'#ffe17b'; g.lineWidth=px(4); g.beginPath(); g.arc(c.x,c.y,px(s.r)*t,0,Math.PI*2); g.stroke(); }
          if (e.kind === 'fly') { const ease=1-(1-t)**3; g.fillStyle='#ffe17b'; g.beginPath(); g.arc(c.x+(s.to.x-c.x)*ease,c.y+(s.to.y-c.y)*ease-40*Math.sin(t*Math.PI),px(6),0,Math.PI*2); g.fill(); }
          if (e.kind === 'impact' && !world.effectImpact?.(g, e)) { g.fillStyle='#ffcf54'; g.beginPath(); for(let i=0;i<20;i++){const a=i*Math.PI/10,r=px(i%2?16:32)*(1+t);if(!i)g.moveTo(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r);else g.lineTo(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r);}g.closePath();g.fill(); }
          if (e.kind === 'flash' && !s.target) { g.globalAlpha=s.alpha*(1-t);g.fillStyle=s.color||'#ffffff';g.fillRect(0,world.view?.top||0,W,H-(world.view?.top||0)); }
          if (e.kind === 'vignette') { const gradient=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.65);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,s.color);g.globalAlpha=s.alpha*(1-t);g.fillStyle=gradient;g.fillRect(0,world.view?.top||0,W,H-(world.view?.top||0)); }
          if (['popup','label','banner'].includes(e.kind) && !e.skipped) {
            const rect=drawText(g,e,bounds,[...avoid,...drawnText]);
            e.rect=rect;
            e.deferred=!rect;
            if(rect)drawnText.push(rect);
          }
        }
        g.restore();
      }
    };
    function drawText(g,e,normalBounds,avoid) {
      // Integer sprite placement needs room for the text outline at pixel edges.
      if (world.art?.pixel === true) avoid = avoid.map(a => ({ x:a.x-2, y:a.y-2, w:a.w+4, h:a.h+4 }));
      const b = e.c.bounds || normalBounds, s=e.step, t=e.age/e.life, size=px(s.px||32);
      const pop=e.kind==='popup' ? s.pop || [.5,1.25,1] : [1,1,1], phase=Math.min(1,e.age*1000/Math.max(1,s.popMs||1));
      const scale=phase<.6?pop[0]+(pop[1]-pop[0])*phase/.6:pop[1]+(pop[2]-pop[1])*(phase-.6)/.4;
      g.font=`${size}px DoHyeon, sans-serif`; g.textAlign='center';g.textBaseline='middle';
      if(world.cacheEffectText){const key=`${g.font}:${window.devicePixelRatio||1}:${s.color||'#ffe17b'}`;if(e.textKey!==key){e.textKey=key;e.metrics=null;e.textSprite=null;}}
      if(world.cacheEffectText&&!e.textSprite){const key=`${e.textKey}:${s.text}`,cached=effectTextCache.get(key);if(cached){effectTextCache.delete(key);effectTextCache.set(key,cached);e.textSprite=cached;e.metrics=cached.metrics;}}
      const slide = e.kind==='banner' && s.slide!==false ? px(4) : 0;
      const m=world.cacheEffectText?(e.metrics||=g.measureText(s.text)):g.measureText(s.text), hw=(Math.max(m.width/2,m.actualBoundingBoxLeft||0,m.actualBoundingBoxRight||0)+3)*Math.max(1,scale), hh=(Math.max(m.actualBoundingBoxAscent||size*.5,m.actualBoundingBoxDescent||size*.5)+3+slide)*Math.max(1,scale);
      let fit=Math.min(1,(b.w-2)/(hw*2),(b.h-2)/(hh*2)), position;
      while (fit*size>=Math.min(12,size) && !position) {
        const rise=e.kind==='banner'&&s.slide===false?0:px(30)*t;
        const w=hw*fit*2,h=hh*fit*2,x=clamp(e.c.x,b.x+w/2+1,b.x+b.w-w/2-1),y=clamp(b.y+b.h*(e.c.textRow??(e.kind==='popup'?.72:.28))-rise,b.y+h/2+1,b.y+b.h-h/2-1);
        const xs=[x],ys=[y];for(const a of avoid){xs.push(a.x-w/2-1,a.x+a.w+w/2+1);ys.push(a.y-h/2-1,a.y+a.h+h/2+1);}
        let nearest=Infinity;
        candidates:for(const cx of xs)for(const cy of ys){const rx=cx-w/2,ry=cy-h/2,distance=(rx+w/2-x)**2+(ry+h/2-y)**2;
          if(distance>=nearest||rx<b.x+.5||ry<b.y+.5||rx+w>b.x+b.w-.5||ry+h>b.y+b.h-.5)continue;
          let covered=false;for(const a of avoid)if(rx<a.x+a.w&&rx+w>a.x&&ry<a.y+a.h&&ry+h>a.y){covered=true;break;}
          if(!covered){position={x:rx,y:ry,w,h};nearest=distance;if(distance===0)break candidates;}
        }
        if(!position)fit*=.9;
      }
      // An achievement must wait for room rather than disappear unread.
      if (!position) return;
      const {x,y,w,h}=position; e.log.params.textRect={x,y,w,h};
      g.save();g.translate(x+w/2,y+h/2);g.scale(scale*fit,scale*fit);
      // Sliding is confined to the measured rectangle, so it cannot cover answers.
      if(slide)g.translate(0,(1-Math.min(1,e.age/.18))*slide);
      g.globalAlpha=Math.min(1,(1-t)*3);g.strokeStyle='#3c382e';g.fillStyle=s.color||'#ffe17b';g.lineJoin='round';g.lineWidth=6;
      if(world.cacheEffectText&&typeof document!=='undefined'){
        if(!e.textSprite){
          const left=m.actualBoundingBoxLeft??m.width/2,right=m.actualBoundingBoxRight??m.width/2,asc=m.actualBoundingBoxAscent??size*.5,desc=m.actualBoundingBoxDescent??size*.5,pad=4,dpr=Math.max(2,Math.min(3,window.devicePixelRatio||1));
          const sprite=document.createElement('canvas');sprite.width=Math.ceil((left+right+pad*2)*dpr);sprite.height=Math.ceil((asc+desc+pad*2)*dpr);
          const context=sprite.getContext('2d');context.setTransform(dpr,0,0,dpr,(left+pad)*dpr,(asc+pad)*dpr);context.font=g.font;context.textAlign='center';context.textBaseline='middle';context.lineJoin='round';context.lineWidth=6;context.strokeStyle='#3c382e';context.fillStyle=s.color||'#ffe17b';context.strokeText(s.text,0,0);context.fillText(s.text,0,0);
          sprite.gfEffectText={text:s.text,ink:{x:-left-3,y:-asc-3,w:left+right+6,h:asc+desc+6}};e.textSprite={sprite,x:-left-pad,y:-asc-pad,w:sprite.width/dpr,h:sprite.height/dpr,metrics:m};
          const bytes=sprite.width*sprite.height*4,budget=8*1024*1024;
          if(bytes<=budget){while(effectTextCache.size&&(effectTextCache.size>=256||effectTextBytes+bytes>budget)){const key=effectTextCache.keys().next().value,old=effectTextCache.get(key);effectTextBytes-=old.sprite.width*old.sprite.height*4;old.sprite.gfBitmap?.close();old.sprite.gfBitmap=null;effectTextCache.delete(key);}const key=`${e.textKey}:${s.text}`,current=e.textSprite;effectTextCache.set(key,current);effectTextBytes+=bytes;
            if(window.createImageBitmap)window.createImageBitmap(sprite).then(bitmap=>{if(effectTextCache.get(key)===current){bitmap.gfEffectText=sprite.gfEffectText;sprite.gfBitmap=bitmap;}else bitmap.close();});}
        }
        const cached=e.textSprite;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='low';g.drawImage(cached.sprite.gfBitmap||cached.sprite,cached.x,cached.y,cached.w,cached.h);
      }else{g.strokeText(s.text,0,0);g.fillText(s.text,0,0);}
      g.restore();
      return position;
    }
    return api;
  }
  Object.assign(window.GFJuice, { feelLoaded:false, create, sound, lightMeter });
})();
