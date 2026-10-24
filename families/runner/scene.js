(function () {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const names = ['학교 앞', '공원', '바닷가', '밤 길'];
  const scene = { images: new Map(),spritePool:{cache:new Map(),bytes:0,builds:0,evictions:0},warmedFonts:new Set(), enabled: w => !!w.art.ui?.runner };
  scene.pace = (w, item) => {
    const config=scene.pacing, state=w.modeSession?.state;
    const mode=config.modes[state?.play||'quick'];
    const grade=mode.grades.find(row=>w.grade<=row.maxGrade);
    const intro=state?.play==='stage'&&state.stage.id<=mode.introThrough;
    const acceleration=intro?mode.introAccelerationPerSec:mode.accelerationPerSec;
    // Smooth elapsed-time acceleration; combo, fever and help never cross the
    // mode/grade reading floor. Keep every tuning value beside the mode config.
    const seconds=(grade.startSec+(intro?mode.introBonusSec:0))/(1+(state?.elapsed||w.roundTime)*acceleration);
    // 통분·약분·소수점 옮기기처럼 손이 여러 번 가는 문제는 그만큼을 따로 더한다. 가속도 피버도 이 몫은 깎지 않는다.
    const think=window.GFFamilies.runner.rules.think(item,w.grade)*(w.adapt?.factor()||1);
    return { seconds:Math.max(grade.minSec,seconds*(w.adapt?.factor()||1)*(w.fever?.active?.8:1))+think+(w.modePowers?.slow?2:0),
      depth:config.appearanceDepth,travel:config.worldTravelUnits,gap:config.gapSec,run:config.runSec };
  };
  scene.setup = w => {
    window.document?.querySelector?.(`.gf-runner-scene[data-side="${w.side}"]`)?.remove();
    Object.assign(w, { dashAt: -10, zone: 0, zoneAt: 0, previousZone: 0, nextZone: 40, passedGates: 0, bossChain: 0,
      guardianSteps: 0, runnerPowers: { double: false }, sign: null });
    w.sceneSprites=scene.spritePool.cache;
    for(const [name,key]of Object.entries({sceneSpriteBytes:'bytes',sceneSpriteBuilds:'builds',sceneSpriteEvictions:'evictions'}))Object.defineProperty(w,name,{configurable:true,get:()=>scene.spritePool[key]});
    const record = w.record;
    w.record = (name, data) => { if (name === 'powerup') scene.grant(w, data.id); return record(name, data); };
    if (window.Image) for (const [name, slot] of Object.entries(w.art.ui.runner)) {
      if (!scene.images.has(slot.file)) { const img = new Image(); img.src = slot.file; scene.images.set(slot.file, img); }
      const img=scene.images.get(slot.file);
      if(!img.complete)img.addEventListener('load',()=>scene.warm(w),{once:true});
    }
    if(window.Image)scene.warm(w);
    // The overhead plank owns the question. The compact score row stays clear.
    w.question = null;
    w.challengeMaker = window.GFFamilies.runner.rules.maker(w.content, Math.min(6, w.grade + 1), w.rng);
    const canvas = window.document?.querySelector?.('canvas.gf-canvas');
    if (canvas && !canvas.runnerSwipes) {
      canvas.runnerSwipes = true; let pointer;
      canvas.addEventListener('pointerdown', event => {
        let world=window.__GAME?.world();if(!world||window.__GAME.state()!=='play'||scene.paused)return;
        const other=window.__GAME.world(1);if(other&&event.clientX>=other.view.x&&event.clientY>=other.view.y)world=other;
        pointer = { x:event.clientX, y:event.clientY, id:event.pointerId, lane:world.lane, world };
        event.stopImmediatePropagation();
      },true);
      canvas.addEventListener('pointerup', event => {
        if (!pointer || pointer.id !== event.pointerId || window.__GAME?.state() !== 'play') return;
        const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y,world=pointer.world;
        if(scene.paused||world.modeSession?.state.paused){pointer=null;return;}
        if (Math.max(Math.abs(dx),Math.abs(dy)) > 24) {
          if (dy < -24 && Math.abs(dy)>Math.abs(dx)) scene.dash(world);
          else window.GFFamilies.runner.engine.key(world,clamp(pointer.lane+(dx>0?1:-1),0,2));
        } else window.GFFamilies.runner.engine.press(world,event.clientX-(world.view.x||0),event.clientY-(world.view.y||0));
        world.inputs.push({t:world.clock,kind:'press',x:event.clientX,y:event.clientY,bot:false});if(world.inputs.length>200)world.inputs.shift();
        pointer=null;
      });
    }
    if(window.GF?.on&&!scene.pauseListening){scene.pauseListening=true;window.GF.on('pause',()=>{scene.paused=true;});window.GF.on('resume',()=>{scene.paused=false;});}
  };
  scene.grant = (w, id) => {
    if (id === 'double') w.runnerPowers.double = true;
    if (id === 'shield' && w.modePowers) w.modePowers.shield = Math.max(1,w.modePowers.shield);
    if (id === 'slow' && w.modePowers) w.modePowers.slow = 1;
  };
  scene.layout = w => {
    w.cardReserve = 0;
    w.hy = w.view.h * .35;
    // The painted road in the background ends lower than the overlay triangle
    // (measured: .417h wide view, .37h tall view), so doors shrink toward this
    // line. Aiming at w.hy left them hanging in the sky above the asphalt.
    w.roadTop = w.hy + (w.view.h - w.hy) * (w.view.tall ? .03 : .10);
    w.feetY = w.view.h * .90;
    w.childH = w.view.h * .18;
    w.bottomW = Math.min(w.view.w * .94, w.view.h * 1.32);
    w.minPx = Math.max(24, Math.ceil(w.view.h * .032));
    w.labelPx = Math.max(w.minPx, Math.round(w.view.h * .038));
  };
  // The question plank hangs right under the score row. Cheers use the sky
  // between the plank and the horizon, where the far doors have not arrived.
  // Short split views have no sky left under the plank, so cheers move to the
  // upper road above the score row and step around the doors there.
  scene.signTop = w => w.view.top + 8;
  scene.noticeBounds = w => {
    if (w.hy === undefined || w.bottomW === undefined) scene.layout(w);
    const y=scene.signTop(w)+scene.signSize(w).h+6;
    if(w.hy-y-6>=Math.max(28,w.view.h*.05))return {x:8,y,w:w.view.w-16,h:w.hy-y-6};
    const top=Math.max(y,w.hy+4),bottom=scene.child(w).y-w.view.h*.12-4;
    return {x:8,y:top,w:w.view.w-16,h:Math.max(0,bottom-top)};
  };
  scene.signSize = w => {
    const wideWidth=Math.min(w.view.w*.96,w.view.h*.85),wide=w.art.ui.runner['plank-wide'];
    const slot=wideWidth*wide.h/wide.w>=Math.ceil(w.view.h*.04)*1.6+24?'plank-wide':'plank',a=w.art.ui.runner[slot];
    const width=slot==='plank'?Math.min(w.view.w*.96,Math.max(Math.min(w.bottomW*.98,w.view.w*.96)*1.05,w.view.h*.70)):Math.min(w.view.w*.96,w.view.h*.85);
    return {slot,w:width,h:width*a.h/a.w};
  };
  scene.boss = w => {
    const id=w.modeSession?.state.stage?.id,H=w.view.h,W=w.view.w;
    if(id!==5&&id!==10)return null;
    // Bosses wait on the horizon: behind the far doors and below the plank.
    const floor=w.hy+H*.01,room=floor-scene.signTop(w)-scene.signSize(w).h-4;
    if(id===5){const size=Math.max(H*.05,Math.min(H*.12,room/1.25))*(1-.05*Math.min(2,w.bossChain))*(1+.03*Math.sin(w.time*2)),cx=W/2,cy=floor-size/2,angle=w.time*1.2,r=size*(Math.abs(Math.sin(angle))+Math.abs(Math.cos(angle)))/2;return {slot:'ball',x:cx-size/2,y:cy-size/2,w:size,h:size,cx,cy,angle,bounds:{x:cx-r,y:cy-r,w:r*2,h:r*2}};}
    const size=Math.max(H*.05,Math.min(H*.12,room)/1.24)*(1+.08*Math.min(3,w.guardianSteps)),box={x:W/2-size/2,y:floor-size,w:size,h:size};
    return {slot:'guardian',...box,bounds:box};
  };
  scene.round = w => {
    if (w.modeSession && !w.sceneSession) {
      w.sceneSession = w.modeSession;
      const session = w.modeSession;
      if (session.state.stage) {
        const id = session.state.stage.id;
        w.zone = id <= 2 || id === 5 ? 0 : id <= 4 ? 1 : id <= 7 ? 2 : id === 8 ? 3 : 0;
        w.previousZone = w.zone;
        // Tools belong to this stage only; there is no choice dialog in stages.
        if (id === 6) w.modePowers.shield = 1;
        if (id === 7) w.modePowers.slow = 1;
      }
      if (w.reask) w.reask = window.GFLearn.reask.create({ rng: w.rng, end: session.state.play === 'endless' ? Infinity : 300 });
    }
    const mode = w.modeSession?.state;
    const elapsed = mode?.elapsed ?? w.roundTime;
    if ((!mode || mode.play !== 'stage') && elapsed >= w.nextZone - 1e-9) {
      w.previousZone = w.zone;
      const sector = Math.floor((elapsed + 1e-9) / 40);
      w.zone = mode?.play === 'endless' && sector >= 9 ? 3 : sector % 3;
      w.zoneAt = w.time; w.nextZone += 40;
      if (mode && window.__GAME) window.__GAME.milestone();
      w.record('zone', { zone: w.zone, elapsed });
    } else if (mode?.stage?.id === 9) {
      const zone=Math.floor((elapsed+1e-9)/20)%3;
      if(zone!==w.zone){w.previousZone=w.zone;w.zone=zone;w.zoneAt=w.time;}
    }
  };
  scene.question = (w, item) => {
    let text = item.q;
    if (item.form === 'gcdLcm') text = `${item.ops[0] === 'gcd' ? '최대공약수' : '최소공배수'}(${item.ops[1]},${item.ops[2]})=□`;
    w.signText = window.GFFamilies.runner.rules.ascii(text);
    w.question = null;
  };
  scene.challenge = w => w.modeSession?.state.play === 'endless' && w.modeSession.state.elapsed >= 120 && w.n % 4 === 0;
  scene.item = (w, fallback) => {
    if (scene.challenge(w)) return w.challengeMaker.next(w.n, w.grade === 6 ? 3 : 1 + (w.n % 3));
    const id = w.modeSession?.state.stage?.id;
    if (id === 7) {
      if (w.chainNext) { const next=w.chainNext;w.chainNext=null;w.chainFrom=w.previousAnswer;return next; }
      const pool=[fallback];
      for(let i=0;i<200;i++) {
        pool.push(w.maker.next(w.n));
        for(const first of pool)for(const second of pool) {
          if(first!==second&&second.q.match(/\d+(?:\.\d+|\/\d+)?/g)?.includes(first.a)) {w.chainNext=second;return first;}
        }
      }
      throw Error('이어 풀 문제 짝을 찾지 못했어요');
    }
    return fallback;
  };
  scene.judge = (w, correct, gate) => {
    w.passedGates++;
    w.previousAnswer = gate.item.a;
    if (gate.challenge && !correct && w.modeSession) {
      w.modeSession.judge('wrong', 0, { protectedWrong: true });
      if (w.fever && !w.fever.active) w.fever.gauge = Math.max(0, w.fever.gauge - 3);
    } else w.judge?.(correct ? 'right' : 'wrong');
    if (correct) {
      w.bossChain++;
      w.doorBurst = { at:w.time, lane:w.lane, box:scene.shapes(w,gate,1.09375).shapes[w.lane].box };
      const value = 5 * (w.runnerPowers.double ? 2 : 1) * (w.fever?.active ? 2 : 1);
      w.score += 5 * value;
      // Endless has no road pickups: every 8 right answers in a row win a heart back.
      if (w.modeSession?.state.play === 'endless' && w.bossChain % 8 === 0) w.modeSession.addHeart(1);
    } else { w.bossChain = 0; if (w.modeSession?.state.stage?.id === 10) w.guardianSteps++; }
    const stage = w.modeSession?.state.stage;
    if (stage) {
      const progress = stage.id === 5 || stage.id === 10 ? w.bossChain : w.passedGates;
      w.modeSession.setProgress(progress);
    }
  };
  scene.progress = (w, g) => clamp(g.chosen === null ? (w.time - g.t0) / g.T : g.fc + (1 - g.fc) * (w.time - g.tc) / Math.max(1e-6, g.te - g.tc), 0, 1);
  // Up / W / Space or an upward swipe dashes through the door in the child's
  // lane right away. The lane is locked from then on.
  scene.dash = w => {
    const g = w.gate;
    if (!g || g.chosen !== null || w.time < w.fallUntil || w.time >= g.t0 + g.T - .05) return;
    const p = scene.progress(w, g);
    g.chosen = w.lane; g.tc = w.time; g.te = Math.min(w.time + .6, g.t0 + g.T); g.fc = p;
    w.dashAt = w.time; w.record('dash', { lane: w.lane, at: p });
  };
  scene.step = (w, dt) => { scene.layout(w); };
  scene.shapes = (w, gate, d) => {
    // Lay the doors out once at their arrival size, then shrink everything
    // toward the vanishing point: the doors start small at the end of the road
    // and grow evenly, so the answers are readable long before they arrive.
    const H = w.view.h, W = w.view.w, cx = W / 2, hy = w.hy;
    const gap = Math.min(w.bottomW * .98, W * .96) / 3;
    const height = Math.min(gap * (w.modeSession?.state.stage?.id===10?1.22:1.18), H * .32);
    const center = H * .655, bottom = center + height * .77;
    const width = height * w.art.ui.runner['arch-0'].w / w.art.ui.runner['arch-0'].h;
    // A far door may not shrink past .3 of its arrival size: smaller than that
    // the numbers cannot be read, which is the whole point of the long road.
    // 답이 길면(6학년 분수) 가장 작은 글씨도 이웃 자리를 넘으므로, 그 글씨가 자기 자리에
    // 들어가는 배율까지만 작아진다. 긴 답은 문이 조금 가까이서 나타난다.
    // plateSpan은 팻말 폭을 글씨 크기의 배수로 어림한 것이다(숫자 폭 .55 + 좌우 여백 .7).
    // 분수는 분자와 분모를 위아래로 쌓으므로(gf-shell의 pieces) 긴 쪽만 .75 크기로 세고 사이 여백 .2를 더한다.
    // 「11/12」를 다섯 글자로 세면 폭이 세 배 넘게 부풀어, 폰에서 문이 멀리 있어도 작아지지 못했다.
    const plateSpan = text => { const str = String(text); let span = .7, end = 0;
      for (const m of str.matchAll(/(\d+|\u25A1)\/(\d+|\u25A1)/g)) { span += (m.index - end) * .55 + Math.max(m[1].length, m[2].length) * .4125 + .2; end = m.index + m[0].length; }
      return span + (str.length - end) * .55; };
    const widest = Math.max(...gate.answers.map(plateSpan));
    const s0 = Math.min(1, Math.max(1.09375 / gate.dApp, .3, w.minPx * widest / (gap * .98))), p = clamp((gate.dApp - d) / Math.max(.01, gate.dApp - 1.09375), 0, 1), s = s0 + (1 - s0) * p;
    const vy = w.roadTop ?? hy;
    const at = b => ({ ...b, x: cx + (b.x - cx) * s, y: vy + (b.y - vy) * s, w: b.w * s, h: b.h * s });
    const full = gate.answers.map((text, i) => { const a = w.art.ui.runner[`arch-${i}`], nativeWidth = height * a.w / a.h; return { x: cx + (i - 1) * gap - nativeWidth / 2, y: bottom - height, w: nativeWidth, h: height }; });
    const shapes = full.map((b, i) => { const box = at(b); return { box, text: gate.answers[i], cx: box.x + box.w / 2, cy: vy + (center - vy) * s }; });
    const plateWidth = Math.min(gap * .96, Math.max(width * .80, w.labelPx * 3.2)), plateH = Math.max(height * .22, w.labelPx * 1.72);
    const slots = full.map(b => at({ x: b.x + b.w / 2 - plateWidth / 2, y: b.y + height * .20, w: plateWidth, h: plateH }));
    // The distance between neighbouring plate centres is the widest a plate may be.
    // 글씨는 그 폭 안에서 가장 크게 쓰되, 틀이 정한 가장 작은 크기(w.minPx)보다 작아지지 않는다.
    const pitch = Math.min(...slots.slice(1).map((r, i) => r.x + r.w / 2 - slots[i].x - slots[i].w / 2));
    const cap = Math.max(1, pitch * .98), px = Math.max(w.minPx, Math.min(Math.round(w.labelPx * s), Math.floor(cap / widest)));
    const boxes = slots.map((r, i) => {
      // 분수는 분자와 분모를 위아래로 쓰므로 한 줄 글씨보다 높이가 더 든다(gf-shell 1.6배).
      const pw = Math.min(Math.max(r.w, px * plateSpan(gate.answers[i])), cap), ph = Math.max(r.h, px * (gate.answers[i].includes('/') ? 1.75 : 1.5));
      return { ...r, x: r.x + (r.w - pw) / 2, y: r.y + (r.h - ph) / 2, w: pw, h: ph, px, text: gate.answers[i] }; });
    const frame = { ...at({ x: full[0].x - width * .10, y: full[0].y - height * .21, w: full[2].x + width - full[0].x + width * .20, h: height * 1.21 }), post: Math.max(6, height * .07) * s };
    const signSize=scene.signSize(w),signWidth=signSize.w,signH=signSize.h;
    if(w.sign?.text!==w.signText)w.sign=null;
    w.sign = Object.assign(w.sign||{}, { slot:signSize.slot,x: (W - signWidth) / 2, y: scene.signTop(w), w: signWidth, h: signH, px: Math.ceil(H * .04), text: w.signText, challenge: !!gate.challenge });
    return { shapes, boxes, frame, scale: s, progress: p };
  };
  scene.child = (w, lane = w.lane) => {
    const fallen = w.time < w.fallUntil;
    const slot = fallen ? 'hit' : w.time < w.cheerUntil ? 'cheer' : 'run';
    const h = w.childH, art=w.art.ui.runner[slot], width = h * (art?art.w/art.h:.57);
    if(w.slide&&lane===w.lane)lane=w.slide.from+(w.lane-w.slide.from)*clamp((w.time-w.slide.at)/.15,0,1);
    return { slot, x: w.view.w / 2 + (lane - 1) * w.bottomW / (3 * 1.09375) - width / 2, y: w.feetY - h, w: width, h };
  };
  scene.image = (w, g, name, box, frame = 0) => {
    const slot = w.art.ui.runner[name], img = slot && scene.images.get(slot.file);
    if (!img?.complete || !img.naturalWidth || box.x + box.w < 0 || box.x > w.view.w || box.y + box.h < 0 || box.y > w.view.h) return;
    const sw = img.naturalWidth / (slot.frames || 1), sh = img.naturalHeight;
    const scale = Math.min(box.w / sw, box.h / sh), width = sw * scale, height = sh * scale;
    if(g){g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';}
    const pool=scene.spritePool,cache=pool.cache,factor=Math.pow(1.15,Math.round(Math.log(Math.max(.01,scale))/Math.log(1.15))),cw=Math.max(1,Math.round(sw*factor)),ch=cw*sh/sw,key=`${slot.file}:${frame}:${cw}`;
    let ready=cache.get(key);
    if(!ready){
      const surface=typeof OffscreenCanvas==='function'?new OffscreenCanvas(cw,Math.ceil(ch)):document.createElement('canvas');surface.width=cw;surface.height=Math.ceil(ch);
      const target=surface.getContext('2d');target.imageSmoothingQuality='low';target.drawImage(img,frame*sw,0,sw,sh,0,0,cw,ch);
      const bytes=surface.width*surface.height*4;
      while(cache.size&&(cache.size>=512||pool.bytes+bytes>8*1024*1024)){const oldest=cache.keys().next().value,entry=cache.get(oldest);pool.bytes-=entry.bytes;entry.surface.close?.();cache.delete(oldest);pool.evictions++;}
      const raster=surface.transferToImageBitmap?.()||surface;if(raster!==surface){surface.width=0;surface.height=0;}
      raster.gfRunnerR1Image={slot:name,frame};ready={surface:raster,cw,ch,bytes};cache.set(key,ready);pool.bytes+=bytes;pool.builds++;
    }else{cache.delete(key);cache.set(key,ready);}
    if(g)g.drawImage(ready.surface,0,0,ready.cw,ready.ch,box.x+(box.w-width)/2,box.y+box.h-height,width,height);
  };
  scene.warm = w => {
    if(w.sceneWarmed||Object.values(w.art.ui.runner).some(a=>!scene.images.get(a.file)?.naturalWidth))return;
    w.sceneWarmed=true;scene.layout(w);const H=w.view.h;
    const prepare=(name,height,frame=0,square=false)=>{const a=w.art.ui.runner[name];scene.image(w,null,name,{x:0,y:0,w:square?height:height*a.w/a.h,h:height},frame);};
    const gap=Math.min(w.bottomW*.98,w.view.w*.96)/3,full=Math.min(gap*1.18,H*.32);
    for(const name of ['arch-0','arch-1','arch-2']){for(let s=.1;s<1;s*=1.15)prepare(name,full*s);prepare(name,full);}
    const sign=scene.signSize(w);prepare(sign.slot,sign.h);
    for(const name of ['hit','cheer'])prepare(name,H*.18);
    for(let frame=0;frame<4;frame++)prepare('run',H*.18,frame);
    for(const size of [3,4,5,6])prepare('dust',size,0,true);
    for(const size of [H*.18*.18,28])prepare('bits',size,0,true);
  };
  scene.warmFonts = w => {
    const key=String(w.fontScale||1);
    if(scene.warmedFonts.has(key)||!document.fonts.check('40px DoHyeon'))return;
    scene.warmedFonts.add(key);
    const surface=typeof OffscreenCanvas==='function'?new OffscreenCanvas(2048,256):document.createElement('canvas');surface.width=2048;surface.height=256;
    const g=surface.getContext('2d');g.setTransform(2,0,0,2,0,0);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=6;g.strokeStyle='#3c382e';g.fillStyle='#ffe17b';
    const words=['+0123456789','번개!','좋아!','연속 5!','대단해!','15연속!','불꽃 연속!','전설!','피버!','보물 문제!','도전 성공!','극복!'];
    for(const size of [32,40,44,48,52,56,60])for(const word of words){g.clearRect(0,0,1024,128);g.font=`${size*(w.fontScale||1)}px DoHyeon, sans-serif`;g.strokeText(word,512,64);g.fillText(word,512,64);}
    for(const font of new Set([...document.querySelectorAll('.gf-hud strong')].map(n=>getComputedStyle(n).font))){g.clearRect(0,0,1024,128);g.font=font;g.fillText('0123456789',512,64);}
    surface.width=0;surface.height=0;
  };
  scene.background = (w, g) => {
    const slot = w.art.ui.runner[`${['school','park','beach','night'][w.zone]}-${w.view.tall ? 'portrait' : 'landscape'}`];
    const previous = w.art.ui.runner[`${['school','park','beach','night'][w.previousZone]}-${w.view.tall ? 'portrait' : 'landscape'}`];
    const mix = w.zone===w.previousZone ? 1 : clamp((w.time - w.zoneAt) / 2, 0, 1);
    const main=document.querySelector('canvas.gf-canvas'),dom=main?.getContext('2d')===g&&GFFamilies.runner.engine.domSky&&g.getContextAttributes?.().alpha!==false;
    if(dom&&!w.sceneRoot){const root=document.createElement('div');root.className='gf-runner-scene';root.dataset.side=w.side;Object.assign(root.style,{position:'fixed',pointerEvents:'none',overflow:'hidden'});main.before(root);w.sceneRoot=root;}
    if(dom){const key=`${w.view.x}:${w.view.y}:${w.view.w}:${w.view.h}`;if(w.sceneRootKey!==key){Object.assign(w.sceneRoot.style,{left:`${w.view.x||0}px`,top:`${w.view.y||0}px`,width:`${w.view.w}px`,height:`${w.view.h}px`});w.sceneRootKey=key;}}
    function layer(asset, alpha) {
      const img = asset && scene.images.get(asset.file); if (!img?.complete || !img.naturalWidth) return;
      const key=`${asset.file}:${w.view.w}:${w.view.h}`,cache=w.sceneBackgrounds||=new Map();let ready=cache.get(key);
      if(!ready){ready=document.createElement('canvas');ready.width=Math.ceil(w.view.w);ready.height=Math.ceil(w.view.h);const target=ready.getContext('2d'),k=Math.max(w.view.w/img.naturalWidth,w.view.h/img.naturalHeight);target.imageSmoothingQuality='low';target.drawImage(img,(w.view.w-img.naturalWidth*k)/2,(w.view.h-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);while(cache.size>=2){const oldest=cache.keys().next().value;cache.get(oldest).remove();cache.delete(oldest);}cache.set(key,ready);w.backgroundBuilds=(w.backgroundBuilds||0)+1;}
      if(dom){if(ready.parentElement!==w.sceneRoot){ready.runnerAssetFile=asset.file;Object.assign(ready.style,{position:'absolute',inset:'0',width:'100%',height:'100%',willChange:'opacity'});w.sceneRoot.insertBefore(ready,w.frontRoad?.parentElement===w.sceneRoot?w.frontRoad:null);}if(ready.runnerOpacity!==alpha){ready.style.opacity=String(alpha);ready.runnerOpacity=alpha;}return;}
      g.globalAlpha = alpha; g.drawImage(ready,0,0);
    }
    if(dom)for(const child of w.sceneRoot.children)if(child.runnerAssetFile&&child.runnerAssetFile!==slot.file&&(mix>=1||child.runnerAssetFile!==previous.file)&&child.runnerOpacity!==0){child.style.opacity='0';child.runnerOpacity=0;}
    g.save(); if(mix<1)layer(previous,1); if (mix > 0) layer(slot, mix); g.restore();
  };
  scene.road = (w,g) => {
    const slot=w.art.ui.runner.road,img=slot&&scene.images.get(slot.file);
    if(!img?.complete||!img.naturalWidth)return;
    const key=`${w.view.w}:${w.view.h}:${w.bottomW}:${w.zone}`,scale=Math.min(1,900/w.view.w),W=Math.round(w.view.w*scale),H=Math.round((w.view.h-w.hy)*scale);
    if(w.frontRoadKey!==key) {
      w.frontRoad?.remove();
      const c=document.createElement('canvas');c.width=W;c.height=H;const context=c.getContext('2d');
      context.beginPath();context.moveTo(W/2,0);context.lineTo(W/2+w.bottomW*scale/2,H);context.lineTo(W/2-w.bottomW*scale/2,H);context.closePath();context.clip();
      context.fillStyle=context.createPattern(img,'repeat');context.fillRect(0,0,W,H);
      context.globalCompositeOperation='destination-in';const light=context.createLinearGradient(0,0,0,H);light.addColorStop(0,'rgba(0,0,0,0)');light.addColorStop(.45,'rgba(0,0,0,0)');light.addColorStop(1,'rgba(0,0,0,.16)');context.fillStyle=light;context.fillRect(0,0,W,H);
      w.frontRoad=c;w.frontRoadKey=key;w.roadBuilds=(w.roadBuilds||0)+1;
    }
    const main=document.querySelector('canvas.gf-canvas');
    if(main?.getContext('2d')===g&&w.sceneRoot&&g.getContextAttributes?.().alpha!==false){if(w.frontRoad.parentElement!==w.sceneRoot){w.frontRoad.className='gf-runner-road';Object.assign(w.frontRoad.style,{position:'absolute',left:'0',top:`${w.hy}px`,width:'100%',height:`${w.view.h-w.hy}px`,opacity:'1'});w.sceneRoot.appendChild(w.frontRoad);}return;}
    g.drawImage(w.frontRoad,0,w.hy,w.view.w,w.view.h-w.hy);
  };
  // 2인용 키보드 안내: 길 맨 아래 세 줄 자리에 그 줄로 가는 키 글자를 붙인다(왼쪽 주황·오른쪽 하늘, 위쪽 표시줄 쪽 이름표와 같은 색).
  // 2인용에는 키 안내 줄이 없어 시작 화면에서 본 키를 외워야 했다. 손가락 판(pointer:coarse)에서는 붙이지 않는다.
  function laneKeys(w,g) {
    if(w.keysTouch??=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches)return;
    const keys=w.family.keys?.[w.side];if(!keys)return;
    const size=Math.round(clamp(w.view.h*.045,18,32)),y=Math.round(Math.min(w.view.h-size-8,w.feetY+8)),right=w.side==='right';
    for(let lane=0;lane<3;lane++){
      const x=Math.round(w.view.w/2+(lane-1)*w.bottomW/(3*1.09375)-size/2);
      g.save();g.globalAlpha=lane===w.lane?1:.8;g.fillStyle='#3b2412';g.beginPath();g.roundRect(x,y+2,size,size,size*.22);g.fill();
      g.fillStyle=right?'#dff4ff':'#ffe6c7';g.strokeStyle=right?'#1d5a7a':'#8a4b12';g.lineWidth=2;g.beginPath();g.roundRect(x,y,size,size,size*.22);g.fill();g.stroke();
      g.fillStyle=right?'#1d5a7a':'#7a3f0c';g.font=`${Math.round(size*.68)}px DoHyeon, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(keys[lane].replace(/^Key/,''),x+size/2,y+size*.54);g.restore();
    }
  }
  scene.draw = (w, g) => {
    scene.warmFonts(w);
    scene.background(w, g);
    scene.road(w,g);
    // Moving lane strips and roadside objects are cheap perspective polygons.
    const H = w.view.h, W = w.view.w;
    const card=document.querySelectorAll('.gf-learn-layer')[w.side==='right'?1:0];
    // A wrong-answer card takes the plank's place; the next door waits for it.
    if(card){const top=scene.signTop(w),sign=scene.signSize(w).h;card.style.setProperty('--runner-card-top',`${(w.view.y||0)+top}px`);card.style.setProperty('--runner-card-height',`${scene.boss(w)?sign:Math.max(sign,Math.min(H*.17,w.hy-top-8))}px`);}
    g.fillStyle = w.fever?.active ? '#ffe08c' : '#fff3d4';
    for (let i = 0; i < 12; i++) {
      const z = .8 + ((i * .55 - w.dist) % 6.6 + 6.6) % 6.6, y = w.hy + (H - w.hy) / z, y2 = w.hy + (H - w.hy) / (z + .18);
      if (y2 > H || y < w.hy || y2 < w.hy) continue;
      for (const side of [-1, 1]) { const x = W/2 + side*w.bottomW/6/z, x2 = W/2 + side*w.bottomW/6/(z+.18), a = Math.max(1,W*.006/z); g.beginPath();g.moveTo(x-a,y);g.lineTo(x+a,y);g.lineTo(x2+a*.8,y2);g.lineTo(x2-a*.8,y2);g.closePath();g.fill(); }
    }
    // The authored background already puts trees, lamps and benches on the
    // sidewalks. Extra moving props used a narrower road than that picture
    // and looked like obstacles on the asphalt, so the background owns them.
    const boss=scene.boss(w);
    if(boss){g.save();if(boss.angle!==undefined){g.translate(boss.cx,boss.cy);g.rotate(boss.angle);scene.image(w,g,boss.slot,{x:-boss.w/2,y:-boss.h/2,w:boss.w,h:boss.h});}else scene.image(w,g,boss.slot,boss);g.restore();}
    if (w.gate) {
      const gate=w.gate, d=gate.dApp-(gate.dApp-1.09375)*scene.progress(w,gate), {shapes,boxes,frame,scale}=scene.shapes(w,gate,d);
      const p=frame.post;
      g.save();g.globalAlpha=clamp((w.time-gate.t0)/.45,0,1);
      g.fillStyle='#59351f';g.fillRect(frame.x+3*scale,frame.y+4*scale,frame.w,p*1.4);
      for(const x of [frame.x,frame.x+frame.w-p]){g.fillStyle='#633e26';g.fillRect(x,frame.y,p,frame.h);g.fillStyle='#a47847';g.fillRect(x+p*.2,frame.y,p*.4,frame.h);g.fillStyle='#ebd4b0';g.fillRect(x-p*.15,frame.y+frame.h-p,p*1.3,p);}
      g.fillStyle='#a47847';g.fillRect(frame.x,frame.y,frame.w,p);g.fillStyle='#d4a363';g.fillRect(frame.x,frame.y,frame.w,p*.25);
      for(const s of shapes){g.fillStyle='#633e26';g.fillRect(s.cx-p*.35,frame.y+p,p*.7,s.box.y-frame.y-p+s.box.h*.08);g.fillStyle='#a47847';g.fillRect(s.cx-p*.18,frame.y+p,p*.22,s.box.y-frame.y-p+s.box.h*.08);}
      for(let i=0;i<3;i++) {
        scene.image(w,g,`arch-${i}`,shapes[i].box);
        const b=boxes[i];g.fillStyle=gate.challenge?'#ffe8a4':'#ffecc1';g.strokeStyle='#86542a';g.lineWidth=Math.max(1,2*scale);g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,Math.max(1,7*scale));g.fill();g.stroke();
        // Every plate carries its number, far ones at the floor size.
        b.painted=!!window.GFShell.text(g,b.text,b,{min:b.px,max:b.px,lines:1,color:'#302019',outline:null,math:true});
      }
      const b=w.sign;
      g.fillStyle='#59351f';g.beginPath();g.roundRect(b.x+2,b.y+5,b.w,b.h,10);g.fill();scene.image(w,g,b.slot,b);
      b.painted = !!window.GFShell.text(g,b.text,{x:b.x+12,y:b.y+12,w:b.w-24,h:b.h-24},{min:b.px,max:b.px,lines:1,color:'#302019',outline:null,math:true});
      if(gate.challenge){g.fillStyle='#684400';g.font=`${Math.max(14,b.px*.55)}px Jua`;g.fillText('도전',b.x+18,b.y+10);}
      g.restore();
    }
    const b=scene.child(w);g.fillStyle='rgba(20,28,45,.28)';g.beginPath();g.ellipse(b.x+b.w/2,w.feetY-2,b.w*.52,b.h*.07,0,0,Math.PI*2);g.fill();scene.image(w,g,b.slot,b,b.slot==='run'?Math.floor(w.runPhase)%4:0);
    if(w.duo)laneKeys(w,g);
    if(w.doorBurst) {
      const age=w.time-w.doorBurst.at;
      if(age<.4){const box=w.doorBurst.box;for(const side of [-1,1]){g.save();g.globalAlpha=1-age/.4;g.translate(box.x+box.w/2+side*age*150,box.y+box.h/2-age*80);g.rotate(side*age*2);g.beginPath();g.rect(side<0?-box.w/2:0,-box.h/2,box.w/2,box.h);g.clip();scene.image(w,g,`arch-${w.doorBurst.lane}`,{x:-box.w/2,y:-box.h/2,w:box.w,h:box.h});g.restore();}}
      if(age<.7){g.save();g.globalAlpha=1-age/.7;const x=W/2+(w.doorBurst.lane-1)*w.bottomW/(3*1.09375);for(let i=0;i<8;i++)scene.image(w,g,'bits',{x:x+(i-3.5)*age*110-14,y:H*.67-age*180+age*age*240+(i%3)*12,w:28,h:28});g.restore();}
    }
    for(let i=0;i<w.bits.length;i+=w.decorLight?2:1){const p=w.bits[i],age=w.time-p.at;g.save();g.globalAlpha=1-age/.5;scene.image(w,g,'bits',{x:p.x+p.vx*age-p.size/2,y:p.y+p.vy*age+.5*p.gravity*age*age-p.size/2,w:p.size,h:p.size});g.restore();}
    for(const id of ['shield','slow','double'])if(id==='double'?w.runnerPowers.double:w.modePowers?.[id]){
      const ring=id==='shield'||id==='slow',size=b.h*.34;
      scene.image(w,g,`power-${id}`,ring?{x:b.x-b.w*.3,y:b.y-b.h*.1,w:b.w*1.6,h:b.h*1.2}:{x:b.x+b.w*.8,y:b.y+b.h*.60,w:size,h:size});
    }
    if(w.fever?.active){g.strokeStyle='#fff5ae';g.lineWidth=2;g.beginPath();for(let i=0;i<8;i++){const x=(i+1)*W/9;g.moveTo(x,H);g.lineTo(W/2+(x-W/2)*.8,H*.72);}g.stroke();}
  };
  scene.inspect = w => ({ zone:w.zone, name:names[w.zone], horizon:w.hy, roadWidth:w.bottomW, child:scene.child(w), sign:w.sign,boss:scene.boss(w)?.bounds||null, powers:{...w.runnerPowers,...w.modePowers}, chain:w.bossChain, passed:w.passedGates, guardian:w.guardianSteps, challenge:!!w.gate?.challenge });
  if(window.document?.head) {
    const style=document.createElement('style');
    style.textContent='body.gf-compact .gf-learn-layer:not(.gf-learn-duo),body.gf-compact .gf-learn-layer.gf-learn-duo{top:var(--runner-card-top,11%)!important;bottom:auto!important;height:var(--runner-card-height,17%)!important;max-width:500px}.gf-learn-layer .gf-learn-card{height:100%!important;min-height:0!important;overflow:auto;padding:6px 10px!important}.gf-learn-layer .gf-learn-note{white-space:nowrap;font-size:clamp(14px,2.1vh,26px)!important}.gf-learn-layer .gf-learn-word{grid-column:1/-1;white-space:nowrap;font-size:clamp(20px,3vh,36px)!important;line-height:1.1!important}';
    document.head.appendChild(style);
  }
  window.GFRunnerScene = scene;
  if(window.document&&window.parent!==window&&new URLSearchParams(window.parent.location.search).get('start')==='1') {
    const params=new URLSearchParams(location.search),play=params.get('play')||'quick';
    const observer=new MutationObserver(()=>{
      const b=document.querySelector(`[data-test="${play==='stage'?'stage-start':play==='endless'?'mode-endless':'start'}"]`);
      if(b){observer.disconnect();const url=new URL(window.parent.location.href);url.searchParams.delete('start');window.parent.history.replaceState(null,'',url);if(b.getAttribute('aria-pressed')==='false')b.click();b.click();}
    });observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
