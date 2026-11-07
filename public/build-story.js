/* Automatic, cursor-first portfolio assembly. Visual choreography only. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const roles=[['Story','#fc536c'],['Design','#a990ff'],['Visuals','#59d9bd'],['Build','#6fb7ff'],['Type','#ffbd69'],['Layout','#eb94d6'],['Motion','#b9d978'],['Details','#79d6ec'],['Structure','#ff927e'],['Compose','#cfb1ff'],['Explore','#7ee6a5'],['Finish','#ffe28b']];
const bar=document.createElement('div');bar.className='build-controls';bar.innerHTML='<span class="build-indicator"></span><span class="build-caption">AUTOPLAY / 12 BUILDERS</span><button type="button" class="build-replay">Replay tour ↻</button><button type="button" class="build-pause" aria-pressed="false">Pause tour</button><button type="button" class="build-manual">Explore freely</button>';document.body.append(bar);
const layer=document.createElement('div');layer.className='agent-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
const agents=roles.map(([name,color])=>{const el=document.createElement('div');el.className='build-agent';el.style.setProperty('--agent',color);el.innerHTML='<svg width="23" height="28" viewBox="0 0 23 28"><path d="M2 2L20 16L12 17L8 25Z" fill="currentColor" stroke="#111" stroke-width="1.5"/></svg>';layer.append(el);const box=document.createElement('div');box.className='build-selection';box.style.setProperty('--agent',color);box.innerHTML='<i></i><i></i><i></i><i></i>';layer.append(box);return {el,box,target:null};});
const selector='.hero-copy > *, .portrait, .hero-bottom, .section-heading > *, .filters, .project, .work-note, .about-title > *, .about-copy > *, .comparison, .steps article, .capabilities > .reveal, .cap-list details, .manifesto, .lab-rows details, .contact > .eyebrow, .contact-grid > .reveal, footer';
const targets=[...document.querySelectorAll(selector)].filter(el=>!el.parentElement.closest('.project'));
// One controller owns visibility so generic scroll reveals cannot expose content early.
document.body.classList.remove('js-motion');
let enabled=!reduce,ready=false,frame=0,started=0,busy=false,queue=new Set(),animations=[],batch=[];
let touring=!reduce, moving=false, travelFrame=0, advanceTimer=0;
const caption=bar.querySelector(".build-caption");
function inView(el){const r=el.getBoundingClientRect();return !el.hidden&&r.bottom>80&&r.top<innerHeight-80;}
function reveal(el){el.classList.remove('build-pending');el.classList.add('build-complete');}
function hideCursors(){agents.forEach(a=>{a.el.style.opacity=0;a.box.style.opacity=0});cancelAnimationFrame(frame);}
function finish(){animations.forEach(a=>a.finish());animations=[];batch.forEach(reveal);batch=[];hideCursors();busy=false;}
function kind(el){if(el.matches('.project'))return 'project';if(el.matches('.portrait,.manifesto'))return 'image';if(el.matches('.comparison'))return 'comparison';if(el.matches('form')||el.querySelector('form'))return 'form';if(el.matches('details,.filters,.about-facts,footer'))return 'rows';return 'text';}
function frames(el){const type=kind(el);const project=el.dataset.project;let first={opacity:0,clipPath:'inset(0 100% 0 0)',transform:'translateY(0)'};if(type==='image')first={opacity:0,clipPath:'inset(12% 12% 12% 12%)',transform:'scale(.96)'};if(type==='project')first={opacity:0,clipPath:project==='reframe'?'inset(0 100% 0 0)':project==='discovery'?'inset(40% 40% 40% 40%)':'inset(100% 0 0 0)',transform:'translateY(16px)'};if(type==='rows'||type==='form')first={opacity:0,clipPath:'inset(0 0 100% 0)',transform:'translateY(0)'};return [first,{opacity:1,clipPath:'inset(0 0 0 0)',transform:'translateY(0) scale(1)'}];}
function tick(now){if(!enabled||document.hidden){finish();return;}const elapsed=now-started;
agents.forEach((a,i)=>{if(!a.target)return;const r=a.target.getBoundingClientRect();const local=elapsed-a.order*45;const arriving=Math.min(1,Math.max(0,local/650));if(local<0||!inView(a.target)){a.el.style.opacity=0;a.box.style.opacity=0;return;}const x=Math.max(12,r.left),y=Math.max(82,r.top),w=Math.min(r.width,innerWidth-x-12),h=Math.max(10,Math.min(r.bottom-y,innerHeight-y-75));const work=Math.min(1,Math.max(0,(local-850)/600));let px=.08,py=.15;
if(a.kind==='text'){px=.04+work*.9;py=.18+(a.slot%3)*.26;}
else if(a.kind==='rows'||a.kind==='form'){px=a.slot%2?.92:.04;py=.05+work*.85;}
else if(a.kind==='comparison'){px=work;py=a.slot%2?.9:.12;}
else if(a.kind==='image'){const corner=(a.slot+i)%4;px=[.04,.94,.94,.04][corner];py=[.05,.05,.94,.94][corner];}
else {const art=a.target.querySelector(a.target.dataset.project==='chem'?'.flask':a.target.dataset.project==='brand'?'.bottle':a.target.dataset.project==='discovery'?'.discovery-orbit':'.mini-browser.new');if(art){const ar=art.getBoundingClientRect();px=Math.max(.05,Math.min(.95,(ar.left-r.left+ar.width*(a.slot%2?.9:.1))/w));py=Math.max(.05,Math.min(.9,(ar.top-r.top+ar.height*(1-work))/h));}else{px=.1+work*.8;py=.5;}}
const tx=Math.max(12,Math.min(innerWidth-30,x+w*px)),ty=Math.min(innerHeight-80,y+h*py);const ox=i%2?innerWidth-25:15,oy=85+(i/12)*(innerHeight-180);const ease=1-Math.pow(1-arriving,3);a.el.style.transform=`translate3d(${ox+(tx-ox)*ease}px,${oy+(ty-oy)*ease}px,0)`;a.el.style.opacity=elapsed>2350?Math.max(0,1-(elapsed-2350)/450):1;a.box.style.transform=`translate3d(${x}px,${y}px,0)`;a.box.style.width=w+'px';a.box.style.height=h+'px';a.box.style.opacity=a.slot===0&&local>550&&local<1900?'.5':'0';});
if(elapsed<2800)frame=requestAnimationFrame(tick);else{finish();pump();}}
function pump(){if(!enabled||!ready||busy||moving)return;clearTimeout(advanceTimer);batch=[...queue].filter(inView).slice(0,12);if(!batch.length){scheduleAdvance();return;}batch.forEach(el=>queue.delete(el));busy=true;started=performance.now();agents.forEach((a,i)=>{a.order=i%batch.length;a.target=batch[a.order];a.kind=kind(a.target);a.slot=Math.floor(i/batch.length)});
// Arrival completes at 650ms. Each content block begins only after its cursors arrive.
animations=batch.map((el,i)=>{el.classList.remove('build-pending');el.classList.add('build-complete');return el.animate(frames(el),{delay:850+i*45,duration:600,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});});frame=requestAnimationFrame(tick);}
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting&&!e.target.classList.contains('build-complete'))queue.add(e.target)});pump();},{threshold:.04});
targets.forEach(el=>{if(enabled)el.classList.add('build-pending');observer.observe(el)});
const pause=bar.querySelector('.build-pause');
function tourState(value){touring=value;pause.textContent=value?'Pause tour':'Resume tour';pause.setAttribute('aria-pressed',String(!value));caption.textContent=value?'AUTOPLAY / 12 BUILDERS':'TOUR PAUSED';if(!value){clearTimeout(advanceTimer);cancelAnimationFrame(travelFrame);moving=false;}}
function scheduleAdvance(){if(!touring||!enabled||!ready||busy||moving||document.hidden)return;clearTimeout(advanceTimer);advanceTimer=setTimeout(advance,1500);}
function advance(){if(!touring||document.hidden||busy)return;const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);if(scrollY>=max-3){targets.forEach(reveal);queue.clear();tourState(false);caption.textContent='PORTFOLIO / COMPLETE';pause.textContent='Tour complete';return;}const from=scrollY,to=Math.min(max,from+Math.max(180,innerHeight*.68));moving=true;const began=performance.now();function travel(now){if(!touring||document.hidden){moving=false;return;}const p=Math.min(1,(now-began)/1100);const ease=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;scrollTo({top:from+(to-from)*ease,behavior:'instant'});if(p<1)travelFrame=requestAnimationFrame(travel);else{moving=false;targets.filter(el=>!el.classList.contains('build-complete')&&inView(el)).forEach(el=>queue.add(el));pump();}}travelFrame=requestAnimationFrame(travel);}
function manual(){tourState(false);finish();enabled=false;targets.forEach(reveal);queue.clear();caption.textContent='EXPLORE AT YOUR PACE';}
pause.addEventListener('click',()=>{tourState(!touring);if(touring){enabled=true;ready=true;pump();}});
bar.querySelector('.build-manual').addEventListener('click',manual);
bar.querySelector('.build-replay').addEventListener('click',()=>{tourState(false);finish();enabled=true;ready=false;queue.clear();targets.forEach(el=>{el.classList.remove('build-complete');el.classList.add('build-pending');});scrollTo({top:0,behavior:'instant'});tourState(true);setTimeout(()=>{ready=true;targets.filter(inView).forEach(el=>queue.add(el));pump()},250);});
// Real visitor input always takes priority over the automatic camera.
['wheel','touchstart'].forEach(event=>addEventListener(event,()=>{if(touring)tourState(false)},{passive:true}));
addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Escape'].includes(e.key)&&touring)tourState(false)});
document.querySelectorAll('nav a,.hero .button,.hero-scroll,.project,details,form input,form textarea').forEach(el=>el.addEventListener('pointerdown',()=>{if(touring)tourState(false)}));
addEventListener('scroll',()=>{if(enabled){targets.filter(el=>!el.classList.contains('build-complete')&&inView(el)).forEach(el=>queue.add(el));pump()}},{passive:true});
document.addEventListener('focusin',e=>{const target=targets.find(el=>el.contains(e.target));if(target){reveal(target);queue.delete(target);animations.forEach(a=>{if(a.effect?.target===target)a.finish()})}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(advanceTimer);cancelAnimationFrame(travelFrame);moving=false;finish();}else pump()});
if(reduce){manual();caption.textContent='REDUCED MOTION / MANUAL';}else setTimeout(()=>{ready=true;targets.filter(inView).forEach(el=>queue.add(el));pump()},1200);
})();
