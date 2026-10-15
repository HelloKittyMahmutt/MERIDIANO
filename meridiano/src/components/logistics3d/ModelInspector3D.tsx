import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MODELS_DATA, Model3DSpec } from './modelData';
import { Language } from '../../types';
import { 
  RotateCw, 
  Sun, 
  Grid3X3, 
  Maximize2, 
  Minimize2, 
  Info, 
  Eye, 
  Layers, 
  Sliders,
  CheckCircle2,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface ModelInspector3DProps {
  currentLang: Language;
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
}

export const ModelInspector3D: React.FC<ModelInspector3DProps> = ({
  currentLang,
  selectedModelId: externalModelId,
  onSelectModel,
}) => {
  const [activeModelId, setActiveModelId] = useState<string>(externalModelId || 'truck');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'daylight' | 'neon' | 'port'>('studio');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [meshCount, setMeshCount] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentObjectRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const originalMaterialsMap = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  const currentSpec = MODELS_DATA.find((m) => m.id === activeModelId) || MODELS_DATA[0];

  const handleModelChange = (id: string) => {
    setActiveModelId(id);
    if (onSelectModel) onSelectModel(id);
  };

  // Setup Three.js scene once
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 480;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.02);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 3.5, 6);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 40;
    controls.minDistance = 1.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent dipping beneath floor
    controlsRef.current = controls;

    // 5. Studio Platform & Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Glowing circular pedestal
    const pedestalGeo = new THREE.CylinderGeometry(4.2, 4.5, 0.1, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.2,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.06;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Pedestal cyan rim ring
    const ringGeo = new THREE.RingGeometry(4.18, 4.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.005;
    scene.add(ring);

    // 6. Lighting Group
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.5;
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight || 480;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update Lighting Presets
  useEffect(() => {
    const group = lightsGroupRef.current;
    if (!group) return;

    // Clear old lights
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (lightingPreset === 'studio') {
      const ambient = new THREE.AmbientLight(0xffffff, 0.9);
      group.add(ambient);

      const mainLight = new THREE.DirectionalLight(0xffffff, 2.4);
      mainLight.position.set(8, 12, 8);
      mainLight.castShadow = true;
      group.add(mainLight);

      const blueRim = new THREE.DirectionalLight(0x38bdf8, 2.0);
      blueRim.position.set(-8, 5, -8);
      group.add(blueRim);

      const warmFill = new THREE.PointLight(0xf59e0b, 1.2, 20);
      warmFill.position.set(4, 2, -4);
      group.add(warmFill);
    } else if (lightingPreset === 'daylight') {
      const ambient = new THREE.AmbientLight(0xf0fdf4, 1.4);
      group.add(ambient);

      const sun = new THREE.DirectionalLight(0xfffaed, 3.2);
      sun.position.set(10, 16, 5);
      sun.castShadow = true;
      group.add(sun);

      const skyFill = new THREE.DirectionalLight(0x93c5fd, 1.0);
      skyFill.position.set(-10, 6, -5);
      group.add(skyFill);
    } else if (lightingPreset === 'neon') {
      const ambient = new THREE.AmbientLight(0x0a1020, 0.4);
      group.add(ambient);

      const cyan = new THREE.PointLight(0x06b6d4, 4.0, 25);
      cyan.position.set(6, 4, 6);
      group.add(cyan);

      const magenta = new THREE.PointLight(0xec4899, 3.5, 25);
      magenta.position.set(-6, 3, -6);
      group.add(magenta);

      const topGlow = new THREE.DirectionalLight(0x818cf8, 1.5);
      topGlow.position.set(0, 10, 0);
      group.add(topGlow);
    } else if (lightingPreset === 'port') {
      const ambient = new THREE.AmbientLight(0x1e293b, 0.8);
      group.add(ambient);

      const sunset = new THREE.DirectionalLight(0xf97316, 2.8);
      sunset.position.set(-12, 6, -6);
      group.add(sunset);

      const navyRim = new THREE.DirectionalLight(0x1d4ed8, 2.2);
      navyRim.position.set(10, 8, 8);
      group.add(navyRim);
    }
  }, [lightingPreset]);

  // Load Model whenever activeModelId changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    setIsLoading(true);
    setLoadProgress(10);

    // Remove existing model
    if (currentObjectRef.current) {
      scene.remove(currentObjectRef.current);
      currentObjectRef.current = null;
    }
    originalMaterialsMap.current.clear();

    const loader = new GLTFLoader();

    loader.load(
      currentSpec.modelPath,
      (gltf) => {
        setLoadProgress(100);
        const model = gltf.scene;

        let meshesFound = 0;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            originalMaterialsMap.current.set(mesh, mesh.material);
            meshesFound++;
          }
        });
        setMeshCount(meshesFound);

        // Normalize bounding box & center
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Center model geometry
        if (currentSpec.id === 'cargo-plane') {
          model.position.set(-center.x, -center.y, -center.z);
          model.rotation.set(-Math.PI / 2, 0, 0);
        } else {
          model.position.x = -center.x;
          model.position.z = -center.z;
          model.position.y = -box.min.y;
        }

        // Apply scale multiplier relative to model bounding box size
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = currentSpec.id === 'cargo-plane' ? 6.0 : 4.2;
        const scaleFactor = targetSize / maxDim;
        model.scale.setScalar(scaleFactor);

        // Recompute grounded position after scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        if (currentSpec.id !== 'cargo-plane') {
          model.position.y = -scaledBox.min.y;
        } else {
          model.position.y = 1.0;
        }

        const group = new THREE.Group();
        group.add(model);
        scene.add(group);
        currentObjectRef.current = group;

        // Reset camera focus to model
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(4.5, 3.2, 5.5);
          controlsRef.current.target.set(0, scaledBox.max.y * 0.45, 0);
          controlsRef.current.update();
        }

        setIsLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(percent);
        }
      },
      (error) => {
        console.error('Error loading 3D model:', error);
        setIsLoading(false);
      }
    );
  }, [activeModelId, currentSpec]);

  // Wireframe toggle
  useEffect(() => {
    if (!currentObjectRef.current) return;

    currentObjectRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (wireframe) {
          mesh.material = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
          });
        } else {
          const original = originalMaterialsMap.current.get(mesh);
          if (original) {
            mesh.material = original;
          }
        }
      }
    });
  }, [wireframe]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.5, 3.2, 5.5);
      controlsRef.current.target.set(0, 1.2, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-5 items-stretch">
      {/* 3D Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="flex-1 relative min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] rounded-2xl bg-[#060913] border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-30 pointer-events-none transition-opacity">
            <Loader2 className="w-9 h-9 text-blue-400 animate-spin mb-3" />
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2">
              {currentLang === 'bg' ? 'Зареждане на 3D модел...' : 'Loading 3D asset...'}
            </div>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-200" 
                style={{ width: `${Math.max(loadProgress, 15)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              {loadProgress}% · {currentSpec.nameEn}
            </div>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="relative z-20 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-700/70 text-[11px] font-mono font-bold text-blue-300 backdrop-blur-md shadow-md">
              GLB · {currentSpec.id.toUpperCase()}
            </span>
            <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-slate-900/60 text-[10px] font-mono text-slate-400 border border-slate-800">
              {meshCount} MESHES
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/85 p-1 rounded-xl border border-slate-800/80 backdrop-blur-md shadow-lg">
            {/* Auto Rotate Toggle */}
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                autoRotate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="360° Auto-Rotate"
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </button>

            {/* Wireframe Toggle */}
            <button
              type="button"
              onClick={() => setWireframe(!wireframe)}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors ${
                wireframe ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle 3D Polygonal Wireframe"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>

            {/* Lighting Preset Selector */}
            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => {
                const presets: ('studio' | 'daylight' | 'neon' | 'port')[] = ['studio', 'daylight', 'neon', 'port'];
                const nextIdx = (presets.indexOf(lightingPreset) + 1) % presets.length;
                setLightingPreset(presets[nextIdx]);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase text-slate-300 hover:text-white bg-slate-900 border border-slate-700/60"
              title="Lighting Preset"
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>{lightingPreset}</span>
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              onClick={resetCamera}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-mono transition-colors"
              title="Reset Camera View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Hint */}
        <div className="relative z-20 p-3 sm:p-4 flex items-center justify-between pointer-events-none">
          <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800/80 backdrop-blur-md">
            {currentLang === 'bg' ? 'Влачете за 360° завъртане · Скрол за зуум' : 'Drag to rotate 360° · Scroll to zoom'}
          </div>
        </div>
      </div>

      {/* Model Spec & Selector Sidebar */}
      <div className="w-full lg:w-96 flex flex-col gap-3.5">
        {/* Model Switcher Grid (6 Models) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-xl">
          <div className="text-[11px] font-mono uppercase text-blue-400 font-bold tracking-wider mb-2.5 flex items-center justify-between">
            <span>{currentLang === 'bg' ? 'Изберете 3D модел:' : 'Select 3D asset:'}</span>
            <span className="text-slate-500 text-[10px]">6 ASSETS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
            {MODELS_DATA.map((item) => {
              const isSelected = item.id === activeModelId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModelChange(item.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all text-xs font-montserrat font-bold flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-950/50 ring-1 ring-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                    {item.id.toUpperCase()}
                  </span>
                  <span className="truncate mt-0.5 text-[11px] font-semibold">
                    {currentLang === 'bg' ? item.nameBg : item.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Model Technical Card */}
        <div className="flex-1 p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                {currentLang === 'bg' ? currentSpec.categoryBg : currentSpec.categoryEn}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white font-montserrat mb-1">
              {currentLang === 'bg' ? currentSpec.nameBg : currentSpec.nameEn}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3.5">
              {currentLang === 'bg' ? currentSpec.descriptionBg : currentSpec.descriptionEn}
            </p>

            {/* Technical Specifications List */}
            <div className="space-y-1.5 mb-4 border-t border-slate-800/70 pt-3">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                {currentLang === 'bg' ? 'Технически параметри:' : 'Technical Specifications:'}
              </div>
              {currentSpec.specs.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/80">
                  <span className="text-slate-400 font-sans text-[11px]">
                    {currentLang === 'bg' ? s.labelBg : s.labelEn}:
                  </span>
                  <span className="text-white font-mono font-semibold text-[11px] text-right">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Chain Integration Badge */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 mt-2">
            <div className="flex items-center gap-1.5 text-blue-300 text-[11px] font-mono font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentLang === 'bg' ? 'Роля в доставката на MERIDIANO:' : 'MERIDIANO Chain Role:'}</span>
            </div>
            <div className="text-xs text-slate-200 font-sans leading-tight">
              {currentLang === 'bg' ? currentSpec.meridianoRoleBg : currentSpec.meridianoRoleEn}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
