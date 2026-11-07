/* Browser smoke test for the PUBLIC deployed Cloudflare Worker.
 * Executed from GitHub Actions with normal internet access.
 * This is intentionally separate from the local 54-check viewport audit.
 */
import {chromium,firefox,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const url=process.env.PORTFOLIO_URL||
 'https://rm-portfolio-preview.mallaravikumar9618.workers.dev/';
const results=[];
const failures=[];
await mkdir('test-results/live-smoke',{recursive:true});

const cases=[
 {name:'chromium-android',engine:chromium,width:390,height:844,touch:true},
 {name:'webkit-ios',engine:webkit,width:390,height:844,touch:true},
 {name:'firefox-desktop',engine:firefox,width:1280,height:800,touch:false},
 {name:'chromium-desktop',engine:chromium,width:1440,height:900,touch:false}
];

for(const item of cases) {
 let browser;
 try {
  browser=await item.engine.launch();
  const context=await browser.newContext({
   viewport:{width:item.width,height:item.height},
   isMobile:item.touch&&item.name!=='firefox-desktop',
   hasTouch:item.touch,
   deviceScaleFactor:1,
   reducedMotion:'no-preference'
  });
  const page=await context.newPage(),errors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',res=>{
   if(res.url().startsWith(new URL(url).origin)&&res.status()>=400) {
    badResponses.push({status:res.status(),url:res.url()});
   }
  });
  const response=await page.goto(url+'?siteaudit='+item.name,{waitUntil:'load',timeout:40000});
  const header=response?.headers()['x-source-revision']||null;
  await page.waitForTimeout(5200);
  const view=await page.evaluate(()=>{
   const image=document.querySelector('.portrait img');
   const hero=document.querySelector('.hero h1');
   return {
    title:document.title,
    agents:document.querySelectorAll('.build-agent').length,
    pendingHero:hero?.classList.contains('build-pending'),
    heroVisible:hero&&getComputedStyle(hero).opacity!=='0',
    imageNaturalWidth:image?.naturalWidth,
    imageComplete:image?.complete,
    textHidden:document.querySelectorAll('.kinetic-source-hidden').length,
    recovered:document.body.classList.contains('story-recovered'),
    caption:document.querySelector('.build-caption')?.textContent,
    docWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth
   };
  });
  if(response?.status()!==200)throw Error('HTTP '+response?.status());
  if(view.agents!==23)throw Error('Expected 23 cursor agents, received '+view.agents);
  if(view.pendingHero||!view.heroVisible)throw Error('Hero not revealed on live Worker');
  if(view.imageNaturalWidth<100)throw Error('Live portrait missing or cannot be decoded');
  if(view.docWidth>view.viewportWidth+4)throw Error('Horizontal document overflow');
  if(view.recovered)throw Error('Cinematic intro recovered unexpectedly');
  if(view.textHidden!==0)throw Error('Kinetic typography did not hand back real text');
  if(badResponses.length)throw Error('HTTP failures: '+JSON.stringify(badResponses));
  if(errors.length)throw Error('JavaScript exceptions: '+errors.join(' | '));
  // Verify the scene itself communicates construction on the DEPLOYED site.
  // Waiting for the scaffold prevents mistaking an ordinary scroll transition
  // for a broken scene, and is deliberately stricter than checking 23 DOM nodes.
  await page.waitForFunction(()=>{
    const el=document.querySelector('.build-blueprint');
    return el && Number(getComputedStyle(el).opacity)>.4;
  },null,{timeout:18000});
  const directed=await page.evaluate(()=>{
    const el=document.querySelector('.build-blueprint');
    const active=[...document.querySelectorAll('.build-agent')]
      .filter(x=>Number(getComputedStyle(x).opacity)>.18).length;
    return {label:el?.querySelector('.blueprint-index')?.textContent,
      opacity:Number(getComputedStyle(el).opacity),
      active,hiddenCopy:document.querySelectorAll('.kinetic-source-hidden').length};
  });
  if(!directed.label?.includes('FRAME')&&!directed.label?.includes('PLAN'))
    throw Error('No readable construction action '+JSON.stringify(directed));
  if(directed.active>(item.touch?6:10))
    throw Error('Too many cursors blocking content '+JSON.stringify(directed));
  if(item.touch&&directed.hiddenCopy)
    throw Error('Mobile glyph overlay hides original text');
  await page.screenshot({path:'test-results/live-smoke/'+item.name+'-construction.png',
    fullPage:false});
  // Validate live menu and a modal in the real published environment.
  await page.locator('.build-manual').click();
  if(item.touch&&item.width<=600) {
   const beforeMenu=await page.evaluate(()=>({
     viewport:innerWidth,scrollY,expanded:document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),
     className:document.querySelector('#primary-nav')?.className,
     display:getComputedStyle(document.querySelector('#primary-nav')).display,
     menuVisible:getComputedStyle(document.querySelector('.menu-toggle')).display
   }));
   await page.locator('.menu-toggle').click();
   await page.waitForTimeout(125);
   const afterMenu=await page.evaluate(()=>({
     viewport:innerWidth,scrollY,expanded:document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),
     className:document.querySelector('#primary-nav')?.className,
     display:getComputedStyle(document.querySelector('#primary-nav')).display,
     menuVisible:getComputedStyle(document.querySelector('.menu-toggle')).display
   }));
   console.log('LIVE_NAV',item.name,JSON.stringify({beforeMenu,afterMenu}));
   await page.screenshot({path:'test-results/live-smoke/'+item.name+'-nav.png',fullPage:false});
   if(!(await page.locator('#primary-nav').isVisible()))
     throw Error('Mobile navigation failed '+JSON.stringify({beforeMenu,afterMenu,revision:header,errors}));
   await page.locator('#primary-nav a[href="#work"]').click();
  }
  await page.locator('.project[data-project="chem"]').click();
  if(!(await page.locator('#project-dialog').evaluate(e=>e.open)))throw Error('Project dialog failed');
  await page.locator('.dialog-close').click();
  await page.screenshot({path:'test-results/live-smoke/'+item.name+'.png',fullPage:false});
  results.push({case:item.name,pass:true,revision:header,view,directed});
  await context.close();
 }catch(e){
  failures.push({case:item.name,error:String(e).slice(0,700)});
  results.push({case:item.name,pass:false,error:String(e).slice(0,700)});
 }finally{await browser?.close().catch(()=>{});}
}
const report={checkedUrl:url,results,failures};
await writeFile('test-results/live-smoke/report.json',JSON.stringify(report,null,2));
console.log('LIVE_SMOKE_SUMMARY',JSON.stringify(report));
if(failures.length)process.exitCode=1;
