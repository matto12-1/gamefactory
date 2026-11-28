import { admin } from './ledger.js?v=4c5e743d5d';
import { readData, el, button, pageError } from './ui.js?v=4c5e743d5d';
const key = document.querySelector('[data-test="admin-key"]');
const status = document.querySelector('[data-test="admin-status"]'), panel = document.querySelector('[data-test="admin-panel"]');
try { key.value = sessionStorage.getItem('gf:admin-key') ?? ''; } catch { /* 열쇠는 이 화면에서만 써요. */ }
let token = '', games = [], sequence = 0;
function check(reply) {
  if (reply.ok) return true;
  status.textContent = reply.error === 'unauthorized' ? '열쇠가 틀렸어요' : '지금은 기록을 볼 수 없어요';
  if (reply.error === 'unauthorized') { panel.hidden = true; document.querySelector('[data-test="recent"]').replaceChildren(); document.querySelector('[data-test="plays"]').replaceChildren(); }
  return false;
}
function table(root, headings, rows) {
  const table = el('table'), head = el('thead'), heading = el('tr');
  for (const text of headings) heading.append(el('th', text, { scope: 'col' })); head.append(heading); table.append(head);
  const body = el('tbody');
  for (const cells of rows) { const row = el('tr'); for (const value of cells) { const td = el('td'); td.append(value instanceof Node ? value : document.createTextNode(String(value))); row.append(td); } body.append(row); }
  table.append(body); root.replaceChildren(table); if (!rows.length) root.append(el('p', '아직 기록이 없어요'));
}
async function recent() {
  const current = ++sequence, reply = await admin.recent(token);
  if (current !== sequence || !check(reply)) return;
  const gameName = id => games.find(g => g.id === id)?.title ?? '이름이 없는 활동';
  const rows = reply.rows.map(row => {
    const hide = button(row.hidden ? '숨김 풀기' : '숨기기', `hide-${row.id}`, async event => {
      const b = event.currentTarget; b.disabled = true;
      if (check(await admin.hide(token, row.id, !row.hidden))) await recent();
      else b.disabled = false;
    });
    // 새긴 이니셜은 지우기만 한다. 지우면 순위표에 ???로 나오고 같은 판은 다시 새길 수 없다.
    const tag = row.tag ? button(`${row.tag} 지우기`, `untag-${row.id}`, async event => {
      const b = event.currentTarget; b.disabled = true;
      if (check(await admin.clearTag(token, row.id))) await recent();
      else b.disabled = false;
    }) : '없음';
    return [gameName(row.game), { quick: '빠른 판', endless: '무한 모드', stage: '단계 지도' }[row.play], row.score.toLocaleString('ko-KR'), new Date(row.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), tag, hide];
  });
  table(document.querySelector('[data-test="recent"]'), ['활동', '모드', '점수', '시각', '이니셜', '숨김'], rows);
}
document.querySelector('[data-test="admin-form"]').addEventListener('submit', async event => {
  event.preventDefault(); token = key.value.trim();
  try { sessionStorage.setItem('gf:admin-key', token); } catch { /* 저장 실패해도 입력한 열쇠를 써요. */ }
  status.textContent = '불러오는 중…';
  try { games = (await readData('data/games.json')).games; } catch (error) { pageError(error); return; }
  const reply = await admin.plays(token);
  if (!check(reply)) return;
  panel.hidden = false; status.textContent = '';
  table(document.querySelector('[data-test="plays"]'), ['날짜', '활동', '판 수'], reply.rows.map(row => [row.date, games.find(g => g.id === row.game)?.title ?? '이름이 없는 활동', row.plays]));
  await recent();
});
