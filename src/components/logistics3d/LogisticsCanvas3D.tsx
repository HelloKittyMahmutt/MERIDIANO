import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Language } from '../../types';
import { audioEngine } from './audioEngine';
import { Loader2, Camera, Compass } from 'lucide-react';

interface LogisticsCanvas3DProps {
  currentLang: Language;
  phase: number; // 0, 1, 2, 3
  progress: number; // 0 to 100
  isPlaying: boolean;
}

// Global model cache to avoid re-fetching 60MB across scene switches
const modelCache: { [url: string]: THREE.Group } = {};

export const LogisticsCanvas3D: React.FC<LogisticsCanvas3DProps> = ({
  currentLang,
  phase,
  progress,
  isPlaying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadStatus, setLoadStatus] = useState<string>('Initializing 3D engine...');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const phaseGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Dynamic animated mesh refs
  const animatedRefs = useRef<{
    roadTexture?: THREE.Texture;
    waterMesh?: THREE.Mesh;
    clouds?: THREE.Group;
    forklift?: THREE.Group;
    truck?: THREE.Group;
    container?: THREE.Group;
    ship?: THREE.Group;
    plane?: THREE.Group;
  }>({});

  // Helper to load or clone from cache
  const loadModel = (url: string): Promise<THREE.Group> => {
    if (modelCache[url]) {
      return Promise.resolve(modelCache[url].clone(true));
    }
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          modelCache[url] = gltf.scene;
          resolve(gltf.scene.clone(true));
        },
        undefined,
        (err) => reject(err)
      );
    });
  };

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x040814, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 6, 12);
    cameraRef.current = camera;

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 60;
    controls.minDistance = 3;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controlsRef.current = controls;

    const phaseGroup = new THREE.Group();
    scene.add(phaseGroup);
    phaseGroupRef.current = phaseGroup;

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Highway road movement
      if (animatedRefs.current.roadTexture) {
        animatedRefs.current.roadTexture.offset.y -= delta * 1.8;
      }

      // Ocean water movement
      if (animatedRefs.current.waterMesh && animatedRefs.current.waterMesh.geometry) {
        const geo = animatedRefs.current.waterMesh.geometry as THREE.PlaneGeometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const z = Math.sin(u * 0.4 + time * 2.0) * 0.15 + Math.cos(v * 0.4 + time * 1.5) * 0.15;
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
      }

      // Ship gentle wave rocking
      if (animatedRefs.current.ship) {
        animatedRefs.current.ship.rotation.z = Math.sin(time * 1.2) * 0.025;
        animatedRefs.current.ship.rotation.x = Math.cos(time * 0.9) * 0.015;
        animatedRefs.current.ship.position.y = Math.sin(time * 1.2) * 0.08;
      }

      // Clouds movement in sky phase
      if (animatedRefs.current.clouds) {
        animatedRefs.current.clouds.position.z += delta * 6;
        if (animatedRefs.current.clouds.position.z > 25) {
          animatedRefs.current.clouds.position.z = -25;
        }
      }

      // Plane aerodynamic sway
      if (animatedRefs.current.plane) {
        animatedRefs.current.plane.rotation.z = Math.sin(time * 1.5) * 0.06;
        animatedRefs.current.plane.rotation.x = Math.sin(time * 0.8) * 0.02;
        animatedRefs.current.plane.position.y = 2.0 + Math.sin(time * 1.1) * 0.12;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 450;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // 2. Build 3D Scene for the current Phase
  useEffect(() => {
    const group = phaseGroupRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!group || !scene || !camera || !controls) return;

    setLoading(true);
    setLoadStatus(
      phase === 0 ? 'Loading Factory & Forklift Station...' :
      phase === 1 ? 'Loading Highway & MAN TGX Truck...' :
      phase === 2 ? 'Loading Quayside Port & Container Ship...' :
      'Loading Cargo Flight Airspace...'
    );

    // Clear previous phase objects
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    animatedRefs.current = {};

    let isSubscribed = true;

    const buildPhase = async () => {
      try {
        if (phase === 0) {
          // ==========================================
          // PHASE 0: FACTORY DOCK & CONTAINER LOADING
          // ==========================================
          scene.background = new THREE.Color(0x060914);
          scene.fog = new THREE.FogExp2(0x060914, 0.02);

          // Lighting
          const ambient = new THREE.AmbientLight(0xffffff, 0.8);
          group.add(ambient);

          const dockSpot = new THREE.DirectionalLight(0xffffff, 2.8);
          dockSpot.position.set(12, 18, 10);
          dockSpot.castShadow = true;
          group.add(dockSpot);

          const warmFill = new THREE.PointLight(0xf59e0b, 2.5, 30);
          warmFill.position.set(-6, 8, -6);
          group.add(warmFill);

          // Concrete Factory Floor
          const floorGeo = new THREE.PlaneGeometry(60, 60);
          const floorMat = new THREE.MeshStandardMaterial({
            color: 0x111827,
            roughness: 0.85,
            metalness: 0.1,
          });
          const floor = new THREE.Mesh(floorGeo, floorMat);
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = 0;
          floor.receiveShadow = true;
          group.add(floor);

          // Yellow Hazard Lines
          const hazardLineGeo = new THREE.PlaneGeometry(28, 0.3);
          const hazardLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          const hazard1 = new THREE.Mesh(hazardLineGeo, hazardLineMat);
          hazard1.rotation.x = -Math.PI / 2;
          hazard1.position.set(0, 0.01, -4.5);
          group.add(hazard1);

          const hazard2 = hazard1.clone();
          hazard2.position.set(0, 0.01, 4.5);
          group.add(hazard2);

          // Factory Bay Walls (Warehouse backdrop)
          const wallGeo = new THREE.BoxGeometry(40, 10, 0.8);
          const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
          const backWall = new THREE.Mesh(wallGeo, wallMat);
          backWall.position.set(0, 5, -14);
          group.add(backWall);

          // Load Forklift
          const forklift = await loadModel('/models/forklift.glb');
          normalizeModel(forklift, 3.2);
          forklift.position.set(4.2, 0, 0.5);
          forklift.rotation.y = -Math.PI / 2 + 0.2;
          group.add(forklift);
          animatedRefs.current.forklift = forklift;

          // Load Container
          const container = await loadModel('/models/container.glb');
          normalizeModel(container, 5.0);
          // Initial suspended position near the forklift mast
          container.position.set(0, 1.8, 0);
          container.rotation.y = Math.PI / 2;
          group.add(container);
          animatedRefs.current.container = container;

          // Load Semi-Truck parked at the dock
          const truck = await loadModel('/models/truck.glb');
          normalizeModel(truck, 4.8);
          truck.position.set(-5.5, 0, 0);
          truck.rotation.y = Math.PI / 2;
          group.add(truck);
          animatedRefs.current.truck = truck;

          // Load Chassis Trailer behind truck
          const chassis = await loadModel('/models/chassis.glb');
          normalizeModel(chassis, 4.6);
          chassis.position.set(-0.2, 0, 0);
          chassis.rotation.y = Math.PI / 2;
          group.add(chassis);

          // Position Camera
          camera.position.set(9, 6, 9);
          controls.target.set(0, 1.5, 0);
          controls.update();

        } else if (phase === 1) {
          // ==========================================
          // PHASE 1: COASTAL HIGHWAY TRANSIT
          // ==========================================
          scene.background = new THREE.Color(0x030712);
          scene.fog = new THREE.FogExp2(0x030712, 0.015);

          const ambient = new THREE.AmbientLight(0xffffff, 0.7);
          group.add(ambient);

          const moonLight = new THREE.DirectionalLight(0x60a5fa, 2.2);
          moonLight.position.set(10, 20, 15);
          group.add(moonLight);

          // Procedural Road Canvas Texture
          const canvasRoad = document.createElement('canvas');
          canvasRoad.width = 512;
          canvasRoad.height = 512;
          const ctx = canvasRoad.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 512, 512);

            // Asphalt noise
            ctx.fillStyle = '#0f172a';
            for (let i = 0; i < 400; i++) {
              ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }

            // White dashed lane markings
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(250, 40, 12, 140);
            ctx.fillRect(250, 300, 12, 140);

            // Yellow side lines
            ctx.fillStyle = '#eab308';
            ctx.fillRect(40, 0, 10, 512);
            ctx.fillRect(460, 0, 10, 512);
          }

          const roadTexture = new THREE.CanvasTexture(canvasRoad);
          roadTexture.wrapS = THREE.RepeatWrapping;
          roadTexture.wrapT = THREE.RepeatWrapping;
          roadTexture.repeat.set(1, 8);
          animatedRefs.current.roadTexture = roadTexture;

          const roadGeo = new THREE.PlaneGeometry(16, 120);
          const roadMat = new THREE.MeshStandardMaterial({
            map: roadTexture,
            roughness: 0.7,
            metalness: 0.1,
          });
          const road = new THREE.Mesh(roadGeo, roadMat);
          road.rotation.x = -Math.PI / 2;
          road.position.y = 0;
          group.add(road);

          // Roadside Guardrails
          const railGeo = new THREE.BoxGeometry(0.3, 0.8, 120);
          const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
          const railL = new THREE.Mesh(railGeo, railMat);
          railL.position.set(-8.2, 0.4, 0);
          group.add(railL);

          const railR = new THREE.Mesh(railGeo, railMat);
          railR.position.set(8.2, 0.4, 0);
          group.add(railR);

          // Moving Truck + Chassis + Container assembled
          const truckCombo = new THREE.Group();

          const truck = await loadModel('/models/truck.glb');
          normalizeModel(truck, 4.6);
          truck.position.set(0, 0, 2.8);
          truckCombo.add(truck);

          const chassis = await loadModel('/models/chassis.glb');
          normalizeModel(chassis, 4.8);
          chassis.position.set(0, 0, -2.4);
          truckCombo.add(chassis);

          const container = await loadModel('/models/container.glb');
          normalizeModel(container, 4.8);
          container.position.set(0, 1.45, -2.4);
          truckCombo.add(container);

          // Headlight Cones (Cyan/White beams)
          const beamGeo = new THREE.ConeGeometry(2.0, 12, 16);
          const beamMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.22,
          });
          const beamL = new THREE.Mesh(beamGeo, beamMat);
          beamL.rotation.x = -Math.PI / 2;
          beamL.position.set(-0.9, 0.9, 8.8);
          truckCombo.add(beamL);

          const beamR = beamL.clone();
          beamR.position.set(0.9, 0.9, 8.8);
          truckCombo.add(beamR);

          truckCombo.position.set(0, 0, 0);
          group.add(truckCombo);
          animatedRefs.current.truck = truckCombo;

          // Camera setup for high-speed tracking
          camera.position.set(7.5, 4.2, 7.5);
          controls.target.set(0, 1.6, 0);
          controls.update();

        } else if (phase === 2) {
          // ==========================================
          // PHASE 2: OCEAN PORT & CONTAINER SHIP
          // ==========================================
          scene.background = new THREE.Color(0x020817);
          scene.fog = new THREE.FogExp2(0x020817, 0.012);

          const ambient = new THREE.AmbientLight(0xffffff, 0.85);
          group.add(ambient);

          const sun = new THREE.DirectionalLight(0xf97316, 2.5);
          sun.position.set(-20, 12, -15);
          group.add(sun);

          const fillSky = new THREE.DirectionalLight(0x38bdf8, 1.8);
          fillSky.position.set(15, 18, 15);
          group.add(fillSky);

          // Undulating Water Plane Geometry
          const waterGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
          const waterMat = new THREE.MeshStandardMaterial({
            color: 0x034a7d,
            roughness: 0.15,
            metalness: 0.85,
            flatShading: true,
          });
          const water = new THREE.Mesh(waterGeo, waterMat);
          water.rotation.x = -Math.PI / 2;
          water.position.y = -0.05;
          group.add(water);
          animatedRefs.current.waterMesh = water;

          // Container Ship Model
          const shipGroup = new THREE.Group();
          const ship = await loadModel('/models/container-ship.glb');
          normalizeModel(ship, 14.0);
          ship.position.set(0, 0.4, 0);
          ship.rotation.y = Math.PI / 2;
          shipGroup.add(ship);

          // Add real 3D Containers stacked on deck
          const container = await loadModel('/models/container.glb');
          normalizeModel(container, 2.4);

          const c1 = container.clone();
          c1.position.set(0, 2.2, 1.2);
          c1.rotation.y = Math.PI / 2;
          shipGroup.add(c1);

          const c2 = container.clone();
          c2.position.set(0, 2.2, -1.2);
          c2.rotation.y = Math.PI / 2;
          shipGroup.add(c2);

          const c3 = container.clone();
          c3.position.set(0, 3.1, 0);
          c3.rotation.y = Math.PI / 2;
          shipGroup.add(c3);

          group.add(shipGroup);
          animatedRefs.current.ship = shipGroup;

          // Quayside Pier and Crane Tower
          const pierGeo = new THREE.BoxGeometry(70, 2.5, 12);
          const pierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
          const pier = new THREE.Mesh(pierGeo, pierMat);
          pier.position.set(0, 0.5, 16);
          group.add(pier);

          // Port Crane Rig
          const craneGeo = new THREE.CylinderGeometry(0.3, 0.4, 14, 8);
          const craneMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5 });
          const crane = new THREE.Mesh(craneGeo, craneMat);
          crane.position.set(6, 7, 14);
          group.add(crane);

          const boomGeo = new THREE.BoxGeometry(16, 0.6, 0.6);
          const boom = new THREE.Mesh(boomGeo, craneMat);
          boom.position.set(2, 13.5, 14);
          group.add(boom);

          // Camera setup for majestic marine vista
          camera.position.set(14, 8, 16);
          controls.target.set(0, 2.5, 0);
          controls.update();

        } else if (phase === 3) {
          // ==========================================
          // PHASE 3: INTERCONTINENTAL CARGO FLIGHT
          // ==========================================
          scene.background = new THREE.Color(0x020617);
          scene.fog = new THREE.FogExp2(0x020617, 0.008);

          const ambient = new THREE.AmbientLight(0xffffff, 1.1);
          group.add(ambient);

          const sun = new THREE.DirectionalLight(0xffffff, 3.2);
          sun.position.set(15, 25, 20);
          group.add(sun);

          const horizonGlow = new THREE.DirectionalLight(0x38bdf8, 2.0);
          horizonGlow.position.set(-20, 5, -20);
          group.add(horizonGlow);

          // Cargo Airplane Model
          const planeGroup = new THREE.Group();
          const plane = await loadModel('/models/cargo-plane.glb');
          normalizeModel(plane, 10.5, true);
          plane.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
          planeGroup.add(plane);

          // Blinking Wingtip Nav Lights
          const redNav = new THREE.PointLight(0xef4444, 4.0, 5);
          redNav.position.set(-4.5, 0.2, 0);
          planeGroup.add(redNav);

          const greenNav = new THREE.PointLight(0x22c55e, 4.0, 5);
          greenNav.position.set(4.5, 0.2, 0);
          planeGroup.add(greenNav);

          // Twin Jet Contrail particle streamers
          const contrailGeo = new THREE.CylinderGeometry(0.08, 0.7, 18, 12);
          const contrailMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.35,
          });
          const contrailL = new THREE.Mesh(contrailGeo, contrailMat);
          contrailL.rotation.x = -Math.PI / 2;
          contrailL.position.set(-2.0, -0.2, -10.5);
          planeGroup.add(contrailL);

          const contrailR = contrailL.clone();
          contrailR.position.set(2.0, -0.2, -10.5);
          planeGroup.add(contrailR);

          planeGroup.position.set(0, 2.0, 0);
          group.add(planeGroup);
          animatedRefs.current.plane = planeGroup;

          // Procedural Cloud Deck Below
          const cloudGroup = new THREE.Group();
          const cloudMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.95,
            transparent: true,
            opacity: 0.65,
          });

          for (let i = 0; i < 28; i++) {
            const size = 3 + Math.random() * 4;
            const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 1), cloudMat);
            puff.position.set(
              (Math.random() - 0.5) * 45,
              -4 - Math.random() * 3,
              (Math.random() - 0.5) * 60
            );
            puff.scale.set(1.6, 0.45, 1.2);
            cloudGroup.add(puff);
          }
          group.add(cloudGroup);
          animatedRefs.current.clouds = cloudGroup;

          // Camera setup for soaring high-altitude view
          camera.position.set(11, 4.5, 11);
          controls.target.set(0, 2.0, 0);
          controls.update();
        }

        if (isSubscribed) {
          setLoading(false);
          // Play ambient audio for this phase
          audioEngine.startPhaseAmbience(phase);
        }
      } catch (err) {
        console.error('Failed to construct 3D phase scene:', err);
        if (isSubscribed) setLoading(false);
      }
    };

    buildPhase();

    return () => {
      isSubscribed = false;
    };
  }, [phase]);

  // Handle phase progress animation for container docking in Phase 0
  useEffect(() => {
    if (phase === 0 && animatedRefs.current.container && animatedRefs.current.forklift) {
      // Forklift lowers container onto trailer bed
      const t = Math.min(progress / 85, 1.0); // 0 to 1
      const startY = 3.2;
      const targetY = 1.45;
      animatedRefs.current.container.position.y = startY - t * (startY - targetY);
      
      // Container aligns smoothly to chassis X position (-0.2)
      const startX = 3.0;
      const targetX = -0.2;
      animatedRefs.current.container.position.x = startX - t * (startX - targetX);
    }
  }, [phase, progress]);

  // Reset Camera View
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (phase === 0) {
      cameraRef.current.position.set(9, 6, 9);
      controlsRef.current.target.set(0, 1.5, 0);
    } else if (phase === 1) {
      cameraRef.current.position.set(7.5, 4.2, 7.5);
      controlsRef.current.target.set(0, 1.6, 0);
    } else if (phase === 2) {
      cameraRef.current.position.set(14, 8, 16);
      controlsRef.current.target.set(0, 2.5, 0);
    } else if (phase === 3) {
      cameraRef.current.position.set(11, 4.5, 11);
      controlsRef.current.target.set(0, 2.0, 0);
    }
    controlsRef.current.update();
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[340px] sm:h-[420px] md:h-[460px] overflow-hidden bg-[#040814] select-none"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none" 
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#040814]/90 backdrop-blur-md flex flex-col items-center justify-center z-30 transition-opacity">
          <Loader2 className="w-9 h-9 text-blue-400 animate-spin mb-3" />
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-1">
            {loadStatus}
          </div>
          <div className="text-[11px] font-sans text-slate-400">
            {currentLang === 'bg' ? 'Зареждане на детайлни 3D активи...' : 'Preparing high-detail 3D environment...'}
          </div>
        </div>
      )}

      {/* Floating 3D Navigation Watermark & Reset Button */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetCamera}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-300 hover:text-white backdrop-blur-md transition-colors shadow-lg"
          title="Възстанови кинематографичния ракурс"
        >
          <Camera className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">RESET CAM</span>
        </button>

        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono text-slate-400 backdrop-blur-md flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>3D ORBIT ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

// Helper to center and scale imported GLB models safely
function normalizeModel(model: THREE.Group, targetSize: number, centerAllAxes: boolean = false) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Center on X and Z
  model.position.x = -center.x;
  model.position.z = -center.z;
  // Center or ground on Y
  if (centerAllAxes) {
    model.position.y = -center.y;
  } else {
    model.position.y = -box.min.y;
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    model.scale.setScalar(scale);
  }

  // Cast, receive shadows, and ensure DoubleSide on all meshes
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          m.side = THREE.DoubleSide;
        });
      } else if (mesh.material) {
        mesh.material.side = THREE.DoubleSide;
      }
    }
  });
}
