import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Plane, 
  RotateCw, 
  RotateCcw,
  Copy, 
  Check, 
  Eye, 
  Layers, 
  Sliders, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Crosshair,
  ArrowRight
} from 'lucide-react';
import { getModelUrl } from '../../utils/modelUrl';
import { APPROVED_AIRCRAFT_CONFIG, AircraftCalibrationConfig } from '../cinematic/aircraftConfig';

interface AircraftCalibrationStudioProps {
  onSwitchToCinematic?: () => void;
  onSwitchToTruck?: () => void;
}

export const AircraftCalibrationStudio: React.FC<AircraftCalibrationStudioProps> = ({
  onSwitchToCinematic,
  onSwitchToTruck,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live mutable calibration state
  const [rotX, setRotX] = useState<number>(APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[0]); // -90 deg
  const [rotY, setRotY] = useState<number>(APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[1]); // 0 deg
  const [rotZ, setRotZ] = useState<number>(APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[2]); // 180 deg
  const [scale, setScale] = useState<number>(APPROVED_AIRCRAFT_CONFIG.orientationCorrection.scale); // 0.02495
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [posZ, setPosZ] = useState<number>(0);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showHorizon, setShowHorizon] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<'cinematic34' | 'front' | 'side' | 'top' | 'rear'>('cinematic34');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Object Hierarchy References
  const aircraftRigRef = useRef<THREE.Group | null>(null);
  const orientationCorrectionRef = useRef<THREE.Group | null>(null);
  const rawPlaneRef = useRef<THREE.Group | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const horizonRef = useRef<THREE.Group | null>(null);

  // Telemetry metrics
  const [telemetry, setTelemetry] = useState<{
    length: string;
    wingspan: string;
    height: string;
    pitchDeg: string;
    rollDeg: string;
    isLevel: boolean;
  }>({
    length: '69.65 m',
    wingspan: '65.01 m',
    height: '19.21 m',
    pitchDeg: '0.0°',
    rollDeg: '0.0°',
    isLevel: true,
  });

  // 1. Initialize Scene, Camera, Lights, Horizon & Controls
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // A. Studio Scene (Dark technical slate atmosphere)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 technical calibration backdrop
    sceneRef.current = scene;

    // B. Perspective Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 2000);
    camera.position.set(-45, 14, 52); // Cinematic 3/4 preset
    camera.lookAt(0, 0, 0);
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
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // D. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.minDistance = 10;
    controls.maxDistance = 250;
    controls.update();
    controlsRef.current = controls;

    // E. 360° Studio Lighting (Bright neutral illumination)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 1.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Key Light Front-Right
    const sunKey = new THREE.DirectionalLight(0xffffff, 2.2);
    sunKey.position.set(35, 45, 30);
    sunKey.castShadow = true;
    sunKey.shadow.mapSize.width = 2048;
    sunKey.shadow.mapSize.height = 2048;
    scene.add(sunKey);

    // Fill Light Front-Left
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.3);
    fillLight.position.set(-35, 20, 25);
    scene.add(fillLight);

    // Rim Light (Accentuates fuselage spine, wings and tail)
    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 1.6);
    rimLight.position.set(0, 30, -40);
    scene.add(rimLight);

    // Underbelly bounce light (Prevents dark underside)
    const bellyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    bellyLight.position.set(0, -25, 0);
    scene.add(bellyLight);

    // F. Horizon Reference Grid & Level Reference Line
    const horizonGroup = new THREE.Group();
    horizonGroup.name = 'HorizonReference';

    // Infinite Horizon Disk (placed at ground level Y = -12m)
    const horizonGrid = new THREE.GridHelper(180, 36, 0x38bdf8, 0x1e293b);
    horizonGrid.position.y = -12;
    horizonGroup.add(horizonGrid);

    // Concentric Distance Range Rings
    [25, 50, 75].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -11.95;
      horizonGroup.add(ring);
    });

    // Reference Horizon Line (Thin bright line on the horizon plane)
    const horizonLineMat = new THREE.LineBasicMaterial({ color: 0x0284c7 });
    const horizonPoints = [new THREE.Vector3(-120, -12, 0), new THREE.Vector3(120, -12, 0)];
    const horizonLineGeo = new THREE.BufferGeometry().setFromPoints(horizonPoints);
    const horizonLine = new THREE.Line(horizonLineGeo, horizonLineMat);
    horizonGroup.add(horizonLine);

    scene.add(horizonGroup);
    horizonRef.current = horizonGroup;

    // G. 3D XYZ Axes Helper (Red=X, Green=Y, Blue=Z)
    const axesHelper = new THREE.AxesHelper(22);
    axesHelper.position.set(0, -11.9, 0);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // ========================================================================
    // H. HIERARCHY SETUP:
    // AircraftRig
    //   └── OrientationCorrection
    //        └── RawCargoPlane
    // ========================================================================
    const aircraftRig = new THREE.Group();
    aircraftRig.name = 'AircraftRig';
    aircraftRig.position.set(0, 0, 0);
    scene.add(aircraftRig);
    aircraftRigRef.current = aircraftRig;

    const orientationCorrection = new THREE.Group();
    orientationCorrection.name = 'OrientationCorrection';
    aircraftRig.add(orientationCorrection);
    orientationCorrectionRef.current = orientationCorrection;

    // I. Load raw GLTF cargo plane model
    const loader = new GLTFLoader();
    const modelUrl = getModelUrl('cargo-plane.glb');

    loader.load(
      modelUrl,
      (gltf) => {
        const raw = gltf.scene;
        raw.name = 'RawCargoPlane';

        // Double-side all CAD meshes and enable shadow maps
        raw.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => {
                mat.side = THREE.DoubleSide;
              });
            } else if (m.material) {
              m.material.side = THREE.DoubleSide;
            }
          }
        });

        // Center raw CAD geometry at native geometric centroid
        raw.position.set(...APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rawCenterOffset);
        orientationCorrection.add(raw);
        rawPlaneRef.current = raw;

        // Apply initial approved calibration transforms
        applyTransforms(
          APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[0],
          APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[1],
          APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[2],
          APPROVED_AIRCRAFT_CONFIG.orientationCorrection.scale,
          0,
          0,
          0
        );

        setCameraPreset('cinematic34');
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading cargo plane GLB:', err);
        setLoading(false);
      }
    );

    // J. Render Loop
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      controls.update();
      renderer.render(scene, camera);
    };
    renderLoop();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
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

  // 2. Synchronize Transforms to Groups
  const applyTransforms = (
    rx: number,
    ry: number,
    rz: number,
    s: number,
    px: number,
    py: number,
    pz: number
  ) => {
    // 1. OrientationCorrection child wrapper
    if (orientationCorrectionRef.current) {
      orientationCorrectionRef.current.rotation.set(
        THREE.MathUtils.degToRad(rx),
        THREE.MathUtils.degToRad(ry),
        THREE.MathUtils.degToRad(rz),
        'XYZ'
      );
      orientationCorrectionRef.current.scale.setScalar(s);
    }

    // 2. AircraftRig parent group
    if (aircraftRigRef.current) {
      aircraftRigRef.current.position.set(px, py, pz);
    }

    // 3. Compute telemetry
    if (orientationCorrectionRef.current && rawPlaneRef.current) {
      orientationCorrectionRef.current.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(orientationCorrectionRef.current);
      const size = box.getSize(new THREE.Vector3());

      // Check level-flight pitch and roll relative to world horizon
      // In level flight: rx = -90, rz = 180 (or -180) -> pitch = 0, roll = 0
      const pitchOffset = Math.abs(rx - (-90));
      const rollOffset = Math.min(Math.abs(rz - 180), Math.abs(rz - (-180)));
      const isLevel = pitchOffset < 0.5 && rollOffset < 0.5;

      setTelemetry({
        length: `${size.z.toFixed(2)} m`,
        wingspan: `${size.x.toFixed(2)} m`,
        height: `${size.y.toFixed(2)} m`,
        pitchDeg: `${(rx - (-90)).toFixed(1)}°`,
        rollDeg: `${(rz >= 0 ? rz - 180 : rz + 180).toFixed(1)}°`,
        isLevel,
      });
    }
  };

  // Handle slider/input changes
  const handleRotXChange = (val: number) => {
    setRotX(val);
    applyTransforms(val, rotY, rotZ, scale, posX, posY, posZ);
  };
  const handleRotYChange = (val: number) => {
    setRotY(val);
    applyTransforms(rotX, val, rotZ, scale, posX, posY, posZ);
  };
  const handleRotZChange = (val: number) => {
    setRotZ(val);
    applyTransforms(rotX, rotY, val, scale, posX, posY, posZ);
  };
  const handleScaleChange = (val: number) => {
    setScale(val);
    applyTransforms(rotX, rotY, rotZ, val, posX, posY, posZ);
  };
  const handlePosXChange = (val: number) => {
    setPosX(val);
    applyTransforms(rotX, rotY, rotZ, scale, val, posY, posZ);
  };
  const handlePosYChange = (val: number) => {
    setPosY(val);
    applyTransforms(rotX, rotY, rotZ, scale, posX, val, posZ);
  };
  const handlePosZChange = (val: number) => {
    setPosZ(val);
    applyTransforms(rotX, rotY, rotZ, scale, posX, posY, val);
  };

  // Camera Presets
  const setCameraPreset = (preset: 'cinematic34' | 'front' | 'side' | 'top' | 'rear') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setActivePreset(preset);

    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    // 1. Calculate the aircraft's current world-space bounding box using THREE.Box3
    const box = new THREE.Box3();
    if (orientationCorrectionRef.current && rawPlaneRef.current) {
      orientationCorrectionRef.current.updateMatrixWorld(true);
      box.setFromObject(orientationCorrectionRef.current);
    } else if (aircraftRigRef.current) {
      aircraftRigRef.current.updateMatrixWorld(true);
      box.setFromObject(aircraftRigRef.current);
    }

    // 2. Determine its world-space center
    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();
    if (!box.isEmpty()) {
      box.getCenter(center);
      box.getBoundingSphere(sphere);
    } else {
      center.set(0, 0, 0);
      sphere.radius = 48.7;
    }

    // 3. Set the camera's OrbitControls target to that center
    ctrl.target.copy(center);

    // 4. Position the camera at a suitable distance based on the aircraft's bounding sphere and camera field of view
    // Configure FOV per preset
    switch (preset) {
      case 'cinematic34':
        cam.fov = 38;
        break;
      case 'front':
        cam.fov = 40;
        break;
      case 'side':
        cam.fov = 36;
        break;
      case 'top':
        cam.fov = 42;
        break;
      case 'rear':
        cam.fov = 38;
        break;
    }

    const radius = Math.max(sphere.radius, 15);
    const aspect = cam.aspect || 1;
    const fovRad = THREE.MathUtils.degToRad(cam.fov);
    const halfFovV = fovRad / 2;
    const halfFovH = Math.atan(Math.tan(halfFovV) * aspect);
    const limitingHalfFov = Math.min(halfFovV, halfFovH);
    const sphereFitDistance = radius / Math.sin(limitingHalfFov);

    let distance = sphereFitDistance * 0.50;
    const direction = new THREE.Vector3(0, 0, -1);

    switch (preset) {
      case 'cinematic34':
        // 3/4 Side-rear hero view showing fuselage, wings, engine and tail (~65% frame occupancy)
        distance = sphereFitDistance * 0.50;
        direction.set(-45, 14, 52).normalize();
        break;
      case 'front':
        // Head-on view looking straight at nose and wing balance - centered vertically & horizontally
        distance = sphereFitDistance * 0.55;
        direction.set(0, 0, -1);
        break;
      case 'side':
        // Direct lateral profile checking level fuselage against horizon
        distance = sphereFitDistance * 0.56;
        direction.set(-1, 0, 0);
        break;
      case 'top':
        // Plan view looking down at full wingspan and fuselage symmetry
        distance = sphereFitDistance * 0.65;
        direction.set(0, 1, 0.0001).normalize();
        break;
      case 'rear':
        // Rear tail view checking twin engines and vertical stabilizer
        distance = sphereFitDistance * 0.55;
        direction.set(0, 0.08, 1).normalize();
        break;
    }

    // 5. Ensure the complete aircraft is visible and centered
    cam.position.copy(center).addScaledVector(direction, distance);

    // 6. Update the camera projection matrix and OrbitControls after switching presets
    cam.updateProjectionMatrix();
    ctrl.update();

    // 7. Keep the horizon reference independent from camera targeting (horizon remains static at world Y = -12m)
  };

  // Reset to raw GLB uncorrected orientation (0°, 0°, 0°)
  const resetToRawGLB = () => {
    setRotX(0);
    setRotY(0);
    setRotZ(0);
    setScale(0.02495);
    setPosX(0);
    setPosY(0);
    setPosZ(0);
    applyTransforms(0, 0, 0, 0.02495, 0, 0, 0);
    setCameraPreset(activePreset);
  };

  // Reset to approved level flight (-90°, 0°, 180°)
  const resetToApprovedLevelFlight = () => {
    const rx = APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[0];
    const ry = APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[1];
    const rz = APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationDeg[2];
    const s = APPROVED_AIRCRAFT_CONFIG.orientationCorrection.scale;
    setRotX(rx);
    setRotY(ry);
    setRotZ(rz);
    setScale(s);
    setPosX(0);
    setPosY(0);
    setPosZ(0);
    applyTransforms(rx, ry, rz, s, 0, 0, 0);
    setCameraPreset('cinematic34');
  };

  // Copy calibration values as JSON
  const handleCopyJSON = () => {
    const configData = {
      orientationCorrection: {
        rotationDeg: [rotX, rotY, rotZ],
        rotationRad: [
          Number(THREE.MathUtils.degToRad(rotX).toFixed(6)),
          Number(THREE.MathUtils.degToRad(rotY).toFixed(6)),
          Number(THREE.MathUtils.degToRad(rotZ).toFixed(6)),
        ],
        scale: Number(scale.toFixed(6)),
        rawCenterOffset: APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rawCenterOffset,
      },
      rig: {
        position: [posX, posY, posZ],
        rotationDeg: [0, 0, 0],
      },
      verifiedTelemetry: {
        length: telemetry.length,
        wingspan: telemetry.wingspan,
        height: telemetry.height,
        isLevelFlight: telemetry.isLevel,
      },
    };

    navigator.clipboard.writeText(JSON.stringify(configData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="relative w-full h-screen bg-[#090d16] text-white flex flex-col overflow-hidden font-sans select-none">
      
      {/* ================================================================== */}
      {/* TOP HEADER: Switcher Bar & Status Indicator */}
      {/* ================================================================== */}
      <header className="h-14 border-b border-slate-800 bg-[#0d131f]/95 backdrop-blur px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Plane className="w-4 h-4 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-white">MERIDIANO</span>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
                AIRCRAFT CALIBRATION STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Isolated 3D Environment — Native Geometry & Level-Flight Calibration
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2">
          {onSwitchToTruck && (
            <button
              onClick={onSwitchToTruck}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              Truck Studio
            </button>
          )}
          {onSwitchToCinematic && (
            <button
              onClick={onSwitchToCinematic}
              className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-colors shadow-sm shadow-sky-600/30 flex items-center gap-1.5"
            >
              <span>Cinematic Experience</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================================== */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        
        {/* 3D WebGL Canvas Viewport */}
        <div ref={containerRef} className="relative flex-1 h-full bg-[#0a0f1d] overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-[#0a0f1d]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-9 h-9 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-medium text-slate-200">Loading /models/cargo-plane.glb...</div>
              <div className="text-xs text-slate-400">Extracting native CAD geometry and hierarchy</div>
            </div>
          )}

          {/* Quick Camera Presets Toolbar (Floating over 3D Canvas) */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1.5 rounded-lg shadow-xl">
            <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider flex items-center gap-1">
              <Camera className="w-3 h-3 text-sky-400" /> Presets:
            </span>
            <button
              onClick={() => setCameraPreset('cinematic34')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activePreset === 'cinematic34'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Cinematic 3/4
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activePreset === 'front'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Front (Wings)
            </button>
            <button
              onClick={() => setCameraPreset('side')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activePreset === 'side'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Side (Fuselage)
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activePreset === 'top'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Top (Plan)
            </button>
            <button
              onClick={() => setCameraPreset('rear')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activePreset === 'rear'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Rear (Tail)
            </button>
          </div>

          {/* Visual Helpers Toggles */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={() => {
                setShowAxes(!showAxes);
                if (axesHelperRef.current) axesHelperRef.current.visible = !showAxes;
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium backdrop-blur transition-all flex items-center gap-1.5 ${
                showAxes
                  ? 'bg-slate-900/90 border-sky-500/50 text-sky-400'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>XYZ Axes</span>
            </button>

            <button
              onClick={() => {
                setShowHorizon(!showHorizon);
                if (horizonRef.current) horizonRef.current.visible = !showHorizon;
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium backdrop-blur transition-all flex items-center gap-1.5 ${
                showHorizon
                  ? 'bg-slate-900/90 border-sky-500/50 text-sky-400'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Horizon Plane</span>
            </button>
          </div>

          {/* Level Flight Status HUD (Bottom Left) */}
          <div className="absolute bottom-5 left-5 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3.5 rounded-xl shadow-2xl max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              {telemetry.isLevel ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Level Flight Horizon Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Offset from True Horizon ({telemetry.pitchDeg})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-2 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Wingspan</span>
                <span className="font-semibold text-slate-200">{telemetry.wingspan}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Length</span>
                <span className="font-semibold text-slate-200">{telemetry.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Height</span>
                <span className="font-semibold text-slate-200">{telemetry.height}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-tight flex items-center justify-between border-t border-slate-800 pt-2">
              <span>Viewport Occupancy: <strong className="text-slate-200">~65%</strong></span>
              <span className="text-emerald-400 font-mono">Nose: -Z (Forward)</span>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT SIDEBAR: Live Calibration Controls & Architecture Panel   */}
        {/* ================================================================ */}
        <aside className="w-96 h-full bg-[#0d131f] border-l border-slate-800 p-5 overflow-y-auto flex flex-col gap-5 shrink-0 z-10">
          
          {/* Action Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide">Orientation Controls</h2>
            </div>
            <button
              onClick={handleCopyJSON}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON!' : 'Copy Config'}</span>
            </button>
          </div>

          {/* Quick Calibration Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={resetToApprovedLevelFlight}
              className="p-2.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-xs font-medium text-sky-200 hover:text-white transition-all flex flex-col gap-1 text-left"
            >
              <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Level Flight Fix</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">[-90°, 0°, 180°]</span>
            </button>

            <button
              onClick={resetToRawGLB}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all flex flex-col gap-1 text-left"
            >
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Original GLB</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">[0°, 0°, 0°] (Vertical)</span>
            </button>
          </div>

          {/* Hierarchy Breakdown Callout */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 font-mono text-xs">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Target Object Hierarchy</span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="text-sky-400 font-semibold">AircraftRig (Flight path & bank)</div>
              <div className="pl-3 border-l border-slate-800 text-amber-300">
                └── OrientationCorrection (Permanent CAD Fix)
              </div>
              <div className="pl-6 border-l border-slate-800 text-slate-400">
                └── RawCargoPlane (Centered geometry)
              </div>
            </div>
          </div>

          {/* Orientation Correction Sliders (Applied to OrientationCorrection) */}
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
            <div className="text-xs font-semibold text-sky-300 uppercase tracking-wider flex items-center justify-between">
              <span>Orientation Correction</span>
              <span className="text-[10px] text-slate-400 font-mono">Child Wrapper</span>
            </div>

            {/* Rotation X (Pitch) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Rotation X (Pitch / Up-Down)</span>
                <span className="font-mono text-sky-400 font-semibold">{rotX.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={rotX}
                onChange={(e) => handleRotXChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-180°</span>
                <span className="text-emerald-400 font-semibold">-90.0° (Level Horizon)</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Rotation Y (Yaw) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Rotation Y (Yaw / Heading)</span>
                <span className="font-mono text-sky-400 font-semibold">{rotY.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={rotY}
                onChange={(e) => handleRotYChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-180°</span>
                <span className="text-emerald-400 font-semibold">0.0° (Aligned)</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Rotation Z (Roll) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Rotation Z (Roll / Wings)</span>
                <span className="font-mono text-sky-400 font-semibold">{rotZ.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={rotZ}
                onChange={(e) => handleRotZChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-180°</span>
                <span className="text-emerald-400 font-semibold">180.0° (Wings Level)</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Scale Factor */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Scale Multiplier</span>
                <span className="font-mono text-sky-400 font-semibold">{scale.toFixed(5)}</span>
              </div>
              <input
                type="range"
                min="0.010"
                max="0.050"
                step="0.0002"
                value={scale}
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.010 (Small)</span>
                <span className="text-emerald-400 font-semibold">0.02495 (~65m Span)</span>
                <span>0.050 (Large)</span>
              </div>
            </div>
          </div>

          {/* Model Native Coordinate Geometry Breakdown */}
          <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 text-xs space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Native GLB Axes Analysis</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Nose-to-Tail Axis:</span>
                <strong className="text-slate-200 font-mono">Y Axis (Nose = -Y, Tail = +Y)</strong>
              </div>
              <div className="flex justify-between">
                <span>Wingtip-to-Wingtip Axis:</span>
                <strong className="text-slate-200 font-mono">X Axis (Span = 2,605.5 units)</strong>
              </div>
              <div className="flex justify-between">
                <span>Vertical / Up Axis:</span>
                <strong className="text-slate-200 font-mono">Z Axis (Fin Tip = +Z: 770 units)</strong>
              </div>
            </div>
          </div>

          {/* Instructions note */}
          <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800 pt-3">
            Use OrbitControls (left drag to rotate, right drag to pan, scroll to zoom) to inspect level flight from any viewpoint. Use the top buttons to switch between presets.
          </div>

        </aside>
      </div>
    </div>
  );
};
