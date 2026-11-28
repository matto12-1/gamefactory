import { el, button } from './ui.js?v=4c5e743d5d';
import { openIntro, picture } from './cards.js?v=4c5e743d5d';
import { inCategory } from './categories.js?v=4c5e743d5d';

export function sortedActivities(games, sort, popular = []) {
  if (sort === 'recent') return [...games];
  const plays = new Map(popular.map(row => [row.game, row.plays]));
  const list = ['duo','adventure'].includes(sort) ? games.filter(game => inCategory(sort, game)) : [...games];
  return list.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'ko') :
    sort === 'popular' ? (plays.get(b.id) ?? 0) - (plays.get(a.id) ?? 0) || a.title.localeCompare(b.title, 'ko') :
    String(b.released ?? '').localeCompare(String(a.released ?? '')) || a.title.localeCompare(b.title, 'ko'));
}
export function activityCard(game) {
  const node = button('', `activity-${game.id}`, () => openIntro(game));
  node.className = 'activity-card'; node.dataset.game = game.id;
  node.setAttribute('aria-label', [game.title, ...(game.subjects ?? [])].join(', '));
  node.append(picture(game, 'activity-picture'), el('b', game.title), el('small', (game.subjects ?? []).join(' · ')));
  return node;
}
export function activityBrowser({ games, chips, grid, more, initial = 'new', kinds = false, renderCard = activityCard }) {
  let sort = initial, limit = 24, popular = [];
  const choices = [['new','새로 나온'],['popular','많이 한'],['name','가나다']];
  if (initial === 'recent') choices.unshift(['recent','최근에 한']);
  if (kinds) for (const [id, label] of [['duo','2인용'],['adventure','긴 모험']]) if (games.some(g => inCategory(id, g))) choices.push([id, label]);
  if (initial === 'popular') choices.unshift(choices.splice(1, 1)[0]);
  const buttons = choices.map(([id, label]) => {
    const b = button(label, `sort-${id}`, () => { sort = id; limit = 24; render(); });
    b.dataset.sort = id; return b;
  });
  chips.replaceChildren(...buttons);
  function render() {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.sort === sort));
    const list = sortedActivities(games, sort, popular);
    grid.replaceChildren(...list.slice(0, more ? limit : list.length).map(renderCard));
    if (more) { more.hidden = limit >= list.length; more.textContent = `더 보기 (${Math.max(0, list.length - limit)})`; }
  }
  more?.addEventListener('click', () => { limit += 24; render(); });
  render();
  return rows => { popular = rows ?? []; if (sort === 'popular') render(); };
}
