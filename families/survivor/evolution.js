(function () {
  'use strict';
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  // These are wall-clock seconds. Combat statistics and collision sizes never change.
  const MERGE = .2, RELEASE = .35, END = 1.2, SKIP = .5, STOP = .1;
  let current = null;
  const visual = (w, id) => w.art?.evolutionFx?.weapons?.[id] || null;
  const utility = (w, name) => w.art?.evolutionFx?.utility?.[name] || null;
  const icon = (w, id) => visual(w, id)?.icon || S.rules.picSlot(w.content, id);
  const presenting = w => !!w.sv?.evolution && !w.sv.evolution.skipped && w.sv.evolution.age < END;
  function start(w, def) {
    current = w;
    w.sv.evolution = { id: def.id, weapon: def.weapon, relic: def.relic, name: def.name,
      age: 0, firstPending: true, firstAt: null, skipped: false, stopLeft: 0,
      slowElapsed: 0, stopElapsed: 0, affectedElapsed: 0 };
    S.feedback.sound(w, 'special', { vol: .45 });
  }
  // Called before the engine scales dt, including during the 0.1 second first-shot stop.
  function step(w, dt) {
    const e = w.sv.evolution;
    if (!e) return dt;
    const a = e.age, b = a + dt;
    e.age = b;
    if (e.skipped) return dt;
    const stopped = Math.min(dt, e.stopLeft);
    e.stopLeft = Math.max(0, e.stopLeft - dt);
    const overlap = (from, to) => Math.max(0, Math.min(to, END) - Math.max(from, MERGE));
    const slow = overlap(a, b), movingSlow = overlap(a + stopped, b);
    e.slowElapsed += slow; e.stopElapsed += stopped;
    e.affectedElapsed += stopped + movingSlow;
    return Math.max(0, dt - stopped - movingSlow * .75);
  }
  function skip(w) {
    const e = w?.sv?.evolution;
    if (!e || e.skipped || e.age + 1e-9 < SKIP || e.age >= END && !e.stopLeft) return false;
    e.skipped = true; e.age = Math.max(e.age, END); e.stopLeft = 0;
    return true;
  }
  // Keep the existing 60 Hz combat integration while the presentation clock runs
  // every frame. Smaller physics steps otherwise change targeting and collisions.
  function combatStep(w, dt) {
    const e = w.sv.evolution;
    if (!e) return dt;
    e.remainder = (e.remainder || 0) + dt;
    if (e.remainder + 1e-9 < 1 / 60) return 0;
    e.remainder = Math.max(0, e.remainder - 1 / 60);
    return 1 / 60;
  }
  const alpha = w => presenting(w) && w.sv.evolution.remainder != null ? Math.min(1, w.sv.evolution.remainder * 60) : null;
  function decorate(w, st) {
    st.visual = visual(w, st.source);
    const e = w.sv.evolution;
    st.first = !!e && e.id === st.source && e.firstPending && (e.skipped || e.age + 1e-9 >= RELEASE);
    st.visualScale = st.first ? 1.3 : 1;
    return st;
  }
  function attack(w, st) {
    const e = w.sv.evolution;
    if (!st.first || !e?.firstPending || e.id !== st.source) return;
    e.firstPending = false; e.firstAt = e.age;
    if (!e.skipped) e.stopLeft = S.feedback.reserveStop(w.sv, STOP) || 0;
  }
  function hit(w, source, x, y) {
    const art = visual(w, source), sv = w.sv;
    if (!art) return;
    if (sv.evoHitTime !== sv.t) { sv.evoHitTime = sv.t; sv.evoHits = 0; }
    if (sv.evoHits >= (sv.lightFx || w.decorLight ? 2 : 8)) return;
    sv.evoHits++;
    S.world.addFx(sv, 'img', x, y, { slot: art.hit, life: .24, lift: 12, evo: true });
  }
  const chest = w => S.rules.evolutionFor(w.content, w.sv.kit, w.family.tuning.level.weaponMax) ? utility(w, 'chest') : null;
  if (typeof document !== 'undefined') {
    window.addEventListener('pointerdown', () => skip(current), true);
    window.addEventListener('keydown', e => { if (e.code !== 'Escape' && !e.repeat) skip(current); }, true);
  }
  S.evolution = { visual, utility, icon, presenting, start, step, combatStep, alpha, skip, decorate, attack, hit, chest,
    timing: { merge: MERGE, release: RELEASE, end: END, skip: SKIP, stop: STOP } };
})();
