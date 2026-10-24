// 조건으로 찾기(10-20 대표 「2인용 게임, 사회 같이 게임 종류 + 과목을 함께 넣을 수가 없다」): 종류 하나와 과목 하나를 함께 고른다.
// 주소는 list.html?k=종류&s=과목. 옛 주소 list.html?c=duo · ?c=social 도 같은 조건으로 읽는다.
// 화면 이름은 find-*: 학년 거르기 칩(filter-grade-*)과 시험 이름이 섞이지 않게 한다.
import { menuItems, inCategory, CATEGORY_INFO } from './categories.js?v=1179d5aa40';
import { el, button } from './ui.js?v=1179d5aa40';

export const FILTER_KINDS=['duo','adventure','short','tv','occasion'];
function options(games) {
  const items=menuItems(games);
  return {kind:items.filter(item=>FILTER_KINDS.includes(item.id)),subject:items.filter(item=>item.group==='subject')};
}
export function readFilter(games,search=location.search) {
  const params=new URLSearchParams(search),opts=options(games),c=params.get('c');
  const pick=(list,...ids)=>ids.find(id=>id&&list.some(item=>item.id===id))??'';
  return {kind:pick(opts.kind,params.get('k'),c),subject:pick(opts.subject,params.get('s'),c)};
}
export const matchGames=(games,{kind,subject})=>games.filter(g=>(!kind||inCategory(kind,g))&&(!subject||inCategory(subject,g)));
export const filterTitle=({kind,subject})=>[kind,subject].filter(Boolean).map(id=>CATEGORY_INFO[id]?.label??id).join(' · ');
export function filterHref({kind,subject}) {
  const params=new URLSearchParams();
  if(kind)params.set('k',kind);
  if(subject)params.set('s',subject);
  const query=params.toString();
  return query?`list.html?${query}`:'list.html?c=all';
}

// 칩 두 줄(종류·과목). 같은 칩을 다시 누르면 풀린다. 고르면 게임이 0개가 되는 칩은 막는다.
// 목록 쪽에서는 고르는 즉시 거르고(gf:filter 알림), 다른 쪽에서는 「게임 N개 보기」로 넘어간다.
export function filterForm(games,{heading='조건으로 찾기'}={}) {
  const live=document.body.classList.contains('list-page'),opts=options(games);
  let state=live?readFilter(games):{kind:'',subject:''};
  const root=el('div',null,{class:'find-form','data-test':'find-form'});
  function set(next) {
    state=next;
    if(live){history.replaceState(history.state,'',filterHref(state));dispatchEvent(new CustomEvent('gf:filter',{detail:state}))}
    draw();
  }
  function draw() {
    const focused=root.contains(document.activeElement)?document.activeElement.dataset.test:null;
    const head=el('div',null,{class:'find-head'});
    if(heading)head.append(el('h2',heading));
    const clear=button('지우기','find-clear',()=>set({kind:'',subject:''}));clear.className='find-clear';clear.hidden=!state.kind&&!state.subject;
    head.append(clear);
    const rows=[];
    for(const [key,label] of [['kind','종류'],['subject','과목']]) {
      if(!opts[key].length)continue;
      const row=el('div',null,{class:'find-row',role:'group','aria-label':label});
      for(const item of opts[key]) {
        const on=state[key]===item.id,next={...state,[key]:on?'':item.id};
        const chip=button(item.label,`find-${item.id}`,()=>set(next));chip.className='find-chip';chip.setAttribute('aria-pressed',String(on));
        if(!on&&!matchGames(games,next).length){chip.disabled=true;chip.title='이 조건에 맞는 게임이 없어요'}
        row.append(chip);
      }
      rows.push(el('p',label,{class:'find-label'}),row);
    }
    const go=el('a',`게임 ${matchGames(games,state).length}개 보기`,{class:'find-go',href:filterHref(state),'data-test':'find-go'});go.hidden=live;
    root.replaceChildren(head,...rows,go);
    if(focused)root.querySelector(`[data-test="${focused}"]`)?.focus();
  }
  addEventListener('gf:filter',e=>{if(e.detail!==state){state=e.detail;draw()}});
  draw();
  return root;
}
