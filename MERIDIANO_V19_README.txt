MERIDIANO V19 — CLEAN AIRCRAFT LIVERY

Apply after V18:
Expand-Archive "$env:USERPROFILE\Downloads\MERIDIANO_aircraft_clean_livery_v19.zip" -DestinationPath . -Force

Changed file:
src/components/cinematic/ContinuousLogisticsJourney.tsx

Changes:
- Removes V18's geometrically estimated white fuselage panels.
- Paint follows actual GLB fuselage geometry via ray intersections, including the tapered nose.
- Covers old JAL/JAPAN AIRLINES markings with an opaque pearl-white livery band.
- Corrects MIRRORED lettering on the camera-facing port side.
- Navy tail and white roundel remain; existing flight and mobile camera behavior unchanged.
- No floating billboard text, no changes to other vehicles or journey transitions.

Validation: TypeScript compilation passed using reconstructed project. The actual 3D
appearance has not been browser-rendered; verify coverage and position in the site.

NOTE: The original aircraft GLB is not modified. This is a runtime surface-conforming
paint overlay, not an edit to the source GLB's original mesh/texture assets.
