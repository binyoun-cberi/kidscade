#!/usr/bin/env python3
from __future__ import annotations

import json
import re
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
    ("male-short-03", "센터 커튼", "hair-male-03.png"),
    ("male-short-04", "소프트 투블럭", "hair-male-04.png"),
    ("male-short-05", "텍스처 스파이크", "hair-male-05.png"),
    ("male-short-06", "레이어드 울프컷", "hair-male-06.png"),
    ("male-short-07", "쇼트 크롭", "hair-male-07.png"),
    ("male-short-08", "미니 퀴프", "hair-male-08.png"),
    ("male-short-09", "비대칭 사이드스윕", "hair-male-09.png"),
    ("male-short-10", "플러피 머쉬룸", "hair-male-10.png"),
]

SOURCE_RE = re.compile(r"^ChatGPT 이미지 .+-(\d+)\.png$")


def source_index(path: Path) -> int:
    match = SOURCE_RE.match(path.name)
    return int(match.group(1)) if match else 9999


def normalize_sprite(src: Path, dst: Path) -> None:
    with Image.open(src) as image:
        rgba = image.convert("RGBA")
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

        transparent = sum(1 for value in alpha.getdata() if value <= 16)
        ratio = transparent / (rgba.width * rgba.height)
        if ratio < 0.35:
            raise SystemExit(f"{src.name}: too little transparent canvas ({ratio:.1%})")

        if rgba.size != (128, 128):
            rgba = rgba.resize((128, 128), Image.Resampling.NEAREST)

        dst.parent.mkdir(parents=True, exist_ok=True)
        rgba.save(dst, "PNG", optimize=True)


def main() -> None:
    sources = sorted(
        [p for p in HAIR.glob("*.png") if SOURCE_RE.match(p.name)],
        key=source_index,
    )

    if not sources:
        print("No raw ChatGPT hair sprites to import.")
        return

    if len(sources) != len(STYLES):
        raise SystemExit(f"Expected {len(STYLES)} raw hair sprites, found {len(sources)}")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    items = [
        item for item in manifest.get("items", [])
        if not str(item.get("id", "")).startswith("male-short-")
    ]

    for src, (hair_id, name, filename) in zip(sources, STYLES):
        dst = APPROVED / filename
        normalize_sprite(src, dst)
        items.append({
            "id": hair_id,
            "name": name,
            "category": "short-male",
            "approved": True,
            "front": f"runtime/hair/approved/{filename}",
            "back": None,
            "extra": [],
            "source": "standalone-generated-normalized-128x128",
            "notes": [
                "full-canvas nearest-neighbor normalization to 128x128",
                "transparent standalone PNG",
                "no runtime position correction",
            ],
        })
        print(f"Imported {src.name} -> {dst.name}")

    manifest["version"] = max(2, int(manifest.get("version", 1)))
    manifest["items"] = items
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    for src in sources:
        src.unlink()

    print(f"Approved hair catalog now contains {len(items)} items.")


if __name__ == "__main__":
    main()
