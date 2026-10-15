import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX, Globe, AlertCircle, RotateCcw } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';
import { getModelUrl } from '../../utils/modelUrl';
import { buildApprovedTruckAssembly, APPROVED_TRUCK_ASSEMBLY_CONFIG } from './truckAssemblyConfig';
import { FORKLIFT_CONFIG } from './forkliftConfig';
import { buildCalibratedAircraftRig, APPROVED_AIRCRAFT_CONFIG } from './aircraftConfig';
import { buildContainerHandlerRig, ContainerHandlerRig } from './containerHandlerRig';

gsap.registerPlugin(ScrollTrigger);

interface ContinuousLogisticsJourneyProps {
  onSwitchToOpening?: () => void;
  onSwitchToDiagnostic?: () => void;
  onSwitchToLoading?: () => void;
}

interface Keyframe {
  progress: number;
  camPos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

// ============================================================================
// PROCEDURAL ENVIRONMENT TEXTURES (HIGH PERFORMANCE PROCEDURAL TEXTURES)
// ============================================================================

const createAsphaltTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#1e232b';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    const speck = Math.random() > 0.96 ? Math.random() * 38 : Math.random() < 0.04 ? -22 : 0;
    const val = THREE.MathUtils.clamp(32 + noise + speck, 18, 68);
    data[i] = val;
    data[i + 1] = val + 1;
    data[i + 2] = val + 3;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 36);
  texture.anisotropy = 8;
  return texture;
};

const createConcreteApronTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#3c4550';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    const base = 68 + noise;
    data[i] = THREE.MathUtils.clamp(base - 1, 40, 105);
    data[i + 1] = THREE.MathUtils.clamp(base, 40, 105);
    data[i + 2] = THREE.MathUtils.clamp(base + 3, 40, 110);
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.strokeStyle = '#272d36';
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
  texture.repeat.set(8, 6);
  texture.anisotropy = 8;
  return texture;
};

const createWaterNormalTexture = (): THREE.CanvasTexture => {
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
      const waveX = Math.sin((x / 256) * Math.PI * 8) * 20;
      const waveY = Math.cos((y / 256) * Math.PI * 8) * 20;
      data[idx] = THREE.MathUtils.clamp(128 + waveX, 0, 255);
      data[idx + 1] = THREE.MathUtils.clamp(128 + waveY, 0, 255);
      data[idx + 2] = 255;
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

// ============================================================================
// CONTINUOUS MASTER CINEMATIC KEYFRAME SPLINE
// 0.00 – 0.16 : Container Pickup / Staging & Controlled Twistlock Touchdown
// 0.16 – 0.36 : Truck Assembly Departure & Road Tracking
// 0.36 – 0.52 : Port Access Corridor & Natural Harbor Basin Transition
// 0.52 – 0.72 : Container Ship Establishing & Water-Level Ocean Voyage
// 0.72 – 0.88 : Continuous Camera Ascent, Vast Global Reveal & Cargo Aircraft
// 0.88 – 1.00 : Horizon Recede & Final MERIDIANO Editorial Statement
// ============================================================================
const MASTER_KEYFRAMES: Keyframe[] = [
  // 1. TERMINAL CONTAINER STAGING & LOADING (0.00 - 0.16)
  // Wide, elevated 3/4 framing strictly kept throughout loading:
  // Screen Left: Empty trailer chassis • Center: Grounded container • Screen Right: Orange reach stacker
  // Zero occlusion, zero cutting inside container, completely clear view of approach, lift, and placement
  {
    progress: 0.00,
    camPos: new THREE.Vector3(9.0, 11.25, 19.525),
    target: new THREE.Vector3(3.2, 1.8, 4.0),
    fov: 42,
  },
  {
    progress: 0.05,
    camPos: new THREE.Vector3(9.0, 11.25, 19.525),
    target: new THREE.Vector3(3.2, 1.8, 4.0),
    fov: 42,
  },
  {
    progress: 0.10,
    camPos: new THREE.Vector3(9.0, 11.25, 19.525),
    target: new THREE.Vector3(3.2, 1.8, 4.0),
    fov: 42,
  },
  {
    progress: 0.16,
    camPos: new THREE.Vector3(9.0, 11.25, 19.525),
    target: new THREE.Vector3(3.2, 1.8, 4.0),
    fov: 42,
  },

  // 2. TRUCK DEPARTURE & STRAIGHT TRAVEL (0.16 - 0.36)
  // Truck drives straight forward toward screen-right; cab leads movement
  {
    progress: 0.22,
    camPos: new THREE.Vector3(9.5, 5.2, 8.0),
    target: new THREE.Vector3(0.0, 1.8, -12.0),
    fov: 38,
  },
  {
    progress: 0.29,
    camPos: new THREE.Vector3(10.0, 4.6, -15.0),
    target: new THREE.Vector3(0.0, 1.8, -35.0),
    fov: 38,
  },
  {
    progress: 0.36,
    camPos: new THREE.Vector3(10.5, 4.2, -38.0),
    target: new THREE.Vector3(0.0, 1.8, -58.0),
    fov: 38,
  },

  // 3. PORT TERMINAL ARRIVAL & DOCKSIDE ROAD (0.36 - 0.52)
  // Truck arrives at terminal and stops behind container stacks
  // Container stacks serve as cinematic foreground transition wipe to ship
  {
    progress: 0.42,
    camPos: new THREE.Vector3(11.0, 4.8, -58.0),
    target: new THREE.Vector3(0.0, 2.0, -78.0),
    fov: 40,
  },
  {
    progress: 0.48,
    camPos: new THREE.Vector3(13.0, 6.2, -76.0),
    target: new THREE.Vector3(-6.0, 3.2, -100.0),
    fov: 42,
  },
  {
    progress: 0.52,
    camPos: new THREE.Vector3(16.0, 8.5, -95.0),
    target: new THREE.Vector3(-16.0, 4.5, -135.0),
    fov: 44,
  },

  // 4. CONTAINER SHIP & MARITIME HARBOR BASIN (0.52 - 0.72)
  {
    progress: 0.58,
    camPos: new THREE.Vector3(24.0, 12.0, -120.0),
    target: new THREE.Vector3(-22.0, 5.5, -165.0),
    fov: 44,
  },
  {
    progress: 0.65,
    camPos: new THREE.Vector3(20.0, 18.0, -150.0),
    target: new THREE.Vector3(-20.0, 7.0, -195.0),
    fov: 43,
  },
  {
    progress: 0.72,
    camPos: new THREE.Vector3(12.0, 45.0, -190.0),
    target: new THREE.Vector3(-10.0, 12.0, -230.0),
    fov: 44,
  },

  // 5. GLOBAL REVEAL & VERTICAL SCREEN AIRCRAFT COMPOSITION (0.72 - 0.88)
  // Overhead corridor perspective: camera tracks along centerline (X=0) high above flight path
  // Nose-to-tail axis appears strictly vertical on screen (0° tilt), nose toward top of screen
  {
    progress: 0.77,
    camPos: new THREE.Vector3(0.0, 195.0, -280.0),
    target: new THREE.Vector3(0.0, 122.0, -370.0),
    fov: 40,
  },
  {
    progress: 0.82,
    camPos: new THREE.Vector3(0.0, 215.0, -325.0),
    target: new THREE.Vector3(0.0, 122.0, -425.0),
    fov: 38,
  },
  {
    progress: 0.88,
    camPos: new THREE.Vector3(0.0, 235.0, -385.0),
    target: new THREE.Vector3(0.0, 122.0, -500.0),
    fov: 38,
  },

  // 6. FINAL STATEMENT & RECEDING HORIZON (0.88 - 1.00)
  {
    progress: 0.94,
    camPos: new THREE.Vector3(0.0, 250.0, -450.0),
    target: new THREE.Vector3(0.0, 122.0, -590.0),
    fov: 40,
  },
  {
    progress: 1.00,
    camPos: new THREE.Vector3(0.0, 260.0, -530.0),
    target: new THREE.Vector3(0.0, 122.0, -690.0),
    fov: 42,
  },
];

export const ContinuousLogisticsJourney: React.FC<ContinuousLogisticsJourneyProps> = ({
  onSwitchToOpening,
  onSwitchToDiagnostic,
  onSwitchToLoading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // UI state
  const [lang, setLang] = useState<'bg' | 'en'>('bg');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [showTechnicalNote, setShowTechnicalNote] = useState<boolean>(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Object references
  const modelsRef = useRef<{
    forklift?: THREE.Group;
    containerHandlerRig?: ContainerHandlerRig;
    stagingContainer?: THREE.Group;
    truckAssembly?: THREE.Group;
    truckTravelRoot?: THREE.Group;
    shipGroup?: THREE.Group;
    aircraftRig?: THREE.Group;
    oceanMesh?: THREE.Mesh;
    sunLight?: THREE.DirectionalLight;
  }>({});

  // Deterministic lerp progress
  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);
  const lastAudioPhaseRef = useRef<number>(-1);

  // Spline interpolation
  const sampleTimeline = (p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    let i = 0;
    while (i < MASTER_KEYFRAMES.length - 1 && MASTER_KEYFRAMES[i + 1].progress < clamped) {
      i++;
    }
    const k1 = MASTER_KEYFRAMES[i];
    const k2 = MASTER_KEYFRAMES[Math.min(i + 1, MASTER_KEYFRAMES.length - 1)];

    if (k1 === k2 || k1.progress === k2.progress) {
      return { pos: k1.camPos.clone(), target: k1.target.clone(), fov: k1.fov };
    }

    const t = (clamped - k1.progress) / (k2.progress - k1.progress);
    // Smooth cosine interpolation
    const smoothT = 0.5 - 0.5 * Math.cos(t * Math.PI);

    const pos = new THREE.Vector3().lerpVectors(k1.camPos, k2.camPos, smoothT);
    const target = new THREE.Vector3().lerpVectors(k1.target, k2.target, smoothT);
    const fov = THREE.MathUtils.lerp(k1.fov, k2.fov, smoothT);

    return { pos, target, fov };
  };

  // Helper to load GLTF with fallback
  const loadGLTF = (loader: GLTFLoader, url: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => {
          console.warn(`Primary load failed for ${url}, trying fallback path:`, err);
          const fallback = url.startsWith('/models/') ? `/public${url}` : url.replace('/public', '');
          loader.load(
            fallback,
            (gltfFallback) => resolve(gltfFallback.scene),
            undefined,
            (err2) => {
              console.error(`Both paths failed for model ${url}:`, err2);
              reject(err2);
            }
          );
        }
      );
    });
  };

  // Audio mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  };

  // Scroll to top replay
  const handleReplay = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================================================
  // INITIALIZATION & LIFECYCLE
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const daylightSky = new THREE.Color(0xd2e0ed);
    scene.background = daylightSky;
    scene.fog = new THREE.Fog(0xd2e0ed, 75, 480);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(9.4, 3.8, 6.4);
    camera.lookAt(3.2, 1.8, 0.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xd4e2f0, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ed, 1.75);
    sunLight.position.set(45, 60, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 280;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    modelsRef.current.sunLight = sunLight;

    const fillLight = new THREE.DirectionalLight(0x94b4cf, 0.4);
    fillLight.position.set(-30, 20, -25);
    scene.add(fillLight);

    // 3. Sky Dome Mesh
    const skyGeo = new THREE.SphereGeometry(950, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 128;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#3e6a96');
      grad.addColorStop(0.45, '#7fa3c5');
      grad.addColorStop(0.85, '#bed3e6');
      grad.addColorStop(1.0, '#d2e0ed');
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 128, 512);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, -2, -150);
    scene.add(skyMesh);

    // 4. Terminal Staging Apron & Infrastructure (Z: 20 to -35)
    const apronGeo = new THREE.PlaneGeometry(80, 60);
    const apronMat = new THREE.MeshStandardMaterial({
      map: createConcreteApronTexture(),
      roughness: 0.72,
      metalness: 0.12,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(6, 0, 0);
    apronMesh.receiveShadow = true;
    scene.add(apronMesh);

    // Yellow safety loading dock guide lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xdeb438, depthWrite: false });
    const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 24), lineMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(2.8, 0.005, 0);
    scene.add(line1);

    const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 24), lineMat);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(7.0, 0.005, 0);
    scene.add(line2);

    // Multi-tier ISO Container Stacks along terminal perimeter (providing industrial scale)
    const stackGroup = new THREE.Group();
    const stackMatNavy = new THREE.MeshStandardMaterial({ color: 0x092b52, roughness: 0.45, metalness: 0.25 });
    const stackMatRust = new THREE.MeshStandardMaterial({ color: 0x8b3e2b, roughness: 0.55, metalness: 0.2 });
    const stackMatOrange = new THREE.MeshStandardMaterial({ color: 0xc86420, roughness: 0.5, metalness: 0.2 });
    const stackMatGreen = new THREE.MeshStandardMaterial({ color: 0x264d3b, roughness: 0.5, metalness: 0.2 });

    const createDummyContainer = (w: number, h: number, l: number, mat: THREE.Material, pos: [number, number, number]) => {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
      cMesh.position.set(...pos);
      cMesh.castShadow = true;
      cMesh.receiveShadow = true;
      return cMesh;
    };

    // Keep the loading bay clear: the five decorative containers behind the
    // reach stacker obscured the working spreader and its container.

    // Stacks framing the road transition at Z = -125 (acting as foreground transition before harbor)
    stackGroup.add(createDummyContainer(2.6, 2.9, 12.2, stackMatRust, [12.0, 1.45, -125.0]));
    stackGroup.add(createDummyContainer(2.6, 2.9, 12.2, stackMatNavy, [12.0, 4.35, -125.0]));
    stackGroup.add(createDummyContainer(2.6, 2.9, 12.2, stackMatOrange, [15.0, 1.45, -125.0]));
    stackGroup.add(createDummyContainer(2.6, 2.9, 12.2, stackMatGreen, [15.0, 4.35, -125.0]));
    scene.add(stackGroup);

    // 5. Port Access Highway Road (Z: -20 to -145)
    const roadGroup = new THREE.Group();
    const roadGeo = new THREE.PlaneGeometry(16, 130);
    const roadMat = new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(),
      roughness: 0.68,
      metalness: 0.15,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -85);
    roadMesh.receiveShadow = true;
    roadGroup.add(roadMesh);

    // White continuous road edge lines
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xefefef, depthWrite: false });
    const edgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 130), whiteLineMat);
    edgeL.rotation.x = -Math.PI / 2;
    edgeL.position.set(-6.8, 0.005, -85);
    roadGroup.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 130), whiteLineMat);
    edgeR.rotation.x = -Math.PI / 2;
    edgeR.position.set(6.8, 0.005, -85);
    roadGroup.add(edgeR);

    // Dashed center divider
    for (let z = -25; z >= -145; z -= 7) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.8), whiteLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.005, z);
      roadGroup.add(dash);
    }
    scene.add(roadGroup);

    // 6. Harbor Quay & Deep Ocean Surface (Z: -140 to -900)
    const oceanGeo = new THREE.PlaneGeometry(1600, 1200, 64, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x14344d,
      roughness: 0.18,
      metalness: 0.85,
      normalMap: createWaterNormalTexture(),
      normalScale: new THREE.Vector2(0.65, 0.65),
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -3.2, -480);
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);
    modelsRef.current.oceanMesh = oceanMesh;

    // Concrete Quay Seawall separating highway from ocean at Z = -145
    const quayGeo = new THREE.BoxGeometry(60, 4.5, 6);
    const quayMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.8, metalness: 0.1 });
    const quayMesh = new THREE.Mesh(quayGeo, quayMat);
    quayMesh.position.set(0, -1.0, -148);
    quayMesh.receiveShadow = true;
    quayMesh.castShadow = true;
    scene.add(quayMesh);

    // Distant port container gantry cranes along harbor quay edge
    const craneGroup = new THREE.Group();
    const craneMatOrange = new THREE.MeshStandardMaterial({ color: 0xd95a1e, roughness: 0.45, metalness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const cX = -45 - i * 35;
      const cZ = -195 - i * 20;
      const craneTower = new THREE.Mesh(new THREE.BoxGeometry(4, 38, 4), craneMatOrange);
      craneTower.position.set(cX, 16, cZ);
      craneTower.castShadow = true;
      craneGroup.add(craneTower);

      const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 3), craneMatOrange);
      craneBoom.position.set(cX + 12, 33, cZ);
      craneBoom.castShadow = true;
      craneGroup.add(craneBoom);
    }
    scene.add(craneGroup);

    // ========================================================================
    // LOAD MODELS: FORKLIFT, CONTAINER, TRUCK, CHASSIS, SHIP, CARGO PLANE
    // ========================================================================
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const totalCount = 6;
    const updateProgress = () => {
      loadedCount++;
      setLoadPercent(Math.round((loadedCount / totalCount) * 100));
      if (loadedCount >= totalCount) {
        setLoading(false);
      }
    };

    let rawTruckModel: THREE.Group | null = null;
    let rawChassisModel: THREE.Group | null = null;
    let rawContainerModel: THREE.Group | null = null;

    // A. FORKLIFT (Reach Stacker container handler: front facing container with spreader)
    loadGLTF(loader, getModelUrl('forklift.glb'))
      .then((raw) => {
        const handlerRig = buildContainerHandlerRig(raw);
        // Positioned in yard staging bay facing container front-first along -X (grounded at Y = 1.128)
        handlerRig.root.position.set(8.5, 0, 4.9);
        scene.add(handlerRig.root);
        modelsRef.current.containerHandlerRig = handlerRig;
        modelsRef.current.forklift = handlerRig.root;
        updateProgress();
      })
      .catch((e) => {
        console.error('Forklift error:', e);
        updateProgress();
      });

    // Function to assemble truck once truck, chassis, and container are loaded
    const tryAssembleTruck = () => {
      if (!rawTruckModel || !rawChassisModel || !rawContainerModel) return;

      // 1. Build TruckAssembly using approved calibration (preserved 100%)
      const truckAssembly = buildApprovedTruckAssembly(
        rawTruckModel,
        rawChassisModel,
        rawContainerModel.clone()
      );

      // Create parent TruckTravelRoot to orient the calibrated assembly forward along the road
      const truckTravelRoot = new THREE.Group();
      truckTravelRoot.name = 'TruckTravelRoot';
      // TruckAssembly forward (-X) rotates by -Math.PI / 2 around Y to align with road forward (-Z)
      truckAssembly.rotation.y = -Math.PI / 2;
      truckTravelRoot.add(truckAssembly);
      truckTravelRoot.position.set(0, 0, 0);

      // Initially, hide container inside truck assembly during loading phase (p < 0.16)
      const truckContainerChild = truckAssembly.getObjectByName('Container');
      if (truckContainerChild) {
        truckContainerChild.visible = false;
      }

      scene.add(truckTravelRoot);
      modelsRef.current.truckAssembly = truckAssembly;
      modelsRef.current.truckTravelRoot = truckTravelRoot;

      // 2. Build Staging Container (animates smoothly from yard pad onto chassis twistlocks from p: 0.00 -> 0.16)
      const stagingContainer = new THREE.Group();
      stagingContainer.name = 'StagingContainer';
      const rawC = rawContainerModel.clone();
      const contBox = new THREE.Box3().setFromObject(rawC);
      const cCenter = contBox.getCenter(new THREE.Vector3());
      rawC.position.set(-cCenter.x, -contBox.min.y, -cCenter.z);

      rawC.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.material = new THREE.MeshStandardMaterial({
            color: 0x092b52, // Meridiano Navy
            roughness: 0.42,
            metalness: 0.28,
            side: THREE.DoubleSide,
          });
        }
      });

      stagingContainer.add(rawC);
      // Use exact calibrated container scale & rotation to match chassis receiver
      stagingContainer.scale.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale);
      stagingContainer.rotation.y = -Math.PI / 2;
      // Staged on yard pad beside road
      stagingContainer.position.set(5.5, 0.38, 4.9);
      scene.add(stagingContainer);
      modelsRef.current.stagingContainer = stagingContainer;

      updateProgress();
    };

    // B. CONTAINER GLB
    loadGLTF(loader, getModelUrl('container.glb'))
      .then((raw) => {
        rawContainerModel = raw;
        updateProgress();
        tryAssembleTruck();
      })
      .catch((e) => {
        console.error('Container error:', e);
        updateProgress();
      });

    // C. TRUCK GLB
    loadGLTF(loader, getModelUrl('truck.glb'))
      .then((raw) => {
        rawTruckModel = raw;
        updateProgress();
        tryAssembleTruck();
      })
      .catch((e) => {
        console.error('Truck error:', e);
        updateProgress();
      });

    // D. CHASSIS GLB
    loadGLTF(loader, getModelUrl('chassis.glb'))
      .then((raw) => {
        rawChassisModel = raw;
        updateProgress();
        tryAssembleTruck();
      })
      .catch((e) => {
        console.error('Chassis error:', e);
        updateProgress();
      });

    // E. CONTAINER SHIP GLB (Stage 4)
    loadGLTF(loader, getModelUrl('container-ship.glb'))
      .then((raw) => {
        raw.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => (m.side = THREE.DoubleSide));
            } else if (mesh.material) {
              mesh.material.side = THREE.DoubleSide;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        raw.position.set(-center.x, -box.min.y, -center.z);

        const shipGroup = new THREE.Group();
        shipGroup.name = 'ContainerShip';
        shipGroup.add(raw);

        // Authentic container vessel scale: 175m length
        const shipLength = Math.max(size.x, size.y, size.z);
        const scale = 175.0 / shipLength;
        shipGroup.scale.setScalar(scale);

        // Positioned safely in open ocean water at Z = -210, waterline submerged to Y = -3.2
        shipGroup.position.set(-25.0, -3.2, -210.0);
        shipGroup.rotation.y = Math.PI / 2;

        scene.add(shipGroup);
        modelsRef.current.shipGroup = shipGroup;
        updateProgress();
      })
      .catch((e) => {
        console.error('Ship error:', e);
        updateProgress();
      });

    // F. CARGO PLANE GLB (Stage 5)
    loadGLTF(loader, getModelUrl('cargo-plane.glb'))
      .then((raw) => {
        // Conforms strictly to: AircraftRig → OrientationCorrection → RawCargoPlane
        const { rig } = buildCalibratedAircraftRig(raw, APPROVED_AIRCRAFT_CONFIG);
        scene.add(rig);
        modelsRef.current.aircraftRig = rig;
        updateProgress();
      })
      .catch((e) => {
        console.error('Plane error:', e);
        updateProgress();
      });

    // ========================================================================
    // RENDER LOOP (PURE DETERMINISTIC FUNCTION OF NORMALIZED PROGRESS)
    // ========================================================================
    const renderLoop = () => {
      animationFrameId.current = requestAnimationFrame(renderLoop);

      // Butter-smooth progress lerp
      smoothProgressRef.current += (targetProgressRef.current - smoothProgressRef.current) * 0.12;
      const p = smoothProgressRef.current;

      // 1. Interpolate Camera along spline
      const { pos, target, fov } = sampleTimeline(p);
      if (cameraRef.current) {
        cameraRef.current.position.copy(pos);
        cameraRef.current.lookAt(target);
        if (cameraRef.current.fov !== fov) {
          cameraRef.current.fov = fov;
          cameraRef.current.updateProjectionMatrix();
        }
      }

      // 2. Atmospheric Distance Fog & Sky Color Progression
      if (sceneRef.current && sceneRef.current.fog instanceof THREE.Fog) {
        const fog = sceneRef.current.fog;
        const groundSky = new THREE.Color(0xd2e0ed);
        const hazeSky = new THREE.Color(0xdce6f0);
        const stratosphericSky = new THREE.Color(0xb2cae0);

        if (p < 0.65) {
          fog.near = 65;
          fog.far = 460;
          fog.color.copy(groundSky);
          sceneRef.current.background = groundSky;
        } else if (p < 0.82) {
          const t = (p - 0.65) / 0.17;
          const hazeFactor = Math.sin(t * Math.PI);
          fog.near = THREE.MathUtils.lerp(65, 45, hazeFactor);
          fog.far = THREE.MathUtils.lerp(460, 320, hazeFactor);
          const c = new THREE.Color().lerpColors(groundSky, hazeSky, hazeFactor);
          fog.color.copy(c);
          sceneRef.current.background = c;
        } else {
          const t = Math.min((p - 0.82) / 0.18, 1.0);
          fog.near = THREE.MathUtils.lerp(65, 90, t);
          fog.far = THREE.MathUtils.lerp(460, 680, t);
          const c = new THREE.Color().lerpColors(hazeSky, stratosphericSky, t);
          fog.color.copy(c);
          sceneRef.current.background = c;
        }
      }

      // 3. Stage 1: Container Loading Operation by Reach Stacker (0.00 -> 0.16)
      const truckAssembly = modelsRef.current.truckAssembly;
      const truckTravelRoot = modelsRef.current.truckTravelRoot;
      const stagingContainer = modelsRef.current.stagingContainer;
      const handlerRig = modelsRef.current.containerHandlerRig;

      if (stagingContainer && truckAssembly) {
        const truckCont = truckAssembly.getObjectByName('Container');
        if (p < 0.16) {
          const loadT = p / 0.16;

          // 9-Stage Deterministic Operation:
          // 1. Approach (0.00 -> 0.18): Stacker advances from yard (X: 8.5 -> 5.5), container on ground
          // 2. Align (0.18 -> 0.28): Spreader lowers onto container top (Y: 1.25 -> 0.747)
          // 3. Engage (0.28 -> 0.35): Twistlocks engage, container on ground (Y: 0.38)
          // 4. Lift (0.35 -> 0.55): Container rises to clearance height (Y: 0.38 -> 3.20)
          // 5. Position (0.55 -> 0.75): Stacker carries container over chassis (X: 5.5 -> 0.0)
          // 6. Lower (0.75 -> 0.88): Container descends onto trailer twistlocks (Y: 3.20 -> 1.41)
          // 7. Release (0.88 -> 0.94): Twistlocks disengage, spreader clears container top
          // 8. Withdraw (0.94 -> 1.00): Stacker reverses away from chassis

          let contX = 5.5;
          let contY = 0.38;
          let stackerX = 8.5;
          let spreaderY = 1.25;
          let boomElevation = 0.15;
          let boomExtension = 0.5;
          let twistlocksEngaged = false;

          // Stage 1: Approach container front-first
          if (loadT < 0.18) {
            const t1 = loadT / 0.18;
            const s1 = 0.5 - 0.5 * Math.cos(t1 * Math.PI);
            stackerX = THREE.MathUtils.lerp(8.5, 5.5, s1);
            contX = 5.5;
            contY = 0.38;
            spreaderY = 1.25;
            boomElevation = THREE.MathUtils.lerp(0.20, 0.12, s1);
            boomExtension = 0.5;
            twistlocksEngaged = false;
          }
          // Stage 2: Align equipment above container
          else if (loadT < 0.28) {
            const t2 = (loadT - 0.18) / (0.28 - 0.18);
            const s2 = 0.5 - 0.5 * Math.cos(t2 * Math.PI);
            stackerX = 5.5;
            contX = 5.5;
            contY = 0.38;
            spreaderY = THREE.MathUtils.lerp(1.25, 0.747, s2);
            boomElevation = THREE.MathUtils.lerp(0.12, 0.05, s2);
            boomExtension = 0.5;
            twistlocksEngaged = false;
          }
          // Stage 3: Engage container twistlocks
          else if (loadT < 0.35) {
            const t3 = (loadT - 0.28) / (0.35 - 0.28);
            stackerX = 5.5;
            contX = 5.5;
            contY = 0.38;
            spreaderY = 0.747;
            boomElevation = 0.05;
            boomExtension = 0.5;
            twistlocksEngaged = t3 > 0.3;
          }
          // Stage 4: Lift container off ground
          else if (loadT < 0.55) {
            const t4 = (loadT - 0.35) / (0.55 - 0.35);
            const s4 = 0.5 - 0.5 * Math.cos(t4 * Math.PI);
            stackerX = 5.5;
            contX = 5.5;
            contY = THREE.MathUtils.lerp(0.38, 3.20, s4);
            spreaderY = contY + 0.367;
            boomElevation = THREE.MathUtils.lerp(0.05, 0.44, s4);
            boomExtension = THREE.MathUtils.lerp(0.5, 1.8, s4);
            twistlocksEngaged = true;
          }
          // Stage 5: Position over truck trailer chassis
          else if (loadT < 0.75) {
            const t5 = (loadT - 0.55) / (0.75 - 0.55);
            const s5 = 0.5 - 0.5 * Math.cos(t5 * Math.PI);
            stackerX = THREE.MathUtils.lerp(5.5, 0.0, s5);
            contX = stackerX;
            contY = 3.20;
            spreaderY = 3.567;
            boomElevation = 0.44;
            boomExtension = 1.8;
            twistlocksEngaged = true;
          }
          // Stage 6: Lower container onto chassis twistlocks
          else if (loadT < 0.88) {
            const t6 = (loadT - 0.75) / (0.88 - 0.75);
            const s6 = Math.pow(t6, 1.25);
            stackerX = 0.0;
            contX = 0.0;
            contY = THREE.MathUtils.lerp(3.20, 1.41, s6);
            spreaderY = contY + 0.367;
            boomElevation = THREE.MathUtils.lerp(0.44, 0.16, s6);
            boomExtension = THREE.MathUtils.lerp(1.8, 0.8, s6);
            twistlocksEngaged = true;
          }
          // Stage 7: Release container
          else if (loadT < 0.94) {
            const t7 = (loadT - 0.88) / (0.94 - 0.88);
            stackerX = 0.0;
            contX = 0.0;
            contY = 1.41;
            spreaderY = THREE.MathUtils.lerp(1.777, 2.15, t7);
            boomElevation = THREE.MathUtils.lerp(0.16, 0.22, t7);
            boomExtension = 0.8;
            twistlocksEngaged = false;
          }
          // Stage 8: Reach stacker withdraws
          else {
            const t8 = (loadT - 0.94) / (1.00 - 0.94);
            stackerX = THREE.MathUtils.lerp(0.0, 3.8, t8);
            contX = 0.0;
            contY = 1.41;
            spreaderY = 2.15;
            boomElevation = 0.22;
            boomExtension = 0.8;
            twistlocksEngaged = false;
          }

          // Approved real mast: align the entire spreader to the real container top.
          // No old arbitrary boom angles or world-space spreader teleports.
          const containerTopOffset: number = stagingContainer.userData.approvedTopOffset ?? (() => {
            const savedY = stagingContainer.position.y;
            stagingContainer.position.y = 0;
            stagingContainer.updateMatrixWorld(true);
            const top = new THREE.Box3().setFromObject(stagingContainer).max.y;
            stagingContainer.position.y = savedY;
            stagingContainer.userData.approvedTopOffset = top;
            return top;
          })();
          const topY = contY + containerTopOffset;
          if (loadT < 0.18) spreaderY = topY + 0.80;
          else if (loadT < 0.28) spreaderY = topY + THREE.MathUtils.lerp(0.80, 0.04, (loadT - 0.18) / 0.10);
          else if (loadT < 0.88) spreaderY = topY + 0.04;
          else spreaderY = topY + 0.04 + 0.45 * THREE.MathUtils.clamp((loadT - 0.88) / 0.12, 0, 1);

          stagingContainer.position.set(contX, contY, 4.9);
          stagingContainer.visible = true;
          if (truckCont) truckCont.visible = false;

          if (handlerRig) {
            // Align the center of the *actual* spreader to the container center,
            // while retaining the approach/withdrawal offset along X.
            handlerRig.alignSpreaderTo(contX, 4.9, stackerX - contX);
            handlerRig.root.position.y = 0;
            handlerRig.setBoomPose(boomElevation, boomExtension);
            handlerRig.setSpreaderPose(new THREE.Vector3(contX, spreaderY, 4.9), twistlocksEngaged);
            handlerRig.setWheelTravel(8.5 - stackerX);
          }
        } else {
          // Handover to calibrated TruckAssembly coordinate system (Zero jump, zero drift)
          stagingContainer.visible = false;
          if (truckCont) truckCont.visible = true;

          // Reach stacker continues withdraw back to staging bay
          if (handlerRig) {
            if (p < 0.28) {
              const withdrawT = (p - 0.16) / (0.28 - 0.16);
              const smoothWithdraw = 0.5 - 0.5 * Math.cos(withdrawT * Math.PI);
              const withdrawX = THREE.MathUtils.lerp(3.8, 12.0, smoothWithdraw);
              handlerRig.root.position.set(withdrawX, 0, 4.9);
              handlerRig.setBoomPose(THREE.MathUtils.lerp(0.22, 0.15, smoothWithdraw), 0.5);
              handlerRig.setSpreaderPose(new THREE.Vector3(withdrawX, 3.1, 4.9), false);
              handlerRig.setWheelTravel(8.5 - 0.0 + withdrawX);
            } else {
              handlerRig.root.position.set(12.0, 0, 4.9);
              handlerRig.setBoomPose(0.15, 0.5);
              handlerRig.setSpreaderPose(new THREE.Vector3(12.0, 3.1, 4.9), false);
              handlerRig.setWheelTravel(8.5 + 12.0);
            }
          }
        }
      }

      // 4. Stage 2 & 3: Truck Departure and Travel along Road (0.16 -> 0.52)
      // TruckTravelRoot moves straight forward along highway (-Z axis), never sideways!
      if (truckTravelRoot && truckAssembly) {
        if (p >= 0.16 && p <= 0.52) {
          const driveT = (p - 0.16) / (0.52 - 0.16);
          // Realistic acceleration and straight highway cruise
          const distanceTravelled = Math.pow(driveT, 1.15) * 135.0;
          truckTravelRoot.position.set(0, 0, -distanceTravelled);
          truckAssembly.userData.setWheelSpin?.(distanceTravelled);
        } else if (p < 0.16) {
          truckTravelRoot.position.set(0, 0, 0);
          truckAssembly.userData.setWheelSpin?.(0);
        } else if (p > 0.52) {
          truckTravelRoot.position.set(0, 0, -135.0);
          truckAssembly.userData.setWheelSpin?.(135.0);
        }
      }

      // 5. Stage 4: Container Ship Maritime Voyage (0.52 -> 0.76)
      const shipGroup = modelsRef.current.shipGroup;
      if (shipGroup) {
        if (p >= 0.52 && p <= 0.76) {
          const shipT = (p - 0.52) / (0.76 - 0.52);
          const shipAdvance = shipT * 42.0;
          shipGroup.position.z = -210.0 - shipAdvance;
          // Gentle realistic ocean swell (pitch and roll)
          shipGroup.rotation.z = Math.sin(p * 22.0) * 0.009;
        } else if (p < 0.52) {
          shipGroup.position.z = -210.0;
          shipGroup.rotation.z = 0;
        }
      }

      // 6. Stage 5: Cargo Aircraft Flight Corridor (0.72 -> 1.00)
      const aircraftRig = modelsRef.current.aircraftRig;
      if (aircraftRig) {
        if (p >= 0.72) {
          const planeT = (p - 0.72) / (1.00 - 0.72);
          // Cruising displacement across upper sky
          let flightZ = 0;
          if (planeT < 0.55) {
            flightZ = (planeT / 0.55) * 65.0;
          } else {
            const accT = (planeT - 0.55) / 0.45;
            flightZ = 65.0 + accT * 115.0 + accT * accT * 130.0;
          }

          aircraftRig.position.z = APPROVED_AIRCRAFT_CONFIG.rig.position[2] - flightZ;
          aircraftRig.position.x = 0.0; // Strictly on corridor centerline for vertical screen alignment
          aircraftRig.position.y = APPROVED_AIRCRAFT_CONFIG.rig.position[1];
          aircraftRig.rotation.set(0, 0, 0);
        } else {
          aircraftRig.position.set(...APPROVED_AIRCRAFT_CONFIG.rig.position);
          aircraftRig.rotation.set(0, 0, 0);
        }
      }

      // Visibility clipping guards
      const forklift = modelsRef.current.forklift;
      if (forklift) forklift.visible = p < 0.30;
      if (truckAssembly) truckAssembly.visible = p < 0.60;
      if (shipGroup) shipGroup.visible = p >= 0.40 && p <= 0.85;
      if (aircraftRig) aircraftRig.visible = p >= 0.68;

      // Audio ambience transition based on progress phase (0: terminal, 1: truck, 2: ship, 3: air)
      const currentPhaseIndex = p < 0.22 ? 0 : p < 0.48 ? 1 : p < 0.74 ? 2 : 3;
      if (lastAudioPhaseRef.current !== currentPhaseIndex) {
        lastAudioPhaseRef.current = currentPhaseIndex;
        audioEngine.startPhaseAmbience(currentPhaseIndex);
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // Resize Handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ScrollTrigger Binding
    let scrollTriggerInstance: ScrollTrigger | null = null;
    if (scrollTrackRef.current) {
      scrollTriggerInstance = ScrollTrigger.create({
        trigger: scrollTrackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          targetProgressRef.current = self.progress;
          setCurrentProgress(self.progress);
        },
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (scrollTriggerInstance) scrollTriggerInstance.kill();
      renderer.dispose();
      audioEngine.stopAmbience();
    };
  }, []);

  return (
    <div className="relative w-full bg-[#080d16] text-slate-100 select-none overflow-x-hidden font-sans">
      {/* FIXED FULLSCREEN WEBGL CANVAS */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block z-0" />

      {/* TOP NAVIGATION & CONTROLS */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-5 flex items-center justify-between pointer-events-auto backdrop-blur-[2px]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-montserrat font-black text-xl tracking-[0.28em] text-white">
              MERIDIANO
            </span>
            <span className="text-[9px] uppercase tracking-[0.35em] text-blue-400/90 font-mono">
              CONTINUOUS LOGISTICS JOURNEY
            </span>
          </div>
        </div>

        {/* Center Chapter Indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-[#0d131f]/80 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          {[
            { id: 1, label: lang === 'bg' ? 'ТЕРМИНАЛ' : 'TERMINAL', min: 0.0, max: 0.16 },
            { id: 2, label: lang === 'bg' ? 'КАМИОН' : 'TRUCK', min: 0.16, max: 0.36 },
            { id: 3, label: lang === 'bg' ? 'ПРИСТАНИЩЕ' : 'PORT ROAD', min: 0.36, max: 0.52 },
            { id: 4, label: lang === 'bg' ? 'КОРАБ' : 'VESSEL', min: 0.52, max: 0.72 },
            { id: 5, label: lang === 'bg' ? 'САМОЛЕТ' : 'CARGO AIRCRAFT', min: 0.72, max: 0.88 },
            { id: 6, label: lang === 'bg' ? 'ФИНАЛ' : 'STATEMENT', min: 0.88, max: 1.0 },
          ].map((ch) => {
            const isActive = currentProgress >= ch.min && currentProgress <= ch.max;
            return (
              <div
                key={ch.id}
                className={`flex items-center gap-1.5 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-400/40 font-semibold'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <span>0{ch.id}</span>
                <span>{ch.label}</span>
              </div>
            );
          })}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Asset Audit / Technical Limitation Modal Button */}
          <button
            onClick={() => setShowTechnicalNote(!showTechnicalNote)}
            title="Inspect 3D Model Technical Specifications & Audit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d131f]/80 border border-amber-500/30 hover:border-amber-400 text-amber-300/90 text-xs font-mono transition-all backdrop-blur-md"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Asset Audit</span>
          </button>

          {/* Loading Studio navigation */}
          {onSwitchToLoading && (
            <button
              onClick={onSwitchToLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d131f]/80 border border-blue-500/30 hover:border-blue-400 text-blue-300 text-xs font-mono transition-all backdrop-blur-md"
              title="Inspect 9-Stage Container Loading Architecture Studio"
            >
              <span>Loading Studio</span>
            </button>
          )}

          {/* Alternate views */}
          {onSwitchToOpening && (
            <button
              onClick={onSwitchToOpening}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0d131f]/80 border border-white/10 hover:border-white/30 text-slate-300 text-xs font-mono transition-all backdrop-blur-md"
            >
              <span>Opening Prototype</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d131f]/80 border border-white/10 hover:border-white/30 text-white text-xs font-mono transition-all backdrop-blur-md"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold">{lang.toUpperCase()}</span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-[#0d131f]/80 border border-white/10 hover:border-white/30 text-white transition-all backdrop-blur-md"
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </header>

      {/* TECHNICAL ASSET AUDIT MODAL / BANNER */}
      {showTechnicalNote && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-[#0a101b]/95 border border-amber-500/40 rounded-xl p-5 shadow-2xl backdrop-blur-xl text-xs text-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>Asset Capability Audit</span>
            </div>
            <button
              onClick={() => setShowTechnicalNote(false)}
              className="text-slate-400 hover:text-white font-mono text-sm"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed mb-3">
            {lang === 'bg' ? (
              <>
                <strong className="text-white">Контейнерен манипулатор Reach Stacker:</strong> Моделът forklift.glb представлява специализиран 45-тонен reach stacker с горен ISO телескопичен спредер. Оборудването подхожда фронтално към контейнера, заключва фиксаторите и извършва контролирано повдигане и позициониране върху шасито на камиона.
              </>
            ) : (
              <>
                <strong className="text-white">Container Handler Reach Stacker:</strong> The forklift.glb model operates as a dedicated 45-tonne container reach stacker equipped with a top ISO spreader. The machine approaches front-first, aligns and engages twistlocks, lifts the container to travel clearance, and seats it onto trailer twistlocks.
              </>
            )}
          </p>
          <p className="text-emerald-400/90 font-mono text-[11px] leading-relaxed">
            {lang === 'bg'
              ? '✓ Реализация: 9-етапен детерминиран контролер с физически непрекъсната траектория без телепортация и плавно предаване към полуремаркето.'
              : '✓ Implementation: Deterministic 9-stage loading controller with physically continuous spreader-locked trajectory and zero container drift.'}
          </p>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#080d16] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
          <h2 className="text-lg font-montserrat font-bold tracking-[0.25em] text-white uppercase mb-2">
            MERIDIANO LOGISTICS OPERATION
          </h2>
          <p className="text-xs font-mono text-blue-400/80 tracking-widest mb-4">
            CALIBRATING ASSETS &bull; {loadPercent}%
          </p>
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* NARRATIVE EDITORIAL OVERLAYS (SYNCHRONIZED WITH SCROLL PROGRESS) */}
      <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-8 md:p-16">
        {/* TOP STATUS */}
        <div className="flex justify-between items-start pt-14">
          <div className="text-[10px] font-mono tracking-[0.25em] text-blue-400/80 uppercase">
            {currentProgress < 0.16 && 'PHASE 01 / TERMINAL CONTAINER STAGING'}
            {currentProgress >= 0.16 && currentProgress < 0.36 && 'PHASE 02 / HIGHWAY CORRIDOR DEPARTURE'}
            {currentProgress >= 0.36 && currentProgress < 0.52 && 'PHASE 03 / PORT ACCESS ROUTE'}
            {currentProgress >= 0.52 && currentProgress < 0.72 && 'PHASE 04 / INTERCONTINENTAL OCEAN TRANSIT'}
            {currentProgress >= 0.72 && currentProgress < 0.88 && 'PHASE 05 / EXPEDITED AIR CORRIDOR'}
            {currentProgress >= 0.88 && 'PHASE 06 / GLOBAL LOGISTICS PROMISE'}
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            {Math.round(currentProgress * 100)}% COMPLETE
          </div>
        </div>

        {/* MIDGROUND EDITORIAL TITLES */}
        <div className="max-w-2xl">
          {/* Phase 1: Terminal Staging (0.00 - 0.16) */}
          <div
            className={`transition-all duration-700 transform ${
              currentProgress < 0.16
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-8 pointer-events-none'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-blue-400 mb-2">
              {lang === 'bg' ? '01 / НАЧАЛО НА ВЕРИГАТА' : '01 / LOGISTICS COMMENCEMENT'}
            </div>
            <h1 className="font-montserrat font-black text-3xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-[1.05] mb-4">
              {lang === 'bg' ? 'ТЕРМИНАЛНО ТОВАРЕНЕ' : 'TERMINAL DISPATCH'}
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {lang === 'bg'
                ? 'Прецизно позициониране на 40-футовия контейнер върху шасито още от първия метър на логистичния коридор.'
                : 'Precision mounting of the 40-foot container directly onto the chassis twistlocks from the very first meter of transit.'}
            </p>
          </div>

          {/* Phase 2: Truck Departure (0.16 - 0.36) */}
          <div
            className={`transition-all duration-700 transform ${
              currentProgress >= 0.16 && currentProgress < 0.36
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-blue-400 mb-2">
              {lang === 'bg' ? '02 / СУХОПЪТЕН КОРИДОР' : '02 / OVERLAND TRANSIT'}
            </div>
            <h2 className="font-montserrat font-black text-3xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-[1.05] mb-4">
              {lang === 'bg' ? 'ДИРЕКТЕН СУХОПЪТЕН РЕЙС' : 'ROAD TRANSPORT'}
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {lang === 'bg'
                ? 'Калибрираната автокомпозиция потегля към пристанищния терминал с постоянна скорост и непрекъсната проследимост.'
                : 'Calibrated truck assembly departs towards the deep-water harbor with verified load security and constant velocity.'}
            </p>
          </div>

          {/* Phase 3: Port Access Route (0.36 - 0.52) */}
          <div
            className={`transition-all duration-700 transform ${
              currentProgress >= 0.36 && currentProgress < 0.52
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-blue-400 mb-2">
              {lang === 'bg' ? '03 / ПРИСТАНИЩЕН ПОДХОД' : '03 / HARBOR CORRIDOR'}
            </div>
            <h2 className="font-montserrat font-black text-3xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-[1.05] mb-4">
              {lang === 'bg' ? 'КЪМ МОРСКИЯ ВЪЗЕЛ' : 'HARBOR APPROACH'}
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {lang === 'bg'
                ? 'Достъпът по крайбрежния път разкрива контейнерните портални кранове и чакащия презокеански съд.'
                : 'Approaching the coastal quay, revealing heavy container infrastructure and the awaiting ocean vessel.'}
            </p>
          </div>

          {/* Phase 4: Container Ship Maritime Voyage (0.52 - 0.72) */}
          <div
            className={`transition-all duration-700 transform ${
              currentProgress >= 0.52 && currentProgress < 0.72
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-blue-400 mb-2">
              {lang === 'bg' ? '04 / МОРСКИ ТРАНЗИТ' : '04 / MARITIME VOYAGE'}
            </div>
            <h2 className="font-montserrat font-black text-3xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-[1.05] mb-4">
              {lang === 'bg' ? 'ПРЕЗОКЕАНСКИ МАЩАБ' : 'OCEAN FREIGHT'}
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {lang === 'bg'
                ? '175-метровият контейнеровоз поема товара през международните морски маршрути без междинни забавяния.'
                : 'The 175-meter container vessel traverses international maritime routes connecting manufacturing powerhouses directly.'}
            </p>
          </div>

          {/* Phase 5: Air Corridor (0.72 - 0.88) */}
          <div
            className={`transition-all duration-700 transform ${
              currentProgress >= 0.72 && currentProgress < 0.88
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-blue-400 mb-2">
              {lang === 'bg' ? '05 / ВЪЗДУШЕН МОСТ' : '05 / AIR CORRIDOR'}
            </div>
            <h2 className="font-montserrat font-black text-3xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-[1.05] mb-4">
              {lang === 'bg' ? 'ЕКСПРЕСЕН ВЪЗДУШЕН ТРАНЗИТ' : 'CARGO AIRLIFT'}
            </h2>
            <p className="text-sm md:text-base text-slate-300 font-light leading-relaxed max-w-lg">
              {lang === 'bg'
                ? 'Товарен самолет в хоризонтален стратосферен полет гарантира експресна доставка за критични товари.'
                : 'Heavy cargo aircraft flying level across the stratosphere delivers expedited transit when every hour counts.'}
            </p>
          </div>

          {/* Phase 6: Final MERIDIANO Statement (0.88 - 1.00) */}
          <div
            className={`transition-all duration-1000 transform ${
              currentProgress >= 0.88
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12 pointer-events-none'
            }`}
          >
            <div className="text-xs md:text-sm font-mono uppercase tracking-[0.35em] text-blue-400 mb-3 font-semibold">
              MERIDIANO &bull; INTERNATIONAL LOGISTICS & SOURCING
            </div>
            <h2 className="font-montserrat font-black text-4xl md:text-6xl lg:text-7xl tracking-tighter text-white uppercase leading-[0.95] mb-4">
              {lang === 'bg' ? (
                <>
                  ОТ СВЕТА<br />
                  <span className="text-blue-400">ДО ВАС.</span>
                </>
              ) : (
                <>
                  FROM THE WORLD<br />
                  <span className="text-blue-400">TO YOU.</span>
                </>
              )}
            </h2>
            <p className="font-syne text-xl md:text-2xl text-slate-200 font-medium tracking-wide mb-6">
              {lang === 'bg' ? 'Вашата стока, нашата отговорност.' : 'Your goods, our responsibility.'}
            </p>
            <p className="text-xs md:text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
              {lang === 'bg'
                ? 'Без посреднически надценки, без изкуствени бариери. Пълен контрол от завода в Азия до вашия обект в Европа.'
                : 'No intermediary markups, no supply chain blind spots. End-to-end sovereignty from origin manufacturers directly to your facility.'}
            </p>
            <div className="flex items-center gap-4 pointer-events-auto">
              <button
                onClick={handleReplay}
                className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs tracking-widest uppercase transition-all shadow-lg flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'bg' ? 'ПОВТОРИ ПЪТЕШЕСТВИЕТО' : 'REPLAY JOURNEY'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SCROLL PROMPT */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>
              {currentProgress < 0.95
                ? lang === 'bg'
                  ? 'СКРОЛВАЙТЕ ЗА ДА ДВИЖИТЕ ОПЕРАЦИЯТА'
                  : 'SCROLL TO ADVANCE CONTINUOUS LOGISTICS OPERATION'
                : lang === 'bg'
                ? 'ОПЕРАЦИЯТА Е ЗАВЪРШЕНА'
                : 'OPERATION COMPLETED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-blue-400 animate-bounce" />
          </div>
        </div>
      </div>

      {/* TALL SCROLL TRACK: 700vh NORMALIZED DRIVER */}
      <div ref={scrollTrackRef} className="h-[750vh] w-full pointer-events-none opacity-0" />
    </div>
  );
};
