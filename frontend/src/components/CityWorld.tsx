import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, WORLD, railwayState } from '@/src/game/region';
import type { Point, Weather } from '@/src/game/api';
import type { Vehicle } from '@/src/game/traffic';
import { RiderSprite } from './RiderSprite';
import { useGame } from '@/src/game/GameContext';
import { points, RegionGround, RegionScenery } from './world/RegionTerrain';
import { LandmarkArt } from './world/LandmarkArt';
import { RailwayArt } from './world/RailwayArt';
import { TrafficArt } from './world/TrafficArt';

export function CityWorld({player,heading,elapsed,route,target,minutes,weather,width,height,bike,gear,vehicles,rail}:{player:Point;heading:number;elapsed:number;route:Point[];target:Point|null;minutes:number;weather:Weather;width:number;height:number;bike:string;gear:string;vehicles:Vehicle[];rail:ReturnType<typeof railwayState>}) {
  const {colors:c}=useTheme(),g=useGame();
  const zoom=.93,vw=width/zoom,vh=height/zoom,cx=Math.max(vw/2,Math.min(WORLD.width-vw/2,player.x)),cy=Math.max(vh/2,Math.min(WORLD.height-vh/2,player.y));
  const night=minutes>=1140||minutes<360,sunset=minutes>=1020&&minutes<1140;
  return <Svg testID="city-world" width={width} height={height} viewBox={`${cx-vw/2} ${cy-vh/2} ${vw} ${vh}`}>
    <RegionGround/><RegionScenery chunkX={Math.floor(player.x/500)} chunkY={Math.floor(player.y/500)}/>
    {MAP.landmarks.filter(l=>l.kind==='park'&&Math.abs(l.x+l.width/2-player.x)<1300&&Math.abs(l.y+l.height/2-player.y)<1400).map(l=><LandmarkArt key={l.id} landmark={l} elapsed={elapsed}/>)}
    {g.catalog!.services.filter(s=>Math.abs(s.x-player.x)<800&&Math.abs(s.y-player.y)<900).map(s=><G key={s.id} testID={`world-service-${s.id}`}><Circle cx={s.x} cy={s.y} r="15" fill={c.teal} stroke={c.surface} strokeWidth="2"/><T x={s.x} y={s.y+5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={c.surface}>{s.kind==='garage'?'H':s.kind==='fuel'?'F':'R'}</T>{s.kind==='fuel'&&<G><Rect x={s.x+24} y={s.y-34} width="23" height="32" rx="4" fill={c.brand} stroke={c.onSurface}/><Rect x={s.x+29} y={s.y-29} width="13" height="10" fill={c.surface}/><Path d={`M${s.x+47} ${s.y-26}h8v22q0 7-8 2`} fill="none" stroke={c.onSurface} strokeWidth="3"/></G>}</G>)}
    {route.length>1&&<><Polyline points={points(route)} fill="none" stroke={c.onSurface} strokeWidth="8" opacity=".25" strokeLinejoin="round"/><Polyline testID="gps-world-route" points={points(route)} fill="none" stroke={c.brand} strokeWidth="5" strokeDasharray="9 6" strokeLinejoin="round"/></>}
    <RailwayArt state={rail}/><TrafficArt vehicles={vehicles} player={player}/>
    {target&&<G testID="delivery-destination-marker"><Circle cx={target.x} cy={target.y} r={25+Math.sin(elapsed*3)*3} fill={c.brand} opacity=".22"/><Circle cx={target.x} cy={target.y} r="18" fill={c.brand} stroke={c.onSurface} strokeWidth="2"/><Path d={`M${target.x-6} ${target.y-5}h12v11h-12z M${target.x-3} ${target.y-5}v-3h6v3`} fill="none" stroke={c.onSurface} strokeWidth="2"/></G>}
    <RiderSprite player={player} heading={heading} bike={bike} gear={gear}/>
    {night&&<><Rect width={WORLD.width} height={WORLD.height} fill={c.night} opacity=".5"/><Circle cx={player.x} cy={player.y} r="65" fill={c.butter} opacity=".12"/>{MAP.landmarks.filter(l=>Math.abs(l.x-player.x)<1200&&Math.abs(l.y-player.y)<1200).map(l=><Circle key={l.id} cx={l.entrance.x} cy={l.entrance.y} r="45" fill={c.brand} opacity=".1"/>)}</>}
    {sunset&&<Rect width={WORLD.width} height={WORLD.height} fill={c.coral} opacity=".15"/>}{weather!=='sunny'&&<Rect width={WORLD.width} height={WORLD.height} fill={c.night} opacity={weather==='rainy'?.17:.07}/>}
    {weather==='rainy'&&Array.from({length:60},(_,i)=>{const x=cx-vw/2+(i*71)%vw,y=cy-vh/2+(i*137+elapsed*240)%vh;return <Line key={i} x1={x} y1={y} x2={x-5} y2={y+14} stroke={c.sky} strokeWidth="1.5" opacity=".65"/>;})}
  </Svg>;
}
export function MiniMap({player,target,route,size=112,large=false}:{player:Point;target:Point|null;route:Point[];size?:number;large?:boolean}) {
  const {colors:c}=useTheme();
  return <Svg testID={large?'phone-gps-map':'mini-gps-map'} width={size} height={large?size*.76:size} viewBox={large?'0 -80 6300 4620':`${player.x-380} ${player.y-380} 760 760`}>
    <Rect width={MAP.width} height={MAP.height} fill={c.treeLight}/>{MAP.towns.map(t=><Polyline key={t.id} points={points(t.outline)} fill={c.grass} stroke={c.grass} strokeWidth="10"/>)}
    <Polyline points={points(MAP.river.points)} fill="none" stroke={c.sky} strokeWidth="290" strokeLinejoin="round"/>
    {MAP.roads.map(r=><Polyline key={r.id} points={points(r.points)} fill="none" stroke={r.kind==='bridge'?c.brand:c.surface} strokeWidth={large?28:49} strokeLinejoin="round" strokeLinecap="round"/>)}
    {MAP.blocks.map(b=><Rect key={b.id} x={b.x} y={b.y} width={b.width} height={b.height} rx="20" fill={b.index%2?c.peach:c.pavement}/>)}
    {MAP.landmarks.map(l=><Rect key={l.id} x={l.x} y={l.y} width={l.width} height={l.height} rx="30" fill={l.kind==='stadium'||l.kind==='park'?c.tree:c.coral}/>)}
    <Line x1={MAP.railway.start} y1={MAP.railway.y} x2={MAP.railway.end} y2={MAP.railway.y} stroke={c.onSurface} strokeWidth={large?22:12} strokeDasharray="30 20"/>
    {route.length>1&&<Polyline points={points(route)} fill="none" stroke={c.teal} strokeWidth={large?29:13} strokeLinejoin="round"/>}
    {large&&MAP.towns.map(t=><G key={t.id}><Rect x={t.x-350} y={t.y-76} width="700" height="148" rx="45" fill={c.surface} opacity=".94"/><T x={t.x} y={t.y+27} fontSize="112" fontWeight="bold" textAnchor="middle" fill={c.teal}>{t.name}</T></G>)}
    {target&&<Circle cx={target.x} cy={target.y} r={large?58:26} fill={c.brand} stroke={c.onSurface} strokeWidth={large?13:7}/>}
    <Circle cx={player.x} cy={player.y} r={large?65:31} fill={c.teal} opacity=".18"/><Circle cx={player.x} cy={player.y} r={large?39:18} fill={c.teal} stroke={c.surface} strokeWidth={large?12:7}/>
  </Svg>;
}