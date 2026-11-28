import { getStamps } from './store.js?v=4c5e743d5d';
import { earnedTitles, stampCount } from './titles.js?v=4c5e743d5d';
import { todaysGame } from './today.js?v=4c5e743d5d';
import { rememberFrom, requireEntry, readData, el, button, modal, pageError } from './ui.js?v=4c5e743d5d';
import { initWall, subjectChip, iconHtml } from './wall.js?v=4c5e743d5d';
import { picture, openIntro } from './cards.js?v=4c5e743d5d';
import { stampArt, stampDate } from './stamp-art.js?v=4c5e743d5d';
import { assetUrl } from './config.js?v=4c5e743d5d';
if (requireEntry()) init().catch(pageError);
async function init() {
  rememberFrom();
  const [{ games }, definitions] = await Promise.all([readData('data/games.json'), readData('data/titles.json')]);
  initWall({ games, page: 'stamps', onPick: openIntro });
  const stamps = getStamps(), count = stampCount(stamps), wall = document.querySelector('.stamps-wall');
  document.querySelector('[data-test="stamp-count"]').replaceChildren('도장 ', el('b', String(count)), '개');
  const steps = [...definitions.counts].sort((a, b) => a.count - b.count), next = steps.find(s => s.count > count), prev = [...steps].reverse().find(s => s.count <= count);
  const pct = next ? Math.round((count - (prev?.count ?? 0)) / (next.count - (prev?.count ?? 0)) * 100) : 100;
  const nextBox = document.querySelector('[data-test="title-next"]');
  const bar = el('div', null, { class: 'bar', role: 'progressbar', 'aria-label': '다음 칭호까지', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) }); bar.append(el('i', null, { style: `width:${Math.max(4, pct)}%` }));
  const total = games.reduce((n, game) => n + (game.stamps?.length ?? 0), 0), message = el('p');
  if (next) message.append('다음 칭호 ', el('b', next.name), `까지 ${next.count - count}개`);
  else message.append('모든 칭호를 받았어요');
  message.append(` · 모을 수 있는 도장 ${total}개`); nextBox.append(message, bar);
  const ordered = games.filter(g => g.stamps?.length).sort((a, b) => Object.keys(stamps[b.id] ?? {}).length - Object.keys(stamps[a.id] ?? {}).length);
  for (const game of ordered) {
    const mine = stamps[game.id] ?? {}, got = game.stamps.filter(s => Object.hasOwn(mine, s.id)).length;
    const section = el('section', null, { class: 't sg', 'data-test': `stamps-${game.id}` });
    const head = el('div', null, { class: 'stamp-strip' }), name = el('h2', null, { class: 'tile-name' });
    name.append(el('span', game.title), el('small', `${got} / ${game.stamps.length}`));
    head.append(picture(game, 'cover'), ...[subjectChip(game)].filter(Boolean), name);
    const grid = el('div', null, { class: 'stamp-grid' });
    for (const stamp of game.stamps) {
      const earned = Object.hasOwn(mine, stamp.id);
      const cell = button('', `stamp-${game.id}-${stamp.id}`, () => detail(game, stamp, earned ? mine[stamp.id] : null, cell));
      cell.className = `stamp-cell${earned ? '' : ' locked'}`; cell.dataset.earned = String(earned);
      cell.setAttribute('aria-label', `${stamp.name}, ${earned ? '받음' : '아직 못 받았어요'}, 받는 법`);
      const art = stampArt(stamp);
      if (!earned) { const lock = el('span', null, { class: 'stamp-lock' }); lock.innerHTML = iconHtml('lock'); art.append(lock); }
      cell.append(art, el('span', stamp.name)); grid.append(cell);
    }
    section.append(head, grid); wall.append(section);
  }
  const info = el('section', null, { class: 't stamp-info', 'data-test': 'titles' });
  const heading = el('h2', '칭호'); heading.append(el('small', '도장 수에 따라 올라가요')); info.append(heading);
  const titles = earnedTitles(stamps, games, definitions).filter(t => t.kind === 'set'), chips = el('ul', null, { class: 'title-chips' });
  for (const title of titles) chips.append(el('li', title.name));
  const ladder = el('ul', null, { class: 'title-ladder' });
  for (const step of steps) { const item = el('li', null, { class: step === next ? 'next' : '' }); item.append(el('b', `${step.count}개`), el('span', step.name), el('small', step === next ? '다음' : step.count <= count ? '받음' : '')); ladder.append(item); }
  info.append(ladder); if (titles.length) info.append(chips);
  info.append(el('h2', '도장이 없는 활동'));
  const none = el('div', null, { class: 'nostamp' });
  for (const game of games.filter(g => !g.stamps?.length)) {
    const go = button('', `nostamp-${game.id}`, () => openIntro(game));
    go.append(el('img', null, { src: assetUrl(game.cover), alt: '', loading: 'lazy' }), el('span', game.title)); none.append(go);
  }
  info.append(none);
  wall.append(info);
  const today = todaysGame(games);
  if (today) {
    const card = el('section', null, { class: 't stamp-today', 'data-test': 'stamp-hint' });
    const strip = el('div', null, { class: 'stamp-strip' }), name = el('h3', null, { class: 'tile-name' });
    name.append(el('span', today.title), el('small', '오늘의 활동')); strip.append(picture(today, 'cover'), name);
    const body = el('div', null, { class: 'today-body' }), list = el('ul');
    body.append(el('h2', '오늘의 활동에서 받는 도장'), list);
    for (const stamp of today.stamps ?? []) {
      const earned = Object.hasOwn(stamps[today.id] ?? {}, stamp.id), li = el('li', null, { class: earned ? '' : 'locked' });
      const art = stampArt(stamp), text = el('span'); text.append(el('b', stamp.name), el('span', stamp.how));
      if (!earned) { const lock = el('span', null, { class: 'stamp-lock' }); lock.innerHTML = iconHtml('lock'); art.append(lock); }
      li.append(art, text); list.append(li);
    }
    const go = button('하러 가기 ›', 'stamp-today-go', () => openIntro(today)); go.className = 'btn-play'; body.append(go); card.append(strip, body); wall.append(card);
  }
}
function detail(game, stamp, at, opener) {
  const dialog = modal('stamp-detail', stamp.name); dialog.className = 'stamp-detail';
  dialog.append(stampArt(stamp), el('p', stamp.how, { 'data-test': 'stamp-how' }));
  if (at) dialog.append(el('p', `${stampDate(at)} 받음`, { 'data-test': 'stamp-date' }));
  const go = button('이 활동 하러 가기', 'stamp-go', () => { dialog.close(); openIntro(game); }); go.className = 'btn-play';
  const close = button('닫기', 'stamp-close', () => dialog.close()); close.className = 'btn-play soft'; dialog.append(go, close);
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { dialog.remove(); if (!document.querySelector('dialog[open]')) opener.focus(); }, { once: true });
  dialog.showModal(); close.focus();
}
