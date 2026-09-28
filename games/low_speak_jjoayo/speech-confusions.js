// Speech-to-text confusion forms.
// These are deliberately used only in voice mode. Typed answers remain strict.
// Directional entries are used for heteronyms such as read/red.
const GROUPS = [
  ['hear','here'],
  ['see','sea'],
  ['one','won'],
  ['two','to','too'],
  ['four','for'],
  ['eight','ate'],
  ['eye','i'],
  ['right','write','rite'],
  ['sun','son'],
  ['rain','reign','rein'],
  ['blue','blew'],
  ['bear','bare'],
  ['board','bored'],
  ['pear','pair'],
  ['meat','meet'],
  ['weather','whether'],
  ['buy','by','bye'],
  ['night','knight'],
  ['week','weak'],
  ['know','no'],
  ['hour','our'],
  ['bee','be'],
  ['tea','tee'],
  ['hair','hare'],
  ['deer','dear'],
  ['new','knew'],
  ['road','rode'],
  ['sell','cell'],
  ['wait','weight'],
  ['flower','flour'],
  ['plane','plain'],
  ['break','brake'],
  ['hole','whole'],
  ['piece','peace'],
  ['tail','tale'],
  ['mail','male'],
  ['sale','sail'],
  ['steel','steal'],
  ['which','witch'],
  ['wood','would'],
  ['where','wear'],
  ['there','their',"they're"],
  ['your',"you're"],
  ['whose',"who's"],
  ['allowed','aloud'],
  ['sent','cent','scent'],
  ['nose','knows'],
  ['ice','eyes']
];

const NUMBER_FORMS = {
  one:['1'],
  two:['2'],
  three:['3'],
  four:['4'],
  five:['5'],
  six:['6'],
  seven:['7'],
  eight:['8'],
  nine:['9'],
  ten:['10']
};

const DIRECTIONAL = {
  // "read" has two pronunciations. Keep the expected pronunciation directional.
  red:['read'],
  read:['reed'],
  // US English commonly permits "aunt" to sound like "ant"; STT may choose either spelling.
  aunt:['ant'],
  ant:['aunt']
};

function key(value){
  return String(value||'').trim().toLowerCase();
}

const GROUP_INDEX = new Map();
for(const group of GROUPS){
  for(const item of group){
    const k=key(item);
    const peers=group.filter(other=>key(other)!==k);
    GROUP_INDEX.set(k,[...(GROUP_INDEX.get(k)||[]),...peers]);
  }
}

export function speechConfusionsFor(value){
  const k=key(value);
  const values=[
    ...(GROUP_INDEX.get(k)||[]),
    ...(NUMBER_FORMS[k]||[]),
    ...(DIRECTIONAL[k]||[])
  ];
  return [...new Set(values)];
}

export const SPEECH_CONFUSION_GROUPS = GROUPS;
