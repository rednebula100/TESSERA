<div align="center">

<img src="docs/screenshots/architects.png" alt="네모, 세모, 동그라미, 오각, 별, 육각 건축가" width="480">

# TESSERA

**작은 건축가들**

네모난 세계, 작은 건축가들이 쌓아 올리는 기하학의 성소.<br>
브라우저에서 바로 즐기는 미니멀 픽셀 인크리멘탈 게임.

### [▶ 데모 플레이하기](https://rednebula100.github.io/TESSERA/)

[![Deploy demo to GitHub Pages](https://github.com/rednebula100/TESSERA/actions/workflows/pages.yml/badge.svg)](https://github.com/rednebula100/TESSERA/actions/workflows/pages.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-2b2b2b)
![No build step](https://img.shields.io/badge/build-none-2b2b2b)
![Language: 한국어](https://img.shields.io/badge/lang-한국어-2b2b2b)

</div>

---

<p align="center"><img src="docs/og.png" alt="작은 건축가들이 지은 마을" width="860"></p>

흰 하늘과 회색 땅뿐인 고요한 2D 격자 세계입니다. 화폐 **조각**으로 작고 귀여운 네모 **건축가**를 고용하면, 건축가들은 블럭을 하나씩 던져 올려 조형물을 짓습니다. 혼자 멀리 떠나 짓기도 하고, 친구와 함께 짓기도 합니다.
처음 지은 건축물은 투박한 블럭 덩어리입니다. **쪼개기**로 블럭을 1비트에서 8비트까지 잘게 나누면 건축물의 진짜 모습이 드러나고, **굴절**로 세상에 색이 생기면 **방울**이 쪼개진 칸을 하나하나 칠합니다. **겹치기**로 세상 뒤에 세상이 겹치고, **정착**하면 집을 짓고 잠을 자고 아기가 태어나는 마을이 시작됩니다.

## 스크린샷

| 처음, 고요한 회색 세계 | 설계도 드래프팅 테이블 |
|---|---|
| ![초반](docs/screenshots/early.png) | ![설계도](docs/screenshots/blueprint.png) |
| **쪼개기 전(왼쪽)과 8비트로 쪼갠 뒤(오른쪽)** | **레이어 세 겹의 중세 성읍** |
| ![쪼개기](docs/screenshots/split.png) | ![마을](docs/screenshots/village.png) |
| **오로라가 뜬 밤** | **부탁 메뉴** |
| ![밤](docs/screenshots/night.png) | ![부탁 메뉴](docs/screenshots/radial.png) |

## 특징

- **귀여운 건축가들**: 쓰다듬으면 하트를 뿜고, 들어 올리면 버둥거리고, 짓고 있는 곳 근처에 내려놓으면 거듭니다. 한 명 한 명이 소중해서 첫 재구성 전까지는 대여섯 명 정도만 함께합니다.
- **실제 비율의 픽셀 건축물 50여 종**: 재질별 색조 이동 램프, 질감, 자동 외곽선과 명암으로 그린 절차적 픽셀 아트. 풀은 작고, 집은 건축가 몇 배, 성은 화면을 가득 채웁니다. 하늘에 띄우는 건축물도 있습니다.
- **쪼개기와 해상도**: 끌 주민이 완공된 블럭을 결대로 쪼갭니다. 해상도는 1비트(1×1)부터 8비트(8×8)까지. 손이 빨라지면 한 칸을 한 번에 쪼갭니다.
- **함께 짓기**: 짓고 있는 건축물을 클릭하면 플레이어도 블럭을 보탤 수 있습니다.
- **이정표 22개**: 어떤 리셋에도 지워지지 않는 별도 레이어. 업그레이드, 리셋 레이어, 편의 기능(연출 생략, 일괄 레벨업, 예상 소요시간)을 차례로 엽니다.
- **여섯 겹의 리셋 레이어**: 재구성(꼭짓점), 쪼개기(결), 굴절(프리즘, 색의 탄생), 물들임(안료, 방울), 겹치기(겹, 깊이 레이어와 워프 주민), 정착(등불, 마을).
- **업그레이드 한계**: 처음에는 최대 레벨이 낮고, 상위 레이어의 「한계」 업그레이드로 늘어납니다.
- **마을의 삶**: 집과 잠, 모든 주민의 수명, 이별과 작은 무덤, 행복 범위, 방문, 구역, 아기와 일꾼. 밖에서 자면 수명이 빨리 줄고, 밤에 부탁을 하면 자던 주민이 화들짝 깨서 달려옵니다.
- **하늘**: 날짜와 시간, 해와 위상이 바뀌는 달, 반짝이는 별과 별똥별. 아주 가끔 **오로라**나 **일식**이 찾아오면 피버 타임.
- **연대기**: 움집 마을, 돌담 마을, 장원, 중세 성읍. 여러 조건을 동시에 채워야 넘어갑니다.
- **물자와 자동화**: 고용, 레벨업, 업그레이드 자동화와 업그레이드 유지, 꼭짓점과 결과 프리즘 자동 채굴. 리셋 자체는 자동으로 일어나지 않습니다.
- **밸런스**: 클릭 가치는 건축가 수입 대비 소프트캡, 비용은 단계마다 성장률이 커지는 구조.

## 조작

| 입력 | 동작 |
|---|---|
| 좌클릭 | 블럭 설치 (쿨타임, 쿨타임 중 클릭은 예약됨) |
| 좌클릭 끌기 | 블럭 칠하기 |
| 짓고 있는 건축물 클릭 | 함께 짓기 |
| 완공된 건축물 클릭 | 상세 정보와 행복 범위 |
| 간격 버튼 위에서 휠, `[` `]` | 블럭 간격 (자유, 격자, 2칸 이상) |
| 우클릭 끌기 | 맵 이동 |
| 우클릭 | 부탁 메뉴 |
| 휠, 핀치, `+` `−` | 확대 / 축소 |
| 주민 클릭 / 끌기 | 쓰다듬기와 정보 카드 / 들어 올리기 |
| 구매 버튼 꾹 누르기 | 점점 빨라지는 연속 구매 |
| `H` | 관측 모드 |
| `Esc` | 취소, 창 닫기 |

## 로컬에서 실행

빌드 단계가 없습니다. 아무 정적 서버로 열면 됩니다.

```bash
git clone https://github.com/rednebula100/TESSERA.git
cd TESSERA
python3 -m http.server 8000
# http://localhost:8000
```

### 감상과 디버그용 URL

데모 모드에서는 저장 데이터를 읽지도, 덮어쓰지도 않습니다.

| URL | 내용 |
|---|---|
| `?demo=wild` | 정착 전, 블럭 그대로의 조형물 |
| `?demo=wild&res=3&color&paint` | 8비트로 쪼개고 칠한 조형물 |
| `?demo=village&era=3&paint` | 방울이 칠한 장원 시대 마을 |
| `?demo=village&era=4&paint&layers=3` | 레이어 세 겹의 중세 성읍 |
| `?demo=village&era=4&clock=160` | 밤의 중세 성읍 |

예: <https://rednebula100.github.io/TESSERA/?demo=village&era=4&paint&layers=3>

## 확정된 설계

| 항목 | 결정 |
|---|---|
| 제목 | **TESSERA** (부제: 작은 건축가들) |
| 기본 화폐 | 조각 |
| 리셋 레이어 | 1 재구성(꼭짓점), 2 쪼개기(결), 3 굴절(프리즘), 4 물들임(안료), 5 겹치기(겹), 6 정착(등불) |
| 별도 레이어 | 이정표 (어떤 리셋에도 남음), 연대기 (정착 후) |
| 주민 | 건축가, 일꾼, 아기, 끌, 방울, 망치, 워프 |
| 해상도 | 1비트, 2비트, 4비트, 8비트 (물들임 이후 최대) |
| 폰트 | Galmuri |

전체 설계는 [`SPEC.md`](SPEC.md)에 있습니다.

## 로드맵 / 남은 결정

- [ ] **밸런스 플레이테스트**: 각 리셋 레이어 도달 시간 측정 후 `js/data.js` 수치 조정
- [ ] 연대기 확장: 성곽 도시, 근대, 미래 시대
- [ ] 레이어별 구역 칠하기와 레이어 시점 전환
- [ ] 칠각, 팔각 등 다각형 계열 건축가
- [ ] 모바일 레이아웃 다듬기 (현재는 기본 대응만)
- [ ] 영어 번역

## 프로젝트 구조

```
index.html          진입점
css/style.css       UI (색 이전은 무채색, body.color 이후 파스텔)
js/
  util.js           숫자 포맷(만, 억, 조), RNG, 이징
  data.js           건축가, 업그레이드, 이정표, 구역 데이터 ← 밸런스 조정은 여기
  patterns.js       기하학 무늬 (비밀 코드)
  pixelart.js       재질 기반 픽셀 아트 엔진 (램프, 질감, 외곽선, 해상도별 색)
  catalog.js        건축물 도감 (원시 조형물부터 중세 성까지, 하늘 건축물)
  structures.js     건축물 배치, 진행, 완공, 쪼개기, 채색, 철거, 도면 시트
  village.js        부지와 구역, 레이어, 낮과 밤, 하늘 이벤트, 행복, 수명, 가족
  icons.js          픽셀 아이콘
  world.js          카메라, 깊이 레이어, 청크 캐시, 하늘(해, 달, 별), 바닥
  sprites.js        절차적 픽셀 스프라이트
  entities.js       건축가, 일꾼, 아기, 끌, 방울, 망치, 워프
  game.js           상태, 경제, 리셋, 저장
  fx.js             파티클, 완공, 리셋, 색의 탄생, 정착, 시대 전환, 크레딧 연출
  audio.js          블럭 음계 + 효과음
  ui.js             HUD, 패널, 모달
  main.js           루프, 입력
vendor/             Galmuri 폰트, Rough.js, ZzFX (오프라인 동작)
docs/               스크린샷, 파비콘, OG 이미지
```

건축물은 종류와 시드, 위치, 진행도만 저장하고 도면은 다시 생성하므로 마을이 커져도 저장 용량이 작습니다.

## 크레딧 & 라이선스

- 기획, 디자인, 개발: Red Nebula (게임 안 크레딧에서 볼 수 있습니다)
- 코드: [MIT](LICENSE) © 2026 Red Nebula
- [Galmuri](https://github.com/quiple/galmuri) by Quiple: SIL Open Font License 1.1 ([`vendor/fonts/OFL-Galmuri.md`](vendor/fonts/OFL-Galmuri.md))
- [Rough.js](https://github.com/rough-stuff/rough) by Preet Shihn: MIT ([`vendor/LICENSE-roughjs`](vendor/LICENSE-roughjs))
- [ZzFX](https://github.com/KilledByAPixel/ZzFX) by Frank Force: MIT ([`vendor/LICENSE-zzfx`](vendor/LICENSE-zzfx))

---

<sub>**English**: TESSERA is a minimalist pixel-art incremental game about tiny square architects who build sculptures, settle a village and carry it through the ages up to a medieval town. A gray world gains color at the second prestige. Korean UI. Play in the browser: <https://rednebula100.github.io/TESSERA/></sub>
