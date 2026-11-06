// Koszenie, ściernisko, ślady i cząsteczki.
import {FLD,N,state,RT,fx,COMBINE_SCALE,HEADER_HALF,HEADER_MIN,HEADER_MAX,FIELD_HA,YIELD_T_HA,TANK_T,FINISH_SHARE,clamp,rect} from './core.js';
import {crop,fieldTile,tc} from './world.js';
import {worldOffset} from './vehicles.js';
import {finish} from './ui.js';
function harvest(){
 if(!state.tool||state.v<3)return;
 let m=0;
 // Sweep a real working swath, including just in front of the cutter; never whole field tiles at once.
 for(let u=-HEADER_HALF;u<=HEADER_HALF;u+=3.5){for(let f=HEADER_MIN;f<=HEADER_MAX;f+=4){
   let wx=state.x+Math.cos(state.angle)*u+Math.sin(state.angle)*f;
   let wy=state.y+Math.sin(state.angle)*u-Math.cos(state.angle)*f;
   let i=Math.floor((wx-FLD.x)/FLD.t),j=Math.floor((wy-FLD.y)/FLD.t);
   if(i<0||j<0||i>=FLD.n||j>=FLD.n)continue;
   const k=j*FLD.n+i;
   if(!crop[k]){crop[k]=1;state.cut++;fieldTile(i,j);m++}
 }}
 if(m){
   state.work+=m;
   state.tank=clamp((state.cut/N)*FIELD_HA*YIELD_T_HA/TANK_T,0,1);
   if(RT.frame%3===0)for(let k=0;k<2;k++){
     let [x,y]=worldOffset((Math.random()-.5)*57*COMBINE_SCALE,-45*COMBINE_SCALE);
     particle('straw',x,y);
   }
   if(state.cut/N>=FINISH_SHARE){state.done=true;state.playing=false;finish()}
 }
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
   let [x,y]=worldOffset(side*22*COMBINE_SCALE,30*COMBINE_SCALE);
   const ix=Math.floor((x-FLD.x)/FLD.t),iy=Math.floor((y-FLD.y)/FLD.t);
   if(ix<0||iy<0||ix>=FLD.n||iy>=FLD.n||!crop[iy*FLD.n+ix])continue;
   rect(tc,x,y,2,3,'#776d51');
 }
 tc.globalAlpha=1;
}
// Browser-native layered sound: engine, threshing, wind. Created ONLY after a user gesture.

export {harvest,particle,updateTracks};
