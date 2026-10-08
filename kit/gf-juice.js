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
    press(fx,x,y) { sfx.play('tap'); fx.ring(x,y); },
    hit(fx,x,y) { sfx.play('hit'); fx.burst(x,y,{ kind:'spark' }); fx.shake(3,80); fx.hitstop(50); },
    right(fx,x,y,{ points = 120, combo } = {}) {
      const result = combo?.hit() || { level:0,levelUp:false };
      sfx.play(result.level ? 'combo' : 'right',{ level:result.level }); fx.burst(x,y,{ kind:'star' }); fx.text(x,y,`+${points.toLocaleString('ko-KR')}`);
      if (result.levelUp) { fx.text(x,y-55,`${result.count}연속!`,{ size:48 }); fx.burst(x,y,{ kind:'fire' }); fx.flash('#fffef8',80,0.25); }
      return result;
    },
    wrong(fx,x,y,{ combo, flash = true, shake = [8, 220] } = {}) { sfx.play('wrong'); if (shake) fx.shake(...shake); if (flash) fx.flash('#ff5a3d',120,0.18); combo?.miss(); },
    best(fx) {
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
  function bump(el,className) { el.classList.remove(className); void el.offsetWidth; el.classList.add(className); }
  function rollNumber(el,to,{ ms = 400 } = {}) {
    const old = rolls.get(el); if (old) jobs.delete(old);
    const from = Number(el.textContent.replaceAll(',','')) || 0;
    bump(el,'gf-bump');
    if (sim() || ms <= 0) { el.textContent = to.toLocaleString('ko-KR'); return; }
    const job = animate(ms,t => {
      const value = Math.round(from + (to-from) * (1-(1-t)**3));
      el.textContent = (value === from && to !== from ? from + Math.sign(to-from) : value).toLocaleString('ko-KR');
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
  window.GFJuice = { sfx,Fx,Combo,react,countdown,finale,rollNumber,goal };
})();
