// Decorative festival guests stand away from the coordinator's interaction
// marker (-1.1, 14.3). Their movements are small and never block the farmer.
export const FESTIVAL_GUESTS=Object.freeze([
  {name:'축제 손님 · 박수',x:-4.45,z:15.45,role:'clap',scale:1,shirt:0x688c9b,skirt:0x755c55},
  {name:'축제 손님 · 인사',x:-3.85,z:18.2,role:'wave',scale:.96,shirt:0xbf8668,skirt:0x636483},
  {name:'축제 손님 · 장보기',x:1.65,z:18.25,role:'browse',scale:1.02,shirt:0x84a178,skirt:0x7f665a},
  {name:'축제 손님 · 아이',x:3.55,z:16.35,role:'skip',scale:.73,shirt:0xdfb66a,skirt:0x567d83},
  {name:'축제 손님 · 이야기',x:-5.55,z:18.85,role:'chat',scale:.95,shirt:0xa18dbe,skirt:0x68724f}
]);

export const FESTIVAL_THEMES=Object.freeze({
  봄:Object.freeze({colors:[0xeea9b5,0xa4c995,0xf5d28a],produce:0xe88742,leaf:0x5f9c55}),
  여름:Object.freeze({colors:[0x7abdc9,0xf3d06b,0xf09965],produce:0xeac651,leaf:0x6a9b61}),
  가을:Object.freeze({colors:[0xd78b52,0xe5b959,0xa1b77a],produce:0xd8b25c,leaf:0x92783e}),
  겨울:Object.freeze({colors:[0xafd5dc,0xf5e3bd,0xc9777d],produce:0xe68946,leaf:0x568c6c})
});

export function festivalSceneState(event){
  const open=Boolean(event?.open);
  return {open,season:FESTIVAL_THEMES[event?.season]?event.season:'봄',
    completed:open&&Boolean(event?.completed),visitors:open?FESTIVAL_GUESTS.length:0};
}
