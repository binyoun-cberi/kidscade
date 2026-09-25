(function(){
'use strict';
const N={
  "hero": "아이",
  "wall": "벽",
  "rock": "돌",
  "flag": "깃발",
  "water": "물",
  "lava": "용암",
  "key": "열쇠",
  "door": "문",
  "ice": "얼음",
  "fire": "불"
};
const P={
  "YOU": "나",
  "STOP": "막힘",
  "PUSH": "밀림",
  "WIN": "목표",
  "DEFEAT": "위험",
  "SINK": "가라앉음",
  "HOT": "뜨거움",
  "MELT": "녹음",
  "OPEN": "열림",
  "SHUT": "잠김",
  "MOVE": "이동",
  "WEAK": "약함"
};
const levels=[
  {
    "title": "깃발까지 가요",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      }
    ],
    "hints": [
      "아이를 깃발까지 움직여 보세요."
    ],
    "note": "첫 단계만은 규칙을 읽고 걷는 연습이에요."
  },
  {
    "title": "돌을 밀어요",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "길 한가운데 돌이 있어요.",
      "돌 = 밀림이므로 끝까지 밀고 지나가세요."
    ],
    "note": "이번에는 그냥 걸어서는 목표에 닿을 수 없어요."
  },
  {
    "title": "벽 사이 길 찾기",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      }
    ],
    "hints": [
      "벽 = 막힘이에요.",
      "열려 있는 틈을 찾아 돌아가 보세요."
    ],
    "note": "규칙을 바꾸기 전에도 벽의 성질부터 읽어야 해요."
  },
  {
    "title": "밀리는 깃발을 멈춰",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 8,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "깃발을 밀기만 하면 끝까지 달아나요.",
      "아래의 깃발 = 밀림 문장을 끊어 보세요."
    ],
    "note": "목표도 성질 때문에 잡을 수 없을 수 있어요."
  },
  {
    "title": "벽의 법칙을 끊어라",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "가운데 벽은 돌아갈 수 없어요.",
      "벽 = 막힘 문장의 한 단어를 밀어 빼세요."
    ],
    "note": "규칙을 깨면 실제 벽의 충돌도 바로 사라져요."
  },
  {
    "title": "밀림을 완성해라",
    "chapter": "규칙의 문",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "아래 세로 문장을 보세요.",
      "밀림을 왼쪽으로 한 칸 밀어 돌 = 밀림을 완성하세요."
    ],
    "note": "정답 블록은 한 번만 밀면 되지만, 규칙을 만들지 않으면 절대 못 지나갑니다."
  },
  {
    "title": "지름길은 규칙 안에",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "벽 하나가 통로 전체를 막고 있어요.",
      "막힘 블록을 위아래로 빼세요."
    ],
    "note": "우회로가 없을 때는 법칙을 직접 고칩니다."
  },
  {
    "title": "돌이 목표",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "깃발은 벽 너머라 갈 수 없어요.",
      "돌 = 목표를 완성해 가까운 돌을 목표로 바꾸세요."
    ],
    "note": "목표 자체를 바꾸는 첫 문제예요."
  },
  {
    "title": "문이 목표",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "깃발까지는 벽이 막아요.",
      "문 = 목표를 완성하세요."
    ],
    "note": "가까운 물체를 새 목적지로 만들 수 있어요."
  },
  {
    "title": "위험을 지워라",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "불을 밟으면 사라져요.",
      "불 = 위험 문장을 끊은 뒤 지나가세요."
    ],
    "note": "위험을 피할 길이 없다면 위험이라는 성질을 없애면 돼요."
  },
  {
    "title": "가라앉지 않게",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "물을 그냥 건너면 아이도 같이 사라져요.",
      "물 = 가라앉음 문장을 끊으세요."
    ],
    "note": "상호작용 규칙도 직접 무효화할 수 있어요."
  },
  {
    "title": "벽에게 밀림을 줘",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "벽 = 막힘만으로는 못 지나가요.",
      "벽 = 밀림을 완성하면 가운데 벽을 밀 수 있어요."
    ],
    "note": "같은 물체에 막힘과 밀림을 함께 붙일 수 있어요."
  },
  {
    "title": "돌의 성질을 바꿔",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "돌은 막힘뿐이에요.",
      "아래 세로 문장의 밀림을 한 칸 옮겨 완성하세요."
    ],
    "note": "불필요한 블록 밀기를 줄이고 핵심 규칙만 보이게 했어요."
  },
  {
    "title": "새 주인공을 만들어",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "아이는 벽 왼쪽에 갇혔어요.",
      "돌 = 나를 완성하면 오른쪽 돌을 움직일 수 있어요."
    ],
    "note": "길을 여는 대신 다른 쪽에 새 주인공을 만들 수도 있어요."
  },
  {
    "title": "위험한 목표",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "깃발은 목표지만 동시에 위험해요.",
      "깃발 = 위험을 끊은 뒤 닿으세요."
    ],
    "note": "같은 물체에 좋은 성질과 나쁜 성질이 함께 붙을 수 있어요."
  },
  {
    "title": "두 법칙을 고쳐라",
    "chapter": "법칙을 깨라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 9
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 8,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 9
      }
    ],
    "hints": [
      "아래에는 세로 규칙 두 개가 있어요.",
      "위험과 막힘의 마지막 단어를 각각 옆으로 밀어 문장을 끊으세요."
    ],
    "note": "두 장애물의 규칙을 하나씩 제거해야 합니다."
  },
  {
    "title": "나는 돌이다",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 8
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "아이는 왼쪽 방에 갇혀 있어요.",
      "오른쪽 돌을 위쪽 깃발까지 미로처럼 움직여 보세요."
    ],
    "note": "조작 대상이 꼭 사람 모양일 필요는 없어요."
  },
  {
    "title": "돌에게 나를 줘",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "아이는 문을 넘지 못해요.",
      "돌 = 나를 완성하세요."
    ],
    "note": "나라는 성질을 다른 물체에게 넘깁니다."
  },
  {
    "title": "벽이 움직인다",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "ice",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 0,
        "y": 9
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 1,
        "y": 9
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 2,
        "y": 9
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 3,
        "y": 9
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 3,
        "y": 8
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 8
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 2
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 8
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 10,
        "y": 4
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "아이 대신 오른쪽 벽 하나를 움직여요.",
      "얼음 미로의 틈을 찾아 깃발까지 가세요."
    ],
    "note": "벽도 나가 되면 캐릭터처럼 움직입니다."
  },
  {
    "title": "물이 움직인다",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "아이 대신 물을 주인공으로 만들어야 해요.",
      "물 = 나를 완성하세요."
    ],
    "note": "배경처럼 보이는 것도 조작 대상이 될 수 있어요."
  },
  {
    "title": "둘이 같은 방향",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 8
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "아이와 돌이 같이 움직이지만 아이는 방 안에서 막혀요.",
      "돌의 위치만 보면서 미로를 빠져나가세요."
    ],
    "note": "장애물을 이용하면 동시에 움직이는 둘의 위치를 어긋나게 할 수 있어요."
  },
  {
    "title": "문에게 나를 줘",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "아이는 벽을 넘지 못해요.",
      "문 = 나를 완성해 오른쪽 문을 움직이세요."
    ],
    "note": "정적인 물체도 규칙 하나로 주인공이 됩니다."
  },
  {
    "title": "깃발이 주인공",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 6,
        "y": 8
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "이번엔 깃발이 주인공이고 돌이 목표예요.",
      "깃발을 미로 위쪽의 돌까지 이동시키세요."
    ],
    "note": "주인공과 목표의 역할을 뒤집어 봅니다."
  },
  {
    "title": "문으로 걷기",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "오른쪽 문을 움직여야 해요.",
      "문 = 나를 완성하세요."
    ],
    "note": "같은 원리도 다른 배치에서 다시 써 봅니다."
  },
  {
    "title": "세로로 나를 만들어",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "이번 문장은 가로로는 완성되지 않아요.",
      "나 블록을 왼쪽으로 옮긴 뒤 세로 문장을 만들어 보세요."
    ],
    "note": "규칙은 가로와 세로 모두 읽힙니다."
  },
  {
    "title": "세 명의 나",
    "chapter": "나는 누구?",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 9
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 8
      },
      {
        "kind": "object",
        "type": "water",
        "x": 6,
        "y": 7
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "돌과 물이 동시에 움직여요.",
      "서로 다른 시작 위치 때문에 미로에서 움직임이 달라집니다."
    ],
    "note": "여러 주인공의 위치 차이를 이용하는 연습이에요."
  },
  {
    "title": "돌이 물이 된다",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "첫 움직임 뒤 돌이 물로 바뀌어요.",
      "바뀐 뒤에는 막힘이 사라집니다."
    ],
    "note": "변환 규칙을 먼저 체험해 봅니다."
  },
  {
    "title": "변환을 완성해",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "돌 = 물을 세로로 완성하세요.",
      "물 블록을 왼쪽으로 한 칸 밀면 됩니다."
    ],
    "note": "변환을 만들지 않으면 돌의 막힘이 유지됩니다."
  },
  {
    "title": "물길을 돌길로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "물 = 돌을 세로로 완성하세요.",
      "바뀐 돌은 돌 = 밀림 덕분에 치울 수 있어요."
    ],
    "note": "변환 뒤의 성질까지 읽어야 합니다."
  },
  {
    "title": "벽을 돌로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "벽은 막힘이에요.",
      "벽 = 돌을 완성하면 밀 수 있는 돌이 돼요."
    ],
    "note": "정체성을 바꿔 장애물의 성질을 갈아치웁니다."
  },
  {
    "title": "불을 물로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "불 = 물을 완성하세요.",
      "물 블록을 왼쪽 한 칸 밀면 위험한 불이 사라집니다."
    ],
    "note": "위험을 피할 길은 없고 변환이 필수입니다."
  },
  {
    "title": "문이 깃발로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "기존 깃발은 벽 너머예요.",
      "문 = 깃발을 완성해 가까운 목표를 만드세요."
    ],
    "note": "변환으로 목표 물체 자체를 만들어 냅니다."
  },
  {
    "title": "돌을 깃발로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "돌이 길을 막고 있어요.",
      "돌 = 깃발을 만들면 장애물이 바로 목표가 됩니다."
    ],
    "note": "한 번의 변환으로 장애물과 목표를 동시에 해결합니다."
  },
  {
    "title": "아이를 돌로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:hero",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "아이 = 돌을 완성하세요.",
      "그대로 물과 겹치면 약함 때문에 아이가 사라져요."
    ],
    "note": "자기 정체성을 바꿔야만 통로를 건널 수 있습니다."
  },
  {
    "title": "얼음을 물로",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "얼음 = 물을 세로로 완성하세요."
    ],
    "note": "얼음이 막힘인 동안은 통과할 수 없습니다."
  },
  {
    "title": "두 번 변신",
    "chapter": "세상을 바꿔라",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "한 번 움직이면 돌→물, 한 번 더 움직이면 물→깃발이에요.",
      "새 깃발에 닿아 보세요."
    ],
    "note": "변환은 한 단계로 끝나지 않을 수도 있어요."
  },
  {
    "title": "위험을 물에 밀어",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "불은 위험하지만 밀 수 있어요.",
      "불을 물까지 밀어 둘 다 가라앉히세요."
    ],
    "note": "위험한 물체도 다른 상호작용으로 없앨 수 있어요."
  },
  {
    "title": "용암 처리",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "lava",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:lava",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:lava",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "용암을 정면으로 밟으면 안 돼요.",
      "물까지 밀어 넣으세요."
    ],
    "note": "같은 조합을 다른 물체에 적용합니다."
  },
  {
    "title": "돌다리 하나",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "물을 그냥 밟으면 사라져요.",
      "돌을 물에 밀어 둘 다 없애세요."
    ],
    "note": "밀림과 가라앉음을 한 번에 이용합니다."
  },
  {
    "title": "두 번 가라앉혀",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 3,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "물 두 칸을 모두 없애야 해요.",
      "돌 두 개를 차례대로 밀어 넣으세요."
    ],
    "note": "같은 상호작용을 연속으로 계획합니다."
  },
  {
    "title": "얼음과 불",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:HOT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:MELT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 8
      }
    ],
    "hints": [
      "얼음을 밟으면 위험해요.",
      "불을 밀어 얼음과 겹치게 하세요."
    ],
    "note": "뜨거움과 녹음이 만나면 얼음만 사라집니다."
  },
  {
    "title": "얼음 두 장",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 3,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:HOT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:MELT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 8
      }
    ],
    "hints": [
      "불 하나로 얼음을 차례대로 녹여야 해요.",
      "계속 밀어 두 얼음과 만나게 하세요."
    ],
    "note": "하나의 도구를 여러 번 사용하는 문제예요."
  },
  {
    "title": "열쇠와 문",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:OPEN",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 8
      }
    ],
    "hints": [
      "문을 그냥 밟으면 위험해요.",
      "열쇠를 문까지 밀어 둘 다 없애세요."
    ],
    "note": "열림과 잠김은 서로 만나면 함께 사라집니다."
  },
  {
    "title": "문 두 개",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 2,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 3,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:OPEN",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 8
      }
    ],
    "hints": [
      "열쇠 두 개를 각각 문에 써야 해요.",
      "순서를 잘 잡아 하나씩 밀어 주세요."
    ],
    "note": "두 개의 자원을 두 장애물에 배분합니다."
  },
  {
    "title": "밀림을 만들어 물에",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "먼저 돌 = 밀림을 완성하세요.",
      "그다음 돌을 물에 밀어 둘 다 없애세요."
    ],
    "note": "규칙 만들기 뒤에 상호작용까지 이어지는 문제입니다."
  },
  {
    "title": "열쇠에게 밀림을",
    "chapter": "두 법칙",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:OPEN",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 9,
        "y": 8
      }
    ],
    "hints": [
      "열쇠가 있어도 아직 밀 수 없어요.",
      "열쇠 = 밀림을 완성한 뒤 문까지 보내세요."
    ],
    "note": "상호작용에 필요한 성질부터 직접 만들어야 합니다."
  },
  {
    "title": "혼자 움직이는 돌",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "내가 한 번 움직일 때마다 돌도 움직여요.",
      "돌의 움직임을 보며 따라가세요."
    ],
    "note": "자동 이동을 처음 관찰하는 단계예요."
  },
  {
    "title": "움직이는 목표",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 7,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      }
    ],
    "hints": [
      "깃발이 매 턴 움직여요.",
      "끝에서 방향을 바꾸는 순간을 노려 보세요."
    ],
    "note": "목표도 움직일 수 있어요."
  },
  {
    "title": "움직이는 위험",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 7,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 2
      }
    ],
    "hints": [
      "불과 같은 줄에서 계속 달리면 서로 엇갈리기만 해요.",
      "x=4의 아래쪽 틈으로 잠깐 빠져 불을 먼저 보내고 다시 올라오세요."
    ],
    "note": "자동 이동 물체와 속도가 같을 때는 옆 공간에서 한 턴을 보내 상대 위치를 바꿀 수 있어요."
  },
  {
    "title": "움직임을 끊어",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 6,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 9
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 8,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 9
      }
    ],
    "hints": [
      "돌은 이동하면서 막고 있어요.",
      "이동과 막힘 두 세로 문장의 마지막 단어를 옆으로 밀어 끊으세요."
    ],
    "note": "자동 이동만 멈춰서는 부족하고 막힘까지 해제해야 합니다."
  },
  {
    "title": "움직이는 불을 약하게",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "water",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "불 = 약함을 완성하세요.",
      "움직이는 불이 물과 겹치면 불만 사라집니다."
    ],
    "note": "정답 규칙을 한 번 만들어 자동 이동을 이용합니다."
  },
  {
    "title": "약한 돌",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "돌을 물까지 밀어도 원래는 그대로 남아요.",
      "돌 = 약함을 완성해 물과 만났을 때 부서지게 하세요."
    ],
    "note": "약함은 다른 물체와 겹쳤을 때 자기 자신을 없앱니다."
  },
  {
    "title": "움직이는 열쇠",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 4,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:OPEN",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 8
      }
    ],
    "hints": [
      "열쇠가 스스로 문 쪽으로 움직여요.",
      "문이 사라지는 순간 길을 지나가세요."
    ],
    "note": "자동 이동이 상호작용을 대신 수행할 수도 있어요."
  },
  {
    "title": "움직이는 불을 물로",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "불 = 물을 완성하세요.",
      "움직이는 위험 자체를 안전한 물로 바꾸세요."
    ],
    "note": "자동 이동 중인 물체의 정체성을 바꿉니다."
  },
  {
    "title": "둘이 움직이고 목표도 움직여",
    "chapter": "규칙 연구소",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 8,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "깃발이 움직여 아이 혼자서는 따라잡기 어려워요.",
      "돌 = 나를 완성해 더 가까운 돌도 함께 움직이세요."
    ],
    "note": "여러 주인공과 움직이는 목표를 한꺼번에 다룹니다."
  },
  {
    "title": "위험한 벽을 바꿔라",
    "chapter": "금지된 실험",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "불 = 물을 완성하세요."
    ],
    "note": "최종 구역에서는 배운 변환을 빠르게 다시 사용합니다."
  },
  {
    "title": "열쇠가 목표다",
    "chapter": "금지된 실험",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "key",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "door",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "문 너머 깃발을 고집할 필요가 없어요.",
      "열쇠 = 목표를 완성하세요."
    ],
    "note": "물건의 평소 역할보다 현재 규칙이 더 중요합니다."
  },
  {
    "title": "움직이는 위험을 약하게",
    "chapter": "금지된 실험",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 6,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "water",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:MOVE",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 3,
        "y": 9
      }
    ],
    "hints": [
      "불 = 약함을 완성하세요.",
      "움직이는 불이 물과 만나 스스로 부서지게 하세요."
    ],
    "note": "규칙 생성과 자동 이동을 결합합니다."
  },
  {
    "title": "세상이 차례로 나",
    "chapter": "금지된 실험",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 8,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 11,
        "y": 8
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "먼저 돌 = 나를 완성하세요.",
      "오른쪽 돌이 움직여 물 = 나의 마지막 블록을 밀 수 있어요.",
      "그다음 물이 깃발에 닿게 하세요."
    ],
    "note": "한 주인공을 만들어 다음 주인공의 규칙을 완성하는 연쇄 문제예요."
  },
  {
    "title": "마지막 법칙",
    "chapter": "금지된 실험",
    "w": 12,
    "h": 10,
    "objects": [
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 4
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 11,
        "y": 6
      },
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 10,
        "y": 5
      }
    ],
    "words": [
      {
        "kind": "word",
        "token": "N:hero",
        "x": 0,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 2,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 4,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 8,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 0,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 3,
        "y": 9
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 8,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 7,
        "y": 9
      }
    ],
    "hints": [
      "왼쪽 아래에서 물 블록을 왼쪽으로 밀어 돌 = 물을 먼저 완성하세요.",
      "오른쪽 아래에서는 목표 블록을 오른쪽으로 밀어 물 = 목표를 완성하세요.",
      "깃발까지 가지 말고 방금 만든 물에 닿으세요."
    ],
    "note": "마지막 문제는 변환한 결과물을 다시 목표로 바꾸는 두 단계 퍼즐입니다."
  }
];
window.RuleLabData={levels,N,P};
})();
