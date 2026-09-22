import type { Point } from './api';

export type Road = { id: string; name: string; kind: string; points: Point[] };
export type Town = Point & { id: string; name: string; rx: number; ry: number; outline: Point[] };
export type Landmark = Point & { id: string; name: string; town: string; kind: string; width: number; height: number; entrance: Point; description: string };
export type Bridge = Point & { id: string; name: string; start: number; end: number; kind?: string };
export type Gate = Point & { id: string; name: string; axis?: 'vertical' | 'horizontal' };
export type WorldData = {
  version: number; width: number; height: number; roads: Road[]; towns: Town[];
  blocks: (Point & { id: string; town: string; width: number; height: number; index: number })[];
  river: { name: string; width: number; points: Point[] }; bridges: Bridge[]; landmarks: Landmark[];
  railway: {
    name: string; y: number; start: number; end: number; cycle: number;
    close_at: number; open_at: number; train_at: number; train_until: number;
    train_speed: number; train_length: number; gates: Gate[];
    tracks?: { id: string; points: Point[] }[];
  };
  forest?: { name: string; x: number; y: number; width: number; height: number; highwayX: number };
};
export let MAP: WorldData;
export const WORLD = { width: 6300, height: 4500 };
export const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
export type Segment = { a: Point; b: Point; kind: string; id: string; index: number };
export let SEGMENTS: Segment[] = [];
let timeOffset = 0;
let graph = new Map<string, { p: Point; neighbors: { key: string; cost: number }[] }>();
const GRID_CELL = 250;
let roadGrid = new Map<string, Segment[]>();
const key = (p: Point) => `${p.x},${p.y}`;

export function configureWorld(world: WorldData, serverTime: number) {
  MAP = world; WORLD.width = world.width; WORLD.height = world.height;
  timeOffset = serverTime - Date.now()/1000;
  SEGMENTS = world.roads.flatMap(r => r.points.slice(1).map((b,i) => ({ a:r.points[i], b, kind:r.kind, id:r.id, index:i })));

  roadGrid.clear();
  SEGMENTS.forEach(s => {
    const minX = Math.floor(Math.min(s.a.x, s.b.x) / GRID_CELL);
    const maxX = Math.floor(Math.max(s.a.x, s.b.x) / GRID_CELL);
    const minY = Math.floor(Math.min(s.a.y, s.b.y) / GRID_CELL);
    const maxY = Math.floor(Math.max(s.a.y, s.b.y) / GRID_CELL);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const k = `${x},${y}`;
        let cell = roadGrid.get(k);
        if (!cell) { cell = []; roadGrid.set(k, cell); }
        cell.push(s);
      }
    }
  });

  graph = new Map();
  SEGMENTS.forEach(({ a,b }) => {
    [a,b].forEach(p => { if (!graph.has(key(p))) graph.set(key(p), { p, neighbors: [] }); });
    graph.get(key(a))!.neighbors.push({ key:key(b), cost:distance(a,b) });
    graph.get(key(b))!.neighbors.push({ key:key(a), cost:distance(a,b) });
  });
  routeCache.clear();
}
export function project(p: Point, a: Point, b: Point) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  const q={x:a.x+t*dx,y:a.y+t*dy}; return { point:q, distance:distance(p,q) };
}
export function nearestRoad(p: Point) {
  if (!SEGMENTS.length) return { distance: Infinity, point: p, segment: SEGMENTS[0] };
  const cx = Math.floor(p.x / GRID_CELL), cy = Math.floor(p.y / GRID_CELL);
  let best = { distance: Infinity, point: p, segment: SEGMENTS[0] };
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = roadGrid.get(`${cx + dx},${cy + dy}`);
      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          const projected = project(p, cell[i].a, cell[i].b);
          if (projected.distance < best.distance) best = { ...projected, segment: cell[i] };
        }
      }
    }
  }
  if (best.distance < 130) return best;
  for (const segment of SEGMENTS) {
    const projected = project(p, segment.a, segment.b);
    if (projected.distance < best.distance) best = { ...projected, segment };
  }
  return best;
}
export function riverDistance(p: Point) {
  if (!MAP || p.x < 3290 || p.x > 4250) return Infinity;
  return MAP.river.points.slice(1).reduce((d,b,i) => Math.min(d,project(p,MAP.river.points[i],b).distance),Infinity);
}
export function canRide(p: Point, hintSegment?: Segment | null) {
  if (!MAP || p.x <= 45 || p.x >= WORLD.width-45 || p.y <= 45 || p.y >= WORLD.height-45) return false;
  if (hintSegment) {
    const pr = project(p, hintSegment.a, hintSegment.b);
    if (pr.distance <= 42) return true;
  }
  if (MAP.landmarks) {
    for (let i = 0; i < MAP.landmarks.length; i++) {
      const lm = MAP.landmarks[i];
      if (lm.kind === 'station') {
        if (p.x >= lm.x + 8 && p.x <= lm.x + lm.width - 8 &&
            p.y >= lm.y + 8 && p.y <= lm.y + lm.height - 8) {
          return false;
        }
      }
    }
  }
  const near=nearestRoad(p);
  const maxD = near.segment.kind === 'bridge' ? 82 : near.segment.id.includes('station') ? 85 : 74;
  if (near.distance > maxD) return false;
  if (near.segment.kind === 'bridge' || near.segment.id.startsWith('habra-east-loop') || near.distance <= 42) {
    return true;
  }
  return riverDistance(p) >= MAP.river.width/2+6;
}
export function onFootpath(p: Point) {
  const d=nearestRoad(p).distance; return d >= 38 && d <= 74 && canRide(p);
}
export function region(p: Point) {
  if (!MAP) return 'Sunnyvale';
  const bridge=MAP.bridges.find(b => p.x >= b.start && p.x <= b.end && Math.abs(p.y-b.y)<65);
  if (bridge) return bridge.name;
  if (p.x > 5100 && p.x < 5950 && p.y > 1650 && p.y < 2700) return 'Bibhutibhushan Forest';
  const ranked=MAP.towns.map(t => ({ town:t, score:((p.x-t.x)/t.rx)**2+((p.y-t.y)/t.ry)**2 })).sort((a,b)=>a.score-b.score);
  return ranked[0].score < 1.18 ? ranked[0].town.name : p.x < 2250 && p.y < 1450 ? 'Whispering Pines' : 'Countryside';
}
const routeCache = new Map<string, Point[]>();
export function getRoute(a: Point,b: Point): Point[] {
  if (!MAP) return [];
  const start=nearestRoad(a), end=nearestRoad(b), sa=start.segment, sb=end.segment;
  if (sa === sb) return [a,start.point,end.point,b].filter((p,i,arr)=>!i||distance(p,arr[i-1])>2);
  const cacheKey=`${sa.id}:${sa.index}|${sb.id}:${sb.index}`;
  let middle=routeCache.get(cacheKey);
  if (!middle) {
    const queue=[{ key:key(sa.a), cost:distance(start.point,sa.a) },{ key:key(sa.b), cost:distance(start.point,sa.b) }];
    const costs=new Map<string,number>(), prev=new Map<string,string>();
    const targets=new Map([[key(sb.a),distance(end.point,sb.a)],[key(sb.b),distance(end.point,sb.b)]]);
    queue.forEach(n=>costs.set(n.key,n.cost));
    let best=Infinity, goal='';
    while(queue.length) {
      let minIdx = 0;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].cost < queue[minIdx].cost) minIdx = i;
      }
      const n = queue[minIdx];
      queue[minIdx] = queue[queue.length - 1];
      queue.pop();
      if(n.cost>best || n.cost>(costs.get(n.key) ?? Infinity))continue;
      if(targets.has(n.key) && n.cost+targets.get(n.key)!<best) {best=n.cost+targets.get(n.key)!;goal=n.key;}
      for(const edge of graph.get(n.key)?.neighbors || []) {
        const cost=n.cost+edge.cost;
        if(cost<(costs.get(edge.key) ?? Infinity)) {costs.set(edge.key,cost);prev.set(edge.key,n.key);queue.push({key:edge.key,cost});}
      }
    }
    middle=[];
    while(goal) {middle.unshift(graph.get(goal)!.p);goal=prev.get(goal)||'';}
    if(!middle.length) return [a,start.point,end.point,b].filter((p,i,arr)=>!i||distance(p,arr[i-1])>2);
    if(routeCache.size>400)routeCache.clear(); routeCache.set(cacheKey,middle);
  }
  return [a,start.point,...middle,end.point,b].filter((p,i,arr)=>!i||distance(p,arr[i-1])>2);
}
import { getRailwaySimulation, blockedByGateAt, RailSimulation } from './railwaySim';

export function railwayState(at = Date.now() / 1000 + timeOffset, riderX?: number, riderY?: number): RailSimulation {
  return getRailwaySimulation(at, riderX, riderY);
}

export function blockedByGate(a: Point, b: Point, closedOrAt?: boolean | number) {
  if (typeof closedOrAt === 'boolean' && !closedOrAt) return null;
  const at = typeof closedOrAt === 'number' ? closedOrAt : Date.now() / 1000 + timeOffset;
  return blockedByGateAt(a, b, at);
}