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
    "w": 11,
    "h": 9,
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
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 8,
        "y": 0
      }
    ],
    "hints": [
      "아이를 깃발까지 움직여 보세요."
    ],
    "note": "문장이 실제로 세상의 법칙이 되는지 확인해 봐요."
  },
  {
    "title": "돌을 밀어요",
    "chapter": "규칙의 문",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "token": "P:PUSH",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 1
      }
    ],
    "hints": [
      "돌 = 밀림이면 돌을 앞으로 밀 수 있어요."
    ],
    "note": "물체의 성질은 규칙 문장이 정해요."
  },
  {
    "title": "벽은 못 지나가요",
    "chapter": "규칙의 문",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
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
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
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
        "token": "N:wall",
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
        "token": "P:STOP",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "벽 = 막힘이에요. 가운데 빈칸을 찾아보세요."
    ],
    "note": "규칙을 바꾸지 않아도 먼저 읽는 습관이 중요해요."
  },
  {
    "title": "밀리는 목표",
    "chapter": "규칙의 문",
    "w": 11,
    "h": 9,
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
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 4,
        "y": 7
      }
    ],
    "hints": [
      "깃발이 계속 밀려서 닿을 수 없어요.",
      "아래에서 밀림 블록을 위로 밀어 깃발 = 밀림을 끊으세요."
    ],
    "note": "좋은 성질도 상황에 따라 방해가 될 수 있어요."
  },
  {
    "title": "벽의 법칙을 끊어라",
    "chapter": "규칙의 문",
    "w": 11,
    "h": 9,
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
        "x": 8,
        "y": 5
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
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 3,
        "y": 7
      }
    ],
    "hints": [
      "깃발이 벽 안에 갇혀 있어요.",
      "막힘 블록을 아래나 위로 밀어 문장을 끊어 보세요."
    ],
    "note": "세 칸이 이어진 문장만 법칙이 됩니다."
  },
  {
    "title": "밀림을 완성해라",
    "chapter": "규칙의 문",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
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
        "token": "P:PUSH",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "밀림 블록을 왼쪽으로 한 칸 밀어 보세요.",
      "돌 = 밀림이 완성되면 길을 열 수 있어요."
    ],
    "note": "새 법칙을 직접 완성하는 첫 실험이에요."
  },
  {
    "title": "지름길 만들기",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
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
        "x": 8,
        "y": 5
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
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 1,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 3,
        "y": 7
      }
    ],
    "hints": [
      "벽 안의 목표에는 그대로 들어갈 수 없어요.",
      "벽 = 막힘의 한 단어를 세로로 밀어 빼세요."
    ],
    "note": "막힌 세계에서는 규칙 자체가 길이에요."
  },
  {
    "title": "돌이 목표",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "flag",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 0
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 1
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
        "x": 6,
        "y": 3
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
        "x": 6,
        "y": 5
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
        "x": 6,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
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
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 5,
        "y": 7
      }
    ],
    "hints": [
      "깃발이 벽 너머라면 다른 목표를 만들 수 있어요.",
      "목표 블록을 왼쪽으로 밀어 돌 = 목표를 만드세요."
    ],
    "note": "목표도 고정된 것이 아니에요."
  },
  {
    "title": "문이 목표",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "door",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
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
        "token": "N:door",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 5,
        "y": 7
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 10,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 2
      }
    ],
    "hints": [
      "가까운 문을 목표로 바꿔 보세요."
    ],
    "note": "눈에 띄는 깃발이 항상 정답은 아니에요."
  },
  {
    "title": "위험을 지워라",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
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
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 4,
        "y": 7
      }
    ],
    "hints": [
      "불을 피할 공간이 없어요.",
      "위험 블록을 위나 아래로 밀어 문장을 끊으세요."
    ],
    "note": "위험한 물체보다 위험이라는 규칙을 없앨 수 있어요."
  },
  {
    "title": "목표를 새로 만들기",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
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
        "x": 9,
        "y": 2
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
        "x": 8,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 1
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
        "x": 9,
        "y": 3
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 3
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
        "x": 10,
        "y": 2
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
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
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 5,
        "y": 7
      }
    ],
    "hints": [
      "깃발 대신 가까운 돌을 목표로 바꿔 보세요."
    ],
    "note": "하나의 속성은 여러 물체가 가질 수 있어요."
  },
  {
    "title": "막힘과 밀림",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 3
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
        "x": 5,
        "y": 5
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
        "x": 5,
        "y": 7
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
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
        "token": "P:STOP",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 8,
        "y": 8
      }
    ],
    "hints": [
      "벽은 지금 막힘이에요.",
      "밀림을 왼쪽으로 밀어 벽 = 밀림도 만들면 벽을 밀 수 있어요."
    ],
    "note": "같은 물체에 막힘과 밀림이 함께 있어도 밀림을 이용할 수 있어요."
  },
  {
    "title": "문장을 비틀어",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 4,
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
        "type": "wall",
        "x": 6,
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
        "type": "wall",
        "x": 8,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 5
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
        "x": 1,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
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
        "x": 9,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 7
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 4
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 4
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 6,
        "y": 4
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:PUSH",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "돌은 막힘과 밀림을 함께 가지고 있어요.",
      "위쪽 돌 = 막힘 문장에서 가운데 글자를 세로로 밀어 빼 보세요."
    ],
    "note": "규칙 문장은 옆으로만 밀 필요가 없어요."
  },
  {
    "title": "나를 만들고 탈출",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 5
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
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
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
        "x": 0,
        "y": 7
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
        "x": 3,
        "y": 7
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
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 7,
        "y": 7
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
      }
    ],
    "hints": [
      "갇힌 아이만으로는 깃발에 갈 수 없어요.",
      "돌 = 나를 먼저 완성하세요."
    ],
    "note": "새로운 '나'를 만들면 기존 주인공이 갇혀 있어도 괜찮아요."
  },
  {
    "title": "위험한 목표",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
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
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 3,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 4,
        "y": 7
      }
    ],
    "hints": [
      "깃발은 목표이면서 위험해요.",
      "위험 블록을 세로로 밀어 규칙을 끊고 나서 깃발로 가세요."
    ],
    "note": "좋은 성질과 나쁜 성질이 동시에 붙을 수도 있어요."
  },
  {
    "title": "법칙 두 개 끊기",
    "chapter": "법칙을 깨라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 6
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
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 5
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
        "x": 9,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 7
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
        "x": 10,
        "y": 6
      },
      {
        "kind": "object",
        "type": "fire",
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
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 0,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 7
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 4,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 6,
        "y": 7
      }
    ],
    "hints": [
      "불도 위험하고 목표도 벽 안에 있어요.",
      "두 문장의 마지막 단어를 각각 세로로 밀어 빼세요."
    ],
    "note": "한 단계에서 여러 법칙을 순서대로 손볼 수 있어요."
  },
  {
    "title": "나는 돌이다",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 0,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 5
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
        "x": 0,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 8
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 8
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
        "x": 0,
        "y": 7
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
        "x": 3,
        "y": 7
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "바깥의 돌도 이미 '나'예요.",
      "돌을 깃발까지 움직여 보세요."
    ],
    "note": "조작 대상은 캐릭터 모양일 필요가 없어요."
  },
  {
    "title": "돌에게 나를 줘",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 5,
        "y": 6
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
        "x": 9,
        "y": 2
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
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
      "나 블록을 왼쪽으로 밀어 돌 = 나를 만드세요."
    ],
    "note": "조작 권한도 이동 가능한 규칙이에요."
  },
  {
    "title": "벽이 움직인다",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
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
        "y": 4
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
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
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
        "token": "N:wall",
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "벽 전체가 방향키에 반응해요.",
      "먼저 벽을 움직여 통로를 만드세요."
    ],
    "note": "같은 종류의 물체는 모두 같은 규칙을 받아요."
  },
  {
    "title": "물이 움직인다",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 7
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
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
        "token": "N:water",
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "물도 나가 될 수 있어요.",
      "물기둥을 옮겨 길을 비우세요."
    ],
    "note": "평범한 배경처럼 보이는 것도 플레이어가 될 수 있어요."
  },
  {
    "title": "둘이 같은 방향",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 3
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
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "아이와 돌은 동시에 움직여요.",
      "벽에 한쪽만 걸리게 해 둘의 위치 차이를 바꿔 보세요."
    ],
    "note": "여러 '나'를 장애물로 서로 다른 위치에 맞출 수 있어요."
  },
  {
    "title": "아이를 멈추고 돌만",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
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
        "x": 3,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 3,
        "y": 7
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
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
        "token": "P:STOP",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "아이 앞은 벽으로 막혀 있어요.",
      "그동안 돌을 움직여 깃발에 보내세요."
    ],
    "note": "동시 조작도 지형을 이용하면 원하는 대상만 움직일 수 있어요."
  },
  {
    "title": "깃발이 주인공",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 9,
        "y": 3
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "이번 목표는 돌이에요.",
      "깃발을 직접 움직여 돌에 닿아 보세요."
    ],
    "note": "목표와 주인공의 역할을 뒤집을 수 있어요."
  },
  {
    "title": "문으로 걷기",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "door",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
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
        "token": "N:door",
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "문도 움직일 수 있어요.",
      "문을 위쪽 깃발로 보내세요."
    ],
    "note": "정적인 물체도 '나'가 붙는 순간 캐릭터가 됩니다."
  },
  {
    "title": "새 주인공 만들기",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 2,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 0
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 1
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
        "x": 5,
        "y": 3
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
        "x": 5,
        "y": 5
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
        "x": 5,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
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
        "token": "N:rock",
        "x": 6,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 7,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 9,
        "y": 7
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "벽 반대편의 돌을 움직일 방법을 만드세요.",
      "나 블록을 왼쪽으로 밀어 돌 = 나를 완성하세요."
    ],
    "note": "규칙을 만들어 다른 구역에 새 주인공을 세울 수 있어요."
  },
  {
    "title": "세 명의 나",
    "chapter": "나는 누구?",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 8,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 5
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
        "x": 6,
        "y": 7
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
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
        "token": "P:YOU",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      }
    ],
    "hints": [
      "세 종류가 동시에 움직입니다.",
      "벽에 걸리는 대상과 움직이는 대상을 관찰하세요."
    ],
    "note": "여러 플레이어의 상대 위치를 이용하는 단계예요."
  },
  {
    "title": "돌이 물이 된다",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
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
        "token": "N:water",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "한 번 움직여 보면 돌이 물로 바뀝니다."
    ],
    "note": "이름 = 이름은 물체의 종류 자체를 바꿔요."
  },
  {
    "title": "변환을 완성해",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 6,
        "y": 6
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
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
        "token": "N:water",
        "x": 4,
        "y": 8
      }
    ],
    "hints": [
      "물 블록을 왼쪽으로 밀어 돌 = 물을 완성하세요."
    ],
    "note": "변환 규칙도 직접 만들 수 있어요."
  },
  {
    "title": "물길을 돌길로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
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
        "token": "P:PUSH",
        "x": 6,
        "y": 0
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
        "token": "N:rock",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "물을 돌로 바꾸면 밀 수 있는 물체가 돼요.",
      "변환 뒤에 적용될 규칙까지 생각해 보세요."
    ],
    "note": "새 이름이 가진 성질도 즉시 적용돼요."
  },
  {
    "title": "벽을 돌로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 3
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
        "x": 5,
        "y": 5
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
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
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
        "token": "P:PUSH",
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
        "token": "N:rock",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "벽을 돌로 바꾸면 밀어낼 수 있어요."
    ],
    "note": "통과할 수 없다면 물체의 정체성을 바꿔요."
  },
  {
    "title": "불을 물로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 4
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 6
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:DEFEAT",
        "x": 6,
        "y": 0
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
        "token": "N:water",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "위험을 끊지 말고 불 자체를 물로 바꿔 보세요."
    ],
    "note": "변환은 위험 규칙을 우회하는 또 다른 방법이에요."
  },
  {
    "title": "문이 깃발로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "door",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
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
        "x": 3,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 10,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 2
      }
    ],
    "hints": [
      "문을 깃발로 바꾸면 가까운 곳에 목표가 생겨요."
    ],
    "note": "목표 물체를 새로 만들어 낼 수도 있어요."
  },
  {
    "title": "돌을 깃발로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 9,
        "y": 2
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
        "y": 0
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
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
        "x": 8,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 8,
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
        "x": 3,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 10,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 2
      }
    ],
    "hints": [
      "돌을 깃발로 바꿔 가까운 목표를 만드세요."
    ],
    "note": "변환과 목표 규칙이 결합됩니다."
  },
  {
    "title": "아이를 돌로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:hero",
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
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "첫 움직임 뒤 아이가 돌로 바뀌어도 계속 조작할 수 있어요."
    ],
    "note": "변환 뒤에도 '나' 규칙이 남아 있어야 조작할 수 있어요."
  },
  {
    "title": "얼음을 물로",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 3
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
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:ice",
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
        "token": "N:water",
        "x": 3,
        "y": 8
      }
    ],
    "hints": [
      "얼음을 물로 바꿔 통과하세요."
    ],
    "note": "보이는 모습과 실제 규칙을 구분해 보세요."
  },
  {
    "title": "두 번 변신",
    "chapter": "세상을 바꿔라",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "N:water",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "돌은 먼저 물이 되고 다음 움직임에 깃발이 됩니다.",
      "변환 규칙이 연속으로 이어질 수도 있어요."
    ],
    "note": "한 턴씩 세상의 이름이 바뀌는 실험이에요."
  },
  {
    "title": "불은 위험해",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:DEFEAT",
        "x": 6,
        "y": 0
      }
    ],
    "hints": [
      "불을 밟으면 아이가 사라져요.",
      "위험을 피해서 돌아가세요."
    ],
    "note": "상호작용 규칙을 읽는 구역이에요."
  },
  {
    "title": "위험도 밀린다",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:lava",
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
        "token": "N:lava",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "용암은 위험하지만 동시에 밀림이에요.",
      "옆으로 밀어 통로를 만드세요."
    ],
    "note": "한 물체의 여러 성질을 함께 이용해요."
  },
  {
    "title": "돌다리 하나",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "water",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:PUSH",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "돌을 물에 밀어 넣으면 둘 다 사라져요."
    ],
    "note": "가라앉음은 장애물을 없애는 도구가 될 수 있어요."
  },
  {
    "title": "두 개의 돌다리",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 2,
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
        "type": "water",
        "x": 5,
        "y": 2
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:PUSH",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "돌 두 개를 어디에 쓸지 순서가 중요해요."
    ],
    "note": "같은 규칙도 배치에 따라 더 어려운 퍼즐이 됩니다."
  },
  {
    "title": "얼음과 불",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:HOT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:MELT",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "불을 밀어 얼음에 닿게 하세요.",
      "뜨거움과 녹음이 만나면 녹는 쪽이 사라져요."
    ],
    "note": "서로 짝이 되는 속성이 있어요."
  },
  {
    "title": "뜨거운 벽",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 3
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
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 6,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:HOT",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:ice",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:MELT",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "불을 얼음벽 쪽으로 밀어 길을 만드세요."
    ],
    "note": "하나의 상호작용으로 여러 장애물을 처리할 수 있어요."
  },
  {
    "title": "열쇠와 문",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
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
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 3
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
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 7,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:OPEN",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "열쇠를 문까지 밀어 보세요.",
      "열림과 잠김이 만나면 둘 다 사라져요."
    ],
    "note": "문을 여는 행동도 규칙 반응으로 표현돼요."
  },
  {
    "title": "열쇠 두 개",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
      },
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:OPEN",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "열쇠를 하나씩 써야 해요."
    ],
    "note": "자원을 어떤 순서로 사용할지도 퍼즐이 됩니다."
  },
  {
    "title": "막힘이면서 밀림",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 9,
        "y": 5
      },
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:STOP",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "돌은 막힘이지만 밀림이기도 해요.",
      "밀림이 있으면 밀어낼 수 있어요."
    ],
    "note": "성질이 여러 개 붙었을 때 어떤 것이 우선하는지 관찰하세요."
  },
  {
    "title": "두 번 열리는 길",
    "chapter": "두 법칙",
    "w": 11,
    "h": 9,
    "objects": [
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
        "type": "door",
        "x": 4,
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
        "type": "water",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:OPEN",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 1
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 4,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 5,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 6,
        "y": 1
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 8,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:SINK",
        "x": 10,
        "y": 1
      }
    ],
    "hints": [
      "먼저 열쇠를 문에 밀어 넣으세요.",
      "그다음 돌을 물에 밀어 넣으면 두 번째 길이 열려요."
    ],
    "note": "서로 다른 두 상호작용을 순서대로 연결하는 단계예요."
  },
  {
    "title": "혼자 움직이는 돌",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      },
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
        "x": 0,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 7
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
        "x": 9,
        "y": 7
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 10,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:PUSH",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "내가 움직일 때마다 돌도 한 칸씩 움직여요.",
      "돌의 자동 이동을 이용해 통로를 비우세요."
    ],
    "note": "이동 규칙은 매 턴 스스로 움직이게 해요."
  },
  {
    "title": "움직이는 목표",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 6,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 5,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 7,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "깃발이 매 턴 좌우로 움직여요.",
      "벽에서 되돌아오는 순간을 이용하세요."
    ],
    "note": "목표가 가만히 있을 필요도 없어요."
  },
  {
    "title": "움직이는 위험",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 6
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
        "x": 2,
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "불이 좌우로 순찰해요.",
      "불의 위치를 보고 움직이세요."
    ],
    "note": "자동 이동과 위험이 결합됩니다."
  },
  {
    "title": "약한 벽",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 3
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
        "x": 5,
        "y": 5
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
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
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
        "token": "P:WEAK",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "약한 물체는 다른 물체와 겹치면 부서져요.",
      "벽에 직접 부딪혀 길을 내세요."
    ],
    "note": "약함은 접촉을 이용한 파괴 규칙이에요."
  },
  {
    "title": "약한 돌",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 6,
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:rock",
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
        "token": "P:PUSH",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "약한 돌을 다른 물체와 만나게 해 없앨 수 있어요.",
      "돌을 물 쪽으로 밀어 보세요."
    ],
    "note": "없애고 싶은 물체에 약함을 이용할 수 있어요."
  },
  {
    "title": "약한 얼음벽",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 2
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 3
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
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "ice",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
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
        "token": "P:WEAK",
        "x": 2,
        "y": 8
      }
    ],
    "hints": [
      "얼음벽은 막힘 규칙이 없고 약함만 있어요.",
      "직접 닿아 하나씩 부수며 지나가세요."
    ],
    "note": "규칙을 읽으면 벽처럼 보이는 것도 두렵지 않아요."
  },
  {
    "title": "움직이는 열쇠",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "key",
        "x": 3,
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
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 1,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:OPEN",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:SHUT",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "열쇠가 자동으로 움직여요.",
      "열쇠가 문에 닿을 때까지 버티며 위치를 맞추세요."
    ],
    "note": "자동 이동도 다른 상호작용과 연결할 수 있어요."
  },
  {
    "title": "움직이는 불을 물로",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 3,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 5,
        "y": 2
      }
    ],
    "hints": [
      "불을 피하기만 하지 말고 물로 바꿀 수도 있어요.",
      "위쪽 변환 문장을 완성하세요."
    ],
    "note": "이동·위험·변환을 한 번에 다루는 단계예요."
  },
  {
    "title": "두 명과 움직이는 목표",
    "chapter": "규칙 연구소",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 7,
        "y": 3,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 9,
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
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
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
        "token": "P:YOU",
        "x": 6,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:flag",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "아이와 돌이 같이 움직이고 목표도 움직여요.",
      "벽을 이용해 둘의 상대 위치를 바꾸세요."
    ],
    "note": "여러 자동·수동 규칙이 동시에 작동합니다."
  },
  {
    "title": "위험한 벽을 바꿔라",
    "chapter": "금지된 실험",
    "w": 11,
    "h": 9,
    "objects": [
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
        "y": 2
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 3
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 4
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 6
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 7
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "N:fire",
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
        "token": "N:water",
        "x": 7,
        "y": 8
      }
    ],
    "hints": [
      "불벽을 피할 수 없다면 종류를 바꾸세요.",
      "불 = 물을 완성하세요."
    ],
    "note": "후반부에서는 규칙을 없애는 것보다 바꾸는 편이 빠를 수 있어요."
  },
  {
    "title": "열쇠가 목표다",
    "chapter": "금지된 실험",
    "w": 11,
    "h": 9,
    "objects": [
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
        "x": 9,
        "y": 2
      },
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:PUSH",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:key",
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
        "token": "P:WIN",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:door",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "문을 열 필요가 없을 수도 있어요.",
      "열쇠 = 목표를 완성하세요."
    ],
    "note": "익숙한 물건의 용도도 규칙으로 뒤집을 수 있어요."
  },
  {
    "title": "움직이는 위험을 약하게",
    "chapter": "금지된 실험",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "fire",
        "x": 5,
        "y": 5,
        "dir": 1
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 7,
        "y": 5
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 6
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 2,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "P:MOVE",
        "x": 2,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:DEFEAT",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:fire",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 3,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:WEAK",
        "x": 5,
        "y": 2
      }
    ],
    "hints": [
      "움직이는 불에 약함을 붙여 없앨 방법을 찾아보세요.",
      "불 = 약함 문장을 완성한 뒤 다른 물체와 만나게 하세요."
    ],
    "note": "새 규칙을 만들어 자동 위험을 제거하는 종합 문제예요."
  },
  {
    "title": "세상이 전부 나",
    "chapter": "금지된 실험",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 6
      },
      {
        "kind": "object",
        "type": "water",
        "x": 7,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 2
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
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 5,
        "y": 7
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
        "x": 3,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 4,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 5,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:water",
        "x": 7,
        "y": 8
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 8
      },
      {
        "kind": "word",
        "token": "P:YOU",
        "x": 10,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:flag",
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 0,
        "y": 1
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 1,
        "y": 1
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 2,
        "y": 1
      }
    ],
    "hints": [
      "돌과 물에게도 '나'를 붙일 수 있어요.",
      "장애물에 걸리는 대상을 이용해 위치 차이를 만드세요."
    ],
    "note": "여러 종류의 플레이어를 동시에 설계하는 마지막 연습이에요."
  },
  {
    "title": "마지막 법칙",
    "chapter": "금지된 실험",
    "w": 11,
    "h": 9,
    "objects": [
      {
        "kind": "object",
        "type": "hero",
        "x": 1,
        "y": 6
      },
      {
        "kind": "object",
        "type": "rock",
        "x": 4,
        "y": 6
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
        "x": 6,
        "y": 3
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
        "x": 6,
        "y": 5
      },
      {
        "kind": "object",
        "type": "wall",
        "x": 6,
        "y": 6
      },
      {
        "kind": "object",
        "type": "flag",
        "x": 9,
        "y": 5
      },
      {
        "kind": "object",
        "type": "fire",
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
        "x": 8,
        "y": 0
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 9,
        "y": 0
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 10,
        "y": 0
      },
      {
        "kind": "word",
        "token": "N:fire",
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
        "token": "N:rock",
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
        "token": "P:PUSH",
        "x": 6,
        "y": 8
      },
      {
        "kind": "word",
        "token": "N:rock",
        "x": 1,
        "y": 2
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 2,
        "y": 2
      },
      {
        "kind": "word",
        "token": "P:WIN",
        "x": 4,
        "y": 2
      },
      {
        "kind": "word",
        "token": "N:wall",
        "x": 7,
        "y": 7
      },
      {
        "kind": "word",
        "token": "EQ",
        "x": 8,
        "y": 7
      },
      {
        "kind": "word",
        "token": "P:STOP",
        "x": 9,
        "y": 7
      }
    ],
    "hints": [
      "깃발만 바라보면 불과 벽이 막아요.",
      "돌 = 목표를 완성해 가까운 돌을 새로운 목표로 만드세요.",
      "마지막에는 '어디로 갈까'보다 '무엇을 목표로 만들까'를 먼저 생각하세요."
    ],
    "note": "규칙을 읽고, 끊고, 만들고, 바꾸는 모든 방법을 써 보세요."
  }
];
window.RuleLabData={levels,N,P};
})();
