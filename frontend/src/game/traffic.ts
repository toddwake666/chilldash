import type { Point } from './api';
import { MAP, blockedByGate, distance, railwayState } from './region';

export type Vehicle = Point & {
  id: number;
  kind: 'car' | 'bike';
  path: Point[];
  length: number;
  travel: number;
  speed: number;
  currentSpeed: number;
  heading: number;
  waiting: boolean;
  isLoop: boolean;
  laneOffset: number;
  targetLaneOffset: number;
  overtakingId: number | null;
  baseOffset: number;
  stuckTimer?: number;
};

const lengthOf = (ps: Point[]) => ps.slice(1).reduce((s, p, i) => s + distance(p, ps[i]), 0);

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return a + diff * t;
}

function sample(v: Vehicle, travel: number): { x: number; y: number; heading: number } {
  const path = v.path;
  const numPts = path.length;
  if (numPts < 2) return { x: path[0]?.x || 0, y: path[0]?.y || 0, heading: 0 };

  const totalLen = v.length || 1;
  const dist = ((travel % totalLen) + totalLen) % totalLen;

  let acc = 0;
  for (let i = 1; i < numPts; i++) {
    const pA = path[i - 1];
    const pB = path[i];
    const segLen = distance(pA, pB);
    if (dist <= acc + segLen || i === numPts - 1) {
      const localDist = Math.max(0, Math.min(segLen, dist - acc));
      const dirX = (pB.x - pA.x) / (segLen || 1);
      const dirY = (pB.y - pA.y) / (segLen || 1);
      let heading = (Math.atan2(dirX, -dirY) * 180) / Math.PI;

      // Smooth corner heading interpolation near waypoints
      const CORNER_R = 26;
      const distToB = segLen - localDist;

      if (distToB < CORNER_R && (v.isLoop || i < numPts - 1)) {
        const nextIdx = i < numPts - 1 ? i + 1 : 1;
        const pC = path[nextIdx];
        const nextLen = distance(pB, pC);
        const nextDirX = (pC.x - pB.x) / (nextLen || 1);
        const nextDirY = (pC.y - pB.y) / (nextLen || 1);
        const nextHeading = (Math.atan2(nextDirX, -nextDirY) * 180) / Math.PI;

        const t = (CORNER_R - distToB) / (2 * CORNER_R);
        const ease = t * t * (3 - 2 * t);
        heading = lerpAngle(heading, nextHeading, ease);
      } else if (localDist < CORNER_R && (v.isLoop || i > 1)) {
        const prevIdx = i > 1 ? i - 2 : numPts - 2;
        const pPrev = path[prevIdx];
        const prevLen = distance(pPrev, pA);
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
      const totalOffset = v.baseOffset + v.laneOffset;

      return {
        x: baseX + normX * totalOffset,
        y: baseY + normY * totalOffset,
        heading,
      };
    }
    acc += segLen;
  }
  return { x: path[0].x, y: path[0].y, heading: 0 };
}

export function createTraffic(): Vehicle[] {
  const loopRoutes: Point[][] = [
    // --- Sunnyvale City Loops ---
    // SV North Block (Clockwise)
    [{ x: 400, y: 400 }, { x: 960, y: 400 }, { x: 960, y: 680 }, { x: 400, y: 680 }, { x: 400, y: 400 }],
    // SV West Block (Clockwise)
    [{ x: 120, y: 400 }, { x: 400, y: 400 }, { x: 400, y: 960 }, { x: 120, y: 960 }, { x: 120, y: 400 }],
    // SV South-Central Block (Counter-Clockwise)
    [{ x: 400, y: 680 }, { x: 400, y: 1240 }, { x: 680, y: 1240 }, { x: 680, y: 680 }, { x: 400, y: 680 }],
    // SV East Block (Clockwise)
    [{ x: 680, y: 680 }, { x: 960, y: 680 }, { x: 960, y: 1240 }, { x: 680, y: 1240 }, { x: 680, y: 680 }],
    // SV Downtown Perimeter (Counter-Clockwise)
    [{ x: 400, y: 400 }, { x: 400, y: 960 }, { x: 960, y: 960 }, { x: 960, y: 400 }, { x: 400, y: 400 }],

    // --- Pinecrest Loops ---
    // PC North Loop
    [{ x: 2280, y: 400 }, { x: 2840, y: 400 }, { x: 2840, y: 960 }, { x: 2280, y: 960 }, { x: 2280, y: 400 }],
    // PC Central-South Loop
    [{ x: 2560, y: 680 }, { x: 3120, y: 680 }, { x: 3120, y: 1240 }, { x: 2560, y: 1240 }, { x: 2560, y: 680 }],
    // PC North-East Loop
    [{ x: 2840, y: 120 }, { x: 3120, y: 120 }, { x: 3120, y: 680 }, { x: 2840, y: 680 }, { x: 2840, y: 120 }],

    // --- Bongaon Loops ---
    // Bongaon North Loop (safely stays north of stadium and north of station)
    [{ x: 4000, y: 350 }, { x: 4640, y: 350 }, { x: 4640, y: 680 }, { x: 4000, y: 680 }, { x: 4000, y: 350 }],
    // Bongaon Stadium Perimeter Loop (cleanly bypasses Bongaon Stadium pitch)
    [{ x: 4320, y: 680 }, { x: 5680, y: 680 }, { x: 5680, y: 1360 }, { x: 4320, y: 1360 }, { x: 4320, y: 680 }],
    // Bongaon South-West Loop (safely stays south of station and south of stadium)
    [{ x: 4000, y: 1360 }, { x: 4640, y: 1360 }, { x: 4640, y: 1700 }, { x: 4000, y: 1700 }, { x: 4000, y: 1360 }],

    // --- Habra Loops ---
    // Habra Downtown & Station Loop
    [{ x: 1980, y: 2380 }, { x: 2840, y: 2380 }, { x: 2840, y: 3380 }, { x: 1980, y: 3380 }, { x: 1980, y: 2380 }],
    // Habra Residential Colony & East Loop
    [{ x: 2560, y: 2720 }, { x: 3440, y: 2720 }, { x: 3440, y: 3720 }, { x: 2560, y: 3720 }, { x: 2560, y: 2720 }],

    // --- Petrapole Loops ---
    // Petrapole Commercial Loop
    [{ x: 4440, y: 2720 }, { x: 5460, y: 2720 }, { x: 5460, y: 3460 }, { x: 4440, y: 3460 }, { x: 4440, y: 2720 }],
    // Petrapole South Ring
    [{ x: 4780, y: 3100 }, { x: 5840, y: 3100 }, { x: 5840, y: 4180 }, { x: 4780, y: 4180 }, { x: 4780, y: 3100 }],
  ];

  // Areas strictly prohibited to traffic vehicles (Stadium pitch, Station platform, Forest Department compound)
  const RESTRICTED_AREAS = [
    // Bongaon Football Stadium pitch & field
    { minX: 4650, maxX: 5270, minY: 710, maxY: 1290 },
    // Bongaon Junction Station platform & track corridor
    { minX: 3640, maxX: 3980, minY: 870, maxY: 1170 },
    // Bongaon Forest Department compound & grounds
    { minX: 5060, maxX: 5410, minY: 2030, maxY: 2270 },
  ];

  const pathIntersectsRestricted = (path: Point[]): boolean => {
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      for (let s = 0; s <= 10; s++) {
        const sx = p1.x + (p2.x - p1.x) * (s / 10);
        const sy = p1.y + (p2.y - p1.y) * (s / 10);
        for (const area of RESTRICTED_AREAS) {
          if (sx >= area.minX && sx <= area.maxX && sy >= area.minY && sy <= area.maxY) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Also include scenic roads formatted as continuous 2-way loops
  ['pine-trail', 'ray-bridge', 'revenuecat-bridge', 'habra-bridge', 'habra-west-loop', 'habra-east-loop', 'bongaon-petrapole-highway', 'bongaon-riverwalk'].forEach(id => {
    const r = MAP?.roads.find(road => road.id === id);
    if (r && r.points.length > 2) {
      const isAlreadyClosed = distance(r.points[0], r.points[r.points.length - 1]) < 10;
      const points = isAlreadyClosed ? r.points : [...r.points, ...r.points.slice(1, -1).reverse(), r.points[0]];
      if (!pathIntersectsRestricted(points)) {
        loopRoutes.push(points);
      }
    }
  });

  const validRoutes = loopRoutes.filter(path => !pathIntersectsRestricted(path));

  return validRoutes.flatMap((path, i) => {
    const length = lengthOf(path);
    // Balanced pleasant city and highway density:
    // Long highways/perimeters have 3 vehicles; standard town blocks have 2 vehicles evenly spaced
    const count = length >= 3200 ? 3 : length >= 2000 ? 2 : 2;

    return Array.from({ length: count }, (_, j) => {
      const id = i * 10 + j;
      const kind: 'car' | 'bike' = (i * 2 + j) % 3 === 0 ? 'bike' : 'car';
      // Balanced pleasant city cruising speeds:
      // Cars: 46-54 px/s, Bikes: 38-44 px/s
      const speed = kind === 'car' ? 46 + (id % 3) * 4 : 38 + (id % 3) * 3;
      const baseOffset = kind === 'car' ? 16 : 20;
      // Evenly spaced along the loop with zero initial clumping
      const initialTravel = (j / count) * length;

      const v: Vehicle = {
        id,
        kind,
        path,
        length,
        travel: initialTravel,
        speed,
        currentSpeed: speed,
        heading: 0,
        waiting: false,
        isLoop: true,
        laneOffset: 0,
        targetLaneOffset: 0,
        overtakingId: null,
        baseOffset,
        x: 0,
        y: 0,
      };

      const placed = { ...v, ...sample(v, v.travel) };
      const railSim = railwayState();
      for (let n = 0; n < 16 && MAP.railway.gates.some(g => railSim.gates[g.id]?.closed && Math.abs(placed.x - g.x) < 90 && Math.abs(placed.y - g.y) < 125); n++) {
        placed.travel -= 25;
        const resampled = sample(placed, placed.travel);
        placed.x = resampled.x;
        placed.y = resampled.y;
        placed.heading = resampled.heading;
      }
      return placed;
    });
  });
}

export function stepTraffic(vehicles: Vehicle[], dt: number, rider?: Point, at?: number): Vehicle[] {
  const len = vehicles.length;

  for (let vi = 0; vi < len; vi++) {
    const v = vehicles[vi];

    // Check railway gates (only stops if THIS gate is closed)
    const prelimNext = sample(v, v.travel + v.speed * dt);
    const gated = !!blockedByGate(v, prelimNext, at);
    if (gated) {
      v.waiting = true;
      v.currentSpeed = Math.max(0, v.currentSpeed - 90 * dt);
      continue;
    }

    const rad = (v.heading * Math.PI) / 180;
    const fwdX = Math.sin(rad);
    const fwdY = -Math.cos(rad);
    const latX = -fwdY;
    const latY = fwdX;

    let targetSpeedFactor = 1.0;
    let mustWait = false;
    let obstacleDirectlyAhead = false;
    let canOvertake = v.kind === 'car';

    // 1. Vehicle-to-Vehicle Interaction & Smart Anti-Overlap
    for (let i = 0; i < len; i++) {
      if (i === vi) continue;
      const other = vehicles[i];

      const dx = other.x - v.x;
      const dy = other.y - v.y;
      if (Math.abs(dx) > 110 || Math.abs(dy) > 110) continue;

      const ahead = dx * fwdX + dy * fwdY;
      const lateral = Math.abs(dx * latX + dy * latY);

      const otherRad = (other.heading * Math.PI) / 180;
      const otherFwdX = Math.sin(otherRad);
      const otherFwdY = -Math.cos(otherRad);
      const cosHeading = fwdX * otherFwdX + fwdY * otherFwdY;

      // --- A. SAME-DIRECTION VEHICLES & ANTI-OVERLAP ---
      if (cosHeading > 0.45) {
        const dist = Math.hypot(dx, dy);

        // Physical Overlap Prevention:
        // If vehicles are within bumper contact (< 40px) and in same travel corridor
        if (dist < 40 && lateral < 18) {
          // If we are behind the other vehicle (or overlapping with it), halt immediately!
          if (ahead > -6) {
            mustWait = true;
            targetSpeedFactor = 0;
            obstacleDirectlyAhead = true;
            break;
          } else {
            // We are the lead vehicle in front: keep moving forward to clear separation!
            targetSpeedFactor = Math.max(targetSpeedFactor, 1.0);
            continue;
          }
        }

        // Safe following distance corridor
        const minFollow = v.kind === 'car' ? 38 : 28;
        const slowZone = v.kind === 'car' ? 76 : 56;

        if (ahead > 0 && ahead < slowZone && lateral < 18) {
          obstacleDirectlyAhead = true;

          // Attempt overtake only if we are faster, not tailgating, and passing lane is free
          if (canOvertake && v.speed > other.speed && ahead > minFollow * 1.15) {
            let passingLaneBlocked = false;
            for (let k = 0; k < len; k++) {
              if (k === vi || k === i) continue;
              const third = vehicles[k];
              const tdx = third.x - v.x;
              const tdy = third.y - v.y;
              if (Math.abs(tdx) < 70 && Math.abs(tdy) < 70) {
                const thirdAhead = tdx * fwdX + tdy * fwdY;
                const thirdLat = tdx * latX + tdy * latY;
                if (thirdAhead > -20 && thirdAhead < 70 && thirdLat < 2) {
                  passingLaneBlocked = true;
                  break;
                }
              }
            }

            if (!passingLaneBlocked) {
              v.targetLaneOffset = -13;
              v.overtakingId = other.id;
              targetSpeedFactor = Math.max(targetSpeedFactor, 1.0);
              continue;
            }
          }

          // Follow safely without ramming or bumper-hugging
          if (ahead <= minFollow || (other.waiting && ahead < minFollow * 1.25)) {
            mustWait = true;
            targetSpeedFactor = 0;
            break;
          } else {
            const ratio = (ahead - minFollow) / (slowZone - minFollow);
            targetSpeedFactor = Math.min(targetSpeedFactor, Math.max(0.15, ratio));
          }
        }

        // If completed overtake, return to lane
        if (v.overtakingId === other.id && ahead < -24) {
          v.overtakingId = null;
          v.targetLaneOffset = 0;
        }
        continue;
      }

      // --- B. CROSS-TRAFFIC & INTERSECTION YIELD ---
      const isCrossing = Math.abs(cosHeading) <= 0.45;
      if (isCrossing) {
        const vAhead = dx * fwdX + dy * fwdY;
        const otherAhead = -dx * otherFwdX - dy * otherFwdY;
        const inCrossingZone = vAhead > -16 && vAhead < 50 && otherAhead > -16 && otherAhead < 50;

        if (inCrossingZone) {
          const weHavePriority = v.id < other.id;
          let weShouldYield = false;

          if (otherAhead < -10) {
            weShouldYield = false;
          } else if (vAhead < -10) {
            weShouldYield = false;
          } else if (otherAhead > 0 && otherAhead < 25 && vAhead > 30) {
            weShouldYield = true;
          } else if (vAhead > 0 && vAhead < 25 && otherAhead > 30) {
            weShouldYield = false;
          } else {
            weShouldYield = !weHavePriority;
          }

          // Anti-deadlock: priority vehicle goes if both waiting
          if (v.waiting && other.waiting) {
            weShouldYield = !weHavePriority;
          }

          if (weShouldYield) {
            mustWait = true;
            targetSpeedFactor = 0;
            break;
          }
        }
        continue;
      }

      // --- C. OPPOSING TRAFFIC SAFEGUARD ---
      if (cosHeading < -0.45) {
        const dist = Math.hypot(dx, dy);
        if (dist < 34 && lateral < 16 && ahead > 0) {
          mustWait = true;
          targetSpeedFactor = 0;
          break;
        }
      }
    }

    if (v.overtakingId && !vehicles.some(o => o.id === v.overtakingId && Math.abs(o.x - v.x) < 80 && Math.abs(o.y - v.y) < 80)) {
      v.overtakingId = null;
      v.targetLaneOffset = 0;
    }

    // 2. Rider Interaction (realistic safe distance / yield only when rider is directly in front)
    if (rider) {
      const rdx = rider.x - v.x;
      const rdy = rider.y - v.y;
      const distToRider = Math.hypot(rdx, rdy);

      // Only evaluate if rider is nearby
      if (distToRider < 60) {
        const ahead = rdx * fwdX + rdy * fwdY;
        const lateral = Math.abs(rdx * latX + rdy * latY);

        // Vehicle travel path width is ~14 units. Only yield if rider is directly in front.
        const inTravelLane = lateral < 13;
        const minStop = v.kind === 'car' ? 18 : 14;
        const slowZone = v.kind === 'car' ? 42 : 32;

        // Rider must actually be ahead of vehicle bumper (> 4) and within slow zone
        if (inTravelLane && ahead > 4 && ahead < slowZone) {
          if (ahead <= minStop) {
            mustWait = true;
            v.currentSpeed = Math.max(0, v.currentSpeed - 80 * dt);
          } else {
            const ratio = (ahead - minStop) / (slowZone - minStop);
            targetSpeedFactor = Math.min(targetSpeedFactor, Math.max(0.45, ratio));
          }
        }
      }
    }

    // 3. Smooth Dynamic Acceleration, Braking, and Steering
    v.waiting = mustWait;
    if (mustWait) {
      v.stuckTimer = (v.stuckTimer || 0) + dt;
      // Only crawl to break deadlock if NOT stuck behind another car in our lane!
      if (v.stuckTimer > 3.0 && !obstacleDirectlyAhead) {
        mustWait = false;
        targetSpeedFactor = 0.45;
      }
    } else {
      v.stuckTimer = 0;
    }
    const targetSpeed = mustWait ? 0 : v.speed * targetSpeedFactor;
    const accelRate = targetSpeed > v.currentSpeed ? 3.0 : 6.0;
    v.currentSpeed += (targetSpeed - v.currentSpeed) * Math.min(1, accelRate * dt);
    v.laneOffset += (v.targetLaneOffset - v.laneOffset) * Math.min(1, 3.5 * dt);

    const travel = v.travel + v.currentSpeed * dt;
    const next = sample(v, travel);
    v.x = next.x;
    v.y = next.y;
    v.heading = next.heading;
    v.travel = travel;
  }

  return vehicles;
}

/**
 * Resets deadlocked or stuck vehicles during an auto-healing performance clean.
 */
export function cleanTraffic(vehicles: Vehicle[]): Vehicle[] {
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    v.stuckTimer = 0;
    v.waiting = false;
    v.overtakingId = null;
  }
  return vehicles;
}