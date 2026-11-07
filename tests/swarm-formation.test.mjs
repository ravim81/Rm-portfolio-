import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';

const source=await readFile(new URL('../public/swarm-formation.js',import.meta.url),'utf8');
const story=await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const styles=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
const win={};
runInNewContext(source,{window:win,Math,Number,Set});
const G=win.portfolioSwarmGeometry;
const vp={width:1280,height:800,memory:8,cores:8};
const createAgents=(x=640,y=300)=>Array.from({length:23},(_,i)=>({
  x:x+(i%8)*.05,y:y+(i%7)*.05
}));
const rect=(x,y,w,h)=>({left:x,top:y,width:w,height:h});
function minimumDistance(points) {
  let min=Infinity;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)
    min=Math.min(min,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));
  return min;
}
function inside(p,v) {
  return Number.isFinite(p.x)&&Number.isFinite(p.y)&&
    p.x>=11&&p.x<=v.width-20&&p.y>=31&&p.y<=v.height-68;
}

test('swarm engine is stand-alone pure geometry and loads before the story controller',()=>{
  assert.doesNotThrow(()=>new Script(source));
  assert.doesNotMatch(source,/requestAnimationFrame\s*\(/);
  assert.equal(typeof win.createPortfolioSwarm,'function');
  assert.match(html,/<script src="swarm-formation\.js" defer><\/script>/);
  assert.ok(html.indexOf('cursor-trails.js')<html.indexOf('swarm-formation.js'));
  assert.ok(html.indexOf('swarm-formation.js')<html.indexOf('build-story.js'));
  assert.match(story,/swarm\.planStage/);
  assert.match(story,/swarm\.workFrame/);
  assert.match(story,/swarm\.introFrame/);
  assert.match(story,/agents\.forEach\(a => a\.el\.style\.opacity = '0'\)/);
  assert.match(story,/!swarm/);
});

test('content priorities allocate all 23 agents without losing any visible block',()=>{
  const items=[{kind:'project'},{kind:'image'},{kind:'comparison'},
    {kind:'rows'},{kind:'text'},{kind:'form'},{kind:'text'}];
  const allocations=G.allocate(items,23);
  assert.equal(allocations.reduce((a,b)=>a+b,0),23);
  assert.equal(allocations.length,items.length);
  assert.ok(allocations.every(n=>n>=1));
  assert.ok(allocations[0]>allocations[3]);
  assert.deepEqual(Array.from(G.allocate([{kind:'project'}],23)),[23]);
  assert.deepEqual(Array.from(G.allocate([],23)),[]);
});

test('project arrows follow the artwork perimeter and stay away from copy',()=>{
  const item={kind:'project',rect:rect(120,180,560,420),
    artRect:rect(120,180,560,300)};
  const points=Array.from({length:12},(_,i)=>G.anchor(item,i,12,.2,vp));
  const count=points.filter(p=>p.y>=480&&p.y<600);
  assert.equal(count.length,0,'project arrows avoid the lower project-info panel');
  assert.ok(points.every(p=>inside(p,vp)));
});

test('headlines, images, forms, and comparison views have distinct formations',()=>{
  const box=rect(100,100,510,270);
  const kinds=['text','image','rows','form','comparison','project'];
  const formations=kinds.map(kind=>{
    const points=Array.from({length:8},(_,i)=>
      G.anchor({kind,rect:box},i,8,.33,vp));
    assert.ok(points.every(p=>inside(p,vp)));
    return points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join('|');
  });
  assert.equal(new Set(formations).size,kinds.length);
});

test('all 23 agents have stable, unique assignments and purposeful roles',()=>{
  const items=[
    {kind:'project',rect:rect(80,150,520,420),artRect:rect(80,150,520,300),
      avoidRects:[rect(80,450,520,120)]},
    {kind:'text',rect:rect(700,170,400,160)},
    {kind:'comparison',rect:rect(690,400,430,280)}
  ];
  const a=createAgents();
  const plan=G.planStage(items,a,2,vp);
  assert.equal(plan.length,23);
  assert.equal(new Set(plan.map(p=>p.index)).size,23);
  assert.equal(new Set(plan.map(p=>p.a)).size,23);
  assert.equal(plan.filter(p=>p.targetIndex===0).length,G.allocate(items,23)[0]);
  assert.ok(plan.every(p=>typeof p.task==='string'&&p.task.length>2));
  assert.ok(plan.some(p=>p.task==='illustrate'));
  assert.ok(plan.some(p=>p.task==='baseline'));
  assert.ok(plan.some(p=>p.task==='transition'));
  assert.ok(plan.every(p=>Number.isFinite(p.bendX)&&Number.isFinite(p.bendY)));
  const planAgain=G.planStage(items,createAgents(),2,vp);
  assert.deepEqual(JSON.parse(JSON.stringify(plan.map(p=>[p.index,p.targetIndex,p.slot]))),
    JSON.parse(JSON.stringify(planAgain.map(p=>[p.index,p.targetIndex,p.slot]))));
});

test('curved work paths stay finite, bounded and out of protected project text',()=>{
  const items=[
    {kind:'project',rect:rect(55,160,510,440),
      artRect:rect(55,160,510,300),avoidRects:[rect(55,460,510,140)]},
    {kind:'text',rect:rect(680,185,420,155)}
  ];
  const agents=createAgents();
  const plan=G.planStage(items,agents,3,vp);
  const timings={approach:560,revealStart:880,reveal:650,duration:2400};
  for(const t of [0,120,260,650,950,1300,1900,2320]){
    const positions=G.workFrame(plan,items,t,timings,vp);
    assert.equal(positions.length,23);
    assert.ok(positions.every(p=>inside(p,vp)), 'all agents stay on-screen at t='+t);
    for(let i=0;i<plan.length;i++){
      if(plan[i].targetIndex!==0)continue;
      const p=positions[i], copy=items[0].avoidRects[0];
      assert.ok(!(p.x>copy.left-10&&p.x<copy.left+copy.width+10&&
        p.y>copy.top-10&&p.y<copy.top+copy.height+10),
      'project text region stays unoccluded at t='+t);
    }
  }
});

test('coincident cursors spread without collisions on narrow mobile screens',()=>{
  for(const width of [320,390,640,768,1440]){
    const viewport={width,height:Math.max(600,width*.7),memory:4,cores:4};
    const positions=G.separate(createAgents(width*.48,230),viewport,
      G.budget(width,4,4));
    assert.ok(positions.every(p=>inside(p,viewport)));
    assert.ok(minimumDistance(positions)>=G.budget(width,4,4).minGap-.6,
      'agents should not overlap at '+width+'px');
  }
});

test('intro preserves 8/8/7 builder groups, camera keeps stream formations',()=>{
  const agents=createAgents();
  const intro=G.introFrame(agents,1220,vp);
  assert.equal(intro.length,23);
  assert.deepEqual(Array.from([0,1,2].map(n=>intro.filter(p=>p.formation===n).length)),[8,8,7]);
  assert.ok(intro.every(p=>inside(p,vp)));
  const camera=G.cameraFrame(agents,agents,.54,vp);
  assert.equal(camera.length,23);
  assert.ok(camera.every(p=>inside(p,vp)));
  assert.ok(minimumDistance(camera)>12);
});

test('performance tiers retain all builders but use fewer collision iterations',()=>{
  assert.equal(G.budget(390,4,4).minGap,13);
  assert.equal(G.budget(390,4,4).passes,2);
  assert.equal(G.budget(1200,8,8).minGap,20);
  assert.equal(G.budget(1200,8,8).guideLimit,7);
});

test('camera, replay, reduced-motion, keyboard and physical scrolling are preserved',()=>{
  assert.match(story,/if \(enabled\) exploreFreely\(\)/);
  assert.match(story,/if \(reduceMotion\) return/);
  assert.match(story,/setAutoplay\(false\)/);
  assert.match(story,/cursorTrails\?\.clear\(\)/);
  assert.match(story,/introStart = performance\.now\(\)/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
