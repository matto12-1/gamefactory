import { assetUrl } from './config.js?v=399a5c8957';
import { sessionEntered } from './store.js?v=399a5c8957';
export const resting = '순위표가 잠깐 쉬고 있어요';
export function requireEntry() {
  if (sessionEntered()) return true;
  location.replace('index.html'); return false;
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
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error('자료를 읽을 수 없어요');
  return response.json();
}
export function pageError(error) {
  const main = document.querySelector('main');
  main.replaceChildren(el('p', '자료를 읽을 수 없어요. 다시 열어 주세요.', { role: 'alert', 'data-test': 'page-error' }), link('대문으로', 'home.html', 'home'));
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
    if (schools) line.append(el('small', `${row.kids}명이 함께했어요`));
    parent.append(line);
  }
}
