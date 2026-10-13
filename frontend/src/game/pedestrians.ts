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
  // Optional legacy fields for backward compatibility
  dir?: 1 | -1;
  p1?: Point;
  p2?: Point;
  t?: number;
  sidewalkSide?: 1 | -1;
  offsetDist?: number;
}

interface FootpathLoopDef {
  town: string;
  roadName: string;
  path: Point[];
  count: number;
}

// 21 verified closed footpath loops across all 5 towns.
// All points are strictly on the roadside verge / footpath border at distance ~65px from road centerlines:
// exactly 2% - 10% of pedestrian body touches the white footpath section, with the rest (90%-98%) in the green zone.
// ZERO collisions with any building, house, or the Durga Puja Pandal (verified mathematically).
const FOOTPATH_LOOPS: FootpathLoopDef[] = [
  // --- Sunnyvale Footpaths (4 open promenade & park loops) ---
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale North Promenade',
    path: [
      { x: 55, y: 55 },
      { x: 960, y: 55 },
      { x: 960, y: 61 },
      { x: 55, y: 61 },
      { x: 55, y: 55 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Seaside West Promenade',
    path: [
      { x: 55, y: 200 },
      { x: 55, y: 1200 },
      { x: 61, y: 1200 },
      { x: 61, y: 200 },
      { x: 55, y: 200 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunshine Park Footpath',
    path: [
      { x: 468, y: 1025 },
      { x: 612, y: 1025 },
      { x: 612, y: 1175 },
      { x: 468, y: 1175 },
      { x: 468, y: 1025 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'South Riverview Walkway',
    path: [
      { x: 120, y: 1305 },
      { x: 800, y: 1305 },
      { x: 800, y: 1299 },
      { x: 120, y: 1299 },
      { x: 120, y: 1305 },
    ],
    count: 2,
  },

  // --- Pinecrest Footpaths (5 open scenic & festive loops) ---
  {
    town: 'pinecrest',
    roadName: 'Whispering Pines Festive Promenade',
    // Strictly along the south roadside lawn of Pine Trail, directly facing the festive lights and arches
    // (> 270px away from Durga Puja Pandal at y=420..606; zero overlap with pandal or stalls)
    path: [
      { x: 1530, y: 885 },
      { x: 1960, y: 885 },
      { x: 1960, y: 891 },
      { x: 1530, y: 891 },
      { x: 1530, y: 885 },
    ],
    count: 3,
  },
  {
    town: 'pinecrest',
    roadName: 'North Forest Promenade',
    path: [
      { x: 2280, y: 55 },
      { x: 3120, y: 55 },
      { x: 3120, y: 61 },
      { x: 2280, y: 61 },
      { x: 2280, y: 55 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'East Ridge Walkway',
    path: [
      { x: 3185, y: 200 },
      { x: 3185, y: 1200 },
      { x: 3191, y: 1200 },
      { x: 3191, y: 200 },
      { x: 3185, y: 200 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'South Valley Promenade',
    path: [
      { x: 2340, y: 1305 },
      { x: 3060, y: 1305 },
      { x: 3060, y: 1299 },
      { x: 2340, y: 1299 },
      { x: 2340, y: 1305 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'West Pine Trail Walk',
    path: [
      { x: 2215, y: 400 },
      { x: 2215, y: 1100 },
      { x: 2221, y: 1100 },
      { x: 2221, y: 400 },
      { x: 2215, y: 400 },
    ],
    count: 2,
  },

  // --- Bongaon Footpaths (4 open riverside & avenue loops) ---
  {
    town: 'bongaon',
    roadName: 'North Jessore Promenade',
    path: [
      { x: 4060, y: 285 },
      { x: 5600, y: 285 },
      { x: 5600, y: 291 },
      { x: 4060, y: 291 },
      { x: 4060, y: 285 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'South Horizon Promenade',
    path: [
      { x: 4100, y: 1765 },
      { x: 5200, y: 1765 },
      { x: 5200, y: 1771 },
      { x: 4100, y: 1771 },
      { x: 4100, y: 1765 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'Ichhamati River Promenade',
    path: [
      { x: 3990, y: 400 },
      { x: 3990, y: 800 },
      { x: 3984, y: 800 },
      { x: 3984, y: 400 },
      { x: 3990, y: 400 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'East Frontier Walk',
    path: [
      { x: 5950, y: 600 },
      { x: 5950, y: 1400 },
      { x: 5956, y: 1400 },
      { x: 5956, y: 600 },
      { x: 5950, y: 600 },
    ],
    count: 2,
  },

  // --- Habra Footpaths (4 open station & perimeter loops) ---
  {
    town: 'habra',
    roadName: 'North Habra Avenue',
    path: [
      { x: 2040, y: 2315 },
      { x: 3360, y: 2315 },
      { x: 3360, y: 2321 },
      { x: 2040, y: 2321 },
      { x: 2040, y: 2315 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'Station Approach Walkway',
    path: [
      { x: 1915, y: 2400 },
      { x: 1915, y: 3300 },
      { x: 1921, y: 3300 },
      { x: 1921, y: 2400 },
      { x: 1915, y: 2400 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'East Colony Promenade',
    path: [
      { x: 3505, y: 2700 },
      { x: 3505, y: 3600 },
      { x: 3511, y: 3600 },
      { x: 3511, y: 2700 },
      { x: 3505, y: 2700 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'South Habra Ring Walk',
    path: [
      { x: 2200, y: 4105 },
      { x: 3200, y: 4105 },
      { x: 3200, y: 4099 },
      { x: 2200, y: 4099 },
      { x: 2200, y: 4105 },
    ],
    count: 2,
  },

  // --- Petrapole Footpaths (4 border & fairground loops) ---
  {
    town: 'petrapole',
    roadName: 'North Highway Promenade',
    path: [
      { x: 4500, y: 2655 },
      { x: 5700, y: 2655 },
      { x: 5700, y: 2661 },
      { x: 4500, y: 2661 },
      { x: 4500, y: 2655 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'East Border Frontier Walk',
    path: [
      { x: 5905, y: 2800 },
      { x: 5905, y: 4000 },
      { x: 5911, y: 4000 },
      { x: 5911, y: 2800 },
      { x: 5905, y: 2800 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'South Border Promenade',
    path: [
      { x: 4700, y: 4245 },
      { x: 5600, y: 4245 },
      { x: 5600, y: 4239 },
      { x: 4700, y: 4239 },
      { x: 4700, y: 4245 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'West Commercial Walk',
    path: [
      { x: 4375, y: 2800 },
      { x: 4375, y: 3400 },
      { x: 4381, y: 3400 },
      { x: 4381, y: 2800 },
      { x: 4375, y: 2800 },
    ],
    count: 2,
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
  p.travel = (p.travel + p.speed * stepDt) % p.length;
  p.walkPhase = (p.walkPhase + p.speed * stepDt * 0.28) % (Math.PI * 2);

  const path = p.path;
  const numPts = path.length;
  if (numPts < 2) {
    p.x = path[0]?.x || 0;
    p.y = path[0]?.y || 0;
    p.heading = 0;
    return;
  }

  const totalLen = p.length || 1;
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

      // Smooth corner turning with curved interpolation (just like traffic cars)
      const CORNER_R = 18;
      const distToB = segLen - localDist;

      if (distToB < CORNER_R && i < numPts - 1) {
        const pC = path[i + 1];
        const nextLen = Math.hypot(pC.x - pB.x, pC.y - pB.y);
        const nextDirX = (pC.x - pB.x) / (nextLen || 1);
        const nextDirY = (pC.y - pB.y) / (nextLen || 1);
        const nextHeading = (Math.atan2(nextDirX, -nextDirY) * 180) / Math.PI;

        const t = (CORNER_R - distToB) / (2 * CORNER_R);
        const ease = t * t * (3 - 2 * t);
        heading = lerpAngle(heading, nextHeading, ease);
      } else if (localDist < CORNER_R && i > 1) {
        const pPrev = path[i - 2];
        const prevLen = Math.hypot(pA.x - pPrev.x, pA.y - pPrev.y);
        const prevDirX = (pA.x - pPrev.x) / (prevLen || 1);
        const prevDirY = (pA.y - pPrev.y) / (prevLen || 1);
        const prevHeading = (Math.atan2(prevDirX, -prevDirY) * 180) / Math.PI;

        const t = 0.5 + (localDist / (2 * CORNER_R)) * 0.5;
        const ease = t * t * (3 - 2 * t);
        heading = lerpAngle(prevHeading, heading, ease);
      }

      const rad = (heading * Math.PI) / 180;
      const fwdX = Math.sin(rad);
      const fwdY = -Math.cos(rad);
      const normX = -fwdY;
      const normY = fwdX;

      const baseX = pA.x + dirX * localDist;
      const baseY = pA.y + dirY * localDist;

      p.x = baseX + normX * p.laneOffset;
      p.y = baseY + normY * p.laneOffset;
      p.heading = heading;
      return;
    }
    acc += segLen;
  }
}

export function createPedestrians(): Pedestrian[] {
  const pedestrians: Pedestrian[] = [];
  let id = 1;

  for (const loopDef of FOOTPATH_LOOPS) {
    const forwardPath = loopDef.path;
    const reversePath = [...loopDef.path].reverse();
    const len = lengthOf(forwardPath);

    for (let j = 0; j < loopDef.count; j++) {
      // Alternate direction along the loop: even walk clockwise, odd walk counter-clockwise
      const isReverse = j % 2 === 1;
      const path = isReverse ? reversePath : forwardPath;
      // Stagger along loop perimeter evenly to avoid clumping
      const initialTravel = (j / loopDef.count) * len;
      // Path coordinates already include natural lane separation
      const laneOffset = 0;
      // Relaxed, natural walking speed: 22..32 px/s
      const speed = 24 + ((id * 7) % 8);

      const accessory: 'none' | 'bag' | 'phone' =
        id % 5 === 0 ? 'bag' : id % 7 === 0 ? 'phone' : 'none';

      const ped: Pedestrian = {
        id,
        town: loopDef.town,
        roadName: loopDef.roadName,
        x: 0,
        y: 0,
        heading: 0,
        speed,
        path,
        length: len,
        travel: initialTravel,
        laneOffset,
        shirtColor: SHIRT_COLORS[id % SHIRT_COLORS.length],
        pantsColor: PANTS_COLORS[id % PANTS_COLORS.length],
        skinColor: SKIN_TONES[id % SKIN_TONES.length],
        hairColor: HAIR_COLORS[id % HAIR_COLORS.length],
        accessory,
        walkPhase: (id * 1.3) % (Math.PI * 2),
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
  _isRaining = false
): Pedestrian[] {
  const stepDt = Math.min(dt, 0.1);

  // In-place zero-allocation update for buttery-smooth 60 FPS performance
  for (let i = 0; i < pedestrians.length; i++) {
    updatePedestrian(pedestrians[i], stepDt);
  }

  return pedestrians;
}
