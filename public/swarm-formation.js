/* Ravi M / CONTENT-AWARE SWARM CHOREOGRAPHY
 * Pure 2D geometry. One shared RAF in build-story.js owns all rendering.
 * 23 deterministic agents, weighted roles, Bezier travel, and bounded separation.
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const eased = x => {x = clamp(x, 0, 1);return x*x*(3-2*x);};
  const out = x => 1 - Math.pow(1-clamp(x,0,1),3);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const groups = [8,8,7];

  function budget(width, memory = 8, cores = 8) {
    const mobile = width <= 640;
    const low = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
    return {
      minGap: mobile ? 13 : (low ? 17 : 20),
      passes: mobile || low ? 2 : 3,
      maxCurve: mobile ? 36 : 62,
      guideLimit: mobile ? 4 : 7
    };
  }

  function weight(kind) {
    return ({project:3.4,image:2.8,comparison:2.5,rows:1.3,form:1.6,text:1.4})[kind] || 1.4;
  }

  function allocate(items, count) {
    if (!items.length || count <= 0) return items.map(()=>0);
    const values = items.map(()=>0);
    // Every content block receives at least one agent when possible.
    for (let i=0;i<Math.min(count,items.length);i++) values[i]++;
    for (let n=items.length;n<count;n++) {
      let best=0,score=-Infinity;
      for (let i=0;i<items.length;i++) {
        const value = weight(items[i].kind)/(values[i]+.62);
        if (value>score) {score=value;best=i;}
      }
      values[best]++;
    }
    return values;
  }

  function shape(rect) {
    const left = Number.isFinite(rect?.left) ? rect.left : (rect?.x || 0);
    const top = Number.isFinite(rect?.top) ? rect.top : (rect?.y || 0);
    return {left,top,width:Math.max(1,rect?.width||1),height:Math.max(1,rect?.height||1)};
  }
  function perimeter(r, t, margin=9) {
    const x=r.left-margin, y=r.top-margin, w=r.width+margin*2,h=r.height+margin*2;
    const length=2*(w+h), run=((t%1)+1)%1*length;
    if(run<w) return {x:x+run,y};
    if(run<w+h) return {x:x+w,y:y+run-w};
    if(run<w*2+h) return {x:x+w-(run-w-h),y:y+h};
    return {x,y:y+h-(run-2*w-h)};
  }

  function anchor(item, slot, total, trace=0, vp={width:1280,height:720}) {
    const rect=shape(item.rect||item);
    const type=item.kind||'text';
    const fraction=(slot+.5)/Math.max(total,1);
    let p;
    if(type==='project') {
      const art=shape(item.artRect || {left:rect.left,top:rect.top,width:rect.width,height:rect.height*.73});
      p=perimeter(art, (fraction*.83+trace*.15+.02)%1, vp.width<=640?7:12);
    } else if(type==='image') {
      const theta=TAU*(fraction+trace*.11)-Math.PI/2;
      p={x:rect.left+rect.width*.5+Math.cos(theta)*Math.max(22,rect.width*.54),
         y:rect.top+rect.height*.5+Math.sin(theta)*Math.max(24,rect.height*.53)};
    } else if(type==='comparison') {
      // Three construction lanes: frame / divider / polish.
      const lane=slot%3, local=(Math.floor(slot/3)+.5)/Math.ceil(total/3);
      p=lane===0?{x:rect.left+rect.width*.045,y:rect.top+local*rect.height}
        :lane===1?{x:rect.left+rect.width*(.48+trace*.035),y:rect.top+local*rect.height}
        :{x:rect.left+rect.width*.955,y:rect.top+local*rect.height};
    } else if(type==='rows'||type==='form') {
      const side=slot%2===0?-1:1;
      const row=Math.floor(slot/2), rows=Math.ceil(total/2);
      p={x:rect.left+rect.width*(side<0?0:1)+side*(vp.width<=640?7:12),
         y:rect.top+rect.height*(row+.5)/rows};
    } else {
      // Place drafting cursors on a baseline OUTSIDE the title, not on its glyphs.
      const columns=Math.min(total,vp.width<=640?5:8);
      const line=Math.floor(slot/columns);
      const row=slot%columns;
      const lines=Math.ceil(total/columns);
      const offset=(row+.5)/columns;
      const alternate=line%2===0?offset:1-offset;
      p={x:rect.left+rect.width*(.06+.88*alternate) + trace*Math.min(22,rect.width*.045),
         y:rect.top+rect.height+(vp.width<=640?7:13)+line*(vp.width<=640?10:15)};
      if(lines>1 && rect.top+rect.height+lines*15>vp.height-74)
        p.y=rect.top-(vp.width<=640?6:11)-line*(vp.width<=640?10:15);
    }
    return {x:clamp(p.x,11,Math.max(11,vp.width-20)),
            y:clamp(p.y,31,Math.max(31,vp.height-68))};
  }

  function avoidText(point, regions, vp) {
    // Do not place agents inside known copy/text panels. Expel to the nearest edge.
    let x=point.x,y=point.y;
    for(const area of regions||[]) {
      if(!area)continue;
      const r=shape(area),pad=vp.width<=640?7:11;
      const left=r.left-pad,right=r.left+r.width+pad,top=r.top-pad,bottom=r.top+r.height+pad;
      if(x<=left||x>=right||y<=top||y>=bottom)continue;
      const options=[
        {delta:Math.abs(x-left),x:left,y},
        {delta:Math.abs(x-right),x:right,y},
        {delta:Math.abs(y-top),x,y:top},
        {delta:Math.abs(y-bottom),x,y:bottom}
      ].sort((a,b)=>a.delta-b.delta);
      x=options[0].x;y=options[0].y;
    }
    return {x:clamp(x,11,Math.max(11,vp.width-20)),
            y:clamp(y,31,Math.max(31,vp.height-68))};
  }

  function separate(points, vp, config=budget(vp.width)) {
    const gap=config.minGap;
    const frame=points.map(p=>({...p}));
    for(let iteration=0;iteration<config.passes;iteration++) {
      for(let i=0;i<frame.length;i++) {
        const a=frame[i];
        for(let j=i+1;j<frame.length;j++) {
          const b=frame[j];
          const dx=b.x-a.x,dy=b.y-a.y;
          const d=Math.hypot(dx,dy);
          if(d>=gap)continue;
          const n=d>.001?{x:dx/d,y:dy/d}
            :{x:Math.cos((i+1)*2.399963+j),y:Math.sin((i+1)*2.399963+j)};
          const push=(gap-d)*.52;
          a.x-=n.x*push;a.y-=n.y*push;
          b.x+=n.x*push;b.y+=n.y*push;
        }
      }
      for(const p of frame) {
        p.x=clamp(p.x,11,Math.max(11,vp.width-20));
        p.y=clamp(p.y,31,Math.max(31,vp.height-68));
      }
    }
    return frame;
  }

  function task(kind,slot,count) {
    if(kind==='project')return ['outline','illustrate','inspect','polish'][slot%4];
    if(kind==='image')return ['frame','light','focus','polish'][slot%4];
    if(kind==='comparison')return ['before','transition','after'][slot%3];
    if(kind==='form'||kind==='rows')return slot%2?'align':'structure';
    return slot%3===0?'baseline':slot%3===1?'type':'finish';
  }

  function planStage(items,agents,stageIndex,vp) {
    const allocations=allocate(items,agents.length);
    const specs=[];
    items.forEach((item,targetIndex)=>{
      for(let slot=0;slot<allocations[targetIndex];slot++) {
        const count=allocations[targetIndex],point=anchor(item,slot,count,0,vp);
        specs.push({item,targetIndex,slot,count,point,task:task(item.kind,slot,count)});
      }
    });
    const remaining=new Set(agents.map((_,i)=>i));
    const assignments=[];
    // Assign the nearest free builder to the next planned construction position.
    // This preserves the viewer's mental map and avoids random cross-screen jumps.
    specs.forEach((spec,index)=>{
      let chosen=-1,best=Infinity;
      for(const i of remaining) {
        const a=agents[i],d=dist({x:a.x,y:a.y},spec.point);
        const stable=(i+stageIndex*7)%agents.length;
        const cost=d+Math.abs(stable-index)*.45;
        if(cost<best){best=cost;chosen=i;}
      }
      if(chosen<0)return;
      remaining.delete(chosen);
      const a=agents[chosen], dx=spec.point.x-a.x,dy=spec.point.y-a.y;
      const length=Math.max(1,Math.hypot(dx,dy));
      const curve=Math.min(budget(vp.width).maxCurve, length*.17) * ((chosen+stageIndex)%2?-1:1);
      assignments.push({
        a,index:chosen,item:spec.item,targetIndex:spec.targetIndex,
        slot:spec.slot,count:spec.count,task:spec.task,
        fromX:a.x,fromY:a.y,
        bendX:-dy/length*curve,bendY:dx/length*curve,
        offset:(chosen%6)*12+spec.targetIndex*15
      });
    });
    assignments.sort((a,b)=>a.index-b.index);
    return assignments;
  }

  function workFrame(assignments,items,t,timings,vp) {
    const positions=assignments.map(entry=>{
      const item=items[entry.targetIndex];
      const progress=out((t-entry.offset)/timings.approach);
      const trace=clamp((t-timings.revealStart+60-entry.offset)/(timings.reveal+350),0,1);
      const origin=anchor(item,entry.slot,entry.count,0,vp);
      const destination=anchor(item,entry.slot,entry.count,trace,vp);
      const ctrlX=(entry.fromX+origin.x)*.5+entry.bendX;
      const ctrlY=(entry.fromY+origin.y)*.5+entry.bendY;
      const inv=1-progress;
      let x=inv*inv*entry.fromX+2*inv*progress*ctrlX+progress*progress*origin.x;
      let y=inv*inv*entry.fromY+2*inv*progress*ctrlY+progress*progress*origin.y;
      const traceEase=eased(trace);
      x+=(destination.x-origin.x)*traceEase;
      y+=(destination.y-origin.y)*traceEase;
      const enter=clamp((t-entry.offset)/170,0,1);
      const leaving=clamp((timings.duration-t)/260,0,1);
      return {x,y,opacity:(.35+.61*enter)*leaving};
    });
    const separated=separate(positions,vp,budget(vp.width, vp.memory, vp.cores));
    for(let i=0;i<separated.length;i++) {
      const entry=assignments[i],item=items[entry.targetIndex];
      const safe=avoidText(separated[i],item.avoidRects,vp);
      separated[i].x=safe.x;
      separated[i].y=safe.y;
    }
    return separated;
  }

  function introFrame(agents,elapsed,vp) {
    const formations=[];
    const w=vp.width,h=vp.height,compact=w<=640;
    const bandWidth=Math.min(w*.78,compact?w*.88:850);
    const left=(w-bandWidth)/2;
    for(let i=0;i<agents.length;i++) {
      const group=i<groups[0]?0:i<groups[0]+groups[1]?1:2;
      const index=i<8?i:i<16?i-8:i-16;
      const count=groups[group];
      const angle=index/count*TAU-Math.PI/2;
      const anchorX=left+(group+.5)*bandWidth/3+Math.cos(angle)*(compact?25:53);
      const anchorY=h*(compact?.42:.455)+Math.sin(angle)*(compact?57:92);
      const start=i*2.39996323;
      const fromX=w*.5+Math.cos(start)*Math.min(w*.53,540);
      const fromY=h*.47+Math.sin(start)*h*.42;
      const arrival=out((elapsed-(i%5)*24)/960);
      formations.push({
        x:fromX+(anchorX-fromX)*arrival,
        y:fromY+(anchorY-fromY)*arrival,
        opacity:.12+.84*out(elapsed/500),
        formation:group
      });
    }
    return separate(formations,vp,budget(w,vp.memory,vp.cores));
  }

  function cameraFrame(agents,starts,progress,vp) {
    const w=vp.width,h=vp.height,compact=w<=640;
    const f=eased(progress),positions=[];
    for(let i=0;i<agents.length;i++) {
      const group=i<8?0:i<16?1:2;
      const index=i<8?i:i<16?i-8:i-16;
      const count=groups[group];
      const theta=TAU*(index+.5)/count+f*.39;
      const lane=.24+group*.25;
      const tx=w*(lane+Math.cos(theta)*(compact?.052:.075)) +
        Math.sin(Math.PI*f)*Math.sin(theta)*Math.min(34,w*.07);
      const ty=h*(.43+Math.sin(theta)*(compact?.17:.23));
      const start=starts[i]||agents[i];
      positions.push({
        x:start.x+(tx-start.x)*f,
        y:start.y+(ty-start.y)*f,
        opacity:.28+.34*Math.sin(Math.PI*progress),
        formation:group
      });
    }
    return separate(positions,vp,budget(w,vp.memory,vp.cores));
  }

  function create({count=23}={}) {
    return {count,budget,allocate,anchor,avoidText,separate,planStage,workFrame,introFrame,cameraFrame};
  }

  window.createPortfolioSwarm = create;
  window.portfolioSwarmGeometry = {budget,allocate,anchor,avoidText,separate,planStage,workFrame,introFrame,cameraFrame};
})();