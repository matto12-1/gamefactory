import { getRank, getPopular, rankViewPlay, rankingPlays } from './ledger.js?v=4c5e743d5d';
import { isOwnRank, getRankRecords } from './store.js?v=4c5e743d5d';
import { todaysChallenge } from './today.js?v=4c5e743d5d';
import { rememberFrom, requireEntry, readData, el, button, resting, pageError } from './ui.js?v=4c5e743d5d';
import { initWall, subjectChip, initialsCell, popularHeading } from './wall.js?v=4c5e743d5d';
import { assetUrl } from './config.js?v=4c5e743d5d';
import { picture, openIntro } from './cards.js?v=4c5e743d5d';
const PLAYS = { quick: '빠른 판', endless: '무한 모드', stage: '단계 지도' };
const fmt = n => Number(n).toLocaleString('ko-KR');
if (requireEntry()) init().catch(pageError);
async function init() {
  rememberFrom();
  const { games } = await readData('data/games.json');
  initWall({ games, page: 'ranks', onPick: openIntro });
  const wall = document.querySelector('.ranks-wall'), challenge = todaysChallenge(games);
  const ranked = games.filter(g => g.ranking.enabled).sort((a, b) => Number(b.id === challenge?.id) - Number(a.id === challenge?.id));
  for (const game of ranked) wall.append(rankCard(game, game.id === challenge?.id));
  const pop = el('section', null, { class: 't rank-pop', 'data-test': 'rank-pop' });
  pop.append(el('h2', '오늘 많이 한 활동'), el('p', '불러오는 중…', { class: 'note' })); wall.append(pop);
  const info = el('section', null, { class: 't rank-info', 'data-test': 'rank-info' });
  info.append(el('h2', '순위가 없는 활동'));
  // 까닭은 확인된 사실만(북항이: 게임 안 순위가 그 기기에만, docs/games/bukhang/DECISIONS.md 11-12). 따로 더할 사실이 없으면 비운다.
  const why = { bukhang: '게임 안에서 이 기기 순위를 봐요' };
  const unranked = el('ul', null, { class: 'unranked-list' });
  for (const g of games.filter(g => !g.ranking.enabled)) {
    const li = el('li'), go = button('', `unranked-${g.id}`, () => openIntro(g)); go.className = 'unranked-game';
    const text = el('span', g.title); text.append(el('small', why[g.id] ?? ''));
    go.append(el('img', null, { src: assetUrl(g.cover), alt: '', loading: 'lazy' }), text); li.append(go); unranked.append(li);
  }
  info.append(unranked, el('h2', '순위를 세는 법'));
  const rules = el('dl');
  const endless = games.filter(g => g.ranking.enabled && g.ranking.play === 'endless').map(g => g.title);
  const rule = [['기간', '최근 90일, 같은 점수는 같은 등수'], ['이니셜', '1~5등에 들면 영어 세 글자를 새겨요']];
  if (endless.length) {
    const end = endless.at(-1).at(-1), plain = end >= '가' && end <= '힣' && (end.charCodeAt(0) - 0xac00) % 28 === 0;
    rule.push(['무한 모드', `${endless.join(' · ')}${plain ? '는' : '은'} 무한 모드 점수만 올라가요`]);
  }
  for (const [term, text] of rule) rules.append(el('dt', term), el('dd', text));
  info.append(rules);
  wall.append(info);
  function focusHash() {
    const id = location.hash.slice(1) || (new URLSearchParams(location.search).get('g') ? `rank-${new URLSearchParams(location.search).get('g')}` : '');
    const card = document.getElementById(id); if (!card?.classList.contains('rk')) return;
    // 카드가 화면보다 크면(폰 가로) 가운데로 맞출 때 위쪽 그림과 모드 단추가 잘린다. 그때는 카드 머리를 화면 위에 맞춘다
    card.scrollIntoView({ block: card.offsetHeight > innerHeight ? 'start' : 'center' }); card.classList.add('highlight'); setTimeout(() => card.classList.remove('highlight'), 2000);
  }
  // 카드가 다 붙은 뒤 바로 맞춘다. 카드 높이는 CSS로 정해져 있어(그림 띠 높이 · 순위 다섯 줄 높이) 글꼴 · 순위가 늦게 와도 자리가 거의 안 바뀐다
  focusHash(); addEventListener('hashchange', focusHash);
  const popular = await getPopular(10);
  pop.firstChild.replaceWith(popularHeading(popular));
  if (!popular.ok) { pop.lastChild.textContent = resting; return; }
  const rows = popular.rows.map(r => ({ ...r, game: games.find(g => g.id === r.game) })).filter(r => r.game);
  for (const game of games) if (!rows.some(row => row.game.id === game.id)) rows.push({ game, plays: 0 });
  rows.sort((a, b) => b.plays - a.plays);
  const most = Math.max(1, ...rows.map(row => row.plays));
  const list = el('ol');
  rows.forEach((row, i) => {
    const li = el('li'), go = button('', `rank-pop-${row.game.id}`, () => openIntro(row.game));
    const bar = el('span', null, { class: 'bar', 'aria-hidden': 'true' }); bar.append(el('i', null, { style: `width:${row.plays / most * 100}%` }));
    go.append(el('span', row.plays > 0 ? String(i + 1) : '', { class: `rank-n r${i + 1}` }), el('img', null, { src: assetUrl(row.game.cover), alt: '', loading: 'lazy' }), el('span', row.game.title, { class: 'nm' }), bar, el('em', `${fmt(row.plays)}판`));
    li.append(go); list.append(li);
  });
  pop.lastChild.replaceWith(list);
}
function rankCard(game, challenge) {
  let play = rankViewPlay(game), sequence = 0;
  const query = new URLSearchParams(location.search);
  if (query.get('g') === game.id && rankingPlays(game).includes(query.get('play'))) play = query.get('play');
  const card = el('section', null, { id: `rank-${game.id}`, class: `t rk${challenge ? ' chal' : ''}`, 'data-test': `rank-${game.id}`, 'data-game': game.id });
  const strip = el('div', null, { class: 'rank-strip' });
  strip.append(picture(game, 'cover'), ...[challenge ? el('span', '오늘의 도전', { class: 'badge' }) : subjectChip(game)].filter(Boolean), el('h2', game.title, { class: 'tile-name' }));
  const modes = el('div', null, { class: 'rank-modes', 'aria-label': `${game.title} 순위 모드` });
  const allowed = rankingPlays(game);
  if (allowed.length > 1) for (const id of allowed) { const b = button(PLAYS[id], `rank-play-${id}`, () => { play = id; render(); }); b.dataset.play = id; modes.append(b); }
  else modes.append(el('span', PLAYS[play]));
  const rows = el('ol', null, { class: 'rank-lines', 'data-test': 'rank-rows' });
  const go = button(challenge ? '도전하기 ›' : '하러 가기 ›', `rank-go-${game.id}`, () => openIntro(game)); go.className = `btn-play${challenge ? '' : ' soft'}`;
  const foot = el('div', null, { class: 'foot-row' }), best = el('span', '', { 'data-test': 'rank-best' });
  foot.append(best, go); card.append(strip, modes, rows, foot);
  async function render() {
    const current = ++sequence;
    const scores = getRankRecords().filter(r => r.game === game.id && r.play === play).map(r => r.score);
    best.textContent = scores.length ? `내 최고 기록 ${fmt(Math.max(...scores))}점` : '내 최고 기록 없음';
    for (const b of modes.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.play === play));
    rows.replaceChildren(el('li', '불러오는 중…', { class: 'note' }));
    const reply = await getRank({ game, play }); if (current !== sequence) return;
    if (!reply.ok) { rows.replaceChildren(el('li', resting, { class: 'note' })); return; }
    rows.replaceChildren(...Array.from({ length: 5 }, (_, i) => {
      const row = reply.rows[i];
      if (!row) {
        const li = el('li', null, { class: 'empty' });
        li.append(el('span', `${i + 1}등`, { class: 'rank-n' }), el('span', '아직 없음')); return li;
      }
      const own = isOwnRank(game.id, play, row), li = el('li', null, own ? { class: 'mine', 'data-test': 'rank-mine' } : {});
      li.append(el('span', `${row.rank}등`, { class: `rank-n r${row.rank}` }), initialsCell(row.tag), el('span', `${fmt(row.score)}점`, { class: 'rank-score' }));
      if (own) li.append(el('small', '내 기록')); return li;
    }));
  }
  render(); return card;
}
