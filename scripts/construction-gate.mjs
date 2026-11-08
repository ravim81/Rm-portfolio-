/* Construction release gate: check real rendered timing/geometry, not just animation presence.
 * Run on both local source and published Worker. Results/screenshots are CI artifacts.
 */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const out=resolve(fileURLToPath(new URL('../test-results/construction-gate/',import.meta.url)));
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.otf':'font/otf','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  const bytes=await readFile(path);
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end('Missing');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=process.env.PORTFOLIO_URL || 'http://127.0.0.1:'+server.address().port+'/';
const scenarios=[
 {name:'ios',engine:webkit,width:390,height:844,touch:true},
 {name:'android',engine:chromium,width:390,height:844,touch:true},
 {name:'desktop',engine:chromium,width:1440,height:900,touch:false}
].filter(spec=>!process.env.CONSTRUCTION_SCENARIO ||
  spec.name===process.env.CONSTRUCTION_SCENARIO);
if(scenarios.length===0)throw Error('Unknown CONSTRUCTION_SCENARIO');
const scenes=[
 {id:'chem',selector:'.project[data-project="chem"]'},
 {id:'reframe',selector:'.project[data-project="reframe"]'},
 {id:'brand',selector:'.project[data-project="brand"]'},
 {id:'discovery',selector:'.project[data-project="discovery"]'}
];
const report={url,scenarios:[],failures:[]};
function assert(value,message){if(!value)throw Error(message);}
for(const spec of scenarios){
 let browser,context,page;
 const result={name:spec.name,scenes:[],errors:[]};
 try{
  browser=await spec.engine.launch({headless:true,timeout:45000});
  context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
    hasTouch:spec.touch,isMobile:spec.touch,reducedMotion:'no-preference'});
  page=await context.newPage();
  await page.addInitScript(()=>{window.__PORTFOLIO_AUDIT__=true;});
  page.on('pageerror',e=>result.errors.push(String(e)));
  await page.goto(url,{waitUntil:'load',timeout:45000});
  // Phase 1 gate: sample the REAL native hero animation at three controlled
  // times, before testing the four independent project scenes.
  const heroFrames=[];
  for(const [name,fraction] of [['arrival',.14],['building',.50],['finished',.94]]){
    const shot=await page.evaluate(fraction=>{
      const state=window.__portfolioAuditHero?.(fraction);
      if(!state)return {missing:true};
      const heading=document.querySelector('.hero h1');
      const rect=heading.getBoundingClientRect();
      const first=document.querySelector('.build-agent');
      const lead=first?.getBoundingClientRect();
      const cx=rect.left+rect.width*state.progress;
      const cy=rect.top+rect.height*.51;
      const particle=document.querySelector('.particle-intro-canvas');
      return {
        name:heading.textContent,
        count:document.querySelectorAll('.hero h1').length,
        state:state.state,
        progress:state.progress,mask:Number.parseFloat(state.mask),
        primed:document.documentElement.classList.contains('hero-build-primed'),
        active:state.crew,
        leadDistance:lead?Math.hypot(lead.left-cx,lead.top-cy):Infinity,
        noParticle:!particle || getComputedStyle(particle).display==='none',
        nativeVisible:!heading.classList.contains('build-pending') &&
          Number(getComputedStyle(heading).opacity)>.8
      };
    },fraction);
    assert(shot.count===1 && shot.nativeVisible && shot.noParticle,
      spec.name+': duplicated or hidden hero wordmark '+JSON.stringify(shot));
    assert(shot.active===(spec.width<=640?6:8) && shot.leadDistance<24,
      spec.name+': cursor is not constructing the real title '+JSON.stringify(shot));
    heroFrames.push({phase:name,...shot});
    await page.screenshot({path:join(out,spec.name+'-hero-'+name+'.png'),animations:'allow'});
  }
  assert(heroFrames[0].mask>75 && heroFrames[0].primed,
    spec.name+': title already visible before cursor arrival');
  assert(heroFrames[1].mask>8 && heroFrames[1].mask<85 &&
    heroFrames[1].progress>heroFrames[0].progress,
    spec.name+': no progressive one-pass native text reveal');
  assert(heroFrames[2].state==='complete' && heroFrames[2].mask===0 &&
    !heroFrames[2].primed,
    spec.name+': native title did not finish once');
  result.hero=heroFrames;
  console.log('HERO_INTRO_GATE',spec.name,JSON.stringify(heroFrames));
  for(const scene of scenes){
   // Seek production showWork() deterministically. Visual quality must not
   // depend on Chromium/WebKit CI runners hitting a narrow RAF interval.
   const inspect=async progress=>page.evaluate(({id,progress})=>{
     const seek=window.__portfolioAuditScene?.(id,progress);
     if(!seek)return {missing:true};
     const el=document.querySelector('.project[data-project="'+id+'"]');
     const art=el.querySelector('.project-art').getBoundingClientRect();
     const frame=document.querySelector('.build-blueprint').getBoundingClientRect();
     const draft=document.querySelector('.director-draft');
     const offsets=[...draft.querySelectorAll('path')]
       .map(p=>Number(p.getAttribute('stroke-dashoffset')));
     const cursors=[...document.querySelectorAll('.build-agent')]
       .filter(x=>Number(getComputedStyle(x).opacity)>.18);
     const samples=(window.__portfolioSceneEvidence||[]).filter(x=>x.id===id);
     const sample=samples[samples.length-1];
     return {
       id,progress,missing:false,
       target:draft.dataset.target,
       state:draft.dataset.state,
       pending:el.classList.contains('build-pending'),
       opacity:Number(getComputedStyle(el).opacity),
       svgOpacity:Number(getComputedStyle(draft).opacity),
       pathCount:offsets.length,
       stroked:offsets.filter(x=>Number.isFinite(x)&&x<95).length,
       cursorAttachments:sample?.cursorAttachments??0,
       activeCursors:cursors.length,
       frameDelta:{x:Math.abs(frame.left-art.left),y:Math.abs(frame.top-art.top)},
       viewport:{height:innerHeight,top:art.top,bottom:art.bottom},
       blueprintTarget:document.querySelector('.build-blueprint').dataset.target
     };
   },{id:scene.id,progress});
   const arrival=await inspect(.22);
   assert(!arrival.missing && arrival.pending && arrival.opacity<.03,
     scene.id+': content visible before drafting '+JSON.stringify(arrival));
   assert(arrival.target===scene.id && arrival.pathCount===6,
     scene.id+': missing project-specific geometry '+JSON.stringify(arrival));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-arrival.png'),animations:'allow'});

   const building=await inspect(.66);
   assert(building.pending && building.opacity<.03,
     scene.id+': finished content appeared before cursors '+JSON.stringify(building));
   assert(building.svgOpacity>.4 && building.stroked>=3,
     scene.id+': cursor actions did not draw visible geometry '+JSON.stringify(building));
   assert(building.cursorAttachments>=3 && building.activeCursors===6,
     scene.id+': cursors are not attached to their drawing tasks '+JSON.stringify(building));
   assert(building.frameDelta.x<24 && building.frameDelta.y<24 &&
      building.viewport.top<spec.height*.65 && building.viewport.bottom>spec.height*.15,
     scene.id+': crew works away from the real artwork '+JSON.stringify(building));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-building.png'),animations:'allow'});

   const polish=await inspect(.90);
   assert(polish.pending && polish.stroked>=5 &&
     polish.target===scene.id,scene.id+': unfinished project drawing '+JSON.stringify(polish));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-polish.png'),animations:'allow'});

   const completing=await inspect(1.08);
   assert(!completing.pending,scene.id+': finished scene remains pending');
   await page.waitForFunction(id=>{
     const card=document.querySelector('.project[data-project="'+id+'"]');
     return card?.classList.contains('build-complete') &&
       Number(getComputedStyle(card).opacity)>.82;
   },scene.id,{timeout:10000,polling:40});
   const after=await page.evaluate(id=>{
     const card=document.querySelector('.project[data-project="'+id+'"]');
     return {complete:card.classList.contains('build-complete'),
       opacity:Number(getComputedStyle(card).opacity),
       name:card.querySelector('.project-info h3')?.textContent,
       staged:document.querySelectorAll('.build-staging').length};
   },scene.id);
   assert(after.complete && after.opacity>.82 && !!after.name && after.staged===0,
     scene.id+': real HTML not readable after construction '+JSON.stringify(after));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-revealed.png'),animations:'allow'});
   const evidence={arrival,building,polish,after};
   result.scenes.push({id:scene.id,passed:true,evidence});
   console.log('CONSTRUCTION_SCENE',spec.name,scene.id,
      JSON.stringify({building,after}));
  }
  assert(result.errors.length===0,'page errors '+result.errors.join(' | '));
  result.passed=true;
 }catch(e){
  result.passed=false;result.error=String(e);
  if(page) {
    try {
      result.diagnostics=await page.evaluate(()=>({
        caption:document.querySelector('.build-caption')?.textContent,
        blueprint:{target:document.querySelector('.build-blueprint')?.dataset.target,
          phase:document.querySelector('.build-blueprint')?.dataset.phase,
          progress:document.querySelector('.build-blueprint')?.dataset.progress},
        draft:{target:document.querySelector('.director-draft')?.dataset.target,
          state:document.querySelector('.director-draft')?.dataset.state,
          progress:document.querySelector('.director-draft')?.dataset.progress},
        scrollY,hidden:document.hidden,
        pending:document.querySelectorAll('.build-pending').length,
        recovered:document.body.classList.contains('story-recovered')
      }));
    }catch(x){result.diagnosticsError=String(x);}
  }
  report.failures.push(spec.name+': '+String(e)+' '+JSON.stringify(result.diagnostics||result.errors));
 }finally{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});}
 report.scenarios.push(result);
}
await writeFile(join(out,'report-'+(process.env.CONSTRUCTION_SCENARIO||'all')+'.json'),
  JSON.stringify(report,null,2));
server.close();
console.log('CONSTRUCTION_GATE_SUMMARY',JSON.stringify({url,results:report.scenarios.map(x=>({name:x.name,passed:x.passed,scenes:x.scenes.length,error:x.error})),failures:report.failures}));
if(report.failures.length)process.exitCode=1;
