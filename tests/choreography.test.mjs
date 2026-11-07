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
  assert.match(source,/revealStart:\s*compact \? 835 : 880/);
  assert.match(source,/approach:\s*compact \? 610 : 560/);
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