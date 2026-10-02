# Kidscade Pixel Avatar v2 Rig

키즈케이드의 정면형 SD 픽셀 아바타 런타임 자산입니다.

## 공통 규격

- 런타임 캔버스: **128×128 RGBA**
- 기본 합성 좌표: **(0, 0)**
- 완전 정면형
- 정수 좌표만 사용
- 확대/축소 시 nearest-neighbor
- 눈·눈썹·볼터치는 좌우 한 쌍을 한 PNG로 유지

## 레이어 순서

```text
hairBack
→ base / animation body frame
→ lower clothes
→ upper clothes (reserved)
→ face
→ hairSide (reserved)
→ hairFront
→ clothes
→ shoes
→ accessories
```

정지 상태에서는 모든 정적 파츠를 `(0, 0)`에 합성합니다. 애니메이션에서는 몸체 프레임은 그대로 그리고 얼굴·헤어는 `animation-manifest.json`의 프레임별 `headTransform`을 적용합니다.

## 현재 구조

```text
kidscade-avatar-v1/
├─ source/
│  ├─ animation/
│  │  ├─ idle/                 # 생성 원본 4
│  │  └─ walk/                 # 생성 원본 6
│  ├─ face/
│  │  └─ face-parts-reference.jpg
│  ├─ hair/front-sheets/
│  │  ├─ front-hair-male-24-brown.png
│  │  └─ front-hair-female-24-brown.png
│  └─ clothes/lower/animated/
│     └─ denim-cuffed-jeans-01-sheet.png
├─ runtime/
│  ├─ base/
│  │  └─ master-base-128.png
│  ├─ animation/
│  │  ├─ animation-manifest.json
│  │  ├─ idle/                 # 정규화 4
│  │  └─ walk/                 # 정규화 6
│  ├─ face/
│  │  ├─ face-manifest.json
│  │  ├─ eyes/                 # 8
│  │  ├─ eyebrows/             # 6
│  │  ├─ noses/                # 4
│  │  ├─ mouths/               # 8
│  │  └─ blush/                # 4
│  ├─ hair/
│  │  ├─ hair-manifest.json
│     ├─ back/
│     │  ├─ male/              # 24
│     │  └─ female/            # 24
│  │  └─ front/
│  │     ├─ male/              # 24
│  │     └─ female/            # 24
│  └─ clothes/lower/
│     └─ denim-cuffed-jeans-01/
│        ├─ static.png
│        ├─ idle/              # 4
│        ├─ walk/              # 6
│        └─ manifest.json
├─ qa/
│  ├─ animation/
│  │  ├─ idle-default-composite-contact.png
│  │  └─ walk-default-composite-contact.png
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

## 헤어 파츠

갈색 헤어 **48스타일**을 실제 런타임 레이어로 변환했습니다.

- male 계열 24스타일
- female 계열 24스타일
- 각 스타일은 `hairBack` + `hairFront` 2장
- 총 헤어 레이어 PNG 96장
- 귀 영역은 front mask에서 제외해 베이스 귀가 앞에 보이도록 처리
- 생성 원본이 얼굴을 막는 경우 얼굴 파츠 충돌을 검사한 뒤 face aperture 적용
- 기본 얼굴을 넣은 contact sheet로 전체 조합 검수 완료

현재 색상은 warm medium brown 1종입니다. 형태 확정 뒤 팔레트 변환으로 색상 수를 늘릴 수 있습니다.

## 애니메이션

**Idle 4 + Walk 6, 총 10프레임**을 128×128 런타임 프레임으로 정규화했습니다.

- 기준 바닥선: y=124
- 기준 머리 영역: [40, 20, 91, 67]
- Idle: 3 fps
- Walk: 6 fps
- 프레임별 머리 중심 이동은 최대 약 0.5px
- 프레임별 머리 스케일 차이는 최대 약 1%
- 얼굴·헤어를 각 프레임 머리에 맞추기 위한 `headTransform` 저장
- 기본 얼굴 + 기본 헤어를 얹은 Idle/Walk contact sheet 시각 검수 완료

## 상의 파츠

첫 애니메이션 상의 **파란 별 집업 후드**를 런타임에 연결했습니다.

- 정지 1프레임
- Idle 4프레임
- Walk 6프레임
- 모든 프레임 128×128 RGBA
- 팔 움직임에 맞춘 소매 변형
- QA contact sheet에서 기존 데님 팬츠와 함께 10프레임 조합 검수 완료

## 하의 파츠

첫 애니메이션 하의 **커프 데님 팬츠**를 런타임에 연결했습니다.

- 정지 1프레임
- Idle 4프레임
- Walk 6프레임
- 모든 프레임 128×128 RGBA
- 흰 기본 반바지를 가리도록 몸체 위에 합성
- QA contact sheet에서 Idle/Walk 10프레임의 다리 동작과 겹침을 확인

따라서 현재 **base + face + hair + upper/lower clothes + idle/walk animation**까지 런타임 사용 가능한 상태입니다.

## 남은 작업

1. 상·하의 스타일 추가
2. 신발 / 액세서리 파츠 제작
3. 신발 / 액세서리 파츠 제작
4. 필요 시 독립 `hairSide` 파츠 추가
5. 헤어 색상 팔레트 확장
6. 이후 필요할 때 run / jump / hit 같은 추가 모션 제작

`source/`의 생성 원본은 게임에서 직접 렌더링하지 않습니다.

## Avatar Rig v2

새 파츠는 더 이상 128×128 전체 캔버스 안에서 눈대중으로 위치를 맞출 필요가 없습니다.

- 몸 기준점: `headTop`, `brow`, `eyeCenter`, `nose`, `mouth`, `earL/R`, `neck`, `root`, `handL/R`, `footL/R`
- 파츠 기준점: 각 PNG 내부의 `pivot: [x, y]`
- 배치: 파츠의 pivot을 같은 이름의 몸 anchor에 일치시킴
- 애니메이션: `transformGroup: "head"` 파츠는 현재 프레임의 `headTransform`을 자동 상속
- 앞뒤: `hairBack`, `body`, `face`, `hairFront`, `cap`, `weapon` 같은 이름 있는 z-slot 사용
- 호환성: 기존 저장 키 `kidscade-pixel-avatar-v1`과 `KidscadePixelAvatarV1` API 이름은 유지하며 내부 렌더러만 v2 rig를 사용

잘린 PNG를 새로 추가할 때 필요한 최소 메타데이터 예시는 다음과 같습니다.

```json
{
  "id": "red-nose-01",
  "src": "runtime/accessories/face/red-nose-01.png",
  "attach": "nose",
  "pivot": [8, 7],
  "transformGroup": "head",
  "zSlot": "faceAccessoryOver"
}
```

이 구조에서는 이미지 자체 크기가 달라도 `pivot`만 정확하면 코 위치에 자동으로 붙습니다. BBox는 원본을 정규화하는 용도로만 사용하고 장착 좌표의 기준으로 사용하지 않습니다.
