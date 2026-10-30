import { el, button, rankRows, resting } from './ui.js?v=663d2a871e';
import { assetUrl } from './config.js?v=663d2a871e';
import { getRank } from './ledger.js?v=663d2a871e';
import { gameIntro } from './game-intro.js?v=663d2a871e';
import { subjectColor } from './subjects.js?v=663d2a871e';
const details = g => g.audience === 'all' ? `전체 · 단계마다 ${g.minutes}분` : `${g.grades[0]}~${g.grades[1]}학년 · ${g.minutes}분`;

export function badges(g, max=3) {
  const box = el('div', null, { class: 'badges' });
  const all = [];
  if (g.tags?.includes('새 활동')) all.push(['새 활동', 'new']);
  if (g.ranking.enabled) all.push(['순위', 'rank']);
  if (g.modes.includes('duo')) all.push(['2인용', 'duo']);
  if (g.modes.includes('tv')) all.push(['큰 화면', 'tv']);
  if (g.kind === 'adventure') all.push(['긴 모험', 'adv']);
  if (g.stamps?.length) all.push(['도장', 'stamp']);
  for (const [text, kind] of all.slice(0, max)) box.append(el('span', text, { class: kind }));
  return box;
}
// 카드 이름표는 하나만, 그림 위가 아니라 아래 한 줄 맨 앞에(진단 9번: 그림 위 흰 이름표 두세 개가 그림을 가렸다).
export function tag(g) {
  if (g.tags?.includes('새 활동')) return ['새 활동', 'new'];
  if (g.modes.includes('duo')) return ['2인용', 'duo'];
  if (g.kind === 'adventure') return ['긴 모험', 'adv'];
  return null;
}

export function picture(game, className, { eager = false } = {}) {
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
export async function openIntro(game) {
    if (game.siteIntro === false) {
      location.href = `study.html?${new URLSearchParams({g:game.id})}`;
      return;
    }
    const { dialog, rows } = gameIntro(game, picture);
    if (game.ranking.enabled) rows.textContent = '불러오는 중…';
    if (game.ranking.enabled) {
      const r = await getRank({ game, period: 'day', limit: 5 });
      if (dialog.isConnected) {
        if (!r.ok) rows.textContent = resting;
        else if (!r.rows.length) rows.textContent = '아직 오늘 기록이 없어요';
        else rankRows(rows, r.rows);
      }
    }
  }

export function card(g, {onOpen=openIntro,row='',rank=0}={}) {
    const node = button('', `card-${g.id}`, () => onOpen(g));
    node.className = 'game';
    node.dataset.game = g.id; node.dataset.row = row;
    const meta = el('div', null, { class: 'meta' }), sub = el('p', null, { class: 'sub' }), dot = el('span', null, { class: 'subj-dot' }), title = el('h3', g.title);
    dot.style.setProperty('--subj', subjectColor(g.subjects?.[0]));
    const mark = tag(g);
    if (mark) sub.append(el('span', mark[0], { class: `tag ${mark[1]}` }));
    sub.append(dot, el('span', `${g.subjects?.[0] ?? ''} · ${details(g)}`, { class: 'sub-text' }));
    // 인기 순위는 이름 앞 코랄 숫자(앱 장터 순위표처럼). 그림 위 숫자 동그라미는 없앴다.
    if (rank) title.prepend(el('span', String(rank), { class: `pop-rank${rank <= 3 ? ` r${rank}` : ''}`, 'data-test': 'popular-rank', 'aria-label': `인기 ${rank}위` }));
    meta.append(title, sub);
    node.append(picture(g, 'card-art'), meta);
    return node;
  }
export function gradeRow(root,{value,onChange}) {
 root.replaceChildren(...Array.from({length:7},(_,grade)=>{
  const node=button(grade?`${grade}학년`:'전체',`filter-grade-${grade}`,()=>onChange(grade));
  node.setAttribute('aria-pressed',String(value===grade));return node;
 }));
}
