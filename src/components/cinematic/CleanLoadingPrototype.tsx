import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/*
 * Deterministic loading animation using original MERIDIANO GLB assets.
 * Scroll timing is preserved from the approved geometry prototype.
 */
const stages = [
  'READY / CONTAINER ON GROUND',
  'ALIGN SPREADER OVER CONTAINER',
  'LOWER TO TOP CORNER CASTINGS',
  'LOCK FOUR CORNERS',
  'LIFT CONTAINER CLEAR',
  'CARRY TOWARD TRAILER',
  'LOWER ONTO CHASSIS',
  'UNLOCK AND RETRACT',
  'TRUCK DEPARTS',
];
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t*t*(3-2*t); };
const between = (p:number,a:number,b:number) => smooth((p-a)/(b-a));
const C = { blue:0x102e55, orange:0xe7772a, red:0xb62d25, steel:0x596573, dark:0x101923, rubber:0x11171b };

function block(w:number,h:number,d:number,color:number,roughness=0.75) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness,metalness:0.12}));
  mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function beam(group:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color:number) {
  const mesh=block(w,h,d,color);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function wheel(radius:number,width:number) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,18),new THREE.MeshStandardMaterial({color:C.rubber,roughness:0.95}));
  m.rotation.z=Math.PI/2;m.castShadow=true;return m;
}
// Production assets: preserve the deterministic prototype choreography, replacing
// every visible placeholder with the user's actual GLB meshes.
const loader = new GLTFLoader();
const loadGLB = (path: string) => new Promise<THREE.Group>((resolve,reject) => {
  loader.load(path, gltf => resolve(gltf.scene), undefined, reject);
});
function fitModel(model: THREE.Group, size: [number,number,number]) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const dimensions = bounds.getSize(new THREE.Vector3());
  if (dimensions.x < 1e-6 || dimensions.y < 1e-6 || dimensions.z < 1e-6) throw new Error('Empty GLB model');
  const factor=Math.min(size[0]/dimensions.x,size[1]/dimensions.y,size[2]/dimensions.z);
  model.scale.setScalar(factor);
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  const center=fitted.getCenter(new THREE.Vector3());
  model.position.x-=center.x;
  model.position.y-=fitted.min.y;
  model.position.z-=center.z;
  model.traverse(obj=>{if((obj as THREE.Mesh).isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
  return model;
}
async function realContainer() {
  const group=new THREE.Group();
  const mesh=fitModel(await loadGLB('/models/container.glb'),[12.2,2.9,2.9]);
  group.add(mesh);
  return group;
}
async function realTruck() {
  const group=new THREE.Group();
  // The real trailer/chassis retains its geometry and textures.
  const chassis=fitModel(await loadGLB('/models/chassis.glb'),[12.65,1.55,2.48]);
  chassis.position.y=-0.20;group.add(chassis);
  // The supplied truck GLB is a separate asset; keep its materials and
  // normalize it into the tractor location in the original prototype.
  const tractor=fitModel(await loadGLB('/models/truck.glb'),[3.15,3.25,2.65]);
  tractor.position.set(8.05,0,0);group.add(tractor);
  return group;
}
async function realHandler() {
  const root=new THREE.Group();
  const glb=await loadGLB('/models/forklift.glb');
  // Original GLB's long vehicle axis is X, with the mast toward +X.
  // Rotate exactly once to face the +Z loading path; center and ground it.
  glb.rotation.y=-Math.PI/2;
  glb.updateMatrixWorld(true);
  const originalBox=new THREE.Box3().setFromObject(glb);
  const c=originalBox.getCenter(new THREE.Vector3());
  glb.position.set(-c.x,-originalBox.min.y,-c.z);
  glb.scale.setScalar(0.55);
  glb.position.multiplyScalar(0.55);
  root.add(glb);
  root.updateMatrixWorld(true);
  // The original model has 28 meshes and no animation clips. These three
  // geometry nodes are the long orange transverse top-lift spreader.
  // Reparent them while preserving world-space geometry; do not duplicate them.
  const spreaderMeshes:THREE.Object3D[]=[];
  glb.traverse(obj=>{
    if ((obj as THREE.Mesh).isMesh && /^(Cube\.015|Cube\.001|Cube)(_|$)/.test(obj.name)) spreaderMeshes.push(obj);
  });
  // Never blank the entire terminal when an optional spreader node differs.
  if(spreaderMeshes.length!==3) console.warn('Spreader nodes:',spreaderMeshes.map(o=>o.name));
  const carriage=new THREE.Group();root.add(carriage);
  const spreader=new THREE.Group();carriage.add(spreader);
  root.updateMatrixWorld(true);
  // Attach while preserving world transforms, then center the assembly as a group.
  // The old code subtracted a WORLD center from each LOCAL mesh position,
  // sending the original spreader pieces far away from the vehicle.
  for(const part of spreaderMeshes)spreader.attach(part);
  spreader.updateMatrixWorld(true);
  if(spreaderMeshes.length) {
    const b=new THREE.Box3().setFromObject(spreader);
    const center=b.getCenter(new THREE.Vector3());
    for(const part of spreaderMeshes)part.position.sub(center);
    spreader.updateMatrixWorld(true);
    const adjusted=new THREE.Box3().setFromObject(spreader);
    const dims=adjusted.getSize(new THREE.Vector3());
    const uniform=12.2/Math.max(dims.x,dims.z,0.001);
    spreader.scale.setScalar(Math.min(uniform,4));
  }
  // Position the top-lift at the SAME centerline as the approved prototype.
  // The carriage height below is updated by the unchanged 9-stage sequence.
  spreader.position.set(0,0,5.05);
  return {root,carriage,spreader,wheels:[] as THREE.Object3D[]};
}

export function CleanLoadingPrototype({ embedded = false, externalProgress }: { embedded?: boolean; externalProgress?: number } = {}) {
  const mount=useRef<HTMLDivElement>(null);
  const state=useRef({progress:0});
  const [progress,setProgress]=useState(0);
  // Scroll progress is authoritative when embedded on the real homepage.
  state.current.progress = embedded ? clamp(externalProgress ?? 0, 0, 1) : progress;
  const [playing,setPlaying]=useState(false);
  const [notice,setNotice]=useState('Loading original MERIDIANO 3D models…');
  const setP=(p:number)=>{const v=clamp(p,0,1);state.current.progress=v;setProgress(v);};
  useEffect(()=>{
    const el=mount.current;if(!el)return;
    let frame=0;let disposed=false;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x101a29);scene.fog=new THREE.Fog(0x101a29,35,95);
    const camera=new THREE.PerspectiveCamera(38,1,0.1,150);
    camera.position.set(25,19,26);camera.lookAt(0,1.8,-1.5);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xcde2ff,0x2a3138,2.1));
    const sun=new THREE.DirectionalLight(0xfff0d7,3.2);sun.position.set(-10,23,12);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene.add(sun);
    const ground=block(70,0.15,55,0x3b444f);ground.position.y=-0.12;ground.receiveShadow=true;scene.add(ground);
    const grid=new THREE.GridHelper(50,25,0x566271,0x566271);grid.position.y=0.005;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=0.24;scene.add(grid);
    // The trailer is offset +Z from the ground container, so the machine must DRIVE with its load.
    // GLBs load asynchronously. Nothing animates until all four original
    // assets have loaded, avoiding a temporary toy-model flash.
    let loaded: null | {trailer:THREE.Group;load:THREE.Group;machine:Awaited<ReturnType<typeof realHandler>>}=null;
    Promise.all([realTruck(),realContainer(),realHandler()]).then(([trailer,load,machine])=>{
      if(disposed)return;
      trailer.position.z=4.2;scene.add(trailer);
      load.position.z=-4.2;scene.add(load);
      machine.root.position.z=-10.4;scene.add(machine.root);
      loaded={trailer,load,machine};
      setNotice('');
    }).catch(error=>{if(!disposed){console.error('MERIDIANO original GLB loading failed',error);setNotice('3D model loading error: '+String(error));}});
    const deckHeight=1.31, boxHeight=2.6;
    const apply=(p:number)=>{
      if(!loaded)return;
      const {trailer,load,machine}=loaded;
      const approach=between(p,0.04,0.17);
      const descend=between(p,0.17,0.28);
      const lift=between(p,0.39,0.51);
      const carry=between(p,0.51,0.67);
      const lower=between(p,0.67,0.78);
      const retract=between(p,0.84,0.94);
      const depart=between(p,0.94,1);
      // Handler forward is +Z. Mast at +2.05 and spreader at +5.05 relative to vehicle.
      // Initial vehicle -10.4 => spreader center -5.35. Approach +1.15 => -4.2.
      const forward=1.15*approach+8.4*carry-2.3*retract;
      machine.root.position.z=-10.4+forward;
      // The spreader underside is y=carriageY - 0.21. Top of container = 2.6.
      // Before lock it starts higher, descends to top, then lifts vertically.
      const pickupSpreader=3.58-0.76*descend+1.65*lift-0.55*lower;
      machine.carriage.position.y=pickupSpreader;
      // Attachment only follows after locking and before release.
      const locked=p>=0.35&&p<0.84;
      if(locked){
        load.position.z=-4.2+8.4*carry;
        // The container bottom rises by 1.65, then lowers to deck height 1.31.
        load.position.y=1.65*lift-0.34*lower;
      } else if(p>=0.84){
        load.position.set(0,deckHeight,4.2);
      } else {load.position.set(0,0,-4.2);}
      // Top-contact alignment (no underside grab): y of spreader locking feet = top of container.
      // Move the truck only after the spreader has fully released.
      trailer.position.x=3.8*depart;trailer.position.z=4.2;
      machine.wheels.forEach(w=>{w.rotation.x=forward/0.64;});
    };
    let dragging=false,prevX=0,azimuth=0;
    const down=(e:PointerEvent)=>{dragging=true;prevX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(dragging){azimuth+=((e.clientX-prevX)/el.clientWidth)*2;prevX=e.clientX;camera.position.set(31*Math.cos(0.77+azimuth),19,31*Math.sin(0.77+azimuth));camera.lookAt(0,1.8,-1.5);}};
    const up=()=>{dragging=false;};
    if(!embedded){renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);}
    const resize=()=>{if(!el.isConnected)return;const w=Math.max(el.clientWidth,1),h=Math.max(el.clientHeight,1);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const animate=()=>{if(disposed)return;apply(state.current.progress);renderer.render(scene,camera);frame=requestAnimationFrame(animate);};animate();
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.dispose();scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(mat=>mat.dispose());}});if(el.contains(renderer.domElement))el.removeChild(renderer.domElement);};
  },[]);
  useEffect(()=>{if(embedded || !playing)return;let id=0;let last=0;const tick=(time:number)=>{if(!last)last=time;const p=Math.min(1,state.current.progress+(time-last)/18000);last=time;setP(p);if(p<1)id=requestAnimationFrame(tick);else setPlaying(false);};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);},[playing,embedded]);
  const index=Math.min(8,Math.floor(progress*9));
  return <div style={{position:'relative',height:'100vh',minHeight:embedded?0:560,background:'#101a29',color:'white',fontFamily:'Inter,system-ui,sans-serif',overflow:'hidden',pointerEvents:embedded?'none':'auto'}}>
    <div ref={mount} style={{position:'absolute',inset:0}}/>
    {!embedded && <div style={{position:'absolute',top:24,left:30,pointerEvents:'none'}}>
      <div style={{fontSize:22,fontWeight:900,letterSpacing:'.27em'}}>MERIDIANO</div>
      <div style={{fontSize:10,letterSpacing:'.3em',color:'#79b6f4',marginTop:6}}>PRECISION LOADING LAB / V1</div>
    </div>}
    {!embedded && <a href="/?mode=journey" style={{position:'absolute',right:28,top:28,color:'#c7d7eb',fontSize:12,textDecoration:'none',background:'#111b2dcc',padding:'10px 16px',border:'1px solid #4a5c71',borderRadius:24}}>← Original website</a>}
    {!embedded && <div style={{position:'absolute',left:30,bottom:35,right:30,maxWidth:780,background:'#0c1522e8',border:'1px solid #3d526b',borderRadius:14,padding:'20px 22px',boxShadow:'0 12px 36px #0008'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div><div style={{fontSize:10,color:'#82a8d4',letterSpacing:'.16em'}}>STAGE {String(index+1).padStart(2,'0')} / 09</div><div style={{fontSize:16,fontWeight:700,marginTop:5}}>{stages[index]}</div></div>
        <div style={{fontSize:12,color:'#b3c4d6'}}>Drag the scene to orbit · Scrub to inspect</div>
      </div>
      <input aria-label="Loading sequence progress" type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={e=>{setPlaying(false);setP(Number(e.target.value)/1000);}} style={{width:'100%',margin:'19px 0 14px',accentColor:'#ef812c',cursor:'pointer'}}/>
      <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>{if(progress>=1)setP(0);setPlaying(!playing);}} style={{background:'#f28b32',border:0,borderRadius:8,padding:'10px 17px',fontWeight:800,cursor:'pointer',color:'#111827'}}>{playing?'Pause':'▶ Play sequence'}</button>
        <button onClick={()=>{setPlaying(false);setP(0);}} style={{background:'#28394b',border:'1px solid #455c74',color:'white',borderRadius:8,padding:'10px 14px',cursor:'pointer'}}>Reset</button>
        <button onClick={()=>{setPlaying(false);setP(Math.min(1,(index+1)/9+0.001));}} style={{background:'#28394b',border:'1px solid #455c74',color:'white',borderRadius:8,padding:'10px 14px',cursor:'pointer'}}>Next stage →</button>
        <span style={{marginLeft:'auto',fontVariantNumeric:'tabular-nums',color:'#91accb',fontSize:13}}>{Math.round(progress*100)}%</span>
      </div>
      {notice&&<div style={{marginTop:10,color:'#efb46f',fontSize:12}}>{notice}</div>}
    </div>}
    {embedded && notice && <div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',fontSize:13,color:'#fff',background:'#101a29dd',padding:'14px 20px',borderRadius:8,zIndex:3,pointerEvents:'none'}}>{notice}</div>}
    {!embedded && <div style={{position:'absolute',right:26,bottom:35,fontSize:11,color:'#90a4bb',maxWidth:250,textAlign:'right',pointerEvents:'none'}}>Real MERIDIANO GLB assets · deterministic loading choreography</div>}
  </div>;
}
