import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGame } from './GameContext';
import { BIKES, blockedByGate, canRide, distance, MAP, nearestRoad, railwayState } from './world';
import { createTraffic, stepTraffic, cleanTraffic, Vehicle } from './traffic';
import { recordFrameForWatchdog, registerPerformanceCleanupListener } from './performanceEngine';
import type { Point } from './api';
import type { Segment } from './region';
import { project } from './region';


export function useRide() {
  const g = useGame(), direction = useRef({ x: 0, y: 0 });
  const live = useRef(g); live.current = g;
  const elapsed = useRef(0);
  const blockedGate = useRef<string | null>(null);
  const clearanceUntil = useRef(0);
  const traffic = useRef<Vehicle[]>(createTraffic());
  const lastSeg = useRef<Segment | null>(null);

  // High-frequency live frame ref for buttery-smooth 60 FPS world rendering
  const liveFrame = useRef({
    player: { ...g.position.current },
    camera: { ...g.position.current },
    heading: 0,
    vehicles: traffic.current,
    rail: railwayState(),
  });

  // Dedicated subscriber system for CityWorld rendering
  const frameListeners = useRef<Set<() => void>>(new Set());
  const subscribeFrame = useRef((fn: () => void) => {
    frameListeners.current.add(fn);
    return () => {
      frameListeners.current.delete(fn);
    };
  }).current;

  // Register Auto-Healing Performance Watchdog listener to clear stuck traffic
  useEffect(() => {
    const unregister = registerPerformanceCleanupListener(() => {
      traffic.current = cleanTraffic(traffic.current);
    });
    return unregister;
  }, []);

  const lastHudUpdate = useRef(0);
  const lastRenderNotify = useRef(0);
  const lastReported = useRef({
    moving: false,
    pushing: false,
    railBlocked: false,
    railClosed: false,
    weather: g.weather.current,
    speed: 0,
    x: g.position.current.x,
    y: g.position.current.y,
    minutes: Math.floor(g.clock.current),
  });

  const [frame, setFrame] = useState({
    player: { ...g.position.current },
    camera: { ...g.position.current },
    heading: 0,
    elapsed: 0,
    minutes: g.clock.current,
    weather: g.weather.current,
    moving: false,
    speed: 0,
    pushing: false,
    vehicles: traffic.current,
    rail: railwayState(),
    railNearby: false,
    railBlocked: false,
    boosted: !!(g.profile?.speed_boost_until && g.profile.minutes < g.profile.speed_boost_until),
    boostRemaining: Math.max(0, (g.profile?.speed_boost_until ?? 0) - (g.profile?.minutes ?? 0)),
  });

  useEffect(() => {
    let animId = 0;
    const getNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    let last = getNow();
    let accumulator = 0;
    let heading = 0;
    let currentPos = { ...live.current.position.current };
    let camX = currentPos.x;
    let camY = currentPos.y;
    let currentVx = 0;
    let currentVy = 0;
    let isMoving = false;
    let kmh = 0;
    let pushing = false;
    let railBlocked = false;
    let active = AppState.currentState === 'active';
    let unmounted = false;

    // Zero-allocation reusable coordinate buffers to eliminate GC pauses
    const nextCandidate: Point = { x: 0, y: 0 };
    const tangentCandidate: Point = { x: 0, y: 0 };
    const nudgedCandidate: Point = { x: 0, y: 0 };
    const crossCandidate: Point = { x: 0, y: 0 };
    const axisCandidate: Point = { x: 0, y: 0 };

    const sub = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (!active) {
        direction.current = { x: 0, y: 0 };
        currentVx = 0;
        currentVy = 0;
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      } else {
        last = getNow();
        currentVx = 0;
        currentVy = 0;
        blockedGate.current = null;
        clearanceUntil.current = 0;
        if (!animId && !unmounted) {
          animId = requestAnimationFrame(tick);
        }
      }
    });

    const tick = () => {
      if (unmounted || !active) return;
      animId = requestAnimationFrame(tick);

      const now = getNow();
      const rawElapsed = (now - last) / 1000;
      last = now;

      // Drop duplicate or negative frames (< 1ms)
      if (rawElapsed < 0.001) {
        return;
      }

      // Feed frame time into Auto-Healing Performance Watchdog
      recordFrameForWatchdog(rawElapsed);

      // Adaptive frame delta clamped to max 40ms to prevent warp jumps after pauses
      const dt = Math.min(0.04, rawElapsed);

      const game = live.current, p = game.profile;
      if (!active || !p || p.dead) {
        direction.current = { x: 0, y: 0 };
        currentVx = 0;
        currentVy = 0;
        return;
      }

      // Sync external teleportation or quick travel
      const extPos = game.position.current;
      if (Math.hypot(extPos.x - currentPos.x, extPos.y - currentPos.y) > 20) {
        currentPos.x = extPos.x;
        currentPos.y = extPos.y;
        camX = extPos.x;
        camY = extPos.y;
        currentVx = 0;
        currentVy = 0;
      }

      // Inactive & Menu State Suspension:
      // When the Phone, Akash Wheels Shop, Garage, or Delivery Reward modal is open,
      // suspend physics, traffic simulation, and frame re-renders to give 100% CPU/GPU headroom to the UI.
      const paused = !!(game.phone || game.panel || game.reward);
      if (paused) {
        direction.current = { x: 0, y: 0 };
        currentVx = 0;
        currentVy = 0;
        last = now;
        return;
      }

      elapsed.current += dt;
      game.pending.current.elapsed += dt;
      traffic.current = stepTraffic(traffic.current, dt, currentPos);
      const rail = railwayState(undefined, currentPos.x, currentPos.y);
      const currentRail = rail;

      const waitingZone = rail.closed && MAP.railway.gates.some(gate => {
        const isHoriz = (gate as any).axis === 'horizontal' || Math.abs(gate.y - 3050) > 100;
        const roadDist = isHoriz ? Math.abs(currentPos.y - gate.y) : Math.abs(currentPos.x - gate.x);
        const trackDist = isHoriz ? Math.abs(currentPos.x - gate.x) : Math.abs(currentPos.y - gate.y);
        return roadDist < 42 && trackDist >= 75 && trackDist < 250;
      });
      if (blockedGate.current && !rail.closed) clearanceUntil.current = now + 2500;
      if (!waitingZone) blockedGate.current = null;
      const clearingGate = now < clearanceUntil.current && MAP.railway.gates.some(gate => {
        const isHoriz = (gate as any).axis === 'horizontal' || Math.abs(gate.y - 3050) > 100;
        const roadDist = isHoriz ? Math.abs(currentPos.y - gate.y) : Math.abs(currentPos.x - gate.x);
        const trackDist = isHoriz ? Math.abs(currentPos.x - gate.x) : Math.abs(currentPos.y - gate.y);
        return roadDist < 45 && trackDist < 220;
      });
      const before = Math.floor(game.clock.current / 180);
      if (!paused) game.clock.current = (game.clock.current + dt * 2) % 1440;
      if (game.weatherAuto.current && before !== Math.floor(game.clock.current / 180)) {
        game.weather.current = (['sunny', 'cloudy', 'rainy', 'sunny'] as const)[Math.floor(game.clock.current / 180) % 4];
      }

      // Auto take-off rain kit when rain stops
      if (game.weather.current !== 'rainy' && p.gear === 'raincoat') {
        p.gear = 'everyday';
        game.equip(p.bike, 'everyday');
        game.notify('Rain stopped — rain kit stored safely in bag.');
      }

      // Crossing RevenueCat Bridge Goal
      if (!p.visited_revenuecat_bridge && currentPos.x >= 3360 && currentPos.x <= 4040 && Math.abs(currentPos.y - 1160) < 65) {
        p.visited_revenuecat_bridge = true;
        game.notify('🌉 You crossed the RevenueCat Bridge! Claim your goal in Phone -> Goals!');
      }

      // Rain kit degradation (tears up after 3 in-game days = 4320 minutes)
      if (p.rainkit_purchased_minutes && (p.minutes - p.rainkit_purchased_minutes >= 4320)) {
        if (p.carrying_rainkit || p.owned_gear?.includes('raincoat')) {
          p.carrying_rainkit = false;
          p.owned_gear = p.owned_gear.filter(g => g !== 'raincoat');
          if (p.gear === 'raincoat') {
            p.gear = 'everyday';
            game.equip(p.bike, 'everyday');
          }
          p.rainkit_purchased_minutes = undefined;
          game.notify('Your rain kit wore out after 3 in-game days. A fresh kit is needed.');
        }
      }

      const dir = direction.current, mag = Math.hypot(dir.x, dir.y);
      const stats = p.bikes[p.bike] || { condition: 100, fuel: 100, air: 100 };
      pushing = stats.condition <= 0 || (p.bike === 'bicycle' ? stats.air <= 0 : stats.fuel <= 0);
      isMoving = false;
      kmh = 0;
      railBlocked = false;

      const bike = BIKES.find(b => b.id === p.bike)!;
      const rain = game.weather.current === 'rainy' && p.gear !== 'raincoat' ? .90 : 1;
      const bump = !waitingZone && !clearingGate && traffic.current.some(car => {
        if (Math.abs(car.x - currentPos.x) > 28 || Math.abs(car.y - currentPos.y) > 28) return false;
        const d = distance(car, currentPos);
        const hitDist = car.kind === 'bike' ? 16 : 22;
        if (d >= hitDist) return false;
        const riderSpeed = Math.hypot(currentVx, currentVy);
        return riderSpeed > 20 || car.currentSpeed > 20;
      });
      const condition = stats.condition < 25 ? .80 : 1, stamina = p.energy < 15 || p.health < 15 ? .80 : 1;
      // Speed Boost: +10 km/h = +42 px/s in engine speed
      const isBoosted = !!(p.speed_boost_until && p.minutes < p.speed_boost_until);
      const boostSpeed = isBoosted ? 42 : 0;
      const topSpeed = (pushing ? 24 : (bike.speed + boostSpeed) * rain * condition * stamina) * (bump ? .65 : 1);
      if (bump) game.collision('traffic');

      // Auto-notify when speed boost expires during active ride
      if (p.speed_boost_until && p.minutes >= p.speed_boost_until) {
        p.speed_boost_until = undefined;
        game.notify('Speed Boost expired. Reactivate from your HUD or Garage.');
      }

      // Target velocity calculation with immediate throttle response
      let targetVx = 0;
      let targetVy = 0;
      if (mag > 0.02 && !paused) {
        const throttle = Math.min(1, mag);
        const unitX = dir.x / mag;
        const unitY = dir.y / mag;
        targetVx = unitX * topSpeed * throttle;
        targetVy = unitY * topSpeed * throttle;
      }

      // Smooth exponential velocity damping
      if (mag > 0.05 && !paused) {
        const alphaAccel = 1 - Math.exp(-14 * dt);
        currentVx += (targetVx - currentVx) * alphaAccel;
        currentVy += (targetVy - currentVy) * alphaAccel;
      } else {
        const alphaDecel = 1 - Math.exp(-18 * dt);
        currentVx += (0 - currentVx) * alphaDecel;
        currentVy += (0 - currentVy) * alphaDecel;
        if (Math.hypot(currentVx, currentVy) < 1.0) {
          currentVx = 0;
          currentVy = 0;
        }
      }

      // Heading rotation interpolation
      const curSpeed = Math.hypot(currentVx, currentVy);
      if (curSpeed > 3) {
        const targetHeading = (Math.atan2(currentVx, -currentVy) * 180) / Math.PI;
        let diff = targetHeading - heading;
        while (diff < -180) diff += 360;
        while (diff > 180) diff -= 360;
        const alphaHeading = 1 - Math.exp(-24 * dt);
        heading += diff * alphaHeading;
      }

      // Frame displacement
      const rawDx = currentVx * dt;
      const rawDy = currentVy * dt;

      if (Math.hypot(rawDx, rawDy) > 0.0001) {
        nextCandidate.x = currentPos.x + rawDx;
        nextCandidate.y = currentPos.y + rawDy;
        let next = nextCandidate;
        if (!canRide(next, lastSeg.current)) {
          let seg: Segment;
          let roadPoint: Point;
          if (lastSeg.current) {
            const pr = project(currentPos, lastSeg.current.a, lastSeg.current.b);
            if (pr.distance < 110) {
              seg = lastSeg.current;
              roadPoint = pr.point;
            } else {
              const near = nearestRoad(currentPos);
              seg = near.segment;
              roadPoint = near.point;
              lastSeg.current = seg;
            }
          } else {
            const near = nearestRoad(currentPos);
            seg = near.segment;
            roadPoint = near.point;
            lastSeg.current = seg;
          }

          const rx = seg.b.x - seg.a.x, ry = seg.b.y - seg.a.y;
          const rlen = Math.hypot(rx, ry) || 1;
          const ux = rx / rlen, uy = ry / rlen;

          // Pure vector projection onto road tangent
          const dot = rawDx * ux + rawDy * uy;
          const slideDx = ux * dot;
          const slideDy = uy * dot;

          tangentCandidate.x = currentPos.x + slideDx;
          tangentCandidate.y = currentPos.y + slideDy;

          if (canRide(tangentCandidate, seg)) {
            next = tangentCandidate;
            currentVx = ux * (dot / dt);
            currentVy = uy * (dot / dt);
          } else {
            // Boundary nudge towards road point without harsh jumps
            const toCenterX = roadPoint.x - currentPos.x;
            const toCenterY = roadPoint.y - currentPos.y;
            const cDist = Math.hypot(toCenterX, toCenterY);
            const nudge = Math.min(0.45, cDist * 0.12);
            const nudgeX = cDist > 0 ? (toCenterX / cDist) * nudge : 0;
            const nudgeY = cDist > 0 ? (toCenterY / cDist) * nudge : 0;

            nudgedCandidate.x = currentPos.x + slideDx + nudgeX;
            nudgedCandidate.y = currentPos.y + slideDy + nudgeY;

            if (canRide(nudgedCandidate, seg)) {
              next = nudgedCandidate;
              currentVx = ux * (dot / dt);
              currentVy = uy * (dot / dt);
            } else {
              // Check cross segment (turns and corners)
              const nearNext = nearestRoad(next);
              let crossResolved = false;
              if (nearNext.segment && nearNext.segment.id !== seg.id) {
                const nrx = nearNext.segment.b.x - nearNext.segment.a.x, nry = nearNext.segment.b.y - nearNext.segment.a.y;
                const nrlen = Math.hypot(nrx, nry) || 1;
                const nux = nrx / nrlen, nuy = nry / nrlen;
                const ndot = rawDx * nux + rawDy * nuy;
                crossCandidate.x = currentPos.x + nux * ndot;
                crossCandidate.y = currentPos.y + nuy * ndot;
                if (canRide(crossCandidate, nearNext.segment)) {
                  next = crossCandidate;
                  currentVx = nux * (ndot / dt);
                  currentVy = nuy * (ndot / dt);
                  lastSeg.current = nearNext.segment;
                  crossResolved = true;
                }
              }

              // Axis-aligned fallback if tangent is fully blocked
              if (!crossResolved) {
                axisCandidate.x = currentPos.x + rawDx;
                axisCandidate.y = currentPos.y;
                if (Math.abs(rawDx) > 0.01 && canRide(axisCandidate, seg)) {
                  next = axisCandidate;
                  currentVy = 0;
                } else {
                  axisCandidate.x = currentPos.x;
                  axisCandidate.y = currentPos.y + rawDy;
                  if (Math.abs(rawDy) > 0.01 && canRide(axisCandidate, seg)) {
                    next = axisCandidate;
                    currentVx = 0;
                  } else if (canRide(roadPoint, seg)) {
                    next = roadPoint;
                  } else {
                    next = currentPos;
                    currentVx = 0;
                    currentVy = 0;
                  }
                }
              }
            }
          }
        }
        const gate = blockedByGate(currentPos, next, rail.closed);
        if (gate) {
          next = currentPos;
          currentVx = 0;
          currentVy = 0;
          railBlocked = true;
          blockedGate.current = gate.id;
        }
        const traveled = distance(currentPos, next);
        isMoving = traveled > 0.02;
        game.pending.current.distance += traveled;
        if (isMoving) game.pending.current.moving += dt;
        kmh = Math.round((traveled / dt) * 0.24);
        currentPos.x = next.x;
        currentPos.y = next.y;
        game.position.current.x = next.x;
        game.position.current.y = next.y;
      }

      // Critically-damped exponential camera spring tracking
      const camAlpha = 1 - Math.exp(-20 * dt);
      camX += (currentPos.x - camX) * camAlpha;
      camY += (currentPos.y - camY) * camAlpha;

      const railNearby = currentRail.railNearby;

      // Update high-frequency live frame ref for 60/90/120 FPS CityWorld rendering
      liveFrame.current.player.x = currentPos.x;
      liveFrame.current.player.y = currentPos.y;
      liveFrame.current.camera.x = camX;
      liveFrame.current.camera.y = camY;
      liveFrame.current.heading = heading;
      liveFrame.current.vehicles = traffic.current;
      liveFrame.current.rail = currentRail;

      // Notify high-frequency subscribers (CityWorld) capped to ~60 FPS to eliminate 120Hz React re-render thrashing
      if (now - lastRenderNotify.current >= 15.8) {
        lastRenderNotify.current = now;
        frameListeners.current.forEach(listener => listener());
      }

      // Low-frequency throttled React state dispatch for HUD (speedometer, minimap, clock)
      const nowMs = now;
      const isEvent =
        isMoving !== lastReported.current.moving ||
        pushing !== lastReported.current.pushing ||
        railBlocked !== lastReported.current.railBlocked ||
        currentRail.closed !== lastReported.current.railClosed ||
        game.weather.current !== lastReported.current.weather;

      const timeSinceHud = nowMs - lastHudUpdate.current;
      const distFromReported = Math.hypot(currentPos.x - lastReported.current.x, currentPos.y - lastReported.current.y);
      const speedDiff = Math.abs(kmh - lastReported.current.speed);

      if (isEvent || (timeSinceHud >= 320 && (speedDiff >= 3 || distFromReported >= 30 || Math.floor(game.clock.current) !== lastReported.current.minutes))) {
        lastHudUpdate.current = nowMs;
        lastReported.current = {
          moving: isMoving,
          pushing,
          railBlocked,
          railClosed: currentRail.closed,
          weather: game.weather.current,
          speed: kmh,
          x: currentPos.x,
          y: currentPos.y,
          minutes: Math.floor(game.clock.current),
        };
        setFrame({
          player: { x: currentPos.x, y: currentPos.y },
          camera: { x: camX, y: camY },
          heading: heading,
          elapsed: elapsed.current,
          minutes: game.clock.current,
          weather: game.weather.current,
          moving: isMoving,
          speed: kmh,
          pushing,
          vehicles: traffic.current,
          rail: currentRail,
          railNearby,
          railBlocked: railBlocked || !!blockedGate.current,
          boosted: isBoosted,
          boostRemaining: isBoosted ? Math.max(0, Math.ceil((p.speed_boost_until || 0) - p.minutes)) : 0,
        });
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      unmounted = true;
      cancelAnimationFrame(animId);
      sub.remove();
      direction.current = { x: 0, y: 0 };
    };
  }, []);
  return { ...frame, direction, liveFrame, subscribeFrame };
}