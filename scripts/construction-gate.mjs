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
 let browser,context;
 const result={name:spec.name,scenes:[],errors:[]};
 try{
  browser=await spec.engine.launch({headless:true,timeout:45000});
  context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
    hasTouch:spec.touch,isMobile:spec.touch,reducedMotion:'no-preference'});
  const page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(String(e)));
  await page.goto(url,{waitUntil:'load',timeout:45000});
  for(const scene of scenes){
   // The scene must enter a real pre-reveal construction phase with its
   // assigned target AND an actual visual stroke in progress.
   await page.waitForFunction(id=>{
    const b=document.querySelector('.build-blueprint');
    const value=Number(b?.dataset.progress);
    return b?.dataset.target===id && b.dataset.phase==='FRAME' &&
      value>.22 && value<.90 && Number(getComputedStyle(b).opacity)>.30;
   },scene.id,{timeout:95000,polling:40});
   const before=await page.evaluate(selector=>{
    const el=document.querySelector(selector);
    const art=el.querySelector('.project-art').getBoundingClientRect();
    const frame=document.querySelector('.build-blueprint');
    const rect=frame.getBoundingClientRect();
    const percentage=Number(frame.dataset.progress);
    const endpoint={x:rect.left+rect.width*percentage,y:rect.bottom};
    const cursors=[...document.querySelectorAll('.build-agent')]
      .filter(a=>Number(getComputedStyle(a).opacity)>.18)
      .map(a=>{const r=a.getBoundingClientRect();return {x:r.left,y:r.top,opacity:Number(getComputedStyle(a).opacity)}});
    const leadDistance=Math.min(Infinity,...cursors.map(c=>Math.hypot(c.x-endpoint.x,c.y-endpoint.y)));
    return {
      target:frame.dataset.target,phase:frame.dataset.phase,progress:percentage,
      pending:el.classList.contains('build-pending'),
      opacity:Number(getComputedStyle(el).opacity),
      art:{left:art.left,right:art.right,top:art.top,bottom:art.bottom},
      frame:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},
      leadDistance,activeCursors:cursors.length,
      otherProjects:[...document.querySelectorAll('.project')].filter(p=>p!==el && p.classList.contains('build-staging')).length
    };
   },scene.selector);
   assert(before.pending && before.opacity<.02,scene.id+': real card appeared before construction');
   assert(before.frame.top<spec.height*.85 && before.frame.bottom>spec.height*.12,
     scene.id+': construction offscreen '+JSON.stringify(before));
   assert(Math.abs(before.art.left-before.frame.left)<22 &&
      Math.abs(before.art.top-before.frame.top)<22,
     scene.id+': scaffold not tied to actual project art '+JSON.stringify(before));
   assert(before.leadDistance<32,scene.id+': no cursor attached to drawing stroke '+JSON.stringify(before));
   assert(before.activeCursors>=3 &&
      before.activeCursors<=(spec.width<=640?6:10),
     scene.id+': wrong active crew size '+before.activeCursors);
   assert(before.otherProjects===0,scene.id+': unrelated project shows staging');
   // Director 3.0 must visibly construct different geometry for each project.
   // Cursor-to-blueprint proximity alone is NOT a valid construction illusion.
   await page.waitForFunction(id=>{
     const draft=document.querySelector('.director-draft');
     return draft?.dataset.target===id && draft.dataset.state==='construct' &&
       Number(draft.dataset.progress)>.55 && Number(draft.dataset.progress)<.96 &&
       Number(getComputedStyle(draft).opacity)>.25;
   },scene.id,{timeout:3500,polling:25});
   const taskEvidence=await page.evaluate(()=>{
     const draft=document.querySelector('.director-draft');
     const rect=draft.getBoundingClientRect();
     const paths=[...draft.querySelectorAll('path')];
     const progressed=paths.filter(p=>Number(p.style.strokeDashoffset)<95);
     const agents=[...document.querySelectorAll('.build-agent')]
       .filter(a=>Number(getComputedStyle(a).opacity)>.18);
     const connected=paths.slice(1).reduce((count,p)=>{
       const length=p.getTotalLength();
       if(!length || Number(p.style.strokeDashoffset)>=95)return count;
       const fraction=1-Number(p.style.strokeDashoffset)/100;
       const tip=p.getPointAtLength(length*fraction);
       const x=rect.left+rect.width*tip.x, y=rect.top+rect.height*tip.y;
       const near=agents.some(a=>{
         const r=a.getBoundingClientRect();
         return Math.hypot(r.left-x,r.top-y)<32;
       });
       return count+(near?1:0);
     },0);
     return {target:draft.dataset.target,state:draft.dataset.state,
       progress:Number(draft.dataset.progress),tasks:Number(draft.dataset.tasks),
       paths:paths.length,progressed:progressed.length,connected,
       visible:Number(getComputedStyle(draft).opacity)};
   });
   assert(taskEvidence.paths===6 && taskEvidence.progressed>=3,
     scene.id+': project-specific drawing not constructed '+JSON.stringify(taskEvidence));
   assert(taskEvidence.connected>=2,
     scene.id+': task cursors did not follow distinct drawing paths '+JSON.stringify(taskEvidence));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-building.png'),animations:'allow'});
   await page.waitForFunction(selector=>document.querySelector(selector)?.classList.contains('build-complete'),
     scene.selector,{timeout:10000,polling:40});
   await page.waitForTimeout(300);
   const after=await page.evaluate(selector=>{
    const el=document.querySelector(selector),r=el.getBoundingClientRect();
    return {complete:el.classList.contains('build-complete'),
      opacity:Number(getComputedStyle(el).opacity),
      text:el.querySelector('.project-info h3')?.textContent,
      top:r.top,bottom:r.bottom};
   },scene.selector);
   assert(after.complete && after.opacity>.8 && !!after.text,
     scene.id+': finished card did not become readable '+JSON.stringify(after));
   await page.screenshot({path:join(out,spec.name+'-'+scene.id+'-revealed.png'),animations:'allow'});
   result.scenes.push({id:scene.id,passed:true,before,taskEvidence,after});
   console.log('CONSTRUCTION_SCENE',spec.name,scene.id,JSON.stringify({before,after}));
  }
  assert(result.errors.length===0,'page errors '+result.errors.join(' | '));
  result.passed=true;
 }catch(e){
  result.passed=false;result.error=String(e);
  report.failures.push(spec.name+': '+String(e));
 }finally{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});}
 report.scenarios.push(result);
}
await writeFile(join(out,'report-'+(process.env.CONSTRUCTION_SCENARIO||'all')+'.json'),
  JSON.stringify(report,null,2));
server.close();
console.log('CONSTRUCTION_GATE_SUMMARY',JSON.stringify({url,results:report.scenarios.map(x=>({name:x.name,passed:x.passed,scenes:x.scenes.length,error:x.error})),failures:report.failures}));
if(report.failures.length)process.exitCode=1;
