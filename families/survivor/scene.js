(function () {
  'use strict';
  // 버티기 틀 화면. 작은 캔버스(그림 1칸 = 기기 화소 s칸)에 땅, 장식, 줍는 것, 몸, 발사체, 효과를 칠하고
  // 전장 층을 브라우저가 합성하고 앞 층에 피해 숫자, 경험치 막대, 아이콘 줄, 보스 막대를 얹는다.
  // 흔들릴 때 껍데기가 한 프레임에 drawBehindHUD와 draw를 둘 다 부르므로 칠하기는 열쇠(px.key)가 바뀔 때만 한다.
  // 부드럽게 미끄러지기: 칠하는 캔버스는 기기 화소 크기이고 그림 1칸을 s배로 키워 그린다. 자리는 그림 칸이 아니라
  // 기기 화소(1/s칸)로 맞춘다. 카메라는 걸음 사이(w.alpha)를 메운 주인공 자리를 따라간다. 1초 48칸 걸음이
  // 60번 걸음과 안 맞아 다섯 번에 한 번 멈춰 보이던 덜컥거림이 이것으로 없어진다.
  // 그림은 모두 오른쪽을 본다. 사본 표시: f 뒤집기, w 흰 번쩍, y 강한 적 금빛, r 다친 빨강.
  // 셋을 세는 동안 그림이 오기 전에도 그리므로, 빈 그림은 사본에 담지 않고 조금 뒤 다시 받는다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const doc = typeof document !== 'undefined';
  const PROPS = { field: [0, 1, 4, 10], hill: [2, 3, 4, 6], shore: [8, 2, 9], snow: [7, 11, 2], stone: [5, 9, 6, 2] };
  const TINT = { w: ['#ffffff', 1], y: ['#ffd23f', .45], r: ['#ff3b30', .45] };
  const ITEM_SHADOW = { coin: 10, chest: 16, scroll: 10, food: 10, magnet: 10 };
  const LIFT = 12, TILE = 256, CELL = 64, TURN = Math.PI / 16, FONT = 'DoHyeon, sans-serif', INK = '#141826';
  const sprites = new Map(), waits = new Map(), shadows = new Map(), tiles = new Map(), numPics = new Map(), hudNames = new Map(), battleImages = new Map();
  const walks = new WeakMap();
  const foeFrames = new Map();
  let bodyPictures = new WeakMap(), rotatedPictures = new WeakMap(), opacityPictures = new WeakMap(), fixedPictures = new WeakMap();
  const pictureQueue = [];
  const bodyQueue = [];
  let bodyBytes = 0;
  const numberPages = [];
  const ringPictures = new Map();
  let ringBytes = 0;
  let pictureBytes = 0, attackOpacity = 1, bakeSurface = null;
  const hudFrames = new Map();
  const giftPictures = new Map();
  const giftCounts = new Map();
  const bossTitles = new Map(), warningPictures = new Map();
  const bodies = [], propPool = [], bolt = new Float32Array(16);
  const ROTATED_KINDS = new Set(['nearest','throw','boomerang','lob','bomb','fan','spread','spin','crescent','homing','nova','rain','cluster','stampede','wave']);
  let owner = null, missing = false, fontReady = false, meter = null, hudCache = null, edgePic = null, numberPage = null, numberCursor = -1;
  const byY = (a, b) => a.y - b.y;
  const clamp01 = v => v > 0 ? v < 1 ? v : 1 : 0;
  let Q = 1;
  const rd = v => Math.round(v * Q) / Q;
  // 걸을 때 한 걸음(그림 한 장)마다 한 번 통통 뜬다.
  const hop = (on, t, hgt = 1.5) => on ? Math.abs(Math.sin(t / .18 * Math.PI)) * hgt : 0;

  function canvas(wd, ht) {
    const c = document.createElement('canvas'); c.width = wd; c.height = ht;
    c.getContext('2d', { willReadFrequently: true }).imageSmoothingEnabled = false; return c;
  }
  function uiCanvas(wd,ht) {
    const c=document.createElement('canvas');c.width=wd;c.height=ht;c.getContext('2d').imageSmoothingEnabled=false;return c;
  }
  function scratch(wd,ht) {
    bakeSurface ||= canvas(wd,ht);bakeSurface.width=wd;bakeSurface.height=ht;
    bakeSurface.getContext('2d').imageSmoothingEnabled=false;return bakeSurface;
  }
  function claim(w) {
    if (owner === w.art) return;
    owner = w.art; sprites.clear(); waits.clear(); shadows.clear(); tiles.clear(); hudNames.clear(); battleImages.clear(); hudFrames.clear(); giftPictures.clear(); giftCounts.clear(); foeFrames.clear(); bossTitles.clear(); warningPictures.clear(); hudCache = null;
    clearPictures();
    for (const key of Object.keys(w.art?.slots || {})) if (key.startsWith('hud-')) hudNames.set(key.replace(/-[a-f0-9]{12}$/, ''), key);
  }
  function clearPictures() {
    bodyPictures = new WeakMap(); rotatedPictures = new WeakMap(); opacityPictures = new WeakMap(); fixedPictures = new WeakMap(); pictureQueue.length = 0; pictureBytes = 0;
    bodyQueue.length=0;bodyBytes=0;
    ringPictures.clear();ringBytes=0;
  }
  function blank(g, wd, ht) {
    try { const d = g.getImageData(0, 0, wd, ht).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; } catch { return false; }
  }
  // 그림 칸 하나를 제 크기 캔버스로 받는다. v는 사본 표시(위 설명).
  const battleSpec = (w, slot) => w.art?.ui?.battle?.sprites?.[slot];
  // 논리 픽셀을 잘게 해도 원래 보이는 높이와 발 위치는 움직이지 않는다.
  // 2026-10-18부터 사람 높이는 대표가 정한 역할별 기준으로 맞추고, 예전 발 기준점은 그대로 지킨다.
  function personPicture(g, w, slot, c, x, y, flip, ally = false) {
    const { spec: s, ink, scale: k, baseScale, center, canvasWidth, bottom } = S.allies.personDisplay(w, slot, ally);
    const oldCenter = flip ? canvasWidth - center : center;
    const newCenter = flip ? s.w - ink[0] - ink[2] / 2 : ink[0] + ink[2] / 2;
    // 옛 그림에서 이미 반올림한 발 위치를 보존한다. 새 왼쪽 위를 다시 반올림하면 발이 한 칸 가까이 밀릴 수 있다.
    const oldX = rd(x - 12 + oldCenter - newCenter * baseScale), oldY = rd(y + bottom - (ink[1] + ink[3]) * baseScale);
    g.drawImage(c, oldX + newCenter * (baseScale - k), oldY + (ink[1] + ink[3]) * (baseScale - k), s.w * k, s.h * k);
  }
  function sprite(w, slot, v = '', frame = 0) {
    if (!doc || !w.art || !slot) return null;
    claim(w);
    const key = slot + ':' + frame + ':' + v; let c = sprites.get(key);
    if (c !== undefined) return c;
    const extra = battleSpec(w, slot), s = extra || w.art.slots?.[slot];
    if (!s) { sprites.set(key, null); return null; }
    if (!v) {
      const now = performance.now();
      if (now < (waits.get(slot) || 0)) { missing = true; return null; }
      let picture;
      if (extra) {
        picture = battleImages.get(s.file);
        if (!picture) {
          picture = new Image(); battleImages.set(s.file, picture);
          picture.onload = () => { waits.delete(slot); if (w.px) w.px.key = null; };
          picture.onerror = () => console.error('전장 그림을 읽지 못했어요: ' + s.file);
          picture.src = s.file;
        }
        if (!picture.complete || !picture.naturalWidth) { missing = true; return null; }
      }
      const probe = canvas(s.w, s.h), pg = probe.getContext('2d');
      if(extra)pg.drawImage(picture, frame * s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
      else window.GFShell?.img?.(pg, slot, 0, 0, s.w, s.h, frame);
      if (blank(pg, s.w, s.h)) { waits.set(slot, now + 200); missing = true; return null; }
      c = canvas(s.w, s.h); c.getContext('2d').drawImage(probe, 0, 0);
    } else {
      const base = sprite(w, slot, '', frame); if (!base) return null;
      c = canvas(s.w, s.h); const g = c.getContext('2d');
      if (v.includes('f')) { g.translate(s.w, 0); g.scale(-1, 1); }
      g.drawImage(base, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
      const t = TINT[v.replace('f', '')];
      if (t) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(0, 0, s.w, s.h); }
    }
    sprites.set(key, c); return c;
  }
  // 같은 적 그림의 걸음·뒤집기·색은 열두 가지다. 긴 칸 이름과 사본 열쇠는
  // 처음 찾을 때만 만들고, 아직 오지 않은 그림은 다음 걸음에 다시 찾는다.
  function foeFrame(w, o, time, white) {
    let bank = foeFrames.get(o.sprite);
    if (!bank) {
      const prefix = 'foe-' + o.sprite + '-', spec = battleSpec(w, prefix + 'a');
      bank = { prefix, frames: new Array(12), bottom: spec ? 1 : 2, height: spec?.h || 24, picture: null };
      foeFrames.set(o.sprite, bank);
    }
    const phase = (((time + o.phase) / .18) | 0) % 2, flip = o.faceX < 0;
    const color = white ? 1 : o.kind === 'elite' ? 2 : 0, at = phase * 6 + color * 2 + (flip ? 1 : 0);
    bank.picture = bank.frames[at] || (bank.frames[at] = sprite(w, bank.prefix + (phase ? 'b' : 'a'), (white ? 'w' : o.kind === 'elite' ? 'y' : '') + (flip ? 'f' : '')));
    return bank;
  }
  // 발밑 타원 그림자. 폭마다 한 장.
  function shadow(w, wd) {
    claim(w); let c = shadows.get(wd); if (c) return c;
    const ht = Math.max(3, Math.round(wd / 3)), rx = wd / 2, ry = ht / 2;
    c = canvas(wd, ht); const g = c.getContext('2d');
    g.fillStyle = w.art.palette?.shadow || '#252239'; g.globalAlpha = .35;
    for (let y = 0; y < ht; y++) {
      const dy = (y + .5 - ry) / ry, half = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
      if (half > 0) g.fillRect(Math.round(rx - half), y, half * 2, 1);
    }
    shadows.set(wd, c); return c;
  }
  // 바닥 무늬 한 장(256 칸, 이음매 없음). 씨앗은 바닥 이름에서 정해 늘 같은 무늬가 나온다.
  function tile(w, ground) {
    claim(w); let c = tiles.get(ground); if (c !== undefined) return c;
    const pal = w.art.palette || {}, base = pal[ground];
    if (!base) { tiles.set(ground, null); return null; }
    const dark = pal[ground + 'Dark'] || base, light = pal[ground + 'Light'] || base;
    c = canvas(TILE, TILE); const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, TILE, TILE);
    let seed = 0; for (const ch of ground) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296 * n) | 0;
    const put = (x, y, wd, ht, col) => { g.fillStyle = col; for (const ox of [0, -TILE]) for (const oy of [0, -TILE]) g.fillRect(x + ox, y + oy, wd, ht); };
    if (ground === 'stone') {
      for (let row = 0; row < TILE / 32; row++) {
        const y = row * 32;
        put(0, y, TILE, 1, dark); put(0, y + 1, TILE, 1, light);
        for (let x = row % 2 ? 16 : 0; x < TILE; x += 32) { put(x, y, 1, 32, dark); put((x + 1) % TILE, y + 1, 1, 31, light); }
      }
      for (let i = 0; i < 500; i++) put(rnd(TILE), rnd(TILE), 1, 1, dark);
      for (let i = 0; i < 300; i++) put(rnd(TILE), rnd(TILE), 1, 1, light);
    } else {
      for (let i = 0; i < 900; i++) put(rnd(TILE), rnd(TILE), 1, 1, dark);
      for (let i = 0; i < 500; i++) put(rnd(TILE), rnd(TILE), 1, 1, light);
      for (let i = 0; i < 70; i++) {
        const x = rnd(TILE), y = rnd(TILE);
        if (ground === 'field') { put(x, y + 1, 1, 2, dark); put(x + 2, y, 1, 3, dark); put(x + 4, y + 1, 1, 2, dark); put(x + 2, y, 1, 1, light); }
        else if (ground === 'hill') { put(x, y, 2, 1, light); put(x, y + 1, 2, 1, dark); }
        else if (ground === 'shore') { put(x, y, 2, 1, light); put(x + 2, y + 1, 2, 1, light); put(x + 4, y, 2, 1, light); }
        else if (ground === 'snow') { put(x, y, 3, 1, dark); if (i % 2) put(x + 5, y, 1, 1, '#ffffff'); }
      }
    }
    tiles.set(ground, c); return c;
  }
  function hash(i, j, s) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2246822519 | 0)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0;
  }

  // Engine state names are isolated here so a later combat merge needs one edit.
  function preparing(o, sv) {
    return o.mode === 'tele' || o.mode === 'prep' || o.prep > 0 || o.tele > 0 || (sv.tele || []).some(t => t.f === o);
  }
  function walkFrame(o, time, count = 4, stride = 5) {
    let state = walks.get(o);
    if (!state) { state = { x: o.x, y: o.y, time, distance: 0, frame: 0 }; walks.set(o, state); return 0; }
    if (state.time === time && state.x === o.x && state.y === o.y) return state.frame;
    const d = Math.hypot(o.x - state.x, o.y - state.y);
    state.x = o.x; state.y = o.y; state.time = time;
    if (d > 64) state.distance = 0;
    else state.distance += d;
    state.frame = d > .001 && d <= 64 ? Math.floor(state.distance / stride) % count : 0;
    return state.frame;
  }
  function commanderFrame(o, sv, spec) {
    const walking = walkFrame(o, sv.t, spec?.walkFrames || 4, spec?.stride || 5);
    return preparing(o, sv) && Number.isInteger(spec?.prepFrame) ? spec.prepFrame : walking;
  }
  function propAt(w, i, j) {
    const sv = w.sv, era = sv.cell?.id, art = w.art?.ui?.battle;
    if (art?.eras?.[era]) return W.propAt(w,i,j);
    const list = art?.eras?.[era], size = list ? 112 : CELL;
    const hs = hash(i, j, sv.era * 7 + sv.loop * 131 + 1);
    if ((hs & 255) >= (list ? 172 : 44)) return null;
    const slot = list ? list[(hs >>> 8) % list.length] : 'prop-' + (PROPS[sv.ground] || PROPS.field)[(hs >>> 8) % (PROPS[sv.ground] || PROPS.field).length];
    const spec = battleSpec(w, slot), inset = list ? 16 : 8, spread = list ? size - 32 : 48;
    const x = i * size + inset + (hs >>> 10) % spread, y = j * size + inset + (hs >>> 20) % spread;
    // Spawn is world origin. Decorations have no collision and never fill this clearing.
    if (list && Math.hypot(x, y) < 100 + (spec?.w || 24) / 2) return null;
    return { slot, x, y, behind: !!spec?.behind, prop: true };
  }

  // 화면 크기가 바뀌거나 늦은 그림이 오면 껍데기가 부른다. 짧은 변이 그림 칸 약 360개가 되게 정수 배(s)를 고른다.
  function layout(w) {
    const v = w.view; if (!v) return;
    hudCache = null;
    const dpr = doc ? Math.min(2, window.devicePixelRatio || 1) : 1, short = w.family?.tuning?.view?.short || 360;
    const s = Math.max(1, Math.round(Math.min(v.w, v.h) * dpr / short));
    const px = w.px || (w.px = { s: 1, dpr: 1, W: 1, H: 1, top: 0, off: null, oc: null, key: null });
    px.s = s; px.dpr = dpr; px.W = Math.max(1, Math.ceil(v.w * dpr / s)); px.H = Math.max(1, Math.ceil(v.h * dpr / s));
    px.top = (v.top || 0) * dpr / s; px.key = null;
    px.whiteWarm = null;
    if (doc) {
      px.off ||= document.createElement('canvas');
      const display = document.querySelector('canvas.gf-canvas');
      if (display && !px.off.isConnected) {
        for (const old of document.querySelectorAll('canvas.sv-battle-layer')) old.remove();
        px.off.className = 'sv-battle-layer'; px.off.setAttribute('aria-hidden', 'true');
        Object.assign(px.off.style, { position: 'fixed', inset: '0', pointerEvents: 'none', imageRendering: 'pixelated', transformOrigin: '0 0' });
        display.before(px.off);
      }
      px.off.style.width = v.w + 'px'; px.off.style.height = v.h + 'px';
      if (px.off.width !== px.W * s) px.off.width = px.W * s;
      if (px.off.height !== px.H * s) px.off.height = px.H * s;
      px.oc = px.off.getContext('2d', { alpha: false, willReadFrequently: true }); px.oc.imageSmoothingEnabled = false;
      // Loaded sprite pixels do not depend on viewport size. Keeping them also
      // preserves prepared hit/arrow pictures when deferred art triggers layout.
      for(const [key,pic]of sprites)if(!pic)sprites.delete(key);
      waits.clear();px.arrowWarm=null;px.opacityWarm=null;
    }
    if (w.sv) W.camera(w);
  }

  // Trim only transparent pixels, once while baking. Position offsets keep every
  // visible pixel in the same place; the live frame copies a much smaller bitmap.
  function trim(c) {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let l=c.width,t=c.height,r=-1,b=-1;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    if(r<0)return {pic:canvas(1,1),x:0,y:0};
    // Retain transparent sampling space at rotated/scaled edges.
    l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(c.width-1,r+2);b=Math.min(c.height-1,b+2);
    const pic=canvas(r-l+1,b-t+1);pic.getContext('2d').drawImage(c,l,t,pic.width,pic.height,0,0,pic.width,pic.height);
    return {pic,x:l,y:t};
  }
  function copyPicture(g, pic, x, y, density) {
    const dx=rd(x+pic.gfPicture.left),dy=rd(y+pic.gfPicture.top);
    if(density===1)g.drawImage(pic,dx,dy);
    else g.drawImage(pic,dx,dy,pic.width/density,pic.height/density);
  }
  function bodyFrame(c, phase, scale, boss, density, stretchX=1.1,stretchY=.9) {
    let bank=bodyPictures.get(c);if(!bank){bank=new Map();bodyPictures.set(c,bank);}
    const key=scale+':'+boss+':'+density+':'+stretchX+':'+stretchY;let set=bank.get(key);if(!set){set=[];bank.set(key,set);}if(set[phase])return set[phase];
    const squash=phase/4/(boss?3:1),sx=scale*(1+(stretchX-1)*squash),sy=scale*(1-(1-stretchY)*squash);
    const width=Math.ceil(c.width*sx*density),height=Math.ceil(c.height*sy*density),pic=canvas(width,height);
    pic.getContext('2d').drawImage(c,0,0,width,height);
    pic.gfPicture={left:-width/2/density,top:-height/density};set[phase]=pic;
    const bytes=pic.width*pic.height*4;bodyBytes+=bytes;bodyQueue.push({set,phase,pic,bytes});
    while(bodyBytes>32*1024*1024){const old=bodyQueue.shift();if(old.set[old.phase]===old.pic)old.set[old.phase]=null;bodyBytes-=old.bytes;}
    return pic;
  }
  function foePicture(g,c,o,x,y,scale=1) {
    if(!(o.squash>0)&&scale===1){g.drawImage(c,rd(x-c.width/2),rd(y-c.height));return;}
    const progress=Math.min(1,(o.squash||0)/(o.squashDuration||.1)),phase=Math.ceil(progress*4),recoil=Math.sin(progress*Math.PI);
    x+=(o.recoilX||0)*recoil;y+=(o.recoilY||0)*recoil;
    const pic=bodyFrame(c,phase,scale,!!o.boss,Q,o.squashX||1.1,o.squashY||.9);
    copyPicture(g,pic,x,y,Q);
  }
  function rotated(c,turn,scale,density,opacity,trail=false) {
    let bank=rotatedPictures.get(c);if(!bank){bank=new Map();rotatedPictures.set(c,bank);}
    const key=scale+':'+density+':'+opacity+':'+trail;let frames=bank.get(key);if(!frames){frames=[];bank.set(key,frames);}
    if(frames[turn])return frames[turn];
    const angle=turn*TURN,co=Math.cos(angle),si=Math.sin(angle),center=trail||(!turn&&scale===1),ox=center?-c.width/2:-(c.width>>1),oy=center?-c.height/2:-(c.height>>1);
    const corners=[[ox,oy],[ox+c.width,oy],[ox,oy+c.height],[ox+c.width,oy+c.height]].map(([x,y])=>[(x*co-y*si)*scale,(x*si+y*co)*scale]);
    const tail=trail?18:0,left=Math.floor(Math.min(...corners.map(p=>p[0]))-Math.max(0,co)*tail)-1,top=Math.floor(Math.min(...corners.map(p=>p[1]))-Math.max(0,si)*tail)-1;
    const right=Math.ceil(Math.max(...corners.map(p=>p[0]))+Math.max(0,-co)*tail)+1,bottom=Math.ceil(Math.max(...corners.map(p=>p[1]))+Math.max(0,-si)*tail)+1;
    const full=scratch((right-left)*density,(bottom-top)*density),pg=full.getContext('2d');
    pg.scale(density,density);pg.translate(-left,-top);pg.rotate(angle);pg.scale(scale,scale);
    if(trail)for(let i=3;i>0;i--){pg.globalAlpha=.28/i;pg.drawImage(c,ox-i*6/scale,oy);}
    pg.globalAlpha=1;pg.drawImage(c,ox,oy);
    // Apply opacity after composing all three ghosts, preserving their overlap.
    if(opacity!==1){pg.setTransform(1,0,0,1,0,0);pg.globalCompositeOperation='destination-in';pg.globalAlpha=opacity;pg.fillStyle='#ffffff';pg.fillRect(0,0,full.width,full.height);}
    const clipped=trim(full),pic=clipped.pic;
    pic.gfPicture={left:left+clipped.x/density,top:top+clipped.y/density};
    pic.gfRot={source:c,angle,scale,density,opacity};
    if(trail)pic.gfArrow={...pic.gfPicture,scale,ghosts:3,density,headLeft:-c.width*scale/2};
    frames[turn]=pic;const bytes=pic.width*pic.height*4;pictureBytes+=bytes;pictureQueue.push({frames,turn,pic,bytes});
    while(pictureBytes>64*1024*1024){const old=pictureQueue.shift();if(old.frames[old.turn]===old.pic)old.frames[old.turn]=null;pictureBytes-=old.bytes;}
    return pic;
  }
  function opacityPicture(c,opacity) {
    let bank=opacityPictures.get(c);if(!bank){bank=new Map();opacityPictures.set(c,bank);}let cached=bank.get(opacity);if(cached)return cached;
    const full=canvas(c.width,c.height),g=full.getContext('2d');g.globalAlpha=opacity;g.drawImage(c,0,0);
    full.gfSource=c;full.gfOpacity=opacity;full.gfCrop={x:0,y:0};
    cached={pic:full,x:0,y:0};if(bank.size>=2)bank.clear();bank.set(opacity,cached);return cached;
  }
  function fixedPicture(g,c,x,y,width,height,opacity) {
    let bank=fixedPictures.get(c);if(!bank){bank=new Map();fixedPictures.set(c,bank);}
    const key=width+':'+height+':'+Q+':'+opacity;let pic=bank.get(key);
    if(!pic){
      pic=canvas(Math.ceil(width*Q),Math.ceil(height*Q));const pg=pic.getContext('2d');pg.globalAlpha=opacity;pg.drawImage(c,0,0,width*Q,height*Q);
      pic.gfFixed={source:c,width,height,opacity,density:Q};pic.gfSource=c;pic.gfOpacity=opacity;
      if(bank.size>=16)bank.clear();bank.set(key,pic);
    }
    const alpha=g.globalAlpha;g.globalAlpha=1;
    if(Q===1)g.drawImage(pic,rd(x),rd(y));else g.drawImage(pic,rd(x),rd(y),pic.width/Q,pic.height/Q);
    g.globalAlpha=alpha;
  }
  // Landing marks have a fixed radius. Rasterize their identical outline once;
  // position, fade and attack timing still come from the live effect.
  function fixedRing(g,x,y,r,color) {
    const half=Math.ceil(r+2),size=half*2*Q,bytes=size*size*4;
    if(bytes>4*1024*1024)return false;
    const key=r+':'+color+':'+Q;let pic=ringPictures.get(key);
    if(!pic){
      pic=canvas(size,size);const pg=pic.getContext('2d');pg.scale(Q,Q);pg.strokeStyle=color;pg.lineWidth=2;
      pg.beginPath();pg.arc(half,half,r,0,Math.PI*2);pg.stroke();
      while(ringPictures.size&&(ringPictures.size>=64||ringBytes+bytes>4*1024*1024)){
        const first=ringPictures.keys().next().value,old=ringPictures.get(first);
        ringBytes-=old.width*old.height*4;ringPictures.delete(first);
      }
      ringPictures.set(key,pic);ringBytes+=bytes;
    }
    if(Q===1)g.drawImage(pic,rd(x)-half,rd(y)-half);
    else g.drawImage(pic,rd(x)-half,rd(y)-half,half*2,half*2);
    return true;
  }
  // Keep the original source bounds, rotation and scale, including edge sampling.
  // Constant attack opacity is prepared once; fading changes only what remains.
  function rot(g,c,x,y,ang=0,scale=1) {
    const angle=Math.round(ang/TURN)*TURN,alpha=g.globalAlpha,baked=alpha<=attackOpacity+1e-6?attackOpacity:1;
    if(!angle&&scale!==1||angle&&(scale===1||scale===1.3)){const turn=((Math.round(angle/TURN)%32)+32)%32,pic=rotated(c,turn,scale,Q,baked);g.globalAlpha=Math.min(1,alpha/baked);copyPicture(g,pic,rd(x),rd(y),Q);g.globalAlpha=alpha;return;}
    const image=baked===1?{pic:c,x:0,y:0}:opacityPicture(c,baked);g.globalAlpha=Math.min(1,alpha/baked);
    if(!angle&&scale===1)g.drawImage(image.pic,rd(x-c.width/2)+image.x,rd(y-c.height/2)+image.y);
    else{g.save();g.translate(rd(x),rd(y));if(angle)g.rotate(angle);if(scale!==1)g.scale(scale,scale);g.drawImage(image.pic,-(c.width>>1)+image.x,-(c.height>>1)+image.y);g.restore();}
    g.globalAlpha=alpha;
  }
  // 동료 효과 그림: 처음 한 번 도트로 그려 두고 복사만 한다(필터·그림자 흐림 없이).
  const allyPics = {};
  function dotRing(w2, h2, color, edge) {
    const c = canvas(w2, h2), g = c.getContext('2d'), rx = w2 / 2 - .5, ry = h2 / 2 - .5;
    g.fillStyle = color;
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const d = Math.hypot((x - rx) / rx, (y - ry) / ry); if (d <= 1 && d > 1 - edge) g.fillRect(x, y, 1, 1); }
    return c;
  }
  function allyPic(name) {
    if (allyPics[name]) return allyPics[name];
    let c;
    if (name === 'shield') { c = dotRing(30, 30, '#bfe6ff', .12); const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(8, 4, 3, 1); g.fillRect(5, 7, 1, 3); }
    else if (name === 'aura') c = dotRing(22, 8, '#ffd23f', .34);
    else if (name === 'stars') { c = canvas(11, 4); const g = c.getContext('2d'); g.fillStyle = '#ffe36b'; for (const x of [1, 8]) { g.fillRect(x, 1, 3, 1); g.fillRect(x + 1, 0, 1, 3); } }
    else if (name.startsWith('fire')) {
      // 불 장판: 타원 안에 주황·노랑 불씨, 두 장이 번갈아.
      const frame = +name.slice(4); c = canvas(40, 20); const g = c.getContext('2d');
      let seed = 7 + frame * 31; const rnd = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296 * n) | 0;
      for (let i = 0; i < 70; i++) {
        const x = rnd(40), y = rnd(20), d = Math.hypot((x - 19.5) / 19.5, (y - 9.5) / 9.5); if (d > 1) continue;
        g.fillStyle = d < .45 ? '#ffe36b' : d < .75 ? '#ff9a2e' : '#c8431e'; g.fillRect(x, y, 2, rnd(3) + 1);
      }
    }
    return allyPics[name] = c;
  }
  // 손맛 2차: 적(28칸)보다 훨씬 작던 탄을 키운다. 보이는 크기만, 맞는 판정은 그대로.
  const SHOT_BIG = { 'shot-arrow': 1.5, 'shot-stone': 1.6 };
  function arrowPicture(g,c,x,y,angle,scale,opacity,enlarge=1.4) {
    const turn=((Math.round(angle/TURN)%32)+32)%32,pic=rotated(c,turn,Math.min(2,scale*enlarge),Q,opacity,true),alpha=g.globalAlpha;
    g.globalAlpha=1;copyPicture(g,pic,rd(x),rd(y),Q);g.globalAlpha=alpha;
  }

  function paint(w) {
    const sv = w.sv, px = w.px, g = px.oc, h = sv.hero, pal = w.art.palette || {}, opacity = S.feedback.read().opacity / 100;
    attackOpacity=opacity;
    const whiteHits = S.feedback.on(w, 'flash');
    warmFoes(w);
    // 낮은 사양은 원래 도트 크기로 그린 뒤 정수 배로 옮긴다. 복사할 화소 수를 줄인다.
    const scale = w.decorLight ? 1 : px.s;
    if (px.off.width !== px.W * scale || px.off.height !== px.H * scale) {
      px.off.width = px.W * scale; px.off.height = px.H * scale; px.key = null;
    }
    const slowA = S.evolution.alpha(w), a = clamp01(slowA ?? w.alpha ?? 1), hx = h.px == null ? h.x : h.px + (h.x - h.px) * a, hy = h.py == null ? h.y : h.py + (h.y - h.py) * a;
    const cam = px.cam || (px.cam = { x: 0, y: 0 });
    Q = scale; cam.x = rd(hx - px.W / 2); cam.y = rd(hy - (px.top + (px.H - px.top) / 2));
    warmArrows(w);warmOpacity(w);
    const key = sv.t + ':' + cam.x + ':' + cam.y + ':' + (slowA ?? '');
    if (px.key === key) return;
    missing = false;
    g.setTransform(Q, 0, 0, Q, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    const PW = px.W, PH = px.H, vis = (x, y, m) => x > -m && y > -m && x < PW + m && y < PH + m;

    // 바닥
    const t = tile(w, sv.ground);
    if (t) {
      const ox = -(((cam.x % TILE) + TILE) % TILE), oy = -(((cam.y % TILE) + TILE) % TILE);
      for (let y = oy; y < PH; y += TILE) for (let x = ox; x < PW; x += TILE) g.drawImage(t, rd(x), rd(y));
    } else { g.fillStyle = pal[sv.ground] || pal.field || '#828455'; g.fillRect(0, 0, PW, PH); }

    // Large era landmarks stay behind every actor, even when their base is lower.
    const propSize = w.art?.ui?.battle?.eras?.[sv.cell?.id] ? 112 : CELL;
    bodies.length = 0; let pi = 0;
    const i0 = Math.floor(cam.x / propSize) - 1, i1 = Math.floor((cam.x + PW) / propSize) + 1;
    const j0 = Math.floor(cam.y / propSize) - 1, j1 = Math.floor((cam.y + PH) / propSize) + 2;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const placed = propAt(w, i, j); if (!placed) continue;
      const p = propPool[pi] || (propPool[pi] = {}); pi++; Object.assign(p, placed);
      if (p.behind) { const c = sprite(w, p.slot); if (c) g.drawImage(c, rd(p.x - cam.x - c.width / 2), rd(p.y - cam.y - c.height + 1)); }
      else bodies.push(p);
    }

    // 덫(끝나기 1초 전부터 깜빡)
    for (const tr of sv.traps) {
      const X = tr.x - cam.x, Y = tr.y - cam.y; if (!vis(X, Y, 16)) continue;
      if (tr.life - tr.t < 1 && ((sv.t * 8) | 0) % 2) continue;
      g.globalAlpha = opacity;
      const c = sprite(w, tr.slot, tr.mine && !S.evolution.visual(w, tr.source) ? 'r' : ''); if (c) rot(g, c, X, Y, 0, tr.scale || 1);
    }
    // 동료의 불 장판(끝나기 0.4초 전부터 옅게)과 덫(마름쇠 그림, 끝나기 1초 전부터 깜빡)
    const A = sv.ally;
    if (A) {
      for (const p of A.steles) {
        const X = p.x - cam.x, Y = p.y - cam.y; if (!vis(X, Y, p.r + 24)) continue;
        g.globalAlpha = opacity * Math.min(1, Math.max(0, p.until - sv.t) / .4);
        const c = p.slot && sprite(w, p.slot);
        if (c) g.drawImage(c, rd(X - c.width / 2), rd(Y - c.height));
        else { g.strokeStyle = p.fort ? '#d9b27a' : '#bfe6ff'; g.lineWidth = 2; g.beginPath(); g.arc(rd(X), rd(Y), p.r, 0, Math.PI * 2); g.stroke(); }
      }
      for (const p of A.fires) {
        const X = p.x - cam.x, Y = p.y - cam.y; if (!vis(X, Y, 40)) continue;
        const fs = S.allies.fx(w, 'fire'), flick = ((sv.t * 8) | 0) % 2;
        g.globalAlpha = opacity * Math.min(1, (p.life - p.t) / .4) * .9;
        if (fs) { const c = sprite(w, fs, flick ? 'f' : ''); if (c) { const wd = rd(p.r * 2), ht = rd(p.r * 2 * c.height / c.width); g.drawImage(c, rd(X - wd / 2), rd(Y - ht * .7), wd, ht); } }
        else { const c = allyPic('fire' + flick), k = p.r / 20; g.drawImage(c, rd(X - p.r), rd(Y - p.r / 2), rd(40 * k), rd(20 * k)); }
      }
      const c = sprite(w, S.allies.fx(w, 'trap') || 'shot-trap');
      if (c) for (const t of A.traps) {
        const X = t.x - cam.x, Y = t.y - cam.y; if (!vis(X, Y, 16)) continue;
        if (t.life - t.t < 1 && ((sv.t * 8) | 0) % 2) continue;
        g.globalAlpha = opacity; g.drawImage(c, rd(X - c.width / 2), rd(Y - c.height / 2));
      }
    }
    g.globalAlpha = 1;
    // 구슬
    for (const gm of sv.gems) {
      if (gm.flight || gm.collection?.skipped) continue;
      const X = gm.x - cam.x, Y = gm.y - cam.y; if (!vis(X, Y, 12)) continue;
      const c = sprite(w, 'gem-' + gm.tier); if (c) g.drawImage(c, rd(X - c.width / 2), rd(Y - c.height));
    }
    for (const p of sv.flights) {
      if (p.collection?.skipped) continue;
      const t=Math.min(1,p.t/p.life),k=t<.15?-.06*Math.sin(t/.15*Math.PI):((t-.15)/.85)**2;
      const X=p.x+(hx-p.x)*k-cam.x,Y=p.y+(hy-p.y)*k-cam.y,c=sprite(w,p.type==='coin'?'coin':'gem-'+p.tier);
      if(c)g.drawImage(c,rd(X-c.width/2),rd(Y-c.height));
    }
    // 줍는 것(상자와 두루마리는 들썩이고 반짝인다)
    for (const it of sv.items) {
      const X = it.x - cam.x, Y = it.y - cam.y; if (!vis(X, Y, 24)) continue;
      const c = sprite(w, it.type === 'chest' ? S.evolution.chest(w) || it.type : it.type); if (!c) continue;
      const sw = ITEM_SHADOW[it.type];
      if (sw) { const sh = shadow(w, sw); g.drawImage(sh, rd(X - sw / 2), rd(Y - sh.height / 2)); }
      const big = it.type === 'chest' || it.type === 'scroll', bob = big ? rd(Math.sin(sv.t * 4 + it.x * .1) * 1.5) - 1 : 0;
      const x0 = rd(X - c.width / 2), y0 = rd(Y - c.height) + bob;
      g.drawImage(c, x0, y0);
      if (big && (sv.t + (it.x & 7) * .13) % 1 < .25) { const sp = sprite(w, 'fx-spark'); if (sp) g.drawImage(sp, x0 + c.width - 4, y0 - 4); }
    }

    g.globalAlpha = opacity;
    // 발사체
    for (const s of sv.shots) {
      if (s.rain && s.t < s.dropAt) continue;
      const X = (slowA != null && s.evoX != null ? s.evoX + (s.x - s.evoX) * a : s.x) - cam.x, Y = (slowA != null && s.evoY != null ? s.evoY + (s.y - s.evoY) * a : s.y) - cam.y; if (!vis(X, Y, 48)) continue;
      const wave = s.wave || s.slot === 'shot-wave', c = sprite(w, s.slot, (s.upright || wave) && s.vx < 0 ? 'f' : ''); if (!c) continue;
      const arrow = s.source === 'gakgung' || s.source === 'pyeonjeon';
      if (arrow) { arrowPicture(g,c,X,Y-LIFT,s.ang,s.scale||1,opacity);continue; }
      if (s.source === 'goldblade' || s.source === 'marksman') { arrowPicture(g,c,X,Y-LIFT,s.ang,s.scale||1,opacity,1);continue; }
      const big = SHOT_BIG[s.slot] || 1, sc = Math.min(S.evolution.visual(w, s.source) ? 2 : Infinity, (s.scale || 1) * big);
      if (big > 1 && !s.lob && !sv.lightFx && sv.shots.length < 60) {
        const v = Math.hypot(s.vx || 0, s.vy || 0);
        if (v > 1) for (let i = 1; i <= 2; i++) { g.globalAlpha = opacity * (i === 1 ? .4 : .18); rot(g, c, X - s.vx / v * 7 * i, Y - LIFT - s.vy / v * 7 * i, s.ang, sc * (1 - .12 * i)); }
        g.globalAlpha = opacity;
      }
      if (s.rain) rot(g, c, X, Y - LIFT - (s.z || 0), s.ang, sc);
      else if (s.lob) { const sh = shadow(w, 8), z = slowA != null && s.evoZ != null ? s.evoZ + ((s.z || 0) - s.evoZ) * a : s.z || 0; g.drawImage(sh, rd(X - 4), rd(Y - sh.height / 2)); rot(g, c, X, Y - LIFT - z, s.ang, sc); }
      else if (s.upright) rot(g, c, X, Y - c.height * sc / 2, 0, sc);
      else if (wave) rot(g, c, X, Y - LIFT, 0, sc);
      else rot(g, c, X, Y - LIFT, s.ang, sc);
    }

    // 효과
    for (const e of sv.fx) {
      const k = clamp01(e.t / (e.life || 1)), fade = k > .6 ? (1 - k) / .4 : 1;
      const drift = e.kind === 'smoke' ? e.t : 0;
      const x = (e.follow ? hx + (e.ox || 0) : e.x + (e.vx || 0) * drift) - cam.x, y = (e.follow ? hy + (e.oy || 0) : e.y + (e.vy || 0) * drift) - cam.y;
      if (e.kind !== 'flood' && !vis(x, y, 160)) continue;
      switch (e.kind) {
        case 'chip': {
          g.globalAlpha = opacity * (1 - k); g.fillStyle = e.color;
          g.fillRect(rd(x + e.vx * e.t), rd(y + e.vy * e.t + 140 * e.t * e.t), 2, 2); g.globalAlpha = opacity * (1); break;
        }
        case 'smoke': case 'dust': {
          const m = Math.max(1, Math.round(e.size || 1)), c = sprite(w, 'fx-smoke-' + Math.min(2, (k * 3) | 0)); if (!c) break;
          const sz = 16 * (e.size || 1), rise = e.kind === 'smoke' ? k * 8 : 4;
          fixedPicture(g,c,x-sz/2,y-sz/2-rise,sz,sz,opacity*(e.kind==='dust'?.8:1));break;
        }
        case 'boom': {
          const m = Math.max(1, Math.round(e.size || 1)), c = sprite(w, 'fx-boom-' + (k < .5 ? 0 : 1)); if (!c) break;
          const sz = 32 * (e.size || 1);fixedPicture(g,c,x-sz/2,y-LIFT/2-sz/2,sz,sz,opacity);break;
        }
        case 'shard': {
          // 맞은 방향으로 튀는 불티: 2칸 머리와 1칸 꼬리
          const v = Math.hypot(e.vx, e.vy) || 1, px2 = x + e.vx * e.t, py2 = y + e.vy * e.t - LIFT / 2;
          g.globalAlpha = opacity * (1 - k); g.fillStyle = k < .5 ? '#fffbe0' : '#ffc14a';
          g.fillRect(rd(px2), rd(py2), 2, 2); g.fillRect(rd(px2 - e.vx / v * 3), rd(py2 - e.vy / v * 3), 1, 1);
          g.globalAlpha = opacity; break;
        }
        case 'piece': {
          // 쓰러진 적이 통째로 돌며 튕겨 날아갔다 떨어진다(아이들 게임이라 조각내지 않는다)
          const c = sprite(w, e.slot, e.flip ? 'f' : ''); if (!c) break;
          const sc = e.scale || 1, px2 = x + e.vx * e.t, py2 = y + e.vy * e.t + 260 * e.t * e.t;
          g.globalAlpha = opacity * fade; g.save(); g.translate(rd(px2), rd(py2)); g.rotate(e.spin * e.t);
          g.drawImage(c, -c.width * sc / 2, -c.height * sc / 2, c.width * sc, c.height * sc); g.restore(); g.globalAlpha = opacity; break;
        }
        case 'spark': {
          const c = sprite(w, 'fx-spark'); if (!c) break;
          g.globalAlpha = opacity * (1 - k); g.drawImage(c, rd(x - c.width / 2), rd(y - LIFT - c.height / 2)); g.globalAlpha = opacity * (1); break;
        }
        case 'heal': {
          g.globalAlpha = opacity * (1 - k); g.fillStyle = '#5fd36a';
          for (let i = 0; i < 3; i++) {
            const cx = rd(x + (i - 1) * 6), cy = rd(y - k * 10 - (i === 1 ? 3 : 0));
            g.fillRect(cx - 1, cy - 3, 2, 6); g.fillRect(cx - 3, cy - 1, 6, 2);
          }
          g.globalAlpha = opacity * (1); break;
        }
        case 'evo-beam': {
          const c = sprite(w, e.slot); if (!c) break;
          g.save(); g.globalAlpha = opacity * fade; g.translate(rd(x), rd(y - LIFT)); g.rotate(e.ang || 0);
          // Repeat arrows/bullets along the hit line instead of stretching pixels.
          const sc = Math.min(1, e.width / c.height, e.length / c.width), width = c.width * sc, height = c.height * sc;
          for (let at = 0; at < e.length; at += width) {
            const part = Math.min(width, e.length - at);
            g.drawImage(c, 0, 0, part / sc, c.height, at, -height / 2, part, height);
          }
          g.restore(); break;
        }
        case 'img': {
          const c = sprite(w, e.slot, e.flip ? 'f' : ''); if (!c) break;
          const a = (e.ang || 0) + (e.turn || 0) * k, sl = (e.slide || 0) * k;
          const sc = Math.min(e.evo || e.slot?.startsWith('evo-') ? 2 : Infinity, (e.scale || 1) * (e.grow ? .55 + .6 * k : 1));
          g.globalAlpha = opacity * (fade); rot(g, c, x + Math.cos(a) * sl, y - (e.lift ?? LIFT) + Math.sin(a) * sl, a, sc); g.globalAlpha = opacity * (1); break;
        }
        case 'spin': {
          const c = sprite(w, e.slot || 'shot-swing'); if (!c) break;
          const sc = (e.r || 40) * 2 / c.width;
          g.globalAlpha = opacity * (fade); for (let i = 0; i < 2; i++) rot(g, c, x, y - 6, sv.t * 14 + i * Math.PI, sc); g.globalAlpha = opacity * (1); break;
        }
        case 'ring': {
          g.globalAlpha = opacity * (1 - k); g.strokeStyle = e.color || '#ffffff'; g.lineWidth = 2;
          if(!e.fixed||!fixedRing(g,x,y-6,e.r||30,e.color||'#ffffff')){
            g.beginPath();g.arc(rd(x),rd(y-6),(e.r||30)*(e.fixed?1:e.shrink?1-.85*k:.55+.45*k),0,Math.PI*2);g.stroke();
          }
          g.globalAlpha = opacity; break;
        }
        case 'bolt': {
          let s = ((e.seed || 0) * 4294967296) >>> 0, bx = x;
          for (let i = 0; i < 8; i++) {
            bolt[i * 2] = i === 7 ? x : bx; bolt[i * 2 + 1] = y - 140 + i * 20;
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0; bx += (s / 4294967296 - .5) * 18;
          }
          g.globalAlpha = opacity * (1 - k * .5); g.lineJoin = 'miter';
          for (const [col, lw] of [['#ffd23f', 3], ['#ffffff', 1]]) {
            g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(bolt[0], bolt[1]);
            for (let i = 2; i < 16; i += 2) g.lineTo(bolt[i], bolt[i + 1]);
            g.stroke();
          }
          g.globalAlpha = opacity * (1); break;
        }
        case 'pillar': {
          // 레벨업 빛기둥: 주인공 발밑에서 위로 솟는 밝은 기둥, 가운데가 더 밝다
          const hgt = rd(120 * Math.min(1, k * 3)), a = 1 - k;
          g.globalAlpha = opacity * (.35 * a); g.fillStyle = '#ffe9a0'; g.fillRect(rd(x - 12), rd(y - hgt), 24, hgt);
          g.globalAlpha = opacity * (.7 * a); g.fillStyle = '#ffffff'; g.fillRect(rd(x - 4), rd(y - hgt), 8, hgt);
          g.globalAlpha = opacity * (1); break;
        }
        case 'evo-flood': {
          const c = sprite(w, e.slot); if (!c) break;
          g.globalAlpha = opacity * (.8 * fade);
          const sc = Math.min(2, e.scale || 1), wx = -c.width + (PW + c.width * 2) * k;
          for (let i = 0; i < 3; i++) rot(g, c, wx - i * 24, px.top + (PH - px.top) * (i + .5) / 3, 0, sc);
          g.globalAlpha = opacity * (1); break;
        }
        case 'flood': {
          g.globalAlpha = opacity * (.28 * (1 - k)); g.fillStyle = '#3a7bd5'; g.fillRect(0, 0, PW, PH);
          const wy = rd(PH * (1 - k)); g.globalAlpha = opacity * (1 - k); g.fillStyle = '#e8f4ff';
          for (let X = 0; X < PW; X += 6) g.fillRect(X, wy + rd(Math.sin(X * .15 + sv.t * 12) * 2), 3, 1);
          g.globalAlpha = opacity * (1); break;
        }
      }
    }

    for (const o of sv.orbs) { const c = sprite(w, o.slot, o.flip ? 'f' : ''); if (c) rot(g, c, o.x - cam.x, o.y - cam.y - LIFT / 2, 0, o.scale || 1); }
    g.globalAlpha = 1;

    // 몸: 장식, 주인공, 동료, 적, 배를 발 높이(y) 차례로
    for (const b of sv.allyBodies) { bodies.push(b); if (b.twin) bodies.push(b.twin); for (const o of b.onlyTwins || []) bodies.push(o); }
    // 곽재우 붉은 옷 분신(그림 fx-only-clones가 오기 전까지 동료 분신 모습).
    for (const o of sv.ally?.clones || []) if (!o.slot) bodies.push(o);
    for (const f of sv.foes) if (!f.dead && vis(f.x - cam.x, f.y - cam.y, 80)) bodies.push(f);
    for (const o of bodies) {
      if (o.prop) continue;
      if (w.decorLight && o.def && !o.boss) continue;
      const sw = o === h ? 16 : o.def ? (o.boss ? 48 : o.kind === 'elite' ? 36 : battleSpec(w, `foe-${o.sprite}-a`)?.shadow || 18) : o.slot ? 32 : 16, sh = shadow(w, sw);
      const ox = o === h ? hx : slowA != null && o.evoX != null ? o.evoX + (o.x - o.evoX) * a : o.x, oy = o === h ? hy : slowA != null && o.evoY != null ? o.evoY + (o.y - o.evoY) * a : o.y;
      g.drawImage(sh, rd(ox - cam.x - sw / 2), rd(oy - cam.y - sh.height / 2));
      if (o.awake) { const au = allyPic('aura'); g.globalAlpha = .55 + .35 * Math.sin(sv.t * 6); g.drawImage(au, rd(ox - cam.x - 11), rd(oy - cam.y - 4)); g.globalAlpha = 1; }
    }
    bodies.sort(byY);
    for (const o of bodies) {
      const X = rd((o === h ? hx : slowA != null && o.evoX != null ? o.evoX + (o.x - o.evoX) * a : o.x) - cam.x), Y = rd((o === h ? hy : slowA != null && o.evoY != null ? o.evoY + (o.y - o.evoY) * a : o.y) - cam.y);
      if (o.prop) { const c = sprite(w, o.slot); if (c) g.drawImage(c, X - (c.width >> 1), Y - c.height); continue; }
      if (o === h) {
        // 맞은 뒤 무적일 때만 깜빡인다. 검수실·시험의 「죽지 않음」(invuln 1e9)은 깜빡이지 않는다.
        if (h.invuln > 0 && h.invuln < 1e8 && !(h.hurt > 0) && ((sv.t / .1) | 0) % 2) continue;
        const variant = (h.hurt > 0 ? 'r' : '') + (h.faceX < 0 ? 'f' : '');
        const c = sprite(w, `person-${h.person}-${h.moving && ((h.anim / .18) | 0) % 2 ? 'b' : 'a'}`, variant);
        if (c) personPicture(g, w, `person-${h.person}-${h.moving && ((h.anim / .18) | 0) % 2 ? 'b' : 'a'}`, c, X, Y - hop(h.moving, h.anim), h.faceX < 0);
        continue;
      }
      if (o.def) {
        const white = whiteHits && o.flash > 0 && sv.feelClock < (o.whiteUntil ?? 0);
        if (o.boss) {
          const v = (white ? 'w' : o.kind === 'elite' ? 'y' : '') + (o.faceX < 0 ? 'f' : '');
          const slot = 'boss-' + o.sprite, spec = battleSpec(w, slot), frame = spec ? commanderFrame(o, sv, spec) : 0;
          const c = sprite(w, slot, v, frame); if (c) foePicture(g, c, o, X, Y + (spec ? 1 : 4), spec?.displayScale || 1); continue;
        }
        const bank = foeFrame(w, o, sv.t, white), c = bank.picture; if (!c) continue;
        const up = w.decorLight ? 0 : hop(true, sv.t + o.phase, o.kind === 'elite' ? 2 : 1);
        foePicture(g, c, o, X, Y + bank.bottom - up, o.kind === 'elite' ? 2 : 1);
        if (o.stunUntil > sv.t && !sv.lightFx) { const st = allyPic('stars'); g.drawImage(st, rd(X - 5 + Math.sin(sv.t * 9) * 2), rd(Y - bank.height * (o.kind === 'elite' ? 2 : 1) - 3)); }
        continue;
      }
      if (o.slot) { const c = sprite(w, o.slot, o.flip ? 'f' : ''); if (c) rot(g, c, X, Y - LIFT / 2, 0, o.scale || 1); continue; }
      const c = sprite(w, `person-${o.person}-${o.moving && ((o.anim / .18) | 0) % 2 ? 'b' : 'a'}`, (o.twin ? 'y' : '') + (o.faceX < 0 ? 'f' : ''));
      if (c) personPicture(g, w, `person-${o.person}-${o.moving && ((o.anim / .18) | 0) % 2 ? 'b' : 'a'}`, c, X, Y - (o.act > 0 ? 2 : 0) - hop(o.moving, o.anim), o.faceX < 0, true);
    }

    for (const d of sv.deaths) if (d.t < .15) {
      const o = d.foe, slot = o.boss ? 'boss-' + o.sprite : 'foe-' + o.sprite + '-a';
      const c = sprite(w, slot, o.faceX < 0 ? 'f' : ''); if (!c) continue;
      const k = d.t / .15, scale = o.kind === 'elite' ? 2 : 1, sx = scale * (1 + k * .4), sy = scale * (1 - k * .85);
      g.drawImage(c, rd(d.x - cam.x - c.width * sx / 2), rd(d.y - cam.y - c.height * sy), c.width * sx, c.height * sy);
    }

    // 장수 예고: 돌진은 붉은 띠, 땅 울림은 붉은 원. 시간이 갈수록 진해진다.
    for (const t of sv.tele || []) {
      const X = t.x - cam.x, Y = t.y - cam.y, k = clamp01(t.t / (t.life || 1));
      g.globalAlpha = .18 + .32 * k; g.fillStyle = '#e23b2e'; g.strokeStyle = '#ff6b5c'; g.lineWidth = 2;
      if (t.kind === 'line') { const half = t.width != null ? t.width / 2 : (t.f?.r || 24) + W.HERO_R; g.save(); g.translate(rd(X), rd(Y)); g.rotate(t.ang); g.fillRect(0, -half, t.len * k, half * 2); g.globalAlpha = .7; g.strokeRect(0, -half, t.len, half * 2); g.restore(); }
      else if (t.kind === 'fan') { g.beginPath(); g.moveTo(rd(X), rd(Y)); g.arc(rd(X), rd(Y), t.r, t.ang - t.spread, t.ang + t.spread); g.closePath(); g.fill(); g.globalAlpha = .8; g.stroke(); }
      else { g.beginPath(); g.arc(rd(X), rd(Y), t.r * k, 0, Math.PI * 2); g.fill(); g.globalAlpha = .7; g.beginPath(); g.arc(rd(X), rd(Y), t.r, 0, Math.PI * 2); g.stroke(); }
      g.globalAlpha = 1;
    }

    // 적 화살(붉은 빛깔로 우리 화살과 구별)
    for (const s of sv.foeShots || []) {
      const X = s.x - cam.x, Y = s.y - cam.y; if (!vis(X, Y, 24)) continue;
      const c = sprite(w, s.slot || 'shot-arrow', 'r'); if (c) rot(g, c, X, Y, s.ang);
      else { g.strokeStyle = '#e23b2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y); g.lineTo(X - Math.cos(s.ang) * 10, Y - Math.sin(s.ang) * 10); g.stroke(); }
    }

    // The hero stays above every attack and warning.
    if (!(h.invuln > 0 && h.invuln < 1e8 && !(h.hurt > 0) && ((sv.t / .1) | 0) % 2)) {
      const variant=(h.hurt > 0 ? 'r' : '')+(h.faceX < 0 ? 'f' : '');
      const mount=sv.kit.weapons.some(own=>own.evo==='horseflail')&&sprite(w,'shot-evo-horseflail-mount',variant);
      if(mount)g.drawImage(mount,rd(hx-cam.x-(mount.width>>1)),rd(hy-cam.y-mount.height-hop(h.moving,h.anim)));
      else {
        const c = sprite(w, `person-${h.person}-${h.moving && ((h.anim / .18) | 0) % 2 ? 'b' : 'a'}`, variant);
        if (c) personPicture(g, w, `person-${h.person}-${h.moving && ((h.anim / .18) | 0) % 2 ? 'b' : 'a'}`, c, rd(hx - cam.x), hy - cam.y - hop(h.moving, h.anim), h.faceX < 0);
      }
    }
    // 동료 보호막(방패·음식): 주인공을 감싼 도트 고리
    if (A && (A.guard.up || A.food.until > sv.t)) {
      const ss = S.allies.fx(w, 'shield'), sc = ss && sprite(w, ss), rings = A.guard.up && A.guard.layers > 1 ? 2 : 1;
      g.globalAlpha = .7 + .25 * Math.sin(sv.t * 5);
      for (let i = 0; i < rings; i++) {
        const extra = i * 5;
        if (sc) g.drawImage(sc, rd(hx - cam.x - 16 - extra), rd(hy - cam.y - 30 - extra), 32 + extra * 2, 32 + extra * 2);
        else g.drawImage(allyPic('shield'), rd(hx - cam.x - 15 - extra), rd(hy - cam.y - 29 - extra), 30 + extra * 2, 30 + extra * 2);
      }
      g.globalAlpha = 1;
    }
    // 주인공 체력 막대
    const HX = rd(hx - cam.x), HY = rd(hy - cam.y);
    g.fillStyle = pal.ink || INK; g.fillRect(HX - 10, HY + 3, 20, 3);
    g.fillStyle = pal.hp || '#d65858'; g.fillRect(HX - 9, HY + 4, Math.round(18 * clamp01(h.hp / h.hpMax)), 1);

    px.key = missing ? null : key;
  }

  function blit(w, g) {
    const px = w.px;
    // 브라우저가 전장 층을 합성하게 하면 매 프레임 큰 캔버스를 복사할 필요가 없다.
    if (px.off.isConnected) {
      const m = g.getTransform(), d = px.dpr, transform = `matrix(${m.a / d},${m.b / d},${m.c / d},${m.d / d},${m.e / d},${m.f / d})`;
      if (px.layerTransform !== transform) { px.layerTransform = transform; px.off.style.transform = transform; }
      return;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(px.off, 0, 0, px.W * px.s / px.dpr, px.H * px.s / px.dpr);
  }

  function label(g, str, x, y, size, color, outline = INK, align = 'center', bold = false) {
    g.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = Math.max(2, Math.round(size / 5)); g.strokeStyle = outline; g.strokeText(str, x, y);
    g.fillStyle = color; g.fillText(str, x, y);
  }
  function fontsOk() {
    if (!fontReady) try { fontReady = !document.fonts || document.fonts.check('12px DoHyeon'); } catch { fontReady = true; }
    return fontReady;
  }
  // 피해 숫자는 기기 화소로 한 번 구워 두고 옮겨 그린다.
  function numPic(v, size, big, dpr) {
    const key = v + ':' + size + ':' + (big ? 1 : 0) + ':' + dpr; let c = numPics.get(key); if (c) return c;
    meter ||= document.createElement('canvas').getContext('2d');
    meter.font = `${size}px ${FONT}`;
    const text = String(v), cw = Math.ceil(meter.measureText(text).width + size * .6), ch = Math.ceil(size * 1.5);
    const width=Math.ceil(cw*dpr),height=Math.ceil(ch*dpr);
    // A page shares one immutable glyph region across all simultaneous numbers.
    // Small pages bound the upload when a new value is first added. Oversized
    // glyphs retain the existing direct-text fallback instead of allocating more.
    if(width>508||height>252)return null;
    let p=numberPage;
    if(p&&p.x+width+2>512){p.x=2;p.y+=p.row+2;p.row=0;}
    if(!p||p.y+height+2>256){
      // Reuse at most sixteen half-megabyte pages. Evict only the page being
      // reused, so varied evolved damage never discards every cached number.
      numberCursor=(numberCursor+1)%16;p=numberPages[numberCursor];
      if(p){
        for(const old of p.keys)numPics.delete(old);p.keys.length=0;
        p.g.setTransform(1,0,0,1,0,0);p.g.clearRect(0,0,512,256);
        p.x=2;p.y=2;p.row=0;
      }else{
        const sheet=document.createElement('canvas');sheet.width=512;sheet.height=256;sheet.gfNumbers=true;
        p=numberPages[numberCursor]={sheet,g:sheet.getContext('2d'),x:2,y:2,row:0,keys:[]};
      }
      numberPage=p;
    }
    const g=p.g;g.setTransform(dpr,0,0,dpr,p.x,p.y);label(g,text,cw/2,ch/2,size,big?'#ffd23f':'#ffffff');
    c={sheet:p.sheet,x:p.x,y:p.y,width,height,cssW:cw,cssH:ch};p.x+=width+2;p.row=Math.max(p.row,height);
    p.keys.push(key);numPics.set(key, c); return c;
  }

  // 위쪽 표시줄 칸(CSS px). 껍데기 칩 대신 이 틀이 한 벌로 그린다(엔진 cfg.ownHUD). 엔진의 effectLabels도 이것을 쓴다.
  // 맨 위: 레벨 배지 + 경험치 막대(껍데기 ✕·소리 단추 자리 v.controls는 비운다) · 가운데: 큰 시계와 막 이름표
  // 왼쪽: 무기 칸(가질 수 있는 수만큼, 빈 칸도) 아래 유물·동료 칸 · 오른쪽: 하트와 점수 · 보스가 있으면 시계 아래 보스 막대.
  // 좁은 화면(폰 세로)은 시계 줄 아래로 무기 칸과 하트를 내린다.
  function hudRects(w) {
    const v = w.view, sv = w.sv; if (!v || !sv) return null;
    const L = w.family?.tuning?.level || {}, top = v.top || 0, ctl = v.controls || 0;
    const u = Math.max(.9, Math.min(1.3, v.w / 1000, v.h / 700)), pad = Math.round(10 * u), gap = Math.max(6, Math.round(6 * u)), rowGap = Math.max(8, Math.round(8 * u));
    const badge = 40, barH = Math.round(24 * u);
    const lv = { x: pad, y: top + pad, w: badge, h: badge };
    const xpX = pad + Math.round(badge * .6), xp = { x: xpX, y: lv.y + Math.round((badge - barH) / 2), w: Math.max(80, v.w - ctl - pad - xpX), h: barH };
    const row1 = lv.y + badge + rowGap;
    const s1 = Math.round(40 * u), wN = Math.max(sv.kit.weapons.length, L.weaponsMax || 6);
    const small = sv.kit.relics.length + sv.kit.allies.length, weaponsW = wN * s1 + (wN - 1) * gap;
    const general = sv.play !== 'endless' && sv.bossOn?.some(o => o.def.role === 'general');
    const clockW = Math.round(180 * u), clock = { x: Math.round((v.w - clockW) / 2), y: row1, w: clockW, h: Math.round((general ? 34 : 66) * u) };
    const narrow = pad + weaponsW + gap * 3 > clock.x;
    const s2 = Math.max(26, Math.ceil(s1 * .9)), lowY = narrow ? clock.y + clock.h + rowGap : row1;
    const heart = Math.round(24 * u), rightW = Math.round((narrow ? 145 : 170) * u);
    const right = { x: v.w - pad - rightW, y: narrow ? lowY : Math.max(row1, top + (v.pill || 0) + Math.round(4 * u)), w: rightW, h: heart + gap + Math.round(26 * u), heart };
    // 하트와 시계 앞에서 줄을 바꾼다. 칸 수와 그림 크기는 그대로 둔다.
    const space = Math.max(s1, (narrow ? right.x : clock.x) - pad - gap);
    const wCols = Math.min(wN, Math.max(1, Math.floor((space + gap) / (s1 + gap))));
    const sCols = Math.max(1, Math.floor((space + gap) / (s2 + gap)));
    const wRows = Math.ceil(wN / wCols), sRows = Math.ceil(small / sCols), wStep=s1+gap+14, smallY = wRows * wStep;
    const smallW = Math.min(small, sCols) * (s2 + gap) - (small ? gap : 0);
    const icons = { x: pad, y: lowY, w: Math.max(wCols * (s1 + gap) - gap, smallW),
      h: wRows * wStep - gap + (small ? sRows * (s2 + gap) : 0), s1, s2, gap, wN, wCols, sCols, smallY, wStep };
    const bs = sv.boss && !sv.boss.dead ? sv.boss : null, bw = Math.min(Math.round(460 * u), v.w - pad * 2);
    const bossY = (narrow ? Math.max(icons.y + icons.h, right.y + right.h) : clock.y + clock.h) + rowGap;
    const nameH = Math.max(26, Math.round(28 * u)), bossBarH = Math.round(28 * u);
    const boss = bs ? { x: Math.round((v.w - bw) / 2), y: bossY, w: bw, h: nameH + gap + bossBarH, nameH, barH: bossBarH } : null;
    const bottom = Math.max(icons.y + icons.h, right.y + right.h, clock.y + clock.h, boss ? boss.y + boss.h : 0);
    return { u, pad, gap, rowGap, lv, xp, clock, icons, right, boss, stage: clock, bottom };
  }

  // 도트 틀: 모서리를 한 칸 깎은 테두리, 안쪽 바탕, 윗변 밝은 줄
  function frame(g, x, y, w, h, fill, edge = INK, t = 2, lite = 'rgba(255,255,255,.18)') {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    g.fillStyle = edge; g.fillRect(x + t, y, w - 2 * t, h); g.fillRect(x, y + t, w, h - 2 * t);
    g.fillStyle = fill; g.fillRect(x + t, y + t, w - 2 * t, h - 2 * t);
    if (lite) { g.fillStyle = lite; g.fillRect(x + t, y + t, w - 2 * t, t); }
  }
  // 채운 막대: 바탕 위에 색, 위 1/3은 밝게, 아래 한 줄은 어둡게
  function fillBar(g, x, y, w, h, k, col, hi, lo) {
    const fw = Math.round(w * clamp01(k)); if (fw <= 0) return;
    g.fillStyle = col; g.fillRect(x, y, fw, h);
    g.fillStyle = hi; g.fillRect(x, y, fw, Math.max(1, Math.round(h / 3)));
    g.fillStyle = lo; g.fillRect(x, y + h - Math.max(1, Math.round(h / 6)), fw, Math.max(1, Math.round(h / 6)));
  }
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  // 도트 하트(7×6칸): 먹선 테두리, 빨강(빈 하트는 어두운 회색), 왼쪽 위 흰 점
  function heartPic(g, x, y, size, full) {
    const p = Math.max(2, Math.floor(size / 8)), on = (i, j) => HEART[j]?.[i] === 'X';
    g.fillStyle = INK;
    for (let j = -1; j <= 6; j++) for (let i = -1; i <= 7; i++) if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) g.fillRect(x + (i + 1) * p, y + (j + 1) * p, p, p);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 7; i++) if (on(i, j)) { g.fillStyle = full ? (j >= 3 ? '#c8333a' : '#ee4b4b') : '#4a4f63'; g.fillRect(x + (i + 1) * p, y + (j + 1) * p, p, p); }
    if (full) { g.fillStyle = '#ffd6d6'; g.fillRect(x + 2 * p, y + 2 * p, p, p); }
    return 9 * p;
  }
  const clockText = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function hudArt(w, name) {
    claim(w); const slot = hudNames.get('hud-' + name), c = sprite(w, slot);
    return c ? { c, spec: w.art.slots[slot] } : null;
  }
  // 작은 조각을 정수 배로 반복한다. 마지막 조각은 잘라서 모서리와 도트 크기를 지킨다.
  function tilePart(g, c, sx, sy, sw, sh, x, y, wd, ht, scale) {
    if (wd <= 0 || ht <= 0 || sw <= 0 || sh <= 0) return;
    g.save(); g.beginPath(); g.rect(x, y, wd, ht); g.clip();
    for (let yy = y; yy < y + ht; yy += sh * scale) for (let xx = x; xx < x + wd; xx += sw * scale) g.drawImage(c, sx, sy, sw, sh, xx, yy, sw * scale, sh * scale);
    g.restore();
  }
  function hudFrame(w, g, name, x, y, wd, ht, want = 2) {
    const art = hudArt(w, name); if (!art?.spec.slice) return false;
    x = Math.round(x); y = Math.round(y); wd = Math.round(wd); ht = Math.round(ht);
    const { c, spec } = art, [l, r, t, b] = spec.slice;
    const sc = Math.max(1, Math.min(want, Math.floor(wd / (l + r + 1)), Math.floor(ht / (t + b + 1))));
    const dpr = w.px.dpr, key = `${name}:${wd}:${ht}:${sc}:${dpr}`;
    let picture = hudFrames.get(key);
    if (picture) { g.drawImage(picture, x, y, wd, ht); return true; }
    picture = canvas(Math.round(wd * dpr), Math.round(ht * dpr));
    const target = picture.getContext('2d'); target.scale(dpr, dpr);
    const xs = [0, l, c.width - r], ys = [0, t, c.height - b], ws = [l, c.width - l - r, r], hs = [t, c.height - t - b, b];
    const dx = [0, l * sc, wd - r * sc], dy = [0, t * sc, ht - b * sc];
    const dw = [l * sc, wd - (l + r) * sc, r * sc], dh = [t * sc, ht - (t + b) * sc, b * sc];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) tilePart(target, c, xs[i], ys[j], ws[i], hs[j], dx[i], dy[j], dw[i], dh[j], sc);
    if (hudFrames.size >= 128) hudFrames.clear();
    hudFrames.set(key, picture); g.drawImage(picture, x, y, wd, ht);
    return true;
  }
  function hudIcon(w, g, name, x, y, wd, ht) {
    const art = hudArt(w, name); if (!art) return false;
    const c = art.c, sc = Math.max(1, Math.floor(Math.min(wd / c.width, ht / c.height)));
    g.drawImage(c, Math.round(x + (wd - c.width * sc) / 2), Math.round(y + (ht - c.height * sc) / 2), c.width * sc, c.height * sc);
    return true;
  }
  function hudFill(w, g, name, x, y, wd, ht, k) {
    const art = hudArt(w, name); if (!art) return false;
    const sc = Math.max(1, Math.floor(ht / art.c.height)), ratio = clamp01(k), fw = ratio > 0 ? Math.max(1, Math.round(wd * ratio)) : 0;
    tilePart(g, art.c, 0, 0, art.c.width, art.c.height, Math.round(x), Math.round(y), fw, Math.round(ht), sc);
    return true;
  }
  function bossTitle(w,r,b) {
    const pal=w.art.palette||{},ink=pal.ink||INK,bw=r.boss.w,pad=8,dpr=w.px.dpr,fs=n=>Math.round(n*r.u),gen=b.def.role==='general';
    const key=[b.def.id,b.def.name,gen,bw,r.boss.nameH,r.u,dpr,ink].join('/');
    let c=bossTitles.get(key);if(c)return c;
    c=uiCanvas((bw+pad*2)*dpr,(r.boss.nameH+pad*2)*dpr);const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,pad*dpr,pad*dpr);
    const nameSize=Math.max(14,fs(23)),roleSize=Math.max(14,fs(14)),role=gen?R.T.generalTag:R.T.deputyTag;
    g.font=`bold ${nameSize}px ${FONT}`;const nameW=Math.ceil(g.measureText(b.def.name).width);
    g.font=`${roleSize}px ${FONT}`;const roleW=Math.ceil(g.measureText(role).width)+fs(14),roleH=Math.max(22,fs(22));
    const nameX=(bw-roleW-r.rowGap-nameW)/2,nameY=r.boss.nameH/2;
    frame(g,nameX,nameY-roleH/2,roleW,roleH,gen?'#713e32':'#3d5266','#d8bd82',1,'#9c805e');
    label(g,role,nameX+roleW/2,nameY,roleSize,'#ffe3a0',ink);
    label(g,b.def.name,nameX+roleW+r.rowGap+nameW/2,nameY,nameSize,'#ffffff',ink,'center',true);
    if(bossTitles.size>=8)bossTitles.delete(bossTitles.keys().next().value);bossTitles.set(key,c);return c;
  }
  function hud(w, g) {
    const sv = w.sv, v = w.view, px = w.px, pal = w.art.palette || {}, r = hudRects(w), T = R.T, ink = pal.ink || INK;
    g.save(); g.imageSmoothingEnabled = false;

    const u = r.u, fs = n => Math.round(n * u);
    // 경험치 막대와 레벨 배지
    const xp = r.xp;
    const xpArt = hudFrame(w, g, 'xp-frame', xp.x, xp.y, xp.w, xp.h), xpInset = xpArt ? 18 : 2, xpTop = xpArt ? 6 : 2;
    px.hudXPArt=!!xpArt;
    if (!xpArt) frame(g, xp.x, xp.y, xp.w, xp.h, '#243447');
    g.fillStyle = '#243447'; g.fillRect(xp.x + xpInset, xp.y + xpTop, xp.w - xpInset * 2, xp.h - xpTop * 2);
    g.fillStyle = '#526579'; g.fillRect(xp.x + xpInset, xp.y + xpTop, xp.w - xpInset * 2, 1);
    // 채움은 코드로 그려 그림의 유무와 관계없이 빈 바탕과 밝기가 구별되게 한다.
    const lv = r.lv, cxL = lv.x + lv.w / 2, cyL = lv.y + lv.h / 2;
    if (!hudIcon(w, g, 'level', lv.x, lv.y, lv.w, lv.h)) {
      g.fillStyle = ink; g.beginPath(); g.arc(cxL, cyL, lv.w / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2b636'; g.beginPath(); g.arc(cxL, cyL, lv.w / 2 - 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(cxL, cyL - lv.h * .08, lv.w / 2 - 6, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    }
    // 기존 놋쇠 테 안에 밝은 금빛 판을 얹는다. 배지는 고정 40px이므로 숫자도 폰에서 줄이지 않는다.
    g.fillStyle = '#edbd53';
    g.fillRect(lv.x + 12, lv.y + 6, 16, 28); g.fillRect(lv.x + 8, lv.y + 8, 24, 24); g.fillRect(lv.x + 6, lv.y + 12, 28, 16);
    g.fillStyle = '#c58b32'; g.fillRect(lv.x + 12, lv.y + 30, 16, 4); g.fillRect(lv.x + 8, lv.y + 28, 24, 2);
    g.fillStyle = '#fff0ad'; g.fillRect(lv.x + 12, lv.y + 6, 16, 2); g.fillRect(lv.x + 8, lv.y + 8, 24, 2);
    label(g, String(sv.level), cxL, cyL + 1, sv.level >= 100 ? 20 : sv.level >= 10 ? 24 : 28, '#ffffff', ink, 'center', true);

    // 가운데 시계: 시대 따라가기는 다음 막까지 남은 시간(적장과 싸울 때는 그 말), 무한은 버틴 시간
    const ck = r.clock, endless = sv.play === 'endless', general = !endless && sv.bossOn?.some(o => o.def.role === 'general');
    const secs = endless ? sv.t : Math.max(0, w.timeLeft ?? 0), hurry = !endless && !general && secs <= 10;
    const tag = endless ? `${R.fmt(T.loopN, (sv.loop || 0) + 1)} · ${T.survived}` : general ? T.generalNow : `${R.fmt(T.act, sv.act || 1)} · ${T.toNext}`;
    const clockArt = hudFrame(w, g, 'clock', ck.x, ck.y, ck.w, ck.h);
    const clockLabel = endless ? clockText(Math.floor(secs)) + ' / ' + clockText(w.family.tuning.endless.durationSec) : clockText(secs);
    // 같은 시계 칸 안에서 끝 시각까지 읽히도록 글자 크기를 맞춘다(390 폭 포함).
    let clockSize = fs(endless ? 26 : 34); g.font = `${clockSize}px ${FONT}`;
    if (endless && g.measureText(clockLabel).width > ck.w - fs(30)) clockSize *= (ck.w - fs(30)) / g.measureText(clockLabel).width;
    label(g, general ? '' : clockLabel, ck.x + ck.w / 2, ck.y + fs(clockArt ? 23 : 18), clockSize, hurry ? '#ff6b5c' : '#ffffff', ink);
    px.clockText = general ? T.generalNow : clockLabel;
    const tagSize = Math.max(14, fs(14));
    g.font = `${tagSize}px ${FONT}`; const tw = Math.ceil(g.measureText(tag).width) + fs(20), th = fs(22), ty = ck.y + (general ? fs(6) : fs(clockArt ? 43 : 36));
    if (!clockArt) frame(g, ck.x + (ck.w - tw) / 2, ty, tw, th, general ? '#8e2a2a' : 'rgba(18,22,36,.78)', ink, 2, general ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.12)');
    label(g, tag, ck.x + ck.w / 2, ty + th / 2, tagSize, general ? '#ffffff' : '#ffe08a', ink);

    // 왼쪽 칸: 무기(빈 칸까지), 그 아래 유물·동료
    const ic = r.icons, img = window.GFShell?.img;
    const slotBox = (it, x, y, s, empty, weapon=false, ally=false) => {
      const ready=weapon && it && R.evolutionReady(w.content,sv.kit,it,w.family.tuning);
      // 각성한 동료는 진화 무기처럼 금 테.
      const gold = it?.evo || ally && it && it.level >= w.family.tuning.level.allyMax;
      // 1배 테만 남기고 판과 그림을 키워 작은 유물·동료 칸에서도 얼굴과 물건이 보이게 한다.
      const art = hudFrame(w, g, gold ? 'slot-gold' : empty ? 'slot-empty' : 'slot-full', x, y, s, s, 1), inset = art ? 4 : 3;
      if (!art) frame(g, x, y, s, s, '#71879a', gold ? (pal.gold || '#e6b653') : ink, 2);
      g.fillStyle = empty ? '#62788b' : '#9aaebb'; g.fillRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
      if (empty) {
        g.fillStyle = '#35495b'; g.fillRect(x + inset, y + inset, s - inset * 2, 2); g.fillRect(x + inset, y + inset, 2, s - inset * 2);
        g.fillStyle = '#9aafbd'; g.fillRect(x + inset, y + s - inset - 2, s - inset * 2, 2); g.fillRect(x + s - inset - 2, y + inset + 2, 2, s - inset * 2 - 2);
      } else { g.fillStyle = '#c6d3d8'; g.fillRect(x + inset, y + inset, s - inset * 2, 1); }
      if (!it) return;
      const slot = S.evolution.icon(w, it.evo || it.id), spec = w.art.slots?.[slot], box = spec?.ink || (spec ? [0, 0, spec.w, spec.h] : null);
      if (slot && img && box) {
        // 껍데기의 원본 그림은 공개되지 않으므로 sprite의 실제 화소 검사도 거친다.
        // 아직 빈 그림이면 이번 HUD를 저장하지 않고 다음 장면에 다시 그린다.
        if (!sprite(w, slot)) missing = true;
        const [ix, iy, iw, ih] = box, sc = (s - inset * 2) / Math.max(iw, ih), wd = Math.round(iw * sc), ht = Math.round(ih * sc);
        img(g, slot, x + Math.round((s - wd) / 2), y + Math.round((s - ht) / 2), wd, ht, 0, { x: ix, y: iy, w: iw, h: ih });
      }
      if (gold) { g.strokeStyle = '#ffe08a'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 2, s - 2); }
      if(weapon && !it.evo || ally) {
        // 동료도 무기처럼 고른 횟수 점으로(속 단계 숫자는 숨긴다).
        const p=ally?R.allyProgress(it.level,w.family.tuning):R.weaponProgress(it.level,w.family.tuning),diam=4,gap=3,left=x+(s-p.total*(diam+gap)+gap)/2;
        g.fillStyle='#182c42';g.fillRect(x+3,y+s-10,s-6,9);
        for(let i=0;i<p.total;i++){g.fillStyle=i<p.filled?'#ffe7a0':'#71879a';g.beginPath();g.arc(left+i*(diam+gap)+diam/2,y+s-5,diam/2,0,Math.PI*2);g.fill();}
        if(ready) {
          g.strokeStyle=`rgba(255,219,105,${.65+Math.sin(sv.t*5)*.3})`;g.lineWidth=2;g.strokeRect(x-1,y-1,s+2,s+2);
          label(g,'진화 준비',x+s/2,y+s+7,11,'#ffe7a0',ink);
        }
      } else if (!it.evo && it.level > 0) {
        const size = Math.max(12, fs(12)), pw = Math.max(14, fs(15)), ph = size + 2, tx = x + s - pw, ty = y + s - ph;
        frame(g, tx, ty, pw, ph, '#394c60', '#d8bd82', 1, '#8499aa');
        label(g, String(it.level), tx + pw / 2, ty + ph / 2, size, '#ffffff', ink, 'center', true);
      }
      if (it.cracks > 0) {
        g.strokeStyle = '#ff3b30'; g.lineWidth = 2; g.beginPath();
        g.moveTo(x + s * .25, y + 3); g.lineTo(x + s * .5, y + s * .4); g.lineTo(x + s * .35, y + s * .6); g.lineTo(x + s * .6, y + s - 4);
        g.stroke();
      }
    };
    for (let i = 0; i < ic.wN; i++) slotBox(sv.kit.weapons[i], ic.x + (i % ic.wCols) * (ic.s1 + ic.gap), ic.y + Math.floor(i / ic.wCols) * ic.wStep, ic.s1, !sv.kit.weapons[i], true);
    for (const [i, it] of [...sv.kit.relics, ...sv.kit.allies].entries())
      slotBox(it, ic.x + (i % ic.sCols) * (ic.s2 + ic.gap), ic.y + ic.smallY + Math.floor(i / ic.sCols) * (ic.s2 + ic.gap), ic.s2, false, false, i >= sv.kit.relics.length);

    // 오른쪽: 하트(잃은 하트는 빈 하트로), 그 아래 점수
    const rt = r.right, lives = Math.max(0, (sv.fallenMoment ? 0 : w.lives) ?? 0);
    sv.heartMax = Math.max(sv.heartMax || 0, lives);
    let hx = rt.x + rt.w;
    const hs = rt.heart, hp = Math.max(2, Math.floor(hs / 10)) * 10;
    for (let i = Math.min(sv.heartMax, 6) - 1; i >= 0; i--) { hx -= hp + 2; if (!hudIcon(w, g, i < lives ? 'heart-full' : 'heart-empty', hx, rt.y, hp, hp)) heartPic(g, hx, rt.y, hs, i < lives); }
    const scoreY = rt.y + hp + r.gap + fs(12);
    label(g, (w.score || 0).toLocaleString('ko-KR'), rt.x + rt.w - 2, scoreY, fs(22), '#ffffff', ink, 'right');
    g.font = `${fs(22)}px ${FONT}`; const sw = g.measureText((w.score || 0).toLocaleString('ko-KR')).width;
    const coinSize = 24, coinX = rt.x + rt.w - 2 - sw - fs(8) - coinSize;
    if (!hudIcon(w, g, 'coin', coinX, scoreY - coinSize / 2, coinSize, coinSize)) label(g, T.scoreWord, coinX + coinSize, scoreY + 1, fs(13), '#ffe08a', ink, 'right');

    // 보스 막대: 이름표(부장·적장)와 체력
    if (r.boss) {
      const b = sv.boss, bx = r.boss.x, bw = r.boss.w, by = r.boss.y + r.boss.nameH + r.gap, bh = r.boss.barH, gen = b.def.role === 'general';
      const title=bossTitle(w,r,b);g.drawImage(title,bx-8,r.boss.y-8,title.width/w.px.dpr,title.height/w.px.dpr);
      const bossArt = hudFrame(w, g, gen ? 'general-frame' : 'deputy-frame', bx, by, bw, bh), inset = bossArt ? 18 : 2, top = bossArt ? 6 : 2;
      if (!bossArt) frame(g, bx, by, bw, bh, 'rgba(18,22,36,.85)', gen ? (pal.gold || '#e6b653') : INK, gen ? 3 : 2);
      if (!hudFill(w, g, 'hp-fill', bx + inset, by + top, bw - inset * 2, bh - top * 2, b.hp / b.hpMax)) fillBar(g, bx + inset, by + top, bw - inset * 2, bh - top * 2, b.hp / b.hpMax, gen ? '#d6322b' : '#e0703e', gen ? '#ff8a7a' : '#ffb27a', gen ? '#8e1f1b' : '#9c4520');
    }

    g.restore();
  }

  function hudMotion(w, g) {
    const sv=w.sv,v=w.view,pal=w.art.palette||{},r=hudRects(w),ink=pal.ink||INK;
    g.save();g.imageSmoothingEnabled=false;
    const xp=r.xp,inset=w.px.hudXPArt?18:2,xpTop=w.px.hudXPArt?6:2;
    fillBar(g,xp.x+inset,xp.y+xpTop,xp.w-inset*2,xp.h-xpTop*2,sv.xp/R.xpNeed(sv.level,w.family.tuning.xp,sv.cell?.id),'#79cfff','#c6efff','#4faddb');
    // 화면 밖 상자와 두루마리를 가리키는 화살표
    const top = r.bottom + 14, L = 18, RT = v.w - 18, B = v.h - 18, cx = v.w / 2, cy = (top + B) / 2;
    for (const it of sv.items) {
      if (it.type !== 'chest' && it.type !== 'scroll') continue;
      const p = W.toCss(w, it.x, it.y);
      if (p.x >= 0 && p.x <= v.w && p.y >= v.top && p.y <= v.h) continue;
      const dx = p.x - cx, dy = p.y - cy;
      const sx = dx ? ((dx > 0 ? RT : L) - cx) / dx : Infinity, sy = dy ? ((dy > 0 ? B : top) - cy) / dy : Infinity, q = Math.min(sx, sy);
      g.save(); g.translate(cx + dx * q, cy + dy * q); g.rotate(Math.atan2(dy, dx));
      g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -7); g.lineTo(-6, 7); g.closePath();
      g.fillStyle = it.type === 'chest' ? pal.gold || '#e6b653' : '#f2e6c8'; g.fill();
      g.strokeStyle = ink; g.lineWidth = 2; g.stroke(); g.restore();
    }

    // 손가락 조이스틱
    const st = S.stick;
    if (st?.on && (!st.w || st.w === w)) {
      g.globalAlpha = .5; g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 3;
      g.beginPath(); g.arc(st.x0, st.y0, 40, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(st.x, st.y, 16, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }

    // 진화, 보스 쓰러뜨림의 흰 번쩍
    if (sv.flash > 0 && S.feedback.on(w, 'flash')) { g.globalAlpha = Math.min(.35, sv.flash / .15 * .35); g.fillStyle = '#ffffff'; g.fillRect(0, r.bottom + 6, v.w, v.h); g.globalAlpha = 1; }
    g.restore();
  }

  const ready = w => doc && w.sv?.begun && w.px?.oc && w.art;
  function edgePicture() {
    if (edgePic) return edgePic;
    edgePic = uiCanvas(256, 256); const eg = edgePic.getContext('2d');
    for (const [x0,y0,x1,y1,x,y,wd,ht] of [[0,0,24,0,0,0,24,256],[256,0,232,0,232,0,24,256],[0,0,0,24,0,0,256,24],[0,256,0,232,0,232,256,24]]) {
      const grad = eg.createLinearGradient(x0,y0,x1,y1); grad.addColorStop(0,'#d63b37'); grad.addColorStop(1,'rgba(214,59,55,0)'); eg.fillStyle=grad; eg.fillRect(x,y,wd,ht);
    }
    return edgePic;
  }
  function arrivalEdge(w,g,top,height) {
    const c=edgePicture(),width=w.view.w,left=Math.min(24,width*.04),right=width-left,strip=Math.min(24,height*.04);
    // Copy only the four painted strips, preserving every edge pixel. The
    // transparent middle need not be blended over the entire battlefield.
    g.drawImage(c,0,0,24,256,0,top,left,height);
    g.drawImage(c,232,0,24,256,right,top,left,height);
    g.drawImage(c,24,0,208,24,left,top,right-left,strip);
    g.drawImage(c,24,232,208,24,left,top+height-strip,right-left,strip);
  }
  // 빨간 가장자리(장수 등장·피가 적을 때)는 위쪽 표시줄까지 화면 전체를 두르되, 표시줄보다 먼저 그려
  // 동료·유물 칸 그림이 물들지 않게 한다(2026-10-19, ee139af 뒤 survivor-hud 그림 비교가 어긋남).
  function edgeOverlay(w, g) {
    const sv = w.sv, v = w.view, a = sv.arrival;
    if (sv.choice || w.effectsOff) return;
    const feel = S.feedback.config(w), low = sv.hero.hp > 0 && sv.hero.hp / sv.hero.hpMax < (feel.lowHealth ?? .3);
    const arriving = a && !a.skipped && S.moments.age(w, a) < a.duration && !a.foe.dead;
    if (!low && !arriving) return;
    g.save();
    // 위기: 심장 뛰듯 더 진하게
    if (low) { g.globalAlpha = S.feedback.on(w, 'flash') ? .3 + .3 * (.5 - .5 * Math.cos(sv.feelClock / (feel.lowHealthPeriod || 1) * Math.PI * 2)) : .35; arrivalEdge(w, g, 0, v.h); }
    // 장수 등장: 같은 그림을 느린 숨결로
    if (arriving) { g.globalAlpha = S.feedback.on(w, 'flash') ? .25 + .3 * Math.sin(Math.PI * S.moments.age(w, a) / a.duration) : .25; arrivalEdge(w, g, 0, v.h); }
    g.restore();
  }
  // Battle effects use the HUD's rectangles without changing its layout or body drawing.
  function combatOverlay(w, g) {
    const sv = w.sv, r = hudRects(w), v = w.view;
    const feel = S.feedback.config(w), low = sv.hero.hp > 0 && sv.hero.hp / sv.hero.hpMax < (feel.lowHealth ?? .3);
    if (sv.choice || !sv.battleFlash && !sv.critNums.length && !sv.rush && !low) return;
    g.save();
    // 위기 빨간 가장자리는 edgeOverlay가 위쪽 표시줄보다 먼저 그린다.
    g.beginPath(); g.rect(0, Math.max(v.top, r.bottom + 6), v.w, Math.max(0, v.h - r.bottom - 6)); g.clip();
    const flash=S.feedback.left(w,'battleFlash');
    if (flash > 0 && S.feedback.on(w, 'flash')) { g.fillStyle = `rgba(255,245,205,${flash * 1.8})`; g.fillRect(0, 0, v.w, v.h); }
    for (const n of S.feedback.on(w, 'numbers') ? sv.critNums : []) {
      const p = W.toCss(w, n.x, n.y - n.t * 35), size = Math.round(Math.max(14, 8 * w.px.s / w.px.dpr) * (n.crit ? feel.numberScale ?? 1.4 : feel.numberHitScale ?? 1.15));
      if(p.x < -128 || p.x > v.w+128 || p.y < r.bottom-128 || p.y > v.h+128)continue;
      const c = fontsOk() ? numPic(n.v, size, n.crit, w.px.dpr) : null;
      g.globalAlpha = Math.min(1, (.6 - n.t) * 5);
      if (c) g.drawImage(c.sheet,c.x,c.y,c.width,c.height,p.x-c.cssW/2,p.y-c.cssH/2,c.cssW,c.cssH);
      else label(g, String(n.v), p.x, p.y, size, n.crit ? '#ffd23f' : '#ffffff');
    }
    g.globalAlpha = 1;
    if (sv.rush) {
      const left = sv.rush.at - sv.t, pulse = .65 + Math.sin(sv.t * 12) * .25;
      for (let i = 0; i < sv.rush.points.length; i += 3) {
        const point = sv.rush.points[i], p = W.toCss(w, point.x, point.y);
        const x = Math.max(16, Math.min(v.w - 16, p.x)), y = Math.max(r.bottom + 22, Math.min(v.h - 18, p.y));
        g.save(); g.translate(x, y); g.rotate(point.ang); g.globalAlpha = pulse;
        g.beginPath(); g.moveTo(12, 0); g.lineTo(-9, -8); g.lineTo(-5, 0); g.lineTo(-9, 8); g.closePath();
        g.fillStyle = '#ff6647'; g.strokeStyle = INK; g.lineWidth = 3; g.fill(); g.stroke(); g.restore();
      }
      label(g, String(Math.max(1, Math.ceil(left))), v.w / 2, v.h - 32, 28, '#ffb05b');
    }
    g.restore();
  }
  function warmFoes(w) {
    const px = w.px, key = w.sv.cell?.id;
    if (px.whiteOwner !== key || !px.whiteWarm) {
      px.whiteOwner = key; px.whiteWarm = [];
      const foes=w.sv.foeDefs?[...new Set(Object.values(w.sv.foeDefs))].filter(Boolean):w.content.foes.filter(f=>w.sv.battle.foes?.includes(f.id));
      for (const f of foes) for (const phase of ['a','b']) for (const v of ['', 'f', 'w', 'wf']) px.whiteWarm.push({slot:'foe-'+f.sprite+'-'+phase,v,frame:0,scale:1,boss:false});
      for (const f of w.content.bosses.filter(f => w.sv.foeDefs ? f.cell === key : !f.cell || f.cell === key)) { const slot='boss-'+f.sprite, spec=battleSpec(w,slot); for(let i=0;i<(spec?.frames || 1);i++)for(const v of ['', 'f', 'w', 'wf'])px.whiteWarm.push({slot,v,frame:i,scale:1,boss:true}); }
    }
    for (let i=0,n=Math.min(8,px.whiteWarm.length);i<n;i++) {
      const job=px.whiteWarm.shift(),c=sprite(w,job.slot,job.v,job.frame);
      if(!c)px.whiteWarm.push(job);
    }
    // Hit poses are cached on their first actual use by bodyFrame. Background
    // preparation of unused poses cost more than all the live hit copies.
  }
  // 동료가 날리는 그림(화살·항아리·칼바람)도 32방향을 미리 그려 둔다.
  function allyShots(w) {
    const out=[];
    for(const own of w.sv.kit.allies){
      const does=(w.content.allies||[]).find(a=>a.person===own.id)?.does,only=w.family.tuning.allyOnly?.[own.id]?.kind;
      if(does==='shoot')out.push(w.content.weapons.find(x=>x.id==='bow')?.shot||'shot-arrow');
      if(does==='bomb')out.push('shot-ball');
      if(only==='wind')out.push('shot-swing');
    }
    return out;
  }
  function warmArrows(w) {
    const px=w.px,kit=w.sv.kit.weapons,allySlots=allyShots(w),e=w.sv.evolution;
    const bigId=e&&(e.firstPending||S.evolution.presenting(w))?e.id:'';
    const key=attackOpacity+':'+kit.map(o=>o.id+':'+(o.evo||'')).join(',')+':'+allySlots.join(',')+':'+bigId;
    if(px.arrowKey!==key||!px.arrowWarm){
      px.arrowKey=key;px.arrowWarm=[];
      for(const slot of allySlots)for(let turn=0;turn<32;turn++)px.arrowWarm.push({slot,scale:1,turn,trail:false});
      for(const own of kit){
        const def=(own.evo?w.content.evolutions:w.content.weapons).find(def=>def.id===(own.evo||own.id));
        if(!ROTATED_KINDS.has(def?.kind)||def.kind==='nova'&&def.weapon==='longspear')continue;
        const slot=own.evo?S.evolution.visual(w,own.evo)?.attack:def.shot;if(!slot)continue;
        const enlarged=own.evo==='gakgung'||own.evo==='pyeonjeon';
        const trail=enlarged||own.evo==='goldblade'||own.evo==='marksman',factor=enlarged?1.4:1;
        const turns=def.kind==='rain'?[8]:['stampede','wave'].includes(def.kind)?[0]:Array.from({length:32},(_,i)=>i);
        // A large spin picture is costly to bake. Prepare the release scale
        // during its evolution scene; ordinary combat only needs normal size.
        for(const scale of own.evo===bigId?[1.3,1]:[1])for(const turn of turns)px.arrowWarm.push({slot,scale,turn,trail,factor});
        if(def.kind==='cluster'&&def.fragmentShot)for(let turn=0;turn<32;turn++)px.arrowWarm.push({slot:def.fragmentShot,scale:1,turn,trail:false});
      }
    }
    let pixels=0;
    for(let i=0,n=Math.min(4,px.arrowWarm.length);i<n;i++){
      const job=px.arrowWarm.shift(),c=sprite(w,job.slot);
      if(c){
        const cost=c.width*c.height*job.scale*job.scale;
        if(i&&pixels+cost>64000){px.arrowWarm.unshift(job);break;}
        rotated(c,job.turn,job.scale*(job.trail?(job.factor||1.4):1),1,attackOpacity,job.trail);pixels+=cost;
      }else px.arrowWarm.push(job);
    }
  }
  function warmOpacity(w) {
    if(attackOpacity===1)return;
    const px=w.px,kit=w.sv.kit.weapons,key=attackOpacity+':'+kit.map(o=>o.id+':'+(o.evo||'')).join(',');
    if(px.opacityKey!==key||!px.opacityWarm){
      px.opacityKey=key;px.opacityWarm=[];
      const slots=new Set();
      for(const own of kit){
        const visual=S.evolution.visual(w,own.evo),shot=w.content.weapons.find(def=>def.id===own.id)?.shot;
        if(visual){slots.add(visual.attack);slots.add(visual.hit);}else if(shot)slots.add(shot.startsWith('shot-')?shot:'shot-'+shot);
      }
      for(const slot of slots)if(slot)for(const v of ['','f'])px.opacityWarm.push({slot,v});
    }
    for(let i=0,n=Math.min(4,px.opacityWarm.length);i<n;i++){
      const job=px.opacityWarm.shift(),c=sprite(w,job.slot,job.v);
      if(c)opacityPicture(c,attackOpacity);else px.opacityWarm.push(job);
    }
  }
  function warmNumbers(w) {
    const px = w.px, key = px.s + ':' + px.dpr;
    if (px.damageWarmKey === key || !fontsOk()) return;
    px.damageWarmKey = key;
    const feel = S.feedback.config(w), base = Math.max(14, 8 * px.s / px.dpr), crit = Math.round(base * (feel.numberScale ?? 1.4)), hit = Math.round(base * (feel.numberHitScale ?? 1.15));
    for (let n = 1; n <= 64; n++) { numPic(n, crit, true, px.dpr); numPic(n, hit, false, px.dpr); }
  }
  // Fallback act notices can be long. Bake their exact common-effect text
  // before combat, using the existing bounded glyph cache and an isolated
  // silent renderer. Actual notices retain their text, timing and layout.
  function prepareStageBanners(w) {
    if (!doc || w.sv?.play !== 'stage' || !w.sv.cell || !w.juice?.feel || !window.GFJuice?.create) return;
    const key=[w.sv.cell.id,w.view.w,w.view.h,w.fontScale,window.devicePixelRatio].join(':');
    if(w.sv.bannerWarmKey===key)return;
    const labels=(w.sv.cell.acts||[]).slice(1,3).map((line,i)=>R.fmt(R.T.act,i+2)+(line?' · '+line:'')).reverse();
    const c=canvas(1,1),g=c.getContext('2d'),b={x:8,y:8,w:Math.max(1,w.view.w-16),h:Math.max(1,w.view.h-16)};
    for(const label of labels){
      const warmWorld={view:w.view,art:w.art,fontScale:w.fontScale,cacheEffectText:true,
        sfxRoot:w.sfxRoot,version:w.version,fxRng:()=>.5,
        effectBounds:()=>b,effectLabels:()=>[],effectAllowed:kind=>kind==='label'||kind==='banner',
        record:(name,params)=>({name,params})};
      const renderer=window.GFJuice.create({world:warmWorld,canvas:c,feel:w.juice.feel,side:w.side});
      renderer.moment('special',{x:b.x+b.w/2,y:b.y+b.h*.3,label});renderer.update(0);renderer.draw(g);
    }
    w.sv.bannerWarmKey=key;
  }
  function prepareStageBosses(w) {
    if(!doc||w.sv?.play!=='stage'||!w.sv.cell||!w.px)return;
    claim(w);
    const c=uiCanvas(w.view.w*w.px.dpr,w.view.h*w.px.dpr),g=c.getContext('2d');g.setTransform(w.px.dpr,0,0,w.px.dpr,0,0);
    const defs=w.content.bosses.filter(b=>b.cell===w.sv.cell.id);
    for(const def of defs){
      const boss={def,hp:1,hpMax:1},warm={...w,px:{...w.px},sv:{...w.sv,boss,bossOn:[boss]}};
      g.clearRect(0,0,w.view.w,w.view.h);hud(warm,g);
      warningPicture(w,R.fmt(def.role==='general'?R.T.generalCome:R.T.deputyCome,def.name));
    }
    const first=defs.find(b=>b.id===w.sv.cell.deputies[0]?.id);
    if(!first)return;
    const slot='boss-'+first.sprite,spec=battleSpec(w,slot),scale=spec?.displayScale||1,feel=S.feedback.config(w);
    let bytes=0;
    for(const density of new Set([1,w.px.s]))for(let frame=0;frame<(spec?.frames||1);frame++)for(const variant of ['','f','w','wf']){
      const picture=sprite(w,slot,variant,frame);if(!picture)continue;
      for(const phase of [4,3,2,1,0]){
        const estimate=picture.width*picture.height*scale*scale*density*density*4;
        if(bytes+estimate>12*1024*1024)continue;
        const pose=bodyFrame(picture,phase,scale,true,density,feel.squash?.[0]||1.1,feel.squash?.[1]||.9);
        bytes+=pose.width*pose.height*4;
      }
    }
  }
  function evolutionOverlay(w, g) {
    if (w.sv.choice || !S.evolution.presenting(w)) return;
    const e = w.sv.evolution, r = hudRects(w), v = w.view, cx = v.w / 2;
    const size = v.w < 500 ? 60 : 76, merging = e.age < S.evolution.timing.merge;
    const y = Math.min(v.h - 190, r.bottom + size * .65 + 12);
    const picture = (slot, x, py, sz) => {
      const c = sprite(w, slot); if (!c) return;
      const sc = sz / Math.max(c.width, c.height);
      g.drawImage(c, Math.round(x - c.width * sc / 2), Math.round(py - c.height * sc / 2), Math.round(c.width * sc), Math.round(c.height * sc));
    };
    g.save(); g.imageSmoothingEnabled = false;
    if (merging) {
      const t = Math.min(1, e.age / S.evolution.timing.merge), gap = (v.w < 500 ? 90 : 140) * (1 - t * t);
      picture(S.evolution.utility(w, 'halo'), cx, y, size * 1.7);
      picture(R.picSlot(w.content, e.weapon), cx - gap, y, size);
      picture(R.picSlot(w.content, e.relic), cx + gap, y, size);
    } else {
      picture(S.evolution.utility(w, 'halo'), cx, y, size * 1.7);
      picture(S.evolution.icon(w, e.id), cx, y, size);
      const width = Math.min(v.w - 28, 390), top = y + size * .65;
      frame(g, cx - width / 2, top, width, 48, '#1d2543', '#ffe08a', 3, '#b78737');
      label(g, '진화! ' + e.name, cx, top + 24, v.w < 500 ? 26 : 32, '#fff0af');
      if (e.age >= .5) label(g, '누르면 건너뛰어요', cx - width / 2 + 88, top + 64, 16, '#fff0af');
    }
    g.restore();
  }
  function evolutionRect(w) {
    if (!S.evolution.presenting(w) || w.sv.choice) return null;
    const r = hudRects(w), v = w.view, size = v.w < 500 ? 60 : 76;
    const y = Math.min(v.h - 190, r.bottom + size * .65 + 12), width = Math.min(v.w - 28, 390);
    const top = y - size * .85 - 6, hero = W.toCss(w, w.sv.hero.x, w.sv.hero.y);
    const bottom = Math.max(top + size * 1.5 + 96, hero.y + 16);
    return { x: v.w / 2 - width / 2 - 6, y: top, w: width + 12, h: bottom - top };
  }
  let giftSheet = null, defeatSheet = null, beamPic = null;
  function warningPicture(w,text) {
    const width=Math.min(650,w.view.w-32),key=width+'/'+text;
    let c=warningPictures.get(key);if(c)return c;
    c=uiCanvas(width,58);const g=c.getContext('2d');
    frame(g,2,2,width-4,52,'#4a2430','#eab878',3);
    label(g,text,width/2,29,w.view.w<500?23:32,'#fff0c4');
    if(warningPictures.size>=8)warningPictures.delete(warningPictures.keys().next().value);warningPictures.set(key,c);return c;
  }
  function giftCount(n) {
    let c=giftCounts.get(n);if(c)return c;
    c=uiCanvas(128,40);label(c.getContext('2d'),'엽전 '+n,64,20,21,'#ffe08a');
    if(giftCounts.size>=32)giftCounts.clear();giftCounts.set(n,c);return c;
  }
  function giftRect(w) {
    const gift = w.sv.gift;
    if (!gift || gift.skipped || S.moments.age(w,gift) >= gift.duration || w.sv.choice) return null;
    const width = Math.min(310, w.view.w - 32), height = 180;
    return { x: w.view.w - width - 16, y: w.view.h - height - 28, w: width, h: height };
  }
  function defeatRect(w) {
    const b=w.sv.bossMoment;
    if(w.sv.choice||!b||b.skipped||b.age>=b.duration)return null;
    const width=Math.min(760,w.view.w-32);
    return{x:(w.view.w-width)/2,y:hudRects(w).bottom+12,w:width,h:defeatSheet?.canvas.height||(w.view.w<500?68:50)};
  }
  function momentPicture(w, g, slot, x, y, size) {
    const c = sprite(w, slot); if (!c) return false;
    const scale = size / Math.max(c.width, c.height);
    g.drawImage(c, Math.round(x - c.width * scale / 2), Math.round(y - c.height * scale / 2), Math.round(c.width * scale), Math.round(c.height * scale));
    return true;
  }
  function momentsOverlay(w, g) {
    const sv = w.sv;
    if (sv.choice || w.effectsOff) return;
    const defeat=sv.bossMoment&&!sv.bossMoment.skipped&&sv.bossMoment.age<sv.bossMoment.duration?sv.bossMoment:null;
    if (!defeat && !sv.arrival && !sv.bossOn.length && (!sv.gift || sv.gift.skipped || sv.gift.age >= sv.gift.duration)) return;
    const v = w.view, r = hudRects(w), a = sv.arrival;
    if (a && !a.skipped && S.moments.age(w,a) < a.duration && !a.foe.dead) {
      const top = Math.max(v.top, r.bottom + 6);
      // 빨간 가장자리는 edgeOverlay가 위쪽 표시줄보다 먼저 그린다(이름 띠만 여기서, 표시줄 아래).
      g.save();
      const width = Math.min(650, v.w - 32), labelText = a.label || R.fmt(a.foe.role === 'general' ? R.T.generalCome : R.T.deputyCome, a.foe.def.name);
      g.drawImage(warningPicture(w,labelText),(v.w-width)/2,top+12);g.restore();
    }
    if(defeat){
      const width=Math.min(760,v.w-32),key=width+'/'+defeat.label;
      if(defeatSheet?.key!==key){
        const probe=canvas(width,100),cg=probe.getContext('2d'),size=v.w<500?22:26,lines=[];let line='';cg.font=`${size}px ${FONT}`;
        for(const word of defeat.label.split(/\s+/)){const next=line?line+' '+word:word;if(line&&cg.measureText(next).width>width-28){lines.push(line);line=word;}else line=next;}
        if(line)lines.push(line);
        const height=lines.length*(size+4)+16,c=uiCanvas(width,height),dg=c.getContext('2d');
        frame(dg,2,2,width-4,height-4,'#303c55','#e6b653',2);
        lines.forEach((text,i)=>label(dg,text,width/2,8+(size+4)*(i+.5),size,'#fff1be'));
        defeatSheet={key,canvas:c};
      }
      g.drawImage(defeatSheet.canvas,(v.w-width)/2,r.bottom+12);
    }
    // The direction remains useful after the arrival ribbon has faded.
    for (const boss of sv.bossOn) if (!boss.dead) {
      const p = W.toCss(w, boss.x, boss.y), top = r.bottom + 24;
      if (p.x >= 20 && p.x <= v.w - 20 && p.y >= top && p.y <= v.h - 20) continue;
      const dx = p.x - v.w/2, dy = p.y - (v.h + top)/2;
      const k = Math.min((v.w/2-24)/Math.max(.001,Math.abs(dx)), ((v.h-top)/2-24)/Math.max(.001,Math.abs(dy)));
      const x = v.w/2+dx*k, y = (v.h+top)/2+dy*k, angle = Math.atan2(dy,dx);
      g.save(); g.translate(x,y); g.rotate(angle);
      g.fillStyle='#ffb05b';g.strokeStyle=INK;g.lineWidth=3;
      g.beginPath();g.moveTo(13,0);g.lineTo(-10,-9);g.lineTo(-5,0);g.lineTo(-10,9);g.closePath();g.fill();g.stroke();g.restore();
    }
    const box = giftRect(w), gift = sv.gift;
    if (box) {
      const fast = gift.number > 1, age = S.moments.age(w,gift);
      const beamAt = .3, rewardAt = fast ? .4 : .65, coinAt = fast ? .55 : 1.05;
      const phase = age < beamAt ? 0 : age < rewardAt ? 1 : age < coinAt ? 2 : 3;
      const coins = phase < 3 ? 0 : Math.min(gift.coins, Math.round(gift.coins * Math.min(1,(age-coinAt)/(fast ? .2 : .5))));
      const shaking = phase === 0 && S.feedback.on(w, 'shake');
      const key = [box.w, phase, gift.evo?1:0, phase>=2?gift.name:'', phase>=2?gift.bonus:'', phase>=2?gift.slot:'', age>=.5, shaking].join('/');
      if(giftSheet?.key!==key&&giftPictures.has(key))giftSheet={key,canvas:giftPictures.get(key)};
      if (giftSheet?.key !== key) {
        const c = uiCanvas(box.w, box.h), cg = c.getContext('2d');
        frame(cg, 3, 3, box.w-6, box.h-6, '#1d2543', '#e6b653', 3);
        label(cg, gift.evo ? '무기 진화!' : '보물 꾸러미', box.w/2, 24, 25, '#ffe08a');
        const complete = shaking || momentPicture(w,cg,'chest',44,78,52);
        let loaded = complete;
        if (phase >= 2) {
          frame(cg,78,49,box.w-94,45,'#303c55','#b78737');
          loaded = momentPicture(w,cg,gift.slot,100,71,30) && loaded;
          // 「다음 강화 +2」는 아이가 뜻을 몰랐다(대표 10-18): 다음에 고르는 카드가 몇 단계 더 오르는지 그대로 적는다.
          label(cg,gift.evo ? gift.name : `다음 카드 +${gift.bonus}단계`, (box.w+116)/2,72,gift.evo?18:19,'#fff1be');
        }
        if (phase >= 3) {
          frame(cg,78,101,box.w-94,36,'#303c55','#b78737');
          loaded = momentPicture(w,cg,'coin',100,119,24) && loaded;
        }
        if(age>=.5)label(cg,'누르면 건너뛰어요',box.w/2,155,16,'#e0d7be');
        giftSheet = { key: loaded ? key : null, canvas:c };
        if(loaded){if(giftPictures.size>=32)giftPictures.delete(giftPictures.keys().next().value);giftPictures.set(key,c);}
      }
      // 끝 0.3초는 스르르 흐려진다(갑자기 사라지면 무엇을 받았는지 놓친다).
      g.save(); g.globalAlpha *= Math.max(0, Math.min(1, (gift.duration - age) / .3));
      g.drawImage(giftSheet.canvas,box.x,box.y);
      if(phase>=3)g.drawImage(giftCount(coins),box.x+(box.w+116)/2-64,box.y+99);
      if(shaking)momentPicture(w,g,'chest',box.x+44+Math.round(Math.sin(age*65)*3),box.y+78,52);
      if (phase===1 && S.feedback.on(w,'flash')) {
        if(!beamPic){beamPic=uiCanvas(64,112);const bg=beamPic.getContext('2d'),grad=bg.createLinearGradient(0,0,0,112);grad.addColorStop(0,'rgba(255,241,170,0)');grad.addColorStop(1,'rgba(255,241,170,.6)');bg.fillStyle=grad;bg.fillRect(0,0,64,112);}
        g.drawImage(beamPic,box.x+12,box.y+3,64,100);
      }
      g.restore();
    }
  }
  // Reuse static HUD pixels, with live experience fill, pointers and flashes.
  // Boss name/health and every other displayed value participate in the key.
  function cachedHUD(w, g) {
    const sv = w.sv;
    if (!fontsOk() || sv.kit.weapons.some(o => R.evolutionReady(w.content, sv.kit, o, w.family.tuning))) { hud(w, g); hudMotion(w,g); return; }
    const r = hudRects(w), dpr = w.px.dpr, height = Math.min(w.view.h, Math.ceil(r.bottom + 24));
    const kit = [...sv.kit.weapons, ...sv.kit.relics, ...sv.kit.allies].map(o => `${o.id}:${o.evo || ''}:${o.level}:${o.cracks || 0}`).join('|');
    const boss=sv.boss&&!sv.boss.dead?sv.boss:null;
    const bossFrame=boss&&!!hudArt(w,boss.def.role==='general'?'general-frame':'deputy-frame')?.spec.slice;
    const bossFillArt=boss&&!!hudArt(w,'hp-fill'),bossRatio=boss?clamp01(boss.hp/boss.hpMax):0;
    // Both fill paths already draw whole pixels. Damage that leaves those
    // pixels unchanged need not repaint every name and inventory icon.
    const bossFill=boss&&r.boss?(bossFillArt&&bossRatio>0?Math.max(1,Math.round((r.boss.w-(bossFrame?36:4))*bossRatio)):Math.round((r.boss.w-(bossFrame?36:4))*bossRatio)):0;
    const key = [w.view.w, w.view.h, w.view.top, w.view.controls, dpr, r.bottom, sv.cell?.id, sv.play, sv.act, sv.loop, sv.level, sv.heartMax, sv.fallenMoment ? 0 : w.lives, w.score,
      Math.ceil(w.timeLeft ?? 0), Math.ceil(sv.t), kit,boss?.def.id,bossFrame,bossFillArt,bossFill,sv.bossOn.some(b=>b.def.role==='general')].join('/');
    if (!hudCache || hudCache.key !== key) {
      const c = hudCache?.canvas || uiCanvas(Math.ceil(w.view.w * dpr), Math.ceil(height * dpr));
      if (c.width !== Math.ceil(w.view.w * dpr)) c.width = Math.ceil(w.view.w * dpr);
      if (c.height !== Math.ceil(height * dpr)) c.height = Math.ceil(height * dpr);
      const cg = c.getContext('2d'); cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height); cg.setTransform(dpr, 0, 0, dpr, 0, 0);
      hud(w, cg);hudCache = { key: missing ? null : key, canvas: c, height };
    }
    g.drawImage(hudCache.canvas,0,0,w.view.w,hudCache.height);
    hudMotion(w,g);
  }
  // 마지막으로 쓰러지면 판이 멈추고 화면이 천천히 어두워진다. 전투 보고는 그 위로 서서히 나타난다(result.js).
  function fallenOverlay(w, g) {
    const dark = S.moments.fallenDark(w.sv);
    if (dark <= 0) return;
    g.save(); g.globalAlpha = dark; g.fillStyle = '#070b14'; g.fillRect(0, 0, w.view.w, w.view.h); g.restore();
  }
  function draw(w, g) {
    if (!ready(w)) return;
    claim(w);
    warmNumbers(w);
    const coinCount=w.family.tuning.coins.chest;
    if(fontsOk()&&w.px.giftCountKey!==coinCount){for(let n=0;n<=Math.min(31,coinCount);n++)giftCount(n);w.px.giftCountKey=coinCount;}
    paint(w);
    battlefield(w, g);
    edgeOverlay(w, g); cachedHUD(w, g); combatOverlay(w, g); evolutionOverlay(w, g); momentsOverlay(w, g); fallenOverlay(w, g);
  }
  function battlefield(w, g, render = blit) {
    const sv = w.sv;
    // Restore the camera before any HUD text, buttons or question is drawn.
    g.save();
    const shakeLeft=S.feedback.left(w,'shakeTime');
    if (shakeLeft > 0 && !sv.choice && S.feedback.on(w, 'shake')) {
      g.beginPath(); g.rect(0, w.view.top, w.view.w, w.view.h - w.view.top); g.clip();
      let x=Math.sin(sv.t*173)*sv.shake*Math.min(1,shakeLeft*10),y=Math.cos(sv.t*139)*sv.shake*.65*Math.min(1,shakeLeft*10);
      if(w.art.pixel===true){x=Math.round(x);y=Math.round(y);}
      g.translate(x,y);
    }
    render(w, g); g.restore();
  }
  function drawBehindHUD(w, g) { if (!ready(w)) return; paint(w); blit(w, g); }

  S.scene = { layout, draw, drawBehindHUD, battlefield, hudRects, hud, hudMotion, cachedHUD, evolutionRect, giftRect, defeatRect, momentsOverlay, sprite, personPicture, walkFrame, commanderFrame, preparing, prepareStageBanners, prepareStageBosses, propAt, battleSpec };
})();
