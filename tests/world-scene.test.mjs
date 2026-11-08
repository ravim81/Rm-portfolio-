import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const html=await readFile(new URL('../public/world/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/world/world.css',import.meta.url),'utf8');
const js=await readFile(new URL('../public/world/world.js',import.meta.url),'utf8');
test('cinematic scene exposes an accessible canvas, fallback and journey controls',()=>{
 for(const id of ['world-canvas','world-fallback','world-loading','city-chapter','journey-toggle','journey-replay','journey-end','world-progress'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-label="A cinematic 3D city'));assert.ok(html.includes('aria-live="polite"'));
 for(const rule of ['prefers-reduced-motion','max-width:700px','max-width:380px','orientation:landscape'])assert.ok(css.includes(rule),rule);
});
test('scene builds a Three.js city, motorcycle, rider and billboard composition',()=>{
 for(const part of ['three@0.180.0','new THREE.WebGLRenderer','new THREE.InstancedMesh','function makeBillboard','new THREE.TorusGeometry','const bike=new THREE.Group','const rider=new THREE.Group','requestAnimationFrame(animate)','__WORLD_DIAGNOSTICS__'])assert.ok(js.includes(part),part);
});
test('journey supports autoplay, manual scroll takeover, pause, replay and renderer fallback',()=>{
 for(const part of ['prefers-reduced-motion','manualMode=true','autoPlaying=false','journey-toggle','journey-replay','setFallback','visibilitychange'])assert.ok(js.includes(part),part);
});
test('world JavaScript parses before browser execution',()=>{assert.doesNotThrow(()=>new Script(js,{filename:'public/world/world.js'}));});
