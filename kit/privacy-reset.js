// 옛 버전이 기기에 남긴 입력값을 페이지를 열 때 지운다.
(() => {
  for (const key of ['gf:nametag', 'gf:device']) {
    try { localStorage.removeItem(key); } catch { /* 저장소가 막혀도 이용할 수 있다. */ }
  }
})();
