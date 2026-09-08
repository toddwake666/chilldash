import React, { memo } from 'react';
import { Circle, Ellipse, G, Line, Path, Polyline, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import { MAP, nearestRoad, riverDistance } from '@/src/game/region';
import type { Point } from '@/src/game/api';
import { AdScreen, LandmarkArt } from './LandmarkArt';

export const points=(ps:Point[])=>ps.map(p=>`${p.x},${p.y}`).join(' ');
export function Tree({x,y,pine=false}:{x:number;y:number;pine?:boolean}) {
  const {colors:c}=useTheme();
  return <G><Ellipse cx={x+7} cy={y+12} rx="19" ry="12" fill={c.shadow}/><Rect x={x-3} y={y+2} width="6" height="21" fill={c.wood}/>{pine?<><Path d={`M${x} ${y-28}l-23 39h46z M${x} ${y-44}l-17 34h34z`} fill={c.teal}/><Path d={`M${x} ${y-36}l-10 20h10z`} fill={c.tree}/></>:<><Circle cx={x} cy={y} r="20" fill={c.tree}/><Circle cx={x-5} cy={y-7} r="14" fill={c.treeLight}/></>}</G>;
}
export const RegionGround=memo(function RegionGround() {
  const {colors:c}=useTheme();
  return <G testID="organic-region-terrain">
    <Rect x="0" y="0" width={MAP.width} height={MAP.height} fill={c.grass}/>
    <Path d="M0 1940Q630 1450 1280 2150T1700 3900L0 4500Z" fill={c.treeLight} opacity=".55"/>
    <Path d="M990 0Q1480 50 2140 0Q2010 420 2200 870Q2080 1300 1660 1410Q1120 1420 960 1220Z" fill={c.treeLight}/>
    <Path d="M1230 120Q1500 20 1670 210Q1800 450 1510 480Q1260 430 1230 120Z" fill={c.sky} stroke={c.pavement} strokeWidth="14"/>
    {MAP.towns.map(t=><Polyline key={t.id} points={points(t.outline)} fill={c.pavement} opacity=".27" stroke={c.treeLight} strokeWidth="22" strokeLinejoin="round"/>)}
    <Polyline testID="ichhamati-river" points={points(MAP.river.points)} fill="none" stroke={c.pavement} strokeWidth={MAP.river.width+32} strokeLinejoin="round" strokeLinecap="round"/>
    <Polyline points={points(MAP.river.points)} fill="none" stroke={c.sky} strokeWidth={MAP.river.width} strokeLinejoin="round" strokeLinecap="round"/>
    <Polyline points={points(MAP.river.points)} fill="none" stroke={c.surface} strokeWidth="3" strokeDasharray="70 190" opacity=".36"/>
    {[750,1850,3480].map(y=><T key={y} x={y===750?3740:y===1850?3850:3790} y={y} fill={c.teal} fontSize="26" letterSpacing="3" textAnchor="middle" transform={`rotate(78 ${y===750?3740:y===1850?3850:3790} ${y})`}>ICHHAMATI RIVER</T>)}
    {MAP.roads.map(r=><Polyline key={`sidewalk-${r.id}`} points={points(r.points)} fill="none" stroke={c.pavement} strokeWidth={r.kind==='bridge'?126:118} strokeLinejoin="round" strokeLinecap="round"/>)}
    {MAP.roads.map(r=><Polyline key={`edge-${r.id}`} points={points(r.points)} fill="none" stroke={c.roadEdge} strokeWidth="79" strokeLinejoin="round" strokeLinecap="round"/>)}
    {MAP.roads.map(r=><Polyline testID={`road-${r.id}`} key={r.id} points={points(r.points)} fill="none" stroke={c.road} strokeWidth="74" strokeLinejoin="round" strokeLinecap="round"/>)}
    {MAP.roads.map(r=><Polyline key={`lane-${r.id}`} points={points(r.points)} fill="none" stroke={c.butter} strokeWidth="2" strokeDasharray="18 22" strokeLinejoin="round"/>)}
    {MAP.bridges.map(b=><G key={b.id} testID={`bridge-${b.id}`}><Line x1={b.start} y1={b.y-53} x2={b.end} y2={b.y-53} stroke={c.surface} strokeWidth="5"/><Line x1={b.start} y1={b.y+53} x2={b.end} y2={b.y+53} stroke={c.surface} strokeWidth="5"/>{Array.from({length:Math.ceil((b.end-b.start)/56)},(_,i)=><G key={i}><Rect x={b.start+i*56} y={b.y-67} width="12" height="18" rx="3" fill={c.wood}/><Rect x={b.start+i*56} y={b.y+49} width="12" height="18" rx="3" fill={c.wood}/></G>)}<Rect x={b.x-132} y={b.y-113} width="264" height="41" rx="7" fill={c.teal} stroke={c.surface} strokeWidth="2"/><T x={b.x} y={b.y-87} textAnchor="middle" fontSize="21" fontWeight="bold" fill={c.surface}>{b.name}</T></G>)}
    <T x="1590" y="1010" textAnchor="middle" fontSize="26" letterSpacing="5" fill={c.teal}>WHISPERING PINES</T>
  </G>;
});

let scenery:Point[]=[];
function getTrees() {
  if(scenery.length)return scenery;
  let seed=913;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<790;i++) {
    const p=i<190?{x:1020+random()*1140,y:random()*1400}:{x:65+random()*(MAP.width-130),y:65+random()*(MAP.height-130)};
    if(nearestRoad(p).distance<90||riverDistance(p)<MAP.river.width/2+45)continue;
    if(p.x>1200&&p.x<1710&&p.y>80&&p.y<470)continue;
    if(MAP.blocks.some(b=>p.x>b.x-20&&p.x<b.x+b.width+20&&p.y>b.y-20&&p.y<b.y+b.height+20))continue;
    if(MAP.landmarks.some(b=>p.x>b.x-40&&p.x<b.x+b.width+40&&p.y>b.y-50&&p.y<b.y+b.height+50))continue;
    scenery.push(p);
  }
  return scenery;
}
export const RegionScenery=memo(function RegionScenery({chunkX,chunkY}:{chunkX:number;chunkY:number}) {
  const {colors:c}=useTheme();
  const cx=chunkX*500,cy=chunkY*500,near=(x:number,y:number,margin=0)=>Math.abs(x-cx)<1050+margin&&Math.abs(y-cy)<1150+margin;
  const sunny=['CORNER STORE','SLICE OF HEAVEN','SUNSET STUDIOS','SUNNY SIDE CAFÉ','MAPLE APARTMENTS','CORNER NOODLES','YOUR GARAGE','BLOOM & GO','MILO’S WORKSHOP','PALM HOUSE','SUNSHINE PARK','FUEL & AIR'];
  const pine=['PINE & PASTRY','CEDAR HOMES','GARDEN COTTAGE','FUEL & AIR','CEDAR KITCHEN','WILLOW COTTAGE','CEDAR TERRACE','PINE HOMES','THE SPOKE HOUSE'];
  return <G testID="town-buildings">
    {getTrees().filter(p=>near(p.x,p.y)).map((p,i)=><Tree key={i} {...p} pine={p.x>1000&&p.x<2150}/>)}
    {MAP.blocks.filter(b=>near(b.x,b.y,Math.max(b.width,b.height))).map(b=>{
      const i=b.index, urban=b.town==='sunnyvale',shop=urban||i%4===0;
      const name=urban?sunny[i]:b.town==='pinecrest'?pine[i%pine.length]:b.town==='bongaon'?(i===0?'ICHHAMATI CAFÉ':['RIVERBANK HOUSE','BONGAON HOMES','GARDEN TERRACE'][i%3]):b.town==='habra'?['HABRA HOMES','STATION STORES','GARDEN HOMES'][i%3]:['PETRAPOLE HOMES','PARKSIDE CAFÉ','GARDEN COTTAGE'][i%3];
      const x=b.x+(urban?0:(i%3)*4),y=b.y, w=Math.min(urban?148:174,b.width),h=Math.min(130,b.height),paint=[c.peach,c.mint,c.lavender,c.butter,c.sky][i%5];
      if(urban&&i===10)return <G key={b.id}><Rect x={x-8} y={y-8} width={w+16} height={h+22} rx="45" fill={c.treeLight}/><Circle cx={x+w/2} cy={y+h/2} r="28" fill={c.sky} stroke={c.pavement} strokeWidth="10"/><Tree x={x+6} y={y+10}/><Tree x={x+w-8} y={y+h-5}/><T x={x+w/2} y={y+h+29} textAnchor="middle" fontSize="9" fill={c.teal}>SUNSHINE PARK</T></G>;
      return <G key={b.id} testID={`building-${b.id}`}><Rect x={x+10} y={y+14} width={w} height={h} rx="7" fill={c.shadow}/><Rect x={x} y={y+18} width={w} height={h-18} rx="5" fill={paint} stroke={c.wood} strokeWidth="1.4"/>
        {shop?<><Rect x={x-3} y={y-3} width={w+6} height={h-38} rx="8" fill={urban?paint:c.coral} stroke={c.wood} strokeWidth="1.5"/><Rect x={x+10} y={y+9} width={w-20} height={h-61} rx="3" fill={urban?c.pavement:paint} opacity=".5"/>{urban&&i===6?<><Rect x={x+17} y={y+33} width={w-34} height="30" rx="4" fill={c.brand}/><T x={x+w/2} y={y+53} textAnchor="middle" fontSize="13" fontWeight="bold" fill={c.onSurface}>CHILL DASH</T></>:i%3===1?<AdScreen x={x+9} y={y+23} w={w-18} h={48} id={b.id} variant={i%2}/>:<Rect x={x+20} y={y+20} width="34" height="22" rx="3" fill={c.surface} stroke={c.wood}/>}</>:<><Path d={`M${x-9} ${y+61}L${x+w/2} ${y-17}L${x+w+9} ${y+61}Z`} fill={i%2?c.teal:c.coral} stroke={c.wood} strokeWidth="2"/><Path d={`M${x+w/2} ${y-17}V${y+61}`} stroke={c.shadow} strokeWidth="4"/></>}
        <Rect x={x+w/2-15} y={y+h-36} width="30" height="36" fill={urban&&i===6?c.roadEdge:c.wood}/>{[12,w-38].map(a=><G key={a}><Rect x={x+a} y={y+h-36} width="26" height="23" fill={c.sky} stroke={c.surface} strokeWidth="2"/><Line x1={x+a+13} y1={y+h-35} x2={x+a+13} y2={y+h-13} stroke={c.surface} strokeWidth="2"/></G>)}
        <T x={x+w/2} y={y+h+20} textAnchor="middle" fontSize="9" fill={c.onSurface} fontWeight="bold">{name}</T><Tree x={x-17} y={y+h-5}/>
        {b.width>200&&<Tree x={x+w+35} y={y+45}/>}{!shop&&<Path d={`M${x-8} ${y+h+38}h${w+16}`} stroke={c.surface} strokeWidth="5" strokeDasharray="10 4"/>}
      </G>;
    })}
    {MAP.landmarks.filter(l=>l.kind!=='park'&&near(l.x,l.y,Math.max(l.width,l.height))).map(l=><LandmarkArt key={l.id} landmark={l}/>)}
  </G>;
});