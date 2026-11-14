const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'return-nudge.js'), 'utf8');

function harness({
  navigationType = 'navigate',
  initialStore = null,
  speech = true,
  speechBehavior = 'start',
  voices = [{ lang:'ko-KR', name:'Google 한국어 여성' }, { lang:'ko-KR', name:'한국어 기본' }],
  game = null,
  fullscreen = false,
  nativeModal = true,
  topLevel = true
} = {}) {
  let now = 100000;
  let timerId = 0;
  const timers = new Map();
  const calls = [];
  const events = new Map();
  const store = new Map(initialStore === null ? [] : [['kidscade:return-nudge:hidden-at:v1', String(initialStore)]]);
  const allElements = [];
  const element = tag => {
    const node = {
      tag, style:{}, attrs:{}, children:[], handlers:{}, textContent:'', disabled:false,
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, callback) { this.handlers[name] = callback; },
      append(...children) { this.children.push(...children); },
      remove() { this.removed = true; },
      focus() { this.focused = true; }
    };
    if (tag === 'dialog' && nativeModal) {
      node.showModal = () => { node.open = true; };
      node.close = () => { node.open = false; };
    }
    allElements.push(node);
    return node;
  };
  const body = element('body');
  const iframe = game ? { contentWindow:{ KidscadeGame:game.sdk } } : null;
  const doc = {
    body, visibilityState:'visible',
    fullscreenElement: fullscreen ? {} : null,
    exitFullscreen() { this.fullscreenElement = null; this.fullscreenExited = true; },
    getElementById(id) { return id === 'game-iframe' ? iframe : null; },
    createElement: element,
    addEventListener(name, callback) { events.set('document:'+name, callback); }
  };
  const synth = speech ? {
    speaking:false,
    cancel() {},
    getVoices() { return voices; },
    speak(utterance) {
      calls.push(utterance);
      if (speechBehavior === 'start') {
        this.speaking = true;
        utterance.onstart?.();
      } else if (speechBehavior === 'end') utterance.onend?.();
      else if (speechBehavior === 'error') utterance.onerror?.({ error:'not-allowed' });
      else if (speechBehavior === 'throw') throw new Error('engine unavailable');
    }
  } : undefined;
  const win = {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: speech ? function(text){ this.text=text; } : undefined,
    performance:{ getEntriesByType(){ return [{ type:navigationType }]; } },
    KidscadeGameFrame: { isPlaying() { return !!game; } },
    addEventListener(name,cb) { events.set('window:'+name,cb); }
  };
  win.self = win; win.top = topLevel ? win : {};
  const schedule = (fn, delay, period) => {
    const id = ++timerId;
    timers.set(id,{ fn, when:now+delay, period });
    return id;
  };
  const ctx = {
    window:win,document:doc,
    sessionStorage:{
      getItem(key){return store.get(key) ?? null;},
      setItem(key,value){store.set(key,value);},
      removeItem(key){store.delete(key);}
    },
    Date: class extends Date {static now(){return now;}},
    setTimeout(fn,ms){return schedule(fn,ms,null);},
    clearTimeout(id){timers.delete(id);},
    setInterval(fn,ms){return schedule(fn,ms,ms);},
    clearInterval(id){timers.delete(id);}
  };
  vm.runInNewContext(source, ctx);
  const active = () => body.children.filter(node => !node.removed).at(-1);
  const advance = ms => {
    const until = now+ms;
    let guard=0;
    while (true) {
      const due=[...timers].sort((a,b)=>a[1].when-b[1].when).find(([,v])=>v.when<=until);
      if (!due) break;
      if (++guard>1000) throw new Error('timer loop');
      const [id, timer]=due;
      now=timer.when;
      if(timer.period===null)timers.delete(id);
      else if(timers.has(id))timer.when+=timer.period;
      timer.fn();
    }
    now=until;
  };
  return {
    win,doc,calls,timers,store,events,body,allElements,
    advance, setNow(t){now=t;}, now(){return now;},
    hide(){doc.visibilityState='hidden'; events.get('document:visibilitychange')?.();},
    show(){doc.visibilityState='visible';events.get('document:visibilitychange')?.();},
    pageshow(){events.get('window:pageshow')?.();},
    overlay:active,
    panel(){return active()?.children?.[0];},
    button(){return this.panel()?.children?.[2];}
  };
}

function makeGame(paused = false, pauseable = true) {
  const state={paused,pauseable,ended:false};
  const events=[];
  return {
    state,events,
    sdk:{
      state:()=>({...state}),
      pause(detail){events.push(['pause',detail.source]);state.paused=true;},
      resume(detail){events.push(['resume',detail.source]);state.paused=false;}
    }
  };
}

test('tab return is a top-layer blocking dialog with a manual continue button', () => {
  const h=harness();
  h.hide();h.advance(5000);h.show();
  assert.equal(h.overlay().id,'kidscade-return-nudge');
  assert.equal(h.overlay().tag,'dialog');
  assert.equal(h.overlay().open,true);
  assert.equal(h.overlay().attrs['aria-modal'],'true');
  assert.equal(h.button().textContent,'▶ 게임 계속하기');
  assert.equal(h.calls.length,0);
});

test('Google female Korean voice is selected, at maximum utterance gain, with one tap', () => {
  const h=harness({voices:[
    { lang:'ko-KR',name:'Other Korean' },
    { lang:'en-US',name:'Google female English' },
    { lang:'ko-KR',name:'Google 한국어 여성' }
  ]});
  h.hide();h.advance(4000);h.show();
  h.button().handlers.click();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].voice.name,'Google 한국어 여성');
  assert.equal(h.calls[0].volume,1);
  assert.equal(h.calls[0].lang,'ko-KR');
  assert.equal(h.overlay(),undefined);
});

test('Google Korean fallback beats generic Korean; default Korean when Google absent', () => {
  for (const voices of [
    [{lang:'ko-KR',name:'Standard Korean'},{lang:'ko-KR',name:'Google 한국어'}],
    [{lang:'ko-KR',name:'Standard Korean'}]
  ]) {
    const h=harness({voices});
    h.hide();h.advance(4000);h.show();
    h.button().handlers.click();
    assert.equal(h.calls[0].voice.name,voices.at(-1).name);
  }
});

test('start event not required if the synthesis engine emits successful end', () => {
  const h=harness({speechBehavior:'end'});
  h.hide();h.advance(4000);h.show();
  h.button().handlers.click();
  assert.equal(h.overlay(),undefined);
});

test('no speech API enters exactly 60-second recovery without trapping permanently', () => {
  const h=harness({speech:false});
  h.hide();h.advance(4000);h.show();
  h.button().handlers.click();
  assert.match(h.panel().children[0].textContent,/음성을 재생하지 못했어요/);
  assert.equal(h.button().disabled,true);
  assert.match(h.button().textContent,/60초/);
  h.advance(59999);
  assert.ok(h.overlay());
  h.advance(1);
  assert.equal(h.overlay(),undefined);
  assert.equal(h.timers.size,0);
});

test('speech engine error triggers the same bounded recovery', () => {
  const h=harness({speechBehavior:'error'});
  h.hide();h.advance(4000);h.show();h.button().handlers.click();
  assert.ok(h.overlay());
  h.advance(60000);
  assert.equal(h.overlay(),undefined);
});

test('speech engine with no events or speaking state triggers watchdog, then 60-second wait', () => {
  const h=harness({speechBehavior:'silent'});
  h.hide();h.advance(4000);h.show();h.button().handlers.click();
  h.advance(6999);
  assert.equal(h.panel().children[0].textContent,'다시 돌아왔네!');
  h.advance(1);
  assert.match(h.panel().children[0].textContent,/음성을/);
  h.advance(60000);
  assert.equal(h.overlay(),undefined);
});

test('speaking=true but no start event does not falsely imply a muted system', () => {
  const h=harness({speechBehavior:'silent'});
  h.hide();h.advance(4000);h.show();h.button().handlers.click();
  h.win.speechSynthesis.speaking=true;
  h.advance(7000);
  assert.equal(h.overlay(),undefined);
});

test('pauses only SDK games with working pause/resume and resumes on button tap', () => {
  const game=makeGame();
  const h=harness({game});
  h.hide();
  assert.equal(game.state.paused,true);
  h.advance(4000);h.show();
  assert.equal(game.state.paused,true);
  h.button().handlers.click();
  assert.equal(game.state.paused,false);
  assert.deepEqual(game.events.map(x=>x[0]),['pause','resume']);
});

test('respects a game already paused by the student', () => {
  const game=makeGame(true);
  const h=harness({game});
  h.hide();h.advance(4000);h.show();h.button().handlers.click();
  assert.equal(game.events.length,0);
  assert.equal(game.state.paused,true);
});

test('does not pause games that cannot resume', () => {
  const game=makeGame(false,false);
  const h=harness({game});
  h.hide();h.advance(4000);h.show();h.button().handlers.click();
  assert.equal(game.events.length,0);
});

test('short away resumes eligible game automatically without a dialog', () => {
  const game=makeGame();
  const h=harness({game});
  h.hide();h.advance(1000);h.show();
  assert.equal(h.overlay(),undefined);
  assert.equal(game.state.paused,false);
  assert.deepEqual(game.events.map(x=>x[0]),['pause','resume']);
});

test('waiting due to TTS failure keeps game paused for the bounded 60s', () => {
  const game=makeGame();
  const h=harness({speech:false,game});
  h.hide();h.advance(5000);h.show();h.button().handlers.click();
  assert.equal(game.state.paused,true);
  h.advance(60000);
  assert.equal(game.state.paused,false);
});

test('fullscreen mode attempts to exit fullscreen before showing the dialog', () => {
  const h=harness({fullscreen:true});
  h.hide();h.advance(4000);h.show();
  assert.equal(h.doc.fullscreenExited,true);
  assert.equal(h.overlay().open,true);
});

test('duplicate pageshow and visibility events never stack dialogs', () => {
  const h=harness();
  h.hide();h.advance(4000);h.show();
  h.pageshow();
  assert.equal(h.body.children.filter(x=>!x.removed).length,1);
});

test('brief, over-20-minute and cooldown returns produce no dialog', () => {
  const brief=harness();brief.hide();brief.advance(1000);brief.show();
  assert.equal(brief.overlay(),undefined);
  const long=harness();long.hide();long.advance(20*60*1000+1);long.show();
  assert.equal(long.overlay(),undefined);
  const repeat=harness();repeat.hide();repeat.advance(5000);repeat.show();repeat.button().handlers.click();
  repeat.hide();repeat.advance(10000);repeat.show();
  assert.equal(repeat.overlay(),undefined);
});

test('history restore can prompt; a full reload does not reuse stale timestamps', () => {
  const back=harness({initialStore:96000,navigationType:'back_forward'});back.pageshow();
  assert.ok(back.overlay());
  const reload=harness({initialStore:96000,navigationType:'reload'});reload.pageshow();
  assert.equal(reload.overlay(),undefined);
});

test('no duplicate top-level observer in embedded iframe', () => {
  const h=harness({topLevel:false});
  assert.equal(h.events.size,0);
});
