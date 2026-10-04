(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const screens = {
  upload: $('uploadScreen'),
  line: $('lineScreen'),
  paint: $('paintScreen'),
  result: $('resultScreen')
};
const sourcePreview = $('sourcePreview');
const colorCanvas = $('colorCanvas');
const lineCanvas = $('lineCanvas');
const peekCanvas = $('peekCanvas');
const sourceCanvas = document.createElement('canvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
const lineCtx = lineCanvas.getContext('2d');
const peekCtx = peekCanvas.getContext('2d');
const presets = {
  simple: { blur: 3, threshold: 118, thickness: 2, seal: 2 },
  normal: { blur: 2, threshold: 86, thickness: 2, seal: 1 },
  detail: { blur: 1, threshold: 56, thickness: 1, seal: 1 }
};
const state = {
  image: null,
  width: 0,
  height: 0,
  candidates: {},
  preset: 'normal',
  mask: null,
  regionMap: null,
  regions: [],
  targetArea: 0,
  painted: new Set(),
  tool: 'bucket',
  color: '#ef4444',
  photoColor: false,
  brushSize: 18,
  safe: true,
  drawing: false,
  activeRegion: -1,
  lastPoint: null,
  undo: [],
  redo: [],
  pendingLarge: null
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}
function resetAll() {
  state.image = null;
  state.candidates = {};
  state.mask = null;
  state.regionMap = null;
  state.regions = [];
  state.painted.clear();
  state.undo = [];
  state.redo = [];
  $('cameraInput').value = '';
  $('galleryInput').value = '';
  showScreen('upload');
}
$('homeBtn').addEventListener('click', resetAll);
$('newPhotoBtn').addEventListener('click', resetAll);
$('pickOtherBtn').addEventListener('click', resetAll);
$('cameraBtn').addEventListener('click', () => $('cameraInput').click());
$('galleryBtn').addEventListener('click', () => $('galleryInput').click());
$('cameraInput').addEventListener('change', onFile);
$('galleryInput').addEventListener('change', onFile);

async function onFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  try {
    $('processNote').textContent = '사진에서 선을 찾고 있어요…';
    showScreen('line');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      state.image = img;
      prepareSource(img);
      setTimeout(buildCandidates, 30);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast('사진을 열지 못했어요. 다른 사진을 골라주세요.');
      showScreen('upload');
    };
    img.src = url;
  } catch (error) {
    console.error(error);
    toast('사진을 준비하다 문제가 생겼어요.');
    showScreen('upload');
  }
}

function prepareSource(img) {
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  state.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  state.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  sourceCanvas.width = state.width;
  sourceCanvas.height = state.height;
  sourceCtx.fillStyle = '#fff';
  sourceCtx.fillRect(0, 0, state.width, state.height);
  sourceCtx.drawImage(img, 0, 0, state.width, state.height);
  sourcePreview.width = state.width;
  sourcePreview.height = state.height;
  sourcePreview.getContext('2d').drawImage(sourceCanvas, 0, 0);
}

function buildCandidates() {
  const image = sourceCtx.getImageData(0, 0, state.width, state.height);
  const gray = toGray(image.data, state.width, state.height);
  Object.keys(presets).forEach((name) => {
    const p = presets[name];
    const blurred = boxBlur(gray, state.width, state.height, p.blur);
    let mask = sobelMask(blurred, state.width, state.height, p.threshold);
    mask = dilate(mask, state.width, state.height, p.thickness);
    for (let i = 0; i < p.seal; i++) mask = sealGaps(mask, state.width, state.height);
    state.candidates[name] = mask;
    const cardCanvas = document.querySelector('.preset-card[data-preset="' + name + '"] canvas');
    drawMaskPreview(cardCanvas, mask, state.width, state.height);
  });
  $('processNote').textContent = '완성! 세 가지 중 하나를 골라보세요.';
  $('startColorBtn').disabled = false;
}

function toGray(data, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = data[p] * .299 + data[p + 1] * .587 + data[p + 2] * .114;
  }
  return gray;
}
function boxBlur(src, w, h, radius) {
  if (!radius) return src.slice();
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += src[y * w + Math.max(0, Math.min(w - 1, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / size;
      const removeX = Math.max(0, x - radius);
      const addX = Math.min(w - 1, x + radius + 1);
      sum += src[y * w + addX] - src[y * w + removeX];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / size;
      const removeY = Math.max(0, y - radius);
      const addY = Math.min(h - 1, y + radius + 1);
      sum += tmp[addY * w + x] - tmp[removeY * w + x];
    }
  }
  return out;
}
function sobelMask(gray, w, h, threshold) {
  const mask = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = gray[i - w - 1], b = gray[i - w], c = gray[i - w + 1];
      const d = gray[i - 1], f = gray[i + 1];
      const g = gray[i + w - 1], hh = gray[i + w], j = gray[i + w + 1];
      const gx = -a + c - 2 * d + 2 * f - g + j;
      const gy = -a - 2 * b - c + g + 2 * hh + j;
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag >= threshold) mask[i] = 1;
    }
  }
  for (let x = 0; x < w; x++) { mask[x] = 1; mask[(h - 1) * w + x] = 1; }
  for (let y = 0; y < h; y++) { mask[y * w] = 1; mask[y * w + w - 1] = 1; }
  return mask;
}
function dilate(src, w, h, radius) {
  if (radius <= 0) return src;
  const out = src.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!src[y * w + x]) continue;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) out[yy * w + xx] = 1;
      }
    }
  }
  return out;
}
function sealGaps(src, w, h) {
  const out = src.slice();
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (src[i]) continue;
      const horiz = (src[i - 1] || src[i - 2]) && (src[i + 1] || src[i + 2]);
      const vert = (src[i - w] || src[i - 2 * w]) && (src[i + w] || src[i + 2 * w]);
      if (horiz || vert) out[i] = 1;
    }
  }
  return out;
}
function drawMaskPreview(canvas, mask, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const im = ctx.createImageData(w, h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const v = mask[i] ? 25 : 255;
    im.data[p] = im.data[p + 1] = im.data[p + 2] = v;
    im.data[p + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

document.querySelectorAll('.preset-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    state.preset = card.dataset.preset;
  });
});
$('startColorBtn').addEventListener('click', startPainting);

function startPainting() {
  const mask = state.candidates[state.preset];
  if (!mask) return;
  state.mask = mask.slice();
  [colorCanvas, lineCanvas, peekCanvas].forEach((canvas) => {
    canvas.width = state.width;
    canvas.height = state.height;
    canvas.style.aspectRatio = state.width + ' / ' + state.height;
  });
  colorCtx.fillStyle = '#fff';
  colorCtx.fillRect(0, 0, state.width, state.height);
  drawLineLayer();
  peekCtx.clearRect(0, 0, state.width, state.height);
  peekCtx.drawImage(sourceCanvas, 0, 0);
  buildRegions();
  state.painted.clear();
  state.undo = [];
  state.redo = [];
  updateProgress();
  resizeStage();
  showScreen('paint');
  window.KidscadeGame && window.KidscadeGame.start && window.KidscadeGame.start();
}
function drawLineLayer() {
  lineCtx.clearRect(0, 0, state.width, state.height);
  const im = lineCtx.createImageData(state.width, state.height);
  for (let i = 0, p = 0; i < state.mask.length; i++, p += 4) {
    if (state.mask[i]) {
      im.data[p] = im.data[p + 1] = im.data[p + 2] = 20;
      im.data[p + 3] = 255;
    }
  }
  lineCtx.putImageData(im, 0, 0);
}

function buildRegions() {
  const total = state.width * state.height;
  const map = new Int32Array(total);
  map.fill(-2);
  for (let i = 0; i < total; i++) if (state.mask[i]) map[i] = -1;
  const q = new Int32Array(total);
  const src = sourceCtx.getImageData(0, 0, state.width, state.height).data;
  const regions = [];
  let id = 0;
  for (let start = 0; start < total; start++) {
    if (map[start] !== -2) continue;
    let head = 0, tail = 0;
    q[tail++] = start;
    map[start] = id;
    let size = 0, touch = false, r = 0, g = 0, b = 0;
    while (head < tail) {
      const at = q[head++];
      const x = at % state.width;
      const y = (at / state.width) | 0;
      size++;
      const p = at * 4;
      r += src[p]; g += src[p + 1]; b += src[p + 2];
      if (x <= 4 || y <= 4 || x >= state.width - 5 || y >= state.height - 5) touch = true;
      if (x > 0) visit(at - 1);
      if (x < state.width - 1) visit(at + 1);
      if (y > 0) visit(at - state.width);
      if (y < state.height - 1) visit(at + state.width);
    }
    regions.push({ id, size, touch, color: rgbToHex(r / size, g / size, b / size) });
    id++;
    function visit(next) {
      if (map[next] === -2) { map[next] = id; q[tail++] = next; }
    }
  }
  state.regionMap = map;
  state.regions = regions;
  state.targetArea = regions.filter((r) => !r.touch && r.size > 180).reduce((sum, r) => sum + r.size, 0) || 1;
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function resizeStage() {
  const stage = $('canvasStage');
  const ratio = state.width / state.height;
  if (window.innerWidth > 900) {
    stage.style.minHeight = Math.min(720, Math.max(440, stage.clientWidth / ratio)) + 'px';
  }
}
window.addEventListener('resize', resizeStage);

document.querySelectorAll('.tool').forEach((btn) => btn.addEventListener('click', () => {
  document.querySelectorAll('.tool').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  state.tool = btn.dataset.tool;
}));
document.querySelectorAll('#palette button').forEach((btn, index) => btn.addEventListener('click', () => {
  document.querySelectorAll('#palette button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  state.color = btn.dataset.color;
  state.photoColor = false;
  $('photoColorBtn').classList.remove('active');
  $('colorPicker').value = state.color;
}));
document.querySelector('#palette button').classList.add('active');
$('colorPicker').addEventListener('input', (e) => {
  state.color = e.target.value;
  state.photoColor = false;
  $('photoColorBtn').classList.remove('active');
  document.querySelectorAll('#palette button').forEach((b) => b.classList.remove('active'));
});
$('photoColorBtn').addEventListener('click', () => {
  state.photoColor = !state.photoColor;
  $('photoColorBtn').classList.toggle('active', state.photoColor);
  toast(state.photoColor ? '영역을 누르면 사진 속 원래 색으로 칠해요.' : '직접 고른 색으로 칠해요.');
});
$('brushSize').addEventListener('input', (e) => {
  state.brushSize = Number(e.target.value);
  $('sizeLabel').textContent = state.brushSize;
});
$('safeBrush').addEventListener('change', (e) => state.safe = e.target.checked);

function pointerToPixel(event) {
  const rect = lineCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(state.width - 1, Math.floor((event.clientX - rect.left) * state.width / rect.width)));
  const y = Math.max(0, Math.min(state.height - 1, Math.floor((event.clientY - rect.top) * state.height / rect.height)));
  return { x, y, i: y * state.width + x };
}
lineCanvas.addEventListener('pointerdown', (event) => {
  if (!state.regionMap) return;
  event.preventDefault();
  lineCanvas.setPointerCapture && lineCanvas.setPointerCapture(event.pointerId);
  const pt = pointerToPixel(event);
  if (state.tool === 'bucket') {
    saveUndo();
    fillRegion(pt);
    return;
  }
  saveUndo();
  state.drawing = true;
  state.activeRegion = state.regionMap[pt.i];
  state.lastPoint = pt;
  paintStroke(pt, pt);
});
lineCanvas.addEventListener('pointermove', (event) => {
  if (!state.drawing) return;
  event.preventDefault();
  const pt = pointerToPixel(event);
  paintStroke(state.lastPoint, pt);
  state.lastPoint = pt;
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => lineCanvas.addEventListener(type, () => {
  if (state.drawing && state.activeRegion >= 0) state.painted.add(state.activeRegion);
  state.drawing = false;
  state.activeRegion = -1;
  state.lastPoint = null;
  updateProgress();
}));

function fillRegion(pt) {
  const id = state.regionMap[pt.i];
  if (id < 0) { toast('검은 선 안쪽을 눌러주세요.'); return; }
  const region = state.regions[id];
  const nearBorder = pt.x < 18 || pt.y < 18 || pt.x > state.width - 19 || pt.y > state.height - 19;
  const ratio = region.size / (state.width * state.height);
  if (region.touch && ratio > .36 && !nearBorder && state.pendingLarge !== id) {
    state.pendingLarge = id;
    setTimeout(() => { if (state.pendingLarge === id) state.pendingLarge = null; }, 2600);
    state.undo.pop();
    toast('선이 열린 것 같아요. 정말 칠하려면 한 번 더 눌러요.');
    return;
  }
  state.pendingLarge = null;
  const fill = state.photoColor ? region.color : state.color;
  const rgb = hexToRgb(fill);
  const im = colorCtx.getImageData(0, 0, state.width, state.height);
  for (let i = 0, p = 0; i < state.regionMap.length; i++, p += 4) {
    if (state.regionMap[i] === id) {
      im.data[p] = rgb[0]; im.data[p + 1] = rgb[1]; im.data[p + 2] = rgb[2]; im.data[p + 3] = 255;
    }
  }
  colorCtx.putImageData(im, 0, 0);
  state.painted.add(id);
  state.redo = [];
  updateProgress();
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function paintStroke(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(2, state.brushSize * .22)));
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(a.x + dx * s / steps);
    const y = Math.round(a.y + dy * s / steps);
    paintDot(x, y);
  }
  state.redo = [];
}
function paintDot(cx, cy) {
  const radius = Math.max(2, Math.round(state.brushSize / 2));
  const x0 = Math.max(0, cx - radius), y0 = Math.max(0, cy - radius);
  const x1 = Math.min(state.width - 1, cx + radius), y1 = Math.min(state.height - 1, cy + radius);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const im = colorCtx.getImageData(x0, y0, w, h);
  const rgb = state.tool === 'eraser' ? [255, 255, 255] : hexToRgb(state.color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x0 + x, gy = y0 + y;
      const ddx = gx - cx, ddy = gy - cy;
      if (ddx * ddx + ddy * ddy > radius * radius) continue;
      const global = gy * state.width + gx;
      if (state.mask[global]) continue;
      if (state.safe && state.activeRegion >= 0 && state.regionMap[global] !== state.activeRegion) continue;
      const p = (y * w + x) * 4;
      im.data[p] = rgb[0]; im.data[p + 1] = rgb[1]; im.data[p + 2] = rgb[2]; im.data[p + 3] = 255;
    }
  }
  colorCtx.putImageData(im, x0, y0);
}
function saveUndo() {
  state.undo.push({ image: colorCtx.getImageData(0, 0, state.width, state.height), painted: Array.from(state.painted) });
  if (state.undo.length > 8) state.undo.shift();
  state.redo = [];
}
function snapshot() {
  return { image: colorCtx.getImageData(0, 0, state.width, state.height), painted: Array.from(state.painted) };
}
$('undoBtn').addEventListener('click', () => {
  if (!state.undo.length) return toast('되돌릴 내용이 없어요.');
  state.redo.push(snapshot());
  const prev = state.undo.pop();
  colorCtx.putImageData(prev.image, 0, 0);
  state.painted = new Set(prev.painted);
  updateProgress();
});
$('redoBtn').addEventListener('click', () => {
  if (!state.redo.length) return toast('다시 할 내용이 없어요.');
  state.undo.push(snapshot());
  const next = state.redo.pop();
  colorCtx.putImageData(next.image, 0, 0);
  state.painted = new Set(next.painted);
  updateProgress();
});
$('clearBtn').addEventListener('click', () => {
  saveUndo();
  colorCtx.fillStyle = '#fff';
  colorCtx.fillRect(0, 0, state.width, state.height);
  state.painted.clear();
  updateProgress();
  toast('색칠만 깨끗하게 지웠어요.');
});
function updateProgress() {
  let done = 0;
  state.painted.forEach((id) => {
    const r = state.regions[id];
    if (r && !r.touch && r.size > 180) done += r.size;
  });
  const percent = Math.max(0, Math.min(100, Math.round(done / state.targetArea * 100)));
  $('progressText').textContent = percent + '%';
  $('progressBar').style.width = percent + '%';
}
function compositeCanvas(lineOnly) {
  const out = document.createElement('canvas');
  out.width = state.width;
  out.height = state.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  if (!lineOnly) ctx.drawImage(colorCanvas, 0, 0);
  ctx.drawImage(lineCanvas, 0, 0);
  return out;
}
function downloadCanvas(canvas, name) {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return toast('저장 파일을 만들지 못했어요.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('PNG로 저장했어요!');
  }, 'image/png');
}
$('lineOnlyBtn').addEventListener('click', () => downloadCanvas(compositeCanvas(true), 'kidscade-coloring-line.png'));
$('downloadBtn').addEventListener('click', () => downloadCanvas(compositeCanvas(false), 'kidscade-coloring-art.png'));
$('peekBtn').addEventListener('pointerdown', () => $('canvasStage').classList.add('peek'));
$('peekBtn').addEventListener('pointerup', () => $('canvasStage').classList.remove('peek'));
$('peekBtn').addEventListener('pointerleave', () => $('canvasStage').classList.remove('peek'));
$('peekBtn').addEventListener('click', () => {
  if (!matchMedia('(hover:hover)').matches) {
    $('canvasStage').classList.toggle('peek');
    $('peekBtn').textContent = $('canvasStage').classList.contains('peek') ? '🎨 색칠 보기' : '👀 원본 보기';
  }
});
$('finishBtn').addEventListener('click', () => {
  const line = compositeCanvas(true);
  const art = compositeCanvas(false);
  $('resultOriginal').src = sourceCanvas.toDataURL('image/jpeg', .9);
  $('resultLine').src = line.toDataURL('image/png');
  $('resultArt').src = art.toDataURL('image/png');
  showScreen('result');
  if (window.KidscadeGame && window.KidscadeGame.result) {
    const value = parseInt($('progressText').textContent, 10) || 0;
    window.KidscadeGame.result({ scope:'creation', status:'completed', outcome:'clear', score:value, completed:true });
  }
});
$('backPaintBtn').addEventListener('click', () => showScreen('paint'));

document.addEventListener('dragstart', (e) => e.preventDefault());
})();