// 홈 맨 위 「오늘의 활동」 넘기기 (10-29 저녁 대표 「넘기기 점 + 여러 장」). 고르는 법은 today.js heroSlides.
// 첫 장은 오늘의 활동(기념일 칩 · 「바로 하기」 data-test today-game), 나머지 장은 이름표(새 활동 · 2인용 · 긴 모험, 없으면 추천 활동).
// 장들은 한 칸에 겹쳐 두고 보이는 장만 켠다: 칸 높이가 가장 큰 장에 맞춰 고정돼서 폰에서 넘길 때 아래 칸이 움직이지 않는다.
// 점은 표지 아래 가운데(기준 그림). 저절로 넘김은 8초, 손을 올리거나 · 초점이 안에 있거나 · 창이 열렸거나 · 화면 밖이거나 · 탭이 숨으면 쉰다.
// 점 · 화살표 글쇠 · 손가락으로 직접 넘기면 그 뒤로는 저절로 넘기지 않는다. 움직임 줄이기면 처음부터 저절로 넘기지 않는다.
import { nextOccasion } from './today.js?v=663d2a871e';
import { el, button } from './ui.js?v=663d2a871e';
import { picture, openIntro, tag } from './cards.js?v=663d2a871e';

const AUTO_MS = 8000;

export function renderHero(hero, slides) {
  const nodes = slides.map((game, i) => slide(game, i === 0));
  hero.append(...nodes);
  if (nodes.length < 2) return;
  hero.setAttribute('aria-roledescription', '넘기는 칸'); hero.setAttribute('aria-label', '오늘의 활동과 추천 활동');
  const dots = el('div', null, { class: 'hero-dots', 'data-test': 'hero-dots' });
  const marks = slides.map((game, i) => {
    const dot = button('', `hero-dot-${i}`, () => { stop(); show(i); }); dot.className = 'hero-dot';
    dot.setAttribute('aria-label', `${i + 1}번째 장: ${game.title}`); return dot;
  });
  dots.append(...marks); hero.append(dots);
  dots.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!step) return;
    e.preventDefault(); stop(); show(at + step); marks[at].focus();
  });

  let at = 0, timer = 0, stopped = false, hover = false, seen = true, swiped = false, start = null;
  function show(i) {
    nodes[at].classList.add('off'); at = (i + nodes.length) % nodes.length;
    nodes[at].classList.remove('off', 'enter'); void hero.offsetWidth; nodes[at].classList.add('enter');
    marks.forEach((dot, k) => k === at ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'));
  }
  show(0); nodes[0].classList.remove('enter');

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const resting = () => hover || hero.matches(':focus-within') || document.hidden || !seen || !!document.querySelector('dialog[open]');
  function schedule() {
    clearTimeout(timer);
    if (!stopped && !still.matches) timer = setTimeout(() => { if (!resting()) show(at + 1); schedule(); }, AUTO_MS);
  }
  function stop() { stopped = true; clearTimeout(timer); }
  hero.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  hero.addEventListener('pointerleave', () => { hover = false; schedule(); });
  hero.addEventListener('focusout', schedule);
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; if (seen) schedule(); }).observe(hero);
  schedule();

  // 손가락 · 펜으로 옆으로 밀면 넘긴다(위아래로 굴리기는 브라우저 몫: CSS touch-action:pan-y). 민 손을 뗀 자리의 단추는 누르지 않는다.
  hero.addEventListener('pointerdown', e => { start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; });
  hero.addEventListener('pointercancel', () => { start = null; });
  hero.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    // 민 손을 단추 위에서 떼면 바로 뒤에 click이 온다. 단추 밖에서 떼면 click이 없으니 표시는 곧 푼다.
    swiped = true; setTimeout(() => { swiped = false; }, 60); stop(); show(at + (dx < 0 ? 1 : -1));
  });
  hero.addEventListener('click', e => { if (swiped) { swiped = false; e.stopPropagation(); e.preventDefault(); } }, true);

  // 뒤 장 표지는 처음 화면을 다 그린 뒤에 미리 받아 둔다(숨은 장의 lazy 그림은 켜질 때까지 안 받아서 넘길 때 빈 칸이 보인다).
  setTimeout(() => { for (const img of hero.querySelectorAll('.hero-slide img[loading="lazy"]')) img.loading = 'eager'; }, 1500);
}

function slide(game, first) {
  const node = el('div', null, { class: `hero-slide${first ? '' : ' off'}`, 'data-test': first ? 'hero-slide-today' : `hero-slide-${game.id}` });
  const text = el('div', null, { class: 'hero-text' }), cta = el('div', null, { class: 'hero-cta' });
  // 기념일 칩과 「바로 하기」는 한 묶음으로 오른쪽 아래, 왼쪽 소개 글 아래 끝에 맞춘다(10-20 대표 「내려서 간격을 맞추자」)
  const occ = first ? nextOccasion([game], new Date(), game.occasions?.[0]?.leadDays ?? 14) : null;
  if (occ) cta.append(el('span', occ.dday === 0 ? `오늘은 ${occ.name}` : `${occ.name}까지 ${occ.dday}일`, { class: 'why' }));
  const go = button('바로 하기', first ? 'today-game' : `hero-go-${game.id}`, () => openIntro(game)); go.className = 'btn go'; cta.append(go);
  text.append(el('p', first ? '오늘의 활동' : tag(game)?.[0] ?? '추천 활동', { class: 'label' }), el('h2', game.title), el('p', game.summary, { class: 'sum' }), cta);
  node.append(picture(game, 'art', { eager: first }), text);
  return node;
}
