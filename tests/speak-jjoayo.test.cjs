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

test('Speak Jjoayo modules parse and include a useful starter word bank',()=>{
  for(const source of [runtime,words]){
    const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(checked.status,0,checked.stderr||checked.stdout);
  }
  const count=(words.match(/\{ko:/g)||[]).length;
  assert.ok(count>=90,'expected at least 90 starter words, got '+count);
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
});

test('Speak Jjoayo is registered as a language quiz',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_speak_jjoayo');
  assert.ok(game);
  assert.equal(game.title,'스피크가 쪼아요!');
  assert.equal(game.href,'games/low_speak_jjoayo/index.html?v=1');
  assert.equal(game.category,'lang');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'quiz');
  assert.equal(game.age,'low');
});
