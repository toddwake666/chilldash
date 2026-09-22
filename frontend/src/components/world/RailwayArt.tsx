import React from 'react';
import { Circle, ClipPath, Defs, G, Line, Path, Polyline, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, railwayState } from '@/src/game/region';

const toPt = (p: any): { x: number; y: number } => {
  if (Array.isArray(p)) return { x: Number(p[0]) || 0, y: Number(p[1]) || 0 };
  return { x: Number(p?.x) || 0, y: Number(p?.y) || 0 };
};

const pts = (points: { x: number; y: number }[]) => points.map(p => `${p.x},${p.y}`).join(' ');

export const StaticRailwayTracks = React.memo(function StaticRailwayTracks() {
  const {colors:c}=useTheme(), r=MAP.railway;
  const rawTracks = r.tracks || [{ id: 'main-track', points: [{ x: r.start, y: r.y }, { x: r.end, y: r.y }] }];
  const tracks = rawTracks.map(t => ({ id: t.id, points: (t.points || []).map(toPt) }));
  const bridge = MAP.bridges.find(b => b.kind === 'railway_bridge') || { start: 3460, end: 4200, y: 3050, name: 'Ichhamati Railway Bridge', x: 3820 };

  return <G testID="eastern-railway-static-tracks">
    <Defs>
      <ClipPath id="rail-corridor">
        <Rect x={r.start - 200} y={r.y - 48} width={r.end - r.start + 400} height="96"/>
      </ClipPath>
    </Defs>

    {/* Render All Track Beds, Sleepers & Rails */}
    {tracks.map(track => {
      const d = 'M' + track.points.map(p => `${p.x},${p.y}`).join('L');
      return <G key={track.id}>
        <Path d={d} fill="none" stroke={c.roadEdge} strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} fill="none" stroke={c.wood} strokeWidth="50" strokeDasharray="8 10" strokeLinecap="butt" strokeLinejoin="round" />
      </G>;
    })}

    {/* Dual Parallel Steel Rail Lines for Horizontal Main Track */}
    {[-16, 16].map(dy => (
      <Line key={dy} x1={r.start} y1={r.y + dy} x2={r.end} y2={r.y + dy} stroke={c.surface} strokeWidth="4" />
    ))}

    {/* Dual Parallel Steel Rail Lines for Bongaon Curve Branch */}
    {tracks.filter(t => t.id !== 'main-track').map(t => (
      <G key={`rails-${t.id}`}>
        <Polyline points={pts(t.points.map(p => ({ x: p.x - 14, y: p.y })))} fill="none" stroke={c.surface} strokeWidth="4" strokeLinecap="round" />
        <Polyline points={pts(t.points.map(p => ({ x: p.x + 14, y: p.y })))} fill="none" stroke={c.surface} strokeWidth="4" strokeLinecap="round" />
      </G>
    ))}

    {/* Dedicated Steel Truss Railway Bridge across Ichhamati River */}
    <G testID="ichhamati-railway-bridge">
      <Rect x={bridge.start - 18} y={bridge.y - 42} width="28" height="84" rx="4" fill={c.onSurface} />
      <Rect x={bridge.end - 10} y={bridge.y - 42} width="28" height="84" rx="4" fill={c.onSurface} />
      <Line x1={bridge.start} y1={bridge.y - 36} x2={bridge.end} y2={bridge.y - 36} stroke={c.wood} strokeWidth="12" />
      <Line x1={bridge.start} y1={bridge.y + 36} x2={bridge.end} y2={bridge.y + 36} stroke={c.wood} strokeWidth="12" />
      <Line x1={bridge.start} y1={bridge.y - 42} x2={bridge.end} y2={bridge.y - 42} stroke={c.surface} strokeWidth="4" />
      <Line x1={bridge.start} y1={bridge.y + 42} x2={bridge.end} y2={bridge.y + 42} stroke={c.surface} strokeWidth="4" />
      {Array.from({ length: 14 }, (_, i) => {
        const bx = bridge.start + i * 52;
        return <G key={i}>
          <Line x1={bx} y1={bridge.y - 36} x2={bx + 52} y2={bridge.y + 36} stroke={c.teal} strokeWidth="3" opacity="0.85" />
          <Line x1={bx} y1={bridge.y + 36} x2={bx + 52} y2={bridge.y - 36} stroke={c.teal} strokeWidth="3" opacity="0.85" />
          <Circle cx={bx + 26} cy={bridge.y - 36} r="4" fill={c.onSurface} />
          <Circle cx={bx + 26} cy={bridge.y + 36} r="4" fill={c.onSurface} />
        </G>;
      })}
      <Rect x={bridge.x - 145} y={bridge.y - 94} width="290" height="38" rx="7" fill={c.coral} stroke={c.surface} strokeWidth="2" />
      <T x={bridge.x} y={bridge.y - 70} textAnchor="middle" fontSize="17" fontWeight="bold" fill={c.surface}>ICHHAMATI RAILWAY BRIDGE</T>
    </G>
  </G>;
});

export function RailwayArt({
  state,
  cx = 0,
  cy = 0,
  staticOnly = false,
  dynamicOnly = false,
}: {
  state: ReturnType<typeof railwayState>;
  cx?: number;
  cy?: number;
  staticOnly?: boolean;
  dynamicOnly?: boolean;
}) {
  const { colors: c } = useTheme(), r = MAP.railway;
  const rawTrains = state.trains || [];
  const trains = cx && cy
    ? rawTrains.filter(train => Math.abs(train.head.x - cx) < 650 && Math.abs(train.head.y - cy) < 700)
    : rawTrains;
  const gates = cx && cy
    ? r.gates.filter(g => Math.abs(g.x - cx) < 550 && Math.abs(g.y - cy) < 600)
    : r.gates;

  if (staticOnly) {
    return <StaticRailwayTracks />;
  }

  const renderTrains = () => (
    <G testID="regional-train-network">
      {trains.map(train => (
        <G key={train.id} testID={`train-${train.id}`}>
          {/* Render individual coaches along track orientation */}
          {train.coaches.map((coach, ci) => (
            <G key={ci} transform={`translate(${coach.x},${coach.y}) rotate(${coach.angle})`}>
              {/* Drop shadow */}
              <Rect x="-36" y="-22" width="72" height="44" rx="6" fill={c.shadow} opacity="0.3" transform="translate(4, 6)" />
              {/* Coach body */}
              <Rect
                x="-36"
                y="-23"
                width="72"
                height="46"
                rx={coach.isEngine ? 12 : 5}
                fill={coach.isEngine ? c.coral : ci % 2 ? c.butter : c.peach}
                stroke={c.onSurface}
                strokeWidth="2"
              />
              {/* Decorative side stripe */}
              <Rect x="-34" y="9" width="68" height="6" rx="2" fill={c.teal} />
              {/* Passenger windows */}
              {[-20, 0, 20].map(wx => (
                <Rect key={wx} x={wx - 7} y="-14" width="14" height="15" rx="3" fill={c.teal} stroke={c.onSurface} strokeWidth="1" />
              ))}
              {/* Locomotive front windshield and pilot */}
              {coach.isEngine && (
                <>
                  <Rect x="23" y="-16" width="9" height="32" rx="3" fill={c.sky} stroke={c.onSurface} strokeWidth="1" />
                  <Rect x="32" y="-12" width="6" height="24" rx="2" fill={c.onSurface} />
                  {/* Headlight glow */}
                  <Circle cx="35" cy="0" r="5" fill="#FEF08A" opacity="0.9" />
                </>
              )}
            </G>
          ))}
          {/* Station Halt Badge */}
          {train.halting && (
            <G transform={`translate(${train.head.x},${train.head.y - 42})`} testID={`halt-${train.id}`}>
              <Rect x="-78" y="-14" width="156" height="28" rx="8" fill={c.teal} stroke={c.surface} strokeWidth="2" />
              <T x="0" y="4" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill={c.surface}>
                {train.stationName ? `${train.stationName.toUpperCase()} · HALT` : 'STATION HALT'}
              </T>
            </G>
          )}
        </G>
      ))}
    </G>
  );

  return (
    <G testID="eastern-railway-network">
      {!dynamicOnly && <StaticRailwayTracks />}
      {renderTrains()}

      {/* Individual Proximity-Controlled Level Crossing Gates (viewport culled) */}
      {gates.map(g => {
      const gateState = state.gates?.[g.id] ?? { closed: false, wait: 0 };
      const isClosed = gateState.closed;
      const waitTime = gateState.wait;
      const isHorizRoad = (g as any).axis === 'horizontal' || Math.abs(g.y - 3050) > 100;

      if (isHorizRoad) {
        // Horizontal road across vertical track (e.g. RevenueCat Bridge in Bongaon & Habra Bridge)
        return (
          <G testID={`rail-gate-${g.id}`} key={g.id}>
            {[-1, 1].map(side => (
              <G key={side}>
                {/* Gate Post on curb (side: -1 = West of track, +1 = East of track) */}
                <Rect x={g.x + side * 78 - 8} y={g.y - 48} width="16" height="18" rx="3" fill={c.onSurface} />
                {/* Signal Light: RED when closed, GREEN when open */}
                <Circle cx={g.x + side * 78} cy={g.y - 56} r="6" fill={isClosed ? c.error : c.success} />
                {/* Barrier Arm: Lowered (90 deg = straight down across road) when closed, Lifted when open */}
                <G transform={`translate(${g.x + side * 78},${g.y - 44}) rotate(${isClosed ? 90 : (side === -1 ? 177 : 3)})`}>
                  <Rect x="0" y="-4" width="90" height="8" rx="3" fill={c.surface} stroke={c.onSurface} />
                  {[0, 1, 2, 3, 4].map(i => (
                    <Rect key={i} x={i * 18} y="-4" width="9" height="8" fill={c.coral} />
                  ))}
                </G>
                {/* Painted Road Stop Line across the horizontal road */}
                <Line x1={g.x + side * 96} y1={g.y - 36} x2={g.x + side * 96} y2={g.y + 36} stroke={c.surface} strokeWidth="4" />
              </G>
            ))}
            {/* Status Badge above the crossing */}
            <Rect x={g.x - 52} y={g.y - 105} width="104" height="38" rx="6" fill={isClosed ? c.coral : c.teal} stroke={c.surface} strokeWidth="2" />
            <T x={g.x} y={g.y - 90} textAnchor="middle" fontSize="10" fill={c.surface} fontWeight="bold">
              {isClosed ? 'GATE CLOSED' : 'GATE OPEN'}
            </T>
            <T x={g.x} y={g.y - 76} textAnchor="middle" fontSize="9" fill={c.surface}>
              {isClosed ? `${waitTime}s · WAIT` : 'LOOK BOTH WAYS'}
            </T>
          </G>
        );
      }

      // Vertical road across horizontal track (e.g. Habra & Petrapole town streets)
      return (
        <G testID={`rail-gate-${g.id}`} key={g.id}>
          {[-1, 1].map(side => (
            <G key={side}>
              {/* Gate Post on curb (side: -1 = North of track, +1 = South of track) */}
              <Rect x={g.x - 48} y={g.y + side * 78 - 9} width="16" height="18" rx="3" fill={c.onSurface} />
              {/* Signal Light: RED when closed, GREEN when open */}
              <Circle cx={g.x - 40} cy={g.y + side * 78 - 18} r="6" fill={isClosed ? c.error : c.success} />
              {/* Barrier Arm: Lowered (0 deg = straight across road) when closed, Lifted (-87 deg) when open */}
              <G transform={`translate(${g.x - 40},${g.y + side * 78}) rotate(${isClosed ? 0 : side * -87})`}>
                <Rect x="0" y="-4" width="90" height="8" rx="3" fill={c.surface} stroke={c.onSurface} />
                {[0, 1, 2, 3, 4].map(i => (
                  <Rect key={i} x={i * 18} y="-4" width="9" height="8" fill={c.coral} />
                ))}
              </G>
              {/* Painted Road Stop Line across the vertical road */}
              <Line x1={g.x - 36} y1={g.y + side * 96} x2={g.x + 36} y2={g.y + side * 96} stroke={c.surface} strokeWidth="4" />
            </G>
          ))}
          {/* Signal Status Pill */}
          <Rect x={g.x + 48} y={g.y - 120} width="96" height="38" rx="6" fill={isClosed ? c.coral : c.teal} stroke={c.surface} strokeWidth="2" />
          <T x={g.x + 96} y={g.y - 105} textAnchor="middle" fontSize="10" fill={c.surface} fontWeight="bold">
            {isClosed ? 'GATE CLOSED' : 'GATE OPEN'}
          </T>
          <T x={g.x + 96} y={g.y - 91} textAnchor="middle" fontSize="9" fill={c.surface}>
            {isClosed ? `${waitTime}s · WAIT` : 'LOOK BOTH WAYS'}
          </T>
        </G>
      );
    })}
    </G>
  );
}