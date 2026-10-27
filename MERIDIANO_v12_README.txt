MERIDIANO Cinematic Journey V12

Scope: Only src/components/cinematic/ContinuousLogisticsJourney.tsx

- Measured aircraft GLB axes (Y-up / Z-forward) corrected: level flight, not vertical
- Aircraft camera moves to a side/rear 3/4 tracking view instead of overhead
- Ship shrunk from 175m to 150m and moved clear of the dock/road
- Ship keel lowered approximately 6m below waterline
- Harbor water recolored and ripple maps subtly animated
- Low concrete terrain connects the terminal to the road
- Warmer atmospheric sky; ship camera aims offshore
- Forklift handler mechanism/livery, truck, loading handoff and opening camera are untouched.

Install from project root (Cursor PowerShell):
Expand-Archive "$env:USERPROFILE\Downloads\MERIDIANO_ship_plane_realism_v12.zip" -DestinationPath . -Force

Refresh http://localhost:3000/?mode=journey

Test checked with TypeScript 5.8.3 in reconstructed project with prior approved rig.
Full browser rendering not tested.
