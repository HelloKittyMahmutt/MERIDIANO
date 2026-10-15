import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getModelUrl } from '../../utils/modelUrl';

/** Focused movement preview. Material-group lift is provisional, not a mechanical rig. */
export const ForkliftDiagnosticViewer: React.FC<{ onSwitchToCinematic?: () => void }> = () => {
  const mount = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const motion = useRef({ height: 0, playing: false });
  motion.current = { height, playing };

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101a2b');
    scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x394353, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(15, 25, 10);
    scene.add(sun);
    scene.add(new THREE.GridHelper(80, 80, 0x4776a3, 0x293a52));
    const camera = new THREE.PerspectiveCamera(43, 1, 0.01, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 70;
    const root = new THREE.Group();
    scene.add(root);
    const movable: THREE.Mesh[] = [];
    const rest = new Map<THREE.Mesh, THREE.Vector3>();
    const resize = () => {
      if (disposed) return;
      const w = host.clientWidth || 800;
      const h = host.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    new GLTFLoader().load(getModelUrl('forklift.glb'), gltf => {
      if (disposed) return;
      const raw = gltf.scene;
      raw.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(raw);
      const center = box.getCenter(new THREE.Vector3());
      const dims = box.getSize(new THREE.Vector3());
      const scale = 10 / Math.max(dims.x, dims.y, dims.z);
      raw.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      raw.scale.setScalar(scale);
      root.add(raw);
      raw.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mesh = obj;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const name = material?.name || '';
        const isLiftingMaterial = name.includes('loader1') || name.includes('loader2');
        const isFixedMast = mesh.name.startsWith('Cube005_loader2_0');
        if (isLiftingMaterial && !isFixedMast) {
          movable.push(mesh);
          rest.set(mesh, mesh.position.clone());
        }
      });
      const fitted = new THREE.Box3().setFromObject(root);
      const size = fitted.getSize(new THREE.Vector3());
      controls.target.set(0, size.y * 0.45, 0);
      camera.position.set(size.x * 1.6 + 8, size.y * 0.9 + 5, size.z * 1.7 + 10);
      camera.lookAt(controls.target);
      controls.update();
    }, undefined, err => { if (!disposed) setError('Could not load forklift.glb: ' + String(err)); });
    let frame = 0;
    const render = (time: number) => {
      if (disposed) return;
      const h = motion.current.playing
        ? (0.5 - 0.5 * Math.cos(time * 0.0013)) * 3
        : motion.current.height;
      for (const mesh of movable) {
        mesh.position.copy(rest.get(mesh)!);
      }
      root.updateMatrixWorld(true);
      for (const mesh of movable) {
        if (!mesh.parent) continue;
        const inverse = new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert();
        const localUp = new THREE.Vector3(0, 1, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(inverse));
        mesh.position.addScaledVector(localUp, h);
      }
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div style={{height:'100vh',width:'100%',background:'#101a2b',color:'#f3f6fc',fontFamily:'system-ui',display:'flex',flexDirection:'column'}}>
    <header style={{display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:'1px solid #34445c'}}>
      <strong>MERIDIANO — FRONT LIFT TEST</strong>
      <a href="/?mode=journey" style={{marginLeft:'auto',color:'#9ac6ff'}}>← Website</a>
    </header>
    <div style={{position:'relative',flex:1,minHeight:0}}>
      <div ref={mount} style={{position:'absolute',inset:0}} />
      <div style={{position:'absolute',right:18,top:18,width:'min(310px, calc(100% - 36px))',boxSizing:'border-box',padding:20,background:'#111e31ee',border:'1px solid #ef9c18',borderRadius:14,boxShadow:'0 8px 30px #0008'}}>
        <div style={{fontSize:17,fontWeight:800,marginBottom:6}}>Front lifting movement</div>
        <p style={{fontSize:12,color:'#adc0d8',lineHeight:1.5,margin:'0 0 20px'}}>Move the orange lifting assembly up and down. Drag the model to rotate the camera.</p>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}><span>Lower</span><span>Raise</span></div>
        <input aria-label="Front lift height" type="range" min="0" max="3" step="0.05" value={height} disabled={playing} onChange={e=>setHeight(Number(e.target.value))} style={{width:'100%',accentColor:'#f59e0b',cursor:'pointer'}} />
        <div style={{display:'flex',gap:9,marginTop:20}}>
          <button onClick={()=>setPlaying(v=>!v)} style={{flex:1,border:0,borderRadius:8,padding:'12px 8px',background:'#f59e0b',color:'#101827',fontWeight:800,cursor:'pointer'}}>{playing?'Ⅱ Pause':'▶ Play lift'}</button>
          <button onClick={()=>{setPlaying(false);setHeight(0);}} style={{flex:1,border:'1px solid #627b9a',borderRadius:8,padding:'12px 8px',background:'#253955',color:'#fff',fontWeight:700,cursor:'pointer'}}>↺ Reset</button>
        </div>
        {error && <p style={{color:'#ff9b9b',fontSize:12}}>{error}</p>}
        <p style={{fontSize:11,color:'#9aadc7',lineHeight:1.5,margin:'18px 0 0'}}>Movement preview only. The real hydraulic linkage is not yet rigged; your main website is unchanged.</p>
      </div>
    </div>
  </div>;
};
