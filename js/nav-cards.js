// 메뉴판 아래 빈자리 카드(10-20 대표 「나」): 이어 하기 · 내 도장.
import { getRecent, getStamps } from './store.js?v=663d2a871e';
import { stampCount } from './titles.js?v=663d2a871e';
import { assetUrl } from './config.js?v=663d2a871e';
import { el, readData } from './ui.js?v=663d2a871e';
import { navIcon } from './nav-icons.js?v=663d2a871e';

export function resumeCard(games) {
  const last=getRecent(games)[0],game=last&&games.find(g=>g.id===last.id);
  if(!game)return null;
  const card=el('a',null,{class:'nav-card nav-resume',href:`home.html?game=${encodeURIComponent(game.id)}`,'data-test':'nav-resume'});
  const art=el('span',null,{class:'nav-card-art','aria-hidden':'true'});
  if(game.cover){const img=el('img',null,{src:assetUrl(game.cover),alt:'',loading:'lazy',decoding:'async'});img.addEventListener('error',()=>img.remove());art.append(img)}
  card.append(art,el('span','이어 하기',{class:'nav-card-label'}),el('b',game.title));
  return card;
}

// onChange: 칭호 막대가 늦게 붙어 카드가 커지면 부른다(메뉴판이 카드 자리를 다시 잰다).
export function stampCard(games,onChange=()=>{}) {
  const count=stampCount(getStamps());
  const card=el('a',null,{class:'nav-card nav-stamp-card',href:'stamps.html','data-test':'nav-stamp-card'});
  const art=el('span',null,{class:'nav-card-art nav-card-star','aria-hidden':'true'});art.innerHTML=navIcon('medal');
  const note=el('small',count?'':'활동을 끝까지 하면 받아요',{class:'nav-card-note'});
  card.append(art,el('span','내 도장',{class:'nav-card-label'}),el('b',`${count}개`),note);
  if(count) readData('data/titles.json').then(def=>{
    const steps=[...(def.counts??[])].sort((a,b)=>a.count-b.count),next=steps.find(s=>s.count>count),previous=[...steps].reverse().find(s=>s.count<=count);
    if(!next){note.textContent='모든 칭호를 받았어요';onChange();return}
    const pct=Math.round((count-(previous?.count??0))/(next.count-(previous?.count??0))*100);
    const bar=el('span',null,{class:'nav-card-bar',role:'progressbar','aria-label':'다음 칭호까지','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(pct)});
    bar.append(el('i',null,{style:`width:${pct}%`}));
    note.textContent=`「${next.name}」까지 ${next.count-count}개`;note.before(bar);onChange();
  }).catch(()=>{});
  return card;
}
