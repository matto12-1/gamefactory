(function(){
 'use strict';
 const family=window.GFFamilies.recycle;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const clock=sec=>`${Math.floor(sec/60)}분 ${Math.floor(sec%60)}초`;
 // 움직임 차례(초, 설계서 6.2): 문 열기 → 통 비우고 칸 채우기 → 별 → 점수 · 도장 → 카드
 const END=3.6,DOOR=.3,LOAD=[.6,1.6],STARS=1.6,SCORE=[2.4,3],BEST=2.9,CARDS=3;
 // 넣은 수 → 더미 단계. 0이면 닫힌 칸이다.
 const pileStage=n=>n<=0?0:n<=2?1:n<=5?2:n<=9?3:4;
 const SLOT={wide:'v3-end-stage-wide',tall:'v3-end-stage-tall',pile:'v3-end-pile',sack:'v3-end-sack',lid:'v3-end-lid',door:'v3-end-door',worker:'v3-end-worker',star:'v3-end-star',stamp:'v3-end-stamp',sign:'v3-end-sign',survive:'v3-end-survive',cards:'v3-end-cards',console:'v3-end-console',plate:'v3-card-plate',cream:'v3-card-cream',big:'v3-button-big',small:'v3-button-small',items:'v3-items',itemsHd:'v3-items-hd',bins:'v3-bins',station:'v3-station',marks:'v3-marks',arrows:'v3-arrows'};
 // 아홉 칸 모서리와 잘라 쓸 곳(점). 그림 넘김 기록(art-src/recycle-factory/v3/later/manifest.json) 그대로다.
 const NINE={cards:[30,30,30,30],ribbon:[20,16,20,16],title:[32,24,32,24],survive:[28,24,28,24],console:[36,36,36,36],plate:[80,80,80,80],cream:[24,24,24,24],big:[28,28,28,28],small:[24,22,24,22]};
 const CROP={ribbon:[72,88,240,48],topper:[146,10,220,124],title:[0,24,512,96]};
 // 기준점(점): 더미는 칸 가운데에서 칸 아래 6점 위, 뚜껑은 칸 가운데 아래, 일꾼은 발.
 const ANCHOR={pile:[80,144],sack:[80,150],lid:[80,128],worker:[48,152]};
 // 트럭 장면 칸(점): 간판 꼭대기(scene 위)부터 트럭 바퀴 아래까지.
 // 아직 싣지 않은 그림 칸의 크기(점). 캔버스가 기본 300×150으로 남지 않게 자리만 잡는다.
 const SPARE={items:{w:64,h:64},bins:{w:96,h:120}};
 const truckArea=s=>({x:s.scene[0],y:s.scene[1],w:s.scene[2],h:s.box[1]+s.box[3]+20-s.scene[1]});
 // 화면 화소로 카드 · 조종판 칸을 먼저 잡고, 남은 곳에 트럭 장면을 무대 배율 u(점 → CSS px)로 맞춘다.
 // row: 트럭 위 · 카드 셋 한 줄 · 조종판(콘셉트 a-wide), column: 폰 세로(카드를 위아래로), side: 아주 넓거나 낮은 화면(트럭 왼쪽, 카드 판 오른쪽).
 function layout({W,H},E){
  const g=clamp(Math.round(Math.min(W,H)*.02),8,20),stage=W/H<.9?'tall':'wide',T=truckArea(E[stage]);
  const mode=W<H?(W>=700?'row':'column'):H<=500?'side':'row';
  const block=u=>T.h*u;
  function place(box,area){
   const u=Math.min(box.w/T.w,box.h/T.h),tw=T.w*u,th=T.h*u;
   return{u,trucks:[{x:box.x+(box.w-tw)/2,y:box.y+(box.h-th)/2,w:tw,h:th,clip:{...area}}]};
  }
  const full={x:0,y:0,w:W,h:H};
  if(W>H&&H>500){
   // 처음 통 칸 왼쪽(1037점)에서 운전석 안쪽(1937점)까지 900점은 몸통+머리 안에 있다.
   // 빈 바닥과 발판을 포함한 scene 폭으로 트럭 크기를 세지 않는다.
   const consoleH=clamp(Math.round(H*.085),64,96),u=Math.min(W*.55/900,(H-consoleH-3*g-60)/580),cardH=Math.max(clamp(Math.round(H*.29),180,300),Math.ceil(214*u+60)),cy=H-consoleH-cardH-3*g,tw=T.w*u,th=T.h*u,ty=cy-621*u;
   const header={x:cy-300*u<g+274*u?g+268*u:(W-tw)/2+(E.wide.sign[0]-T.x)*u,signY:g+146*u,starsY:g+238*u};
   return{mode,stage,g,u,T,header,trucks:[{x:(W-tw)/2,y:ty,w:tw,h:th,clip:full}],plate:null,cards:[0,1,2].map(i=>({x:g+i*(W-g)/3,y:cy,w:(W-4*g)/3,h:cardH})),console:{x:(W-Math.min(W-2*g,960))/2,y:H-consoleH-g,w:Math.min(W-2*g,960),h:consoleH}};
  }
  if(mode==='side'){
   const colW=clamp(Math.round(W*.36),240,520),leftW=W-colW-3*g,plate={x:W-colW-2*g,y:-2,w:colW+2*g+2,h:H+4},area={x:0,y:0,w:plate.x,h:H};
   let consoleH=clamp(Math.round(H*.15),48,90),{u}=place({x:g,y:g,w:leftW,h:H-consoleH-3*g},area);
   consoleH=Math.max(consoleH,Math.round(44+2*Math.min(36*u,14)));({u}=place({x:g,y:g,w:leftW,h:H-consoleH-3*g},area));
   const top=Math.max(g,(H-block(u)-g-consoleH)/2),{trucks}=place({x:g,y:top,w:leftW,h:block(u)},area),cardH=(H-4*g)/3,kw=Math.min(leftW,760);
   return{mode,stage,g,u,T,trucks,plate,cards:[0,1,2].map(i=>({x:W-colW-g,y:g+i*(cardH+g),w:colW,h:cardH})),console:{x:g+(leftW-kw)/2,y:top+block(u)+g,w:kw,h:consoleH}};
  }
  const column=mode==='column',consoleH=clamp(Math.round(H*(column?.08:.085)),52,column?80:96);
  let cardH=column?clamp(Math.round(H*.14),92,180):clamp(Math.round(H*.28),140,300);
  const cardsH=()=>column?3*cardH+2*g:cardH;
  let {u}=place({x:g,y:g,w:W-2*g,h:H-cardsH()-consoleH-4*g},full),spare=H-block(u)-cardsH()-consoleH-4*g;
  // 트럭이 폭에 걸려 남는 높이는 카드에 먼저 준다(카드 글과 그림이 커진다).
  if(spare>0){const grow=Math.min(column?spare/3:spare,(column?220:300)-cardH);if(grow>0){cardH+=grow;spare-=column?3*grow:grow;}}
  const top=column?g:g+Math.max(0,spare)/2,cy=top+block(u)+g,area=full,{trucks}=place({x:g,y:top,w:W-2*g,h:block(u)},area);
  const cw=column?W-2*g:Math.min(W-2*g,1560),cx=(W-cw)/2;
  const cards=[0,1,2].map(i=>column?{x:g,y:cy+i*(cardH+g),w:cw,h:cardH}:{x:cx+i*(cw+g)/3,y:cy,w:(cw-2*g)/3,h:cardH});
  const kw=column?W-2*g:clamp(W*.62,300,960);
  return{mode,stage,g,u,T,trucks,plate:null,cards,console:{x:(W-kw)/2,y:cy+cardsH()+g,w:kw,h:consoleH}};
 }
 // 끝 화면에 보일 것을 셸 자료(endContext)에서 고른다. 그리기와 상관없는 순수한 값이라 시험이 그대로 본다.
 function model(c){
  const R=family.rules,D=family.dex,m=c.mode||{},stage=m.play==='stage',endless=m.play==='endless',passed=!stage||!!m.passed;
  const sides=[{score:c.score,stats:c.stats,resources:c.resources}],first=sides[0].resources||[],content=first.content,modeKit=first.modeKit;
  const trucks=sides.map(s=>({score:s.score||0,stats:s.stats||{},cells:(s.resources||[]).map(r=>({id:r.id,name:r.name,index:r.index,count:r.count,pile:pileStage(r.count)})),
   mood:passed?'happy':'sad'}));
  const item=id=>content?.items.find(i=>i.id===id);
  const uniq=list=>{const seen=new Set();return list.filter(p=>p.item&&!seen.has(p.item.id)&&seen.add(p.item.id));};
  // ① 오늘 배운 것: 시작 카드 ① · ② 장의 요점 물건과 같은 글. 무한 모드는 이번 판에 맞게 넣은 물건.
  const learn={title:'오늘 배운 것',pics:[],lines:[]};
  if(endless)learn.endless=first.endless||{days:[],ordersFilled:0};
  if(stage&&content&&modeKit){
   for(const p of R.lessonPages(content,{modeKit},m.stage).filter(p=>p.kind!=='ready').slice(0,2)){
    learn.pics.push(...(p.kind==='bin'?p.items:p.kind==='prep'?p.items.map(x=>({item:x.item,frame:x.frames.at(-1)})):p.kind==='tricky'?(p.right.length?p.right:p.wrong):p.bins));
    learn.lines.push(p.text);
   }
  }else{
   learn.title='오늘 넣은 물건';
   const put=new Map();for(const s of sides)for(const r of s.resources||[])for(const p of r.items||[])if(p.slot==='items')put.set(p.id,{...p,count:(put.get(p.id)?.count||0)+p.count});
   learn.pics=[...put.values()].sort((a,b)=>b.count-a.count).map(p=>({item:item(p.id)||{id:p.id,name:p.name},frame:p.frame}));
   learn.lines.push(`맞게 넣은 물건 ${sides.reduce((n,s)=>n+(s.stats?.right||0),0)}개`);
  }
  learn.pics=uniq(learn.pics);
  // ② 다시 볼 물건: 이번 판에 틀리거나 놓친 물건
  const review={title:'다시 볼 물건',list:uniq(sides.flatMap(s=>s.resources?.mistakes||[])).map(x=>({item:x.item,kind:x.kind,chosen:x.chosen,bin:x.item.bin,prep:!!x.item.steps?.length}))};
  // ③ 도감: 이번 판에 처음 맞게 넣은 물건. 없으면 이번 단계 종류 쪽의 남은 칸.
  const have=D&&content?D.load(D.storage,content):new Set(),total=content?new Set(content.items.map(i=>i.no)).size:0;
  const news=[...new Set(sides.flatMap(s=>s.resources?.firstRight||[]))].map(no=>content?.items.find(i=>i.no===no)).filter(Boolean).map(i=>({item:i,frame:i.frames[0]}));
  const counts=new Map();for(const t of trucks)for(const cell of t.cells)counts.set(cell.id,(counts.get(cell.id)||0)+cell.count);
  const focus=(stage&&modeKit?R.focusOf(R.stageOf({modeKit},m.stage))[0]:null)||[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||R.BINS[0];
  const page=D&&content?D.cells(content).find(p=>p.bin===focus):null,left=page?page.cells.filter(cell=>!have.has(cell.no)):[];
  const dex={title:'도감',news,have:have.size,total,bin:focus,binName:content?.bins.find(b=>b.id===focus)?.name||'',left:left.map(cell=>({item:item(cell.ids[0])||{id:cell.ids[0],name:cell.name},frame:cell.frame}))};
  const title=stage?`${m.stage}단계 · ${m.title} ${passed?'깸!':'다시 도전!'}`:endless?'오늘도 자원을 살렸어요!':'오늘의 분리배출을 마쳤어요!';
  const A=c.actions||{},unlocked=!!c.notices?.endlessUnlocked&&!!A.endless;
  const primary=unlocked?{label:'무한 모드 하기',test:'play-endless',act:A.endless}:{label:c.plan?.label||(endless?'다시':'다시 도전'),test:'end-next',act:A.next};
  const small=[];
  if(stage&&passed&&A.replay)small.push({label:'다시',test:'end-replay',act:A.replay});
  if(A.map)small.push({label:'지도',test:'end-map',act:A.map});
  // 「결과 보기」: 단계 판은 뺀다(도장은 이 화면에 보이고 셸이 다음 · 다시 · 지도에서 기록한다). 순위가 있는 무한 모드만 「순위 보기」로 남긴다.
  if(endless&&A.result)small.push({label:'순위 보기',test:'to-result',act:A.result});
  if(c.rank)small.push({label:'내 순위',test:'result-rank-open',rank:true});
  if(A.exit)small.push({label:'다른 활동',test:'other-game',act:A.exit});
  const notices=[...(c.notices?.stamps?.length?[`새 도장: ${c.notices.stamps.map(s=>s.name).join(', ')}`]:[]),...(unlocked?['무한 모드가 열렸어요!']:[])];
  return{stage,endless,passed,trucks,stars:endless?null:passed?m.stars||0:0,best:!!c.isBest,previousBest:c.previousBest||0,elapsed:c.stats?.elapsed||0,
   learn,review,dex,title,primary,small,notices,content,practice:!!c.review?.length&&!!A.practice};
 }
 const css=`
 .rc3,.rc3 *{box-sizing:border-box}
 .rc3{display:block!important;position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#cfc8aa;color:#263e38;font:16px/1.25 Jua,DoHyeon,sans-serif;overflow:hidden!important;isolation:isolate;text-align:center}
 .rc3:modal::backdrop{background:#263e38}dialog.rc3:not([open]),.rc3[hidden]{display:none!important}.rc3 [hidden]{display:none!important}.rc3 canvas{display:block}
 .rc3-bg,.rc3-fg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}.rc3-fg{z-index:1}
 .rc3-art{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
 .rc3-truck{position:absolute;z-index:2;pointer-events:none}
 .rc3-truck>*{position:absolute}
 .rc3-sign{margin:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;transform:translate(-50%,-50%);color:#263e38;font-weight:400;line-height:1}
 .rc3-sign>span,.rc3-survive>span,.rc3-stamp>span,.rc3-ribbon>span,.rc3-card button>span,.rc3-console button>span,.rc3-sheet-actions button>span{position:relative;z-index:1}
 .rc3-topper{position:absolute;left:50%;transform:translateX(-50%)}
 .rc3-stars{display:flex;transform:translate(-50%,-50%)}.rc3-star{display:block}
 .rc3-survive{display:flex;align-items:center;justify-content:center;white-space:nowrap;transform:translate(-50%,-50%)}
 .rc3-stamp{display:flex;align-items:center;justify-content:center;flex-direction:column;transform:translate(-50%,-50%) rotate(-6deg);color:#a3352b;line-height:1.05}
 .rc3-stamp[data-best=false]{color:#5b5143}
 .rc3-score{display:flex;align-items:center;justify-content:center;gap:.6em;white-space:nowrap;font-variant-numeric:tabular-nums}
 .rc3-score strong{font-weight:400;line-height:1}.rc3-score small{font-size:max(12px,.5em);margin-left:.1em}.rc3-score span{opacity:.85}
 .rc3-count{display:flex;align-items:center;justify-content:center;min-width:1.6em;padding:.05em .35em;border-radius:.4em;background:#fff6dc;color:#263e38;box-shadow:0 0 0 2px #5d7461;line-height:1.1;transform:translate(-50%,-50%)}
 .rc3-cards>*{position:absolute;z-index:3;margin:0;padding:0;border:0;background:transparent;font:inherit;color:inherit;text-align:center;display:block}
 .rc3-cards button{cursor:pointer}.rc3-cards button:focus-visible,.rc3 button:focus-visible{outline:3px solid #ffbd3c;outline-offset:3px}
 .rc3-card{transition:transform .25s ease-out,opacity .25s ease-out}.rc3-card:not([data-shown=true]){opacity:0;transform:translateY(24px)}
 .rc3[data-reduced=true] .rc3-card{transition:none}
 .rc3-ribbon{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;white-space:nowrap;z-index:1}
 .rc3-body{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;overflow:hidden}
 .rc3-row{display:flex;align-items:flex-end;justify-content:center;gap:6px;max-width:100%}
 .rc3-row,.rc3-lines,.rc3-fig canvas{flex:none}
 .rc3-fig{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;margin:0;min-width:0}
 .rc3-fig figcaption{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
 .rc3-mark{position:absolute;right:-6%;bottom:-6%}
 .rc3-pair{display:flex;align-items:center;gap:2px}
 .rc3-more{align-self:center;padding:0 .2em;color:#5b5143}
 .rc3-lines{display:flex;flex-direction:column;align-items:center;gap:2px;max-width:100%}
 .rc3-lines p{margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all}
 .rc3-shadow{opacity:.55}
 .rc3-history{flex:none;max-width:100%;box-sizing:border-box;border:1px solid #b8996a;border-radius:4px;padding:2px 4px;background:#fff8df;color:#24473e;font:13px/1.25 DoHyeon,sans-serif;white-space:nowrap}
 .rc3-history-list{position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(360px,calc(100vw - 24px));max-height:75vh;overflow:auto;padding:16px;border:2px solid #b8996a;border-radius:8px;background:#fff8df;color:#24473e;font:16px/1.6 DoHyeon,sans-serif;text-align:left;white-space:normal}
 .rc3-console{position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;gap:.6em}
 .rc3-console button{position:relative;margin:0;border:0;background:transparent;font:inherit;color:#263e38;cursor:pointer;min-width:44px;min-height:44px;padding:0 1em;white-space:nowrap}
 .rc3-console button[data-pressed=true]>span{top:2px}
 .rc3-notice{position:absolute;z-index:3;margin:0;transform:translateY(-100%);white-space:nowrap;padding:.15em .8em;border-radius:.5em;background:#fff6dc;box-shadow:0 0 0 2px #a8742d;color:#75461c}
 .rc3-dialog{inset:0;margin:auto;width:min(640px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:0;padding:0;background:transparent;color:#263e38;font:16px/1.4 Jua,sans-serif}
 .rc3-dialog::backdrop{background:#18382d9c}
 .rc3-sheet{position:relative;padding:20px 22px}.rc3-sheet>*{position:relative}.rc3-sheet>.rc3-art{position:absolute}
 .rc3-sheet h3{margin:0 0 10px;font-size:24px;font-weight:400}
 .rc3-sheet article{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;text-align:left;gap:10px;padding:8px 0;border-bottom:2px dashed #c9b98e}
 .rc3-sheet article p{margin:2px 0 0;font-size:15px}.rc3-sheet strong{font-weight:400;font-size:18px}
 .rc3-sheet-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}
 .rc3-sheet-actions button{position:relative;min-height:48px;padding:0 1.8em;border:0;background:transparent;font:18px Jua,sans-serif;color:#263e38;cursor:pointer}
 `;
 function render(host,c){
  const doc=host.ownerDocument,win=doc.defaultView,S=family.scene,R=family.rules,E=family.endStage,M=model(c),reduced=!!(c.reducedMotion||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  host.classList.add('rc3');host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.dataset.reduced=String(reduced);
  if(!doc.getElementById('rc-end-v3')){const style=doc.createElement('style');style.id='rc-end-v3';style.textContent=css;doc.head.append(style);}
  const node=(tag,cls,text,parent)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  const slots=c.art?.slots||{},asset=key=>slots[SLOT[key]],bank=new Map(),arts=[],pics=[];let repaint=0,disposed=false;
  function image(key){
   const a=asset(key);if(!a)return null;const slot=SLOT[key];
   if(!bank.has(slot)){const ready=c.images?.[slot];if(ready?.complete&&ready.naturalWidth)bank.set(slot,ready);else{const img=new win.Image();img.src=new URL(a.file,c.base||win.location?.href).href;img.addEventListener?.('load',()=>{if(!repaint&&!disposed)repaint=win.setTimeout(()=>{repaint=0;paintAll();},16);},{once:true});bank.set(slot,img);}}
   const img=bank.get(slot);return img.complete&&img.naturalWidth?img:null;
  }
  // 판 그림을 깔 칸(아홉 칸). part: 그림 이름, frame: 장, crop: 장 안에서 잘라 쓸 곳.
  const art=(parent,part,{frame=0,key=part,crop}={})=>{const n=node('canvas','rc3-art',undefined,parent);n.setAttribute('aria-hidden','true');arts.push({n,part,frame,key,crop});return n;};
  // 물건 · 통 · 표시 그림 한 장. times: 무대 배율의 몇 배로 그릴지(카드 속 물건은 정수 배).
  const pic=(parent,key,frame,cls,shadow=false)=>{const n=node('canvas',cls,undefined,parent);n.setAttribute('aria-hidden','true');const p={n,key,frame,times:1,shadow};pics.push(p);return p;};
  const binIndex=id=>R.BINS.indexOf(id),binName=id=>M.content?.bins.find(b=>b.id===id)?.name||c.resources?.find?.(r=>r.id===id)?.name||'';
  const bg=node('canvas','rc3-bg',undefined,host),fg=node('canvas','rc3-fg',undefined,host);bg.setAttribute('aria-hidden','true');fg.setAttribute('aria-hidden','true');
  const headline=node('h2','rc3-sr',M.title||'',host);headline.id='rc3-end-title';headline.style.position='absolute';headline.style.width='1px';headline.style.height='1px';headline.style.overflow='hidden';headline.style.clipPath='inset(50%)';
  host.setAttribute('aria-labelledby',headline.id);
  // 트럭마다: 간판 · 별 · 버틴 시간 · 도장 · 점수 · 칸 숫자
  const trucks=M.trucks.map((t,i)=>{
   const box=node('section','rc3-truck',undefined,host);box.dataset.test='recycle-truck';
   const sign=node('h3','rc3-sign',undefined,box),topper=art(sign,'sign',{frame:0,key:'topper',crop:CROP.topper});topper.className='rc3-topper';art(sign,'sign',{frame:1,key:'title',crop:CROP.title});
   const signText=node('span','',M.title,sign);
   let stars=null,survive=null,stamp=null;
   if(M.stars!==null){stars=node('div','rc3-stars',undefined,box);stars.setAttribute('role','img');stars.setAttribute('aria-label',`별 ${M.stars}개`);for(let k=0;k<3;k++){const s=node('span','rc3-star',undefined,stars);s.dataset.test='gold-star';s.dataset.earned=String(k<M.stars);s.dataset.lit='false';}}
   if(M.endless){survive=node('div','rc3-survive',undefined,box);art(survive,'survive');node('span','',`버틴 시간 ${clock(M.elapsed)}`,survive);survive.dataset.test='survive-time';}
   stamp=node('div','rc3-stamp',undefined,box);art(stamp,'stamp');stamp.dataset.best=String(M.best);stamp.dataset.test='best-stamp';if(M.best){node('span','','최고',stamp);node('span','','기록',stamp);}else{node('span','','최고',stamp);node('span','',String(M.previousBest),stamp);}
   const score=node('div','rc3-score',undefined,box),strong=node('strong','',undefined,score),value=node('span','','0',strong);node('small','','점',strong);score.dataset.test=`end-score-${i}`;
   node('span','',`맞힌 물건 ${t.stats.right||0}개 · 최대 콤보 ${t.stats.maxCombo||0}`,score);
   const counts=t.cells.filter(cell=>cell.count>0).map(cell=>{const n=node('span','rc3-count','0',box);n.dataset.bin=cell.id;n.dataset.count=String(cell.count);n.setAttribute('aria-label',`${cell.name} ${cell.count}개`);return{n,cell};});
   return{...t,box,sign,signText,stars,survive,stamp,value,scoreBox:score,counts,order:t.cells.filter(cell=>cell.count>0).sort((a,b)=>b.count-a.count||a.index-b.index).map(cell=>cell.index)};
  });
  // 배움 카드 셋
  const deck=node('div','rc3-cards',undefined,host),A=c.actions||{},dexView=family.dexView;
  const cards=[['learn',M.learn,false],['review',M.review,M.review.list.length>0],['dex',M.dex,!!dexView]].map(([kind,data,press],i)=>{
   const el=node(press?'button':'article','rc3-card',undefined,deck);el.dataset.test=`end-card-${kind}`;el.dataset.shown='false';if(press)el.type='button';
   art(el,'cards',{frame:i,key:'cards'});const ribbon=node('div','rc3-ribbon',undefined,el);art(ribbon,'cards',{frame:3,key:'ribbon',crop:CROP.ribbon});node('span','',data.title,ribbon);
   const body=node('div','rc3-body',undefined,el);
   el.setAttribute('aria-label',kind==='review'?(data.list.length?`${data.title} ${data.list.length}개, 눌러서 보기`:'하나도 안 틀렸어요!'):kind==='dex'?`${data.title} 모은 것 ${data.have} / ${data.total}`:data.title);
   return{el,kind,data,ribbon,body,press};
  });
  // 조종판
  const panel=node('footer','rc3-console',undefined,host);art(panel,'console');
  const buttons=[];
  const button=(b,big)=>{const n=node('button','',undefined,panel);n.type='button';n.dataset.test=b.test;art(n,big?'big':'small',{key:big?'big':'small'});node('span','',b.label,n);if(big)n.dataset.primary='true';
   n.addEventListener('pointerdown',()=>{n.dataset.pressed='true';paintArts();});for(const type of ['pointerup','pointerleave','pointercancel'])n.addEventListener(type,()=>{if(n.dataset.pressed){delete n.dataset.pressed;paintArts();}});
   n.onclick=()=>{skip();c.sound?.('button');if(b.rank)openRank();else b.act?.();};buttons.push(n);return n;};
  const smalls=M.small.map(b=>button(b,false)),primary=button(M.primary,true);
  // 큰 단추를 가운데에 둔다(작은 단추는 양옆으로 나눈다).
  panel.replaceChildren(panel.children[0],...smalls.slice(0,Math.ceil(smalls.length/2)),primary,...smalls.slice(Math.ceil(smalls.length/2)));
  const notices=M.notices.length?node('p','rc3-notice',M.notices.join('  '),host):null;if(notices){notices.setAttribute('role','status');notices.dataset.test='end-notices';if(M.notices.some(n=>n.startsWith('무한')))notices.dataset.unlocked='true';}
  for(const card of cards)if(card.press)card.el.onclick=()=>{skip();if(card.kind==='review')openReview();else dexView?.open(host,{content:M.content,storage:family.dex?.storage,art:c.art,images:c.images,base:c.base,news:M.dex.news.map(x=>x.item.no),bin:M.dex.bin,onClose:()=>card.el.focus()});};
  let L=null,time=0,complete=false,review=null,rankDialog=null;
  // 카드 속: 물건은 무대 배율의 정수 배(1 · 2배), 통 · 표시는 무대 배율 그대로다.
  function fill(card){
   const {body,kind,data}=card,u=L.u;body.replaceChildren();const lay=card.lay;
   const fig=(parent,key,frame,times,caption,mark)=>{const f=node('figure','rc3-fig',undefined,parent);const p=pic(f,key,frame,'',false);p.times=times;if(mark!==undefined){const k=pic(f,'marks',mark,'rc3-mark');k.times=1;}if(caption!==undefined){const cap=node('figcaption','',caption,f);cap.style.fontSize=`${lay.small}px`;}return{f,p};};
   const lines=(texts,cls='')=>{const box=node('div','rc3-lines '+cls,undefined,body);for(const t of texts){const p=node('p','',t,box);p.style.fontSize=`${lay.font}px`;}return box;};
   const more=(row,n)=>{if(n>0){const s=node('span','rc3-more',`+${n}`,row);s.style.fontSize=`${lay.font}px`;}};
   if(kind==='learn'){
    const row=node('div','rc3-row',undefined,body),show=data.pics.slice(0,lay.count);
    for(const x of show)fig(row,'items',x.frame,lay.times,undefined,2).f.setAttribute('aria-label',x.item.name);
    if(!show.length){const x=M.content.items[0];fig(row,'items',x.frames[0],lay.times).f.setAttribute('aria-label',x.name);}
    lines(data.lines.slice(0,lay.lines));
    if(data.endless){
     const T=R.ENDLESS_TEXT,e=data.endless,last=e.days.at(-1),dayText=last?`${last.name}${last.perfect?' '+T.perfect:''}${e.days.length>1?' '+T.others+' '+(e.days.length-1)+T.count:''}`:`${T.passed} ${T.none}`;
     host.querySelector('[data-test=end-endless-summary]')?.remove();host.querySelector('[data-test=end-endless-history]')?.remove();
     const inline=L.mode==='column',button=node('button','rc3-history',`${dayText}  ${T.filled} ${e.ordersFilled}${T.times}`,inline?body:host);button.type='button';button.dataset.test='end-endless-summary';button.setAttribute('aria-label',`${T.passed}: ${e.days.map(d=>d.name+(d.perfect?' '+T.perfect:'')).join(', ')}. ${T.filled} ${e.ordersFilled}${T.times}`);
     const low=L.mode==='side',rect=L.cards[0];if(!inline)button.style.cssText=`position:absolute;z-index:5;left:${low?8:rect.x+4}px;top:${low?8:Math.max(4,rect.y-64)}px;max-width:${low?rect.x-16:rect.w-8}px`;
     const history=node('div','rc3-history-list',undefined,host);history.dataset.test='end-endless-history';history.id='rc3-endless-history';history.setAttribute('popover','auto');button.setAttribute('popovertarget',history.id);
     node('strong','',T.passed,history);for(const d of e.days)node('div','',`${d.name}${d.perfect?' '+T.perfect:''}`,history);if(!e.days.length)node('div','',T.none,history);node('div','',`${T.filled} ${e.ordersFilled}${T.times}`,history);
    }
   }else if(kind==='review'){
    if(!data.list.length){const row=node('div','rc3-row',undefined,body);fig(row,'marks',2,lay.times);lines(['하나도 안 틀렸어요!']);return;}
    const row=node('div','rc3-row',undefined,body),show=data.list.slice(0,lay.count);
    for(const x of show){const pair=node('div','rc3-pair',undefined,row);pair.setAttribute('aria-label',`${x.item.name}: ${binName(x.bin)}`);fig(pair,'items',x.item.frames[0],lay.times);fig(pair,'arrows',1,1);
     const station=x.prep&&asset('station')&&asset('station').h*u<=lay.tile*1.15;fig(pair,station?'station':'bins',station?0:binIndex(x.bin)*4,station?1:lay.binTimes,station?'손질대':binName(x.bin));}
    more(row,data.list.length-show.length);
    if(lay.lines)lines([show[0].item.tip]);
   }else{
    const row=node('div','rc3-row',undefined,body);
    if(data.news.length){const show=data.news.slice(0,lay.count);for(const x of show)fig(row,'items',x.frame,lay.times).f.setAttribute('aria-label',x.item.name);more(row,data.news.length-show.length);lines(lay.lines<2?[`모은 것 ${data.have} / ${data.total}`]:[`새로 모은 물건 ${data.news.length}개`,`모은 것 ${data.have} / ${data.total}`]);}
    else{const show=data.left.slice(0,lay.count);for(const x of show){const f=node('figure','rc3-fig rc3-shadow',undefined,row);const p=pic(f,'items',x.frame,'',true);p.times=lay.times;}more(row,data.left.length-show.length);
     if(!show.length){const x=M.content.items.find(x=>x.bin===data.bin)||M.content.items[0];fig(row,'items',x.frames[0],lay.times).f.setAttribute('aria-label',x.name);}
     lines(lay.lines<2?[`모은 것 ${data.have} / ${data.total}`]:[data.left.length?`${data.binName} 쪽 남은 칸 ${data.left.length}`:`${data.binName} 쪽을 다 모았어요!`,`모은 것 ${data.have} / ${data.total}`]);}
   }
  }
  // 카드 크기로 글 크기 · 그림 배수 · 보일 개수를 정한다.
  function plan(card,rect){
   const u=L.u,pad=clamp(30*u,8,26),title=clamp(Math.round(rect.h*.11),13,20),rh=Math.max(48*u,title+10),font=clamp(Math.round(Math.min(rect.w/24,rect.h/9)),13,19),small=clamp(font-3,12,16);
   const inner={x:pad,y:pad*.25+rh+4,w:rect.w-2*pad,h:rect.h-(pad*.25+rh+4)-pad},line=font*1.3,item=64*u;
   if(card.data.endless&&L.mode==='column')inner.h-=24;
   const want=card.kind==='learn'?Math.min(2,card.data.lines.length):card.kind==='review'?(card.data.list.length?1:1):2;
   const pair=card.kind==='review'&&card.data.list.length>0,capH=pair?small*1.3:0;
   // 다시 볼 물건의 통은 물건 칸 높이의 1.1배로 같이 줄고 는다. 통 그림이 커진 뒤(104×176점) 1배로 두면 통 하나가 카드보다 높아 아래 글이 잘렸다(10-26 대표).
   const binA=asset('bins')||SPARE.bins,binT=times=>64*times*1.1/binA.h;
   const tileW=times=>pair?item*times+40*u+binA.w*u*binT(times)+8:item*times+6;
   const tileH=times=>(pair?Math.max(item*times,binA.h*u*binT(times)):item*times)+capH;
   const minimum=win.innerHeight<=500&&win.innerWidth>win.innerHeight?28:win.innerWidth>=1400&&win.innerHeight>=800?100:48,minTimes=Math.max(2,Math.ceil(minimum/item-1e-9));
   const fits=(times,n)=>tileH(times)+n*line+4<=inner.h&&tileW(times)<=inner.w;
   let pickTimes=0,lines=inner.h>=140?want:Math.min(want,1);
   if(!fits(minTimes,lines))lines=Math.min(lines,1);
   for(let times=Math.max(minTimes,Math.floor(inner.h/item));times>=minTimes;times--)if(fits(times,lines)){pickTimes=times;break;}
   // 최소 크기로도 넘치면 글 줄을 줄이고(그림 크기 바닥은 지킨다), 그래도 넘치면 그때만 그림을 줄인다. 넘친 채로 그리면 몸통 위아래가 같이 잘렸다.
   for(let n=lines-1;!pickTimes&&n>=0;n--)for(let times=Math.max(minTimes,Math.floor(inner.h/item));times>=minTimes;times--)if(fits(times,n)){pickTimes=times;lines=n;break;}
   for(let times=minTimes-1;!pickTimes&&times>=1;times--)if(fits(times,0)){pickTimes=times;lines=0;}
   if(!pickTimes){lines=0;pickTimes=1;}
   const count=clamp(Math.floor((inner.w+6)/(tileW(pickTimes)+6)),1,3);
   card.lay={pad,title,rh,font,small,inner,times:pickTimes,binTimes:binT(pickTimes),lines,count,tile:tileH(pickTimes)};
  }
  const px=v=>`${Math.round(v*100)/100}px`,set=(n,o)=>{for(const[k,v]of Object.entries(o))n.style[k]=typeof v==='number'?px(v):v;};
  function place(){
   const W=win.innerWidth,H=win.innerHeight;L=layout({W,H},E);host.dataset.mode=L.mode;host.dataset.stage=L.stage;
   const st=E[L.stage],u=L.u,rel=(t,[sx,sy])=>[(sx-L.T.x)*u,(sy-L.T.y)*u];
   trucks.forEach((t,i)=>{
    const r=L.trucks[i];set(t.box,{left:r.x,top:r.y,width:r.w,height:r.h});
    const [sx,sy]=L.header?[L.header.x-r.x,L.header.signY-r.y]:rel(t,st.sign),font=clamp(Math.round(96*u*.42),14,34);
    const signPad=Math.min(48*u,20),signWidth=Math.min(W-12,Math.max(512*u,t.sign.textContent.length*font*.9+2*signPad));
    set(t.sign,{left:clamp(r.x+sx,6+signWidth/2,W-6-signWidth/2)-r.x,top:sy,height:96*u,minWidth:0,width:signWidth,boxSizing:'border-box',padding:`0 ${px(signPad)}`,fontSize:`${font}px`});
    set(t.sign.querySelector('.rc3-topper'),{width:220*u,height:124*u,bottom:`calc(100% - ${px(26*u)})`});
    if(t.stars){const [ax,ay]=L.header?[L.header.x-r.x,L.header.starsY-r.y]:rel(t,st.stars[1]);set(t.stars,{left:ax,top:ay,width:(st.stars[2][0]-st.stars[0][0]+72)*u,height:72*u});for(const s of t.stars.children)set(s,{width:(st.stars[1][0]-st.stars[0][0])*u,height:72*u});}
    if(t.survive){const [ax,ay]=L.header?[L.header.x-r.x,L.header.starsY-r.y]:rel(t,st.stars[1]);set(t.survive,{left:ax,top:ay,height:80*u,minWidth:300*u,padding:`0 ${px(36*u)}`,fontSize:`${clamp(Math.round(80*u*.4),13,26)}px`});}
    if(t.stamp){const [ax,ay]=rel(t,st.stamp),size=Math.max(110*u,W>=1000?90:44);set(t.stamp,{left:ax,top:L.header?L.header.signY-r.y:ay,width:size,height:size,fontSize:`${clamp(Math.round(size*.22),14,22)}px`});}
    const sc=rel(t,st.score);set(t.scoreBox,{left:sc[0],top:sc[1],width:st.score[2]*u,height:st.score[3]*u,fontSize:`${clamp(Math.round(st.score[3]*u*.3),12,18)}px`});
    t.scoreBox.children[0].style.fontSize=`${clamp(Math.round(st.score[3]*u*.7),16,44)}px`;
    const stats=t.scoreBox.children[1];if(stats){stats.hidden=false;stats.hidden=t.scoreBox.scrollWidth>t.scoreBox.clientWidth+1;}
    for(const {n,cell}of t.counts){const box=st.cells[cell.index]||[st.sack[0]-ANCHOR.sack[0],st.sack[1]-ANCHOR.sack[1]+8],[cx,cy]=rel(t,[box[0]+16,box[1]+14]);set(n,{left:cx,top:cy,fontSize:`${clamp(Math.round(97*u*.2),12,18)}px`});n.hidden=u<.45;}
   });
   cards.forEach((card,i)=>{const r=L.cards[i];set(card.el,{left:r.x,top:r.y,width:r.w,height:r.h});plan(card,r);const lay=card.lay;
    set(card.ribbon,{top:lay.pad*.25,height:lay.rh,minWidth:240*L.u,padding:`0 ${px(Math.max(24*L.u,10))}`,fontSize:`${lay.title}px`});
    set(card.body,{left:lay.inner.x,top:lay.inner.y,width:lay.inner.w,height:lay.inner.h+(card.data.endless&&L.mode==='column'?24:0)});
    for(const p of pics.filter(p=>card.body.contains(p.n)))pics.splice(pics.indexOf(p),1);fill(card);});
   const k=L.console;set(panel,{left:k.x,top:k.y,width:k.w,height:k.h,padding:`${px(Math.min(36*L.u,14))} ${px(Math.min(36*L.u,18))}`,fontSize:`${clamp(Math.round(k.h*.26),14,20)}px`});
   const bh=Math.max(44,k.h-2*Math.min(36*L.u,14));
   for(const b of buttons)set(b,{height:bh,padding:`0 ${px(Math.max(16,((b===primary?NINE.big:NINE.small)[0]+12)*L.u))}`,fontSize:b===primary?`${clamp(Math.round(bh*.42),16,28)}px`:`${clamp(Math.round(bh*.34),14,20)}px`,minWidth:b===primary?Math.min(k.w*.42,420*L.u+60):0});
   if(notices)set(notices,{left:W>H&&H>500?L.cards[0].x+16:L.trucks[0].x+12,top:W>H&&H>500?L.cards[0].y-8:L.trucks[0].y+L.trucks[0].h-10,fontSize:`${clamp(Math.round(k.h*.24),13,18)}px`});
   for(const p of pics){const a=asset(p.key)||SPARE[p.key];if(!a)continue;const s=L.u*p.times;set(p.n,{width:a.w*s,height:a.h*s});}
  }
  // 무대 그림: 보이는 곳만 띠마다 정수 배로 키운 뒤 남은 비율만 부드럽게 줄인다(큰 그림이라 담아 두지 않는다).
  // 무대 밖으로 나간 곳은 가장자리를 거울처럼 이어 붙여 빈 띠를 두지 않는다.
  function drawStage(g,img,a,map,clip,ratio){
   const u=map.u,k=Math.max(1,Math.ceil(u*ratio-1e-6)),p0=[(clip.x-map.ox)/u,(clip.y-map.oy)/u],p1=[(clip.x+clip.w-map.ox)/u,(clip.y+clip.h-map.oy)/u];
   const spans=(a0,a1,n)=>{const out=[];if(a0<0){const d=Math.min(-a0,n);out.push({d0:-d,s0:0,s1:d,flip:true});}const s0=Math.max(0,Math.floor(a0)),s1=Math.min(n,Math.ceil(a1));if(s1>s0)out.push({d0:s0,s0,s1,flip:false});if(a1>n){const d=Math.min(a1-n,n);out.push({d0:n,s0:n-d,s1:n,flip:true});}return out;};
   const tmp=doc.createElement('canvas'),tg=tmp.getContext('2d');
   g.save();g.beginPath();g.rect(clip.x,clip.y,clip.w,clip.h);g.clip();
   for(const X of spans(p0[0],p1[0],a.w))for(const Y of spans(p0[1],p1[1],a.h)){
    const sw=X.s1-X.s0,sh=Y.s1-Y.s0;
    for(let y=0;y<sh;y+=160){
     const h=Math.min(160,sh-y),m0=Math.max(0,y-2),m1=Math.min(sh,y+h+2),sy=Y.flip?Y.s1-m1:Y.s0+m0;
     tmp.width=Math.ceil(sw*k);tmp.height=Math.ceil((m1-m0)*k);tg.imageSmoothingEnabled=false;tg.clearRect(0,0,tmp.width,tmp.height);tg.drawImage(img,X.s0,sy,sw,m1-m0,0,0,sw*k,(m1-m0)*k);
     const dx=map.ox+X.d0*u,dy=map.oy+(Y.d0+(Y.flip?0:0))*u,dw=sw*u;
     g.save();g.beginPath();g.rect(dx,dy+y*u,dw,h*u);g.clip();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
     if(X.flip||Y.flip){g.translate(X.flip?2*dx+dw:0,Y.flip?2*dy+sh*u:0);g.scale(X.flip?-1:1,Y.flip?-1:1);}
     g.drawImage(tmp,0,0,tmp.width,tmp.height,dx,Y.flip?dy+(sh-m1)*u:dy+m0*u,dw,(m1-m0)*u);
     g.restore();
    }
   }
   g.restore();tmp.width=tmp.height=1;
  }
  const canvasFor=(n,w,h,ratio)=>{n.width=Math.max(1,Math.round(w*ratio));n.height=Math.max(1,Math.round(h*ratio));const g=n.getContext('2d');g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,w,h);return g;};
  function paintBg(){
   const ratio=win.devicePixelRatio||1,W=win.innerWidth,H=win.innerHeight,g=canvasFor(bg,W,H,ratio),a=asset(L.stage),img=image(L.stage);
   if(a&&img)L.trucks.forEach(r=>drawStage(g,img,a,{ox:r.x-L.T.x*L.u,oy:r.y-L.T.y*L.u,u:L.u},r.clip,ratio));
   const pa=asset('plate'),pi=image('plate');if(L.plate&&pa&&pi)S.drawNine(g,pi,pa,0,NINE.plate,L.plate.x,L.plate.y,L.plate.w,L.plate.h,L.u,ratio);
  }
  // 트럭 위 움직이는 것: 문 · 칸(뚜껑 · 더미) · 일꾼 · 별 · 도장 · 왕관
  function paintFg(){
   const ratio=win.devicePixelRatio||1,W=win.innerWidth,H=win.innerHeight,g=canvasFor(fg,W,H,ratio),st=E[L.stage],u=L.u,t=complete?END:time;
   const draw=(key,frame,sx,sy,anchor=[0,0],r,scale=1)=>{const a=asset(key),img=image(key);if(!a||!img)return;const x=r.x+(sx-L.T.x)*u,y=r.y+(sy-L.T.y)*u;
    if(scale===1){S.drawArt(g,img,a,frame,x-anchor[0]*u,y-anchor[1]*u,u,ratio);return;}g.save();g.translate(x,y);g.scale(scale,scale);S.drawArt(g,img,a,frame,-anchor[0]*u,-anchor[1]*u,u,ratio);g.restore();};
   trucks.forEach((tr,i)=>{
    const r=L.trucks[i];
    draw('door',t>=DOOR?1:0,st.door[0],st.door[1],[0,0],r);
    st.cells.forEach((box,ci)=>{
     const cell=tr.cells[ci],cx=box[0]+box[2]/2,bottom=box[1]+box[3],p=progress(tr,ci,t);
     if(!cell||p<=0){draw('lid',0,cx,bottom,ANCHOR.lid,r);return;}
     draw('pile',cell.index*4+Math.max(1,Math.ceil(p*cell.pile))-1,cx,bottom-6,ANCHOR.pile,r);
    });
    // 짐칸 여덟 다음 통(스티로폼)은 트럭 옆 자루. 그 판에 넣었을 때만 서고, 넣은 만큼 차오른다(4차, 짐칸은 다시 그리지 않는다).
    for(let ci=st.cells.length;ci<tr.cells.length;ci++){const cell=tr.cells[ci],p=progress(tr,ci,t);if(cell&&p>0)draw('sack',Math.max(1,Math.ceil(p*cell.pile))-1,st.sack[0],st.sack[1],ANCHOR.sack,r);}
    draw('worker',workerFrame(tr,t),st.worker[0],st.worker[1],ANCHOR.worker,r);
    if(tr.stars)st.stars.forEach((s,k)=>{const lit=k<M.stars&&t>=STARS+k*.27,age=t-STARS-k*.27,sx=L.header?L.T.x+(L.header.x-r.x)/u+s[0]-st.stars[1][0]:s[0],sy=L.header?L.T.y+(L.header.starsY-r.y)/u:s[1];draw('star',lit?0:1,sx,sy,[36,36],r,lit&&!complete&&!reduced&&age<.2?1+.3*(1-age/.2):1);});
   });
  }
  // 칸마다 차례로 채운다(많이 넣은 칸부터). 0~1.
  function progress(tr,ci,t){const k=tr.order.indexOf(ci);if(k<0)return 0;const n=tr.order.length,span=(LOAD[1]-LOAD[0])/n,start=LOAD[0]+k*span;return clamp((t-start)/Math.max(.2,span*.9),0,1);}
  function workerFrame(tr,t){const happy=tr.mood==='happy';if(complete)return happy?2:4;if(t<LOAD[0])return 0;if(t<LOAD[1])return Math.floor(t*6)%2;return(happy?2:4)+Math.floor(t*4)%2;}
  function update(){
   const t=complete?END:time;
   for(const tr of trucks){
    for(const {n,cell}of tr.counts){const v=String(Math.round(cell.count*progress(tr,cell.index,t)));if(n.textContent!==v)n.textContent=v;}
    const sp=clamp((t-SCORE[0])/(SCORE[1]-SCORE[0]),0,1),v=String(Math.round(tr.score*(1-(1-sp)**3)));if(tr.value.textContent!==v)tr.value.textContent=v;
    if(tr.stars)[...tr.stars.children].forEach((s,k)=>{s.dataset.lit=String(k<M.stars&&t>=STARS+k*.27);});
    if(tr.stamp)tr.stamp.dataset.stamped=String(M.best&&t>=BEST);
   }
   cards.forEach((card,i)=>{card.el.dataset.shown=String(t>=CARDS+i*.2);});
   primary.dataset.ready=String(t>=END);
   paintFg();
  }
  function paintArts(){
   if(disposed||!L)return;
   const ratio=win.devicePixelRatio||1;
   for(const p of arts){
    const r=p.n.getBoundingClientRect?.()||{width:0,height:0},a=asset(p.part),img=image(p.part);if(!r.width||!r.height||!a||!img)continue;
    const g=canvasFor(p.n,r.width,r.height,ratio),pressed=p.n.parentElement?.dataset.pressed==='true'&&a.frames>1;
    if(p.key==='stamp'){S.drawArt(g,img,a,0,0,0,r.width/a.w,ratio);continue;}
    if(p.key==='topper'){S.drawArt(g,img,a,0,0,0,r.width/CROP.topper[2],ratio,CROP.topper);continue;}
    S.drawNine(g,img,a,pressed?1:p.frame,NINE[p.key]||NINE.cream,0,0,r.width,r.height,L.u,ratio,p.crop);
   }
   for(const p of pics){
    const a=asset(p.key),img=image(p.key);if(!a||!img)continue;const s=L.u*p.times,g=canvasFor(p.n,a.w*s,a.h*s,ratio);
    const q=p.key==='items'?S.sharp(img,a,image('itemsHd'),asset('itemsHd'),s,ratio):{img,a,scale:s};S.drawArt(g,q.img,q.a,p.frame,0,0,q.scale,ratio);
    if(p.shadow){g.save();g.globalCompositeOperation='source-in';g.fillStyle='#4d5c52';g.fillRect(0,0,a.w*s,a.h*s);g.restore();}
   }
  }
  function paintAll(){if(disposed||!host.isConnected)return;paintBg();paintArts();update();}
  function relayout(){if(disposed)return;place();paintAll();}
  // 소리: 문 · 칸마다 한 번 · 별 · 점수 · 최고 기록 · 카드
  function cue(old,t){
   if(reduced||c.fast)return;
   const list=[[0,'button'],...trucks[0].order.map((ci,k)=>[LOAD[0]+k*(LOAD[1]-LOAD[0])/trucks[0].order.length,'stamp',k]),...[0,1,2].filter(k=>M.stars!==null&&k<M.stars).map(k=>[STARS+k*.27,'card']),[SCORE[0],'count'],...(M.best?[[BEST,'best']]:[]),[CARDS,'card']];
   for(const[at,name,semitones=0]of list)if(old<at&&t>=at)c.sound?.(name,{semitones});
  }
  function finish(){complete=true;time=END;update();primary.focus?.({preventScroll:true});}
  function advance(dt){if(complete||disposed)return;const old=time;time=Math.min(END,time+Math.max(0,dt));cue(old,time);if(time>=END)finish();else update();}
  function skip(){if(complete||disposed)return;finish();}
  function openReview(){
   if(review||!M.review.list.length)return;c.sound?.('card');
   review=node('dialog','rc3-dialog',undefined,host);review.dataset.test='review-dialog';review.setAttribute('aria-label','다시 볼 물건');
   const sheet=node('div','rc3-sheet',undefined,review);art(sheet,'cream',{key:'cream'});node('h3','','다시 볼 물건',sheet);
   for(const x of M.review.list){const a=node('article','',undefined,sheet),p=pic(a,'items',x.item.frames[0],'');p.times=Math.max(1,Math.round(80/(64*L.u)));
    const text=node('div','',undefined,a);node('strong','',x.item.name,text);node('p','',`넣은 곳 ${x.kind==='missed'?'놓침':binName(x.chosen)||'다른 통'} → 맞는 곳 ${binName(x.bin)}`,text);if(x.item.tip)node('p','',x.item.tip,text);}
   const row=node('div','rc3-sheet-actions',undefined,sheet),action=(label,test,fn)=>{const b=node('button','',undefined,row);b.type='button';b.dataset.test=test;art(b,'small',{key:'small'});node('span','',label,b);b.onclick=fn;return b;};
   const practice=M.practice?action('틀린 것만 다시 30초','practice',()=>{review.close();A.practice();}):null,close=action('닫기','review-close',()=>review.close());
   review.addEventListener('close',()=>{const d=review;review=null;for(const p of pics.filter(p=>d.contains(p.n)))pics.splice(pics.indexOf(p),1);for(const p of arts.filter(p=>d.contains(p.n)))arts.splice(arts.indexOf(p),1);d.remove();cards[1].el.focus?.();});
   for(const p of pics){const a=asset(p.key);if(a&&review.contains(p.n))set(p.n,{width:a.w*L.u*p.times,height:a.h*L.u*p.times});}
   review.showModal?.();(practice||close).focus?.();win.requestAnimationFrame?.(paintArts);paintArts();
  }
  function openRank(){if(!rankDialog)return;rankDialog.showModal?.();rankDialog.querySelector('button')?.focus?.();}
  if(c.rank){
   rankDialog=node('dialog','rc3-dialog',undefined,host);rankDialog.setAttribute('aria-label','내 순위');const sheet=node('div','rc3-sheet',undefined,rankDialog);art(sheet,'cream',{key:'cream'});node('h3','','내 순위',sheet);sheet.append(c.rank);
   const row=node('div','rc3-sheet-actions',undefined,sheet),close=node('button','',undefined,row);close.type='button';art(close,'small',{key:'small'});node('span','','닫기',close);close.onclick=()=>rankDialog.close();
   rankDialog.addEventListener('close',()=>buttons.find(b=>b.dataset.test==='result-rank-open')?.focus?.());
  }
  const pointer=e=>{if(!e.target?.closest?.('button,dialog'))skip();};
  const key=e=>{
   if(review||rankDialog?.open||host.querySelector('.dx3[open]'))return;
   if(e.key==='Tab'){const list=[...cards.filter(card=>card.press).map(card=>card.el),...host.querySelectorAll('.rc3-history'),...panel.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled),i=list.indexOf(doc.activeElement);if(!list.length)return;e.preventDefault();list[(i<0?(e.shiftKey?list.length-1:0):i+(e.shiftKey?-1:1)+list.length)%list.length].focus();return;}
   if((e.key==='Enter'||e.key===' ')&&!e.repeat){if(!complete){e.preventDefault();skip();}else if(!doc.activeElement?.closest?.('button')){e.preventDefault();primary.click();}}
  };
  host.addEventListener('pointerdown',pointer);host.addEventListener('keydown',key);host.tabIndex=-1;
  const resize=win.ResizeObserver?new win.ResizeObserver(()=>relayout()):null;resize?.observe(host);
  const signs=win.ResizeObserver?new win.ResizeObserver(()=>paintArts()):null;for(const t of trucks){signs?.observe(t.sign);if(t.survive)signs?.observe(t.survive);}for(const b of buttons)signs?.observe(b);
  doc.fonts?.ready?.then?.(()=>{if(!disposed)relayout();});
  place();
  if(reduced||c.fast){complete=true;time=END;paintAll();primary.focus?.({preventScroll:true});if(reduced&&!c.fast)c.sound?.('card');}
  else{host.focus?.({preventScroll:true});cue(-1,0);paintAll();}
  if(c.rank&&c.fast)openRank();
  return{advance,skip,finish:()=>A.result?.(),get stage(){return complete?6:1;},get time(){return complete?END:time;},layout:()=>L,model:M,
   dispose(){disposed=true;resize?.disconnect();signs?.disconnect();host.removeEventListener('pointerdown',pointer);host.removeEventListener('keydown',key);review?.remove();rankDialog?.remove();if(repaint)win.clearTimeout(repaint);}};
 }
 family.result={render,layout,model,pileStage,END};
})();
