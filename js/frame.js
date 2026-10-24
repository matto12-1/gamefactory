import { START_TIMEOUT_MS } from './config.js?v=1179d5aa40';
export function connectGame(iframe, game, { mode, onReady, onStart, onFinish, onStamp, onExit, onMenu }) {
  let active = true;
  const timers = new Set();
  const send = (type, extra = {}) => { if (active) iframe.contentWindow?.postMessage({ gf: 1, type, ...extra }, location.origin); };
  function receive(event) {
    if (!active || event.origin !== location.origin || event.source !== iframe.contentWindow || event.data?.gf !== 1) return;
    const message = event.data;
    switch (message.type) {
      case 'ready': onReady?.(); break;
      case 'start': {
        if (typeof message.reqId !== 'string') return;
        let answered = false;
        const reply = () => { if (answered) return; answered = true; clearTimeout(timer); timers.delete(timer); send('start-ok', { reqId: message.reqId }); };
        const timer = setTimeout(reply, START_TIMEOUT_MS); timers.add(timer);
        if (message.play !== undefined && !['quick','endless','stage'].includes(message.play)) return;
        if (message.play === 'stage' && (!Number.isInteger(message.stage) || message.stage < 1 || message.stage > 13)) return;
        Promise.resolve().then(() => onStart?.({play:message.play??'quick',stage:message.stage})).then(reply, error => { console.error(error); reply(); });
        break;
      }
      case 'finish':
        if (message.score !== undefined && (!Number.isSafeInteger(message.score) || message.score < 0)) return;
        onFinish?.({ score: message.score }); break;
      case 'stamp': if (typeof message.id === 'string' && game.stamps.some(s => s.id === message.id)) onStamp?.(message.id); break;
      case 'exit': onExit?.(); break;
      case 'menu': onMenu?.(); break;
    }
  }
  window.addEventListener('message', receive);
  return {
    pause() { send('pause'); }, resume() { send('resume'); },
    sound(on) { send('sound', { on }); }, goal(top) { send('goal', { top }); },
    destroy() { active = false; window.removeEventListener('message', receive); for (const timer of timers) clearTimeout(timer); timers.clear(); },
  };
}
