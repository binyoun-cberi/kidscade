#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/hair/front-sheets"
OUT = AVATAR / "runtime/hair/front"
QA = AVATAR / "qa/hair-front"
BASE = AVATAR / "runtime/base/master-base-128.png"

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
            touches = []
            if bbox:
                if bbox[0] <= 0: touches.append("left")
                if bbox[1] <= 0: touches.append("top")
                if bbox[2] >= RUNTIME: touches.append("right")
                if bbox[3] >= RUNTIME: touches.append("bottom")

            items.append({
                "id": name[:-4],
                "file": f"{kind}/{name}",
                "sourceCell": [col, row],
                "bbox": list(bbox) if bbox else None,
                "touchesCanvasEdge": touches,
                "needsLayerReview": bool(touches),
            })
            n += 1

    return {
        "source": source.name,
        "sourceSize": [w, h],
        "cellSize": [cw, ch],
        "count": len(items),
        "items": items,
    }

def build_contact(kind):
    if not BASE.exists():
        raise FileNotFoundError(BASE)

    base = Image.open(BASE).convert("RGBA")
    if base.size != (RUNTIME, RUNTIME):
        base = base.resize((RUNTIME, RUNTIME), Image.Resampling.NEAREST)

    cell = RUNTIME
    sheet = Image.new("RGBA", (COLS * cell, ROWS * cell), (242, 242, 242, 255))
    draw = ImageDraw.Draw(sheet)
    target = OUT / kind

    for i in range(24):
        row, col = divmod(i, COLS)
        hair = Image.open(target / f"hair-front-{kind}-{i+1:02d}.png").convert("RGBA")
        preview = base.copy()
        preview.alpha_composite(hair)
        x, y = col * cell, row * cell
        sheet.alpha_composite(preview, (x, y))
        draw.rectangle((x, y, x + cell - 1, y + cell - 1), outline=(190, 190, 190, 255))

    QA.mkdir(parents=True, exist_ok=True)
    path = QA / f"front-hair-{kind}-contact.png"
    sheet.save(path, optimize=True)
    return str(path.relative_to(AVATAR))

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    result = {
        "version": 2,
        "type": "kidscade-front-hair-pack",
        "canvas": [128, 128],
        "compositeAt": [0, 0],
        "imageSmoothing": False,
        "grid": [6, 4],
        "palette": "warm-medium-brown",
        "sets": {},
        "qa": {
            "status": "auto-extracted-awaiting-visual-approval",
            "checks": [
                "equal 6x4 source grid",
                "edge-connected background removal",
                "nearest-neighbor resize",
                "hard alpha",
                "128x128 common canvas",
                "master-base overlay contact sheets",
                "canvas-edge flags for suspicious front-hair pieces",
            ],
            "contacts": {},
        },
    }

    for kind, source in SHEETS.items():
        if not source.exists():
            raise FileNotFoundError(source)
        result["sets"][kind] = extract(kind, source)
        result["qa"]["contacts"][kind] = build_contact(kind)

    (OUT / "hair-front-manifest.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Generated 48 front-hair runtime parts and 2 overlay contact sheets.")

if __name__ == "__main__":
    main()
