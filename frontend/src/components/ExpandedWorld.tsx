import React, { memo } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { COLS, ROWS, WORLD, TOWN_OFFSET } from '@/src/game/world';
import type { Service } from '@/src/game/api';

export const ExpandedWorld = memo(function ExpandedWorld() {
  const { colors: c } = useTheme();
  return <G testID="expanded-world">
    <Rect width={WORLD.width} height={WORLD.height} fill={c.grass} />
    <Rect x="1040" y="0" width="1180" height={WORLD.height} fill={c.treeLight} />
    <Path d="M1300 100 Q1540 30 1660 190 T1510 440 Q1350 450 1300 100" fill={c.sky} stroke={c.pavement} strokeWidth="8" />
    <G testID="forest-area">{Array.from({ length: 180 }, (_, i) => {
      const x = 1060 + (i * 173) % 1130, y = 40 + (i * 227) % 1400;
      if (Math.abs(y - 680) < 100 || x > 1310 && x < 1610 && y < 380) return null;
      return <G key={i}><Ellipse cx={x + 10} cy={y + 16} rx="22" ry="12" fill={c.shadow} /><Rect x={x - 3} y={y + 3} width="6" height="25" fill={c.wood} /><Path d={`M${x} ${y - 31}l-24 42h48z M${x} ${y - 48}l-19 39h38z`} fill={i % 3 ? c.tree : c.teal} stroke={c.tree} strokeWidth="1" /></G>;
    })}</G>
    <Rect testID="forest-connecting-road" x="960" y="622" width="1320" height="116" fill={c.pavement} />
    <Rect x="960" y="643" width="1320" height="74" fill={c.road} />
    <Line x1="960" y1="680" x2="2280" y2="680" stroke={c.butter} strokeDasharray="18 20" strokeWidth="2" />
    <SvgText x="1590" y="665" textAnchor="middle" fill={c.surface} fontSize="11" letterSpacing="4" opacity=".6">PINE TRAIL</SvgText>
    {[1120, 2000].map((x, i) => <G key={x}><Rect x={x + 50} y="585" width="5" height="36" fill={c.wood} /><Rect x={x} y="570" width="115" height="28" rx="4" fill={c.teal} stroke={c.surface} strokeWidth="2" /><SvgText x={x + 57} y="588" textAnchor="middle" fill={c.surface} fontSize="10" fontWeight="bold">{i ? 'SUNNYVALE ←' : 'PINECREST →'}</SvgText></G>)}
    <G transform={`translate(${TOWN_OFFSET},0)`} testID="pinecrest-town">
      {COLS.map(x => <G key={x}><Rect x={x - 59} width="118" height="1360" fill={c.pavement} /><Rect x={x - 37} width="74" height="1360" fill={c.road} /><Line x1={x} y1="0" x2={x} y2="1360" stroke={c.butter} strokeWidth="2" strokeDasharray="18 20" /></G>)}
      {ROWS.map(y => <G key={y}><Rect x="65" y={y - 59} width="1000" height="118" fill={c.pavement} /><Rect x="65" y={y - 37} width="1000" height="74" fill={c.road} /><Line x1="65" y1={y} x2="1065" y2={y} stroke={c.butter} strokeWidth="2" strokeDasharray="18 20" /></G>)}
      {COLS.flatMap(x => ROWS.map(y => <G key={`${x}-${y}`}><Rect x={x - 36} y={y - 36} width="72" height="72" fill={c.road} />{[0, 1, 2, 3, 4].map(j => <G key={j}><Rect x={x - 28 + j * 13} y={y - 52} width="6" height="11" fill={c.surface} /><Rect x={x - 28 + j * 13} y={y + 41} width="6" height="11" fill={c.surface} /></G>)}</G>))}
      {Array.from({ length: 12 }, (_, i) => {
        const x = COLS[i % 3] + 73, y = ROWS[Math.floor(i / 3)] + 78, shade = [c.peach, c.mint, c.lavender, c.butter][i % 4];
        const shop = [0, 3, 4, 8].includes(i), label = i === 0 ? 'PINE & PASTRY' : i === 3 ? 'FUEL & AIR' : i === 4 ? 'CEDAR KITCHEN' : i === 8 ? 'THE SPOKE HOUSE' : ['WILLOW COTTAGES', 'CEDAR TERRACE', 'PINE HOMES'][i % 3];
        return <G key={i} testID={`pinecrest-building-${i}`}>
          <Rect x={x - 8} y={y - 7} width="152" height="162" rx="12" fill={c.treeLight} />
          <Path d={`M${x + 67} ${y + 80}V${y + 176}`} stroke={c.pavement} strokeWidth="24" />
          <Rect x={x + 10} y={y + 20} width="127" height="108" rx="4" fill={c.shadow} />
          <Rect x={x} y={y + 24} width="125" height="91" rx="3" fill={shade} stroke={c.wood} strokeWidth="1.5" />
          {shop ? <Rect x={x - 6} y={y - 3} width="137" height="69" rx="5" fill={i === 3 ? c.brand : c.coral} stroke={c.wood} strokeWidth="2" /> : <><Path d={`M${x - 10} ${y + 60}L${x + 62} ${y - 17}L${x + 138} ${y + 60}Z`} fill={i % 2 ? c.teal : c.coral} stroke={c.wood} strokeWidth="2" /><Path d={`M${x + 62} ${y - 17}V${y + 60}`} stroke={c.shadow} strokeWidth="4" /></>}
          <Rect x={x + 50} y={y + 79} width="27" height="36" fill={c.wood} />
          {[10, 88].map(w => <G key={w}><Rect x={x + w} y={y + 76} width="26" height="25" fill={c.sky} stroke={c.surface} strokeWidth="3" /><Path d={`M${x + w + 13} ${y + 76}v25 M${x + w} ${y + 88}h26`} stroke={c.surface} strokeWidth="2" /></G>)}
          <SvgText x={x + 63} y={y + 142} textAnchor="middle" fontSize="9" fontWeight="bold" fill={c.onSurface}>{label}</SvgText>
          {shop && <SvgText x={x + 62} y={y + 33} textAnchor="middle" fontSize="10" fontWeight="bold" fill={c.surface}>{label}</SvgText>}
          {!shop && [0, 1, 2, 3].map(f => <G key={f}><Rect x={x - 14 + f * 48} y={y + 160} width="5" height="16" fill={c.surface} /><Line x1={x - 14} y1={y + 169} x2={x + 136} y2={y + 169} stroke={c.surface} strokeWidth="3" /></G>)}
          <Circle cx={x - 15} cy={y + 98} r="14" fill={c.tree} /><Circle cx={x - 19} cy={y + 91} r="9" fill={c.mint} />
        </G>;
      })}
      <SvgText x="540" y="1390" fontSize="27" textAnchor="middle" letterSpacing="5" fill={c.teal}>PINECREST</SvgText>
    </G>
  </G>;
});

export function ServiceMarkers({ services }: { services: Service[] }) {
  const { colors: c } = useTheme();
  return <G>{services.map(stop => <G key={stop.id} testID={`world-service-${stop.id}`}><Circle cx={stop.x} cy={stop.y} r="15" fill={c.teal} stroke={c.surface} strokeWidth="2" /><SvgText x={stop.x} y={stop.y + 5} fill={c.surface} fontSize="14" fontWeight="bold" textAnchor="middle">{stop.kind === 'garage' ? 'H' : stop.kind === 'fuel' ? 'F' : 'R'}</SvgText>{stop.kind === 'fuel' && <G><Rect x={stop.x + 22} y={stop.y - 30} width="22" height="31" rx="3" fill={c.brand} stroke={c.onSurface} /><Rect x={stop.x + 27} y={stop.y - 24} width="12" height="10" fill={c.surface} /><Path d={`M${stop.x + 44} ${stop.y - 21}h8v19q0 8-8 4`} fill="none" stroke={c.onSurface} strokeWidth="3" /></G>}</G>)}</G>;
}