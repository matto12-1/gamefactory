// 거문도 배 판. 손과 노는 그림 정보의 두 손 기준을 따른다
const boatOn = () => !!(song && song.boat);
const BOAT_AT = [4, 8, 12, 16, 20];
const BOAT_CAST = { LEAD: { x: 226, y: 118, dir: 1, bx: 0 }, FOLLOW: { x: 196, y: 118, dir: 1 }, HERO: { x: 166, y: 118, dir: 1, bx: 4 } };
const boatViewK = () => {
  // 낮은 가로는 점 크기를 화면(CSS) 화소로 먼저 정하고 기기 화소를 곱한다. 기기 화소로 나누면 DPR 2 · 3 폰에서 장면이 17~25% 커져 노꾼이 뱃전 아래로 밀린다.
  if(song?.id==='geomun'&&H<=420)return Math.max(1,Math.min(baseK,Math.floor(DPR*Math.min(Math.floor(W/224),Math.floor(H/110)))));
  if(song?.boatScene?.river){
    return Math.max(1,Math.min(baseK,Math.floor(CVW/224),Math.floor(CVH/(H<=420?110:146))));
  }
  return Math.max(1, Math.min(baseK, Math.floor(CVW / 224), Math.floor(CVH / 146)));
};
const boat = {};
function boatReset() {
  Object.assign(boat, { distance: 0, hitT: -9, earlyT: -9, dragT: -9, lookT: -9, finalT: -9, power: 0, perfect: false,
    grab: false, misses: 0, error: null, errorN: 0, helpPending: false, helpI: null, flags: [], fish: [], heroPose: 'hero-hold', creakT: -9, endT: -9, geometry: null,
    motionQueue: [], motionRest: null, motionT: -9, motionBlocked: null, motionPose: null,
    baskets: [], braceCharge: null, braceSplashT: -9, twistRest: null, grabT: -9,
    glideFrom: 0, glideT: -9, glideDur: .46, linger: {}, trail: [], trailT: -9, wake: 0, wakeF: -9, chorusNow: false });
}
boatReset();
const boatSnapshot = () => ({ distance: boat.distance, grab: boat.grab, misses: boat.misses, error: boat.error, errorN: boat.errorN,
  helpPending: boat.helpPending, helpI: boat.helpI, flags: boat.flags.map(p => ({ ...p })), fish: boat.fish.map(p => ({ ...p })), baskets: boat.baskets.map(p=>({...p})) });
function boatRestore(s) { if (s) Object.assign(boat, s, { hitT: -9, earlyT: -9, dragT: -9, lookT: -9, finalT: -9, grabT: -9, braceCharge:null, braceSplashT:-9, twistRest:null, glideT:-9, linger:{}, trail:[], wakeF:-9 }); }
let boatArtPromise = null;
let boatArtKey = null;
async function boatArtReady() {
  const id = song?.id || 'geomun';
  if (artNow === id) return true;
  if (boatArtKey !== id) { boatArtPromise = null; boatArtKey = id; }
  if (!boatArtPromise) boatArtPromise = (async () => {
    const def = SONG_ART[id], heroDir = `art/${song && song.heroArt || 'geomun'}/`;
    const [base, own] = await Promise.all([loadArtSet(def.dir, def.names.filter(n => !n.startsWith('hero-'))).ready, loadArtSet(heroDir, BOAT_HERO_NAMES).ready]);
    if (base.missing || own.missing) { boatArtPromise = null; return null; }
    return { sprites: { ...base.sprites, ...own.sprites }, meta: { ...base.meta, ...own.meta, 'boat-bg': base.meta['boat-bg'] || base.meta.bg } };
  })();
  const set = await boatArtPromise; if (!set) return false;
  if (song && song.id === id) {
    if (artNow && artNow !== id) for (const n of SONG_ART[artNow].names) { delete SPRITES[n]; delete META[n]; }
    putArt(set, SONG_ART[id].names); artNow = id; flashCache = null;
  }
  return true;
}
function boatHit(tg, power) {
  if (!boatOn()) return;
  const f = performance.now() / 1000;
  boat.hitT = f; boat.power = power; boat.perfect = tg.res === 'perfect'; boat.grab = false; boat.misses = 0; boat.error = null; boat.errorN = 0;
  boat.earlyT=boat.dragT=boat.lookT=-9;hero.fizzleT=-9;
  if (tg.part === '연습') return;
  // 강 배: 떼기 맞힘은 크게 미끄러지고(8 → 14점, 0.8초, 재미 F02), 후렴 톡은 몰아 젓는다(5 → 7점, R1-09). 배경은 그 길이만큼 미끄러진다
  const river = !!song.boatScene?.river;
  const step = power > 0 ? (river ? 14 : 8) : river && tg.rec.def.chorus ? (tg.res === 'perfect' ? 7 : 5) : tg.res === 'perfect' ? 5 : 3;
  if (river) { boat.glideFrom = riverMotion(f); boat.glideT = f; boat.glideDur = power > 0 ? .8 : .46; }
  boat.distance += step;
  if(song.id==='geomun'&&baDone(tg)&&!boat.baskets.some(p=>p.i===tg.rec.def.i)){
    boat.baskets.push({i:tg.rec.def.i,t:f+.3});boat.fish.push({at:'basket',t:f+.3});
    sample('fish-jump',ctx.currentTime+.3,.6);log('boat-basket',{count:boat.baskets.length,i:tg.rec.def.i});
  }
  for (const at of ((hardRun && song.boatScene?.hardSteps) || song.boatScene?.steps || BOAT_AT)) if (sc.hits >= at && !boat.flags.some(p => p.at === at)) {
    boat.flags.push({ at, t: f }); wow('boat-flag'); sample('flag-up', ctx.currentTime, .9);
    if(!song.boatScene?.river&&(at===8||at===16))boat.motionQueue.push(at);
    log('boat-flag', { at, count: boat.flags.length });
    if (song.boatScene?.river) sample('clap',ctx.currentTime+.12,.7);
    else if (at === 8 || at === 16) { boat.fish.push({ at, t: f }); sample('fish-jump', ctx.currentTime + .12, .9); log('boat-fish', { at }); }
  }
  if (tg.rec.def.finale && Math.abs(tg.beat - tg.rec.def.finaleBeat) < .001) {
    boat.finalT = f;
    if(!song.boatScene?.river)boat.fish.push({ at: 23, t: f, total:boatFinalFish(sc.hits) }); boatAccent('finale', ctx.currentTime); log('boat-final');
  } else if (power > 0) sample('splash', ctx.currentTime + .05, .5);
}
function boatMiss(kind) {
  if (!boatOn()) return;
  const f = performance.now()/1000;
  if (kind === 'early') { boat.earlyT = f; boat.lookT = f + .04; }
  else if (kind !== 'spoiled') boat.dragT = f;
  boat.misses = kind === 'none' ? boat.misses + 1 : 0;
  // 이어 두 번 놓쳐 노를 붙잡는 순간: 옆 노꾼이 0.65초 휘청하고 노 끝에 물보라와 물소리(그래프 검수 4회차 R1-04)
  if (boat.misses >= 2 && !boat.grab) { boat.grabT = f; if (ctx) sample('splash', ctx.currentTime + .06, .7); }
  if (boat.misses >= 2) boat.grab = true;
  if (boat.error === kind) boat.errorN++; else { boat.error = kind; boat.errorN = 1; }
  if (boat.errorN >= 2) boat.helpPending = true;
  if (ctx && kind !== 'spoiled') sample('oar-creak', ctx.currentTime, .65);
}
function boatBar(rec) {
  if (!boatOn() || !ctx) return;
  if (rec.def.rest) { sample('drip', rec.t0, .8, band); log('rest-drip', { t: rec.t0, i: rec.def.i }); }
  if (!rec.def.call && rec.def.clip && boat.helpPending) { boat.helpI = rec.def.i; boat.helpPending = false; }
  if (rec.def.call && !song.boatScene?.river) sample(`wave-${Math.floor(rec.def.i/3)%2+1}`, rec.t0 + .2, .5, music);
}
function boatAccent(kind, t) {
  if (song.boatScene?.river && ['finale','seal','enter'].includes(kind)) {
    sample('row',t,.9);sample('splash',t+.12,.65);if(kind==='finale'){sample('clap',t+.4,.8);sample('clap',t+.8,.7);}return;
  }
  if (kind === 'charge' || kind === 'full') sample('oar-creak', t, kind === 'charge' ? .8 : 1);
  else if (kind === 'burst' || kind === 'level') { sample('row', t, .8); sample('splash', t + .08, .5); }
  else if (kind === 'finale') { sample('row', t, 1.2); sample('splash', t + .12, .85); sample('fish-jump', t + .4, .9); sample('flag-up', t + .8, .8); sample('gull-1', t + 1.5, .7); }
  else if (kind === 'cheer') sample('row-soft', t, .7);
  else if (kind === 'seal') { sample('row', t, .9); sample('fish-jump', t + .15, .7); }
  else if (kind === 'enter') sample('wave-1', t, .6, music);
}
let boatBgSource = null, boatBg = null;
function boatBackdrop() {
  const im = SPRITES['boat-bg']; if (!im) return null;
  if (boatBgSource === im) return boatBg;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im,0,0);
  const p = x.getImageData(0,0,c.width,c.height), d=p.data;
  for (let i=0;i<d.length;i+=4) if(d[i]===208 && d[i+1]===229 && d[i+2]===223)d[i+3]=0;
  x.putImageData(p,0,0); boatBgSource=im; boatBg=c; return c;
}
function boatTile(im, fromY, h, shift) {
  const first = Math.floor((vx+shift)/320)*320-shift;
  for(let x=first;x<vx+VW;x+=320)lg.drawImage(im,0,fromY,320,h,Math.round(x-vx),fromY-vy,320,h);
}
function drawBoatBg(f, rec, vt) {
  if(song.boatScene?.river){drawRiverBg(f,rec,vt);return;}
  const p = netProgress(rec,vt), late = step6(p);
  lg.fillStyle = moodSky(mixMood([208,229,223,0,0,0,0],[234,205,173,0,0,0,0],late)); lg.fillRect(0,0,VW,VH);
  const im=boatBackdrop(), moving=boat.distance-(boat.hitT<0?0:(boat.power>0?8:boat.perfect?5:3)*(1-easeOut(clamp01((f-boat.hitT)/.46))));
  const motion=RM?0:Math.max(0,moving);
  lg.fillStyle='#b7d5d2';lg.fillRect(0,84-vy,VW,VH);
  if(im){boatTile(im,0,84,Math.round(motion*.17));boatTile(im,84,96,Math.round(motion*2.7));}
  // 끝까지 이어지는 바다
  lg.fillStyle='#c5ded7';if(vy+VH>180)lg.fillRect(0,180-vy,VW,VH);
  for(let j=0;j<3;j++){
    const x=Math.round(vx+((j*113+(RM?0:f*1.2))%(VW+50))-25),y=39+j*7;
    lg.fillStyle='#edf0df';lg.fillRect(x-vx,y-vy,19,3);lg.fillRect(x-vx+4,y-vy-2,10,2);
  }
  lg.fillStyle='#e8edda';
  for(let y=101;y<vy+VH;y+=17)for(let x=Math.floor((vx+motion*3)/39)*39-motion*3;x<vx+VW;x+=39){
    const xx=Math.round(x+(y%3)*7),yy=y+(RM?0:Math.floor(f*2+y)%2);lg.fillRect(xx-vx,yy-vy,8+(y%4)*2,1);
  }
}
function drawRiverBg(f,rec,vt){
  boat.riverPeople=[];
  const motion=RM?0:Math.max(0,riverMotion(f)),im=SPRITES['boat-bg'];
  lg.fillStyle='#ebc3a8';lg.fillRect(0,0,VW,VH);
  lg.fillStyle='#91b3b9';lg.fillRect(0,84-vy,VW,VH);
  if(im)boatTile(im,0,180,Math.round(motion*.3));
  const bank=SPRITES.bank;
  if(bank){const shift=Math.round(motion*.65),first=Math.floor((vx+shift)/320)*320-shift;for(let x=first;x<vx+VW;x+=320)lg.drawImage(bank,Math.round(x-vx),22-vy);}
  for(let i=0;i<boat.flags.length;i++){
    // 기슭 구경꾼은 320점마다 되풀이되는 둑 그림에 서 있으니 같은 되풀이로 화면 안에 다시 선다. 배가 나아가도 끝 무렵 다섯이 다 보이게(그래프 검수 3회차 R5-01)
    const left=vx-24;let x=left+(((35+i*56-Math.round(motion*.65)-left)%320)+320)%320,y=82;
    const name=Math.floor(f*3+i)%2?'onlooker-wave':'onlooker';
    if(captionDLive()){const p=captionDAvoid({name,pose:name,x,y,dir:1});x=p.x;y=p.y;}
    if(state==='end'){
      const r=boatWordBody({pose:name,x,y},K/DPR),note=document.querySelector('.endTop').getBoundingClientRect();
      if(r&&r.left<note.right+8&&r.right>note.left-8&&r.top<note.bottom+8&&r.bottom>note.top-8)continue;
    }
    spr(name,x,y);
    boat.riverPeople.push({name:'shore-'+i,pose:name,x,y,baseX:x,dir:1});
  }
  lg.fillStyle='#d5e5d7';
  for(let y=111;y<vy+VH;y+=18)for(let x=Math.floor((vx+motion*2)/43)*43-motion*2;x<vx+VW;x+=43)lg.fillRect(Math.round(x-vx),y-vy,9,1);
  if(boat.finalT>0){
    const k=RM?1:easeOut(clamp01((f-(boat.finalT>0?boat.finalT:boat.endT))/.9));
    const dock=SPRITES.dock;if(dock)lg.drawImage(dock,Math.round(338-90*k-vx),103-vy);
  }
}
function drawRiverGuests(f,bob,final){
  const people=[];
  for(const [i,name] of ['guest-drum','guest-fan'].entries()){
    const im=SPRITES[name+(final?'-wave':'')];if(!im)continue;
    const x=82+i*27,y=final?118:122;
    lg.drawImage(im,Math.round(x-vx),Math.round(y-im.height+bob-vy));
    people.push({name,pose:name+(final?'-wave':''),x:x+Math.floor(im.width/2),baseX:x+Math.floor(im.width/2),y:y+bob-1,dir:1});
  }
  return people;
}
const boatStroke = (t, f, dur=.46) => t < 0 || f<t || f-t>=dur ? 0 : Math.sin(Math.PI*(f-t)/dur);
function boatJoy(i){const res=Rules.summarize(targets.filter(t=>typeof t.part==='number'));return [2,3,1,0,4].indexOf(i)<[0,1,2,3,5,5][res.hits?netSeal():0];}
function boatHeroPose(f) {
  if (boat.finalT>0 && f-boat.finalT<.46) return 'hero-rowbig';
  if (netProud(boat,f)) return 'hero-proud';
  if ((boat.finalT>0 || state==='end') && boatJoy(2)) return 'hero-cheer';
  if (boat.grab) return 'hero-grab';
  if (f-boat.earlyT<.45)return 'hero-early';
  if (f-boat.dragT<.5)return 'hero-drag';
  if (f-hero.fizzleT<.5)return 'hero-stop';
  if (charge && !charge.pending)return 'hero-brace';
  if (f-hero.stopT<.45)return 'hero-stop'; // 메길 때 치면 꼬마도 멈칫(그래프 검수 3회차 R1-07. 꾹 버팀 뒤)
  if (f-boat.hitT<.46)return boat.power>0?'hero-rowbig':'hero-row';
  if(boat.motionPose)return boat.motionPose;
  return 'hero-hold';
}
function boatBody(p) {
  const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m)return;
  const ft=m.foot,top=Math.round(p.y-vy-ft[1]),left=Math.round(p.baseX-vx-ft[0]),cut=im.height-7;
  lg.drawImage(im,0,0,im.width,cut,left+p.dx,top,im.width,cut);
  lg.drawImage(im,0,cut,im.width,7,left,top+cut,im.width,7);
}
function boatOar(p, stroke, bob, f) {
  const loose=p.name==='hero'&&['hero-proud','hero-wave-a','hero-wave-b'].includes(p.pose);
  if(loose){p={...p,pose:'hero-hold',x:p.baseX,active:false};stroke=0;}
  const a=anchor(p.pose,'handA',[44,45],p);
  const b=p.pose.endsWith('-stumble') ? {x:a.x+2,y:a.y+5} : anchor(p.pose,'handB',[46,50],p);
  const restEnd={x:b.x+(172-b.y)*(b.x-a.x)/(b.y-a.y || 5),y:172+bob};
  const end={x:Math.round(restEnd.x-stroke*28),y:Math.round(restEnd.y+(p.pose==='hero-brace'?4:0))};
  if(p.bracing)end.y=Math.round(restEnd.y+p.dip);
  if(p.resting)end.y-=10;
  // 강 배 꾹: 꼬마 노가 물에 0.5초마다 1점씩(최대 4점) 잠긴다(재미 F02)
  if(p.riverHold)end.y=Math.round(restEnd.y+p.dip);
  netLine(a,b,f);netLine(b,end,f);
  if(song.boatScene?.river){riverOarWater(p,b,end,stroke,f);}
  else{
    if((p.active && stroke>.2) || p.pose==='hero-early')spr('splash',end.x,end.y+1);
    if(p.bracing&&f-boat.braceSplashT>=0&&f-boat.braceSplashT<.2)spr('splash',end.x,end.y+1);
    if(p.name==='hero'&&f-boat.grabT>=0&&f-boat.grabT<.3)spr('splash',end.x,end.y+1);
  }
  // 손은 노 위. 두 주먹의 작은 칸만 다시 찍는다
  const im=SPRITES[p.pose],m=META[p.pose];
  if(!loose&&im&&m)for(const key of p.pose.endsWith('-stumble')?['handA']:['handA','handB']){const h=m[key];if(h)lg.drawImage(im,h[0]-2,h[1]-2,5,5,Math.round(p.x-vx-m.foot[0]+h[0]-2),Math.round(p.y-vy-m.foot[1]+h[1]-2),5,5);}
  return {a,b,end};
}
// ───── 강 배 물 효과(곡별 검수 06): 낮은 가로 물보라 R1-04 · 후렴 몰아 젓기 R1-09 · 연속 단계 물살 F01 · 꾹 물살 F02 ─────
// 노 끝이 화면 아래 밖이면(780×290은 사람 · 말풍선 자리 때문에 카메라가 55점 올라 있다) 노가 화면 아래 끝을 지나는 자리를 쓴다
function riverWaterPoint(b,end){
  const bottom=vy+VH-1;
  if(end.y+1<=bottom)return{x:end.x,y:end.y+1,cut:false};
  const t=clamp01((bottom-b.y)/Math.max(1,end.y-b.y));
  return{x:Math.round(b.x+(end.x-b.x)*t),y:bottom,cut:true};
}
function riverSplash(pt,alpha=1,big=false,f=0,late=false){
  const im=SPRITES.splash,m=META.splash;if(!im||!m)return;
  // 화면 아래 끝에 그리는 물보라는 사람 그림 뒤에 숨지 않게 사람을 다 그린 뒤에 그린다
  if(pt.cut&&!late&&boat.cutSplash){boat.cutSplash.push([pt,alpha,big,f]);return;}
  lg.save();lg.globalAlpha=alpha;
  lg.drawImage(im,Math.round(pt.x-vx-m.foot[0]),Math.round(pt.y-vy-m.foot[1]));
  boat.splashDrawn?.push({left:toCssX(pt.x-m.foot[0]),top:toCssY(pt.y-m.foot[1]),right:toCssX(pt.x-m.foot[0]+im.width),bottom:toCssY(pt.y-m.foot[1]+im.height),alpha:Math.round(alpha*100)/100});
  // 꼬마 노는 물방울을 더 튀긴다(화면 아래 끝에서도 1.5배쯤 보이게)
  if(big){lg.fillStyle='#f4fbf6';const up=Math.round(4*Math.sin(Math.PI*clamp01(f)));for(const [dx,dy] of [[-10,-13],[-3,-16],[5,-15],[11,-12]])lg.fillRect(Math.round(pt.x-vx+dx),Math.round(pt.y-vy+dy-up),2,2);}
  lg.restore();
}
function riverOarWater(p,b,end,stroke,f){
  const pt=riverWaterPoint(b,end),hero=p.name==='hero';
  const live=(p.active&&stroke>.2)||p.pose==='hero-early';
  if(live){riverSplash(pt,1,hero&&pt.cut,stroke);if(boat.chorusNow&&p.active)boat.linger[p.name]={x:pt.x,y:pt.y,t:f,cut:pt.cut};}
  else{
    // 후렴 동안은 물보라를 다음 젓기까지 남기며 흘려 보낸다(0.46초 → 1.3초)
    const L=boat.linger[p.name],age=L?f-L.t:9;
    if(L&&age<1.3)riverSplash({x:L.x-Math.round(age*10),y:L.y,cut:L.cut},.85*(1-age/1.3));
  }
  // 둘째 놓침에 노를 두 손으로 붙잡는 0.3초: 바다 배(거문도)와 같은 물보라(그래프 검수 8회차 R1-02)
  if(hero&&!live&&f-boat.grabT>=0&&f-boat.grabT<.3)riverSplash(pt,1,true,(f-boat.grabT)/.3);
  // 꾹 누르는 동안 꼬마 노 뒤로 흰 물살이 0.3초마다 흘러간다
  if(hero&&p.riverHold&&f-boat.trailT>=.3){boat.trailT=f;boat.trail.push({x:pt.x,y:pt.y,t:f});}
  if(hero&&boat.trail.length){
    boat.trail=boat.trail.filter(q=>f-q.t<1.2);
    lg.fillStyle='#eef6f0';
    for(const q of boat.trail){const age=f-q.t,x=Math.round(q.x-age*24-vx),y=Math.round(q.y-vy-(q.y>=vy+VH-1?2:0));lg.globalAlpha=1-age/1.2;lg.fillRect(x-3,y,4,1);lg.fillRect(x+2,y-1,2,1);}
    lg.globalAlpha=1;
  }
}
const riverMotion=f=>{const k=boat.glideT<0?1:easeOut(clamp01((f-boat.glideT)/boat.glideDur));return boat.glideFrom+(boat.distance-boat.glideFrom)*k;};
// 연속 단계(8 · 16 · 24)마다 배 뒤 물살 꼬리 0 → 24 → 48 → 72점, 뱃머리 흰 물결 0 → 3줄. 놓쳐 단계가 내려가면 0.3초에 걸쳐 줄어든다
function drawRiverWake(f,bob,rec){
  const level=state==='song'||state==='end'?heatLevel():0,want=level*24;
  const dt=boat.wakeF<0?0:Math.min(.1,f-boat.wakeF);boat.wakeF=f;
  boat.wake=want>=boat.wake?Math.min(want,boat.wake+dt*40):Math.max(want,boat.wake-dt*80);
  const y0=141+bob-vy,len=Math.round(boat.wake),flow=RM?0:Math.floor(f*18);
  lg.fillStyle='#f7fcf8'; // 강물 결(#d5e5d7)보다 밝게 해 물살 꼬리가 갈린다
  if(len>0)for(let row=0;row<3;row++){
    const y=y0+row*3,span=Math.max(0,len-row*10);
    for(let x=((flow+row*5)%9);x<span;x+=9){const w=Math.min(5,span-x);if(w>0)lg.fillRect(Math.round(80-x-w-vx),y+(row&&x%18<9?1:0),w,row?1:2);}
  }
  const bow=Math.min(3,level)+(boat.chorusNow?1:0);
  for(let j=0;j<bow;j++){const k=RM?0:Math.floor(f*6+j)%2;lg.fillRect(Math.round(233+j*3-vx),y0-1-j*3+k,6+j*2,1);}
  // 후렴 몰아 젓기: 뱃머리 앞에 물방울이 튄다
  if(boat.chorusNow&&!RM){const k=Math.floor(f*8);for(let j=0;j<5;j++){const h=(k+j*3)%6;lg.fillRect(Math.round(238+j*4-vx),y0-4-h-j%2*3,2,2);}}
  return{level,wake:len,bow};
}
function boatFlagPlace(){
  const river=!!song.boatScene?.river,base={x:river?72:155,y:0};
  if(!captionDLive()){
    if(song.id==='geomun'&&state==='end')base.y=Math.max(0,Math.ceil(vy+8/(K/DPR)-34));
    return base;
  }
  const x=river?64:155;
  if(!river)return boatFlagRowPlace(x);
  const point=captionDPropGroup('boat-flags',{x,y:0},{x:x-4,y:28,w:66,h:48,axis:'x',allowOutside:true});
  return point;
}
function drawBoatFlags(f,bob) {
  const origin=boatFlagPlace(),river=!!song.boatScene?.river,dx=origin.x-(river?72:155),dy=origin.y;
  lg.save();lg.translate(dx,dy);drawBoatFlagsRaw(f,bob,origin,boatFlagPole(origin));lg.restore();
}
const boatNoteWidthCache=new Map();
function boatFlagNoteReserves(){
  if(song.id!=='geomun'||learning||!captionD.slots.me||!captionD.slots.ba)return[];
  let lowWidth=0;
  if(H<=420&&captionD.notes){
    const style=getComputedStyle(elFb),key=[song.id,W,H,DPR,style.font].join('|');
    if(!boatNoteWidthCache.has(key)){
      const c=document.createElement('canvas').getContext('2d');c.font=style.font;
      const texts=[song.hint,song.releaseHint,song.practiceCall?.holdHint,...songBars.flatMap(b=>[b.hint,b.holdHint])].filter(t=>typeof t==='string');
      const textWidth=Math.ceil(Math.max(0,...texts.flatMap(t=>t.split('\n').map(line=>c.measureText(line).width)))+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight));
      const dot=K/DPR,hand=Math.max(12,Math.floor(32/dot))*dot,gap=parseFloat(getComputedStyle(captionD.notes).columnGap)||0;
      boatNoteWidthCache.set(key,hand+gap+textWidth);
    }
    lowWidth=boatNoteWidthCache.get(key);
  }
  return ['me','ba'].flatMap(who=>{
    const s=captionD.slots[who],w=Math.min(W-32,(360)),bottom=H<=420?Math.max(s.y-(who==='ba'?40:12),40):s.y-(who==='ba'?40:12);
    // 큰 화면은 손·틀림 글·연속 수가 차례로 뜨므로 위쪽 8px부터 묶음 바닥까지 비운다.
    const tall=W>=900&&H>420,h=tall?Math.max(0,bottom-8):H<=420?70-8*(K/DPR):72;
    const x=Math.max(16,Math.min(W-w-16,s.x+s.w/2-w/2)),base={x,y:tall?8:bottom-72,w,h};
    // 낮은 화면은 빈 컨테이너 대신 실제 손·간격·이 곡에서 쓸 안내 글을 잰 너비를 비운다.
    const occupied=Math.min(w,lowWidth),low=H<=420&&occupied?{x:x+(w-occupied)/2,y:8,w:occupied,h:Math.max(0,bottom-8)}:null;
    return H<=420?(low?[low]:[]):[base];
  });
}
// 거문도 노래 중: 깃발 줄(가로대 · 깃발 한 줄)과 돛대 기둥이 둘 다 두 말풍선 자리에서 2px 떨어지는 가장 가까운 자리로 옆이나 위로 옮긴다.
// 아래로는 비키지 않는다(사람 머리 뒤로 들어감). 기둥은 갑판(70~240점) 위에 선다. 한 화면 크기에 한 번 정해 판 내내 그대로 둔다.
function boatFlagRowPlace(x){
  if(!captionDLive()||!captionD.slots.me||!captionD.slots.ba)return{x,y:0}; // 두 말풍선 자리가 다 생긴 뒤에 정한다
  const dot=K/DPR,key=[song.id,W,H,K,camX,camY,'assembly','boat-flags-row'].join('|');
  let d=captionD.moves.get(key);
  if(!d){
    const notes=boatFlagNoteReserves();
    const blocks=[...captionDReserve(),...notes],css=(px,py,w,h)=>({x:(px-camX)*dot,y:(py-camY)*dot,w:w*dot,h:h*dot});
    const clear=p=>blocks.every(b=>p.x+p.w<=b.x-2||p.x>=b.x+b.w+2||p.y+p.h<=b.y-2||p.y>=b.y+b.h+2);
    const inside=p=>p.x>=8&&p.x+p.w<=W-8&&p.y+6*dot>=0&&p.y+p.h<=H-8; // 상자 위 6점은 빈 칸이라 가로대(32점)만 화면 안이면 된다
    d={x:0,y:0,cost:Infinity};
    for(let dy=0;dy>=(H<=420?0:-80);dy--)for(let dx=-150;dx<=120;dx++){ // 낮은 가로는 위 하늘이 없어 옆으로만
      const cost=Math.hypot(dx,dy);if(cost>=d.cost)continue;
      const ox=x+dx,px=ox+(ox<70?60:0);if(px<70||px>240)continue;
      const row=css(ox-4,26+dy,74,30),mast=css(px,26+dy,2,92-dy);
      if(inside(row)&&clear(row)&&clear(mast))d={x:dx,y:dy,cost};
    }
    if(d.cost===Infinity)d.blocked=true;
    captionD.moves.set(key,d);
  }
  return{x:x+d.x,y:d.y};
}
// 깃발 줄이 배 뒤끝(64점) 밖으로 비키면 기둥을 줄 오른쪽 끝에 세워 갑판 위에 둔다(780×290에서 두 말풍선을 피할 때).
const boatFlagPole=origin=>!song.boatScene?.river&&origin.x<70?60:0;
function boatSeaFlagY(p,i,f,bob,origin){
  const k=RM?1:easeOut(clamp01((f-p.t)/.75)),end=34+origin.y+bob;
  let start=111+bob;
  if(captionDLive()&&song.id==='geomun'&&k<1){
    const dot=K/DPR,left=toCssX(origin.x+3+i*12),right=left+10*dot,endBottom=toCssY(end+16);
    // 깃발이 솟는 길에 자막이나 붙은 안내가 있으면 그 위에서부터 올라간다.
    const guides=[elTop,elFb,elCombo,holdIndicator.el].filter(el=>!el.hidden&&el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
    for(const b of [...captionDReserve(),...boatFlagNoteReserves(),...guides])if(left<b.x+b.w&&right>b.x&&endBottom<=b.y-2)start=Math.min(start,vy+(b.y-2)/dot-16);
  }
  return Math.floor(Math.max(end,start)+(end-Math.max(end,start))*k);
}
function drawBoatFlagsRaw(f,bob,origin,pole=0) {
  const dy=origin.y;
  if(song.boatScene?.river){
    const im=SPRITES.flags;if(!im)return;
    if(boat.flags.length){lg.fillStyle='#6f4a33';lg.fillRect(72-vx,47+bob-vy,1,23-dy);lg.fillRect(126-vx,47+bob-vy,1,23-dy);lg.fillRect(72-vx,47+bob-vy,55,1);}
    boat.flags.forEach((p,i)=>{const k=RM?1:easeOut(clamp01((f-p.t)/.6));lg.drawImage(im,i*12,0,10,16,Math.round(72+i*11-vx),Math.round(47-(1-k)*12+bob-vy),10,16);});return;
  }
  const im=SPRITES.flags;lg.fillStyle='#6f4a33';lg.fillRect(155+pole-vx,32+bob-vy,2,86-dy);lg.fillRect(155-vx,32+bob-vy,62,2);
  if(!im)return;
  boat.flags.forEach((p,i)=>{
    const y=boatSeaFlagY(p,i,f,bob,origin)-dy;
    lg.drawImage(im,i*12,0,10,16,158+i*12-vx,y-vy,10,16);
  });
}
const boatFinalFish = hits => hits<8?0:hits<16?6:hits<23?12:15;
const BOAT_BASKET={x:211,y:137,dir:1};
function drawBoatBasket(f,bob){
  if(song.id!=='geomun')return null;
  const count=boat.baskets.filter(p=>f>=p.t+.8).length,stage=count===0?0:count<=2?1:count<=4?2:3;
  spr('basket',BOAT_BASKET.x,BOAT_BASKET.y+bob);
  // 같은 고기를 쌓아 빈 망태 · 조금 · 반 · 가득 네 모습을 만든다.
  for(let i=0;i<[0,1,3,5][stage];i++)spr('fish-1',BOAT_BASKET.x-5+(i%2)*7,BOAT_BASKET.y-6-Math.floor(i/2)*3+bob);
  return{count,stage,left:toCssX(BOAT_BASKET.x-10),right:toCssX(BOAT_BASKET.x+10),top:toCssY(BOAT_BASKET.y-18+bob),bottom:toCssY(BOAT_BASKET.y+bob)};
}
function drawBoatFish(f,bob) {
  const drawn=[];
  for(const event of boat.fish){
    const t=f-event.t;if(t<0||t>2.1)continue;
    const total=event.at==='basket'?1:event.at===23?(event.total??boatFinalFish(sc.hits)):6;
    for(let j=0;j<total;j++){
      const k=clamp01((t-j*.055)/1.1);if(k<=0||k>=1)continue;
      const x=event.at==='basket'?248+(BOAT_BASKET.x-248)*k:event.at===23?248-k*(40+j%4*12):91+j*7+k*19;
      const y=event.at==='basket'?164+(BOAT_BASKET.y-6-164)*k-Math.sin(Math.PI*k)*35:event.at===23?164-k*43-Math.sin(Math.PI*k)*39:168-Math.sin(Math.PI*k)*(36+j%3*7);
      spr(`fish-${k<.5?1:2}`,Math.round(x),Math.round(y+bob));
      drawn.push({x:Math.round(x),y:Math.round(y+bob),at:event.at});
    }
  }
  return drawn;
}
function boatMotion(f,rec,vt=heardNow()-OFFSET){
  if(song.id!=='geomun'){netMotion(boat,f,rec,.9,'wave');return;}
  boat.motionPose=null;
  if(state!=='song'||!rec||charge||boat.motionBlocked===rec.def.i){boat.motionT=-9;return;}
  // 460ms 젓기를 마친 뒤 흔든다. 짧은 마디 끝에서 시작한 0.9초 몸짓은 다음 메김까지 잇고 손을 대면 끊는다.
  const last=rec.def.strikes?.at(-1);
  if(boat.motionQueue.length&&!rec.def.call&&last!==undefined&&vt>=rec.t0+last*rec.beat+.46&&f>=boat.hitT+.46&&boat.motionRest!==rec.def.i){
    boat.motionRest=rec.def.i;boat.motionAt=boat.motionQueue.shift();boat.motionT=f;log('boat-wave',{at:boat.motionAt,hits:sc.hits,i:rec.def.i,t:heardNow()});
  }
  const t=f-boat.motionT;if(boat.motionT>=0&&t>=0&&t<.9-1e-9)boat.motionPose=`hero-wave-${Math.floor((t+1e-9)/.15)%2?'b':'a'}`;
}
function drawBoat(f,vt,rec,frozen) {
  boatMotion(f,rec,vt-OFFSET);
  const sx=vx-camX,sy=vy-camY;
  const river=!!song.boatScene?.river;
  camX=Math.round(160-VW/2);camY=captionDLive()?(song.id==='geomun'&&H<=420?164:180)-VH-(river&&H<=420?55:0):VH<=190?Math.round(180-VH):Math.round(184-VH*.72);

  if(state==='end'&&boat.endT<0)boat.endT=f;
  const finalAt=boat.finalT>0?boat.finalT:rec?.def.outro?f-(vt-rec.t0-rec.def.finaleBeat*rec.beat):-9;
  const endMove=finalAt>0?finalAt+.46:boat.endT;
  if((H<=420)&&endMove>0&&f>=endMove&&!captionDLive())camX-=Math.round(Math.ceil(128/(K/DPR))*(RM?1:easeOut(clamp01((f-endMove)/.3))));
  // 시작과 끝 쪽지 위로는 사람만 올리고, 노래 때의 무대는 고정한다
  const lift=river&&onStartScreen()?Math.min(sy,Math.max(0,Math.floor(47-camY-8/(K/DPR)))):state==='end'&&boat.flags.length?Math.min(sy,Math.max(0,Math.floor(34-camY-8/(K/DPR)))):sy;
  vx=camX+sx+buildJit(f);vy=camY+lift;
  if(captionDLive()){
    captionDLayout({bodies:[{...LEAD,name:'leader',baseX:river?234:226,captionY:118},{...HERO,name:'hero',baseX:river?186:166,captionY:118}]});
    // 깃발 줄을 처음 배치하기 전부터 안내 글의 실제 크기를 잴 수 있게 한다.
    if(song.id==='geomun'&&!learning)captionDAttach(rec);
  }
  drawBoatBg(f,rec,vt);
  const b=rec?(vt-rec.t0)/rec.beat:0,final=(boat.finalT>0 && f-boat.finalT>=.46)||state==='end';
  const bracing=song.id==='geomun'&&!frozen&&!final&&charge&&!charge.pending;
  const held=bracing?Math.max(0,vt-charge.t0):0,brace=bracing?clamp01(held/chargeFullFor(charge.rec)):0;
  if(bracing&&charge.full&&boat.braceCharge!==charge){boat.braceCharge=charge;boat.braceSplashT=f;}
  const resting=song.id==='geomun'&&!frozen&&!final&&!rec?.def.call&&rec?.def.twist&&b>=1.4&&b<2.8;
  if(resting&&boat.twistRest!==rec.def.i){boat.twistRest=rec.def.i;if(ctx)sample('drip',ctx.currentTime,.6);}
  const bob=frozen||RM||!rec||final?0:Math.floor(b*3)%3===1?1:0;
  let npcStroke=0;
  if(!frozen&&rec&&!rec.def.call&&!rec.def.rest)for(const s of rec.def.strikes){const t=vt-(rec.t0+s*rec.beat);if(t>=0&&t<.46)npcStroke=Math.max(npcStroke,Math.sin(Math.PI*t/.46));}
  const help=rec && boat.helpI===rec.def.i;
  const success=state!=='practice'?boatStroke(boat.hitT,f):0, big=boat.finalT>0&&f-boat.finalT<.46;
  const inStroke=boat.hitT>=0&&f>=boat.hitT&&f-boat.hitT<.46;
  if(!song.boatScene?.river)drawBoatFlags(f,bob);
  boat.chorusNow=river&&!frozen&&state==='song'&&!!rec?.def.chorus;
  const boatIm=SPRITES.boat,boatY=song.boatScene?.boatY??106,boatX=64;if(boatIm)lg.drawImage(boatIm,boatX-vx,boatY+bob-vy);
  const wake=river?drawRiverWake(f,bob,rec):null;
  if(song.boatScene?.river)drawBoatFlags(f,bob);
  const guests=song.boatScene?.river?drawRiverGuests(f,bob,final&&boat.finalT>0):[];
  const cast=song.boatScene?.cast || [['rower-c',106],['rower-a',136],['hero',166],['rower-b',196],['leader',226]];
  const bodies=cast.map(([name,baseX],i)=>{
    let pose,stroke=Math.max(success,help?npcStroke:0),active=state!=='practice'&&inStroke||!!help&&npcStroke>0;
    if(name==='hero'){
      pose=boat.heroPose=boatHeroPose(f);stroke=boatStroke(boat.hitT,f);active=inStroke;
      if(pose==='hero-early')stroke=boatStroke(boat.earlyT,f,.45);
    }else if(name==='leader')pose=final&&boatJoy(i)?'leader-cheer':resting||f-leader.stopT<.7?'leader-look':rec&&rec.def.call&&!frozen?`leader-sing-${Math.floor(b*3)%2?'a':'b'}`:'leader-hold';
    else pose=`${name}-${final&&boatJoy(i)?'cheer':name==='rower-b'&&(f-boat.lookT>=0&&f-boat.lookT<.65||f-boat.grabT>=0&&f-boat.grabT<.65)?'stumble':stroke>.04?'row':'hold'}`;
    if(name!=='hero'&&name!=='leader'&&(bracing||resting)){pose=`${name}-hold`;stroke=0;active=false;}
    const amplitude=Math.ceil((song.id==='geomun'&&boat.power>0?36:big||boat.power>0?30:25)/(K/DPR));
    let dx=final?0:Math.round(stroke*amplitude+(active?0:npcStroke*Math.ceil(6/(K/DPR))));
    if(river&&name==='leader')dx=0;
    if(RM)dx=0;
    // 강 배는 노꾼 간격이 26점이라 왼쪽으로 물리면 꼬마 얼굴이 옆 노꾼에 가린다. 늦음은 뱃전 쪽으로 3점 숙였다 돌아온다(곡별 검수 06 R1-03)
    let lean=0;
    if(name==='hero' && f-boat.dragT<.5){if(river){lean=RM?0:Math.round(boatStroke(boat.dragT,f,.5)*3);dx=0;}else dx=-Math.round(boatStroke(boat.dragT,f,.5)*7);}
    // 노 붙잡기: 붙잡는 순간 뒤로 3점 더 휘청(0.4초), 강 배는 뱃전 쪽으로 3점 숙임
    if(name==='hero' && boat.grab){const g=RM?0:oopsBump(f-boat.grabT,.1,.45,.22);if(river)lean=Math.max(lean,Math.round(3*g));dx=river?0:-3-Math.round(3*g);}
    // 그래프 검수 4회차: 일찍은 혼자 저은 몸이 ±2점 세 번 흔들리고(0.3초, 강 배는 옆 노꾼에 가려 뺀다), 메길 때 치면 깜짝 6점 뛴다
    let hop=0;
    if(name==='hero'&&!RM&&!final){const e=f-boat.earlyT,s=f-hero.stopT;if(pose==='hero-early'&&e>=0&&e<.3&&!river)dx+=Math.round(2*Math.sin(e*20*Math.PI));if(pose==='hero-stop'&&s>=0&&s<.3)hop=Math.round(6*Math.sin(Math.PI*s/.3));}
    if(bracing&&name!=='leader'){dx=RM?0:-Math.round(brace*3);stroke=0;active=false;}
    const riverHold=river&&name==='hero'&&!frozen&&!final&&!!charge&&!charge.pending;
    return {name,baseX,x:baseX+dx,y:118+bob+lean-hop+(name==='hero'?holdBodyBob(f):0),captionY:118,dx,pose,dir:1,stroke,active,bracing:!!bracing&&name!=='leader',riverHold,dip:riverHold?Math.min(4,Math.floor(Math.max(0,vt-charge.t0)/.5)):Math.min(6,Math.floor(held/.5)),resting:!!resting&&name!=='hero'&&name!=='leader'};
  });
  if(captionDLive())for(const p of bodies)if(['hero','leader'].includes(p.name))p.y=captionDLimitY(p.pose,p.x,p.y,p.name==='hero'?'ba':'me');else{const moved=captionDAvoid(p);p.baseX+=moved.x-p.x;p.x=moved.x;p.y=moved.y;}
  boat.splashDrawn=[];boat.cutSplash=[];
  const geometry={K:K/DPR,vx,vy,boat:{x:boatX,y:boatY+bob,w:192,h:boatIm?.height??56},mast:(o=>({x:o.x+boatFlagPole(o),y:32+bob+o.y}))(river?{x:155,y:0}:boatFlagPlace()),bodies:[],oars:[]};
  for(const p of bodies){
    geometry.bodies.push({name:p.name,x:p.x,y:p.y,baseX:p.baseX,captionY:p.captionY,dx:p.dx,pose:p.pose,active:p.active,bracing:p.bracing,resting:p.resting});
    if(p.name!=='leader'&&(!final||p.pose==='hero-proud'))geometry.oars.push({name:p.name,...boatOar(p,p.stroke,bob,f)});
  }
  if(guests.length)geometry.bodies.push(...guests,...(boat.riverPeople||[]));
  if(river)geometry.splashes=boat.splashDrawn;
  if(wake)geometry.wake={...wake,linger:Object.keys(boat.linger).filter(k=>f-boat.linger[k].t<1.3).length,trail:boat.trail.length,motion:Math.round(riverMotion(f)*10)/10};
  boat.geometry=geometry;
  // 뛰어오른 멸치는 노꾼 뒤로 지나가 얼굴을 덮지 않는다
  geometry.fish=song.boatScene?.river?[]:drawBoatFish(f,bob);
  geometry.basket=drawBoatBasket(f,bob);
  geometry.protectedRects=netClearRects(bodies.find(p=>p.name==='hero'),['handA','handB']);
  lg.save();netClipRects(geometry.protectedRects);drawSparks(f);drawParticles();lg.restore();
  const flagOrigin=boatFlagPlace();
  geometry.flags=boat.flags.map((p,i)=>{const river=song.boatScene?.river,k=RM?1:easeOut(clamp01((f-p.t)/(river?.6:.75))),y=river?Math.round(47-(1-k)*12+bob)+flagOrigin.y:boatSeaFlagY(p,i,f,bob,flagOrigin),x=flagOrigin.x+(river?i*11:3+i*12);return{left:toCssX(x),top:toCssY(y),right:toCssX(x+10),bottom:toCssY(y+16)};});
  geometry.bodyRects=geometry.bodies.map(p=>({name:p.name,...boatWordBody(p,K/DPR)})).filter(r=>r.right>0&&r.left<W&&r.bottom>0&&r.top<H);
  if(state==='end'){
    const avoid=[...geometry.flags,...geometry.bodyRects.filter(r=>!river||!r.name.startsWith('shore-'))];
    if(geometry.basket)avoid.push(geometry.basket);
    if(river)avoid.push(document.querySelector('.endBottom').getBoundingClientRect());
    Screens.placeEnd(avoid);
  }
  // 물에 든 노는 갑판 위 사람보다 뒤다. 잡은 손과 얼굴은 사람 그림으로 덮어 깊이를 지킨다.
  // 강 배: 틀린 몸짓(이름 · 늦음 · 두 번 놓침)은 꼬마를 맨 앞에 그려 옆 노꾼에 가리지 않게 한다(R1-03)
  const order=bodies.toReversed(),missPose=river&&['hero-early','hero-drag','hero-grab'].includes(boat.heroPose);
  if(missPose)order.push(...order.splice(order.findIndex(p=>p.name==='hero'),1));
  geometry.drawOrder=order.map(p=>p.name);
  for(const p of order){
    if(p.name==='hero'&&META[p.pose]?.knob)drawStrap(p.pose,p,p.y,f);
    boatBody(p);
    if(!final&&p.name==='leader'&&rec?.def.call&&f-leader.stopT>=.7)mouth(p.pose,p,p.y);
    if(!final&&p.name!=='leader'&&rec&&!rec.def.call&&!rec.def.rest&&!frozen)mouth(p.pose,p,p.y);
  }
  for(const a of boat.cutSplash)riverSplash(a[0],a[1],a[2],a[3],true);
  if(charge&&!charge.pending&&ctx&&vt-boat.creakT>.55){boat.creakT=vt;sample('oar-creak',ctx.currentTime,.5);}
  if(!holdSong()&&msg?.finger)spr(Math.floor(f*3.2)%2?'finger-holding':'finger-waiting',HERO.x+8,HERO.y+12);
  elEdge.style.opacity=String(clamp01(1-(f-fxs.band)/.5));
  drawLyric(vt,rec);drawMsg(f);
  // 새로 뜨는 손 안내까지 정한 뒤 추임새 자리를 찾는다.
  if(captionDLive()&&!learning)drawHoldCue();
  drawBoatWords(f,geometry);
  blitLo();
}
const boatWordBounds=new WeakMap();
const riverBubbleKey=()=>`${W}|${H}|${K}|${camX}|${camY}`;
const riverClearRect=(r,blocks)=>r.x>=8&&r.y>=8&&r.x+r.w<=W-8&&r.y+r.h<=H-8&&!blocks.some(b=>r.x<b.x+b.w+8&&r.x+r.w>b.x-8&&r.y<b.y+b.h+8&&r.y+r.h>b.y-8);
function riverBubbleRects(){
  const im=SPRITES.bubble,ft=META.bubble?.foot;if(!im||!ft)return[];
  const key=riverBubbleKey();
  return fxs.bubbles.filter(b=>b.riverPlace?.key===key).map(b=>({left:toCssX(b.riverPlace.x-ft[0]),top:toCssY(b.riverPlace.y-ft[1]),right:toCssX(b.riverPlace.x-ft[0]+im.width),bottom:toCssY(b.riverPlace.y-ft[1]+im.height)}));
}
function boatWordBody(p,dot) {
  const im=SPRITES[p.pose],m=META[p.pose];if(!im||!m)return null;
  let b=boatWordBounds.get(im);
  if(!b){
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
    b={left:c.width,top:c.height,right:0,bottom:0};
    for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(d[(y*c.width+xx)*4+3]){b.left=Math.min(b.left,xx);b.top=Math.min(b.top,y);b.right=Math.max(b.right,xx+1);b.bottom=Math.max(b.bottom,y+1);}
    boatWordBounds.set(im,b);
  }
  return{left:toCssX(p.x-m.foot[0]+b.left),top:toCssY(p.y-m.foot[1]+b.top),right:toCssX(p.x-m.foot[0]+b.right),bottom:toCssY(p.y-m.foot[1]+b.bottom)};
}
// 추임새는 외치는 노꾼 머리 위에서 말풍선·구슬·돛대를 피한다.
function drawBoatWords(f, geometry) {
  for(const [event,el]of cheerTextNodes){
    if(!fxs.bubbles.includes(event)){el.remove();cheerTextNodes.delete(event);}
    else el.hidden=true;
  }
  geometry.bubbles=[];
  const river=!!song.boatScene?.river;
  if(river){
    for(const [event,el]of cheerTextNodes)if(!fxs.bubbles.includes(event)){el.remove();cheerTextNodes.delete(event);}
    if(!fxs.bubbles.some(b=>f>=b.t0)){geometry.wordEvents=0;geometry.wordObstacles=[];return;}
  }
  const bb=SPRITES.bubble;if(!bb)return;
  const dot=K/DPR, ft=META.bubble?.foot||[bb.width/2,bb.height-1];
  const rect=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h});
  const blocked=geometry.bodies.map(p=>boatWordBody(p,dot)).filter(Boolean).map(r=>river?{left:r.left-30,right:r.right+30,top:r.top-8,bottom:r.bottom+8}:r);
  blocked.push(...minyoFrameCorners());
  if(!river){const fo=boatFlagPlace(),mx=fo.x+boatFlagPole(fo);blocked.push(rect(toCssX(153+fo.x-155),toCssY(30+fo.y),66*dot,22*dot),rect(toCssX(mx),toCssY(32+fo.y),2*dot,(86-fo.y)*dot));} // 가로대 · 깃발 줄 · 기둥
  else{
    // 기슭 사람은 흘러가므로 머리가 지나는 띠 전체를 비워 둔다.
    blocked.push(rect(8,toCssY(64),W-16,20*dot));
    if(!holdIndicator.el.hidden)blocked.push(holdIndicator.el.getBoundingClientRect());
  }
  blocked.push(...geometry.flags);
  if(captionDLive())blocked.push(...captionDReserve().map(r=>({left:r.x,top:r.y,right:r.x+r.w,bottom:r.y+r.h})));
  for(const el of [elLyMe,elLyBa,elCombo,elTop,elFb])if(!el.hidden)blocked.push(el.getBoundingClientRect());
  const ball=elLyBa.querySelector('.ball');if(ball&&!ball.hidden)blocked.push(ball.getBoundingClientRect());
  const overlaps=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;
  geometry.wordObstacles=blocked.map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom}));
  geometry.wordEvents=0;
  for(const event of fxs.bubbles){
    if(f<event.t0)continue;
    geometry.wordEvents++;
    const word=SPRITES[event.word];if(!word)continue;
    const valid=p=>{
      const r=rect(toCssX(p.x-ft[0]),toCssY(p.y-ft[1]),bb.width*dot,bb.height*dot);
      return r.left>=8&&r.right<=W-8&&r.top>=8&&r.bottom<=H-8&&!blocked.some(b=>overlaps(r,b));
    };
    // 머리 위가 차면 받는 말풍선 왼쪽 위부터 빈 하늘을 8px 간격으로 찾는다.
    const key=riverBubbleKey();
    let spot=river&&event.riverPlace?.key===key?event.riverPlace:null;
    if(spot&&!valid(spot))spot=null;
    if(!spot)spot=geometry.bodies.filter(p=>p.name!=='hero').flatMap(p=>[p.x,p.x-20,p.x+20].flatMap(x=>[p.y-40,p.y-55,p.y-70].map(y=>({x,y})))).find(valid);
    const ba=!spot?elLyBa.getBoundingClientRect():null;
    if(!spot){
      const sky=[];
      for(let y=8;y+bb.height*dot<=H-8;y+=8)for(let x=8;x+bb.width*dot<=W-8;x+=8)sky.push({x:vx+x/dot+ft[0],y:vy+y/dot+ft[1]});
      sky.sort((a,b)=>Math.hypot(toCssX(a.x)-ba.left,toCssY(a.y)-ba.top)-Math.hypot(toCssX(b.x)-ba.left,toCssY(b.y)-ba.top));
      spot=sky.find(valid);
    }
    if(!spot)continue;
    if(river)event.riverPlace={x:spot.x,y:spot.y,key};
    paintCheer(event,f,spot.x,spot.y);
    const r=rect(toCssX(spot.x-ft[0]),toCssY(spot.y-ft[1]),bb.width*dot,bb.height*dot);
    geometry.bubbles.push(r);blocked.push(r);
  }
}
