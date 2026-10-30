(function () {
  'use strict';
  // 버티기 틀 세계: 적·구슬·줍는 것·효과 목록과 그 움직임. 그리기는 scene.js, 무기는 weapons.js가 맡는다.
  // 좌표는 세계 칸(작은 캔버스 1칸 = 1). 효과를 부를 때만 toCss로 화면 CSS px로 바꾼다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const R = S.rules;
  const CELL = 32, SPAN = 64, MASK = SPAN - 1, FAR = 400, HERO_R = 7, GEM_MAX = 250, ITEM_MAX = 80, FX_MAX = 220;
  const byId = (list, id) => (list || []).find(x => x.id === id) || null;
  const cellIndex = (cx, cy) => (cx & MASK) * SPAN + (cy & MASK);
  const gemTier = (v, xp) => v >= xp.gem[2] ? 2 : v >= xp.gem[1] ? 1 : 0;
  const PROP_SIZE = 112;
  const SOLID = /-(dolmen|house|tomb|wall|fence|pagoda|well|boulder|tower|ship|gate)$/;

  function hash(i, j, s) {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2246822519 | 0)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0;
  }
  // 그리기와 벽이 같은 배치를 쓴다. 큰 물건 사이에 길을 두고 출발 둘레는 비운다.
  function propAt(w, i, j) {
    if (w.svReview?.empty) return null;
    const sv = w.sv, list = w.art?.ui?.battle?.eras?.[sv.cell?.id];
    if (!list) return null;
    const owner=sv.cell.id+':'+sv.loop;
    if(sv.propOwner!==owner){sv.propOwner=owner;sv.propCache=new Map();sv.wallCache=new Map();}
    const key = i+':'+j, cache = sv.propCache;
    if (cache.has(key)) return cache.get(key);
    if (cache.size > 1024) cache.clear();
    const hs = hash(i, j, sv.era * 7 + sv.loop * 131 + 1);
    let p = null;
    // 칸마다 물건이 놓일 확률. 2026-10-18 대표 「장애물이 너무 많다, 절반으로」 → 208/256(81%)에서 104/256(41%)로.
    if ((hs & 255) < 104) {
      const slot = list[(hs >>> 8) % list.length], spec = w.art.ui.battle.sprites[slot];
      const x = i * PROP_SIZE + 48 + (hs >>> 10) % 17, y = j * PROP_SIZE + 48 + (hs >>> 20) % 17;
      if (Math.hypot(x, y) >= 112 + (spec?.w || 24) / 2) {
        p = { slot, x, y, behind: !!spec?.behind, prop: true, key };
        if (SOLID.test(slot)) {
          const ink = spec.ink || [0,0,spec.w,spec.h], half = Math.max(14, ink[2] * .46), depth = Math.min(32, Math.max(18, ink[3] * .55));
          p.wall = { l:x-half, r:x+half, t:y-depth, b:y-3, key };
        }
      }
    }
    cache.set(key, p); return p;
  }
  function wallList(w,x,y,r) {
    if (w.svReview?.empty) return [];
    const sv=w.sv;if(!w.art?.ui?.battle?.eras?.[sv.cell?.id])return [];
    const i0=Math.floor((x-r-72)/PROP_SIZE),i1=Math.floor((x+r+72)/PROP_SIZE),j0=Math.floor((y-r-72)/PROP_SIZE),j1=Math.floor((y+r+72)/PROP_SIZE);
    propAt(w,i0,j0);
    const key=i0+':'+i1+':'+j0+':'+j1,cache=sv.wallCache;let list=cache.get(key);if(list)return list;
    list=[];for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const b=propAt(w,i,j)?.wall;if(b)list.push(b);}
    if(cache.size>512)cache.clear();cache.set(key,list);return list;
  }
  // 한 칸을 걷는 동안 같은 주변 벽을 재사용한다. 몸마다 매 걸음 해시·목록을 만들지 않는다.
  function bodyWalls(w,body,r) {
    const i=Math.floor(body.x/PROP_SIZE),j=Math.floor(body.y/PROP_SIZE),radius=Math.max(32,r);
    if(body.wallCell===w.sv.cell&&body.wallLoop===w.sv.loop&&body.wallMap===w.sv.wallCache&&body.wallI===i&&body.wallJ===j&&body.wallRadius>=radius)return body.wallList;
    const list=wallList(w,(i+.5)*PROP_SIZE,(j+.5)*PROP_SIZE,radius+PROP_SIZE/2);
    body.wallI=i;body.wallJ=j;body.wallRadius=radius;body.wallMap=w.sv.wallCache;body.wallCell=w.sv.cell;body.wallLoop=w.sv.loop;body.wallList=list;return list;
  }
  const expanded = (b,r) => ({ l:b.l-r, r:b.r+r, t:b.t-r, b:b.b+r, key:b.key });
  // 선분이 벽 안으로 들어가는 첫 지점. 가장자리를 걷는 것은 허용한다.
  function crossing(x,y,tx,ty,b,r=0) {
    let lo=0,hi=1;const dx=tx-x,dy=ty-y,l=b.l-r+1e-5,right=b.r+r-1e-5,top=b.t-r+1e-5,bottom=b.b+r-1e-5;
    if(Math.abs(dx)<1e-8){if(x<=l||x>=right)return null;}
    else {const a=(l-x)/dx,z=(right-x)/dx;lo=Math.max(lo,Math.min(a,z));hi=Math.min(hi,Math.max(a,z));if(lo>=hi)return null;}
    if(Math.abs(dy)<1e-8){if(y<=top||y>=bottom)return null;}
    else {const a=(top-y)/dy,z=(bottom-y)/dy;lo=Math.max(lo,Math.min(a,z));hi=Math.min(hi,Math.max(a,z));if(lo>=hi)return null;}
    return lo;
  }
  function firstWall(w,x,y,tx,ty,r) {
    let found = null, time = Infinity;
    for(const b of wallList(w,(x+tx)/2,(y+ty)/2,Math.max(Math.abs(tx-x),Math.abs(ty-y))/2+r)) {
      const t=crossing(x,y,tx,ty,b,r);
      if(t!==null && t<time) {time=t;found=b;}
    }
    return found ? expanded(found,r) : null;
  }
  // 이동 선분 전체를 재서 빠른 화살도 얇은 벽을 건너뛰지 못하게 한다.
  function blockShot(w, shot, tx, ty, r = 4) {
    const x=shot.x,y=shot.y,distance=Math.max(Math.abs(tx-x),Math.abs(ty-y));
    const boxes=distance<=32?bodyWalls(w,shot,r+distance/2):wallList(w,(x+tx)/2,(y+ty)/2,r+distance/2);
    let at=Infinity;
    for(const b of boxes){const t=crossing(x,y,tx,ty,b,r);if(t!==null&&t<at)at=t;}
    if(at===Infinity)return false;
    shot.x=x+(tx-x)*at;shot.y=y+(ty-y)*at;
    addFx(w.sv,'dust',shot.x,shot.y,{life:.16,size:.5});
    return true;
  }
  // 벽은 물건의 밑동이라 발 크기로 부딪힌다. 적장은 맞는 몸(지름 48~56)보다 작은 발(정예와 같은 16)을 쓴다.
  const wallR=f=>f.wallR||f.r;
  const routeEnds=new Float64Array(4),routeEdges=new Float64Array(4),routeClear=new Uint8Array(4);
  const routeStores=new WeakMap();
  // 네 모서리를 왼쪽과 오른쪽으로 도는 거리를 비교하고 고른 길을 따라간다.
  function steer(w, f, tx, ty) {
    const direction=f.wallDirection ||= {x:0,y:0};
    if(w.sv.t<(f.escapeUntil || 0)){direction.x=f.escapeX;direction.y=f.escapeY;return direction;}
    let path=f.wallPath;
    if (path && (Math.hypot(tx-path.tx,ty-path.ty)>64 || w.sv.t>path.until)) path=f.wallPath=null;
    if(path) { while(path.points.length && Math.hypot(f.x-path.points[0].x,f.y-path.points[0].y)<1)path.points.shift();if(!path.points.length)path=f.wallPath=null; }
    if(!path && w.sv.t >= (f.routeAt || 0)) {
      f.routeAt=w.sv.t+.25;
      // 경로를 새로 찾을 때만 여유를 둔다. 걷는 동안 밀어내면 모서리에 붙잡힌다.
      unwall(w,f,wallR(f)+2);
      const d=Math.hypot(tx-f.x,ty-f.y)||1, k=Math.min(1,100/d), b=firstWall(w,f.x,f.y,f.x+(tx-f.x)*k,f.y+(ty-f.y)*k,wallR(f)+2);
      if(b) {
        let store=routeStores.get(f);
        if(!store){store={cs:Array.from({length:4},()=>({x:0,y:0})),path:{points:[],tx:0,ty:0,until:0}};routeStores.set(f,store);}
        const cs=store.cs;
        for(let i=0;i<4;i++){cs[i].x=i===0||i===3?b.l:b.r;cs[i].y=i<2?b.t:b.b;}
        // Each corner's final segment and each rectangle edge are invariant
        // throughout this search. Keep the candidate and tie-breaking order.
        for(let i=0;i<4;i++){
          const c=cs[i],next=cs[(i+1)&3];
          routeClear[i]=crossing(c.x,c.y,tx,ty,b)===null?1:0;
          routeEnds[i]=Math.hypot(tx-c.x,ty-c.y);
          routeEdges[i]=Math.hypot(next.x-c.x,next.y-c.y);
        }
        let best=Infinity,bestA=-1,bestTurn=0,bestN=0;
        for(let a=0;a<4;a++) {
          if(crossing(f.x,f.y,cs[a].x,cs[a].y,b)!==null)continue;
          const start=Math.hypot(f.x-cs[a].x,f.y-cs[a].y);
          for(let turn=-1;turn<=1;turn+=2) {
            let cost=start;
            for(let n=0;n<4;n++) {
              const z=(a+turn*n+8)%4;
              if(n)cost+=routeEdges[turn>0?(z+3)&3:z];
              if(routeClear[z] && cost+routeEnds[z]<best){best=cost+routeEnds[z];bestA=a;bestTurn=turn;bestN=n;}
            }
          }
        }
        if(bestA>=0) {
          const points=store.path.points;points.length=0;
          for(let n=0;n<=bestN;n++)points.push(cs[(bestA+bestTurn*n+8)%4]);
          while(points.length && Math.hypot(f.x-points[0].x,f.y-points[0].y)<1)points.shift();
          if(points.length){path=f.wallPath=store.path;path.tx=tx;path.ty=ty;path.until=w.sv.t+4;}
        }
      }
    }
    const point=path?.points[0], dx=(point?point.x:tx)-f.x, dy=(point?point.y:ty)-f.y, d=Math.hypot(dx,dy)||1;
    direction.x=dx/d;direction.y=dy/d;return direction;
  }
  const overlapsWall=(boxes,x,y,r)=>{for(const b of boxes)if(x>b.l-r+1e-6&&x<b.r+r-1e-6&&y>b.t-r+1e-6&&y<b.b+r-1e-6)return true;return false;};
  // 반지름 r인 점이 벽(밑동) 속에 있나. 거북선 포탄처럼 벽 속에서 나오면 바로 막힐 것을 미리 본다.
  const inWall=(w,x,y,r)=>overlapsWall(wallList(w,x,y,r),x,y,r);
  function unwall(w, body, r) {
    const boxes=bodyWalls(w,body,r);let pushed=false;
    for(const b of boxes){
      const l=b.l-r,right=b.r+r,t=b.t-r,bottom=b.b+r;
      if(body.x<=l+1e-6||body.x>=right-1e-6||body.y<=t+1e-6||body.y>=bottom-1e-6)continue;
      const left=body.x-l,rd=right-body.x,up=body.y-t,down=bottom-body.y;pushed=true;
      if(left<=rd&&left<=up&&left<=down)body.x=l;
      else if(rd<=up&&rd<=down)body.x=right;
      else if(up<=down)body.y=t;else body.y=bottom;
    }
    // 몸보다 좁은 두 벽 틈에서는 한 벽에서 밀면 옆 벽에 들어가고, 다음 장면에 다시 반대로 밀려 제자리에 갇힌다.
    // 밀고 나서도 겹치면 가까운 빈자리로 옮긴다(적장이 800초 갇힌 판).
    if(!pushed||!overlapsWall(boxes,body.x,body.y,r))return;
    const x0=body.x,y0=body.y;
    for(let d=8;d<=160;d+=8)for(let k=0;k<16;k++){
      const a=k*Math.PI/8,x=x0+Math.cos(a)*d,y=y0+Math.sin(a)*d;
      if(!overlapsWall(wallList(w,x,y,r),x,y,r)){body.x=x;body.y=y;return;}
    }
  }
  function moveBody(w,body,dx,dy,r=body.wallR || body.r || HERO_R) {
    unwall(w,body,r);
    const distance=Math.max(Math.abs(dx),Math.abs(dy));
    const boxes=distance<=32?bodyWalls(w,body,r+distance/2):wallList(w,body.x+dx/2,body.y+dy/2,r+distance/2);
    if(!boxes.length){body.x+=dx;body.y+=dy;return;}
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/Math.max(3,r*.5)));
    for(let i=0;i<n;i++) {
      const ox=body.x;body.x+=dx/n;
      for(const b of boxes)if(body.x>b.l-r+1e-6&&body.x<b.r+r-1e-6&&body.y>b.t-r+1e-6&&body.y<b.b+r-1e-6)body.x=ox<=b.l-r?b.l-r:ox>=b.r+r?b.r+r:ox;
      const oy=body.y;body.y+=dy/n;
      for(const b of boxes)if(body.x>b.l-r+1e-6&&body.x<b.r+r-1e-6&&body.y>b.t-r+1e-6&&body.y<b.b+r-1e-6)body.y=oy<=b.t-r?b.t-r:oy>=b.b+r?b.b+r:oy;
    }
  }
  // 여러 몸에 밀려 모서리에서 제자리걸음하면 빈 옆길로 먼저 빠져나온다.
  // 한 축만 반지름을 넘어도 원 밖이다. 경계 네모 안일 때만 제곱근을 잰다.
  const outsideCircle = (dx, dy, r) => Math.abs(dx) > r || Math.abs(dy) > r || Math.hypot(dx, dy) > r;
  function recoverWalk(w,f) {
    const sv=w.sv,h=sv.hero,dx=h.x-f.x,dy=h.y-f.y;
    if((f.boss&&f.mode!=='walk')||(f.bow&&Math.hypot(dx,dy)<f.bow.range)||!outsideCircle(dx,dy,f.r+HERO_R+4)){f.walkAt=null;return;}
    if(f.walkAt==null||outsideCircle(f.x-f.walkX,f.y-f.walkY,2)){f.walkX=f.x;f.walkY=f.y;f.walkAt=sv.t;return;}
    if(sv.t-f.walkAt<1.4 || sv.t<(f.escapeUntil || 0))return;
    const d=Math.hypot(dx,dy);
    unwall(w,f,wallR(f)+2);
    const wall=firstWall(w,f.x,f.y,f.x+(h.x-f.x)*Math.min(1,80/d),f.y+(h.y-f.y)*Math.min(1,80/d),wallR(f)+2);
    if(!wall)return;
    let best=Infinity,aim=null;
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4,x=Math.cos(angle),y=Math.sin(angle),tx=f.x+x*36,ty=f.y+y*36;
      if(firstWall(w,f.x,f.y,tx,ty,wallR(f)+2))continue;
      const cost=Math.hypot(h.x-tx,h.y-ty)+(f.escapeX*x+f.escapeY*y>0.8?12:0);
      if(cost<best){best=cost;aim={x,y};}
    }
    if(aim){f.escapeX=aim.x;f.escapeY=aim.y;f.escapeUntil=sv.t+1.6;f.wallPath=null;f.routeAt=0;f.walkX=f.x;f.walkY=f.y;f.walkAt=sv.t;}
  }

  function create() {
    return {
      begun: false, t: 0, play: 'none', battle: null, tier: 1, loop: 0, era: 0, eraStart: 0, ground: 'field',
      hero: { x: 0, y: 0, hp: 100, hpMax: 100, invuln: 0, hurt: 0, faceX: 1, dx: 1, dy: 0, moving: false, anim: 0, person: 0 },
      heroDef: null, shop: {}, stats: null, fever: false,
      kit: { weapons: [], relics: [], allies: [] },
      level: 1, xp: 0, queue: [], choice: null, after: [], firstLevel: true,
      asked: new Set(), crackOf: new Map(),
      seen: { people: new Set(), weapons: new Set(), relics: new Set(), evolutions: new Set(), foes: new Set() }, facts: {},
      foes: [], gems: [], items: [], shots: [], foeShots: [], traps: [], fx: [], nums: [], allyBodies: [], trail: [], orbs: [], bossOn: [], tele: [],
      wrun: new Map(), arun: new Map(), weaponDamage: Object.create(null), shotPool: [],
      grid: { head: new Int32Array(SPAN * SPAN).fill(-1), next: new Int32Array(512) },
      alive: 0, spawnAcc: 0, act: 1, cell: null, foeDefs: null, loopStart: 0, nextElite: Infinity, nextChest: Infinity, nextRing: Infinity, bossAt: Infinity, minionAt: Infinity, boss: null,
      chests: 0, bosses: 0, coinsPicked: 0, extraCoins: 0, kills: 0, dealt: 0, rival: false, falls: 0,
      lastHit: -1, lastImpact: -1, lastSwing: -1, lastGem: -1, gemPitch: 0, gemMerge: 0, flash: 0, scrollAt: 0,
      rush: null, rushN: 0, shake: 0, shakeTime: 0, slowLeft: 0, critNums: [], battleFlash: 0,
      feelClock: 0, stopLeft: 0, flashUntil: [], deaths: [],
      fxPool: Array.from({length:FX_MAX}, () => ({})), numPool: Array.from({length:30}, () => ({})), deathPool: Array.from({length:15}, () => ({})),
      flights: [], flightPool: Array.from({length:GEM_MAX}, () => ({})),
      cam: { x: 0, y: 0 }, tmp: [], tmp2: []
    };
  }

  // 세계 칸 → 세계 사각형 안 CSS px (효과·글 자리)
  function toCss(w, x, y) {
    const px = w.px, cam = px?.cam || w.sv.cam, k = px ? px.s / px.dpr : 1;
    return { x: (x - cam.x) * k, y: (y - cam.y) * k };
  }
  // 주인공이 놀이 칸(윗줄 아래) 가운데에 오게 카메라를 둔다.
  function camera(w) {
    const px = w.px, h = w.sv.hero; if (!px) return;
    w.sv.cam.x = Math.round(h.x - px.W / 2);
    w.sv.cam.y = Math.round(h.y - (px.top + (px.H - px.top) / 2));
  }

  // 쓰러진 적을 걸러 내고 칸 격자를 다시 짠다. 한 걸음에 한 번, 맨 앞에서.
  function grid(sv) {
    const foes = sv.foes; let n = 0;
    for (let i = 0; i < foes.length; i++) if (!foes[i].dead) foes[n++] = foes[i];
    foes.length = n;
    const g = sv.grid;
    if (g.next.length < n) g.next = new Int32Array(Math.max(n, g.next.length * 2));
    g.head.fill(-1);
    for (let i = 0; i < n; i++) {
      const f = foes[i], c = cellIndex(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
      f.gridIndex = i;
      g.next[i] = g.head[c]; g.head[c] = i;
    }
    g.size = n;
  }
  // (x,y)에서 r 안에 몸이 닿는 적. out을 비우고 채워 돌려준다.
  function near(sv, x, y, r, out, after = -1) {
    out.length = 0;
    const foes = sv.foes;
    if (r > FAR) {
      for (const f of foes) if (!f.dead && !(after >= 0 && !f.boss && f.gridIndex <= after)) { const dx = f.x - x, dy = f.y - y, rr = r + f.r; if (dx * dx + dy * dy <= rr * rr) out.push(f); }
      return out;
    }
    const g = sv.grid, head=g.head, next=g.next, size=g.size, m = r + 28, x0 = Math.floor((x - m) / CELL), x1 = Math.floor((x + m) / CELL), y0 = Math.floor((y - m) / CELL), y1 = Math.floor((y + m) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      const col=(cx&MASK)*SPAN;
      for (let cy = y0; cy <= y1; cy++) {
        for (let i = head[col+(cy&MASK)]; i >= 0; i = next[i]) {
          if (i >= size) break;
          const f = foes[i];
          // 서로 밀 때 이미 처리한 짝은 거리 계산과 임시 목록 넣기를 생략한다.
          if (f.dead || after >= 0 && !f.boss && f.gridIndex <= after) continue;
          const dx = f.x - x, dy = f.y - y, rr = r + f.r;
          if (dx * dx + dy * dy <= rr * rr) out.push(f);
        }
      }
    }
    return out;
  }
  function nearest(sv, x, y, range, skip) {
    let best = null, bd = Infinity;
    for (const f of near(sv, x, y, range, sv.tmp)) {
      if (skip && skip.has(f)) continue;
      const d = (f.x - x) ** 2 + (f.y - y) ** 2; if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function nearestK(sv, x, y, range, k) {
    const list = near(sv, x, y, range, sv.tmp).slice();
    list.sort((a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2));
    return list.length > k ? list.slice(0, k) : list;
  }
  // 화면 사각형을 pad만큼 넓힌 테두리 위, 화면 가운데에서 ang 쪽 점
  function ringPoint(w, ang, pad = 40) {
    const px = w.px, cam = w.sv.cam, W = px ? px.W : 360, H = px ? px.H : 360;
    const cx = cam.x + W / 2, cy = cam.y + H / 2, hw = W / 2 + pad, hh = H / 2 + pad, c = Math.cos(ang), s = Math.sin(ang);
    const t = Math.min(Math.abs(c) > 1e-6 ? hw / Math.abs(c) : Infinity, Math.abs(s) > 1e-6 ? hh / Math.abs(s) : Infinity);
    return { x: cx + c * t, y: cy + s * t };
  }

  // kind: 시대 판은 foot·horse·archer·elite(보병 몸), 옛 판은 normal·fast·elite.
  function foeDef(w, kind) {
    const sv = w.sv;
    if (sv.foeDefs) return sv.foeDefs[kind === 'elite' ? 'foot' : kind] || sv.foeDefs.foot;
    const ids = sv.battle.foes; return byId(w.content.foes, ids[Math.floor(w.rng() * ids.length)]);
  }
  function spawnFoe(w, kind, at) {
    const sv = w.sv, def = foeDef(w, kind);
    if (!def) return null;
    const st = R.foeStats(def, { play: sv.play, tier: sv.tier, minutes: (sv.play === 'endless' ? sv.t : sv.t - sv.loopStart) / 60, act: sv.act, cell: sv.cell?.id, loop: sv.loop, kind: sv.foeDefs && kind !== 'elite' ? 'normal' : kind }, w.family.tuning);
    const p = at || ringPoint(w, w.rng() * Math.PI * 2);
    const f = { def, sprite: def.sprite, kind, boss: false, act: sv.act, x: p.x, y: p.y, hp: st.hp, hpMax: st.hp, speed: st.speed * (.9 + w.rng() * .2), dmg: st.dmg,
      r: kind === 'elite' ? 16 : def.kind === 'horse' ? 13 : 9, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: w.fxRng() * 6.283 };
    if (def.kind === 'archer' && kind !== 'elite') { const shot = w.family.tuning.foeShots?.[def.shot || 'arrow']; f.bow = { range: def.range, cd: def.shotCd, wait: def.shotCd * (.3 + w.rng() * .7), speed: def.shotSpeed * (shot?.speedMul ?? 1), slot: shot?.sprite || 'shot-arrow', dmg: sv.play === 'endless' ? st.dmg * def.shotDmg / def.dmg : def.shotDmg * (w.family.tuning.combat?.enemyDamage ?? 1) * (w.family.tuning.foe.cellDamage?.[sv.cell?.id] ?? 1) }; }
    unwall(w,f,f.r); sv.foes.push(f); sv.alive++;
    return f;
  }
  // 적 수 상한: 시대 판은 보이는 세계 넓이에 맞춘다(360×640 ≈ 156). 연습 판은 40.
  function capOf(w) {
    const px = w.px, sp = w.family.tuning.spawn;
    if (w.practice) return 40;
    if (!w.sv.foeDefs) return sp.max;
    const limit = Math.max(sp.capMin ?? 120, Math.min(sp.max, Math.round((px ? px.W * px.H : 360 * 640) / (sp.capArea ?? 1480))));
    const E = w.family.tuning.endless;
    return w.sv.play === 'endless' ? Math.min(limit, Math.floor(E.capStart + E.capPerMin * w.sv.t / 60)) : limit;
  }
  // Replace distant ordinary enemies when a promised wave needs pool slots.
  function reserve(w, n) {
    const sv = w.sv, h = sv.hero, remove = Math.max(0, sv.alive + n - capOf(w));
    if (!remove) return;
    const far = sv.foes.filter(f => !f.dead && !f.boss).sort((a, b) => ((b.x - h.x) ** 2 + (b.y - h.y) ** 2) - ((a.x - h.x) ** 2 + (a.y - h.y) ** 2));
    for (let i = 0; i < remove && i < far.length; i++) { far[i].dead = true; sv.alive--; }
  }
  // 적 화살: 곧게 날아가 주인공에 닿으면 다친다(무적 중엔 그냥 지나간다).
  // x·y는 그려지는 자리(쏜 적의 발보다 lift만큼 위)다. 벽(물건 밑동)은 그려진 길과 땅 길(y + lift) 둘 다로 재서 하나라도 닿으면 막는다.
  // 그려진 길로만 재면 땅 길이 밑동을 지나도 화살이 밑동 위로 넘어가 구조물을 뚫고 왔다(10-28 대표 「적 투사체들이 벽판정 받은
  // 구조물들을 뚫고 넘어오더라고」). 땅 길로만 재면 이번엔 밑동 바로 앞을 지나는 화살이 밑동 그림 위로 그려진 채 지나간다.
  function foeShoot(w, x, y, ang, speed, dmg, life = 2.5, slot = 'shot-arrow', lift = 0) {
    const list = w.sv.foeShots; if (list.length >= 120) list.shift();
    list.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ang, dmg, slot, t: 0, life, lift });
  }
  function stepFoeShots(w, dt) {
    const sv = w.sv, h = sv.hero, list = sv.foeShots; let n = 0;
    for (const s of list) {
      s.t += dt;
      const tx=s.x+s.vx*dt,ty=s.y+s.vy*dt,lift=s.lift||0;
      // 심 반지름 4(주인공 몸 7 이하). 땅 길에서 막히면 그려지는 자리로 되돌려 둔다.
      if(blockShot(w,s,tx,ty))continue;
      if(lift){s.y+=lift;const blocked=blockShot(w,s,tx,ty+lift);s.y-=lift;if(blocked)continue;}
      s.x=tx;s.y=ty;
      if (s.t >= s.life) continue;
      if (h.invuln <= 0 && h.hp > 0 && (s.x - h.x) ** 2 + (s.y - h.y + 6) ** 2 <= (HERO_R + 4) ** 2) { hurtHero(w, s.dmg); continue; }
      list[n++] = s;
    }
    list.length = n;
  }
  function spawnBoss(w) {
    const sv = w.sv, def = byId(w.content.bosses, sv.battle.boss);
    if (!def) return null;
    const st = R.bossStats(def, { tier: sv.tier, loop: sv.loop }, w.family.tuning), p = ringPoint(w, w.rng() * Math.PI * 2);
    const f = { def, sprite: def.sprite, kind: 'boss', boss: true, x: p.x, y: p.y, hp: st.hp, hpMax: st.hp, speed: st.speed, dmg: st.dmg,
      r: 26, flash: 0, kbx: 0, kby: 0, faceX: 1, dead: false, phase: 0 };
    sv.foes.push(f); sv.boss = f; sv.minionAt = sv.t + 3; sv.seen.foes.add(def.id);
    const b = w.effectBounds();
    w.juice.moment('special', { x: b.x + b.w / 2, y: b.y + b.h / 2, label: R.T.bossCome });
    return f;
  }
  // 초마다 나오는 수는 시간에 따라 는다. 연습 판은 적게. 강한 적·상자·둘러싸기는 정해진 때마다.
  function spawnStep(w, dt) {
    const sv = w.sv, T = w.family.tuning, sp = T.spawn, practice = !!w.practice, h = sv.hero;
    // 시대 판: 막 섞기로 고르고, 적장이 있는 동안은 잡병을 줄인다(상한 절반, 둘러싸기 없음).
    const endless = sv.play === 'endless', E = T.endless, minutes = sv.t / 60;
    const full = capOf(w), era = !!sv.foeDefs, quiet = !endless && era && sv.bossOn.some(b => b.def.role === 'general'), cap = quiet ? Math.round(full / 2) : full;
    const rate = endless ? E.spawnStart + E.spawnPerMin * minutes : (sp.start + sp.perMin * (sv.t - sv.loopStart) / 60) * (sp.actRate?.[Math.min(3, sv.act) - 1] ?? 1) * (sp.cellRate?.[sv.cell?.id]?.[Math.min(3, sv.act) - 1] ?? 1) * (practice ? .3 : 1) * (quiet ? .2 : 1);
    sv.spawnAcc += rate * dt;
    while (sv.spawnAcc >= 1) {
      sv.spawnAcc -= 1;
      if (sv.alive >= cap) { sv.spawnAcc = 0; break; }
      spawnFoe(w, endless && w.rng() < Math.min(E.eliteMax, E.eliteStart + E.elitePerMin * minutes) ? 'elite' : era ? S.acts.roll(S.acts.mix(sv.act, T), w.rng) : sv.t >= T.foe.fastFrom && w.rng() < .3 ? 'fast' : 'normal');
    }
    if (practice) return;
    if (sv.t >= sv.nextElite) { sv.nextElite += sp.eliteEvery; if (!endless && sv.alive < cap) spawnFoe(w, 'elite'); }
    if (sv.t >= sv.nextChest) {
      sv.nextChest += sp.chestEvery;
      const a = w.rng() * Math.PI * 2, d = 60 + w.rng() * 60;
      // 상자는 끌려오지 않고 닿아야 줍는다. 벽 속에 놓이면 끝까지 못 주우니 벽 밖으로 민다.
      const it = addItem(sv, 'chest', h.x + Math.cos(a) * d, h.y + Math.sin(a) * d); if (it) unwall(w, it, 3);
    }
    if (!sv.rush && sv.t >= sv.nextRing - 3 && !quiet) {
      const type = sv.rushN++ % 3, points = [], n = sp.ringN, aim = Math.atan2(h.dy, h.dx);
      for (let i = 0; i < n; i++) {
        const a = type === 0 ? aim + .6 + i / n * (Math.PI * 2 - 1.2) : (type === 1 ? aim : (i % 2 ? 0 : Math.PI)) + (i / n - .5) * .8;
        const p = ringPoint(w, a, 8);
        points.push({ ...p, ang: Math.atan2(h.y - p.y, h.x - p.x), kind: type === 0 ? 'foot' : 'horse' });
      }
      sv.rush = { type, at: sv.nextRing, points };
      w.record?.('surge-warning', { type, at: sv.nextRing });
    }
    if (sv.t >= sv.nextRing) {
      sv.nextRing += sp.ringEvery;
      if (sv.rush && !quiet) reserve(w, sv.rush.points.length);
      if (sv.rush && !quiet) for (const p of sv.rush.points) {
        if (sv.alive >= cap) break;
        const f = spawnFoe(w, era ? p.kind : 'normal', p);
        if (f && sv.rush.type !== 0) { f.rushUntil = sv.t + 3; f.rushAim = p.ang; }
      }
      sv.rush = null;
    }
    if (!sv.boss && sv.t >= sv.bossAt) { sv.bossAt = Infinity; spawnBoss(w); }
    if (!era && sv.boss && !sv.boss.dead && sv.t >= sv.minionAt) {
      sv.minionAt = sv.t + 3;
      const b = sv.boss;
      for (let i = 0; i < T.boss.minions && sv.alive < cap; i++) { const a = w.rng() * Math.PI * 2, d = 34 + w.rng() * 24; spawnFoe(w, 'normal', { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d }); }
    }
  }

  // 주인공 쪽으로 걷기, 밀려남 줄이기, 너무 먼 적은 가는 쪽 앞으로 옮기기, 서로 밀어내기, 주인공에 닿기.
  // Retain near()'s starting position and grid order. Radius and grid index
  // stay fixed during this pass, so read them once for each body.
  function separateFoes(w) {
    const sv=w.sv,g=sv.grid,head=g.head,next=g.next,size=g.size;
    for(const f of sv.foes){
      if(f.dead||f.boss||f.cavalry)continue;
      const x=f.x,y=f.y,radius=f.r,index=f.gridIndex,pad=radius+28,x0=Math.floor((x-pad)/CELL),x1=Math.floor((x+pad)/CELL),y0=Math.floor((y-pad)/CELL),y1=Math.floor((y+pad)/CELL);
      if(radius>FAR){
        for(const o of near(sv,x,y,radius,sv.tmp2,index)){
          if(o===f||o.cavalry||!o.boss&&o.gridIndex<=index)continue;
          let dx=f.x-o.x,dy=f.y-o.y,d2=dx*dx+dy*dy;const m=radius+o.r;
          if(d2>=m*m)continue;
          if(d2<1e-6){dx=w.rng()-.5;dy=w.rng()-.5;d2=dx*dx+dy*dy;}
          const d=Math.sqrt(d2),push=(m-d)/d*(o.boss ? .5 : .22);
          f.x+=dx*push;f.y+=dy*push;if(!o.boss){o.x-=dx*push;o.y-=dy*push;}
        }
        continue;
      }
      for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++)for(let i=head[(cx&MASK)*SPAN+(cy&MASK)];i>=0;i=next[i]){
        if(i>=size)break;
        const o=sv.foes[i];if(o===f||o.dead||o.cavalry||!o.boss&&i<=index)continue;
        const qx=o.x-x,qy=o.y-y,m=radius+o.r,m2=m*m;if(qx*qx+qy*qy>m2)continue;
        let dx=f.x-o.x,dy=f.y-o.y,d2=dx*dx+dy*dy;
        if(d2>=m2)continue;
        if(d2<1e-6){dx=w.rng()-.5;dy=w.rng()-.5;d2=dx*dx+dy*dy;}
        const d=Math.sqrt(d2),push=(m-d)/d*(o.boss ? .5 : .22);
        f.x+=dx*push;f.y+=dy*push;
        if(!o.boss){o.x-=dx*push;o.y-=dy*push;}
      }
    }
  }
  function moveFoes(w, dt) {
    const sv = w.sv, h = sv.hero, px = w.px, farX = (px ? px.W : 360) * .75 + 80, farY = (px ? px.H : 360) * .75 + 80, decay = Math.exp(-10 * dt);
    for (const f of sv.foes) {
      if (f.dead) continue;
      if (f.cavalry) {
        const ux = Math.cos(f.rushAim), uy = Math.sin(f.rushAim);
        const ox = f.x, oy = f.y;
        f.x += ux * f.rushSpeed * dt; f.y += uy * f.rushSpeed * dt; f.faceX = ux < 0 ? -1 : 1; f.flash = Math.max(0, f.flash - dt);
        S.allies?.blockFoe(w, f, ox, oy);
        if (sv.t >= f.rushUntil || (f.x - f.rushEndX) * ux + (f.y - f.rushEndY) * uy >= 0) { f.dead = true; sv.alive--; }
        continue;
      }
      const dx = h.x - f.x, dy = h.y - f.y;
      if (f.bulgasari) {
        const d = Math.hypot(dx, dy) || 1;
        // 쇠 먹는 전설 괴물은 벽·다른 몸·밀림·동료 상태에 막히지 않고 곧장 쫓는다.
        const ox = f.x, oy = f.y, travel = Math.min(d, f.speed * dt);
        f.x += dx / d * travel; f.y += dy / d * travel;
        f.kbx = f.kby = 0; f.faceX = dx < 0 ? -1 : 1;
        const mx = f.x - ox, my = f.y - oy, q = Math.max(0, Math.min(1, ((h.x - ox) * mx + (h.y - oy) * my) / (mx * mx + my * my || 1)));
        if (Math.hypot(h.x - ox - mx * q, h.y - oy - my * q) <= f.r + HERO_R) {
          // 하트·피해·보호막 연출을 거치지 않는다. 잡힌 순간까지의 시간과 점수는 보관한다.
          w.score = R.scoreOf({ sec: sv.t, right: w.stats.right, chests: sv.opened, bosses: sv.bosses }, w.family.tuning.score);
          w.modeSession?.setProgress(sv.t); w.modeSession?.end('bulgasari');
          return;
        }
        continue;
      }
      f.squash = Math.max(0, (f.squash || 0) - dt);
      if (f.boss && f.def.moves && S.bosses) {
        const d = Math.hypot(dx, dy) || 1;
        if (f.flash > 0) f.flash -= dt;
        const ox=f.x,oy=f.y,aim=f.mode==='walk'?steer(w,f,h.x,h.y):{x:dx/d,y:dy/d};
        S.bosses.step(w,f,dt,aim.x*d,aim.y*d,d);
        const mx=f.x-ox,my=f.y-oy;f.x=ox;f.y=oy;moveBody(w,f,mx,my);continue;
      }
      // 동료가 건 상태: 느려짐(slowUntil·slowMul), 묶임(stunUntil, 걷지도 쏘지도 않는다), 꾀임(lureUntil, 덫 쪽으로 걷는다).
      const stunned = f.stunUntil > sv.t, lured = !stunned && f.lureUntil > sv.t;
      let v = f.slowUntil > sv.t ? f.speed * f.slowMul : f.speed;
      // 궁수: 사거리 안에서 멈추고, 너무 가까우면 물러서며 쏜다.
      if (f.bow) {
        const d = Math.hypot(dx, dy) || 1;
        f.bow.wait -= dt;
        if (d < f.bow.range && !lured) {
          // 엄폐물에 사선이 막히면 사격 대기 대신 기존 모서리 경로로 옆자리를 찾는다.
          // 화살은 발보다 8 위에서 나가 주인공 가슴(발 - 6)으로 간다. 그려진 길이나 땅 길(발에서 주인공 발 + 2까지)이 막히면 옆으로 간다.
          if (firstWall(w,f.x,f.y-8,h.x,h.y-6,4) || firstWall(w,f.x,f.y,h.x,h.y+2,4)) v=f.speed;
          else { v = d < f.bow.range * .6 ? -f.speed * .5 : 0; if (f.bow.wait <= 0 && !stunned) { f.bow.wait = f.bow.cd; foeShoot(w, f.x, f.y - 8, Math.atan2(dy + 2, dx), f.bow.speed, f.bow.dmg, 2.5, f.bow.slot, 8); } }
        }
      }
      if (stunned) v = 0;
      // 걷는 방향은 steer가 벽에서 벗어난 자리로 다시 잰다. 앞에서 잰
      // 거리의 값이 필요한 멈춤·후퇴 때만 따로 계산한다.
      const charging = !stunned && f.rushUntil > sv.t;
      let aim;
      if (charging) aim = null;
      else if (lured) aim = steer(w, f, f.lureX, f.lureY);
      else if (v > 0) aim = steer(w, f, h.x, h.y);
      else { const d = Math.hypot(dx, dy) || 1; aim = { x: dx / d, y: dy / d }; }
      const vx = charging ? Math.cos(f.rushAim) * 95 : aim.x * v, vy = charging ? Math.sin(f.rushAim) * 95 : aim.y * v;
      const ox = f.x, oy = f.y;
      moveBody(w,f,(vx+f.kbx)*dt,(vy+f.kby)*dt);
      S.allies?.blockFoe(w, f, ox, oy);
      f.kbx *= decay; f.kby *= decay;
      if (Math.abs(dx) > 2) f.faceX = dx < 0 ? -1 : 1;
      if (f.flash > 0) f.flash -= dt;
      if (!f.boss && (Math.abs(dx) > farX || Math.abs(dy) > farY)) {
        const ang = h.moving ? Math.atan2(h.dy, h.dx) + (w.rng() - .5) * 1.4 : w.rng() * Math.PI * 2, p = ringPoint(w, ang);
        f.x = p.x; f.y = p.y; f.kbx = f.kby = 0; f.wallPath=null; unwall(w,f,f.r);
      }
    }
    separateFoes(w);
    const tmp = sv.tmp2;
    for(const f of sv.foes)if(!f.dead&&!f.cavalry&&!f.bulgasari){unwall(w,f,wallR(f));recoverWalk(w,f);S.allies?.blockFoe(w,f,f.x,f.y);}
    stepFoeShots(w, dt);
    if (h.invuln <= 0 && h.hp > 0) {
      let hit = null, touching = 0;
      for (const f of near(sv, h.x, h.y, HERO_R, tmp)) if (!(f.stunUntil > sv.t)) { touching++; if (!hit || f.dmg > hit.dmg) hit = f; }
      // 대표 10-18 「일반 병사한테는 안 죽는다」: 맞은 뒤 무적 시간 탓에 여럿이 붙어도 한 마리 피해였다.
      // 붙은 적이 한 마리 늘 때마다 +50%(최대 3배). 장수는 돌진이 아니면 몸 피해의 60%.
      const C = w.family.tuning.combat || {}, crowd = 1 + (C.crowdAdd ?? .5) * Math.min(Math.max(0, touching - 1), C.crowdMax ?? 4);
      if (hit) hurtHero(w, hit.dmg * (hit.boss && hit.mode !== 'charge' ? C.bossTouch ?? .3 : 1) * crowd);
    }
  }
  function hurtHero(w, dmg) {
    const sv = w.sv, h = sv.hero;
    // 적장이 물러간 뒤 성공 장면까지(느린 화면·장수 문제·끝 이야기)는 이긴 판이다. 그 틈에 맞아 지는 판이 되지 않게.
    if (sv.generalDown && sv.play === 'stage') return;
    // 동료 방패·음식 보호막이 막으면 다치지 않고 무적 시간만 받는다. 북소리 각성은 피해를 줄인다.
    if (S.allies) { dmg = S.allies.hurt(w, dmg); if (dmg <= 0) { h.invuln = w.family.tuning.hero.invuln; return; } }
    const d = Math.max(1, Math.round(dmg - (sv.stats?.armor || 0)));
    w.reviewMeter?.hurt(Math.min(h.hp, d));
    h.hp = Math.max(0, h.hp - d); h.invuln = w.family.tuning.hero.invuln; h.hurt = .22;
    const shake = S.feedback.config(w).heroShake;
    impact(w, shake?.px ?? 3, shake?.seconds ?? .2); S.feedback.vibrate(w);
    const p = toCss(w, h.x, h.y - 16);
    w.juice.moment('dizzy', { x: p.x, y: p.y, suppressText: true });
  }

  // 맞히기. kx·ky는 밀려나는 빠르기(초당 칸). 장수·기병·강한 적은 덜 밀린다.
  function hitFoe(w, f, dmg, kx = 0, ky = 0, source = null, ally = null, noPush = false) {
    if (!f || f.dead) return false;
    if (f.bulgasari) {
      // 모든 무기·진화·동료·덫·불이 모이는 피해 입구에서 막는다. 드물게만 흰 0을 띄운다.
      const sv = w.sv;
      if (S.feedback.on(w, 'numbers') && sv.feelClock - (f.numAt ?? -Infinity) >= .8) { f.numAt = sv.feelClock; addNum(sv, f.x, f.y - f.r * 1.6, 0, false); }
      return false;
    }
    // 이성계(allies.js strike)가 투구를 맞힌 장수는 잠깐 모든 공격에 더 세게 맞는다.
    const sv = w.sv, critical = w.rng() < .15, helm = f.boss && f.helmUntil > sv.t ? f.helmMul || 1 : 1;
    const def = source && !ally ? byId(w.content.evolutions, source) || byId(w.content.weapons, source) : null;
    const tough = (f.boss || f.kind === 'elite') && def?.tough > 1 ? def.tough : 1;
    const v = Math.max(1, Math.round(dmg * (critical ? 2 : 1) * helm * tough));
    // 대표 10-18 「막 장수가 5초 만에 죽는다」: 장수는 1초에 최대 체력의 1/minSeconds까지만 깎인다(burstSeconds초치 몰아치기는 허용).
    // 약한 판은 이 상한까지 못 때려 그대로이고, 강화·진화로 센 판도 장수와 정해 둔 시간만큼은 싸운다. 숫자는 때린 힘(v) 그대로 띄운다.
    let took = v;
    const role = f.boss ? w.family.tuning.bossRoles?.[f.role] : null, minSec = role?.minSeconds;
    if (minSec > 0) {
      const rate = f.hpMax / minSec, most = rate * (role.burstSeconds ?? 1);
      f.budget = Math.min(most, (f.budget ?? most) + Math.max(0, sv.t - (f.budgetAt ?? sv.t)) * rate); f.budgetAt = sv.t;
      took = Math.min(v, f.budget); f.budget -= took;
    }
    if (source) sv.weaponDamage[source] = (sv.weaponDamage[source] || 0) + Math.min(Math.max(0, f.hp), took);
    w.reviewMeter?.hit(f, Math.min(Math.max(0, f.hp), took), source, ally, took >= f.hp);
    f.hp -= took; sv.dealt += took;
    const feel = S.feedback.config(w);
    if (S.feedback.on(w, 'flash') && sv.feelClock - (f.flashAt ?? -Infinity) >= (feel.flashCooldown ?? .25)) {
      // Every hit in one combat step shares this clock. Expired entries need
      // one sweep; zero-duration flashes and replaced lists still sweep again.
      if (sv.flashSweepAt !== sv.feelClock || sv.flashSweepList !== sv.flashUntil || sv.flashUntil[sv.flashUntil.length - 1] <= sv.feelClock) {
        let kept = 0;
        for (let i = 0; i < sv.flashUntil.length; i++) if (!(sv.flashUntil[i] <= sv.feelClock)) sv.flashUntil[kept++] = sv.flashUntil[i];
        sv.flashUntil.length = kept;
        sv.flashSweepAt = sv.feelClock; sv.flashSweepList = sv.flashUntil;
      }
      if (sv.flashUntil.length < Math.min(40, feel.flashMax ?? 40)) { f.flash = feel.flashSeconds ?? .07; f.flashAt = sv.feelClock; f.whiteUntil = sv.feelClock + f.flash; sv.flashUntil.push(f.whiteUntil); }
    }
    S.evolution?.hit(w, source, f.x, f.y);
    const resistance = f.boss ? .08 : f.kind === 'elite' ? .3 : f.kind === 'horse' ? .4 : 1;
    if (!noPush && !kx && !ky) { const dx=f.x-sv.hero.x,dy=f.y-sv.hero.y,d=Math.hypot(dx,dy)||1;kx=dx/d*35;ky=dy/d*35; }
    if (!noPush) { f.kbx = Math.max(-200, Math.min(200, f.kbx + kx * resistance)); f.kby = Math.max(-200, Math.min(200, f.kby + ky * resistance)); }
    // The visible recoil is separate from the already balanced collision motion.
    if (!noPush && !(f.squash > 0)) {
      const d = Math.hypot(kx, ky) || 1, scale = w.px ? w.px.s / w.px.dpr : 1;
      const amount = ((feel.knockbackPx?.[0] ?? 4) + (feel.knockbackPx?.[1] ?? 6)) / 2 / scale / (f.boss ? 3 : 1);
      f.recoilX = kx / d * amount; f.recoilY = ky / d * amount; f.squash = f.squashDuration = feel.knockbackSeconds ?? .1;
      f.squashX = feel.squash?.[0] ?? 1.1; f.squashY = feel.squash?.[1] ?? .9;
    }
    // 손맛 2차(10-18): 맞은 자리에서 맞은 방향으로 불티가 튄다(적마다 0.12초에 한 번, 효과 칸이 넉넉할 때만).
    const light = sv.lightFx || w.decorLight;
    const sparks = light ? Math.min(1, feel.sparkCount ?? 3) : feel.sparkCount ?? 3;
    if (sparks > 0 && sv.feelClock - (f.sparkAt ?? -Infinity) >= .12 && sv.fx.length < (feel.sparkFxMax ?? 150)) {
      f.sparkAt = sv.feelClock;
      const base = Math.atan2(ky, kx), n = sparks;
      for (let i = 0; i < n; i++) { const a = base + (w.fxRng() - .5) * 1.3, sp = 110 + w.fxRng() * 120; addFx(sv, 'shard', f.x, f.y - f.r, { life: .16 + w.fxRng() * .1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
    }
    // 피해 숫자(대표 10-18 「데미지가 안 뜨는 경우가 많음」): 모든 타격에 흰 숫자, 치명타는 큰 노랑. 한 적에 0.15초에 하나(치명타는 늘), 화면 30개(가벼운 모드 12개).
    if (S.feedback.on(w, 'numbers') && (critical || sv.feelClock - (f.numAt ?? -Infinity) >= (feel.numberGap ?? .15)) && sv.critNums.length < Math.min(light ? 12 : 30, feel.numberMax ?? 30)) { f.numAt = sv.feelClock; addNum(sv, f.x, f.y - f.r * 1.6, v, critical, tough > 1); }
    if (sv.t - sv.lastHit >= .065) { sv.lastHit = sv.t; addFx(sv, 'spark', f.x, f.y - f.r, {life:.18}); const p = toCss(w, f.x, f.y - f.r); w.juice.moment('hit', { x: p.x, y: p.y, suppressText: true }); }
    if (f.hp <= 0) killFoe(w, f);
    return true;
  }
  function killFoe(w, f) {
    if (!f || f.dead || f.bulgasari) return;
    if (w.svReview?.revive?.(f)) return;
    const sv = w.sv, T = w.family.tuning;
    f.dead = true; sv.kills++; sv.seen.foes.add(f.def.id);
    // 손맛 2차: 0.3초 안에 다섯 마리를 쓸면 화면이 2px 흔들린다(효과 설정의 흔들림을 따른다).
    const wave = sv.killWave && sv.feelClock - sv.killWave.t0 < .3 ? sv.killWave : (sv.killWave = { t0: sv.feelClock, n: 0, shook: false });
    if (++wave.n >= 5 && !wave.shook) { wave.shook = true; impact(w, 2, .12); }
    const death = sv.deaths.length < Math.min(15, sv.feedback?.deathMax ?? 15) ? sv.deathPool.pop() : null;
    if (death) { Object.assign(death, { foe: f, x:f.x, y:f.y, t:0, popped:false, seed:w.fxRng() * Math.PI * 2, light:!!(w.decorLight || w.fxScreen?.light) }); sv.deaths.push(death); }
    else addFx(sv, 'smoke', f.x, f.y - f.r * .8, { life:.3, size:1 });
    if (f.boss) { if (f.def.moves && S.bosses) S.bosses.down(w, f); else bossDown(w, f); return; }
    sv.alive--;
    dropGem(w, f.x, f.y, T.xp.gem[f.kind === 'elite' ? 2 : ['fast','horse','archer'].includes(f.kind) ? 1 : 0]);
    if (f.kind === 'elite') { addItem(sv, 'chest', f.x, f.y); return; }
    const r = w.rng(), drop = T.coins.drop, food = T.foe.foodDrop ?? .006;
    if (r < drop) addItem(sv, 'coin', f.x, f.y);
    else if (r < drop + food) addItem(sv, 'food', f.x, f.y);
    else if (r < drop + food + .002) addItem(sv, 'magnet', f.x, f.y);
  }
  function bossDown(w, f) {
    const sv = w.sv, T = w.family.tuning;
    const shake = S.feedback.config(w).bossShake;
    sv.bosses++; sv.boss = null; S.feedback.flash(w); impact(w, shake?.px ?? 7, shake?.seconds ?? .4); S.moments.defeated(w, f);
    addFx(sv, 'boom', f.x, f.y - 24, { life: .55, size: 3 });
    for (let i = 0; i < 6; i++) dropGem(w, f.x + (w.rng() - .5) * 40, f.y + (w.rng() - .5) * 30, T.xp.gem[2]);
    addItem(sv, 'chest', f.x, f.y);
    const b = w.effectBounds();
    w.juice.moment('mission', { x: b.x + b.w / 2, y: b.y + b.h / 2, suppressText:true });
  }

  function dropGem(w, x, y, v) {
    const sv = w.sv, gems = sv.gems, xp = w.family.tuning.xp;
    if (gems.length >= GEM_MAX) {
      const g = gems[sv.gemMerge++ % gems.length], cam = sv.cam, px = w.px;
      const outside = o => px && (o.x < cam.x || o.x > cam.x + px.W || o.y < cam.y + px.top || o.y > cam.y + px.H);
      // 보이지 않는 구슬끼리 지난 경험치를 보관하고, 빈 자리는 지금 처치한 곳에서 쓴다.
      // 먼 구슬에 새 경험치만 계속 쌓이면 구슬이 꽉 찬 뒤에는 성장이 멈춘다.
      if (!g.pull && outside(g) && !outside({ x, y })) {
        const bank = gems.find(o => o !== g && !o.pull && outside(o));
        if (bank) {
          bank.v += g.v; bank.tier = gemTier(bank.v,xp);
          Object.assign(g, { x, y, vx: 0, vy: -50, bounce: .22, v, tier: gemTier(v,xp), pull: false, sp: 0 });
          return g;
        }
      }
      g.v += v; g.tier = gemTier(g.v,xp); return g;
    }
    const g = { x: x + (w.rng() - .5) * 6, y: y + (w.rng() - .5) * 6, vx: (w.rng() - .5) * 90, vy: -50 - w.rng() * 40, bounce: sv.level === 1 ? xp.firstBounce?.[sv.cell?.id] ?? .22 : .22, v, tier: gemTier(v,xp), pull: false, sp: 0 };
    gems.push(g);
    return g;
  }
  function addItem(sv, type, x, y, extra) {
    if (sv.items.length >= ITEM_MAX && type !== 'chest' && type !== 'scroll') return null;
    const it = { type, x, y, pull: false, sp: 0, t: 0, ...(type === 'coin' ? { bounce:.22, vx:Math.cos(x+y)*35, vy:-45 } : {}), ...extra };
    sv.items.push(it);
    if (type === 'chest') S.feedback.stop(sv, sv.feedback?.stopSeconds ?? .1, 'chestDrop');
    return it;
  }
  function addFx(sv, kind, x, y, o = {}) {
    const e = sv.fxPool.pop(); if (!e) return null;
    // Keep the reused body's property layout. Every old value, including
    // optional graphics state, is cleared before the next effect is assigned.
    for (const key of Object.keys(e)) e[key] = undefined;
    Object.assign(e, { kind, x, y, t: 0, life: .4, ...o });
    sv.fx.push(e);
    return e;
  }
  function addNum(sv, x, y, v, crit = true, tough = false) {
    const n = sv.numPool.pop(); if (!n) return;
    Object.assign(n, { x, y, v, t:0, crit, tough }); sv.critNums.push(n);
  }
  function stepFx(sv, dt) {
    let n = 0;
    for (const e of sv.fx) { e.t += dt; if (e.t < e.life) sv.fx[n++] = e; else sv.fxPool.push(e); }
    sv.fx.length = n; n = 0;
    for (const e of sv.critNums) { e.t += dt; if (e.t < (sv.feedback?.numberSeconds ?? .6)) sv.critNums[n++] = e; else sv.numPool.push(e); }
    sv.critNums.length = n; n = 0;
    for (const d of sv.deaths) {
      d.t += dt;
      if (!d.popped && d.t >= (sv.feedback?.deathSeconds ?? .15)) {
        d.popped = true;
        addFx(sv, 'boom', d.x, d.y - d.foe.r, { life:.2, size:d.foe.boss ? 2 : .8 });
        // 손맛 2차: 쓰러진 적은 주인공 반대쪽으로 통째로 돌며 튕겨 날아간다(아이들 게임이라 조각내지 않는다). 가벼운 모드는 뺀다.
        if (!d.foe.boss && !d.light && sv.feedback?.deathPieces !== false) {
          const a = Math.atan2(d.y - sv.hero.y, d.x - sv.hero.x);
          addFx(sv, 'piece', d.x, d.y - d.foe.r, { life:.5, vx:Math.cos(a) * 110, vy:Math.sin(a) * 30 - 120, slot:'foe-' + d.foe.sprite + '-a', flip:d.foe.faceX < 0, scale:d.foe.kind === 'elite' ? 2 : 1, spin:(Math.cos(a) < 0 ? -1 : 1) * 10 });
        }
        for (let i = 0; i < Math.min(6, sv.feedback?.smokeCount ?? 6); i++) { const a = d.seed + i * Math.PI / 3; addFx(sv, 'smoke', d.x, d.y - d.foe.r, { life:.32, size:d.light ? .5 : 1, vx:Math.cos(a)*26, vy:Math.sin(a)*18 }); }
      }
      if (d.t < .5) sv.deaths[n++] = d; else { d.foe = null; sv.deathPool.push(d); }
    }
    sv.deaths.length = n;
    n = 0;
    for (const p of sv.flights) { p.t += dt; if (p.t < p.life) sv.flights[n++] = p; else sv.flightPool.push(p); }
    sv.flights.length = n;
    sv.shakeTime = Math.max(0, sv.shakeTime - dt);
    sv.battleFlash = Math.max(0, sv.battleFlash - dt);
    if (sv.flash > 0) sv.flash = Math.max(0, sv.flash - dt);
  }
  function impact(w, power, seconds) {
    const sv = w.sv;
    if (!S.feedback.on(w, 'shake')) return;
    sv.shake = Math.max(S.feedback.left(w,'shakeTime') > 0 ? sv.shake : 0, power); sv.shakeTime = Math.max(sv.shakeTime, seconds);
    sv.shakeTimeUntil = Math.max(sv.shakeTimeUntil || 0, (w.real??sv.feelClock)+seconds);
  }

  // 줍는 거리 안의 구슬·엽전·떡·자석은 끌려오고, 상자·두루마리는 닿아야 줍는다. on(it)은 상자·두루마리를 넘겨받는다.
  function pickups(w, dt, on) {
    const sv = w.sv, h = sv.hero, T = w.family.tuning, range = T.hero.pickup * (sv.stats?.pickup || 1), r2 = range * range;
    // Keep the existing experience/collision timing. The pooled picture finishes
    // its 300ms flight even when the gem has already reached the pickup radius.
    const pull = (o, d, dx, dy) => { o.sp = Math.min(460, (o.sp || 70) + 1100 * dt); const s = Math.min(d, o.sp * dt); o.x += dx / d * s; o.y += dy / d * s; };
    const gems = sv.gems;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i], dx = h.x - g.x, dy = h.y - g.y, d2 = dx * dx + dy * dy;
      if (g.bounce > 0) { g.bounce -= dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 460 * dt; continue; }
      if (!g.pull && d2 <= r2) g.pull = true;
      if (!g.pull) continue;
      if (!g.flight) {
        const p=sv.flightPool.pop();
        if(p){Object.assign(p,{x:g.x,y:g.y,t:0,life:sv.feedback?.pickupSeconds ?? .3,tier:g.tier,type:'gem',collection:g.collection||null});sv.flights.push(p);g.flight=true;}
      }
      const d = Math.sqrt(d2) || 1e-6;
      if (d < 8) {
        // 동료 덤: 배움 동료의 잠깐 두 배(rate에 더함), 모아 오기 각성 구슬(g.bonus). 동료가 없으면 원래 계산 그대로.
        const gains = sv.play === 'stage' ? T.xp.stageActGain || T.xp.actGain : T.xp.actGain;
        const act = gains?.[sv.cell?.id]?.[Math.min(3, sv.act) - 1] ?? 1, extra = S.allies ? S.allies.xpExtra(w) : 0;
        sv.xp += g.v * ((sv.stats?.xp || 1) + extra) * act * (g.bonus || 1);
        S.allies?.gained(w, g, act, extra);
        gems[i] = gems[gems.length - 1]; gems.pop();
        if (!g.collection?.skipped && sv.t - sv.lastGem > .05) {
          sv.gemPitch = sv.t - sv.lastGem < (S.feedback.config(w).pickupResetSeconds ?? .6) ? Math.min(12, sv.gemPitch + 1) : 0; sv.lastGem = sv.t;
          S.feedback.sound(w, 'count', { vol: .16, semitones: sv.gemPitch });
        }
        S.moments.collected(w, g);
        continue;
      }
      pull(g, d, dx, dy);
    }
    const items = sv.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      if (it.bounce > 0) { it.bounce -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vy += 400 * dt; continue; }
      const dx = h.x - it.x, dy = h.y - it.y, d2 = dx * dx + dy * dy, touch = it.type === 'chest' || it.type === 'scroll';
      if (!touch && !it.pull && d2 <= r2) it.pull = true;
      const d = Math.sqrt(d2) || 1e-6;
      if (d2 > (touch ? 256 : 64)) { if (it.pull) pull(it, d, dx, dy); continue; }
      items[i] = items[items.length - 1]; items.pop();
      const p = toCss(w, it.x, it.y - 6);
      if (it.type === 'coin') { sv.coinsPicked++; w.juice.moment('coin', { x: p.x, y: p.y, suppressText: true }); }
      else if (it.type === 'food') {
        // 동료 음식은 자기 회복량(it.heal)을 가진다. 먹은 뒤 각성 보호막은 allies.js가 정한다.
        // 유물 유리병(heal)은 음식 회복을 늘린다.
        const before = h.hp; h.hp = Math.min(h.hpMax, h.hp + Math.round(h.hpMax * (it.heal ?? .2) * (sv.stats?.heal ?? 1)));
        w.juice.moment('coin', { x: p.x, y: p.y, suppressText: true }); addFx(sv, 'heal', h.x, h.y - 10, { life: .5 });
        S.allies?.ate(w, it, before);
      }
      else if (it.type === 'magnet') { S.moments.collect(w); w.juice.emit?.({ x: p.x, y: p.y }, { n: 16, shapes: ['spark'], size: [3, 7], speed: [80, 220], life: [250, 450] }); }
      else on?.(it);
    }
  }

  S.world = { create, toCss, camera, grid, near, nearest, nearestK, ringPoint, spawnFoe, spawnBoss, spawnStep, moveFoes, separateFoes, hurtHero, hitFoe, killFoe, capOf, foeShoot,
    dropGem, addItem, addFx, addNum, stepFx, pickups, impact, reserve, propAt, moveBody, unwall, steer, firstWall, blockShot, inWall, HERO_R };
})();
