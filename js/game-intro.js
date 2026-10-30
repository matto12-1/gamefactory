import { assetUrl } from './config.js?v=663d2a871e';
import { el,button,modal } from './ui.js?v=663d2a871e';
import { navIcon } from './nav-icons.js?v=663d2a871e';
import '../kit/gf-modes.js?v=663d2a871e';
import '../kit/gf-ui.js?v=663d2a871e';
import '../kit/gf-modes-ui.js?v=663d2a871e';
const art={
  'math-runner':{hero:'assets/game-intro/math-runner.17439d46391e.webp'},
  'spell-mole':{hero:'assets/game-intro/spell-mole.24e77edc7006.webp'}
};
// 모드 아이콘은 바깥 틀 아이콘 한 벌(10-29 「나」): 게임별 입체 그림과 2인용 선 아이콘이 섞였던 것을 맞췄다(진단 1번).
const modeIcon={quick:'hourglass',endless:'infinity',stage:'stage'};
const modes=[['quick','빠른 판','맞힐수록 시간이 늘어요','Q'],['endless','무한 모드','목숨이 남는 동안 계속','E'],['stage','단계 지도','학년마다 열 단계를 깨요','S']];
// 학년이 없는 게임(audience 'all', 역사 영웅 키우기)은 학년도 모드도 묻지 않고 「시작」 하나만 둔다.
// 모드(시대 따라가기 · 무한 모드)는 게임 첫 화면인 진영에서 고른다(10-26 대표: 들어가면 진영이 먼저 나와야 한다).

export function gameIntro(game,picture) {
  const dialog=modal('info',game.title);dialog.className='game-intro';
  const heading=dialog.firstElementChild,hero=el('div',null,{class:'intro-hero'}),assets=art[game.id];
  if(assets)hero.append(el('img',null,{src:assetUrl(assets.hero),alt:`${game.title} 활동 그림`}));
  else hero.append(picture(game,'intro-picture'));
  const title=el('div',null,{class:'intro-title'});
  const all=game.audience==='all',free=!!game.gradeFree,list=modes.filter(([play])=>game.modeKit?.[play]).map(([play,name,desc,key])=>[play,name,game.modeKit[play].description??(free&&play==='stage'?'열 단계를 차례로 깨요':desc),key]);
  if(game.modeKit?.endless?.unlock?.stages)list.sort((a,b)=>window.GFModes.cardOrder(game.modeKit).indexOf(a[0])-window.GFModes.cardOrder(game.modeKit).indexOf(b[0]));
  title.append(el('p',free?game.subjects.join(' '):`${game.subjects.join(' · ')} · ${all?'전체':`${game.grades[0]}~${game.grades[1]}학년`}`,{class:'intro-grade'}),heading,el('p',game.summary,{class:'intro-summary'}));
  hero.append(title);dialog.append(hero);
  const body=el('div',null,{class:'intro-body'});dialog.append(body);
  let store=null;
  try {store=window.GFModes?.store(()=>window.localStorage,game.id,()=>{})??null;}catch{/* Records are a bonus; the dialog still works without them. */}
  const remembered=store?.last?.()??null;
  const first=game.grades[0],last=game.grades[1];
  let grade=free?first:all?1:remembered&&remembered.grade>=first&&remembered.grade<=last?remembered.grade:first;
  const stageLock=window.GFModes.lockStatus(game.modeKit,store,grade);
  const endlessLocked=stageLock.locked;
  const start=(mode,play)=>{
    const query=new URLSearchParams({g:game.id,m:mode,grade:String(grade)});
    if(play){query.set('play',play);query.set('start','1');if(play==='stage')query.set('stage','1');}
    location.href=`study.html?${query}`;
  };
  // 학년을 먼저 고르게 한다: 고른 학년에 맞춰 아래 기록 칸이 바뀐다. 학년 없는 게임은 건너뛴다.
  if(!all&&!free)body.append(el('h3','몇 학년인가요?'));
  const tabs=el('div',null,{class:'intro-grades'});if(!all&&!free)body.append(tabs);
  for(let n=first;n<=last&&!all&&!free;n++) {
    const b=button('',`grade-${n}`,()=>pick(n));b.className='intro-grade-cell';b.dataset.grade=String(n);
    b.setAttribute('aria-label',`${n}학년`);b.append(el('b',String(n)),el('small','학년'),el('span','✓',{class:'intro-check','aria-hidden':'true'}));
    tabs.append(b);
  }
  // 고를 것이 「시작」 하나뿐이면 묻지 않는다(10-21 화면 검토: 빈 질문처럼 보였다).
  if((game.modeKit&&!all)||game.modes.filter(m=>m!=='duo').length>1)body.append(el('h3','어떻게 놀까요?',{class:'intro-h3-modes'}));
  const row=el('div',null,{class:'intro-modes'});body.append(row);
  const records=new Map();
  if(game.modeKit&&!all)for(const [i,[play,name,desc,key]] of list.entries()) {
    const b=button('',`mode-${play}`,()=>{if(play==='endless'&&endlessLocked)window.GFModesUI.lockedFeedback(b,row);else start('solo',play);});b.className=`intro-mode intro-mode-${play}`;
    if(play==='endless'&&endlessLocked)b.setAttribute('aria-disabled','true');
    const icon=el('span',null,{class:'intro-icon','aria-hidden':'true'});icon.innerHTML=navIcon(modeIcon[play]);
    const label=el('strong',name);label.append(el('span',key,{class:'intro-kbd','aria-hidden':'true'}));
    const rec=el('span',null,{class:'intro-rec'});records.set(play,rec);
    const copy=el('span',null,{class:'intro-mode-copy'});copy.append(label,el('small',play==='endless'&&endlessLocked?stageLock.description:desc));
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
      if(play==='endless'&&endlessLocked)text='잠김';
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
    const copy=el('span',null,{class:'intro-mode-copy'});copy.append(el('strong','2인용 활동'),el('small','친구와 한 화면에서 겨뤄요'));
    duo.append(icon,copy,el('span','›',{class:'intro-arrow','aria-hidden':'true'}));row.append(duo);}
  const rows=el('div',null,{'data-test':'info-ranks'});
  if(game.ranking.enabled){const ranks=el('details',null,{class:'intro-ranks',open:''});rows.textContent='불러오는 중…';ranks.append(el('summary','오늘 전국 순위'),rows);body.append(ranks);}
  const close=()=>{dialog.close();dialog.remove();};
  const x=button('×','info-close',close);x.className='intro-close';x.setAttribute('aria-label','소개 창 닫기');dialog.append(x);
  dialog.addEventListener('keydown',e=>{
    if(e.target.closest('summary')||e.metaKey||e.ctrlKey||e.altKey)return;
    const digit=Number(e.key);
    if(!all&&!free&&digit>=first&&digit<=last){pick(digit);tabs.querySelector(`[data-grade="${digit}"]`)?.focus();e.preventDefault();return;}
    const hit=list.find(([,,,key])=>key===e.key.toUpperCase());
    if(hit&&records.has(hit[0])){if(hit[0]==='endless'&&endlessLocked)window.GFModesUI.lockedFeedback(row.querySelector('[data-test="mode-endless"]'),row);else start('solo',hit[0]);e.preventDefault();}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();return {dialog,rows};
}
