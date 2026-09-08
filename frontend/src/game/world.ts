import type { Point } from './api';

export const WORLD = { width: 3280, height: 1480 };
export const TOWN_OFFSET = 2160;
export const COLS = [120, 400, 680, 960];
export const ALL_COLS = [...COLS, ...COLS.map(x => x + TOWN_OFFSET)];
export const ROWS = [120, 400, 680, 960, 1240];
export const GARAGE = { x: 352, y: 750 };
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const nearest = (value: number, list: number[]) => list.reduce((a, b) => Math.abs(value - a) < Math.abs(value - b) ? a : b);
export const region = (p: Point) => p.x < 1060 ? 'Sunnyvale' : p.x > 2220 ? 'Pinecrest' : 'Whispering Pines';
export function canRide(p: Point) {
  if (p.x <= 55 || p.x >= 3225 || p.y <= 55 || p.y >= 1305) return false;
  if (p.x > 1015 && p.x < 2225) return Math.abs(p.y - 680) < 58;
  return Math.abs(p.x - nearest(p.x, ALL_COLS)) < 59 || Math.abs(p.y - nearest(p.y, ROWS)) < 59;
}
export function onFootpath(p: Point) {
  const dx = Math.abs(p.x - nearest(p.x, ALL_COLS)), dy = Math.abs(p.y - nearest(p.y, ROWS));
  return (dx >= 39 && dx <= 59 && dy > 37) || (dy >= 39 && dy <= 59 && dx > 37);
}
function townRoute(a: Point, b: Point): Point[] {
  const ax = nearest(a.x, ALL_COLS), ay = nearest(a.y, ROWS), bx = nearest(b.x, ALL_COLS), by = nearest(b.y, ROWS);
  const av = Math.abs(a.x - ax) < Math.abs(a.y - ay), bv = Math.abs(b.x - bx) < Math.abs(b.y - by);
  if (av && !bv) return [a, { x: ax, y: a.y }, { x: ax, y: by }, { x: b.x, y: by }, b];
  if (!av && bv) return [a, { x: a.x, y: ay }, { x: bx, y: ay }, { x: bx, y: b.y }, b];
  if (av && bv && ax === bx) return [a, { x: ax, y: a.y }, { x: ax, y: b.y }, b];
  if (!av && !bv && ay === by) return [a, { x: a.x, y: ay }, { x: b.x, y: ay }, b];
  if (av) {
    const y = ROWS.reduce((c, d) => Math.abs(c - a.y) + Math.abs(c - b.y) < Math.abs(d - a.y) + Math.abs(d - b.y) ? c : d);
    return [a, { x: ax, y: a.y }, { x: ax, y }, { x: bx, y }, { x: bx, y: b.y }, b];
  }
  const localCols = a.x < 1600 ? COLS : COLS.map(x => x + TOWN_OFFSET);
  const x = localCols.reduce((c, d) => Math.abs(c - a.x) + Math.abs(c - b.x) < Math.abs(d - a.x) + Math.abs(d - b.x) ? c : d);
  return [a, { x: a.x, y: ay }, { x, y: ay }, { x, y: by }, { x: b.x, y: by }, b];
}
export function getRoute(a: Point, b: Point) {
  let points: Point[];
  // Remain on the same street/footpath instead of sending a nearby rider back
  // to its center line just to reach a doorway a few steps away.
  const ax = nearest(a.x, ALL_COLS), bx = nearest(b.x, ALL_COLS), ay = nearest(a.y, ROWS), by = nearest(b.y, ROWS);
  if (ax === bx && Math.abs(a.x - ax) < 59 && Math.abs(b.x - bx) < 59) return [a, { x: a.x, y: b.y }, b].filter((p, i, arr) => !i || distance(p, arr[i - 1]) > 2);
  if (ay === by && Math.abs(a.y - ay) < 59 && Math.abs(b.y - by) < 59 && (region(a) === region(b) || ay === 680)) return [a, { x: b.x, y: a.y }, b].filter((p, i, arr) => !i || distance(p, arr[i - 1]) > 2);
  if (region(a) === region(b) && region(a) !== 'Whispering Pines') points = townRoute(a, b);
  else {
    const aExit = { x: a.x < 1060 ? 960 : a.x > 2220 ? 2280 : a.x, y: 680 };
    const bEntry = { x: b.x < 1060 ? 960 : b.x > 2220 ? 2280 : b.x, y: 680 };
    points = [...(region(a) === 'Whispering Pines' ? [a, aExit] : townRoute(a, aExit)), bEntry, ...(region(b) === 'Whispering Pines' ? [b] : townRoute(bEntry, b))];
  }
  return points.filter((p, i) => !i || distance(p, points[i - 1]) > 2);
}
export function gameTime(minutes: number) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
}
export function countdown(deadline: number | null | undefined, now: number) {
  const sec = Math.max(0, Math.ceil((deadline || now) - now));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export const BIKES = [
  { id: 'scooter', name: 'The Daydream', note: 'Your trusty starter', speed: 115, stat: 'Easy rider', cost: 0 },
  { id: 'bicycle', name: 'The Pedaler', note: 'Slow. Simple. Sweet.', speed: 86, stat: 'Eco friendly', cost: 0 },
  { id: 'express', name: 'The Express', note: 'A little more zip', speed: 153, stat: 'Fast & fun', cost: 180 },
];
export const TRAFFIC = Array.from({ length: 22 }, (_, i) => ({ id: i, town: i < 12 ? 0 : TOWN_OFFSET, vertical: i % 2 === 0, lane: i % 4, offset: i * 173, speed: 26 + i % 4 * 5, direction: i % 3 === 0 ? -1 : 1 }));
export function carPosition(car: typeof TRAFFIC[number], elapsed: number) {
  const span = car.vertical ? 1380 : 1020;
  const travel = ((car.offset + elapsed * car.speed * car.direction) % span + span) % span;
  return car.vertical ? { x: COLS[car.lane] + car.town + 20 * car.direction, y: travel } : { x: travel + car.town, y: ROWS[car.lane] + 20 * car.direction };
}