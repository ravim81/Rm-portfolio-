import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const [html,css,js,handler,config]=await Promise.all([
 readFile(new URL('../public/world/index.html',import.meta.url),'utf8'),
 readFile(new URL('../public/world/world.css',import.meta.url),'utf8'),
 readFile(new URL('../public/world/world.js',import.meta.url),'utf8'),
 readFile(new URL('../worker/handler.mjs',import.meta.url),'utf8'),
 readFile(new URL('../worker/config.json',import.meta.url),'utf8')
]);
test('world route has accessible scene controls and a non-WebGL fallback',()=>{
 assert.match(html,/id="world-canvas"/);assert.match(html,/aria-label="A cinematic 3D city/);
 assert.match(html,/id="world-fallback"/);assert.match(html,/id="journey-toggle"/);
 assert.match(html,/id="journey-replay"/);assert.match(html,/id="journey-end"/);assert.match(html,/world\.js/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/max-width:700px/);assert.match(css,/orientation:landscape/);
});
test('city is a real Three.js scene with rider, motorcycle and camera choreography',()=>{
 assert.match(js,/three@0\.180\.0/);assert.match(js,/new THREE\.WebGLRenderer/);assert.match(js,/new THREE\.InstancedMesh/);
 assert.match(js,/function addBuilding/);assert.match(js,/function makeBillboard/);assert.match(js,/function makeWheel/);
 assert.match(js,/function updateScene/);assert.match(js,/requestAnimationFrame\(animate\)/);
 assert.match(js,/renderer:'webgl'/);assert.match(js,/rider:true/);assert.match(js,/motorcycle:true/);
});
test('experience supports autoplay, scroll takeover, pause, replay and reduced motion',()=>{
 assert.match(js,/prefers-reduced-motion/);assert.match(js,/manualMode=true/);assert.match(js,/autoPlaying=false/);
 assert.match(js,/journey-toggle/);assert.match(js,/journey-replay/);assert.match(js,/window\.scrollTo/);assert.match(js,/setFallback/);
});
test('world preview is isolated and worker serves the new scene at its root',()=>{
 assert.equal(JSON.parse(config).name,'rm-portfolio-world-preview');assert.match(handler,/path='\/world\/index\.html'/);
});
