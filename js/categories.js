import { subjectList } from './subjects.js?v=663d2a871e';
import { getRecent } from './store.js?v=663d2a871e';
import { todaysChallenge } from './today.js?v=663d2a871e';

export const SUBJECT_SLUGS = {국어:'korean',수학:'math',사회:'social',과학:'science',영어:'english',음악:'music',미술:'art',체육:'pe',도덕:'ethics',실과:'practical',정보:'info',계기교육:'occasion-ed',안전:'safety'};
export const CATEGORY_INFO = Object.fromEntries([
  ['all','전체 활동','MattoLAND의 모든 활동이에요.','grid'],
  ['recent','최근에 한 활동','이 컴퓨터에서 최근에 한 활동이에요.','clock'],
  ['new','새 활동','새로 들어온 활동이에요.','spark'],
  ['popular','인기 활동','오늘 친구들이 많이 한 활동이에요.','flame'],
  ['duo','2인용','친구와 한 화면에서 같이 해요.','duo'],
  ['adventure','긴 모험','천천히 오래 즐기는 모험이에요.','map'],
  ['short','짧은 판','짧게 한 판씩 즐겨요.','bolt'],
  ['tv','큰 화면','교실 TV에 띄우고 다 같이 해요.','tv'],
  ['occasion','기념일 활동','기념일에 맞춰 즐기는 활동이에요.','calendar'],
  ...Object.entries(SUBJECT_SLUGS).map(([name,id])=>[id,name,`${name} 공부가 되는 활동이에요.`,['korean','math','social','science','info','safety'].includes(id)?id:'subject'])
].map(([id,label,desc,icon])=>[id,{label,desc,icon}]));
const subjectSlug = name => SUBJECT_SLUGS[name] ?? `s-${name}`;
export function inCategory(id, game) {
  if(id==='all') return true;
  if(id==='new') return game.tags?.includes('새 활동') ?? false;
  if(id==='duo'||id==='tv') return game.modes?.includes(id) ?? false;
  if(id==='adventure'||id==='short') return game.kind===id;
  if(id==='occasion') return Boolean(game.occasions?.length);
  return (game.subjects??[]).some(name=>subjectSlug(name)===id);
}
export function recommendedGames(games, now = new Date()) {
  return [...new Set([todaysChallenge(games,now),...games.filter(g=>g.ranking?.enabled),...games].filter(Boolean))];
}
export function gamesIn(id, games, { recent=[], popular=null, now=new Date() } = {}) {
  const byId=new Map(games.map(g=>[g.id,g]));
  let list, fallback=false;
  if(id==='recent') list=recent.map(x=>byId.get(x.id)).filter(Boolean);
  else if(id==='popular') {
    list=(popular??[]).map(x=>byId.get(x.game)).filter(Boolean);
    if(!list.length) { list=recommendedGames(games,now); fallback=true; }
  } else list=games.filter(g=>inCategory(id,g));
  return list.length ? {id,games:list,fallback} : {id:'all',games,fallback:false};
}
// 갈래마다 대표 게임 하나(표지 그림이 있는 것). 게임이 적은 갈래부터 골라야 칸마다 다른 그림이 나온다.
// avoid(첫 화면에 이미 보이는 게임)는 그 갈래에 다른 활동이 없을 때만 쓴다.
export function coverGames(ids, games, avoid=new Set()) {
  const pool=id=>(id==='popular'?recommendedGames(games):games.filter(g=>inCategory(id,g))).filter(g=>g.cover);
  const used=new Set(), picked=new Map();
  for(const [id,list] of ids.map(id=>[id,pool(id)]).sort((a,b)=>a[1].length-b[1].length)) {
    const game=list.find(g=>!used.has(g.id)&&!avoid.has(g.id))??list.find(g=>!used.has(g.id))??list[0];
    if(game){used.add(game.id);picked.set(id,game)}
  }
  return picked;
}
export function menuItems(games, {hasRecent=false}={}) {
  const page=(id,label,icon)=>({id,label,icon,href:`${id}.html`,group:'page'});
  const items=[page('home','홈','home'),page('ranks','순위표','trophy'),page('stamps','도장판','stamp')];
  const add=(id,group,color)=>items.push({id,...CATEGORY_INFO[id],href:`list.html?c=${encodeURIComponent(id)}`,group,count:id==='recent'?getRecent(games).length:id==='popular'?games.length:games.filter(g=>inCategory(id,g)).length,...(color?{color}:{})});
  if(hasRecent) add('recent','main');
  for(const id of ['all','new','popular','duo','adventure','short','tv','occasion'])
    if(['all','popular'].includes(id) ? games.length : games.some(g=>inCategory(id,g))) add(id,id==='all'?'main':'kind');
  for(const s of subjectList(games).filter(s=>s.count)) {
    const id=subjectSlug(s.name);
    CATEGORY_INFO[id] ??= {label:s.name,desc:`${s.name} 공부가 되는 활동이에요.`,icon:'subject'};
    add(id,'subject',s.color);
  }
  return items;
}
