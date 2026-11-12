(function(){
 'use strict';
 const family=window.GFFamilies.recycle;
 // 분리배출 공장 도감(설계서 7절, 결정 대장 「2026-10-25 저녁, 분리배출 공장 3차 도감 꼴」).
 // 쇠 테 펼친 책 위에 통 여덟 쪽표. 왼쪽 쪽은 그 통 물건 스티커 칸(아직 못 맞힌 물건은 그림자),
 // 오른쪽 쪽은 고른 물건 하나: 이름 · 큰 그림 · 맞는 통 · 손질 차례 · 도움말 · 「다시 태어나요」(근거 있는 짝만).
 // 좁거나 낮은 화면은 한 번에 한 쪽(칸 쪽 ↔ 자세히 쪽)이다. 판 그림은 배율 u, 물건 · 통 · 쪽표는 u의 정수 배로 그린다.
 const SLOT={backdrop:'v3-card-plate',book:'v3-dex-book',page:'v3-dex-page',tabs:'v3-dex-tabs',cell:'v3-dex-cell',close:'v3-dex-close',plate:'v3-dex-plate',panel:'v3-dex-panel',reborn:'v3-reborn',items:'v3-items',itemsHd:'v3-items-hd',bins:'v3-bins',arrows:'v3-arrows',small:'v3-button-small'};
 // 그림이 아직 없을 때 자리만 잡는 크기(점). 그림이 있으면 그림 크기를 쓴다.
 const SIZE={book:[1280,840],page:[680,840],tabs:[80,76],cell:[80,80],close:[64,64],plate:[360,56],panel:[360,160],items:[64,64],bins:[96,120],arrows:[40,40],reborn:[64,64],small:[192,64]};
 // 9칸 모서리(점, [왼, 위, 오른, 아래]). 책은 접힌 곳(가운데)에서 반으로 갈라 쪽마다 늘린다. 값은 그림 목록(art-src/recycle-factory/v3/dex/manifest.json) 그대로다.
 const NINE={left:[112,112,96,128],right:[96,112,112,128],page:[88,176,88,176],plate:[24,14,24,14],panel:[16,16,16,16],small:[24,22,24,22]};
 // 쪽 안 칸 · 글 자리(점): 그림 목록의 종이 안쪽(contentRect)
 const PAD={left:[88,88,60,108],right:[60,88,88,108],page:[92,100,92,116]};
 const HIDE=12,SHADOW='#6f665a'; // 쪽표 아래쪽이 책 속으로 숨는 점, 그림자 색. 쪽표 그림의 마지막 장이 고른 쪽 금빛 테다.
 // 이름 쪽표(10-26 대표 「도감엔 … 카테고리에 글자가 없나?」): 쪽표 그림에서 통 그림은 0~65점 안이고 67~73점은 판 색만 있다.
 // 그 띠를 이름 폭만큼 늘리고 오른쪽 테 7점을 붙인다. 이름이 두 줄 안에 들면 달고, 안 들면(폰 세로) 통 그림 쪽표만 둔다.
 const TAB={cut:67,rim:7,pad:8},TAB_NINE=[67,0,7,0];
 const glyphs=s=>[...s].reduce((n,ch)=>n+(ch===' '?.35:1),0); // 이름 폭(글자 크기 배). 한글 한 자는 1, 띄어쓰기는 0.35
 const CELL={plain:0,picked:1,fresh:2};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

 function model({content,storage,news=[],bin}){
  const D=family.dex,R=family.rules,P=D.PAIRS||[],have=D.load(storage,content);
  const pages=D.cells(content).map(p=>({...p,name:content.bins.find(b=>b.id===p.bin)?.name||'',got:p.cells.filter(c=>have.has(c.no)).length}));
  const fresh=new Set(news.filter(n=>have.has(n))),total=pages.reduce((n,p)=>n+p.cells.length,0),count=Math.max(1,...pages.map(p=>p.cells.length));
  const tabOf=no=>pages.findIndex(p=>p.cells.some(c=>c.no===no)),first=[...fresh][0];
  let tab=first!==undefined?tabOf(first):pages.findIndex(p=>p.bin===bin);
  if(tab<0)tab=Math.max(0,pages.findIndex(p=>p.got>0));
  const firstOf=p=>(p.cells.find(c=>have.has(c.no))||p.cells[0])?.no,pick=first!==undefined?first:firstOf(pages[tab]);
  // 칸 하나의 자세히 쪽. 아직 못 맞힌 물건은 그림자만 보인다.
  const detail=no=>{
   const i=content.items.find(x=>x.no===no);if(!i)return null;
   if(!have.has(no))return{no,got:false,frame:i.frames[0]};
   const pair=P.find(p=>p.id===i.bin),last=i.frames[Math.min(i.steps.length,i.frames.length-1)];
   return{no,got:true,name:i.name,bin:i.bin,binIndex:R.BINS.indexOf(i.bin),binName:content.bins.find(b=>b.id===i.bin)?.name||'',frame:i.frames[0],last,
    steps:i.steps.map((s,k)=>({name:R.STEP_NAMES[s],frame:i.frames[Math.min(k+1,i.frames.length-1)]})),tip:i.tip,pair:pair?{to:pair.to,frame:pair.frame}:null};
  };
  return{content,pages,have,fresh,total,count,tab,pick,detail,tabOf,firstOf};
 }

 // 화면 화소로 책 · 쪽표 · 닫기 · 칸을 잡는다. two: 두 쪽(왼쪽 칸 · 오른쪽 자세히), one: 한 쪽씩.
 // 누르는 것(쪽표 · 칸 · 닫기)은 44px 아래로 줄지 않게 u의 정수 배를 고른다.
 // avoid: 놀이 쪽(study.html)이 게임 위에 얹은 단추 상자들(지도에서는 ✕ 위 왼쪽 · 소리 위 오른쪽, 끝 화면에서는 숨음). 쪽표 · 닫기가 비켜 간다.
 function layout({W,H,count=13,steps=3,avoid=[],names=[]},A={}){
  const sz=k=>A[k]||SIZE[k],g=clamp(Math.round(Math.min(W,H)*.02),8,20),two=W>=900&&H>=480;
  const u=clamp(Math.min(H/1400,W/(two?2600:1000)),.28,.8);
  const [tw,th]=sz('tabs'),[cw,ch]=sz('close'),edge=(two?NINE.left:NINE.page)[0]*u,times=n=>Math.max(1,Math.ceil(44/(n*u)-1e-9));
  const left=avoid.filter(r=>r.x+r.w/2<W/2),right=avoid.filter(r=>r.x+r.w/2>=W/2);
  const leftEnd=Math.max(0,...left.map(r=>r.x+r.w)),rightStart=Math.min(W,...right.map(r=>r.x)),below=Math.max(0,...avoid.map(r=>r.y+r.h))+Math.round(g/2);
  // 쪽표 줄 자리: 단추 사이(low 거짓) 또는 단추 아래(low). 닫기는 한 줄 쪽표면 오른쪽 단추 왼쪽, 여러 줄이면 그 아래.
  const plan=(low,one,c)=>{const w=cw*u*c,h=ch*u*c,y=low?below:g,near=!low&&right.length>0;
   const at=near&&one?{x:rightStart-g-w,y}:{x:W-g-w,y:near?below:y};
   return{y,from:low?g+edge:Math.max(g+edge,left.length?leftEnd+g:0),end:(near?Math.min(at.x,rightStart):at.x)-g,close:{...at,w,h,t:c}};};
  // 쪽표 수는 통 수(이름 수)다. 이름 쪽표 폭 = 통 그림 · 테 · 여백(점) + 이름 글자 폭
  // shrink: 이름 쪽표가 한 줄에 조금 모자라면 이름 글자를 3px까지 줄여 한 줄에 둔다(4차 통 아홉: 노트북에서 14px 모자라 두 줄로 왼쪽 절반만 찼다).
  let shrink=0;
  const n=names.length||8,tabFont=t=>Math.max(13,clamp(Math.round((th-HIDE)*u*t*.27),13,19)-shrink);
  const width=(i,t,named)=>named?(TAB.cut+TAB.rim+TAB.pad)*u*t+glyphs(names[i])*tabFont(t):tw*u*t;
  const rowsOf=r=>{const per=Math.ceil(n/r);return Array.from({length:Math.ceil(n/per)},(_,k)=>Array.from({length:Math.min(per,n-k*per)},(_,j)=>k*per+j));};
  const fits=(p,rows,t,named)=>rows.every(row=>p.from+row.reduce((w,i)=>w+width(i,t,named),0)+(row.length-1)*Math.round(4*u*t)<=p.end);
  const tryAt=(low,t,c,named,most)=>{for(let r=1;r<=most;r++){const rows=rowsOf(r),p=plan(low,r===1,c);if(fits(p,rows,t,named))return{rows,t,c,named,p};}return null;};
  // 쪽표: 이름 쪽표를 한 줄, 안 되면 고르게 두 줄. 그래도 안 되면 통 그림 쪽표를 한 줄 → 두 줄 → 세 줄.
  // 세 줄도 안 들어가면(320px) 닫기, 그다음 쪽표 배율을 한 단계씩 낮춘다. 단추 사이에서 줄이 모자라면 단추 아래 줄도 재 보고 나은 쪽을 쓴다.
  const t0=times(th-HIDE),c0=times(Math.min(cw,ch));
  const solve=low=>{
   if(names.length){
    for(shrink=0;shrink<=3;shrink++){const one=tryAt(low,t0,c0,true,1);if(one)return{...one,shrink};}
    shrink=0;const two=tryAt(low,t0,c0,true,2);if(two)return{...two,shrink};
   }
   shrink=0;let t=t0,c=c0;for(;;){const q=tryAt(low,t,c,false,3);if(q)return q;if(t<=1)return{rows:rowsOf(3),t,c,named:false,p:plan(low,false,c)};if(c>=t)c--;else t--;}
  };
  const score=q=>[q.named?1:0,q.t,q.c],better=(a,b)=>{const x=score(a),y=score(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
  let best=solve(false);if(avoid.length&&(best.t<t0||best.c<c0||names.length&&!best.named)){const o=solve(true);if(better(o,best))best=o;}
  const {rows,t:tabT,c:closeT,p:spot,named}=best;shrink=best.shrink||0;
  // 여러 줄이면 아랫줄이 윗줄의 숨는 띠를 가린다. 윗줄은 보이는 만큼(seen)만 그려 띠가 줄 사이로 새지 않게 한다.
  const tabH=th*u*tabT,seen=tabH-HIDE*u*tabT,tgap=Math.round(4*u*tabT),band=rows.length*seen,close=spot.close;
  const top=Math.max(spot.y+band,close.y+close.h*.6),book={x:g,y:top,w:W-2*g,h:H-top-g},fold=Math.round(book.w/2);
  const tabs=[];rows.forEach((row,r)=>{let x=spot.from;for(const i of row){const w=width(i,tabT,named);tabs[i]={x,y:top-band+r*seen,w,h:r<rows.length-1?seen:tabH,seen};x+=w+tgap;}});
  const per=rows[0].length;
  const inset=(r,p)=>({x:r.x+p[0]*u,y:r.y+p[1]*u,w:r.w-(p[0]+p[2])*u,h:r.h-(p[1]+p[3])*u});
  const list=inset(two?{x:book.x,y:book.y,w:fold,h:book.h}:book,two?PAD.left:PAD.page),info=inset(two?{x:book.x+fold,y:book.y,w:book.w-fold,h:book.h}:book,two?PAD.right:PAD.page);
  const font=clamp(Math.round(13+8*u),15,21),line=Math.round(font*1.6);
  // 칸: 지금 쪽(칸 count개)이 다 들어가고 물건이 48px 이상인 가장 큰 배수. 쪽마다 따로 재서 칸이 적은 쪽은 크게 채운다
  // (10-26 대표 「여백이 너무 많아」: 가장 많은 쪽에 맞추니 일곱 칸인 종이 쪽은 위 두 줄만 차고 아래가 비었다).
  // 그런 배수가 없으면 첫 줄이 다 보이고 다음 줄이 조금 보이는 배수로 안쪽을 내려 본다(폰 가로).
  const area={w:list.w,h:list.h-2*line},[qw]=sz('cell'),gap=Math.max(4,Math.round(10*u));
  const try_=t=>{const s=qw*u*t,cols=clamp(Math.floor((area.w+gap)/(s+gap)),1,count),rows=Math.ceil(count/cols);return{t,s,cols,rows,gap,full:rows*(s+gap)-gap<=area.h,peek:s*1.3+gap<=area.h};};
  const ts=[4,3,2,1].map(try_).filter(x=>x.s>=44&&x.s<=Math.max(170,qw*u));
  const pick=ts.find(x=>x.full&&60*u*x.t>=48)||ts.find(x=>x.peek)||ts.find(x=>x.full)||ts.at(-1)||try_(1);
  const scroll=!pick.full,shown=scroll?Math.max(1,Math.floor((area.h-.3*pick.s)/(pick.s+gap))):pick.rows;
  const grid={...pick,scroll,w:pick.cols*(pick.s+gap)-gap,h:scroll?Math.min(area.h,shown*(pick.s+gap)+Math.round(.3*pick.s)):pick.rows*(pick.s+gap)-gap};
  // 자세히 쪽: 이름판, 큰 그림(2배 이상), 손질 · 다시 태어나요 줄(1 · 2배)
  const plateT=Math.max(1,Math.ceil(44/(sz('plate')[1]*u)-1e-9)),plateH=sz('plate')[1]*u*plateT;
  const iw=sz('items')[0]*u,backH=two?0:Math.max(44,sz('small')[1]*u);
  // 큰 그림은 쪽 높이의 0.42 · 폭의 0.55 · 300px 안에서 가장 큰 배수(10-26 「여백이 너무 많아」: 0.34 · 220px이면 쪽 아래 4분의 1이 비었다)
  const big=Math.max(2,[7,6,5,4,3,2].find(t=>iw*t<=Math.min((info.h-backH)*.42,info.w*.55,300))||2);
  const row=t=>(steps+1)*iw*t+(steps+1)*sz('arrows')[0]*u+sz('bins')[0]*u+(2*steps+2)*6;
  const small=row(2)<=info.w-24?2:1;
  return{mode:two?'two':'one',u,g,book,fold,tabs,tabT,per,rows:rows.length,named,tabFont:tabFont(tabT),close,list,info,font,line,grid,plateH,big,small,backH};
 }

 const css=`
 .dx3,.dx3 *{box-sizing:border-box}
 .dx3{position:fixed;inset:0;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#607665;color:#4a3524;font:16px/1.3 Jua,sans-serif;overflow:hidden}
 .dx3-backdrop{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
 .dx3::backdrop{background:#132e25f0}dialog.dx3:not([open]){display:none}.dx3 [hidden]{display:none!important}.dx3 canvas{display:block}
 .dx3 .dx3-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);margin:0}
 .dx3 .dx3-book{position:absolute;z-index:1;pointer-events:none}
 .dx3 .dx3-tabs{position:absolute;inset:0;z-index:0;pointer-events:none}
 .dx3 .dx3-tab,.dx3 .dx3-cell,.dx3 .dx3-close,.dx3 .dx3-back{position:absolute;margin:0;padding:0;border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;pointer-events:auto}
 .dx3 .dx3-tab canvas,.dx3 .dx3-cell canvas,.dx3 .dx3-close canvas,.dx3 .dx3-back canvas,.dx3 .dx3-art{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
 .dx3 .dx3-tab-name{position:absolute;top:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;color:#3d2c1f;pointer-events:none}
 .dx3 button:focus-visible{outline:3px solid #ffbd3c;outline-offset:2px}
 .dx3 .dx3-close,.dx3 .dx3-back{z-index:3}
 .dx3 .dx3-back{display:flex;align-items:center;justify-content:center;padding:0 1.1em;color:#263e38;white-space:nowrap}.dx3 .dx3-back span{position:relative}
 .dx3 .dx3-list,.dx3 .dx3-info{position:absolute;z-index:2;display:flex;flex-direction:column;align-items:center}
 .dx3 .dx3-head,.dx3 .dx3-foot{margin:0;flex:none;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
 .dx3 .dx3-foot{margin-top:auto;color:#6b5a45;font-size:.9em}
 .dx3[data-tabs=plain] .dx3-head{font-size:1.25em} /* 쪽표에 이름이 없으면(폰 세로) 쪽 위 통 이름을 크게 */
 .dx3 .dx3-grid{display:grid;flex:none;align-content:start;justify-content:center;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}
 .dx3 .dx3-cell{position:relative}
 .dx3 .dx3-info{gap:.45em;overflow-y:auto;overflow-x:hidden;text-align:center;overscroll-behavior:contain;scrollbar-width:thin}
 .dx3 .dx3-plate{position:relative;flex:none;display:flex;align-items:center;justify-content:center;margin:0;padding:0 1.4em;font-weight:400;white-space:nowrap;min-width:min(100%,14em);max-width:100%}
 .dx3 .dx3-plate>span{position:relative;overflow:hidden;text-overflow:ellipsis}
 .dx3 .dx3-hero{display:flex;flex:none;align-items:flex-end;justify-content:center;gap:1.2em}
 .dx3 .dx3-fig,.dx3 .dx3-step{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;margin:0;min-width:0}
 .dx3 .dx3-fig figcaption{white-space:nowrap}.dx3 .dx3-step figcaption{font-size:.72em;color:#6b5a45;white-space:nowrap}
 .dx3 .dx3-panel{position:relative;flex:none;width:100%;padding:.45em .7em .55em;display:flex;flex-direction:column;align-items:center;gap:.25em}
 .dx3 .dx3-panel>*:not(.dx3-art){position:relative}
 .dx3 .dx3-panel h4{margin:0;font-weight:400;font-size:.88em;color:#8a5a2b}.dx3 .dx3-panel p{margin:0}
 .dx3 .dx3-row{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;max-width:100%}
 .dx3 .dx3-tip{margin:0;max-width:100%;word-break:keep-all}
 `;

 function open(host,o){
  // 같은 출처인 사이트 문서의 맨 위 층에 열어 iframe 바깥 셸 단추도 덮는다.
  try{const owner=host.ownerDocument.defaultView;if(owner.parent!==owner&&owner.parent?.document?.body)host=owner.parent.document.body;}catch{}
  const doc=host.ownerDocument,win=doc.defaultView,S=family.scene,M=model(o);
  if(!doc.getElementById('rc-dex-v3')){const style=doc.createElement('style');style.id='rc-dex-v3';style.textContent=css;doc.head.append(style);}
  const node=(tag,cls,text,parent)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  const slots=o.art?.slots||{},asset=key=>slots[SLOT[key]],bank=new Map();let L=null,disposed=false,repaint=0,tab=M.tab,pick=M.pick,view='list',cells=[],arts=[],pics=[];
  function image(key){
   const a=asset(key);if(!a)return null;const slot=SLOT[key];
   if(!bank.has(slot)){const ready=o.images?.[slot];if(ready?.complete&&ready.naturalWidth)bank.set(slot,ready);else{const img=new win.Image();img.src=new URL(a.file,o.base||win.location?.href).href;img.addEventListener?.('load',()=>{if(!repaint&&!disposed)repaint=win.setTimeout(()=>{repaint=0;paint();},16);},{once:true});bank.set(slot,img);}}
   const img=bank.get(slot);return img.complete&&img.naturalWidth?img:null;
  }
  // 놀이 쪽(study.html)이 게임 위에 얹은 ✕ · 소리 단추. 지도에서 열면 위 두 모서리에 있고, 끝 화면에서는 숨는다.
  const hostButtons=()=>{try{const p=win.parent;if(!p||p===win)return[];const f=win.frameElement?.getBoundingClientRect?.()||{left:0,top:0};
   return[...p.document.querySelectorAll('[data-test=exit-x],[data-test=sound]')].map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({x:r.left-f.left,y:r.top-f.top,w:r.width,h:r.height}));}catch{return[];}};
  const art=(parent,key)=>{const n=node('canvas','dx3-art',undefined,parent);n.setAttribute('aria-hidden','true');parent.prepend(n);arts.push({n,key});return n;};
  // 물건 · 통 · 화살표 · 다시 태어난 물건 한 장. times: 배율 u의 몇 배로 그릴지.
  const pic=(parent,key,frame,times,shadow=false)=>{const n=node('canvas','',undefined,parent);n.setAttribute('aria-hidden','true');pics.push({n,key,frame,times,shadow});return n;};
  const fig=(parent,key,frame,times,caption)=>{const f=node('figure','dx3-fig',undefined,parent);pic(f,key,frame,times);if(caption)node('figcaption','',caption,f);return f;};
  const arrow=(parent,caption)=>{const f=node('figure','dx3-step',undefined,parent);pic(f,'arrows',1,1);if(caption)node('figcaption','',caption,f);return f;};

  const d=node('dialog','dx3',undefined,host);d.dataset.test='dex-dialog';d.setAttribute('aria-labelledby','dx3-title');
  const backdrop=node('canvas','dx3-backdrop',undefined,d);backdrop.setAttribute('aria-hidden','true');
  node('h2','dx3-sr','분리배출 도감',d).id='dx3-title';
  const book=node('canvas','dx3-book',undefined,d);book.setAttribute('aria-hidden','true');
  const strip=node('div','dx3-tabs',undefined,d);strip.setAttribute('role','tablist');strip.setAttribute('aria-label','통 쪽');
  const tabs=M.pages.map((p,i)=>{const b=node('button','dx3-tab',undefined,strip);b.type='button';b.setAttribute('role','tab');b.dataset.test='dex-tab';b.dataset.bin=p.bin;b.setAttribute('aria-controls','dx3-list');
   b.setAttribute('aria-label',`${p.name} ${p.got} / ${p.cells.length}`);node('canvas','',undefined,b).setAttribute('aria-hidden','true');node('span','dx3-tab-name',p.name,b).setAttribute('aria-hidden','true');b.onclick=()=>choose(i,true);return b;});
  const list=node('section','dx3-list',undefined,d);list.id='dx3-list';list.setAttribute('role','tabpanel');
  const head=node('p','dx3-head','',list),grid=node('div','dx3-grid',undefined,list);node('p','dx3-foot',`모은 것 ${M.have.size} / ${M.total}`,list);
  grid.setAttribute('role','group');grid.dataset.test='dex-grid';
  const info=node('section','dx3-info',undefined,d);info.dataset.test='dex-detail';info.setAttribute('aria-live','polite');
  const back=node('button','dx3-back',undefined,d);back.type='button';back.dataset.test='dex-back';node('canvas','',undefined,back).setAttribute('aria-hidden','true');node('span','','목록',back);
  back.onclick=()=>{view='list';place();paint();cells.find(k=>k.c.no===pick)?.b.focus();};
  const shut=node('button','dx3-close',undefined,d);shut.type='button';shut.dataset.test='dex-close';shut.setAttribute('aria-label','도감 닫기');node('canvas','',undefined,shut).setAttribute('aria-hidden','true');
  shut.onclick=()=>d.close();
  const esc=e=>{if(e.key==='Escape'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();d.close();}};
  win.addEventListener('keydown',esc,true);

  function fillGrid(){
   const p=M.pages[tab];pics=pics.filter(x=>!grid.contains(x.n));grid.replaceChildren();
   head.textContent=`${p.name} ${p.got} / ${p.cells.length}`;
   cells=p.cells.map(c=>{const got=M.have.has(c.no),b=node('button','dx3-cell',undefined,grid);b.type='button';b.dataset.test='dex-cell';b.dataset.no=String(c.no);b.dataset.have=String(got);
    if(M.fresh.has(c.no))b.dataset.fresh='true';b.setAttribute('aria-label',got?(M.fresh.has(c.no)?`${c.name}, 새로 모음`:c.name):'아직 못 모은 물건');b.setAttribute('aria-pressed',String(c.no===pick));
    node('canvas','',undefined,b).setAttribute('aria-hidden','true');b.onclick=()=>select(c.no,true);return{b,c,got};});
  }
  function fillInfo(){
   for(const x of [...pics,...arts].filter(x=>info.contains(x.n))){const list=pics.includes(x)?pics:arts;list.splice(list.indexOf(x),1);}
   info.replaceChildren();const x=M.detail(pick);if(!x||!L)return;
   const plate=node('h3','dx3-plate',undefined,info);art(plate,'plate');node('span','',x.got?x.name:'아직 못 모았어요',plate);
   const hero=node('div','dx3-hero',undefined,info);pic(hero,'items',x.frame,L.big,!x.got);
   if(!x.got){node('p','dx3-tip','맞는 통에 넣으면 그림이 열려요.',info);return;}
   fig(hero,'bins',x.binIndex*4,1,`${x.binName} 통`);
   if(x.steps.length){const box=node('div','dx3-panel',undefined,info);box.dataset.test='dex-steps';art(box,'panel');node('h4','','이렇게 손질해요',box);const row=node('div','dx3-row',undefined,box);
    fig(row,'items',x.frame,L.small);for(const s of x.steps){arrow(row,s.name);fig(row,'items',s.frame,L.small);}arrow(row);fig(row,'bins',x.binIndex*4,1);}
   if(x.tip)node('p','dx3-tip',x.tip,info);
   if(x.pair){const box=node('div','dx3-panel',undefined,info);box.dataset.test='dex-reborn';art(box,'panel');node('h4','','다시 태어나요',box);const row=node('div','dx3-row',undefined,box);
    fig(row,'items',x.last,L.small);arrow(row);fig(row,'reborn',x.pair.frame,L.small);node('p','',x.pair.to,box);}
  }
  function select(no,clicked){
   pick=no;for(const k of cells)k.b.setAttribute('aria-pressed',String(k.c.no===no));
   if(L.mode==='one'&&clicked)view='detail';fillInfo();place();paint();if(L.mode==='one'&&clicked)back.focus();
  }
  function choose(i,focus){
   if(i===tab){if(view==='detail'&&L.mode==='one'){view='list';place();paint();}return;}
   tab=i;if(!M.pages[i].cells.some(c=>c.no===pick))pick=M.firstOf(M.pages[i]);view='list';fillGrid();fillInfo();place();paint();if(focus)tabs[i].focus();
  }
  strip.addEventListener('keydown',e=>{const n=tabs.length,step={ArrowRight:1,ArrowLeft:-1,Home:-tab,End:n-1-tab}[e.key];if(step===undefined)return;e.preventDefault();choose((tab+step+n)%n,true);});
  grid.addEventListener('keydown',e=>{const i=cells.findIndex(k=>k.b===doc.activeElement);if(i<0||!L)return;const step={ArrowRight:1,ArrowLeft:-1,ArrowDown:L.grid.cols,ArrowUp:-L.grid.cols}[e.key];if(!step)return;e.preventDefault();cells[clamp(i+step,0,cells.length-1)].b.focus();});

  const px=v=>`${Math.round(v*100)/100}px`,set=(n,s)=>{for(const[k,v]of Object.entries(s))n.style[k]=typeof v==='number'?px(v):v;};
  function place(){
   const W=win.innerWidth,H=win.innerHeight,A=Object.fromEntries(Object.keys(SIZE).map(k=>[k,asset(k)?[asset(k).w,asset(k).h]:SIZE[k]]));
   const steps=Math.max(1,...o.content.items.map(i=>i.steps.length));
   const before=L?.mode;L=layout({W,H,count:M.pages[tab]?.cells.length||M.count,steps,avoid:[],names:M.pages.map(p=>p.name)},A);if(before&&before!==L.mode)view='list';
   d.dataset.mode=L.mode;d.dataset.view=L.mode==='one'?view:'both';d.dataset.tabs=L.named?'named':'plain';
   set(book,{left:L.book.x,top:L.book.y,width:L.book.w,height:L.book.h});
   tabs.forEach((b,i)=>{const r=L.tabs[i];set(b,{left:r.x,top:r.y,width:r.w,height:r.h});b.setAttribute('aria-selected',String(i===tab));b.tabIndex=i===tab?0:-1;
    // 이름: 통 그림 오른쪽 띠의 보이는 높이(seen) 가운데
    const name=b.querySelector('.dx3-tab-name'),s=L.u*L.tabT,x0=(TAB.cut-4)*s;name.hidden=!L.named;if(L.named)set(name,{left:x0,width:r.w-x0-(TAB.rim+2)*s,height:r.seen,fontSize:`${L.tabFont}px`});});
   set(shut,{left:L.close.x,top:L.close.y,width:L.close.w,height:L.close.h});
   list.hidden=L.mode==='one'&&view!=='list';info.hidden=L.mode==='one'&&view!=='detail';back.hidden=L.mode==='two'||view!=='detail';
   set(list,{left:L.list.x,top:L.list.y,width:L.list.w,height:L.list.h,fontSize:`${L.font}px`});
   set(head,{height:L.line,lineHeight:`${L.line}px`});set(grid,{width:L.grid.w,height:L.grid.h,gridTemplateColumns:`repeat(${L.grid.cols},${px(L.grid.s)})`,gridAutoRows:px(L.grid.s),gap:px(L.grid.gap),overflowY:L.grid.scroll?'auto':'hidden'});
   grid.dataset.scroll=String(L.grid.scroll);
   const top=L.mode==='one'?L.backH+8:0;
   set(info,{left:L.info.x,top:L.info.y+top,width:L.info.w,height:L.info.h-top,fontSize:`${L.font}px`});
   if(L.mode==='one')set(back,{left:L.info.x,top:L.info.y,height:L.backH,fontSize:`${L.font}px`});
   const plate=info.querySelector('.dx3-plate');if(plate)set(plate,{height:L.plateH,fontSize:`${clamp(Math.round(L.plateH*.44),16,30)}px`});
   for(const p of pics){const a=asset(p.key),[w,h]=a?[a.w,a.h]:SIZE[p.key]||[64,64],s=L.u*p.times;set(p.n,{width:w*s,height:h*s});}
  }
  const canvasFor=(n,w,h,ratio)=>{n.width=Math.max(1,Math.round(w*ratio));n.height=Math.max(1,Math.round(h*ratio));const g=n.getContext('2d');g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,w,h);return g;};
  // 물건 하나를 그린다. shadow면 따로 그린 뒤 한 색으로 칠해 얹는다(칸 판까지 칠하지 않게).
  function sprite(g,key,frame,x,y,scale,ratio,shadow){
   const a=asset(key),img=image(key);if(!a||!img)return;
   const q=key==='items'?S.sharp(img,a,image('itemsHd'),asset('itemsHd'),scale,ratio):{img,a,scale};
   if(!shadow){S.drawArt(g,q.img,q.a,frame,x,y,q.scale,ratio);return;}
   const t=doc.createElement('canvas'),tg=canvasFor(t,a.w*scale,a.h*scale,ratio);S.drawArt(tg,q.img,q.a,frame,0,0,q.scale,ratio);
   tg.save();tg.globalCompositeOperation='source-in';tg.fillStyle=SHADOW;tg.fillRect(0,0,a.w*scale,a.h*scale);tg.restore();g.drawImage(t,0,0,t.width,t.height,x,y,a.w*scale,a.h*scale);
  }
  function paint(){
   if(disposed||!L)return;const ratio=win.devicePixelRatio||1,u=L.u;
   {const a=asset('backdrop'),img=image('backdrop'),g=canvasFor(backdrop,win.innerWidth,win.innerHeight,ratio);if(a&&img)S.drawNine(g,img,a,0,[80,80,80,80],0,0,win.innerWidth,win.innerHeight,u,ratio);}
   {const g=canvasFor(book,L.book.w,L.book.h,ratio);
    if(L.mode==='two'){const a=asset('book'),img=image('book');if(a&&img){const f=Math.round(a.w/2);S.drawNine(g,img,a,0,NINE.left,0,0,L.fold,L.book.h,u,ratio,[0,0,f,a.h]);S.drawNine(g,img,a,0,NINE.right,L.fold,0,L.book.w-L.fold,L.book.h,u,ratio,[f,0,a.w-f,a.h]);}}
    else{const a=asset('page'),img=image('page');if(a&&img)S.drawNine(g,img,a,0,NINE.page,0,0,L.book.w,L.book.h,u,ratio);}}
   tabs.forEach((b,i)=>{const r=L.tabs[i],a=asset('tabs'),img=image('tabs'),g=canvasFor(b.children[0],r.w,r.h,ratio);if(!a||!img)return;const s=u*L.tabT,ring=a.frames-1;
    // 이름 쪽표는 판 띠를 늘려 그린다(윗줄은 보이는 높이만 캔버스라 아래 숨는 띠가 잘린다)
    if(L.named){S.drawNine(g,img,a,i,TAB_NINE,0,0,r.w,a.h*s,s,ratio);if(i===tab)S.drawNine(g,img,a,ring,TAB_NINE,0,0,r.w,a.h*s,s,ratio);}
    else{S.drawArt(g,img,a,i,0,0,s,ratio);if(i===tab)S.drawArt(g,img,a,ring,0,0,s,ratio);}});
   {const a=asset('close'),img=image('close'),g=canvasFor(shut.children[0],L.close.w,L.close.h,ratio);if(a&&img)S.drawArt(g,img,a,shut.dataset.pressed==='true'?1:0,0,0,u*L.close.t,ratio);}
   if(!back.hidden){const r=back.getBoundingClientRect?.(),a=asset('small'),img=image('small');if(r?.width&&a&&img)S.drawNine(canvasFor(back.children[0],r.width,r.height,ratio),img,a,0,NINE.small,0,0,r.width,r.height,u,ratio);}
   const cellA=asset('cell'),cellI=image('cell'),ia=asset('items');
   for(const k of cells){
    const s=L.grid.s,g=canvasFor(k.b.children[0],s,s,ratio),scale=u*L.grid.t;
    if(cellA&&cellI)S.drawArt(g,cellI,cellA,k.c.no===pick?CELL.picked:M.fresh.has(k.c.no)?CELL.fresh:CELL.plain,0,0,scale,ratio);
    const [iw,ih]=ia?[ia.w,ia.h]:SIZE.items;sprite(g,'items',k.c.frame,(s-iw*scale)/2,(s-ih*scale)/2,scale,ratio,!k.got);
   }
   for(const p of arts){const r=p.n.getBoundingClientRect?.()||{width:0,height:0},a=asset(p.key),img=image(p.key);if(!r.width||!r.height||!a||!img)continue;S.drawNine(canvasFor(p.n,r.width,r.height,ratio),img,a,0,NINE[p.key],0,0,r.width,r.height,u,ratio);}
   for(const p of pics){const a=asset(p.key);if(!a)continue;const s=u*p.times,g=canvasFor(p.n,a.w*s,a.h*s,ratio);sprite(g,p.key,p.frame,0,0,s,ratio,p.shadow);}
  }
  shut.addEventListener('pointerdown',()=>{shut.dataset.pressed='true';paint();});for(const type of ['pointerup','pointerleave','pointercancel'])shut.addEventListener(type,()=>{if(shut.dataset.pressed){delete shut.dataset.pressed;paint();}});
  const resize=win.ResizeObserver?new win.ResizeObserver(()=>{place();paint();}):null;resize?.observe(d);
  d.addEventListener('close',()=>{if(disposed)return;disposed=true;resize?.disconnect();win.removeEventListener('keydown',esc,true);if(repaint)win.clearTimeout(repaint);d.remove();o.onClose?.();});
  fillGrid();place();fillInfo();place();d.showModal?.();paint();doc.fonts?.ready?.then?.(()=>{if(!disposed)paint();});
  (cells.find(k=>k.c.no===pick)||cells[0])?.b.focus?.();
  return{close:()=>d.close(),dialog:d,model:M,layout:()=>L,select:no=>{const i=M.tabOf(no);if(i>=0&&i!==tab)choose(i,false);select(no,true);},choose:i=>choose(i,false),get view(){return L?.mode==='one'?view:'both';},get pick(){return pick;},get tab(){return tab;}};
 }

 // 단계 지도 위 막대의 도감 단추(셸 고리 cfg.mapExtras). 모은 수를 같이 보이고, 좁은 폰에서는 「도감」만 보인다.
 // 위 막대의 단추는 공용 규칙이 폭 44px로 묶어서 이 단추만 풀어 준다.
 const mapCss=`.gf-map-top .rc-dex-open{display:flex;align-items:center;gap:6px;width:auto;min-width:44px;min-height:44px;padding:6px 12px;font-size:max(19px,2.8vh);line-height:1.2;cursor:pointer;flex:none;box-shadow:0 4px 0 #3c5348}.gf-map-top .rc-dex-open:active{translate:0 3px;box-shadow:0 1px 0 #3c5348}.rc-dex-book-icon{width:24px;height:24px;flex:none}
 @media(max-width:480px){.gf-map-top .rc-dex-open .rc-dex-count{display:none}}
 @media(max-width:380px){.gf-map-top .rc-dex-open{padding:6px 8px;font-size:17px}}
 @media(max-width:359px){.gf-map-top .rc-dex-open{width:44px;padding:0;justify-content:center}.gf-map-top .rc-dex-open>span{display:none}}
 .gf-map-top.rc-fit .rc-dex-open .rc-dex-count{display:none}.gf-map-top.rc-fit2 .rc-dex-open{width:44px;padding:0;justify-content:center}.gf-map-top.rc-fit2 .rc-dex-open>span{display:none}.gf-map-top.rc-fit3 .gf-map-total{font-size:15px;padding-left:5px;padding-right:5px}`;
 // 글자 크기가 화면 높이(2.8vh)를 따라 커져서, 폭 나눔만으로는 키 큰 폰(360~412 폭)에서 위 막대가 넘쳐 단추 끝이 셸 소리 단추 밑에 깔렸다(10-26).
 // 막대가 넘치면 먼저 모은 수를, 그래도 넘치면 「도감」 글자를 뺀다(책 그림 단추만 남는다).
 function fitBar(bar){
  const over=()=>bar.scrollWidth>bar.clientWidth+1;
  bar.classList.remove('rc-fit','rc-fit2','rc-fit3');for(const c of ['rc-fit','rc-fit2','rc-fit3'])if(over())bar.classList.add(c);
 }
 function mapButton(slot,ctx){
  const D=family.dex,content=ctx.data?.content,doc=slot.ownerDocument;if(!D||!content)return;
  if(!doc.getElementById('rc-dex-map')){const style=doc.createElement('style');style.id='rc-dex-map';style.textContent=mapCss;doc.head.append(style);}
  const have=D.load(D.storage,content).size,total=new Set(content.items.map(i=>i.no)).size;
  const b=doc.createElement('button');b.type='button';b.className='gf-button gf-map-pill rc-dex-open';b.dataset.test='map-dex';b.setAttribute('aria-label',`도감 열기, 모은 것 ${have} / ${total}`);
  const icon=doc.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.classList.add('rc-dex-book-icon');const ink=doc.createElementNS('http://www.w3.org/2000/svg','path');ink.setAttribute('d','M2 4h7l3 2 3-2h7v16h-7l-3 2-3-2H2z M12 6v16 M5 8h4 M5 12h4 M15 8h4 M15 12h4');ink.setAttribute('fill','#fff4dc');ink.setAttribute('stroke','#3c5348');ink.setAttribute('stroke-width','2');icon.append(ink);b.append(icon);
  const name=doc.createElement('span');name.textContent='도감';const count=doc.createElement('span');count.className='rc-dex-count';count.textContent=` ${have} / ${total}`;b.append(name,count);
  b.onclick=()=>open(ctx.screen||slot.ownerDocument.body,{content,storage:D.storage,art:ctx.data.art,images:ctx.images,base:ctx.base,onClose:()=>b.focus()});
  slot.append(b);
  const bar=slot.closest('.gf-map-top'),Watch=doc.defaultView?.ResizeObserver;
  if(bar){fitBar(bar);if(Watch)new Watch(()=>fitBar(bar)).observe(bar);doc.fonts?.ready?.then(()=>{if(bar.isConnected)fitBar(bar);});}
  return b;
 }
 family.dexView={open,layout,model,mapButton,SLOT,NINE};
})();
