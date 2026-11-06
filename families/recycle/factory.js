(function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const quant=(px,dots,dpr=1)=>dots*Math.max(1,Math.floor(px*dpr/dots+1e-7))/dpr;
 const binArt=b=>b.art,stationArt=b=>b.art;
 const quotaLayouts=new WeakMap();
 // 3차 놀이 화면 짜임(계획서 작업 5). 무대 셋(stages.json)의 자리 값(점)을 한 배율(scale, 점 하나가 CSS px 몇인지)로 화면에 옮긴다.
 // 무대 그림 왼쪽 위가 origin이고, 놀이 구역(box)은 쓸 곳(위 칸 · 아래 칸을 뺀 곳) 가운데에 꽉 맞춘다.
 // 조각의 발 자리(점, 칸 왼쪽 위가 0,0). stages.json의 feet가 있으면 그것을 쓴다.
 const FEET={'v3-bins':[52,172],'v3-worker':[50,124],'v3-station':[161,198],'v3-station-small':[70,148]};
 // 닫힌 통 몸통(점): 가로 5~99, 위 40(통마다 40~53), 아래 172. 덮개 · 자물쇠는 발에서 잰 자리(그림 미리보기와 같다).
 const BIN={x0:5,x1:99,top:40,cover:[-52,-142],lock:[-52,-95]};
 // 손질대 위 물건 자리(점): 개수대(씻기) · 가운데 판(떼기) · 누르개(접기 · 펴기)
 const SPOTS={'v3-station':{sink:[80,75],table:[165,88],press:[267,75],wait:[40,137],out:[280,137]},'v3-station-small':{sink:[37,52],table:[70,54],press:[104,52],wait:[34,116],out:[106,116]}};
 const SIZES={'v3-bins':[104,176],'v3-worker':[100,128],'v3-station':[320,200],'v3-station-small':[140,150],'v3-pile':[126,118]};
 const STATION_INK={'v3-station':[2,3,316,195],'v3-station-small':[13,4,120,144]};
 function at(path,s){
  const d=clamp(s,0,1)*path.len,cum=path.cum||[0,path.len];let lo=1,hi=path.pts.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(cum[mid]<d)lo=mid+1;else hi=mid;}
  const a=path.pts[lo-1],b=path.pts[lo],len=cum[lo]-cum[lo-1],t=len?(d-cum[lo-1])/len:0;
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dir:{x:len?(b.x-a.x)/len:0,y:len?(b.y-a.y)/len:0}};
 }
 function near(path,x,y){
  let best=Infinity,along=0,walked=0;
  for(let i=1;i<path.pts.length;i++){
   const a=path.pts[i-1],b=path.pts[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=len?clamp(((x-a.x)*dx+(y-a.y)*dy)/len**2,0,1):0;
   const distance=(x-a.x-t*dx)**2+(y-a.y-t*dy)**2;
   if(distance<best){best=distance;along=(path.cum?.[i-1]??walked)+t*len;}
   walked+=len;
  }
  return path.len?clamp(along/path.len,0,1):0;
 }
 // 3차 무대 고르기(설계서 2.5, 결정 대장 「3차 그림 길」). 쓸 곳은 화면 폭 전체와, 위 칸 · 아래 칸을 뺀 높이다.
 // 낮은 가로는 폰을 가로로 든 화면만이다(h <= 500이 크롬북 · 노트북을 막는다). 2인용은 반쪽 크기로 부른다.
 function pickStage({w,h,top=0,bottom=0}){const r=w/(h-top-bottom);return r<.9?'tall':r>=2.2&&h<=500?'low':'wide';}
 function stageFit(stages,view){const stage=pickStage(view),box=stages[stage].box;return{stage,scale:Math.min(view.w/box[2],(view.h-(view.top||0)-(view.bottom||0))/box[3])};}
 // names: 통 이름(이름판 폭을 정한다). slots: art.json 칸(손질대 작은 그림이 있는지, 조각 크기). numbered: 이름판에 번호 딱지를 넣는지(키보드로 놀 때).
 function build({x=0,w,h,top=0,bottom=0,binIds,dpr=1,stages,slots={},names=[],numbered=true,goalBins=[],measureName}){
  if(!stages)throw Error('무대 자리 값(stages.json)을 아직 못 읽었어요');
  const stage=pickStage({w,h,top,bottom}),S=stages[stage],feet={...FEET,...stages.feet},snap=n=>Math.round(n*dpr)/dpr;
  const [bx,by,bw,bh]=S.box,uw=w,uh=h-top-bottom,scale=Math.min(uw/bw,uh/bh);
  const origin={x:snap(x+(uw-bw*scale)/2-bx*scale),y:snap(top+(uh-bh*scale)/2-by*scale)};
  const P=([px,py])=>({x:origin.x+px*scale,y:origin.y+py*scale}),rect=([rx,ry,rw,rh])=>({x:origin.x+rx*scale,y:origin.y+ry*scale,w:rw*scale,h:rh*scale});
  const size=k=>slots[k]?[slots[k].w,slots[k].h]:SIZES[k];
  // 누르는 칸: 44px(낮은 가로는 40px) 아래면 가운데를 두고 키운다
  const touch=stage==='low'?40:44,grow=b=>{const ww=Math.max(touch,b.w),hh=Math.max(touch,b.h);return{x:b.x-(ww-b.w)/2,y:b.y-(hh-b.h)/2,w:ww,h:hh};};
  const place=(slot,foot)=>{const [sw,sh]=size(slot),[fx,fy]=feet[slot]||[sw/2,sh];return{x:snap(foot.x-fx*scale),y:snap(foot.y-fy*scale),w:sw*scale,h:sh*scale};};
  const pts=S.belt.path.map(P),cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
  const path={pts,cum,len:cum.at(-1),dots:cum.at(-1)/scale,width:S.belt.width*scale,segs:[]},field={x,y:top,w,h:h-top-bottom};
  // 이름판(v3-plate, 30점 높이, 안쪽 크림색은 22점)도 무대 배율 그대로다. 판이 14px 아래면(가장 작은 폰) 판 없이 테두리 글로 이름을 쓰고,
  // 10px 아래면(2인용 폰) 이름을 두지 않는다.
  const plateH=30*scale,labelFont=clamp(Math.round(plateH*.52),12,18),named=plateH>=14,plainNames=!named&&plateH>=10;
  const want=(text,extra=0)=>Math.max(48*scale,([...text.replaceAll(' ','')].length+.4)*labelFont+extra+24*scale);
  const apart=(a,b)=>a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,band=path.width/2+2;
  const beltClear=r=>pts.every(p=>Math.max(r.x-p.x,0,p.x-r.x-r.w)**2+Math.max(r.y-p.y,0,p.y-r.y-r.h)**2>=band*band);
  // 이름판 자리: 판 가운데는 무대 값 자리에서 시작한다. 가로로 지나는 벨트 띠에 걸리면 위(통 쪽)로 올리고,
  // 화면 끝 · 세로로 지나는 벨트 띠는 벽, 같은 줄 판끼리는 바라는 폭 비율로 틈을 나눈다. 틈이 바라는 폭보다 좁으면 판을 틈에 맞추고
  // 글자는 그리는 쪽(scene)이 10px까지 줄여 맞춘다. 폰에서 글자 크기는 12px에 묶이는데 무대는 작아져서, 판이 통 사이를 넘친다.
  function signs(reqs){
   const rows=reqs.map(q=>({...q,top:q.cy-plateH/2,L:field.x+2,R:field.x+field.w-2}));
   for(const q of rows)for(let pass=0;pass<3;pass++)for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];if(Math.abs(b.x-a.x)<Math.abs(b.y-a.y))continue;
    const y0=Math.min(a.y,b.y)-band,y1=Math.max(a.y,b.y)+band;
    if(Math.max(a.x,b.x)<q.cx-q.want/2||Math.min(a.x,b.x)>q.cx+q.want/2||y1<=q.top||y0>=q.top+plateH)continue;
    q.top=q.cy<(y0+y1)/2?y0-plateH-1:y1+1;
   }
   for(const q of rows)for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];if(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)||Math.max(a.y,b.y)<q.top||Math.min(a.y,b.y)>q.top+plateH)continue;
    const x0=Math.min(a.x,b.x)-band,x1=Math.max(a.x,b.x)+band;
    if(x1<=q.cx)q.L=Math.max(q.L,x1+1);else if(x0>=q.cx)q.R=Math.min(q.R,x0-1);
   }
   for(const p of rows)for(const q of rows)if(p.cx<q.cx&&Math.abs(p.top-q.top)<plateH){const cut=p.cx+(q.cx-p.cx)*p.want/(p.want+q.want);p.R=Math.min(p.R,cut-1);q.L=Math.max(q.L,cut+1);}
   return rows.map(q=>{const ww=Math.max(0,Math.min(q.want,q.R-q.L));return{x:snap(clamp(q.cx-ww/2,q.L,q.R-ww)),y:snap(q.top),w:ww,h:plateH};});
  }
  const bins=binIds.map((id,i)=>{
   const r=rect(S.bins[i]),foot={x:snap(r.x+r.w/2),y:snap(r.y+r.h)},image=place('v3-bins',foot),[fx,fy]=feet['v3-bins'];
   const ink={x:foot.x+(BIN.x0-fx)*scale,y:foot.y+(BIN.top-fy)*scale,w:(BIN.x1-BIN.x0)*scale,h:(fy-BIN.top)*scale},hit=grow(ink);
   const at=([dx,dy])=>({x:snap(foot.x+dx*scale),y:snap(foot.y+dy*scale),w:104*scale,h:96*scale});
   return{id,key:i+1,...hit,art:{image,ink,hit,foot,cover:at(BIN.cover),lock:at(BIN.lock),mouth:{x:foot.x,y:snap(ink.y+16*scale)}}};
  });
  // 낮은 가로 · 세로 무대는 섬이 좁아 작은 손질대를 쓴다(그림이 있을 때)
  const sslot=stage!=='wide'&&slots['v3-station-small']?'v3-station-small':'v3-station',[ssw,ssh]=size(sslot),sr=rect(S.station);
  const sfoot={x:snap(sr.x+sr.w/2),y:snap(sr.y+sr.h)},simage=place(sslot,sfoot);
  const spots=SPOTS[sslot]||{sink:[ssw*.3,ssh*.42],table:[ssw*.5,ssh*.48],press:[ssw*.72,ssh*.36]},spot=k=>({x:snap(simage.x+spots[k][0]*scale),y:snap(simage.y+spots[k][1]*scale)});
  const [ix,iy,iw,ih]=STATION_INK[sslot],ink={x:simage.x+ix*scale,y:simage.y+iy*scale,w:iw*scale,h:ih*scale};
  const station={...grow(ink),s:.46,slot:sslot,art:{image:simage,ink,foot:sfoot,sink:spot('sink'),table:spot('table'),press:spot('press'),wait:spot('wait'),out:spot('out')}};
  // 판 없이 테두리 글로 쓰는 가장 작은 폰은 통 이름만 둔다(손질대는 그림과 아래 줄 안내로 안다)
  const labels=signs([...bins.map((b,i)=>{const c=P(S.plates[i]);return{cx:c.x,cy:c.y,want:want(names[i]||'',numbered?labelFont*1.2:0)};}),...named?[{cx:sfoot.x,cy:sfoot.y+6*scale+plateH/2,want:want('손질대')}]:[]]);
  bins.forEach((b,i)=>b.art.label=labels[i]);station.art.label=named?labels.at(-1):null;
  // 단계 목표 판: 뚜껑 위. 거기가 다른 이름판 · 벨트 띠 · 화면 밖에 걸리면(세로 무대 가운데 열은 위 통 이름판이 바로 위다) 통 몸통 위.
  for(const b of bins){
   const A=b.art,gw=want('10 / 10'),gx=snap(clamp(A.foot.x-gw/2,field.x+2,field.x+field.w-2-gw));
   const tries=[A.ink.y-plateH-6*scale,A.foot.y-70*scale-plateH/2].map(y=>({x:gx,y:snap(y),w:gw,h:plateH}));
   A.goal=tries.find(r=>r.y>=field.y&&labels.every(o=>apart(r,o))&&beltClear(r))||tries.at(-1);
  }
  // 주인공 통이 둘이면(8단계) 목표 판도 둘이 함께 보인다. 폰 가로는 통 사이가 판 폭보다 좁아 판끼리 겹치므로, 겹치는 두 판을 제자리에서 같이 줄인다.
  // goalBins는 지금 단계가 아니라 주인공이 둘인 단계의 통 모두다. 그래야 단계가 바뀌어도 배치가 같다.
  const goals=bins.filter(b=>goalBins.includes(b.id)).map(b=>b.art.goal);
  for(const a of goals)for(const o of goals)if(a!==o&&!apart(a,o)){const room=Math.abs(a.x+a.w/2-o.x-o.w/2)-4*scale;if(room>0)for(const g of [a,o])if(g.w>room){const c=g.x+g.w/2;g.x=snap(c-room/2);g.w=room;}}
  // Quota labels and counts form one plate. A count tab can cover its own bin's lower front,
  // but never another bin, the workbench, the item lane, or another plate.
  if(goalBins.length){
   const font=w>=1024?Math.max(15,labelFont):12,pixel=Math.max(1,Math.round(scale*dpr))/dpr;
   const rowH=snap(Math.max(w>=1024?30:24,plateH)),number=numbered&&w>=1024;
   const widths=names.map(name=>measureName?.(name,font)??[...name.replaceAll(' ','')].length*font*.9);
   const key=[w,h,top,bottom,dpr,numbered,...names,...widths].join(':'),bank=quotaLayouts.get(S)||new Map();quotaLayouts.set(S,bank);
   const cached=bank.get(key);
   const placed=[],distance=(a,b)=>Math.hypot(Math.max(b.x-a.x,0,a.x-b.x-b.w),Math.max(b.y-a.y,0,a.y-b.y-b.h));
   // The low island has the least room beside the workbench. Reserve those bins first.
   const rectGap=(a,b)=>Math.hypot(Math.max(b.x-a.x-a.w,a.x-b.x-b.w,0),Math.max(b.y-a.y-a.h,a.y-b.y-b.h,0));
   for(const b of bins.slice().sort((a,b)=>(stage==='low'?rectGap(a.art.ink,station.art.ink)-rectGap(b.art.ink,station.art.ink):0)||(names[b.key-1]||'').length-(names[a.key-1]||'').length)){
    if(cached){const q=cached[b.id];Object.assign(b.art,{label:{...q.label},goal:{...q.goal},quota:{...q.quota,panel:{...q.quota.panel}}});continue;}
    // Match the painter's device-pixel padding, badge and gap. Measure the
    // current font, and include its widths in the cache so late fonts relayout.
    const original=b.art.label,name=names[b.key-1]||'',legacy=[...name.replaceAll(' ','')].length*font*.9+(number?font*1.2:0)+12;
    const nameW=Math.ceil(Math.max(44,legacy,(widths[b.key-1]||0)+(number?font*.9+3*pixel:0)+10*pixel+1/dpr)*dpr)/dpr,countW=snap(Math.max(44,font*3.3+12)),candidates=[];
    // 느슨한 길: 1은 자기 통에서 떨어지거나 다른 통 몸통에 걸쳐도 되고, 2는 벨트에도 걸쳐도 된다. 판끼리 · 손질대와는 늘 안 겹친다.
    const clear=(panel,goal,loose)=>{
     const center={x:goal.x+goal.w/2,y:goal.y+goal.h/2},own=distance(center,b.art.ink);
     const ownGap=rectGap(panel,b.art.ink);
     return (loose||ownGap<=6)&&panel.x>=field.x+1&&panel.y>=field.y+1&&panel.x+panel.w<=field.x+field.w-1&&panel.y+panel.h<=field.y+field.h-1&&
      (loose||bins.filter(o=>o!==b).every(o=>apart(panel,o.art.ink)&&own<distance(center,o.art.ink)-.01))&&
      [station.art.ink,station.art.label,...placed].filter(Boolean).every(o=>apart(panel,o))&&(loose>1||beltClear(panel));
    };
    // 좁은 화면(낮은 가로 1300×354 등)은 깐깐한 자리가 없어 판을 못 짓고 놀이가 멈췄다(10-30 마구 누르기 시험).
    // 깐깐한 길 → 벨트는 비우는 느슨한 길 → 벨트에 걸치는 길 → 원래 이름판 자리 차례로 고른다. 자리가 없다고 멈추지 않는다.
    for(const loose of [0,1,2]){
     for(const kind of ['inline','above','below']){
      const pw=kind==='inline'?nameW+countW:Math.max(nameW,countW),ph=kind==='inline'?rowH:2*rowH;
      for(let dy=-120;dy<=60;dy+=2)for(const dx of [0,-4,4,-8,8,-12,12,-20,20]){
       const panel={x:snap(b.art.foot.x-pw/2+dx),y:snap(original.y+original.h-ph+dy),w:pw,h:ph};
       const label={x:panel.x,y:panel.y+(kind==='above'?rowH:0),w:kind==='inline'?nameW:pw,h:rowH};
       const goal={x:panel.x+(kind==='inline'?nameW:0),y:panel.y+(kind==='below'?rowH:0),w:kind==='inline'?countW:pw,h:rowH};
       if(!clear(panel,goal,loose))continue;
       const overlap=Math.max(0,Math.min(panel.x+pw,b.art.ink.x+b.art.ink.w)-Math.max(panel.x,b.art.ink.x))*Math.max(0,Math.min(panel.y+ph,b.art.ink.y+b.art.ink.h)-Math.max(panel.y,b.art.ink.y));
       candidates.push({panel,label,goal,kind,cost:Math.abs(dy)+Math.abs(dx)*2+(kind==='inline'?0:25)+overlap/(pw*rowH)*20});
      }
     }
     if(candidates.length)break;
    }
    candidates.sort((a,b)=>a.cost-b.cost);let found=candidates[0];
    if(!found){const pw=nameW+countW,panel={x:snap(clamp(b.art.foot.x-pw/2,field.x+1,field.x+field.w-1-pw)),y:snap(original.y),w:pw,h:rowH};found={panel,label:{x:panel.x,y:panel.y,w:nameW,h:rowH},goal:{x:panel.x+nameW,y:panel.y,w:countW,h:rowH},kind:'inline'};}
    b.art.label=found.label;b.art.goal=found.goal;b.art.quota={panel:found.panel,kind:found.kind,font,pixel,numbered:number};placed.push(found.panel);
   }
   if(!cached){bank.set(key,Object.fromEntries(bins.map(b=>[b.id,{label:b.art.label,goal:b.art.goal,quota:b.art.quota}])));if(bank.size>64)bank.delete(bank.keys().next().value);}
  }
  const wfoot=P(S.worker),wimage=place('v3-worker',wfoot);
  const worker={x:wimage.x+25*scale,y:wimage.y+4*scale,w:50*scale,h:120*scale,image:wimage,foot:wfoot,depth:stage==='low'?sfoot.y+scale:wfoot.y,flip:simage.x+simage.w/2<wfoot.x};
  const cart=rect(S.cart),[pw,ph]=size('v3-pile'),pile={x:snap(cart.x),y:snap(cart.y),w:cart.w,h:cart.h},pileImage={x:snap(cart.x+cart.w/2-pw/2*scale),y:snap(cart.y+cart.h-(ph+12)*scale),w:pw*scale,h:ph*scale};
  const chute=P(S.chute);
  // 트럭은 무대에 칠해져 있다. 투입구 왼쪽 위 상자를 단계 목표 글 자리로 준다(assistAnchor).
  const tx=clamp(chute.x-200*scale,x,x+w-220*scale),ty=clamp(chute.y-150*scale,top,top+field.h-160*scale),truck={x:tx,y:ty,w:220*scale,h:160*scale};
  const item=60*scale,hitSize=Math.max(touch,item);
  return{stage,scale,origin,dpr,field,portrait:stage==='tall',box:rect(S.box),plane:[...S.size],path,bins,station,worker,chute,cart,pile,pileImage,truck,props:[],
   itemSize:64*scale,item,size:hitSize,hitSize,touch,plateH,labelFont,goalFont:labelFont,named,plainNames,numbered:named&&numbered,
   slots:{stage:S.slot,bins:'v3-bins',cover:'v3-cover',items:'v3-items',golden:'v3-golden',itemsHd:'v3-items-hd',goldenHd:'v3-golden-hd',station:sslot,worker:'v3-worker',pile:'v3-pile',plate:'v3-plate',tread:'v3-tread',fx:'v3-fx'},
   hits:[...bins.map(b=>({kind:'bin',id:b.id,...b.art.hit})),{kind:'station',x:station.x,y:station.y,w:station.w,h:station.h}]};
 }
 (window.GFFamilies ||= {}).recycle ||= {};
 window.GFFamilies.recycle.factory={build,at,near,binArt,stationArt,quant,pickStage,stageFit,FEET,BIN};
})();
