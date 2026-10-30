import { menuItems, coverGames } from './categories.js?v=663d2a871e';
import { getRecent } from './store.js?v=663d2a871e';
import { el, button } from './ui.js?v=663d2a871e';
import { navIcon } from './nav-icons.js?v=663d2a871e';
import { assetUrl } from './config.js?v=663d2a871e';
import { filterForm } from './filter.js?v=663d2a871e';
import { resumeCard, stampCard } from './nav-cards.js?v=663d2a871e';

export function initSideNav({games,current,hasRecent=getRecent(games).length>0}) {
  const root=document.documentElement, nav=document.getElementById('sidenav'), toggle=document.querySelector('[data-test="nav-open"]'), scrim=document.querySelector('[data-test="nav-scrim"]');
  const close=button('','nav-close',()=>setOpen(false)); close.className='nav-close'; close.setAttribute('aria-label','메뉴 닫기'); close.innerHTML=navIcon('close');
  const header=el('div',null,{class:'nav-head'}); header.append(el('b','메뉴'),close);
  const list=el('div',null,{class:'nav-items'});
  const items=menuItems(games,{hasRecent}), groups=new Map(), links=new Map();
  // 지금 있는 곳은 하나 또는 둘(조건으로 찾기에서 종류와 과목을 함께 고르면). 목록 쪽은 고를 때마다 setCurrent로 고친다.
  let currents=new Set([current].flat().filter(Boolean));
  const covers=coverGames(items.filter(item=>['kind','subject'].includes(item.group)).map(item=>item.id),games);
  function link(item) {
    const a=el('a',null,{href:item.href,'data-test':`nav-${item.id}`,class:`nav-item nav-group-${item.group} nav-id-${item.id}`});
    links.set(item.id,a);
    // 판 안 줄마다 그 갈래 게임의 작은 표지 그림(10-20 「그림 카드」). 그림을 못 받으면 바로 뒤 그림 단추가 보인다.
    const game=['kind','subject'].includes(item.group)&&covers.get(item.id);
    if(game){const thumb=el('span',null,{class:'nav-thumb','aria-hidden':'true'}),img=el('img',null,{src:assetUrl(game.cover),alt:'',loading:'lazy',decoding:'async'});img.addEventListener('error',()=>thumb.remove());thumb.append(img);a.append(thumb)}
    const icon=el('span',null,{class:'nav-icon'}); icon.innerHTML=navIcon(item.icon);
    if(item.color) icon.style.setProperty('--nav-color',item.color);
    a.append(icon,el('span',item.label,{class:'nav-label'}));
    if(['kind','subject'].includes(item.group))a.append(el('small',`활동 ${item.count}개`,{class:'nav-count'})); a.title=item.label; return a;
  }
  for(const item of items.filter(item=>['page','main'].includes(item.group))) {
    if(item.id==='recent'||item.id==='all'&&!hasRecent)list.append(el('hr',null,{class:'nav-divider'}));
    list.append(link(item));
  }
  const back=button('‹ 뒤로','nav-back',()=>setGroup(null));back.className='nav-back';
  // 조건으로 찾기(10-20 대표 「나」): 종류·과목처럼 옆 판을 열고, 그 안에서 종류와 과목을 함께 고른다.
  const groupDefs=[['kind','활동 종류','branches'],['subject','과목','subject'],['find','조건으로 찾기','filter']];
  for(const [id,label,icon] of groupDefs) {
    const children=items.filter(item=>item.group===id);if(id!=='find'&&!children.length)continue;
    const trigger=button('',`nav-group-${id}`,()=>setGroup(active===id?null:id));trigger.className='nav-item nav-group-toggle';
    const image=el('span',null,{class:'nav-icon'});image.innerHTML=navIcon(icon);
    // 끝의 ›는 따로 둔다: 가는 메뉴에서는 숨긴다(진단 10번: ↗ · → · ▸가 섞였던 것을 › 하나로).
    const copy=el('span',null,{class:'nav-group-copy'}),name=el('span',label,{class:'nav-label'}),caret=el('span',null,{class:'nav-caret','aria-hidden':'true'});caret.innerHTML=navIcon('chevron');copy.append(name,caret);
    trigger.append(image,copy);
    trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',`nav-pop-${id}`);
    const panel=el('section',null,{id:`nav-pop-${id}`,'data-test':`nav-pop-${id}`,class:`nav-pop nav-pop-${id}`,role:'dialog','aria-label':label});panel.hidden=true;
    // 조건으로 찾기 판은 제목 줄에 「지우기」가 같이 있어서 상자 쪽 제목을 판 제목으로 쓴다
    if(id==='find')panel.append(filterForm(games,{heading:label}));
    else {const tiles=el('div',null,{class:'nav-pop-tiles'});tiles.append(...children.map(link));panel.append(el('h2',label),tiles)}
    groups.set(id,{trigger,panel,copy,label,children});list.append(trigger);
  }
  function markCurrent() {
    for(const [id,a] of links) if(currents.has(id))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    for(const {trigger,copy,label,children} of groups.values()) {
      const selected=children.find(item=>currents.has(item.id));
      copy.querySelector('.nav-current-label')?.remove();delete trigger.dataset.current;
      if(selected){trigger.dataset.current='true';copy.append(el('small',`${label} · ${selected.label}`,{class:'nav-current-label'}))}
      trigger.title=selected?`${label} · ${selected.label}`:label;
    }
  }
  markCurrent();
  // 메뉴 아래 빈자리에는 이어 하기·내 도장 카드(10-20 대표 「나」). 큰 화면 홈은 본문의 같은 칸을 숨긴다(home.css).
  const cards=el('div',null,{class:'nav-cards','data-test':'nav-cards'});cards.append(...[resumeCard(games),stampCard(games,()=>fitCards())].filter(Boolean));
  // 출처 글은 메뉴에서 뺐다(10-20 대표). 홈 바닥글도 MattoLAB 브랜드 푸터로 바뀌어 출처 창은 없다(10-21). 메뉴판 맨 아래는 MattoLAB 표시만.
  const foot=el('div',null,{class:'nav-foot'}), mark=el('p',null,{class:'labmark','aria-label':'MattoLAB'}); mark.append(el('i','Matto'),el('b','LAB')); foot.append(mark);
  nav.replaceChildren(header,back,list,cards,foot,...[...groups.values()].map(g=>g.panel));
  let opener=toggle,active=null;
  function setGroup(id,restore=true) {
    const previous=active;active=id;
    for(const [key,{trigger,panel}] of groups){trigger.setAttribute('aria-expanded',String(key===id));panel.hidden=key!==id}
    const subpage=Boolean(id)&&root.dataset.nav==='drawer';
    nav.classList.toggle('nav-subopen',subpage);list.inert=subpage;foot.inert=subpage;cards.inert=subpage;
    if(id){positionPanel();[...groups.get(id).panel.querySelectorAll('a,button')].find(n=>!n.hidden&&!n.disabled)?.focus()}
    else if(restore&&previous)groups.get(previous).trigger.focus();
  }
  function positionPanel() {
    if(!active||root.dataset.nav==='drawer')return;
    const r=nav.getBoundingClientRect(),{panel,trigger}=groups.get(active);
    // 판은 누른 단추 옆에 붙인다(메뉴판 맨 위에서 열리면 단추와 떨어져 보인다). 아래가 모자라면 위로 올린다.
    // 높이를 재기 전에 지난번 높이 제한을 풀어야 창을 키웠을 때 다시 제자리로 내려온다.
    panel.style.maxHeight='';
    const top=Math.max(8,Math.min(trigger.getBoundingClientRect().top-12,innerHeight-panel.offsetHeight-12));
    panel.style.left=`${r.right+10}px`;panel.style.top=`${top}px`;
    panel.style.maxHeight=`${innerHeight-top-12}px`;
  }
  const background=[document.querySelector('.top'),document.querySelector('main'),document.querySelector('.site-foot')].filter(Boolean);
  function setOpen(open,restore=true) {
    if(open) opener=document.activeElement;
    setGroup(null,false);
    root.classList.toggle('nav-open',open); scrim.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    for(const n of background) n.inert=open;
    if(open) { nav.setAttribute('role','dialog'); nav.setAttribute('aria-modal','true'); close.focus(); revealCurrent(); requestAnimationFrame(revealCurrent); }
    else { nav.removeAttribute('role'); nav.removeAttribute('aria-modal'); if(restore) opener?.focus(); }
  }
  toggle.addEventListener('click',()=>setOpen(true)); scrim.addEventListener('click',()=>setOpen(false));
  nav.addEventListener('click',e=>{if(e.target.closest('a')) {setGroup(null,false);if(root.classList.contains('nav-open'))setOpen(false)}});
  // 판 안 단추가 누른 뒤 다시 그려져 문서에서 빠져도 판은 닫지 않는다(composedPath는 누른 순간의 길을 기억한다)
  document.addEventListener('click',e=>{if(active&&!e.composedPath().includes(nav))setGroup(null,false)});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&active){e.preventDefault();setGroup(null);return}
    if(!root.classList.contains('nav-open')) return;
    if(e.key==='Escape') {e.preventDefault();setOpen(false)}
    if(e.key==='Tab') {
      const nodes=[...nav.querySelectorAll('a,button')].filter(n=>n.getClientRects().length && !n.closest('[inert]') && getComputedStyle(n).visibility!=='hidden');
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first) {e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last) {e.preventDefault();first.focus()}
    }
  });
  function revealCurrent() {
    // 판이 열리는 중(visibility 전환 첫 순간)에도 자리는 잡혀 있으니, 목록 안 자리로 재서 목록만 굴린다(본문은 안 움직임).
    const current=list.querySelector('[aria-current="page"]');
    if(!current||!current.getClientRects().length)return;
    const top=current.getBoundingClientRect().top-list.getBoundingClientRect().top+list.scrollTop, bottom=top+current.offsetHeight;
    if(top<list.scrollTop)list.scrollTop=top;
    else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;
  }
  function fitCards() {
    // 카드는 메뉴 항목을 굴리지 않고도 들어갈 때만 보인다. 학교 노트북 브라우저(높이 650 안팎)에서는 대개 숨고,
    // 그때는 큰 화면 홈도 본문의 이어 하기·내 도장 칸을 다시 보인다(home.css 의 data-nav-cards).
    // 늘 카드를 보인 채로 재서 정하니 보였다 숨었다 되풀이하지 않는다.
    if(nav.classList.contains('nav-subopen'))return;
    cards.hidden=false;
    const fits=list.scrollHeight<=list.clientHeight+1;
    cards.hidden=!fits;root.dataset.navCards=fits?'on':'off';
  }
  function layout() {
    const mode=innerWidth>=1200?'full':innerWidth>=900?'rail':'drawer';
    if(root.dataset.nav!==mode) {setOpen(false,false);root.dataset.nav=mode}
    root.style.setProperty('--top-height',`${document.querySelector('.top').getBoundingClientRect().height/parseFloat(getComputedStyle(root).fontSize)}rem`);
    positionPanel();
    fitCards();
    revealCurrent();
  }
  new ResizeObserver(layout).observe(document.querySelector('.top'));
  new ResizeObserver(revealCurrent).observe(list);
  document.fonts.ready.then(()=>{fitCards();revealCurrent()});
  window.addEventListener('resize',layout); layout();
  return {setCurrent(next){currents=new Set([next].flat().filter(Boolean));markCurrent();fitCards()}};
}
