import { labLine } from '../assets/brand/brand.js?v=4c5e743d5d';

// 내용과 링크는 공용 브랜드가 그린다. 마또랜드의 세 묶음 배치만 여기서 정한다.
export function renderFooter() {
  const foot = document.querySelector('.site-foot');
  if (!foot) return;
  foot.innerHTML = labLine('MattoLAND', { tag:'div' });
  const lab = foot.firstElementChild;
  for (const [selector, title] of [['.ll-prod','교실 도구'],['.ll-cx','연락']]) {
    const group = lab.querySelector(selector), label = document.createElement('span');
    label.className = 'foot-label'; label.textContent = title; group.prepend(label);
  }
  const info = document.createElement('div'); info.className = 'foot-info';
  info.innerHTML = '<span class="foot-label">안내</span><a class="foot-privacy" href="privacy.html" data-test="foot-privacy">개인정보 안내</a>';
  const website = lab.querySelector('.ll-cx a[href="https://matto.kr/"]');
  if (website) info.append(website);
  lab.querySelector('.lab-copy').before(info);
}
