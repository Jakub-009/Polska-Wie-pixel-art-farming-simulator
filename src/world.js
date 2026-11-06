// Malowanie świata z danych (map.js). Każda warstwa to osobny canvas:
//  ground     — teren, pola sąsiadów, drogi, podwórze (raz)
//  field      — pszenica głównego pola (zmienia się kafelek po kafelku)
//  tracks     — ślady kół na ściernisku
//  decorLow   — płoty, krzewy, cienie, rekwizyty (pod pojazdami)
//  decorHigh  — dachy i korony drzew (NAD pojazdami)
import {WORLD,FLD,N,hash,rect,line,poly,shadow,LIGHT} from './core.js';
import {MAP,roadClearance} from './map.js';

const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g]};
const [ground,g]=mk(WORLD.w,WORLD.h);
const [field,fc]=mk(FLD.w,FLD.h);
const [tracks,tc]=mk(WORLD.w,WORLD.h);
const [decorLow,dl]=mk(WORLD.w,WORLD.h);
const [decorHigh,dh]=mk(WORLD.w,WORLD.h);
const crop=new Uint8Array(N); // 1 = skoszone

// ───────── teren ─────────
function paintGrass(){
 const [grass,gg]=mk(128,128);rect(gg,0,0,128,128,'#88a075');
 for(let i=0;i<820;i++){let x=(hash(i,8)*128)|0,y=(hash(i,19)*128)|0,p=hash(i,27);rect(gg,x,y,p>.75?2:1,1,['#9db180','#718b6b','#bdba83','#7e9c70','#aab784'][Math.floor(hash(i,38)*5)])}
 g.fillStyle=g.createPattern(grass,'repeat');g.fillRect(0,0,WORLD.w,WORLD.h);
 poly(g,[[0,0],[540,0],[465,128],[0,149]],'#9faf70');for(let i=0;i<34;i++){let y=i*4;line(g,0,y,480-y*.18,y+7,'#b4b681',1)}
 poly(g,[[0,1020],[1050,1014],[1050,1600],[0,1600]],'#b6aa76');for(let i=0;i<92;i++)line(g,0,1028+i*6,1014,1030+i*6,'#c6bb89',1);
}
function neighbourField(f){
 const {x,y,w,h,kind,seed}=f;
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
 for(let i=0;i<w/9;i++){let px=x+i*9,j=hash(i,seed,4);rect(g,px,y-5+(j*4|0),3,3,'#678b60');rect(g,px,y+h+2-(j*4|0),3,2,'#6b8e61')}
}
function paintWood(w,idx){
 rect(g,w.x,w.y,w.w,w.h,'#638a66');
 const n=Math.round(w.w*w.h/200);
 for(let i=0;i<n;i++){
  const x=w.x+hash(i,119+idx)*(w.w-8),y=w.y+hash(i,123+idx)*(w.h-6);
  rect(g,x,y,5+(i%3)*3,4+(i%4)*2,['#416e55','#527b55','#63845e','#8aa171'][i%4]);
 }
}
function paintDitch(){
 rect(g,204,166,12,671,'#74915f');rect(g,216,166,3,671,'#a8b980');
 for(let i=0;i<90;i++){let y=174+i*7,x=202+(hash(i,91)*8|0);if(i%4!==0)rect(g,x,y,2+(i%3),2,['#6d925c','#93aa6f','#527c58'][i%3])}
 rect(g,FLD.x-17,FLD.y-17,FLD.w+34,FLD.h+34,'#90a475');rect(g,FLD.x-8,FLD.y-8,FLD.w+16,FLD.h+16,'#a1a875');
}
// Drogi z grafu: najpierw obrzeża wszystkich krawędzi, potem wypełnienie — skrzyżowania stapiają się bez łat.
function paintRoads(){
 const {nodes,edges,degree}=MAP.roads;
 const P=e=>[nodes[e.a],nodes[e.b]];
 g.lineCap='round';g.lineJoin='round';
 for(const [col,add] of [['#829368',13],['#99886b',5],['#b8a47d',0]]){
  for(const e of edges){const [A,B]=P(e);g.strokeStyle=col;g.lineWidth=e.w+add;g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke()}
 }
 g.lineCap='butt';
 // koleiny: urywane przy skrzyżowaniach, żeby nie przecinały poprzecznej drogi
 for(const e of edges){
  const [A,B]=P(e),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  const trim=k=>degree[k]>2?Math.max(...edges.filter(q=>q.a===k||q.b===k).map(q=>q.w))/2+3:0;
  const ta=trim(e.a),tb=trim(e.b);
  for(const off of [-e.w*.22,e.w*.22]){
   g.strokeStyle='#927e60';g.lineWidth=1.6;g.beginPath();
   g.moveTo(A[0]+ux*ta-uy*off,A[1]+uy*ta+ux*off);g.lineTo(B[0]-ux*tb-uy*off,B[1]-uy*tb+ux*off);g.stroke();
  }
 }
 for(let i=0;i<360;i++){
  const x=(hash(i,202)*WORLD.w)|0,y=(hash(i,203)*WORLD.h)|0;
  if(roadClearance(x,y)<-4)rect(g,x,y,1+(i%3),1,i%3===0?'#d6c093':'#917f61');
 }
}
function paintYard(){
 const o=MAP.yard.outer,gr=MAP.yard.gravel;
 rect(g,o.x,o.y,o.w,o.h,'#9ba477');rect(g,gr.x,gr.y,gr.w,gr.h,'#c7b78c');
 for(let i=0;i<500;i++){let x=gr.x+(hash(i,25)*(gr.w-14)|0),y=gr.y+(hash(i,6)*(gr.h-4)|0);rect(g,x,y,2,hash(i,9)>.5?2:1,hash(i,11)>.5?'#b7aa87':'#d4c6a0')}
 for(let i=0;i<9;i++)line(g,1050+i*30,608,1050+i*30,780,'#b1a27b',1);
 const gd=MAP.props.garden;
 rect(g,gd.x,gd.y,gd.w,gd.h,'#92a36e');for(let x=gd.x+9;x<gd.x+gd.w-10;x+=16){rect(g,x,183,8,212,'#6a855e');for(let y=189;y<395;y+=17)rect(g,x+1,y,5,5,'#4f7450')}
}

// ───────── pole pszenicy ─────────
// Gładki szum wartości — duże, miękkie zmiany barwy zamiast losowych kwadratów 4×4.
const vn=(u,v)=>{const x=Math.floor(u),y=Math.floor(v),fx=u-x,fy=v-y,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 const a=hash(x,y,5),b=hash(x+1,y,5),c=hash(x,y+1,5),d=hash(x+1,y+1,5);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy};
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixc=(a,b,t)=>{const A=rgb(a),B=rgb(b);return`rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`};
// Pszenica: rzędy poziome co 4 px, ciemna bruzda i jasne kłosy tworzące kreskowane smugi (bez pionowego „kodu kreskowego”).
// Ściernisko: niski kontrast, krótkie ścięte łodygi w tych samych rzędach.
function fieldTile(i,j){
 const k=j*FLD.n+i,x=i*FLD.t,y=j*FLD.t,harvested=crop[k]===1;
 const n=vn(i/5,j/5)*.65+vn(i/1.6,j/1.6)*.35;
 if(harvested){
  rect(fc,x,y,8,8,mixc('#b3a073','#c0ad7f',n));
  for(const ry of [0,4]){
   rect(fc,x,y+ry+2,8,1,mixc('#a8956a','#b49f72',n));
   for(let xx=0;xx<8;xx+=2){const h=hash(i*8+xx,j*8+ry,3);if(h>.45)rect(fc,x+xx,y+ry+1,2,1,h>.88?'#d9c690':'#9d8a60')}
  }
 }else{
  rect(fc,x,y,8,8,mixc('#bfa25c','#d0b370',n));
  for(const ry of [0,4]){
   rect(fc,x,y+ry+2,8,1,mixc('#a58b4b','#b79b58',n));
   for(let xx=0;xx<8;xx+=2){const h=hash(i*8+xx,j*8+ry,3);if(h>.3)rect(fc,x+xx,y+ry,2,1,h>.7?'#ead593':'#dcc47f');if(h>.6)rect(fc,x+xx+1,y+ry+1,1,1,'#cdb36b')}
  }
 }
}

// ───────── obiekty (dachy w górnej warstwie, cienie w dolnej) ─────────
function roof(gl,gh,x,y,w,h,color){
 shadow(gl,x,y,w,h);
 rect(gh,x+2,y+5,w,h+5,'#75634f');
 rect(gh,x+5,y+7,w-9,h-4,'#c3b092');
 if(h>=w){
  poly(gh,[[x,y],[x+w/2,y+5],[x+w/2,y+h-6],[x,y+h]],color);
  poly(gh,[[x+w/2,y+5],[x+w,y],[x+w,y+h],[x+w/2,y+h-6]],'#b16c50');
  line(gh,x+w/2,y+5,x+w/2,y+h-6,'#e2aa79',2);
  for(let i=10;i<h-6;i+=12)line(gh,x+3,y+i,x+w-3,y+i,'#82513d',1);
 }else{
  poly(gh,[[x,y],[x+w,y],[x+w-6,y+h/2],[x+6,y+h/2]],color);
  poly(gh,[[x+6,y+h/2],[x+w-6,y+h/2],[x+w,y+h],[x,y+h]],'#aa6148');
  line(gh,x+8,y+h/2,x+w-8,y+h/2,'#e0a174',2);
  for(let i=10;i<w-6;i+=13)line(gh,x+i,y+3,x+i,y+h-3,'#8f513d',1);
 }
 rect(gh,x+6,y+h,w-12,6,'#c7b69c');rect(gh,x+Math.round(w*.62),y+h,13,5,'#685947');
 rect(gh,x+w-21,y+h,9,3,'#719298');
 rect(gh,x+6,y+6,5,5,'#e5b887');
}
function house(b){
 const {x,y}=b;roof(dl,dh,x,y,b.w,b.h,b.color);
 rect(dh,x+99,y+15,14,13,'#a8a08a');rect(dh,x+101,y+17,10,9,'#cbbea3');rect(dh,x+104,y+18,4,4,'#444945');
 rect(dh,x+7,y+46,22,7,'#d9b07c');rect(dh,x+9,y+48,18,3,'#b9a98f');
 rect(dh,x+56,y+12,17,13,'#78584d');rect(dh,x+58,y+14,13,9,'#6d8e99');rect(dh,x+60,y+15,9,2,'#a1bbc0');
}
function barn(b){
 const {x,y}=b;roof(dl,dh,x,y,b.w,b.h,b.color);
 rect(dh,x+20,y+23,45,26,'#725043');rect(dh,x+22,y+25,41,22,'#9d654f');
 for(let i=0;i<5;i++)line(dh,x+25+i*8,y+27,x+25+i*8,y+45,'#6b4539',1);
 rect(dh,x+133,y+20,40,17,'#684a3f');rect(dh,x+135,y+22,36,13,'#a77a55');
 for(let i=0;i<5;i++)rect(dh,x+90+i*4,y+32,2,9,'#d29a6e');
}
function crownPatch(gx,cx,cy,rad,base,lit,seed){
 const rr=Math.round(rad);
 for(let yy=-rr;yy<=rr;yy+=3){
  const taper=Math.sqrt(Math.max(0,1-(yy/rad)**2));
  const w=Math.round(rad*taper*(.86+.15*hash(yy,seed)));
  const shift=Math.round((hash(yy,seed,9)-.5)*5);
  if(w>0)rect(gx,cx-w+shift,cy+yy,w*2,3,base);
 }
 for(let k=0;k<Math.round(rad*2.0);k++){
  let dx=(hash(k,seed,3)*2-1)*rad,dy=(hash(k,seed,4)*2-1)*rad;
  if(dx*dx+dy*dy>rad*rad*.8)continue;
  rect(gx,cx+dx,cy+dy,2+(k%3),1+(k%2),lit[k%lit.length]);
 }
}
function shrub(s){
 const {x,y,seed}=s,r=s.r*1.4,sh=['#496e4d','#5a8057','#75935e','#8ca572'];
 rect(dl,x-6+LIGHT.x*4,y+r*.5+LIGHT.y*3,r*2.4,6,'#455e4760');
 crownPatch(dl,x-3,y,r*.68,sh[0],sh,seed);
 crownPatch(dl,x+5,y-2,r*.73,sh[1],sh,seed+13);
}
function treeShadow(t){
 const R=t.r*t.s;
 dl.fillStyle='#3d563b5a';dl.beginPath();dl.ellipse(Math.round(t.x+LIGHT.x*R*.9),Math.round(t.y+LIGHT.y*R*.9-R*.25),R*1.1,R*.72,Math.atan2(LIGHT.y,LIGHT.x),0,Math.PI*2);dl.fill();
}
function treeCrown(t){
 const r=t.r*t.s,seed=((t.x*7+t.y*11)|0);
 dh.save();dh.translate(Math.round(t.x),Math.round(t.y));
 rect(dh,-3,-3,8,Math.round(r*.55+4),'#6d5b43');rect(dh,0,0,2,Math.round(r*.55+2),'#a08557');
 if(t.type==='pine'){
  for(let layer=0;layer<4;layer++){
   const y=-r*.76+layer*r*.34,hw=r*(.34+layer*.14);
   poly(dh,[[-hw,y+7],[0,y-r*.48],[hw,y+7]],['#284f44','#35684b','#437853','#547f52'][layer]);
   for(let i=0;i<13+r*.3;i++){const dx=(hash(i,seed,layer)*2-1)*hw*.8,dy=y+hash(i,seed+layer,4)*8;rect(dh,dx,dy,2,1,i%4?'#739567':'#a0ae71')}
  }
 }else{
  crownPatch(dh,-r*.30,-r*.30,r*.69,'#466b49',['#779967','#95a873','#3d674a'],seed);
  crownPatch(dh,r*.26,-r*.39,r*.73,'#507652',['#8da66f','#638c5b','#a7af74'],seed+9);
  crownPatch(dh,-r*.06,-r*.78,r*.64,'#5f8558',['#a2b47d','#779c65','#4c7857'],seed+15);
 }
 dh.restore();
}
function bale(b){const {x,y}=b;dl.save();dl.translate(Math.round(x),Math.round(y));rect(dl,4,6,16,4,'#7d6f4c');rect(dl,0,0,17,10,'#d2b477');rect(dl,0,2,16,1,'#f0d293');rect(dl,2,7,14,2,'#a68d60');rect(dl,12,0,2,9,'#907c58');dl.restore()}
function parkedTractor(x,y){shadow(dl,x,y,33,53,20);rect(dl,x+1,y-7,9,16,'#303c37');rect(dl,x+30,y-7,9,16,'#303c37');rect(dl,x+2,y+37,7,14,'#394237');rect(dl,x+31,y+37,7,14,'#394237');rect(dl,x+10,y-8,20,58,'#b44d39');rect(dl,x+12,y-4,16,19,'#d05d42');rect(dl,x+11,y+16,18,18,'#547c81');rect(dl,x+13,y+18,14,12,'#9eb7ae');rect(dl,x+11,y+39,18,5,'#82402f')}
function pastureFence(x0,y0,x1,y1){
 const rails=['#a69673','#c5b58a'];
 for(const d of [0,3])for(const c of rails.slice(d?0:1)){
  line(dl,x0,y0+d,x1,y0+d,c,1);line(dl,x0,y1+d,x1,y1+d,c,1);line(dl,x0+d,y0,x0+d,y1,c,1);line(dl,x1+d,y0,x1+d,y1,c,1);
 }
 const post=(x,y)=>{rect(dl,x+2,y+3,5,6,'#425e4760');rect(dl,x-2,y-3,5,7,'#8a7656');rect(dl,x-1,y-3,3,2,'#dfcba0')};
 for(let x=x0;x<x1;x+=23){post(x,y0);post(x,y1)}
 for(let y=y0;y<y1;y+=23){post(x0,y);post(x1,y)}
 for(const x of [x0,x1])for(const y of [y0,y1])post(x,y);
}
function pole(x,y,nest){poly(dl,[[x,y],[x+5,y],[x+LIGHT.x*55+5,y+LIGHT.y*55],[x+LIGHT.x*55-3,y+LIGHT.y*55]],'#57674b66');rect(dl,x-3,y-28,6,42,'#75664e');rect(dl,x-5,y-26,2,39,'#b19b73');rect(dl,x-11,y-19,22,3,'#665b48');rect(dl,x-8,y-20,3,3,'#c8be9b');rect(dl,x+6,y-20,3,3,'#c8be9b');if(nest){rect(dl,x-12,y-31,24,6,'#69553d');rect(dl,x-9,y-35,20,7,'#8d6e47');rect(dl,x+1,y-43,5,8,'#e5e6d4');rect(dl,x+1,y-45,5,3,'#f8f0dd');rect(dl,x+6,y-39,8,2,'#b16a42')}}

function paintObjects(){
 const P=MAP.props;
 for(const b of MAP.buildings){if(b.type==='house')house(b);else if(b.type==='barn')barn(b);else roof(dl,dh,b.x,b.y,b.w,b.h,b.color)}
 for(let i=0;i<P.pallets.n;i++){rect(dl,P.pallets.x+i*11,P.pallets.y,8,14,'#a5875f');rect(dl,P.pallets.x+3+i*11,P.pallets.y+2,2,11,'#c2ab80')}
 for(let i=0;i<P.barrels.n;i++){rect(dl,P.barrels.x+i*15,P.barrels.y,11,17,['#64757a','#72846d','#9a664e'][i]);rect(dl,P.barrels.x+1+i*15,P.barrels.y+1,10,3,'#c3bda3')}
 parkedTractor(P.tractor.x,P.tractor.y);
 for(let x=1486;x<1600;x+=18){rect(dl,x,202,3,3,'#a6b68e');rect(dl,x+3,199,3,2,'#849d6e')}
 for(let i=0;i<5;i++){rect(dl,P.laundry.x+i*11,P.laundry.y,7,5,['#d6c6a2','#d9e6d4','#7396b0','#b86156','#d7d1b7'][i]);rect(dl,P.laundry.x+1+i*11,P.laundry.y+1,2,2,'#e9e3ce')}
 const pd=P.pond;rect(dl,pd.x,pd.y,pd.w,pd.h,'#668980');rect(dl,pd.x+3,pd.y+3,pd.w-6,pd.h-7,'#78a69f');rect(dl,pd.x+10,pd.y+8,25,2,'#c4d1ad');
 const tr=P.trough;rect(dl,tr.x,tr.y,tr.w,tr.h,'#867960');rect(dl,tr.x+3,tr.y+2,tr.w-6,tr.h-5,'#72999a');
 for(const p of P.poles)pole(p.x,p.y,p.nest);
 line(dl,986,162,981,744,'#6e7166',1);
 const s=P.sign;rect(dl,s.x+8,s.y+10,3,19,'#7c7155');rect(dl,s.x,s.y,47,13,'#e1d6b0');rect(dl,s.x+1,s.y+1,45,11,'#607c55');rect(dl,s.x+38,s.y+4,5,3,'#eee0b5');
 for(const f of MAP.fences){
  for(const rail of [0,4])line(dl,f.x,f.y0+rail,f.x,f.y1+rail,'#ab9770',1);
  for(let y=f.y0;y<=f.y1;y+=24){rect(dl,f.x-2,y,5,8,'#927b55');rect(dl,f.x-1,y,2,5,'#d7c399')}
 }
 const pa=MAP.pasture;pastureFence(pa.x0,pa.y0,pa.x1,pa.y1);
 for(const b of MAP.bales)bale(b);
 for(const s2 of MAP.shrubs)shrub(s2);
 const ts=[...MAP.trees].sort((a,b)=>a.y-b.y);
 for(const t of ts)treeShadow(t);
 for(const t of ts)treeCrown(t);
}

let built=false;
function buildWorld(){
 if(built)return;built=true;
 paintGrass();
 for(const f of MAP.fields)neighbourField(f);
 paintDitch();
 MAP.woods.forEach(paintWood);
 paintYard();
 paintRoads();
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
 paintObjects();
}

export {ground,field,crop,tracks,tc,decorLow,decorHigh,fieldTile,buildWorld};
