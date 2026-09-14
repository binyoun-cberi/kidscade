const fs=require('fs');
const p='classroom_war_3d.html';
let s=fs.readFileSync(p,'utf8');
const old='else{o.z+=o.speed*dt;o.group.rotation.x-=dt*5.5;o.group.position.z=o.z;if(o.z>=7.55)explodeHomework(o);}updateObstacleLabel(o);';
const neu='else{o.z+=o.speed*dt;for(const child of o.group.children){if(child!==o.labelSprite)child.rotation.x-=dt*5.5;}o.group.position.z=o.z;if(o.z>=7.55)explodeHomework(o);}if(!o.dead)updateObstacleLabel(o);';
if(!s.includes(old))throw new Error('homework rolling target not found');
s=s.replace(old,neu);
const scripts=[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
for(let i=0;i<scripts.length;i++){try{new Function(scripts[i]);}catch(err){throw new Error('inline script '+(i+1)+' syntax error: '+err.message);}}
fs.writeFileSync(p,s);
console.log('Classroom War v4 homework bomb label hotfix applied');