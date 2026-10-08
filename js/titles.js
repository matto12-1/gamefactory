export function stampCount(stamps) { return Object.values(stamps ?? {}).reduce((n, set) => n + Object.keys(set ?? {}).length, 0); }
export function earnedTitles(stamps, games, titlesDef) {
  const count = stampCount(stamps);
  const titles = (titlesDef.counts ?? []).filter(t => count >= t.count).map(t => ({ name: t.name, kind: 'count' }));
  for (const set of titlesDef.sets ?? []) {
    const members = games.filter(g => g.tags?.includes(set.tag));
    if (members.length && members.every(g => (g.stamps ?? []).every(s => Object.hasOwn(stamps?.[g.id] ?? {}, s.id)))) titles.push({ name: set.name, kind: 'set' });
  }
  return titles;
}
