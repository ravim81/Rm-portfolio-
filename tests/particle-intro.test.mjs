import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext, Script} from 'node:vm';

const source=await readFile(new URL('../public/particle-intro.js',import.meta.url),'utf8');
const story=await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const styles=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

function mockContext(canvas) {
  return {
    font:'', fillStyle:'',globalCompositeOperation:'source-over',
    measureText: text => ({width:text.length * 24}),
    fillText() {}, clearRect() {}, fillRect() {}, setTransform() {},
    getImageData() {
      const bytes=new Uint8ClampedArray(canvas.width*canvas.height*4);
      for(let y=Math.floor(canvas.height*.2);y<canvas.height*.8;y++) {
        for(let x=5;x<canvas.width-5;x++){
          const p=(y*canvas.width+x)*4;
          bytes[p]=240;bytes[p+1]=220;bytes[p+2]=220;bytes[p+3]=255;
        }
      }
      return {data:bytes};
    }
  };
}
function mockBrowser({reduced=false, width=960}={}) {
  const canvases=[];
  const doc={
    createElement(type) {
      assert.equal(type,'canvas');
      const canvas={
        width:300,height:150,style:{},setAttribute() {},remove() {this.removed=true},
        getContext() {return mockContext(this);}
      };
      canvases.push(canvas);
      return canvas;
    }
  };
  const layer={children:[],insertBefore(node){this.children.unshift(node)}};
  const heading={getBoundingClientRect:()=>({left:100,top:180,width:530,height:180})};
  const window={};
  runInNewContext(source,{window,document:doc,matchMedia:()=>({matches:reduced}),
    performance:{now:()=>0},innerWidth:width,innerHeight:760,devicePixelRatio:1,
    navigator:{deviceMemory:8,hardwareConcurrency:8},Math,
    Uint8ClampedArray,Number,Array});
  return {window,layer,heading,canvases};
}

test('particle engine parses, is connected to the hero, and renders without a second animation loop',()=>{
  assert.doesNotThrow(()=>new Script(source));
  assert.match(index,/src="particle-intro\.js" defer/);
  assert.ok(index.indexOf('particle-intro.js')<index.indexOf('build-story.js'));
  assert.match(story,/createPortfolioParticleIntro/);
  assert.match(story,/particleIntro\.draw\(now, agents\)/);
  assert.match(story,/handoffHero\(true\)/);
  assert.doesNotMatch(source,/requestAnimationFrame\(/);
});

test('renders a text particle mask and supports repeated starts, skipping, and cleanup',()=>{
  const {window,layer,heading,canvases}=mockBrowser();
  const engine=window.createPortfolioParticleIntro({layer,heroHeading:heading});
  assert.ok(engine);
  assert.equal(canvases.length,1);
  assert.equal(engine.begin(0),true);
  const cursors=Array.from({length:23},(_,i)=>({x:150+i*25,y:190+i*8}));
  assert.doesNotThrow(()=>engine.draw(800,cursors));
  assert.doesNotThrow(()=>engine.draw(2480,cursors));
  assert.equal(engine.begin(3000),true,'replay rebuilds a fresh particle map');
  engine.shiftTime(180);
  assert.doesNotThrow(()=>engine.draw(4000,cursors));
  engine.end();
  assert.equal(canvases[0].style.display,'none');
  engine.destroy();
  assert.equal(canvases[0].removed,true);
});

test('quality budget scales for viewport and device; reduced motion skips canvas',()=>{
  const {window,layer,heading,canvases}=mockBrowser({reduced:true});
  assert.equal(window.createPortfolioParticleIntro({layer,heroHeading:heading}),null);
  assert.equal(canvases.length,0);
  const {window:normal}=mockBrowser();
  const budget=normal.portfolioParticleQualityBudget;
  assert.equal(budget(390,2,4),360);
  assert.equal(budget(390,8,8),600);
  assert.equal(budget(1280,2,4),850);
  assert.equal(budget(1280,8,8),1650);
});

test('visitor interruption, pause, replay, and accessibility remain wired',()=>{
  assert.match(story,/if \(enabled\) exploreFreely\(\)/);
  assert.match(story,/particleIntro\?\.end\(\)/);
  assert.match(story,/particleIntro\?\.shiftTime\(paused\)/);
  assert.match(story,/introStart = performance\.now\(\)/);
  assert.match(story,/if \(reduceMotion\) return/);
  assert.match(styles,/\.particle-intro-canvas\s*\{[^}]*pointer-events:none/s);
  assert.match(styles,/@media \(prefers-reduced-motion:reduce\)\s*\{\s*\.particle-intro-canvas/);
});
