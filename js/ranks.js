// 전체 1~5등 점수. 내 기록 표시는 기기 안 저장으로만 판단한다.
import { getRank, rankViewPlay, rankingPlays } from './ledger.js?v=bb38d3d327';
import { assetUrl } from './config.js?v=bb38d3d327';
import { rememberFrom, requireEntry, readData, el, resting, pageError, rankRows } from './ui.js?v=bb38d3d327';
import { initTopbar } from './topbar.js?v=bb38d3d327';
import { initSideNav } from './sidenav.js?v=bb38d3d327';
import { renderChallenge } from './challenge-tiles.js?v=bb38d3d327';
if (requireEntry()) init().catch(pageError);
const PLAYS = [['quick', '빠른 판'], ['endless', '무한 모드'], ['stage', '단계 지도']];

async function init() {
  rememberFrom();
  const { games } = await readData('data/games.json');
  initSideNav({ games, current: 'ranks' }); initTopbar({ games });
  renderChallenge(document.querySelector('[data-test="rank-news"]'), { games, onOpen: game => { location.href = `home.html?${new URLSearchParams({ game: game.id })}`; } });
  const query = new URLSearchParams(location.search), ranked = games.filter(g => g.ranking.enabled);
  let game = ranked.find(g => g.id === query.get('g')) ?? ranked[0] ?? null;
  let play = PLAYS.some(([id]) => id === query.get('play')) ? query.get('play') : rankViewPlay(game), sequence = 0;
  const list = document.querySelector('[data-test="rank-games"]');
  for (const g of ranked) {
    const b = el('button', null, { type: 'button', class: 'rank-game', 'data-test': `rank-game-${g.id}` });
    const thumb = el('span', null, { class: 'rank-thumb' });
    if (g.cover) { const img = el('img', null, { src: assetUrl(g.cover), alt: '', loading: 'lazy', decoding: 'async' }); img.addEventListener('error', () => img.remove()); thumb.append(img); }
    b.append(thumb, el('span', g.title, { class: 'rank-game-name' }));
    b.addEventListener('click', () => { game = g; render(); }); list.append(b);
  }
  const edges = () => { const end = list.scrollWidth - list.clientWidth; list.classList.toggle('more-left', list.scrollLeft > 2); list.classList.toggle('more-right', end > 2 && list.scrollLeft < end - 2); };
  list.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || list.scrollWidth <= list.clientWidth) return;
    const before = list.scrollLeft; list.scrollLeft += event.deltaY; if (list.scrollLeft !== before) event.preventDefault();
  }, { passive: false });
  list.addEventListener('scroll', edges, { passive: true }); new ResizeObserver(edges).observe(list); edges();
  const plays = el('div', null, { class: 'chip-line', 'data-test': 'rank-play-picker' });
  for (const [id, title] of PLAYS) {
    const b = el('button', title, { type: 'button', 'data-test': `rank-play-${id}` });
    b.addEventListener('click', () => { play = id; render(); }); plays.append(b);
  }
  document.querySelector('[data-test="rank-play-box"]').append(plays);
  const rows = document.querySelector('[data-test="rank-rows"]'), title = document.querySelector('[data-test="rank-title"]');
  async function render() {
    const allowed = rankingPlays(game);
    if (!allowed.includes(play)) play = rankViewPlay(game);
    for (const b of plays.children) { b.hidden = !allowed.includes(b.dataset.test.slice('rank-play-'.length)); b.setAttribute('aria-pressed', String(b.dataset.test === `rank-play-${play}`)); }
    for (const b of list.children) b.setAttribute('aria-pressed', String(b.dataset.test === `rank-game-${game?.id}`));
    title.textContent = game ? `${game.title} · 전체 순위` : '순위표';
    history.replaceState(null, '', `${location.pathname}?${new URLSearchParams({ g: game?.id ?? '', play })}`); rememberFrom();
    if (!game) { rows.textContent = '순위가 있는 활동이 아직 없어요'; return; }
    const current = ++sequence; rows.textContent = '불러오는 중…';
    const reply = await getRank({ game, play });
    if (current !== sequence) return;
    if (!reply.ok) { rows.textContent = resting; return; }
    rankRows(rows, reply.rows, { game: game.id, play });
  }
  await render();
}
