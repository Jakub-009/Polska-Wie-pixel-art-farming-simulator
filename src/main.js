// Punkt wejścia: symulacja (stały krok), kolizje, kamera, ekran, restart i testy.
// 0.4.0: mapa jako dane + kolizje OBB ze ślizganiem, pojazdy NPC na grafie dróg, poprawki 0.3.3.
import {INIT_OTHER,INIT_CARTS,SETTINGS,START,C,ctx,VIEW,$,clamp,lerp,WORLD,FLD,N,keys,state,camera,RT,fx,COMBINE_SCALE,VEH,toast,FIELD_HA,DEBUG,active} from './core.js';
import {crop,fieldTile,tc,buildWorld} from './world.js';
import {harvest,updateTracks,particle} from './harvest.js';
import {worldOffset,playerObbs,otherObbs} from './vehicles.js';
import {drawWorld} from './render.js';
import {hud} from './ui.js';
import {updateSound,birdNote} from './sound.js';
import {bindControls} from './controls.js';
import {MAP,nearbyColliders,pointBlocked} from './map.js';
import {collide,obb} from './geometry.js';
import {updateLife,dynamicColliders as lifeColliders,lifeInfo} from './life.js';
import {headerHint,toggleHeader,switchVehicle} from './header.js';
import * as TRL from './trailer.js';
import * as TOW from './tow.js';
import {MAP as _M,puddleAt} from './map.js';
import {saveGame,loadGame,hasSave,clearSave,loadSettings} from './save.js';
const {updateGrain}=TRL;
const {updateCarts,hitchHint,standingCarts,cartObb}=TOW;
// Przeszkody ruchome względem mapy: pojazdy NPC (z wózkami), drugi pojazd gracza (z holowanym wózkiem), stojące wózki.
function dynamicColliders(){const d=lifeColliders();for(const o of otherObbs())d.push({...o,id:'parked-'+state.other.kind});for(const c of standingCarts())d.push({...cartObb(c),id:'cart-'+c.kind});return d}
const STEP=1/60;
function approach(v,to,amount){return v<to?Math.min(v+amount,to):Math.max(v-amount,to)}

// Wypychanie kombajnu z przeszkód (najgłębsza kolizja pierwsza). Prędkość wzdłuż kierunku jazdy
// tłumiona proporcjonalnie do siły uderzenia, składowa styczna zostaje — maszyna ześlizguje się po ścianie.
function resolveCollisions(){
 const dyn=dynamicColliders().filter(c=>Math.hypot(c.x-state.x,c.y-state.y)<170);
 let hitN=null,contacts=0;
 for(let pass=0;pass<8;pass++){
  const near=nearbyColliders(state.x,state.y,95).concat(dyn);
  let best=null;
  for(const o of playerObbs())for(const c of near){const m=collide(o,c);if(m&&(!best||m.depth>best.depth))best=m}
  if(!best)break;
  state.x+=best.nx*(best.depth+.02);state.y+=best.ny*(best.depth+.02);
  hitN=best;contacts++;
 }
 DEBUG.contacts=contacts;
 if(hitN){
  const dir=Math.sign(state.v)||0,hx=Math.sin(state.angle)*dir,hy=-Math.cos(state.angle)*dir;
  const impact=clamp(-(hx*hitN.nx+hy*hitN.ny),0,1);
  state.v*=1-impact;if(Math.abs(state.v)<.4)state.v=0;
  if(RT.warnT<=0&&impact>.25){toast('PRZESZKODA — UWAŻAJ');RT.warnT=4}
 }
}
function step(dt){
 if(!active())return;
 const fw=keys.has('w')||keys.has('arrowup'),bw=keys.has('s')||keys.has('arrowdown');
 const left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright');
 const input=(right?1:0)-(left?1:0);
 state.steer=approach(state.steer,input,dt*2.5);
 const V=VEH[state.vehicle],cap=state.vehicle==='combine'&&state.auger>.05?14:1e9;
 if(fw&&bw)state.v=approach(state.v,0,dt*22);
 else if(fw)state.v=approach(state.v,Math.min(cap,Math.max(0,state.tool?V.work:V.road)),dt*(state.v<0?20:V.acc));
 else if(bw)state.v=approach(state.v,-V.rev,dt*(state.v>0?V.brake:8));
 else state.v=approach(state.v,0,dt*12);
 // Model rowerowy: brak obrotu w miejscu.
 const steerAngle=state.steer*.60;
 const yaw=state.v/V.L*Math.tan(steerAngle);
 state.angle+=yaw*dt;
 state.x=clamp(state.x+Math.sin(state.angle)*state.v*dt,28,WORLD.w-28);
 state.y=clamp(state.y-Math.cos(state.angle)*state.v*dt,36,WORLD.h-36);
 updateCarts();updateLife(dt);
 resolveCollisions();updateCarts();headerHint(dt);hitchHint(dt);updateGrain(dt);
 RT.warnT-=dt;RT.fullT-=dt;RT.spillT-=dt;RT.saveT=(RT.saveT||0)+dt;
 if(RT.saveT>20){RT.saveT=0;saveGame()}
 RT.reelSpin+=state.tool?dt*12:0;RT.wheelTravel+=state.v*dt;RT.lifeT+=dt;
 harvest(dt);updateTracks(dt);
 RT.dustT-=dt;
 if(RT.dustT<=0&&Math.abs(state.v)>5){
  RT.dustT=.1;
  for(let k=0;k<(state.tool?2:1);k++){
   const [x,y]=worldOffset((Math.random()-.5)*(state.vehicle==="tractor"?28:34)*COMBINE_SCALE,32*COMBINE_SCALE);
   const pu=puddleAt(x,y);
   if(pu&&pu[4])particle('splash',x,y);else if(!pu)particle('dust',x,y);
  }
 }
 if(!SETTINGS.particles&&fx.length>40)fx.length=40;
 for(let i=fx.length-1;i>=0;i--){
  let p=fx[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.life<=0)fx.splice(i,1);
 }
 state.elapsed+=dt;
 state.time+=dt*state.rate/60;
 RT.birdT+=dt;
 if(RT.birdT>16){RT.birdT=0;birdNote()}
 if(RT.msgT>0){RT.msgT-=dt;if(RT.msgT<=0)$('#msg').style.opacity='0'}
 updateSound(fw);
 followCamera(dt);
}
function clampCamera(){
 camera.x=VIEW.w>=WORLD.w?(WORLD.w-VIEW.w)/2:clamp(camera.x,0,WORLD.w-VIEW.w);
 camera.y=VIEW.h>=WORLD.h?(WORLD.h-VIEW.h)/2:clamp(camera.y,0,WORLD.h-VIEW.h);
}
function followCamera(dt){
 const look=35,tx=state.x+Math.sin(state.angle)*look-VIEW.w*.5,ty=state.y-Math.cos(state.angle)*look-VIEW.h*.5;
 camera.x=lerp(camera.x,tx,Math.min(1,dt*5));camera.y=lerp(camera.y,ty,Math.min(1,dt*5));
 clampCamera();
}
// Skalowanie całkowite: każdy piksel gry to dokładnie `scale` pikseli urządzenia.
function size(){
 const dpr=window.devicePixelRatio||1,W=innerWidth*dpr,H=innerHeight*dpr;
 const base=Math.max(1,Math.round(Math.min(H/360,W/480)));VIEW.maxZoom=Math.min(2,base-1);VIEW.zoom=Math.min(VIEW.zoom,VIEW.maxZoom);const sc=base-VIEW.zoom;
 VIEW.scale=sc;VIEW.w=Math.ceil(W/sc);VIEW.h=Math.ceil(H/sc);
 C.width=VIEW.w;C.height=VIEW.h;
 C.style.width=VIEW.w*sc/dpr+'px';C.style.height=VIEW.h*sc/dpr+'px';
 ctx.imageSmoothingEnabled=false;clampCamera();
}
addEventListener('resize',size);size();
let fpsT=0,fpsN=0;
function run(ts){
 const frame=RT.last?Math.min((ts-RT.last)/1000,.1):0;RT.last=ts;
 RT.acc+=frame;let n=0;
 while(RT.acc>=STEP&&n<6){step(STEP);RT.acc-=STEP;n++}
 if(n===6)RT.acc=0;
 RT.frame++;fpsT+=frame;fpsN++;if(fpsT>=.5){DEBUG.fps=Math.round(fpsN/fpsT);fpsT=0;fpsN=0}
 drawWorld();
 RT.hudT+=frame;if(RT.hudT>=.12){RT.hudT=0;hud()}
 requestAnimationFrame(run);
}
function applyLoaded(){
 tc.clearRect(0,0,WORLD.w,WORLD.h);fx.length=0;keys.clear();
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
 camera.x=state.x-VIEW.w*.5;camera.y=state.y-VIEW.h*.5;clampCamera();hud();
}
function reset(){
 crop.fill(0);state.cut=0;
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
 tc.clearRect(0,0,WORLD.w,WORLD.h);fx.length=0;keys.clear();
 Object.assign(state,{vehicle:'combine',other:INIT_OTHER(),carts:INIT_CARTS(),auger:0,augerOut:false,unloading:false,dumping:false,flow:0,stored:0,money:0,grain:0,x:START.x,y:START.y,angle:START.angle,headerOn:true,v:0,steer:0,tool:false,tank:0,work:0,done:false,paused:false,time:16*60+35,elapsed:0,rate:1});
 camera.x=state.x-VIEW.w*.5;camera.y=state.y-VIEW.h*.5;clampCamera();
 RT.stamp=0;RT.reelSpin=0;RT.birdT=0;RT.wheelTravel=0;RT.lifeT=0;RT.strawT=0;RT.dustT=0;RT.warnT=0;
 hud();
}
buildWorld();
loadSettings();VIEW.zoom=SETTINGS.zoom||0;size();
bindControls(reset,{unstuck:()=>TOW.unstuck(playerObbs,dynamicColliders),saveGame,loadGame:()=>loadGame(applyLoaded),hasSave,clearSave});
camera.x=state.x-VIEW.w*.5;camera.y=state.y-VIEW.h*.5;clampCamera();
// Diagnostyka (testy i debug)
window.__farmDebug={
 state:()=>({vehicle:state.vehicle,other:state.other,headerOn:state.headerOn,carts:state.carts,money:state.money,x:state.x,y:state.y,v:state.v,heading:state.angle,steer:state.steer,tool:state.tool,cut:state.cut,total:N,percent:state.cut/N*100,playing:state.playing,paused:state.paused,elapsed:state.elapsed,time:state.time,tank:state.tank,auger:state.auger,unloading:state.unloading,stored:state.stored,grain:state.grain}),
 setPosition:(x,y,a)=>{state.x=x;state.y=y;if(a!=null)state.angle=a;camera.x=x-VIEW.w/2;camera.y=y-VIEW.h/2;clampCamera()},
 setSpeed:v=>state.v=v,
 setTool:b=>state.tool=b,
 setKey:(key,held)=>held?keys.add(key):keys.delete(key),
 tick:(secs)=>{for(let i=0;i<Math.ceil(secs*60);i++)step(STEP);hud()},
 cutCell:(i,j)=>crop[j*FLD.n+i],
 life:()=>lifeInfo(),
 colliders:()=>MAP.colliders.length,
 overlap:()=>{let n=0;const near=nearbyColliders(state.x,state.y,120).concat(dynamicColliders());for(const o of playerObbs())for(const c of near)if(collide(o,c))n++;return n},
 toggleHeader,switchVehicle,trailer:TRL,tow:TOW,reset,set:o=>Object.assign(state,o),zoom:z=>{VIEW.zoom=Math.max(0,Math.min(VIEW.maxZoom,z));dispatchEvent(new Event('resize'))},view:()=>({...VIEW}),
 // Test przejezdności: BFS po stanach (komórka 8 px × 8 kierunków). Ruch: do przodu/do tyłu wzdłuż kierunku albo obrót w miejscu;
 // pozycja dozwolona, gdy żaden z obrysów kombajnu (z hederem lub bez) nie koliduje ze stałymi przeszkodami.
 reach:(withHeader,fx,fy,targets)=>{
  const S=8,X0=860,X1=1960,Y0=0,Y1=1150,W=Math.ceil((X1-X0)/S),H=Math.ceil((Y1-Y0)/S),K=COMBINE_SCALE;
  const pose=(x,y,a)=>{const c=Math.cos(a),s=Math.sin(a),off=(ly)=>[x-s*ly*K,y+c*ly*K];const [f1,f2]=off(-22.5),[r1,r2]=off(23),[h1,h2]=off(-54);
   const o=[obb(f1,f2,26*K,22.5*K,a),obb(r1,r2,22*K,23*K,a)];if(withHeader)o.push(obb(h1,h2,44*K,9*K,a));return o};
  const ok=(x,y,a)=>{if(x<X0+30||x>X1-30||y<38||y>Y1)return false;const near=nearbyColliders(x,y,110);for(const o of pose(x,y,a))for(const c of near)if(collide(o,c))return false;return true};
  const key=(x,y,k)=>((Math.round((y-Y0)/S)*W+Math.round((x-X0)/S))*8+k);
  const seen=new Uint8Array(W*H*8),q=[];
  let k0=0;{let best=9;for(let k=0;k<8;k++){const d=Math.abs(Math.atan2(Math.sin(k*Math.PI/4-state.angle),Math.cos(k*Math.PI/4-state.angle)));if(d<best){best=d;k0=k}}}
  if(!ok(fx,fy,k0*Math.PI/4))return{start:'zablokowany'};
  seen[key(fx,fy,k0)]=1;q.push([fx,fy,k0]);
  for(let h=0;h<q.length;h++){
   const [x,y,k]=q[h],a=k*Math.PI/4;
   const nb=[];
   for(const d of [1,-1]){nb.push([x+Math.sin(a)*S*d,y-Math.cos(a)*S*d,k]);nb.push([x,y,(k+d+8)%8])}
   for(const [nx,ny,nk] of nb){const kk=key(nx,ny,nk);if(nx<X0||ny<0||nx>=X1||ny>=Y1||seen[kk])continue;if(ok(nx,ny,nk*Math.PI/4)){seen[kk]=1;q.push([Math.round(nx/S)*S,Math.round(ny/S)*S,nk])}}
  }
  return targets.map(t=>{let hit=false;for(let k=0;k<8;k++)if(seen[key(t[0],t[1],k)])hit=true;return[t[0],t[1],hit]});
 },
 debug:b=>{DEBUG.on=b!=null?b:!DEBUG.on},
 camera:()=>({x:camera.x,y:camera.y,w:VIEW.w,h:VIEW.h,scale:VIEW.scale}),
 fieldInfo:()=>({ha:FIELD_HA,cut:state.cut,remaining:N-state.cut})
};
hud();requestAnimationFrame(run);
