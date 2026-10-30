(function () {
  'use strict';
  window.GFFamilies ||= {};
  // 도감: 한 번이라도 맞게 넣은 물건 번호(no)를 기기에 모은다. 셸 별 기록과 같은 gf:modes:<게임>: 자리다.
  // 저장 값은 남의 입력으로 본다: 판이 1이 아니거나 물건 표에 없는 번호는 버린다.
  const KEY = 'gf:modes:recycle-factory:dex';
  const R = () => window.GFFamilies.recycle.rules;
  const kept = new WeakMap(); // 저장이 막힌 기기에서 이번 판 동안 기억한 번호(저장 손잡이마다). 손잡이는 한 번 만들어 계속 쓴다.
  const known = content => new Set(content.items.map(i => i.no));
  function stored(storage) {
    try { const v = JSON.parse(storage().getItem(KEY)); return v && v.v === 1 && Array.isArray(v.no) ? v.no : []; }
    catch { return []; }
  }
  function load(storage, content) {
    const ok = known(content), all = new Set();
    for (const n of [...stored(storage), ...(kept.get(storage) || [])]) if (Number.isInteger(n) && ok.has(n)) all.add(n);
    return all;
  }
  function add(storage, content, nos) {
    const ok = known(content), all = load(storage, content), added = [];
    for (const n of nos || []) if (Number.isInteger(n) && ok.has(n) && !all.has(n)) { all.add(n); added.push(n); }
    if (added.length) {
      kept.set(storage, new Set(all));
      try { storage().setItem(KEY, JSON.stringify({ v: 1, no: [...all].sort((a, b) => a - b) })); } catch {}
    }
    return { added, all };
  }
  // 통 여덟 쪽. 같은 번호의 변형 그림(우유팩 · 큰 우유팩)은 한 칸이고, 칸 그림은 처음 물건의 첫 장이다.
  function cells(content) {
    return R().BINS.map(bin => {
      const byNo = new Map();
      for (const i of content.items) if (i.bin === bin) {
        if (!byNo.has(i.no)) byNo.set(i.no, { no: i.no, ids: [], frame: i.frames[0], name: i.name });
        byNo.get(i.no).ids.push(i.id);
      }
      return { bin, cells: [...byNo.values()].sort((a, b) => a.no - b.no) };
    });
  }
  // 「다시 태어나요」 짝(10-23 짝 표). 출처가 있는 짝만 둔다. frame은 v3-reborn 그림의 장이다.
  const PAIRS=[
    {id:'paper',name:'종이',to:'새 종이 · 공책',frame:0,source:'https://sustainability.korea.ac.kr/files/Separation%20and%20discharge%20guide%20for%20recycling%20items%20(Ministry%20of%20Environment).pdf#page=7'},
    {id:'pet',name:'투명 페트병',to:'티셔츠',frame:1,source:'https://www.korea.kr/news/policyNewsView.do?newsId=148888859'},
    {id:'carton',name:'종이팩',to:'두루마리 화장지',frame:2,source:'https://xn--oy2b29bd3a601b.kr/front/dischargeMethod/dictionaryView.do?niIdx=16'},
    // 4차: 스티로폼은 녹여 굳힌 덩어리(잉곳)로 액자 틀 · 건축 자재를 만든다(서울신문 2014-07-08 「폐스티로폼, 폼나는 재활용」).
    {id:'foam',name:'스티로폼',to:'액자 틀',frame:3,source:'https://m.go.seoul.co.kr/news/2014/07/08/20140708028017'}
  ];
  // 저장 손잡이는 이 하나만 쓴다(기억 WeakMap의 열쇠라서 판마다 새로 만들면 안 된다).
  const storage = () => window.localStorage;
  (window.GFFamilies.recycle ||= {}).dex = { KEY, load, add, cells, storage, PAIRS };
})();
