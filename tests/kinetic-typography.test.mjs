import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext, Script} from 'node:vm';

const source=await readFile(new URL('../public/kinetic-typography.js',import.meta.url),'utf8');
const story=await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');

function browser({width=1200,reduced=false,canvasAvailable=true}={}) {
  const drawn=[],ranges=[],styles=[];
  const ctx={
    clearRect(){},setTransform(){},save(){},restore(){},translate(){},
    rotate(){},scale(){},fillText(char,x,y){drawn.push({char,x,y})}
  };
  const canvas={style:{},width:0,height:0,remove(){this.removed=true},
    setAttribute(key,value){this[key]=value},
    getContext(type){assert.equal(type,'2d');return canvasAvailable?ctx:null}};
  const layer={children:[],insertBefore(node){this.children.unshift(node)}};
  function classList() {
    const states=new Set();
    return {add(v){states.add(v)},remove(v){states.delete(v)},
      contains(v){return states.has(v)}};
  }
  function text(content,color='#f0ece5',baseX=140,baseY=170) {
    const node={nodeType:3,textContent:content,parentElement:null,baseX,baseY,
      childNodes:[]};
    const parent={nodeType:1,color,childNodes:[node],
      matches(){return false}};
    node.parentElement=parent;
    return parent;
  }
  const first=text('BUILD', '#f0ece5',120,125);
  const second=text('REAL.', 'rgb(239, 40, 65)',120,195);
  const heading={nodeType:1,isConnected:true,
    classList:classList(),childNodes:[first,second],
    matches(selector){return selector==='h2,h3'},
    querySelector(){return null},
    getBoundingClientRect(){return {left:110,top:110,width:530,height:170}},
    get textContent(){return 'BUILDREAL.'}};
  const container={nodeType:1,querySelector(sel){return sel==='h2'?heading:null},
    matches(){return false}};
  const doc={
    createElement(name){assert.equal(name,'canvas');return canvas},
    createRange() {
      let node,begin,end;
      const range={
        setStart(n,i){node=n;begin=i},
        setEnd(n,i){end=i},
        getBoundingClientRect(){
          assert.ok(begin>=0&&end<=node.textContent.length);
          ranges.push([node.textContent,begin,end]);
          return {left:node.baseX+begin*23,
            top:node.baseY,width:(end-begin)*23,height:55};
        },
        detach(){}
      };
      return range;
    }
  };
  const win={};
  const env={
    window:win,document:doc,
    matchMedia:()=>({matches:reduced}),
    navigator:{deviceMemory:8,hardwareConcurrency:8},
    innerWidth:width,innerHeight:800,devicePixelRatio:2,
    performance:{now:()=>200},
    getComputedStyle:(element)=>({color:element.color||'#f0ece5',
      font:'700 56px Display',fontSize:'56px',
      fontStyle:'normal',fontWeight:'700',fontFamily:'Display'})
  };
  runInNewContext(source,env);
  return {win,doc,heading,container,canvas,ctx,layer,drawn,ranges,env};
}

test('script is valid, loads before story controller, and uses no secondary animation clock',()=>{
  assert.doesNotThrow(()=>new Script(source));
  assert.ok(html.indexOf('kinetic-typography.js')>html.indexOf('swarm-formation.js'));
  assert.ok(html.indexOf('kinetic-typography.js')<html.indexOf('build-story.js'));
  assert.doesNotMatch(source,/requestAnimationFrame\s*\(/);
  assert.match(story,/createPortfolioKineticTypography/);
  assert.match(story,/beginKinetic\(el, agents, performance\.now\(\)\)/);
  assert.match(story,/drawKinetic\(now\)/);
  assert.match(story,/kinetic\?\.shiftTime\(delta\)/);
  assert.match(css,/\.kinetic-source-hidden/);
  assert.match(css,/\.kinetic-type-canvas[\s\S]*?pointer-events:none/);
});

test('individual letters are measured with DOM Ranges and drawn on canvas',()=>{
  const b=browser();
  const engine=b.win.createPortfolioKineticTypography({layer:b.layer});
  assert.ok(engine);
  assert.equal(b.layer.children[0],b.canvas);
  const original=b.heading.textContent;
  assert.equal(engine.start(b.container,
    [{x:220,y:180},{x:420,y:120}],0),true);
  assert.equal(engine.activeCount,1);
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),true);
  assert.deepEqual(b.ranges[0],['BUILD',0,1]);
  assert.deepEqual(b.ranges[4],['BUILD',4,5]);
  assert.equal(b.ranges.length,10);
  engine.draw(180);
  engine.draw(500);
  assert.ok(b.drawn.length>10);
  assert.ok(b.drawn.some(g=>g.char==='B'));
  assert.ok(b.drawn.some(g=>g.char==='R'));
  assert.equal(b.heading.textContent,original,'real heading stays untouched');
  engine.draw(1600);
  assert.equal(engine.activeCount,0);
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),false);
});

test('replay/interrupt clears the effect and leaves real text visible',()=>{
  const b=browser();
  const engine=b.win.createPortfolioKineticTypography({layer:b.layer});
  assert.equal(engine.start(b.heading,[{x:400,y:220}],100),true);
  engine.draw(200);
  engine.shiftTime(500);
  assert.equal(engine.activeCount,1);
  engine.clear();
  assert.equal(engine.activeCount,0);
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),false);
  assert.equal(engine.start(b.heading,[{x:150,y:160}],1000),true);
  engine.destroy();
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),false);
  assert.equal(b.canvas.removed,true);
});

test('fallbacks never hide a heading',()=>{
  const reduced=browser({reduced:true});
  assert.equal(reduced.win.createPortfolioKineticTypography({layer:reduced.layer}),null);
  const unsupported=browser({canvasAvailable:false});
  assert.equal(unsupported.win.createPortfolioKineticTypography({layer:unsupported.layer}),null);
  const b=browser({width:390});
  const engine=b.win.createPortfolioKineticTypography({layer:b.layer});
  const budget=b.win.portfolioKineticBudget;
  assert.equal(budget(390,4,4).fps,30);
  assert.equal(budget(1200,8,8).fps,60);
  assert.equal(engine.start({matches(){return false},querySelector(){return null}},[],0),false);
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),false);
});

test('long or unconnected headings fall back to ordinary DOM reveal',()=>{
  const b=browser({width:390});
  const engine=b.win.createPortfolioKineticTypography({layer:b.layer});
  const textNode=b.heading.childNodes[0].childNodes[0];
  textNode.textContent='A'.repeat(100);
  b.heading.childNodes[1].childNodes[0].textContent='';
  assert.equal(engine.start(b.heading,[],0),false);
  assert.equal(b.heading.classList.contains('kinetic-source-hidden'),false);
  textNode.textContent='BUILD';
  b.heading.isConnected=false;
  assert.equal(engine.start(b.heading,[],0),false);
});
