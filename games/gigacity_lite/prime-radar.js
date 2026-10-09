import { relativeContact, fighterType } from './prime-tactics.mjs';

const colours = { scout: '#ffda92', armor: '#ee9679', interceptor: '#ef8fdf', command: '#ff6879' };
export function drawPrimeRadar(canvas, pilot, heading, visuals, selectedId) {
  const context = canvas?.getContext?.('2d');
  if (!context) return null;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * .43;
  context.clearRect(0, 0, w, h);
  context.fillStyle = 'rgba(5,22,43,.97)';
  context.beginPath(); context.arc(cx,cy,r+7,0,Math.PI*2); context.fill();
  context.lineWidth=2;context.strokeStyle='rgba(113,223,247,.40)';
  for (const t of [.45, .74, 1]) {
    context.beginPath();context.arc(cx,cy,r*t,0,Math.PI*2);context.stroke();
  }
  context.strokeStyle='rgba(118,204,238,.24)';
  context.beginPath();context.moveTo(cx,cy-r);context.lineTo(cx,cy+r);
  context.moveTo(cx-r,cy);context.lineTo(cx+r,cy);context.stroke();
  context.fillStyle='#aaf9ff';context.beginPath();
  context.moveTo(cx,cy-10);context.lineTo(cx-7,cy+7);context.lineTo(cx+7,cy+7);context.closePath();context.fill();
  let closest=null, target=null;
  for (const [id, visual] of visuals) {
    if (!visual.body.visible) continue;
    const contact=relativeContact(pilot,heading,visual.root.position,185);
    const x=cx+contact.x*r,y=cy+contact.y*r;
    const selected=id===selectedId;
    const type=visual.type||fighterType(visual.number);
    const danger=visual.warningTime>0;
    context.beginPath();context.arc(x,y,selected?8:6,0,Math.PI*2);
    context.fillStyle=danger?'#ff3b55':colours[type];
    context.fill();
    context.lineWidth=selected?3:1;
    context.strokeStyle=selected?'#b1faff':'rgba(255,255,255,.7)';
    context.stroke();
    if (!closest||contact.distance<closest.distance) closest={...contact,id,type};
    if (selected) target={...contact,id,type};
  }
  context.font='bold 16px sans-serif';context.textAlign='center';
  context.fillStyle='#9ed9e9';context.fillText('전방',cx,20);
  context.fillStyle='#cbd6ec';context.fillText('후방',cx,h-9);
  return { closest, target };
}
