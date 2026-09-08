import type { Point } from './api';

export const WORLD = { width: 1120, height: 1360 };
export const COLS = [120, 400, 680, 960];
export const ROWS = [120, 400, 680, 960, 1240];
export const GARAGE = { x: 400, y: 750 };
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const nearest = (value: number, list: number[]) => list.reduce((a, b) => Math.abs(value - a) < Math.abs(value - b) ? a : b);
export function canRide(p: Point) {
  return p.x > 55 && p.x < 1055 && p.y > 55 && p.y < 1305 && (Math.abs(p.x - nearest(p.x, COLS)) < 53 || Math.abs(p.y - nearest(p.y, ROWS)) < 53);
}
export function getRoute(a: Point, b: Point): Point[] {
  const ax = nearest(a.x, COLS), ay = nearest(a.y, ROWS);
  const bx = nearest(b.x, COLS), by = nearest(b.y, ROWS);
  const av = Math.abs(a.x - ax) < Math.abs(a.y - ay);
  const bv = Math.abs(b.x - bx) < Math.abs(b.y - by);
  let points: Point[];
  if (av && !bv) points = [a, { x: ax, y: a.y }, { x: ax, y: by }, b];
  else if (!av && bv) points = [a, { x: a.x, y: ay }, { x: bx, y: ay }, b];
  else if (av && bv && ax === bx) points = [a, { x: ax, y: a.y }, b];
  else if (!av && !bv && ay === by) points = [a, { x: a.x, y: ay }, b];
  else if (av) {
    const y = ROWS.reduce((c, d) => Math.abs(c - a.y) + Math.abs(c - b.y) < Math.abs(d - a.y) + Math.abs(d - b.y) ? c : d);
    points = [a, { x: ax, y: a.y }, { x: ax, y }, { x: bx, y }, b];
  } else {
    const x = COLS.reduce((c, d) => Math.abs(c - a.x) + Math.abs(c - b.x) < Math.abs(d - a.x) + Math.abs(d - b.x) ? c : d);
    points = [a, { x: a.x, y: ay }, { x, y: ay }, { x, y: by }, b];
  }
  return points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > 3);
}
export function gameTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  return `${String(hours).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
}
export const BIKES = [
  { id: 'scooter', name: 'The Daydream', note: 'Your trusty starter', speed: 115, stat: 'Easy rider', cost: 0 },
  { id: 'bicycle', name: 'The Pedaler', note: 'Slow. Simple. Sweet.', speed: 86, stat: 'Eco friendly', cost: 0 },
  { id: 'express', name: 'The Express', note: 'A little more zip', speed: 153, stat: 'Fast & fun', cost: 180 },
];
export const TRAFFIC = Array.from({ length: 12 }, (_, i) => ({ id: i, vertical: i % 2 === 0, lane: i % 4, offset: i * 173, speed: 26 + i % 4 * 5, direction: i % 3 === 0 ? -1 : 1 }));
export function carPosition(car: typeof TRAFFIC[number], elapsed: number) {
  const span = car.vertical ? 1380 : 1140;
  const travel = ((car.offset + elapsed * car.speed * car.direction) % span + span) % span;
  return car.vertical ? { x: COLS[car.lane] + 20 * car.direction, y: travel } : { x: travel, y: ROWS[car.lane] + 20 * car.direction };
}