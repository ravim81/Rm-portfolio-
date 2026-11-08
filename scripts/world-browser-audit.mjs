import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';
const root=resolve(fileURLToPath(new URL('../public/world/',import.meta.url)));
const out=resolve(fileURLToPath(new URL('../test-results/world-browser-audit/',import.meta.url)));
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(p==='/'?'/index.html':p));if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403).end();return;}const data=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404).end('Not found');}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=process.env.WORLD_PREVIEW_URL || 'http://127.0.0.1:'+server.address().port+'/';
const devices=[['small-phone',320,640,true],['android-portrait',390,844,true],['phone-landscape',844,390,true],['tablet-portrait',820,1180,true],['laptop',1280,800,false],['desktop',1920,1080,false]];
const browsers=[['Chromium',chromium],['Firefox',firefox],['WebKit',webkit]];
const report={url,startedAt:new Date().toISOString(),passed:0,failed:0,results:[]};
try{
 for(const [browserName,engine] of browsers){let browser;try{browser=await engine.launch({headless:true});}catch(error){report.failed++;report.results.push({browser:browserName,error:'Browser launch failed: '+error.message});continue;}
  for(const [deviceName,width,height,touch] of devices){let context,page;const errors=[],badResponses=[];try{
   context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch,isMobile:touch&&browserName!=='Firefox',reducedMotion:'no-preference'});page=await context.newPage();page.on('pageerror',e=>errors.push(String(e.message||e)));page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)badResponses.push(r.status()+' '+r.url())});
   await page.goto(url,{waitUntil:'load',timeout:30000});await page.waitForFunction(()=>window.__WORLD_READY__===true,{timeout:15000});await page.waitForTimeout(250);
   const initial=await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvas:(()=>{const e=document.querySelector('#world-canvas'),r=e.getBoundingClientRect();return{width:r.width,height:r.height,display:getComputedStyle(e).display}})(),fallback:!document.querySelector('#world-fallback').hidden,diagnostics:window.__WORLD_DIAGNOSTICS__||null,stage:document.querySelector('#world-stage').getBoundingClientRect().height,controls:[...document.querySelectorAll('#journey-toggle,#journey-replay')].every(e=>!!e)}));
   if(!initial.title.includes('Ravi M'))throw Error('Document title missing Ravi M');if(initial.scrollWidth>width+1)throw Error('Horizontal overflow '+initial.scrollWidth+' > '+width);if(initial.stage<Math.min(height,520))throw Error('Stage height collapsed');if(!initial.controls)throw Error('Journey controls missing');if(!initial.fallback&&(!initial.canvas.width||!initial.canvas.height))throw Error('Canvas has no visible dimensions');
   if(!initial.fallback){await page.locator('#journey-toggle').click();await page.waitForTimeout(100);await page.locator('#journey-toggle').click();await page.locator('#journey-replay').click();}
   await page.screenshot({path:join(out,browserName.toLowerCase()+'-'+deviceName+'.png'),fullPage:false});
   if(errors.length)throw Error('Page errors: '+errors.join(' | '));if(badResponses.length)throw Error('Failed local assets: '+badResponses.join(' | '));
   report.passed++;report.results.push({browser:browserName,device:deviceName,status:'passed',fallback:initial.fallback,diagnostics:initial.diagnostics,canvas:initial.canvas});
  }catch(error){report.failed++;report.results.push({browser:browserName,device:deviceName,status:'failed',error:error.message});if(page)await page.screenshot({path:join(out,browserName.toLowerCase()+'-'+deviceName+'-failure.png'),fullPage:false}).catch(()=>{});}finally{if(context)await context.close();}}
  await browser.close();
 }
}finally{await new Promise(resolveClose=>server.close(resolveClose));report.finishedAt=new Date().toISOString();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
if(report.failed)process.exitCode=1;
