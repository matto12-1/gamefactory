import { getPrefs, setPrefs, getStamps, getRecent, bestScore } from './store.js?v=1179d5aa40';
import { todaysGame, todaysChallenge, nextOccasion } from './today.js?v=1179d5aa40';
import { renderBento } from './bento.js?v=1179d5aa40';
import { getPopular } from './ledger.js?v=1179d5aa40';
import { stampCount } from './titles.js?v=1179d5aa40';
import { kstDate } from '../kit/time-kst.js?v=1179d5aa40';
import { rememberFrom, requireEntry, readData, el, button, pageError } from './ui.js?v=1179d5aa40';
import { badges, picture, card, openIntro, gradeRow } from './cards.js?v=1179d5aa40';
import { recommendedGames } from './categories.js?v=1179d5aa40';
import { initTopbar } from './topbar.js?v=1179d5aa40';
import { stampArt } from './stamp-art.js?v=1179d5aa40';
import { initSideNav } from './sidenav.js?v=1179d5aa40';
import { labLine } from '../assets/brand/brand.js?v=1179d5aa40';

if (requireEntry()) init().catch(pageError);

async function init() {
  // 맨 아래 바닥글은 MattoLAB 공용 브랜드 푸터(10-21 대표 「만든사람/출처 이건 빼고 거기에 내 브랜드 푸터」). 출처 창은 없앴다.
  // 꼴은 한 줄 띠(10-22 대표 「너무 홈페이지 화면이 줄어드는구나」 → 「한줄띠」): 큰 꼴 labBlock은 폰에서 516px로 화면 반을 넘었다.
  // 그리는 함수·제품 목록은 assets/brand/(원본 f:/VibeCoding/mattolab-brand, sync.mjs로 복사). 이름이 products.js와 같아야 MattoLAND가 「지금 보는 제품」이 된다.
  const foot=document.querySelector('.site-foot');
  foot.innerHTML=labLine('MattoLAND',{tag:'div'});
  const [{games},titlesDef]=await Promise.all([readData('data/games.json'),readData('data/titles.json')]);
  const recent=getRecent(games), byId=new Map(games.map(g=>[g.id,g]));
  const asked=byId.get(new URLSearchParams(location.search).get('game'));
  if(!asked)rememberFrom();
  initTopbar({games,onPick:openIntro}); initSideNav({games,current:'home',hasRecent:recent.length>0}); placeCopy(foot);
  // ── 오늘의 게임 ──
  const hero = document.querySelector('[data-test="today"]');
  const today = todaysGame(games);
  if (today) {
    const occ = nextOccasion([today], new Date(), today.occasions?.[0]?.leadDays ?? 14);
    // 기념일 칩과 「바로 하기」는 한 묶음으로 오른쪽 아래, 왼쪽 소개 글 아래 끝에 맞춘다(10-20 대표 「내려서 간격을 맞추자」)
    const text = el('div', null, { class: 'hero-text' }), cta = el('div', null, { class: 'hero-cta' });
    if (occ) cta.append(el('span', occ.dday === 0 ? `오늘은 ${occ.name}` : `${occ.name}까지 ${occ.dday}일`, { class: 'why' }));
    const go = button('바로 하기', 'today-game', () => openIntro(today)); go.className = 'btn'; cta.append(go);
    text.append(el('p', '오늘의 게임', { class: 'label' }), el('h2', today.title), el('p', today.summary, { class: 'sum' }), badges(today, 2), cta);
    // 폰에서는 그림을 줄여 다 보이고 양옆 빈자리를 같은 그림으로 흐리게 채운다(home.css .hero .art::before)
    const art = picture(today, 'art', { eager: true }), img = art.querySelector('img');
    if (img) art.style.setProperty('--art-url', `url("${img.src}")`);
    hero.append(art, text);
  } else hero.hidden = true;


  // 기록이 없는 아이에게 빈 판을 만들지 않는다.
  const stamps=getStamps(), count=stampCount(stamps), recentGames=recent.map(x=>byId.get(x.id)).filter(Boolean).slice(0,8);
  if(recentGames.length||count) {
    const mine=el('section',null,{class:'myplay','data-test':'myplay','aria-label':'내 기록'});
    const content=el('div',null,{class:'myplay-games'});
    if(recentGames.length) {
      content.append(el('h2','이어 하기'));
      const rail=el('div',null,{class:'rail','data-test':'recent-row','aria-label':'이 컴퓨터에서 최근에 한 게임',tabindex:'0'});
      for(const g of recentGames) {
        const node=card(g,{onOpen:openIntro,row:'recent'}); node.dataset.test=`recent-${g.id}`;
        const best=bestScore(g.id);
        if(best!==null) node.querySelector('.meta').append(el('p',`최고 ${best.toLocaleString('ko-KR')}점`,{class:'recent-best','data-test':`recent-best-${g.id}`}));
        rail.append(node);
      }
      content.append(rail);mine.append(content);
    }
    if(count) {
      const box=el('a',null,{class:'my-stamps','data-test':'my-stamps',href:'stamps.html'}), collected=[];
      box.append(el('h2','내 도장'),el('b',`${count}개`,{'data-test':'my-stamp-count'}));
      for(const g of games) for(const stamp of g.stamps??[]) if(stamps[g.id]?.[stamp.id]) collected.push({stamp,at:stamps[g.id][stamp.id]});
      collected.sort((a,b)=>b.at.localeCompare(a.at));
      const row=el('div',null,{class:'stamp-row'});for(const {stamp} of collected.slice(0,3))row.append(stampArt(stamp));box.append(row);
      const steps=[...titlesDef.counts].sort((a,b)=>a.count-b.count), next=steps.find(s=>s.count>count), previous=[...steps].reverse().find(s=>s.count<=count);
      const pct=next?Math.round((count-(previous?.count??0))/(next.count-(previous?.count??0))*100):100;
      const bar=el('div',null,{class:'bar',role:'progressbar','aria-label':'다음 칭호까지','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(pct)});
      bar.append(el('i',null,{style:`width:${pct}%`}));
      box.append(bar,el('p',next?`「${next.name}」까지 ${next.count-count}개`:'모든 단계 칭호를 받았어요'));mine.append(box);
    }
    hero.after(mine);
  }

  await renderBento({games,hero});
  const challengeId=todaysChallenge(games)?.id;
  const shelf=document.querySelector('[data-test="shelf"]');
  let popular={games:recommendedGames(games).filter(g=>g.id!==challengeId).slice(0,10),ranked:0,title:'추천 게임'};
  const observer=new ResizeObserver(entries=>{for(const {target} of entries)updateArrows(target)});
  function updateArrows(rail) {
    const [prev,next]=rail.parentElement.querySelectorAll('.arrow'), end=rail.scrollWidth-rail.clientWidth;
    const edge=Math.max(1,parseFloat(getComputedStyle(rail).paddingLeft)+1);
    prev.disabled=end<=edge||rail.scrollLeft<=edge;next.disabled=end<=edge||rail.scrollLeft>=end-edge;
  }
  function renderPopular() {
    observer.disconnect();
    const section=el('section',null,{class:'shelf shelf-popular','data-test':'shelf-popular'});
    const heading=el('div',null,{class:'shelf-title'}), rail=el('div',null,{class:'rail',tabindex:'0','aria-label':popular.title});
    const challenge=el('a','오늘의 도전 →',{class:'to-challenge','data-test':'to-challenge',href:'ranks.html'}), arrows=el('div',null,{class:'arrows'});
    for(const [label,direction,symbol] of [['이전 게임',-1,'‹'],['다음 게임',1,'›']]) {
      const arrow=button(symbol,`popular-${direction<0?'prev':'next'}`,()=>rail.scrollBy({left:direction*rail.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
      arrow.className='arrow';arrow.setAttribute('aria-label',`${popular.title} ${label}`);arrows.append(arrow);
    }
    heading.append(el('h2',popular.title),challenge,arrows);
    rail.append(...popular.games.map((g,i)=>card(g,{onOpen:openIntro,row:'popular',rank:i<popular.ranked?i+1:0})));
    section.append(heading,rail);shelf.replaceChildren(section);rail.addEventListener('scroll',()=>updateArrows(rail));observer.observe(rail);
  }
  let grade=getPrefs().filters.grade;
  // 「전체 게임」은 두 줄(폰은 세 줄)만 보이고 나머지는 「모두 보기」로 전체 게임 쪽에 보낸다(10-21 대표 「가」: 대문 길이의 절반이 이 칸이었다).
  // 넘치는 카드는 지우지 않고 숨긴다(숨긴 카드는 그림을 받지 않는다). 칸 수는 폭 따라 바뀌니 그려진 뒤에 센다.
  const allGrid=document.querySelector('[data-test="all-grid"]'),allMore=document.querySelector('[data-test="all-more"]');
  function fitAll() {
    const cards=[...allGrid.children],cols=getComputedStyle(allGrid).gridTemplateColumns.split(' ').filter(Boolean).length||cards.length;
    const keep=cols*(innerWidth<700?3:2);
    cards.forEach((c,i)=>c.classList.toggle('is-more',i>=keep));
    allMore.hidden=cards.length<=keep;allMore.textContent=`전체 게임 ${cards.length}개 모두 보기 →`;
  }
  new ResizeObserver(fitAll).observe(allGrid);
  function renderAll() {
    // 가짜 게임·견본(id가 「_」로 시작, 공개 빌드의 --dummy --samples)은 진짜 게임 뒤로. 두 줄만 보여서 앞에 오면 진짜 게임이 접힌다(10-21 버티기 공개 때 봄).
    const matching=games.filter(g=>!grade||(g.grades[0]<=grade&&g.grades[1]>=grade)).sort((a,b)=>a.id.startsWith('_')-b.id.startsWith('_'));
    gradeRow(document.querySelector('[data-test="filter-grade"]'),{value:grade,onChange:value=>{grade=value;setPrefs({filters:{grade}});renderAll()}});
    allGrid.replaceChildren(...matching.map(g=>card(g,{onOpen:openIntro,row:'all'})));fitAll();
    document.querySelector('[data-test="result-count"]').textContent=`게임 ${matching.length}개`;
    document.querySelector('[data-test="empty-results"]').hidden=matching.length>0;
  }
  document.querySelector('[data-test="reset-filters"]').addEventListener('click',()=>{grade=0;setPrefs({filters:{grade}});renderAll()});
  renderPopular();renderAll();
  if(asked) {
    const referrer=new URL(document.referrer||'about:blank');
    const fromSite=referrer.origin===location.origin&&/\/(home|list|ranks|stamps)\.html$/.test(referrer.pathname);
    history.replaceState(null,'',location.pathname);
    if(!fromSite)rememberFrom();
    openIntro(asked);
    // 다른 쪽에서 검색해 온 소개 창은 그 쪽으로 돌아간다. 창을 닫고 대문을 쓰면 대문이 새 출발점이다.
    document.querySelector('[data-test="info"]').addEventListener('close',rememberFrom,{once:true});
  }
  const reply=await getPopular(10), ranked=reply.ok?reply.rows.map(row=>byId.get(row.game)).filter(g=>g&&g.id!==challengeId):[];
  // 아직 몇 게임만 순위가 있으면 칸이 거의 비었다(공개 사이트 10-21: 넓은 판에 카드 한 장). 순위 게임 뒤를 추천 게임으로 채우고, 순위 번호는 순위 게임에만 단다.
  if(ranked.length) {const fill=ranked.length<4?popular.games.filter(g=>!ranked.includes(g)):[];
    popular={games:[...ranked,...fill].slice(0,10),ranked:ranked.length,title:reply.date===kstDate(Date.now())?'지금 인기 게임':'어제 인기 게임'};renderPopular()}
}

// 저작권 줄은 넓은 화면에서 왼쪽 메뉴판 아래 빈자리로 옮긴다(10-22 대표 「저작권 … 위치를 왼쪽 빈 공간으로 옮길까?」, 자리는 home.css .copy-left).
// 메뉴판은 화면에 붙어 있어서 창이 낮으면 맨 아래까지 내렸을 때 겹친다. 그때와 메뉴판이 접히는 폭(아이콘 줄·폰)에서는 띠 아래 그대로 둔다.
// 맨 아래까지 내렸을 때 저작권 줄의 화면 속 높이는 쪽 맨 끝에서 잰 거리로 정해져서, 위쪽 카드가 늘거나 줄어도 바뀌지 않는다.
function placeCopy(foot) {
  const copy=foot.querySelector('.lab-copy'), nav=document.getElementById('sidenav');
  if(!copy||!nav) return;
  const fit=()=>{
    foot.classList.add('copy-left');
    if(document.documentElement.dataset.nav!=='full') {foot.classList.remove('copy-left');return}
    const end=Math.max(0,document.documentElement.scrollHeight-innerHeight), top=copy.getBoundingClientRect().top+scrollY-end;
    if(nav.getBoundingClientRect().bottom+12>top) foot.classList.remove('copy-left');
  };
  fit(); addEventListener('resize',fit); new ResizeObserver(fit).observe(nav);
}
