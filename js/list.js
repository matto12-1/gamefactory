import { gamesIn, CATEGORY_INFO, menuItems } from './categories.js?v=663d2a871e';
import { getRecent, getPrefs, setPrefs } from './store.js?v=663d2a871e';
import { getPopular } from './ledger.js?v=663d2a871e';
import { todaysGame, nextOccasion } from './today.js?v=663d2a871e';
import { initSideNav } from './sidenav.js?v=663d2a871e';
import { readFilter, matchGames, filterTitle } from './filter.js?v=663d2a871e';
import { initTopbar } from './topbar.js?v=663d2a871e';
import { card, openIntro, gradeRow } from './cards.js?v=663d2a871e';
import { rememberFrom, requireEntry, readData, pageError } from './ui.js?v=663d2a871e';
if(requireEntry()) init().catch(pageError);
async function init() {
  rememberFrom();
  const {games}=await readData('data/games.json'); menuItems(games);
  const recent=getRecent(games);
  let requested=new URLSearchParams(location.search).get('c')??'all', filter=readFilter(games), grade=getPrefs().filters.grade, popular=null, nav;
  initTopbar({games,onPick:openIntro});
  function render() {
    // 종류·과목을 고른 조건(?k=·?s=, 옛 ?c=duo 도)이면 둘 다 맞는 게임만, 아니면 갈래(전체·최근·새·인기) 그대로
    const filtered=Boolean(filter.kind||filter.subject);
    let list,current,title,desc;
    if(filtered) {
      list=matchGames(games,filter);current=[filter.kind,filter.subject];title=filterTitle(filter);
      desc=filter.kind&&filter.subject?'고른 종류와 과목에 둘 다 맞는 활동이에요.':CATEGORY_INFO[filter.kind||filter.subject].desc;
    } else {
      const result=gamesIn(requested,games,{recent,popular}), info=CATEGORY_INFO[result.id];
      list=result.games;current=result.id;title=info.label;desc=info.desc+(result.fallback?' 인기 순위가 아직 없어 추천 활동을 보여 드려요.':'');
    }
    if(nav)nav.setCurrent(current);else nav=initSideNav({games,current,hasRecent:recent.length>0});
    document.title=`${title} | MattoLAND`;
    document.querySelector('[data-test="list-title"]').textContent=title;
    document.querySelector('[data-test="list-desc"]').textContent=desc;
    const matching=list.filter(g=>!grade||(g.grades[0]<=grade&&g.grades[1]>=grade));
    const grid=document.querySelector('[data-test="list-grid"]'); grid.replaceChildren(...matching.map(g=>card(g,{onOpen:openIntro})));
    document.querySelector('[data-test="empty-results"]').hidden=matching.length>0;
    document.querySelector('[data-test="result-count"]').textContent=`활동 ${matching.length}개`;
    gradeRow(document.querySelector('[data-test="filter-grade"]'),{value:grade,onChange:value=>{grade=value;setPrefs({filters:{grade}});render()}});
    const occasionOnly=filtered?filter.kind==='occasion'&&!filter.subject:current==='occasion';
    const upcoming=occasionOnly?nextOccasion(games):null, label=document.querySelector('[data-test="list-occasion"]');
    label.hidden=!upcoming||upcoming.game.id===todaysGame(games)?.id;
    if(!label.hidden) label.textContent=upcoming.days?`${upcoming.name}까지 ${upcoming.days}일`:`오늘은 ${upcoming.name}`;
  }
  document.querySelector('[data-test="reset-filters"]').addEventListener('click',()=>{grade=0;setPrefs({filters:{grade}});render()});
  // 메뉴판의 조건으로 찾기가 주소를 바꾸면(replaceState) 다시 그린다. 게임에서 나올 때도 이 조건으로 돌아오게 기억을 고친다.
  addEventListener('gf:filter',e=>{filter=e.detail;requested=new URLSearchParams(location.search).get('c')??'all';rememberFrom();render()});
  render();
  if(requested==='popular') {const r=await getPopular(10);popular=r.ok?r.rows:[];render()}
}
