// 내 도장판 (2026-10-14 대장 고르기 8가): 동그란 도장 그림 격자. 못 받은 것은 흑백 그림자 + 얻는 법.
// 맨 위에 받은 칭호, 도장 수, 다음 칭호까지 막대.
import { getStamps } from './store.js?v=3b50e18461';
import { assetUrl } from './config.js?v=3b50e18461';
import { earnedTitles, stampCount } from './titles.js?v=3b50e18461';
import { todaysGame } from './today.js?v=3b50e18461';
import { requireEntry, readData, el, pageError } from './ui.js?v=3b50e18461';
import { initTopbar } from './topbar.js?v=3b50e18461';
import { stampArt, stampDate } from './stamp-art.js?v=3b50e18461';
if (requireEntry()) init().catch(pageError);

async function init() {
  const [{ games }, definitions] = await Promise.all([readData('data/games.json'), readData('data/titles.json')]);
  initTopbar({ games });
  const stamps = getStamps(), count = stampCount(stamps);
  document.querySelector('[data-test="stamp-count"]').textContent = `도장 ${count}개`;

  // ── 칭호와 다음 칭호 ──
  const titles = earnedTitles(stamps, games, definitions), titleBox = document.querySelector('[data-test="titles"]');
  titleBox.append(el('h2', '받은 칭호'));
  const chips = el('ul', null, { class: 'title-chips' });
  for (const title of titles) chips.append(el('li', title.name, { class: title.kind }));
  if (titles.length) titleBox.append(chips); else titleBox.append(el('p', '도장을 모으면 칭호를 받아요', { class: 'muted' }));
  const steps = [...(definitions.counts ?? [])].sort((a, b) => a.count - b.count);
  const next = steps.find(s => s.count > count), prev = [...steps].reverse().find(s => s.count <= count);
  const nextBox = document.querySelector('[data-test="title-next"]');
  const pct = next ? Math.round(((count - (prev?.count ?? 0)) / (next.count - (prev?.count ?? 0))) * 100) : 100;
  const bar = el('div', null, { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) });
  bar.append(el('i', null, { style: `width:${pct}%` }));
  nextBox.append(el('p', next ? `다음 칭호 「${next.name}」까지 ${next.count - count}개` : '모든 단계 칭호를 받았어요', { class: 'next' }), bar);
  if (!count) {
    const today = todaysGame(games), hint = el('p', '게임을 끝까지 하면 도장을 받아요. ', { class: 'first-hint', 'data-test': 'stamp-hint' });
    if (today) hint.append(el('a', `오늘의 게임 「${today.title}」 하러 가기`, { href: `home.html?${new URLSearchParams({ game: today.id })}` }));
    nextBox.append(hint);
  }

  // ── 게임마다 도장 격자 ──
  const root = document.querySelector('[data-test="stamp-games"]');
  const ordered = [...games].filter(g => g.stamps?.length).sort((a, b) => Object.keys(stamps[b.id] ?? {}).length - Object.keys(stamps[a.id] ?? {}).length);
  for (const game of ordered) {
    const mine = stamps[game.id] ?? {}, got = game.stamps.filter(s => Object.hasOwn(mine, s.id)).length;
    const section = el('section', null, { class: 'stamp-game', 'data-test': `stamps-${game.id}` });
    const head = el('div', null, { class: 'stamp-game-head' }), thumb = el('span', null, { class: 'rank-thumb' });
    if (game.cover) { const img = el('img', null, { src: assetUrl(game.cover), alt: '', loading: 'lazy', decoding: 'async' }); img.addEventListener('error', () => img.remove()); thumb.append(img); }
    head.append(thumb, el('h2', game.title), el('span', `${got} / ${game.stamps.length}`, { class: `stamp-tally${got === game.stamps.length ? ' full' : ''}` }));
    const grid = el('div', null, { class: 'stamp-grid' });
    for (const stamp of game.stamps) {
      const earned = Object.hasOwn(mine, stamp.id);
      const box = el('div', null, { class: `stamp-cell${earned ? '' : ' locked'}`, 'data-test': `stamp-${game.id}-${stamp.id}`, 'data-earned': String(earned) });
      box.append(stampArt(stamp), el('h3', stamp.name), el('p', earned ? `${stampDate(mine[stamp.id]) || '받았어요'} 받음` : stamp.how, { class: earned ? 'when' : 'how' }));
      if (!earned) box.append(el('span', '아직 못 받았어요', { class: 'sr-only' }));
      grid.append(box);
    }
    section.append(head, grid); root.append(section);
  }
}
