// 게임 찾기: 띄어쓰기를 빼고 부분 일치, 자음만 치면 초성으로 맞춘다(「ㄱㄱㄷ」→ 구구단 기차).
// 한글 입력기는 글자를 다 짜기 전에도 칸에 값을 넣는다(「구구다」 다음에 「구구단」). 그래서 마지막 글자가
// 받침 없는 글자면 같은 첫소리·가운뎃소리의 받침 있는 글자도 맞는 것으로 본다.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const FIRST = 0xac00, LAST = 0xd7a3;
const syllable = c => { const n = c.codePointAt(0); return n >= FIRST && n <= LAST ? n - FIRST : -1; };
const isJamo = c => { const n = c.codePointAt(0); return n >= 0x3131 && n <= 0x314e; };
const initial = c => { const s = syllable(c); return s < 0 ? c : CHO[Math.floor(s / 588)]; };
export const clean = text => String(text ?? '').toLowerCase().replace(/\s+/g, '');

function same(t, q, last) {
  if (t === q) return true;
  if (isJamo(q)) return initial(t) === q;
  if (!last) return false;
  const qs = syllable(q), ts = syllable(t);
  return qs >= 0 && ts >= 0 && qs % 28 === 0 && Math.floor(qs / 28) === Math.floor(ts / 28);
}

// 맞은 자리(0부터) 또는 -1
export function findIn(text, query) {
  const t = [...clean(text)], q = [...clean(query)];
  if (!q.length) return -1;
  for (let i = 0; i + q.length <= t.length; i++) {
    let ok = true;
    for (let j = 0; j < q.length && ok; j++) ok = same(t[i + j], q[j], j === q.length - 1);
    if (ok) return i;
  }
  return -1;
}

// 점수가 높은 차례로 [{ game, score }]. 제목 앞부분 > 제목 안 > 과목·태그·설명.
export function searchGames(games, query, limit = 8) {
  if (!clean(query)) return [];
  const hits = [];
  for (const game of games) {
    const at = findIn(game.title, query);
    let score = at === 0 ? 100 : at > 0 ? 80 : -1;
    if (score < 0 && [...(game.subjects ?? []), ...(game.tags ?? [])].some(word => findIn(word, query) >= 0)) score = 50;
    if (score < 0 && findIn(game.summary, query) >= 0) score = 30;
    if (score >= 0) hits.push({ game, score });
  }
  hits.sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title, 'ko'));
  return hits.slice(0, limit);
}
