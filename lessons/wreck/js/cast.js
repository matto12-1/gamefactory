// 돼지네 식구들: 건물마다 새 식구가 나와 놀이에 맞춰 움직인다. 놀이 값은 건드리지 않고 그리기만 한다.
// 첫 건물은 상자, 둘째는 폭탄, 셋째는 대포. 옆자리가 없는 세로 화면은 문 · 돼지 왕 · 돼지만 나온다. 모두 건물 뒤에 그려 숫자를 가리지 않는다.
'use strict';
const castFrame = (name, t, fps = 12, loop = true) => { const n = ATLAS[name].n, i = Math.max(0, Math.floor(t * fps)); return loop ? i % n : Math.min(n - 1, i); };
const door = { mode: 'closed', t: 0 }, kpRoof = { mode: 'idle', t: 0, dur: 0 }, kpWho = { x: 0, y: -99, up: 16 };
const THROWERS = {
  box: { idle: 'bpIdle', pick: 'bpPick', run: 'bpRun', act: 'bpThrow', fly: 'bxIdle' },
  bomb: { idle: 'mpIdle', pick: 'mpPick', run: 'mpRun', act: 'mpThrow', fly: 'bmOn' },
};
let guests = [], flying = [], crates = [], bombProp = null, hearts2 = [], ptsPops = [], heartAt = { x: 0, y: 0 }, castT = 0, castThrowAt = -99, castBubAt = -99, castHello = true, kpSaid = false;
const doorX = () => 23;
function castDoor(open) { door.mode = open ? 'opening' : 'closing'; door.t = 0; if (open) sfxDoor(); }
function castBub(name, who, gap = 1.6) { if (castT - castBubAt < gap) return; castBubAt = castT; bubbles.push({ name, who, t: 0, dur: .85 }); }
function kpAct(mode, dur) { kpRoof.mode = mode; kpRoof.t = 0; kpRoof.dur = dur; }
function castGuest(kind, x, side, mode) { const g = { kind, home: x, x: mode === 'enter' ? (side < 0 ? -20 : W + 20) : x, side, y: -30, vy: 0, mode, t: 0, wait: 1 + Math.random() * 2, up: 34 }; guests.push(g); return g; }
const castFind = kind => guests.find(g => g.kind === kind && g.mode !== 'leave');
// 건물이 들어설 때 그 건물의 식구를 세운다
// settled: 창 크기가 바뀌어 자리만 다시 잡는다. 입장을 되풀이하지 않고 터진 폭탄을 살리지 않는다
function castStage(b, settled = false) {
  if (settled && sim.s.phase === 'clear') return;
  b = sim.cfg.final ? 2 : b % 3; // 왕의 성은 대포 무리, 끝없는 성은 무리가 돌아가며 나온다
  const burnt = settled && bombProp && bombProp.gone, M = m => settled ? 'idle' : m;
  guests = guests.filter(g => g.mode === 'leave'); bombProp = null; crates = [];
  crowd[0].gone = b < 2; crowd[1].gone = b >= 1;
  if (!WIDE) return;
  const L = BX - 16, R1 = BX + BW + 14, R2 = Math.min(W - 13, BX + BW + 38);
  if (b === 0) { crates = [{ x: Math.min(W - 11, BX + BW + 52), hit: 0 }]; castGuest('box', R2, 1, M('enter')); castGuest('hide', L, -1, M('fallIn')); }
  else if (b === 1) { castGuest('bomb', L, -1, M('enter')); castGuest('hide', R2, 1, M('fallIn')); bombProp = sim.cfg.bomb ? null : { x: R1, gone: burnt }; } // 폭탄 칸이 있는 단계는 바닥 폭탄을 치운다(눌러 보게 된다)
  else { castGuest('cannon', R1 + 2, 1, M('fallIn')); castGuest('match', R2, 1, M('fallIn')); bombProp = sim.cfg.bomb ? null : { x: BX - 36, gone: burnt }; }
}
// 판을 새로 시작할 때: 왕은 문에서 나온다
function castReset() {
  flying = []; hearts2 = []; ptsPops = []; castT = 0; castThrowAt = -99; castBubAt = -99; guests = []; kpRoof.mode = 'idle'; castHello = true; kpSaid = false; kpWho.y = -99;
  castStage(sim.s.building);
  for (const c of crowd) c.x = c.gone ? (c.side < 0 ? -24 : W + 24) : crowdHome(c);
  castDoor(true); hero.x = doorX(); hero.y = GY; hero.mode = 'doorWait'; hero.flip = 1;
}
function castThrow(g) {
  const T = THROWERS[g.kind], tx = hero.mode === 'fallBad' ? hero.kx : hero.x, sx = g.x + (g.side < 0 ? 8 : -8), sy = GY - 26;
  sfxThrow();
  flying.push({ kind: g.kind, name: T.fly, x0: sx, y0: sy, x1: tx, y1: GY - 8, t: 0, dur: .42, arc: 26 });
}
function castEvent(e) {
  const s = sim.s, lastB = s.building === sim.cfg.buildings - 1;
  switch (e.t) {
    case 'land':
      pigs = pigs.filter(p => !p.die);
      if (castHello && !crowd[1].gone && WIDE) { castHello = false; castBub('bubHello', crowd[1]); }
      { const g = castFind('bomb'); if (g) castBub('bubHi', g); } // 말풍선은 나올 때만. 틀린 순간에 말을 걸면 놀리는 말로 읽힌다
      break;
    case 'clear':
      crowd[0].gone = crowd[1].gone = true;
    case 'next': // 건물이 무너지면 식구가 달아난다. 대포는 그 자리에 남는다
      for (const g of guests) if (g.kind !== 'cannon') { g.mode = 'leave'; g.t = 0; g.vy = -F * 7; }
      break;
    case 'wrong': {
      const m = castFind('match'); if (m && m.mode !== 'fallIn') m.mode = 'idle';
      const g = guests.find(q => THROWERS[q.kind] && q.mode === 'idle');
      if (g && castT - castThrowAt > 6) { castThrowAt = castT; g.mode = 'act'; g.t = 0; g.thrown = false; } // 일부러 틀려 구경하지 않게 간격을 둔다
      if (lastB) kpAct('attack', .42);
      break;
    }
    case 'crush':
      hearts2.push({ x: hero.x, y: hero.y - 18, t: 0 });
      if (lastB) kpAct('attack', .42);
      if (bombProp && !bombProp.gone) { bombProp.gone = true; addBoom(bombProp.x, GY - 6); sfxBomb(); }
      break;
    case 'contact':
      if (e.pts > 0) ptsPops = [{ v: e.pts, t: 0 }];
      break;
    case 'heal':
      hearts2.push({ fly: true, x: hero.x, y: hero.y - 20, x0: hero.x, y0: hero.y - 20, t: -.1 });
      break;
    case 'break': {
      if (lastB && e.left > 0) {
        if (e.left <= 4) { kpAct('hit', .2); if (e.left === 4) castBub('bubNo', kpWho); }
        else kpAct('hop', .3);
      }
      if (e.tier === 'mid') {
        for (const c of crates) c.hit = .08;
        const h = castFind('hide'); if (h && (h.mode === 'idle' || h.mode === 'peek')) { h.mode = 'pre'; h.t = 0; }
      }
      const m = castFind('match'), cn = castFind('cannon');
      if (m && cn && m.mode !== 'fallIn' && e.left > 0) {
        if (e.streak % 5 === 4 && e.streak > 0) { m.mode = 'light'; m.t = 0; }
        else if (e.streak % 5 === 0 && e.streak > 0) { m.mode = 'fire'; m.t = 0; }
      }
      break;
    }
  }
}
function castUpdate(dt, rdt) {
  castT += rdt; door.t += rdt;
  if (door.mode === 'opening' && door.t >= 5 / 12) door.mode = 'open';
  if (door.mode === 'closing' && door.t >= 3 / 12) door.mode = 'closed';
  kpRoof.t += dt; if (kpRoof.mode !== 'idle' && kpRoof.t >= kpRoof.dur) kpRoof.mode = 'idle';
  if (!kpSaid && sim.s.phase === 'play' && kpWho.y - kpWho.up > hudBottom()) { kpSaid = true; castBub('bubAtk', kpWho, 0); } // 돼지 왕이 처음 보일 때
  for (const c of crates) c.hit = Math.max(0, c.hit - rdt);
  for (const c of crowd) c.y = groundY(c.x);
  for (let i = guests.length - 1; i >= 0; i--) if (castStep(guests[i], dt)) guests.splice(i, 1);
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]; f.t += dt; const k = Math.min(1, f.t / f.dur);
    f.x = lerp(f.x0, f.x1, k); f.y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
    if (k >= 1) { castLand(f); flying.splice(i, 1); }
  }
  for (let i = hearts2.length - 1; i >= 0; i--) {
    const h = hearts2[i]; h.t += dt;
    if (h.fly) { if (h.t < 0) continue; const k = Math.min(1, h.t / .5), e = k * k; h.x = lerp(h.x0, heartAt.x, e); h.y = lerp(h.y0, heartAt.y, e); if (k >= 1) { stars.push({ name: 'heartHit', x: heartAt.x, y: heartAt.y, t: 0 }); hearts2.splice(i, 1); } }
    else { h.y -= F * 1.6 * dt; if (h.t >= .4) hearts2.splice(i, 1); }
  }
  for (let i = ptsPops.length - 1; i >= 0; i--) { ptsPops[i].t += rdt; if (ptsPops[i].t >= .6) ptsPops.splice(i, 1); }
}
function castLand(f) {
  if (f.kind === 'box') {
    addPuffs(f.x, f.y, 2, .6); sfxBoxBreak();
    for (let i = 0; i < 4; i++) { const sp = pieces[i % 4]; chunks.push({ sp, w: sp.w, h: sp.h, x: f.x, y: f.y, vx: rand(-F * 3, F * 3), vy: -F * rand(2, 5), r: 0, vr: rand(-9, 9), bounces: 1, keep: false, life: 0, max: .6 }); }
  } else if (f.kind === 'bomb') { stars.push({ name: 'fxStarM', x: f.x, y: f.y, t: 0 }); addPuffs(f.x, GY, 2, .6); sfxBomb(.1); } // 틀림에 나오는 것이라 크게 터뜨리지 않는다
  else { stars.push({ name: 'fxStarM', x: f.x, y: f.y, t: 0 }); addDust(f.x, f.y, 8, 1); addShake(.5, .1); sfxBoxBreak(); }
}
// 돌아가는 일이 끝나 지울 때 true
function castStep(g, dt) {
  g.t += dt;
  if (g.mode !== 'fallIn' && g.mode !== 'leave') g.y = groundY(g.x);
  if (g.mode === 'leave') {
    if (THROWERS[g.kind]) { const tx = g.side < 0 ? -24 : W + 24; g.x += Math.sign(tx - g.x) * F * 8 * dt; return Math.abs(tx - g.x) < 2; }
    g.vy += GRAV * dt; g.y0 = (g.y0 ?? 0) + g.vy * dt; g.x += g.side * F * 6 * dt; return g.y0 > 0 && g.t > .3 || g.x < -24 || g.x > W + 24;
  }
  if (g.mode === 'fallIn') {
    g.vy += GRAV * 1.4 * dt; g.y += g.vy * dt;
    if (g.y >= groundY(g.x)) { g.y = groundY(g.x); g.mode = 'idle'; g.t = 0; addPuffs(g.x, GY, 1, .5); sfxLand(.3); }
    return false;
  }
  if (g.mode === 'enter') {
    const d = g.home - g.x, step = F * 8 * dt;
    if (Math.abs(d) <= step) { g.x = g.home; g.mode = 'idle'; g.t = 0; } else g.x += Math.sign(d) * step;
    return false;
  }
  if (THROWERS[g.kind]) {
    if (g.mode === 'act') { if (!g.thrown && g.t >= 3 / 14) { g.thrown = true; castThrow(g); } if (g.t >= 5 / 14) { g.mode = 'pick'; g.t = 0; } }
    else if (g.mode === 'pick' && g.t >= ATLAS[THROWERS[g.kind].pick].n / 10) { g.mode = 'idle'; g.t = 0; }
  } else if (g.kind === 'hide') {
    if (g.mode === 'idle' && g.t >= g.wait) { g.mode = 'peek'; g.t = 0; g.wait = 1.5 + Math.random() * 2.5; }
    else if (g.mode === 'peek' && g.t >= .7) { g.mode = 'idle'; g.t = 0; }
    else if (g.mode === 'pre' && g.t >= .16) { g.mode = 'jump'; g.t = 0; g.vy = -F * 7; g.hop = 0; g.x0 = g.x; g.tx = g.home + (g.x > g.home ? -7 : 7); }
    else if (g.mode === 'jump') { g.vy += GRAV * dt; g.hop += g.vy * dt; g.x = lerp(g.x0, g.tx, clamp(g.t / .7, 0, 1)); if (g.hop >= 0 && g.t > .1) { g.hop = 0; g.mode = 'ground'; g.t = 0; addPuffs(g.x, GY, 1, .5); } }
    else if (g.mode === 'ground' && g.t >= .12) { g.mode = 'idle'; g.t = 0; }
  } else if (g.kind === 'match') {
    if (g.mode === 'light' && g.t >= 3 / 10) { g.mode = 'on'; g.t = 0; }
    else if (g.mode === 'fire' && g.t >= 3 / 10) {
      g.mode = 'idle'; g.t = 0; const cn = castFind('cannon');
      if (cn) { cn.mode = 'shoot'; cn.t = 0; sfxCannon(); castBub('bubBoom', g); flying.push({ kind: 'ball', name: 'cnBall', x0: cn.x - 20, y0: GY - 18, x1: BX + BW - 3, y1: Math.min(GY - 18, bottomY() - 8), t: 0, dur: .2, arc: 0 }); }
    }
  } else if (g.kind === 'cannon') {
    if (g.mode === 'shoot' && g.t >= 4 / 14) { g.mode = 'idle'; g.t = 0; }
  }
  return false;
}
function castDrawGuest(g) {
  const gy = g.mode === 'fallIn' ? g.y : groundY(g.x), flip = g.side < 0, T = THROWERS[g.kind]; let name, i = 0, y = gy, dx = 0;
  if (T) {
    if (g.mode === 'enter' || g.mode === 'leave') { name = T.run; i = castFrame(name, g.t, 14); }
    else if (g.mode === 'act') { name = T.act; i = castFrame(name, g.t, 14, false); }
    else if (g.mode === 'pick') { name = T.pick; i = castFrame(name, g.t, 10, false); }
    else { name = T.idle; i = castFrame(name, castT, 10); }
    const moving = g.mode === 'enter' || g.mode === 'leave', right = moving ? (g.mode === 'enter' ? g.home > g.x : g.side > 0) : flip;
    spr(name, i, g.x - ATLAS[name].w / 2, y - ATLAS[name].h, right); return;
  }
  if (g.kind === 'hide') {
    if (g.mode === 'leave') { name = 'hpJump'; y = GY + (g.y0 ?? 0); }
    else if (g.mode === 'fallIn') name = 'hpFall';
    else if (g.mode === 'peek') { name = 'hpLook'; i = [0, 1, 2, 2, 1, 0][Math.min(5, Math.floor(g.t / .7 * 6))]; }
    else if (g.mode === 'pre') { name = 'hpPre'; i = castFrame(name, g.t, 12, false); }
    else if (g.mode === 'jump') { name = g.vy < 0 ? 'hpJump' : 'hpFall'; i = g.vy < -F ? 0 : 1; y += g.hop; }
    else if (g.mode === 'ground') name = 'hpGround';
    else name = 'hpLook';
    spr(name, i, g.x - ATLAS[name].w / 2, y - ATLAS[name].h, flip); return;
  }
  if (g.kind === 'match') {
    if (g.mode === 'leave') y = GY + (g.y0 ?? 0);
    if (g.mode === 'light') { name = 'mLight'; i = castFrame(name, g.t, 10, false); }
    else if (g.mode === 'on') { name = 'mOn'; i = castFrame(name, g.t, 10); }
    else if (g.mode === 'fire') { name = 'mCannon'; i = castFrame(name, g.t, 10, false); }
    else name = 'mLight';
    spr(name, i, g.x - ATLAS[name].w / 2, y - ATLAS[name].h, flip); return;
  }
  name = g.mode === 'shoot' ? 'cnShoot' : 'cnIdle'; i = g.mode === 'shoot' ? castFrame(name, g.t, 14, false) : 0; dx = 7; // 그림 칸 왼쪽이 포구 불꽃 자리라 몸통을 가운데로
  spr(name, i, g.x - 22 - dx, y - 25, false);
}
// 땅에 선 것들: 문 · 상자 · 폭탄 · 식구 · 날아가는 것. 건물과 왕보다 먼저 그린다
function castDrawBack() {
  const dx = doorX() - 23, dy = (scene === 'end' && endTopPanel() && Hc < 320 && sim.s.phase === 'clear' ? kingGroundY(doorX()) : GY) - 56;
  if (door.mode === 'opening') spr('drOpen', castFrame('drOpen', door.t, 12, false), dx, dy);
  else if (door.mode === 'open') spr('drOpen', 4, dx, dy);
  else if (door.mode === 'closing') spr('drClose', castFrame('drClose', door.t, 12, false), dx, dy);
  else spr('drIdle', 0, dx, dy);
  for (const c of crates) { const a = ATLAS.bxIdle; spr(c.hit > 0 ? 'bxHit' : 'bxIdle', 0, c.x - (a.w >> 1), GY - a.h); }
  if (bombProp && !bombProp.gone) {
    const on = sim.s.phase === 'play' && sim.s.gap < .9, a = ATLAS.bmOff, bx = bombProp.x - (a.w >> 1), by = groundY(bombProp.x) - a.h;
    if (on) spr('bmOn', castFrame('bmOn', castT, 10), bx, by); else spr('bmOff', 0, bx, by);
  }
  for (const g of guests) castDrawGuest(g);
  for (const f of flying) { const a = ATLAS[f.name]; spr(f.name, f.name === 'bmOn' ? castFrame('bmOn', castT, 12) : 0, f.x - a.w / 2, f.y - a.h / 2); }
}
// 떨어져 나가는 작은 하트(놀이 판 위) · 되찾은 하트
function castDrawTop() {
  if (scene === 'end' && endTopPanel() && Hc < 320 && hero.mode === 'doorIn' && door.mode === 'closing') {
    spr('drClose', castFrame('drClose', door.t, 12, false), doorX() - 23, kingGroundY(doorX()) - 56);
  }
  for (const h of hearts2) {
    if (h.t < 0) continue;
    if (h.fly) spr('heart', 0, h.x - 7, h.y - 6);
    else spr('smHeartHit', h.t < .12 ? 0 : 1, h.x - 5, h.y - 5);
  }
  for (const p of ptsPops) { // 묶음 숫자로 점수 옆에 더한 값을 띄운다
    const t = String(p.v), w = t.length * 6 + 5, x = W < 150 ? W - 1 - w : Math.round(Math.min(W - 1 - RINSET - w, scoreAt.x - (w >> 1))), y = hudBottom() + 1 - Math.round(p.t * 4);
    ctx.fillStyle = COL.ink; ctx.fillRect(x - 1, y, w + 2, 8); ctx.fillStyle = '#fff'; ctx.fillRect(x, y + 3, 3, 1); ctx.fillRect(x + 1, y + 2, 1, 3);
    for (let i = 0; i < t.length; i++) spr('packNum', (+t[i] + 9) % 10, x + 5 + i * 6, y);
  }
}
