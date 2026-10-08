import { admin } from './ledger.js?v=399a5c8957';
import { readData, el, button, pageError } from './ui.js?v=399a5c8957';
const key = document.querySelector('[data-test="admin-key"]');
const status = document.querySelector('[data-test="admin-status"]'), panel = document.querySelector('[data-test="admin-panel"]');
try { key.value = sessionStorage.getItem('gf:admin-key') ?? ''; } catch { /* 열쇠는 이 화면에서만 써요. */ }
let token = '', games = [], sequence = 0;
function check(reply) {
  if (reply.ok) return true;
  status.textContent = reply.error === 'unauthorized' ? '열쇠가 틀렸어요' : '장부가 잠깐 쉬고 있어요';
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
  const gameName = id => games.find(g => g.id === id)?.title ?? '이름이 없는 게임';
  const rows = reply.rows.map(row => {
    const hide = button(row.hidden ? '숨김 풀기' : '숨기기', `hide-${row.id}`, async event => {
      event.currentTarget.disabled = true;
      if (check(await admin.hide(token, row.id, !row.hidden))) await recent();
      else event.currentTarget.disabled = false;
    });
    return [gameName(row.game), `${row.schoolName} ${row.grade}학년 ${row.nickname}`, row.score.toLocaleString('ko-KR'), `${Math.round(row.durationMs / 1000)}초`, row.device, new Date(row.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), hide];
  });
  table(document.querySelector('[data-test="recent"]'), ['게임', '이름표', '점수', '판 길이', '기기 번호', '시각', '숨김'], rows);
}
document.querySelector('[data-test="admin-form"]').addEventListener('submit', async event => {
  event.preventDefault(); token = key.value.trim();
  try { sessionStorage.setItem('gf:admin-key', token); } catch { /* 저장 실패해도 입력한 열쇠를 써요. */ }
  status.textContent = '기록을 읽고 있어요';
  try { games = (await readData('data/games.json')).games; } catch (error) { pageError(error); return; }
  const reply = await admin.plays(token);
  if (!check(reply)) return;
  panel.hidden = false; status.textContent = '';
  table(document.querySelector('[data-test="plays"]'), ['날짜', '게임', '판 수'], reply.rows.map(row => [row.date, games.find(g => g.id === row.game)?.title ?? '이름이 없는 게임', row.plays]));
  await recent();
});
for (const kind of ['nickname', 'device']) document.querySelector(`[data-test="ban-${kind}-form"]`).addEventListener('submit', async event => {
  event.preventDefault(); const value = document.querySelector(`[data-test="ban-${kind}"]`).value.trim();
  if (!value) { status.textContent = '금지할 값을 써 주세요'; return; }
  if (check(await admin.ban(token, kind, value))) status.textContent = '금지했어요';
});
