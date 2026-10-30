import { assetUrl } from './config.js?v=663d2a871e';
import { el } from './ui.js?v=663d2a871e';
import { navIcon } from './nav-icons.js?v=663d2a871e';

// 동그란 도장 하나. 빌드가 그림이 있는 도장에만 art 를 적어 준다. 없거나 못 읽으면 아이콘 한 벌의 초록 도장으로 그린다.
export function stampArt(stamp) {
  const box = el('span', null, { class: 'stamp-art', 'aria-hidden': 'true' });
  const fallback = () => { box.classList.add('fallback'); box.insertAdjacentHTML('afterbegin', navIcon('medal')); };
  if (!stamp?.art) { fallback(); return box; }
  const img = el('img', null, { src: assetUrl(stamp.art), alt: '', width: '256', height: '256', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => { img.remove(); fallback(); });
  box.append(img); return box;
}

// 받은 날 「10월 7일」
export function stampDate(iso) {
  const at = Date.parse(iso); if (!Number.isFinite(at)) return '';
  const d = new Date(at + 9 * 3600000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
