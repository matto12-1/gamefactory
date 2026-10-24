import { assetUrl } from './config.js?v=1179d5aa40';
import { el,button,modal } from './ui.js?v=1179d5aa40';
import { navIcon } from './nav-icons.js?v=1179d5aa40';
import '../kit/gf-modes.js?v=1179d5aa40';
const art={
  'math-runner':{hero:'assets/game-intro/math-runner.17439d46391e.webp',icons:['ui-mode-icon-0.f238b7c2761e.webp','ui-mode-icon-1.572e7d9561e2.webp','ui-mode-icon-2.8e1508ddf5fd.webp']},
  'spell-mole':{hero:'assets/game-intro/spell-mole.24e77edc7006.webp',icons:['ui-mode-icon-0.e2e6f8b77e99.webp','ui-mode-icon-1.6dcc4c4c9aed.webp','ui-mode-icon-2.ba017471dc6e.webp']}
};
const modes=[['quick','빠른 판','맞힐수록 시간이 늘어요','Q'],['endless','무한 모드','목숨이 남는 동안 계속','E'],['stage','단계 지도','학년마다 열 단계를 깨요','S']];
// 학년이 없는 게임(audience 'all', 역사 영웅 버티기): 학년 고르기 없이 두 모드. 시대 따라가기는 게임 안 시대 지도로 들어간다.
const allModes=[['stage','시대 따라가기','나라마다 세 막을 버티고 적장과 맞서요','S'],['endless','무한 모드','깬 시대를 돌며 끝까지 버텨요','E']];
const ENDLESS_NEED=3;
// 버티기 기록(gf:meta:<id>)에서 깬 칸 수. 막혀 있거나 깨져 있으면 0.
const clearedCount=id=>{try{const m=JSON.parse(localStorage.getItem(`gf:meta:${id}`)??'null');return Array.isArray(m?.cleared)?new Set(m.cleared.filter(Number.isInteger)).size:0;}catch{return 0;}};

export function gameIntro(game,picture) {
  const dialog=modal('info',game.title);dialog.className='game-intro';
  const heading=dialog.firstElementChild,hero=el('div',null,{class:'intro-hero'}),assets=art[game.id];
  if(assets)hero.append(el('img',null,{src:assetUrl(assets.hero),alt:`${game.title} 게임 그림`}));
  else hero.append(picture(game,'intro-picture'));
  const title=el('div',null,{class:'intro-title'});
  const all=game.audience==='all',list=all?allModes:modes;
  title.append(el('p',`${game.subjects.join(' · ')} · ${all?'전체':`${game.grades[0]}~${game.grades[1]}학년`}`,{class:'intro-grade'}),heading,el('p',game.summary,{class:'intro-summary'}));
  hero.append(title);dialog.append(hero);
  const body=el('div',null,{class:'intro-body'});dialog.append(body);
  let store=null;
  try {store=window.GFModes?.store(()=>window.localStorage,game.id,()=>{})??null;}catch{/* Records are a bonus; the dialog still works without them. */}
  const remembered=store?.last?.()??null;
  const first=game.grades[0],last=game.grades[1];
  let grade=all?1:remembered&&remembered.grade>=first&&remembered.grade<=last?remembered.grade:first;
  const endlessLocked=all&&clearedCount(game.id)<ENDLESS_NEED;
  const start=(mode,play)=>{
    try {const attempt=document.documentElement.requestFullscreen?.();attempt?.catch(()=>{});}catch{/* Continue when full screen is unavailable. */}
    const query=new URLSearchParams({g:game.id,m:mode,grade:String(grade)});
    if(all&&play==='stage')query.set('map','1');
    else if(play){query.set('play',play);query.set('start','1');if(play==='stage')query.set('stage','1');}
    location.href=`play.html?${query}`;
  };
  // 학년을 먼저 고르게 한다: 고른 학년에 맞춰 아래 기록 칸이 바뀐다. 학년 없는 게임은 건너뛴다.
  if(!all)body.append(el('h3','몇 학년인가요?'));
  const tabs=el('div',null,{class:'intro-grades'});if(!all)body.append(tabs);
  for(let n=first;n<=last&&!all;n++) {
    const b=button('',`grade-${n}`,()=>pick(n));b.className='intro-grade-cell';b.dataset.grade=String(n);
    b.setAttribute('aria-label',`${n}학년`);b.append(el('b',String(n)),el('small','학년'),el('span','✓',{class:'intro-check','aria-hidden':'true'}));
    tabs.append(b);
  }
  // 고를 것이 「시작」 하나뿐이면 묻지 않는다(10-21 화면 검토: 빈 질문처럼 보였다).
  if(game.modeKit||game.modes.filter(m=>m!=='duo').length>1)body.append(el('h3','어떻게 놀까요?',{class:'intro-h3-modes'}));
  const row=el('div',null,{class:'intro-modes'});body.append(row);
  const records=new Map();
  if(game.modeKit)for(const [i,[play,name,desc,key]] of list.entries()) {
    const b=button('',`mode-${play}`,()=>{if(!(play==='endless'&&endlessLocked))start('solo',play);});b.className=`intro-mode intro-mode-${play}`;
    if(play==='endless'&&endlessLocked)b.setAttribute('aria-disabled','true');
    const icon=el('span',null,{class:'intro-icon'});
    if(assets)icon.append(el('img',null,{src:assetUrl(`games/${game.id}/art/${assets.icons[i]}`),alt:''}));
    else icon.textContent=all?{stage:'★',endless:'∞'}[play]:['◷','∞','★'][i];
    const label=el('strong',name);label.append(el('span',key,{class:'intro-kbd','aria-hidden':'true'}));
    const rec=el('span',null,{class:'intro-rec'});records.set(play,rec);
    const copy=el('span',null,{class:'intro-mode-copy'});copy.append(label,el('small',play==='endless'&&endlessLocked?`시대 셋을 깨면 열려요 (${clearedCount(game.id)}/${ENDLESS_NEED})`:desc));
    b.append(icon,copy,rec,el('span','›',{class:'intro-arrow','aria-hidden':'true'}));row.append(b);
  }
  else for(const mode of game.modes.filter(m=>m!=='duo')) {
    const b=button(mode==='tv'?'큰 화면으로 하기':'시작',`mode-${mode}`,()=>start(mode));b.className='intro-start';row.append(b);
  }
  function pick(n) {
    grade=n;
    for(const b of tabs.querySelectorAll('[data-grade]'))b.setAttribute('aria-pressed',String(Number(b.dataset.grade)===n));
    for(const [play,rec] of records) {
      let text='';
      if(all&&play==='endless'&&endlessLocked)text='잠김';
      else if(all&&play==='stage'){const n=clearedCount(game.id);text=n?`깬 시대 ${n}개`:'기록 없음';}
      else if(store){
        if(play==='stage'){const stars=store.total(n);text=stars?`별 ${stars}개`:'기록 없음';}
        else {const best=store.best(n,play);text=best?`최고 ${best.toLocaleString('ko-KR')}점`:'기록 없음';}
      }
      rec.textContent=text;rec.hidden=!text;
    }
  }
  pick(grade);
  const lastPlay=remembered?.play;
  if(lastPlay&&records.has(lastPlay))row.querySelector(`[data-test="mode-${lastPlay}"]`)?.classList.add('intro-mode-again');
  if(game.needsKeyboard&&(navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches))body.append(el('p','키보드가 있어야 해요',{class:'intro-keyboard'}));
  // 2인용은 위 모드 카드와 같은 꼴의 하늘색 카드로(10-21: 아래 작은 글 링크라 잘 안 보였다). 카드 줄 맨 끝에 둔다.
  if(game.modes.includes('duo')){const duo=button('','mode-duo',()=>start('duo'));duo.className='intro-mode intro-mode-duo';
    const icon=el('span',null,{class:'intro-icon','aria-hidden':'true'});icon.innerHTML=navIcon('duo');
    const copy=el('span',null,{class:'intro-mode-copy'});copy.append(el('strong','2인용 게임'),el('small','친구와 한 화면에서 겨뤄요'));
    duo.append(icon,copy,el('span','›',{class:'intro-arrow','aria-hidden':'true'}));row.append(duo);}
  const rows=el('div',null,{'data-test':'info-ranks'});
  if(game.ranking.enabled){const ranks=el('details',null,{class:'intro-ranks',open:''});rows.textContent='불러오는 중…';ranks.append(el('summary','오늘 전국 순위'),rows);body.append(ranks);}
  const close=()=>{dialog.close();dialog.remove();};
  const x=button('×','info-close',close);x.className='intro-close';x.setAttribute('aria-label','소개 창 닫기');dialog.append(x);
  dialog.addEventListener('keydown',e=>{
    if(e.target.closest('summary')||e.metaKey||e.ctrlKey||e.altKey)return;
    const digit=Number(e.key);
    if(!all&&digit>=first&&digit<=last){pick(digit);tabs.querySelector(`[data-grade="${digit}"]`)?.focus();e.preventDefault();return;}
    const hit=list.find(([,,,key])=>key===e.key.toUpperCase());
    if(hit&&records.has(hit[0])&&!(hit[0]==='endless'&&endlessLocked)){start('solo',hit[0]);e.preventDefault();}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();return {dialog,rows};
}
