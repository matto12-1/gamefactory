// 홈 타일 벽(2026-11-26 대표 「A 타일벽을 기본안으로 가자」, 보고서 docs/refs/site-dense-1126/report-a.html 14개는 추천안대로).
// 칸 차례: 최근 활동 → 오늘의 활동 → 오늘의 도전 → 활동 칸 → 내 도장 → 오늘 많이 한 활동 → 명예의 전당. 보이는 자리는 home.css 칸 지도.
import { getStamps, getJSON, setJSON, getRecent } from './store.js?v=4c5e743d5d';
import { todaysChallenge, heroSlides } from './today.js?v=4c5e743d5d';
import { renderHero } from './hero.js?v=4c5e743d5d';
import { getPopular, getRank } from './ledger.js?v=4c5e743d5d';
import { stampCount } from './titles.js?v=4c5e743d5d';
import { assetUrl } from './config.js?v=4c5e743d5d';
import { rememberFrom, requireEntry, readData, el, button, pageError, resting } from './ui.js?v=4c5e743d5d';
import { openIntro, picture, tag } from './cards.js?v=4c5e743d5d';
import { recommendedGames } from './categories.js?v=4c5e743d5d';
import { initWall, subjectChip, initialsCell, iconHtml, popularHeading } from './wall.js?v=4c5e743d5d';
import { activityBrowser, sortedActivities } from './activity-grid.js?v=4c5e743d5d';

const SLOTS = 7;                    // 벽의 활동 칸(g1~g7). 모든 활동은 벽 아래 전체 활동 격자에서도 볼 수 있다.
const ORDER_KEY = 'gf:home-order';  // 지난번 「많이 한 차례」. 처음 그릴 때 써서 자료가 온 뒤 칸이 덜 뒤바뀐다
const fmt = n => Number(n).toLocaleString('ko-KR');
// 가짜 게임 · 견본(id가 「_」로 시작, 공개 빌드의 --dummy --samples)은 진짜 게임 뒤로.
const realFirst = list => [...list.filter(g => !g.id.startsWith('_')), ...list.filter(g => g.id.startsWith('_'))];

if (requireEntry()) init().catch(pageError);

async function init() {
  const [{ games }, titlesDef] = await Promise.all([readData('data/games.json'), readData('data/titles.json')]);
  const byId = new Map(games.map(g => [g.id, g]));
  const asked = byId.get(new URLSearchParams(location.search).get('game'));
  if (!asked) rememberFrom();
  initWall({ games, page: 'home', onPick: openIntro });
  const wall = document.getElementById('wall');
  const recent = getRecent(games).slice(0, 2).map(row => byId.get(row.id));
  const picks = [...new Set([...recent, ...sortedActivities(games, 'new')])].slice(0, 2);
  const resume = wall.querySelector('[data-test="myplay"]'), recentGrid = el('div', null, { class:'recent-grid' });
  resume.append(el('h2', recent.length ? '이어서 하기' : '새로 나온 활동'), recentGrid);
  for (const game of picks) {
    const b = button('', `recent-${game.id}`, () => openIntro(game));
    b.setAttribute('aria-label', game.title); b.dataset.game = game.id;
    b.append(picture(game, 'recent-picture'), el('span', game.title)); recentGrid.append(b);
  }
  document.querySelector('[data-test="all-count"]').textContent = `${games.length}개`;
  const updateAll = activityBrowser({ games, chips:document.querySelector('[data-test="all-sort"]'), grid:document.querySelector('[data-test="all-grid"]'), more:document.querySelector('[data-test="all-more"]'), kinds:true });

  // ── 오늘의 활동: 첫 장은 오늘의 활동, 넘기기 점으로 추천 활동 몇 장(10-29 대표, 보고서 10번 가 「그대로」) ──
  const hero = wall.querySelector('[data-test="today"]');
  const slides = heroSlides(games);
  if (slides.length) renderHero(hero, slides); else hero.hidden = true;
  const today = slides[0] ?? null, challenge = todaysChallenge(games);

  // ── 오늘의 도전: 1~3등 이니셜까지 ──
  const top3 = renderChallenge(wall.querySelector('[data-test="challenge"]'), challenge);

  // ── 활동 칸: 많이 한 차례. 오늘의 도전 활동도 칸에 그대로 둔다(보고서 11번 가) ──
  const tiles = wall.querySelector('[data-test="tiles"]');
  const arrange = ids => realFirst([...new Set([...ids.map(id => byId.get(id)).filter(Boolean), ...recommendedGames(games), ...games])]);
  let order = arrange(getJSON(ORDER_KEY, []).filter(id => typeof id === 'string'));
  const renderTiles = () => {
    const others = order.filter(g => g.id !== today?.id);
    const nodes = others.slice(0, SLOTS).map((g, i) => tile(g, `g${i + 1}`));
    for (let i = others.length; i < SLOTS; i++) nodes.push(soon(`g${i + 1}`));
    tiles.replaceChildren(...nodes);
  };
  renderTiles();

  // ── 내 도장 ──
  renderMyStamps(wall.querySelector('[data-test="my-stamps"]'), titlesDef);

  // ── 오늘 많이 한 활동 · 명예의 전당: 점수 서버 자료가 오면 채운다 ──
  const pop = wall.querySelector('[data-test="pop"]'), fame = wall.querySelector('[data-test="fame"]');
  pop.replaceChildren(el('h2', '오늘 많이 한 활동'), el('p', '불러오는 중…', { class: 'note' }));
  const fameHead = el('a', null, { class: 'fh', href: 'ranks.html', 'data-test': 'fame-ranks' });
  fameHead.append(el('h2', '명예의 전당', { class: 'px' }), el('small', '활동마다 1등'));
  fame.replaceChildren(fameHead, el('p', '불러오는 중…', { class: 'note' }));

  if (asked) {
    const referrer = new URL(document.referrer || 'about:blank');
    const fromSite = referrer.origin === location.origin && /\/(home|list|ranks|stamps)\.html$/.test(referrer.pathname);
    history.replaceState(null, '', location.pathname);
    if (!fromSite) rememberFrom();
    openIntro(asked);
    // 다른 쪽에서 찾아 온 소개 창은 그 쪽으로 돌아간다. 창을 닫고 홈을 쓰면 홈이 새 출발점이다.
    document.querySelector('[data-test="info"]')?.addEventListener('close', rememberFrom, { once: true });
  }

  const ranked = games.filter(g => g.ranking?.enabled);
  const [popular, firsts] = await Promise.all([
    getPopular(100),
    Promise.all(ranked.map(async game => ({ game, reply: await getRank({ game, limit: 1 }) }))),
    challenge ? fillTop3(top3, challenge) : null,
  ]);
  const rows = popular.ok ? popular.rows.map(r => ({ game: byId.get(r.game), plays: r.plays })).filter(r => r.game) : [];
  updateAll(popular.ok ? popular.rows : []);
  renderPopular(pop, popular, rows);
  if (rows.length) {
    const ids = rows.map(r => r.game.id), next = arrange(ids);
    setJSON(ORDER_KEY, ids);
    if (next.map(g => g.id).join() !== order.map(g => g.id).join()) { order = next; renderTiles(); }
  }
  renderFame(fame, fameHead, firsts.sort((a, b) => order.indexOf(a.game) - order.indexOf(b.game)));
}

function tile(g, area) {
  const node = button('', `tile-${g.id}`, () => openIntro(g));
  node.className = `t game${area ? '' : ' more'}`;
  if (area) node.style.gridArea = area;
  node.dataset.game = g.id;
  const mark = tag(g);
  node.setAttribute('aria-label', [g.title, g.subjects?.[0], mark?.[0]].filter(Boolean).join(', '));
  const name = el('span', null, { class: 'tile-name' });
  name.append(el('span', g.title));
  if (mark) name.append(el('span', mark[0], { class: `tag ${mark[1]}` }));
  node.append(picture(g, 'cover'), ...[subjectChip(g)].filter(Boolean), name);
  return node;
}
function soon(area) {
  const node = el('div', '새 활동을 준비하고 있어요', { class: 't soon', 'data-test': 'tile-soon' });
  node.style.gridArea = area;
  return node;
}

function renderChallenge(root, game) {
  if (!game) { root.hidden = true; return null; }
  root.dataset.game = game.id;
  const head = el('div', null, { class: 'head' });
  head.append(el('h2', '오늘의 도전'), el('a', '순위표 ›', { href: `ranks.html#rank-${game.id}`, 'data-test': 'challenge-ranks', 'aria-label': '오늘의 도전 순위표 보기' }));
  const go = button('', 'challenge-go', () => openIntro(game));
  go.className = 'btn-play sub go';
  go.innerHTML = '도전하기 <b aria-hidden="true">›</b>';
  const list = el('ol', null, { class: 'top3', 'data-test': 'challenge-top3', 'aria-label': `${game.title} 1~3등` });
  list.append(el('li', '불러오는 중…', { class: 'note' }));
  root.append(head, picture(game, 'pic'), el('h3', game.title, { class: 'name' }), go, list);
  return list;
}
async function fillTop3(list, game) {
  const reply = await getRank({ game, limit: 3 });
  if (!reply.ok) { list.replaceChildren(el('li', resting, { class: 'note' })); return; }
  list.replaceChildren(...[0, 1, 2].map(i => {
    const row = reply.rows[i], li = el('li', null, row ? {} : { class: 'empty' });
    const rank = row ? row.rank : i + 1;
    li.append(el('span', `${rank}등`, { class: `rank-n r${rank}` }));
    if (row) li.append(initialsCell(row.tag), el('em', `${fmt(row.score)}점`));
    else li.append(el('span', '자리가 비어 있어요'));
    return li;
  }));
}

function renderMyStamps(box, titlesDef) {
  const count = stampCount(getStamps());
  const steps = [...titlesDef.counts].sort((a, b) => a.count - b.count), next = steps.find(s => s.count > count), prev = [...steps].reverse().find(s => s.count <= count);
  const pct = next ? Math.round((count - (prev?.count ?? 0)) / (next.count - (prev?.count ?? 0)) * 100) : 100;
  const text = el('span', null, { class: 'tx' });
  text.append(el('b', `내 도장 ${count}개`, { 'data-test': 'my-stamp-count' }), el('small', next ? `${next.name}까지 ${next.count - count}개` : '모든 칭호를 받았어요'));
  const bar = el('span', null, { class: 'bar', role: 'progressbar', 'aria-label': '다음 칭호까지', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) });
  bar.append(el('i', null, { style: `width:${pct}%` }));
  text.append(bar);
  box.innerHTML = iconHtml('medal');
  box.append(text, el('span', '›', { class: 'go', 'aria-hidden': 'true' }));
}

function renderPopular(pop, reply, rows) {
  const title = popularHeading(reply);
  if (!reply.ok) { pop.replaceChildren(title, el('p', '지금은 볼 수 없어요', { class: 'note' })); return; }
  if (!rows.length) { pop.replaceChildren(title, el('p', '아직 오늘 한 활동이 없어요', { class: 'note' })); return; }
  const list = el('ol');
  rows.slice(0, 7).forEach(({ game, plays }, i) => {
    const pick = button('', `pop-${game.id}`, () => openIntro(game));
    pick.setAttribute('aria-label', `${i + 1}위 ${game.title}, ${fmt(plays)}판`);
    pick.append(el('span', String(i + 1), { class: `rank-n${i < 3 ? ` r${i + 1}` : ''}` }),
      el('img', null, { src: assetUrl(game.cover), alt: '', loading: 'lazy', decoding: 'async' }),
      el('span', game.title, { class: 'nm' }), el('em', `${fmt(plays)}판`));
    const item = el('li'); item.append(pick); list.append(item);
  });
  pop.replaceChildren(title, list);
}

function renderFame(fame, head, firsts) {
  const items = firsts.filter(f => f.reply.ok && f.reply.rows?.[0]);
  if (!firsts.some(f => f.reply.ok)) { fame.replaceChildren(head, el('p', resting, { class: 'note' })); return; }
  if (!items.length) { fame.replaceChildren(head, el('p', '아직 기록이 없어요', { class: 'note' })); return; }
  const list = el('ol');
  for (const { game, reply } of items) {
    const row = reply.rows[0];
    const go = el('a', null, { href: `ranks.html#rank-${game.id}`, 'data-test': `fame-${game.id}` });
    go.append(el('img', null, { src: assetUrl(game.cover), alt: '', loading: 'lazy', decoding: 'async' }), el('span', game.title, { class: 'gm' }), initialsCell(row.tag), el('em', fmt(row.score), { class: 'px' }));
    const item = el('li'); item.append(go); list.append(item);
  }
  fame.replaceChildren(head, list);
}
