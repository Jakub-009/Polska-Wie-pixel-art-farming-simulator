// Koszenie, ściernisko, ślady i cząsteczki.
import {FLD,N,state,RT,fx,COMBINE_SCALE,HEADER_HALF,HEADER_MIN,HEADER_MAX,FIELD_HA,YIELD_T_HA,TANK_T,FINISH_SHARE,clamp,rect,toast} from './core.js';
import {crop,fieldTile,tc} from './world.js';
import {worldOffset} from './vehicles.js';
import {finish} from './ui.js';
import {puddleAt} from './map.js';
import {allCarts,cartDef,fwd} from './tow.js';
function harvest(dtH=1/60){
 if(state.vehicle!=='combine'||!state.tool||!state.headerOn||state.v<3)return;
 if(state.tank>=.999){if(RT.fullT<=0){toast('ZBIORNIK PEŁNY — ROZŁADUJ (U, potem J)');RT.fullT=4}return}
 let m=0;
 const perTile=FIELD_HA*YIELD_T_HA/N;
 // Sweep a real working swath, including just in front of the cutter; never whole field tiles at once.
 for(let u=-HEADER_HALF;u<=HEADER_HALF;u+=3.5){for(let f=HEADER_MIN;f<=HEADER_MAX;f+=4){
   let wx=state.x+Math.cos(state.angle)*u+Math.sin(state.angle)*f;
   let wy=state.y+Math.sin(state.angle)*u-Math.cos(state.angle)*f;
   let i=Math.floor((wx-FLD.x)/FLD.t),j=Math.floor((wy-FLD.y)/FLD.t);
   if(i<0||j<0||i>=FLD.n||j>=FLD.n)continue;
   const k=j*FLD.n+i;
   if(!crop[k]){if(state.tank>=.999)continue;crop[k]=1;state.cut++;fieldTile(i,j);m++;state.grain+=perTile;state.tank=Math.min(1,state.tank+perTile/TANK_T)}
 }}
 if(m){
   state.work+=m;
   RT.strawT-=dtH;
   if(RT.strawT<=0){RT.strawT=.05;for(let k=0;k<2;k++){
     let [x,y]=worldOffset((Math.random()-.5)*57*COMBINE_SCALE,-45*COMBINE_SCALE);
     particle('straw',x,y);
   }}
   if(state.cut/N>=FINISH_SHARE){state.done=true;state.playing=false;finish()}
 }
}

// Uprawa (0.6.0): agregat zamienia ściernisko (1) w ziemię zaoraną (2), siewnik zaorane (2) w obsiane (3).
// Stany pola: 0 dojrzałe zboże, 1 ściernisko, 2 zaorane, 3 obsiane, 4 wschody, 5 młode zboże → (po wzroście) 0.
const setTile=(i,j,v)=>{const k=j*FLD.n+i,was=crop[k];if(was===v)return false;crop[k]=v;if(was===0&&v)state.cut++;else if(v===0&&was)state.cut--;fieldTile(i,j);return true};
function workSoil(){
 if(state.vehicle!=='tractor'||Math.abs(state.v)<1)return;
 const c=allCarts().find(q=>q.towedBy==='tractor'&&q.working);if(!c)return;
 const d=cartDef(c),f=fwd(c.angle),rx=Math.cos(c.angle),ry=Math.sin(c.angle);
 const from=c.kind==='tiller'?[0,1]:[2],to=c.kind==='tiller'?2:3;
 let n=0;
 for(let u=-d.hw+2;u<=d.hw-2;u+=3){for(const back of [d.hh-2,d.hh-8]){
  const wx=c.x+rx*u-f[0]*back,wy=c.y+ry*u-f[1]*back;
  const i=Math.floor((wx-FLD.x)/FLD.t),j=Math.floor((wy-FLD.y)/FLD.t);
  if(i<0||j<0||i>=FLD.n||j>=FLD.n)continue;
  if(from.includes(crop[j*FLD.n+i])&&setTile(i,j,to))n++;
 }}
 if(n){
  RT.dustT-=1/60;
  if(RT.dustT<=0){RT.dustT=.06;const bx=c.x-f[0]*(d.hh+4)+rx*(Math.random()-.5)*d.hw*1.6,by=c.y-f[1]*(d.hh+4)+ry*(Math.random()-.5)*d.hw*1.6;particle('dust',bx,by)}
 }
}
// Test: klawisz G przeskakuje wzrost o jeden etap na całym polu (3 → 4 → 5 → dojrzałe).
function growCrops(){
 if(!state.playing||state.paused)return;
 let n=0;
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++){const v=crop[j*FLD.n+i];if(v>=3){setTile(i,j,v===5?0:v+1);n++}}
 toast(n?'WZROST ZBÓŻ — O JEDEN ETAP (TEST)':'BRAK OBSIANYCH POLETEK — ORZ AGREGATEM I SIEJ SIEWNIKIEM');
}
function particle(type,x,y,ox=0,oy=0){if(fx.length>180)return;fx.push({type,x:x+ox,y:y+oy,vx:(Math.random()-.5)*(type==='dust'?17:31),vy:(Math.random()-.5)*20-9,life:.45+Math.random()*.35,max:.85,size:type==='dust'?3+Math.random()*5:1+Math.random()*3})}
function updateTracks(dt){
 // Sparse, low-contrast impressions ONLY on stubble, placed by distance rather than RT.frame count.
 if(Math.abs(state.v)<4)return;
 RT.stamp+=Math.abs(state.v)*dt;
 if(RT.stamp<8)return;
 RT.stamp=0;
 tc.globalAlpha=.11;
 for(const side of [-1,1]){
   let [x,y]=worldOffset(side*(state.vehicle==='tractor'?14:22)*COMBINE_SCALE,30*COMBINE_SCALE);
   if(puddleAt(x,y)){tc.globalAlpha=.42;rect(tc,x-1,y,3,3,'#66563a');tc.globalAlpha=.11;continue}
   const ix=Math.floor((x-FLD.x)/FLD.t),iy=Math.floor((y-FLD.y)/FLD.t);
   if(ix<0||iy<0||ix>=FLD.n||iy>=FLD.n||!crop[iy*FLD.n+ix])continue;
   rect(tc,x,y,2,3,'#776d51');
 }
 tc.globalAlpha=1;
}

export {harvest,particle,updateTracks,workSoil,growCrops};
