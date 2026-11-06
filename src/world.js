// Statyczne podłoże, zabudowania, roślinność i stan pola.
// TODO (0.3.3): zamienić odrębne drogi na jedną geometrię sieci i uporządkować warstwy.
import {WORLD,FLD,N,hash,rect,line,poly,shadow} from './core.js';
const grass=document.createElement('canvas');grass.width=128;grass.height=128;let gg=grass.getContext('2d');rect(gg,0,0,128,128,'#88a075');for(let i=0;i<820;i++){let x=(hash(i,8)*128)|0,y=(hash(i,19)*128)|0,p=hash(i,27);rect(gg,x,y,p>.75?2:1,1,['#9db180','#718b6b','#bdba83','#7e9c70','#aab784'][Math.floor(hash(i,38)*5)])}
const ground=document.createElement('canvas');ground.width=WORLD.w;ground.height=WORLD.h;let g=ground.getContext('2d');g.imageSmoothingEnabled=false;
let pattern=g.createPattern(grass,'repeat');g.fillStyle=pattern;g.fillRect(0,0,WORLD.w,WORLD.h);
// Layered countryside: patterned fields, verges, dirt access road and farmyard.
poly(g,[[0,0],[540,0],[465,128],[0,149]],'#9faf70');for(let i=0;i<34;i++){let y=i*4;line(g,0,y,480-y*.18,y+7,'#b4b681',1)}
poly(g,[[0,1020],[1050,1014],[1050,1600],[0,1600]],'#b6aa76');for(let i=0;i<92;i++)line(g,0,1028+i*6,1014,1030+i*6,'#c6bb89',1);
// 0.3: neighbouring crop fields and a genuine wooded countryside beyond the playable wheat.
// Rendered once into ground; each field gets its own subdued palette and cultivation pattern.
function neighbourField(x,y,w,h,kind,seed){
 const pal=kind==='rape'?['#c6b869','#d4c47d','#a8a462']:kind==='hay'?['#a4b078','#bac18a','#829d71']:kind==='stubble'?['#b8a077','#ceb58c','#aa936e']:['#9dba79','#afc581','#90ac70'];
 rect(g,x-5,y-5,w+10,h+10,'#819b6f');rect(g,x,y,w,h,pal[0]);
 const rows=kind==='stubble'?9:6;
 for(let yy=y+5;yy<y+h-3;yy+=rows){
   let c=pal[1+(Math.floor((yy-y)/rows)+seed)%2];
   line(g,x+3,yy,x+w-3,yy,c,kind==='rape'?2:1);
   for(let xx=x+6;xx<x+w-5;xx+=11){
     let z=hash(xx>>3,yy>>3,seed);
     if(z>.3)rect(g,xx+(z*3|0),yy-3,kind==='rape'?3:2,2,z>.78?'#e2d18b':pal[1]);
   }
 }
 // irregular grassy field margin and stones
 for(let i=0;i<w/9;i++){
   let px=x+i*9, j=hash(i,seed,4);
   rect(g,px,y-5+(j*4|0),3,3,'#678b60');
   rect(g,px,y+h+2-(j*4|0),3,2,'#6b8e61');
 }
}
// Neighbouring plots are decorative, but visually follow the same crop-row language.
neighbourField(279,8,585,132,'rape',1);
neighbourField(22,188,173,625,'hay',2);
neighbourField(110,1051,762,484,'stubble',3);
neighbourField(1035,1030,775,490,'green',4);
neighbourField(1646,60,288,858,'rape',5);
// Large additional fields, rather than isolated decorative postage stamps.
neighbourField(1090,4,545,132,'hay',6);
neighbourField(1650,1040,286,495,'hay',7);
// Ditches and strips of bushes between fields, with visible but modest field boundaries.
rect(g,204,166,12,671,'#74915f');rect(g,216,166,3,671,'#a8b980');
for(let i=0;i<90;i++){
 let y=174+i*7,x=202+(hash(i,91)*8|0);
 if(i%4!==0)rect(g,x,y,2+(i%3),2,['#6d925c','#93aa6f','#527c58'][i%3]);
}
// Northern tree belt, just beyond the crop and behind the small road.
rect(g,3,0,258,72,'#6b8966');for(let i=0;i<185;i++){
 const x=(hash(i,131)*258|0),y=(hash(i,133)*70|0);
 rect(g,x,y,3+(i%4),2+(i%3),['#496f56','#5a7c5b','#789166','#869b70'][i%4]);
}
// Main field base / margins.
rect(g,FLD.x-17,FLD.y-17,FLD.w+34,FLD.h+34,'#90a475');rect(g,FLD.x-8,FLD.y-8,FLD.w+16,FLD.h+16,'#a1a875');
// Unified road network: one consistent width and material, with natural junctions.
// Paths are rendered with the same cross-section, so intersections do not have mismatched edges.
function dirtRoad(points,width){
 g.lineCap='round';g.lineJoin='round';
 function stroke(col,w){g.beginPath();g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.strokeStyle=col;g.lineWidth=w;g.stroke()}
 stroke('#829368',width+13);stroke('#99886b',width+5);stroke('#b8a47d',width);
 // Two continuous wheel ruts rather than dotted, unrelated tile fragments.
 for(const off of [-width*.22,width*.22]){
  g.beginPath();for(let i=0;i<points.length;i++){
   const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
   const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
   const x=points[i][0]-dy/len*off,y=points[i][1]+dx/len*off;
   if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
  }
  g.strokeStyle='#927e60';g.lineWidth=1.6;g.stroke();
 }
 g.lineCap='butt';g.lineJoin='miter';
}
dirtRoad([[945,-35],[945,930],[945,1007],[945,1640]],53);
dirtRoad([[-35,962],[911,962],[945,962],[980,962],[1995,962]],34);
// Gently widened entrances at the main crossing: no disconnected road patches.
poly(g,[[916,929],[928,933],[962,933],[976,925],[976,998],[959,990],[926,990],[916,1000]],'#b5a17c');
for(let i=0;i<360;i++){
 const x=(hash(i,202)*WORLD.w)|0,y=(hash(i,203)*WORLD.h)|0;
 if((Math.abs(x-945)<25)||(Math.abs(y-962)<16))rect(g,x,y,1+(i%3),1,i%3===0?'#d6c093':'#917f61');
}
// Forest edge stays behind the main route, but grows to meet the larger outer fields.
rect(g,0,993,195,607,'#638a66');
for(let i=0;i<280;i++){
 let x=hash(i,119)*194,y=998+hash(i,123)*585;
 rect(g,x,y,7+(i%3)*4,5+(i%4)*3,['#416e55','#527b55','#63845e','#8aa171'][i%4]);
}
// Farmyard and farmhouse plot.
poly(g,[[1000,172],[1500,172],[1545,950],[995,952]],'#9ba477');poly(g,[[1033,212],[1435,211],[1466,818],[1030,830]],'#c7b78c');
for(let i=0;i<500;i++){let x=1035+(hash(i,25)*419)|0,y=220+(hash(i,6)*610)|0;rect(g,x,y,2,hash(i,9)>.5?2:1,hash(i,11)>.5?'#b7aa87':'#d4c6a0')}
// Driveway joins the public road and continues across the gravel yard. No abrupt colour break.
dirtRoad([[947,386],[989,386],[1046,387],[1091,404],[1176,419]],24);
// The final courtyard segment is dustier and narrower; border vegetation grows alongside it.
for(let i=0;i<41;i++){
 const x=982+i*4,y=371+Math.sin(i*.28)*3;
 if(i%4!==0)rect(g,x,y,2,2,'#8fa075');
}
// Parking yard and vehicle tire tracks.
for(let i=0;i<9;i++)line(g,1050+i*30,608,1061+i*30,780,'#b1a27b',1);
// Distant garden patches and seed beds.
rect(g,1480,165,135,242,'#92a36e');for(let x=1489;x<1605;x+=16){rect(g,x,183,8,212,'#6a855e');for(let y=189;y<395;y+=17)rect(g,x+1,y,5,5,'#4f7450')}
// Roadside fence, aligned with the farm boundary; a proper gate at driveway y=386.
for(const [y0,y1] of [[193,355],[416,903]]){
 for(const rail of [0,4])line(g,1004,y0+rail,1004,y1+rail,'#ab9770',1);
 for(let y=y0;y<=y1;y+=24){rect(g,1002,y,5,8,'#927b55');rect(g,1003,y,2,5,'#d7c399')}
}
// Distant decorative agricultural straw bales on southern field.
function bale(g,x,y,s=1){g.save();g.translate(x,y);g.scale(s,s);rect(g,4,6,16,4,'#7d6f4c');rect(g,0,0,17,10,'#d2b477');rect(g,0,2,16,1,'#f0d293');rect(g,2,7,14,2,'#a68d60');rect(g,12,0,2,9,'#907c58');g.restore()}
for(let i=0;i<15;i++)bale(g,100+hash(i,81)*820,1082+hash(i,82)*345,.7+hash(i,83)*.8);
// Field offscreen texture (one cell changed at a time).
const field=document.createElement('canvas');field.width=FLD.w;field.height=FLD.h;const fc=field.getContext('2d');const crop=new Uint8Array(N);
function fieldTile(i,j){
 const k=j*FLD.n+i,x=i*FLD.t,y=j*FLD.t,u=hash(i,j),v=hash(i,j,1),r=hash(i,j,2),harvested=crop[k]===1;
 // Subtle large-scale variation, so the crop is not a repeating chessboard.
 const tint=hash(i>>2,j>>2);
 rect(fc,x,y,8,8,harvested?(tint>.55?'#baa579':'#b3a073'):(tint>.64?'#c1a45f':tint<.32?'#baa05e':'#c6ab69'));
 if(harvested){
   rect(fc,x+(u*6|0),y+(v*3|0),1,4,'#96835c');
   rect(fc,x+(r*5|0)+2,y+3,1,3,'#e1cc91');
   if(r>.32)rect(fc,x+(v*5|0),y+6,3,1,'#a9966b');
   if(v>.65)rect(fc,x+5,y+1,1,2,'#d2bd82');
 }else{
   // Individual stems in staggered positions and heights, small angled wheat heads.
   for(let z=0;z<3;z++){
     const h=hash(i,j,z+13), h2=hash(i+31,j,z+29);
     const cx=x+Math.min(7,Math.floor(h*8)), cy=y+(h2*3|0);
     rect(fc,cx,cy+2,1,6-cy+y,'#a58a49');
     rect(fc,cx,cy,1+(h>.6?2:1),2,h>.55?'#f0d48a':'#dec175');
     if(h2>.45)rect(fc,cx-1,cy+2,2,1,'#c3a45f');
   }
   if(r>.65)rect(fc,x+1,y+6,3,1,'#b09450');
 }
}
for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
const tracks=document.createElement('canvas');tracks.width=WORLD.w;tracks.height=WORLD.h;const tc=tracks.getContext('2d');tc.globalAlpha=1;
// World objects with long warm shadows, rendered in a separate foreground layer.
const decor=document.createElement('canvas');decor.width=WORLD.w;decor.height=WORLD.h;const dg=decor.getContext('2d');dg.imageSmoothingEnabled=false;
// Top-down farmhouse buildings: near-plan roof planes, long ridge and only a 4–7px wall below eaves.
// No facade triangles or front-view windows; the buildings now match the field and machines.
function roof(g,x,y,w,h,color){
 shadow(g,x,y,w,h);
 rect(g,x+2,y+5,w,h+5,'#75634f');
 rect(g,x+5,y+7,w-9,h-4,'#c3b092');
 // Two roof slopes separated by a ridge parallel to the long axis.
 const vertical=h>=w;
 if(vertical){
   poly(g,[[x,y],[x+w/2,y+5],[x+w/2,y+h-6],[x,y+h]],color);
   poly(g,[[x+w/2,y+5],[x+w,y],[x+w,y+h],[x+w/2,y+h-6]],'#b16c50');
   line(g,x+w/2,y+5,x+w/2,y+h-6,'#e2aa79',2);
   for(let i=10;i<h-6;i+=12){line(g,x+3,y+i,x+w-3,y+i,'#82513d',1)}
 }else{
   poly(g,[[x,y],[x+w,y],[x+w-6,y+h/2],[x+6,y+h/2]],color);
   poly(g,[[x+6,y+h/2],[x+w-6,y+h/2],[x+w,y+h],[x,y+h]],'#aa6148');
   line(g,x+8,y+h/2,x+w-8,y+h/2,'#e0a174',2);
   for(let i=10;i<w-6;i+=13){line(g,x+i,y+3,x+i,y+h-3,'#8f513d',1)}
 }
 // Shallow wall under the bottom eave only, with tiny top-down-visible doors.
 rect(g,x+6,y+h,w-12,6,'#c7b69c');rect(g,x+Math.round(w*.62),y+h,13,5,'#685947');
 rect(g,x+w-21,y+h,9,3,'#719298');
 rect(g,x+6,y+6,5,5,'#e5b887');
}
function house(g,x,y){
 roof(g,x,y,140,96,'#b66d50');
 // Two chimneys on the roof plane, each with its own tiny cast shadow.
 rect(g,x+99,y+15,14,13,'#a8a08a');rect(g,x+101,y+17,10,9,'#cbbea3');rect(g,x+104,y+18,4,4,'#444945');
 rect(g,x+7,y+46,22,7,'#d9b07c');rect(g,x+9,y+48,18,3,'#b9a98f');
 // Gable-edge gutter and roof skylight.
 rect(g,x+56,y+12,17,13,'#78584d');rect(g,x+58,y+14,13,9,'#6d8e99');rect(g,x+60,y+15,9,2,'#a1bbc0');
}
function barn(g,x,y){
 roof(g,x,y,194,115,'#8c5142');
 rect(g,x+20,y+23,45,26,'#725043');rect(g,x+22,y+25,41,22,'#9d654f');
 for(let i=0;i<5;i++)line(g,x+25+i*8,y+27,x+25+i*8,y+45,'#6b4539',1);
 rect(g,x+133,y+20,40,17,'#684a3f');rect(g,x+135,y+22,36,13,'#a77a55');
 // Farm lettering is painted on roof like an overhead sign, very subtle.
 for(let i=0;i<5;i++)rect(g,x+90+i*4,y+32,2,9,'#d29a6e');
}
// Rounded crowns are irregular clusters with warm pixel highlights, not single circles.
// All vegetation is rendered in the same 12 px / metre world scale as machines and buildings.
function crownPatch(g,cx,cy,rad,base,lit,seed){
 const rr=Math.round(rad);
 for(let yy=-rr;yy<=rr;yy+=3){
  const taper=Math.sqrt(Math.max(0,1-(yy/rad)**2));
  const w=Math.round(rad*taper*(.86+.15*hash(yy,seed)));
  const shift=Math.round((hash(yy,seed,9)-.5)*5);
  if(w>0)rect(g,cx-w+shift,cy+yy,w*2,3,base);
 }
 for(let k=0;k<Math.round(rad*2.0);k++){
   let dx=(hash(k,seed,3)*2-1)*rad,dy=(hash(k,seed,4)*2-1)*rad;
   if(dx*dx+dy*dy>rad*rad*.8)continue;
   rect(g,cx+dx,cy+dy,2+(k%3),1+(k%2),lit[k%lit.length]);
 }
}
function shrub(g,x,y,r=8,seed=1){
 const sh=['#496e4d','#5a8057','#75935e','#8ca572'];
 rect(g,x-6,y+5,18,5,'#455e4760');
 crownPatch(g,x-3,y,r*.68,sh[0],sh,seed);
 crownPatch(g,x+5,y-2,r*.73,sh[1],sh,seed+13);
}
function tree(g,x,y,r,type='round',s=1){
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(s,s);
 const seed=((x*7+y*11)|0);
 // Sunlight from north-west: every canopy casts the same southeast shadow.
 g.fillStyle='#3d563b5a';g.beginPath();g.ellipse(r*.7,r*.6,r*.96,r*.54,.3,0,Math.PI*2);g.fill();
 rect(g,-2,-2,6,12,'#6d5b43');rect(g,0,1,2,10,'#a08557');
 if(type==='pine'){
  for(let layer=0;layer<4;layer++){
   const y=-r*.76+layer*r*.34,hw=r*(.34+layer*.14);
   poly(g,[[-hw,y+7],[0,y-r*.48],[hw,y+7]],['#284f44','#35684b','#437853','#547f52'][layer]);
   for(let i=0;i<13;i++){
    const dx=(hash(i,seed,layer)*2-1)*hw*.8,dy=y+hash(i,seed+layer,4)*8;
    rect(g,dx,dy,2,1,i%4?'#739567':'#a0ae71');
   }
  }
 } else {
  crownPatch(g,-r*.30,-r*.30,r*.69,'#466b49',['#779967','#95a873','#3d674a'],seed);
  crownPatch(g,r*.26,-r*.39,r*.73,'#507652',['#8da66f','#638c5b','#a7af74'],seed+9);
  crownPatch(g,-r*.06,-r*.78,r*.64,'#5f8558',['#a2b47d','#779c65','#4c7857'],seed+15);
 }
 g.restore();
}
// buildings placed outside the field.
house(dg,1086,237);barn(dg,1102,471);roof(dg,1369,618,86,60,'#8b6350');
// Shed: stacked pallets, fuel barrels, drying washing line.
for(let i=0;i<6;i++){rect(dg,1350+i*11,478,8,14,'#a5875f');rect(dg,1353+i*11,480,2,11,'#c2ab80')}
for(let i=0;i<3;i++){rect(dg,1089+i*15,690,11,17,['#64757a','#72846d','#9a664e'][i]);rect(dg,1090+i*15,691,10,3,'#c3bda3')}
// Parked tractor, top-down: roof, wheels and front hood.
function parkedTractor(g,x,y){shadow(g,x,y,33,53);rect(g,x+1,y-7,9,16,'#303c37');rect(g,x+30,y-7,9,16,'#303c37');rect(g,x+2,y+37,7,14,'#394237');rect(g,x+31,y+37,7,14,'#394237');rect(g,x+10,y-8,20,58,'#b44d39');rect(g,x+12,y-4,16,19,'#d05d42');rect(g,x+11,y+16,18,18,'#547c81');rect(g,x+13,y+18,14,12,'#9eb7ae');rect(g,x+11,y+39,18,5,'#82402f')}
parkedTractor(dg,1290,714);
// Orchard, trees and shrubs around farm/field.
for(let i=0;i<12;i++)tree(dg,1510+(i%4)*37,463+Math.floor(i/4)*87,18,'round',.8+hash(i,12)*.35);
for(let i=0;i<18;i++){let y=94+i*53,x=FLD.x-28-(hash(i,18)*30|0);if(i%3===0)tree(dg,x,y,19,'round');else {rect(dg,x-8,y-2,19,10,'#6b8c5f');rect(dg,x-5,y-4,11,9,'#88a16b')}}
for(let i=0;i<16;i++){let y=105+i*56,x=FLD.x+FLD.w+21+(hash(i,30)*17|0);if(i%4===0&&y<FLD.y+FLD.h-35)tree(dg,x+8,y,14,'pine');else if(i%3===0)rect(dg,x-4,y,17,9,'#6c8c5e')}
for(let i=0;i<20;i++){let x=80+i*75,y=1030+hash(i,14)*30;tree(dg,x,y,12+i%3*3,i%3?'round':'pine')}
for(let i=0;i<9;i++)tree(dg,1060+i*58,1020+hash(i,19)*50,18,'round');
// Tree clumps bordering the neighbour's plots, shelterbelt, small orchard and roadside hedges.
for(let i=0;i<27;i++){
 let x=20+(i%9)*29,y=28+Math.floor(i/9)*25+(hash(i,54)*10|0);
 tree(dg,x,y,15+i%4*2,i%4===0?'pine':'round',.7);
}
for(let i=0;i<24;i++){
 let x=11+(i%4)*24,y=1030+Math.floor(i/4)*39+(hash(i,56)*12|0);
 tree(dg,x,y,17+i%3*2,i%3===0?'pine':'round',.85);
}
for(let i=0;i<23;i++){
 let x=1448+(i%5)*38,y=1034+Math.floor(i/5)*47+(hash(i,57)*10|0);
 tree(dg,x,y,19+(i%3)*3,i%4===0?'pine':'round',.9);
}
// New irregular shrub belts along miedze; clumps alternate with trees rather than regular dots.
for(let i=0;i<77;i++){
 const y=149+i*10.5,x=206+(hash(i,81)*18|0);
 if(y<FLD.y+FLD.h+29)shrub(dg,x,y,5+(i%4),i+81);
}
for(let i=0;i<83;i++){
 const y=153+i*9,x=FLD.x+FLD.w+16+(hash(i,88)*23|0);
 if(y<FLD.y+FLD.h+25 && i%3!==0)shrub(dg,x,y,5+(i%4),i+88);
}
for(let i=0;i<91;i++){
 const x=1080+hash(i,104)*790,y=1020+(hash(i,105)*560);
 if(i%5===0)tree(dg,x,y,12+(i%4)*2,i%3?'round':'pine',.7);
 else if(i%3!==0)shrub(dg,x,y,6+(i%5),i+104);
}
for(let i=0;i<56;i++){
 const x=1730+(hash(i,110)*190),y=142+(hash(i,111)*780);
 if(i%6===0)tree(dg,x,y,17,'round',.8);
 else shrub(dg,x,y,6+(i%5),i+110);
}
for(let i=0;i<55;i++){
 const x=16+hash(i,140)*185,y=1050+hash(i,141)*530;
 if(i%3===0)tree(dg,x,y,13+(i%5)*2,i%4===0?'pine':'round',.7);
 else shrub(dg,x,y,7+(i%5),i+140);
}
// Fenced pasture: rectangular, shared corners, uniform posts and continuous rails.
// All anchors use exactly the same top-down ground plane (no tilted, floating fence pieces).
function pastureFence(g,x0,y0,x1,y1){
 const rails=['#a69673','#c5b58a'];
 for(const d of [0,3]){
  for(const c of rails.slice(d?0:1)){
   line(g,x0,y0+d,x1,y0+d,c,1);line(g,x0,y1+d,x1,y1+d,c,1);
   line(g,x0+d,y0,x0+d,y1,c,1);line(g,x1+d,y0,x1+d,y1,c,1);
  }
 }
 function post(x,y){rect(g,x+2,y+3,5,6,'#425e4760');rect(g,x-2,y-3,5,7,'#8a7656');rect(g,x-1,y-3,3,2,'#dfcba0')}
 for(let x=x0;x<x1;x+=23){post(x,y0);post(x,y1)}
 for(let y=y0;y<y1;y+=23){post(x0,y);post(x1,y)}
 for(const x of [x0,x1])for(const y of [y0,y1])post(x,y);
}
pastureFence(dg,34,268,189,849);
// Farm garden and drying laundry in miniature, seen from above.
for(let x=1486;x<1600;x+=18){rect(dg,x,202,3,3,'#a6b68e');rect(dg,x+3,199,3,2,'#849d6e')}
for(let i=0;i<5;i++){rect(dg,1446+i*11,735,7,5,['#d6c6a2','#d9e6d4','#7396b0','#b86156','#d7d1b7'][i]);rect(dg,1447+i*11,736,2,2,'#e9e3ce')}
// Small farm pond and weathered water trough.
rect(dg,1518,778,55,27,'#668980');rect(dg,1521,781,49,20,'#78a69f');rect(dg,1528,786,25,2,'#c4d1ad');
rect(dg,1109,792,31,15,'#867960');rect(dg,1112,794,25,10,'#72999a');
// Electricity poles, cables and a stork nest.
function pole(g,x,y,nest){poly(g,[[x,y],[x+5,y],[x+40,y+47],[x+32,y+47]],'#57674b66');rect(g,x-3,y-28,6,42,'#75664e');rect(g,x-5,y-26,2,39,'#b19b73');rect(g,x-11,y-19,22,3,'#665b48');rect(g,x-8,y-20,3,3,'#c8be9b');rect(g,x+6,y-20,3,3,'#c8be9b');if(nest){rect(g,x-12,y-31,24,6,'#69553d');rect(g,x-9,y-35,20,7,'#8d6e47');rect(g,x+1,y-43,5,8,'#e5e6d4');rect(g,x+1,y-45,5,3,'#f8f0dd');rect(g,x+6,y-39,8,2,'#b16a42')}}
pole(dg,986,188,true);pole(dg,981,770,false);line(dg,986,162,981,744,'#6e7166',1);
// Lane sign and post.
rect(dg,1012,343,3,19,'#7c7155');rect(dg,1004,333,47,13,'#e1d6b0');rect(dg,1005,334,45,11,'#607c55');rect(dg,1042,337,5,3,'#eee0b5');

export {ground,field,crop,tracks,tc,decor,fieldTile};
