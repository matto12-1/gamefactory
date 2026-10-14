(function () {
  'use strict';
  // 버티기 틀 화면. 작은 캔버스(그림 1칸 = 기기 화소 s칸)에 땅, 장식, 줍는 것, 몸, 발사체, 효과를 칠하고
  // 큰 캔버스에 정수 배로 옮긴 뒤 피해 숫자, 경험치 막대, 아이콘 줄, 보스 막대를 얹는다.
  // 흔들릴 때 껍데기가 한 프레임에 drawBehindHUD와 draw를 둘 다 부르므로 칠하기는 열쇠(px.key)가 바뀔 때만 한다.
  // 그림은 모두 오른쪽을 본다. 사본 표시: f 뒤집기, w 흰 번쩍, y 강한 적 금빛, r 다친 빨강.
  // 셋을 세는 동안 그림이 오기 전에도 그리므로, 빈 그림은 사본에 담지 않고 조금 뒤 다시 받는다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules, W = S.world;
  const doc = typeof document !== 'undefined';
  const PROPS = { field: [0, 1, 4, 10], hill: [2, 3, 4, 6], shore: [8, 2, 9], snow: [7, 11, 2], stone: [5, 9, 6, 2] };
  const TINT = { w: ['#ffffff', 1], y: ['#ffd23f', .45], r: ['#ff3b30', .45] };
  const ITEM_SHADOW = { coin: 10, chest: 16, scroll: 10, food: 10, magnet: 10 };
  const LIFT = 12, TILE = 256, CELL = 64, TURN = Math.PI / 16, FONT = 'DoHyeon, sans-serif', INK = '#141826';
  const sprites = new Map(), waits = new Map(), shadows = new Map(), tiles = new Map(), numPics = new Map();
  const bodies = [], propPool = [], bolt = new Float32Array(16);
  let owner = null, missing = false, fontReady = false, meter = null;
  const byY = (a, b) => a.y - b.y;
  const clamp01 = v => v > 0 ? v < 1 ? v : 1 : 0;

  function canvas(wd, ht, read) {
    const c = document.createElement('canvas'); c.width = wd; c.height = ht;
    c.getContext('2d', read ? { willReadFrequently: true } : undefined).imageSmoothingEnabled = false; return c;
  }
  function claim(w) { if (owner !== w.art) { owner = w.art; sprites.clear(); waits.clear(); shadows.clear(); tiles.clear(); } }
  function blank(g, wd, ht) {
    try { const d = g.getImageData(0, 0, wd, ht).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; } catch { return false; }
  }
  // 그림 칸 하나를 제 크기 캔버스로 받는다. v는 사본 표시(위 설명).
  function sprite(w, slot, v = '') {
    if (!doc || !w.art || !slot) return null;
    claim(w);
    const key = slot + ':' + v; let c = sprites.get(key);
    if (c !== undefined) return c;
    const s = w.art.slots?.[slot];
    if (!s) { sprites.set(key, null); return null; }
    if (!v) {
      const now = performance.now();
      if (now < (waits.get(slot) || 0)) { missing = true; return null; }
      const probe = canvas(s.w, s.h, true), pg = probe.getContext('2d');
      window.GFShell?.img?.(pg, slot, 0, 0, s.w, s.h);
      if (blank(pg, s.w, s.h)) { waits.set(slot, now + 200); missing = true; return null; }
      c = canvas(s.w, s.h); c.getContext('2d').drawImage(probe, 0, 0);
    } else {
      const base = sprite(w, slot); if (!base) return null;
      c = canvas(s.w, s.h); const g = c.getContext('2d');
      if (v.includes('f')) { g.translate(s.w, 0); g.scale(-1, 1); }
      g.drawImage(base, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
      const t = TINT[v.replace('f', '')];
      if (t) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(0, 0, s.w, s.h); }
    }
    sprites.set(key, c); return c;
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

  // 화면 크기가 바뀌거나 늦은 그림이 오면 껍데기가 부른다. 짧은 변이 그림 칸 약 360개가 되게 정수 배(s)를 고른다.
  function layout(w) {
    const v = w.view; if (!v) return;
    const dpr = doc ? Math.min(2, window.devicePixelRatio || 1) : 1, short = w.family?.tuning?.view?.short || 360;
    const s = Math.max(1, Math.round(Math.min(v.w, v.h) * dpr / short));
    const px = w.px || (w.px = { s: 1, dpr: 1, W: 1, H: 1, top: 0, off: null, oc: null, key: null });
    px.s = s; px.dpr = dpr; px.W = Math.max(1, Math.ceil(v.w * dpr / s)); px.H = Math.max(1, Math.ceil(v.h * dpr / s));
    px.top = (v.top || 0) * dpr / s; px.key = null;
    if (doc) {
      px.off ||= document.createElement('canvas');
      if (px.off.width !== px.W) px.off.width = px.W;
      if (px.off.height !== px.H) px.off.height = px.H;
      px.oc = px.off.getContext('2d'); px.oc.imageSmoothingEnabled = false;
      sprites.clear(); waits.clear();
    }
    if (w.sv) W.camera(w);
  }

  // 각도는 π/16 단위로 맞춰 픽셀이 덜 흔들리게 한다.
  function rot(g, c, x, y, ang = 0, sc = 1) {
    const a = Math.round(ang / TURN) * TURN;
    if (!a && sc === 1) { g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); if (a) g.rotate(a); if (sc !== 1) g.scale(sc, sc);
    g.drawImage(c, -(c.width >> 1), -(c.height >> 1)); g.restore();
  }

  function paint(w) {
    const sv = w.sv, px = w.px, g = px.oc, cam = sv.cam, h = sv.hero, pal = w.art.palette || {};
    const key = sv.t + ':' + cam.x + ':' + cam.y;
    if (px.key === key) return;
    missing = false;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
    const PW = px.W, PH = px.H, vis = (x, y, m) => x > -m && y > -m && x < PW + m && y < PH + m;

    // 바닥
    const t = tile(w, sv.ground);
    if (t) {
      const ox = -(((cam.x % TILE) + TILE) % TILE), oy = -(((cam.y % TILE) + TILE) % TILE);
      for (let y = oy; y < PH; y += TILE) for (let x = ox; x < PW; x += TILE) g.drawImage(t, x, y);
    } else { g.fillStyle = pal[sv.ground] || pal.field || '#828455'; g.fillRect(0, 0, PW, PH); }

    // 덫(끝나기 1초 전부터 깜빡)
    for (const tr of sv.traps) {
      const X = tr.x - cam.x, Y = tr.y - cam.y; if (!vis(X, Y, 16)) continue;
      if (tr.life - tr.t < 1 && ((sv.t * 8) | 0) % 2) continue;
      const c = sprite(w, tr.slot, tr.mine ? 'r' : ''); if (c) g.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - c.height / 2));
    }
    // 구슬
    for (const gm of sv.gems) {
      const X = gm.x - cam.x, Y = gm.y - cam.y; if (!vis(X, Y, 12)) continue;
      const c = sprite(w, 'gem-' + gm.tier); if (c) g.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - c.height));
    }
    // 줍는 것(상자와 두루마리는 들썩이고 반짝인다)
    for (const it of sv.items) {
      const X = it.x - cam.x, Y = it.y - cam.y; if (!vis(X, Y, 24)) continue;
      const c = sprite(w, it.type); if (!c) continue;
      const sw = ITEM_SHADOW[it.type];
      if (sw) { const sh = shadow(w, sw); g.drawImage(sh, Math.round(X - sw / 2), Math.round(Y - sh.height / 2)); }
      const big = it.type === 'chest' || it.type === 'scroll', bob = big ? Math.round(Math.sin(sv.t * 4 + it.x * .1) * 1.5) - 1 : 0;
      const x0 = Math.round(X - c.width / 2), y0 = Math.round(Y - c.height) + bob;
      g.drawImage(c, x0, y0);
      if (big && (sv.t + (it.x & 7) * .13) % 1 < .25) { const sp = sprite(w, 'fx-spark'); if (sp) g.drawImage(sp, x0 + c.width - 4, y0 - 4); }
    }

    // 몸: 장식, 주인공, 동료, 적, 배를 발 높이(y) 차례로
    bodies.length = 0; let pi = 0;
    const list = PROPS[sv.ground] || PROPS.field, seed = sv.era * 7 + sv.loop * 131 + 1;
    const i0 = Math.floor(cam.x / CELL) - 1, i1 = Math.floor((cam.x + PW) / CELL) + 1;
    const j0 = Math.floor(cam.y / CELL) - 1, j1 = Math.floor((cam.y + PH) / CELL) + 2;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const hs = hash(i, j, seed); if ((hs & 255) >= 44) continue;
      const p = propPool[pi] || (propPool[pi] = { prop: true, slot: '', x: 0, y: 0 }); pi++;
      p.slot = 'prop-' + list[(hs >>> 8) % list.length]; p.x = i * CELL + 8 + (hs >>> 10) % 48; p.y = j * CELL + 8 + (hs >>> 20) % 48;
      bodies.push(p);
    }
    bodies.push(h);
    for (const b of sv.allyBodies) bodies.push(b);
    for (const f of sv.foes) if (!f.dead && vis(f.x - cam.x, f.y - cam.y, 80)) bodies.push(f);
    for (const o of sv.orbs) bodies.push(o);
    for (const o of bodies) {
      if (o.prop) continue;
      const sw = o === h ? 16 : o.def ? (o.boss ? 48 : o.kind === 'elite' ? 36 : 18) : o.slot ? 32 : 16, sh = shadow(w, sw);
      g.drawImage(sh, Math.round(o.x - cam.x - sw / 2), Math.round(o.y - cam.y - sh.height / 2));
    }
    bodies.sort(byY);
    for (const o of bodies) {
      const X = Math.round(o.x - cam.x), Y = Math.round(o.y - cam.y);
      if (o.prop) { const c = sprite(w, o.slot); if (c) g.drawImage(c, X - (c.width >> 1), Y - c.height); continue; }
      if (o === h) {
        if (h.invuln > 0 && !(h.hurt > 0) && ((sv.t / .1) | 0) % 2) continue;
        const c = sprite(w, `person-${h.person}-${h.moving && ((h.anim / .18) | 0) % 2 ? 'b' : 'a'}`, (h.hurt > 0 ? 'r' : '') + (h.faceX < 0 ? 'f' : ''));
        if (c) g.drawImage(c, X - 12, Y - 30);
        continue;
      }
      if (o.def) {
        const v = (o.flash > 0 ? 'w' : o.kind === 'elite' ? 'y' : '') + (o.faceX < 0 ? 'f' : '');
        if (o.boss) { const c = sprite(w, 'boss-' + o.sprite, v); if (c) g.drawImage(c, X - 36, Y - 68 + Math.round(Math.sin(sv.t * 3) * 2)); continue; }
        const c = sprite(w, `foe-${o.sprite}-${(((sv.t + o.phase) / .18) | 0) % 2 ? 'b' : 'a'}`, v); if (!c) continue;
        if (o.kind === 'elite') g.drawImage(c, X - 28, Y - 52, 56, 56); else g.drawImage(c, X - 14, Y - 26);
        continue;
      }
      if (o.slot) { const c = sprite(w, o.slot, o.flip ? 'f' : ''); if (c) rot(g, c, X, Y - LIFT / 2, 0, o.scale || 1); continue; }
      const c = sprite(w, `person-${o.person}-${o.moving && ((o.anim / .18) | 0) % 2 ? 'b' : 'a'}`, o.faceX < 0 ? 'f' : '');
      if (c) g.drawImage(c, X - 12, Y - 30 - (o.act > 0 ? 2 : 0));
    }

    // 발사체
    for (const s of sv.shots) {
      const X = s.x - cam.x, Y = s.y - cam.y; if (!vis(X, Y, 48)) continue;
      const wave = s.slot === 'shot-wave', c = sprite(w, s.slot, (s.upright || wave) && s.vx < 0 ? 'f' : ''); if (!c) continue;
      if (s.lob) { const sh = shadow(w, 8); g.drawImage(sh, Math.round(X - 4), Math.round(Y - sh.height / 2)); rot(g, c, X, Y - LIFT - (s.z || 0), s.ang); }
      else if (s.upright) g.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - c.height));
      else if (wave) g.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - LIFT - c.height / 2));
      else rot(g, c, X, Y - LIFT, s.ang);
    }

    // 효과
    for (const e of sv.fx) {
      const k = clamp01(e.t / (e.life || 1)), fade = k > .6 ? (1 - k) / .4 : 1;
      const x = (e.follow ? h.x + (e.ox || 0) : e.x) - cam.x, y = (e.follow ? h.y + (e.oy || 0) : e.y) - cam.y;
      if (e.kind !== 'flood' && !vis(x, y, 160)) continue;
      switch (e.kind) {
        case 'smoke': case 'dust': {
          const m = Math.max(1, Math.round(e.size || 1)), c = sprite(w, 'fx-smoke-' + Math.min(2, (k * 3) | 0)); if (!c) break;
          const sz = 16 * m, rise = e.kind === 'smoke' ? k * 8 : 4;
          g.globalAlpha = e.kind === 'dust' ? .8 : 1;
          g.drawImage(c, Math.round(x - sz / 2), Math.round(y - sz / 2 - rise), sz, sz); g.globalAlpha = 1; break;
        }
        case 'boom': {
          const m = Math.max(1, Math.round(e.size || 1)), c = sprite(w, 'fx-boom-' + (k < .5 ? 0 : 1)); if (!c) break;
          const sz = 32 * m; g.drawImage(c, Math.round(x - sz / 2), Math.round(y - LIFT / 2 - sz / 2), sz, sz); break;
        }
        case 'spark': {
          const c = sprite(w, 'fx-spark'); if (!c) break;
          g.globalAlpha = 1 - k; g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - LIFT - c.height / 2)); g.globalAlpha = 1; break;
        }
        case 'heal': {
          g.globalAlpha = 1 - k; g.fillStyle = '#5fd36a';
          for (let i = 0; i < 3; i++) {
            const cx = Math.round(x + (i - 1) * 6), cy = Math.round(y - k * 10 - (i === 1 ? 3 : 0));
            g.fillRect(cx - 1, cy - 3, 2, 6); g.fillRect(cx - 3, cy - 1, 6, 2);
          }
          g.globalAlpha = 1; break;
        }
        case 'img': {
          const c = sprite(w, e.slot, e.flip ? 'f' : ''); if (!c) break;
          const a = e.ang || 0, sl = (e.slide || 0) * k;
          g.globalAlpha = fade; rot(g, c, x + Math.cos(a) * sl, y - (e.lift ?? LIFT) + Math.sin(a) * sl, a, e.scale || 1); g.globalAlpha = 1; break;
        }
        case 'spin': {
          const c = sprite(w, e.slot || 'shot-swing'); if (!c) break;
          const sc = (e.r || 40) * 2 / c.width;
          g.globalAlpha = fade; for (let i = 0; i < 2; i++) rot(g, c, x, y - 6, sv.t * 14 + i * Math.PI, sc); g.globalAlpha = 1; break;
        }
        case 'ring': {
          g.globalAlpha = 1 - k; g.strokeStyle = e.color || '#ffffff'; g.lineWidth = 2;
          g.beginPath(); g.arc(Math.round(x), Math.round(y - 6), (e.r || 30) * (.55 + .45 * k), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; break;
        }
        case 'bolt': {
          let s = ((e.seed || 0) * 4294967296) >>> 0, bx = x;
          for (let i = 0; i < 8; i++) {
            bolt[i * 2] = i === 7 ? x : bx; bolt[i * 2 + 1] = y - 140 + i * 20;
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0; bx += (s / 4294967296 - .5) * 18;
          }
          g.globalAlpha = 1 - k * .5; g.lineJoin = 'miter';
          for (const [col, lw] of [['#ffd23f', 3], ['#ffffff', 1]]) {
            g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(bolt[0], bolt[1]);
            for (let i = 2; i < 16; i += 2) g.lineTo(bolt[i], bolt[i + 1]);
            g.stroke();
          }
          g.globalAlpha = 1; break;
        }
        case 'flood': {
          g.globalAlpha = .28 * (1 - k); g.fillStyle = '#3a7bd5'; g.fillRect(0, 0, PW, PH);
          const wy = Math.round(PH * (1 - k)); g.globalAlpha = 1 - k; g.fillStyle = '#e8f4ff';
          for (let X = 0; X < PW; X += 6) g.fillRect(X, wy + Math.round(Math.sin(X * .15 + sv.t * 12) * 2), 3, 1);
          g.globalAlpha = 1; break;
        }
      }
    }

    // 주인공 체력 막대
    const HX = Math.round(h.x - cam.x), HY = Math.round(h.y - cam.y);
    g.fillStyle = pal.ink || INK; g.fillRect(HX - 10, HY + 3, 20, 3);
    g.fillStyle = pal.hp || '#d65858'; g.fillRect(HX - 9, HY + 4, Math.round(18 * clamp01(h.hp / h.hpMax)), 1);

    px.key = missing ? null : key;
  }

  function blit(w, g) {
    const px = w.px;
    g.imageSmoothingEnabled = false;
    g.drawImage(px.off, 0, 0, px.W * px.s / px.dpr, px.H * px.s / px.dpr);
  }

  function label(g, str, x, y, size, color, outline = INK, align = 'center') {
    g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
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
    if (numPics.size > 300) numPics.clear();
    meter ||= document.createElement('canvas').getContext('2d');
    meter.font = `${size}px ${FONT}`;
    const text = String(v), cw = Math.ceil(meter.measureText(text).width + size * .6), ch = Math.ceil(size * 1.5);
    c = document.createElement('canvas'); c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr); c.cssW = cw; c.cssH = ch;
    const g = c.getContext('2d'); g.scale(dpr, dpr); label(g, text, cw / 2, ch / 2, size, big ? '#ffd23f' : '#ffffff');
    numPics.set(key, c); return c;
  }

  // 화면 위 글 칸(CSS px, 세계 사각형 기준). 엔진의 effectLabels도 이것을 쓴다.
  function hudRects(w) {
    const v = w.view, sv = w.sv; if (!v || !sv) return null;
    const sz = Math.max(16, Math.min(32, Math.floor((v.w - 16) / 10) - 2));
    const groups = [sv.kit.weapons, sv.kit.relics, sv.kit.allies].filter(a => a.length);
    const n = groups.reduce((a, l) => a + l.length, 0);
    const b = sv.boss && !sv.boss.dead ? sv.boss : null, bw = Math.min(320, v.w - 32);
    return {
      xp: { x: 8, y: v.top + 6, w: v.w - 16, h: 14 },
      icons: { x: 8, y: v.top + 26, w: Math.max(sz, n * (sz + 2) + Math.max(0, groups.length - 1) * 4), h: sz, size: sz },
      stage: { x: 8, y: v.top + 30 + sz, w: v.w - 16, h: 42 },
      boss: b ? { x: (v.w - bw) / 2, y: v.h - 36, w: bw, h: 24 } : null
    };
  }

  function hud(w, g) {
    const sv = w.sv, v = w.view, px = w.px, pal = w.art.palette || {}, r = hudRects(w), T = R.T, ink = pal.ink || INK;
    g.save(); g.imageSmoothingEnabled = false;

    // 피해 숫자
    const k = px.s / px.dpr, fonts = fontsOk();
    for (const n of sv.nums) {
      const p = W.toCss(w, n.x, n.y - n.t * 30);
      if (p.x < -40 || p.y < v.top - 20 || p.x > v.w + 40 || p.y > v.h + 20) continue;
      const big = n.v > 50, size = Math.round(Math.max(12, 7 * k) * (big ? 1.4 : 1));
      g.globalAlpha = n.t < .4 ? 1 : clamp01((.6 - n.t) / .2);
      if (fonts) { const c = numPic(n.v, size, big, px.dpr); g.drawImage(c, Math.round(p.x - c.cssW / 2), Math.round(p.y - c.cssH / 2), c.cssW, c.cssH); }
      else label(g, String(n.v), p.x, p.y, size, big ? '#ffd23f' : '#ffffff', ink);
    }
    g.globalAlpha = 1;

    // 경험치 막대
    const xp = r.xp, need = R.xpNeed(sv.level, w.family.tuning.xp);
    g.fillStyle = 'rgba(20,24,38,.75)'; g.fillRect(xp.x, xp.y, xp.w, xp.h);
    g.fillStyle = pal.xp || '#429ce7'; g.fillRect(xp.x + 2, xp.y + 2, Math.round((xp.w - 4) * clamp01(sv.xp / need)), xp.h - 4);
    g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(xp.x + 1, xp.y + 1, xp.w - 2, xp.h - 2);
    label(g, `${T.level} ${sv.level}`, xp.x + 8, xp.y + xp.h / 2 + 1, 12, '#ffffff', ink, 'left');

    // 아이콘 줄: 무기, 유물, 동료
    const ic = r.icons, sz = ic.size, img = window.GFShell?.img; let x = ic.x, first = true;
    for (const list of [sv.kit.weapons, sv.kit.relics, sv.kit.allies]) {
      if (!list.length) continue;
      if (!first) x += 4; first = false;
      for (const it of list) {
        g.fillStyle = 'rgba(20,24,38,.6)'; g.fillRect(x, ic.y, sz, sz);
        const slot = R.picSlot(w.content, it.evo || it.id); if (slot && img) img(g, slot, x + 1, ic.y + 1, sz - 2, sz - 2);
        if (it.evo) { g.strokeStyle = pal.gold || '#e6b653'; g.lineWidth = 2; g.strokeRect(x + 1, ic.y + 1, sz - 2, sz - 2); }
        else label(g, String(it.level), x + sz - 5, ic.y + sz - 6, 10, '#ffffff', ink);
        if (it.cracks > 0) {
          g.strokeStyle = '#ff3b30'; g.lineWidth = 2; g.beginPath();
          g.moveTo(x + sz * .25, ic.y + 2); g.lineTo(x + sz * .5, ic.y + sz * .4); g.lineTo(x + sz * .35, ic.y + sz * .6); g.lineTo(x + sz * .6, ic.y + sz - 3);
          g.stroke();
        }
        x += sz + 2;
      }
    }

    // 시대와 목표는 시작 효과가 사라진 뒤에도 보인다.
    const stageBox = r.stage, battle = sv.battle, era = w.content.eras.find(e => e.id === battle.era)?.name || '';
    g.fillStyle = 'rgba(20,24,38,.7)'; g.fillRect(stageBox.x, stageBox.y, stageBox.w, stageBox.h);
    label(g, `${sv.tier}단계 · ${era} · ${Math.round(sv.duration / 60)}분 버티기`, v.w / 2, stageBox.y + 12, 14, '#ffe08a', ink);
    label(g, `${battle.name} · ${battle.year}`, v.w / 2, stageBox.y + 30, 12, '#ffffff', ink);

    // 보스 막대
    if (r.boss) {
      const b = sv.boss, bx = r.boss.x, bw = r.boss.w, by = v.h - 22;
      g.fillStyle = 'rgba(20,24,38,.75)'; g.fillRect(bx, by, bw, 10);
      g.fillStyle = pal.hp || '#d65858'; g.fillRect(bx + 1, by + 1, Math.round((bw - 2) * clamp01(b.hp / b.hpMax)), 8);
      g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(bx, by, bw, 10);
      label(g, b.def.name, v.w / 2, by - 8, 13, '#ffffff', ink);
    }

    // 화면 밖 상자와 두루마리를 가리키는 화살표
    const top = ic.y + ic.h + 14, L = 18, RT = v.w - 18, B = v.h - 18, cx = v.w / 2, cy = (top + B) / 2;
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
    if (sv.flash > 0) { g.globalAlpha = Math.min(.35, sv.flash / .15 * .35); g.fillStyle = '#ffffff'; g.fillRect(0, 0, v.w, v.h); g.globalAlpha = 1; }
    g.restore();
  }

  const ready = w => doc && w.sv?.begun && w.px?.oc && w.art;
  function draw(w, g) { if (!ready(w)) return; paint(w); blit(w, g); hud(w, g); }
  function drawBehindHUD(w, g) { if (!ready(w)) return; paint(w); blit(w, g); }

  S.scene = { layout, draw, drawBehindHUD, hudRects, sprite };
})();
