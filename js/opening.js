import { markEntered } from './store.js?v=1179d5aa40';
import { takeNext } from './ui.js?v=1179d5aa40';

const opening = document.querySelector('[data-test="opening"]');
const wall = opening.querySelector('.op-wall');
const covers = JSON.parse(document.querySelector('[data-gf-data="data/opening.json"]').textContent);
for (let column = 0; column < 9; column++) {
  const track = document.createElement('div');
  track.className = 'op-col';
  track.style.animationDuration = `${110 + (column % 3) * 14}s`;
  track.style.animationDelay = `${-column * 11}s`;
  const group = document.createElement('div');
  group.className = 'op-loop';
  for (const cover of covers.filter((_, i) => i % 9 === column)) {
    const image = document.createElement('img');
    image.dataset.src = cover.src;
    image.dataset.coverId = cover.id;
    image.alt = '';
    image.width = 640;
    image.height = 400;
    image.loading = 'lazy';
    image.decoding = 'async';
    group.append(image);
  }
  track.append(group, group.cloneNode(true));
  wall.append(track);
}

const images = [...wall.querySelectorAll('img')];
const load = image => {
  if (!image.hasAttribute('src')) image.src = image.dataset.src;
};
const initiallyVisible = images.filter(image => {
  const r = image.getBoundingClientRect();
  return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
});
initiallyVisible.forEach(image => { image.loading = 'eager'; load(image); });
const observer = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) { load(target); observer.unobserve(target); }
  }
}, { root: opening, rootMargin: '80px' });
images.filter(image => !image.hasAttribute('src')).forEach(image => observer.observe(image));
Promise.all([document.fonts.ready, ...initiallyVisible.map(image => image.decode())])
  .then(() => { opening.dataset.ready = '1'; });

let entering = false;
const enterButton = document.querySelector('[data-test="enter"]');
// 첫 화면 어디를 눌러도, 아무 키나 눌러도 들어간다(게임 첫 화면의 「PRESS START」처럼). 글자만 깜빡이는 모양(10-18 대표 고름)은 그대로 두고,
// 단추 모양이 없어 누르는 곳을 헤매지 않게 했다(10-21).
opening.addEventListener('click', event => { if (!event.target.closest('a,button')) enterButton.click(); });
addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || ['Tab', 'Shift', 'Escape'].includes(event.key) || event.target.closest?.('a,button,input')) return;
  event.preventDefault(); enterButton.click();
});
enterButton.addEventListener('click', () => {
  if (entering) return;
  entering = true;
  markEntered();
  observer.disconnect();
  opening.classList.add('go');
  const next=takeNext();
  const go = () => { location.href = next; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
  // 장면이 끝나면 넘어간다. 시계를 멈춘 시험 창에서도 CSS 장면은 끝나므로 타이머보다 먼저 듣는다.
  opening.querySelector('.op-flash').addEventListener('animationend', go, { once: true });
  setTimeout(go, 2500);
});
