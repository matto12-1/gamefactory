import { getNametag, setNametag, getStamps } from './store.js?v=3b50e18461';
import { submitScore } from './ledger.js?v=3b50e18461';
import { RANK_PROMPT_LIMIT } from './config.js?v=3b50e18461';
import { openNametagForm } from './nametag.js?v=3b50e18461';
import { el, button, link, modal, resting } from './ui.js?v=3b50e18461';
import '../kit/gf-ui.js?v=3b50e18461';
import '../kit/gf-modes.js?v=3b50e18461';
import '../kit/gf-modes-ui.js?v=3b50e18461';
export async function showResult({ game, mode, score, ui, token, stamps, onReplay, onExit, onPractice, onMap }) {
  const dialog = modal('result', '한 판이 끝났어요');
  dialog.className = `result${mode === 'solo' ? '' : ' multiplayer'}`;
  if (game.endShow === true) dialog.classList.add('immersion-result');
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
  const play = ui?.modeResult?.play ?? 'quick';
  const ranked = mode === 'solo' && game.ranking.enabled && (play !== 'stage' || ui.modeResult.stage === 10);
  if (ranked) {
    const tile = el('section', null, { class: 'result-tile result-rank' });
    tile.append(el('p', ui?.modeResult ? `${ui.modeResult.name} · 전국 오늘 순위` : '내 순위', { class: 'gf-label' }), status, prompt); layout.append(tile);
  }
  const buttons = el('div', null, { class: `result-buttons${ranked ? '' : ' two'}` });
  const replay = button('한 판 더', 'replay', onReplay);
  buttons.append(replay, button('다른 게임', 'other-game', onExit));
  if (ranked) buttons.append(link('순위표', `ranks.html?${new URLSearchParams({ g: game.id, play })}`, 'result-ranks'));
  layout.append(buttons);
  if(ui?.art?.ui){
    const kit=window.GFUI;kit.theme(dialog,ui.family);dialog.classList.add('gf-shared-result');
    kit.background(dialog,ui.art,'result',ui.base);
    layout.hidden=true;
    layout.querySelector('[data-test=result-score]')?.removeAttribute('data-test');
    const panel=kit.node('div','gf-result-panel',undefined,dialog);
    const summary=kit.summary(panel,{...ui,score:score??ui.score});summary.querySelector('.gf-result-number').dataset.test=mode==='solo'?'result-score':'duo-result-score';
    if(ui.modeResult)window.GFModesUI.decorateResult(summary,ui.modeResult);
    // 제목은 점수판과 같은 기준으로 고른다. 복습할 게 있으면 「헷갈린 것」, 없으면 「고친 것」이다.
    const learning=kit.node('section','gf-result-learning',undefined,panel);kit.node('h3','',ui.canPractice?'오늘 헷갈린 것':'오늘 고친 것',learning);
    const clearHTML='<article class="gf-learn-card gf-review-card gf-review-clear"><strong>오늘은 고칠 게 없어요</strong><span>하나도 안 틀렸어요. 다음엔 더 어려운 판에 도전해 볼까요?</span></article>';
    const review=kit.node('div','gf-review',undefined,learning);review.innerHTML=ui.reviewHTML||clearHTML;
    kit.reviewHint(learning,review);
    if(mode!=='solo'){summary.classList.add('gf-result-duo');summary.querySelector('.gf-result-heading').textContent=ui.winner||'한 판이 끝났어요';summary.querySelector('.gf-result-number').textContent=(ui.duoScores||[]).map(n=>n.toLocaleString('ko-KR')).join(' : ');learning.hidden=true;}
    const actions=kit.node('div','gf-result-actions',undefined,dialog);replay.className='gf-button gf-primary';actions.append(replay);
    if(play==='stage'){replay.textContent=ui.modeResult.passed&&ui.modeResult.stage<10?'다음 단계':onMap&&ui.modeResult.passed?'처음부터':'다시 도전';replay.onclick=()=>{const gameFrame=document.querySelector('[data-test=game]');gameFrame.contentWindow.__GAME.nextStage=ui.modeResult.passed?(ui.modeResult.stage<10?ui.modeResult.stage+1:onMap?1:10):ui.modeResult.stage;onReplay();};}
    if(onMap){const map=button('단계 지도 · 준비','result-map',onMap);map.className='gf-button';actions.append(map);}
    if(ui.canPractice&&mode==='solo'){const practice=button('틀린 것만 다시 30초','result-practice',()=>{dialog.close();onPractice(()=>{dialog.showModal();replay.focus();});});practice.className='gf-button';actions.append(practice);}
    const other=buttons.querySelector('[data-test=other-game]');other.className='gf-button';actions.append(other);
    // 순위 소식은 큰 점수 바로 밑, 판 안에 둔다(2026-10-14 고르기 6가). 판 밖에 띄우면 폰에서 복습 칸을 덮었다.
    if(ranked){const rank=layout.querySelector('.result-rank');summary.append(rank);const ranks=buttons.querySelector('[data-test=result-ranks]');ranks.className='gf-rank-link';rank.append(ranks);}
    if(mode==='solo')kit.animateResult(panel,score??ui.score,kit.starLevel(score??ui.score,ui.thresholds),undefined,ui.fast);
  }
  dialog.showModal();
  replay.focus();
  if (!ranked) return;
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
  if (name) { show(await submitScore({ token, score, name, play }), true); return; }
  const eligible = show(await submitScore({ token, score, dryRun: true, play }), false);
  if (eligible && dialog.isConnected) {
    const make = button('이름표 만들고 올리기', 'make-name', async event => {
      const target = event.currentTarget; target.disabled = true;
      const tag = await openNametagForm({ initial: null });
      if (!tag) { target.disabled = false; return; }
      setNametag(tag); prompt.replaceChildren(); status.textContent = '순위를 확인하고 있어요';
      show(await submitScore({ token, score, name: tag, play }), true);
    });
    make.classList.add('gf-button', 'gf-rank-cta'); prompt.append(make);
  }
}
