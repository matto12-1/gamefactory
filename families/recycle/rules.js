(function () {
  'use strict';
  window.GFFamilies ||= {};
  const BINS = ['paper','plastic','can','glass','vinyl','general','pet','carton','foam'];
  const NAMES = ['종이','플라스틱','캔','유리병','비닐','일반쓰레기','투명 페트병','종이팩','스티로폼'];
  const STEP_NAMES = {empty:'비우기',rinse:'헹구기','peel:label':'라벨 떼기','peel:tape':'테이프 떼기','peel:spring':'스프링 떼기','peel:pump':'펌프 떼기','peel:lid':'뚜껑 떼기','peel:straw':'빨대 빼기','peel:film':'비닐 덮개 떼기','peel:foil':'은박 떼기','peel:sticky':'끈끈이 떼기','tap:crush':'찌그러뜨리기','tap:fold':'접기','tap:unfold':'펼치기','tap:flatten':'납작하게 누르기','tap:deflate':'바람 빼기','tap:wrap':'신문지에 싸기'};
  const CARD_TEXT = {next:'다음',skip:'바로 시작',keys:'← → 키로 넘겨요'};
  const ENDLESS_TEXT = {today:'오늘은',end:'끝!',perfect:'완벽',order:'주문',done:'완료',complete:'주문 완료!',bonus:'덤',passed:'지나간 날',filled:'채운 주문',none:'없음',golden:'황금 캔이 왔어요!',count:'개',times:'번',others:'외',seconds:'초'};
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const item = (c,id) => c.items.find(i=>i.id===id);
  function check(c, f, game) {
    const e=[], fail=s=>e.push(s), ids=new Set(), nos=new Map(), frames=[];
    if (!c || Object.keys(c)[0] !== 'about') fail('첫 열쇠는 about이에요');
    if (!same(c?.bins,BINS.map((id,n)=>({id,name:NAMES[n]})))) fail('통 아홉과 차례를 확인해요');
    if (!Array.isArray(c?.items)) return [...e,'물건 표가 필요해요'];
    for (const i of c.items) {
      if (!/^[a-z0-9-]+$/.test(i.id) || ids.has(i.id)) fail('물건 이름표가 겹치거나 잘못됐어요'); ids.add(i.id);
      nos.set(i.no,(nos.get(i.no)||0)+1);
      if (!Number.isInteger(i.no) || i.no<1 || (nos.get(i.no)>1 && i.no!==44) || nos.get(i.no)>2) fail('조사 번호를 확인해요');
      if (typeof i.name!=='string' || !i.name.trim() || i.name.length>(f.limits?.nameMax||9)) fail('물건 이름 길이를 확인해요');
      if (!BINS.includes(i.bin)) fail('없는 통이에요');
      if (!Array.isArray(i.steps) || i.steps.some((s,n)=>!Object.hasOwn(STEP_NAMES,s) || s.startsWith('tap:') && n!==i.steps.length-1)) fail('손질 순서를 확인해요');
      if (!Array.isArray(i.frames) || i.frames.length!==i.steps?.length+1) fail('그림 장 수를 확인해요'); else frames.push(...i.frames);
      if (typeof i.tricky!=='boolean') fail('헷갈림은 참거짓이에요');
      if (typeof i.tip!=='string' || !i.tip.trim() || i.tip.length>(f.limits?.tipMax||40) || i.tip.includes('분리수거')) fail('도움말을 확인해요');
      if (typeof i.source!=='string' || !i.source.trim()) fail('근거가 필요해요');
    }
    const frameCount=f.art.find(a=>a.slot==='v3-items').frames;
    // 뺀 물건의 조사 번호와 그림 칸은 비워 둔다. 남은 물건의 저장 기록과 그림 번호는 유지한다.
    if (new Set(frames).size!==frames.length || frames.some(n=>!Number.isInteger(n)||n<0||n>=frameCount)) fail('그림 번호가 겹치거나 범위를 벗어났어요');
    if (item(c,c.labelPiece)?.bin!=='vinyl') fail('라벨 조각은 비닐이에요');
    for (const bin of BINS) if(c.items.filter(i=>i.bin===bin&&!i.tricky).length<2) fail('통마다 물건 둘 이상 필요해요');
    if (game) e.push(...checkModes(game.modeKit,c), ...checkLessons(c, game));
    return e;
  }
  // 「이렇게 버려요」 카드 표(설계서 3차 5.2). 쓴 물건은 그 단계 판에 실제로 나오는 것만이다.
  function checkLessons(c, game) {
    const e=[], stages=game.modeKit?.stage?.stages||[], rows=c.lessons;
    if (!Array.isArray(rows) || !same(rows.map(l=>l.stage),stages.map(s=>s.id))) return ['단계마다 카드 내용이 필요해요'];
    for (const l of rows) {
      const s=stageOf(game,l.stage), open=s.bins, F=focusOf(s), pages=Array.isArray(l.pages)?l.pages:[], fail=t=>e.push(`${l.stage}단계 카드: ${t}`);
      const shown=id=>{const i=item(c,id);return !!i&&open.includes(i.bin)&&(!i.tricky||s.tricky>0);}, prepped=id=>!!item(c,id)?.steps.length;
      const kinds=pages.map(p=>p.kind).join(' ');
      if (game.modeKit.stage.bossAt.includes(l.stage) ? kinds!=='recap' : !new RegExp('^bin'+'( bin)'.repeat(Math.max(0,F.length-1))+'( prep)?( tricky)?$').test(kinds) || !same(pages.filter(p=>p.kind==='bin').map(p=>p.bin),F) || kinds.includes('tricky')&&l.stage<4) fail('장 차례를 확인해요');
      for (const p of pages) {
        if (typeof p.text!=='string' || !p.text.trim() || p.text.length>28 || /[·…「」]|분리수거/.test(p.text)) fail('글을 확인해요');
        if (p.kind==='bin' && (!F.includes(p.bin) || !(p.items?.length>=2 && p.items.length<=4) || p.items.some(x=>!shown(x.id) || item(c,x.id).bin!==p.bin || x.done && !prepped(x.id)))) fail('통 장의 물건을 확인해요');
        if (p.kind==='prep' && (!(p.items?.length>=1 && p.items.length<=2) || p.items.some(id=>!shown(id) || !F.includes(item(c,id).bin) || !prepped(id)))) fail('손질 장의 물건을 확인해요');
        if (p.kind==='tricky' && (!Array.isArray(p.wrong) || !Array.isArray(p.right) || !p.wrong.length && !p.right.length || p.wrong.some(w=>!shown(w.item) || item(c,w.item).bin!==w.to || !open.includes(w.like) || w.like===w.to) || p.right.some(id=>!shown(id) || !F.includes(item(c,id).bin)))) fail('헷갈리는 물건을 확인해요');
        if (p.kind==='recap' && (!same(p.bins?.map(b=>b.bin),open) || p.bins.some(b=>!shown(b.item) || item(c,b.item).bin!==b.bin || b.done && !prepped(b.item)))) fail('배운 통을 확인해요');
      }
    }
    return e;
  }
  // 카드 장 목록. 물건은 그림 장까지 풀어 둔다(done이면 손질을 마친 모습 = frames의 마지막 장). 맨 끝은 늘 준비 장이다.
  function lessonPages(c, game, stageId) {
    const stage=stageOf(game,stageId), row=(c.lessons||[]).find(l=>l.stage===stageId);
    const pic=(id,done)=>{const i=item(c,id);return {item:i,frame:done?i.frames.at(-1):i.frames[0]};};
    const pages=(row?.pages||[]).map(p=>p.kind==='bin'?{kind:'bin',bin:p.bin,items:p.items.map(x=>pic(x.id,x.done)),text:p.text}
      :p.kind==='prep'?{kind:'prep',items:p.items.map(id=>{const i=item(c,id);return {item:i,bin:i.bin,frames:i.frames.slice(),steps:i.steps.map(s=>STEP_NAMES[s])};}),text:p.text}
      :p.kind==='tricky'?{kind:'tricky',bin:focusOf(stage)[0]??null,wrong:p.wrong.map(w=>({...pic(w.item),like:w.like,to:w.to})),right:p.right.map(id=>pic(id)),text:p.text}
      :{kind:'recap',bins:p.bins.map(b=>({bin:b.bin,...pic(b.item,b.done)})),text:p.text});
    return [...pages,{kind:'ready'}];
  }
  function checkModes(m,c) {
    const e=[], positive=n=>Number.isFinite(n)&&n>0;
    if(m?.transport&&(!positive(m.transport.pathLength)||!positive(m.transport.itemSize)||m.transport.pathLength<5*m.transport.itemSize||!Number.isFinite(m.transport.returnAt)||m.transport.returnAt<0||m.transport.returnAt>1||m.transport.reference?.stage!=='wide'||m.transport.reference?.file!=='stages.json'))e.push('물건 사이의 기준 간격을 확인해요');
    if (!positive(m?.endless?.hearts) || m.endless.heartMax<m.endless.hearts)e.push('하트 값을 확인해요');
    if (m?.endless?.unlock?.stages !== 10) e.push('무한 모드는 열 단계를 깨면 열려요');
    const p=m?.beltPace;
    if (!p || !['gap','cross'].every(k=>p[k]?.length===2&&p[k].every(positive)) || !positive(p.pull) || p.comboFactor!==1 || !positive(p.fever) || !positive(p.prepGap) || !positive(p.burst?.near) || !positive(p.burst?.far) || !positive(p.late?.from) || !(p.late?.until>p.late.from) || !(p.late.faster>=1))e.push('벨트 빠르기를 확인해요');
    const mix=m?.mix, share=x=>Number.isFinite(x)&&x>=0&&x<=1;
    if (!mix || !share(mix.focus))e.push('섞는 비율을 확인해요');
    const levels=m?.levels;
    if(!Array.isArray(levels)||levels.length!==5)e.push('판 안 단계를 확인해요');
    for(const [i,l]of (levels||[]).entries())if(!Number.isFinite(l.at)||l.at<0||(i?l.at<=levels[i-1].at:l.at!==0)||!Number.isInteger(l.bins)||l.bins<2||l.bins>BINS.length||i&&l.bins<levels[i-1].bins||!share(l.prep)||!share(l.tricky))e.push('판 안 단계 값을 확인해요');
    const endless = m?.endless?.levels;
    if (!Array.isArray(endless) || endless.length !== 4) e.push('무한 모드의 판 안 단계를 확인해요');
    for (const [i,l] of (Array.isArray(endless)?endless:[]).entries()) if (!Number.isFinite(l.at) || (i?l.at<=endless[i-1].at:l.at!==0) || l.bins!==BINS.length || !share(l.prep) || !share(l.tricky) || l.banner==='새 통이 열렸어요') e.push('무한 모드의 통 수와 비율을 확인해요');
    const days=m?.endless?.days,orders=m?.endless?.orders;
    if(!days||!['first','every','duration','intro','gapFactor','points','perfectFactor','trickyFactor'].every(k=>positive(days[k]))||days.duration>=days.every||days.intro>days.duration||!(days.share>0&&days.share<1)||days.gapFactor>1||days.trickyFactor>1||!Array.isArray(days.list)||days.list.length!==8)e.push('몰려오는 날의 숫자와 여덟 날을 확인해요');
    const dayIds=new Set(),dayNames=new Set();
    for(const d of (Array.isArray(days?.list)?days.list:[])){
      if(!d||typeof d.id!=='string'||!d.id.trim()||dayIds.has(d.id)||dayNames.has(d.name)||![d.name,d.hint].every(t=>typeof t==='string'&&t.trim()&&!/[\u00b7\u2014]/.test(t))||!Array.isArray(d.items)||d.items.length<2||new Set(d.items).size!==d.items.length||!Array.isArray(d.focus)||!d.focus.length||d.focus.length>2||new Set(d.focus).size!==d.focus.length||d.focus.some(id=>!d.items.includes(id))||!Array.isArray(d.bins)||d.bins.length<2||new Set(d.bins).size!==d.bins.length||d.bins.some(b=>!BINS.includes(b))||c&&(d.items.some(id=>!item(c,id)||!d.bins.includes(item(c,id).bin))||d.bins.some(b=>!d.items.some(id=>item(c,id)?.bin===b))))e.push('몰려오는 날의 이름과 물건과 통을 확인해요');
      dayIds.add(d?.id);dayNames.add(d?.name);
    }
    if(!orders||!['first','rest','points','hearts','heartEvery','noticeDuration','deliveryLead','lastDelivery'].every(k=>positive(orders[k]))||!Number.isInteger(orders.heartEvery)||!(orders.share>0&&orders.share<1)||!Array.isArray(orders.tiers)||orders.tiers.length!==3)e.push('주문의 숫자를 확인해요');
    for(const [i,t]of (Array.isArray(orders?.tiers)?orders.tiers:[]).entries())if(!t||!Number.isFinite(t.at)||(i?t.at<=orders.tiers[i-1]?.at:t.at!==0)||!Number.isInteger(t.need)||!positive(t.need)||!positive(t.duration))e.push('주문의 단계와 시간을 확인해요');
    const stages=m?.stage?.stages;
    if (!same(m?.stage?.bossAt,[5,10]) || stages?.length!==10)e.push('단계 열 개와 보스를 확인해요');
    let prev=[];
    for(const [n,s] of (Array.isArray(stages)?stages:[]).entries()){
      if(s.id!==n+1 || !Array.isArray(s.bins) || s.bins.length!==[2,2,3,4,4,5,6,8,9,9][n] || !same(s.bins,BINS.slice(0,s.bins?.length)) || !prev.every(b=>s.bins.includes(b)) || !(s.focus===null||typeof s.focus==='string'&&s.bins.includes(s.focus)||Array.isArray(s.focus)&&s.focus.length===2&&s.focus[0]!==s.focus[1]&&s.focus.every(b=>s.bins.includes(b))) || !positive(s.timeSec) || !positive(s.cross) || !positive(s.gap) || Object.hasOwn(s,'pace') || !share(s.prep) || !share(s.tricky) || !positive(s.hearts) || !positive(s.goal?.target) || s.goal?.kind!=='quota' || !s.title || !s.goal?.text || !s.goal?.label || typeof s.burst!=='boolean' || !Number.isInteger(s.starRules?.secondMaxWrong) || s.starRules.secondMaxWrong<0 || s.starRules?.maxWrong!==(s.id>=6?1:0) || s.starRules?.countMissed!==true)e.push('단계 값을 확인해요');
      if(s.focusShare!==undefined&&!share(s.focusShare))e.push('주인공 종류 몫을 확인해요');
      if(s.heartBack!==undefined&&typeof s.heartBack!=='boolean')e.push('통을 채울 때 하트 회복 설정을 확인해요');
      const need=s.goal?.need;
      if(s.goal?.kind!=='quota'||!need||Array.isArray(need)||typeof need!=='object'||!Object.keys(need).length||Object.entries(need).some(([b,n])=>!s.bins?.includes(b)||!Number.isInteger(n)||n<=0)||Object.values(need).reduce((a,b)=>a+b,0)!==s.goal.target)e.push('통마다 채울 개수를 확인해요');
      prev=Array.isArray(s.bins)?s.bins:[];
    }
    return e;
  }
  function checkArt(art, family) {
    // 3차부터 그림 칸은 family.json 목록(놀이 v3- · 단계 지도 map-)이 전부다
    const expected={};
    for(const spec of family?.art||[])if(spec.slot.startsWith('v3-')||spec.slot.startsWith('map-'))expected[spec.slot]=spec.frames||1;
    const e=[];
    if (!same(Object.keys(art?.slots||{}).sort(),Object.keys(expected).sort()))e.push('그림 칸 목록을 확인해요');
    for(const [id,n] of Object.entries(expected)) if(art?.slots?.[id]?.frames!==n)e.push(`${id}: 장 수를 확인해요`);
    return e;
  }
  function texts(c, game) {
    return [...Object.values(ENDLESS_TEXT),...(game?.modeKit?.endless?.days?.list||[]).flatMap(d=>[d.name,d.hint]),...(game?.modeKit?.endless?.levels||[]).map(l=>l.banner).filter(Boolean),...c.bins.map(b=>b.name),...c.items.flatMap(i=>[i.name,i.tip]),...Object.values(STEP_NAMES),...Object.values(c.saved),...(game?.modeKit?.stage?.stages||[]).flatMap(s=>[s.title,s.goal.label,s.goal.text]),...(game?.modeKit?.levels||[]).map(l=>l.banner).filter(Boolean),...(c.lessons||[]).flatMap(l=>l.pages.map(p=>p.text)),...Object.values(CARD_TEXT),'손질대','손질대로!','손질할 게 없어요','가득 찼어요','손질할 물건은 손질대로, 나머지는 통에 쏙!','열 단계를 차례로 깨요','이번 판에 살린 자원'];
  }
  const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,p)=>a+(b-a)*clamp(p);
  const stageOf=(g,id)=>g.modeKit?.stage?.stages.find(s=>s.id===id)||null;
  // 단계 주인공 통 목록. focus는 통 하나(글) · 둘(목록) · 없음(보스)이다(4차 8단계는 투명 페트병 · 종이팩 둘).
  const focusOf=s=>s?.focus==null?[]:[].concat(s.focus);
  const quotaProgress=(stage,saved)=>Object.entries(stage?.goal?.need||{}).reduce((n,[b,need])=>n+Math.min(saved[b]||0,need),0);
  // 목표가 없는 열린 통도 단계에서는 내보내지 않는다. 연습과 무한은 종전 그대로다.
  const canSpawn=(o,bin)=>{const need=o.play==='stage'?stageOf(o.game,o.stageId)?.goal.need:null,saved=typeof o.saved==='function'?o.saved():o.saved||{};return !need||(saved[bin]||0)<(need[bin]||0);};
  function levelAt(game,t=0) {
    const levels=game.modeKit.endless.levels;let index=0;
    for(let i=1;i<levels.length;i++)if(t>=levels[i].at)index=i;
    return {...levels[index],index,bins:BINS.slice(0,levels[index].bins)};
  }
  const openBins=({game,play,stageId,t=0})=>play==='practice'?(stageOf(game,stageId)?.bins||BINS).slice():play==='stage'?stageOf(game,stageId).bins.slice():levelAt(game,t).bins;
  const mixAt=({game,play,stageId,t=0})=>{const row=play==='stage'?stageOf(game,stageId):levelAt(game,t);return{prep:row.prep,tricky:row.tricky};};
  const nextStep=(i,done)=>i.steps[done]||null;
  const momentOf=s=>s?.startsWith('peel:')?'swing':s?.startsWith('tap:')?'press':'sink';
  function pace({game,play,stageId,elapsed=0,progress=0,fever=false}) {
    const p=game.modeKit.beltPace,stage=play==='stage'?stageOf(game,stageId):null;
    const curve=play==='endless'?(game.modeKit.endless.beltPace||p):p;
    const value=k=>stage?stage[k]:elapsed<=curve.late.from?lerp(...curve[k],elapsed/curve.late.from):lerp(curve[k][1],curve[k][1]/curve.late.faster,(elapsed-curve.late.from)/(curve.late.until-curve.late.from));
    return {gap:value('gap')*(fever?p.fever:1),cross:value('cross')};
  }
  function gapAfter(o) {
    const p=o.game.modeKit.beltPace,gap=pace(o).gap;
    const base=o.play==='stage'&&stageOf(o.game,o.stageId).burst?(o.i%2===0?p.burst.near:gap*p.burst.far):gap+(o.item.steps.length?p.prepGap:0);
    const eventFactor=o.play==='endless'&&o.dayActive?Math.min(o.fever?p.fever:1,o.game.modeKit.endless.days.gapFactor)/(o.fever?p.fever:1):1;
    return base*Math.max(.65,(p.comboFactor??.9)**(o.comboTier||0))*eventFactor;
  }
  function belt(o) {
    const {content,game,rng}=o,m=game.modeKit.mix,stage=o.play==='stage'?stageOf(game,o.stageId):null,F=focusOf(stage),focus=stage?.focusShare??m.focus,cache=[],counts=new Map(),each=new Map();let focused=0,wanted=0,prepped=0,tricked=0;
    const pick=a=>a[Math.floor(rng()*a.length)];
    function next(t) {
      const opened=openBins({...o,t}),bins=opened.filter(b=>canSpawn(o,b)),all=content.items.filter(i=>bins.includes(i.bin));
      if(!bins.length)return null;
      const need=stage?.goal?.need;
      const pending=need?bins:[];
      // 처음 두 개는 이 단계에서 새로 배우는 통(주인공 통)으로 보여 주고, 그 뒤로는 통마다 남은 개수만큼 섞어 낸다.
      // 옛 규칙(가장 큰 목표를 다 채울 때까지 그 통만)은 3단계에서 캔 9개가 끝날 때까지 캔만 나왔다(대표 10-30 「이렇게 말고 섞여서 나오게」).
      // 낸 물건을 놓쳐 남은 개수가 모두 0이면 덜 찬 통끼리 고르게 낸다.
      const deficit=b=>Math.max(0,need[b]-(each.get(b)||0));
      const intro=cache.length<2?pending.filter(b=>F.includes(b)):[],left=pending.reduce((n,b)=>n+deficit(b),0);
      const weights=need?bins.map(b=>intro.length?(intro.includes(b)?1/intro.length:0):left?deficit(b)/left:1/bins.length):bins.map(b=>F.length?(F.includes(b)?focus/F.length:(1-focus)/(bins.length-F.length)):1/bins.length);
      const groups=bins.map(b=>all.filter(i=>i.bin===b));
      const mix=mixAt({...o,t}),tricky=mix.tricky;
      const avail=groups.reduce((n,a,i)=>n+(a.some(x=>x.tricky)?weights[i]:0),0);
      const trickWant=need?clamp(tricky+(cache.length*tricky-tricked)*.25):tricky;
      const q=avail?clamp(trickWant/avail):0;
      // Empty categories cannot supply their share. Reweight eligible categories to retain the whole-belt targets.
      let base=0,flex=0;
      const choices=groups.map((a,i)=>[false,true].map(tr=>{
        const yes=a.filter(x=>x.tricky===tr),list=yes.length?yes:a,mass=weights[i]*(tr?q:1-q);
        const prep=list.some(x=>x.steps.length),plain=list.some(x=>!x.steps.length);
        if(prep&&!plain)base+=mass;else if(prep&&plain)flex+=mass;
        return list;
      }));
      // 쉬운 물건이 적은 통(유리 둘, 스티로폼 하나)은 몇 분 지나면 세 번 한도에 걸려 손질 물건만 남는다. 무한 모드는 넘친 만큼 다른 통이 쉬운 물건으로 갚는다.
      // 통별 목표도 편중된 통에서 생긴 차이를 전체 벨트에서 갚는다. 무한 모드의 보정은 그대로다.
      const want=mix.prep,lag=stage&&!need?0:(wanted-prepped)*.25,prepChance=flex?clamp((want-base+lag)/flex):0;wanted+=want;
      let r=rng(),bi=bins.length-1;for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0){bi=i;break;}}
      if(!need&&F.length&&focused<focus*cache.length-1)bi=bins.indexOf(F.reduce((a,b)=>(each.get(b)||0)<(each.get(a)||0)?b:a));
      if(!need&&stage?.id>=3&&F.includes(bins[bi])&&focused>=focus*(cache.length+1)+.5)do bi=(bi+1)%bins.length;while(F.includes(bins[bi]));
      const trick=rng()<q;let candidates=choices[bi][Number(trick)],prepared=rng()<prepChance;
      const subset=candidates.filter(i=>!!i.steps.length===prepared);if(subset.length)candidates=subset;
      const fresh=candidates.filter(i=>(counts.get(i.id)||0)<3);
      if(fresh.length)candidates=fresh;
      else {
        // 물건이 적은 주인공 통(스티로폼 셋)은 금방 세 번 한도에 닿는다. 헷갈리는 물건 여부는 지켜야 단계의 헷갈림 몫이 맞는다.
        const kin=groups[bi].filter(i=>i.tricky===trick),pool=kin.length?kin:groups[bi],alternatives=pool.filter(i=>(counts.get(i.id)||0)<3);
        if(alternatives.length)candidates=alternatives;
        else {const least=Math.min(...pool.map(i=>counts.get(i.id)||0));candidates=pool.filter(i=>(counts.get(i.id)||0)===least);}
      }
      if(cache.length>1&&cache.at(-1).id===cache.at(-2).id){const other=candidates.filter(i=>i.id!==cache.at(-1).id);candidates=other.length?other:groups[bi].filter(i=>i.id!==cache.at(-1).id);}
      const chosen=pick(candidates);counts.set(chosen.id,(counts.get(chosen.id)||0)+1);prepped+=!!chosen.steps.length;tricked+=chosen.tricky;each.set(chosen.bin,(each.get(chosen.bin)||0)+1);if(F.includes(chosen.bin))focused++;return chosen;
    }
    return {at(i,elapsed){if(!Number.isSafeInteger(i)||i<0)throw Error('Invalid belt index');while(cache.length<=i){const n=cache.length,prev=cache[n-1],t=elapsed??(prev?prev.t+gapAfter({...o,item:item(content,prev.id),i:n-1,elapsed:prev.t,fever:false}):0);const chosen=next(t);if(!chosen)return null;cache.push({id:chosen.id,t});}const row=cache[i];if(!canSpawn(o,item(content,row.id).bin)){const chosen=next(elapsed??row.t);if(!chosen)return null;row.id=chosen.id;}return row;}};
  }
  // Only endless play creates this state. The original belt keeps its random calls.
  function endlessSession({game,rng,content}){
    const config=game.modeKit.endless,shuffle=()=>{
      const list=config.days.list.slice();for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;
    };
    return{config,rng,shuffle,plainItems:new Set(content.items.filter(i=>!i.tricky).map(i=>i.id)),deck:shuffle(),nextDayAt:config.days.first,nextOrderAt:config.orders.first,day:null,order:null,previousBin:null,history:[],ordersHistory:[],ordersFilled:0,events:[],queue:[],notice:null,orderDraws:0,dayDraws:0,dayPicked:0,lastDayItem:null};
  }
  const orderTier=(config,t)=>config.orders.tiers.reduce((a,b)=>t+1e-9>=b.at?b:a);
  function endlessNotice(s,notice,t){
    advanceNotices(s,t);
    const n={...notice,duration:notice.duration??s.config.orders.noticeDuration};
    if(n.kind==='day-start'){
      if(s.notice)s.queue.unshift({...s.notice,duration:s.notice.until-t});
      s.notice={...n,at:t,until:t+n.duration};
    }else{s.queue.push(n);advanceNotices(s,t);}
  }
  function advanceNotices(s,t){
    if(s.notice&&t+1e-9>=s.notice.until)s.notice=null;
    if(!s.notice&&s.queue.length){const n=s.queue.shift();s.notice={...n,at:t,until:t+n.duration};}
  }
  function finishOrder(s,t,filled){
    const o=s.order;s.ordersHistory.push({...o,endedAt:t,filled});s.events.push({at:t,kind:filled?'order-filled':'order-end',bin:o.bin});s.previousBin=o.bin;s.order=null;s.nextOrderAt=t+s.config.orders.rest;
    if(!filled)return{points:0,hearts:0};
    s.ordersFilled++;endlessNotice(s,{kind:'order-filled',title:ENDLESS_TEXT.complete,detail:`+${s.config.orders.points}`},t);
    return{points:s.config.orders.points,hearts:s.ordersFilled%s.config.orders.heartEvery===0?s.config.orders.hearts:0};
  }
  function advanceEndless(s,t){
    let points=0;
    for(;;){
      const next=Math.min(s.day?.until??Infinity,s.order?.until??s.nextOrderAt,s.nextDayAt);if(next>t+1e-9)break;
      if(s.day&&s.day.until<=next+1e-9){
        const d=s.day,perfect=d.errors===0,bonus=d.right*s.config.days.points*(perfect?s.config.days.perfectFactor:1);
        s.history.push({...d,perfect,bonus});s.events.push({at:next,kind:'day-end',id:d.id});s.day=null;s.burst=null;points+=bonus;
        endlessNotice(s,{kind:'day-end',title:`${d.name} ${ENDLESS_TEXT.end}`,detail:`${perfect?ENDLESS_TEXT.perfect+'  ':''}${ENDLESS_TEXT.bonus} +${bonus}`,perfect},next);
      }
      if(s.order&&s.order.until<=next+1e-9)finishOrder(s,next,false);
      if(s.nextDayAt<=next+1e-9){
        // The hinted objects open the day right after the hint, then familiar objects fill the three.
        if(!s.deck.length)s.deck=s.shuffle();const d=s.deck.shift(),pool=d.items.filter(id=>!d.focus.includes(id)),preview=d.focus.slice(0,3);
        while(preview.length<3){const familiar=pool.filter(id=>s.plainItems.has(id)),choices=familiar.length?familiar:pool,id=choices[Math.floor(s.rng()*choices.length)];preview.push(id);pool.splice(pool.indexOf(id),1);}
        s.day={...d,preview,at:next,until:next+s.config.days.duration,right:0,errors:0};s.burst={at:next,index:0,items:preview};s.nextDayAt+=s.config.days.every;s.dayDraws=0;s.dayPicked=0;s.lastDayItem=null;
        s.events.push({at:next,kind:'day-start',id:d.id});endlessNotice(s,{kind:'day-start',title:`${ENDLESS_TEXT.today} ${d.name}!`,detail:d.hint,items:preview,duration:s.config.days.intro},next);
      }
      if(!s.order&&s.nextOrderAt<=next+1e-9){
        const tier=orderTier(s.config,next);if(!s.deck.length)s.deck=s.shuffle();
        const day=s.day||(s.nextDayAt<next+tier.duration?s.deck[0]:null),bins=(day?day.bins:BINS).filter(b=>b!==s.previousBin),bin=bins[Math.floor(s.rng()*bins.length)];
        s.order={bin,at:next,until:next+tier.duration,need:tier.need,count:0,offers:0};s.orderDraws=0;s.events.push({at:next,kind:'order-start',bin});
      }
    }
    if(s.burst&&t>=s.burst.at+s.config.days.intro)s.burst=null;
    advanceNotices(s,t);return{points};
  }
  function endlessRight(s,t,bin){
    if(s.day&&t>=s.day.at&&t<s.day.until)s.day.right++;
    if(s.order&&t>=s.order.at&&t<s.order.until&&bin===s.order.bin&&++s.order.count>=s.order.need)return finishOrder(s,t,true);
    return{points:0,hearts:0};
  }
  function endlessError(s,t){if(s.day&&t>=s.day.at&&t<s.day.until)s.day.errors++;}
  function endlessDraw({session:s,content,game,t,base,forced=null}){
    const d=s.day,o=s.order;
    const catchUp=o&&o.need>s.config.orders.tiers[0].need&&o.offers<o.need&&o.until-t<=gapAfter({game,play:'endless',elapsed:t,item:base})+s.config.orders.deliveryLead&&o.until-t>s.config.orders.lastDelivery;
    const orderSlot=o&&(catchUp||Math.ceil((s.orderDraws+1)*s.config.orders.share)>Math.ceil(s.orderDraws*s.config.orders.share));
    // Reserve order deliveries inside the day pool, then repay that slot from later draws.
    const daySlot=d&&(orderSlot||s.dayPicked<Math.round((s.dayDraws+1)*s.config.days.share));
    let pool=content.items;
    if(d)pool=pool.filter(i=>d.items.includes(i.id)===!!daySlot);
    if(orderSlot){const preferred=pool.filter(i=>i.bin===o.bin);if(preferred.length)pool=preferred;}
    let chosen=forced||base;
    if(!forced&&(d||orderSlot)){
      // Exclude the previous day object before choosing difficulty and preparation,
      // so avoiding a repeat does not discard those choices at the very end.
      if(d&&daySlot){const other=pool.filter(i=>i.id!==s.lastDayItem);pool=other.length?other:content.items.filter(i=>d.items.includes(i.id)&&i.id!==s.lastDayItem);}
      // Favor familiar objects in both pools during a day; mixed-bin trick pairs remain available.
      const mix=mixAt({game,play:'endless',t}),trick=s.rng()<mix.tricky*(d?s.config.days.trickyFactor:1),prep=s.rng()<mix.prep;
      const tr=pool.filter(i=>i.tricky===trick);if(tr.length)pool=tr;
      const pr=pool.filter(i=>!!i.steps.length===prep);if(pr.length)pool=pr;
      chosen=pool[Math.floor(s.rng()*pool.length)];
    }
    if(d){s.dayDraws++;if(d.items.includes(chosen.id)){s.dayPicked++;s.lastDayItem=chosen.id;}}if(o){s.orderDraws++;if(chosen.bin===o.bin)o.offers++;}
    return chosen;
  }
  const points=({combo=1,prepped=false,golden=false,quick=false})=>golden?150:10+Math.min(Math.max(0,combo)*2,20)+(prepped?10:0)+(quick?15:0);
  const goldenAt=({game,index})=>(index+1)*(game?.modeKit.endless.goldenEvery??90);
  function goldenTimes({play,game,stageId,rng}) {
    if(play==='practice'||play==='stage'&&game&&!stageOf(game,stageId).bins.includes('can'))return [];
    return play==='endless'?Array.from({length:3},(_,index)=>goldenAt({game,index})):[12+rng()*.5];
  }
  (window.GFFamilies.recycle ||= {}).rules = { check, checkModes, checkLessons, checkArt, texts, lessonPages, CARD_TEXT, ENDLESS_TEXT, STEP_NAMES, BINS, item,stageOf,focusOf,quotaProgress,canSpawn,levelAt,openBins,mixAt,nextStep,momentOf,belt,pace,gapAfter,points,goldenTimes,goldenAt,endlessSession,orderTier,advanceEndless,endlessRight,endlessError,endlessDraw,endlessNotice };
})();
