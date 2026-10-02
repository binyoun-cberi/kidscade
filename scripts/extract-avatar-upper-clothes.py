#!/usr/bin/env python3
from __future__ import annotations
import json
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

FRAME_MAP=[
 ("idle",1),("idle",2),("idle",3),("idle",4),("walk",1),
 ("walk",2),("walk",3),("walk",4),("walk",5),("walk",6)
]

def hard_alpha(im,threshold=40):
    im=im.convert("RGBA")
    im.putdata([(r,g,b,255 if a>=threshold else 0) for r,g,b,a in im.getdata()])
    return im

def cell_bounds(length,count):
    return [round(i*length/count) for i in range(count+1)]

def place(crop,center_x):
    box=crop.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("empty garment cell")
    crop=crop.crop(box)
    scale=min(TARGET_MAX_W/crop.width,TARGET_MAX_H/crop.height)
    nw=max(1,round(crop.width*scale))
    nh=max(1,round(crop.height*scale))
    crop=crop.resize((nw,nh),Image.Resampling.NEAREST)
    canvas=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0))
    x=round(center_x-nw/2)
    y=TARGET_TOP_Y
    canvas.alpha_composite(crop,(x,y))
    return canvas,[x,y,x+nw,y+nh]

def load_face():
    ps=[
      FACE/"eyes/eyes-01.png",FACE/"eyebrows/eyebrows-01.png",
      FACE/"noses/nose-01.png",FACE/"mouths/mouth-01.png"
    ]
    return [Image.open(p).convert("RGBA") for p in ps]

def build_qa(frames):
    back=Image.open(HAIR/"back/male/hair-back-male-01.png").convert("RGBA")
    front=Image.open(HAIR/"front/male/hair-front-male-01.png").convert("RGBA")
    face=load_face()
    sheet=Image.new("RGBA",(5*CANVAS,2*CANVAS),(245,245,245,255))
    draw=ImageDraw.Draw(sheet)
    for i,(kind,n,upper) in enumerate(frames):
        body=Image.open(ANIM/kind/f"{kind}-{n:02d}.png").convert("RGBA")
        lower_path=LOWER/kind/f"{kind}-{n:02d}.png"
        lower=Image.open(lower_path).convert("RGBA") if lower_path.exists() else None
        preview=Image.new("RGBA",(CANVAS,CANVAS),(255,255,255,255))
        preview.alpha_composite(back)
        preview.alpha_composite(body)
        if lower: preview.alpha_composite(lower)
        preview.alpha_composite(upper)
        for p in face: preview.alpha_composite(p)
        preview.alpha_composite(front)
        x=(i%5)*CANVAS; y=(i//5)*CANVAS
        sheet.alpha_composite(preview,(x,y))
        draw.rectangle((x,y,x+CANVAS-1,y+CANVAS-1),outline=(190,190,190,255))
    QA.mkdir(parents=True,exist_ok=True)
    p=QA/"blue-star-zip-hoodie-01-contact.png"
    sheet.save(p,optimize=True)
    return str(p.relative_to(AVATAR))

def main():
    if not SOURCE.exists(): raise FileNotFoundError(SOURCE)
    src=hard_alpha(Image.open(SOURCE))
    w,h=src.size
    xs=cell_bounds(w,COLS); ys=cell_bounds(h,ROWS)

    anim=json.loads((ANIM/"animation-manifest.json").read_text(encoding="utf-8"))
    centers={}
    for kind,data in anim["frameSets"].items():
        for frame in data["frames"]:
            bb=frame["bodyBBox"]
            n=int(frame["id"].split("-")[-1])
            centers[(kind,n)]=(bb[0]+bb[2])/2

    items=[]; qa=[]
    idx=0
    for row in range(ROWS):
        for col in range(COLS):
            kind,n=FRAME_MAP[idx]
            cell=src.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
            overlay,target=place(cell,centers[(kind,n)])
            d=OUT/kind; d.mkdir(parents=True,exist_ok=True)
            name=f"{kind}-{n:02d}.png"
            overlay.save(d/name,optimize=True)
            qa.append((kind,n,overlay))
            items.append({
              "frame":f"{kind}-{n:02d}",
              "file":f"{kind}/{name}",
              "sourceCell":[col,row],
              "targetBBox":target,
              "bodyCenterX":centers[(kind,n)]
            })
            idx+=1

    static=Image.open(OUT/"idle/idle-01.png").convert("RGBA")
    static.save(OUT/"static.png",optimize=True)
    contact=build_qa(qa)
    manifest={
      "version":1,
      "id":"blue-star-zip-hoodie-01",
      "type":"animated-upper-clothing",
      "displayName":"파란 별 집업 후드",
      "canvas":[128,128],
      "source":"source/clothes/upper/animated/blue-star-zip-hoodie-01-sheet.png",
      "mapping":"top row idle01 idle02 idle03 idle04 walk01; bottom row walk02 walk03 walk04 walk05 walk06",
      "fit":{"topY":TARGET_TOP_Y,"maxWidth":TARGET_MAX_W,"maxHeight":TARGET_MAX_H,"center":"animation bodyBBox center"},
      "static":"static.png",
      "frames":items,
      "qa":{"status":"generated-needs-visual-review","contact":contact}
    }
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated animated upper clothing: blue-star-zip-hoodie-01")

if __name__=="__main__":
    main()
