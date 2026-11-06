// Sylwetka kombajnu i wspólny renderer maszyn.
// Główny kombajn i kombajn NPC korzystają z tego samego sprite'a i skali.
import {ctx,rect,state,COMBINE_SCALE,RT,LIGHT,TRAILER_T,AUGER,VEHICLES,CARTS} from './core.js';
import {obb} from './geometry.js';
import {allCarts,towedObbs,cartDef} from './tow.js';
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
// Światła ostrzegawcze. Rura rozładunkowa jest złożona (schowana) — nie rysujemy jej w czasie jazdy.
rect(cg,-20,31,3,5,'#edc46c');rect(cg,16,31,3,5,'#f4d275');
cg.restore()}
drawCombine();
// Heder jako osobny sprite (ten sam układ współrzędnych co korpus) — można go zdjąć i odstawić.
const headerCv=document.createElement('canvas');headerCv.width=120;headerCv.height=132;const hg=headerCv.getContext('2d');hg.imageSmoothingEnabled=false;
function drawHeaderSprite(){hg.clearRect(0,0,120,132);hg.save();hg.translate(60,69);const cg=hg;
// Front cutter housing and long wheat header (work width ~80px).
rect(cg,-12,-54,26,13,'#8c3727');rect(cg,-43,-59,88,14,'#9f3e2b');rect(cg,-44,-60,88,4,'#dc6646');rect(cg,-44,-46,88,3,'#6d422f');rect(cg,-41,-56,82,7,'#cb5135');for(let x=-42;x<=41;x+=6){rect(cg,x,-63,4,6,'#8d6640');rect(cg,x+1,-63,2,3,'#d0a16a')}
// Reel: diagonal braces and central axis; additional RT.frame animated at draw-time.
rect(cg,-38,-54,77,2,'#f0b875');for(let x=-37;x<40;x+=11)rect(cg,x,-56,2,9,'#6a492c');
hg.restore()}
drawHeaderSprite();
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
const scratch2=document.createElement('canvas');scratch2.width=scratch2.height=200;
const sg2=scratch2.getContext('2d');sg2.imageSmoothingEnabled=false;
// Sprite rysowany głową do góry, z obrysem 1 px (spójna, czytelna krawędź wszystkich obiektów), potem obracany bez wygładzania.
function drawRotated(g,x,y,angle,draw,outline=true){
 sg.setTransform(1,0,0,1,0,0);sg.clearRect(0,0,200,200);sg.save();sg.translate(100,100);draw(sg);sg.restore();
 let src=scratch;
 if(outline){
  sg2.clearRect(0,0,200,200);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])sg2.drawImage(scratch,dx,dy);
  sg2.globalCompositeOperation='source-in';sg2.fillStyle='#1d2b24';sg2.fillRect(0,0,200,200);sg2.globalCompositeOperation='source-over';
  sg2.drawImage(scratch,0,0);src=scratch2;
 }
 g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(y));g.rotate(angle);g.drawImage(src,-100,-100);g.restore();
}
// Shared combine renderer. Wymiary (px, 12 px = 1 m): nadwozie 41 px (3,4 m), z kołami ~50 px, heder 88 px (7,3 m).
// Z góry skręcają tylko tylne koła (kąt jak w modelu jazdy, 0,6 rad), bieżnik przesuwa się zgodnie z kierunkiem jazdy
// z prędkością maszyny (górna powierzchnia opony jedzie do przodu względem kadłuba).
function drawHeaderDynamic(s,working,travel){
 if(working){
  const q=Math.round(Math.sin(RT.reelSpin*1.35));
  rect(s,-35,-52+q,70,1,'#edbc73');
  for(let i=-34;i<36;i+=13)rect(s,i,-57+(Math.floor(RT.reelSpin)%4),2,4,'#ad673f');
 }
 const reel=Math.floor((working?RT.reelSpin:travel*.12))%5;
 for(let i=-40;i<42;i+=8)rect(s,i,-56+(reel+5)%3,3,2,working?'#f2c078':'#b98b57');
 rect(s,-2,-66,5,2,working?'#e7d06f':'#71604b');
}
// Rura wysypowa: t=0 złożona wzdłuż lewej burty, t=1 rozłożona w bok (poza heder). Obrót wokół przegubu.
function drawAuger(s,t){
 const a=Math.PI/2+t*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),L=AUGER.len,n=Math.ceil(L/2);
 for(let i=0;i<=n;i++){const x=AUGER.px+dx*L*i/n,y=AUGER.py+dy*L*i/n;rect(s,x-2,y-2,5,5,'#6b3327')}
 for(let i=0;i<=n;i++){const x=AUGER.px+dx*L*i/n,y=AUGER.py+dy*L*i/n;rect(s,x-1,y-1,3,3,i>n-4?'#d9d2b4':'#c9583a')}
 const tx=AUGER.px+dx*L,ty=AUGER.py+dy*L;rect(s,tx-3,ty-3,7,7,'#2c3836');rect(s,tx-2,ty-2,5,5,'#4a5a56');
 rect(s,AUGER.px-3,AUGER.py-3,7,7,'#5b2c22');rect(s,AUGER.px-2,AUGER.py-2,5,5,'#a84630');
}
function drawMachineAt(g,x,y,angle,steer,travel,working,withHeader=true,scale=COMBINE_SCALE,auger=0){
 const boxes=[[27*scale,45.5*scale,.5*scale]];if(withHeader)boxes.push([44*scale,9*scale,-54*scale]);
 orientedShadow(g,x,y,angle,boxes,18);
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
  if(withHeader){s.drawImage(headerCv,-60,-69);drawHeaderDynamic(s,working,travel)}
  rect(s,-3,46,6,5,'#2c2825');rect(s,-1,48,3,2,'#6b655a');
  drawAuger(s,auger);
 });
}
// Traktor (pojazd testowy): ta sama skala i animacje co kombajn — przednie koła skręcają, bieżnik jedzie zgodnie z ruchem.
function drawTractorAt(g,x,y,angle,steer,travel){
 orientedShadow(g,x,y,angle,[[17,31.5,.5]],16);
 drawRotated(g,x,y,angle,s=>{
  const off=Math.round((((-travel)%5)+5)%5);
  const wheel=(cx,cy,w,h,rot)=>{
   s.save();s.translate(cx,cy);if(rot)s.rotate(rot);
   rect(s,-w/2,-h/2,w,h,'#293532');rect(s,-w/2+1,-h/2+1,w-2,h-2,'#3c4640');
   for(let t=-h/2+off-5;t<h/2;t+=5){if(t<-h/2||t+3>h/2)continue;rect(s,-w/2,t,3,2,'#757b6e');rect(s,w/2-3,t+1,3,2,'#676c61')}
   s.restore();
  };
  for(const side of [-1,1]){wheel(side*14,-17,8,15,steer*.6);wheel(side*14,17,10,26,0)}
  rect(s,-7,-31,14,30,'#98513b');rect(s,-6,-30,12,26,'#c26440');rect(s,-5,-30,10,3,'#d18851');
  rect(s,-10,-3,20,26,'#98513b');rect(s,-9,-2,18,24,'#567d7a');rect(s,-7,0,14,16,'#9cb5a5');rect(s,-5,2,10,2,'#c5d2bc');
  rect(s,-8,22,16,8,'#b4623f');rect(s,-2,29,4,3,'#444a44');rect(s,-2,31,5,3,'#2a2623');rect(s,-1,32,3,1,'#6b655a');
  rect(s,-9,-26,2,3,'#edc46c');rect(s,7,-26,2,3,'#f4d275');
 });
}
function offAt(x,y,a,lx,ly){return [x+Math.cos(a)*lx+Math.sin(a)*(-ly),y+Math.sin(a)*lx+Math.cos(a)*ly]}
// Obrys kolizji dowolnego pojazdu: lista prostokątów z danych pojazdu (+ heder kombajnu).
function vehObbs(kind,x,y,a,headerOn){
 const o=VEHICLES[kind].obbs.map(([hw,hh,cy])=>{const [px,py]=offAt(x,y,a,0,cy);return obb(px,py,hw,hh,a)});
 if(kind==='combine'&&headerOn){const [hx,hy]=offAt(x,y,a,0,-54*COMBINE_SCALE);o.push(obb(hx,hy,44*COMBINE_SCALE,9*COMBINE_SCALE,a))}
 return o;
}
function playerObbs(){return vehObbs(state.vehicle,state.x,state.y,state.angle,state.headerOn).concat(towedObbs(state.vehicle))}
function otherObbs(){const o=state.other;return vehObbs(o.kind,o.x,o.y,o.angle,state.headerOn).concat(towedObbs(o.kind))}
// ───── wózki: przyczepa zbożowa i wózek z hederem ─────
function wheelRect(s,cx,cy,w,h,off){
 rect(s,cx-w/2,cy-h/2,w,h,'#262f2c');rect(s,cx-w/2+1,cy-h/2+1,w-2,h-2,'#3a443e');
 for(let t=cy-h/2+off-5;t<cy+h/2;t+=5){if(t<cy-h/2||t+3>cy+h/2)continue;rect(s,cx-w/2,t,2,2,'#7b8174');rect(s,cx+w/2-2,t+1,2,2,'#686d62')}
}
function drawGrainCart(g,c,travel){
 const d=CARTS.grain;
 orientedShadow(g,c.x,c.y,c.angle,[[d.hw,d.hh,0]],14);
 drawRotated(g,c.x,c.y,c.angle,s=>{
  const off=Math.round((((-travel)%5)+5)%5),ay=Math.round(d.hh*d.axle);
  // dyszel w kształcie litery A z uchem zaczepowym i podporą
  for(let i=0;i<=16;i++){const x=Math.round(i/16*7);rect(s,-x-1,-47+i,2,2,'#4a3b30');rect(s,x,-47+i,2,2,'#4a3b30')}
  rect(s,-2,-50,5,4,'#23201d');rect(s,-1,-49,3,2,'#6b655a');rect(s,6,-40,3,6,'#6e6a60');
  // koła z błotnikami
  for(const side of [-1,1]){wheelRect(s,side*16,ay,6,18,off);rect(s,side*16-3,ay-11,6,2,'#2b4a38');rect(s,side*16-3,ay+9,6,2,'#2b4a38')}
  // skrzynia: stalowe burty, drewniana podłoga
  rect(s,-14,-32,28,64,'#243b2a');rect(s,-13,-31,26,62,'#4b7a52');rect(s,-12,-30,24,60,'#5f9162');
  rect(s,-10,-28,20,56,'#8b6d45');for(let yy=-25;yy<27;yy+=6)rect(s,-10,yy,20,1,'#755a38');
  rect(s,-12,-31,24,3,'#79ad78');rect(s,-12,28,24,3,'#3f6a47');rect(s,12,-30,1,58,'#35583c');rect(s,-12,-28,1,56,'#7bb07a');
  for(const yy of [-18,0,18]){rect(s,-13,yy,2,3,'#d6dccb');rect(s,11,yy,2,3,'#2b4631')}
  rect(s,-3,29,6,2,'#1e2a22');
  const f=Math.min(1,c.load/TRAILER_T);
  if(f>.004){
   const ln=Math.max(6,Math.round(54*f)),w=Math.round(14+Math.min(1,f*2)*5);
   rect(s,-w,-ln/2,w*2,ln,'#b88b2d');rect(s,-w+1,-ln/2+1,w*2-2,ln-2,'#e3b84a');
   rect(s,-w+1,-ln/2+1,Math.round(w*.8),ln-2,'#f0cd6a');
   for(let k=-ln/2+2;k<ln/2-1;k+=3)rect(s,-w+2,k,w*2-4,1,'#d7a93e');
  }
 });
}
function drawHeaderCart(g,c,travel){
 orientedShadow(g,c.x,c.y,c.angle,[[CARTS.header.hw,CARTS.header.hh,0]],10);
 drawRotated(g,c.x,c.y,c.angle,s=>{
  const off=Math.round((((-travel)%5)+5)%5);
  for(let i=0;i<=18;i++){const x=Math.round(i/18*5);rect(s,-x-1,-65+i,2,2,'#4a3b30');rect(s,x,-65+i,2,2,'#4a3b30')}
  rect(s,-2,-68,5,4,'#23201d');rect(s,-1,-67,3,2,'#6b655a');
  for(const side of [-1,1])wheelRect(s,side*15,0,6,16,off);
  rect(s,-9,-46,18,92,'#2c312e');rect(s,-8,-45,16,90,'#4a504b');rect(s,-8,-45,2,90,'#6b726a');
  s.save();s.rotate(Math.PI/2);s.translate(0,54);s.drawImage(headerCv,-60,-69);drawHeaderDynamic(s,false,0);s.restore();
 });
}
// Dyszel w kształcie litery A: dwa ramiona od ucha zaczepowego (tipY) do ramy maszyny (baseY), poprzeczka i podpórka.
// Koniec dyszla (tipY) musi leżeć dokładnie w odległości hh+tongue od środka wózka — tam zaczepia się pojazd.
function aFrame(s,tipY,baseY,half,col='#3a3a36',hi='#6a675f'){
 const n=Math.abs(baseY-tipY);
 for(let i=0;i<=n;i++){const t=i/n,x=Math.round(half*t),y=tipY+i;rect(s,-x-1,y,2,2,col);rect(s,x-1,y,2,2,col);if(i%4===0){rect(s,-x-1,y,1,1,hi);rect(s,x,y,1,1,hi)}}
 rect(s,-half*.6,tipY+n*.55,half*1.2,2,col);              // poprzeczka
 rect(s,-3,tipY-2,6,4,'#23201d');rect(s,-2,tipY-1,4,2,'#8a8578'); // ucho zaczepowe
}
// Agregat uprawowy (kultywator z wałem strunowym) i siewnik zawieszany: szersze od traktora, jak prawdziwe narzędzia.
function drawTiller(g,c,travel){
 const d=CARTS.tiller;
 orientedShadow(g,c.x,c.y,c.angle,[[d.hw,d.hh,0]],8);
 drawRotated(g,c.x,c.y,c.angle,s=>{
  const w=!!c.working;
  aFrame(s,-(d.hh+d.tongue),-12,15);
  // belka nośna i rama
  rect(s,-29,-12,58,9,'#25404f');rect(s,-28,-11,56,7,'#3f6a82');rect(s,-28,-11,56,2,'#6c9ab2');
  rect(s,-26,-4,3,18,'#25404f');rect(s,23,-4,3,18,'#25404f');rect(s,-1,-20,3,12,'#25404f');
  // dwa rzędy zębów kultywatora
  for(let k=0;k<9;k++){const x=-26+k*6.5;rect(s,x,0+(k%2)*5,2,w?7:4,w?'#2a2b27':'#6f726c');rect(s,x,(k%2)*5+(w?7:4),2,1,w?'#8b7556':'#9a9d95')}
  // wał strunowy z tyłu
  rect(s,-29,16,58,6,'#2e3834');rect(s,-28,17,56,4,'#65726a');for(let x=-27;x<28;x+=4)rect(s,x,17,1,4,'#8e9b91');
  for(const side of [-1,1]){rect(s,side*27-2,15,4,8,'#222a27')}
  if(w)rect(s,-27,24,54,2,'#4a3a29');
 });
}
function drawSeeder(g,c,travel){
 const d=CARTS.seeder;
 orientedShadow(g,c.x,c.y,c.angle,[[d.hw,d.hh,0]],10);
 drawRotated(g,c.x,c.y,c.angle,s=>{
  const w=!!c.working;
  aFrame(s,-(d.hh+d.tongue),-20,14);
  // rama, skrzynia nasienna z pokrywą, rurki rozsiewające
  rect(s,-27,-6,54,6,'#4b2d22');rect(s,-26,-5,52,4,'#7d4a37');
  rect(s,-24,-20,48,18,'#235033');rect(s,-23,-19,46,16,'#3f7a4a');rect(s,-23,-19,46,3,'#66a56d');
  for(let x=-18;x<=18;x+=12)rect(s,x,-15,8,8,'#2b5d3a');
  rect(s,-24,-21,48,1,'#9fd29a');rect(s,-24,-3,48,1,'#1c3c28');
  for(let k=0;k<9;k++){const x=-24+k*6;rect(s,x+1,0,1,w?16:10,'#56524a');if(w)rect(s,x,16,3,2,'#c9b27a')}
  rect(s,-27,16,54,5,'#2e3834');rect(s,-26,17,52,3,'#65726a');
  for(const side of [-1,1])rect(s,side*25-2,14,4,10,'#222a27');
  if(w)rect(s,-26,24,52,2,'#6a5438');
  rect(s,-3,-13,6,3,w?'#6ee36e':'#e3a64d');   // lampka: pracuje / podniesiony
 });
}
function drawCart(g,c,travel=0){
 if(c.kind==='grain')drawGrainCart(g,c,travel);else if(c.kind==='tiller')drawTiller(g,c,travel);else if(c.kind==='seeder')drawSeeder(g,c,travel);else drawHeaderCart(g,c,travel);
}
// Pojazdy gracza i drugi pojazd: najpierw wózki, potem traktor, na końcu kombajn (jego rura jest nad przyczepą).
function drawAllVehicles(){
 for(const c of allCarts())drawCart(ctx,c,c.towedBy===state.vehicle?RT.wheelTravel:0);
 const list=[{kind:state.vehicle,x:state.x,y:state.y,angle:state.angle,steer:state.steer,travel:RT.wheelTravel,player:true},
  {kind:state.other.kind,x:state.other.x,y:state.other.y,angle:state.other.angle,steer:0,travel:0,player:false}];
 list.sort((a,b)=>(a.kind==='combine')-(b.kind==='combine'));
 for(const q of list){
  if(q.kind==='tractor')drawTractorAt(ctx,q.x,q.y,q.angle,q.steer,q.travel);
  else drawMachineAt(ctx,q.x,q.y,q.angle,q.steer,q.travel,q.player&&state.tool&&state.headerOn,state.headerOn,COMBINE_SCALE,state.auger);
 }
}

export {drawAllVehicles,drawCart,offAt,otherObbs,vehObbs,drawTractorAt,worldOffset,drawMachineAt,playerObbs,orientedShadow,drawRotated};
