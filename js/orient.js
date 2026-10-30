// 폰에서 놀이 페이지를 전체 화면으로 켜고(폰 가로 설계서 7절), 「가로로」 단추로 화면을 가로로 묶는다(8절).
// 판이 바뀌어도 이 페이지는 그대로라(GFPlay.reload) 한 번 켠 전체 화면과 가로 묶기가 판마다 풀리지 않는다.
export const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 500;

let pending = null;
// 이미 전체 화면이면 true. 못 켜면(아이폰처럼 기능이 없거나 브라우저가 거절하면) 조용히 false.
export function enterFullscreen() {
  if (document.fullscreenElement) return Promise.resolve(true);
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') return Promise.resolve(false);
  try {
    pending ??= Promise.resolve(root.requestFullscreen({ navigationUI: 'hide' })).then(() => true, () => false).finally(() => { pending = null; });
  } catch { return Promise.resolve(false); }
  return pending;
}

// 첫 누름은 바깥 창이든 게임 틀 창이든 페이지에서 한 번만 센다.
// 누름은 막지 않고 그대로 두니 그 누름은 게임에도 들어간다.
let tapped = false;
function onFirstTap() { if (tapped) return; tapped = true; enterFullscreen(); }
export function watchFirstTap(win) {
  if (!win || tapped || !isPhone()) return;
  for (const type of ['pointerup', 'click']) win.addEventListener(type, onFirstTap, true);
}

// 화면 묶기는 전체 화면에서만 된다. 아이폰 사파리는 묶기를 못 해 「가로로」 단추를 두지 않는다.
// 기능은 있다면서 실제로는 거절하는 브라우저도 있어, 한 번 거절되면 이 탭에서는 단추를 두지 않는다(설계서 8절).
const REFUSED = 'gf:rotate-refused';
let refused = (() => { try { return sessionStorage.getItem(REFUSED) === '1'; } catch { return false; } })();
export const canRotate = () => !refused && isPhone() && !!screen.orientation?.lock && typeof document.documentElement.requestFullscreen === 'function' && !/iPhone|iPad|iPod/.test(navigator.userAgent);
// wanted: 아이가 가로를 골랐다. held: 지금 묶여 있다. 전체 화면이 풀리면 브라우저가 묶기를 풀지만 고른 것은 남겨,
// 멈춤 창 「계속하기」가 다시 묶는다.
let wanted = false, held = false;
const watchers = new Set();
const tell = () => { for (const fn of watchers) { try { fn(wanted); } catch { watchers.delete(fn); } } };
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) held = false; });
async function hold() {
  try { await screen.orientation.lock('landscape'); held = true; return true; } catch { return false; }
}
export async function lockLandscape() {
  if (!canRotate()) return false;
  if (!(await enterFullscreen()) || !(await hold())) {
    refused = true; try { sessionStorage.setItem(REFUSED, '1'); } catch { /* 기억 못 해도 이 페이지에서는 숨긴다. */ }
    tell(); return false;
  }
  wanted = true; tell(); return true;
}
export function release() {
  try { screen.orientation.unlock(); } catch { /* 묶지 않았으면 풀 것도 없다. */ }
  held = false; wanted = false; tell();
}
export const isLocked = () => wanted;
export function onLockChange(fn) { watchers.add(fn); return () => watchers.delete(fn); }
// 게임 틀 안의 「가로로」 단추(gf-shell GFRotateButton)가 바깥 페이지의 이것을 쓴다.
window.GFOrient = { canRotate, lockLandscape, release, isLocked, onLockChange };

// 멈춤 창 「계속하기」에서만 부른다. 전체 화면이 풀려 멈췄으면 다시 켜고, 가로를 골랐으면 다시 묶는다.
export async function resumeFullscreen() {
  if (!isPhone()) return;
  await enterFullscreen();
  if (wanted && !held) await hold();
}
