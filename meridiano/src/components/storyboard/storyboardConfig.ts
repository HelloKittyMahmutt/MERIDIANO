import * as THREE from 'three';

export type StoryboardShotId = 'yard' | 'truck' | 'ship' | 'aircraft';

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface ShotPreset {
  id: string;
  label: string;
  description: string;
  camera: CameraConfig;
}

export interface ShotDefinition {
  id: StoryboardShotId;
  index: string;
  title: string;
  subtitle: string;
  category: string;
  models: string[];
  defaultCamera: CameraConfig;
  presets: ShotPreset[];
  editorialText: {
    tag: string;
    headline: string;
    subheadline: string;
    description: string;
    metaLeft: string;
    metaRight: string;
    position: 'left' | 'right' | 'top-left' | 'bottom-left';
  };
  lightingMood: 'daylight' | 'overcast' | 'golden' | 'nordic';
}

export const STORYBOARD_SHOTS: Record<StoryboardShotId, ShotDefinition> = {
  yard: {
    id: 'yard',
    index: '01',
    title: 'CONTAINER YARD',
    subtitle: 'Intermodal Consolidation & Staging',
    category: 'GROUND LOGISTICS',
    models: ['container.glb', 'forklift.glb'],
    defaultCamera: {
      position: [-9.8, 1.8, 10.2],
      target: [0.6, 1.7, 0.0],
      fov: 36,
    },
    presets: [
      {
        id: 'hero-34',
        label: 'Hero Low 3/4',
        description: 'Monumental low 3/4 angle showcasing container dominance and grounded forklift scale',
        camera: {
          position: [-9.8, 1.8, 10.2],
          target: [0.6, 1.7, 0.0],
          fov: 36,
        },
      },
      {
        id: 'ultra-low',
        label: 'Ultra-Low Ground',
        description: 'Tarmac-level perspective emphasizing container mass and vertical scale',
        camera: {
          position: [-8.5, 0.8, 9.4],
          target: [0.2, 1.9, -0.5],
          fov: 40,
        },
      },
      {
        id: 'editorial-wide',
        label: 'Editorial Negative Space',
        description: 'Wide framing with substantial negative space for large headline typography',
        camera: {
          position: [-13.5, 2.2, 12.0],
          target: [-0.8, 1.6, -1.2],
          fov: 34,
        },
      },
      {
        id: 'flank-stride',
        label: 'Flank Inspection',
        description: 'Dynamic profile stride showing container ribbing and operator forklift station',
        camera: {
          position: [-11.2, 1.4, 4.5],
          target: [0.4, 1.5, 0.0],
          fov: 35,
        },
      },
    ],
    editorialText: {
      tag: '01 / CONSOLIDATION MATRIX',
      headline: 'MASS IN MOTION',
      subheadline: 'INTERMODAL CONTAINER STAGING TERMINAL',
      description:
        'Standardized 40ft high-cube units staged with millimeter precision. Engineered logistics architecture delivering seamless cargo transitions across continental supply chains.',
      metaLeft: 'LAT 31°13′N · LON 121°28′E\nISO 668 1EE 40FT HC\nMAX GROSS: 32,500 KG',
      metaRight: 'FLOW STAGE: CONSOLIDATION\nINSPECTION: VERIFIED 100%\nSTATUS: READY FOR MANIFEST',
      position: 'left',
    },
    lightingMood: 'daylight',
  },

  truck: {
    id: 'truck',
    index: '02',
    title: 'ROAD TRANSPORT',
    subtitle: 'Arterial Highway Haulage',
    category: 'OVERLAND TRANSIT',
    models: ['truck.glb', 'chassis.glb', 'container.glb'],
    defaultCamera: {
      position: [-10.8, 1.8, -17.8],
      target: [0.2, 1.9, -26.5],
      fov: 36,
    },
    presets: [
      {
        id: 'hero-front-side',
        label: 'Low 3/4 Front-Side',
        description: 'Approved TruckAssembly calibrated shot; tractor, chassis, and container dominate 70% of frame',
        camera: {
          position: [-10.8, 1.8, -17.8],
          target: [0.2, 1.9, -26.5],
          fov: 36,
        },
      },
      {
        id: 'highway-stride',
        label: 'Low Highway Stride',
        description: 'Asphalt-level kinetic camera tracking the front bumper and triple-axle chassis',
        camera: {
          position: [-8.4, 1.0, -19.5],
          target: [0.1, 1.7, -27.2],
          fov: 38,
        },
      },
      {
        id: 'editorial-corridor',
        label: 'Editorial Highway Corridor',
        description: 'Dramatic perspective down the highway lines with generous editorial negative space',
        camera: {
          position: [-14.2, 2.4, -15.2],
          target: [0.5, 2.0, -28.0],
          fov: 34,
        },
      },
      {
        id: 'profile-convoy',
        label: 'Side Profile Stride',
        description: 'Full profile showing complete tractor, gooseneck coupling, and container alignment',
        camera: {
          position: [-13.6, 1.6, -26.5],
          target: [0.0, 1.8, -26.5],
          fov: 35,
        },
      },
    ],
    editorialText: {
      tag: '02 / ARTERIAL TRANSIT',
      headline: 'CONTINENTAL ARTERIES',
      subheadline: 'HEAVY TRUCKING CONVOY DISPATCH',
      description:
        'Tri-axle skeletal chassis locked to heavy-duty tractor units. Direct corridor routing from manufacturing centers to deep-water embarkation hubs.',
      metaLeft: 'SPEED: 88 KM/H\nPAYLOAD: 26.8 MT\nCLASS: EURO VI COMPLIANT',
      metaRight: 'GPS ROUTE: G15 COASTAL CORRIDOR\nETA DOCK: 04:15 UTC\nTELEMETRY: NOMINAL',
      position: 'left',
    },
    lightingMood: 'daylight',
  },

  ship: {
    id: 'ship',
    index: '03',
    title: 'MARITIME TRANSPORT',
    subtitle: 'Trans-Oceanic Container Vessel',
    category: 'DEEP-WATER PASSAGE',
    models: ['container-ship.glb'],
    defaultCamera: {
      position: [-62.0, 4.2, -128.0],
      target: [-14.0, 12.0, -192.0],
      fov: 38,
    },
    presets: [
      {
        id: 'water-level-bow',
        label: 'Water-Level Bow Hero',
        description: 'Low water-level camera angle accentuating the monumental bow flare and container stacks',
        camera: {
          position: [-62.0, 4.2, -128.0],
          target: [-14.0, 12.0, -192.0],
          fov: 38,
        },
      },
      {
        id: 'ocean-stride',
        label: 'Ocean Stride 3/4',
        description: 'Balanced wide maritime angle capturing the complete 175m vessel hull and superstructure',
        camera: {
          position: [-88.0, 6.5, -145.0],
          target: [-12.0, 10.0, -195.0],
          fov: 34,
        },
      },
      {
        id: 'dramatic-crest',
        label: 'Dramatic Bow Crest',
        description: 'Tight dramatic low angle right off the port bow showcasing raw maritime scale',
        camera: {
          position: [-46.0, 2.5, -118.0],
          target: [-15.0, 15.0, -186.0],
          fov: 42,
        },
      },
      {
        id: 'distant-horizon',
        label: 'Distant Pacific Horizon',
        description: 'Broad editorial maritime framing with vast ocean horizon and atmospheric haze',
        camera: {
          position: [-115.0, 9.0, -195.0],
          target: [-15.0, 11.0, -195.0],
          fov: 32,
        },
      },
    ],
    editorialText: {
      tag: '03 / PACIFIC PASSAGE',
      headline: 'OCEANIC MONOLITH',
      subheadline: 'DEEP-SEA INTERCONTINENTAL CARRIER',
      description:
        'Continuous maritime operations spanning global trade lanes. High-capacity container vessels bridging Eastern industrial powerhouses to Western distribution gateways.',
      metaLeft: 'DRAUGHT: 14.2 M\nCAPACITY: 14,500 TEU\nVESSEL: MERIDIANO TITAN',
      metaRight: 'COURSE: 082° ENE\nWIND: 14 KTS NW\nSEA STATE: CALM SWELL',
      position: 'right',
    },
    lightingMood: 'daylight',
  },

  aircraft: {
    id: 'aircraft',
    index: '04',
    title: 'AIR TRANSPORT',
    subtitle: 'Strategic Long-Range Cargo Flight',
    category: 'STRATOSPHERIC REACH',
    models: ['cargo-plane.glb'],
    defaultCamera: {
      position: [-52.0, 11.5, 56.0],
      target: [0.0, 1.5, 0.0],
      fov: 36,
    },
    presets: [
      {
        id: 'hero-34-side',
        label: 'Cinematic 3/4 Side-Tracking',
        description: 'Approved horizontal flight orientation showing fuselage, wings, quad engines, and tail',
        camera: {
          position: [-52.0, 11.5, 56.0],
          target: [0.0, 1.5, 0.0],
          fov: 36,
        },
      },
      {
        id: 'wide-wingspan',
        label: 'Wide Wingspan Silhouette',
        description: 'Clean wide perspective showcasing the full 65m wingspan and swept wing aerodynamics',
        camera: {
          position: [-68.0, 8.0, 42.0],
          target: [0.0, 0.0, 0.0],
          fov: 38,
        },
      },
      {
        id: 'low-underside',
        label: 'Low Underside 3/4',
        description: 'Ascending low angle highlighting cargo fuselage volume and turbine nacelles',
        camera: {
          position: [-44.0, -12.0, 50.0],
          target: [0.0, 2.5, 0.0],
          fov: 40,
        },
      },
      {
        id: 'profile-stride',
        label: 'Cruising Profile Stride',
        description: 'Pure lateral profile verifying exact level flight horizontal orientation',
        camera: {
          position: [-62.0, 0.0, 0.0],
          target: [0.0, 0.0, 0.0],
          fov: 34,
        },
      },
    ],
    editorialText: {
      tag: '04 / STRATOSPHERIC REACH',
      headline: 'GLOBAL VELOCITY',
      subheadline: 'LONG-RANGE HEAVY CARGO CRUISE',
      description:
        'Time-critical air freight network operating at 38,000 feet. Rapid deployment of precision machinery, high-value components, and expedited supply line requisitions.',
      metaLeft: 'ALT: FL380 (11,580 M)\nMACH: 0.82 CRUISE\nWINGSPAN: 65.01 M',
      metaRight: 'RANGE: 8,200 NM\nCARGO PAYLOAD: 124 MT\nSTATUS: LEVEL FLIGHT APPROVED',
      position: 'right',
    },
    lightingMood: 'daylight',
  },
};
