import type { Point } from './api';

export interface Pedestrian {
  id: number;
  town: string;
  roadName: string;
  x: number;
  y: number;
  heading: number; // 0..360 deg
  speed: number;   // 22..38 px/s
  p1: Point;
  p2: Point;
  t: number;       // 0..1 along corridor
  dir: 1 | -1;     // walking forward or backward
  sidewalkSide: 1 | -1; // left or right of road centerline
  offsetDist: number;   // distance from road center to sidewalk (38..46 px)
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  accessory: 'none' | 'bag' | 'phone';
  walkPhase: number;
}

// Corridor definitions along key town walkways across all 5 towns
interface CorridorDef {
  town: string;
  roadName: string;
  p1: Point;
  p2: Point;
  count: number;
}

const CORRIDORS: CorridorDef[] = [
  // Sunnyvale
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Market Road',
    p1: { x: 320, y: 880 },
    p2: { x: 860, y: 880 },
    count: 6,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunnyvale Coastal Way',
    p1: { x: 420, y: 550 },
    p2: { x: 420, y: 1120 },
    count: 4,
  },
  {
    town: 'sunnyvale',
    roadName: 'Sunshine Park Walk',
    p1: { x: 520, y: 1150 },
    p2: { x: 880, y: 1150 },
    count: 3,
  },

  // Pinecrest
  {
    town: 'pinecrest',
    roadName: 'Pine Trail (Durga Puja & Fuchka Walkway)',
    p1: { x: 1420, y: 720 },
    p2: { x: 1980, y: 720 },
    count: 8,
  },
  {
    town: 'pinecrest',
    roadName: 'Evergreen Avenue',
    p1: { x: 1650, y: 480 },
    p2: { x: 1650, y: 960 },
    count: 4,
  },
  {
    town: 'pinecrest',
    roadName: 'Whispering Pines Walk',
    p1: { x: 1360, y: 1050 },
    p2: { x: 1820, y: 1050 },
    count: 4,
  },

  // Bongaon
  {
    town: 'bongaon',
    roadName: 'Jessore Road Promenade',
    p1: { x: 4150, y: 680 },
    p2: { x: 4850, y: 680 },
    count: 6,
  },
  {
    town: 'bongaon',
    roadName: 'Station Road Bongaon',
    p1: { x: 4400, y: 480 },
    p2: { x: 4400, y: 980 },
    count: 4,
  },
  {
    town: 'bongaon',
    roadName: 'Ichhamati Riverside Ghat Walk',
    p1: { x: 4650, y: 850 },
    p2: { x: 5150, y: 850 },
    count: 4,
  },

  // Habra
  {
    town: 'habra',
    roadName: 'Jessore Road Habra',
    p1: { x: 2150, y: 2750 },
    p2: { x: 2950, y: 2750 },
    count: 6,
  },
  {
    town: 'habra',
    roadName: 'Habra Station Road',
    p1: { x: 2450, y: 2550 },
    p2: { x: 2450, y: 3100 },
    count: 4,
  },
  {
    town: 'habra',
    roadName: 'Railtown Bazaar',
    p1: { x: 2680, y: 2850 },
    p2: { x: 3180, y: 2850 },
    count: 4,
  },

  // Petrapole
  {
    town: 'petrapole',
    roadName: 'Border Commercial Corridor',
    p1: { x: 4750, y: 2750 },
    p2: { x: 5450, y: 2750 },
    count: 5,
  },
  {
    town: 'petrapole',
    roadName: 'Customs Gate Approach',
    p1: { x: 4950, y: 2620 },
    p2: { x: 4950, y: 3040 },
    count: 4,
  },
  {
    town: 'petrapole',
    roadName: 'Border Enclave Boulevard',
    p1: { x: 5150, y: 2800 },
    p2: { x: 5650, y: 2800 },
    count: 4,
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

export function createPedestrians(): Pedestrian[] {
  const pedestrians: Pedestrian[] = [];
  let id = 1;

  for (const c of CORRIDORS) {
    const dx = c.p2.x - c.p1.x;
    const dy = c.p2.y - c.p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    for (let i = 0; i < c.count; i++) {
      // Stagger along segment
      const t = (i + 0.35 + ((id * 37) % 25) / 100) / c.count;
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const sidewalkSide: 1 | -1 = (i + id) % 2 === 0 ? 1 : -1;
      // Offset strictly centered on the footpath (asphalt radius 37, pavement radius 59, midpoint = 48)
      const offsetDist = 48;
      const speed = 24 + ((id * 7) % 12);      // 24..35 px/s

      // Normal to road (towards sidewalk)
      const nx = -uy * sidewalkSide;
      const ny = ux * sidewalkSide;

      const cx = c.p1.x + ux * (t * len);
      const cy = c.p1.y + uy * (t * len);

      const x = cx + nx * offsetDist;
      const y = cy + ny * offsetDist;

      const walkDx = ux * dir;
      const walkDy = uy * dir;
      const heading = (Math.atan2(walkDx, -walkDy) * 180) / Math.PI;

      const accessory: 'none' | 'bag' | 'phone' =
        id % 5 === 0 ? 'bag' : id % 7 === 0 ? 'phone' : 'none';

      pedestrians.push({
        id,
        town: c.town,
        roadName: c.roadName,
        x,
        y,
        heading,
        speed,
        p1: c.p1,
        p2: c.p2,
        t,
        dir,
        sidewalkSide,
        offsetDist,
        shirtColor: SHIRT_COLORS[id % SHIRT_COLORS.length],
        pantsColor: PANTS_COLORS[id % PANTS_COLORS.length],
        skinColor: SKIN_TONES[id % SKIN_TONES.length],
        hairColor: HAIR_COLORS[id % HAIR_COLORS.length],
        accessory,
        walkPhase: (id * 1.3) % (Math.PI * 2),
      });

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

  for (let i = 0; i < pedestrians.length; i++) {
    const p = pedestrians[i];
    const dx = p.p2.x - p.p1.x;
    const dy = p.p2.y - p.p1.y;
    const len = Math.hypot(dx, dy) || 1;

    p.t += (p.dir * p.speed * stepDt) / len;

    // Ping-pong at segment ends
    if (p.t >= 1) {
      p.t = 1;
      p.dir = -1;
    } else if (p.t <= 0) {
      p.t = 0;
      p.dir = 1;
    }

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * p.sidewalkSide;
    const ny = ux * p.sidewalkSide;

    const cx = p.p1.x + ux * (p.t * len);
    const cy = p.p1.y + uy * (p.t * len);

    p.x = cx + nx * p.offsetDist;
    p.y = cy + ny * p.offsetDist;

    const walkDx = ux * p.dir;
    const walkDy = uy * p.dir;
    p.heading = (Math.atan2(walkDx, -walkDy) * 180) / Math.PI;

    // Advance walking leg/arm swing cycle
    p.walkPhase = (p.walkPhase + p.speed * stepDt * 0.28) % (Math.PI * 2);
  }

  return pedestrians;
}
