(function () {
  'use strict';
  if (window.GFMusic) return;
  const doc = typeof document === 'undefined' ? null : document;
  let config = {}, audio = null, wanted = false, suspended = false, ducked = false;
  let loaded = false, failed = false, requests = 0, plays = 0, rate = 1, pending = false, generation = 0, fade;
  let storageFailed = false, choice = true;
  let mode = 'normal';
  function storageError(error) {
    if (!storageFailed) window.console.error('음악 설정을 기억하지 못했어요', error);
    storageFailed = true; choice = true;
  }
  try { choice = window.localStorage?.getItem('gf:music') !== 'off'; } catch (error) { storageError(error); }
  function record(name) { window.__GAME?.world()?.record(name, {}); }
  function volume() { return Math.max(0, Math.min(1, (config.volume ?? .18) * (ducked ? config.duck ?? .5 : 1))); }
  function pause() { generation++; pending = false; if (audio) audio.pause(); }
  function sync() {
    clearInterval(fade);
    if (!doc) return;
    if (!wanted || !choice || suspended || document.hidden || window.GF?.sound === false || !config.src || failed || window.GF?.sim > 0) { pause(); return; }
    if (!audio) {
      audio = document.createElement('audio'); audio.preload = 'none'; audio.loop = true; audio.hidden = true;
      audio.preservesPitch = true; audio.mozPreservesPitch = true; audio.webkitPreservesPitch = true;
      document.body.appendChild(audio);
      const element = audio;
      audio.addEventListener('canplay', () => { if (audio === element) loaded = true; });
      audio.addEventListener('error', () => {
        if (failed || audio !== element) return;
        failed = true; pause(); window.console.error('음악을 불러오지 못했어요', config.src); record('musicError');
      });
      requests++; audio.src = config.src;
    }
    audio.volume = volume(); audio.playbackRate = rate;
    if (pending || !audio.paused) return;
    pending = true; const token = ++generation;
    audio.play().then(() => {
      if (token !== generation) return;
      pending = false; loaded = true; plays++; record('musicPlay');
    }).catch(error => {
      if (token !== generation) return;
      pending = false;
      // A blocked gesture may be retried by a later explicit play, never by a timer.
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError' && !failed) { failed = true; record('musicError'); }
      window.console.error('음악을 재생하지 못했어요', error);
    });
  }
  const api = {
    init(options) {
      if (options.src !== config.src) {
        pause(); clearInterval(fade); audio?.remove(); audio = null; wanted = false;
        loaded = failed = false; requests = plays = 0;
        mode = 'normal';
      }
      config = { ...options }; ducked = false; rate = config.rates?.[mode] ?? 1;
      if (audio) { audio.volume = volume(); audio.playbackRate = rate; }
    },
    play() { wanted = true; sync(); },
    setMode(value) { mode = value; rate = config.rates?.[mode] ?? 1; if (audio) audio.playbackRate = rate; },
    duck(on) { ducked = !!on; if (audio) audio.volume = volume(); },
    stop(ms = config.fadeMs ?? 300) {
      wanted = false; generation++; pending = false; clearInterval(fade);
      if (!audio || audio.paused) return;
      if (ms <= 0) { pause(); return; }
      const start = performance.now(), initial = audio.volume;
      fade = setInterval(() => {
        const share = Math.min(1, (performance.now() - start) / ms);
        audio.volume = initial * (1 - share);
        if (share === 1) { clearInterval(fade); pause(); }
      }, 16);
    },
    enabled() { return choice; },
    setEnabled(on) {
      choice = !!on;
      try { window.localStorage.setItem('gf:music', choice ? 'on' : 'off'); } catch (error) { storageError(error); }
      sync();
    },
    state() { return { loaded, playing: !!audio && !audio.paused, error: failed, rate, requests, plays }; }
  };
  doc?.addEventListener('visibilitychange', sync);
  window.GF?.on('sound', sync);
  window.GF?.on('pause', () => { suspended = true; sync(); });
  window.GF?.on('resume', () => { suspended = false; sync(); });
  window.GFMusic = api;
})();
