// Rura wysypowa kombajnu, rozładunek zboża do przyczepy, wysyp przyczepy do kosza silosu, sprzedaż (0.5.2).
import {state,toast,RT,fx,TANK_T,TRAILER_T,SILO_T,GRAIN_PRICE,UNLOAD_TPS,DUMP_TPS,AUGER,CARTS,clamp,displayNumber} from './core.js';
import {obb,collide} from './geometry.js';
import {cartObb,towedBy,fwd} from './tow.js';
import {PIT} from './map.js';
import {sfx} from './sound.js';

const at=(p,lx,ly)=>[p.x+Math.cos(p.angle)*lx-Math.sin(p.angle)*ly,p.y+Math.sin(p.angle)*lx+Math.cos(p.angle)*ly];
function combinePose(){
 if(state.vehicle==='combine')return{x:state.x,y:state.y,angle:state.angle};
 return state.other.kind==='combine'?state.other:null;
}
// Koniec rury w świecie (t = stopień rozłożenia 0..1).
export function augerTip(p,t=1){
 const a=Math.PI/2+t*Math.PI/2;
 return at(p,AUGER.px+Math.cos(a)*AUGER.len,AUGER.py+Math.sin(a)*AUGER.len);
}
const tipObb=(x,y)=>obb(x,y,.5,.5,0);
const boxOver=c=>{const d=CARTS.grain;return obb(c.x,c.y,d.hw-3,d.hh-5,c.angle)};
export function spoutOverTrailer(){
 const cp=combinePose();if(!cp||state.auger<.5)return false;
 const [tx,ty]=augerTip(cp,Math.max(.0001,state.auger));
 return !!collide(tipObb(tx,ty),boxOver(state.carts.grain));
}
export function toggleAuger(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('Rura jest tylko w kombajnie (V).');return}
 state.augerOut=!state.augerOut;
 if(!state.augerOut)state.unloading=false;
 sfx('hyd');
 toast(state.augerOut?'Rura rozłożona — jedź powoli.':'Rura złożona.');
}
export function toggleUnload(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('Rozładunek jest tylko w kombajnie (V).');return}
 if(state.auger<.99){toast('Najpierw rozłóż rurę (U).');return}
 state.unloading=!state.unloading;
 toast(state.unloading?'Rozładunek włączony.':'Rozładunek wyłączony.');
}
// Wysyp: przyczepa musi być zaczepiona do pojazdu gracza; ziarno trafia do silosu tylko, gdy tył skrzyni jest nad koszem zasypowym.
export function rearPoint(c){const f=fwd(c.angle),d=CARTS.grain;return[c.x-f[0]*(d.hh+3),c.y-f[1]*(d.hh+3)]}
export function overPit(c){const [x,y]=rearPoint(c);return x>PIT.x-8&&x<PIT.x+PIT.w+8&&y>PIT.y-8&&y<PIT.y+PIT.h+8}
export function toggleDump(){
 if(!state.playing||state.paused)return;
 const c=state.carts.grain;
 if(towedBy(state.vehicle)!==c){toast('Zaczep przyczepę (R), by ją opróżnić.');return}
 if(c.load<=.001){toast('Przyczepa jest pusta.');return}
 if(Math.abs(state.v)>6){toast('Zwolnij, by wysypać zboże.');return}
 state.dumping=!state.dumping;
 toast(state.dumping?(overPit(c)?'Wysyp do kosza silosu.':'Wysyp na ziemię — zboże przepadnie!'):'Wysyp zatrzymany.');
}
// Sprzedaż zboża z silosów (klawisz K).
export function sellGrain(){
 if(!state.playing||state.paused)return;
 if(state.stored<.01){toast('Silosy są puste.');return}
 const pay=Math.round(state.stored*GRAIN_PRICE);
 toast('Sprzedano '+displayNumber(state.stored,2)+' t zboża za '+pay.toLocaleString('pl-PL')+' zł.');
 state.money+=pay;state.stored=0;sfx('coin');
}
function grain(x,y,spread,vx=0,vy=0){if(fx.length>220)return;fx.push({type:'grain',x:x+(Math.random()-.5)*spread,y:y+(Math.random()-.5)*spread,vx:(Math.random()-.5)*26+vx,vy:(Math.random()-.5)*20+vy,life:.35+Math.random()*.3,max:.65,size:1+Math.random()*2})}
export function updateGrain(dt){
 state.flow=0;
 const target=state.augerOut?1:0;
 state.auger=clamp(state.auger+Math.sign(target-state.auger)*Math.min(Math.abs(target-state.auger),dt*.6),0,1);
 const c=state.carts.grain;
 if(state.unloading){
  const cp=combinePose();
  if(!cp||state.auger<.99)state.unloading=false;
  else{
   const [tx,ty]=augerTip(cp);
   const over=collide(tipObb(tx,ty),boxOver(c));
   if(state.tank<=.0005){state.unloading=false;toast('Zbiornik jest pusty.')}
   else if(c.load>=TRAILER_T-.001){state.unloading=false;toast('Przyczepa pełna.')}
   else if(!over){if(RT.spillT<=0){toast('Rura jest poza przyczepą — podjedź bliżej.');RT.spillT=3}}
   else{
    const q=Math.min(UNLOAD_TPS*dt,state.tank*TANK_T,TRAILER_T-c.load);
    state.tank=Math.max(0,state.tank-q/TANK_T);c.load+=q;state.flow=1;
    for(let i=0;i<2;i++)grain(tx,ty,6,0,6);
   }
  }
 }
 if(state.dumping){
  if(towedBy(state.vehicle)!==c||c.load<=.001||Math.abs(state.v)>6){state.dumping=false;if(c.load<=.001)toast('Przyczepa pusta.')}
  else{
   const pit=overPit(c);
   if(pit&&state.stored>=SILO_T-.001){state.dumping=false;toast('Silosy pełne — sprzedaj zboże (K).')}
   else{
    const q=Math.min(DUMP_TPS*dt,c.load,pit?SILO_T-state.stored:1e9);
    c.load-=q;state.flow=1;
    if(pit)state.stored+=q;else if(RT.spillT<=0){toast('Zboże sypie się na ziemię!');RT.spillT=4}
    const [rx,ry]=rearPoint(c),f=fwd(c.angle);
    for(let i=0;i<3;i++)grain(rx,ry,24,-f[0]*8,-f[1]*18);
   }
  }
 }
}
