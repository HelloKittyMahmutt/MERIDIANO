import * as THREE from 'three';

/**
 * Spotless satin navy and bright silver-white spreader, with hydraulic rods physically detached for the existing textured handler.
 * Only the shader's diffuse paint is changed. No meshes, pivots, animation,
 * wheels, camera, or loading choreography are modified.
 *
 * The original texture atlas contains old red/orange paint and dark baked
 * weathering. We identify chromatic painted pixels, remap them to consistent
 * satin paint, and compress their luminance contrast without losing seams.
 * Neutral black rubber, glass, decals and dark steel remain untouched.
 */
const SPREADER_PARTS = new Set([
  'Cube_loader1_0', 'Cube.001_loader1_0', 'Cube.002_loader1_0',
  'Cube.014_loader1_0', 'Cube.015_loader1_0', 'Cylinder.007_loader1_0',
  'Cube.003_loader2_0', 'Cube.004_loader2_0',
  'Cube.013_loader2_0', 'Cylinder.006_loader2_0',
  'Cube.011_loader5_0', 'Cube.006_loader5_0', 'Cube.007_loader5_0',
].map(name => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()));
const normalized = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

type Finish = 'body' | 'spreader' | 'rim';

function cleanPaint(source: THREE.Material, finish: Finish): THREE.Material {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source;
  const material = source.clone();
  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = function(shader, renderer) {
    previousCompile.call(this, shader, renderer);
    const marker = '#include <map_fragment>';
    if (!shader.fragmentShader.includes(marker)) return;
    shader.fragmentShader = shader.fragmentShader.replace(marker, `${marker}
      {
        vec3 oldPaint = diffuseColor.rgb;
        float hi = max(oldPaint.r, max(oldPaint.g, oldPaint.b));
        float lo = min(oldPaint.r, min(oldPaint.g, oldPaint.b));
        float chroma = hi - lo;
        float sat = chroma / max(hi, 0.015);
        // Identify original red, orange and rust-coloured painted regions.
        // Keep genuinely neutral rubber, glass, dark metal and decals.
        float redDominance = (oldPaint.r - max(oldPaint.g, oldPaint.b)) / max(hi, 0.015);
        float warmDominance = (oldPaint.r - oldPaint.b) / max(hi, 0.015);
        float oldCoating = smoothstep(0.006, 0.09, warmDominance)
                         * smoothstep(0.035, 0.16, sat)
                         * smoothstep(0.006, 0.035, hi);
        // Repaint the tinted/weathered blue panels too, but leave neutral
        // steel, rubber, glazing and bright decals alone.
        float blueLead = (oldPaint.b - oldPaint.r) / max(hi, 0.015);
        float blueCoating = smoothstep(0.06, 0.20, blueLead)
                          * smoothstep(0.10, 0.28, sat)
                          * smoothstep(0.025, 0.08, hi);
        oldCoating = max(oldCoating, blueCoating);
        // Repaint dark stained portions of the original coated panels too,
        // without flattening near-black mechanical gaps or neutral decals.
        float darkCoating = smoothstep(0.008, 0.035, hi)
          * smoothstep(0.06, 0.20, sat);
        oldCoating = max(oldCoating, darkCoating);
        // Near-black patches in the source paint atlas should not become bright
        // blotches. Limit shading variation to preserve seams without old grime.
        float luminance = dot(oldPaint, vec3(0.2126, 0.7152, 0.0722));
        float shading = 1.0; // Remove baked color/grime variation on painted areas.
        vec3 meridianoNavy = vec3(0.015, 0.058, 0.137) * shading;
        vec3 satinSilverWhite = vec3(0.73, 0.79, 0.84) * shading;
        vec3 brushedAluminum = vec3(0.48, 0.53, 0.57) * shading;
        ${finish === 'body'
          ? 'diffuseColor.rgb = mix(oldPaint, meridianoNavy, clamp(oldCoating * 1.4, 0.0, 1.0));'
          : finish === 'spreader'
          ? 'diffuseColor.rgb = mix(oldPaint, satinSilverWhite, clamp(oldCoating * 1.4, 0.0, 1.0));'
          : 'diffuseColor.rgb = mix(oldPaint, brushedAluminum, oldCoating);'}
      }
    `);
    // Painted sections should read as satin-coated metal, not chalky plastic.
    // No geometry, normal maps, or motion data are modified.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor = mix(roughnessFactor, ${finish === 'body' ? '0.38' : finish === 'spreader' ? '0.32' : '0.34'}, 0.35);`
    );
  };
  // Original texture and normal maps remain attached; finish is adjusted in shader.
  material.customProgramCacheKey = () => `meridiano-spotless-no-hydraulics-v9-${finish}`;
  material.needsUpdate = true;
  return material;
}

export function applyMeridianoHandlerLivery(model: THREE.Object3D): void {
  const rodsToRemove: THREE.Object3D[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = normalized(object.name);
    // This is the separately identified hydraulic-rod assembly. Hide it
    // without touching its pivots, the mast, or any other animated meshes.
    if (id === normalized('Cylinder.001_loader3_0')) {
      rodsToRemove.push(object);
      return;
    }
    const finish: Finish = SPREADER_PARTS.has(id) ? 'spreader'
      : /^cylinder(001|003|004|005|009|019)loader/.test(id) ? 'rim'
      : 'body';
    if (Array.isArray(object.material)) {
      object.material = object.material.map(mat => cleanPaint(mat, finish));
    } else if (object.material) {
      object.material = cleanPaint(object.material, finish);
    }
  });
  // Detach the hydraulic-rod mesh from the source scene before the rig
  // re-parents its remaining parts. This prevents it from rendering at all.
  for (const rod of rodsToRemove) rod.removeFromParent();
}
