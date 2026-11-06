// Punkt wejścia: symulacja, kamera, ekran, restart i testy.
// Zmiany 0.3.2 są organizacyjne, bez nowych obiektów ani mechanik.
import {C,ctx,VIEW,$,clamp,lerp,rect,WORLD,FLD,N,keys,state,camera,RT,fx,COMBINE_SCALE,MAXSPEED,ROAD_SPEED,REVERSE_SPEED,toast,FIELD_HA} from './core.js';
import {crop,fieldTile,tc} from './world.js';
import {harvest,updateTracks,particle} from './harvest.js';
import {worldOffset} from './vehicles.js';
import {drawWorld} from './render.js';
import {hud} from './ui.js';
import {updateSound,birdNote} from './sound.js';
import {bindControls} from './controls.js';
function approach(v,to,amount){return v<to?Math.min(v+amount,to):Math.max(v-amount,to)}
function step(dt){
 if(!state.playing)return;
 const fw=keys.has('w')||keys.has('arrowup'),bw=keys.has('s')||keys.has('arrowdown');
 const left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright');
 const input=(right?1:0)-(left?1:0);
 // Steering wheel has inertia, and steering geometry means no stationary spin.
 state.steer=approach(state.steer,input,dt*2.5);
 if(fw&&bw)state.v=approach(state.v,0,dt*22);
 else if(fw)state.v=approach(state.v,Math.max(0,state.tool?MAXSPEED:ROAD_SPEED),dt*(state.v<0?20:9));
 else if(bw)state.v=approach(state.v,-REVERSE_SPEED,dt*(state.v>0?23:8));
 else state.v=approach(state.v,0,dt*12);
 // Rear-steer bicycle model: rear axle deflects opposite to requested turn; yaw keeps intuitive controls. No stationary spin.
 const steerAngle=state.steer*.60;
 const yaw=state.v/38*Math.tan(steerAngle);
 state.angle+=yaw*dt;
 const dx=Math.sin(state.angle)*state.v*dt,dy=-Math.cos(state.angle)*state.v*dt;
 const nx=state.x+dx,ny=state.y+dy;
 state.x=clamp(nx,28,WORLD.w-28);
 state.y=clamp(ny,36,WORLD.h-36);
 // Building collisions: hold contact, do not reverse the machine through a building.
 for(const b of [[1080,214,155,124],[1097,445,205,152],[1362,592,100,94]]){
   const [x,y,w,h]=b;
   if(state.x>x-9&&state.x<x+w+9&&state.y>y-9&&state.y<y+h+9){
     state.x-=dx;state.y-=dy;state.v=0;
     if(RT.frame%150===0)toast('UWAŻAJ NA ZABUDOWANIA');
   }
 }
 RT.reelSpin+=state.tool?dt*12:0;RT.wheelTravel+=state.v*dt;RT.lifeT+=dt;
 harvest();updateTracks(dt);
 if(RT.frame%6===0&&Math.abs(state.v)>5){
   for(let k=0;k<(state.tool?2:1);k++){
     const [x,y]=worldOffset((Math.random()-.5)*34*COMBINE_SCALE,32*COMBINE_SCALE);
     particle('dust',x,y);
   }
 }
 for(let i=fx.length-1;i>=0;i--){
   let p=fx[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.life<=0)fx.splice(i,1);
 }
 state.elapsed+=dt;
 // One game second = one real second at 1x. T changes the clock, not the machine's speed.
 state.time+=dt*state.rate/60;
 RT.birdT+=dt;
 if(RT.birdT>16){RT.birdT=0;birdNote()}
 if(RT.msgT>0){RT.msgT-=dt;if(RT.msgT<=0)$('#msg').style.opacity='0'}
 updateSound(fw);
 const look=35,tx=state.x+Math.sin(state.angle)*look-VIEW.w*.48,ty=state.y-Math.cos(state.angle)*look-VIEW.h*.50;
 camera.x=lerp(camera.x,tx,Math.min(1,dt*5));camera.y=lerp(camera.y,ty,Math.min(1,dt*5));
}
function size(){let w=innerWidth,h=innerHeight;VIEW.h=360;VIEW.w=Math.round(clamp(w/h*VIEW.h,330,1200));C.width=VIEW.w;C.height=VIEW.h;ctx.imageSmoothingEnabled=false}
addEventListener('resize',size);size();
function run(ts){let dt=RT.last?Math.min((ts-RT.last)/1000,.05):1/60;RT.last=ts;RT.frame++;step(dt);drawWorld();if(RT.frame%8===0)hud();requestAnimationFrame(run)}
function reset(){
 crop.fill(0);state.cut=0;
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
 tc.clearRect(0,0,WORLD.w,WORLD.h);fx.length=0;keys.clear();
 Object.assign(state,{x:815,y:304,angle:-Math.PI/2,v:0,steer:0,tool:false,tank:0,work:0,done:false,time:16*60+35,elapsed:0,rate:1});
 camera.x=state.x-VIEW.w*.45;camera.y=state.y-VIEW.h*.6;
 RT.stamp=0;RT.reelSpin=0;RT.birdT=0;RT.wheelTravel=0;RT.lifeT=0;
 hud();
}

bindControls(reset);
// A lightweight diagnostic readout; no external dependencies or hidden backend.
window.__farmDebug={
 state:()=>({x:state.x,y:state.y,v:state.v,heading:state.angle,steer:state.steer,tool:state.tool,cut:state.cut,total:N,percent:state.cut/N*100,playing:state.playing,elapsed:state.elapsed,time:state.time,tank:state.tank}),
 setPosition:(x,y,a)=>{state.x=x;state.y=y;if(a!=null)state.angle=a},
 setSpeed:v=>state.v=v,
 setTool:b=>state.tool=b,
 setKey:(key,held)=>held?keys.add(key):keys.delete(key),
 tick:(secs)=>{for(let i=0;i<Math.ceil(secs*60);i++)step(1/60);hud()},
 cutCell:(i,j)=>crop[j*FLD.n+i],
 life:()=>({time:RT.lifeT,animals:5,people:2,traffic:2,neighborCombine:true}),
 fieldInfo:()=>({ha:FIELD_HA,cut:state.cut,remaining:N-state.cut})
};
hud();requestAnimationFrame(run);
