import { saveTag } from './ledger.js?v=4c5e743d5d';
import { getPrefs } from './store.js?v=4c5e743d5d';
import { assetUrl } from './config.js?v=4c5e743d5d';
import { el, button } from './ui.js?v=4c5e743d5d';
import { initialsCell } from './wall.js?v=4c5e743d5d';
import { applyTheme } from './theme.js?v=4c5e743d5d';

const sheet = el('link', null, { rel: 'stylesheet', href: new URL('../css/initials.css', import.meta.url).href });
const colors = el('link', null, { rel:'stylesheet', href:new URL('../css/theme.css', import.meta.url).href });
for (const link of [colors, sheet]) link.href += new URL(import.meta.url).search;
document.head.append(colors);
document.head.append(sheet);
const PLAYS = { quick: '빠른 판', endless: '무한 모드', stage: '단계 지도' };

// 이번 점수의 확인 번호가 있을 때만 부른다. 새 줄 또는 넘어가기(null)를 돌려준다.
export function askInitials({ game, play, key, rows, mine, signal }) {
  if (!key || signal?.aborted) return Promise.resolve(null);
  applyTheme();
  return new Promise(resolve => {
    const previous = document.activeElement;
    const dialog = el('dialog', null, { class: 'initials-panel', 'data-test': 'initials', 'aria-labelledby': 'initials-title', 'aria-describedby': 'initials-hint' });
    const entry = el('section', null, { class: 'initials-entry' }), board = el('section', null, { class: 'initials-board', 'aria-label': '순위 미리 보기' });
    const top = el('div', null, { class: 'initials-top' }), clock = el('b', '20', { class: 'px', 'data-test': 'initials-time' });
    const timer = el('span', '남은 시간 ', { class: 'initials-timer' }); timer.append(clock);
    top.append(el('span', '새 기록!', { class: 'initials-badge px' }), el('span', `${game.title} · ${PLAYS[play] ?? ''}`, { class: 'initials-game' }), timer);
    const title = el('h2', '순위에 들었어요. 이니셜 세 글자를 새겨요.', { id: 'initials-title' });
    const hint = el('p', '영어 대문자 세 글자예요. 진짜 이름 말고 별명 글자도 좋아요.', { id: 'initials-hint', class: 'initials-hint' });
    const slots = el('div', null, { class: 'initials-slots' }), letters = ['A', 'A', 'A'], chars = [], boxes = [];
    let active = 0, changed = false, busy = false, ended = false, deadline = Date.now() + 20000, interval, closing;
    const error = el('p', '', { class: 'initials-error', 'data-test': 'initials-error', role: 'alert' });
    const list = el('ol', null, { class: 'initials-lines' });
    let mineLetters;
    for (let i = 0; i < 5; i++) {
      const row = rows[i], own = row && row.score === mine.score && row.at === mine.at;
      const line = el('li', null, { class: own ? 'me' : row ? '' : 'empty' });
      const tag = initialsCell(own ? 'AAA' : row?.tag);
      line.append(el('span', String(row?.rank ?? i + 1), { class: `px r r${row?.rank ?? i + 1}` }), tag, el('em', row ? Number(row.score).toLocaleString('ko-KR') : '', { class: 'px' }));
      if (own) mineLetters = tag; list.append(line);
    }
    function paint() { chars.forEach((c, i) => { c.textContent = letters[i]; boxes[i].classList.toggle('on', i === active); c.setAttribute('aria-pressed', String(i === active)); }); if (mineLetters) mineLetters.textContent = letters.join(''); }
    function choose(index, focus = true) { active = (index + 3) % 3; paint(); if (focus) chars[active].focus(); }
    function change(index, delta) { if (busy) return; letters[index] = String.fromCharCode(65 + (letters[index].charCodeAt(0) - 65 + delta + 26) % 26); changed = true; choose(index); }
    for (let i = 0; i < 3; i++) {
      const box = el('div', null, { class: 'initials-slot' }); boxes.push(box);
      const up = button('▲', `initials-up-${i}`, () => change(i, 1)), down = button('▼', `initials-down-${i}`, () => change(i, -1));
      up.setAttribute('aria-label', `${i + 1}번째 글자 올리기`); down.setAttribute('aria-label', `${i + 1}번째 글자 내리기`);
      const char = button('A', `initials-char-${i}`, () => choose(i)); char.className = 'ch px'; char.setAttribute('aria-label', `${i + 1}번째 글자`); chars.push(char);
      char.addEventListener('focus', () => { active = i; paint(); }); box.append(up, char, down); slots.append(box);
    }
    const keys = el('div', null, { class: 'initials-keys', 'aria-label': '글자판' });
    function type(char) { if (busy) return; changed ||= letters[active] !== char; letters[active] = char; choose(active + 1); }
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { const key = button(char, `initials-key-${char}`, () => type(char)); key.className = 'px'; keys.append(key); }
    const del = button('←', 'initials-back', () => choose(active - 1)); del.setAttribute('aria-label', '앞 칸으로'); keys.append(del);
    const actions = el('div', null, { class: 'initials-actions' });
    const save = button('새기기', 'initials-save', submit), skip = button('새기지 않고 넘어가기', 'initials-skip', () => { if (!busy) finish(null); }); actions.append(save, skip);
    entry.append(top, title, slots, keys, error, actions, hint);
    if (game.cover) board.append(el('img', null, { class: 'initials-cover', src: assetUrl(game.cover), alt: '' }));
    board.append(el('h3', '순위 1~5등', { class: 'px' }), list);
    dialog.append(board, entry); document.body.append(dialog);
    function finish(value) {
      if (ended) return; ended = true; clearInterval(interval); clearTimeout(closing); dialog.close(); dialog.remove();
      signal?.removeEventListener('abort', abort);
      if (previous?.isConnected) previous.focus(); resolve(value);
    }
    const abort = () => finish(null);
    signal?.addEventListener('abort', abort, { once: true });
    async function submit() {
      if (busy || ended) return;
      if (!dialog.isConnected || signal?.aborted) { finish(null); return; }
      busy = true; error.textContent = ''; clearInterval(interval);
      for (const b of dialog.querySelectorAll('button')) b.disabled = true;
      const reply = await saveTag({ key, tag: letters.join('') }); if (ended) return;
      if (reply.ok) {
        dialog.classList.add('saved'); sound(); closing = setTimeout(() => finish(reply.rows), 900); return;
      }
      if (reply.error === 'bad_tag') {
        busy = false; for (const b of dialog.querySelectorAll('button')) b.disabled = false;
        error.textContent = '다른 글자로 골라 주세요'; deadline = Math.max(deadline, Date.now() + 8000); tick(); interval = setInterval(tick, 1000); chars[active].focus(); return;
      }
      error.textContent = reply.error === 'offline' ? '지금은 새길 수 없어요' : '이니셜을 새기지 못했어요'; closing = setTimeout(() => finish(null), 1500);
    }
    function tick() {
      if (!dialog.isConnected || signal?.aborted) { finish(null); return; }
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); clock.textContent = String(left);
      if (left === 0) { clearInterval(interval); if (changed) submit(); else finish(null); }
    }
    dialog.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (event.key === 'Tab') return;
      if (['Enter', 'Escape', ' '].includes(event.key) && event.repeat) { event.preventDefault(); return; }
      if (busy) { event.preventDefault(); return; }
      const letter = event.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) type(letter);
      else if (event.key === 'ArrowUp') change(active, 1);
      else if (event.key === 'ArrowDown') change(active, -1);
      else if (event.key === 'ArrowLeft' || event.key === 'Backspace') choose(active - 1);
      else if (event.key === 'ArrowRight') choose(active + 1);
      else if (event.key === 'Enter') { if (event.target === skip) finish(null); else submit(); }
      else if (event.key === 'Escape') finish(null);
      else return;
      event.preventDefault();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy) finish(null); });
    dialog.addEventListener('close', () => finish(null), { once: true });
    dialog.showModal(); choose(0); interval = setInterval(tick, 1000);
  });
}

function sound() {
  if (!getPrefs().sfx) return;
  const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
  const audio = new Audio(), oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(660, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(990, audio.currentTime + .12);
  gain.gain.setValueAtTime((getPrefs().volume ?? .35) * .3, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .18);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .2); oscillator.onended = () => audio.close();
}
