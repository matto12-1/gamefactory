import { el } from './ui.js?v=1179d5aa40';
import { menuItems, coverGames, recommendedGames } from './categories.js?v=1179d5aa40';
import { navIcon } from './nav-icons.js?v=1179d5aa40';
import { todaysGame, todaysChallenge } from './today.js?v=1179d5aa40';
import { assetUrl } from './config.js?v=1179d5aa40';

export async function renderBento({games,hero}) {
  if(hero.hidden)return;
  const {renderChallenge}=await import('./challenge-tiles.js?v=1179d5aa40');
  const tray=el('div',null,{class:'bento-tray','data-test':'bento-tray'});
  hero.before(tray);tray.append(hero);
  const side=el('div',null,{class:'bento-side','data-test':'bento-side'});
  const challenge=el('div',null,{class:'bento-challenge','data-test':'bento-challenge','data-game':todaysChallenge(games)?.id});
  const prefixTests=()=>challenge.querySelectorAll('[data-test]').forEach(node=>{
    if(!node.dataset.test.startsWith('bento-'))node.dataset.test=node.dataset.test==='challenge'?'bento-challenge-panel':`bento-${node.dataset.test}`;
  });
  const result=renderChallenge(challenge,{games,onOpen:async game=>(await import('./cards.js?v=1179d5aa40')).openIntro(game)});
  prefixTests();
  challenge.append(el('a','↗',{class:'bento-challenge-link',href:'ranks.html','data-test':'bento-challenge-link','aria-label':'오늘의 도전 순위표 보기'}));
  result.then(prefixTests);
  const shortcuts=el('section',null,{class:'bento-shortcuts','data-test':'bento-shortcuts','aria-label':'게임 종류 바로가기'});
  shortcuts.append(el('h2','게임 종류'));
  const tiles=el('div',null,{class:'bento-tiles'});
  const items=menuItems(games).filter(item=>item.group==='kind'&&!['new','popular'].includes(item.id)).slice(0,6);
  // 첫 화면에 이미 보이는 게임(오늘의 게임, 오늘의 도전, 추천 줄 앞쪽)의 그림은 되도록 피한다
  const challengeId=todaysChallenge(games)?.id;
  const shown=new Set([todaysGame(games)?.id,challengeId,...recommendedGames(games).filter(g=>g.id!==challengeId).slice(0,6).map(g=>g.id)]);
  const covers=coverGames(items.map(item=>item.id),games,shown);
  for(const item of items) {
    // 칸마다 그 종류 게임의 표지 그림을 깐다(10-20 대표 「그림 카드」). 그림이 없거나 못 받으면 그림 단추가 대신 보인다.
    const link=el('a',null,{href:item.href,'data-test':`bento-category-${item.id}`}), game=covers.get(item.id);
    if(game) {
      const art=el('span',null,{class:'k-art','aria-hidden':'true'}), img=el('img',null,{src:assetUrl(game.cover),alt:'',decoding:'async'});
      img.addEventListener('error',()=>{art.remove();link.classList.remove('has-art')});
      art.append(img);link.append(art);link.classList.add('has-art');
    }
    const icon=el('span',null,{class:'k-icon','aria-hidden':'true'});icon.innerHTML=navIcon(item.icon);
    link.append(icon,el('b',item.label),el('small',`게임 ${item.count}개`));tiles.append(link);
  }
  // 종류가 모자라 마지막 줄이 비면(진짜 게임만 남은 10-21: 셋) 마지막 칸을 그 줄 끝까지 늘린다. 첫 칸은 두 칸 너비. 폰의 가로 줄에선 쓰이지 않는다.
  const count=tiles.children.length,rest=(count+1)%3;
  if(count===1)tiles.lastElementChild.style.setProperty('--span','3');else if(count&&rest)tiles.lastElementChild.style.setProperty('--span',String(4-rest));
  shortcuts.append(tiles);side.append(challenge,shortcuts);tray.append(side);
}
