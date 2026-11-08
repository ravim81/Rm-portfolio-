import React from 'react';
import * as THREE from 'three';

function Strut({a,b,r=.045,color='#806b59'}) {
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 return <mesh position={start.clone().add(end).multiplyScalar(.5).toArray()} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize())} castShadow><cylinderGeometry args={[r,r,delta.length(),8]}/><meshStandardMaterial color={color} metalness={.38} roughness={.52}/></mesh>;
}
function ParisTower({position=[0,0,0]}) {
 const levels=[{y:0,w:3.5},{y:2.2,w:2.55},{y:4.6,w:1.45},{y:7.1,w:.72},{y:9.1,w:.3}];
 const braces=[];
 for(let i=0;i<levels.length-1;i++){const l=levels[i],u=levels[i+1];for(const sx of [-1,1])for(const sz of [-1,1]){braces.push(<Strut key={i+':'+sx+':'+sz} a={[sx*l.w,l.y,sz*l.w]} b={[sx*u.w,u.y,sz*u.w]} r={i===0?.075:.045}/>);if(i<3){braces.push(<Strut key={'x'+i+':'+sx+':'+sz} a={[sx*l.w,l.y,sz*l.w]} b={[sx*u.w,u.y,sz*u.w]} r={.035} color="#a78a70"/>);}}}
 return <group position={position}>
  {braces}
  {levels.slice(1,4).map((l,i)=><group key={i} position={[0,l.y,0]}><mesh><boxGeometry args={[l.w*2,.16,l.w*2]}/><meshStandardMaterial color="#92765f" metalness={.28}/></mesh><mesh position={[0,.12,0]}><boxGeometry args={[l.w*2.15,.08,l.w*2.15]}/><meshStandardMaterial color="#c0a48a" metalness={.3}/></mesh></group>)}
  {[-1,1].flatMap(s=>[-1,1].map(t=><Strut key={'cross'+s+t} a={[s*3.5,.1,t*3.5]} b={[s*2.55,2.2,t*2.55]} r={.055} color="#b08d6f"/>))}
  <mesh position={[0,9.8,0]}><cylinderGeometry args={[.055,.11,1.3,8]}/><meshStandardMaterial color="#8c6c55" metalness={.4}/></mesh>
  <mesh position={[0,10.48,0]}><sphereGeometry args={[.075,10,8]}/><meshStandardMaterial color="#f3cda4" emissive="#e6a66e" emissiveIntensity={.6}/></mesh>
 </group>;
}
function ParisBlock({position,variant=0}) {
 const tone=['#c5b29b','#b6aa9b','#d0bfa8'][variant%3];
 return <group position={position}>
  <mesh position={[0,3.5,0]} castShadow receiveShadow><boxGeometry args={[5.4,7,4.3]}/><meshStandardMaterial color={tone} roughness={.84}/></mesh>
  <mesh position={[0,7.15,0]}><boxGeometry args={[5.65,.3,4.55]}/><meshStandardMaterial color="#75675b" roughness={.82}/></mesh>
  <mesh position={[0,7.75,0]}><coneGeometry args={[3.9,1.3,4]}/><meshStandardMaterial color={variant%2?'#45525a':'#3d4b52'} roughness={.8}/></mesh>
  {Array.from({length:3},(_,floor)=>Array.from({length:4},(_,col)=>{
   const x=-1.95+col*1.3,y=1.2+floor*1.72;
   return <group key={floor+':'+col} position={[x,y,2.17]}>
    <mesh><boxGeometry args={[.78,1.12,.09]}/><meshStandardMaterial color="#796b5e" roughness={.9}/></mesh>
    <mesh position={[0,0,.055]}><boxGeometry args={[.58,.9,.035]}/><meshStandardMaterial color={floor===2?'#5d7b85':'#304b5a'} metalness={.38} roughness={.22}/></mesh>
    <mesh position={[0,-.61,.12]}><boxGeometry args={[.96,.12,.38]}/><meshStandardMaterial color="#d8c8b4" roughness={.8}/></mesh>
    <mesh position={[0,.61,.1]}><boxGeometry args={[.9,.1,.18]}/><meshStandardMaterial color="#e0d2bf"/></mesh>
   </group>;
  }))}
  {[-1,1].map(side=><mesh key={side} position={[side*2.74,3.6,0]}><boxGeometry args={[.16,6.8,4.35]}/><meshStandardMaterial color="#988879"/></mesh>)}
 </group>;
}
function Cloud({position,scale=1}) {
 return <group position={position} scale={scale}>{[[0,0,0,1.8],[1.35,.18,0,1.3],[-1.25,.08,.1,1.25],[.3,.52,-.2,1.05]].map((p,i)=><mesh key={i} position={[p[0],p[1],p[2]]} scale={[p[3],p[3]*.54,p[3]*.68]}><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color="#fff9ef" roughness={1}/></mesh>)}</group>;
}
export default function IntroScene() {
 return <>
  <color attach="background" args={['#8eafc0']}/><fog attach="fog" args={['#a9c0c9',38,115]}/>
  <ambientLight intensity={.55}/><hemisphereLight args={['#d8e8f0','#51463f',1.25]}/>
  <directionalLight position={[-18,28,16]} intensity={3.4} color="#ffe0bc" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.25,-18]} receiveShadow><planeGeometry args={[150,150]}/><meshStandardMaterial color="#626b6b" roughness={.94}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.22,-18]}><planeGeometry args={[12,150]}/><meshStandardMaterial color="#343b40" roughness={.95}/></mesh>
  {[-1,1].map(s=><mesh key={s} position={[s*6.2,-.1,-18]}><boxGeometry args={[.25,.18,150]}/><meshStandardMaterial color="#c4b6a5" roughness={.8}/></mesh>)}
  <ParisTower position={[0,0,-18]}/>
  <ParisBlock position={[-10,0,-21]} variant={0}/><ParisBlock position={[10,0,-27]} variant={1}/>
  <ParisBlock position={[-18,0,-42]} variant={2}/><ParisBlock position={[18,0,-46]} variant={0}/>
  <Cloud position={[-20,15,-42]} scale={1.5}/><Cloud position={[22,18,-55]} scale={1.9}/><Cloud position={[0,21,-78]} scale={2.4}/>
  <mesh position={[24,19,-78]}><sphereGeometry args={[4.8,32,24]}/><meshBasicMaterial color="#ffe3bb"/></mesh>
  <mesh position={[24,19,-78]}><sphereGeometry args={[7,32,24]}/><meshBasicMaterial color="#f9cda4" transparent opacity={.12}/></mesh>
 </>;
}