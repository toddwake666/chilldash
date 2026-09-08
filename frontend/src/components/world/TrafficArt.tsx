import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Vehicle } from '@/src/game/traffic';
import type { Point } from '@/src/game/api';

export function TrafficArt({vehicles,player}:{vehicles:Vehicle[];player:Point}) {
  const {colors:c}=useTheme();
  return <G testID="road-traffic">{vehicles.filter(v=>Math.abs(v.x-player.x)<800&&Math.abs(v.y-player.y)<900).map(v=><G testID={`traffic-${v.kind}-${v.id}`} key={v.id} transform={`translate(${v.x},${v.y}) rotate(${v.heading})`}>
    <Ellipse cx="4" cy="4" rx={v.kind==='bike'?11:15} ry="24" fill={c.shadow}/>
    {v.kind==='bike'?<><Rect x="-3" y="-22" width="6" height="42" rx="3" fill={c.onSurface}/><Rect x="-7" y="-12" width="14" height="28" rx="7" fill={v.id%2?c.coral:c.sky} stroke={c.onSurface}/><Path d="M-12 -12H12" stroke={c.onSurface} strokeWidth="3"/><Ellipse rx="9" ry="10" fill={v.id%2?c.teal:c.lavender}/><Circle cy="-9" r="7" fill={v.id%3?c.brand:c.surface} stroke={c.onSurface}/></>:<><Rect x="-11" y="-22" width="22" height="43" rx="6" fill={[c.coral,c.sky,c.butter,c.lavender][v.id%4]} stroke={c.onSurface} strokeWidth="1.3"/><Rect x="-8" y="-11" width="16" height="8" rx="2" fill={c.roadEdge}/><Rect x="-8" y="9" width="16" height="5" rx="1" fill={c.roadEdge}/><Rect x="-9" y="-21" width="5" height="3" fill={c.surface}/><Rect x="4" y="-21" width="5" height="3" fill={c.surface}/></>}
    {v.waiting&&<><Circle cx="-7" cy="20" r="2.5" fill={c.error}/><Circle cx="7" cy="20" r="2.5" fill={c.error}/></>}
  </G>)}</G>;
}