// Sylwetka kombajnu i wspólny renderer maszyn.
// Główny kombajn i kombajn NPC korzystają z tego samego sprite'a i skali.
import {ctx,rect,state,COMBINE_SCALE,RT,LIGHT} from './core.js';
import {obb} from './geometry.js';
const combine=document.createElement('canvas');combine.width=120;combine.height=132;let cg=combine.getContext('2d');cg.imageSmoothingEnabled=false;
function drawCombine(){cg.clearRect(0,0,120,132);cg.save();cg.translate(60,69); // heading-up local coordinates
// No fixed wheels in the body sprite. The ONLY wheels are drawn under the machine
// in drawMachineAt(), where the REAR axle steers and the tread moves with distance.
// 5-pixel cast edge, body, red side panels, engine behind cab.
rect(cg,-19,-39,41,85,'#713c2d');rect(cg,-21,-38,41,82,'#b94b32');rect(cg,-19,-37,36,81,'#cc5c37');rect(cg,-18,-36,35,3,'#e47b4c');rect(cg,-17,37,31,5,'#883a2c');
// Bin and hatch.
rect(cg,-15,-1,30,29,'#ad4b30');rect(cg,-12,0,24,23,'#d49354');rect(cg,-10,2,20,19,'#e5b16c');for(let j=0;j<4;j++)rect(cg,-8,4+j*4,15,1,j%2?'#df9f5e':'#f1c27a');rect(cg,-14,27,28,3,'#7d3d29');
// Engine grill.
rect(cg,-15,33,27,9,'#883c2d');for(let j=0;j<3;j++)rect(cg,-12,34+j*3,20,1,'#d16e4b');
// Header feed throat and operator cabin front.
rect(cg,-13,-43,29,8,'#893f2f');rect(cg,-19,-38,37,30,'#723e34');rect(cg,-17,-39,32,27,'#567d82');rect(cg,-15,-37,28,18,'#81a2a2');rect(cg,-15,-37,27,3,'#c5d2bc');rect(cg,-14,-16,26,3,'#394a4d');rect(cg,11,-31,5,13,'#344c4e');rect(cg,-15,-15,9,3,'#d5ab62');
// Warning reflectors and asymmetrical unloading auger.
rect(cg,-20,31,3,5,'#edc46c');rect(cg,16,31,3,5,'#f4d275');rect(cg,20,-4,17,5,'#b94632');rect(cg,35,-6,5,8,'#7c3e30');rect(cg,36,-5,2,3,'#e6a15b');
// Front cutter housing and long wheat header (work width ~80px).
rect(cg,-12,-54,26,13,'#8c3727');rect(cg,-43,-59,88,14,'#9f3e2b');rect(cg,-44,-60,88,4,'#dc6646');rect(cg,-44,-46,88,3,'#6d422f');rect(cg,-41,-56,82,7,'#cb5135');for(let x=-42;x<=41;x+=6){rect(cg,x,-63,4,6,'#8d6640');rect(cg,x+1,-63,2,3,'#d0a16a')}
// Reel: diagonal braces and central axis; additional RT.frame animated at draw-time.
rect(cg,-38,-54,77,2,'#f0b875');for(let x=-37;x<40;x+=11)rect(cg,x,-56,2,9,'#6a492c');
cg.restore()}
drawCombine();
// Cień w układzie świata (nie obraca się z maszyną): otoczka wypukła prostokątów i ich przesunięcia o LIGHT*h.
// boxes: [połówka szerokości, połówka długości, przesunięcie środka wzdłuż osi].
function orientedShadow(g,x,y,ang,boxes,h,col='#34472e3a'){
 const c=Math.cos(ang),s=Math.sin(ang),dx=LIGHT.x*h,dy=LIGHT.y*h,pts=[];
 for(const [hw,hh,cy] of boxes)for(const [lx,ly] of [[-hw,cy-hh],[hw,cy-hh],[hw,cy+hh],[-hw,cy+hh]]){
  const px=x+c*lx-s*ly,py=y+s*lx+c*ly;pts.push([px,py],[px+dx,py+dy]);
 }
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lo=[],up=[];
 for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
 for(const p of pts.slice().reverse()){while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
 const hull=lo.slice(0,-1).concat(up.slice(0,-1));
 g.fillStyle=col;g.beginPath();hull.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();
}
function rotateOffset(px,py,a){return [Math.cos(a)*px+Math.sin(a)*(-py),Math.sin(a)*px+Math.cos(a)*py]}
// Standard local: forward is -y; x right.
function worldOffset(lx,ly){return [state.x+Math.cos(state.angle)*lx+Math.sin(state.angle)*(-ly),state.y+Math.sin(state.angle)*lx+Math.cos(state.angle)*ly]}
// Shared combine renderer. A single model at a single scale for both combine machines.
// Viewed from above, only the REAR wheels steer; front wheels are fixed and larger.
// Pojazdy rysuje się najpierw „głową do góry” na małym płótnie, a potem obraca z wyłączonym wygładzaniem —
// piksele pozostają ostre (bez rozmycia krawędzi rect() w obróconym kontekście).
const scratch=document.createElement('canvas');scratch.width=scratch.height=200;
const sg=scratch.getContext('2d');sg.imageSmoothingEnabled=false;
function drawRotated(g,x,y,angle,draw){
 sg.setTransform(1,0,0,1,0,0);sg.clearRect(0,0,200,200);sg.save();sg.translate(100,100);draw(sg);sg.restore();
 g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(y));g.rotate(angle);g.drawImage(scratch,-100,-100);g.restore();
}
// Shared combine renderer. Wymiary (px, 12 px = 1 m): nadwozie 41 px (3,4 m), z kołami ~50 px, heder 88 px (7,3 m).
// Z góry skręcają tylko tylne koła (kąt jak w modelu jazdy, 0,6 rad), bieżnik przesuwa się zgodnie z kierunkiem jazdy
// z prędkością maszyny (górna powierzchnia opony jedzie do przodu względem kadłuba).
function drawMachineAt(g,x,y,angle,steer,travel,working,scale=COMBINE_SCALE){
 orientedShadow(g,x,y,angle,[[27*scale,45.5*scale,.5*scale],[44*scale,9*scale,-54*scale]],18);
 drawRotated(g,x,y,angle,s=>{
  s.scale(scale,scale);
  const off=Math.round((((-travel)%5)+5)%5);
  for(const axle of [{y:-14,offset:18,w:10,h:25,rear:false},{y:32,offset:14,w:8,h:17,rear:true}]){
   for(const side of [-1,1]){
    s.save();s.translate(side*(axle.offset+axle.w*.18),axle.y);
    if(axle.rear)s.rotate(-steer*.6);
    rect(s,-axle.w/2,-axle.h/2,axle.w,axle.h,'#293532');
    rect(s,-axle.w/2+1,-axle.h/2+1,axle.w-2,axle.h-2,'#3c4640');
    for(let t=-axle.h/2+off-5;t<axle.h/2;t+=5){
     if(t<-axle.h/2||t+3>axle.h/2)continue;
     rect(s,-axle.w/2,t,3,2,'#757b6e');rect(s,axle.w/2-3,t+1,3,2,'#676c61');
    }
    s.restore();
   }
  }
  s.drawImage(combine,-60,-69);
  if(working){
   const q=Math.round(Math.sin(RT.reelSpin*1.35));
   rect(s,-35,-52+q,70,1,'#edbc73');
   for(let i=-34;i<36;i+=13)rect(s,i,-57+(Math.floor(RT.reelSpin)%4),2,4,'#ad673f');
  }
  const reel=Math.floor((working?RT.reelSpin:travel*.12))%5;
  for(let i=-40;i<42;i+=8)rect(s,i,-56+(reel+5)%3,3,2,working?'#f2c078':'#b98b57');
  rect(s,-2,-66,5,2,working?'#e7d06f':'#71604b');
 });
}
// Obrys kolizji kombajnu: kabina z przednią osią, tył z silnikiem i heder (obrócone prostokąty w świecie).
function playerObbs(){
 const k=COMBINE_SCALE,a=state.angle;
 const [fx,fy]=worldOffset(0,-22.5*k),[rx,ry]=worldOffset(0,23*k),[hx,hy]=worldOffset(0,-54*k);
 return [obb(fx,fy,26*k,22.5*k,a),obb(rx,ry,22*k,23*k,a),obb(hx,hy,44*k,9*k,a)];
}
function drawHarvester(){drawMachineAt(ctx,state.x,state.y,state.angle,state.steer,RT.wheelTravel,state.tool)}

export {worldOffset,drawMachineAt,drawHarvester,playerObbs,orientedShadow,drawRotated};
