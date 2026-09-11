from pathlib import Path
import re

p = Path('블록래프트.html')
s = p.read_text(encoding='utf-8')

old_css = "#game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }"
new_css = "#game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; touch-action: none; overscroll-behavior: none; }"
if old_css not in s:
    raise SystemExit('game canvas CSS anchor not found')
s = s.replace(old_css, new_css, 1)

pattern = re.compile(r"  let lookPointer = null;\n  let lookX = 0;\n  let lookY = 0;\n  canvas\.addEventListener\('pointerdown',\(event\) => \{.*?  canvas\.addEventListener\('pointerup',\(event\) => \{\n    if \(event\.pointerId === lookPointer\) lookPointer = null;\n  \}\);", re.S)
replacement = """  let lookPointer = null;
  let lookX = 0;
  let lookY = 0;

  function isMobileLookPointer(event) {
    return event.pointerType === 'touch' || event.pointerType === 'pen' || matchMedia('(pointer: coarse)').matches;
  }

  canvas.addEventListener('pointerdown',(event) => {
    if (!isMobileLookPointer(event) || activePanel || lookPointer !== null || event.clientX < innerWidth * .34) return;
    event.preventDefault();
    lookPointer = event.pointerId;
    lookX = event.clientX;
    lookY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  });

  canvas.addEventListener('pointermove',(event) => {
    if (event.pointerId !== lookPointer) return;
    event.preventDefault();
    const dx = event.clientX - lookX;
    const dy = event.clientY - lookY;
    if (fishing.phase === 'fight') {
      fishing.rod = Math.max(-1,Math.min(1,fishing.rod + dx * .012));
      state.player.yaw -= dx * .0014;
    } else {
      state.player.yaw -= dx * .006;
    }
    state.player.pitch -= dy * (fishing.phase === 'fight' ? .0015 : .0045);
    state.player.pitch = Math.max(-1.12,Math.min(1.05,state.player.pitch));
    lookX = event.clientX;
    lookY = event.clientY;
  });

  function releaseLookPointer(event) {
    if (event.pointerId !== lookPointer) return;
    try {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
    lookPointer = null;
  }

  canvas.addEventListener('pointerup', releaseLookPointer);
  canvas.addEventListener('pointercancel', releaseLookPointer);
  canvas.addEventListener('lostpointercapture', releaseLookPointer);"""

s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'mobile look block replacement count = {n}')
s = s2

hint_anchor = "  const joystick = $('#joystick');"
if hint_anchor not in s:
    raise SystemExit('joystick anchor not found')
mobile_hint = """  if (matchMedia('(pointer: coarse)').matches) {
    setTimeout(() => {
      if (running && !activePanel) toast('오른쪽 화면을 손가락으로 드래그하면 시점이 돌아가요.');
    }, 900);
  }

"""
s = s.replace(hint_anchor, mobile_hint + hint_anchor, 1)

p.write_text(s, encoding='utf-8')
print('patched 블록래프트.html mobile look controls')
