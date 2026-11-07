/* Ravi M — kinetic typography / cursor-built letterforms.
 * The semantic heading stays in the DOM untouched. A decorative, shared-clock
 * Canvas layer draws its measured glyphs until the original heading takes over.
 * No second requestAnimationFrame, text-node mutation, or external dependency.
 */
(() => {
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const out=x=>1-Math.pow(1-clamp(x,0,1),3);
  const TWO_PI=Math.PI*2;

  function budget(width,memory,cores) {
    const mobile=width<=640;
    const low=(memory>0&&memory<=4)||(cores>0&&cores<=4);
    return {
      fps:mobile||low?30:60,
      dpr:mobile?1.25:low?1.4:1.75,
      maxGlyphs:mobile?54:low?74:96,
      maxConcurrent:mobile?2:3,
      duration:mobile?680:760,
      sourceReach:mobile?90:150
    };
  }

  function headingFor(container) {
    if (!container || !container.querySelector) return null;
    if (container.matches?.('h2,h3')) return container;
    const heading=container.querySelector('h2');
    if(heading)return heading;
    return container.matches?.('article') ? container.querySelector('h3') : null;
  }

  function create({layer,agents=[]}={}) {
    if(!layer||matchMedia('(prefers-reduced-motion: reduce)').matches||
      typeof document.createRange!=='function'||typeof getComputedStyle!=='function')return null;

    const canvas=document.createElement('canvas');
    canvas.className='kinetic-type-canvas';
    canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx)return null;
    layer.insertBefore(canvas,layer.firstChild);

    let width=0,height=0,config=null,lastDraw=-Infinity;
    const active=new Map();

    function resize() {
      width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
      config=budget(width,navigator.deviceMemory,navigator.hardwareConcurrency);
      const dpr=clamp(devicePixelRatio||1,1,config.dpr);
      canvas.width=Math.max(1,Math.round(width*dpr));
      canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=width+'px';canvas.style.height=height+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    // Walk existing text nodes and use DOM Ranges to respect natural fonts,
    // line wraps, explicit <br>, letter spacing, and inherited red accents.
    function sample(heading) {
      const glyphs=[];
      const read=node=>{
        if(!node)return;
        if(node.nodeType===3) {
          const text=node.textContent||'';
          const style=getComputedStyle(node.parentElement||heading);
          const font=style.font&&style.font!=='normal'
            ?style.font
            :[style.fontStyle||'normal',style.fontWeight||'400',
              style.fontSize||'48px',style.fontFamily||'sans-serif'].join(' ');
          let offset=0;
          for(const ch of text) {
            const size=ch.length;
            if(!ch.trim()){offset+=size;continue;}
            const range=document.createRange();
            try {
              range.setStart(node,offset);
              range.setEnd(node,offset+size);
              const box=range.getBoundingClientRect();
              if(box.width>.05&&box.height>.05&&Number.isFinite(box.left)&&Number.isFinite(box.top)) {
                const color=style.color||'#f0ece5';
                const px=Number.parseFloat(style.fontSize)||48;
                // The Range rect follows the real text; the ascent offsets
                // the canvas baseline into the same visual line box.
                glyphs.push({char:ch,x:box.left,y:box.top+box.height*.78,
                  rectTop:box.top,font,color,size:px,
                  centerX:box.left+box.width*.5,
                  centerY:box.top+box.height*.5});
              }
            } finally {
              range.detach?.();
            }
            offset+=size;
          }
          return;
        }
        if(node.nodeType!==1)return;
        if(node.matches?.('script,style,[aria-hidden="true"]'))return;
        for(const child of Array.from(node.childNodes||[]))read(child);
      };
      read(heading);
      return glyphs;
    }

    function stop(entry) {
      if(!entry)return;
      entry.heading.classList.remove('kinetic-source-hidden');
      active.delete(entry.heading);
    }
    function clear() {
      for(const entry of Array.from(active.values()))stop(entry);
      ctx.clearRect(0,0,width,height);
      lastDraw=-Infinity;
    }

    function start(container,builders=[],now=performance.now(),options={}) {
      const heading=headingFor(container);
      if(!heading||active.has(heading)||!heading.isConnected||!config||
        active.size>=config.maxConcurrent)return false;
      // Never hide the only accessible heading unless every glyph is drawable.
      let glyphs;
      try {glyphs=sample(heading);} catch {return false;}
      if(!glyphs.length||glyphs.length>config.maxGlyphs)return false;
      if(glyphs.some(g=>!Number.isFinite(g.x)||!Number.isFinite(g.y)))return false;
      const rect=heading.getBoundingClientRect();
      if(rect.width<10||rect.height<10)return false;

      const sources=builders.length?builders:agents;
      const validSources=sources.filter(a=>Number.isFinite(a?.x)&&Number.isFinite(a?.y));
      const count=glyphs.length;
      const reach=config.sourceReach;
      const travel=options.duration||config.duration;
      const spread=Math.min(290,Math.max(150,travel*.34));
      const duration=travel+spread;
      const ordered=glyphs.map((g,i)=>{
        const source=validSources[i%Math.max(1,validSources.length)];
        const dx=source?clamp(source.x-g.centerX,-reach,reach):0;
        const dy=source?clamp(source.y-g.centerY,-reach,reach):(-35-(i%3)*10);
        const angle=((i*7)%11-5)*.026;
        return {...g,dx,dy,angle,
          delay:count===1?0:(i/(count-1))*spread,
          accent:/rgb\(\s*2(?:3|4|5)\d\s*,/.test(g.color)||g.color.toLowerCase().includes('ef2841')};
      });
      const entry={heading,glyphs:ordered,start:now,duration,travel,spread};
      try{heading.classList.add('kinetic-source-hidden');}
      catch{return false;}
      active.set(heading,entry);
      return true;
    }

    function draw(now) {
      if(!active.size)return;
      if(width!==innerWidth||height!==innerHeight){clear();resize();return;}
      if(now-lastDraw<1000/config.fps-1)return;
      lastDraw=now;
      ctx.clearRect(0,0,width,height);
      ctx.textAlign='left';ctx.textBaseline='alphabetic';
      const finished=[];
      for(const entry of active.values()) {
        const elapsed=Math.max(0,now-entry.start);
        if(elapsed>=entry.duration){finished.push(entry);continue;}
        for(const g of entry.glyphs) {
          const p=out((elapsed-g.delay)/entry.travel);
          if(p<=0)continue;
          const a=clamp((elapsed-g.delay)/150,0,1);
          const opacity=Math.min(1,a*(.65+.35*p));
          const x=g.x+g.dx*(1-p);
          const y=g.y+g.dy*(1-p);
          const rotation=g.angle*(1-p);
          const sizeScale=1+(.07*(1-p));
          ctx.save();
          ctx.globalAlpha=opacity;
          ctx.translate(x,y);
          ctx.rotate(rotation);
          ctx.scale(sizeScale,sizeScale);
          ctx.font=g.font;
          // A barely-visible drafting ghost precedes the crisp letterform.
          if(p<.85) {
            ctx.globalAlpha=.1*a*(1-p);
            ctx.fillStyle=g.accent?'#fa526d':'#e6cfd4';
            ctx.fillText(g.char,1.7,1.2);
          }
          ctx.globalAlpha=opacity;
          ctx.fillStyle=g.color;
          ctx.fillText(g.char,0,0);
          ctx.restore();
        }
      }
      for(const entry of finished)stop(entry);
      if(!active.size)ctx.clearRect(0,0,width,height);
    }

    function shiftTime(delta) {
      const n=Math.max(0,delta);
      for(const entry of active.values())entry.start+=n;
      lastDraw=-Infinity;
    }
    function destroy(){clear();canvas.remove();}
    resize();
    return {start,draw,clear,shiftTime,destroy,headingFor,
      get activeCount(){return active.size}};
  }
  window.createPortfolioKineticTypography=create;
  window.portfolioKineticBudget=budget;
  window.portfolioKineticHeadingFor=headingFor;
})();