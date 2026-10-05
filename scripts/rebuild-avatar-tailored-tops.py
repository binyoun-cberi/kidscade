"""Rebuild registered upper-only pixel parts. Requires Pillow; preserves IDs/prices/BODY.

Silhouettes and garment details are authored here, not palette swaps of another outfit.
The runtime's pose table is read through Node so frame transforms cannot silently drift.
"""
from pathlib import Path
import json, math, subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/game/characters/kidscade-avatar-v3/school-starter'
manifest = json.loads((ASSETS / 'manifest.json').read_text())
poses = json.loads(subprocess.check_output(['node', '-e', "const s=require('fs').readFileSync('avatar-pixel-studio.js','utf8'); console.log(JSON.stringify(Function('return '+s.match(/const BODY_DERIVED_POSES=([\\s\\S]*?);/)[1])()))"], cwd=ROOT))

# id, fabric, shaded fabric, highlight, sleeve length, hem
DESIGNS = [
 ('hoodie-01','#6889ad','#465c7c','#94b4cd','long',95),
 ('short-puffer-01','#ddc8a7','#a48f77','#f4e4c7','long',93),
 ('long-puffer-01','#45536a','#303b50','#70839b','long',108),
 ('box-tee-01','#e8d9b5','#b5a182','#fff0cf','short',97),
 ('leather-jacket-01','#64534e','#423a3b','#987965','long',92),
 ('denim-jacket-01','#5c8aa5','#3d607e','#9cc3d3','long',93),
 ('suit-jacket-01','#48536e','#30394e','#718199','long',93),
 ('baseball-jacket-01','#ad5360','#753745','#db8690','long',94),
 ('soccer-uniform-01','#4da886','#28735b','#91d3b0','short',92),
 ('baseball-uniform-01','#eee9dc','#b4bdc4','#fff9eb','short',93),
 ('basketball-uniform-01','#eeae47','#b36d33','#ffda74','none',94),
 ('taekwondo-uniform-01','#ecece3','#aab8bd','#ffffff','long',96),
 ('scientist-coat-01','#eef0e8','#a7bdc1','#ffffff','long',104),
 ('chef-uniform-01','#eee9dd','#b8aca0','#fff9ee','long',95),
 ('firefighter-jacket-01','#b97535','#794c2c','#e3a851','long',97),
 ('police-uniform-01','#557394','#354a67','#8da8bf','long',94),
 ('spacesuit-01','#e5e6df','#9aaeba','#ffffff','long',95),
 ('wizard-robe-01','#71629e','#473b70','#a18ec1','long',108),
 ('explorer-vest-01','#aa9869','#736448','#d3c695','short',94),
 ('pajama-top-01','#a2b9cb','#70899f','#d6e3e8','long',94),
 ('raincoat-01','#e4ba4b','#ad8138','#ffe38a','long',103),
 ('school-cardigan-01','#aa8573','#785a55','#d6b29a','long',94),
]

def blank(): return Image.new('RGBA',(128,128))

def paint(spec, fid):
 ident,base,shade,light,sleeve,hem = spec
 im=blank();d=ImageDraw.Draw(im); ink='#343443'; cream='#f4edde'; gold='#e1bd6c'
 def poly(points,color,outline=None): d.polygon(points,fill=color,outline=outline)
 def line(points,color,width=1): d.line(points,fill=color,width=width)
 def rect(box,color): d.rectangle(box,fill=color)
 def pocket(x,y,color=shade):
  rect((x,y,x+5,y+5),color);line((x+1,y+1,x+4,y+1),light);d.point((x+3,y+2),fill=gold)
 # Shoulder-to-wrist sleeves. Unlike the old tops, the silhouette includes the arms.
 jumping=fid=='jump-01';walking=fid.startswith('walk')
 wrists=[(50,87),(81,87)] if not walking else [(50,85),(82,85)]
 if fid=='walk-03':wrists=[(49,85),(83,85)]
 if jumping:wrists=[(47,77),(86,78)]
 for side,(wx,wy) in enumerate(wrists):
  sx=56 if side==0 else 75
  if sleeve=='none':continue
  if sleeve=='short':wx=round(sx+(wx-sx)*.55);wy=round(75+(wy-75)*.55)
  color=cream if ident=='baseball-jacket-01' else base
  poly([(sx-3,73),(sx+3,74),(wx+3,wy),(wx+2,wy+2),(wx-3,wy+1),(wx-4,wy-1)],color,ink)
  line((sx-2,76,wx-2,wy-1),light)
  line((wx-3,wy,wx+2,wy+1),shade)
  if ident in ['firefighter-jacket-01','spacesuit-01']:line((wx-3,wy-3,wx+2,wy-2),gold if ident.startswith('fire') else '#618aa3',2)
 # Rounded shoulders and tapered waist; long coats flare only below the waist.
 left,right=(54,79) if ident in ['short-puffer-01','long-puffer-01','box-tee-01','spacesuit-01'] else (55,78)
 flare=2 if hem>100 else 0
 poly([(59,71),(61,73),(69,73),(72,71),(77,74),(right,80),(right-1,90),(right+flare,hem-2),(right+flare-2,hem),(left-flare+2,hem),(left-flare,hem-2),(left+1,90),(left,79),(56,74)],base,ink)
 poly([(left+1,81),(left+3,84),(left+3,hem-2),(left-flare+1,hem-2)],shade)
 poly([(right-2,80),(right-1,81),(right-2,90),(right+flare-1,hem-2),(right+flare-4,hem-2),(right-4,87)],shade)
 line((58,75,58,81),light);line((left+3,hem-2,right+flare-3,hem-2),shade)
 # Neck openings keep the bare neck visible above, not a solid rectangular bib.
 line([(59,72),(62,76),(67,77),(71,72)],shade)
 if ident=='hoodie-01':
  poly([(56,73),(59,69),(62,70),(61,73),(65,76),(70,73),(70,70),(74,71),(77,75),(71,80),(63,79)],shade,ink)
  line([(59,72),(63,77),(69,78),(74,73)],light)
  line((62,79,62,84),cream);line((71,79,71,84),cream)
  poly([(60,86),(70,86),(73,91),(57,91)],shade);line((60,87,70,87),light)
  line((57,94,77,94),shade)
 elif 'puffer' in ident:
  poly([(58,70),(61,70),(63,75),(68,75),(70,70),(74,70),(75,77),(57,77)],shade,ink)
  line((60,71,62,75),light);line((70,74,72,71),light)
  for y in range(82,hem-2,7):
   line([(left+2,y),(60,y+1),(69,y+1),(right-2,y)],shade)
   line((60,y+2,69,y+2),light)
  line((66,77,66,hem-2),ink);line((67,78,67,hem-3),light)
  line((57,88,60,85),ink);line((72,85,75,88),ink)
 elif ident=='box-tee-01':
  line([(60,73),(63,76),(68,76),(71,73)],cream)
  poly([(61,82),(66,79),(72,83),(68,89),(62,88)],'#719898')
  line([(63,85),(65,82),(67,85),(70,83)],cream)
 elif ident in ['leather-jacket-01','denim-jacket-01','suit-jacket-01','scientist-coat-01','school-cardigan-01']:
  poly([(60,73),(65,78),(71,73),(70,89),(63,91)],'#ece7d9')
  if ident=='school-cardigan-01':
   line([(59,73),(65,85),(72,73)],shade,2);line((65,85,65,92),shade)
   rect((55,92,77,93),shade);pocket(56,86);pocket(70,86)
  else:
   poly([(59,72),(64,80),(60,83),(56,75)],light)
   poly([(72,72),(67,81),(71,84),(77,75)],light)
   line((66,84,66,hem-2),shade)
  if ident=='suit-jacket-01':
   poly([(65,77),(67,78),(68,85),(66,88),(64,85)],'#aa6372');line((71,84,75,84),cream)
  elif ident=='denim-jacket-01':
   pocket(56,80);pocket(70,80);line((57,91,76,91),gold)
  elif ident=='leather-jacket-01':
   line((71,79,63,91),'#d3c5ae');line((56,85,61,83),cream);line((71,88,75,85),cream)
  elif ident=='scientist-coat-01':
   rect((64,80,68,94),'#69a6af');pocket(70,81);pocket(56,94);pocket(71,94)
   line((71,78,71,82),'#5473a7');line((73,79,73,82),'#bc6f71')
   poly([(64,98),(68,98),(69,104),(63,104)],(0,0,0,0))
  for y in range(86,hem-3,5):d.point((67,y),fill=gold)
 elif ident=='baseball-jacket-01':
  line((66,75,66,92),shade);line((57,92,77,92),cream)
  line([(59,74),(63,77),(68,77),(72,73)],cream)
  line([(59,81),(59,86),(62,86)],cream,2)
  for y in [80,85,90]:d.point((67,y),fill=cream)
 elif ident=='soccer-uniform-01':
  line([(59,72),(64,78),(70,72)],cream,2)
  line((56,76,59,80),cream,2);line((73,75,76,79),cream,2)
  rect((69,80,72,83),gold);line([(62,82),(65,82),(63,88)],cream,2)
 elif ident=='baseball-uniform-01':
  line([(59,72),(64,77),(70,72)],'#9b4d55',2);line((65,78,65,91),'#9b4d55')
  for x in [58,61,70,73]:line((x,79,x,90),'#c6c6c1')
  line([(69,81),(73,81),(69,85),(73,85)],'#9b4d55')
  for y in [79,84,89]:d.point((66,y),fill=ink)
 elif ident=='basketball-uniform-01':
  line([(60,73),(62,78),(68,78),(71,73)],'#546d9d',2)
  line((56,76,56,83),'#546d9d',2);line((77,76,77,83),'#546d9d',2)
  line((61,81,71,81),cream);line([(62,84),(65,84),(63,87),(65,89),(61,89)],cream)
  line([(68,84),(71,84),(71,89),(68,89),(68,84)],cream)
 elif ident=='taekwondo-uniform-01':
  poly([(59,72),(67,81),(72,73),(75,75),(66,86),(57,75)],shade)
  line([(59,73),(67,82),(73,74)],cream,2)
  rect((55,89,78,91),ink);rect((64,91,67,96),ink);line((69,92,72,96),ink,2)
 elif ident=='chef-uniform-01':
  poly([(60,72),(65,76),(70,72),(72,76),(67,79),(62,78)],cream,shade)
  line((67,80,67,93),shade)
  for x in [62,70]:
   for y in [81,86,91]:rect((x,y,x+1,y+1),ink)
  line((56,89,59,89),shade)
 elif ident=='firefighter-jacket-01':
  rect((58,71,73,76),shade);line((66,76,66,95),ink)
  rect((56,82,77,84),gold);line((56,83,77,83),cream)
  rect((55,93,78,95),gold);line((55,94,78,94),cream)
  pocket(57,86);pocket(70,86);rect((69,77,73,80),ink)
 elif ident=='police-uniform-01':
  poly([(59,72),(65,77),(60,80)],light);poly([(71,72),(66,77),(72,80)],light)
  line((66,77,66,91),shade);pocket(57,82);pocket(70,82)
  poly([(71,77),(74,77),(75,80),(72,82),(70,80)],gold)
  rect((55,92,78,94),ink);rect((64,92,67,94),gold)
 elif ident=='spacesuit-01':
  line([(57,72),(60,77),(70,77),(75,72)],shade,3);line((60,76,70,76),cream)
  rect((60,81,71,89),shade);rect((61,82,70,88),'#6c8fa2');rect((62,83,66,85),'#b9e0dc')
  d.point((69,84),fill='#bd6b67');d.point((69,86),fill=gold)
  line((56,92,77,92),shade,2)
 elif ident=='wizard-robe-01':
  poly([(59,71),(63,76),(67,78),(73,71),(75,76),(68,85),(64,86),(57,76)],shade)
  line([(59,73),(65,82),(73,73)],gold)
  line((65,83,62,106),gold);line((67,84,71,106),shade,2)
  line((56,91,77,91),gold);rect((65,90,68,93),'#d6dae0')
  for x,y in [(73,99),(57,101)]:line((x-1,y,x+1,y),gold);line((x,y-1,x,y+1),gold)
 elif ident=='explorer-vest-01':
  poly([(62,73),(65,77),(69,73),(69,94),(63,94)],cream)
  line((62,77,62,92),shade);line((70,77,70,92),shade)
  for x,y in [(56,80),(71,80),(56,88),(71,88)]:pocket(x,y)
 elif ident=='pajama-top-01':
  poly([(59,73),(64,78),(60,81)],cream);poly([(72,73),(66,78),(71,81)],cream)
  line((66,79,66,92),cream);pocket(70,82)
  for x,y in [(58,84),(61,90),(73,90)]:line((x,y,x+1,y),cream)
  for y in [81,86,91]:d.point((67,y),fill=shade)
 elif ident=='raincoat-01':
  poly([(56,74),(58,70),(61,69),(63,73),(69,73),(71,69),(75,72),(77,76),(71,80),(62,79)],shade,ink)
  line([(59,71),(62,76),(69,77),(74,73)],light)
  line((66,79,66,101),shade);pocket(56,89);pocket(71,89)
  for y in [82,87,92,97]:d.point((67,y),fill=cream)
 return im

def transform(im,s):
 px,py=s.get('pivot',[64,118]);dx=s.get('dx',0);dy=s.get('dy',0);a=math.radians(s.get('angle',0));sx=s.get('scaleX',1);sy=s.get('scaleY',1);c=math.cos(a);t=math.sin(a)
 return im.transform((128,128),Image.Transform.AFFINE,(c/sx,t/sx,px-(c*(px+dx)+t*(py+dy))/sx,-t/sy,c/sy,py+(t*(px+dx)-c*(py+dy))/sy),Image.Resampling.NEAREST)

def frames(spec):
 images={fid:paint(spec,fid) for fid in manifest['frameOrder'][:7]}
 for fid,s in poses.items():
  im=images[s['source']].copy()
  if s['type']=='attackMix':
   d=ImageDraw.Draw(im);d.rectangle((40,72,55,101),fill=0);d.rectangle((77,72,94,101),fill=0)
   arms=images['jump-01'];im.paste(arms.crop((39,66,59,95)),(39,72));im.paste(arms.crop((74,66,96,95)),(74,72))
  if s['type']=='sitMix':
   # Fold long hems onto the lap rather than copying jumping trouser regions into a coat.
   if spec[-1]>100:
    folded=blank();folded.paste(im.crop((0,0,128,91)),(0,0));folded.paste(im.crop((0,91,128,spec[-1]+1)).resize((128,8),Image.Resampling.NEAREST),(0,91));im=folded
   im=transform(im,{'dy':s['down']})
  else:im=transform(im,s)
  images[fid]=im
 return images

if __name__=='__main__':
 for spec in DESIGNS:
  file=ASSETS/'upper'/(spec[0]+'.json');part=json.loads(file.read_text())
  for fid,im in frames(spec).items():
   px=[[x,y,*im.getpixel((x,y))] for y in range(128) for x in range(128) if im.getpixel((x,y))[3]]
   part['frames'][fid]={'layers':{'upper':{'operations':[{'op':'replacePixels','pixels':px}]}}}
  part['designRevision']='tailored-sleeves-2'
  file.write_text(json.dumps(part,ensure_ascii=False,separators=(',',':'))+'\n')
 print('Rebuilt',len(DESIGNS),'upper parts across',len(manifest['frameOrder']),'frames; IDs and other layers unchanged.')
