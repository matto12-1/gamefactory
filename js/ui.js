import { assetUrl } from './config.js?v=1179d5aa40';
import { sessionEntered } from './store.js?v=1179d5aa40';
import { safeLocal, currentLocal } from './nav-target.js?v=1179d5aa40';
export const resting = '지금은 순위를 볼 수 없어요';
export function requireEntry() {
  if (sessionEntered()) return true;
  try { sessionStorage.setItem('gf:next',currentLocal(location)); } catch { /* 막힌 탭 저장소에서는 대문으로 간다. */ }
  location.replace('index.html'); return false;
}
export function takeNext() {
  try { const target=safeLocal(sessionStorage.getItem('gf:next'));sessionStorage.removeItem('gf:next');return target??'home.html'; }
  catch { return 'home.html'; }
}
export function rememberFrom() {
  try { sessionStorage.setItem('gf:from',currentLocal(location)); } catch { /* 기록할 수 없으면 나갈 때 대문으로 간다. */ }
}
export function backTarget() {
  try { return safeLocal(sessionStorage.getItem('gf:from'))??'home.html'; } catch { return 'home.html'; }
}
export function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
export function button(text, test, action) {
  const node = el('button', text, { type: 'button', 'data-test': test });
  node.addEventListener('click', action); return node;
}
export function link(text, path, test) { return el('a', text, { href: path, class: 'link-button', 'data-test': test }); }
export async function readData(path) {
  // 빌드가 HTML에 심어 둔 자료가 있으면 그것을 읽는다. 받아 오기를 기다리지 않으니
  // 첫 그림이 이미 다 채워진 화면이라 내용이 자라면서 아래를 밀어내지 않는다.
  const inline = document.querySelector(`script[type="application/json"][data-gf-data="${path}"]`);
  if (inline) return JSON.parse(inline.textContent);
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error('자료를 불러오지 못했어요');
  return response.json();
}
export function pageError(error) {
  const main = document.querySelector('main');
  main.replaceChildren(el('p', '자료를 불러오지 못했어요. 다시 열어 주세요.', { role: 'alert', 'data-test': 'page-error' }), link('홈으로', 'home.html', 'home'));
  console.error(error);
}
export function grades(select, all = true) {
  if (all) select.append(el('option', '전체', { value: '0' }));
  for (let i = 1; i <= 6; i++) select.append(el('option', `${i}학년`, { value: String(i) }));
}
export function modal(test, title) {
  const dialog = el('dialog', null, { 'data-test': test, 'aria-label': title });
  dialog.append(el('h2', title)); document.body.append(dialog); return dialog;
}
export function rankRows(parent, rows, schools = false) {
  parent.replaceChildren();
  if (!rows.length) { parent.append(el('p', '아직 기록이 없어요')); return; }
  for (const row of rows) {
    const line = el('p', `${row.rank} · ${row.schoolName}${schools ? '' : ` ${row.grade}학년 ${row.nickname}`} · ${schools ? '별 ' : ''}${Number(schools ? row.points : row.score).toLocaleString('ko-KR')}${schools ? '개' : ''}`);
    if (row.dupName) line.append(el('small', row.sido));
    if (schools) line.append(el('small', `${row.kids}명 참여`));
    parent.append(line);
  }
}
