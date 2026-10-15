import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Camera,
  Compass,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Grid,
  Eye,
  EyeOff,
  Sun,
  Cloud,
  Sunset,
  Moon,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  FileCode,
  Download,
  ShieldCheck,
  Info
} from 'lucide-react';
import { getModelUrl } from '../../utils/modelUrl';
import { buildApprovedTruckAssembly } from '../cinematic/truckAssemblyConfig';
import { FORKLIFT_CONFIG } from '../cinematic/forkliftConfig';
import { buildCalibratedAircraftRig, APPROVED_AIRCRAFT_CONFIG } from '../cinematic/aircraftConfig';
import {
  STORYBOARD_SHOTS,
  StoryboardShotId,
  CameraConfig,
  ShotPreset,
} from './storyboardConfig';

interface CinematicStoryboardStudioProps {
  onSwitchToCinematic?: () => void;
  onSwitchToAircraftCalibration?: () => void;
  onSwitchToTruckCalibration?: () => void;
}

// Procedural textures for grounded environments
const createAsphaltTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#22262e';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    const speck = Math.random() > 0.96 ? Math.random() * 40 : Math.random() < 0.04 ? -25 : 0;
    const val = THREE.MathUtils.clamp(34 + noise + speck, 18, 70);
    data[i] = val;
    data[i + 1] = val + 1;
    data[i + 2] = val + 3;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 28);
  return texture;
};

const createConcreteApronTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#454e5b';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    const base = 72 + noise;
    data[i] = THREE.MathUtils.clamp(base - 1, 45, 115);
    data[i + 1] = THREE.MathUtils.clamp(base, 45, 115);
    data[i + 2] = THREE.MathUtils.clamp(base + 3, 45, 120);
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.strokeStyle = '#2d333e';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
};

// Ocean normal water simulation texture
const createOceanWaterTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const wave = Math.sin(x * 0.1) * Math.cos(y * 0.15) * 20;
      data[idx] = THREE.MathUtils.clamp(120 + wave, 90, 160); // Normal X
      data[idx + 1] = THREE.MathUtils.clamp(120 - wave, 90, 160); // Normal Y
      data[idx + 2] = 255; // Normal Z
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
};

export const CinematicStoryboardStudio: React.FC<CinematicStoryboardStudioProps> = ({
  onSwitchToCinematic,
  onSwitchToAircraftCalibration,
  onSwitchToTruckCalibration,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active shot tab
  const [activeShotId, setActiveShotId] = useState<StoryboardShotId>('yard');

  // Camera state for the active shot
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(
    STORYBOARD_SHOTS.yard.defaultCamera
  );

  // Loaded status and progress
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadedModelsText, setLoadedModelsText] = useState<string>('Initializing 3D assets...');

  // UI display toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showEditorial, setShowEditorial] = useState<boolean>(true);
  const [aspectRatioMode, setAspectRatioMode] = useState<'fullscreen' | '16:9' | '2.39:1'>('16:9');
  const [lightingMood, setLightingMood] = useState<'daylight' | 'overcast' | 'golden' | 'nordic'>('daylight');
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [savedShots, setSavedShots] = useState<Record<StoryboardShotId, CameraConfig>>(() => {
    const initial: Record<StoryboardShotId, CameraConfig> = {
      yard: STORYBOARD_SHOTS.yard.defaultCamera,
      truck: STORYBOARD_SHOTS.truck.defaultCamera,
      ship: STORYBOARD_SHOTS.ship.defaultCamera,
      aircraft: STORYBOARD_SHOTS.aircraft.defaultCamera,
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('meridiano_storyboard_approved_shots');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...initial, ...parsed };
        }
      } catch (e) {
        console.error('Failed to parse stored storyboard shots', e);
      }
    }
    return initial;
  });

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const lightsRef = useRef<{
    hemi: THREE.HemisphereLight;
    ambient: THREE.AmbientLight;
    sun: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
  } | null>(null);

  // Cache of parsed GLTF models
  const modelCacheRef = useRef<Record<string, THREE.Group>>({});
  // Shot root groups
  const shotGroupsRef = useRef<Record<StoryboardShotId, THREE.Group | null>>({
    yard: null,
    truck: null,
    ship: null,
    aircraft: null,
  });

  const activeShot = STORYBOARD_SHOTS[activeShotId];

  // Copy helper
  const handleCopyJSON = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  // Save current shot as approved
  const handleSaveApproved = () => {
    const updated = {
      ...savedShots,
      [activeShotId]: { ...cameraConfig },
    };
    setSavedShots(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('meridiano_storyboard_approved_shots', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save shots', e);
      }
    }
    setCopyFeedback('Approved Shot Saved!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Reset camera to default or preset
  const handleResetCamera = () => {
    const targetConfig = activeShot.defaultCamera;
    applyCameraConfig(targetConfig);
  };

  // Apply a specific camera preset
  const handleApplyPreset = (preset: ShotPreset) => {
    applyCameraConfig(preset.camera);
  };

  const applyCameraConfig = useCallback((cfg: CameraConfig) => {
    setCameraConfig(cfg);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(...cfg.position);
      cameraRef.current.fov = cfg.fov;
      cameraRef.current.updateProjectionMatrix();

      controlsRef.current.target.set(...cfg.target);
      controlsRef.current.update();
    }
  }, []);

  // Update camera when sliders change
  const updateCameraPosition = (axis: 0 | 1 | 2, val: number) => {
    const newPos: [number, number, number] = [...cameraConfig.position];
    newPos[axis] = val;
    const newConfig = { ...cameraConfig, position: newPos };
    setCameraConfig(newConfig);

    if (cameraRef.current) {
      cameraRef.current.position.set(...newPos);
    }
  };

  const updateCameraTarget = (axis: 0 | 1 | 2, val: number) => {
    const newTarget: [number, number, number] = [...cameraConfig.target];
    newTarget[axis] = val;
    const newConfig = { ...cameraConfig, target: newTarget };
    setCameraConfig(newConfig);

    if (controlsRef.current) {
      controlsRef.current.target.set(...newTarget);
      controlsRef.current.update();
    }
  };

  const updateCameraFov = (fov: number) => {
    const newConfig = { ...cameraConfig, fov };
    setCameraConfig(newConfig);

    if (cameraRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  // Update lighting mood
  useEffect(() => {
    if (!sceneRef.current || !lightsRef.current) return;
    const { hemi, ambient, sun, fill } = lightsRef.current;
    const scene = sceneRef.current;

    switch (lightingMood) {
      case 'daylight':
        scene.background = new THREE.Color(0xd6e3ef);
        scene.fog = new THREE.Fog(0xd6e3ef, 70, 480);
        hemi.color.setHex(0xe8f2fc);
        hemi.groundColor.setHex(0x505b69);
        hemi.intensity = 1.15;
        ambient.intensity = 0.45;
        sun.color.setHex(0xfffaed);
        sun.intensity = 2.15;
        sun.position.set(45, 60, 32);
        fill.color.setHex(0x9cc3e6);
        fill.intensity = 0.55;
        break;
      case 'overcast':
        scene.background = new THREE.Color(0xbcc7d4);
        scene.fog = new THREE.Fog(0xbcc7d4, 45, 340);
        hemi.color.setHex(0xd0d8e2);
        hemi.groundColor.setHex(0x3e4550);
        hemi.intensity = 1.35;
        ambient.intensity = 0.7;
        sun.color.setHex(0xeef2f7);
        sun.intensity = 1.25;
        sun.position.set(25, 70, 20);
        fill.color.setHex(0x95a4b5);
        fill.intensity = 0.8;
        break;
      case 'golden':
        scene.background = new THREE.Color(0xf4dfc8);
        scene.fog = new THREE.Fog(0xf4dfc8, 60, 420);
        hemi.color.setHex(0xfce7c8);
        hemi.groundColor.setHex(0x40322c);
        hemi.intensity = 1.05;
        ambient.intensity = 0.4;
        sun.color.setHex(0xffaa5e);
        sun.intensity = 2.6;
        sun.position.set(55, 32, 28);
        fill.color.setHex(0x8faec7);
        fill.intensity = 0.45;
        break;
      case 'nordic':
        scene.background = new THREE.Color(0x98aabf);
        scene.fog = new THREE.Fog(0x98aabf, 55, 380);
        hemi.color.setHex(0xc2d8ed);
        hemi.groundColor.setHex(0x232c38);
        hemi.intensity = 1.1;
        ambient.intensity = 0.35;
        sun.color.setHex(0xffffff);
        sun.intensity = 2.3;
        sun.position.set(38, 52, 40);
        fill.color.setHex(0x6a87a8);
        fill.intensity = 0.7;
        break;
    }
  }, [lightingMood]);

  // Main Three.js Scene Setup & Model Preloading
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd6e3ef);
    scene.fog = new THREE.Fog(0xd6e3ef, 70, 480);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.4, 1500);
    camera.position.set(...cameraConfig.position);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(...cameraConfig.target);
    controls.maxDistance = 600;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Listen to controls change to update React camera UI state
    let lastUpdate = 0;
    controls.addEventListener('change', () => {
      const now = performance.now();
      if (now - lastUpdate > 80) {
        lastUpdate = now;
        setCameraConfig({
          position: [
            parseFloat(camera.position.x.toFixed(2)),
            parseFloat(camera.position.y.toFixed(2)),
            parseFloat(camera.position.z.toFixed(2)),
          ],
          target: [
            parseFloat(controls.target.x.toFixed(2)),
            parseFloat(controls.target.y.toFixed(2)),
            parseFloat(controls.target.z.toFixed(2)),
          ],
          fov: Math.round(camera.fov),
        });
      }
    });

    // 5. Lighting
    const hemi = new THREE.HemisphereLight(0xe8f2fc, 0x505b69, 1.15);
    scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffaed, 2.15);
    sun.position.set(45, 60, 32);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 280;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x9cc3e6, 0.55);
    fill.position.set(-35, 25, -25);
    scene.add(fill);

    lightsRef.current = { hemi, ambient, sun, fill };

    // 6. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Load all models and construct the 4 shot scenes
    const loader = new GLTFLoader();
    const modelFiles = [
      'container.glb',
      'forklift.glb',
      'truck.glb',
      'chassis.glb',
      'container-ship.glb',
      'cargo-plane.glb',
    ];

    let loadedCount = 0;
    const loadPromise = (fileName: string) =>
      new Promise<THREE.Group>((resolve, reject) => {
        setLoadedModelsText(`Loading ${fileName}...`);
        loader.load(
          getModelUrl(fileName),
          (gltf) => {
            loadedCount++;
            setLoadingProgress(Math.round((loadedCount / modelFiles.length) * 100));
            modelCacheRef.current[fileName] = gltf.scene;
            resolve(gltf.scene);
          },
          (xhr) => {
            if (xhr.total > 0) {
              const p = (xhr.loaded / xhr.total) * (100 / modelFiles.length);
              setLoadingProgress(Math.round((loadedCount / modelFiles.length) * 100 + p));
            }
          },
          (err) => {
            console.error(`Error loading ${fileName}:`, err);
            reject(err);
          }
        );
      });

    Promise.all(modelFiles.map(loadPromise))
      .then(() => {
        console.log('All storyboard models cached successfully!');
        buildAllShotScenes(scene);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Storyboard asset loading error:', err);
        setIsLoading(false);
      });

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Construct individual shot scenes inside the Three.js scene
  const buildAllShotScenes = (scene: THREE.Scene) => {
    const cache = modelCacheRef.current;
    if (!cache['container.glb']) return;

    // Helper to style container in Meridiano Navy
    const applyContainerNavyMaterial = (group: THREE.Group) => {
      const navyMat = new THREE.MeshStandardMaterial({
        color: 0x092b52,
        roughness: 0.42,
        metalness: 0.28,
        side: THREE.DoubleSide,
      });
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).material = navyMat;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
    };

    // ========================================================================
    // SHOT 1: CONTAINER YARD
    // Models: container.glb + forklift.glb
    // ========================================================================
    const yardGroup = new THREE.Group();
    yardGroup.name = 'ShotGroup_Yard';

    // Terminal Concrete Apron Ground (Width 90m, Length 70m)
    const apronMat = new THREE.MeshStandardMaterial({
      map: createConcreteApronTexture(),
      roughness: 0.88,
      metalness: 0.08,
    });
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.receiveShadow = true;
    yardGroup.add(apron);

    // Staging Pad Marking
    const bayPadMat = new THREE.MeshBasicMaterial({
      color: 0x2e3846,
      transparent: true,
      opacity: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const bayPad = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 3.8), bayPadMat);
    bayPad.rotation.x = -Math.PI / 2;
    bayPad.position.set(0, 0.015, 0);
    yardGroup.add(bayPad);

    // Safety yellow line
    const yellowLineMat = new THREE.MeshBasicMaterial({
      color: 0xdf9a20,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    const yellowLine = new THREE.Mesh(new THREE.PlaneGeometry(42, 0.25), yellowLineMat);
    yellowLine.rotation.x = -Math.PI / 2;
    yellowLine.position.set(0, 0.02, 3.8);
    yardGroup.add(yellowLine);

    // 1A. Dominant 12m Container
    const rawContainer1 = cache['container.glb'].clone();
    const boxCont = new THREE.Box3().setFromObject(rawContainer1);
    const centerCont = boxCont.getCenter(new THREE.Vector3());
    const sizeCont = boxCont.getSize(new THREE.Vector3());
    rawContainer1.position.set(-centerCont.x, -boxCont.min.y, -centerCont.z);

    const contGroup = new THREE.Group();
    contGroup.add(rawContainer1);
    // Standard 40ft high cube scaling
    const sLen = 12.0 / sizeCont.x;
    const sWid = 2.44 / sizeCont.z;
    const sHei = 2.60 / sizeCont.y;
    contGroup.scale.set(sLen, sHei, sWid);
    contGroup.position.set(0, 0, 0);
    contGroup.rotation.y = Math.PI / 2; // Length along Z
    applyContainerNavyMaterial(contGroup);
    yardGroup.add(contGroup);

    // 1B. Forklift (Grounded as supporting industrial element beside the container)
    const rawForklift = cache['forklift.glb'].clone();
    rawForklift.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    const boxFork = new THREE.Box3().setFromObject(rawForklift);
    const centerFork = boxFork.getCenter(new THREE.Vector3());
    rawForklift.position.set(-centerFork.x, -boxFork.min.y, -centerFork.z);

    const forkGroup = new THREE.Group();
    forkGroup.add(rawForklift);
    forkGroup.scale.setScalar(FORKLIFT_CONFIG.scale);
    forkGroup.position.set(FORKLIFT_CONFIG.position[0], 0, FORKLIFT_CONFIG.position[2]);
    forkGroup.rotation.set(...FORKLIFT_CONFIG.rotation);
    yardGroup.add(forkGroup);

    // Secondary stacked background containers for industrial terminal depth
    const createBgContainer = (pos: [number, number, number], rotY: number, colorHex: number) => {
      const bgCont = cache['container.glb'].clone();
      const bMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.5,
        metalness: 0.2,
      });
      bgCont.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).material = bMat;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      const bgBox = new THREE.Box3().setFromObject(bgCont);
      const bgC = bgBox.getCenter(new THREE.Vector3());
      bgCont.position.set(-bgC.x, -bgBox.min.y, -bgC.z);
      const bgGrp = new THREE.Group();
      bgGrp.add(bgCont);
      bgGrp.scale.set(sLen, sHei, sWid);
      bgGrp.position.set(...pos);
      bgGrp.rotation.y = rotY;
      yardGroup.add(bgGrp);
    };
    createBgContainer([-5.2, 0, -1.5], Math.PI / 2, 0x1f2937); // Dark graphite
    createBgContainer([-5.2, 2.62, -1.5], Math.PI / 2, 0x1e3a5f); // Deep navy stack
    createBgContainer([-10.4, 0, -2.5], Math.PI / 2, 0x334155);

    scene.add(yardGroup);
    shotGroupsRef.current.yard = yardGroup;

    // ========================================================================
    // SHOT 2: ROAD TRANSPORT
    // Models: truck.glb + chassis.glb + container.glb
    // Strictly uses buildApprovedTruckAssembly
    // ========================================================================
    const truckShotGroup = new THREE.Group();
    truckShotGroup.name = 'ShotGroup_Truck';

    // Highway road surface (Length 120m, Width 16m)
    const roadMat = new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(),
      roughness: 0.82,
      metalness: 0.12,
    });
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -26.0);
    roadMesh.receiveShadow = true;
    truckShotGroup.add(roadMesh);

    // Curbs & Shoulders
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x5a6575, roughness: 0.85 });
    const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 120), curbMat);
    curbL.position.set(-8.35, 0.04, -26.0);
    curbL.receiveShadow = true;
    truckShotGroup.add(curbL);

    const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 120), curbMat);
    curbR.position.set(8.35, 0.04, -26.0);
    curbR.receiveShadow = true;
    truckShotGroup.add(curbR);

    // Solid white edge lines & dashed divider
    const whiteLineMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const whiteL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 120), whiteLineMat);
    whiteL.rotation.x = -Math.PI / 2;
    whiteL.position.set(-7.0, 0.02, -26.0);
    truckShotGroup.add(whiteL);

    const whiteR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 120), whiteLineMat);
    whiteR.rotation.x = -Math.PI / 2;
    whiteR.position.set(7.0, 0.02, -26.0);
    truckShotGroup.add(whiteR);

    // Distant highway terrain horizon
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x3b4452, roughness: 0.95 });
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(240, 180), terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.05, -30.0);
    terrain.receiveShadow = true;
    truckShotGroup.add(terrain);

    // Build the approved TruckAssembly
    const rawTruck = cache['truck.glb'].clone();
    const rawChassis = cache['chassis.glb'].clone();
    const rawTruckCont = cache['container.glb'].clone();
    const truckAssembly = buildApprovedTruckAssembly(rawTruck, rawChassis, rawTruckCont);

    // Orient facing forward down the highway (-Z)
    truckAssembly.rotation.y = -Math.PI / 2;
    truckAssembly.position.set(0, 0, -26.5);
    truckShotGroup.add(truckAssembly);

    scene.add(truckShotGroup);
    shotGroupsRef.current.truck = truckShotGroup;

    // ========================================================================
    // SHOT 3: MARITIME TRANSPORT
    // Model: container-ship.glb
    // ========================================================================
    const shipShotGroup = new THREE.Group();
    shipShotGroup.name = 'ShotGroup_Ship';

    // Ocean Surface Plane (Width 1200m, Length 1200m)
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x091e36,
      roughness: 0.16,
      metalness: 0.78,
      normalMap: createOceanWaterTexture(),
      normalScale: new THREE.Vector2(0.2, 0.2),
    });
    const oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, 0, -195.0);
    oceanMesh.receiveShadow = true;
    shipShotGroup.add(oceanMesh);

    // Ship Model with Waterline Submersion
    const rawShip = cache['container-ship.glb'].clone();
    rawShip.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        const mesh = c as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.side = THREE.DoubleSide;
          });
        } else if (mesh.material) {
          (mesh.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    const boxShip = new THREE.Box3().setFromObject(rawShip);
    const centerShip = boxShip.getCenter(new THREE.Vector3());
    const sizeShip = boxShip.getSize(new THREE.Vector3());
    rawShip.position.set(-centerShip.x, -boxShip.min.y, -centerShip.z);

    const shipGroup = new THREE.Group();
    shipGroup.name = 'ContainerShip';
    shipGroup.add(rawShip);

    const shipLength = Math.max(sizeShip.x, sizeShip.y, sizeShip.z);
    const shipScale = 175.0 / shipLength;
    shipGroup.scale.setScalar(shipScale);
    // Positioned with waterline submerged at Y = -3.2, facing down the channel
    shipGroup.position.set(-14.0, -3.2, -192.0);
    shipGroup.rotation.y = Math.PI / 2;
    shipShotGroup.add(shipGroup);

    scene.add(shipShotGroup);
    shotGroupsRef.current.ship = shipShotGroup;

    // ========================================================================
    // SHOT 4: AIR TRANSPORT
    // Model: cargo-plane.glb
    // Strictly uses buildCalibratedAircraftRig & APPROVED_AIRCRAFT_CONFIG
    // ========================================================================
    const aircraftShotGroup = new THREE.Group();
    aircraftShotGroup.name = 'ShotGroup_Aircraft';

    // Sky Horizon Atmospheric Backdrop
    const skyDomeMat = new THREE.MeshBasicMaterial({
      color: 0xc4d8ec,
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyDomeMat);
    aircraftShotGroup.add(skyDome);

    // Soft Distance Cloud Horizon Sheet (Far below at Y = -180)
    const cloudFloorMat = new THREE.MeshStandardMaterial({
      color: 0xe8eff8,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.75,
    });
    const cloudFloor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), cloudFloorMat);
    cloudFloor.rotation.x = -Math.PI / 2;
    cloudFloor.position.set(0, -140, 0);
    aircraftShotGroup.add(cloudFloor);

    // Calibrated Aircraft Rig
    const rawPlane = cache['cargo-plane.glb'].clone();
    // Build canonical hierarchy: AircraftRig → OrientationCorrection → RawCargoPlane
    const { rig: calibratedRig } = buildCalibratedAircraftRig(rawPlane, APPROVED_AIRCRAFT_CONFIG);
    // Center at origin [0, 0, 0] in storyboard studio so camera orbits effortlessly around it
    calibratedRig.position.set(0, 0, 0);
    aircraftShotGroup.add(calibratedRig);

    scene.add(aircraftShotGroup);
    shotGroupsRef.current.aircraft = aircraftShotGroup;

    // Initially activate the selected shot
    updateVisibleShot('yard');
  };

  // Switch visible shot in Three.js scene
  const updateVisibleShot = (shotId: StoryboardShotId) => {
    Object.entries(shotGroupsRef.current).forEach(([id, grp]) => {
      if (grp) {
        grp.visible = id === shotId;
      }
    });
  };

  // Tab switch handler
  const handleSelectShot = (shotId: StoryboardShotId) => {
    setActiveShotId(shotId);
    updateVisibleShot(shotId);

    // Use saved configuration if available, otherwise default
    const targetConfig = savedShots[shotId] || STORYBOARD_SHOTS[shotId].defaultCamera;
    applyCameraConfig(targetConfig);
  };

  // Keyboard navigation (1, 2, 3, 4 to switch shots)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') handleSelectShot('yard');
      if (e.key === '2') handleSelectShot('truck');
      if (e.key === '3') handleSelectShot('ship');
      if (e.key === '4') handleSelectShot('aircraft');
      if (e.key === 'g' || e.key === 'G') setShowGrid((prev) => !prev);
      if (e.key === 't' || e.key === 'T') setShowEditorial((prev) => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savedShots]);

  // Current shot JSON snippet
  const currentShotJSON = JSON.stringify(
    {
      shot: `${activeShot.index}_${activeShot.id.toUpperCase()}`,
      title: activeShot.title,
      camera: {
        position: cameraConfig.position,
        target: cameraConfig.target,
        fov: cameraConfig.fov,
      },
    },
    null,
    2
  );

  // All 4 shots JSON export
  const allShotsJSON = JSON.stringify(
    {
      project: 'MERIDIANO_CINEMATIC_STORYBOARD',
      status: 'APPROVED_CINEMATIC_SHOTS',
      shots: Object.keys(STORYBOARD_SHOTS).reduce((acc, key) => {
        const id = key as StoryboardShotId;
        const cfg = savedShots[id] || STORYBOARD_SHOTS[id].defaultCamera;
        acc[id] = {
          shot: `${STORYBOARD_SHOTS[id].index}_${id.toUpperCase()}`,
          title: STORYBOARD_SHOTS[id].title,
          camera: {
            position: cfg.position,
            target: cfg.target,
            fov: cfg.fov,
          },
        };
        return acc;
      }, {} as Record<string, unknown>),
    },
    null,
    2
  );

  return (
    <div className="relative w-full h-screen bg-[#090d16] text-slate-100 overflow-hidden select-none font-sans flex flex-col">
      {/* ==================================================================== */}
      {/* TOP STATUS & NAVIGATION BAR (Editorial Industrial Aesthetic) */}
      {/* ==================================================================== */}
      <header className="z-30 w-full h-14 bg-[#0d121c]/95 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        {/* Left: Branding & Studio Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-mono text-xs tracking-widest text-slate-200 font-bold uppercase">
              MERIDIANO
            </h1>
            <span className="text-slate-600 font-mono text-xs">/</span>
            <span className="text-slate-300 font-mono text-xs tracking-wider">
              STORYBOARD STUDIO
            </span>
          </div>

          <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            CINEMATOGRAPHY APPROVAL
          </span>
        </div>

        {/* Center: Shot Tabs [01 YARD | 02 TRUCK | 03 SHIP | 04 AIRCRAFT] */}
        <nav className="flex items-center gap-1 bg-[#131a27] p-1 rounded-lg border border-slate-800/80">
          {(Object.keys(STORYBOARD_SHOTS) as StoryboardShotId[]).map((shotId) => {
            const shot = STORYBOARD_SHOTS[shotId];
            const isActive = activeShotId === shotId;
            return (
              <button
                key={shotId}
                onClick={() => handleSelectShot(shotId)}
                className={`relative px-3.5 py-1.5 rounded text-xs font-mono tracking-wider transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-200 text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={`text-[10px] ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                  {shot.index}
                </span>
                <span>{shot.id.toUpperCase()}</span>
                {savedShots[shotId] && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-emerald-600' : 'bg-emerald-400'
                    }`}
                    title="Approved calibration saved"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Tools & View Mode Switchers */}
        <div className="flex items-center gap-2">
          {/* Rule of Thirds Grid Toggle */}
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            title="Toggle Rule-of-Thirds Composition Grid (G)"
            className={`p-2 rounded border text-xs flex items-center gap-1.5 transition-colors ${
              showGrid
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-mono">GRID</span>
          </button>

          {/* Editorial Typography Toggle */}
          <button
            onClick={() => setShowEditorial((prev) => !prev)}
            title="Toggle Editorial Typography Placement Preview (T)"
            className={`p-2 rounded border text-xs flex items-center gap-1.5 transition-colors ${
              showEditorial
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showEditorial ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline text-[11px] font-mono">EDITORIAL</span>
          </button>

          {/* Copy All JSON */}
          <button
            onClick={() => handleCopyJSON(allShotsJSON, 'All 4 Shots Exported!')}
            title="Export all 4 approved shots as JSON"
            className="p-2 rounded border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px] font-mono">EXPORT ALL</span>
          </button>

          {/* Switch to Full Cinematic Scroll Experience */}
          {onSwitchToCinematic && (
            <button
              onClick={onSwitchToCinematic}
              className="px-3 py-1.5 rounded border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750 hover:border-slate-500 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">VIEW SCROLL SITE</span>
            </button>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3D CANVAS VIEWPORT AREA */}
      {/* ==================================================================== */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full bg-[#0a0f18] overflow-hidden flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Aspect Ratio Framing Guides (16:9 / 2.39:1 Cinema Letterbox) */}
        {aspectRatioMode !== 'fullscreen' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10">
            <div
              className="w-full bg-black/90 border-b border-white/10 transition-all"
              style={{
                height:
                  aspectRatioMode === '16:9'
                    ? 'calc((100% - (100vw * 9 / 16)) / 2)'
                    : 'calc((100% - (100vw / 2.39)) / 2)',
              }}
            />
            <div
              className="w-full bg-black/90 border-t border-white/10 transition-all"
              style={{
                height:
                  aspectRatioMode === '16:9'
                    ? 'calc((100% - (100vw * 9 / 16)) / 2)'
                    : 'calc((100% - (100vw / 2.39)) / 2)',
              }}
            />
          </div>
        )}

        {/* Rule-of-Thirds Composition Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-10 flex">
            {/* 3x3 Grid Lines */}
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-white/15">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10 relative">
                  {/* Intersection Accent Crosshairs */}
                  {i === 0 && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-r-2 border-b-2 border-amber-400/80" />
                  )}
                  {i === 1 && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-r-2 border-b-2 border-amber-400/80" />
                  )}
                  {i === 3 && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-r-2 border-b-2 border-amber-400/80" />
                  )}
                  {i === 4 && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-r-2 border-b-2 border-amber-400/80" />
                  )}
                </div>
              ))}
            </div>

            {/* Subtle Center Optical Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-amber-400/70 rounded-full" />
            </div>
          </div>
        )}

        {/* Editorial Negative-Space Typography Overlay (United Carriers Style) */}
        {showEditorial && (
          <div className="absolute inset-0 pointer-events-none z-15 p-12 md:p-16 flex flex-col justify-between">
            {/* Top Section */}
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[11px] tracking-widest text-slate-400/90 uppercase block mb-1">
                  {activeShot.editorialText.tag}
                </span>
                <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white/95 font-serif">
                  {activeShot.editorialText.headline}
                </h2>
                <p className="font-mono text-xs tracking-wider text-slate-300/80 uppercase mt-1">
                  {activeShot.editorialText.subheadline}
                </p>
              </div>

              {/* Top-Right Telemetry Data */}
              <div className="hidden md:block text-right font-mono text-[11px] text-slate-400/80 leading-relaxed whitespace-pre-line bg-black/30 backdrop-blur-sm p-3 rounded border border-white/10">
                {activeShot.editorialText.metaRight}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              {/* Editorial Caption / Copy */}
              <div className="max-w-md bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/10">
                <p className="text-sm font-light text-slate-200/90 leading-relaxed">
                  {activeShot.editorialText.description}
                </p>
              </div>

              {/* Bottom Telemetry Data */}
              <div className="font-mono text-[11px] text-slate-400/80 leading-relaxed whitespace-pre-line bg-black/30 backdrop-blur-sm p-3 rounded border border-white/10">
                {activeShot.editorialText.metaLeft}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#090d16]/95 z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin mb-4" />
            <h3 className="font-mono text-sm tracking-widest uppercase text-slate-200 mb-1">
              BUILDING 3D STORYBOARD ASSETS
            </h3>
            <p className="font-mono text-xs text-slate-400 mb-4">{loadedModelsText}</p>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-500 mt-2">{loadingProgress}%</span>
          </div>
        )}

        {/* Copy Feedback Notification Badge */}
        {copyFeedback && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-slate-950 font-mono text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{copyFeedback}</span>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM FLOATING CINEMATOGRAPHY CONTROLS DRAWER */}
      {/* ==================================================================== */}
      <footer
        className={`z-30 w-full bg-[#0d121c]/95 backdrop-blur-md border-t border-slate-800 transition-all duration-300 flex flex-col ${
          isControlsCollapsed ? 'h-9' : 'h-auto max-h-72 overflow-y-auto'
        }`}
      >
        {/* Drawer Header Toggle */}
        <div className="w-full h-9 px-4 flex items-center justify-between border-b border-slate-800/60 bg-[#111724]/80">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              SHOT {activeShot.index}: {activeShot.title}
            </span>
            <span className="text-slate-600 font-mono text-xs">|</span>
            <span className="font-mono text-[10px] text-slate-400">
              FOV: {cameraConfig.fov}° · CAM: [{cameraConfig.position.join(', ')}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Aspect Ratio Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500">FRAME:</span>
              {(['fullscreen', '16:9', '2.39:1'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAspectRatioMode(mode)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    aspectRatioMode === mode
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Atmosphere Mood Selector */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500">LIGHT:</span>
              <button
                onClick={() => setLightingMood('daylight')}
                title="Clean Daylight Atmosphere"
                className={`p-1 rounded ${
                  lightingMood === 'daylight'
                    ? 'text-amber-300 bg-slate-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sun className="w-3 h-3" />
              </button>
              <button
                onClick={() => setLightingMood('overcast')}
                title="Overcast Soft Industrial"
                className={`p-1 rounded ${
                  lightingMood === 'overcast'
                    ? 'text-blue-300 bg-slate-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Cloud className="w-3 h-3" />
              </button>
              <button
                onClick={() => setLightingMood('golden')}
                title="Golden Hour Low Sun"
                className={`p-1 rounded ${
                  lightingMood === 'golden'
                    ? 'text-orange-400 bg-slate-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sunset className="w-3 h-3" />
              </button>
              <button
                onClick={() => setLightingMood('nordic')}
                title="Nordic High Contrast"
                className={`p-1 rounded ${
                  lightingMood === 'nordic'
                    ? 'text-indigo-300 bg-slate-800'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Moon className="w-3 h-3" />
              </button>
            </div>

            {/* Collapse / Expand Button */}
            <button
              onClick={() => setIsControlsCollapsed((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              {isControlsCollapsed ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Drawer Body Controls */}
        {!isControlsCollapsed && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            {/* Column 1: Presets for Active Shot */}
            <div className="space-y-2 border-r border-slate-800/80 pr-4">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">
                SHOT PRESETS
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeShot.presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full text-left p-2 rounded bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-amber-300">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 leading-tight mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: Camera Position Sliders */}
            <div className="space-y-2 border-r border-slate-800/80 pr-4">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">
                CAMERA POSITION
              </span>
              {/* X */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-slate-400">X:</span>
                <input
                  type="range"
                  min={activeShotId === 'ship' ? -250 : -90}
                  max={activeShotId === 'ship' ? 120 : 90}
                  step={0.5}
                  value={cameraConfig.position[0]}
                  onChange={(e) => updateCameraPosition(0, parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400 h-1 bg-slate-800 rounded"
                />
                <input
                  type="number"
                  step={0.5}
                  value={cameraConfig.position[0]}
                  onChange={(e) => updateCameraPosition(0, parseFloat(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right text-slate-200"
                />
              </div>
              {/* Y */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-slate-400">Y:</span>
                <input
                  type="range"
                  min={activeShotId === 'aircraft' ? -40 : 0.2}
                  max={activeShotId === 'ship' ? 60 : 40}
                  step={0.2}
                  value={cameraConfig.position[1]}
                  onChange={(e) => updateCameraPosition(1, parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400 h-1 bg-slate-800 rounded"
                />
                <input
                  type="number"
                  step={0.2}
                  value={cameraConfig.position[1]}
                  onChange={(e) => updateCameraPosition(1, parseFloat(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right text-slate-200"
                />
              </div>
              {/* Z */}
              <div className="flex items-center gap-2">
                <span className="w-4 text-slate-400">Z:</span>
                <input
                  type="range"
                  min={activeShotId === 'ship' ? -350 : -90}
                  max={activeShotId === 'ship' ? 50 : 90}
                  step={0.5}
                  value={cameraConfig.position[2]}
                  onChange={(e) => updateCameraPosition(2, parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400 h-1 bg-slate-800 rounded"
                />
                <input
                  type="number"
                  step={0.5}
                  value={cameraConfig.position[2]}
                  onChange={(e) => updateCameraPosition(2, parseFloat(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right text-slate-200"
                />
              </div>
            </div>

            {/* Column 3: Camera Target & FOV */}
            <div className="space-y-2 border-r border-slate-800/80 pr-4">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">
                LOOK TARGET & OPTICS
              </span>
              {/* Target Y */}
              <div className="flex items-center gap-2">
                <span className="w-8 text-slate-400">AIM Y:</span>
                <input
                  type="range"
                  min={activeShotId === 'ship' ? 0 : 0}
                  max={activeShotId === 'ship' ? 40 : 15}
                  step={0.2}
                  value={cameraConfig.target[1]}
                  onChange={(e) => updateCameraTarget(1, parseFloat(e.target.value))}
                  className="flex-1 accent-blue-400 h-1 bg-slate-800 rounded"
                />
                <span className="w-12 text-right text-slate-300 font-mono">
                  {cameraConfig.target[1]}m
                </span>
              </div>
              {/* Target Z */}
              <div className="flex items-center gap-2">
                <span className="w-8 text-slate-400">AIM Z:</span>
                <input
                  type="range"
                  min={activeShotId === 'ship' ? -260 : -45}
                  max={activeShotId === 'ship' ? -120 : 15}
                  step={0.5}
                  value={cameraConfig.target[2]}
                  onChange={(e) => updateCameraTarget(2, parseFloat(e.target.value))}
                  className="flex-1 accent-blue-400 h-1 bg-slate-800 rounded"
                />
                <span className="w-12 text-right text-slate-300 font-mono">
                  {cameraConfig.target[2]}m
                </span>
              </div>
              {/* FOV */}
              <div className="flex items-center gap-2">
                <span className="w-8 text-slate-400">FOV:</span>
                <input
                  type="range"
                  min={24}
                  max={65}
                  step={1}
                  value={cameraConfig.fov}
                  onChange={(e) => updateCameraFov(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-400 h-1 bg-slate-800 rounded"
                />
                <span className="w-12 text-right text-slate-300 font-mono">
                  {cameraConfig.fov}°
                </span>
              </div>
            </div>

            {/* Column 4: Approval & Export Actions */}
            <div className="space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block mb-1.5">
                  APPROVAL & EXPORT
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleSaveApproved}
                    className="w-full py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>APPROVE & SAVE SHOT</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopyJSON(currentShotJSON, 'Shot JSON Copied!')}
                      className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>COPY SHOT</span>
                    </button>
                    <button
                      onClick={handleResetCamera}
                      className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
                      title="Reset camera to default hero preset"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>RESET</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 leading-tight">
                Drag mouse inside viewport to orbit/pan. Use keyboard (1, 2, 3, 4) to switch shots.
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
