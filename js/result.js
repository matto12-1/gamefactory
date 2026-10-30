import { getNametag, setNametag, getStamps } from './store.js?v=663d2a871e';
import { submitScore, rankingPlay, rankedResult } from './ledger.js?v=663d2a871e';
import { RANK_PROMPT_LIMIT } from './config.js?v=663d2a871e';
import { openNametagForm } from './nametag.js?v=663d2a871e';
import { el, button, link, modal, resting } from './ui.js?v=663d2a871e';
import '../kit/gf-ui.js?v=663d2a871e';
import '../kit/gf-modes.js?v=663d2a871e';
import '../kit/gf-modes-ui.js?v=663d2a871e';
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
  const play = ui?.modeResult?.play ?? rankingPlay(game);
  const ranked = mode === 'solo' && game.ranking.enabled && rankedResult(game, play, ui?.modeResult);
  if (ranked) {
    const tile = el('section', null, { class: 'result-tile result-rank' });
    tile.append(el('p', ui?.modeResult ? `${ui.modeResult.name} · 전국 오늘 순위` : '내 순위', { class: 'gf-label' }), status, prompt); layout.append(tile);
  }
  const buttons = el('div', null, { class: `result-buttons${ranked ? '' : ' two'}` });
  // 「한 판 더」는 누름 처리를 onclick 하나에만 둔다. 아래에서 판마다 onclick을 바꿔 끼우는데, 처음 것까지 따로 걸면
  // 둘 다 불려 다음 판 계획을 적기 전의 주소로 먼저 다시 연다(판이 바뀌면 게임 틀만 다시 연다, 폰 가로 설계서 7절).
  const replay = el('button', '한 판 더', { type: 'button', 'data-test': 'replay' }); replay.onclick = onReplay;
  buttons.append(replay, button('다른 활동', 'other-game', onExit));
  if (ranked) buttons.append(link('순위표', `ranks.html?${new URLSearchParams({ g: game.id, play })}`, 'result-ranks'));
  layout.append(buttons);
  if(ui?.endScreen) {
    const rank=ranked?layout.querySelector('.result-rank'):null;
    if(rank)rank.append(buttons.querySelector('[data-test=result-ranks]'));
    layout.remove();
    const go=(target,stage)=>{const g=document.querySelector('[data-test=game]').contentWindow.__GAME;g.nextPlay=target;g.nextStage=stage;g.resume=false;onReplay();};
    const actions={next:()=>go(ui.plan.play,ui.plan.stage),replay:()=>go(play,ui.modeResult?.stage),map:onMap||onExit,endless:()=>go('endless'),exit:onExit,
      practice:()=>{dialog.close();onPractice(()=>{dialog.showModal();dialog.querySelector('[data-primary]')?.focus();});}};
    ui.endScreen(dialog,{...ui,notices:{...ui.notices,stamps},fast:true,actions,rank});
  } else if(ui?.renderResult && mode === 'solo') {
    const rank = ranked ? layout.querySelector('.result-rank') : null;
    if (rank) rank.append(buttons.querySelector('[data-test=result-ranks]'));
    layout.remove();
    replay.onclick = () => {
      const g = document.querySelector('[data-test=game]').contentWindow.__GAME;
      g.nextStage = ui.modeResult?.stage || 1; g.nextPlay = play === 'endless' ? 'endless' : 'stage'; g.resume = false; onReplay();
    };
    const map = button('지도', 'result-map', onMap);
    ui.renderResult(dialog, { report: ui.report, art: ui.art, base: ui.base, replay, map, rank });
  } else if(ui?.art?.ui){
    const kit=window.GFUI;kit.theme(dialog,ui.family);dialog.classList.add('gf-shared-result');
    kit.background(dialog,ui.art,'result',ui.base);
    layout.hidden=true;
    layout.querySelector('[data-test=result-score]')?.removeAttribute('data-test');
    const panel=kit.node('div','gf-result-panel',undefined,dialog);
    const summary=kit.summary(panel,{...ui,score:score??ui.score});summary.querySelector('.gf-result-number').dataset.test=mode==='solo'?'result-score':'duo-result-score';
    if(ui.modeResult)window.GFModesUI.decorateResult(summary,ui.modeResult,{onEndless:()=>{const g=document.querySelector('[data-test=game]').contentWindow.__GAME;g.nextPlay='endless';onReplay();}});
    // 제목은 점수판과 같은 기준으로 고른다. 복습할 게 있으면 「헷갈린 것」, 없으면 「고친 것」이다.
    const learning=kit.node('section','gf-result-learning',undefined,panel);kit.node('h3','',ui.canPractice?'오늘 헷갈린 것':'오늘 고친 것',learning);
    ui.extra?.(learning,kit.node);
    const clearHTML='<article class="gf-learn-card gf-review-card gf-review-clear"><strong>오늘은 고칠 게 없어요</strong><span>하나도 안 틀렸어요. 다음엔 더 어려운 판에 도전해 보세요!</span></article>';
    const review=kit.node('div','gf-review',undefined,learning);review.innerHTML=ui.reviewHTML||clearHTML;
    kit.reviewHint(learning,review);
    // 2인용은 게임 안 끝 화면과 같은 함수로 그린다(혼자 판의 최고 기록·한쪽 기록이 남지 않게).
    if(mode!=='solo'){kit.duoSummary(summary,{scores:ui.duoScores||[],stats:ui.duoStats||[],winner:ui.winner||'한 판이 끝났어요',tall:ui.duoTall??window.innerHeight>window.innerWidth,crowns:true});learning.hidden=true;}
    const actions=kit.node('div','gf-result-actions',undefined,dialog);replay.className='gf-button gf-primary';actions.append(replay);
    if(play==='stage'&&'next' in ui.modeResult){const plan=window.GFModes.replayPlan(ui.modeResult);replay.textContent=plan.label;replay.onclick=()=>{const g=document.querySelector('[data-test=game]').contentWindow.__GAME;g.nextStage=plan.stage;g.nextPlay=plan.play;g.resume=plan.resume;onReplay();};}
    else if(play==='stage'){replay.textContent=ui.modeResult.passed&&ui.modeResult.stage<10?'다음 단계':onMap&&ui.modeResult.passed?'처음부터':'다시 도전';replay.onclick=()=>{const gameFrame=document.querySelector('[data-test=game]');gameFrame.contentWindow.__GAME.nextStage=ui.modeResult.passed?(ui.modeResult.stage<10?ui.modeResult.stage+1:onMap?1:10):ui.modeResult.stage;onReplay();};}
    else if(play==='endless'&&onMap){replay.onclick=()=>{const g=document.querySelector('[data-test=game]').contentWindow.__GAME;g.nextPlay='endless';onReplay();};}
    if(onMap){const map=button(ui.modeResult&&'next' in ui.modeResult||play==='endless'?'시대 지도 · 준비':'단계 지도 · 준비','result-map',onMap);map.className='gf-button';actions.append(map);}
    if(ui.canPractice&&mode==='solo'){const practice=button('틀린 것만 다시 30초','result-practice',()=>{dialog.close();onPractice(()=>{dialog.showModal();replay.focus();});});practice.className='gf-button';actions.append(practice);}
    const other=buttons.querySelector('[data-test=other-game]');other.className='gf-button';actions.append(other);
    // 순위 소식은 큰 점수 바로 밑, 판 안에 둔다(2026-10-14 고르기 6가). 판 밖에 띄우면 폰에서 복습 칸을 덮었다.
    if(ranked){const rank=layout.querySelector('.result-rank');summary.append(rank);const ranks=buttons.querySelector('[data-test=result-ranks]');ranks.className='gf-rank-link';rank.append(ranks);}
    if(mode==='solo')kit.animateResult(panel,score??ui.score,kit.starLevel(score??ui.score,ui.thresholds),undefined,ui.fast);
  }
  // 앞 화면에서 누르고 있던 Enter·Space가 되풀이로 들어와 첫 단추(다시 하기)를 눌러 버리지 않게 한다.
  dialog.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.repeat)e.preventDefault();});
  dialog.showModal();
  (dialog.querySelector('[data-primary]')||replay).focus();
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
  status.textContent = '순위 확인 중…';
  const name = getNametag();
  if (name) { show(await submitScore({ token, score, name, play }), true); return; }
  const eligible = show(await submitScore({ token, score, dryRun: true, play }), false);
  if (eligible && dialog.isConnected) {
    const make = button('닉네임 만들고 순위 올리기', 'make-name', async event => {
      const target = event.currentTarget; target.disabled = true;
      const tag = await openNametagForm({ initial: null });
      if (!tag) { target.disabled = false; return; }
      setNametag(tag); prompt.replaceChildren(); status.textContent = '순위 확인 중…';
      show(await submitScore({ token, score, name: tag, play }), true);
    });
    make.classList.add('gf-button', 'gf-rank-cta'); prompt.append(make);
  }
}
