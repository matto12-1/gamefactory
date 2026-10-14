(function () {
  'use strict';
  if (window.GFUI) return;
  const hudSize=(w,h)=>Math.max(44,Math.round(Math.min(w,h)*.066));
  const topLimit=(w,h)=>h*(h>w?12:10)/100;
  function firstVisit(storage,id) {
    try { const s=typeof storage==='function'?storage():storage,key=`gf:intro:${id}`;if(s.getItem(key)==='1')return false;s.setItem(key,'1'); } catch { /* A blocked device shows the gesture again. */ }
    return true;
  }
  const starLevel=(score,thresholds=[])=>thresholds.filter(n=>score>=n).length;
  function node(tag,cls,text,parent){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;}
  const hand='<svg viewBox="0 0 120 150" aria-hidden="true"><path class="gf-hand" d="M38 124C26 116 24 106 18 93L8 73C3 62 15 55 23 65L35 80V19C35 4 54 4 54 19V65V54C54 42 72 42 72 55V65V60C72 48 90 49 90 63V72V68C90 56 108 58 108 71V100C108 111 98 123 94 133H44Z"/><path class="gf-cuff" d="M36 127h62v20H36z"/></svg>';
  function theme(parent,family){parent.classList.add('gf-shared-ui');parent.dataset.uiFamily=family;}
  function background(parent,art,kind,base=window.location.href){
    const assets=art?.ui?.[kind];if(!assets)return;
    const picture=node('picture','gf-ui-background',undefined,parent);
    const source=node('source','',undefined,picture);source.media='(orientation: landscape)';source.srcset=new URL(assets.landscape.file,base).href;
    const img=node('img','',undefined,picture);img.src=new URL(assets.portrait.file,base).href;img.alt='';img.style.objectPosition=assets.portrait.position||'50% 50%';
  }
  function guide(parent,family,id,art){
    if(!firstVisit(()=>window.localStorage,id))return {remove(){}};
    const guide=node('div',`gf-first-guide gf-guide-${family}`,undefined,parent);guide.dataset.test='first-guide';
    if(family==='mole'&&art?.slots?.['mole-up']){const mole=node('img','gf-guide-target',undefined,guide);mole.src=art.slots['mole-up'].file;mole.alt='';}
    const gesture=node('div','gf-gesture',undefined,guide);gesture.innerHTML=hand;
    if(family==='runner')node('div','gf-swipe-arrow','↔',gesture);
    const label=node('p','gf-guide-caption',family==='mole'?'바른 말을 톡!':'옆 칸으로 밀어요!',guide);label.setAttribute('role','status');
    const dismiss=()=>guide.remove();const key=()=>{dismiss();window.removeEventListener('keydown',key);};window.addEventListener('keydown',key);
    return {remove(){dismiss();window.removeEventListener('keydown',key);}};
  }
  function symbols(parent){
    const walker=document.createTreeWalker(parent,NodeFilter.SHOW_TEXT),texts=[];while(walker.nextNode())texts.push(walker.currentNode);
    for(const text of texts){if(!/[×÷→○✕·①]/u.test(text.data))continue;const fragment=document.createDocumentFragment();for(const part of text.data.split(/([×÷→○✕·①])/u)){if(/^[×÷→○✕·①]$/u.test(part)){const s=node('span','gf-ui-symbol',part);fragment.append(s);}else fragment.append(document.createTextNode(part));}text.replaceWith(fragment);}
  }
  function stars(parent,level){
    const wrap=node('div','gf-result-stars',undefined,parent);wrap.setAttribute('role','img');wrap.setAttribute('aria-label',`기존 별 ${level}개`);
    for(let i=0;i<3;i++){
      const fill=Math.max(0,Math.min(1,level*3/10-i));const s=node('span','gf-result-star',undefined,wrap);s.style.setProperty('--star-delay',`${i*.25}s`);
      const svg='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 63 34 93 38 71 59 77 91 50 76 23 91 29 59 7 38 37 34Z"/><path class="gf-star-shine" d="M49 19 40 39 23 42"/></svg>';
      s.innerHTML=svg;const gold=node('i','gf-star-fill',undefined,s);gold.innerHTML=svg;gold.style.clipPath=`inset(0 ${100-fill*100}% 0 0)`;
      if(fill>0)node('i','gf-star-spark',undefined,s);
    }
    node('p','gf-star-level',`별 ${level} / 10`,parent);
    return wrap;
  }
  function animateResult(parent,score,level,sound,immediate=false){
    const reduced=immediate||window.GF?.sim>0||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scoreNode=parent.querySelector('.gf-result-number');
    parent.dataset.motion=reduced?'reduced':'full';
    if(reduced){if(scoreNode)scoreNode.textContent=score.toLocaleString('ko-KR');return;}
    if(scoreNode){scoreNode.textContent='0';const start=performance.now();const update=now=>{if(!scoreNode.isConnected)return;const t=Math.max(0,Math.min(1,(now-start)/1000));scoreNode.textContent=Math.round(score*(1-(1-t)**3)).toLocaleString('ko-KR');if(t<1)requestAnimationFrame(update);};requestAnimationFrame(update);}
    parent.querySelectorAll('.gf-result-star').forEach((s,i)=>s.addEventListener('animationstart',()=>{if(level*3/10>i)sound?.('stamp');},{once:true}));
  }
  function summary(parent,{score,stats={},best,thresholds=[]}){
    const level=starLevel(score,thresholds),col=node('div',`gf-result-summary${level<4?' gf-result-low':''}`,undefined,parent);stars(col,level);
    node('h2','gf-result-heading',level<4?'아쉬워요! 한 번 더?':'정말 잘했어요!',col);
    const number=node('strong','gf-result-number gf-ui-outline',score.toLocaleString('ko-KR'),col);number.dataset.test='shared-score';
    if(best!==null&&best!==undefined)node('p',score>best?'gf-result-record gf-new-record':'gf-result-record',score>best?'최고 기록!':`내 최고 ${Math.max(best,score).toLocaleString('ko-KR')}점`,col);
    else node('p','gf-result-record','오늘도 한 걸음 자랐어요!',col);
    const counts=node('div','gf-result-stats',undefined,col);
    node('span','',`맞힌 수 ${stats.right||0}`,counts);node('span','',`최대 콤보 ${stats.maxCombo||0}`,counts);return col;
  }
  // 글꼴 출처(Jua OFL)는 대문 「만든 사람·사진·글꼴 출처」 창으로 옮겼다(2026-10-14). 화면 구석 10px 글을 없앤다.
  function license(){}
  function reviewHint(learning,review){const heading=learning.querySelector('h3'),count=review.querySelectorAll('.gf-review-card').length;heading.querySelector('span')?.remove();if(count>1)node('span','',`${count}개 · 더 보기 ↓`,heading);}
  window.GFUI={hudSize,topLimit,firstVisit,starLevel,node,theme,background,guide,stars,summary,animateResult,license,symbols,reviewHint};
})();
