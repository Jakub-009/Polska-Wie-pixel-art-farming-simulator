// Holowanie (0.5.2): przyczepa zbożowa i wózek z hederem to „wózki” (carts) z jednym modelem kinematycznym.
// Zaczep wózka (koniec dyszla) jest przypięty do zaczepu pojazdu; kąt wózka obraca się o (przesunięcie zaczepu ⟂ do osi)/D,
// gdzie D = odległość zaczepu od osi kół — to klasyczny model przyczepy jednoosiowej: stabilny do przodu, przy cofaniu może się złamać (limit kąta).
import {state,toast,RT,CARTS,VEHICLES,clamp,camera,VIEW} from './core.js';
import {obb,collide} from './geometry.js';
import {nearbyColliders} from './map.js';
import {sfx} from './sound.js';

export const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
export const fwd=a=>[Math.sin(a),-Math.cos(a)];
const at=(p,lx,ly)=>[p.x+Math.cos(p.angle)*lx-Math.sin(p.angle)*ly,p.y+Math.sin(p.angle)*lx+Math.cos(p.angle)*ly];
const MAX_REL=1.15;

export const cartDef=c=>CARTS[c.kind];
export const isMounted=c=>c.kind==='header'&&state.headerOn;
export function allCarts(){return Object.values(state.carts).filter(c=>!isMounted(c))}
export function cartObb(c){const d=cartDef(c);return obb(c.x,c.y,d.hw,d.hh,c.angle)}
export const tongueTip=c=>{const d=cartDef(c),f=fwd(c.angle);return[c.x+f[0]*(d.hh+d.tongue),c.y+f[1]*(d.hh+d.tongue)]};
export function vehPose(kind){
 if(state.vehicle===kind)return{x:state.x,y:state.y,angle:state.angle};
 return state.other.kind===kind?state.other:null;
}
export function hitchPoint(kind,pose=vehPose(kind)){return pose?at(pose,0,VEHICLES[kind].hitch):null}
export function towedBy(kind){return allCarts().find(c=>c.towedBy===kind)||null}
export const standingCarts=()=>allCarts().filter(c=>!c.towedBy);

// Jedna iteracja holowania: zaczep H, kąt pojazdu (do limitu złamania).
export function advanceCart(c,hx,hy,vehAngle){
 const d=cartDef(c);
 if(c.hx==null){c.hx=hx;c.hy=hy;return}
 const dx=hx-c.hx,dy=hy-c.hy;c.hx=hx;c.hy=hy;
 const D=d.tongue+d.hh*(1+d.axle);
 let a=c.angle+(dx*Math.cos(c.angle)+dy*Math.sin(c.angle))/D;
 const rel=angDiff(vehAngle,a);
 if(Math.abs(rel)>MAX_REL)a=vehAngle+Math.sign(rel)*MAX_REL;
 c.angle=a;
 const f=fwd(a),L=d.tongue+d.hh;
 c.x=hx-f[0]*L;c.y=hy-f[1]*L;
}
// Ustawia wózek prosto za zaczepem (start, NPC, odblokowanie).
export function alignCart(c,hx,hy,angle){
 const d=cartDef(c),f=fwd(angle),L=d.tongue+d.hh;
 c.angle=angle;c.x=hx-f[0]*L;c.y=hy-f[1]*L;c.hx=hx;c.hy=hy;
}
export function updateCarts(){
 for(const c of allCarts()){
  if(!c.towedBy)continue;
  const p=vehPose(c.towedBy);if(!p)continue;
  const [hx,hy]=hitchPoint(c.towedBy,p);
  advanceCart(c,hx,hy,p.angle);
 }
}
export const towedObbs=kind=>allCarts().filter(c=>c.towedBy===kind).map(cartObb);

// Czy wózek jest w zasięgu zaczepu pojazdu gracza?
export function hitchCandidate(){
 const k=state.vehicle,H=hitchPoint(k);
 if(!H||towedBy(k))return null;
 for(const c of standingCarts()){
  if(k!=='tractor'&&TOOLS.includes(c.kind))continue;
  const [tx,ty]=tongueTip(c);
  if(Math.hypot(H[0]-tx,H[1]-ty)<30&&Math.abs(angDiff(state.angle,c.angle))<1.0)return c;
 }
 return null;
}
export const TOOLS=['tiller','seeder'];
const NAMES={grain:'PRZYCZEPĘ',header:'WÓZEK Z HEDEREM',tiller:'AGREGAT',seeder:'SIEWNIK'};
export function toggleHitch(){
 if(!state.playing||state.paused)return;
 const k=state.vehicle,cur=towedBy(k);
 if(Math.abs(state.v)>1.5){toast('ZATRZYMAJ POJAZD');return}
 if(cur){cur.towedBy=null;cur.hx=null;cur.working=false;if(TOOLS.includes(cur.kind))state.tool=false;if(cur.kind==='grain')state.dumping=false;toast(({grain:'PRZYCZEPA',header:'WÓZEK',tiller:'AGREGAT',seeder:'SIEWNIK'})[cur.kind]+' ODCZEPIONY');return}
 const c=hitchCandidate();
 if(!c){toast('COFNIJ DO DYSZLA WÓZKA I USTAW SIĘ W JEGO OSI');return}
 // dociągnij dyszel do zaczepu
 const H=hitchPoint(k),[tx,ty]=tongueTip(c);c.x+=H[0]-tx;c.y+=H[1]-ty;
 c.towedBy=k;c.hx=H[0];c.hy=H[1];toast(NAMES[c.kind]+' ZACZEPIONO');
 sfx('clunk');
}
export function hitchHint(dt){RT.hitchT-=dt;if(RT.hitchT<=0&&hitchCandidate()){toast('R — ZACZEP '+NAMES[hitchCandidate().kind]);RT.hitchT=6}}

// Odblokowanie (B): najbliższe wolne miejsce wokół pojazdu; wózki prostowane za nim.
export function unstuck(playerObbsFn,dyn){
 if(!state.playing||state.paused)return;
 const free=(x,y,a)=>{
  const saved=[state.x,state.y,state.angle];state.x=x;state.y=y;state.angle=a;
  const k=state.vehicle,H=hitchPoint(k),c=towedBy(k);
  let saveC=null;if(c){saveC={x:c.x,y:c.y,angle:c.angle,hx:c.hx,hy:c.hy};alignCart(c,H[0],H[1],a)}
  let ok=true;
  for(const o of playerObbsFn()){for(const s of nearbyColliders(x,y,120).concat(dyn()))if(collide(o,s)){ok=false;break}if(!ok)break}
  state.x=saved[0];state.y=saved[1];state.angle=saved[2];
  if(c&&!ok&&saveC)Object.assign(c,saveC);
  return ok;
 };
 const a0=state.angle,x0=state.x,y0=state.y;
 for(let r=0;r<=240;r+=12)for(let k=0;k<(r?Math.max(8,Math.round(r/6)):1);k++){
  const ang=k/(r?Math.max(8,Math.round(r/6)):1)*Math.PI*2,x=x0+Math.cos(ang)*r,y=y0+Math.sin(ang)*r;
  if(free(x,y,a0)){
   state.x=x;state.y=y;state.v=0;
   const c=towedBy(state.vehicle);if(c){const H=hitchPoint(state.vehicle);alignCart(c,H[0],H[1],state.angle)}
   toast('POJAZD ODBLOKOWANY');return;
  }
 }
 toast('BRAK WOLNEGO MIEJSCA W POBLIŻU');
}
