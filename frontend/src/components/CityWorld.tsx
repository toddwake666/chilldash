import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { ALL_COLS, COLS, ROWS, WORLD, TRAFFIC, carPosition, TOWN_OFFSET } from '@/src/game/world';
import type { Point, Weather } from '@/src/game/api';
import { RiderSprite } from './RiderSprite';
import { ExpandedWorld, ServiceMarkers } from './ExpandedWorld';
import { useGame } from '@/src/game/GameContext';

function Tree({ x, y }: Point) {
  const { colors: c } = useTheme();
  return <G><Ellipse cx={x + 5} cy={y + 9} rx="15" ry="11" fill={c.shadow} /><Rect x={x - 3} y={y} width="6" height="18" rx="2" fill={c.wood} /><Circle cx={x} cy={y} r="15" fill={c.tree} /><Circle cx={x - 4} cy={y - 5} r="10" fill={c.treeLight} /></G>;
}
function Ad({ x, y, width = 130, id }: Point & { width?: number; id: number }) {
  const { colors: c } = useTheme();
  return <G testID={`ad-billboard-${id}`}><Rect x={x + 12} y={y + 31} width="5" height="15" fill={c.onSurface} /><Rect x={x + width - 17} y={y + 31} width="5" height="15" fill={c.onSurface} /><Rect x={x + 3} y={y + 3} width={width} height="37" rx="3" fill={c.shadow} /><Rect x={x} y={y} width={width} height="37" rx="3" fill={c.butter} stroke={c.onSurface} strokeWidth="2" /><Rect x={x + 5} y={y + 5} width={width - 10} height="27" fill="none" stroke={c.wood} strokeDasharray="3 3" strokeWidth=".7" /><SvgText x={x + width / 2} y={y + 23} fill={c.onSurface} textAnchor="middle" fontSize="10" fontWeight="bold">PLACE FOR ADS</SvgText></G>;
}
const Buildings = memo(function Buildings() {
  const { colors: c } = useTheme();
  const paints = [c.peach, c.sky, c.lavender, c.mint, c.butter, c.coral];
  const names = ['CORNER STORE', 'SLICE OF HEAVEN', 'SUNSET STUDIOS', 'SUNNY SIDE CAFÉ', 'MAPLE APARTMENTS', 'CORNER NOODLES', 'YOUR GARAGE', 'BLOOM & GO', 'MILO’S WORKSHOP', 'PALM HOUSE', 'THE ARCADE', 'FUEL & AIR'];
  return <G>
    <Rect width="1040" height={WORLD.height} fill={c.grass} />
    {COLS.map(x => <G key={`v${x}`}><Rect x={x - 53} width="106" height={WORLD.height} fill={c.pavement} /><Rect x={x - 37} width="74" height={WORLD.height} fill={c.road} /><Line x1={x} y1="0" x2={x} y2={WORLD.height} stroke={c.butter} strokeWidth="2" strokeDasharray="18 20" /></G>)}
    {ROWS.map(y => <G key={`h${y}`}><Rect y={y - 59} width="1040" height="118" fill={c.pavement} /><Rect y={y - 37} width="1040" height="74" fill={c.road} /><Line x1="0" y1={y} x2="1040" y2={y} stroke={c.butter} strokeWidth="2" strokeDasharray="18 20" /></G>)}
    {COLS.flatMap(x => ROWS.map(y => <G key={`${x}-${y}`}><Rect x={x - 36} y={y - 36} width="72" height="72" fill={c.road} />{[-1, 1].flatMap(side => [0, 1, 2, 3, 4].map(j => <G key={`${side}-${j}`}><Rect x={x - 29 + j * 13} y={y + side * 48 - 6} width="7" height="12" fill={c.surface} opacity=".7" /><Rect x={x + side * 48 - 6} y={y - 29 + j * 13} width="12" height="7" fill={c.surface} opacity=".7" /></G>))}<Circle cx={x - 48} cy={y - 48} r="3" fill={c.brand} /></G>))}
    {Array.from({ length: 12 }, (_, i) => {
      const col = i % 3, row = Math.floor(i / 3), x = COLS[col] + 63, y = ROWS[row] + 68;
      const park = i === 10;
      if (park) return <G key={i}><Rect x={x - 4} y={y - 10} width="162" height="158" rx="20" fill={c.treeLight} /><Path d={`M${x + 78} ${y - 10}V${y + 148} M${x - 4} ${y + 70}H${x + 158}`} stroke={c.pavement} strokeWidth="20" /><Circle cx={x + 77} cy={y + 69} r="30" fill={c.pavement} /><Circle cx={x + 77} cy={y + 69} r="20" fill={c.sky} stroke={c.surface} strokeWidth="4" />{[0, 1, 2, 3].map(t => <Tree key={t} x={x + (t % 2) * 116 + 14} y={y + Math.floor(t / 2) * 112 + 14} />)}<SvgText x={x + 80} y={y + 172} textAnchor="middle" fontSize="10" fill={c.teal} fontWeight="bold">SUNSHINE PARK</SvgText></G>;
      return <G key={i}>
        <Rect x={x + 10} y={y + 15} width="152" height="130" rx="7" fill={c.shadow} />
        <Rect x={x} y={y} width="149" height="126" rx="5" fill={paints[i % paints.length]} stroke={c.wood} strokeWidth="1.5" />
        <Rect x={x} y={y} width="149" height="94" rx="5" fill={paints[(i + 1) % paints.length]} stroke={c.wood} strokeWidth="1.5" />
        <Rect x={x + 8} y={y + 8} width="133" height="78" rx="3" fill={paints[i % paints.length]} stroke={c.wood} strokeWidth=".6" />
        <Rect x={x + 16} y={y + 17} width="36" height="21" rx="2" fill={c.pavement} stroke={c.wood} strokeWidth="1" />{[0, 1, 2, 3].map(t => <Line key={t} x1={x + 22} y1={y + 21 + t * 4} x2={x + 46} y2={y + 21 + t * 4} stroke={c.road} strokeWidth="1" />)}
        <Rect x={x + 99} y={y + 18} width="23" height="23" fill={c.sky} stroke={c.surface} strokeWidth="3" />
        <Line x1={x + 110} y1={y + 18} x2={x + 110} y2={y + 41} stroke={c.surface} strokeWidth="2" />
        {[0, 1, 2, 3].map(w => <Rect key={w} x={x + 10 + w * 34} y={y + 101} width="21" height="17" rx="1" fill={c.teal} stroke={c.surface} strokeWidth="2" />)}
        <Rect x={x + 50} y={y + 96} width="48" height="32" rx="2" fill={c.wood} />
        <Rect x={x + 56} y={y + 99} width="36" height="29" fill={i === 6 ? c.roadEdge : c.sky} />
        {i === 6 ? <><Rect x={x + 28} y={y + 51} width="94" height="27" rx="4" fill={c.brand} stroke={c.onSurface} /><SvgText x={x + 75} y={y + 68} fontSize="12" textAnchor="middle" fill={c.onSurface} fontWeight="bold">CHILL DASH</SvgText></> : i === 3 || i === 1 || i === 5 ? <>{Array.from({ length: 10 }, (_, aw) => <Rect key={aw} x={x + aw * 14.9} y={y + 83} width="14.9" height="15" fill={aw % 2 ? c.surface : c.coral} />)}<SvgText x={x + 75} y={y + 68} fontSize="11" textAnchor="middle" fill={c.onSurface} fontWeight="bold">{i === 3 ? 'COFFEE & GOOD DAYS' : i === 1 ? 'PIZZA, PLEASE!' : 'FRESH NOODLES'}</SvgText></> : <Ad x={x + 9} y={y + 46} id={i} />}
        <SvgText x={x + 74} y={y + 143} textAnchor="middle" fontSize="9" fill={c.onSurface} fontWeight="bold" letterSpacing=".4">{names[i]}</SvgText>
        <Tree x={x - 10} y={y + 142} /><Tree x={x + 164} y={y + 10} />
        <Rect x={x + 116} y={y + 153} width="29" height="7" rx="2" fill={c.wood} /><Line x1={x + 120} y1={y + 150} x2={x + 120} y2={y + 164} stroke={c.onSurface} strokeWidth="2" /><Line x1={x + 141} y1={y + 150} x2={x + 141} y2={y + 164} stroke={c.onSurface} strokeWidth="2" />
      </G>;
    })}
    <Ad x={175} y={847} id={20} width={155} />
    <Ad x={742} y={1030} id={21} width={143} />
    <SvgText x="414" y="918" fontSize="10" fill={c.surface} opacity=".5" transform="rotate(-90 414 918)" letterSpacing="3">PALM STREET</SvgText>
    <SvgText x="490" y="697" fontSize="9" fill={c.surface} opacity=".5" letterSpacing="2">MAPLE WALK</SvgText>
  </G>;
});

export function CityWorld({ player, heading, elapsed, route, target, minutes, weather, width, height, bike, gear }: { player: Point; heading: number; elapsed: number; route: Point[]; target: Point | null; minutes: number; weather: Weather; width: number; height: number; bike: string; gear: string }) {
  const { colors: c } = useTheme();
  const g = useGame();
  const zoom = .93;
  const vw = width / zoom, vh = height / zoom;
  const cx = Math.max(vw / 2, Math.min(WORLD.width - vw / 2, player.x));
  const cy = Math.max(vh / 2, Math.min(WORLD.height - vh / 2, player.y));
  const night = minutes >= 1140 || minutes < 360;
  const sunset = minutes >= 1020 && minutes < 1140;
  return <Svg testID="city-world" width={width} height={height} viewBox={`${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`}>
    <ExpandedWorld /><Buildings /><ServiceMarkers services={g.catalog?.services || []} />
    {route.length > 1 && <><Polyline points={route.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.onSurface} strokeWidth="8" opacity=".3" strokeLinejoin="round" /><Polyline testID="gps-world-route" points={route.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.brand} strokeWidth="5" strokeDasharray="9 6" strokeLinejoin="round" /></>}
    {TRAFFIC.map(car => { const p = carPosition(car, elapsed); return <G key={car.id} transform={`translate(${p.x},${p.y}) rotate(${car.vertical ? 0 : 90})`}><Rect x="-10" y="-19" width="24" height="40" rx="7" fill={c.shadow} /><Rect x="-11" y="-22" width="22" height="40" rx="5" fill={[c.coral, c.sky, c.butter, c.lavender][car.id % 4]} stroke={c.onSurface} strokeWidth="1.2" /><Rect x="-8" y="-10" width="16" height="8" rx="2" fill={c.roadEdge} /><Rect x="-8" y="8" width="16" height="5" rx="1" fill={c.roadEdge} /><Rect x="-9" y="-20" width="5" height="3" fill={c.surface} /><Rect x="4" y="-20" width="5" height="3" fill={c.surface} /></G>; })}
    {Array.from({ length: 8 }, (_, i) => { const x = COLS[i % 3] + 48; const y = ROWS[Math.floor(i / 3) + 1] + 60 + (elapsed * (3 + i % 3) + i * 22) % 150; return <G key={i}><Ellipse cx={x + 3} cy={y + 5} rx="5" ry="7" fill={c.shadow} /><Circle cx={x} cy={y + 3} r="5" fill={i % 2 ? c.coral : c.teal} /><Circle cx={x} cy={y - 3} r="3.5" fill={c.peach} /></G>; })}
    {target && <G testID="delivery-destination-marker"><Circle cx={target.x} cy={target.y} r={25 + Math.sin(elapsed * 3) * 3} fill={c.brand} opacity=".22" /><Circle cx={target.x} cy={target.y} r="18" fill={c.brand} stroke={c.onSurface} strokeWidth="2" /><Path d={`M${target.x - 6} ${target.y - 5}h12v11h-12z M${target.x - 3} ${target.y - 5}v-3h6v3`} stroke={c.onSurface} strokeWidth="2" fill="none" /></G>}
    <RiderSprite player={player} heading={heading} bike={bike} gear={gear} />
    {night && <><Rect width={WORLD.width} height={WORLD.height} fill={c.night} opacity=".5" /><Circle cx={player.x} cy={player.y} r="55" fill={c.butter} opacity=".09" />{ALL_COLS.flatMap(x => ROWS.map(y => <G key={`light${x}${y}`}><Circle cx={x - 48} cy={y - 48} r="30" fill={c.brand} opacity=".09" /><Circle cx={x - 48} cy={y - 48} r="5" fill={c.butter} /></G>))}</>}
    {sunset && <Rect width={WORLD.width} height={WORLD.height} fill={c.coral} opacity=".15" />}
    {weather !== 'sunny' && <Rect width={WORLD.width} height={WORLD.height} fill={c.night} opacity={weather === 'rainy' ? .17 : .07} />}
    {weather === 'rainy' && Array.from({ length: 70 }, (_, i) => { const x = cx - vw / 2 + (i * 71) % vw; const y = cy - vh / 2 + (i * 137 + elapsed * 240) % vh; return <Line key={i} x1={x} y1={y} x2={x - 5} y2={y + 14} stroke={c.sky} strokeWidth="1.5" opacity=".65" />; })}
  </Svg>;
}

export function MiniMap({ player, target, route, size = 112, large = false }: { player: Point; target: Point | null; route: Point[]; size?: number; large?: boolean }) {
  const { colors: c } = useTheme();
  return <Svg testID={large ? 'phone-gps-map' : 'mini-gps-map'} width={size} height={large ? size * .56 : size} viewBox={large ? `0 -80 3280 1640` : `${player.x - 330} ${player.y - 330} 660 660`}>
    <Rect width="3280" height="1480" fill={c.treeLight} /><Rect x="1010" y="654" width="1250" height="52" fill={c.surface} />
    {[0, TOWN_OFFSET].map(offset => <G key={offset} transform={`translate(${offset},0)`}><Rect width="1040" height="1360" fill={c.grass} />{COLS.map(x => <Rect key={x} x={x - 26} width="52" height="1360" fill={c.surface} />)}{ROWS.map(y => <Rect key={y} y={y - 26} width="1060" height="52" fill={c.surface} />)}{Array.from({ length: 12 }, (_, i) => <Rect key={i} x={COLS[i % 3] + 68} y={ROWS[Math.floor(i / 3)] + 65} width="144" height="148" rx="12" fill={i === 10 ? c.tree : i % 2 ? c.pavement : c.peach} />)}</G>)}
    {large && <><SvgText x="540" y="1450" textAnchor="middle" fontSize="68" fill={c.teal}>Sunnyvale</SvgText><SvgText x="1610" y="510" textAnchor="middle" fontSize="65" fill={c.teal}>Whispering Pines</SvgText><SvgText x="2710" y="1450" textAnchor="middle" fontSize="68" fill={c.teal}>Pinecrest</SvgText></>}
    {route.length > 1 && <Polyline points={route.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.teal} strokeWidth="14" strokeLinejoin="round" />}
    {target && <Circle cx={target.x} cy={target.y} r="25" fill={c.brand} stroke={c.onSurface} strokeWidth="7" />}
    <Circle cx={player.x} cy={player.y} r="32" fill={c.teal} opacity=".15" /><Circle cx={player.x} cy={player.y} r="18" fill={c.teal} stroke={c.surface} strokeWidth="7" />
  </Svg>;
}