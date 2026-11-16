(function(){
 'use strict';
 const R=window.GFFamilies.recycle.rules,shell=window.GFShell,F=()=>window.GFFamilies.recycle.factory;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),pointers=new Map(),downIds=new Set();let lastDown=null;
 const doc=window.document,STEP_SEC=.7;
 // 연습 생성 중에만 출발 단계를 건네고, 만든 판에 복사한 뒤에는 남기지 않는다.
 let practiceStageId=null;
 const ended=w=>w.over||w.timeLeft<=0||w.modeSession?.state.ended||!!doc&&window.__GAME?.state()==='end';
 const live=w=>(!doc||window.__GAME?.state()==='play')&&!ended(w)&&!w.hold&&!w.modeSession?.state.paused;
 function clear(w,end=false){for(const n of w.recycle.items)release(w,n);if(end){w.firstGuide?.remove();w.firstGuide=null;w.recycle.items=[];window.clearTimeout?.(w.recycle.tipTimer);w.recycle.tipAnimation?.cancel();w.recycle.tipNode?.remove();w.recycle.tipNode=null;w.recycle.flashAnimation?.cancel();w.recycle.flashNode?.remove();w.recycle.flashNode=null;w.recycle.wrongTip=null;for(const key of ['eventNode','dayNode','orderNode']){w.recycle[key]?.remove();w.recycle[key]=null;}w.recycle.eventBox=null;w.recycle.dayBox=null;w.recycle.orderSign=null;doc?.querySelectorAll('[data-test=recycle-order-heart]').forEach(n=>n.remove());if(w.recycle.stationState)Object.assign(w.recycle.stationState,{work:null,wait:null,out:[]});}}
  if(doc){
    // 지금 눌린 손가락을 센다. 정답 뒤 짧은 멈칫 동안 들어온 누름은 셸이 미뤄 부르는데, 그사이 손을 떼면 물건이 든 채 남았다(10-30 Codex 검수).
    window.addEventListener('pointerdown',e=>{lastDown={id:e.pointerId,x:e.clientX,y:e.clientY,target:e.target};downIds.add(e.pointerId);},true);
    // 포획을 잃으면(끌다가 판 밖에서 놓침 등) 취소와 같게 물건을 벨트로 돌린다(게임 규칙 13절).
    // 손을 뗀 뒤 따라오는 포획 풀림은 무시한다(pointerup이 먼저 와서 downIds에서 빠져 있다).
    for(const kind of ['move','up','cancel','lostcapture'])window.addEventListener(kind==='lostcapture'?'lostpointercapture':`pointer${kind}`,e=>{
      if(kind==='lostcapture'&&!downIds.has(e.pointerId))return;
      const phase=kind==='lostcapture'?'cancel':kind;
      if(phase==='up'||phase==='cancel')downIds.delete(e.pointerId);
      const p=pointers.get(e.pointerId);if(!p)return;
      if(!live(p.w)){clear(p.w,ended(p.w));return;}
      p.w.recycle.pending ||= [];p.w.recycle.pending.push([e.pointerId,e.clientX-p.ox,e.clientY-p.oy,phase]);
      if(e.cancelable)e.preventDefault();
    },{capture:true,passive:false});
    const drop=()=>{for(const p of [...pointers.values()])clear(p.w);};
    window.addEventListener('blur',drop);doc.addEventListener('visibilitychange',drop);
    window.GF?.on('pause',drop);
  }

 const mode=w=>w.practice?'practice':w.modeSession?.state.play||'endless';
 const comboTier=w=>{for(let n=w.combo.count;n>0;n--){const tier=window.GFFeel.comboTier(w.juice.feel,n);if(tier)return tier.step;}return 0;};
 const options=w=>({content:w.content,game:{modeKit:w.modeKit},play:mode(w),stageId:w.practice?w.recycle.practiceStageId:w.modeSession?.state.stage?.id,elapsed:w.time,t:w.time,progress:w.modeSession?.state.progress||0,comboTier:comboTier(w),fever:!!w.fever?.active,dayActive:!!w.recycle?.endless?.day});
 function setup(w){
  doc?.querySelector('[data-test=recycle-wrong-tip]')?.remove();
  doc?.querySelector('[data-test=recycle-wrong-flash]')?.remove();
  doc?.querySelector('[data-test=recycle-endless-event]')?.remove();
  doc?.querySelector('[data-test=recycle-day-strip]')?.remove();
  doc?.querySelector('[data-test=recycle-order-ticket]')?.remove();
  w.reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  w.coarsePointer=!!window.matchMedia?.('(pointer:coarse)').matches;
  w.recycle={items:[],uid:0,index:0,nextAt:.2,goldenIndex:0,saved:{},pile:0,reasks:[],focus:0,selected:'paper',selectorUsed:false,nextBot:0,spawned:[],fx:[],workerUntil:0,practiceStageId:w.practice?practiceStageId:null};
  w.recycle.cargo={};w.recycle.firstRight=[];w.recycle.mistakes=[];w.recycle.stationState={work:null,wait:null,out:[],blinkUntil:0};w.stats.prepped=0;w.stats.station=0;
  w.review ||= [];w.stats.special ||=0;w.stats.overcome ||=0;if(w.practice)w.lives=null;w.question=w.play.rule;
 }
 function ensure(w){
  const r=w.recycle;if(r.belt)return;const o=options(w);r.open=R.openBins(o);r.level=R.levelAt(o.game,w.time,o.play).index;
  if(w.practice){const ids=new Set((w.practice.items||[]).map(i=>i.id));r.practice=w.content.items.filter(i=>ids.has(i.id));r.open=R.BINS.filter(b=>r.open.includes(b)||r.practice.some(i=>i.bin===b));}
  r.goldenTimes=r.open.includes('can')?R.goldenTimes({...o,rng:w.rng}):[];
  if(mode(w)==='stage'&&!r.open.includes('can'))w.missions=w.missions.filter(m=>m.id!=='golden');
  // All stages share normalized spacing, independent of canvas geometry.
  const flow=w.modeKit.transport;r.flowGap=flow?flow.itemSize*1.5/flow.pathLength:0;
  r.belt=R.belt({...o,rng:w.rng,saved:()=>r.saved});
  if(mode(w)==='endless'&&w.modeKit.endless.days&&w.modeKit.endless.orders){
   r.endless=R.endlessSession({game:o.game,content:w.content,rng:shell.rng(Math.floor(w.rng()*4294967296))});
   const moment=w.juice.moment;
   w.juice.moment=(name,c={})=>{const banner=w.juice.feel.moments[name]?.banner;if(banner?.on&&name!=='end'&&!ended(w)){R.endlessNotice(r.endless,{kind:name,title:c.label??banner.text,duration:banner.ms/1000},w.time);return moment.call(w.juice,name,{...c,suppressText:true});}return moment.call(w.juice,name,c);};
  }
 }
 function syncEndless(w){const s=w.recycle.endless;if(!s)return;const before=s.events.length;w.score+=R.advanceEndless(s,w.time).points;for(let i=before;i<s.events.length;i++){const k=s.events[i].kind;if(k==='day-start'||k==='day-end')w.juice.moment(k==='day-start'?'place':'coin',F().at(w.recycle.L.path,0));}}
 function orderReward(w,bin){
  const r=w.recycle,s=r.endless;if(!s)return;const order=s.order,reward=R.endlessRight(s,w.time,bin);w.score+=reward.points;
  if(reward.points)r.completedOrder={...order,count:order.need,endedAt:w.time,box:r.orderSign&&{...r.orderSign}};
  if(reward.hearts&&w.modeSession.state.hearts<w.modeKit.endless.heartMax){
   w.modeSession.addHeart(reward.hearts);
   if(doc&&!w.reducedMotion){
    const target=doc.querySelector('.gf-hearts')?.getBoundingClientRect(),from=r.orderSign||r.bins.find(b=>b.id===bin)?.art.ink;
    if(target&&from){
     const heart=doc.createElement('span');heart.dataset.test='recycle-order-heart';heart.textContent='♥';
     heart.style.cssText=`position:fixed;left:${from.x+from.w/2}px;top:${from.y+from.h/2}px;color:#ed6479;font:24px sans-serif;line-height:1;pointer-events:none;z-index:30;transform:translate(-50%,-50%)`;doc.body.append(heart);
     const motion=heart.animate([{translate:'0 0',opacity:1},{translate:`${target.x+target.width/2-from.x-from.w/2}px ${target.y+target.height/2-from.y-from.h/2}px`,opacity:.5}],{duration:650,easing:'ease-in'});motion.finished.then(()=>heart.remove(),()=>heart.remove());
    }
   }
  }
  if(reward.points)w.juice.moment('treasure',F().binArt(r.bins.find(b=>b.id===bin)).mouth);
 }
 let nameContext;
 function measureName(name,font){
  if(!doc?.createElement)return undefined;
  const g=nameContext||=doc.createElement('canvas').getContext('2d');
  g.font=`${font}px DoHyeon, sans-serif`;return g.measureText(name).width;
 }
 function layout(w){
  doc?.documentElement?.toggleAttribute('data-recycle-quota',mode(w)==='stage'&&w.modeSession.state.stage.goal.kind==='quota');
  ensure(w);w.cardReserve??=cfg.cardReserve({w:w.view.w,h:w.view.h});w.view.top=playfieldTop({w:w.view.w,h:w.view.h});const r=w.recycle;r.L=F().build({x:0,w:w.view.w,h:w.view.h,top:w.view.top,bottom:w.cardReserve,binIds:R.BINS,dpr:window.devicePixelRatio||(w.view.w<900?2:1),stages:window.GFFamilies.recycle.stages,slots:w.art.slots,names:w.content.bins.map(b=>b.name),numbered:!w.coarsePointer,goalBins:mode(w)==='stage'?R.BINS:[],measureName});
  r.size=r.L.size;r.bins=r.L.bins;r.worker=r.L.worker;r.pileBox=r.L.pile;
  for(const n of r.items)if(n.drag){n.drag.x=clamp(n.drag.x,r.size/2,w.view.w-r.size/2);n.drag.y=clamp(n.drag.y,(w.view.top||0)+10+r.size/2,w.view.h-(w.cardReserve||0)-r.size/2);}
 }
 function position(w,n){const p=F().at(w.recycle.L.path,n.s);return{x:n.drag?.x??p.x,y:n.drag?.y??p.y,size:w.recycle.L.size};}
 function release(w,n){if(n.drag)pointers.delete(n.drag.id);n.held=false;delete n.drag;}
 function pullEmpty(w){const r=w.recycle;if(!w.practice&&mode(w)!=='endless'&&!r.items.some(n=>!n.held))r.nextAt=Math.min(r.nextAt,w.time+w.modeKit.beltPace.pull);}
 function remove(w,n){release(w,n);w.recycle.items=w.recycle.items.filter(i=>i!==n);pullEmpty(w);}
 function review(w,n,kind,chosen,reask=true){
  const r=w.recycle;if(!r.mistakes.some(m=>m.item.id===n.id))r.mistakes.push({item:n.item,kind,chosen});
  if(w.practice)return null;let row=w.review.find(r=>r.item.id===n.id);
  if(!row){row={item:n.item,kind,chosen,overcome:false};w.review.push(row);}else Object.assign(row,{kind,chosen,overcome:false});
  if(reask&&!n.reask)w.recycle.reasks.push({id:n.id,at:w.time+25,row});
  // 통 오답은 아래 설명 띠가 맡는다. 놓친 물건의 기존 복습 카드는 유지한다.
  if(kind!=='wrong')w.showCard?.(n.item,kind);
  return row;
 }
 function miss(w,n){
  syncEndless(w);if(!n.golden&&w.recycle.endless)R.endlessError(w.recycle.endless,w.time);
  (w.recycle.pileCargo ||= []).push({item:n.item,done:n.done,golden:n.golden});
  remove(w,n);if(n.golden)return;w.combo.miss();w.mult=1;w.stats.missed++;w.judge?.('miss');w.modeSession?.addTime(-2);w.modeSession?.addHeart(-1);w.recycle.pile++;w.juice.moment('miss',F().at(w.recycle.L.path,1));review(w,n,'missed',null);
 }
 function heartBack(w,bin){
  const stage=w.modeSession?.state.stage,r=w.recycle,need=stage?.goal.need?.[bin];
  if(mode(w)!=='stage'||!stage.heartBack||!need||r.saved[bin]!==need)return;
  const before=w.modeSession.state.hearts;w.modeSession.addHeart(1);
  if(w.modeSession.state.hearts<=before||!doc)return;
  const target=doc.querySelector('.gf-hearts'),box=target?.getBoundingClientRect(),from=r.bins.find(b=>b.id===bin)?.art.goal;
  if(!box||!from)return;
  const heart=doc.createElement('span');heart.dataset.test='quota-heart-back';heart.textContent='♥';
  heart.style.cssText=`position:fixed;left:${from.x+from.w/2}px;top:${from.y+from.h/2}px;color:#ed6479;font:24px sans-serif;line-height:1;pointer-events:none;z-index:30;transform:translate(-50%,-50%)`;
  doc.body.append(heart);
  if(w.reducedMotion){heart.remove();return;}
  const motion=heart.animate([{translate:'0 0',opacity:1},{translate:`${box.x+box.width/2-from.x-from.w/2}px ${box.y+box.height/2-from.y-from.h/2}px`,opacity:.5}],{duration:650,easing:'ease-in'});
  motion.finished.then(()=>heart.remove(),()=>heart.remove());
 }
 function back(w,n){release(w,n);if(n.over)miss(w,n);}
 function send(w,uid,binId){
  ensure(w);const r=w.recycle,n=r.items.find(i=>i.uid===uid);if(!n||!r.open.includes(binId)||!live(w))return;
  syncEndless(w);
  const right=binId===(n.golden?'can':n.item.bin),at=position(w,n);r.lastChosen=binId;
  if(right&&!n.golden&&R.nextStep(n.item,n.done)){release(w,n);w.combo.miss();w.mult=1;n.bubble={text:'손질대로!',until:w.time+1.2};r.stationState.blinkUntil=w.time+.8;w.juice.moment('nope',at);return 'unready';}
  if(right){
   if(n.first){r.firstDone=true;r.nextAt=w.time+R.pace(options(w)).gap;w.firstGuide?.remove();w.firstGuide=null;}
   w.combo.hit();const pts=R.points({combo:w.combo.count,prepped:!!n.prepped,golden:n.golden,quick:w.time-n.born<=.6+1e-9})*(w.boost||1);
   w.score+=pts;w.stats.right++;w.stats.maxCombo=Math.max(w.stats.maxCombo,w.combo.count);w.mult=1+w.combo.level;
   w.juice.moment('right',{...at,points:pts,combo:w.combo.count});w.juice.moment('combo',{...at,combo:w.combo.count});
   if(n.golden){w.stats.special++;w.juice.moment('specialGet',at);if(mode(w)==='endless')w.modeSession?.addHeart(1);}
   if(n.reask&&!n.reask.overcome){n.reask.overcome=true;w.stats.overcome++;w.juice.moment('overcome',at);}
   w.closeCard?.();w.judge?.('right');
   const before=r.saved[binId]||0,need=mode(w)==='stage'?w.modeSession.state.stage.goal.need?.[binId]:null;
   r.saved[binId]=need?Math.min(before+1,need):before+1;
   if(r.saved[binId]>before)heartBack(w,binId);
   if(mode(w)==='stage')w.modeSession.setProgress(R.quotaProgress(w.modeSession.state.stage,r.saved));
   orderReward(w,binId);
   const D=window.GFFamilies.recycle.dex;if(D&&!n.golden)r.firstRight.push(...D.add(D.storage,w.content,[n.item.no]).added);
   const cargo=r.cargo[binId]||=[];const picture={id:n.id,name:n.item?.name||'황금 캔',slot:n.golden?'golden':'items',frame:n.golden?0:n.item.frames[Math.min(n.done,n.item.frames.length-1)]};
   const entry=cargo.find(i=>i.id===picture.id&&i.slot===picture.slot&&i.frame===picture.frame);if(entry)entry.count++;else cargo.push({...picture,count:1});
   const b=r.bins.find(b=>b.id===binId);r.fx.push({kind:'right',at:w.time,item:n.item,done:n.done,golden:n.golden,from:at,to:F().binArt(b).mouth,bin:binId});remove(w,n);return 'right';
  }
  if(n.first){r.firstDone=true;r.nextAt=w.time+R.pace(options(w)).gap;w.firstGuide?.remove();w.firstGuide=null;}
  if(r.endless)R.endlessError(r.endless,w.time);
  if(!w.protectCombo?.()){w.combo.miss();w.mult=1;}w.stats.wrong++;w.judge?.('wrong');w.juice.moment('wrong',at);
  if(!w.practice){w.closeCard?.();r.wrongTip={item:n.item,done:n.done,golden:n.golden,at:w.time,wallAt:doc?window.performance.now():null};}
  r.workerUntil=w.time+.6;
  // 틀린 물건은 통에 안 들어가고 레일 위 제자리(들고 있는 동안에도 흐른 자리)로 날아가 다시 흐른다. 하트는 레일 끝에 닿을 때만 깎인다(game.json modeKit.wrongCostsHeart:false).
  // 단계 · 연습 · 무한 모두(대표 10-29 「잘못된 통에 넣으면 … 다시 레일 맨 앞으로 (기존위치)」 · 「무한모드도 똑같이 바꾸자」, 10-30 「맨 앞은 … 반대야」: 트럭 쪽 처음 자리가 아니다). 들고 있다 레일 끝을 넘긴 물건은 다음 걸음에 놓친 것으로 친다.
  // 곧 다시 오므로 25초 뒤 재등장은 걸지 않고, 그 물건을 나중에 맞히면 극복으로 센다.
  const row=review(w,n,'wrong',binId,false);if(row)n.reask=row;release(w,n);Object.assign(n,{over:false,returnAt:w.time});r.fx.push({kind:'return',at:w.time,uid:n.uid,from:at,to:F().at(r.L.path,n.s)});return 'wrong';
 }
 function makeItem(w,item,golden=false,reask=null){return{uid:++w.recycle.uid,id:item.id,item,done:0,s:0,held:false,golden,reask,born:w.time};}
 const canSpawn=(w,bin)=>R.canSpawn({...options(w),saved:w.recycle.saved},bin);
 function spawn(w,item,golden=false,reask=null){if(!item||!canSpawn(w,golden?'can':item.bin))return null;const n=makeItem(w,item,golden,reask),r=w.recycle;r.items.push(n);r.spawned.push(golden?'golden':item.id);return n;}
 const room=(w,s)=>{const r=w.recycle;return r.items.every(n=>n.held||Math.abs(n.s-s)>=r.flowGap-1e-12);};
 function toStation(w,uid){
  if(ended(w)){clear(w,true);return;}if(!live(w))return;
  const r=w.recycle,n=r.items.find(i=>i.uid===uid),st=r.stationState;if(!n)return;
  if(n.golden||!R.nextStep(n.item,n.done)){release(w,n);n.bubble={text:'손질할 게 없어요',until:w.time+1.2};w.juice.moment('nope',position(w,n));return 'nothing';}
  if(st.work&&st.wait){release(w,n);n.bubble={text:'가득 찼어요',until:w.time+1.2};w.juice.moment('nope',position(w,n));return 'full';}
  remove(w,n);n.left=STEP_SEC;n.bubble=null;
  if(!st.work)st.work=n;else st.wait=n;w.stats.station++;w.juice.moment('place',F().stationArt(r.L.station).sink);return 'station';
 }
 function stationStep(w,dt){
  const r=w.recycle,st=r.stationState,n=st.work,b=r.L.station,A=F().stationArt(b),step=n?.item.steps[n.done],at=step==='rinse'?A.sink:step?.startsWith('tap:')?A.press:A.table;
  if(n&&!n.outputting){
   n.left-=dt;
   if(n.left<=1e-9){
    const step=n.item.steps[n.done++];w.juice.moment(R.momentOf(step),at);r.fx.push({kind:'prep',step,at:w.time,...at});
    if(step==='peel:label'){if(r.open.includes('vinyl'))n.label=true;else r.fx.push({kind:'part',step,at:w.time,...at});}
    else if(step.startsWith('peel:'))r.fx.push({kind:'part',step,at:w.time,...at});
    if(n.done<n.item.steps.length)n.left+=STEP_SEC;
    else {n.left=0;n.outputting=true;n.prepped=true;w.stats.prepped++;st.out.push(n);if(n.label)st.out.push({...makeItem(w,R.item(w.content,w.content.labelPiece)),newPart:true});w.juice.moment('rise',at);r.fx.push({kind:'ready',at:w.time,...at});}
   }
  }
  const returnAt=w.modeKit.transport.returnAt;
  st.out=st.out.filter(n=>!n.newPart||canSpawn(w,n.item.bin));
  if(st.out.length&&room(w,returnAt)){
   const done=st.out.shift();done.s=returnAt;done.over=false;done.born=w.time;done.returnAt=w.time;r.items.push(done);
   r.fx.push({kind:'return',at:w.time,uid:done.uid,from:A.out,to:F().at(r.L.path,done.s)});
  }
  if(st.work?.outputting){st.work=st.wait;st.wait=null;}
 }
 function station(w){
  if(ended(w))clear(w,true);const st=w.recycle.stationState;
  const snapshot=n=>n?{uid:n.uid,id:n.id,done:n.done,left:n.left}:null;
  return{...w.recycle.L.station,work:snapshot(st.work),wait:snapshot(st.wait),out:st.out.length,blinkUntil:st.blinkUntil};
 }
 function step(w,dt){
  ensure(w);const r=w.recycle;if(ended(w)){clear(w,true);return;}if(!live(w))return;syncEndless(w);const o=options(w);
  r.fx=r.fx.filter(f=>w.time-f.at<=2);
  if(!w.practice){
   const open=R.openBins(o),level=R.levelAt(o.game,w.time,o.play);
   if(mode(w)!=='stage'&&level.index>r.level){
    const ids=open.filter(id=>!r.open.includes(id));
    if(ids.length){r.fx.push({kind:'open',ids,at:w.time});const b=r.bins.find(b=>b.id===ids[0]);w.juice.moment('treasure',{x:b.x+b.w/2,y:b.y+b.h/2});}
    if(level.banner){if(r.endless)R.endlessNotice(r.endless,{kind:'level',title:level.banner},w.time);else r.banner={text:level.banner,at:w.time};r.fx.push({kind:'banner',text:level.banner,at:w.time});}
   }
   r.level=level.index;r.open=open;
  }
  for(const args of r.pending?.splice(0)||[])drag(w,...args);
  // 벨트 결이 물건과 같은 빠르기로 흐른다(무대 점 단위)
  r.beltPhase=(r.beltPhase||0)+dt*(r.L?.path.dots||0)/R.pace(o).cross;
  for(const n of [...r.items]){
   n.s+=dt/R.pace(o).cross*(n.first&&!r.firstDone ? .6 : 1);
   if(n.first&&!r.firstDone)n.s=Math.min(n.s,.94);
   if(n.s>=1){if(n.held){n.s=1;n.over=true;}else miss(w,n);}
  }
  stationStep(w,dt);
  if(ended(w)){clear(w,true);return;}
  // 손질대, 손에 든 물건, 던진 그림은 벨트의 다음 물건을 기다리게 하지 않는다.
  pullEmpty(w);
  const goldenAt=r.goldenTimes[r.goldenIndex]??(mode(w)==='endless'&&r.goldenTimes.length?R.goldenAt({game:o.game,index:r.goldenIndex}):Infinity);
  const goldenDue=w.time>=goldenAt;
  if(goldenDue&&!canSpawn(w,'can'))r.goldenIndex++;
  else if(goldenDue&&room(w,0)){r.goldenIndex++;const cans=w.content.items.filter(i=>i.bin==='can'),count=i=>r.spawned.filter(id=>id===i.id).length;spawn(w,cans.sort((a,b)=>count(a)-count(b))[0],true);w.juice.moment('coin',F().at(r.L.path,0));if(r.endless){r.endless.events.push({at:w.time,kind:'golden'});R.endlessNotice(r.endless,{kind:'golden',title:R.ENDLESS_TEXT.golden},w.time);}}
  const burst=r.endless?.burst;
  if(burst&&w.time+1e-9>=burst.at+burst.index*.35){
   // Lay the rapid deliveries into the first free belt spaces, keeping the normal belt speed and safe separation.
   const slots=[0,...r.items.filter(n=>!n.held).map(n=>n.s+r.flowGap)].sort((a,b)=>a-b),s=slots.find(s=>s<.4&&room(w,s));
   if(s!=null){
    const forced=R.item(w.content,burst.items[burst.index]),next=R.endlessDraw({session:r.endless,content:w.content,game:o.game,t:w.time,base:forced,forced}),n=spawn(w,next);n.s=s;n.dayBurst=true;burst.index++;
    if(burst.index===burst.items.length){r.endless.burst=null;r.nextAt=w.time+R.gapAfter({...o,item:next});}
   }
  }
  if(r.endless?.burst)return;
  if(w.time+1e-9>=r.nextAt&&!(w.firstGuide&&r.spawned.length&&!r.firstDone&&r.items.some(n=>n.first&&!n.held))){
   if(r.endless&&!room(w,0)){r.nextAt+=dt;return;}
   r.reasks=r.reasks.filter(q=>canSpawn(w,R.item(w.content,q.id).bin));
   const row=r.reasks.find(q=>q.at<=w.time),drawn=!row&&!r.practice?.length?r.belt.at(r.index):null;let next=row?R.item(w.content,row.id):r.practice?.length?r.practice[Math.floor(w.rng()*r.practice.length)]:drawn?R.item(w.content,drawn.id):null;
   const first=!!w.firstGuide&&!r.spawned.length;
   if(first)next=w.content.items.find(i=>r.open.includes(i.bin)&&canSpawn(w,i.bin)&&!i.steps.length&&!i.tricky);
   if(!next)return;
   if(r.endless&&!first)next=R.endlessDraw({session:r.endless,content:w.content,game:o.game,t:w.time,base:next});
   // 벨트 위 물건 수로 기다리지 않는다. 손을 대든 안 대든 시간 간격대로 계속 나온다(대표 10-29 「벨트에 갯수제한 풀라고. 7개 말고 시간별로는 계속 나오게」).
   // 옛 규칙(손대지 않은 물건이 둘이면 기다림)은 30초 넘는 벨트와 겹쳐 손을 대지 않는 판이 30초 가까이 멈춘 듯 보였다.
   if(!room(w,0)||!r.open.includes(next.bin))r.nextAt+=dt;
   else{const used=row&&row.id===next.id;if(used)r.reasks.splice(r.reasks.indexOf(row),1);const n=spawn(w,next,false,used?row.row:null);if(first)n.first=true;r.nextAt+=R.gapAfter({...o,item:next,i:r.index++});}
  }
 }
 const front=w=>w.recycle.items.filter(n=>!n.held).sort((a,b)=>b.s-a.s)[0]?.uid??null;
 const inside=(b,x,y,pad=0)=>x>=b.x-pad&&x<=b.x+b.w+pad&&y>=b.y-pad&&y<=b.y+b.h+pad;
 // 놓은 자리의 통: 몸통 → 누르는 칸 → 넓힌 칸(pad) 차례. 넓힌 칸은 옆 통 몸통까지 덮으므로(세로 폰) 맨 나중에, 여럿이면 칸에 가장 가까운 통.
 const gapTo=(b,x,y)=>Math.hypot(Math.max(b.x-x,0,x-b.x-b.w),Math.max(b.y-y,0,y-b.y-b.h));
 const binAt=(r,x,y,pad=0)=>{const A=b=>F().binArt(b);return r.bins.find(b=>inside(A(b).ink,x,y))||r.bins.find(b=>inside(A(b).hit,x,y))||(pad?r.bins.filter(b=>inside(A(b).hit,x,y,pad)).sort((a,b)=>gapTo(A(a).hit,x,y)-gapTo(A(b).hit,x,y))[0]:undefined);};
 function press(w,x,y,pointerId){
  if(!live(w)){clear(w,ended(w));return;}ensure(w);const r=w.recycle;
  // 물건만 잡는다(누르는 칸이 겹치면 가운데가 가까운 것). 통 · 손질대를 그냥 누르면 아무 일도 없다(대표 10-27 「끌어 넣기만」, 맨 앞 물건 고리가 없어져 숨은 동작이 됐다).
  const n=r.items.filter(n=>!n.held).map(n=>{const p=position(w,n);return{n,d:Math.hypot(p.x-x,p.y-y)};}).filter(o=>o.d<=r.L.hitSize/2).sort((a,b)=>a.d-b.d)[0]?.n;
  if(!n)return;
  // 멈칫 뒤에 미뤄 불린 누름인데 손가락이 이미 떨어졌으면 잡지 않는다. 잡으면 판 밖에서 놓아도 놓은 신호가 오도록 포획한다.
  const d=lastDown;if(pointerId==null&&d&&!downIds.has(d.id)){lastDown=null;return;}
  const id=pointerId??d?.id??'h';n.held=true;n.hovered=null;n.drag={id,x,y};pointers.set(id,{w,ox:d?d.x-x:0,oy:d?d.y-y:0});lastDown=null;try{d?.target?.setPointerCapture?.(d.id);}catch{}pullEmpty(w);w.juice.moment('grab',{x,y});
 }
 function drag(w,id,x,y,phase){
  if(!live(w)){clear(w,ended(w));return;}const r=w.recycle,n=r.items.find(n=>n.drag?.id===id);if(!n)return;
  const half=r.size/2;n.drag.x=clamp(x,half,w.view.w-half);n.drag.y=clamp(y,(w.view.top||0)+10+half,w.view.h-(w.cardReserve||0)-half);
  if(phase==='move'){const over=binAt(r,n.drag.x,n.drag.y),hover=over&&r.open.includes(over.id)?over:null;if(hover&&hover.id!==n.hovered)w.juice.moment('grab',{x:n.drag.x,y:n.drag.y});n.hovered=hover?.id??null;}
  if(phase==='cancel'){back(w,n);return;}
  if(phase==='up'){const direct=binAt(r,x,y),stationDirect=inside(r.L.station,x,y),b=direct||(!stationDirect?binAt(r,x,y,8):null),stationHit=inside(r.L.station,x,y,8);release(w,n);if(b&&r.open.includes(b.id))send(w,n.uid,b.id);else if(b&&direct)release(w,n);else if(stationHit)toStation(w,n.uid);else if(b&&!r.open.includes(b.id))release(w,n);else back(w,n);}
 }
 function key(w,i){
  if(!live(w)){clear(w,ended(w));return;}const r=w.recycle;if(r.botUid==null&&i!==R.BINS.length&&i>=0&&i<=R.BINS.length+3)r.keyUsed=true;const uid=r.botUid??front(w);delete r.botUid;
  const move=delta=>{r.selectorUsed=true;const index=r.open.indexOf(r.selected);r.selected=r.open[(index+delta+r.open.length)%r.open.length];const b=r.bins.find(b=>b.id===r.selected);w.juice.moment('grab',F().binArt(b).mouth);};
  // 혼자 놀기 키 차례(family.json keys.solo): 숫자 1~통 수 · 스페이스(손질대) · ← → (통 고르기) · ↓(고른 통에 넣기)
  const N=R.BINS.length;if(i>=0&&i<N)send(w,uid,R.BINS[i]);else if(i===N)toStation(w,uid);else if(i===N+1||i===N+2)move(i===N+1?-1:1);else if(i===N+3)send(w,uid,r.selected);
 }
 function bot(w){
  const r=w.recycle;if(!live(w)||w.time<r.nextBot)return;
  const full=r.stationState.work&&r.stationState.wait;
  const n=[...r.items].filter(n=>!n.held).sort((a,b)=>b.s-a.s).find(n=>n.golden||!R.nextStep(n.item,n.done)||!full);if(!n)return;
  r.nextBot=w.time+w.botDelay;r.botUid=n.uid;
  if(!n.golden&&R.nextStep(n.item,n.done))return{key:R.BINS.length};
  r.botCount=(r.botCount||0)+1;
  const wrong=w.botKind==='wrong'||w.botKind==='mix'&&r.botCount%5===0||w.fxRng()>(w.botAccuracy??1),right=n.golden?'can':n.item.bin;
  const target=wrong?r.open[(r.open.indexOf(right)+1)%r.open.length]:right;
  return{key:R.BINS.indexOf(target)};
 }
 function draw(w,g){
  if(!live(w))clear(w,ended(w));window.GFFamilies.recycle.scene.draw(w,g);
 }
  function card(w,item,kind){const row=w.review.find(r=>r.item.id===item.id),name=id=>w.content.bins.find(b=>b.id===id)?.name||'';return{diff:false,title:item.name,picture:{slot:'v3-items',frame:item.frames[0]},wrong:kind==='missed'?'놓친 물건':name(row?.chosen||w.recycle.lastChosen),right:name(item.bin),note:item.tip};}
  function resultExtra(panel,{world:w,el}){
    const saved=w.recycle.saved,section=el('section','gf-recycle-saved',undefined,panel);section.dataset.test='saved-resources';
    const summaryPanel=panel.querySelector?.('.gf-result-summary'),host=summaryPanel||panel,heading=host.querySelector?.('h2,h3');if(heading)host.insertBefore(section,heading.nextSibling);else if(summaryPanel)host.append(section);
    section.style.cssText='text-align:center;line-height:1.4;font-size:clamp(12px,1.8vh,16px);padding:6px 10px;color:#24473e;background:#f5fff2;border-radius:12px;flex-shrink:0';
    const resources=w.content.bins.filter(b=>b.id!=='general'&&saved[b.id]);
    el('strong','',resources.length?'이번 판에 살린 자원':'이번 판엔 살린 자원이 없어요',section);
    const summary=el('div','gf-recycle-saved-summary',resources.slice(0,3).map(b=>`${b.name} ${saved[b.id]}개`).join(' · '),section);summary.dataset.test='saved-summary';
    const details=resources.length>0,title=details?el('button','gf-button','자세히 보기',section):section,body=details?el('div','',undefined,section):section;
    if(details){
      section.style.cssText+=';display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 6px;align-items:center';
      title.type='button';title.style.cssText='grid-column:2;grid-row:1/3;min-height:44px;width:auto;margin:0;padding:4px 6px;cursor:pointer;font:inherit;font-size:12px;color:inherit;white-space:nowrap';body.id='gf-recycle-resource-card';body.setAttribute?.('popover','auto');body.setAttribute?.('aria-label','이번 판에 살린 자원');title.setAttribute?.('popovertarget',body.id);
      body.style.cssText='position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);margin:0;width:min(320px,calc(100vw - 48px));max-height:60vh;overflow:auto;padding:16px;box-sizing:border-box;border:2px solid #769d8a;border-radius:16px;background:#f5fff2;color:#24473e;box-shadow:0 8px 32px #233e4466;text-align:left;font:14px/1.5 DoHyeon,sans-serif';
    }
    if(summaryPanel&&w.view.w<600&&w.view.h<750){
      const sizes={'.gf-result-stars':'height:50px;margin:0','.gf-result-star':'width:46px;height:46px','.gf-result-number':'font-size:48px','.gf-result-heading':'font-size:18px','.gf-result-stats':'font-size:12px;padding:4px 0'};
      for(const [selector,css]of Object.entries(sizes))for(const n of summaryPanel.querySelectorAll(selector))n.style.cssText+=`;${css}`;
    }
    const counts=el('div','',undefined,body);counts.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:0 12px';
    for(const b of resources)el('span','',`${b.name} ${saved[b.id]}개`,counts);
    for(const id of ['pet','carton'])if(saved[id]){const p=el('p','',w.content.saved[id],body);p.style.margin='4px 0 0';}
  }
  function guide(parent,family,id,art){return window.GFUI.guide(parent,family,id,art,{untilFirstItem:true,caption:'물건을 끌어서 알맞은 통에 넣어요',drag:()=>{
   const w=window.__GAME?.world(),n=w?.recycle.items.find(n=>n.first);if(!n)return null;
   const b=F().binArt(w.recycle.bins.find(b=>b.id===n.item.bin)).hit;
   return{from:position(w,n),to:{x:b.x+b.w/2,y:b.y+b.h/2}};
  }});}

 function endResources(w){const list=w.content.bins.map((b,i)=>({id:b.id,name:b.name,index:i,count:w.recycle.saved[b.id]||0,items:(w.recycle.cargo[b.id]||[]).map(p=>({...p}))}));
  return Object.assign(list,{firstRight:[...w.recycle.firstRight],mistakes:w.recycle.mistakes.map(m=>({...m})),content:w.content,modeKit:w.modeKit,endless:w.recycle.endless?{days:w.recycle.endless.history.map(d=>({id:d.id,name:d.name,perfect:d.perfect})),ordersFilled:w.recycle.endless.ordersFilled}:null});}
 const playfieldTop=({w,h})=>h<500||w>=700&&w<900&&h>w?0:w<=320?38:w<500?56:48;
 // 단계 목표 글은 무대에 칠한 트럭 자리(투입구 왼쪽 위)에 둔다
 const bannerActive=w=>w.recycle.banner&&w.time-w.recycle.banner.at<2.5;
 function assistAnchor(w){const L=w.recycle.L;return{box:L.truck,top:L.portrait&&w.recycle.endless?Math.max(w.view.top,120):L.portrait&&bannerActive(w)?Math.max(w.view.top,94):w.view.top,portrait:L.portrait,maxWidth:Math.max(160,L.truck.w)};}
 const startScreen=Object.assign((host,context)=>window.GFFamilies.recycle.start.render(host,context),{prepare:context=>window.GFFamilies.recycle.start.prepare(context)});
 function endScreen(host,context){
  const practice=context.actions?.practice;
  if(!practice)return window.GFFamilies.recycle.result.render(host,context);
  return window.GFFamilies.recycle.result.render(host,{...context,actions:{...context.actions,practice:(...args)=>{
   const previous=practiceStageId;practiceStageId=context.mode?.play==='stage'?context.mode.stage:null;
   try{return practice(...args);}finally{practiceStageId=previous;}
  }}});
 }
 // 효과 글(콤보 · 점수)이 놓이는 위쪽 띠. 효과 글이 피할 칸은 이 띠와 겹치는 통만 넘긴다(띠 밖 통까지 넘기면 자리 찾기 후보가 수백 개로 불어 그리기가 느렸다, 10-26 잼).
 function effectBounds(w){return{x:w.view.w*.35,y:Math.max((w.view.top||0)+10,w.recycle.eventBox?w.recycle.eventBox.y+w.recycle.eventBox.h+4:0,bannerActive(w)?w.recycle.L.portrait?98:42:0),w:w.view.w*.6,h:44};}
 const cfg={family:'recycle',compactHUD:true,assistBelowQuestion:true,questionDuration:3,goalOnBoard:true,playfieldTop,shortNote:'끌어서 넣어요',itemCards:true,shortItemCard:true,inlineItemCard:true,devicePixelGrid:true,cacheTextMeasure:true,cacheTextLayout:true,combo:{steps:[5,10,15]},setup,layout,step,draw,press,key,bot,guide,resultExtra,dialogExtra:resultExtra,endResources,endScreen,startScreen,mapExtras:(slot,context)=>window.GFFamilies.recycle.dexView.mapButton(slot,context),stageMap:o=>(window.GFFamilies.recycle.map||window.GFModesUI.map)(o),
  assistAnchor,cacheHUDGeometry:true,cpuCanvas:true,cacheEffectText:true,cacheVignette:true,
  cardReserve:({w,h})=>w<=320?20:h<750?40:24,
  hooks:{effectBounds,effectLabels:w=>{const b=effectBounds(w);return w.recycle.bins.filter(r=>r.x<b.x+b.w&&r.x+r.w>b.x&&r.y<b.y+b.h&&r.y+r.h>b.y);},
   items:w=>{if(ended(w))clear(w,true);return w.recycle.items.map(n=>({uid:n.uid,id:n.id,done:n.done,s:n.s,held:n.held,golden:n.golden,...position(w,n)}));},
   path:w=>w.recycle.L.path,front,send,drag,toStation,station,card,saved:w=>({...w.recycle.saved}),bins:w=>w.recycle.bins.map(b=>({...b,open:w.recycle.open.includes(b.id)}))}
 };
 window.GFFamilies.recycle.engine=cfg;
 function ready(){shell.play(cfg);}
 if(doc&&!window.GFFamilies.recycle.factory){
  const source=new URL(doc.currentScript.src),root=new URL('.',source),version=source.search;
  const load=name=>new Promise((resolve,reject)=>{const s=doc.createElement('script');s.src=new URL(name+'.js'+version,root);s.onload=resolve;s.onerror=()=>reject(Error(name+' load failed'));doc.head.append(s);});
  // 무대 자리 값(놀이 · 끝 화면). 시작 창 준비(start.js)도 stages.json을 읽지만 시작 창 없이 들어오는 길이 있어 여기서도 읽는다.
  const data=name=>fetch(new URL(name+version,location.href)).then(r=>{if(!r.ok)throw Error(name+' '+r.status);return r.json();});
  const places=Promise.all([data('stages.json'),data('end-stage.json')]).then(([s,e])=>{window.GFFamilies.recycle.stages||=s;window.GFFamilies.recycle.endStage=e;}).catch(e=>console.error(e));
  // 단계 지도 자리 값(map.js). 못 읽어도 놀이는 되고 지도만 공용 지도로 간다.
  const plan=data('map.json').then(m=>{window.GFFamilies.recycle.mapData=m;}).catch(e=>console.error(e));
  load('factory').then(()=>load('scene')).then(()=>load('dex')).then(()=>load('dex-view')).then(()=>load('result')).then(()=>load('start')).then(()=>load('map')).then(()=>places).then(()=>plan).then(ready);
 }else ready();
})();
