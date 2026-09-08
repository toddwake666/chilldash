export { MAP, WORLD, configureWorld, canRide, onFootpath, getRoute, region, distance, nearestRoad, railwayState, blockedByGate } from './region';
export const COLS=[120,400,680,960], ROWS=[120,400,680,960,1240], TOWN_OFFSET=2160;
export const ALL_COLS=[...COLS,...COLS.map(x=>x+TOWN_OFFSET)];
export const GARAGE={x:352,y:750};
export function gameTime(minutes:number) {return `${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;}
export function countdown(deadline:number|null|undefined,now:number) {const s=Math.max(0,Math.ceil((deadline||now)-now));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export const BIKES=[
  {id:'scooter',name:'The Daydream',note:'Your trusty starter',speed:115,stat:'Easy rider',cost:0},
  {id:'bicycle',name:'The Pedaler',note:'Slow. Simple. Sweet.',speed:86,stat:'Eco friendly',cost:0},
  {id:'express',name:'The Express',note:'A little more zip',speed:153,stat:'Fast & fun',cost:180},
];