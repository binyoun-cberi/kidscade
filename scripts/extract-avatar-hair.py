#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/hair/front-sheets"
FRONT_OUT = AVATAR / "runtime/hair/front"
BACK_OUT = AVATAR / "runtime/hair/back"
QA = AVATAR / "qa/hair"
BASE = AVATAR / "runtime/base/master-base-128.png"
FACE = AVATAR / "runtime/face"

COLS, ROWS, RUNTIME = 6, 4, 128
MASTER_HEAD_BBOX = (40, 20, 91, 67)
HEAD_BOTTOM = MASTER_HEAD_BBOX[3]
EAR_Y0, EAR_Y1 = 45, 58
EAR_INNER_LEFT, EAR_INNER_RIGHT = 44, 87

COMMON_CELL_FIT = {
    "scale": 0.66,
    "offsetX": 23,
    "offsetY": 0,
    "sourceCanvas": [128, 128],
    "mode": "fixed-source-cell",
}

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
        data=[]
        for r,g,b,a in im.getdata():
            data.append((r,g,b,0 if a < 24 else (255 if a > 232 else a)))
        im.putdata(data)
        return im

    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and dist((r, g, b), bg) <= 18:
                px[x, y] = (r, g, b, 0)

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

def remove_white_matte(im, bg_distance=112, passes=3):
    """Trim only near-background pixels connected to transparency.

    The source sheets are painted on white. Their antialiased border can leave
    pale pixels after background removal. Do not try to mathematically
    un-multiply those colors: that can turn pale fringe into black/red specks.
    Instead peel a few edge-connected, near-white layers and keep the actual
    brown hair colors untouched.
    """
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    for _ in range(passes):
        alpha = im.getchannel("A")
        apx = alpha.load()
        remove = []

        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0 or dist((r, g, b), bg) > bg_distance:
                    continue

                touches_transparency = False
                for ny in range(max(0, y-1), min(h, y+2)):
                    for nx in range(max(0, x-1), min(w, x+2)):
                        if nx == x and ny == y:
                            continue
                        if apx[nx, ny] == 0:
                            touches_transparency = True
                            break
                    if touches_transparency:
                        break

                if touches_transparency:
                    remove.append((x, y))

        if not remove:
            break
        for x, y in remove:
            px[x, y] = (0, 0, 0, 0)

    return im
def hard_alpha(im):
    im = im.convert("RGBA")
    im.putdata([
        (r,g,b,255) if a >= 48 else (0,0,0,0)
        for r,g,b,a in im.getdata()
    ])
    return im

def remove_tiny_components(im, min_pixels=8, keep_pixels=24, near_px=4):
    im = im.copy()
    alpha = im.getchannel("A")
    px = alpha.load()
    w,h = alpha.size
    seen = bytearray(w*h)
    comps=[]

    def key(x,y): return y*w+x

    for y in range(h):
        for x in range(w):
            if seen[key(x,y)] or px[x,y] == 0:
                continue
            q=deque([(x,y)])
            seen[key(x,y)]=1
            comp=[]
            minx=maxx=x
            miny=maxy=y
            while q:
                cx,cy=q.popleft()
                comp.append((cx,cy))
                minx=min(minx,cx); maxx=max(maxx,cx)
                miny=min(miny,cy); maxy=max(maxy,cy)
                for nx in range(cx-1,cx+2):
                    for ny in range(cy-1,cy+2):
                        if nx==cx and ny==cy: continue
                        if nx<0 or ny<0 or nx>=w or ny>=h: continue
                        k=key(nx,ny)
                        if seen[k] or px[nx,ny] == 0: continue
                        seen[k]=1
                        q.append((nx,ny))
            comps.append({
                "pixels":comp,
                "bbox":(minx,miny,maxx+1,maxy+1),
                "size":len(comp),
            })

    if not comps:
        return im

    main=max(comps,key=lambda v:v["size"])
    mx0,my0,mx1,my1=main["bbox"]

    def close_to_main(box):
        x0,y0,x1,y1=box
        gapx=max(mx0-x1,x0-mx1,0)
        gapy=max(my0-y1,y0-my1,0)
        return gapx<=near_px and gapy<=near_px

    for comp in comps:
        keep=(
            comp is main
            or comp["size"] >= keep_pixels
            or (comp["size"] >= min_pixels and close_to_main(comp["bbox"]))
        )
        if not keep:
            for cx,cy in comp["pixels"]:
                px[cx,cy]=0

    im.putalpha(alpha)
    return im

def place_hair_from_source_cell(full):
    """Place every source cell with one identical transform.

    The 6x4 source sheets already encode each hairstyle's intended relative
    size and offset. Cropping to each alpha bbox and normalizing that bbox made
    all styles unnaturally uniform and destroyed those source-space offsets.
    """
    source_bbox = full.getchannel("A").getbbox()
    scale = COMMON_CELL_FIT["scale"]
    dw = max(1, round(RUNTIME * scale))
    dh = max(1, round(RUNTIME * scale))
    x = COMMON_CELL_FIT["offsetX"]
    y = COMMON_CELL_FIT["offsetY"]

    scaled = full.resize((dw, dh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (RUNTIME, RUNTIME), (0,0,0,0))
    canvas.alpha_composite(scaled, (x, y))
    canvas = remove_tiny_components(canvas)

    target_bbox = canvas.getchannel("A").getbbox()
    return canvas, {
        "sourceBBox": list(source_bbox) if source_bbox else None,
        "targetBBox": list(target_bbox) if target_bbox else None,
        "scaleX": scale,
        "scaleY": scale,
        "offsetX": x,
        "offsetY": y,
        "mode": COMMON_CELL_FIT["mode"],
    }

def build_head_mask(base):
    alpha = base.getchannel("A")
    mask = Image.new("L", (RUNTIME, RUNTIME), 0)
    src = alpha.load()
    dst = mask.load()
    for y in range(RUNTIME):
        for x in range(RUNTIME):
            if y > HEAD_BOTTOM or src[x, y] == 0:
                continue
            # Ears already belong to the base. Keep those zones out of front hair.
            if EAR_Y0 <= y < EAR_Y1 and (x < EAR_INNER_LEFT or x > EAR_INNER_RIGHT):
                continue
            dst[x, y] = 255
    return mask

def build_face_feature_mask(face_parts):
    # Diagnostic only. Hair is allowed to overlap eyes, eyebrows, nose and mouth.
    critical = Image.new("L", (RUNTIME, RUNTIME), 0)
    for part in face_parts:
        critical = ImageChops.lighter(critical, part.getchannel("A"))
    return critical

def front_only_hair(full, critical_mask):
    """Keep these source-sheet hairstyles as one full front layer.

    The current sources are front-hair sheets. Automatically splitting them
    around the bald-head silhouette exposed the base head as a pale crown line
    and also clipped side strands. A transparent back layer is retained only
    for runtime compatibility.
    """
    front = full.copy()
    back = Image.new("RGBA", (RUNTIME, RUNTIME), (0,0,0,0))

    overlap = ImageChops.multiply(front.getchannel("A"), critical_mask)
    overlap_count = sum(1 for v in overlap.getdata() if v > 0)
    critical_count = max(1, sum(1 for v in critical_mask.getdata() if v > 0))
    overlap_ratio = overlap_count / critical_count
    return back, front, overlap_ratio

def touches(bbox):
    if not bbox:
        return []
    out=[]
    if bbox[0] <= 0: out.append("left")
    if bbox[1] <= 0: out.append("top")
    if bbox[2] >= RUNTIME: out.append("right")
    if bbox[3] >= RUNTIME: out.append("bottom")
    return out

def extract(kind, source, head_mask, critical_mask):
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
            cleaned=remove_white_matte(clear_bg(tile))
            full=hard_alpha(cleaned.resize((RUNTIME,RUNTIME),Image.Resampling.NEAREST))
            full,norm=place_hair_from_source_cell(full)
            back,front,overlap_ratio=front_only_hair(full,critical_mask)

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
                "normalization":norm,
                "frontBBox":list(fb) if fb else None,
                "backBBox":list(bb) if bb else None,
                "backTouchesCanvasEdge":touches(bb),
                "criticalFaceOverlap":round(overlap_ratio,3),
            })
            n+=1

    return {
        "source":source.name,
        "sourceSize":[w,h],
        "cellSize":[cw,ch],
        "count":len(items),
        "normalization":COMMON_CELL_FIT,
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
    critical_mask=build_face_feature_mask(face_parts)

    FRONT_OUT.mkdir(parents=True,exist_ok=True)
    BACK_OUT.mkdir(parents=True,exist_ok=True)

    result={
        "version":10,
        "type":"kidscade-source-coordinate-front-hair-pack",
        "canvas":[128,128],
        "compositeAt":[0,0],
        "layerOrder":["base","face","hairFront"],
        "imageSmoothing":False,
        "grid":[6,4],
        "palette":"warm-medium-brown",
        "canonicalHeadBBox":list(MASTER_HEAD_BBOX),
        "headMask":{
            "usedForHairSplit":False,
            "faceClipping":"disabled; full source-sheet hair may naturally cover facial features"
        },
        "sets":{},
        "qa":{
            "status":"source-coordinate-front-layer-generated-awaiting-visual-approval",
            "checks":[
                "one identical source-cell transform for all 48 hairstyles",
                "preserve source-sheet relative size and offset; no per-style bbox normalization",
                "preserve source aspect ratio; never stretch hair independently",
                "6x4 grid extraction",
                "128x128 hard-alpha assets",
                "full hairstyle is rendered as hairFront",
                "hairBack is transparent compatibility output",
                "no bald-head silhouette split, preventing pale crown seams",
                "no eye/eyebrow/nose/mouth subtraction from front hair",
                "edge-connected white-matte fringe trim before hard alpha",
                "remove isolated components under 8 pixels",
                "default face composite contact previews"
            ],
            "contacts":{}
        }
    }

    for kind,source in SHEETS.items():
        if not source.exists():
            raise FileNotFoundError(source)
        result["sets"][kind]=extract(
            kind,source,head_mask,critical_mask
        )
        result["qa"]["contacts"][kind]=build_contact(kind,base,face_parts)

    hair_root = AVATAR / "runtime/hair"
    hair_root.mkdir(parents=True, exist_ok=True)
    (hair_root/"hair-manifest.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )

    for stale in [
        FRONT_OUT/"hair-front-manifest.json",
        BACK_OUT/"hair-split-manifest.json",
    ]:
        if stale.exists(): stale.unlink()

    legacy_qa = AVATAR/"qa/hair-front"
    if legacy_qa.exists():
        for p in legacy_qa.glob("*.png"): p.unlink()

    print("Generated 48 full hairFront assets + transparent compatibility hairBack layers and QA previews.")

if __name__=="__main__":
    main()