/* Kidscade shared pixel-art item atlas: 320 × 272 source, 11 columns × 8 full-size rows.
 * Original sprite source is preserved at assets/more assets/OpenmonItemIcons.png.
 * Use KidscadeItemIcons.draw(ctx, 'canBlue', cx, cy, size) in canvas;
 * use KidscadeItemIcons.html('canBlue', size) in game inventory/HTML cards.
 * These represent inventory/UI icons; the original sprite is not a 3D/world model.
 */
(function(root){
  'use strict';
  const script=document.currentScript;
  const src=script ? new URL('../../../more assets/OpenmonItemIcons.png', script.src).href
                   : '/assets/more%20assets/OpenmonItemIcons.png';
  const CELL_W=29, CELL_H=31, WIDTH=320, HEIGHT=272;
  const coords=Object.freeze({
    berryRed:[0,0],cherry:[1,0],giftBlue:[2,0],fruitYellow:[3,0],carrot:[4,0],
    grapes:[5,0],berryTeal:[6,0],berryBlue:[7,0],crystalPurple:[8,0],star:[10,0],
    berrySpotted:[0,1],strawberry:[1,1],fruitOrange:[2,1],banana:[3,1],
    chili:[4,1],corn:[5,1],crystalBlue:[6,1],heartBlue:[7,1],
    leafPurple:[8,1],flowerPink:[9,1],flowerGreen:[10,1],
    canBlue:[0,2],canGreen:[1,2],flashlight:[2,2],plasticBottle:[3,2],
    batteryPink:[4,2],plantSprout:[5,2],waterBottle:[6,2],glassBottle:[7,2],
    canOrange:[8,2],jar:[9,2],bottleWhite:[10,2],
    stone:[0,3],featherGray:[1,3],fish:[2,3],eggGold:[3,3],
    gemRed:[4,3],gemOrange:[5,3],letter:[6,3],battery:[7,3],
    shardPink:[8,3],shield:[9,3],crest:[10,3],
    paper:[0,4],metalCase:[1,4],scrap:[2,4],floppy:[3,4],disc:[4,4],
    key:[5,4],ticket:[6,4],rope:[7,4],satchel:[8,4],compass:[9,4],goggles:[10,4],
    meat:[0,5],mushroom:[1,5],bell:[2,5],ballRed:[3,5],
    potionGray:[4,5],crown:[5,5],rockDark:[6,5],plant:[7,5],
    shell:[8,5],fossil:[9,5],rock:[10,5],
    magnet:[0,6],blueParts:[1,6],glassCase:[2,6],metalBar:[3,6],
    metalPlate:[4,6],sigil:[5,6],feather:[6,6],pickaxe:[7,6],
    ice:[8,6],scroll:[9,6],fireStone:[10,6],
    glasses:[0,7],cloth:[1,7],bone:[2,7],cable:[3,7],
    moonStone:[4,7],crystalWhite:[5,7],potionPurple:[6,7],
    potionPink:[7,7],book:[8,7],close:[10,7]
  });
  const atlas=new Image();
  atlas.decoding='async';
  atlas.src=src;
  function iconRect(name){
    const pos=coords[name];if(!pos)return null;
    return {sx:pos[0]*CELL_W,sy:pos[1]*CELL_H,sw:CELL_W,sh:CELL_H};
  }
  function draw(ctx,name,x,y,size=32){
    const rect=iconRect(name);
    if(!rect||!atlas.complete||!atlas.naturalWidth)return false;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(atlas,rect.sx,rect.sy,rect.sw,rect.sh,x-size/2,y-size/2,size,size);
    ctx.restore();return true;
  }
  function html(name,size=28){
    const pos=coords[name];if(!pos)return '';
    size=Math.max(12,Math.min(96,Math.round(Number(size)||28)));
    const scaleX=size/CELL_W,scaleY=size/CELL_H;
    // The atlas path is a fixed first-party asset, not an arbitrary caller-supplied URL.
    return '<span class="kidscade-item-icon" aria-hidden="true" style="display:inline-block;flex:none;vertical-align:middle;'+
      'width:'+size+'px;height:'+size+'px;image-rendering:pixelated;background-repeat:no-repeat;'+
      'background-image:url(&quot;'+src+'&quot;);background-size:'+(WIDTH*scaleX)+'px '+(HEIGHT*scaleY)+'px;'+
      'background-position:-'+(pos[0]*size)+'px -'+(pos[1]*size)+'px"></span>';
  }
  root.KidscadeItemIcons=Object.freeze({src,width:WIDTH,height:HEIGHT,cellWidth:CELL_W,cellHeight:CELL_H,coords,atlas,iconRect,draw,html});
})(window);
