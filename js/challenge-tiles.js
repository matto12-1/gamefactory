import { todaysChallenge } from './today.js?v=1179d5aa40';
import { getRank, getSchools } from './ledger.js?v=1179d5aa40';
import { picture } from './cards.js?v=1179d5aa40';
import { el, button, resting } from './ui.js?v=1179d5aa40';
import { kstHour } from '../kit/time-kst.js?v=1179d5aa40';
const medal=rank=>el('span',String(rank),{class:`medal${rank<=3?` m${rank}`:''}`,'aria-label':`${rank}등`});

export async function renderChallenge(root,{games,onOpen}) {
  const game=todaysChallenge(games);if(!game)return;
  const box=el('section',null,{class:'panel challenge','data-test':'challenge'}),head=el('div',null,{class:'panel-head'}),title=el('div');
  title.append(el('p','오늘의 도전',{class:'label'}),el('h2',game.title));head.append(picture(game,'mini-art'),title);
  const text=el('p','불러오는 중…',{class:'score'}),go=button('도전하기','challenge-go',()=>onOpen(game));go.className='btn push';
  box.append(head,text,go);root.append(box);
  const reply=await getRank({game:game.id,period:'day',limit:3});
  if(!reply.ok){text.textContent=resting;box.dataset.resting='true';return}
  if(!reply.rows.length){text.textContent='오늘 첫 1등이 되어 보세요';return}
  text.textContent=`오늘 이 게임 전국 1등 ${reply.rows[0].score.toLocaleString('ko-KR')}점`;
  const top=el('ol',null,{class:'medals','data-test':'challenge-top'});
  for(const row of reply.rows) {const li=el('li');li.append(medal(row.rank),el('span',`${row.schoolName} ${row.nickname}`),el('em',row.score.toLocaleString('ko-KR')));top.append(li)}
  go.before(top);
}

export async function renderSchools(root,{games}) {
  const box=el('section',null,{class:'panel schools','data-test':'schools-tile'}),body=el('div',null,{'data-test':'schools-body'});
  box.append(el('p','이번 주',{class:'label'}),el('h2','학교 대항전'));body.append(el('p','불러오는 중…',{class:'when'}));box.append(body);root.append(box);
  const reply=await getSchools();body.replaceChildren();
  if(!reply.ok||!reply.rows.length) {
    body.append(el('p',!reply.ok?`${resting}. 잠시 후 다시 확인해 주세요`:'아직 이번 주 기록이 없어요',{class:'when'}));
    const game=todaysChallenge(games);
    box.append(el('a','도전하기',{class:'btn push',href:game?`home.html?${new URLSearchParams({game:game.id})}`:'home.html'}));return;
  }
  const list=el('ol',null,{class:'medals'});
  for(const row of reply.rows.slice(0,3)) {
    const li=el('li'),name=el('span',row.schoolName);if(row.dupName)name.append(el('small',row.sido));
    li.append(medal(row.rank),name,el('em',`별 ${row.points.toLocaleString('ko-KR')}`));list.append(li);
  }
  body.append(list);
  if(reply.computedAt)body.append(el('p',`${kstHour(Date.parse(reply.computedAt))}시 기준`,{class:'when'}));
  box.append(el('a','학교 순위 더 보기',{class:'more',href:'ranks.html?view=schools'}));
}
