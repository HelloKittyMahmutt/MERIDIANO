/**
 * Resolves model URLs reliably for both Vite development and production deployments (e.g. Vercel).
 * Static assets stored in `/public/models/*.glb` are served at `/models/*.glb` in production.
 */
export function getModelUrl(modelName: string): string {
  // Strip any leading slashes or 'public/' prefix if passed
  const clean = modelName
    .replace(/^\/?public\/models\//, '')
    .replace(/^\/?models\//, '')
    .replace(/^\//, '');

  return `/models/${clean}`;
}
