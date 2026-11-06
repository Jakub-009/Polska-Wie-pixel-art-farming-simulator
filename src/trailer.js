// Przyczepa, rura wysypowa kombajnu, rozładunek zboża do przyczepy i wysyp przyczepy (0.5.0).
import {state,toast,RT,fx,camera,VIEW,TANK_T,TRAILER_T,UNLOAD_TPS,DUMP_TPS,clamp} from './core.js';
import {obb,collide} from './geometry.js';

// Geometria (px, 12 px = 1 m). Przyczepa: skrzynia 34×64 px, dyszel 14 px; zaczep traktora 33 px za jego środkiem.
export const TR={hw:17,hh:32,ld:46,hitch:33};
// Rura wysypowa kombajnu (układ lokalny kombajnu: x w prawo, y do tyłu): przegub na lewej burcie, po rozłożeniu sięga 73 px w bok — poza heder (44 px).
export const AUGER={px:-17,py:-14,len:56};
const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
const at=(p,lx,ly)=>[p.x+Math.cos(p.angle)*lx-Math.sin(p.angle)*ly,p.y+Math.sin(p.angle)*lx+Math.cos(p.angle)*ly];
const fwd=a=>[Math.sin(a),-Math.cos(a)];
export function trailerObb(){const t=state.trailer;return obb(t.x,t.y,TR.hw,TR.hh,t.angle)}
function tractorPose(){
 if(state.vehicle==='tractor')return{x:state.x,y:state.y,angle:state.angle};
 return state.other.kind==='tractor'?state.other:null;
}
function combinePose(){
 if(state.vehicle==='combine')return{x:state.x,y:state.y,angle:state.angle};
 return state.other.kind==='combine'?state.other:null;
}
export function hitchPoint(p){return at(p,0,TR.hitch)}
// Przyczepa zaczepiona: środek skrzyni jest ciągnięty za zaczepem, stała odległość (model „holowania”). Ograniczony kąt załamania.
export function updateTrailer(){
 const t=state.trailer;if(!t.hitched)return;
 const p=tractorPose();if(!p)return;
 const [hx,hy]=hitchPoint(p);
 let vx=hx-t.x,vy=hy-t.y;
 if(Math.hypot(vx,vy)<1)return;
 let a=Math.atan2(vx,-vy);
 const d=angDiff(p.angle,a);
 if(Math.abs(d)>1.1)a=p.angle+Math.sign(d)*1.1;
 t.angle=a;const f=fwd(a);t.x=hx-f[0]*TR.ld;t.y=hy-f[1]*TR.ld;
}
function tongue(){const t=state.trailer,f=fwd(t.angle);return[t.x+f[0]*TR.ld,t.y+f[1]*TR.ld]}
export function canHitch(){
 const t=state.trailer,p=tractorPose();
 if(t.hitched||state.vehicle!=='tractor'||!p)return false;
 const [hx,hy]=hitchPoint(p),[tx,ty]=tongue();
 return Math.hypot(hx-tx,hy-ty)<26&&Math.abs(angDiff(p.angle,t.angle))<.9;
}
export function toggleHitch(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='tractor'){toast('ZACZEP PRZYCZEPY — TYLKO TRAKTOREM (V)');return}
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ TRAKTOR');return}
 const t=state.trailer;
 if(t.hitched){t.hitched=false;state.dumping=false;toast('PRZYCZEPA ODCZEPIONA');return}
 if(!canHitch()){toast('COFNIJ TRAKTOREM DYSZLEM W ZACZEP PRZYCZEPY');return}
 t.hitched=true;updateTrailer();toast('PRZYCZEPA ZACZEPIONA');
}
export function hitchHint(dt){RT.hitchT-=dt;if(RT.hitchT<=0&&canHitch()){toast('R — ZACZEP PRZYCZEPĘ');RT.hitchT=6}}

// ───── kombajn: rura i rozładunek ─────
export function augerTip(p,t=1){
 const a=Math.PI/2+t*Math.PI/2;
 return at(p,AUGER.px+Math.cos(a)*AUGER.len,AUGER.py+Math.sin(a)*AUGER.len);
}
export function toggleAuger(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('RURA — TYLKO KOMBAJN (V)');return}
 state.augerOut=!state.augerOut;
 if(!state.augerOut)state.unloading=false;
 toast(state.augerOut?'RURA ROZKŁADANA — JEDŹ POWOLI':'RURA SKŁADANA');
}
export function toggleUnload(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='combine'){toast('ROZŁADUNEK — TYLKO KOMBAJN (V)');return}
 if(state.auger<.99){toast('NAJPIERW ROZŁÓŻ RURĘ (U)');return}
 state.unloading=!state.unloading;
 toast(state.unloading?'ROZŁADUNEK WŁĄCZONY':'ROZŁADUNEK WYŁĄCZONY');
}
export function toggleDump(){
 if(!state.playing||state.paused)return;
 if(state.vehicle!=='tractor'){toast('WYSYP — TYLKO TRAKTOREM Z PRZYCZEPĄ (V)');return}
 if(!state.trailer.hitched){toast('ZACZEP PRZYCZEPĘ (R)');return}
 if(state.trailer.load<=.001){toast('PRZYCZEPA JEST PUSTA');return}
 if(Math.abs(state.v)>6){toast('ZWOLNIJ, ABY WYSYPAĆ');return}
 state.dumping=!state.dumping;
 toast(state.dumping?'WYSYP PRZYCZEPY':'WYSYP ZATRZYMANY');
}
function grain(x,y,spread,vy=0){if(fx.length>200)return;fx.push({type:'grain',x:x+(Math.random()-.5)*spread,y:y+(Math.random()-.5)*spread,vx:(Math.random()-.5)*26,vy:(Math.random()-.5)*20+vy,life:.35+Math.random()*.3,max:.65,size:1+Math.random()*2})}
export function updateGrain(dt){
 // animacja rury
 const target=state.augerOut?1:0;
 state.auger=clamp(state.auger+Math.sign(target-state.auger)*Math.min(Math.abs(target-state.auger),dt*.6),0,1);
 const t=state.trailer;
 if(state.unloading){
  const cp=combinePose();
  if(!cp||state.auger<.99){state.unloading=false}
  else{
   const [tx,ty]=augerTip(cp);
   const over=collide(obb(tx,ty,.5,.5,0),obb(t.x,t.y,TR.hw-3,TR.hh-5,t.angle));
   if(state.tank<=.0005){state.unloading=false;toast('ZBIORNIK PUSTY')}
   else if(t.load>=TRAILER_T-.001){state.unloading=false;toast('PRZYCZEPA PEŁNA')}
   else if(!over){if(RT.spillT<=0){toast('RURA POZA PRZYCZEPĄ — PODJEDŹ BLIŻEJ');RT.spillT=3}}
   else{
    const q=Math.min(UNLOAD_TPS*dt,state.tank*TANK_T,TRAILER_T-t.load);
    state.tank=Math.max(0,state.tank-q/TANK_T);t.load+=q;
    for(let i=0;i<2;i++)grain(tx,ty,6,6);
   }
  }
 }
 if(state.dumping){
  if(!t.hitched||t.load<=.001||Math.abs(state.v)>6){state.dumping=false;if(t.load<=.001)toast('PRZYCZEPA PUSTA')}
  else{
   const q=Math.min(DUMP_TPS*dt,t.load);t.load-=q;state.stored+=q;
   const f=fwd(t.angle),rx=t.x-f[0]*(TR.hh+3),ry=t.y-f[1]*(TR.hh+3);
   for(let i=0;i<3;i++)grain(rx,ry,26,-f[1]*18);
  }
 }
}
// Podpowiedź przy ustawieniu pod rurą (używana przez HUD / testy).
export function spoutOverTrailer(){
 const cp=combinePose();if(!cp)return false;const [tx,ty]=augerTip(cp,Math.max(.0001,state.auger));const t=state.trailer;
 return !!collide(obb(tx,ty,.5,.5,0),obb(t.x,t.y,TR.hw-3,TR.hh-5,t.angle));
}
