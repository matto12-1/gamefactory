import { getRank, getSchools } from './ledger.js?v=399a5c8957';
import { getNametag, setNametag } from './store.js?v=399a5c8957';
import { openNametagForm } from './nametag.js?v=399a5c8957';
import { kstHour } from '../kit/time-kst.js?v=399a5c8957';
import { requireEntry, readData, el, grades, rankRows, resting, pageError } from './ui.js?v=399a5c8957';
if (requireEntry()) init().catch(pageError);
async function init() {
  const { games } = await readData('data/games.json');
  const select = document.querySelector('[data-test="rank-game"]'), grade = document.querySelector('[data-test="rank-grade"]');
  for (const g of games.filter(g => g.ranking.enabled)) select.append(el('option', g.title, { value: g.id }));
  const requested = new URLSearchParams(location.search).get('g'); if ([...select.options].some(o => o.value === requested)) select.value = requested;
  grades(grade); let period = 'day', sequence = 0;
  const rows = document.querySelector('[data-test="rank-rows"]'), time = document.querySelector('[data-test="rank-time"]');
  async function render() {
    const current = ++sequence;
    const school = period === 'schools'; select.disabled = school; grade.disabled = school; time.textContent = '';
    for (const key of ['day', 'week', 'all', 'schools']) document.querySelector(`[data-test="period-${key}"]`).setAttribute('aria-pressed', String(period === key));
    if (!school && !select.value) { rows.textContent = '순위 게임이 아직 없어요'; return; }
    rows.textContent = '순위를 읽고 있어요';
    const reply = await (school ? getSchools() : getRank({ game: select.value, period, grade: Number(grade.value) }));
    if (current !== sequence) return;
    if (!reply.ok) { rows.textContent = resting; return; }
    rankRows(rows, reply.rows, school);
    if (school) time.textContent = reply.computedAt ? `${kstHour(Date.parse(reply.computedAt))}시 기준` : '아직 계산 전이에요';
  }
  for (const key of ['day', 'week', 'all', 'schools']) document.querySelector(`[data-test="period-${key}"]`).addEventListener('click', () => { period = key; render(); });
  select.addEventListener('change', render); grade.addEventListener('change', render);
  const summary = document.querySelector('[data-test="name-summary"]');
  const describe = name => { summary.textContent = name ? `${name.schoolName} ${name.grade}학년 ${name.nickname}` : ''; }; describe(getNametag());
  document.querySelector('[data-test="edit-name"]').addEventListener('click', async event => {
    const target = event.currentTarget; target.disabled = true;
    const tag = await openNametagForm({ initial: getNametag() });
    if (tag) { setNametag(tag); describe(tag); } target.disabled = false;
  });
  await render();
}
