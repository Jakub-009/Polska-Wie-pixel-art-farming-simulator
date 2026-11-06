// Zdejmowany heder (klawisz H): odkładany przed kombajnem, zakładany po podjechaniu i ustawieniu równolegle.
import {state,toast,RT,COMBINE_SCALE,camera,VIEW} from './core.js';
import {worldOffset,playerObbs} from './vehicles.js';
import {obb,collide} from './geometry.js';
import {nearbyColliders} from './map.js';
const HDR_DIST=54*COMBINE_SCALE;
const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
export function parkedObb(){const p=state.parked;return p?{...obb(p.x,p.y,44*COMBINE_SCALE,9*COMBINE_SCALE,p.angle),id:'header'}:null}
// Czy odstawiony heder jest w zasięgu zaczepu (przed maską, mniej więcej równolegle)?
export function canAttach(){
 const p=state.parked;if(!p)return false;
 const dx=p.x-state.x,dy=p.y-state.y,c=Math.cos(state.angle),s=Math.sin(state.angle);
 const lx=c*dx+s*dy,ly=-s*dx+c*dy;
 return Math.abs(lx)<30&&ly<-35&&ly>-85&&Math.abs(angDiff(state.angle,p.angle))<.55;
}
export function toggleHeader(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('HEDER DOTYCZY KOMBAJNU — V ZMIENIA POJAZD');return}
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ KOMBAJN, ABY ZMIENIĆ HEDER');return}
 if(state.headerOn){
  if(state.tool){toast('NAJPIERW PODNIEŚ HEDER (SPACJA)');return}
  const [x,y]=worldOffset(0,-HDR_DIST);
  const o=obb(x,y,44*COMBINE_SCALE,9*COMBINE_SCALE,state.angle);
  for(const c of nearbyColliders(x,y,70))if(collide(o,c)){toast('ZA MAŁO MIEJSCA NA ODSTAWIENIE HEDERA');return}
  state.parked={x,y,angle:state.angle};state.headerOn=false;state.tool=false;
  toast('HEDER ODSTAWIONY — COFNIJ I JEDŹ DALEJ');
 }else{
  if(!canAttach()){toast('PODJEDŹ PRZODEM DO HEDERA, USTAWIAJĄC SIĘ RÓWNOLEGLE');return}
  state.headerOn=true;state.parked=null;toast('HEDER ZAŁOŻONY');
 }
}
// Podpowiedź przy zbliżaniu się do odstawionego hedera.
export function headerHint(dt){
 RT.hintT-=dt;
 if(state.vehicle==='combine'&&!state.headerOn&&RT.hintT<=0&&canAttach()){toast('H — ZAŁÓŻ HEDER');RT.hintT=6}
}

// V: przesiadka między kombajnem a traktorem testowym. Zostawiony pojazd stoi w miejscu i jest przeszkodą.
export function switchVehicle(){
 if(!state.playing||state.paused)return;
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ POJAZD, ABY SIĘ PRZESIĄŚĆ');return}
 const o=state.other,prev={kind:state.vehicle,x:state.x,y:state.y,angle:state.angle};
 state.vehicle=o.kind;state.x=o.x;state.y=o.y;state.angle=o.angle;state.other=prev;
 state.v=0;state.steer=0;state.tool=false;
 camera.x=state.x-VIEW.w*.5;camera.y=state.y-VIEW.h*.5;
 toast(state.vehicle==='tractor'?'TRAKTOR (TEST) — SZYBSZY, BEZ HEDERA':'KOMBAJN');
}
