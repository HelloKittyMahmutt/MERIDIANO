/**
 * ============================================================================
 * MERIDIANO — LOADING OPERATION CONTROLLER
 * ============================================================================
 * Deterministic scroll progress controller for the 9-stage container
 * loading sequence:
 *
 * 1. Approach container         (0.00 - 0.12)
 * 2. Align handling equipment    (0.12 - 0.22)
 * 3. Engage container           (0.22 - 0.30)
 * 4. Lift container             (0.30 - 0.44)
 * 5. Position over truck chassis(0.44 - 0.62)
 * 6. Lower container onto chassis(0.62 - 0.74)
 * 7. Release container          (0.74 - 0.82)
 * 8. Handler withdraws          (0.82 - 0.92)
 * 9. Truck departs              (0.92 - 1.00)
 *
 * CRITICAL INVARIANTS:
 * - Approved TruckAssembly calibration (APPROVED_TRUCK_ASSEMBLY_CONFIG) preserved
 * - Container NEVER teleports (C1 continuous world coordinates)
 * - Container NEVER floats unsupported (grounded -> spreader-held -> chassis-seated)
 * - Container scale is STRICTLY CONSTANT: [0.018, 0.00887, 0.00845] throughout
 * - Fully deterministic and reversible on scroll
 * ============================================================================
 */

import * as THREE from 'three';
import { APPROVED_TRUCK_ASSEMBLY_CONFIG } from './truckAssemblyConfig';
import { ReachStackerJoints } from './reachStackerArchitecture';

export type LoadingStageName =
  | 'APPROACH_CONTAINER'
  | 'ALIGN_EQUIPMENT'
  | 'ENGAGE_CONTAINER'
  | 'LIFT_CONTAINER'
  | 'POSITION_OVER_CHASSIS'
  | 'LOWER_ONTO_CHASSIS'
  | 'RELEASE_CONTAINER'
  | 'HANDLER_WITHDRAWS'
  | 'TRUCK_DEPARTS';

export interface StageDefinition {
  index: number;
  name: LoadingStageName;
  labelEn: string;
  labelBg: string;
  start: number;
  end: number;
  description: string;
}

export const LOADING_STAGES: StageDefinition[] = [
  {
    index: 1,
    name: 'APPROACH_CONTAINER',
    labelEn: '01 / Approach Container',
    labelBg: '01 / Приближаване към контейнера',
    start: 0.0,
    end: 0.12,
    description: 'Handling equipment advances to yard staging area where container is prepared.',
  },
  {
    index: 2,
    name: 'ALIGN_EQUIPMENT',
    labelEn: '02 / Align Handling Equipment',
    labelBg: '02 / Подравняване на оборудването',
    start: 0.12,
    end: 0.22,
    description: 'Top-lift spreader aligns precisely over top ISO corner castings.',
  },
  {
    index: 3,
    name: 'ENGAGE_CONTAINER',
    labelEn: '03 / Engage Container',
    labelBg: '03 / Заключване на контейнера',
    start: 0.22,
    end: 0.3,
    description: 'Twistlocks enter corner castings and rotate 90° into locked position.',
  },
  {
    index: 4,
    name: 'LIFT_CONTAINER',
    labelEn: '04 / Lift Container',
    labelBg: '04 / Повдигане на контейнера',
    start: 0.3,
    end: 0.44,
    description: 'Container is lifted smoothly and vertically to travel clearance height.',
  },
  {
    index: 5,
    name: 'POSITION_OVER_CHASSIS',
    labelEn: '05 / Position Over Chassis',
    labelBg: '05 / Позициониране над шасито',
    start: 0.44,
    end: 0.62,
    description: 'Boom rotates and swings container along smooth curve over waiting trailer chassis.',
  },
  {
    index: 6,
    name: 'LOWER_ONTO_CHASSIS',
    labelEn: '06 / Lower Onto Chassis',
    labelBg: '06 / Спускане върху шасито',
    start: 0.62,
    end: 0.74,
    description: 'Container descends vertically onto chassis twistlock bolsters with zero offset.',
  },
  {
    index: 7,
    name: 'RELEASE_CONTAINER',
    labelEn: '07 / Release Container',
    labelBg: '07 / Освобождаване на захвата',
    start: 0.74,
    end: 0.82,
    description: 'Twistlocks disengage and spreader clears container top by 35cm.',
  },
  {
    index: 8,
    name: 'HANDLER_WITHDRAWS',
    labelEn: '08 / Handler Withdraws',
    labelBg: '08 / Оттегляне на машината',
    start: 0.82,
    end: 0.92,
    description: 'Handling machine retracts boom and reverses to safe staging position.',
  },
  {
    index: 9,
    name: 'TRUCK_DEPARTS',
    labelEn: '09 / Truck Departs',
    labelBg: '09 / Потегляне на камиона',
    start: 0.92,
    end: 1.0,
    description: 'Calibrated truck assembly departs forward; wheels rotate synchronously.',
  },
];

/**
 * Smooth Hermite / cubic easing helper
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * World coordinate targets for the container and truck during loading
 */
export interface LoadingCoordinates {
  /** Truck base world position while parked during loading */
  truckBasePos: THREE.Vector3;
  /** Approved container offset on trailer chassis */
  containerOnChassisLocalPos: THREE.Vector3;
  /** Approved container scale */
  containerScale: THREE.Vector3;
  /** Ground staging position for container before lift */
  containerGroundStagingPos: THREE.Vector3;
  /** Clearance height container reaches during transit to trailer */
  clearanceHeightY: number;
}

export const LOADING_COORDINATES: LoadingCoordinates = {
  truckBasePos: new THREE.Vector3(0, 0, 0),
  containerOnChassisLocalPos: new THREE.Vector3(
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position[0],
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position[1],
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position[2]
  ),
  containerScale: new THREE.Vector3(
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[0],
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[1],
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale[2]
  ),
  // Yard staging point: offset in +Z by 5.5m beside trailer lane, grounded on support pads
  containerGroundStagingPos: new THREE.Vector3(
    APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position[0],
    0.38, // Ground level pad height
    5.4 // Lateral offset in staging bay
  ),
  clearanceHeightY: 3.5, // 3.5m clearance to comfortably clear trailer frame and side rails
};

/**
 * Output transform state computed deterministically for each frame
 */
export interface LoadingOperationFrameState {
  currentStage: StageDefinition;
  stageProgress: number; // 0..1 within current stage
  container: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    isSupported: boolean;
    supportMedium: 'GROUND_STAGING' | 'SPREADER_LOCKED' | 'CHASSIS_RESTING';
  };
  truck: {
    worldPosition: THREE.Vector3;
    wheelRotation: number;
    headlightsIntensity: number;
    brakeLightsIntensity: number;
  };
  handler: {
    rootPosition: THREE.Vector3;
    rootRotation: THREE.Euler;
    boomElevationRad: number;
    boomTelescopeMeters: number;
    spreaderWorldPos: THREE.Vector3;
    spreaderClearedDistance: number;
    twistlocksLocked: boolean;
  };
  camera: {
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  };
}

/**
 * Evaluates the loading operation state at any given scroll progress [0..1]
 * Guarantee: Strictly deterministic and reversible.
 */
export function evaluateLoadingOperation(progress: number): LoadingOperationFrameState {
  const p = Math.max(0, Math.min(1, progress));

  // Determine current active stage
  let stage = LOADING_STAGES[0];
  for (const s of LOADING_STAGES) {
    if (p >= s.start && p <= s.end) {
      stage = s;
      break;
    }
  }
  if (p >= 1.0) stage = LOADING_STAGES[LOADING_STAGES.length - 1];

  const stageProgress = (p - stage.start) / Math.max(0.0001, stage.end - stage.start);

  const {
    truckBasePos,
    containerOnChassisLocalPos,
    containerScale,
    containerGroundStagingPos,
    clearanceHeightY,
  } = LOADING_COORDINATES;

  // The locked target position on chassis
  const containerFinalChassisWorldPos = truckBasePos.clone().add(containerOnChassisLocalPos);

  const containerPos = new THREE.Vector3();
  const containerRot = new THREE.Euler(0, 0, 0);
  let supportMedium: 'GROUND_STAGING' | 'SPREADER_LOCKED' | 'CHASSIS_RESTING' = 'GROUND_STAGING';

  // Handler state
  const handlerPos = new THREE.Vector3();
  const handlerRot = new THREE.Euler(0, 0, 0);
  let boomElevation = 0.22; // ~12 degrees idle
  let boomExtension = 1.0;
  let twistlocksLocked = false;
  let spreaderClearedDistance = 0.0;

  // Truck state
  const truckWorldPos = truckBasePos.clone();
  let wheelRot = 0;
  let brakeIntensity = 1.0;
  let headIntensity = 0.3;

  // Camera choreography targets
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  let camFov = 42;

  // Stage 1 & 2: Grounded in yard staging
  if (p <= 0.22) {
    containerPos.copy(containerGroundStagingPos);
    supportMedium = 'GROUND_STAGING';

    // Handler approaches from distance (Z = 12m) to staging bay (Z = 8.5m)
    const t = smoothstep(0.0, 0.22, p);
    handlerPos.set(
      containerGroundStagingPos.x - 2.8,
      0,
      THREE.MathUtils.lerp(12.5, 8.8, t)
    );
    handlerRot.set(0, -Math.PI / 2 + 0.12 * (1 - t), 0);

    // Boom lowers spreader over container
    boomElevation = THREE.MathUtils.lerp(0.38, 0.28, t);
    boomExtension = THREE.MathUtils.lerp(1.2, 3.4, t);

    // Camera: establishing 3/4 low angle showing container, handler, and waiting truck in distance
    camPos.set(
      THREE.MathUtils.lerp(11.5, 9.8, t),
      THREE.MathUtils.lerp(2.4, 2.0, t),
      THREE.MathUtils.lerp(9.2, 7.8, t)
    );
    camTarget.set(containerGroundStagingPos.x, 1.6, containerGroundStagingPos.z);
    camFov = 44;
  }
  // Stage 3: Engagement
  else if (p <= 0.3) {
    const t = smoothstep(0.22, 0.3, p);
    containerPos.copy(containerGroundStagingPos);
    supportMedium = 'GROUND_STAGING';
    twistlocksLocked = t > 0.6; // locks during second half

    handlerPos.set(containerGroundStagingPos.x - 2.8, 0, 8.8);
    handlerRot.set(0, -Math.PI / 2, 0);
    boomElevation = THREE.MathUtils.lerp(0.28, 0.26, t);
    boomExtension = 3.4;

    // Camera: dramatic close-up of spreader locking mechanism
    camPos.set(
      THREE.MathUtils.lerp(9.8, 8.2, t),
      THREE.MathUtils.lerp(2.0, 2.6, t),
      THREE.MathUtils.lerp(7.8, 6.2, t)
    );
    camTarget.set(containerGroundStagingPos.x, 1.8, containerGroundStagingPos.z);
    camFov = 38;
  }
  // Stage 4: Lift container vertically
  else if (p <= 0.44) {
    const t = smoothstep(0.3, 0.44, p);
    twistlocksLocked = true;
    supportMedium = 'SPREADER_LOCKED';

    // Strictly vertical lift: X and Z unchanged, Y lifts smoothly
    containerPos.set(
      containerGroundStagingPos.x,
      THREE.MathUtils.lerp(containerGroundStagingPos.y, clearanceHeightY, t),
      containerGroundStagingPos.z
    );

    handlerPos.set(containerGroundStagingPos.x - 2.8, 0, 8.8);
    handlerRot.set(0, -Math.PI / 2, 0);
    boomElevation = THREE.MathUtils.lerp(0.26, 0.48, t);
    boomExtension = THREE.MathUtils.lerp(3.4, 4.0, t);

    // Camera tracks upward with the rising container
    camPos.set(
      THREE.MathUtils.lerp(8.2, 7.6, t),
      THREE.MathUtils.lerp(2.6, 3.8, t),
      THREE.MathUtils.lerp(6.2, 5.4, t)
    );
    camTarget.set(containerPos.x, containerPos.y * 0.7, containerPos.z);
    camFov = 40;
  }
  // Stage 5: Position over truck chassis
  else if (p <= 0.62) {
    const t = smoothstep(0.44, 0.62, p);
    twistlocksLocked = true;
    supportMedium = 'SPREADER_LOCKED';

    // Move along smooth arc from Z = 5.4 to Z = 0.0 (chassis centerline)
    // Maintain clearance height Y
    const currentZ = THREE.MathUtils.lerp(containerGroundStagingPos.z, containerFinalChassisWorldPos.z, t);
    const arcHeightOffset = Math.sin(t * Math.PI) * 0.35; // gentle parabolic crest
    containerPos.set(
      THREE.MathUtils.lerp(containerGroundStagingPos.x, containerFinalChassisWorldPos.x, t),
      clearanceHeightY + arcHeightOffset,
      currentZ
    );

    // Handler maneuvers vehicle base and boom
    handlerPos.set(
      containerGroundStagingPos.x - 2.8,
      0,
      THREE.MathUtils.lerp(8.8, 6.2, t)
    );
    handlerRot.set(0, THREE.MathUtils.lerp(-Math.PI / 2, -Math.PI / 2 - 0.15, t), 0);
    boomElevation = THREE.MathUtils.lerp(0.48, 0.42, t);
    boomExtension = THREE.MathUtils.lerp(4.0, 4.6, t);

    // Camera tracks across to show truck chassis alignment
    camPos.set(
      THREE.MathUtils.lerp(7.6, 9.2, t),
      THREE.MathUtils.lerp(3.8, 3.4, t),
      THREE.MathUtils.lerp(5.4, 2.8, t)
    );
    camTarget.set(containerPos.x, containerPos.y, containerPos.z);
    camFov = 42;
  }
  // Stage 6: Lower container onto chassis
  else if (p <= 0.74) {
    const t = smoothstep(0.62, 0.74, p);
    twistlocksLocked = true;
    supportMedium = t >= 0.95 ? 'CHASSIS_RESTING' : 'SPREADER_LOCKED';

    // Strictly vertical descent directly down onto chassis bolster
    containerPos.set(
      containerFinalChassisWorldPos.x,
      THREE.MathUtils.lerp(clearanceHeightY, containerFinalChassisWorldPos.y, t),
      containerFinalChassisWorldPos.z
    );

    handlerPos.set(containerGroundStagingPos.x - 2.8, 0, 6.2);
    handlerRot.set(0, -Math.PI / 2 - 0.15, 0);
    boomElevation = THREE.MathUtils.lerp(0.42, 0.29, t);
    boomExtension = 4.6;

    // Camera: precise low angle focusing on bolster lock alignment
    camPos.set(
      THREE.MathUtils.lerp(9.2, 8.4, t),
      THREE.MathUtils.lerp(3.4, 2.1, t),
      THREE.MathUtils.lerp(2.8, -1.2, t)
    );
    camTarget.set(containerFinalChassisWorldPos.x, 1.45, containerFinalChassisWorldPos.z);
    camFov = 38;
  }
  // Stage 7: Release container
  else if (p <= 0.82) {
    const t = smoothstep(0.74, 0.82, p);
    twistlocksLocked = false;
    supportMedium = 'CHASSIS_RESTING';

    // Container stays rock-solid on chassis
    containerPos.copy(containerFinalChassisWorldPos);

    // Spreader clears container top by 0.45m
    spreaderClearedDistance = THREE.MathUtils.lerp(0.0, 0.45, t);
    boomElevation = THREE.MathUtils.lerp(0.29, 0.35, t);
    boomExtension = THREE.MathUtils.lerp(4.6, 4.3, t);

    handlerPos.set(containerGroundStagingPos.x - 2.8, 0, 6.2);
    handlerRot.set(0, -Math.PI / 2 - 0.15, 0);

    camPos.set(8.4, 2.1, -1.2);
    camTarget.set(containerFinalChassisWorldPos.x, 1.45, containerFinalChassisWorldPos.z);
    camFov = 38;
  }
  // Stage 8: Handler withdraws
  else if (p <= 0.92) {
    const t = smoothstep(0.82, 0.92, p);
    twistlocksLocked = false;
    supportMedium = 'CHASSIS_RESTING';

    // Container remains locked on chassis
    containerPos.copy(containerFinalChassisWorldPos);

    // Handler backs up into staging area
    handlerPos.set(
      containerGroundStagingPos.x - 2.8,
      0,
      THREE.MathUtils.lerp(6.2, 12.0, t)
    );
    handlerRot.set(0, THREE.MathUtils.lerp(-Math.PI / 2 - 0.15, -Math.PI / 2, t), 0);
    boomElevation = THREE.MathUtils.lerp(0.35, 0.22, t);
    boomExtension = THREE.MathUtils.lerp(4.3, 1.2, t);
    spreaderClearedDistance = 0.45;

    // Truck starts engine: headlights turn on, brake lights release
    brakeIntensity = THREE.MathUtils.lerp(1.0, 0.0, t);
    headIntensity = THREE.MathUtils.lerp(0.3, 1.0, t);

    // Camera transitions smoothly to 3/4 hero front-side view of complete truck assembly
    camPos.set(
      THREE.MathUtils.lerp(8.4, -6.8, t),
      THREE.MathUtils.lerp(2.1, 1.85, t),
      THREE.MathUtils.lerp(-1.2, -7.5, t)
    );
    camTarget.set(1.5, 1.4, 0.0);
    camFov = 41;
  }
  // Stage 9: Truck departs
  else {
    const t = smoothstep(0.92, 1.0, p);
    twistlocksLocked = false;
    supportMedium = 'CHASSIS_RESTING';

    // Truck travels forward in -Z direction
    const travelDistance = t * 14.0;
    truckWorldPos.set(0, 0, -travelDistance);
    wheelRot = (travelDistance / 0.52) * Math.PI * 2; // radius ~0.52m
    brakeIntensity = 0.0;
    headIntensity = 1.0;

    // Container moves in absolute lockstep with truck!
    containerPos.set(
      containerFinalChassisWorldPos.x,
      containerFinalChassisWorldPos.y,
      containerFinalChassisWorldPos.z - travelDistance
    );

    // Handler parked in staging bay
    handlerPos.set(containerGroundStagingPos.x - 2.8, 0, 12.0);
    handlerRot.set(0, -Math.PI / 2, 0);
    boomElevation = 0.22;
    boomExtension = 1.2;
    spreaderClearedDistance = 0.45;

    // Dynamic tracking camera follows truck departure
    camPos.set(
      -6.8,
      1.85,
      -7.5 - travelDistance * 0.75
    );
    camTarget.set(1.5, 1.4, -travelDistance);
    camFov = 42;
  }

  // Calculated spreader world position for visualization/debugging/binding
  const spreaderWorldPos = new THREE.Vector3(
    containerPos.x,
    containerPos.y + 0.368 + spreaderClearedDistance, // Top surface + clearance
    containerPos.z
  );

  return {
    currentStage: stage,
    stageProgress,
    container: {
      position: containerPos,
      rotation: containerRot,
      scale: containerScale.clone(),
      isSupported: true,
      supportMedium,
    },
    truck: {
      worldPosition: truckWorldPos,
      wheelRotation: wheelRot,
      headlightsIntensity: headIntensity,
      brakeLightsIntensity: brakeIntensity,
    },
    handler: {
      rootPosition: handlerPos,
      rootRotation: handlerRot,
      boomElevationRad: boomElevation,
      boomTelescopeMeters: boomExtension,
      spreaderWorldPos,
      spreaderClearedDistance,
      twistlocksLocked,
    },
    camera: {
      position: camPos,
      target: camTarget,
      fov: camFov,
    },
  };
}

/**
 * Applies the calculated loading state to a reach-stacker joints hierarchy
 */
export function applyLoadingStateToReachStacker(
  joints: ReachStackerJoints,
  state: LoadingOperationFrameState
): void {
  joints.root.position.copy(state.handler.rootPosition);
  joints.root.rotation.copy(state.handler.rootRotation);

  if (joints.boomBasePivot) {
    joints.boomBasePivot.rotation.x = state.handler.boomElevationRad;
  }

  if (joints.boomTelescope1) {
    // Telescope along local Z or Y axis depending on model rigging
    joints.boomTelescope1.position.z = state.handler.boomTelescopeMeters;
  }

  if (joints.spreaderFrame) {
    // Keep spreader horizontal regardless of boom pitch
    joints.spreaderFrame.rotation.x = -state.handler.boomElevationRad;
    joints.spreaderFrame.position.y = -state.handler.spreaderClearedDistance;
  }

  if (joints.twistlocks) {
    joints.twistlocks.forEach((tl) => {
      tl.rotation.y = state.handler.twistlocksLocked ? Math.PI / 2 : 0;
    });
  }
}
