// Kolejność warstw gry; HUD pozostaje w HTML/CSS.
import {ctx,VIEW,clamp,rect,line,state,camera,fx,FLD} from './core.js';
import {ground,field,tracks,decor} from './world.js';
import {drawHarvester} from './vehicles.js';
import {drawLivingWorld,drawVillageLife} from './life.js';
function drawParticles(){for(let p of fx){let k=clamp(p.life/p.max,0,1);ctx.globalAlpha=k*.72;rect(ctx,p.x,p.y,p.size,p.size,p.type==='dust'?'#e9d3a3':'#f4d881');ctx.globalAlpha=1}}
function drawWorld(){
 ctx.save();ctx.translate(-Math.floor(camera.x),-Math.floor(camera.y));
 ctx.drawImage(ground,0,0);ctx.drawImage(field,FLD.x,FLD.y);
 line(ctx,FLD.x,FLD.y,FLD.x+FLD.w,FLD.y,'#c8b67b');
 line(ctx,FLD.x,FLD.y+FLD.h,FLD.x+FLD.w,FLD.y+FLD.h,'#857b57');
 ctx.drawImage(tracks,0,0);ctx.drawImage(decor,0,0);
 drawLivingWorld();drawVillageLife();drawParticles();drawHarvester();ctx.restore();
 // The evening grade changes only over game time; no full-screen orange wash.
 const hour=state.time/60,twilight=clamp((hour-17.6)/3,0,1);
 ctx.fillStyle=`rgba(248,171,94,${.026+twilight*.085})`;ctx.fillRect(0,0,VIEW.w,VIEW.h);
 const rg=ctx.createRadialGradient(VIEW.w*.47,VIEW.h*.43,VIEW.h*.1,VIEW.w*.5,VIEW.h*.5,Math.max(VIEW.w,VIEW.h)*.67);
 rg.addColorStop(0,'#00000000');rg.addColorStop(1,'#1e342323');ctx.fillStyle=rg;ctx.fillRect(0,0,VIEW.w,VIEW.h);
}

export {drawWorld};
