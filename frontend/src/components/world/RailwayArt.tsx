import React from 'react';
import { Circle, ClipPath, Defs, G, Line, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, railwayState } from '@/src/game/region';

export function RailwayArt({state}:{state:ReturnType<typeof railwayState>}) {
  const {colors:c}=useTheme(),r=MAP.railway;
  return <G testID="habra-railway">
    <Defs><ClipPath id="rail-corridor"><Rect x={r.start} y={r.y-42} width={r.end-r.start} height="84"/></ClipPath></Defs>
    <Rect x={r.start} y={r.y-28} width={r.end-r.start} height="56" fill={c.roadEdge}/>
    {Array.from({length:Math.ceil((r.end-r.start)/18)},(_,i)=><Rect key={i} x={r.start+i*18} y={r.y-25} width="8" height="50" fill={c.wood}/>)}
    {[-16,16].map(dy=><Line key={dy} x1={r.start} y1={r.y+dy} x2={r.end} y2={r.y+dy} stroke={c.surface} strokeWidth="4"/>)}
    {state.trainVisible&&<G clipPath="url(#rail-corridor)" testID="passing-train">{Array.from({length:6},(_,i)=>{
      const x=state.trainX-i*80;
      return <G key={i}><Rect x={x-76} y={r.y-24} width="73" height="48" rx={i===0?12:5} fill={i===0?c.coral:c.butter} stroke={c.onSurface} strokeWidth="2"/><Rect x={x-73} y={r.y+10} width="66" height="6" fill={c.teal}/>{[0,1,2].map(j=><Rect key={j} x={x-67+j*20} y={r.y-13} width="13" height="16" rx="2" fill={c.teal}/>)}{i===0&&<Rect x={x-15} y={r.y-16} width="9" height="32" rx="3" fill={c.sky}/>}</G>;
    })}</G>}
    {r.gates.map(g=><G testID={`rail-gate-${g.id}`} key={g.id}>
      {[-1,1].map(side=><G key={side}><Rect x={g.x-70} y={g.y+side*91-9} width="16" height="18" rx="3" fill={c.onSurface}/><Circle cx={g.x-62} cy={g.y+side*91-18} r="6" fill={state.closed?c.error:c.success}/>
        <G transform={`translate(${g.x-62},${g.y+side*91}) rotate(${state.closed?0:side*-87})`}><Rect x="0" y="-4" width="124" height="8" rx="3" fill={c.surface} stroke={c.onSurface}/>{[0,1,2,3,4,5].map(i=><Rect key={i} x={i*22} y="-4" width="11" height="8" fill={c.coral}/>)}</G>
        <Line x1={g.x-51} y1={g.y+side*112} x2={g.x+51} y2={g.y+side*112} stroke={c.surface} strokeWidth="4"/>
      </G>)}
      <Rect x={g.x+69} y={g.y-157} width="89" height="39" rx="5" fill={state.closed?c.coral:c.teal} stroke={c.surface} strokeWidth="2"/><T x={g.x+113} y={g.y-141} textAnchor="middle" fontSize="10" fill={c.surface} fontWeight="bold">{state.closed?'GATE CLOSED':'GATE OPEN'}</T><T x={g.x+113} y={g.y-127} textAnchor="middle" fontSize="9" fill={c.surface}>{state.closed?`${state.wait}s · WAIT`:'LOOK BOTH WAYS'}</T>
    </G>)}
  </G>;
}