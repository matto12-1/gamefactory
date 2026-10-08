(function () {
  'use strict';
  window.GFFamilies = window.GFFamilies || {};
  function check(content, family, game) {
    const errors = [], limits = family.limits;
    if (typeof content?.about !== 'string' || !content.about.trim()) errors.push('내용 설명이 필요해요');
    const bands = content?.bands;
    if (!bands || typeof bands !== 'object' || Array.isArray(bands) || !Object.keys(bands).length) return [...errors, '낱말 띠가 필요해요'];
    const rightWords = new Set(), wrongWords = new Set();
    const valid = (word, max) => typeof word === 'string' && word.trim().length > 0 && [...word].length <= max;
    for (const [band, items] of Object.entries(bands)) {
      if (!Array.isArray(items) || items.length < limits.bandMin) errors.push(`${band}: 낱말 묶음은 ${limits.bandMin}개 이상이어야 해요`);
      if (!Array.isArray(items)) continue;
      for (const [i, item] of items.entries()) {
        const label = `${band} ${i + 1}`;
        if (!valid(item?.right, limits.right)) errors.push(`${label}: 바른 말 길이를 확인해요`);
        else rightWords.add(item.right);
        if (!Array.isArray(item?.wrong) || !item.wrong.length) errors.push(`${label}: 틀린 말이 필요해요`);
        else {
          if (new Set(item.wrong).size !== item.wrong.length || item.wrong.includes(item.right)) errors.push(`${label}: 틀린 말은 서로 다르고 바른 말과 달라야 해요`);
          for (const word of item.wrong) { if (!valid(word, limits.wrong)) errors.push(`${label}: 틀린 말 길이를 확인해요`); else wrongWords.add(word); }
        }
        if (item?.tip !== undefined && (typeof item.tip !== 'string' || [...item.tip].length > limits.tip)) errors.push(`${label}: 설명 길이를 확인해요`);
      }
    }
    for (const word of rightWords) if (wrongWords.has(word)) errors.push(`「${word}」가 바른 말과 틀린 말에 함께 있어요`);
    for (let grade = game.grades[0]; grade <= game.grades[1]; grade++) {
      const mix = content.mix?.[grade];
      if (!mix || typeof mix !== 'object' || Array.isArray(mix) || !Object.keys(mix).length) { errors.push(`${grade}학년 비율이 필요해요`); continue; }
      if (Object.keys(mix).some(b => !Object.hasOwn(bands, b))) errors.push(`${grade}학년 비율에 없는 띠가 있어요`);
      const values = Object.values(mix);
      if (values.some(v => !Number.isFinite(v) || v < 0) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > .001) errors.push(`${grade}학년 비율 합은 1이어야 해요`);
    }
    return errors;
  }
  function checkArt(art) {
    const errors = [], slots = art?.slots || {};
    for (const name of ['bg-wide', 'bg-tall']) {
      const slot = slots[name], holes = slot?.anchors?.holes;
      if (!Array.isArray(holes) || holes.length !== 9 || holes.some(h => !h || ![h.x, h.y, h.w, h.h].every(Number.isFinite))) { errors.push(`${name}: 구멍 아홉 개가 필요해요`); continue; }
      const rows = [holes.slice(0, 3), holes.slice(3, 6), holes.slice(6, 9)];
      for (const row of rows) if (!(row[0].x < row[1].x && row[1].x < row[2].x)) errors.push(`${name}: 줄 안의 구멍은 왼쪽부터 놓아요`);
      for (let i = 0; i < 2; i++) {
        if (!(Math.max(...rows[i].map(h => h.y)) < Math.min(...rows[i + 1].map(h => h.y)))) errors.push(`${name}: 뒤 줄부터 앞 줄로 놓아요`);
        if (!(rows[i].reduce((n, h) => n + h.w, 0) < rows[i + 1].reduce((n, h) => n + h.w, 0))) errors.push(`${name}: 앞 줄 구멍이 더 넓어야 해요`);
      }
      if (holes.some(h => h.w <= 0 || h.h <= 0 || h.x - h.w / 2 < 0 || h.y - h.h / 2 < 0 || h.x + h.w / 2 > slot.w || h.y + h.h / 2 > slot.h)) errors.push(`${name}: 구멍이 그림 밖에 있어요`);
    }
    for (const name of ['mole-up', 'mole-hit', 'mole-taunt']) { const s = slots[name]; if (!(s?.anchors?.holeW > 0 && s.anchors.holeW <= s.w)) errors.push(`${name}: 몸 아래 폭을 확인해요`); }
    const up = slots['mole-up']?.anchors;
    if (!up?.sign || !up.base || !(up.sign.y + up.sign.h < up.base.y)) errors.push('팻말 아래 끝은 몸 아래 기준점보다 위여야 해요');
    const hammer = slots.hammer?.anchors;
    if (!hammer?.head || !hammer.grip || !(hammer.head.y < hammer.grip.y)) errors.push('망치 머리는 손잡이보다 위여야 해요');
    return errors;
  }
  function texts(content) { return [...Object.values(content.bands).flatMap(items => items.flatMap(item => [item.right, ...item.wrong, ...(item.tip ? [item.tip] : [])])), '잘 참았어요', '놓쳤어요']; }
  function picker(content, grade, random) {
    const recent = [], mix = Object.entries(content.mix[grade]);
    return { next() {
      const roll = random(); let sum = 0, band = mix[mix.length - 1][0];
      for (const [name, weight] of mix) { sum += weight; if (roll < sum) { band = name; break; } }
      const all = content.bands[band], pool = all.filter(item => !recent.includes(item)), items = pool.length ? pool : all;
      const item = items[Math.floor(random() * items.length)], right = random() < .55;
      const word = right ? item.right : item.wrong[Math.floor(random() * item.wrong.length)];
      recent.push(item); if (recent.length > 6) recent.shift();
      return { band, item, word, right };
    } };
  }
  (window.GFFamilies.mole ||= {}).rules = { check, checkArt, texts, picker,
    upTime: t => Math.max(1.3, 2.6 - .25 * Math.floor(t / 15)), maxUp: t => t < 30 ? 1 : t < 60 ? 2 : 3,
    points: level => 10 * (1 + level), botChoice: (kind, right, n) => kind === 'wrong' || kind === 'mix' && n % 5 === 0 ? !right : right };
})();
