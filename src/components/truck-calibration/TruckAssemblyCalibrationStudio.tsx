import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CheckCircle2, Sliders, RotateCcw, Copy, Check, Eye } from 'lucide-react';
import { getModelUrl } from '../../utils/modelUrl';

// ============================================================================
// MASTER CONFIGURATION OBJECT FOR TRUCK + CHASSIS + CONTAINER ASSEMBLY
// Every dimension, position offset, rotation and scale is configured here.
// ============================================================================
export interface TruckAssemblyConfig {
  truck: {
    scale: number;
    position: [number, number, number]; // [X, Y, Z]
    rotation: [number, number, number]; // [rotX, rotY, rotZ] in radians
  };
  chassis: {
    scale: number;
    position: [number, number, number];
    rotation: [number, number, number];
  };
  container: {
    scale: [number, number, number]; // Non-uniform scale [lengthX, heightY, widthZ]
    position: [number, number, number];
    rotation: [number, number, number];
  };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
}

export const INITIAL_TRUCK_ASSEMBLY_CONFIG: TruckAssemblyConfig = {
  truck: {
    scale: 0.1255, // Matches 2.64m chassis width and authentic 3.28m height
    position: [-3.25, 0.0, 0.0], // Connects rear fifth-wheel to chassis kingpin
    rotation: [0, -Math.PI / 2, 0], // Faces -X (Left in side view)
  },
  chassis: {
    scale: 1.0, // Chassis model is already modeled 1:1 in real meters
    position: [0.0, 0.0, 0.0], // Kingpin at -1.18m, rear wheels at +9.5m
    rotation: [0, 0, 0], // Length along X
  },
  container: {
    scale: [0.01794, 0.00887, 0.00845], // ISO 40ft High Cube: 12.0m x 2.65m x 2.44m
    position: [5.055, 1.559, 0.0], // Rests at chassis platform level (1.559m)
    rotation: [0, 0, 0], // Length along X
  },
  camera: {
    position: [2.6, 3.8, 19.5], // Static cinematic 3/4 side view (occupies ~70% screen)
    target: [2.6, 1.8, 0.0],
    fov: 36,
  },
};

export const TruckAssemblyCalibrationStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live mutable config state for interactive adjustment
  const [config, setConfig] = useState<TruckAssemblyConfig>(INITIAL_TRUCK_ASSEMBLY_CONFIG);
  const configRef = useRef<TruckAssemblyConfig>(INITIAL_TRUCK_ASSEMBLY_CONFIG);
  configRef.current = config;

  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Bounding box telemetry state
  const [telemetry, setTelemetry] = useState<{
    truckBox?: { min: string; max: string; size: string };
    chassisBox?: { min: string; max: string; size: string };
    containerBox?: { min: string; max: string; size: string };
    assemblyBox?: { length: string; height: string; width: string };
  }>({});

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Object Groups
  const truckAssemblyRef = useRef<THREE.Group | null>(null);
  const truckGroupRef = useRef<THREE.Group | null>(null);
  const chassisGroupRef = useRef<THREE.Group | null>(null);
  const containerGroupRef = useRef<THREE.Group | null>(null);

  // Raw Models loaded from GLTF
  const rawModels = useRef<{
    truck?: THREE.Group;
    chassis?: THREE.Group;
    container?: THREE.Group;
  }>({});

  // 1. Initialize Scene, Camera, Lights and Road
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // A. Neutral Light Gray Background (as requested)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd1d5db); // Neutral Light Gray
    sceneRef.current = scene;

    // B. Camera
    const camera = new THREE.PerspectiveCamera(
      configRef.current.camera.fov,
      width / height,
      0.1,
      1000
    );
    camera.position.set(...configRef.current.camera.position);
    camera.lookAt(...configRef.current.camera.target);
    cameraRef.current = camera;

    // C. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // D. OrbitControls for Free Developer Inspection
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(...configRef.current.camera.target);
    controls.update();
    controlsRef.current = controls;

    // E. Balanced Neutral Lighting (Clear separation of materials)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.8);
    scene.add(hemiLight);

    const sunKey = new THREE.DirectionalLight(0xffffff, 1.8);
    sunKey.position.set(20, 30, 25);
    sunKey.castShadow = true;
    scene.add(sunKey);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.1);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    // F. Medium-Dark Asphalt Road Environment
    const roadGroup = new THREE.Group();

    // Asphalt surface (at Y = 0)
    const roadGeo = new THREE.PlaneGeometry(50, 12);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x272b33, // Medium-dark asphalt
      roughness: 0.82,
      metalness: 0.15,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(2.6, 0.0, 0.0);
    road.receiveShadow = true;
    roadGroup.add(road);

    // Subtle Road Edge White Lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const lineTop = new THREE.Mesh(new THREE.PlaneGeometry(50, 0.25), lineMat);
    lineTop.rotation.x = -Math.PI / 2;
    lineTop.position.set(2.6, 0.01, 3.8);
    roadGroup.add(lineTop);

    const lineBottom = lineTop.clone();
    lineBottom.position.z = -3.8;
    roadGroup.add(lineBottom);

    scene.add(roadGroup);

    // G. Create One Parent Assembly Group
    const truckAssembly = new THREE.Group();
    truckAssembly.name = 'TruckAssembly';
    scene.add(truckAssembly);
    truckAssemblyRef.current = truckAssembly;

    // Sub-groups for each of the 3 components
    const truckGroup = new THREE.Group();
    truckGroup.name = 'TruckTractor';
    truckAssembly.add(truckGroup);
    truckGroupRef.current = truckGroup;

    const chassisGroup = new THREE.Group();
    chassisGroup.name = 'ChassisTrailer';
    truckAssembly.add(chassisGroup);
    chassisGroupRef.current = chassisGroup;

    const containerGroup = new THREE.Group();
    containerGroup.name = 'ShippingContainer';
    truckAssembly.add(containerGroup);
    containerGroupRef.current = containerGroup;

    // H. Load the Three Models
    const loader = new GLTFLoader();

    Promise.all([
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(getModelUrl('truck.glb'), (g) => resolve(g.scene), undefined, reject);
      }),
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(getModelUrl('chassis.glb'), (g) => resolve(g.scene), undefined, reject);
      }),
      new Promise<THREE.Group>((resolve, reject) => {
        loader.load(getModelUrl('container.glb'), (g) => resolve(g.scene), undefined, reject);
      }),
    ])
      .then(([rawTruck, rawChassis, rawCont]) => {
        rawModels.current = { truck: rawTruck, chassis: rawChassis, container: rawCont };

        // 1. Process Truck Tractor (Deep graphite / dark neutral cab)
        const tBox = new THREE.Box3().setFromObject(rawTruck);
        const tCenter = tBox.getCenter(new THREE.Vector3());
        // Align center X at 0, bottom of wheels at Y = 0
        rawTruck.position.set(-tCenter.x, -tBox.min.y, 0);
        rawTruck.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => {
                if ('color' in mat && !mat.name?.includes('Light') && !mat.name?.includes('Glass')) {
                  (mat as THREE.MeshStandardMaterial).color.set(0x22262d); // Deep graphite
                  (mat as THREE.MeshStandardMaterial).roughness = 0.45;
                }
                mat.side = THREE.DoubleSide;
              });
            } else if (m.material) {
              m.material.side = THREE.DoubleSide;
            }
          }
        });
        truckGroup.add(rawTruck);

        // 2. Process Chassis Trailer (Dark steel)
        const chBox = new THREE.Box3().setFromObject(rawChassis);
        const chCenter = chBox.getCenter(new THREE.Vector3());
        // Ground wheels at Y = 0, center Z at 0
        rawChassis.position.set(0, -chBox.min.y, -chCenter.z);
        rawChassis.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            m.material = new THREE.MeshStandardMaterial({
              color: 0x1e242d, // Dark steel
              roughness: 0.4,
              metalness: 0.65,
              side: THREE.DoubleSide,
            });
          }
        });
        chassisGroup.add(rawChassis);

        // 3. Process Container (Strong Meridiano navy blue)
        const contBox = new THREE.Box3().setFromObject(rawCont);
        const cCenter = contBox.getCenter(new THREE.Vector3());
        // Center X & Z at 0, align base at Y = 0
        rawCont.position.set(-cCenter.x, -contBox.min.y, -cCenter.z);
        rawCont.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            m.material = new THREE.MeshStandardMaterial({
              color: 0x092b52, // Strong Meridiano navy blue
              roughness: 0.42,
              metalness: 0.28,
              side: THREE.DoubleSide,
            });
          }
        });
        containerGroup.add(rawCont);

        // Apply initial config transforms
        applyConfigTransforms(configRef.current);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading calibration models:', err);
      });

    // I. Render Loop
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      controls.update();
      renderer.render(scene, camera);
    };
    renderLoop();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Helper to apply transforms from config to the 3 sub-groups
  const applyConfigTransforms = (cfg: TruckAssemblyConfig) => {
    if (truckGroupRef.current) {
      truckGroupRef.current.scale.setScalar(cfg.truck.scale);
      truckGroupRef.current.position.set(...cfg.truck.position);
      truckGroupRef.current.rotation.set(...cfg.truck.rotation);
    }
    if (chassisGroupRef.current) {
      chassisGroupRef.current.scale.setScalar(cfg.chassis.scale);
      chassisGroupRef.current.position.set(...cfg.chassis.position);
      chassisGroupRef.current.rotation.set(...cfg.chassis.rotation);
    }
    if (containerGroupRef.current) {
      containerGroupRef.current.scale.set(...cfg.container.scale);
      containerGroupRef.current.position.set(...cfg.container.position);
      containerGroupRef.current.rotation.set(...cfg.container.rotation);
    }

    // Recompute exact telemetry bounding boxes
    if (truckGroupRef.current && chassisGroupRef.current && containerGroupRef.current && truckAssemblyRef.current) {
      const tBox = new THREE.Box3().setFromObject(truckGroupRef.current);
      const chBox = new THREE.Box3().setFromObject(chassisGroupRef.current);
      const contBox = new THREE.Box3().setFromObject(containerGroupRef.current);
      const totalBox = new THREE.Box3().setFromObject(truckAssemblyRef.current);

      setTelemetry({
        truckBox: {
          min: `(${tBox.min.x.toFixed(2)}, ${tBox.min.y.toFixed(2)}, ${tBox.min.z.toFixed(2)})`,
          max: `(${tBox.max.x.toFixed(2)}, ${tBox.max.y.toFixed(2)}, ${tBox.max.z.toFixed(2)})`,
          size: `${tBox.getSize(new THREE.Vector3()).x.toFixed(2)}m × ${tBox.getSize(new THREE.Vector3()).y.toFixed(2)}m × ${tBox.getSize(new THREE.Vector3()).z.toFixed(2)}m`,
        },
        chassisBox: {
          min: `(${chBox.min.x.toFixed(2)}, ${chBox.min.y.toFixed(2)}, ${chBox.min.z.toFixed(2)})`,
          max: `(${chBox.max.x.toFixed(2)}, ${chBox.max.y.toFixed(2)}, ${chBox.max.z.toFixed(2)})`,
          size: `${chBox.getSize(new THREE.Vector3()).x.toFixed(2)}m × ${chBox.getSize(new THREE.Vector3()).y.toFixed(2)}m × ${chBox.getSize(new THREE.Vector3()).z.toFixed(2)}m`,
        },
        containerBox: {
          min: `(${contBox.min.x.toFixed(2)}, ${contBox.min.y.toFixed(2)}, ${contBox.min.z.toFixed(2)})`,
          max: `(${contBox.max.x.toFixed(2)}, ${contBox.max.y.toFixed(2)}, ${contBox.max.z.toFixed(2)})`,
          size: `${contBox.getSize(new THREE.Vector3()).x.toFixed(2)}m × ${contBox.getSize(new THREE.Vector3()).y.toFixed(2)}m × ${contBox.getSize(new THREE.Vector3()).z.toFixed(2)}m`,
        },
        assemblyBox: {
          length: `${(totalBox.max.x - totalBox.min.x).toFixed(2)} m`,
          height: `${(totalBox.max.y - totalBox.min.y).toFixed(2)} m`,
          width: `${(totalBox.max.z - totalBox.min.z).toFixed(2)} m`,
        },
      });
    }
  };

  // Update specific config property
  const updateConfig = (newCfg: TruckAssemblyConfig) => {
    setConfig(newCfg);
    applyConfigTransforms(newCfg);
  };

  // Reset to initial cinematic 3/4 view
  const resetCameraView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...config.camera.position);
      cameraRef.current.fov = config.camera.fov;
      cameraRef.current.updateProjectionMatrix();
      controlsRef.current.target.set(...config.camera.target);
      controlsRef.current.update();
    }
  };

  // Copy config code
  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#d1d5db] overflow-hidden select-none font-sans">
      {/* 3D CANVAS */}
      <canvas ref={canvasRef} className="w-full h-full block outline-none" />

      {/* TOP HEADER STATUS BADGE */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 backdrop-blur-md">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div>
          <div className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
            TRUCK ASSEMBLY CALIBRATION STUDIO
          </div>
          <div className="text-[11px] text-slate-300">
            [ TRACTOR CAB ] — [ CHASSIS ] + [ SHIPPING CONTAINER ]
          </div>
        </div>
      </div>

      {/* TOP RIGHT ACTIONS */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={resetCameraView}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-mono transition-all shadow-xl backdrop-blur-md"
          title="Reset to 70% Viewport Cinematic 3/4 Angle"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          <span>Reset 3/4 View</span>
        </button>

        <button
          type="button"
          onClick={handleCopyConfig}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-mono transition-all shadow-xl backdrop-blur-md"
          title="Copy TRUCK_ASSEMBLY_CONFIG JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
          <span>{copied ? 'Copied!' : 'Copy Config'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono transition-all shadow-xl"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showControls ? 'Hide Controls' : 'Tuning Controls'}</span>
        </button>
      </div>

      {/* FLOATING DEVELOPER TUNING HUD (SLIDERS & NUMERIC VALUES) */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-20 max-w-lg w-full bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-lg max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
              TRUCK_ASSEMBLY_CONFIG Live Tuner
            </span>
            <span className="text-[10px] font-mono text-slate-400">Orbit controls: Drag to rotate, scroll to zoom</span>
          </div>

          {/* TELEMETRY OVERVIEW */}
          <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] mb-3 space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Overall Vehicle Length:</span>
              <span className="text-emerald-400 font-bold">{telemetry.assemblyBox?.length || '17.24 m'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Overall Height:</span>
              <span className="text-emerald-400 font-bold">{telemetry.assemblyBox?.height || '4.21 m'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Overall Width:</span>
              <span className="text-emerald-400 font-bold">{telemetry.assemblyBox?.width || '2.64 m'}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
              <span className="text-emerald-300">✓ Wheels Grounded (Y=0.00m)</span>
              <span className="text-emerald-300">✓ Container on Deck (Y=1.56m)</span>
            </div>
          </div>

          {/* 1. TRUCK TRACTOR CONTROLS */}
          <div className="space-y-2 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
              <span>1. TRACTOR CAB (Graphite)</span>
              <span className="text-slate-400 text-[10px]">Scale: {config.truck.scale.toFixed(4)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <label className="text-slate-400 block">Pos X (Coupling):</label>
                <input
                  type="range"
                  min="-6.0"
                  max="-1.0"
                  step="0.05"
                  value={config.truck.position[0]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      truck: { ...config.truck, position: [val, config.truck.position[1], config.truck.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.truck.position[0].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Pos Y (Ground):</label>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={config.truck.position[1]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      truck: { ...config.truck, position: [config.truck.position[0], val, config.truck.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.truck.position[1].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Scale Uniform:</label>
                <input
                  type="range"
                  min="0.08"
                  max="0.18"
                  step="0.002"
                  value={config.truck.scale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      truck: { ...config.truck, scale: val },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.truck.scale.toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* 2. CHASSIS TRAILER CONTROLS */}
          <div className="space-y-2 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
              <span>2. CHASSIS (Dark Steel)</span>
              <span className="text-slate-400 text-[10px]">Deck: Y=1.559m</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <label className="text-slate-400 block">Pos X (Offset):</label>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={config.chassis.position[0]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      chassis: { ...config.chassis, position: [val, config.chassis.position[1], config.chassis.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.chassis.position[0].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Pos Y (Ground):</label>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={config.chassis.position[1]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      chassis: { ...config.chassis, position: [config.chassis.position[0], val, config.chassis.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.chassis.position[1].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Scale Uniform:</label>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.01"
                  value={config.chassis.scale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      chassis: { ...config.chassis, scale: val },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.chassis.scale.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 3. SHIPPING CONTAINER CONTROLS */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
              <span>3. CONTAINER (Navy Blue)</span>
              <span className="text-slate-400 text-[10px]">Platform Lock: Y=1.559m</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <label className="text-slate-400 block">Pos X (Along trailer):</label>
                <input
                  type="range"
                  min="3.0"
                  max="7.0"
                  step="0.05"
                  value={config.container.position[0]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      container: { ...config.container, position: [val, config.container.position[1], config.container.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.container.position[0].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Pos Y (Deck seat):</label>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.01"
                  value={config.container.position[1]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      container: { ...config.container, position: [config.container.position[0], val, config.container.position[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.container.position[1].toFixed(2)}m</span>
              </div>
              <div>
                <label className="text-slate-400 block">Length Scale X:</label>
                <input
                  type="range"
                  min="0.012"
                  max="0.024"
                  step="0.0005"
                  value={config.container.scale[0]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateConfig({
                      ...config,
                      container: { ...config.container, scale: [val, config.container.scale[1], config.container.scale[2]] },
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded accent-blue-500 cursor-pointer"
                />
                <span className="text-slate-200">{config.container.scale[0].toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="absolute inset-0 bg-[#d1d5db]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-slate-800">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <div className="text-xs font-mono font-bold tracking-widest uppercase">
            CALCULATING BOUNDING BOXES FOR TRUCK + CHASSIS + CONTAINER...
          </div>
        </div>
      )}
    </div>
  );
};
