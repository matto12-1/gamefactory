import { getPrefs, setPrefs, getStamps } from './store.js?v=3b50e18461';
import { todaysGame, todaysChallenge, occasionDate } from './today.js?v=3b50e18461';
import { getRank, getSchools, getPopular } from './ledger.js?v=3b50e18461';
import { assetUrl } from './config.js?v=3b50e18461';
import { earnedTitles, stampCount } from './titles.js?v=3b50e18461';
import { kstDate, kstDayIndex, kstHour } from '../kit/time-kst.js?v=3b50e18461';
import { requireEntry, readData, el, button, modal, rankRows, resting, pageError } from './ui.js?v=3b50e18461';
import { gameIntro } from './game-intro.js?v=3b50e18461';
import { initTopbar } from './topbar.js?v=3b50e18461';
import { subjectList, subjectColor } from './subjects.js?v=3b50e18461';
import { stampArt } from './stamp-art.js?v=3b50e18461';

if (requireEntry()) init().catch(pageError);

const details = g => g.audience === 'all' ? `전체 · 단계마다 ${g.minutes}분` : `${g.grades[0]}~${g.grades[1]}학년 · ${g.minutes}분`;
const POPULAR = 10;

// 이름표는 카드 3개, 오늘의 게임 2개까지(A안: 7개까지 붙어 산만했다). 앞에 있을수록 먼저 붙는다.
function badges(g, max) {
  const box = el('div', null, { class: 'badges' });
  const all = [];
  if (g.tags?.includes('새 게임')) all.push(['새 게임', 'new']);
  if (g.ranking.enabled) all.push(['순위', 'rank']);
  if (g.modes.includes('duo')) all.push(['2인용', 'duo']);
  if (g.modes.includes('tv')) all.push(['큰 화면', 'tv']);
  if (g.kind === 'adventure') all.push(['긴 모험', 'adv']);
  if (g.stamps?.length) all.push(['도장', 'stamp']);
  for (const [text, kind] of all.slice(0, max)) box.append(el('span', text, { class: kind }));
  return box;
}

// eager: 첫 화면에 바로 보이는 표지(오늘의 게임)만 참으로 둔다. 선반 표지는 한 장 120KB씩 스무 장이라
// 미뤄 두면 처음에 보이는 몇 장만 받는다. 크기(960x540)는 그림의 본디 크기라 그대로 적어 두면
// 받기 전에도 브라우저가 자리를 알아서 그림이 늦게 와도 글이 밀리지 않는다.
function picture(game, className, { eager = false } = {}) {
  const box = el('div', null, { class: `pixel-art ${className}`, role: 'img', 'aria-label': `${game.title} 표지` });
  let hash = 0;
  for (const char of game.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  box.style.setProperty('--gf-cover-color', `var(--gf-dot${hash % 4 + 1})`);
  if (game.cover) {
    const img = el('img', null, { src: assetUrl(game.cover), alt: '', width: '960', height: '540', decoding: 'async', ...(eager ? { fetchpriority: 'high' } : { loading: 'lazy' }) });
    img.addEventListener('error', () => img.remove());
    box.append(img);
  }
  return box;
}

// 오늘부터 days일 안에 오는 가장 가까운 계기일 { game, name, dday }
function nextOccasion(games, days = 60, ms = Date.now()) {
  const today = kstDayIndex(ms), year = Number(kstDate(ms).slice(0, 4));
  let best = null;
  for (const game of games) for (const occasion of game.occasions ?? []) for (const y of [year, year + 1]) {
    const date = occasionDate(occasion, y); if (!date) continue;
    const at = Date.parse(`${y}-${date}T00:00:00+09:00`); if (!Number.isFinite(at)) continue;
    const dday = kstDayIndex(at) - today;
    if (dday >= 0 && dday <= days && (!best || dday < best.dday)) best = { game, name: occasion.name, dday };
  }
  return best;
}

const medal = rank => el('span', String(rank), { class: `medal${rank <= 3 ? ` m${rank}` : ''}`, 'aria-label': `${rank}등` });

async function init() {
  const [{ games }, titlesDef] = await Promise.all([readData('data/games.json'), readData('data/titles.json').catch(() => ({ counts: [], sets: [] }))]);
  const prefs = getPrefs();
  const byId = new Map(games.map(g => [g.id, g]));
  initTopbar({ games, onPick: game => showInfo(game) });

  // ── 소식: 내 도장 ──
  const stamps = getStamps(), count = stampCount(stamps);
  const stampCard = document.querySelector('[data-test="side-stamps"]');
  const steps = [...(titlesDef.counts ?? [])].sort((a, b) => a.count - b.count);
  const next = steps.find(s => s.count > count), prev = [...steps].reverse().find(s => s.count <= count);
  const pct = next ? Math.round(((count - (prev?.count ?? 0)) / (next.count - (prev?.count ?? 0))) * 100) : 100;
  const bar = el('div', null, { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) });
  bar.append(el('i', null, { style: `width:${pct}%` }));
  const count_ = el('p', String(count), { class: 'count', 'data-test': 'side-stamp-count' }); count_.append(el('small', '개'));
  // 최근 받은 도장 셋. 아직 없으면 흐린 빈 도장 셋으로 「모으는 곳」임을 보여 준다.
  const recent = [];
  for (const game of games) for (const s of game.stamps ?? []) if (stamps[game.id]?.[s.id]) recent.push({ s, at: stamps[game.id][s.id] });
  recent.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const shelfRow = el('div', null, { class: `stamp-row${recent.length ? '' : ' locked'}` });
  for (let i = 0; i < 3; i++) shelfRow.append(stampArt(recent[i]?.s));
  const head = el('div', null, { class: 'panel-head' }); head.append(el('p', '내 도장', { class: 'label' }), count_);
  stampCard.append(head, shelfRow, bar, el('p', next ? `「${next.name}」까지 ${next.count - count}개 남았어요` : '모든 단계 칭호를 받았어요', { class: 'next' }));
  const titles = earnedTitles(stamps, games, titlesDef);
  if (titles.length) { const list = el('ul', null, { class: 'chips' }); for (const t of titles) list.append(el('li', t.name)); stampCard.append(list); }
  stampCard.append(el('a', '내 도장판 보기', { href: 'stamps.html', class: 'btn ghost' }));

  // ── 거르기 ──
  const filters = { ...prefs.filters };
  const subjects = subjectList(games);
  const groups = {
    grade: [['0', '전체'], ...Array.from({ length: 6 }, (_, i) => [String(i + 1), `${i + 1}학년`])],
    subject: [['', '전체'], ...subjects.map(s => [s.name, s.name, s])],
    kind: [['', '전체'], ['short', '짧은 판'], ['adventure', '긴 모험'], ['duo', '2인용'], ['tv', '큰 화면']]
  };
  const filterBox = document.querySelector('.filters'), more = document.querySelector('[data-test="filter-more"]'), done = document.querySelector('[data-test="filter-done"]');
  function renderFilters() {
    for (const [key, values] of Object.entries(groups)) {
      const root = document.querySelector(`[data-test="filter-${key}"]`);
      root.replaceChildren(...values.map(([value, title, info]) => {
        const chip = button('', `filter-${key}-${value || 'all'}`, () => {
          filters[key] = key === 'grade' ? Number(value) : value; render();
        });
        if (info) {
          const dot = el('span', null, { class: 'subj-dot' }); dot.style.setProperty('--subj', info.color);
          chip.append(dot, title, el('small', String(info.count), { class: 'n' }));
          if (!info.count) chip.classList.add('zero');
        } else chip.textContent = title;
        chip.setAttribute('aria-pressed', String(String(filters[key]) === value));
        return chip;
      }));
    }
    const picked = [filters.subject, groups.kind.find(([v]) => v && v === filters.kind)?.[1]].filter(Boolean);
    more.textContent = picked.length ? `과목·종류 · ${picked.join(', ')}` : '과목·종류';
    more.classList.toggle('on', picked.length > 0);
  }
  // 폰: 과목·종류는 아래서 올라오는 창에 넣는다(학년 한 줄만 늘 보여 첫 화면에 게임이 보이게).
  function sheet(open) {
    filterBox.classList.toggle('open', open); more.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('gf-sheet', open);
    if (open) filterBox.querySelector('[data-test="filter-subject"] button')?.focus();
  }
  more.addEventListener('click', () => sheet(!filterBox.classList.contains('open')));
  done.addEventListener('click', () => { sheet(false); more.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && filterBox.classList.contains('open')) { sheet(false); more.focus(); } });
  // 칩을 누르면 다시 그려져 눌린 칩이 문서에서 빠진다. 그래서 누른 순간의 경로로 창 안인지 본다.
  const sheetBox = document.querySelector('[data-test="filter-sheet"]');
  document.addEventListener('click', e => { if (filterBox.classList.contains('open') && !e.composedPath().some(n => n === sheetBox || n === more)) sheet(false); });

  // ── 안내판 (카드를 누르면 뜨는 작은 창) ──
  async function showInfo(game) {
    const { dialog, rows } = gameIntro(game, picture);
    if (game.ranking.enabled) rows.textContent = '순위를 읽고 있어요';
    if (game.ranking.enabled) {
      const r = await getRank({ game: game.id, period: 'day', limit: 5 });
      if (dialog.isConnected) {
        if (!r.ok) rows.textContent = resting;
        else if (!r.rows.length) rows.textContent = '아직 오늘 기록이 없어요';
        else rankRows(rows, r.rows);
      }
    }
  }

  // ── 오늘의 게임 ──
  const hero = document.querySelector('[data-test="today"]');
  const today = todaysGame(games);
  if (today) {
    const occ = nextOccasion([today], today.occasions?.[0]?.leadDays ?? 14);
    const text = el('div', null, { class: 'hero-text' });
    text.append(el('p', '오늘의 게임', { class: 'label' }));
    if (occ) text.append(el('span', occ.dday === 0 ? `오늘은 ${occ.name}` : `${occ.name}까지 ${occ.dday}일`, { class: 'why' }));
    text.append(el('h2', today.title), el('p', today.summary, { class: 'sum' }), badges(today, 2));
    const go = button('바로 하기', 'today-game', () => showInfo(today)); go.className = 'btn'; text.append(go);
    hero.append(picture(today, 'art', { eager: true }), text);
  } else hero.hidden = true;

  // ── 소식: 오늘의 도전 ──
  const challengeBox = document.querySelector('[data-test="challenge"]');
  const challenge = todaysChallenge(games);
  if (challenge) {
    const head = el('div', null, { class: 'panel-head' }), title = el('div');
    title.append(el('p', '오늘의 도전', { class: 'label' }), el('h2', challenge.title));
    head.append(picture(challenge, 'mini-art'), title);
    const text = el('p', '오늘 첫 1등이 되어 보세요', { class: 'score' }), top = el('ol', null, { 'data-test': 'challenge-top', class: 'medals' });
    for (let rank = 1; rank <= 3; rank++) { const li = el('li', null, { class: 'empty' }); li.append(medal(rank), el('span', `${rank}등 자리가 비어 있어요`)); top.append(li); }
    const go = button('도전하기', 'challenge-game', () => showInfo(challenge)); go.className = 'btn push';
    challengeBox.append(head, text, top, go);
    getRank({ game: challenge.id, period: 'day', limit: 3 }).then(r => {
      if (!r.ok) { top.after(el('p', `${resting}. 게임은 그대로 할 수 있어요`, { class: 'when' })); return; }
      if (!r.rows.length) return;
      text.textContent = `오늘 이 게임 전국 1등 ${r.rows[0].score.toLocaleString('ko-KR')}점`;
      top.replaceChildren();
      for (const row of r.rows) {
        const li = el('li'); li.append(medal(row.rank), el('span', `${row.schoolName} ${row.nickname}`), el('em', row.score.toLocaleString('ko-KR'))); top.append(li);
      }
    });
  } else challengeBox.append(el('p', '오늘의 도전', { class: 'label' }), el('h2', '순위 게임을 준비하고 있어요'));

  // ── 소식: 학교 대항전 ──
  const schoolBox = document.querySelector('[data-test="schools-tile"]');
  schoolBox.append(el('p', '이번 주', { class: 'label' }), el('h2', '학교 대항전'));
  const schoolBody = el('div', null, { 'data-test': 'schools-body' }); schoolBody.append(el('p', '읽고 있어요', { class: 'when' }));
  schoolBox.append(schoolBody, el('a', '순위표에서 더 보기', { href: 'ranks.html?view=schools', class: 'more' }));
  getSchools().then(r => {
    schoolBody.replaceChildren();
    if (!r.ok) { schoolBody.append(el('p', `${resting}. 조금 뒤에 다시 볼 수 있어요`, { class: 'when' })); return; }
    if (!r.rows.length) { schoolBody.append(el('p', '이번 주 첫 학교가 되어 보세요', { class: 'when' })); return; }
    const list = el('ol', null, { class: 'medals' });
    for (const row of r.rows.slice(0, 3)) {
      const li = el('li'), name = el('span', row.schoolName);
      if (row.dupName) name.append(el('small', row.sido));
      li.append(medal(row.rank), name, el('em', `별 ${row.points.toLocaleString('ko-KR')}`)); list.append(li);
    }
    schoolBody.append(list);
    if (r.computedAt) schoolBody.append(el('p', `${kstHour(Date.parse(r.computedAt))}시 기준`, { class: 'when' }));
  });

  // ── 소식: 다가오는 계기일 (60일 안에 있을 때만) ──
  const upcoming = nextOccasion(games);
  const updates = document.querySelector('[data-test="updates"]');
  if (upcoming) {
    const box = el('article', null, { class: 'panel occasion', 'data-test': 'occasion' });
    const head = el('div', null, { class: 'panel-head' }), title = el('div');
    title.append(el('p', '다가오는 날', { class: 'label' }), el('p', upcoming.dday === 0 ? '오늘' : `${upcoming.dday}일 뒤`, { class: 'dday' }));
    head.append(picture(upcoming.game, 'mini-art'), title);
    const go = button(upcoming.game.title, 'occasion-game', () => showInfo(upcoming.game)); go.className = 'btn ghost push';
    box.append(head, el('h2', upcoming.name), go); updates.append(box);
  }

  // ── 지금 인기 게임: 장부가 오늘(없으면 어제) 많이 한 차례를 준다. 못 받으면 추천으로 채운다 ──
  let popular = { state: 'loading', ids: [], title: '지금 인기 게임' };
  const recommended = () => [...new Set([challenge, ...games.filter(g => g.ranking.enabled), ...games].filter(Boolean))].map(g => g.id);
  getPopular(POPULAR).then(r => {
    const ids = r.ok ? r.rows.map(row => row.game).filter(id => byId.has(id)) : [];
    popular = ids.length
      ? { state: 'ok', ids, title: r.date === kstDate(Date.now()) ? '지금 인기 게임' : '어제 인기 게임' }
      : { state: 'fallback', ids: recommended(), title: '추천 게임' };
    const old = shelf.querySelector('[data-test="shelf-popular"]'), fresh = popularRow();
    if (old && fresh) old.replaceWith(fresh); else render();
  });

  const shelf = document.querySelector('[data-test="shelf"]');
  const count$ = document.querySelector('[data-test="result-count"]');
  function updateArrows(rail) {
    const [prev, next] = rail.parentElement.querySelectorAll('.arrow');
    const end = rail.scrollWidth - rail.clientWidth;
    prev.disabled = end <= 1 || rail.scrollLeft <= 1;
    next.disabled = end <= 1 || rail.scrollLeft >= end - 1;
  }
  const railObserver = new ResizeObserver(entries => {
    for (const { target } of entries) updateArrows(target);
  });
  function card(g, row, rank) {
    const node = button('', `card-${g.id}`, () => showInfo(g));
    node.className = 'game';
    node.dataset.game = g.id; node.dataset.row = row;
    const meta = el('div', null, { class: 'meta' }), sub = el('p', null, { class: 'sub' }), dot = el('span', null, { class: 'subj-dot' });
    dot.style.setProperty('--subj', subjectColor(g.subjects?.[0]));
    sub.append(dot, `${g.subjects?.[0] ?? ''} · ${details(g)}`);
    meta.append(el('h3', g.title), sub, badges(g, 3));
    node.append(picture(g, 'card-art'), meta);
    if (rank) node.append(el('span', String(rank), { class: `pop-rank${rank <= 3 ? ` r${rank}` : ''}`, 'data-test': 'popular-rank', 'aria-label': `인기 ${rank}위` }));
    return node;
  }
  function row(title, key, list, { ranked = false, skeleton = 0 } = {}) {
    const section = el('section', null, { class: `shelf shelf-${key}`, 'data-test': `shelf-${key}` });
    const heading = el('div', null, { class: 'shelf-title' });
    const rail = el('div', null, { class: 'rail', 'aria-label': title, tabindex: '0' });
    const arrows = el('div', null, { class: 'arrows' });
    for (const [label, direction, symbol] of [['앞 게임', -1, '‹'], ['다음 게임', 1, '›']]) {
      const arrow = button(symbol, `${key}-${direction < 0 ? 'prev' : 'next'}`, () => rail.scrollBy({
        left: direction * rail.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      }));
      arrow.className = 'arrow'; arrow.setAttribute('aria-label', `${title} ${label}`); arrows.append(arrow);
    }
    heading.append(el('h2', title), el('small', skeleton ? '' : `${list.length}개`), arrows);
    rail.append(...list.map((g, i) => card(g, key, ranked ? i + 1 : 0)));
    for (let i = 0; i < skeleton; i++) rail.append(el('div', null, { class: 'game skeleton', 'aria-hidden': 'true' }));
    section.append(heading, rail);
    rail.addEventListener('scroll', () => updateArrows(rail));
    railObserver.observe(rail);
    return section;
  }
  function grid(title, key, list) {
    const section = el('section', null, { class: `shelf shelf-${key}`, 'data-test': `shelf-${key}` });
    const heading = el('div', null, { class: 'shelf-title' });
    heading.append(el('h2', title), el('small', `${list.length}개`));
    const box = el('div', null, { class: 'game-grid' });
    box.append(...list.map(g => card(g, key)));
    section.append(heading, box); return section;
  }
  const matches = g => (!filters.grade || (g.grades[0] <= filters.grade && g.grades[1] >= filters.grade)) && (!filters.subject || g.subjects.includes(filters.subject)) && (!filters.kind || (['duo', 'tv'].includes(filters.kind) ? g.modes.includes(filters.kind) : g.kind === filters.kind));
  function popularRow() {
    if (popular.state === 'loading') return row(popular.title, 'popular', [], { skeleton: 5 });
    const list = popular.ids.map(id => byId.get(id)).filter(g => g && matches(g)).slice(0, POPULAR);
    return list.length ? row(popular.title, 'popular', list, { ranked: popular.state === 'ok' }) : null;
  }
  function render() {
    const matching = games.filter(matches);
    railObserver.disconnect();
    shelf.replaceChildren();
    const top = popularRow(); if (top) shelf.append(top);
    const rows = [
      ['오늘 새로 나온 게임', 'new', matching.filter(g => g.tags?.includes('새 게임'))],
      ['순위 겨루기', 'rank', matching.filter(g => g.ranking.enabled)],
      ['2인용 게임', 'duo', matching.filter(g => g.modes.includes('duo'))],
      ['계기교육 모험', 'adventure', matching.filter(g => g.kind === 'adventure' && !g.ranking.enabled)]
    ];
    for (const [title, key, list] of rows) if (list.length) shelf.append(row(title, key, list));
    if (matching.length) shelf.append(grid('전체 게임', 'all', matching));
    if (!matching.length) {
      shelf.replaceChildren();
      const empty = el('div', null, { class: 'empty-results', 'data-test': 'empty-results', role: 'status' });
      empty.append(el('p', filters.subject && !subjects.find(s => s.name === filters.subject)?.count ? `${filters.subject} 게임은 아직 준비하고 있어요` : '맞는 게임이 아직 없어요'), button('거르기 풀기', 'reset-filters', () => {
        Object.assign(filters, { grade: 0, subject: '', kind: '' }); render();
      })); shelf.append(empty);
    }
    const first = shelf.querySelector('.shelf');
    if (first) first.after(updates); else shelf.after(updates);
    // 거르기를 누르면 몇 개가 남았는지 소리로도 알려 준다(role=status).
    count$.textContent = matching.length === games.length ? `게임 ${games.length}개` : `${games.length}개 가운데 ${matching.length}개`;
    done.textContent = `${matching.length}개 보기`;
    renderFilters(); setPrefs({ filters });
  }
  document.querySelector('[data-test="credits"]').addEventListener('click', event => {
    event.preventDefault();
    const dialog = modal('credits', '만든 사람·사진·글꼴 출처');
    dialog.append(el('p', 'MattoLAB에서 만들어요. 그림 출처는 각 게임에 적혀 있어요.'));
    const fonts = el('p', '글꼴: Pretendard, 도현체, 주아체, Sora, Big Shoulders Display(MattoLAB 로고). 모두 SIL 오픈 폰트 라이선스(OFL)로 써요. ');
    fonts.append(el('a', '주아체 라이선스 보기', { href: 'assets/fonts/Jua-OFL.txt', target: '_blank', rel: 'noopener' }));
    dialog.append(fonts, button('닫기', 'credits-close', () => { dialog.close(); dialog.remove(); })); dialog.showModal();
  });
  render();

  // 검색이 다른 쪽에서 넘겨준 게임(home.html?game=<id>)은 소개 창을 바로 연다.
  const asked = byId.get(new URLSearchParams(location.search).get('game'));
  if (asked) { history.replaceState(null, '', location.pathname); showInfo(asked); }
}
