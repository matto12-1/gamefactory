// 순위표 (2026-10-14 대장 고르기 7가): 왼쪽 갈래(게임 표지 · 모드 · 학년) + 오른쪽 표.
// 맨 위 큰 갈래는 「활동 순위」와 「학교 대항전」. 1·2·3등은 금·은·동, 내 줄은 노랗게 + 「내 순위 보기」.
import { getRank, getSchools, rankingPlay, rankingPlays } from './ledger.js?v=663d2a871e';
import { getNametag, setNametag } from './store.js?v=663d2a871e';
import { openNametagForm } from './nametag.js?v=663d2a871e';
import { assetUrl } from './config.js?v=663d2a871e';
import { kstHour } from '../kit/time-kst.js?v=663d2a871e';
import { rememberFrom, requireEntry, readData, el, grades, resting, pageError } from './ui.js?v=663d2a871e';
import { initTopbar } from './topbar.js?v=663d2a871e';
import { initSideNav } from './sidenav.js?v=663d2a871e';
import { renderChallenge, renderSchools } from './challenge-tiles.js?v=663d2a871e';
if (requireEntry()) init().catch(pageError);

const PLAYS = [['quick', '빠른 판'], ['endless', '무한 모드'], ['stage', '단계 지도']];
const PERIODS = { day: '오늘', week: '이번 주', all: '역대' };
const medal = rank => el('span', String(rank), { class: `medal${rank <= 3 ? ` m${rank}` : ''}`, 'aria-label': `${rank}등` });

async function init() {
  rememberFrom();
  const { games } = await readData('data/games.json');
  initSideNav({games,current:'ranks'});
  const news=document.querySelector('[data-test="rank-news"]');
  renderChallenge(news,{games,onOpen:game=>{location.href=`home.html?${new URLSearchParams({game:game.id})}`}});
  renderSchools(news,{games});
  const query = new URLSearchParams(location.search);
  const ranked = games.filter(g => g.ranking.enabled);
  let game = ranked.find(g => g.id === query.get('g')) ?? ranked[0] ?? null;
  let play = PLAYS.some(([id]) => id === query.get('play')) ? query.get('play') : 'quick';
  let period = query.get('view') === 'schools' ? 'schools' : 'day', sequence = 0;
  const describe = name => { summary.textContent = name ? `${name.schoolName} ${name.grade}학년 ${name.nickname}` : ''; };
  const top = initTopbar({ games, onTag: tag => { describe(tag); render(); } });

  // ── 게임 고르기 가로 줄 ──
  const list = document.querySelector('[data-test="rank-games"]');
  for (const g of ranked) {
    const b = el('button', null, { type: 'button', class: 'rank-game', 'data-test': `rank-game-${g.id}` });
    const thumb = el('span', null, { class: 'rank-thumb' });
    if (g.cover) { const img = el('img', null, { src: assetUrl(g.cover), alt: '', loading: 'lazy', decoding: 'async' }); img.addEventListener('error', () => img.remove()); thumb.append(img); }
    b.append(thumb, el('span', g.title, { class: 'rank-game-name' }));
    b.addEventListener('click', () => { game = g; if (period === 'schools') period = 'day'; render(); });
    list.append(b);
  }
  // 한 줄 게임 고르기는 줄 막대를 숨겨 마우스로는 끝 게임에 갈 수 없었다(2026-10-21). 마우스 바퀴를 굴리면 옆으로 넘기고, 더 있는 쪽 끝을 흐리게 한다.
  const edges = () => { const end = list.scrollWidth - list.clientWidth; list.classList.toggle('more-left', list.scrollLeft > 2); list.classList.toggle('more-right', end > 2 && list.scrollLeft < end - 2); };
  list.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || list.scrollWidth <= list.clientWidth) return;
    const before = list.scrollLeft; list.scrollLeft += event.deltaY; if (list.scrollLeft !== before) event.preventDefault();
  }, { passive: false });
  list.addEventListener('scroll', edges, { passive: true }); new ResizeObserver(edges).observe(list); edges();
  const plays = el('div', null, { class: 'chip-line', 'data-test': 'rank-play-picker' });
  for (const [id, title] of PLAYS) {
    const b = el('button', title, { type: 'button', 'data-test': `rank-play-${id}` });
    b.addEventListener('click', () => { play = id; if (period === 'schools') period = 'day'; render(); });
    plays.append(b);
  }
  document.querySelector('[data-test="rank-play-box"]').append(plays);
  const grade = document.querySelector('[data-test="rank-grade"]'); grades(grade);
  grade.addEventListener('change', render);

  const rows = document.querySelector('[data-test="rank-rows"]'), time = document.querySelector('[data-test="rank-time"]');
  const title = document.querySelector('[data-test="rank-title"]'), me = document.querySelector('[data-test="rank-me"]');
  const side = document.querySelector('[data-test="rank-side"]'), summary = document.querySelector('[data-test="name-summary"]');

  function table(reply, school) {
    rows.replaceChildren();
    if (!reply.rows.length) { rows.append(el('p', school ? '아직 이번 주 기록이 없어요' : '아직 기록이 없어요. 첫 1등이 되어 보세요', { class: 'rank-empty' })); return null; }
    const tag = getNametag(); let mine = null;
    const list = el('ol', null, { class: `rank-list${school ? ' schools' : ''}` });
    for (const row of reply.rows) {
      const li = el('li', null, { class: `rank-row${row.rank <= 3 ? ` top${row.rank}` : ''}` });
      const who = el('span', null, { class: 'who' });
      if (school) { who.append(el('b', row.schoolName)); if (row.dupName) who.append(el('small', row.sido)); }
      else {
        who.append(el('b', row.nickname), el('span', `${row.schoolName} ${row.grade}학년`, { class: 'school' }));
        if (row.dupName) who.append(el('small', row.sido));
        if (tag && tag.nickname === row.nickname && tag.grade === row.grade && tag.schoolName === row.schoolName) { li.classList.add('mine'); li.dataset.test = 'rank-mine'; mine ??= li; }
      }
      const value = el('span', null, { class: 'value' });
      if (school) { value.append(el('b', `별 ${Number(row.points).toLocaleString('ko-KR')}개`), el('small', `${row.kids}명 참여`)); }
      else value.append(el('b', Number(row.score).toLocaleString('ko-KR')), el('small', '점'));
      li.append(medal(row.rank), who, value); list.append(li);
    }
    rows.append(list); return mine;
  }

  async function render() {
    const allowed = rankingPlays(game);
    if (!allowed.includes(play)) play = rankingPlay(game);
    for (const b of plays.children) b.hidden = !allowed.includes(b.dataset.test.slice('rank-play-'.length));
    const current = ++sequence, school = period === 'schools';
    document.querySelector('[data-test="view-games"]').setAttribute('aria-pressed', String(!school));
    document.querySelector('[data-test="period-schools"]').setAttribute('aria-pressed', String(school));
    for (const key of Object.keys(PERIODS)) document.querySelector(`[data-test="period-${key}"]`).setAttribute('aria-pressed', String(period === key));
    for (const b of list.children) b.setAttribute('aria-pressed', String(!school && b.dataset.test === `rank-game-${game?.id}`));
    for (const b of plays.children) b.setAttribute('aria-pressed', String(b.dataset.test === `rank-play-${play}`));
    side.classList.toggle('dim', school); grade.disabled = school;
    title.textContent = school ? '이번 주 학교 대항전' : game ? `${game.title} · ${PERIODS[period]}` : '순위표';
    time.textContent = ''; me.hidden = true;
    const params = new URLSearchParams(school ? { view: 'schools' } : { g: game?.id ?? '', play });
    history.replaceState(null, '', `${location.pathname}?${params}`);
    rememberFrom();
    if (!school && !game) { rows.textContent = '순위가 있는 활동이 아직 없어요'; return; }
    rows.textContent = '불러오는 중…';
    const reply = await (school ? getSchools() : getRank({ game: game.id, period, grade: Number(grade.value), play }));
    if (current !== sequence) return;
    if (!reply.ok) { rows.textContent = resting; return; }
    const mine = table(reply, school);
    if (mine) { me.hidden = false; me.onclick = () => { mine.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); mine.classList.remove('flash'); void mine.offsetWidth; mine.classList.add('flash'); }; }
    if (school) time.textContent = reply.computedAt ? `${kstHour(Date.parse(reply.computedAt))}시 기준` : '아직 순위가 나오지 않았어요';
  }
  for (const key of Object.keys(PERIODS)) document.querySelector(`[data-test="period-${key}"]`).addEventListener('click', () => { period = key; render(); });
  document.querySelector('[data-test="period-schools"]').addEventListener('click', () => { period = 'schools'; render(); });
  document.querySelector('[data-test="view-games"]').addEventListener('click', () => { if (period === 'schools') period = 'day'; render(); });

  describe(getNametag());
  document.querySelector('[data-test="edit-name"]').addEventListener('click', async event => {
    const target = event.currentTarget; target.disabled = true;
    const tag = await openNametagForm({ initial: getNametag() });
    if (tag) { setNametag(tag); describe(tag); top.renderTag(); render(); }
    target.disabled = false;
  });
  await render();
}
