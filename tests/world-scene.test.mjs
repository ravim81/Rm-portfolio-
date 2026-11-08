import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const html=await readFile(new URL('../public/world/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/world/world.css',import.meta.url),'utf8');
const js=await readFile(new URL('../public/world/world.js',import.meta.url),'utf8');
test('cinematic scene exposes an accessible canvas, fallback and journey controls',()=>{
 for(const id of ['world-canvas','world-fallback','world-loading','city-chapter','journey-toggle','journey-replay','journey-end','world-progress'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/aria-label="A cinematic 3D city/);assert.match(html,/aria-live="polite"/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/max-width:700px/);assert.match(css,/max-width:380px/);assert.match(css,/orientation:landscape/);
});
test('scene builds a Three.js city, motorcycle, rider and billboard composition',()=>{
 assert.match(js,/three@0\\.180\\.0/);assert.match(js,/new THREE\\.WebGLRenderer/);assert.match(js,/new THREE\\.InstancedMesh/);
 assert.match(js,/function makeBillboard/);assert.match(js,/new THREE\\.TorusGeometry/);assert.match(js,/const bike=new THREE\\.Group/);assert.match(js,/const rider=new THREE\\.Group/);
 assert.match(js,/requestAnimationFrame\\(animate\\)/);assert.match(js,/__WORLD_DIAGNOSTICS__/);
});
test('journey supports autoplay, manual scroll takeover, pause, replay and renderer fallback',()=>{
 assert.match(js,/prefers-reduced-motion/);assert.match(js,/manualMode=true/);assert.match(js,/autoPlaying=false/);assert.match(js,/journey-toggle/);assert.match(js,/journey-replay/);assert.match(js,/setFallback/);assert.match(js,/visibilitychange/);
});
test('world JavaScript parses before browser execution',()=>{assert.doesNotThrow(()=>new Script(js,{filename:'public/world/world.js'}));});
