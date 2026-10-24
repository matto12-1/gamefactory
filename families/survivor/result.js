(function () {
  'use strict';
  const S = ((window.GFFamilies = window.GFFamilies || {}).survivor ||= {});
  const num = n => Math.round(n).toLocaleString('ko-KR');
  const clock = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  function report(w, { mode, best = 0 } = {}) {
    const sv = w.sv, R = S.rules, c = w.content;
    S.picker?.close();
    const gain = S.meta.resultGain(w, mode);
    const person = id => {
      const p = c.people.find(p => p.id === id);
      const slot = R.picSlot(c, id, w.art);
      return { name: p?.name || '', slot: w.art.ui?.people?.faces?.[slot] ? slot : R.slotIn(w.art, slot) };
    };
    // 시대 판에서 졌을 때 강화 길잡이: 살 수 있는 강화가 있으면 강화부터, 없으면 깬 시대를 다시 해 엽전을 모으게(10-20 대표 「강화를 해야 깰 수 있다는 걸 알아야」). 강화를 다 했으면 붙이지 않는다.
    const lost = mode?.play === 'stage' && !mode.passed && Number.isFinite(gain?.next), canBuy = lost && gain.have >= gain.next;
    const tip = !lost ? null : canBuy ? R.T.failBuy : gain.cleared ? R.T.failFarm : R.T.failRetry;
    // 지킨 곳: 칸 자료의 battle.place(마지막 막 싸움터)가 있으면 그것. 「거란과의 싸움」처럼 장소가 아닌 싸움 이름을 그대로 쓰면 제목이 깨진다.
    const place = sv.cell?.battle?.place || (sv.cell?.battle?.name || sv.battle?.name || sv.cell?.name || mode?.title || '진영').replace(/\s*(싸움|전투|대첩|방어전)$/, '');
    const object = (place.charCodeAt(place.length - 1) - 0xac00) % 28 ? '을' : '를';
    return {
      title: mode?.reason === 'bulgasari' ? R.T.endlessSurvived : mode?.passed ? `${place}${object} 지켜 냈다!` : `${place}에서 물러났다`,
      era: sv.cell?.name || '', passed: !!mode?.passed, fell: mode?.reason === 'hearts', hero: person(sv.heroDef.person),
      companion: person(sv.kit.allies[0]?.id || sv.heroDef.person),
      seconds: Math.floor(sv.t), kills: sv.kills, level: sv.level,
      evolutions: sv.kit.weapons.filter(o => o.evo).length,
      weapons: sv.kit.weapons.map(o => {
        const def = (o.evo ? c.evolutions : c.weapons).find(d => d.id === (o.evo || o.id));
        return { id: o.evo || o.id, name: def.name, slot: R.picSlot(c, def.id, w.art), evolved: !!o.evo,
          damage: (sv.weaponDamage[o.id] || 0) + (o.evo ? sv.weaponDamage[o.evo] || 0 : 0) };
      }).sort((a, b) => b.damage - a.damage),
      // 풀이와 문제는 검수 원문 그대로. 같은 문제는 한 번만 보여 준다.
      reviews: [...new Map((w.review || []).map(row => [row.item.id || row.item.q, row.item])).values()].map(q => ({ question: q.q, answer: q.a, note: q.note || '', words:S.prose.select(q.note||q.a,c,{pack:sv.cell,from:q.from,keys:[q.a]}) })),
      score: w.score, best: Math.max(best, w.score), newBest: w.score > best, stars: mode?.stars,
      coins: gain?.coins || 0, have: gain?.have || 0, tip, canBuy,
      // 줄을 여는 판(후삼국·고려 후기)을 깨면 새로 열린 줄 강화(10-21 대표 「새 강화 종류 열기」).
      newShop: (gain?.shops || []).map(k => ({ name: R.T.shopName[k] ?? k, slot: S.meta.shopSlot(c, k) })),
      openShop: (parent,anchor)=>S.meta.open({content:c,family:w.family,art:w.art,version:w.version},{parent,anchor,tab:'shop'})
    };
  }

  const CSS = `
.play-page dialog.result.sv-battle-result,.sv-battle-result{position:fixed;inset:0;box-sizing:border-box;width:100%;max-width:none;height:100dvh;max-height:none;margin:0;padding:0;border:0;border-radius:0;overflow:hidden;background:#14243a;color:#30251d;box-shadow:none;font-family:DoHyeon,sans-serif}
.sv-battle-result *{box-sizing:border-box;font-family:inherit;word-break:keep-all;overflow-wrap:break-word}
.sv-battle-result .gf-ui-background{position:absolute;inset:0;z-index:0;pointer-events:none}.sv-battle-result .gf-ui-background img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
.sv-report-layout{position:relative;z-index:1;width:min(1160px,calc(100% - 64px));height:100%;margin:auto;display:grid;grid-template-columns:minmax(0,360px) minmax(0,720px);align-content:center;align-items:center;gap:32px;padding:36px 0 74px}
.sv-scroll{position:relative;min-width:0;padding:64px 54px 70px;border:solid transparent;border-width:0;border-image:var(--scroll) 135 50 90 50 fill / 80px 40px 64px 40px / 0 stretch;filter:drop-shadow(0 8px 0 #0d182a66);animation:sv-unroll .6s ease-out both}
.sv-scroll-content{animation:sv-ink .3s .38s both}
.sv-battle-result.sv-from-dark{animation:sv-ink .7s ease-out both}.sv-from-dark .sv-scroll{animation-delay:.3s}.sv-from-dark .sv-scroll-content{animation-delay:.68s}
.sv-battle-result .sv-report-kicker{margin:0 0 8px;color:#77552d;font-size:16px;letter-spacing:.18em;text-align:center}
.play-page .result .sv-report-title,.sv-report-title{font-size:clamp(24px,2.45vw,36px);font-weight:400;line-height:1.15;text-align:center;margin:0 0 20px;letter-spacing:-.03em;color:#49301e;text-shadow:none}
.sv-report-hero{display:flex;align-items:center;gap:18px;padding:0 0 16px;border-bottom:2px solid #a77a4366}
.sv-report-portrait{width:76px;height:76px;object-fit:contain;image-rendering:pixelated;flex:none;filter:drop-shadow(0 3px #805b3b44)}
.sv-report-hero-copy{flex:1;min-width:0}.sv-report-name{font-size:18px;color:#735232;margin-bottom:8px}
.sv-report-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sv-report-stat{display:flex;flex-direction:column;gap:3px}.sv-report-stat span{font-size:14px;color:#785b3a}.sv-report-stat strong{font-size:26px;font-weight:400;white-space:nowrap;font-variant-numeric:tabular-nums}
.sv-weapons-heading{display:flex;align-items:center;justify-content:space-between;margin:16px 0 12px}.sv-weapons-heading h3{font-size:22px;font-weight:400;margin:0}.sv-weapons-heading small{font-size:13px;color:#785b3a}
.sv-weapon-list{display:grid;gap:12px}.sv-weapon-row{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center}.sv-weapon-icon{width:32px;height:32px;object-fit:contain;image-rendering:pixelated}
.sv-weapon-label{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:18px;line-height:1.15;margin-bottom:5px}.sv-weapon-label b{font-weight:400}.sv-weapon-label small{font-size:12px;color:#98602f;margin-left:5px}.sv-weapon-label span{font-size:15px;white-space:nowrap;color:#785b3a;font-variant-numeric:tabular-nums}
.sv-damage-track{height:9px;background:#b3956c50;border:1px solid #9c774c88;box-shadow:inset 0 1px #694f3422}.sv-damage-fill{height:100%;width:var(--damage);background:#a54f32;box-shadow:inset 0 2px #d88b45;transform-origin:left;animation:sv-bar-grow .55s var(--delay) both}.sv-weapon-row:nth-child(2) .sv-damage-fill{background:#ad7934}.sv-weapon-row:nth-child(3) .sv-damage-fill{background:#69734b}.sv-weapon-row:nth-child(4) .sv-damage-fill{background:#54737b}
.sv-report-foot{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:18px;padding-top:12px;border-top:2px solid #a77a4366;font-size:14px;color:#77552d;line-height:1.35}.sv-report-foot strong{font-weight:400;color:#4f3825}.sv-report-record{color:#9e4930!important}.sv-report-stars{margin-left:auto;letter-spacing:.12em;font-size:12px}
.sv-camp-side{align-self:end;display:flex;flex-direction:column;gap:20px;padding-bottom:26px;min-width:0}.sv-companion{display:flex;flex-direction:column;align-items:flex-start;gap:12px}.sv-companion-face{display:flex;align-items:center;gap:12px;color:#ffedbd;text-shadow:0 2px #142132;font-size:19px}.sv-companion-face img{width:70px;height:70px;image-rendering:pixelated;object-fit:contain;filter:drop-shadow(0 4px #142132)}
.sv-speech{position:relative;width:100%;padding:20px 22px;background:#fff3cf;border:3px solid #403121;box-shadow:inset 0 0 0 2px #ddba77,0 5px #13203166}.sv-speech::before{content:'';position:absolute;top:-13px;left:26px;width:20px;height:20px;background:#fff3cf;border-left:3px solid #403121;border-top:3px solid #403121;transform:rotate(45deg)}
.sv-speech-body{position:relative;max-height:280px;overflow:auto;scrollbar-width:thin;scrollbar-color:#b28b50 #f9e8bc}.sv-speech-question{font-size:17px;color:#876137;line-height:1.4;margin:0 0 12px!important}.sv-speech-note{font-size:20px;line-height:1.5;margin:0!important}.sv-speech-answer{font-size:16px;color:#876137;margin:10px 0 0!important}.sv-speech-nav{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px;font-size:14px;color:#876137}
.sv-battle-result button.sv-next{border:0;background:transparent;color:#754225;padding:8px;min-height:38px;font-size:17px;cursor:pointer}.sv-battle-result button:focus-visible{outline:3px solid #f8c65e;outline-offset:4px}
.sv-report-actions{display:grid;grid-template-columns:1fr auto;gap:12px}.sv-battle-result button.sv-report-button{border:3px solid #f4d08b;border-radius:2px;background:#293f47;box-shadow:0 5px #10232e,inset 0 0 0 2px #172b32;color:#fff1ca;font-size:21px;font-weight:400;line-height:1.2;padding:14px 18px;cursor:pointer;white-space:nowrap;min-height:54px}.sv-battle-result button.sv-report-replay{background:#e7b756;box-shadow:0 5px #68472d,inset 0 0 0 2px #b78337;color:#30291e}
.sv-report-actions:has(.sv-result-shop){grid-template-columns:minmax(0,1fr) auto auto;gap:8px}.sv-battle-result button.sv-result-shop{font-size:16px;padding:8px;min-height:44px}
@media(max-width:800px){.sv-report-actions:has(.sv-result-shop) .sv-report-button{font-size:17px;padding:10px 8px}.sv-report-actions:has(.sv-result-shop) .sv-result-shop{font-size:15px;padding:8px 6px}}
.sv-report-tip{display:flex;align-items:center;gap:10px;margin:0;padding:10px 14px;background:#fff3cf;border:3px solid #403121;box-shadow:inset 0 0 0 2px #ddba77,0 5px #13203166;font-size:18px;line-height:1.35;color:#30251d;text-wrap:balance}.sv-report-new{flex-wrap:wrap;gap:6px 8px;background:#eaf4d8}.sv-report-new b{font-weight:400;color:#2f5b2a;margin-right:4px}.sv-tip-coin{width:26px;height:26px;flex:none;object-fit:contain;image-rendering:pixelated}
.sv-report-actions:has(.sv-shop-first){grid-template-columns:minmax(0,1fr) auto auto;gap:8px}
@media(max-width:800px){.sv-report-tip{font-size:14px;padding:6px 10px;gap:8px}.sv-tip-coin{width:20px;height:20px}.sv-report-actions:has(.sv-shop-first) .sv-report-button{font-size:17px;padding:10px 8px}}
.sv-battle-result .result-rank{font-size:13px;padding:8px;background:#fff3cf}.sv-battle-result .result-rank [data-test=rank-status]{font-size:15px}
@media(min-width:801px){.sv-scroll{grid-column:2;grid-row:1}.sv-camp-side{grid-column:1;grid-row:1}.sv-companion{flex-direction:column-reverse}.sv-speech::before{display:none}.sv-companion-face{position:relative}.sv-companion-face::before{content:'';position:absolute;top:-22px;left:26px;width:20px;height:20px;background:#fff3cf;border-right:3px solid #403121;border-bottom:3px solid #403121;transform:rotate(45deg)}}
@keyframes sv-unroll{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}@keyframes sv-ink{from{opacity:0}to{opacity:1}}@keyframes sv-bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media(max-width:800px){
 .sv-report-layout{width:min(440px,100%);display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:14px;padding:46px 8px 18px}
 .sv-scroll{flex:none;padding:46px 29px 42px;border-image-width:60px 25px 44px 25px}.sv-battle-result .sv-report-kicker{font-size:12px;margin-bottom:6px}.play-page .result .sv-report-title,.sv-report-title{font-size:25px;margin-bottom:14px}
 .sv-report-hero{gap:10px;padding-bottom:11px}.sv-report-portrait{width:46px;height:58px}.sv-report-name{font-size:14px;margin-bottom:5px}.sv-report-stats{gap:6px}.sv-report-stat span{font-size:12px}.sv-report-stat strong{font-size:21px}
 .sv-weapons-heading{margin:11px 0 9px}.sv-weapons-heading h3{font-size:19px}.sv-weapons-heading small{font-size:11px}.sv-weapon-list{gap:9px}.sv-weapon-row{grid-template-columns:25px minmax(0,1fr);gap:7px}.sv-weapon-icon{width:24px;height:24px}.sv-weapon-label{font-size:16px;margin-bottom:4px}.sv-weapon-label span{font-size:13px}.sv-weapon-label small{font-size:10px}.sv-damage-track{height:7px}
 .sv-report-foot{font-size:12px;gap:4px 12px;margin-top:12px;padding-top:9px}.sv-report-stars{font-size:10px}
 .sv-camp-side{align-self:stretch;gap:13px;padding:0 12px}.sv-companion{position:relative;padding-left:52px;gap:0}.sv-companion-face{position:absolute;left:0;bottom:6px;display:block;width:45px;text-align:center;font-size:11px}.sv-companion-face img{display:block;width:44px;height:54px;margin-bottom:5px}
 .sv-speech{padding:13px 14px}.sv-speech::before{top:auto;left:-10px;bottom:25px;width:14px;height:14px;transform:rotate(-45deg)}.sv-speech-question{font-size:13px;margin-bottom:7px!important}.sv-speech-note{font-size:16px;line-height:1.45}.sv-speech-answer{font-size:13px;margin-top:7px!important}.sv-speech-body{max-height:158px}.sv-speech-nav{margin-top:6px;font-size:12px}.sv-battle-result button.sv-next{font-size:14px;min-height:32px;padding:3px 4px}
 .sv-report-actions{gap:10px}.sv-battle-result button.sv-report-button{font-size:19px;min-height:50px;padding:10px 16px}
}
@media(max-height:740px) and (max-width:800px){.sv-report-layout{padding-top:20px;gap:8px}.sv-scroll{padding-top:40px;padding-bottom:34px}.sv-report-hero{padding-bottom:6px}.sv-weapon-list{gap:6px}.sv-speech-body{max-height:115px}.sv-camp-side{gap:9px}}
@media(max-width:800px){
 .sv-ranked-report .sv-report-layout{padding:16px 8px 12px;gap:10px}.sv-ranked-report .sv-scroll{padding-top:40px;padding-bottom:30px}.sv-ranked-report .sv-report-kicker{font-size:11px;margin-bottom:4px}.play-page .result.sv-ranked-report .sv-report-title{font-size:22px;margin-bottom:10px}
 .sv-ranked-report .sv-report-portrait{width:40px;height:46px}.sv-ranked-report .sv-report-name{font-size:13px;margin-bottom:3px}.sv-ranked-report .sv-report-hero{padding-bottom:8px}.sv-ranked-report .sv-report-stat span{font-size:11px}.sv-ranked-report .sv-report-stat strong{font-size:19px}.sv-ranked-report .sv-weapons-heading{margin:8px 0}.sv-ranked-report .sv-weapon-list{gap:6px}.sv-ranked-report .sv-weapon-label{font-size:14px}.sv-ranked-report .sv-weapon-icon{width:22px;height:22px}.sv-ranked-report .sv-damage-track{height:6px}.sv-ranked-report .sv-report-foot{margin-top:9px;padding-top:7px}
 .sv-ranked-report .sv-camp-side{gap:9px}.sv-ranked-report .sv-speech{padding:10px 12px}.sv-ranked-report .sv-speech-question{font-size:12px;line-height:1.3}.sv-ranked-report .sv-speech-note{font-size:14px;line-height:1.4}.sv-ranked-report .sv-speech-answer{font-size:12px}.sv-ranked-report button.sv-report-button{min-height:46px;padding:8px 14px}
 .sv-battle-result.sv-ranked-report .result-rank{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;padding:6px 8px;border:2px solid #b48a4c;border-radius:2px;box-shadow:none}.sv-ranked-report .result-rank .gf-label{display:none}.sv-battle-result.sv-ranked-report .result-rank [data-test=rank-status]{grid-column:1/-1;font-size:13px;line-height:1.2;color:#49301e}.sv-ranked-report .rank-primary,.sv-ranked-report .rank-secondary{display:inline}.sv-ranked-report .rank-secondary{margin-left:5px}.sv-ranked-report .result-rank [data-test=make-name]{width:100%;min-height:32px;margin:0;padding:5px 8px;font-size:13px;border-radius:2px;box-shadow:none}.sv-ranked-report .result-rank [data-test=result-ranks]{align-self:center;font-size:13px;padding:4px;white-space:nowrap}
}
@media(prefers-reduced-motion:reduce){.sv-scroll,.sv-scroll-content,.sv-damage-fill,.sv-battle-result.sv-from-dark{animation:none}}
`;

  // 게임 안팎에서 같은 화면을 쓴다. 만들 곳의 문서와 시계만 사용한다.
  function render(parent, { report: r, art, base, replay, map, rank } = {}) {
    const doc = parent.ownerDocument, view = doc.defaultView;
    if (!doc.getElementById('sv-result-style')) { const s = doc.createElement('style'); s.id = 'sv-result-style'; s.textContent = CSS; doc.head.append(s); }
    const el = (tag, cls, text, to = parent) => { const n = doc.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; to.append(n); return n; };
    const test = (n, name) => { n.dataset.test = name; return n; };
    const pic = (to, slot, cls, name = '') => { const spec = S.picker?.asset?.(art, slot) || art.slots[slot]; if (!spec) return; const n = el('img', cls, undefined, to); n.src = new URL(spec.file, base).href; n.alt = name; return n; };
    parent.classList.add('sv-battle-result'); parent.setAttribute('aria-label', r.title);
    // 쓰러져 진 판은 어두워진 판 위로 보고가 서서히 나타나고, 두루마리는 조금 늦게 펼쳐진다(10-20 대표 「스르륵」).
    parent.classList.toggle('sv-from-dark', !!r.fell);
    parent.classList.toggle('sv-ranked-report', !!rank);
    const kit = view.GFUI || window.GFUI;
    kit.background(parent, art, 'result', base);
    const layout = el('div', 'sv-report-layout');
    const scroll = test(el('section', 'sv-scroll', undefined, layout), 'battle-scroll');
    const scrollArt = art.slots[Object.keys(art.slots).find(slot => slot.startsWith('result-scroll-'))];
    scroll.style.setProperty('--scroll', `url("${new URL(scrollArt.file, base).href}")`);
    const ink = el('div', 'sv-scroll-content', undefined, scroll);
    el('p', 'sv-report-kicker', `${r.era} · 전투 보고`, ink);
    test(el('h2', 'sv-report-title', r.title, ink), 'battle-title');
    const hero = el('div', 'sv-report-hero', undefined, ink); pic(hero, r.hero.slot, 'sv-report-portrait', r.hero.name);
    const copy = el('div', 'sv-report-hero-copy', undefined, hero); el('div', 'sv-report-name', r.hero.name, copy);
    const stats = el('div', 'sv-report-stats', undefined, copy), counters = [];
    for (const [label, n, format] of [['버틴 시간', r.seconds, clock], ['무찌른 적', r.kills, num], ['레벨', r.level, num], ['진화', r.evolutions, num]]) {
      const stat = el('div', 'sv-report-stat', undefined, stats); el('span', '', label, stat);
      counters.push({ node: el('strong', '', format(0), stat), n, format });
    }
    const wh = el('div', 'sv-weapons-heading', undefined, ink); el('h3', '', '오늘의 무기', wh); el('small', '', '준 피해', wh);
    const list = test(el('div', 'sv-weapon-list', undefined, ink), 'weapon-damage-list'), max = Math.max(1, ...r.weapons.map(w => w.damage));
    r.weapons.forEach((w, i) => {
      const row = test(el('div', 'sv-weapon-row', undefined, list), 'weapon-damage'); row.dataset.weapon = w.id; row.dataset.damage = w.damage;
      pic(row, w.slot, 'sv-weapon-icon', ''); const detail = el('div', '', undefined, row), label = el('div', 'sv-weapon-label', undefined, detail);
      const name = el('b', '', w.name, label); if (w.evolved) el('small', '', '진화', name); el('span', '', num(w.damage), label);
      const track = el('div', 'sv-damage-track', undefined, detail); track.setAttribute('role', 'meter'); track.setAttribute('aria-label', `${w.name} 준 피해`); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', max); track.setAttribute('aria-valuenow', w.damage);
      const fill = test(el('div', 'sv-damage-fill', undefined, track), 'damage-fill'); fill.style.setProperty('--damage', `${w.damage / max * 100}%`); fill.style.setProperty('--delay', `${.75 + i * .14}s`);
    });
    const foot = test(el('div', 'sv-report-foot', undefined, ink), 'meta-result');
    test(el('span', '', `점수 ${num(r.score)}`, foot), 'result-score'); el('strong', '', `받은 엽전 ${num(r.coins)}`, foot);
    el('span', r.newBest ? 'sv-report-record' : '', r.newBest ? '최고 기록!' : `최고 ${num(r.best)}`, foot);
    if (Number.isInteger(r.stars)) { const stars = el('span', 'sv-report-stars', '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), foot); stars.setAttribute('aria-label', `별 ${r.stars}개`); }
    const side = el('aside', 'sv-camp-side', undefined, layout), companion = el('div', 'sv-companion', undefined, side);
    const face = el('div', 'sv-companion-face', undefined, companion); pic(face, r.companion.slot, '', ''); el('span', '', r.companion.name, face);
    const speech = test(el('section', 'sv-speech', undefined, companion), 'camp-speech'); speech.setAttribute('aria-label', '동료와 돌아보기');
    const body = el('div', 'sv-speech-body', undefined, speech); body.setAttribute('aria-live', 'polite');
    const nav = el('div', 'sv-speech-nav', undefined, speech), count = el('span', '', '', nav), next = test(el('button', 'sv-next', '다음 ▶', nav), 'speech-next'); next.type = 'button';
    let index = 0;
    function show() {
      body.replaceChildren(); const q = r.reviews[index];
      if (q) { S.prose.fill(el('p','sv-speech-question',undefined,body),q.question,null,{words:q.words}); S.prose.fill(test(el('p','sv-speech-note',undefined,body),'speech-note'),q.note||q.answer,null,{words:q.words}); S.prose.fill(el('p','sv-speech-answer',undefined,body),`정답: ${q.answer}`,null,{words:[q.answer]}); }
      else S.prose.fill(test(el('p','sv-speech-note',undefined,body),'speech-note'),'오늘은 하나도 안 틀렸어요!',null);
      nav.hidden = r.reviews.length < 2; count.textContent = `${index + 1} / ${r.reviews.length}`; body.scrollTop = 0;
    }
    next.onclick = () => { index = (index + 1) % r.reviews.length; show(); }; show();
    if (r.tip) { const tip = test(el('p', 'sv-report-tip', undefined, side), 'fail-tip'); pic(tip, 'coin', 'sv-tip-coin'); el('span', '', r.tip, tip); }
    if (r.newShop?.length) {
      const box = test(el('p', 'sv-report-tip sv-report-new', undefined, side), 'meta-new-shop'); el('b', '', S.rules.T.newShop, box);
      for (const s of r.newShop) { pic(box, s.slot, 'sv-tip-coin', s.name); el('span', '', s.name, box); }
    }
    const actions = el('div', 'sv-report-actions', undefined, side);
    // 살 수 있는 강화가 있으면 「강화하기」를 앞세운다(금빛은 한 단추에만).
    replay.className = r.canBuy ? 'sv-report-button' : 'sv-report-button sv-report-replay'; replay.textContent = '처음부터 다시'; actions.append(replay);
    map.className = 'sv-report-button'; map.textContent = '지도'; actions.append(map);
    if((r.coins>0||r.canBuy)&&r.openShop){const shop=test(el('button',r.canBuy?'sv-report-button sv-report-replay sv-shop-first':'sv-report-button sv-result-shop','강화하기',actions),'result-meta');shop.type='button';shop.onclick=()=>r.openShop(parent,shop);if(r.canBuy)actions.prepend(shop);}
    if (rank) side.append(rank);
    const reduced = view.matchMedia('(prefers-reduced-motion: reduce)').matches, started = view.performance.now() + (r.fell && !reduced ? 300 : 0);
    function tick(now) {
      if (!parent.isConnected) return;
      const t = reduced ? 1 : Math.min(1, Math.max(0, (now - started - 500) / 850)), k = 1 - (1 - t) ** 3;
      for (const c of counters) c.node.textContent = c.format(Math.round(c.n * k));
      if (t < 1) view.requestAnimationFrame(tick);
    }
    view.requestAnimationFrame(tick);
  }
  S.result = { report, render };
})();
