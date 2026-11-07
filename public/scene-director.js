/* Scene Director 3.0 — task-linked SVG construction.
 * One DOM overlay, one parent animation clock. SVG is visual scaffolding;
 * native HTML remains the final accessible, interactive result.
 */
(() => {
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smoother=t=>{t=clamp(t);return t*t*(3-2*t)};
 const NS='http://www.w3.org/2000/svg';
 const make=(tag,attrs={})=>{
   const el=document.createElementNS(NS,tag);
   Object.entries(attrs).forEach(([key,val])=>el.setAttribute(key,String(val)));
   return el;
 };
 const taskSets={
   chem:['FRAME','GLASS','REACTION','TYPE','CHECK','FINISH'],
   reframe:['FRAME','BEFORE','AFTER','SPLIT','TYPE','FINISH'],
   brand:['FRAME','PRODUCT','LIGHT','FILM','TYPE','FINISH'],
   discovery:['FRAME','NODES','LINKS','SEARCH','TYPE','FINISH'],
   default:['FRAME','STRUCTURE','ALIGN','TYPE','CHECK','FINISH']
 };
 // All progress intervals overlap intentionally, but NOTHING begins until its
 // owner is at the target. All drawing happens BEFORE native-content reveal.
 const bands=[
   [.07,.30], [.20,.52], [.36,.65], [.47,.74], [.60,.86], [.77,.98]
 ];
 const paths={
  chem:[
    'M 0.02 0.02 H .98 V .98 H .02 Z',
    'M .40 .27 H .60 M .44 .27 V .42 L .34 .67 Q .33 .75 .43 .75 H .57 Q .67 .75 .66 .67 L .56 .42 V .27',
    'M .37 .64 Q .50 .56 .63 .64 M .39 .68 H .61',
    'M .20 .20 C .38 .05 .65 .06 .81 .20 M .24 .80 C .51 .92 .70 .90 .84 .75',
    'M .12 .84 H .60 M .12 .89 H .46',
    'M .08 .10 H .28 M .72 .10 H .91'
  ],
  reframe:[
    'M .03 .04 H .97 V .96 H .03 Z',
    'M .09 .21 H .45 V .79 H .09 Z M .09 .31 H .45 M .14 .40 H .39 M .14 .49 H .35',
    'M .55 .21 H .91 V .79 H .55 Z M .60 .31 H .86 M .60 .43 H .82 M .60 .55 H .78',
    'M .50 .15 V .84 M .47 .50 L .50 .54 L .53 .50',
    'M .12 .87 H .55 M .12 .91 H .39',
    'M .73 .11 H .90 M .87 .08 L .90 .11 L .87 .14'
  ],
  brand:[
    'M .03 .04 H .97 V .96 H .03 Z',
    'M .43 .26 H .57 V .36 H .62 V .74 H .38 V .36 H .43 Z',
    'M .23 .18 L .40 .36 M .77 .18 L .61 .36 M .23 .78 L .38 .70 M .77 .78 L .62 .70',
    'M .10 .17 H .23 V .82 H .10 Z M .77 .17 H .90 V .82 H .77 Z',
    'M .42 .50 H .59 M .42 .56 H .57 M .42 .62 H .54',
    'M .09 .10 H .29 M .71 .90 H .91'
  ],
  discovery:[
    'M .03 .04 H .97 V .96 H .03 Z',
    'M .50 .29 A .12 .12 0 1 1 .499 .29 M .22 .63 A .07 .07 0 1 1 .219 .63',
    'M .50 .41 L .25 .59 M .58 .39 L .78 .61 M .25 .66 L .50 .80',
    'M .72 .64 A .06 .06 0 1 1 .719 .64 M .50 .79 A .06 .06 0 1 1 .499 .79',
    'M .40 .33 H .60 M .15 .84 H .39',
    'M .08 .10 H .30 M .71 .90 H .92'
  ],
  default:[
    'M .03 .04 H .97 V .96 H .03 Z',
    'M .12 .26 H .87 M .12 .34 H .72',
    'M .12 .47 H .86 M .12 .54 H .65',
    'M .12 .68 H .88 M .12 .76 H .56',
    'M .13 .85 H .45',
    'M .08 .10 H .30 M .71 .90 H .92'
  ]
 };
 function create({layer}){
  const svg=make('svg',{class:'director-draft','aria-hidden':'true',viewBox:'0 0 100 100',preserveAspectRatio:'none'});
  svg.style.cssText='position:absolute;left:0;top:0;pointer-events:none;overflow:visible;opacity:0;z-index:4';
  const group=make('g',{'fill':'none','stroke':'#ff627f','stroke-width':'.44','stroke-linecap':'round','stroke-linejoin':'round',transform:'scale(100)'});
  svg.append(group);layer.append(svg);
  const drawn=Array.from({length:6},(_,i)=>{
    const p=make('path',{'vector-effect':'non-scaling-stroke'});
    p.style.opacity=i===0?'0.92':'.75';
    p.setAttribute('stroke-width',i===0?'1.5':'1.2');
    group.append(p);return p;
  });
  const tag=document.createElement('div');
  tag.className='director-task-label';tag.setAttribute('aria-hidden','true');
  layer.append(tag);
  let active=null;
  function start(item){
    const key=item?.el?.dataset?.project||'default';
    active={key,kind:item.kind,el:item.el};
    const library=paths[key]||paths.default;
    drawn.forEach((p,i)=>{
      p.setAttribute('d',library[i]);
      p.style.strokeDasharray='1000';
      p.style.strokeDashoffset='1000';
    });
    svg.dataset.target=key;svg.dataset.state='arrive';
    svg.dataset.tasks='0';
    tag.textContent='';
  }
  function render({item,rect,elapsed,revealAt,crew,viewport}){
    if(!active||active.el!==item.el)start(item);
    const top=clamp(rect.top,28,viewport.height-68);
    const left=clamp(rect.left,8,viewport.width-28);
    const width=Math.min(rect.width,viewport.width-left-8);
    const height=Math.min(rect.height,viewport.height-top-48);
    svg.style.transform='translate3d('+left+'px,'+top+'px,0)';
    svg.style.width=width+'px';svg.style.height=height+'px';
    const t=clamp(elapsed/revealAt);
    // User should see construction material, not a finished card or a loader.
    svg.style.opacity=String(clamp((elapsed-110)/130)*clamp((revealAt+180-elapsed)/250));
    const per=taskSets[active.key]||taskSets.default;
    let completed=0;
    const tips=[];
    drawn.forEach((path,i)=>{
      const [start,end]=bands[i];
      const p=smoother((t-start)/(end-start));
      // pathLength=100 standardizes precision and browser engines.
      path.setAttribute('pathLength','100');
      path.style.strokeDasharray='100';
      path.style.strokeDashoffset=String(100*(1-p));
      path.style.opacity=String(.28+.7*p);
      if(p>.99)completed++;
      // Cursor tip is positioned beside its OWN task's drawn line.
      const x=left+width*(i===0?.03:i===1?.41:i===2?.60:i===3?.77:i===4?.18:.88);
      const y=top+height*(i===0?.04:i===1?.32:i===2?.62:i===3?.76:i===4?.87:.12);
      tips.push({x,y,progress:p,task:per[i]});
    });
    tag.style.transform='translate3d('+clamp(left+12,8,viewport.width-140)+'px,'+
       clamp(top-24,28,viewport.height-40)+'px,0)';
    tag.textContent=per[Math.min(5,Math.floor(t*6))]+' / '+Math.round(t*100)+'%';
    tag.style.opacity=String(clamp((elapsed-130)/150)*clamp((revealAt+80-elapsed)/180));
    svg.dataset.state=elapsed<revealAt?'construct':'handoff';
    svg.dataset.tasks=String(completed);
    svg.dataset.progress=t.toFixed(3);
    // Return concrete work coordinates. First cursor remains bound to
    // the existing blueprint stroke; other cursors own their task lanes.
    return tips;
  }
  function clear(){
    active=null;svg.style.opacity='0';tag.style.opacity='0';
    svg.dataset.state='idle';svg.dataset.target='';svg.dataset.tasks='0';
  }
  return {start,render,clear,taskSets};
 }
 window.createPortfolioSceneDirector=create;
 window.portfolioSceneDirectorTasks=taskSets;
})();