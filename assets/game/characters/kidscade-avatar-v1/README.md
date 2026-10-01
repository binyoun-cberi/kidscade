# Kidscade Pixel Avatar v1

키즈케이드의 새 정면형 SD 픽셀 아바타 자산을 모으는 표준 폴더입니다.

## 원칙

- 실제 런타임 파츠는 투명 PNG(RGBA)로 저장합니다.
- 기준 몸체와 모든 파츠는 같은 128×128 좌표계를 사용합니다.
- 얼굴은 눈 한 쌍 / 눈썹 한 쌍 / 코 / 입 / 볼터치 단위로 분리합니다.
- 머리카락은 `hair/back` → base → face → `hair/side` → `hair/front` 순서로 합성합니다.
- 생성 원본과 시트는 `source/`, 게임에서 직접 쓰는 정규화 자산만 `runtime/`에 둡니다.
- 픽셀 확대는 nearest-neighbor, 위치는 정수 좌표만 사용합니다.

## 현재 구조

```text
kidscade-avatar-v1/
├─ source/
│  ├─ animation/
│  │  ├─ idle/       # 4 frames
│  │  └─ walk/       # 6 frames
│  ├─ face/
│  │  └─ face-parts-reference.jpg
│  └─ hair/
│     └─ front-sheets/
│        ├─ front-hair-male-24-brown.png
│        └─ front-hair-female-24-brown.png
├─ runtime/
│  ├─ base/
│  │  └─ master-base-128.png
│  └─ face/
│     ├─ face-manifest.json
│     ├─ eyes/        # 8
│     ├─ eyebrows/    # 6
│     ├─ noses/       # 4
│     ├─ mouths/      # 8
│     └─ blush/       # 4
└─ manifest.json
```

## 얼굴 파츠 런타임 규칙

- 모든 파일은 128×128 RGBA 투명 PNG입니다.
- 모든 파츠는 `(0, 0)`에 그대로 합성합니다.
- 눈/눈썹/볼터치는 좌우 한 쌍을 하나의 파일로 유지합니다.
- 눈 흰자와 하이라이트는 보존하고 바깥 배경만 투명화했습니다.
- JPEG/생성 이미지의 경계 노이즈를 정리하고 hard-alpha로 변환했습니다.
- 기준 베이스에 조합 테스트하여 얼굴 중심과 좌우 간격을 확인했습니다.

## 현재 상태

1. **기본 바디**: `runtime/base/master-base-128.png` 등록 완료.
2. **얼굴 파츠**: 30개 런타임 에셋 변환 완료.
   - eyes 8
   - eyebrows 6
   - noses 4
   - mouths 8
   - blush 4
3. **Idle 4 / Walk 6**: source 보관 완료, 프레임별 기준선 정규화는 아직 필요.
4. **앞머리**: 남성형 24 + 여성형 24 source 시트 보관 완료, 개별 파츠 추출 전.
5. **hair_back / hair_side / 의상 / 신발 / 액세서리**: 이후 제작.

`source/` 이미지는 게임에서 직접 렌더링하지 않습니다.
