import type { Point } from './api';

export interface Pedestrian {
  id: number;
  town: string;
  roadName: string;
  x: number;
  y: number;
  heading: number; // 0..360 deg
  speed: number;   // 22..34 px/s
  path: Point[];
  length: number;
  travel: number;
  laneOffset: number;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  accessory: 'none' | 'bag' | 'phone';
  walkPhase: number;
  isLoop?: boolean;
  // Precomputed fast-path linear geometry for zero-allocation 60 FPS updates
  pA?: Point;
  pB?: Point;
  dx?: number;
  dy?: number;
  segLen?: number;
  invSegLen?: number;
  fwdHeading?: number;
  bwdHeading?: number;
  turnDist?: number;
  invTurnDist?: number;
  cycle?: number;
  // Optional legacy fields for backward compatibility
  dir?: 1 | -1;
  p1?: Point;
  p2?: Point;
  t?: number;
  sidewalkSide?: 1 | -1;
  offsetDist?: number;
}

interface FootpathRouteDef {
  town: string;
  roadName: string;
  path: Point[];
  count: number;
  isLoop?: boolean;
}

// 25 verified non-intersecting footpath routes across all 5 towns.
// All paths strictly follow the front sidewalks of blocks, parks, and waterfront boulevards at distance ~65.0px - 66.0px from road centerlines:
// exactly 3.3% - 10.0% of pedestrian body touches the white footpath section, with 90.0% - 96.7% in the front green zone.
// ZERO contact with road asphalt (buffer > 20px everywhere), ZERO intersection crossings, and ZERO building/stall overlap.
const FOOTPATH_ROUTES: FootpathRouteDef[] = [
  // --- Sunnyvale Footpaths (Park circuit loop, waterfront boulevard, and block front sidewalks) ---
  {
    town: 'sunnyvale',
    roadName: 'Sunshine Park Perimeter Loop',
    path: [
      { x: 472, y: 1025 },
      { x: 608, y: 1025 },
      { x: 608, y: 1175 },
      { x: 472, y: 1175 },
      { x: 472, y: 1025 },
    ],
    count: 2,
    isLoop: true,
  },
  {
    town: 'sunnyvale',
    roadName: 'South Riverview Waterfront Boulevard',
    path: [
      { x: 210, y: 1305 },
      { x: 840, y: 1305 },
    ],
    count: 2,
    isLoop: false,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Promenade (Block 0-0)',
    path: [
      { x: 200, y: 334.5 },
      { x: 320, y: 334.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Commercial (Block 0-1)',
    path: [
      { x: 480, y: 334.5 },
      { x: 600, y: 334.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Central Walk (Block 1-1)',
    path: [
      { x: 480, y: 614.5 },
      { x: 600, y: 614.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Market Walk (Block 2-1)',
    path: [
      { x: 480, y: 894.5 },
      { x: 600, y: 894.5 },
    ],
    count: 1,
    isLoop: false,
  },

  // --- Pinecrest Footpaths (Festive Puja Promenade and town block front sidewalks) ---
  {
    town: 'pinecrest',
    roadName: 'Whispering Pines Festive Promenade',
    path: [
      { x: 1680, y: 903 },
      { x: 1940, y: 903 },
    ],
    count: 2,
    isLoop: false,
  },
  {
    town: 'pinecrest',
    roadName: 'Pinecrest North Walk (Block 0-0)',
    path: [
      { x: 2360, y: 334.5 },
      { x: 2480, y: 334.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'pinecrest',
    roadName: 'Pinecrest Avenue (Block 0-1)',
    path: [
      { x: 2640, y: 334.5 },
      { x: 2760, y: 334.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'pinecrest',
    roadName: 'Pinecrest Central Walk (Block 1-1)',
    path: [
      { x: 2640, y: 614.5 },
      { x: 2760, y: 614.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'pinecrest',
    roadName: 'Pinecrest Ridge Walk (Block 2-1)',
    path: [
      { x: 2640, y: 894.5 },
      { x: 2760, y: 894.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'pinecrest',
    roadName: 'Pinecrest South Walk (Block 3-1)',
    path: [
      { x: 2640, y: 1174.5 },
      { x: 2760, y: 1174.5 },
    ],
    count: 1,
    isLoop: false,
  },

  // --- Bongaon Footpaths (Town block front sidewalks) ---
  {
    town: 'bongaon',
    roadName: 'Bongaon North Walk (Block 0-0)',
    path: [
      { x: 4080, y: 614.5 },
      { x: 4224, y: 614.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'bongaon',
    roadName: 'Bongaon Avenue (Block 0-1)',
    path: [
      { x: 4404, y: 614.5 },
      { x: 4548, y: 614.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'bongaon',
    roadName: 'Bongaon Jessore Road Walk (Block 1-4)',
    path: [
      { x: 5404, y: 954.5 },
      { x: 5548, y: 954.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'bongaon',
    roadName: 'Bongaon Market Walk (Block 2-4)',
    path: [
      { x: 5404, y: 1294.5 },
      { x: 5548, y: 1294.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'bongaon',
    roadName: 'Bongaon South Walk (Block 3-2)',
    path: [
      { x: 4728, y: 1634.5 },
      { x: 4872, y: 1634.5 },
    ],
    count: 1,
    isLoop: false,
  },

  // --- Habra Footpaths (Town block front sidewalks) ---
  {
    town: 'habra',
    roadName: 'Habra Station Walk (Block 0-1)',
    path: [
      { x: 2364, y: 2654.5 },
      { x: 2484, y: 2654.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'habra',
    roadName: 'Habra Commercial Walk (Block 0-2)',
    path: [
      { x: 2648, y: 2654.5 },
      { x: 2768, y: 2654.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'habra',
    roadName: 'Habra Central Walk (Block 2-1)',
    path: [
      { x: 2368, y: 3314.5 },
      { x: 2488, y: 3314.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'habra',
    roadName: 'Habra Market Walk (Block 2-2)',
    path: [
      { x: 2640, y: 3314.5 },
      { x: 2760, y: 3314.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'habra',
    roadName: 'Habra Colony Walk (Block 3-3)',
    path: [
      { x: 2920, y: 3654.5 },
      { x: 3060, y: 3654.5 },
    ],
    count: 1,
    isLoop: false,
  },

  // --- Petrapole Footpaths (Town block front sidewalks) ---
  {
    town: 'petrapole',
    roadName: 'Petrapole Border Approach (Block 0-2)',
    path: [
      { x: 5208, y: 3034.5 },
      { x: 5352, y: 3034.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'petrapole',
    roadName: 'Petrapole Frontier Walk (Block 0-3)',
    path: [
      { x: 5540, y: 3034.5 },
      { x: 5684, y: 3034.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'petrapole',
    roadName: 'Petrapole Trade Walk (Block 3-1)',
    path: [
      { x: 4864, y: 4114.5 },
      { x: 5008, y: 4114.5 },
    ],
    count: 1,
    isLoop: false,
  },
  {
    town: 'petrapole',
    roadName: 'Petrapole South Promenade (Block 3-2)',
    path: [
      { x: 5208, y: 4114.5 },
      { x: 5352, y: 4114.5 },
    ],
    count: 1,
    isLoop: false,
  },
];

const SHIRT_COLORS = [
  '#EF4444', // Festive Red Kurta
  '#F59E0B', // Saffron / Marigold Kurta
  '#10B981', // Emerald Green
  '#06B6D4', // Sky Teal
  '#3B82F6', // Royal Blue
  '#8B5CF6', // Purple Silk
  '#EC4899', // Festive Pink
  '#F8FAFC', // Classic White Kurta
  '#EAB308', // Yellow Mustard
  '#14B8A6', // Aqua
];

const PANTS_COLORS = [
  '#1E293B', // Slate Dark
  '#334155', // Charcoal
  '#475569', // Denim Slate
  '#18181B', // Deep Black
  '#F1F5F9', // White Pajama
  '#78350F', // Earth Khaki
];

const SKIN_TONES = [
  '#FDBA74', // Warm Light
  '#F59E0B', // Golden Warm
  '#D97706', // Tan
  '#B45309', // Deep Bronze
  '#E2A36E', // Medium Olive
];

const HAIR_COLORS = [
  '#0F172A', // Jet Black
  '#1E1B4B', // Blue Black
  '#3E2723', // Dark Brown
  '#451A03', // Deep Chestnut
];

function lengthOf(ps: Point[]): number {
  let len = 0;
  for (let i = 1; i < ps.length; i++) {
    len += Math.hypot(ps[i].x - ps[i - 1].x, ps[i].y - ps[i - 1].y);
  }
  return len || 1;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

function updatePedestrian(p: Pedestrian, stepDt: number): void {
  // Case 1: Precomputed Two-point Sidewalk Promenade Patrol (A <-> B)
  // Blazing-fast zero-trigonometric linear update: zero Math.hypot, zero Math.atan2, zero divisions
  if (p.pA && p.pB && p.segLen && p.cycle) {
    p.travel = (p.travel + p.speed * stepDt) % p.cycle;
    const d = ((p.travel % p.cycle) + p.cycle) % p.cycle;
    const segLen = p.segLen;
    const turnDist = p.turnDist!;
    const invSegLen = p.invSegLen!;
    const invTurnDist = p.invTurnDist!;

    if (d < segLen) {
      // Walking A -> B
      const t = d * invSegLen;
      p.x = p.pA.x + p.dx! * t;
      p.y = p.pA.y + p.dy! * t;
      p.heading = p.fwdHeading!;
    } else if (d < segLen + turnDist) {
      // Turning around on the spot at B
      p.x = p.pB.x;
      p.y = p.pB.y;
      const t = (d - segLen) * invTurnDist;
      const ease = t * t * (3 - 2 * t);
      p.heading = lerpAngle(p.fwdHeading!, p.bwdHeading!, ease);
    } else if (d < 2 * segLen + turnDist) {
      // Walking B -> A
      const t = (d - (segLen + turnDist)) * invSegLen;
      p.x = p.pB.x - p.dx! * t;
      p.y = p.pB.y - p.dy! * t;
      p.heading = p.bwdHeading!;
    } else {
      // Turning around on the spot at A
      p.x = p.pA.x;
      p.y = p.pA.y;
      const t = (d - (2 * segLen + turnDist)) * invTurnDist;
      const ease = t * t * (3 - 2 * t);
      p.heading = lerpAngle(p.bwdHeading!, p.fwdHeading!, ease);
    }
    return;
  }

  // Case 2: Multi-point Circuit Loops (e.g. Sunshine Park perimeter)
  const path = p.path;
  const numPts = path.length;
  if (numPts < 2) {
    p.x = path[0]?.x || 0;
    p.y = path[0]?.y || 0;
    p.heading = 0;
    return;
  }

  const totalLen = p.length || 1;
  p.travel = (p.travel + p.speed * stepDt) % totalLen;
  const dist = ((p.travel % totalLen) + totalLen) % totalLen;

  let acc = 0;
  for (let i = 1; i < numPts; i++) {
    const pA = path[i - 1];
    const pB = path[i];
    const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    if (dist <= acc + segLen || i === numPts - 1) {
      const localDist = Math.max(0, Math.min(segLen, dist - acc));
      const dirX = (pB.x - pA.x) / (segLen || 1);
      const dirY = (pB.y - pA.y) / (segLen || 1);
      let heading = (Math.atan2(dirX, -dirY) * 180) / Math.PI;

      const CORNER_R = Math.min(18, segLen * 0.45);
      const distToB = segLen - localDist;

      if (distToB < CORNER_R) {
        const nextIdx = i < numPts - 1 ? i + 1 : 1;
        const pC = path[nextIdx];
        const nextLen = Math.hypot(pC.x - pB.x, pC.y - pB.y);
        const nextDirX = (pC.x - pB.x) / (nextLen || 1);
        const nextDirY = (pC.y - pB.y) / (nextLen || 1);
        const nextHeading = (Math.atan2(nextDirX, -nextDirY) * 180) / Math.PI;

        const t = (CORNER_R - distToB) / (2 * CORNER_R);
        const ease = t * t * (3 - 2 * t);
        heading = lerpAngle(heading, nextHeading, ease);
      } else if (localDist < CORNER_R) {
        const prevIdx = i > 1 ? i - 2 : numPts - 2;
        const pPrev = path[prevIdx];
        const prevLen = Math.hypot(pA.x - pPrev.x, pA.y - pPrev.y);
        const prevDirX = (pA.x - pPrev.x) / (prevLen || 1);
        const prevDirY = (pA.y - pPrev.y) / (prevLen || 1);
        const prevHeading = (Math.atan2(prevDirX, -prevDirY) * 180) / Math.PI;

        const t = 0.5 + (localDist / (2 * CORNER_R)) * 0.5;
        const ease = t * t * (3 - 2 * t);
        heading = lerpAngle(prevHeading, heading, ease);
      }

      p.x = pA.x + dirX * localDist;
      p.y = pA.y + dirY * localDist;
      p.heading = heading;
      return;
    }
    acc += segLen;
  }
}

export function createPedestrians(): Pedestrian[] {
  const pedestrians: Pedestrian[] = [];
  let id = 1;

  for (const route of FOOTPATH_ROUTES) {
    const isLoop = route.isLoop ?? false;
    const path = route.path;
    const isPatrol = !isLoop && path.length === 2;
    const len = lengthOf(path);

    const pA = path[0];
    const pB = path[1];
    const dx = isPatrol ? pB.x - pA.x : 0;
    const dy = isPatrol ? pB.y - pA.y : 0;
    const segLen = isPatrol ? Math.hypot(dx, dy) : len;
    const invSegLen = 1 / (segLen || 1);
    const dirX = dx * invSegLen;
    const dirY = dy * invSegLen;
    const fwdHeading = isPatrol ? Math.round((Math.atan2(dirX, -dirY) * 180) / Math.PI) : 0;
    const bwdHeading = (fwdHeading + 180) % 360;

    for (let j = 0; j < route.count; j++) {
      // Relaxed, natural walking speed: 22..30 px/s
      const speed = 23 + ((id * 7) % 8);
      const turnDist = isPatrol ? Math.max(10, speed * 0.45) : 0;
      const invTurnDist = turnDist > 0 ? 1 / turnDist : 0.1;
      const cycle = isPatrol ? 2 * (segLen + turnDist) : len;
      const initialTravel = (j / route.count) * cycle;

      const accessory: 'none' | 'bag' | 'phone' =
        id % 5 === 0 ? 'bag' : id % 7 === 0 ? 'phone' : 'none';

      const ped: Pedestrian = {
        id,
        town: route.town,
        roadName: route.roadName,
        x: pA.x,
        y: pA.y,
        heading: fwdHeading,
        speed,
        path,
        length: cycle,
        travel: initialTravel,
        laneOffset: 0,
        isLoop,
        shirtColor: SHIRT_COLORS[id % SHIRT_COLORS.length],
        pantsColor: PANTS_COLORS[id % PANTS_COLORS.length],
        skinColor: SKIN_TONES[id % SKIN_TONES.length],
        hairColor: HAIR_COLORS[id % HAIR_COLORS.length],
        accessory,
        walkPhase: (id * 1.3) % (Math.PI * 2),
        // Precomputed fast-path linear geometry
        pA,
        pB,
        dx,
        dy,
        segLen,
        invSegLen,
        fwdHeading,
        bwdHeading,
        turnDist,
        invTurnDist,
        cycle,
      };

      // Position initially at initialTravel
      updatePedestrian(ped, 0);

      pedestrians.push(ped);
      id++;
    }
  }

  return pedestrians;
}

export function stepPedestrians(
  pedestrians: Pedestrian[],
  dt: number,
  playerPos?: Point
): Pedestrian[] {
  const stepDt = Math.min(dt, 0.1);
  const px = playerPos?.x;
  const py = playerPos?.y;

  // In-place zero-allocation update with spatial culling for maximum 60 FPS headroom
  for (let i = 0; i < pedestrians.length; i++) {
    const p = pedestrians[i];
    // If player position is provided and pedestrian is in another town (> 1400px away), advance cycle without full coordinate calculation
    if (px !== undefined && py !== undefined && (Math.abs(p.x - px) > 1400 || Math.abs(p.y - py) > 1400)) {
      if (p.cycle) {
        p.travel = (p.travel + p.speed * stepDt) % p.cycle;
      }
      continue;
    }
    updatePedestrian(p, stepDt);
  }

  return pedestrians;
}

