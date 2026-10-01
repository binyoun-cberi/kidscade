# Kidscade Pixel Avatar v1

키즈케이드의 새 정면형 SD 픽셀 아바타 자산을 모으는 표준 폴더입니다.

## 원칙

- 모든 실제 런타임 파츠는 투명 PNG(RGBA)로 저장합니다.
- 기준 몸체와 얼굴 파츠는 동일한 좌표계를 사용합니다.
- 얼굴 파츠는 눈 한 쌍 / 눈썹 한 쌍 / 코 / 입 / 볼터치 단위로 분리합니다.
- 머리카락은 `hair/back` → base → face → `hair/side` → `hair/front` 순서로 합성합니다.
- 생성형 이미지의 큰 원본/시트는 바로 런타임에서 쓰지 않고 `source/`에 보관합니다.
- 잘라내기·정렬·투명도 검증을 통과한 파일만 `runtime/`으로 승격합니다.
- 픽셀 보간은 nearest-neighbor, 런타임 좌표는 정수만 사용합니다.

## 폴더 구조

```text
kidscade-avatar-v1/
├─ source/
│  ├─ base/
│  ├─ animation/
│  │  ├─ idle/
│  │  └─ walk/
│  ├─ face/
│  └─ hair/
│     └─ front-sheets/
├─ runtime/
│  ├─ base/
│  ├─ face/
│  │  ├─ eyes/
│  │  ├─ eyebrows/
│  │  ├─ noses/
│  │  ├─ mouths/
│  │  └─ blush/
│  ├─ hair/
│  │  ├─ back/
│  │  ├─ side/
│  │  └─ front/
│  ├─ clothes/
│  ├─ shoes/
│  └─ accessories/
└─ manifest.json
```

## 현재 작업 상태

1. 기본 정면 베이스: 디자인 확정
2. Idle 4 / Walk 6: 생성 원본 확보, 좌표 정규화 전
3. 얼굴 파츠: 원본 시트 확보, 개별 PNG 추출 가능
4. 앞머리: 남성형 24종 + 여성형 24종 소스 시트 확보, 개별 런타임 파츠 추출 전
5. 뒷머리 / 옆머리 / 의상 / 신발: 이후 제작

## 주의

`source/`의 시트 이미지는 캐릭터 제작 참고 및 파츠 추출용입니다. 시트 자체를 게임에서 직접 렌더링하지 않습니다.
