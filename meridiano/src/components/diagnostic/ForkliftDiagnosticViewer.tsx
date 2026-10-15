import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { getModelUrl } from '../../utils/modelUrl';

interface ForkliftDiagnosticViewerProps {
  onSwitchToCinematic?: () => void;
}

export const ForkliftDiagnosticViewer: React.FC<ForkliftDiagnosticViewerProps> = ({
  onSwitchToCinematic,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing WebGL canvas...');
  const [modelStats, setModelStats] = useState<{
    size: string;
    center: string;
    meshCount: number;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // STEP 5: Required Console Log
    console.log('MERIDIANO 3D CANVAS MOUNTED');
    setStatusMessage('Canvas mounted. Setting up camera and lights...');

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Visible Neutral Studio Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Clearly visible neutral slate studio background

    // 2. Camera placed in front
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.8, 5.5);
    camera.lookAt(0, 0.8, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // 4. Lighting: Ambient + Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(10, 20, 15);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.2);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    // Subtle studio floor grid for spatial depth
    const gridHelper = new THREE.GridHelper(10, 20, 0x38bdf8, 0x334155);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Group wrapper for forklift
    const forkliftGroup = new THREE.Group();
    scene.add(forkliftGroup);

    // 5. Load Forklift Model
    const loader = new GLTFLoader();
    const modelUrl = getModelUrl('forklift.glb');

    // STEP 5: Required Console Log
    console.log('LOADING FORKLIFT');
    setStatusMessage(`Requesting model from ${modelUrl}...`);

    let isMounted = true;

    const applyModel = (rawScene: THREE.Group) => {
      // Calculate bounding box using THREE.Box3
      const box = new THREE.Box3().setFromObject(rawScene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center the model inside wrapper
      rawScene.position.set(-center.x, -box.min.y, -center.z);
      forkliftGroup.add(rawScene);

      // Normalize display scale based on its bounding box
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 3.2;
      const normalizedScale = maxDim > 0 ? targetSize / maxDim : 1;
      forkliftGroup.scale.setScalar(normalizedScale);

      // Place directly in front of camera at origin
      forkliftGroup.position.set(0, 0, 0);

      let meshCount = 0;
      rawScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshCount++;
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // STEP 5: Required Console Log
      console.log('FORKLIFT LOADED');
      console.log('FORKLIFT BOUNDING BOX:', {
        size: `${size.x.toFixed(2)}m x ${size.y.toFixed(2)}m x ${size.z.toFixed(2)}m`,
        center: `${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
        scale: normalizedScale,
        meshCount,
      });

      if (isMounted) {
        setLoadStatus('loaded');
        setStatusMessage('Forklift successfully mounted and rendered in 3D WebGL!');
        setModelStats({
          size: `${size.x.toFixed(2)}m × ${size.y.toFixed(2)}m × ${size.z.toFixed(2)}m`,
          center: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`,
          meshCount,
        });
      }
    };

    // Load with primary URL, and fallback if needed
    loader.load(
      modelUrl,
      (gltf) => {
        applyModel(gltf.scene);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setStatusMessage(`Downloading forklift: ${pct}% (${(xhr.loaded / 1024).toFixed(0)} KB)`);
        }
      },
      (err) => {
        console.error('FORKLIFT LOAD ERROR on primary URL:', modelUrl, err);
        // Fallback attempt: try alternate path
        const fallbackUrl = `/public/models/forklift.glb`;
        console.log('Attempting fallback URL:', fallbackUrl);
        loader.load(
          fallbackUrl,
          (gltfFallback) => {
            applyModel(gltfFallback.scene);
          },
          undefined,
          (errFallback) => {
            console.error('FORKLIFT LOAD ERROR on fallback URL:', fallbackUrl, errFallback);
            if (isMounted) {
              setLoadStatus('error');
              const message = err instanceof Error ? err.message : String(err);
              setStatusMessage(`Error loading forklift: ${message || 'Unknown error'}`);
            }
          }
        );
      }
    );

    // 6. Direct Immediate Render Loop (No ScrollTrigger, No Scroll Dependencies)
    let animationFrameId: number;
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      // Gentle auto-rotation to make 3D nature obvious immediately
      if (forkliftGroup) {
        forkliftGroup.rotation.y += 0.007;
      }

      renderer.render(scene, camera);
    };
    renderLoop();

    // 7. Window Resize Handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#1e293b] text-white overflow-hidden">
      {/* FULL-SCREEN 3D CANVAS */}
      <div className="fixed inset-0 w-screen h-screen z-0">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />
      </div>

      {/* DIAGNOSTIC TOP BAR HUD */}
      <div className="fixed top-5 left-5 right-5 z-40 flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
              PRODUCTION DIAGNOSTIC MODE
            </div>
            <div className="text-[11px] text-slate-300 font-sans">
              Standalone 3D View: Forklift Model Inspection
            </div>
          </div>
        </div>

        {onSwitchToCinematic && (
          <button
            type="button"
            onClick={onSwitchToCinematic}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            <Layers className="w-4 h-4" />
            Switch to Cinematic Experience (800vh)
          </button>
        )}
      </div>

      {/* DIAGNOSTIC STATUS PANEL (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-40 max-w-md w-full pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              Live Diagnostic Telemetry
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {loadStatus === 'loading' && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> LOADING
                </span>
              )}
              {loadStatus === 'loaded' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 3D VISIBLE & ACTIVE
                </span>
              )}
              {loadStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-red-400 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> LOAD ERROR
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-300 font-mono mb-2">
            Status: <span className="text-white">{statusMessage}</span>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800">
            <div>URL: <span className="text-sky-300">/models/forklift.glb</span></div>
            {modelStats && (
              <>
                <div>Dimensions: <span className="text-emerald-300">{modelStats.size}</span></div>
                <div>Center Offset: <span className="text-slate-300">{modelStats.center}</span></div>
                <div>Mesh Nodes: <span className="text-slate-300">{modelStats.meshCount}</span></div>
              </>
            )}
            <div>Console: <span className="text-slate-300">"MERIDIANO 3D CANVAS MOUNTED" ✓</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
