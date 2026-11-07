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
  for(const scene of scenes){
   // An ephemeral construction-frame capture is useful for human review,
   // but engine timing MUST be validated from samples collected on each RAF.
   let captured=false;
   try{
     await page.waitForFunction(id=>{
       const draft=document.querySelector('.director-draft');
       return draft?.dataset.target===id &&
         draft.dataset.state==='construct' &&
         Number(draft.dataset.progress)>.12 &&
         Number(draft.dataset.progress)<.96;
     },scene.id,{timeout:17000,polling:20});
     await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-building.png'),animations:'allow'});
     captured=true;
   }catch{
     // WebKit may advance an entire short scene between remote test polls.
     // Persisted real-frame evidence below is the release authority.
   }
   await page.waitForFunction(selector=>
     document.querySelector(selector)?.classList.contains('build-complete'),
     scene.selector,{timeout:50000,polling:50});
   await page.waitForTimeout(310);
   const evidence=await page.evaluate(({id,selector})=>{
     const card=document.querySelector(selector);
     const frame=card.getBoundingClientRect();
     const trace=(window.__portfolioSceneEvidence||[]).filter(x=>x.id===id);
     const during=trace.filter(x=>x.progress>.48 && x.progress<.91 && x.pending);
     return {
       id,samples:trace.length,
       early:trace.some(x=>x.progress<.30 && x.pending),
       framed:during.some(x=>x.blueprintTarget===id && x.phase==='FRAME'),
       drawing:during.some(x=>x.svgOpacity>.40 && x.strokes>=3 && x.pathCount===6),
       attached:during.some(x=>x.cursorAttachments>=2 && x.crew===6),
       progressRange:trace.length?[trace[0].progress,trace[trace.length-1].progress]:[],
       visible:Number(getComputedStyle(card).opacity),
       pending:card.classList.contains('build-pending'),
       name:card.querySelector('.project-info h3')?.textContent,
       inViewport:frame.bottom>innerHeight*.08 && frame.top<innerHeight*.92,
       simultaneousStaging:document.querySelectorAll('.build-staging').length
     };
   },{id:scene.id,selector:scene.selector});
   assert(evidence.samples>=6,scene.id+': insufficient real-frame evidence '+JSON.stringify(evidence));
   assert(evidence.early && evidence.framed,
     scene.id+': cursors did not establish a frame before revealing '+JSON.stringify(evidence));
   assert(evidence.drawing,
     scene.id+': multiple vector tasks did not become visible '+JSON.stringify(evidence));
   assert(evidence.attached,
     scene.id+': independent cursors were not attached to their own task geometry '+JSON.stringify(evidence));
   assert(!evidence.pending && evidence.visible>.8 && evidence.inViewport && !!evidence.name,
     scene.id+': native content not readable after build '+JSON.stringify(evidence));
   assert(evidence.simultaneousStaging===0,
     scene.id+': ghost-preview objects remain on the page');
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-revealed.png'),animations:'allow'});
   result.scenes.push({id:scene.id,passed:true,buildingScreenshot:captured,evidence});
   console.log('CONSTRUCTION_SCENE',spec.name,scene.id,
     JSON.stringify({buildingScreenshot:captured,evidence}));
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
