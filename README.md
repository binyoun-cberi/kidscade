# Kidscade Audio Library v1

업로드된 SOUND PACK 16개 MP3를 Kidscade 공용 효과음 라이브러리 형태로 정리한 패키지입니다.

## 폴더

- `assets/audio/sfx/combat` — 피격, 강타, 투사체, 발사
- `assets/audio/sfx/shop` — 상점/구매
- `assets/audio/sfx/success` — 성공, 승리, 환호
- `assets/audio/sfx/failure` — 실패, 실망
- `assets/audio/sfx/collect` — 코인/씨앗 획득
- `assets/audio/sfx/movement` — 점프/이동
- `assets/audio/audio-catalog.json` — 코드에서 사용할 의미 기반 키와 파일 경로
- `assets/audio/audio-manifest.csv` — 원본명 ↔ 새 경로, 길이, 샘플레이트, 용도 대응표
- `assets/audio/SOURCES.md` — 출처 메모

## 권장 호출 방식

게임 HTML에 개별 파일 경로를 흩뿌리기보다는 이후 공용 `audio-manager.js`를 만들고 다음처럼 호출하는 구조를 권장합니다.

```js
KidscadeAudio.play('movement.jump');
KidscadeAudio.play('collect.coin_pickup');
KidscadeAudio.play('success.victory_fanfare');
KidscadeAudio.play('failure.fail_sting');
```

`audio-catalog.json`의 각 값은 배열이므로 같은 용도의 소리를 추가하면 랜덤 선택도 쉽게 지원할 수 있습니다.

## 품질 메모

`missile-launch-01.mp3`는 원본이 8 kHz mono라 다른 파일보다 음질이 낮습니다. 레트로/무전/저해상도 효과로는 쓸 수 있지만, 핵심 전투 게임의 대표 발사음으로는 추후 더 좋은 파일로 교체하는 편이 좋습니다.

원본 MP3의 오디오 데이터는 수정하지 않았고 파일명과 폴더 구조만 정리했습니다.
