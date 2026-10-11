// Shared by Cloudflare account sync and the 3D account avatar editor.
// Only IDs for complete, school-appropriate outfits are accepted.
export const CHIBI_ACCOUNT_DEFAULTS=Object.freeze({
  male:Object.freeze({hair:'kidscade_male_hair_short',top:'kidscade_male_tshirt',bottom:'kidscade_male_shorts',shoes:'chibi_shoe_sneakers'}),
  female:Object.freeze({hair:'hairone',top:'shirt',bottom:'skirt',shoes:'chibi_shoe_sneakers'})
});

const maleHair=[
  'kidscade_male_hair_short','kidscade_male_hair_crop','kidscade_male_hair_sidepart',
  'kidscade_male_hair_textured','kidscade_male_hair_fringe','kidscade_male_hair_undercut',
  'kidscade_male_hair_round','kidscade_male_hair_swept','kidscade_male_hair_spiky',
  'kidscade_male_hair_wave','kidscade_male_hair_mullet','kidscade_male_hair_comma'
];
const femaleHair=[
  'hairone','hairT','hairtail','hairtailknight','hairvariant','hairvariant.001',
  'chibi_female_hair_bob','chibi_female_hair_layered','chibi_female_hair_curl',
  'chibi_female_hair_hime','chibi_female_hair_pixie','chibi_female_hair_twintail'
];
const maleTop=[
  'kidscade_male_tshirt','chibi_male_hoodie','chibi_male_bomber','chibi_male_varsity',
  'chibi_male_oxford','chibi_male_sweater','chibi_male_trackjacket',
  'chibi_male_rugby','chibi_male_utilityvest'
];
const maleBottom=[
  'kidscade_male_shorts','chibi_male_jeans','chibi_male_joggers','chibi_male_chinos',
  'chibi_male_cargo','chibi_male_trackpants'
];
const femaleTop=[
  'shirt','kidscade_hoodie_blue','chibi_female_cardigan','chibi_female_blouse',
  'chibi_female_knit','chibi_female_jacket','chibi_female_blazer',
  'chibi_female_sailor','chibi_female_tunic'
];
const femaleBottom=[
  'skirt','chibi_female_jeans','chibi_female_shorts','chibi_female_widepants',
  'chibi_female_pleated','chibi_female_culottes'
];
const shoes=['chibi_shoe_sneakers','chibi_shoe_hightop','chibi_shoe_loafers',
  'chibi_shoe_boots','chibi_shoe_sandals','chibi_shoe_slippers'];
const optional=Object.freeze({
  hat:['chibi_hat_baseball','chibi_hat_bucket','chibi_hat_beanie',
    'chibi_hat_beret','chibi_hat_straw','chibi_gear_headphones'],
  face:['chibi_face_round','chibi_face_square','chibi_face_sunglasses',
    'chibi_face_goggles','chibi_face_mask'],
  bag:['chibi_bag_school','chibi_bag_crossbody','chibi_bag_mini'],
  wrist:['chibi_gear_watch'],
  neck:['chibi_gear_scarf']
});
export const CHIBI_ACCOUNT_CATALOG=Object.freeze({
  male:Object.freeze({hair:maleHair,top:maleTop,bottom:maleBottom,shoes,...optional}),
  female:Object.freeze({hair:femaleHair,top:femaleTop,bottom:femaleBottom,shoes,...optional})
});
const required=['hair','top','bottom','shoes'];
const selectable=['hat','face','bag','wrist','neck'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export function sanitizeChibiAccountAvatar(input){
  if(!object(input))return null;
  const bodyFit=input.bodyFit==='female'?'female':'male';
  const raw=object(input.parts)?input.parts:{};
  const catalog=CHIBI_ACCOUNT_CATALOG[bodyFit],defaults=CHIBI_ACCOUNT_DEFAULTS[bodyFit];
  const parts={};
  for(const key of required){
    parts[key]=typeof raw[key]==='string'&&catalog[key].includes(raw[key])
      ?raw[key]:defaults[key];
  }
  for(const key of selectable){
    parts[key]=typeof raw[key]==='string'&&catalog[key].includes(raw[key])
      ?raw[key]:'';
  }
  // Never persist arbitrary GLB URLs, mesh IDs, free-form state or bare skin.
  return {version:1,bodyFit,parts};
}
export function isChibiAccountClothed(value){
  if(!object(value)||!object(value.parts))return false;
  const catalog=CHIBI_ACCOUNT_CATALOG[value.bodyFit];
  return Boolean(catalog&&['top','bottom','shoes'].every(slot=>
    typeof value.parts[slot]==='string'&&catalog[slot].includes(value.parts[slot])));
}
