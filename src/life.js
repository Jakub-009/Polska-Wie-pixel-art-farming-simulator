// Ruchome dekoracje wsi: ptaki, piesi, krowy, samochody i kombajn NPC.
// W 0.3.2 ruch NPC pozostaje dekoracyjny; kolizje powstaną w kolejnym etapie.
import {ctx,rect,line,hash,FLD,camera,VIEW,state,RT} from './core.js';
import {crop} from './world.js';
import {drawMachineAt} from './vehicles.js';
function drawLivingWorld(){
 // Wheat responds to the wind; a few highlights shift gently, without replacing planted tiles.
 const t=state.elapsed;
 ctx.globalAlpha=.31;
 for(let i=0;i<145;i++){
   const px=hash(i,411)*FLD.w,py=hash(i,416)*FLD.h;
   const ix=Math.floor(px/FLD.t),iy=Math.floor(py/FLD.t);
   if(crop[iy*FLD.n+ix])continue;
   const wob=Math.round(Math.sin(t*1.1+hash(i,72)*6)*1.9);
   rect(ctx,FLD.x+px+wob,FLD.y+py,2,1,'#fff0ae');
 }
 ctx.globalAlpha=1;
 // Animated tips and subtle flecks on the orchard trees; 1–2 px sway only.
 for(let i=0;i<12;i++){
   const x=1510+(i%4)*37,y=463+Math.floor(i/4)*87;
   const wob=Math.round(Math.sin(t*.9+i*.8)*2);
   rect(ctx,x+wob-5,y-19,4,2,'#a9b77b');
 }

}
// Living Polish village: simple deterministic timelines, not an expensive AI simulation.
// Decorative pedestrians, cattle, deer and traffic cannot collide with the combine in 0.3.
function nearCam(x,y,r=70){return x>camera.x-r&&x<camera.x+VIEW.w+r&&y>camera.y-r&&y<camera.y+VIEW.h+r}
function pixelPerson(g,x,y,coat='#69865d',step=0,scale=1){
 if(!nearCam(x,y,16))return;
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
 rect(g,1,2,5,3,'#40544055');
 rect(g,-2,-7,5,6,coat);rect(g,-1,-10,3,4,'#dbb28c');
 rect(g,-2,-11,4,2,'#67533c');rect(g,-1,-1,2,3,'#4b5247');rect(g,2,-1+(step%2),2,3,'#384942');
 g.restore();
}
function cow(g,x,y,phase=0,scale=1){
 if(!nearCam(x,y,24))return;
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
 rect(g,5,8,19,5,'#41564255');
 rect(g,-9,-5,17,12,'#ede4ce');rect(g,-7,-3,5,5,'#5a4d41');rect(g,0,1,5,5,'#584d44');
 rect(g,7,-4,7,8,'#e3d8c0');rect(g,11,-2,4,4,'#c29b83');
 rect(g,-6,-7,4,3,'#4d443c');
 for(let i=0;i<4;i++)rect(g,-6+(i%2)*13,4+(i>1?1:0),3,4,'#746858');
 const a=Math.round(Math.sin(phase)*2);rect(g,-13,-4+a,4,2,'#c6bfa9');rect(g,10,-5,2,1,'#453d35');
 g.restore();
}
function deer(g,x,y,phase=0){
 if(!nearCam(x,y,25))return;
 g.save();g.translate(Math.round(x),Math.round(y));
 rect(g,4,9,18,3,'#3e5b4855');rect(g,-7,-6,12,8,'#a97c55');rect(g,2,-8,6,6,'#bf9166');
 rect(g,6,-10,2,4,'#91734d');rect(g,9,-10,2,4,'#8b6a4e');
 for(let a=-6;a<7;a+=8)rect(g,a,0+Math.sin(phase+a)*1,2,7,'#7a5f46');
 rect(g,-10,-7,4,3,'#e4c9a0');g.restore();
}
function carTop(g,x,y,col,heading=0){
 if(!nearCam(x,y,58))return;
 g.save();g.translate(Math.round(x),Math.round(y));g.rotate(heading);
 rect(g,-10,-22,27,47,'#37474355');
 for(let a of [-12,9]){rect(g,a,-15,5,9,'#2e3434');rect(g,a,10,5,10,'#303836')}
 rect(g,-9,-23,22,46,'#414944');rect(g,-8,-24,20,45,col);
 rect(g,-6,-12,16,13,'#668d97');rect(g,-5,-10,14,7,'#a1b6ba');
 rect(g,-6,9,16,7,'#637c81');rect(g,-6,20,5,3,'#d2b889');rect(g,5,20,5,3,'#bf9b71');
 rect(g,-6,-25,5,2,'#ecddb6');rect(g,5,-25,5,2,'#e8d4a8');
 g.restore();
}
function miniTractor(g,x,y,heading=0,working=false){
 if(!nearCam(x,y,45))return;
 g.save();g.translate(Math.round(x),Math.round(y));g.rotate(heading);
 rect(g,7,9,28,9,'#3b4a3f65');
 for(let a of [-17,9]){rect(g,-14,a,7,11,'#343a35');rect(g,10,a,7,11,'#343a35')}
 rect(g,-9,-22,22,46,'#98513b');rect(g,-7,-20,17,22,'#c26440');
 rect(g,-8,4,19,16,'#567d7a');rect(g,-6,6,15,11,'#9cb5a5');
 rect(g,-7,-20,16,4,'#d18851');
 if(working){rect(g,-22,21,43,7,'#7c876c');for(let i=0;i<7;i++)rect(g,-20+i*6,27,3,4,'#9d8c65')}
 g.restore();
}
function birds(g,t){
 const t0=t*.67;
 for(let i=0;i<7;i++){
  const cycle=(t0+i*83)%490;
  const bx=(i%2?1660-cycle*3:cycle*3-90);
  const by=100+((i*173)%960)+Math.sin(t*.9+i)*6;
  if(!nearCam(bx,by,9))continue;
  const flap=Math.sin(t*6.5+i*3)>.15?-2:2;
  line(g,bx-5,by+flap,bx,by,'#4c5c4f',1);
  line(g,bx,by,bx+5,by+flap,'#4c5c4f',1);
 }
}
function drawVillageLife(){
 const t=RT.lifeT;
 // Cows on the west pasture; slow meandering and grazing, naturally separated from farmland.
 for(let i=0;i<4;i++){
  const x=68+(i%2)*68+Math.sin(t*.13+i*2)*11;
  const y=405+Math.floor(i/2)*235+Math.cos(t*.09+i*1.7)*12;
  cow(ctx,x,y,t*.8+i*4,i===2?.9:1);
 }
 // A deer emerges intermittently near the forest margin, then crosses the glade.
 const deerCycle=t%66;
 if(deerCycle<22){const dx=44+deerCycle*7.7,dy=1018+Math.sin(deerCycle*.3)*7;deer(ctx,dx,dy,deerCycle*4)}
 // Two farm workers walking between the house, orchard and machinery.
 const route=(t%38)/38,walk=route<.42?route/.42:route<.57?1:route<.96?1-(route-.57)/.39:0;
 pixelPerson(ctx,1124+walk*235,426+Math.sin(walk*Math.PI)*10,'#526c65',Math.floor(t*3));
 const route2=(t%46)/46,walk2=route2<.48?route2/.48:route2<.63?1:route2<.95?1-(route2-.63)/.32:0;
 pixelPerson(ctx,1220+walk2*145,791-60*walk2,'#a57660',Math.floor(t*2.6),1.1);
 // Passing traffic follows the actual long north-south lane; speed is in world px/s.
 const pass=(t*21+500)%1630;
 carTop(ctx,945,1345-pass,'#8c9b95',0);
 const pass2=(t*12+240)%2100;
 if(pass2<1260)miniTractor(ctx,944,pass2,Math.PI,false);
 // Second combine uses EXACTLY the same sprite, wheel geometry and scale as the player's machine.
 const pass3=(t*10)%1450,segment=pass3%725,reverse=Math.floor(pass3/725)%2===1;
 const otherX=140+(reverse?725-segment:segment),otherY=1152+(reverse?42:0);
 if(nearCam(otherX,otherY,95))drawMachineAt(ctx,otherX,otherY,reverse?-Math.PI/2:Math.PI/2,0,pass3,true);
 birds(ctx,t);
}

export {drawLivingWorld,drawVillageLife};
