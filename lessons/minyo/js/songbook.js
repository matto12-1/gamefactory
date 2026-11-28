// A 족자 네 장. 본판의 drawLyric·placeMsgs에는 손대지 않는 독립된 듣기 화면이다.
(function () {
  'use strict';
  const DATA = window.MinyoSongbookData;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text, parent) => {
    const e = document.createElement(tag); if (cls) e.className = cls;
    if (text != null) e.textContent = text; if (parent) parent.append(e); return e;
  };
  let box, body, s, page = 0, review = false, back = null, heard, skipped, audio, request = 0, raf = 0, audioWait = 0;
  let lastAudioTime = null, lastAudioProgress = 0, lastDuration = 0;
  let activityPages = [];
  const AUDIO_WAIT_MS = 6000;
  const pageDone = n => heard[n] || skipped[n];
  let rows = [], marks = [], beats = [], loading = false, pointer = null, activeRow = null, tapFeedback = 0, hooks = {};
  // 모든 곡의 듣기와 잠금 설명은 활동 아래 같은 칸에 둔다.
  const basic = [[0, '덩', 1], [1, '쿵', .8], [2, '쿵', .8], [3, '쿵', .8]];
  const gut = [[0, '덩', 1], [2 / 3, '기덕', .6], [1, '쿵', .8], [1.5, '더러러러', .55], [2, '쿵', .85], [8 / 3, '기덕', .6], [3, '쿵', .8], [3.5, '더러러러', .55]];
  function facts(list, parent) {
    const dl = el('dl', 'bookFacts', null, parent);
    for (const [label, value] of list) { const row = el('div', '', null, dl); el('dt', '', label, row); const dd=el('dd', '', '', row);putText(dd, value);if(page<2) keepTail(dd); }
    return dl;
  }
  // 4장 따라 치기 칸 그림(판 21 덧붙임, art/ui/beat-*.png 32×32 도트)
  const HAND_PIC = { 손뼉: 'clap', 무릎: 'knee' };
  const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두', '열세', '열네', '열다섯'];
  // 게임 차례대로 한 번씩만 보인다: ♪(글로 안 옮긴 메김. 둥당기 「♪ ♪ ♪」도)는 빼고 다른 판 가사로 채우지 않는다.
  // 받는 소리와 같은 메김 줄은 그 줄밖에 없을 때만 남긴다(거문도 「어야 디야」).
  function callLines() {
    const answer = DATA[s.id][1].answer.split(' / '), seen = new Set();
    let calls = s.bars().filter(b => b.call).map(b => b.me || '').filter(t => t && !/^[♪\s]+$/.test(t) && !seen.has(t) && seen.add(t));
    if (calls.some(t => !answer.includes(t))) calls = calls.filter(t => !answer.includes(t));
    return calls;
  }
  // 줄 안 낱말에 밑줄. 겹치면(멜발 · 멜) 앞에서 시작하는 긴 낱말 하나만 긋는다
  function marked(p, text, words) {
    const found = words.filter(w => text.includes(w)).sort((a, b) => text.indexOf(a) - text.indexOf(b) || b.length - a.length);
    let from = 0;
    for (const w of found) { const at = text.indexOf(w, from); if (at < 0) continue; p.append(text.slice(from, at)); el('u', '', w, p); from = at + w.length; }
    p.append(text.slice(from)); return p;
  }
  // 2장: 받는 소리와 한 줄 풀이, 첫 메김 줄과 낱말 칸. 나머지 노랫말 · 풀이는 접어 둔다
  function lyricPage(data) {
    data = { chips: [], more: [], words: [], ...data };
    const answer = el('section', 'bookAnswer', '', body);
    el('p', 'bookLabel', '받는 소리', answer);
    const big = el('p', 'bookBig', '', answer);
    data.answer.split(' / ').forEach((t, i) => { if (i) big.append(document.createElement('br')); big.append(t); });
    if (data.note) keepTail(el('p', 'bookNote', data.note, answer));
    // 메김을 하나도 글로 안 옮긴 곡(둥당기)은 메기는 노랫말 칸 없이 낱말 칸을 받는 소리 밑에 둔다. 「♪」는 함렛 글꼴에 없다(2026-11-27)
    const calls = callLines(), first = calls.length ? el('section', 'bookFirst', '', body) : answer;
    if (calls.length) {
      el('p', 'bookLabel', '메기는 노랫말', first);
      keepTail(marked(el('p', 'bookBig', '', first), calls[0], data.chips.map(c => c[0])));
    }
    if (data.chips.length) {
      const chips = el('ul', 'bookChips', '', first);
      for (const [w, mean] of data.chips) { const li = el('li', '', '', chips); el('b', '', w, li); li.append(mean); }
    }
    if (calls.length < 2 && !data.more.length) return;
    const all = el('details', 'bookAll', '', body), label = calls.length > 1 ? `노랫말 ${COUNT[calls.length] || calls.length} 줄 모두 보기` : '풀이 모두 보기';
    const summary = el('summary', '', label, all); summary.dataset.test = 'songbook-all';
    if (data.more.length) facts(data.more, all);
    if (calls.length > 1 || data.words.length) lyrics(all, data.words, calls);
    all.addEventListener('toggle', () => { summary.textContent = all.open ? '접기' : label; requestAnimationFrame(overflow); });
  }
  // 4장: 장단 이름 큰 글과 짧은 줄
  function meter(data, parent) {
    el('p', 'bookLabel', data.label, parent);
    putText(el('p', 'bookMeter', '', parent), data.name);
    if (data.sub) el('p', 'bookMeterSub', data.sub, parent);
    if (data.facts?.length) facts(data.facts, parent);
    if (data.note) el('p', 'bookNote', data.note, parent);
  }
  function keepTail(parent) {
    const tail=parent.textContent.match(/\S+\s+\S+\s*$/u);if(!tail)return;
    const start=tail.index,walk=document.createTreeWalker(parent,NodeFilter.SHOW_TEXT);let offset=0;
    for(let node=walk.nextNode();node;node=walk.nextNode()){
      if(offset+node.length>start){const range=document.createRange();range.setStart(node,start-offset);range.setEnd(parent,parent.childNodes.length);const fragment=range.extractContents(),span=el('span','bookTail','');span.append(fragment);range.insertNode(span);break;}offset+=node.length;
    }
  }
  function putText(parent, text) {
    const quoteCodes = [0x300c, 0x300d];
    for (const part of text.split(/([\u300c\u300d])/u)) {
      const code = part.codePointAt(0);
      if (!quoteCodes.includes(code)) { parent.append(part); continue; }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 8 18');
      svg.setAttribute('class', 'bookQuote'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', part);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', code === 0x300c ? 'M7 2H2V12' : 'M1 16H6V6'); svg.append(path); parent.append(svg);
    }
  }
  function build() {
    box = el('dialog', 'scroll songbook', null, document.body); box.id = 'songbookBox'; box.dataset.test = 'songbook';
    box.setAttribute('aria-labelledby', 'bookTitle');
    const close = el('button', 'scrollClose', '지도', box); close.type = 'button'; close.dataset.test = 'songbook-close';
    close.setAttribute('aria-label', '지도로 돌아가기'); close.addEventListener('click', leave);
    const head = el('header', 'bookHead', null, box);
    el('p', 'bookSong', '', head).id = 'bookSong'; el('h2', '', '', head).id = 'bookTitle';
    el('p', 'bookCount', '', head).id = 'bookCount';
    body = el('div', 'bookBody', null, box); body.tabIndex = 0; body.dataset.test = 'songbook-body';
    const more=el('div','bookMore','',box);more.hidden=true;more.setAttribute('aria-hidden','true');
    body.addEventListener('scroll',overflow,true);
    new ResizeObserver(overflow).observe(body);
    const nav = el('footer', 'bookNav', null, box);
    const prev = el('button', 'btnPaper', '이전', nav); prev.type = 'button'; prev.id = 'bookPrev'; prev.dataset.test = 'songbook-prev';
    prev.addEventListener('click', () => turn(-1));
    const dots = el('div', 'bookDots', '', nav); dots.setAttribute('aria-label', '네 장 중 현재 장');
    for (let i = 0; i < 4; i++) { const d = el('i', '', '', dots); d.setAttribute('aria-hidden', 'true'); }
    const next = el('button', 'btnPaper', '다음', nav); next.type = 'button'; next.id = 'bookNext'; next.dataset.test = 'songbook-next';
    next.addEventListener('click', () => turn(1));
    const actions = el('div', 'bookActions', '', box); actions.id = 'bookActions';
    const go = el('button', 'btnRed', '시작', actions); go.type = 'button'; go.id = 'bookGo'; go.dataset.test = 'songbook-start';
    const practice = el('button', 'btnPaper', '처음 배우기', actions); practice.type = 'button'; practice.id = 'bookPractice'; practice.dataset.test = 'songbook-practice';
    for (const [b, target] of [[go, 'startGo'], [practice, 'startPractice']]) b.addEventListener('click', () => {
      if (b.disabled) return; hide(); $(target).click();
    });
    box.addEventListener('cancel', e => { e.preventDefault(); leave(); });
    // close는 나중에 도착할 수 있다. 그사이 다시 연 족자의 새 소리·그림은 끊지 않는다.
    box.addEventListener('close', () => { if (!box.open) stop(); });
    // 세로 읽기는 그대로 두고 가로로 충분히 민 손만 장 넘김으로 읽는다.
    body.addEventListener('pointerdown', e => { pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    body.addEventListener('pointerup', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y; pointer = null;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
    });
    body.addEventListener('pointercancel', () => { pointer = null; });
    body.addEventListener('pointerdown', e => { if (!e.target.closest('button')) tap(e); });
    box.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turn(e.key === 'ArrowLeft' ? -1 : 1); }
    });
    box.addEventListener('pointerdown', e => {
      if (s?.id === 'ganggang' && e.target.closest('#bookNext:disabled,#bookGo:disabled,#bookPractice:disabled')) pointToListen();
    }, true);
    // 듣는 중 창을 벗어났으면 끝까지 들은 것으로 세지 않는다.
    document.addEventListener('visibilitychange', () => { if (document.hidden && box.open) { stopAudio(); sync(); } });
  }
  function stopAudio() {
    request++; loading = false; clearTimeout(audioWait); audioWait = 0;
    if (audio) audio.stop(); audio = null;
    if ($('bookListen')) { $('bookListen').disabled = false; $('bookListen').textContent = heard && pageDone(page) ? '다시 듣기' : page === 3 ? '▶ 장단 듣기' : '▶ 들어 보기'; }
  }
  function stop() { stopAudio(); cancelAnimationFrame(raf); raf = 0; document.body.classList.remove('bookOpen'); }
  function hide() { if (box?.open) box.close(); stop(); }
  // 곡 소개에서 연 다시 보기는 같은 곡 소개로, 끝 화면에서 연 것은 back(새 곡 소개)으로 돌아간다
  function leave() { const song = s, again = review, go = back; hide(); if (!again) hooks.map(); else if (go) go(song); else window.MinyoIntro.open(song); }
  function turn(delta) {
    if (!box?.open || page + delta < 0 || page + delta > 3) return;
    if (delta > 0 && page === 2 && !pageDone(2)) { pointToListen(); return; }
    stopAudio();
    if(page>=2)activityPages[page]={nodes:[...body.childNodes],rows,marks,beats,lastDuration};
    page += delta; render();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) body.animate([
      { opacity: .5 }, { opacity: 1 },
    ], { duration: 220, easing: 'ease-out' }).onfinish=overflow;
  }
  function sync() {
    $('bookPrev').disabled = page === 0;
    $('bookNext').hidden = page === 3; $('bookNext').disabled = page === 2 && !pageDone(2);
    $('bookActions').hidden = page !== 3;
    $('bookGo').disabled = $('bookPractice').disabled = !pageDone(2) || !pageDone(3);
    $('bookGo').hidden = $('bookPractice').hidden = false;
    box.dataset.page = page + 1; box.dataset.playing = String(!!audio);
    box.querySelectorAll('.bookDots i').forEach((e, i) => { e.classList.toggle('on', i === page); });
    $('bookCount').textContent = `노래 알기 ${page + 1} / 4`;
    const locked = page >= 2 && !pageDone(page), status = $('bookStatus');
    const hint = page === 2 ? '들어 보기를 끝까지 들으면 다음 장이 열려요' : '장단 듣기를 끝까지 들으면 시작할 수 있어요';
    box.dataset.listenRequired = String(locked);
    if (status) {
      if (locked && (!status.textContent || status.dataset.gateHint === status.textContent)) {
        status.textContent = hint; status.dataset.gateHint = hint;
      } else if (!locked) {
        if (status.dataset.gateHint === status.textContent) status.textContent = '';
        delete status.dataset.gateHint;
      }
    }
    if ($('bookTap')) $('bookTap').disabled = !audio;
  }
  function pointToListen() {
    const status = $('bookStatus'); if (!status) return;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) status.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' },
    ], { duration: 300 });
  }
  // 펼친 노랫말 전체: 줄마다 풀이는 처음 나온 줄에만
  function lyrics(parent, words, calls) {
    const list = el('div', 'bookLyrics', '', parent); if (calls.length) el('h3', '', '메기는 노랫말', list);
    const glossed = new Set();
    for (const text of calls) {
      const row = el('div', 'bookVerse', '', list);
      const found = words.filter(([w]) => text.includes(w)).sort((a, b) => text.indexOf(a[0]) - text.indexOf(b[0]));
      keepTail(marked(el('p', '', '', row), text, found.map(f => f[0])));
      for (const [w, mean] of found) if (!glossed.has(w) && glossed.add(w)) keepTail(el('p', 'bookGloss', mean, row));
    }
    const extra = words.filter(([w]) => !s.bars().some(b => b.call && b.me?.includes(w)));
    // 보충 풀이는 기존 이름표 표에 둬서 원래 글자 크기도 유지한다.
    if (extra.length) facts(extra, list);
  }
  // 4장 큰박 칸 아래 「받는 소리에서 치는 글자」. 판의 첫 받는 소리 마디를 그대로 읽어서 판과 어긋나지 않는다.
  // 칠 자리가 모두 큰박이고 한 장단 안이면 큰박 칸에 맞춰 두고, 두 장단에 걸치거나 큰박 사이를 치면 받는 소리 한 줄로 둔다.
  function strikeRow(parent, cells) {
    const b = s.bars().find(d => !d.call && !d.intro && d.syl?.length && d.strikes?.length);
    const letters = b ? [...b.lyric].filter(c => c !== ' ') : [];
    if (!b || letters.length !== b.syl.length) return;
    const nearest = t => b.syl.reduce((best, v, i) => Math.abs(v - t) < Math.abs(b.syl[best] - t) ? i : best, 0);
    const pressed = new Set(b.strikes.map(nearest)), beats = b.beats ?? 4;
    const wrap = el('div', 'bookStrikes', '', parent); wrap.dataset.test = 'songbook-strikes';
    const firstLine = DATA[s.id][1].answer.includes(' / ');
    el('p', 'bookStrikesTitle', firstLine ? '받는 소리 첫 줄에서 치는 글자' : '받는 소리에서 치는 글자', wrap);
    const line = el('div', 'bookStrikeLine', '', wrap);
    const put = i => { const on = pressed.has(i), e = el('span', on ? 'on' : '', i < 0 ? '' : letters[i], line); e.dataset.hit = String(on); };
    const grid = n => { line.classList.add('cells'); line.style.setProperty('--beats', n); };
    if (cells === 2) { grid(2); [...pressed].sort((x, y) => x - y).forEach(put); }
    else if (beats <= cells + .3 && b.strikes.every(t => Math.abs(t - Math.round(t)) < .25)) {
      const n = Math.round(beats); grid(cells);
      // 자진뱃노래처럼 받는 소리가 반 장단이면 앞 칸은 메기는 소리 자리다.
      if (n < cells) el('span', 'lead', '메기는 소리', line).style.gridColumn = `span ${cells - n}`;
      for (let k = 0; k < n; k++) put(b.syl.findIndex(v => Math.abs(v - k) < .25));
    } else { let i = 0; for (const c of b.lyric) if (c === ' ') el('span', 'gap', '', line); else put(i++); }
  }
  function fitTails(){for(const t of body.querySelectorAll('.bookTail')){const p=t.parentElement;if(p&&t.getBoundingClientRect().right>p.getBoundingClientRect().right+.5)t.classList.remove('bookTail');}}
  function overflow(){
    // 끝 두 낱말 묶음이 글 칸 밖으로 나가면(사파리는 글 폭을 몇 px 넓게 잼) 묶음을 풀어 줄을 바꾸게 한다.
    fitTails();
    const more=box.querySelector('.bookMore');
    const candidates = [body, ...body.querySelectorAll('.bookExplanation,.bookFacts,.bookDemoLines')];
    for(const e of candidates){const cs=getComputedStyle(e);e.classList.toggle('bookScrollable',/auto|scroll/.test(cs.overflowY)&&e.scrollHeight-parseFloat(cs.paddingBottom)-e.clientHeight>1);}
    const area = candidates.find(e => e.scrollHeight - e.clientHeight - e.scrollTop > 1 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    more.hidden=!area;
    // 표시는 내림 칸 아래 22px 빈 줄에 둔다(.bookScrollable 아래 여백). 예시 노랫말 칸만 칸 안 끝 여백에 둔다.
    if(area){const a=area.getBoundingClientRect(),b=box.getBoundingClientRect(),inside=area.classList.contains('bookDemoLines');more.style.left=a.left-b.left+'px';more.style.top=a.bottom-b.top-(inside?22:0)+'px';more.style.width=a.width+'px';}
  }
  function render() {
    // 장을 바꿀 때 앞 장의 도장과 활동을 거둔다.
    box.querySelector('.bookSeal')?.remove();
    const data = DATA[s.id][page]; rows = []; marks = []; beats = []; activeRow = null; lastDuration = 0; body.replaceChildren(); body.classList.remove('bookScrollable'); body.scrollTop = 0;
    $('bookSong').textContent = s.title; $('bookTitle').textContent = data.title;
    if(page>=2&&activityPages[page]){
      const saved=activityPages[page];body.replaceChildren(...saved.nodes);rows=saved.rows;marks=saved.marks;beats=saved.beats;lastDuration=saved.lastDuration;
      sync();$('bookPrev').focus({preventScroll:true});fitTails();requestAnimationFrame(overflow);return;
    }
    if (page === 0) {
      const pic = el('figure', 'bookPic', null, body);
      const canvas = el('canvas', 'bookScene', '', pic); canvas.id = 'bookScene'; canvas.setAttribute('aria-label', s.title + ' 게임 장면');
      // 출처는 「 · 」 사이에서만 줄을 바꾼다(이름 한가운데서 꺾이지 않게)
      const credit = el('figcaption', 'bookCredit', '', pic);
      data.credit.split(' · ').forEach((part, i) => { if (i) credit.append(' · '); el('span', 'bookTail', part, credit); });
      const seal = el('img', 'bookSeal', null, box.querySelector('.bookHead')); seal.alt = ''; seal.src = s.sealFiles?.[3] || `art/${s.sealDir || 'onghe'}/seal-3.png`;
      facts(data.facts, body).classList.add('bookAbout');
    } else if (page === 1) lyricPage(data);
    else {
      const explanation = el('div', 'bookExplanation', '', body);
      if (page === 2) { el('p', 'bookRole', data.role, explanation); if (data.order) el('p', 'bookOrder', data.order, explanation); }
      else meter(data, explanation);
      // 놀이 안내는 내려 읽는 설명 칸 밖에 둬서 놀이 칸과 함께 늘 보인다.
      if (page === 2) el('p', 'bookHint', data.hint || data.songHint && s.hint || '구슬이 글자에 닿을 때 톡 눌러요', body);
      else el('h3', 'bookHint', '따라 쳐 보기', body);
      const panel = el('section', 'bookActivity', '', body); panel.id = 'bookActivity';
      const core = el('div', 'bookCore', '', panel);
      if (page === 2) {
        const actor = el('canvas', 'bookLeader', '', core); actor.id = 'bookLeader'; actor.width = actor.height = 64; actor.setAttribute('aria-label', '앞소리꾼');
        const lines = el('div', 'bookDemoLines', '', core); lines.id = 'bookDemoLines';
        for (const clip of data.clips) for (const i of clip.line) {
          const def = s.bars().find(b => b.i === i); if (!def) continue;
          const row = el('p', 'bookDemoLine ' + (def.call ? 'call' : 'response'), '', lines);
          const lyric = def.call ? def.me : def.lyric, letters = [];
          // ♪는 글자 대신 게임 판과 같은 음표 그림(scene.js noteIcon)으로 둔다. 함렛 글꼴에 없다(2026-11-27)
          for (const c of lyric) { if (c === ' ') row.append(' '); else { const n = el('span', '', c === '♪' ? '' : c, row); if (c === '♪') n.append(noteIcon()); letters.push(n); } }
          rows.push({ i, def, el: row, letters });
        }
        panel.classList.toggle('bookMany', rows.length > 2);
        el('div', 'bookMarks', '', core).id = 'bookMarks';
      } else {
        // 큰박마다 작은 박 셋인 곡은 칸마다 점 셋을 두고 장단 듣기 때 차례로 켠다(그래프 검수 9회차 R4-01)
        const subBeats = !data.responseRhythm && /작은 박 셋/.test(data.sub || '');
        const grid = el('div', 'bookBeatGrid', '', core); grid.style.setProperty('--beats', data.hands.length);
        data.hands.forEach((hand, i) => { const cell = el('div', 'bookBeat', '', grid); el('b', '', String(i + 1), cell); if (HAND_PIC[hand]) { const pic = el('i', 'bookHandPic', '', cell); pic.dataset.hand = HAND_PIC[hand]; pic.setAttribute('aria-hidden', 'true'); } el('span', '', hand, cell); if (subBeats) { const dots = el('i', 'bookSub', '', cell); dots.setAttribute('aria-hidden', 'true'); for (let k = 0; k < 3; k++) el('i', '', '', dots); } beats.push(cell); });
        strikeRow(core, data.hands.length);
      }
      el('p', 'bookStatus', '', panel).id = 'bookStatus'; $('bookStatus').setAttribute('role', 'status');
      const controls = el('div', 'bookControls', '', panel);
      const target = el('button', 'btnPaper bookTap', '여기를 톡', controls);target.type='button';target.id='bookTap';target.dataset.test='songbook-tap';
      target.addEventListener('pointerdown', e=>{e.preventDefault();tap(e);});
      target.addEventListener('keydown', e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();tap(e);}});
      const listen = el('button', 'btnPaper bookListen', pageDone(page) ? '다시 듣기' : page === 3 ? '▶ 장단 듣기' : '▶ 들어 보기', controls);
      listen.type = 'button'; listen.id = 'bookListen'; listen.dataset.test = 'songbook-listen'; listen.addEventListener('click', play);
      const progress=el('div','bookProgress','',panel);progress.id='bookProgress';
      const time=el('span','bookTime','',progress);time.id='bookTime';
      el('span','bookTimePrefix','듣기 ',time).id='bookTimePrefix';$('bookTimePrefix').hidden=true;
      el('span','bookClock','',time).id='bookClock';
      const track=el('div','bookTrack','',progress);track.setAttribute('role','progressbar');track.setAttribute('aria-label','듣기');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
      el('i','','',track).id='bookProgressFill';
      el('span','bookScore','',progress).id='bookScore';
      const skip = el('button', 'btnPaper bookListen', '소리 없이 계속', controls);
      skip.type = 'button'; skip.id = 'bookSkipAudio'; skip.dataset.test = 'songbook-skip-audio'; skip.hidden = true;
      skip.addEventListener('click', () => {
        stopAudio(); skipped[page] = true; skip.hidden = true;
        $('bookStatus').textContent = '소리 없이 넘겼어요';
        if (pageDone(2) && pageDone(3)) hooks.seen(s.id);
        sync();
      });
      {
        listen.setAttribute('aria-describedby', 'bookStatus');
        for (const id of ['bookNext', 'bookGo', 'bookPractice']) $(id).setAttribute('aria-describedby', 'bookStatus');
      }
      panel.addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && !e.target.closest('button')) { e.preventDefault(); if (!e.repeat) tap(e); } });
      panel.tabIndex = 0;
    }
    sync(); $('bookPrev').focus({ preventScroll: true });fitTails();requestAnimationFrame(overflow);
  }
  function lineStart(def) { return def.vfrom ?? (def.half || 0) * s.voice.bar + s.voice.grid; }
  function makeTimeline(segments) {
    const timeline = [];
    for (const seg of segments) for (const row of rows.filter(r => seg.line.includes(r.i))) {
      const start = lineStart(row.def), at = seg.at + start - seg.from;
      const next = segments.length && s.bars().find(b => b.i === row.i + 1 && b.clip === row.def.clip);
      row.at = Math.max(seg.at, at); row.until = Math.min(seg.at + seg.len, next ? seg.at + lineStart(next) - seg.from : Infinity);
      if (row.def.call) continue;
      const beat = 60 / (row.def.bpm || s.bpm);
      for (const strike of row.def.strikes) {
        let letter = 0, distance = Infinity;
        row.def.syl.forEach((v, i) => { if (Math.abs(v - strike) < distance) { letter = i; distance = Math.abs(v - strike); } });
        const node = row.letters[letter]; if (!node) continue;
        node.classList.add('target');
        timeline.push({ at: at + strike * beat, beat, row, node, letter: node.textContent, res: null });
      }
    }
    return timeline;
  }
  async function play() {
    stopAudio(); const token = request, atPage = page, data = DATA[s.id][page]; loading = true;
    lastDuration=0;marks=[];resetTapFeedback();
    $('bookSkipAudio').hidden = true;
    $('bookListen').disabled = true; $('bookListen').textContent = '불러오는 중'; $('bookStatus').textContent = '';
    sync();
    rows.forEach(r => { r.el.classList.remove('active'); r.letters.forEach(n => n.classList.remove('target', 'hit', 'landed')); });
    beats.forEach(b=>{b.classList.remove('hit','tapped');b.querySelector('.bookHit')?.remove();});
    $('bookMarks')?.replaceChildren();
    try {
      let clips = page === 2 ? data.clips : [], rhythm = null;
      if (page === 3 && data.responseRhythm) {
        const c = DATA[s.id][2].clips[0], def = s.bars().find(b => b.i === c.line[c.line.length - 1]);
        clips = Array.from({ length: 2 }, () => ({ file: c.file, from: lineStart(def), to: c.to, line: [] }));
      } else if (page === 3) rhythm = { beat: 60 / (data.bpm || s.bpm), pattern: s.id === 'kwaeji' ? s.drum : s.id === 'geomun' ? gut : basic };
      audioWait = setTimeout(() => { if (token === request && box.open) offerSilentRoute('소리를 불러오지 못했어요. 다시 듣거나 소리 없이 계속해요'); }, AUDIO_WAIT_MS);
      const prepared = await window.MinyoBookAudio.prepare(s, clips, rhythm);
      if (token !== request || !box.open) { prepared.stop(); return; }
      clearTimeout(audioWait); audioWait = 0;
      audio = prepared; lastDuration = audio.duration; loading = false; audio.start();
      lastAudioTime = null; lastAudioProgress = performance.now();
      marks = page === 2 ? makeTimeline(audio.segments) : [];
      if (page === 3) {
        if (data.responseRhythm) for (const seg of audio.segments) { marks.push({ at: seg.at, cell: 0 }, { at: seg.at + 1.245, cell: 1 }); }
        else for (let i = 0; i < 8; i++) marks.push({ at: i * rhythm.beat, cell: i % 4, sub: rhythm.beat / 3 });
      }
      $('bookListen').textContent = '듣는 중'; sync();
    } catch (err) {
      if (token !== request || atPage !== page || !box.open) return;
      console.error('songbook-audio', s.id, page + 1, err);
      offerSilentRoute('소리를 불러오지 못했어요. 다시 듣거나 소리 없이 계속해요');
    }
  }
  function offerSilentRoute(message) {
    stopAudio(); $('bookListen').textContent = '다시 듣기'; $('bookStatus').textContent = message;
    const skip = $('bookSkipAudio'); skip.hidden = false; sync(); skip.scrollIntoView({ block: 'nearest' });
  }
  function tap(e) {
    if (!audio) return;
    const t = audio.elapsed(e) - (typeof OFFSET === 'number' ? OFFSET : 0);
    if (page === 2) {
      const available = marks.filter(m => !m.res).sort((a, b) => Math.abs(t - a.at) - Math.abs(t - b.at));
      const nearest = available[0]; if (!nearest) return;
      const result = window.MinyoRules.judge(t - nearest.at, nearest.beat);
      if (!result) return;
      nearest.res = result; nearest.resAt = audio.elapsed(); nearest.node.classList.toggle('hit', window.MinyoRules.isHit(result));
      if(window.MinyoRules.isHit(result))showTapFeedback();
    } else if (page === 3) {
      const nearest = [...marks].sort((a, b) => Math.abs(t - a.at) - Math.abs(t - b.at))[0];
      if (!nearest || Math.abs(t - nearest.at) > .18) return;
      const cell = beats[nearest.cell]; cell.classList.remove('tapped'); void cell.offsetWidth; cell.classList.add('tapped','hit');
      if(!cell.querySelector('.bookHit'))el('i','bookHit','맞힘',cell);
      showTapFeedback();
    }
  }
  function resetTapFeedback(){clearTimeout(tapFeedback);const button=$('bookTap');if(button){button.classList.remove('bookTapHit');button.textContent='여기를 톡';}}
  function showTapFeedback(){resetTapFeedback();const button=$('bookTap');if(!button)return;button.classList.add('bookTapHit');button.textContent='맞힘';tapFeedback=setTimeout(resetTapFeedback,750);}
  function complete() {
    heard[page] = true;
    if (pageDone(2) && pageDone(3)) hooks.seen(s.id);
    if (page === 2) {
      const hits = marks.filter(m => window.MinyoRules.isHit(m.res)).length;
      $('bookStatus').replaceChildren();
      for (const m of marks) {
        const hit = window.MinyoRules.isHit(m.res), result = el('span', 'bookResult', m.letter, $('bookMarks'));
        const dot = el('i', 'bookResultDot' + (hit ? ' hit' : ''), '', result); dot.setAttribute('aria-label', hit ? '켜짐' : '꺼짐');
      }
      el('span','bookResultCount',`${marks.length}곳 중 ${hits}곳 맞혔어요`,$('bookStatus'));
      $('bookStatus').append(document.createElement('br'), '다음 장으로');
    } else $('bookStatus').replaceChildren('다 들었어요', document.createElement('br'), '시작을 눌러 노래해요');
    audio.stop(); audio = null; $('bookListen').disabled = false; $('bookListen').textContent = '다시 듣기'; sync();
  }
  function drawScene() {
    const canvas = $('bookScene'); if (!canvas || typeof lo === 'undefined' || !lo.width) return;
    if (s.id === 'kwaeji' && SPRITES.bg && SPRITES['leader-idle'] && SPRITES['follower-idle'] && SPRITES['hero-idle']) {
      // 마당과 세 악기 사람을 한 장으로 짠다. 좁은 띠로 잘라 장구잡이 머리가 사라지지 않게 한다.
      if (canvas.width !== 320 || canvas.height !== 90) { canvas.width = 320; canvas.height = 90; }
      const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 320, 90);
      const bg = SPRITES.bg; c.drawImage(bg, 0, bg.height * .5, bg.width, bg.height * .5, 0, 0, 320, 90);
      [['leader-idle', 35, 16], ['follower-idle', 124, 12], ['hero-idle', 210, 16]].forEach(([name, x, y]) => c.drawImage(SPRITES[name], x, y, 64, 64));
      return;
    }
    const band = { y: 28, h: 150 };
    const x0 = Math.max(0, -vx), x1 = Math.min(lo.width, 320 - vx), y0 = Math.max(0, band.y - vy), y1 = Math.min(lo.height, band.y + band.h - vy);
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0); if (w < 8 || h < 8) return;
    // 그림 칸은 이 비율(--ar)에 맞춰 줄이고 가운데 둔다. 칸 양옆 빈 바탕을 없앤다(곡별 검수 05 R2-04, songbook.css)
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; canvas.style.setProperty('--ar', (w / h).toFixed(4)); }
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h); c.drawImage(lo, x0, y0, w, h, 0, 0, w, h);
  }
  function drawLeader(active) {
    const canvas = $('bookLeader'); if (!canvas || typeof SPRITES === 'undefined') return;
    const name = SPRITES['leader-idle'] ? 'leader-idle' : 'leader-sing-a', img = SPRITES[name]; if (!img) return;
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 64, 64); c.drawImage(img, 0, 0, 64, 64);
    const m = META[name]?.mouth;
    if (active && m) { c.fillStyle = '#6b3024'; c.fillRect(m[0], m[1], m[2], m[3] + 1); }
    canvas.dataset.singing = String(active);
  }
  function frame() {
    if (!box?.open) return; raf = requestAnimationFrame(frame); drawScene();
    const t = audio?.elapsed() ?? -1;
    rows.forEach(r => r.el.classList.toggle('active', t >= r.at && t < r.until));
    // 낮은 화면은 지금 줄만 보인다. 0.8초 안에 구슬이 떨어질 다음 줄은 미리 보인다(Codex 검사 2026-11-27)
    rows.forEach(r => r.el.classList.toggle('soon', !!audio && t < r.at && marks.some(m => m.row === r && m.at - t > 0 && m.at - t < .8)));
    const current = rows.find(r => t >= r.at && t < r.until);
    const currentMark = current && marks.filter(m=>m.row===current).sort((a,b)=>Math.abs(t-a.at)-Math.abs(t-b.at))[0];
    const rowKey=current && `${current.i}:${currentMark?.at ?? ''}`;
    if (audio && current && activeRow !== rowKey) {
      activeRow = rowKey;
      const area = $('bookDemoLines'), line = (currentMark?.node || current.el).getBoundingClientRect(), view = area.getBoundingClientRect();
      if (line.top - 24 < view.top) area.scrollTop += line.top - 24 - view.top;
      else if (line.bottom + 4 > view.bottom) area.scrollTop += line.bottom + 4 - view.bottom;
    }
    drawLeader(rows.some(r => r.def.call && t >= r.at && t < r.until));
    // 구슬은 칠 때 0.8초 앞부터 글자 위로 떨어져 칠 때 닿는다(2026-11-27 대표 「갑자기 튀어나왔다 사라져서 절대 맞출수 없는」). 친 뒤에는 글자 위에 0.14초 머문다
    // 누르면 그 자리에서 구슬이 글자에 붙어 0.14초 머문다(일찍 눌러도 사라졌다 다시 나타나지 않게)
    marks.forEach(m => { if (!m.node) return; const k = t - m.at, on = m.res ? t - m.resAt < .14 : k > -.8 && k < .14; m.node.classList.toggle('landed', on); if (on) m.node.style.setProperty('--fall', m.res ? 0 : Math.max(0, -k / .8).toFixed(3)); });
    beats.forEach((b, i) => b.classList.toggle('on', marks.some(m => m.cell === i && t >= m.at && t < m.at + .3)));
    // 굿거리 반주(쾌지나 · 거문도)는 더러러러가 작은 박 자리와 어긋나서 첫 점(큰박)만 켠다
    const subSteps = !['kwaeji', 'geomun'].includes(s?.id);
    beats.forEach((b, i) => { const dots = b.querySelector('.bookSub'); if (!dots) return; const m = marks.find(m => m.cell === i && m.sub && t >= m.at && t < m.at + m.sub * 3); [...dots.children].forEach((d, k) => d.classList.toggle('on', !!m && (subSteps ? t >= m.at + k * m.sub && t < m.at + (k + 1) * m.sub : k === 0))); });
    if ($('bookTime')) {
      const duration = audio?.duration || lastDuration, elapsed = audio ? Math.max(0, Math.min(t, duration)) : heard[page] ? duration : 0;
      const clock=value=>`${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
      $('bookClock').textContent = duration ? `${clock(heard[page]&&!audio?Math.ceil(duration):Math.floor(elapsed))}/${clock(Math.ceil(duration))}` : '';
      $('bookTimePrefix').hidden=!duration;
      const percent = duration ? Math.min(100,elapsed/duration*100) : pageDone(page) ? 100 : 0;
      $('bookProgressFill').style.width=percent+'%';$('bookProgressFill').parentElement.setAttribute('aria-valuenow',String(Math.round(percent)));
      $('bookScore').textContent=page===2&&marks.length ? `맞힌 글자 ${marks.filter(m=>window.MinyoRules.isHit(m.res)).length}/${marks.length}` : '';
    }
    if (audio && t >= audio.duration) complete();
    else if (audio) {
      if (Number.isFinite(t) && (lastAudioTime === null || t > lastAudioTime + .01)) { lastAudioTime = t; lastAudioProgress = performance.now(); }
      else if (performance.now() - lastAudioProgress >= AUDIO_WAIT_MS) offerSilentRoute('소리가 멈췄어요. 다시 듣거나 소리 없이 계속해요');
    }
  }
  function open(song, options = {}) {
    if (!DATA[song.id]) return false;
    if (!box) build(); else hide();
    window.MinyoIntro.hide(); s = song; review = !!options.review; back = options.back || null; heard = [true, true, false, false]; skipped = [false, false, false, false]; activityPages=[];page = 0;
    box.dataset.song = s.id;
    box.querySelector('.scrollClose').setAttribute('aria-label', review ? '곡 소개로 돌아가기' : '지도로 돌아가기');
    box.querySelector('.scrollClose').textContent=review?'곡 소개':'지도';
    render(); box.showModal(); document.body.classList.add('bookOpen');
    $('bookNext').focus({ preventScroll: true });
    // 배경을 먼저 멈춘 사이트 틀에서도 새 곡의 그림이 준비되면 한 번 새로 그린다.
    Promise.all([yardArtReady(), songArtReady(song.ring ? song.ringArt || 'ganggang' : song.id)]).then(() => {
      if (box.open && s === song) draw();
    });
    cancelAnimationFrame(raf); frame(); return true;
  }
  window.MinyoSongbook = { open, hide, isOpen: () => !!box?.open, configure: value => { hooks = value; }, data: DATA,
    inspect: () => ({ song: s?.id, page: page + 1, review, heard: [...(heard || [])], skipped: [...(skipped || [])], loading, elapsed: audio?.elapsed() ?? null, duration: audio?.duration ?? null, targets: marks.map(({ at, letter, res, cell }) => ({ at, letter, res, cell })) }) };
})();
