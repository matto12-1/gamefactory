// 홈 · 순위표 · 도장판 · 목록 · 안내가 같이 쓰는 위 메뉴, 찾기 창, 과목 딱지와 이니셜 칸.
// 위 메뉴와 찾기 창은 쪽마다 HTML에 적혀 있다. 여기서는 과목과 단추의 동작을 붙인다.
import { getPrefs, setPrefs } from './store.js?v=4c5e743d5d';
import { assetUrl } from './config.js?v=4c5e743d5d';
import { el } from './ui.js?v=4c5e743d5d';
import { searchGames } from './search-match.js?v=4c5e743d5d';
import { subjectColor, subjectList } from './subjects.js?v=4c5e743d5d';
import { SUBJECT_SLUGS, CATEGORY_INFO } from './categories.js?v=4c5e743d5d';
import { navIcon } from './nav-icons.js?v=4c5e743d5d';
import { kstDate } from '../kit/time-kst.js?v=4c5e743d5d';
import { initTheme } from './theme.js?v=4c5e743d5d';
import { renderFooter } from './footer.js?v=4c5e743d5d';

export function popularHeading(reply) {
  const isToday = reply.ok && reply.date === kstDate(Date.now());
  const title = el('h2', reply.ok && reply.date && !isToday ? '어제 많이 한 활동' : '오늘 많이 한 활동');
  if (reply.ok && reply.date) {
    const [, month, day] = reply.date.split('-').map(Number);
    title.append(el('small', `${month}월 ${day}일`));
  }
  return title;
}

export function gameLine(g) { return `${(g.subjects ?? []).join(' · ')} · ${g.audience === 'all' ? '전체' : `${g.grades[0]}~${g.grades[1]}학년`}`; }
const subjectSlug = name => SUBJECT_SLUGS[name] ?? `s-${name}`;
const subjectIcon = name => CATEGORY_INFO[subjectSlug(name)]?.icon ?? 'subject';
// 두 톤 아이콘. 색을 주면 그 색이 아이콘의 뜻 색(--nav-color)이 된다.
export function iconHtml(name, color) { const html = navIcon(name); return color ? html.replace('<svg ', `<svg style="--nav-color:${color}" `) : html; }

// 과목 딱지: 그림 왼쪽 위에 작게(대표 「그냥 게임 위에 살짝 얹는 느낌으로」). 첫 과목 하나만.
export function subjectChip(game) {
  const name = game.subjects?.[0];
  if (!name) return null;
  const chip = el('span', null, { class: 'subj', 'data-test': 'subject-chip' });
  chip.innerHTML = iconHtml(subjectIcon(name), subjectColor(name));
  chip.append(name);
  return chip;
}

// 이니셜: 영어 대문자 세 글자. 이니셜이 없는 기록(예전 익명 기록 · 새기지 않고 넘긴 기록)은 흐린 「???」.
export const INITIALS = /^[A-Z]{3}$/;
export function initialsCell(tag, tagName = 'b') {
  const ok = INITIALS.test(tag ?? '');
  const node = el(tagName, ok ? tag : '???', { class: `ini px${ok ? '' : ' none'}` });
  if (!ok) node.setAttribute('aria-label', '이니셜 없음');
  return node;
}

export function initWall({ games, page, onPick }) {
  initTheme();
  renderFooter();
  document.querySelector(`.site-bar [data-page="${page}"]`)?.setAttribute('aria-current', 'page');
  const query = new URLSearchParams(location.search), category = query.get('c');
  const current = page === 'home' ? 'all' : page === 'list' ? query.get('s') ?? Object.keys(SUBJECT_SLUGS).find(name => SUBJECT_SLUGS[name] === category) ?? 'all' : null;
  const tabs = document.querySelector('[data-test="subject-tabs"]');
  if (tabs) {
    const link = (name, href, key) => {
      const a = el('a', name, { href, 'data-subject':key });
      if (current === key) a.setAttribute('aria-current', 'page');
      return a;
    };
    tabs.replaceChildren(link('전체', 'home.html', 'all'), ...subjectList(games).filter(s => s.count).map(s => link(s.name, `list.html?s=${encodeURIComponent(s.name)}`, s.name)));
    tabs.querySelector('[aria-current]')?.scrollIntoView({ block:'nearest', inline:'nearest' });
  }
  initSound();
  initSearch({ games, onPick });
}

function initSound() {
  const sound = document.querySelector('.site-bar [data-test="sound"]');
  if (!sound) return;
  let sfx = getPrefs().sfx;
  // 단추는 아이콘만 보인다. 숨은 글과 aria-label이 「소리 켬/끔」을 알려 준다(아이콘은 aria-pressed로 바뀐다).
  const text = sound.querySelector('.sr-only') ?? sound;
  const update = () => { const label = `소리 ${sfx ? '켬' : '끔'}`; text.textContent = label; sound.setAttribute('aria-label', label); sound.title = label; sound.setAttribute('aria-pressed', String(sfx)); };
  sound.addEventListener('click', () => { sfx = !sfx; setPrefs({ sfx }); update(); });
  update();
}

function initSearch({ games, onPick = g => { location.href = `home.html?${new URLSearchParams({ game: g.id })}`; } }) {
  const panel = document.querySelector('[data-test="search-panel"]'), opener = document.querySelector('[data-test="search-open"]');
  if (!panel || !opener) return;
  const input = panel.querySelector('[data-test="search"]'), list = panel.querySelector('[data-test="search-results"]');
  const closer = panel.querySelector('[data-test="search-close"]'), subjects = panel.querySelector('[data-test="search-subjects"]');

  // 과목으로 보기(보고서 7번 가): 활동이 있는 과목만, 누르면 그 과목 목록 쪽. 끝에 전체 활동.
  const subjectLinks = subjectList(games).filter(s => s.count).map(s => {
    const link = el('a', null, { href: `list.html?c=${encodeURIComponent(subjectSlug(s.name))}`, 'data-test': `search-subject-${subjectSlug(s.name)}` });
    link.innerHTML = iconHtml(subjectIcon(s.name), s.color);
    link.append(el('b', s.name), el('small', `${s.count}개`));
    return link;
  });
  const all = el('a', null, { href: 'list.html?c=all', 'data-test': 'search-subject-all' });
  all.innerHTML = iconHtml('grid');
  all.append(el('b', '전체 활동'), el('small', `${games.length}개`));
  subjects?.replaceChildren(...subjectLinks, all);

  let hits = [], active = -1;
  const shut = () => { hits = []; list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  function mark() {
    list.querySelectorAll('[role=option]').forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) { input.setAttribute('aria-activedescendant', `search-${hits[active].game.id}`); list.children[active]?.scrollIntoView({ block: 'nearest' }); }
  }
  function pick(game) { panel.close(); onPick(game); }
  function render() {
    hits = searchGames(games, input.value); active = hits.length ? 0 : -1;
    list.replaceChildren();
    if (!input.value.trim()) { shut(); return; }
    if (!hits.length) list.append(el('li', '찾는 활동이 없어요', { class: 'search-none', role: 'option', 'aria-disabled': 'true' }));
    for (const { game } of hits) {
      const item = el('li', null, { role: 'option', id: `search-${game.id}`, 'data-test': `search-item-${game.id}`, class: 'search-item' });
      const thumb = el('span', null, { class: 'search-thumb' });
      thumb.style.setProperty('--subj', subjectColor(game.subjects?.[0]));
      if (game.cover) { const img = el('img', null, { src: assetUrl(game.cover), alt: '', loading: 'lazy', decoding: 'async' }); img.addEventListener('error', () => img.remove()); thumb.append(img); }
      const text = el('span', null, { class: 'search-text' }); text.append(el('b', game.title), el('small', gameLine(game)));
      item.append(thumb, text);
      item.addEventListener('mousedown', event => event.preventDefault());
      item.addEventListener('click', () => pick(game));
      list.append(item);
    }
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); mark();
  }
  function open() { if (!panel.open) panel.showModal(); input.focus(); if (input.value.trim()) render(); }
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); panel.close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!hits.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; mark(); event.preventDefault();
    } else if (event.key === 'Enter') {
      if (event.isComposing) return;
      if (hits[active]) { pick(hits[active].game); event.preventDefault(); }
    }
  });
  opener.addEventListener('click', open);
  opener.addEventListener('input', () => { input.value = opener.value; open(); render(); });
  closer.addEventListener('click', () => panel.close());
  // 창 바깥 어두운 곳을 누르면 닫는다. 닫으면 찾던 글을 지우고 돋보기로 초점을 돌린다.
  panel.addEventListener('click', event => { if (event.target === panel) panel.close(); });
  panel.addEventListener('close', () => { input.value = ''; opener.value = ''; shut(); list.replaceChildren(); opener.focus(); });
  // 「/」 글쇠로 바로 찾기 창을 연다(글을 쓰는 칸 안에서는 그대로 글자).
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable],dialog')) return;
    event.preventDefault(); open();
  });
}
