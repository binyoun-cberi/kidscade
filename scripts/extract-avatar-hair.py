#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/hair/front-sheets"
FRONT_OUT = AVATAR / "runtime/hair/front"
BACK_OUT = AVATAR / "runtime/hair/back"
QA = AVATAR / "qa/hair"
BASE = AVATAR / "runtime/base/master-base-128.png"
FACE = AVATAR / "runtime/face"

COLS, ROWS, RUNTIME = 6, 4, 128
HEAD_BOTTOM = 64
EAR_Y0, EAR_Y1 = 46, 57
EAR_INNER_LEFT, EAR_INNER_RIGHT = 44, 86

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
        if x: stack.append((x-1, y))
        if x + 1 < w: stack.append((x+1, y))
        if y: stack.append((x, y-1))
        if y + 1 < h: stack.append((x, y+1))
    return im

def hard_alpha(im):
    im = im.convert("RGBA")
    im.putdata([(r,g,b,255 if a >= 48 else 0) for r,g,b,a in im.getdata()])
    return im

def build_head_mask(base):
    alpha = base.getchannel("A")
    mask = Image.new("L", (RUNTIME, RUNTIME), 0)
    src = alpha.load()
    dst = mask.load()
    for y in range(RUNTIME):
        for x in range(RUNTIME):
            if y > HEAD_BOTTOM or src[x, y] == 0:
                continue
            # Keep existing ears visible: hair in these outer ear zones remains
            # in the back layer and is therefore occluded by the base ears.
            if EAR_Y0 <= y < EAR_Y1 and (x < EAR_INNER_LEFT or x > EAR_INNER_RIGHT):
                continue
            dst[x, y] = 255
    return mask

def split_full_hair(full, head_mask):
    # Back keeps the full hairstyle. Drawing the base over it naturally hides
    # hair that should sit behind the head/body.
    back = full.copy()

    # Front restores only pixels that overlap the bald head silhouette, with
    # ear-safe gaps. Long locks below the head remain behind the body.
    front = full.copy()
    a = front.getchannel("A")
    a = Image.composite(a, Image.new("L", a.size, 0), head_mask)
    front.putalpha(a)
    return back, front

def touches(bbox):
    if not bbox:
        return []
    out=[]
    if bbox[0] <= 0: out.append("left")
    if bbox[1] <= 0: out.append("top")
    if bbox[2] >= RUNTIME: out.append("right")
    if bbox[3] >= RUNTIME: out.append("bottom")
    return out

def extract(kind, source, head_mask):
    image = Image.open(source).convert("RGBA")
    w, h = image.size
    if w % COLS or h % ROWS:
        raise RuntimeError(f"{source.name}: expected 6x4 grid, got {w}x{h}")

    cw, ch = w // COLS, h // ROWS
    front_dir = FRONT_OUT / kind
    back_dir = BACK_OUT / kind
    front_dir.mkdir(parents=True, exist_ok=True)
    back_dir.mkdir(parents=True, exist_ok=True)

    for old in front_dir.glob("hair-front-*.png"): old.unlink()
    for old in back_dir.glob("hair-back-*.png"): old.unlink()

    items=[]
    n=1
    for row in range(ROWS):
        for col in range(COLS):
            tile=image.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
            full=hard_alpha(clear_bg(tile).resize((RUNTIME,RUNTIME),Image.Resampling.NEAREST))
            back,front=split_full_hair(full,head_mask)

            front_name=f"hair-front-{kind}-{n:02d}.png"
            back_name=f"hair-back-{kind}-{n:02d}.png"
            front.save(front_dir/front_name,optimize=True)
            back.save(back_dir/back_name,optimize=True)

            fb=front.getchannel("A").getbbox()
            bb=back.getchannel("A").getbbox()
            items.append({
                "id":f"hair-{kind}-{n:02d}",
                "front":f"../front/{kind}/{front_name}",
                "back":f"{kind}/{back_name}",
                "sourceCell":[col,row],
                "frontBBox":list(fb) if fb else None,
                "backBBox":list(bb) if bb else None,
                "backTouchesCanvasEdge":touches(bb),
            })
            n+=1

    return {
        "source":source.name,
        "sourceSize":[w,h],
        "cellSize":[cw,ch],
        "count":len(items),
        "items":items,
    }

def load_face_defaults():
    paths=[
        FACE/"eyes/eyes-01.png",
        FACE/"eyebrows/eyebrows-01.png",
        FACE/"noses/nose-01.png",
        FACE/"mouths/mouth-01.png",
    ]
    return [Image.open(p).convert("RGBA") for p in paths if p.exists()]

def build_contact(kind, base, face_parts):
    sheet=Image.new("RGBA",(COLS*RUNTIME,ROWS*RUNTIME),(242,242,242,255))
    draw=ImageDraw.Draw(sheet)
    for i in range(24):
        row,col=divmod(i,COLS)
        back=Image.open(BACK_OUT/kind/f"hair-back-{kind}-{i+1:02d}.png").convert("RGBA")
        front=Image.open(FRONT_OUT/kind/f"hair-front-{kind}-{i+1:02d}.png").convert("RGBA")
        preview=Image.new("RGBA",(RUNTIME,RUNTIME),(255,255,255,255))
        preview.alpha_composite(back)
        preview.alpha_composite(base)
        for face in face_parts:
            preview.alpha_composite(face)
        preview.alpha_composite(front)
        x,y=col*RUNTIME,row*RUNTIME
        sheet.alpha_composite(preview,(x,y))
        draw.rectangle((x,y,x+RUNTIME-1,y+RUNTIME-1),outline=(190,190,190,255))
    QA.mkdir(parents=True,exist_ok=True)
    path=QA/f"hair-split-{kind}-contact.png"
    sheet.save(path,optimize=True)
    return str(path.relative_to(AVATAR))

def main():
    if not BASE.exists():
        raise FileNotFoundError(BASE)
    base=Image.open(BASE).convert("RGBA")
    if base.size!=(RUNTIME,RUNTIME):
        base=base.resize((RUNTIME,RUNTIME),Image.Resampling.NEAREST)
    head_mask=build_head_mask(base)
    face_parts=load_face_defaults()

    FRONT_OUT.mkdir(parents=True,exist_ok=True)
    BACK_OUT.mkdir(parents=True,exist_ok=True)

    result={
        "version":3,
        "type":"kidscade-split-hair-pack",
        "canvas":[128,128],
        "compositeAt":[0,0],
        "layerOrder":["hairBack","base","face","hairFront"],
        "imageSmoothing":False,
        "grid":[6,4],
        "palette":"warm-medium-brown",
        "headMask":{
            "bottomY":HEAD_BOTTOM,
            "earSafe":{"y":[EAR_Y0,EAR_Y1],"innerX":[EAR_INNER_LEFT,EAR_INNER_RIGHT]}
        },
        "sets":{},
        "qa":{
            "status":"split-generated-awaiting-visual-approval",
            "checks":[
                "6x4 grid extraction",
                "128x128 hard-alpha assets",
                "full hairstyle retained as hairBack",
                "hairFront clipped to master-base head mask",
                "ear-safe front mask",
                "base + default face + hairBack + hairFront contact previews"
            ],
            "contacts":{}
        }
    }

    for kind,source in SHEETS.items():
        if not source.exists():
            raise FileNotFoundError(source)
        result["sets"][kind]=extract(kind,source,head_mask)
        result["qa"]["contacts"][kind]=build_contact(kind,base,face_parts)

    (BACK_OUT/"hair-split-manifest.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    print("Generated 48 hairBack + 48 hairFront assets and split-layer QA previews.")

if __name__=="__main__":
    main()
