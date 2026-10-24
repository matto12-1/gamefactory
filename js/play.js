import { connectGame } from './frame.js?v=1179d5aa40';
import { startRun, getRank } from './ledger.js?v=1179d5aa40';
import { getNametag, getStamps, addStamp, getPrefs, setPrefs, addRecent } from './store.js?v=1179d5aa40';
import { START_TIMEOUT_MS } from './config.js?v=1179d5aa40';
import { showResult } from './result.js?v=1179d5aa40';
import { requireEntry, readData, el, button, link, modal, pageError, backTarget } from './ui.js?v=1179d5aa40';
const S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  play: '<path fill="currentColor" d="M7.2 5.3c0-1.2 1.3-1.9 2.3-1.3l10 6.6c.9.6.9 2 0 2.6l-10 6.6c-1 .7-2.3 0-2.3-1.2z"/>',
  restart: `<path ${S} stroke-width="2.8" d="M19.6 13.2a7.8 7.8 0 1 1-2.2-6.8"/><path ${S} stroke-width="2.8" d="M19.8 3.8v4.9h-4.9"/>`,
  door: `<path ${S} stroke-width="2.6" d="M12.5 4H7a1.6 1.6 0 0 0-1.6 1.6v12.8A1.6 1.6 0 0 0 7 20h5.5"/><path ${S} stroke-width="2.6" d="M10.5 12h10M17 8.3l3.6 3.7-3.6 3.7"/>`,
  sound: `<path fill="currentColor" d="M3.6 9.4c0-.6.4-1 1-1h2.8l4.3-3.6c.7-.6 1.7-.1 1.7.8v12.8c0 .9-1 1.4-1.7.8l-4.3-3.6H4.6c-.6 0-1-.4-1-1z"/><path ${S} stroke-width="2.3" d="M16.2 9.2a4 4 0 0 1 0 5.6M18.8 6.6a7.7 7.7 0 0 1 0 10.8"/>`,
  star: '<path fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M12 2.9l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1.1-6-4.4-4.2 6-.9z"/>',
  heart: '<path fill="currentColor" d="M12 20.6c-.3 0-.6-.1-.8-.3C8.5 18.4 3.4 14.6 3.4 9.6c0-2.7 2-4.9 4.6-4.9 1.7 0 3.1.9 4 2.2.9-1.3 2.3-2.2 4-2.2 2.6 0 4.6 2.2 4.6 4.9 0 5-5.1 8.8-7.8 10.7-.2.2-.5.3-.8.3z"/>',
  clock: `<circle ${S} stroke-width="2.5" cx="12" cy="13.6" r="7.3"/><path ${S} stroke-width="2.5" d="M12 13.6V9.7M9.6 2.9h4.8M18.6 6.8l1.4-1.4"/>`,
  flag: `<path ${S} stroke-width="2.5" d="M6 21V3.8"/><path fill="currentColor" d="M6.8 4h11.6c.6 0 1 .7.6 1.2L16.6 8.6l2.4 3.4c.4.5 0 1.2-.6 1.2H6.8z"/>`,
  bolt: '<path fill="currentColor" d="M13.7 2.4c.5-.6 1.4-.1 1.2.6l-1.6 6.6h5.2c.7 0 1.1.8.6 1.3L9.9 21.4c-.5.6-1.4.1-1.2-.6l1.6-6.6H5.1c-.7 0-1.1-.8-.6-1.3z"/>',
  ok: `<circle ${S} stroke-width="2.4" cx="12" cy="12" r="8.6"/><path ${S} stroke-width="2.6" d="M8 12.3l2.8 2.8 5.4-5.6"/>`,
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
if (requireEntry()) init().catch(pageError);
async function init() {
  const params = new URLSearchParams(location.search), { games } = await readData('data/games.json');
  const game = games.find(g => g.id === params.get('g'));
  const main = document.querySelector('main');
  if (!game) { main.append(el('p', '게임을 찾을 수 없어요', { 'data-test': 'missing' }), link('홈으로', 'home.html', 'home')); return; }
  addRecent(game.id);
  const mode = game.modes.includes(params.get('m')) ? params.get('m') : game.modes[0];
  let sfx = getPrefs().sfx, ready = false, goalSent = false, goalReply;
  const goalRequest = mode === 'solo' && game.ranking.enabled ? getRank({ game: game.id, period: 'day', limit: 1 }) : null;
  const query = new URLSearchParams({ m: mode, g: game.id });
  const name = getNametag();
  const remembered = game.modeKit ? window.GFModes.store(() => localStorage, game.id).last() : null;
  const grade = params.get('grade') ?? (remembered ? String(remembered.grade) : name ? String(name.grade) : null);
  if (grade) query.set('grade', grade);
  query.set('sound', sfx ? '1' : '0');
  for (const key of ['seed', 'sim', 'play', 'stage', 'resume']) if (params.has(key)) query.set(key, params.get(key));
  if (game.family === 'survivor' && params.get('map') === '1') query.set('map', '1');
  if (params.has('bot') && ['127.0.0.1', 'localhost'].includes(location.hostname)) query.set('bot', params.get('bot'));
  query.set('v', game.v);
  const iframe = el('iframe', null, { class: 'game-frame', title: game.title, 'data-test': 'game' });
  let run = { ok: false, error: 'offline' }, sequence = 0, finished = false, adventureReady = false, noticeTimer;
  const freshStamps = [], seen = new Set(Object.keys(getStamps()[game.id] ?? {}));
  const notice = el('p', '', { role: 'status', 'data-test': 'stamp-notice', class: 'notice', hidden: '' });
  async function begin({play='quick',stage}={}) {
    const current = ++sequence; run = { ok: false, error: 'offline' };
    if (mode === 'solo' && game.ranking.enabled) {
      goalSent=false; goalReply=undefined;
      getRank({game:game.id,play,period:'day',limit:1}).then(reply=>{if(current===sequence&&!finished){goalReply=reply;sendGoal();}});
    }
    let timer;
    try {
      const reply = await Promise.race([startRun(game.id, mode, play, stage), new Promise(resolve => { timer = setTimeout(() => resolve({ ok: false, error: 'offline' }), START_TIMEOUT_MS); })]);
      if (current === sequence && !finished) run = reply;
    } finally { clearTimeout(timer); }
  }
  const leave = () => { bridge.destroy(); clearTimeout(noticeTimer); location.href = backTarget(); };
  const bridge = connectGame(iframe, game, {
    mode,
    onReady() {
      ready = true; bridge.sound(sfx); sendGoal();
      // 다시 하기·다음 칸으로 새로 열리면 게임이 바로 시작되는데 키 입력은 바깥 쪽에 남아 있었다.
      if (!document.querySelector('dialog[open]')) iframe.contentWindow?.focus();
      // 검수실(review=1)은 판이 아니라 판 시작을 기록하지 않는다.
      if (game.kind === 'adventure' && !adventureReady && params.get('review') !== '1') { adventureReady = true; begin(); }
    },
    onStart: begin,
    onFinish({ score }) {
      if (finished) return; finished = true; bridge.pause(); exit.disabled = true;
      const ui=iframe.contentWindow?.__GAME?.resultUI?.();
      const replay = () => {bridge.destroy();const url=new URL(location.href),g=iframe.contentWindow?.__GAME,next=g?.nextStage;url.searchParams.delete('map');url.searchParams.delete('resume');if(g?.nextPlay==='endless'){url.searchParams.set('play','endless');url.searchParams.delete('stage');}else if(next){url.searchParams.set('play','stage');url.searchParams.set('stage',next);if(g?.resume)url.searchParams.set('resume','1');}else{url.searchParams.delete('stage');url.searchParams.delete('play');}location.href=url.href;};
      showResult({ game, mode, score, ui, token: run.ok ? run.token : null, stamps: freshStamps, onReplay: replay, onExit: leave,
        onMap: game.family === 'survivor' ? () => { bridge.destroy(); const url=new URL(location.href);url.searchParams.set('map','1');url.searchParams.delete('stage');location.href=url.href; } : undefined,
        onPractice: done => { bridge.resume();iframe.contentWindow.__GAME.practiceUI(()=>{bridge.pause();done();}); }
      }).then(()=>{if(iframe.contentWindow?.__GAME?.replayRequested)replay();});
    },
    onStamp(id) {
      if (finished || seen.has(id)) return;
      seen.add(id); addStamp(game.id, id);
      const stamp = game.stamps.find(s => s.id === id); freshStamps.push(stamp);
      notice.textContent = `★ 도장을 받았어요: ${stamp.name}`; notice.hidden = false;
      clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2000);
    },
    onExit: leave,
    onMenu: () => { if (pauseable()) openPause(); },
  });
  function sendGoal() {
    if (ready && goalReply?.ok && !goalSent) { goalSent = true; bridge.goal(goalReply.rows[0]?.score ?? null); }
  }
  goalRequest?.then(reply => { if (sequence === 0) { goalReply = reply; sendGoal(); } });
  const gameApi = () => { try { return iframe.contentWindow?.__GAME ?? null; } catch { return null; } };
  const pauseable = () => !finished && !document.querySelector('dialog[open]') && [undefined, 'play', 'count'].includes(document.body.dataset.uiState);
  const reopen = (info, restart) => {
    bridge.destroy(); clearTimeout(noticeTimer);
    const url = new URL(location.href);
    for (const key of ['play', 'stage', 'start', 'resume', 'map']) url.searchParams.delete(key);
    if (restart && info) {
      if (info.play) url.searchParams.set('play', info.play);
      if (info.stage) url.searchParams.set('stage', String(info.stage));
      if (info.grade) url.searchParams.set('grade', String(info.grade));
      url.searchParams.set('start', '1');
    }
    location.href = url.href;
  };
  const roundButton = (name, label, test, action) => {
    const b = button('', test, action); b.className = 'pause-round';
    b.innerHTML = `<span class="pause-disc">${icon(name)}</span><span class="pause-lab">${label}</span>`;
    return b;
  };
  const board = stats => {
    const node = el('div', null, { class: 'pause-board', 'data-test': 'pause-board' });
    for (const stat of stats) {
      const item = el('div', null, { class: 'pause-stat' });
      if (stat.hearts) {
        const hearts = el('span', null, { class: 'pause-ic pause-hearts', role: 'img', 'aria-label': `하트 ${stat.hearts.on}개 남음` });
        for (let i = 0; i < stat.hearts.total; i++) { const h = el('span', null, { class: `pause-heart ${i < stat.hearts.on ? 'on' : 'off'}` }); h.innerHTML = icon('heart'); hearts.append(h); }
        item.append(hearts);
      } else {
        const mark = el('span', null, { class: 'pause-ic' }); mark.innerHTML = icon(stat.icon);
        item.append(mark, el('b', stat.value));
        if (stat.mult) item.append(el('span', stat.mult, { class: 'pause-x' }));
      }
      item.append(el('small', stat.label)); node.append(item);
    }
    return node;
  };
  function openPause() {
    if (finished || document.querySelector('dialog[open]')) return;
    let info = null; try { info = gameApi()?.pauseUI?.() ?? null; } catch { info = null; }
    if (info?.menu) { leave(); return; }
    bridge.pause();
    const dialog = modal('exit-confirm', '일시 정지'); dialog.className = 'gf-pause';
    dialog.querySelector('h2').className = 'pause-title';
    if (info?.stats?.length) dialog.prepend(board(info.stats));
    dialog.append(el('p', info?.line ? `${game.title} · ${info.line}` : game.title, { class: 'pause-tag' }));
    let done = false;
    const resume = () => { if (done) return; done = true; dialog.close(); dialog.remove(); bridge.resume(); iframe.contentWindow?.focus(); };
    const row = el('div', null, { class: 'pause-row' }), left = el('div', null, { class: 'pause-side' }), right = el('div', null, { class: 'pause-side' });
    left.append(roundButton('restart', '처음부터', 'restart', () => reopen(info, true)),
      roundButton('door', '그만하기', 'quit', () => game.modeKit && info ? reopen(info, false) : leave()));
    const go = button('', 'resume', resume); go.className = 'pause-go';
    go.innerHTML = `<span class="pause-disc">${icon('play')}</span><span class="pause-lab">계속하기<kbd class="pause-kbd">Esc</kbd></span>`;
    const toggle = roundButton('sound', '', 'pause-sound', () => { sfx = !sfx; setPrefs({ sfx }); updateSound(); bridge.sound(sfx); paint(); });
    const paint = () => { toggle.querySelector('.pause-lab').textContent = `소리 ${sfx ? '켜짐' : '꺼짐'}`; toggle.setAttribute('aria-pressed', String(sfx)); };
    paint();
    right.append(el('div', null, { class: 'pause-music-slot', 'data-music-slot': '' }), toggle);
    row.append(left, go, right); dialog.append(row);
    if (info?.cheer) dialog.append(el('img', null, { class: 'pause-mascot', src: info.cheer, alt: '' }));
    dialog.addEventListener('cancel', e => { e.preventDefault(); resume(); });
    dialog.addEventListener('close', resume);
    dialog.showModal(); go.focus();
  }
  const exit = button('✕ 그만하기', 'exit-x', openPause);
  const corner = game.exitButton || 'top-left';
  exit.className = `exit-button ${corner}`;
  // Nothing is in progress on the mode screen or the stage map, so the X there just leaves.
  const paintExit = () => { const leaving = document.body.dataset.uiState === 'title', label = leaving ? '나가기' : '그만하기'; exit.textContent = `✕ ${label}`; exit.setAttribute('aria-label', label); };
  new MutationObserver(paintExit).observe(document.body, { attributes: true, attributeFilter: ['data-ui-state'] });
  paintExit();
  const sound = button('', 'sound', () => { sfx = !sfx; setPrefs({ sfx }); updateSound(); bridge.sound(sfx); });
  sound.className = `sound-button ${corner.replace(/left|right/, side => side === 'left' ? 'right' : 'left')}`;
  function updateSound() { sound.textContent = `소리 ${sfx ? '켬' : '끔'}`; sound.setAttribute('aria-pressed', String(sfx)); }
  updateSound(); notice.classList.add(corner.startsWith('bottom') ? 'band-bottom' : 'band-top');
  main.append(iframe, exit, sound, notice);
  iframe.src = `games/${encodeURIComponent(game.id)}/${game.entry}?${query}`;
  window.addEventListener('pagehide', () => { bridge.destroy(); clearTimeout(noticeTimer); }, { once: true });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.repeat && pauseable()) { e.preventDefault(); openPause(); } });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && pauseable()) openPause(); });
}
