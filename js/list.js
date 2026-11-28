import { gamesIn, CATEGORY_INFO, menuItems } from './categories.js?v=4c5e743d5d';
import { getRecent } from './store.js?v=4c5e743d5d';
import { getPopular } from './ledger.js?v=4c5e743d5d';
import { openIntro, picture, tag } from './cards.js?v=4c5e743d5d';
import { initWall, subjectChip } from './wall.js?v=4c5e743d5d';
import { rememberFrom, requireEntry, readData, el, button, pageError } from './ui.js?v=4c5e743d5d';
import { activityBrowser } from './activity-grid.js?v=4c5e743d5d';
if (requireEntry()) init().catch(pageError);
async function init() {
  rememberFrom();
  const { games } = await readData('data/games.json'); menuItems(games);
  initWall({ games, page: 'list', onPick: openIntro });
  const query = new URLSearchParams(location.search), subject = query.get('s'), requested = query.get('c') ?? 'all';
  const result = subject ? { games:games.filter(g => g.subjects?.includes(subject)) } : gamesIn(CATEGORY_INFO[requested] ? requested : 'all', games, { recent: getRecent(games), popular: requested === 'popular' ? (await getPopular(10)).rows : null });
  const title = subject ?? CATEGORY_INFO[result.id].label;
  document.title = `${title} | MattoLAND`;
  document.querySelector('[data-test="list-title"]').textContent = title;
  document.querySelector('[data-test="result-count"]').textContent = `활동 ${result.games.length}개`;
  const update = activityBrowser({ games:result.games, chips:document.querySelector('[data-test="list-sort"]'), grid:document.querySelector('[data-test="list-grid"]'), initial:!subject && requested === 'recent' ? 'recent' : 'popular', renderCard:g => {
    const node = button('', `tile-${g.id}`, () => openIntro(g)); node.className = 't game'; node.dataset.game = g.id;
    const mark = tag(g), name = el('span', null, { class: 'tile-name' });
    name.append(el('span', g.title)); if (mark) name.append(el('span', mark[0], { class: `tag ${mark[1]}` }));
    node.setAttribute('aria-label', [g.title, g.subjects?.[0], mark?.[0]].filter(Boolean).join(', '));
    node.append(picture(g, 'cover'), ...[subjectChip(g)].filter(Boolean), name); return node;
  } });
  const popular = await getPopular(100);
  update(popular.ok ? popular.rows : []);
}
