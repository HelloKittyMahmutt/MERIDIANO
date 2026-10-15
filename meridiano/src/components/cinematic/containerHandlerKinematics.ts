/**
 * ============================================================================
 * MERIDIANO — NEW CONTAINER HANDLER SPECIFICATION & REGROUPING CONTROLLER
 * ============================================================================
 * Inspection, kinematic regrouping, and joint extraction for the new
 * container-handling vehicle (public/models/forklift.glb).
 *
 * Model Structure:
 * - 59 nodes, 28 meshes, 5 material domains (loader1 - loader5)
 * - loader1 (7 meshes): Top-lift Container Spreader (8.34m span, twistlocks)
 * - loader2 & loader5 (12 meshes): Hydraulic Telescopic Boom & Lift Cylinders
 * - loader3 & loader4 (9 meshes): Heavy Carrier Chassis, Wheels & Operator Cab
 * ============================================================================
 */

import * as THREE from 'three';

export interface ContainerHandlerKinematics {
  root: THREE.Group;
  chassisAssembly: THREE.Group;
  boomAssembly: THREE.Group;
  boomTelescope: THREE.Group;
  spreaderAssembly: THREE.Group;
  boomElevationPivot: THREE.Group;
  wheels: THREE.Object3D[];
  setBoomPose: (elevationAngleRad: number, extensionDistance: number) => void;
  setSpreaderPose: (worldPos: THREE.Vector3, twistlockEngaged: boolean) => void;
}

export const HANDLER_CALIBRATION = {
  // Uniform scale to match container length (1.8745m) and chassis dimensions
  scale: 0.2247,
  // Rotation to align model: Native +X (Up) -> World +Y, Native +Z (Front) -> World -X, Native Y -> World -Z
  rotation: new THREE.Euler(-Math.PI / 2, -Math.PI / 2, 0, 'XYZ'),
  // Ground contact height offset
  groundYOffset: 1.128,
  // Spreader dimensions
  spreaderLength: 1.8745,
  spreaderWidth: 0.481,
};

/**
 * Builds the kinematic hierarchy from raw GLTF scene nodes
 */
export function assembleContainerHandler(rawGltfScene: THREE.Group): ContainerHandlerKinematics {
  const handlerRoot = new THREE.Group();
  handlerRoot.name = 'ContainerHandlerRoot';

  // Kinematic sub-assemblies
  const chassisAssembly = new THREE.Group();
  chassisAssembly.name = 'ChassisAssembly';

  const boomAssembly = new THREE.Group();
  boomAssembly.name = 'BoomAssembly';

  const boomTelescope = new THREE.Group();
  boomTelescope.name = 'BoomTelescope';

  const spreaderAssembly = new THREE.Group();
  spreaderAssembly.name = 'SpreaderAssembly';

  const boomElevationPivot = new THREE.Group();
  boomElevationPivot.name = 'BoomElevationPivot';

  const wheels: THREE.Object3D[] = [];

  // Material classification mapping
  // Node 4, 6, 8, 44, 46, 48, 50 -> loader1 (Spreader)
  // Node 10, 12, 14, 16, 18, 20, 34, 40, 42, 54, 56, 58 -> loader2 & loader5 (Boom)
  // Node 22, 24, 26, 28, 30, 32, 36, 38, 52 -> loader3 & loader4 (Chassis & Wheels)

  // Move meshes into appropriate functional groups
  const nodesToRehome: { obj: THREE.Object3D; target: THREE.Group }[] = [];

  rawGltfScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const matName = (mesh.material as THREE.Material)?.name || '';
      const nodeName = mesh.name;

      if (matName === 'loader1' || nodeName.includes('loader1')) {
        nodesToRehome.push({ obj: mesh.parent || mesh, target: spreaderAssembly });
      } else if (
        matName === 'loader2' ||
        matName === 'loader5' ||
        nodeName.includes('loader2') ||
        nodeName.includes('loader5')
      ) {
        if (nodeName.includes('Cube.006') || nodeName.includes('Cube.005') || nodeName.includes('Cube.033')) {
          nodesToRehome.push({ obj: mesh.parent || mesh, target: boomTelescope });
        } else {
          nodesToRehome.push({ obj: mesh.parent || mesh, target: boomAssembly });
        }
      } else {
        nodesToRehome.push({ obj: mesh.parent || mesh, target: chassisAssembly });
        if (nodeName.includes('Cylinder.005') || nodeName.includes('Cylinder.009')) {
          wheels.push(mesh);
        }
      }
    }
  });

  // Rehome unique parents to avoid duplicates
  const seenParents = new Set<THREE.Object3D>();
  nodesToRehome.forEach(({ obj, target }) => {
    if (!seenParents.has(obj)) {
      seenParents.add(obj);
      target.add(obj);
    }
  });

  // Assemble hierarchy:
  // handlerRoot
  //  ├── chassisAssembly
  //  └── boomElevationPivot
  //       └── boomAssembly
  //            └── boomTelescope
  //                 └── spreaderAssembly
  boomTelescope.add(spreaderAssembly);
  boomAssembly.add(boomTelescope);
  boomElevationPivot.add(boomAssembly);

  handlerRoot.add(chassisAssembly);
  handlerRoot.add(boomElevationPivot);

  // Apply base orientation & scale
  handlerRoot.rotation.copy(HANDLER_CALIBRATION.rotation);
  handlerRoot.scale.setScalar(HANDLER_CALIBRATION.scale);

  return {
    root: handlerRoot,
    chassisAssembly,
    boomAssembly,
    boomTelescope,
    spreaderAssembly,
    boomElevationPivot,
    wheels,
    setBoomPose: (elevationAngleRad: number, extensionDistance: number) => {
      boomElevationPivot.rotation.y = elevationAngleRad;
      boomTelescope.position.z = extensionDistance;
    },
    setSpreaderPose: (worldPos: THREE.Vector3, twistlockEngaged: boolean) => {
      // Direct positioning helper
      spreaderAssembly.position.copy(worldPos);
      spreaderAssembly.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m && m.emissive) {
            if (twistlockEngaged) {
              m.emissive.setHex(0x10b981);
              m.emissiveIntensity = 0.8;
            } else {
              m.emissive.setHex(0x000000);
              m.emissiveIntensity = 0.0;
            }
          }
        }
      });
    },
  };
}
