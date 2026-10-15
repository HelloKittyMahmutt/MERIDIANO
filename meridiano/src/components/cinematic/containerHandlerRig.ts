import * as THREE from 'three';

/**
 * ============================================================================
 * MERIDIANO — CONTAINER HANDLER RIGID REGROUPING & KINEMATICS
 * ============================================================================
 * Inspects public/models/forklift.glb (reach-stacker container handler),
 * identifies actual FRONT vs REAR, and provides the articulated rig.
 *
 * Geometry truth from mesh analysis:
 * - Counterweight ballast: Cube.008 at Z = -10.2 (REAR)
 * - Cabin: Cube.010 at Z = -1.8 (DRIVER CAB)
 * - Drive wheels / Axle: loader4 at Z ~ 0.0 (FRONT DRIVE AXLE)
 * - Boom tip & Spreader mount: Cylinder.001 at Z = +25.5 (FRONT)
 * - Top-lift Spreader: loader1 span = 8.34m along Y (SPREADER BEAM)
 * - Machine Up: +X in raw coordinates (lowest tire contact at X = -5.02)
 *
 * To align the reach stacker facing the container with spreader aligned:
 * - Machine Up (+X) maps to World +Y
 * - Machine Front (+Z) maps to World -X (advancing toward container)
 * - Machine Lateral (Y) maps to World -Z (aligns with container length along Z)
 * Orientation rotation: Euler(-Math.PI / 2, -Math.PI / 2, 0, 'XYZ')
 * Scale factor: 22.469 (spreader span = 1.8745m matching container length)
 * ============================================================================
 */

export interface ContainerHandlerRig {
  root: THREE.Group;
  chassis: THREE.Group;
  boomElevationPivot: THREE.Group;
  boomTelescope: THREE.Group;
  spreader: THREE.Group;
  wheels: THREE.Object3D[];
  setBoomPose: (elevationAngleRad: number, extensionDistance: number) => void;
  setSpreaderPose: (worldPos: THREE.Vector3, twistlocksLocked: boolean) => void;
}

export const HANDLER_ORIENTATION = {
  rotation: new THREE.Euler(-Math.PI / 2, -Math.PI / 2, 0, 'XYZ'),
  scale: 0.2247,
  groundYOffset: 1.128,
};

export function buildContainerHandlerRig(rawGltfScene: THREE.Group): ContainerHandlerRig {
  const root = new THREE.Group();
  root.name = 'ContainerHandlerRig';

  const chassis = new THREE.Group();
  chassis.name = 'Chassis';

  const boomElevationPivot = new THREE.Group();
  boomElevationPivot.name = 'BoomElevationPivot';

  const boomTelescope = new THREE.Group();
  boomTelescope.name = 'BoomTelescope';

  const spreader = new THREE.Group();
  spreader.name = 'Spreader';

  const wheels: THREE.Object3D[] = [];

  const nodesToRehome: { obj: THREE.Object3D; target: THREE.Group }[] = [];

  rawGltfScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const matName = (mesh.material as THREE.Material)?.name || '';
      const nodeName = mesh.name;

      // loader1 is Top-lift Spreader
      if (matName === 'loader1' || nodeName.includes('loader1')) {
        nodesToRehome.push({ obj: mesh.parent || mesh, target: spreader });
      }
      // loader2 & loader5 are Boom sections
      else if (
        matName === 'loader2' ||
        matName === 'loader5' ||
        nodeName.includes('loader2') ||
        nodeName.includes('loader5')
      ) {
        if (nodeName.includes('Cube.006') || nodeName.includes('Cube.005') || nodeName.includes('Cube.033')) {
          nodesToRehome.push({ obj: mesh.parent || mesh, target: boomTelescope });
        } else {
          nodesToRehome.push({ obj: mesh.parent || mesh, target: boomElevationPivot });
        }
      }
      // loader3 & loader4 are Chassis, Wheels, and Cab
      else {
        nodesToRehome.push({ obj: mesh.parent || mesh, target: chassis });
        if (nodeName.includes('Cylinder.005') || nodeName.includes('Cylinder.009')) {
          wheels.push(mesh);
        }
      }
    }
  });

  const seenParents = new Set<THREE.Object3D>();
  nodesToRehome.forEach(({ obj, target }) => {
    if (!seenParents.has(obj)) {
      seenParents.add(obj);
      target.add(obj);
    }
  });

  boomElevationPivot.add(boomTelescope);
  boomTelescope.add(spreader);

  root.add(chassis);
  root.add(boomElevationPivot);

  root.rotation.copy(HANDLER_ORIENTATION.rotation);
  root.scale.setScalar(HANDLER_ORIENTATION.scale);

  return {
    root,
    chassis,
    boomElevationPivot,
    boomTelescope,
    spreader,
    wheels,
    setBoomPose: (elevationAngleRad: number, extensionDistance: number) => {
      // In native model space, Y is the lateral hinge axis (rotation around Y elevates along +X / world +Y)
      boomElevationPivot.rotation.y = elevationAngleRad;
      boomTelescope.position.z = extensionDistance;
    },
    setSpreaderPose: (worldPos: THREE.Vector3, twistlocksLocked: boolean) => {
      spreader.position.copy(worldPos);
      spreader.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m && m.emissive) {
            if (twistlocksLocked) {
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
