const KEY = 'gf:theme';
const system = matchMedia('(prefers-color-scheme: dark)');
const valid = value => value === 'light' || value === 'dark';
function stored() { try { return localStorage.getItem(KEY); } catch { return null; } }
export function currentTheme() { const value = stored(); return valid(value) ? value : system.matches ? 'dark' : 'light'; }
export function applyTheme(theme = currentTheme()) {
  document.documentElement.dataset.theme = theme;
  // 놀이판은 이니셜 창 색만 바꾼다. 놀이 화면과 브라우저 색은 그대로 둔다.
  if (!document.body?.classList.contains('play-page')) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1b1916' : '#efe6d6');
  const button = document.querySelector('[data-test="theme-toggle"]');
  if (button) {
    const label = theme === 'dark' ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기';
    button.setAttribute('aria-label', label); button.title = label;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }
}
export function initTheme() {
  applyTheme();
  document.querySelector('[data-test="theme-toggle"]')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); applyTheme(next); } catch { applyTheme(system.matches ? 'dark' : 'light'); }
  });
}
system.addEventListener('change', () => { if (!valid(stored())) applyTheme(); });
addEventListener('storage', event => { if (event.key === KEY || event.key === null) applyTheme(); });
