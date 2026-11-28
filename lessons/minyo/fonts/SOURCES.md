# 팔도 장단 글꼴

- 함렛(Hahmlet), The Hahmlet Project Authors, 2020
- 공식 원본: https://github.com/google/fonts/tree/main/ofl/hahmlet
- 허락: SIL Open Font License 1.1, 전문은 이 폴더의 `OFL.txt`
- 원본 받은 날: 2026-11-09. 앞 시안의 `docs/games/minyo/refs/ui-font-20261109/fonts/hahmlet.ttf`를 사용했다.
- 가공한 날: 2026-11-10. 노드 도구 subset-font와 HarfBuzz로 실제 글 414자, 굵기 400·700·800만 남기고 WOFF2로 압축했다.
- 원본 3,559,144바이트에서 세 파일 합계 152,432바이트로 줄였다. 파일명 끝 12자리는 내용의 SHA-256 앞자리다.
- 글자 목록, 각 파일의 실제 글자표와 크기·내용 확인값은 `glyphs.json`에 있다.
- 원본에 없는 「」는 함렛의 ‘ ’로 바꿨다. ♪는 같은 뜻의 작은 음표 그림으로 그린다. 다른 글꼴 문자를 덧붙이지 않았다.
- 그림에 들어 있던 추임새 세 가지도 함렛 글자로 바꿨다. 공용 모서리 단추는 민요가 열린 동안에만 함렛을 쓰고 게임을 나가면 원래 글꼴로 돌아간다. 나가기의 가위표는 작은 선 그림이다.
- 다시 만들기: `node _auto/minyo-font-ui-polish-20261110/subset.mjs`. 도구는 `node_modules/.minyo-font-tools` 안에만 설치했다.

2026-11-11 경기 자진뱃노래: 기존 글자 전부를 남기고 새 글자 18자를 추가했다. 같은 함렛 원본·굵기·설정을 사용했다. 세 파일 합계 156,848바이트. 다시 만들기 `node docs/games/minyo/refs/jajin/subset-font.mjs`. 파일 이름에 새 내용 지문을 붙였다.

2026-11-13 전체 검수 보완: 새 글자 2자(곧 · 넣)를 더했다. 같은 원본 · 굵기 · 설정. 세 파일 합계 173,824바이트. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-13 저녁 노랫말 고침(쾅 · 녹 · 장 · 종 · 잤 · 누 · 상 등)과 여덟 지역 확대 글자: 같은 원본 · 굵기 · 설정으로 다시 만듦. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-13 밤 곡 소개 족자 글(21자 더함: 낯 · 둘 · 몰 · 몹 · 변 등): 같은 원본 · 굵기 · 설정. 세 파일 합계 179,240바이트. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-19 판 18 화면 고침(쁜 등 새 글자): 같은 원본 · 굵기 · 설정으로 다시 만듦. 세 파일 합계 202,316바이트. 도구가 songbook.css의 화면 글(아래로 내려 읽어요)도 모으게 고침. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-20 판 21 노래 알기 · 곡 소개 글(8자 더함: 넷 · 돋 · 됨 · 빌 · 셋 · 왜 · 접 · 탄): 같은 원본 · 굵기 · 설정으로 다시 만듦. 세 파일 합계 204,680바이트. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-21 새벽 판 19 첫머리 이야기 대사(4자 더함: 슨 · 됐 · 켰 · 쩌, 그리고 역슬래시 하나): 같은 원본 · 굵기 · 설정으로 다시 만듦. 세 파일 합계 206,068바이트. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.
2026-11-22 판 17 둥당기 시제품 글(4자 더함: 락 · 색 · 엎 · 왼): 같은 원본 · 굵기 · 설정으로 다시 만듦. 다시 만들기 `node docs/games/minyo/refs/garae/subset-font.mjs`.

2026-11-27 첫머리 이야기 컷 애니메이션 글꼴 둘(대표가 시안판에서 고름):
- 송명(Song Myung) `story-songmyung.woff2`: 해설 두 줄. 원본 https://github.com/google/fonts/tree/main/ofl/songmyung , 허락 SIL OFL 1.1(`OFL-songmyung.txt`). 해설 글자만 남기고 fontTools subset으로 WOFF2(7,860바이트).
- 연성(Yeon Sung) `story-yeonsung.woff2`: 말풍선 대사 여덟 줄(첫머리 다섯 · 소문 셋). 원본 https://github.com/google/fonts/tree/main/ofl/yeonsung , 허락 SIL OFL 1.1(`OFL-yeonsung.txt`). 대사 글자만 남기고 WOFF2(15,032바이트).
- 글을 바꾸면 `js/storycuts.js`의 글과 같은 글자로 다시 자른다: `python -m fontTools.subset <원본.ttf> --text="<글>" --flavor=woff2 --layout-features='*' --output-file=<이름>.woff2`.
