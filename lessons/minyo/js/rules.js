// 팔도 장단 놀이 규칙: 화면과 소리에 기대지 않는 셈만 둔다 (시험은 tests/unit/minyo-rules.test.mjs)
(function (root) {
  'use strict';
  const WIN_PERFECT = 0.05, WIN_GOOD = 0.12, CATCH_BEATS = 0.45;
  const WIN_RELEASE_PERFECT = 0.07, WIN_RELEASE_GOOD = 0.15; // 손을 떼는 때는 누르는 때보다 맞추기 어렵다
  const SAVE_VERSION = 1;

  // d: 누른 때 - 칠 자리(초). 잡을 수 있는 범위 밖이면 null(칠 자리가 아닌 데서 침)
  function judge(d, beat, release = false) {
    const a = Math.abs(d);
    if (a <= (release ? WIN_RELEASE_PERFECT : WIN_PERFECT)) return 'perfect';
    if (a <= (release ? WIN_RELEASE_GOOD : WIN_GOOD)) return 'good';
    if (a <= beat * CATCH_BEATS) return d < 0 ? 'early' : 'late';
    return null;
  }
  const isHit = res => res === 'perfect' || res === 'good';
  // 상쇠: 하나도 안 놓치고 딱 맞음이 이만큼이면 받는다. 잘 치는 손도 몇 판에 한 번 나오게 맞췄다(tools/minyo-sim.mjs)
  const TOP_PERFECT = 0.85;
  const TOP_CHARGED = 4; // 메기는 소리 여섯 번 가운데 꾹 눌렀다 뗀 수
  // 메기는 묶음이 여섯보다 적은 곡(풍구 · 신고산 셋, 자진아리 넷)은 묶음 수의 2/3(올림)만 꾹 눌렀다 떼면 된다. 여섯 이상은 그대로 넷(2026-11-13)
  const topHoldFor = bars => { const groups = bars.filter((b, i) => b.call && !b.noHold && bars[i + 1] && !bars[i + 1].call && !bars[i + 1].rest).length; return Math.min(TOP_CHARGED, Math.ceil(groups * 2 / 3)); };
  const holdNeed = s => s.holdNeed ?? TOP_CHARGED;
  const isTop = s => s.n > 0 && s.hits === s.n && s.perfect / s.n >= TOP_PERFECT && (s.charged || 0) >= holdNeed(s);
  const topNeed = s => Math.max(0, Math.ceil(s.n * TOP_PERFECT) - s.perfect);
  const topHoldNeed = s => Math.max(0, holdNeed(s) - (s.charged || 0));

  // 풍년 도장: 1 쭉정이 · 2 알곡 · 3 산더미. 끝까지 부르면 적어도 쭉정이는 받는다
  const STAMPS = [null, '쭉정이', '알곡', '산더미'];
  const STAMP_AT = [0, 0, 0.5, 0.8];
  const stampFor = ratio => (ratio >= STAMP_AT[3] ? 3 : ratio >= STAMP_AT[2] ? 2 : 1);
  const hitsFor = (n, stamp) => Math.ceil(n * STAMP_AT[stamp]); // 그 도장에 필요한 맞힌 수

  function summarize(targets) {
    const n = targets.length, hits = targets.filter(t => isHit(t.res)).length;
    const count = res => targets.filter(t => t.res === res).length;
    return { n, hits, ratio: n ? hits / n : 0, perfect: count('perfect'), early: count('early'), late: count('late'), none: count('none'), spoiled: count('spoiled') };
  }

  // 끝 화면 글: 곡마다 마을 어른의 한마디가 있다. 하나도 안 놓치면 풍년
  const sayKey = (res, stamp) => (res.hits === 0 ? 'zero' : res.hits === res.n ? 'full' : stamp);
  // 가장 많이 한 실수 하나. 두 번 치는 마디의 둘째 박을 놓치면 두 번 치기를 헷갈린 것으로 본다
  // 받는 마디에서 칠 글자가 아닌 데 친 헛손(extra)이 칠 곳의 25%(적어도 4번)를 넘고 다른 잘못보다 많으면 그것을 고른다
  function mainMistake(list, releases = false, extra = 0) {
    const count = { spoiled: 0, second: 0, releaseEarly: 0, releaseLate: 0, hand: 0, early: 0, late: 0, none: 0 };
    for (const t of list) {
      if (isHit(t.res)) continue;
      const kind = t.res === 'spoiled' ? 'spoiled' : t.second ? 'second' : releases&&t.released&&t.res==='early' ? 'releaseEarly' : releases&&t.released&&t.res==='late' ? 'releaseLate' : t.res;
      if (kind in count) count[kind]++;
    }
    let most = null;
    for (const k of Object.keys(count)) if (count[k] > 0 && (most === null || count[k] > count[most])) most = k;
    if (extra >= Math.max(4, Math.ceil(list.length * 0.25)) && extra > (most === null ? 0 : count[most])) return 'extra';
    return most;
  }

  const emptySave = () => ({ v: SAVE_VERSION, stamps: {}, perfect: {}, top: {}, hard: {}, practiced: {}, songbookSeen: {}, introN: {}, learned: false, storySeen: false, rumorSeen: false, soundMapSeen: false, offsetMs: 0 });
  // 기기 저장은 언제든 깨질 수 있으니 꼴이 맞는 값만 받는다
  function cleanSave(raw) {
    const s = emptySave();
    if (!raw || typeof raw !== 'object' || raw.v !== SAVE_VERSION) return s;
    if (raw.stamps && typeof raw.stamps === 'object') for (const [id, n] of Object.entries(raw.stamps)) if (Number.isInteger(n) && n >= 1 && n <= 3) s.stamps[id] = n;
    if (raw.perfect && typeof raw.perfect === 'object') for (const [id, v] of Object.entries(raw.perfect)) if (v === true) s.perfect[id] = true;
    if (raw.top && typeof raw.top === 'object') for (const [id, v] of Object.entries(raw.top)) if (v === true) s.top[id] = true;
    if (raw.hard && typeof raw.hard === 'object') for (const [id, v] of Object.entries(raw.hard)) if (v === true) s.hard[id] = true;
    if (raw.practiced && typeof raw.practiced === 'object') for (const [id, v] of Object.entries(raw.practiced)) if (v === true) s.practiced[id] = true;
    if (raw.songbookSeen && typeof raw.songbookSeen === 'object') for (const [id, v] of Object.entries(raw.songbookSeen)) if (v === true) s.songbookSeen[id] = true;
    // 곡 소개를 띄운 횟수(판 21 낯선 말 돌리기)
    if (raw.introN && typeof raw.introN === 'object') for (const [id, n] of Object.entries(raw.introN)) if (Number.isInteger(n) && n >= 0 && n < 1e6) s.introN[id] = n;
    s.learned = typeof raw.learned === 'boolean' ? raw.learned : Object.keys(s.practiced).length > 0;
    // 첫머리 이야기(판 19): ① ~ ③을 봤는지 · ④ ⑤를 봤는지
    s.storySeen = raw.storySeen === true; s.rumorSeen = raw.rumorSeen === true;
    // 끝 장면 「소리 지도 완성」을 봤는지(2026-11-22)
    s.soundMapSeen = raw.soundMapSeen === true;
    if (Number.isFinite(raw.offsetMs) && Math.abs(raw.offsetMs) <= 500) s.offsetMs = raw.offsetMs;
    return s;
  }
  // 도장은 더 좋은 것만 남긴다
  function recordSong(save, songId, stamp, perfect = false, top = false) {
    const next = { ...save, stamps: { ...save.stamps }, perfect: { ...save.perfect }, top: { ...save.top }, practiced: { ...save.practiced, [songId]: true } };
    if (top) next.top[songId] = true;
    next.stamps[songId] = Math.max(next.stamps[songId] || 0, stamp);
    if (perfect) next.perfect[songId] = true;
    return next;
  }
  // 어려움 판: 들썩 도장을 받으면 열리고, 쉬운 판 도장은 건드리지 않는다
  const HARD_AT = 2;
  const hardOpen = (save, songId) => (save.stamps[songId] || 0) >= HARD_AT;
  function recordHard(save, songId, ok) {
    const next = { ...save, hard: { ...save.hard } };
    if (ok) next.hard[songId] = true;
    return next;
  }
  // 잔치: 곡이 있는 지역 가운데 아무 여섯 곳(지역이 여섯보다 적으면 모두)에서 도장을 하나 이상 받으면 열린다(2026-11-13 DECISIONS)
  const FEAST_REGIONS = 6;
  function feastGot(save, songs) {
    const regions = [...new Set(songs.filter(s => !s.later).map(s => s.region))];
    return { got: regions.filter(r => songs.some(s => s.region === r && !s.later && save?.stamps?.[s.id] >= 1)).length, need: Math.min(FEAST_REGIONS, regions.length) };
  }
  // 끝 장면 「소리 지도 완성」: 곡이 있는 지역 모두에서 도장을 하나 이상 받았는지(2026-11-22 대표 「아홉 고장 도장을 다 모을 때」)
  function soundMapOpen(save, songs) { const { got } = feastGot(save, songs), all = new Set(songs.filter(s => !s.later).map(s => s.region)).size; return all > 0 && got >= all; }
  function feastOpen(save, songs) { const { got, need } = feastGot(save, songs); return need > 0 && got >= need; }

  // 처음 배우기는 본판과 같은 판정을 쓴다. 도움은 동작만 보여 주며 성공을 대신하지 않는다.
  // 칠 곳의 3/4 이상(올림)을 맞히고 extra(칠 곳이 아닌 데서 누름)는 한 번까지. 칠 곳이 셋이면 올림이 셋 다라서, extra 없이 둘을 맞혀도 넘는다(쾌지나)
  const learnBarPassed = (results, extra = 0) => {
    const hits = results.filter(t => isHit(typeof t === 'string' ? t : t.res)).length;
    return results.length > 0 && (hits >= Math.ceil(results.length * .75) && extra <= 1 || results.length === 3 && hits >= 2 && extra === 0);
  };
  const learnHoldPassed = ({ press, start, beat, broken, release }) => Number.isFinite(press) && press >= start - .001 && press < start + beat && !broken && isHit(release);
  const learnProgress = () => ({ ok: 0, failed: 0, tries: 0 });
  const learnAttempt = (p, passed) => ({ ok: p.ok + (passed ? 1 : 0), failed: p.failed + (passed ? 0 : 1), tries: p.tries + 1 });
  const learnHelp = (p, step = 2) => step === 2 && p.failed >= 5 ? 'wait' : p.tries === 0 || p.failed >= 3 ? 'solid' : 'faint';
  const learnRetry = p => ({ ...p, failed: 0, tries: 0 });
  // 녹음 파형에서 잰 칠 자리와 그 앞의 조용한 틈. 본판의 칠 자리나 판정 폭은 바꾸지 않는다.
  const LEARN_LEADS = {
    'V5-017-002': [[5.135,.09],[7.635,.06],[8.885,.08]],
    'V5-040-018': [[5.44,.12],[6.62,.105],[7.95,.06],[9.19,.12]],
    'V5-054-004': [[4.87,.12],[6.24,.06],[7.35,.1],[8.53,.06]],
    'V5-022-002': [[5.15,.085],[6.36,.11],[7.65,.065],[8.86,.08]],
    'V5-019-002': [[2.71,.065],[3.39,.06],[4.04,.06],[4.71,.115]],
  };
  function learnSlices(song, duration = Infinity) {
    const d = song.practiceBar, v = song.voice, beat = 60 / (d.bpm || song.bpm);
    if (!v) return d.strikes.map((b,i)=>({from:b*beat,len:((d.strikes[i+1]??d.beats??4)-b)*beat}));
    const base = d.vfrom ?? d.half * v.bar + v.grid;
    const cuts = d.strikes.map(b=>{const at=base+b*beat,lead=LEARN_LEADS[d.clip]?.find(([t])=>Math.abs(t-at)<.015)?.[1]??.08;return Math.max(0,at-lead);});
    const end = Math.min(base + (d.vlen || v.bar), duration);
    return cuts.map((from,i)=>({from,len:(cuts[i+1]??end)-from}));
  }
  const learnWaitSeconds = (slices, reaction = 0) => slices.reduce((n,s)=>n+s.len+.4+reaction,0);
  // 끝 화면 박 맞추기 권함: 늦게(일찍) + 놓침이 40% 넘고 평균이 30ms 넘게 쏠리거나(R3-08), 판정된 누름 10개 이상의 평균이 60ms 넘게 쏠림.
  // 120ms 늦는 손은 절반쯤 맞음으로 잡혀 늦게 수가 40%까지 안 쌓인다(그래프 검수 4회차 R3-03). 고르지 않은 손(평균 0 근처)은 걸리지 않는다
  function calibAdvice(res, offs) {
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    return res.late + res.none >= res.n * 0.4 && mean > 0.03 || res.early + res.none >= res.n * 0.4 && mean < -0.03 || offs.length >= 10 && Math.abs(mean) >= 0.06;
  }
  // 지역 · 곡 열림(2026-11-27 대표): 제주부터 끝 장면 불 차례로 한 도씩, 도 안에서는 앞 곡을 끝내면 다음 곡.
  // 도는 앞 도에 도장이 하나라도 있거나 제 도에 도장이 있으면 열린다(이미 하던 아이의 판이 닫히지 않게)
  const REGION_ORDER = ['제주', '전라', '충청', '경기', '황해', '평안', '함경', '강원', '경상'];
  const SONG_ORDER = { 전라: ['geomun', 'dungdang', 'ganggang'], 경상: ['kwaeji', 'wolwol'] };
  const playable = s => !!s.bars && !s.hidden && !s.later;
  function regionSongs(region, songs) {
    const list = songs.filter(s => s.region === region && playable(s)), order = SONG_ORDER[region] || [];
    const at = s => { const i = order.indexOf(s.id); return i < 0 ? order.length + list.indexOf(s) : i; };
    return list.slice().sort((a, b) => at(a) - at(b));
  }
  const stampedIn = (save, region, songs) => regionSongs(region, songs).some(s => save && save.stamps[s.id]);
  function regionOpen(save, region, songs) {
    const i = REGION_ORDER.indexOf(region);
    if (i < 0) return false;
    return i === 0 || stampedIn(save, region, songs) || stampedIn(save, REGION_ORDER[i - 1], songs);
  }
  function songOpen(save, song, songs) {
    if (!playable(song) || !regionOpen(save, song.region, songs)) return false;
    const list = regionSongs(song.region, songs), k = list.indexOf(song);
    return k <= 0 || !!(save && (save.stamps[song.id] || save.stamps[list[k - 1].id]));
  }
  // 닫힌 곡 · 닫힌 도를 여는 법(목록 칸 · 지도 알림 글)
  function lockHow(song, songs) {
    const list = regionSongs(song.region, songs), k = list.indexOf(song);
    if (k > 0) { const w = list[k - 1].title; return `${w}${(w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를'} 끝내면 열려요`; }
    return regionLockHow(song.region);
  }
  function regionLockHow(region) {
    const prev = REGION_ORDER[REGION_ORDER.indexOf(region) - 1];
    return prev ? `${window.MINYO.REGIONS[prev].full} 노래를 하나 끝내면 열려요` : '';
  }
  const sealFor = (song, stamp, { top=false, hardOk=false, perfect=false }={}) => top ? 4 : hardOk ? (song.hardSeal || 5) : perfect && song.fullSeal ? song.fullSeal : stamp;
  root.MinyoRules = { judge, isHit, TOP_PERFECT, TOP_CHARGED, HARD_AT, topHoldFor, isTop, topNeed, topHoldNeed, STAMPS, stampFor, hitsFor, summarize, sayKey, mainMistake, emptySave, cleanSave, recordSong, hardOpen, recordHard, feastGot, feastOpen, soundMapOpen, REGION_ORDER, regionSongs, regionOpen, songOpen, lockHow, regionLockHow, sealFor, calibAdvice, learnBarPassed, learnHoldPassed, learnProgress, learnAttempt, learnHelp, learnRetry, learnSlices, learnWaitSeconds };
})(typeof window !== 'undefined' ? window : globalThis);
