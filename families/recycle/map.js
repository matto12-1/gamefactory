// 분리배출 단계 지도(대표 10-27 「가 공장 바닥 지도」). 놀이 화면과 같은 공장을 같은 각도로 본 바닥 한 장에 작업장 열 곳을 얹는다.
// 셸 고리 cfg.stageMap으로 공용 map()(동그라미 단추 · 굽은 길) 대신 불린다. 셸이 기대는 것은 셋이다:
// 돌려주는 화면 section, 그 안의 [data-test=stage-N] 단추(onclick이 단계 창을 연다. 셸 stageStartScreens가 이 onclick을 감싸 시작 카드를 붙인다),
// 위 막대의 .gf-map-top(셸 mapExtras가 끝에 도감 단추 칸을 붙인다).
// 자리 값은 games/recycle-factory/map.json(점, 그림 왼쪽 위가 0,0). 판(wide · tall · low)마다
//  slot 바탕 그림(작업장이 모두 열린 모습) · locked 잠김 조각 · done 깸 조각(둘 다 바탕과 같은 크기, 작업장 밖은 투명) · size 그림 크기 ·
//  box 꼭 보여야 할 칸 · floor 그림 밖에 칠할 바닥 색 · names 이름판에 이름까지 쓰는지 · worker 일꾼 키(점) ·
//  zones 작업장마다 { id 단계 번호, rect 누르는 칸, plate 이름판 위 가운데, stand 일꾼 발 }.
// 잠김 조각을 못 읽으면 셔터를 CSS로 대신 그린다(rc-map-noart).
(function(){
 'use strict';
 const family=window.GFFamilies.recycle;
 const css=`.rc-map{--rc-ink:#4a3626;--rc-cream:#fff8e8;--rc-cream2:#f2e2c0;--rc-lip:#b8996a;--s:1;--u:clamp(.55px,min(calc(100vw/1366),calc(100vh/768)),1.9px);--m-btn:max(44px,calc(56*var(--u)));--m-x:calc(24*var(--u));--m-y:calc(22*var(--u));background:var(--rc-floor,#e6d5ad)}
@media (orientation:landscape) and (max-height:520px){.rc-map{--u:clamp(.5px,calc(100vh/640),.82px)}}
@media (orientation:portrait){.rc-map{--u:clamp(.86px,min(calc(100vw/390),calc(100vh/780)),1.6px);--m-btn:max(44px,calc(48*var(--u)));--m-x:calc(16*var(--u));--m-y:calc(14*var(--u))}}
.rc-map-world{position:absolute;inset:0;overflow:hidden}
.rc-map-floor{position:absolute;max-width:none;pointer-events:none;user-select:none}
.rc-map-bar{position:absolute;z-index:3;top:var(--m-y);left:var(--m-x);right:calc(var(--m-x) + var(--m-btn) + 12px);height:var(--m-btn);display:flex;align-items:center;justify-content:space-between;gap:10px;pointer-events:none}
.rc-map-bar>*{pointer-events:auto}
.rc-map-back,.rc-map .rc-map-plate{box-sizing:border-box;height:var(--m-btn);border:3px solid var(--rc-ink);border-radius:calc(var(--m-btn)*.24);background:linear-gradient(var(--rc-cream),var(--rc-cream2));box-shadow:0 4px 0 var(--rc-lip),0 6px 0 var(--rc-ink),inset 0 2px 0 #fff,0 10px 14px #0003;color:var(--rc-ink)}
.rc-map-back{flex:none;width:var(--m-btn);padding:0;display:grid;place-items:center;cursor:pointer}
.rc-map-back svg{width:44%;height:44%;fill:currentColor}
.rc-map-back:active{translate:0 3px;box-shadow:0 1px 0 var(--rc-lip),0 3px 0 var(--rc-ink)}
.rc-map .rc-map-plate{position:static;inset:auto;flex:0 1 auto;min-width:0;display:flex;align-items:center;gap:0;padding:0 calc(var(--m-btn)*.22);overflow:hidden;font-size:calc(var(--m-btn)*.4);font-weight:800;white-space:nowrap}
.rc-map-grade{padding-right:.5em;margin-right:.5em;border-right:2px solid #d3bd94}
.rc-map-stars{display:flex;align-items:center;gap:.3em;padding-right:.5em}
.rc-map-stars svg{width:1.05em;height:1.05em;fill:currentColor}
.rc-map .rc-map-plate>.gf-map-extras{display:flex;align-self:stretch;align-items:center;padding-left:.35em;border-left:2px solid #d3bd94}
.rc-map .rc-map-plate .rc-dex-open{height:100%;min-height:0;padding:0 .3em;border:0;border-radius:0;background:none;box-shadow:none;color:inherit;font-size:inherit;font-weight:inherit}
.rc-map .rc-map-plate .rc-dex-open:active{translate:none;box-shadow:none}
.rc-zone{position:absolute;margin:0;padding:0;border:0;border-radius:8px;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.rc-zone:disabled{cursor:default}
.rc-zone:focus-visible{outline:4px solid #2f7bf6;outline-offset:2px}
.rc-zone-skin{position:absolute;inset:0;background-repeat:no-repeat;pointer-events:none}
.rc-map-noart .rc-zone-locked .rc-zone-skin{background:repeating-linear-gradient(#41464e 0 10px,#30343a 10px 13px);opacity:.9;border-radius:8px}
.rc-zone-lock{position:absolute;z-index:1;left:50%;top:48%;translate:-50% -50%;width:max(22px,calc(var(--s)*40px));color:#fff4dc;filter:drop-shadow(0 2px 1px #332719);pointer-events:none}
.rc-zone-lock svg{display:block;width:100%;fill:currentColor}
/* 이름판 가운데를 작업장 아래 가장자리(plate 점)에 걸친다. 아래로만 자라면 세로 폰에서 줄 사이 틈(21px)보다 커서 아래 작업장 이름판처럼 보였다(10-27). */
.rc-zone-plate{position:absolute;z-index:2;translate:-50% -50%;display:flex;flex-direction:column;align-items:center;gap:calc(var(--s)*2px + 1px);padding:calc(var(--s)*4px + 2px) calc(var(--s)*8px + 3px) calc(var(--s)*4px + 3px);border:2px solid var(--rc-ink);border-radius:calc(var(--s)*8px + 4px);background:linear-gradient(var(--rc-cream),#f4e6c8);box-shadow:0 3px 0 var(--rc-lip),0 5px 8px #0002;color:var(--rc-ink);font-size:clamp(12px,calc(var(--s)*24px),24px);font-weight:800;line-height:1.1;white-space:nowrap;pointer-events:none}
.rc-zone-boss .rc-zone-plate:before{content:'';position:absolute;top:-2px;left:calc(50% - 12px);width:24px;height:4px;border-radius:0 0 3px 3px;background:#a94f36}
.rc-map[data-layout=low] .rc-zone-plate{font-size:12px;padding:4px 5px 5px}
.rc-zone-title{display:flex;align-items:baseline;gap:.3em}
.rc-map:not(.rc-map-names) .rc-zone-name{display:none}
.rc-map:not(.rc-map-names) .rc-zone-plate{flex-direction:row;gap:.35em}
.rc-zone-stars{display:flex;gap:.12em;font-size:1.05em}
.rc-zone-stars>span{display:block;width:1em;height:1em}
.rc-zone-stars svg{display:block;width:100%;height:100%;fill:#c3c7cc;stroke:#6b5a48;stroke-width:7;stroke-linejoin:round;paint-order:stroke}
.rc-zone-stars .filled svg{fill:#ffc23a;stroke:#7a4f12}
.rc-zone-locked .rc-zone-plate{background:linear-gradient(#ece6da,#d9d1c1);color:#6b6157}
.rc-zone-here .rc-zone-plate{border-color:#c96f12;box-shadow:0 0 0 3px #ffd457,0 3px 0 var(--rc-lip),0 5px 8px #0002}
.rc-zone:not(:disabled):hover .rc-zone-plate{translate:-50% calc(-50% - 2px)}
.rc-zone-worker{position:absolute;z-index:3;aspect-ratio:100/128;translate:-50% -100%;background:no-repeat 0 0/800% 100%;pointer-events:none}
.rc-zone-arrow{position:absolute;z-index:4;width:max(28px,calc(var(--s)*50px));translate:-50% -100%;pointer-events:none;animation:rc-map-bob 1.1s ease-in-out infinite}
.rc-zone-arrow svg{display:block;width:100%;fill:#ffcf4a;stroke:var(--rc-ink);stroke-width:3;stroke-linejoin:round}
@keyframes rc-map-bob{50%{transform:translateY(-18%)}}
@media (prefers-reduced-motion:reduce){.rc-zone-arrow{animation:none}}
.rc-map-note{position:absolute;z-index:2;left:50%;bottom:max(8px,1.2vh);translate:-50% 0;margin:0;padding:.3em .9em;border:2px solid var(--rc-ink);border-radius:999px;background:#fff8e8e8;color:var(--rc-ink);font-size:max(13px,1.7vh);font-weight:700;white-space:nowrap;pointer-events:none}
@media (max-height:500px){.rc-map-note{display:none}}`;
 const backSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3.5 5.5 12 17 20.5z"/></svg>';
 const starSVG='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 63 34 93 38 71 59 77 91 50 76 23 91 29 59 7 38 37 34Z"/></svg>';
 const lockSVG='<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M7 12V8a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="3"/><rect x="3.5" y="11.5" width="17" height="14" rx="3"/><circle cx="12" cy="18.5" r="2.2" fill="#2b2f36"/></svg>';
 const arrowSVG='<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M13 3h14v20h10L20 45 3 23h10z"/></svg>';
 // 판 고르기는 놀이 화면(factory.js pickStage)과 같은 기준에 위 막대 높이를 뺀다. 세로 · 낮은 가로 그림이 없으면 넓은 가로를 쓴다.
 function pick(M,{w,h,top=0}){const r=w/Math.max(1,h-top);return r<.9&&M.tall?'tall':r>=1.8&&h<=500&&M.low?'low':'wide';}
 // 배율은 box가 위 막대 아래 · 쪽지 위에 다 들어가는 가장 큰 값. 바탕 그림은 box보다 넓어서 남는 화면을 덮는다(놀이 화면과 같은 방식).
 function fit(S,{w,h,top=0,bottom=0}){const [bx,by,bw,bh]=S.box,uh=Math.max(1,h-top-bottom),s=Math.min(w/bw,uh/bh);return{s,x:(w-bw*s)/2-bx*s,y:top+(uh-bh*s)/2-by*s};}
 function map({parent,art,family:name,grade,config,store,back,start,data}){
  const ui=window.GFModesUI,M=family.mapData,doc=parent.ownerDocument,win=doc.defaultView;
  // 자리 값을 못 읽었으면 공용 지도로 간다(놀 수는 있어야 한다).
  if(!M?.wide)return ui.map({parent,art,family:name,grade,config,store,back,start,data});
  const el=(...a)=>window.GFUI.node(...a),file=slot=>art?.slots?.[slot]?.file,url=f=>new URL(f,win.location.href).href,px=v=>`${v}px`;
  if(!doc.getElementById('rc-map-css')){const s=doc.createElement('style');s.id='rc-map-css';s.textContent=css;doc.head.append(s);}
  const screen=el('section','gf-mode-map rc-map',undefined,parent);screen.dataset.test='stage-map';window.GFUI.theme(screen,name);
  const world=el('div','rc-map-world',undefined,screen),floor=el('img','rc-map-floor',undefined,world);floor.alt='';floor.decoding='async';floor.draggable=false;
  const bar=el('div','rc-map-bar',undefined,screen),exit=el('button','rc-map-back',undefined,bar);
  exit.type='button';exit.dataset.test='map-back';exit.setAttribute('aria-label','시작 화면으로');exit.innerHTML=backSVG;exit.onclick=()=>{screen.remove();back();};
  // 별 · 도감을 한 판에 담는다. 셸 mapExtras가 첫 .gf-map-top 끝에 도감 칸을 붙이므로 이 판에 그 이름을 준다.
  const plate=el('div','gf-map-top rc-map-plate',undefined,bar),stages=config.stage.stages,have=store.total(grade);
  if(!data?.game?.gradeFree)el('span','rc-map-grade',`${grade}학년`,plate);
  const total=el('span','gf-map-total rc-map-stars',undefined,plate);total.innerHTML=`${starSVG}<span>${have} / ${stages.length*3}</span>`;total.setAttribute('aria-label',`모은 별 ${have}개`);
  // 지금 할 곳: 아직 별이 없는 첫 단계(공용 지도와 같다). 다 깨면 마지막 단계에 선다.
  const current=stages.find(s=>!store.stars(grade,s.id))?.id??stages.at(-1).id,worker=file(M.workerSlot||'v3-worker');
  const zones=stages.map(stage=>{
   const n=stage.id,level=store.stars(grade,n),locked=!store.unlocked(grade,n),boss=config.stage.bossAt.includes(n),here=n===current&&!locked;
   const b=el('button',`rc-zone${boss?' rc-zone-boss':''}${locked?' rc-zone-locked':level?' rc-zone-done':''}${here?' rc-zone-here':''}`,undefined,world);
   b.type='button';b.dataset.test=`stage-${n}`;b.disabled=locked;b.setAttribute('aria-label',`${n}단계 ${stage.title}${locked?' 잠김':` 별 ${level}개`}`);
   const z={n,b,locked,level,skin:el('span','rc-zone-skin',undefined,b)};
   if(locked)el('span','rc-zone-lock',undefined,b).innerHTML=lockSVG;
   if(here){z.worker=el('span','rc-zone-worker',undefined,b);if(worker)z.worker.style.backgroundImage=`url("${url(worker)}")`;z.arrow=el('span','rc-zone-arrow',undefined,b);z.arrow.innerHTML=arrowSVG;}
   z.tag=el('span','rc-zone-plate',undefined,b);const title=el('span','rc-zone-title',undefined,z.tag);el('b','rc-zone-no',String(n),title);el('span','rc-zone-name',stage.mapLabel||stage.title,title);
   const row=el('span','rc-zone-stars',undefined,z.tag);row.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)el('span',i<level?'filled':'',undefined,row).innerHTML=starSVG;
   b.onclick=()=>ui.stageDialog(screen,{art,stage,boss,family:name,start:button=>{screen.remove();start(stage.id,button);}});
   return z;
  });
  const note=stages.some(s=>!store.unlocked(grade,s.id))?el('p','rc-map-note','별 하나를 모으면 다음 작업장이 열려요',screen):null;
  let key;
  function place(){
   if(!screen.isConnected)return;
   const w=screen.clientWidth||win.innerWidth,h=screen.clientHeight||win.innerHeight,top=bar.offsetTop+bar.offsetHeight+8,bottom=note?.offsetParent?note.offsetHeight+12:0;
   const k=pick(M,{w,h,top}),S=M[k],origin=screen.getBoundingClientRect(),shown=()=>zones.filter(z=>!z.b.hidden);
   if(k!==key){
    key=k;screen.dataset.layout=k;const a=file(S.slot);floor.hidden=!a;if(a)floor.src=url(a);
    screen.style.setProperty('--rc-floor',S.floor||'');screen.classList.toggle('rc-map-names',S.names!==false);screen.classList.toggle('rc-map-noart',!file(S.locked));
   }
   // 이름판 글자는 12px 아래로 줄지 않아 작은 화면에선 그림보다 덜 줄어든다(844×390에서 맨 아래 이름판이 20px 나갔다).
   // 맨 아래 이름판이 화면 밖으로 나가면 그만큼 아래를 비우고 다시 맞추고, 옆으로 나간 이름판은 안쪽으로 민다.
   let extra=0;
   for(let tries=0;tries<3;tries++){
    draw(S,fit(S,{w,h,top,bottom:bottom+extra}));
    const over=Math.max(...shown().map(z=>z.tag.getBoundingClientRect().bottom-origin.top))-(h-bottom-6);
    if(!(over>.5))break;extra+=over;
   }
   for(const z of shown()){z.tag.style.marginLeft='';const r=z.tag.getBoundingClientRect(),dx=Math.max(0,origin.left+6-r.left)-Math.max(0,r.right-origin.left-(w-6));if(dx)z.tag.style.marginLeft=px(dx);}
  }
  function draw(S,f){
   const s=f.s,[W,H]=S.size;
   screen.style.setProperty('--s',String(s));
   Object.assign(floor.style,{left:px(f.x),top:px(f.y),width:px(W*s),height:px(H*s)});
   for(const z of zones){
    const Z=S.zones.find(q=>q.id===z.n);z.b.hidden=!Z;if(!Z)continue;
    const [rx,ry,rw,rh]=Z.rect,[cx,cy]=Z.plate||[rx+rw/2,ry+rh],skin=z.locked?file(S.locked):z.level?file(S.done):null;
    Object.assign(z.b.style,{left:px(f.x+rx*s),top:px(f.y+ry*s),width:px(rw*s),height:px(rh*s)});
    // 잠김 · 깸 조각은 바탕과 같은 크기의 한 장이라, 작업장 칸만큼 오려 보이면 바탕과 점 하나 어긋남 없이 겹친다.
    Object.assign(z.skin.style,{backgroundImage:skin?`url("${url(skin)}")`:'',backgroundSize:`${px(W*s)} ${px(H*s)}`,backgroundPosition:`${px(-rx*s)} ${px(-ry*s)}`});
    Object.assign(z.tag.style,{left:px((cx-rx)*s),top:px((cy-ry)*s)});
    if(z.worker){const [sx,sy]=Z.stand||[rx+rw*.3,ry+rh*.8],tall=(S.worker||110)*s;Object.assign(z.worker.style,{left:px((sx-rx)*s),top:px((sy-ry)*s),height:px(tall)});Object.assign(z.arrow.style,{left:px((sx-rx)*s),top:px((sy-ry)*s-tall-4)});}
   }
  }
  // 사이트 쪽 ✕는 지도에서 숨기고 소리 단추를 위 막대와 같은 네모로 바꾼다(site/css/play.css [data-ui-map]).
  const host=(()=>{try{const p=win.parent;return p!==win&&p.document.body.classList.contains('play-page')?p.document.body:null;}catch{return null;}})();
  if(host)host.dataset.uiMap='recycle';
  place();win.addEventListener('resize',place);doc.fonts?.ready?.then(place);
  const observer=new MutationObserver(()=>{if(screen.isConnected)return;win.removeEventListener('resize',place);observer.disconnect();if(host&&!doc.querySelector('.rc-map'))delete host.dataset.uiMap;});
  observer.observe(parent,{childList:true});
  return screen;
 }
 family.map=map;family.mapLayout={pick,fit};
})();
