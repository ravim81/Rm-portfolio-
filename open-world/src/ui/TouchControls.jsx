import React,{useRef} from 'react';
export default function TouchControls({onChange}){
 const active=useRef(false);
 const move=e=>{if(!active.current)return;const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/(r.width*.34);const y=(e.clientY-r.top-r.height/2)/(r.height*.34);onChange({x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))});};
 const stop=()=>{active.current=false;onChange({x:0,y:0,boost:0});};
 return <><div className="touch-pad" onPointerDown={e=>{active.current=true;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span className="touch-stick">●</span><small>STEER</small></div><button className="touch-boost" onPointerDown={()=>onChange(v=>({...v,boost:1}))} onPointerUp={()=>onChange(v=>({...v,boost:0}))}>BOOST</button></>;
}