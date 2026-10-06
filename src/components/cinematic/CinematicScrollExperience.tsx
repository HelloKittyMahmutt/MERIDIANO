import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../logistics3d/audioEngine';

gsap.registerPlugin(ScrollTrigger);

interface Keyframe {
  progress: number;
  camPos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const CinematicScrollExperience: React.FC = () => {
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
    truckCombo?: THREE.Group;
    containerTruck?: THREE.Group;
    shipGroup?: THREE.Group;
    planeGroup?: THREE.Group;
    roadMesh?: THREE.Mesh;
    oceanMesh?: THREE.Mesh;
    cloudsGroup?: THREE.Group;
  }>({});

  // Dynamic progress refs for smooth lerping
  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);

  // Master Camera Cinematic Keyframe Spline
  const keyframes: Keyframe[] = [
    // 0.00 - 0.15: FORKLIFT + CONTAINER (Low cinematic, cropped, gritty factory environment)
    {
      progress: 0.0,
      camPos: new THREE.Vector3(4.5, 0.9, 5.8),
      target: new THREE.Vector3(0.5, 1.4, 0.8),
      fov: 42,
    },
    {
      progress: 0.08,
      camPos: new THREE.Vector3(2.8, 1.1, 4.2),
      target: new THREE.Vector3(-0.5, 1.6, 0.2),
      fov: 40,
    },
    {
      progress: 0.15,
      camPos: new THREE.Vector3(1.2, 1.6, 2.8),
      target: new THREE.Vector3(-0.8, 1.8, 0.0),
      fov: 38,
    },

    // 0.15 - 0.28: CONTAINER HERO MOMENT (Extremely close to blue container surface as transition)
    {
      progress: 0.20,
      camPos: new THREE.Vector3(-0.2, 1.8, 1.8),
      target: new THREE.Vector3(-1.0, 1.8, 0.0),
      fov: 36,
    },
    {
      progress: 0.28,
      camPos: new THREE.Vector3(-1.6, 1.9, 1.4),
      target: new THREE.Vector3(-1.8, 1.9, -0.4),
      fov: 35,
    },

    // 0.28 - 0.45: TRUCK + CHASSIS + CONTAINER (Highway tracking shot, alongside & slightly below)
    {
      progress: 0.32,
      camPos: new THREE.Vector3(5.5, 1.2, -18.0),
      target: new THREE.Vector3(0.0, 2.2, -26.0),
      fov: 42,
    },
    {
      progress: 0.38,
      camPos: new THREE.Vector3(4.2, 1.4, -28.0),
      target: new THREE.Vector3(0.0, 2.0, -32.0),
      fov: 40,
    },
    {
      progress: 0.45,
      camPos: new THREE.Vector3(3.2, 1.1, -38.0),
      target: new THREE.Vector3(0.0, 2.0, -44.0),
      fov: 40,
    },

    // 0.45 - 0.62: CONTAINER SHIP (Enormous scale, water level, hull extending past frame)
    {
      progress: 0.49,
      camPos: new THREE.Vector3(18.0, 1.5, -90.0),
      target: new THREE.Vector3(0.0, 14.0, -115.0),
      fov: 46,
    },
    {
      progress: 0.55,
      camPos: new THREE.Vector3(26.0, 3.8, -125.0),
      target: new THREE.Vector3(0.0, 18.0, -145.0),
      fov: 44,
    },
    {
      progress: 0.62,
      camPos: new THREE.Vector3(34.0, 8.5, -155.0),
      target: new THREE.Vector3(0.0, 22.0, -170.0),
      fov: 44,
    },

    // 0.62 - 0.78: ASCENT INTO CLOUD LAYER (Ocean recedes, haze increases, entering clouds)
    {
      progress: 0.68,
      camPos: new THREE.Vector3(20.0, 32.0, -180.0),
      target: new THREE.Vector3(0.0, 15.0, -200.0),
      fov: 48,
    },
    {
      progress: 0.74,
      camPos: new THREE.Vector3(8.0, 65.0, -210.0),
      target: new THREE.Vector3(0.0, 50.0, -240.0),
      fov: 52,
    },
    {
      progress: 0.78,
      camPos: new THREE.Vector3(0.0, 95.0, -235.0),
      target: new THREE.Vector3(0.0, 92.0, -270.0),
      fov: 50,
    },

    // 0.78 - 0.94: CARGO PLANE (Emerges above clouds, camera tracks alongside, passing close)
    {
      progress: 0.82,
      camPos: new THREE.Vector3(-14.0, 114.0, -275.0),
      target: new THREE.Vector3(2.0, 112.0, -305.0),
      fov: 44,
    },
    {
      progress: 0.88,
      camPos: new THREE.Vector3(8.5, 113.5, -315.0),
      target: new THREE.Vector3(0.0, 112.5, -335.0),
      fov: 40,
    },
    {
      progress: 0.94,
      camPos: new THREE.Vector3(5.0, 115.0, -345.0),
      target: new THREE.Vector3(0.0, 114.0, -375.0),
      fov: 42,
    },

    // 0.94 - 1.00: FINAL FRAME (Plane cruises into distance, negative space for MERIDIANO statement)
    {
      progress: 1.0,
      camPos: new THREE.Vector3(0.0, 116.0, -365.0),
      target: new THREE.Vector3(0.0, 118.0, -420.0),
      fov: 44,
    },
  ];

  // Helper function to interpolate camera along keyframes
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

  // Helper to load GLB with progress
  const loadGLTF = (loader: GLTFLoader, url: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        undefined,
        (err) => reject(err)
      );
    });
  };

  // 1. Initialize Full-Screen WebGL Experience
  useEffect(() => {
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // A. Full-Screen Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040711);
    scene.fog = new THREE.FogExp2(0x040711, 0.0035);
    sceneRef.current = scene;

    // B. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);
    const initialFrame = sampleTimeline(0);
    camera.position.copy(initialFrame.pos);
    camera.lookAt(initialFrame.target);
    cameraRef.current = camera;

    // C. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // D. Global Atmosphere & Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    sunLight.position.set(40, 80, 20);
    scene.add(sunLight);

    const fillBlue = new THREE.DirectionalLight(0x38bdf8, 1.8);
    fillBlue.position.set(-30, 40, -40);
    scene.add(fillBlue);

    // E. Build The Continuous Multi-Stage World Environment
    // ------------------------------------------------------------------------
    // 1. Factory Dock Floor (Z: -10 to 15)
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

    // Factory Safety Lines
    const lineGeo = new THREE.PlaneGeometry(40, 0.25);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const safetyLine = new THREE.Mesh(lineGeo, lineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(0, 0.01, 3.5);
    scene.add(safetyLine);

    // 2. Highway Asphalt Strip (Z: -10 to -70)
    const roadGeo = new THREE.PlaneGeometry(16, 75);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -45);
    scene.add(roadMesh);
    modelsRef.current.roadMesh = roadMesh;

    // Road White Center Dashes
    for (let z = -12; z >= -78; z -= 5) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 2.5),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      scene.add(dash);
    }

    // 3. Ocean Water Surface (Z: -75 to -220)
    const oceanGeo = new THREE.PlaneGeometry(350, 200, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x033b66,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -0.4, -165);
    scene.add(oceanMesh);
    modelsRef.current.oceanMesh = oceanMesh;

    // 4. Procedural Cloud Layer (Y: 70 to 90, Z: -220 to -340)
    const cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 1.0,
      transparent: true,
      opacity: 0.65,
    });

    for (let c = 0; c < 45; c++) {
      const radius = 8 + Math.random() * 14;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 160,
        72 + (Math.random() - 0.5) * 20,
        -230 - Math.random() * 120
      );
      puff.scale.set(1.8, 0.5, 1.4);
      cloudsGroup.add(puff);
    }
    scene.add(cloudsGroup);
    modelsRef.current.cloudsGroup = cloudsGroup;

    // F. Load All 6 Verified GLB Models
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const totalModels = 6;

    const onModelLoaded = () => {
      loadedCount++;
      setLoadPercent(Math.round((loadedCount / totalModels) * 100));
      if (loadedCount >= totalModels) {
        setLoading(false);
      }
    };

    // 1. Forklift Model (Factory Dock)
    loadGLTF(loader, '/public/models/forklift.glb')
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        raw.position.set(-center.x, -box.min.y, -center.z);

        const forkGroup = new THREE.Group();
        forkGroup.add(raw);
        // Scale to realistic ~3.8m length
        const scale = 3.8 / Math.max(size.x, size.y, size.z);
        forkGroup.scale.setScalar(scale);

        // Position on factory dock facing container
        forkGroup.position.set(1.8, 0, 2.2);
        forkGroup.rotation.y = -Math.PI / 2 + 0.35;
        scene.add(forkGroup);
        modelsRef.current.forklift = forkGroup;
        onModelLoaded();
      })
      .catch((e) => {
        console.error('Forklift error:', e);
        onModelLoaded();
      });

    // 2. Container Model (Factory Dock & Hero Moment)
    loadGLTF(loader, '/public/models/container.glb')
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        raw.position.set(-center.x, -box.min.y, -center.z);

        const contGroup = new THREE.Group();
        contGroup.add(raw);
        // Realistic 40ft length ~12.2m
        const scale = 12.2 / Math.max(size.x, size.y, size.z);
        contGroup.scale.setScalar(scale);

        // Positioned at factory dock
        contGroup.position.set(-1.2, 0, 0);
        contGroup.rotation.y = Math.PI / 2;
        scene.add(contGroup);
        modelsRef.current.containerStage1 = contGroup;
        onModelLoaded();
      })
      .catch((e) => {
        console.error('Container error:', e);
        onModelLoaded();
      });

    // 3. Truck Tractor + Separate Chassis + Container Assembly (Highway Stage)
    Promise.all([
      loadGLTF(loader, '/public/models/truck.glb'),
      loadGLTF(loader, '/public/models/chassis.glb'),
      loadGLTF(loader, '/public/models/container.glb'),
    ])
      .then(([rawTruck, rawChassis, rawCont]) => {
        const truckCombo = new THREE.Group();

        // A. Tractor Cab
        const truckBox = new THREE.Box3().setFromObject(rawTruck);
        const tCenter = truckBox.getCenter(new THREE.Vector3());
        const tSize = truckBox.getSize(new THREE.Vector3());
        rawTruck.position.set(-tCenter.x, -truckBox.min.y, -tCenter.z);
        const truckSub = new THREE.Group();
        truckSub.add(rawTruck);
        truckSub.scale.setScalar(6.2 / Math.max(tSize.x, tSize.y, tSize.z));
        truckSub.position.set(0, 0, 7.5);
        truckSub.rotation.y = Math.PI;
        truckCombo.add(truckSub);

        // B. Separate Chassis Trailer
        const chassisBox = new THREE.Box3().setFromObject(rawChassis);
        const chCenter = chassisBox.getCenter(new THREE.Vector3());
        const chSize = chassisBox.getSize(new THREE.Vector3());
        rawChassis.position.set(-chCenter.x, -chassisBox.min.y, -chCenter.z);
        const chassisSub = new THREE.Group();
        chassisSub.add(rawChassis);
        chassisSub.scale.setScalar(12.4 / Math.max(chSize.x, chSize.y, chSize.z));
        chassisSub.position.set(0, 0.05, -0.5);
        chassisSub.rotation.y = Math.PI;
        truckCombo.add(chassisSub);

        // C. Seated Blue Container on Trailer Bed
        const contBox = new THREE.Box3().setFromObject(rawCont);
        const cCenter = contBox.getCenter(new THREE.Vector3());
        const cSize = contBox.getSize(new THREE.Vector3());
        rawCont.position.set(-cCenter.x, -contBox.min.y, -cCenter.z);
        const contSub = new THREE.Group();
        contSub.add(rawCont);
        contSub.scale.setScalar(12.2 / Math.max(cSize.x, cSize.y, cSize.z));
        contSub.position.set(0, 1.45, -0.5);
        contSub.rotation.y = Math.PI;
        truckCombo.add(contSub);

        // Headlight Beams
        const beamGeo = new THREE.ConeGeometry(2.5, 18, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0.18,
        });
        const beamL = new THREE.Mesh(beamGeo, beamMat);
        beamL.rotation.x = -Math.PI / 2;
        beamL.position.set(-1.1, 1.2, 16.5);
        truckCombo.add(beamL);

        const beamR = beamL.clone();
        beamR.position.set(1.1, 1.2, 16.5);
        truckCombo.add(beamR);

        // Highway location
        truckCombo.position.set(0, 0, -32);
        truckCombo.rotation.y = Math.PI; // Heading down the highway
        scene.add(truckCombo);
        modelsRef.current.truckCombo = truckCombo;

        onModelLoaded(); // truck
        onModelLoaded(); // chassis
        onModelLoaded(); // container on truck
      })
      .catch((e) => {
        console.error('Truck combo load error:', e);
        onModelLoaded();
        onModelLoaded();
        onModelLoaded();
      });

    // 4. Container Ship (Maritime Stage)
    loadGLTF(loader, '/public/models/container-ship.glb')
      .then((raw) => {
        const box = new THREE.Box3().setFromObject(raw);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        raw.position.set(-center.x, -box.min.y, -center.z);

        const shipGroup = new THREE.Group();
        shipGroup.add(raw);
        // ENORMOUS scale (~170 units long)
        const scale = 170.0 / Math.max(size.x, size.y, size.z);
        shipGroup.scale.setScalar(scale);

        // Position in the ocean with hull extending past viewport
        shipGroup.position.set(-8.0, 0.2, -145.0);
        shipGroup.rotation.y = Math.PI / 2 + 0.15;
        scene.add(shipGroup);
        modelsRef.current.shipGroup = shipGroup;
        onModelLoaded();
      })
      .catch((e) => {
        console.error('Ship error:', e);
        onModelLoaded();
      });

    // 5. Cargo Plane (High Altitude Stratosphere)
    loadGLTF(loader, '/public/models/cargo-plane.glb')
      .then((raw) => {
        // Double-side all meshes to guarantee visibility
        raw.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh;
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

        // Center on ALL 3 axes
        raw.position.set(-center.x, -center.y, -center.z);

        const planeGroup = new THREE.Group();
        planeGroup.add(raw);

        // Authentic wingspan scale ~65m
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 65.0 / maxDim;
        planeGroup.scale.setScalar(scale);

        // CAD Z-Up to Three.js Y-Up alignment
        planeGroup.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + 0.1);

        // Positioned in high altitude sky
        planeGroup.position.set(0, 112.0, -325.0);
        scene.add(planeGroup);
        modelsRef.current.planeGroup = planeGroup;
        onModelLoaded();
      })
      .catch((e) => {
        console.error('Plane error:', e);
        onModelLoaded();
      });

    // G. Animation Render Loop (Controlled strictly by scroll progress)
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId.current = requestAnimationFrame(renderLoop);

      // Smooth progress lerp for cinema-grade fluidity
      smoothProgressRef.current += (targetProgressRef.current - smoothProgressRef.current) * 0.12;
      const p = smoothProgressRef.current;

      // 1. Interpolate Camera
      const { pos, target, fov } = sampleTimeline(p);
      if (cameraRef.current) {
        cameraRef.current.position.copy(pos);
        cameraRef.current.lookAt(target);
        if (cameraRef.current.fov !== fov) {
          cameraRef.current.fov = fov;
          cameraRef.current.updateProjectionMatrix();
        }
      }

      // 2. Dynamic Object Micro-Interactions along Timeline
      // Forklift mast movement in Phase 0.00 -> 0.15
      if (modelsRef.current.forklift) {
        const forkP = Math.min(p / 0.15, 1.0);
        modelsRef.current.forklift.position.z = 2.2 - forkP * 0.8;
      }

      // Truck driving forward on highway in Phase 0.28 -> 0.45
      if (modelsRef.current.truckCombo) {
        if (p >= 0.26 && p <= 0.48) {
          const truckT = (p - 0.26) / 0.22;
          modelsRef.current.truckCombo.position.z = -22 - truckT * 26;
        }
      }

      // Ship gentle water surge
      if (modelsRef.current.shipGroup) {
        modelsRef.current.shipGroup.rotation.z = Math.sin(p * 20.0) * 0.012;
      }

      // Cargo plane dynamic flight trajectory & close-pass sweep
      if (modelsRef.current.planeGroup) {
        if (p >= 0.76) {
          const planeT = (p - 0.76) / 0.24;
          // Plane cruises along negative Z, banking slightly
          modelsRef.current.planeGroup.position.z = -275 - planeT * 95;
          modelsRef.current.planeGroup.position.x = -6 + Math.sin(planeT * Math.PI) * 12;
          modelsRef.current.planeGroup.position.y = 110 + planeT * 8;
          modelsRef.current.planeGroup.rotation.z = -Math.sin(planeT * Math.PI) * 0.18;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderLoop();

    // H. Resize Handler
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

  // 2. Connect Browser Scroll Directly to Timeline using GSAP ScrollTrigger Scrub
  useEffect(() => {
    if (!scrollTrackRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: scrollTrackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6, // Butter-smooth scroll scrub
      onUpdate: (self) => {
        targetProgressRef.current = self.progress;
        setCurrentProgress(self.progress);

        // Sound ambience transition
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
    <div className="relative w-full bg-[#040711] text-white overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ==================================================================== */}
      {/* 1. PERMANENT FULL-SCREEN FIXED WEBGL CANVAS (EDGE-TO-EDGE)            */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-[#040711] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin mb-4" />
          <div className="text-sm font-mono tracking-widest uppercase text-white font-bold mb-2">
            INITIALIZING MERIDIANO 3D CINEMATIC ARCHITECTURE
          </div>
          <div className="w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${Math.max(loadPercent, 8)}%` }}
            />
          </div>
          <div className="text-xs font-mono text-slate-500 mt-2">
            Loading Fleet Assets ({loadPercent}%) • Forklift • Container • Truck • Chassis • Ship • Plane
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. MINIMAL FLOATING CONTROLS & HUD OVERLAY (NO BOX, NO BORDERS)       */}
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
            SCROLL TO NAVIGATE JOURNEY
          </span>
          <ArrowDown className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Progress Line on right edge */}
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
      {/* ==================================================================== */}
      <div ref={scrollTrackRef} className="relative w-full h-[800vh] pointer-events-auto">
        
        {/* Sequence Chapter 1: Forklift & Container (0.00 - 0.15) */}
        <section className="absolute top-[3vh] left-6 sm:left-16 max-w-lg z-20 pointer-events-none">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
              01 // FACTORY EMBARKATION
            </span>
            <h1 className="text-3xl sm:text-5xl font-black font-montserrat tracking-tight text-white leading-none">
              CARGO ORIGIN
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
              Industrial loading at factory bay. The forklift hoists the verified MERIDIANO freight container directly onto the staging bay.
            </p>
          </div>
        </section>

        {/* Sequence Chapter 2: Container Hero Moment (0.15 - 0.28) */}
        <section className="absolute top-[180vh] left-6 sm:left-16 max-w-md z-20 pointer-events-none">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
              02 // INTERMODAL INTEGRITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-montserrat tracking-tight text-white leading-none">
              BOLT-SEALED
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
              ISO 17712 security bolt-sealed. Weatherproof Corten steel engineered to withstand extreme cross-continental transit.
            </p>
          </div>
        </section>

        {/* Sequence Chapter 3: Overland Truck Haul (0.28 - 0.45) */}
        <section className="absolute top-[300vh] right-6 sm:right-16 text-right max-w-md z-20 pointer-events-none">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
              03 // OVERLAND ARTERY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-montserrat tracking-tight text-white leading-none">
              COASTAL EXPRESSWAY
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
              MAN TGX tractor unit and skeletal chassis accelerate along the coastal transit corridor, syncing arrival directly with vessel loading windows.
            </p>
          </div>
        </section>

        {/* Sequence Chapter 4: Maritime Ocean Giant (0.45 - 0.62) */}
        <section className="absolute top-[440vh] left-6 sm:left-16 max-w-lg z-20 pointer-events-none">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest">
              04 // DEEP SEA PASSAGE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-montserrat tracking-tight text-white leading-none">
              OCEANIC CARRIER
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
              Transferred to deep-water container vessel. Thousands of TEU crossing the Malacca Strait, Suez Canal, and Mediterranean into Black Sea ports.
            </p>
          </div>
        </section>

        {/* Sequence Chapter 5: Stratospheric Flight (0.78 - 0.94) */}
        <section className="absolute top-[640vh] left-6 sm:left-16 max-w-md z-20 pointer-events-none">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">
              05 // PRIORITY AIRFREIGHT
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-montserrat tracking-tight text-white leading-none">
              STRATOSPHERIC REACH
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-1">
              Intercontinental freighter crossing 38,000 feet. Rapid-turnaround air cargo delivering high-value components door-to-door in 3 to 5 days.
            </p>
          </div>
        </section>

        {/* Sequence Chapter 6: Final Destination (0.94 - 1.00) */}
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
                href="#contact"
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
