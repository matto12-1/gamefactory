import { checkNickname } from '../kit/nickname.js?v=663d2a871e';
import { readData, el, button, grades, modal } from './ui.js?v=663d2a871e';
let schoolsCache, wordsCache;
function loadSchools() {
  if (!schoolsCache) schoolsCache = readData('data/schools.json').catch(error => { schoolsCache = null; throw error; });
  return schoolsCache;
}
function loadWords() {
  if (!wordsCache) wordsCache = readData('data/badwords.json').catch(error => { wordsCache = null; throw error; });
  return wordsCache;
}
export async function openNametagForm({ initial } = {}) {
  const editing = Boolean(initial?.nickname);
  const dialog = modal('nametag', editing ? '닉네임 바꾸기' : '닉네임 만들기');
  const error = el('p', '', { 'data-test': 'name-error', role: 'alert' });
  const form = el('form', null, { 'data-test': 'name-form' });
  const search = el('input', null, { type: 'search', 'data-test': 'school-search', autocomplete: 'off' });
  const choices = el('div', null, { 'data-test': 'school-choices' });
  const selectedText = el('p', '학교를 목록에서 골라 주세요', { 'data-test': 'school-selected' });
  const grade = el('select', null, { 'data-test': 'name-grade' }); grades(grade, false); grade.value = String(initial?.grade ?? 1);
  const nickname = el('input', null, { 'data-test': 'nickname', autocomplete: 'off', maxlength: '8' }); nickname.value = initial?.nickname ?? '';
  function field(text, node) { const label = el('label', text); label.append(node); return label; }
  const save = el('button', editing ? '저장' : '만들기', { type: 'submit', 'data-test': 'name-save', disabled: '' });
  form.append(field('학교 이름 검색', search), choices, selectedText, field('학년', grade), field('닉네임', nickname), el('p', '진짜 이름은 쓰지 마세요.'), error, save);
  dialog.append(form); dialog.showModal();
  let settle, selected = null, schools = [], words = [], settled = false;
  const result = new Promise(resolve => { settle = resolve; });
  const close = tag => { if (settled) return; settled = true; dialog.close(); dialog.remove(); settle(tag); };
  form.append(button('취소', 'name-cancel', () => close(null)));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(null); });
  search.addEventListener('input', () => {
    selected = null; selectedText.textContent = '학교를 목록에서 골라 주세요'; choices.replaceChildren();
    const query = search.value.trim(); if (!query) return;
    const matches = schools.filter(s => s.name.includes(query) || s.short.includes(query)).slice(0, 30);
    for (const school of matches) {
      const same = schools.some(s => s.code !== school.code && s.short === school.short);
      const title = `${school.short}${same ? ` (${school.sido} ${school.sigungu})` : ''}`;
      choices.append(button(title, `school-${school.code}`, () => { selected = school; search.value = school.short; selectedText.textContent = title; choices.replaceChildren(); }));
    }
    if (!matches.length) choices.append(el('p', '검색 결과가 없어요'));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!selected) { error.textContent = '학교를 목록에서 골라 주세요'; return; }
    const checked = checkNickname(nickname.value, words);
    if (!checked.ok) {
      error.textContent = { length: '닉네임은 2~8자로 써 주세요', jamo: '자음이나 모음만 쓰지 말아 주세요', chars: '닉네임은 글자와 숫자로 써 주세요', badword: '이 닉네임은 쓸 수 없어요. 다른 닉네임을 골라 주세요' }[checked.reason]; return;
    }
    close({ schoolCode: selected.code, schoolName: selected.short, grade: Number(grade.value), nickname: checked.value });
  });
  try {
    const [schoolData, wordData] = await Promise.all([loadSchools(), loadWords()]);
    if (!settled) {
      schools = schoolData.schools; words = wordData.words;
      selected = schools.find(s => s.code === initial?.schoolCode) ?? null;
      if (selected) { search.value = selected.short; selectedText.textContent = `${selected.short} (${selected.sido} ${selected.sigungu})`; }
      save.disabled = false; search.focus();
      // 목록이 오기 전에 친 글자가 있으면 다시 찾는다(느린 기기에서 「검색 결과가 없어요」로 멈추지 않게).
      if (search.value.trim() && !selected) search.dispatchEvent(new Event('input'));
    }
  } catch (e) { if (!settled) error.textContent = '학교 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'; console.error(e); }
  return result;
}
