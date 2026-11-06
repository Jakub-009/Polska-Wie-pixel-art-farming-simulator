// Życie wsi (0.4.0): pojazdy NPC jeżdżą po grafie dróg z mapy, piesi chodzą po trasach,
// wszyscy mają kolizje i reagują na kombajn gracza (hamują / czekają).
import {ctx,rect,line,hash,FLD,camera,VIEW,state,RT,clamp,WORLD,LIGHT,VEHICLES} from './core.js';
import {crop} from './world.js';
import {drawMachineAt,drawTractorAt,drawCart,playerObbs,orientedShadow,drawRotated} from './vehicles.js';
import {MAP,ROADS,pointBlocked,roadClearance} from './map.js';
import {obb,circle,collide} from './geometry.js';
import {advanceCart,alignCart,cartObb} from './tow.js';
import {setNpcObbs,refreshObstacles,obstacleDist,playerDist,pushOutObstacles} from './obstacles.js';
import {buildNav,walkable,nearestWalkable,findPath} from './nav.js';
// Miejsca zaludnione, których dzikie zwierzęta unikają: gospodarstwo z otoczeniem, pastwisko z krowami i drogi.
function populated(x,y){
 const F=MAP.farm;
 if(x>F.x-150&&x<F.x+F.w+150&&y>F.y-150&&y<F.y+F.h+150)return true;
 const P=MAP.pasture;if(x>P.x0-60&&x<P.x1+60&&y>P.y0-60&&y<P.y1+60)return true;
 return roadClearance(x,y)<45;
}

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
 blob(g,x,y,6,3,6);
 drawRotated(g,x,y,0,s=>{
  const dark='#33463d';
  rect(s,-2,3+(step%2),2,3,'#3f463f');rect(s,1,3+((step+1)%2),2,3,'#3f463f');
  rect(s,-5,-1,2,5,dark);rect(s,4,-1,2,5,dark);
  rect(s,-4,-2,9,6,coat);rect(s,-4,-2,9,1,'#ffffff22');
  rect(s,-2,-4,5,5,'#dbb28c');rect(s,-2,-5,5,3,'#67533c');
 });
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
// Sarna: mniejsza od jelenia (ok. 1,2 m), biały „lusterko” na zadzie.
function drawRoe(g,x,y,heading,phase,running){
 if(!nearCam(x,y,30))return;
 blob(g,x,y,9,3,4);
 drawRotated(g,x,y,heading,s=>{
  rect(s,-6,-3,11,6,'#8d5f3e');rect(s,-5,-3,9,5,'#a8744b');rect(s,-3,-1,6,2,'#946446');
  rect(s,5,-2,5,4,'#b98557');rect(s,9,-1,2,2,'#4d3a2c');rect(s,5,-4,2,2,'#7a5a40');rect(s,5,3,2,2,'#7a5a40');
  rect(s,-8,-2,3,4,'#f0e2c4');
  const st=Math.round(Math.sin(phase*(running?3.4:1.5))*2);
  rect(s,-4+st,-5,2,2,'#6e5239');rect(s,-4-st,4,2,'#6e5239');rect(s,3-st,-5,2,2,'#6e5239');rect(s,3+st,4,2,'#6e5239');
 });
}
function carTop(g,x,y,col,heading=0){
 if(!nearCam(x,y,64))return;
 orientedShadow(g,x,y,heading,[[10,23,0]],9,'#37474355');
 drawRotated(g,x,y,heading,s=>{
  for(const a of [-10,6]){rect(s,a,-15,4,8,'#2a302f');rect(s,a,11,4,9,'#2d3533')}
  rect(s,-9,-23,18,46,'#414944');rect(s,-8,-24,16,45,col);
  rect(s,-6,-13,12,12,'#668d97');rect(s,-5,-12,10,5,'#a1b6ba');
  rect(s,-6,10,12,6,'#637c81');rect(s,-6,20,4,2,'#d2b889');rect(s,2,20,4,2,'#bf9b71');
  rect(s,-6,-25,4,2,'#ecddb6');rect(s,2,-25,4,2,'#e8d4a8');
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
const body=k=>{const [hw,hh,cy]=VEHICLES[k].npcBody;return{hw,hh,cy}};
const SPECS={
 car:{speed:34,...body('car'),lane:12,allow:['road']},
 tractor:{speed:22,...body('tractor'),lane:16,allow:['road']},
 combine:{speed:14,...body('combine'),lane:8,allow:['road']}
};
const TURN_RATE=2.4; // rad/s
const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
const inWorld=p=>p[0]>-10&&p[0]<WORLD.w+10&&p[1]>-10&&p[1]<WORLD.h+10;

class Walker{
 constructor(kind,from,to,s,opts={}){
  Object.assign(this,{kind,spec:SPECS[kind],from,to,s,v:0,travel:0,turns:0,dwell:0,steer:0,color:opts.color||'#8c9b95',seed:opts.seed||1,blocked:false,blockT:0,ghost:false,ghostT:0,pos:[0,0],obbShape:null});
  this.setEdge(from,to);this.heading=this.dirHeading;this.place();
  if(opts.cart){this.cart={kind:opts.cart,x:0,y:0,angle:0,load:opts.load||0,towedBy:'npc'};const H=this.hitch();alignCart(this.cart,H[0],H[1],this.heading)}
 }
 hitch(){const h=this.heading,k=VEHICLES[this.kind].hitch;return[this.pos[0]-Math.sin(h)*k,this.pos[1]+Math.cos(h)*k]}
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
  if(this.cart){const H=this.hitch();advanceCart(this.cart,H[0],H[1],this.heading)}
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
  if(this.cart&&nearCam(this.cart.x,this.cart.y,110))drawCart(ctx,this.cart,this.travel);
  if(this.kind==='car')carTop(ctx,x,y,this.color,this.heading);
  else if(this.kind==='tractor'){if(nearCam(x,y,80))drawTractorAt(ctx,x,y,this.heading,this.steer*.5,this.travel)}
  else if(nearCam(x,y,95))drawMachineAt(ctx,x,y,this.heading,this.steer*.5,this.travel,false,false);
 }
}

// ───────── piesi ─────────
class Person{
 constructor(route,speed,coat,scale,wait,phase){Object.assign(this,{route,speed,coat,scale,wait,idx:0,dir:1,t:phase,x:route[0][0],y:route[0][1],waitT:0,step:0,shape:circle(route[0][0],route[0][1],5)})}
 update(dt){
  // Ucieka przed jadącym pojazdem gracza (jak zwierzęta); stojące pojazdy i wózki omija.
  const vd=playerDist(this.x,this.y);
  if(vd<(Math.abs(state.v)>1?65:22))this.fleeT=1.1;
  const free=(nx,ny)=>!pointBlocked(nx,ny,5)&&obstacleDist(nx,ny)>6;
  if(this.fleeT>0){
   this.fleeT-=dt;
   const away=Math.atan2(this.y-state.y,this.x-state.x);
   for(const off of [0,.7,-.7,1.4,-1.4]){
    const nx=this.x+Math.cos(away+off)*46*dt,ny=this.y+Math.sin(away+off)*46*dt;
    if(free(nx,ny)){this.x=nx;this.y=ny;break}
   }
   pushOutObstacles(this,5);
   this.step+=dt*9;this.shape=circle(this.x,this.y,5);return;
  }
  if(this.waitT>0){this.waitT-=dt;return}
  const tgt=this.route[this.idx+this.dir];
  const dx=tgt[0]-this.x,dy=tgt[1]-this.y,d=Math.hypot(dx,dy),stp=this.speed*dt;
  if(d<=stp){this.x=tgt[0];this.y=tgt[1];this.idx+=this.dir;if(this.idx===0||this.idx===this.route.length-1){this.dir=-this.dir;this.waitT=this.wait}}
  else{
   const base=Math.atan2(dy,dx);let moved=false;
   for(const off of [0,.6,-.6,1.2,-1.2]){const nx=this.x+Math.cos(base+off)*stp,ny=this.y+Math.sin(base+off)*stp;if(free(nx,ny)){this.x=nx;this.y=ny;moved=true;break}}
   if(!moved){this.shape=circle(this.x,this.y,5);return} // zablokowana drogą pojazdu — czeka
  }
  pushOutObstacles(this,5);
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
// ───────── dzika zwierzyna (sarny, lisy): każda sztuka ma własny cel i trasę z A* po siatce wolnych komórek ─────────
// Grupa to tylko wspólny „dom” (punkt, wokół którego zwierzęta się kręcą) — sztuki chodzą niezależnie. Wykrywanie zacięć: brak postępu → nowa trasa → w ostateczności przeniesienie na wolną komórkę.
const dynBlock=(x,y)=>obstacleDist(x,y)<22;
class Group{
 constructor(hx,hy,seed){this.hx=hx;this.hy=hy;this.seed=seed;this.n=0;this.t=30+hash(seed,3)*50}
 rnd(){return hash(this.seed,50+this.n++)}
 update(dt){
  this.t-=dt;if(this.t>0)return;
  this.t=50+this.rnd()*80;
  for(let k=0;k<20;k++){
   const a=this.rnd()*6.283,d=250+this.rnd()*500,x=this.hx+Math.cos(a)*d,y=this.hy+Math.sin(a)*d;
   if(walkable(x,y)){this.hx=x;this.hy=y;return}
  }
 }
}
class Wild{
 constructor(o){
  Object.assign(this,{heading:hash(o.seed,1)*6.28,v:0,state:'idle',t:1+hash(o.seed,2)*6,path:[],pi:0,phase:hash(o.seed,4)*6,rng:(o.seed*7919)|0,
   speed:14,run:50,flee:110,leash:200,idleMin:4,idleVar:10,blockT:0,chkT:0,stuckN:0},o);
  const p=nearestWalkable(this.x,this.y,12);if(p){this.x=p[0];this.y=p[1]}
  this.lx=this.x;this.ly=this.y;
 }
 rand(){this.rng=(Math.imul(this.rng,1664525)+1013904223)|0;return((this.rng>>>0)%100000)/100000}
 plan(tx,ty){const p=findPath(this.x,this.y,tx,ty,dynBlock);if(!p||!p.length)return false;this.path=p;this.pi=0;this.dest=[tx,ty];return true}
 wander(){
  const G=this.group;
  for(let k=0;k<14;k++){
   const a=this.rand()*6.283,d=30+this.rand()*this.leash,x=G.hx+Math.cos(a)*d,y=G.hy+Math.sin(a)*d;
   if(walkable(x,y)&&this.plan(x,y)){this.state='walk';return}
  }
  this.state='idle';this.t=3+this.rand()*4;
 }
 escape(){
  const away=Math.atan2(this.y-state.y,this.x-state.x);
  for(const dist of [340,230,140])for(const off of [0,.5,-.5,1,-1,1.6,-1.6]){
   const x=this.x+Math.cos(away+off)*dist,y=this.y+Math.sin(away+off)*dist;
   if(walkable(x,y)&&this.plan(x,y)){this.state='run';return true}
  }
  return false;
 }
 update(dt){
  this.phase+=dt;
  const pd=playerDist(this.x,this.y),moving=Math.abs(state.v)>1.5;
  if(this.state!=='run'&&((moving&&pd<this.flee)||pd<16))this.escape();
  if(this.state==='idle'){this.v+=clamp(-this.v,-40*dt,40*dt);this.t-=dt;if(this.t<=0)this.wander();return}
  const wp=this.path[this.pi];
  if(!wp){this.state='idle';this.t=this.idleMin+this.rand()*this.idleVar;return}
  const dx=wp[0]-this.x,dy=wp[1]-this.y,d=Math.hypot(dx,dy);
  if(d<7){this.pi++;return}
  const run=this.state==='run',sp=run?this.run:this.speed;
  this.heading+=clamp(angDiff(this.heading,Math.atan2(dy,dx)),-(run?7:3.5)*dt,(run?7:3.5)*dt);
  this.v+=clamp(sp-this.v,-60*dt,60*dt);
  const nx=this.x+Math.cos(this.heading)*this.v*dt,ny=this.y+Math.sin(this.heading)*this.v*dt;
  if(obstacleDist(nx,ny)<9){ // stojący pojazd na drodze — czekaj i zaplanuj trasę dookoła
   this.v=0;this.blockT+=dt;
   if(this.blockT>.6){this.blockT=0;if(this.dest&&!this.plan(this.dest[0],this.dest[1])){this.state='idle';this.t=2}}
  }else{this.blockT=0;this.x=nx;this.y=ny}
  pushOutObstacles(this,5);
  // zacięcie: mało ruchu przez 2 s → nowa trasa; po 3 próbach — przeniesienie na najbliższą wolną komórkę
  this.chkT+=dt;
  if(this.chkT>=2){
   const moved=Math.hypot(this.x-this.lx,this.y-this.ly);this.lx=this.x;this.ly=this.y;this.chkT=0;
   if(moved<8){
    this.stuckN++;
    if(this.stuckN>=3){const p=nearestWalkable(this.x,this.y,10);if(p){this.x=p[0];this.y=p[1]}this.state='idle';this.t=2;this.stuckN=0;this.v=0}
    else this.wander();
   }else this.stuckN=0;
  }
 }
 draw(){
  if(this.kind==='roe')drawRoe(ctx,this.x,this.y,this.heading,this.phase,this.state==='run');
  else drawFox(ctx,this.x,this.y,this.heading,this.phase,this.state==='run');
 }
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
 ok(x,y,veh=true){const R=this.region;return x>R.x0&&x<R.x1&&y>R.y0&&y<R.y1&&!pointBlocked(x,y,5)&&!(this.avoid&&this.avoid(x,y))&&!(veh&&obstacleDist(x,y)<9)}
 pick(){
  for(let k=0;k<10;k++){
   let x,y;
   if(this.roam){const a=this.rand()*6.283,d=80+this.rand()*this.roam;x=this.x+Math.cos(a)*d;y=this.y+Math.sin(a)*d}
   else if(this.near&&this.rand()<.5){x=this.near.x+(this.rand()*2-1)*this.near.r;y=this.near.y+(this.rand()*2-1)*this.near.r}
   else{x=this.region.x0+this.rand()*(this.region.x1-this.region.x0);y=this.region.y0+this.rand()*(this.region.y1-this.region.y0)}
   if(this.ok(x,y)){this.tx=x;this.ty=y;this.state='walk';return}
  }
  this.t=2;
 }
 update(dt){
  this.phase+=dt;
  const pd=this.flee?playerDist(this.x,this.y):1e9,moving=Math.abs(state.v)>1.5;
  if(this.flee&&((moving&&pd<this.flee&&this.state!=='run')||pd<10)){
   const away=Math.atan2(this.y-state.y,this.x-state.x);
   for(const off of [0,.6,-.6,1.2,-1.2,2]){
    const d=(this.fleeMin||70)+this.rand()*(this.fleeVar||70),x=this.x+Math.cos(away+off)*d,y=this.y+Math.sin(away+off)*d;
    if(this.ok(x,y)){this.tx=x;this.ty=y;this.state='run';break}
   }
  }
  if(this.state==='idle'){this.v+=clamp(-this.v,-40*dt,40*dt);this.t-=dt;pushOutObstacles(this,4);if(this.t<=0)this.pick();return}
  const dx=this.tx-this.x,dy=this.ty-this.y,d=Math.hypot(dx,dy),sp=this.state==='run'?this.runSpeed:this.speed;
  if(d<5){this.state='idle';this.t=this.idleMin+this.rand()*this.idleVar;return}
  this.heading+=clamp(angDiff(this.heading,Math.atan2(dy,dx)),-(this.state==='run'?7:3.5)*dt,(this.state==='run'?7:3.5)*dt);
  this.v+=clamp(sp-this.v,-60*dt,60*dt);
  const nx=this.x+Math.cos(this.heading)*this.v*dt,ny=this.y+Math.sin(this.heading)*this.v*dt;
  if(!this.ok(nx,ny,false)||obstacleDist(nx,ny)<6){this.state='idle';this.t=1+this.rand()*2;this.v=0;pushOutObstacles(this,4);return}
  this.x=nx;this.y=ny;
  pushOutObstacles(this,4);
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
 ...Array.from({length:7},(_,i)=>new Critter({kind:'chicken',seed:100+i,x:1400+i*30,y:640+(i%3)*30,region:yardRegion,speed:11,runSpeed:42,flee:32,idleMin:1,idleVar:3})),
 new Critter({kind:'dog',seed:200,x:K.x-10,y:K.y+30,region:{x0:1062,y0:160,x1:1545,y1:450},near:{x:K.x+10,y:K.y+20,r:70},speed:22,runSpeed:44,idleMin:3,idleVar:8,
  avoid:(x,y)=>{const B=MAP.beds;return x>B.x-12&&x<B.x+B.w+12&&y>B.y-12&&y<B.y+B.h+12}})
];
const herd=Array.from({length:9},(_,i)=>new Cow(i));
// Siatka nawigacyjna powstaje z reguł mapy: wolne od przeszkód i poza miejscami zaludnionymi.
buildNav((x,y)=>x>30&&y>30&&x<WORLD.w-30&&y<WORLD.h-30&&!pointBlocked(x,y,12)&&!populated(x,y));
const mkWild=(kind,x,y,seed,group,extra={})=>new Wild({kind,x,y,seed,group,...extra});
const gA=new Group(268,90,11),gB=new Group(200,1210,23),gC=new Group(1100,1360,37),gD=new Group(620,1260,41),gF1=new Group(260,1200,53),gF2=new Group(400,80,59);
const wildlife=[
 mkWild('roe',268,90,11,gA),mkWild('roe',300,110,12,gA),
 mkWild('roe',200,1210,23,gB),
 mkWild('roe',1100,1360,37,gC),mkWild('roe',1140,1380,38,gC),
 mkWild('roe',620,1260,41,gD),
 mkWild('fox',260,1200,53,gF1,{speed:32,run:80,flee:120,leash:420,idleMin:3,idleVar:9}),
 mkWild('fox',400,80,59,gF2,{speed:32,run:80,flee:120,leash:420,idleMin:3,idleVar:9})
];
const groups=[gA,gB,gC,gD,gF1,gF2];

const walkers=[
 new Walker('car','nS','jX',420,{color:'#8c9b95',seed:3}),
 new Walker('car','nN','jD',150,{color:'#a4684f',seed:5}),
 new Walker('tractor','nN','jD',60,{seed:7,cart:'grain',load:1.1}),
 new Walker('combine','nW','jX',120,{seed:11,cart:'header'})
];
const people=[
 new Person([[1165,436],[1170,480],[1240,556],[1360,600]],15,'#526c65',1,5,0),   // od drzwi domu przez furtkę na podwórze
 new Person([[1300,780],[1450,700],[1650,640]],13,'#a57660',1.1,6,0),             // po podwórku
 new Person([[1272,300],[1500,300]],11,'#7a8f5a',1,7,0)                          // przy grządkach
];

// Wywoływane z kroku symulacji.
function updateLife(dt){
 setNpcObbs(dynamicColliders());refreshObstacles();
 for(const c of herd)c.update(dt,herd);
 for(const g of groups)g.update(dt);
 for(const a of wildlife)a.update(dt);
 for(const c of critters)c.update(dt);
 for(const w of walkers)w.update(dt,walkers,people);
 for(const p of people)p.update(dt);
}
// Dynamiczne przeszkody dla kolizji gracza i zwierząt (pojazdy NPC razem z holowanymi wózkami).
function dynamicColliders(){
 const out=[];
 for(const w of walkers){if(!w.ghost)out.push({...w.obbShape,id:w.kind});if(w.cart)out.push({...cartObb(w.cart),id:'npc-cart'})}
 return out;
}
function lifeInfo(){return{time:RT.lifeT,vehicles:walkers.map(w=>({kind:w.kind,x:w.pos[0],y:w.pos[1],v:w.v,blocked:w.blocked,edge:w.from+'>'+w.to,cart:w.cart?[Math.round(w.cart.x),Math.round(w.cart.y)]:null})),people:people.map(p=>({x:p.x,y:p.y})),critters:critters.map(c=>[c.kind,Math.round(c.x),Math.round(c.y),c.state]),wild:wildlife.map(a=>[a.kind,Math.round(a.x),Math.round(a.y),a.state,a.stuckN]),animals:herd.length+critters.length+wildlife.length,cows:herd.map(c=>({x:Math.round(c.x),y:Math.round(c.y),s:c.state})),deer:wildlife.filter(a=>a.kind==='roe').map(a=>[Math.round(a.x),Math.round(a.y)])}}

function drawVillageLife(){
 const t=RT.lifeT;
 for(const c of herd)c.draw();
 for(const a of wildlife)a.draw();
 for(const c of critters)c.draw();
 for(const p of people)p.draw();
 for(const w of walkers)w.draw();
 birds(ctx,t);
}

export {drawLivingWorld,drawCanopyLife,drawVillageLife,updateLife,dynamicColliders,lifeInfo};
