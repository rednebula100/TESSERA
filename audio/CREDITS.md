# 효과음 출처

TESSERA의 효과음은 모두 **CC0 1.0(퍼블릭 도메인)** 자료에서 골라, 게임 톤에 맞게 가공했습니다.

| 출처 | 라이선스 | 쓴 곳 |
|---|---|---|
| [Kenney](https://kenney.nl) Impact Sounds / Interface Sounds (`@netforge/asset-library-files` npm 미러로 받음) | CC0 1.0 | 철거, 블록 허물기, 도장, 이정표 돌기둥, 겹치기 쾅 |
| [UI SFX (uisfx)](https://uisfx.com) 사운드 팩: soft, organic, zen, dreamy, glass, cinematic | CC0 1.0 | 그 밖의 모든 효과음 |

- 블록 착지 음계와 일부 대체음은 [ZzFX](https://github.com/KilledByAPixel/ZzFX)(MIT)와 Web Audio로 합성합니다.
- Kenney, Freesound, Mixkit 사이트는 개발 환경의 네트워크 정책 때문에 직접 받을 수 없어서, 같은 CC0 자료를 npm 미러로 받았습니다.

## 가공
1. 모노 44.1kHz로 변환.
2. 앞뒤 무음 제거.
3. 효과음마다 목표 피크에 맞춰 음량 표준화. 화면 소리는 −16~−11 dBFS, 손과 경제는 −11~−6, 연출은 −6~−4.
4. mp3 96kbps로 저장.

## 고르는 기준
게임은 파스텔, 귀여움, 고요함입니다. 같은 이벤트 후보를 2~6개씩 길이, 음량, 스펙트럼 중심으로 비교해서 골랐습니다.

| 성격 | 고른 팩 | 이유 |
|---|---|---|
| 손과 경제 | soft, organic | 따뜻하고 둥근 소리, 나무와 돌 |
| 화면 소리 | zen | 낮고 짧아서 오래 들어도 피곤하지 않음. 스펙트럼 중심 약 0.7~1kHz |
| 마법 | dreamy | 폴짝, 하늘, 안내서 |
| 다듬기 | glass | 맑은 톡 |
| 무게 | Kenney 충격음 | 철거, 쾅, 돌기둥 |
| 큰 연출 | cinematic | 리셋, 시대 전환, 이정표 |

음량 상한이 날카로운 고음(4~7kHz)인 효과음(예: Kenney coin, level_up)은 톤이 맞지 않아 쓰지 않았습니다.

## 파일 목록
| 파일 | 원본 | 용도 |
|---|---|---|
| place.mp3 | uisfx/organic/snap.mp3 | 블록 놓기: 작은 나무/돌 딸깍(음계로 피치 조정) |
| fill.mp3 | uisfx/soft/snap.mp3 | 빈칸 채우기: 맞물리는 딸깍 |
| tapEmpty.mp3 | uisfx/zen/press.mp3 | 빈 곳 클릭: 아주 작은 톡 |
| land.mp3 | uisfx/organic/press.mp3 | 건축가 블록 착지: 멀리서 들리는 톡 |
| pet.mp3 | uisfx/soft/reaction.mp3 | 쓰다듬기 |
| lift.mp3 | uisfx/soft/drag-start.mp3 | 들어 올리기 |
| drop.mp3 | uisfx/soft/release.mp3 | 내려놓기 |
| buy.mp3 | uisfx/soft/purchase.mp3 | 업그레이드 구매 |
| buyMany.mp3 | uisfx/soft/checkout.mp3 | 묶음 구매 |
| hire.mp3 | uisfx/soft/receive.mp3 | 고용 |
| levelup.mp3 | uisfx/organic/level-up.mp3 | 레벨업 |
| deny.mp3 | uisfx/soft/blocked.mp3 | 거부 |
| unlock.mp3 | uisfx/dreamy/unlock.mp3 | 해금 |
| ready.mp3 | uisfx/soft/notification.mp3 | 리셋 준비됨 |
| blueprint.mp3 | uisfx/soft/swipe.mp3 | 설계도 펼치기(종이) |
| frame.mp3 | uisfx/soft/checkpoint.mp3 | 골조 완성 |
| complete.mp3 | uisfx/soft/achievement.mp3 | 완공 |
| stamp.mp3 | kenney/hit.ogg | 도장 쿵 |
| chip.mp3 | uisfx/glass/typing.mp3 | 톡톡 다듬기 |
| paint.mp3 | uisfx/organic/drop.mp3 | 방울 칠하기 |
| demolish.mp3 | kenney/impact.ogg | 철거 |
| knock.mp3 | kenney/hit.ogg | 블록 하나 허물기 |
| warpIn.mp3 | uisfx/dreamy/connect.mp3 | 폴짝: 들어감 |
| warpOut.mp3 | uisfx/dreamy/wake.mp3 | 폴짝: 나옴 |
| tab.mp3 | uisfx/zen/select.mp3 | 탭 |
| open.mp3 | uisfx/zen/open.mp3 | 창 열기 |
| close.mp3 | uisfx/zen/close.mp3 | 창 닫기 |
| page.mp3 | uisfx/soft/swipe.mp3 | 페이지 넘김 |
| expand.mp3 | uisfx/zen/expand.mp3 | 펼치기 |
| collapse.mp3 | uisfx/zen/collapse.mp3 | 접기 |
| tick.mp3 | uisfx/zen/focus.mp3 | 작은 선택 |
| toggleOn.mp3 | uisfx/soft/toggle-on.mp3 | 켜기 |
| toggleOff.mp3 | uisfx/soft/toggle-off.mp3 | 끄기 |
| guide.mp3 | uisfx/dreamy/mention.mp3 | 안내서 |
| check.mp3 | uisfx/soft/check.mp3 | 안내 단계 완료 |
| count.mp3 | uisfx/zen/progress-step.mp3 | 카운트업 |
| birth.mp3 | uisfx/dreamy/bonus.mp3 | 아기 탄생 |
| farewell.mp3 | uisfx/dreamy/sleep.mp3 | 이별 |
| morning.mp3 | uisfx/zen/wake.mp3 | 아침 |
| night.mp3 | uisfx/zen/sleep.mp3 | 밤 |
| sky.mp3 | uisfx/dreamy/notification.mp3 | 일식/오로라 |
| reset.mp3 | uisfx/cinematic/send.mp3 | 리셋 시작(휙) |
| resetQuick.mp3 | uisfx/soft/swipe.mp3 | 빠른 리셋 |
| vertex.mp3 | uisfx/dreamy/achievement.mp3 | 재구성: 꼭짓점 응축 |
| grain.mp3 | uisfx/organic/swipe.mp3 | 다듬기: 조각이 흩어짐 |
| prism.mp3 | uisfx/glass/unlock.mp3 | 굴절: 프리즘 |
| drip.mp3 | uisfx/organic/drop.mp3 | 물들임: 물감 방울 |
| slam.mp3 | kenney/impact.ogg | 겹치기: 쾅 |
| lamp.mp3 | uisfx/zen/check.mp3 | 정착: 등불 하나 |
| era.mp3 | uisfx/cinematic/achievement.mp3 | 시대 전환 |
| pillar.mp3 | kenney/land.ogg | 이정표 돌기둥 |
| reward.mp3 | uisfx/soft/reward.mp3 | 이정표 보상 카드 |
| milestone.mp3 | uisfx/cinematic/checkpoint.mp3 | 이정표 세움 |
| credits.mp3 | uisfx/dreamy/streak.mp3 | 크레딧 |
