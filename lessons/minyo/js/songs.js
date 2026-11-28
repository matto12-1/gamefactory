// 팔도 장단 곡 자료. 근거는 docs/games/minyo/곡조사.md, 가락은 전래 민요를 새로 연주한다
(function (root) {
  'use strict';
  // ── 「옹헤야」: 국립국악원 1996 민요 표준악보 16의 원래 소리 가락 ──
  // 한 마디 4박: 앞 2박 메기는 소리, 뒤 2박 받는 소리. 음 높이 MIDI(62 D4 · 64 E4 · 67 G4 · 69 A4 · 71 B4)
  const BA_HI = [[2, 1, 67], [3, .5, 69], [3.5, .5, 67]];
  const BA_LO = [[2, 1, 62], [3, .5, 64], [3.5, .5, 64]];
  const BA_LO_TIE = [[2, 1, 62], [3, .5, 64], [3.5, 2.5, 64]];
  const BA_END = [[2, 1, 64]];
  const FALL = [[0, .5, 71], [.5, .25, 69], [.75, .25, 67], [1, .5, 69], [1.5, .5, 67]];
  const SYS_A = [
    { me: '옹헤야', meN: [[0, 1, 67], [1, .5, 69], [1.5, .5, 67]], baN: BA_HI, hit: true },
    { me: '어절시구', meN: FALL, baN: BA_HI, hit: true },
    { me: '저절시구', meN: FALL, baN: BA_HI, hit: true },
    { me: '잘도논다', meN: [[0, .5, 69], [.5, .5, 67], [1, .5, 64], [1.5, .5, 64]], baN: BA_LO_TIE, hit: true },
    { me: '', meN: [], baN: BA_END, hit: false },
  ];
  const SYS_B = [
    { me: '에헤에헤', meN: [[0, .5, 67], [.5, .5, 64], [1, .5, 67], [1.5, .5, 64]], baN: BA_LO, hit: true },
    { me: '어절시구', meN: [[0, .5, 64], [.5, .5, 67], [1, .5, 64], [1.5, .5, 64]], baN: BA_LO, hit: true },
    { me: '잘도논다', meN: [[0, .5, 67], [.5, .5, 64], [1, .5, 64], [1.5, .5, 64]], baN: BA_LO_TIE, hit: true },
    { me: '', meN: [], baN: BA_END, hit: false },
  ];
  const SYS_C = [
    { me: '오뉴월에', meN: [[0, .5, 71], [.5, .5, 69], [1, .5, 69], [1.5, .5, 67]], baN: BA_HI, hit: true },
    { me: '메추리란 놈이', meN: [[0, .5, 71], [.5, .25, 69], [.75, .25, 69], [1, .5, 69], [1.5, .5, 67]], baN: BA_HI, hit: true, gag: 'in' },
    { me: '보리밭에', meN: [[0, .5, 71], [.5, .5, 69], [1, .5, 69], [1.5, .5, 67]], baN: BA_HI, hit: true },
    { me: '알을 낳네', meN: [[0, .25, 69], [.25, .25, 67], [.5, .5, 67], [1, .5, 64], [1.5, .5, 64]], baN: BA_LO_TIE, hit: true, gag: 'lay' },
    { me: '', meN: [], baN: BA_END, hit: false },
  ];
  // 치는 수마다 칠 자리: 세 번은 받는 소리 「옹-헤-야」 글자마다 친다
  const STRIKES = { 0: [], 1: [2], 2: [2, 3], 3: [2, 3, 3.5] };
  const CUES = { 0: null, 1: 'single', 2: 'double', 3: 'triple' };
  // pattern: 치는 수를 마디마다 돌려 쓴다
  function mk(sys, pattern, part) {
    let k = 0;
    return sys.map(b => {
      const n = b.hit ? pattern[k++ % pattern.length] : 0;
      return { ...b, strikes: STRIKES[n], cue: CUES[n], part };
    });
  }
  function ongheBars() {
    const intro = { me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true };
    const demo = (b, n, hint) => ({ ...b, strikes: STRIKES[n], cue: CUES[n], part: '보기', demo: true, hint });
    const DOUBLE = '딱딱 소리가 나면 두 번 쳐요', TRIPLE = '딱 딱딱 소리가 나면 세 번 쳐요';
    // 빨라지는 구간: 두 마디마다 빨라지고 쉬는 마디 없이 달린다
    const FAST_BPM = [100, 100, 106, 106, 112, 112];
    const fast = mk([SYS_A[0], SYS_A[1], SYS_A[2], SYS_B[0], SYS_B[1], { ...SYS_B[2], baN: BA_LO }], [1, 2, 1, 2, 1, 1], 5)
      .map((b, k) => ({ ...b, bpm: FAST_BPM[k], hush: k === FAST_BPM.length - 1 }));
    // 마지막 한 방: 메기는 소리 자리를 비워 숨을 멈췄다가 늘 치던 자리에서 다 같이 친다
    const finale = { me: '다 같이', meN: [], baN: [[2, 1.5, 64]], strikes: [2], cue: 'final', part: 6, outro: true, finale: true, baText: '쾅', bpm: 112 };
    const all = [intro, ...mk(SYS_A, [1], 1), ...mk(SYS_B, [1], 1),
      demo(SYS_B[0], 2, DOUBLE), demo(SYS_B[1], 2, DOUBLE), ...mk(SYS_C, [2], 2),
      ...mk(SYS_B, [2, 1], 3),
      demo(SYS_A[0], 3, TRIPLE), demo(SYS_A[1], 3, TRIPLE), ...mk(SYS_B, [3], 4),
      ...fast, finale];
    return all.map((b, i) => ({ ...b, i }));
  }

  // 어려움 판: 글자 대신 굿거리 장단을 친다. 앞부분은 덩 쿵 쿵 쿵, 다음에 기덕, 그다음에 더러러러가 늘어 끝에는 장단 그대로다
  const GUT_SYL = [0, 2 / 3, 5 / 6, 1, 1.5, 1.625, 1.75, 1.875];
  const GUT_SEGS = [{ lyric: '덩 기덕 쿵 더러러러', syl: GUT_SYL }, { lyric: '쿵 기덕 쿵 더러러러', syl: GUT_SYL.map(s => s + 2) }];
  const GUT_HALF = { 1: [0, 1], 2: [0, 2 / 3, 1], 3: [0, 2 / 3, 1, 1.5], 4: [0, 2 / 3, 1, 1.5] };
  const HARD_HINT = [null, null, '이제 기덕도 쳐요', null, '이제 더러러러도 쳐요', null];
  function kwaejiHardBars() {
    let line = 0, first = true;
    return kwaejiBars().map(b => {
      if (b.call) { const h = HARD_HINT[line++] || undefined; return { ...b, hint: h, holdHint: h, eolHint: undefined }; }
      if (!b.clip) return b;
      const half = GUT_HALF[b.part], stop = b.drumStop === undefined ? 99 : b.drumStop;
      const strikes = [...half, ...half.map(s => s + 2)].filter(s => s < stop);
      const hint = first ? '점이 찍힌 소리에 쳐요' : b.hint; first = false;
      return { ...b, strikes, hint, segs: stop <= 2 ? [GUT_SEGS[0], null] : GUT_SEGS, cue: `g${strikes.length}` };
    });
  }

  // ── 「쾌지나 칭칭나네」: 국립국악원 디지털 음원 조각 V5-017(공공누리 제1유형), 김세윤 · 장효선 ──
  // 조각 하나가 두 장단(한 장단 5초, 한 박 1.25초)이다. 첫 조각과 끝 조각은 받는 소리 둘, 나머지는 메기는 소리 + 받는 소리다
  // 받는 소리의 글자 자리(박): 쾌 0 · 지 1/6 · 나 1/3 · 칭 1 · 칭 5/3 · 나 2 · 네 3. 여덟 토막 모두 모음을 재서 얻음(docs/games/minyo/곡조사.md)
  const KWAE_TEXT = '쾌지나 칭칭나네';
  const KWAE_SYL = [0, 1 / 6, 1 / 3, 1, 5 / 3, 2, 3];
  // 칠 자리: 세 번 쾌 나 네, 네 번 쾌 칭 나 네, 여섯 번은 지만 뺀다(쾌 · 지 · 나가 0.2초 간격이라 아이 손으로 못 친다)
  const P3 = [0, 2, 3], P4 = [0, 1, 2, 3], P6 = [0, 1 / 3, 1, 5 / 3, 2, 3];
  const kwaeBa = (n, half, strikes, part, extra = {}) => ({ clip: `V5-017-00${n}`, half, call: false, me: '', lyric: KWAE_TEXT, syl: KWAE_SYL, meN: [], baN: [[0, 4]], strikes, cue: `p${strikes.length}`, part, ...extra });
  const kwaeMe = (n, lyric, part, extra = {}) => ({ clip: `V5-017-00${n}`, half: 0, call: true, me: lyric, lyric, meN: [[0, 4]], baN: [], strikes: [], cue: null, part, ...extra });
  const SKY_LINE = '청천 하늘에 잔별도 많다', SUN_LINE = '서산에 지는 해를', TIE_LINE = '그 뉘라서 잡아매며', TIME_LINE = '가는 세월을 막을손가';
  function kwaejiBars() {
    const intro = { me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true };
    const finale = { me: '', lyric: '쾅', syl: [0], meN: [], baN: [], strikes: [0], cue: 'final', part: 4, outro: true, finale: true, bpm: 120 };
    const all = [intro,
      // stage: 그 마디가 끝날 때의 무대. 곡이 흐르며 낮 → 노을 → 어스름 → 달밤으로 가고 돌아오지 않는다
      kwaeBa(1, 0, P3, 1), kwaeBa(1, 1, P3, 1),
      kwaeMe(2, SKY_LINE, 1, { hint: '앞사람이 노래할 땐 들어요', holdHint: '앞사람이 부를 땐 꾹 눌러요', eolHint: '줄 끝 쿵 소리에 한 번 쳐요', scene: 'stars', stage: 'day' }), kwaeBa(2, 1, P3, 1, { stage: 'day' }),
      kwaeMe(3, SUN_LINE, 1, { holdHint: '앞사람이 부를 땐 꾹 눌러요', scene: 'sunset', stage: 'sunset' }), kwaeBa(3, 1, P3, 1, { stage: 'sunset' }),
      kwaeMe(4, TIE_LINE, 2, { hint: '이번엔 네 번 쳐요', scene: 'tie', stage: 'sunset' }), kwaeBa(4, 1, P4, 2, { stage: 'sunset' }),
      kwaeMe(5, TIME_LINE, 2, { scene: 'drag', stage: 'dusk' }), kwaeBa(5, 1, P4, 2, { stage: 'dusk' }),
      kwaeMe(2, SKY_LINE, 3, { hint: '이제 여섯 번 쳐요', scene: 'stars', stage: 'night' }), kwaeBa(2, 1, P6, 3, { stage: 'night' }),
      kwaeMe(3, SUN_LINE, 3, { scene: 'moon', stage: 'night' }), kwaeBa(3, 1, P6, 3, { stage: 'night' }),
      kwaeBa(6, 0, P6, 4, { stage: 'night', dance: true }), kwaeBa(6, 1, P6, 4, { hush: true, drumStop: 2, tail: 1.2, stage: 'night' }),
      { ...finale, stage: 'night' }];
    return all.map((b, i) => ({ ...b, i }));
  }

  // ── 「강강술래」: 국립국악원 디지털 음원 조각 V5-040(공공누리 제1유형), 염경애. 진양 → 중중모리 → 자진모리 ──
  // 한 박이 2.5초 → 1.2초 → 0.6초로 두 배씩 빨라진다. 장단 길이가 조각마다 달라 마디마다 조각 안 자리(초)를 적는다
  // 글자 자리는 모음과 ㅅ 소리를 재서 얻은 초. 받는 소리 첫 글자가 곧 마디의 시작이다
  const GG_TEXT = '강강술래';
  // 조각 안 초. 016은 모음 ㅏ → ㅓ → ㅗ → ㅏ와 ㄸ 막힘을 함께 확인했다
  // 다른 여덟 줄은 빠른 모음 전이가 흐려 시작과 끝만 잰다. 근거: gugak-tools/ganggang_call_times.py
  const GG_CALL_TIMES = {
    16: { times: [0.10, 0.55, 3.62, 8.88], vend: 10.30, timedSyllables: true },
    19: { times: [0.10, 4.88], vend: 4.88 }, 20: { times: [0.075, 4.85], vend: 4.85 },
    23: { times: [0.10, 2.53], vend: 2.53 }, 24: { times: [0.075, 2.56], vend: 2.56 },
    25: { times: [0.025, 2.52], vend: 2.52 }, 26: { times: [0.025, 2.48], vend: 2.48 },
    27: { times: [0.05, 2.525], vend: 2.525 }, 28: { times: [0.025, 2.45], vend: 2.45 },
  };
  const ggAt = (n, from, to, rest) => ({ clip: `V5-040-0${n}`, vfrom: from, vlen: to - from, bpm: 240 / (to - from), ...rest });
  const ggMe = (n, to, lyric, part, extra = {}) => {
    const timing = GG_CALL_TIMES[n], first = timing.times[0];
    return ggAt(n, 0, to, { half: 0, call: true, me: lyric, lyric, ...timing, meN: [[first * 4 / to, (timing.vend - first) * 4 / to]], baN: [], strikes: [], cue: null, part, stage: 'night', ...extra });
  };
  function ggBa(n, half, to, times, part, extra = {}) {
    const from = times[0], syl = times.map(t => (t - from) * 4 / (to - from));
    return ggAt(n, from, to, { half, call: false, me: '', lyric: GG_TEXT, syl, meN: [], baN: [[0, 4]], strikes: syl, cue: 'p4', part, stage: 'night', ...extra });
  }
  // 받는 조각은 끝까지 들려준 뒤 그 마디의 한 박을 쉰다. 받는 → 받는, 마지막 쾅 앞에는 넣지 않는다
  const ggRest = b => ({ rest: true, beats: 1, bpm: b.bpm, part: b.part, stage: b.stage, me: '', meN: [], baN: [], strikes: [], cue: null });
  // 2026-11-09, 받아 둔 mp3를 10ms RMS / -45dBFS로 잰 절대 초. 원본 조각 사이의 원래 간격은 제공되지 않는다.
  const VOICE_END = {"V5-040-018":9.83,"V5-040-019":9.57,"V5-040-022":4.98,"V5-040-023":4.94,"V5-040-024":4.78,"V5-040-025":4.7,"V5-040-026":4.76,"V5-040-027":4.79,"V5-054-003":9.6,"V5-054-004":9.75,"V5-054-002":9.69,"V5-054-005":9.67,"V5-054-006":9.48,"V5-054-001":9.88,"V5-022-001":9.97,"V5-022-002":9.92,"V5-022-003":9.85,"V5-022-004":9.76,"V5-022-005":10.28,"V5-019-002":5.19,"V5-019-001":5.31,"V5-019-003":5.45};
  const VOICE_START = {"V5-040-019":0.06,"V5-040-020":0.03,"V5-040-023":0.1,"V5-040-024":0.07,"V5-040-025":0.03,"V5-040-026":0.03,"V5-040-027":0.06,"V5-040-028":0.03,"V5-054-004":0.03,"V5-054-002":0.02,"V5-054-005":0.06,"V5-054-006":0.04,"V5-054-001":0.04,"V5-054-007":0.05,"V5-022-002":0.14,"V5-022-003":0.14,"V5-022-004":0.14,"V5-022-005":0.14,"V5-022-006":0.07,"V5-019-001":0.12,"V5-019-003":0.03,"V5-019-002":0.04};
  function naturalResponse(b, next) {
    const end = VOICE_END[b.clip], head = VOICE_START[next?.clip];
    if (end === undefined || head === undefined) return b;
    const beat = 60 / b.bpm, before = beat * (b.beats || 4), native = b.vfrom + before - end + head;
    // 녹음에 든 짧은 틈은 보존한다. 긴 무음만 덜고, 소리가 마디 밖까지 이어진 곳은 끝까지 기다린다.
    const gap = native < 0 ? .15 : native > .3 ? .25 : native;
    const seconds = end - b.vfrom + gap - head;
    return { ...b, beats: seconds / beat, voiceCut: Math.min(b.voiceCut ?? b.vlen, seconds), audioEnd: end, nextAudioStart: head, responseGap: gap };
  }
  function naturalBars(all) {
    const compact = all.filter(b => !b.rest || b.outro);
    return compact.map((b, i) => ({ ...(b.clip && !b.call && compact[i + 1]?.call ? naturalResponse(b, compact[i + 1]) : b), i }));
  }
  // 메기는 줄은 국립국악원 사설(2026-11-08 조사, docs/games/minyo/refs/sources-2026-11-08)로 맞췄다. 띄어쓰기만 다른 줄은 읽기 쉬운 지금 글을 두고,
  // 020은 2026-11-17 해당 녹음 받아쓰기와 아카이브 34391의 사설을 대조했다. 셋째 줄(021)은 알아들을 수 없어 뺐다(대표 귀 확인)
  const GG_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요', GG_LINE1 = '사래 질고 장찬 밭에', GG_LINE2 = '이영따는 저 처녀야';
  function ganggangBars() {
    const intro = { me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'dusk' };
    const finale = { me: '', lyric: '쾅', syl: [1], meN: [], baN: [], strikes: [1], cue: 'final', part: 4, outro: true, finale: true, bpm: 120, stage: 'night' };
    const all = [intro,
      // 느린 대목: 달 떠온다에 달이 뜬다. 메기는 줄은 016, 받는 줄은 뒤 조각과 바로 이어지는 017
      ggMe(16, 10.7, '달 떠온다', 1, { holdHint: GG_HOLD, scene: 'moon' }),
      ggBa(17, 1, 21.56, [11.35, 13.92, 16, 19.04], 1, { slack: 0.6 }),
      // 중간 대목
      ggBa(18, 0, 5.44, [0.22, 1.44, 2.8, 4.02], 2, { hint: '빨라져요' }), ggBa(18, 1, 9.88, [5.44, 6.62, 7.95, 9.19], 2),
      ggMe(19, 5.17, GG_LINE1, 2), ggBa(19, 1, 9.61, [5.17, 6.33, 7.55, 8.76], 2),
      ggMe(20, 5.13, GG_LINE2, 2), ggBa(20, 1, 9.66, [5.13, 6.39, 7.6, 8.85], 2),
      // 빠른 대목
      ggBa(22, 0, 2.86, [0.09, 0.66, 1.45, 2.1], 3, { hint: '더 빨라져요' }), ggBa(22, 1, 5.05, [2.86, 3.37, 4.08, 4.71], 3),
      ggMe(23, 2.76, '뛰어 보세 뛰어나 보세', 3), ggBa(23, 1, 5.01, [2.76, 3.31, 4, 4.6], 3),
      ggMe(24, 2.67, '높은 마당 짚어나 지고', 3), ggBa(24, 1, 4.83, [2.67, 3.27, 3.96, 4.56], 3),
      ggMe(25, 2.6, '짚은 마당 높아나 지게', 3), ggBa(25, 1, 4.73, [2.6, 3.21, 3.88, 4.47], 3),
      ggMe(26, 2.58, '욱신욱신 뛰어나 보세', 3), ggBa(26, 1, 4.79, [2.58, 3.22, 3.85, 4.43], 3),
      ggMe(27, 2.61, '날이 좋다고 날맞이 놀면', 3), ggBa(27, 1, 4.79, [2.61, 3.28, 3.91, 4.49], 3, { fadeOut: 0.12 }),
      ggMe(28, 2.54, '달이 좋다고 달맞이 놀까', 3), ggBa(28, 1, 4.68, [2.54, 3.18, 3.81, 4.4], 3, { hush: true }),
      finale];
    return naturalBars(all);
  }
  // ring: 손잡은 원 판(js/ring.js). restStage: 시작 창과 연습 마디의 무대. 어려움 판은 없다
  const GANGGANG = {
    work: '놀이 노래', about: '이 노래는 달밤에 손잡고 돌며 불렀어요', bpm: 240 / 4.44, bars: ganggangBars, pungmul: true, ring: true, restStage: 'dusk',
    stamps: [null, '한 바퀴', '두 바퀴', '온 동네'], fullStamp: '달맞이', topStamp: '앞소리꾼', sealDir: 'ganggang', fullSeal: 5,
    startLine: '달 떠온다',
    credit: '소리 국립국악원 디지털 음원, 염경애 (공공누리 제1유형)',
    // 내가 맞히면 발 구르기, 원 사람들이 함께 딛는 소리
    voice: { files: [16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28].map(n => `V5-040-0${n}`), bar: 4.44, grid: 0, pre: 0.08, gain: 1.4, hit: 'step', npcHit: 'step-soft' },
    doubles: [{ at: 8, delay: 0.018, rate: 1.004, pan: -0.55, gain: 0.5 }, { at: 28, delay: 0.034, rate: 0.996, pan: 0.55, gain: 0.45 }],
    drum: [], // 녹음에 없는 장구를 얹지 않는다
    practiceBar: { ...ggBa(18, 1, 9.88, [5.44, 6.62, 7.95, 9.19], '연습'), i: -1 }, practiceCall: { ...ggMe(19, 5.17, GG_LINE1, '연습'), i: -1, holdHint: GG_HOLD }, hint: '구슬이 글자에 닿을 때 쳐요', missSay: { early: '일찍 쳤어요', late: '늦게 쳤어요' }, // 일찍 · 늦음 글도 안내와 같은 손 이름으로(그래프 검수 9회차 R2-01)
    practiceRest: null,
    say: { zero: '손도 못 잡아 봤구먼', 1: '원이 겨우 돌아가네', 2: '원이 제법 빨리 도네', 3: '온 동네가 손을 잡았네!', full: '달이 지도록 돌겠네!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: '앞소리꾼이 부를 땐 꾹 눌러요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 쳐요', none: '‘강’에 두 번 치고 ‘술’과 ‘래’에 한 번씩 쳐요' },
  };

  // 월월이: 모음이 열리는 때를 0.01초까지 잰다. 받는 소리 큰박 평균은 0.67초
  const WOL_TEXT = '월월이 청청', WOL_BEAT = .67;
  const WOL_ROWS = [
    [2, '달아 달아 밝은 달아', [.08, .52, .74, 1.18, 1.40, 1.58, 2.07, 2.48], 2.71, [2.71, 3.39, 3.77, 4.04, 4.71], 5.788140589569161],
    [1, WOL_TEXT, [.10, .80, 1.18, 1.51, 2.16], 2.60, [2.80, 3.53, 3.84, 4.17, 4.81], 5.538548752834467],
    [3, '저 달 속에 계수나무', [.09, .355, .525, .895, 1.415, 1.68, 2.105, 2.37], 2.75, [2.75, 3.41, 3.77, 4.09, 4.78], 7.09265306122449],
  ];
  function wolMe(row, part) {
    const [n, lyric, times, vend, at] = row, len = at[0];
    return { clip: `V5-019-00${n}`, half: 0, vfrom: 0, vlen: len, bpm: 60 / WOL_BEAT, beats: len / WOL_BEAT,
      call: true, me: lyric, lyric, times, vend, timedSyllables: times.length > 2, meN: [[times[0] / WOL_BEAT, (vend - times[0]) / WOL_BEAT]], baN: [], strikes: [], cue: null,
      part, stage: part === 1 ? 'dusk' : 'night', holdHint: n === 2 ? GG_HOLD : undefined, twist: n === 1 };
  }
  // 녹음 자르기(at[0], 소리 이음매)는 두고 칠 곳만 소리가 실제로 터지는 때로 늦춘다. 001 · 003 첫 「월」은 메김 끝에 붙어 여럿이 받아 들어오는 소리보다
  // 55~95ms 일렀다(RMS 오름 · 300~3000Hz 스펙트럼 오름 두 방법 가운데 값, 곡별 검수 05 R1-04). 001 첫 「청」도 35~42ms 일렀다
  const WOL_HIT_SHIFT = { 1: [.06, 0, 0, .04, 0], 3: [.06, 0, 0, 0, 0] };
  function wolBa(row, part) {
    const [n, , , , at, to] = row, from = at[0], short = n === 3 && part < 3, shift = WOL_HIT_SHIFT[n] || [];
    const end = short ? at[4] + WOL_BEAT : to, len = end - from, syl = at.map((t, i) => (t + (shift[i] || 0) - from) / WOL_BEAT);
    const strikes = (part === 1 ? [0, 3] : [0, 1, 3, 4]).map(i => syl[i]);
    return { clip: `V5-019-00${n}`, half: 1, vfrom: from, vlen: len, bpm: 60 / WOL_BEAT, beats: len / WOL_BEAT,
      call: false, me: '', lyric: WOL_TEXT, syl, meN: [], baN: [[0, len / WOL_BEAT]], strikes, cue: `p${strikes.length}`, part, stage: part === 1 ? 'dusk' : 'night',
      ...(short ? { voiceCut: len, fadeOut: .12 } : {}),
      ...(n === 3 && part === 3 ? { finale: true, finaleBeat: strikes.at(-1) } : {}) };
  }
  function wolwolBars() {
    const all = [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'dusk' }];
    for (let part = 1; part <= 3; part++) WOL_ROWS.forEach((row, j) => {
      const ba = wolBa(row, part);
      all.push(wolMe(row, part), ba, { ...ggRest(ba), ...(part === 3 && j === 2 ? { outro: true } : {}) });
    });
    return naturalBars(all);
  }
  const WOLWOL = {
    work: '놀이 노래', about: '이 노래는 대보름 밤에 손잡고 돌며 불렀어요', level: '보통', bpm: 60 / WOL_BEAT, bars: wolwolBars,
    pungmul: true, ring: true, ringArt: 'wolwol', restStage: 'dusk', goodEarly: .124, goodLate: .124,
    sameWordHold: { clip: 'V5-019-001', seconds: 1.8 }, roundHint: { part: 2, before: 1.2, after: 2.4 },
    stamps: [null, '불씨', '모닥불', '온 동네'], fullStamp: '대보름', topStamp: '앞소리꾼', sealDir: 'wolwol', fullSeal: 5,
    startLine: '달아 달아 밝은 달아', credit: '소리 국립국악원 디지털 음원, 김세윤 · 장효선 (공공누리 제1유형)',
    voice: { files: [1, 2, 3].map(n => `V5-019-00${n}`), bar: WOL_BEAT * 4, grid: 0, pre: .08, gain: 1.4, hit: 'step', npcHit: 'step-soft' }, drum: [],
    doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 20, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceBar: { ...wolBa(WOL_ROWS[0], 1), part: '연습', cue: 'p4', i: -1, stage: 'dusk' }, practiceCall: { ...wolMe(WOL_ROWS[0], '연습'), i: -1, stage: 'dusk', holdHint: GG_HOLD },
    practiceRest: null, hint: '구슬이 글자에 닿을 때 쳐요', releaseHint: '구슬이 ‘월’에 닿을 때 떼요', missSay: { early: '일찍 쳤어요', late: '늦게 쳤어요' },
    say: { zero: '달집에 불이 안 붙었네', 1: '달집에 불씨가 붙었네', 2: '달집이 활활 타네', 3: '온 동네가 달맞이 나왔네!', full: '올해 대보름 달이 제일 밝구나!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: GG_HOLD, early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 쳐요', none: '‘월’과 ‘청’에 한 번씩 쳐요' },
    roundTips: ['‘월’과 ‘청’에 한 번씩 쳐요', '‘월’에 두 번 치고 ‘청’에 두 번 쳐요'],
  };

  // 제주 그물 당기기: 조각 안에서 잰 초를 그대로 두고, 받는 소리 뒤 한 박 쉰다
  // 받는 소리 글은 국악원 사설 「엉허야 뒤야」(2026-11-08 조사). 「허」는 길게 늘여 부르고 「야」는 치지 않는다
  const MEL_TEXT = '엉허야 뒤야', MEL_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요';
  // 2026-11-21 밤 대표 귀 확인: 2마디(003) · 14마디(007) 「뒤」가 일러서 95 · 110ms 뒤로(7.24 → 7.335, 7.30 → 7.41)
  const MEL_ROWS = [
    [3, '당선에서 멜발을 보고', [0.03, 4.86], 4.86, [4.86, 6.14, 6.70, 7.335, 8.46], 9.610, 'teu'],
    [4, '망선에서 후림을 노라', [0.02, 4.64], 4.64, [4.87, 6.24, 6.78, 7.35, 8.53], 9.833, 'floats'],
    [2, '어기여뒤여 방애여', [0, .27, .45, 1.24, 1.65, 2.46, 3.22, 3.65], 4.74, [4.85, 6.18, 6.78, 7.34, 8.53], 9.695],
    [5, '서깨코라근 소여콧들로', [.12, 4.92], 4.92, [4.92, 6.25, 6.87, 7.38, 8.54], 9.707],
    [6, '동깨코라근 등곱은 여로', [.04, 4.67], 4.67, [4.84, 6.15, 6.76, 7.29, 8.48], 9.514],
    [1, MEL_TEXT, [.05, 1.19, 1.94, 2.58, 3.82], 5.05, [5.05, 6.36, 6.98, 7.54, 8.71], 9.893],
    [7, '어기여뒤여 방애여', [.03, .28, .49, 1.26, 1.68, 2.50, 3.28, 3.72], 4.67, [4.87, 6.15, 6.68, 7.41, 8.77], 11.793],
  ];
  function melMe(row, part = 1) {
    const [n, lyric, times, vend, at, , scene] = row, len = at[0], beat = len / 4;
    return { clip: `V5-054-00${n}`, half: 0, vfrom: 0, vlen: len, bpm: 60 / beat, call: true, me: lyric, lyric, times, vend, timedSyllables: times.length > 2,
      meN: [[times[0] / beat, (vend - times[0]) / beat]], baN: [], strikes: [], cue: null, part, stage: 'morning', scene, holdHint: part === '연습' || n === 3 ? MEL_HOLD : undefined };
  }
  function melBa(row, part = 1) {
    const [n, , , , at, to] = row, from = at[0], len = to - from, beat = n === 7 ? 1.285 : len / 4;
    const syl = at.map(t => (t - from) / beat); // 엉 · 허 · 야 · 뒤 · 야
    const strikes = [0, 1, 3, 4].map(i => syl[i]);
    return { clip: `V5-054-00${n}`, half: 1, vfrom: from, vlen: len, bpm: 60 / beat, beats: len / beat, call: false, me: '', lyric: MEL_TEXT, syl,
      meN: [], baN: [[0, len / beat]], strikes, cue: 'p4', part, stage: 'morning',
      ...(n === 7 ? { finale: true, finaleBeat: strikes[3], outro: true } : {}) };
  }
  function myeolchiBars() {
    const all = [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'dawn' }];
    MEL_ROWS.forEach((r, i) => { const ba = melBa(r); all.push(melMe(r), ba); if (i < 6) all.push(ggRest(ba)); });
    return naturalBars(all);
  }
  const MYEOLCHI = {
    work: '일노래', about: '이 노래는 바닷가에서 멜(멸치) 그물을 당기며 불렀어요', level: '보통', bpm: 240 / 4.963, bars: myeolchiBars, pungmul: true, net: true, heroArt: 'myeolchi', restStage: 'dawn', goodEarly: .091, goodLate: .15,
    sameWordHold: { clip: 'V5-054-001', seconds: 3.4 },
    stamps: [null, '한 바가지', '한 구덕', '온 동네'], fullStamp: '멜 풍년', topStamp: '앞소리꾼', sealDir: 'myeolchi', fullSeal: 5,
    startLine: '당선에서 멜발을 보고', credit: '소리 국립국악원 디지털 음원, 강효주 · 김세윤 (공공누리 제1유형)',
    voice: { files: [1, 2, 3, 4, 5, 6, 7].map(n => `V5-054-00${n}`), bar: 4.963, grid: 0, pre: .08, gain: 1.4, hit: 'pull', npcHit: 'pull-soft' },
    doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 20, delay: .034, rate: .996, pan: .55, gain: .45 }], drum: [],
    practiceBar: { ...melBa(MEL_ROWS[1], '연습'), i: -1 }, practiceCall: { ...melMe(MEL_ROWS[2], '연습'), i: -1 }, practiceRest: null,
    hint: '구슬이 글자에 닿을 때 쳐요', releaseHint: '‘엉’에 닿으면 떼요', missSay: { early: '일찍 쳤어요', late: '늦게 쳤어요' },
    say: { zero: '그물이 꿈쩍도 안 하네', 1: '멸치 한 바가지 건졌네', 2: '구덕에 멸치가 가득하네', 3: '온 동네가 나눠 먹겠네!', full: '올해는 멜 풍년이로구나!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: MEL_HOLD, releaseEarly: '구슬이 ‘엉’에 닿을 때 떼요', releaseLate: '구슬이 ‘엉’에 닿을 때 떼요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 쳐요', none: '‘엉’과 ‘허’, ‘뒤’와 ‘야’에 한 번씩 쳐요' },
  };

  // 거문도: 박은 녹음 꼬리와 따로 센다. 귀 확인 뒤 메기는 글은 이 표에서 바꾼다
  // 받는 소리 「어야 디야」는 국악원 사설과 소리가 같고 옛 글자만 달라 읽기 쉬운 글을 둔다. 005의 새 받는 소리는 사설에서 못 찾아(2026-11-08 조사) 「♪」로 둔다
  const GEO_TEXT = '어야 디야', GEO_TWIST = '♪ ♪ ♪', GEO_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요';
  const GEO_ROWS = [
    [1, GEO_TEXT, [.13, 1.38, 2.67, 3.89], 4.69, [5.14, 6.38, 7.67, 8.85], 9.85, 10.712],
    [2, '♪', [.11, 5.15], 5.15, [5.15, 6.36, 7.65, 8.86], 9.63, 10.987],
    [3, '♪', [.13, 5.21], 5.21, [5.21, 6.37, 7.65, 8.84], 9.80, 11.050],
    [4, '♪', [.12, 5.14], 5.14, [5.14, 6.32, 7.68, 8.80], 9.55, 10.685],
    [5, '♪', [.12, 5.12], 5.12, [5.12, 5.96, 6.37, 6.77, 7.22, 8.90], 10.27, 11.687], // 메기는 글자 시각(잰 값): .12 .97 1.36 1.79 2.24 3.94
    [6, GEO_TEXT, [.06, 1.23, 2.55, 3.71], 4.83, [5.05, 6.29, 7.54, 8.85], 10.52, 11.945],
  ];
  function geoMe(row, part = 1) {
    const [n, lyric, times, vend, at] = row, len = at[0];
    return { clip: `V5-022-00${n}`, half: 0, vfrom: 0, vlen: len, bpm: 48, beats: len / 1.25, call: true, me: lyric, lyric, times, vend, timedSyllables: times.length > 2,
      meN: [[times[0] / 1.25, (vend - times[0]) / 1.25]], baN: [], strikes: [], cue: null, part, stage: 'day',
      holdHint: part === '연습' || n === 1 ? GEO_HOLD : undefined };
  }
  function geoBa(row, part = 1) {
    const [n, , , , at, vend, to] = row, from = at[0];
    const syl = (n === 5 ? [at[0], at[2], at[5]] : at).map(t => (t - from) / 1.25); // 005는 「어 · 여 · 야」 세 자리만 친다
    const strikes = syl;
    return { clip: `V5-022-00${n}`, half: 1, vfrom: from, vlen: to - from, bpm: 48, beats: n === 6 ? (to - from) / 1.25 : 4,
      call: false, me: '', lyric: n === 5 ? GEO_TWIST : GEO_TEXT, syl, meN: [], baN: [[0, (vend - from) / 1.25]], strikes, cue: `p${strikes.length}`, part, stage: 'day',
      ...(n === 5 ? { voiceCut: 6.25, fadeOut: .12, twist: true } : {}),
      ...(n === 6 ? { finale: true, finaleBeat: strikes.at(-1), outro: true, endAt: vend - from, voiceCut: vend - from + .6, fadeOut: .12 } : {}) };
  }
  function geomunBars() {
    const all = [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }];
    GEO_ROWS.forEach((r, i) => { const ba = geoBa(r); all.push(geoMe(r), ba); if (i < 5) all.push(ggRest(ba)); });
    return naturalBars(all);
  }
  const GEOMUN = {
    work: '일노래', about: '이 노래는 고깃배에서 노를 저으며 불렀어요', level: '보통', bpm: 48, bars: geomunBars, pungmul: true, boat: true, heroArt: 'geomun', restStage: 'day', goodEarly: .104, goodLate: .15,
    stamps: [null, '한 마리', '한 망태', '온 동네'], fullStamp: '만선', topStamp: '앞소리꾼', sealDir: 'geomun', fullSeal: 5,
    startLine: GEO_TEXT, credit: '소리 국립국악원 디지털 음원, 조정희 (공공누리 제1유형)',
    voice: { files: [1, 2, 3, 4, 5, 6].map(n => `V5-022-00${n}`), bar: 5, grid: 0, pre: .08, gain: 1.4, hit: 'row', npcHit: 'row-soft' }, drum: [],
    doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 16, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceBar: { ...geoBa(GEO_ROWS[1], '연습'), i: -1 }, practiceCall: { ...geoMe(GEO_ROWS[0], '연습'), i: -1 }, practiceRest: null,
    hint: '구슬이 글자에 닿을 때 저어요', releaseHint: '구슬이 ‘어’에 닿을 때 떼요',
    missSay: { early: '일찍 저었어요', late: '늦게 저었어요' }, // 일찍 · 늦음 알림도 젓는 손 이름으로(그래프 검수 3회차 R3-04, 자진뱃노래와 같은 말)
    say: { zero: '배가 제자리에서 맴도네', 1: '고기 한 마리 건졌네', 2: '망태에 고기가 그득하네', 3: '온 동네 잔치를 하겠네!', full: '만선이다! 깃발 올려라!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: GEO_HOLD, releaseEarly: '구슬이 ‘어’에 닿을 때 떼요', releaseLate: '구슬이 ‘어’에 닿을 때 떼요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 저어요', extra: '점이 찍힌 글자에만 저어요', none: '‘어’와 ‘야’, ‘디’와 ‘야’에 한 번씩 저어요' },
  };

  // 광주시립창극단 09:17.78~10:37.78. 장단 머리(덩)는 목소리를 뺀 반주에서 「덩 · 덕」 짝(두 소박, 약 0.43초)으로 재고(측정 쏠림 +37ms 바로잡음), 큰박은 장단을 넷으로 나눈다.
  // 짜임은 국립국악원 자진뱃노래 오선보(국악사전 842): 마디 6장단 = 메김 2장단 반 + 받음 「어야디야」 반 장단, 두 번. 후렴 11장단. refs/jajin/timing.json.
  const JAJIN_HEADS = [0,2.687,5.347,8.087,10.857,13.617,16.347,19.01,21.674,24.337,27.007,29.657,32.377,35.067,37.707,40.442,43.177,45.967,48.637,51.267,54.027,56.717,59.367,62.107,64.807,67.507,70.207,72.867,75.517,78.167,80.817];
  const jajinAt = (k, q = 0) => Math.min(80, Math.round((JAJIN_HEADS[k] + q * (JAJIN_HEADS[k + 1] - JAJIN_HEADS[k]) / 4) * 1000) / 1000);
  const JAJIN_GRID = JAJIN_HEADS.slice(0, -1).flatMap((_, k) => [0, 1, 2, 3].map(q => jajinAt(k, q))).filter(t => t < 80);
  const JAJIN_FILE = 'jajin.32bcd82cbb79', JAJIN_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요';
  // 글자 자리 [장단, 큰박]. 어야디야는 길게-짧게 두 큰박, 어허야디야는 다섯 글자가 두 큰박.
  const JB = (k, q) => [[k, q], [k, q + 2 / 3], [k, q + 1], [k, q + 5 / 3]];
  const JH = (k, q) => [[k, q], [k, q + 1 / 3], [k, q + 2 / 3], [k, q + 1], [k, q + 4 / 3]];
  const JC = (k, lyric, qs) => ({ from: [k, 0], to: [k + 1, 0], chorus: true, lyric, sy: qs.map(q => [k, q]), hit: [[k, 0], [k, 2]] });
  const JR = (k, q, lyric, sy) => ({ from: [k, q], to: [k + 1, 0], lyric, sy, hit: [[k, q], [k, q + 1]] });
  const JAJIN_ROWS = [
    { from: [0, 0], to: [2, 2], call: true, lyric: '달은 밝고 명랑한데', sy: [[0, 0], [0, .5], [0, 1], [0, 5 / 3], ...JB(2, 0)] },
    JR(2, 2, '어야디야', JB(2, 2)),
    { from: [3, 0], to: [5, 2], call: true, lyric: '고향 생각 절로 난다', sy: [[3, 0], [3, .5], [3, 1], [3, 5 / 3], ...JB(5, 0)] },
    JR(5, 2, '어야디야', JB(5, 2)),
    { from: [6, 0], to: [6, 2], call: true, lyric: '어허야디야', sy: JH(6, 0) },
    JR(6, 2, '어허야디야', JH(6, 2)),
    JC(7, '어기야디여', [0, .5, 1, 1.5, 2]), JC(8, '어어', [0, 2]), JC(9, '에헤', [0, 2]), JC(10, '에헤', [0, 2]), JC(11, '어허 어허', [0, 1, 2, 3]),
    JC(12, '아아', [0, 2]), JC(13, '아아', [0, 2]), JC(14, '에헤 에헤', [0, 1, 2, 3]), JC(15, '어허야 어허야', [0, 2 / 3, 1, 2, 8 / 3, 3]),
    { from: [16, 0], to: [16, 2], call: true, lyric: '어야디야', sy: JB(16, 0) },
    JR(16, 2, '어야디야', JB(16, 2)),
    { from: [17, 0], to: [19, 2], call: true, lyric: '♪' },
    JR(19, 2, '어야디야', JB(19, 2)),
    { from: [20, 0], to: [22, 2], call: true, lyric: '♪' },
    JR(22, 2, '어야디야', JB(22, 2)),
    { from: [23, 0], to: [23, 2], call: true, lyric: '어허야디야', sy: JH(23, 0) },
    JR(23, 2, '어허야디야', JH(23, 2)),
    JC(24, '어기야디여', [0, .5, 1, 1.5, 2]), JC(25, '어어', [0, 2]), JC(26, '에헤', [0, 2]), JC(27, '에헤', [0, 2]), JC(28, '어허 어허', [0, 1, 2, 3]),
    { from: [29, 0], to: null, chorus: true, lyric: '아', sy: [[29, 0]], hit: [[29, 0]] },
  ];
  function jajinDef(r, part = 1) {
    const beat = .675, from = jajinAt(...r.from), to = r.to ? jajinAt(...r.to) : 80, len = to - from;
    const sec = p => Math.round((jajinAt(...p) - from) * 1e6) / 1e6, bt = p => Math.round(sec(p) / beat * 1e6) / 1e6;
    return {clip:JAJIN_FILE,half:0,vfrom:from,vlen:len,bpm:60/beat,beats:len/beat,call:!!r.call,me:r.call?r.lyric:'',lyric:r.lyric,
      times:r.call?(r.lyric==='♪'?[0,len]:r.sy.map(sec)):undefined,vend:len,timedSyllables:!!r.call&&r.lyric!=='♪',
      meN:r.call?[[0,len/beat]]:[],baN:r.call?[]:[[0,len/beat]],syl:r.call?undefined:r.sy.map(bt),strikes:r.call?[]:r.hit.map(bt),cue:null,part,stage:'day',chorus:!!r.chorus,holdHint:r.call?JAJIN_HOLD:undefined};
  }
  function jajinBars(src=JAJIN_ROWS){
    const rows=src.map(r=>jajinDef(r));const fin=rows.at(-1);Object.assign(fin,{outro:true,finale:true,finaleBeat:fin.strikes.at(-1),endAt:fin.vlen});
    return [{me:'',meN:[],baN:[],strikes:[],cue:null,part:0,intro:true,bpm:120,stage:'day'},...rows].map((b,i)=>({...b,i}));
  }
  // 어려움 판 「장단 큰박」(2026-11-20 판 20): 후렴 장단은 받는 글 대신 큰박 넷을 「덩 쿵 덩 쿵」으로 보이고 넷 다 젓는다(칠 곳 43 → 71). 어야디야 받음은 원래도 큰박 둘(어 · 디)이라 그대로.
  // 입말은 국악사전 「자진모리장단」 표1 둘째 줄 글(덩 . 더 | 쿵 더 . | 덩 . 더 | 쿵 더 .)의 큰박 자리. 녹음 장구는 큰박 앞 덕이 세고 둘째 · 넷째 큰박 소리는 약해서,
  // 자리는 장단 머리를 넷으로 나눈 값 그대로 쓴다(docs/games/minyo/refs/jajin/hard-beats-2026-11-20.md). 메김의 꾹 안내는 뺀다(어려움 판은 꾹 표시가 없다). 후렴 바로 앞 받음에 새 안내.
  const JAJIN_HARD_HINT='이제 큰박마다 저어요';
  function jajinHardBars(){
    const bars=jajinBars(JAJIN_ROWS.map(r=>r.chorus&&r.to?{...r,lyric:'덩 쿵 덩 쿵',sy:[0,1,2,3].map(q=>[r.from[0],q]),hit:[0,1,2,3].map(q=>[r.from[0],q])}:r));
    return bars.map((b,i)=>b.call?{...b,holdHint:undefined}:!b.chorus&&bars[i+1]?.chorus&&!bars[i+1].finale?{...b,hint:JAJIN_HARD_HINT}:b);
  }
  const JAJIN = {
    work:'뱃놀이',about:'강에 배를 띄우고 자진뱃노래를 불러요',level:'보통',bpm:60/.675,bars:jajinBars,pungmul:true,boat:true,heroArt:'jajin',
    hardBars:jajinHardBars,hardStamp:'사공',hardLabel:'장단 큰박',hardSeal:6,
    startWork:'강 뱃놀이',
    // 어려움 판은 칠 곳이 43 → 71이라 기슭 구경꾼이 서는 맞힘 수도 같은 비율로 늘린다
    boatScene:{river:true,steps:[6,13,19,25,32],hardSteps:[10,21,31,41,53],boatY:69,cast:[['rower-c',134],['rower-a',160],['hero',186],['rower-b',212],['leader',234]],
      positions:{LEAD:{x:234,y:118,dir:1,bx:0},FOLLOW:{x:212,y:118,dir:1},HERO:{x:186,y:118,dir:1,bx:4}}},
    goodEarly:.095,goodLate:.135,stamps:[null,'한 노','한 굽이','온 동네'],fullStamp:'뱃놀이',topStamp:'앞소리꾼',sealDir:'jajin',fullSeal:5,
    // 11-11 도장 파일은 4 = 뱃놀이, 5 = 앞소리꾼 그림이고(refs/seals-2026-11-11/names.json) 게임은 4 = 앞소리꾼, 5 = 다 맞힘이라 바꿔 잇는다(풍구 · 자진아리 · 신고산과 같은 꼴)
    sealFiles:{1:'art/jajin/seal-1.ca8d0da11629.png',2:'art/jajin/seal-2.88d1b4c5e0db.png',3:'art/jajin/seal-3.98107ce2b7b1.png',4:'art/jajin/seal-5.05c83822ba05.png',5:'art/jajin/seal-4.1afc4d20836d.png',6:'art/jajin/seal-6.c9de18bd447a.png'},
    startLine:'달은 밝고',credit:'소리 광주시립창극단, 이호연·이기옥·김보연, 장단 김청만 (CC BY 표시)',
    voice:{files:[JAJIN_FILE],continuous:true,duration:80,bar:2.7,grid:0,pre:0,gain:1.4,hit:'row',npcHit:'row-soft'},drum:[],doubles:[],
    practiceCall:{...jajinDef(JAJIN_ROWS[4],'연습'),i:-1},practiceBar:{...jajinDef(JAJIN_ROWS[5],'연습'),i:-1},practiceRest:null,
    // ‘어’와 「에」 사이는 끊지 않는다(U+FEFF, 줄바꿈 갈래 WJ · 함렛 검사에서는 빈칸). 세로 폰 안내 칸(160px)에서 「구슬이 ‘어’ / 에 닿을 때 떼요」로 꺾였음(곡별 검수 06 R1-02)
    hint:'구슬이 글자에 닿을 때 저어요',releaseHint:'구슬이 ‘어’﻿에 닿을 때 떼요',
    say:{zero:'아직 나루에 못 닿았네',1:'노를 한 번 저었네',2:'강굽이를 지났네',3:'기슭에서 손을 흔드네',full:'나루에 닿았다!',top:'다음 앞소리를 메겨라!',hard:'우리 배 사공 났네!'},
    tips:{spoiled:JAJIN_HOLD,early:'구슬이 글자에 닿을 때까지 기다려요',late:'구슬이 글자에 닿으면 바로 저어요', extra: '점이 찍힌 글자에만 저어요',none:'받는 소리에 맞춰 저어요'},
    // 안내 · 끝 조언이 「저어요」라 틀림 글도 같은 동사로(곡별 검수 06 R1-06)
    missSay:{early:'일찍 저었어요',late:'늦게 저었어요'},
  };

  // 충청 의당 가래질: 국립민속박물관 「공주 의당지터다지기」 06:36~07:58.44 한 흐름. 큰박은 타격음으로 잰 57박(refs/garae/percussion-grid.json).
  // 메김 한 장단 · 받음 한 장단. 받음 「어허넝청 가래로세」는 잰 박 3번부터 8박마다(목소리 숨 틈 · 받아쓰기 시작 시각 · 국악사전 958 악보로 맞춤, 2026-11-11).
  const GARAE_FILE = 'garae-main.1c377aad1e79', GARAE_TEXT = '어허넝청 가래로세', GARAE_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요', GARAE_END = 81.002;
  const GARAE_BEATS = [0.33,1.783,3.235,4.723,6.21,7.68,9.15,10.631,12.113,13.587,15.062,16.511,17.96,19.438,20.915,22.412,23.91,25.333,26.755,28.241,29.727,31.228,32.728,34.221,35.715,37.187,38.66,40.13,41.6,43.088,44.575,45.98,47.385,48.878,50.37,51.835,53.3,54.753,56.205,57.643,59.08,60.515,61.95,63.445,64.94,66.405,67.87,69.345,70.82,72.293,73.765,75.12,76.68,78.128,79.575,81.002,82.43];
  // 2026-11-21 밤 대표 귀 확인: 14마디 「어」(51번 박)가 늦어 박 잣대 값 103ms만큼 앞으로(75.223 → 75.12)
  const garaeAt = b => { const i = Math.min(GARAE_BEATS.length - 2, Math.floor(b)); return Math.round((GARAE_BEATS[i] + (b - i) * (GARAE_BEATS[i + 1] - GARAE_BEATS[i])) * 1000) / 1000; };
  const GARAE_CALLS = ['춘분지절 좋은 때에', '터를 닦는 이 집터는', '♪', '♪', '해동이라 조선국의', '밝은 기상 받아들여', '천년 만년 대를 이어'];
  // 받음 글자 자리(큰박): 어 · 허 · 넝 · 청 · 가 · 래 · 로 · 세. 칠 곳은 큰박마다 어 · 넝 · 가 · 세
  const GARAE_SY = [0, 1 / 3, 1, 5 / 3, 2, 7 / 3, 8 / 3, 3], GARAE_HIT = [0, 2, 4, 7];
  function garaeDef(k, call, part = 1) {
    const b0 = call ? 8 * k - 1 : 8 * k + 3, from = b0 < 0 ? 0 : garaeAt(b0), to = Math.min(GARAE_END, garaeAt(b0 + 4)), len = Math.round((to - from) * 1000) / 1000;
    const beat = (garaeAt(b0 + 4) - garaeAt(Math.max(0, b0))) / (b0 < 0 ? 3 : 4);
    const syl = call ? undefined : GARAE_SY.map(q => Math.round((garaeAt(b0 + q) - from) / beat * 1e6) / 1e6);
    const lyric = call ? GARAE_CALLS[k] : GARAE_TEXT;
    return { clip: GARAE_FILE, half: 0, vfrom: from, vlen: len, bpm: 60 / beat, beats: len / beat, call, me: call ? lyric : '', lyric,
      times: call ? [0, len] : undefined, vend: len, timedSyllables: false, meN: call ? [[0, len / beat]] : [], baN: call ? [] : [[0, len / beat]],
      syl, strikes: call ? [] : GARAE_HIT.map(i => syl[i]), cue: null, part, stage: 'day', holdHint: call ? GARAE_HOLD : undefined };
  }
  function garaeBars() {
    const rows = []; for (let k = 0; k < 7; k++) rows.push(garaeDef(k, true), garaeDef(k, false));
    const fin = rows.at(-1); Object.assign(fin, { outro: true, finale: true, finaleBeat: fin.strikes.at(-1), endAt: fin.vlen });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const GARAE = {
    work: '일노래', about: '이 노래는 집터에서 큰 삽인 가래로 흙을 퍼내며 불렀어요', level: '쉬움', bpm: 60 / 1.47, bars: garaeBars, pungmul: true, net: true, heroArt: 'garae',
    startWork: '집터 가래질', netScene: { yard: true }, restStage: 'day', goodEarly: .095, goodLate: .15,
    stamps: [null, '한 삽', '한 무더기', '온 동네'], fullStamp: '집터', topStamp: '앞소리꾼', sealDir: 'garae', fullSeal: 5,
    // 파일 4 = 집터, 5 = 앞소리꾼 그림이라 게임 번호(4 앞소리꾼, 5 다 맞힘)에 바꿔 잇는다(refs/seals-2026-11-11/names.json)
    sealFiles: {1:'art/garae/seal-1.bf85183ba7f5.png',2:'art/garae/seal-2.0be5462dce93.png',3:'art/garae/seal-3.c667deb1542e.png',4:'art/garae/seal-5.c8943d29c6a4.png',5:'art/garae/seal-4.afbc64340b37.png'},
    // 영상 제목 그대로 따옴표로(노래책 1쪽 「이 게임 소리」와 같은 표기, 곡별 검수 07 R1-07)
    startLine: '춘분지절 좋은 때에', credit: '소리 국립민속박물관, ‘공주 의당지터다지기’ 영상 (CC BY 표시)',
    voice: { files: [GARAE_FILE], continuous: true, duration: GARAE_END, fadeOut: .25, bar: 5.88, grid: 0, pre: 0, gain: 1.4, hit: 'pull', npcHit: 'pull-soft' }, drum: [], doubles: [],
    practiceCall: { ...garaeDef(1, true, '연습'), i: -1 }, practiceBar: { ...garaeDef(1, false, '연습'), i: -1 }, practiceRest: null,
    // ‘어’와 「에」 사이는 끊지 않는다(U+FEFF). 안내가 말풍선 위 세로 폰 160px 칸에 붙어 「구슬이 ‘어’ / 에 닿을 때 떼요」로 꺾일 수 있다(곡별 검수 07 R1-01 · 06 R1-02와 같은 꼴)
    hint: '구슬이 글자에 닿을 때 당겨요', releaseHint: '구슬이 ‘어’﻿에 닿을 때 떼요',
    say: { zero: '흙이 꿈쩍도 안 하네', 1: '흙을 한 삽 떴네', 2: '흙 무더기가 생겼네', 3: '온 동네가 집터에 모였네!', full: '집터 흙을 다 퍼냈다!', top: '다음 앞소리는 네가 메겨라!' },
    // 뗀 실수는 「일찍 뗐어요」로 알리고 끝 도움말도 뗀 실수를 센다(멸치 · 거문도와 같은 꼴). 받음 손은 「당겨요」(곡별 검수 07 R1-02)
    tips: { spoiled: GARAE_HOLD, releaseEarly: '구슬이 ‘어’﻿에 닿을 때 떼요', releaseLate: '구슬이 ‘어’﻿에 닿을 때 떼요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 당겨요', extra: '점이 찍힌 글자에만 당겨요', none: '‘어’와 ‘넝’, ‘가’와 ‘세’에 한 번씩 당겨요' },
    missSay: { early: '일찍 당겼어요', late: '늦게 당겼어요' }, spoilSay: '앞소리꾼 차례에 당겼어요',
    // 세로 폰 메김 칸(122px)에서 「터를 닦는 이 / 집터는」으로 「이」가 떨어졌다. 「이 집터는」은 한 줄에(곡별 검수 07 R2-05)
    callKeep: ['이 집터는'],
    // 처음 배우기 1 · 2단계 말도 노래 알기 · 판 안내와 같은 손 이름으로(「톡」이 끼어 같은 손을 「당겨요 → 톡 → 당겨요」로 불렀다, 곡별 검수 07 R2-06)
    learnSay: ['', '구슬이 글자에 닿을 때 당겨요', '구슬이 닿는 순간 당겨요'],
  };

  // 강원 화천 운재소리: 서울우리소리박물관 녹음 12조각(02:21.98~ · 입타령 30초는 뺌). 조각마다 메김 → 받음 「어이도 사노」.
  // 받음 시작은 목소리 덩어리 머리, 「사」는 /s/가 끝나고 모음이 서는 자리(받음 + 1.25~1.41초)를 조각마다 잼(2026-11-11). 칠 곳은 어 · 사
  const UNJAE_TEXT = '어이도 사노', UNJAE_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요';
  // 2026-11-21 밤 대표 귀 확인: 「사」 2마디(01)는 늦어 235ms 앞으로, 4 · 10 · 20마디(02 · 05 · 10)는 일러 120 · 195 · 105ms 뒤로
  const UNJAE_ROWS = [ // [조각, 메김, 받음 시작, 사, 조각 끝]
    ['unjae-01.41e0ad2379a1', '잘들도 당기누나', 1.92, 3.03, 3.7],
    ['unjae-02.70ef477a0897', '이 나무를 끌어다가', 2.46, 3.825, 4.9],
    // 3번 「사」 4.015는 「노」 모음 안이었다. 세기 골(ㄷ 3.26 · ㅅ 3.74 · ㄴ 3.86~3.92)로 음절을 세면 「사」 모음은 3.76~3.80초(곡별 검수 08 R1-06, 대표 귀 확인 전)
    ['unjae-03.9540d68edd06', '어따 쓸거냐', 2.64, 3.8, 4.28],
    ['unjae-04.d790684138cf', '우리 큰아기 시집갈 제', 2.91, 4.295, 5.32],
    ['unjae-05.3fc7f6c04ee4', '보기만 끔찍한데', 2.69, 4.3, 4.46],
    ['unjae-06.15857023f6b1', '삼수갑산 큰아기', 2.67, 3.995, 4.9],
    ['unjae-07.a1066b04c1a4', '감자를 굴리듯이', 2.3, 3.615, 4],
    ['unjae-08.300e0fd801ee', '잘덜도 굴리네', 2.57, 3.945, 4.6],
    ['unjae-09.01361e260406', '상상 고시다로', 2.57, 3.955, 4.4],
    ['unjae-10.d8c1e0552771', '올리나 끌어보자', 2.62, 4.04, 5],
    ['unjae-11.dc2542f72d5c', '목상이 돈을 안줘서', 2.21, 3.555, 3.92],
    ['unjae-12.4b49c252e159', '올리나 끄는구나', 2.55, 3.845, 4.5],
  ];
  // 어 · 사 사이를 두 박으로 센다. 이 · 도 · 노는 글자 자리만(어 + 0.36초 · 0.72초, 사 + 0.42초. 조각이 먼저 끝나면 끝 바로 앞)
  function unjaeMe(row, part = 1) {
    const [clip, lyric, rs, sa] = row, beat = (sa - rs) / 2;
    return { clip, half: 0, vfrom: 0, vlen: rs, bpm: 60 / beat, beats: rs / beat, call: true, me: lyric, lyric, times: [.05, rs], vend: rs, timedSyllables: false,
      meN: [[.05 / beat, (rs - .05) / beat]], baN: [], strikes: [], cue: null, part, stage: 'day', holdHint: part === '연습' || row === UNJAE_ROWS[0] ? UNJAE_HOLD : undefined };
  }
  function unjaeBa(row, part = 1) {
    const [clip, , rs, sa, end] = row, beat = (sa - rs) / 2, len = end - rs;
    const syl = [0, .36 / beat, .72 / beat, 2, Math.min(2 + .42 / beat, len / beat - .1)].map(b => Math.round(b * 1e6) / 1e6);
    return { clip, half: 1, vfrom: rs, vlen: len, bpm: 60 / beat, beats: len / beat, call: false, me: '', lyric: UNJAE_TEXT, syl,
      meN: [], baN: [[0, len / beat]], strikes: [syl[0], syl[3]], cue: null, part, stage: 'day', audioEnd: end, nextAudioStart: 0, responseGap: 0 }; // 조각은 원 녹음을 끊김 없이 이어 자른 것
  }
  function unjaeBars() {
    const rows = UNJAE_ROWS.flatMap(r => [unjaeMe(r), unjaeBa(r)]);
    Object.assign(rows.at(-1), { outro: true, finale: true, finaleBeat: 2, endAt: rows.at(-1).vlen, fadeOut: .3 });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const UNJAE = {
    work: '일노래', about: '이 노래는 산에서 베어 낸 나무를 함께 나르며 불렀어요', level: '보통', bpm: 60 / .66, bars: unjaeBars, pungmul: true, net: true, heroArt: 'unjae',
    startWork: '통나무 나르기', netScene: { slope: true }, goodEarly: .1, goodLate: .15,
    // 다섯째 사람은 22번째 맞힘(11째 받음 「사」)에 붙는다. 24번째면 끝 한 방 · 신명 3단과 한 순간에 겹쳐 판 안에서 한 번도 당기지 못했다(재미 F03)
    netAt: [4, 8, 12, 18, 22],
    stamps: [null, '한 뼘', '한 고개', '온 동네'], fullStamp: '개울가', topStamp: '앞소리꾼', sealDir: 'unjae', fullSeal: 5,
    // 파일 4 = 개울가, 5 = 앞소리꾼 그림이라 게임 번호(4 앞소리꾼, 5 다 맞힘)에 바꿔 잇는다(refs/seals-2026-11-11/names.json)
    sealFiles: {1:'art/unjae/seal-1.8fc0f99fbc7d.png',2:'art/unjae/seal-2.4b9eca34a108.png',3:'art/unjae/seal-3.d6acd56d1acf.png',4:'art/unjae/seal-5.9d6a753baec3.png',5:'art/unjae/seal-4.e8df8da8daf8.png'},
    startLine: '잘들도 당기누나', credit: '소리 신현규, 서울우리소리박물관 운재소리 (CC BY 표시)',
    voice: { files: UNJAE_ROWS.map(r => r[0]), bar: 4.5, grid: 0, pre: .08, gain: 1.4, hit: 'pull', npcHit: 'pull-soft' }, drum: [], doubles: [],
    practiceCall: { ...unjaeMe(UNJAE_ROWS[6], '연습'), i: -1 }, practiceBar: { ...unjaeBa(UNJAE_ROWS[6], '연습'), i: -1 }, practiceRest: null,
    hint: '구슬이 글자에 닿을 때 당겨요', releaseHint: '구슬이 ‘어’에 닿을 때 떼요',
    say: { zero: '통나무가 꿈쩍도 안 하네', 1: '통나무가 한 뼘 내려갔네', 2: '고개 하나를 내려왔네', 3: '온 동네가 나무를 날랐네!', full: '통나무가 개울가에 닿았다!', top: '다음 앞소리는 네가 메겨라!' },
    // 같은 손(깍장쇠로 당기기)을 노래 알기 · 처음 배우기는 「톡」, 틀림은 「쳤어요」, 판 안내는 「당겨요」로 섞어 불렀다(곡별 검수 08 R1-03).
    // 가래질과 같은 꼴로 받음 손은 「당겨요」, 뗀 실수는 「뗐어요」(끝 도움말도 뗀 실수를 셈)
    tips: { spoiled: UNJAE_HOLD, releaseEarly: '구슬이 ‘어’에 닿을 때 떼요', releaseLate: '구슬이 ‘어’에 닿을 때 떼요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 당겨요', extra: '점이 찍힌 글자에만 당겨요', none: '‘어’와 ‘사’에 한 번씩 당겨요' },
    missSay: { early: '일찍 당겼어요', late: '늦게 당겼어요' }, spoilSay: '앞소리꾼 차례에 당겼어요',
    learnSay: ['', '구슬이 글자에 닿을 때 당겨요', '구슬이 닿는 순간 당겨요'],
    // 처음 배우기 이름표 첫 칸도 「톡」 대신 이 곡 손 이름(곡별 검수 08 R2-02)
    learnNames: ['', '당기기', '박', '꾹', '노래'],
  };

  // 황해 풍구타령: 국립국악원 디지털 음원 V5-011(장효선, 자진모리 2장단씩 4조각). 큰박 0.67초(네 조각 모두 잼, 2026-11-13)
  // 001 · 002가 받는 소리(후렴), 003 · 004가 메기는 소리. 원래 노래가 후렴 → 본절로 도니 판은 메김 003 · 004 → 받음 001 · 002를 세 번
  // 조각마다 첫 큰박 자리(vfrom)부터 8박. 004는 첫 큰박 앞에 「구」 한 글자가 먼저 나와서 003 끝 0.359초를 덜고 004를 그만큼 먼저 튼다
  // 받음 다음이 메김이면 그 틈을 적는다: 받음은 제 마디 끝에서 소리를 끊고(풍구는 8박 뒤 0.4초 울림을 버림, -39dB 아래), 다음 메김은 제 조각의 vfrom부터
  const linkGaps = rows => rows.forEach((b, i) => { const n = rows[i + 1]; if (b.clip && !b.call && n?.call) Object.assign(b, { audioEnd: b.vfrom + b.vlen, nextAudioStart: n.vfrom, responseGap: n.vfrom }); });
  const PUNG_BEAT = .67, PUNG_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요';
  const PUNG_ROWS = { // 조각: [첫 큰박, 앞당김, 말, 글자 자리(초), 칠 글자(글자 번호)]
    '003': [.117, 0, '신계 곡산 풍구는 칠팔 인이나 불어도'],
    '004': [.489, .359, '구리 무쇠 돌무쇠 쾅쾅 녹아서 나온다'],
    '001': [.1, 0, '어기여차 불어라 불 불 불어라', [.1, .535, 1.195, 1.445, 2.065, 2.365, 2.555, 2.795, 3.475, 4.155, 4.525, 4.785], [0, 4, 7, 8, 9]], // 메김 뒤 첫 받음은 다른 곡처럼 첫 글자 「어」에서 뗀다
    // 002 칠 글자 불 1.395 · 만 2.715 · 장 3.415 · 나 4.075초는 모두 큰박(.054 + 0.67 × 2 · 4 · 5 · 6) 위. 「슬」(.054, 큰박 0)도 큰박이지만 11-13 박 자리 재기(refs/punggu/timing-2026-11-13.json)에서 칠 곳으로 안 잡혔고, 001처럼 뒤쪽 큰박 4 · 5 · 6에 모인다(그래프 검수 R3-11, 바꾸려면 귀 확인)
    '002': [.054, 0, '슬근 살짝 불어도 만대장만 나온다', [.054, .495, .735, 1.135, 1.395, 1.815, 2.055, 2.715, 3.185, 3.415, 3.745, 4.075, 4.315, 4.695], [4, 7, 9, 11]],
  };
  function pungDef(n, part = 1, cut = 0) {
    const [b0, lead, lyric, at, hits] = PUNG_ROWS[n], call = !at, from = b0 - lead, len = Math.round((lead + 8 * PUNG_BEAT - cut) * 1e6) / 1e6;
    const syl = at && at.map(t => Math.round((t - from) / PUNG_BEAT * 1e6) / 1e6);
    return { clip: `V5-011-${n}`, half: 0, vfrom: from, vlen: len, bpm: 60 / PUNG_BEAT, beats: len / PUNG_BEAT, call, me: call ? lyric : '', lyric,
      times: call ? [0, len] : undefined, vend: len, timedSyllables: false, meN: call ? [[0, len / PUNG_BEAT]] : [], baN: call ? [] : [[0, len / PUNG_BEAT]],
      syl: syl || undefined, strikes: call ? [] : hits.map(i => syl[i]), cue: null, part, stage: 'day', holdHint: call ? PUNG_HOLD : undefined, fadeOut: cut ? .12 : undefined };
  }
  function punggBars() {
    const rows = [];
    for (let part = 1; part <= 3; part++) rows.push(pungDef('003', part, PUNG_ROWS['004'][1]), pungDef('004', part), pungDef('001', part), pungDef('002', part));
    linkGaps(rows);
    const fin = rows.at(-1); Object.assign(fin, { outro: true, finale: true, finaleBeat: fin.strikes.at(-1), endAt: fin.vlen, fadeOut: .3 });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const PUNGGU = {
    work: '일노래', about: '이 노래는 대장간에서 바람 넣는 풀무를 밟으며 불렀어요', level: '쉬움', bpm: 60 / PUNG_BEAT, bars: punggBars, pungmul: true, net: true, heroArt: 'punggu',
    startWork: '풀무 밟기', netScene: { kind: 'forge' }, goodEarly: .1, goodLate: .14,
    stamps: [null, '불씨', '센 불', '온 동네'], fullStamp: '쇳물', topStamp: '앞소리꾼', sealDir: 'punggu', fullSeal: 5,
    // 그림 지시서는 seal-4를 「쇳물」, seal-5를 「앞소리꾼」으로 그렸다. 게임은 4가 앞소리꾼, 5가 다 맞힘이라 둘을 바꿔 잇는다
    sealFiles: {1:'art/punggu/seal-1.2b16b7e4024b.png',2:'art/punggu/seal-2.a76972410429.png',3:'art/punggu/seal-3.20a177680693.png',4:'art/punggu/seal-5.bfe2958484a0.png',5:'art/punggu/seal-4.dec0211840d1.png'},
    startLine: '신계 곡산 풍구는', credit: '소리 국립국악원 디지털 음원, 장효선 (공공누리 제1유형)',
    voice: { files: ['001', '002', '003', '004'].map(n => `V5-011-${n}`), bar: 8 * PUNG_BEAT, grid: 0, pre: .08, gain: 1.4, hit: 'doli', npcHit: 'step-soft' }, drum: [], doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 18, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceCall: { ...pungDef('004', '연습'), i: -1 }, practiceBar: { ...pungDef('001', '연습'), i: -1 }, practiceRest: null,
    // 폰 가로 148px 칸에서 「구슬이 ‘어’ / 에 닿을 때 떼요」로 갈렸다. 가래질 · 자진뱃노래처럼 ’ 뒤에 U+FEFF를 넣어 붙인다(2026-11-20)
    hint: '구슬이 글자에 닿을 때 밟아요', releaseHint: '구슬이 ‘어’﻿에 닿을 때 떼요',
    missSay: { early: '일찍 밟았어요', late: '늦게 밟았어요' }, spoilSay: '앞소리꾼 차례에 밟았어요',
    learnNames: ['', '밟기', '박', '꾹', '노래'], learnSay: ['', '구슬이 글자에 닿을 때 밟아요', '구슬이 닿는 순간 밟아요'],
    say: { zero: '가마 불이 안 붙네', 1: '불씨가 살았네', 2: '불길이 솟네', 3: '온 동네가 풀무를 밟네!', full: '쇳물이 흘러나왔다!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: PUNG_HOLD, early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 밟아요', extra: '점이 찍힌 글자에만 밟아요', none: '‘어’에 한 번 밟고 ‘불’에 네 번 밟아요' },
  };

  // 평안 자진아리: 국립국악원 디지털 음원 V5-063(유지숙, 자진모리 2장단씩 7조각). 001 · 004 · 007이 받는 소리, 002+003 · 005+006이 메기는 소리 한 절씩.
  // 005 · 006은 받아쓰기 두 번이 서로 달라 노랫말을 못 정했다(대표 귀 확인 뒤에 넣는다). 그래서 메김 002 → 받음 007 → 메김 003 → 받음 007을 두 번 돈다.
  // 조각은 마디 경계로 잘려 있어 통째로 잇는다. 큰박은 007 길이 ÷ 8 = 1.34초. 칠 곳은 아 · 아 · 성 · 로 · 나(소리 머리를 잼, 2026-11-13)
  const JJ_BEAT = 1.34, JJ_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요', JJ_TEXT = '아이고 아이고 성화로구나';
  const JJ_SYL = [.105, 1, 1.7, 4.595, 4.85, 5.1, 5.47, 6, 6.915, 7.45, 7.93], JJ_HITS = [0, 3, 6, 8, 10];
  const JJ_ROWS = { '002': ['요놈의 종자야 내 올 줄 알고', 10.528], '003': ['썩은 새끼로 문 걸고 잤구나', 10.07], '007': [JJ_TEXT, 10.715] };
  function jjDef(n, part = 1) {
    const [lyric, len] = JJ_ROWS[n], call = n !== '007', syl = call ? undefined : JJ_SYL.map(t => Math.round(t / JJ_BEAT * 1e6) / 1e6);
    return { clip: `V5-063-${n}`, half: 0, vfrom: 0, vlen: len, bpm: 60 / JJ_BEAT, beats: len / JJ_BEAT, call, me: call ? lyric : '', lyric,
      times: call ? [0, len] : undefined, vend: len, timedSyllables: false, meN: call ? [[0, len / JJ_BEAT]] : [], baN: call ? [] : [[0, len / JJ_BEAT]],
      syl, strikes: call ? [] : JJ_HITS.map(i => syl[i]), cue: null, part, stage: 'day', holdHint: call ? JJ_HOLD : undefined };
  }
  function jjBars() {
    const rows = [];
    for (let part = 1; part <= 2; part++) rows.push(jjDef('002', part), jjDef('007', part), jjDef('003', part), jjDef('007', part));
    linkGaps(rows);
    const fin = rows.at(-1); Object.assign(fin, { outro: true, finale: true, finaleBeat: fin.strikes.at(-1), endAt: fin.vlen, fadeOut: .3 });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const JAJINARI = {
    work: '일노래', about: '이 노래는 평안도 밭에서 풀을 뽑는 김매기를 하며 불렀어요', level: '보통', bpm: 60 / JJ_BEAT, bars: jjBars, pungmul: true, net: true, heroArt: 'jajinari',
    startWork: '김매기', netScene: { kind: 'field' }, goodEarly: .1, goodLate: .15,
    stamps: [null, '한 포기', '한 이랑', '온 동네'], fullStamp: '새참', topStamp: '앞소리꾼', sealDir: 'jajinari', fullSeal: 5,
    sealFiles: {1:'art/jajinari/seal-1.7e8752cdd79c.png',2:'art/jajinari/seal-2.0f54bb410bca.png',3:'art/jajinari/seal-3.d8cabc9596e3.png',4:'art/jajinari/seal-5.e5522a4998f4.png',5:'art/jajinari/seal-4.cde97cba5d58.png'}, // 그림은 seal-4가 새참, seal-5가 앞소리꾼이라 4 · 5를 바꿔 잇는다
    startLine: '요놈의 종자야', credit: '소리 국립국악원 디지털 음원, 유지숙 (공공누리 제1유형)',
    voice: { files: ['002', '003', '007'].map(n => `V5-063-${n}`), bar: 8 * JJ_BEAT, grid: 0, pre: .08, gain: 1.4, hit: 'doli', npcHit: 'step-soft' }, drum: [], doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 16, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceCall: { ...jjDef('002', '연습'), i: -1 }, practiceBar: { ...jjDef('007', '연습'), i: -1 }, practiceRest: null,
    hint: '구슬이 글자에 닿을 때 호미를 찍어요', releaseHint: '구슬이 ‘아’에 닿을 때 떼요', missSay: { early: '일찍 찍었어요', late: '늦게 찍었어요' },
    say: { zero: '풀이 그대로 있네', 1: '풀 한 포기를 뽑았네', 2: '한 이랑을 다 맸네', 3: '온 동네가 밭에 나왔네!', full: '새참 먹고 하세!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: JJ_HOLD, early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 찍어요', extra: '점이 찍힌 글자에만 찍어요', none: '‘아’에 두 번 찍고 ‘성’과 ‘로’, ‘나’에 한 번씩 찍어요' },
  };

  // 함경 신고산타령(어랑타령): 국립국악원 디지털 음원 V5-051(강효주, 볶는타령). 002 · 003이 한 절씩: 메김 두 줄 → 받음 「어랑 어랑 어허야 / 어허야 더허야 내 사랑아」.
  // 가락이 헤미올라(셋씩 · 둘씩 묶음이 엇갈림)라 받음 글자가 큰박 0.745초 격자에 다 맞지 않는다. 글자 자리는 소리 머리를 잰 초를 그대로 쓴다(2026-11-13)
  // 한 조각을 네 줄로 나눈다: 메김 첫 줄 · 둘째 줄, 받음 앞 「어랑 어랑 어허야」(어 · 어 · 어) · 뒤 「어허야 더허야 내 사랑아」(어 · 더 · 사). 판은 002 → 003 → 002
  const SG_BEAT = .745, SG_HOLD = '앞소리꾼이 부를 땐 꾹 눌러요', SG_LEAD = .06, SG_TEXT = ['어랑 어랑 어허야', '어허야 더허야 내 사랑아'], SG_HITS = [[0, 2, 4], [0, 3, 7]];
  const SG_ROWS = { // 조각: [메김 두 줄, 둘째 줄 머리, 받음 앞 글자 자리, 받음 뒤 글자 자리, 조각 끝]
    '002': [['신고산이 우르르 함흥차 가는 소리에', '구고산 큰애기 반봇짐만 싼다'], 7.75, [12.225, 12.945, 13.975, 14.735, 15.215, 15.585, 15.965], [17.055, 17.45, 17.85, 18.245, 18.525, 19.1, 19.705, 20.555, 21.325, 21.95], 25.198],
    '003': [['구부러진 노송나무 바람에 건들거리고', '허공중천 뜬 달은 사해를 비춰 주누나'], 7.55, [11.985, 12.785, 13.755, 14.505, 15.005, 15.365, 15.735], [16.755, 17.15, 17.5, 17.915, 18.235, 18.945, 19.345, 20.225, 20.995, 21.5], 24.967],
  };
  function sgDef(n, half, part = 1) {
    const [lines, mid, a, b, end] = SG_ROWS[n], r = x => Math.round(x * 1e6) / 1e6, cuts = [0, mid, r(a[0] - SG_LEAD), r(b[0] - SG_LEAD), end];
    const from = cuts[half], len = r(cuts[half + 1] - from), call = half < 2, at = call ? null : half === 2 ? a : b, syl = at && at.map(t => r((t - from) / SG_BEAT));
    return { clip: `V5-051-${n}`, half, vfrom: from, vlen: len, bpm: 60 / SG_BEAT, beats: len / SG_BEAT, call, me: call ? lines[half] : '', lyric: call ? lines[half] : SG_TEXT[half - 2],
      times: call ? [0, len] : undefined, vend: len, timedSyllables: false, meN: call ? [[0, len / SG_BEAT]] : [], baN: call ? [] : [[0, len / SG_BEAT]],
      syl: syl || undefined, strikes: call ? [] : SG_HITS[half - 2].map(i => syl[i]), cue: null, part, stage: 'day', holdHint: call ? SG_HOLD : undefined };
  }
  function sgBars() {
    const rows = [];
    ['002', '003', '002'].forEach((n, k) => { for (let h = 0; h < 4; h++) rows.push(sgDef(n, h, k + 1)); });
    linkGaps(rows);
    const fin = rows.at(-1); Object.assign(fin, { outro: true, finale: true, finaleBeat: fin.strikes.at(-1), endAt: fin.vlen, fadeOut: .3 });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const SINGOSAN = {
    work: '놀이 노래', about: '이 노래는 함경도에서 어울려 놀며 불렀어요', level: '보통', bpm: 60 / SG_BEAT, bars: sgBars, pungmul: true, net: true, heroArt: 'singosan',
    startWork: '마을 춤판', netScene: { kind: 'dance' }, goodEarly: .1, goodLate: .15,
    stamps: [null, '한 춤', '한마당', '온 동네'], fullStamp: '버들 그네', topStamp: '앞소리꾼', sealDir: 'singosan', fullSeal: 5,
    sealFiles: {1:'art/singosan/seal-1.45c4b9ee5ea0.png',2:'art/singosan/seal-2.2a1d98af4f06.png',3:'art/singosan/seal-3.98beeefcd4f7.png',4:'art/singosan/seal-5.b9b5745e2f44.png',5:'art/singosan/seal-4.dea90e24c164.png'}, // 그림은 seal-4가 버들 그네(옛 단오), seal-5가 앞소리꾼이라 4 · 5를 바꿔 잇는다
    startLine: '신고산이 우르르', credit: '소리 국립국악원 디지털 음원, 강효주 (공공누리 제1유형)',
    voice: { files: ['002', '003'].map(n => `V5-051-${n}`), bar: 16 * SG_BEAT, grid: 0, pre: .08, gain: 1.4, hit: 'clap', hitGain: 1.9, npcHit: 'step-soft' }, drum: [], doubles: [{ at: 6, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 12, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceCall: { ...sgDef('002', 1, '연습'), i: -1 }, practiceBar: { ...sgDef('002', 2, '연습'), i: -1 }, practiceRest: null,
    hint: '구슬이 글자에 닿을 때 팔을 들어요', releaseHint: '구슬이 ‘어’에 닿을 때 떼요', missSay: { early: '팔을 일찍 들었어요', late: '팔을 늦게 들었어요' },
    say: { zero: '그네가 꿈쩍도 안 하네', 1: '그네가 흔들리네', 2: '그네가 높이 오르네', 3: '온 동네가 춤추러 나왔네!', full: '그네가 버들가지 끝까지 올랐다!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: SG_HOLD, early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 들어요', extra: '점이 찍힌 글자에만 들어요', none: '‘어’에 네 번 들고 ‘더’와 ‘사’에 한 번씩 들어요' },
  };

  // 판 17 전라 둥당기 타령(시제품, 2026-11-22): 국립국악원 디지털 음원 V5-021(조정희, 중중모리, 5조각 · 조각마다 약 13초).
  // 조각마다 메김 한 장단 + 받음 한 장단(001만 받음 둘). 장단 6.08초, 큰박 1.52초. 받음 「당기 둥당기 둥당기여」의 당 · 둥 · 당 · 둥 · 당을 친다
  // 둥은 왼손(낮은 소리), 당은 오른손(높은 소리). 둥1 자리는 받아쓰기 + 소리 시작점으로 잰 값(시제품 11-13), 귀 확인 전
  // 메김 노랫말은 받아쓰기가 흐리고 사설을 못 찾아 음표로 둔다(대표 귀 확인 거리)
  const DG_BEAT = 1.52, DG_TEXT = '당기 둥당기 둥당기여';
  const DG_SYL = [0, .5, 1, 1.329, 1.66, 2, 2.303, 2.65, 3], DG_HITS = [0, 2, 3, 5, 6], DG_SIDES = ['R', 'L', 'R', 'L', 'R'];
  const DG_SYL_SIDES = DG_SYL.map((_, k) => DG_SIDES[DG_HITS.indexOf(k)] || null);
  const DG_ROWS = { '002': [7.59], '003': [7.62], '004': [7.71], '005': [7.62], '001': [1.64, 7.54] }; // 조각 안 첫 「둥」 자리(초)
  function dgDef(n, d1, call, part = 1) {
    const from = call ? Math.max(0, d1 - 5 * DG_BEAT) : d1 - DG_BEAT, len = 4 * DG_BEAT;
    return { clip: `V5-021-${n}`, half: call ? 0 : 1, vfrom: Math.round(from * 1e3) / 1e3, vlen: len, bpm: 60 / DG_BEAT, beats: 4, call, me: call ? '♪ ♪ ♪' : '', lyric: call ? '♪ ♪ ♪' : DG_TEXT,
      times: call ? [0, len] : undefined, vend: len, timedSyllables: false, meN: call ? [[0, 4]] : [], baN: call ? [] : [[0, 4]],
      syl: call ? undefined : DG_SYL, strikes: call ? [] : DG_HITS.map(i => DG_SYL[i]), sides: call ? undefined : DG_SIDES, noHold: call || undefined, cue: null, part, stage: 'day' };
  }
  function dungdangBars() {
    const rows = [];
    ['002', '003', '004', '005'].forEach((n, k) => rows.push(dgDef(n, DG_ROWS[n][0], true, k + 1), dgDef(n, DG_ROWS[n][0], false, k + 1)));
    DG_ROWS['001'].forEach(d1 => rows.push(dgDef('001', d1, false, 5)));
    linkGaps(rows);
    const fin = rows.at(-1); Object.assign(fin, { outro: true, finale: true, finaleBeat: fin.strikes.at(-1), endAt: fin.vlen, fadeOut: .3 });
    return [{ me: '', meN: [], baN: [], strikes: [], cue: null, part: 0, intro: true, bpm: 120, stage: 'day' }, ...rows].map((b, i) => ({ ...b, i }));
  }
  const DUNGDANG = {
    work: '놀이 노래', about: '이 노래는 물동이에 엎은 바가지를 두드리며 불렀어요', level: '보통', bpm: 60 / DG_BEAT, bars: dungdangBars, pungmul: true, net: true, heroArt: 'dungdang',
    twoHand: true, sides: DG_SIDES, sylSides: DG_SYL_SIDES,
    startWork: '물방구 두드리기', netScene: { kind: 'dungdang' }, goodEarly: .12, goodLate: .16,
    stamps: [null, '한 박', '한 가락', '온 마당'], fullStamp: '보름달', topStamp: '앞소리꾼', sealDir: 'dungdang', fullSeal: 5,
    // 그림 지시서는 seal-4를 「보름달」, seal-5를 「앞소리꾼」으로 그렸다. 게임은 4가 앞소리꾼, 5가 다 맞힘이라 둘을 바꿔 잇는다
    sealFiles: {1:'art/dungdang/seal-1.7bf6d5044f8f.png',2:'art/dungdang/seal-2.4942065b3aaa.png',3:'art/dungdang/seal-3.3e695799bba3.png',4:'art/dungdang/seal-5.9e90b5eb298e.png',5:'art/dungdang/seal-4.576bf9936e7f.png'},
    startLine: '♪ ♪ ♪', credit: '소리 국립국악원 디지털 음원, 조정희 (공공누리 제1유형)',
    voice: { files: ['001', '002', '003', '004', '005'].map(n => `V5-021-${n}`), bar: 4 * DG_BEAT, grid: 0, pre: .08, gain: 1.4, hit: 'clap', hitGain: 1.4, npcHit: 'step-soft' }, drum: [], doubles: [{ at: 8, delay: .018, rate: 1.004, pan: -.55, gain: .5 }, { at: 18, delay: .034, rate: .996, pan: .55, gain: .45 }],
    practiceCall: { ...dgDef('002', 7.59, true, '연습'), i: -1 }, practiceBar: { ...dgDef('002', 7.59, false, '연습'), i: -1 }, practiceRest: null,
    learnNames: ['', '둥 · 당', '박', '꾹', '노래'], learnSay: ['', '파란 구슬은 왼손, 빨간 구슬은 오른손', '구슬이 닿는 순간 그 손으로 쳐요'],
    hint: '파란 구슬은 왼손, 빨간 구슬은 오른손', missSay: { early: '일찍 쳤어요', late: '늦게 쳤어요' }, spoilSay: '앞소리꾼 차례에 쳤어요',
    say: { zero: '물방구가 조용하네', 1: '물방구가 울리네', 2: '마당이 들썩하네', 3: '온 마당이 둥당기!', full: '보름달이 떴다!', top: '다음 앞소리는 네가 메겨라!' },
    tips: { spoiled: '앞소리꾼이 부를 땐 들어요', hand: '파란 구슬은 왼손, 빨간 구슬은 오른손으로 쳐요', early: '구슬이 글자에 닿을 때까지 기다려요', late: '구슬이 글자에 닿으면 바로 쳐요', extra: '점이 찍힌 글자에만 쳐요', none: '‘당’은 오른손, ‘둥’은 왼손으로 번갈아 쳐요' },
  };

  const REGIONS = {
    경상: { full: '경상도', zoom: { file: 'art/zoom/gyeongsang.webp', scale: 3.8, tx: -1574, ty: -2136, yard: [607, 517] },
      // 곡 수만큼 고장으로 갈린 그림 한 장(2304×1440 기준). yard는 이름과 꼬마가 서는 빈 바닥, crop은 오른쪽 쪽지 그림으로 잘라 올 가운데, right는 이름 판 오른쪽 끝의 한계(옆 고장 풍경을 가리지 않게)
      zones: { file: 'art/zoom/gyeongsang-zones.webp', defaultSong: 'kwaeji', w: 2304, h: 1440, landX: 1035, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'wolwol', yard: [1262, 465], crop: [1290, 400] },
        { song: 'kwaeji', yard: [1098, 752], crop: [1098, 760], right: 1165 },
        { song: 'mosim', yard: [700, 735], crop: [790, 590] },
        { song: 'miryang', yard: [1190, 1078], crop: [1270, 960] },
        { song: 'onghe', yard: [799, 1140], crop: [800, 1120] },
      ] } },
    // seaEdge: 바다가 닿는 그림 가장자리(left 서쪽, right 동쪽, both 제주). 자리 값은 고장 그림 2304×1440 기준.
    충청: { full: '충청도', zoom: { file: 'art/zoom/chungcheong.6335567f0553.webp', scale: 4.0968, tx: -1209.6462, ty: -2039.5531, yard: [680, 616.6667] },
      zones: { file: 'art/zoom/chungcheong-zones.2df42207ee40.webp', defaultSong: 'garae', w: 2304, h: 1440, seaEdge: 'left', landX: 1050, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'garae', yard: [1020, 925], crop: [1040, 820], right: 1320 },
      ] } },
    전라: { full: '전라도', zoom: { file: 'art/zoom/jeolla.0cf8d9cc4afc.webp', scale: 5.3333, tx: -1642.6667, ty: -3464, yard: [753.3333, 323.3333] },
      zones: { file: 'art/zoom/jeolla-zones.f2761c46d989.webp', defaultSong: 'ganggang', w: 2304, h: 1440, seaEdge: 'left', landX: 1050, ring: [100, 48], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'ganggang', yard: [1130, 485], crop: [1120, 450], right: 1410 },
        { song: 'dungdang', yard: [960, 905], crop: [900, 820], right: 1380 }, // 가운데 해 질 녘 마당(장독 · 초가), 11-13 그림에 미리 그려 둔 셋째 고장
        { song: 'geomun', yard: [1155, 1110], crop: [1140, 1090], right: 1440 },
      ] } },
    제주: { full: '제주도', zoom: { file: 'art/zoom/jeju.160a408d9c7b.webp', scale: 13.0952, tx: -4623.3333, ty: -11351.5476, yard: [670, 570] },
      zones: { file: 'art/zoom/jeju-zones.2b60e5518070.webp', defaultSong: 'myeolchi', w: 2304, h: 1440, seaEdge: 'both', landX: 1040, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'myeolchi', yard: [1005, 855], crop: [1030, 790], right: 1340 },
      ] } },
    경기: { full: '경기도', zoom: { file: 'art/zoom/gyeonggi.09573b09ea18.webp', scale: 7.0513, tx: -2437.4359, ty: -3257.1795, yard: [800, 593.3333] },
      zones: { file: 'art/zoom/gyeonggi-zones.960c75247dbc.webp', defaultSong: 'baennorae', w: 2304, h: 1440, seaEdge: 'left', landX: 1120, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'baennorae', yard: [1200, 890], crop: [1120, 810], right: 1430 },
      ] } },
    강원: { full: '강원도', zoom: { file: 'art/zoom/gangwon.26de56d38ffa.webp', scale: 3.506, tx: -1105.2324, ty: -1232.6693, yard: [746.6667, 640] },
      zones: { file: 'art/zoom/gangwon-zones.3ab5b3409c1d.webp', defaultSong: 'unjae', w: 2304, h: 1440, seaEdge: 'right', landX: 1100, ring: [100, 48], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'unjae', yard: [1120, 960], crop: [1115, 885], right: 1410 },
      ] } },
    황해: { full: '황해도', zoom: { file: 'art/zoom/hwanghae.372708e7ab1a.webp', scale: 4.4177, tx: -874.9398, ty: -1514.5783, yard: [720, 653.3333] },
      zones: { file: 'art/zoom/hwanghae-zones.09c9c6075617.webp', defaultSong: 'punggu', w: 2304, h: 1440, seaEdge: 'left', landX: 1070, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'punggu', yard: [1080, 980], crop: [1170, 855], right: 1390 },
      ] } },
    평안: { full: '평안도', zoom: { file: 'art/zoom/pyeongan.1902a5f915d2.webp', scale: 3.1206, tx: -419.1489, ty: -421.844, yard: [753.3333, 633.3333] },
      zones: { file: 'art/zoom/pyeongan-zones.b3afa4b2d405.webp', defaultSong: 'jajinari', w: 2304, h: 1440, seaEdge: 'left', landX: 1130, ring: [118, 56], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'jajinari', yard: [1130, 950], crop: [1130, 850], right: 1410 },
      ] } },
    함경: { full: '함경도', zoom: { file: 'art/zoom/hamgyeong.ed8da3f04644.webp', scale: 2.5731, tx: -738.5965, ty: -61.6374, yard: [610, 663.3333] },
      zones: { file: 'art/zoom/hamgyeong-zones.f366fc87fcda.webp', defaultSong: 'singosan', w: 2304, h: 1440, seaEdge: 'right', landX: 920, ring: [100, 48], people: [0, 1, 2, 3, 4, 5, 3, 1], spots: [
        { song: 'singosan', yard: [915, 995], crop: [1020, 850], right: 1210 },
      ] } },
  };
  // recap: 끝 화면 쪽지 맨 아래 되짚기 [고장, 하는 일]. 곡 소개 · 노래 알기 1장의 사실을 줄였다(2026-11-20 출시 판정 고칠 거리)
  const SONGS = [
    { id: 'kwaeji', region: '경상', title: '쾌지나 칭칭나네', work: '놀이 노래', line: '춤추며 부른 노래', recap: ['경상도 마을 마당', '풍물 치며 춤추는 놀이 노래'], about: '이 노래는 춤추며 불렀어요', level: '쉬움', bpm: 48, bars: kwaejiBars, hardBars: kwaejiHardBars, hardStamp: '장구잡이', hardLabel: '장구 장단', pungmul: true,
      stamps: [null, '썰렁', '들썩', '온 동네'], fullStamp: '밤샘', topStamp: '상쇠', sealDir: 'kwaeji',
      startLine: SKY_LINE, // 시작 창에서 앞사람 말풍선에 보이는 첫 줄
      credit: '소리 국립국악원 디지털 음원, 김세윤 · 장효선 (공공누리 제1유형)',
      voice: { files: [1, 2, 3, 4, 5, 6].map(n => `V5-017-00${n}`), bar: 5, grid: 0.135, pre: 0.1, gain: 1.4, hit: 'sogo', npcHit: 'jg-deok' },
      // 맞힌 수만큼 들어오는 악기: 박(0~4)과 세기, 소리. 구경꾼이 오는 수(4 · 8 · 12 · 18 · 28 · 36)에 맞췄다
      band: [
        { at: 8, v: 1.15, pat: [[0, 1, 'buk'], [1, 0.55, 'buk'], [2, 0.85, 'buk'], [3, 0.55, 'buk']] },
        { at: 18, v: 1.3, pat: [[0, 1, 'kkw-dak'], [2 / 3, 0.7, 'kkw-dak-soft'], [1, 0.8, 'kkw-dak'], [5 / 3, 0.7, 'kkw-dak-soft'], [2, 0.9, 'kkw-dak'], [8 / 3, 0.7, 'kkw-dak-soft'], [3, 0.8, 'kkw-dak'], [11 / 3, 0.7, 'kkw-dak-soft']] },
        { at: 28, v: 0.6, pat: [[0, 1, 'jing']] },
      ],
      // 받는 소리 겹: 같은 녹음을 조금 늦게, 조금 다른 높이로, 좌우로 벌려 겹친다
      doubles: [{ at: 8, delay: 0.018, rate: 1.004, pan: -0.55, gain: 0.5 }, { at: 28, delay: 0.034, rate: 0.996, pan: 0.55, gain: 0.45 }],
      // 굿거리: 덩 기덕 쿵 더러러러 쿵 기덕 쿵 더러러러
      drum: [[0, '덩', 1], [2 / 3, '기덕', .6], [1, '쿵', .8], [1.5, '더러러러', .55], [2, '쿵', .85], [2 + 2 / 3, '기덕', .6], [3, '쿵', .8], [3.5, '더러러러', .55]],
      practiceBar: { ...kwaeBa(2, 1, P3, '연습'), i: -1 }, practiceCall: { ...kwaeMe(2, SKY_LINE, '연습'), i: -1, holdHint: '앞사람이 부를 땐 꾹 눌러요' }, hint: '구슬이 글자에 닿을 때 쳐요',
      say: { zero: '장구만 혼자 놀았구먼', 1: '마당이 아직 썰렁하네', 2: '어깨가 들썩들썩하는구먼', 3: '온 동네가 다 나왔네!', full: '오늘은 밤새 놀겠네!', top: '오늘 상쇠는 너로구나!', hard: '우리 마을 장구잡이 났네!' },
      tips: { none: '쾌지나 칭칭나네가 나오면 바로 쳐요', second: '점이 찍힌 글자에 맞춰 쳐요' } },
    // 옹헤야는 합성 소리라 곡 목록에서 뺐다(2026-11-05 DECISIONS). 주소 ?song=onghe 로만 연다
    { id: 'onghe', hidden: true, region: '경상', title: '옹헤야', work: '보리타작 소리', line: '보리를 털며 부른 노래', about: '이 노래는 보리를 털며 불렀어요', level: '쉬움', bpm: 96, bars: ongheBars,
      practiceBar: { ...SYS_A[0], strikes: [2], cue: 'single', part: '연습', i: -1 }, hint: '앞사람이 메기면 받는 소리에 같이 쳐요',
      say: { zero: '도리깨가 바람만 쳤구먼', 1: '이걸로는 참새도 배고프겠네', 2: '먹을 만큼은 털었구먼', 3: '이 정도면 곳간이 꽉 차겠어!', full: '올겨울 내내 보리밥 먹겠네!' } },
    // 고장 지도에 「만드는 중」으로 서 있는 곡
    { id: 'wolwol', region: '경상', title: '월월이 청청', line: '달 밝은 밤 바닷가에서 부른 노래', recap: ['경상도 바닷가 마을', '손잡고 원을 도는 놀이 노래'], ...WOLWOL },
    { id: 'mosim', region: '경상', title: '모심기 소리', line: '논에서 모를 심으며 부른 노래' },
    { id: 'miryang', region: '경상', title: '밀양아리랑', line: '밀양 사람들이 즐겨 부른 노래' },
    { id: 'garae', region: '충청', title: '의당 가래질 소리', line: '집터를 닦으며 가래로 흙을 퍼낸 노래', recap: ['충청도 공주 의당', '집터 닦는 가래질 일노래'], ...GARAE },
    { id: 'myeolchi', region: '제주', title: '멸치 후리는 소리', line: '바닷가에서 그물을 당기며 부른 노래', recap: ['제주도 바닷가', '그물 당기는 일노래'], ...MYEOLCHI },
    { id: 'geomun', region: '전라', title: '거문도 뱃노래', line: '고기잡이배에서 부른 노래', recap: ['전라도 여수 거문도', '노 젓는 일노래'], ...GEOMUN },
    { id: 'baennorae', region: '경기', title: '자진뱃노래', line: '강 위에서 노를 젓는 뱃놀이', recap: ['서울과 경기 무대', '강에서 노 젓는 뱃놀이 노래'], ...JAJIN },
    { id: 'unjae', region: '강원', title: '화천 운재소리', line: '베어 낸 나무를 나르며 부른 노래', recap: ['강원도 화천 산골', '통나무 나르는 일노래'], ...UNJAE },
    { id: 'ganggang', region: '전라', title: '강강술래', line: '손잡고 원을 돌며 부른 노래', recap: ['전라도 바닷가 마을', '달밤에 원을 도는 놀이 노래'], level: '어려움', ...GANGGANG },
    { id: 'punggu', region: '황해', title: '풍구타령', line: '대장간에서 풀무를 밟으며 부른 노래', recap: ['황해도 대장간', '풀무 밟는 일노래'], ...PUNGGU },
    { id: 'jajinari', region: '평안', title: '자진아리', line: '밭에서 김을 매며 부른 노래', recap: ['평안도 산골 밭', '김매는 일노래'], ...JAJINARI },
    { id: 'singosan', region: '함경', title: '신고산타령', line: '함경도에서 어울려 춤추며 부른 노래', recap: ['함경도 마을', '어울려 춤추는 놀이 노래'], ...SINGOSAN },
    { id: 'dungdang', region: '전라', title: '둥당기 타령', line: '물방구를 두드리며 부른 노래', recap: ['전라도 바닷가 마을', '물방구 두드리는 놀이 노래'], ...DUNGDANG }, // 판 17(2026-11-22 대표 「F~K 하면 되겠네」로 지도에 엶)
  ];
  // 메기는 줄 글자 시각(2026-11-13 밤, 대표 ⑧ 「노래들이 음원하고 속도 안 맞는 경우가 있고」).
  // 글자 시각이 없던 메기는 줄은 줄 전체를 같은 빠르기로 채워서 소리꾼이 길게 끄는 글자에서 자막이 앞섰다.
  // 받아쓰기 낱말 시각 + 세기 머리로 잼(docs/games/minyo/refs/gugak-tools/call-times-2026-11-13.py). 받아쓰기가 노랫말과 3/4 넘게 맞은 줄만(가래질 넷은 겹친 소리로 못 잼).
  // 키: 녹음 조각@조각 안 시작초 → [글자마다 시작초(마디 시작부터), 마지막 글자 끝]
  const CALL_TIMES = {
    // 쾌지나는 원본 측정초에서 voice.grid(.135초)를 뺀 마디 시각. 첫 글자는 마디 머리보다 앞이라 0초다.
    'V5-017-002@0': [[0, .420, .870, 1.270, 1.812, 2.325, 2.705, 3.085, 3.465, 4.060], 4.665], // kwaeji 청천 하늘에 잔별도 많다
    'V5-017-003@0': [[0, .705, 1.545, 2.400, 2.720, 3.340, 4.010], 4.765], // kwaeji 서산에 지는 해를
    'V5-017-004@0': [[0, .420, .840, 1.270, 1.740, 2.560, 3.245, 4.030], 4.805], // kwaeji 그 뉘라서 잡아매며
    'V5-017-005@0': [[0, .305, .745, 1.240, 1.760, 2.420, 2.930, 3.565, 4.110], 4.725], // kwaeji 가는 세월을 막을손가
    'garae-main.1c377aad1e79@10.631': [[0, 0.62, 1.19, 1.84, 2.25, 3.04, 3.83, 4.59], 5.36], // garae 터를 닦는 이 집터는
    'V5-054-003@0': [[0, 0.49, 1.17, 1.74, 2.34, 2.76, 3.19, 3.6, 3.88], 4.16], // myeolchi 당선에서 멜발을 보고
    // 004는 알려진 노랫말을 같은 녹음에 강제 정렬. 두 로컬 모델의 글자 시작 차 ≤ .12초, 가운데 값(근거: 곡별 검수 03 f2).
    'V5-054-004@0': [[.02, .32, .78, 1.54, 1.94, 2.52, 3.17, 3.66, 3.93], 4.64], // myeolchi 망선에서 후림을 노라
    'V5-054-005@0': [[0, 0.52, 1.05, 1.33, 1.92, 2.44, 2.8, 3.23, 3.6, 3.94], 4.4], // myeolchi 서깨코라근 소여콧들로
    'V5-054-006@0': [[0, 0.51, 0.94, 1.55, 2, 2.38, 2.82, 3.21, 3.71, 4.13], 4.4], // myeolchi 동깨코라근 등곱은 여로
    'unjae-01.41e0ad2379a1@0': [[0, 0.15, 0.34, 0.41, 0.81, 1.11, 1.24], 1.64], // unjae 잘들도 당기누나
    'unjae-02.70ef477a0897@0': [[0, 0.68, 1.01, 1.25, 1.61, 1.79, 2.02, 2.21], 2.42], // unjae 이 나무를 끌어다가
    'unjae-03.9540d68edd06@0': [[0.05, 0.4, 0.94, 1.5, 1.94], 2.38], // unjae 어따 쓸거냐
    'unjae-04.d790684138cf@0': [[0, 0.43, 0.86, 1.05, 1.18, 1.42, 1.91, 2.1, 2.42], 2.66], // unjae 우리 큰아기 시집갈 제
    'unjae-05.3fc7f6c04ee4@0': [[0, 0.56, 0.96, 1.48, 1.63, 1.89, 2.13], 2.34], // unjae 보기만 끔찍한데
    'unjae-06.15857023f6b1@0': [[0, 0.35, 0.74, 1.17, 1.42, 1.82, 2.07], 2.4], // unjae 삼수갑산 큰아기
    'unjae-07.a1066b04c1a4@0': [[0, 0.28, 0.54, 0.81, 1.25, 1.47, 1.76], 2.12], // unjae 감자를 굴리듯이
    'unjae-08.300e0fd801ee@0': [[0, 0.42, 0.81, 1.09, 1.54, 1.94], 2.36], // unjae 잘덜도 굴리네
    'unjae-09.01361e260406@0': [[0, 0.77, 1.34, 1.55, 1.9, 2.15], 2.32], // unjae 상상 고시다로
    'unjae-10.d8c1e0552771@0': [[0, 0.51, 0.97, 1.38, 1.6, 1.76, 1.99], 2.18], // unjae 올리나 끌어보자
    'unjae-11.dc2542f72d5c@0': [[0, 0.23, 0.38, 0.66, 1.07, 1.48, 1.7, 1.86], 2.02], // unjae 목상이 돈을 안줘서
    'unjae-12.4b49c252e159@0': [[0, 0.42, 0.81, 1.28, 1.53, 1.72, 1.93], 2.22], // unjae 올리나 끄는구나
    'V5-040-019@0': [[0.1, 0.5, 0.9, 1.39, 2.1, 2.67, 3.28, 4.05], 4.88], // ganggang 사래 질고 장찬 밭에
    // 2026-11-17 녹음 받아쓰기 낱말 시각과 세기 오름을 대조한 여덟 글자. 근거: 출시점검-2026-11-17/release2/lyric-times.json
    'V5-040-020@0': [[.075, .596, 1.117, 1.639, 2.16, 2.82, 3.355, 3.865], 4.85], // ganggang 이영따는 저 처녀야
    'V5-040-023@0': [[0.09, 0.32, 0.45, 0.78, 1.27, 1.44, 1.61, 1.83, 2.08], 2.42], // ganggang 뛰어 보세 뛰어나 보세
    'V5-040-024@0': [[0, 0.34, 0.67, 0.99, 1.22, 1.44, 1.6, 1.89, 2.02], 2.56], // ganggang 높은 마당 짚어나 지고
    'V5-040-025@0': [[0, 0.29, 0.67, 0.93, 1.18, 1.31, 1.55, 1.82, 2.15], 2.52], // ganggang 짚은 마당 높아나 지게
    'V5-040-026@0': [[0, 0.4, 0.55, 0.91, 1.1, 1.3, 1.53, 1.73, 2.13], 2.48], // ganggang 욱신욱신 뛰어나 보세
    'V5-040-027@0': [[0, 0.36, 0.54, 0.77, 0.97, 1.2, 1.58, 1.82, 1.97, 2.21], 2.525], // ganggang 날이 좋다고 날맞이 놀면
    'V5-040-028@0': [[0, 0.3, 0.48, 0.69, 0.91, 1.15, 1.34, 1.51, 1.76, 2.1], 2.45], // ganggang 달이 좋다고 달맞이 놀까
    'V5-011-003@0.117': [[0, 0.28, 0.67, 0.89, 1.22, 1.65, 2.02, 2.5, 2.87, 3.35, 3.6, 3.75, 4, 4.21, 4.49], 4.68], // punggu 신계 곡산 풍구는 칠팔 인이나 불어도
    'V5-011-004@0.13': [[0, 0.26, 0.52, 0.86, 1.25, 1.63, 1.9, 2.34, 2.77, 3.29, 3.35, 3.52, 3.71, 4.18, 4.47], 4.92], // punggu 구리 무쇠 돌무쇠 쾅쾅 녹아서 나온다
    'V5-063-002@0': [[0, 0.41, 0.72, 1.22, 1.96, 2.54, 3.35, 5.63, 6.14, 6.52, 7.39], 8.26], // jajinari 요놈의 종자야 내 올 줄 알고
    'V5-063-003@0': [[0, 0.64, 1.26, 1.88, 2.4, 3, 5.79, 6.2, 6.51, 7.11, 7.63], 8.12], // jajinari 썩은 새끼로 문 걸고 잤구나
    'V5-051-002@0': [[0, 0.39, 0.68, 1.03, 1.28, 2.29, 3.33, 4.34, 4.58, 4.95, 5.32, 5.6, 5.88, 6.5, 6.88], 7.38], // singosan 신고산이 우르르 함흥차 가는 소리에
    'V5-051-002@7.75': [[0, 0.48, 0.81, 1.29, 1.71, 2.06, 2.42, 2.87, 3.27, 3.73, 4.16, 4.33], 4.415], // singosan 구고산 큰애기 반봇짐만 싼다
    'V5-051-003@0': [[0, 0.34, 0.88, 1.18, 1.7, 2.27, 2.83, 3.41, 3.96, 4.43, 4.76, 5.25, 5.54, 5.88, 6.38, 6.7], 7.12], // singosan 구부러진 노송나무 바람에 건들거리고
    'V5-051-003@7.55': [[0, 0.23, 0.7, 1.02, 1.3, 1.84, 2.27, 2.62, 2.87, 3.29, 3.69, 3.92, 4.25, 4.32, 4.33], 4.375], // singosan 허공중천 뜬 달은 사해를 비춰 주누나
  };
  const timeCall = d => {
    const ct = d && d.call && !d.timedSyllables && CALL_TIMES[`${d.clip}@${d.vfrom ?? 0}`];
    if (ct && ct[0].length === [...d.lyric.replace(/\s/g, '')].length) Object.assign(d, { times: ct[0], vend: d.vend ?? ct[1], timedSyllables: true });
    return d;
  };
  for (const s of SONGS) {
    if (typeof s.bars === 'function') { const make = s.bars; s.bars = (...a) => make(...a).map(timeCall); }
    if (s.practiceCall) timeCall(s.practiceCall);
  }
  VOICE_START['V5-022-001'] = .14;
  for (const s of SONGS.filter(s => s.voice && s.drum?.length === 0)) s.practiceBar = naturalResponse(s.practiceBar, s.practiceCall);
  // 끝 화면에서 가장 많이 한 실수를 한 줄로 알려 준다
  const TIPS = {
    spoiled: '앞사람이 부를 땐 꾹 누르고 첫 구슬에 떼요',
    early: '치는 게 조금 빨라요',
    late: '치는 게 조금 늦어요',
    none: '받는 소리가 나오면 바로 쳐요',
    second: '딱딱 소리 수만큼 쳐요',
    extra: '점이 찍힌 글자에만 쳐요',
  };
  root.MINYO = { REGIONS, SONGS, TIPS };
})(typeof window !== 'undefined' ? window : globalThis);
