# Kidscade Pixel Avatar v1

키즈케이드의 새 정면형 SD 픽셀 아바타 자산을 모으는 표준 폴더입니다.

## 원칙

- 실제 런타임 파츠는 투명 PNG(RGBA)로 저장합니다.
- 기준 몸체와 모든 파츠는 같은 128×128 좌표계를 사용합니다.
- 얼굴은 눈 한 쌍 / 눈썹 한 쌍 / 코 / 입 / 볼터치 단위로 분리합니다.
- 머리카락은 `hair/back` → base → face → `hair/side` → `hair/front` 순서로 합성합니다.
- 생성 원본과 시트는 `source/`, 게임에서 직접 쓰는 정규화 자산만 `runtime/`에 둡니다.
- 픽셀 확대는 nearest-neighbor, 위치는 정수 좌표만 사용합니다.

## 현재 정리된 소스

```text
kidscade-avatar-v1/
├─ source/
│  ├─ animation/
│  │  ├─ idle/
│  │  │  ├─ idle-01.png
│  │  │  ├─ idle-02.png
│  │  │  ├─ idle-03.png
│  │  │  └─ idle-04.png
│  │  └─ walk/
│  │     ├─ walk-01.png
│  │     ├─ walk-02.png
│  │     ├─ walk-03.png
│  │     ├─ walk-04.png
│  │     ├─ walk-05.png
│  │     └─ walk-06.png
│  ├─ face/
│  │  └─ face-parts-reference.jpg
│  └─ hair/
│     └─ front-sheets/
│        ├─ front-hair-male-24-brown.png
│        └─ front-hair-female-24-brown.png
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

## 현재 상태

1. Idle 4프레임과 Walk 6프레임은 원본 보관 완료. 아직 128×128 정규화/앵커 검증 전입니다.
2. 얼굴 파츠 참고 시트는 JPEG 원본이라 런타임 직접 사용 금지입니다. 개별 파츠 추출 후 투명 PNG로 재저장해야 합니다.
3. 앞머리 남성형 24종 + 여성형 24종 시트는 원본 보관 완료. 각 칸을 개별 128×128 투명 PNG로 추출해야 합니다.
4. 기본 바디 원본, hair_back, hair_side, 의상, 신발, 액세서리는 아직 runtime 등록 전입니다.
5. `source/` 이미지는 게임에서 직접 렌더링하지 않습니다.
