const fs = require('fs');
const path = require('path');

const worldJson = require('../src/game/worldData.json');
const MAP = worldJson.world;
const WORLD = { width: 6300, height: 4500 };
const GRID_CELL = 250;
const SEGMENTS = MAP.roads.flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, kind: r.kind, id: r.id, index: i })));

const roadGrid = new Map();
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function project(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  const q = { x: a.x + t * dx, y: a.y + t * dy };
  return { point: q, distance: distance(p, q) };
}

function nearestRoad(p) {
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

function riverDistance(p) {
  if (!MAP || p.x < 3290 || p.x > 4250) return Infinity;
  return MAP.river.points.slice(1).reduce((d, b, i) => Math.min(d, project(p, MAP.river.points[i], b).distance), Infinity);
}

function canRide(p) {
  if (!MAP || p.x <= 45 || p.x >= WORLD.width - 45 || p.y <= 45 || p.y >= WORLD.height - 45) return false;
  const near = nearestRoad(p);
  return near.distance <= 59 && (near.segment.kind === 'bridge' || riverDistance(p) >= MAP.river.width / 2 + 6);
}

console.log('--- TEST 1: Riding straight along a road past an intersection ---');
let pos = { x: 400, y: 400 };
let stuckCount = 0;
let totalSteps = 400;
for (let step = 0; step < totalSteps; step++) {
  const dt = 0.016;
  const speed = 205;
  const rawDx = 0, rawDy = speed * dt;
  let next = { x: pos.x + rawDx, y: pos.y + rawDy };
  if (!canRide(next)) {
    const near = nearestRoad(pos);
    const seg = near.segment;
    const rx = seg.b.x - seg.a.x, ry = seg.b.y - seg.a.y;
    const rlen = Math.hypot(rx, ry) || 1;
    const ux = rx / rlen, uy = ry / rlen;
    const dot = rawDx * ux + rawDy * uy;
    const toCenterX = near.point.x - pos.x, toCenterY = near.point.y - pos.y;
    const cDist = Math.hypot(toCenterX, toCenterY);
    const pull = Math.min(speed * dt * 0.35, cDist);
    const pullX = cDist > 0 ? (toCenterX / cDist) * pull : 0;
    const pullY = cDist > 0 ? (toCenterY / cDist) * pull : 0;
    let resolved = false;
    for (const factor of [1.0, 0.75, 0.5]) {
      const cand = { x: pos.x + ux * dot * factor + pullX, y: pos.y + uy * dot * factor + pullY };
      if (canRide(cand)) { next = cand; resolved = true; break; }
    }
    if (!resolved) {
      stuckCount++;
      next = pos;
    }
  }
  pos = next;
}
console.log(`Straight ride: Final pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), Stuck count: ${stuckCount}`);

console.log('--- TEST 2: Turning at an intersection (400, 680) from South to East ---');
pos = { x: 400, y: 675 };
stuckCount = 0;
for (let step = 0; step < 100; step++) {
  const dt = 0.016;
  const speed = 205;
  const rawDx = speed * dt, rawDy = 0;
  let next = { x: pos.x + rawDx, y: pos.y + rawDy };
  if (!canRide(next)) {
    const near = nearestRoad(pos);
    const seg = near.segment;
    const rx = seg.b.x - seg.a.x, ry = seg.b.y - seg.a.y;
    const rlen = Math.hypot(rx, ry) || 1;
    const ux = rx / rlen, uy = ry / rlen;
    const dot = rawDx * ux + rawDy * uy;
    const toCenterX = near.point.x - pos.x, toCenterY = near.point.y - pos.y;
    const cDist = Math.hypot(toCenterX, toCenterY);
    const pull = Math.min(speed * dt * 0.35, cDist);
    const pullX = cDist > 0 ? (toCenterX / cDist) * pull : 0;
    const pullY = cDist > 0 ? (toCenterY / cDist) * pull : 0;
    let resolved = false;
    for (const factor of [1.0, 0.75, 0.5]) {
      const cand = { x: pos.x + ux * dot * factor + pullX, y: pos.y + uy * dot * factor + pullY };
      if (canRide(cand)) { next = cand; resolved = true; break; }
    }
    if (!resolved) {
      const xFirst = Math.abs(rawDx) >= Math.abs(rawDy);
      for (const factor of [0.85, 0.55]) {
        const candA = xFirst ? { x: pos.x + rawDx * factor, y: pos.y + pullY } : { x: pos.x + pullX, y: pos.y + rawDy * factor };
        if (canRide(candA)) { next = candA; resolved = true; break; }
      }
    }
    if (!resolved) {
      stuckCount++;
      next = pos;
    }
  }
  pos = next;
}
console.log(`Turn ride: Final pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), Stuck count: ${stuckCount}`);

console.log('--- TEST 3: Diagonal movement along a curb (offset 55px from center) ---');
pos = { x: 455, y: 400 };
stuckCount = 0;
let wallCollisions = 0;
for (let step = 0; step < 200; step++) {
  const dt = 0.016;
  const speed = 205;
  const rawDx = 0.5 * speed * dt;
  const rawDy = 0.866 * speed * dt;
  let next = { x: pos.x + rawDx, y: pos.y + rawDy };
  if (!canRide(next)) {
    const near = nearestRoad(pos);
    const seg = near.segment;
    const rx = seg.b.x - seg.a.x, ry = seg.b.y - seg.a.y;
    const rlen = Math.hypot(rx, ry) || 1;
    const ux = rx / rlen, uy = ry / rlen;
    const dot = rawDx * ux + rawDy * uy;
    const toCenterX = near.point.x - pos.x, toCenterY = near.point.y - pos.y;
    const cDist = Math.hypot(toCenterX, toCenterY);
    const pull = Math.min(speed * dt * 0.35, cDist);
    const pullX = cDist > 0 ? (toCenterX / cDist) * pull : 0;
    const pullY = cDist > 0 ? (toCenterY / cDist) * pull : 0;
    let resolved = false;
    for (const factor of [1.0, 0.75, 0.5]) {
      const cand = { x: pos.x + ux * dot * factor + pullX, y: pos.y + uy * dot * factor + pullY };
      if (canRide(cand)) { next = cand; resolved = true; break; }
    }
    if (!resolved) {
      const xFirst = Math.abs(rawDx) >= Math.abs(rawDy);
      for (const factor of [0.85, 0.55]) {
        const candA = xFirst ? { x: pos.x + rawDx * factor, y: pos.y + pullY } : { x: pos.x + pullX, y: pos.y + rawDy * factor };
        if (canRide(candA)) { next = candA; resolved = true; break; }
        const candB = xFirst ? { x: pos.x + pullX, y: pos.y + rawDy * factor } : { x: pos.x + rawDx * factor, y: pos.y + pullY };
        if (canRide(candB)) { next = candB; resolved = true; break; }
      }
    }
    if (!resolved) {
      if (cDist > 1) {
        const nudge = {
          x: pos.x + (toCenterX / cDist) * Math.min(2.5, cDist),
          y: pos.y + (toCenterY / cDist) * Math.min(2.5, cDist),
        };
        if (canRide(nudge)) { next = nudge; resolved = true; }
      }
      if (!resolved) {
        if (near.distance >= 56) wallCollisions++;
        stuckCount++;
        next = pos;
      }
    }
  }
  pos = next;
}
console.log(`Curb ride: Final pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), Stuck count: ${stuckCount}, Wall collisions: ${wallCollisions}`);
