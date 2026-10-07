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
    "multiplier": 1.6,
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
})();
