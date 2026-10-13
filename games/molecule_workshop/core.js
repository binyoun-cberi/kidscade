(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MoleculeWorkshopCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ELEMENTS = Object.freeze([
    { symbol: 'H', name: '수소', color: '#ff8fa3', hint: '가볍고 작은 원자예요.' },
    { symbol: 'C', name: '탄소', color: '#65758b', hint: '생명체를 이루는 중요한 원자예요.' },
    { symbol: 'N', name: '질소', color: '#6595ff', hint: '공기의 대부분을 차지해요.' },
    { symbol: 'O', name: '산소', color: '#ff725e', hint: '공기와 물에서 만날 수 있어요.' },
    { symbol: 'Na', name: '나트륨', color: '#bd83f4', hint: '소금의 한쪽을 이루는 원자예요.' },
    { symbol: 'Cl', name: '염소', color: '#7bc85d', hint: '소금의 다른 쪽을 이루는 원자예요.' },
    { symbol: 'Ca', name: '칼슘', color: '#e7b64d', hint: '조개껍데기와 석회암에서 만나요.' },
    { symbol: 'Mg', name: '마그네슘', color: '#54c8bf', hint: '가벼운 금속을 이루는 원자예요.' },
    { symbol: 'S', name: '황', color: '#e2bd46', hint: '노란색 원소로 알려져 있어요.' }
  ]);

  // Formula cards are classroom models, not recipes for making substances.
  const RECIPES = Object.freeze([
    { id: 'water', name: '물', formula: 'H₂O', composition: { H: 2, O: 1 }, kind: '분자', fact: '물 분자 하나는 수소 원자 2개와 산소 원자 1개로 이루어져요.', color: '#5ba9ff', level: 1 },
    { id: 'hydrogen', name: '수소 분자', formula: 'H₂', composition: { H: 2 }, kind: '분자', fact: '수소 원자 두 개가 짝을 이룬 분자예요.', color: '#ff8fa3', level: 1 },
    { id: 'oxygen', name: '산소 분자', formula: 'O₂', composition: { O: 2 }, kind: '분자', fact: '우리가 숨 쉬는 공기 속 산소는 주로 O₂ 분자로 있어요.', color: '#ff725e', level: 1 },
    { id: 'nitrogen', name: '질소 분자', formula: 'N₂', composition: { N: 2 }, kind: '분자', fact: '지구 대기의 가장 큰 부분은 질소예요. 공기 속 질소는 주로 N₂로 존재해요.', color: '#6595ff', level: 1 },
    { id: 'carbon-dioxide', name: '이산화 탄소', formula: 'CO₂', composition: { C: 1, O: 2 }, kind: '분자', fact: '사람과 동물의 호흡, 식물의 광합성과 관련 있는 기체예요.', color: '#74849a', level: 1 },
    { id: 'methane', name: '메테인', formula: 'CH₄', composition: { C: 1, H: 4 }, kind: '분자', fact: '천연가스의 주성분으로 알려져 있어요. 실제 가스나 불을 다루는 활동은 하지 않아요.', color: '#ffad65', level: 2 },
    { id: 'ammonia', name: '암모니아', formula: 'NH₃', composition: { N: 1, H: 3 }, kind: '분자', fact: '질소와 수소로 이루어진 분자예요. 이 게임은 기호와 개수만 다루는 모형 활동이에요.', color: '#72a8ff', level: 2 },
    { id: 'sodium-chloride', name: '염화 나트륨', formula: 'NaCl', composition: { Na: 1, Cl: 1 }, kind: '이온 화합물', fact: '소금의 주성분이에요. NaCl은 분자 하나라기보다 이온이 반복된 비율을 나타내는 화학식이에요.', color: '#9b83db', level: 2 },
    { id: 'magnesium-oxide', name: '산화 마그네슘', formula: 'MgO', composition: { Mg: 1, O: 1 }, kind: '이온 화합물', fact: '마그네슘과 산소가 1:1 비율로 이루어진 화합물이에요.', color: '#55bfb0', level: 2 },
    { id: 'calcium-carbonate', name: '탄산 칼슘', formula: 'CaCO₃', composition: { Ca: 1, C: 1, O: 3 }, kind: '이온 화합물', fact: '조개껍데기와 석회암의 주요 성분이에요. 원자 타일 5개를 모아 볼까요?', color: '#e0b352', level: 3 },
    { id: 'sulfur-dioxide', name: '이산화 황', formula: 'SO₂', composition: { S: 1, O: 2 }, kind: '분자', fact: '황 원자 1개와 산소 원자 2개로 나타내는 분자예요. 이름과 화학식을 연결해 봐요.', color: '#d5ac41', level: 3 },
    { id: 'sodium-bicarbonate', name: '탄산수소 나트륨', formula: 'NaHCO₃', composition: { Na: 1, H: 1, C: 1, O: 3 }, kind: '이온 화합물', fact: '베이킹소다의 화학식이에요. 이 게임에서는 원자 개수를 세는 모형으로만 살펴봐요.', color: '#73b5a5', level: 3 }
  ]);

  const MAX_TILES = 8;
  const elementBySymbol = new Map(ELEMENTS.map(item => [item.symbol, item]));
  const recipeById = new Map(RECIPES.map(item => [item.id, item]));

  function signature(composition) {
    return Object.entries(composition || {}).filter(([, count]) => Number(count) > 0)
      .map(([symbol, count]) => `${symbol}:${Number(count)}`).sort().join('|');
  }

  const recipesBySignature = new Map(RECIPES.map(recipe => [signature(recipe.composition), recipe]));

  function countTiles(tiles) {
    const counts = Object.create(null);
    for (const symbol of Array.isArray(tiles) ? tiles : []) {
      if (elementBySymbol.has(symbol)) counts[symbol] = (counts[symbol] || 0) + 1;
    }
    return counts;
  }

  function findRecipe(tiles) {
    const values = Array.isArray(tiles) ? tiles : [];
    if (!values.length || values.length > MAX_TILES || values.some(symbol => !elementBySymbol.has(symbol))) return null;
    return recipesBySignature.get(signature(countTiles(values))) || null;
  }

  function compositionLabel(composition) {
    return Object.entries(composition || {}).filter(([, count]) => Number(count) > 0)
      .map(([symbol, count]) => `${symbol}${count > 1 ? count : ''}`).join(' · ');
  }

  function formulaFromCounts(composition) {
    return Object.entries(composition || {}).filter(([, count]) => Number(count) > 0)
      .map(([symbol, count]) => `${symbol}${Number(count) > 1 ? count : ''}`).join('');
  }

  function normalizeSave(value) {
    const input = value && typeof value === 'object' ? value : {};
    const seen = new Set(RECIPES.map(recipe => recipe.id));
    return {
      discovered: [...new Set((Array.isArray(input.discovered) ? input.discovered : []).filter(id => seen.has(id)))],
      completed: [...new Set((Array.isArray(input.completed) ? input.completed : []).filter(id => seen.has(id)))],
      bestScore: Math.max(0, Math.floor(Number(input.bestScore) || 0)),
      discoveries: Math.max(0, Math.floor(Number(input.discoveries) || 0))
    };
  }

  return Object.freeze({ ELEMENTS, RECIPES, MAX_TILES, elementBySymbol, recipeById, signature, countTiles, findRecipe, compositionLabel, formulaFromCounts, normalizeSave });
});
