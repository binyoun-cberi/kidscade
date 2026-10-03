#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/clothes/lower/animated/denim-cuffed-jeans-01-sheet.png"
ANIM = AVATAR / "runtime/animation"
FACE = AVATAR / "runtime/face"
HAIR = AVATAR / "runtime/hair"
OUT = AVATAR / "runtime/clothes/lower/denim-cuffed-jeans-01"
QA = AVATAR / "qa/clothes/lower"

CANVAS = 128
TARGET_TOP_Y = 84
TARGET_MAX_H = 35
TARGET_MAX_W = 44

# Walk poses spread/cross the legs. Give animated trousers a tiny coverage guard
# so the base underwear/leg pixels cannot flash through at the edges.
WALK_TOP_Y = 83
WALK_MAX_H = 37
WALK_MAX_W = 46

FRAME_MAP = [
    ("idle", 1),
    ("idle", 2),
    ("idle", 3),
    ("idle", 4),
    ("walk", 1),
    ("walk", 2),
    ("walk", 3),
    ("walk", 4),
    ("walk", 5),
    ("walk", 6),
]

def color_dist(a, b):
    return sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)) ** 0.5

def clean_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]

    # If the generator preserved transparency, harden only tiny alpha noise.
    if any(c[3] < 32 for c in corners):
        data = []
        for r,g,b,a in im.getdata():
            data.append((r,g,b,255 if a >= 40 else 0))
        im.putdata(data)
        return im

    # Otherwise remove a flat generated backdrop by sampling corners.
    bg = tuple(sum(c[i] for c in corners)//4 for i in range(3))
    out = []
    for r,g,b,a in im.getdata():
        if color_dist((r,g,b), bg) <= 30:
            out.append((r,g,b,0))
        else:
            out.append((r,g,b,255))
    im.putdata(out)
    return im

def component_boxes(mask: Image.Image):
    # Mild dilation groups tiny detached buttons/highlights with the garment.
    merged = mask.filter(ImageFilter.MaxFilter(11))
    p = merged.load()
    w,h = merged.size
    seen = bytearray(w*h)
    boxes = []

    def idx(x,y): return y*w+x

    for y in range(h):
        for x in range(w):
            if seen[idx(x,y)] or p[x,y] == 0:
                continue
            q = deque([(x,y)])
            seen[idx(x,y)] = 1
            minx=maxx=x
            miny=maxy=y
            count=0
            while q:
                cx,cy=q.popleft()
                count += 1
                minx=min(minx,cx); maxx=max(maxx,cx)
                miny=min(miny,cy); maxy=max(maxy,cy)
                for nx,ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                    if nx<0 or ny<0 or nx>=w or ny>=h:
                        continue
                    k=idx(nx,ny)
                    if seen[k] or p[nx,ny] == 0:
                        continue
                    seen[k]=1
                    q.append((nx,ny))
            if count > 400:
                boxes.append((minx,miny,maxx+1,maxy+1,count))

    boxes.sort(key=lambda b:b[4], reverse=True)
    boxes = boxes[:10]
    if len(boxes) != 10:
        raise RuntimeError(f"Expected 10 garment components, found {len(boxes)}")

    # Restore row-major order: five upper, five lower.
    boxes.sort(key=lambda b:(b[1]+b[3])/2)
    top = sorted(boxes[:5], key=lambda b:(b[0]+b[2])/2)
    bottom = sorted(boxes[5:], key=lambda b:(b[0]+b[2])/2)
    return top + bottom

def tighten_box(mask: Image.Image, rough):
    x0,y0,x1,y1,_ = rough
    # Undo dilation padding, then find exact alpha bbox in the local region.
    pad = 8
    x0=max(0,x0-pad); y0=max(0,y0-pad)
    x1=min(mask.width,x1+pad); y1=min(mask.height,y1+pad)
    local = mask.crop((x0,y0,x1,y1))
    box = local.getbbox()
    if not box:
        raise RuntimeError("empty garment crop")
    return (x0+box[0], y0+box[1], x0+box[2], y0+box[3])

def place_garment(crop: Image.Image, center_x: float, kind: str):
    box = crop.getchannel("A").getbbox()
    crop = crop.crop(box)
    if kind == "walk":
        max_h, max_w, top_y = WALK_MAX_H, WALK_MAX_W, WALK_TOP_Y
    else:
        max_h, max_w, top_y = TARGET_MAX_H, TARGET_MAX_W, TARGET_TOP_Y
    scale = min(max_h/crop.height, max_w/crop.width)
    nw = max(1, round(crop.width*scale))
    nh = max(1, round(crop.height*scale))
    crop = crop.resize((nw,nh), Image.Resampling.NEAREST)

    canvas = Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    x = round(center_x - nw/2)
    y = top_y
    canvas.alpha_composite(crop,(x,y))
    return canvas, [x,y,x+nw,y+nh]

def load_default_face():
    paths = [
        FACE/"eyes/eyes-01.png",
        FACE/"eyebrows/eyebrows-01.png",
        FACE/"noses/nose-01.png",
        FACE/"mouths/mouth-01.png",
    ]
    return [Image.open(p).convert("RGBA") for p in paths]

def build_qa(frames):
    front = Image.open(HAIR/"approved/hair-male-01.png").convert("RGBA")
    face = load_default_face()
    sheet = Image.new("RGBA",(5*CANVAS,2*CANVAS),(245,245,245,255))
    draw = ImageDraw.Draw(sheet)

    for i,item in enumerate(frames):
        kind,n,overlay = item
        body = Image.open(ANIM/kind/f"{kind}-{n:02d}.png").convert("RGBA")
        preview = Image.new("RGBA",(CANVAS,CANVAS),(255,255,255,255))
        preview.alpha_composite(body)
        preview.alpha_composite(overlay)
        for part in face:
            preview.alpha_composite(part)
        preview.alpha_composite(front)
        x=(i%5)*CANVAS
        y=(i//5)*CANVAS
        sheet.alpha_composite(preview,(x,y))
        draw.rectangle((x,y,x+CANVAS-1,y+CANVAS-1),outline=(190,190,190,255))

    QA.mkdir(parents=True,exist_ok=True)
    path = QA/"denim-cuffed-jeans-01-contact.png"
    sheet.save(path,optimize=True)
    return str(path.relative_to(AVATAR))

def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    src = clean_background(Image.open(SOURCE))
    mask = src.getchannel("A")
    boxes = component_boxes(mask)

    anim_manifest = json.loads((ANIM/"animation-manifest.json").read_text(encoding="utf-8"))
    frame_centers = {}
    for kind,setdata in anim_manifest["frameSets"].items():
        for frame in setdata["frames"]:
            bb=frame["bodyBBox"]
            frame_centers[(kind,int(frame["id"].split("-")[-1]))]=(bb[0]+bb[2])/2

    qa_frames=[]
    items=[]
    for rough,(kind,n) in zip(boxes,FRAME_MAP):
        tight=tighten_box(mask,rough)
        crop=src.crop(tight)
        center=frame_centers[(kind,n)]
        overlay,target=place_garment(crop,center,kind)

        d=OUT/kind
        d.mkdir(parents=True,exist_ok=True)
        name=f"{kind}-{n:02d}.png"
        overlay.save(d/name,optimize=True)
        qa_frames.append((kind,n,overlay))
        items.append({
            "frame":f"{kind}-{n:02d}",
            "file":f"{kind}/{name}",
            "sourceBBox":list(tight),
            "targetBBox":target,
            "bodyCenterX":center,
        })

    # Static state uses the first idle garment.
    static = Image.open(OUT/"idle/idle-01.png").convert("RGBA")
    static.save(OUT/"static.png",optimize=True)

    qa_path=build_qa(qa_frames)
    manifest={
        "version":2,
        "id":"denim-cuffed-jeans-01",
        "type":"animated-lower-clothing",
        "displayName":"커프 데님 팬츠",
        "canvas":[128,128],
        "source":"source/clothes/lower/animated/denim-cuffed-jeans-01-sheet.png",
        "mapping":"top row idle01 idle02 idle03 idle04 walk01; bottom row walk02 walk03 walk04 walk05 walk06",
        "fit":{
            "idle":{"topY":TARGET_TOP_Y,"maxHeight":TARGET_MAX_H,"maxWidth":TARGET_MAX_W},
            "walk":{"topY":WALK_TOP_Y,"maxHeight":WALK_MAX_H,"maxWidth":WALK_MAX_W},
            "center":"animation bodyBBox center",
            "coverageGuard":"walk frames expand by ~1-2px and move up 1px to prevent base-layer bleed"
        },
        "static":"static.png",
        "frames":items,
        "qa":{
            "status":"generated-walk-coverage-guard",
            "contact":qa_path
        }
    }
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated animated lower clothing: denim-cuffed-jeans-01")

if __name__=="__main__":
    main()