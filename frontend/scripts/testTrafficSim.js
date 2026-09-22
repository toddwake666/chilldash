const worldJson = require('../src/game/worldData.json');
const MAP = worldJson.world;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function railwayState(at = Date.now() / 1000) {
  const r = MAP?.railway;
  if (!r) return { phase: 0, closed: false, wait: 0, trainVisible: false, trainX: 0 };
  const phase = ((at % r.cycle) + r.cycle) % r.cycle, closed = phase >= r.close_at && phase < r.open_at;
  return { phase, closed, wait: closed ? Math.ceil(r.open_at - phase) : 0, trainVisible: phase >= r.train_at && phase < r.train_until, trainX: 1600 + (phase - r.train_at) * r.train_speed };
}

function blockedByGate(a, b, closed = railwayState().closed) {
  if (!closed || !MAP) return null;
  return MAP.railway.gates.find(g => Math.abs(a.y - g.y) >= 101 && Math.abs(b.x - g.x) < 90 && ((a.y <= g.y - 101 && b.y > g.y - 101) || (a.y >= g.y + 101 && b.y < g.y + 101))) || null;
}

const lengthOf = ps => ps.slice(1).reduce((s, p, i) => s + distance(p, ps[i]), 0);

function sample(v, travel) {
  const period = 2 * v.length, phase = ((travel % period) + period) % period, reverse = phase > v.length;
  let left = reverse ? period - phase : phase;
  for (let i = 1; i < v.path.length; i++) {
    const a = v.path[i - 1], b = v.path[i], len = distance(a, b);
    if (left <= len || i === v.path.length - 1) {
      const t = Math.max(0, Math.min(1, left / (len || 1))), dir = reverse ? -1 : 1, dx = (b.x - a.x) / (len || 1) * dir, dy = (b.y - a.y) / (len || 1) * dir;
      return { x: a.x + (b.x - a.x) * t - dy * 17, y: a.y + (b.y - a.y) * t + dx * 17, heading: Math.atan2(dx, -dy) * 180 / Math.PI };
    }
    left -= len;
  }
  return { x: v.path[0].x, y: v.path[0].y, heading: 0 };
}

function createTraffic() {
  const paths = [];
  const townRoutes = [
    [[120, 400], [400, 400], [680, 400], [960, 400]], [[400, 120], [400, 400], [400, 680], [400, 960], [400, 1240]],
    [[2280, 680], [2560, 680], [2840, 680], [3120, 680]], [[2840, 120], [2840, 400], [2840, 680], [2840, 960], [2840, 1240]],
    [[4200, 400], [4490, 400], [4840, 400], [5150, 400], [5450, 400]], [[4200, 400], [4200, 740], [4200, 1080], [4200, 1420]],
    [[2280, 2380], [2280, 2720], [2280, 3380], [2280, 3720]], [[2840, 2380], [2840, 2720], [2840, 3380], [2840, 3720]], [[3280, 2380], [3280, 2720], [3280, 3380], [3280, 3720]],
    [[4440, 3100], [4780, 3100], [5120, 3100], [5460, 3100], [5840, 3100]], [[5840, 2720], [5840, 3100], [5840, 3460], [5840, 3820], [5840, 4180]],
  ];
  townRoutes.forEach(path => paths.push(path.map(([x, y]) => ({ x, y }))));
  ['pine-trail', 'ray-bridge', 'revenuecat-bridge', 'habra-bridge', 'habra-west-loop', 'habra-east-loop'].forEach(id => {
    const r = MAP.roads.find(r => r.id === id);
    if (r) paths.push(r.points);
  });
  return paths.flatMap((path, i) => {
    const count = i >= 6 && i <= 8 ? 5 : 3;
    const length = lengthOf(path);
    return Array.from({ length: count }, (_, j) => {
      const id = i * 10 + j;
      const kind = j % 2 === 0 ? 'car' : 'bike';
      const baseSpeed = kind === 'car' ? 195 : 165;
      const speed = baseSpeed + (id % 3) * 10;
      const v = { id, kind, path, length, travel: (j + .12) * length * 2 / count, speed, x: 0, y: 0, heading: 0, waiting: false };
      let placed = { ...v, ...sample(v, v.travel) };
      if (railwayState().closed) {
        for (let n = 0; n < 16 && MAP.railway.gates.some(g => Math.abs(placed.x - g.x) < 90 && Math.abs(placed.y - g.y) < 125); n++) {
          placed.travel -= 20; placed = { ...placed, ...sample(placed, placed.travel) };
        }
      }
      return placed;
    });
  });
}

function stepTraffic(vehicles, dt, rider, at) {
  const closed = railwayState(at).closed;
  return vehicles.map(v => {
    const prelimNext = sample(v, v.travel + v.speed * dt);
    const gated = !!blockedByGate(v, prelimNext, closed);
    if (gated) return { ...v, waiting: true };

    const dx = Math.sin(v.heading * Math.PI / 180), dy = -Math.cos(v.heading * Math.PI / 180);
    const riderWaiting = !!rider && closed && MAP.railway.gates.some(g => Math.abs(rider.x - g.x) < 90 && Math.abs(rider.y - g.y) >= 99 && Math.abs(rider.y - g.y) < 225);
    const riderAhead = riderWaiting && rider ? ((rider.x - v.x) * dx + (rider.y - v.y) * dy) : Infinity;
    const riderInLane = !!rider && Math.abs((rider.x - v.x) * dy - (rider.y - v.y) * dx) < 23;
    if (riderWaiting && riderInLane && riderAhead > 0 && riderAhead < 52) return { ...v, waiting: true };

    let speedFactor = 1.0;
    let mustWait = false;
    const safeFollowDist = v.kind === 'bike' ? 42 : 54;
    const minStopDist = v.kind === 'bike' ? 20 : 28;

    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (other.id === v.id) continue;
      if (Math.abs(other.x - v.x) > safeFollowDist || Math.abs(other.y - v.y) > safeFollowDist) continue;
      const ahead = (other.x - v.x) * dx + (other.y - v.y) * dy;
      if (ahead > 0 && ahead < safeFollowDist) {
        const lateral = Math.abs((other.x - v.x) * dy - (other.y - v.y) * dx);
        if (lateral < 16) {
          const cosDiff = Math.cos((v.heading - other.heading) * Math.PI / 180);
          if (cosDiff > 0.7) {
            if (ahead <= minStopDist || (other.waiting && ahead < minStopDist * 1.35)) {
              mustWait = true;
              break;
            } else {
              const distanceRatio = (ahead - minStopDist) / (safeFollowDist - minStopDist);
              speedFactor = Math.min(speedFactor, Math.max(0.35, distanceRatio));
            }
          }
        }
      }
    }
    if (mustWait) return { ...v, waiting: true };

    const effectiveSpeed = v.speed * speedFactor;
    const travel = v.travel + effectiveSpeed * dt;
    const next = sample(v, travel);
    return { ...v, ...next, travel, waiting: false };
  });
}

let vehicles = createTraffic();
console.log('Total vehicles spawned:', vehicles.length);

// 3000 steps simulation (60 seconds)
let lockedVehicles = 0;
for (let t = 0; t < 3000; t++) {
  vehicles = stepTraffic(vehicles, 0.02, { x: 400, y: 400 }, t * 0.02);
}
const gateClosed = railwayState(3000 * 0.02).closed;
const waitingNonRail = vehicles.filter(v => v.waiting && Math.abs(v.y - 3050) > 300).length;
console.log(`After 60s sim (rail closed: ${gateClosed}): Non-rail waiting vehicles: ${waitingNonRail}`);
