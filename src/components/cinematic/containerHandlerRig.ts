import * as THREE from 'three';

/** The same 13 real meshes and three hidden artifacts approved in the isolated test.
 * No artificial chain/pulley meshes, boom tilting, or parent rehoming by material. */
export interface ContainerHandlerRig {
  root: THREE.Group;
  chassis: THREE.Group;
  boomElevationPivot: THREE.Group;
  boomTelescope: THREE.Group;
  spreader: THREE.Group;
  wheels: THREE.Object3D[];
  setWheelTravel: (distanceMetres: number) => void;
  setBoomPose: (elevationAngleRad: number, extensionDistance: number) => void;
  setSpreaderPose: (worldPos: THREE.Vector3, twistlocksLocked: boolean) => void;
  alignSpreaderTo: (x: number, z: number, approachOffset?: number) => void;
}

const MOVING_NAMES = [
  'Cube_loader1_0', 'Cube.001_loader1_0', 'Cube.002_loader1_0',
  'Cube.014_loader1_0', 'Cube.015_loader1_0', 'Cylinder.007_loader1_0',
  'Cube.003_loader2_0', 'Cube.004_loader2_0',
  'Cube.013_loader2_0', 'Cylinder.006_loader2_0',
  'Cube.011_loader5_0', 'Cube.006_loader5_0', 'Cube.007_loader5_0',
];
const HIDDEN_NAMES = [
  'Cylinder.005_loader4_0', 'Cylinder.009_loader4_0', 'Cylinder.019_loader5_0',
];
const norm = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export function buildContainerHandlerRig(model: THREE.Group): ContainerHandlerRig {
  const root = new THREE.Group();
  root.name = 'ApprovedContainerHandler';
  const chassis = new THREE.Group();
  chassis.name = 'StationaryMastAndChassis';
  const moving = new THREE.Group();
  moving.name = 'Approved13PieceCarriageAndSpreader';
  root.add(chassis, moving);
  chassis.add(model);
  // Match the real spreader end-to-end span (8.3423 model units) to the
  // staged 40-foot container's 12.0400m long side. This scales the entire
  // handler uniformly, leaving the approved 13-piece lifting rig untouched.
  root.scale.setScalar(1.4433);
  // Model is already Y-up. +X is the spreader/front; turn it toward the truck (-X).
  root.rotation.y = Math.PI;
  root.updateMatrixWorld(true);
  const all: THREE.Object3D[] = [];
  model.traverse(o => all.push(o));
  const hidden = new Set(HIDDEN_NAMES.map(norm));
  all.forEach(o => {
    if ((o as THREE.Mesh).isMesh) {
      o.visible = !hidden.has(norm(o.name));
      (o as THREE.Mesh).castShadow = true;
      (o as THREE.Mesh).receiveShadow = true;
    }
  });
  let matched = 0;
  for (const name of MOVING_NAMES) {
    const mesh = all.find(o => (o as THREE.Mesh).isMesh && norm(o.name) === norm(name));
    if (mesh) { moving.attach(mesh); matched++; }
  }
  if (matched !== MOVING_NAMES.length) console.warn(`MERIDIANO: only ${matched}/13 approved moving meshes found`);
  root.updateMatrixWorld(true);
  // The original GLB combines all four tires in one Cylinder.003 mesh.
  // Split its triangles into four real tire assemblies, preserving their
  // original textured geometry and transform, then spin each around its axle.
  const wheelPivots: THREE.Group[] = [];
  const combinedTires = all.find(o => (o as THREE.Mesh).isMesh && norm(o.name) === norm('Cylinder.003_loader3_0')) as THREE.Mesh | undefined;
  if (combinedTires && combinedTires.geometry instanceof THREE.BufferGeometry) {
    const original = combinedTires.geometry;
    const expanded = original.index ? original.toNonIndexed() : original.clone();
    const position = expanded.getAttribute('position');
    const wheelCenters = [-0.53792, 3.15761];
    const wheelY = -0.40801;
    const attrs = Object.keys(expanded.attributes);
    // The wheel sub-meshes are disconnected components arranged in a 2x2 grid.
    // Only split when their geometry matches the known original four-wheel mesh.
    if (position && position.count % 3 === 0 && position.count > 5000) {
      const buffers = Array.from({length: 4}, () => Object.fromEntries(attrs.map(k => [k, [] as number[]])) as Record<string, number[]>);
      const materialForFace: number[] = [];
      const groups = expanded.groups;
      const faceMaterial = (start: number) => groups.find(g => start >= g.start && start < g.start + g.count)?.materialIndex ?? 0;
      for (let i = 0; i < position.count; i += 3) {
        const x = (position.getX(i) + position.getX(i+1) + position.getX(i+2))/3;
        const z = (position.getZ(i) + position.getZ(i+1) + position.getZ(i+2))/3;
        const ix = Math.abs(x-wheelCenters[0]) < Math.abs(x-wheelCenters[1]) ? 0 : 1;
        const iz = z < 0 ? 0 : 1;
        const slot = ix*2 + iz;
        materialForFace.push(faceMaterial(i));
        for (const key of attrs) {
          const attr = expanded.getAttribute(key);
          const dst = buffers[slot][key];
          for (let v = i; v < i+3; v++) {
            for (let c = 0; c < attr.itemSize; c++) {
              let value = attr.getComponent(v,c);
              if (key === 'position') {
                if (c === 0) value -= wheelCenters[ix];
                if (c === 1) value -= wheelY;
              }
              dst.push(value);
            }
          }
        }
      }
      for (let ix=0; ix<2; ix++) for (let iz=0; iz<2; iz++) {
        const slot=ix*2+iz;
        const geo=new THREE.BufferGeometry();
        for (const key of attrs) {
          const attr=expanded.getAttribute(key);
          geo.setAttribute(key,new THREE.Float32BufferAttribute(buffers[slot][key],attr.itemSize,attr.normalized));
        }
        const pivot=new THREE.Group();
        pivot.name=`RealHandlerWheel_${ix}_${iz}`;
        pivot.position.set(wheelCenters[ix],wheelY,0);
        const tire=new THREE.Mesh(geo,combinedTires.material);
        tire.name=`OriginalTexturedTire_${ix}_${iz}`;
        tire.castShadow=true;tire.receiveShadow=true;
        pivot.add(tire);
        combinedTires.parent?.add(pivot);
        wheelPivots.push(pivot);
      }
      combinedTires.visible=false;
    }
    expanded.dispose();
  }
  // Ground the stationary machine using its actual tire/chassis bounds.
  const fixedBox = new THREE.Box3().setFromObject(chassis);
  model.position.y -= fixedBox.min.y / root.scale.y;
  root.updateMatrixWorld(true);
  // The reference underside is measured once at zero lift, not guessed per frame.
  const spreaderBox = new THREE.Box3();
  const spreaderNames = ['Cube.001_loader1_0', 'Cube.015_loader1_0', 'Cube_loader1_0'].map(norm);
  moving.children.forEach(o => { if (spreaderNames.includes(norm(o.name))) spreaderBox.expandByObject(o); });
  if (spreaderBox.isEmpty()) spreaderBox.setFromObject(moving);
  const center = spreaderBox.getCenter(new THREE.Vector3());
  const undersideAtZero = spreaderBox.min.y;
  const localCenter = root.worldToLocal(center.clone());
  // Since all moving parts are reparented directly to root, vertical travel is uniform.
  const zeroY = moving.position.y;
  return {
    root, chassis, boomElevationPivot: moving, boomTelescope: moving, spreader: moving, wheels: wheelPivots,
    setWheelTravel: (distanceMetres) => {
      // Radius is measured in original model units, before the root scale.
      const wheelRadius = 0.43557 * root.scale.x;
      const angle = distanceMetres / wheelRadius;
      wheelPivots.forEach(w => {w.rotation.z = angle;});
    },
    // The approved handler has a vertical mast, not an articulated rotating boom.
    setBoomPose: (_angle, _extension) => {},
    alignSpreaderTo: (x, z, approachOffset = 0) => {
      root.position.x = x - localCenter.x * root.scale.x * Math.cos(root.rotation.y)
        + localCenter.z * root.scale.z * Math.sin(root.rotation.y) + approachOffset;
      root.position.z = z - (-localCenter.x * root.scale.x * Math.sin(root.rotation.y)
        + localCenter.z * root.scale.z * Math.cos(root.rotation.y));
    },
    setSpreaderPose: (worldPos, _locked) => {
      // No lateral movement: only the complete 13-piece carriage moves up/down.
      // Reference was measured in world Y at the root's initial vertical position.
      moving.position.y = zeroY + (worldPos.y - (undersideAtZero + root.position.y)) / root.scale.y;
    },
  };
}
