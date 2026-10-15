import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX, Wrench } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';
import { getModelUrl } from '../../utils/modelUrl';
import { buildApprovedTruckAssembly, APPROVED_TRUCK_ASSEMBLY_CONFIG } from './truckAssemblyConfig';
import { FORKLIFT_CONFIG } from './forkliftConfig';
import { buildCalibratedAircraftRig, APPROVED_AIRCRAFT_CONFIG } from './aircraftConfig';

gsap.registerPlugin(ScrollTrigger);

interface Keyframe {
  progress: number;
  camPos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

interface CinematicScrollExperienceProps {
  onSwitchToDiagnostic?: () => void;
}

// ============================================================================
// PROCEDURAL TEXTURE GENERATORS FOR REALISTIC LAND LOGISTICS ENVIRONMENT
// ============================================================================

// 1. Authentic Asphalt Road Surface Texture
const createAsphaltTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep neutral asphalt base
  ctx.fillStyle = '#22262e';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    // Micro-specks for asphalt aggregate stone chips
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
  texture.anisotropy = 8;
  return texture;
};

// 2. Asphalt Micro-Roughness / Bump Map
const createAsphaltBumpTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = Math.random() * 255;
    data[i] = grain;
    data[i + 1] = grain;
    data[i + 2] = grain;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 56);
  return texture;
};

// 3. Concrete Terminal Staging Apron Texture (Expansion Joints & Seams)
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

  // Subtle concrete slab expansion joint border
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
  texture.repeat.set(8, 6);
  texture.anisotropy = 8;
  return texture;
};

// 4. Photorealistic Soft Ambient Occlusion Contact Shadow Map
const createContactShadowTexture = (type: 'radial' | 'rect'): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 256);
  if (type === 'radial') {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(12, 17, 26, 0.88)');
    grad.addColorStop(0.35, 'rgba(12, 17, 26, 0.65)');
    grad.addColorStop(0.75, 'rgba(12, 17, 26, 0.20)');
    grad.addColorStop(1, 'rgba(12, 17, 26, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(128, 128, 45, 128, 128, 125);
    grad.addColorStop(0, 'rgba(12, 17, 26, 0.92)');
    grad.addColorStop(0.45, 'rgba(12, 17, 26, 0.68)');
    grad.addColorStop(0.82, 'rgba(12, 17, 26, 0.22)');
    grad.addColorStop(1, 'rgba(12, 17, 26, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

// 5. Realistic Daylight Sky Dome Mesh
const createSkyDome = (): THREE.Mesh => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#6687a4');    // Soft daylight zenith
    grad.addColorStop(0.5, '#99b6ce');  // Mid sky
    grad.addColorStop(0.85, '#cad9e6'); // Near horizon
    grad.addColorStop(1.0, '#d2e0ed');  // Horizon haze line
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.SphereGeometry(950, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.position.set(0, -2, -100);
  return sky;
};

export const CinematicScrollExperience: React.FC<CinematicScrollExperienceProps> = ({
  onSwitchToDiagnostic,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  // Three.js Core References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Model & Scene Object References
  const modelsRef = useRef<{
    forklift?: THREE.Group;
    containerStage1?: THREE.Group;
    truckAssembly?: THREE.Group;
    shipGroup?: THREE.Group;
    aircraftRig?: THREE.Group;
    planeGroup?: THREE.Group;
    roadGroup?: THREE.Group;
    oceanMesh?: THREE.Mesh;
    cloudsGroup?: THREE.Group;
  }>({});

  // Dynamic progress refs for butter-smooth lerping
  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);

  // ==========================================================================
  // MASTER CAMERA CINEMATIC KEYFRAME SPLINE (STRICTLY LINEAR, NO DUPLICATES)
  //
  // 1. FORKLIFT + CONTAINER       (0.00 – 0.14)
  // 2. CONTAINER TRANSITION       (0.14 – 0.24)
  // 3. TRUCK ASSEMBLY             (0.24 – 0.44)  [3/4 establishing shot, 60-75% screen]
  // 4. OCEAN + CONTAINER SHIP     (0.44 – 0.64)  [Water level, towering scale]
  // 5. CAMERA ASCENDS FROM OCEAN  (0.64 – 0.74)
  // 6. CLOUD TRANSITION           (0.74 – 0.82)
  // 7. CARGO PLANE                (0.82 – 0.94)  [3/4 tracking view showing fuselage, wing, engine, tail]
  // 8. FINAL MERIDIANO STATEMENT  (0.94 – 1.00)
  // ==========================================================================
  const keyframes: Keyframe[] = [
    // --- STAGE 1: FORKLIFT + CONTAINER (0.00 - 0.14) ---
    // Establishing 3/4 composition showing BOTH the industrial forklift and 12m container grounded in the logistics yard
    {
      progress: 0.0,
      camPos: new THREE.Vector3(8.8, 3.4, 9.8),
      target: new THREE.Vector3(0.8, 1.6, 0.6),
      fov: 42,
    },
    {
      progress: 0.07,
      camPos: new THREE.Vector3(6.5, 2.6, 7.8),
      target: new THREE.Vector3(0.4, 1.6, 0.4),
      fov: 40,
    },
    {
      progress: 0.14,
      camPos: new THREE.Vector3(4.4, 2.1, 5.4),
      target: new THREE.Vector3(0.0, 1.6, 0.2),
      fov: 38,
    },

    // --- STAGE 2: CONTAINER TRANSITION (0.14 - 0.24) ---
    // Smoothly tracks along the container flank towards the highway staging corridor
    {
      progress: 0.19,
      camPos: new THREE.Vector3(2.0, 2.4, 2.8),
      target: new THREE.Vector3(-0.8, 1.8, -3.0),
      fov: 40,
    },
    {
      progress: 0.24,
      camPos: new THREE.Vector3(6.0, 3.2, -6.0),
      target: new THREE.Vector3(0.0, 2.0, -18.0),
      fov: 42,
    },

    // --- STAGE 3: TRUCK + CHASSIS + CONTAINER HIGHWAY MOTION (0.24 - 0.44) ---
    // Establishing 3/4 view of the COMPLETE TRUCK ASSEMBLY on the highway
    // Vehicle occupies ~65% of viewport width. Recognizable: CAB + WHEELS + CHASSIS + CONTAINER
    {
      progress: 0.28,
      camPos: new THREE.Vector3(18.0, 4.2, -14.0),
      target: new THREE.Vector3(0.0, 2.2, -32.0),
      fov: 40,
    },
    {
      progress: 0.36,
      camPos: new THREE.Vector3(12.0, 2.6, -26.0),
      target: new THREE.Vector3(0.0, 2.2, -38.0),
      fov: 38,
    },
    {
      progress: 0.44,
      camPos: new THREE.Vector3(11.0, 2.5, -42.0),
      target: new THREE.Vector3(0.0, 2.4, -54.0),
      fov: 40,
    },

    // --- STAGE 4: TRUCK -> SHIP EDITORIAL TRANSITION & CONTAINER SHIP (0.44 - 0.64) ---
    // Truck accelerates forward down the road; camera pulls back and up slightly, surveying coastal horizon
    {
      progress: 0.47,
      camPos: new THREE.Vector3(22.0, 5.2, -55.0),
      target: new THREE.Vector3(0.0, 2.8, -75.0),
      fov: 44,
    },
    // ESTABLISHING SHIP SHOT: Revealed from a safe, majestic distance across the open water (~80m clearance)
    // Water, horizon, and full 175m ship silhouette clearly readable. Zero hull clipping.
    {
      progress: 0.51,
      camPos: new THREE.Vector3(65.0, 16.0, -135.0),
      target: new THREE.Vector3(-15.0, 10.0, -195.0),
      fov: 46,
    },
    // TRACKING SHIP SHOT: Moves closer to track alongside the towering hull at generous clearance (>50m away)
    {
      progress: 0.57,
      camPos: new THREE.Vector3(42.0, 12.0, -175.0),
      target: new THREE.Vector3(-15.0, 12.0, -205.0),
      fov: 42,
    },
    {
      progress: 0.63,
      camPos: new THREE.Vector3(36.0, 16.0, -215.0),
      target: new THREE.Vector3(-15.0, 14.0, -235.0),
      fov: 42,
    },

    // --- STAGE 5: PHASE A — MARITIME DEPARTURE (0.64 - 0.73) ---
    // Camera ascends smoothly away from the vessel; ship recedes below on the water, becoming smaller as altitude increases
    {
      progress: 0.68,
      camPos: new THREE.Vector3(26.0, 36.0, -235.0),
      target: new THREE.Vector3(-12.0, 12.0, -225.0),
      fov: 44,
    },
    {
      progress: 0.73,
      camPos: new THREE.Vector3(10.0, 68.0, -255.0),
      target: new THREE.Vector3(-8.0, 16.0, -230.0),
      fov: 45,
    },

    // --- STAGE 6: PHASE B — ATMOSPHERIC TRANSITION (0.73 - 0.81) ---
    // Camera glides along a continuous, smooth vector through soft atmospheric haze; look target smoothly tilts up towards the flight corridor
    {
      progress: 0.77,
      camPos: new THREE.Vector3(-12.0, 104.0, -275.0),
      target: new THREE.Vector3(-4.0, 85.0, -315.0),
      fov: 42,
    },
    {
      progress: 0.81,
      camPos: new THREE.Vector3(-36.0, 130.0, -288.0),
      target: new THREE.Vector3(-2.0, 122.0, -342.0),
      fov: 40,
    },

    // --- STAGE 7: PHASE C — AIRCRAFT ESTABLISHING SHOT (0.81 - 0.86) ---
    // Hero 3/4 side-rear reveal showing complete silhouette: fuselage, wings, engines, and tail.
    // Occupies ~60-66% of viewport width. 100% horizontal level flight. Zero clipping.
    {
      progress: 0.85,
      camPos: new THREE.Vector3(-45.0, 136.5, -305.0),
      target: new THREE.Vector3(1.5, 122.0, -358.0),
      fov: 38,
    },

    // --- STAGE 8: SIDE-TRACKING CRUISE (0.86 - 0.94) ---
    // Seamless lateral tracking shot alongside the cruising cargo plane in the stratosphere
    {
      progress: 0.90,
      camPos: new THREE.Vector3(-46.0, 137.0, -340.0),
      target: new THREE.Vector3(2.0, 122.5, -396.0),
      fov: 38,
    },
    {
      progress: 0.94,
      camPos: new THREE.Vector3(-42.0, 137.5, -382.0),
      target: new THREE.Vector3(2.5, 123.0, -450.0),
      fov: 39,
    },

    // --- STAGE 9: FINAL MERIDIANO STATEMENT & DEPARTURE (0.94 - 1.00) ---
    // Aircraft accelerates smoothly into the horizon, becoming a graceful distant silhouette leaving clean negative space for typography
    {
      progress: 0.97,
      camPos: new THREE.Vector3(-30.0, 138.0, -408.0),
      target: new THREE.Vector3(3.5, 124.0, -520.0),
      fov: 41,
    },
    {
      progress: 1.0,
      camPos: new THREE.Vector3(-18.0, 138.5, -420.0),
      target: new THREE.Vector3(4.0, 125.0, -620.0),
      fov: 43,
    },
  ];

  // Helper function to interpolate camera smoothly along keyframe spline
  const sampleTimeline = (p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    let i = 0;
    while (i < keyframes.length - 1 && keyframes[i + 1].progress < clamped) {
      i++;
    }
    const k1 = keyframes[i];
    const k2 = keyframes[Math.min(i + 1, keyframes.length - 1)];

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

  // Helper to load GLB with progress and fallback
  const loadGLTF = (loader: GLTFLoader, url: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`Primary load failed for ${url}, trying fallback path:`, err);
          const fallback = url.startsWith('/models/') ? `/public${url}` : url.replace('/public', '');
          loader.load(
            fallback,
            (gltfFallback) => {
              console.log(`Fallback succeeded for ${fallback}`);
              resolve(gltfFallback.scene);
            },
            undefined,
            (err2) => {
              console.error(`Both paths failed for model ${url}:`, err2);
              reject(err);
            }
          );
        }
      );
    });
  };

  // 1. Initialize Full-Screen WebGL Experience
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    console.log('MERIDIANO 3D CANVAS MOUNTED');

    const width = window.innerWidth;
    const height = window.innerHeight;

    // A. Full-Screen Scene with Realistic Daylight Atmosphere
    const scene = new THREE.Scene();
    const daylightSkyColor = new THREE.Color(0xd2e0ed); // Soft daylight atmospheric sky
    scene.background = daylightSkyColor;
    scene.fog = new THREE.Fog(0xd2e0ed, 65, 460); // Atmospheric perspective & environmental haze towards horizon
    scene.add(createSkyDome());
    sceneRef.current = scene;

    // B. Camera - Near plane 0.5 & Far plane 1400 maximizes 24-bit depth-buffer precision and eliminates z-fighting
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 1400);
    const initialFrame = sampleTimeline(0);
    camera.position.copy(initialFrame.pos);
    camera.lookAt(initialFrame.target);
    cameraRef.current = camera;

    // C. WebGL Renderer with High-Precision ACES Filmic Tone Mapping & Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // D. Soft Daylight Commercial Lighting (Preserves PBR materials, no blown-out whites, believable depth)
    // Realistic skylight hemisphere: crisp daylight blue sky above, muted asphalt earth bounce below
    const hemiLight = new THREE.HemisphereLight(0xe8f2fc, 0x505b69, 1.15);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Soft Directional Sunlight (~50 degree elevation creates authentic vehicle & container form definition)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.15);
    sunLight.position.set(45, 60, 32);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Subtle Sky Fill from opposite quadrant to soften shadows
    const skyFill = new THREE.DirectionalLight(0x9cc3e6, 0.45);
    skyFill.position.set(-35, 25, -25);
    scene.add(skyFill);

    // ========================================================================
    // E. CONTINUOUS INDUSTRIAL LAND LOGISTICS ENVIRONMENT
    // Combines the Terminal Staging Apron & Asphalt Highway corridor seamlessly
    // ========================================================================
    const landEnvGroup = new THREE.Group();

    // 1. Concrete Staging Apron (Forklift & Container Yard, Z: +32 down to -2.0)
    // Ends exactly where the road begins at Z = -2.0 (Zero coplanar overlap)
    const apronGeo = new THREE.PlaneGeometry(68, 34);
    const apronMat = new THREE.MeshStandardMaterial({
      map: createConcreteApronTexture(),
      roughness: 0.86,
      metalness: 0.08,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(0, 0, 15);
    apronMesh.receiveShadow = true;
    landEnvGroup.add(apronMesh);

    // 2. Concrete Apron Markings (Container Bay Staging Demarcation)
    const amberLineMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });

    // Container Bay Staging Pad Marking (Under 40ft container)
    const bayBoxGeo = new THREE.PlaneGeometry(13.2, 3.4);
    const bayBox = new THREE.Mesh(
      bayBoxGeo,
      new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    bayBox.rotation.x = -Math.PI / 2;
    bayBox.position.set(-1.2, 0.015, 0);
    landEnvGroup.add(bayBox);

    // Staging Safety Guidance Line
    const safetyLine = new THREE.Mesh(new THREE.PlaneGeometry(44, 0.28), amberLineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(0, 0.020, 3.8);
    landEnvGroup.add(safetyLine);

    // 3. High-Capacity Logistics Highway (Width: 15m, Begins cleanly at Z: -2.0 down to Z: -82.0)
    const roadGeo = new THREE.PlaneGeometry(15, 80);
    const roadMat = new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(),
      bumpMap: createAsphaltBumpTexture(),
      bumpScale: 0.015,
      roughness: 0.80,
      metalness: 0.12,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -42.0);
    roadMesh.receiveShadow = true;
    landEnvGroup.add(roadMesh);

    // 4. Concrete Road Edge Curbs (Left & Right, Length: 80m)
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x5a6575,
      roughness: 0.84,
    });
    const curbGeo = new THREE.BoxGeometry(0.7, 0.08, 80);
    const curbL = new THREE.Mesh(curbGeo, curbMat);
    curbL.position.set(-7.85, 0.04, -42.0);
    curbL.receiveShadow = true;
    curbL.castShadow = true;
    landEnvGroup.add(curbL);

    const curbR = new THREE.Mesh(curbGeo, curbMat);
    curbR.position.set(7.85, 0.04, -42.0);
    curbR.receiveShadow = true;
    curbR.castShadow = true;
    landEnvGroup.add(curbR);

    // 5. Stabilized Gravel Shoulders (Left & Right, Length: 80m)
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x3d4550,
      roughness: 0.95,
    });
    const shoulderGeo = new THREE.PlaneGeometry(3.6, 80);
    const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderL.rotation.x = -Math.PI / 2;
    shoulderL.position.set(-10.0, 0.005, -42.0);
    shoulderL.receiveShadow = true;
    landEnvGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderR.rotation.x = -Math.PI / 2;
    shoulderR.position.set(10.0, 0.005, -42.0);
    shoulderR.receiveShadow = true;
    landEnvGroup.add(shoulderR);

    // 6. Restrained Road Markings (Solid White Edge Lines & Dashed Center Divider)
    const whiteMarkMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    const edgeLineGeo = new THREE.PlaneGeometry(0.22, 80);
    const edgeLineL = new THREE.Mesh(edgeLineGeo, whiteMarkMat);
    edgeLineL.rotation.x = -Math.PI / 2;
    edgeLineL.position.set(-6.5, 0.02, -42.0);
    landEnvGroup.add(edgeLineL);

    const edgeLineR = edgeLineL.clone();
    edgeLineR.position.x = 6.5;
    landEnvGroup.add(edgeLineR);

    // Center Dashed Dividing Line (4.5m dash, 7.5m gap, Y = 0.025)
    for (let z = -2.0; z >= -80.0; z -= 12.0) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4.5), whiteMarkMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.025, z - 2.25);
      landEnvGroup.add(dash);
    }

    // 7. Roadside Guide Delineator Posts (Spaced every 20m)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let z = 0.0; z >= -80.0; z -= 20.0) {
      [-8.4, 8.4].forEach((xPos) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), postMat);
        post.position.set(xPos, 0.425, z);
        post.castShadow = true;
        landEnvGroup.add(post);

        const ref = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.12, 8), reflectorMat);
        ref.position.set(xPos, 0.72, z);
        landEnvGroup.add(ref);
      });
    }

    // 8. Terminal Scale Reference Masts (Slender modern high-mast floodlight towers)
    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.65,
      roughness: 0.40,
    });
    const mastLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mastPositions = [
      [-28, 18],
      [28, 18],
      [-28, -10],
      [28, -10],
    ];
    mastPositions.forEach(([mX, mZ]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 19, 12), mastMat);
      pole.position.set(mX, 9.5, mZ);
      pole.castShadow = true;
      landEnvGroup.add(pole);

      // Crossbar & fixtures
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 0.25), mastMat);
      bar.position.set(mX, 19, mZ);
      bar.castShadow = true;
      landEnvGroup.add(bar);

      const fixture = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.15), mastLightMat);
      fixture.position.set(mX, 18.9, mZ);
      landEnvGroup.add(fixture);
    });

    // 9. Surrounding Industrial Terrain Ground (Placed at Y = -0.30 to avoid any depth precision artifacts)
    const terrainGeo = new THREE.PlaneGeometry(600, 200);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x242c38,
      roughness: 0.95,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.3, -25);
    terrain.receiveShadow = true;
    landEnvGroup.add(terrain);

    // 10. Distant Horizon Ridges (Atmospheric perspective silhouettes)
    const horizonGroup = new THREE.Group();
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x8a9cae,
      roughness: 0.95,
      flatShading: true,
    });
    for (let r = 0; r < 7; r++) {
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(75 + r * 15, 24 + (r % 3) * 6, 6),
        ridgeMat
      );
      ridge.position.set((r - 3) * 95 + (r % 2) * 20, 0, -310 - (r % 3) * 35);
      ridge.scale.set(1.6, 1.0, 0.4);
      horizonGroup.add(ridge);
    }
    landEnvGroup.add(horizonGroup);

    scene.add(landEnvGroup);
    modelsRef.current.roadGroup = landEnvGroup;

    // ========================================================================
    // E. ENVIRONMENT 3: VAST OCEAN WATER SURFACE (Z: -82 to -802)
    // Sits ONLY in the maritime region — zero overlap with land road/apron
    // ========================================================================
    const oceanGeo = new THREE.PlaneGeometry(1200, 720, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x04182b, // Deep oceanic navy
      roughness: 0.2,
      metalness: 0.78,
      flatShading: true,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -0.2, -442.0);
    scene.add(oceanMesh);
    modelsRef.current.oceanMesh = oceanMesh;

    // ========================================================================
    // E. ENVIRONMENT 4: LIGHTWEIGHT ATMOSPHERIC TRANSITION LAYER
    // Solid polyhedra removed to guarantee a completely clear, unobstructed camera path.
    // Atmospheric transition is driven smoothly via dynamic distance fog and background color blending.
    // ========================================================================
    const cloudsGroup = new THREE.Group();
    cloudsGroup.name = 'AtmosphericLayer';
    scene.add(cloudsGroup);
    modelsRef.current.cloudsGroup = cloudsGroup;

    // ========================================================================
    // F. LOAD AND ASSEMBLE ALL FLEET ASSETS WITH RIGOROUS SCALE & PBR TUNING
    // ========================================================================
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const totalModels = 6;

    console.log('LOADING FLEET ASSETS: Forklift, Container, Truck, Chassis, Ship, Plane');

    const onModelLoaded = (name: string) => {
      loadedCount++;
      setLoadPercent(Math.round((loadedCount / totalModels) * 100));
      console.log(`MODEL LOADED (${loadedCount}/${totalModels}): ${name}`);
      if (loadedCount >= totalModels) {
        setLoading(false);
        console.log('ALL 6 MERIDIANO FLEET ASSETS POSITIONED SUCCESSFULLY');
      }
    };

    // Helper: Material application for deep navy MERIDIANO shipping containers
    const applyContainerNavyMaterial = (group: THREE.Group) => {
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x0c2d48, // Deep rich MERIDIANO navy blue
            roughness: 0.45,
            metalness: 0.25,
            side: THREE.DoubleSide,
          });
        }
      });
    };

    // ------------------------------------------------------------------------
    // 1. FORKLIFT MODEL (Stage 1: Factory Staging Bay)
    // Locked calibrated configuration from forkliftConfig.ts
    // ------------------------------------------------------------------------
    console.log('LOADING FORKLIFT');
    loadGLTF(loader, getModelUrl('forklift.glb'))
      .then((raw) => {
        raw.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());

        // Center X & Z, ground wheels on Y = 0
        raw.position.set(-center.x, -box.min.y, -center.z);

        const forkGroup = new THREE.Group();
        forkGroup.name = 'Forklift';
        forkGroup.add(raw);
        forkGroup.scale.setScalar(FORKLIFT_CONFIG.scale);
        forkGroup.position.set(...FORKLIFT_CONFIG.position);
        forkGroup.rotation.set(...FORKLIFT_CONFIG.rotation);

        scene.add(forkGroup);
        modelsRef.current.forklift = forkGroup;
        console.log('FORKLIFT LOADED');
        onModelLoaded('Forklift');
      })
      .catch((e) => {
        console.error('Forklift error:', e);
        onModelLoaded('Forklift (fallback error)');
      });

    // ------------------------------------------------------------------------
    // 2. CONTAINER STAGE 1 (Factory Dock & Transition)
    // ------------------------------------------------------------------------
    loadGLTF(loader, getModelUrl('container.glb'))
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center on X & Z, ground on Y = 0
        raw.position.set(-center.x, -box.min.y, -center.z);

        const contGroup = new THREE.Group();
        contGroup.add(raw);

        // Standard 40ft container length ~12.0m, height ~2.6m, width ~2.44m
        const sLen = 12.0 / size.x;
        const sWid = 2.44 / size.z;
        const sHei = 2.60 / size.y;
        contGroup.scale.set(sLen, sHei, sWid);

        // Soft ambient occlusion contact shadow underneath container footprint
        const contShadowMat = new THREE.MeshBasicMaterial({
          map: createContactShadowTexture('rect'),
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        });
        const contShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 13.0), contShadowMat);
        contShadow.rotation.x = -Math.PI / 2;
        contShadow.position.set(0, 0.005, 0);
        contGroup.add(contShadow);

        // Position on factory floor
        contGroup.position.set(-1.2, 0, 0);
        contGroup.rotation.y = Math.PI / 2; // Length along Z
        applyContainerNavyMaterial(contGroup);

        scene.add(contGroup);
        modelsRef.current.containerStage1 = contGroup;
        onModelLoaded('Container Stage 1');
      })
      .catch((e) => {
        console.error('Container error:', e);
        onModelLoaded('Container Stage 1 (fallback error)');
      });

    // ------------------------------------------------------------------------
    // 3. BELIEVABLE TRUCK ASSEMBLY (Tractor + Chassis + Container as ONE GROUP)
    // Strictly uses buildApprovedTruckAssembly from truckAssemblyConfig.ts
    // ------------------------------------------------------------------------
    Promise.all([
      loadGLTF(loader, getModelUrl('truck.glb')),
      loadGLTF(loader, getModelUrl('chassis.glb')),
      loadGLTF(loader, getModelUrl('container.glb')),
    ])
      .then(([rawTruck, rawChassis, rawCont]) => {
        // Build the approved TruckAssembly using the locked calibration
        const truckAssembly = buildApprovedTruckAssembly(rawTruck, rawChassis, rawCont);

        // Orient to face forward down the highway (-Z)
        truckAssembly.rotation.y = -Math.PI / 2;
        truckAssembly.position.set(0, 0, -28.0);

        scene.add(truckAssembly);
        modelsRef.current.truckAssembly = truckAssembly;

        console.log('TRUCK ASSEMBLY BUILT: Locked approved calibration on road');
        onModelLoaded('Truck');
        onModelLoaded('Chassis');
        onModelLoaded('Highway Container');
      })
      .catch((e) => {
        console.error('Truck assembly build error:', e);
        onModelLoaded('Truck (fallback error)');
        onModelLoaded('Chassis (fallback error)');
        onModelLoaded('Highway Container (fallback error)');
      });

    // ------------------------------------------------------------------------
    // 4. CONTAINER SHIP (Stage 4: Maritime Ocean Giant)
    // ------------------------------------------------------------------------
    loadGLTF(loader, getModelUrl('container-ship.glb'))
      .then((raw) => {
        raw.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => { m.side = THREE.DoubleSide; });
            } else if (mesh.material) {
              mesh.material.side = THREE.DoubleSide;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center on all axes, waterline at Y = 0
        raw.position.set(-center.x, -box.min.y, -center.z);

        const shipGroup = new THREE.Group();
        shipGroup.name = 'ContainerShip';
        shipGroup.add(raw);

        // Authentic container vessel scale: 175m length (longest dimension)
        const shipLength = Math.max(size.x, size.y, size.z);
        const scale = 175.0 / shipLength;
        shipGroup.scale.setScalar(scale);

        // Sits safely in the open ocean at Z = -195.0, waterline submerged to Y = -3.2 (zero highway overlap)
        shipGroup.position.set(-15.0, -3.2, -195.0);
        shipGroup.rotation.y = Math.PI / 2;

        scene.add(shipGroup);
        modelsRef.current.shipGroup = shipGroup;
        onModelLoaded('Container Ship');
      })
      .catch((e) => {
        console.error('Ship error:', e);
        onModelLoaded('Container Ship (fallback error)');
      });

    // ------------------------------------------------------------------------
    // 5. CARGO PLANE (Stage 7: Stratospheric Reach)
    // Strictly uses calibrated hierarchy: AircraftRig → OrientationCorrection → RawCargoPlane
    // ------------------------------------------------------------------------
    loadGLTF(loader, getModelUrl('cargo-plane.glb'))
      .then((raw) => {
        // Build the calibrated aircraft conforming strictly to:
        // AircraftRig → OrientationCorrection → RawCargoPlane
        const { rig, orientationCorrection } = buildCalibratedAircraftRig(raw, APPROVED_AIRCRAFT_CONFIG);

        scene.add(rig);
        modelsRef.current.aircraftRig = rig;
        modelsRef.current.planeGroup = orientationCorrection;
        onModelLoaded('Cargo Plane');
      })
      .catch((e) => {
        console.error('Plane error:', e);
        onModelLoaded('Cargo Plane (fallback error)');
      });

    // ========================================================================
    // G. ANIMATION RENDER LOOP (Strictly controlled by normalized scroll progress)
    // ========================================================================
    const renderLoop = () => {
      animationFrameId.current = requestAnimationFrame(renderLoop);

      // Smooth progress lerp for fluid camera motion
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

      // 2. Dynamic Atmospheric Distance Fog & Color Blending (Phases A, B, C)
      if (sceneRef.current && sceneRef.current.fog instanceof THREE.Fog) {
        const fog = sceneRef.current.fog;
        const daylightSky = new THREE.Color(0xd2e0ed);
        const transitionHaze = new THREE.Color(0xdce6f0);
        const stratosphericSky = new THREE.Color(0xb2cae0);

        if (p < 0.64) {
          // Low-altitude ground and maritime staging
          fog.near = 65;
          fog.far = 460;
          fog.color.copy(daylightSky);
          sceneRef.current.background = daylightSky;
        } else if (p < 0.81) {
          // Phase A & B: Smooth atmospheric transition (gentle haze layer softening lower horizon)
          const t = (p - 0.64) / 0.17;
          const hazeFactor = Math.sin(t * Math.PI);
          fog.near = THREE.MathUtils.lerp(65, 42, hazeFactor);
          fog.far = THREE.MathUtils.lerp(460, 310, hazeFactor);
          const hazeColor = new THREE.Color().lerpColors(daylightSky, transitionHaze, hazeFactor);
          fog.color.copy(hazeColor);
          sceneRef.current.background = hazeColor;
        } else {
          // Phase C & stratospheric cruise: expansive, crisp high-altitude clarity
          const t = Math.min((p - 0.81) / 0.19, 1.0);
          fog.near = THREE.MathUtils.lerp(65, 85, t);
          fog.far = THREE.MathUtils.lerp(460, 650, t);
          const skyColor = new THREE.Color().lerpColors(transitionHaze, stratosphericSky, t);
          fog.color.copy(skyColor);
          sceneRef.current.background = skyColor;
        }
      }

      // 3. Physical Dynamic Movements along Timeline

      // Stage 1 (0.00 -> 0.14): Forklift hoists / approaches container at staging line
      if (modelsRef.current.forklift) {
        const forkP = Math.min(p / 0.14, 1.0);
        modelsRef.current.forklift.position.z = FORKLIFT_CONFIG.position[2] - forkP * 0.4;
      }

      // Stage 3 (0.24 -> 0.48): TruckAssembly drives forward down the highway AS ONE GROUP with rolling wheels
      if (modelsRef.current.truckAssembly) {
        if (p >= 0.24 && p <= 0.48) {
          const truckT = Math.min(Math.max((p - 0.24) / 0.20, 0), 1.2);
          const distanceTravelled = truckT * 26.0;
          modelsRef.current.truckAssembly.position.z = -28.0 - distanceTravelled;
          modelsRef.current.truckAssembly.userData.setWheelSpin?.(distanceTravelled);
        } else if (p < 0.24) {
          modelsRef.current.truckAssembly.position.z = -28.0;
          modelsRef.current.truckAssembly.userData.setWheelSpin?.(0);
        }
      }

      // Stage 4 (0.44 -> 0.68): Ship gentle ocean swell cutting through waves
      if (modelsRef.current.shipGroup) {
        modelsRef.current.shipGroup.rotation.z = Math.sin(p * 20.0) * 0.012;
      }

      // Stage 7 (0.78 -> 1.00): Cargo plane cruises horizontally through the stratosphere
      // Animation strictly modifies ONLY AircraftRig parent group (position & subtle bank),
      // completely preserving OrientationCorrection locked permanent calibration transforms.
      if (modelsRef.current.aircraftRig) {
        if (p >= 0.78) {
          const planeT = Math.max(0, Math.min(1, (p - 0.78) / 0.22));

          // Forward flight: cruises steadily from 0.78 to 0.92, then accelerates into the distance from 0.92 to 1.00
          let forwardDisplacement = 0;
          if (planeT < 0.60) {
            // Cruise phase: steady travel along flight path
            const cruiseT = planeT / 0.60;
            forwardDisplacement = cruiseT * 60.0;
          } else {
            // Acceleration phase: aircraft accelerates forward and away into the horizon
            const accelT = (planeT - 0.60) / 0.40;
            forwardDisplacement = 60.0 + accelT * 120.0 + accelT * accelT * 140.0;
          }

          modelsRef.current.aircraftRig.position.z = APPROVED_AIRCRAFT_CONFIG.rig.position[2] - forwardDisplacement;

          // Subtle horizontal drift and altitude climb during departure
          modelsRef.current.aircraftRig.position.x = Math.sin(planeT * Math.PI) * 2.5;
          modelsRef.current.aircraftRig.position.y = APPROVED_AIRCRAFT_CONFIG.rig.position[1] + Math.pow(planeT, 2) * 4.0;

          // Very subtle banking motion (max ±0.025 rad ≈ 1.4°), returning to perfectly level
          // Applied ONLY to AircraftRig parent group, NEVER touching OrientationCorrection
          modelsRef.current.aircraftRig.rotation.z = -Math.sin(planeT * Math.PI * 1.5) * 0.025;
        } else {
          // Reset to initial baseline position when scrolled before flight sequence
          modelsRef.current.aircraftRig.position.set(...APPROVED_AIRCRAFT_CONFIG.rig.position);
          modelsRef.current.aircraftRig.rotation.set(0, 0, 0);
        }
      }

      // 3. Global Model Visibility Management: guarantees zero camera clipping or collision across transitions
      if (modelsRef.current.forklift) modelsRef.current.forklift.visible = p < 0.26;
      if (modelsRef.current.containerStage1) modelsRef.current.containerStage1.visible = p < 0.26;
      if (modelsRef.current.truckAssembly) modelsRef.current.truckAssembly.visible = p >= 0.20 && p <= 0.52;
      if (modelsRef.current.shipGroup) modelsRef.current.shipGroup.visible = p >= 0.42 && p <= 0.80;
      if (modelsRef.current.aircraftRig) modelsRef.current.aircraftRig.visible = p >= 0.76;

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderLoop();

    // H. Window Resize Handler
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
    };
  }, []);

  // 2. Connect Browser Scroll Directly to Master Timeline using GSAP ScrollTrigger Scrub
  useEffect(() => {
    if (!scrollTrackRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        targetProgressRef.current = self.progress;
        setCurrentProgress(self.progress);

        // Sound ambience phase transition
        const phaseIdx = Math.min(Math.floor(self.progress * 4), 3);
        audioEngine.startPhaseAmbience(phaseIdx);
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (!nextMuted) {
      audioEngine.playClick();
      const phaseIdx = Math.min(Math.floor(currentProgress * 4), 3);
      audioEngine.startPhaseAmbience(phaseIdx);
    } else {
      audioEngine.stopAmbience();
    }
  };

  return (
    <div className="relative w-full bg-transparent text-white overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ==================================================================== */}
      {/* 1. PERMANENT FULL-SCREEN FIXED WEBGL CANVAS (EDGE-TO-EDGE)            */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#060913] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin mb-4" />
          <div className="text-sm font-mono tracking-widest uppercase text-white font-bold mb-2">
            INITIALIZING MERIDIANO 3D FLEET ARCHITECTURE
          </div>
          <div className="w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${Math.max(loadPercent, 8)}%` }}
            />
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2">
            Loading Fleet Assets ({loadPercent}%) • Forklift • Container • Truck Assembly • Ship • Cargo Plane
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. MINIMAL FLOATING CONTROLS & HUD OVERLAY (NO DEMO LABELS)           */}
      {/* ==================================================================== */}
      <div className="fixed top-6 left-6 z-40 pointer-events-auto flex items-center gap-3">
        {/* Brand Monogram */}
        <div className="flex items-center gap-2.5 bg-slate-950/70 backdrop-blur-md px-3.5 py-2 rounded-full border border-slate-800/80 shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-montserrat font-black text-sm tracking-widest text-white">
            MERIDIANO
          </span>
          <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-2">
            GLOBAL LOGISTICS
          </span>
        </div>

        {/* Switch to Diagnostic Mode Button */}
        {onSwitchToDiagnostic && (
          <button
            type="button"
            onClick={onSwitchToDiagnostic}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-slate-700 text-xs font-mono transition-all backdrop-blur-md shadow-xl"
            title="Open Diagnostic Forklift View"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Diagnostic</span>
          </button>
        )}
      </div>

      {/* Top Right Sound Toggle */}
      <div className="fixed top-6 right-6 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={toggleSound}
          className={`p-2.5 rounded-full border transition-all backdrop-blur-md shadow-2xl ${
            !isMuted
              ? 'bg-blue-950/80 border-blue-500/80 text-blue-300'
              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {!isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Scroll Cue at start */}
      {currentProgress < 0.04 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-300 bg-slate-950/60 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-800">
            SCROLL TO EXPLORE JOURNEY
          </span>
          <ArrowDown className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Subtle Progress Line on right edge */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 pointer-events-none hidden sm:flex flex-col items-center gap-1.5">
        <div className="w-1 h-36 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className="w-full bg-gradient-to-b from-blue-400 to-cyan-300 rounded-full transition-all duration-75"
            style={{ height: `${currentProgress * 100}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-slate-500 font-bold">
          {Math.round(currentProgress * 100)}%
        </span>
      </div>

      {/* ==================================================================== */}
      {/* 3. SCROLL TIMELINE TRACK (~800vh TOTAL DISTANCE)                     */}
      {/* ALL DEMO CHAPTER LABELS REMOVED (Visuals tell the story)            */}
      {/* ONLY THE FINAL STATEMENT AT THE END (0.95 - 1.00)                    */}
      {/* ==================================================================== */}
      <div ref={scrollTrackRef} className="relative w-full h-[800vh] pointer-events-auto">
        
        {/* FINAL STATEMENT ONLY AT THE END */}
        <section className="absolute top-[750vh] inset-x-0 flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-auto">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-sky-300">
              MERIDIANO GLOBAL TRADE
            </span>

            {/* Requested Statement */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-montserrat tracking-tight text-white leading-tight">
              FROM THE WORLD
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200">
                TO YOU.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans max-w-xl mx-auto pt-2">
              Вашата стока, нашата отговорност. Пълен контрол на доставката от завода до вашия склад в България и Европа.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#replay"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-3.5 rounded-full bg-white text-[#040711] font-montserrat font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-2xl"
              >
                Replay Journey ↺
              </a>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
};
