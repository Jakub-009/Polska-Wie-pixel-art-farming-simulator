// Życie wsi (0.4.0): pojazdy NPC jeżdżą po grafie dróg z mapy, piesi chodzą po trasach,
// wszyscy mają kolizje i reagują na kombajn gracza (hamują / czekają).
import {ctx,rect,line,hash,FLD,camera,VIEW,state,RT,clamp,WORLD,LIGHT} from './core.js';
import {crop} from './world.js';
import {drawMachineAt,playerObbs,orientedShadow,drawRotated} from './vehicles.js';
import {MAP,ROADS,pointBlocked} from './map.js';
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
  rect(ctx,tr.x+Math.round(Math.sin(t*.9+i*.8)*2)-5,tr.y-tr.r*tr.s*.85,4,2,'#a9b77b');i++}
}

function nearCam(x,y,r=70){return x>camera.x-r&&x<camera.x+VIEW.w+r&&y>camera.y-r&&y<camera.y+VIEW.h+r}
// Wszystkie sprite'y rysowane ściśle z góry; cień pada zgodnie z LIGHT.
function blob(g,x,y,rx,ry,h){g.fillStyle='#3d563b55';g.beginPath();g.ellipse(Math.round(x+LIGHT.x*h),Math.round(y+LIGHT.y*h),rx,ry,Math.atan2(LIGHT.y,LIGHT.x),0,Math.PI*2);g.fill()}
function pixelPerson(g,x,y,coat='#69865d',step=0){
 if(!nearCam(x,y,16))return;
 x=Math.round(x);y=Math.round(y);blob(g,x,y,6,3,6);
 const dark='#33463d';
 rect(g,x-2,y+3+(step%2),2,3,'#3f463f');rect(g,x+1,y+3+((step+1)%2),2,3,'#3f463f'); // stopy
 rect(g,x-5,y-1,2,5,dark);rect(g,x+4,y-1,2,5,dark);                                  // ramiona
 rect(g,x-4,y-2,9,6,coat);rect(g,x-4,y-2,9,1,'#ffffff22');                           // barki
 rect(g,x-2,y-4,5,5,'#dbb28c');rect(g,x-2,y-5,5,3,'#67533c');                        // głowa i włosy
}
// Zwierzęta i pojazdy: sprite rysowany głową w prawo (zwierzęta) lub do góry (pojazdy) i obracany ostro (drawRotated).
const COATS=[['#ede4ce','#4d443c','#584d44'],['#e8dcc4','#6b4a35','#7a5640'],['#f1eadb','#3c3834','#4a4540'],['#d9c4a2','#8a5a3b','#9a6a48']];
function drawCow(g,x,y,heading,coat,grazing,phase){
 if(!nearCam(x,y,40))return;
 blob(g,x,y,18,7,7);
 const [base,p1,p2]=COATS[coat];
 drawRotated(g,x,y,heading,s=>{
  rect(s,-15,-6,26,12,'#cfc4aa');rect(s,-14,-6,24,11,base);
  rect(s,-11,-5,7,6,p1);rect(s,-1,0,7,5,p2);rect(s,6,-5,4,4,p1);rect(s,-14,2,4,3,p2);
  const hy=grazing?2:0; // głowa przy trawie
  rect(s,10+hy,-4,7,8,'#e3d8c0');rect(s,16+hy,-2,3,5,'#c9a08c');
  rect(s,10+hy,-6,3,2,p1);rect(s,10+hy,4,3,2,p1);
  rect(s,-19,-1+Math.round(Math.sin(phase*2)*2),5,2,'#c6bfa9');
 });
}
function drawDeer(g,x,y,heading,phase,running){
 if(!nearCam(x,y,40))return;
 blob(g,x,y,15,5,6);
 const bob=running?Math.round(Math.sin(phase*1.8)):0;
 drawRotated(g,x,y+bob*0,heading,s=>{
  rect(s,-12,-4,22,9,'#8f6a47');rect(s,-11,-4,20,7,'#a97c55');rect(s,-8,-1,14,2,'#93694a');
  rect(s,9,-3,8,6,'#bf9166');rect(s,16,-2,3,4,'#6b523c');
  rect(s,10,-6,3,3,'#91734d');rect(s,10,4,3,3,'#91734d');
  rect(s,-15,-2,4,4,'#e4c9a0');
  const st=Math.round(Math.sin(phase*(running?3:1.4))*2); // kroki: nogi widoczne po bokach
  rect(s,-8+st,-6,3,2,'#7a5f46');rect(s,-8-st,5,3,2,'#7a5f46');rect(s,5-st,-6,3,2,'#7a5f46');rect(s,5+st,5,3,2,'#7a5f46');
 });
}
function carTop(g,x,y,col,heading=0){
 if(!nearCam(x,y,64))return;
 orientedShadow(g,x,y,heading,[[13,27,0]],10,'#37474355');
 drawRotated(g,x,y,heading,s=>{
  for(let a of [-13,9]){rect(s,a,-19,5,10,'#2e3434');rect(s,a,12,5,11,'#303836')}
  rect(s,-11,-27,22,54,'#414944');rect(s,-10,-28,20,53,col);
  rect(s,-8,-16,16,14,'#668d97');rect(s,-7,-14,14,7,'#a1b6ba');
  rect(s,-8,12,16,8,'#637c81');rect(s,-8,24,5,3,'#d2b889');rect(s,3,24,5,3,'#bf9b71');
  rect(s,-8,-29,5,2,'#ecddb6');rect(s,3,-29,5,2,'#e8d4a8');
 });
}
function miniTractor(g,x,y,heading=0,working=false){
 if(!nearCam(x,y,64))return;
 orientedShadow(g,x,y,heading,[[17,31,0]],14,'#3b4a3f55');
 drawRotated(g,x,y,heading,s=>{
  rect(s,-17,-24,7,13,'#2f3531');rect(s,10,-24,7,13,'#2f3531');   // przednie koła
  rect(s,-18,4,9,24,'#2f3531');rect(s,9,4,9,24,'#2f3531');         // tylne koła
  for(let t=6;t<26;t+=5){rect(s,-18,t,3,2,'#6d7468');rect(s,15,t,3,2,'#6d7468')}
  rect(s,-7,-31,14,30,'#98513b');rect(s,-6,-30,12,26,'#c26440');rect(s,-5,-30,10,3,'#d18851'); // maska
  rect(s,-10,-3,20,26,'#98513b');rect(s,-9,-2,18,24,'#567d7a');rect(s,-7,0,14,16,'#9cb5a5'); // kabina
  rect(s,-8,22,16,8,'#b4623f');rect(s,-2,29,4,3,'#444a44');       // tył i zaczep
  if(working){rect(s,-22,31,43,7,'#7c876c')}
 });
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
 car:{speed:34,hw:12,hh:27,cy:0,lane:14,allow:['road']},
 tractor:{speed:22,hw:17,hh:31,cy:0,lane:18,allow:['road']},
 combine:{speed:14,hw:44,hh:55,cy:-9,lane:6,allow:['road']}
};
const TURN_RATE=2.4; // rad/s
const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
const inWorld=p=>p[0]>-10&&p[0]<WORLD.w+10&&p[1]>-10&&p[1]<WORLD.h+10;

class Walker{
 constructor(kind,from,to,s,opts={}){
  Object.assign(this,{kind,spec:SPECS[kind],from,to,s,v:0,travel:0,turns:0,dwell:0,steer:0,color:opts.color||'#8c9b95',seed:opts.seed||1,blocked:false,blockT:0,ghost:false,ghostT:0,pos:[0,0],obbShape:null});
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
   const mine=playerObbs();
   if(!this.ghost)for(const o of mine)if(collide(pr,o)){blocked=true;break}
   // inne pojazdy blokują tylko jadąc w tę samą stronę (mijanie się na wąskiej drodze nie powoduje zakleszczenia)
   if(!blocked)for(const w of others)if(w!==this&&Math.cos(w.heading-this.heading)>.5&&collide(pr,w.obbShape)){blocked=true;break}
   if(!blocked)for(const p of people)if(collide(pr,p.shape)){blocked=true;break}
   this.blocked=blocked;
   // Anty-zakleszczenie: jeśli gracz blokuje pojazd >5 s, ten staje się „duchem” (przejeżdża przez kombajn), aż się rozdzielą.
   this.blockT=blocked?this.blockT+dt:0;
   if(!this.ghost&&this.blockT>5){this.ghost=true;this.ghostT=0}
   if(this.ghost){this.ghostT+=dt;let touch=false;for(const o of mine)if(collide(this.obbShape,o)||collide(pr,o)){touch=true;break}
    if(!touch&&this.ghostT>2)this.ghost=false}
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
 draw(){pixelPerson(ctx,this.x,this.y,this.coat,Math.floor(this.step))}
}

// ───────── stado krów: stany pasie się / idzie, płynny obrót, trzymanie się razem, omijanie ─────────
class Cow{
 constructor(i){
  const pa=MAP.pasture;this.i=i;this.coat=i%COATS.length;
  // każda krowa ma „swój rejon” rozłożony wzdłuż całego pastwiska (pasie się i wędruje głównie tam)
  this.homeY=pa.y0+40+(i+.5)/9*(pa.y1-pa.y0-80);this.homeX=pa.x0+30+hash(i,1)*(pa.x1-pa.x0-60);
  this.x=this.homeX;this.y=this.homeY+(hash(i,2)-.5)*60;
  this.heading=hash(i,3)*6.28;this.v=0;this.state='graze';this.t=2+hash(i,4)*8;this.tx=this.x;this.ty=this.y;this.rng=i*977;this.phase=hash(i,5)*6;
 }
 rand(){this.rng=(Math.imul(this.rng,1664525)+1013904223)|0;return((this.rng>>>0)%100000)/100000}
 pick(herd){
  const pa=MAP.pasture,r=this.rand();
  if(r<.4){this.state='graze';this.t=4+this.rand()*10;return}
  // cel: najczęściej w okolicy własnego rejonu, czasem gdziekolwiek na łące, rzadko przy innej krowie
  let bx,by,sx,sy;
  if(r<.8){bx=this.homeX;by=this.homeY;sx=70;sy=110}
  else if(r<.93){bx=(pa.x0+pa.x1)/2;by=pa.y0+(pa.y1-pa.y0)*this.rand();sx=60;sy=40}
  else{const o=herd[Math.floor(this.rand()*herd.length)];bx=o.x;by=o.y;sx=40;sy=40}
  this.tx=clamp(bx+(this.rand()*2-1)*sx,pa.x0+22,pa.x1-22);this.ty=clamp(by+(this.rand()*2-1)*sy,pa.y0+24,pa.y1-24);
  this.state='walk';this.t=40;
 }
 update(dt,herd){
  this.phase+=dt;this.t-=dt;
  let ax=0,ay=0;
  for(const o of herd){if(o===this)continue;const dx=this.x-o.x,dy=this.y-o.y,d=Math.hypot(dx,dy);if(d<34&&d>.01){ax+=dx/d*(34-d);ay+=dy/d*(34-d)}}
  if(this.state==='graze'){this.v+=clamp(0-this.v,-30*dt,30*dt);if(this.t<=0)this.pick(herd)}
  else{
   const dx=this.tx-this.x,dy=this.ty-this.y,d=Math.hypot(dx,dy);
   if(d<8||this.t<=0){this.state='graze';this.t=3+this.rand()*8}
   else{const want=Math.atan2(dy+ay*2,dx+ax*2);const df=angDiff(this.heading,want);this.heading+=clamp(df,-1.3*dt,1.3*dt);this.v+=clamp(9-this.v,-20*dt,12*dt)}
  }
  const pa=MAP.pasture;
  this.x=clamp(this.x+Math.cos(this.heading)*this.v*dt+ax*dt*.6,pa.x0+16,pa.x1-16);
  this.y=clamp(this.y+Math.sin(this.heading)*this.v*dt+ay*dt*.6,pa.y0+16,pa.y1-16);
 }
 draw(){drawCow(ctx,this.x,this.y,this.heading,this.coat,this.state==='graze',this.phase)}
}
// ───────── jelenie: grupy wędrują po trasach przez otwarte pola, żerują, a przed maszyną uciekają ─────────
class DeerGroup{
 constructor(route,n,seed){
  this.route=route;this.seed=seed;this.idx=0;this.dir=1;this.waitT=2+hash(seed,1)*5;this.running=false;
  this.members=Array.from({length:n},(_,k)=>({ox:(hash(seed,k+2)-.5)*34,oy:(hash(seed,k+9)-.5)*34,x:route[0][0],y:route[0][1],heading:0,phase:hash(seed,k)*6}));
  this.lead={x:route[0][0],y:route[0][1],heading:0};this.turns=0;
  for(const m of this.members){m.x+=m.ox;m.y+=m.oy}
 }
 update(dt){
  const L=this.lead,pd=Math.hypot(state.x-L.x,state.y-L.y);
  const scared=pd<130||(this.running&&pd<210);
  if(scared&&!this.running){ // uciekaj od maszyny: wybierz koniec trasy dalej od gracza
   this.running=true;this.waitT=0;
   const a=this.route[Math.max(0,Math.min(this.route.length-1,this.idx))],b=this.route[Math.max(0,Math.min(this.route.length-1,this.idx+this.dir))];
   const far=this.route[0],end=this.route[this.route.length-1];
   const target=Math.hypot(state.x-far[0],state.y-far[1])>Math.hypot(state.x-end[0],state.y-end[1])?0:this.route.length-1;
   this.dir=target>=this.idx?1:-1;
  }
  if(!scared)this.running=false;
  if(this.waitT>0&&!this.running){this.waitT-=dt;for(const m of this.members)m.phase+=dt*.4;return}
  const ni=this.idx+this.dir;
  if(ni<0||ni>=this.route.length){this.dir=-this.dir;this.waitT=6+hash(this.seed,this.turns++)*10;return}
  const tg=this.route[ni],dx=tg[0]-L.x,dy=tg[1]-L.y,d=Math.hypot(dx,dy),sp=(this.running?48:15)*dt;
  L.heading=Math.atan2(dy,dx);
  if(d<=sp){L.x=tg[0];L.y=tg[1];this.idx=ni;if(!this.running&&hash(this.seed,this.turns++)>.45)this.waitT=5+hash(this.seed,this.turns)*9}
  else{L.x+=dx/d*sp;L.y+=dy/d*sp}
  for(const m of this.members){
   const tx=L.x+m.ox,ty=L.y+m.oy,mx=tx-m.x,my=ty-m.y,md=Math.hypot(mx,my);
   if(md>.5){m.heading+=clamp(angDiff(m.heading,Math.atan2(my,mx)),-4*dt,4*dt);const st=Math.min(md,(this.running?52:17)*dt);m.x+=mx/md*st;m.y+=my/md*st}
   m.phase+=dt*(this.running?9:4);
  }
 }
 draw(){for(const m of this.members)drawDeer(ctx,m.x,m.y,m.heading,m.phase,this.running)}
}
// ───────── małe zwierzęta: kury, pies, lisy (błądzą w swoim rejonie, uciekają przed maszyną) ─────────
function drawChicken(g,x,y,heading,peck){
 if(!nearCam(x,y,20))return;
 blob(g,x,y,4,2,2);
 drawRotated(g,x,y,heading,s=>{rect(s,-3,-2,6,4,'#efe6d2');rect(s,-4,-1,2,2,'#7a5a3a');rect(s,3+peck,-1,2,2,'#efe6d2');rect(s,5+peck,0,1,1,'#d7a43a');rect(s,3+peck,-2,1,1,'#c8402b')});
}
function drawDog(g,x,y,heading,phase){
 if(!nearCam(x,y,24))return;
 blob(g,x,y,7,3,3);
 drawRotated(g,x,y,heading,s=>{rect(s,-5,-2,10,4,'#7a5a3a');rect(s,-4,-2,5,3,'#3a2e26');rect(s,5,-2,4,4,'#8a6a46');rect(s,8,-1,2,2,'#2f2a26');rect(s,5,-3,2,1,'#3a2e26');rect(s,5,2,2,1,'#3a2e26');rect(s,-8,-1+Math.round(Math.sin(phase*6)),4,1,'#7a5a3a')});
}
function drawFox(g,x,y,heading,phase,running){
 if(!nearCam(x,y,30))return;
 blob(g,x,y,8,3,3);
 drawRotated(g,x,y,heading,s=>{
  rect(s,-5,-2,9,4,'#c8662f');rect(s,-4,-1,6,2,'#d97a3a');
  rect(s,4,-2,5,4,'#d97a3a');rect(s,8,-1,3,2,'#f0e0c8');rect(s,5,-3,2,1,'#3a2a22');rect(s,5,2,2,1,'#3a2a22');
  const sw=Math.round(Math.sin(phase*(running?2:.7)));
  rect(s,-12,-1+sw,7,3,'#c8662f');rect(s,-13,-1+sw,2,3,'#f2ede0');   // kita z białą końcówką
 });
}
class Critter{
 constructor(o){
  Object.assign(this,{heading:hash(o.seed,1)*6.28,v:0,state:'idle',t:1+hash(o.seed,2)*4,rng:(o.seed*7919)|0,phase:0,tx:o.x,ty:o.y,idleMin:2,idleVar:5,speed:12,runSpeed:40,flee:0},o);
 }
 rand(){this.rng=(Math.imul(this.rng,1664525)+1013904223)|0;return((this.rng>>>0)%100000)/100000}
 ok(x,y){const R=this.region;return x>R.x0&&x<R.x1&&y>R.y0&&y<R.y1&&!pointBlocked(x,y,5)&&!(this.avoid&&this.avoid(x,y))}
 pick(){
  for(let k=0;k<10;k++){
   let x,y;
   if(this.near&&this.rand()<.5){x=this.near.x+(this.rand()*2-1)*this.near.r;y=this.near.y+(this.rand()*2-1)*this.near.r}
   else{x=this.region.x0+this.rand()*(this.region.x1-this.region.x0);y=this.region.y0+this.rand()*(this.region.y1-this.region.y0)}
   if(this.ok(x,y)){this.tx=x;this.ty=y;this.state='walk';return}
  }
  this.t=2;
 }
 update(dt){
  this.phase+=dt;
  const pd=Math.hypot(state.x-this.x,state.y-this.y);
  if(this.flee&&pd<this.flee&&this.state!=='run'){
   const away=Math.atan2(this.y-state.y,this.x-state.x);
   for(const off of [0,.6,-.6,1.2,-1.2,2]){
    const d=70+this.rand()*70,x=this.x+Math.cos(away+off)*d,y=this.y+Math.sin(away+off)*d;
    if(this.ok(x,y)){this.tx=x;this.ty=y;this.state='run';break}
   }
  }
  if(this.state==='idle'){this.v+=clamp(-this.v,-40*dt,40*dt);this.t-=dt;if(this.t<=0)this.pick();return}
  const dx=this.tx-this.x,dy=this.ty-this.y,d=Math.hypot(dx,dy),sp=this.state==='run'?this.runSpeed:this.speed;
  if(d<5){this.state='idle';this.t=this.idleMin+this.rand()*this.idleVar;return}
  this.heading+=clamp(angDiff(this.heading,Math.atan2(dy,dx)),-(this.state==='run'?7:3.5)*dt,(this.state==='run'?7:3.5)*dt);
  this.v+=clamp(sp-this.v,-60*dt,60*dt);
  const nx=this.x+Math.cos(this.heading)*this.v*dt,ny=this.y+Math.sin(this.heading)*this.v*dt;
  if(!this.ok(nx,ny)){this.state='idle';this.t=1+this.rand()*2;this.v=0;return}
  this.x=nx;this.y=ny;
 }
 draw(){
  if(this.kind==='chicken')drawChicken(ctx,this.x,this.y,this.heading,this.state==='idle'&&Math.sin(this.phase*7)>.3?1:0);
  else if(this.kind==='dog')drawDog(ctx,this.x,this.y,this.heading,this.phase);
  else drawFox(ctx,this.x,this.y,this.heading,this.phase,this.state==='run');
 }
}
const K=MAP.props.kennel;
const yardRegion={x0:1285,y0:590,x1:1700,y1:785};
const critters=[
 ...Array.from({length:7},(_,i)=>new Critter({kind:'chicken',seed:100+i,x:1400+i*30,y:640+(i%3)*30,region:yardRegion,speed:11,runSpeed:42,flee:55,idleMin:1,idleVar:3})),
 new Critter({kind:'dog',seed:200,x:K.x-10,y:K.y+30,region:{x0:1062,y0:160,x1:1545,y1:450},near:{x:K.x+10,y:K.y+20,r:70},speed:22,runSpeed:44,idleMin:3,idleVar:8,
  avoid:(x,y)=>{const B=MAP.beds;return x>B.x-12&&x<B.x+B.w+12&&y>B.y-12&&y<B.y+B.h+12}}),
 new Critter({kind:'fox',seed:300,x:260,y:1200,region:{x0:205,y0:1065,x1:440,y1:1500},speed:34,runSpeed:78,flee:150,idleMin:3,idleVar:9}),
 new Critter({kind:'fox',seed:301,x:380,y:70,region:{x0:270,y0:14,x1:540,y1:128},speed:34,runSpeed:78,flee:150,idleMin:3,idleVar:9})
];
const herd=Array.from({length:9},(_,i)=>new Cow(i));
const deerGroups=[
 new DeerGroup([[268,78],[520,64],[780,92]],2,11),          // żyto na północ od pola
 new DeerGroup([[200,1210],[430,1290],[640,1190],[860,1260]],3,23), // ściernisko na południu
 new DeerGroup([[1045,1370],[1230,1290],[1420,1230]],2,37)  // zielone pole na południowym wschodzie
];

const walkers=[
 new Walker('car','nS','jX',420,{color:'#8c9b95',seed:3}),
 new Walker('car','nN','jD',150,{color:'#a4684f',seed:5}),
 new Walker('tractor','nN','jD',60,{seed:7}),
 new Walker('combine','nW','jX',120,{seed:11})
];
const people=[
 new Person([[1165,436],[1170,480],[1240,556],[1360,600]],15,'#526c65',1,5,0),   // od drzwi domu przez furtkę na podwórze
 new Person([[1300,780],[1450,700],[1650,640]],13,'#a57660',1.1,6,0),             // po podwórku
 new Person([[1272,300],[1500,300]],11,'#7a8f5a',1,7,0)                          // przy grządkach
];

// Wywoływane z kroku symulacji.
function updateLife(dt){
 for(const c of herd)c.update(dt,herd);
 for(const d of deerGroups)d.update(dt);
 for(const c of critters)c.update(dt);
 for(const w of walkers)w.update(dt,walkers,people);
 for(const p of people)p.update(dt);
}
// Dynamiczne przeszkody dla kolizji gracza.
function dynamicColliders(){
 const out=[];
 for(const w of walkers)if(!w.ghost)out.push({...w.obbShape,id:w.kind});
 for(const p of people)out.push({...p.shape,id:'person'});
 return out;
}
function lifeInfo(){return{time:RT.lifeT,vehicles:walkers.map(w=>({kind:w.kind,x:w.pos[0],y:w.pos[1],v:w.v,blocked:w.blocked,edge:w.from+'>'+w.to})),people:people.map(p=>({x:p.x,y:p.y})),critters:critters.map(c=>[c.kind,Math.round(c.x),Math.round(c.y),c.state]),animals:herd.length+critters.length+deerGroups.reduce((n,g)=>n+g.members.length,0),cows:herd.map(c=>({x:Math.round(c.x),y:Math.round(c.y),s:c.state})),deer:deerGroups.map(g=>g.members.map(m=>[Math.round(m.x),Math.round(m.y)]))}}

function drawVillageLife(){
 const t=RT.lifeT;
 for(const c of herd)c.draw();
 for(const d of deerGroups)d.draw();
 for(const c of critters)c.draw();
 for(const p of people)p.draw();
 for(const w of walkers)w.draw();
 birds(ctx,t);
}

export {drawLivingWorld,drawCanopyLife,drawVillageLife,updateLife,dynamicColliders,lifeInfo};
