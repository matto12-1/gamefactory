import { getNametag, setNametag, getStamps } from './store.js?v=399a5c8957';
import { submitScore } from './ledger.js?v=399a5c8957';
import { RANK_PROMPT_LIMIT } from './config.js?v=399a5c8957';
import { openNametagForm } from './nametag.js?v=399a5c8957';
import { el, button, link, modal, resting } from './ui.js?v=399a5c8957';
export async function showResult({ game, mode, score, token, stamps, onReplay, onExit }) {
  const dialog = modal('result', '한 판이 끝났어요');
  dialog.className = `result${mode === 'solo' ? '' : ' multiplayer'}`;
  const layout = el('div', null, { class: 'result-layout' });
  layout.append(dialog.firstChild); dialog.append(layout);
  dialog.addEventListener('cancel', event => event.preventDefault());
  if (mode === 'solo') {
    if (score !== undefined) {
      const tile = el('section', null, { class: 'result-tile result-score' });
      const value = el('strong', score.toLocaleString('ko-KR'), { 'data-test': 'result-score' }); value.append(el('small', '점'));
      tile.append(el('p', '이번 판 점수', { class: 'gf-label' }), value); layout.append(tile);
    } else layout.classList.add('no-score');
    if (game.stamps.length) {
      const tile = el('section', null, { class: 'result-tile result-stamp' }), text = el('div');
      const icon = el('span', '★', { class: 'stamp-icon', 'aria-hidden': 'true' });
      tile.append(icon, text);
      if (stamps.length) {
        text.append(el('p', '새 도장을 받았어요'));
        for (const stamp of stamps) text.append(el('strong', stamp.name, { 'data-test': `result-stamp-${stamp.id}` }));
      } else {
        const earned = new Set([...Object.keys(getStamps()[game.id] ?? {}), ...stamps.map(s => s.id)]);
        const next = game.stamps.find(s => !earned.has(s.id));
        if (next) {
          icon.classList.add('stamp-pending');
          text.setAttribute('data-test', 'result-next-stamp');
          text.append(el('p', '다음 도장'), el('strong', next.name), el('p', next.how));
        } else text.append(el('strong', '도장을 모두 모았어요', { 'data-test': 'result-next-stamp' }));
      }
      layout.append(tile);
    } else {
      layout.classList.add('no-stamps');
      if (!game.ranking.enabled) layout.classList.add('score-only');
    }
    if (!game.ranking.enabled) layout.classList.add('no-rank');
  }
  const status = el('p', '', { 'data-test': 'rank-status', role: 'status' });
  const prompt = el('div', null, { 'data-test': 'name-prompt' });
  const ranked = mode === 'solo' && game.ranking.enabled;
  if (ranked) {
    const tile = el('section', null, { class: 'result-tile result-rank' });
    tile.append(el('p', '내 순위', { class: 'gf-label' }), status, prompt); layout.append(tile);
  }
  const buttons = el('div', null, { class: `result-buttons${ranked ? '' : ' two'}` });
  const replay = button('한 판 더', 'replay', onReplay);
  buttons.append(replay, button('다른 게임', 'other-game', onExit));
  if (ranked) buttons.append(link('순위표', `ranks.html?${new URLSearchParams({ g: game.id })}`, 'result-ranks'));
  layout.append(buttons);
  dialog.showModal();
  replay.focus();
  if (mode !== 'solo' || !game.ranking.enabled) return;
  if (!token) { status.textContent = resting; return; }
  function show(reply, saved) {
    if (!reply.ok) { status.textContent = reply.error === 'offline' ? resting : '이번 판은 순위에 못 올라가요'; return false; }
    const periods = { day: '오늘', week: '이번 주', all: '역대' };
    const ranks = Object.entries(periods).filter(([key]) => Number.isInteger(reply.ranks?.[key]) && reply.ranks[key] >= 1 && reply.ranks[key] <= RANK_PROMPT_LIMIT);
    const lines = ranks.map(([key, label]) => `${label} ${reply.ranks[key]}위`);
    status.replaceChildren();
    if (lines.length) status.append(el('span', lines[0], { class: 'rank-primary' }));
    if (lines.length > 1) status.append(' ', el('span', lines.slice(1).join(' · '), { class: 'rank-secondary' }));
    if (!ranks.length && saved) status.textContent = `내 최고점 ${Number(reply.best ?? score).toLocaleString('ko-KR')}점`;
    return ranks.length > 0;
  }
  status.textContent = '순위를 확인하고 있어요';
  const name = getNametag();
  if (name) { show(await submitScore({ token, score, name }), true); return; }
  const eligible = show(await submitScore({ token, score, dryRun: true }), false);
  if (eligible && dialog.isConnected) {
    prompt.append(button('이름표 만들고 올리기', 'make-name', async event => {
      const target = event.currentTarget; target.disabled = true;
      const tag = await openNametagForm({ initial: null });
      if (!tag) { target.disabled = false; return; }
      setNametag(tag); prompt.replaceChildren(); status.textContent = '순위를 확인하고 있어요';
      show(await submitScore({ token, score, name: tag }), true);
    }));
  }
}
