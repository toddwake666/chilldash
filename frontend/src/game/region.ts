import type { Point } from './api';

export type Road = { id: string; name: string; kind: string; points: Point[] };
export type Town = Point & { id: string; name: string; rx: number; ry: number; outline: Point[] };
export type Landmark = Point & { id: string; name: string; town: string; kind: string; width: number; height: number; entrance: Point; description: string };
export type Bridge = Point & { id: string; name: string; start: number; end: number };
export type Gate = Point & { id: string; name: string };
export type WorldData = {
  version: number; width: number; height: number; roads: Road[]; towns: Town[];
  blocks: (Point & { id: string; town: string; width: number; height: number; index: number })[];
  river: { name: string; width: number; points: Point[] }; bridges: Bridge[]; landmarks: Landmark[];
  railway: { name: string; y: number; start: number; end: number; cycle: number; close_at: number; open_at: number; train_at: number; train_until: number; train_speed: number; train_length: number; gates: Gate[] };
};
export let MAP: WorldData;
export const WORLD = { width: 6300, height: 4500 };
export const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x,a.y-b.y);
export type Segment = { a: Point; b: Point; kind: string; id: string; index: number };
export let SEGMENTS: Segment[] = [];
let timeOffset = 0;
let graph = new Map<string, { p: Point; neighbors: { key: string; cost: number }[] }>();
const key = (p: Point) => `${p.x},${p.y}`;
export function configureWorld(world: WorldData, serverTime: number) {
  MAP = world; WORLD.width = world.width; WORLD.height = world.height;
  timeOffset = serverTime - Date.now()/1000;
  SEGMENTS = world.roads.flatMap(r => r.points.slice(1).map((b,i) => ({ a:r.points[i], b, kind:r.kind, id:r.id, index:i })));
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
  let best = { distance:Infinity, point:p, segment:SEGMENTS[0] };
  for (const segment of SEGMENTS) {
    const projected = project(p,segment.a,segment.b);
    if (projected.distance < best.distance) best = { ...projected, segment };
  }
  return best;
}
export function riverDistance(p: Point) {
  if (!MAP || p.x < 3290 || p.x > 4250) return Infinity;
  return MAP.river.points.slice(1).reduce((d,b,i) => Math.min(d,project(p,MAP.river.points[i],b).distance),Infinity);
}
export function canRide(p: Point) {
  if (!MAP || p.x <= 45 || p.x >= WORLD.width-45 || p.y <= 45 || p.y >= WORLD.height-45) return false;
  const near=nearestRoad(p);
  return near.distance <= 59 && (near.segment.kind === 'bridge' || riverDistance(p) >= MAP.river.width/2+6);
}
export function onFootpath(p: Point) {
  const d=nearestRoad(p).distance; return d >= 39 && d <= 59 && canRide(p);
}
export function region(p: Point) {
  if (!MAP) return 'Sunnyvale';
  const bridge=MAP.bridges.find(b => p.x >= b.start && p.x <= b.end && Math.abs(p.y-b.y)<65);
  if (bridge) return bridge.name;
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
      queue.sort((x,y)=>y.cost-x.cost); const n=queue.pop()!;
      if(n.cost>best || n.cost>(costs.get(n.key) ?? Infinity))continue;
      if(targets.has(n.key) && n.cost+targets.get(n.key)!<best) {best=n.cost+targets.get(n.key)!;goal=n.key;}
      for(const edge of graph.get(n.key)?.neighbors || []) {
        const cost=n.cost+edge.cost;
        if(cost<(costs.get(edge.key) ?? Infinity)) {costs.set(edge.key,cost);prev.set(edge.key,n.key);queue.push({key:edge.key,cost});}
      }
    }
    middle=[];
    while(goal) {middle.unshift(graph.get(goal)!.p);goal=prev.get(goal)||'';}
    if(!middle.length)return [];
    if(routeCache.size>400)routeCache.clear(); routeCache.set(cacheKey,middle);
  }
  return [a,start.point,...middle,end.point,b].filter((p,i,arr)=>!i||distance(p,arr[i-1])>2);
}
export function railwayState(at=Date.now()/1000+timeOffset) {
  const r=MAP?.railway;
  if(!r)return { phase:0,closed:false,wait:0,trainVisible:false,trainX:0 };
  const phase=((at%r.cycle)+r.cycle)%r.cycle, closed=phase>=r.close_at&&phase<r.open_at;
  return { phase,closed,wait:closed?Math.ceil(r.open_at-phase):0,trainVisible:phase>=r.train_at&&phase<r.train_until,trainX:1600+(phase-r.train_at)*r.train_speed };
}
export function blockedByGate(a: Point,b: Point,closed=railwayState().closed) {
  if(!closed||!MAP)return null;
  return MAP.railway.gates.find(g => Math.abs(a.y-g.y)>=101 && Math.abs(b.x-g.x)<90 && ((a.y<=g.y-101&&b.y>g.y-101)||(a.y>=g.y+101&&b.y<g.y+101))) || null;
}