(function () {
  'use strict';
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  // 생존 시간은 엔진이 실제로 움직인 시간으로 센다. 문제와 일시 정지 동안은 흐르지 않는다.
  function create(config, { stage = 1, onChange = () => {} } = {}) {
    const level = config.stage.stages.find(s => s.id === stage);
    if (!level) throw Error('단계를 확인해 주세요');
    const state = { play: 'stage', stage: level, elapsed: 0, remaining: level.timeSec,
      hearts: level.hearts, progress: 0, combo: 0, right: 0, wrong: 0, ended: false, reason: null, paused: false };
    function end(reason) { if (state.ended) return; state.ended = true; state.reason = reason; onChange('end', reason); }
    function setProgress(sec) {
      if (state.ended || state.paused || !Number.isFinite(sec) || sec < 0) return;
      state.elapsed = Math.min(level.timeSec, sec);
      state.remaining = Math.max(0, level.timeSec - state.elapsed);
      state.progress = Math.min(level.goal.target, Math.floor(state.elapsed + 1e-9));
      if (sec >= level.timeSec - 1e-9) end('goal');
    }
    function addHeart(n) {
      if (state.ended) return;
      const old = state.hearts;
      state.hearts = Math.max(0, Math.min(level.hearts, old + n));
      if (old !== state.hearts) onChange('heart', state.hearts - old);
      if (!state.hearts) end('hearts');
    }
    return { config, state, tick() {}, setProgress, addHeart, end,
      pause: on => { state.paused = on; },
      judge(kind, combo) { if (state.ended || state.paused) return; if (kind === 'right') { state.right++; state.combo = combo; } else if (kind === 'wrong') { state.wrong++; state.combo = 0; } },
      result: stats => ({ play: 'stage', name: '시대 버티기', stage: level.id, title: level.title,
        elapsed: state.elapsed, reason: state.reason, passed: state.reason === 'goal',
        stars: window.GFModes.starCount(state.reason === 'goal', stats, level.starRules) }) };
  }
  // 기존 지도 그림과 배치를 재사용한다. 시작할 때는 지도에 들르지 않는다.
  function map({ parent, art, family, data, config, store, back, start }) {
    const ui = window.GFUI, el = ui.node;
    const screen = el('section', 'gf-mode-map', undefined, parent); screen.dataset.test = 'stage-map';
    ui.theme(screen, family); ui.background(screen, art, 'map');
    const top = el('div', 'gf-map-top', undefined, screen);
    Object.assign(top.style, { top: '8px', left: '64px', right: '64px', gap: '6px' });
    const exit = el('button', 'gf-button', '‹', top); exit.dataset.test = 'map-back'; exit.setAttribute('aria-label', '1단계 시작');
    exit.onclick = () => { screen.remove(); back(); };
    const title = el('span', 'gf-map-pill', '시대 버티기', top);
    const total = el('span', 'gf-map-pill gf-map-total', `★ ${store.total(1)} / 30`, top);
    for (const pill of [title, total]) Object.assign(pill.style, { fontSize: '16px', padding: '6px', borderRadius: '12px' });
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    path.setAttribute('viewBox', '0 0 100 100'); path.setAttribute('preserveAspectRatio', 'none');
    path.classList.add('gf-map-path'); path.setAttribute('aria-hidden', 'true'); screen.append(path);
    const current = config.stage.stages.find(s => !store.stars(1, s.id))?.id ?? 10;
    const slots = [];
    for (const stage of config.stage.stages) {
      const locked = !store.unlocked(1, stage.id), stars = store.stars(1, stage.id);
      const slot = el('div', 'gf-level-slot', undefined, screen); slots.push(slot);
      const b = el('button', `gf-level-node${stage.id === current && !locked ? ' gf-level-current' : ''}`, String(stage.id), slot);
      b.dataset.test = `stage-${stage.id}`; b.disabled = locked;
      b.setAttribute('aria-label', `${stage.id}단계 ${stage.title}${locked ? ' 잠김' : ` 별 ${stars}개`}`);
      window.GFModesUI.stars(slot, stars, 'gf-node-stars');
      b.onclick = () => window.GFModesUI.stageDialog(screen, { art, stage, boss: false,
        start: button => { screen.remove(); start(stage.id, button); } });
    }
    function update() {
      const points = innerHeight > innerWidth
        ? [[28,86],[70,78],[28,70],[70,62],[28,54],[70,46],[28,38],[70,30],[28,22],[70,14]]
        : [[9,55],[18,45],[28,42],[37,53],[45,60],[57,59],[66,51],[75,46],[85,54],[92,59]];
      const d = points.slice(1).reduce((d,p,i) => { const a = points[i], mid = (a[1]+p[1])/2; return `${d} C ${a[0]} ${mid}, ${p[0]} ${mid}, ${p[0]} ${p[1]}`; }, `M ${points[0].join(' ')}`);
      path.innerHTML = `<path d="${d}"/>`;
      slots.forEach((slot, i) => { slot.style.left = `${points[i][0]}%`; slot.style.top = `${points[i][1]}%`; });
    }
    el('p', 'gf-map-hint', '시대마다 3분을 버티면 다음 단계가 열려요!', screen);
    S.meta.titleExtra(top, { data });
    Object.assign(top.querySelector('[data-test="meta-open"]').style, {
      position: 'fixed', left: '8px', top: '64px', width: 'auto', minWidth: '44px', padding: '4px 10px', fontSize: '16px'
    });
    update(); window.addEventListener('resize', update);
    const observer = new MutationObserver(() => { if (!screen.isConnected) { window.removeEventListener('resize', update); observer.disconnect(); } });
    observer.observe(parent, { childList: true }); return screen;
  }
  S.stages = { create, map };
})();
