// Kolejność warstw gry; HUD pozostaje w HTML/CSS.
// 0.4.0: rysowanie tylko widocznego wycinka warstw, dachy i korony nad pojazdami, nakładka debug (F3).
import {ctx,VIEW,clamp,rect,line,state,camera,fx,FLD,DEBUG,RT} from './core.js';
import {ground,field,tracks,decorLow,decorHigh} from './world.js';
import {drawAllVehicles,playerObbs,otherObbs} from './vehicles.js';
import {drawMarkers} from './markers.js';
import {drawSiloGauges} from './silo.js';
import {drawLivingWorld,drawVillageLife,drawCanopyLife,dynamicColliders} from './life.js';
import {MAP} from './map.js';
import {obbCorners} from './geometry.js';
function blit(cv){
 const cx=Math.floor(camera.x),cy=Math.floor(camera.y);
 const sx=Math.max(0,cx),sy=Math.max(0,cy),ex=Math.min(cv.width,cx+VIEW.w),ey=Math.min(cv.height,cy+VIEW.h);
 if(ex>sx&&ey>sy)ctx.drawImage(cv,sx,sy,ex-sx,ey-sy,sx,sy,ex-sx,ey-sy);
}
function drawParticles(){for(let p of fx){let k=clamp(p.life/p.max,0,1);ctx.globalAlpha=k*.72;rect(ctx,p.x,p.y,p.size,p.size,p.type==='dust'?'#e9d3a3':p.type==='grain'?'#f0c453':p.type==='splash'?'#a9cdd1':'#f4d881');ctx.globalAlpha=1}}
function outline(o,col){
 ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();
 if(o.shape==='circle')ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
 else{const c=obbCorners(o);ctx.moveTo(c[0][0],c[0][1]);for(let i=1;i<4;i++)ctx.lineTo(c[i][0],c[i][1]);ctx.closePath()}
 ctx.stroke();
}
function drawDebug(){
 for(const c of MAP.colliders)outline(c,'#ff4040');
 for(const c of dynamicColliders())outline(c,'#ff40ff');
 for(const o of playerObbs())outline(o,'#ffe040');
 for(const o of otherObbs())outline(o,'#ff40ff');
 ctx.strokeStyle='#40e0ff';ctx.lineWidth=1;
 for(const e of MAP.roads.edges){const A=MAP.nodes[e.a],B=MAP.nodes[e.b];ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
}
function drawWorld(){
 ctx.save();ctx.translate(-Math.floor(camera.x),-Math.floor(camera.y));
 ctx.fillStyle='#3f5a3c';ctx.fillRect(Math.floor(camera.x),Math.floor(camera.y),VIEW.w+1,VIEW.h+1);
 blit(ground);ctx.drawImage(field,FLD.x,FLD.y);
 line(ctx,FLD.x,FLD.y,FLD.x+FLD.w,FLD.y,'#c8b67b');
 line(ctx,FLD.x,FLD.y+FLD.h,FLD.x+FLD.w,FLD.y+FLD.h,'#857b57');
 line(ctx,FLD.x,FLD.y,FLD.x,FLD.y+FLD.h,'#a8996a');
 line(ctx,FLD.x+FLD.w,FLD.y,FLD.x+FLD.w,FLD.y+FLD.h,'#a8996a');
 blit(tracks);blit(decorLow);
 drawLivingWorld();drawVillageLife();drawAllVehicles();drawMarkers();drawParticles();
 blit(decorHigh);drawSiloGauges(ctx);drawCanopyLife();
 if(DEBUG.on)drawDebug();
 ctx.restore();
 const hour=state.time/60,twilight=clamp((hour-17.6)/3,0,1);
 ctx.fillStyle=`rgba(248,171,94,${.012+twilight*.085})`;ctx.fillRect(0,0,VIEW.w,VIEW.h);
 const rg=ctx.createRadialGradient(VIEW.w*.47,VIEW.h*.43,VIEW.h*.1,VIEW.w*.5,VIEW.h*.5,Math.max(VIEW.w,VIEW.h)*.67);
 rg.addColorStop(0,'#00000000');rg.addColorStop(1,'#1e342314');ctx.fillStyle=rg;ctx.fillRect(0,0,VIEW.w,VIEW.h);
 if(DEBUG.on){ctx.fillStyle='#000a';ctx.fillRect(2,2,150,32);ctx.fillStyle='#fff';ctx.font='8px monospace';
  ctx.fillText(`FPS ${DEBUG.fps}  skala ${VIEW.scale}x  widok ${VIEW.w}x${VIEW.h}`,5,12);
  ctx.fillText(`x ${state.x.toFixed(0)} y ${state.y.toFixed(0)}  kontakty ${DEBUG.contacts}`,5,24)}
}
export {drawWorld};
