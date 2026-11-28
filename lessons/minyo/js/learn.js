// 처음 배우기. 곡의 연습 마디와 본판 판정을 함께 쓰되, 통과는 성공만 센다.
let learning = null, lastLearning = null, songHelp = null;
const LEARN_SAY = ['', '구슬이 글자에 닿을 때 톡 눌러요', '구슬이 글자에 닿을 때 톡 눌러요', '', '화면을 누르면 노래를 시작해요'];
// 곡 자료 learnSay가 있으면 그 단계 말을 쓴다(가래질 1 · 2단계 「당겨요」, 곡별 검수 07 R2-06). 없는 곡은 LEARN_SAY 그대로
const learnSayFor = step => {
  let text = (song?.learnSay?.[step] || LEARN_SAY[step]).replace('구슬이 닿는 순간', '구슬이 글자에 닿을 때');

  if(step===2&&(W<900||H<=420))return (performance.now()/1000-(learning?.frozenF||0))%6.4<3.2?(('이번에는 구슬이 기다리지 않아요')):text;
  return step === 2 ? '이번에는 구슬이 기다리지 않아요\n' + text : text;
};
const learnHoldSay = () => {
  const press=(performance.now()/1000-learning.frozenF+1e-9)%2.4 < 1.6;
  return (press?'앞소리꾼이 부를 때 꾹 눌러요':'첫 받는 글자에 구슬이 닿으면 떼요');
};
const LEARN_NAMES = ['', '톡', '박', '꾹', '노래'];
// 곡 자료 learnNames가 있으면 단계 이름표도 그 말로(운재 1단계 「당기기」: 바로 아래 말은 「당겨요」인데 이름표만 「톡」이었다, 곡별 검수 08 R2-02)
const learnNameFor = step => song?.learnNames?.[step] || LEARN_NAMES[step];
const learnUi = document.createElement('div');
learnUi.id = 'learnUi'; learnUi.hidden = true;
learnUi.innerHTML = '<canvas id="learnShade"></canvas><canvas id="learnFocus"></canvas><div id="learnSteps" data-test="learn-steps"></div><div id="learnSay" data-test="learn-say"></div><canvas id="learnHand" data-test="learn-hand"></canvas>';
document.body.append(learnUi);
const learnStyle = document.createElement('style');
learnStyle.textContent = `
#learnUi{position:fixed;inset:0;pointer-events:none;z-index:5}
#learnShade{position:absolute;inset:0;width:100%;height:100%}
#learnFocus{position:absolute;inset:0;width:100%;height:100%;z-index:2}
#learnSteps{position:absolute;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:5px 8px;border:2px solid;background:none;border-color:transparent;border-image:var(--notePaper);font-size:18px;font-weight:700;line-height:24px;white-space:nowrap}
#learnSteps .learnCount{font-size:16px;line-height:22px}
#learnSay{position:absolute;width:max-content;max-width:calc(100% - 16px);padding:5px 8px;border:2px solid;background:none;border-color:transparent;border-image:var(--notePaper);font-size:24px;font-weight:700;line-height:1.3;white-space:pre-line;word-break:keep-all}
@media(max-width:899px),(max-height:420px){#learnSay{font-size:18px}#learnSteps{font-size:16px;line-height:22px}}
body.learnCall #learnSay{width:380px;box-sizing:border-box}
@media(max-width:899px),(max-height:420px){#learnSteps{flex-direction:row;align-items:center;gap:12px}body.learnCall #learnSay{width:280px}}

#learnHand{position:absolute;image-rendering:pixelated}
body.learnIntro #lyricBa,body.learnIntro #lyricMe{z-index:6}
body.learnIntro.learnReceive #lyricMe{z-index:0}
body.learnIntro.learnCall #lyricBa{z-index:0}
body.learnIntro.learnRelease #lyricMe{z-index:0}
#topMsg[data-learn-msg],#fbMsg[data-learn-msg]{z-index:7}
`;
document.head.append(learnStyle);
const learnStepsEl = document.getElementById('learnSteps'), learnSayEl = document.getElementById('learnSay');
const learnHandEl = document.getElementById('learnHand'), learnShadeEl = document.getElementById('learnShade');
const learnFocusEl = document.getElementById('learnFocus');
document.body.append(learnFocusEl);
learnFocusEl.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:8';

function hideLearningUi() {
  learnUi.hidden = true;
  learnFocusEl.hidden = true;
  learnStepsEl.hidden = true;
  learnHandEl.hidden = true;
  document.body.classList.remove('learnIntro', 'learnReceive', 'learnCall', 'learnRelease');
}
function startLearning() {
  killSound(); resetRun(); state = 'practice';
  practiceOk = 0; practiceTries = 0; practiceHold = false;
  timing.playStart = timing.playStart || performance.now();
  learning = { step: 0, history: [], hasHold: !!(song.voice && song.practiceCall) && !song.twoHand, cycle: 0 }; // 두 손 곡은 꾹 단계가 없다
  learnStage(1);
}
function learnStage(step) {
  learnSayEl.style.maxWidth='';learnSayEl.style.whiteSpace='';learnSayEl.style.width='';
  const l = learning;
  if (step === 3 && !l.hasHold) step = 4;
  if (step === 4 && storyOn()) { storyLearned(l); return; } // 첫머리 이야기: 「됐다!」 뒤 노래 알기 네 장 → 본곡
  l.lessonLayout=null;l.handSlots=null;l.stepsPlace=null;l.sayPlace=null;
  document.body.classList.add('learnIntro');
  document.body.classList.toggle('learnCall',step===3);
  killSound(); bars = []; targets = []; queue = []; waitRec = null; waiting = false; charge = null;
  nextT = Infinity; msg = null; msgTop = null;
  l.step = step; l.intro = true; l.mode = step === 3 ? 'hold' : 'wait'; l.progress = Rules.learnProgress();
  l.index = 0; l.hop = null; l.extra = 0; l.cycle = 0; l.frozenF = performance.now() / 1000;
  l.call = null; l.response = null;
  l.reason = null; l.resultUntil = null; l.retryAt = null; l.demoReason = null; l.pendingDemoReason = null; l.readyAt = performance.now() / 1000; l.handPlace = null;
  const def = step === 3 ? song.practiceCall : song.practiceBar;
  l.rec = { t0: heardNow(), def, beat: barBeat(def), opts: {}, npcStrikes: [] };
  bars.push(l.rec);
  l.history.push({ step, intro: true, ms: Math.round(performance.now() - timing.playStart) });
  log('learn-stage', { step });
  if (step === 4) {
    save = { ...save, learned: true, practiced: { ...save.practiced, [song.id]: true } };
    window.GF.save(save); lastLearning = l.history;
  }
}
function learnSlices() {
  return Rules.learnSlices(song, voiceBuf[song.practiceBar.clip]?.duration ?? Infinity);
}
function learnWaitHit() {
  const l = learning, now = ctx.currentTime;
  if (l.hop) { showFeedback('아직이에요'); return; }
  // 두 손 곡 1단계 「둥 · 당」: 구슬이 기다리는 글자의 손으로 눌러야 넘어간다
  const want = song.twoHand && song.practiceBar.sides?.[l.index];
  if (want && pressSide !== want) { showFeedback(sideSay(want), 1.2); wantHandPad(want); log('learn-hand', { index: l.index, want, got: pressSide }); return; }
  if (msg?.learnReason) msg = null;
  l.intro = false;
  const def = song.practiceBar, slice = learnSlices()[l.index], beat = def.strikes[l.index];
  let played = false;
  if (song.voice) played = playVoice(def.clip, slice.from, slice.len, now, song.voice.gain, crowd, 1, 0, .01, .01);
  else {
    const note = def.baN.find(([b]) => b >= beat) || def.baN[0];
    if (note) chorusNote(now, Math.min(slice.len, .6), note[2]);
  }
  const tg = { t: heardNow(), rec: l.rec, beat, len: Math.min(l.rec.beat, 1.25), judged: false, part: '연습', d: 0 };
  targets.push(tg); applyJudge(tg, 0, 'perfect', now, performance.now() / 1000); noteFirst(true);
  const pressed = heardNow();
  l.hop = { from: l.index, to: l.index + 1, pressed, start: pressed + slice.len, end: pressed + Rules.learnWaitSeconds([slice]) };
  log('learn-syllable', { index: l.index, from: slice.from, len: slice.len, fade: .01, played });
}
function learnCycle(pressTime, pid, lead = .35) {
  const l = learning;
  killSound(); bars = []; targets = []; queue = []; nextT = Infinity; charge = null; msg = null; msgTop = null;
  l.intro = false; l.hop = null; l.extra = 0; l.cycle++;
  l.retryAt = null; l.demoReason = l.pendingDemoReason; l.pendingDemoReason = null;
  l.readyAt = performance.now() / 1000; l.handPlace = null;
  l.mode = l.step === 3 ? 'hold' : 'rhythm';
  let t = Math.max(ctx.currentTime + (l.step === 3 && pressTime !== undefined ? 0 : lead), pressTime === undefined ? 0 : pressTime - OFFSET);
  if (l.step === 3) { l.call = scheduleBar(song.practiceCall, t); t = barEnd(l.call); }
  l.response = scheduleBar(song.practiceBar, t); l.rec = l.response; t = barEnd(l.response);
  if (song.practiceRest) t = barEnd(scheduleBar(song.practiceRest, t));
  l.cycleEnd = t;
  if (l.step === 3 && pressTime !== undefined) startCharge(l.call.t0 + OFFSET, pid);
  log('learn-cycle', { step: l.step, cycle: l.cycle, help: Rules.learnHelp(l.progress, l.step) });
}
// 처음 배우기가 받은 입력은 본판 판정으로 두 번 보내지 않는다.
function learnPress(t, pid) {
  if (!learning || state !== 'practice' || paused) return false;
  if (ctx?.state !== 'running') ctx.resume();
  const l = learning;
  if (l.retryAt !== null || l.resultUntil !== null) return true;
  if (l.intro) {
    if (l.step === 1) learnWaitHit();
    else if (l.step === 2) learnCycle();
    else if (l.step === 3) learnCycle(t, pid);
    else {
      const kept = l;
      startSong(false); learning = kept; l.intro = false; l.mode = 'song'; l.fadeAt = null;
      l.history.push({ step: 4, intro: false, ms: Math.round(performance.now() - timing.playStart) });
    }
    return true;
  }
  if (l.mode === 'wait') { learnWaitHit(); return true; }
  return false;
}
function learnReleased(c, t) {
  const rec = c.rec;
  if (!rec?.def.call) return;
  const { tg, d } = nearestTarget(t - OFFSET);
  const first = targets.find(x => x.rec !== rec && x.rec.t0 >= barEnd(rec) - .01);
  const result = first && tg === first ? judgeTarget(first, d, true) : null;
  rec.holdRelease = result;
  rec.holdReleaseTime = t - OFFSET;
  if (!Rules.isHit(result)) rec.holdBroken = true;
  if (learning?.step === 3) {
    learning.release = result;
    if (!result && t - OFFSET >= barEnd(rec)) showFeedback('늦게 뗐어요');
  }
}
function learnFailure(l, results) {
  if (l.step === 2) {
    if (l.extra > 1) return '한 번씩 톡';
    const kinds = ['early', 'late', 'none', 'hand'];
    const most = kinds.reduce((a, b) => results.filter(t => t.res === b).length > results.filter(t => t.res === a).length ? b : a, 'none');
    return { early: '일찍 눌렀어요', late: '늦게 눌렀어요', none: '놓쳤어요', hand: '구슬 빛의 손으로 쳐요' }[most];
  }
  const r = l.call;
  if (!Number.isFinite(r.holdPress) || r.holdPress < r.t0 - .001 || r.holdPress >= r.t0 + r.beat) return '첫 박부터 꾹';
  if (Number.isFinite(r.holdReleaseTime) && r.holdReleaseTime < l.response.t0 && !r.holdRelease) return '끝까지 꾹';
  if (r.holdRelease === 'early') return '일찍 뗐어요';
  if (r.holdRelease === 'late' || r.holdReleaseTime >= l.response.t0) return '늦게 뗐어요';
  if (!Number.isFinite(r.holdReleaseTime) && !r.holdBroken && !r.spoiled) return '늦게 뗐어요';
  return '끝까지 꾹';
}
function updateLearning(vt) {
  const l = learning; if (!l) return;
  if (l.resultUntil !== null) {
    if (performance.now() / 1000 >= l.resultUntil) learnStage(l.step + 1);
    return;
  }
  if (l.retryAt !== null) {
    if(msg?.learnReason&&performance.now()/1000+1e-9>=msg.t0+msg.dur)msg=null;
    if (performance.now() / 1000 + 1e-9 < l.retryAt) return;
    if (Rules.learnHelp(l.progress, l.step) === 'wait') learnWaitRetry(vt);
    else learnCycle(undefined, undefined, 0);
    return;
  }
  if (l.intro) {
    if (BOT !== null && performance.now() / 1000 - l.frozenF > .7) { if (song.twoHand) pressSide = song.practiceBar.sides?.[l.index] || 'R'; pressAt(vt); }
    return;
  }
  if (l.mode === 'wait') {
    if (l.hop && vt >= l.hop.end) {
      l.index = l.hop.to; l.hop = null;
      l.readyAt = performance.now() / 1000;
      if (l.index >= song.practiceBar.strikes.length) {
        l.history.push({ step: l.step, mode: 'wait', ms: Math.round(performance.now() - timing.playStart) });
        if (l.step === 1) learnStage(2);
        else { l.progress = Rules.learnRetry(l.progress); l.index = 0; learnCycle(); }
        return;
      }
    }
    if (BOT !== null && !l.hop) { pressSide = song.practiceBar.sides?.[l.index] || pressSide; learnWaitHit(); }
    return;
  }
  if (l.step === 4) {
    if (l.fadeAt === null) { const r = bars.find(r => !r.def.call && r.def.strikes.length); if (r) l.fadeAt = barEnd(r); }
    if (l.fadeAt !== null && vt >= l.fadeAt + .4) { lastLearning = l.history; learning = null; }
    return;
  }
  if (vt < l.cycleEnd || targets.some(t => !t.judged)) return;
  const results = targets.filter(t => t.rec === l.response);
  const passed = l.step === 2 ? Rules.learnBarPassed(results, l.extra) : Rules.learnHoldPassed({ press: l.call.holdPress, start: l.call.t0, beat: l.call.beat, broken: l.call.holdBroken || l.call.spoiled, release: l.call.holdRelease });
  l.progress = Rules.learnAttempt(l.progress, passed);
  if (passed) { l.beadAt = performance.now() / 1000; l.pendingDemoReason = null; l.demoReason = null; }
  else {
    l.reason = learnFailure(l, results);
    const f = performance.now() / 1000;
    if (msg?.learnReason && msg.text === l.reason && f < msg.t0 + msg.dur) msg.dur = f + 1.2 - msg.t0;
    else showFeedback(l.reason, 1.2);
    msg.learnReason = true;
    l.pendingDemoReason = l.reason;
  }
  l.history.push({ step: l.step, cycle: l.cycle, passed, extra: l.extra, ...l.progress, ms: Math.round(performance.now() - timing.playStart) });
  log('learn-attempt', { step: l.step, passed, ...l.progress });
  if (l.progress.ok >= 2) {
    l.resultUntil = performance.now() / 1000 + .7;
    l.resultF = (netOn()?net.hitT:boatOn()?boat.hitT:hero.swingF)+.08;
    l.resultVt = results.at(-1).t+.08;
    return;
  }
  if (!passed) { killSound(); charge = null; l.retryAt = performance.now() / 1000 + 1.55; return; }
  learnCycle(undefined, undefined, l.step === 3 ? 0 : .35);
}
function learnWaitRetry(vt) {
    const l = learning;
    killSound(); bars = []; targets = []; charge = null; msgTop = null;
    msg = null; l.retryAt = null;
    l.mode = 'wait'; l.index = 0; l.hop = null;
    l.readyAt = performance.now() / 1000; l.handPlace = null;
    l.rec = { t0: vt, def: song.practiceBar, beat: barBeat(song.practiceBar), opts: {}, npcStrikes: [] }; bars.push(l.rec);
    if (l.step === 2) showFeedback('따라 하기', Infinity);
    log('learn-wait', { step: l.step });
}
function learnVisualTime() {
  const l = learning;
  if(l?.resultUntil!==null&&l?.resultUntil!==undefined)return l.resultVt;
  if (l?.retryAt !== null && l?.retryAt !== undefined) return l.response.t0 + barSpan(l.response.def) - .001;
  if (!l || (!l.intro && l.mode !== 'wait')) return heardNow();
  const d = l.rec.def;
  return l.rec.t0 + (d.call ? 0 : (d.strikes[l.index] || 0) * l.rec.beat);
}
function learnBeatDemo() {
  const d = song.practiceBar, beat = barBeat(d), times = d.strikes.slice(0, 2).map(b => (b - d.strikes[0]) * beat);
  const span = times[1] || beat, phase = (performance.now() / 1000 - learning.frozenF + 1e-9) % (span * 2);
  return { phase, span, times, index: phase >= span ? 1 : 0 };
}
function learnLyric() {
  const l = learning, d = l.rec.def;
  if (d.call) return { who: 'me', text: d.lyric || d.me, p: 0 };
  const syl = d.syl || d.strikes, text = d.lyric || d.baText || song.answer || '옹헤야';
  const index = l.intro && l.step === 2 ? learnBeatDemo().index : l.index;
  return { who: 'ba', text, p: 0, marks: syl.map(s => d.strikes.includes(s)), sung: l.hop ? syl.indexOf(d.strikes[index]) + 1 : syl.indexOf(d.strikes[index]), syl, rec: l.rec };
}
function placeLearnBall() {
  const l = learning, d = song.practiceBar, syl = d.syl || d.strikes;
  const idx = n => Math.max(0, syl.indexOf(d.strikes[Math.min(n, d.strikes.length - 1)]));
  let x = elLyBa.xs[idx(l.index)], hop = 0;
  if (l.intro && l.step === 3) {
    const phase = (performance.now() / 1000 - l.frozenF + 1e-9) % 2.4;
    const k = clamp01((phase - 1.6) / .4), fs = elLyBa.fs;
    const room = Math.max(6, elLyBa.topPx - elLyBa.h - elLyBa.ball - 2);
    x -= fs * 1.2 * (1 - k);
    if (!RM) hop = Math.min(room, fs * .9) * 4 * k * (1 - k);
  }
  if (l.intro && l.step === 2) {
    const demo = learnBeatDemo(), k = (demo.phase % demo.span) / demo.span;
    const from = idx(demo.index), to = idx(1 - demo.index);
    x = elLyBa.xs[from] + (elLyBa.xs[to] - elLyBa.xs[from]) * k;
    if (!RM) hop = elLyBa.fs * .8 * 4 * k * (1 - k);
  }
  if (l.hop && heardNow() >= l.hop.start) {
    const k = clamp01((heardNow() - l.hop.start) / .4);
    x += (elLyBa.xs[idx(l.hop.to)] - x) * k;
    if (!RM && l.hop.to < d.strikes.length) hop = elLyBa.fs * .8 * 4 * k * (1 - k);
  }
  elBall.hidden = false;
  const side = song.twoHand ? d.sides?.[Math.min(l.hop && heardNow() >= l.hop.start ? l.hop.to : l.index, d.strikes.length - 1)] || '' : ''; // 두 손 곡: 기다리는 자리의 손 빛
  if (elBall.dataset.side !== side) elBall.dataset.side = side;
  elBall.style.transform = `translate(${Math.round((x - elLyBa.ball / 2) * DPR) / DPR}px,${Math.round((-elLyBa.ball * .7 - hop) * DPR) / DPR}px)`;
  [...elLyBa.firstElementChild.children].forEach((e, i) => e.classList.toggle('next', i === idx(l.intro && l.step === 2 ? learnBeatDemo().index : l.index)));
}

function learnReceiveCue() {
  const d = song.practiceBar, syl = d.syl || d.strikes;
  return { who: 'ba', text: d.lyric || d.baText || song.answer, p: 0, marks: syl.map(s => d.strikes.includes(s)), sung: 0, syl };
}

function learnStepLabels(l){
  const ids=l.hasHold?[1,2,3,4]:[1,2,4],sig=`${song?.id}|${ids}|${l.step}|${l.progress.ok}|${DPR}`;
  if(learnStepsEl.dataset.key===sig)return;
  learnStepsEl.dataset.key=sig;
  learnStepsEl.innerHTML=`<span class="learnStage" data-step="${l.step}">${ids.length}단계 중 ${ids.indexOf(l.step)+1} · ${learnNameFor(l.step)}</span>${l.step===2||l.step===3?`<span class="learnCount" data-test="learn-count">맞힌 마디 ${l.progress.ok}/2</span>`:''}`;
}

function learnLessonLyrics(cue) {
  const l=learning,hidden=elLyBa.hidden,meHidden=elLyMe.hidden;
  if((H<=420)){
    elLyBa.style.fontSize='20px';elLyBa.dataset.key='';
    placeLyric(elLyBa,cue||learnReceiveCue(),HERO.x+HERO.bx,HERO.y-37-RING_HEADROOM);
  }
  if(hidden)placeLyric(elLyBa,learnReceiveCue(),HERO.x+HERO.bx,HERO.y-37-RING_HEADROOM);
  if(meHidden&&l.step===3)placeLyric(elLyMe,{who:'me',text:song.practiceCall.lyric||song.practiceCall.me,p:0},LEAD.x+LEAD.bx,leadBubbleY());

  let other=!elLyMe.hidden?[{...learnRect(elLyMe),h:learnRect(elLyMe).h+Math.max(0,.544*parseFloat(getComputedStyle(elLyMe).fontSize)-1.59)}]:[];
  const key=`${W}|${H}|${DPR}|${song.id}|${K}|${vx}|${vy}|${l.step}|${l.cycle}|${l.intro}|${l.mode}`;
  if(l.lessonLayout?.key!==key){
    const natural=learnRect(elLyBa),bodies=learnBodies(),motion=learnPeopleMotion(bodies),geom=boatOn()?boat.geometry:netOn()?net.geometry:null;
    // 첫 안내에서는 인물이 멈춘 자세다. 손과 설명은 지금 보이는 몸을 피하고, 노랫말과 구슬 길은 기존의 전체 동작 여유를 유지한다.
    const handMotion=l.intro?{faces:learnFaces(bodies),ink:bodies.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,gap:0}))}:motion;
    const protectedRects=(geom?.protectedRects||[]).map(r=>({x:toCssX(r.x),y:toCssY(r.y),w:r.w*K/DPR,h:r.h*K/DPR}));
    const cornerKey=`${W}|${H}|${DPR}|${song.id}|${l.step}`;
    if(l.layoutCorners?.key!==cornerKey){
      const frame=window.frameElement?.getBoundingClientRect();
      const rects=frame?[...window.parent.document.querySelectorAll('[data-test="exit-x"],[data-test="sound"]')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x-frame.x,y:r.y-frame.y,w:r.width,h:r.height};}).filter(r=>r.w&&r.h):[];
      l.layoutCorners={key:cornerKey,rects};
    }
    const corners=l.layoutCorners.rects;
    const scale=K/DPR,hold=l.step===3,ink=learnOpaque(learnHandArt(hold));
    const lift=hold?0:8;
    const handW=(ink.right-ink.left)*scale,handH=(ink.bottom-ink.top)*scale;
    const tapRoom=hold?null:learnMotionViews().reduce((room,{dot})=>{const rows=Math.ceil(((H<=420)?40:110)/dot),im=SPRITES['finger-waiting'];return{w:Math.max(room.w,Math.round(im.width*rows/im.height)*dot),h:Math.max(room.h,rows*dot)};},{w:handW,h:handH});
    // 배율이 바뀌어도 같은 자리 안에서 손과 떼기 동작이 모두 들어간다.
    const size={w:hold?((H<=420)?84:176):tapRoom.w,h:(hold?((H<=420)?84:160):tapRoom.h)+lift};
    const shown=ink,tip={x:(shown.tipX-shown.left)*scale,y:scale/2+(hold?0:8)};
    const fs=elLyBa.fs,ball=elLyBa.ball,d=song.practiceBar,syl=d.syl||d.strikes,style=getComputedStyle(elLyBa),bx=parseFloat(style.borderLeftWidth),by=parseFloat(style.borderTopWidth);
    const ringLarge=(H>420)&&ringOn(),strikes=ringLarge&&l.intro&&l.step===2?d.strikes.slice(0,2):d.strikes;
    if(ringLarge)for(const key of ['faces','ink'])motion[key]=[...new Map(motion[key].map(r=>[[r.x,r.y,r.w,r.h,r.gap??12].join('|'),r])).values()];
    const handStrikes=hold||l.intro&&(l.step===1||l.step===4)?d.strikes.slice(0,1):l.intro&&l.step===2?d.strikes.slice(0,2):strikes;
    const xs=handStrikes.map(b=>bx+elLyBa.xs[Math.max(0,syl.indexOf(b))]);
    const tail=Math.max(0,.544*fs-1.59),pad=Math.max(ball,fs)*1.2;
    const maxHop=fs*(l.intro&&l.step===2?.8:Math.max(.9,...d.strikes.slice(1).map((b,i)=>.5+.35*(b-d.strikes[i]))));
    const allXs=strikes.map(b=>elLyBa.xs[Math.max(0,syl.indexOf(b))]),lead=l.intro&&l.step===2?0:fs*1.2;
    const joint=true;
    let uiSize=null;
    if(joint){
      learnUi.hidden=false;
      learnStepsEl.hidden=false;learnStepLabels(l);
      const hidden=learnSayEl.hidden;learnSayEl.hidden=false;
      learnSayEl.style.width=l.step===2&&(W<900||H<=420)?(('280px')):'';
      setText(learnSayEl,hold?learnHoldSay():learnSayFor(l.step));
      uiSize={steps:{w:learnStepsEl.offsetWidth,h:learnStepsEl.offsetHeight},say:l.intro?{w:learnSayEl.offsetWidth,h:learnSayEl.offsetHeight}:null};
      learnSayEl.hidden=hidden;
    }
    // 세로 폰은 위 모서리 사이에 단계 이름, 그 아래에 설명과 손, 마지막 줄에 두 노랫말을 둔다.
    // 보이는 인물과 구슬 길을 한 번에 검사해 맞으면 이 묶음을 그대로 쓴다.


    {
    const uiBoxes=(size,blocks,prefer,max=1)=>{
      blocks=[...new Map(blocks.filter(b=>b.x+b.w+(b.gap??12)>=9&&b.x-(b.gap??12)<=W-9&&b.y+b.h+(b.gap??12)>=9&&b.y-(b.gap??12)<=H-9).map(b=>[[b.x,b.y,b.w,b.h,b.gap??12].join('|'),b])).values()];
      const {w,h}=size,snap=v=>Math.ceil(v*DPR)/DPR;
      const xs=[prefer.x,9,W-w-9,...blocks.flatMap(b=>[Math.floor((b.x-w-(b.gap??12))*DPR)/DPR,snap(b.x+b.w+(b.gap??12))])];
      const ys=[prefer.y,9,H-h-9,...blocks.flatMap(b=>[Math.floor((b.y-h-(b.gap??12))*DPR)/DPR,snap(b.y+b.h+(b.gap??12))])];
      const candidates=[],found=[],uniqueX=[...new Set(xs)],uniqueY=[...new Set(ys)];
      for(const x of uniqueX)for(const y of uniqueY)if(x>=9&&y>=9&&x+w<=W-9&&y+h<=H-9)candidates.push({rect:{x,y,w,h},cost:(x-prefer.x)**2+(y-prefer.y)**2});
      candidates.sort((a,b)=>a.cost-b.cost);
      for(const {rect:r} of candidates)if(blocks.every(b=>learnGap(r,b)>=(b.gap??12)-1e-7)){found.push(r);if(found.length>=max)break;}
      return found;
    };
    let limit=(H<=420)?90:hold?120:240;
    const choose=r=>{
      if(ringLarge)r={...r,x:Math.round(r.x*64)/64,y:Math.round(r.y*64)/64};
      const envelope=({...r,h:r.h+tail});
      if(envelope.x<9||envelope.y<9||envelope.x+envelope.w>W-9||envelope.y+envelope.h>H-9||motion.faces.concat(corners).some(b=>learnGap(envelope,b)<12+1/DPR)||other.some(b=>learnGap(envelope,b)<12+1/DPR))return null;
      const path={x:r.x+bx+Math.min(...allXs)-ball/2-lead-1/DPR,y:r.y+by-ball*.7-maxHop-1/DPR,w:Math.max(...allXs)-Math.min(...allXs)+ball+lead+2/DPR,h:maxHop+ball+2/DPR,gap:12};
      if(path.x<9||path.y<9||path.x+path.w>W-9||motion.faces.some(b=>learnGap(path,b)<12))return null;
      const tailBox={x:r.x+r.w/2-fs*.3,y:r.y+r.h,w:fs*.6,h:tail};
      const blocks=handMotion.faces.concat(handMotion.ink,protectedRects,corners,other,[r,tailBox,path]);
      const slots=[],distances=[],slotChoices=[];
      for(const xOffset of xs){
        const anchor=ringLarge?{x:r.x+bx+Math.round((xOffset-bx-ball/2)*DPR)/DPR+ball/2,y:r.y+by+Math.round(-ball*.7*DPR)/DPR+ball/2}:{x:r.x+xOffset,y:r.y+by-ball*.2};
        const near=hold?{x:r.x-limit-size.w,y:r.y-limit-size.h,w:r.w+limit*2+size.w*2,h:r.h+limit*2+size.h*2}:{x:anchor.x-limit-tip.x,y:anchor.y-limit-tip.y,w:limit*2+size.w,h:limit*2+size.h};
        const nearby=blocks.filter(b=>learnGap(near,b)<13);
        const safety=ringLarge?1/64:1/DPR,gap=ringLarge?12:13;
        const xx=[anchor.x-tip.x,r.x-size.w-gap,r.x+r.w+gap,9,W-size.w-9,...(uiSize?.say?[9+uiSize.say.w+16,W-uiSize.say.w-size.w-25]:[]),...nearby.flatMap(b=>[b.x-size.w-(b.gap??12)-safety,b.x+b.w+(b.gap??12)+safety])];
        const yy=[anchor.y-tip.y,r.y+r.h+gap,path.y-size.h-gap,9,H-size.h-9,...nearby.flatMap(b=>[b.y-size.h-(b.gap??12)-safety,b.y+b.h+(b.gap??12)+safety])];
        const snap=v=>[Math.floor(v*DPR)/DPR,Math.ceil(v*DPR)/DPR];
        const align=v=>ringLarge?Math.round(v*64)/64:v;
        const positionsX=[...new Set(xx.flatMap(snap).map(align))].filter(x=>x>=9&&x+size.w<=W-9&&(hold?Math.max(r.x-x-size.w,x-r.x-r.w,0):Math.abs(x+tip.x-anchor.x))<=limit);
        const positionsY=[...new Set(yy.flatMap(snap).map(align))].filter(y=>y>=9&&y+size.h<=H-9&&(hold?Math.max(r.y-y-size.h,y-r.y-r.h,0):Math.abs(y+tip.y-anchor.y))<=limit);
        const holdDistance=(x,y)=>Math.hypot(Math.max(r.x-x-handW,x-r.x-r.w,0),Math.max(r.y-y-handH,y+lift-r.y-r.h,0));
        let best=null,cost=Infinity;const choices=[];
        for(const x of positionsX)for(const y of positionsY){const p={x,y,...size},distance=hold?holdDistance(x,y):Math.hypot(x+tip.x-anchor.x,y+tip.y-anchor.y);if(distance>limit||!hold&&Math.hypot(Math.max(x-anchor.x,anchor.x-x-size.w,0),Math.max(y-anchor.y,anchor.y-y-size.h,0))>((H<=420)?90:120)-1/DPR||nearby.some(b=>learnGap(p,b)<(b.gap??12)+safety-1e-7))continue;choices.push({rect:p,distance});if(distance<cost){best=p;cost=distance;}}
        if(!best)return null;slots.push(best);distances.push(cost);slotChoices.push(choices.sort((a,b)=>a.distance-b.distance));
      }
      if(joint){
        // 단계표는 모든 배율의 몸통 대신 얼굴과 손을 피한다. 안내 글은 현재 몸도 피한다.
        const blocks=handMotion.faces.map(b=>({...b,gap:12})).concat(protectedRects,corners,other,[envelope,path],slots.map(b=>({...b,gap:12})));
        if(uiSize.say){
          for(const pick of slotChoices[0]){
          const a=pick.rect,sw=uiSize.steps.w,sh=uiSize.steps.h,tw=uiSize.say.w,th=uiSize.say.h,width=Math.max(sw,tw),height=sh+10+th;
          const selected=[a,...slots.slice(1)],blocks=handMotion.faces.map(b=>({...b,gap:12})).concat(protectedRects,corners,other,[envelope,path],selected.map(b=>({...b,gap:12})));
          const places=[
            {x:a.x-width-16,y:a.y+a.h/2-height/2},
            {x:a.x+a.w+16,y:a.y+a.h/2-height/2},
            {x:a.x-width-16,y:Math.max(9,...corners.map(c=>c.y+c.h+12))},
            {x:a.x+a.w+16,y:Math.max(9,...corners.map(c=>c.y+c.h+12))},
            {x:Math.max(9,Math.min(W-width-9,a.x+a.w/2-width/2)),y:a.y-height-16},
            {x:Math.max(9,Math.min(W-width-9,a.x+a.w/2-width/2)),y:a.y+a.h+16},
          ];
          places.push({x:a.x-width-16,y:a.y+(a.h-th)/2-sh-10},{x:a.x+a.w+16,y:a.y+(a.h-th)/2-sh-10});
          for(const p of places)for(const sx of new Set([p.x,(W-sw)/2,...corners.flatMap(c=>[c.x+c.w+12,c.x-sw-12])])){
            const step={x:Math.round(sx),y:Math.round(p.y),w:sw,h:sh},say={x:Math.round(p.x),y:Math.round(p.y)+sh+10,w:tw,h:th};
            const safe=b=>b.x>=9&&b.y>=9&&b.x+b.w<=W-9&&b.y+b.h<=H-9&&blocks.every(o=>learnGap(b,o)>=(o.gap??12)-1e-7);
            const gap=learnGap(a,say);
            if(safe(step)&&safe(say)&&gap>=12&&gap<=24&&learnGap(step,say)>=8&&learnGap(step,say)<=12){
              const matched=[a];
              for(const choices of slotChoices.slice(1)){
                const match=choices.find(p=>learnGap(p.rect,say)>=12&&learnGap(p.rect,say)<=24&&learnGap(p.rect,step)>=12);
                if(!match)break;matched.push(match.rect);
              }
              if(matched.length===slots.length)return{rect:r,slots:matched,path,envelope,steps:step,say,...(ringLarge?{maxDistance:Math.max(pick.distance,...distances.slice(1))}:{})};
            }
          }
          // 낮은 화면에서 이름을 위에 쌓을 곳이 없으면 설명 바로 아래나 옆을 먼저 살핀다.
          const scene=handMotion.faces.map(b=>({...b,gap:12})).concat(protectedRects,corners,other,[envelope,path],{...a,gap:12});
          const clear=b=>b.x>=9&&b.y>=9&&b.x+b.w<=W-9&&b.y+b.h<=H-9&&scene.every(o=>learnGap(b,o)>=(o.gap??12)-1e-7);
          const distance=(p,q)=>Math.hypot(Math.max(p.x-q.x-q.w,q.x-p.x-p.w,0),Math.max(p.y-q.y-q.h,q.y-p.y-p.h,0));
          const textXs=[a.x-tw-16,a.x+a.w+16,Math.max(9,Math.min(W-tw-9,a.x+(a.w-tw)/2)),9,W-tw-9];
          const textYs=[a.y+(a.h-th)/2,a.y-th-16,a.y+a.h+16];
          for(const x of textXs)for(const y of textYs){
            const say={x:Math.round(x*DPR)/DPR,y:Math.round(y*DPR)/DPR,w:tw,h:th};
            if(!clear(say)||learnGap(say,a)<12||distance(say,a)>24)continue;
            const stepXs=[say.x,(W-sw)/2,...corners.flatMap(c=>[c.x+c.w+12,c.x-sw-12])];
            const titles=stepXs.flatMap(x=>[{x,y:say.y-sh-10,w:sw,h:sh},{x,y:say.y+th+10,w:sw,h:sh}]).concat([{x:say.x-sw-10,y:say.y,w:sw,h:sh},{x:say.x+tw+10,y:say.y,w:sw,h:sh}]);
            for(const step of titles){
              if(!clear(step)||learnGap(step,say)<8||distance(step,say)>12)continue;
              const matched=[a];
              for(const choices of slotChoices.slice(1)){const match=choices.find(p=>learnGap(p.rect,say)>=12&&distance(p.rect,say)<=24&&learnGap(p.rect,step)>=12);if(!match)break;matched.push(match.rect);}
              if(matched.length===slots.length)return{rect:r,slots:matched,path,envelope,steps:step,say,...(ringLarge?{maxDistance:Math.max(pick.distance,...distances.slice(1))}:{})};
            }
          }
          }
          return null;
        }
        const steps=uiBoxes(uiSize.steps,blocks,{x:(W-uiSize.steps.w)/2,y:9},20);
        for(const step of steps){
          const say=uiSize.say?uiBoxes(uiSize.say,blocks.concat(bodies.map(b=>({...b,gap:9})),step),{x:9,y:H-uiSize.say.h-9})[0]:null;
          if(!uiSize.say||say)return{rect:r,slots,path,envelope,steps:step,say,...(ringLarge?{maxDistance:Math.max(...distances)}:{})};
        }
        return null;
      }
      return{rect:r,slots,path,envelope};
    };
    const candidates=[natural];
    const xValues=[natural.x,Math.max(9+pad,Math.min(W-natural.w-pad-9,natural.x)),W/2-natural.w/2,9+pad,W-natural.w-pad-9];
    const top=(H>420)&&ringOn()?[Math.ceil((9-by+ball*.7+maxHop+1/DPR)*DPR)/DPR]:[];
    const yValues=[natural.y,...top,...motion.faces.map(b=>Math.floor((b.y-natural.h-tail-13)*DPR)/DPR),...Array.from({length:Math.ceil(H/16)},(_,i)=>9+i*16)].filter(y=>y+natural.h+tail<=H-9);
    for(const x of xValues)for(const y of yValues)candidates.push({...natural,x:Math.ceil(x*DPR)/DPR,y:Math.ceil(y*DPR)/DPR});
    candidates.sort((a,b)=>Math.hypot(a.x-natural.x,a.y-natural.y)-Math.hypot(b.x-natural.x,b.y-natural.y));
    let found=null;
    for(const r of candidates){found=choose(r);if(found)break;}
    if(!found&&ringLarge){
      const search=()=>{
        for(const y of yValues)for(let x=9;x+natural.w<=W-9;x+=8){const pick=choose({...natural,x,y:Math.ceil(y*DPR)/DPR});if(pick)return pick;}
        return null;
      };
      found=search();
    }
    if(!found&&joint&&!ringLarge){
      outer:for(const y of yValues)for(let x=9;x+natural.w<=W-9;x+=16){found=choose({...natural,x,y:Math.ceil(y*DPR)/DPR});if(found)break outer;}
      if(!found){
        limit=120;
        for(const r of candidates){found=choose(r);if(found)break;}
        if(!found)outer:for(const y of yValues)for(let x=9;x+natural.w<=W-9;x+=8){found=choose({...natural,x,y:Math.ceil(y*DPR)/DPR});if(found)break outer;}
      }
    }
    let callRect=null;
    if(!found&&joint&&hold&&other.length){
      const original=other[0],places=[];
      for(const y of [H-original.h-10,9,73,105,137,169,201])for(const x of [9,W-original.w-9,(W-original.w)/2])places.push({...original,x,y});
      limit=90;
      for(const max of hold?[(H<=420)?90:120]:[120,160,200]){
        limit=max;
        for(const me of places){
          if(me.y<9||me.y+me.h>H-9||motion.faces.concat(corners).some(b=>learnGap(me,b)<12+1/DPR))continue;
          other=[me];
          outer:for(const y of yValues)for(let x=9;x+natural.w<=W-9;x+=8){found=choose({...natural,x,y:Math.ceil(y*DPR)/DPR});if(found)break outer;}
          if(found){callRect=me;break;}
        }
        if(found)break;
      }
      if(!found)other=[original];
    }
    l.lessonLayout={key,callRect,...(found||{rect:natural,slots:null})};
    }
  }
  const layout=l.lessonLayout,r=layout.rect;
  elLyBa.leftPx=r.x+r.w/2;elLyBa.topPx=r.y+r.h;elLyBa.style.left=elLyBa.leftPx+'px';elLyBa.style.top=elLyBa.topPx+'px';
  if(layout.callRect){
    const me=layout.callRect,tail=Math.max(0,.544*parseFloat(getComputedStyle(elLyMe).fontSize)-1.59);
    me.x=Math.max(9+1/DPR,Math.min(W-me.w-9-1/DPR,me.x));
    elLyMe.leftPx=me.x+me.w*.22;elLyMe.topPx=me.y+me.h-tail;elLyMe.style.left=elLyMe.leftPx+'px';elLyMe.style.top=elLyMe.topPx+'px';other=[me];
  }
  if(layout.slots){l.handSlots=layout.slots;}
  else l.handSlots=null;
  elLyBa.hidden=hidden;
  elLyMe.hidden=meHidden;
}





// 메기는 마디가 이어지는 곡(풍구 · 신고산)의 한 묶음. r에서 거슬러 오르며 이어 하기 앞 장구는 건너뛰고, 다시 부른 옛 마디는 한 번만
function callGroup(r) {
  const out = [r], seen = new Set([r.def.i]);
  for (let j = bars.indexOf(r) - 1; j >= 0; j--) { const b = bars[j]; if (b.def.countIn) continue; if (!b.def.call) break; if (!seen.has(b.def.i)) { seen.add(b.def.i); out.unshift(b); } }
  return out;
}
function resetSongHelp() { songHelp = { callFails: 0, baLow: 0, callPending: false, baPending: false, callUsed: false, baUsed: false }; }
function updateSongHelp(vt) {
  if (!song.voice || hardRun || !songHelp) return;
  // 먼저 끝난 마디를 센 뒤 새 마디에 도움을 붙인다. 메김 실패는 첫 받는 자리의 떼기까지 본다.
  for (const r of bars) {
    if (r.helpCounted || r.def.rest || r.def.intro || r.def.countIn) continue;
    if (r.def.call && r.def.noHold) { r.helpCounted = true; continue; } // 두 손 곡 메김은 듣기만 한다(꾹 도움 없음)
    if (r.def.call) {
      if (vt < barEnd(r) + Math.min(r.beat, 1.25) * .45) continue;
      r.helpCounted = true;
      if (songBars[r.def.i + 1]?.call) continue; // 이어지는 메김은 마지막 줄에서 묶음째 한 번만 센다(떼기는 거기서 한다)
      const grp = callGroup(r);
      if (grp.some(g => g.helpHold)) { songHelp.callFails = 0; songHelp.callUsed = false; songHelp.callPending = false; continue; }
      if (grp.every(g => g.holdPress === undefined) || grp.some(g => g.holdBroken || g.spoiled) || !Rules.isHit(r.holdRelease)) songHelp.callFails++;
      if (songHelp.callFails >= 2 && !songHelp.callUsed) songHelp.callPending = true;
    } else if (r.def.strikes.length && vt >= barEnd(r)) {
      const ts = targets.filter(t => t.rec === r); if (ts.some(t => !t.judged)) continue;
      r.helpCounted = true;
      if (r.helpTap) { songHelp.baLow = 0; songHelp.baUsed = false; songHelp.baPending = false; continue; }
      songHelp.baLow = ts.filter(t => Rules.isHit(t.res)).length <= 1 ? songHelp.baLow + 1 : 0;
      if (songHelp.baLow >= 2 && !songHelp.baUsed) songHelp.baPending = true;
    }
  }
  const r = currentRec(vt); if (!r || r.def.rest || r.def.intro) return;
  if (r.def.call && !r.helpHold && callGroup(r).some(g => g.helpHold)) r.helpHold = true; // 묶음의 첫 줄에 붙은 손가락 도움은 끝줄까지
  if (r.def.call && songHelp.callPending) { r.helpHold = true; songHelp.callPending = false; songHelp.callUsed = true; log('finger-help', { kind: 'hold', i: r.def.i }); }
  if (isBa(r) && songHelp.baPending) { r.helpTap = true; songHelp.baPending = false; songHelp.baUsed = true; log('finger-help', { kind: 'tap', i: r.def.i }); }
}
function activeSongHelp() {
  if (!ctx || state !== 'song' || hardRun) return null;
  const vt = heardNow(), r = currentRec(vt), prev = r && bars[bars.indexOf(r) - 1];
  if (r?.helpHold || (prev?.helpHold && isBa(r) && vt < r.t0 + Math.max(0, OFFSET) + .4)) return { hold: true, rec: r.helpHold ? r : prev, opacity: .6 };
  return r?.helpTap ? { hold: false, rec: r, opacity: .6 } : null;
}

// 몸 전체에서 떨어진 빈 자리에 두면 얼굴과 두 손에도 틈이 남는다.
const learnRect = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
// 처음 배우기 해 보기(1~3단계, 멈춘 안내 말고): 손은 안내 묶음에 넣지 않고 그때 뜬 말풍선 옆에 둔다(2026-11-27 대표)
function learnHandBeside(){return !!learning&&!learning.intro&&learning.step<4&&H>420;} // 낮은 가로(높이 420 이하)는 말풍선 곁에 빈자리가 없어 예전처럼 위 띠 안
const learnGap = (a, b) => Math.max(b.x - a.x - a.w, a.x - b.x - b.w, b.y - a.y - a.h, a.y - b.y - b.h);
const learnBounds = new WeakMap();
const learnHandFrames = new Map();
function learnHandArt(hold) {
  const im=cueHandImage('waiting');if(!im)return null;
  const dot=K/DPR,small=(H<=420),size=hold?Math.floor((small?84:176)/dot):0,height=hold?Math.floor((small?84:160)/dot):0,key=`${im.height}|${size}|${height}`;
  if(learnHandFrames.has(key))return learnHandFrames.get(key);
  const c=document.createElement('canvas');c.width=size||im.width;c.height=height||im.height;
  c.getContext('2d').drawImage(im,Math.round((c.width-im.width)/2),Math.round((c.height-im.height)/2));
  learnBounds.set(c,{left:0,top:0,right:c.width,bottom:c.height,tipX:c.width/2});
  learnHandFrames.set(key,c);return c;
}
let learnDrawBodies = null;
function learnRecordBody(pose, x, y, dir = 1) {
  if (!/^(hero-|leader-|follower-|ring-[abc]-|spectator|kid-|dancer|puller-|rower-)/.test(pose)) return;
  learnDrawBodies.push({ name: pose.startsWith('hero-') ? 'hero' : pose.startsWith('leader-') ? 'leader' : pose, pose, x, y, dir });
}
function learnOpaque(im) {
  if (learnBounds.has(im)) return learnBounds.get(im);
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const pixels = x.getImageData(0, 0, c.width, c.height).data;
  let left = c.width, top = c.height, right = 0, bottom = 0;
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (pixels[(y * c.width + xx) * 4 + 3]) { left = Math.min(left, xx); top = Math.min(top, y); right = Math.max(right, xx + 1); bottom = Math.max(bottom, y + 1); }
  const tips=[];
  for(let x=left;x<right;x++)if(pixels[(top*c.width+x)*4+3])tips.push(x+.5);
  const r = { left, top, right, bottom, tipX:(Math.min(...tips)+Math.max(...tips))/2 }; learnBounds.set(im, r); return r;
}
function learnBodies() {
  const geom = boatOn() ? boat.geometry : netOn() ? net.geometry : null;
  const people = geom?.bodies?.length ? geom.bodies : learnDrawBodies || [];
  return people.map(p => {
    const im = SPRITES[p.pose], m = META[p.pose]; if (!im || !m) return null;
    const r = learnOpaque(im), dot = K / DPR, flip = p.dir === -1;
    const drawX = toCssX(Math.round(p.x - vx - (flip ? im.width - m.foot[0] : m.foot[0])) + vx), drawY = toCssY(Math.round(p.y - vy - m.foot[1]) + vy);
    return { name: p.name, pose: p.pose, dir: p.dir || 1, drawX, drawY, drawW: im.width * dot, drawH: im.height * dot, x: drawX + (flip ? im.width - r.right : r.left) * dot, y: drawY + r.top * dot, w: (r.right - r.left) * dot, h: (r.bottom - r.top) * dot };
  }).filter(Boolean);
}
function learnFaces(bodies) {
  const dot = K / DPR;
  return bodies.flatMap(b => {
    const m = META[b.pose], mouth = m.mouth || [26, 44], face = m.face || (netOn() ? [mouth[0]-16,mouth[1]-20,36,25] : [mouth[0] - 12, mouth[1] - 14, 28, 18]);
    const local = [face, ...['handL', 'handR', 'handA', 'handB'].filter(k => m[k]).map(k => [m[k][0] - 3, m[k][1] - 3, 7, 7])];
    return local.map(([x, y, w, h]) => ({ x: b.drawX + (b.dir === -1 ? b.drawW / dot - x - w : x) * dot, y: b.drawY + y * dot, w: w * dot, h: h * dot, name: b.name }));
  });
}
function learnMotionViews() {
  const views=[{dot:K/DPR,x:vx,y:vy}];
  if((learning.intro)||netOn()||boatOn()||(H<=420)&&learning.step<4&&(ringOn()||!wolwolOn()))return views;
  for(let k=wideK();k<=(wolwolOn()?Math.max(K,wolViewK()):baseK);k++){
    const width=Math.ceil(CVW/k),height=Math.ceil(CVH/k),widest=k!==baseK&&k===wideK();
    const bottom=widest?Math.min(186,Math.max(height<166?172:176,height)):height>190?186+Math.round((height-190)*.35):height>=120?186:182;
    const view={dot:k/DPR,x:Math.round(WORLD_W/2-width/2),y:bottom-height};
    if((wolwolOn())&&H>420){const room=H-(HERO.y-view.y)*view.dot;if(room<72)view.y+=Math.max(10,Math.ceil((72-room)/view.dot));}
    views.push(view);
  }
  return views;
}
function learnBubbleMotion() {

  const dot=K/DPR;
  return [elLyMe,elLyBa].filter(e=>!e.hidden||e.w&&e.h&&(e===elLyBa||learning.step===3)).flatMap(el=>{
    const r=el.hidden?{w:el.w,h:el.h}:learnRect(el),fs=parseFloat(getComputedStyle(el).fontSize),tail=Math.max(0,.544*fs-1.59),pad=el===elLyBa?Math.max(el.ball||0,el.fs||0)*1.2:0;
    const worldX=el.leftPx/dot+vx,worldY=el.topPx/dot+vy;
    return learnMotionViews().map(view=>({id:el.id,x:Math.round((worldX-view.x)*view.dot)-(el===elLyBa?.5:.22)*r.w-pad,y:Math.max(r.h+3,Math.round((worldY-view.y)*view.dot))-r.h-pad*2,w:r.w+pad*2,h:r.h+tail+pad*2}));
  });
}
function learnPeopleMotion(bodies, views=learnMotionViews()) {
  const dot=K/DPR,faces=[],ink=[],families=new Map(),names=Object.keys(META);
  for(const [person,b] of bodies.entries()){
    const own=META[b.pose],im=SPRITES[b.pose],flip=b.dir===-1;
    const footX=b.drawX+(flip?im.width-own.foot[0]:own.foot[0])*dot,footY=b.drawY+own.foot[1]*dot;
    const family=b.pose.match(/^(ring-[abc]|puller-[abc]|rower-[abc]|hero|leader|follower|spectator\d*|kid-[ab]|dancer\d*)/)?.[0]||b.pose;
    if(!families.has(family))families.set(family,names.filter(n=>(n===family||n.startsWith(family+'-'))&&SPRITES[n]));
    const poses=families.get(family);
    for(const pose of poses){
      const m=META[pose],pic=SPRITES[pose],r=learnOpaque(pic);
      for(const view of views){
        const drawX=(footX/dot+vx-view.x-(flip?pic.width-m.foot[0]:m.foot[0]))*view.dot,drawY=(footY/dot+vy-view.y-m.foot[1])*view.dot;
        const mouth=m.mouth||[26,44],face=m.face||(netOn()||boatOn()?[mouth[0]-16,mouth[1]-20,36,25]:[mouth[0]-12,mouth[1]-14,28,18]);
        const local=[face,...['handL','handR','handA','handB'].filter(k=>m[k]).map(k=>[m[k][0]-3,m[k][1]-3,7,7])];
        const lowYard=(H<=420)&&!netOn()&&!boatOn()&&!ringOn();
        const roomX=(lowYard?0:4*view.dot)+(boatOn()?b.name==='hero'?32:6:0),roomY=(lowYard?(b.name==='hero'?6:2):8)*view.dot;
        for(const[x,y,w,h]of local)faces.push({x:drawX+(flip?pic.width-x-w:x)*view.dot-roomX,y:drawY+y*view.dot-roomY,w:w*view.dot+roomX*2,h:h*view.dot+roomY*2,person});
        ink.push({x:drawX+(flip?pic.width-r.right:r.left)*view.dot-roomX,y:drawY+r.top*view.dot-roomY,w:(r.right-r.left)*view.dot+roomX*2,h:(r.bottom-r.top)*view.dot+roomY*2,gap:0});
      }
    }
  }
  return{faces,ink};
}
function learnStepBallRoom() {
  if(!elLyBa.w||!elLyBa.h||!elLyBa.xs?.length)return null;
  const d=song.practiceBar,syl=d.syl||d.strikes,fs=elLyBa.fs,ball=elLyBa.ball;
  const strikes=learning.intro&&learning.step===2?d.strikes.slice(0,2):d.strikes;
  const xs=strikes.map(b=>elLyBa.xs[Math.max(0,syl.indexOf(b))]);
  const r=elLyBa.hidden?{x:elLyBa.leftPx-elLyBa.w/2,y:elLyBa.topPx-elLyBa.h}:learnRect(elLyBa);
  const style=getComputedStyle(elLyBa),hop=fs*(learning.intro&&learning.step===2?.8:Math.max(.9,...d.strikes.slice(1).map((b,i)=>.5+.35*(b-d.strikes[i]))));
  const lead=learning.intro&&learning.step===2?0:fs*1.2,pad=1/DPR;
  return{x:r.x+parseFloat(style.borderLeftWidth)+Math.min(...xs)-ball/2-lead-pad,y:r.y+parseFloat(style.borderTopWidth)-ball*.7-hop-pad,w:Math.max(...xs)-Math.min(...xs)+ball+lead+pad*2,h:hop+ball+pad*2};
}
function learnNoticeRoom(blocks,target) {
  const style=getComputedStyle(elTop),c=document.createElement('canvas').getContext('2d');c.font=style.font;
  const extraW=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
  const extraH=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
  const words=song.hint.split(/\s+/),minWidth=Math.ceil(Math.max(...words.map(w=>c.measureText(w).width))+extraW);
  const widths=[W/3,W/4,W/5,...blocks.flatMap(b=>[b.x-19,W-b.x-b.w-19])].map(Math.floor).filter(w=>w>=minWidth&&w<=W/3).sort((a,b)=>b-a);
  for(const w of new Set(widths)){
    let line='',lines=1;
    for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>w-extraW){lines++;line=word;}else line=next;}
    const h=lines*(parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.3)+extraH;
    const xs=[target.x+target.w+12,target.x-w-12,9,W-w-9,...blocks.flatMap(b=>[b.x-w-10,b.x+b.w+10])];
    const ys=[target.y+(target.h-h)/2,9,H-h-9,...blocks.flatMap(b=>[b.y-h-10,b.y+b.h+10])];
    for(const x of new Set(xs))for(const y of new Set(ys)){
      const r={x,y,w,h};if(x>=9&&y>=9&&x+w<=W-9&&y+h<=H-9&&blocks.every(b=>learnGap(r,b)>=10-1e-7))return r;
    }
  }
  return null;
}
function learnPlace(el, w, h, avoid, prefer, gap = 9, margin = 9) {
  const key = JSON.stringify([W, H, DPR, w, h, avoid, prefer, gap, margin]);
  if (el.learnPlaceKey === key) return el.learnPlaceRect;
  const candidates = [...prefer];
  for (let y = margin; y + h <= H - margin; y += 12) for (let x = margin; x + w <= W - margin; x += 16) candidates.push([x, y]);
  let best = null, score = Infinity;
  const near = prefer[0] || [W / 2, H / 2];
  for (const [xx, yy] of candidates) {
    const x = Math.round(Math.max(margin, Math.min(W - w - margin, xx)) * DPR) / DPR;
    const y = Math.round(Math.max(margin, Math.min(H - h - margin, yy)) * DPR) / DPR;
    const r = { x, y, w, h };
    if (avoid.some(b => learnGap(r, b) < (b.gap ?? gap))) continue;
    const cost = Math.hypot(x - near[0], y - near[1]);
    if (cost < score) { best = r; score = cost; if (!cost) break; }
  }
  const r = best || { x: margin, y: H - h - margin, w, h };
  el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.learnPlaceKey = key; el.learnPlaceRect = r; return r;
}
function learnPlaceMsgs(geometry){
  if(captionDLive()){captionDAttach();return;}
  const entries=[[elTop,msgTop],[elFb,msg]],size=`${W}|${H}|${DPR}`;
  for(const[el,owner]of entries)if(el.hidden||!owner)el.learnMsgOwner=null;
  if(entries.every(([el,owner])=>el.hidden||!owner||el.learnMsgOwner===owner&&el.learnMsgSize===size))return;
  const g=geometry,hand=learning.handPlace?.rect,rings=(learning.step<4&&learning.handSlots?learning.handSlots:hand?[hand]:[]).map(r=>({x:r.x-4,y:r.y-4,w:r.w+8,h:r.h+8}));
  const dot=K/DPR,views=[{dot,x:vx,y:vy}];
  const fixedView=(learning.intro)||(H<=420)&&learning.step<4&&(ringOn()||!wolwolOn());
  if(!netOn()&&!boatOn()&&!fixedView)for(let k=wideK();k<=(wolwolOn()?Math.max(K,wolViewK()):baseK);k++){
    const width=Math.ceil(CVW/k),height=Math.ceil(CVH/k),widest=k!==baseK&&k===wideK();
    const bottom=widest?Math.min(186,Math.max(height<166?172:176,height)):height>190?186+Math.round((height-190)*.35):height>=120?186:182;
    const view={dot:k/DPR,x:Math.round(WORLD_W/2-width/2),y:bottom-height};
    if((wolwolOn())&&H>420){const room=H-(HERO.y-view.y)*view.dot;if(room<72)view.y+=Math.max(10,Math.ceil((72-room)/view.dot));}
    views.push(view);
  }
  const bubbles=([elLyMe,elLyBa].filter(e=>!e.hidden||e.w&&e.h&&(e===elLyBa||learning.step===3)).flatMap(el=>{
    const r=el.hidden?{w:el.w,h:el.h}:learnRect(el),s=getComputedStyle(el),tail=Math.max(0,.544*parseFloat(s.fontSize)-1.59),pad=el===elLyBa?Math.max(el.ball||0,el.fs||0)*1.2:0;
    const worldX=el.leftPx/dot+vx,worldY=el.topPx/dot+vy;
    return views.map(view=>({x:Math.round((worldX-view.x)*view.dot)-(el===elLyBa?.5:.22)*r.w-pad,y:Math.max(r.h+3,Math.round((worldY-view.y)*view.dot))-r.h-pad*2,w:r.w+pad*2,h:r.h+tail+pad*2}));
  }));
  const faces=learning.intro?g.faces:g.bodies.flatMap(b=>{
    const family=b.pose.match(/^(ring-[abc]|puller-[abc]|rower-[abc]|hero|leader|follower|spectator\d*|kid-[ab])/);
    if(!family)return[];
    const current=META[b.pose],im=SPRITES[b.pose],footX=b.drawX+(b.dir===-1?im.width-current.foot[0]:current.foot[0])*dot,footY=b.drawY+current.foot[1]*dot;
    const worldX=footX/dot+vx,worldY=footY/dot+vy;
    const rects=[];
    for(const pose of Object.keys(META).filter(n=>n.startsWith(family[0]+'-')&&SPRITES[n])){
      const m=META[pose],mouth=m.mouth||[26,44],face=m.face||(netOn()||boatOn()?[mouth[0]-16,mouth[1]-20,36,25]:[mouth[0]-12,mouth[1]-14,28,18]);
      const local=[face,...['handL','handR','handA','handB'].filter(k=>m[k]).map(k=>[m[k][0]-3,m[k][1]-3,7,7])];
      for(const view of views)for(const[x,y,w,h]of local)rects.push({x:(worldX-view.x+(b.dir===-1?m.foot[0]-x-w:x-m.foot[0]))*view.dot,y:(worldY-view.y+y-m.foot[1])*view.dot,w:w*view.dot,h:h*view.dot});
    }
    if(!rects.length)return[];
    const clear=(netOn()||boatOn())&&b.name==='hero'?Math.ceil(8/dot)*dot:0;
    const motion=boatOn()?b.name==='hero'?Math.ceil(32/dot)*dot:Math.ceil(6/dot)*dot:0;
    if(fixedView){const pad=Math.ceil(4*dot)+clear;return rects.map(r=>({x:r.x-pad-motion,y:r.y-pad,w:r.w+(pad+motion)*2,h:r.h+pad*2}));}
    const left=Math.min(...rects.map(r=>r.x))-4*dot-clear-motion,top=Math.min(...rects.map(r=>r.y))-8*dot-clear,right=Math.max(...rects.map(r=>r.x+r.w))+4*dot+clear+motion,bottom=Math.max(...rects.map(r=>r.y+r.h))+4*dot+clear;
    return[{x:left,y:top,w:right-left,h:bottom-top}];
  });
  const callIntro=(learning.intro&&learning.step===3)&&H<=420;
  const jointLesson=(learning.intro||learning.step<4)&&(H<=420||ringOn());
  const steps=g.steps?(learning.intro||callIntro||jointLesson?g.steps:{x:8,y:8,w:W-16,h:Math.max(g.steps.y+g.steps.h,12+g.steps.h)-8}):null;
  const liveBubbles=[elLyMe,elLyBa].filter(e=>!e.hidden).map(e=>{const r=learnRect(e),tail=Math.max(0,.544*parseFloat(getComputedStyle(e).fontSize)-1.59);return {...r,h:r.h+tail};});
  const avoid=[steps,g.say,...rings,...faces,...g.protectedRects,...bubbles,...liveBubbles,...g.beads,...g.corner].filter(Boolean).map(r=>{
    const x=Math.floor(r.x*DPR)/DPR,y=Math.floor(r.y*DPR)/DPR;
    return {...r,x,y,w:Math.ceil((r.x+r.w)*DPR)/DPR-x,h:Math.ceil((r.y+r.h)*DPR)/DPR-y};
  });
  const pinned=[[elTop,msgTop],[elFb,msg]].filter(([el,owner])=>owner&&!el.hidden&&el.learnMsgOwner===owner&&el.learnMsgSize?.startsWith(`${W}|${H}|${DPR}|`)).map(([el])=>({el,rect:el.learnMsgRect}));
  for(const[el,owner]of entries){
    if(el.hidden||!owner){el.learnMsgOwner=null;continue;}
    el.classList.remove('byBa');el.style.transform='none';el.style.bottom='auto';el.dataset.learnMsg='1';
    const size=()=>{const r=learnRect(el);return [r.w,r.h];};
    let [w,h]=size();const key=`${W}|${H}|${DPR}|${bubbles.map(r=>[r.x,r.y,r.w,r.h].map(Math.round).join(',')).join(';')}`;
    // 처음 자리는 화면이 움직일 범위까지 비운다. 그 뒤에는 실제 글·구슬이 안전하면 같은 자리를 쓴다.
    const held=el.learnMsgRect,blocks=[g.steps,g.say,...rings,...g.faces,...g.protectedRects,...liveBubbles,...g.beads,...g.corner,...pinned.filter(p=>p.el!==el).map(p=>p.rect)].filter(Boolean),gap=jointLesson?12:10;
    if(el.learnMsgOwner===owner&&el.learnMsgSize?.startsWith(`${W}|${H}|${DPR}|`)&&held&&Math.abs(held.w-w)<1/DPR&&Math.abs(held.h-h)<1/DPR&&held.x>=9&&held.y>=9&&held.x+held.w<=W-9&&held.y+held.h<=H-9&&blocks.every(b=>learnGap(held,b)>=gap)){
      el.learnMsgSize=key;el.learnMsgBlocking=blocks;
    }
    if(el.learnMsgOwner!==owner||el.learnMsgSize!==key){
      el.style.maxWidth='';el.style.wordBreak='keep-all';[w,h]=size();
      const blocking=avoid.concat(pinned.filter(p=>p.el!==el).map(p=>p.rect));
      const msgGap=jointLesson?12:10;
      const find=()=>{
        const active=currentRec(learnVisualTime()),target=active?.def.call&&!elLyMe.hidden?elLyMe:!elLyBa.hidden?elLyBa:!elLyMe.hidden?elLyMe:null;
        const bubble=target?learnRect(target):learning.feedbackBubble||{x:W/2,y:H/2,w:0,h:0};
        learning.feedbackBubble=bubble;
        el.learnMsgBubble=bubble;
        const cx=bubble.x+bubble.w/2,cy=bubble.y+bubble.h/2;
        const prefer=[[bubble.x+bubble.w+12,cy-h/2],[bubble.x-w-12,cy-h/2],[cx-w/2,bubble.y-h-12],[cx-w/2,bubble.y+bubble.h+12]];
        const safe=(x,y)=>x>=9&&y>=9&&x+w<=W-9&&y+h<=H-9&&blocking.every(b=>learnGap({x,y,w,h},b)>=msgGap);
        let first=prefer.find(([x,y])=>safe(x,y));
        if(!first){
          const xs=[9,W-w-9,cx-w/2,...blocking.flatMap(b=>[Math.floor((b.x-w-msgGap)*DPR)/DPR,Math.ceil((b.x+b.w+msgGap)*DPR)/DPR])];
          const ys=[9,H-h-9,cy-h/2,...blocking.flatMap(b=>[Math.floor((b.y-h-msgGap)*DPR)/DPR,Math.ceil((b.y+b.h+msgGap)*DPR)/DPR])];
          let cost=Infinity;
          for(const x of new Set(xs))for(const y of new Set(ys))if(safe(x,y)){const d=Math.hypot(x+w/2-cx,y+h/2-cy);if(d<cost){cost=d;first=[x,y];}}
        }
        return first;
      };
      let first=find();
      if(!first){
        const style=getComputedStyle(el),c=document.createElement('canvas').getContext('2d');c.font=style.font;
        const extra=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
        const minWidth=Math.ceil(Math.max(...el.textContent.split(/\s+/).map(word=>c.measureText(word).width))+extra);
        const widths=[...new Set([W/3,W/4,W/5,...blocking.flatMap(b=>[b.x-9-10,W-b.x-b.w-9-10])].map(Math.floor))].filter(width=>width>=minWidth&&width<=W/3).sort((a,b)=>b-a);
        for(const width of widths){el.style.maxWidth=(width-(learning.step<4?extra:0))+'px';[w,h]=size();first=find();if(first)break;}
      }
      el.learnMsgRect=first?{x:first[0],y:first[1],w,h}:learnPlace(el,w,h,blocking,[[9,H-h-9]],msgGap===10?9:msgGap);
      el.learnMsgRect.x=Math.max(9,Math.min(W-w-9,el.learnMsgRect.x));
      el.learnMsgRect.y=Math.max(9,Math.min(H-h-9,el.learnMsgRect.y));
      el.learnMsgOwner=owner;el.learnMsgSize=key;
      el.learnMsgBlocking=blocking;
    }
    const r=el.learnMsgRect;el.style.left=r.x+'px';el.style.top=r.y+'px';avoid.push(r);
  }
}
function drawLearning() {
  // 노래 중 메김 도움은 꾹 표시(#holdCue)가 같은 손을 이미 띄우니 흐린 손을 하나 더 두지 않는다(2026-11-13 대표 「손 누르라는 표시가 두갠데」)
  const l = learning, show = state === 'practice' || state === 'song';
  const songHelpNow = !l && activeSongHelp(), help = songHelpNow?.hold && holdSong() ? null : songHelpNow;
  if ((!l && !help) || !show) { hideLearningUi(); return; }
  learnUi.hidden = false;
  document.body.classList.toggle('learnIntro', !!l?.intro);
  const holdRelease = !!l?.intro && l.step === 3 && (performance.now() / 1000 - l.frozenF + 1e-9) % 2.4 >= 2;
  document.body.classList.toggle('learnCall', !!l?.intro && l.step === 3);
  document.body.classList.toggle('learnRelease', holdRelease);
  document.body.classList.toggle('learnReceive', !!l?.intro && l.step !== 3);
  const bodies = learnBodies(), own = bodies.find(b => b.name === 'hero') || bodies[0];
  const geom = boatOn() ? boat.geometry : netOn() ? net.geometry : null;
  const protectedRects = (geom?.protectedRects || []).map(r => ({ x: toCssX(r.x), y: toCssY(r.y), w: r.w * K / DPR, h: r.h * K / DPR }));
  const bubbles = [elLyMe, elLyBa].filter(e => !e.hidden).map(learnRect);
  const beads = !elBall.hidden && !elLyBa.hidden ? [learnRect(elBall)] : [];
  const frameBox = window.frameElement?.getBoundingClientRect();
  const corner = frameBox ? [...window.parent.document.querySelectorAll('[data-test="exit-x"],[data-test="sound"]')].map(e => {
    const r = e.getBoundingClientRect(); return { x: r.left - frameBox.left, y: r.top - frameBox.top, w: r.width, h: r.height };
  }).filter(r => r.w && r.h) : [];
  let stepsBox = null;
  learnStepsEl.hidden = !l;
  if (l) {
    learnStepLabels(l);
    const w = learnStepsEl.offsetWidth, h = learnStepsEl.offsetHeight;
    const callIntro=(l.intro&&l.step===3)&&H<=420;
    const handRoom=l.step<4?(l.handSlots|| (l.handPlace?[l.handPlace.rect]:[])).map(r=>({...r,gap:12})):[];
    const stepKey=`${W}|${H}|${DPR}|${l.step}|${l.cycle}|${l.intro}|${l.mode}`;
    if(captionDLive()){
      captionDAttach();l.stepsPlace={key:stepKey,rect:learnRect(learnStepsEl)};
    }else if(l.step===4||l.stepsPlace?.key!==stepKey){
      const blocks=bubbles.concat(beads,corner,callIntro?learnFaces(bodies):[],handRoom),prefer=[[(W-w)/2,(12)]];
      if((l.step<4)&&H<=420){
        const path=learnStepBallRoom();if(path)blocks.push(path);blocks.push(...learnFaces(bodies));
        const y=corner.length?Math.max(...corner.map(r=>r.y+r.h))+10:12;
        prefer.push([9,y],[W-w-9,y]);
        const first=prefer.find(([x,y])=>x>=9&&y>=9&&x+w<=W-9&&y+h<=H-9&&blocks.every(b=>learnGap({x,y,w,h},b)>=(b.gap??9)));
        if(first)prefer.splice(0,prefer.length,first);
      }
      const rect=learnPlace(learnStepsEl,w,h,blocks,prefer);
      l.stepsPlace={key:stepKey,rect};
    }
    stepsBox=captionDLive()?learnRect(learnStepsEl):l.lessonLayout?.steps||l.stepsPlace.rect;l.stepsPlace.rect=stepsBox;learnStepsEl.style.left=stepsBox.x+'px';learnStepsEl.style.top=stepsBox.y+'px';
    const fade = l.step === 4 && !l.intro && l.fadeAt !== null ? clamp01((heardNow() - l.fadeAt) / .4) : 0;
    learnStepsEl.style.opacity = String(1 - fade);
  }
  learnShadeEl.hidden = !l?.intro;
  if (l?.intro) {
    if (learnShadeEl.width !== CVW || learnShadeEl.height !== CVH) { learnShadeEl.width = CVW; learnShadeEl.height = CVH; }
    const c = learnShadeEl.getContext('2d'); c.clearRect(0, 0, CVW, CVH); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, CVW, CVH);
    c.save(); c.globalCompositeOperation = 'destination-out'; c.imageSmoothingEnabled = false;
    for (const b of bodies.filter(b => l.step === 3 ? b.name === (holdRelease ? 'hero' : 'leader') : b.name === 'hero')) {
      const im = SPRITES[b.pose]; if (im) { c.save(); if (b.dir === -1) { c.translate(Math.round((b.drawX + b.drawW) * DPR), 0); c.scale(-1, 1); c.drawImage(im, 0, Math.round(b.drawY * DPR), Math.round(b.drawW * DPR), Math.round(b.drawH * DPR)); } else c.drawImage(im, Math.round(b.drawX * DPR), Math.round(b.drawY * DPR), Math.round(b.drawW * DPR), Math.round(b.drawH * DPR)); c.restore(); }
    }
    c.restore();
  }
  const avoid = bodies.concat(protectedRects, bubbles, beads, corner, stepsBox ? [stepsBox] : [],l?.step<4?(l.handSlots||[]).map(r=>({...r,gap:12})):[]);
  learnSayEl.hidden = !l?.intro;
  let sayBox = null;
  if (l?.intro) {
    setText(learnSayEl, l.step === 3 ? learnHoldSay() : learnSayFor(l.step));
    const target = l.step === 3 ? learnRect(elLyMe) : learnRect(elLyBa);
    const prefer=[[target.x,target.y-learnSayEl.offsetHeight-40],[target.x,target.y+target.h+12],[W/2-learnSayEl.offsetWidth/2,(own?.y||H/2)+(own?.h||0)+12]];
    const key=`${W}|${H}|${DPR}|${l.step}|${l.cycle}|${l.intro}`;
    if(l.step===4){sayBox=l.lessonLayout?.say||learnPlace(learnSayEl,learnSayEl.offsetWidth,learnSayEl.offsetHeight,avoid,prefer);learnSayEl.style.left=sayBox.x+'px';learnSayEl.style.top=sayBox.y+'px';}
    else {
    if(l.sayPlace?.key!==key){
      const r=!elLyBa.hidden?learnRect(elLyBa):null,pad=Math.max(elLyBa.ball||0,elLyBa.fs||0)*1.2;
      const path=r?{x:r.x-pad,y:r.y-pad*2,w:r.w+pad*2,h:r.h+pad*2}:null;
      l.sayPlace={key,rect:learnPlace(learnSayEl,learnSayEl.offsetWidth,learnSayEl.offsetHeight,avoid.concat(path?[path]:[]),prefer)};
    }
    sayBox=l.lessonLayout?.say||l.sayPlace.rect;l.sayPlace.rect=sayBox;learnSayEl.style.left=sayBox.x+'px';learnSayEl.style.top=sayBox.y+'px';
    }
    avoid.push(sayBox);
  }
  const vt = heardNow(), hold = help ? help.hold : l.step === 3;
  const rec = help ? help.rec : hold ? l.call || l.rec : l.response || l.rec;
  const img = learnHandArt(hold);
  const targetEl = hold && !l ? elLyMe : elLyBa, holder = l || rec;
  const tapIndex = !l || hold ? 0 : l.intro && l.step === 2 ? learnBeatDemo().index : l.mode === 'wait' ? l.index : Math.max(0, rec.def.strikes.findLastIndex(b => vt-OFFSET-rec.t0 >= b*rec.beat-1e-9));
  const introView=l?.intro?`${K}|${vx}|${vy}|${l.lessonLayout?.key||''}`:'';
  // 해 보기 말풍선 곁 손은 한 마디 동안 한 자리(톡마다 옮기지 않는다)
  const placeKey = `${W}|${H}|${DPR}|${introView}|${holder.cycle || 0}|${!!l?.intro}|${hold}|${l?.mode || ''}|${captionDLive() && learnHandBeside() ? 'beside' : tapIndex}`;
  const hasPlace = holder.handPlace?.key === placeKey;
  const handOn = !!img && (!l || l.intro || l.step < 4) && (hasPlace || !(hold && l ? elLyMe : targetEl).hidden && (targetEl.w || targetEl.offsetWidth) > 0);
  learnHandEl.hidden = !handOn;
  if (l && !handOn) l.hand = null;
  let handBox = null;
  if (handOn) {
    const pad = 5, iw = img.width + pad * 2, ih = img.height + pad * 2;
    if (learnHandEl.width !== iw || learnHandEl.height !== ih) { learnHandEl.width = iw; learnHandEl.height = ih; }
    const scale = K/DPR;
    const w = iw * scale, h = ih * scale;
    learnHandEl.style.width = w + 'px'; learnHandEl.style.height = h + 'px';
    const ink = learnOpaque(img), inkX = (pad + ink.left) * scale, inkY = (pad + ink.top) * scale;
    const inkW = (ink.right - ink.left) * scale, inkH = (ink.bottom - ink.top) * scale;
    // 처음 배우기 해 보기(1~3단계): 손은 안내 묶음 밖, 받는 말풍선 칸 옆에 멈춘 안내와 같은 계산으로 둔다. 칸 자리로 재서 꾹 동안 고리가 움직이지 않는다
    // (2026-11-27 저녁 대표 「손가락 위치는 왜 저기며」: 묶음에 붙은 손이 말풍선보다 약 300px 위 하늘에 떴다)
    const beside = captionDLive() && learnHandBeside(), baSlot = beside ? captionD.slots.ba : null;
    const target = baSlot ? {x:baSlot.x,y:baSlot.y,w:baSlot.w,h:baSlot.h} : targetEl.hidden ? {x:targetEl.leftPx-targetEl.w/2,y:targetEl.topPx-targetEl.h,w:targetEl.w,h:targetEl.h} : learnRect(targetEl), key = placeKey;
    const syl=song.practiceBar.syl||song.practiceBar.strikes,index=Math.max(0,syl.indexOf(song.practiceBar.strikes[tapIndex]));
    const style=getComputedStyle(elLyBa),anchor={x:target.x+parseFloat(style.borderLeftWidth)+(elLyBa.xs?.[index]||0),y:target.y+parseFloat(style.borderTopWidth)-(elLyBa.ball||0)*.2};
    if(beside){captionDAttach();if(learnHandEl.parentNode!==document.body)document.body.append(learnHandEl);learnHandEl.style.translate='none';}
    if(captionDLive()&&!beside){
      captionDAttach();
      learnHandEl.style.translate='none';
      const frame=learnRect(learnHandEl);
      holder.handPlace={key,rect:{x:frame.x+inkX,y:frame.y+inkY,w:inkW,h:inkH+(hold?0:8)}};
      holder.handCandidates=[[holder.handPlace.rect.x,holder.handPlace.rect.y]];
    }
    else if (holder.handPlace?.key !== key) {
      if((l?.intro||l?.step<4)&&l.handSlots&&!beside){
        const r=l.handSlots[Math.min(tapIndex,l.handSlots.length-1)];
        holder.handPlace={key,rect:{...r},obstacles:[]};
      }else{
      const motionH = inkH + (hold ? 0 : 8), y = target.y + target.h - inkH;
      const lowHold = (hold && !!l) && H <= 420 && (l.intro || Rules.learnHelp(l.progress, l.step) === 'solid');
      const sideY = lowHold ? Math.min(y, target.y - motionH + 12) : y;
      const prefer = [[target.x + target.w + 12, sideY], [target.x - inkW - 12, sideY], [target.x + target.w - inkW, target.y - motionH - 12], [target.x, lowHold ? target.y + target.h + 12 : target.y - motionH - 12]];
      if (lowHold) for (const [i,p] of prefer.entries()) {
        const snapX = i === 1 ? Math.floor : Math.ceil, snapY = i === 2 ? Math.floor : Math.ceil;
        p[0] = Math.max(Math.ceil(9*DPR)/DPR, Math.min(Math.floor((W-inkW-9)*DPR)/DPR, snapX(p[0]*DPR)/DPR));
        p[1] = Math.max(Math.ceil(9*DPR)/DPR, Math.min(Math.floor((H-motionH-9)*DPR)/DPR, snapY(p[1]*DPR)/DPR));
      }
      const room = l?.intro ? 0 : (netOn() || boatOn() ? 2 : 4) * K / DPR;
      // 해 보기 손(말풍선 옆): 원 뒷줄(뒤집어 그린 ring- 사람)은 말풍선처럼 손 뒤로 지나가므로 피하지 않는다(11-15 자막 D 결정과 같음)
      const front = beside && ringOn() ? bodies.filter(b => !(/^ring-[abc]-/.test(b.name) && b.dir === -1)) : bodies;
      const safe = learnFaces(front).map(b => ({ x: b.x - room, y: b.y - room, w: b.w + room * 2, h: b.h + room * 2 }));
      let obstacles = safe.concat(protectedRects, bubbles, beads, corner, stepsBox ? [stepsBox] : [], sayBox ? [sayBox] : []);
      if(l?.step<4){
        // 자막 D는 한 판 동안 시점을 고정한다(setWide). 해 보기 손은 확대 단계마다 재지 않고 지금 시점만 본다
        const motion=learnPeopleMotion(front,beside?[{dot:K/DPR,x:vx,y:vy}]:undefined),notices=[[elTop,msgTop],[elFb,msg]].filter(([el,owner])=>owner&&!el.hidden&&el.learnMsgOwner===owner).map(([el])=>({...el.learnMsgRect,gap:14}));
        const bubbleMotion=learnBubbleMotion();
        let path=learnStepBallRoom();
        // 해 보기에서 받는 말풍선이 아직 숨었으면 옛 자리(leftPx)로 잰 구슬 길을 자막 칸 자리로 옮긴다
        if(beside&&path&&elLyBa.hidden){const r0={x:elLyBa.leftPx-elLyBa.w/2,y:elLyBa.topPx-elLyBa.h};path={...path,x:path.x-r0.x+target.x,y:path.y-r0.y+target.y};}
        obstacles=obstacles.filter(b=>b!==stepsBox&&b!==sayBox).concat(motion.faces,motion.ink,beside?[]:bubbleMotion.filter(b=>learnGap(b,target)>=0),notices,path?[{...path,gap:12}]:[]);
        // 해 보기: 단계 표 · 판정 글이 뜨는 안내 묶음 상자 전체와 두 말풍선 칸(숨어 있어도)을 비운다. 글이 나중에 떠도 손과 겹치지 않게.
        // 자막 D 말풍선은 이 두 칸에만 뜨므로, 말풍선이 원래 떠다니던 자리(learnBubbleMotion)는 피하지 않는다
        if(beside){const guide=captionD.notes&&!captionD.notes.hidden?learnRect(captionD.notes):null;obstacles=obstacles.concat(guide?[guide]:[],[captionD.slots.me,captionD.slots.ba].filter(Boolean).map(r=>({x:r.x,y:r.y,w:r.w,h:r.h})));}
      }
      const fits = ([x, y], blocks = obstacles) => x >= 9 && y >= 9 && x + inkW <= W - 9 && y + motionH <= H - 9 && blocks.every(b => learnGap({x,y,w:inkW,h:motionH},b) >= (b.gap ?? 12));
      if (lowHold && l?.intro && sayBox && !prefer.some(p => fits(p)) && fits(prefer[1], obstacles.filter(b => b !== sayBox))) {
        const hand = {x:prefer[1][0],y:prefer[1][1],w:inkW,h:motionH};
        const moved = [sayBox.y + 12, hand.y + hand.h + 12].map(y => ({...sayBox,y:Math.ceil(y*DPR)/DPR})).find(r => r.y >= sayBox.y && r.y + r.h <= H - 9 && obstacles.filter(b => b !== sayBox).every(b => learnGap(r,b) >= 9) && learnGap(hand,r) >= 12);
        if (moved) {
          obstacles = obstacles.filter(b => b !== sayBox).concat(moved); sayBox = moved; l.sayPlace.rect = moved; learnSayEl.style.top = moved.y + 'px';
        }
      }
      let first = prefer.find(p => fits(p));
      if (l?.step < 4) {
        const xs = [anchor.x-inkW/2,...prefer.map(p=>p[0]), ...(beside?[Math.round((target.x+(target.w-inkW)/2)*DPR)/DPR]:[]), ...obstacles.flatMap(b=>[Math.floor((b.x-inkW-(b.gap??12))*DPR)/DPR,Math.ceil((b.x+b.w+(b.gap??12))*DPR)/DPR])];
        const ys = [anchor.y-(hold?0:8),...prefer.map(p=>p[1]), ...(beside?[Math.round((target.y+(target.h-motionH)/2)*DPR)/DPR]:[]), ...obstacles.flatMap(b=>[Math.floor((b.y-motionH-(b.gap??12))*DPR)/DPR,Math.ceil((b.y+b.h+(b.gap??12))*DPR)/DPR])];
        let distance = Infinity;
        for (const x of new Set(xs)) for (const y of new Set(ys)) if (fits([x,y])) {
          // 해 보기 말풍선 곁: 받는 말풍선 칸과 떨어진 거리(가로 · 세로 틈을 함께 잰 곧은 거리)가 가장 작은 자리, 같으면 칸 가운데에 가까운 자리
          const d = beside ? Math.hypot(Math.max(0,target.x-x-inkW,x-target.x-target.w),Math.max(0,target.y-y-motionH,y-target.y-target.h))*1e3+Math.hypot(x+inkW/2-target.x-target.w/2,y+motionH/2-target.y-target.h/2) : Math.hypot(x+inkW/2-anchor.x,y+(hold?0:8)-anchor.y);
          if (d < distance) { distance=d;first=[x,y]; }
        }
      }
      holder.handCandidates = lowHold ? prefer : null;
      const fallback = lowHold ? [...prefer].sort((a,b) => Math.hypot(a[0]+inkW/2-target.x-target.w/2,a[1]+motionH/2-target.y-target.h/2)-Math.hypot(b[0]+inkW/2-target.x-target.w/2,b[1]+motionH/2-target.y-target.h/2)) : prefer.slice(2);
      holder.handPlace = { key, rect: learnPlace(learnHandEl, inkW, motionH, obstacles, first ? [first] : fallback, 12) };
      if(l?.step<4){
        holder.handPlace.obstacles=obstacles;
        const hand=holder.handPlace.rect,blocks=bodies.concat(protectedRects,bubbles,beads,corner,learnBubbleMotion(),[{...hand,gap:12}]);
        if(!beside&&stepsBox&&learnGap(hand,stepsBox)<12){
          stepsBox=learnPlace(learnStepsEl,stepsBox.w,stepsBox.h,blocks,[[stepsBox.x,stepsBox.y]],12);
          l.stepsPlace.rect=stepsBox;
        }
        if(!beside&&sayBox&&(learnGap(hand,sayBox)<12||learnGap(stepsBox,sayBox)<12)){
          sayBox=learnPlace(learnSayEl,sayBox.w,sayBox.h,blocks.concat(stepsBox?[stepsBox]:[]),[[sayBox.x,sayBox.y]],12);
          l.sayPlace.rect=sayBox;
        }
      }
      }
    }
    const fixed = holder.handPlace.rect;
    const elapsed = (l?.intro ? performance.now() / 1000 - l.frozenF : vt - OFFSET - rec.t0) + 1e-9;
    let down, fill = 0, release = false;
    if (hold) {
      const duration = barSpan(rec.def);
      if (l?.intro) { const phase = elapsed % 2.4; down = phase < 2; fill = Math.min(1, phase / 2); release = phase >= 2 && phase < 2.4; }
      else { down = !!charge; fill = down ? clamp01(elapsed / duration) : 0; const sinceRelease=performance.now()/1000-holdIndicator.releasedAt;release=sinceRelease>=0&&sinceRelease<.4-1e-9; }
    } else if (l?.intro && l.step === 2) { const demo = learnBeatDemo(); down = demo.times.some(t => demo.phase >= t && demo.phase - t < .12); }
    else if (l?.intro) down = elapsed % 1 < .12;
    else if (l?.mode === 'wait') { const waiting = performance.now() / 1000 - l.readyAt + 1e-9; down = !l.hop && waiting >= 1 && waiting % 1 < .12; }
    else down = rec.def.strikes.some(b => elapsed >= b * rec.beat && elapsed - b * rec.beat < .12);
    const dy = hold ? 0 : down ? 8 : 0;
    const baseY = fixed.y;
    learnHandEl.style.left = fixed.x - inkX + 'px'; learnHandEl.style.top = baseY - inkY + dy + 'px';
    learnHandEl.style.translate=captionDLive()?'0 '+dy+'px':'';
    handBox = { x: fixed.x, y: baseY + dy, w: inkW, h: inkH };
    const c = learnHandEl.getContext('2d'); c.clearRect(0, 0, iw, ih); c.imageSmoothingEnabled = false;
    const opacity = help ? help.opacity : l.intro || l.mode === 'wait' || Rules.learnHelp(l.progress, l.step) === 'solid' ? 1 : .3;
    learnHandEl.style.opacity = opacity;
    const status=release?'released':down?'holding':'waiting',f=performance.now()/1000;
    const prompt=hold&&!down&&!release&&!l?.intro&&elapsed>.4&&elapsed<barSpan(rec.def);
    const shown=cueHandImage(status,prompt);
    let effects=null;
    c.save();c.translate(pad,pad);
    if(hold)effects=paintHoldRing(c,img.width,status,fill,f,l?.intro?elapsed%2.4:charge?vt-charge.pressT:Infinity,l?.intro?(elapsed%2.4)-2:f-holdIndicator.releasedAt,img.height);
    if(shown)c.drawImage(shown,Math.round((img.width-shown.width)/2),Math.round((img.height-shown.height)/2)+(hold&&down&&!RM?Math.round(Math.sin(f*38)):0));
    c.restore();
    if (l) l.hand = { opacity, down, fill, release, status, dy, effects, handHeight:shown?.height*scale, base: { x: fixed.x, y: baseY }, reason: l.reason };
  }
  if (l) {
    l.geometry = { steps: stepsBox, say: sayBox, hand: handBox, bodies, faces: learnFaces(bodies), protectedRects, bubbles, beads, corner, font: parseFloat(getComputedStyle(learnSayEl).fontSize) };
    learnDrawFocus(l);
    learnPlaceMsgs(l.geometry);
  } else learnFocusEl.hidden = true;
}

function learnFirstGlyph(el) {
  if (el.hidden) return null;
  const span=el.firstElementChild;
  if (span.firstElementChild) return learnRect(span.firstElementChild);
  const text=span.firstChild;if(!text?.length)return null;
  const range=document.createRange(),start=Math.max(0,text.textContent.search(/\S/));
  range.setStart(text,start);range.setEnd(text,start+1);
  const r=range.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};
}
function learnDrawFocus(l) {
  const first=learnFirstGlyph(elLyBa),ball=!elBall.hidden&&!elLyBa.hidden?learnRect(elBall):null;
  if(l.intro&&l.step===3&&first){
    const c=learnShadeEl.getContext('2d');
    const phase=(performance.now()/1000-l.frozenF+1e-9)%2.4;
    for(const r of[phase>=2?first:null,phase>=1.6?ball:null].filter(Boolean))c.clearRect((r.x-3)*DPR,(r.y-3)*DPR,(r.w+6)*DPR,(r.h+6)*DPR);
  }
  let kind=null,rects=[],width=4;
  if(l.intro&&l.step===3&&l.hand?.release){kind='release';rects=[first,ball];}
  else if(!l.intro&&l.step===2&&l.mode==='wait'&&!l.hop){kind='wait';rects=[learnWaitGlyph(l),ball];width=3;}
  else if(!l.intro&&l.retryAt===null&&l.resultUntil===null&&l.mode!=='wait'){
    const firstTarget=l.step===3?targets.find(t=>t.rec===l.response):null;
    const landed=firstTarget?heardNow()-OFFSET-firstTarget.t:-1;
    if(l.step===3&&(l.cycle===1||Rules.learnHelp(l.progress,l.step)==='solid'||l.demoReason==='일찍 뗐어요'||l.demoReason==='늦게 뗐어요')&&landed>=-1e-9&&landed<.4-1e-9){kind='release';rects=[first,ball];}
    if(l.demoReason){
    const elapsed=heardNow()-OFFSET-(l.step===3?l.call:l.response).t0;
    if(l.demoReason==='첫 박부터 꾹'&&elapsed>=-1e-9&&elapsed<.4-1e-9){kind='start';rects=[learnFirstGlyph(elLyMe)];}
    if(l.demoReason==='끝까지 꾹'&&l.hand?.release){kind='release';rects=[first,ball];}
    if(l.step===2&&(l.demoReason==='한 번씩 톡'||l.demoReason==='일찍 눌렀어요')&&!l.hand?.down){
      const times=l.response.def.strikes.map(b=>b*l.response.beat),last=times.filter(t=>t<=elapsed).at(-1),next=times.find(t=>t>elapsed);
      if(last!==undefined&&next!==undefined){const start=last+.12;if(elapsed+1e-9>=start&&elapsed<Math.min(start+.4,next)-1e-9){kind='up';rects=[l.geometry.hand];}}
    }
    if(l.step===2&&(l.demoReason==='늦게 눌렀어요'||l.demoReason==='놓쳤어요')){
      const times=l.response.def.strikes.map(b=>b*l.response.beat),index=times.findLastIndex(t=>elapsed+1e-9>=t),dt=elapsed-times[index];
      if(index>=0&&dt<.4-1e-9){
        const syl=l.response.def.syl||l.response.def.strikes,glyph=elLyBa.firstElementChild?.children[syl.indexOf(l.response.def.strikes[index])];
        kind='down';rects=[glyph?learnRect(glyph):null,ball,...(dt<.12-1e-9?[l.geometry.hand]:[])];
      }
    }
    }
  }
  rects=rects.filter(Boolean);l.focus={kind:rects.length?kind:null,rects,width};
  learnFocusEl.hidden=!rects.length;
  if(learnFocusEl.width!==CVW||learnFocusEl.height!==CVH){learnFocusEl.width=CVW;learnFocusEl.height=CVH;}
  const c=learnFocusEl.getContext('2d');c.clearRect(0,0,CVW,CVH);c.strokeStyle='#f8cd60';c.lineWidth=width*DPR;
  for(const r of rects)c.strokeRect((r.x-2)*DPR,(r.y-2)*DPR,(r.w+4)*DPR,(r.h+4)*DPR);
}
function learnWaitGlyph(l) {
  const syl=song.practiceBar.syl||song.practiceBar.strikes,index=syl.indexOf(song.practiceBar.strikes[l.index]);
  const el=elLyBa.firstElementChild?.children[index];return el?learnRect(el):null;
}
