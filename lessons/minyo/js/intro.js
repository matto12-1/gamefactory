// 곡 소개 족자(2026-11-13 대표 ⑩ 「노래 시작하기 전에 팝업 모달로 이 노래에 대한 설명」, 결은 A 족자).
// 지도에서 곡을 고르거나 끝 화면 「다음 곡」으로 넘어갈 때만 띄운다. 「다시 하기」 · 박 맞추기 · 붙임 주소(?song=)로는 띄우지 않는다.
// 글은 docs/games/minyo/곡소개-글.md. 받는 소리의 칠 글자는 게임의 첫 판 칠 자리(빈칸을 뺀 글자 번호)와 같다.
(function () {
  'use strict';
  const TEXT = {
    kwaeji: { where: '경상도 마을 마당에서', work: '명절에 풍물을 치며 둥글게 춤을 추었어요', call: '쾌지나 칭칭나네', beats: [0, 5, 6], meter: '굿거리 · 큰박 넷', words: [['앞소리꾼', '은 노랫말을 한 줄씩 먼저 부르는 사람이에요']] },
    wolwol: { where: '경상도 동해안 바닷가 마을에서', work: '대보름 밤에 손잡고 둥글게 돌았어요', call: '월월이 청청', beats: [0, 3], meter: '자진모리 · 큰박 넷', words: [['대보름', '은 음력 1월 15일로, 한 해 첫 보름달이 뜨는 날이에요']] },
    garae: { where: '충청도 공주 의당 마을 집터에서', work: '새 집 지을 땅을 고르며 가래로 흙을 퍼냈어요', call: '어허넝청 가래로세', beats: [0, 2, 4, 7], meter: '큰박 넷', words: [['가래', '는 여럿이 줄을 당겨 흙을 퍼 올리는 큰 삽이에요']] },
    myeolchi: { where: '제주 바닷가 모래밭에서', work: '그물을 함께 당겨 멸치를 잡았어요', call: '엉허야 뒤야', beats: [0, 1, 3, 4], meter: '중중모리 · 큰박 넷', words: [['후리다', '는 그물을 둘러쳐 몰아 잡는다는 뜻이에요']] },
    geomun: { where: '전남 여수 거문도 서도리에서', work: '고깃배에서 노를 저었어요', call: '어야 디야', beats: [0, 1, 2, 3], meter: '굿거리 · 큰박 넷', words: [['거문도', '는 여수 남쪽 바다에 있는 섬이에요']] },
    ganggang: { where: '전라도 바닷가 마을에서', work: '추석과 대보름 달밤에 손잡고 원을 돌았어요', call: '강강술래', beats: [0, 1, 2, 3], meter: '진양에서 자진모리로 빨라져요', words: [] },
    baennorae: { where: '서울과 경기 소리꾼들의 무대에서', work: '뱃일 소리를 빠르게 주고받았어요', call: '어야디야', beats: [0, 2], meter: '자진모리 · 큰박 넷', words: [['자진', '은 긴 소리 다음의 빠른 소리예요']] }, // 노래 알기 B01 · B04와 같은 말(곡별 검수 06 R1-06)
    unjae: { where: '강원도 화천 산골에서', work: '산에서 베어 낸 통나무를 여럿이 끌어 날랐어요', call: '어이도 사노', beats: [0, 3], meter: '‘어’와 ‘사’에서 쳐요', words: [['운재', '는 베어 낸 나무를 나르는 일이에요']] },
    punggu: { where: '황해도 산골 대장간에서', work: '풀무 발판을 밟아 불에 바람을 넣었어요', call: '어기여차 불어라 불 불 불어라', beats: [0, 4, 7, 8, 9], meter: '느린 자진모리 · 큰박 넷', words: [['풀무', '는 불에 바람을 넣는 도구예요']] },
    jajinari: { where: '평안도 산골 밭에서', work: '호미로 밭에 난 풀을 뽑았어요', call: '아이고 아이고 성화로구나', beats: [0, 3, 6, 8, 10], meter: '자진모리 · 큰박 넷', words: [['성화', '는 답답하고 애가 타는 마음이에요']] },
    dungdang: { where: '전라도 바닷가 마을 마당에서', work: '둘러앉아 물방구를 두 손으로 두드렸어요', call: '당기 둥당기 둥당기여', beats: [0, 2, 3, 5, 6], meter: '중중모리 · 큰박 넷', words: [['물방구', '는 물동이에 엎어 띄운 바가지예요']] },
    singosan: { where: '함경도 마을에서', work: '여럿이 어울려 춤추며 놀았어요', call: '어랑 어랑 어허야', beats: [0, 2, 4], meter: '볶는타령 · 큰박 넷', words: [['신고산', '은 함경도 안변에 있는 땅 이름이에요']] },
  };
  // 장면에서 사람과 소품이 서는 띠(세계 좌표 320×180 안). 그림 칸은 이 띠를 잘라 보여 준다
  const BAND = { y: 72, h: 106 }, BANDS = { wolwol: { y: 60, h: 106 }, ganggang: { y: 60, h: 106 } };
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
  let box = null, song = null, raf = 0, turn = 0;

  function build() {
    box = el('dialog', 'scroll', null, document.body); box.id = 'introBox';
    box.dataset.test = 'intro'; box.setAttribute('aria-labelledby', 'introTitle');
    const close = el('button', 'scrollClose', '시작 화면', box); close.type = 'button'; close.dataset.test = 'intro-close'; close.setAttribute('aria-label', '시작 화면');
    const pic = el('canvas', 'introPic', null, box); pic.id = 'introPic'; pic.setAttribute('aria-hidden', 'true');
    const head = el('header', 'introHead', null, box);
    el('h2', null, null, head).id = 'introTitle';
    head.append(close);
    const chips = el('div', 'chips', null, head);
    el('span', 'chip', null, chips).id = 'introRegion';
    el('span', 'chip level', null, chips).id = 'introLevel';
    // 붉은 낙관: 이 곡에서 받은 가장 높은 도장(지도 곡 줄과 같은 그림 · 이름). 아직 없으면 비운다
    const seal = el('figure', 'introSeal', null, head); seal.id = 'introSeal';
    const sealImg = el('img', null, null, seal); sealImg.alt = ''; el('figcaption', null, null, seal);
    const facts = el('dl', 'facts', null, box);
    for (const [key, label] of [['where', '어디서'], ['work', '하던 일'], ['call', '받는 소리'], ['meter', '장단'], ['words', '낯선 말']]) {
      const row = el('div', 'fact ' + key, null, facts); row.id = 'introRow-' + key;
      el('dt', null, label, row); el('dd', null, null, row).id = 'intro-' + key;
    }
    const modes = el('div', 'introModes', null, box); modes.id = 'introModes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', '어떻게 칠지');
    for (const [id, label, hard] of [['introEasy', '쉬움 노랫말', false], ['introHard', '어려움 장구 장단', true]]) {
      const b = el('button', 'modeChip', null, modes); b.type = 'button'; b.id = id; b.dataset.test = hard ? 'intro-hard' : 'intro-easy';
      const split = label.indexOf(' '); el('span', '', label.slice(0, split), b); el('span', '', label.slice(split + 1), b);
      b.addEventListener('click', () => { $(hard ? 'modeHard' : 'modeEasy').click(); paintModes(); });
    }
    const actions = el('div', 'introActions', null, box);
    const go = el('button', 'btnRed', '시작', actions); go.type = 'button'; go.id = 'introGo'; go.dataset.test = 'intro-start';
    const practice = el('button', 'btnPaper', '처음 배우기', actions); practice.type = 'button'; practice.id = 'introPractice'; practice.dataset.test = 'intro-practice';
    // 닫은 뒤 시작 창의 단추를 그대로 누른다(녹음을 받는 동안 「불러오는 중」도 시작 창 단추에 뜬다)
    go.addEventListener('click', () => { hide(); $('startGo').click(); });
    practice.addEventListener('click', () => { hide(); $('startPractice').click(); });
    const book = el('button', 'btnPaper introBook', '노래 알기', actions); book.type = 'button'; book.dataset.test = 'intro-songbook';
    book.addEventListener('click', () => { hide(); window.MinyoSongbook.open(song, { review: true }); });
    close.addEventListener('click', hide);
    box.addEventListener('cancel', e => { e.preventDefault(); hide(); });
    box.addEventListener('close', stop);
  }
  // 노래 알기 풀이 가운데 낱말로 시작하는 글만 「낱말 + 나머지」로 나눠 쓴다(「옛날에는 … 해동이라고도」처럼 낱말이 가운데 오는 풀이는 뺀다)
  function pool(s) {
    const list = [...TEXT[s.id].words], have = new Set(list.map(([w]) => w));
    for (const [w, mean] of window.MinyoSongbookData?.[s.id]?.[1]?.words || []) {
      const text = mean.replace(/\.$/, ''), head = text.startsWith(w) ? w : text.startsWith(`‘${w}’`) ? `‘${w}’` : '';
      if (!head || have.has(w)) continue;
      have.add(w); list.push([head, text.slice(head.length)]);
    }
    return list;
  }
  function paintModes() { for (const [id, from] of [['introEasy', 'modeEasy'], ['introHard', 'modeHard']]) $(id).setAttribute('aria-pressed', String($(from).classList.contains('on'))); }
  function fill(s) {
    const t = TEXT[s.id];
    box.dataset.song=s.id;
    $('introTitle').textContent = s.title;
    $('introRegion').textContent = window.MINYO.REGIONS[s.region].full;
    const level = $('introLevel'), n = s.level === '쉬움' ? 1 : s.level === '보통' ? 2 : 3;
    level.textContent = s.level; level.dataset.level = n;
    const dots = el('span', 'levelDots', null, level); dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) el('i', null, null, dots);
    const saved = typeof save !== 'undefined' ? save : null, stamp = saved?.stamps?.[s.id], seal = $('introSeal');
    seal.hidden = !stamp;
    if (stamp) {
      const top = !!saved.top?.[s.id], full = !!saved.perfect?.[s.id], n = window.MinyoRules.sealFor(s, stamp, { top, perfect: full });
      seal.querySelector('img').src = s.sealFiles?.[n] || `art/${s.sealDir || 'onghe'}/seal-${n}.png`;
      seal.querySelector('figcaption').textContent = top ? s.topStamp : full ? s.fullStamp || '풍년' : (s.stamps || window.MinyoRules.STAMPS)[stamp];
    }
    $('intro-where').textContent = t.where; $('intro-work').textContent = t.work;
    const call = $('intro-call'); call.textContent = ''; let k = 0;
    for (const c of t.call) {
      if (c === ' ') { call.append(' '); continue; }
      if (t.beats.includes(k)) el('b', 'beat', c, call); else call.append(c);
      k++;
    }
    $('intro-meter').textContent = t.meter;
    // 낯선 말은 판마다 하나씩 돌아간다(판 21, 대표 「판마다 바꾼다」): 곡 소개 낱말 뒤에 노래 알기 2장에서 접어 둔 낱말
    const list = pool(s), words = $('intro-words'); words.textContent = '';
    if (list.length) { const [w, mean] = list[turn % list.length], p = el('p', null, null, words); el('b', null, w, p); p.append(mean); }
    $('introRow-words').hidden = !list.length;
    if (s.hardLabel) $('introHard').lastElementChild.textContent = s.hardLabel;
    $('introModes').hidden = $('startModes').hidden; paintModes();
    $('introPractice').hidden = $('startPractice').hidden;
  }
  // 그림 칸: 뒤에서 움직이는 곡 장면(scene.js의 낮은 해상도 화면 lo)을 띠만큼 잘라 매 장면 옮겨 그린다
  function drawPic() {
    raf = requestAnimationFrame(drawPic);
    const pic = $('introPic'), band = BANDS[song.id] || BAND;
    if (typeof lo === 'undefined' || !lo.width) return;
    const x0 = Math.max(0, -vx), x1 = Math.min(lo.width, 320 - vx), y0 = Math.max(0, band.y - vy), y1 = Math.min(lo.height, band.y + band.h - vy);
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0); if (w < 8 || h < 8) return;
    if (pic.width !== w || pic.height !== h) { pic.width = w; pic.height = h; }
    const c = pic.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h);
    c.drawImage(lo, Math.round(x0), Math.round(y0), w, h, 0, 0, w, h);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; document.body.classList.remove('introOpen'); }
  function hide() { if (box?.open) box.close(); stop(); }
  // options.turn: 이 곡 소개를 몇 번째 띄우는지(game.js introFor가 저장에서 센다). 노래 알기에서 돌아올 때는 앞 낱말 그대로
  function open(s, options = {}) {
    if (!TEXT[s.id]) return false;
    if (!box) build();
    if (Number.isInteger(options.turn)) turn = options.turn; else if (song?.id !== s.id) turn = 0;
    song = s; fill(s);
    if (!box.open) box.showModal();
    document.body.classList.add('introOpen'); // 창 뒤에는 장면만 둔다(시작 창 글판이 겹쳐 보이지 않게)
    $('introGo').focus();
    cancelAnimationFrame(raf); drawPic();
    return true;
  }
  window.MinyoIntro = { open, hide, isOpen: () => !!box?.open, text: TEXT, words: pool };
})();
