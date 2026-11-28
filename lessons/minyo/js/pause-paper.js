// 멈춤 창을 곡 소개와 같은 족자로 입힌다(2026-11-13 밤 대표 「족자 ㄱ」, 옛 한지 쪽지는 2026-11-07). 창은 사이트 틀이 만들어서 틀 문서에 글자 모양을 넣는다
(function () {
  'use strict';
  const scroll = n => new URL(`art/ui/scroll/${n}.webp`, location.href).href;
  const fonts = [[400, 'a53ae3b93c4f'], [700, '42d2b195fed9'], [800, 'c217d81e5538']].map(([weight, hash]) => `@font-face{font-family:"Minyo Hahmlet";src:url("${new URL(`fonts/hahmlet-${weight}.${hash}.woff2`, location.href).href}") format("woff2");font-weight:${weight};font-display:block}`).join('');
  // 공용 틀 파일은 그대로 두고, 민요가 열린 동안에만 모서리 단추에 같은 글꼴을 입힌다.
  window.MinyoShellFont = function () {
    const doc = window.frameElement?.ownerDocument;
    if (!doc) return;
    const style = doc.createElement('style');
    style.textContent = fonts + '.minyo-shell-font :is(.exit-button,.sound-button,[data-test="stamp-notice"]){font-family:"Minyo Hahmlet"!important;font-weight:700!important;font-synthesis:none}' +
      '.minyo-shell-font [data-test="stamp-notice"]{display:none!important}' +
      '@media(max-height:420px){.minyo-shell-font :is(.exit-button,.sound-button){top:16px!important;min-height:48px!important;min-width:48px!important}}'; // 커진 누름 상자는 위로 4px 늘려 놀이 쪽 아래 경계를 지킨다.
    doc.head.append(style); doc.documentElement.classList.add('minyo-shell-font');
    const owners = [...doc.querySelectorAll('[data-test="exit-x"],[data-test="stamp-notice"]')];
    const paintIcon = () => {
      for (const owner of owners) {
      const code = owner.textContent.charCodeAt(0);
      if (owner.firstChild?.nodeType !== 3 || (code !== 0x2715 && code !== 0x2605)) continue;
      const label = owner.textContent.slice(1).trim();
      const icon = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 12 12'); icon.setAttribute('aria-hidden', 'true'); icon.classList.add('minyo-shell-icon');icon.dataset.char=String(code);
      icon.style.cssText = 'width:.9em;height:.9em;margin-right:.3em;vertical-align:-.08em;fill:none;stroke:currentColor;stroke-width:2';
      if(code===0x2605){icon.style.fill='currentColor';icon.style.strokeWidth='0';}
      const path = doc.createElementNS(icon.namespaceURI, 'path');path.setAttribute('d', code===0x2715?'M2 2 10 10M10 2 2 10':'M6 1 7.6 4.4 11.3 4.8 8.5 7.4 9.3 11 6 9.2 2.7 11 3.5 7.4 .7 4.8 4.4 4.4Z');icon.append(path);
      owner.replaceChildren(icon, label);
      }
    };
    const watcher = new MutationObserver(paintIcon);
    for (const owner of owners) watcher.observe(owner, { childList: true });
    // 멈춤이 나가기로 바뀌면 글 길이도 달라진다. 바뀐 실제 폭으로 끝 쪽지를 한 번 다시 놓는다.
    const cornerResize=new ResizeObserver(()=>{if(window.__GAME?.state()==='end')window.MinyoScreens.placeEnd();});
    for(const corner of doc.querySelectorAll('[data-test="exit-x"],[data-test="sound"]'))cornerResize.observe(corner);
    paintIcon();
    addEventListener('pagehide', () => {
      watcher.disconnect();cornerResize.disconnect();style.remove();doc.documentElement.classList.remove('minyo-shell-font');
      for (const owner of owners) { const icon=owner.querySelector('.minyo-shell-icon');if(icon)owner.textContent=String.fromCharCode(+icon.dataset.char)+' '+owner.textContent; }
    }, { once: true });
  };
  // 짜임: 머리(일시 정지 · 곡 이름 · 맞힌 자리) → 큰 계속하기 → 처음부터 · 지도 · 그만하기 → 소리 켬/끔과 크기 세 칸.
  // 족자 판은 scroll.css의 곡 소개와 같은 아홉 조각(위아래 160 · 좌우 150), 붉은 한지는 누를 곳 하나에만.
  // 함렛 정의는 MinyoShellFont가 이미 넣었다. 창에서 다시 등록하면 쓰지 않는
  // 옛 굵기가 unloaded로 남아 document.fonts.check가 계속 실패한다.
  const css = () => `
.gf-pause.gf-hanji,.gf-pause.gf-hanji *{font-family:"Minyo Hahmlet"!important;font-synthesis:none;word-break:keep-all}
.play-page dialog.gf-pause.gf-hanji{background:rgba(24,25,22,.6)!important;padding:12px!important;justify-content:center!important}
.play-page dialog.gf-pause.gf-hanji[open]{display:flex!important;flex-direction:column!important;align-items:center!important}
.gf-pause .hanji{--s:.5;position:relative;isolation:isolate;box-sizing:border-box;margin:auto;width:min(600px,calc(100vw - 24px));padding:calc(144px * var(--s) + 14px) calc(74px * var(--s) + 22px) calc(146px * var(--s) + 14px);display:flex;flex-direction:column;gap:14px;color:#342b22;filter:drop-shadow(0 18px 24px rgba(0,0,0,.4))}
.gf-pause .hanji::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;border-style:solid;border-width:calc(160px * var(--s)) calc(150px * var(--s));border-image:url(${scroll('panel.653479f62e25')}) 160 150 fill / calc(160px * var(--s)) calc(150px * var(--s)) stretch}
.gf-pause .hanji .pause-head{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.gf-pause .hanji .pause-title{margin:0!important;font:700 40px/1.25 "Minyo Hahmlet"!important;color:#342b22!important;-webkit-text-stroke:0!important;text-shadow:none!important;letter-spacing:.02em!important;animation:none!important}
.gf-pause .hanji .pause-tag{margin:0!important;padding:0!important;background:none!important;color:#716048!important;font:700 20px/1.3 "Minyo Hahmlet"!important}
.gf-pause .hanji .pause-board{position:static!important;transform:none!important;display:inline-flex!important;margin:2px 0 0!important;padding:0!important;background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
.gf-pause .hanji .pause-stat{display:flex!important;flex-direction:row!important;align-items:center!important;gap:10px!important;padding:0!important}
.gf-pause .hanji .pause-stat small{order:-1;display:inline!important;color:#67573e!important;font:700 16px/1.6 "Minyo Hahmlet"!important}
.gf-pause .hanji .pause-stat b{color:#342b22!important;font:400 26px/1.2 "Minyo Hahmlet"!important;-webkit-text-stroke:0!important;text-shadow:none!important}
.gf-pause .hanji :is(.pause-ic,.pause-disc,.pause-kbd,.pause-x){display:none!important}
.gf-pause .hanji :is(.pause-round,.pause-go){position:relative!important;width:auto!important;min-width:0!important;min-height:50px!important;margin:0!important;padding:0 10px!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:url(${scroll('secondary.7569fc7701e6')}) center/100% 100% no-repeat!important;color:#584333!important;text-shadow:none!important;display:flex!important;flex-direction:row!important;justify-content:center!important;align-items:center!important;gap:0!important;font:700 18px/1.1 "Minyo Hahmlet"!important;white-space:nowrap;transition:filter .1s,translate .1s}
.gf-pause .hanji .pause-go{order:0!important;flex:none!important;min-height:66px!important;background-image:url(${scroll('primary.c80f15aca357')})!important;color:#fff7e8!important;font:700 28px/1 "Minyo Hahmlet"!important;letter-spacing:.06em;text-shadow:0 1px 0 rgba(70,10,0,.45)!important}
.gf-pause .hanji :is(.pause-round,.pause-go) .pause-lab{font:inherit!important;color:inherit!important;white-space:nowrap}
.gf-pause .hanji :is(.pause-round,.pause-go):hover{filter:brightness(1.05)}
.gf-pause .hanji :is(.pause-round,.pause-go):active{translate:0 2px;filter:brightness(.93)}
.gf-pause .hanji :is(.pause-round,.pause-go)::after{display:none!important}
.gf-pause .hanji button:focus-visible{outline:2px solid #6b2a1d!important;outline-offset:2px}
.gf-pause .hanji .pause-minor{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.gf-pause .hanji .pause-soundrow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);align-items:center;gap:8px;border-top:1px solid #bca989;padding-top:12px}
/* 소리 켬 · 끔과 크기 세 칸도 위 단추와 같은 한지 단추로(2026-11-27 대표 「UI가 통일되지가 않은 곳」: 초록 밀어 켜기 · 납작한 흰 상자를 걷음) */
.gf-pause .hanji .pause-soundrow [data-test="pause-sound"]{min-height:48px!important;padding:0 6px!important;font:700 17px/1.2 "Minyo Hahmlet"!important}
.gf-pause .hanji .pause-soundrow [data-test="pause-sound"][aria-pressed=false]{color:#8a7a62!important}
.gf-pause .hanji .pause-music-slot:empty{display:none}
.gf-pause .hanji .pause-volume{position:static!important;translate:none!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:none!important;min-width:0}
.gf-pause .hanji .pause-volume legend{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;font:700 16px "Minyo Hahmlet"!important}
.gf-pause .hanji .pause-volume button{min-height:48px!important;min-width:0!important;margin:0!important;background:url(${scroll('secondary.7569fc7701e6')}) center/100% 100% no-repeat!important;border:0!important;border-radius:0!important;color:#584333!important;padding:0 4px!important;font:700 17px "Minyo Hahmlet"!important;box-shadow:none!important;transition:filter .1s}
.gf-pause .hanji .pause-volume button:hover{filter:brightness(1.05)}
/* 고른 크기는 눌린 한지처럼 어둡게, 글은 붉게(시작 창 보통 · 어려움 고르기와 같은 붉은 글) */
.gf-pause .hanji .pause-volume button[aria-pressed=true]{filter:brightness(.88) sepia(.3);color:#8f2f1c!important}
@media(max-width:600px) and (orientation:landscape){
  .gf-pause .hanji{--s:.32;width:min(370px,calc(100vw - 16px));gap:12px;padding:calc(144px * var(--s) + 12px) calc(74px * var(--s) + 12px) calc(146px * var(--s) + 12px)}
  .gf-pause .hanji .pause-title{font-size:32px!important}
  .gf-pause .hanji .pause-tag{font-size:18px!important}
  .gf-pause .hanji .pause-go{min-height:60px!important;font-size:24px!important}
  .gf-pause .hanji .pause-minor{gap:8px}
  .gf-pause .hanji .pause-minor .pause-round{font-size:16px!important;padding:0 4px!important;min-height:48px!important}
  .gf-pause .hanji .pause-soundrow{grid-template-columns:1fr;gap:8px}
  .gf-pause .hanji .pause-soundrow [data-test="pause-sound"]{justify-self:stretch}
}
/* 낮은 가로 화면은 폭 480px부터 두 칸(왼쪽 제목 · 오른쪽 단추). 568×320에서 한 줄로 쌓으면 위 제목 · 아래 크기 칸이 잘렸다(2026-11-27) */
@media (max-height:520px) and (min-width:480px){
  .gf-pause .hanji{--s:.24;width:min(720px,calc(100vw - 24px));display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);grid-template-areas:'head go' 'head minor' 'head sound';gap:8px 18px;align-content:start;padding:calc(144px * var(--s) + 8px) calc(74px * var(--s) + 14px) calc(146px * var(--s) + 8px)}
  .gf-pause .hanji .pause-head{grid-area:head;align-self:center}
  .gf-pause .hanji .pause-go{grid-area:go;min-height:50px!important;font-size:22px!important}
  .gf-pause .hanji .pause-minor{grid-area:minor;gap:8px}
  .gf-pause .hanji .pause-minor .pause-round{min-height:48px!important;font-size:16px!important}
  .gf-pause .hanji .pause-soundrow{grid-area:sound;grid-template-columns:minmax(0,1fr) minmax(0,3fr);padding-top:6px;gap:8px}
  .gf-pause .hanji .pause-soundrow [data-test="pause-sound"],.gf-pause .hanji .pause-volume button{font-size:15px!important;padding:0 4px!important}
  .gf-pause .hanji .pause-title{font-size:26px!important}
  .gf-pause .hanji .pause-tag{font-size:16px!important}
}
`;
  window.MinyoPausePaper = function (dialog) {
    const doc = dialog.ownerDocument, q = sel => dialog.querySelector(sel);
    const soundButton=q('[data-test="pause-sound"]');
    if(soundButton){
      const paintSound=()=>{soundButton.querySelector('.pause-lab').textContent=soundButton.getAttribute('aria-pressed')==='true'?'소리 켬':'소리 끔';};
      const watchSound=new MutationObserver(paintSound);watchSound.observe(soundButton,{attributes:true,attributeFilter:['aria-pressed']});
      paintSound();dialog.addEventListener('close',()=>watchSound.disconnect(),{once:true});
    }
    if (!doc.getElementById('minyo-pause-paper')) {
      const st = doc.createElement('style');
      st.id = 'minyo-pause-paper'; st.textContent = css();
      doc.head.append(st);
    }
    const div = cls => { const d = doc.createElement('div'); d.className = cls; return d; };
    const box = div('hanji'), head = div('pause-head'), minor = div('pause-minor'), sound = div('pause-soundrow');
    // 사이트 틀이 만든 단추를 그대로 옮긴다(누르면 하는 일은 틀이 정한 그대로). 곡 이름 앞 「팔도 장단 · 」은 뺀다
    const tag = q('.pause-tag'); if (tag) tag.textContent = tag.textContent.replace(/^[^·]*·\s*/, '');
    for (const e of [q('.pause-title'), tag, q('.pause-board')]) if (e) head.append(e);
    for (const sel of ['[data-test="restart"]', '[data-test="pause-home"]', '[data-test="quit"]']) { const b = q(sel); if (b) minor.append(b); }
    for (const e of [q('[data-test="pause-sound"]'), q('.pause-volume'), q('.pause-music-slot'), q('[data-test="pause-rotate"]')]) if (e) sound.append(e);
    const go = q('.pause-go');
    q('.pause-row')?.remove();
    const rest = [...dialog.children];
    box.append(head, ...(go ? [go] : []), minor, sound, ...rest);
    dialog.append(box);
    dialog.classList.add('gf-hanji');
  };
})();
