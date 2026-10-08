import { getPrefs, setPrefs, getNametag, setNametag, getStamps } from './store.js?v=399a5c8957';
import { todaysGame, todaysChallenge, occasionDate } from './today.js?v=399a5c8957';
import { getRank, getSchools } from './ledger.js?v=399a5c8957';
import { assetUrl } from './config.js?v=399a5c8957';
import { earnedTitles, stampCount } from './titles.js?v=399a5c8957';
import { openNametagForm } from './nametag.js?v=399a5c8957';
import { kstDate, kstDayIndex, kstHour } from '../kit/time-kst.js?v=399a5c8957';
import { requireEntry, readData, el, button, modal, rankRows, resting, pageError } from './ui.js?v=399a5c8957';

if (requireEntry()) init().catch(pageError);

const MODE_NAMES = { solo: '혼자 하기', duo: '2인 대결', tv: '큰 화면으로 하기' };
const details = g => `${g.grades[0]}~${g.grades[1]}학년 · ${g.minutes}분`;

function badges(g) {
  const box = el('div', null, { class: 'badges' });
  if (g.ranking.enabled) box.append(el('span', '순위', { class: 'rank' }));
  if (g.modes.includes('duo')) box.append(el('span', '2인', { class: 'duo' }));
  if (g.modes.includes('tv')) box.append(el('span', '큰 화면', { class: 'tv' }));
  if (g.kind === 'adventure') box.append(el('span', '긴 모험', { class: 'adv' }));
  if (g.tags?.includes('새 게임')) box.append(el('span', '새 게임'));
  if (g.stamps?.length) box.append(el('span', '도장'));
  if (!g.ranking.enabled && g.kind === 'adventure') box.append(el('span', '계기교육'));
  return box;
}

function picture(game, className) {
  const box = el('div', null, { class: `pixel-art ${className}`, role: 'img', 'aria-label': `${game.title} 표지` });
  let hash = 0;
  for (const char of game.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  box.style.setProperty('--gf-cover-color', `var(--gf-dot${hash % 4 + 1})`);
  if (game.cover) {
    const img = el('img', null, { src: assetUrl(game.cover), alt: '' });
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

async function init() {
  const [{ games }, titlesDef] = await Promise.all([readData('data/games.json'), readData('data/titles.json').catch(() => ({ counts: [], sets: [] }))]);
  const prefs = getPrefs();

  // ── 위 메뉴: 소리, 좁은 화면의 「내 정보」 ──
  const sound = document.querySelector('[data-test="sound"]'); let sfx = prefs.sfx;
  const updateSound = () => { sound.textContent = `소리 ${sfx ? '켬' : '끔'}`; sound.setAttribute('aria-pressed', String(sfx)); };
  sound.addEventListener('click', () => { sfx = !sfx; setPrefs({ sfx }); updateSound(); }); updateSound();

  // ── 왼쪽 대시보드 ──
  const tagCard = document.querySelector('[data-test="side-nametag"]');
  function renderTag() {
    const tag = getNametag();
    tagCard.replaceChildren();
    if (tag) tagCard.append(el('p', tag.nickname, { class: 'who' }), el('p', `${tag.schoolName} ${tag.grade}학년`, { class: 'school' }));
    else tagCard.append(el('p', '내 이름표', { class: 'empty' }));
    const edit = button(tag ? '이름표 바꾸기' : '이름표 만들기', 'side-edit-name', async () => {
      edit.disabled = true;
      const next = await openNametagForm({ initial: getNametag() });
      if (next) setNametag(next);
      renderTag();
    });
    edit.className = tag ? 'btn ghost' : 'btn'; tagCard.append(edit);
  }
  renderTag();

  const stamps = getStamps(), count = stampCount(stamps);
  const stampCard = document.querySelector('[data-test="side-stamps"]');
  const steps = [...(titlesDef.counts ?? [])].sort((a, b) => a.count - b.count);
  const next = steps.find(s => s.count > count), prev = [...steps].reverse().find(s => s.count <= count);
  const pct = next ? Math.round(((count - (prev?.count ?? 0)) / (next.count - (prev?.count ?? 0))) * 100) : 100;
  const bar = el('div', null, { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) });
  bar.append(el('i', null, { style: `width:${pct}%` }));
  const count_ = el('p', String(count), { class: 'count', 'data-test': 'side-stamp-count' }); count_.append(el('small', '개'));
  stampCard.append(el('h2', '내 도장'), count_, bar, el('p', next ? `「${next.name}」까지 ${next.count - count}개 남았어요` : '모든 단계 칭호를 받았어요', { class: 'next' }));
  const titles = earnedTitles(stamps, games, titlesDef);
  if (titles.length) { const list = el('ul', null, { class: 'chips' }); for (const t of titles) list.append(el('li', t.name)); stampCard.append(list); }
  const toStamps = el('a', '내 도장판 보기', { href: 'stamps.html', class: 'btn ghost' }); stampCard.append(toStamps);

  const filters = { ...prefs.filters };
  const groups = {
    grade: [['0', '전체'], ...Array.from({ length: 6 }, (_, i) => [String(i + 1), `${i + 1}학년`])],
    subject: [['', '전체'], ...[...new Set(games.flatMap(g => g.subjects))].map(s => [s, s])],
    kind: [['', '전체'], ['short', '짧은 판'], ['adventure', '긴 모험'], ['duo', '2인'], ['tv', '큰 화면']]
  };
  function renderFilters() {
    for (const [key, values] of Object.entries(groups)) {
      const root = document.querySelector(`[data-test="filter-${key}"]`);
      root.replaceChildren(...values.map(([value, title]) => {
        const chip = button(title, `filter-${key}-${value || 'all'}`, () => {
          filters[key] = key === 'grade' ? Number(value) : value; render();
        });
        chip.setAttribute('aria-pressed', String(String(filters[key]) === value));
        return chip;
      }));
    }
  }

  // ── 안내판 (카드를 누르면 뜨는 작은 창) ──
  async function showInfo(game) {
    const dialog = modal('info', game.title);
    dialog.append(picture(game, 'info-cover'), el('p', details(game)), badges(game), el('p', game.summary));
    if (game.needsKeyboard && (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches)) dialog.append(el('p', '키보드가 있어야 해요'));
    const rows = el('div', null, { 'data-test': 'info-ranks' });
    if (game.ranking.enabled) { rows.textContent = '순위를 읽고 있어요'; dialog.append(rows); }
    for (const mode of game.modes) dialog.append(button(MODE_NAMES[mode], `mode-${mode}`, () => {
      try { const attempt = document.documentElement.requestFullscreen?.(); attempt?.catch(() => {}); } catch { /* 전체 화면이 안 돼도 놀이판으로 가요. */ }
      location.href = `play.html?${new URLSearchParams({ g: game.id, m: mode })}`;
    }));
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.append(button('닫기', 'info-close', close)); dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); dialog.showModal();
    if (game.ranking.enabled) {
      const r = await getRank({ game: game.id, period: 'day', limit: 5 });
      if (dialog.isConnected) { if (r.ok) rankRows(rows, r.rows); else rows.textContent = resting; }
    }
  }

  // ── 벤토: 오늘의 게임 ──
  const hero = document.querySelector('[data-test="today"]');
  const today = todaysGame(games);
  if (today) {
    const occ = nextOccasion([today], today.occasions?.[0]?.leadDays ?? 14);
    hero.append(picture(today, 'art'), el('p', '오늘의 게임', { class: 'label' }));
    if (occ) hero.append(el('span', occ.dday === 0 ? `오늘은 ${occ.name}` : `${occ.name}까지 ${occ.dday}일`, { class: 'why' }));
    hero.append(el('h3', today.title), el('p', today.summary, { class: 'sum' }), badges(today));
    const go = button('바로 하기', 'today-game', () => showInfo(today)); go.className = 'btn'; hero.append(go);
  } else hero.hidden = true;

  // ── 벤토: 오늘의 도전 ──
  const challengeBox = document.querySelector('[data-test="challenge"]');
  const challenge = todaysChallenge(games);
  challengeBox.append(el('p', '오늘의 도전', { class: 'label' }));
  if (challenge) {
    const text = el('p', '오늘 첫 1등이 되어 보세요', { class: 'score' }), top = el('ol', null, { 'data-test': 'challenge-top' });
    const go = button('도전하기', 'challenge-game', () => showInfo(challenge)); go.className = 'btn push';
    challengeBox.append(el('h3', challenge.title), text, top, go);
    getRank({ game: challenge.id, period: 'day', limit: 3 }).then(r => {
      if (!r.ok || !r.rows.length) return;
      text.textContent = `오늘 이 게임 전국 1등 ${r.rows[0].score.toLocaleString('ko-KR')}점`;
      for (const row of r.rows) {
        const li = el('li'); li.append(el('b', String(row.rank)), el('span', `${row.schoolName} ${row.nickname}`), el('em', row.score.toLocaleString('ko-KR'))); top.append(li);
      }
    });
  } else challengeBox.append(el('h3', '순위 게임을 준비하고 있어요'));

  // ── 벤토: 학교 대항전 ──
  const schoolBox = document.querySelector('[data-test="schools-tile"]');
  schoolBox.append(el('p', '학교 대항전 · 이번 주', { class: 'label' }));
  const schoolBody = el('div', null, { 'data-test': 'schools-body' }); schoolBody.append(el('p', '읽고 있어요', { class: 'when' }));
  schoolBox.append(schoolBody, el('a', '순위표에서 더 보기', { href: 'ranks.html', class: 'more' }));
  getSchools().then(r => {
    schoolBody.replaceChildren();
    if (!r.ok) { schoolBody.append(el('p', resting, { class: 'when' })); return; }
    if (!r.rows.length) { schoolBody.append(el('p', '이번 주 첫 학교가 되어 보세요', { class: 'when' })); return; }
    const list = el('ol');
    for (const row of r.rows.slice(0, 3)) {
      const li = el('li'), name = el('span', row.schoolName);
      if (row.dupName) name.append(el('small', row.sido));
      li.append(el('b', String(row.rank)), name, el('em', `별 ${row.points.toLocaleString('ko-KR')}`)); list.append(li);
    }
    schoolBody.append(list);
    if (r.computedAt) schoolBody.append(el('p', `${kstHour(Date.parse(r.computedAt))}시 기준`, { class: 'when' }));
  });

  // ── 다가오는 계기일 (60일 안에 있을 때만, 선반 맨 앞 칸) ──
  const upcoming = nextOccasion(games);
  function occasionTile() {
    const box = el('article', null, { class: 'panel occasion', 'data-test': 'occasion' });
    box.append(el('p', '다가오는 날', { class: 'label' }), el('p', upcoming.dday === 0 ? '오늘' : `${upcoming.dday}일 뒤`, { class: 'dday' }), el('h3', upcoming.name));
    const go = button(upcoming.game.title, 'occasion-game', () => showInfo(upcoming.game)); go.className = 'btn ghost push'; box.append(go);
    return box;
  }

  const shelf = document.querySelector('[data-test="shelf"]');
  const updates = document.querySelector('[data-test="updates"]');
  function updateArrows(rail) {
    const [prev, next] = rail.parentElement.querySelectorAll('.arrow');
    const end = rail.scrollWidth - rail.clientWidth;
    prev.disabled = end <= 1 || rail.scrollLeft <= 1;
    next.disabled = end <= 1 || rail.scrollLeft >= end - 1;
  }
  const railObserver = new ResizeObserver(entries => {
    for (const { target } of entries) updateArrows(target);
  });
  if (upcoming) updates.append(occasionTile());
  function card(g, row) {
    const node = button('', `card-${g.id}`, () => showInfo(g));
    node.className = 'game';
    node.dataset.game = g.id; node.dataset.row = row;
    const meta = el('div', null, { class: 'meta' });
    meta.append(el('h3', g.title), el('p', details(g), { class: 'sub' }), badges(g));
    node.append(picture(g, 'card-art'), meta);
    return node;
  }
  function row(title, key, list) {
    const section = el('section', null, { class: 'shelf', 'data-test': `shelf-${key}` });
    const heading = el('div', null, { class: 'shelf-title' });
    const rail = el('div', null, { class: 'rail', 'aria-label': title, tabindex: '0' });
    const arrows = el('div', null, { class: 'arrows' });
    for (const [label, direction, symbol] of [['앞 게임', -1, '‹'], ['다음 게임', 1, '›']]) {
      const arrow = button(symbol, `${key}-${direction < 0 ? 'prev' : 'next'}`, () => rail.scrollBy({
        left: direction * rail.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      }));
      arrow.className = 'arrow'; arrow.setAttribute('aria-label', `${title} ${label}`); arrows.append(arrow);
    }
    heading.append(el('h2', title), el('small', `${list.length}개`), arrows);
    rail.append(...list.map(g => card(g, key))); section.append(heading, rail);
    rail.addEventListener('scroll', () => updateArrows(rail));
    railObserver.observe(rail);
    return section;
  }
  function render() {
    const matching = games.filter(g => (!filters.grade || (g.grades[0] <= filters.grade && g.grades[1] >= filters.grade)) && (!filters.subject || g.subjects.includes(filters.subject)) && (!filters.kind || (['duo', 'tv'].includes(filters.kind) ? g.modes.includes(filters.kind) : g.kind === filters.kind)));
    railObserver.disconnect();
    shelf.replaceChildren();
    const rows = [
      ['오늘 새로 나온 게임', 'new', matching.filter(g => g.tags?.includes('새 게임'))],
      ['순위 겨루기', 'rank', matching.filter(g => g.ranking.enabled)],
      ['둘이서 하기', 'duo', matching.filter(g => g.modes.includes('duo'))],
      ['계기교육 모험', 'adventure', matching.filter(g => g.kind === 'adventure' && !g.ranking.enabled)],
      ['전체 게임', 'all', matching]
    ];
    for (const [title, key, list] of rows) if (list.length) shelf.append(row(title, key, list));
    if (!matching.length) {
      const empty = el('div', null, { class: 'empty-results', 'data-test': 'empty-results', role: 'status' });
      empty.append(el('p', '맞는 게임이 아직 없어요'), button('거르기 풀기', 'reset-filters', () => {
        Object.assign(filters, { grade: 0, subject: '', kind: '' }); render();
      })); shelf.append(empty);
    }
    const first = shelf.querySelector('.shelf');
    if (first) first.after(updates); else shelf.after(updates);
    renderFilters(); setPrefs({ filters });
  }
  document.querySelector('[data-test="credits"]').addEventListener('click', event => {
    event.preventDefault();
    const dialog = modal('credits', '만든 사람·사진 출처');
    dialog.append(el('p', 'MattoLAB에서 만들어요. 그림 출처는 각 게임에 적혀 있어요.'));
    dialog.append(button('닫기', 'credits-close', () => { dialog.close(); dialog.remove(); })); dialog.showModal();
  });
  render();
}
