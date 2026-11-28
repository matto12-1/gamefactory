# 그림 출처

| 무엇 | 만든 사람 | 받은 곳 | 허락 | 받은 날 |
|---|---|---|---|---|
| Kings and Pigs (왕 · 돼지 · 돼지 왕 · 상자 · 폭발 · 하트 · 벽돌 · 창 · 지붕) | Pixel Frog | https://opengameart.org/content/kings-and-pigs | CC BY 4.0 | 2026-11-06 |

원본 묶음은 `assets-src/wreck/Kings_and_Pigs.zip`에 그대로 둔다. `art/atlas.png`는 `docs/games/wreck/_check/make_atlas.py`가 이 묶음에서 만든다.

## 고친 곳 (CC BY는 고친 것을 알려야 한다)

- 왕의 치기 그림 두 장에서 옆으로 도는 흰 자국을 지웠다(`heroRaise`, `heroSmash`).
- 왕의 쓰러진 그림을 위아래로 눌러 납작한 왕(`heroFlat`)을 만들었다.
- 말풍선 다섯(`bubHello` `bubHi` `bubNo` `bubBoom` `bubAtk`)은 묶음 말풍선의 색과 꼴을 따라 한글(안녕 · 야 · 안 돼 · 펑 · 덤벼)로 새로 찍었다.
- 목숨 판(`livePlate`)은 Live Bar에서 판만 오리고, 띠가 덮은 귀퉁이를 반대쪽 귀퉁이로 메웠다.
- 끝 화면 판자(`endPlank`)는 묶음 판자의 양 끝과 나무 한 줄로 줄였고, 아치 창(`endArch`)의 비치는 빛을 지웠다.
- 별 효과(`fxStarS` `fxStarM` `fxStarL`)는 묶음 색으로 직접 찍었다(묶음에 없는 그림).
- 상자 그림을 늘려 판자 칸(`panel`)을 만들었다.
- 연한 벽돌의 색을 바꿔 붉은 벽돌을 만들고, 벽돌과 작은 창을 이어 층 벽을 만들었다.
- 돼지 그림의 윗부분을 창에 겹쳐 창밖을 내다보는 돼지(`pigWin`)를 만들었다.
- 돼지 왕 그림에서 왕관과 머리만 잘랐다(`crown`, `kpHead`).
- 돼지 그림을 위아래로 뒤집어 벌렁 쓰러진 돼지(`pigDead` 둘째 장)를 만들었다.
- 묶음의 지붕 그림에서 그림자 줄과 양 끝을 잘랐다.
- 하트를 어둡게 칠한 빈 하트(`heartOff`)를 더했다.
- 단계마다 건물: 벽돌 · 판자 · 지붕을 색만 바꿨다(`w3a`~`w6c`, `roof3`~`roof7`). 나무 창고는 판자 벽(`wallWood`)과 첫 지붕을 그대로 쓴다.
- 단계마다 방(2026-11-07): Terrain의 나무판 벽(`rmWood`), Decorations의 긴 선반(`rmShelf`)과 깃발 + 끝 술(`rmBanner`, 둘을 한 장에 붙임)을 그대로 옮겼다. 색은 게임이 단계마다 다시 칠한다. 높은 탑의 하늘 · 구름 · 언덕은 코드로 찍은 점이다. 돼지 왕의 성 벽(`w7a`)은 묶음의 돌 테두리 벽돌에 창을 얹었다.
- 쇠 층 · 빈 방 · 빠른 층: 답 칸 판자를 색 바꾸고(`panelHard` `panelZero` `panelFast`) 벽 위에 얹는 그림(`ovHard` `ovZero` `ovDash`)을 직접 찍었다.
- 불타는 왕(`flame`): pixelfx의 `fire/spirit-flame`(MIT, Copyright (c) 2026 Patch)을 불꽃 색으로 뽑아 8장을 골라 쓰고 빛 번짐을 잘랐다. 원본 낱장은 `assets-src/wreck/flame.png`.

숫자 · 화살표 · 나뭇조각 · 체크 · 집 표시는 이 게임에서 직접 찍은 점 그림이다. 글자는 갈무리(Galmuri, OFL)와 도현(Do Hyeon, OFL)으로 찍었다. ~~게임 첫 화면에 「그림 Pixel Frog (CC BY 4.0), 일부 고침」을 적는다.~~ (취소: 2026-11-07, DECISIONS 참조)

첫 화면 · 갈림길 · 모험 지도 · 단 연습 지도 오른쪽 아래 「출처」 단추를 누르면 작은 판에 그림 Pixel Frog 「Kings and Pigs」(CC BY 4.0, 일부 고침)와 불꽃 Patch 「pixelfx」(MIT, 일부 고침), 음악 · 효과음 · 글꼴 출처를 함께 적는다. 카드 · 놀이 · 끝 화면에서는 단추를 숨긴다. 갈림길의 창 · 깃발 · 나무 발판 · 상자 · 돼지 · 폭탄은 기존 장에서 그대로 쓰고, 깃발은 중간 길이만 줄여 같은 점 굵기로 잇는다. 새 그림과 새 작가를 더하지 않았다.
