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
/** Mounts the lettering inside the moving container, never on the truck or scene. */
export function attachMeridianoWordmark(container: THREE.Group): void {
  if (typeof document === 'undefined') return;
  // Call before applying the container group's nonuniform scale / rotation.
  container.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(container);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const longIsX = size.x >= size.z;
  const length = longIsX ? size.x : size.z;
  const depth = longIsX ? size.z : size.x;
  if (length < 0.01 || size.y < 0.01) return;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 335px Montserrat, Arial, sans-serif';
  const measured = ctx.measureText('MERIDIANO').width;
  if (measured > 1930) ctx.font = `800 ${Math.floor(335 * 1930 / measured)}px Montserrat, Arial, sans-serif`;
  ctx.fillText('MERIDIANO', 1024, 260);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const width = length * 0.92;
  const height = Math.min(size.y * 0.58, width * 512 / 2048);
  const offset = depth / 2 + Math.max(depth * 0.012, 0.001);
  for (const side of [-1, 1]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    label.name = 'MERIDIANO_Container_Wordmark';
    if (longIsX) {
      label.position.set(center.x, center.y + size.y * 0.02, center.z + side * offset);
      if (side < 0) label.rotation.y = Math.PI;
    } else {
      label.position.set(center.x + side * offset, center.y + size.y * 0.02, center.z);
      label.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    container.add(label);
  }
}

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
    if (['object3','object3001','object3002'].includes(child.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())) {
      wheelNodes.push(child);
      // Neutralize front steering: reset Z steering angle from -45 deg to 0 so wheels point straight forward
      child.rotation.set(-Math.PI / 2, 0, 0, 'XYZ');
    }

    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      // Apply one coherent palette to every truck material, whether the
      // original mesh has a single material or a material array. Preserve
      // glass, lights, wheels and metallic trim rather than painting them navy.
      const repaint = (original: THREE.Material): THREE.Material => {
        const mat = original.clone();
        mat.side = THREE.DoubleSide;
        if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
        const name = (mat.name || '').toLowerCase();
        if (/glass|light|loght|tyre|tire|rim|hub|wheel/.test(name)) return mat;
        if (/metalic|metallic/.test(name)) {
          mat.color.set(0x929da5);
          mat.metalness = 0.72;
          mat.roughness = 0.36;
        } else if (/dark|material|back_trailor|chassis|frame/.test(name)) {
          mat.color.set(0x202832);
          mat.metalness = 0.3;
          mat.roughness = 0.57;
        } else {
          // Clean white cab/body panels; the container remains navy.
          mat.color.set(0xf0f2f3);
          mat.metalness = 0.24;
          mat.roughness = 0.53;
        }
        return mat;
      };
      m.material = Array.isArray(m.material)
        ? m.material.map(repaint)
        : repaint(m.material);
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
    const spinAngle = distanceTravelled / wheelRadius;
    wheelNodes.forEach((wheel) => {
      // Rotate around local axle (X axis) preserving neutral straight steering (Y=0, Z=0)
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
  attachMeridianoWordmark(containerGroup);
  containerGroup.scale.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.scale);
  containerGroup.position.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.position);
  containerGroup.rotation.set(...APPROVED_TRUCK_ASSEMBLY_CONFIG.container.rotation);
  truckAssembly.add(containerGroup);

  return truckAssembly;
}
