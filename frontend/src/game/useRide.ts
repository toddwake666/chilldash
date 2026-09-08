import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGame } from './GameContext';
import { BIKES, blockedByGate, canRide, distance, MAP, railwayState } from './world';
import { createTraffic, stepTraffic, Vehicle } from './traffic';

export function useRide() {
  const g = useGame(), direction = useRef({ x: 0, y: 0 });
  const live = useRef(g); live.current = g;
  const elapsed = useRef(0);
  const blockedGate=useRef<string|null>(null);
  const clearanceUntil=useRef(0);
  const traffic=useRef<Vehicle[]|null>(null); if(!traffic.current)traffic.current=createTraffic();
  const [frame, setFrame] = useState({ player: { ...g.position.current }, heading: 0, elapsed: 0, minutes: g.clock.current, weather: g.weather.current, moving: false, speed: 0, pushing: false, vehicles:traffic.current, rail:railwayState(), railNearby:false, railBlocked:false });
  useEffect(() => {
    let last = Date.now(), heading = 0, active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', state => { active = state === 'active'; direction.current = { x: 0, y: 0 }; });
    const timer = setInterval(() => {
      const now = Date.now(), dt = Math.min((now - last) / 1000, .1); last = now;
      const game = live.current, p = game.profile;
      if (!active || !p || p.dead) { direction.current = { x: 0, y: 0 }; return; }
      // Real-world pickup deadlines continue independently of game menus and weather time.
      const paused = !!(game.phone || game.panel || game.reward || game.busy);
      if (paused) direction.current = { x: 0, y: 0 };
      elapsed.current += dt; game.pending.current.elapsed += dt;
      traffic.current=stepTraffic(traffic.current!,dt,game.position.current);
      const rail=railwayState();
      const waitingZone=rail.closed&&MAP.railway.gates.some(gate=>Math.abs(game.position.current.x-gate.x)<90&&Math.abs(game.position.current.y-gate.y)>=99&&Math.abs(game.position.current.y-gate.y)<225);
      if(blockedGate.current&&!rail.closed)clearanceUntil.current=now+2500;
      if(!waitingZone)blockedGate.current=null;
      const clearingGate=now<clearanceUntil.current&&MAP.railway.gates.some(gate=>Math.abs(game.position.current.x-gate.x)<100&&Math.abs(game.position.current.y-gate.y)<260);
      const before = Math.floor(game.clock.current / 180);
      if (!paused) game.clock.current = (game.clock.current + dt * 2) % 1440;
      if (game.weatherAuto.current && before !== Math.floor(game.clock.current / 180)) game.weather.current = (['sunny', 'cloudy', 'rainy', 'sunny'] as const)[Math.floor(game.clock.current / 180) % 4];
      const dir = direction.current, mag = Math.hypot(dir.x, dir.y), stats = p.bikes[p.bike];
      const pushing = stats.condition <= 0 || (p.bike === 'bicycle' ? stats.air <= 0 : stats.fuel <= 0);
      let moving = false, kmh = 0, railBlocked=false;
      if (mag > .1 && !paused) {
        heading = Math.atan2(dir.x, -dir.y) * 180 / Math.PI;
        const bike = BIKES.find(b => b.id === p.bike)!;
        const rain = game.weather.current === 'rainy' && p.gear !== 'raincoat' ? .78 : 1;
        // Waiting at a closed crossing is a safe stop, not a collision penalty.
        const bump = !waitingZone&&!clearingGate&&traffic.current.some(car => distance(car, game.position.current) < (car.kind==='bike'?18:26));
        const condition = stats.condition < 30 ? .6 : 1, stamina = p.energy < 20 || p.health < 20 ? .6 : 1;
        const speed = (pushing ? 23 : bike.speed * rain * condition * stamina) * (bump ? .3 : 1);
        if (bump) game.collision('traffic');
        const pos = game.position.current, dx = dir.x / Math.max(1, mag) * speed * dt, dy = dir.y / Math.max(1, mag) * speed * dt;
        let next = { x: pos.x + dx, y: pos.y + dy };
        if (!canRide(next)) { game.collision('wall'); next = canRide({ x: pos.x + dx, y: pos.y }) ? { x: pos.x + dx, y: pos.y } : canRide({ x: pos.x, y: pos.y + dy }) ? { x: pos.x, y: pos.y + dy } : pos; }
        const gate=blockedByGate(pos,next,rail.closed);
        if(gate) {next=pos;railBlocked=true;blockedGate.current=gate.id;}
        const traveled = distance(pos, next); moving = traveled > .1;
        game.pending.current.distance += traveled; if (moving) game.pending.current.moving += dt;
        kmh = Math.round(traveled / dt * .24); game.position.current = next;
      }
      const railNearby=MAP.railway.gates.some(gate=>Math.abs(game.position.current.x-gate.x)<125&&Math.abs(game.position.current.y-gate.y)<240);
      setFrame({ player: { ...game.position.current }, heading, elapsed: elapsed.current, minutes: game.clock.current, weather: game.weather.current, moving, speed: kmh, pushing, vehicles:traffic.current, rail, railNearby, railBlocked:railBlocked||!!blockedGate.current });
    }, 40);
    return () => { clearInterval(timer); sub.remove(); direction.current = { x: 0, y: 0 }; };
  }, []);
  return { ...frame, direction };
}