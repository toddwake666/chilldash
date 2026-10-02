import React, { memo } from 'react';
import { Circle, Ellipse, G, Line, Path, Polyline, Rect, Text as T, Image as SvgImage } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, nearestRoad, riverDistance } from '@/src/game/region';

const RC_LOGO = require('@/assets/images/rclogo.webp');
const AKASH_WHEELS_IMG = require('@/assets/images/akash_wheels.png');
import type { Point } from '@/src/game/api';
import { AdScreen, LandmarkArt } from './LandmarkArt';
import { StaticRailwayTracks } from './RailwayArt';

export const points = (ps: any[]) => (ps || []).map(p => {
  if (Array.isArray(p)) return `${p[0] || 0},${p[1] || 0}`;
  return `${p?.x ?? 0},${p?.y ?? 0}`;
}).join(' ');
export function Tree({x,y,pine=false}:{x:number;y:number;pine?:boolean}) {
  const {colors:c}=useTheme();
  return <G><Ellipse cx={x+7} cy={y+12} rx="19" ry="12" fill={c.shadow}/><Rect x={x-3} y={y+2} width="6" height="21" fill={c.wood}/>{pine?<><Path d={`M${x} ${y-28}l-23 39h46z M${x} ${y-44}l-17 34h34z`} fill={c.teal}/><Path d={`M${x} ${y-36}l-10 20h10z`} fill={c.tree}/></>:<><Circle cx={x} cy={y} r="20" fill={c.tree}/><Circle cx={x-5} cy={y-7} r="14" fill={c.treeLight}/></>}</G>;
}
let cachedTownsD: string | null = null;
let cachedRiverPoints: string | null = null;
const roadPathCache = new Map<string, { normalRoadD: string; bridgeRoadD: string; allRoadD: string; bridges: typeof MAP.bridges }>();

export const RegionGround=memo(function RegionGround({chunkX, chunkY}:{chunkX?:number;chunkY?:number}) {
  const {colors:c}=useTheme();
  const key = `${chunkX},${chunkY}`;
  const cx = chunkX !== undefined ? chunkX * 500 : undefined;
  const cy = chunkY !== undefined ? chunkY * 500 : undefined;
  let data = roadPathCache.get(key);
  if (!data) {
    const roads = cx !== undefined && cy !== undefined
      ? MAP.roads.filter(r => r.points.some(p => Math.abs(p.x - cx) < 1300 && Math.abs(p.y - cy) < 1400))
      : MAP.roads;
    const bridges = cx !== undefined && cy !== undefined
      ? MAP.bridges.filter(b => Math.abs(b.x - cx) < 1400 && Math.abs(b.y - cy) < 1400)
      : MAP.bridges;

    const normalRoads = roads.filter(r => r.kind !== 'bridge');
    const bridgeRoads = roads.filter(r => r.kind === 'bridge');
    const normalRoadD = normalRoads.map(r => 'M' + r.points.map(p => `${p.x},${p.y}`).join('L')).join(' ');
    const bridgeRoadD = bridgeRoads.map(r => 'M' + r.points.map(p => `${p.x},${p.y}`).join('L')).join(' ');
    const allRoadD = roads.map(r => 'M' + r.points.map(p => `${p.x},${p.y}`).join('L')).join(' ');
    data = { normalRoadD, bridgeRoadD, allRoadD, bridges };
    roadPathCache.set(key, data);
  }
  const { normalRoadD, bridgeRoadD, allRoadD, bridges } = data;
  if (!cachedTownsD) cachedTownsD = MAP.towns.map(t => 'M' + t.outline.map(p => `${p.x},${p.y}`).join('L') + 'Z').join(' ');
  if (!cachedRiverPoints) cachedRiverPoints = points(MAP.river.points);
  const townsD = cachedTownsD;
  const riverPoints = cachedRiverPoints;

  return <G testID="organic-region-terrain">
    <Rect x="0" y="0" width={MAP.width} height={MAP.height} fill={c.grass}/>
    <Path d="M0 1940Q630 1450 1280 2150T1700 3900L0 4500Z" fill={c.treeLight} opacity=".55"/>
    <Path d="M990 0Q1480 50 2140 0Q2010 420 2200 870Q2080 1300 1660 1410Q1120 1420 960 1220Z" fill={c.treeLight}/>
    <Path d="M1230 120Q1500 20 1670 210Q1800 450 1510 480Q1260 430 1230 120Z" fill={c.sky} stroke={c.pavement} strokeWidth="14"/>
    {townsD ? <Path d={townsD} fill={c.pavement} opacity=".27" stroke={c.treeLight} strokeWidth="22" strokeLinejoin="round"/> : null}
    <Polyline testID="ichhamati-river" points={riverPoints} fill="none" stroke={c.pavement} strokeWidth={MAP.river.width+32} strokeLinejoin="round" strokeLinecap="round"/>
    <Polyline points={riverPoints} fill="none" stroke={c.sky} strokeWidth={MAP.river.width} strokeLinejoin="round" strokeLinecap="round"/>
    <Polyline points={riverPoints} fill="none" stroke={c.surface} strokeWidth="3" strokeDasharray="70 190" opacity=".36"/>
    {[750,1850,3480].map(y=><T key={y} x={y===750?3740:y===1850?3850:3790} y={y} fill={c.teal} fontSize="26" letterSpacing="3" textAnchor="middle" transform={`rotate(78 ${y===750?3740:y===1850?3850:3790} ${y})`}>ICHHAMATI RIVER</T>)}
    {/* Bibhutibhushan Dense Forest Floor */}
    <Path d="M5100 1620Q5950 1580 5980 2150T5460 2740Q5080 2400 5100 1620Z" fill={c.teal} opacity=".22"/>
    <T x="5540" y="1780" textAnchor="middle" fontSize="26" letterSpacing="4" fill={c.teal}>BIBHUTIBHUSHAN FOREST</T>
    <StaticRailwayTracks />
    {normalRoadD ? <Path d={normalRoadD} fill="none" stroke={c.pavement} strokeWidth={118} strokeLinejoin="round" strokeLinecap="round"/> : null}
    {bridgeRoadD ? <Path d={bridgeRoadD} fill="none" stroke={c.pavement} strokeWidth={126} strokeLinejoin="round" strokeLinecap="round"/> : null}
    {allRoadD ? <Path d={allRoadD} fill="none" stroke={c.roadEdge} strokeWidth={79} strokeLinejoin="round" strokeLinecap="round"/> : null}
    {allRoadD ? <Path testID="road-network" d={allRoadD} fill="none" stroke={c.road} strokeWidth={74} strokeLinejoin="round" strokeLinecap="round"/> : null}
    {allRoadD ? <Path d={allRoadD} fill="none" stroke={c.butter} strokeWidth="2" strokeDasharray="18 22" strokeLinejoin="round"/> : null}
    {bridges.filter(b => b.kind !== 'railway_bridge').map(b => {
      const isRC = b.id === 'revenuecat-bridge';
      if (isRC) {
        return (
          <G key={b.id} testID={`bridge-${b.id}`}>
            {/* Bridge Rails with Coral/Red Accents */}
            <Line x1={b.start} y1={b.y - 53} x2={b.end} y2={b.y - 53} stroke={c.surface} strokeWidth="6" />
            <Line x1={b.start} y1={b.y + 53} x2={b.end} y2={b.y + 53} stroke={c.surface} strokeWidth="6" />
            <Line x1={b.start} y1={b.y - 58} x2={b.end} y2={b.y - 58} stroke="#E84A5F" strokeWidth="18" strokeDasharray="16 36" />
            <Line x1={b.start} y1={b.y + 58} x2={b.end} y2={b.y + 58} stroke="#E84A5F" strokeWidth="18" strokeDasharray="16 36" />

            {/* West Bridge Entrance Pylon */}
            <Rect x={b.start - 24} y={b.y - 80} width="32" height="160" rx="6" fill={c.onSurface} stroke="#E84A5F" strokeWidth="3" />
            <SvgImage href={RC_LOGO} x={b.start - 20} y={b.y - 68} width="24" height="24" preserveAspectRatio="xMidYMid meet" />

            {/* East Bridge Entrance Pylon */}
            <Rect x={b.end - 8} y={b.y - 80} width="32" height="160" rx="6" fill={c.onSurface} stroke="#E84A5F" strokeWidth="3" />
            <SvgImage href={RC_LOGO} x={b.end - 4} y={b.y - 68} width="24" height="24" preserveAspectRatio="xMidYMid meet" />

            {/* Center Overhead Gantry & Signboard */}
            <Line x1={b.x - 170} y1={b.y - 130} x2={b.x - 170} y2={b.y - 53} stroke={c.onSurface} strokeWidth="8" />
            <Line x1={b.x + 170} y1={b.y - 130} x2={b.x + 170} y2={b.y - 53} stroke={c.onSurface} strokeWidth="8" />
            <Rect x={b.x - 164} y={b.y - 138} width="328" height="52" rx="12" fill={c.shadow} />
            <Rect x={b.x - 168} y={b.y - 142} width="336" height="52" rx="12" fill="#E84A5F" stroke={c.surface} strokeWidth="3" />

            {/* Official RevenueCat Logo */}
            <SvgImage href={RC_LOGO} x={b.x - 156} y={b.y - 136} width="40" height="40" preserveAspectRatio="xMidYMid meet" />

            {/* Gantry Typography */}
            <T x={b.x - 104} y={b.y - 114} fontSize="20" fontWeight="bold" fill={c.surface} letterSpacing="1.2">REVENUECAT BRIDGE</T>
            <T x={b.x - 104} y={b.y - 99} fontSize="10" fontWeight="bold" fill={c.butter} letterSpacing="1.8">ICHHAMATI EXPRESSWAY</T>
          </G>
        );
      }
      return (
        <G key={b.id} testID={`bridge-${b.id}`}>
          <Line x1={b.start} y1={b.y-53} x2={b.end} y2={b.y-53} stroke={c.surface} strokeWidth="5"/>
          <Line x1={b.start} y1={b.y+53} x2={b.end} y2={b.y+53} stroke={c.surface} strokeWidth="5"/>
          <Line x1={b.start} y1={b.y-58} x2={b.end} y2={b.y-58} stroke={c.wood} strokeWidth="18" strokeDasharray="12 44"/>
          <Line x1={b.start} y1={b.y+58} x2={b.end} y2={b.y+58} stroke={c.wood} strokeWidth="18" strokeDasharray="12 44"/>
          <Rect x={b.x-132} y={b.y-113} width="264" height="41" rx="7" fill={c.teal} stroke={c.surface} strokeWidth="2"/>
          <T x={b.x} y={b.y-87} textAnchor="middle" fontSize="21" fontWeight="bold" fill={c.surface}>{b.name}</T>
        </G>
      );
    })}
    {/* Akash Wheels Bike Showroom at Whispering Pines (Frustum Culled) */}
    {(cx === undefined || cy === undefined || (Math.abs(cx - 1580) < 1150 && Math.abs(cy - 880) < 1250)) && (
    <G testID="akash-wheels-showroom">
      {/* Paved Parking & Approach Forecourt connecting to Pine Trail */}
      <Path
        d="M1450 970 L1710 970 Q1760 970 1765 910 L1760 815 L1705 805 L1675 870 L1450 870 Z"
        fill={c.pavement}
        stroke={c.treeLight}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Painted motorcycle parking bays */}
      <Line x1="1695" y1="875" x2="1745" y2="875" stroke={c.surface} strokeWidth="3" strokeDasharray="5 5" opacity={0.8} />
      <Line x1="1695" y1="915" x2="1745" y2="915" stroke={c.surface} strokeWidth="3" strokeDasharray="5 5" opacity={0.8} />
      <Line x1="1695" y1="955" x2="1745" y2="955" stroke={c.surface} strokeWidth="3" strokeDasharray="5 5" opacity={0.8} />

      {/* Building Soft Ground Drop Shadow */}
      <Rect x="1465" y="805" width="246" height="175" rx="18" fill={c.shadow} />

      {/* The Akash Wheels Illustrated Showroom Building Asset */}
      <SvgImage
        href={AKASH_WHEELS_IMG}
        x="1455"
        y="785"
        width="256"
        height="185"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Cozy Hand-painted Wooden Totem / Signboard beside Pine Trail */}
      <G transform="translate(1720, 785)">
        <Line x1="14" y1="0" x2="14" y2="38" stroke={c.wood} strokeWidth="5" strokeLinecap="round" />
        <Rect x="-16" y="-22" width="60" height="26" rx="6" fill={c.butter} stroke={c.wood} strokeWidth="2.5" />
        <T x="14" y="-10" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={c.wood} letterSpacing="0.8">AKASH WHEELS</T>
        <T x="14" y="-2" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={c.teal} letterSpacing="0.5">BIKE SHOWROOM</T>
      </G>
    </G>
    )}

    <T x="1590" y="1150" textAnchor="middle" fontSize="26" letterSpacing="5" fill={c.teal}>WHISPERING PINES</T>

    {/* Whispering Pines Roadside Billboard: VIPER RR (Frustum Culled) */}
    {(cx === undefined || cy === undefined || (Math.abs(cx - 1632) < 1150 && Math.abs(cy - 1050) < 1250)) && (
    <G testID="whispering-pines-viper-billboard">
      {/* Support Pillars */}
      <Line x1="1540" y1="1060" x2="1540" y2="1140" stroke={c.onSurface} strokeWidth="8" />
      <Line x1="1720" y1="1060" x2="1720" y2="1140" stroke={c.onSurface} strokeWidth="8" />
      <Line x1="1536" y1="1100" x2="1724" y2="1100" stroke={c.onSurface} strokeWidth="5" />
      {/* Drop Shadow */}
      <Rect x="1514" y="1004" width="232" height="96" rx="12" fill={c.shadow} />
      {/* Billboard Outer Frame */}
      <Rect x="1510" y="1000" width="240" height="96" rx="12" fill="#0F172A" stroke="#F59E0B" strokeWidth="3.5" />
      {/* Display Screen Canvas */}
      <Rect x="1515" y="1005" width="230" height="86" rx="8" fill="#18181B" />
      {/* Ambient Red Glow Line */}
      <Line x1="1515" y1="1088" x2="1745" y2="1088" stroke="#DC2626" strokeWidth="3" />
      {/* Scaled Viper RR Superbike Graphic */}
      <G transform="translate(1522, 1016) scale(0.68)">
        <Circle cx="33" cy="63" r="16" fill="#334155" stroke="#F59E0B" strokeWidth="2.5" />
        <Circle cx="119" cy="63" r="16" fill="#334155" stroke="#F59E0B" strokeWidth="2.5" />
        <Path d="M33 63 L65 50" fill="none" stroke="#F8FAFC" strokeWidth="3.5" />
        <Path d="M104 19 L119 63" fill="none" stroke="#F59E0B" strokeWidth="4" />
        <Path d="M22 27 Q34 26 44 32 L58 40 Q70 24 95 24 Q106 24 116 16 L128 21 L135 32 L124 42 L112 43 L94 58 L70 58 L54 48 Z" fill="#DC2626" />
        <Path d="M70 55 L92 55 L108 44 L78 44 Z" fill="#000000" />
        <Path d="M108 18 L120 9 L126 18 Z" fill="#FEE2E2" opacity={0.9} stroke="#F8FAFC" strokeWidth="1.5" />
      </G>
      {/* Typography */}
      <T x="1632" y="1032" fontSize="12" fontWeight="bold" fill="#F59E0B" letterSpacing="1.5">VIPER RR · 1000CC</T>
      <T x="1632" y="1052" fontSize="11" fontWeight="bold" fill="#F8FAFC" letterSpacing="0.8">ONLY FOR THE DREAMERS</T>
      <T x="1632" y="1068" fontSize="8" fontWeight="bold" fill="#94A3B8" letterSpacing="0.8">POWER · PRECISION · SOUL</T>
      {/* Spotlights */}
      <Circle cx="1555" cy="998" r="4" fill="#FDE047" />
      <Circle cx="1630" cy="998" r="4" fill="#FDE047" />
      <Circle cx="1705" cy="998" r="4" fill="#FDE047" />
    </G>
    )}

    {/* Bibhutibhushan Dense Forest Corridor Billboard: FOREST HIGHWAY SPONSOR (Frustum Culled) */}
    {(cx === undefined || cy === undefined || (Math.abs(cx - 5740) < 1150 && Math.abs(cy - 2200) < 1250)) && (
    <G testID="forest-highway-sponsor-billboard">
      {/* Heavy Cedar Timber Pillars & Braces */}
      <Line x1="5650" y1="2180" x2="5650" y2="2280" stroke={c.wood} strokeWidth="9" />
      <Line x1="5830" y1="2180" x2="5830" y2="2280" stroke={c.wood} strokeWidth="9" />
      <Line x1="5646" y1="2240" x2="5834" y2="2240" stroke={c.onSurface} strokeWidth="5" />
      {/* Drop Shadow */}
      <Rect x="5624" y="2144" width="232" height="96" rx="12" fill={c.shadow} />
      {/* Outer Frame with Forest Emerald Accent */}
      <Rect x="5620" y="2140" width="240" height="96" rx="12" fill="#0F172A" stroke="#10B981" strokeWidth="3.5" />
      {/* Deep Forest Canvas */}
      <Rect x="5625" y="2145" width="230" height="86" rx="8" fill="#064E3B" />
      {/* Amber LED Edge Line */}
      <Line x1="5625" y1="2228" x2="5855" y2="2228" stroke="#F59E0B" strokeWidth="3" />
      {/* Graphic Art: Highway Through Forest Sanctuary */}
      <G transform="translate(5632, 746)">
        <Circle cx="28" cy="1430" r="18" fill="#047857" stroke="#10B981" strokeWidth="1.5" />
        <Path d="M18 1445 L28 1416 L38 1445 Z" fill="#34D399" />
        <Path d="M28 1416 L38 1445 L48 1445 Z" fill="#059669" />
        <Path d="M12 1446 Q28 1438 44 1446" fill="none" stroke="#FDE047" strokeWidth="2.5" strokeDasharray="4 3" />
      </G>
      {/* Typography */}
      <T x="5742" y="2170" fontSize="11" fontWeight="bold" fill="#FDE047" letterSpacing="1.2">★ FOREST HIGHWAY SPONSOR ★</T>
      <T x="5742" y="2190" fontSize="10.5" fontWeight="bold" fill="#ECFDF5" letterSpacing="0.8">PRESERVE THE GREENS</T>
      <T x="5742" y="2206" fontSize="8" fontWeight="bold" fill="#6EE7B7" letterSpacing="0.6">ENJOY THE SCENIC RIDE · CHILL DASH</T>
      {/* Spotlights */}
      <Circle cx="5665" cy="2138" r="4" fill="#FDE047" />
      <Circle cx="5740" cy="2138" r="4" fill="#FDE047" />
      <Circle cx="5815" cy="2138" r="4" fill="#FDE047" />
    </G>
    )}
  </G>;
}, (prev, next) => prev.chunkX === next.chunkX && prev.chunkY === next.chunkY);

let scenery:Point[]=[];
let treeGrid=new Map<string, Point[]>();
export function prebakeWorldScenery(): void {
  getTrees();
}
function getTrees() {
  if(scenery.length)return scenery;
  let seed=913;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<880;i++) {
    // Generate regional scenery with high density of forest trees flanking Jessore Highway
    let p: Point;
    if (i < 240) {
      p = { x: 5200 + random() * 720, y: 1650 + random() * 1050 };
    } else if (i < 420) {
      p = { x: 1020 + random() * 1140, y: random() * 1400 };
    } else {
      p = { x: 65 + random() * (MAP.width - 130), y: 65 + random() * (MAP.height - 130) };
    }
    if(nearestRoad(p).distance<75||riverDistance(p)<MAP.river.width/2+45)continue;
    if(p.x>1200&&p.x<1710&&p.y>80&&p.y<470)continue;
    if(MAP.blocks.some(b=>p.x>b.x-20&&p.x<b.x+b.width+20&&p.y>b.y-20&&p.y<b.y+b.height+20))continue;
    if(MAP.landmarks.some(b=>p.x>b.x-40&&p.x<b.x+b.width+40&&p.y>b.y-50&&p.y<b.y+b.height+50))continue;
    // Clear sightlines for roadside forest sponsor billboards and Akash Wheels showroom
    if(p.x>5600&&p.x<5860&&p.y>2120&&p.y<2290)continue;
    if(p.x>1730&&p.x<1990&&p.y>710&&p.y<880)continue;
    if(p.x>1440&&p.x<1770&&p.y>760&&p.y<1000)continue;
    scenery.push(p);

    const gx=Math.floor(p.x/500), gy=Math.floor(p.y/500);
    const k=`${gx},${gy}`;
    let cell=treeGrid.get(k);
    if(!cell){cell=[];treeGrid.set(k,cell);}
    cell.push(p);
  }
  return scenery;
}
const BUILDING_NAMES: Record<string, string> = {
  // Sunnyvale
  'sunnyvale-0-0': 'SUNNYVALE MARKET',
  'sunnyvale-0-1': 'SLICE OF HEAVEN',
  'sunnyvale-0-2': 'SEASIDE OFFICES',
  'sunnyvale-1-0': 'SUNNY SIDE CAFÉ',
  'sunnyvale-1-1': 'MAPLE APARTMENTS',
  'sunnyvale-1-2': 'CORNER NOODLES',
  'sunnyvale-2-0': 'YOUR GARAGE',
  'sunnyvale-2-1': 'BLOOM & GO',
  'sunnyvale-2-2': 'MILO’S WORKSHOP',
  'sunnyvale-3-0': 'PALM HOUSE',
  'sunnyvale-3-1': 'SUNSHINE PARK',
  'sunnyvale-3-2': 'SUNSHINE FUEL & AIR',

  // Pinecrest
  'pinecrest-0-0': 'PINE & PASTRY',
  'pinecrest-0-1': 'CEDAR HOMES',
  'pinecrest-0-2': 'PINE CREST RESIDENCE',
  'pinecrest-1-0': 'PINECREST FUEL & AIR',
  'pinecrest-1-1': 'CEDAR KITCHEN',
  'pinecrest-1-2': 'PINE GROVE APTS',
  'pinecrest-2-0': 'CEDAR MEADOWS',
  'pinecrest-2-1': 'THE SPOKE HOUSE',
  'pinecrest-2-2': 'WILLOW COTTAGE',
  'pinecrest-3-0': 'CEDAR TERRACE',
  'pinecrest-3-1': 'EVERGREEN LODGE',
  'pinecrest-3-2': 'PINECREST COMMONS',

  // Bongaon
  'bongaon-0-0': 'ICHHAMATI CAFÉ',
  'bongaon-0-1': 'BONGAON PLAZA TOWERS',
  'bongaon-0-2': 'SHIMULTALA HEIGHTS',
  'bongaon-0-3': 'JESSORE HORIZON',
  'bongaon-0-4': 'RIVERBANK MOTORS',
  'bongaon-0-5': 'RIVERFRONT APTS',
  'bongaon-1-1': 'STATION VIEW ENCLAVE',
  'bongaon-1-4': 'ICHHAMATI RESIDENCY',
  'bongaon-1-5': 'BONGAON HEIGHTS',
  'bongaon-2-1': 'BONGAON FUEL & AIR',
  'bongaon-2-4': 'RIVERSIDE TOWERS',
  'bongaon-2-5': 'EAST VIEW ENCLAVE',
  'bongaon-3-0': 'STATION ROAD PLAZA',
  'bongaon-3-1': 'BONGAON COURT APTS',
  'bongaon-3-2': 'SOUTH HORIZON',
  'bongaon-3-3': 'GREEN VALLEY RESIDENCY',
  'bongaon-3-4': 'PINE PARK APTS',
  'bongaon-3-5': 'BONGAON RESIDENCY',

  // Habra
  'habra-0-0': 'RAILTOWN CYCLE WORKS',
  'habra-0-1': 'BANAMALIPUR VILLAS',
  'habra-0-2': 'ABHIRUP RESIDENCY',
  'habra-0-3': 'HABRA GREEN TERRACE',
  'habra-0-4': 'JESSORE ROAD ENCLAVE',
  'habra-1-0': 'STATION ROAD HOMES',
  'habra-1-2': 'HABRA ARCADE',
  'habra-1-3': 'HABRA RESIDENCY',
  'habra-1-4': 'NORTH COLONY',
  'habra-2-0': 'RAILWAY PLAZA',
  'habra-2-1': 'CENTRAL AVENUE',
  'habra-2-2': 'HABRA CRESCENT',
  'habra-2-3': 'SOUTH ROAD ENCLAVE',
  'habra-2-4': 'HABRA MEADOWS',
  'habra-3-0': 'PALLISREE HOMES',
  'habra-3-1': 'GARDEN ENCLAVE',
  'habra-3-2': 'HABRA FUEL & AIR',
  'habra-3-3': 'HABRA TOWN COLONY',
  'habra-3-4': 'COLONY SOUTH',
  'habra-4-0': 'STATION APPROACH',
  'habra-4-1': 'HABRA COURT ROAD',
  'habra-4-2': 'MARKET CRESCENT',
  'habra-4-3': 'TOWN BORDER HOMES',
  'habra-4-4': 'HABRA SOUTH APTS',

  // Petrapole
  'petrapole-0-0': 'BORDER GATE ENCLAVE',
  'petrapole-0-2': 'FAIRGROUND SNACKS',
  'petrapole-0-3': 'PETRAPOLE HOMES',
  'petrapole-1-0': 'SENTRY VIEW VILLAS',
  'petrapole-3-1': 'FAIRGROUND BIKE CARE',
  'petrapole-3-2': 'BORDER COLONY',
  'petrapole-3-3': 'PETRAPOLE FUEL & AIR'
};

export const RegionScenery=memo(function RegionScenery({chunkX,chunkY}:{chunkX:number;chunkY:number}) {
  const {colors:c}=useTheme();
  const cx=chunkX*500,cy=chunkY*500,near=(x:number,y:number,margin=0)=>Math.abs(x-cx)<700+margin&&Math.abs(y-cy)<800+margin;
  getTrees();
  const nearbyTrees:Point[]=[];
  for(let dx=-1;dx<=1;dx++){
    for(let dy=-1;dy<=1;dy++){
      const cell=treeGrid.get(`${chunkX+dx},${chunkY+dy}`);
      if(cell){
        for(let i=0;i<cell.length;i++){
          if(near(cell[i].x,cell[i].y))nearbyTrees.push(cell[i]);
        }
      }
    }
  }
  const normalTrees = nearbyTrees.filter(p => !(p.x > 1000 && p.x < 2150));
  const pineTrees = nearbyTrees.filter(p => p.x > 1000 && p.x < 2150);
  const shadowPath = nearbyTrees.map(p => `M${p.x - 12} ${p.y + 12}a19 12 0 1 0 38 0a19 12 0 1 0 -38 0`).join(' ');
  const trunkPath = nearbyTrees.map(p => `M${p.x - 3} ${p.y + 2}h6v21h-6z`).join(' ');
  const normalCanopy = normalTrees.map(p => `M${p.x - 20} ${p.y}a20 20 0 1 0 40 0a20 20 0 1 0 -40 0`).join(' ');
  const normalHighlight = normalTrees.map(p => `M${p.x - 19} ${p.y - 7}a14 14 0 1 0 28 0a14 14 0 1 0 -28 0`).join(' ');
  const pineCanopy = pineTrees.map(p => `M${p.x} ${p.y - 28}l-23 39h46z M${p.x} ${p.y - 44}l-17 34h34z`).join(' ');
  const pineInner = pineTrees.map(p => `M${p.x} ${p.y - 36}l-10 20h10z`).join(' ');

  const blocks = MAP.blocks.filter(b=>near(b.x,b.y,Math.max(b.width,b.height)));
  const blockTreesD = blocks.map(b => {
    const x = b.x + (b.town === 'sunnyvale' ? 0 : (b.index % 3) * 4);
    const y = b.y;
    const w = Math.min(b.town === 'sunnyvale' ? 148 : 174, b.width);
    const h = Math.min(130, b.height);
    let s = `M${x - 3} ${y + h - 5}a14 14 0 1 0 28 0a14 14 0 1 0 -28 0`;
    if (b.width > 200) s += ` M${x + w + 49} ${y + 45}a14 14 0 1 0 28 0a14 14 0 1 0 -28 0`;
    return s;
  }).join(' ');

  const blockShadowsD = blocks.map(b => {
    if (b.town === 'sunnyvale' && b.index === 10) return '';
    const x = b.x + (b.town === 'sunnyvale' ? 0 : (b.index % 3) * 4) + 10;
    const y = b.y + 14;
    const w = Math.min(b.town === 'sunnyvale' ? 148 : 174, b.width);
    const h = Math.min(130, b.height);
    return `M${x + 7} ${y}h${w - 14}a7 7 0 0 1 7 7v${h - 14}a7 7 0 0 1 -7 7h-${w - 14}a7 7 0 0 1 -7 -7v-${h - 14}a7 7 0 0 1 7 -7z`;
  }).filter(Boolean).join(' ');
  const rRect = (x: number, y: number, w: number, h: number, r = 0) =>
    r <= 0
      ? `M${x} ${y}h${w}v${h}h-${w}z`
      : `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;

  const basePaths = ['', '', '', '', ''];
  const shopTopUrban = ['', '', '', '', ''];
  let shopTopCoral = '';
  let shopInner = '';
  const roofs = ['', ''];
  let roofSpines = '';
  let doorsWood = '';
  let doorsRoadEdge = '';
  let windows = '';
  let sidewalkDashes = '';

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi], i = b.index, urban = b.town === 'sunnyvale', shop = urban || i % 4 === 0;
    if (urban && i === 10) continue;
    const x = b.x + (urban ? 0 : (i % 3) * 4), y = b.y;
    const w = Math.min(urban ? 148 : 174, b.width), h = Math.min(130, b.height);
    basePaths[i % 5] += ' ' + rRect(x, y + 18, w, h - 18, 5);

    if (shop) {
      if (urban) shopTopUrban[i % 5] += ' ' + rRect(x - 3, y - 3, w + 6, h - 38, 8);
      else shopTopCoral += ' ' + rRect(x - 3, y - 3, w + 6, h - 38, 8);
      shopInner += ' ' + rRect(x + 10, y + 9, w - 20, h - 61, 3);
    } else {
      roofs[i % 2] += ` M${x - 9} ${y + 61}L${x + w / 2} ${y - 17}L${x + w + 9} ${y + 61}Z`;
      roofSpines += ` M${x + w / 2} ${y - 17}V${y + 61}`;
      sidewalkDashes += ` M${x - 8} ${y + h + 38}h${w + 16}`;
    }

    if (urban && i === 6) doorsRoadEdge += ' ' + rRect(x + w / 2 - 15, y + h - 36, 30, 36);
    else doorsWood += ' ' + rRect(x + w / 2 - 15, y + h - 36, 30, 36);

    windows += ` ${rRect(x + 12, y + h - 36, 26, 23, 2)} ${rRect(x + w - 38, y + h - 36, 26, 23, 2)}`;
  }

  const paintColors = [c.peach, c.mint, c.lavender, c.butter, c.sky];

  return <G testID="town-buildings">
    {shadowPath ? <Path d={shadowPath} fill={c.shadow} /> : null}
    {trunkPath ? <Path d={trunkPath} fill={c.wood} /> : null}
    {normalCanopy ? <Path d={normalCanopy} fill={c.tree} /> : null}
    {normalHighlight ? <Path d={normalHighlight} fill={c.treeLight} /> : null}
    {pineCanopy ? <Path d={pineCanopy} fill={c.teal} /> : null}
    {pineInner ? <Path d={pineInner} fill={c.tree} /> : null}
    {blockShadowsD ? <Path d={blockShadowsD} fill={c.shadow} /> : null}
    {blockTreesD ? <Path d={blockTreesD} fill={c.tree} /> : null}

    {/* Batched Building Bodies */}
    {basePaths.map((d, pi) => d ? <Path key={pi} d={d} fill={paintColors[pi]} stroke={c.wood} strokeWidth="1.4" /> : null)}
    {shopTopUrban.map((d, pi) => d ? <Path key={pi} d={d} fill={paintColors[pi]} stroke={c.wood} strokeWidth="1.5" /> : null)}
    {shopTopCoral ? <Path d={shopTopCoral} fill={c.coral} stroke={c.wood} strokeWidth="1.5" /> : null}
    {shopInner ? <Path d={shopInner} fill={c.pavement} opacity=".5" /> : null}
    {roofs[0] ? <Path d={roofs[0]} fill={c.teal} stroke={c.wood} strokeWidth="2" /> : null}
    {roofs[1] ? <Path d={roofs[1]} fill={c.coral} stroke={c.wood} strokeWidth="2" /> : null}
    {roofSpines ? <Path d={roofSpines} stroke={c.shadow} strokeWidth="4" /> : null}
    {doorsWood ? <Path d={doorsWood} fill={c.wood} /> : null}
    {doorsRoadEdge ? <Path d={doorsRoadEdge} fill={c.roadEdge} /> : null}
    {windows ? <Path d={windows} fill={c.sky} stroke={c.surface} strokeWidth="2" /> : null}
    {sidewalkDashes ? <Path d={sidewalkDashes} stroke={c.surface} strokeWidth="5" strokeDasharray="10 4" /> : null}

    {/* Per-building individual features & labels */}
    {blocks.map(b=>{
      const i=b.index, urban=b.town==='sunnyvale', shop=urban||i%4===0;
      const name = BUILDING_NAMES[b.id] || (b.town.toUpperCase() + ' BLDG');
      const x=b.x+(urban?0:(i%3)*4), y=b.y, w=Math.min(urban?148:174,b.width), h=Math.min(130,b.height);
      if(urban&&i===10)return <G key={b.id}><Rect x={x-8} y={y-8} width={w+16} height={h+22} rx="45" fill={c.treeLight}/><Circle cx={x+w/2} cy={y+h/2} r="28" fill={c.sky} stroke={c.pavement} strokeWidth="10"/><Circle cx={x+6} cy={y+10} r="14" fill={c.tree}/><Circle cx={x+w-8} cy={y+h-5} r="14" fill={c.tree}/><T x={x+w/2} y={y+h+29} textAnchor="middle" fontSize="9" fill={c.teal}>SUNSHINE PARK</T></G>;

      // Bongaon Multistory Modern Apartment Styling
      if (b.town === 'bongaon' && i > 0) {
        return <G key={b.id} testID={`apartment-${b.id}`}>
          <Rect x={x} y={y - 8} width={w} height={h + 8} rx="4" fill={paintColors[i % paintColors.length]} stroke={c.wood} strokeWidth="1.6" />
          {[0, 1].map(fl => (
            <G key={fl}>
              <Rect x={x + 10} y={y + 16 + fl * 36} width={w - 20} height="5" fill={c.surface} stroke={c.onSurface} strokeWidth="1" />
              <Line x1={x + 12} y1={y + 11 + fl * 36} x2={x + w - 12} y2={y + 11 + fl * 36} stroke={c.wood} strokeWidth="1.5" strokeDasharray="4 4" />
              <Rect x={x + 14} y={y + fl * 36 + 2} width="20" height="11" rx="2" fill={c.sky} stroke={c.surface} strokeWidth="1" />
              <Rect x={x + w - 34} y={y + fl * 36 + 2} width="20" height="11" rx="2" fill={c.sky} stroke={c.surface} strokeWidth="1" />
            </G>
          ))}
          <Rect x={x + 18} y={y - 18} width="26" height="10" rx="2" fill={c.teal} stroke={c.wood} strokeWidth="1" />
          <Line x1={x + w - 24} y1={y - 8} x2={x + w - 24} y2={y - 22} stroke={c.onSurface} strokeWidth="2" />
          <Rect x={x + w / 2 - 20} y={y + h - 18} width="40" height="18" rx="2" fill={c.coral} />
          <T x={x + w / 2} y={y + h + 22} textAnchor="middle" fontSize="9" fill={c.onSurface} fontWeight="bold">{name}</T>
        </G>;
      }

      // Habra Residential Houses & General Styling
      return <G key={b.id} testID={`building-${b.id}`}>
        {urban&&i===6?<><Rect x={x+17} y={y+33} width={w-34} height="30" rx="4" fill={c.brand}/><T x={x+w/2} y={y+53} textAnchor="middle" fontSize="13" fontWeight="bold" fill={c.onSurface}>CHILL DASH</T></>:shop&&i%3===1?<AdScreen x={x+9} y={y+23} w={w-18} h={48} id={b.id} variant={i%2}/>:shop?<Rect x={x+20} y={y+20} width="34" height="22" rx="3" fill={c.surface} stroke={c.wood}/>:null}
        {b.town === 'habra' && (
          <Rect x={x + w - 26} y={y - 14} width="12" height="20" fill={c.coral} stroke={c.wood} strokeWidth="1" />
        )}
        <T x={x+w/2} y={y+h+20} textAnchor="middle" fontSize="9" fill={c.onSurface} fontWeight="bold">{name}</T>
      </G>;
    })}
    {MAP.landmarks.filter(l=>l.kind!=='park'&&near(l.x,l.y,Math.max(l.width,l.height))).map(l=><LandmarkArt key={l.id} landmark={l} cx={cx} cy={cy}/>)}
  </G>;
}, (prev, next) => prev.chunkX === next.chunkX && prev.chunkY === next.chunkY);