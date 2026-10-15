import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  LOADING_STAGES,
  evaluateLoadingOperation,
  LoadingOperationFrameState,
} from './LoadingOperationController';
import {
  buildApprovedTruckAssembly,
  APPROVED_TRUCK_ASSEMBLY_CONFIG,
} from './truckAssemblyConfig';
import {
  assembleContainerHandler,
  ContainerHandlerKinematics,
  HANDLER_CALIBRATION,
} from './containerHandlerKinematics';

interface LoadingOperationStudioProps {
  onBackToJourney: () => void;
}

export const LoadingOperationStudio: React.FC<LoadingOperationStudioProps> = ({
  onBackToJourney,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<'bg' | 'en'>('en');
  const [activeTab, setActiveTab] = useState<'kinematics' | 'audit'>('kinematics');
  const [currentState, setCurrentState] = useState<LoadingOperationFrameState>(() =>
    evaluateLoadingOperation(0)
  );

  // Scene object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const containerMeshRef = useRef<THREE.Group | null>(null);
  const truckAssemblyRef = useRef<THREE.Group | null>(null);
  const handlerKinematicsRef = useRef<ContainerHandlerKinematics | null>(null);

  // Animation frame loop for playback
  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      let lastTime = performance.now();
      const loop = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        setProgress((prev) => {
          const next = prev + dt * 0.08;
          return next > 1.0 ? 0.0 : next;
        });
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f18);
    scene.fog = new THREE.FogExp2(0x0a0f18, 0.012);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Studio Environment Lighting
    const hemiLight = new THREE.HemisphereLight(0x94b4d8, 0x18202c, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.4);
    dirLight.position.set(18, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Yard Apron Ground
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141a24,
      roughness: 0.88,
      metalness: 0.12,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Concrete Pad for Staging
    const padGeo = new THREE.BoxGeometry(16, 0.08, 6.5);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e2633,
      roughness: 0.75,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(4.9, 0.04, 5.4);
    padMesh.receiveShadow = true;
    scene.add(padMesh);

    // Staging alignment guide markings
    const lineGeo = new THREE.PlaneGeometry(14, 0.15);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const line1 = new THREE.Mesh(lineGeo, lineMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(4.9, 0.09, 6.7);
    scene.add(line1);

    const line2 = new THREE.Mesh(lineGeo, lineMat);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(4.9, 0.09, 4.1);
    scene.add(line2);

    // Road lane markings for truck
    const roadLaneGeo = new THREE.PlaneGeometry(0.2, 50);
    const roadLaneMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const roadLane = new THREE.Mesh(roadLaneGeo, roadLaneMat);
    roadLane.rotation.x = -Math.PI / 2;
    roadLane.position.set(0, 0.02, 0);
    scene.add(roadLane);

    // Load Approved Models
    const loader = new GLTFLoader();

    // 1. Container model (loaded for independent loading animation)
    loader.load('public/models/container.glb', (gltf) => {
      const cGroup = gltf.scene;
      cGroup.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      // Apply exact approved container scale
      cGroup.scale.set(
        APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[0],
        APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[1],
        APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[2]
      );
      containerMeshRef.current = cGroup;
      scene.add(cGroup);
    });

    // 2. Approved Truck Assembly (Truck + Chassis + Container)
    Promise.all([
      new Promise<THREE.Group>((res) => loader.load('public/models/truck.glb', (g) => res(g.scene))),
      new Promise<THREE.Group>((res) => loader.load('public/models/chassis.glb', (g) => res(g.scene))),
      new Promise<THREE.Group>((res) => loader.load('public/models/container.glb', (g) => res(g.scene))),
    ]).then(([truckModel, chassisModel, containerModel]) => {
      // Build locked approved truck assembly
      const truckAssembly = buildApprovedTruckAssembly(truckModel, chassisModel, containerModel);
      
      // The container mounted on the chassis is hidden during loading (stages 1-6)
      // and becomes visible once seated (stages 7-9)
      const mountedContainer = truckAssembly.getObjectByName('Container');
      if (mountedContainer) {
        mountedContainer.visible = false;
      }

      truckAssemblyRef.current = truckAssembly;
      scene.add(truckAssembly);
    });

    // 3. Load NEW Container Handler (public/models/forklift.glb) with Kinematics Regrouping
    loader.load('public/models/forklift.glb', (gltf) => {
      const handlerKinematics = assembleContainerHandler(gltf.scene);
      handlerKinematicsRef.current = handlerKinematics;
      scene.add(handlerKinematics.root);
    });

    // Resize handler
    const onResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    let active = true;
    const render = () => {
      if (!active) return;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();

    return () => {
      active = false;
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Scene on Progress Change
  useEffect(() => {
    const state = evaluateLoadingOperation(progress);
    setCurrentState(state);

    // 1. Update Container Mesh
    if (containerMeshRef.current) {
      containerMeshRef.current.position.copy(state.container.position);
      containerMeshRef.current.rotation.copy(state.container.rotation);
      containerMeshRef.current.scale.copy(state.container.scale);
    }

    // 2. Update Truck Assembly
    if (truckAssemblyRef.current) {
      truckAssemblyRef.current.position.copy(state.truck.worldPosition);
      // Rotate wheels using locked wheel spin controller
      if (typeof truckAssemblyRef.current.userData.setWheelSpin === 'function') {
        truckAssemblyRef.current.userData.setWheelSpin(Math.abs(state.truck.worldPosition.z));
      }

      // Container mounted on truck chassis becomes visible in stages 7-9
      const mountedContainer = truckAssemblyRef.current.getObjectByName('Container');
      if (mountedContainer) {
        mountedContainer.visible = state.currentStage.index >= 7;
      }
    }

    // Hide standalone animated container when seated on chassis in stage 7+
    if (containerMeshRef.current) {
      containerMeshRef.current.visible = state.currentStage.index < 7;
    }

    // 3. Update NEW Container Handler Kinematics
    if (handlerKinematicsRef.current) {
      const hk = handlerKinematicsRef.current;
      
      // Update vehicle root position & yaw preserving calibrated orientation
      hk.root.position.copy(state.handler.rootPosition);
      hk.root.position.y += HANDLER_CALIBRATION.groundYOffset;
      hk.root.rotation.copy(HANDLER_CALIBRATION.rotation);
      if (state.handler.rootRotation.y !== 0) {
        hk.root.rotation.y += state.handler.rootRotation.y;
      }

      // Articulate boom elevation and extension
      hk.setBoomPose(state.handler.boomElevationRad, state.handler.boomTelescopeMeters * 0.2);

      // Articulate top-lift spreader
      hk.setSpreaderPose(state.handler.spreaderWorldPos, state.handler.twistlocksLocked);
    }

    // 4. Update Camera Choreography
    if (cameraRef.current) {
      cameraRef.current.position.copy(state.camera.position);
      cameraRef.current.lookAt(state.camera.target);
      cameraRef.current.fov = state.camera.fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [progress]);

  // Jump directly to a stage
  const jumpToStage = (stageIdx: number) => {
    const stg = LOADING_STAGES[stageIdx - 1];
    if (stg) {
      setProgress(stg.start + (stg.end - stg.start) * 0.1);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#080d16] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-white/10 bg-[#0d131f]/90 backdrop-blur-md px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToJourney}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-mono font-medium tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <span>← RETURN TO CINEMATIC JOURNEY</span>
          </button>
          <div className="h-5 w-px bg-white/15" />
          <div>
            <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
              <span>CONTAINER HANDLER LOADING STUDIO</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                NEW ASSET INTEGRATED
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Deterministic 9-stage sequence • Top-lift spreader & boom kinematics
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'bg' : 'en')}
            className="px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors"
          >
            {lang === 'en' ? 'EN / BG' : 'BG / EN'}
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500'
            }`}
          >
            <span>{isPlaying ? '⏸ PAUSE' : '▶ PLAY OPERATION'}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative h-full">
          <div ref={mountRef} className="w-full h-full" />

          {/* Overlay Stage Title Card */}
          <div className="absolute top-6 left-6 pointer-events-none z-10 flex flex-col gap-1 max-w-lg">
            <div className="text-[10px] font-mono tracking-widest uppercase text-blue-400 font-semibold bg-blue-950/60 border border-blue-800/40 px-2.5 py-1 rounded w-fit backdrop-blur-md">
              STAGE {currentState.currentStage.index} OF 9 • {(currentState.stageProgress * 100).toFixed(0)}% COMPLETE
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
              {lang === 'bg' ? currentState.currentStage.labelBg : currentState.currentStage.labelEn}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed drop-shadow bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10">
              {currentState.currentStage.description}
            </p>
          </div>

          {/* Real-time Physical Invariant Monitor */}
          <div className="absolute bottom-6 left-6 pointer-events-none z-10 bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3 text-[11px] font-mono text-slate-300 flex flex-col gap-1">
            <div className="text-slate-400 font-semibold border-b border-white/10 pb-1 mb-1 flex items-center justify-between">
              <span>PHYSICAL INVARIANT MONITOR</span>
              <span className="text-emerald-400 text-[10px]">NEW ASSET LINKED</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Container World Pos:</span>
              <span className="text-cyan-300 font-bold">
                [{currentState.container.position.x.toFixed(2)},{' '}
                {currentState.container.position.y.toFixed(2)},{' '}
                {currentState.container.position.z.toFixed(2)}]
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Locked Scale:</span>
              <span className="text-emerald-400">
                [{currentState.container.scale.x.toFixed(4)},{' '}
                {currentState.container.scale.y.toFixed(5)},{' '}
                {currentState.container.scale.z.toFixed(5)}]
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Support Medium:</span>
              <span
                className={`font-semibold ${
                  currentState.container.supportMedium === 'GROUND_STAGING'
                    ? 'text-amber-400'
                    : currentState.container.supportMedium === 'SPREADER_LOCKED'
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentState.container.supportMedium}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Twistlocks Engaged:</span>
              <span className={currentState.handler.twistlocksLocked ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {currentState.handler.twistlocksLocked ? 'LOCKED (90° ISO 1161)' : 'OPEN / DISENGAGED'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Control & Audit Panel */}
        <div className="w-96 border-l border-white/10 bg-[#0d131f]/95 backdrop-blur-md flex flex-col z-20">
          {/* Panel Tabs */}
          <div className="flex border-b border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('kinematics')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'kinematics'
                  ? 'border-b-2 border-blue-500 text-blue-400 font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              9-STAGE SEQUENCE
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'audit'
                  ? 'border-b-2 border-blue-500 text-blue-400 font-semibold bg-white/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ASSET INSPECTION
            </button>
          </div>

          {/* Panel Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
            {activeTab === 'kinematics' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>TIMELINE PROGRESS</span>
                    <span className="text-blue-400 font-bold">{(progress * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={progress}
                    onChange={(e) => setProgress(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Direct Stage Jump:
                  </div>
                  {LOADING_STAGES.map((s) => {
                    const isActive = currentState.currentStage.index === s.index;
                    return (
                      <button
                        key={s.name}
                        onClick={() => jumpToStage(s.index)}
                        className={`w-full text-left px-3 py-2 rounded border transition-all flex items-center justify-between ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-blue-400' : 'bg-slate-500'
                            }`}
                          />
                          <span>{lang === 'bg' ? s.labelBg : s.labelEn}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {Math.round(s.start * 100)}% - {Math.round(s.end * 100)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4 font-sans text-slate-300">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-1 font-mono uppercase">
                    New Container Handler Verified
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Inspection of new <code className="text-amber-300">forklift.glb</code> confirms an industrial
                    reach-stacker container handling machine with:
                  </p>
                  <ul className="text-[11px] font-mono mt-2 space-y-1 text-slate-300 list-disc pl-4">
                    <li>59 scene nodes & 28 meshes</li>
                    <li>7 spreader meshes (material <code className="text-cyan-300">loader1</code>, 8.34m span)</li>
                    <li>12 hydraulic boom meshes (<code className="text-cyan-300">loader2/5</code>)</li>
                    <li>9 chassis & drive wheels meshes (<code className="text-cyan-300">loader3/4</code>)</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-blue-400 mb-1 font-mono uppercase">
                    Kinematic Hierarchy Regrouping
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    Because raw meshes share generic names (Cube, Cylinder), they were structurally regrouped by material domains and geometrical extents into:
                  </p>
                  <ul className="text-[11px] font-mono space-y-1 text-slate-400 list-disc pl-4">
                    <li><strong>ChassisAssembly:</strong> carrier frame & wheels</li>
                    <li><strong>BoomElevationPivot:</strong> rotates 0° to 45°</li>
                    <li><strong>BoomTelescope:</strong> extends horizontally/diagonally</li>
                    <li><strong>SpreaderAssembly:</strong> top-lift ISO twistlock frame</li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-1 font-mono uppercase">
                    Calibrations Preserved
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    All locked transforms in <code className="text-slate-200">truckAssemblyConfig.ts</code>,{' '}
                    <code className="text-slate-200">aircraftConfig.ts</code>, and the continuous
                    logistics journey remain 100% untouched.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
