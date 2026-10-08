(function(){
'use strict';
// Compact procedural campaign: the game still contains only word towers and enemies.
// Every path is normalized so the same rules work on phones and tablets.
window.WordSiegeStages=[
  {
    "id": "stage-01",
    "number": 1,
    "name": "GRID ZERO",
    "subtitle": "기본 작전",
    "description": "첫 단어 타워를 세우고 경로를 막아 보세요.",
    "theme": "paper",
    "colors": {
      "background": "#f4ecd7",
      "lane": "#d6c8ad",
      "accent": "#c2b089",
      "paper": "#fdf7e7"
    },
    "multiplier": 1,
    "path": [
      [
        0.02,
        0.28
      ],
      [
        0.16,
        0.28
      ],
      [
        0.16,
        0.61
      ],
      [
        0.31,
        0.61
      ],
      [
        0.31,
        0.4
      ],
      [
        0.47,
        0.4
      ],
      [
        0.47,
        0.72
      ],
      [
        0.64,
        0.72
      ],
      [
        0.64,
        0.31
      ],
      [
        0.8,
        0.31
      ],
      [
        0.8,
        0.57
      ],
      [
        0.96,
        0.57
      ]
    ],
    "resources": [
      {
        "x": 0.22,
        "y": 0.18,
        "amount": 100
      },
      {
        "x": 0.54,
        "y": 0.18,
        "amount": 115
      },
      {
        "x": 0.72,
        "y": 0.78,
        "amount": 120
      }
    ],
    "focus": "normal",
    "difficulty": 0,
    "waves": 8
  },
  {
    "id": "stage-02",
    "number": 2,
    "name": "SWITCHBACK",
    "subtitle": "급커브",
    "description": "빠른 적이 굽은 길을 파고듭니다.",
    "theme": "mint",
    "colors": {
      "background": "#e7f3db",
      "lane": "#b9d3b4",
      "accent": "#83ba87",
      "paper": "#f9fff0"
    },
    "multiplier": 1.06,
    "path": [
      [
        0.02,
        0.49
      ],
      [
        0.14,
        0.49
      ],
      [
        0.14,
        0.19
      ],
      [
        0.35,
        0.19
      ],
      [
        0.35,
        0.76
      ],
      [
        0.51,
        0.76
      ],
      [
        0.51,
        0.35
      ],
      [
        0.7,
        0.35
      ],
      [
        0.7,
        0.65
      ],
      [
        0.86,
        0.65
      ],
      [
        0.86,
        0.46
      ],
      [
        0.96,
        0.46
      ]
    ],
    "resources": [
      {
        "x": 0.27,
        "y": 0.39,
        "amount": 115
      },
      {
        "x": 0.61,
        "y": 0.13,
        "amount": 95
      },
      {
        "x": 0.81,
        "y": 0.85,
        "amount": 115
      }
    ],
    "focus": "fast",
    "difficulty": 1,
    "waves": 8
  },
  {
    "id": "stage-03",
    "number": 3,
    "name": "IRON LINE",
    "subtitle": "장갑 행렬",
    "description": "장갑형을 상대할 관통과 방패 파괴가 중요해집니다.",
    "theme": "slate",
    "colors": {
      "background": "#e0e7eb",
      "lane": "#b9c7ce",
      "accent": "#7e9ca8",
      "paper": "#fafcff"
    },
    "multiplier": 1.12,
    "path": [
      [
        0.02,
        0.67
      ],
      [
        0.2,
        0.67
      ],
      [
        0.2,
        0.31
      ],
      [
        0.43,
        0.31
      ],
      [
        0.43,
        0.57
      ],
      [
        0.63,
        0.57
      ],
      [
        0.63,
        0.22
      ],
      [
        0.81,
        0.22
      ],
      [
        0.81,
        0.51
      ],
      [
        0.96,
        0.51
      ]
    ],
    "resources": [
      {
        "x": 0.11,
        "y": 0.13,
        "amount": 105
      },
      {
        "x": 0.53,
        "y": 0.85,
        "amount": 125
      },
      {
        "x": 0.73,
        "y": 0.78,
        "amount": 100
      }
    ],
    "focus": "armored",
    "difficulty": 2,
    "waves": 8
  },
  {
    "id": "stage-04",
    "number": 4,
    "name": "FROST GRID",
    "subtitle": "빙결 구간",
    "description": "둔화만으로는 충분하지 않습니다. 느린 중장갑이 등장합니다.",
    "theme": "ice",
    "colors": {
      "background": "#e3f3fd",
      "lane": "#bcdeee",
      "accent": "#78b6d8",
      "paper": "#f5fdff"
    },
    "multiplier": 1.17,
    "path": [
      [
        0.02,
        0.38
      ],
      [
        0.25,
        0.38
      ],
      [
        0.25,
        0.7
      ],
      [
        0.44,
        0.7
      ],
      [
        0.44,
        0.24
      ],
      [
        0.65,
        0.24
      ],
      [
        0.65,
        0.67
      ],
      [
        0.82,
        0.67
      ],
      [
        0.82,
        0.42
      ],
      [
        0.96,
        0.42
      ]
    ],
    "resources": [
      {
        "x": 0.13,
        "y": 0.81,
        "amount": 125
      },
      {
        "x": 0.52,
        "y": 0.48,
        "amount": 110
      },
      {
        "x": 0.76,
        "y": 0.13,
        "amount": 120
      }
    ],
    "focus": "heavy",
    "difficulty": 3,
    "waves": 8
  },
  {
    "id": "stage-05",
    "number": 5,
    "name": "SPLIT CIRCUIT",
    "subtitle": "분열 회로",
    "description": "적이 파괴된 뒤 작은 적으로 나뉩니다.",
    "theme": "rose",
    "colors": {
      "background": "#fae9e5",
      "lane": "#e8bfbf",
      "accent": "#d38c96",
      "paper": "#fff7f3"
    },
    "multiplier": 1.22,
    "path": [
      [
        0.02,
        0.22
      ],
      [
        0.15,
        0.22
      ],
      [
        0.15,
        0.74
      ],
      [
        0.37,
        0.74
      ],
      [
        0.37,
        0.42
      ],
      [
        0.57,
        0.42
      ],
      [
        0.57,
        0.18
      ],
      [
        0.77,
        0.18
      ],
      [
        0.77,
        0.68
      ],
      [
        0.96,
        0.68
      ]
    ],
    "resources": [
      {
        "x": 0.27,
        "y": 0.16,
        "amount": 115
      },
      {
        "x": 0.48,
        "y": 0.87,
        "amount": 130
      },
      {
        "x": 0.68,
        "y": 0.87,
        "amount": 105
      }
    ],
    "focus": "split",
    "difficulty": 4,
    "waves": 8
  },
  {
    "id": "stage-06",
    "number": 6,
    "name": "VIOLET LOOP",
    "subtitle": "독성 압박",
    "description": "재생형 적을 지속 피해와 독으로 제압하세요.",
    "theme": "violet",
    "colors": {
      "background": "#f0e7f9",
      "lane": "#d1bce8",
      "accent": "#a98bce",
      "paper": "#fbf8ff"
    },
    "multiplier": 1.28,
    "path": [
      [
        0.02,
        0.62
      ],
      [
        0.17,
        0.62
      ],
      [
        0.17,
        0.23
      ],
      [
        0.33,
        0.23
      ],
      [
        0.33,
        0.56
      ],
      [
        0.5,
        0.56
      ],
      [
        0.5,
        0.83
      ],
      [
        0.68,
        0.83
      ],
      [
        0.68,
        0.33
      ],
      [
        0.84,
        0.33
      ],
      [
        0.84,
        0.57
      ],
      [
        0.96,
        0.57
      ]
    ],
    "resources": [
      {
        "x": 0.1,
        "y": 0.12,
        "amount": 130
      },
      {
        "x": 0.42,
        "y": 0.12,
        "amount": 120
      },
      {
        "x": 0.77,
        "y": 0.13,
        "amount": 115
      }
    ],
    "focus": "regen",
    "difficulty": 5,
    "waves": 8
  },
  {
    "id": "stage-07",
    "number": 7,
    "name": "CROSS CURRENT",
    "subtitle": "교차 기류",
    "description": "빠른 적과 밀어내기 효과를 함께 시험하세요.",
    "theme": "sea",
    "colors": {
      "background": "#e0f5f1",
      "lane": "#b2d9d8",
      "accent": "#76b9be",
      "paper": "#f5fffd"
    },
    "multiplier": 1.35,
    "path": [
      [
        0.02,
        0.31
      ],
      [
        0.23,
        0.31
      ],
      [
        0.23,
        0.66
      ],
      [
        0.42,
        0.66
      ],
      [
        0.42,
        0.18
      ],
      [
        0.6,
        0.18
      ],
      [
        0.6,
        0.55
      ],
      [
        0.75,
        0.55
      ],
      [
        0.75,
        0.79
      ],
      [
        0.88,
        0.79
      ],
      [
        0.88,
        0.48
      ],
      [
        0.96,
        0.48
      ]
    ],
    "resources": [
      {
        "x": 0.1,
        "y": 0.78,
        "amount": 120
      },
      {
        "x": 0.5,
        "y": 0.88,
        "amount": 115
      },
      {
        "x": 0.71,
        "y": 0.13,
        "amount": 140
      }
    ],
    "focus": "fast",
    "difficulty": 6,
    "waves": 8
  },
  {
    "id": "stage-08",
    "number": 8,
    "name": "EMBER MAZE",
    "subtitle": "화염 미로",
    "description": "수많은 적을 한꺼번에 처리할 광역 타워가 필요합니다.",
    "theme": "ember",
    "colors": {
      "background": "#f9e5d2",
      "lane": "#e6b8a0",
      "accent": "#db835c",
      "paper": "#fff4e7"
    },
    "multiplier": 1.43,
    "path": [
      [
        0.02,
        0.72
      ],
      [
        0.14,
        0.72
      ],
      [
        0.14,
        0.34
      ],
      [
        0.28,
        0.34
      ],
      [
        0.28,
        0.16
      ],
      [
        0.48,
        0.16
      ],
      [
        0.48,
        0.67
      ],
      [
        0.67,
        0.67
      ],
      [
        0.67,
        0.28
      ],
      [
        0.82,
        0.28
      ],
      [
        0.82,
        0.55
      ],
      [
        0.96,
        0.55
      ]
    ],
    "resources": [
      {
        "x": 0.12,
        "y": 0.1,
        "amount": 120
      },
      {
        "x": 0.39,
        "y": 0.84,
        "amount": 145
      },
      {
        "x": 0.74,
        "y": 0.83,
        "amount": 130
      }
    ],
    "focus": "swarm",
    "difficulty": 7,
    "waves": 8
  },
  {
    "id": "stage-09",
    "number": 9,
    "name": "PRISM RUN",
    "subtitle": "프리즘 돌파",
    "description": "속도·장갑·보호막이 동시에 밀려옵니다.",
    "theme": "prism",
    "colors": {
      "background": "#eee9fa",
      "lane": "#c9c6e9",
      "accent": "#9992d5",
      "paper": "#fffaff"
    },
    "multiplier": 1.5,
    "path": [
      [
        0.02,
        0.43
      ],
      [
        0.17,
        0.43
      ],
      [
        0.17,
        0.76
      ],
      [
        0.31,
        0.76
      ],
      [
        0.31,
        0.29
      ],
      [
        0.49,
        0.29
      ],
      [
        0.49,
        0.58
      ],
      [
        0.64,
        0.58
      ],
      [
        0.64,
        0.18
      ],
      [
        0.81,
        0.18
      ],
      [
        0.81,
        0.62
      ],
      [
        0.96,
        0.62
      ]
    ],
    "resources": [
      {
        "x": 0.11,
        "y": 0.1,
        "amount": 150
      },
      {
        "x": 0.4,
        "y": 0.87,
        "amount": 145
      },
      {
        "x": 0.71,
        "y": 0.83,
        "amount": 145
      }
    ],
    "focus": "shield",
    "difficulty": 8,
    "waves": 8
  },
  {
    "id": "stage-10",
    "number": 10,
    "name": "FINAL SIEGE",
    "subtitle": "최종 방어",
    "description": "모든 적 유형이 등장합니다. 단어 콤보를 완성하세요.",
    "theme": "obsidian",
    "colors": {
      "background": "#e5e1e5",
      "lane": "#aca6b8",
      "accent": "#66677a",
      "paper": "#faf4ff"
    },
    "multiplier": 1.54,
    "path": [
      [
        0.02,
        0.23
      ],
      [
        0.18,
        0.23
      ],
      [
        0.18,
        0.65
      ],
      [
        0.35,
        0.65
      ],
      [
        0.35,
        0.2
      ],
      [
        0.54,
        0.2
      ],
      [
        0.54,
        0.75
      ],
      [
        0.72,
        0.75
      ],
      [
        0.72,
        0.3
      ],
      [
        0.86,
        0.3
      ],
      [
        0.86,
        0.56
      ],
      [
        0.96,
        0.56
      ]
    ],
    "resources": [
      {
        "x": 0.1,
        "y": 0.81,
        "amount": 150
      },
      {
        "x": 0.43,
        "y": 0.89,
        "amount": 150
      },
      {
        "x": 0.77,
        "y": 0.11,
        "amount": 150
      }
    ],
    "focus": "mixed",
    "difficulty": 9,
    "waves": 8
  }
];

// PART II · The second ten maps are hand-authored lane layouts, not recolored copies.
const extraStages=[
  {
    "id": "stage-11",
    "number": 11,
    "name": "CIRCUIT CARNIVAL",
    "subtitle": "장난감 퍼레이드",
    "description": "통통 튀는 분열 적과 빠른 적이 번갈아 등장합니다. 핀볼·거품 콤보를 사용해 보세요.",
    "theme": "candy",
    "colors": {
      "background": "#fbf0d9",
      "lane": "#edd5b9",
      "accent": "#e9a571",
      "paper": "#fff8e7"
    },
    "multiplier": 1.58,
    "path": [
      [
        0.02,
        0.33
      ],
      [
        0.13,
        0.33
      ],
      [
        0.13,
        0.71
      ],
      [
        0.28,
        0.71
      ],
      [
        0.28,
        0.23
      ],
      [
        0.42,
        0.23
      ],
      [
        0.42,
        0.58
      ],
      [
        0.57,
        0.58
      ],
      [
        0.57,
        0.18
      ],
      [
        0.73,
        0.18
      ],
      [
        0.73,
        0.68
      ],
      [
        0.87,
        0.68
      ],
      [
        0.87,
        0.43
      ],
      [
        0.96,
        0.43
      ]
    ],
    "resources": [
      {
        "x": 0.22,
        "y": 0.14,
        "amount": 125
      },
      {
        "x": 0.48,
        "y": 0.86,
        "amount": 145
      },
      {
        "x": 0.79,
        "y": 0.87,
        "amount": 135
      },
      {
        "x": 0.93,
        "y": 0.13,
        "amount": 120
      }
    ],
    "focus": "carnival",
    "difficulty": 5,
    "waves": 8,
    "countBonus": 0,
    "spawnGap": 0.92
  },
  {
    "id": "stage-12",
    "number": 12,
    "name": "IRON CITADEL",
    "subtitle": "강철 요새",
    "description": "보호막·장갑형이 교대로 진격합니다. 관통과 ACID로 방어를 뚫으세요.",
    "theme": "steel",
    "colors": {
      "background": "#dee9ee",
      "lane": "#a9bfcd",
      "accent": "#668ba2",
      "paper": "#f7fcff"
    },
    "multiplier": 1.61,
    "path": [
      [
        0.02,
        0.66
      ],
      [
        0.18,
        0.66
      ],
      [
        0.18,
        0.22
      ],
      [
        0.32,
        0.22
      ],
      [
        0.32,
        0.8
      ],
      [
        0.47,
        0.8
      ],
      [
        0.47,
        0.39
      ],
      [
        0.6,
        0.39
      ],
      [
        0.6,
        0.14
      ],
      [
        0.76,
        0.14
      ],
      [
        0.76,
        0.61
      ],
      [
        0.88,
        0.61
      ],
      [
        0.88,
        0.45
      ],
      [
        0.96,
        0.45
      ]
    ],
    "resources": [
      {
        "x": 0.08,
        "y": 0.15,
        "amount": 140
      },
      {
        "x": 0.39,
        "y": 0.11,
        "amount": 140
      },
      {
        "x": 0.58,
        "y": 0.89,
        "amount": 130
      },
      {
        "x": 0.83,
        "y": 0.83,
        "amount": 130
      }
    ],
    "focus": "fortress",
    "difficulty": 5,
    "waves": 8,
    "countBonus": 1,
    "spawnGap": 1.02
  },
  {
    "id": "stage-13",
    "number": 13,
    "name": "GHOST PARADE",
    "subtitle": "유령의 행진",
    "description": "재생 적과 빠른 적이 혼합됩니다. 감속·독을 이용해 행진을 저지하세요.",
    "theme": "specter",
    "colors": {
      "background": "#e5f0ed",
      "lane": "#aaccc5",
      "accent": "#73a9a1",
      "paper": "#f6fffb"
    },
    "multiplier": 1.65,
    "path": [
      [
        0.02,
        0.27
      ],
      [
        0.16,
        0.27
      ],
      [
        0.16,
        0.73
      ],
      [
        0.3,
        0.73
      ],
      [
        0.3,
        0.4
      ],
      [
        0.45,
        0.4
      ],
      [
        0.45,
        0.15
      ],
      [
        0.6,
        0.15
      ],
      [
        0.6,
        0.61
      ],
      [
        0.74,
        0.61
      ],
      [
        0.74,
        0.3
      ],
      [
        0.86,
        0.3
      ],
      [
        0.86,
        0.76
      ],
      [
        0.96,
        0.76
      ]
    ],
    "resources": [
      {
        "x": 0.09,
        "y": 0.87,
        "amount": 135
      },
      {
        "x": 0.37,
        "y": 0.12,
        "amount": 145
      },
      {
        "x": 0.54,
        "y": 0.87,
        "amount": 150
      },
      {
        "x": 0.91,
        "y": 0.11,
        "amount": 140
      }
    ],
    "focus": "phantom",
    "difficulty": 6,
    "waves": 8,
    "countBonus": 1,
    "spawnGap": 0.9
  },
  {
    "id": "stage-14",
    "number": 14,
    "name": "CHAIN REACTION",
    "subtitle": "분열 대폭발",
    "description": "분열형이 밀집해서 출현합니다. 광역기·부메랑·폭발 타워를 시험하세요.",
    "theme": "ember",
    "colors": {
      "background": "#f7e7d8",
      "lane": "#e6b5a0",
      "accent": "#d68471",
      "paper": "#fff4eb"
    },
    "multiplier": 1.67,
    "path": [
      [
        0.02,
        0.52
      ],
      [
        0.16,
        0.52
      ],
      [
        0.16,
        0.19
      ],
      [
        0.31,
        0.19
      ],
      [
        0.31,
        0.7
      ],
      [
        0.45,
        0.7
      ],
      [
        0.45,
        0.34
      ],
      [
        0.6,
        0.34
      ],
      [
        0.6,
        0.82
      ],
      [
        0.74,
        0.82
      ],
      [
        0.74,
        0.22
      ],
      [
        0.87,
        0.22
      ],
      [
        0.87,
        0.53
      ],
      [
        0.96,
        0.53
      ]
    ],
    "resources": [
      {
        "x": 0.09,
        "y": 0.1,
        "amount": 140
      },
      {
        "x": 0.24,
        "y": 0.88,
        "amount": 145
      },
      {
        "x": 0.52,
        "y": 0.13,
        "amount": 160
      },
      {
        "x": 0.83,
        "y": 0.92,
        "amount": 145
      }
    ],
    "focus": "cascade",
    "difficulty": 6,
    "waves": 8,
    "countBonus": 3,
    "spawnGap": 0.87
  },
  {
    "id": "stage-15",
    "number": 15,
    "name": "STORM FRONT",
    "subtitle": "폭풍 전선",
    "description": "빠른 적이 보호막 행렬 사이를 파고듭니다. 제어·관통 타워를 섞어 주세요.",
    "theme": "storm",
    "colors": {
      "background": "#e7edf7",
      "lane": "#b7c8dd",
      "accent": "#8d9ebb",
      "paper": "#fafcff"
    },
    "multiplier": 1.7,
    "path": [
      [
        0.02,
        0.73
      ],
      [
        0.14,
        0.73
      ],
      [
        0.14,
        0.3
      ],
      [
        0.27,
        0.3
      ],
      [
        0.27,
        0.62
      ],
      [
        0.41,
        0.62
      ],
      [
        0.41,
        0.13
      ],
      [
        0.57,
        0.13
      ],
      [
        0.57,
        0.76
      ],
      [
        0.7,
        0.76
      ],
      [
        0.7,
        0.38
      ],
      [
        0.83,
        0.38
      ],
      [
        0.83,
        0.61
      ],
      [
        0.96,
        0.61
      ]
    ],
    "resources": [
      {
        "x": 0.08,
        "y": 0.13,
        "amount": 155
      },
      {
        "x": 0.34,
        "y": 0.86,
        "amount": 145
      },
      {
        "x": 0.62,
        "y": 0.89,
        "amount": 155
      },
      {
        "x": 0.92,
        "y": 0.18,
        "amount": 145
      }
    ],
    "focus": "tempest",
    "difficulty": 7,
    "waves": 8,
    "countBonus": 2,
    "spawnGap": 0.79
  },
  {
    "id": "stage-16",
    "number": 16,
    "name": "GOLD RUSH",
    "subtitle": "채굴 작전",
    "description": "광맥은 많지만 적도 빨리 밀려옵니다. INK를 벌어 강화와 WORD RUSH를 사용하세요.",
    "theme": "gold",
    "colors": {
      "background": "#fff0cb",
      "lane": "#e6cc83",
      "accent": "#ce9d3c",
      "paper": "#fffbea"
    },
    "multiplier": 1.73,
    "path": [
      [
        0.02,
        0.3
      ],
      [
        0.19,
        0.3
      ],
      [
        0.19,
        0.59
      ],
      [
        0.32,
        0.59
      ],
      [
        0.32,
        0.15
      ],
      [
        0.46,
        0.15
      ],
      [
        0.46,
        0.73
      ],
      [
        0.6,
        0.73
      ],
      [
        0.6,
        0.37
      ],
      [
        0.73,
        0.37
      ],
      [
        0.73,
        0.79
      ],
      [
        0.87,
        0.79
      ],
      [
        0.87,
        0.48
      ],
      [
        0.96,
        0.48
      ]
    ],
    "resources": [
      {
        "x": 0.11,
        "y": 0.86,
        "amount": 195
      },
      {
        "x": 0.37,
        "y": 0.89,
        "amount": 185
      },
      {
        "x": 0.55,
        "y": 0.08,
        "amount": 195
      },
      {
        "x": 0.81,
        "y": 0.16,
        "amount": 175
      }
    ],
    "focus": "goldrush",
    "difficulty": 7,
    "waves": 8,
    "countBonus": 1,
    "spawnGap": 0.86
  },
  {
    "id": "stage-17",
    "number": 17,
    "name": "DOUBLE HELIX",
    "subtitle": "두 갈래 리듬",
    "description": "빠른 무리와 무거운 무리가 박자를 바꿔 진격합니다. 타워 위치가 승패를 가릅니다.",
    "theme": "helix",
    "colors": {
      "background": "#e8e5f5",
      "lane": "#c3b6db",
      "accent": "#987fc1",
      "paper": "#faf7ff"
    },
    "multiplier": 1.77,
    "path": [
      [
        0.02,
        0.4
      ],
      [
        0.15,
        0.4
      ],
      [
        0.15,
        0.77
      ],
      [
        0.28,
        0.77
      ],
      [
        0.28,
        0.26
      ],
      [
        0.43,
        0.26
      ],
      [
        0.43,
        0.67
      ],
      [
        0.56,
        0.67
      ],
      [
        0.56,
        0.21
      ],
      [
        0.7,
        0.21
      ],
      [
        0.7,
        0.66
      ],
      [
        0.84,
        0.66
      ],
      [
        0.84,
        0.4
      ],
      [
        0.96,
        0.4
      ]
    ],
    "resources": [
      {
        "x": 0.09,
        "y": 0.14,
        "amount": 165
      },
      {
        "x": 0.36,
        "y": 0.89,
        "amount": 170
      },
      {
        "x": 0.64,
        "y": 0.88,
        "amount": 165
      },
      {
        "x": 0.9,
        "y": 0.1,
        "amount": 170
      }
    ],
    "focus": "duet",
    "difficulty": 8,
    "waves": 8,
    "countBonus": 2,
    "spawnGap": 0.89
  },
  {
    "id": "stage-18",
    "number": 18,
    "name": "ECHO CHAMBER",
    "subtitle": "울려 퍼지는 군단",
    "description": "적이 잠깐 쉬었다가 다섯 마리씩 몰려옵니다. 함정·광역기를 적절히 준비하세요.",
    "theme": "echo",
    "colors": {
      "background": "#e0f4f2",
      "lane": "#a8d7d2",
      "accent": "#64afa9",
      "paper": "#f5fffc"
    },
    "multiplier": 1.8,
    "path": [
      [
        0.02,
        0.6
      ],
      [
        0.17,
        0.6
      ],
      [
        0.17,
        0.18
      ],
      [
        0.29,
        0.18
      ],
      [
        0.29,
        0.79
      ],
      [
        0.44,
        0.79
      ],
      [
        0.44,
        0.43
      ],
      [
        0.59,
        0.43
      ],
      [
        0.59,
        0.14
      ],
      [
        0.73,
        0.14
      ],
      [
        0.73,
        0.73
      ],
      [
        0.87,
        0.73
      ],
      [
        0.87,
        0.48
      ],
      [
        0.96,
        0.48
      ]
    ],
    "resources": [
      {
        "x": 0.08,
        "y": 0.11,
        "amount": 175
      },
      {
        "x": 0.36,
        "y": 0.1,
        "amount": 160
      },
      {
        "x": 0.52,
        "y": 0.9,
        "amount": 180
      },
      {
        "x": 0.81,
        "y": 0.9,
        "amount": 160
      }
    ],
    "focus": "echo",
    "difficulty": 8,
    "waves": 8,
    "countBonus": 3,
    "spawnGap": 0.94
  },
  {
    "id": "stage-19",
    "number": 19,
    "name": "LAST BASTION",
    "subtitle": "최후의 방벽",
    "description": "장갑·보호막·거대 적이 진격합니다. 높은 피해와 관통을 꾸준히 유지하세요.",
    "theme": "bastion",
    "colors": {
      "background": "#e9e5e1",
      "lane": "#c7b6a8",
      "accent": "#997968",
      "paper": "#faf6ed"
    },
    "multiplier": 1.84,
    "path": [
      [
        0.02,
        0.22
      ],
      [
        0.15,
        0.22
      ],
      [
        0.15,
        0.65
      ],
      [
        0.3,
        0.65
      ],
      [
        0.3,
        0.37
      ],
      [
        0.44,
        0.37
      ],
      [
        0.44,
        0.81
      ],
      [
        0.58,
        0.81
      ],
      [
        0.58,
        0.18
      ],
      [
        0.73,
        0.18
      ],
      [
        0.73,
        0.55
      ],
      [
        0.86,
        0.55
      ],
      [
        0.86,
        0.32
      ],
      [
        0.96,
        0.32
      ]
    ],
    "resources": [
      {
        "x": 0.09,
        "y": 0.86,
        "amount": 180
      },
      {
        "x": 0.35,
        "y": 0.11,
        "amount": 160
      },
      {
        "x": 0.65,
        "y": 0.91,
        "amount": 170
      },
      {
        "x": 0.92,
        "y": 0.87,
        "amount": 175
      }
    ],
    "focus": "siege",
    "difficulty": 9,
    "waves": 8,
    "countBonus": 2,
    "spawnGap": 1.03
  },
  {
    "id": "stage-20",
    "number": 20,
    "name": "WORD APOCALYPSE",
    "subtitle": "최종 단어 전쟁",
    "description": "모든 특성이 등장하고 최후의 보스 둘이 나타납니다. 지금까지 배운 단어 콤보를 총동원하세요.",
    "theme": "finale",
    "colors": {
      "background": "#ece5f0",
      "lane": "#bba3ce",
      "accent": "#8b69a9",
      "paper": "#fff9ff"
    },
    "multiplier": 1.87,
    "path": [
      [
        0.02,
        0.69
      ],
      [
        0.14,
        0.69
      ],
      [
        0.14,
        0.21
      ],
      [
        0.27,
        0.21
      ],
      [
        0.27,
        0.77
      ],
      [
        0.4,
        0.77
      ],
      [
        0.4,
        0.32
      ],
      [
        0.54,
        0.32
      ],
      [
        0.54,
        0.13
      ],
      [
        0.68,
        0.13
      ],
      [
        0.68,
        0.67
      ],
      [
        0.82,
        0.67
      ],
      [
        0.82,
        0.4
      ],
      [
        0.96,
        0.4
      ]
    ],
    "resources": [
      {
        "x": 0.08,
        "y": 0.12,
        "amount": 190
      },
      {
        "x": 0.34,
        "y": 0.1,
        "amount": 170
      },
      {
        "x": 0.48,
        "y": 0.89,
        "amount": 200
      },
      {
        "x": 0.76,
        "y": 0.87,
        "amount": 195
      }
    ],
    "focus": "finale",
    "difficulty": 9,
    "waves": 8,
    "countBonus": 2,
    "spawnGap": 0.91,
    "bosses": 2
  }
];
window.WordSiegeStages.push(...extraStages);
})();
