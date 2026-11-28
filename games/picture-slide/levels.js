const openingLevels = [
  { title: '산골 열차', image: 'train.webp', size: 3, fixed: 3, shuffle: [7, 4, 3, 6, 7, 4] },
  { title: '바닷가 등대', image: 'lighthouse.webp', size: 3, fixed: 0, shuffle: [7, 4, 1, 0, 3, 6, 7, 8, 5, 2, 1, 4, 3, 0] },
  { title: '달나라 여행', image: 'space.webp', size: 4, fixed: 0, shuffle: [14, 10, 9, 13, 12, 8, 4, 5, 1, 2, 6, 7, 11, 10, 6, 5, 9, 8, 12, 13, 14, 15, 11, 7] }
];

const gallery = [
  ['하늘을 나는 열기구', 'balloons', 3, 3, 8],
  ['들판의 빨간 우체통', 'mailbox', 3, 3, 10],
  ['비 오는 날의 장화', 'rain-boots', 3, 3, 12],
  ['산호초의 바다거북', 'turtle', 3, 0, 12],
  ['골목길 빵집', 'bakery', 3, 0, 14],
  ['물을 뿜는 고래', 'whale', 3, 0, 16],
  ['바람을 타는 연', 'kite', 3, 0, 18],
  ['초원의 공룡', 'dinosaur', 3, 0, 20],
  ['저녁의 관람차', 'ferris-wheel', 3, 0, 22],
  ['구름 위 보라색 성', 'castle', 4, 0, 20],
  ['숲속 버섯 마을', 'mushrooms', 4, 0, 22],
  ['노란 잠수함', 'submarine', 4, 0, 24],
  ['낮잠 자는 여우', 'fox', 4, 0, 26],
  ['겨울 마을 눈사람', 'snowman', 4, 0, 28],
  ['별을 찾는 로봇', 'robot', 4, 0, 30],
  ['별빛 야영장', 'camping', 4, 0, 32],
  ['봄꽃 정원', 'garden', 4, 0, 34]
];

export const isComplete = (board) => board.every((piece, index) => piece === index);

export function canMove(level, position, blank) {
  const { size, fixed } = level;
  const distance = Math.abs(position % size - blank % size)
    + Math.abs(Math.floor(position / size) - Math.floor(blank / size));
  return position >= fixed && position < size ** 2 && distance === 1;
}

export function initialBoard(level) {
  const board = Array.from({ length: level.size ** 2 }, (_, index) => index);
  let blank = board.length - 1;
  for (const position of level.shuffle) {
    [board[blank], board[position]] = [board[position], board[blank]];
    blank = position;
  }
  return board;
}

function makeShuffle(level, steps, seed) {
  let blank = level.size ** 2 - 1;
  let previous = -1;
  let random = seed;
  const positions = Array.from({ length: blank + 1 }, (_, index) => index);
  const shuffle = [];
  for (let step = 0; step < steps; step += 1) {
    const candidates = positions.filter((position) => position !== previous && canMove(level, position, blank));
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const position = candidates[Math.floor(random / 2 ** 32 * candidates.length)];
    shuffle.push(position);
    previous = blank;
    blank = position;
  }
  return shuffle;
}

export const levels = openingLevels.concat(gallery.map(([title, art, size, fixed, steps], index) => {
  const level = { title, image: `${art}.webp`, size, fixed };
  return { ...level, shuffle: makeShuffle(level, steps, index + 1) };
}));
