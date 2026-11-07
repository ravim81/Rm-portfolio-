/* Real-browser audit for the RM Portfolio.
 * Run: npm install --no-save playwright@1.56.1 && npx playwright install
 *      node scripts/browser-audit.mjs
 * Screenshots and summary: test-results/browser-audit/
 */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium,firefox,webkit} from 'playwright';

const root=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const out=resolve(fileURLToPath(new URL('../test-results/browser-audit/',import.meta.url)));
await mkdir(out,{recursive:true});
const axeSource=await readFile(fileURLToPath(new URL('../node_modules/axe-core/axe.min.js',import.meta.url)),'utf8');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.otf':'font/otf','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+(p==='/'?'/index.html':p));
    if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403).end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404).end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=process.env.PORTFOLIO_URL || 'http://127.0.0.1:'+server.address().port+'/';

const devices=[
  {name:'small-mobile',width:320,height:640,touch:true},
  {name:'android-mobile',width:390,height:844,touch:true},
  {name:'large-mobile',width:430,height:932,touch:true},
  {name:'foldable-mobile',width:540,height:720,touch:true},
  {name:'landscape-phone',width:844,height:390,touch:true},
  {name:'compact-tablet',width:700,height:1024,touch:true},
  {name:'tablet-portrait',width:820,height:1180,touch:true},
  {name:'tablet-landscape',width:1024,height:768,touch:true},
  {name:'phone-desktop-mode',width:980,height:600,touch:true,desktopMode:true},
  {name:'laptop',width:1280,height:800,touch:false},
  {name:'desktop',width:1440,height:900,touch:false},
  {name:'large-desktop',width:1920,height:1080,touch:false}
];
const browsers=[['Chromium',chromium],['Firefox',firefox],['WebKit',webkit]];
const report={startedAt:new Date().toISOString(),results:[],failures:[]};
const assert=(cond,message)=>{if(!cond)throw new Error(message)};
function record(browser,device,part,data) {
  const result={browser,device,part,...data};
  report.results.push(result);
  console.log(JSON.stringify(result));
}
function capture(page){
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  return errors;
}
async function contextFor(browser,label,device,reducedMotion='reduce'){
  const mobile=device.touch;
  return browser.newContext({
    viewport:{width:device.width,height:device.height},
    deviceScaleFactor:1,
    hasTouch:mobile,
    isMobile:mobile && !device.desktopMode && label!=='Firefox',
    reducedMotion,
    acceptDownloads:true,
    locale:'en-IN'
  });
}

async function layoutPass(browser,label,device) {
  const context=await contextFor(browser,label,device);
  const page=await context.newPage();
  const errors=capture(page);
  const requests=[];
  page.on('response',res=>{if(res.url().startsWith(url)&&res.status()>=400)requests.push(res.status()+' '+res.url())});
  try{
    await page.goto(url,{waitUntil:'load',timeout:25000});
    await page.waitForTimeout(130);
    const result=await page.evaluate(()=>{
      const vw=window.innerWidth,documentWidth=document.documentElement.scrollWidth;
      const box=selector=>{const e=document.querySelector(selector);if(!e)return null;
        const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
          scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,display:getComputedStyle(e).display};};
      return {vw,documentWidth,title:document.title,menu:box('.menu-toggle'),hero:box('.hero'),
        heading:box('.hero h1'),subtitle:box('.hero h2'),portrait:box('.portrait'),
        titleLines:(()=>{
          const e=document.querySelector('.hero h1');
          const lineHeight=parseFloat(getComputedStyle(e).lineHeight);
          return e.getBoundingClientRect().height/lineHeight;
        })(),
        work:box('.work'),contact:box('.contact'),image:{
          loaded:document.querySelector('.portrait img').complete,
          naturalWidth:document.querySelector('.portrait img').naturalWidth
        },reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,
        pending:document.querySelectorAll('.build-pending').length,
        hiddenTypes:document.querySelectorAll('.kinetic-source-hidden').length};
    });
    assert(!errors.length,'page errors: '+errors.join(' | '));
    assert(!requests.length,'HTTP errors: '+requests.join(' | '));
    assert(result.documentWidth<=result.vw+3,
      'horizontal overflow '+result.documentWidth+' > '+result.vw);
    assert(result.image.naturalWidth>0,'portrait image is broken');
    assert(result.pending===0,'reduced-motion page leaves hidden content');
    assert(result.hiddenTypes===0,'reduced-motion leaves hidden glyphs');
    assert(result.heading && result.heading.right<=result.vw+4,'hero title exceeds viewport');
    assert(result.heading.scrollWidth<=result.heading.clientWidth+4,'hero glyphs overflow the title box');
    assert(result.titleLines<=1.2,'hero wordmark unexpectedly wraps into multiple lines');
    assert(result.hero.scrollWidth<=result.vw+4,'hero decorative media overflows the viewport');
    assert(result.portrait.right<=result.vw+4,'portrait is cropped beyond the viewport');
    assert(result.subtitle && result.subtitle.right<=result.vw+4,'hero subtitle exceeds viewport');
    assert(result.contact?.height>0,'contact section is collapsed');

    // WCAG automated audit on representative phone, tablet and desktop widths.
    // Axe runs in the real browser engine rather than on parsed HTML alone.
    if(['android-mobile','tablet-portrait','desktop'].includes(device.name)) {
      await page.addScriptTag({content:axeSource});
      const axe = await page.evaluate(async ()=> {
        const results=await window.axe.run(document,{
          runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
        });
        return {violations:results.violations.map(v=>({
          id:v.id,impact:v.impact,description:v.help,
          nodes:v.nodes.slice(0,4).map(n=>n.target.join(' > '))
        })),incomplete:results.incomplete.length,passes:results.passes.length};
      });
      record(label,device.name,'accessibility',{pass:!axe.violations.some(v=>
        ['critical','serious'].includes(v.impact)),...axe});
      const severe=axe.violations.filter(v=>['critical','serious'].includes(v.impact));
      if(severe.length) {
        report.failures.push(label+'/'+device.name+' accessibility: '+JSON.stringify(severe));
      }
    }
    // Run actual visitor actions, not just viewport measurements.
    if(device.width<=600){
      await page.locator('.menu-toggle').click();
      assert(await page.locator('nav').isVisible(),'mobile menu failed to open');
      await page.locator('nav a[href="#work"]').click();
      assert(!(await page.locator('nav').isVisible()),'mobile menu stayed open after navigation');
    } else {
      assert(await page.locator('header nav').isVisible(),'desktop navigation missing');
    }
    await page.locator('#work').scrollIntoViewIfNeeded();
    await page.locator('button[data-filter="ai"]').click();
    const filtered=await page.locator('.project:not([hidden])').count();
    assert(filtered===3,'AI filter count unexpected '+filtered);
    await page.locator('button[data-filter="all"]').click();
    assert(await page.locator('.project:not([hidden])').count()===4,'reset filter failed');

    await page.locator('.project[data-project="chem"]').click();
    assert(await page.locator('#project-dialog').evaluate(el=>el.open),'project dialog did not open');
    assert((await page.locator('#dialog-title').textContent()).includes('ChemLabs'),'dialog title wrong');
    await page.locator('.dialog-close').click();
    assert(!await page.locator('#project-dialog').evaluate(el=>el.open),'project dialog did not close');
    await page.locator('.project[data-project="reframe"]').click();
    await page.keyboard.press('Escape');
    assert(!await page.locator('#project-dialog').evaluate(el=>el.open),'Escape did not close project dialog');
    await page.locator('.cap-list details').nth(1).locator('summary').click();
    assert(await page.locator('.cap-list details').nth(1).evaluate(el=>el.open),
      'accordion detail did not expand');

    await page.locator('.comparison-stage input').evaluate(el=>{
      el.value='83';el.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const split=await page.locator('.comparison-stage').evaluate(el=>el.style.getPropertyValue('--split'));
    assert(split==='83%','comparison slider did not respond: '+split);

    await page.locator('#brief-form input[name="name"]').fill('Browser Tester');
    await page.locator('#brief-form input[name="email"]').fill('test@example.com');
    await page.locator('#brief-form textarea[name="idea"]').fill('An interactive concept for testing the user flow.');
    await page.locator('#brief-form button[type="submit"]').click();
    assert((await page.locator('#brief-status').textContent()).includes('ready'),
      'brief submission status did not update');

    assert(!errors.length,'interaction JS error: '+errors.join(' | '));
    await page.screenshot({path:join(out,label+'-'+device.name+'.png'),fullPage:device.name==='small-mobile'||device.name==='tablet-portrait'||device.name==='desktop',animations:'disabled'});
    record(label,device.name,'layout-interactions',{pass:true,metrics:result});
  } catch(e) {
    const failure=label+'/'+device.name+' layout: '+String(e.message||e).slice(0,550);
    report.failures.push(failure);record(label,device.name,'layout-interactions',{pass:false,error:failure});
    try{await page.screenshot({path:join(out,label+'-'+device.name+'-FAILED.png'),fullPage:false,timeout:3000})}catch{}
  } finally {await context.close();}
}

async function motionPass(browser,label,device) {
  const context=await contextFor(browser,label,device,'no-preference');
  const page=await context.newPage(),errors=capture(page);
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForTimeout(900);
    const early=await page.evaluate(()=>({
      agents:document.querySelectorAll('.build-agent').length,
      intro:document.querySelector('.build-caption')?.textContent,
      pending:document.querySelectorAll('.build-pending').length,
      recovered:document.body.classList.contains('story-recovered')
    }));
    assert(early.agents===23,'expected 23 agents, found '+early.agents);
    assert(!early.recovered,'unexpected animation recovery during intro');
    await page.waitForTimeout(3900);
    const active=await page.evaluate(()=>({
      caption:document.querySelector('.build-caption')?.textContent,
      headlineComplete:document.querySelector('.hero h1')?.classList.contains('build-complete'),
      hiddenLetters:document.querySelectorAll('.kinetic-source-hidden').length,
      scrollY:window.scrollY,
      recovered:document.body.classList.contains('story-recovered')
    }));
    assert(!errors.length,'page errors: '+errors.join(' | '));
    assert(active.headlineComplete===true,'hero stuck pending after 4.8 seconds');
    assert(!active.recovered,'watchdog recovered rather than running animation');
    assert(active.caption!=='EXPLORE AT YOUR PACE','autoplay abandoned unexpectedly');

    // Manual user input must return usable HTML and clear artificial text hiding.
    // Mobile WebKit does not implement wheel events. Exercise a genuine touch
    // on phones/tablets; desktop gets the standard wheel takeover.
    if(device.touch)await page.touchscreen.tap(device.width-26,Math.round(device.height*.5));
    else await page.mouse.wheel(0,350);
    await page.waitForTimeout(200);
    const manual=await page.evaluate(()=>({
      caption:document.querySelector('.build-caption')?.textContent,
      pending:document.querySelectorAll('.build-pending').length,
      hiddenLetters:document.querySelectorAll('.kinetic-source-hidden').length
    }));
    assert(manual.pending===0,'manual takeover left content hidden');
    assert(manual.hiddenLetters===0,'manual takeover left glyphs hidden');
    assert(!errors.length,'page errors after takeover: '+errors.join(' | '));
    // The control bar must actually work, including after manual takeover.
    await page.locator('.build-replay').click();
    await page.waitForTimeout(450);
    assert((await page.locator('.build-caption').textContent()).includes('ASSEMBLING') ||
      (await page.locator('.build-caption').textContent()).includes('BUILDING'),
      'replay did not restart the construction sequence');
    await page.locator('.build-pause').click();
    assert(await page.locator('.build-pause').getAttribute('aria-pressed')==='true',
      'Pause control did not set pressed state');
    const pausedY=await page.evaluate(()=>window.scrollY);
    await page.waitForTimeout(450);
    assert(Math.abs(await page.evaluate(()=>window.scrollY)-pausedY)<=2,
      'paused portfolio continued scrolling');
    await page.locator('.build-pause').click();
    assert(await page.locator('.build-pause').getAttribute('aria-pressed')==='false',
      'Resume control did not reset pressed state');
    await page.waitForTimeout(250);
    await page.locator('.build-manual').click();
    assert(await page.locator('.build-pending').count()===0,
      'Explore freely left hidden content after replay');
    assert(!errors.length,'page errors after controls: '+errors.join(' | '));
    record(label,device.name,'motion',{pass:true,early,active,manual,controlsVerified:true});
  } catch(e) {
    const failure=label+'/'+device.name+' motion: '+String(e.message||e).slice(0,550);
    report.failures.push(failure);record(label,device.name,'motion',{pass:false,error:failure});
    try{await page.screenshot({path:join(out,label+'-'+device.name+'-MOTION-FAILED.png'),fullPage:false,timeout:3000})}catch{}
  }finally{await context.close();}
}

try{
  for(const [label,engine] of browsers){
    let browser;
    try{browser=await engine.launch({headless:true,timeout:45000});}
    catch(e){report.failures.push(label+' did not launch: '+e.message);continue;}
    console.log('### browser',label,browser.version());
    for(const device of devices) await layoutPass(browser,label,device);
    await browser.close();
    // Long full-page screenshot suites can exhaust WebKit's graphics process.
    // Each motion scenario gets a clean browser process to distinguish real
    // application crashes from test-runner process/memory accumulation.
    for(const device of devices.filter(d=>['android-mobile','tablet-portrait','desktop'].includes(d.name))) {
      let motionBrowser;
      try {
        motionBrowser=await engine.launch({headless:true,timeout:45000});
        await motionPass(motionBrowser,label,device);
      } catch(e) {
        report.failures.push(label+'/'+device.name+' motion browser launch: '+String(e.message||e).slice(0,350));
      } finally {await motionBrowser?.close().catch(()=>{});}
    }
  }
} finally {
  await writeFile(join(out,'report.json'),JSON.stringify({...report,finishedAt:new Date().toISOString()},null,2));
  await new Promise(ok=>server.close(ok));
}

console.log('AUDIT RESULT',JSON.stringify({checks:report.results.length,failures:report.failures.length,errors:report.failures}));
if(report.failures.length)process.exitCode=1;
