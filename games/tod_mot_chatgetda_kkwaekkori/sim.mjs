// Seeded town life and fair hidden-character rounds. This module has no rendering dependency.
export const BLOCK_PITCH = 5.2;
export const STAGES = Object.freeze({
  small: { label: '작은 마을', cols: 3, rows: 2, residents: 18, targets: 1 },
  medium: { label: '북적북적 동네', cols: 5, rows: 3, residents: 45, targets: 3 },
  large: { label: '와글와글 대도시', cols: 7, rows: 4, residents: 84, targets: 5 }
});

export const COLORS = Object.freeze([
  { name: '빨간', hex: '#ee5963' },
  { name: '주황', hex: '#f49a47' },
  { name: '노란', hex: '#f4cc4e' },
  { name: '초록', hex: '#62b77f' },
  { name: '하늘색', hex: '#67bfe7' },
  { name: '파란', hex: '#5b83d5' },
  { name: '보라', hex: '#a78bdd' },
  { name: '분홍', hex: '#ee93b4' }
]);
export const HATS = Object.freeze([{ name: '모자', shape: 'cap' }, { name: '벙거지', shape: 'brim' }, { name: '털모자', shape: 'beanie' }]);
const DISTRICTS = Object.freeze([
  { name: '알록달록 시장', kind: 'market' },
  { name: '햇살 공원', kind: 'park' },
  { name: '다정한 주택가', kind: 'home' },
  { name: '달콤한 빵집', kind: 'bakery' },
  { name: '학교 앞 거리', kind: 'school' },
  { name: '꽃피는 광장', kind: 'plaza' }
]);

export function createRng(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(input, random) {
  const values = [...input];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function getBlockCenter(block, stage) {
  const config = typeof stage === 'string' ? STAGES[stage] : stage;
  return {
    x: (block.col - (config.cols - 1) / 2) * BLOCK_PITCH,
    z: (block.row - (config.rows - 1) / 2) * BLOCK_PITCH
  };
}

export function getRoutePosition(person, stage) {
  const center = getBlockCenter(person.block, stage);
  const progress = ((person.progress % 4) + 4) % 4;
  const side = Math.floor(progress);
  const t = progress - side;
  // A sidewalk loop stays outside the buildings but inside the block.
  const corners = [[-1.88, -1.88], [1.88, -1.88], [1.88, 1.88], [-1.88, 1.88]];
  const first = corners[side];
  const last = corners[(side + 1) % 4];
  return { x: center.x + first[0] + (last[0] - first[0]) * t, z: center.z + first[1] + (last[1] - first[1]) * t };
}

export function makeTown(stageName = 'small', seed = 1) {
  const config = STAGES[stageName];
  if (!config) throw new Error(`알 수 없는 마을 크기: ${stageName}`);
  const random = createRng(seed);
  const blocks = [];
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const district = DISTRICTS[(col + row * 3 + Math.floor(random() * 3)) % DISTRICTS.length];
      blocks.push({ id: `b${row}-${col}`, col, row, ...district });
    }
  }
  // Distinct hat-style, hat-color, and bag-color combinations prevent impossible clues.
  const looks = [];
  for (let hatStyle = 0; hatStyle < HATS.length; hatStyle++) {
    for (let hatColor = 0; hatColor < COLORS.length; hatColor++) {
      for (let bagColor = 0; bagColor < COLORS.length; bagColor++) {
        looks.push({ hatStyle, hatColor, bagColor });
      }
    }
  }
  const appearance = shuffled(looks, random);
  const people = Array.from({ length: config.residents }, (_, index) => {
    const block = blocks[index % blocks.length];
    const clothingColor = Math.floor(random() * COLORS.length);
    return {
      id: `person-${index}`,
      block,
      ...appearance[index],
      clothingColor,
      skin: Math.floor(random() * 4),
      hair: Math.floor(random() * 4),
      progress: random() * 4,
      speed: 0.035 + random() * 0.065,
      direction: random() < 0.5 ? -1 : 1,
      pause: random() * 1.8,
      stopCount: 0,
      pausedAction: 'look',
      action: 'walk',
      modelVariant: index % 12
    };
  });
  const order = shuffled(people.map(p => p.id), random).slice(0, config.targets);
  return { stageName, config, seed, blocks, people, order };
}

export function movePeople(town, deltaSeconds) {
  const dt = Math.min(0.1, Math.max(0, Number(deltaSeconds) || 0));
  for (const person of town.people) {
    if (person.pause > 0) {
      person.pause = Math.max(0, person.pause - dt);
      person.action = person.pausedAction;
      continue;
    }
    const before = person.progress;
    person.progress = ((before + person.direction * person.speed * dt) % 4 + 4) % 4;
    person.action = 'walk';
    // Stop at street corners occasionally for believable little daily routines.
    if (Math.floor(before * 4) !== Math.floor(person.progress * 4)) {
      const n = person.stopCount++ + person.modelVariant * 3 + Math.floor(person.progress * 100);
      if (n % 4 === 0) {
        person.pause = .9 + (n % 5) * .45;
        person.pausedAction = n % 3 === 0 ? 'wave' : n % 3 === 1 ? 'chat' : 'look';
      }
      if (n % 11 === 0) person.direction *= -1;
    }
  }
}

export function getClue(person) {
  if (!person) return null;
  const hat = COLORS[person.hatColor];
  const bag = COLORS[person.bagColor];
  return {
    title: `${hat.name} ${HATS[person.hatStyle].name}와 ${bag.name} 가방`,
    subtitle: `${hat.name} ${HATS[person.hatStyle].name}를 쓰고 ${bag.name} 가방을 멘 친구를 찾아줘!`,
    place: `${person.block.name} 근처에 있어요.`,
    hat, bag, hatShape: HATS[person.hatStyle].shape
  };
}

export function personIsDiscoverable(town, personId) {
  const person = town.people.find(p => p.id === personId);
  if (!person) return false;
  return town.people.filter(p => p.hatStyle === person.hatStyle && p.hatColor === person.hatColor && p.bagColor === person.bagColor).length === 1;
}
