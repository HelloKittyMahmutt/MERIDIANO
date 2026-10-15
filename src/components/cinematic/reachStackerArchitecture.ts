/**
 * ============================================================================
 * MERIDIANO — REACH-STACKER ARCHITECTURE & SPECIFICATION
 * ============================================================================
 * Dedicated container-handling vehicle architecture specification for
 * full-size 40-foot and 20-foot intermodal shipping containers.
 *
 * Replaces warehouse counterbalance forklift with a realistic heavy-duty
 * port/terminal reach stacker (e.g., Kalmar Gloria, Konecranes, Liebherr).
 * ============================================================================
 */

import * as THREE from 'three';

/**
 * Expected Reach Stacker GLTF node hierarchy and kinematics joints.
 * When the GLB model is loaded, the loader binds these nodes by name.
 */
export interface ReachStackerJoints {
  /** Root transform for vehicle body and positioning */
  root: THREE.Object3D;
  /** Heavy chassis / carriage frame */
  chassis?: THREE.Object3D;
  /** Front drive axle and heavy dual wheels (can rotate with travel distance) */
  frontWheels?: THREE.Object3D[];
  /** Rear steering axle and wheels (steers during cornering/approach) */
  rearSteerWheels?: THREE.Object3D[];
  /** Operator cab (often hydraulically sliding for visibility) */
  cabin?: THREE.Object3D;
  /** Main boom elevation pivot: rotates around local X-axis (0° to +60°) */
  boomBasePivot: THREE.Object3D;
  /** Primary telescopic boom arm: translates along local boom forward axis (+Z or +Y) */
  boomTelescope1: THREE.Object3D;
  /** Secondary telescopic stage (if 3-stage boom) */
  boomTelescope2?: THREE.Object3D;
  /** Spreader head attachment / slew ring: rotates around local Y-axis (yaw ±15°) */
  headRotator: THREE.Object3D;
  /** Spreader pitch/roll dampener: stabilizes container swing */
  spreaderDampener?: THREE.Object3D;
  /** Main top-lift spreader beam (engages top ISO corner castings) */
  spreaderFrame: THREE.Object3D;
  /** Left telescoping arm (adjusts between 20ft and 40ft lock positions) */
  spreaderArmLeft?: THREE.Object3D;
  /** Right telescoping arm */
  spreaderArmRight?: THREE.Object3D;
  /** Four ISO 1161 twistlock pins at the four corners */
  twistlocks?: THREE.Object3D[];
}

/**
 * Physical dimensions and mechanical constraints of an industrial reach stacker
 */
export const REACH_STACKER_PHYSICAL_SPECS = {
  /** Total unladen operating weight: ~70 to 85 metric tons */
  operatingWeightTons: 78,
  /** Rated lift capacity: 45 metric tons (first row), 31 tons (second row) */
  maxLiftCapacityTons: 45,
  /** Wheelbase: ~6.0m to 6.5m */
  wheelbaseMeters: 6.4,
  /** Overall width across drive tires: ~4.15m */
  overallWidthMeters: 4.15,
  /** Overall machine length (boom retracted, horizontal): ~11.5m */
  overallLengthMeters: 11.8,
  /** Boom elevation angle range: min 0° (horizontal transport), max 60° (high stacking) */
  boomElevationDegMin: 0,
  boomElevationDegMax: 60,
  /** Telescopic boom stroke: 0.0m (fully retracted) to 7.0m (extended) */
  boomTelescopeStrokeMeters: 7.0,
  /** Spreader length presets: 20ft (6.06m) and 40ft (12.19m) */
  spreaderWidthMeters: 2.44,
  spreaderLength40ftMeters: 12.19,
  /** Boom base pivot coordinate relative to machine origin */
  boomPivotLocalOffset: new THREE.Vector3(0, 2.85, -2.1),
} as const;

/**
 * Node naming convention searched when loading reach-stacker.glb
 */
export const REACH_STACKER_NODE_CANDIDATE_NAMES = {
  boomPivot: ['Boom_Pivot', 'boom_pivot', 'BoomBase', 'Arm_Pivot', 'Mast_Pivot', 'Boom_01'],
  boomTelescope: ['Boom_Telescope', 'boom_telescope', 'Boom_Extend', 'Boom_02', 'Arm_Extend'],
  headRotator: ['Head_Rotator', 'head_rotator', 'Spreader_Mount', 'Rotator', 'Head_Yaw'],
  spreaderFrame: ['Spreader', 'spreader', 'Spreader_Frame', 'TopLift', 'Container_Spreader'],
  frontWheels: ['Wheel_FL', 'Wheel_FR', 'Front_Wheels', 'FrontWheels', 'Wheels_Drive'],
  rearWheels: ['Wheel_RL', 'Wheel_RR', 'Rear_Wheels', 'RearWheels', 'Wheels_Steer'],
} as const;

/**
 * Architecture binder helper: scans loaded GLTF object hierarchy and extracts joints
 */
export function bindReachStackerJoints(root: THREE.Object3D): ReachStackerJoints {
  const joints: ReachStackerJoints = {
    root,
    boomBasePivot: new THREE.Object3D(),
    boomTelescope1: new THREE.Object3D(),
    headRotator: new THREE.Object3D(),
    spreaderFrame: new THREE.Object3D(),
  };

  root.traverse((child) => {
    const nameLower = child.name.toLowerCase();
    if (
      !joints.boomBasePivot.parent &&
      REACH_STACKER_NODE_CANDIDATE_NAMES.boomPivot.some((n) => nameLower.includes(n.toLowerCase()))
    ) {
      joints.boomBasePivot = child;
    } else if (
      !joints.boomTelescope1.parent &&
      REACH_STACKER_NODE_CANDIDATE_NAMES.boomTelescope.some((n) => nameLower.includes(n.toLowerCase()))
    ) {
      joints.boomTelescope1 = child;
    } else if (
      !joints.headRotator.parent &&
      REACH_STACKER_NODE_CANDIDATE_NAMES.headRotator.some((n) => nameLower.includes(n.toLowerCase()))
    ) {
      joints.headRotator = child;
    } else if (
      !joints.spreaderFrame.parent &&
      REACH_STACKER_NODE_CANDIDATE_NAMES.spreaderFrame.some((n) => nameLower.includes(n.toLowerCase()))
    ) {
      joints.spreaderFrame = child;
    }
  });

  return joints;
}
