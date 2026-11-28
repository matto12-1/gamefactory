// 팔도 장단 노랫말 장면: 앞소리꾼이 부르는 동안 하늘에서 일어나는 일(별 · 지는 해 · 줄로 묶기 · 끌려가기)
// 마디 · 박과 이미 난 손 판정을 보고 그린다. 멈췄다 이어도 그 마디 처음부터 다시 맞는다. 판정과 점수에는 손대지 않는다
// 색: [하늘 r g b, 마당 덮개 r g b 진하기]. 곡이 흐르며 낮 → 노을 → 어스름 → 달밤으로 간다(마디의 stage)
const MOOD_DAY = [207, 227, 222, 38, 52, 110, 0], MOOD_NIGHT = [58, 72, 120, 38, 52, 110, 0.26], MOOD_SUNSET = [242, 196, 146, 255, 150, 70, 0.12], MOOD_DUSK = [112, 100, 150, 70, 50, 120, 0.26];
const STAR_SPOTS = [[.07, .3], [.15, .62], [.22, .18], [.31, .46], [.38, .78], [.46, .24], [.53, .55], [.6, .12], [.67, .7], [.74, .34], [.81, .58], [.88, .2], [.94, .66], [.42, .9]];
const KID_X = 176, KID_Y = 172, ROPE = '#5a3a28', RIDGE_Y = 40;
const HAND = { throw: [-10, -25], pull: [-14, -14], fly: [-14, -10] }; // 줄 꼬마를 왼쪽으로 뒤집었을 때 발에서 손까지(그림을 재서 얻음)
const WIDE_UNTIL = 3.5; // 받는 소리 0.6초 앞에 내 꼬마 쪽으로 돌아온다

const STAGE_MOOD = { day: MOOD_DAY, sunset: MOOD_SUNSET, dusk: MOOD_DUSK, night: MOOD_NIGHT };
function lastSceneBefore(i) { for (let k = Math.min(i, songBars.length) - 1; k >= 0; k--) if (songBars[k].scene) return songBars[k].scene; return null; }
const barStage = i => (songBars[i] && songBars[i].stage) || 'day';
// 지금 무대를 정하는 것: 그 마디의 장면, 없으면 마지막으로 지난 장면의 끝
function skyStage(rec, vt) {
  if (!song || !song.pungmul) return null;
  const wait = rec && rec.def.countIn; // 이어 하기 앞 장구 동안은 지난 마디 끝의 무대에 머문다
  const i = rec ? rec.def.i - (wait ? 1 : 0) : state === 'end' ? songBars.length : -1;
  const b = rec && !wait ? (vt - rec.t0) / rec.beat : 9;
  const scene = rec && rec.def.scene && b >= 0 ? rec.def.scene : null;
  // 끝 화면은 마지막 무대를 그대로 둔다. 연습 마디는 낮이다
  const at = state === 'end' ? songBars.length - 1 : i;
  const rest = song.restStage || 'day'; // 시작 창과 연습 마디의 무대. 강강술래는 해 진 바닷가
  return { b, scene, i, last: scene || (i >= 0 ? lastSceneBefore(i) : null), stage: at >= 0 ? barStage(at) : rest, prev: at > 0 ? barStage(at - 1) : rest };
}
const mixMood = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const step6 = k => Math.round(clamp01(k) * 6) / 6; // 색은 여섯 칸으로만 바꾼다(도트 판에 어울리게)
function moodNow(st) {
  if (!st) return MOOD_DAY;
  const base = STAGE_MOOD[st.stage] || MOOD_DAY;
  if (!st.scene) return base;
  const b = st.b, from = STAGE_MOOD[st.prev] || MOOD_DAY;
  // 첫 별 장면은 아직 낮이라 잠깐 밤이 됐다가 돌아온다
  if (st.scene === 'stars' && st.stage === 'day') return mixMood(MOOD_DAY, mixMood(MOOD_DAY, MOOD_NIGHT, step6(b / 2)), step6((WIDE_UNTIL + 0.2 - b) / 0.5));
  if (st.scene === 'drag') return mixMood(from, base, step6((b - 1) / 2));
  return mixMood(from, base, step6(b / (song.ring ? 4 : 2)));
}
const moodSky = m => `rgb(${Math.round(m[0])},${Math.round(m[1])},${Math.round(m[2])})`;
const moodTint = m => (m[6] > 0 ? `rgba(${Math.round(m[3])},${Math.round(m[4])},${Math.round(m[5])},${m[6].toFixed(3)})` : '');

// 해 자리: 서쪽 산 위로 내려와 머물고, 끌려갈 때 산 뒤로 넘어간다
const sunX = () => captionDLive()?KID_X-10:camX + Math.round(VW * 0.3);
const sunHold = () => Math.max(24, vy + 16);
function sunPlace(st,f){const p=sunPlaceRaw(st,f);return p?captionDSolar(p):p;}
function captionDSolar(p,kind='sun'){
  if(!captionDLive()||!captionD.slots.me||!captionD.slots.ba)return p;
  const pair=Object.values(captionD.slots).sort((a,b)=>a.x-b.x),dot=K/DPR;
  // The rope runs through the permanent gap between the two papers. Its child stays on the ground.
  const lane=(pair[0].x+pair[0].w+pair[1].x)/2;
  const dx=kind==='sun'&&H<=420?camX+80/dot-sunX():camX+lane/dot+(kind==='kid'?14:-10)-(kind==='kid'?KID_X:sunX());
  const dy=kind==='sun'?(H<=420?camY+12/dot-sunHold():Math.min(0,camY+(Math.min(...pair.map(s=>s.y-4))-8)/dot-24-sunHold())):0;
  const key=[song.id,W,H,K,camX,camY,'assembly',kind==='kid'?'sun-and-rope':'sun-sky'].join('|');
  captionD.moves.set(key,{x:dx,y:dy});
  return {...p,x:p.x+dx,y:p.y+dy};
}
function sunPlaceRaw(st, f) {
  if (!st || !st.last) return null;
  const y1 = sunHold(), wob = RM ? 0 : Math.round(Math.sin(f * 37));
  if (st.scene === 'sunset') {const rise=captionDLive()?10:26;return { x: sunX(), y: y1 - rise + Math.round(rise * clamp01(st.b / 4)) };}
  if (st.scene === 'tie') return { x: sunX() + (st.b >= 2.1 ? wob : 0), y: y1, tied: st.b >= 2.1 };
  if (st.scene === 'drag') {
    if (st.b >= 3.4) return null;
    const k = clamp01((st.b - 1) / 2.4);
    return { x: sunX() + (k > 0 ? 0 : wob), y: y1 + Math.round((74 - y1) * k * k), tied: true };
  }
  if (st.scene === 'stars' || st.last === 'stars' || st.last === 'drag' || st.last === 'moon') return null;
  return { x: sunX() + (st.last === 'tie' ? wob : 0), y: y1, tied: st.last === 'tie' };
}
// 줄 꼬마: 왼쪽에서 뛰어와 줄을 돌려 던지고, 당기다가 해와 함께 산 너머로 끌려간다
function kidPlace(st,f){const p=kidPlaceRaw(st,f);return p?captionDSolar(p,'kid'):p;}
function kidPlaceRaw(st, f) {
  if (!st) return null;
  const last = st.scene || st.last;
  const at = (name, hand, rope = 0, x = KID_X, y = KID_Y) => ({ name, x, y, dir: -1, hand, rope });
  if(song?.id==='kwaeji'){
    const rec=bars.find(r=>r.def.i===st.i),previous=[...bars].reverse().find(r=>['tie','drag'].includes(r.def.scene)&&r.t0<=heardNow());
    const recovered=previous&&last===previous.def.scene&&Rules.isHit(previous.holdRelease)&&f-holdIndicator.releasedAt>=0&&f-holdIndicator.releasedAt<.35;
    if(recovered){const p=(f-holdIndicator.releasedAt)/.35;return {...at('rope-pull',HAND.pull,0,KID_X+Math.round((1-p)*3),KID_Y),recover:p};}
    if(charge&&!charge.pending&&charge.rec===rec&&(st.scene==='drag'||st.scene==='tie'&&st.b>=2.1)){
      const lean=RM?0:Math.floor(f*8)%2;
      return {...at('rope-pull',HAND.pull,1,KID_X+lean*2,KID_Y+lean),brace:true};
    }
  }
  if (last === 'tie') {
    // 받는 소리에서는 내 꼬마 곁을 비운다. 가까이 보는 화면에서 줄이 판을 가로지르기 때문이다(하늘이 늘 보이는 폰 세로만 남긴다)
    if (!st.scene && wideK() !== baseK) return null;
    if (!st.scene || st.b >= 2.1) return at('rope-pull', HAND.pull, 1);
    if (st.b < 0.8) { const x0 = camX - 20; return { name: `kid-a-run-${Math.floor(f * 10) % 2 + 1}`, x: x0 + (KID_X - x0) * clamp01(st.b / 0.8), y: KID_Y, dir: 1 }; }
    if (st.b < 1.7) return { ...at('rope-throw', HAND.throw), loop: true };
    return at('rope-throw', HAND.throw, clamp01((st.b - 1.7) / 0.4));
  }
  if (st.scene === 'drag') {
    if (st.b < 1) return at('rope-pull', HAND.pull, 1, KID_X - Math.round(st.b * 8));
    if (st.b >= 3.4) return null;
    // 지붕보다 높이 떴다가 산 뒤로 떨어진다. 산 위 하늘에 있을 때 층을 바꿔서 튀지 않는다
    const k = clamp01((st.b - 1) / 2.4), x0 = KID_X - 8, u = 1 - k;

    const y=u*u*KID_Y+2*k*u*-55+k*k*70;
    return { ...at(`rope-fly-${Math.floor(f * 8) % 2 + 1}`, HAND.fly, 1, x0 + (sunX() - x0) * k, y), back: k > 0.8 };
  }
  return null;
}
function drawRope(ax, ay, bx, by, p) {
  const n = Math.max(6, Math.round(Math.hypot(bx - ax, by - ay)));
  lg.fillStyle = ROPE;
  for (let i = 0; i <= n * p; i++) {
    const t = i / n, sag = Math.sin(t * Math.PI) * 4;
    lg.fillRect(Math.round(ax + (bx - ax) * t - vx), Math.round(ay + (by - ay) * t + sag - vy), 2, 2);
  }
}
function kidRope(k, st, f) {
  const raw = sunPlaceRaw(st, f), s = raw && captionDSolar(raw);
  if (k.rope && s) {
    const ax=k.x+k.hand[0],ay=k.y+k.hand[1],bx=s.x+10,by=captionDLive()?s.y+12:Math.min(raw.y+12,RIDGE_Y)+s.y-raw.y;
    if(captionDLive()&&H<=420){
      const slots=Object.values(captionD.slots).sort((a,b)=>a.x-b.x),dot=K/DPR;
      const x=camX+(slots[0].x+slots[0].w+slots[1].x)/2/dot,hi=camY+(Math.min(...slots.map(s=>s.y))-12)/dot;
      const points=[[ax,ay],[x,hi],[bx,by]],lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*k.rope;
      for(let i=0;i<lengths.length&&remaining>0;i++){drawRope(...points[i],...points[i+1],Math.min(1,remaining/lengths[i]));remaining-=lengths[i];}
    }else drawRope(ax,ay,bx,by,k.rope);
  }
}
function kidBody(k, f) {
  if(k.brace&&!RM){
    // 버티는 발 옆에서만 작은 먼지가 밀린다. 점수와 상모 단계에는 닿지 않는다.
    lg.fillStyle='#c4a276';
    for(let i=0;i<4;i++){const p=(f*3+i*.23)%1;lg.fillRect(Math.round(k.x+4+p*9-vx),Math.round(k.y-1-p*3-vy),2,1);}
  }
  spr(k.name, k.x, k.y, k.dir);
  if (!k.loop) return;
  // 손 위에서 줄 고리를 돌린다(끊어진 자리가 돌아간다)
  const cx = k.x + k.hand[0], cy = k.y + k.hand[1] - 5, gap = RM ? 0 : Math.floor(f * 24);
  lg.fillStyle = ROPE;
  for (let i = 0; i < 24; i++) {
    if ((i + gap) % 24 < 3) continue;
    const t = (i / 24) * Math.PI * 2;
    lg.fillRect(Math.round(cx + Math.cos(t) * 10 - vx), Math.round(cy + Math.sin(t) * 3 - vy), 2, 1);
  }
}
// 달: 「moon」 마디에 산 뒤에서 올라와 끝까지 떠 있다
// 강강술래는 바다 위 한 자리(화면 안으로만 당긴다). 넓게 물러나도 바위 곶 위로 가지 않는다
const moonX = () => (song && song.ring ? Math.max(camX + 28, Math.min(camX + VW - 28, RING_SEA.moonX)) : camX + Math.round(VW * 0.8));
// 달은 말풍선을 비키되 지름 전체가 화면 안(끝에서 8px)에 있게 먼저 찾는다. 위로만 비킨다(아래로는 화면 위 끝 안으로 들일 만큼만, 더 가면 땅에 박힌다). 안에 빈 곳이 없을 때만 화면 밖으로 비킨다.
function moonPlace(st){const p=moonPlaceRaw(st);if(!p)return p;return captionDPropGroup('moon',p,{x:moonX()-24,y:Math.min(sunHold(),130)-24,w:48,h:Math.abs(130-sunHold())+48,allowOutside:true,preferInside:true,keepInside:true,topOnly:true});}
function moonPlaceRaw(st) {
  if (!st || st.last !== 'moon') return null;
  const y1 = sunHold(), y0 = song.ring ? RING_SEA.horizon + 26 : 74; // 강강술래는 바다에서 떠오른다
  if (st.scene === 'moon') return { x: moonX(), y: y0 + Math.round((y1 - y0) * (song.ring ? clamp01(st.b / 4) : easeOut(clamp01(st.b / 3)))) }; // 강강술래는 10.7초 메기는 소리 내내 고르게 오른다
  return { x: moonX(), y: y1 };
}
// 달밤: 횃불이 마당 양쪽에 서고 초롱 줄이 처마 앞에 내려온다. 불빛은 마당에 동그랗게 번진다
const TORCH = [{ x: 58 }, { x: 262 }], TORCH_Y = 142, LANTERN_Y = 94;
const torchesOn = st => !!st && st.stage === 'night' && !(st.scene === 'stars' && st.b < 1.5);
const lanternsOn = st => !!st && st.last === 'moon';
function kwaejiLanternCount() {
  const rows=new Map();
  for(const t of targets)if(!t.rec.def.call&&t.rec.def.clip){if(!rows.has(t.rec))rows.set(t.rec,[]);rows.get(t.rec).push(t);}
  const total=songBars.filter(b=>!b.call&&b.clip&&!b.demo).length;
  const full=[...rows.values()].filter(ts=>ts.length&&ts.every(t=>t.judged&&Rules.isHit(t.res))).length;
  return total?Math.min(4,Math.floor(full*4/total)):0;
}
function drawKwaejiLanterns(st) {
  const im=SPRITES.lanterns,drop=st.scene==='moon'?Math.round((1-easeOut(clamp01(st.b/.6)))*34):0;
  const at=captionDPropGroup('lantern-row',{x:0,y:LANTERN_Y-27},{x:camX,y:LANTERN_Y-61,w:VW,h:64,axis:'y',allowOutside:true}),y=at.y-drop;
  const count=kwaejiLanternCount(),last=targets.find(t=>t.rec.def.finale),age=last?heardNow()-last.t:Infinity;
  const final=last&&Rules.isHit(last.res)&&age>=0&&age<.8?1-age/.8:0;
  for(let x=-160;x<WORLD_W+160;x+=160)lg.drawImage(im,0,0,160,7,Math.round(x-vx),Math.round(y-vy),160,7);
  [60,124,196,260].forEach((x,i)=>{
    const lit=i<count;
    if(lit){lg.fillStyle=`rgba(255,213,136,${.12+final*.2})`;for(let j=-8;j<=8;j++){const w=Math.round(12*Math.sqrt(1-j*j/64));lg.fillRect(Math.round(x-w-vx),Math.round(y+19+j-vy),w*2+1,1);}}
    lg.save();lg.globalAlpha=lit?1:.38;lg.drawImage(im,23,7,15,23,Math.round(x-7-vx),Math.round(y+7-vy),15,23);lg.restore();
    if(lit){lg.fillStyle=`rgba(255,224,151,${.5+final*.3})`;lg.fillRect(Math.round(x-5-vx),Math.round(y+19-vy),11,7);}
  });
}
function drawNightProps(st, f) {
  if (!st || st.stage !== 'night' || song.ring) return; // 바닷가에는 처마 초롱과 횃불이 없다
  if (lanternsOn(st) && SPRITES.lanterns) {
    if(song.id==='kwaeji')drawKwaejiLanterns(st);
    else {
    const drop = st.scene === 'moon' ? Math.round((1 - easeOut(clamp01(st.b / 0.6))) * 34) : 0;
    const y = Math.round(LANTERN_Y - 27 - drop - vy);
    for (let x = -160; x < WORLD_W + 160; x += 160) lg.drawImage(SPRITES.lanterns, x - vx, y);
    }
  }
  if (!torchesOn(st)) return;
  const flick = RM ? 0 : Math.floor(f * 7) % 2, flame = `torch-${flick + 1}`;
  for (const t of TORCH) {
    const at=captionDArtworkGroup('torch-'+t.x,{x:t.x,y:TORCH_Y},[1,2].map(n=>({pose:'torch-'+n,x:t.x,y:TORCH_Y})),2,{axis:'x',x:t.x-48,y:TORCH_Y-48,w:96,h:68});
    const gx = at.x - vx, gy = at.y - vy + 2;
    // 불빛: 층진 타원 셋. 판 점 격자에 맞춘 줄 칠하기라 흐림이 없다
    for (const [rx, ry, a] of [[46, 15, 0.08], [30, 10, 0.1], [16, 6, 0.12]]) {
      lg.fillStyle = `rgba(255,186,96,${a})`;
      for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); lg.fillRect(gx - w, gy + dy, w * 2 + 1, 1); }
    }
    spr(flame, at.x, at.y);
  }
}
// 하늘 층: 배경 그림 뒤에 그려서 지붕과 산에 가린다
function drawSkyActors(st, f) {
  if (!st) return;
  const night = st.stage === 'night';
  if ((st.scene === 'stars' && (st.b < 3.4 || night)) || (night && st.scene !== 'stars')) {
    const shown = st.scene === 'stars' ? Math.floor(st.b / 0.25) : STAR_SPOTS.length, top = vy + 3, h = Math.max(20, 46 - top);
    lg.fillStyle = '#fff3c4';
    STAR_SPOTS.slice(0, shown).forEach(([ux, uy], i) => {
      const x = Math.round(ux * VW), y = Math.round(top + uy * h - vy);
      lg.fillRect(x, y, 1, 1);
      if (RM || Math.floor(f * 2.6 + i * 1.7) % 3) { lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x, y - 1, 1, 3); }
    });
  }
  const mo = moonPlace(st);
  if (mo && SPRITES.moon) lg.drawImage(SPRITES.moon, Math.round(mo.x - vx) - 24, Math.round(mo.y - vy) - 24);
  const s = sunPlace(st, f), im = SPRITES.sun;
  if (s && im) {
    const x = Math.round(s.x - vx), y = Math.round(s.y - vy);
    lg.drawImage(im, x - im.width / 2, y - im.height / 2);
    if (s.tied) { lg.fillStyle = ROPE; lg.fillRect(x - 15, y + 5, 30, 2); } // 해 그림의 둥근 판 폭 안에서만 묶는다
  }
  const k = kidPlace(st, f);
  if (k && k.back) { kidRope(k, st, f); kidBody(k, f); }
}
// 마당 층: 줄은 일꾼 뒤로, 꼬마와 돌리는 고리는 일꾼 앞으로 그린다
function drawRopeLine(st, f) {
  const k = kidPlace(st, f);
  if (k && !k.back) kidRope(k, st, f);
}
function drawRopeKid(st, f) {
  const k = kidPlace(st, f);
  if (k && !k.back) kidBody(k, f);
}
// 줄이 걸릴 때 · 끌려갈 때 한 번씩 소리를 낸다
function gagSound(rec, b) {
  if (rec.gagDone || !ctx) return;
  if (rec.def.scene === 'stars' && rec.def.stage === 'night' && b >= 1.5) { // 횃불에 불이 붙는다
    rec.gagDone = true; sample('pop', ctx.currentTime, 0.7);
    if (!RM) TORCH.forEach(t => {const at=captionDArtworkGroup('torch-'+t.x,{x:t.x,y:TORCH_Y},[1,2].map(n=>({pose:'torch-'+n,x:t.x,y:TORCH_Y})),2,{axis:'x',x:t.x-48,y:TORCH_Y-48,w:96,h:68});paper(at.x,at.y-40,10,0.9);});
  }
  if (rec.def.scene === 'tie' && b >= 2.1) { rec.gagDone = true; sample('pop', ctx.currentTime, 0.7); }
  if (rec.def.scene === 'drag' && b >= 1) { rec.gagDone = true; whoosh(ctx.currentTime); }
}
