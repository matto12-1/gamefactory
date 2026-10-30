(function () {
  'use strict';
  // 막 시간표. 시대 따라가기: 90초씩 세 막 + 부장 둘 + 적장. 무한: 15분 동안 다섯 구간, 마지막은 불가사리.
  // 사건은 시간 순서대로 한 번씩만 지나간다(되감기 없음). 다시 시작은 언제나 0초부터다.
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const ACT = 90;

  // 시대 따라가기 사건표. at은 생존 초.
  function timeline(tuning) {
    const A = tuning.acts || {};
    const len = A.length ?? ACT, warn = A.warnAt ?? len * 3 - 15, general = A.generalAt ?? len * 3;
    return [
      { at: 0, type: 'act', act: 1 },
      { at: A.deputyAt?.[0] ?? len - 20, type: 'deputy', n: 0 },
      { at: len, type: 'act', act: 2 },
      { at: A.deputyAt?.[1] ?? len * 2 - 20, type: 'deputy', n: 1 },
      { at: len * 2, type: 'act', act: 3 },
      { at: warn, type: 'warn' }, { at: general, type: 'general' }
    ].sort((a, b) => a.at - b.at);
  }
  function start(tuning, t0 = 0) {
    const list = timeline(tuning);
    let next = 0;
    while (next < list.length && list[next].at < t0) next++;
    return { list, next };
  }
  function step(state, t) {
    const out = [];
    while (state.next < state.list.length && state.list[state.next].at <= t + 1e-9) out.push(state.list[state.next++]);
    return out;
  }
  // 막마다 적 섞기. 적장 때는 3막과 같다. 1막부터 보병과 기병 두 가지(Matto 「적 종류는 여럿이겠지?」), 궁수는 2막부터.
  function mix(act, tuning) {
    const M = tuning.acts?.mix;
    return (M && M[Math.min(act, M.length) - 1]) || [{ foot: .7, horse: .3 }, { foot: .5, horse: .25, archer: .25 }, { foot: .4, horse: .3, archer: .3 }][Math.min(act, 3) - 1];
  }
  function roll(weights, rnd) {
    let r = rnd(); const list = Object.entries(weights);
    for (const [k, v] of list) { r -= v; if (r < 0) return k; }
    return list[list.length - 1][0];
  }
  // 무한 사건도 시간순 목록으로 소비한다. 큰 시간 건너뛰기에도 빠뜨리거나 두 번 내지 않는다.
  // n = 깬 시대 수. 15분 뒤에는 시대를 더 바꾸지 않고 남은 적과 불가사리가 계속 쫓는다.
  function endlessStep(state, t, n, tuning) {
    const E = tuning.endless, len = E.segmentSec, out = [];
    if (!state.list) {
      state.list = []; state.next = 0; state.k = 0;
      for (let k = 0; k * len < E.durationSec; k++) {
        if (k) state.list.push({ at: k * len, type: 'cell', k, i: k % Math.max(1, n), loop: Math.floor(k / Math.max(1, n)) });
        state.list.push({ at: k * len + len * E.deputyFraction, type: 'deputy', k, n: k % 2 });
      }
      for (const at of E.generalAt) state.list.push({ at, type: 'general' });
      state.list.push({ at: E.durationSec - E.warningSec, type: 'bulgasariWarn' }, { at: E.durationSec, type: 'bulgasari' });
      state.list.sort((a, b) => a.at - b.at);
    }
    for (const e of step(state, t)) { if (e.k != null) state.k = e.k; out.push(e); }
    return out;
  }
  const actAt = (t, tuning) => Math.min(3, 1 + Math.floor(t / (tuning?.acts?.length ?? ACT)));

  S.acts = { ACT, timeline, start, step, mix, roll, endlessStep, actAt };
})();
