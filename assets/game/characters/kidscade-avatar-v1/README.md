# Kidscade Pixel Avatar v1

키즈케이드의 정면형 SD 픽셀 아바타 런타임 자산입니다.

## 공통 규격

- 런타임 캔버스: **128×128 RGBA**
- 모든 파츠 합성 좌표: **(0, 0)**
- 완전 정면형
- 정수 좌표만 사용
- 확대/축소 시 nearest-neighbor
- 눈·눈썹·볼터치는 좌우 한 쌍을 한 PNG로 유지

## 레이어 순서

```text
hairBack
→ base
→ face
→ hairSide (reserved)
→ hairFront
→ clothes
→ shoes
→ accessories
```

## 현재 구조

```text
kidscade-avatar-v1/
├─ source/
│  ├─ animation/
│  │  ├─ idle/                 # 4 source frames
│  │  └─ walk/                 # 6 source frames
│  ├─ face/
│  │  └─ face-parts-reference.jpg
│  └─ hair/front-sheets/
│     ├─ front-hair-male-24-brown.png
│     └─ front-hair-female-24-brown.png
├─ runtime/
│  ├─ base/
│  │  └─ master-base-128.png
│  ├─ face/
│  │  ├─ face-manifest.json
│  │  ├─ eyes/                 # 8
│  │  ├─ eyebrows/             # 6
│  │  ├─ noses/                # 4
│  │  ├─ mouths/               # 8
│  │  └─ blush/                # 4
│  └─ hair/
│     ├─ hair-manifest.json
│     ├─ back/
│     │  ├─ male/              # 24
│     │  └─ female/            # 24
│     └─ front/
│        ├─ male/              # 24
│        └─ female/            # 24
├─ qa/
│  └─ hair/
│     ├─ hair-split-male-contact.png
│     └─ hair-split-female-contact.png
└─ manifest.json
```

## 얼굴 파츠

총 **30개**가 런타임용 투명 PNG로 변환되어 있습니다.

- eyes 8
- eyebrows 6
- noses 4
- mouths 8
- blush 4

기본 얼굴은 `hairBack → base → face → hairFront` 순서로 조합합니다.

## 헤어 파츠

갈색 헤어 **48스타일**을 실제 런타임 레이어로 변환했습니다.

- male 계열 24스타일
- female 계열 24스타일
- 각 스타일은 `hairBack` + `hairFront` 2장
- 총 헤어 레이어 PNG 96장
- 귀 영역은 front mask에서 제외하여 기본 베이스의 귀가 앞에 보이도록 처리
- 생성 원본이 얼굴을 막는 경우 기본 눈/코/입과 충돌을 검사한 뒤 face aperture를 적용
- 기본 얼굴을 넣은 contact sheet로 48스타일 전체 조합을 확인

헤어 색상은 현재 warm medium brown 1종입니다. 색상 변형은 형태가 확정된 뒤 팔레트 변환으로 확장합니다.

## 남은 작업

1. Idle 4 + Walk 6 프레임의 기준선/몸체 정규화
2. 애니메이션 프레임에 얼굴·헤어 레이어 좌표 전파
3. 의상 / 신발 / 액세서리 제작
4. 필요 시 독립 `hairSide` 파츠 추가
5. 기존 아바타 스튜디오를 새 PNG 레이어 렌더러로 연결

`source/`의 생성 원본은 게임에서 직접 렌더링하지 않습니다.
