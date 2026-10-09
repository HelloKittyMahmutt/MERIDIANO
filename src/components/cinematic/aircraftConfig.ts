import * as THREE from 'three';

// ============================================================================
// APPROVED AIRCRAFT CALIBRATION CONFIGURATION
// Holds permanent native GLB orientation correction in OrientationCorrection,
// while AircraftRig handles cinematic flight path, altitude, and banking.
//
// Native GLB Coordinate System Analysis:
// - Nose-to-Tail axis: Y axis (Nose at -Y: ~234.8m, Tail at +Y: ~3026.5m)
// - Wingtip-to-Wingtip axis: X axis (Left wing: -316.4m, Right wing: +2289.2m, Center: 986.4m)
// - Aircraft Up/Vertical axis: Z axis (Bottom: 0m, Vertical stabilizer tip: 770m)
//
// Approved Level-Flight Orientation Correction:
// - Pitch (X): -90.0° (-Math.PI / 2) -> aligns native +Z (Up) to world +Y (Up)
// - Yaw (Y): 0.0°
// - Roll (Z): 180.0° (Math.PI) -> aligns native -Y (Nose) to world -Z (Forward)
// - Scale: 0.02495 -> scales raw wingspan (2605.5m) to authentic 65.01m wingspan
// ============================================================================

export interface AircraftCalibrationConfig {
  orientationCorrection: {
    rotationDeg: [number, number, number]; // [rotX, rotY, rotZ] in degrees
    rotationRad: [number, number, number]; // [rotX, rotY, rotZ] in radians
    scale: number;
    rawCenterOffset: [number, number, number]; // [-centerX, -centerY, -centerZ]
  };
  rig: {
    position: [number, number, number];
    rotationDeg: [number, number, number];
  };
  cameraPresets: {
    cinematic34: { position: [number, number, number]; target: [number, number, number]; fov: number };
    front: { position: [number, number, number]; target: [number, number, number]; fov: number };
    side: { position: [number, number, number]; target: [number, number, number]; fov: number };
    top: { position: [number, number, number]; target: [number, number, number]; fov: number };
  };
}

// APPROVED CONFIGURATION - SOURCE OF TRUTH
export const APPROVED_AIRCRAFT_CONFIG: AircraftCalibrationConfig = {
  orientationCorrection: {
    rotationDeg: [-90, 0, 180],
    rotationRad: [-Math.PI / 2, 0, Math.PI],
    scale: 0.02495, // 65.01m wingspan
    rawCenterOffset: [-986.40, -1630.68, -384.98],
  },
  rig: {
    position: [0, 122.0, -340.0],
    rotationDeg: [0, 0, 0],
  },
  cameraPresets: {
    cinematic34: {
      position: [-45, 14, 52],
      target: [0, 0, 0],
      fov: 38,
    },
    front: {
      position: [0, 1.5, -58],
      target: [0, 0, 0],
      fov: 40,
    },
    side: {
      position: [-65, 0, 0],
      target: [0, 0, 0],
      fov: 36,
    },
    top: {
      position: [0, 75, 0],
      target: [0, 0, 0],
      fov: 42,
    },
  },
};

// Legacy interface export for backward compatibility with CinematicScrollExperience
export interface AircraftOrientationConfig {
  scale: number;
  baseOrientation: [number, number, number];
  initialPosition: [number, number, number];
}

export const AIRCRAFT_ORIENTATION_CONFIG: AircraftOrientationConfig = {
  scale: APPROVED_AIRCRAFT_CONFIG.orientationCorrection.scale,
  baseOrientation: APPROVED_AIRCRAFT_CONFIG.orientationCorrection.rotationRad,
  initialPosition: APPROVED_AIRCRAFT_CONFIG.rig.position,
};

/**
 * Builds the canonical aircraft rig conforming strictly to:
 * AircraftRig
 *   └── OrientationCorrection
 *        └── RawCargoPlane
 */
export function buildCalibratedAircraftRig(
  rawPlane: THREE.Group,
  config: AircraftCalibrationConfig = APPROVED_AIRCRAFT_CONFIG
): { rig: THREE.Group; orientationCorrection: THREE.Group } {
  // 1. RawCargoPlane with internal center offset
  rawPlane.name = 'RawCargoPlane';
  rawPlane.position.set(...config.orientationCorrection.rawCenterOffset);

  // Double-side all CAD meshes and enable shadow casting/receiving
  rawPlane.traverse((child) => {
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

  // 2. OrientationCorrection child wrapper
  const orientationCorrection = new THREE.Group();
  orientationCorrection.name = 'OrientationCorrection';
  orientationCorrection.add(rawPlane);
  orientationCorrection.scale.setScalar(config.orientationCorrection.scale);
  orientationCorrection.rotation.set(...config.orientationCorrection.rotationRad);

  // 3. AircraftRig parent group
  const rig = new THREE.Group();
  rig.name = 'AircraftRig';
  rig.add(orientationCorrection);
  rig.position.set(...config.rig.position);

  return { rig, orientationCorrection };
}
