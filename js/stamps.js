import { getStamps } from './store.js?v=399a5c8957';
import { earnedTitles, stampCount } from './titles.js?v=399a5c8957';
import { requireEntry, readData, el, pageError } from './ui.js?v=399a5c8957';
if (requireEntry()) init().catch(pageError);
async function init() {
  const [{ games }, definitions] = await Promise.all([readData('data/games.json'), readData('data/titles.json')]);
  const stamps = getStamps(); document.querySelector('[data-test="stamp-count"]').textContent = `도장 ${stampCount(stamps)}개`;
  const titles = earnedTitles(stamps, games, definitions), titleBox = document.querySelector('[data-test="titles"]');
  titleBox.append(el('h2', '받은 칭호'));
  if (!titles.length) titleBox.append(el('p', '도장을 모으면 칭호를 받아요'));
  for (const title of titles) titleBox.append(el('p', title.name));
  const root = document.querySelector('[data-test="stamp-games"]');
  for (const game of games) {
    const section = el('section', null, { 'data-test': `stamps-${game.id}` }); section.append(el('h2', game.title));
    const grid = el('div', null, { class: 'grid' });
    for (const stamp of game.stamps) {
      const earned = Object.hasOwn(stamps[game.id] ?? {}, stamp.id);
      const box = el('div', null, { class: 'stamp', 'data-test': `stamp-${game.id}-${stamp.id}`, 'data-earned': String(earned) });
      box.append(el('h3', stamp.name), el('p', stamp.how), el('p', earned ? '받았어요' : '아직 못 받았어요')); grid.append(box);
    }
    section.append(grid); root.append(section);
  }
}
