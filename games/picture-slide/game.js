import { canMove, initialBoard, isComplete, levels } from './levels.js';

const board = document.querySelector('#board');
const stage = document.querySelector('#stage');
const stageRule = document.querySelector('#stage-rule');
const reference = document.querySelector('#reference');
const moves = document.querySelector('#moves');
const message = document.querySelector('#message');
const undo = document.querySelector('#undo');
const next = document.querySelector('#next');
const reportedStages = new Set();
let level;
let tiles;
let pieces;
let history;
let focusedPosition;

function render() {
  const blank = pieces.indexOf(pieces.length - 1);
  const complete = isComplete(pieces);
  const { size, fixed, image } = level;
  board.classList.toggle('complete', complete);
  tiles.forEach((button, position) => {
    const piece = pieces[position];
    const empty = position === blank && !complete;
    const locked = position < fixed;
    const movable = !complete && canMove(level, position, blank);
    button.style.backgroundImage = empty ? '' : `url("${image}")`;
    button.style.backgroundSize = `${size * 100}% ${size * 100}%`;
    const x = (piece % size) * 100 / (size - 1);
    const y = Math.floor(piece / size) * 100 / (size - 1);
    button.style.backgroundPosition = `${x}% ${y}%`;
    button.classList.toggle('fixed', locked && !complete);
    button.classList.toggle('movable', movable);
    button.setAttribute('aria-disabled', String(!movable));
    button.setAttribute('aria-label', `${Math.floor(position / size) + 1}행 ${position % size + 1}열, ${empty ? '빈칸' : `조각 ${piece + 1}`}${locked ? ', 고정' : ''}`);
    button.tabIndex = position === focusedPosition ? 0 : -1;
  });
  moves.textContent = history.length;
  undo.disabled = history.length === 0;
  next.hidden = !complete || stage.selectedIndex === levels.length - 1;
  if (complete) {
    message.textContent = `${level.title} 완성!`;
  }
}

function start() {
  level = levels[stage.selectedIndex];
  pieces = initialBoard(level);
  history = [];
  focusedPosition = pieces.findIndex((_, index) => canMove(level, index, pieces.indexOf(pieces.length - 1)));
  board.style.setProperty('--size', level.size);
  reference.src = level.image;
  reference.alt = `${level.title} 완성 그림`;
  stageRule.textContent = level.fixed ? '3×3 · 흰 점이 있는 윗줄은 움직이지 않아요.' : `${level.size}×${level.size} · 모든 조각을 움직일 수 있어요.`;
  message.textContent = '';
  tiles = pieces.map((_, position) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.addEventListener('click', () => move(position));
    button.addEventListener('keydown', (event) => navigate(event, position));
    return button;
  });
  board.replaceChildren(...tiles);
  render();
}

function move(position) {
  const blank = pieces.indexOf(pieces.length - 1);
  focusedPosition = position;
  if (isComplete(pieces)) return;
  if (!canMove(level, position, blank)) {
    message.textContent = position < level.fixed ? '윗줄 조각은 고정되어 있어요.' : '빈칸에 바로 닿은 조각을 골라요.';
    render();
    return;
  }
  [pieces[blank], pieces[position]] = [pieces[position], pieces[blank]];
  history.push({ blank, position });
  if (isComplete(pieces) && !reportedStages.has(level.image)) {
    reportedStages.add(level.image);
    window.KidscadeGame?.result({ scope: 'stage', status: 'completed', outcome: 'clear', endsSession: false });
  }
  message.textContent = '';
  render();
}

function navigate(event, position) {
  const { size } = level;
  const offsets = {
    ArrowUp: position >= size ? -size : 0,
    ArrowDown: position < size * (size - 1) ? size : 0,
    ArrowLeft: position % size > 0 ? -1 : 0,
    ArrowRight: position % size < size - 1 ? 1 : 0
  };
  if (!Object.hasOwn(offsets, event.key)) return;
  event.preventDefault();
  tiles[focusedPosition].tabIndex = -1;
  focusedPosition = position + offsets[event.key];
  tiles[focusedPosition].tabIndex = 0;
  tiles[focusedPosition].focus();
}

undo.addEventListener('click', () => {
  const { blank, position } = history.pop();
  [pieces[blank], pieces[position]] = [pieces[position], pieces[blank]];
  message.textContent = '한 수 되돌렸어요.';
  render();
  if (undo.disabled) tiles[focusedPosition].focus();
});
document.querySelector('#restart').addEventListener('click', start);
stage.addEventListener('change', start);
next.addEventListener('click', () => {
  stage.selectedIndex += 1;
  start();
  tiles[focusedPosition].focus();
});
stage.replaceChildren(...levels.map(({ title }, index) => new Option(`${index + 1}. ${title}`)));
start();
