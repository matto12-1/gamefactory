// 과목 거르기 차례와 색 (2026-10-14 대장: 과목을 실제 교과 전부로 넓힌다).
// 게임이 아직 없는 과목도 칩은 보인다(흐리게). 게임 자료에만 있는 과목(예: 안전)은 열두 과목 뒤에 붙인다.
// 색은 크림 바탕(#fff9e9) 위 점·테두리로 쓰는 진한 색이다. 글자 색으로는 쓰지 않는다.
export const SUBJECTS = [
  ['국어', '#c8553d'], ['수학', '#2f6fb0'], ['사회', '#a8741f'], ['과학', '#2e8b6e'],
  ['영어', '#7b5ea7'], ['음악', '#c95c90'], ['미술', '#d97a12'], ['체육', '#3f8f36'],
  ['도덕', '#8a6d5a'], ['실과', '#6b8a1f'], ['정보', '#4a5bc4'], ['계기교육', '#b0412e']
];
const EXTRA = '#7a8a99';
const colors = new Map(SUBJECTS);

export function subjectColor(name) { return colors.get(name) ?? EXTRA; }

// [{ name, color, count }] : 열두 과목 차례 + 자료에만 있는 과목(이름 차례)
export function subjectList(games) {
  const count = new Map();
  for (const game of games) for (const s of new Set(game.subjects ?? [])) count.set(s, (count.get(s) ?? 0) + 1);
  const extra = [...count.keys()].filter(s => !colors.has(s)).sort((a, b) => a.localeCompare(b, 'ko'));
  return [...SUBJECTS.map(([name]) => name), ...extra].map(name => ({ name, color: subjectColor(name), count: count.get(name) ?? 0 }));
}
