(function () {
  'use strict';
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  // 시대 따라가기(play 'stage'): 칸 하나, 적장을 물리치면 성공(엔진이 end('goal')), 하트 0이면 실패.
  // 무한 모드(play 'endless'): 하트 0 또는 15분 뒤 불가사리에 닿으면 끝. 버틴 시간과 점수로 기록.
  // remaining은 엔진이 넘겨주는 「다음 막까지 남은 초」로, 껍데기 시계가 그대로 보여 준다. 문제와 일시 정지 동안은 흐르지 않는다.
  // next는 이 칸을 깬 뒤 바로 갈 수 있는 다음 칸 번호(엔진이 판을 열 때 정한다), 없으면 null.
  function create(config, { play = 'stage', stage = 1, onChange = () => {} } = {}) {
    const endless = play === 'endless';
    const level = endless ? { id: 0, cell: null, title: '무한 모드', hearts: config.endless.hearts, timeSec: 180, goal: { kind: 'endless', label: '버틴 초', target: 0 } }
      : config.stage.stages.find(s => s.id === stage);
    if (!level) throw Error('단계를 확인해 주세요');
    const state = { play: endless ? 'endless' : 'stage', stage: level, elapsed: 0, remaining: level.timeSec,
      hearts: level.hearts, progress: 0, combo: 0, right: 0, wrong: 0, ended: false, reason: null, paused: false, next: null, act: 1 };
    function end(reason) { if (state.ended) return; state.ended = true; state.reason = reason; onChange('end', reason); }
    function setProgress(sec, left = Infinity) {
      if (state.ended || state.paused || !Number.isFinite(sec) || sec < 0) return;
      state.elapsed = sec; state.progress = Math.floor(sec + 1e-9);
      state.remaining = Number.isFinite(left) ? Math.max(0, left) : sec;
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
      result: stats => ({ play: state.play, name: endless ? '무한 모드' : '시대 따라가기', stage: endless ? null : level.id, cell: level.cell, title: level.title,
        elapsed: state.elapsed, reason: state.reason, passed: !endless && state.reason === 'goal', act: state.act,
        next: state.reason === 'goal' ? state.next : null, ranked: endless,
        stars: endless ? null : window.GFModes.starCount(state.reason === 'goal', stats, level.starRules) }) };
  }
  // ---- 화면: 첫 화면(home)과 13칸 시대 지도(map). 글꼴은 Jua만(첫 화면 무게) ----
  const UI_STYLE = `
.sv-home,.sv-map{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;overflow:hidden;font-family:Jua,sans-serif;color:#2b1d12;background:#20160f}
.sv-home *,.sv-map *{font-family:Jua,sans-serif;box-sizing:border-box;word-break:keep-all;overflow-wrap:break-word}
.sv-dlg,.sv-dlg *{word-break:keep-all;overflow-wrap:break-word}
.sv-sum,.sv-dlg p{text-wrap:balance}
.sv-home .gf-ui-background,.sv-map .gf-ui-background{position:absolute;inset:0;z-index:-1}
.sv-home .gf-ui-background img,.sv-map .gf-ui-background img{width:100%;height:100%;object-fit:cover}
.sv-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 64px;flex:none}
@media (max-width:520px){.sv-map .sv-bar .sv-grow{display:none}.sv-map .sv-bar .sv-pill{font-size:16px;padding:3px 8px}}
.sv-bar .sv-grow{flex:1}
.sv-pill{background:#fff6dfee;border:3px solid #2b1d12;border-radius:14px;padding:4px 12px;font-size:18px;white-space:nowrap}
.sv-home .sv-sum{margin:0;color:#ffe9b8;font-size:clamp(15px,2.6vh,22px);text-align:center;text-shadow:0 2px 4px #000}
.sv-go{all:unset;cursor:pointer;padding:12px 22px;border:4px solid #2b1d12;border-radius:18px;background:#ffd34d;box-shadow:0 5px #a8713c;font-size:clamp(18px,3vh,24px);text-align:center}
.sv-go:focus-visible,.sv-go:hover{outline:4px solid #fff}
.sv-map{background:#153a42;color:#fff4d3}
.sv-map .sv-bar{min-height:76px;padding:12px 76px;gap:12px;background:#182a30;border-bottom:4px solid #0c191e;box-shadow:inset 0 -2px #b28a43;z-index:5}
.sv-map .sv-pill{border:0;border-radius:0;padding:0;background:none;color:#fff4d3;font-size:22px}
.sv-map .gf-map-total{color:#f8ce6b;font-size:20px}
.sv-map .sv-bar .sv-plain{border-radius:2px;border:2px solid #ad8b52;background:#263b41;color:#fff4d3;min-width:44px;min-height:44px;padding:0;text-align:center;font-size:32px}
.sv-map .sv-meta-open{border-radius:3px;box-shadow:0 3px #0c191e;font-size:18px}
.sv-map-scroll{position:relative;flex:1;min-height:0;width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#d0a650 #203840;touch-action:pan-x}
.sv-world{position:relative;isolation:isolate;min-width:100%;height:100%;--marker:64px;--hero:48px}
.sv-terrain{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}
.sv-roads,.sv-fog{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;shape-rendering:crispEdges}
.sv-roads{z-index:2}.sv-fog{z-index:1}
.sv-night{position:absolute;inset:0;pointer-events:none}.sv-night .sv-terrain{filter:saturate(.18) brightness(.56)}.sv-night::after{content:'';position:absolute;inset:0;background:#193b6538}
.sv-cloud-front{position:absolute;inset:0;z-index:2;pointer-events:none}.sv-cloud-piece{position:absolute;height:auto;transform:translate(-50%,-50%) scaleX(var(--flip,1));image-rendering:pixelated;animation:sv-cloud-flow var(--flow-time,48s) ease-in-out var(--flow-delay,0s) infinite}.sv-cloud-piece.is-night{filter:saturate(.55) brightness(.72)}
.sv-region{position:absolute;top:12px;transform:translateX(-50%);z-index:4;text-align:center;white-space:nowrap;color:#fff4d3;text-shadow:2px 2px #142632,-2px -2px #142632,2px -2px #142632,-2px 2px #142632}
.sv-region h2{margin:0;font-size:23px;font-weight:400;letter-spacing:.03em}
.sv-region p{margin:4px 0 0;font-size:14px;color:#f7d684;background:#20353ee6;padding:3px 8px;border-bottom:2px solid #ad8b52}
.sv-region.is-closed{color:#f0f2e9;text-shadow:2px 2px #48545b,-2px -2px #48545b,2px -2px #48545b,-2px 2px #48545b}
.sv-node{position:absolute;z-index:3;width:calc(var(--marker) + 28px);height:calc(var(--marker) + 36px);transform:translate(-50%,-50%)}
.sv-node.is-obscured{z-index:3}
.sv-map .sv-cell{all:unset;box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;cursor:pointer;touch-action:manipulation;border:0;aspect-ratio:auto}
.sv-platform{position:absolute;bottom:20px;left:8px;right:8px;height:22px;background:#b19758;border:4px solid #26352c;box-shadow:0 4px #17271d,inset 0 4px #d9c185;clip-path:polygon(10% 0,90% 0,90% 15%,100% 15%,100% 85%,90% 85%,90% 100%,10% 100%,10% 85%,0 85%,0 15%,10% 15%)}
.sv-node-art{position:relative;width:var(--marker);height:var(--marker);image-rendering:pixelated;object-fit:contain;align-self:flex-start;margin-top:4px;filter:drop-shadow(0 3px #17271d)}
.sv-caption{position:absolute;top:calc(var(--marker) + 8px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none}
.sv-map .sv-cell .sv-caption b{display:flex;align-items:center;gap:5px;font-size:18px;font-weight:400;line-height:1.2;white-space:nowrap;color:#fff4d3;background:#193039e8;padding:3px 8px;border-bottom:2px solid #b38e49}
.sv-lock{display:block;width:12px;height:14px;flex:none}.sv-lock svg{display:block;width:100%;height:100%;shape-rendering:crispEdges}
.sv-map .sv-cell .gf-stage-stars{position:static;transform:none;margin:0;gap:2px;filter:drop-shadow(0 2px #17271d)}
.sv-map .sv-cell .gf-stage-stars span{width:15px;height:15px}
.sv-map .sv-cell.is-done .sv-platform{background:#bba74a;border-color:#f7d475;box-shadow:0 4px #514125,inset 0 4px #ffeea3}
.sv-cleared-flag{position:absolute;top:-6px;right:0;width:20px;height:34px;border-left:4px solid #21342d;background:linear-gradient(#f7d475 0 52%,transparent 52%);clip-path:polygon(0 0,100% 0,80% 25%,100% 52%,20% 52%,20% 100%,0 100%);filter:drop-shadow(2px 2px #22312a)}
.sv-now-arrow{position:absolute;top:-22px;left:50%;width:18px;height:14px;transform:translateX(-50%);background:#fff1a3;clip-path:polygon(0 0,100% 0,100% 40%,75% 40%,75% 70%,60% 70%,60% 100%,40% 100%,40% 70%,25% 70%,25% 40%,0 40%);filter:drop-shadow(0 2px #26352c);animation:sv-float 1.4s ease-in-out infinite}
.sv-map .sv-cell.is-selected .sv-platform{border-color:#fff4c8;box-shadow:0 4px #28412b,inset 0 4px #fff2a2}
.sv-map .sv-cell:focus-visible,.sv-map .sv-locked-pick:focus-visible{outline:3px solid #fff3c1;outline-offset:5px}
.sv-map .sv-cell:disabled{cursor:default}.sv-node.is-obscured .sv-node-art{opacity:.78;filter:grayscale(1) sepia(1) saturate(1.8) hue-rotate(165deg) brightness(.66) blur(.35px) drop-shadow(0 3px #132838)}.sv-node.is-obscured .sv-platform{opacity:.6;filter:saturate(.2) brightness(.68)}
.sv-locked-pick{all:unset;position:absolute;inset:0;cursor:pointer;touch-action:manipulation}
.sv-soon{color:#bdcbd1;font-size:13px;line-height:1;white-space:nowrap;pointer-events:none;text-shadow:1px 1px #142632}
.sv-walker{position:absolute;right:calc(100% + 8px);top:4px;width:var(--hero);height:calc(var(--hero) * 4 / 3);image-rendering:pixelated;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px #14271e)}
.sv-map-help{position:relative;z-index:4;flex:none;padding:7px 16px;background:#203840;border-left:3px solid #e6b653;color:#fff0c5;font-size:15px;line-height:1.2;pointer-events:none}.sv-touch-help{display:none}
.sv-map-panel{position:relative;z-index:5;flex:none;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:28px;min-height:150px;padding:18px 5vw 22px;background:#182a30;border-top:4px solid #0c191e;box-shadow:inset 0 2px #b28a43;color:#fff4d3}
.sv-map-copy{min-width:0}.sv-map-copy h3{margin:3px 0 5px;font-size:clamp(26px,3vw,44px);font-weight:400;line-height:1.15}.sv-map-copy p{margin:0;line-height:1.4}
.sv-map-years{color:#bdcbbf;font-size:17px}.sv-map-battle{font-size:19px;color:#f5ce78}.sv-map-state{font-size:16px;color:#dfc797;margin-top:5px!important}
.sv-map-copy .gf-stage-stars{position:static;transform:none;display:inline-flex;vertical-align:middle;margin:0 0 0 12px;gap:4px}.sv-map-copy .gf-stage-stars span{width:21px;height:21px}
.sv-map-boss{display:flex;align-items:center;gap:12px;min-width:150px;color:#f5ce78;font-size:21px}.sv-map-boss-face{width:88px;height:88px;border:3px solid #b28a43;background:#243d44;overflow:hidden;flex:none}.sv-map-boss-face img{width:144px;height:144px;max-width:none;image-rendering:pixelated;object-fit:contain;position:relative;left:-30px;top:-8px}.sv-map-boss-face img.is-strip{object-fit:cover;object-position:0 0}.sv-map-boss[hidden]{display:none}
.sv-map-panel .sv-go{border-radius:2px;border:3px solid #eecb77;box-shadow:0 5px #6c4f25,inset 0 0 0 2px #b98a35;background:#edbe56;color:#203039;font-size:26px;min-width:150px;min-height:58px;padding:8px 20px;box-sizing:border-box}
.sv-map-panel .sv-go:disabled{cursor:default;background:#34484e;border-color:#718084;box-shadow:0 4px #102027;color:#bdc7c3}
@keyframes sv-float{50%{translate:0 -5px}}
@keyframes sv-cloud-flow{0%,100%{translate:0 0}50%{translate:var(--drift-x,10px) var(--drift-y,-4px)}}
@media (max-width:700px){.sv-map .sv-bar{padding:8px 58px 8px 60px;gap:6px;min-height:108px;align-content:center}.sv-map .sv-bar .sv-pill{font-size:17px;padding:0}.sv-map .sv-bar .gf-map-total{font-size:15px;margin-left:auto}.sv-map .sv-bar .sv-grow{display:none}.sv-map .sv-meta-open{margin-left:auto;min-height:36px;font-size:16px}.sv-map .sv-plain{min-width:36px;min-height:36px;font-size:26px}.sv-region h2{font-size:21px}.sv-region p{font-size:13px}.sv-map-panel{min-height:210px;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;padding:14px 16px 20px}.sv-map-copy h3{font-size:28px}.sv-map-years{font-size:14px}.sv-map-battle{font-size:17px}.sv-map-state{font-size:14px}.sv-map-boss{min-width:0;flex-direction:column;gap:5px;font-size:16px}.sv-map-boss-face{width:66px;height:66px}.sv-map-boss-face img{width:108px;height:108px;left:-22px;top:-6px}.sv-map-panel .sv-go{grid-column:1/-1;min-height:48px;font-size:22px}.sv-map-copy .gf-stage-stars span{width:17px;height:17px}.sv-map-copy .gf-stage-stars{margin-left:8px}.sv-map-help{left:8px;font-size:13px}.sv-key-help{display:none}.sv-touch-help{display:inline}}
@media (prefers-reduced-motion:reduce){.sv-now-arrow,.sv-cloud-piece{animation:none}}
.sv-dlg{width:min(92vw,520px);padding:18px 16px;border:5px solid #2b1d12;border-radius:24px;background:linear-gradient(#fff9df,#ffe2a6);color:#2b1d12;box-shadow:0 7px #a8713c,0 12px 18px #0007;display:grid;gap:10px;text-align:center}
.sv-dlg h3{margin:0;font-size:26px;font-weight:400}
.sv-dlg p{margin:0;font-size:17px;line-height:1.45}
.sv-dlg .sv-crit{display:grid;gap:4px;background:#fffaf0aa;border-radius:12px;padding:8px}
.sv-dlg .sv-crit p{display:flex;gap:8px;align-items:center;justify-content:center;font-size:15px}
.sv-dlg .sv-crit .gf-stage-stars span{width:16px;height:16px}
.sv-dlg .sv-btns{display:flex;gap:10px;justify-content:center}
.sv-plain{all:unset;cursor:pointer;padding:10px 18px;border:3px solid #2b1d12;border-radius:16px;background:#fff6df;font-size:18px}
.sv-plain:focus-visible{outline:4px solid #ffd34d}
.sv-camp{background:#141a10}
.sv-camp .gf-ui-background{filter:blur(14px) brightness(.45) saturate(1.1);transform:scale(1.08)}
.sv-camp-view{position:absolute;user-select:none;-webkit-user-select:none;touch-action:manipulation;cursor:pointer}
.sv-camp-pic{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.sv-camp-glow{position:absolute;inset:0;pointer-events:none}
.sv-camp-fire{position:absolute;border-radius:50%;transform:translate(-50%,-50%);mix-blend-mode:screen;background:radial-gradient(circle,#ffc56acc 0,#ff8a2a66 32%,#ff7a1a00 68%);animation:sv-flicker var(--d,1.2s) ease-in-out var(--dl,0s) infinite alternate}
@keyframes sv-flicker{0%{opacity:.5;scale:.9}35%{opacity:.85;scale:1.04}60%{opacity:.62;scale:.96}100%{opacity:.95;scale:1.1}}
.sv-camp-embers{position:absolute;width:0;height:0}
.sv-camp-ember{position:absolute;left:0;top:0;width:3px;height:3px;background:#ffd27a;box-shadow:0 0 4px #ff9a3a;opacity:0;animation:sv-ember var(--d,1.8s) linear var(--dl,0s) infinite}
@keyframes sv-ember{0%{opacity:0;translate:0 0}15%{opacity:1}100%{opacity:0;translate:var(--ex,0) calc(var(--ember,60px) * -1)}}
.sv-camp-flag{position:absolute;pointer-events:none}
.sv-camp-hero{position:absolute;pointer-events:none;filter:drop-shadow(0 2px #0009)}
.sv-camp-hero::before{content:'';position:absolute;left:10%;right:10%;bottom:-5%;height:16%;border-radius:50%;background:#0006}
.sv-camp-hero img{position:relative;display:block;width:100%;height:100%;image-rendering:pixelated;animation:sv-idle 1.6s ease-in-out infinite}
.sv-camp-hero.is-walking img{animation:none}
.sv-camp-hero.is-left img{transform:scaleX(-1)}
@keyframes sv-idle{50%{translate:0 -2px}}
.sv-camp-place{all:unset;position:absolute;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sv-camp-place::before{content:'';position:absolute;inset:6%;border-radius:50%;background:radial-gradient(closest-side,#ffe9a055,#ffe9a000);opacity:0;transition:opacity .15s;pointer-events:none}
.sv-camp-place:hover::before,.sv-camp-place:focus-visible::before,.sv-camp-place.is-near::before{opacity:1}
.sv-camp-tag{position:absolute;z-index:1;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 14px 6px;min-width:92px;background:linear-gradient(#4a2c16f2,#2f1b0ef2);border:3px solid #e2b45a;border-radius:10px;box-shadow:0 4px #1a0f07,0 8px 14px #0008;color:#fff3cf;text-align:center;white-space:nowrap;transition:transform .12s}
.sv-camp-tag small{font-size:13px;color:#f3cf86;line-height:1.15}
.sv-camp-tag b{font-weight:400;font-size:clamp(18px,2.2vw,26px);line-height:1.15}
.sv-camp-tag em{font-style:normal;font-size:13px;color:#ffe1a0;line-height:1.25}
.sv-camp .is-go .sv-camp-tag{padding:5px 18px 7px;background:linear-gradient(#ffd85a,#f0a929);color:#3a2210;border-color:#fff1b8;box-shadow:0 5px #8a5418,0 10px 16px #0009}
.sv-camp .is-go .sv-camp-tag small,.sv-camp .is-go .sv-camp-tag em{color:#6b3c12}
.sv-camp .is-go .sv-camp-tag b{font-size:clamp(22px,2.7vw,32px)}
.sv-camp-place:hover .sv-camp-tag,.sv-camp-place:focus-visible .sv-camp-tag,.sv-camp-place.is-near .sv-camp-tag{transform:translate(-50%,-50%) translateY(-3px) scale(1.06);border-color:#fff6d0}
.sv-camp .sv-camp-place:focus-visible{outline:none}
.sv-camp-place:focus-visible .sv-camp-tag{outline:3px solid #fff;outline-offset:3px}
.sv-camp-place[aria-disabled=true] .sv-camp-tag{filter:saturate(.35) brightness(.85)}
.sv-camp-place.is-shake .sv-camp-tag{animation:sv-shake .35s}
@keyframes sv-shake{25%{translate:-6px 0}75%{translate:6px 0}}
.sv-camp-bar{position:absolute;top:0;left:0;right:0;z-index:3;padding:10px 64px;pointer-events:none}
.sv-camp-bar>*{pointer-events:auto}
.sv-camp-title{margin:0;font-size:clamp(22px,3.6vh,34px);font-weight:400;color:#fff3cf;text-shadow:0 3px 0 #5b3214,0 0 12px #000c;white-space:nowrap}
.sv-home .sv-camp-bar .sv-meta-home{width:auto;min-height:44px;padding:6px 14px;font-size:19px;gap:8px}
.sv-camp-foot{position:absolute;left:0;right:0;bottom:0;z-index:3;display:none;flex-direction:column;align-items:center;gap:8px;padding:28px 16px max(16px,env(safe-area-inset-bottom));background:linear-gradient(#1a0f0700,#1a0f07b8 45%)}
.sv-camp.is-tall .sv-camp-foot{display:flex}
.sv-camp-foot .sv-camp-title{font-size:clamp(28px,4.4vh,40px)}
.sv-camp-foot .sv-sum{font-size:15px;max-width:30em}
.sv-camp-big{display:flex;flex-direction:column;align-items:center;gap:2px;width:min(340px,100%);padding:10px 22px 12px}
.sv-camp-big b{font-weight:400;font-size:28px;line-height:1.1}.sv-camp-big small{font-size:15px;color:#6b3c12}
@media (prefers-reduced-motion:reduce){.sv-camp-fire,.sv-camp-ember,.sv-camp-hero img{animation:none}}

/* A 군막 판: docs/refs/2026-10-18-topbar/variants/a.css */
:root:has(body[data-ui-family="survivor"]){
  --tb-bg:linear-gradient(#30474c 0 2px,#263b41 2px 52%,#20333a 52% calc(100% - 3px),#182a30 calc(100% - 3px));
  --tb-edge:#b28a43;
  --tb-radius:2px;
  --tb-shadow:0 4px 0 #0c191e,inset 0 1px 0 #ffffff38,inset 0 -2px 0 #00000040;
  --tb-ink:#fff4d3;
  --tb-bar:#182a30;
  --tb-gold:linear-gradient(#ffdf83 0 2px,#edbe56 2px 52%,#deb04b 52% calc(100% - 3px),#be8e35 calc(100% - 3px));
  --tb-gold-edge:#eecb77;
  --tb-size:48px;--tb-y:12px;--tb-gold-ink:#2a281a;
}
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar :is([data-test="map-back"],[data-test="feel-settings"],[data-test="meta-open"]){
  box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
  flex:none!important;height:var(--tb-size)!important;min-height:var(--tb-size)!important;max-height:var(--tb-size)!important;
  border:2px solid var(--tb-edge)!important;border-radius:var(--tb-radius)!important;
  background:var(--tb-bg)!important;color:var(--tb-ink)!important;box-shadow:var(--tb-shadow)!important;
  font:400 18px/1 Jua,sans-serif!important;letter-spacing:0!important;white-space:nowrap!important;
  text-shadow:0 1px #0006;cursor:pointer;touch-action:manipulation;transition:none!important;transform:none!important;
}
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar :is([data-test="map-back"],[data-test="feel-settings"],[data-test="meta-open"]):focus-visible{outline:3px solid #fff1b8!important;outline-offset:3px!important}
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar{
  align-items:center!important;flex-wrap:nowrap!important;gap:8px!important;padding-top:var(--tb-y)!important;padding-bottom:12px!important;min-height:76px!important;
}
body[data-ui-family="survivor"] .sv-home .sv-camp-bar{min-height:72px!important}
body[data-ui-family="survivor"] .sv-map .sv-bar{background:var(--tb-bar)!important;box-shadow:inset 0 -2px var(--tb-edge)!important}
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar :is([data-test="map-back"],[data-test="feel-settings"]){
  position:relative!important;width:var(--tb-size)!important;min-width:var(--tb-size)!important;max-width:var(--tb-size)!important;padding:0!important;text-indent:-9999px!important;overflow:hidden!important;
}
body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar :is([data-test="map-back"],[data-test="feel-settings"])::before{
  content:'';display:block;position:absolute;inset:0;margin:auto;width:24px;height:24px;background:currentColor;mask-size:24px 24px;mask-repeat:no-repeat;mask-position:center;image-rendering:pixelated;
}
body[data-ui-family="survivor"] [data-test="map-back"]::before{mask-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2012%2012%22%20shape-rendering%3D%22crispEdges%22%3E%3Cpath%20fill%3D%22white%22%20fill-rule%3D%22evenodd%22%20d%3D%22M7%201h2v2H7v2H5v2h2v2h2v2H7V9H5V7H3V5h2V3h2z%22%2F%3E%3C%2Fsvg%3E")}
body[data-ui-family="survivor"] [data-test="feel-settings"]::before{mask-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2012%2012%22%20shape-rendering%3D%22crispEdges%22%3E%3Cpath%20fill%3D%22white%22%20fill-rule%3D%22evenodd%22%20d%3D%22M4%200h4v2h1V1h2v2h-1v1h2v4h-2v1h1v2H9v-1H8v2H4v-2H3v1H1V9h1V8H0V4h2V3H1V1h2v1h1z%20M4%204v4h4V4z%22%2F%3E%3C%2Fsvg%3E")}





body[data-ui-family="survivor"] :is(.sv-camp-title,.sv-map .sv-bar .sv-pill){font-family:Jua,sans-serif!important;font-weight:400!important;color:var(--tb-ink)!important;text-shadow:2px 2px #10191a,0 3px #10191a!important}
body[data-ui-family="survivor"] .sv-map .sv-bar .gf-map-total{color:#f4ce78!important}
@media(max-width:700px){
  :root:has(body[data-ui-family="survivor"]){--tb-size:44px;--tb-y:8px}
  body[data-ui-family="survivor"] :is(.sv-home,.sv-map) .sv-bar{padding-top:8px!important;padding-bottom:8px!important;gap:6px!important;min-height:60px!important}
  body[data-ui-family="survivor"] .sv-map .sv-bar{display:grid!important;grid-template-columns:44px 44px minmax(0,1fr);grid-template-rows:44px 24px;min-height:94px!important;align-content:start!important;row-gap:6px!important}
  body[data-ui-family="survivor"] .sv-map .sv-bar [data-test="map-back"]{grid-column:1;grid-row:1}
  body[data-ui-family="survivor"] .sv-map .sv-bar [data-test="feel-settings"]{grid-column:2;grid-row:1}
  body[data-ui-family="survivor"] .sv-map .sv-bar [data-test="meta-open"]{grid-column:3;grid-row:1;justify-self:end}
  body[data-ui-family="survivor"] .sv-map .sv-bar .sv-pill{grid-column:1 / -1;grid-row:2;justify-self:start;padding:0!important;font-size:17px!important;line-height:24px!important}
  body[data-ui-family="survivor"] .sv-map .sv-bar .gf-map-total{grid-column:3;grid-row:2;justify-self:end;font-size:15px!important}
  body[data-ui-family="survivor"] .sv-map .sv-bar .sv-grow{display:none!important}
}

`;
  const style = () => { if (!document.getElementById('sv-stages-style')) { const s = document.createElement('style'); s.id = 'sv-stages-style'; s.textContent = UI_STYLE; document.head.append(s); } };
  // 저장(meta)에서 깬 칸을 읽어 칸 id 모음으로. 시험·막힌 저장소에서도 빈 모음.
  const clearedOf = data => { try { return new Set(S.meta.read(data.content, data.family?.tuning).cleared.map(S.eras.cellId)); } catch { return new Set(); } };
  const stageOf = (config, no) => config.stage.stages.find(s => s.id === no);
  // 껍데기가 주소로 받은 칸을 열어도 되는지(cfg.stageOpen). 꾸러미가 있고 지도에서 열린 칸만.
  function stageOpen(no, data) {
    const cell = S.eras.mapState(data.content, clearedOf(data)).find(x => x.no === no);
    return !!cell && cell.unlocked && cell.ready;
  }
  const endlessOpen = data => S.eras.endlessOpen(data.content, clearedOf(data));

  // ---- 첫 화면: 진영 거점(짜임 「나」). 가로 화면은 콘셉트 C, 세로 화면은 B(art.json ui.start) ----
  // 좌표는 그림 원본 픽셀. key: 늘 보여야 하는 네모(다섯 장소, 세로는 아래 빈 땅까지) · stand: 주인공 발 자리 · walk: 걸을 수 있는 네모
  // box: 누르는 자리 · tag: 이름표 가운데 · fires: 불빛 [x, y, 반지름] · embers: 모닥불 불티 · flags: 깃발 천 [x, y, 너비, 높이](왼쪽이 깃대)
  const CAMP = {
    landscape: { key: [20, 180, 1665, 850], stand: [590, 530], walk: [70, 430, 1600, 880], embers: [708, 760],
      places: { go: { box: [345, 205, 835, 655], tag: [590, 692] }, heroes: { box: [800, 186, 1228, 432], tag: [1012, 236] },
        book: { box: [925, 548, 1342, 842], tag: [1132, 610] }, forge: { box: [24, 190, 414, 404], tag: [215, 226] },
        gate: { box: [1372, 238, 1668, 540], tag: [1525, 445] } },
      fires: [[708, 772, 66], [178, 343, 56], [400, 570, 26], [765, 563, 26], [1408, 378, 26], [1640, 336, 26], [366, 283, 20], [1137, 668, 20]],
      flags: [[588, 220, 100, 150], [1118, 196, 60, 88], [1262, 572, 60, 100]] },
    portrait: { key: [0, 95, 853, 1640], stand: [482, 1062], walk: [40, 420, 813, 1440], embers: [580, 1322],
      places: { go: { box: [255, 750, 725, 1200], tag: [482, 1222] }, heroes: { box: [560, 430, 853, 835], tag: [652, 560] },
        book: { box: [0, 340, 352, 700], tag: [150, 548] }, forge: { box: [0, 1115, 358, 1432], tag: [178, 1162] },
        gate: { box: [295, 95, 610, 392], tag: [452, 335] } },
      fires: [[580, 1340, 60], [155, 1300, 52], [243, 1000, 24], [716, 995, 24], [312, 295, 24], [588, 325, 24], [138, 600, 18]],
      flags: [[103, 360, 66, 128], [765, 452, 70, 182], [455, 755, 118, 162]] },
  };
  const WALK_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
  const clampTo = (v, a, b) => Math.min(b, Math.max(a, v));
  // 주인공 몸 그림 이름(person-N). sprite는 시대 꾸러미 인물에만 있다(content.people에는 없다).
  const spriteOf = (content, id) => id && (content.packs || []).flatMap(p => p.people || []).find(p => p.id === id)?.sprite;
  // 신라부터의 인물·장수는 옛 그림 표(slots)에 없고 싸움 그림 표에만 있다. 장수 싸움 그림은 여러 장 띠다.
  // 꼬마 도트 얼굴·몸(picker.asset)을 먼저, 없으면 시대 꾸러미 그림이 있는 전장 묶음에서 찾는다.
  const spriteArt = (art, slot) => slot && (S.picker.asset(art, slot) || art?.ui?.battle?.sprites?.[slot]);

  // 첫 화면: 진영 그림 위 다섯 장소. 장소를 누르면 바로 들어가고, 걷기(화살표·땅 누르기)는 둘러보고 싶을 때만.
  function home({ parent, data, store, family, map, go }) {
    style();
    const ui = window.GFUI, el = ui.node, T = R().T, art = data.art?.ui?.start || {};
    const screen = el('section', 'sv-home sv-camp', undefined, parent); screen.dataset.test = 'sv-home';
    ui.theme(screen, family); ui.background(screen, data.art, 'start');
    const view = el('div', 'sv-camp-view', undefined, screen);
    const pic = el('img', 'sv-camp-pic', undefined, view); pic.alt = ''; pic.draggable = false;
    const glow = el('div', 'sv-camp-glow', undefined, view);
    const hero = el('div', 'sv-camp-hero', undefined, view), heroPic = el('img', '', undefined, hero); heroPic.alt = '';
    const bar = el('div', 'sv-bar sv-camp-bar gf-menu-side', undefined, screen);
    const title = el('h1', 'sv-camp-title', data.game.title, bar); el('span', 'sv-grow', undefined, bar);
    const foot = el('div', 'sv-camp-foot', undefined, screen); el('p', 'sv-sum', data.game.summary, foot);
    const cleared = clearedOf(data), total = S.eras.CELLS.length, open = S.eras.endlessOpen(data.content, cleared);
    const clearedText = R().fmt(T.clearedN, cleared.size, total);
    S.meta.runClear();
    const follow = () => { screen.remove(); map(); };
    const big = el('button', 'sv-go sv-camp-big', undefined, foot); big.type = 'button';
    el('b', '', '출정!', big); el('small', '', `${T.followName} · ${clearedText}`, big); big.onclick = follow;
    const places = {};
    for (const [id, name, what, more] of [['go', '출정 깃발', T.followName, clearedText], ['heroes', '영웅 천막', T.heroes], ['book', '서고', T.book], ['forge', '대장간', T.shop],
      ['gate', '성문', T.endlessName, open ? '' : R().fmt(T.endlessLock, Math.min(cleared.size, S.eras.ENDLESS_NEED), S.eras.ENDLESS_NEED)]]) {
      const b = el('button', `sv-camp-place is-${id}`, undefined, view); b.type = 'button';
      const tag = el('span', 'sv-camp-tag', undefined, b); el('small', '', name, tag); el('b', '', what, tag); if (more) el('em', '', more, tag);
      b.setAttribute('aria-label', [name, what, more].filter(Boolean).join(', '));
      places[id] = { b, tag };
    }
    places.gate.b.dataset.test = 'mode-endless'; places.gate.b.setAttribute('aria-disabled', String(!open));
    for (const id of ['heroes', 'book', 'forge']) places[id].b.dataset.test = `camp-${id}`;
    places.go.b.onclick = follow;
    places.gate.b.onclick = () => {
      const b = places.gate.b;
      if (!open) { b.classList.remove('is-shake'); void b.offsetWidth; b.classList.add('is-shake'); return; }
      screen.remove(); go({ play: 'endless' }, b, null);
    };
    for (const [id, tab] of [['heroes', 'heroes'], ['book', 'book'], ['forge', 'shop']]) places[id].b.onclick = () => S.meta.open(data, { tab, anchor: places[id].b });
    S.meta.titleExtra(bar, { data });

    // 주인공: 고른 주인공의 걷는 그림 두 장. 준비 창에서 바꾸고 돌아오면(초점이 돌아옴) 다시 칠한다.
    let frames = [], heroFrame = null;
    const paintHero = () => {
      const m = S.meta.read(data.content, data.family?.tuning), sprite = spriteOf(data.content, m.hero) || spriteOf(data.content, data.content.heroes?.[0]?.person);
      frames = sprite ? ['a', 'b'].map(f => spriteArt(data.art, `${sprite}-${f}`)).filter(Boolean) : [];
      heroFrame = frames[0];
      hero.hidden = !frames.length; if (heroFrame && !heroPic.src.endsWith(heroFrame.file)) heroPic.src = heroFrame.file;
      if (hero.style.width) placeHero();
    };
    paintHero(); screen.addEventListener('focusin', e => { if (e.target.closest?.('.sv-camp-place')) paintHero(); });

    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let L = null, tall = null, fires = [], flags = [], embers = null, near = null, target = null, raf = 0, last = 0, flagAt = 0, stride = 0, left = false;
    const pos = { x: 0, y: 0 }, keys = new Set();
    // 깃발 천: 그림에서 그 네모를 떼어 와 깃대 쪽은 가만히, 끝으로 갈수록 크게 위아래로 물결친다(둘레는 0으로 이어 붙임).
    function makeFlags(spec) {
      for (const f of flags) f.c.remove();
      flags = reduce ? [] : spec.flags.map(([x, y, w, h]) => {
        const pad = 6, c = el('canvas', 'sv-camp-flag', undefined, glow);
        c.width = w + pad * 2; c.height = h + pad * 2;
        return { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, pad, c, g: c.getContext('2d'), src: null };
      });
      readFlags();
    }
    function readFlags() {
      if (!pic.complete || !pic.naturalWidth) return;
      for (const f of flags) {
        if (f.src) continue;
        const t = document.createElement('canvas'); t.width = f.w; t.height = f.h;
        const tg = t.getContext('2d'); tg.drawImage(pic, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
        f.src = new Uint32Array(tg.getImageData(0, 0, f.w, f.h).data.buffer);
        f.img = f.g.createImageData(f.w, f.h); f.out = new Uint32Array(f.img.data.buffer);
      }
      kick();
    }
    function drawFlags(t) {
      for (const f of flags) {
        if (!f.src) continue;
        const { w, h, pad, src, out } = f, cloth = w - pad * 2;
        for (let x = 0; x < w; x++) {
          const u = Math.max(0, (x - pad) / cloth), amp = 3.4 * Math.min(1, u * 1.5) * Math.min(1, (w - 1 - x) / pad);
          const off = amp * Math.sin(u * 7 - t * 5.5 + f.x * .01);
          for (let y = 0; y < h; y++) {
            const edge = Math.min(1, y / pad, (h - 1 - y) / pad);
            out[y * w + x] = src[clampTo(Math.round(y - off * edge), 0, h - 1) * w + x];
          }
        }
        f.g.putImageData(f.img, 0, 0);
      }
    }
    function makeFires(spec) {
      for (const f of fires) f.e.remove(); embers?.remove();
      fires = spec.fires.map(([x, y, r]) => {
        const e = el('i', 'sv-camp-fire', undefined, glow);
        e.style.setProperty('--d', `${(0.8 + Math.random() * 0.8).toFixed(2)}s`); e.style.setProperty('--dl', `${(-Math.random() * 2).toFixed(2)}s`);
        return { e, x, y, r };
      });
      embers = el('div', 'sv-camp-embers', undefined, glow);
      for (let i = 0; i < 7; i++) {
        const e = el('i', 'sv-camp-ember', undefined, embers);
        e.style.cssText = `left:${(Math.random() * 30 - 15).toFixed(0)}px;--ex:${(Math.random() * 24 - 12).toFixed(0)}px;--d:${(1.4 + Math.random()).toFixed(2)}s;--dl:${(-Math.random() * 2.4).toFixed(2)}s`;
      }
    }
    function placeHero() {
      if (!L) return;
      const h = Math.max(52, 96 * L.k), w = h * 24 / 32;
      hero.style.cssText = `left:${pos.x * L.k - w / 2}px;top:${pos.y * L.k - h}px;width:${w}px;height:${h}px`;
      const spec = heroFrame, d = spec?.display;
      if (d) {
        const ink = spec.ink, old = d.ink || ink.map(n => n * d.scale), unit = h / 32, k = d.scale * unit;
        const a = left ? 24 - old[0] - old[2] / 2 : old[0] + old[2] / 2;
        const b = left ? spec.w - ink[0] - ink[2] / 2 : ink[0] + ink[2] / 2;
        heroPic.style.cssText = `width:${spec.w*k}px;height:${spec.h*k}px;left:${a*unit-b*k}px;top:${(old[1]+old[3])*unit-(ink[1]+ink[3])*k}px`;
      } else heroPic.style.cssText = '';
      hero.classList.toggle('is-left', left);
    }
    // 그림 배율: 화면을 덮되(cover) 다섯 장소가 잘리거나 위쪽 줄에 가리면 그만큼 줄이고, 남는 자리는 흐린 같은 그림이 채운다.
    function layout() {
      if (!screen.isConnected) return off();
      const vw = screen.clientWidth, vh = screen.clientHeight, t = vh > vw, img = art[t ? 'portrait' : 'landscape'], spec = CAMP[t ? 'portrait' : 'landscape'];
      if (!vw || !vh || !img) return;
      if (t !== tall) {
        tall = t; screen.classList.toggle('is-tall', t); (t ? foot : bar).prepend(title);
        places.go.b.dataset.test = t ? 'camp-go' : 'start'; big.dataset.test = t ? 'start' : 'camp-big';
        pic.src = img.file; pos.x = spec.stand[0]; pos.y = spec.stand[1]; target = null;
        makeFires(spec); makeFlags(spec);
      }
      const [kx0, ky0, kx1, ky1] = spec.key, top = Math.min(vh / 3, Math.max(0, bar.getBoundingClientRect().bottom - screen.getBoundingClientRect().top));
      const k = Math.min(Math.max(vw / img.w, vh / img.h), vw / (kx1 - kx0), (vh - top) / (ky1 - ky0)), W = img.w * k, H = img.h * k;
      // 장소 네모의 가운데를 남는 자리(위쪽 줄 아래)의 가운데에. 그림이 화면보다 크면 빈틈이 생기지 않게, 작으면 화면 밖으로 나가지 않게 묶는다.
      const fit = (v, size, c, from = 0) => clampTo(from + (v - from) / 2 - c * k, Math.min(0, v - size), Math.max(0, v - size));
      L = { k, spec, ox: fit(vw, W, (kx0 + kx1) / 2), oy: fit(vh, H, (ky0 + ky1) / 2, top) };
      view.style.cssText = `left:${L.ox}px;top:${L.oy}px;width:${W}px;height:${H}px`;
      for (const [id, p] of Object.entries(places)) {
        // 위쪽 줄(강화하기·효과 설정) 밑으로 들어간 만큼은 누르는 자리에서 뺀다(세로 화면 성문)
        const { box: [x0, y0, x1, y1], tag: [tx, ty] } = spec.places[id], cut = Math.max(0, top - L.oy - y0 * k);
        p.b.style.cssText = `left:${x0 * k}px;top:${y0 * k + cut}px;width:${(x1 - x0) * k}px;height:${Math.max(0, (y1 - y0) * k - cut)}px`;
        p.tag.style.cssText = `left:${(tx - x0) * k}px;top:${(ty - y0) * k - cut}px`;
        // 이름표가 화면 가장자리 8px 밖으로 나가면 안쪽으로 민다(좁은 가로 화면의 성문)
        const r = p.tag.getBoundingClientRect(), dx = Math.max(0, 8 - r.left) - Math.max(0, r.right - (screen.getBoundingClientRect().right - 8));
        if (dx) p.tag.style.left = `${(tx - x0) * k + dx}px`;
      }
      for (const f of fires) Object.assign(f.e.style, { left: `${f.x * k}px`, top: `${f.y * k}px`, width: `${f.r * 2 * k}px`, height: `${f.r * 2 * k}px` });
      embers.style.cssText = `left:${spec.embers[0] * k}px;top:${spec.embers[1] * k}px;--ember:${Math.round(90 * k)}px`;
      for (const f of flags) f.c.style.cssText = `left:${f.x * k}px;top:${f.y * k}px;width:${f.w * k}px;height:${f.h * k}px`;
      placeHero();
    }
    // 걷기: 장소 가까이(이름표 네모에서 50px 안)에 가면 그 장소 단추로 초점을 옮겨, Enter·Space로 들어간다.
    function arrive() {
      let best = null, bestD = 50;
      for (const [id, p] of Object.entries(L.spec.places)) {
        const [x0, y0, x1, y1] = p.box, d = Math.hypot(Math.max(x0 - pos.x, 0, pos.x - x1), Math.max(y0 - pos.y, 0, pos.y - y1));
        if (d < bestD) { best = id; bestD = d; }
      }
      if (best === near) return;
      if (near) places[near].b.classList.remove('is-near');
      near = best;
      if (near) { places[near].b.classList.add('is-near'); places[near].b.focus({ preventScroll: true }); }
    }
    function tick(now) {
      raf = 0;
      if (!screen.isConnected) return off();
      // 창(강화·도감·주인공·설정)이 열리면 그 창이 키를 다 받아 키를 놓은 것이 여기 안 온다. 눌린 키를 비워 혼자 걷지 않게.
      if (keys.size && document.querySelector('.sv-meta, dialog[open]')) keys.clear();
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      let vx = 0, vy = 0;
      for (const key of keys) { vx += WALK_KEYS[key][0]; vy += WALK_KEYS[key][1]; }
      if (!vx && !vy && target) {
        const dx = target[0] - pos.x, dy = target[1] - pos.y, d = Math.hypot(dx, dy);
        if (d < 6) { target = null; arrive(); } else { vx = dx / d; vy = dy / d; }
      }
      const moving = !!(vx || vy) && !!L;
      if (moving) {
        const n = Math.hypot(vx, vy), [wx0, wy0, wx1, wy1] = L.spec.walk;
        pos.x = clampTo(pos.x + vx / n * 300 * dt, wx0, wx1); pos.y = clampTo(pos.y + vy / n * 300 * dt, wy0, wy1);
        if (vx) left = vx < 0;
        stride += dt; const f = frames[(stride * 7 | 0) % frames.length]; if (f && !heroPic.src.endsWith(f.file)) { heroFrame = f; heroPic.src = f.file; }
        placeHero(); if (keys.size) arrive();
      }
      hero.classList.toggle('is-walking', moving);
      if (flags.length && now - flagAt > 66) { flagAt = now; drawFlags(now / 1000); }
      if (moving || flags.length) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick() { if (!raf && screen.isConnected) raf = requestAnimationFrame(tick); }
    function onKey(e) {
      if (!screen.isConnected) return off();
      const key = e.key?.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.type === 'keyup') { keys.delete(key); return; }
      if (!WALK_KEYS[key] || e.altKey || e.ctrlKey || e.metaKey || document.querySelector('.sv-meta, dialog[open]')) return;
      e.preventDefault();
      keys.add(key); target = null; kick();
    }
    const drop = () => keys.clear();
    function off() { removeEventListener('resize', layout); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', drop); if (raf) cancelAnimationFrame(raf); raf = 0; }
    view.addEventListener('click', e => {
      if (!L || e.target.closest('.sv-camp-place')) return;
      const r = view.getBoundingClientRect(), [wx0, wy0, wx1, wy1] = L.spec.walk;
      target = [clampTo((e.clientX - r.left) / L.k, wx0, wx1), clampTo((e.clientY - r.top) / L.k, wy0, wy1)]; kick();
    });
    pic.addEventListener('load', readFlags);
    addEventListener('resize', layout); addEventListener('keydown', onKey); addEventListener('keyup', onKey); addEventListener('blur', drop);
    layout();
    (tall ? big : places.go.b).focus({ preventScroll: true });
    return screen;
  }

  // 모든 좌표는 600×250 땅 기준. 같은 때의 나라는 같은 x에 두고 갈래길로 묶는다.
  const MAP_LAYOUT = {
    w: 600, h: 250,
    regions: { gojoseon: [0, 90], samguk: [90, 192], nambuk: [192, 282], husamguk: [282, 357], goryeo: [357, 477], joseon: [477, 600] },
    nodes: { gojoseon: [48, 130], goguryeo: [138, 58], baekje: [138, 110], silla: [138, 162], gaya: [138, 214],
      unifiedsilla: [246, 82], balhae: [246, 174], husamguk: [324, 132], goryeo1: [393, 108], goryeo2: [435, 174],
      joseon1: [504, 74], joseon2: [543, 132], joseon3: [565, 199] }
  };
  const mapTitle = (c, config) => c.name || stageOf(config, c.no)?.title || c.id;
  function map({ parent, art, family, data, config, store, back, start }) {
    style();
    const ui = window.GFUI, el = ui.node, T = R().T;
    const screen = el('section', 'sv-map gf-mode-map', undefined, parent); screen.dataset.test = 'stage-map';
    ui.theme(screen, family);
    const bar = el('div', 'sv-bar gf-menu-side', undefined, screen);
    const exit = el('button', 'sv-plain', '‹', bar); exit.dataset.test = 'map-back'; exit.setAttribute('aria-label', T.toHome);
    exit.onclick = () => { screen.remove(); back(); };
    el('span', 'sv-pill', T.followName, bar);
    const stars = config.stage.stages.reduce((n, s) => n + store.stars(1, s.id), 0);
    el('span', 'sv-pill gf-map-total', `★ ${stars} / ${config.stage.stages.length * 3}`, bar);
    el('span', 'sv-grow', undefined, bar);
    S.meta.titleExtra(bar, { data });
    const rows = data.content.map.rows, cells = S.eras.mapState(data.content, clearedOf(data));
    const now = cells.find(c => c.unlocked && c.ready && !c.cleared);
    let selected = now || cells.find(c => c.unlocked && !c.cleared) || cells[cells.length - 1];
    const scroll = el('div', 'sv-map-scroll', undefined, screen);
    scroll.dataset.test = 'map-scroll'; scroll.setAttribute('aria-label', '시대 지도, 좌우로 밀어 볼 수 있어요');
    const world = el('div', 'sv-world', undefined, scroll);
    const picture = el('img', 'sv-terrain', undefined, world); picture.src = art.ui.map.world.file; picture.alt = '';
    const svg = cls => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', cls); s.setAttribute('viewBox', `0 0 ${MAP_LAYOUT.w} ${MAP_LAYOUT.h}`); s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('aria-hidden', 'true'); world.append(s); return s; };
    const shape = (parent, tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
    const roads = svg('sv-roads');
    const road = (a, b) => {
      const [x1, y1] = MAP_LAYOUT.nodes[a.id], [x2, y2] = MAP_LAYOUT.nodes[b.id], mid = Math.round((x1 + x2) / 2);
      const d = `M${x1} ${y1}H${mid}V${y2}H${x2}`, done = a.cleared && b.cleared;
      const locked = !a.unlocked || !b.unlocked;
      shape(roads, 'path', { d, fill: 'none', stroke: '#273c2e', opacity: locked ? .45 : 1, 'stroke-width': 5, 'stroke-linejoin': 'miter', ...(done ? {} : { 'stroke-dasharray': '4 4' }) });
      shape(roads, 'path', { d, fill: 'none', stroke: done ? '#d8b658' : locked ? '#8295ae' : '#fff0aa', opacity: locked ? .6 : 1, 'stroke-width': 2, ...(done ? {} : { 'stroke-dasharray': '4 4' }) });
    };
    rows.forEach((row, i) => {
      const mine = cells.filter(c => c.row === row.id);
      if (row.chain) mine.slice(1).forEach((c, n) => road(mine[n], c));
      if (i) {
        const prev = cells.filter(c => c.row === rows[i - 1].id);
        for (const a of rows[i - 1].chain ? prev.slice(-1) : prev) for (const b of row.chain ? mine.slice(0, 1) : mine) road(a, b);
      }
    });
    // 같은 땅을 밤빛으로 보여 주고, 열린 줄과 잠긴 줄의 경계에만 구름을 놓는다.
    const fog = el('div', 'sv-fog', undefined, world); fog.setAttribute('aria-hidden', 'true');
    const closedRows = rows.map(row => !cells.some(c => c.row === row.id && c.unlocked));
    rows.forEach((row, i) => {
      const [left, right] = MAP_LAYOUT.regions[row.id];
      if (closedRows[i]) {
        const night = el('div', 'sv-night', undefined, fog); night.dataset.row = row.id;
        night.style.clipPath = `inset(0 ${(1 - right / MAP_LAYOUT.w) * 100}% 0 ${left / MAP_LAYOUT.w * 100}%)`;
        const terrain = el('img', 'sv-terrain', undefined, night); terrain.src = art.ui.map.world.file; terrain.alt = '';
      }
      if (!i || closedRows[i] === closedRows[i - 1]) return;
      const front = el('div', 'sv-cloud-front', undefined, world); front.dataset.boundary = row.id; front.setAttribute('aria-hidden', 'true');
      const clouds = Object.values(art.ui.map.clouds);
      const lockedSide = closedRows[i] ? 1 : -1;
      const piece = (n, offset, y, size, opacity, layer) => {
        const night = offset * lockedSide >= 0;
        const cloud = el('img', `sv-cloud-piece${night ? ' is-night' : ''}`, undefined, front);
        cloud.src = clouds[n % clouds.length].file; cloud.alt = ''; cloud.dataset.layer = layer;
        cloud.style.left = `${(left + offset) / MAP_LAYOUT.w * 100}%`;
        cloud.style.top = `${y / MAP_LAYOUT.h * 100}%`;
        cloud.style.width = `${22 * size / MAP_LAYOUT.w * 100}%`; cloud.style.opacity = opacity;
        cloud.style.setProperty('--flip', n % 2 ? '-1' : '1');
        cloud.style.setProperty('--flow-time', `${36 + n % 7 * 5}s`);
        cloud.style.setProperty('--flow-delay', `${-n * 3}s`);
        cloud.style.setProperty('--drift-x', `${(n % 2 ? -1 : 1) * (8 + n % 4 * 2)}px`);
        cloud.style.setProperty('--drift-y', `${n % 3 === 0 ? 4 : -3}px`);
      };
      // Thin out both fringes, with the farthest night wisps fading into the land.
      for (let n = 0; n < 8; n++) {
        piece(n + 2, -lockedSide * (24 + n % 3 * 8), 6 + n * 34, 1 + n % 3 * .35, .28 + n % 2 * .12, 'open-fringe');
        piece(n + 1, lockedSide * (31 + n % 3 * 10), 17 + n * 33, 1.2 + n % 4 * .35, .32 - n % 3 * .08, 'night-fringe');
      }
      const sway = [-12, 9, -4, 16, 1, -8, 12], sizes = [1, 2.8, 1.6, 2.2, 1.2, 3, 1.8];
      for (let n = 0; n < 15; n++) {
        piece(n, sway[n % sway.length], -6 + n * 18, sizes[n % sizes.length], .86 + n % 3 * .07, 'core');
      }
    });
    const entries = new Map();
    for (const row of rows) {
      const mine = cells.filter(c => c.row === row.id), closed = !mine.some(c => c.unlocked);
      const heading = el('div', `sv-region${closed ? ' is-closed' : ''}`, undefined, world), bounds = MAP_LAYOUT.regions[row.id];
      heading.style.left = `${(bounds[0] + bounds[1]) / 2 / MAP_LAYOUT.w * 100}%`;
      el('h2', '', row.name, heading);
      if (row.eras.length > 1 && !row.chain) el('p', '', `${row.eras.length}개 중 ${row.need}개를 깨면 다음 시대`, heading);
      for (const c of mine) {
        const n = store.stars(1, c.no), title = mapTitle(c, config), [x, y] = MAP_LAYOUT.nodes[c.id];
        const node = el('div', `sv-node${!c.ready || !c.unlocked ? ' is-obscured' : ''}`, undefined, world);
        node.style.left = `${x / MAP_LAYOUT.w * 100}%`; node.style.top = `${y / MAP_LAYOUT.h * 100}%`;
        const b = el('button', `sv-cell${c === now ? ' is-now' : ''}${c.cleared ? ' is-done' : ''}`, undefined, node);
        b.dataset.test = `stage-${c.no}`; el('i', 'sv-platform', undefined, b);
        const icon = el('img', 'sv-node-art', undefined, b); icon.src = art.ui.map.nodes[`map-node-${c.id}`].file; icon.alt = '';
        if (c.cleared) el('i', 'sv-cleared-flag', undefined, b);
        if (c === now) el('i', 'sv-now-arrow', undefined, b);
        const caption = el('div', 'sv-caption', undefined, b), label = el('b', '', undefined, caption);
        if (!c.ready || !c.unlocked) {
          const lock = el('i', 'sv-lock', undefined, label); lock.setAttribute('aria-hidden', 'true');
          lock.innerHTML = '<svg viewBox="0 0 12 14"><path fill="#edca77" d="M3 0h6v2h2v5h1v7H0V7h1V2h2zm2 2v1H3v4h6V3H7V2z"/><path fill="#193039" d="M5 9h2v3H5z"/></svg>';
        }
        el('span', '', title, label);
        const state = !c.ready ? T.soon : !c.unlocked ? T.mapLocked : null;
        if (!state) window.GFModesUI.stars(caption, n, 'sv-stars');
        if (!c.ready) el('span', 'sv-soon', '준비 중', caption);
        b.disabled = !c.ready || !c.unlocked;
        b.setAttribute('aria-label', `${title}${state ? ` ${state}` : ` 별 ${n}개`}`);
        b.onclick = () => { if (selected.id === c.id) open(); else select(c); };
        let pick = b;
        if (b.disabled) {
          pick = el('button', 'sv-locked-pick', undefined, node); pick.dataset.test = `map-peek-${c.no}`;
          pick.setAttribute('aria-label', `${title} 정보 보기`); pick.onclick = () => select(c);
        }
        entries.set(c.id, { node, b, pick });
      }
    }
    const hero = el('img', 'sv-walker', undefined, world); hero.alt = '';
    const help = el('div', 'sv-map-help', undefined, screen);
    el('span', 'sv-key-help', '화살표로 고르기 · 한 번 더 누르면 출발', help);
    el('span', 'sv-touch-help', '↔ 옆으로 밀어 보기 · 한 번 더 누르면 출발', help);
    const panel = el('section', 'sv-map-panel', undefined, screen); panel.dataset.test = 'map-info'; panel.setAttribute('aria-label', '고른 시대');
    const copy = el('div', 'sv-map-copy', undefined, panel); copy.setAttribute('aria-live', 'polite');
    const years = el('p', 'sv-map-years', undefined, copy), titleLine = el('h3', '', undefined, copy);
    const battle = el('p', 'sv-map-battle', undefined, copy), note = el('p', 'sv-map-state', undefined, copy);
    const rival = el('div', 'sv-map-boss', undefined, panel), face = el('div', 'sv-map-boss-face', undefined, rival);
    const boss = el('img', '', undefined, face); boss.alt = ''; const bossName = el('span', '', undefined, rival);
    const go = el('button', 'sv-go', '출발!', panel); go.dataset.test = 'map-start'; go.onclick = () => open();
    function lockedText(c) {
      // 받침이 있으면 「을」(고조선을), 없으면 「를」(신라를).
      const open = name => `${name}${(name.charCodeAt(name.length - 1) - 0xac00) % 28 ? '을' : '를'} 깨면 열려요`;
      const i = rows.findIndex(r => r.id === c.row), row = rows[i], at = row.eras.indexOf(c.id);
      if (row.chain && at > 0 && !cells.find(x => x.id === row.eras[at - 1])?.cleared) return open(mapTitle(cells.find(x => x.id === row.eras[at - 1]), config));
      const prev = rows[i - 1];
      return prev ? open(`${prev.name}${prev.eras.length > 1 ? ` ${prev.eras.length}개 중 ${prev.need}개` : ''}`) : T.mapLocked;
    }
    function center() {
      const node = entries.get(selected.id).node;
      scroll.scrollTo({ left: node.offsetLeft - scroll.clientWidth / 2, behavior: 'instant' });
    }
    function select(c, focus = true) {
      selected = c; screen.dataset.selected = c.id;
      for (const [id, item] of entries) { item.b.classList.toggle('is-selected', id === c.id); item.pick.setAttribute('aria-pressed', String(id === c.id)); item.pick.tabIndex = id === c.id ? 0 : -1; }
      const pack = S.eras.packOf(data.content, c.id), title = mapTitle(c, config), n = store.stars(1, c.no);
      years.textContent = c.years; titleLine.replaceChildren(); el('span', '', title, titleLine); window.GFModesUI.stars(titleLine, n);
      battle.textContent = pack?.battle.name || '새로운 시대의 싸움을 준비하고 있어요';
      note.textContent = !c.unlocked ? lockedText(c) : !c.ready ? T.soon : c.cleared ? '깬 시대 · 다시 도전할 수 있어요' : '이 시대의 세 막을 버티고 적장을 물리쳐요';
      if (!c.ready && !c.unlocked) note.textContent += ` · ${T.soon}`;
      go.disabled = !c.unlocked || !c.ready; go.textContent = c.ready ? '출발!' : '준비 중';
      const general = spriteArt(art, pack?.general.sprite);
      rival.hidden = !pack; boss.hidden = !general;
      if (general) { boss.src = general.file; boss.classList.toggle('is-strip', (general.frames || 1) > 1); }
      if (pack) bossName.textContent = `적장 ${pack.general.name}`;
      // 칸 옆에는 이 칸에서 실제로 나가는 주인공을 그린다(못 깬 칸은 그 칸 사람만 나간다, meta.applyStart와 같은 규칙).
      const m = S.meta.read(data.content, data.family?.tuning), mine = S.meta.heroesFor(m, data.content, { play: 'stage', cell: c.id }).includes(m.hero) ? m.hero : null;
      const sprite = spriteOf(data.content, mine) || pack?.people.find(p => p.hero?.first)?.sprite;
      const heroSlot = sprite ? `${sprite}-a` : null;
      const asset = spriteArt(art, heroSlot); hero.hidden = !asset;
      if (asset) {
        hero.src = asset.file; entries.get(c.id).node.append(hero);
        const d = asset.display;
        if (d) {
          const ink = asset.ink, k = d.scale, old = d.ink || ink.map(n => n * k);
          const right = 1 - (old[0]+old[2]/2)/24 + (ink[0]+ink[2]/2-asset.w)*k/24;
          const top = (old[1]+old[3]-(ink[1]+ink[3])*k)/24;
          hero.style.cssText = `width:calc(var(--hero) * ${asset.w*k/24});height:calc(var(--hero) * ${asset.h*k/24});right:calc(100% + 8px + var(--hero) * ${right});top:calc(4px + var(--hero) * ${top})`;
        } else hero.style.cssText = '';
      }
      if (focus) entries.get(c.id).pick.focus({ preventScroll: true });
      center();
    }
    function open() {
      const c = selected;
      if (!c.unlocked || !c.ready || screen.querySelector('[data-test=stage-dialog]')) return;
      dialog(screen, { data, stage: stageOf(config, c.no), cell: c, title: mapTitle(c, config), start: button => { screen.remove(); start(c.no, button); } });
    }
    screen.addEventListener('keydown', e => {
      if (screen.querySelector('[data-test=stage-dialog]') || document.querySelector('[data-test=meta]')) return;
      if ((e.key === 'Enter' || e.key === ' ') && (e.target === entries.get(selected.id).pick || e.target === scroll)) { e.preventDefault(); if (!e.repeat) open(); return; }
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!direction || !e.target.closest('.sv-node,.sv-map-scroll')) return;
      e.preventDefault();
      const [x, y] = MAP_LAYOUT.nodes[selected.id], [dx, dy] = direction;
      const adjacent = cells.filter(c => c !== selected).map(c => { const [cx, cy] = MAP_LAYOUT.nodes[c.id], along = (cx - x) * dx + (cy - y) * dy, across = Math.abs((cx - x) * dy - (cy - y) * dx); return { c, along, across, score: along + across * 3 }; })
        .filter(c => c.along > 0 && (dy ? c.across < 2 : true)).sort((a, b) => a.score - b.score)[0];
      if (adjacent) select(adjacent.c);
    });
    // 지도 크기만 관찰하며 화면을 닫으면 관찰도 끝낸다. 폰에서는 고른 칸을 가운데로 옮긴다.
    const resize = new ResizeObserver(() => {
      if (!screen.isConnected) { resize.disconnect(); return; }
      world.style.width = `${innerHeight > innerWidth ? Math.max(scroll.clientWidth, scroll.clientHeight * MAP_LAYOUT.w / MAP_LAYOUT.h) : scroll.clientWidth}px`;
      world.style.setProperty('--marker', scroll.clientHeight >= 720 ? '96px' : '48px');
      world.style.setProperty('--hero', scroll.clientHeight >= 720 ? '72px' : '36px'); center();
    });
    resize.observe(scroll);
    screen.addEventListener('focusin', e => { if (e.target === bar.querySelector('[data-test=meta-open]')) select(selected, false); });
    select(selected);
    return screen;
  }

  // 칸 창: 나라·싸움·적장, 목표, 별 기준, 시작.
  function dialog(parent, { data, stage, cell, title, start }) {
    const el = window.GFUI.node, T = R().T, pack = S.eras.packOf(data.content, cell.id);
    const overlay = el('div', 'gf-mode-overlay', undefined, parent); overlay.dataset.test = 'stage-dialog';
    const box = el('section', 'sv-dlg', undefined, overlay); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', title);
    el('h3', '', `${title} · ${pack.battle.name}`, box);
    // 싸움 설명(문제 from 'battle'이 가리키는 글)
    if (pack.battle.story) el('p', 'sv-battle', pack.battle.story, box);
    el('p', '', R().fmt(T.cellGoal, pack.general.name), box);
    const crit = el('div', 'sv-crit', undefined, box), rules = stage.starRules;
    for (const [n, label] of [[1, T.star1], [2, R().fmt(T.star2, Math.round(rules.accuracy * 100))], [3, R().fmt(T.star3, rules.maxWrong)]]) {
      const p = el('p', '', undefined, crit); window.GFModesUI.stars(p, n); el('span', '', label, p);
    }
    const btns = el('div', 'sv-btns', undefined, box);
    const go = el('button', 'sv-go', T.startCell, btns); go.dataset.test = 'stage-start'; go.onclick = () => { overlay.remove(); start(go); };
    const close = el('button', 'sv-plain', T.close, btns); close.dataset.test = 'stage-close';
    close.onclick = () => { overlay.remove(); parent.querySelector(`[data-test="stage-${cell.no}"]`)?.focus(); };
    // 칸을 연 Enter를 누르고 있으면 되풀이 입력이 곧바로 시작 단추를 누른다. 되풀이는 버린다.
    const key = e => { if (!overlay.isConnected) { window.removeEventListener('keydown', key); return; } if (e.key === 'Escape') { e.preventDefault(); close.click(); } else if ((e.key === 'Enter' || e.key === ' ') && e.repeat) e.preventDefault(); };
    window.addEventListener('keydown', key); go.focus();
  }
  const R = () => S.rules;

  S.stages = { create, map, home, stageOpen, endlessOpen };
})();
