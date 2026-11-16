(function () {
  'use strict';
  const images = {}, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const names = ['몸풀기', '두 마리씩', '몰려온다', '대왕 두더지'];
  const tallKeys = ['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN'];
  const wideKeys = ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyA','KeyS','KeyD','KeyF','KeyG'];
  const api = window.GFMoleYard = { images };
  // 2인용 판에는 모드 기록(modeSession)이 없다. 마당 속도표는 「빠른 판」 것을 빌리고, 하트·도구·대왕 없이 60초를 간다.
  const mode = w => w.modeSession || (w.yardDuo ||= { config: w.modeKit || {}, state: { play: 'duo', stage: null, ended: false, nextPower: Infinity } });
  if(window.document&&window.parent!==window&&new URLSearchParams(window.parent.location.search).get('start')==='1') {
    const params=new URLSearchParams(location.search),play=params.get('play')||'quick';
    const observer=new MutationObserver(()=>{
      const b=document.querySelector(`[data-test="${play==='stage'?'stage-start':play==='endless'?'mode-endless':'start'}"]`);
      if(b){observer.disconnect();const url=new URL(window.parent.location.href);url.searchParams.delete('start');window.parent.history.replaceState(null,'',url);if(b.getAttribute('aria-pressed')==='false')b.click();b.click();}
    });observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  // 구절을 통째로 칩에 올리면 긴 쪽이 늘 틀린 말이라 읽지 않고도 고를 수 있다.
  // 바른 꼴과 틀린 꼴에서 서로 다른 토막 하나만 떼어 칩에 올린다.
  api.bossWords = item => {
    const right=item.right.split(' '),wrong=item.wrong[0].split(' ');
    if(right.length===wrong.length){
      const diff=right.map((part,i)=>i).filter(i=>right[i]!==wrong[i]);
      if(diff.length===1&&wrong[diff[0]]!==item.boss.other&&right[diff[0]]!==item.boss.other)return {bad:wrong[diff[0]],good:right[diff[0]]};
    }
    return {bad:item.wrong[0],good:item.right};
  };
  // 틀린 말이 늘 왼쪽이면 문장을 읽지 않아도 맞으니 문장마다 자리를 바꾼다.
  const sway = text => { let hash=0;for(const letter of text)hash=(hash*31+letter.codePointAt(0))%1000003;return hash%2===1; };
  api.bossQuestion = item => {
    const choices=[{word:api.bossWords(item).bad,wrong:true},{word:item.boss.other,wrong:false}];
    if(sway(item.boss.sentence+item.wrong[0]))choices.reverse();
    return {title:'틀린 말 찾기',prompt:item.boss.sentence.replace(item.right,item.wrong[0]),choices};
  };
  api.ready = typeof document === 'undefined' ? Promise.resolve() : (async () => {
    // 2인용은 누른 자리가 든 쪽 판의 망치만 따라온다.
    const under=event=>{const game=window.__GAME;if(!game?.world)return null;const ws=[game.world(0),game.world(1)].filter(w=>w?.yard);
      return ws.length<2?ws[0]||null:ws.find(w=>event.clientX>=w.view.x&&event.clientX<w.view.x+w.view.w&&event.clientY>=w.view.y&&event.clientY<w.view.y+w.view.h)||null;};
    document.addEventListener('pointermove',event=>{
      const w=under(event);if(!w||window.__GAME.state()!=='play')return;
      w.pointer={x:event.clientX-w.view.x,y:event.clientY-w.view.y};w.yard.pointerReal=true;
    });
    document.addEventListener('pointerdown',event=>{
      const w=under(event);if(w){w.pointer={x:event.clientX-w.view.x,y:event.clientY-w.view.y};w.yard.pointerReal=true;}
    });
  })();
  function ensure(w) {
    if (w.yard) return;
    w.yard = { cycle:0, phase:0, theme:0, nextSpawn:.4, spawnCount:0, golds:0, corrections:0,
      bosses:0, maxCombo:0, hammer:false, golden:false, clockUntil:0, reaskItem:null, boss:null, bossDone:-1, nextPower:25,
      touch:typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches };
    // B2 belongs to the active wrong-answer card. The card hook also builds
    // result reviews, whose compact comparison layout must stay intact.
    const showCard=w.showCard;
    if(showCard)w.showCard=(item,kind)=>{showCard(item,kind);if(kind==='wrong'&&w.card)w.card.presentation='mole-b2';};
    if(typeof document!=='undefined')document.body.classList.add('gf-mole-yard');
    w.yard.theme=Math.min(2,mode(w).state.stage?.yard??0);
    // 혼자 판의 황금 두더지는 「몰려온다」 단계에서 운으로 나온다. 2인용은 엔진이 정한 공용 시각(specialTimes)을 그대로 쓴다(step).
    if (!w.duo) { w.specialTimes = []; w.specialIndex = 0; }
    const oldRecord = w.record;
    w.record = (name, params) => {
      if (name === 'powerup') power(w, params.id);
      return oldRecord(name, params);
    };
    const judge = w.judge;
    w.judge = kind => {
      if (kind === 'wrong' && w.yard.protectedChallenge) {
        const hearts = mode(w).state.hearts;
        w.modePowers.shield++;
        judge?.(kind);
        w.record('challengeProtected', {hearts});
      } else judge?.(kind);
      if (mode(w).state.play === 'quick') mode(w).state.nextPower = Infinity;
    };
    mode(w).state.nextPower = Infinity;
    w.yard.nextPower = 25;
  }
  function power(w, id) {
    const y=w.yard;
    if (id === 'hammer') y.hammer=true;
    if (id === 'golden') y.golden=true;
    if (id === 'clock' && mode(w).state.play === 'endless') y.clockUntil=w.roundTime+10;
  }
  function phaseAt(w) {
    const stage=mode(w).state.stage;
    // A stage may name a calmer mole pattern (phase) while keeping its yard picture.
    if (stage) return stage.id===9?(w.roundTime<8?0:w.roundTime<25?1:2):stage.phase??stage.yard;
    // 2인용 60초: 몸풀기 → 두 마리씩 → 몰려온다(황금 두더지). 대왕은 한 판이 짧고 반쪽 화면이 좁아 넣지 않는다.
    if (w.duo) return w.roundTime<8?0:w.roundTime<25?1:2;
    const t=w.roundTime%70;
    // 대왕을 깬 주기에는 남은 시간을 빈 판으로 기다리지 않고 보통 두더지 판으로 돌아간다.
    if(t>=55)return w.yard?.bossDone===Math.floor(w.roundTime/70)?2:3;
    return t<10?0:t<30?1:2;
  }
  function hint(w) {
    if(typeof document==='undefined')return;
    const node=w.yard.hintNode ||= document.querySelector('.gf-note');if(!node)return;
    const keys=w.family.keys.solo.map(code=>code.slice(3));
    const rows=[];for(let i=0;i<keys.length;i+=w.yard.cols)rows.push(keys.slice(i,i+w.yard.cols).join(' '));
    node.classList.toggle('gf-key-hint',w.yard.phase!==3);
    node.textContent=w.yard.phase===3?'대왕의 틀린 말 조각을 눌러요':`키보드 ${rows.join(' / ')}`;
  }
  function layout(w) {
    ensure(w);
    const oldCols=w.yard.cols;
    const {w:W,h:H,top}=w.view, tall=H>W, extra=mode(w).state.play==='endless'&&w.yard.cycle>=3;
    // 2인용은 쪽마다 키가 여섯 개(Q W E / A S D, U I O / J K L)라 어느 방향이든 두 줄 세 칸이다.
    const rows=w.duo?2:tall?(extra?4:3):2, cols=w.duo?3:tall?3:(extra?6:5);
    // 2인용 오답 띠는 반쪽 너비라 한 줄이 짧아 조금 더 높게 둔다.
    w.cardReserve=w.duo?Math.max(44,Math.min(84,H*.12)):Math.min(58,H*.07);
    // 2인용은 아래 안내 칩(처음 3초, 화면 맨 아래 한 줄)이 두더지를 덮지 않게 바닥을 그만큼 띄운다. 양쪽 판은 같은 자리를 쓴다.
    const foot=w.duo?Math.max(H*.06,noteFoot()):H*.06;
    const low=window.matchMedia?.('(orientation: landscape) and (max-height: 500px)').matches;
    const boardTop=Math.max(top+5,H*.145,low&&w.duo?82:0);
    const box={x:W*.01,y:boardTop,w:W*.98,h:H-foot-boardTop};
    const cw=box.w/cols,ch=box.h/rows;
    w.yard.board=box; w.yard.cols=cols; w.yard.rows=rows;
    w.yard.scenery=null;
    w.yard.cardRef=null;w.yard.cardMeasured=false;
    w.yard.font=Math.ceil(H*.049);
    if(window.matchMedia?.('(orientation: landscape) and (max-height: 500px)').matches)
      w.yard.font=Math.max(w.yard.font,window.innerHeight<=300?20:24);
    w.pointer ||= {x:W*.83,y:H*.88};
    w.bg={slot:tall?'yard-tall':'yard-wide',dx:0,dy:0,dw:W,dh:H,d:0};
    w.holes=Array.from({length:rows*cols},(_,i)=>{
      const row=Math.floor(i/cols), scale=1.04+.08*row/Math.max(1,rows-1);
      const x=box.x+(i%cols+.5)*cw,hw=Math.min(cw*scale,2*Math.min(x,W-x));
      const hh=hw*w.art.yard.assets.hole.h/w.art.yard.assets.hole.w;
      return {x,y:box.y+(row+1)*ch-hh/2-3,w:hw,h:hh,usable:true,
        cell:{x:box.x+(i%cols)*cw,y:box.y+row*ch,w:cw,h:ch},row};
    });
    if(w.yard.phase===3){
      const s=bossShape(w),center=Math.floor(cols/2);
      if(tall)for(let i=0;i<w.holes.length;i++){
        const h=w.holes[i],row=Math.floor(i/cols),col=i%cols;
        h.w=W*(row===2?.32:.3);h.h=H*(row===0?.14:.12);
        h.x=W*(.16+col*.34);h.y=row===0?s.body.y+s.body.h+H*.02:row===1?s.body.y+s.body.h+H*.1:H*.91;
        if(i===center){h.x=W/2;h.y=s.body.y+s.body.h;h.w=s.body.w*1.12;h.h=H*.16;}
      }
      else for(let i=0;i<cols;i++){
        const h=w.holes[i];
        if(i===center){h.x=W/2;h.y=s.body.y+s.body.h;h.w=s.body.w*1.12;h.h=Math.min(ch*.85,H*.26);}
        else {const left=i<center,rank=left?i:cols-1-i;
          h.w=W*(tall?.14:.135);h.h=H*(tall?.17:.25);
          h.x=W*(left?(tall?.08:.085+rank*.135):(tall?.92:.915-rank*.135));
          h.y=s.board.y+s.board.h*.58;
        }
      }
    }
    // Boss holes keep exactly the same native aspect ratio as the normal yard.
    if(w.yard.phase===3)for(const h of w.holes)h.h=h.w*w.art.yard.assets.hole.h/w.art.yard.assets.hole.w;
    // 2인용 키는 family.keys.left·right 그대로다. 구멍 번호가 키 번호와 같고, 안내는 구멍마다 키 글자로 붙인다(drawKeys).
    if(!w.duo){w.family.keys.solo = tall?tallKeys.slice(0,rows*cols):extra?['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH']:wideKeys;
    hint(w);}
    const occupied=new Set();
    for(const m of w.moles){
      let index=oldCols&&oldCols!==cols?Math.min(rows-1,Math.floor(m.hole/oldCols))*cols+Math.min(cols-1,m.hole%oldCols):m.hole;
      if(index>=w.holes.length||occupied.has(index))index=w.holes.findIndex((h,i)=>!occupied.has(i));
      if(index<0)throw Error('새 화면에 두더지가 들어갈 구멍이 없어요');
      m.hole=index;occupied.add(index);m.box=shape(w,index,m.word).box;
    }
  }
  // 아래 안내 칩이 차지할 높이(숨어 있어도 계산된 글자 크기로 어림한다) + 위아래 틈. 문서가 없으면(단위 시험) 0.
  function noteFoot() {
    const node=typeof document!=='undefined'&&document.querySelector('.gf-assists .gf-note');if(!node)return 0;
    const s=getComputedStyle(node),px=v=>parseFloat(v)||0;
    return px(s.fontSize)*1.25+px(s.paddingTop)+px(s.paddingBottom)+px(s.borderTopWidth)+px(s.borderBottomWidth)+12;
  }
  // 2인용은 오답 띠가 쪽마다 하나씩 있다. 이 판 안에 놓인 띠를 고른다.
  function cardNode(w) {
    const nodes=[...document.querySelectorAll('[data-test="card"]')];
    if(!w.duo)return nodes[0]||null;
    return nodes.find(node=>{const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return x>=w.view.x&&x<w.view.x+w.view.w&&y>=w.view.y&&y<w.view.y+w.view.h;})||null;
  }
  function shape(w,i,text) {
    const h=w.holes[i], c=h.cell, font=w.yard.font;
    const depth=h.row/Math.max(1,w.yard.rows-1);
    const bodyW=w.view.tall?w.view.w*(.24+.07*depth):Math.min(c.w*.78,c.h*.68)*(.86+.14*depth);
    const idealHeight=Math.min(bodyW*1.17,c.h*.6), sw=c.w*(w.view.tall?.96:.86);
    let sh=Math.max(font*2.05,c.h*.29);
    if(text){
      const key=`${font}:${sw}:${text}`,cache=w.yard.textHeights ||= new Map();
      if(!cache.has(key)){
        const ctx=w.yard.measure ||= typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
        if(ctx)ctx.font=`${font}px DoHyeon`;let rows=1,line='';
        for(const part of text.match(/\S+\s*/g)||[]){const next=line+part,width=ctx?ctx.measureText(next.trimEnd()).width:next.trimEnd().length*font*.5;if(width>sw*.9&&line){rows++;line=part;}else line=next;}
        cache.set(key,Math.max(font*(rows*1.1+.3),c.h*.29));
      }
      sh=cache.get(key);
    }
    const previous=i>=w.yard.cols?w.holes[i-w.yard.cols]:null;
    const signTop=previous?Math.max(c.y+2,previous.y+previous.h/2+4):c.y+2;
    let base=c.y+c.h*Math.max(.78,Math.min(.98,(sh+idealHeight+signTop-c.y)/c.h));
    if(w.card){
      if(w.yard.cardRef!==w.card){w.yard.cardRef=w.card;w.yard.cardTop=w.view.h-(w.duo?w.cardReserve:Math.max(92,w.view.h*.1));w.yard.cardMeasured=false;}
      if(!w.yard.cardMeasured&&typeof document!=='undefined'){const node=cardNode(w);if(node){w.yard.cardTop=node.getBoundingClientRect().top-w.view.y;w.yard.cardMeasured=true;}}
      base=Math.min(base,w.yard.cardTop-8);
    }
    const bh=Math.min(idealHeight,base-sh-signTop);
    if(bh<=0)throw Error('두더지와 팻말이 제 칸에 들어가지 않아요');
    return {box:{x:h.x-bodyW/2,y:base-bh,w:bodyW,h:bh},sign:{x:h.x-sw/2,y:base-bh-sh,w:sw,h:sh},clipY:base};
  }
  // Moles stand long and come sparsely at first, then speed up toward the grade's floor as the round runs.
  function pace(w) {
    const p=mode(w).config.molePace,s=mode(w).state;
    const row=p.grades.find(g=>w.grade<=g.maxGrade)||p.grades.at(-1),phase=p.phases[Math.min(w.yard.phase,p.phases.length-1)];
    const tempo=Math.min(p.maxTempo,(1+w.roundTime*(p.accelerationPerSec[s.play]??p.accelerationPerSec.quick))*(1+(s.stage?.speed||0)));
    return {...phase,tempo,up:Math.max(row.minUpSec,row.upSec*phase.upScale/tempo),gap:Math.max(.25,phase.gapSec/tempo)};
  }
  function next(w, forceRight=false) {
    const y=w.yard, endless=mode(w).state.play==='endless';
    let challenge=endless&&y.cycle>=2&&w.rng()<.25;
    let picked;
    if(challenge&&w.grade===6) {
      const hardest=Object.values(w.content.bands).at(-1);
      const ordered=hardest.slice().sort((a,b)=>b.right.length-a.right.length);
      const item=ordered[Math.floor(w.rng()*Math.ceil(ordered.length/2))];
      picked={item,band:Object.keys(w.content.bands).at(-1),right:forceRight||w.rng()<.55};
      picked.word=picked.right?item.right:item.wrong[Math.floor(w.rng()*item.wrong.length)];
    } else if(challenge || endless&&w.grade>1&&w.rng()<.3) {
      const grade=challenge?Math.min(6,w.grade+1):w.grade-1;
      y.pickers ||= {}; y.pickers[grade] ||= window.GFFamilies.mole.rules.picker(w.content,grade,w.rng);
      picked=y.pickers[grade].next(forceRight);
    } else picked=w.picker.next(forceRight);
    return {...picked,challenge};
  }
  function mole(w,i,choice,extra={}) {
    const upTime=pace(w).up*(w.adapt?.stay.factor()||1)*(extra.warmup?1.3:1)+window.GFFamilies.mole.rules.readTime(choice.word);
    const m={...choice,...extra,hole:i,k:1,box:shape(w,i,choice.word).box,state:'rise',stateAt:w.time,t0:w.time,hittable:true,
      upTime,expires:w.time+upTime+.15,sprite:'mole-up',botDecided:false};
    w.moles.push(m);const h=w.holes[i];w.juice.moment('rise',{x:h.x,y:h.y,target:m,item:m.item});
    // 황금 기록은 손맛 장면 한 줄에 시각을 적는다(옛 엔진과 같은 꼴, 2인용은 정해진 공용 시각).
    if(m.golden) {const row=w.juice.moment('special',{x:h.x,y:h.y,item:m.item});if(row?.params)row.params.at=m.goldenAt??w.roundTime;else w.record('special',{at:m.goldenAt??w.roundTime});}
    return m;
  }
  function spawn(w, item=null, goldenAt) {
    const y=w.yard,rules=window.GFFamilies.mole.rules,reserved=w.card&&y.feedback?.card===w.card&&!y.feedback.boss?[y.feedback.selected,y.feedback.correct].filter(h=>h!==undefined):[];
    const free=w.holes.map((h,i)=>i).filter(i=>!reserved.includes(i)&&!w.moles.some(m=>m.hole===i));
    if(!free.length)return false;
    const seen=rules.shown(w);
    let choice=null;
    if(item) {
      if(rules.clash(seen,item))return false;
      // A re-asked word comes back alone, as either its right or its wrong form.
      const right=w.rng()<.5;
      choice={item,right,word:right?item.right:item.wrong[Math.floor(w.rng()*item.wrong.length)],challenge:false};
    } else for(let n=0;n<8&&!choice;n++){const c=next(w,y.phase===0&&y.spawnCount<3);if(!rules.clash(seen,c.item))choice=c;}
    if(!choice)return false;
    const golden=goldenAt!==undefined||!item&&!w.duo&&y.phase===2&&w.rng()<(y.golden?.55:mode(w).state.stage?.id===8?.35:.15);
    if(golden){choice.right=true;choice.word=choice.item.right;}
    mole(w,free[Math.floor(w.rng()*free.length)],choice,{golden,goldenAt,reask:!!item,warmup:!item&&y.spawnCount<3});
    if(item)w.record('reask',{right:item.right,at:w.roundTime});
    y.spawnCount++;return true;
  }
  function remember(w,m,kind) {
    if(!w.learning)return;
    let row=w.review.find(r=>r.item===m.item);
    if(!row){row={item:m.item,kind,overcome:false};w.review.push(row);}
    else {if(kind==='wrong')row.kind=kind;row.overcome=false;}
    // A re-asked word goes back in line through the kit; a first mistake joins the line 20 to 30 seconds later.
    if(m.reask)w.reask?.result(m.item,kind,w.roundTime);
    else if(kind==='wrong')w.reask?.add(m.item,w.roundTime,w.roundTime+w.timeLeft);
  }
  // Hitting a re-asked word's right form, or holding back on its wrong form, overcomes it.
  function overcome(w,m,delayMs=0) {
    const h=w.holes[m.hole],row=w.review?.find(r=>r.item===m.item);
    if(row)row.overcome=true;w.stats.overcome++;w.reask?.result(m.item,'right',w.roundTime);
    w.juice.moment('overcome',{x:h.x,y:h.y,item:m.item,delayMs});
  }
  // Re-asked moles still standing when the board is cleared go back in line.
  function clear(w) {
    for(const m of w.moles)if(m.reask&&m.hittable)w.reask?.result(m.item,'missed',w.roundTime);
    w.moles=[];
  }
  function learn(w,m,kind) {
    if(!w.adapt||m.warmup||m.challenge)return;
    const before=w.adapt.level();if(kind!=='missed')w.adapt.judge(kind==='right');
    if(m.right)w.adapt.stay.note(kind);
    if(before!==w.adapt.level())w.record('adapt',{level:w.adapt.level()});
  }
  function progress(w) {
    const s=mode(w).state.stage,y=w.yard;if(!s)return;
    const kind=s.goal.kind;
    const value=kind==='combo'?w.stats.maxCombo:kind==='golden'?y.golds:kind==='sentences'?y.corrections:w.stats.right;
    if(s.id===2&&w.stats.wrong>2)mode(w).end('mistakes');
    else mode(w).setProgress(value);
  }
  function swing(w,x,y,bounce=false,contact=false) {
    w.hammer={x,y,height:Math.min(w.view.w*.3,w.view.h*.26),t0:w.juice.clock,bounce};
    w.juice.moment('swing',{x,y,hit:contact&&!bounce});
  }
  function hit(w,m,neighbor=false) {
    if(!m?.hittable||w.yard.boss&&!w.yard.boss.defeated)return;
    const h=w.holes[m.hole],b=m.box;
    m.hittable=false;m.state=m.right?'hit':'taunt';m.stateAt=w.time;m.expires=w.time+.7;
    const timing=w.juice.feel.moments.swing||{windupMs:40,strikeMs:60},delayMs=timing.windupMs===0?0:timing.windupMs+timing.strikeMs;
    m.visual={contact:w.juice.clock+delayMs/1000,dizzyMs:400,sinkMs:180,until:w.juice.clock+.68};
    swing(w,h.x,b.y+b.h*.55,!m.right,true);
    if(m.right) {
      w.closeCard?.();
      const points=window.GFFamilies.mole.rules.points(w.combo.steps.filter(n=>w.combo.count+1>=n).length)*(w.fever?.active?2:1)*(m.golden?2:1)*(m.challenge?2:1);
      w.combo.hit();w.mult=1+w.combo.level;w.score+=points;w.stats.right++;w.stats.maxCombo=Math.max(w.stats.maxCombo,w.combo.count);
      const bounds=w.effectBounds(),suppressText=!!m.reask;
      w.juice.moment('right',{x:h.x,y:b.y+b.h*.5,textRow:clamp((h.y+w.yard.font*1.2-bounds.y)/bounds.h,.05,.9),target:m,points,combo:w.combo.count,item:m.item,delayMs,suppressText});
      w.juice.moment('dizzy',{x:h.x,y:h.y,target:m,delayMs});
      if(window.GFFeel?.comboTier(w.juice.feel,w.combo.count))w.juice.moment('combo',{x:h.x,y:b.y,combo:w.combo.count,delayMs,suppressText});
      if(m.golden){w.stats.special++;w.yard.golds++;w.juice.moment('specialGet',{x:h.x,y:h.y,item:m.item,delayMs});}
      if(m.reask)overcome(w,m,delayMs);
      w.judge?.('right');learn(w,m,'right');
      progress(w);
      if(mode(w).state.play==='endless'&&w.stats.right>=w.yard.nextPower){w.yard.nextPower+=25;window.__GAME?.milestone();}
    } else {
      const kept=w.protectCombo?.();if(!kept){w.combo.miss();w.mult=1;}
      // 2인용은 아무 키나 마구 눌러 이기지 못하게 틀리면 10점을 뺀다(옛 2인용 규칙 그대로).
      if(w.duo)w.score=Math.max(0,w.score-10);
      w.stats.wrong++;w.yard.protectedChallenge=!!m.challenge;
      w.judge?.('wrong');w.yard.protectedChallenge=false;
      w.juice.moment('wrong',{x:h.x,y:b.y,target:m,item:m.item,delayMs});
      remember(w,m,'wrong');learn(w,m,'wrong');w.showCard?.({...m.item,selectedWrong:m.word},'wrong');progress(w);
      w.yard.feedback={at:w.juice.clock+delayMs/1000,card:w.card,selected:m.hole,wrong:m.word,right:m.item.right};
    }
    if(w.yard.hammer&&!neighbor&&m.right&&!mode(w).state.ended) {
      const near=w.moles.filter(n=>n.hittable&&n.right&&Math.floor(n.hole/w.yard.cols)===Math.floor(m.hole/w.yard.cols)&&Math.abs(n.hole-m.hole)===1);
      for(const other of near)if(!mode(w).state.ended)hit(w,other,true);
    }
  }
  function beginBoss(w) {
    const y=w.yard,stage=mode(w).state.stage;
    w.moles=[];
    const count=stage?.id===10?5:3;
    y.boss={hp:count,total:count,question:next(w,true).item,nextHit:0,defeated:false,pose:'boss',at:w.time};
    w.record('bossStart',{hp:count});
  }
  function bossShape(w) {
    const W=w.view.w,H=w.view.h,top=w.view.top;
    const finalBoss=mode(w).state.stage?.id===10;
    const tall=H>W, bw=Math.min(W*(tall?(finalBoss?.76:.7):(finalBoss?.38:.34)),H*(finalBoss?.65:.6));
    const board={x:W*(tall?.055:.3),y:Math.max(top+12,H*.145),w:W*(tall?.89:.4),h:w.yard.font*(tall?8.4:7.4)};
    const font=w.yard.font;
    const measure=w.yard.measure ||= typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
    if(measure)measure.font=`${font}px DoHyeon`;
    const chipWidth=text=>Math.max(font*2.8,(measure?measure.measureText(text).width:text.length*font*.5)/.9+font*1.1);
    const item=w.yard.boss?.question,choices=item?api.bossQuestion(item).choices:null,good=item?api.bossWords(item).good:'';
    // 고치고 나면 틀린 말 칩에 바른 말이 들어가니 둘 중 넓은 쪽에 맞춰 자리를 잡는다.
    const chipFor=i=>choices[i].wrong?Math.max(chipWidth(choices[i].word),chipWidth(good)):chipWidth(choices[i].word);
    const first=item?chipFor(0):chipWidth(''),second=item?chipFor(1):chipWidth(''),gap=font*.5;
    const stacked=first+second+gap>board.w*.92;
    if(stacked)board.h=font*(tall?10.4:9.1);
    // 이긴 뒤에는 팻말에 칭찬 한 줄만 남는다. 큰 팻말을 그대로 두면 쓰러진 대왕을 가리므로 줄인다.
    if(w.yard.boss?.defeated)board.h=font*2.6;
    // 대왕 그림은 384x448(서 있는 모습)·384x192(맞은 모습)이다. 가로로 늘리면 납작하게 눌려 어색하니
    // 남은 자리 안에서 비율을 지킨 가장 큰 크기를 쓴다. 마지막 대왕은 한 뼘 더 크다.
    const ratio=448/384,room=H*.91-(board.y+board.h-10);
    const bh=Math.max(Math.min(room,bw*ratio,H*(tall?.34:.40))*(finalBoss?1:.9),H*.1),bodyW=bh/ratio;
    const body={x:(W-bodyW)/2,y:board.y+board.h-10,w:bodyW,h:bh};
    // 맞은·쓰러진 모습은 높이가 반인 그림이라 발밑을 선 모습과 맞춰 깔아 놓는다.
    const low={...body,h:bodyW/2,y:body.y+bh-bodyW/2};
    const left=board.x+(board.w-first-second-gap)/2,chipY=board.y+font*(tall?5.5:4.2);
    // 팻말 그림은 위아래 12%가 나무 테두리다(sign 320x104의 줄별 색을 재서 얻은 값).
    // 글자가 테두리에 걸치면 나뭇결과 겹쳐 읽기 힘들어, 글자 자리는 모두 테두리 안쪽으로 잡는다.
    const faceX=board.x+8,faceW=board.w-16,faceY=board.y+board.h*.12;
    const title={x:faceX,y:faceY,w:faceW,h:font*1.1};
    return {board,body,low,face:{x:faceX,y:faceY,w:faceW,h:board.h*.76},title,
      ask:{x:faceX,y:title.y+title.h,w:faceW,h:chipY-title.y-title.h},chips:[
      {x:stacked?board.x+(board.w-first)/2:left,y:chipY,w:first,h:font*2.2},
      {x:stacked?board.x+(board.w-second)/2:left+first+gap,y:chipY+(stacked?font*2.4:0),w:second,h:font*2.2}]};
  }
  function bossHit(w,index) {
    const b=w.yard.boss;if(!b||b.defeated||w.time<b.nextHit)return;
    if(b.nextQuestion){b.question=b.nextQuestion;b.nextQuestion=null;b.corrected=null;}
    const s=bossShape(w),item=b.question,question=api.bossQuestion(item),found=!!question.choices[index]?.wrong;
    swing(w,s.body.x+s.body.w*.5,s.body.y+s.body.h*.3,!found,true);
    b.nextHit=w.time+(mode(w).state.stage?.id===10?.38:.55);b.pose=found?'boss-hit':'boss';
    if(found) {
      w.closeCard?.();
      w.combo.hit();w.stats.right++;w.stats.maxCombo=Math.max(w.stats.maxCombo,w.combo.count);
      const points=40*(w.fever?.active?2:1);w.score+=points;w.yard.corrections++;b.hp--;
      w.juice.moment('right',{x:s.body.x+s.body.w*.5,y:s.body.y,target:b,points,combo:w.combo.count,item,delayMs:100});w.judge?.('right');
      const row=w.review?.find(r=>r.item===item);if(row){row.overcome=true;w.stats.overcome++;}
      else if(w.review)w.review.push({item,kind:'wrong',overcome:true});
      b.corrected=item;
      w.record('sentenceCorrected',{wrong:item.wrong[0],right:item.right,hp:b.hp});
      if(!b.hp){b.defeated=true;b.pose='boss-down';b.downAt=w.time;w.yard.bosses++;mode(w).addHeart(1);w.record('bossDefeated',{cycle:w.yard.cycle});progress(w);}
      else {b.nextQuestion=next(w,true).item;progress(w);}
    } else {
      if(!w.protectCombo?.())w.combo.miss();w.stats.wrong++;w.judge?.('wrong');
      const selected=question.choices[index].word;
      const m={item,word:selected};remember(w,m,'wrong');w.showCard?.({...item,selectedWrong:selected},'wrong');
      w.yard.feedback={at:w.juice.clock+.1,card:w.card,boss:true,selected:index,correct:1-index,wrong:selected,right:api.bossWords(item).good};
      w.juice.moment('wrong',{x:s.body.x+s.body.w*.5,y:s.body.y,item,target:b,delayMs:100});progress(w);
    }
  }
  function step(w,dt) {
    ensure(w);const y=w.yard,cycle=mode(w).state.stage?0:Math.floor(w.roundTime/70),phase=phaseAt(w);
    w.boost=w.fever?.active?2:1;
    if(cycle!==y.cycle){y.cycle=cycle;y.theme=cycle%3;y.boss=null;clear(w);layout(w);w.record('yardCycle',{cycle,theme:y.theme});}
    if(phase!==y.phase){y.phase=phase;w.question=phase===3?'틀린 말만 골라요!':w.play.rule;clear(w);y.nextSpawn=w.time+.1;y.boss=null;layout(w);hint(w);w.record('yardPhase',{phase});}
    if(phase===3){if(!y.boss)beginBoss(w);
      // 쓰러진 대왕을 1.5초 보여 준 뒤에 도구 고르기 판을 띄우고, 닫히면 바로 다음 판으로 간다
      // (옛 코드는 깬 순간 도구 판을 띄워 쓰러지는 모습을 가렸고, 70초 주기가 끝날 때까지 빈 판에서 기다렸다).
      else if(y.boss.defeated){if(w.time-y.boss.downAt>=1.5&&!y.boss.cheered){y.boss.cheered=true;y.bossDone=cycle;if(mode(w).state.play!=='stage')window.__GAME?.milestone();}}
      else if(w.time>=y.boss.nextHit){y.boss.pose='boss';if(y.boss.nextQuestion){y.boss.question=y.boss.nextQuestion;y.boss.nextQuestion=null;y.boss.corrected=null;}}return;}
    if(w.roundTime<y.clockUntil)for(const m of w.moles)m.expires+=dt;
    w.moles=w.moles.filter(m=>{
      if(m.state==='rise'&&w.time-m.stateAt>=.15)m.state='up';
      if(w.time<m.expires)return true;
      if(m.hittable&&m.right&&!m.quiet){w.combo.miss();w.mult=1;w.stats.missed++;w.judge?.('miss');remember(w,m,'missed');learn(w,m,'missed');w.juice.moment('miss',{x:w.holes[m.hole].x,y:w.holes[m.hole].y,item:m.item});}
      else if(m.hittable&&m.reask&&!m.quiet)overcome(w,m);
      return false;
    });
    // 2인용 황금 두더지는 두 판이 같은 시각(같은 씨앗의 specialTimes)에 하나씩 받는다. 한쪽만 운 좋게 더 받지 않게 한다.
    if(w.duo&&w.specialIndex<w.specialTimes.length&&w.roundTime>=w.specialTimes[w.specialIndex]-1e-9&&spawn(w,null,w.specialTimes[w.specialIndex]))w.specialIndex++;
    if(w.time<y.nextSpawn)return;
    const p=pace(w);
    y.nextSpawn=w.time+p.gap*(w.adapt?.spawnSlow()||1);
    if(p.limit-w.moles.length<p.together)return;
    // A due re-ask word is held until a hole takes it, so a busy board never drops it.
    y.reaskItem||=w.reask?.due(w.roundTime)||null;
    let made=0;
    if(y.reaskItem&&spawn(w,y.reaskItem)){y.reaskItem=null;made++;}
    while(made<p.together&&spawn(w))made++;
  }
  const contains=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
  function key(w,i) {
    ensure(w);if(w.yard.boss){bossHit(w,i);return;}
    const m=w.moles.find(m=>m.hole===i&&m.hittable);if(m)hit(w,m);else if(w.holes[i])swing(w,w.holes[i].x,w.holes[i].y);
  }
  function press(w,x,y) {
    ensure(w);
    if(w.yard.boss){const i=bossShape(w).chips.findIndex(r=>contains(r,x,y));if(i>=0)bossHit(w,i);return;}
    const m=w.moles.find(m=>m.hittable&&(contains(m.box,x,y)||contains(shape(w,m.hole,m.word).sign,x,y)));if(m)hit(w,m);else swing(w,x,y);
  }
  function bot(w) {
    if(w.yard.boss){const b=w.yard.boss;if(!b.defeated&&w.time>=Math.max(b.at+.6,b.nextHit)){
      // 칩 자리는 문장마다 섞인다. 자리 번호가 아니라 틀린 말을 찾아 때린다.
      const bad=api.bossQuestion(b.nextQuestion||b.question).choices.findIndex(c=>c.wrong);
      return {key:w.botKind==='wrong'?1-bad:bad};
    }return null;}
    const m=w.moles.find(m=>m.hittable&&!m.botDecided&&w.time>=m.t0+w.botDelay);
    if(!m)return null;m.botDecided=true;
    return window.GFFamilies.mole.rules.botChoice(w.botKind,m.right,++w.botCount)?{key:m.hole}:null;
  }
  function stamp(w,g,name,r) {
    const img=images[name];if(!img)return;
    api.onStamp?.(g,name,r,w);
    g.imageSmoothingEnabled=false;g.drawImage(img,Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h));
  }
  function shadow(w,g,name,r){
    if(typeof document==='undefined'||!images[name])return;
    const cache=api.shadows ||= {},img=images[name];
    if(!cache[name]){const c=document.createElement('canvas');c.width=img.width+32;c.height=img.height+32;const ctx=c.getContext('2d');
      ctx.shadowColor='#26120890';ctx.shadowBlur=12;ctx.shadowOffsetY=8;ctx.drawImage(img,16,16);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#26120860';ctx.fillRect(0,0,c.width,c.height);cache[name]=c;}
    const c=cache[name],sx=r.w/img.width,sy=r.h/img.height;g.drawImage(c,r.x-16*sx,r.y-12*sy,c.width*sx,c.height*sy);
  }
  function word(w,g,text,r,color='#4c2918',single=false) {
    const px=w.yard.font;g.font=`${px}px DoHyeon, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
    const key=`${px}:${r.w}:${single}:${text}`,cache=w.yard.lines ||= new Map();
    if(!cache.has(key)){
      const rows=[];let row='';for(const part of text.match(/\S+\s*/g)||[]){const next=row+part;if(!single&&g.measureText(next.trimEnd()).width>r.w*.9&&row){rows.push(row);row=part;}else row=next;}if(row)rows.push(row);cache.set(key,rows);
    }
    const rows=cache.get(key);
    const gap=px*1.1;for(let i=0;i<rows.length;i++){
      // Condense only a word wider than the board, preserving the ink height.
      const scale=Math.min(1,r.w*.9/g.measureText(rows[i].trimEnd()).width);
      g.save();g.translate(r.x+r.w/2,0);g.scale(scale,1);
      g.fillText(rows[i],0,r.y+r.h/2+(i-(rows.length-1)/2)*gap);g.restore();
    }
  }
  // 마당 그림이 아직 안 온 동안 깔아 둘 색(위 하늘빛 / 아래 흙빛). 실제 마당 그림에서 뽑은 값이다.
  const soilColors=[['#9b833a','#95863c'],['#9d6526','#a06527'],['#333833','#363934']];
  function scenery(w,g) {
    const y=w.yard,W=w.view.w,H=w.view.h,ground=`${w.view.tall?'yard-tall':'yard-wide'}-${y.theme}`;
    // 그림이 오기 전에 밑그림을 구우면 빈 판(검은 화면)이 그대로 굳는다. 다 온 뒤에 굽는다.
    if(!y.scenery&&typeof document!=='undefined'&&images[ground]&&images.hole){
      const canvas=document.createElement('canvas'),ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.ceil(W*ratio);canvas.height=Math.ceil(H*ratio);
      const layer=canvas.getContext('2d',{alpha:false});layer.scale(ratio,ratio);
      // 2인용 반쪽 판은 마당 그림과 비율이 많이 달라(가로 683 세로 768 등) 늘이면 울타리가 찌그러진다. 비율을 지켜 가운데를 덮는다.
      const art=images[ground],k=Math.max(W/art.width,H/art.height);
      stamp(w,layer,ground,w.duo?{x:(W-art.width*k)/2,y:(H-art.height*k)/2,w:art.width*k,h:art.height*k}:{x:0,y:0,w:W,h:H});
      for(const h of w.holes){if(h.hidden)continue;layer.globalAlpha=.84+.16*h.row/Math.max(1,y.rows-1);stamp(w,layer,'hole',{x:h.x-h.w/2,y:h.y-h.h/2,w:h.w,h:h.h});}layer.globalAlpha=1;
      y.scenery=canvas;
    }
    if(y.scenery){g.imageSmoothingEnabled=false;g.drawImage(y.scenery,0,0,W,H);return;}
    // 아직 그림이 오는 중이면 흙빛을 깔아 둔다(검은 화면 대신). 캐시하지 않으니 오는 대로 진짜 마당이 뜬다.
    const [sky,soil]=soilColors[y.theme]||soilColors[0];
    if(g.createLinearGradient){const fade=g.createLinearGradient(0,0,0,H);fade.addColorStop(0,sky);fade.addColorStop(1,soil);g.fillStyle=fade;}
    else g.fillStyle=soil;
    g.fillRect(0,0,W,H);
  }
  // 2인용 키보드 안내: 구멍 앞 흙더미에 그 구멍을 치는 키 글자를 붙인다. 쪽 색(왼쪽 주황·오른쪽 하늘)은 위쪽 표시줄과 같다.
  // 손가락으로 하는 판(pointer:coarse)에서는 키가 없으니 붙이지 않는다.
  function keyCap(w,g,i,h) {
    if(!w.duo||w.yard.touch)return;
    const code=w.family.keys[w.side]?.[i];if(!code)return;
    const size=Math.round(clamp(w.yard.font*.82,16,30)),x=Math.round(h.x-size/2),y=Math.round(h.y+h.h*.5-size*.55),right=w.side==='right';
    g.save();g.fillStyle='#3b2412';g.beginPath();g.roundRect(x,y+2,size,size,size*.22);g.fill();
    g.fillStyle=right?'#dff4ff':'#ffe6c7';g.strokeStyle=right?'#1d5a7a':'#8a4b12';g.lineWidth=2;g.beginPath();g.roundRect(x,y,size,size,size*.22);g.fill();g.stroke();
    g.fillStyle=right?'#1d5a7a':'#7a3f0c';g.font=`${Math.round(size*.68)}px DoHyeon, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(code.slice(3),x+size/2,y+size*.54);g.restore();
  }
  function draw(w,g) {
    const y=w.yard,W=w.view.w,H=w.view.h;
    scenery(w,g);
    if(y.theme===2&&!w.effectsOff){g.fillStyle='#fff5a0';for(let i=0;i<12;i++){const xx=(i*127+Math.sin(w.juice.clock*.4+i)*12)%W,yy=H*.15+(i*157)%(H*.75);g.globalAlpha=.4+.3*Math.sin(w.juice.clock*2+i);g.fillRect(Math.round(xx),Math.round(yy),3,3);}g.globalAlpha=1;}
    for(let i=0;i<w.holes.length;i++) {
      const h=w.holes[i],r={x:h.x-h.w/2,y:h.y-h.h/2,w:h.w,h:h.h};
      const m=w.moles.find(m=>m.hole===i);if(!m){keyCap(w,g,i,h);continue;}
      const s=shape(w,i,m.word),age=w.time-m.t0,rise=m.state==='rise'?clamp(age/.15,0,1):1;
      m.box=s.box;
      const pending=m.visual&&w.juice.clock<m.visual.contact;
      let name=pending?(m.golden?'gold':'hold'):m.state==='hit'?'hit':m.state==='taunt'?'taunt':m.golden?'gold':m.state==='rise'?'rise':'hold';
      const offset=(1-rise)*(s.box.h+s.sign.h);g.save();g.beginPath();g.rect(h.cell.x,h.cell.y,h.cell.w,h.cell.h);g.clip();
      const body=m.state==='hit'&&!pending?{...s.box,y:h.y-h.h*.05-s.box.h*.32,h:s.box.h*.5}:s.box;
      shadow(w,g,name,{...body,y:body.y+offset});stamp(w,g,name,{...body,y:body.y+offset});
      if(m.state==='hit'&&!pending&&!w.effectsOff){
        const t=w.time-m.stateAt,size=y.font*.75;
        for(let n=0;n<3;n++){const angle=n*Math.PI*2/3+t*4;stamp(w,g,'star',{x:h.x+Math.cos(angle)*body.w*.38-size/2,y:body.y-8+Math.sin(angle)*size*.35-size/2,w:size,h:size});}
        for(const side of [-1,1])stamp(w,g,'dust',{x:h.x+side*(body.w*.4+t*16)-size*.65,y:body.y+body.h*.3,w:size*1.3,h:size*1.3});
      }
      if(m.hittable||pending){shadow(w,g,'sign',{...s.sign,y:s.sign.y+offset});stamp(w,g,'sign',{...s.sign,y:s.sign.y+offset});
        if(m.challenge){g.strokeStyle='#ffdc5b';g.lineWidth=3;g.strokeRect(s.sign.x+2,s.sign.y+offset+2,s.sign.w-4,s.sign.h-4);}
        word(w,g,m.word,{...s.sign,y:s.sign.y+offset});
      }
      g.restore();
      // Only the front lip occludes the body; keep the dark hollow visible above it.
      const img=images.hole;if(img){g.imageSmoothingEnabled=false;g.drawImage(img,0,img.height*.78,img.width,img.height*.22,Math.round(r.x),Math.round(r.y+r.h*.78),Math.round(r.w),Math.round(r.h*.22));}
      keyCap(w,g,i,h);
      if(m.challenge&&m.hittable){g.font=`${Math.max(12,y.font*.55)}px DoHyeon`;g.fillStyle='#5c3317';g.textAlign='center';g.fillText('도전',h.x,h.cell.y+y.font*.5);}
    }
    if(y.boss){const b=y.boss,s=bossShape(w);const body=b.pose==='boss'?s.body:s.low;shadow(w,g,b.pose,body);stamp(w,g,b.pose,body);shadow(w,g,'sign',s.board);stamp(w,g,'sign',s.board);
      if(b.defeated)stamp(w,g,'cheer',{x:W*.77,y:H*.68,w:W*.16,h:W*.18});
      // 싸우는 중에는 안내를 테두리 바로 안쪽 한 줄로(줄바꿈이 문제 글을 밀지 않게), 깬 뒤에는 빈 판 한가운데로.
      word(w,g,b.defeated?'대왕을 이겼어요!':'틀린 말 찾기',b.defeated?s.face:s.title,'#4c2918',!b.defeated);
      if(!b.defeated){const item=b.question,question=api.bossQuestion(item);const phrase=b.corrected?item.boss.sentence:question.prompt;
        word(w,g,phrase,s.ask,b.corrected?'#24663c':'#4c2918');
        for(let i=0;i<2;i++){const r=s.chips[i];shadow(w,g,'sign',r);stamp(w,g,'sign',r);word(w,g,b.corrected&&question.choices[i].wrong?api.bossWords(item).good:question.choices[i].word,r,'#4c2918',true);}
      }
    }
    drawFeedback(w,g);
    const swing=w.hammer&&w.juice.clock-w.hammer.t0<.4;
    // 2인용은 키보드로 많이 하니 쉬는 망치가 구석 구멍과 키 글자를 가렸다. 휘두를 때와 그 쪽을 마우스·손가락으로 건드린 뒤에만 보인다.
    const pointer=w.duo&&!y.pointerReal?null:w.pointer;
    const shown=swing?w.hammer:pointer?{...pointer,height:Math.min(W*.3,H*.26),t0:-Infinity}:w.duo?null:w.hammer;
    if(shown){const h=shown,t=w.juice.clock-h.t0,k=t<.1?-1.4+t*20:t<.18?.6:(.6-clamp((t-.18)/.18,0,1)*1.1),size=h.height;
      const angle=h.bounce?k-clamp((t-.1)/.25,0,1)*1.6:k;
      const cardTop=w.card?Math.min(y.cardTop||H-108,H-108):H;
      const maxY=w.card?cardTop-size*.78-10:H-size*.4;
      let cx=clamp(h.x,size*.78,W-size*.78),cy=clamp(h.y,size*.78,maxY);
      if(w.card&&y.feedback?.card===w.card&&y.feedback.rects) {
        const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
        const blocked=(x,yy)=>y.feedback.rects.some(r=>overlaps({x:x-size*.78,y:yy-size*.78,w:size*1.56,h:size*1.56},r));
        if(blocked(cx,cy))for(const yy of [maxY,H*.65,H*.45,w.view.top+size*.78+8]) {
          let found=false;for(const x of [W-size*.78,size*.78,W/2])if(!blocked(x,yy)){cx=x;cy=yy;found=true;break;}
          if(found)break;
        }
      }
      y.hammerBounds={x:cx-size*.78,y:cy-size*.78,w:size*1.56,h:size*1.56};
      g.save();g.translate(cx,cy);if(t<.4)g.rotate(angle);stamp(w,g,w.fever?.active?'hammer-gold':'hammer',{x:-size*.45,y:-size*.5,w:size,h:size});g.restore();
    }
  }
  function drawFeedback(w,g) {
    const f=w.yard.feedback;if(!w.card||!f||f.card!==w.card||w.juice.clock<f.at)return;
    const age=w.juice.clock-f.at;f.rects=[];
    for(const [hole,text,good] of [[f.selected,f.wrong,false],[f.correct,f.right,true]]) {
      if(hole===undefined)continue;
      const r={...(f.boss?bossShape(w).chips[hole]:shape(w,hole,text).sign)};
      if(!good&&age<.22&&!w.effectsOff)r.x+=Math.sin(age*100)*4*(1-age/.22);
      g.save();if(good&&!w.effectsOff&&age<.82){g.shadowColor='#c1ff92';g.shadowBlur=age<.45?7:3;}
      const ink=good?'#205c3c':'#a52d29';g.fillStyle=good?'#ecf8e9':'#fff0ea';g.strokeStyle=ink;g.lineWidth=3;
      g.beginPath();g.roundRect(r.x+3,r.y+3,r.w-6,r.h-6,8);g.fill();g.stroke();g.shadowBlur=0;
      word(w,g,text,r,ink);f.rects.push({...r,good,text});
      if(!good){const size=Math.min(27,r.w*.22),cx=r.x+r.w-size*.55,cy=r.y+size*.55;
        g.fillStyle=ink;g.beginPath();g.arc(cx,cy,size/2,0,Math.PI*2);g.fill();g.strokeStyle='#fff7df';g.lineWidth=3;
        const k=size*.2;g.beginPath();g.moveTo(cx-k,cy-k);g.lineTo(cx+k,cy+k);g.moveTo(cx+k,cy-k);g.lineTo(cx-k,cy+k);g.stroke();}
      g.restore();
    }
  }
  function labels(w){return w.yard.boss?[bossShape(w).board]:w.moles.filter(m=>m.hittable).map(m=>shape(w,m.hole,m.word).sign);}
  api.shape=shape;
  function scene(w){return {cycle:w.yard.cycle,phase:w.yard.phase,name:names[w.yard.phase],theme:w.yard.theme,board:w.yard.board,holes:w.holes,shapes:w.yard.phase===3?[]:w.holes.map((h,i)=>shape(w,i)),font:w.yard.font,boss:w.yard.boss&&{...w.yard.boss,shape:bossShape(w)},powers:{hammer:w.yard.hammer,golden:w.yard.golden,clockUntil:w.yard.clockUntil}};}
  api.attach = cfg => {
    const use=w=>!!((w.modeSession||w.duo)&&w.art.yard&&w.art.pixel!==false&&!w.practice);
    const oldBehind=cfg.drawBehindHUD||cfg.draw;cfg.drawBehindHUD=(w,g)=>use(w)?scenery(w,g):oldBehind(w,g);
    for(const name of ['layout','step','draw','press','key','bot']){const old=cfg[name];cfg[name]=(w,...args)=>use(w)?({layout,step,draw,press,key,bot}[name])(w,...args):old(w,...args);}
    const round=cfg.hooks.roundStep;cfg.hooks.roundStep=w=>use(w)?undefined:round(w);
    const oldLabels=cfg.hooks.effectLabels;cfg.hooks.effectLabels=w=>use(w)?labels(w):oldLabels(w);
    const oldFits=cfg.hooks.fits;cfg.hooks.fits=(w,text)=>{
      if(!use(w))return oldFits(w,text);
      return w.holes.every((h,i)=>{const r=shape(w,i,text).sign;return r.x>=h.cell.x&&r.x+r.w<=h.cell.x+h.cell.w&&r.y>=h.cell.y&&r.y+r.h<=h.cell.y+h.cell.h;});
    };
    const oldSprite=cfg.hooks.effectSprite;cfg.hooks.effectSprite=(w,g,p)=>{
      if(!use(w))return oldSprite(w,g,p);
      const name=p.shape==='star'?'star':['dust','dirt'].includes(p.shape)?'dust':null;
      if(!name)return false;stamp(w,g,name,{x:p.x-p.size/2,y:p.y-p.size/2,w:p.size,h:p.size});return true;
    };
    cfg.hooks.yard=w=>use(w)?scene(w):null;
    cfg.hooks.yardPower=(w,id)=>{if(use(w))power(w,id);};
    cfg.hooks.yardBoss=(w,i)=>{if(use(w))bossHit(w,i);};
    cfg.cacheTextMeasure=true;cfg.cacheEffectText=true;cfg.animateHUD=true;cfg.opaqueCanvas=true;cfg.cacheVignette=true;cfg.pixelEffects=true;cfg.directSurface=false;
  };
})();
