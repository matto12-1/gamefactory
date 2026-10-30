(function () {
  'use strict';
  const S = window.GFFamilies.survivor, C = S.reviewCore;
  const base = new URL('.', document.currentScript.src), version = new URL(document.currentScript.src).search;
  const el = (tag, text, parent, test) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (test) n.dataset.test = test; parent?.append(n); return n; };
  const button = (text, parent, test, action) => { const b = el('button', text, parent, test); b.type = 'button'; b.onclick = action; return b; };
  const select = (rows, value, parent, test) => { const s = el('select', null, parent, test); for (const [id, name] of rows) { const o = el('option', name, s); o.value = id; } s.value = String(value); return s; };
  const check = (text, value, parent, test, action) => { const l = el('label', null, parent); const i = el('input', null, l, test); i.type = 'checkbox'; i.checked = value; l.append(document.createTextNode(text)); i.onchange = () => action?.(i.checked); return i; };
  async function open() {
    const css = el('link', null, document.head); css.rel = 'stylesheet'; css.href = new URL('review.css', base).href + version;
    const json = async path => { const r = await fetch(path + version); if (!r.ok) throw Error(path + ': ' + r.status); return r.json(); };
    const [family, game, content, art, kitFeel, familyFeel] = await Promise.all([
      json('../../families/survivor/family.json'), json('game.json'), json('content.json'), json('art.json'), json('../../kit/feel.json'), json('../../families/survivor/feel.json')]);
    const cat = C.catalogue(content, family.tuning), images = {}, pictures = new Map();
    const load = spec => {
      if (!pictures.has(spec.file)) pictures.set(spec.file, new Promise((resolve, reject) => {
        const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(Error('그림을 읽지 못했어요: ' + spec.file)); i.src = spec.file + version;
      }));
      return pictures.get(spec.file);
    };
    const data = { family, game, content, art, feel: window.GFFeel.merge(kitFeel, familyFeel) };
    let options = { ...C.defaults(content), yard: true };
    const storageKey = 'gf:survivor:review:v1';
    try { options = C.normalize(content, family.tuning, { ...JSON.parse(sessionStorage.getItem(storageKey) || 'null'), yard: true }); }
    catch (e) { if (e instanceof SyntaxError) console.warn('저장한 검수 조합을 다시 고릅니다.'); else throw e; }
    const save = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(options)); } catch (e) { status.textContent = '이 창에서는 조합을 기억할 수 없어요: ' + e.message; } };
    const root = el('main', null, document.body, 'survivor-review'); root.className = 'sv-review';
    const head = el('header', null, root); head.className = 'rv-head'; el('h1', '역사 영웅 검수실', head);
    const peopleTab = button('인물', head, 'review-tab-people', () => tab('people'));
    const weaponsTab = button('허수아비 마당', head, 'review-tab-weapons', () => launch(false));
    el('small', '검수 판은 엽전·별·기록·순위에 남지 않아요', head);
    const gallery = el('section', null, root, 'review-people'); gallery.className = 'rv-tab-content';
    const top = el('div', null, gallery); top.className = 'rv-line';
    button('모래색 바탕', top, 'review-sand', () => gallery.classList.remove('rv-dark'));
    button('어두운 바탕', top, 'review-dark', () => gallery.classList.add('rv-dark'));
    const galleryNote = el('small', '그림을 읽고 있어요', top, 'review-gallery-status');
    const canvases = [];
    const battleScale = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      return Math.max(1, Math.round(Math.min(innerWidth, innerHeight) * dpr / family.tuning.view.short)) / dpr;
    };
    function sizePreview(canvas, spec, multiple, row, slot = row.slots[0]) {
      // 싸움에서 쓰는 표시 배율을 따른다. 원본 그림의 칸 수가 늘어도 사람 키는 같다.
      const person = row.group === 'heroes' || row.group === 'allies';
      const scale = person ? S.allies.personDisplay({ art, family }, slot, row.group === 'allies').scale : spec.display?.scale || 1;
      const size = battleScale() * scale * multiple;
      canvas.style.width = spec.w * size + 'px'; canvas.style.height = spec.h * size + 'px';
    }
    const groupNames = { heroes: '주인공', allies: '동료 · 고유 효과 인물', bosses: '장수 · 부장과 대장', foes: '시대별 적 병사' };
    for (const [group, label] of Object.entries(groupNames)) {
      const section = el('section', null, gallery); section.className = 'rv-groups'; el('h2', label, section);
      const grid = el('div', null, section); grid.className = 'rv-grid' + (group === 'bosses' ? ' rv-bosses' : '');
      for (const row of cat.people.filter(p => p.group === group)) {
        const card = el('article', null, grid); card.className = 'rv-person'; card.dataset.reviewPerson = row.id; card.dataset.group = group;
        el('h3', row.name, card); const pair = el('div', null, card); pair.className = 'rv-pair';
        function preview(multiple, variant = null) {
          const figure = el('figure', null, pair), canvas = el('canvas', null, figure);
          canvas.dataset.reviewSlot = row.slots[0]; canvas.setAttribute('aria-label', `${row.name} ${multiple === 1 ? '싸움 크기' : '3배'}`);
          const spec = art.ui?.battle?.sprites?.[row.slots[0]] || art.slots[row.slots[0]];
          if (!spec) throw Error('그림 이름이 없어요: ' + row.slots[0]);
          canvas.width = spec.w; canvas.height = spec.h; sizePreview(canvas, spec, multiple, row);
          canvases.push({ canvas, row, variant, multiple }); el('figcaption', (variant ? '금빛 분신 · ' : '') + (multiple === 1 ? '싸움 크기' : '3배'), figure);
        }
        for (const multiple of [1, 3]) preview(multiple);
        el('small', `${(row.eras?.length ? row.eras : [row.era]).map(id => content.eras.find(e => e.id === id)?.name || id || '기본').join(' · ')} · ${row.role}`, card);
        el('small', row.slots.join(' / '), card);
        const walkSpec = art.ui?.battle?.sprites?.[row.slots[0]] || art.slots[row.slots[0]];
        if (row.slots[0] === row.slots[1] && walkSpec.frames === 1) el('small', '이 인물의 기존 그림은 한 장입니다.', card);
        const a = content.allies.find(a => a.person === row.id);
        if (group === 'allies' && a) {
          el('small', a.story, card);
          el('small', '각성: ' + S.rules.T.allyAwaken[a.does], card);
          const only = family.tuning.allyOnly?.[row.id];
          if (only) el('small', '이 사람만: ' + S.rules.fmt(S.rules.T.allyOnly[only.kind], ...S.rules.onlyValues(only)), card);
          if (a.does === 'orbit') {
            const twins = el('div', null, card); twins.className = 'rv-pair';
            const previousPair = pair;
            for (const multiple of [1, 3]) { preview(multiple, 'y'); twins.append(previousPair.lastElementChild); }
          }
        }
      }
    }
    const form = el('aside', null, root, 'review-weapons'); form.className = 'rv-form'; form.hidden = true;
    el('h2', '바꾸면 바로 적용', form);
    const status = el('p', '주인공·무기·단계를 누르면 지금 마당에 적용돼요.', form, 'review-status'); status.setAttribute('role', 'status');
    const field = el('div', null, form); field.className = 'rv-line';
    const era = select(content.packs.map(p => [p.id, p.name]), options.cell, el('label', '허수아비 시대 ', field), 'review-era');
    check('기본 무기 함께', options.baseWeapon, form, 'review-base-weapon', on => { options.baseWeapon = on; editKit(); });
    check('적 몰려오기', options.incoming, form, 'review-incoming', on => { options.incoming = on; editKit(); });
    const liveFlags = {}, combatFlags = el('details', null, form); el('summary', '실전처럼 보기 설정', combatFlags);
    const density = select([['few', '적음'], ['normal', '보통'], ['many', '많음']], options.density, el('label', '적 많기 ', combatFlags), 'review-density');
    for (const [key, text] of Object.entries({ god: '무적', cardsOff: '카드 끄기', clockOff: '시간·막 끄기' })) {
      liveFlags[key] = check(text, options[key], combatFlags, `review-live-${key}`, on => { options[key] = on; persist(); });
    }
    el('p', '허수아비 마당은 언제나 무적이고, 카드와 막 넘김이 없어요.', combatFlags);
    const heroDetail = el('details', null, form); el('summary', `캐릭터 · ${cat.heroes.length}명`, heroDetail);
    const heroGrid = el('div', null, heroDetail); heroGrid.className = 'rv-heroes';
    const heroButtons = cat.heroes.map(h => {
      const name = C.nameOf(content, h.person), b = button('', heroGrid, 'review-hero-' + h.person, () => { options.hero = h.person; persist(); });
      const slot = 'person-' + content.people.find(p => p.id === h.person).person + '-a', spec = art.ui?.battle?.sprites?.[slot] || art.slots[slot];
      const img = el('img', null, b); img.src = spec.file + version; img.alt = ''; el('span', name, b);
      return { id: h.person, b };
    });
    const groups = {};
    function choices(key, title, list, max, selected) {
      const detail = el('details', null, form); detail.open = key === 'weapons'; el('summary', `${title} · ${list.length}가지`, detail);
      const grid = el('div', null, detail); grid.className = 'rv-options';
      groups[key] = list.map(d => {
        const id = d.id || d.person, name = d.name || C.nameOf(content, id), row = el('div', null, grid); row.className = 'rv-option';
        const own = selected(id), on = check(name, !!own, row, `review-${key}-${id}`, editKit);
        const levels = el('div', null, row); levels.className = 'rv-levels';
        const limit = max?.(d), start = own?.level || options.levels[key + ':' + id] || limit;
        // 실제 판은 강화 카드 한 장에 upgradeStep단계씩 오른다(무기 1→4→7→8, 동료·유물 1→4→5, rules.offers).
        // 판에서 나오지 않는 단계는 고르지 않게, 판에서 보이는 차례(1·2·3·끝)로 보여 준다. 고른 값은 속 단계 그대로.
        const up = family.tuning.level.upgradeStep || 1;
        const vals = limit ? [...new Set(Array.from({ length: Math.ceil((limit - 1) / up) + 1 }, (_, i) => Math.min(limit, 1 + i * up)))] : [];
        const at = () => vals.indexOf(Number(level?.value));
        let level = null, minus = null, plus = null;
        if (limit) {
          const step = delta => { level.value = vals[Math.max(0, Math.min(vals.length - 1, at() + delta))]; refresh(); editKit(); };
          minus = button('−', levels, `review-minus-${id}`, () => step(-1)); minus.setAttribute('aria-label', name + ' 단계 낮추기');
          level = select(vals.map((v, i) => [v, `${i + 1}단계${i === vals.length - 1 ? '(끝)' : ''}`]), vals.filter(v => v <= Math.max(1, Math.min(limit, start))).pop(), levels, `review-level-${id}`);
          level.setAttribute('aria-label', name + ' 단계'); level.onchange = () => { refresh(); editKit(); };
          plus = button('+', levels, `review-plus-${id}`, () => step(1)); plus.setAttribute('aria-label', name + ' 단계 올리기');
        } else el('span', '진화 단계', levels);
        function refresh() { if (minus) { minus.disabled = at() <= 0; plus.disabled = at() >= vals.length - 1; } }
        refresh(); return { id, on, level, def: d };
      });
    }
    choices('weapons', '무기', cat.weapons, w => w.levels.length, id => options.weapons.find(o => o.id === id && !o.evo));
    choices('evolutions', '진화 무기', cat.evolutions, null, id => options.weapons.find(o => o.evo === id));
    el('p', '같은 기본 무기의 진화는 마지막에 고른 하나를 씁니다.', form);
    choices('allies', '동료', cat.allies, () => family.tuning.level.allyMax, id => options.allies.find(o => o.id === id));
    choices('relics', '유물', content.relics, () => family.tuning.level.relicMax, id => options.relics.find(o => o.id === id));
    for (const row of groups.evolutions) row.on.onchange = () => {
      if (row.on.checked) {
        for (const other of groups.evolutions) if (other !== row && other.def.weapon === row.def.weapon) other.on.checked = false;
        groups.weapons.find(r => r.id === row.def.weapon).on.checked = false;
      }
      editKit();
    };
    for (const row of groups.weapons) row.on.onchange = () => {
      if (row.on.checked) for (const other of groups.evolutions) if (other.def.weapon === row.id) other.on.checked = false;
      editKit();
    };
    button('모두 끄기', form, 'review-clear-all', () => {
      for (const rows of Object.values(groups)) for (const row of rows) row.on.checked = false;
      options.baseWeapon = false; form.querySelector('[data-test=review-base-weapon]').checked = false; editKit();
    });
    era.onchange = density.onchange = persist;
    function collect() {
      const selected = key => groups[key].filter(r => r.on.checked).map(r => ({ id: r.id, level: Number(r.level?.value || family.tuning.level.weaponMax) }));
      const levels = {};
      for (const [key, rows] of Object.entries(groups)) for (const row of rows) if (row.level) levels[key + ':' + row.id] = Number(row.level.value);
      const weapons = selected('weapons');
      for (const row of groups.evolutions.filter(r => r.on.checked)) weapons.push({ id: row.def.weapon, evo: row.id, level: family.tuning.level.weaponMax });
      return C.normalize(content, family.tuning, { ...options, yard: true, levels, cell: era.value, density: density.value, weapons, allies: selected('allies'), relics: selected('relics') });
    }
    function persist() {
      options = collect(); save();
      for (const { id, b } of heroButtons) b.setAttribute('aria-pressed', String(id === options.hero));
      if (session) { session.apply(nextOptions()); resize(); updateMeter(); updateNow(); }
    }
    function editKit() { sequence = []; sequenceTime = 0; persist(); }
    const launch = cycle => start(cycle).catch(error => { status.textContent = '마당을 열지 못했어요: ' + error.message; console.error(error); });
    let session = null, battle = null, stage, canvas, context, sequence = [], sequenceIndex = 0, sequenceTime = 0, acc = 0, previous = null, meterNode, meterBody, now, summary, meterHidden = false, panelOpen = innerWidth > 600;
    let sequenceTools, incomingTools, magnification = 1;
    const layouts = { circle: '둘레 고루', line: '앞에 한 줄', cluster: '붙어 몰림', boss: '장수 하나' };
    const api = { catalogue: cat, options: () => options, state: () => session ? 'play' : 'review', world: () => session?.world(), report: () => session?.meter.report(), step: seconds => { advance(seconds); updateMeter(); }, boss: role => session?.boss(role), back };
    window.__REVIEW = api; window.__GAME = api;
    function tab() { gallery.hidden = false; peopleTab.setAttribute('aria-selected', 'true'); weaponsTab.setAttribute('aria-selected', 'false'); root.scrollTop = 0; }
    function back() {
      session = null; incomingTools?.remove(); root.append(form); form.hidden = true; battle?.remove(); battle = null; root.hidden = false; sequence = []; S.picker.close(); tab();
      if (window.GF.inFrame) window.parent.document.body.dataset.uiState = 'title';
    }
    function nextOptions() { return sequence.length ? { ...options, weapons: [sequence[sequenceIndex]], allies: [], relics: [], baseWeapon: false, incoming: false, cardsOff: true, clockOff: true } : options; }
    function updateNow() {
      now.textContent = sequence.length ? `${session.name('weapon:' + (sequence[sequenceIndex].evo || sequence[sequenceIndex].id))} · 끝 단계` : options.incoming ? '적 몰려오기' : '허수아비 마당';
      summary.textContent = sequence.length ? `${sequenceIndex + 1}/${sequence.length} · 8초씩` : `${layouts[options.layout]} · 맞힌 허수아비 ${session.meter.report().targets}명`;
      sequenceTools.hidden = !sequence.length; incomingTools.hidden = !session.options.incoming;
      form.querySelector('[data-test=review-incoming]').checked = session.options.incoming;
      form.querySelector('[data-test=review-base-weapon]').checked = session.options.baseWeapon;
      for (const b of battle.querySelectorAll('[data-layout]')) b.setAttribute('aria-pressed', String(b.dataset.layout === options.layout));
    }
    function cycleMove(delta) {
      sequenceIndex = (sequenceIndex + delta + sequence.length) % sequence.length; sequenceTime = 0;
      session.apply(nextOptions()); updateNow(); updateMeter();
    }
    function setCycle(on) {
      sequence = on ? [...cat.weapons.map(w => ({ id: w.id, level: w.levels.length })), ...cat.evolutions.map(e => ({ id: e.weapon, evo: e.id, level: family.tuning.level.weaponMax }))] : [];
      sequenceIndex = 0; sequenceTime = 0; session.apply(nextOptions()); updateNow(); updateMeter();
    }
    let opening = false;
    async function start(cycle) {
      if (opening) return;
      if (session) { setCycle(cycle); return; }
      opening = true;
      try {
        status.textContent = '싸움 그림을 읽고 있어요'; await loadBattle(); await document.fonts.load('40px DoHyeon');
        root.hidden = true; battle = el('section', null, document.body, 'review-battle'); battle.className = 'rv-battle rv-yard';
        const bar = el('div', null, battle); bar.className = 'rv-yard-bar'; now = el('h1', '', bar, 'review-now');
        const zooms = el('div', null, bar); zooms.className = 'rv-zooms'; zooms.setAttribute('aria-label', '마당 확대');
        for (const zoom of [1, 1.5, 2]) {
          const b = button(zoom + '배', zooms, 'review-zoom-' + zoom, () => { magnification = zoom; resize(); }); b.dataset.zoom = zoom;
        }
        button('옆 판 접기/펼치기', bar, 'review-panel-toggle', () => { panelOpen = !panelOpen; setPanel(); });
        button('인물', bar, 'review-back', back);
        const arrangements = el('div', null, battle); arrangements.className = 'rv-layouts';
        for (const [id, label] of Object.entries(layouts)) {
          const b = button(label, arrangements, 'review-layout-' + id, () => { options.layout = id; persist(); }); b.dataset.layout = id;
        }
        stage = el('div', null, battle); stage.className = 'rv-stage';
        canvas = el('canvas', null, stage, 'review-canvas'); canvas.className = 'rv-canvas'; context = canvas.getContext('2d');
        meterNode = el('aside', null, battle, 'review-meter'); meterNode.className = 'rv-meter'; meterNode.hidden = meterHidden;
        el('h2', '세기 판 · 최근 10초', meterNode); const tr = el('tr', null, el('thead', null, el('table', null, meterNode)));
        for (const label of ['무기·동료', '초당 피해', '누적 피해', '맞힌 허수아비 수']) el('th', label, tr);
        meterBody = el('tbody', null, tr.parentElement.parentElement); summary = el('p', '', meterNode); summary.className = 'rv-status';
        const tools = el('div', null, battle); tools.className = 'rv-tools';
        button('가운데로', tools, 'review-center', () => session.center());
        for (const [key, text] of Object.entries({ slow: '0.5배', paused: '멈춤' })) check(text, options[key], tools, `review-live-${key}`, on => { options[key] = on; persist(); }).parentElement.className = 'rv-switch';
        button('차례로 보기', tools, 'review-sequence', () => setCycle(true));
        sequenceTools = el('div', null, tools); sequenceTools.className = 'rv-line';
        button('이전', sequenceTools, 'review-previous', () => cycleMove(-1)); button('다음', sequenceTools, 'review-next', () => cycleMove(1));
        button('고른 조합으로', sequenceTools, 'review-sequence-stop', () => setCycle(false));
        button('세기 판 숨기기/보기', tools, 'review-meter-toggle', () => { meterHidden = !meterHidden; meterNode.hidden = meterHidden; });
        incomingTools = el('div', null, form); incomingTools.className = 'rv-line';
        button('부장 부르기', incomingTools, 'review-deputy', () => session.boss('deputy'));
        button('대장 부르기', incomingTools, 'review-general', () => session.boss('general'));
        button('적 모두 지우기', incomingTools, 'review-clear', () => session.clear());
        battle.append(form); form.hidden = false;
        persist();
        // 작은 화면도 배치를 볼 수 있게 하되, 싸움 크기는 유지하고 허수아비 사이 거리를 줄인다.
        session = C.create(data, options, { seed: Number(new URLSearchParams(location.search).get('seed')) || 1, images, canvas, view: { w: innerWidth, h: innerHeight, top: 0 } });
        canvas.onpointerdown = e => { const rect = canvas.getBoundingClientRect(), w = session.world(); session.input('solo', 'press', (e.clientX - rect.x) * w.view.w / rect.width, (e.clientY - rect.y) * w.view.h / rect.height); };
        setPanel(); setCycle(cycle); status.textContent = '주인공·무기·단계를 누르면 지금 마당에 적용돼요.';
        if (window.GF.inFrame) window.parent.document.body.dataset.uiState = 'play';
      } finally { opening = false; }
    }
    function setPanel() {
      form.hidden = !panelOpen; battle.classList.toggle('rv-panel-open', panelOpen);
      battle.querySelector('[data-test=review-panel-toggle]').setAttribute('aria-expanded', String(panelOpen)); resize();
    }
    function resize() {
      for (const { canvas: c, row, multiple } of canvases) sizePreview(c, art.ui?.battle?.sprites?.[row.slots[0]] || art.slots[row.slots[0]], multiple, row);
      if (!session) return;
      const rect = stage.getBoundingClientRect(), w = session.world(), dpr = Math.min(2, devicePixelRatio || 1);
      w.view = { w: rect.width / magnification, h: rect.height / magnification, top: 0 };
      // 전장과 같은 창 크기로 기본 배율을 잰다. 옆 판과 도구 줄은 사람을 축소하지 않는다.
      w.family.tuning.view.short = Math.min(w.view.w, w.view.h) / battleScale();
      canvas.width = Math.round(w.view.w * dpr); canvas.height = Math.round(w.view.h * dpr); S.scene.layout(w);
      session.fit();
      for (const b of battle.querySelectorAll('[data-zoom]')) b.setAttribute('aria-pressed', String(Number(b.dataset.zoom) === magnification));
    }
    function updateMeter() {
      if (!session) return; meterBody.replaceChildren();
      const kit = session.world().sv.kit, active = new Set([...kit.weapons.map(o => 'weapon:' + (o.evo || o.id)), ...kit.allies.map(o => 'ally:' + o.id)]);
      // 누적 기록은 유지하되, 화면에는 지금 켠 무기·동료를 보여 준다.
      for (const r of session.meter.report().rows.filter(r => active.has(r.key))) {
        const row = el('tr', null, meterBody); row.dataset.source = r.key;
        for (const value of [session.name(r.key), r.recentDps.toFixed(1), Math.round(r.damage), r.targets]) el('td', value, row);
      }
      updateNow();
    }
    function advance(seconds) {
      if (!session || session.options.paused) return;
      for (let i = 0, ticks = Math.round(seconds * 60); i < ticks; i++) {
        session.advance(1 / 60); sequenceTime += 1 / 60;
        if (sequence.length && sequenceTime + 1e-8 >= 8) cycleMove(1);
      }
    }
    // 방향키는 걷기에만 쓴다. 차례로 보기에는 단추만 연결한다.
    window.addEventListener('keydown', e => {
      if (session && /^(Arrow(Up|Down|Left|Right)|Key[WASD])$/.test(e.code)) e.preventDefault();
    });
    let frameNo = -1, lastMeter = 0;
    function frame(time) {
      const dt = previous == null ? 0 : Math.min(.1, (time - previous) / 1000); previous = time;
      if (session) {
        acc += dt * (session.options.slow ? .5 : 1);
        while (acc + 1e-9 >= 1 / 60) { acc -= 1 / 60; advance(1 / 60); }
        const w = session.world(); w.alpha = 1; context.setTransform(w.px.dpr, 0, 0, w.px.dpr, 0, 0); context.clearRect(0, 0, w.view.w, w.view.h); session.cfg.draw(w, context);
        if (time - lastMeter > 250) { updateMeter(); lastMeter = time; }
      } else if (!gallery.hidden && Math.floor(time / 180) % 2 !== frameNo) {
        frameNo = Math.floor(time / 180) % 2;
        for (const { canvas: c, row, variant, multiple } of canvases) {
          const slot = row.slots[frameNo], spec = art.ui?.battle?.sprites?.[slot] || art.slots[slot], p = pictureCache.get(spec.file);
          if (!p) continue; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
          sizePreview(c, spec, multiple, row, slot);
          const n = row.group === 'bosses' && spec.frames > 1 ? frameNo : 0;
          g.drawImage(p, n * spec.w, 0, spec.w, spec.h, 0, 0, c.width, c.height);
          if (variant === 'y') { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .45; g.fillStyle = '#ffd23f'; g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          c.dataset.loaded = 'true';
        }
      }
      requestAnimationFrame(frame);
    }
    const pictureCache = new Map();
    let battleReady;
    function loadBattle() {
      return battleReady ||= Promise.all(Object.entries(art.slots).map(async ([slot, spec]) => { const p = await load(spec); images[slot] = p; pictureCache.set(spec.file, p); }));
    }
    await Promise.all(cat.people.flatMap(r => r.slots).map(async slot => { const spec = art.ui?.battle?.sprites?.[slot] || art.slots[slot]; if (!spec) throw Error('그림이 없어요: ' + slot); pictureCache.set(spec.file, await load(spec)); }));
    galleryNote.textContent = `인물 ${cat.people.length}칸 · 무기 ${cat.weapons.length} · 진화 ${cat.evolutions.length} · 그림 모두 읽음`;
    tab('people'); window.addEventListener('resize', resize); window.GF.on('pause', () => { if (session) session.options.paused = true; }); window.GF.on('resume', () => { if (session) session.options.paused = false; });
    document.title = '역사 영웅 검수실'; window.GF.ready(); requestAnimationFrame(frame);
    // 주소에 yard=1이 있으면 허수아비 마당부터 연다(대표가 주소 하나로 바로 열 수 있게). 바깥 틀 주소도 본다.
    const yardFirst = [() => location.search, () => window.parent.location.search].some(read => { try { return new URLSearchParams(read()).get('yard') === '1'; } catch { return false; } });
    if (yardFirst) launch(false);
  }
  S.review = { open };
})();
