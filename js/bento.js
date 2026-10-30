import { el } from './ui.js?v=663d2a871e';
import { menuItems } from './categories.js?v=663d2a871e';
import { navIcon } from './nav-icons.js?v=663d2a871e';
import { todaysChallenge } from './today.js?v=663d2a871e';

// 홈 맨 위(2026-10-29 「나. 깔끔한 게임 스토어」): 오늘의 활동 큰 칸 + 오늘의 도전 좁은 칸이 한 줄, 그 아래 활동 종류 알약 한 줄.
// 칸 차례는 home.css .bento-tray 격자가 정한다(.bento-side는 칸을 묶지 않고 풀어 둔다: 판 속 판 없음).
export async function renderBento({games,hero}) {
  if(hero.hidden)return;
  const {renderChallenge}=await import('./challenge-tiles.js?v=663d2a871e');
  const tray=el('div',null,{class:'bento-tray','data-test':'bento-tray'});
  hero.before(tray);tray.append(hero);
  const side=el('div',null,{class:'bento-side','data-test':'bento-side'});
  const challenge=el('div',null,{class:'bento-challenge','data-test':'bento-challenge','data-game':todaysChallenge(games)?.id});
  const prefixTests=()=>challenge.querySelectorAll('[data-test]').forEach(node=>{
    if(!node.dataset.test.startsWith('bento-'))node.dataset.test=node.dataset.test==='challenge'?'bento-challenge-panel':`bento-${node.dataset.test}`;
  });
  const result=renderChallenge(challenge,{games,onOpen:async game=>(await import('./cards.js?v=663d2a871e')).openIntro(game)});
  prefixTests();
  // 순위표로 가는 길은 이름 있는 글자 링크(진단 10번: 이름 없는 ↗ 단추였다).
  challenge.append(el('a','순위표 ›',{class:'bento-challenge-link',href:'ranks.html','data-test':'bento-challenge-link','aria-label':'오늘의 도전 순위표 보기'}));
  result.then(prefixTests);
  // 활동 종류: 종류마다 넓은 알약(옅은 뜻 색 면 · 두 톤 아이콘 · 이름 · 활동 수 · ›). 10-29 기준 그림, 그림 카드는 대표가 다시 정한다(설계서 8절).
  const shortcuts=el('section',null,{class:'bento-shortcuts','data-test':'bento-shortcuts','aria-label':'활동 종류 바로가기'});
  shortcuts.append(el('h2','활동 종류'));
  const tiles=el('div',null,{class:'bento-tiles'});
  for(const item of menuItems(games).filter(item=>item.group==='kind'&&!['new','popular'].includes(item.id)).slice(0,6)) {
    const link=el('a',null,{href:item.href,class:`k-${item.id}`,'data-test':`bento-category-${item.id}`});
    const icon=el('span',null,{class:'k-icon','aria-hidden':'true'});icon.innerHTML=navIcon(item.icon);
    const copy=el('span',null,{class:'k-copy'});copy.append(el('b',item.label),el('small',`활동 ${item.count}개`));
    link.append(icon,copy,el('span','›',{class:'k-go','aria-hidden':'true'}));tiles.append(link);
  }
  shortcuts.append(tiles);side.append(challenge,shortcuts);tray.append(side);
}
