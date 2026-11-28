// 팔도 장단 첫머리 이야기 컷 애니메이션(2026-11-27 대표: 민화 채색 그림 컷 → 게임 장면, 해설은 컷 1에만, 대사 다섯 줄).
// story.js가 부른다: MinyoCuts.play('intro' | 'rumor', 끝났을 때, { sound }) · MinyoCuts.skip() · MinyoCuts.fadeOut().
// 컷마다 사람을 지운 배경과 인물 층(art/story/<컷>/*.webp, 모두 1664×936 같은 자리)을 겹쳐 움직인다.
// 층 그림이 하나라도 없으면 그 컷은 통그림(art/story/<컷>.webp)에 화면 움직임 · 말풍선만 얹는다.
(function () {
  'use strict';
  const DIR = 'art/story/';
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NARRATION = ['옛날 제주 바닷가 마을', '멸치 떼가 들어오면 온 마을 사람이', '함께 그물을 당겼어요'];

  const css = document.createElement('style');
  css.textContent = `
@font-face{font-family:"Minyo Story Narration";src:url(fonts/story-songmyung.woff2) format("woff2");font-display:block}
@font-face{font-family:"Minyo Story Talk";src:url(fonts/story-yeonsung.woff2) format("woff2");font-display:block}
#cutStage{position:fixed;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;background:#efe2c6;transition:opacity .6s ease}
#cutStage.out{opacity:0;pointer-events:none}
#cutStage .wait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 22px "Minyo Hahmlet",serif;color:#6f5d48;pointer-events:none}
#cutStage .frame{position:relative;width:min(100vw,calc(100vh * 16 / 9));aspect-ratio:16/9;overflow:hidden;container-type:inline-size;background:#efe2c6}
#cutStage .cut{position:absolute;inset:0;opacity:0;transition:opacity .35s ease}
#cutStage .cut.on{opacity:1}
#cutStage .cam{position:absolute;inset:0;transform-origin:50% 50%}
#cutStage .cam img{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;user-select:none}
#cutStage .cam img.swap{transition:opacity .14s linear}
#cutStage .nar{position:absolute;left:5%;top:7%;font-family:"Minyo Story Narration",serif;color:#3a2a1c;pointer-events:none}
#cutStage .nar span{display:block;opacity:0;transform:translateY(.6cqw);transition:opacity .9s ease,transform .9s ease}
#cutStage .nar span.on{opacity:1;transform:none}
#cutStage .nar .a{font-size:4.2cqw;line-height:1.2}
#cutStage .nar .b{margin-top:1.2cqw;font-size:2.6cqw;line-height:1.35}
#cutStage .fog{position:absolute;left:0;top:0;width:62%;height:52%;background:radial-gradient(ellipse 100% 100% at 0% 0%,rgba(244,232,206,.96) 0 45%,rgba(244,232,206,.7) 62%,rgba(244,232,206,0) 82%);opacity:0;transition:opacity 1s ease;pointer-events:none}
#cutStage .fog.on{opacity:1}
#cutStage .bub{position:absolute;max-width:46%;padding:1.1cqw 2cqw;font:3.6cqw/1.3 "Minyo Story Talk",serif;color:#2f2318;border:.35cqw solid transparent;border-image:url(art/ui/polish/note-paper.webp) 80 85 81 84 fill / 1.5cqw 1.6cqw / .3cqw stretch;filter:drop-shadow(0 .3cqw .2cqw rgba(60,40,20,.28));word-break:keep-all;opacity:0;transform:scale(.8);transform-origin:20% 100%;transition:opacity .18s ease,transform .22s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
#cutStage .bub.r{transform-origin:80% 100%}
#cutStage .bub.on{opacity:1;transform:none}
#cutStage .bub::after{content:"";position:absolute;bottom:-2cqw;width:3.2cqw;height:2.1cqw;background:url(art/ui/polish/note-tail.webp) center/100% 100% no-repeat}
#cutStage .bub.l::after{left:18%}#cutStage .bub.r::after{right:18%}#cutStage .bub.n{transform-origin:50% 100%}#cutStage .bub.n::after{display:none}
#cutStage .glint{position:absolute;width:1.1cqw;height:.35cqw;border-radius:50%;background:#fbfbf4;box-shadow:0 0 .6cqw #fff;opacity:0}
#cutStage .fish{position:absolute;width:1.6cqw;height:.45cqw;border-radius:50%;background:linear-gradient(90deg,#c9d6d6,#f6f8f4);box-shadow:0 0 .3cqw rgba(255,255,255,.8)}
#cutStage .dust{position:absolute;width:3cqw;height:1.6cqw;border-radius:50%;background:rgba(222,200,160,.85)}
`;
  document.head.append(css);

  // ───────── 컷 정의 ─────────
  // layers: 층 이름들(뒤에서 앞으로). full: 통그림 이름. t: 길이(초). run(c): 그 컷의 움직임 · 말 · 소리
  const B = (text, left, top, tail = 'l') => ({ text, left, top, tail });
  const CUTS = {
    village: { full: '01-village', layers: null, t: 5.6, run(c) {
      c.cam([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }], 5.6, '74% 24%');
      c.narrate();
      for (let i = 0; i < 7; i++) c.glint(68 + (i * 37) % 18, 16 + (i * 13) % 11, .3 + i * .55);
      c.snd(0, 'wave-1', .7); c.snd(1.6, 'gull-1', .45); c.snd(3.6, 'wave-1', .5);
    } },
    call: { full: '02-call', layers: ['bg', 'crowd', 'lookout'], t: 3.6, run(c) {
      c.cam([{ transform: 'scale(1.06) translateX(1.5%)' }, { transform: 'scale(1)' }], 3.6);
      c.move('lookout', [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-2.5deg) translateY(-.6%)' }, { transform: 'rotate(1.5deg)' }, { transform: 'rotate(-2deg) translateY(-.4%)' }, { transform: 'rotate(0deg)' }], 0, 1.6, '72% 30%', 2);
      c.move('crowd', [{ transform: 'translateX(-7%)' }, { transform: 'translateX(-4.5%) translateY(-.7%)' }, { transform: 'translateX(-2.5%)' }, { transform: 'translateX(-1%) translateY(-.5%)' }, { transform: 'translateX(0)' }], 0, 1.8);
      c.say(B('멸치 떼다!', 47, 2, 'r'), .3, 2.8);
      c.snd(.1, 'step', .6); c.snd(.5, 'step-2', .6); c.snd(.9, 'step', .55); c.snd(1.3, 'step-2', .5); c.snd(.4, 'gull-2', .35);
    } },
    pull: { full: ['03a-front', '03b-back', '03c-fall'], layers: ['bg', 'a-leader', 'a-rest', 'a-front', 'b-leader', 'b-rest', 'b-front', 'c-all'], dir: '03', t: 5.4, run(c) {
      c.hide(['b-leader', 'b-rest', 'b-front', 'c-all'], 0);
      c.full(0, 0);
      // 앞 두 사람만 당겨 줄이 출렁, 뒷사람들은 휘청
      c.move('a-front', [{ transform: 'translateX(0)' }, { transform: 'translateX(-1.8%) rotate(-1.5deg)' }, { transform: 'translateX(-1.2%)' }], .3, .45, '10% 90%');
      c.move('a-rest', [{ transform: 'translateX(0)' }, { transform: 'translateX(-1.1%) rotate(-.8deg)' }, { transform: 'translateX(.4%) rotate(.6deg)' }, { transform: 'translateX(0)' }], .42, .7, '50% 90%');
      c.say(B('하나, 둘!', 13, 17), .15, 1.35);
      c.snd(.3, 'pull', .9); c.snd(.36, 'creak', .5);
      // 이번엔 뒷사람들만 당겨 앞사람이 고꾸라짐
      c.show(['b-leader', 'b-rest', 'b-front'], 1.6, ['a-leader', 'a-rest', 'a-front']);
      c.full(1, 1.6);
      c.move('b-rest', [{ transform: 'translateX(-.6%)' }, { transform: 'translateX(1.4%) rotate(.8deg)' }, { transform: 'translateX(1%)' }], 1.65, .45, '50% 90%');
      c.move('b-front', [{ transform: 'translateX(-.6%) rotate(0deg)' }, { transform: 'translateX(-1.6%) translateY(1%) rotate(-4deg)' }, { transform: 'translateX(-1.2%) translateY(.6%) rotate(-3deg)' }], 1.75, .5, '0% 100%');
      c.say(B('셋!', 45, 22), 1.6, 1.4);
      c.snd(1.65, 'pull-2', .9); c.snd(1.95, 'flop', .8);
      // 다 같이 엉덩방아
      c.show(['c-all'], 3.2, ['b-leader', 'b-rest', 'b-front']);
      c.full(2, 3.2);
      c.shake(3.25);
      for (let i = 0; i < 6; i++) c.dust(12 + i * 13, 74 + (i % 2) * 3, 3.25 + i * .04);
      c.say(B('으악!', 11, 28), 3.3, 1.6);
      c.snd(3.22, 'step', 1); c.snd(3.28, 'flop', .8); c.snd(4.4, 'gull-1', .5);
    } },
    escape: { full: '04-escape', layers: ['bg', 'net'], t: 3.4, run(c) {
      c.cam([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }], 3.4, '22% 58%');
      c.move('net', [{ transform: 'translateX(0)' }, { transform: 'translateX(-1.2%) translateY(.4%)' }], 0, 3.4);
      c.say(B('멸치가 다 빠져나간다!', 30, 6, 'n'), .3, 2.8);
      for (let i = 0; i < 16; i++) c.fish(26 + (i % 4) * 2, 50 + (i * 7) % 16, .1 + i * .13);
      c.snd(.2, 'splash', .8); c.snd(.9, 'fish-jump', .5); c.snd(1.5, 'splash', .6);
    } },
    blame: { full: '05-blame', layers: ['bg', 'left', 'right'], t: 4.7, run(c) {
      c.cam([{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], 4.7);
      c.say(B('하나 둘에 당기라니까!', 3, 6), .3, 2.5);
      c.talk('left', .3, 2.3, '30% 100%');
      c.say(B('셋에 당긴다며!', 62, 6, 'r'), 2.3, 2.3);
      c.talk('right', 2.3, 2.2, '70% 100%');
    } },
    leader: { full: '06-leader', layers: ['bg', 'crowd', 'leader-down', 'leader-up'], t: 6.1, run(c) {
      c.show(['crowd', 'leader-down'], 0); c.hide(['leader-up'], 0);
      c.say(B('소리도 없이 무슨 일을 해!', 54, 8), .3, 2.6);
      c.move('leader-down', [{ transform: 'translateX(0)' }, { transform: 'translateX(-.4%)' }, { transform: 'translateX(.4%)' }, { transform: 'translateX(0)' }], .4, .4, '50% 100%', 2);
      c.show(['leader-up'], 3, ['leader-down']);
      c.move('leader-up', [{ transform: 'translateY(0)' }, { transform: 'translateY(-2.2%)' }, { transform: 'translateY(0)' }], 3, .45, '50% 100%');
      c.snd(3.02, 'step', .7);
      c.say(B('내가 메기면 다 같이 받아!', 54, 8), 3.2, 2.8);
      c.cam([{ transform: 'scale(1)' }, { transform: 'scale(1)' }, { transform: 'scale(1.06)' }], 6.1, '50% 30%');
    } },
    kid: { full: '07-kid', layers: ['bg', 'kid', 'hand'], t: 3.4, run(c) {
      c.cam([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }], 3.4, '62% 46%');
      c.move('hand', [{ transform: 'translateX(-45%)' }, { transform: 'translateX(0)' }], .15, .4, '0 50%');
      c.say(B('거기 꼬마, 너부터!', 4, 10), .45, 2.3);
      c.move('kid', [{ transform: 'translateY(0)' }, { transform: 'translateY(-2%)' }, { transform: 'translateY(0)' }], .6, .35, '50% 100%');
      c.move('kid', [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-2.5deg)' }], 1.5, .4, '50% 100%');
      c.snd(.2, 'whoosh', .4); c.snd(.62, 'pop', .5);
    } },
    catch: { full: '08-catch', layers: ['bg', 'crowd', 'boat', 'sailor'], t: 4.2, run(c) {
      c.hide(['sailor'], 0);
      c.move('crowd', [{ transform: 'translateY(0)' }, { transform: 'translateY(.5%)' }, { transform: 'translateY(0)' }], 0, .8, '50% 100%', 4);
      c.move('boat', [{ transform: 'translateX(26%)' }, { transform: 'translateX(0)' }], 0, 1.4, '50% 100%');
      c.show(['sailor'], 1.45);
      c.move('sailor', [{ transform: 'translate(5%,4%)' }, { transform: 'translate(1%,-3%)' }, { transform: 'translate(0,0)' }], 1.45, .55);
      c.snd(1.3, 'splash', .7); c.snd(1.5, 'whoosh', .5); c.snd(2.05, 'step', .8);
    } },
    sailor: { full: '09-sailor', layers: ['bg', 'pair', 'sailor'], t: 7, run(c) {
      c.cam([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }], 7, '50% 40%');
      c.say(B('거문도는 노가 다 엉켰소!', 44, 1), .3, 2.1);
      c.talk('sailor', .3, 2, '50% 100%');
      c.say(B('뱃노래는 어쩌고?', 22, 1), 2.4, 1.4);
      c.talk('pair', 2.4, 1.3, '35% 100%');
      c.say(B('메기는 사람은 있는데 받는 사람이 없소!', 44, 1), 3.8, 3.1);
      c.talk('sailor', 3.8, 2.9, '50% 100%');
    } },
    sea: { full: '10-sea', layers: null, t: 3, run(c) {
      c.cam([{ transform: 'scale(1.12) translateY(5%)' }, { transform: 'scale(1) translateY(-3%)' }], 3, '50% 0%');
      c.snd(0, 'wave-1', .5); c.snd(.4, 'whoosh', .4);
    } },
  };
  const SHOWS = { intro: ['village', 'call', 'pull', 'escape', 'blame', 'leader', 'kid'], rumor: ['catch', 'sailor', 'sea'] };

  // ───────── 그림 불러오기 ─────────
  const loaded = new Map();
  function img(src) {
    if (!loaded.has(src)) loaded.set(src, new Promise(done => { const im = new Image(); im.decoding = 'async'; im.onload = () => done(im); im.onerror = () => done(null); im.src = src; }));
    return loaded.get(src);
  }
  const dirOf = (key, def) => DIR + (def.dir || def.full) + '/';
  // 컷 하나의 그림: 층이 다 있으면 층, 아니면 통그림
  async function art(key) {
    const def = CUTS[key];
    if (def.layers) {
      const ims = await Promise.all(def.layers.map(n => img(dirOf(key, def) + n + '.webp')));
      if (ims.every(Boolean)) return { layered: true, ims: Object.fromEntries(def.layers.map((n, i) => [n, ims[i]])) };
    }
    const fulls = [].concat(def.full);
    return { layered: false, fulls: await Promise.all(fulls.map(n => img(DIR + n + '.webp'))) };
  }
  function preload(show) { return Promise.all(SHOWS[show].map(art)); }

  // ───────── 재생 ─────────
  let run = null; // { timers, stage, done, sound }
  function stageEl() {
    let s = document.getElementById('cutStage');
    if (!s) { s = document.createElement('div'); s.id = 'cutStage'; s.dataset.test = 'story-cuts'; s.innerHTML = '<div class="frame"></div>'; document.body.append(s); }
    s.classList.remove('out'); s.hidden = false;
    return s;
  }
  function later(sec, fn) { if (!run) return; const r = run; r.timers.push(setTimeout(() => { if (run === r) fn(); }, Math.max(0, sec * 1000))); }
  function sound(name, vol) { if (run && run.sound) run.sound(name, vol); }

  async function play(show, done, opts = {}) {
    stop();
    const r = run = { timers: [], done, sound: opts.sound, key: show, cut: null };
    const frame = stageEl().querySelector('.frame'); frame.textContent = '';
    // 그림을 다 받기 전에는 빈 화면 대신 「불러오는 중」(지도에서 미리 받기 시작하니 보통은 안 보인다)
    const wait = document.createElement('div'); wait.className = 'wait'; wait.textContent = '불러오는 중'; wait.dataset.test = 'story-cuts-wait';
    const shown = setTimeout(() => frame.append(wait), 250);
    const arts = await preload(show);
    clearTimeout(shown); wait.remove();
    if (run !== r) return;
    let at = 0;
    SHOWS[show].forEach((key, i) => { later(at, () => cut(frame, key, arts[i])); at += CUTS[key].t; });
    later(at, () => finish());
    log(show);
  }
  function cut(frame, key, a) {
    const def = CUTS[key], old = frame.querySelector('.cut.on');
    const box = document.createElement('div'); box.className = 'cut'; box.dataset.cut = key;
    const cam = document.createElement('div'); cam.className = 'cam'; box.append(cam);
    const layers = {}, fulls = [];
    if (a.layered) for (const n of def.layers) { const im = a.ims[n].cloneNode(); im.alt = ''; im.dataset.layer = n; cam.append(im); layers[n] = im; }
    else a.fulls.forEach((f, i) => { if (!f) return; const im = f.cloneNode(); im.alt = ''; im.className = 'swap'; im.style.opacity = i ? '0' : '1'; cam.append(im); fulls.push(im); });
    frame.append(box);
    requestAnimationFrame(() => box.classList.add('on'));
    if (old) setTimeout(() => old.remove(), 400);
    if (run) run.cut = key;
    const anim = (el, kf, start, dur, origin, iter = 1) => {
      if (!el || RM || !el.animate) return;
      later(start, () => { if (origin) el.style.transformOrigin = origin; el.animate(kf, { duration: dur * 1000, iterations: iter, easing: 'ease-in-out', fill: 'forwards' }); });
    };
    const c = {
      cam: (kf, dur, origin) => anim(cam, kf, 0, dur, origin),
      move: (n, kf, start, dur, origin, iter) => anim(layers[n], kf, start, dur, origin, iter),
      // 말하는 동안 몸을 살짝 들썩
      talk: (n, start, dur, origin) => anim(layers[n], [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(-.4%) scaleY(1.01)' }, { transform: 'translateY(0) scaleY(1)' }], start, .32, origin, Math.max(1, Math.round(dur / .32))),
      show: (names, start, hideNames) => later(start, () => { for (const n of names) if (layers[n]) layers[n].style.opacity = '1'; for (const n of hideNames || []) if (layers[n]) layers[n].style.opacity = '0'; }),
      hide: (names, start) => { for (const n of names) if (layers[n] && start === 0) layers[n].style.opacity = '0'; else later(start, () => { if (layers[n]) layers[n].style.opacity = '0'; }); },
      full: (i, start) => later(start, () => fulls.forEach((im, k) => { im.style.opacity = k === i ? '1' : '0'; })),
      shake: start => anim(cam, [{ translate: '0 0' }, { translate: '.6% .4%' }, { translate: '-.5% -.3%' }, { translate: '.3% .2%' }, { translate: '0 0' }], start, .32),
      say: (b, start, dur) => {
        const el = document.createElement('div'); el.className = 'bub ' + b.tail; el.textContent = b.text; el.dataset.test = 'story-say';
        el.style.left = b.left + '%'; el.style.top = b.top + '%'; cam.append(el);
        later(start, () => el.classList.add('on')); later(start + dur, () => el.classList.remove('on'));
      },
      narrate: () => {
        const fog = document.createElement('div'); fog.className = 'fog'; box.append(fog);
        const nar = document.createElement('div'); nar.className = 'nar'; nar.dataset.test = 'story-narration';
        nar.innerHTML = '<span class="a"></span><span class="b"></span>';
        nar.children[0].textContent = NARRATION[0];
        nar.children[1].append(NARRATION[1], document.createElement('br'), NARRATION[2]);
        box.append(nar);
        later(.2, () => fog.classList.add('on')); later(.5, () => nar.children[0].classList.add('on')); later(1.9, () => nar.children[1].classList.add('on'));
      },
      glint: (x, y, start) => { const g = document.createElement('i'); g.className = 'glint'; g.style.left = x + '%'; g.style.top = y + '%'; cam.append(g); anim(g, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], start, .9, null, 3); },
      fish: (x, y, start) => { const f = document.createElement('i'); f.className = 'fish'; f.style.left = x + '%'; f.style.top = y + '%'; f.style.opacity = '0'; cam.append(f); anim(f, [{ opacity: 0, transform: 'translate(0,0)' }, { opacity: 1, transform: 'translate(8cqw,-1.5cqw)' }, { opacity: 0, transform: 'translate(30cqw,1cqw)' }], start, 1.1); },
      dust: (x, y, start) => { const d = document.createElement('i'); d.className = 'dust'; d.style.left = x + '%'; d.style.top = y + '%'; d.style.opacity = '0'; cam.append(d); anim(d, [{ opacity: .9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.6) translateY(-30%)' }], start, .7); },
      snd: (at, name, vol) => later(at, () => sound(name, vol)),
    };
    def.run(c);
  }
  function finish() { if (!run) return; const r = run; run = null; for (const id of r.timers) clearTimeout(id); r.done && r.done(); }
  function stop() { if (!run) return; for (const id of run.timers) clearTimeout(id); run = null; }
  // 건너뛰기: 남은 컷 없이 바로 끝
  function skip() { finish(); }
  // 무대를 천천히 걷는다(게임 장면 · 지도가 뒤에서 드러난다)
  function fadeOut(ms = 600) {
    const s = document.getElementById('cutStage'); if (!s) return;
    s.classList.add('out'); setTimeout(() => { if (!run) { s.hidden = true; s.querySelector('.frame').textContent = ''; } }, ms + 50);
  }
  function clear() { stop(); const s = document.getElementById('cutStage'); if (s) { s.hidden = true; s.classList.remove('out'); s.querySelector('.frame').textContent = ''; } }
  function log(show) { try { window.GF && window.GF.log && window.GF.log('story-cuts', { show }); } catch (e) { /* 기록 실패는 넘긴다 */ } }

  window.MinyoCuts = { play, skip, fadeOut, clear, preload, playing: () => !!run, now: () => run && run.cut, CUTS, SHOWS, NARRATION };
})();
