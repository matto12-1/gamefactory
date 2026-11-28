export function parseRecent(raw) {
  let value; try { value=JSON.parse(raw); } catch { return []; }
  if(!Array.isArray(value)) return [];
  const seen=new Set();
  return value.filter(x=>x && typeof x.id==='string' && x.id.length && Number.isFinite(x.at) && !seen.has(x.id) && seen.add(x.id)).map(({id,at})=>({id,at})).slice(0,12);
}
export function pushRecent(list,id,at,max=12) {
  return [{id,at},...list.filter(x=>x.id!==id)].slice(0,max);
}
export function seedRecent(games,keys) {
  return games.filter(g=>keys.some(k=>k.startsWith(`gf:best:${g.id}:`)||k.startsWith(`gf:modes:${g.id}:`)||k===`gf:save:${g.id}`)).slice(0,12).map(g=>({id:g.id,at:0}));
}
export function pickBest(id,entries) {
  const values=new Map(entries), score=raw=> {
    if(raw===undefined||raw===null||raw==='') return null;
    let n; try { n=JSON.parse(raw); } catch { return null; }
    return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
  };
  let last; try { last=JSON.parse(values.get(`gf:modes:${id}:last`)); } catch { last=null; }
  if(last && Number.isInteger(last.grade) && ['quick','endless','stage'].includes(last.play)) {
    const n=score(values.get(`gf:modes:${id}:best:${last.grade}:${last.play}`)); if(n!==null) return n;
  }
  const all=entries.filter(([k])=>k.startsWith(`gf:best:${id}:`)||k.startsWith(`gf:modes:${id}:best:`)).map(([,v])=>score(v)).filter(n=>n!==null);
  return all.length?Math.max(...all):null;
}
