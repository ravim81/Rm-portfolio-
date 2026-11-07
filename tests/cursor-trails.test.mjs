import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script, runInNewContext} from 'node:vm';

const trails = await readFile(new URL('../public/cursor-trails.js', import.meta.url), 'utf8');
const story = await readFile(new URL('../public/build-story.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/style.css', import.meta.url), 'utf8');

function browser({width=1200,height=800,reduced=false,memory=8,cores=8,noContext=false}={}) {
  const events={strokes:0,clears:0,transforms:0,paths:[],gradients:0};
  const context={
    clearRect(){events.clears++;},
    setTransform(){events.transforms++;},
    createLinearGradient() {
      events.gradients++;
      return {addColorStop() {}};
    },
    stroke(path) {assert.ok(path);events.strokes++;},
    moveTo(){},lineTo(){},
    globalAlpha:1,strokeStyle:'',lineCap:'',lineJoin:'',lineWidth:1
  };
  const canvas={
    width:0,height:0,style:{},removed:false,
    setAttribute(key,val){this[key]=val;},
    getContext(kind){assert.equal(kind,'2d');return noContext?null:context;},
    remove(){this.removed=true;}
  };
  const layer={children:[],insertBefore(el){this.children.unshift(el);}};
  class Path2D {
    constructor(){this.steps=[];events.paths.push(this);}
    moveTo(...p){this.steps.push(['M',...p]);}
    quadraticCurveTo(...p){this.steps.push(['Q',...p]);}
    lineTo(...p){this.steps.push(['L',...p]);}
  }
  const sandbox={
    document:{createElement(name){assert.equal(name,'canvas');return canvas;}},
    window:{},matchMedia:()=>({matches:reduced}),
    innerWidth:width,innerHeight:height,devicePixelRatio:2,
    navigator:{deviceMemory:memory,hardwareConcurrency:cores},
    Math,Number,Path2D
  };
  runInNewContext(trails,sandbox);
  return {sandbox,canvas,layer,context,events};
}

function cursors() {
  return Array.from({length:23},(_,i)=>({
    x:45+(i%8)*115,
    y:50+Math.floor(i/8)*185,
    el:{style:{opacity:'1'}}
  }));
}

test('light trails parse and share one existing animation clock with all 23 agents',()=>{
  assert.doesNotThrow(()=>new Script(trails));
  assert.match(story,/agentCount: agents\.length/);
  assert.match(story,/cursorTrails\?\.draw\(now, agents, phase\)/);
  assert.match(story,/cursorTrails\?\.clear\(\)/);
  assert.doesNotMatch(trails,/requestAnimationFrame\s*\(/);
  assert.ok(page.indexOf('particle-intro.js') < page.indexOf('cursor-trails.js'));
  assert.ok(page.indexOf('cursor-trails.js') < page.indexOf('build-story.js'));
});

test('23 trails draw curved lines, decay, and clear without lingering',()=>{
  const {sandbox,layer,canvas,events}=browser();
  const engine=sandbox.window.createPortfolioCursorTrails({layer,agentCount:23});
  assert.ok(engine);
  assert.equal(layer.children.length,1);
  assert.equal(canvas['aria-hidden'],'true');
  const agents=cursors();
  for(let time=0;time<=500;time+=25) {
    for(const a of agents){a.x+=5;a.y+=2;}
    engine.draw(time,agents,time<250?'intro':'working');
  }
  assert.ok(events.strokes>0, 'animated cursors leave visible strokes');
  assert.ok(events.gradients>0,'lines fade from tail to head');
  assert.ok(events.paths.some(path=>path.steps.some(p=>p[0]==='Q')),'ribbons are curved');
  const strokes=events.strokes;
  engine.draw(2500,agents,'hold');
  assert.equal(events.strokes,strokes,'old trails disappear after their TTL');
  engine.clear();
  engine.draw(2535,[],'hold');
  assert.equal(events.strokes,strokes,'reset leaves a clean canvas');
  engine.destroy();
  assert.equal(canvas.removed,true);
});

test('collaborating cursors briefly connect into a subtle shared wireframe',()=>{
  const {sandbox,layer,events}=browser();
  const engine=sandbox.window.createPortfolioCursorTrails({layer,agentCount:23});
  const agents=cursors();
  agents.forEach((a,i)=>{a.formation=Math.floor(i/8);});
  engine.draw(0,agents,'working');
  agents.forEach(a=>{a.x+=8;a.y+=3;});
  engine.draw(30,agents,'working');
  const wires=events.paths.filter(path=>path.steps.filter(p=>p[0]==='M').length>1);
  assert.ok(wires.length>0,'a grouped wireframe path joins several agents');
  engine.clear();
  engine.draw(700,[],'hold');
  const count=events.paths.length;
  engine.draw(750,[],'hold');
  assert.equal(events.paths.length,count,'connections do not linger in hold mode');
});

test('mobile and low-power devices get smaller, less expensive trails',()=>{
  const {sandbox}=browser();
  const budget=sandbox.window.portfolioCursorTrailBudget;
  assert.deepEqual(JSON.parse(JSON.stringify(budget(390,2,4))),
    {maxPoints:8,fps:30,ttl:370,dprCap:1.25});
  assert.deepEqual(JSON.parse(JSON.stringify(budget(390,8,8))),
    {maxPoints:12,fps:30,ttl:370,dprCap:1.25});
  assert.deepEqual(JSON.parse(JSON.stringify(budget(1280,2,4))),
    {maxPoints:14,fps:30,ttl:460,dprCap:1.4});
  assert.deepEqual(JSON.parse(JSON.stringify(budget(1280,8,8))),
    {maxPoints:23,fps:60,ttl:610,dprCap:1.75});
});

test('resizing and jumping do not connect stale cursor positions',()=>{
  const {sandbox,layer,events}=browser({width:420});
  const engine=sandbox.window.createPortfolioCursorTrails({layer,agentCount:23});
  const agents=cursors();
  engine.draw(0,agents,'working');
  agents[0].x+=12;
  engine.draw(40,agents,'working');
  const before=engine.resizeCount;
  sandbox.innerWidth=480;
  engine.draw(100,agents,'camera');
  assert.equal(engine.resizeCount,before+1);
  engine.clear();
  assert.ok(events.clears>=3);
});

test('reduced motion, unavailable Canvas, and interactions degrade safely',()=>{
  const reduced=browser({reduced:true});
  assert.equal(reduced.sandbox.window.createPortfolioCursorTrails(
    {layer:reduced.layer,agentCount:23}),null);
  const missing=browser({noContext:true});
  assert.equal(missing.sandbox.window.createPortfolioCursorTrails(
    {layer:missing.layer,agentCount:23}),null);
  assert.match(story,/if \(!enabled \|\| document\.hidden \|\| !autoplay\) return/);
  assert.match(story,/if \(enabled\) exploreFreely\(\)/);
  assert.match(story,/if \(animation\.playState === 'running'\) animation\.pause\(\)/);
  assert.match(story,/if \(animation\.playState === 'paused'\) animation\.play\(\)/);
  assert.match(css,/\.cursor-trails-canvas\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.cursor-trails-canvas/);
});
