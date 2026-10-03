#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
HAIR = AVATAR / "runtime/hair"
APPROVED = HAIR / "approved"
MANIFEST = HAIR / "approved-hair-manifest.json"

STYLES = [
    ("male-short-01", "콤마 사이드파트", "hair-male-01.png"),
    ("male-short-02", "라운드 보울컷", "hair-male-02.png"),
    ("male-short-03", "클린 센터파트", "hair-male-03.png"),
    ("male-short-04", "소프트 투블럭", "hair-male-04.png"),
    ("male-short-05", "텍스처 스파이크", "hair-male-05.png"),
    ("male-short-06", "레이어드 울프컷", "hair-male-06.png"),
    ("male-short-07", "쇼트 크롭", "hair-male-07.png"),
    ("male-short-08", "미니 퀴프", "hair-male-08.png"),
    ("male-short-09", "비대칭 사이드스윕", "hair-male-09.png"),
    ("male-short-10", "플러피 머쉬룸", "hair-male-10.png"),
]

# Each generated sprite is authored on an arbitrary transparent square. Normalize the
# visible hair pixels into Kidscade's actual head coordinate system instead of drawing
# the whole source canvas from (0, 0).
FIT_VERSION = "short-head-fit-v2"
HEAD_FIT = {
    "male-short-01": {"maxW": 60, "maxH": 46, "top": 9},
    "male-short-02": {"maxW": 58, "maxH": 42, "top": 11},
    "male-short-03": {"maxW": 60, "maxH": 46, "top": 9},
    "male-short-04": {"maxW": 60, "maxH": 44, "top": 10},
    "male-short-05": {"maxW": 64, "maxH": 50, "top": 6},
    "male-short-06": {"maxW": 64, "maxH": 50, "top": 6},
    "male-short-07": {"maxW": 54, "maxH": 40, "top": 12},
    "male-short-08": {"maxW": 58, "maxH": 44, "top": 8},
    "male-short-09": {"maxW": 62, "maxH": 48, "top": 9},
    "male-short-10": {"maxW": 60, "maxH": 44, "top": 9},
}

CANVAS = 128
HEAD_CENTER_X = 65.5
SOURCE_RE = re.compile(r"^ChatGPT 이미지 .+-(\d+)\.png$")


def source_index(path: Path) -> int:
    match = SOURCE_RE.match(path.name)
    return int(match.group(1)) if match else 9999


def clean_alpha(rgba: Image.Image) -> Image.Image:
    rgba = rgba.convert("RGBA")
    data = list(rgba.getdata())
    cleaned = []
    for r, g, b, a in data:
        if a < 32:
            cleaned.append((0, 0, 0, 0))
        elif a > 224:
            cleaned.append((r, g, b, 255))
        else:
            cleaned.append((r, g, b, a))
    rgba.putdata(cleaned)
    return rgba


def keep_largest_component(rgba: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha = rgba.getchannel("A")
    w, h = rgba.size
    mask = [[alpha.getpixel((x, y)) >= 32 for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    best: list[tuple[int, int]] = []

    for y in range(h):
        for x in range(w):
            if not mask[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            comp: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for ny in range(max(0, cy - 1), min(h, cy + 2)):
                    for nx in range(max(0, cx - 1), min(w, cx + 2)):
                        if (nx != cx or ny != cy) and mask[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            if len(comp) > len(best):
                best = comp

    if not best:
        raise SystemExit("Hair sprite contains no visible pixels.")

    allowed = set(best)
    out = rgba.copy()
    px = out.load()
    for y in range(h):
        for x in range(w):
            if alpha.getpixel((x, y)) >= 32 and (x, y) not in allowed:
                px[x, y] = (0, 0, 0, 0)

    xs = [p[0] for p in best]
    ys = [p[1] for p in best]
    bbox = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    return out, bbox

def fit_sprite_to_head(src: Path, dst: Path, hair_id: str) -> dict[str, object]:
    cfg = HEAD_FIT[hair_id]
    with Image.open(src) as image:
        rgba = clean_alpha(image.convert("RGBA"))
        if rgba.size != (CANVAS, CANVAS):
            rgba = rgba.resize((CANVAS, CANVAS), Image.Resampling.NEAREST)

        rgba, before = keep_largest_component(rgba)
        crop = rgba.crop(before)

        scale = min(cfg["maxW"] / crop.width, cfg["maxH"] / crop.height)
        new_w = max(1, round(crop.width * scale))
        new_h = max(1, round(crop.height * scale))
        resized = crop.resize((new_w, new_h), Image.Resampling.NEAREST)

        left = round(HEAD_CENTER_X - new_w / 2)
        top = int(cfg["top"])
        if left < 5 or left + new_w > CANVAS - 5 or top < 5 or top + new_h > CANVAS - 5:
            raise SystemExit(
                f"{src.name}: head-fit target escapes safe area: "
                f"{(left, top, left + new_w, top + new_h)}"
            )

        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.alpha_composite(resized, (left, top))
        dst.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dst, "PNG", optimize=True)

        _, after = keep_largest_component(canvas)
        print(
            f"{hair_id}: bbox {before} -> {after}, "
            f"content {crop.size} -> {(new_w, new_h)}, scale={scale:.3f}"
        )
        return {
            "version": FIT_VERSION,
            "sourceBBox": list(before),
            "targetBBox": list(after),
            "headAnchor": [HEAD_CENTER_X, 20],
            "runtimeScale": 1,
            "runtimeOffset": [0, 0],
        }


def import_raw_sources() -> bool:
    sources = sorted(
        [p for p in HAIR.glob("*.png") if SOURCE_RE.match(p.name)],
        key=source_index,
    )
    if not sources:
        return False
    if len(sources) != len(STYLES):
        raise SystemExit(f"Expected {len(STYLES)} raw hair sprites, found {len(sources)}")

    for src, (_, _, filename) in zip(sources, STYLES):
        with Image.open(src) as image:
            rgba = clean_alpha(image.convert("RGBA"))
            if rgba.width != rgba.height:
                raise SystemExit(f"{src.name}: expected square source, got {rgba.size}")
            alpha = rgba.getchannel("A")
            corners = [
                alpha.getpixel((0, 0)),
                alpha.getpixel((rgba.width - 1, 0)),
                alpha.getpixel((0, rgba.height - 1)),
                alpha.getpixel((rgba.width - 1, rgba.height - 1)),
            ]
            if any(value > 16 for value in corners):
                raise SystemExit(f"{src.name}: transparent canvas check failed; corner alpha={corners}")
            if rgba.size != (CANVAS, CANVAS):
                rgba = rgba.resize((CANVAS, CANVAS), Image.Resampling.NEAREST)
            APPROVED.mkdir(parents=True, exist_ok=True)
            rgba.save(APPROVED / filename, "PNG", optimize=True)
            print(f"Imported {src.name} -> {filename}")

    for src in sources:
        src.unlink()
    return True


def main() -> None:
    imported_raw = import_raw_sources()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    previous_by_id = {
        str(item.get("id")): item
        for item in manifest.get("items", [])
        if isinstance(item, dict) and item.get("id")
    }
    items = [
        item for item in manifest.get("items", [])
        if not str(item.get("id", "")).startswith("male-short-")
        and item.get("id") != "clean-01"
    ]

    for hair_id, name, filename in STYLES:
        path = APPROVED / filename
        if not path.exists():
            raise SystemExit(f"Missing approved source sprite: {path}")
        previous = previous_by_id.get(hair_id) or {}
        previous_norm = previous.get("normalization") if isinstance(previous, dict) else None
        already_current = (
            isinstance(previous_norm, dict)
            and previous_norm.get("version") == FIT_VERSION
        )
        if imported_raw or not already_current:
            normalization = fit_sprite_to_head(path, path, hair_id)
        else:
            normalization = previous_norm
            print(f"{hair_id}: already normalized with {FIT_VERSION}; keeping existing pixels")
        items.append({
            "id": hair_id,
            "name": name,
            "category": "short-male",
            "approved": True,
            "front": f"runtime/hair/approved/{filename}",
            "back": None,
            "extra": [],
            "source": "standalone-generated-head-fit-128x128",
            "normalization": normalization,
            "notes": [
                "visible hair pixels normalized to Kidscade head coordinates",
                "transparent standalone PNG",
                "runtime scale 1 / offset 0",
            ],
        })

    manifest["version"] = 5
    manifest["fallbackId"] = "male-short-01"
    manifest["coordinateSystem"]["centerX"] = HEAD_CENTER_X
    manifest["coordinateSystem"]["headTopY"] = 20
    manifest["coordinateSystem"]["runtimeScale"] = 1
    manifest["coordinateSystem"]["runtimeOffset"] = [0, 0]
    manifest["items"] = items
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Approved hair catalog now contains {len(items)} items.")


if __name__ == "__main__":
    main()