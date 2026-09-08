import type { Point } from './api';
import { MAP, blockedByGate, distance, railwayState } from './region';

export type Vehicle = Point & { id:number; kind:'car'|'bike'; path:Point[]; length:number; travel:number; speed:number; heading:number; waiting:boolean };
const lengthOf=(ps:Point[])=>ps.slice(1).reduce((s,p,i)=>s+distance(p,ps[i]),0);
function sample(v:Vehicle,travel:number) {
  const period=2*v.length, phase=((travel%period)+period)%period, reverse=phase>v.length;
  let left=reverse?period-phase:phase;
  for(let i=1;i<v.path.length;i++) {
    const a=v.path[i-1],b=v.path[i],len=distance(a,b);
    if(left<=len||i===v.path.length-1) {
      const t=Math.max(0,Math.min(1,left/(len||1))),dir=reverse?-1:1,dx=(b.x-a.x)/(len||1)*dir,dy=(b.y-a.y)/(len||1)*dir;
      return {x:a.x+(b.x-a.x)*t-dy*17,y:a.y+(b.y-a.y)*t+dx*17,heading:Math.atan2(dx,-dy)*180/Math.PI};
    }
    left-=len;
  }
  return {x:v.path[0].x,y:v.path[0].y,heading:0};
}
export function createTraffic():Vehicle[] {
  const paths:Point[][]=[];
  const townRoutes=[
    [[120,400],[400,400],[680,400],[960,400]], [[400,120],[400,400],[400,680],[400,960],[400,1240]],
    [[2280,680],[2560,680],[2840,680],[3120,680]], [[2840,120],[2840,400],[2840,680],[2840,960],[2840,1240]],
    [[4200,400],[4490,400],[4840,400],[5150,400],[5450,400]], [[4200,400],[4200,740],[4200,1080],[4200,1420]],
    [[2280,2380],[2280,2720],[2280,3380],[2280,3720]], [[2840,2380],[2840,2720],[2840,3380],[2840,3720]], [[3280,2380],[3280,2720],[3280,3380],[3280,3720]],
    [[4440,3100],[4780,3100],[5120,3100],[5460,3100],[5840,3100]], [[5840,2720],[5840,3100],[5840,3460],[5840,3820],[5840,4180]],
  ];
  townRoutes.forEach(path=>paths.push(path.map(([x,y])=>({x,y}))));
  ['pine-trail','ray-bridge','revenuecat-bridge','habra-bridge','habra-west-loop','habra-east-loop'].forEach(id=>{const r=MAP.roads.find(r=>r.id===id);if(r)paths.push(r.points);});
  return paths.flatMap((path,i)=>Array.from({length:i>=6&&i<=8?6:4},(_,j)=>{
    const length=lengthOf(path),id=i*10+j;
    const v:Vehicle={id,kind:j%3?'bike':'car',path,length,travel:(j+.18)*length*2/(i>=6&&i<=8?6:4),speed:38+(id%4)*5,x:0,y:0,heading:0,waiting:false};
    let placed={...v,...sample(v,v.travel)};
    if(railwayState().closed) {
      for(let n=0;n<16&&MAP.railway.gates.some(g=>Math.abs(placed.x-g.x)<90&&Math.abs(placed.y-g.y)<125);n++) {
        placed.travel-=20;placed={...placed,...sample(placed,placed.travel)};
      }
    }
    return placed;
  }));
}
export function stepTraffic(vehicles:Vehicle[],dt:number,rider?:Point) {
  const closed=railwayState().closed;
  return vehicles.map(v=>{
    const travel=v.travel+v.speed*dt,next=sample(v,travel);
    const gated=!!blockedByGate(v,next,closed);
    const dx=Math.sin(v.heading*Math.PI/180),dy=-Math.cos(v.heading*Math.PI/180);
    const riderWaiting=!!rider&&closed&&MAP.railway.gates.some(g=>Math.abs(rider.x-g.x)<90&&Math.abs(rider.y-g.y)>=99&&Math.abs(rider.y-g.y)<225);
    const riderAhead=riderWaiting&&rider?((rider.x-v.x)*dx+(rider.y-v.y)*dy):Infinity;
    const riderInLane=!!rider&&Math.abs((rider.x-v.x)*dy-(rider.y-v.y)*dx)<23;
    const queued=(riderWaiting&&riderInLane&&riderAhead>0&&riderAhead<52)||vehicles.some(other=>{
      if(other.id===v.id)return false;
      const ahead=(other.x-v.x)*dx+(other.y-v.y)*dy;
      return ahead>0&&ahead<(v.kind==='bike'?31:44)&&Math.abs((other.x-v.x)*dy-(other.y-v.y)*dx)<14&&Math.cos((v.heading-other.heading)*Math.PI/180)>.8;
    });
    return gated||queued?{...v,waiting:true}:{...v,...next,travel,waiting:false};
  });
}