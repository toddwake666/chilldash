import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Vehicle } from '@/src/game/traffic';
import type { Point } from '@/src/game/api';

export function TrafficArt({vehicles, player, cx, cy}:{vehicles:Vehicle[]; player?:Point; cx?:number; cy?:number}) {
  const {colors:c}=useTheme();
  const ox = cx ?? player?.x ?? 0;
  const oy = cy ?? player?.y ?? 0;
  const visibleVehicles = vehicles.filter(v => Math.abs(v.x - ox) < 360 && Math.abs(v.y - oy) < 520);
  return <G testID="road-traffic">{visibleVehicles.map(v => {
    const rx = Math.round(v.x);
    const ry = Math.round(v.y);
    const rh = Math.round(v.heading);
    return (
      <G testID={`traffic-${v.kind}-${v.id}`} key={v.id} transform={`translate(${rx},${ry}) rotate(${rh})`}>
        <Ellipse cx="4" cy="4" rx={v.kind==='bike'?11:15} ry="24" fill={c.shadow}/>
        {v.kind==='bike'?<><Path d="M-3 -22h6v42h-6z M-12 -12h24" stroke={c.onSurface} strokeWidth="3" fill={c.onSurface}/><Rect x="-7" y="-12" width="14" height="28" rx="7" fill={v.id%2?c.coral:c.sky} stroke={c.onSurface}/><Ellipse rx="9" ry="10" fill={v.id%2?c.teal:c.lavender}/><Circle cy="-9" r="7" fill={v.id%3?c.brand:c.surface} stroke={c.onSurface}/></>:<><Rect x="-11" y="-22" width="22" height="43" rx="6" fill={[c.coral,c.sky,c.butter,c.lavender][v.id%4]} stroke={c.onSurface} strokeWidth="1.3"/><Path d="M-8 -11h16v8h-16z M-8 9h16v5h-16z" fill={c.roadEdge}/><Path d="M-9 -21h5v3h-5z M4 -21h5v3h-5z" fill={c.surface}/></>}
        {v.waiting&&<Path d="M-9.5 20a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M4.5 20a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" fill={c.error}/>}
      </G>
    );
  })}</G>;
}