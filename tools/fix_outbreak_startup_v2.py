from pathlib import Path
import re

p = Path('outbreak_korea_v3.html')
s = p.read_text(encoding='utf-8')

# Fix the extra closing brace introduced in transportSpreadStep during the people-count conversion.
old = ")}}\n }\n}\n\nfunction selectRegion(id)"
new = ")}}\n}\n\nfunction selectRegion(id)"
if old not in s:
    raise SystemExit('transportSpreadStep brace pattern not found')
s = s.replace(old, new, 1)

# Make start selection defensive in case a browser briefly exposes an empty select value.
old_start = "state.selected=$('#startRegion').value;Object.assign(state.stats,pathogenTypes[state.type].stats);"
new_start = "state.selected=$('#startRegion').value||'chungbuk';if(!state.regions[state.selected])state.selected='chungbuk';Object.assign(state.stats,pathogenTypes[state.type].stats);"
if old_start in s:
    s = s.replace(old_start, new_start, 1)

# Ensure the region dropdown initializer is still present.
if "$('#startRegion').appendChild(o)" not in s:
    raise SystemExit('startRegion population code missing')
if 'id="startRegion"' not in s:
    raise SystemExit('startRegion select missing')

p.write_text(s, encoding='utf-8')

# Extract inline scripts for the workflow's Node syntax check.
scripts = re.findall(r'<script>(.*?)</script>', s, re.S)
if len(scripts) < 2:
    raise SystemExit(f'unexpected script count: {len(scripts)}')
for i, src in enumerate(scripts):
    Path(f'/tmp/outbreak_{i}.js').write_text(src, encoding='utf-8')
print(f'patched startup; extracted {len(scripts)} scripts')
