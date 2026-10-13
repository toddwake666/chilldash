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

// 24 verified closed footpath loops across all 5 towns.
// All points are strictly on sidewalks / pedestrian plazas at distance >= 77px from road centerlines
// (road asphalt radius is 37px, so > 40px buffer away from asphalt; pedestrians never touch the road).
const FOOTPATH_LOOPS: FootpathLoopDef[] = [
  // --- Sunnyvale Footpaths (5 block loops) ---
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Market Promenade',
    path: [
      { x: 199, y: 199 },
      { x: 321, y: 199 },
      { x: 321, y: 321 },
      { x: 199, y: 321 },
      { x: 199, y: 199 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Slice of Heaven Walkway',
    path: [
      { x: 479, y: 199 },
      { x: 601, y: 199 },
      { x: 601, y: 321 },
      { x: 479, y: 321 },
      { x: 479, y: 199 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Maple Apartments Sidewalk',
    path: [
      { x: 479, y: 479 },
      { x: 601, y: 479 },
      { x: 601, y: 601 },
      { x: 479, y: 601 },
      { x: 479, y: 479 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Bloom & Go Footpath',
    path: [
      { x: 479, y: 759 },
      { x: 601, y: 759 },
      { x: 601, y: 881 },
      { x: 479, y: 881 },
      { x: 479, y: 759 },
    ],
    count: 2,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunshine Park Walk',
    path: [
      { x: 479, y: 1039 },
      { x: 601, y: 1039 },
      { x: 601, y: 1161 },
      { x: 479, y: 1161 },
      { x: 479, y: 1039 },
    ],
    count: 2,
  },

  // --- Pinecrest Footpaths (Durga Puja festive plaza + 4 block loops) ---
  {
    town: 'pinecrest',
    roadName: 'Durga Puja & Fuchka Festive Plaza',
    path: [
      { x: 1690, y: 560 },
      { x: 1820, y: 560 },
      { x: 1820, y: 670 },
      { x: 1690, y: 670 },
      { x: 1690, y: 560 },
    ],
    count: 4,
  },
  {
    town: 'pinecrest',
    roadName: 'Cedar Homes Walkway',
    path: [
      { x: 2639, y: 199 },
      { x: 2761, y: 199 },
      { x: 2761, y: 321 },
      { x: 2639, y: 321 },
      { x: 2639, y: 199 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'Cedar Kitchen Footpath',
    path: [
      { x: 2639, y: 479 },
      { x: 2761, y: 479 },
      { x: 2761, y: 601 },
      { x: 2639, y: 601 },
      { x: 2639, y: 479 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'The Spoke House Sidewalk',
    path: [
      { x: 2639, y: 759 },
      { x: 2761, y: 759 },
      { x: 2761, y: 881 },
      { x: 2639, y: 881 },
      { x: 2639, y: 759 },
    ],
    count: 2,
  },
  {
    town: 'pinecrest',
    roadName: 'Evergreen Lodge Walk',
    path: [
      { x: 2639, y: 1039 },
      { x: 2761, y: 1039 },
      { x: 2761, y: 1161 },
      { x: 2639, y: 1161 },
      { x: 2639, y: 1039 },
    ],
    count: 2,
  },

  // --- Bongaon Footpaths (5 block loops) ---
  {
    town: 'bongaon',
    roadName: 'Bongaon Plaza Towers Promenade',
    path: [
      { x: 4399, y: 429 },
      { x: 4561, y: 429 },
      { x: 4561, y: 601 },
      { x: 4399, y: 601 },
      { x: 4399, y: 429 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'Shimultala Heights Walkway',
    path: [
      { x: 4719, y: 429 },
      { x: 4901, y: 429 },
      { x: 4901, y: 601 },
      { x: 4719, y: 601 },
      { x: 4719, y: 429 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'Ichhamati Residency Sidewalk',
    path: [
      { x: 5399, y: 759 },
      { x: 5601, y: 759 },
      { x: 5601, y: 941 },
      { x: 5399, y: 941 },
      { x: 5399, y: 759 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'Riverside Towers Footpath',
    path: [
      { x: 5399, y: 1099 },
      { x: 5601, y: 1099 },
      { x: 5601, y: 1281 },
      { x: 5399, y: 1281 },
      { x: 5399, y: 1099 },
    ],
    count: 2,
  },
  {
    town: 'bongaon',
    roadName: 'South Horizon Promenade',
    path: [
      { x: 4719, y: 1439 },
      { x: 4901, y: 1439 },
      { x: 4901, y: 1621 },
      { x: 4719, y: 1621 },
      { x: 4719, y: 1439 },
    ],
    count: 2,
  },

  // --- Habra Footpaths (5 block loops) ---
  {
    town: 'habra',
    roadName: 'Banamalipur Villas Walkway',
    path: [
      { x: 2359, y: 2459 },
      { x: 2481, y: 2459 },
      { x: 2481, y: 2641 },
      { x: 2359, y: 2641 },
      { x: 2359, y: 2459 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'Habra Arcade Promenade',
    path: [
      { x: 2639, y: 2799 },
      { x: 2761, y: 2799 },
      { x: 2761, y: 2971 },
      { x: 2639, y: 2971 },
      { x: 2639, y: 2799 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'Central Avenue Sidewalk',
    path: [
      { x: 2359, y: 3129 },
      { x: 2481, y: 3129 },
      { x: 2481, y: 3301 },
      { x: 2359, y: 3301 },
      { x: 2359, y: 3129 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'Habra Crescent Footpath',
    path: [
      { x: 2639, y: 3129 },
      { x: 2761, y: 3129 },
      { x: 2761, y: 3301 },
      { x: 2639, y: 3301 },
      { x: 2639, y: 3129 },
    ],
    count: 2,
  },
  {
    town: 'habra',
    roadName: 'Habra Town Colony Walkway',
    path: [
      { x: 2919, y: 3459 },
      { x: 3061, y: 3459 },
      { x: 3061, y: 3641 },
      { x: 2919, y: 3641 },
      { x: 2919, y: 3459 },
    ],
    count: 2,
  },

  // --- Petrapole Footpaths (4 block loops) ---
  {
    town: 'petrapole',
    roadName: 'Fairground Snacks Promenade',
    path: [
      { x: 5199, y: 2799 },
      { x: 5381, y: 2799 },
      { x: 5381, y: 3021 },
      { x: 5199, y: 3021 },
      { x: 5199, y: 2799 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'Petrapole Homes Walkway',
    path: [
      { x: 5539, y: 2799 },
      { x: 5761, y: 2799 },
      { x: 5761, y: 3021 },
      { x: 5539, y: 3021 },
      { x: 5539, y: 2799 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'Fairground Bike Care Sidewalk',
    path: [
      { x: 4859, y: 3899 },
      { x: 5041, y: 3899 },
      { x: 5041, y: 4101 },
      { x: 4859, y: 4101 },
      { x: 4859, y: 3899 },
    ],
    count: 2,
  },
  {
    town: 'petrapole',
    roadName: 'Border Colony Promenade',
    path: [
      { x: 5199, y: 3899 },
      { x: 5381, y: 3899 },
      { x: 5381, y: 4101 },
      { x: 5199, y: 4101 },
      { x: 5199, y: 3899 },
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
      // Sidewalk lateral lane offset (pedestrians keep to their right, passing naturally)
      const laneOffset = 3;
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
