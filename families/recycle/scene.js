(function(){
 'use strict';
 const R=window.GFFamilies.recycle.rules,S=window.GFShell,F=()=>window.GFFamilies.recycle.factory;
 const badgeColors=['#325167','#435643','#cdb177','#9d624e','#735c8e','#91979e','#80bbb0','#ad8359','#d4925f'];
 const badgeInks=['#ffffff','#ffffff','#1d1d29','#ffffff','#ffffff','#1d1d29','#1d1d29','#1d1d29','#1d1d29'];
 const INK='#4a3524',CREAM='#fff8df';
 let ratio=1,artSlots;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const hit=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;
 const pic=slot=>S.picture?.(slot)||null;
 const text=(g,value,b,size,color=INK,outline=null,min=size)=>S.text(g,value,b,{min:Math.min(min,size),max:size,color,lines:1,outline});
 const dot=(g,x,y,r,color)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,Math.max(.1,r),0,Math.PI*2);g.fill();};
 // 3차 그리는 법(결정 대장 「3차 그림 길」): 그림 한 장을 정수 k배로 미리 키워(가까운 이웃) 두고,
 // 배율 × 기기 배율 ÷ k로 부드럽게 줄여 그린다. k는 배율 × 기기 배율을 올림한 수다. 놀이 화면 · 시작 카드 · 끝 화면이 같이 쓴다.
 const prescaled=new WeakMap();
 const keyScale=(scale,ratio)=>Math.max(1,Math.ceil(scale*ratio-1e-6));
 // 빈 캔버스는 그림이 속한 문서에서 만든다(머리 없는 시험은 가짜 문서를 그림에 달아 준다)
 const docOf=from=>from?.ownerDocument?.createElement?from.ownerDocument:window.document;
 function blank(w,h,from){const c=docOf(from).createElement('canvas');c.width=w;c.height=h;return c;}
 function prescale(img,a,frame,k){
  let bank=prescaled.get(img);if(!bank)prescaled.set(img,bank=new Map());
  const key=frame+':'+k;if(bank.has(key))return bank.get(key);
  // 칸이 여러 줄인 판(cols)은 장 번호를 줄과 칸으로 나눠 찾는다
  const sx=a.cols?frame%a.cols*a.w:frame*a.w,sy=a.cols?Math.floor(frame/a.cols)*a.h:0;
  const c=blank(a.w*k,a.h*k,img),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,sx,sy,a.w,a.h,0,0,a.w*k,a.h*k);
  bank.set(key,c);return c;
 }
 // 물건을 기기 화소로 1.5배 넘게 키우는 자리(시작 카드 · 끝 화면 · 도감)는 192점 판(v3-items-hd)에서 그린다.
 // 64점 판을 그만큼 키우면 가장자리가 계단처럼 깨졌다(10-26 대표). 큰 판이 아직 안 왔으면 64점 판 그대로 그리고, 오면 화면이 다시 그린다.
 function sharp(img,a,big,bigA,scale,ratio){return bigA&&big?.complete&&big.naturalWidth&&scale*ratio>1.5?{img:big,a:bigA,scale:scale*a.w/bigA.w}:{img,a,scale};}
 // x · y는 CSS px, scale은 그림 1점이 CSS px 몇인지다. src = [x, y, w, h]는 칸 안에서 잘라 쓸 곳(점).
 function drawArt(g,img,a,frame,x,y,scale,ratio,src=[0,0,a.w,a.h]){
  const k=keyScale(scale,ratio),c=prescale(img,a,frame,k);
  const t=g.getTransform?.();
  // 그림 자리는 기기 화소에 맞춘다. 화소 아래 자리까지 열쇠에 넣으면 움직이는 물건은 장면마다 새 그림을 다시 구웠다(10-26 잼).
  if(t&&t.a===-ratio&&t.d===ratio&&!t.b&&!t.c){
   const ix=Math.round(t.a*(x+src[2]*scale)+t.e),iy=Math.round(t.d*y+t.f),key=['flip',frame,scale,ratio,...src].join(':');let bank=finished.get(img);if(!bank)finished.set(img,bank=new Map());let tile=bank.get(key);
   if(!tile){tile=blank(Math.ceil(src[2]*scale*ratio),Math.ceil(src[3]*scale*ratio),img);const q=tile.getContext('2d');q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';q.setTransform(-1,0,0,1,src[2]*scale*ratio,0);q.drawImage(c,src[0]*k,src[1]*k,src[2]*k,src[3]*k,0,0,src[2]*scale*ratio,src[3]*scale*ratio);keep(bank,key,tile);}
   g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(tile,ix,iy);g.restore();return;
  }
  if(t&&t.a===ratio&&t.d===ratio&&!t.b&&!t.c){
   const ix=Math.round(t.a*x+t.e),iy=Math.round(t.d*y+t.f),key=[frame,scale,ratio,...src].join(':');let bank=finished.get(img);if(!bank)finished.set(img,bank=new Map());
   let tile=bank.get(key);
   if(!tile){tile=blank(Math.ceil(src[2]*scale*ratio),Math.ceil(src[3]*scale*ratio),img);const q=tile.getContext('2d');q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';q.drawImage(c,src[0]*k,src[1]*k,src[2]*k,src[3]*k,0,0,src[2]*scale*ratio,src[3]*scale*ratio);keep(bank,key,tile);}
   g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(tile,ix,iy);g.restore();return;
  }
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(c,src[0]*k,src[1]*k,src[2]*k,src[3]*k,x,y,src[2]*scale,src[3]*scale);g.restore();
 }
 const finished=new WeakMap(),backgrounds=new WeakMap(),closedBins=new Map();
 // 그림마다 구운 조각은 512장까지. 뒤집은 그림도 같은 상한을 쓴다(10-26 검수: 뒤집은 쪽은 배율이 바뀔 때마다 끝없이 늘었다).
 function keep(bank,key,tile){bank.set(key,tile);while(bank.size>512)bank.delete(bank.keys().next().value);}
 // 아홉 칸 판: 모서리는 scale 그대로(판이 작으면 같이 줄임), 변과 가운데는 늘린다. 이음매가 안 생기게 기기 화소에 맞춘다.
 // src = [x, y, w, h]: 장 안에서 판으로 쓸 곳(점). 모서리 값은 이 안을 기준으로 한다.
 function drawNine(g,img,a,frame,nine,x,y,w,h,scale,ratio,src=[0,0,a.w,a.h]){
  const base=g.getTransform?.();
  if(base&&base.a===ratio&&base.d===ratio&&!base.b&&!base.c){
   let bank=panels.get(img);if(!bank)panels.set(img,bank=new Map());
   const dx=x*ratio+base.e,dy=y*ratio+base.f,ix=Math.floor(dx),iy=Math.floor(dy),fx=dx-ix,fy=dy-iy,key=[frame,...nine,w,h,scale,ratio,...src,fx,fy].join(':');
   let tile=bank.get(key);if(!tile){tile=blank(Math.ceil(w*ratio+fx),Math.ceil(h*ratio+fy),img);const q=tile.getContext('2d');q.setTransform(ratio,0,0,ratio,0,0);paintNine(q,img,a,frame,nine,fx/ratio,fy/ratio,w,h,scale,ratio,src);bank.set(key,tile);if(bank.size>128)bank.delete(bank.keys().next().value);}
   g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(tile,ix,iy);g.restore();return;
  }
  paintNine(g,img,a,frame,nine,x,y,w,h,scale,ratio,src);
 }
 const panels=new WeakMap();
 function paintNine(g,img,a,frame,nine,x,y,w,h,scale,ratio,src){
  const [l,t,r,b]=nine,cs=Math.min(scale,w/(l+r),h/(t+b)),k=keyScale(cs,ratio),c=prescale(img,a,frame,k),px=v=>Math.round(v*ratio)/ratio;
  const sx=[src[0],src[0]+l,src[0]+src[2]-r,src[0]+src[2]],sy=[src[1],src[1]+t,src[1]+src[3]-b,src[1]+src[3]],dx=[x,x+l*cs,x+w-r*cs,x+w].map(px),dy=[y,y+t*cs,y+h-b*cs,y+h].map(px);
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){const sw=sx[i+1]-sx[i],sh=sy[j+1]-sy[j],dw=dx[i+1]-dx[i],dh=dy[j+1]-dy[j];if(sw>0&&sh>0&&dw>0&&dh>0)g.drawImage(c,sx[i]*k,sy[j]*k,sw*k,sh*k,dx[i],dy[j],dw,dh);}
  g.restore();
 }
 // 놀이 화면 조각 한 장을 무대 배율로
 function art(g,slot,frame,x,y,scale){const a=artSlots?.[slot],img=pic(slot);if(!a||!img)return false;drawArt(g,img,a,frame,x,y,scale,ratio);return true;}
 // 무대 그림: 화면에 보이는 곳만 정수 배로 미리 키워 한 번 부드럽게 줄인다. 그림 밖은 거울로 이어 채운다(빈 띠 없음).
 function stagePlane(cg,img,a,L,W,H){
  const s=L.scale,k=keyScale(s,ratio),o=L.origin,IW=a.w,IH=a.h;
  const x0=Math.floor(-o.x/s)-1,y0=Math.floor(-o.y/s)-1,x1=Math.ceil((W-o.x)/s)+1,y1=Math.ceil((H-o.y)/s)+1;
  const t=blank((x1-x0)*k,(y1-y0)*k,img),tg=t.getContext('2d');tg.imageSmoothingEnabled=false;
  for(let j=Math.floor(y0/IH);j*IH<y1;j++)for(let i=Math.floor(x0/IW);i*IW<x1;i++){
   const fx=i&1,fy=j&1;tg.setTransform(fx?-k:k,0,0,fy?-k:k,((i+fx)*IW-x0)*k,((j+fy)*IH-y0)*k);tg.drawImage(img,0,0,IW,IH,0,0,IW,IH);
  }
  cg.save();cg.imageSmoothingEnabled=true;cg.imageSmoothingQuality='high';cg.drawImage(t,o.x+x0*s,o.y+y0*s,(x1-x0)*s,(y1-y0)*s);cg.restore();
 }
 // 벨트 위에 칠한 노란 화살표만 따로 떼 둔다. 움직이는 결을 깐 뒤 그 위에 다시 얹는다(방향을 가리게 두지 않는다).
 function arrowLayer(canvas,L){
  const pts=L.path.pts,half=L.path.width/2;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  const bx=Math.max(0,Math.floor((x0-half)*ratio)),by=Math.max(0,Math.floor((y0-half)*ratio)),bw=Math.min(canvas.width,Math.ceil((x1+half)*ratio))-bx,bh=Math.min(canvas.height,Math.ceil((y1+half)*ratio))-by;
  const source=canvas.getContext('2d');if(bw<=0||bh<=0||!source.getImageData)return null;
  const m=blank(bw,bh,canvas),mg=m.getContext('2d');
  mg.setTransform(ratio,0,0,ratio,-bx,-by);mg.lineWidth=Math.max(1,L.path.width-4*L.scale);mg.lineJoin='round';mg.strokeStyle='#fff';mg.beginPath();pts.forEach((p,i)=>i?mg.lineTo(p.x,p.y):mg.moveTo(p.x,p.y));mg.stroke();
  const mask=mg.getImageData(0,0,bw,bh).data,picture=source.getImageData(bx,by,bw,bh),d=picture.data;
  for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2];if(!(mask[i+3]>128&&r>140&&gg>110&&r-b>25&&gg-b>20))d[i+3]=0;}
  mg.setTransform(1,0,0,1,0,0);mg.clearRect(0,0,bw,bh);mg.putImageData(picture,0,0);
  // 화살표가 든 칸만 붙인다. 길 전체를 덮는 한 장을 장면마다 붙이면 빈 화소까지 섞느라 2인용 느린 기기에서 무거웠다(10-26 잼).
  const cell=32,cells=[];
  for(let y=0;y<bh;y+=cell)for(let x=0,run=null;x<bw;x+=cell){
   const w=Math.min(cell,bw-x),h=Math.min(cell,bh-y);let hit=false;
   for(let j=y;j<y+h&&!hit;j++)for(let i=x;i<x+w;i++)if(d[(j*bw+i)*4+3]){hit=true;break;}
   if(!hit)run=null;else if(run)run.w+=w;else cells.push(run={x,y,w,h});
  }
  return{canvas:m,cells,x:bx/ratio,y:by/ratio,w:bw/ratio,h:bh/ratio};
 }
 // 바탕 · 벨트 판은 화면 크기마다 한 장씩이라 크기를 바꿀 때마다 쌓였다(10-30 Codex 검수: 몇 번 바꾸니 캔버스 137장 177MB, 아이패드 사파리는 캔버스 메모리 한도가 있다).
 // 바탕은 셋 · 벨트는 둘까지만 두고, 밀려난 판은 바로 비운다. 바탕은 아직 쓰는 세계(2인용)가 있으면 비우지 않는다.
 const freeCanvas=(...cs)=>{for(const c of cs)if(c){c.width=0;c.height=0;}};
 function background(w,L,W,H){
  const r=w.recycle,key=[W,H,ratio,L.slots.stage,L.scale,L.origin.x,L.origin.y].join(':');let c=r.background;
  if(c?.key!==key){
   const a=artSlots?.[L.slots.stage],img=pic(L.slots.stage);c=null;
   if(a&&img&&docOf(img)?.createElement){
    let bank=backgrounds.get(img);if(!bank)backgrounds.set(img,bank=new Map());c=bank.get(key);
    if(!c){c={key,canvas:blank(Math.round(W*ratio),Math.round(H*ratio),img)};
    // 낮은 가로 무대 아래 끝의 잘린 소품은 그림에서 지웠다(tools/recycle-v3/clear-edge-props.py). 여기서 번지게 하지 않는다.
    const cg=c.canvas.getContext('2d');cg.setTransform(ratio,0,0,ratio,0,0);cg.fillStyle='#d9d2c3';cg.fillRect(0,0,W,H);stagePlane(cg,img,a,L,W,H);
    c.arrows=arrowLayer(c.canvas,L);
    // 소수 기기 폭의 마지막 반 화소도 이전 합성과 같게 한 번만 굽는다.
    // 기기 폭이 정수면 비치는 곳이 없는 판으로 만들어, 장면마다 붙일 때 섞기 없이 바로 옮긴다(소수 폭은 마지막 반 화소가 비쳐야 해서 그대로).
    c.opaque=Number.isInteger(W*ratio)&&Number.isInteger(H*ratio);c.final=blank(c.canvas.width,c.canvas.height,img);c.final.getContext('2d',{alpha:!c.opaque}).drawImage(c.canvas,0,0,W*ratio,H*ratio);
    bank.set(key,c);while(bank.size>3){const [old,o]=bank.entries().next().value;bank.delete(old);if(!o.users&&o!==r.background)freeCanvas(o.canvas,o.final,o.arrows?.canvas);}}
    if(r.background)r.background.users--;c.users=(c.users||0)+1;r.background=c;
   }
  }
  return c;
 }
 // 벨트 결(v3-tread, 68×12점): 길을 따라 9점마다 한 장. 68점이 벨트를 가로지르고 12점이 길을 따른다. 움직임은 r.beltPhase(점).
 // 장면마다 결 수백 장을 돌려 그리면 느린 기기에서 한 장면이 50ms를 넘었다(10-26 잼, 벨트를 끄면 18ms).
 // 그래서 결 자리를 기기 화소 단위로 맞추고, 곧은 줄은 띠 한 장을 구워 그만큼 밀어 붙이고, 굽은 곳은 결 자리마다 한 장씩 구워 둔다.
 const beltBanks=new Map();
 function along(L,d){
  const pts=L.path.pts,cum=L.path.cum;let lo=1,hi=pts.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(cum[mid]<d)lo=mid+1;else hi=mid;}
  const a=pts[lo-1],b=pts[lo],l=cum[lo]-cum[lo-1],t=l?(d-cum[lo-1])/l:0;
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dir:{x:l?(b.x-a.x)/l:1,y:l?(b.y-a.y)/l:0}};
 }
 function tread(q,c,s,p,dir,ox,oy){q.setTransform(-dir.y*ratio,dir.x*ratio,dir.x*ratio,dir.y*ratio,p.x*ratio-ox,p.y*ratio-oy);q.drawImage(c,0,0,c.width,c.height,-34*s,-6*s,68*s,12*s);}
 function deviceBox(points,pad){
  const xs=points.map(p=>p.x*ratio),ys=points.map(p=>p.y*ratio),x=Math.floor(Math.min(...xs)-pad*ratio)-1,y=Math.floor(Math.min(...ys)-pad*ratio)-1;
  return{x,y,w:Math.ceil(Math.max(...xs)+pad*ratio)+1-x,h:Math.ceil(Math.max(...ys)+pad*ratio)+1-y};
 }
 function beltBank(L,c,k){
  const s=L.scale,key=[L.stage,s,ratio,L.origin.x,L.origin.y,L.path.len,k].join(':');let bank=beltBanks.get(key);if(bank)return bank;
  const pts=L.path.pts,cum=L.path.cum,step=9*s,runs=[];let run=null;
  for(let i=1;i<pts.length;i++){
   const l=cum[i]-cum[i-1];if(!l)continue;
   const dx=(pts[i].x-pts[i-1].x)/l,dy=(pts[i].y-pts[i-1].y)/l;
   if(run&&Math.abs(run.dir.x-dx)<1e-4&&Math.abs(run.dir.y-dy)<1e-4)run.d1=cum[i];else runs.push(run={d0:cum[i-1],d1:cum[i],dir:{x:dx,y:dy},p0:pts[i-1]});
  }
  // 축에 맞고 36점 넘게 곧은 줄만 띠로 굽는다. 그 사이 짧은 토막들은 이어서 굽은 곳 하나로 친다.
  const parts=[];
  for(const p of runs){const straight=p.d1-p.d0>=36*s&&(Math.abs(p.dir.x)<1e-6||Math.abs(p.dir.y)<1e-6),last=parts.at(-1);if(!straight&&last&&!last.straight)last.d1=p.d1;else parts.push({...p,straight});}
  // 길의 맨 처음 · 맨 끝 두 칸은 굽은 곳처럼 결 하나하나로 그린다. 예전처럼 끝 결이 길 밖으로 반쯤 나가고, 길 밖 결은 그리지 않는다(10-26 검수: 띠를 길 끝에서 자르면 끝 결 반쪽이 빠졌다).
  for(let i=0;i<parts.length;i++){const p=parts[i];if(!p.straight||p.d1-p.d0<8*step)continue;
   if(p.d0<=0){parts.splice(i,0,{...p,d1:p.d0+2*step,straight:false});i++;p.p0={x:p.p0.x+2*step*p.dir.x,y:p.p0.y+2*step*p.dir.y};p.d0+=2*step;}
   if(p.d1>=L.path.len-1e-6){parts.splice(i+1,0,{...p,d0:p.d1-2*step,straight:false});p.d1-=2*step;}
  }
  for(const p of parts){
   const at=d=>({x:p.p0.x+(d-p.d0)*p.dir.x,y:p.p0.y+(d-p.d0)*p.dir.y}),side={x:-p.dir.y*34*s,y:p.dir.x*34*s},wide=(a,b)=>[a,b].flatMap(q=>[{x:q.x+side.x,y:q.y+side.y},{x:q.x-side.x,y:q.y-side.y}]);
   if(p.straight){
    // 결 자리 0의 띠. 밀어 붙일 때 앞쪽 한 칸이 비지 않게 한 칸 더 굽는다.
    const n0=Math.floor((p.d0-step-6*s)/step),n1=Math.ceil((p.d1+6*s)/step),b=deviceBox(wide(at(n0*step-6*s),at(n1*step+6*s)),0);
    const canvas=blank(b.w,b.h,c),q=canvas.getContext('2d');q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
    for(let n=n0;n<=n1;n++)tread(q,c,s,at(n*step),p.dir,b.x,b.y);
    p.strip={canvas,...b};
   }else{
    const inside=pts.filter((_,i)=>cum[i]>=p.d0-6*s&&cum[i]<=p.d1+6*s);
    p.box=deviceBox([along(L,Math.max(0,p.d0-6*s)),along(L,Math.min(L.path.len,p.d1+6*s)),...inside],35*s);p.phases=new Map();
   }
  }
  bank={key,step,c,parts};beltBanks.set(key,bank);
  // 벨트 판은 장면마다 열쇠로 다시 찾으니 밀려난 판을 비워도 다음 장면에 새로 굽는다.
  while(beltBanks.size>2){const [old,o]=beltBanks.entries().next().value;beltBanks.delete(old);for(const q of o.parts){freeCanvas(q.strip?.canvas);for(const t of q.phases?.values()||[])freeCanvas(t.canvas);}}
  return bank;
 }
 // 굽은 곳 한 장: 결 자리 m(기기 화소)에서 가운데가 이 토막 안에 드는 결을 길 차례대로
 function turnTile(L,bank,p,m){
  const s=L.scale,step=bank.step,shift=m/ratio,b=p.box,canvas=blank(b.w,b.h,bank.c),q=canvas.getContext('2d');
  q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
  for(let d=Math.max(0,Math.ceil((p.d0-shift)/step))*step+shift;d<p.d1&&d<L.path.len;d+=step){const a=along(L,d);tread(q,bank.c,s,a,a.dir,b.x,b.y);}
  return{canvas,...b};
 }
 function beltState(r,L,off){
  const a=artSlots?.[L.slots.tread],img=pic(L.slots.tread);if(!a||!img)return null;
  const s=L.scale,k=keyScale(s,ratio),c=prescale(img,a,0,k),bank=beltBank(L,c,k),step=bank.step,period=Math.max(1,Math.round(step*ratio));
  let m=Math.round(((((off?0:r.beltPhase||0)*s)%step+step)%step)*ratio);if(m>=period)m=0;
  return{L,bank,m,period};
 }
 function belt(g,{L,bank,m}){
  const s=L.scale,step=bank.step;
  for(const p of bank.parts){
   if(p.straight){
    // 굽은 곳과 같은 규칙: 가운데가 이 토막 안에 드는 결만, 그 결의 앞뒤 끝(6점)까지 연다. 옆은 띠 밖이 비어 있으니 2기기 화소 더 열어 가장자리 화소를 두 번 깎지 않는다.
    const shift=m/ratio,first=Math.ceil((p.d0-shift)/step)*step+shift,last=Math.ceil((p.d1-shift)/step)*step+shift-step;if(first>last)continue;
    const t=p.strip,half=34*s+2/ratio,a=first-6*s-p.d0,b=last+6*s-p.d0,ax=p.p0.x+a*p.dir.x,ay=p.p0.y+a*p.dir.y,bx=p.p0.x+b*p.dir.x,by=p.p0.y+b*p.dir.y,sx=Math.abs(p.dir.y)*half,sy=Math.abs(p.dir.x)*half;
    g.save();g.beginPath();g.rect(Math.min(ax,bx)-sx,Math.min(ay,by)-sy,Math.abs(bx-ax)+2*sx,Math.abs(by-ay)+2*sy);g.clip();g.drawImage(t.canvas,(t.x+m*p.dir.x)/ratio,(t.y+m*p.dir.y)/ratio,t.w/ratio,t.h/ratio);g.restore();
   }
   else{let t=p.phases.get(m);if(!t)p.phases.set(m,t=turnTile(L,bank,p,m));g.drawImage(t.canvas,t.x/ratio,t.y/ratio,t.w/ratio,t.h/ratio);}
  }
 }
 function arrows(g,a){if(a)for(const c of a.cells)g.drawImage(a.canvas,c.x,c.y,c.w,c.h,a.x+c.x/ratio,a.y+c.y/ratio,c.w/ratio,c.h/ratio);}
 // 바탕 · 벨트 · 화살표를 결 자리(m)마다 화면 크기 한 장으로 구워 둔다. 장면마다 바탕 위에 벨트 토막 · 굽은 곳 · 화살표를 따로 얹던 것이
 // 2인용 느린 기기에서 무거웠다(10-26 잼). 한 벌(결 자리 수만큼)이 48MB를 넘는 고해상도 화면은 예전처럼 따로 그린다.
 const movingSets=new Map();
 function movingFrame(bg,bs){
  const f=bg.final;if(f.width*f.height*4*bs.period>48*1024*1024)return null;
  let set=movingSets.get(bg);
  if(set?.bank!==bs.bank){movingSets.delete(bg);movingSets.set(bg,set={bank:bs.bank,map:new Map()});while(movingSets.size>2){const [old,o]=movingSets.entries().next().value;movingSets.delete(old);freeCanvas(...o.map.values());}}
  let c=set.map.get(bs.m);
  if(!c){c=blank(f.width,f.height,f);const q=c.getContext('2d',{alpha:!bg.opaque});q.drawImage(f,0,0);q.setTransform(ratio,0,0,ratio,0,0);belt(q,bs);arrows(q,bg.arrows);set.map.set(bs.m,c);}
  return c;
 }
 // 잠긴 통 · 덮개 · 자물쇠를 한 장으로 굽는다. 겹친 테두리를 중간 투명 그림으로 여러 번 섞지 않는다.
 // 닫힌 통은 통 자리(A)마다 자리 · 그림을 한 번 계산해 둔다. 장면마다 배열과 긴 열쇠 글자열을 만들던 것이 2인용에서 무거웠다(10-26 잼).
 const closedAt=new WeakMap();
 function closed(g,L,A,index){
  const done=closedAt.get(A);if(done?.L===L&&done.ratio===ratio){g.drawImage(done.tile,done.x/ratio,done.y/ratio,done.tile.width/ratio,done.tile.height/ratio);return;}
  const s=L.scale,k=keyScale(s,ratio),parts=[[L.slots.bins,index*4,A.image],[L.slots.cover,0,A.cover],[L.slots.cover,1,A.lock]].map(([slot,frame,p])=>({slot,frame,p,a:artSlots?.[slot],img:pic(slot)}));
  if(parts.some(p=>!p.a||!p.img))return;
  const x=Math.floor(Math.min(...parts.map(p=>p.p.x))*ratio),y=Math.floor(Math.min(...parts.map(p=>p.p.y))*ratio),right=Math.ceil(Math.max(...parts.map(p=>p.p.x+p.a.w*s))*ratio),bottom=Math.ceil(Math.max(...parts.map(p=>p.p.y+p.a.h*s))*ratio),key=[L.slots.bins,L.slots.cover,index,s,ratio,...parts.flatMap(p=>[p.p.x,p.p.y])].join(':');
  let tile=closedBins.get(key);
  if(!tile){tile=blank(right-x,bottom-y,parts[0].img);const q=tile.getContext('2d');q.setTransform(ratio,0,0,ratio,-x,-y);q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';for(const p of parts){const big=prescale(p.img,p.a,p.frame,k);q.drawImage(big,0,0,big.width,big.height,p.p.x,p.p.y,p.a.w*s,p.a.h*s);}closedBins.set(key,tile);if(closedBins.size>128)closedBins.delete(closedBins.keys().next().value);}
  closedAt.set(A,{L,ratio,tile,x,y});
  g.drawImage(tile,x/ratio,y/ratio,tile.width/ratio,tile.height/ratio);
 }
 // 도트 이름판(v3-plate: 왼쪽 · 가운데 · 오른쪽 16×30점)을 무대 배율로. 가운데만 가로로 늘린다.
 function plate(g,L,b,s=L.scale){
  const a=artSlots?.[L.slots.plate],img=pic(L.slots.plate);if(!a||!img)return;
  const edge=Math.min(16*s,b.w/2);
  drawArt(g,img,a,0,b.x,b.y,s,ratio,[0,0,edge/s,a.h]);
  drawNine(g,img,a,1,[0,0,0,0],b.x+edge,b.y,b.w-2*edge,b.h,s,ratio);
  drawArt(g,img,a,2,b.x+b.w-edge,b.y,s,ratio,[a.w-edge/s,0,edge/s,a.h]);
 }
 function quotaPlate(g,L,b,pixel){
  const a=artSlots?.[L.slots.plate],img=pic(L.slots.plate);if(!a||!img)return;
  const edge=Math.min(16*pixel,b.w/2);
  drawNine(g,img,a,0,[4,4,4,4],b.x,b.y,edge,b.h,pixel,ratio);
  drawNine(g,img,a,1,[0,4,0,4],b.x+edge,b.y,b.w-2*edge,b.h,pixel,ratio);
  drawNine(g,img,a,2,[4,4,4,4],b.x+b.w-edge,b.y,edge,b.h,pixel,ratio);
 }
 function itemFrame(n){return n.golden?0:n.item.frames[Math.min(n.done||0,n.item.frames.length-1)];}
 // 벨트 · 손질대 · 던지는 물건도 192점 판에서 그린다. 구운 조각을 1:1로 붙이니 장면마다 드는 값은 64점 판과 같다.
 function item(g,L,n,x,y){
  const half=32*L.scale,slot=n.golden?L.slots.golden:L.slots.items,big=n.golden?L.slots.goldenHd:L.slots.itemsHd,a=artSlots?.[slot],img=pic(slot);if(!a||!img)return;
  const q=sharp(img,a,pic(big),artSlots?.[big],L.scale,ratio);drawArt(g,q.img,q.a,itemFrame(n),x-half,y-half,q.scale,ratio);
 }
 // 그림의 투명 여백은 처음 한 번만 읽는다. 이름표는 실제 그림 아래에 붙이고 누르는 칸에는 쓰지 않는다.
 const itemInks=new WeakMap(),nameTiles=new WeakMap();
 function itemInk(L,n,x,y){
  const slot=n.golden?L.slots.golden:L.slots.items,hd=n.golden?L.slots.goldenHd:L.slots.itemsHd;
  const source=pic(slot),a=artSlots?.[slot];if(!source||!a)return{x:x-32*L.scale,y:y-32*L.scale,w:64*L.scale,h:64*L.scale};
  const q=sharp(source,a,pic(hd),artSlots?.[hd],L.scale,ratio),frame=itemFrame(n);
  let bank=itemInks.get(q.img);if(!bank)itemInks.set(q.img,bank=new Map());
  let b=bank.get(frame);
  if(!b){
   const c=blank(q.a.w,q.a.h,q.img),g=c.getContext('2d',{willReadFrequently:true});
   g.drawImage(q.img,q.a.cols?frame%q.a.cols*q.a.w:frame*q.a.w,q.a.cols?Math.floor(frame/q.a.cols)*q.a.h:0,q.a.w,q.a.h,0,0,q.a.w,q.a.h);
   const data=g.getImageData(0,0,q.a.w,q.a.h).data;let x0=q.a.w,y0=q.a.h,x1=-1,y1=-1;
   for(let yy=0;yy<q.a.h;yy++)for(let xx=0;xx<q.a.w;xx++)if(data[(yy*q.a.w+xx)*4+3]>24){x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);}
   b=x1<0?{x:0,y:0,w:q.a.w,h:q.a.h}:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};bank.set(frame,b);
  }
  return{x:x-32*L.scale+b.x*q.scale,y:y-32*L.scale+b.y*q.scale,w:b.w*q.scale,h:b.h*q.scale};
 }
 function nameTile(L,name,W){
  const img=pic(L.slots.plate),doc=docOf(img);if(!doc?.createElement)return null;
  let bank=nameTiles.get(doc);if(!bank)nameTiles.set(doc,bank=new Map());
  const font=W>=1024?13:12,pixel=1/ratio,key=[name,font,ratio,doc.fonts?.status].join(':');let tile=bank.get(key);
  if(!tile){
   const c=blank(1,1,img),q=c.getContext('2d');q.font=`${font}px DoHyeon, sans-serif`;
   // 양 끝 16점 사이에 가운데 두 점을 남긴다. 짧은 이름도 폭 0인 캔버스가 생기지 않는다.
   // 글자 양옆에 노트북 12점 · 폰 8점: 양 끝 쇠 장식이 6~7점이라 크림 틈이 남는다. 5점일 때 글자가 쇠 장식에 붙어 좁아 보였다(대표 10-29 「맨 왼쪽, 맨 오른쪽에 여백이 아예 없어서」).
   // 세로 폰은 벨트 옆 자리가 좁아 12점이면 이름표가 모두 통 · 화면 끝에 걸려 숨었다.
   const pad=font>=13?12:8,w=Math.max(34*pixel,Math.ceil((q.measureText(name).width+pad*2)*ratio)/ratio),h=Math.ceil((font+6)*ratio)/ratio;
   c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);q.setTransform(ratio,0,0,ratio,0,0);
   quotaPlate(q,L,{x:0,y:0,w,h},pixel);
   text(q,name,{x:pad-4,y:0,w:w-2*(pad-4),h},font);
   tile={canvas:c,w,h,font,pixel};bank.set(key,tile);while(bank.size>256)bank.delete(bank.keys().next().value);
  }
  return tile;
 }
 const overlaps=(a,b)=>a.x+a.w>b.x+.01&&b.x+b.w>a.x+.01&&a.y+a.h>b.y+.01&&b.y+b.h>a.y+.01;
 function itemLabels(w,g,poses){
  const r=w.recycle,L=r.L,visible=[],obstacles=[];
  for(const b of L.bins){obstacles.push({kind:'bin',box:b.art.ink});if(r.open.includes(b.id))obstacles.push({kind:'sign',box:b.art.quota?.panel||b.art.label});}
  obstacles.push({kind:'station',box:L.station.art.ink},{kind:'sign',box:L.station.art.label});
  // 끄는 물건, 손질 중인 물건, 벨트 앞 물건 차례로 겹침을 고른다.
  poses.sort((a,b)=>(b.kind==='drag')-(a.kind==='drag')||(b.kind==='station')-(a.kind==='station')||b.n.s-a.n.s);
  r.itemLabels=[];
  for(const p of poses){
   const tile=nameTile(L,p.n.item.name,w.view.w);if(!tile)continue;
   const ink=p.ink,x=Math.round((p.x-tile.w/2)*ratio)/ratio,below={x,y:Math.ceil((ink.y+ink.h+3)*ratio)/ratio,w:tile.w,h:tile.h};
   const blocked=(box,above=false)=>box.x<0||box.x+box.w>w.view.w||box.y<(w.view.top||0)||box.y+box.h>w.view.h-(w.cardReserve||0)?'edge'
    :visible.some(b=>overlaps(box,b))?'label'
    :poses.some(o=>o!==p&&overlaps(box,o.ink))?'item'
    // 손질 중인 이름표는 자기 작업 면 위의 크림 판으로 읽는다. 벨트 물건은 작업대를 가리지 않는다.
    // 위에 붙인 이름표는 물건보다 뒤(위쪽)에 선 통 · 손질대 몸통에는 걸쳐도 된다. 글이 있는 판(통 이름 · 손질대)은 늘 피한다.
    :obstacles.some(o=>o.box&&!(p.kind==='station'&&o.kind==='station')&&!(above&&o.kind!=='sign'&&o.box.y+o.box.h<=p.y)&&overlaps(box,o.box))?'obstacle'
    // 알림 · 주문표 · 틀림 띠는 이름표 다음에 자리를 잡으므로 지난 장면의 자리를 피한다.
    :above&&[r.eventBox,r.dayBox,r.orderSign,r.tipBox,r.bannerBox].some(b=>b&&overlaps(box,b))?'notice':null;
   // 아래 줄 벨트는 앞에 선 통이 이름표 자리를 가린다. 벨트 물건은 아래가 막히면 위에 붙인다(대표 10-30 「레일 아래쪽으로 오다보면 이름표가 갑자기 사라지는」).
   // 가로 화면의 위 절반은 위 띠 · 알림 자리와 겹치므로 아래만 쓴다(780×290 알림과 겹침). 세로 화면은 위쪽 벨트 바로 아래에 통 이름판이 있어
   // 첫 물건 이름이 숨었으므로 위 절반도 위에 붙인다(10-30 390×844 시험).
   let box=below,place='below',hidden=blocked(below),shift=0;
   const aboveOk=p.kind==='belt'&&(L.portrait||p.y>((w.view.top||0)+w.view.h-(w.cardReserve||0))/2),above={x,y:Math.floor((ink.y-3-tile.h)*ratio)/ratio,w:tile.w,h:tile.h};
   if(hidden&&aboveOk&&!blocked(above,true)){box=above;place='above';hidden=null;}
   // 위 · 아래가 다 막히면(아래 줄 벨트가 손질대 이름판과 앞 통 사이를 지날 때, 10-30 공개판 1695×902 3단계) 옆으로 조금씩 밀어 본다.
   // 이름표가 물건 가운데를 늘 덮을 만큼만 민다.
   if(hidden&&p.kind==='belt')for(let k=1;k*6<=tile.w/2-4&&hidden;k++)for(const d of [k*6,-k*6]){
    const dx=Math.round(d*ratio)/ratio,low={...below,x:below.x+dx},high={...above,x:above.x+dx};
    if(!blocked(low)){box=low;place='below';hidden=null;shift=dx;break;}
    if(aboveOk&&!blocked(high,true)){box=high;place='above';hidden=null;shift=dx;break;}
   }
   const row={uid:p.n.uid,name:p.n.item.name,kind:p.kind,s:p.n.s,font:tile.font,pixel:tile.pixel,...box,place,shift,ink,center:{x:p.x,y:p.y},hidden};
   r.itemLabels.push(row);
   if(!row.hidden){g.drawImage(tile.canvas,box.x,box.y,box.w,box.h);visible.push(box);}
  }
 }
 // 반짝임(0~2) · 튕김(3~5) 장을 0.1초씩
 function spark(g,L,x,y,age,base=0){if(age<0||age>=.3)return;const h=32*L.scale;art(g,L.slots.fx,base+Math.min(2,Math.floor(age/.1)),x-h,y-h,L.scale);}
 function footer(w,g){
  if(w.card||!w.cardReserve||w.recycle.tipNode&&!w.recycle.tipNode.hidden)return;
  const r=w.recycle,active=r.stationState.work,front=r.items.filter(n=>!n.held).sort((a,b)=>b.s-a.s)[0],n=active||front;
  const margin=w.cardReserve<56?0:8,b={x:Math.max(8,(w.view.w-700)/2),y:w.view.h-w.cardReserve+margin,w:Math.min(w.view.w-16,700),h:Math.min(w.cardReserve-2*margin,40)};
  if(b.h<16)return;
  r.footerBox=b;
  const step=n&&R.nextStep(n.item,n.done),help=!!step;r.footerHelp=Number(help);
  // 글 상자 없이 무대 바닥 위에 테두리 글로 쓴다
  const value=help?(active?'':'손질대로 · ')+(R.STEP_NAMES[step]||''):n?'':'다음 물건을 기다려요',size=clamp(Math.round(b.h*.55),12,16);
  r.footerText=value;if(!value)return;
  baked(g,r,r.L,'footer',b,[value,size],q=>text(q,value,b,size,INK,CREAM));
 }
 // 판 · 글을 작은 그림으로 구워 두고 글이 바뀔 때만 다시 굽는다. 화면 크기 한 장을 장면마다 붙이고 글 크기를 장면마다
 // 다시 맞추던 것이 느린 기기에서 무거웠다(10-26 잼). 문서가 없는 옛 규칙 시험과, 글 크기 · 자리를 재는 사진 도구
 // (__rcCapture: 화면에 붙은 캔버스의 글만 잡는다)에는 바로 그린다.
 function baked(g,r,L,id,area,key,draw){
  const doc=docOf(pic(L.slots.stage));if(!doc?.createElement||window.__rcCapture){draw(g);return;}
  const fonts=doc.fonts?.status,bank=r.signBank?.L===L&&r.signBank.fonts===fonts?r.signBank:(r.signBank={L,fonts,map:new Map()}),full=[ratio,...key,area.x,area.y,area.w,area.h];
  let c=bank.map.get(id);
  if(!c||c.key.length!==full.length||c.key.some((v,i)=>v!==full[i])){
   // 테두리 글의 굵은 선과 판 그림자가 넘치지 않게 4px 둘레를 둔다. 자리는 기기 화소에 맞춰 1:1로 붙인다.
   const x0=Math.floor((area.x-4)*ratio),y0=Math.floor((area.y-4)*ratio),cw=Math.ceil((area.x+area.w+4)*ratio)-x0,ch=Math.ceil((area.y+area.h+4)*ratio)-y0;
   const canvas=blank(cw,ch,pic(L.slots.stage)),q=canvas.getContext('2d');q.setTransform(ratio,0,0,ratio,-x0,-y0);draw(q);
   bank.map.set(id,c={key:full,canvas,x0,y0,cw,ch});
  }
  g.drawImage(c.canvas,c.x0/ratio,c.y0/ratio,c.cw/ratio,c.ch/ratio);
 }
 // 글은 문서에 그대로 쓰므로 배율이나 늦게 온 글꼴 때문에 구운 글이 비지 않는다.
 // 작은 그림만 벨트와 같은 정수 확대 후 축소 방식으로 그린다.
 function wrongTip(w){
  const r=w.recycle,tip=r.wrongTip,doc=window.document;
  if(!doc?.createElement)return;
  const age=tip?(window.performance.now()-tip.wallAt)/1000:Infinity;
  if(!tip||age>=3.95){if(r.tipNode)r.tipNode.hidden=true;r.tipBox=null;return;}
  let node=r.tipNode;
  if(!node){
   node=r.tipNode=doc.createElement('div');node.dataset.test='recycle-wrong-tip';
   node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
   // 크게 · 왼쪽 붉은 띠: 작을 때는 「뜬 줄도 몰랐음」(대표 10-29).
   node.style.cssText='position:fixed;z-index:21;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:6px 18px 6px 14px;border:3px solid #b8996a;border-left:10px solid #d9695a;background:#fff8df;color:#24473e;font-family:DoHyeon,sans-serif;text-align:left;pointer-events:none;box-shadow:0 4px 0 #4a352440';
   const image=doc.createElement('canvas');image.setAttribute('aria-hidden','true');image.style.cssText='pointer-events:none';
   const words=doc.createElement('span');words.style.cssText='min-width:0;overflow-wrap:anywhere;pointer-events:none';node.append(image,words);doc.body.append(node);
  }
  node.hidden=false;
  // hidden의 기본 display:none보다 위의 인라인 display가 우선하므로 명시해서 바꾼다.
  node.style.display='flex';
  if(r.tipActive!==tip){
   r.tipActive=tip;window.clearTimeout(r.tipTimer);r.tipAnimation?.cancel();
   const from=w.reducedMotion?'none':'translateY(4px)',to=w.reducedMotion?'none':'translateY(0)';
   r.tipAnimation=node.animate([{opacity:0,transform:from},{opacity:1,transform:to,offset:.15/3.95},{opacity:1,transform:to,offset:3.65/3.95},{opacity:0,transform:from}],{duration:3950,fill:'both'});
   r.tipAnimation.currentTime=Math.max(0,age*1000);
   // 놀이 시계의 느려짐이나 멈춤과 따로 실제 3.95초 뒤 숨긴다.
   r.tipTimer=window.setTimeout(()=>{if(r.wrongTip===tip){node.hidden=true;node.style.display='none';r.tipBox=null;}},Math.max(0,3950-age*1000));
  }
  const wide=w.view.w>=1024,font=wide?22:w.view.h>=480?17:15,key=[r.L,tip,ratio,doc.fonts?.status,doc.fonts?.check('16px DoHyeon')];
  if(!r.tipLayout||key.some((v,i)=>v!==r.tipLayout[i])){
   r.tipLayout=key;node.lastChild.textContent=tip.item.tip;
   // 노트북 높이 58점: 1366×768 아래 줄 통 이름판(아래 끝 695)과 화면 끝 8점 사이에 들어간다. 한 줄에 다 들어가게 넓게.
   node.style.fontSize=font+'px';node.style.lineHeight=(font+4)+'px';node.style.width=Math.min(wide?900:620,w.view.w-16)+'px';
   const canvas=node.firstChild,size=wide?40:font*2;canvas.style.width=canvas.style.height=size+'px';canvas.style.flex=`0 0 ${size}px`;canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);
   const q=canvas.getContext('2d');q.setTransform(ratio,0,0,ratio,0,0);
   const slot=tip.golden?r.L.slots.golden:r.L.slots.items,a=artSlots[slot],img=pic(slot);
   if(a&&img){const scale=size/a.w;drawArt(q,img,a,itemFrame(tip),0,0,scale,ratio);}
   const box=node.getBoundingClientRect();
   r.tipBox={x:Math.round((w.view.w-box.width)/2*ratio)/ratio,y:Math.floor((w.view.h-box.height-8)*ratio)/ratio,w:box.width,h:box.height};
   node.style.left=r.tipBox.x+'px';node.style.top=r.tipBox.y+'px';
  }
 }
 // 틀리면 화면 가장자리가 은은하게 붉게 두 번 깜빡인다(대표 10-29 「틀렸는데도 틀린지 모르겠거든」). 가운데는 비워 놀이를 가리지 않는다.
 function wrongFlash(w){
  const r=w.recycle,tip=r.wrongTip,doc=window.document;
  if(!doc?.createElement||!tip||r.flashFor===tip)return;r.flashFor=tip;
  const age=(window.performance.now()-tip.wallAt)/1000;if(!(age<1))return;
  let node=r.flashNode;
  if(!node){node=r.flashNode=doc.createElement('div');node.dataset.test='recycle-wrong-flash';node.setAttribute('aria-hidden','true');
   node.style.cssText='position:fixed;inset:0;z-index:20;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(214,58,46,0) 48%,rgba(214,58,46,.22) 72%,rgba(214,58,46,.5) 100%)';doc.body.append(node);}
  r.flashAnimation?.cancel();
  r.flashAnimation=node.animate(w.reducedMotion?[{opacity:0},{opacity:.75},{opacity:0}]:[{opacity:0},{opacity:1,offset:.15},{opacity:.25,offset:.42},{opacity:.85,offset:.6},{opacity:0}],{duration:w.reducedMotion?700:1000,fill:'both'});
  r.flashAnimation.currentTime=Math.max(0,age*1000);
 }
 function draw(w,g){
  const profile=window.__rcProfile,clock=()=>profile?performance.now():0,record=(name,start)=>{if(profile){const v=profile[name]||= {ms:0,calls:0};v.ms+=clock()-start;v.calls++;}},begin=clock();let mark=begin,itemMs=0;
  const r=w.recycle,L=r.L,now=w.time,off=w.effectsOff||w.reducedMotion,st=r.stationState,W=w.view.w,H=w.view.h,s=L.scale;
  ratio=L.dpr||1;artSlots=w.art.slots;
  const transform=g.getTransform?.();if(transform)g.setTransform(ratio,0,0,ratio,Math.round(transform.e),Math.round(transform.f));
  const bg=background(w,L,W,H),bs=beltState(r,L,off),frame=bg&&bs&&movingFrame(bg,bs);
  if(frame){g.drawImage(frame,0,0,frame.width/ratio,frame.height/ratio);record('floor',mark);mark=clock();}
  else{
   // 바탕 색은 무대 그림을 구울 때 같이 칠해 두었다. 장면마다 화면 전체를 한 번 더 칠하지 않는다.
   if(bg)g.drawImage(bg.final,0,0,bg.final.width/ratio,bg.final.height/ratio);else{g.fillStyle='#d9d2c3';g.fillRect(0,0,W,H);}
   record('floor',mark);mark=clock();
   if(bs)belt(g,bs);arrows(g,bg?.arrows);
  }
  record('belt',mark);mark=clock();
  if(!off&&w.fever?.active){g.save();g.globalAlpha=.23+Math.sin(now*4)*.05;g.strokeStyle='#ffe08a';g.lineWidth=L.path.width*.68;g.lineCap='round';g.lineJoin='round';g.beginPath();L.path.pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.restore();}
  const poses=[],pose=(n,x,y,kind)=>poses.push({n,x,y,kind,ink:itemInk(L,n,x,y)});
  const front=r.items.filter(n=>!n.held).sort((a,b)=>b.s-a.s)[0]?.uid;
  function drawItem(n,p){
   const start=clock();
   let x=p.x,y=p.y;const age=now-(n.born??-99);
   if(!off){
    y+=Math.sin(now*Math.PI*6+n.uid)*.8;
    // 투입구에서 미끄러져 벨트에 오른다
    if(n.s<.03&&n.returnAt==null&&age<.3){const t=clamp(age/.3),e=1-(1-t)*(1-t),sx=L.chute.x,sy=L.chute.y-24*s;x=sx+(x-sx)*e;y=sy+(y-sy)*e;}
    if(n.returnAt!=null&&now-n.returnAt<.25){const t=clamp((now-n.returnAt)/.25),from=r.fx.find(f=>f.kind==='return'&&f.uid===n.uid)?.from;if(from){x=from.x+(x-from.x)*t;y=from.y+(y-from.y)*t;}}
   }
   const size=L.item;g.fillStyle='#213f4830';g.beginPath();g.ellipse(x,y+size*.4,size*.36,size*.1,0,0,Math.PI*2);g.fill();
   if(n.golden){
    if(!off)for(let i=1;i<=6;i++){const q=F().at(L.path,n.s-i*.003);g.save();g.globalAlpha=(7-i)*.045;dot(g,q.x,q.y,size*.3,'#ffd778');g.restore();}
    g.save();g.globalAlpha=off?.2:.18+.1*Math.sin(now*Math.PI*2/1.2);dot(g,x,y,size*.66,'#ffe896');g.restore();
   }
   // 맨 앞 물건 고리는 키로 놀 때만(대표 10-27 「동그란 원 … 없애줘」). 끌어 놀 땐 안 보인다.
   if(r.keyUsed&&n.uid===front){g.strokeStyle='#f6c969';g.lineWidth=Math.max(2,3*s);g.beginPath();g.arc(x,y,Math.max(L.hitSize,size)*.54,0,Math.PI*2);g.stroke();}
   item(g,L,n,x,y);
   pose(n,x,y,'belt');
   if(n.reask){const rr=Math.max(9,11*s),bx=x+size*.36,by=y-size*.42;dot(g,bx,by,rr,'#fff7d7');g.strokeStyle='#9b5635';g.lineWidth=2;g.beginPath();g.arc(bx,by,rr,0,Math.PI*2);g.stroke();text(g,'!',{x:bx-rr,y:by-rr,w:2*rr,h:2*rr},clamp(Math.round(rr*1.4),12,18),'#6f3523');}
   itemMs+=clock()-start;
  }
  // 깊이 차례: 물건은 아래 끝, 통 · 손질대 · 일꾼 · 수레는 발 자리로 줄 세운다
  const layer=[];
  for(const n of r.items)if(!n.held){const p=F().at(L.path,n.s);layer.push({y:p.y+28*s,f:()=>drawItem(n,p)});}
  L.bins.forEach((b,i)=>layer.push({y:b.art.foot.y,f:()=>{
   const A=b.art,open=r.open.includes(b.id);
   if(!open){closed(g,L,A,i);return;}
   const hover=r.items.some(n=>n.drag&&hit(A.hit,n.drag.x,n.drag.y)),ev=r.fx.filter(f=>f.bin===b.id&&(f.kind==='right'||f.kind==='wrong')).at(-1),age=ev?now-ev.at:99;
   // 0 닫힘, 1 뚜껑 열림(끌고 오면 · 넣는 동안), 2 톡 튀기(맞음), 3 흔들기(틀림)
   const frame=ev?.kind==='right'&&age<.28?1:!off&&ev?.kind==='right'&&age<.5?2:!off&&ev?.kind==='wrong'&&age<.45?3:hover?1:0;
   if(r.selectorUsed&&r.selected===b.id){g.save();g.globalAlpha=.7;g.strokeStyle='#e5c16e';g.lineWidth=Math.max(3,4*s);g.beginPath();g.ellipse(A.foot.x,A.foot.y-2*s,52*s,12*s,0,0,Math.PI*2);g.stroke();g.restore();}
   g.save();if(r.endless?.order?.bin===b.id)r.orderFrame=i*4+frame;
   art(g,L.slots.bins,i*4+frame,A.image.x,A.image.y,s);g.restore();
  }}));
  layer.push({y:L.station.art.foot.y,f:()=>{
   const A=L.station.art,n=st.work,step=n?n.item.steps[n.done]:null,frame=off||!n?0:step==='rinse'?1:step?.startsWith('tap:')?2:0;
   g.save();if(st.blinkUntil>now){g.shadowColor='#ffd76a';g.shadowBlur=off?10:12+Math.sin(now*18)*4;}
   art(g,L.station.slot,frame,A.image.x,A.image.y,s);g.restore();
  }});
  layer.push({y:L.worker.depth,f:()=>{
   // 서 있기 0 · 1, 손질 2 · 3, 좋아하기 4 · 5(피버), 놀람 6 · 7(틀림)
   const b=L.worker.image,frame=off?0:st.work?2+Math.floor(now/.2)%2:now<r.workerUntil?6+Math.floor(now/.15)%2:w.fever?.active?4+Math.floor(now/.25)%2:Math.floor(now/.6)%2;
   if(L.worker.flip){g.save();g.translate(2*b.x+b.w,0);g.scale(-1,1);art(g,L.slots.worker,frame,b.x,b.y,s);g.restore();}else art(g,L.slots.worker,frame,b.x,b.y,s);
  }});
  // 작업대 물건은 일꾼 손 앞에 보인다. 낮은 가로에서는 일꾼이 앞에 서므로 별도 층으로 둔다.
  layer.push({y:L.station.art.foot.y+2*s,f:()=>{
   const A=L.station.art,n=st.work,step=n?.item.steps[n.done];
   if(st.wait){item(g,L,st.wait,A.wait.x,A.wait.y);pose(st.wait,A.wait.x,A.wait.y,'station');}
   if(n&&!n.outputting){const p=step==='rinse'?A.sink:step?.startsWith('tap:')?A.press:A.table;item(g,L,n,p.x,p.y);pose(n,p.x,p.y,'station');}
   if(st.out[0]){item(g,L,st.out[0],A.out.x,A.out.y);pose(st.out[0],A.out.x,A.out.y,'station');}
  }});
  layer.push({y:L.cart.y+L.cart.h,f:()=>{const c=r.pile||0;if(c)art(g,L.slots.pile,c>=10?3:c>=6?2:c>=3?1:0,L.pileImage.x,L.pileImage.y,s);}});
  for(const o of layer.sort((a,b)=>a.y-b.y))o.f();
  if(profile){const v=profile.items||={ms:0,calls:0};v.ms+=itemMs;v.calls++;mark+=itemMs;}record('machines',mark);mark=clock();
  // 던지기 · 반짝임은 이름판 아래에 그린다. 세로 무대는 위 통 이름판이 아래 통 입구 바로 위에 있어서, 위에 그리면 던진 물건이 이름을 가린다.
  if(!off)for(const f of r.fx){
   const age=now-f.at;
   if(f.kind==='right'){if(age<.28){const t=age/.28;item(g,L,f,f.from.x+(f.to.x-f.from.x)*t,f.from.y+(f.to.y-f.from.y)*t-45*s*Math.sin(t*Math.PI));}else spark(g,L,f.to.x,f.to.y,age-.28,0);}
   else if(f.kind==='wrong'&&age<.6){
    const t=age/.6,from=t<.2?f.from:f.to,end=t<.2?f.to:{x:L.worker.x+L.worker.w/2,y:L.worker.y+L.worker.h*.2},p=t<.2?t/.2:(t-.2)/.8;
    item(g,L,f,from.x+(end.x-from.x)*p,from.y+(end.y-from.y)*p-60*s*Math.sin(p*Math.PI));spark(g,L,f.to.x,f.to.y,age-.12,3);
   }
   else if(f.kind==='open'&&age<.6){for(const id of f.ids){const m=L.bins.find(b=>b.id===id)?.art.mouth;if(m)spark(g,L,m.x,m.y,age%.3,0);}}
   else if((f.kind==='prep'||f.kind==='part'||f.kind==='ready')&&age<.3)spark(g,L,f.x,f.y-24*s,age,f.kind==='part'?3:0);
  }
  // 이름판: 열린 통(번호는 키보드로 놀 때만) · 손질대 · 단계 목표. 판이 너무 작은 화면(가장 작은 폰)은 판 없이 테두리 글로 쓴다.
  record('effects',mark);mark=clock();
  // 판과 글은 이름판마다 작은 그림으로 구워 두고, 글이 바뀐 판만 다시 굽는다. 화면 크기 한 장을 장면마다 붙이고
  // 글 크기를 장면마다 다시 맞추던 것이 느린 기기에서 무거웠다(10-26 잼). 문서가 없는 옛 규칙 시험은 바로 그린다.
  const signs=[];r.goalSigns=[];
  if(L.named||L.plainNames){
   const boxed=L.named,numbered=L.numbered,font=L.labelFont;
   // 판 없는 테두리 글은 판 높이에 묶이지 않는다(가장 작은 폰에서 12px을 지킨다)
   const sign=(id,b,value,size,inset)=>{const hh=Math.max(b.h,18),area=boxed?b:{x:b.x,y:b.y+(b.h-hh)/2,w:b.w,h:hh};signs.push({id,area,key:[value,size,inset],draw:q=>{if(!boxed){text(q,value,area,size,INK,CREAM,10);return;}plate(q,L,b);text(q,value,{x:b.x+inset,y:b.y,w:b.w-2*inset,h:b.h},size,INK,null,10);}});};
   L.bins.forEach((b,i)=>{
    if(!r.open.includes(b.id))return;const lb=b.art.label,name=w.content.bins[i].name;
    const quota=b.art.quota;
    if(quota){
     const need=w.modeSession?.state.stage?.goal.need?.[b.id],area=b.art.goal,n=Math.min(r.saved[b.id]||0,need||0),done=!!need&&n===need,value=need?`${n}/${need}`:'',font=quota.font,p=quota.pixel,panel=quota.panel;
     if(need)r.goalSigns.push({bin:b.id,...area,font,value,done,panel,kind:quota.kind,pixel:p});
     signs.push({id:need?'goal'+b.id:'bin'+i,area:panel,key:[name,value,done,font,quota.kind],draw:q=>{
      quotaPlate(q,L,panel,p);
      if(need){
       q.fillStyle=done?'#d5edca':'#b8996a';
       if(done)q.fillRect(area.x+3*p,area.y+3*p,area.w-6*p,area.h-6*p);
       q.fillStyle='#b8996a';
       if(quota.kind==='inline')q.fillRect(area.x,area.y+4*p,p,area.h-8*p);
       else q.fillRect(area.x+4*p,quota.kind==='above'?lb.y:area.y,area.w-8*p,p);
       const check=done?8*p:0;
       if(done){const ox=area.x+5*p,oy=area.y+(area.h-5*p)/2;q.fillStyle='#356c40';for(const [x,y]of [[0,2],[1,3],[2,4],[3,3],[4,2],[5,1],[6,0]])q.fillRect(Math.round((ox+x*p)*ratio)/ratio,Math.round((oy+y*p)*ratio)/ratio,p,p);}
       text(q,value,{x:area.x+4*p+check,y:area.y,w:area.w-8*p-check,h:area.h},font,INK,null,font);
      }
      const nr=quota.numbered?font*.45:0,tx=lb.x+5*p+(nr?nr*2+3*p:0);
      if(nr){const cx=lb.x+5*p+nr;dot(q,cx,lb.y+lb.h/2,nr,badgeColors[i]);text(q,String(b.key),{x:cx-nr,y:lb.y,w:nr*2,h:lb.h},font,badgeInks[i]);}
      text(q,name,{x:tx,y:lb.y,w:lb.x+lb.w-5*p-tx,h:lb.h},font,INK,null,font);
     }});return;
    }
    if(!numbered){sign('bin'+i,lb,name,font,10*s);return;}
    signs.push({id:'bin'+i,area:lb,key:[name,b.key,font],draw:q=>{
     plate(q,L,lb);const rr=lb.h*.3,cx=lb.x+12*s+rr,tx=cx+rr+2*s;dot(q,cx,lb.y+lb.h/2,rr,badgeColors[i]);
     text(q,String(b.key),{x:cx-rr,y:lb.y,w:2*rr,h:lb.h},clamp(Math.round(rr*1.25),10,14),badgeInks[i]);
     text(q,name,{x:tx,y:lb.y,w:lb.x+lb.w-10*s-tx,h:lb.h},font,INK,null,10);
    }});
   });
   if(L.station.art.label)sign('station',L.station.art.label,'손질대',font,8*s);
   // 통별 목표 판은 그 통의 개수만 쓰고, 다 찬 판에 도트 체크를 붙인다.
   const stage=w.modeSession?.state.stage,need=stage?.goal.need;
   for(const b of L.bins.filter(b=>need?.[b.id])){
    if(b.art.quota)continue;
    const area=b.art.goal,n=Math.min(r.saved[b.id]||0,need[b.id]),done=n===need[b.id],value=`${n}/${need[b.id]}`,font=12;
    r.goalSigns.push({bin:b.id,...area,font,value,done});
    signs.push({id:'goal'+b.id,area,key:[value,done,font],draw:q=>{
     const ps=area.h/30;plate(q,L,area,ps);
     if(done){q.fillStyle='#d5edca';q.fillRect(area.x+4*ps,area.y+4*ps,area.w-8*ps,area.h-8*ps);}
     const check=done?8:0;
     if(done){const ox=area.x+4,oy=area.y+(area.h-5)/2;q.fillStyle='#356c40';for(const [x,y]of [[0,2],[1,3],[2,4],[3,3],[4,2],[5,1],[6,0]])q.fillRect(ox+x,oy+y,1,1);}
     text(q,value,{x:area.x+3+check,y:area.y,w:area.w-6-check,h:area.h},font,INK,null,12);
    }});
   }
  }
  for(const t of signs)baked(g,r,L,t.id,t.area,t.key,t.draw);
  for(const n of r.items)if(n.held&&n.drag){
   const x=n.drag.x,y=n.drag.y-6*s,size=L.item;g.fillStyle='#213f4840';g.beginPath();g.ellipse(x,y+size*.62,size*.42,size*.12,0,0,Math.PI*2);g.fill();item(g,L,n,x,y);
   pose(n,x,y,'drag');
  }
  itemLabels(w,g,poses);
  for(const n of r.items){
   const p=n.drag||F().at(L.path,n.s),x=p.x,y=p.y,size=L.item;
   if(n.bubble?.until>now){const font=clamp(Math.round(L.plateH*.52),12,18),bw=Math.min(([...n.bubble.text].length+1)*font+24*s,W-24),bh=Math.max(L.plateH,font+8),box={x:clamp(x-bw/2,12,W-bw-12),y:clamp(y-size/2-bh-6,(w.view.top||0)+8,H-(w.cardReserve||0)-bh-4),w:bw,h:bh};plate(g,L,box);text(g,n.bubble.text,{x:box.x+8*s,y:box.y,w:box.w-16*s,h:box.h},font);}
  }
  wrongFlash(w);wrongTip(w);
  if(r.tipNode?.hidden)r.tipNode.style.display='none';
  footer(w,g);
  endlessEvent(w);
  endlessOrder(w);
  if(r.endless?.order){const b=L.bins.find(b=>b.id===r.endless.order.bin);orderGlow(w,g,b,r.orderFrame,off);}
  r.bannerBox=null;
  if(r.banner&&now-r.banner.at<2.5){
   const font=W>=1024?16:12,bw=Math.min(410,W>H?W*.36:W-16),bh=30;
   const b=r.bannerBox={x:(W-bw)/2,y:W>H?4:60,w:bw,h:bh};plate(g,L,b,1);text(g,r.banner.text,{x:b.x+8,y:b.y,w:b.w-16,h:b.h},font);
  }
  record('labels',mark);record('scene',begin);
 }
 const rect=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
 const apart=(a,b,gap=3)=>a.x+a.w+gap<=b.x||b.x+b.w+gap<=a.x||a.y+a.h+gap<=b.y||b.y+b.h+gap<=a.y;
 const overlayStyle='position:fixed;z-index:20;box-sizing:border-box;background:#fff8df;color:#24473e;font-family:DoHyeon,sans-serif;pointer-events:none;line-height:1.15;';
 const hudBoxes=()=>[...window.document.querySelectorAll('.gf-hud-row .gf-chip,.gf-goal:not([hidden])')].map(n=>{const b=rect(n);if(n.matches('.gf-chip')){const cx=b.x+b.w/2,cy=b.y+b.h/2;b.w=Math.max(b.w,n.offsetWidth,138);b.h=Math.max(b.h,n.offsetHeight,56);b.x=cx-b.w/2;b.y=cy-b.h/2;if(cx<innerWidth/2)b.x=4;}return b;}).filter(b=>b.w&&b.h);
 function playObstacles(w){const r=w.recycle,L=r.L;return[...L.bins.flatMap(b=>[b.art.ink,b.art.label,b.art.quota?.panel]),L.station.art.ink,L.station.art.label,...(r.itemLabels||[]).flatMap(n=>[n.hidden?null:n,n.ink]),r.tipBox,...(L.portrait?[{x:8,y:120,w:150,h:35}]:[]),...hudBoxes()].filter(Boolean);}
 // Reserve the whole moving lane, including the names below its objects.
 function laneClear(w,b){const L=w.recycle.L,half=32*L.scale+3;return L.path.pts.every((p,i)=>i%12&&i!==L.path.pts.length-1||p.x+half<=b.x||p.x-half>=b.x+b.w||p.y+half+22<=b.y||p.y-half>=b.y+b.h);}
 function freePlace(w,width,height,preferred,obstacles,cost=()=>0){
  const valid=b=>b.x>=4&&b.y>=2&&b.x+b.w<=w.view.w-4&&b.y+b.h<=w.view.h-4&&obstacles.every(o=>apart(b,o))&&laneClear(w,b);
  const first=preferred.map(p=>({...p,w:width,h:height})).find(valid);if(first)return first;
  let best=null,score=Infinity;
  for(let y=4;y+height<w.view.h-4;y+=6)for(let x=4;x+width<w.view.w-4;x+=6){const b={x,y,w:width,h:height},n=cost(b);if(n<score&&valid(b)){score=n;best=b;}}
  return best;
 }
 function setBox(node,b){Object.assign(node.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px'});}
 function stamp(node,off){node.style.transform='rotate(-9deg)';if(!off)node.animate([{transform:'rotate(-9deg) scale(1.15)',opacity:0},{transform:'rotate(-9deg) scale(1)',opacity:1}],{duration:220,easing:'ease-out'});}
 // The day introduction interrupts the shared notice slot; its persistent strip has its own place.
 function endlessEvent(w){
  const r=w.recycle,s=r.endless,doc=window.document;if(!s||!doc?.createElement)return;
  const n=s.notice,d=s.day,laptop=w.view.w>=1024,off=w.reducedMotion||w.effectsOff,over=w.modeSession?.state.ended||w.over;
  let node=r.eventNode;
  if(!node){
   node=r.eventNode=doc.createElement('aside');node.dataset.test='recycle-endless-event';node.setAttribute('aria-live','polite');
   node.style.cssText=overlayStyle+'text-align:center;padding:0 10px;border:2px solid #b8996a;border-radius:5px;';
   const row=doc.createElement('div'),title=doc.createElement('span'),detail=doc.createElement('div');row.style.cssText='position:relative;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;';title.dataset.test='recycle-event-title';detail.dataset.test='recycle-event-detail';
   row.append(title);node.append(row,detail);doc.body.append(node);
  }
  node.hidden=over||!n;r.eventBox=null;
  if(n&&!over){
   const day=n.kind==='day-start'||n.kind==='day-end',key=[n,w.view.w,w.view.h,ratio];
   if(!r.eventKey||key.some((v,i)=>v!==r.eventKey[i])){
    r.eventKey=key;node.getAnimations().forEach(a=>a.cancel());node.dataset.kind=n.kind;node.dataset.perfect=String(!!n.perfect);
    const row=node.firstChild,title=doc.createElement('span'),detail=node.lastChild;title.dataset.test='recycle-event-title';title.textContent=n.title;title.style.fontSize=(day?(laptop?28:16):(laptop?24:16))+'px';row.replaceChildren(title);row.style.padding=n.kind==='day-start'?(laptop?'0 48px 0 96px':'0 32px 0 64px'):'0';
    if(n.kind==='day-start')for(const [i,id]of (n.items||d?.preview||d?.items.slice(0,3)||[]).entries()){
     const canvas=doc.createElement('canvas'),size=laptop?44:28,scale=size/64,item=R.item(w.content,id);canvas.dataset.test='recycle-day-picture';canvas.dataset.item=id;canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);canvas.style.cssText=`position:absolute;top:2px;${i<2?'left:'+i*(size+2)+'px':'right:0'};width:${size}px;height:${size}px;`;canvas.setAttribute('aria-hidden','true');
     const g=canvas.getContext('2d'),a=artSlots[LSlot(w)],q=sharp(pic(LSlot(w)),a,pic(w.recycle.L.slots.itemsHd),artSlots[w.recycle.L.slots.itemsHd],scale,ratio);g.setTransform(ratio,0,0,ratio,0,0);drawArt(g,q.img,q.a,item.frames[0],0,0,q.scale,ratio);
     if(i<2)row.insertBefore(canvas,title);else row.append(canvas);
    }
    detail.textContent=n.detail||'';detail.hidden=!n.detail;detail.style.fontSize=(laptop?16:13)+'px';
    if(n.perfect){const badge=doc.createElement('span');badge.dataset.test='recycle-day-perfect';badge.textContent=R.ENDLESS_TEXT.perfect;badge.style.cssText='display:inline-block;border:2px solid #ae583b;border-radius:2px;padding:1px 5px;margin:0 8px 0 0;color:#98472e;';detail.replaceChildren(badge,doc.createTextNode((n.detail||'').replace(R.ENDLESS_TEXT.perfect,'').trim()));stamp(badge,off);}
    node.style.borderColor=day?'#ce8c4e':'#b8996a';node.style.borderTopWidth=day?'4px':'2px';node.style.borderBottomWidth=day?'4px':'2px';node.style.borderTopColor=node.style.borderBottomColor=day?'#f6c07a':'#b8996a';
    let left=w.view.w>w.view.h?(laptop?240:180):8,right=w.view.w-(w.view.w>w.view.h?260:8);
    if(w.view.w>w.view.h)for(const b of hudBoxes()){if(b.y>56)continue;if(b.x+b.w/2<w.view.w/2)left=Math.max(left,b.x+b.w+24);else right=Math.min(right,b.x-24);}
    const width=Math.min(laptop?600:520,right-left,n.kind==='day-start'&&!off?(w.view.w-8)/1.08:Infinity);setBox(node,{x:(left+right-width)/2,y:w.view.h>w.view.w?60:3,w:width});
    if(n.kind==='day-start'&&!off)node.animate([{transform:'scale(1)'},{transform:'scale(1.08)',offset:.5},{transform:'scale(1)'}],{duration:400,easing:'ease-in-out'});
   }
   // Reserve the full introduction pulse even between its largest frames.
   const pad=n.kind==='day-start'&&!off?.04:0;r.eventBox={x:parseFloat(node.style.left)-parseFloat(node.style.width)*pad,y:parseFloat(node.style.top)-node.offsetHeight*pad,w:parseFloat(node.style.width)*(1+2*pad),h:node.offsetHeight*(1+2*pad)};
  }
  let strip=r.dayNode;
  if(!strip){
   strip=r.dayNode=doc.createElement('aside');strip.dataset.test='recycle-day-strip';strip.style.cssText=overlayStyle+'padding:5px 8px 6px;border:2px solid #e4a45e;border-radius:5px;box-shadow:0 2px 0 #91634235;';
   const name=doc.createElement('div'),track=doc.createElement('div'),bar=doc.createElement('div');name.dataset.test='recycle-day-name';track.style.cssText='margin-top:4px;background:#e6d8bc;border-radius:2px;overflow:hidden;';bar.dataset.test='recycle-day-bar';bar.style.cssText='height:100%;background:#d99048;transform-origin:left;';track.append(bar);strip.append(name,track);doc.body.append(strip);
  }
  strip.hidden=over||!d;r.dayBox=null;
  if(d&&!over){
   const low=w.view.h<=300;strip.style.padding=low?'3px 6px':'5px 8px 6px';strip.lastChild.style.marginTop=low?'2px':'4px';strip.firstChild.textContent=d.name;strip.firstChild.style.fontSize=(laptop?18:low?13:14)+'px';strip.lastChild.style.height=(laptop?7:4)+'px';strip.lastChild.firstChild.style.transform=`scaleX(${clamp((d.until-w.time)/(d.until-d.at))})`;
   const width=laptop?176:low?72:160,height=laptop?47:low?50:40,obstacles=[...playObstacles(w),r.eventBox].filter(Boolean),score=hudBoxes().find(b=>b.x<w.view.w/2),left=(score?score.x+score.w:4)+16;
   const key=[w.view.w,w.view.h,r.eventBox?.x,r.eventBox?.h,score?.w,!!r.tipBox].join(':');
   if(r.dayPlaceKey!==key||!r.dayPlace||!obstacles.every(o=>apart(r.dayPlace,o))){r.dayPlaceKey=key;r.dayPlace=freePlace(w,width,height,[...low?[{x:w.view.w-76,y:w.view.h-54}]:[],{x:left,y:4},{x:8,y:w.view.w>w.view.h?62:120}],obstacles,b=>b.y*2+b.x*.1);}
   if(r.dayPlace){setBox(strip,r.dayPlace);r.dayBox=rect(strip);}
  }
 }
 const LSlot=w=>w.recycle.L.slots.items;
 const glowTiles=new WeakMap();
 function orderGlow(w,g,b,frame,off){
  const L=w.recycle.L,A=b.art,img=pic(L.slots.bins),a=artSlots?.[L.slots.bins];if(!img||!a)return;
  const width=w.view.w>=1024?5:3,opacity=off?.6:.55+.2*Math.sin((w.time-w.recycle.endless.order.at)*Math.PI*2/1.2),key=[frame,L.scale,ratio,width].join(':');
  let bank=glowTiles.get(img);if(!bank)glowTiles.set(img,bank=new Map());let tile=bank.get(key);
  if(!tile){
   const mask=blank(Math.ceil(A.image.w*ratio),Math.ceil(A.image.h*ratio),img),q=mask.getContext('2d');q.setTransform(ratio,0,0,ratio,0,0);drawArt(q,img,a,frame,0,0,L.scale,ratio);q.globalCompositeOperation='source-in';q.fillStyle='#e9a258';q.fillRect(0,0,A.image.w,A.image.h);
   tile=blank(mask.width+2*width*ratio,mask.height+2*width*ratio,img);const p=tile.getContext('2d');for(let j=0;j<16;j++){const angle=j*Math.PI/8;p.drawImage(mask,(width+Math.cos(angle)*width)*ratio,(width+Math.sin(angle)*width)*ratio);}p.globalCompositeOperation='destination-out';p.drawImage(mask,width*ratio,width*ratio);bank.set(key,tile);if(bank.size>64)bank.delete(bank.keys().next().value);
  }
  // A name plate can sit in front of its own bin. Keep its text entirely outside the outline paint.
  let regions=[{x:A.ink.x-width,y:A.ink.y-width,w:A.ink.w+2*width,h:A.ink.h+2*width}];
  const half=32*L.scale+4,lane=L.path.pts.filter((_,i)=>i%12===0).map(p=>({x:p.x-half,y:p.y-half,w:2*half,h:2*half+24})),ticket=w.recycle.orderSign&&{...w.recycle.orderSign,y:w.recycle.orderSign.y-6,h:w.recycle.orderSign.h+6};
  // Long item names can extend beyond the reserved lane. Cut their actual bounds out too.
  for(const label of [...L.bins.flatMap(o=>[o.art.label,o!==b?o.art.ink:null]),w.recycle.eventBox,w.recycle.dayBox,ticket,w.recycle.tipBox,...(w.recycle.itemLabels||[]).flatMap(n=>[n.hidden?null:n,n.ink]),...lane].filter(Boolean))regions=regions.flatMap(a=>{
   if(apart(a,label,0))return[a];const x0=Math.max(a.x,label.x-2),x1=Math.min(a.x+a.w,label.x+label.w+2),y0=Math.max(a.y,label.y-2),y1=Math.min(a.y+a.h,label.y+label.h+2);
   return[{x:a.x,y:a.y,w:a.w,h:y0-a.y},{x:a.x,y:y1,w:a.w,h:a.y+a.h-y1},{x:a.x,y:y0,w:x0-a.x,h:y1-y0},{x:x1,y:y0,w:a.x+a.w-x1,h:y1-y0}].filter(b=>b.w>0&&b.h>0);
  });
  g.save();g.beginPath();for(const a of regions)g.rect(a.x,a.y,a.w,a.h);g.clip();g.globalAlpha=opacity;g.drawImage(tile,A.image.x-width,A.image.y-width,tile.width/ratio,tile.height/ratio);g.restore();
  w.recycle.orderGlow={bin:b.id,opacity,width,regions};
 }
 function endlessOrder(w){
  const r=w.recycle,s=r.endless,doc=window.document;if(!s||!doc?.createElement)return;
  const off=w.reducedMotion||w.effectsOff,laptop=w.view.w>=1024,completed=r.completedOrder,age=completed?w.time-completed.endedAt:Infinity,o=s.order||(age<(off?.6:.95)?completed:null);
  let node=r.orderNode;
  if(!node){
   node=r.orderNode=doc.createElement('aside');node.dataset.test='recycle-order-ticket';node.style.cssText=overlayStyle+'text-align:center;padding:7px 6px 6px;border:2px solid #bb8953;border-radius:2px;box-shadow:2px 3px 0 #4a35243c;';
   const pin=doc.createElement('i'),label=doc.createElement('div'),color=doc.createElement('i'),name=doc.createElement('span'),count=doc.createElement('div'),track=doc.createElement('div'),bar=doc.createElement('div'),badge=doc.createElement('span');
   label.dataset.test='recycle-order-bin';color.dataset.test='recycle-order-color';color.style.cssText='display:block;flex:none;border-radius:50%;';color.setAttribute('aria-hidden','true');name.style.cssText='flex:none;white-space:nowrap;';label.append(color,name);
   pin.style.cssText='position:absolute;top:-5px;left:calc(50% - 4px);width:8px;height:8px;border-radius:50%;background:#b5824e;border:1px solid #795239;';label.style.cssText='color:#795437;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;';count.dataset.test='recycle-order-count';track.style.cssText='margin-top:4px;background:#e6d8bc;overflow:hidden;';bar.dataset.test='recycle-order-bar';bar.style.cssText='height:100%;background:#d99048;transform-origin:left;';track.append(bar);
   badge.dataset.test='recycle-order-done';badge.textContent=R.ENDLESS_TEXT.done;badge.style.cssText='position:absolute;left:12%;right:12%;top:24%;padding:2px 0;background:#fff8dfed;border:2px solid #a95136;color:#a95136;font-size:20px;';node.append(pin,label,count,track,badge);doc.body.append(node);
  }
  node.hidden=!o||w.over||w.modeSession?.state.ended;r.orderSign=null;if(!s.order)r.orderGlow=null;if(!o)return;
  const done=o===completed,bin=r.L.bins.find(b=>b.id===o.bin),A=bin.art,label=node.children[1],color=label.firstChild,name=label.lastChild,height=laptop?78:60;
  name.textContent=w.content.bins.find(b=>b.id===o.bin).name;label.style.fontSize=(laptop?14:11)+'px';color.style.width=color.style.height=(laptop?8:6)+'px';color.style.background=badgeColors[R.BINS.indexOf(o.bin)];
  const width=Math.max(laptop?72:50,Math.ceil(name.getBoundingClientRect().width)+(laptop?8:6)+4+16);node.style.height=height+'px';
  node.children[1].style.fontSize=(laptop?14:11)+'px';node.children[2].style.fontSize=(laptop?26:18)+'px';node.children[2].textContent=`${o.count}/${o.need}`;node.children[3].style.height=(laptop?5:3)+'px';node.children[3].firstChild.style.transform=`scaleX(${done?1:clamp((o.until-w.time)/(o.until-o.at))})`;node.lastChild.hidden=!done;node.lastChild.style.fontSize=(laptop?22:16)+'px';node.dataset.bin=o.bin;node.dataset.complete=String(done);
  const key=[o.bin,o.at,width,w.view.w,w.view.h,r.dayBox?.x,r.dayBox?.y,r.eventBox?.x,r.eventBox?.h,!!r.tipBox].join(':');
  const obstacles=[...playObstacles(w),r.dayBox,r.eventBox].filter(Boolean);
  if(r.orderPlaceKey!==key||!r.orderPlace||!obstacles.every(o=>apart({...r.orderPlace,y:r.orderPlace.y-6,h:r.orderPlace.h+6},o))){
   r.orderPlaceKey=key;const gap=9,side=[{x:A.ink.x-width-gap,y:A.ink.y+24},{x:A.ink.x+A.ink.w+gap,y:A.ink.y+24}],above={x:A.foot.x-width/2,y:A.ink.y-height-gap};
   // Paper and plastic use a side position so the introduction remains clear above them.
   const found=freePlace(w,width,height+6,(bin.key<=2?side:[above,...side]).map(b=>({...b,y:b.y-6})),obstacles,b=>Math.hypot(b.x+width/2-A.foot.x,b.y+height/2-(A.ink.y+A.ink.h/2))+(bin.key<=2&&b.x<A.ink.x+A.ink.w&&b.x+width>A.ink.x?500:0));
   r.orderPlace=found?{...found,y:found.y+6,h:height}:null;
  }
  const b=r.orderPlace;if(!b)return;setBox(node,b);let lift=Math.min(12,b.y-8);for(const a of obstacles)if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y+a.h<=b.y)lift=Math.min(lift,Math.max(0,b.y-6-a.y-a.h-3));
  node.style.opacity=done&&age>.6&&!off?clamp(1-(age-.6)/.35):1;node.style.translate=done&&age>.6&&!off?`0 ${-lift*clamp((age-.6)/.35)}px`:'0 0';
  if(done&&r.stampedOrder!==o){r.stampedOrder=o;stamp(node.lastChild,off);}
  r.orderSign={...rect(node),bin:o.bin,font:laptop?26:18,value:`${o.count}/${o.need}`,done};
 }
 window.GFFamilies.recycle.scene={draw,drawArt,drawNine,keyScale,plate,sharp};
})();
