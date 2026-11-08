(() => {
'use strict';
const canvas=document.getElementById('world-canvas'),fallback=document.getElementById('world-fallback');
const loading=document.getElementById('world-loading'),chapter=document.getElementById('city-chapter');
const toggleButton=document.getElementById('journey-toggle'),replayButton=document.getElementById('journey-replay');
const progressBar=document.getElementById('world-progress'),captionKicker=document.getElementById('caption-kicker');
const captionTitle=document.getElementById('caption-title'),captionBody=document.getElementById('caption-body');
const hudIndex=document.getElementById('hud-index'),hudCoordinates=document.getElementById('hud-coordinates');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const lerp=(a,b,t)=>a+(b-a)*t;
let autoPlaying=!reducedMotion,manualMode=false,autoStart=performance.now(),currentProgress=0,lastFrame=performance.now(),lastCaption=-1,visible=true,world=null;
const rideDuration=22000;
function setFallback(reason){
 fallback.hidden=false;canvas.style.display='none';loading.style.opacity='0';
 document.documentElement.dataset.worldRenderer='fallback';window.__WORLD_FAILED__=String(reason||'3D renderer unavailable');
 window.__WORLD_READY__=true;toggleButton.disabled=true;replayButton.disabled=true;
}
function setCaption(progress){
 const index=progress<.31?0:progress<.72?1:2;if(index===lastCaption)return;lastCaption=index;
 const captions=[
 ['01 / THE CITY','Ideas in<br>motion<span>.</span>','A little curiosity can take you a long way.<br>Welcome to my world.'],
 ['02 / THE CRAFT','Curiosity.<br>Built into<br>craft<span>.</span>','Design, technology and a willingness to explore what comes next.'],
 ['03 / THE JOURNEY','Make it<br>mean<br>something<span>.</span>','Every project starts with a question. The best ones become experiences.']
 ];
 captionKicker.textContent=captions[index][0];captionTitle.innerHTML=captions[index][1];captionBody.innerHTML=captions[index][2];
 hudIndex.innerHTML='0'+(index+1)+' <i>/ 03</i>';
}
function manualProgress(){const rect=chapter.getBoundingClientRect();return clamp(-rect.top/Math.max(1,chapter.offsetHeight-innerHeight),0,1);}
function updateControls(){toggleButton.setAttribute('aria-pressed',String(autoPlaying));toggleButton.innerHTML=autoPlaying?'PAUSE JOURNEY <span>Ⅱ</span>':'PLAY JOURNEY <span>▶</span>';}
addEventListener('scroll',()=>{if(!window.__WORLD_PROGRAMMATIC_SCROLL__){manualMode=true;autoPlaying=false;updateControls();}},{passive:true});
toggleButton.addEventListener('click',()=>{
 if(autoPlaying){autoPlaying=false;manualMode=false;currentProgress=world?world.progress:currentProgress;}
 else{autoPlaying=true;manualMode=false;autoStart=performance.now()-currentProgress*rideDuration;}
 updateControls();
});
replayButton.addEventListener('click',()=>{
 window.__WORLD_PROGRAMMATIC_SCROLL__=true;scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'});
 manualMode=false;currentProgress=0;autoPlaying=!reducedMotion;autoStart=performance.now();updateControls();
 setTimeout(()=>{window.__WORLD_PROGRAMMATIC_SCROLL__=false;},700);
});
async function boot(){
 try{const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');initWorld(THREE);}
 catch(error){console.error('World renderer could not load:',error);setFallback(error&&error.message?error.message:error);}
}
function initWorld(THREE){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe99a78);scene.fog=new THREE.Fog(0x8b6870,48,245);
 const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,420);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:innerWidth>700,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.6));renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
 renderer.shadowMap.enabled=innerWidth>700;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene.add(new THREE.HemisphereLight(0xffd5bb,0x182432,2));
 const sunLight=new THREE.DirectionalLight(0xffbd91,3);sunLight.position.set(-32,55,18);sunLight.castShadow=renderer.shadowMap.enabled;
 sunLight.shadow.mapSize.set(1024,1024);sunLight.shadow.camera.left=-35;sunLight.shadow.camera.right=35;sunLight.shadow.camera.top=35;sunLight.shadow.camera.bottom=-35;scene.add(sunLight);
 const fill=new THREE.DirectionalLight(0x8fb4d1,.75);fill.position.set(28,18,-90);scene.add(fill);
 const mat=(color,roughness,metalness,extra)=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:roughness===undefined?.82:roughness,metalness:metalness===undefined?.08:metalness},extra||{}));
 const asphalt=mat(0x252d36,.96,.02),concrete=mat(0x66717a,.94,.02),lineMat=new THREE.MeshBasicMaterial({color:0xe6d8c5,transparent:true,opacity:.68});
 const buildingMats=[0x293746,0x33404d,0x39404b,0x30343f,0x3e3b46,0x263944].map(c=>mat(c,.9,.08));
 const windowWarm=mat(0xffc58e,.45,.1,{emissive:0x9a4d26,emissiveIntensity:.65});
 const windowCool=mat(0x8bc4d0,.5,.12,{emissive:0x315a73,emissiveIntensity:.4}),windowDark=mat(0x192633,.55,.08);
 const dummy=new THREE.Object3D(),warmMatrices=[],coolMatrices=[],darkMatrices=[];let seed=1847;
 const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 function addBox(parent,w,h,d,material,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=renderer.shadowMap.enabled;mesh.receiveShadow=renderer.shadowMap.enabled;parent.add(mesh);return mesh;}
 function addPlane(parent,w,d,material,x,y,z){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.receiveShadow=renderer.shadowMap.enabled;parent.add(mesh);return mesh;}
 addPlane(scene,430,330,mat(0x182632,1,0),0,-.18,-112);
 addPlane(scene,16,310,asphalt,0,-.02,-132);addPlane(scene,3.6,310,concrete,-9.8,-.05,-132);addPlane(scene,3.6,310,concrete,9.8,-.05,-132);
 addPlane(scene,44,310,mat(0x1c3b4a,.28,.38),31,-.13,-132);addPlane(scene,1.2,310,mat(0x47555e,.8,.05),14,-.09,-132);addPlane(scene,1.2,310,mat(0x47555e,.8,.05),48,-.09,-132);
 for(let z=12;z>-285;z-=8)addBox(scene,.16,.018,3.8,lineMat,0,.002,z);
 for(let z=12;z>-285;z-=16){addBox(scene,.09,.018,4.2,lineMat,-7.1,.003,z);addBox(scene,.09,.018,4.2,lineMat,7.1,.003,z);}
 function addBuilding(x,z,width,height,depth,index){
  const group=new THREE.Group();addBox(group,width,height,depth,buildingMats[index%buildingMats.length],0,height/2,0);
  addBox(group,width*.78,.5,depth*.76,mat(0x4b5058,.9,.08),0,height+.25,0);
  const side=x<0?1:-1,frontCols=Math.max(2,Math.floor(width/2.2)),sideCols=Math.max(2,Math.floor(depth/2.4)),rows=Math.max(3,Math.floor(height/2.55));
  for(let row=0;row<rows;row++){
   for(let col=0;col<frontCols;col++){
    dummy.position.set(x-width/2+(col+.5)*width/frontCols,1.8+row*2.45,z+depth/2+.025);dummy.rotation.set(0,0,0);dummy.scale.set(1.05,1.35,1);dummy.updateMatrix();
    const q=random();(q>.79?warmMatrices:q>.47?coolMatrices:darkMatrices).push(dummy.matrix.clone());
   }
   for(let col=0;col<sideCols;col++){
    dummy.position.set(x+side*(width/2+.026),1.8+row*2.45,z-depth/2+(col+.5)*depth/sideCols);dummy.rotation.set(0,side*Math.PI/2,0);dummy.scale.set(1.05,1.35,1);dummy.updateMatrix();
    const q=random();(q>.83?warmMatrices:q>.48?coolMatrices:darkMatrices).push(dummy.matrix.clone());
   }
  }
  group.position.set(x,0,z);scene.add(group);
 }
 for(let i=0;i<17;i++){const z=-22-i*13.2,x=-15-(i%3)*9.5,h=15+random()*26;addBuilding(x,z,8+random()*5,h,10+random()*8,i);}
 for(let i=0;i<13;i++){const z=-30-i*16.2,x=17+(i%3)*10.5,h=12+random()*23;addBuilding(x,z,8+random()*6,h,10+random()*9,i+5);}
 for(let i=0;i<8;i++){const z=-55-i*23,x=63+(i%2)*13,h=17+random()*29;addBuilding(x,z,11+random()*7,h,13+random()*8,i+11);}
 const windowGeometry=new THREE.PlaneGeometry(1,1);
 function addInstances(matrices,material){if(!matrices.length)return;const mesh=new THREE.InstancedMesh(windowGeometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);}
 addInstances(warmMatrices,windowWarm);addInstances(coolMatrices,windowCool);addInstances(darkMatrices,windowDark);
 function addStreetLight(x,z,flip){
  const group=new THREE.Group(),poleMat=mat(0x303d48,.5,.52),vertical=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,6.8,8),poleMat);
  vertical.position.y=3.4;group.add(vertical);const arm=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.2,8),poleMat);
  arm.rotation.z=Math.PI/2;arm.position.set(flip*.9,6.55,0);group.add(arm);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshBasicMaterial({color:0xffc18e}));bulb.position.set(flip*1.9,6.45,0);group.add(bulb);group.position.set(x,0,z);scene.add(group);
 }
 for(let z=-8;z>-250;z-=25){addStreetLight(-9.4,z,1);if(z%50<1)addStreetLight(9.4,z-8,-1);}
 function makeBillboard(x,y,z,w,h,headline,subline,accent){
  const group=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(w+.42,h+.42,.34),mat(0x141c26,.36,.72));group.add(frame);
  const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
  ctx.fillStyle='#101a26';ctx.fillRect(0,0,1024,512);ctx.fillStyle=accent;ctx.fillRect(0,0,13,512);
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(44,54,930,2);ctx.font='700 28px Arial';ctx.fillStyle='#e9d6ca';ctx.fillText('RAVI M. / INDEPENDENT BUILDER',54,42);
  ctx.font='800 82px Arial';ctx.fillStyle='#f6eee8';ctx.fillText(headline,54,245);ctx.font='500 28px Arial';ctx.fillStyle='#ffb29a';ctx.fillText(subline,58,315);
  ctx.fillStyle='rgba(255,255,255,.44)';ctx.fillRect(54,420,910,1);ctx.font='600 19px Arial';ctx.fillStyle='#d4d0ce';ctx.fillText('IDEAS / DESIGN / TECHNOLOGY / EXPERIMENTS',54,462);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));screen.position.z=.19;group.add(screen);
  const glow=new THREE.PointLight(new THREE.Color(accent),5,18);glow.position.set(0,0,1.2);group.add(glow);group.position.set(x,y,z);scene.add(group);
 }
 makeBillboard(-13.1,9.5,-42,9.2,4.6,'RAVI M.','IDEAS INTO EXPERIENCES','#ff6572');
 makeBillboard(13.8,10.2,-117,9.4,4.7,'BUILD WHAT','YOU WISH EXISTED','#ff9b75');
 const sun=new THREE.Mesh(new THREE.SphereGeometry(8.5,28,20),new THREE.MeshBasicMaterial({color:0xffc18f}));sun.position.set(58,32,-208);scene.add(sun);
 const sunGlow=new THREE.PointLight(0xff986e,16,100);sunGlow.position.copy(sun.position);scene.add(sunGlow);
 function cylinderBetween(parent,a,b,r,material,segments){
  const start=new THREE.Vector3(a[0],a[1],a[2]),end=new THREE.Vector3(b[0],b[1],b[2]),dir=new THREE.Vector3().subVectors(end,start),length=dir.length();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.82,r,length,segments||8),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());mesh.castShadow=renderer.shadowMap.enabled;parent.add(mesh);return mesh;
 }
 const bike=new THREE.Group(),bikeMetal=mat(0x202b35,.42,.72),bikeRed=mat(0xb72d3d,.36,.55),rubber=mat(0x101317,.95,.02),chrome=mat(0x9da6a9,.3,.78);
 const wheelGeo=new THREE.TorusGeometry(.47,.09,10,28),wheels=[];
 function makeWheel(z){
  const wheel=new THREE.Group(),tyre=new THREE.Mesh(wheelGeo,rubber);tyre.rotation.y=Math.PI/2;wheel.add(tyre);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.16,16),chrome);hub.rotation.z=Math.PI/2;wheel.add(hub);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.035,20),bikeMetal);disc.rotation.z=Math.PI/2;wheel.add(disc);
  wheel.position.set(0,.49,z);bike.add(wheel);wheels.push(wheel);
 }
 makeWheel(.84);makeWheel(-.88);
 cylinderBetween(bike,[0,.5,.84],[0,.83,.02],.075,bikeRed);cylinderBetween(bike,[0,.83,.02],[0,.5,-.88],.075,bikeMetal);
 cylinderBetween(bike,[0,.5,.84],[0,.5,-.88],.055,chrome);cylinderBetween(bike,[0,.83,.02],[0,1.02,-.48],.08,bikeRed);
 cylinderBetween(bike,[0,1.02,-.48],[0,.5,-.88],.045,chrome);addBox(bike,.52,.22,.72,bikeRed,0,1.03,-.25);
 addBox(bike,.42,.14,.55,bikeMetal,0,.95,.4);const engine=new THREE.Mesh(new THREE.BoxGeometry(.58,.52,.48),mat(0x68737a,.62,.65));engine.position.set(0,.69,.12);bike.add(engine);
 cylinderBetween(bike,[-.43,1.13,-.49],[.43,1.13,-.49],.035,chrome);
 const headlamp=new THREE.Mesh(new THREE.SphereGeometry(.19,14,10),new THREE.MeshBasicMaterial({color:0xffd9a7}));headlamp.position.set(0,.98,-.91);bike.add(headlamp);
 const tail=new THREE.Mesh(new THREE.BoxGeometry(.24,.12,.08),new THREE.MeshBasicMaterial({color:0xff3d50}));tail.position.set(0,1.13,.79);bike.add(tail);
 const rider=new THREE.Group(),jacket=mat(0x8e2939,.86,.04),darkCloth=mat(0x1c252e,.92,.02),helmetMat=mat(0x161e28,.22,.55);
 const visorMat=new THREE.MeshStandardMaterial({color:0x263b4a,metalness:.7,roughness:.15,transparent:true,opacity:.88});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.62,4,9),jacket);torso.position.set(0,1.48,.1);torso.rotation.x=-.34;torso.castShadow=renderer.shadowMap.enabled;rider.add(torso);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.34,18,14),helmetMat);helmet.scale.set(1,1.05,1.12);helmet.position.set(0,2.02,-.16);rider.add(helmet);
 const visor=new THREE.Mesh(new THREE.SphereGeometry(.29,16,12,0,Math.PI*2,.25,.75),visorMat);visor.scale.set(1.02,.73,.45);visor.position.set(0,2.02,-.43);rider.add(visor);
 const backpack=new THREE.Mesh(new THREE.BoxGeometry(.46,.55,.25),darkCloth);backpack.position.set(0,1.53,.42);rider.add(backpack);
 cylinderBetween(rider,[-.19,1.63,.02],[-.34,1.16,-.55],.105,jacket);cylinderBetween(rider,[.19,1.63,.02],[.34,1.16,-.55],.105,jacket);
 cylinderBetween(rider,[-.34,1.16,-.55],[-.43,1.13,-.5],.07,darkCloth);cylinderBetween(rider,[.34,1.16,-.55],[.43,1.13,-.5],.07,darkCloth);
 cylinderBetween(rider,[-.18,1.2,.12],[-.23,.54,.66],.13,darkCloth);cylinderBetween(rider,[.18,1.2,.12],[.23,.54,.66],.13,darkCloth);
 addBox(rider,.26,.18,.38,mat(0x11171e,.9,.08),-.23,.49,.56);addBox(rider,.26,.18,.38,mat(0x11171e,.9,.08),.23,.49,.56);
 bike.add(rider);const riderRig=new THREE.Group();riderRig.add(bike);riderRig.position.set(0,0,5);scene.add(riderRig);
 const desiredCamera=new THREE.Vector3(),desiredLook=new THREE.Vector3(),currentLook=new THREE.Vector3(0,2,-20);
 const state={progress:0,rideZ:5,rideX:0};
 function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?54:47;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.6));renderer.setSize(innerWidth,innerHeight,false);}
 addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
 function updateScene(progress,delta){
  state.progress=progress;state.rideZ=5-progress*155;state.rideX=Math.sin(progress*Math.PI*2.15)*.62;
  riderRig.position.set(state.rideX,0,state.rideZ);rider.rotation.z=Math.sin(progress*Math.PI*4.3)*-.035;
  wheels.forEach(w=>{w.rotation.x=-progress*155/.47;});
  const intro=smooth(progress/.14),mobile=innerWidth<700,followX=state.rideX+(mobile?1.25:2.35)+Math.sin(progress*5.2)*.32;
  const followY=mobile?4.25:4.75,followZ=state.rideZ+(mobile?8.4:10.3);
  desiredCamera.set(lerp(17,followX,intro),lerp(13,followY,intro),lerp(23,followZ,intro));
  desiredLook.set(lerp(0,state.rideX,intro),lerp(3.2,1.55,intro),lerp(-48,state.rideZ-8,intro));
  const ease=1-Math.exp(-Math.max(.001,delta)*4.2);camera.position.lerp(desiredCamera,ease);currentLook.lerp(desiredLook,ease);camera.lookAt(currentLook);
  setCaption(progress);progressBar.style.transform='scaleX('+progress.toFixed(4)+')';hudCoordinates.textContent='CITY · '+(progress*1.8).toFixed(1)+' KM';
 }
 function animate(now){
  requestAnimationFrame(animate);if(!visible)return;const delta=Math.min(.05,Math.max(.001,(now-lastFrame)/1000));lastFrame=now;
  if(autoPlaying&&!reducedMotion){currentProgress=clamp((now-autoStart)/rideDuration,0,1);if(currentProgress>=1){autoPlaying=false;updateControls();}}
  else if(manualMode)currentProgress=manualProgress();
  updateScene(currentProgress,delta);renderer.render(scene,camera);
 }
 window.__WORLD_READY__=true;window.__WORLD_DIAGNOSTICS__={renderer:'webgl',objects:scene.children.length,buildings:38,billboardCount:2,rider:true,motorcycle:true,instancedWindows:warmMatrices.length+coolMatrices.length+darkMatrices.length};
 document.documentElement.dataset.worldRenderer='webgl';loading.style.opacity='0';setTimeout(()=>{loading.hidden=true;},500);
 world={get progress(){return currentProgress;}};window.__WORLD_APP__={get progress(){return currentProgress;},get autoPlaying(){return autoPlaying;},get diagnostics(){return window.__WORLD_DIAGNOSTICS__;}};
 updateControls();requestAnimationFrame(animate);
}
boot();
})();