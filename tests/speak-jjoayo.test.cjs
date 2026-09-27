const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_speak_jjoayo');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const words=fs.readFileSync(path.join(dir,'words.js'),'utf8');

test('Speak Jjoayo uses browser speech recognition with a typing fallback',()=>{
  assert.match(runtime,/SpeechRecognition\s*\|\|\s*window\.webkitSpeechRecognition/);
  assert.match(runtime,/interimResults=true/);
  assert.match(runtime,/maxAlternatives=5/);
  assert.match(runtime,/getUserMedia\(\{audio:true\}\)/);
  assert.match(runtime,/setInputMode\('typing'/);
  assert.doesNotMatch(html+runtime,/openai|googleapis|azure|assemblyai|deepgram/i);
});

test('Speak Jjoayo keeps the 60-second rush rules and Kidscade SDK lifecycle',()=>{
  assert.match(runtime,/duration:60/);
  assert.match(runtime,/state\.deadline-=1000/);
  assert.match(runtime,/state\.deadline-=3000/);
  assert.match(runtime,/state\.combo%5===0/);
  assert.match(runtime,/KidscadeGame\?\.start/);
  assert.match(runtime,/KidscadeGame\?\.gameOver/);
  assert.ok(html.includes('data-game-id="low_speak_jjoayo"'));
});

test('Speak Jjoayo modules parse and include the 400-word bank',()=>{
  for(const source of [runtime,words]){
    const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(checked.status,0,checked.stderr||checked.stdout);
  }
  const count=(words.match(/\{ko:/g)||[]).length;
  assert.equal(count,400,'expected exactly 400 words, got '+count);
  for(const category of ["animal","food","school","color","daily"])assert.ok(words.includes("cat:'"+category+"'"));
});


test('Speak Jjoayo separates speech homophones from typed spelling',()=>{
  assert.match(runtime,/speechAliases/);
  assert.match(runtime,/acceptedAnswers\(word,\{speech=false\}/);
  assert.match(runtime,/isCorrectTranscript\(transcript,\{speech:true\}\)/);
  assert.match(runtime,/isCorrectTranscript\(value,\{speech:false\}\)/);
  assert.match(words,/en:'eye'.*speechAliases:\['i'\]/);
  assert.match(words,/en:'write'.*speechAliases:\['right','rite'\]/);
  assert.match(words,/en:'see'.*speechAliases:\['sea'\]/);
  assert.match(words,/en:'read'.*speechAliases:\['reed'\]/);
  assert.match(words,/en:'one'.*speechAliases:\['won'\]/);
  assert.match(words,/en:'two'.*speechAliases:\['to','too'\]/);
  assert.match(words,/en:'buy'.*speechAliases:\['by','bye'\]/);
  assert.match(words,/en:'week'.*speechAliases:\['weak'\]/);
  assert.match(words,/en:'know'.*speechAliases:\['no'\]/);
});


test('Speak Jjoayo has four 100-word recommended grade packs',()=>{
  for(const grade of [3,4,5,6]){
    const count=(words.match(new RegExp("grade:"+grade,"g"))||[]).length;
    assert.equal(count,100,'grade '+grade+' should have 100 words');
  }
  assert.match(words,/grade3:'3학년 권장'/);
  assert.match(words,/grade6:'6학년 권장'/);
  assert.ok(html.includes('id="gradePackChips"'));
  assert.ok(html.includes('data-pack="grade3"'));
  assert.ok(html.includes('data-pack="grade6"'));
});

test('Speak Jjoayo stores local condition records through KidscadeStorage',()=>{
  const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');
  assert.ok(html.includes('kidscade-storage.js'));
  assert.match(storage,/speakJjoayoProgress:\s*'kidscade_speak_jjoayo_progress_v1'/);
  assert.match(runtime,/const SAVE_KEY='speakJjoayoProgress'/);
  assert.match(runtime,/KidscadeStorage\?\.getJson/);
  assert.match(runtime,/KidscadeStorage\?\.setJson/);
  assert.match(runtime,/progress\.recent=progress\.recent\.slice\(0,20\)/);
  assert.match(runtime,/function persistRun\(/);
  assert.match(runtime,/function refreshRecordPanel\(/);
  assert.doesNotMatch(runtime,/localStorage\.(?:getItem|setItem|removeItem)/);
});

test('Speak Jjoayo is registered as a language quiz',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_speak_jjoayo');
  assert.ok(game);
  assert.equal(game.title,'스피크가 쪼아요!');
  assert.equal(game.href,'games/low_speak_jjoayo/index.html?v=3');
  assert.equal(game.category,'lang');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'quiz');
  assert.equal(game.age,'low');
  assert.deepEqual(game.ages,['low','high']);
});
