import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext, Script} from 'node:vm';

const safety = await readFile(new URL('../public/story-safety.js',import.meta.url),'utf8');
const story = await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const html = await readFile(new URL('../public/index.html',import.meta.url),'utf8');

function createRuntime({hook=false,kineticHidden=false,pending=true}={}) {
  const listeners = {}, timers = [];
  const names = new Set(pending?['build-pending']:[]);
  const hiddenNames = new Set(kineticHidden?['kinetic-source-hidden']:[]);
  const heading={classList:{remove(v){hiddenNames.delete(v)}}};
  const node={classList:{
    contains(name){return names.has(name)},
    remove(name){names.delete(name)},
    add(name){names.add(name)}
  }};
  let removed=0, called=0;
  const document={
    hidden:false,
    querySelectorAll(sel){
      if(sel==='.build-pending')return names.has('build-pending')?[node]:[];
      if(sel==='.kinetic-source-hidden')return hiddenNames.has('kinetic-source-hidden')?[heading]:[];
      return [];
    },
    querySelector(sel) {
      if(sel==='.hero h1')return node;
      if(sel==='.agent-layer'||sel==='.build-controls')return {remove(){removed++}};
      return null;
    },
    documentElement:{classList:{remove(){}}},
    body:{classList:{add(){}}}
  };
  const window={
    addEventListener(type,listener){listeners[type]=listener},
    setTimeout(callback){timers.push(callback)}
  };
  if(hook)window.__portfolioStoryRecover=()=>{
    called++;
    node.classList.remove('build-pending');
    node.classList.add('build-complete');
  };
  runInNewContext(safety,{window,document,String});
  return {window,node,names,hiddenNames,listeners,timers,get called(){return called},get removed(){return removed},document};
}

test('safety net loads before animation and parses independently',()=>{
  assert.doesNotThrow(()=>new Script(safety));
  assert.match(html,/<script src="story-safety\.js" defer><\/script>/);
  assert.ok(html.indexOf('story-safety.js')<html.indexOf('build-story.js'));
  assert.match(story,/window\.__portfolioStoryRecover = exploreFreely/);
});

test('runtime animation error immediately releases pending content',()=>{
  const env=createRuntime();
  env.listeners.error({filename:'https://site.test/build-story.js'});
  assert.ok(env.names.has('build-complete'));
  assert.ok(!env.names.has('build-pending'));
  assert.equal(env.removed,2);
});

test('safety net delegates to the normal manual recovery when available',()=>{
  const env=createRuntime({hook:true});
  env.listeners.error({filename:'https://site.test/build-story.js'});
  assert.equal(env.called,1);
  assert.ok(env.names.has('build-complete'));
  assert.equal(env.removed,0);
});

test('unrelated errors do not interfere with animations',()=>{
  const env=createRuntime();
  env.listeners.error({filename:'https://site.test/analytics.js'});
  assert.ok(env.names.has('build-pending'));
  assert.equal(env.removed,0);
});

test('long frozen introduction times out into a usable page',()=>{
  const env=createRuntime();
  assert.equal(env.timers.length,1);
  env.timers[0]();
  assert.ok(env.names.has('build-complete'));
  assert.equal(env.removed,2);
});

test('hidden tab is not timed out prematurely',()=>{
  const env=createRuntime();
  env.document.hidden=true;
  env.timers[0]();
  assert.ok(env.names.has('build-pending'));
  assert.equal(env.timers.length,2);
});


test('kinetic renderer errors restore headings even after regular content is complete',()=>{
  const env=createRuntime({pending:false,kineticHidden:true});
  env.listeners.error({filename:'https://portfolio.test/kinetic-typography.js'});
  assert.ok(!env.hiddenNames.has('kinetic-source-hidden'));
  assert.equal(env.removed,2);
});

test('watchdog ignores a harmless kinetic error when no text is hidden',()=>{
  const env=createRuntime({pending:false});
  env.listeners.error({filename:'https://portfolio.test/kinetic-typography.js'});
  assert.equal(env.removed,0);
});
