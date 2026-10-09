import * as THREE from 'three';

// ============================================================================
// LOCKED APPROVED TRUCK ASSEMBLY CONFIGURATION
// Exactly calibrated relative transforms for:
// TruckAssembly
//  ├── Truck
//  ├── Chassis
//  └── Container
// ============================================================================

export interface TruckComponentTransform {
  scale: number | [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface ApprovedTruckAssemblyConfig {
  truck: {
    scale: number;
    position: [number, number, number];
    rotation: [number, number, number];
  };
  chassis: {
    scale: number;
    position: [number, number, number];
    rotation: [number, number, number];
  };
  container: {
    scale: [number, number, number];
    position: [number, number, number];
    rotation: [number, number, number];
  };
}

// STRICTLY LOCKED APPROVED CONFIGURATION VALUES:
export const APPROVED_TRUCK_ASSEMBLY_CONFIG: ApprovedTruckAssemblyConfig = {
  truck: {
    scale: 0.158,
    position: [-1, 0.01, 0],
    rotation: [0, -Math.PI / 2, 0],
  },
  chassis: {
    scale: 0.98,
    position: [-0.15, -0.01, 0],
    rotation: [0, 0, 0],
  },
  container: {
    scale: [0.018, 0.00887, 0.00845],
    position: [4.9, 1.41, 0],
    rotation: [0, 0, 0],
  },
};

/**
 * Builds the exact approved TruckAssembly parent group.
 * Sub-groups are created with the exact locked transforms.
 * Only TruckAssembly may be transformed or moved by the cinematic timeline.
 */
export function buildApprovedTruckAssembly(
  rawTruck: THREE.Group,
  rawChassis: THREE.Group,
  rawContainer: THREE.Group
): THREE.Group {
  const truckAssembly = new THREE.Group();
  truckAssembly.name = 'TruckAssembly';

  // 1. Truck Sub-Group
  const truckGroup = new THREE.Group();
  truckGroup.name = 'Truck';
  const tBox = new THREE.Box3().setFromObject(rawTruck);
  const tCenter = tBox.getCenter(new THREE.Vector3());
  rawTruck.position.set(-tCenter.x, -tBox.min.y, 0);

  // Wheel identification & steering neutralization
  const wheelNodes: THREE.Object3D[] = [];
  rawTruck.traverse((child) => {
    // Identify wheel axle assemblies (Object_3 = rear tandem, Object_3.001 = front right, Object_3.002 = front left)
    if (child.name === 'Object_3' || child.name === 'Object_3.001' || child.name === 'Object_3.002') {
      wheelNodes.push(child);
      // Neutralize front steering: reset Z steering angle from -45 deg to 0 so wheels point straight forward
      child.rotation.set(-Math.PI / 2, 0, 0, 'XYZ');
    }

    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => {
          if ('color' in mat && !mat.name?.includes('Light') && !mat.name?.includes('Glass')) {
            (mat as THREE.MeshStandardMaterial).color.set(0x22262d);
            (mat as THREE.MeshStandardMaterial).roughness = 0.45;
          }
          mat.side = THREE.DoubleSide;
        });
      } else if (m.material) {
        m.material.side = THREE.DoubleSide;
      }
    }
  });

  truckGroup.add(rawTruck);
  truckGroup.scale.setScalar(APPROVED_TRUCK_ASSEMBLY_CONFIG.truck.scale);
  truckGroup.position.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.truck.position);
  truckGroup.rotation.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.truck.rotation);
  truckAssembly.add(truckGroup);

  // Attach wheel spin controller to truckAssembly
  // Wheel radius in world coordinates is 0.57m
  truckAssembly.userData.wheelNodes = wheelNodes;
  truckAssembly.userData.setWheelSpin = (distanceTravelled: number) => {
    const wheelRadius = 0.57; // meters
    const spinAngle = -(distanceTravelled / wheelRadius);
    wheelNodes.forEach((wheel) => {
      // Rotate around local axle (X axis) preserving neutral straight steering
      wheel.rotation.set(-Math.PI / 2 + spinAngle, 0, 0, 'XYZ');
    });
  };

  // 2. Chassis Sub-Group
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'Chassis';
  const chBox = new THREE.Box3().setFromObject(rawChassis);
  const chCenter = chBox.getCenter(new THREE.Vector3());
  rawChassis.position.set(0, -chBox.min.y, -chCenter.z);
  rawChassis.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.material = new THREE.MeshStandardMaterial({
        color: 0x1e242d,
        roughness: 0.4,
        metalness: 0.65,
        side: THREE.DoubleSide,
      });
    }
  });
  chassisGroup.add(rawChassis);
  chassisGroup.scale.setScalar(APPROVED_TRUCK_ASSEMBLY_CONFIG.chassis.scale);
  chassisGroup.position.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.chassis.position);
  chassisGroup.rotation.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.chassis.rotation);
  truckAssembly.add(chassisGroup);

  // 3. Container Sub-Group
  const containerGroup = new THREE.Group();
  containerGroup.name = 'Container';
  const contBox = new THREE.Box3().setFromObject(rawContainer);
  const cCenter = contBox.getCenter(new THREE.Vector3());
  rawContainer.position.set(-cCenter.x, -contBox.min.y, -cCenter.z);
  rawContainer.traverse((child) => {
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
  containerGroup.add(rawContainer);
  containerGroup.scale.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale);
  containerGroup.position.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position);
  containerGroup.rotation.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.rotation);
  truckAssembly.add(containerGroup);

  return truckAssembly;
}
