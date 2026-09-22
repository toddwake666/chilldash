const fs = require('fs');
const path = require('path');

const WIDTH = 6300, HEIGHT = 4500;
const ROADS = [];

function point(x, y) {
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

function smooth(points, steps = 10) {
  const result = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[i];
    const c = points[i + 1];
    const d = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const x = 0.5 * (2 * b[0] + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t * t + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t * t * t);
      const y = 0.5 * (2 * b[1] + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t * t + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t * t * t);
      result.push(point(x, y));
    }
  }
  result.push(point(points[points.length - 1][0], points[points.length - 1][1]));
  return result;
}

function road(id, coords, kind = 'street', curved = false, name = '') {
  const r = { id, kind, name, points: curved ? smooth(coords) : coords.map(p => point(p[0], p[1])) };
  ROADS.push(r);
  return r;
}

const TOWNS = [
  { id: 'sunnyvale', name: 'Sunnyvale', x: 520, y: 880, rx: 680, ry: 1080 },
  { id: 'pinecrest', name: 'Pinecrest', x: 2700, y: 900, rx: 680, ry: 1110 },
  { id: 'bongaon', name: 'Bongaon', x: 4980, y: 980, rx: 1320, ry: 1120 },
  { id: 'habra', name: 'Habra Town', x: 2740, y: 3180, rx: 1240, ry: 1120 },
  { id: 'petrapole', name: 'Petrapole', x: 5140, y: 3450, rx: 1080, ry: 990 },
];

for (const town of TOWNS) {
  town.outline = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i * Math.PI * 2) / 48;
    const x = town.x + Math.cos(a) * town.rx * (1 + 0.06 * Math.sin(a * 5));
    const y = town.y + Math.sin(a) * town.ry * (1 + 0.06 * Math.cos(a * 3));
    town.outline.push(point(x, y));
  }
}

const GRIDS = [
  ['sunnyvale', [120, 400, 680, 960], [120, 400, 680, 960, 1240]],
  ['pinecrest', [2280, 2560, 2840, 3120], [120, 400, 680, 960, 1240]],
  ['bongaon', [4000, 4320, 4640, 4980, 5320, 5680, 6000], [350, 680, 1020, 1360, 1700]],
  ['habra', [1980, 2280, 2560, 2840, 3140, 3440], [2380, 2720, 3050, 3380, 3720, 4040]],
  ['petrapole', [4440, 4780, 5120, 5460, 5840], [2720, 3100, 3460, 3820, 4180]],
];

const BLOCKS = [];
for (const [name, cols, rows] of GRIDS) {
  for (const y of rows) {
    for (let i = 0; i < cols.length - 1; i++) {
      const x1 = cols[i], x2 = cols[i + 1];
      if (name === 'bongaon' && y === 1020 && x1 >= 4640 && x1 < 5320) continue;
      if (name === 'petrapole' && y === 3460 && x1 >= 4780) continue;
      if (name === 'petrapole' && y === 3820 && x1 === 4440) continue;
      if (name === 'habra' && y === 3050) continue;
      road(`${name}-h-${x1}-${y}`, [[x1, y], [x2, y]]);
    }
  }
  for (const x of cols) {
    for (let i = 0; i < rows.length - 1; i++) {
      const y1 = rows[i], y2 = rows[i + 1];
      if (name === 'bongaon' && x === 4980 && y1 >= 680 && y1 < 1360) continue;
      if (name === 'habra' && x === 2560 && y1 === 2720) continue;
      if (name === 'petrapole' && (x === 5120 || x === 5460) && (y1 === 3100 || y1 === 3460)) continue;
      road(`${name}-v-${x}-${y1}`, [[x, y1], [x, y2]]);
    }
  }
  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex++) {
    const y1 = rows[rowIndex], y2 = rows[rowIndex + 1];
    for (let colIndex = 0; colIndex < cols.length - 1; colIndex++) {
      const x1 = cols[colIndex], x2 = cols[colIndex + 1];
      if (name === 'bongaon' && (x1 === 4640 || x1 === 4980) && (y1 === 680 || y1 === 1020)) continue;
      if (name === 'bongaon' && x1 === 4000 && y1 === 1020) continue;
      if (name === 'habra' && x1 === 2280 && y1 === 2720) continue;
      if (name === 'petrapole' && x1 === 4780 && y1 === 2720) continue;
      if (name === 'petrapole' && ((x1 >= 4780 && (y1 === 3100 || y1 === 3460)) || (x1 === 4440 && y1 >= 3460))) continue;
      BLOCKS.push({
        id: `${name}-${rowIndex}-${colIndex}`,
        town: name,
        x: x1 + 65,
        y: y1 + 65,
        width: x2 - x1 - 130,
        height: y2 - y1 - 130,
        index: rowIndex * (cols.length - 1) + colIndex
      });
    }
  }
}

road('sunnyvale-cinema-loop', [[120,1240],[100,1600],[200,1840],[580,1880],[920,1740],[960,1240]], 'street', true, 'Picturehouse Avenue');
road('pinecrest-plaza-loop', [[2280,1240],[2230,1640],[2380,1940],[2780,1990],[3130,1840],[3120,1240]], 'street', true, 'Diamond Boulevard');
road('pine-trail', [[960,680],[1130,680],[1300,550],[1530,590],[1710,810],[1960,820],[2160,680],[2280,680]], 'street', true, 'Pine Trail');
road('sunnyvale-meadow-loop', [[120,120],[160,50],[580,45],[950,75],[1040,260],[960,400]], 'street', true, 'Sunrise Bend');
road('pinecrest-east-loop', [[3120,120],[3260,260],[3260,700],[3290,1120],[3120,1240]], 'street', true, 'Riverside Drive');
road('bongaon-riverwalk', [[4000,1360],[4320,1650],[4800,1720],[5450,1700],[6000,1700]], 'street', true, 'Stadium Riverwalk');
road('bongaon-north-loop', [[4000,350],[4240,180],[4780,140],[5400,180],[5800,280],[6000,350]], 'street', true, 'Bongaon Garden Promenade');
road('pine-habra', [[2840,1240],[3330,1670],[3240,2030],[2920,2200],[2840,2380]], 'street', true, 'Habra Highway');
road('sunny-habra', [[960,1240],[1190,1550],[1650,1680],[1800,2080],[2070,2240],[2280,2380]], 'street', true, 'Meadow Link');
road('habra-west-loop', [[1980,2380],[1760,2480],[1680,2810],[1700,3320],[1820,3710],[1980,4040]], 'street', true, 'Station Outer Ring');
road('habra-east-loop', [[3440,2380],[3620,2570],[3660,2790],[3640,3400],[3520,3820],[3440,4040]], 'street', true, 'Habra East Bypass');
road('petrapole-ring', [[4440,2720],[4400,2470],[4850,2360],[5370,2480],[5850,2750],[6040,3290],[6060,3790],[5850,4290],[5090,4370],[4500,4270],[4440,4180]], 'street', true, 'Petrapole Garden Ring');
road('bongaon-petrapole-highway', [[5320,1700],[5460,1960],[5560,2220],[5540,2480],[5460,2720]], 'highway', true, 'Jessore Forest Highway');
road('forest-dept-access', [[4940,2300],[5235,2300],[5380,2300],[5560,2220]], 'street', false, 'Forest Range Access');
road('bongaon-petrapole-link', [[4980,1700],[4940,2000],[4940,2300],[4940,2450],[5120,2720]], 'street', true, 'Lakeview Link Road');

const RIVER = {
  name: 'Ichhamati River',
  width: 270,
  points: smooth([[3600,-250],[3530,200],[3740,700],[3650,1200],[3860,1750],[3750,2260],[3920,2750],[3740,3290],[3910,3900],[3780,4720]], 20)
};

const BRIDGES = [
  { id: 'ray-bridge', name: 'Ray Bridge', x: 3630, y: 400, start: 3330, end: 4040, kind: 'bridge' },
  { id: 'revenuecat-bridge', name: 'Revenuecat Bridge', x: 3700, y: 1160, start: 3360, end: 4040, kind: 'bridge' },
  { id: 'habra-bridge', name: 'Habra Bridge', x: 3910, y: 2720, start: 3490, end: 4230, kind: 'bridge' },
  // Dedicated Steel Truss Railway Bridge across Ichhamati River connecting Habra to Petrapole & Bongaon
  { id: 'railway-bridge', name: 'Ichhamati Railway Bridge', x: 3820, y: 3050, start: 3460, end: 4200, kind: 'railway_bridge' },
];

road('ray-approach-west', [[3120,400],[3330,400]], 'street', false, 'Ray Bridge approach');
road('ray-approach-east', [[4040,400],[4200,400]]);
road('revenuecat-west', [[3120,960],[3270,1020],[3360,1160]], 'street', true);
road('revenuecat-east', [[4040,1160],[4140,1150],[4320,1020]], 'street', true);
road('habra-bridge-west', [[3440,2720],[3490,2720]]);
road('habra-bridge-east', [[4230,2720],[4440,2720]]);

for (const b of BRIDGES) {
  if (b.kind === 'bridge') {
    road(b.id, [[b.start, b.y], [b.end, b.y]], 'bridge', false, b.name);
  }
}

// Exactly 1 station per town: Habra, Bongaon, Petrapole
const LANDMARKS = [
  { id: 'sunnyvale-cinema', name: 'Sunnyvale Picturehouse', kind: 'cinema', town: 'Sunnyvale', x: 180, y: 1330, width: 680, height: 420, entrance: point(500, 1288), description: 'A multi-block cinema with a glowing marquee, poster walls and a rooftop ad screen.' },
  { id: 'diamond-plaza', name: 'Diamond Plaza', kind: 'mall', town: 'Pinecrest', x: 2350, y: 1330, width: 700, height: 500, entrance: point(2720, 1288), description: 'A shopping complex with glass atriums, a plaza fountain and wraparound ad displays.' },
  { id: 'bongaon-stadium', name: 'Bongaon Football Stadium', kind: 'stadium', town: 'Bongaon', x: 4680, y: 740, width: 560, height: 520, entrance: point(4960, 700), description: 'Grandstands, lush football pitch, and floodlights on the bank of Ichhamati River.' },
  // Station 1: Habra Town
  { id: 'habra-station', name: 'Habra Railway Station', kind: 'station', town: 'Habra Town', x: 2390, y: 2850, width: 355, height: 385, entrance: point(2792, 2890), description: 'Habra central station with dual platforms, vintage clock tower, and road gates.' },
  // Station 2: Bongaon (Western perimeter railway junction hub with eastern forecourt plaza at 4000, 1020)
  { id: 'bongaon-junction', name: 'Bongaon Junction Station', kind: 'station', town: 'Bongaon', x: 3660, y: 880, width: 320, height: 280, entrance: point(4000, 1020), description: 'Western perimeter railway junction hub with passenger platforms, passenger footbridge, and scenic river corridor.' },
  // Station 3: Petrapole
  { id: 'petrapole-station', name: 'Petrapole Railway Station', kind: 'station', town: 'Petrapole', x: 4800, y: 2820, width: 370, height: 340, entrance: point(5080, 2920), description: 'International border railway terminal connecting passenger lines and cargo trade.' },
  // Forest Department Range Office along Jessore Forest Highway
  { id: 'forest-department', name: 'Bongaon Forest Department', kind: 'forest_dept', town: 'Jessore Forest Corridor', x: 5070, y: 2040, width: 330, height: 220, entrance: point(5235, 2300), description: 'Forest Range Office featuring timber watchtower, ranger quarters, and nursery grounds.' },
  { id: 'petrapole-park', name: 'Petrapole Amusement Park', kind: 'park', town: 'Petrapole', x: 4850, y: 3170, width: 915, height: 560, entrance: point(5290, 3148), description: 'A colorful fairground with a turning Ferris wheel, carousel and winding coaster.' },
  { id: 'petrapole-barracks', name: 'Petrapole Army Barracks', kind: 'barracks', town: 'Petrapole', x: 4500, y: 3530, width: 215, height: 570, entrance: point(4488, 3630), description: 'A fenced military compound with barracks, parade ground, sentry posts and flag.' },
];

// Connected multi-town Railway Network across Habra, Petrapole, and Bongaon
const RAILWAY = {
  name: 'Eastern Railway Network (Habra · Petrapole · Bongaon)',
  y: 3050,
  start: 1700,
  end: 5850,
  cycle: 60,
  close_at: 8,
  open_at: 36,
  train_at: 12,
  train_until: 36,
  train_speed: 110,
  train_length: 520,
  tracks: [
    { id: 'main-track', points: [{ x: 1700, y: 3050 }, { x: 5850, y: 3050 }] },
    { id: 'bongaon-branch', points: [{ x: 4200, y: 3050 }, { x: 4060, y: 2500 }, { x: 3960, y: 1950 }, { x: 3880, y: 1450 }, { x: 3880, y: 950 }, { x: 3880, y: 450 }] }
  ],
  gates: [
    { id: 'habra-w2-gate', name: 'Habra West Link Gate', x: 1980, y: 3050, axis: 'vertical' },
    { id: 'habra-west-gate', name: 'Habra Station West Gate', x: 2280, y: 3050, axis: 'vertical' },
    { id: 'habra-main-gate', name: 'Habra Station Road Gate', x: 2840, y: 3050, axis: 'vertical' },
    { id: 'habra-east-gate', name: 'Habra East Rail Gate', x: 3140, y: 3050, axis: 'vertical' },
    { id: 'habra-e2-gate', name: 'Habra Border Rail Gate', x: 3440, y: 3050, axis: 'vertical' },
    { id: 'habra-bypass-gate', name: 'Habra East Bypass Gate', x: 3661, y: 3050, axis: 'vertical' },
    { id: 'bongaon-junction-gate', name: 'Bongaon Junction Station Gate', x: 3880, y: 1160, axis: 'horizontal' },
    { id: 'habra-bridge-gate', name: 'Ichhamati Riverway Rail Gate', x: 4116, y: 2720, axis: 'horizontal' },
    { id: 'petrapole-west-gate', name: 'Petrapole River Gate', x: 4440, y: 3050, axis: 'vertical' },
    { id: 'petrapole-station-gate', name: 'Petrapole Station Gate', x: 4780, y: 3050, axis: 'vertical' },
    { id: 'petrapole-mid-gate', name: 'Petrapole Central Rail Gate', x: 5120, y: 3050, axis: 'vertical' },
    { id: 'petrapole-east-gate', name: 'Petrapole Border Rail Gate', x: 5460, y: 3050, axis: 'vertical' },
    { id: 'petrapole-border-gate', name: 'Petrapole Terminal Gate', x: 5840, y: 3050, axis: 'vertical' }
  ]
};

const FOREST_CORRIDOR = {
  name: 'Bibhutibhushan Dense Forest Corridor',
  x: 5200,
  y: 1650,
  width: 950,
  height: 1120,
  highwayX: 5500
};

const WORLD = {
  version: 4,
  width: WIDTH,
  height: HEIGHT,
  towns: TOWNS,
  roads: ROADS,
  blocks: BLOCKS,
  river: RIVER,
  bridges: BRIDGES,
  landmarks: LANDMARKS,
  railway: RAILWAY,
  forest: FOREST_CORRIDOR
};

const FOODS = {
  apple: { name: 'Crisp apple', price: 6, hunger: 22, energy: 10, health: 8 },
  sandwich: { name: 'Picnic sandwich', price: 12, hunger: 48, energy: 28, health: 18 },
  meal: { name: 'Warm lunch bowl', price: 20, hunger: 85, energy: 50, health: 35 }
};

const MILESTONES = [
  { deliveries: 1, name: 'First smile', coins: 15, food: { apple: 2 } },
  { deliveries: 5, name: 'Finding your rhythm', coins: 35, food: { sandwich: 2 } },
  { deliveries: 10, name: 'Neighborhood favorite', coins: 70, food: { meal: 2 } },
  { deliveries: 25, name: 'Two-town legend', coins: 150, food: { meal: 4 } },
  { deliveries: 50, name: 'The long way home', coins: 300, food: { meal: 6 } }
];

const SERVICES = [
  { id: 'garage', name: 'Your garage', kind: 'garage', x: 352, y: 750, address: 'Palm Street · Sunnyvale' },
  { id: 'sunny-fuel', name: 'Sunshine Fuel & Air', kind: 'fuel', x: 728, y: 1090, address: 'Garden Avenue · Sunnyvale' },
  { id: 'sunny-repair', name: 'Milo’s Bike Workshop', kind: 'repair', x: 912, y: 860, address: 'Sunset Road · Sunnyvale' },
  { id: 'pine-fuel', name: 'Pinecrest Fuel & Air', kind: 'fuel', x: 2512, y: 580, address: 'Pine Lane · Pinecrest' },
  { id: 'pine-repair', name: 'The Spoke House', kind: 'repair', x: 2888, y: 870, address: 'Cedar Way · Pinecrest' },
  { id: 'bongaon-fuel', name: 'Bongaon Fuel & Air', kind: 'fuel', x: 4248, y: 1260, address: 'Stadium Ring · Bongaon' },
  { id: 'bongaon-repair', name: 'Riverbank Motors', kind: 'repair', x: 5402, y: 590, address: 'Garden Road · Bongaon' },
  { id: 'forest-fuel', name: 'Jessore Highway Fuel', kind: 'fuel', x: 5540, y: 2260, address: 'Forest Highway · Bongaon Range' },
  { id: 'habra-fuel', name: 'Habra Fuel & Air', kind: 'fuel', x: 2888, y: 3560, address: 'Station Road · Habra Town' },
  { id: 'habra-repair', name: 'Railtown Cycle Works', kind: 'repair', x: 2232, y: 2560, address: 'West Road · Habra Town' },
  { id: 'petrapole-fuel', name: 'Petrapole Fuel & Air', kind: 'fuel', x: 5888, y: 3990, address: 'Garden Ring · Petrapole' },
  { id: 'petrapole-repair', name: 'Fairground Bike Care', kind: 'repair', x: 4828, y: 3990, address: 'Fairground Road · Petrapole' }
];

const PICKUPS = [
  { name: 'Sunny Side Café', address: '12 Palm Street', x: 352, y: 580 },
  { name: 'Slice of Heaven', address: '24 Market Lane', x: 560, y: 352 },
  { name: 'Bloom & Go', address: '8 Garden Avenue', x: 632, y: 870 },
  { name: 'Corner Noodles', address: '36 Sunset Road', x: 850, y: 632 },
  { name: 'Pine & Pastry', address: '4 Pine Lane', x: 2512, y: 270 },
  { name: 'Cedar Kitchen', address: '16 Cedar Way', x: 2740, y: 632 },
  { name: 'Ichhamati Café', address: 'Riverbank Lane · Bongaon', x: 4248, y: 580 },
  { name: 'Bongaon Junction Chai', address: 'Station Plaza · Bongaon', x: 4000, y: 1020 },
  { name: 'Forest Honey & Tea Stall', address: 'Forest Range Office · Jessore Highway', x: 5235, y: 2300 },
  { name: 'Platform Chai', address: 'Station approach · Habra Town', x: 2792, y: 2890 },
  { name: 'Petrapole Border Snacks', address: 'Station Entrance · Petrapole', x: 5080, y: 2920 },
  { name: 'Fairground Snacks', address: 'Park entrance · Petrapole', x: 5290, y: 3148 }
];

const DROPOFFS = [
  { name: 'Maple Apartments', address: '7 Maple Walk', x: 590, y: 632 },
  { name: 'Sunset Studios', address: '18 Sunset Road', x: 912, y: 540 },
  { name: 'Palm House', address: '3 Palm Street', x: 352, y: 1060 },
  { name: 'Seaside Offices', address: '2 Ocean Drive', x: 820, y: 168 },
  { name: 'Willow Cottage', address: '9 Willow Crescent', x: 3000, y: 912 },
  { name: 'Cedar Terrace', address: '22 Cedar Way', x: 2328, y: 1080 },
  { name: 'Shimultala Heights Apartments', address: 'Block A · Bongaon', x: 4800, y: 520 },
  { name: 'Ichhamati Residency Apartments', address: 'Riverside Walk · Bongaon', x: 5500, y: 850 },
  { name: 'Bongaon Football Stadium', address: 'Stadium north entrance', x: 4960, y: 700 },
  { name: 'Bongaon Junction Station', address: 'Passenger Lounge · Bongaon', x: 4000, y: 1020 },
  { name: 'Bongaon Forest Department', address: 'Jessore Forest Highway', x: 5235, y: 2300 },
  { name: 'Abhirup Residency', address: '12 Jessore Road · Habra Town', x: 2680, y: 2840 },
  { name: 'Habra Town Colony', address: 'South Station Road', x: 3060, y: 3428 },
  { name: 'Petrapole Railway Station', address: 'Platform 1 · Petrapole', x: 5080, y: 2920 },
  { name: 'Petrapole Army Barracks', address: 'Visitor gate · Petrapole', x: 4488, y: 3630 }
];

const output = {
  world: WORLD,
  foods: FOODS,
  milestones: MILESTONES,
  services: SERVICES,
  pickups: PICKUPS,
  dropoffs: DROPOFFS
};

const targetPath = path.join(__dirname, '..', 'src', 'game', 'worldData.json');
fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf8');
console.log('Successfully generated worldData.json at', targetPath);
