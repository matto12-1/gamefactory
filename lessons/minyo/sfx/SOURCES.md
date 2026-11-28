# 팔도 장단 소리 출처 장부

2026-11-05. 10개 모두 CC0 재료만 썼다. 16비트 모노 32kHz 웨이브이며, 파일당 40,000바이트 이하, 앞의 0 샘플 0개다. 소리 생성 도구는 쓰지 않았다. 모든 다운로드는 node fetch의 공개 GET 요청이며 가입·로그인·양식 제출은 하지 않았다.

| 파일 | 받은 주소·만든 사람 | 허락 원문 | 받은 날 | 다듬은 법 |
|---|---|---|---|---|
| straw-1.wav | [BonginkosiMakhubu190225](https://freesound.org/people/BonginkosiMakhubu190225/sounds/542690/) | 「Creative Commons 0」 | 2026-11-05 | 짚 녹음 2.43~2.66초, 450Hz~6.5kHz, 끝 25ms 줄임 |
| straw-2.wav | [BonginkosiMakhubu190225](https://freesound.org/people/BonginkosiMakhubu190225/sounds/542690/) | 「Creative Commons 0」 | 2026-11-05 | 짚 녹음 12.48~12.74초, 450Hz~6.5kHz, 끝 25ms 줄임 |
| flail-1.wav | [Kenney](https://kenney.nl/assets/impact-sounds) + [BonginkosiMakhubu190225](https://freesound.org/people/BonginkosiMakhubu190225/sounds/542690/) | 「License: (Creative Commons Zero, CC0)」 + 「Creative Commons 0」 | 2026-11-05 | 나무 중간 타격 000·001·002 각 한 벌 + 실제 짚, 650Hz 아래 줄임, 1.1~2.9kHz 나무 45ms 겹, 끝 25ms 줄임 |
| flail-2.wav | [Kenney](https://kenney.nl/assets/impact-sounds) + [BonginkosiMakhubu190225](https://freesound.org/people/BonginkosiMakhubu190225/sounds/542690/) | 「License: (Creative Commons Zero, CC0)」 + 「Creative Commons 0」 | 2026-11-05 | 나무 중간 타격 000·001·002 각 한 벌 + 실제 짚, 650Hz 아래 줄임, 1.1~2.9kHz 나무 45ms 겹, 끝 25ms 줄임 |
| flail-3.wav | [Kenney](https://kenney.nl/assets/impact-sounds) + [BonginkosiMakhubu190225](https://freesound.org/people/BonginkosiMakhubu190225/sounds/542690/) | 「License: (Creative Commons Zero, CC0)」 + 「Creative Commons 0」 | 2026-11-05 | 나무 중간 타격 000·001·002 각 한 벌 + 실제 짚, 650Hz 아래 줄임, 1.1~2.9kHz 나무 45ms 겹, 끝 25ms 줄임 |
| doli.wav · doli-2.wav · doli-3.wav | 위 flail-1 · flail-2 · flail-3 | 같음 | 2026-11-21 | 풍구 · 자진아리 내 손 소리. 몸통이 다른 곡 치는 소리보다 9 ~ 11dB 작아(가장 큰 50ms -21.4 ~ -22.7dBFS) ffmpeg로 12.6 · 13.4 · 14.4dB 키우고 `alimiter`(끝 -1dBFS, 0.5ms 잡기 · 4ms 풀기)로 눌러 가장 큰 50ms -12.6 · -12.5 · -13.3dBFS 2026-11-21 그래프 검수 3회차: 300Hz 아래를 잘라도 3dB 안쪽(손맛-소리 12절 14, ffmpeg highpass 300Hz 두 번으로 잼)이 되게 350Hz 낮은 선반을 건 뒤, 가장 큰 50ms 크기를 원본과 같게 맞추고 최고값만 -0.5dBFS 안으로 부드럽게 누름. 대표 귀 확인 필요. |
| whoosh.wav | [Nox_Sound](https://freesound.org/people/Nox_Sound/sounds/495390/) | 「Creative Commons 0」 | 2026-11-05 | 겉옷 휘두른 녹음 0.06~0.41초, 240Hz~7kHz, 끝 25ms 줄임 |

재료 파일을 받은 공개 주소:
- kenney: [Impact Sounds 묶음](https://kenney.nl/assets/impact-sounds), 공개 내려받기 연결 `https://kenney.nl/download-link/6173736574732f696d706163742d736f756e6473`.
- straw: [공개 미리듣기](https://cdn.freesound.org/previews/542/542690_10965995-hq.mp3).
- cloth: [공개 미리듣기](https://cdn.freesound.org/previews/495/495390_9250976-hq.mp3).
- handdrum: [공개 미리듣기](https://cdn.freesound.org/previews/175/175933_3266433-hq.mp3).
- gong: [공개 미리듣기](https://cdn.freesound.org/previews/369/369428_5450487-hq.mp3).

허락 확인: Kenney 묶음 안 `License.txt`의 원문은 「License: (Creative Commons Zero, CC0)」, 「This content is free to use in personal, educational and commercial projects.」다. Freesound 네 페이지는 모두 「Creative Commons 0」와 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) 연결이 있다. 원본·허락 페이지 사본은 `_auto/onghe-materials/`에 보관했다. Freesound는 원본 내려받기 대신 로그인 없이 공개된 고음질 미리듣기를 받았으므로, 원래의 무손실 녹음을 쓴 것은 아니다.

(2026-11-05 밤 고침: 대체음 넷 `drum-*` · `kkwaenggwari`는 지우고 아래 맨 끝 절의 국립국악원 단음으로 바꿨다.) 실제 장구·꽹과리 CC0 녹음은 이번 조사에서 **못 찾음**. Kenney Impact Sounds, Freesound의 janggu·장구·hand drum·small gong, OpenGameArt의 janggu·CC0 percussion, Wikimedia Commons의 Janggu 음원을 찾아봤다. [Wikimedia Janggu.ogg](https://commons.wikimedia.org/wiki/File:Janggu.ogg)는 CC BY-SA 4.0이어서 받거나 쓰지 않았다. Freesound의 손북과 작은 징을 대신 다듬었으며 위 표에 대체임을 적었다. 국립국악원·국악 아카이브에서 받은 파일은 없다.

최고 음량은 파일마다 `ffmpeg -i 파일 -af ebur128=peak=true -f null -`로 쟀다. [길이·크기·최고 음량 표](../../../docs/games/minyo/refs/onghe/_check/audio-table.md)와 [원 측정 기록](../../../docs/games/minyo/refs/onghe/_check/audio/)을 함께 보관했다. 1~3kHz 짧은 나무 겹의 전체 에너지 비중은 도리깨 세 벌 각각 23.0%·23.5%·38.0%다. 태블릿 실물 스피커로 듣는 확인은 하지 않았다.

만들기 대본은 `_auto/onghe-materials/prepare_audio.py`, `build_audio.py`, 정확한 원본 구간·효과 값·파일별 검사는 `audio-results.json`에 있다. 원본 CC0 소리에 손질과 겹치기를 했으며 노래·받는 소리는 이번 파일에 없다.


## 2026-11-05 재미 보완 소리 셋

이 절의 새 소리만 **16비트 모노 44.1kHz**다. 기존 열 파일은 바꾸지 않았다. 셋 모두 CC0 재료가 있어 jsfxr 합성은 하지 않았다. 돈이 드는 소리 생성 호출도 0회다.

| 파일 | 받은 곳·만든 사람 | 허락 | 손질 | 결과 |
|---|---|---|---|---|
| quail.wav | [Quail Sound, AntumDeluge](https://opengameart.org/content/quail-sound), 원 녹음 [PrincessGrace](https://freesound.org/people/PrincessGrace/sounds/329371/) | 두 페이지 모두 CC0. 원문 표기 Creative Commons Zero (CC0) / Creative Commons 0 | 잡음 정리된 FLAC의 0.55~0.93초를 잘라 650Hz~7kHz로 다듬음 | 0.380초, 33,560바이트, 최고 -6.0dB |
| flap.wav | [wings.wav, Godowan](https://freesound.org/people/Godowan/sounds/240476/) | Creative Commons 0 | 공개 고음질 미리듣기 0.05~0.43초, 250Hz~7kHz | 0.380초, 33,560바이트, 최고 -6.0dB |
| pop.wav | [Bubble_Pop, arttim](https://freesound.org/people/arttim/sounds/733264/) | Creative Commons 0 | 공개 고음질 미리듣기 전 구간, 120Hz~7kHz | 0.14948초, 13,228바이트, 최고 -6.0dB |

받은 날: 2026-11-05. 공통 손질은 앞 3ms·끝 12ms를 줄이고, 한 줄 소리로 바꾼 뒤 최고 크기를 -6dB로 맞춘 것이다. 무료 원본을 자르고 다듬었으며 합성음을 섞지 않았다. [CC0 1.0 허락](https://creativecommons.org/publicdomain/zero/1.0/)은 수정·복사·상업 이용을 허용한다.

공개 재료 주소:
- quail: [무손실 FLAC](https://opengameart.org/sites/default/files/quail.flac).
- flap: [고음질 미리듣기](https://cdn.freesound.org/previews/240/240476_1662097-hq.mp3).
- pop: [고음질 미리듣기](https://cdn.freesound.org/previews/733/733264_15926992-hq.mp3).

원본·허락 페이지 사본·다운로드 대본은 `docs/games/minyo/refs/onghe/_fun-src/audio/`와 `docs/games/minyo/refs/onghe/_fun-src/fetch_audio.mjs`, 다듬기 대본은 `docs/games/minyo/refs/onghe/_fun-src/build_audio.py`다. Freesound 두 파일은 로그인 없는 공개 미리듣기이므로 무손실 원본이 아니다. Kenney의 CC0 Interface Sounds도 확인했으나 내려받기 연결이 막혀 쓰지 않았고, 위의 짧은 CC0 팝으로 대체했다.

종에 관한 가정: quail 재료는 국내 메추리의 녹음이 아닌 **북미 콜린메추리(Bobwhite)** 울음이다. 이번 그림 동작에 붙일 짧은 메추리류 울음으로 썼으며 국내 종의 정확한 울음으로 설명하지 않는다. 실제 태블릿 스피커로 듣는 확인은 하지 않았다.

Python 실측은 [fun-audio-results.json](../../../docs/games/minyo/refs/onghe/_check/fun-audio-results.json), 실제 최고 크기 측정은 같은 폴더 `quail-fun-ebur128.txt`, `flap-fun-ebur128.txt`, `pop-fun-ebur128.txt`에 있다. 세 파일 모두 샘플 최고 크기와 보간해 잰 최고 크기가 -6.0dB다.

## 2026-11-05 밤 국립국악원 디지털 음원 (공공누리 제1유형)

출처 표시: 이 게임의 노래와 풍물 소리는 국립국악원이 공공누리 제1유형으로 개방한 디지털 음원을 이용했다. https://www.gugak.go.kr/digitaleum/ 에서 무료로 받을 수 있다. 받을 때 적은 값은 `비상업용 · 교육용 · MattoLAB`이다. 받은 원본은 `docs/games/minyo/refs/audio-candidates/국악원/`(git 무시), 받기 · 다듬기 대본은 `docs/games/minyo/refs/gugak-tools/`에 있다. 소리꾼 권리까지 허락에 드는지는 공개 전 국악원 담당자에게 확인한다(대표 몫).

| 게임 파일 | 원본 | 다듬은 법 |
|---|---|---|
| `voice/V5-017-001~006.mp3` | 동부민요 「쾌지나칭칭나네」 `V5-017-001~006`, 김세윤 · 장효선 | 좌우를 모노로 합침, 조각마다 -18 LUFS로 맞춤, 96kbps mp3. 자르지 않음 |
| `voice/V5-040-016~028.mp3` | 남도민요 「강강술래」 `V5-040-016~028`, 염경애 | 좌우를 모노로 합침, 열세 조각 모두 같은 양(+11.6dB)을 올려 대목 사이 세기 차이를 살림, 튀는 소리만 잡음(합쳐서 -18.5 LUFS, 최고 -1.4dB), 96kbps mp3. 자르지 않음 |
| `sfx/jg-deong.wav` | 단음 장구 `Janggu_1_1` | 앞 침묵 자름, 0.75초, 끝 35% 줄임, 꼭지 0.80, 32kHz 모노 |
| `sfx/jg-kideok.wav` | 단음 장구 `Janggu_2_2` | 같은 법, 0.50초, 꼭지 0.55 |
| `sfx/jg-kung.wav` | 단음 장구 `Janggu_3_1` | 같은 법, 0.75초, 꼭지 0.80 |
| `sfx/jg-deoreoreo.wav` | 단음 장구 `Janggu_4_2` | 같은 법, 0.95초, 꼭지 0.50 |
| `sfx/jg-deok.wav` | 단음 장구 `Janggu_5_1` | 같은 법, 0.40초, 꼭지 0.85 |
| `sfx/kkw-gaeng.wav` | 단음 꽹과리 `Kkwaenggwari_1_1` | 같은 법, 0.85초, 꼭지 0.65 |
| `sfx/jing.wav` | 단음 징 `Jing_1` | 같은 법, 2.2초, 꼭지 0.70 |

## 2026-11-06 판 2 들어오는 악기와 내 소고 (국립국악원 단음, 공공누리 제1유형)

| 파일 | 원본 | 다듬은 법 |
|---|---|---|
| `sfx/buk.wav` | 단음 용고 `Yonggo_1` | 앞 침묵 자름, 0.42초, 끝 35% 줄임, 꼭지 0.85, 32kHz 모노 |
| `sfx/kkw-dak.wav` | 단음 꽹과리 `Kkwaenggwari_5_2` | 같은 법, 0.20초, 꼭지 0.60 |
| `sfx/kkw-dak-soft.wav` | 단음 꽹과리 `Kkwaenggwari_5_3` | 같은 법, 0.18초, 꼭지 0.40 |
| `sfx/sogo.wav` | 단음 용고 `Yonggo_1` + 장구 `Janggu_5_1` | 소고 단음이 없어 만들었다. 용고를 2.4배 빠르게 틀어 작은 북 높이(꼭지 229Hz)로 올리고 채 소리를 35% 섞음, 0.17초. 대표 귀 확인 필요 2026-11-21 그래프 검수 3회차: 300Hz 아래를 잘라도 3dB 안쪽(손맛-소리 12절 14, ffmpeg highpass 300Hz 두 번으로 잼)이 되게 350Hz 낮은 선반을 건 뒤, 가장 큰 50ms 크기를 원본과 같게 맞추고 최고값만 -0.5dBFS 안으로 부드럽게 누름. 대표 귀 확인 필요. |
| `sfx/sogo-2.wav` · `sfx/sogo-3.wav` | 위 `sogo.wav` | 2026-11-21 같은 소리가 한 판 45번 되풀이되지 않게 만든 벌. ffmpeg로 높이 +4.5%(위 3kHz +2dB) · -4.5%(아래 220Hz +2dB), 가장 큰 50ms를 원본과 1dB 안으로 맞춤 2026-11-21 그래프 검수 3회차: 300Hz 아래를 잘라도 3dB 안쪽(손맛-소리 12절 14, ffmpeg highpass 300Hz 두 번으로 잼)이 되게 350Hz 낮은 선반을 건 뒤, 가장 큰 50ms 크기를 원본과 같게 맞추고 최고값만 -0.5dBFS 안으로 부드럽게 누름. 대표 귀 확인 필요. |

만들기 대본은 `docs/games/minyo/refs/gugak-tools/make_sfx_band.py`.

## 2026-11-07 판 5 강강술래: 발 구르기 · 원 발소리 · 발 끄는 소리 · 구경 박수

녹음에 없는 악기는 얹지 않는다(기획서 판 5). 대신 원 사람들의 발과 구경꾼 박수를 CC0 녹음으로 만들었다. 16비트 모노 32kHz, 파일당 40,000바이트 이하. 합성음 · 돈이 드는 소리 생성 0회. 자주 나는 소리는 벌을 두고 게임이 바로 앞 벌을 피해 고른다(`audio.js` `varOf`). 벌끼리는 가장 큰 50ms 구간 크기로 맞췄고, 맞힘 소리는 300Hz 아래를 잘라도 3dB 안으로 준다(작은 스피커).

| 파일 | 받은 곳·만든 사람 | 허락 | 손질 | 결과 |
|---|---|---|---|---|
| step.wav · step-2.wav | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) `impactSoft_heavy_000/001` + `footstep_snow_000/001` | 「License: (Creative Commons Zero, CC0)」 | 모래 밟는 사각 소리(250Hz 위)에 그 첫 40ms를 1.1~3kHz로 거른 「딱」 50%, 낮은 쿵(1.8kHz 아래) 20% | 0.30초, 19,244바이트, 50ms 크기 -12.5dB, 300Hz 아래를 두 번 자르면(ffmpeg highpass 300Hz 두 번, 가장 큰 50ms) step -2.8 · step-2 -2.9dB. step-2는 200Hz 낮은 선반 -5dB 뒤 크기를 step과 같게 맞춤(전에는 -3.6dB, 손맛-소리 12절 14, 그래프 검수 4회차 R5-02, 2026-11-21)dB |
| step-soft.wav · step-soft-2.wav | 같은 묶음 `footstep_snow_002/004` + `impactSoft_medium_001/002` | 같음 | 350Hz 위 발소리에 쿵 15%, 0.20초 | 12,844바이트, -16.5dB, 저음 자름 -1.3 · -2.0dB |
| shuffle.wav | 같은 묶음 `footstep_grass_001` | 같음 | 300Hz~7kHz, 0.50초, 끝 50% 줄임. 꾹 누르는 동안 발을 모래에 비비는 소리 | 32,044바이트, 최고 0.45 |
| clap.wav | [Clap-9, Sorinious_Genious](https://freesound.org/people/Sorinious_Genious/sounds/561119/) | 「Creative Commons 0」 | 공개 고음질 미리듣기의 첫 박수 0.20초, 380Hz~9kHz, 끝 60% 줄임 | 12,844바이트, -16.0dB 2026-11-21 그래프 검수 3회차: 세 벌의 가장 큰 50ms를 -16.3 · -16.4 · -16.6dB로 맞춤(규칙 12절 12, clap-3은 +1.4dB 뒤 최고값을 -0.5dBFS 안으로 부드럽게 누름). |
| clap-2.wav · clap-3.wav | [Hand Claps, Jofae](https://freesound.org/people/Jofae/sounds/362954/) | 「Creative Commons 0」 | 공개 고음질 미리듣기의 0.13초 · 1.06초 박수, 같은 손질 | 12,844바이트, -16.3 · -18.0dB 2026-11-21 그래프 검수 3회차: 세 벌의 가장 큰 50ms를 -16.3 · -16.4 · -16.6dB로 맞춤(규칙 12절 12, clap-3은 +1.4dB 뒤 최고값을 -0.5dBFS 안으로 부드럽게 누름). |

받은 날: 2026-11-07. 미리듣기 주소 `https://cdn.freesound.org/previews/561/561119_12517458-hq.mp3`, `https://cdn.freesound.org/previews/362/362954_6512973-hq.mp3`(node fetch 공개 GET, 로그인 없음). 허락 페이지 사본은 `_auto/onghe-materials/clap-9-page.html` · `clap-jofae-page.html`, 원본은 `_auto/ganggang-materials/`. 만들기 대본 `docs/games/minyo/refs/gugak-tools/make_sfx_ring.py`. 대표 귀 확인 필요(태블릿 스피커로 들어 보지 않았다).

## 2026-11-08 판 6 멸치: 밧줄과 바닷가 소리

지시서에 따라 `docs/games/minyo/refs/gugak-tools/make_sfx_net.py`로 직접 합성했다. 외부 재료와 유료 호출은 없다. 실제 밧줄이나 갈매기를 녹음한 소리가 아니며 대표 귀 확인이 필요하다. 모두 16비트 모노 22,050Hz, 열 개 합계 161,838바이트. 벌끼리는 가장 큰 50밀리초 구간의 크기를 맞췄다. 녹음에 없는 악기는 얹지 않는다. 이 열 파일은 멸치 곡을 고를 때 받는다.

| 파일 | 만드는 법 | 길이 초 | 바이트 | 50밀리초 크기 |
|---|---|---|---|---|
| pull.wav · pull-2.wav | 600~5500Hz 마찰 잡음과 흔들리는 밧줄 떨림, 짧은 모래 밟음 | 각 0.25 | 각 11,068 | -12.5dB |
| pull-soft.wav | 같은 밧줄을 짧고 작게 | 0.18 | 7,982 | -16.5dB |
| pull-soft-2.wav | pull → pull-soft로 가는 크기 모양(20ms 창)을 pull-2에 걸고 끝 12ms를 줄임. 앞 · 뒷사람이 1분에 20번 넘게 치는 소리라 두 벌로 돌린다(손맛-소리 12절 12, 그래프 검수 4회차 R5-01, 2026-11-21) | 0.18 | 7,982 | -16.4dB(pull-soft와 같음) |
| creak.wav | 낮게 삐걱이는 밧줄, 모으는 동안 반복 | 0.44 | 19,448 | -23dB |
| splash.wav | 350~6500Hz 물 튐 잡음, 빠른 줄임 | 0.32 | 14,156 | -17dB |
| flop.wav | 짧은 물소리에 24Hz 떨림 | 0.20 | 8,864 | -20dB |
| gull-1.wav · gull-2.wav | 높이가 오르내리는 배음 울음 두 벌 | 각 0.31 | 각 13,714 | -22dB |
| wave-1.wav · wave-2.wav | 부드럽게 오르내리는 물소리 두 벌 | 각 0.70 | 각 30,912 | -28dB |

`voice/V5-054-001~007.mp3`: 국립국악원 디지털 음원 「멸치 후리는 소리」, 강효주 · 김세윤, 공공누리 제1유형. 받은 WAV는 자르지 않고 `make_voice.sh`로 모노, 조각마다 -18 LUFS, 초당 96킬로비트로 바꾸었다. 조각 안 시각은 원본 그대로다.

## 2026-11-08 판 8 월월이: 달집 불

`daljip-fire.wav`: 외부 재료 없이 `docs/games/minyo/refs/gugak-tools/make_sfx_wolwol.py`로 만든 마른 솔가지 불 합성음. 고정 난수의 350~3300Hz 잡음과 짧은 튐 다섯 번, 16비트 모노 32,000Hz, 0.65초, 41,644바이트, 최고값 0.55. 새 합성 결과는 CC0로 둔다. 달집 단계가 오를 때와 끝 한 방에 작게 쓰고 월월이를 고를 때만 받는다. 실제 불 녹음은 아니며 대표 귀 확인은 남는다.

`voice/V5-019-001~003.mp3`: 국립국악원 디지털 음원 「월월이 청청」, 김세윤 · 장효선, 공공누리 제1유형. 제공된 WAV에 `make_voice.sh`를 실행했다. 모노 · -18 LUFS · 초당 96킬로비트, 길이 보존. 원래 크기 -19.2 · -18.7 · -19.1 LUFS, 처음 더한 크기 1.20 · 0.70 · 1.10dB. 압축한 뒤 세 조각이 -18.5 LUFS여서 `wolwol_voice_finish.py`로 원 WAV에서 각각 0.50dB를 더해 다시 압축했다. 최종 크기는 `audio-check.json`에 잰 값으로 남긴다. 스펙트럼에서 따로 치는 장구 · 북 신호를 찾지 못해 `drum: []`로 둔다.

## 2026-11-08 판 7 거문도: 나무 노와 물소리

지시서대로 `docs/games/minyo/refs/gugak-tools/make_sfx_boat.py`로 합성했다. 외부 재료와 유료 호출은 없다. 16비트 모노 22,050Hz, 일곱 파일 합계 91,594바이트다. 가장 큰 50밀리초 구간으로 두 벌의 크기를 맞췄다. 실제 노 녹음은 아니므로 대표 귀 확인이 필요하다. 거문도를 고를 때 받는다. 멸치의 `splash`, `wave-1`, `wave-2`, `gull-1`, `gull-2`는 그대로 다시 쓴다.

| 파일 | 만드는 법 | 길이 초 | 바이트 | 50밀리초 크기 |
|---|---|---|---|---|
| row.wav · row-2.wav | 나무 마찰 떨림과 450~6200Hz 물 미는 잡음 | 각 0.32 | 각 14,156 | -12.5dB |
| row-soft.wav | 같은 노를 짧고 작게 | 0.24 | 10,628 | -16.5dB |
| row-soft-2.wav | row → row-soft로 가는 크기 모양(20ms 창)을 row-2에 걸고 끝 12ms를 줄임(그래프 검수 4회차 R5-01, 2026-11-21) | 0.24 | 10,628 | -16.5dB(row-soft와 같음) |
| oar-creak.wav | 낮은 나무 마찰, 모으는 동안 반복 | 0.44 | 19,448 | -23dB |
| drip.wav | 내려가는 물방울 떨림과 작은 물 튐 | 0.18 | 7,982 | -24dB |
| fish-jump.wav | 350~6500Hz 물소리 | 0.32 | 14,156 | -19dB |
| flag-up.wav | 600~6500Hz 천 마찰과 26Hz 떨림 | 0.25 | 11,068 | -20dB |

`voice/V5-022-001~006.mp3`: 국립국악원 디지털 음원 「거문도 뱃노래」, 조정희, 공공누리 제1유형. 원 WAV의 길이를 보존하고 `make_voice.sh`로 모노, -18 LUFS, 초당 96킬로비트로 바꿨다. 장구 등 녹음에 없는 악기는 더하지 않는다.

## 2026-11-21 그래프 검수 5회차: 장구 · 도리깨 · 삐걱 벌과 저음 덜기

재는 법은 E3와 같다: 44.1kHz로 풀어 가장 큰 50ms(10ms 걸음) RMS, `highpass=f=300` 두 번 뒤 줄어든 양(규칙 손맛-소리 12절 (14) 3dB 이하). 크기를 맞춘 뒤 `alimiter`(끝 0.78, 0.5ms 잡기 · 4ms 풀기, 자동 크기 끔)로 꼭지를 옛 파일 수준(44.1kHz 꼭지 -0.75dB 아래)으로 눌렀다. 만들기 대본은 Claude 작업 폴더의 `make-jang5.py` · `make-doli.py` · `make-rest.py`(원본은 위 국립국악원 단음과 이 폴더의 옛 파일).

| 게임 파일 | 원본 | 만든 법 | 50ms 크기 | 저음 컷 손실 |
|---|---|---|---|---|
| `jg-deong.wav` | 옛 `jg-deong.wav`(단음 `Janggu_1_1`) | 250Hz 낮은 선반 -6dB, 크기를 옛 파일에 맞춤 | -7.64dB(옛 -7.40) | 2.69dB(옛 4.23) |
| `jg-deong-2.wav` · `jg-deong-3.wav` | 위와 같음 | 같은 선반, 높이 0.97 · 1.03배 | -7.65 · -7.63dB | 2.74 · 2.65dB |
| `jg-deok.wav` | 옛 `jg-deok.wav`(단음 `Janggu_5_1`) | 250Hz 낮은 선반 -5dB, 크기를 옛 파일에 맞춤 | -7.82dB(옛 -7.63) | 2.82dB(옛 4.12) |
| `jg-deok-2.wav` · `jg-deok-3.wav` | 위와 같음 | 같은 선반, 높이 1.03 · 0.97배 | -7.85 · -7.79dB | 2.73 · 2.96dB |
| `jg-kideok-2.wav` · `jg-kideok-3.wav` | 단음 `Janggu_2_1` · `Janggu_2_3` | 위 표의 같은 법(앞 침묵 자름, 0.50초, 끝 35% 줄임), 크기를 `jg-kideok`에 맞춤 | -11.68dB | 3.32 · 3.74dB |
| `jg-kung-2.wav` | 단음 `Janggu_3_2` | 같은 법, 0.75초, 크기를 `jg-kung`에 맞춤 | -6.83dB | 19.94dB(쿵은 낮은 소리) |
| `jg-kung-3.wav` | 옛 `jg-kung.wav` | 높이 1.03배 | -6.82dB | 16.35dB |
| `jg-deoreoreo-2.wav` · `jg-deoreoreo-3.wav` | 단음 `Janggu_4_1` · `Janggu_4_3` | 같은 법, 0.95초, 크기를 `jg-deoreoreo`에 맞춤 | -15.28dB | 6.64 · 7.81dB |
| `doli.wav` · `doli-2.wav` · `doli-3.wav` | 옛 같은 이름 파일 | 낮은 선반 -5.5dB@400Hz · -6dB@500Hz · -1.5dB@400Hz, 크기를 옛 파일에 맞춤 | -12.72 · -12.62 · -13.41dB | 2.85 · 2.90 · 2.90dB(옛 3.77 · 3.93 · 2.98) |
| `creak-2.wav` · `creak-3.wav` | 옛 `creak.wav` | 높이 0.96 · 1.04배(길이 0.46 · 0.42초) | -23.00dB | 0.16 · 0.12dB |

`janggu()`는 반주 · 추임새에서 벌을 돌리고 높이 ±1.5% · 크기 -1.2 ~ +1.1dB로 흔든다. 박 맞추기 장구는 늘 첫 벌, 흔들기 없음. 삐걱은 부르는 세 곳(바다 그물 꾹 · 집터 메김 큰박 · 풀무 밟기)에서 높이 ±4% · 크기 -1.5 ~ +1.1dB로 흔든다. 덩 원본의 다른 타(`Janggu_1_2` · `1_3`)는 크기를 맞추려면 8dB 넘게 눌러야 하거나 저음이 7dB 넘게 많아 쓰지 않았다.
