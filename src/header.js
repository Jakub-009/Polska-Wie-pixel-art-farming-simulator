// Heder (klawisz H): po zdjęciu pojawia się pod nim wózek hederowy (stoi w poprzek, dyszel w lewo).
// Wózek można zaczepić (R) do traktora lub kombajnu i wozić; ponowny montaż: najedź kombajnem przodem na heder, równolegle.
import {state,toast,RT,COMBINE_SCALE,camera,VIEW} from './core.js';
import {worldOffset} from './vehicles.js';
import {obb,collide} from './geometry.js';
import {nearbyColliders} from './map.js';
import {angDiff,cartObb} from './tow.js';
const HDR_DIST=54*COMBINE_SCALE;
// Czy stojący wózek z hederem jest przed maską, równolegle do hedera?
export function canAttach(){
 const c=state.carts.header;
 if(state.vehicle!=='combine'||state.headerOn||c.towedBy)return false;
 const dx=c.x-state.x,dy=c.y-state.y,cs=Math.cos(state.angle),sn=Math.sin(state.angle);
 const lx=cs*dx+sn*dy,ly=-sn*dx+cs*dy;
 const d=angDiff(c.angle,state.angle-Math.PI/2);
 return Math.abs(lx)<30&&ly<-35&&ly>-85&&(Math.abs(d)<.55||Math.PI-Math.abs(d)<.55);
}
export function toggleHeader(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('HEDER DOTYCZY KOMBAJNU — V ZMIENIA POJAZD');return}
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ KOMBAJN, ABY ZMIENIĆ HEDER');return}
 const c=state.carts.header;
 if(state.headerOn){
  if(state.tool){toast('NAJPIERW PODNIEŚ HEDER (SPACJA)');return}
  const [x,y]=worldOffset(0,-HDR_DIST);
  const probe={...c,x,y,angle:state.angle-Math.PI/2};
  const o=cartObb(probe);
  for(const s of nearbyColliders(x,y,110))if(collide(o,s)){toast('ZA MAŁO MIEJSCA NA ODSTAWIENIE HEDERA');return}
  Object.assign(c,{x,y,angle:probe.angle,towedBy:null,hx:null});
  state.headerOn=false;state.tool=false;
  toast('HEDER NA WÓZKU — COFNIJ; R ZACZEPIA WÓZEK DO POJAZDU');
 }else{
  if(!canAttach()){toast('PODJEDŹ PRZODEM DO HEDERA, USTAWIAJĄC SIĘ RÓWNOLEGLE');return}
  state.headerOn=true;c.towedBy=null;c.hx=null;toast('HEDER ZAŁOŻONY');
 }
}
export function headerHint(dt){
 RT.hintT-=dt;
 if(RT.hintT<=0&&canAttach()){toast('H — ZAŁÓŻ HEDER');RT.hintT=6}
}
// V: przesiadka między kombajnem a traktorem. Zostawiony pojazd stoi w miejscu (z zaczepionym wózkiem) i jest przeszkodą.
export function switchVehicle(){
 if(!state.playing||state.paused)return;
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ POJAZD, ABY SIĘ PRZESIĄŚĆ');return}
 const o=state.other,prev={kind:state.vehicle,x:state.x,y:state.y,angle:state.angle};
 state.vehicle=o.kind;state.x=o.x;state.y=o.y;state.angle=o.angle;state.other=prev;
 state.v=0;state.steer=0;state.tool=false;for(const c of Object.values(state.carts))c.working=false;
 camera.x=state.x-VIEW.w*.5;camera.y=state.y-VIEW.h*.5;
 toast(state.vehicle==='tractor'?'TRAKTOR — SZYBSZY, BEZ HEDERA':'KOMBAJN');
}
