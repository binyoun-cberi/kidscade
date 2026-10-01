#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/hair/front-sheets"
OUT = AVATAR / "runtime/hair/front"
COLS, ROWS, RUNTIME = 6, 4, 128
SHEETS = {
    "male": SOURCE / "front-hair-male-24-brown.png",
    "female": SOURCE / "front-hair-female-24-brown.png",
}

def dist(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5

def clear_bg(tile):
    im = tile.convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]

    if any(c[3] < 16 for c in corners):
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 24:
                    px[x, y] = (r, g, b, 0)
                elif a > 232:
                    px[x, y] = (r, g, b, 255)
        return im

    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    stack = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if a and dist((r, g, b), bg) > 34:
            continue
        px[x, y] = (r, g, b, 0)
        if x:
            stack.append((x-1, y))
        if x + 1 < w:
            stack.append((x+1, y))
        if y:
            stack.append((x, y-1))
        if y + 1 < h:
            stack.append((x, y+1))
    return im

def extract(kind, source):
    image = Image.open(source).convert("RGBA")
    w, h = image.size
    if w % COLS or h % ROWS:
        raise RuntimeError(f"{source.name}: expected 6x4 grid, got {w}x{h}")
    cw, ch = w // COLS, h // ROWS
    target = OUT / kind
    target.mkdir(parents=True, exist_ok=True)

    for old in target.glob("hair-front-*.png"):
        old.unlink()

    items = []
    n = 1
    for row in range(ROWS):
        for col in range(COLS):
            tile = image.crop((col*cw, row*ch, (col+1)*cw, (row+1)*ch))
            tile = clear_bg(tile).resize((RUNTIME, RUNTIME), Image.Resampling.NEAREST)
            tile.putdata([(r,g,b,255 if a >= 48 else 0) for r,g,b,a in tile.getdata()])

            name = f"hair-front-{kind}-{n:02d}.png"
            path = target / name
            tile.save(path, optimize=True)
            bbox = tile.getchannel("A").getbbox()
            items.append({
                "id": name[:-4],
                "file": f"{kind}/{name}",
                "sourceCell": [col, row],
                "bbox": list(bbox) if bbox else None,
            })
            n += 1

    return {
        "source": source.name,
        "sourceSize": [w, h],
        "cellSize": [cw, ch],
        "count": len(items),
        "items": items,
    }

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    result = {
        "version": 1,
        "type": "kidscade-front-hair-pack",
        "canvas": [128, 128],
        "compositeAt": [0, 0],
        "imageSmoothing": False,
        "grid": [6, 4],
        "palette": "warm-medium-brown",
        "sets": {},
        "qa": {
            "status": "auto-extracted-needs-overlay-review",
            "checks": [
                "equal 6x4 source grid",
                "edge-connected background removal",
                "nearest-neighbor resize",
                "hard alpha",
                "128x128 common canvas",
            ],
        },
    }

    for kind, source in SHEETS.items():
        if not source.exists():
            raise FileNotFoundError(source)
        result["sets"][kind] = extract(kind, source)

    (OUT / "hair-front-manifest.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Generated 48 front-hair runtime parts.")

if __name__ == "__main__":
    main()
