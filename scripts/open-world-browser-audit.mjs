import { chromium, firefox, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.OPEN_WORLD_URL||'http://127.0.0.1:4173/world/';
const out='test-results/open-world';
await mkdir(out,{recursive:true});
const failures=[];
for(let i=0;i<30;i++){try{const response=await fetch(base);if(response.ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
for(const [name,browserType] of [['chromium',chromium],['firefox',firefox],['webkit',webkit]]){
 let browser;
 try{
  browser=await browserType.launch({headless:true,args:name==='chromium'?['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:[]});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  if(!(await page.title()).includes('Ravi M.'))throw new Error('Portfolio title is missing');
  const start=page.getByRole('button',{name:/START EXPLORING/i});
  await start.waitFor({state:'visible',timeout:20000});
  await page.screenshot({path:`${out}/${name}-intro.png`,fullPage:false});
  await start.click();
  await page.locator('canvas').waitFor({state:'visible',timeout:20000});
  await page.waitForTimeout(3500);
  if(await page.locator('canvas').count()!==1)throw new Error('Expected one 3D canvas');
  if(!(await page.getByText(/THE CITY|THE SKILL ZONE|OPEN WATER|SERVICE DECK|THE SKY|LET'S TALK/i).first().isVisible()))throw new Error('Zone HUD did not appear');
  await page.screenshot({path:`${out}/${name}-world.png`,fullPage:false});
  if(errors.length)throw new Error('Runtime errors: '+errors.join(' | '));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${name}-mobile.png`,fullPage:false});
  await page.goto(base+'?view=2d',{waitUntil:'domcontentloaded',timeout:30000});
  if(!(await page.getByText('Ideas into').first().isVisible()))throw new Error('2D accessible version did not render');
  await page.screenshot({path:`${out}/${name}-2d.png`,fullPage:true});
  console.log(name+': PASS');
 }catch(e){failures.push(name+': '+e.message);console.error(name+': FAIL '+e.message);}
 finally{if(browser)await browser.close();}
}
await writeFile(out+'/summary.json',JSON.stringify({base,failures,passed:3-failures.length},null,2));
if(failures.length)process.exit(1);
