import { todaysChallenge } from './today.js?v=bb38d3d327';
import { getRank, rankViewPlay } from './ledger.js?v=bb38d3d327';
import { picture } from './cards.js?v=bb38d3d327';
import { el, button, resting, rankRows } from './ui.js?v=bb38d3d327';

export async function renderChallenge(root,{games,onOpen}) {
  const game=todaysChallenge(games);if(!game)return;
  const box=el('section',null,{class:'panel challenge','data-test':'challenge'}),head=el('div',null,{class:'panel-head'}),title=el('div');
  title.append(el('p','오늘의 도전',{class:'label'}),el('h2',game.title));head.append(picture(game,'mini-art'),title);
  const text=el('p','불러오는 중…',{class:'score'}),go=button('도전하기','challenge-go',()=>onOpen(game));go.className='btn push';
  box.append(head,text,go);root.append(box);
  const reply=await getRank({game,period:'day',limit:3});
  if(!reply.ok){text.textContent=resting;box.dataset.resting='true';return}
  if(!reply.rows.length){text.textContent='아직 기록이 없어요';return}
  text.textContent=`전체 1등 ${reply.rows[0].score.toLocaleString('ko-KR')}점`;
  const top=el('div',null,{class:'medals','data-test':'challenge-top'});
  rankRows(top, reply.rows, { game: game.id, play: rankViewPlay(game) });
  go.before(top);
}
