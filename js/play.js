import { connectGame } from './frame.js?v=399a5c8957';
import { startRun, getRank } from './ledger.js?v=399a5c8957';
import { getNametag, getStamps, addStamp, getPrefs, setPrefs } from './store.js?v=399a5c8957';
import { START_TIMEOUT_MS } from './config.js?v=399a5c8957';
import { showResult } from './result.js?v=399a5c8957';
import { requireEntry, readData, el, button, link, modal, pageError } from './ui.js?v=399a5c8957';
if (requireEntry()) init().catch(pageError);
async function init() {
  const params = new URLSearchParams(location.search), { games } = await readData('data/games.json');
  const game = games.find(g => g.id === params.get('g'));
  const main = document.querySelector('main');
  if (!game) { main.append(el('p', '게임을 찾을 수 없어요', { 'data-test': 'missing' }), link('대문으로', 'home.html', 'home')); return; }
  const mode = game.modes.includes(params.get('m')) ? params.get('m') : game.modes[0];
  let sfx = getPrefs().sfx, ready = false, goalSent = false, goalReply;
  const goalRequest = mode === 'solo' && game.ranking.enabled ? getRank({ game: game.id, period: 'day', limit: 1 }) : null;
  const query = new URLSearchParams({ m: mode, g: game.id });
  const name = getNametag();
  const grade = params.get('grade') ?? (name ? String(name.grade) : null);
  if (grade) query.set('grade', grade);
  query.set('sound', sfx ? '1' : '0');
  for (const key of ['seed', 'sim']) if (params.has(key)) query.set(key, params.get(key));
  if (params.has('bot') && ['127.0.0.1', 'localhost'].includes(location.hostname)) query.set('bot', params.get('bot'));
  query.set('v', game.v);
  const iframe = el('iframe', null, { class: 'game-frame', title: game.title, 'data-test': 'game' });
  let run = { ok: false, error: 'offline' }, sequence = 0, finished = false, adventureReady = false, noticeTimer;
  const freshStamps = [], seen = new Set(Object.keys(getStamps()[game.id] ?? {}));
  const notice = el('p', '', { role: 'status', 'data-test': 'stamp-notice', class: 'notice', hidden: '' });
  async function begin() {
    const current = ++sequence; run = { ok: false, error: 'offline' };
    let timer;
    try {
      const reply = await Promise.race([startRun(game.id, mode), new Promise(resolve => { timer = setTimeout(() => resolve({ ok: false, error: 'offline' }), START_TIMEOUT_MS); })]);
      if (current === sequence && !finished) run = reply;
    } finally { clearTimeout(timer); }
  }
  const leave = () => { bridge.destroy(); clearTimeout(noticeTimer); location.href = 'home.html'; };
  const bridge = connectGame(iframe, game, {
    mode,
    onReady() {
      ready = true; bridge.sound(sfx); sendGoal();
      if (game.kind === 'adventure' && !adventureReady) { adventureReady = true; begin(); }
    },
    onStart: begin,
    onFinish({ score }) {
      if (finished) return; finished = true; bridge.pause(); exit.disabled = true;
      showResult({ game, mode, score, token: run.ok ? run.token : null, stamps: freshStamps, onReplay: () => { bridge.destroy(); location.reload(); }, onExit: leave });
    },
    onStamp(id) {
      if (finished || seen.has(id)) return;
      seen.add(id); addStamp(game.id, id);
      const stamp = game.stamps.find(s => s.id === id); freshStamps.push(stamp);
      notice.textContent = `★ 도장을 받았어요: ${stamp.name}`; notice.hidden = false;
      clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2000);
    },
    onExit: leave,
  });
  function sendGoal() {
    if (ready && goalReply?.ok && !goalSent) { goalSent = true; bridge.goal(goalReply.rows[0]?.score ?? null); }
  }
  goalRequest?.then(reply => { goalReply = reply; sendGoal(); });
  const exit = button('✕ 그만하기', 'exit-x', () => {
    bridge.pause(); const dialog = modal('exit-confirm', '그만할까요?');
    const resume = () => { dialog.close(); dialog.remove(); bridge.resume(); };
    dialog.className = 'exit-confirm';
    const continueButton = button('계속하기', 'resume', resume); continueButton.className = 'gf-button gf-primary';
    dialog.append(continueButton, button('그만하기', 'quit', leave));
    dialog.addEventListener('cancel', e => { e.preventDefault(); resume(); }); dialog.showModal();
  });
  const corner = game.exitButton || 'top-left';
  exit.className = `exit-button ${corner}`; exit.setAttribute('aria-label', '그만하기');
  const sound = button('', 'sound', () => { sfx = !sfx; setPrefs({ sfx }); updateSound(); bridge.sound(sfx); });
  sound.className = `sound-button ${corner.replace(/left|right/, side => side === 'left' ? 'right' : 'left')}`;
  function updateSound() { sound.textContent = `소리 ${sfx ? '켬' : '끔'}`; sound.setAttribute('aria-pressed', String(sfx)); }
  updateSound(); notice.classList.add(corner.startsWith('bottom') ? 'band-bottom' : 'band-top');
  main.append(iframe, exit, sound, notice);
  iframe.src = `games/${encodeURIComponent(game.id)}/${game.entry}?${query}`;
  window.addEventListener('pagehide', () => { bridge.destroy(); clearTimeout(noticeTimer); }, { once: true });
}
