export const LEDGER_URL = 'https://gamefactory-ledger.mattolab.workers.dev';
export const RANK_PROMPT_LIMIT = 100;
export const START_TIMEOUT_MS = 3000;
export const LEDGER_TIMEOUT_MS = 4000;
export const SCORE_TIMEOUT_MS = 8000;   // 점수 올리기는 쓰기가 있어 더 기다린다(10-07 실측 반영)
export const SOUND_DEFAULT = { sfx: true, bgm: false };
export const TODAY_LEAD_DAYS = 14;
export function assetUrl(path) {
  const version = globalThis.document?.querySelector('meta[name="gf-version"]')?.content;
  return version ? `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` : path;
}
