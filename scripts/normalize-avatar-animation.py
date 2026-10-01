#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
AVATAR = ROOT / "assets/game/characters/kidscade-avatar-v1"
SOURCE = AVATAR / "source/animation"
OUT = AVATAR / "runtime/animation"
QA = AVATAR / "qa/animation"
BASE = AVATAR / "runtime/base/master-base-128.png"
FACE = AVATAR / "runtime/face"
HAIR = AVATAR / "runtime/hair"

CANVAS = 128

SETS = {
    "idle": [SOURCE / "idle" / f"idle-{i:02d}.png" for i in range(1, 5)],
    "walk": [SOURCE / "walk" / f"walk-{i:02d}.png" for i in range(1, 7)],
}

def alpha_bbox(im: Image.Image):
    return im.getchannel("A").getbbox()

def hard_alpha(im: Image.Image):
    im = im.convert("RGBA")
    im.putdata([(r,g,b,255 if a >= 32 else 0) for r,g,b,a in im.getdata()])
    return im

def normalize_frame(source: Image.Image, target_bbox):
    source = hard_alpha(source)
    box = alpha_bbox(source)
    if not box:
        raise RuntimeError("empty animation frame")
    crop = source.crop(box)
    target_h = target_bbox[3] - target_bbox[1]
    scale = target_h / crop.height
    new_w = max(1, round(crop.width * scale))
    resized = crop.resize((new_w, target_h), Image.Resampling.NEAREST)

    target_cx = (target_bbox[0] + target_bbox[2]) / 2
    x = round(target_cx - new_w / 2)
    y = target_bbox[3] - target_h

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0,0,0,0))
    canvas.alpha_composite(resized, (x, y))
    return hard_alpha(canvas)

def row_span(alpha: Image.Image, y: int):
    xs = [x for x in range(alpha.width) if alpha.getpixel((x,y)) > 0]
    if not xs:
        return None
    return min(xs), max(xs)+1

def detect_head_bbox(im: Image.Image):
    alpha = im.getchannel("A")
    box = alpha.getbbox()
    if not box:
        raise RuntimeError("empty frame")
    x0,y0,x1,y1 = box
    h = y1-y0

    search_start = y0 + round(h * 0.28)
    search_end = min(y1, y0 + round(h * 0.58))
    candidates=[]
    for y in range(search_start, search_end):
        span=row_span(alpha,y)
        if span:
            candidates.append((span[1]-span[0], y))
    if not candidates:
        neck_y = y0 + round(h * 0.45)
    else:
        # The narrowest horizontal slice in the expected neck zone.
        neck_y = min(candidates)[1]

    head_region = alpha.crop((0, y0, CANVAS, min(CANVAS, neck_y+1)))
    hb = head_region.getbbox()
    if not hb:
        return [x0,y0,x1,neck_y+1]
    return [hb[0], hb[1]+y0, hb[2], hb[3]+y0]

def head_transform(canonical, dest):
    scx=(canonical[0]+canonical[2])/2
    scy=(canonical[1]+canonical[3])/2
    dcx=(dest[0]+dest[2])/2
    dcy=(dest[1]+dest[3])/2
    sw=canonical[2]-canonical[0]
    sh=canonical[3]-canonical[1]
    dw=dest[2]-dest[0]
    dh=dest[3]-dest[1]
    scale=(dw/max(1,sw)+dh/max(1,sh))/2
    return {
        "sourceCenter":[round(scx,3),round(scy,3)],
        "destCenter":[round(dcx,3),round(dcy,3)],
        "scale":round(scale,4),
    }

def transform_layer(layer: Image.Image, canonical, dest):
    t=head_transform(canonical,dest)
    scx,scy=t["sourceCenter"]
    dcx,dcy=t["destCenter"]
    s=t["scale"]
    # PIL affine maps destination -> source.
    inv=1/max(0.001,s)
    matrix=(inv,0,scx-dcx*inv,0,inv,scy-dcy*inv)
    return layer.transform(
        (CANVAS,CANVAS),
        Image.Transform.AFFINE,
        matrix,
        resample=Image.Resampling.NEAREST,
        fillcolor=(0,0,0,0),
    )

def load_default_layers():
    face_paths=[
        FACE/"eyes/eyes-01.png",
        FACE/"eyebrows/eyebrows-01.png",
        FACE/"noses/nose-01.png",
        FACE/"mouths/mouth-01.png",
    ]
    face=[Image.open(p).convert("RGBA") for p in face_paths]

    back=Image.open(HAIR/"back/male/hair-back-male-01.png").convert("RGBA")
    front=Image.open(HAIR/"front/male/hair-front-male-01.png").convert("RGBA")
    return back, face, front

def build_contact(kind, frames, canonical_head):
    back, face_parts, front = load_default_layers()
    cols=len(frames)
    sheet=Image.new("RGBA",(cols*CANVAS,CANVAS),(244,244,244,255))
    draw=ImageDraw.Draw(sheet)
    for i,(frame,head) in enumerate(frames):
        preview=Image.new("RGBA",(CANVAS,CANVAS),(255,255,255,255))
        preview.alpha_composite(transform_layer(back,canonical_head,head))
        preview.alpha_composite(frame)
        for part in face_parts:
            preview.alpha_composite(transform_layer(part,canonical_head,head))
        preview.alpha_composite(transform_layer(front,canonical_head,head))
        x=i*CANVAS
        sheet.alpha_composite(preview,(x,0))
        draw.rectangle((x,0,x+CANVAS-1,CANVAS-1),outline=(190,190,190,255))
    QA.mkdir(parents=True,exist_ok=True)
    path=QA/f"{kind}-default-composite-contact.png"
    sheet.save(path,optimize=True)
    return str(path.relative_to(AVATAR))

def main():
    base=Image.open(BASE).convert("RGBA")
    target_bbox=alpha_bbox(base)
    if not target_bbox:
        raise RuntimeError("master base is empty")
    canonical_head=detect_head_bbox(base)

    manifest={
        "version":1,
        "type":"kidscade-avatar-animation",
        "canvas":[CANVAS,CANVAS],
        "baselineY":target_bbox[3],
        "bodyTargetBBox":list(target_bbox),
        "canonicalHeadBBox":canonical_head,
        "frameSets":{},
        "layerTransform":"uniform scale + translate around canonical head center",
        "qa":{"status":"normalized-awaiting-visual-review","contacts":{}},
    }

    for kind,paths in SETS.items():
        target_dir=OUT/kind
        target_dir.mkdir(parents=True,exist_ok=True)
        for old in target_dir.glob("*.png"):
            old.unlink()

        normalized=[]
        entries=[]
        for idx,path in enumerate(paths,1):
            src=Image.open(path).convert("RGBA")
            frame=normalize_frame(src,target_bbox)
            head=detect_head_bbox(frame)
            name=f"{kind}-{idx:02d}.png"
            frame.save(target_dir/name,optimize=True)
            normalized.append((frame,head))
            entries.append({
                "id":f"{kind}-{idx:02d}",
                "file":f"{kind}/{name}",
                "bodyBBox":list(alpha_bbox(frame)),
                "headBBox":head,
                "headTransform":head_transform(canonical_head,head),
            })

        manifest["frameSets"][kind]={
            "fps":6 if kind=="walk" else 3,
            "loop":True,
            "count":len(entries),
            "frames":entries,
        }
        manifest["qa"]["contacts"][kind]=build_contact(kind,normalized,canonical_head)

    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"animation-manifest.json").write_text(
        json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    print("Normalized 4 idle + 6 walk frames and generated default composite QA.")

if __name__=="__main__":
    main()
