import * as THREE from 'three';

// ============================================================================
// LOCKED FORKLIFT CONFIGURATION
// Calibrated display scale, position, and rotation relative to the 12m container.
// Increased ~35% from the original miniature 0.01846 scale so it reads as a
// substantial industrial container-handling machine without being oversized.
// ============================================================================

export interface ForkliftConfig {
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export const FORKLIFT_CONFIG: ForkliftConfig = {
  // Scale 0.95 gives authentic industrial container handler: length ~4.95m, mast height ~3.08m, width ~2.0m
  // Substantial presence alongside the 12m shipping container
  scale: 0.95,
  // Positioned on the staging floor alongside the container with clear separation
  position: [3.8, 0.0, 1.2],
  // Angled 3/4 hero presentation facing the container
  rotation: [0, -Math.PI / 2 + 0.35, 0],
};
