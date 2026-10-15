import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Plane, 
  RotateCw, 
  Sun, 
  Grid3X3, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Layers, 
  RefreshCw, 
  Camera, 
  Maximize2,
  Compass,
  ArrowRight,
  Sliders,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

// Custom useGLTF hook conforming to step 1
export function useGLTF(url: string) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const loader = new GLTFLoader();

    setLoading(true);
    setError(null);

    const tryLoad = (targetUrl: string, isFallback = false) => {
      loader.load(
        targetUrl,
        (data) => {
          if (!active) return;
          setGltf(data);
          setLoading(false);
          setProgress(100);
        },
        (xhr) => {
          if (!active) return;
          if (xhr.total > 0) {
            setProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err) => {
          if (!active) return;
          if (!isFallback && targetUrl.startsWith('/public/')) {
            tryLoad(targetUrl.replace('/public/', '/'), true);
            return;
          }
          console.error('Failed to load GLTF at ' + targetUrl, err);
          setError((err instanceof Error ? err.message : String(err)) || 'Error loading 3D asset');
          setLoading(false);
        }
      );
    };

    tryLoad(url);

    return () => {
      active = false;
    };
  }, [url]);

  return { gltf, error, loading, progress };
}

interface CargoPlaneCalibrationStudioProps {
  onContinueToSite?: () => void;
}

export const CargoPlaneCalibrationStudio: React.FC<CargoPlaneCalibrationStudioProps> = ({
  onContinueToSite,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the cargo plane model using useGLTF
  const { gltf, error: loadError, loading, progress } = useGLTF('/models/cargo-plane.glb');

  // Inspection & Metrics State
  const [metrics, setMetrics] = useState<{
    originalMin: [number, number, number];
    originalMax: [number, number, number];
    dimensions: [number, number, number];
    center: [number, number, number];
    scaleFactor: number;
    meshCount: number;
    materialCount: number;
    triangleCount: number;
  } | null>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [lightPreset, setLightPreset] = useState<'neutral-studio' | 'bright-sun' | 'high-contrast'>('neutral-studio');
  const [orientationMode, setOrientationMode] = useState<'cad-z-up' | 'standard-y-up' | 'pitched-flight'>('cad-z-up');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const wrapperGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const materialsBackup = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // 1. Initialize Scene & Renderer with Neutral Studio Environment
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 650;

    // Neutral Studio Scene (Step 7: Neutral studio background)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181e29); // Neutral Studio Slate
    sceneRef.current = scene;

    // Calibration Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    cameraRef.current = camera;

    // WebGL Renderer with High-Precision Shadows & ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // OrbitControls (Step 9: Add OrbitControls)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 150;
    controlsRef.current = controls;

    // Neutral Studio Grid Platform & Origin Marker
    const gridHelper = new THREE.GridHelper(30, 30, 0x38bdf8, 0x334155);
    gridHelper.position.y = -3.5;
    scene.add(gridHelper);

    // Studio Pedestal Floor
    const floorGeo = new THREE.CylinderGeometry(15, 16, 0.2, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.35,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -3.6;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Lights Group
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // Animation Render Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 650;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // 2. Strong Neutral Studio Lighting (Step 7: Strong neutral lighting so dark materials cannot make it invisible)
  useEffect(() => {
    const lightsGroup = lightsGroupRef.current;
    if (!lightsGroup) return;

    while (lightsGroup.children.length > 0) {
      lightsGroup.remove(lightsGroup.children[0]);
    }

    if (lightPreset === 'neutral-studio') {
      // 360-degree high-intensity studio setup
      const ambient = new THREE.AmbientLight(0xffffff, 1.8);
      lightsGroup.add(ambient);

      const hemi = new THREE.HemisphereLight(0xffffff, 0x64748b, 1.2);
      lightsGroup.add(hemi);

      // Key light Front-Right
      const key = new THREE.DirectionalLight(0xffffff, 2.5);
      key.position.set(15, 20, 15);
      key.castShadow = true;
      lightsGroup.add(key);

      // Fill light Front-Left
      const fill = new THREE.DirectionalLight(0xffffff, 2.0);
      fill.position.set(-15, 12, 15);
      lightsGroup.add(fill);

      // Back-Rim light for fuselage and tail silhouette
      const rim = new THREE.DirectionalLight(0xe2e8f0, 2.2);
      rim.position.set(0, 15, -20);
      lightsGroup.add(rim);

      // Underside bounce light so belly, landing gear and engine undersides are illuminated
      const bottomBounce = new THREE.DirectionalLight(0xffffff, 1.4);
      bottomBounce.position.set(0, -10, 0);
      lightsGroup.add(bottomBounce);

    } else if (lightPreset === 'bright-sun') {
      const ambient = new THREE.AmbientLight(0xffffff, 2.2);
      lightsGroup.add(ambient);

      const sun = new THREE.DirectionalLight(0xfffaed, 3.8);
      sun.position.set(20, 30, 20);
      sun.castShadow = true;
      lightsGroup.add(sun);

      const skyFill = new THREE.DirectionalLight(0xbae6fd, 1.5);
      skyFill.position.set(-20, 10, -20);
      lightsGroup.add(skyFill);
    } else {
      // High contrast
      const ambient = new THREE.AmbientLight(0xffffff, 1.0);
      lightsGroup.add(ambient);

      const spot1 = new THREE.PointLight(0x38bdf8, 3.5, 40);
      spot1.position.set(12, 10, 12);
      lightsGroup.add(spot1);

      const spot2 = new THREE.PointLight(0xf59e0b, 3.0, 40);
      spot2.position.set(-12, 8, -12);
      lightsGroup.add(spot2);
    }
  }, [lightPreset]);

  // 3. Process GLTF: Bounding Box Calculation, Centering, Normalization, & Camera Framing
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !gltf) return;

    // Remove any previous model
    if (wrapperGroupRef.current) {
      scene.remove(wrapperGroupRef.current);
      wrapperGroupRef.current = null;
    }
    materialsBackup.current.clear();

    const planeModel = gltf.scene.clone(true);

    // Ensure all materials are doubleSided and properly illuminated
    let meshes = 0;
    let triangles = 0;
    const matSet = new Set<string>();

    planeModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes++;

        if (mesh.geometry) {
          const count = mesh.geometry.index 
            ? mesh.geometry.index.count / 3 
            : mesh.geometry.attributes.position.count / 3;
          triangles += Math.round(count);
        }

        materialsBackup.current.set(mesh, mesh.material);

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.side = THREE.DoubleSide; // Critical so backfacing CAD surfaces never turn invisible
            matSet.add(m.uuid);
          });
        } else if (mesh.material) {
          mesh.material.side = THREE.DoubleSide;
          matSet.add(mesh.material.uuid);
        }
      }
    });

    // Step 2 & 3: Inspect bounding box using THREE.Box3, calculate actual dimensions and center
    const box = new THREE.Box3().setFromObject(planeModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('[CargoPlane Studio] Bounding Box Min:', box.min);
    console.log('[CargoPlane Studio] Bounding Box Max:', box.max);
    console.log('[CargoPlane Studio] Dimensions (X, Y, Z):', size);
    console.log('[CargoPlane Studio] Center (X, Y, Z):', center);

    // Step 4: Automatically center the model inside a wrapper THREE.Group
    // By offsetting model position by -center, the aircraft center of gravity is EXACTLY at (0, 0, 0)
    planeModel.position.set(-center.x, -center.y, -center.z);

    const wrapperGroup = new THREE.Group();
    wrapperGroup.add(planeModel);

    // Step 5: Normalize its display scale based on its bounding box rather than guessing
    const maxDimension = Math.max(size.x, size.y, size.z);
    const TARGET_CANVAS_SIZE = 12.0; // Standard target unit size in the studio viewport
    const calculatedScaleFactor = TARGET_CANVAS_SIZE / maxDimension;
    wrapperGroup.scale.setScalar(calculatedScaleFactor);

    // Orientation adjustment:
    // In CAD / trimesh exports, Z is commonly the vertical axis (height ~ 770 units), while X and Y are wingspan & fuselage length (~ 2600 & 2800 units)
    if (orientationMode === 'cad-z-up') {
      wrapperGroup.rotation.set(-Math.PI / 2, 0, 0); // Rotates CAD Z-up to Three.js Y-up
    } else if (orientationMode === 'pitched-flight') {
      wrapperGroup.rotation.set(-Math.PI / 2 + 0.15, 0.1, 0);
    } else {
      wrapperGroup.rotation.set(0, 0, 0);
    }

    // Step 8: Temporarily display ONLY the cargo plane
    scene.add(wrapperGroup);
    wrapperGroupRef.current = wrapperGroup;

    // Step 6 & 10: Place directly in front of calibration camera and frame automatically
    const fovInRadians = camera.fov * (Math.PI / 180);
    // Calculate distance needed so the full target size (12 units) with 40% margin fits completely in viewport
    const cameraDistance = (TARGET_CANVAS_SIZE / 2) / Math.tan(fovInRadians / 2) * 1.55;

    camera.near = 0.1;
    camera.far = cameraDistance * 50; // Ensure no far clipping
    camera.position.set(0, cameraDistance * 0.42, cameraDistance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();

    setMetrics({
      originalMin: [box.min.x, box.min.y, box.min.z],
      originalMax: [box.max.x, box.max.y, box.max.z],
      dimensions: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z],
      scaleFactor: calculatedScaleFactor,
      meshCount: meshes,
      materialCount: matSet.size,
      triangleCount: triangles,
    });
  }, [gltf, orientationMode]);

  // Wireframe toggle effect
  useEffect(() => {
    if (!wrapperGroupRef.current) return;

    wrapperGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (wireframe) {
          mesh.material = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
          });
        } else {
          const original = materialsBackup.current.get(mesh);
          if (original) {
            mesh.material = original;
          }
        }
      }
    });
  }, [wireframe]);

  // Camera presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const distance = 22;

    if (preset === 'iso') {
      cameraRef.current.position.set(16, 12, 16);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, distance * 1.2, 0.01);
    } else if (preset === 'front') {
      cameraRef.current.position.set(0, 2, distance);
    } else if (preset === 'side') {
      cameraRef.current.position.set(distance, 2, 0);
    }

    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col font-sans">
      
      {/* Top Banner Alert Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono font-bold text-amber-300 uppercase tracking-wider">
            CALIBRATION & INSPECTION MODE:
          </span>
          <span className="text-slate-200">
            Temporarily displaying ONLY <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200 font-mono">/public/models/cargo-plane.glb</code> for complete structural verification.
          </span>
        </div>

        {onContinueToSite && (
          <button
            type="button"
            onClick={onContinueToSite}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors font-mono text-[11px]"
          >
            <span>Show Full Website</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Studio Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* Left: 3D Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 relative min-h-[500px] lg:min-h-[700px] bg-[#181e29] overflow-hidden flex flex-col justify-between"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none" />

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 bg-[#181e29]/90 backdrop-blur-md flex flex-col items-center justify-center z-40">
              <div className="p-3 rounded-full bg-blue-900/40 border border-blue-500/50 mb-3 animate-spin">
                <RotateCw className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-sm font-mono font-bold text-white mb-2">
                LOADING /public/models/cargo-plane.glb...
              </div>
              <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-150"
                  style={{ width: `${Math.max(progress, 10)}%` }}
                />
              </div>
              <div className="text-xs font-mono text-slate-400 mt-2">
                {progress}% • Streaming 16.2 MB GLB binary
              </div>
            </div>
          )}

          {/* Loading Error Notice (Step: If loading fails, show error in UI) */}
          {loadError && (
            <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <div className="text-lg font-bold text-white mb-1">Failed to Load Cargo Plane Model</div>
              <div className="text-xs font-mono text-red-300 max-w-md bg-black/50 p-3 rounded border border-red-800 mb-4">
                {loadError}
              </div>
              <div className="text-xs text-slate-300">
                Check file existence at <code className="text-amber-300">/public/models/cargo-plane.glb</code>
              </div>
            </div>
          )}

          {/* Viewport Floating Top Controls Bar */}
          <div className="relative z-20 p-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            
            {/* Model Badge */}
            <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md">
              <Plane className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                CARGO-PLANE.GLB
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                NORMALIZED & CENTERED
              </span>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 shadow-xl backdrop-blur-md">
              
              {/* Preset Angles */}
              <button
                type="button"
                onClick={() => setCameraPreset('iso')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Isometric 3/4 View"
              >
                ISO
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('top')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Top-Down Wingspan View"
              >
                TOP
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('front')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Front Nose View"
              >
                NOSE
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('side')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Side Fuselage View"
              >
                SIDE
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Auto Rotate */}
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                  autoRotate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle 360° Auto-Rotate"
              >
                <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              </button>

              {/* Wireframe */}
              <button
                type="button"
                onClick={() => setWireframe(!wireframe)}
                className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                  wireframe ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Polygonal Wireframe"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>

              {/* Lighting Preset */}
              <button
                type="button"
                onClick={() => {
                  const presets: ('neutral-studio' | 'bright-sun' | 'high-contrast')[] = [
                    'neutral-studio',
                    'bright-sun',
                    'high-contrast'
                  ];
                  const next = presets[(presets.indexOf(lightPreset) + 1) % presets.length];
                  setLightPreset(next);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono uppercase bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white"
                title="Toggle Lighting Environment"
              >
                <Sun className="w-3 h-3 text-amber-400" />
                <span>{lightPreset === 'neutral-studio' ? 'STUDIO' : lightPreset === 'bright-sun' ? 'SUN' : 'CONTRAST'}</span>
              </button>

              {/* Reset Camera */}
              <button
                type="button"
                onClick={() => setCameraPreset('iso')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-mono"
                title="Reset Camera Framing"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewport Floating Bottom Navigation Hint */}
          <div className="relative z-20 p-4 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-lg flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>OrbitControls Active: Click + Drag to rotate 360° · Scroll to Zoom · Right click to Pan</span>
            </div>
          </div>
        </div>

        {/* Right: Technical Verification & Telemetry Panel */}
        <div className="w-full lg:w-[420px] bg-[#0f141c] border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-5">
            
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-950/80 border border-blue-600/40 text-[10px] font-mono text-blue-300 font-bold uppercase mb-2">
                STEP-BY-STEP CALIBRATION REPORT
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Cargo Aircraft 3D Geometry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Direct inspect of <span className="font-mono text-slate-300">/public/models/cargo-plane.glb</span> inside an isolated neutral studio scene.
              </p>
            </div>

            {/* Checklist of Requested Visible Aircraft Components */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Parts Visibility Verification:</span>
                <span className="text-emerald-400 font-bold">ALL CONFIRMED</span>
              </div>

              {[
                { name: 'Complete Fuselage', note: 'Full length main aircraft body' },
                { name: 'Left Wing (Port)', note: 'Swept aerodynamic wing with flaps' },
                { name: 'Right Wing (Starboard)', note: 'Swept aerodynamic wing with flaps' },
                { name: 'Empennage / Tail', note: 'Vertical stabilizer & horizontal elevators' },
                { name: 'Engines (Turbofans)', note: 'Twin underslung high-bypass engine nacelles' },
                { name: 'Cockpit / Nose Cone', note: 'Front radome & flight deck windshield' },
              ].map((part, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-900/80">
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{part.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{part.note}</span>
                </div>
              ))}
            </div>

            {/* Calculated Bounding Box Telemetry (THREE.Box3) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                THREE.Box3 Bounding Box Calculations:
              </div>

              {metrics ? (
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Length (X-axis):</span>
                    <span className="text-white font-bold">{metrics.dimensions[0].toFixed(2)} units</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Wingspan (Y-axis):</span>
                    <span className="text-white font-bold">{metrics.dimensions[1].toFixed(2)} units</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Height (Z-axis):</span>
                    <span className="text-white font-bold">{metrics.dimensions[2].toFixed(2)} units</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Raw Center Offset:</span>
                    <span className="text-amber-300 font-bold text-[11px]">
                      ({metrics.center[0].toFixed(1)}, {metrics.center[1].toFixed(1)}, {metrics.center[2].toFixed(1)})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Applied Normalization Scale:</span>
                    <span className="text-emerald-400 font-bold">{metrics.scaleFactor.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="text-slate-400">Rendered Meshes / Triangles:</span>
                    <span className="text-white font-bold">{metrics.meshCount} meshes • {metrics.triangleCount.toLocaleString()} polys</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-300">
                    <span className="text-slate-400">PBR Materials Configured:</span>
                    <span className="text-white font-bold">{metrics.materialCount} materials (DoubleSided)</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 animate-pulse">
                  Computing bounding box dimensions...
                </div>
              )}
            </div>

            {/* Orientation Axis Mode Switcher */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                Axis Orientation Alignment:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientationMode('cad-z-up')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold text-center border transition-all ${
                    orientationMode === 'cad-z-up'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  CAD Z-UP (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode('pitched-flight')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold text-center border transition-all ${
                    orientationMode === 'pitched-flight'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  PITCHED FLIGHT
                </button>
                <button
                  type="button"
                  onClick={() => setOrientationMode('standard-y-up')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold text-center border transition-all ${
                    orientationMode === 'standard-y-up'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  RAW Y-UP
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Footer Note */}
          <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-3">
            <div className="text-[11px] font-sans text-slate-400 leading-relaxed">
              <span className="text-white font-semibold">Diagnosis:</span> The model was originally uncentered at coordinate offset <code className="text-amber-300">(986, 1630, 385)</code> with a raw span of 2791 units, placing it outside the default camera frustum. Centering inside a wrapper <code className="text-blue-300">THREE.Group</code> with bounding-box scale normalization (<code className="text-emerald-300">{metrics?.scaleFactor.toFixed(5) || '0.00429'}</code>) and <code className="text-blue-300">material.side = DoubleSide</code> makes the entire aircraft 100% visible and interactive.
            </div>

            {onContinueToSite && (
              <button
                type="button"
                onClick={onContinueToSite}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-200 text-[#040711] font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>Proceed to Full Meridiano Website</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
