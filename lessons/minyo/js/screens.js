// 팔도 장단 메뉴 화면: 지도 · 곡 고르기 · 시작 창 · 끝 화면. 남이 쓴 글이 없어도 글은 textContent로만 넣는다
(function () {
  'use strict';
  const MAP_W = 1536, MAP_H = 960, SEA = '#ccdcdc';
  const NS = 'http://www.w3.org/2000/svg';
  // 땅 위 이름 자리와 낮은 화면에서 땅 밖으로 빼는 자리(좌표는 1536×960 기준)
  const WIDE = { 함경: [547, 210], 평안: [354, 289], 황해: [355, 450], 경기: [418, 535], 강원: [537, 470], 충청: [448, 615], 전라: [437, 739], 경상: [559, 671], 제주: [492, 905] };
  const LOW = { 평안: [150, 250], 황해: [150, 396], 경기: [150, 542], 충청: [150, 688], 전라: [150, 834], 함경: [760, 170], 강원: [790, 430], 경상: [840, 690], 제주: [560, 900] };
  const CENTER = { 함경: [547, 210], 평안: [354, 289], 황해: [355, 450], 경기: [449, 530], 강원: [515, 488], 충청: [448, 615], 전라: [437, 739], 경상: [559, 671], 제주: [405, 903] };
  const FINALE_LEAD_DX = 96; // 끝 장면: 앞소리꾼은 제주 꼬마 왼쪽 96점
  const $ = id => document.getElementById(id);
  function svg(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function el(tag, cls, text, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  const isLow = () => innerHeight < 420;

  // 지역 · 곡 차례 열림(2026-11-27). 시험 자동 손(navigator.webdriver)은 옛 시험처럼 다 열고, 주소 ?lock=1이면 잠근다
  const locking = () => !(navigator.webdriver && new URLSearchParams(location.search).get('lock') !== '1');
  const made = s => !!s.bars && !s.hidden;
  const R = () => window.MinyoRules, ALL = () => window.MINYO.SONGS;
  const isOpen = s => made(s) && (!locking() || !saved || R().songOpen(saved, s, ALL()));
  const regionOpenNow = name => !locking() || !saved || R().regionOpen(saved, name, ALL());
  const openSongs = () => ALL().filter(isOpen);
  window.MinyoLocking = locking;

  let finaleNow = null; // 끝 장면 그림 상태: 창 크기가 바뀌어 지도를 다시 그리면 그대로 되살린다
  let fresh = { regions: new Set(), songs: [] }, seen = null;
  const jo = (w, a, b) => w + ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? a : b); // 받침 있으면 a
  // 지도 위 알림 한 줄(닫힌 도를 눌렀을 때 · 새로 열렸을 때). 닫힌 도는 테가 잠깐 깜박인다
  function mapNote(text, region) {
    let n = $('mapNote');
    if (!n) { n = el('div', '', undefined, $('mapScreen')); n.id = 'mapNote'; n.dataset.test = 'map-note'; n.setAttribute('role', 'status'); }
    n.textContent = text; n.classList.remove('on'); void n.offsetWidth; n.classList.add('on');
    clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 2600);
    if (region) { const p = $('mapArt').querySelector(`path.reg[data-region="${region}"]`); if (p) { p.classList.remove('nudge'); void p.getBBox(); p.classList.add('nudge'); } }
  }
  let handlers = {}, selected = null, saved = null, built = null, baseBox = null, zoomNow = null, camAnim = 0, zoneSel = null;
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function buildMap() {
    const low = isLow(), mode = low ? 'low' : ('wide');
    if (built === mode) return;
    built = mode;
    const root = $('mapArt'); root.textContent = '';
    // 세로 화면은 그림에서 한반도 칸만 잡아 크게 그린다. 양옆 바다는 그림이 이어 준다
    baseBox = ([0, 0, MAP_W, MAP_H]);
    const s = svg('svg', { viewBox: baseBox.join(' '), preserveAspectRatio: ('xMinYMid meet'), 'data-test': 'map' }, root);
    svg('image', { href: 'art/map.webp', x: 0, y: 0, width: MAP_W, height: MAP_H, preserveAspectRatio: 'none' }, s);
    // 그림 오른쪽 끝이 바다 색으로 이어지게(넓은 창에서 구름이 잘려 보이지 않게)
    const defs = svg('defs', {}, s), grad = svg('linearGradient', { id: 'seaFade' }, defs);
    svg('stop', { offset: '0', 'stop-color': SEA, 'stop-opacity': 0 }, grad); svg('stop', { offset: '1', 'stop-color': SEA, 'stop-opacity': 1 }, grad);
    svg('rect', { x: MAP_W - 200, y: 0, width: 200, height: MAP_H, fill: 'url(#seaFade)', 'pointer-events': 'none' }, s);

    const openHere = new Set(openSongs().map(x => x.region));
    for (const r of window.MINYO_REGIONS) {
      const p = svg('path', { d: r.d, 'fill-rule': 'evenodd', class: 'reg' + (openHere.has(r.name) ? ' open' : '') + (regionOpenNow(r.name) ? '' : ' lock'), 'data-region': r.name }, s);
      p.addEventListener('click', () => pick(r.name));
    }
    const hw = low ? 73 : (53), hh = low ? 73 : (32), size = low ? 44 : (34), halo = low ? 11 : (8);
    for (const r of window.MINYO_REGIONS) {
      const pos = (low ? LOW : WIDE)[r.name], c = CENTER[r.name];
      if (low) svg('line', { x1: pos[0], y1: pos[1], x2: c[0], y2: c[1], class: 'lead-line' }, s);
      const g = svg('g', { class: 'tag' + (window.MINYO.REGIONS[r.name].later ? ' later' : '') + (openHere.has(r.name) ? ' open' : '') + (regionOpenNow(r.name) ? '' : ' lock'), 'data-tag': r.name, 'data-test': `region-${r.name}` }, s);
      svg('rect', { x: pos[0] - hw, y: pos[1] - hh, width: hw * 2, height: hh * 2 }, g);
      const t = svg('text', { x: pos[0], y: pos[1], 'font-size': size, 'stroke-width': halo }, g); t.textContent = r.name;
      g.addEventListener('click', () => pick(r.name));
    }
    el('div', '', undefined, root).id = 'mapPeople';
    if (selected) mark(selected);
    if (zoomNow) enterZoom(zoomNow.name, true); else placeMarks();
  }
  // 전체 지도에는 꼬마를 세우지 않는다(2026-11-13 저녁 대표 「지도에 저 캐릭터 너무 많으니까 없애자」). 확대 때 그린 마을 · 꼬마만 걷는다
  function placeMarks() {
    $('mapPeople').textContent = '';
  }
  // ───────── 지역 확대: 지도가 그 지역 마을로 다가가고, 마을 꼬마들이 마당을 돈다 ─────────
  function zoomView(z, vw, vh) {
    // 그림 1점이 화면에서 1.6px 이상이 되게 다가가고, 마당은 곡 목록 창 왼쪽에 둔다
    const k = Math.max(1.6, vw / 800), w = vw / k, h = vh / k;
    const x = Math.max(0, Math.min(MAP_W - w, z.yard[0] - w * ((0.33))));
    const y = Math.max(0, Math.min(MAP_H - h, z.yard[1] - h * 0.5));
    return { k, x, y, box: [(x - z.tx) / z.scale, (y - z.ty) / z.scale, w / z.scale, h / z.scale] };
  }
  function moveCam(s, to, ms, done) {
    cancelAnimationFrame(camAnim);
    if (ms <= 0 || RM) { s.setAttribute('viewBox', to.join(' ')); if (done) done(); return; }
    const from = s.getAttribute('viewBox').split(' ').map(Number), t0 = performance.now();
    const step = now => {
      // 바쁜 PC에서는 첫 rAF 시각이 t0보다 앞선다. 음수 비율이면 상자가 반대로 넘어가 viewBox 폭이 음수가 된다(출시 판정 11-20)
      const p = Math.min(1, Math.max(0, (now - t0) / ms)), e = 1 - Math.pow(1 - p, 3);
      s.setAttribute('viewBox', from.map((v, i) => v + (to[i] - v) * e).join(' '));
      if (p < 1) camAnim = requestAnimationFrame(step); else if (done) done();
    };
    camAnim = requestAnimationFrame(step);
  }
  function enterZoom(name, instant) {
    const z = window.MINYO.REGIONS[name].zoom, root = $('mapArt'), s = root.querySelector('svg');
    $('mapScreen').classList.add('zones'); // 세로 화면의 곡 목록 자리까지 지도가 채운다
    const rect = root.getBoundingClientRect(), v = zoomView(z, rect.width, rect.height);
    zoomNow = { name, z, v };
    s.classList.add('zoomed');
    if (!s.querySelector('.zoomImg')) {
      const im = svg('image', { class: 'zoomImg', x: -z.tx / z.scale, y: -z.ty / z.scale, width: MAP_W / z.scale, height: MAP_H / z.scale, preserveAspectRatio: 'none' });
      im.addEventListener('load', () => im.classList.add('loaded'));
      im.setAttribute('href', z.file);
      s.insertBefore(im, s.querySelector('path.reg'));
    }
    $('mapPeople').textContent = '';
    moveCam(s, v.box, instant ? 0 : 480, showZones);
  }
  function leaveZoom() {
    zoomNow = null;
    const s = $('mapArt').querySelector('svg');
    $('mapPeople').textContent = '';
    $('mapScreen').classList.remove('zones');
    for (const id of ['zoneArt', 'zoneTags']) { const e = $(id); if (e) e.remove(); }
    s.classList.remove('zoomed');
    const im = s.querySelector('.zoomImg'); if (im) im.remove();
    moveCam(s, baseBox, 380, placeMarks);
  }
  // ───────── 고장 지도: 곡 수만큼 갈린 그림 한 장. 땅 위에는 곡 이름만, 고른 곡의 그림 · 설명 · 도장 · 들어가기는 오른쪽 쪽지에 ─────────
  // 땅은 쪽지 왼쪽 빈자리 가운데에 두고 높이를 지도 칸에 맞춘다. 가장자리는 지역의 바다 방향에 맞춰 잇는다
  function paintZoneArt(zs, W, mapH, s, ox) {
    const root = $('mapArt'), iw = zs.w * s, ih = zs.h * s;
    let art = $('zoneArt');
    if (art) art.textContent = ''; else { art = el('div'); art.id = 'zoneArt'; root.insertBefore(art, $('mapPeople')); }
    const pic = (parent, x, flip) => {
      const im = el('img', '', undefined, parent);
      im.alt = ''; im.src = zs.file;
      im.style.cssText = `left:${x}px;top:0;width:${iw}px;height:${ih}px;transform:${flip ? 'scaleX(-1)' : 'none'}`;
      return im;
    };
    const strip = (left, width, imgLeft, origin, flip) => {
      const box = el('div', '', undefined, art);
      box.style.cssText = `left:${left}px;width:${width + 1}px;height:${mapH}px`;
      pic(box, imgLeft, flip).style.transformOrigin = `${origin}px 50%`;
    };
    const main = pic(art, ox, false), on = () => art.classList.add('on');
    if (main.complete) on(); else main.addEventListener('load', on, { once: true });
    // seaEdge가 없는 경상도는 기존 산/바다 띠를 그대로 쓴다. 새 그림은 고장이 없는 가장자리만 좁게 잘라 잇는다.
    const seaLeft = zs.seaEdge === 'left' || zs.seaEdge === 'both';
    const seaRight = !zs.seaEdge || zs.seaEdge === 'right' || zs.seaEdge === 'both';
    const hill = (zs.seaEdge ? seaLeft ? 300 : 240 : 300) * s, skip = zs.seaEdge ? 0 : 120 * s, sea = (seaRight ? 500 : 300) * s;
    for (let k = 0, left = ox + skip; left > 0; k++, left -= hill) strip(left - hill, hill, -skip, skip + hill / 2, k % 2 === 0);
    for (let k = 0, left = ox + iw; left < W; k++, left += sea) strip(left, sea, -(iw - sea), iw - sea / 2, k % 2 === 0);
  }
  // 받은 도장은 끝 화면과 같은 그림으로 곡 줄과 쪽지에 남는다. 어려움 판이 열리면 빈 도장 자리가 함께 보인다
  function songStamps(side, song) {
    const stamp = saved && saved.stamps[song.id];
    const top = !!(saved && saved.top && saved.top[song.id]), full = !!(saved && saved.perfect && saved.perfect[song.id]);
    if (stamp) stampChip(side, song, top ? song.topStamp : full ? song.fullStamp || '풍년' : (song.stamps || window.MinyoRules.STAMPS)[stamp], window.MinyoRules.sealFor(song,stamp,{top,perfect:full}), true, full && !top);
    if (saved && song.hardBars && window.MinyoRules.hardOpen(saved, song.id)) stampChip(side, song, song.hardStamp, window.MinyoRules.sealFor(song, 3, { hardOk: true }), !!(saved.hard && saved.hard[song.id]), true);
  }
  // 오른쪽 쪽지: 놀 수 있는 곡은 쪽지 전체가 누를 곳이고 「들어가기」로 시작 창을 연다. 만드는 중인 곡은 누를 곳이 없다
  function zonePanel(parent, song, zs, spot, withPic) {
    const open = isOpen(song), p = el(open ? 'button' : 'div', 'zp' + (open ? ' open' : ''), undefined, parent);
    p.id = 'zonePanel';
    if (open) p.dataset.test = `song-${song.id}`;
    const pic = withPic ? el('span', 'pic', undefined, p) : null;
    const title = el('span', 'ttl', undefined, p);
    el('b', '', song.title, title);
    if (open && song.level) el('span', 'lv', song.level, title);
    el('span', 'ln', song.line, p);
    if (open) {
      const st = el('span', 'st', undefined, p);
      songStamps(st, song);
      if (!st.childElementCount) st.remove();
      el('span', 'go', '들어가기', p);
      p.addEventListener('click', () => handlers.onSong(song));
    } else el('span', 'wait', made(song) ? R().lockHow(song, ALL()) : '만드는 중', p);
    return { p, pic };
  }
  // 쪽지 그림: 고장 둘레를 쪽지 폭에 맞춰 잘라 온다
  function fillPic(pic, zs, spot) {
    const cw = pic.clientWidth, ratio = (0.52), win = 640, wh = win * ratio, f = cw / win;
    const cx = Math.max(win / 2, Math.min(zs.w - win / 2, spot.crop[0])), cy = Math.max(wh / 2, Math.min(zs.h - wh / 2, spot.crop[1]));
    pic.style.height = `${Math.round(cw * ratio)}px`;
    pic.style.backgroundImage = `url(${zs.file})`;
    pic.style.backgroundSize = `${zs.w * f}px ${zs.h * f}px`;
    pic.style.backgroundPosition = `${-(cx - win / 2) * f}px ${-(cy - wh / 2) * f}px`;
    const canvas=el('canvas','village',undefined,pic),DPR=devicePixelRatio||1;
    const dot=Math.max(1,Math.floor(Math.min(cw/160,(cw*ratio)/90)*DPR))/DPR;
    pic.style.position='relative';canvas.style.cssText=`position:absolute;width:${160*dot}px;height:${90*dot}px;left:50%;bottom:0;transform:translateX(-50%);pointer-events:none`;
    window.MinyoVillages.paint(canvas,spot.song);
  }
  function ringPeople(cells, cx, cy, rx, ry, dot) {
    const box = $('mapPeople'), owner = zoomNow, size = 32 * dot, n = cells.length;
    const items = cells.map(cell => {
      const e = el('i', '', undefined, box);
      e.style.width = e.style.height = `${size}px`;
      e.style.backgroundSize = `${192 * dot}px ${size}px`;
      e.style.backgroundPosition = `${-size * cell}px 0`;
      return e;
    });
    const t0 = performance.now();
    const place = now => {
      if (zoomNow !== owner || !items[0].isConnected || $('mapScreen').hidden) return;
      const t = (now - t0) / 1000;
      items.forEach((e, i) => {
        const a = (RM ? 0 : t * 0.22) + (Math.PI * 2 * i) / n - Math.PI / 2, y = Math.round(cy + ry * Math.sin(a));
        const hop = !RM && Math.floor(t * 1.6 + i) % 2 ? -2 : 0;
        e.style.transform = `translate(${Math.round(cx + rx * Math.cos(a) - size / 2)}px,${Math.round(y - size * 0.8) + hop}px)`;
        e.style.zIndex = y;
      });
      if (!RM) requestAnimationFrame(place);
    };
    place(t0);
  }
  function showZones() {
    if (!zoomNow) return;
    const region = window.MINYO.REGIONS[zoomNow.name], zs = region.zones, root = $('mapArt'), W = root.clientWidth, H = root.clientHeight;
    // 쪽지는 오른쪽 바다 위
    const low = H < 400, pad = low ? 8 : 18;
    const pw = Math.round((low ? Math.min(292, W * 0.38) : Math.max(300, Math.min(440, W * 0.28))));
    let tags = $('zoneTags');
    if (tags) tags.textContent = ''; else { tags = el('div', '', undefined, root); tags.id = 'zoneTags'; }
    tags.classList.remove('slim'); tags.style.removeProperty('--zt'); // 앞 지역에서 줄인 이름표 크기를 이어 받지 않는다
    tags.style.removeProperty('--zt');
    const songOf = spot => window.MINYO.SONGS.find(x => x.id === spot.song);
    const spots = zs.spots.filter(songOf);
    if (!spots.some(sp => sp.song === zoneSel)) zoneSel = (spots.find(sp => sp.song === zs.defaultSong && isOpen(songOf(sp))) || spots.find(sp => isOpen(songOf(sp))) || spots[0]).song;
    const withPic = (!low);
    const makePanel = spot => {
      const { p, pic } = zonePanel(tags, songOf(spot), zs, spot, withPic);
      p.style.width = `${pw}px`;
      p.style.right = `${pad}px`;
      if (pic) fillPic(pic, zs, spot);
      return p;
    };
    // 곡마다 쪽지 높이가 달라도 지도와 단추가 흔들리지 않게 가장 큰 쪽지 높이로 맞춘다
    let ph = 0;
    for (const sp of spots) { const p = makePanel(sp); ph = Math.max(ph, Math.ceil(p.getBoundingClientRect().height)); p.remove(); }
    const top = low ? 70 : Math.max(76, Math.min(Math.round(H * 0.2), H - ph - 8));
    let panel = null;
    const showPanel = spot => {
      if (panel) panel.remove();
      panel = makePanel(spot);
      panel.style.minHeight = `${ph}px`;
      panel.style.top = `${top}px`;
    };
    const mapH = (H), free = (W - pw - pad - 8);
    const s = mapH / zs.h, ox = free / 2 - zs.landX * s;
    paintZoneArt(zs, W, mapH, s, ox);
    const people = $('mapPeople'); people.textContent = '';
    const DPR = window.devicePixelRatio || 1;
    // 도트라 기기 화소의 정수 배. 작은 화면은 꼬마도 작게, 큰 화면은 그림이 커지는 만큼 키운다
    const dot = Math.max(1, Math.round(((low) ? 0.5 : Math.max(1, Math.round(s * 1.6))) * DPR)) / DPR;
    const rx = Math.max(zs.ring[0] * s, 30), ry = Math.max(zs.ring[1] * s, 14); // 낮은 화면에서도 꼬마가 한데 뭉치지 않게
    const names = [],tagPlacements=[];
    const paintOn = () => { for (const t of names) { const on = t.dataset.song === zoneSel; t.classList.toggle('on', on); t.setAttribute('aria-pressed', String(on)); } };
    for (const spot of spots) {
      const song = songOf(spot), x = ox + spot.yard[0] * s, open = isOpen(song);
      // 낮은 화면은 위 마을과 이름을 함께 올려 아래 마을의 그림을 덮지 않게 한다.
      const firstOpen=spots.find(sp=>isOpen(songOf(sp)));
      const y = spot.yard[1] * s - (low&&open&&spot===firstOpen ? Math.min(30,spot.yard[1]*s-50) : 0);
      if (open) {
        const go = el('button', 'yardGo', undefined, people);
        go.dataset.test = 'yard-go';
        go.setAttribute('aria-label', song.title);
        const small=(low),scale=Math.max(1,Math.round((small ? 1 : Math.min(1.5,Math.max(1,s*2)))*DPR))/DPR;
        const width=(small?80:160)*scale,height=(small?45:90)*scale,hitH=Math.max(44,height);
        go.style.left = `${Math.round(x-width/2)}px`;go.style.top = `${Math.round(y+ry-hitH)}px`;
        go.style.width = `${width}px`;go.style.height = `${hitH}px`;
        const canvas=el('canvas','village',undefined,go);canvas.style.cssText=`position:absolute;left:0;bottom:0;width:${width}px;height:${height}px;pointer-events:none`;
        window.MinyoVillages.paint(canvas,song.id,small);
        go.addEventListener('click', () => { zoneSel=song.id;showPanel(spot);paintOn(); });
      }
      // 이름은 그 고장의 빈 바닥에 선다. 놀 수 있는 곡은 꼬마 고리 아래. 크기를 잰 뒤 지도 칸 안으로 당긴다
      const tag = el('button', 'zl ' + (open ? 'open' : 'shut'), song.title, tags);
      tag.dataset.test = `zone-${song.id}`; tag.dataset.song = song.id;
      tag.addEventListener('click', () => { zoneSel = song.id; showPanel(spot); paintOn(); });
      const placeTag=()=>{
        const tw = tag.offsetWidth, th = tag.offsetHeight, ly = open ? y + ry + (low ? 6 : 8) + th / 2 : y;
        const limit = Math.min(free - 4, spot.right ? ox + spot.right * s : Infinity);
        tag.style.left = `${Math.round(Math.max(4, Math.min(limit - tw, x - tw / 2)))}px`;
        tag.style.top = `${Math.round(Math.max(4, Math.min(mapH - th - 4, ly - th / 2)))}px`;
      };
      placeTag();tagPlacements.push(placeTag);
      names.push(tag);
    }
    showPanel(spots.find(sp => sp.song === zoneSel));
    paintOn();
    if((low)){
      const boxes=names.map(e=>e.getBoundingClientRect()),paper=panel.getBoundingClientRect();
      const gap=(a,b)=>Math.max(a.left-b.right,b.left-a.right,a.top-b.bottom,b.top-a.bottom);
      const smallest=Math.min(...boxes.flatMap((a,i)=>[gap(a,paper),...boxes.slice(i+1).map(b=>gap(a,b))]));
      tags.dataset.nameGap16=smallest.toFixed(2);
      // 16px에서 옆 판과 8px가 안 남으면 먼저 글은 16px 그대로 판 테두리만 줄인다(이름끼리 4px · 바다 쪽지와 8px, 곡별 검수 05 R1-07).
      // 그래도 모자라면 예전처럼 글을 줄인다.
      if(smallest<8){
        tags.classList.add('slim');tagPlacements.forEach(place=>place());
        const slim=names.map(e=>e.getBoundingClientRect());
        if(!slim.every((a,i)=>gap(a,paper)>=8&&slim.slice(i+1).every(b=>gap(a,b)>=4))){tags.classList.remove('slim');tags.style.setProperty('--zt',low?'13px':'14px');tagPlacements.forEach(place=>place());}
      }
      const kwaeji=names.find(t=>t.dataset.song==='kwaeji');
      if(kwaeji){
        // 이 곡의 이름은 16px를 지킨 채 이웃 이름과 바다 쪽지를 피한다.
        kwaeji.style.fontSize='16px';kwaeji.style.lineHeight='1.3';
        tagPlacements[names.indexOf(kwaeji)]();
        const own=kwaeji.getBoundingClientRect(),area=root.getBoundingClientRect(),others=[panel,...names.filter(t=>t!==kwaeji)].map(e=>e.getBoundingClientRect());
        const valid=(x,y)=>x>=area.left+4&&y>=area.top+4&&x+own.width<=area.left+free-4&&y+own.height<=area.top+mapH-4&&
          others.every(r=>x+own.width<=r.left-9||x>=r.right+9||y+own.height<=r.top-9||y>=r.bottom+9);
        const xs=[own.left,area.left+4,area.left+free-own.width-4,...others.flatMap(r=>[r.left-own.width-9,r.right+9])];
        const ys=[own.top,area.top+4,area.top+mapH-own.height-4,...others.flatMap(r=>[r.top-own.height-9,r.bottom+9])];
        let best=null,cost=Infinity;
        for(const x0 of xs)for(const y0 of ys){const x=Math.round(x0),y=Math.round(y0);if(!valid(x,y))continue;const d=(x-own.left)**2+(y-own.top)**2;if(d<cost){best={x,y};cost=d;}}
        if(best){kwaeji.style.left=best.x-area.left+'px';kwaeji.style.top=best.y-area.top+'px';}
      }
    }
    // 지역 이름과 「전체 지도」: 낮은 화면은 쪽지 아래, 세로 화면은 쪽지 위, 그 밖에는 왼쪽 아래
    const hud = el('div', 'zoneHud', undefined, tags);

    el('h2', '', region.full, hud);
    const back = el('button', '', '전체 지도', hud);
    back.dataset.test = 'map-back';
    back.addEventListener('click', () => { leaveZoom(); select(null); });
  }
  function mark(name) {
    document.querySelectorAll('#mapArt .reg').forEach(p => p.classList.toggle('on', p.dataset.region === name));
    document.querySelectorAll('#mapArt .tag').forEach(g => g.classList.toggle('on', g.dataset.tag === name));
  }
  // 첫머리 이야기 ⑤의 작은 배 · 전라 깜박임은 아이가 고장을 누르면 걷는다
  function storyMapClear() { document.querySelectorAll('#mapArt .storyZoom').forEach(e => e.classList.remove('storyZoom')); document.querySelectorAll('#mapArt .storyBoat').forEach(e => e.remove()); document.querySelectorAll('#mapArt .storyBlink').forEach(e => e.classList.remove('storyBlink')); }
  // 아이가 지도에서 도를 누름: 처음 하는 아이가 제주를 누르면 첫머리 이야기(2026-11-27). 지도로 돌아올 때의 select와 가른다
  function pick(name) {
    if (name === '제주' && regionOpenNow(name) && handlers.storyFirst && handlers.storyFirst()) { handlers.onStoryFirst(); return; }
    select(name);
  }
  function select(name, instant) {
    // ⑤ 지도(첫머리 이야기)에서 깜박이는 전라를 누르면 그 한 번은 거문도 쪽지부터. 저장에는 안 남긴다(그래프 검수 2회차 R1-02 · IC-07)
    if (name === '전라' && document.querySelector('#mapArt .storyBoat')) { const g = window.MINYO.SONGS.find(s => s.id === 'geomun'); if (g && isOpen(g)) zoneSel = 'geomun'; }
    if (name && !regionOpenNow(name)) { mapNote(R().regionLockHow(name), name); return; }
    if (name) storyMapClear();
    selected = name; mark(name);
    const panel = $('songPanel'); panel.textContent = ''; panel.hidden = false; panel.scrollTop = 0; // 목록이 바뀌면 지역 이름 · 돌아가기 단추부터 보인다
    panel.classList.toggle('grouped', !name);
    const hint = document.querySelector('.songMore'); if (hint) hint.hidden = true;
    if (!name) {
      const title = el('h2', '', '팔도 장단', panel);
      // 끝 장면을 본 아이는 제목 옆에 「소리 지도」 도장(2026-11-22). 그림이 없으면 숨긴다
      if (saved?.soundMapSeen) { const seal = el('img', 'mapSeal', undefined, title); seal.src = 'art/finale/seal-soundmap.png'; seal.alt = '소리 지도 도장'; seal.dataset.test = 'map-seal'; seal.onerror = () => seal.remove(); }
      // 지도에서 이야기 다시 보기(판 19 기본안): 첫머리를 본 뒤에, 끝 장면은 본 뒤에만
      if ((saved?.storySeen && saved?.rumorSeen) || saved?.soundMapSeen) { // 첫머리 기록이 없는 옛 저장도 끝 장면을 봤으면
        const row = el('div', 'storyAgain', undefined, panel);
        const a = el('button', 'btnPaper', saved.soundMapSeen ? '처음 이야기' : '이야기 다시 보기', row); a.type = 'button'; a.dataset.test = 'story-again'; a.addEventListener('click', () => handlers.onStory && handlers.onStory('open'));
        if (saved.soundMapSeen) { const b = el('button', 'btnPaper', '소리 지도', row); b.type = 'button'; b.dataset.test = 'soundmap-again'; b.addEventListener('click', () => handlers.onStory && handlers.onStory('finale')); }
      }
      // 열린 도는 열림 차례대로, 그 안의 닫힌 곡은 어둡게. 다음에 열릴 도는 첫 곡 하나만 어둡게(2026-11-27)
      let nextShown = false;
      for (const region of R().REGION_ORDER) {
        const songs = R().regionSongs(region, ALL()).filter(made);
        if (!songs.length) continue;
        const open = regionOpenNow(region);
        if (!open && nextShown) continue;
        const head = el('h3', 'regionHeading', window.MINYO.REGIONS[region].full, panel);
        if (fresh.regions.has(region)) el('span', 'newChip', '열림', head);
        if (!open) { nextShown = true; songRow(songs[0], panel, true, R().regionLockHow(region)); continue; }
        songs.forEach(s => songRow(s, panel, true, isOpen(s) ? '' : R().lockHow(s, ALL())));
      }
      feastRow(panel);
      moreHint(panel);
      return;
    }
    const region = window.MINYO.REGIONS[name], list = window.MINYO.SONGS.filter(s => s.region === name && !s.hidden);
    if (region.zones) { panel.hidden = true; enterZoom(name, instant); return; }
    const head = el('div', 'panelHead', undefined, panel);
    el('h2', '', region.full, head);
    const back = el('button', 'panelBack', '전체 지도', head); // 다른 지역 목록 · 잔치로 한 번에 돌아간다
    back.dataset.test = 'map-back';
    back.addEventListener('click', () => select(null));
    for (const song of list) songRow(song, panel, false);
    if (region.later) el('p', 'note', '이 지역 노래는 아직 만들고 있어요', panel);
    else if (list.some(s => !s.bars)) el('p', 'note', '흐린 노래는 아직 만들고 있어요', panel);
    moreHint(panel);
  }
  // 쪽지 아래에 더 내릴 곡이 있으면 아래 화살표. 끝까지 내리면 사라진다
  function moreHint(panel) {
    let hint = document.querySelector('.songMore');
    if (!hint) { hint = el('div', 'songMore', undefined, $('mapScreen')); hint.setAttribute('aria-hidden', 'true'); }
    const update = () => { const more = panel.scrollHeight - panel.clientHeight - panel.scrollTop > 6; hint.hidden = !more || !panel.classList.contains('grouped'); };
    panel.onscroll = update; requestAnimationFrame(update);
  }
  function stampChip(parent, song, label, n, on, gold) {
    const chip = el('span', 'got' + (on ? '' : ' none') + (gold ? ' gold' : ''), undefined, parent);
    const im = el('img', '', undefined, chip);
    im.alt = ''; im.src = song.sealFiles?.[n] || `art/${song.sealDir || 'onghe'}/seal-${n}.png`;
    el('span', '', label, chip);
  }
  function songRow(song, panel, withRegion, lockText) {
    if (lockText === undefined && made(song) && !isOpen(song)) lockText = R().lockHow(song, ALL());
    const open = !!song.bars && !lockText;
    const grouped = panel.classList.contains('grouped');
    const row = el(open ? 'button' : 'div', 'song' + (open || lockText ? ' open' : ' shut') + (lockText ? ' locked' : ''), undefined, panel); // 닫힌 곡은 열린 칸 꼴 그대로 어둡게
    row.dataset.test = `song-${song.id}`;
    if(song.bars){
      const canvas=el('canvas','village',undefined,row),DPR=devicePixelRatio||1;
      const thumb=(innerHeight<=420?80:160);
      const dot=grouped?Math.max(1,Math.floor(thumb*DPR/80))/DPR:Math.max(1,Math.round(DPR))/DPR;
      canvas.style.cssText=`flex:none;width:${80*dot}px;height:${45*dot}px;pointer-events:none`;
      if(grouped)window.MinyoVillages.paintEmblem(canvas,song.id);else window.MinyoVillages.paint(canvas,song.id,true);
    }
    const text = el('div', 'txt', undefined, row);
    const name2 = el('div', 'nm', song.title, text);
    if (song.level) {
      const meta = grouped ? el('div', 'listMeta', undefined, text) : name2;
      const level = el('span', 'lv', song.level, meta);
      if (grouped) {
        const n = song.level === '쉬움' ? 1 : song.level === '보통' ? 2 : 3;
        level.dataset.level = n;
        const dots = el('span', 'levelDots', undefined, level); dots.setAttribute('aria-hidden', 'true');
        for (let i=0;i<n;i++) el('i','',undefined,dots);
      }
    }
    const descriptions={kwaeji:'앞소리를 받아 불러요',baennorae:'강에서 노를 저어요',wolwol:'달밤에 손잡고 돌아요',myeolchi:'줄을 잡고 그물을 당겨요',garae:'줄을 당겨 흙을 퍼 올려요',unjae:'갈고리로 통나무를 끌어 내려요',punggu:'발판을 밟아 불에 바람을 넣어요',jajinari:'호미로 밭에 난 풀을 뽑아요',singosan:'두 팔을 들고 춤을 춰요',geomun:'박에 맞춰 노를 저어요',ganggang:'손잡고 원을 돌아요',dungdang:'두 손으로 물방구를 두드려요'};
    el('div', 'ds', lockText || (grouped ? descriptions[song.id] : withRegion ? `${window.MINYO.REGIONS[song.region].full} · ${song.line}` : song.line), text);
    if (!open) return;
    const side = el('div', 'side', undefined, row);
    songStamps(side, song);
    if (grouped) el('span', 'listStamp', [...side.querySelectorAll('.got:not(.none)')].at(-1)?.querySelector('span')?.textContent || '', side);
    el('i', 'play', undefined, side);
    row.addEventListener('click', () => handlers.onSong(song));
  }
  // 팔도 잔치 줄: 아무 여섯 지역에서 도장을 하나씩 모으면 누를 수 있다. 그 전에는 모은 지역 수를 보여 준다
  function feastRow(panel) {
    const F = window.FEAST || (typeof FEAST !== 'undefined' ? FEAST : null); if (!F) return;
    const songs = window.MINYO.SONGS.filter(s => !s.later && s.bars), { got, need } = window.MinyoRules.feastGot(saved, songs), open = need > 0 && got >= need;
    const row = el(open ? 'button' : 'div', 'song feast' + (open ? ' open' : ' shut'), undefined, panel);
    row.dataset.test = 'song-feast';
    const DPR = devicePixelRatio || 1, thumb = (innerHeight <= 420 ? 80 : 160), dot = Math.max(1, Math.floor(thumb * DPR / 80)) / DPR;
    const canvas = el('canvas', 'village', undefined, row); canvas.style.cssText = `flex:none;width:${80 * dot}px;height:${45 * dot}px;pointer-events:none`;
    window.MinyoVillages.paintEmblem(canvas, 'feast');
    const text = el('div', 'txt', undefined, row);
    el('div', 'nm', F.title, text);
    el('div', 'ds', open ? F.startWork : `여섯 지역 도장을 모으면 열려요 · ${got}/${need}`, text);
    if (!open) return;
    const side = el('div', 'side', undefined, row);
    songStamps(side, F);
    el('span', 'listStamp', [...side.querySelectorAll('.got:not(.none)')].at(-1)?.querySelector('span')?.textContent || '', side);
    el('i', 'play', undefined, side);
    row.addEventListener('click', () => handlers.onFeast());
  }
  const timers = [];
  function showOnly(id) { while (timers.length) clearTimeout(timers.pop()); for (const s of ['mapScreen', 'startScreen', 'endScreen', 'calibScreen']) $(s).hidden = s !== id; }

  // 구슬은 기기 화소 정수 배. 칸이 많아 한 줄이면 작아질 때만 두 줄로 나눠 키운다. 단추 옆에 놓일 때는 두 줄이 단추 높이를 넘지 않게 한다
  function sizeBeads() {
    const row = $('endBeads'), n = row.children.length;
    if (!n) return;
    const ratio = window.devicePixelRatio || 1;
    const most = Math.max(1, Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dot')) * ratio / 2));
    const buttons = $('endAgain').parentElement;
    const stacked = matchMedia('(max-width:600px)').matches;
    let room = innerWidth * 0.96 - 44 - (stacked ? 0 : buttons.offsetWidth + 18);
    const side = $('endRecapRow').offsetWidth;
    if (side) { // 되짚기가 띠 왼쪽에 서면 구슬은 단추 옆이 아니라 단추 위 한 단을 쓴다(판 20 B1). 띠 테두리 · 안쪽 여백 · 칸 사이를 뺀 실제 폭
      const band = getComputedStyle(row.parentElement);
      room = innerWidth * 0.96 - side - parseFloat(band.columnGap) - ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((n, key) => n + parseFloat(band[key]), 0);
    }
    if((document.body.classList.contains('inFrame'))&&innerHeight<=420){
      const paper=getComputedStyle(row.parentElement);
      const edges=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((n,key)=>n+parseFloat(paper[key]),0);
      room=innerWidth-24-edges-parseFloat(paper.columnGap)-buttons.offsetWidth;
    }
    const fit = cols => Math.max(1, Math.min(most, Math.floor(((room / cols - 2) * ratio) / 12)));
    const half = Math.ceil(n / 2);
    const twoCap = stacked ? most : Math.floor(((buttons.offsetHeight - 2) * ratio) / 24);
    const one = fit(n), two = n > 20 ? Math.min(fit(half), twoCap) : 0;
    // 단추 옆에서 두 줄로도 작으면 세 줄이 단추 높이 안에 들 때 세 줄로 키운다(폰 가로 틀 안 자진뱃노래 43개: 단추 넷 옆 242px에 두 줄이면 8px, 세 줄이면 12px)
    const third = Math.ceil(n / 3), three = !stacked && !side && n > 30 ? Math.min(fit(third), Math.floor(((buttons.offsetHeight - 4) * ratio) / 36)) : 0;
    // 한 줄에 다 안 들어가면 저절로 꺾이게 두지 않고 반으로 나눠 두 줄을 고르게 한다
    const oneFits = n * ((one / ratio) * 12 + 2) <= room;
    let perRow = n > 20 && (two > one || !oneFits) ? half : n;
    if (three > Math.max(one, two)) perRow = third;
    const dot = Math.max(one, two, three) / ratio;
    // 반으로 나눈 줄도 칸에 안 들어가면(360 폭 자진뱃노래 43개: 21 · 21 · 1) 줄 수를 늘려 고르게 나눈다(곡별 검수 06 R1-07)
    const cap = Math.max(1, Math.floor((room + 2) / (dot * 12 + 2)));
    if (perRow > cap) perRow = Math.ceil(n / Math.ceil(n / cap));
    row.style.setProperty('--bead', `${dot * 12}px`);
    row.style.maxWidth = perRow < n ? `${perRow * (dot * 12 + 2)}px` : '';
  }

  window.MinyoScreens = {
    SEA,
    // 판이 내준 보상 네모를 피한다. 네모가 없으면 기존 쪽지를 그대로 둔다.
    placeEnd(avoid=[],gap=8) {
      const note=document.querySelector('.endTop');
      const corners=minyoFrameCorners(Math.max(0,12-gap));
      avoid=[...avoid,...corners];
      const ratio=window.devicePixelRatio||1;note.style.setProperty('--rewardSeal',48*Math.ceil(96*ratio/48)/ratio+'px');

      if(!avoid.length||$('endScreen').hidden){note.style.position=note.style.left=note.style.top=note.style.maxWidth='';return;}
      const band=document.querySelector('.endBottom').getBoundingClientRect(),blocks=band.height?[...avoid,band]:avoid; // 아래 띠(단추 · 노래 알기)는 쪽지가 덮지 않는다(판 20 B1, 1024 거문도). 띠는 겹침 판정에만 쓴다
      const wide=(document.body.classList.contains('inFrame'))?'calc(100vw - 272px)':'calc(100vw - 24px)';
      note.style.position='absolute';note.style.maxWidth=wide;
      if((document.body.classList.contains('wolSong'))&&innerHeight<=420){
        const x=Math.round(innerWidth*(324/780)),r=note.getBoundingClientRect();
        if(!avoid.some(a=>x<a.right+gap&&x+r.width>a.left-gap&&8<a.bottom+gap&&8+r.height>a.top-gap)){note.style.left=x+'px';note.style.top='8px';return;}
      }
      const framed=document.body.classList.contains('inFrame'),topEdge=(8);
      const leftEdge=(framed)?Math.max(innerHeight<=420?112:120,...corners.filter(r=>r.left<innerWidth/2).map(r=>r.right+gap)):8;
      const nearTop=avoid.filter(r=>r.top<topEdge+note.getBoundingClientRect().height+gap&&r.bottom>topEdge-gap);
      const leftRoom=Math.min(...nearTop.map(r=>r.left))-leftEdge-gap,rightRoom=innerWidth-Math.max(...nearTop.map(r=>r.right))-(framed?120:8)-gap;
      const squeeze=nearTop.length&&Math.max(leftRoom,rightRoom)>=220;
      if(squeeze)note.style.maxWidth=Math.max(leftRoom,rightRoom)+'px';
      const find=()=>{
        const box=note.getBoundingClientRect(),w=box.width,h=box.height;
        const clear=(x,y)=>x>=8&&y>=8&&x+w<=innerWidth-8&&y+h<=innerHeight-8&&!blocks.some(r=>x<r.right+gap&&x+w>r.left-gap&&y<r.bottom+gap&&y+h>r.top-gap);
        const candidates=[{x:leftEdge,y:topEdge},{x:innerWidth-w-8,y:topEdge},{x:Math.round((innerWidth-w)/2),y:topEdge}];
        for(let y=topEdge;y+h<=innerHeight-8;y+=8)for(let x=leftEdge;x+w<=innerWidth-8;x+=8)candidates.push({x,y});
        if(gap===12){const center=Math.round((innerWidth-w)/2),x=Math.min(center,...avoid.map(r=>r.left-gap-w));candidates.unshift({x:Math.max(leftEdge,x),y:topEdge});}
        return candidates.find(p=>clear(p.x,p.y));
      };
      let p=find();
      if(!p&&squeeze){note.style.maxWidth=wide;p=find();} // 좁힌 쪽지가 길어져 들 자리가 없으면 원래 폭으로 다시 찾는다(1024 거문도: 좁힌 쪽지가 띠까지 내려가 노래 알기를 덮었다)
      if(p){note.style.left=p.x+'px';note.style.top=p.y+'px';}
      else if(!note.dataset.moonCompact){note.dataset.moonCompact='1';note.classList.add('rewardNote');note.style.setProperty('--seal',note.style.getPropertyValue('--rewardSeal'));note.style.setProperty('--sealTop',note.style.getPropertyValue('--rewardSeal'));note.style.gap='12px';note.style.padding='0 4px';this.placeEnd(avoid,gap);}
      else{ // 줄인 쪽지도 사람 · 깃발까지 피할 자리가 없으면 띠 · 구석 단추만 피한다. 옛 자리에 남아 띠를 덮던 것(그래프 검수 R2-01, 거문도 1280×800)
        const hard=band.height?[...corners,band]:corners,box=note.getBoundingClientRect(),w=box.width,h=box.height;
        for(let y=topEdge;y+h<=innerHeight-8;y+=8)for(let x=leftEdge;x+w<=innerWidth-8;x+=8)if(!hard.some(r=>x<r.right+gap&&x+w>r.left-gap&&y<r.bottom+gap&&y+h>r.top-gap)){note.style.left=x+'px';note.style.top=y+'px';return;}
      }
    },
    init(h) { handlers = h; addEventListener('resize', () => { if (!$('mapScreen').hidden) { const fin = finaleNow; buildMap(); if (fin && !$('mapArt').querySelector('#finaleG')) { this.finale.restore(fin); return; } if (zoomNow) enterZoom(zoomNow.name, true); else placeMarks(); } if (!$('endScreen').hidden) sizeBeads(); }); },
    // 첫머리 이야기 ⑤ 지도(판 19, 14:24 추천대로): 제주에 다가간 채로 열고 팔도 전체로 천천히 물러난다(고장을 누를 때 다가가는 움직임을 거꾸로).
    // 작은 배(거문도 배를 줄인 그림)가 제주에서 바다 위로 지나가 전라 앞바다에 멈추고, 전라 고장은 아무 고장이나 누를 때까지 천천히 깜박인다
    mapStory() {
      const s = $('mapArt').querySelector('svg'); if (!s || zoomNow || !baseBox) return;
      storyMapClear();
      const [cx, cy] = CENTER['제주'], w = MAP_W * .36, h = MAP_H * .36, ms = RM ? 0 : 2800;
      s.setAttribute('viewBox', [Math.max(0, Math.min(MAP_W - w, cx - w / 2)), Math.max(0, Math.min(MAP_H - h, cy - h * .6)), w, h].join(' '));
      // 물러나는 동안은 전라 말고 지역 이름을 감춘다(확대 배율 그대로 커진 이름이 구석 단추 밑 · 화면 위끝에 걸림, 그래프 검수 4회차 R2-01)
      s.classList.add('storyZoom');
      moveCam(s, baseBox, ms, () => s.classList.remove('storyZoom'));
      for (const e of s.querySelectorAll('[data-region="전라"],[data-tag="전라"]')) e.classList.add('storyBlink');
      const bw = 84, bh = 29, from = [cx + 30, cy - 46], to = [cx - 70, cy - 150], t0 = performance.now();
      const boat = svg('image', { href: 'art/myeolchi/boat-small.png', class: 'storyBoat', width: bw, height: bh, x: from[0] - bw / 2, y: from[1] - bh, 'data-test': 'story-boat' }, s);
      const step = now => {
        if (!boat.isConnected) return;
        const k = ms ? Math.min(1, Math.max(0, (now - t0) / ms)) : 1, e = 1 - Math.pow(1 - k, 2), bob = k < 1 ? Math.sin(now / 160) * 2 : 0;
        boat.setAttribute('x', from[0] + (to[0] - from[0]) * e - bw / 2); boat.setAttribute('y', from[1] + (to[1] - from[1]) * e - bh + bob);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    // 끝 장면 「소리 지도 완성」(2026-11-22 대표 「추천대로 가자」): 지도 그리기만 맡는다. 차례 · 소리 · 말풍선 · 도장판은 finale.js
    // 2026-11-27 연출 새로(대표 「효과가 너무 별로」): 저녁빛은 곱하기 섞기로 색을 살리고, 고장 땅 전체가 등불빛으로 밝아지며, 소리 물결 두 겹 · 금빛 줄 · 큰 꼬마.
    // 카메라는 제주로 다가가지 않는다(오른쪽 빈 바다에 도장판을 둔다)
    finale: {
      begin() {
        const s = $('mapArt').querySelector('svg'); if (!s) return false;
        finaleNow = { lit: [], bright: null };
        storyMapClear(); cancelAnimationFrame(camAnim);
        if (zoomNow) { zoomNow = null; $('mapScreen').classList.remove('zones'); for (const id of ['zoneArt', 'zoneTags']) $(id)?.remove(); s.classList.remove('zoomed'); s.querySelector('.zoomImg')?.remove(); }
        selected = null; mark(null);
        $('songPanel').hidden = true; const more = document.querySelector('.songMore'); if (more) more.hidden = true;
        s.querySelector('#finaleG')?.remove();
        const g = svg('g', { id: 'finaleG', 'data-test': 'finale-map' }, s);
        const grad = svg('radialGradient', { id: 'finaleGlowFill' }, svg('defs', {}, g));
        for (const [o, c, a] of [[0, '#fff4cf', .95], [.35, '#ffd27a', .55], [1, '#ffc45c', 0]]) svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, grad);
        svg('rect', { class: 'finaleDim', x: -MAP_W, y: -MAP_H, width: MAP_W * 3, height: MAP_H * 3 }, g);
        for (const k of ['finaleLands', 'finaleLines', 'finaleLights', 'finaleKids']) svg('g', { class: k }, g);
        s.classList.add('finale');
        moveCam(s, baseBox, RM ? 0 : 700);
        requestAnimationFrame(() => s.classList.add('finaleDark'));
        return true;
      },
      // 고장 하나: 땅이 등불빛으로 밝아지고 소리 물결이 두 겹 퍼지며 그 고장 꼬마가 뛰어오른다. prev가 있으면 앞 고장 불에서 금빛 줄이 그어진다
      light(region, kid, prev) {
        const s = $('mapArt').querySelector('svg'), g = s && s.querySelector('#finaleG'); if (!g) return;
        if (finaleNow) finaleNow.lit.push([region, kid, prev]);
        const [x, y] = CENTER[region], land = window.MINYO_REGIONS.find(r => r.name === region);
        if (land) svg('path', { d: land.d, 'fill-rule': 'evenodd', class: 'finaleLand', 'data-region': region }, g.querySelector('.finaleLands'));
        if (prev && CENTER[prev]) {
          const [px, py] = CENTER[prev], len = Math.hypot(x - px, y - py);
          const line = svg('line', { x1: px, y1: py, x2: x, y2: y, class: 'finaleLine', 'stroke-dasharray': len, 'stroke-dashoffset': RM ? 0 : len }, g.querySelector('.finaleLines'));
          if (!RM) requestAnimationFrame(() => line.setAttribute('stroke-dashoffset', 0));
        }
        const lit = svg('g', { class: 'finaleLit', 'data-region': region, 'data-test': `finale-lit-${region}` }, g.querySelector('.finaleLights'));
        svg('circle', { cx: x, cy: y, r: 74, class: 'finaleGlow', fill: 'url(#finaleGlowFill)' }, lit);
        if (!RM) for (const d of [0, .38]) svg('circle', { cx: x, cy: y, r: 16, class: 'finaleRing' }, lit).style.animationDelay = d + 's';
        svg('circle', { cx: x, cy: y, r: 8, class: 'finaleCore' }, lit);
        for (const t of s.querySelectorAll(`.tag[data-tag="${region}"]`)) t.classList.add('finaleOn');
        if (kid) {
          const size = 112, im = svg('image', { href: kid, x: x - size / 2, y: y - size + 6, width: size, height: size, class: 'finaleKid', 'data-region': region }, g.querySelector('.finaleKids'));
          im.style.transformOrigin = `${x}px ${y + 4}px`;
        }
      },
      // 끝: 어둠을 걷고 아홉 꼬마가 함께 두 번 뛴다. 제주 꼬마 왼쪽에 앞소리꾼이 선다
      bright(lead) {
        const s = $('mapArt').querySelector('svg'), g = s && s.querySelector('#finaleG'); if (!g) return;
        if (finaleNow) finaleNow.bright = [lead];
        s.classList.remove('finaleDark'); s.classList.add('finaleBright');
        for (const im of g.querySelectorAll('.finaleKid')) im.classList.add('finaleKidEnd');
        const [cx, cy] = CENTER['제주'], size = 112, lx = cx - FINALE_LEAD_DX;
        g.querySelector('.finaleLead')?.remove();
        const im = svg('image', { href: lead, x: lx - size / 2, y: cy - size + 6, width: size, height: size, class: 'finaleLead' }, g.querySelector('.finaleKids'));
        im.style.transformOrigin = `${lx}px ${cy + 4}px`;
      },
      // 제주 바닷가 두 사람 머리 위(화면 좌표). 그림 위 20%가 빈 자리라 머리는 그 아래
      heads() {
        const s = $('mapArt').querySelector('svg'), m = s && s.getScreenCTM(); if (!m) return null;
        const [cx, cy] = CENTER['제주'], top = cy - 112 + 6 + 112 * .2, p = (x, y) => { const q = s.createSVGPoint(); q.x = x; q.y = y; const r = q.matrixTransform(m); return [r.x, r.y]; };
        return { lead: p(cx - FINALE_LEAD_DX, top), kid: p(cx, top) };
      },
      // 한반도 땅이 차지하는 화면 상자(도장판을 그 오른쪽 빈 바다에 둔다). 경상 동쪽 울릉도 · 독도(지도 x 788)까지 넣어 판이 섬을 덮지 않게
      landBox() {
        const s = $('mapArt').querySelector('svg'), m = s && s.getScreenCTM(); if (!m) return null;
        const p = (x, y) => { const q = s.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m); };
        const a = p(240, 40), b = p(800, 940);
        return { left: a.x, top: a.y, right: b.x, bottom: b.y };
      },
      // 지도를 다시 그린 뒤(높이 420px 경계) 켜 둔 불 · 꼬마 · 밝아진 모습을 그대로
      restore(st) {
        if (!this.begin()) return;
        const s = $('mapArt').querySelector('svg'); s.classList.add('finaleDark');
        for (const [r, k, p] of st.lit) this.light(r, k, p);
        if (st.bright) this.bright(...st.bright);
      },
      end(next) {
        finaleNow = null;
        if (next) saved = next; // 끝 장면을 본 저장으로 제목 도장 · 다시 보기 단추를 그린다
        const s = $('mapArt').querySelector('svg');
        if (s) { s.querySelector('#finaleG')?.remove(); s.classList.remove('finale', 'finaleDark', 'finaleBright'); for (const t of s.querySelectorAll('.tag.finaleOn')) t.classList.remove('finaleOn'); moveCam(s, baseBox, RM ? 0 : 600); }
        select(null, true);
      },
    },
    showMap(save, region) {
      saved = save;
      // 앞서 지도를 본 뒤 새로 열린 도 · 곡: 알림 한 줄, 도는 테가 빛나고 목록 제목에 「열림」
      const nowRegions = new Set(R().REGION_ORDER.filter(regionOpenNow)), nowSongs = new Set(openSongs().map(s => s.id));
      fresh = { regions: new Set(), songs: [] };
      if (seen && locking()) {
        fresh.regions = new Set([...nowRegions].filter(r => !seen.regions.has(r)));
        fresh.songs = openSongs().filter(s => !seen.songs.has(s.id) && !fresh.regions.has(s.region));
      }
      seen = { regions: nowRegions, songs: nowSongs };
      showOnly('mapScreen'); built = null; zoomNow = null; $('mapScreen').classList.remove('zones'); buildMap();
      for (const r of fresh.regions) $('mapArt').querySelector(`path.reg[data-region="${r}"]`)?.classList.add('fresh');
      select(fresh.regions.size || fresh.songs.length ? null : region || null, true);
      const said = [...[...fresh.regions].map(r => window.MINYO.REGIONS[r].full), ...fresh.songs.map(s => s.title)];
      if (said.length) mapNote(said.slice(0, -1).map(w => jo(w, '과', '와') + ' ').join('') + jo(said.at(-1), '이', '가') + ' 열렸어요');
    },
    showStart(song, practiced, hardOpen) {
      showOnly('startScreen');
      $('startScreen').classList.remove('feastStart');
      const region = window.MINYO.REGIONS[song.region];
      $('startPlace').textContent = `${region.full} ${song.work}`;
      $('startTitle').textContent = `‘${song.title}’`;
      $('startAbout').textContent = song.about; $('startAbout').parentElement.classList.remove('alert');
      $('startAbout').parentElement.classList.toggle('workTitle',!!(song.net||song.boat));
      $('startWork').textContent = song.startWork || (song.net ? '그물 당기는 일노래' : song.boat ? '노 젓는 일노래' : '');
      $('startPractice').hidden = !practiced;
      $('startModes').hidden = !hardOpen;
      if (song.hardLabel) $('modeHard').textContent = `어려움 ${song.hardLabel}`; // 쾌지나 장구 장단, 자진뱃노래 장단 큰박
      $('startCredit').textContent = song.credit || ''; $('startCredit').hidden = !song.credit;
    },
    // 잔치 시작 창: 첫 마을 장면 위에 잔치 글. 연습 · 어려움은 없다. 소리 출처는 마을마다 띠에 적는다
    showFeastStart(F) {
      $('startScreen').classList.add('feastStart');
      $('startPlace').textContent = '팔도 민요';
      $('startTitle').textContent = `‘${F.title}’`;
      $('startAbout').textContent = '메길 땐 꾹 누르고 첫 구슬에 떼요\n받는 소리에 맞춰 톡톡 쳐요'; $('startAbout').parentElement.classList.remove('alert');
      $('startWork').textContent = '메길 땐 꾹 눌러요\n첫 구슬에 떼고 톡톡';
      $('startPractice').hidden = true; $('startModes').hidden = true;
      $('startCredit').textContent = '소리 출처는 마을마다 위 띠에 나와요'; $('startCredit').hidden = false;
    },
    setMode(on) { $('modeEasy').classList.toggle('on', !on); $('modeHard').classList.toggle('on', on); },
    startNote(text) { $('startAbout').textContent = text; $('startAbout').parentElement.classList.add('alert'); },
    startBusy(on) {
      const b = $('startGo');
      if (on) { if (!b.dataset.label) b.dataset.label = b.textContent; b.textContent = '불러오는 중'; b.disabled = true; }
      else if (b.dataset.label) { b.textContent = b.dataset.label; b.disabled = false; }
    },
    hide() { showOnly(null); },
    showCalib(done, total) {
      showOnly('calibScreen');
      const row = $('calibDots');
      if (row.children.length !== total) { row.textContent = ''; for (let i = 0; i < total; i++) el('i', '', undefined, row); }
      [...row.children].forEach((d, i) => d.classList.toggle('on', i < done));
    },
    // 끝 화면: 장면은 그대로 두고, 구슬이 하나씩 찬 뒤 도장이 찍힌다. 단추는 처음부터 누를 수 있다
    showEnd(song, res, stamp, beads, info) {
      showOnly('endScreen');
      const endNote=document.querySelector('.endTop');if(endNote.dataset.moonCompact){delete endNote.dataset.moonCompact;for(const key of ['--seal','--sealTop','gap','padding'])endNote.style.removeProperty(key);}
      if(song.ringArt==='wolwol'){const css=getComputedStyle(document.documentElement),ratio=window.devicePixelRatio||1,min=48*Math.ceil(96*ratio/48)/ratio;endNote.dataset.wolSeal='1';for(const key of ['--seal','--sealTop'])endNote.style.setProperty(key,Math.max(min,parseFloat(css.getPropertyValue(key)))+'px');}
      else if(endNote.dataset.wolSeal){delete endNote.dataset.wolSeal;endNote.style.removeProperty('--seal');endNote.style.removeProperty('--sealTop');}
      this.placeEnd();
      document.querySelector('.endTop').classList.toggle('rewardNote',!!song.boat||song.ringArt==='wolwol');
      $('endSay').textContent = info.say;
      $('endStamp').textContent = info.hardOk ? song.hardStamp : info.top ? song.topStamp : info.perfect ? song.fullStamp || '풍년' : (song.stamps || window.MinyoRules.STAMPS)[stamp];
      $('endSeal').hidden = true;
      $('endSeal').classList.toggle('gold', !!info.perfect || !!info.hardOk);
      $('endSeal').classList.toggle('top', !!info.top);
      // 월월이: 하나도 못 맞히면 「달집에 불이 안 붙었네」 옆에 불 붙은 이름(불씨)을 두지 않는다. 도장 조건 · 쪽지 크기는 그대로(곡별 검수 05 R1-06)
      // 운재도 0곳이면 「통나무가 꿈쩍도 안 하네」 옆에 붉은 「한 뼘」이 섰다. 같은 꼴로 비운다(곡별 검수 08 R1-07)
      $('endSeal').classList.toggle('empty', (song.ringArt === 'wolwol' || song.id === 'unjae') && res.hits === 0);
      const seal=window.MinyoRules.sealFor(song,stamp,info);$('endSealImg').src = song.sealFiles?.[seal] || `art/${song.sealDir || 'onghe'}/seal-${seal}.png`;
      $('endCount').textContent = song.topStamp ? (info.hardRun ? `${song.hardLabel} ` : '') : `받는 자리 ${res.n}곳 중 ${res.hits}곳 맞힘`;
      if (song.topStamp) { // 좁으면 쉼표 뒤에서만 줄을 바꾼다
        const part = text => { const el = document.createElement('span'); el.style.whiteSpace = 'nowrap'; el.textContent = text; return el; };
        $('endCount').append(part(`${res.n}곳 중 ${res.hits}곳 맞힘,`), ' ', part(`딱 맞음 ${res.perfect}곳`));
      }
      const note = info.up === '어려움 판이 열렸어요' ? info.up : info.next || info.up;
      $('endNext').textContent = note;
      $('endNext').hidden = !note;
      $('endTip').textContent = info.tip;
      $('endTip').hidden = !info.tip;
      $('endTip').classList.toggle('warn', !!info.saveFail);
      // 고장 · 하는 일 되짚기와 노래 알기 단추. 잔치(곡이 아님)에는 없다
      const recap = $('endRecap'); recap.replaceChildren(); $('endRecapRow').hidden = !song.recap;
      if (song.recap) { const where = document.createElement('b'), work = document.createElement('span'); where.textContent = song.recap[0]; work.textContent = song.recap[1]; recap.append(where, ' ', work); }
      $('endOn').hidden = !info.onSong;
      $('endOnName').textContent = info.onSong ? info.onSong.title : '';
      if (info.onSong) $('endOn').setAttribute('aria-label', `다음 곡 ${info.onSong.title}`);
      $('endCalib').hidden = !info.calib;
      $('endHard').hidden = !info.hardOpen;
      const row = $('endBeads'); row.textContent = '';
      const items = beads.map(() => el('i', '', undefined, row));
      sizeBeads();
      const step = Math.min(55, 1100 / Math.max(1, beads.length));
      beads.forEach((b, i) => timers.push(setTimeout(() => { if (b) items[i].classList.add('on'); if (b === 2) items[i].classList.add('best'); items[i].classList.add('shown'); handlers.onBead(i, b); }, 200 + i * step)));
      timers.push(setTimeout(() => { $('endSeal').hidden = false; if(window.parent!==window)this.placeEnd(); handlers.onSeal(stamp); }, 320 + beads.length * step));
    },
  };
})();
