#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
AVATAR=ROOT/"assets/game/characters/kidscade-avatar-v1"
SOURCE=AVATAR/"source/clothes/upper/animated/blue-star-zip-hoodie-01-sheet.png"
ANIM=AVATAR/"runtime/animation"
FACE=AVATAR/"runtime/face"
HAIR=AVATAR/"runtime/hair"
LOWER=AVATAR/"runtime/clothes/lower/denim-cuffed-jeans-01"
OUT=AVATAR/"runtime/clothes/upper/blue-star-zip-hoodie-01"
QA=AVATAR/"qa/clothes/upper"

CANVAS=128
COLS,ROWS=5,2
TARGET_TOP_Y=64
TARGET_MAX_W=56
TARGET_MAX_H=35
CENTER_X=65.5

# Paper-doll prototype:
# One clean hoodie design is split into torso / left sleeve / right sleeve.
# The torso stays locked to the body center. Each sleeve is transformed around the
# matching body shoulder using the target frame's real arm direction. This prevents
# the source sheet's exaggerated cylinder sleeves from being used for walk frames.
TORSO_LEFT=52
TORSO_RIGHT=80
LEFT_SLEEVE_CUT=61
RIGHT_SLEEVE_CUT=70

FRAME_MAP=[
    ("idle",1),("idle",2),("idle",3),("idle",4),
    ("walk",1),("walk",2),("walk",3),("walk",4),("walk",5),("walk",6)
]


def hard_alpha(im,threshold=40):
    im=im.convert("RGBA")
    im.putdata([(r,g,b,255 if a>=threshold else 0) for r,g,b,a in im.getdata()])
    return im


def cell_bounds(length,count):
    return [round(i*length/count) for i in range(count+1)]


def crop_first_clean_hoodie():
    src=hard_alpha(Image.open(SOURCE))
    w,h=src.size
    xs=cell_bounds(w,COLS); ys=cell_bounds(h,ROWS)
    # Cell 0 is the calm, non-foreshortened hoodie pose and is used only as the
    # clothing design source. All animation movement comes from the body frames.
    cell=src.crop((xs[0],ys[0],xs[1],ys[1]))
    box=cell.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("empty hoodie source cell")
    crop=cell.crop(box)
    scale=min(TARGET_MAX_W/crop.width,TARGET_MAX_H/crop.height)
    nw=max(1,round(crop.width*scale))
    nh=max(1,round(crop.height*scale))
    crop=crop.resize((nw,nh),Image.Resampling.NEAREST)
    canvas=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    x=round(CENTER_X-nw/2)
    canvas.alpha_composite(crop,(x,TARGET_TOP_Y))
    return canvas


def alpha_points(im,side,center_x):
    a=im.getchannel("A")
    pts=[]
    # Arms live below the head and above the shorts. Restricting this zone avoids
    # head/leg pixels and gives a stable shoulder-to-hand vector.
    for y in range(66,97):
        for x in range(CANVAS):
            if a.getpixel((x,y)) < 40:
                continue
            if side=="left" and x < center_x-7:
                pts.append((x,y))
            elif side=="right" and x > center_x+7:
                pts.append((x,y))
    return pts


def arm_anchor(im,side,center_x):
    pts=alpha_points(im,side,center_x)
    if len(pts)<8:
        # conservative fallback matching the neutral body
        return ((53.0,69.0),(47.0,89.0)) if side=="left" else ((78.0,69.0),(84.0,89.0))

    ys=[p[1] for p in pts]
    ymin,ymax=min(ys),max(ys)
    shoulder_pts=[p for p in pts if p[1] <= ymin+4]
    hand_pts=[p for p in pts if p[1] >= ymax-4]

    def mean(ps):
        return (sum(p[0] for p in ps)/len(ps),sum(p[1] for p in ps)/len(ps))

    shoulder=mean(shoulder_pts or pts[:1])
    hand=mean(hand_pts or pts[-1:])
    return shoulder,hand


def body_center(frame):
    bb=frame["bodyBBox"]
    return (bb[0]+bb[2])/2


def split_hoodie(base):
    left=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    torso=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    right=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    src=base.load(); lp=left.load(); tp=torso.load(); rp=right.load()

    for y in range(CANVAS):
        for x in range(CANVAS):
            px=src[x,y]
            if px[3]==0:
                continue
            if x <= LEFT_SLEEVE_CUT:
                lp[x,y]=px
            if TORSO_LEFT <= x <= TORSO_RIGHT:
                tp[x,y]=px
            if x >= RIGHT_SLEEVE_CUT:
                rp[x,y]=px
    return left,torso,right


def transform_part(part,source_anchor,target_anchor,angle_delta,scale):
    # PIL affine expects output->input inverse coefficients.
    c=math.cos(angle_delta); s=math.sin(angle_delta)
    inv=1/max(scale,1e-6)
    a=c*inv
    b=s*inv
    d=-s*inv
    e=c*inv
    sx,sy=source_anchor
    tx,ty=target_anchor
    cc=sx-a*tx-b*ty
    ff=sy-d*tx-e*ty
    return part.transform(
        (CANVAS,CANVAS),
        Image.Transform.AFFINE,
        (a,b,cc,d,e,ff),
        resample=Image.Resampling.NEAREST,
        fillcolor=(0,0,0,0),
    )


def vector(anchor):
    (sx,sy),(hx,hy)=anchor
    return (hx-sx,hy-sy)


def angle(v):
    return math.atan2(v[1],v[0])


def length(v):
    return math.hypot(v[0],v[1])


def build_frame(base_parts,base_anchors,target_body,target_center):
    left,torso,right=base_parts
    out=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    target_anchors={
        side:arm_anchor(target_body,side,target_center)
        for side in ("left","right")
    }

    for side,part in (("left",left),("right",right)):
        src=base_anchors[side]
        dst=target_anchors[side]
        sv=vector(src); dv=vector(dst)
        delta=angle(dv)-angle(sv)
        ratio=length(dv)/max(length(sv),1)
        ratio=max(.88,min(1.10,ratio))
        moved=transform_part(part,src[0],dst[0],delta,ratio)
        out.alpha_composite(moved)

    # Torso remains rigid and follows only the body center. Composite it last so the
    # shoulder seams are clean and the transformed sleeve overlap is hidden.
    dx=round(target_center-CENTER_X)
    if dx:
        moved_torso=torso.transform(
            (CANVAS,CANVAS),
            Image.Transform.AFFINE,
            (1,0,-dx,0,1,0),
            resample=Image.Resampling.NEAREST,
            fillcolor=(0,0,0,0),
        )
    else:
        moved_torso=torso
    out.alpha_composite(moved_torso)
    return out,target_anchors


def load_face():
    ps=[
        FACE/"eyes/eyes-01.png",FACE/"eyebrows/eyebrows-01.png",
        FACE/"noses/nose-01.png",FACE/"mouths/mouth-01.png"
    ]
    return [Image.open(p).convert("RGBA") for p in ps]


def build_qa(frames):
    front=Image.open(HAIR/"approved/hair-male-01.png").convert("RGBA")
    face=load_face()
    sheet=Image.new("RGBA",(5*CANVAS,2*CANVAS),(245,245,245,255))
    draw=ImageDraw.Draw(sheet)
    for i,(kind,n,upper) in enumerate(frames):
        body=Image.open(ANIM/kind/f"{kind}-{n:02d}.png").convert("RGBA")
        lower_path=LOWER/kind/f"{kind}-{n:02d}.png"
        lower=Image.open(lower_path).convert("RGBA") if lower_path.exists() else None
        preview=Image.new("RGBA",(CANVAS,CANVAS),(255,255,255,255))
        preview.alpha_composite(body)
        if lower: preview.alpha_composite(lower)
        preview.alpha_composite(upper)
        for p in face: preview.alpha_composite(p)
        preview.alpha_composite(front)
        x=(i%5)*CANVAS; y=(i//5)*CANVAS
        sheet.alpha_composite(preview,(x,y))
        draw.rectangle((x,y,x+CANVAS-1,y+CANVAS-1),outline=(190,190,190,255))
    QA.mkdir(parents=True,exist_ok=True)
    p=QA/"blue-star-zip-hoodie-01-paperdoll-contact.png"
    sheet.save(p,optimize=True)
    return str(p.relative_to(AVATAR))


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    anim=json.loads((ANIM/"animation-manifest.json").read_text(encoding="utf-8"))
    frame_records={}
    for kind,data in anim["frameSets"].items():
        for frame in data["frames"]:
            n=int(frame["id"].split("-")[-1])
            frame_records[(kind,n)]=frame

    base= crop_first_clean_hoodie()
    base_body=Image.open(ANIM/"idle/idle-01.png").convert("RGBA")
    base_center=body_center(frame_records[("idle",1)])
    base_anchors={
        side:arm_anchor(base_body,side,base_center)
        for side in ("left","right")
    }
    base_parts=split_hoodie(base)

    items=[]; qa=[]
    for kind,n in FRAME_MAP:
        frame=frame_records[(kind,n)]
        target_body=Image.open(ANIM/kind/f"{kind}-{n:02d}.png").convert("RGBA")
        center=body_center(frame)
        overlay,anchors=build_frame(base_parts,base_anchors,target_body,center)

        d=OUT/kind
        d.mkdir(parents=True,exist_ok=True)
        name=f"{kind}-{n:02d}.png"
        overlay.save(d/name,optimize=True)
        qa.append((kind,n,overlay))

        bbox=overlay.getchannel("A").getbbox()
        items.append({
            "frame":f"{kind}-{n:02d}",
            "file":f"{kind}/{name}",
            "targetBBox":list(bbox) if bbox else None,
            "bodyCenterX":center,
            "anchors":{
                "left":{"shoulder":[round(v,2) for v in anchors["left"][0]],"hand":[round(v,2) for v in anchors["left"][1]]},
                "right":{"shoulder":[round(v,2) for v in anchors["right"][0]],"hand":[round(v,2) for v in anchors["right"][1]]},
            }
        })

    static=Image.open(OUT/"idle/idle-01.png").convert("RGBA")
    static.save(OUT/"static.png",optimize=True)
    contact=build_qa(qa)

    manifest={
        "version":3,
        "id":"blue-star-zip-hoodie-01",
        "type":"animated-upper-clothing-paperdoll",
        "displayName":"파란 별 집업 후드",
        "canvas":[128,128],
        "source":"source/clothes/upper/animated/blue-star-zip-hoodie-01-sheet.png",
        "designSourceCell":[0,0],
        "method":"rigid torso + per-frame sleeve transforms driven by the matching body-frame arm vectors",
        "fit":{
            "torsoTopY":TARGET_TOP_Y,
            "bodyCenter":"animation bodyBBox center",
            "sourceBody":"idle-01",
            "runtimeScale":1,
            "runtimeOffset":[0,0]
        },
        "static":"static.png",
        "frames":items,
        "qa":{
            "status":"paperdoll-prototype-generated",
            "contact":contact
        }
    }
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated paper-doll upper clothing: blue-star-zip-hoodie-01")
    for item in items:
        print(item["frame"],item["targetBBox"],item["anchors"])


if __name__=="__main__":
    main()
