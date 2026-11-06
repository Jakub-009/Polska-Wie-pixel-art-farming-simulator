// Życie wsi (0.4.0): pojazdy NPC jeżdżą po grafie dróg z mapy, piesi chodzą po trasach,
// wszyscy mają kolizje i reagują na kombajn gracza (hamują / czekają).
import {ctx,rect,line,hash,FLD,camera,VIEW,state,RT,clamp,WORLD} from './core.js';
import {crop} from './world.js';
import {drawMachineAt,playerObbs} from './vehicles.js';
import {MAP,ROADS} from './map.js';
import {obb,circle,collide} from './geometry.js';

// ───────── rysowanie dekoracji reagujących na wiatr ─────────
function drawLivingWorld(){
 const t=state.elapsed;
 ctx.globalAlpha=.31;
 for(let i=0;i<145;i++){
  const px=hash(i,411)*FLD.w,py=hash(i,416)*FLD.h;
  if(crop[Math.floor(py/FLD.t)*FLD.n+Math.floor(px/FLD.t)])continue;
  rect(ctx,FLD.x+px+Math.round(Math.sin(t*1.1+hash(i,72)*6)*1.9),FLD.y+py,2,1,'#fff0ae');
 }
 ctx.globalAlpha=1;
}
// Czubki drzew w sadzie — rysowane PO koronach (warstwa nadziemna).
function drawCanopyLife(){
 const t=state.elapsed;let i=0;
 for(const tr of MAP.trees){if(tr.tag!=='orchard')continue;
  rect(ctx,tr.x+Math.round(Math.sin(t*.9+i*.8)*2)-5,tr.y-19*tr.s,4,2,'#a9b77b');i++}
}

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

// ───────── pojazdy NPC na grafie dróg ─────────
// hh/hw: półwymiary obrysu (px), cy: przesunięcie środka obrysu wzdłuż osi pojazdu (+ = do tyłu), lane: odsunięcie od osi jezdni.
const SPECS={
 car:{speed:34,hw:12,hh:24,cy:-1,lane:14,allow:['road']},
 tractor:{speed:22,hw:16,hh:27,cy:3,lane:18,allow:['road','drive']},
 combine:{speed:14,hw:36,hh:46,cy:-7,lane:6,allow:['road']}
};
const TURN_RATE=2.4; // rad/s
const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
const inWorld=p=>p[0]>-10&&p[0]<WORLD.w+10&&p[1]>-10&&p[1]<WORLD.h+10;

class Walker{
 constructor(kind,from,to,s,opts={}){
  Object.assign(this,{kind,spec:SPECS[kind],from,to,s,v:0,travel:0,turns:0,dwell:0,steer:0,color:opts.color||'#8c9b95',seed:opts.seed||1,blocked:false,pos:[0,0],obbShape:null});
  this.setEdge(from,to);this.heading=this.dirHeading;this.place();
 }
 setEdge(from,to){
  this.from=from;this.to=to;
  const A=ROADS.nodes[from],B=ROADS.nodes[to];
  this.len=Math.hypot(B[0]-A[0],B[1]-A[1]);
  this.dx=(B[0]-A[0])/this.len;this.dy=(B[1]-A[1])/this.len;
  this.dirHeading=Math.atan2(this.dx,-this.dy);
 }
 place(){
  const A=ROADS.nodes[this.from],cx=A[0]+this.dx*this.s,cy=A[1]+this.dy*this.s;
  const h=this.heading,l=this.spec.lane;
  this.pos=[cx+Math.cos(h)*l,cy+Math.sin(h)*l];
  const back=this.spec.cy;
  this.obbShape=obb(this.pos[0]-Math.sin(h)*back,this.pos[1]+Math.cos(h)*back,this.spec.hw,this.spec.hh,h);
 }
 probe(){ // prostokąt przed pojazdem; wykrywa kombajn, innych i pieszych
  const h=this.heading,sp=this.spec,reach=18+this.v*.55,half=reach/2;
  const d=sp.hh+sp.cy*0+half;
  return obb(this.pos[0]+Math.sin(h)*d,this.pos[1]-Math.cos(h)*d,sp.hw*.8,half,h);
 }
 update(dt,others,people){
  if(this.dwell>0){this.dwell-=dt;this.v=0}
  else{
   const pr=this.probe();let blocked=false;
   for(const o of playerObbs())if(collide(pr,o)){blocked=true;break}
   // inne pojazdy blokują tylko jadąc w tę samą stronę (mijanie się na wąskiej drodze nie powoduje zakleszczenia)
   if(!blocked)for(const w of others)if(w!==this&&Math.cos(w.heading-this.heading)>.5&&collide(pr,w.obbShape)){blocked=true;break}
   if(!blocked)for(const p of people)if(collide(pr,p.shape)){blocked=true;break}
   this.blocked=blocked;
   const target=blocked?0:this.spec.speed;
   this.v+=clamp(target-this.v,-70*dt,22*dt);
  }
  this.s+=this.v*dt;this.travel+=this.v*dt;
  if(this.s>=this.len)this.arrive();
  // powolny obrót do kierunku jazdy (zakręty i zawracanie)
  const dh=angDiff(this.heading,this.dirHeading),step=clamp(dh,-TURN_RATE*dt,TURN_RATE*dt);
  this.heading+=step;this.steer=clamp(step/(TURN_RATE*dt||1),-1,1);
  this.place();
 }
 arrive(){
  const node=this.to,prev=this.from;
  const opts=ROADS.neighbours(node).filter(n=>this.spec.allow.includes(n.edge.kind));
  const forward=opts.filter(n=>n.to!==prev);
  const outside=!inWorld(ROADS.nodes[node]);
  let next;
  if(forward.length)next=forward[Math.floor(hash(this.turns++,this.seed,node.length)*forward.length)];
  else next=opts.find(n=>n.to===prev); // ślepy zaułek: zawracanie
  if(!next){this.s=this.len;return}
  const overflow=this.s-this.len;
  this.setEdge(node,next.to);this.s=Math.max(0,overflow);
  if(!forward.length){
   if(outside)this.heading=this.dirHeading; // poza mapą — zawracamy niewidocznie
   else this.dwell=1.4;                      // na podwórzu — wolne zawracanie
  }
 }
 draw(){
  const [x,y]=this.pos;
  if(this.kind==='car')carTop(ctx,x,y,this.color,this.heading);
  else if(this.kind==='tractor')miniTractor(ctx,x,y,this.heading,false);
  else if(nearCam(x,y,95))drawMachineAt(ctx,x,y,this.heading,this.steer*.5,this.travel,false);
 }
}

// ───────── piesi ─────────
class Person{
 constructor(route,speed,coat,scale,wait,phase){Object.assign(this,{route,speed,coat,scale,wait,idx:0,dir:1,t:phase,x:route[0][0],y:route[0][1],waitT:0,step:0,shape:circle(route[0][0],route[0][1],5)})}
 update(dt){
  const dist=Math.hypot(state.x-this.x,state.y-this.y);
  if(dist<95&&Math.abs(state.v)>1){this.shape=circle(this.x,this.y,5);return} // przepuszcza maszynę
  if(this.waitT>0){this.waitT-=dt;return}
  const tgt=this.route[this.idx+this.dir];
  const dx=tgt[0]-this.x,dy=tgt[1]-this.y,d=Math.hypot(dx,dy),stp=this.speed*dt;
  if(d<=stp){this.x=tgt[0];this.y=tgt[1];this.idx+=this.dir;if(this.idx===0||this.idx===this.route.length-1){this.dir=-this.dir;this.waitT=this.wait}}
  else{this.x+=dx/d*stp;this.y+=dy/d*stp}
  this.step+=dt*(this.speed/5);
  this.shape=circle(this.x,this.y,5);
 }
 draw(){pixelPerson(ctx,this.x,this.y,this.coat,Math.floor(this.step),this.scale)}
}

const walkers=[
 new Walker('car','nS','jX',420,{color:'#8c9b95',seed:3}),
 new Walker('car','nN','jD',150,{color:'#a4684f',seed:5}),
 new Walker('tractor','nN','jD',60,{seed:7}),
 new Walker('combine','nW','jX',120,{seed:11})
];
const people=[
 new Person([[1124,428],[1359,438]],15,'#526c65',1,5,0),
 new Person([[1180,806],[1400,806]],13,'#a57660',1.1,6,0)
];

// Wywoływane z kroku symulacji.
function updateLife(dt){
 for(const w of walkers)w.update(dt,walkers,people);
 for(const p of people)p.update(dt);
}
// Dynamiczne przeszkody dla kolizji gracza.
function dynamicColliders(){
 const out=[];
 for(const w of walkers)out.push({...w.obbShape,id:w.kind});
 for(const p of people)out.push({...p.shape,id:'person'});
 return out;
}
function lifeInfo(){return{time:RT.lifeT,vehicles:walkers.map(w=>({kind:w.kind,x:w.pos[0],y:w.pos[1],v:w.v,blocked:w.blocked,edge:w.from+'>'+w.to})),people:people.map(p=>({x:p.x,y:p.y})),animals:5}}

function drawVillageLife(){
 const t=RT.lifeT,pa=MAP.pasture;
 for(let i=0;i<4;i++){
  const x=clamp(68+(i%2)*68+Math.sin(t*.13+i*2)*11,pa.x0+20,pa.x1-20);
  const y=clamp(405+Math.floor(i/2)*235+Math.cos(t*.09+i*1.7)*12,pa.y0+20,pa.y1-20);
  cow(ctx,x,y,t*.8+i*4,i===2?.9:1);
 }
 const deerCycle=t%66;
 if(deerCycle<22)deer(ctx,44+deerCycle*7.7,1018+Math.sin(deerCycle*.3)*7,deerCycle*4);
 for(const p of people)p.draw();
 for(const w of walkers)w.draw();
 birds(ctx,t);
}

export {drawLivingWorld,drawCanopyLife,drawVillageLife,updateLife,dynamicColliders,lifeInfo};
