import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Mechanism-only test: no truck and no horizontal movement.
export function RealHandlerRigTest() {
  const mount = useRef<HTMLDivElement>(null);
  const apply = useRef<((value:number)=>void)|null>(null);
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [status,setStatus]=useState('Loading original forklift.glb…');
  const progressRef=useRef(0), playingRef=useRef(false);
  useEffect(()=>{progressRef.current=progress;apply.current?.(progress);},[progress]);
  useEffect(()=>{playingRef.current=playing;},[playing]);
  useEffect(()=>{
    const host=mount.current;
    if(!host)return;
    let disposed=false;
    const scene=new THREE.Scene();scene.background=new THREE.Color('#121b27');
    const camera=new THREE.PerspectiveCamera(38,1,.1,100);
    camera.position.set(11,8,16);camera.lookAt(-2,2.15,0);
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe9f2ff,0x3e4c5a,2.6));
    const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-7,15,11);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;
    sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;scene.add(sun);
    const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.22});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(45,45),material('#29343e'));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const grid=new THREE.GridHelper(30,30,0x556476,0x354554);grid.position.y=.015;scene.add(grid);
    const container=new THREE.Group();scene.add(container);
    const blue=material('#287aa9'),ridge=material('#174e72'),corner=material('#c6b27a');
    const addBox=(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
    };
    // Matches measured spreader width (2.14) and length (8.34), with a small clearance.
    const containerWidth=2.04,containerLength=8.12,containerHeight=2.20;
    addBox(container,containerWidth,containerHeight,containerLength,blue,0,containerHeight/2,0);
    for(let z=-3.85;z<3.86;z+=.36){
      addBox(container,.045,containerHeight-.16,.045,ridge,-containerWidth/2-.018,containerHeight/2,z);
      addBox(container,.045,containerHeight-.16,.045,ridge,containerWidth/2+.018,containerHeight/2,z);
    }
    for(const x of [-.93,.93])for(const z of [-3.94,3.94])
      addBox(container,.17,.06,.17,corner,x,containerHeight+.03,z);
    new GLTFLoader().load('/models/forklift.glb',({scene:machine})=>{
      if(disposed)return;
      scene.add(machine);
      machine.updateMatrixWorld(true);
      const raw=new THREE.Box3().setFromObject(machine);
      machine.position.y=-raw.min.y;
      machine.updateMatrixWorld(true);
      // The mast MUST stay on the machine: Cylinder.008 and Cube.005 are NOT lifted.
      // Loader1's horizontal spreader parts plus loader2's carriage move together.
      const movingNames=[
        'Cube_loader1_0','Cube.001_loader1_0','Cube.002_loader1_0',
        'Cube.014_loader1_0','Cube.015_loader1_0','Cylinder.007_loader1_0',
        'Cube.003_loader2_0','Cube.004_loader2_0',
        'Cube.013_loader2_0','Cylinder.006_loader2_0',
        'Cube.011_loader5_0','Cube.006_loader5_0','Cube.007_loader5_0'
      ];
      const moving=new THREE.Group();moving.name='MovingCarriageAndSpreader';scene.add(moving);
      // GLTFLoader sanitizes Blender dots in object names (Cube.001 -> Cube_001).
      // Resolve by normalized names, rather than assuming the raw GLB node names survive.
      const normalize=(s:string)=>s.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
      const nodes:THREE.Object3D[]=[];
      machine.traverse(o=>nodes.push(o));
      // These exact GLB meshes were identified as floating artifacts in Blender.
      // Cylinder.005 and .009 belong to loader4; Cylinder.019 belongs to loader5.
      const floatingNames=new Set([
        normalize('Cylinder.005_loader4_0'),
        normalize('Cylinder.009_loader4_0'),
        normalize('Cylinder.019_loader5_0')
      ]);
      machine.traverse(o=>{
        if((o as THREE.Mesh).isMesh && floatingNames.has(normalize(o.name)))o.visible=false;
      });
      const found:string[]=[];
      for(const name of movingNames){
        const key=normalize(name);
        const mesh=nodes.find(o=>(o as THREE.Mesh).isMesh && normalize(o.name)===key);
        if(mesh){moving.attach(mesh);found.push(name);}
      }
      // Include any remaining small carriage fittings, but never the tall mast.

      machine.traverse(o=>{if((o as THREE.Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});
      moving.traverse(o=>{if((o as THREE.Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});
      machine.updateMatrixWorld(true);moving.updateMatrixWorld(true);
      // Measure only the horizontal spreader components, never the tall mast.
      const spreaderObjects=['Cube.001_loader1_0','Cube.015_loader1_0','Cube_loader1_0'];
      const spreaderBox=new THREE.Box3();
      for(const name of spreaderObjects){const mesh=moving.children.find(o=>normalize(o.name)===normalize(name));if(mesh)spreaderBox.expandByObject(mesh);}
      const spreaderCenter=spreaderBox.getCenter(new THREE.Vector3());
      container.position.set(spreaderCenter.x,0,spreaderCenter.z);
      // The underside of the spreader is measured from its real mesh geometry.
      const contactY=containerHeight+.07;
      const drop=Math.max(0,spreaderBox.min.y-contactY);
      const rise=1.65;
      // Artificial floating chain/pulley props removed.
      const smooth=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
      const phase=(p:number,a:number,b:number)=>smooth((p-a)/(b-a));
      apply.current=(p:number)=>{
        const down=phase(p,.05,.26);
        const lift=phase(p,.35,.57);
        const lower=phase(p,.66,.84);
        const release=phase(p,.90,1);
        const height=rise*(lift-lower);
        const travel=-drop*down+height+.5*release;
        moving.position.y=travel;
        container.position.y=height;
        // The container stays on the ground until the spreader reaches the fittings.
        if(p<.30)container.position.y=0;
      };
      apply.current(progressRef.current);
      setStatus(`Full front assembly • ${found.length}/${movingNames.length} real meshes grouped • mast fixed • floating artifacts hidden • spreader underside ${spreaderBox.min.y.toFixed(2)} • travel ${drop.toFixed(2)}`);
    },undefined,error=>setStatus(`Model failed to load: ${String(error)}`));
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    let raf=0,last=performance.now();
    const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;
      if(playingRef.current){const next=Math.min(1,progressRef.current+dt/12);progressRef.current=next;apply.current?.(next);setProgress(next);if(next>=1){playingRef.current=false;setPlaying(false);}}
      renderer.render(scene,camera);raf=requestAnimationFrame(tick);
    };raf=requestAnimationFrame(tick);
    return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();apply.current=null;renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div style={{minHeight:'100vh',padding:18,background:'#121b27',color:'#eaf1fa',fontFamily:'system-ui',boxSizing:'border-box'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
      <div><strong style={{letterSpacing:2}}>MERIDIANO / FULL FRONT MECHANISM</strong><div style={{fontSize:12,color:'#aebdd0'}}>Entire front carriage + spreader → lower → lift → lower. Floating artifacts hidden. No truck.</div></div>
      <a href="/" style={{color:'#9fcaff'}}>← Website</a>
    </div>
    <div ref={mount} style={{height:'min(73vh,750px)',minHeight:350,border:'1px solid #405064',borderRadius:10,overflow:'hidden',marginTop:12}} />
    <div style={{display:'flex',alignItems:'center',gap:12,marginTop:15,flexWrap:'wrap'}}>
      <button onClick={()=>{if(progress>=1){setProgress(0);progressRef.current=0;apply.current?.(0);}setPlaying(!playing);}} style={{padding:'11px 20px',background:'#2769bb',color:'white',border:0,borderRadius:7,cursor:'pointer'}}>{playing?'Pause':'Play full front mechanism'}</button>
      <button onClick={()=>{setPlaying(false);setProgress(0);progressRef.current=0;apply.current?.(0);}} style={{padding:'11px 18px',background:'#38485a',color:'white',border:0,borderRadius:7,cursor:'pointer'}}>Reset</button>
      <input aria-label="Mechanism animation progress" type="range" min="0" max="1" step=".001" value={progress} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value));}} style={{flex:1,minWidth:180}} />
      <span>{Math.round(progress*100)}%</span>
    </div>
    <p style={{fontSize:12,color:'#aebdd0'}}>{status}</p>
    <p style={{fontSize:12,color:'#889aaf'}}>Isolated test only. Your homepage is unchanged.</p>
  </div>;
}
