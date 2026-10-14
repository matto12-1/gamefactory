// 대문·순위표·도장판이 함께 쓰는 머리띠: 소리 단추, 이름표 칸, 게임 찾기.
// 머리띠 마크업은 각 쪽 HTML에 그대로 적혀 있다(그린 뒤에 밀리지 않게). 여기서는 움직임만 붙인다.
import { getPrefs, setPrefs, getNametag, setNametag } from './store.js?v=3b50e18461';
import { openNametagForm } from './nametag.js?v=3b50e18461';
import { assetUrl } from './config.js?v=3b50e18461';
import { el, button } from './ui.js?v=3b50e18461';
import { searchGames } from './search-match.js?v=3b50e18461';
import { subjectColor } from './subjects.js?v=3b50e18461';

export function gameLine(g) { return `${(g.subjects ?? []).join(' · ')} · ${g.audience === 'all' ? '전체' : `${g.grades[0]}~${g.grades[1]}학년`}`; }

export function initTopbar({ games, onPick = g => { location.href = `home.html?${new URLSearchParams({ game: g.id })}`; }, onTag = () => {} }) {
  const top = document.querySelector('[data-test="topbar"]');

  // ── 소리 ──
  const sound = top.querySelector('[data-test="sound"]'); let sfx = getPrefs().sfx;
  // 단추는 아이콘만 보인다. 숨은 글과 aria-label이 「소리 켬/끔」을 알려 준다(아이콘은 aria-pressed로 바뀐다).
  const soundText = sound.querySelector('.sr-only') ?? sound;
  const updateSound = () => { const label = `소리 ${sfx ? '켬' : '끔'}`; soundText.textContent = label; sound.setAttribute('aria-label', label); sound.title = label; sound.setAttribute('aria-pressed', String(sfx)); };
  sound.addEventListener('click', () => { sfx = !sfx; setPrefs({ sfx }); updateSound(); }); updateSound();

  // ── 이름표 ──
  const tagCard = top.querySelector('[data-test="side-nametag"]');
  function renderTag() {
    const tag = getNametag();
    tagCard.replaceChildren();
    // 이름표가 있으면 칩 하나(글자 얼굴 + 별명 + 학교)가 통째로 「바꾸기」 단추, 없으면 「이름표 만들기」 단추.
    const edit = button('', 'side-edit-name', async () => {
      edit.disabled = true;
      const next = await openNametagForm({ initial: getNametag() });
      if (next) { setNametag(next); onTag(next); }
      renderTag();
    });
    if (tag) {
      const text = el('span', null, { class: 'tag-text' });
      text.append(el('b', tag.nickname, { class: 'who' }), el('small', `${tag.schoolName} ${tag.grade}학년`, { class: 'school' }));
      edit.append(el('span', [...tag.nickname][0] ?? '?', { class: 'avatar', 'aria-hidden': 'true' }), text);
      edit.className = 'tag-chip'; edit.setAttribute('aria-label', `이름표 바꾸기: ${tag.nickname}, ${tag.schoolName} ${tag.grade}학년`);
    } else {
      edit.insertAdjacentHTML('afterbegin', '<svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>');
      edit.append(el('span', '이름표 만들기', { class: 'cta-text' }));
      edit.className = 'tag-cta'; edit.setAttribute('aria-label', '이름표 만들기');
    }
    tagCard.append(edit);
  }
  renderTag();

  // ── 게임 찾기 ──
  const input = top.querySelector('[data-test="search"]'), list = top.querySelector('[data-test="search-results"]');
  const opener = top.querySelector('[data-test="search-open"]'), closer = top.querySelector('[data-test="search-close"]');
  let hits = [], active = -1;
  function close(clear = false) {
    list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1;
    if (clear) input.value = '';
  }
  function leave() { close(true); top.classList.remove('searching'); document.body.classList.remove('gf-searching'); }
  function mark() {
    list.querySelectorAll('[role=option]').forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) { input.setAttribute('aria-activedescendant', `search-${hits[active].game.id}`); list.children[active]?.scrollIntoView({ block: 'nearest' }); }
  }
  function pick(game) { leave(); onPick(game); }
  function render() {
    hits = searchGames(games, input.value); active = hits.length ? 0 : -1;
    list.replaceChildren();
    if (!input.value.trim()) { close(); return; }
    if (!hits.length) list.append(el('li', '찾는 게임이 아직 없어요', { class: 'search-none', role: 'option', 'aria-disabled': 'true' }));
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
  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  input.addEventListener('blur', () => { if (!top.classList.contains('searching')) close(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!hits.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; mark(); event.preventDefault();
    } else if (event.key === 'Enter') {
      if (event.isComposing) return;
      if (hits[active]) { pick(hits[active].game); event.preventDefault(); }
    } else if (event.key === 'Escape') { leave(); input.blur(); event.preventDefault(); }
  });
  opener.addEventListener('click', () => { top.classList.add('searching'); document.body.classList.add('gf-searching'); input.focus(); });
  closer.addEventListener('click', () => { leave(); opener.focus(); });
  // 「/」 글쇠로 바로 찾기 칸에 들어간다(글을 쓰는 칸 안에서는 그대로 글자).
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target.closest?.('input,textarea,select,[contenteditable],dialog')) return;
    event.preventDefault();
    if (getComputedStyle(input).display === 'none' || !input.offsetParent) opener.click(); else input.focus();
  });
  return { renderTag };
}
