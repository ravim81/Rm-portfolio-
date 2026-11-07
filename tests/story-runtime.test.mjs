import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const story = await readFile(new URL('../public/build-story.js',import.meta.url),'utf8');
const swarm = await readFile(new URL('../public/swarm-formation.js',import.meta.url),'utf8');

function createRuntime({width=1200,reduced=false}={}) {
  const events={},controls={},queue=[];
  for(const key of ['.build-caption','.build-pause','.build-replay','.build-manual']) {
    controls[key]={textContent:'',disabled:false,style:{},setAttribute() {},
      addEventListener(type,fn){events[key+':'+type]=fn;}};
  }
  function element(type,rect={},hero=false) {
    const classes=new Set();
    const item={
      style:{opacity:'1',transform:'',width:'',height:'',setProperty(){}},
      dataset:{},hidden:false,innerHTML:'',
      classList:{
        add(...v){v.forEach(x=>classes.add(x));},
        remove(...v){v.forEach(x=>classes.delete(x));},
        contains(v){return classes.has(v);}
      },
      parentElement:{closest:()=>null},
      closest(sel){return sel==='.hero'&&hero?{}:null;},
      querySelector(sel) {
        if(sel in controls)return controls[sel];
        if(type==='project') {
          if(sel==='.project-art')return element('art',{left:60,top:260,width:430,height:240});
          if(sel==='.project-info')return element('info',{left:60,top:510,width:430,height:90});
          if(sel==='.art-title')return element('art-title',{left:80,top:420,width:300,height:50});
          if(sel==='h3')return {textContent:'ChemLabs'};
        }
        return null;
      },
      getBoundingClientRect(){
        const r={left:80,top:100,width:360,height:150,...rect};
        return {...r,right:r.left+r.width,bottom:r.top+r.height};
      },
      matches(selector){
        return type==='project'&&selector.includes('.project') ||
          type==='portrait'&&selector.includes('.portrait') ||
          type==='h1'&&selector.includes('h1');
      },
      setAttribute() {},append() {},addEventListener() {},
      animate() {
        return {playState:'running',onfinish:null,
          pause(){this.playState='paused';},
          play(){this.playState='running';},
          finish(){this.playState='finished';this.onfinish?.();},
          cancel(){this.playState='idle';}};
      }
    };
    return item;
  }
  const h1=element('h1',{left:100,top:170,width:480,height:170},true);
  const portrait=element('portrait',{left:640,top:90,width:440,height:550},true);
  const project=element('project',{left:60,top:270,width:450,height:350});
  const targets=[h1,portrait,project];
  const document={
    hidden:false,
    body:{classList:{add(){},remove(){}},append(){}},
    documentElement:{scrollHeight:5500,classList:{add(){},remove(){}}},
    createElement:type=>element(type),
    querySelector:sel=>sel==='.hero h1'?h1:null,
    querySelectorAll:()=>targets,
    addEventListener:(type,cb)=>{events['document:'+type]=cb;}
  };
  const window={};
  runInNewContext(swarm,{window,Math,Number,Set});
  let time=0;
  const env={
    window,document,
    performance:{now:()=>time},
    navigator:{deviceMemory:8,hardwareConcurrency:8},
    innerWidth:width,innerHeight:800,
    scrollY:0,location:{hash:''},
    matchMedia:()=>({matches:reduced}),
    Path2D:undefined,
    addEventListener:(type,cb)=>{events[type]=cb;},
    scrollTo(){},
    requestAnimationFrame(cb){queue.push(cb);return queue.length;},
    cancelAnimationFrame(){}
  };
  runInNewContext(story,env);
  function advance(from,to,step=50) {
    for(time=from;time<=to;time+=step) {
      const cb=queue.shift();
      if(cb)cb(time);
    }
  }
  return {advance,events,controls,targets,queue};
}

test('the real entrypoint runs beyond the FIRST frame and reveals the hero',()=>{
  const app=createRuntime();
  app.advance(0,2500);
  assert.ok(app.targets[0].classList.contains('build-complete'));
  assert.ok(app.targets[1].classList.contains('build-complete'));
  assert.notEqual(app.controls['.build-caption'].textContent,'TOUR PAUSED');
});

test('the actual story continues into a content stage on desktop and mobile',()=>{
  for(const width of [390,1200]){
    const app=createRuntime({width});
    app.advance(0,6100);
    assert.ok(app.targets[2].classList.contains('build-complete'),
      'project should be revealed, not stuck at the first frame: '+width);
    assert.ok(app.queue.length>0,'automatic tour should keep moving');
  }
});

test('replay and manual exploration resolve pending content',()=>{
  const app=createRuntime();
  app.advance(0,400);
  app.events['.build-replay:click']();
  app.advance(450,3700);
  assert.ok(app.targets[0].classList.contains('build-complete'));
  app.events['.build-manual:click']();
  assert.ok(app.targets.every(x=>x.classList.contains('build-complete')));
});

test('reduced-motion visitors always see the complete content',()=>{
  const app=createRuntime({reduced:true});
  assert.ok(app.targets.every(x=>x.classList.contains('build-complete')));
  assert.equal(app.controls['.build-replay'].disabled,true);
});
