export const levels = [
  { title: '산골 열차', image: 'train.webp', size: 3, fixed: 3, shuffle: [7, 4, 3, 6, 7, 4] },
  { title: '바닷가 등대', image: 'lighthouse.webp', size: 3, fixed: 0, shuffle: [7, 4, 1, 0, 3, 6, 7, 8, 5, 2, 1, 4, 3, 0] },
  { title: '달나라 여행', image: 'space.webp', size: 4, fixed: 0, shuffle: [14, 10, 9, 13, 12, 8, 4, 5, 1, 2, 6, 7, 11, 10, 6, 5, 9, 8, 12, 13, 14, 15, 11, 7] }
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
