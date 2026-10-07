import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX, Wrench } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';
import { getModelUrl } from '../../utils/modelUrl';

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
    // Establishing composition on the factory loading bay floor
    {
      progress: 0.0,
      camPos: new THREE.Vector3(5.2, 1.8, 6.4),
      target: new THREE.Vector3(0.0, 1.4, 0.6),
      fov: 38,
    },
    {
      progress: 0.08,
      camPos: new THREE.Vector3(3.6, 1.6, 4.8),
      target: new THREE.Vector3(-0.4, 1.5, 0.4),
      fov: 38,
    },
    {
      progress: 0.14,
      camPos: new THREE.Vector3(2.2, 1.8, 3.6),
      target: new THREE.Vector3(-0.8, 1.6, 0.2),
      fov: 38,
    },

    // --- STAGE 2: CONTAINER TRANSITION (0.14 - 0.24) ---
    // Smoothly tracks along the navy container surface; safe distance, no clipping
    {
      progress: 0.19,
      camPos: new THREE.Vector3(0.4, 2.0, 3.2),
      target: new THREE.Vector3(-1.0, 1.8, 0.0),
      fov: 38,
    },
    {
      progress: 0.24,
      camPos: new THREE.Vector3(-0.6, 2.2, 3.4),
      target: new THREE.Vector3(-1.4, 1.8, -1.0),
      fov: 40,
    },

    // --- STAGE 3: TRUCK + CHASSIS + CONTAINER (0.24 - 0.44) ---
    // CRITICAL: Establishing 3/4 view of the COMPLETE TRUCK ASSEMBLY on the highway
    // Vehicle occupies ~65% of viewport width. Recognizable: CAB + WHEELS + CHASSIS + CONTAINER
    {
      progress: 0.28,
      camPos: new THREE.Vector3(15.5, 3.6, -18.0),
      target: new THREE.Vector3(0.0, 2.0, -32.0),
      fov: 40,
    },
    {
      progress: 0.35,
      camPos: new THREE.Vector3(12.5, 3.0, -28.0),
      target: new THREE.Vector3(0.0, 2.2, -38.0),
      fov: 38,
    },
    {
      progress: 0.44,
      camPos: new THREE.Vector3(14.0, 3.4, -42.0),
      target: new THREE.Vector3(0.0, 2.4, -52.0),
      fov: 40,
    },

    // --- STAGE 4: OCEAN + CONTAINER SHIP (0.44 - 0.64) ---
    // Start with camera near water level. Show massive ship hull cutting through the sea
    {
      progress: 0.48,
      camPos: new THREE.Vector3(30.0, 3.2, -108.0),
      target: new THREE.Vector3(-6.0, 13.0, -145.0),
      fov: 44,
    },
    {
      progress: 0.56,
      camPos: new THREE.Vector3(38.0, 6.5, -132.0),
      target: new THREE.Vector3(-8.0, 16.0, -158.0),
      fov: 42,
    },
    {
      progress: 0.64,
      camPos: new THREE.Vector3(44.0, 12.0, -155.0),
      target: new THREE.Vector3(-10.0, 20.0, -172.0),
      fov: 42,
    },

    // --- STAGE 5: CAMERA ASCENDS FROM OCEAN (0.64 - 0.74) ---
    // Ocean recedes below, atmospheric depth and horizon expand
    {
      progress: 0.69,
      camPos: new THREE.Vector3(26.0, 38.0, -185.0),
      target: new THREE.Vector3(-4.0, 14.0, -205.0),
      fov: 46,
    },
    {
      progress: 0.74,
      camPos: new THREE.Vector3(12.0, 68.0, -215.0),
      target: new THREE.Vector3(0.0, 45.0, -245.0),
      fov: 48,
    },

    // --- STAGE 6: CLOUD TRANSITION (0.74 - 0.82) ---
    // Soft flight through the atmospheric cloud stratum
    {
      progress: 0.78,
      camPos: new THREE.Vector3(4.0, 92.0, -240.0),
      target: new THREE.Vector3(0.0, 94.0, -275.0),
      fov: 50,
    },
    {
      progress: 0.82,
      camPos: new THREE.Vector3(-6.0, 112.0, -270.0),
      target: new THREE.Vector3(0.0, 114.0, -305.0),
      fov: 46,
    },

    // --- STAGE 7: CARGO PLANE (0.82 - 0.94) ---
    // CRITICAL: Cinematic 3/4 tracking view (NOT from underneath!)
    // Camera is to the side, slightly behind, slightly below: fuselage, wing, engine, tail fully visible
    {
      progress: 0.86,
      camPos: new THREE.Vector3(-22.0, 114.0, -295.0),
      target: new THREE.Vector3(1.5, 118.0, -330.0),
      fov: 38,
    },
    {
      progress: 0.91,
      camPos: new THREE.Vector3(-16.0, 116.5, -318.0),
      target: new THREE.Vector3(2.0, 119.0, -345.0),
      fov: 40,
    },

    // --- STAGE 8: FINAL MERIDIANO STATEMENT (0.94 - 1.00) ---
    // Aircraft cruises into the distance, negative space opens up for statement
    {
      progress: 0.96,
      camPos: new THREE.Vector3(-4.0, 118.0, -342.0),
      target: new THREE.Vector3(2.0, 120.0, -395.0),
      fov: 42,
    },
    {
      progress: 1.0,
      camPos: new THREE.Vector3(0.0, 119.0, -355.0),
      target: new THREE.Vector3(0.0, 121.0, -425.0),
      fov: 44,
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

    // A. Full-Screen Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Atmospheric midnight blue
    scene.fog = new THREE.FogExp2(0x060913, 0.0032);
    sceneRef.current = scene;

    // B. Camera - Near plane 0.2 prevents geometric clipping
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.2, 3500);
    const initialFrame = sampleTimeline(0);
    camera.position.copy(initialFrame.pos);
    camera.lookAt(initialFrame.target);
    cameraRef.current = camera;

    // C. WebGL Renderer with High-Precision ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05; // Balanced exposure to prevent washed-out surfaces
    rendererRef.current = renderer;

    // D. Balanced Cinematic Lighting (Preserves PBR materials and contrast)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    sunLight.position.set(35, 60, 25);
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x60a5fa, 0.85);
    skyFill.position.set(-25, 30, -35);
    scene.add(skyFill);

    // ========================================================================
    // E. ENVIRONMENT 1: FACTORY STAGING BAY (Z: 10 to -10)
    // ========================================================================
    const factoryFloorGeo = new THREE.PlaneGeometry(60, 40);
    const factoryFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15,
    });
    const factoryFloor = new THREE.Mesh(factoryFloorGeo, factoryFloorMat);
    factoryFloor.rotation.x = -Math.PI / 2;
    factoryFloor.position.set(0, 0, 2);
    scene.add(factoryFloor);

    // Factory Safety Guidance Lines
    const lineGeo = new THREE.PlaneGeometry(40, 0.3);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const safetyLine = new THREE.Mesh(lineGeo, lineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(0, 0.015, 3.6);
    scene.add(safetyLine);

    // ========================================================================
    // E. ENVIRONMENT 2: WIDE READABLE ASPHALT HIGHWAY (Z: -10 to -85)
    // The truck must visibly sit ON a real road with curbs and expansive terrain
    // ========================================================================
    const roadGroup = new THREE.Group();

    // 1. Wide Asphalt Highway (Width: 16m)
    const roadGeo = new THREE.PlaneGeometry(16, 100);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x181e28, // Deep authentic asphalt
      roughness: 0.82,
      metalness: 0.15,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -35);
    roadGroup.add(roadMesh);

    // 2. Concrete Road Shoulders / Curbs (Left & Right)
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.88,
    });
    const curbL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 100), curbMat);
    curbL.rotation.x = -Math.PI / 2;
    curbL.position.set(-8.8, 0.02, -35);
    roadGroup.add(curbL);

    const curbR = curbL.clone();
    curbR.position.x = 8.8;
    roadGroup.add(curbR);

    // 3. Solid White Shoulder Lines
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const shoulderLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 100), whiteLineMat);
    shoulderLineL.rotation.x = -Math.PI / 2;
    shoulderLineL.position.set(-6.5, 0.03, -35);
    roadGroup.add(shoulderLineL);

    const shoulderLineR = shoulderLineL.clone();
    shoulderLineR.position.x = 6.5;
    roadGroup.add(shoulderLineR);

    // 4. Subtle Dashed Center Line
    for (let z = 12; z >= -82; z -= 6.5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 3.4), whiteLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.035, z);
      roadGroup.add(dash);
    }

    // 5. Vast Surrounding Terrain (Expands 450m so road is in a real environment)
    const terrainGeo = new THREE.PlaneGeometry(450, 180);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      roughness: 0.95,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.05, -35);
    roadGroup.add(terrain);

    scene.add(roadGroup);
    modelsRef.current.roadGroup = roadGroup;

    // ========================================================================
    // E. ENVIRONMENT 3: VAST OCEAN WATER SURFACE (Z: -80 to -300)
    // Sits large enough to reach the horizon (1500m x 1500m)
    // ========================================================================
    const oceanGeo = new THREE.PlaneGeometry(1500, 1500, 48, 48);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x04182b, // Deep oceanic navy
      roughness: 0.2,
      metalness: 0.78,
      flatShading: true,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, 0, -180);
    scene.add(oceanMesh);
    modelsRef.current.oceanMesh = oceanMesh;

    // ========================================================================
    // E. ENVIRONMENT 4: PROCEDURAL CLOUD LAYER (Y: 85 to 110, Z: -220 to -380)
    // ========================================================================
    const cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x243247,
      roughness: 0.95,
      transparent: true,
      opacity: 0.6,
    });

    for (let c = 0; c < 50; c++) {
      const radius = 10 + Math.random() * 16;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 220,
        90 + (Math.random() - 0.5) * 18,
        -220 - Math.random() * 150
      );
      puff.scale.set(1.9, 0.45, 1.4);
      cloudsGroup.add(puff);
    }
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

    // Helper: Material application for dark steel container chassis
    const applyChassisDarkSteelMaterial = (group: THREE.Group) => {
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x1f242d, // Dark graphite / industrial steel
            roughness: 0.38,
            metalness: 0.65,
            side: THREE.DoubleSide,
          });
        }
      });
    };

    // Helper: Ensure truck finishes are premium dark graphite without blown-out whites
    const tuneTruckMaterials = (group: THREE.Group) => {
      group.traverse((c) => {
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
    };

    // ------------------------------------------------------------------------
    // 1. FORKLIFT MODEL (Stage 1: Factory Staging Bay)
    // ------------------------------------------------------------------------
    console.log('LOADING FORKLIFT');
    loadGLTF(loader, getModelUrl('forklift.glb'))
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center X & Z, ground wheels on Y = 0
        raw.position.set(-center.x, -box.min.y, -center.z);

        const forkGroup = new THREE.Group();
        forkGroup.add(raw);
        // Realistic ~3.8m length
        const scale = 3.8 / Math.max(size.x, size.y, size.z);
        forkGroup.scale.setScalar(scale);

        // Position on factory dock facing container
        forkGroup.position.set(1.5, 0, 1.8);
        forkGroup.rotation.y = -Math.PI / 2 + 0.35;
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
    // ------------------------------------------------------------------------
    Promise.all([
      loadGLTF(loader, getModelUrl('truck.glb')),
      loadGLTF(loader, getModelUrl('chassis.glb')),
      loadGLTF(loader, getModelUrl('container.glb')),
    ])
      .then(([rawTruck, rawChassis, rawCont]) => {
        const truckAssembly = new THREE.Group();
        truckAssembly.name = 'TruckAssembly';

        // A. Tractor Cab
        const tBox = new THREE.Box3().setFromObject(rawTruck);
        const tCenter = tBox.getCenter(new THREE.Vector3());
        // Align center X=0, ground wheels at Y=0
        rawTruck.position.set(-tCenter.x, -tBox.min.y, 0);

        const truckSub = new THREE.Group();
        truckSub.add(rawTruck);
        // Real-world scale factor 0.1212 gives MAN TGX exact 2.55m width, 3.17m height, 4.65m length
        truckSub.scale.setScalar(0.1212);
        tuneTruckMaterials(truckSub);
        truckAssembly.add(truckSub);

        // Headlight Beams (soft road illumination)
        const beamGeo = new THREE.ConeGeometry(1.2, 10, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0.12,
        });
        const beamL = new THREE.Mesh(beamGeo, beamMat);
        beamL.rotation.x = Math.PI / 2;
        beamL.position.set(-0.85, 0.85, 7.5);
        truckAssembly.add(beamL);

        const beamR = beamL.clone();
        beamR.position.x = 0.85;
        truckAssembly.add(beamR);

        // B. Separate Chassis Trailer
        const chBox = new THREE.Box3().setFromObject(rawChassis);
        const chCenter = chBox.getCenter(new THREE.Vector3());
        // Center width Z=0, ground wheels at Y=0
        rawChassis.position.set(0, -chBox.min.y, -chCenter.z);

        const chassisSub = new THREE.Group();
        chassisSub.add(rawChassis);
        // Rotate so chassis length is along Z, front kingpin towards +Z
        chassisSub.rotation.y = Math.PI / 2;
        // Connect fifth-wheel kingpin directly behind tractor at Z = -2.38m
        chassisSub.position.set(0, 0, -2.38);
        applyChassisDarkSteelMaterial(chassisSub);
        truckAssembly.add(chassisSub);

        // C. Shipping Container (Seated directly on chassis deck)
        const cBox = new THREE.Box3().setFromObject(rawCont);
        const cCenter = cBox.getCenter(new THREE.Vector3());
        const cSize = cBox.getSize(new THREE.Vector3());
        // Center on X & Z, base at Y=0
        rawCont.position.set(-cCenter.x, -cBox.min.y, -cCenter.z);

        const contSub = new THREE.Group();
        contSub.add(rawCont);
        // Rotate so length is along Z
        contSub.rotation.y = Math.PI / 2;
        // Exact 40ft container dimensions: length 12.0m, width 2.44m, height 2.60m
        const sLen = 12.0 / cSize.x;
        const sWid = 2.44 / cSize.z;
        const sHei = 2.60 / cSize.y;
        contSub.scale.set(sLen, sHei, sWid);

        // Chassis deck top is at Y = 1.559m above road. Container sits flush on chassis bed.
        // Trailer extends Z: -1.2m to -13.67m -> center Z = -7.43m
        contSub.position.set(0, 1.559, -7.43);
        applyContainerNavyMaterial(contSub);
        truckAssembly.add(contSub);

        // Position the assembled vehicle on the highway at Z = -28.0m
        truckAssembly.position.set(0, 0, -28.0);
        scene.add(truckAssembly);
        modelsRef.current.truckAssembly = truckAssembly;

        console.log('TRUCK ASSEMBLY BUILT: One cohesive group on road');
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
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center on all axes
        raw.position.set(-center.x, -box.min.y, -center.z);

        const shipGroup = new THREE.Group();
        shipGroup.add(raw);

        // Realistic mega ship scale: ~175m length
        const scale = 175.0 / size.x;
        shipGroup.scale.setScalar(scale);

        // Sits VISIBLY IN THE OCEAN: keel submerged, waterline at Y = 0
        shipGroup.position.set(-10.0, -3.2, -145.0);
        shipGroup.rotation.y = Math.PI / 2 + 0.12;

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
    // ------------------------------------------------------------------------
    loadGLTF(loader, getModelUrl('cargo-plane.glb'))
      .then((raw) => {
        // Double-side all meshes so no CAD backface becomes invisible
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

        // Center on all 3 axes
        raw.position.set(-center.x, -center.y, -center.z);

        const planeGroup = new THREE.Group();
        planeGroup.add(raw);

        // Authentic wingspan ~65m
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 65.0 / maxDim;
        planeGroup.scale.setScalar(scale);

        // Rotate CAD Z-Up to Three.js Y-Up, and orient along flight direction
        planeGroup.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + 0.12);

        // Position in high altitude sky
        planeGroup.position.set(0, 118.0, -325.0);
        scene.add(planeGroup);
        modelsRef.current.planeGroup = planeGroup;
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

      // 2. Physical Dynamic Movements along Timeline

      // Stage 1 (0.00 -> 0.14): Forklift hoists / lowers container at staging line
      if (modelsRef.current.forklift) {
        const forkP = Math.min(p / 0.14, 1.0);
        modelsRef.current.forklift.position.z = 1.8 - forkP * 0.6;
      }

      // Stage 3 (0.24 -> 0.44): TruckAssembly drives forward down the highway AS ONE GROUP
      if (modelsRef.current.truckAssembly) {
        if (p >= 0.24 && p <= 0.46) {
          const truckT = (p - 0.24) / 0.20;
          modelsRef.current.truckAssembly.position.z = -28.0 - truckT * 26.0;
        }
      }

      // Stage 4 (0.44 -> 0.64): Ship gentle ocean swell
      if (modelsRef.current.shipGroup) {
        modelsRef.current.shipGroup.rotation.z = Math.sin(p * 24.0) * 0.012;
      }

      // Stage 7 (0.82 -> 1.00): Cargo plane cruises smoothly through the stratosphere
      if (modelsRef.current.planeGroup) {
        if (p >= 0.82) {
          const planeT = (p - 0.82) / 0.18;
          modelsRef.current.planeGroup.position.z = -325.0 - planeT * 85.0;
          modelsRef.current.planeGroup.position.x = 2.0 + Math.sin(planeT * Math.PI) * 8.0;
          modelsRef.current.planeGroup.rotation.z = -Math.sin(planeT * Math.PI) * 0.09;
        }
      }

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
    <div className="relative w-full bg-[#060913] text-white overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
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
