import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';

const source=await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const styles=await readFile(new URL('../public/style.css',import.meta.url),'utf8');

test('agent choreography is valid browser JavaScript with exactly 23 roles',()=>{
  assert.doesNotThrow(()=>new Script(source));
  const match=source.match(/const roles = \[([\s\S]*?)\];/);
  assert.ok(match,'role registry exists');
  const roles=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.equal(roles.length,23);
  assert.equal(new Set(roles).size,23,'agents have unique roles');
});

test('reveals start after cursor approach and retain visitor controls',()=>{
  assert.match(source,/revealStart:\s*compact \? 780 : 860/);
  assert.match(source,/approach:\s*compact \? 570 : 610/);
  assert.match(source,/requestAnimationFrame/);
  assert.match(source,/stage\.items\.forEach/);
  assert.match(source,/focusin/);
  assert.match(source,/visibilitychange/);
  assert.match(source,/setAutoplay\(false\)/);
  assert.match(source,/exploreFreely/);
  assert.match(source,/reduceMotion/);
});

test('visual effects do not intercept visitor input and support reduced motion',()=>{
  assert.match(styles,/\.agent-layer\{[^}]*pointer-events:none/);
  assert.match(styles,/\.agent-stage-light\{/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles,/html\.agent-camera-moving\{scroll-behavior:auto!important\}/);
});
test('the directed story frames the next content and never builds in blank space',()=>{
  assert.match(source,/r\.top < innerHeight \* \.44/);
  assert.match(source,/const selected = \[primary\]/);
  assert.doesNotMatch(source,/selected\.forEach\(el=>el\.classList\.add\('build-staging'\)\)/);
  assert.match(source,/const cinematicCard = upcoming\?\.matches\('\.project,\.comparison,\.manifesto'\)/);
  assert.match(source,/clamp\(\(innerHeight - rect\.height\) \* \.48/);
  assert.match(source,/: innerHeight \* \(compact \? \.18 : \.20\)/);
  assert.match(styles,/\.build-pending/);
  assert.doesNotMatch(source,/\.hero-bottom, \.section-heading > \*/);
});

test('director builds project-specific task paths before native content reveal',async()=>{
  const director=await readFile(new URL('../public/scene-director.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.doesNotThrow(()=>new Script(director));
  for(const project of ['chem','reframe','brand','discovery']){
    assert.ok(director.includes(project+':'), 'Missing scene geometry for '+project);
  }
  assert.ok(director.includes('getPointAtLength'));
  assert.ok(director.includes('dataset.tasks'));
  assert.ok(source.includes('sceneDirector.render'));
  assert.ok(source.includes('sceneDirector.start'));
  assert.ok(source.includes('sceneDirector?.clear'));
  assert.ok(html.indexOf('scene-director.js')<html.indexOf('build-story.js'),
    'director must load before orchestration');
});
