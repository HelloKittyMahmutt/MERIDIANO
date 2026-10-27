import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX, Globe, AlertCircle, RotateCcw } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';
import { getModelUrl } from '../../utils/modelUrl';
import { buildApprovedTruckAssembly, attachMeridianoWordmark, APPROVED_TRUCK_ASSEMBLY_CONFIG } from './truckAssemblyConfig';
import { FORKLIFT_CONFIG } from './forkliftConfig';
import { buildCalibratedAircraftRig, APPROVED_AIRCRAFT_CONFIG } from './aircraftConfig';
import { buildContainerHandlerRig, ContainerHandlerRig } from './containerHandlerRig';
import { applyMeridianoHandlerLivery } from './meridianoHandlerLivery';

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

// Subtle large-format concrete, without the conspicuous simulation grid.
const createConcreteApronTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8d9391';
  ctx.fillRect(0, 0, 1024, 1024);
  // Deterministic aggregate/grain; avoid random flicker across page loads.
  let seed = 14723;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pixels = ctx.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const n = (rand() - 0.5) * 26;
    pixels.data[i] = 139 + n;
    pixels.data[i + 1] = 145 + n;
    pixels.data[i + 2] = 146 + n;
  }
  ctx.putImageData(pixels, 0, 0);
  // Long, restrained expansion joints rather than dark square tiles.
  ctx.strokeStyle = 'rgba(48, 59, 63, 0.075)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 1024);
  ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
  ctx.moveTo(0, 0); ctx.lineTo(1024, 0);
  ctx.moveTo(0, 512); ctx.lineTo(1024, 512);
  ctx.stroke();
  // Soft rubber tire traces and localized concrete wear.
  for (let j = 0; j < 14; j++) {
    ctx.fillStyle = `rgba(51, 60, 61, ${0.008 + rand() * 0.018})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 1024, rand() * 1024, 25 + rand() * 95, 3 + rand() * 12, rand() * 6.28, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.anisotropy = 8;
  return tex;
};

// V19: Paint the fuselage skin, rather than adding billboard lettering.
// The source model's JAL markings are geometry/material details, not the red
// roundel texture. Sample the actual outer skin with rays, then lay a very thin
// opaque painted surface over the original airline markings. Both sides share
// the same readable, non-mirrored lettering and no floating signs are used.
function applyMeridianoAircraftLivery(raw: THREE.Group): void {
  raw.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const repaint = (material: THREE.Material): THREE.Material => {
      const name = material.name.toLowerCase();
      if (name === '0020_red') {
        return new THREE.MeshStandardMaterial({
          name: 'MERIDIANO navy tail and winglets',
          color: 0x102b4b, roughness: 0.56, metalness: 0.08,
          side: THREE.DoubleSide,
        });
      }
      if (name === 'japan') {
        return new THREE.MeshStandardMaterial({
          name: 'MERIDIANO clean white roundel',
          color: 0xf2f5f7, roughness: 0.62, metalness: 0.04,
          side: THREE.DoubleSide,
        });
      }
      return material;
    };
    if (Array.isArray(object.material)) object.material = object.material.map(repaint);
    else object.material = repaint(object.material);
  });

  // Aircraft skin in the source GLB is distributed across two fuselage meshes.
  // Use real ray intersections to follow its tapered nose and curved sides.
  raw.updateMatrixWorld(true);
  const fuselageMeshes: THREE.Mesh[] = [];
  raw.traverse((obj) => {
    if (obj instanceof THREE.Mesh && (obj.name === 'Object_5' || obj.name === 'Object_260')) {
      fuselageMeshes.push(obj);
    }
  });
  if (!fuselageMeshes.length) {
    console.warn('[MERIDIANO] Aircraft fuselage skin not found; no livery panels added.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // The solid paint masks the old airline wordmark, with restrained navy type.
  ctx.fillStyle = '#f1f4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#102b4b';
  ctx.font = '700 164px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MERIDIANO', 1024, 131, 1800);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({
    name: 'MERIDIANO conforming fuselage paint', map: texture,
    color: 0xffffff, roughness: 0.69, metalness: 0.03,
    side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });

  // Centerline follows the raised nose and descends toward the main cabin.
  const centerY = (z: number): number => {
    const points: Array<[number, number]> = [
      [-2830, 330], [-2700, 311], [-2500, 291],
      [-2380, 276], [-2200, 256], [-1950, 252], [-1600, 252],
    ];
    for (let i = 1; i < points.length; i++) {
      if (z <= points[i][0]) {
        const t = THREE.MathUtils.clamp((z - points[i - 1][0]) / (points[i][0] - points[i - 1][0]), 0, 1);
        return THREE.MathUtils.lerp(points[i - 1][1], points[i][1], t);
      }
    }
    return 252;
  };

  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const widthSegments = 72;
  const heightSegments = 12;
  const startZ = -2810;
  const endZ = -1570;

  for (const side of [-1, 1]) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let missingHits = 0;
    direction.set(-side, 0, 0);
    for (let iy = 0; iy <= heightSegments; iy++) {
      const v = iy / heightSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        const z = THREE.MathUtils.lerp(startZ, endZ, u);
        const y = centerY(z) + (v - 0.5) * 75;
        origin.set(987 + side * 1600, y, z);
        raycaster.set(origin, direction);
        raycaster.far = 1800;
        let hit = raycaster.intersectObjects(fuselageMeshes, false)[0];
        if (!hit) {
          // The CAD source has tiny discontinuities at some fuselage seams.
          // Sample an adjacent scanline rather than using a floating fallback.
          for (const offset of [-2, 2, -6, 6, -12, 12]) {
            origin.y = y + offset;
            raycaster.set(origin, direction);
            hit = raycaster.intersectObjects(fuselageMeshes, false)[0];
            if (hit) break;
          }
        }
        if (!hit) missingHits++;
        const x = hit ? hit.point.x + side * 1.7 : 987 + side * 113;
        positions.push(x, y, z);
        // Camera tracks from the negative-X side. On that side increasing Z
        // runs left-to-right in screen space, so do NOT reverse its UVs.
        uvs.push(side < 0 ? u : 1 - u, v);
        if (ix < widthSegments && iy < heightSegments) {
          const a = iy * (widthSegments + 1) + ix;
          const b = a + widthSegments + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    if (missingHits > (widthSegments + 1) * (heightSegments + 1) * 0.25) {
      console.warn('[MERIDIANO] Aircraft paint surface incomplete; skipping side', side);
      continue;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const paint = new THREE.Mesh(geometry, material);
    paint.name = side < 0 ? 'MERIDIANO port painted fuselage' : 'MERIDIANO starboard painted fuselage';
    paint.castShadow = false;
    paint.receiveShadow = false;
    raw.add(paint);
  }
}

// Layered atmospheric sky painted on a lightweight canvas texture.
const createPortSkyTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#304e6b');
  sky.addColorStop(0.42, '#7798ad');
  sky.addColorStop(0.75, '#c9c3b8');
  sky.addColorStop(1, '#ead0af');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1024, 512);
  let seed = 5319;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Diffuse cloud banks. Soft overlapping ellipses instead of sharp cartoon shapes.
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 85; i++) {
      const x = rand() * 1150 - 60;
      const y = 110 + layer * 73 + rand() * 90;
      const rx = 35 + rand() * 105;
      const ry = 7 + rand() * 23;
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, rx);
      const alpha = layer === 0 ? 0.13 : layer === 1 ? 0.18 : 0.12;
      cloud.addColorStop(0, `rgba(240,244,246,${alpha})`);
      cloud.addColorStop(0.55, `rgba(229,234,238,${alpha * 0.5})`);
      cloud.addColorStop(1, 'rgba(230,234,239,0)');
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
      ctx.translate(-x, -y);
      ctx.fillStyle = cloud;
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Deterministic multi-frequency harbor ripples. Keep this a normal map, not
// displaced geometry, so the sea remains lightweight on mobile GPUs.
const createWaterNormalTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(256, 256);
  const data = image.data;
  const heightAt = (x: number, y: number) =>
    Math.sin(y * 0.13 + Math.sin(x * 0.043) * 1.7) * 0.55 +
    Math.sin(y * 0.28 - x * 0.057) * 0.22 +
    Math.sin(x * 0.19 + y * 0.091) * 0.11 +
    Math.sin(x * 0.067 - y * 0.036) * 0.25;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const dx = heightAt(x + 1, y) - heightAt(x - 1, y);
      const dy = heightAt(x, y + 1) - heightAt(x, y - 1);
      const i = (y * 256 + x) * 4;
      data[i] = THREE.MathUtils.clamp(128 - dx * 88, 0, 255);
      data[i + 1] = THREE.MathUtils.clamp(128 - dy * 88, 0, 255);
      data[i + 2] = 250;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(34, 25);
  return texture;
};

// Muted slate-blue water with directional wavelets and occasional narrow
// sky highlights. No mirror-like black or uniformly striped tiling.
const createHarborWaterTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(512, 512);
  const data = image.data;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const broad = Math.sin(y * 0.071 + Math.sin(x * 0.025) * 2.2);
      const ripple = Math.sin(y * 0.32 - x * 0.046 + Math.sin(x * 0.09)) * 0.48;
      const cross = Math.sin(x * 0.085 + y * 0.048) * 0.35;
      const shimmer = Math.max(0, broad * 0.75 + ripple * 0.5 - 0.64);
      const variation = broad * 5 + ripple * 3.2 + cross * 2.7 + shimmer * 17;
      const i = (y * 512 + x) * 4;
      data[i] = THREE.MathUtils.clamp(49 + variation, 0, 255);
      data[i + 1] = THREE.MathUtils.clamp(91 + variation, 0, 255);
      data[i + 2] = THREE.MathUtils.clamp(113 + variation * 1.06, 0, 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 11);
  texture.anisotropy = 8;
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
    camPos: new THREE.Vector3(17.0, 12.5, 23.0),
    target: new THREE.Vector3(3.0, 1.8, 2.0),
    fov: 42,
  },
  {
    progress: 0.05,
    camPos: new THREE.Vector3(17.0, 12.5, 23.0),
    target: new THREE.Vector3(3.0, 1.8, 2.0),
    fov: 42,
  },
  {
    progress: 0.10,
    camPos: new THREE.Vector3(17.0, 12.5, 23.0),
    target: new THREE.Vector3(3.0, 1.8, 2.0),
    fov: 42,
  },
  {
    progress: 0.16,
    camPos: new THREE.Vector3(17.0, 12.5, 23.0),
    target: new THREE.Vector3(3.0, 1.8, 2.0),
    fov: 42,
  },

  // 2. TRUCK DEPARTURE & STRAIGHT TRAVEL (0.16 - 0.36)
  // Truck drives straight forward toward screen-right; cab leads movement
  {
    progress: 0.22,
    camPos: new THREE.Vector3(20.0, 9.0, 13.0),
    target: new THREE.Vector3(0.0, 1.8, -12.0),
    fov: 38,
  },
  {
    progress: 0.29,
    camPos: new THREE.Vector3(19.0, 7.0, -15.0),
    target: new THREE.Vector3(0.0, 1.8, -35.0),
    fov: 38,
  },
  {
    progress: 0.36,
    camPos: new THREE.Vector3(18.0, 6.0, -38.0),
    target: new THREE.Vector3(0.0, 1.8, -58.0),
    fov: 38,
  },

  // 3. PORT TERMINAL ARRIVAL & DOCKSIDE ROAD (0.36 - 0.52)
  // Truck arrives at terminal and stops behind container stacks
  // Container stacks serve as cinematic foreground transition wipe to ship
  {
    progress: 0.42,
    camPos: new THREE.Vector3(17.0, 6.0, -58.0),
    target: new THREE.Vector3(0.0, 2.0, -78.0),
    fov: 40,
  },
  {
    progress: 0.48,
    camPos: new THREE.Vector3(14.0, 7.5, -76.0),
    target: new THREE.Vector3(-5.0, 2.8, -106.0),
    fov: 41,
  },
  {
    progress: 0.52,
    camPos: new THREE.Vector3(15.0, 10.0, -104.0),
    target: new THREE.Vector3(-20.0, 4.0, -151.0),
    fov: 42,
  },

  // 4. Harbor-side vessel tracking. Look across the water, not through
  // the truck/ship hull or from the roadway directly below the ship.
  {
    progress: 0.58,
    camPos: new THREE.Vector3(13.0, 14.0, -140.0),
    target: new THREE.Vector3(-49.0, 5.5, -219.0),
    fov: 40,
  },
  {
    progress: 0.65,
    camPos: new THREE.Vector3(-2.0, 20.0, -168.0),
    target: new THREE.Vector3(-59.0, 5.0, -245.0),
    fov: 39,
  },
  {
    progress: 0.72,
    camPos: new THREE.Vector3(-22.0, 37.0, -199.0),
    target: new THREE.Vector3(-58.0, 9.0, -271.0),
    fov: 41,
  },

  // 5. AIRCRAFT: cinematic 3/4 side tracking, NOT the overhead/top-down view.
  // The actual tracking positions are tied to the aircraft below so it stays
  // in shot even when its speed changes; these keyframes provide the handoff.
  {
    progress: 0.77,
    camPos: new THREE.Vector3(-96.0, 150.0, -280.0),
    target: new THREE.Vector3(0, 124, -372.0),
    fov: 41,
  },
  {
    progress: 0.82,
    camPos: new THREE.Vector3(-98.0, 148.0, -305.0),
    target: new THREE.Vector3(0, 124, -395.0),
    fov: 40,
  },
  {
    progress: 0.88,
    camPos: new THREE.Vector3(-100.0, 149.0, -330.0),
    target: new THREE.Vector3(0, 124, -425.0),
    fov: 40,
  },

  // 6. Final fade: maintain a believable rear-quarter aircraft perspective.
  {
    progress: 0.94,
    camPos: new THREE.Vector3(-105.0, 151.0, -425.0),
    target: new THREE.Vector3(0, 124, -515.0),
    fov: 42,
  },
  {
    progress: 1.00,
    camPos: new THREE.Vector3(-114.0, 155.0, -575.0),
    target: new THREE.Vector3(0, 124, -665.0),
    fov: 44,
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
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);

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
    const mobileAtStart = window.innerWidth < 768;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const daylightSky = new THREE.Color(0xa8bac7);
    scene.background = daylightSky;
    scene.fog = new THREE.Fog(0xa8bac7, 95, 440);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(9.4, 3.8, 6.4);
    camera.lookAt(3.2, 1.8, 0.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobileAtStart,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileAtStart ? 1.25 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xd7e5f0, 0.72);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd4a4, 2.35);
    sunLight.position.set(45, 42, 28);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = mobileAtStart ? 1024 : 2048;
    sunLight.shadow.mapSize.height = mobileAtStart ? 1024 : 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 280;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    modelsRef.current.sunLight = sunLight;

    const fillLight = new THREE.DirectionalLight(0x94b4cf, 0.55);
    fillLight.position.set(-30, 20, -25);
    scene.add(fillLight);

    // 3. Sky Dome Mesh
    const skyGeo = new THREE.SphereGeometry(950, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const skyTexture = createPortSkyTexture();
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
    const apronGeo = new THREE.PlaneGeometry(100, 85);
    const apronMat = new THREE.MeshStandardMaterial({
      map: createConcreteApronTexture(),
      roughness: 0.91,
      metalness: 0.02,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(6, -0.012, -8);
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

    // Distant terminal buildings and gantry silhouettes. Kept away from the
    // active loading bay and below the main cinematic camera sightline.
    const terminalBackground = new THREE.Group();
    const warehouseMat = new THREE.MeshStandardMaterial({ color: 0x8797a0, roughness: 0.88 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a5a65, roughness: 0.8 });
    for (const [x, z, width, depth, height] of [
      [-29, -54, 21, 14, 7], [30, -70, 27, 17, 9], [-32, -98, 18, 14, 6], [30, -114, 22, 15, 8]
    ]) {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), warehouseMat);
      hall.position.set(x, height / 2 - 0.1, z);
      hall.castShadow = true; hall.receiveShadow = true;
      terminalBackground.add(hall);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.35, depth + 0.6), roofMat);
      roof.position.set(x, height + 0.1, z);
      terminalBackground.add(roof);
    }
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x536778, roughness: 0.68, metalness: 0.38 });
    for (const x of [-48, 48]) {
      const z = -125;
      const gantry = new THREE.Group();
      for (const offset of [-8, 8]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 23, 0.8), gantryMat);
        leg.position.set(offset, 11.5, 0);
        gantry.add(leg);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 1.1, 1.1), gantryMat);
      beam.position.set(0, 22.5, 0);
      gantry.add(beam);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.6), gantryMat);
      upper.position.set(0, 25, 0);
      gantry.add(upper);
      gantry.position.set(x, 0, z);
      terminalBackground.add(gantry);
    }
    // Background industrial silhouettes sit OUTSIDE the working loading bay.
    // Their small details break up the former blank-box appearance without
    // adding expensive imported meshes or interfering with the reach stacker.
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x435462, roughness: 0.74, metalness: 0.24 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x344f61, roughness: 0.32, metalness: 0.12 });
    for (const [x, z, width, depth, height] of [
      [-29, -54, 21, 14, 7], [30, -70, 27, 17, 9], [-32, -98, 18, 14, 6], [30, -114, 22, 15, 8]
    ]) {
      // Warehouse doors, roofline flashing and loading canopies.
      for (let i = -1; i <= 1; i++) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, height * 0.59, 0.08), glassMat);
        door.position.set(x + i * width * 0.265, height * 0.30, z + depth * 0.505);
        terminalBackground.add(door);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.21, 0.13, 0.25), trimMat);
        lintel.position.set(door.position.x, height * 0.61, door.position.z);
        terminalBackground.add(lintel);
      }
      const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 1, 0.18, 0.25), trimMat);
      roofTrim.position.set(x, height + 0.24, z + depth / 2);
      terminalBackground.add(roofTrim);
    }
    // High-mast yard lights placed along the perimeter, never inside the loading path.
    const lampSteel = new THREE.MeshStandardMaterial({ color: 0x65747b, roughness: 0.54, metalness: 0.55 });
    const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe5b5 });
    for (const [x, z] of [[-37, -16], [40, -25], [-38, -72], [39, -100], [-36, -133]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, 17, 7), lampSteel);
      pole.position.set(x, 8.5, z);
      terminalBackground.add(pole);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.2), lampSteel);
      crossbar.position.set(x, 17, z);
      terminalBackground.add(crossbar);
      for (const dx of [-1.15, 1.15]) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.09, 0.42), lampGlow);
        head.position.set(x + dx, 16.86, z);
        terminalBackground.add(head);
      }
    }
    // Real-world scale cues: low dock bollards and concrete barriers along
    // the distant waterfront, leaving the foreground staging bay clear.
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x9ca4a2, roughness: 0.93 });
    for (let i = 0; i < 16; i++) {
      const x = -46 + i * 6;
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 0.7), barrierMat);
      barrier.position.set(x, 0.37, -139);
      terminalBackground.add(barrier);
    }
    scene.add(terminalBackground);

    // Low, continuous port-grade terrain beneath the terminal and road.
    // It ends at the quay: no concrete or terrain under the ocean/ship.
    const harborLand = new THREE.Mesh(
      new THREE.PlaneGeometry(210, 168),
      new THREE.MeshStandardMaterial({
        map: createConcreteApronTexture(), roughness: 0.99, metalness: 0,
        color: 0xadb3ac,
      }),
    );
    harborLand.rotation.x = -Math.PI / 2;
    harborLand.position.set(0, -0.070, -58.0); // Z from +26 to -142.
    harborLand.receiveShadow = true;
    scene.add(harborLand);

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
    // Continuous shoulders visually join the apron to the access road.
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x777f81, roughness: 0.96 });
    for (const x of [-11.5, 11.5]) {
      const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(7, 125), shoulderMat);
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(x, -0.028, -85);
      shoulder.receiveShadow = true;
      roadGroup.add(shoulder);
    }
    // Continuous crash barriers, dark asphalt shoulders and understated
    // roadside vegetation. Keep the camera corridor completely unobstructed.
    const railMat = new THREE.MeshStandardMaterial({ color: 0xaab3b7, metalness: 0.65, roughness: 0.38 });
    const railPostMat = new THREE.MeshStandardMaterial({ color: 0x59656b, metalness: 0.48, roughness: 0.57 });
    for (const side of [-1, 1]) {
      const x = side * 8.35;
      for (const y of [0.62, 0.93]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 120), railMat);
        rail.position.set(x, y, -84);
        roadGroup.add(rail);
      }
      for (let z = -26; z > -143; z -= 5) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.12, 0.18), railPostMat);
        post.position.set(x, 0.56, z);
        roadGroup.add(post);
      }
    }
    // Industrial access-road margins: low ground, not giant empty slabs.
    const vergeMat = new THREE.MeshStandardMaterial({ color: 0x687268, roughness: 0.98 });
    for (const x of [-17.7, 17.7]) {
      const verge = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 115), vergeMat);
      verge.rotation.x = -Math.PI / 2;
      verge.position.set(x, -0.047, -83);
      verge.receiveShadow = true;
      roadGroup.add(verge);
    }
    // Restrained roadside lamps and directional posts outside the road.
    for (const side of [-1, 1]) {
      for (const z of [-45, -80, -115]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 6), railPostMat);
        post.position.set(side * 13.7, 4, z);
        roadGroup.add(post);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), railMat);
        arm.position.set(side * 12.85, 7.9, z);
        roadGroup.add(arm);
        const luminaire = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.45), lampGlow);
        luminaire.position.set(side * 12.0, 7.82, z);
        roadGroup.add(luminaire);
      }
    }
    scene.add(roadGroup);

    // 6. Harbor Quay & Deep Ocean Surface (Z: -140 to -900)
    const oceanGeo = new THREE.PlaneGeometry(1600, 1200, 64, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
      map: createHarborWaterTexture(),
      color: 0xc5dce6,
      roughness: 0.49,
      metalness: 0.02,
      normalMap: createWaterNormalTexture(),
      normalScale: new THREE.Vector2(0.19, 0.19),
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
    const craneMatOrange = new THREE.MeshStandardMaterial({ color: 0xb75b32, roughness: 0.68, metalness: 0.18 });
    for (let i = 0; i < 3; i++) {
      const cX = -112 - i * 39;
      const cZ = -206 - i * 26;
      const craneTower = new THREE.Mesh(new THREE.BoxGeometry(3.0, 29, 3.0), craneMatOrange);
      craneTower.position.set(cX, 12, cZ);
      craneTower.castShadow = true;
      craneGroup.add(craneTower);

      const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(26, 2.4, 2.4), craneMatOrange);
      craneBoom.position.set(cX + 10, 25, cZ);
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
        applyMeridianoHandlerLivery(raw);
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
      attachMeridianoWordmark(stagingContainer);
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

        // The raw model is about 91m long; use a ~150m ship so it reads as
        // a vessel at cinematic distance, not a structure floating over road.
        const shipLength = Math.max(size.x, size.y, size.z);
        const scale = 150.0 / shipLength;
        shipGroup.scale.setScalar(scale);

        // Keep the entire hull beyond the quay at Z=-145. Sink its keel
        // around six metres below harbor water (surface Y=-3.2).
        shipGroup.position.set(-58.0, -9.2, -241.0);
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
        // The shipped GLB root is already Y-up: its world bounds are
        // X=-316..2289 (wings), Y=0..770 (height), Z=-3026..-235 (body).
        // The old -90° X correction pitched its fuselage into a vertical dive.
        // Yaw 180° reverses +Z nose into our -Z travel direction, level.
        const levelFlightConfig = {
          ...APPROVED_AIRCRAFT_CONFIG,
          orientationCorrection: {
            ...APPROVED_AIRCRAFT_CONFIG.orientationCorrection,
            rotationDeg: [0, 180, 0] as [number, number, number],
            rotationRad: [0, Math.PI, 0] as [number, number, number],
            rawCenterOffset: [-986.40, -384.98, 1630.68] as [number, number, number],
          },
        };
        applyMeridianoAircraftLivery(raw);
        const { rig } = buildCalibratedAircraftRig(raw, levelFlightConfig);
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
      // Keep the aircraft visibly horizontal in frame with a rear/side chase.
      // The former nearly overhead camera deliberately framed the airplane
      // nose-to-tail vertically on screen. Only override AFTER vessel scene.
      const planeToFollow = modelsRef.current.aircraftRig;
      let cameraFov = fov;
      if (p >= 0.735 && planeToFollow) {
        const follow = THREE.MathUtils.smoothstep(p, 0.735, 0.805);
        const plane = planeToFollow.position;
        const chasePos = new THREE.Vector3(plane.x - 115, plane.y + 22, plane.z + 41);
        const chaseTarget = new THREE.Vector3(plane.x, plane.y + 1, plane.z - 20);
        pos.lerp(chasePos, follow);
        target.lerp(chaseTarget, follow);
        cameraFov = THREE.MathUtils.lerp(fov, 39, follow);
      }
      // Portrait screens need a wider vertical field of view so the machine,
      // vessel and aircraft stay inside the visible frame without changing
      // any desktop choreography or the actual model animation.
      const portrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      if (portrait) {
        const portraitFactor = THREE.MathUtils.clamp(window.innerHeight / Math.max(window.innerWidth, 1), 1.35, 2.5);
        cameraFov = Math.min(76, cameraFov + (portraitFactor - 1) * 22);
        // Keep the camera farther from large port objects in narrow viewports.
        pos.sub(target).multiplyScalar(1.12).add(target);
      }
      if (cameraRef.current) {
        cameraRef.current.position.copy(pos);
        cameraRef.current.lookAt(target);
        if (Math.abs(cameraRef.current.fov - cameraFov) > .01) {
          cameraRef.current.fov = cameraFov;
          cameraRef.current.updateProjectionMatrix();
        }
      }

      // 2. Atmospheric Distance Fog & Sky Color Progression
      if (sceneRef.current && sceneRef.current.fog instanceof THREE.Fog) {
        const fog = sceneRef.current.fog;
        const groundSky = new THREE.Color(0xa8bac7);
        const hazeSky = new THREE.Color(0xdce6f0);
        const stratosphericSky = new THREE.Color(0xb2cae0);

        if (p < 0.65) {
          fog.near = 95;
          fog.far = 440;
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

      // Small-scale ripples drift across the surface at a measured rate.
      const water = modelsRef.current.oceanMesh;
      if (water) {
        const waterMaterial = water.material as THREE.MeshStandardMaterial;
        const t = performance.now() * .000012;
        if (waterMaterial.normalMap) waterMaterial.normalMap.offset.set(t * 1.1, t * .66);
        if (waterMaterial.map) waterMaterial.map.offset.set(t * .12, -t * .045);
      }

      // 3. Stage 1: Container Loading Operation by Reach Stacker (0.00 -> 0.16)
      const truckAssembly = modelsRef.current.truckAssembly;
      const truckTravelRoot = modelsRef.current.truckTravelRoot;
      const stagingContainer = modelsRef.current.stagingContainer;
      const handlerRig = modelsRef.current.containerHandlerRig;

      if (stagingContainer && truckAssembly) {
        const truckCont = truckAssembly.getObjectByName('Container');
        // Match the real receiver geometry, rather than assuming the container
        // belongs at an arbitrary world X/Y/Z. This target is stable while the
        // truck moves because it is measured with TruckTravelRoot at rest.
        if (!stagingContainer.userData.loadingTarget && truckCont && truckTravelRoot) {
          const previousTruckPosition = truckTravelRoot.position.clone();
          const previousStagingPosition = stagingContainer.position.clone();
          truckTravelRoot.position.set(0, 0, 0);
          stagingContainer.position.set(0, 0, 0);
          truckTravelRoot.updateMatrixWorld(true);
          stagingContainer.updateMatrixWorld(true);
          const receiver = new THREE.Box3().setFromObject(truckCont);
          const staged = new THREE.Box3().setFromObject(stagingContainer);
          if (!receiver.isEmpty() && !staged.isEmpty()) {
            const receiverCenter = receiver.getCenter(new THREE.Vector3());
            const stagedCenter = staged.getCenter(new THREE.Vector3());
            stagingContainer.userData.loadingTarget = new THREE.Vector3(
              receiverCenter.x - stagedCenter.x,
              receiver.min.y - staged.min.y,
              receiverCenter.z - stagedCenter.z
            );
          }
          stagingContainer.position.copy(previousStagingPosition);
          truckTravelRoot.position.copy(previousTruckPosition);
          truckTravelRoot.updateMatrixWorld(true);
          stagingContainer.updateMatrixWorld(true);
        }
        const receiverTarget: THREE.Vector3 = stagingContainer.userData.loadingTarget
          ?? new THREE.Vector3(0, 1.41, 4.9);
        const loadingZ = receiverTarget.z;
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
            stackerX = THREE.MathUtils.lerp(5.5, receiverTarget.x, s5);
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
            stackerX = receiverTarget.x;
            contX = receiverTarget.x;
            contY = THREE.MathUtils.lerp(3.20, receiverTarget.y, s6);
            spreaderY = contY + 0.367;
            boomElevation = THREE.MathUtils.lerp(0.44, 0.16, s6);
            boomExtension = THREE.MathUtils.lerp(1.8, 0.8, s6);
            twistlocksEngaged = true;
          }
          // Stage 7: Release container
          else if (loadT < 0.94) {
            const t7 = (loadT - 0.88) / (0.94 - 0.88);
            stackerX = receiverTarget.x;
            contX = receiverTarget.x;
            contY = receiverTarget.y;
            spreaderY = THREE.MathUtils.lerp(1.777, 2.15, t7);
            boomElevation = THREE.MathUtils.lerp(0.16, 0.22, t7);
            boomExtension = 0.8;
            twistlocksEngaged = false;
          }
          // Stage 8: Reach stacker withdraws
          else {
            const t8 = (loadT - 0.94) / (1.00 - 0.94);
            stackerX = THREE.MathUtils.lerp(receiverTarget.x, receiverTarget.x + 3.8, 0.5 - 0.5 * Math.cos(t8 * Math.PI));
            contX = receiverTarget.x;
            contY = receiverTarget.y;
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

          stagingContainer.position.set(contX, contY, loadingZ);
          stagingContainer.visible = true;
          if (truckCont) truckCont.visible = false;

          if (handlerRig) {
            // Align the center of the *actual* spreader to the container center,
            // while retaining the approach/withdrawal offset along X.
            handlerRig.alignSpreaderTo(contX, loadingZ, stackerX - contX);
            handlerRig.root.position.y = 0;
            handlerRig.setBoomPose(boomElevation, boomExtension);
            handlerRig.setSpreaderPose(new THREE.Vector3(contX, spreaderY, loadingZ), twistlocksEngaged);
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
              const withdrawX = THREE.MathUtils.lerp(receiverTarget.x + 3.8, receiverTarget.x + 12.0, smoothWithdraw);
              handlerRig.alignSpreaderTo(receiverTarget.x, loadingZ, withdrawX - receiverTarget.x);
              handlerRig.setBoomPose(0.15, 0.5);
              handlerRig.setSpreaderPose(new THREE.Vector3(withdrawX, receiverTarget.y + 3.0, loadingZ), false);
              handlerRig.setWheelTravel(8.5 + withdrawX);
            } else {
              handlerRig.alignSpreaderTo(receiverTarget.x, loadingZ, 12.0);
              handlerRig.setBoomPose(0.15, 0.5);
              handlerRig.setSpreaderPose(new THREE.Vector3(receiverTarget.x + 12.0, receiverTarget.y + 3.0, loadingZ), false);
              handlerRig.setWheelTravel(8.5 + receiverTarget.x + 12.0);
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
          const acceleration = driveT < 0.12
            ? (driveT * driveT) / 0.12
            : (0.12 + 2 * (driveT - 0.12));
          const normalizedTravel = acceleration / (0.12 + 2 * 0.88);
          const distanceTravelled = normalizedTravel * 135.0;
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
          const shipAdvance = shipT * 17.0;
          shipGroup.position.z = -241.0 - shipAdvance;
          // Subtle waterborne roll. Keep the model level on average.
          shipGroup.rotation.z = Math.sin(p * 17.0) * 0.0025;
          shipGroup.position.y = -9.2 + Math.sin(p * 27.0) * .065;
        } else if (p < 0.52) {
          shipGroup.position.set(-58.0, -9.2, -241.0);
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
      if (shipGroup) shipGroup.visible = p >= 0.38 && p <= 0.85;
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
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2));
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
      <header className="fixed top-0 left-0 right-0 z-40 px-3 py-3 sm:px-6 sm:py-5 flex items-center justify-between pointer-events-auto backdrop-blur-[2px]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-montserrat font-black text-sm sm:text-xl tracking-[0.14em] sm:tracking-[0.28em] text-white">
              MERIDIANO
            </span>
            <span className="hidden sm:block text-[9px] uppercase tracking-[0.35em] text-blue-400/90 font-mono">
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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Asset Audit / Technical Limitation Modal Button */}
          <button
            onClick={() => setShowTechnicalNote(!showTechnicalNote)}
            title="Inspect 3D Model Technical Specifications & Audit"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d131f]/80 border border-amber-500/30 hover:border-amber-400 text-amber-300/90 text-xs font-mono transition-all backdrop-blur-md"
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
      <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between px-4 pt-20 pb-10 sm:p-8 md:p-16">
        {/* TOP STATUS */}
        <div className="flex justify-between items-start pt-2 sm:pt-14">
          <div className="text-[10px] font-mono tracking-[0.25em] text-blue-400/80 uppercase">
            {currentProgress < 0.16 && '01 / LOADING'}
            {currentProgress >= 0.16 && currentProgress < 0.36 && '02 / ROAD'}
            {currentProgress >= 0.36 && currentProgress < 0.52 && '03 / HARBOR'}
            {currentProgress >= 0.52 && currentProgress < 0.72 && '04 / OCEAN'}
            {currentProgress >= 0.72 && currentProgress < 0.88 && '05 / AIR'}
            {currentProgress >= 0.88 && 'MERIDIANO / GLOBAL REACH'}
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            {Math.round(currentProgress * 100)}%{isMobile ? '' : ' COMPLETE'}
          </div>
        </div>

        {/* V14 / ONE STORY BEAT AT A TIME. Fade captions away around camera handoffs. */}
        <div className="max-w-[min(90vw,520px)]">
          {(() => {
            const beats = [
              { start: 0, end: .16, label: ['01 / ТОВАРЕНЕ', '01 / LOADING'], title: ['ВСИЧКО ЗАПОЧВА ТУК.', 'EVERY JOURNEY BEGINS HERE.'], line: ['Прецизност от първото движение.', 'Precision from the first move.'] },
              { start: .16, end: .36, label: ['02 / СУХОПЪТЕН ТРАНСПОРТ', '02 / ROAD'], title: ['ПО ПЪТЯ НАПРЕД.', 'MOVING FORWARD.'], line: ['Свързваме товара с възможностите.', 'Connecting cargo to opportunity.'] },
              { start: .36, end: .52, label: ['03 / ПРИСТАНИЩЕ', '03 / HARBOR'], title: ['БЕЗ ГРАНИЦИ.', 'BEYOND BORDERS.'], line: ['От пътя към световните маршрути.', 'From the road to global routes.'] },
              { start: .52, end: .72, label: ['04 / МОРСКИ ТРАНСПОРТ', '04 / OCEAN'], title: ['ПРЕЗ ОКЕАНИ.', 'ACROSS OCEANS.'], line: ['Светът е по-близо, отколкото изглежда.', 'The world is closer than it seems.'] },
              { start: .72, end: .88, label: ['05 / ВЪЗДУШЕН ТРАНСПОРТ', '05 / AIR'], title: ['ОТВЪД ХОРИЗОНТА.', 'BEYOND THE HORIZON.'], line: ['Когато времето има значение.', 'When every hour matters.'] },
            ];
            const beat = beats.find(b => currentProgress >= b.start && currentProgress < b.end);
            if (!beat) return null;
            const duration = beat.end - beat.start;
            const local = (currentProgress - beat.start) / duration;
            // Hold a clean, text-free frame before the next cinematic shot.
            const intro = beat.start === 0 ? 1 : THREE.MathUtils.smoothstep(local, .06, .20);
            const outro = 1 - THREE.MathUtils.smoothstep(local, .70, .92);
            const visibility = Math.max(0, Math.min(intro, outro));
            const languageIndex = lang === 'bg' ? 0 : 1;
            return (
              <div style={{ opacity: visibility, transform: `translate3d(0, ${12 * (1 - visibility)}px, 0)`, willChange: 'opacity, transform' }}
                className="border-l-2 border-blue-400/70 pl-3 sm:pl-5 md:pl-7 drop-shadow-lg">
                <div className="font-mono text-[10px] md:text-xs tracking-[0.25em] text-blue-200/90 uppercase mb-3">{beat.label[languageIndex]}</div>
                <h1 className="font-montserrat font-bold text-[clamp(1.35rem,5.5vw,3.4rem)] leading-[1.08] tracking-[-0.025em] text-white uppercase mb-3">{beat.title[languageIndex]}</h1>
                <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">{beat.line[languageIndex]}</p>
              </div>
            );
          })()}
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
            <h2 className="font-montserrat font-black text-[clamp(2rem,9vw,4.5rem)] md:text-6xl lg:text-7xl tracking-tighter text-white uppercase leading-[0.95] mb-4">
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
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 pointer-events-auto">
              <button
                onClick={handleReplay}
                className="px-4 sm:px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs tracking-widest uppercase transition-all shadow-lg flex items-center gap-2"
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
                  : 'SCROLL TO FOLLOW THE JOURNEY'
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
