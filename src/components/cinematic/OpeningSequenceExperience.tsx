import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX, Globe } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';
import { getModelUrl } from '../../utils/modelUrl';
import { buildApprovedTruckAssembly } from './truckAssemblyConfig';
import { FORKLIFT_CONFIG } from './forkliftConfig';

gsap.registerPlugin(ScrollTrigger);

interface OpeningSequenceExperienceProps {
  onExploreFullJourney?: () => void;
}

// ============================================================================
// PROCEDURAL ENVIRONMENT TEXTURES (HIGH FIDELITY ASPHALT & TERMINAL APRON)
// ============================================================================

const createAsphaltTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#1c212a';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 24;
    const speck = Math.random() > 0.96 ? Math.random() * 38 : Math.random() < 0.04 ? -20 : 0;
    const val = THREE.MathUtils.clamp(30 + noise + speck, 16, 65);
    data[i] = val;
    data[i + 1] = val + 1;
    data[i + 2] = val + 3;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 32);
  texture.anisotropy = 8;
  return texture;
};

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
  texture.repeat.set(8, 64);
  return texture;
};

const createConcreteApronTexture = (): THREE.CanvasTexture => {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as HTMLCanvasElement);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#3c4552';
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    const base = 66 + noise;
    data[i] = THREE.MathUtils.clamp(base - 1, 40, 105);
    data[i + 1] = THREE.MathUtils.clamp(base, 40, 105);
    data[i + 2] = THREE.MathUtils.clamp(base + 3, 40, 110);
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Expansion joint grid line
  ctx.strokeStyle = '#272d37';
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
    grad.addColorStop(0, 'rgba(8, 12, 20, 0.88)');
    grad.addColorStop(0.35, 'rgba(8, 12, 20, 0.65)');
    grad.addColorStop(0.75, 'rgba(8, 12, 20, 0.20)');
    grad.addColorStop(1, 'rgba(8, 12, 20, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const grad = ctx.createRadialGradient(128, 128, 45, 128, 128, 125);
    grad.addColorStop(0, 'rgba(8, 12, 20, 0.92)');
    grad.addColorStop(0.45, 'rgba(8, 12, 20, 0.68)');
    grad.addColorStop(0.82, 'rgba(8, 12, 20, 0.22)');
    grad.addColorStop(1, 'rgba(8, 12, 20, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

// ============================================================================
// CAMERA SPLINE KEYFRAME DEFINITION
// ============================================================================
interface MotionKeyframe {
  progress: number;
  camPos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const MOTION_KEYFRAMES: MotionKeyframe[] = [
  // 1. MACRO CONTAINER HERO CLOSE-UP (0.00 - 0.20)
  // Low 3/4 dramatic hero angle on the container flank and corner, establishing massive scale
  {
    progress: 0.00,
    camPos: [4.4, 1.6, 4.6],
    target: [-0.6, 1.4, 0.6],
    fov: 38,
  },
  // 2. SMOOTH RETRACT & DOLLY ALONGSIDE CONTAINER (0.20 - 0.38)
  // Camera moves smoothly alongside container, revealing forklift & staging apron
  {
    progress: 0.22,
    camPos: [7.6, 2.5, 4.2],
    target: [0.3, 1.4, 0.4],
    fov: 40,
  },
  {
    progress: 0.38,
    camPos: [6.4, 2.2, 0.2],
    target: [0.0, 1.3, -1.0],
    fov: 39,
  },
  // 3. CONTAINER FOREGROUND WIPE TRANSITION (0.44 - 0.54)
  // Camera cuts close to the container's corrugated dark navy surface as it slides across frame
  {
    progress: 0.47,
    camPos: [2.0, 1.42, -2.4],
    target: [-0.9, 1.40, -3.2],
    fov: 42,
  },
  {
    progress: 0.52,
    camPos: [1.6, 1.40, -2.8],
    target: [-1.2, 1.38, -3.4],
    fov: 44,
  },
  // 4. HIGHWAY OPENING & TRUCK ASSEMBLY REVEAL (0.58 - 0.80)
  // Container wipe clears, revealing TruckAssembly driving down highway corridor
  {
    progress: 0.62,
    camPos: [5.8, 1.9, -15.0],
    target: [0.0, 1.5, -24.0],
    fov: 38,
  },
  {
    progress: 0.80,
    camPos: [5.2, 1.6, -38.0],
    target: [-0.2, 1.45, -48.0],
    fov: 35,
  },
  // 5. HEROIC LOW 3/4 TRACKING SHOT (0.85 - 1.00)
  // Locks into smooth low 3/4 tracking shot with spinning wheels, truck 65-75% of frame
  {
    progress: 1.00,
    camPos: [4.8, 1.42, -62.0],
    target: [-0.4, 1.40, -72.0],
    fov: 33,
  },
];

export const OpeningSequenceExperience: React.FC<OpeningSequenceExperienceProps> = ({
  onExploreFullJourney,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // UI state
  const [lang, setLang] = useState<'bg' | 'en'>('bg');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  // Three.js Core References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Model & Environment References
  const modelsRef = useRef<{
    forklift?: THREE.Group;
    yardContainer?: THREE.Group;
    truckAssembly?: THREE.Group;
    yardGroup?: THREE.Group;
    highwayGroup?: THREE.Group;
    directionalLight?: THREE.DirectionalLight;
    ambientLight?: THREE.AmbientLight;
  }>({});

  // Deterministic lerp progress
  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);

  // Interpolate camera parameters across spline
  const getCameraAtProgress = (p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    let k1 = MOTION_KEYFRAMES[0];
    let k2 = MOTION_KEYFRAMES[MOTION_KEYFRAMES.length - 1];

    for (let i = 0; i < MOTION_KEYFRAMES.length - 1; i++) {
      if (clamped >= MOTION_KEYFRAMES[i].progress && clamped <= MOTION_KEYFRAMES[i + 1].progress) {
        k1 = MOTION_KEYFRAMES[i];
        k2 = MOTION_KEYFRAMES[i + 1];
        break;
      }
    }

    const span = k2.progress - k1.progress;
    const t = span > 0 ? (clamped - k1.progress) / span : 0;
    // Cosine ease for buttery smooth cinematic glide
    const smoothT = 0.5 - 0.5 * Math.cos(t * Math.PI);

    const pos = new THREE.Vector3(
      THREE.MathUtils.lerp(k1.camPos[0], k2.camPos[0], smoothT),
      THREE.MathUtils.lerp(k1.camPos[1], k2.camPos[1], smoothT),
      THREE.MathUtils.lerp(k1.camPos[2], k2.camPos[2], smoothT)
    );

    const target = new THREE.Vector3(
      THREE.MathUtils.lerp(k1.target[0], k2.target[0], smoothT),
      THREE.MathUtils.lerp(k1.target[1], k2.target[1], smoothT),
      THREE.MathUtils.lerp(k1.target[2], k2.target[2], smoothT)
    );

    const fov = THREE.MathUtils.lerp(k1.fov, k2.fov, smoothT);
    return { pos, target, fov };
  };

  // Helper to load GLB with progress
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
              reject(err);
            }
          );
        }
      );
    });
  };

  // Helper to paint container deep navy
  const applyContainerNavyMaterial = (group: THREE.Group) => {
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x092b52, // Meridiano Deep Intermodal Navy
          roughness: 0.42,
          metalness: 0.28,
          side: THREE.DoubleSide,
        });
      }
    });
  };

  // ============================================================================
  // THREE.JS INITIALIZATION & SCENE GRAPH
  // ============================================================================
  useEffect(() => {
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d16); // Deep atmospheric industrial slate
    scene.fog = new THREE.FogExp2(0x0e1422, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 800);
    const initialCam = getCameraAtProgress(0);
    camera.position.copy(initialCam.pos);
    camera.lookAt(initialCam.target);
    cameraRef.current = camera;

    // 2. WebGL Renderer
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
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 3. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xd4e2f2, 0.72);
    scene.add(ambientLight);
    modelsRef.current.ambientLight = ambientLight;

    // Key directional daylight (Hero shadows)
    const dirLight = new THREE.DirectionalLight(0xfff7ea, 2.1);
    dirLight.position.set(38, 55, 32);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1.0;
    dirLight.shadow.camera.far = 160;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    dirLight.shadow.bias = -0.0003;
    scene.add(dirLight);
    modelsRef.current.directionalLight = dirLight;

    // Sky fill light
    const skyFill = new THREE.DirectionalLight(0x8cb5df, 0.55);
    skyFill.position.set(-30, 24, -20);
    scene.add(skyFill);

    // ==========================================================================
    // 4. ENVIRONMENT 1: CONTAINER TERMINAL STAGING YARD
    // ==========================================================================
    const yardGroup = new THREE.Group();
    yardGroup.name = 'ContainerYardEnvironment';

    // Concrete Staging Apron (Z: +30 to -4.0)
    const apronGeo = new THREE.PlaneGeometry(64, 38);
    const apronMat = new THREE.MeshStandardMaterial({
      map: createConcreteApronTexture(),
      roughness: 0.86,
      metalness: 0.08,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(0, 0, 13);
    apronMesh.receiveShadow = true;
    yardGroup.add(apronMesh);

    // Amber Safety Staging Demarcation Lines
    const amberLineMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });

    const safetyLine = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.25), amberLineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(0, 0.02, 3.8);
    yardGroup.add(safetyLine);

    // Container Bay Staging Pad
    const bayPad = new THREE.Mesh(
      new THREE.PlaneGeometry(13.2, 3.2),
      new THREE.MeshBasicMaterial({
        color: 0x222a36,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    bayPad.rotation.x = -Math.PI / 2;
    bayPad.position.set(-1.2, 0.015, 0);
    yardGroup.add(bayPad);

    // Terminal Floodlight Towers for Industrial Scale
    const mastMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.65,
      roughness: 0.40,
    });
    const mastLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mastCoords = [
      [-26, 16],
      [26, 16],
      [-26, -6],
      [26, -6],
    ];
    mastCoords.forEach(([mX, mZ]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 18, 12), mastMat);
      pole.position.set(mX, 9.0, mZ);
      pole.castShadow = true;
      yardGroup.add(pole);

      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.25), mastMat);
      crossbar.position.set(mX, 18, mZ);
      crossbar.castShadow = true;
      yardGroup.add(crossbar);

      const fixture = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.15), mastLightMat);
      fixture.position.set(mX, 17.9, mZ);
      yardGroup.add(fixture);
    });

    scene.add(yardGroup);
    modelsRef.current.yardGroup = yardGroup;

    // ==========================================================================
    // 5. ENVIRONMENT 2: CONTINENTAL HIGHWAY CORRIDOR
    // ==========================================================================
    const highwayGroup = new THREE.Group();
    highwayGroup.name = 'HighwayCorridor';

    // Asphalt Road Plane (Length: 120m down to Z: -120)
    const roadGeo = new THREE.PlaneGeometry(16, 120);
    const roadMat = new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(),
      bumpMap: createAsphaltBumpTexture(),
      bumpScale: 0.015,
      roughness: 0.78,
      metalness: 0.14,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -60.0);
    roadMesh.receiveShadow = true;
    highwayGroup.add(roadMesh);

    // Concrete Curbs
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x556070, roughness: 0.82 });
    const curbGeo = new THREE.BoxGeometry(0.65, 0.08, 120);
    const curbL = new THREE.Mesh(curbGeo, curbMat);
    curbL.position.set(-8.3, 0.04, -60.0);
    curbL.receiveShadow = true;
    highwayGroup.add(curbL);

    const curbR = new THREE.Mesh(curbGeo, curbMat);
    curbR.position.set(8.3, 0.04, -60.0);
    curbR.receiveShadow = true;
    highwayGroup.add(curbR);

    // Road Markings: Solid White Edge Lines
    const whiteMarkMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    const edgeGeo = new THREE.PlaneGeometry(0.24, 120);
    const edgeL = new THREE.Mesh(edgeGeo, whiteMarkMat);
    edgeL.rotation.x = -Math.PI / 2;
    edgeL.position.set(-6.8, 0.02, -60.0);
    highwayGroup.add(edgeL);

    const edgeR = new THREE.Mesh(edgeGeo, whiteMarkMat);
    edgeR.rotation.x = -Math.PI / 2;
    edgeR.position.set(6.8, 0.02, -60.0);
    highwayGroup.add(edgeR);

    // Center Dashed Dividing Lines (Repeated along the highway)
    for (let z = 0.0; z >= -120.0; z -= 12.0) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4.8), whiteMarkMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.025, z - 2.4);
      highwayGroup.add(dash);
    }

    // Roadside Guide Delineator Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    for (let z = 0.0; z >= -120.0; z -= 22.0) {
      [-9.0, 9.0].forEach((xPos) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), postMat);
        post.position.set(xPos, 0.425, z);
        post.castShadow = true;
        highwayGroup.add(post);

        const ref = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 8), reflectorMat);
        ref.position.set(xPos, 0.72, z);
        highwayGroup.add(ref);
      });
    }

    // Surrounding Terrain Plane
    const terrainGeo = new THREE.PlaneGeometry(800, 240);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1e2633, roughness: 0.95 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.3, -50.0);
    terrain.receiveShadow = true;
    highwayGroup.add(terrain);

    // Distant Horizon Ridges
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, flatShading: true });
    for (let r = 0; r < 7; r++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(80 + r * 15, 24 + (r % 3) * 6, 6), ridgeMat);
      ridge.position.set((r - 3) * 95 + (r % 2) * 20, 0, -180 - (r % 3) * 35);
      ridge.scale.set(1.6, 1.0, 0.4);
      highwayGroup.add(ridge);
    }

    scene.add(highwayGroup);
    modelsRef.current.highwayGroup = highwayGroup;

    // ==========================================================================
    // 6. ASSET LOADING: FORKLIFT + CONTAINER + TRUCK ASSEMBLY
    // ==========================================================================
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const totalAssets = 4; // Forklift, Yard Container, Truck, Chassis

    const checkLoaded = () => {
      loadedCount++;
      setLoadPercent(Math.round((loadedCount / totalAssets) * 100));
      if (loadedCount >= totalAssets) {
        setLoading(false);
      }
    };

    // 1. FORKLIFT (Realistic Grounded Staging Position)
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
        raw.position.set(-center.x, -box.min.y, -center.z);

        const forkGroup = new THREE.Group();
        forkGroup.name = 'GroundedForklift';
        forkGroup.add(raw);
        forkGroup.scale.setScalar(FORKLIFT_CONFIG.scale);
        forkGroup.position.set(...FORKLIFT_CONFIG.position);
        forkGroup.rotation.set(...FORKLIFT_CONFIG.rotation);

        // Soft radial shadow under forklift tires
        const fShadowMat = new THREE.MeshBasicMaterial({
          map: createContactShadowTexture('radial'),
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        });
        const fShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), fShadowMat);
        fShadow.rotation.x = -Math.PI / 2;
        fShadow.position.set(0, 0.005, 0);
        forkGroup.add(fShadow);

        scene.add(forkGroup);
        modelsRef.current.forklift = forkGroup;
        checkLoaded();
      })
      .catch((err) => {
        console.error('Failed to load forklift:', err);
        checkLoaded();
      });

    // 2. CONTAINER 1 (Stage 1: Terminal Yard Hero Container)
    loadGLTF(loader, getModelUrl('container.glb'))
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        raw.position.set(-center.x, -box.min.y, -center.z);

        const contGroup = new THREE.Group();
        contGroup.name = 'YardContainerHero';
        contGroup.add(raw);

        // Scale to 40ft standard: length 12m, height 2.6m, width 2.44m
        const sLen = 12.0 / size.x;
        const sWid = 2.44 / size.z;
        const sHei = 2.60 / size.y;
        contGroup.scale.set(sLen, sHei, sWid);

        // Soft contact shadow underneath container footprint
        const cShadowMat = new THREE.MeshBasicMaterial({
          map: createContactShadowTexture('rect'),
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        });
        const cShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 13.0), cShadowMat);
        cShadow.rotation.x = -Math.PI / 2;
        cShadow.position.set(0, 0.005, 0);
        contGroup.add(cShadow);

        // Position on staging bay, length along Z
        contGroup.position.set(-1.2, 0, 0);
        contGroup.rotation.y = Math.PI / 2;
        applyContainerNavyMaterial(contGroup);

        scene.add(contGroup);
        modelsRef.current.yardContainer = contGroup;
        checkLoaded();
      })
      .catch((err) => {
        console.error('Failed to load yard container:', err);
        checkLoaded();
      });

    // 3. TRUCK ASSEMBLY (Tractor + Chassis + Matching Navy Container)
    // Strictly uses approved calibration from truckAssemblyConfig.ts
    Promise.all([
      loadGLTF(loader, getModelUrl('truck.glb')),
      loadGLTF(loader, getModelUrl('chassis.glb')),
      loadGLTF(loader, getModelUrl('container.glb')),
    ])
      .then(([rawTruck, rawChassis, rawCont]) => {
        const truckAssembly = buildApprovedTruckAssembly(rawTruck, rawChassis, rawCont);

        // Orient facing forward down the highway (-Z)
        truckAssembly.rotation.y = -Math.PI / 2;
        truckAssembly.position.set(0, 0, -20.0);

        scene.add(truckAssembly);
        modelsRef.current.truckAssembly = truckAssembly;

        checkLoaded(); // For Truck
        checkLoaded(); // For Chassis
      })
      .catch((err) => {
        console.error('Failed to assemble truck:', err);
        checkLoaded();
        checkLoaded();
      });

    // ==========================================================================
    // 7. DETERMINISTIC RENDER LOOP WITH BUTTERY SMOOTH LERP
    // ==========================================================================
    const renderLoop = () => {
      animationFrameId.current = requestAnimationFrame(renderLoop);

      // Reversible smooth interpolation
      smoothProgressRef.current = THREE.MathUtils.lerp(
        smoothProgressRef.current,
        targetProgressRef.current,
        0.08
      );
      const p = smoothProgressRef.current;

      // 1. Interpolate Camera along spline
      if (cameraRef.current) {
        const camData = getCameraAtProgress(p);
        cameraRef.current.position.copy(camData.pos);
        cameraRef.current.lookAt(camData.target);
        if (Math.abs(cameraRef.current.fov - camData.fov) > 0.01) {
          cameraRef.current.fov = camData.fov;
          cameraRef.current.updateProjectionMatrix();
        }
      }

      // 2. Physical Dynamic Movements along timeline

      // Stage 1 & 2: Yard Container natural subtle slide along staging apron (0.20 -> 0.52)
      if (modelsRef.current.yardContainer) {
        if (p < 0.20) {
          modelsRef.current.yardContainer.position.set(-1.2, 0, 0);
        } else if (p <= 0.54) {
          const slideT = (p - 0.20) / 0.34;
          // Smooth glide forward and slightly outward to execute the cinematic foreground wipe
          modelsRef.current.yardContainer.position.set(
            -1.2 + slideT * 0.4,
            0,
            -slideT * 3.6
          );
        }
      }

      // Stage 3 & 4: TruckAssembly on Highway (0.55 -> 1.00)
      if (modelsRef.current.truckAssembly) {
        if (p >= 0.55) {
          const truckT = Math.min(Math.max((p - 0.55) / 0.45, 0), 1.0);
          const travelDistance = truckT * 55.0; // 55 meters of highway travel
          modelsRef.current.truckAssembly.position.z = -20.0 - travelDistance;
          // Synchronize wheel spin with exact scroll distance
          modelsRef.current.truckAssembly.userData.setWheelSpin?.(travelDistance);
        } else {
          modelsRef.current.truckAssembly.position.z = -20.0;
          modelsRef.current.truckAssembly.userData.setWheelSpin?.(0);
        }
      }

      // 3. Visibility Management across the foreground container wipe
      // Yard models visible during 0.00 to 0.54
      // Truck assembly visible during 0.50 to 1.00
      if (modelsRef.current.yardGroup) {
        modelsRef.current.yardGroup.visible = p < 0.55;
      }
      if (modelsRef.current.forklift) {
        modelsRef.current.forklift.visible = p < 0.52;
      }
      if (modelsRef.current.yardContainer) {
        modelsRef.current.yardContainer.visible = p < 0.55;
      }
      if (modelsRef.current.highwayGroup) {
        modelsRef.current.highwayGroup.visible = p >= 0.45;
      }
      if (modelsRef.current.truckAssembly) {
        modelsRef.current.truckAssembly.visible = p >= 0.50;
      }

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderLoop();

    // Resize Handler
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

  // ============================================================================
  // GSAP SCROLLTRIGGER ATTACHMENT (DETERMINISTIC SCRUB)
  // ============================================================================
  useEffect(() => {
    if (!scrollTrackRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        targetProgressRef.current = self.progress;
        setCurrentProgress(self.progress);

        // Sound ambiance modulation
        const phaseIdx = self.progress < 0.52 ? 0 : 1;
        audioEngine.startPhaseAmbience(phaseIdx);
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  // Audio Toggle
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (!nextMuted) {
      audioEngine.playClick();
      const phaseIdx = currentProgress < 0.52 ? 0 : 1;
      audioEngine.startPhaseAmbience(phaseIdx);
    } else {
      audioEngine.stopAmbience();
    }
  };

  return (
    <div className="relative w-full bg-[#080d16] text-white selection:bg-blue-600 selection:text-white overflow-x-hidden">

      {/* ==================================================================== */}
      {/* 1. LAYER 0: OVERSIZED EDITORIAL TYPOGRAPHY BEHIND 3D OBJECTS          */}
      {/* (Inspired by unitedcarriers.com high-fashion industrial composition)   */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex flex-col justify-between p-8 sm:p-14 overflow-hidden select-none">
        {/* Background Gigantic Brand Lettering */}
        <div className="w-full flex justify-between items-start opacity-15">
          <span className="font-montserrat font-black text-[18vw] sm:text-[19vw] leading-none tracking-tighter text-white">
            MERIDIANO
          </span>
        </div>

        {/* Background Industrial Telemetry & Subtle Grid Numbers */}
        <div className="flex justify-between items-end opacity-20 font-mono text-xs sm:text-sm tracking-widest text-slate-400">
          <div>
            <span>LAT 43.2141° N</span>
            <span className="mx-2">·</span>
            <span>LON 27.9147° E</span>
          </div>
          <div>
            <span>40FT HIGH CUBE INTERMODAL</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. LAYER 1: FIXED EDGE-TO-EDGE WEBGL 3D CANVAS                        */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 w-screen h-screen z-10 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />
      </div>

      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#060913] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin mb-4" />
          <div className="text-xs font-mono tracking-widest uppercase text-white font-bold mb-2">
            INITIALIZING MERIDIANO CONTINENTAL TRANSIT ENGINE
          </div>
          <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400 transition-all duration-200"
              style={{ width: `${Math.max(loadPercent, 12)}%` }}
            />
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5">
            Calibrating Container Yard & Highway Assets ({loadPercent}%)
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. LAYER 2: MINIMALIST TOP NAV & EDITORIAL HUD (NO FLOATING PANELS)   */}
      {/* ==================================================================== */}
      <header className="fixed top-0 inset-x-0 z-30 pointer-events-auto flex items-center justify-between px-6 sm:px-12 py-6">
        {/* Brand Wordmark & Location */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-slate-950/70 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800/80 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-montserrat font-black text-sm tracking-widest text-white">
              MERIDIANO
            </span>
            <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-2 hidden sm:inline">
              INTERMODAL FREIGHT
            </span>
          </div>
        </div>

        {/* Right Action Group: Language + Audio + Full Experience Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-950/70 backdrop-blur-md px-1.5 py-1 rounded-full border border-slate-800/80 shadow-xl">
            <button
              onClick={() => setLang('bg')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all ${
                lang === 'bg'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BG
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all ${
                lang === 'en'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Sound Toggle */}
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
      </header>

      {/* Floating Scroll Cue at start */}
      {currentProgress < 0.05 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-300 bg-slate-950/80 px-4 py-1.5 rounded-full backdrop-blur-md border border-slate-800 shadow-2xl">
            {lang === 'bg' ? 'ПРЕВЪРТЕТЕ ЗА ДА СТАРТИРАТЕ ТРАНЗИТА' : 'SCROLL TO COMMENCE TRANSIT'}
          </span>
          <ArrowDown className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Vertical Progress Bar & Chapter Indicator */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-none hidden md:flex flex-col items-end gap-2">
        <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
          {currentProgress < 0.50
            ? (lang === 'bg' ? '01 ТЕРМИНАЛ' : '01 TERMINAL')
            : (lang === 'bg' ? '02 МАГИСТРАЛА' : '02 HIGHWAY')}
        </span>
        <div className="w-1 h-32 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="w-full bg-gradient-to-b from-blue-400 via-sky-300 to-amber-300 rounded-full transition-all duration-75"
            style={{ height: `${currentProgress * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-bold">
          {Math.round(currentProgress * 100)}%
        </span>
      </div>

      {/* ==================================================================== */}
      {/* 4. LAYER 3: SCROLL-SYNCHRONIZED EDITORIAL TEXT SECTIONS (550vh)       */}
      {/* Layered seamlessly in front of the 3D objects                       */}
      {/* ==================================================================== */}
      <div ref={scrollTrackRef} className="relative w-full h-[550vh] pointer-events-auto">

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1: CONTAINER ESTABLISHING (0vh – 120vh)                    */}
        {/* ------------------------------------------------------------------ */}
        <section
          className={`fixed top-28 sm:top-36 left-6 sm:left-14 max-w-xl z-20 pointer-events-none transition-all duration-500 ${
            currentProgress < 0.28
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-8 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-blue-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{lang === 'bg' ? '01 / ИНТЕРМОДАЛЕН ТЕРМИНАЛ' : '01 / INTERMODAL TERMINAL'}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black font-montserrat tracking-tight text-white leading-[1.05]">
              {lang === 'bg' ? (
                <>
                  ВАШАТА СТОКА.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-slate-100">
                    НАШАТА ОТГОВОРНОСТ.
                  </span>
                </>
              ) : (
                <>
                  YOUR CARGO.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-slate-100">
                    OUR AUTHORITY.
                  </span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-md pt-1">
              {lang === 'bg'
                ? 'Пълен контрол на доставката без прекупвачи. От вратите на завода до вашия складов терминал в България и Европа.'
                : 'Direct manufacturer procurement without trading brokers. Unbroken cargo integrity from Chinese factory gates to European sites.'}
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                TEU 40FT HC
              </span>
              <span>CONT ID: MRD-849204-0</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2: FORKLIFT & YARD STAGING REVEAL (130vh – 240vh)           */}
        {/* ------------------------------------------------------------------ */}
        <section
          className={`fixed top-28 sm:top-36 left-6 sm:left-14 max-w-xl z-20 pointer-events-none transition-all duration-500 ${
            currentProgress >= 0.28 && currentProgress < 0.48
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-amber-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{lang === 'bg' ? 'ПРЕХОД КЪМ ТРАНЗИТ' : 'TRANSIT STAGING'}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black font-montserrat tracking-tight text-white leading-tight">
              {lang === 'bg' ? (
                <>
                  БЕЗ ПРЕКЪСВАНЕ
                  <br />
                  <span className="text-slate-300">НА ВЕРИГАТА.</span>
                </>
              ) : (
                <>
                  UNBROKEN FREIGHT
                  <br />
                  <span className="text-slate-300">CONTINUITY.</span>
                </>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-md">
              {lang === 'bg'
                ? 'Прецизно манипулиране и подготовка за директно сухопътно транспортиране. Контейнерът остава запечатан през целия маршрут.'
                : 'Rigorous terminal staging and container dispatch. The container remains sealed and monitored throughout the entire journey.'}
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3: HIGHWAY TRUCK TRANSIT & TRACKING (320vh – 550vh)        */}
        {/* ------------------------------------------------------------------ */}
        <section
          className={`fixed top-28 sm:top-36 left-6 sm:left-14 max-w-xl z-20 pointer-events-none transition-all duration-500 ${
            currentProgress >= 0.58 && currentProgress < 0.88
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-emerald-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{lang === 'bg' ? '02 / НАЗЕМЕН ТРАНСПОРТ' : '02 / CONTINENTAL ROADWAY'}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black font-montserrat tracking-tight text-white leading-tight">
              {lang === 'bg' ? (
                <>
                  ДИРЕКТЕН МАГИСТРАЛЕН
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-200 to-amber-200">
                    КОРИДОР ЕВРОПА.
                  </span>
                </>
              ) : (
                <>
                  DIRECT CONTINENTAL
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-200 to-amber-200">
                    FREIGHT CORRIDOR.
                  </span>
                </>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed max-w-md">
              {lang === 'bg'
                ? 'Същият контейнер потегля незабавно по магистралния маршрут до вашия обект в България. Пълен контрол на скоростта и графика.'
                : 'The verified container proceeds directly via dedicated highway routes to your Bulgarian and European facility. Zero transshipment delay.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
              <span className="bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                SCANIA R-SERIES + 3-AXLE CHASSIS
              </span>
              <span>PAYLOAD: 24,000 KG</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 4: HEROIC TRACKING CLIMAX & CTA (At the bottom of scroll)   */}
        {/* ------------------------------------------------------------------ */}
        <section
          className={`absolute bottom-16 inset-x-0 z-20 flex flex-col items-center justify-center text-center p-6 transition-all duration-500 ${
            currentProgress >= 0.88 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-sky-300">
              MERIDIANO LOGISTICS CONTINUUM
            </span>

            <h2 className="text-4xl sm:text-6xl font-black font-montserrat tracking-tight text-white leading-tight">
              {lang === 'bg' ? (
                <>
                  ОТ СВЕТА
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200">
                    ДО ВАС.
                  </span>
                </>
              ) : (
                <>
                  FROM THE WORLD
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200">
                    TO YOU.
                  </span>
                </>
              )}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-sans max-w-xl mx-auto">
              {lang === 'bg'
                ? 'Първият етап от пътуването е завършен. Контейнерът пътува директно по сухопътния коридор без прекъсване на веригата.'
                : 'The opening intermodal leg is accomplished. The container advances along continental freight lines under continuous authority.'}
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-3.5 rounded-full bg-white text-[#040711] font-montserrat font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors shadow-2xl"
              >
                {lang === 'bg' ? 'Повторете маршрута ↺' : 'Replay Transition ↺'}
              </button>

              {onExploreFullJourney && (
                <button
                  type="button"
                  onClick={onExploreFullJourney}
                  className="px-6 py-3.5 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 font-montserrat font-semibold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-xl"
                >
                  {lang === 'bg' ? 'Цял маршрут (Кораб & Самолет)' : 'Full Journey (Maritime & Air)'}
                </button>
              )}
            </div>
          </div>
        </section>

      </div>

    </div>
  );
};
