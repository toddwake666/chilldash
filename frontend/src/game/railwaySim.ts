/**
 * Regional Railway Simulation Engine
 * Simulates 4 distinct trains traversing the Eastern Railway Network:
 * - Habra-Petrapole Express (Eastbound Mainline)
 * - Petrapole-Habra Local (Westbound Mainline)
 * - Bongaon-Petrapole Suburban (Southbound Branch to Mainline)
 * - Petrapole-Bongaon Connector (Mainline to Northbound Branch)
 *
 * Each train halts at intermediate passenger stations (Habra, Petrapole, Bongaon Junction).
 * Level crossing gates close ONLY when a train is approaching nearby, and reopen immediately
 * once the train clears.
 */

import { MAP } from './region';
import worldData from './worldData.json';
import type { Point } from './api';

export interface TrainCoach {
  x: number;
  y: number;
  angle: number; // degrees
  isEngine: boolean;
}

export interface ActiveTrain {
  id: string;
  name: string;
  route: string;
  head: Point;
  tail: Point;
  heading: number;
  speed: number;
  halting: boolean;
  stationName?: string;
  coaches: TrainCoach[];
}

export interface GateState {
  id: string;
  name: string;
  x: number;
  y: number;
  closed: boolean;
  wait: number;
  approachingTrain?: string;
}

export interface RailSimulation {
  phase: number;
  trains: ActiveTrain[];
  gates: Record<string, GateState>;
  closed: boolean; // rider's immediate gate
  wait: number;    // rider's immediate gate
  railNearby: boolean;
  trainVisible: boolean;
  trainX: number; // legacy fallback
}

interface StationHalt {
  name: string;
  s: number; // distance along path
  duration: number; // seconds
}

interface PathDef {
  points: Point[];
  cumDist: number[];
  totalLength: number;
}

function buildPathDef(raw: Point[]): PathDef {
  const points = raw.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
  const cumDist: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
    cumDist.push(total);
  }
  return { points, cumDist, totalLength: total };
}

function samplePath(path: PathDef, s: number): { x: number; y: number; angle: number } {
  const { points, cumDist, totalLength } = path;
  if (totalLength <= 0 || points.length === 0) {
    return { x: 0, y: 0, angle: 0 };
  }

  // Clamp s within path bounds
  const clamped = Math.max(0, Math.min(totalLength, s));

  // Find segment
  let i = 0;
  while (i < cumDist.length - 1 && cumDist[i + 1] < clamped) {
    i++;
  }

  const p0 = points[i];
  const p1 = points[Math.min(i + 1, points.length - 1)];
  const segLen = (cumDist[i + 1] ?? totalLength) - cumDist[i];

  if (segLen <= 0.001) {
    return { x: p0.x, y: p0.y, angle: 0 };
  }

  const t = Math.max(0, Math.min(1, (clamped - cumDist[i]) / segLen));
  const x = p0.x + (p1.x - p0.x) * t;
  const y = p0.y + (p1.y - p0.y) * t;
  const angle = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;

  return { x, y, angle };
}

// 4 Train Route Definitions
interface TrainConfig {
  id: string;
  name: string;
  route: string;
  path: PathDef;
  stations: StationHalt[];
  speed: number;
  coachCount: number;
  coachLength: number;
  coachSpacing: number;
  initialOffset: number; // offset in seconds
}

// Route 1: Mainline Eastbound (Habra -> Petrapole)
const PATH_MAIN_EAST = buildPathDef([
  { x: 1550, y: 3050 },
  { x: 5950, y: 3050 }
]);

// Route 2: Mainline Westbound (Petrapole -> Habra)
const PATH_MAIN_WEST = buildPathDef([
  { x: 5950, y: 3050 },
  { x: 1550, y: 3050 }
]);

// Route 3: Bongaon Branch Southbound (Bongaon Junction -> Petrapole)
const PATH_BONGAON_SOUTH = buildPathDef([
  { x: 3880, y: 450 },
  { x: 3880, y: 950 },
  { x: 3880, y: 1450 },
  { x: 3960, y: 1950 },
  { x: 4080, y: 2500 },
  { x: 4200, y: 3050 },
  { x: 5950, y: 3050 }
]);

// Route 4: Bongaon Branch Northbound (Petrapole / Bridge -> Bongaon Junction)
const PATH_BONGAON_NORTH = buildPathDef([
  { x: 5950, y: 3050 },
  { x: 4200, y: 3050 },
  { x: 4080, y: 2500 },
  { x: 3960, y: 1950 },
  { x: 3880, y: 1450 },
  { x: 3880, y: 950 },
  { x: 3880, y: 450 }
]);

const TRAIN_CONFIGS: TrainConfig[] = [
  {
    id: 'habra-petrapole-exp',
    name: 'Habra-Petrapole Express',
    route: 'Mainline Eastbound',
    path: PATH_MAIN_EAST,
    stations: [
      { name: 'Habra Railway Station', s: 2590 - 1550 + 152, duration: 11 },
      { name: 'Petrapole Railway Station', s: 4950 - 1550 + 152, duration: 11 }
    ],
    speed: 110,
    coachCount: 5,
    coachLength: 72,
    coachSpacing: 76,
    initialOffset: 0
  },
  {
    id: 'petrapole-habra-loc',
    name: 'Petrapole-Habra Local',
    route: 'Mainline Westbound',
    path: PATH_MAIN_WEST,
    stations: [
      { name: 'Petrapole Railway Station', s: 5950 - 4950 + 152, duration: 11 },
      { name: 'Habra Railway Station', s: 5950 - 2590 + 152, duration: 11 }
    ],
    speed: 110,
    coachCount: 5,
    coachLength: 72,
    coachSpacing: 76,
    initialOffset: 42
  },
  {
    id: 'bongaon-suburban',
    name: 'Bongaon-Petrapole Suburban',
    route: 'Bongaon Branch Southbound',
    path: PATH_BONGAON_SOUTH,
    stations: [
      { name: 'Bongaon Junction Station', s: 518, duration: 11 },
      { name: 'Petrapole Railway Station', s: 3496, duration: 11 }
    ],
    speed: 105,
    coachCount: 4,
    coachLength: 72,
    coachSpacing: 76,
    initialOffset: 22
  },
  {
    id: 'petrapole-bongaon-con',
    name: 'Petrapole-Bongaon Link',
    route: 'Bongaon Branch Northbound',
    path: PATH_BONGAON_NORTH,
    stations: [
      { name: 'Petrapole Railway Station', s: 1114, duration: 11 },
      { name: 'Bongaon Junction Station', s: 4064, duration: 11 }
    ],
    speed: 105,
    coachCount: 4,
    coachLength: 72,
    coachSpacing: 76,
    initialOffset: 65
  }
];

interface TrainSimState {
  s: number;
  speed: number;
  halting: boolean;
  stationName?: string;
  haltRemaining?: number;
}

/**
 * Compute the distance s along the path for a train with station halts
 */
function computeTrainPosition(cfg: TrainConfig, timeSec: number): TrainSimState {
  const totalTravelTime = cfg.path.totalLength / cfg.speed;
  const totalHaltTime = cfg.stations.reduce((sum, st) => sum + st.duration, 0);
  const pauseTime = 16; // pause at end before restarting
  const cycle = totalTravelTime + totalHaltTime + pauseTime;

  const t = (((timeSec + cfg.initialOffset) % cycle) + cycle) % cycle;

  let currentDist = 0;
  let elapsed = 0;

  // Sorted stations along path
  const sortedStations = [...cfg.stations].sort((a, b) => a.s - b.s);

  let prevS = 0;
  for (const st of sortedStations) {
    const legDist = st.s - prevS;
    const legTime = legDist / cfg.speed;

    if (t < elapsed + legTime) {
      // Travelling to station
      const dt = t - elapsed;
      return {
        s: prevS + dt * cfg.speed,
        speed: cfg.speed,
        halting: false
      };
    }
    elapsed += legTime;

    if (t < elapsed + st.duration) {
      // Halting at station
      const rem = Math.ceil(elapsed + st.duration - t);
      return {
        s: st.s,
        speed: 0,
        halting: true,
        stationName: st.name,
        haltRemaining: rem
      };
    }
    elapsed += st.duration;
    prevS = st.s;
  }

  // Final leg to terminus
  const finalLegDist = cfg.path.totalLength - prevS;
  const finalLegTime = finalLegDist / cfg.speed;

  if (t < elapsed + finalLegTime) {
    const dt = t - elapsed;
    return {
      s: prevS + dt * cfg.speed,
      speed: cfg.speed,
      halting: false
    };
  }

  // Terminus turn-around / reset (off-track)
  return {
    s: -9999, // inactive / off-screen
    speed: 0,
    halting: false
  };
}

/**
 * Find distance from gate (gx, gy) along path def, if the path passes near it
 */
function getGateDistAlongPath(path: PathDef, gx: number, gy: number, maxRadius = 80): number | null {
  const { points, cumDist } = path;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const vx = p1.x - p0.x;
    const vy = p1.y - p0.y;
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1) continue;

    // Project gate onto segment
    const t = Math.max(0, Math.min(1, ((gx - p0.x) * vx + (gy - p0.y) * vy) / lenSq));
    const projX = p0.x + t * vx;
    const projY = p0.y + t * vy;

    const distToGate = Math.hypot(gx - projX, gy - projY);
    if (distToGate <= maxRadius) {
      return cumDist[i] + t * Math.sqrt(lenSq);
    }
  }
  return null;
}

// Precompute gate path distances for all trains and gates
const GATE_PATH_CACHE: Record<string, Record<string, number | null>> = {};
function initGatePathCache() {
  const gates = MAP?.railway?.gates || (worldData as any)?.world?.railway?.gates || [];
  for (const cfg of TRAIN_CONFIGS) {
    GATE_PATH_CACHE[cfg.id] = {};
    for (const g of gates) {
      GATE_PATH_CACHE[cfg.id][g.id] = getGateDistAlongPath(cfg.path, g.x, g.y);
    }
  }
}

let cachedSim: RailSimulation | null = null;
let lastSimAt = 0;
let lastSimRiderX = -9999;
let lastSimRiderY = -9999;

/**
 * Main Railway Simulation Calculation
 */
export function getRailwaySimulation(at = Date.now() / 1000, riderX?: number, riderY?: number): RailSimulation {
  if (
    cachedSim &&
    Math.abs(at - lastSimAt) < 0.045 &&
    (riderX === undefined || Math.abs((riderX ?? 0) - lastSimRiderX) < 8) &&
    (riderY === undefined || Math.abs((riderY ?? 0) - lastSimRiderY) < 8)
  ) {
    return cachedSim;
  }

  if (Object.keys(GATE_PATH_CACHE).length === 0) {
    initGatePathCache();
  }

  const gatesList = MAP?.railway?.gates || (worldData as any)?.world?.railway?.gates || [];
  const activeTrains: ActiveTrain[] = [];
  const trainStates: Record<string, TrainSimState> = {};

  // 1. Simulate 4 Trains
  for (const cfg of TRAIN_CONFIGS) {
    const state = computeTrainPosition(cfg, at);
    trainStates[cfg.id] = state;
    if (state.s < -500) continue; // train is off-screen / between runs

    const headSample = samplePath(cfg.path, state.s);
    const tailDist = state.s - (cfg.coachCount - 1) * cfg.coachSpacing;
    const tailSample = samplePath(cfg.path, tailDist);

    const coaches: TrainCoach[] = [];
    for (let ci = 0; ci < cfg.coachCount; ci++) {
      const coachDist = state.s - ci * cfg.coachSpacing;
      const sample = samplePath(cfg.path, coachDist);
      coaches.push({
        x: sample.x,
        y: sample.y,
        angle: sample.angle,
        isEngine: ci === 0
      });
    }

    activeTrains.push({
      id: cfg.id,
      name: cfg.name,
      route: cfg.route,
      head: { x: headSample.x, y: headSample.y },
      tail: { x: tailSample.x, y: tailSample.y },
      heading: headSample.angle,
      speed: state.speed,
      halting: state.halting,
      stationName: state.stationName,
      coaches
    });
  }

  // 2. Proximity-Based Gate Evaluation
  // Warning distance = 320px (approx 3.0s warning ahead of train nose)
  // Clearance margin = 50px behind train tail
  const gateStates: Record<string, GateState> = {};

  for (const g of gatesList) {
    let gateClosed = false;
    let gateWait = 0;
    let approachingTrainName: string | undefined;

    for (const cfg of TRAIN_CONFIGS) {
      const gateS = GATE_PATH_CACHE[cfg.id]?.[g.id];
      if (gateS === null || gateS === undefined) continue; // train route doesn't cross this gate

      const trainState = trainStates[cfg.id];
      if (!trainState || trainState.s < -500) continue;

      const trainHeadS = trainState.s;
      const trainLength = (cfg.coachCount - 1) * cfg.coachSpacing + cfg.coachLength;
      const trainTailS = trainHeadS - trainLength;

      const WARNING_DIST = 320;
      const CLEAR_MARGIN = 50;

      // Gate is triggered if train nose is approaching OR any coach is crossing
      const isApproaching = trainHeadS >= gateS - WARNING_DIST && trainHeadS < gateS;
      const isCrossing = trainTailS <= gateS + CLEAR_MARGIN && trainHeadS >= gateS;

      if (isApproaching || isCrossing) {
        gateClosed = true;
        approachingTrainName = cfg.name;

        // Calculate time remaining until the tail clears the crossing
        const distRemaining = Math.max(0, (gateS + CLEAR_MARGIN) - trainTailS);
        const speed = trainState.halting ? 25 : Math.max(cfg.speed, 30);
        const waitSec = Math.ceil(distRemaining / speed) + (trainState.haltRemaining || 0);
        if (waitSec > gateWait) gateWait = waitSec;
      }
    }

    gateStates[g.id] = {
      id: g.id,
      name: g.name,
      x: g.x,
      y: g.y,
      closed: gateClosed,
      wait: gateClosed ? Math.max(1, gateWait) : 0,
      approachingTrain: approachingTrainName
    };
  }

  // 3. Evaluate Rider's Immediate Vicinity
  let riderGateClosed = false;
  let riderGateWait = 0;
  let railNearby = false;

  if (riderX !== undefined && riderY !== undefined) {
    for (const g of gatesList) {
      const isHorizRoad = (g as any).axis === 'horizontal' || Math.abs(g.y - 3050) > 100;
      const roadDist = isHorizRoad ? Math.abs(riderY - g.y) : Math.abs(riderX - g.x);
      const trackDist = isHorizRoad ? Math.abs(riderX - g.x) : Math.abs(riderY - g.y);
      if (roadDist < 60 && trackDist < 200) {
        railNearby = true;
        const gs = gateStates[g.id];
        if (gs && gs.closed) {
          riderGateClosed = true;
          riderGateWait = Math.max(riderGateWait, gs.wait);
        }
      }
    }
  }

  const primaryTrain = activeTrains[0];
  const trainVisible = activeTrains.length > 0;
  const trainX = primaryTrain ? primaryTrain.head.x : 1600;

  const res: RailSimulation = {
    phase: Math.floor(at % 60),
    trains: activeTrains,
    gates: gateStates,
    closed: riderGateClosed,
    wait: riderGateWait,
    railNearby,
    trainVisible,
    trainX
  };

  cachedSim = res;
  lastSimAt = at;
  lastSimRiderX = riderX ?? -9999;
  lastSimRiderY = riderY ?? -9999;

  return res;
}

/**
 * Check if a specific level crossing gate blocks passage between points a and b.
 * Practical & precise: stops rider right at the gate barrier (80 units from track center),
 * prevents false collisions on nearby parallel streets, and allows safe exit if already inside.
 */
export function blockedByGateAt(a: Point, b: Point, at = Date.now() / 1000): { id: string; name: string } | null {
  const gates = MAP?.railway?.gates || [];
  const sim = getRailwaySimulation(at);

  const BARRIER_DIST = 80;

  for (const g of gates) {
    const gs = sim.gates[g.id];
    // ONLY block if THIS specific gate is currently closed!
    if (!gs || !gs.closed) continue;

    const isHorizRoad = (g as any).axis === 'horizontal' || Math.abs(g.y - 3050) > 100;

    if (isHorizRoad) {
      // Horizontal road across vertical track (e.g. Bongaon junction & Habra river bridge)
      // Only check if rider is actually traveling along this road lane
      const inLane = Math.abs(a.y - g.y) <= 38 && Math.abs(b.y - g.y) <= 38;
      if (!inLane) continue;

      // If rider was already inside the track zone between barriers, allow them to exit safely!
      const wasInside = Math.abs(a.x - g.x) < BARRIER_DIST;
      if (wasInside) {
        continue;
      }

      // Block entering the crossing from West or East
      const enteringWest = a.x <= g.x - BARRIER_DIST && b.x > g.x - BARRIER_DIST;
      const enteringEast = a.x >= g.x + BARRIER_DIST && b.x < g.x + BARRIER_DIST;

      if (enteringWest || enteringEast) {
        return { id: g.id, name: g.name };
      }
    } else {
      // Vertical road across horizontal track (e.g. Habra town & Petrapole town streets)
      // Only check if rider is actually traveling along this road lane
      const inLane = Math.abs(a.x - g.x) <= 38 && Math.abs(b.x - g.x) <= 38;
      if (!inLane) continue;

      // If rider was already inside the track zone between barriers, allow them to exit safely!
      const wasInside = Math.abs(a.y - g.y) < BARRIER_DIST;
      if (wasInside) {
        continue;
      }

      // Block entering the crossing from North or South
      const enteringNorth = a.y <= g.y - BARRIER_DIST && b.y > g.y - BARRIER_DIST;
      const enteringSouth = a.y >= g.y + BARRIER_DIST && b.y < g.y + BARRIER_DIST;

      if (enteringNorth || enteringSouth) {
        return { id: g.id, name: g.name };
      }
    }
  }

  return null;
}
