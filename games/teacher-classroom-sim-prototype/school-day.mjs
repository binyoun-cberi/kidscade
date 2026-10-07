export const SCHOOL_SPACES=Object.freeze({
  classroom:{
    id:'classroom',name:'우리 교실',icon:'🏫',floor:'#c8a77d',wall:'#f1ead9',accent:'#355d4f',
    teachingPoint:{x:0,z:-4.1},
    seats:[
      {x:-3.2,z:-1.63},{x:0,z:-1.63},{x:3.2,z:-1.63},
      {x:-3.2,z:.77},{x:0,z:.77},{x:3.2,z:.77}
    ],
    obstacles:[
      {x:-3.2,z:-2.4,hx:.80,hz:.66},{x:0,z:-2.4,hx:.80,hz:.66},{x:3.2,z:-2.4,hx:.80,hz:.66},
      {x:-3.2,z:0,hx:.80,hz:.66},{x:0,z:0,hx:.80,hz:.66},{x:3.2,z:0,hx:.80,hz:.66},
      {x:4.75,z:3.35,hx:1.18,hz:.70},{x:-6.25,z:-3.9,hx:.70,hz:.40}
    ]
  },
  gym:{
    id:'gym',name:'체육관',icon:'🏀',floor:'#c98e55',wall:'#e9f1f4',accent:'#27709d',
    teachingPoint:{x:0,z:-3.65},
    seats:[
      {x:-3.75,z:.3},{x:-2.25,z:.3},{x:-.75,z:.3},{x:.75,z:.3},{x:2.25,z:.3},{x:3.75,z:.3}
    ],
    obstacles:[
      {x:-6.25,z:3.5,hx:1.0,hz:.45},{x:6.25,z:3.5,hx:1.0,hz:.45},
      {x:0,z:-4.45,hx:.55,hz:.28}
    ]
  },
  science:{
    id:'science',name:'과학실',icon:'🧪',floor:'#aab9b4',wall:'#e8f1ea',accent:'#2d6e65',
    teachingPoint:{x:0,z:-3.8},
    seats:[
      {x:-3.4,z:-1.45},{x:-1.8,z:-1.45},{x:1.8,z:-1.45},{x:3.4,z:-1.45},
      {x:-2.2,z:1.25},{x:2.2,z:1.25}
    ],
    obstacles:[
      {x:-2.6,z:-2.15,hx:1.35,hz:.62},{x:2.6,z:-2.15,hx:1.35,hz:.62},
      {x:-2.2,z:.55,hx:1.15,hz:.62},{x:2.2,z:.55,hx:1.15,hz:.62},
      {x:5.8,z:-3.9,hx:.85,hz:.48}
    ]
  },
  cafeteria:{
    id:'cafeteria',name:'급식실',icon:'🍚',floor:'#d6c7a8',wall:'#fff1d4',accent:'#c76b3e',
    teachingPoint:{x:0,z:-3.6},
    seats:[
      {x:-3.7,z:-.7},{x:-2.3,z:-.7},{x:.9,z:-.7},{x:2.3,z:-.7},{x:-1.4,z:2.0},{x:0,z:2.0}
    ],
    obstacles:[
      {x:-3,z:-1.45,hx:1.45,hz:.7},{x:1.6,z:-1.45,hx:1.45,hz:.7},
      {x:-.7,z:1.25,hx:1.45,hz:.7},{x:5.75,z:-3.8,hx:1.05,hz:.55}
    ]
  },
  art:{
    id:'art',name:'미술실',icon:'🎨',floor:'#d8c39d',wall:'#fff0e7',accent:'#a24a71',
    teachingPoint:{x:0,z:-3.8},
    seats:[
      {x:-3.5,z:-1.35},{x:-1.9,z:-1.35},{x:1.9,z:-1.35},{x:3.5,z:-1.35},
      {x:-2.0,z:1.45},{x:2.0,z:1.45}
    ],
    obstacles:[
      {x:-2.7,z:-2.05,hx:1.35,hz:.64},{x:2.7,z:-2.05,hx:1.35,hz:.64},
      {x:-2,z:.75,hx:1.15,hz:.64},{x:2,z:.75,hx:1.15,hz:.64},
      {x:-6.15,z:-3.9,hx:.75,hz:.45}
    ]
  },
  computer:{
    id:'computer',name:'컴퓨터실',icon:'💻',floor:'#9ba6b1',wall:'#e9eef5',accent:'#344f78',
    teachingPoint:{x:0,z:-3.85},
    seats:[
      {x:-3.6,z:-1.45},{x:-1.2,z:-1.45},{x:1.2,z:-1.45},{x:3.6,z:-1.45},
      {x:-2.2,z:1.15},{x:2.2,z:1.15}
    ],
    obstacles:[
      {x:-3.6,z:-2.05,hx:.9,hz:.64},{x:-1.2,z:-2.05,hx:.9,hz:.64},{x:1.2,z:-2.05,hx:.9,hz:.64},{x:3.6,z:-2.05,hx:.9,hz:.64},
      {x:-2.2,z:.55,hx:.9,hz:.64},{x:2.2,z:.55,hx:.9,hz:.64},{x:5.8,z:3.45,hx:1.0,hz:.65}
    ]
  }
});

export const DAY_STEPS=Object.freeze([
  {kind:'prep',period:1,location:'classroom',subject:'수학',title:'1교시 준비',board:'수학 · 같이 풀어보기'},
  {kind:'lesson',period:1,location:'classroom',subject:'수학',duration:115,board:'수학 · 같이 풀어보기',focusDrain:1.00},
  {kind:'social',location:'classroom',title:'쉬는 시간',duration:45,socialLabel:'쉬는 시간'},
  {kind:'prep',period:2,location:'classroom',subject:'국어',title:'2교시 준비',board:'국어 · 중심 내용 찾기'},
  {kind:'lesson',period:2,location:'classroom',subject:'국어',duration:105,board:'국어 · 중심 내용 찾기',focusDrain:.92},
  {kind:'transition',title:'체육관으로 이동',location:'classroom',nextLocation:'gym'},
  {kind:'prep',period:3,location:'gym',subject:'체육',title:'3교시 준비',board:'체육 · 협동 공놀이'},
  {kind:'lesson',period:3,location:'gym',subject:'체육',duration:100,board:'체육 · 협동 공놀이',focusDrain:.78},
  {kind:'social',location:'gym',title:'물 마시는 시간',duration:35,socialLabel:'체육 뒤 휴식'},
  {kind:'transition',title:'과학실로 이동',location:'gym',nextLocation:'science'},
  {kind:'prep',period:4,location:'science',subject:'과학',title:'4교시 준비',board:'과학 · 물질 관찰하기'},
  {kind:'lesson',period:4,location:'science',subject:'과학',duration:110,board:'과학 · 물질 관찰하기',focusDrain:1.04},
  {kind:'transition',title:'급식실로 이동',location:'science',nextLocation:'cafeteria'},
  {kind:'social',location:'cafeteria',title:'점심시간',duration:80,socialLabel:'점심시간',lunch:true},
  {kind:'transition',title:'미술실로 이동',location:'cafeteria',nextLocation:'art'},
  {kind:'prep',period:5,location:'art',subject:'미술',title:'5교시 준비',board:'미술 · 색으로 표현하기'},
  {kind:'lesson',period:5,location:'art',subject:'미술',duration:110,board:'미술 · 색으로 표현하기',focusDrain:.88},
  {kind:'social',location:'art',title:'쉬는 시간',duration:40,socialLabel:'쉬는 시간'},
  {kind:'transition',title:'컴퓨터실로 이동',location:'art',nextLocation:'computer'},
  {kind:'prep',period:6,location:'computer',subject:'컴퓨터',title:'6교시 준비',board:'컴퓨터 · 차근차근 해결하기'},
  {kind:'lesson',period:6,location:'computer',subject:'컴퓨터',duration:105,board:'컴퓨터 · 차근차근 해결하기',focusDrain:.96},
  {kind:'done',location:'computer',title:'하교'}
]);

export const PERIODS=Object.freeze([
  {period:1,subject:'수학',icon:'➕',location:'classroom'},
  {period:2,subject:'국어',icon:'📖',location:'classroom'},
  {period:3,subject:'체육',icon:'🏀',location:'gym'},
  {period:4,subject:'과학',icon:'🧪',location:'science'},
  {period:5,subject:'미술',icon:'🎨',location:'art'},
  {period:6,subject:'컴퓨터',icon:'💻',location:'computer'}
]);
