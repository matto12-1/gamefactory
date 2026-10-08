(function () {
  'use strict';
  window.GFFamilies = window.GFFamilies || {};
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const rat = (n, d = 1) => { const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const add = (a, b, sign = '+') => rat(a.n * b.d + (sign === '+' ? 1 : -1) * b.n * a.d, a.d * b.d);
  const mul = (a, b) => rat(a.n * b.n, a.d * b.d);
  const div = (a, b) => rat(a.n * b.d, a.d * b.n);
  function rng(seed) {
    let state = seed >>> 0;
    return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function value(t) {
    if (typeof t !== 'string') return null;
    if (/^\d+$/.test(t)) return rat(Number(t));
    if (/^\d+\.\d+$/.test(t)) { const [a, b] = t.split('.'); return rat(Number(a + b), 10 ** b.length); }
    if (/^\d+\/\d+$/.test(t)) { const [n, d] = t.split('/').map(Number); return d > 0 ? rat(n, d) : null; }
    return null;
  }
  const same = (a, b) => { const x = value(a), y = value(b); return x && y ? x.n === y.n && x.d === y.d : a === b; };
  const kindOf = t => t.includes('/') ? 'frac' : t.includes('.') ? 'dec' : 'nat';
  function format(v, kind) {
    if (!v || !Number.isFinite(v.n) || !(v.d > 0) || v.n < 0) return null;
    v = rat(v.n, v.d);
    if (kind === 'dec') { const T = 10 * v.n / v.d; return Number.isInteger(T) ? T % 10 === 0 ? String(T / 10) : `${Math.floor(T / 10)}.${T % 10}` : null; }
    if (v.d === 1) return String(v.n);
    return kind === 'frac' && v.n < v.d ? `${v.n}/${v.d}` : null;
  }
  const width = t => [...t].reduce((n, c) => n + (c.codePointAt(0) < 128 ? .6 : 1), 0);
  const josa = n => [0, 1, 3, 6, 7, 8].includes(n % 10) ? '과' : '와';
  const ladder = {
    1: [['add9', 'sub9'], ['make10', 'add10'], ['addCarry', 'subBorrow']],
    2: [['addCarry', 'subBorrow'], ['add21', 'sub21', 'tens'], ['times']],
    3: [['times0'], ['div', 'mul21'], ['mul21c', 'add33']],
    4: [['div', 'mul21any'], ['fracSame', 'decAdd'], ['tensTimes', 'div21']],
    5: [['mixed', 'paren'], ['equivFrac', 'gcdLcm'], ['fracAdd', 'fracNat', 'decNat']],
    6: [['fracAdd', 'fracNat', 'decNat'], ['fracDivNat', 'decDivNat'], ['fracDiv', 'percent', 'ratio']]
  };
  const fstr = a => `${a[0]}/${a[1]}`, dec = a => format(rat(a, 10), 'dec');
  function build(form, ops) {
    const [a, b, c, d] = ops; let q, v, kind = 'nat';
    switch (form) {
      case 'add9': case 'add10': case 'addCarry': case 'add21': q = `${a} + ${b}`; v = rat(a + b); break;
      case 'sub9': case 'subBorrow': case 'sub21': q = `${a} - ${b}`; v = rat(a - b); break;
      case 'make10': return { form, ops, q: `${a} + □ = 10`, a: String(10 - a), kind };
      case 'times': case 'times0': case 'mul21': case 'mul21c': case 'mul21any': case 'tensTimes': q = `${a} × ${b}`; v = rat(a * b); break;
      case 'div': case 'div21': q = `${a} ÷ ${b}`; v = rat(a, b); break;
      case 'tens': case 'add33': q = `${b} ${a} ${c}`; v = rat(a === '+' ? b + c : b - c); break;
      case 'mixed': q = `${b} ${a} ${c} × ${d}`; v = rat(a === '+' ? b + c * d : b - c * d); break;
      case 'paren': q = `(${a} + ${b}) × ${c}`; v = rat((a + b) * c); break;
      case 'fracSame': kind = 'frac'; q = `${fstr(b)} ${a} ${fstr(c)}`; v = add(rat(...b), rat(...c), a); break;
      case 'decAdd': kind = 'dec'; q = `${dec(b)} ${a} ${dec(c)}`; v = rat(a === '+' ? b + c : b - c, 10); break;
      case 'equivFrac': return { form, ops, q: `${fstr(a)} = □/${b}`, a: format(rat(a[0] * b, a[1]), kind), kind };
      case 'gcdLcm': { const g = gcd(b, c); return { form, ops, q: `${b}${josa(b)} ${c}의 ${a === 'gcd' ? '최대공약수' : '최소공배수'}는 □`, a: String(a === 'gcd' ? g : b * c / g), kind }; }
      case 'fracAdd': kind = 'frac'; q = `${fstr(a)} + ${fstr(b)}`; v = add(rat(...a), rat(...b)); break;
      case 'fracNat': case 'fracDivNat': kind = 'frac'; q = `${fstr(a)} ${form === 'fracNat' ? '×' : '÷'} ${b}`; v = form === 'fracNat' ? mul(rat(...a), rat(b)) : div(rat(...a), rat(b)); break;
      case 'decNat': case 'decDivNat': kind = 'dec'; q = `${dec(a)} ${form === 'decNat' ? '×' : '÷'} ${b}`; v = form === 'decNat' ? rat(a * b, 10) : rat(a, 10 * b); break;
      case 'fracDiv': kind = 'frac'; q = `${fstr(a)} ÷ ${fstr(b)}`; v = div(rat(...a), rat(...b)); break;
      case 'percent': return { form, ops, q: `${a}의 ${b}%는 □`, a: format(rat(a * b, 100), kind), kind };
      case 'ratio': return { form, ops, q: `${a} : ${b} = ${c} : □`, a: format(rat(b * c, a), kind), kind };
      default: throw Error(`문제 꼴 ${form}을 몰라요`);
    }
    return { form, ops, q: `${q} = □`, a: format(v, kind), kind };
  }
  function make(form, random) {
    const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1)), sign = () => random() < .5 ? '+' : '-';
    const fraction = (max = 9, min = 2) => { const d = int(min, max); return [int(1, d - 1), d]; };
    for (let attempt = 0; attempt < 10000; attempt++) {
      let ops, ok = true, a, b, s;
      switch (form) {
        case 'add9': a = int(1, 8); b = int(1, 8); ops = [a, b]; ok = a + b <= 9; break;
        case 'sub9': a = int(2, 9); ops = [a, int(1, a - 1)]; break;
        case 'make10': ops = [int(1, 9)]; break;
        case 'add10': a = int(1, 9); b = int(1, 9); ops = [a, b]; ok = a + b <= 10; break;
        case 'addCarry': a = int(2, 9); b = int(2, 9); ops = [a, b]; ok = a + b >= 11; break;
        case 'subBorrow': a = int(11, 18); b = int(2, 9); ops = [a, b]; ok = a % 10 < b; break;
        case 'add21': a = int(11, 89); b = int(2, 9); ops = [a, b]; ok = a % 10 + b >= 10 && a + b <= 99; break;
        case 'sub21': a = int(21, 99); b = int(2, 9); ops = [a, b]; ok = a % 10 < b; break;
        case 'tens': s = sign(); a = 10 * int(1, 9); b = 10 * int(1, 9); ops = [s, a, b]; ok = s === '+' || a > b; break;
        case 'times': ops = [int(2, 9), int(1, 9)]; break;
        case 'times0': ops = [int(1, 9), int(0, 9)]; break;
        case 'div': a = int(2, 9); ops = [a * int(1, 9), a]; break;
        case 'mul21': case 'mul21c': case 'mul21any': a = int(11, 99); b = int(2, 9); ops = [a, b]; ok = form === 'mul21any' || (form === 'mul21' ? a % 10 * b <= 9 && Math.floor(a / 10) * b <= 9 : a % 10 * b >= 10); break;
        case 'add33': s = sign(); a = int(100, 999); b = int(100, 999); ops = [s, a, b]; ok = s === '+' ? a + b <= 999 && [1, 10, 100].some(p => Math.floor(a / p) % 10 + Math.floor(b / p) % 10 >= 10) : a > b && [1, 10, 100].some(p => Math.floor(a / p) % 10 < Math.floor(b / p) % 10); break;
        case 'fracSame': s = sign(); a = fraction(9, 3); b = [int(1, a[1] - 1), a[1]]; ops = [s, a, b]; { const n = s === '+' ? a[0] + b[0] : a[0] - b[0]; ok = n > 0 && n < a[1] && gcd(n, a[1]) === 1; } break;
        case 'decAdd': s = sign(); a = int(1, 99); b = int(1, 99); ops = [s, a, b]; ok = a % 10 !== 0 && b % 10 !== 0 && (s === '+' || a > b); break;
        case 'tensTimes': ops = [10 * int(1, 9), 10 * int(1, 9)]; break;
        case 'div21': a = int(2, 9); ops = [a * int(10, Math.floor(99 / a)), a]; break;
        case 'mixed': s = sign(); a = int(10, 60); b = int(2, 9); ops = [s, a, b, int(2, 9)]; ok = s === '+' || a > b * ops[3]; break;
        case 'paren': ops = [int(2, 20), int(2, 9), int(2, 9)]; break;
        case 'equivFrac': a = fraction(); ops = [a, a[1] * int(2, 4)]; ok = gcd(...a) === 1; break;
        case 'gcdLcm': a = int(4, 30); b = int(4, 30); ops = [random() < .5 ? 'gcd' : 'lcm', a, b]; ok = a !== b && gcd(a, b) >= 2 && a * b / gcd(a, b) <= 100; break;
        case 'fracAdd': a = fraction(6); b = fraction(6); ops = [a, b]; ok = a[1] !== b[1] && gcd(...a) === 1 && gcd(...b) === 1 && a[0] * b[1] + b[0] * a[1] < a[1] * b[1]; break;
        case 'fracNat': case 'fracDivNat': a = fraction(); b = int(2, 9); ops = [a, b]; ok = gcd(...a) === 1 && (form !== 'fracDivNat' || rat(a[0], a[1] * b).d <= 30); break;
        case 'decNat': a = int(1, 99); ops = [a, int(2, 9)]; ok = a % 10 !== 0; break;
        case 'decDivNat': a = int(1, 99); b = int(2, 9); ops = [a * b, b]; ok = a % 10 !== 0 && a * b <= 99 && a * b % 10 !== 0; break;
        case 'fracDiv': a = fraction(12); b = fraction(12); ops = [a, b]; ok = gcd(...a) === 1 && gcd(...b) === 1; break;
        case 'percent': ops = [[20, 40, 50, 60, 80, 100, 120, 200, 300, 400][int(0, 9)], [10, 20, 25, 50, 75][int(0, 4)]]; break;
        case 'ratio': a = int(1, 9); b = int(1, 9); ops = [a, b, a * int(2, 5)]; ok = a !== b; break;
        default: throw Error(`문제 꼴 ${form}을 몰라요`);
      }
      if (!ok) continue;
      const item = build(form, ops);
      if (item.a !== null && (form !== 'fracDiv' || value(item.a).d !== 1 || Number(item.a) <= 9)) return item;
    }
    throw Error(`문제 꼴 ${form}의 수를 못 골랐어요`);
  }
  function mistakes(form, ops) {
    const [a, b, c, d] = ops, nat = n => [rat(n)];
    switch (form) {
      case 'addCarry': return nat(a + b - 10);
      case 'subBorrow': case 'sub21': return nat(10 * Math.floor(a / 10) + b - a % 10);
      case 'add21': return nat(10 * Math.floor(a / 10) + (a % 10 + b) % 10);
      case 'tens': return nat((a === '+' ? b + c : b - c) / 10);
      case 'times': case 'times0': return b === 0 ? nat(a) : [rat(a * (b - 1)), rat(a * (b + 1))];
      case 'div': case 'div21': return [a / b - 1, a / b + 1].filter(n => n >= 1).map(n => rat(n));
      case 'mul21c': case 'mul21any': return a % 10 * b >= 10 ? nat(10 * Math.floor(a / 10) * b + a % 10 * b % 10) : [];
      case 'add33': return nat([1, 10, 100].reduce((n, p) => { const x = Math.floor(b / p) % 10, y = Math.floor(c / p) % 10; return n + p * (a === '+' ? (x + y) % 10 : Math.abs(x - y)); }, 0));
      case 'fracSame': return a === '+' ? [rat(b[0] + c[0], b[1] * 2)] : [];
      case 'decAdd': return nat(a === '+' ? b + c : b - c);
      case 'tensTimes': return nat(a * b / 10);
      case 'mixed': return nat((a === '+' ? b + c : b - c) * d);
      case 'paren': return nat(a + b * c);
      case 'equivFrac': return nat(a[0] + b - a[1]);
      case 'gcdLcm': return nat(a === 'gcd' ? b * c / gcd(b, c) : gcd(b, c));
      case 'fracAdd': return [rat(a[0] + b[0], a[1] + b[1])];
      case 'fracNat': return [rat(a[0], a[1] * b)];
      case 'fracDivNat': return [rat(a[0] * b, a[1])];
      case 'decNat': return nat(a * b);
      case 'decDivNat': return nat(a / b);
      case 'fracDiv': return [rat(a[0] * b[0], a[1] * b[1])];
      case 'percent': return [rat(a * b / 10), rat(b)];
      case 'ratio': return nat(b + c - a);
      default: return [];
    }
  }
  function shuffle(list, random) { list = list.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; }
  function wrongs(item, random) {
    const v = value(item.a); if (!v) return null;
    const candidates = mistakes(item.form, item.ops), offsets = [1, -1, 2, -2, 10, -10];
    if (item.kind === 'dec') candidates.push(...shuffle(offsets, random).map(k => rat(v.n * 10 / v.d + k, 10)));
    else if (v.d === 1) candidates.push(...shuffle(offsets, random).map(k => rat(v.n + k)));
    else { candidates.push(...shuffle([1, -1], random).map(k => rat(v.n + k, v.d))); for (const k of shuffle([1, -1], random)) if (v.d + k > 0) candidates.push(rat(v.n, v.d + k)); }
    const result = [];
    for (const candidate of candidates) {
      const t = format(candidate, item.kind);
      if (t === null || t.length > 8 || width(t) > 4 + 1e-9 || same(t, item.a) || result.some(r => same(r, t))) continue;
      result.push(t); if (result.length === 2) return result;
    }
    return null;
  }
  const levelOf = n => n <= 8 ? 1 : n <= 20 ? 2 : 3;
  function pick(grade, level, random) {
    const forms = ladder[grade][level - 1];
    for (let i = 0; i < 50; i++) {
      const form = forms[Math.floor(random() * forms.length)], item = make(form, random), wrong = wrongs(item, random);
      if (wrong && item.a.length <= 8 && width(item.a) <= 4 + 1e-9) return { q: item.q, a: item.a, wrong, form, level };
    }
    throw Error('쉰 번 안에 문제를 만들지 못했어요');
  }
  function maker(content, grade, random) {
    if (content.gen === 'arith') { const seen = new Set(); return { next(n) { let item; for (let i = 0; i <= 20; i++) { item = pick(grade, levelOf(n), random); if (!seen.has(item.q)) break; } seen.add(item.q); return item; } }; }
    if (content.bands) { const recent = [], mix = Object.entries(content.mix[grade]); return { next() {
      const roll = random(); let sum = 0, band = mix[mix.length - 1][0];
      for (const [name, weight] of mix) { sum += weight; if (roll < sum) { band = name; break; } }
      const pool = content.bands[band].filter(item => !recent.includes(item.q));
      if (!pool.length) throw Error('최근 여섯 문제 밖에서 고를 문제가 없어요');
      const item = pool[Math.floor(random() * pool.length)], candidates = [];
      for (const t of shuffle(item.wrong, random)) if (!same(t, item.a) && !candidates.some(c => same(c, t))) candidates.push(t);
      if (candidates.length < 2) throw Error('서로 다른 틀린 답 둘이 필요해요');
      recent.push(item.q); if (recent.length > 6) recent.shift();
      return { q: item.q, a: item.a, wrong: candidates.slice(0, 2), form: null, level: null };
    } }; }
    throw Error('문제 만들기 방식이나 문제 묶음이 필요해요');
  }
  function deal(item, random) { const answers = shuffle([item.a, ...item.wrong], random); return { answers, right: answers.findIndex(t => same(t, item.a)) }; }
  function samples(content, grades) {
    const items = [];
    for (let grade = grades[0]; grade <= grades[1]; grade++) for (let level = 1; level <= 3; level++) { const random = rng(grade * 100 + level); for (let i = 0; i < 200; i++) items.push(pick(grade, level, random)); }
    return items;
  }
  function check(content, family, game = {}) {
    const errors = [], limits = family.limits, grades = game.grades || family.defaults.grades;
    if (typeof content?.about !== 'string' || !content.about.trim()) errors.push('내용 설명이 필요해요');
    const valid = (s, max) => typeof s === 'string' && s.trim() && [...s].length <= max;
    function answers(item, generated) {
      const all = [item?.a, ...(Array.isArray(item?.wrong) ? item.wrong : [])];
      for (const t of all) {
        if (!valid(t, limits.a)) errors.push('답 길이를 확인해요');
        else if (width(t) > 4 + 1e-9) errors.push('팻말 답은 네 칸 이하여야 해요');
        if (generated && (value(t) === null || format(value(t), kindOf(t)) !== t)) errors.push('답은 약분한 분수나 한 자리 소수, 자연수로 써요');
      }
      const distinct = [];
      for (const t of item?.wrong || []) if (!same(t, item.a) && !distinct.some(d => same(d, t))) distinct.push(t);
      if (distinct.length < 2 || generated && distinct.length !== (item.wrong || []).length) errors.push('서로 다른 틀린 답 둘이 필요해요');
    }
    if (content.gen !== undefined) {
      if (content.gen !== 'arith') errors.push(`만들기 방식 「${content.gen}」을 몰라요`);
      else {
        for (let grade = grades[0]; grade <= grades[1]; grade++) for (let level = 1; level <= 3; level++) {
          const random = rng(grade * 100 + level);
          for (let i = 0; i < 200; i++) {
            try { const item = pick(grade, level, random); if (!valid(item.q, limits.q) || (item.q.match(/□/g) || []).length !== 1 || /[^\d\s+\-×÷=□:%()/.와과의최대공약수는소배]/u.test(item.q)) errors.push('문제 글과 빈칸을 확인해요'); answers(item, true); }
            catch (e) { errors.push(e.message); }
          }
        }
      }
    } else if (content.bands && typeof content.bands === 'object') {
      for (const [band, items] of Object.entries(content.bands)) {
        if (!Array.isArray(items) || items.length < limits.bandMin) errors.push(`${band}: 문제 묶음은 ${limits.bandMin}개 이상이어야 해요`);
        if (!Array.isArray(items)) continue;
        for (const item of items) { if (!valid(item?.q, limits.q)) errors.push('문제 글 길이를 확인해요'); answers(item, false); }
      }
      for (let grade = grades[0]; grade <= grades[1]; grade++) {
        const mix = content.mix?.[grade], values = Object.values(mix || {});
        if (!mix || !values.length || Object.keys(mix).some(k => !Object.hasOwn(content.bands, k))) errors.push(`${grade}학년 문제 묶음 비율을 확인해요`);
        if (!values.length || values.some(v => !Number.isFinite(v) || v < 0) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > .001) errors.push(`${grade}학년 비율 합은 1이어야 해요`);
      }
    } else errors.push('문제 만들기 방식이나 문제 묶음이 필요해요');
    return errors;
  }
  function checkArt(art) {
    const errors = [], sky = art?.slots?.['bg-sky'];
    if (!(sky?.anchors?.horizon >= .3 * sky.h && sky.anchors.horizon <= .7 * sky.h)) errors.push('지평선 자리를 확인해요');
    for (let i = 0; i < 3; i++) { const s = art?.slots?.[`gate-${i}`], p = s?.anchors?.plate; if (!p || p.y + p.h > s.h / 2) errors.push(`gate-${i}: 팻말 자리는 문 위 절반 안에 있어야 해요`); }
    return errors;
  }
  function texts(content, game = {}) { return (content.gen === 'arith' ? samples(content, game.grades || [1, 6]) : Object.values(content.bands || {}).flat()).flatMap(i => [i.q, i.a, ...i.wrong]); }
  (window.GFFamilies.runner ||= {}).rules = { rng, levelOf, gateTime: (mult, grade) => Math.max(3, 6 - .6 * (mult - 1)) + (grade >= 5 ? 1 : 0), points: (mult, fast) => mult * (fast ? 15 : 10), botChoice: (kind, n) => kind === 'right' || kind === 'mix' && n % 5 !== 0,
    value, same, josa, format, width, ladder, build, make, mistakes, wrongs, pick, maker, deal, check, checkArt, texts };
})();
