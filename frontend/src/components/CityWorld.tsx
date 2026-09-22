import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, WORLD, railwayState } from '@/src/game/region';
import type { Point, Weather } from '@/src/game/api';
import type { Vehicle } from '@/src/game/traffic';
import { RiderSprite } from './RiderSprite';
import worldData from '@/src/game/worldData.json';
import { points, RegionGround, RegionScenery } from './world/RegionTerrain';
import { LandmarkArt } from './world/LandmarkArt';
import { RailwayArt } from './world/RailwayArt';
import { TrafficArt } from './world/TrafficArt';

const RainOverlay = React.memo(function RainOverlay({ width, height, color }: { width: number; height: number; color: string }) {
  const drops = React.useMemo(() => {
    const w = width || 400, h = height || 800;
    return Array.from({ length: 48 }, (_, i) => `M${(i * 71) % w} ${(i * 137) % h}l-5 14`).join(' ');
  }, [width, height]);
  return <Path d={drops} stroke={color} strokeWidth="1.5" opacity=".65" />;
});

export const CityWorld = React.memo(function CityWorld({
  player,
  camera,
  heading,
  route,
  target,
  minutes,
  weather,
  width,
  height,
  bike,
  gear,
  vehicles,
  rail,
  liveFrame,
  subscribeFrame,
}: {
  player: Point;
  camera?: Point;
  heading: number;
  elapsed?: number;
  route: Point[];
  target: (Point & { name?: string }) | null;
  minutes: number;
  weather: Weather;
  width: number;
  height: number;
  bike: string;
  gear: string;
  vehicles: Vehicle[];
  rail: ReturnType<typeof railwayState>;
  liveFrame?: React.MutableRefObject<{
    player: Point;
    camera: Point;
    heading: number;
    vehicles: Vehicle[];
    rail: ReturnType<typeof railwayState>;
  }>;
  subscribeFrame?: (fn: () => void) => () => void;
}) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!subscribeFrame) return;
    return subscribeFrame(() => {
      setTick(t => (t + 1) | 0);
    });
  }, [subscribeFrame]);

  const activeFrame = liveFrame?.current;
  const activePlayer = activeFrame ? activeFrame.player : player;
  const activeCam = activeFrame ? activeFrame.camera : (camera || player);
  const activeHeading = activeFrame ? activeFrame.heading : heading;
  const activeVehicles = activeFrame ? activeFrame.vehicles : vehicles;
  const activeRail = activeFrame ? activeFrame.rail : rail;

  const { colors: c } = useTheme();
  const zoom = .93,
    vw = width / zoom,
    vh = height / zoom;
  const cx = Math.max(vw / 2, Math.min(WORLD.width - vw / 2, activeCam.x));
  const cy = Math.max(vh / 2, Math.min(WORLD.height - vh / 2, activeCam.y));
  const tx = width / 2 - cx * zoom;
  const ty = height / 2 - cy * zoom;
  const worldTransformRef = React.useRef({ tx: -9999, ty: -9999, str: '' });
  const roundTx = Math.round(tx * 2) / 2;
  const roundTy = Math.round(ty * 2) / 2;
  if (worldTransformRef.current.tx !== roundTx || worldTransformRef.current.ty !== roundTy) {
    worldTransformRef.current.tx = roundTx;
    worldTransformRef.current.ty = roundTy;
    worldTransformRef.current.str = `translate(${roundTx}, ${roundTy}) scale(${zoom})`;
  }
  const worldTransform = worldTransformRef.current.str;

  const riderTransformRef = React.useRef({ x: -9999, y: -9999, str: '' });
  const riderX = Math.round((width / 2 + (activePlayer.x - cx) * zoom) * 2) / 2;
  const riderY = Math.round((height / 2 + (activePlayer.y - cy) * zoom) * 2) / 2;
  if (riderTransformRef.current.x !== riderX || riderTransformRef.current.y !== riderY) {
    riderTransformRef.current.x = riderX;
    riderTransformRef.current.y = riderY;
    riderTransformRef.current.str = `translate(${riderX}, ${riderY}) scale(${zoom})`;
  }
  const riderTransform = riderTransformRef.current.str;

  const night = minutes >= 1140 || minutes < 360,
    sunset = minutes >= 1020 && minutes < 1140;
  const chunkX = Math.floor(activePlayer.x / 500),
    chunkY = Math.floor(activePlayer.y / 500);

  const parkLandmark = React.useMemo(() => MAP.landmarks.find(l => l.kind === 'park'), []);
  const isNearPark =
    parkLandmark &&
    Math.abs(parkLandmark.x + parkLandmark.width / 2 - activePlayer.x) < 1300 &&
    Math.abs(parkLandmark.y + parkLandmark.height / 2 - activePlayer.y) < 1400;

  // Sliced GPS Route Polyline: Only render route points near the camera viewport
  const visibleRoute = React.useMemo(() => {
    if (!route || route.length <= 2) return route || [];
    const padX = vw * 0.65;
    const padY = vh * 0.65;
    let exitIdx = -1;
    for (let i = 0; i < route.length; i++) {
      if (Math.abs(route[i].x - cx) > padX || Math.abs(route[i].y - cy) > padY) {
        exitIdx = i;
        break;
      }
    }
    return exitIdx !== -1 ? route.slice(0, exitIdx + 1) : route;
  }, [route, Math.floor(cx / 100), Math.floor(cy / 100), vw, vh]);

  const routePoints = React.useMemo(() => points(visibleRoute), [visibleRoute]);
  const services = worldData.services;
  const visibleServices = React.useMemo(() => {
    return services.filter(s => Math.abs(s.x - cx) < 450 && Math.abs(s.y - cy) < 550);
  }, [services, Math.floor(cx / 100), Math.floor(cy / 100)]);

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: c.grass }}>
      <Svg testID="city-world" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* World Space Camera Transform Group */}
        <G transform={worldTransform}>
          <RegionGround chunkX={chunkX} chunkY={chunkY} />
          <RegionScenery chunkX={chunkX} chunkY={chunkY} />
          {isNearPark && <LandmarkArt landmark={parkLandmark!} cx={cx} cy={cy} />}
          {visibleServices
            .map(s => (
              <G key={s.id} testID={`world-service-${s.id}`}>
                <Circle cx={s.x} cy={s.y} r="15" fill={s.kind === 'bike_shop' ? c.brand : c.teal} stroke={c.surface} strokeWidth="2" />
                <T x={s.x} y={s.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={s.kind === 'bike_shop' ? c.onSurface : c.surface}>
                  {s.kind === 'garage' ? 'H' : s.kind === 'fuel' ? 'F' : s.kind === 'bike_shop' ? 'B' : 'R'}
                </T>
                {s.kind === 'bike_shop' && (
                  <G transform={`translate(${s.x + 18}, ${s.y - 28})`}>
                    <Rect x="0" y="0" width="32" height="18" rx="5" fill={c.wood} stroke={c.butter} strokeWidth="1.5" />
                    <T x="16" y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fill={c.butter}>MOTO</T>
                  </G>
                )}
                {s.kind === 'fuel' && (
                  <G>
                    <Rect x={s.x + 24} y={s.y - 34} width="23" height="32" rx="4" fill={c.brand} stroke={c.onSurface} />
                    <Rect x={s.x + 29} y={s.y - 29} width="13" height="10" fill={c.surface} />
                    <Path d={`M${s.x + 47} ${s.y - 26}h8v22q0 7-8 2`} fill="none" stroke={c.onSurface} strokeWidth="3" />
                  </G>
                )}
              </G>
            ))}
          {visibleRoute.length > 1 && (
            <>
              <Polyline points={routePoints} fill="none" stroke={c.onSurface} strokeWidth="8" opacity=".25" strokeLinejoin="round" />
              <Polyline testID="gps-world-route" points={routePoints} fill="none" stroke={c.brand} strokeWidth="5" strokeDasharray="9 6" strokeLinejoin="round" />
            </>
          )}
          <RailwayArt state={activeRail} cx={cx} cy={cy} dynamicOnly />
          <TrafficArt vehicles={activeVehicles} cx={cx} cy={cy} />
          {target && (
            <G testID="delivery-destination-marker">
              <Circle cx={target.x} cy={target.y} r={28} fill={c.brand} opacity=".25" />
              <Circle cx={target.x} cy={target.y} r={18} fill={c.brand} stroke={c.onSurface} strokeWidth="2" />
              <Path d={`M${target.x - 6} ${target.y - 5}h12v11h-12z M${target.x - 3} ${target.y - 5}v-3h6v3`} fill="none" stroke={c.onSurface} strokeWidth="2" />
              {/* High-visibility hovering destination badge showing target name directly in the world */}
              {!!target.name && (
                <G transform={`translate(${target.x}, ${target.y - 30})`}>
                  <Rect
                    x={-(Math.min(target.name.length * 4.2 + 16, 120))}
                    y={-12}
                    width={Math.min(target.name.length * 8.4 + 32, 240)}
                    height={22}
                    rx={6}
                    fill={c.surface}
                    stroke={c.brand}
                    strokeWidth={2}
                  />
                  <T
                    x={0}
                    y={3}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="bold"
                    fill={c.onSurface}
                    letterSpacing={0.8}
                  >
                    {target.name.toUpperCase()}
                  </T>
                </G>
              )}
            </G>
          )}
          {night && (
            <>
              <Circle cx={activePlayer.x} cy={activePlayer.y} r={65} fill={c.butter} opacity=".12" />
              {MAP.landmarks
                .filter(l => Math.abs(l.x - cx) < 450 && Math.abs(l.y - cy) < 550)
                .map(l => (
                  <Circle key={l.id} cx={l.entrance.x} cy={l.entrance.y} r="45" fill={c.brand} opacity=".1" />
                ))}
            </>
          )}
        </G>

        {/* Screen-Space Player Rider: Perfectly anchored focal point with zero subpixel flutter */}
        <G testID="player-rider-screen-anchor" transform={riderTransform}>
          <RiderSprite player={{ x: 0, y: 0 }} heading={activeHeading} bike={bike} gear={gear} />
        </G>

        {/* Screen Space Ambient Lighting & Weather Overlays */}
        {night && <Rect width={width} height={height} fill={c.night} opacity=".5" />}
        {sunset && <Rect width={width} height={height} fill={c.coral} opacity=".15" />}
        {weather !== 'sunny' && <Rect width={width} height={height} fill={c.night} opacity={weather === 'rainy' ? .17 : .07} />}
        {weather === 'rainy' && <RainOverlay width={width} height={height} color={c.sky} />}
      </Svg>
    </View>
  );
},
(prev, next) => {
    // CityWorld coordinates and traffic are driven by liveFrame and subscribeFrame.
    // It should never re-render purely due to parent HUD state dispatches (speed, player text, clock).
    return (
      prev.width === next.width &&
      prev.height === next.height &&
      prev.bike === next.bike &&
      prev.gear === next.gear &&
      prev.weather === next.weather &&
      prev.target === next.target &&
      prev.route === next.route &&
      Math.floor(prev.minutes / 180) === Math.floor(next.minutes / 180)
    );
  }
);

const MiniMapStaticBg = React.memo(function MiniMapStaticBg({ large, cx, cy }: { large: boolean; cx?: number; cy?: number }) {
  const { colors: c } = useTheme();
  const roads = large || cx === undefined || cy === undefined
    ? MAP.roads
    : MAP.roads.filter(r => r.points.some(p => Math.abs(p.x - cx) < 850 && Math.abs(p.y - cy) < 850));
  const blocks = large || cx === undefined || cy === undefined
    ? MAP.blocks
    : MAP.blocks.filter(b => Math.abs(b.x + b.width / 2 - cx) < 850 && Math.abs(b.y + b.height / 2 - cy) < 850);
  const landmarks = large || cx === undefined || cy === undefined
    ? MAP.landmarks
    : MAP.landmarks.filter(l => Math.abs(l.x + l.width / 2 - cx) < 850 && Math.abs(l.y + l.height / 2 - cy) < 850);
  return (
    <>
      <Rect width={MAP.width} height={MAP.height} fill={c.treeLight} />
      {MAP.towns.map(t => (
        <Polyline key={t.id} points={points(t.outline)} fill={c.grass} stroke={c.grass} strokeWidth="10" />
      ))}
      <Polyline points={points(MAP.river.points)} fill="none" stroke={c.sky} strokeWidth="290" strokeLinejoin="round" />
      {large ? (
        roads.map(r => (
          <Polyline key={r.id} points={points(r.points)} fill="none" stroke={r.kind === 'bridge' ? c.brand : c.surface} strokeWidth={28} strokeLinejoin="round" strokeLinecap="round" />
        ))
      ) : (
        <Path d={roads.map(r => 'M' + r.points.map(p => `${p.x},${p.y}`).join('L')).join(' ')} fill="none" stroke={c.surface} strokeWidth={49} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {large ? (
        blocks.map(b => (
          <Rect key={b.id} x={b.x} y={b.y} width={b.width} height={b.height} rx="20" fill={b.index % 2 ? c.peach : c.pavement} />
        ))
      ) : (
        <Path d={blocks.map(b => `M${b.x},${b.y}h${b.width}v${b.height}h-${b.width}z`).join(' ')} fill={c.pavement} />
      )}
      {large ? (
        landmarks.map(l => (
          <G key={l.id}>
            <Rect x={l.x} y={l.y} width={l.width} height={l.height} rx="24" fill={l.kind === 'stadium' || l.kind === 'park' || l.kind === 'forest_dept' ? c.tree : c.coral} />
            <T x={l.x + l.width / 2} y={l.y + l.height / 2 + 18} fontSize="64" fontWeight="bold" textAnchor="middle" fill={c.surface}>
              {l.name}
            </T>
          </G>
        ))
      ) : (
        <Path d={landmarks.map(l => `M${l.x},${l.y}h${l.width}v${l.height}h-${l.width}z`).join(' ')} fill={c.coral} />
      )}
      {/* Forest Corridor */}
      {large && <Rect x="5150" y="1650" width="850" height="1100" rx="60" fill={c.tree} opacity=".32" />}
      {/* Complete Railway Tracks on Map */}
      {(MAP.railway.tracks || [{ id: 'main', points: [{ x: MAP.railway.start, y: MAP.railway.y }, { x: MAP.railway.end, y: MAP.railway.y }] }]).map(t => (
        <Polyline key={t.id} points={points(t.points)} fill="none" stroke={c.onSurface} strokeWidth={large ? 24 : 12} strokeDasharray="30 20" />
      ))}
      {large &&
        MAP.towns.map(t => (
          <G key={t.id}>
            <Rect x={t.x - 380} y={t.y - 76} width="760" height="148" rx="45" fill={c.surface} opacity=".94" />
            <T x={t.x} y={t.y + 27} fontSize="112" fontWeight="bold" textAnchor="middle" fill={c.teal}>
              {t.name}
            </T>
          </G>
        ))}
    </>
  );
});

export const MiniMap = React.memo(
  function MiniMap({player,target,route,size=112,large=false,viewBoxOverride}:{player:Point;target:Point|null;route:Point[];size?:number;large?:boolean;viewBoxOverride?:string}) {
    const {colors:c}=useTheme();
    const px = player.x;
    const py = player.y;
    const bgX = large ? undefined : Math.floor(player.x / 250) * 250;
    const bgY = large ? undefined : Math.floor(player.y / 250) * 250;
    const routePts = React.useMemo(() => points(route), [route]);
    const defaultViewBox = large ? '0 -80 6300 4620' : `${px-380} ${py-380} 760 760`;
    const activeViewBox = viewBoxOverride || defaultViewBox;

    return <Svg testID={large?'phone-gps-map':'mini-gps-map'} width={size} height={large?size*.76:size} viewBox={activeViewBox}>
      <MiniMapStaticBg large={large} cx={bgX} cy={bgY} />
      {route.length>1&&<Polyline points={routePts} fill="none" stroke={c.teal} strokeWidth={large?29:13} strokeLinejoin="round"/>}
      {target&&<Circle cx={target.x} cy={target.y} r={large?58:26} fill={c.brand} stroke={c.onSurface} strokeWidth={large?13:7}/>}
      <Circle cx={px} cy={py} r={large?65:31} fill={c.teal} opacity=".18"/><Circle cx={px} cy={py} r={large?39:18} fill={c.teal} stroke={c.surface} strokeWidth={large?12:7}/>
    </Svg>;
  },
  (prev, next) => {
    if (next.large || prev.large !== next.large) return false;
    if (prev.target !== next.target || prev.route !== next.route || prev.size !== next.size) return false;
    if (prev.viewBoxOverride !== next.viewBoxOverride) return false;
    const dx = prev.player.x - next.player.x, dy = prev.player.y - next.player.y;
    return dx * dx + dy * dy < 576;
  }
);