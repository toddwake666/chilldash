import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGame } from './GameContext';
import { BIKES, canRide, carPosition, distance, TRAFFIC } from './world';

export function useRide() {
  const g = useGame();
  const direction = useRef({ x: 0, y: 0 });
  const live = useRef(g); live.current = g;
  const elapsed = useRef(0), lastBump = useRef(-10);
  const [frame, setFrame] = useState({ player: { ...g.position.current }, heading: 0, elapsed: 0, minutes: g.clock.current, weather: g.weather.current, moving: false });
  useEffect(() => {
    let last = Date.now(), heading = 0, active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', state => { active = state === 'active'; direction.current = { x: 0, y: 0 }; });
    const timer = setInterval(() => {
      const now = Date.now(), dt = Math.min((now - last) / 1000, .1); last = now;
      const game = live.current;
      if (!active || game.phone || game.panel || game.reward) { direction.current = { x: 0, y: 0 }; return; }
      elapsed.current += dt;
      const before = Math.floor(game.clock.current / 180);
      game.clock.current = (game.clock.current + dt * 2) % 1440;
      if (game.weatherAuto.current && before !== Math.floor(game.clock.current / 180)) game.weather.current = (['sunny', 'cloudy', 'rainy', 'sunny'] as const)[Math.floor(game.clock.current / 180) % 4];
      const dir = direction.current, mag = Math.hypot(dir.x, dir.y);
      let moving = false;
      if (mag > .1) {
        heading = Math.atan2(dir.x, -dir.y) * 180 / Math.PI;
        const bike = BIKES.find(b => b.id === game.profile?.bike)!;
        const rain = game.weather.current === 'rainy' && game.profile?.gear !== 'raincoat' ? .78 : 1;
        const bump = TRAFFIC.some(car => distance(carPosition(car, elapsed.current), game.position.current) < 27);
        const speed = bike.speed * rain * (bump ? .3 : 1);
        if (bump && elapsed.current - lastBump.current > 6) { game.notify('Easy there! Give the traffic a little room.'); lastBump.current = elapsed.current; }
        const dx = dir.x / Math.max(1, mag) * speed * dt, dy = dir.y / Math.max(1, mag) * speed * dt;
        const pos = game.position.current;
        let next = { x: pos.x + dx, y: pos.y + dy };
        if (!canRide(next)) next = canRide({ x: pos.x + dx, y: pos.y }) ? { x: pos.x + dx, y: pos.y } : canRide({ x: pos.x, y: pos.y + dy }) ? { x: pos.x, y: pos.y + dy } : pos;
        moving = distance(pos, next) > .1;
        game.position.current = next;
      }
      setFrame({ player: { ...game.position.current }, heading, elapsed: elapsed.current, minutes: game.clock.current, weather: game.weather.current, moving });
    }, 40);
    return () => { clearInterval(timer); sub.remove(); direction.current = { x: 0, y: 0 }; };
  }, []);
  return { ...frame, direction };
}