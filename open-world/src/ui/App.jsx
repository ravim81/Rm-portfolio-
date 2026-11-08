import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { gsap } from 'gsap';
import content from '../content.json';
import IntroScene from '../world/IntroScene.jsx';
const World = React.lazy(() => import('../world/World.jsx'));

function Loader({ onReady }) {
  const { progress, active } = useProgress();
  useEffect(() => { if (!active && progress >= 100) onReady(); }, [active, progress, onReady]);
  return <div className="preloader"><div className="preloader-top"><span>{content.identity.name.toUpperCase()} / {content.ui.engineLabel}</span><span>{Math.round(progress)}%</span></div><div className="load-track"><i style={{ transform: `scaleX(${progress / 100})` }} /></div><p>{content.ui.loadingLabel}</p></div>;
}
function useAudio() {
  const audio = useRef(null);
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    if (!audio.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx(), master = ctx.createGain(); master.gain.value = muted ? 0 : .16; master.connect(ctx.destination);
        const low = ctx.createOscillator(), lowGain = ctx.createGain(); low.type = 'sawtooth'; low.frequency.value = 48; lowGain.gain.value = .12; low.connect(lowGain); lowGain.connect(master); low.start();
        const wind = ctx.createOscillator(), windGain = ctx.createGain(), filter = ctx.createBiquadFilter(); wind.type='sine'; wind.frequency.value=112; filter.type='lowpass'; filter.frequency.value=260; windGain.gain.value=.09; wind.connect(filter); filter.connect(windGain); windGain.connect(master); wind.start();
        audio.current = { ctx, master };
      }
    }
    const next = !muted; setMuted(next); if (audio.current) { audio.current.ctx.resume(); audio.current.master.gain.setTargetAtTime(next ? 0 : .16, audio.current.ctx.currentTime, .12); }
  };
  useEffect(() => () => { audio.current?.ctx.close(); }, []);
  return { muted, toggle };
}
function Modal({ item, onClose }) {
  if (!item) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close project">×</button><p className="eyebrow">SERVICE / {item.id.toUpperCase()}</p><h2 id="modal-title">{item.title}</h2><p>{item.details}</p><a className="button button-primary" href={item.url} onClick={onClose}>LET'S TALK <span>↗</span></a></section></div>;
}
function TouchPad({ onChange }) {
  const active = useRef(false), origin = useRef({x:0,y:0});
  const move = e => { if (!active.current) return; const r=e.currentTarget.getBoundingClientRect(); const dx=(e.clientX-r.left-r.width/2)/(r.width*.34), dy=(e.clientY-r.top-r.height/2)/(r.height*.34); onChange({x:Math.max(-1,Math.min(1,dx)),y:Math.max(-1,Math.min(1,dy))}); };
  const stop = () => { active.current=false; onChange({x:0,y:0}); };
  return <div className="touch-pad" onPointerDown={e=>{active.current=true;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span className="touch-stick">●</span><small>STEER</small></div>;
}
function TwoDVersion() {
  return <main className="two-d"><nav><b>RAVI M.</b><a href="#work">WORK</a><a href="#skills">SKILLS</a><a href="#contact">CONTACT</a></nav><header><p className="eyebrow">INDEPENDENT BUILDER · INDIA</p><h1>Ideas into<br/><em>experiences.</em></h1><p>{content.identity.intro}</p></header><section id="work"><p className="eyebrow">{content.ui.selectedServices}</p><div className="two-grid">{content.services.map(s=><article key={s.id}><span>{s.id.toUpperCase()}</span><h2>{s.title}</h2><p>{s.description}</p></article>)}</div></section><section id="skills"><p className="eyebrow">{content.ui.capabilities}</p>{content.skills.map(g=><div key={g.group}><h2>{g.group}</h2><p>{g.items.map(x=>x.name).join(' · ')}</p></div>)}</section><section id="contact"><p className="eyebrow">{content.ui.startConversation}</p><h2>{content.ui.contactQuestion}</h2><a href={`mailto:${content.contact.email}`}>{content.contact.email}</a></section><a className="back-world" href="/world/">{content.ui.return3d}</a></main>;
}
export default function App() {
  const [started,setStarted]=useState(false),[ready,setReady]=useState(false),[zone,setZone]=useState(0),[modal,setModal]=useState(null),[stick,setStick]=useState({x:0,y:0}),[flash,setFlash]=useState(false);
  const {muted,toggle}=useAudio(); const [paused,setPaused]=useState(false);
  const is2d = new URLSearchParams(location.search).get('view')==='2d';
  const flashRef=useRef(null);
  const onZoneChange=useCallback((next)=>{setZone(next); if(next===4){setFlash(true); gsap.to(flashRef.current,{opacity:1,duration:.12,onComplete:()=>gsap.to(flashRef.current,{opacity:0,duration:.65,delay:.08,onComplete:()=>setFlash(false)})});}},[]);
  useEffect(()=>{const fn=e=>{if(e.key==='Escape')setModal(null);};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
  if(is2d)return <TwoDVersion/>;
  return <main className="game-shell">
    {!started && <div className="intro-screen"><div className="intro-grid"/><div className="intro-top"><span>{content.identity.name.toUpperCase()} / {content.ui.introBrand}</span><span>{content.ui.experienceLabel}</span></div><div className="intro-copy"><p className="eyebrow">{content.intro.eyebrow}</p><h1>{content.intro.title}</h1><p>{content.intro.subtitle}</p><button className="button button-primary" onClick={()=>{setStarted(true);setPaused(false);}}>{content.intro.startLabel}<span>↗</span></button></div><div className="intro-bottom"><span>{content.ui.experienceLabel}</span><span>{content.ui.desktopLabel}</span></div></div>}
    <div className="world-viewport" style={{visibility:'visible'}}>
      <Canvas shadows dpr={[1,1.6]} camera={{position:[0,5,10],fov:52}} gl={{antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setClearColor('#9bc6d7');}}>
        <Suspense fallback={<IntroScene/>}>{started?<World started={started} paused={paused} stick={stick} onZoneChange={onZoneChange} onProject={setModal}/>:<IntroScene/>}</Suspense><EffectComposer multisampling={0}><Bloom intensity={.45} luminanceThreshold={.72} mipmapBlur/><Vignette eskil={false} offset={.16} darkness={.38}/></EffectComposer><AdaptiveDpr pixelated/><Preload all/>
      </Canvas>
    </div>
    {started && <>
      <div className="hud-top"><a className="brand" href="#top">RAVI <i>M.</i></a><span>{content.identity.role.toUpperCase()}</span><div className="hud-actions"><button onClick={toggle} aria-label={muted?content.ui.muteLabel:content.ui.unmuteLabel}>{muted?'◖':'◖)))'}</button><button onClick={()=>setPaused(v=>!v)}>{paused?content.ui.resumeLabel:content.ui.pauseLabel}</button><a href="/world/?view=2d">{content.ui.skipLabel} ↗</a></div></div>
      <div className="zone-label"><small>{content.ui.nowEntering} / 0{zone+1}</small><strong>{content.zones[zone]?.label}</strong><span>{content.zones[zone]?.hint}</span></div>
      <div className="zone-progress"><div className="zone-track"><i style={{width:`${((zone+1)/content.zones.length)*100}%`}}/></div><div className="zone-numbers">{content.zones.map((z,i)=><span key={z.id} className={i===zone?'active':''}>{String(i+1).padStart(2,'0')}</span>)}</div></div>
      <div className="control-hints"><span><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> {content.ui.driveHint}</span><span><kbd>SHIFT</kbd> {content.ui.boostHint}</span><span><kbd>SPACE</kbd> {content.ui.brakeHint}</span></div>
      <div className="minimap"><span className="map-you">●</span><span className="map-route"/></div>
      <TouchPad onChange={setStick}/><button className="touch-boost" onTouchStart={()=>setStick(v=>({...v,boost:1}))} onTouchEnd={()=>setStick(v=>({...v,boost:0}))}>BOOST</button>
    </>}
    <div className="white-flash" ref={flashRef} style={{opacity:flash?1:0}}/>
    {started&&!ready&&<Loader onReady={()=>setReady(true)}/>}
    <Modal item={modal} onClose={()=>setModal(null)}/>
  </main>;
}