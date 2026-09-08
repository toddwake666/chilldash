import React from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as T } from 'react-native-svg';
import { useTheme } from '@/src/theme';
import type { Landmark } from '@/src/game/region';

export function AdScreen({ x,y,w,h,id,variant=0 }: {x:number;y:number;w:number;h:number;id:string;variant?:number}) {
  const {colors:c}=useTheme();
  return <G testID={`ad-${id}`}><Rect x={x+5} y={y+7} width={w} height={h} rx="7" fill={c.shadow}/><Rect x={x} y={y} width={w} height={h} rx="7" fill={variant?c.teal:c.onSurface} stroke={c.brand} strokeWidth="3"/>
    <Path d={`M${x+8} ${y+h-8}L${x+w*.3} ${y+8}L${x+w*.53} ${y+h-8}Z`} fill={variant?c.sky:c.coral} opacity=".55"/><Circle cx={x+w*.84} cy={y+h*.3} r={h*.23} fill={c.brand} opacity=".55"/>
    <T x={x+w/2} y={y+h*.43} fontSize={Math.min(w/12,18)} textAnchor="middle" fill={c.butter} letterSpacing="2">{variant?'YOUR NEXT BIG THING':'THE SPOTLIGHT IS YOURS'}</T>
    <T x={x+w/2} y={y+h*.72} fontSize={Math.min(w/10,26)} textAnchor="middle" fill={c.surfaceSecondary} fontWeight="bold">PLACE FOR ADS</T>
    {Array.from({length:Math.floor(w/24)},(_,i)=><Circle key={i} cx={x+12+i*24} cy={y+h-3} r="2" fill={c.brand}/>)}
  </G>;
}
export function LandmarkArt({landmark:l, elapsed=0}:{landmark:Landmark;elapsed?:number}) {
  const {colors:c}=useTheme(); const {x,y,width:w,height:h}=l;
  return <G testID={`landmark-${l.id}`}>
    <Rect x={x-15} y={y-17} width={w+30} height={h+42} rx="28" fill={c.pavement}/>
    {l.kind==='cinema'?<>
      <Rect x={x+14} y={y+16} width={w} height={h} rx="24" fill={c.shadow}/><Rect x={x} y={y} width={w} height={h} rx="22" fill={c.coral} stroke={c.onSurface} strokeWidth="3"/>
      <Rect x={x+20} y={y+20} width={w-40} height={h-140} rx="13" fill={c.wood}/><AdScreen x={x+70} y={y+50} w={w-140} h={165} id="cinema-rooftop"/>
      <Rect x={x-14} y={y+h-148} width={w+28} height="72" rx="10" fill={c.brand} stroke={c.onSurface} strokeWidth="3"/>
      <T x={x+w/2} y={y+h-104} textAnchor="middle" fontSize="31" fill={c.onSurface} fontWeight="bold" letterSpacing="3">SUNNYVALE PICTUREHOUSE</T>
      {[0,1,2,3,4,5].map(i=><G key={i}><Rect x={x+25+i*108} y={y+h-68} width="85" height="56" rx="4" fill={c.teal} stroke={c.butter} strokeWidth="3"/><Line x1={x+67+i*108} y1={y+h-65} x2={x+67+i*108} y2={y+h-12} stroke={c.butter} strokeWidth="2"/></G>)}
      <AdScreen x={x+20} y={y+30} w={95} h={170} id="cinema-poster" variant={1}/>
      <Path d={`M${x+w*.48} ${y-28}l-55 -70h110z`} fill={c.brand} opacity=".15"/>
    </>:l.kind==='mall'?<>
      <Rect x={x+12} y={y+18} width={w} height={h} rx="26" fill={c.shadow}/><Rect x={x} y={y} width={w} height={h} rx="24" fill={c.mint} stroke={c.teal} strokeWidth="3"/>
      <Rect x={x+22} y={y+25} width={w-44} height={h-180} rx="16" fill={c.sky} stroke={c.surface} strokeWidth="5"/>
      {Array.from({length:9},(_,i)=><Line key={i} x1={x+40+i*76} y1={y+25} x2={x+40+i*76} y2={y+h-155} stroke={c.surface} strokeWidth="4"/>)}
      <AdScreen x={x+80} y={y+80} w={w-160} h={155} id="diamond-plaza-led" variant={1}/>
      <Rect x={x-13} y={y+h-165} width={w+26} height="70" rx="12" fill={c.teal}/><T x={x+w/2} y={y+h-119} fontSize="42" textAnchor="middle" fill={c.surface} fontWeight="bold" letterSpacing="5">DIAMOND PLAZA</T>
      <Path d={`M${x+w/2-21} ${y+h-85}l21 -17 21 17-21 30z`} fill={c.brand}/><Circle cx={x+w/2} cy={y+h-15} r="31" fill={c.sky} stroke={c.surface} strokeWidth="5"/>
      <AdScreen x={x+15} y={y+h-87} w={230} h={65} id="diamond-plaza-ribbon"/><AdScreen x={x+w-245} y={y+h-87} w={230} h={65} id="diamond-plaza-corner"/>
    </>:l.kind==='stadium'?<>
      <Rect x={x} y={y} width={w} height={h} rx="135" fill={c.coral} stroke={c.onSurface} strokeWidth="3"/>
      {[0,1,2].map(i=><Rect key={i} x={x+16+i*12} y={y+16+i*12} width={w-32-i*24} height={h-32-i*24} rx={120-i*15} fill="none" stroke={i%2?c.butter:c.surface} strokeWidth="8"/>)}
      <Rect x={x+80} y={y+70} width={w-160} height={h-140} rx="4" fill={c.tree} stroke={c.surface} strokeWidth="3"/>
      {[0,1,2,3,4,5].map(i=><Rect key={i} x={x+82} y={y+72+i*(h-144)/6} width={w-164} height={(h-144)/12} fill={c.treeLight} opacity=".8"/>)}
      <Line x1={x+80} y1={y+h/2} x2={x+w-80} y2={y+h/2} stroke={c.surface} strokeWidth="3"/><Circle cx={x+w/2} cy={y+h/2} r="46" fill="none" stroke={c.surface} strokeWidth="3"/>
      {[70,h-130].map(v=><Rect key={v} x={x+w/2-70} y={y+v} width="140" height="60" fill="none" stroke={c.surface} strokeWidth="3"/>)}
      <Circle cx={x+w/2+15} cy={y+h/2+14} r="5" fill={c.surface}/>
      <T x={x+w/2} y={y-30} fontSize="25" textAnchor="middle" fontWeight="bold" fill={c.teal}>BONGAON FOOTBALL STADIUM</T>
      {[[-5,-5],[w+5,-5],[-5,h+5],[w+5,h+5]].map(([dx,dy],i)=><G key={i}><Rect x={x+dx-3} y={y+dy-20} width="6" height="42" fill={c.onSurface}/><Rect x={x+dx-23} y={y+dy-30} width="46" height="15" rx="3" fill={c.butter} stroke={c.onSurface}/></G>)}
    </>:l.kind==='station'?<>
      <Rect x={x} y={y} width={w} height="140" rx="12" fill={c.peach} stroke={c.wood} strokeWidth="2"/><Path d={`M${x-10} ${y+42}L${x+w/2} ${y-22}L${x+w+10} ${y+42}Z`} fill={c.teal}/>
      <T x={x+w/2} y={y+74} textAnchor="middle" fontSize="27" fill={c.teal} fontWeight="bold">HABRA TOWN</T><T x={x+w/2} y={y+101} textAnchor="middle" fontSize="14" fill={c.wood}>RAILWAY STATION</T>
      <Rect x={x} y="2970" width={w} height="42" rx="5" fill={c.butter} stroke={c.wood}/><Rect x={x} y="3100" width={w} height="42" rx="5" fill={c.butter} stroke={c.wood}/>
      <T x={x+15} y="2998" fontSize="17" fill={c.teal}>PLATFORM 1</T><T x={x+15} y="3128" fontSize="17" fill={c.teal}>PLATFORM 2</T>
      {[0,1,2,3,4].map(i=><Rect key={i} x={x+12+i*70} y="3150" width="43" height="9" rx="3" fill={c.wood}/>)}
    </>:l.kind==='park'?<>
      <Rect x={x} y={y} width={w} height={h} rx="60" fill={c.mint} stroke={c.teal} strokeWidth="3"/><Path d={`M${x+w/2} ${y}V${y+h} M${x} ${y+h/2}H${x+w}`} stroke={c.pavement} strokeWidth="35"/>
      <Ellipse cx={x+w*.74} cy={y+h*.53} rx="180" ry="160" fill="none" stroke={c.coral} strokeWidth="17"/><Ellipse cx={x+w*.74} cy={y+h*.53} rx="180" ry="160" fill="none" stroke={c.butter} strokeWidth="3" strokeDasharray="9 14"/>
      <G transform={`translate(${x+215},${y+245})`}><Path d="M0 0L-90 175H90Z" fill="none" stroke={c.wood} strokeWidth="9"/><G transform={`rotate(${elapsed*4})`}><Circle r="148" fill="none" stroke={c.teal} strokeWidth="8"/>{Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,px=Math.cos(a)*148,py=Math.sin(a)*148;return <G key={i}><Line x2={px} y2={py} stroke={c.teal} strokeWidth="4"/><Rect x={px-20} y={py-9} width="40" height="30" rx="9" fill={i%2?c.brand:c.coral} stroke={c.onSurface} strokeWidth="2"/></G>;})}</G><Circle r="15" fill={c.brand}/></G>
      <Path d={`M${x+485} ${y+440}l70 -85 70 85z`} fill={c.coral}/><Rect x={x+499} y={y+440} width="112" height="65" fill={c.butter}/>
      <T x={x+w/2} y={y+35} textAnchor="middle" fontSize="28" fontWeight="bold" fill={c.teal}>PETRAPOLE AMUSEMENT PARK</T>
    </>:<>
      <Rect x={x} y={y} width={w} height={h} rx="7" fill={c.grass} stroke={c.wood} strokeWidth="5" strokeDasharray="8 3"/>
      {[0,1,2].map(i=><G key={i}><Rect x={x+25} y={y+35+i*150} width={w-50} height="94" rx="4" fill={c.teal} stroke={c.wood} strokeWidth="2"/><Path d={`M${x+18} ${y+55+i*150}L${x+w/2} ${y+12+i*150}L${x+w-18} ${y+55+i*150}Z`} fill={c.wood}/>{[0,1,2,3].map(j=><Rect key={j} x={x+38+j*36} y={y+78+i*150} width="18" height="22" fill={c.butter}/>)}</G>)}
      <Line x1={x+w/2} y1={y+h-85} x2={x+w/2} y2={y+h-15} stroke={c.onSurface} strokeWidth="3"/><Path d={`M${x+w/2} ${y+h-85}h53l-9 16 9 15h-53z`} fill={c.brand}/>
      <T x={x+w/2} y={y-30} textAnchor="middle" fontSize="19" fill={c.teal} fontWeight="bold">PETRAPOLE</T><T x={x+w/2} y={y-9} textAnchor="middle" fontSize="16" fill={c.teal}>ARMY BARRACKS</T>
    </>}
  </G>;
}