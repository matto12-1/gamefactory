(function () {
  'use strict';
  if (window.GFModes) return;
  const names = { quick: '빠른 판', endless: '끝없이', stage: '단계 지도' };
  const validNumber = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  function store(getStorage, game, onError = () => {}) {
    const memory = new Map(), prefix = `gf:modes:${game}:`;
    function read(key, valid, fallback) {
      if (memory.has(key)) return memory.get(key);
      let value = fallback;
      try { const parsed = JSON.parse(getStorage().getItem(prefix + key)); if (valid(parsed)) value = parsed; } catch (error) { if (!(error instanceof SyntaxError)) onError('기록을 읽지 못해 이번 판에서만 기억해요'); }
      memory.set(key, value); return value;
    }
    function write(key, value) { memory.set(key, value); try { getStorage().setItem(prefix + key, JSON.stringify(value)); } catch { onError('기록을 저장하지 못해 이번 판에서만 기억해요'); } return value; }
    const starKey = (grade, id) => `stars:${grade}:${id}`;
    const api = {
      last: () => read('last', v => v && Number.isInteger(v.grade) && v.grade >= 1 && v.grade <= 6 && Object.hasOwn(names, v.play), null),
      select: (grade, play) => write('last', { grade, play }),
      best: (grade, play) => {
        const key = `best:${grade}:${play}`, value = read(key, validNumber, 0);
        if (value || play !== 'quick') return value;
        try { const old = getStorage().getItem(`gf:best:${game}:${grade}`); if (old !== null && old.trim() !== '' && validNumber(Number(old))) return write(key, Number(old)); }
        catch { onError('예전 기록을 읽지 못해 이번 판에서만 기억해요'); }
        return value;
      },
      record: (grade, play, score) => validNumber(score) ? write(`best:${grade}:${play}`, Math.max(api.best(grade, play), score)) : api.best(grade, play),
      stars: (grade, id) => read(starKey(grade, id), v => Number.isInteger(v) && v >= 0 && v <= 3, 0),
      complete: (grade, id, n) => Number.isInteger(n) && n >= 0 && n <= 3 ? write(starKey(grade, id), Math.max(api.stars(grade, id), n)) : api.stars(grade, id),
      total: grade => Array.from({ length: 10 }, (_, i) => api.stars(grade, i + 1)).reduce((a, b) => a + b, 0),
      unlocked: (grade, id) => id === 1 || api.stars(grade, id - 1) >= 1,
    }; return api;
  }
  function starCount(passed, stats, rules = {}) {
    if (!passed) return 0;
    const accuracy = stats.right / Math.max(1, stats.right + stats.wrong);
    const second = accuracy >= (rules.accuracy ?? .8);
    return 1 + Number(second) + Number(second && stats.wrong <= (rules.maxWrong ?? 1));
  }
  function create(config, { play = 'quick', stage = 1, onChange = () => {}, onMilestone = () => {} } = {}) {
    if (!Object.hasOwn(names, play)) throw Error('모드를 확인해 주세요');
    const level = play === 'stage' ? config.stage.stages.find(s => s.id === stage) : null;
    if (play === 'stage' && !level) throw Error('단계를 확인해 주세요');
    const state = { play, stage: level, elapsed: 0, remaining: play === 'quick' ? config.quick.startSec : level?.timeSec ?? Infinity,
      hearts: play === 'quick' ? null : level?.hearts ?? config.endless.hearts, progress: 0, combo: 0, right: 0, wrong: 0, ended: false, reason: null, paused: false, nextPower: config.powerupEvery || Infinity };
    const maxTime = config.quick.maxSec;
    function end(reason) { if (state.ended) return; state.ended = true; state.reason = reason; onChange('end', reason); }
    function addTime(sec) { if (state.ended || play !== 'quick') return 0; const old = state.remaining; state.remaining = Math.max(0, Math.min(maxTime, old + sec)); const gain = state.remaining - old; if (gain) onChange('time', gain); if (state.remaining <= 1e-9) end('time'); return gain; }
    function addHeart(n) { if (state.ended || state.hearts === null) return; const old = state.hearts; state.hearts = Math.max(0, Math.min(level?.hearts ?? config.endless.heartMax, old + n)); if (old !== state.hearts) onChange('heart', state.hearts - old); if (!state.hearts) end('hearts'); }
    function judge(kind, combo, { protectedWrong = false } = {}) {
      if (state.ended || state.paused) return;
      if (kind === 'right') {
        state.right++; state.combo = combo;
        if (play === 'quick') addTime(config.quick.onCorrectSec + (combo > 0 && combo % config.quick.comboEvery === 0 ? config.quick.comboSec : 0));
        if (level && level.goal.kind === 'right') setProgress(state.right);
        if (!level && state.right >= state.nextPower && !state.ended) { state.nextPower += config.powerupEvery; onMilestone(); }
      } else if (kind === 'wrong') { state.wrong++; state.combo = 0; if (!protectedWrong && config.wrongCostsHeart !== false) { if (play === 'quick') addTime(config.quick.onWrongSec); else addHeart(-1); } }
    }
    function setProgress(value) { if (level && !state.ended && validNumber(value)) { state.progress = value; if(value >= level.goal.target)end('goal'); } }
    function tick(dt) { if (state.paused || state.ended || !validNumber(dt)) return; state.elapsed += dt; if (play !== 'endless') state.remaining = Math.max(0, state.remaining - dt); if (play === 'quick' && state.elapsed >= 300 - 1e-9) end('five-minutes'); else if (state.remaining <= 1e-9) end('time'); }
    return { config, state, tick, judge, addTime, addHeart, setProgress, pause: on => { state.paused = on; }, end,
      result: stats => ({ play, name: names[play], stage: level?.id ?? null, title: level?.title, elapsed: state.elapsed, reason: state.reason, passed: state.reason === 'goal', stars: level ? starCount(state.reason === 'goal', stats, level.starRules) : null }) };
  }
  window.GFModes = { names, store, starCount, create };
})();
