// Mapa jako dane (0.4.0). Jedno źródło prawdy dla rysowania, kolizji i ścieżek NPC.
// Nic tutaj nie rysuje: world.js maluje z tych list, main.js liczy kolizje z MAP.colliders,
// life.js prowadzi pojazdy po grafie dróg ROADS.
import {hash,FLD,WORLD} from './core.js';
import {distToSegment,obbCircle} from './geometry.js';

// ── Skala drzew: jeden mnożnik na całą mapę (patrz plan 0.4.1 — korekta skali) ──
export const TREE_SCALE=1.6;

// ── Graf dróg ──
// jD = skrzyżowanie z podjazdem do gospodarstwa; gN→tN→nE2 = droga od bramy północnej na „drugie pole” (na razie ślepa, wkrótce).
export const NODES={nN:[945,-35],jD:[945,501],jX:[945,962],nS:[945,1640],nW:[-35,962],dE:[1050,501],gN:[1760,150],tN:[1760,70],nE2:[1995,70]};
export const EDGES=[
 {a:'nN',b:'jD',w:60,kind:'road'},{a:'jD',b:'jX',w:60,kind:'road'},{a:'jX',b:'nS',w:60,kind:'road'},
 {a:'nW',b:'jX',w:48,kind:'road'},
 {a:'jD',b:'dE',w:66,kind:'drive'},
 {a:'gN',b:'tN',w:60,kind:'road'},{a:'tN',b:'nE2',w:60,kind:'road'}
];
export const ROADS={nodes:NODES,edges:EDGES,
 degree:Object.fromEntries(Object.keys(NODES).map(k=>[k,EDGES.filter(e=>e.a===k||e.b===k).length])),
 neighbours(k){return EDGES.filter(e=>e.a===k||e.b===k).map(e=>({edge:e,to:e.a===k?e.b:e.a}))}};
const SEG=EDGES.map(e=>({x1:NODES[e.a][0],y1:NODES[e.a][1],x2:NODES[e.b][0],y2:NODES[e.b][1],w:e.w}));
// Odległość punktu od krawędzi jezdni (ujemna = na jezdni).
export function roadClearance(x,y){let m=1e9;for(const s of SEG)m=Math.min(m,distToSegment(x,y,s.x1,s.y1,s.x2,s.y2)-s.w/2);return m}

// ── Gospodarstwo wg szkicu (1 px szkicu ≈ 1,1 px świata; 12 px = 1 m) ──
// Płot brązowy dookoła; wjazd od zachodu (114 px) między ogrodem a wiatą, brama od północy na drogę na drugie pole.
export const FARM={x:1050,y:150,w:847,h:823};
export const GARDEN={x:1050,y:150,w:506,h:310};            // teren wokół domu: ogródek, ścieżki, pies, buda
export const BEDS={x:1262,y:182,w:262,h:170};              // grządki
export const GATE_N={x0:1700,x1:1820};                      // brama północna
export const GATE_W={y0:458,y1:572};                        // wjazd od drogi
export const FIELDS=[
 {id:'rape-n',x:279,y:8,w:585,h:132,kind:'rape',seed:1},
 {id:'pasture',x:22,y:255,w:173,h:605,kind:'hay',seed:2,pasture:true},
 {id:'stubble-s',x:110,y:1051,w:762,h:484,kind:'stubble',seed:3},
 {id:'green-se',x:1035,y:1030,w:400,h:490,kind:'green',seed:4},
 {id:'hay-se',x:1660,y:1040,w:276,h:495,kind:'hay',seed:7}
];
export const WOODS=[
 {id:'belt-n',x:3,y:0,w:258,h:72},
 {id:'forest-sw',x:0,y:993,w:195,h:607},
 {id:'wood-se',x:1440,y:1030,w:205,h:490}
];
export const PASTURE={x0:34,y0:268,x1:189,y1:849};

// ── Budynki ──
export const BUILDINGS=[
 {id:'house',type:'house',x:1108,y:271,w:110,h:154,color:'#b66d50'},
 {id:'stable',type:'barn',x:1573,y:161,w:110,h:299,color:'#8c5142'},     // inne zabudowania (przy bramie)
 {id:'wiata',type:'shed',x:1068,y:570,w:162,h:383,color:'#8b6350'},      // budynek gospodarczy / wiata
 {id:'barn',type:'barn',x:1485,y:793,w:368,h:149,color:'#8c5142'}        // inne zabudowania (południe)
];
export const PROPS={
 kennel:{x:1238,y:332,w:22,h:20},
 poles:[], // generowane niżej wzdłuż drogi głównej
 sign:{x:1002,y:395},laundry:{x:1290,y:392}
};
// ── Magazyn zboża: dwa silosy BIN (blacha falista, dach stożkowy), kosz zasypowy i przenośnik ślimakowy ──
export const SILOS=[{id:'silo1',x:1815,y:640,r:30},{id:'silo2',x:1815,y:712,r:30}];
export const PIT={x:1704,y:655,w:60,h:42};                  // kosz zasypowy (kratka na poziomie gruntu)
// Błoto i kałuże na podwórzu (wet = z wodą): ślady kół i plusk.
export const PUDDLES=[[1450,650,34,18,1],[1335,725,26,13,0],[1625,610,30,15,1],[1710,740,28,14,0],[1300,520,22,10,1],[1560,560,20,10,0],[1520,745,24,12,1]];
export const puddleAt=(x,y)=>PUDDLES.find(([px,py,rx,ry])=>((x-px)/(rx+4))**2+((y-py)/(ry+3))**2<1)||null;
// Linia energetyczna wzdłuż drogi głównej, co ~150 px; omija wjazd, skrzyżowania i drogę boczną.
{const ys=[40,190,340,640,790,1090,1240,1390,1540];
 ys.forEach((y,i)=>{if(roadClearance(1004,y)>=10)PROPS.poles.push({x:1004,y,nest:y===340})})}
// Płoty: style 'brown' (obwód gospodarstwa) i 'inner' (ogródek). Odcinki poziome/pionowe.
const FX0=FARM.x,FY0=FARM.y,FX1=FARM.x+FARM.w,FY1=FARM.y+FARM.h;
export const FENCES=[
 {x1:FX0,y1:FY0,x2:GATE_N.x0,y2:FY0,style:'brown'},{x1:GATE_N.x1,y1:FY0,x2:FX1,y2:FY0,style:'brown'},
 {x1:FX1,y1:FY0,x2:FX1,y2:FY1,style:'brown'},
 {x1:FX0,y1:FY1,x2:FX1,y2:FY1,style:'brown'},
 {x1:FX0,y1:FY0,x2:FX0,y2:GATE_W.y0,style:'brown'},{x1:FX0,y1:GATE_W.y1,x2:FX0,y2:FY1,style:'brown'},
 // ogródek: południe (furtka x 1150–1190) i wschód (furtka y 330–362)
 {x1:FX0,y1:460,x2:1150,y2:460,style:'inner'},{x1:1190,y1:460,x2:1556,y2:460,style:'inner'},
 {x1:1556,y1:FY0,x2:1556,y2:330,style:'inner'},{x1:1556,y1:362,x2:1556,y2:460,style:'inner'}
];

// ── Kolizje ──
export const colliders=[];
function addRect(x,y,w,h,id){colliders.push({shape:'obb',x:x+w/2,y:y+h/2,hw:w/2,hh:h/2,a:0,id,br:Math.hypot(w,h)/2})}
function addCircle(x,y,r,id){colliders.push({shape:'circle',x,y,r,id,br:r})}
for(const b of BUILDINGS)addRect(b.x,b.y,b.w+2,b.h+10,b.id);
addRect(PROPS.kennel.x,PROPS.kennel.y,PROPS.kennel.w,PROPS.kennel.h,'kennel');
for(const p of PROPS.poles)addCircle(p.x,p.y+11,5,'pole');
for(const s of SILOS)addCircle(s.x,s.y,s.r,s.id);
addRect(PROPS.sign.x+8,PROPS.sign.y+10,3,19,'sign');
for(const f of FENCES){
 if(f.y1===f.y2)addRect(Math.min(f.x1,f.x2)-3,f.y1-3,Math.abs(f.x2-f.x1)+7,7,'fence');
 else addRect(f.x1-3,Math.min(f.y1,f.y2)-3,7,Math.abs(f.y2-f.y1)+7,'fence');
}
{const {x0,y0,x1,y1}=PASTURE; // czterobokowe pastwisko
 addRect(x0-3,y0-3,x1-x0+9,8,'pasture');addRect(x0-3,y1-3,x1-x0+9,8,'pasture');
 addRect(x0-3,y0-3,8,y1-y0+9,'pasture');addRect(x1-3,y0-3,8,y1-y0+9,'pasture');}

// ── Rozmieszczanie roślinności z regułami (nic nie ląduje na drodze, w polu ani w budynku) ──
const inRect=(x,y,r,m=0)=>x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m;
const mainField={x:FLD.x,y:FLD.y,w:FLD.w,h:FLD.h};
const solids=[...BUILDINGS.map(b=>({x:b.x,y:b.y,w:b.w+2,h:b.h+10})),

 {x:PASTURE.x0-6,y:PASTURE.y0-6,w:PASTURE.x1-PASTURE.x0+12,h:PASTURE.y1-PASTURE.y0+12}];
function free(x,y,r,o={}){
 if(x<4||y<4||x>WORLD.w-4||y>WORLD.h-4)return false;
 if(roadClearance(x,y)<r*.7+3)return false;
 for(const s of solids)if(inRect(x,y,s,r*.6))return false;
 if(!o.yard&&inRect(x,y,FARM,r*.6+6))return false;
 if(!o.belt&&inRect(x,y,mainField,22))return false;
 const inWood=WOODS.some(w=>inRect(x,y,w));
 if(!inWood)for(const f of FIELDS)if(inRect(x,y,f,-2))return false;
 return true;
}
export const trees=[],shrubs=[],bales=[];
// Korona drzewa nie może zachodzić na pole: drzewa poza lasem odsuwamy od prostokątów pól o promień korony.
function clearOfFields(x,y,m){
 for(let pass=0;pass<2;pass++)for(const R of [...FIELDS,mainField]){
  if(x>R.x-m&&x<R.x+R.w+m&&y>R.y-m&&y<R.y+R.h+m){
   const e=[[x-(R.x-m),-1,0],[R.x+R.w+m-x,1,0],[y-(R.y-m),0,-1],[R.y+R.h+m-y,0,1]].sort((a,b)=>a[0]-b[0])[0];
   x+=e[1]*e[0];y+=e[2]*e[0];
  }
 }
 return [x,y];
}
function addTree(x,y,r,type,s=1,o={}){
 s*=TREE_SCALE;
 if(!WOODS.some(w=>inRect(x,y,w)))[x,y]=clearOfFields(x,y,r*s*.7);
 if(!free(x,y,r*s,o)||roadClearance(x,y)<30)return;
 trees.push({x,y,r,type,s,tag:o.tag||''});
 addCircle(x+1,y+4,7,'tree');
}
function addShrub(x,y,r,seed,o={}){if(free(x,y,r,o))shrubs.push({x,y,r,seed})}

// Dwa drzewa w ogródku
addTree(1088,208,18,'round',.9,{yard:true,tag:'garden'});addTree(1520,425,18,'round',.8,{yard:true,tag:'garden'});
// Zachodnia miedza przy polu
for(let i=0;i<18;i++){const y=94+i*53,x=FLD.x-28-(hash(i,18)*30|0);if(i%3===0)addTree(x,y,19,'round',1,{belt:true});else addShrub(x-2,y+3,7,i+400,{belt:true})}
// Wschodnia miedza przy polu
for(let i=0;i<16;i++){const y=105+i*56,x=FLD.x+FLD.w+21+(hash(i,30)*17|0);if(i%4===0&&y<FLD.y+FLD.h-35)addTree(x+8,y,14,'pine',1,{belt:true});else if(i%3===0)addShrub(x+4,y+4,6,i+420,{belt:true})}
// Linia drzew nad południowym polem
for(let i=0;i<20;i++){const x=80+i*75,y=1030+hash(i,14)*30;addTree(x,y,12+i%3*3,i%3?'round':'pine',1,{belt:true})}
for(let i=0;i<9;i++)addTree(1060+i*58,1020+hash(i,19)*50,18,'round',1,{belt:true});
// Pas drzew na północy, las na południowym zachodzie, zagajnik na południowym wschodzie
for(let i=0;i<27;i++){const x=20+(i%9)*29,y=28+Math.floor(i/9)*25+(hash(i,54)*10|0);addTree(x,y,15+i%4*2,i%4===0?'pine':'round',.7)}
for(let i=0;i<24;i++){const x=11+(i%4)*24,y=1030+Math.floor(i/4)*39+(hash(i,56)*12|0);addTree(x,y,17+i%3*2,i%3===0?'pine':'round',.85)}
for(let i=0;i<23;i++){const x=1448+(i%5)*38,y=1034+Math.floor(i/5)*47+(hash(i,57)*10|0);addTree(x,y,19+(i%3)*3,i%4===0?'pine':'round',.9)}
// Krzewy na miedzach
for(let i=0;i<77;i++){const y=149+i*10.5,x=206+(hash(i,81)*18|0);if(y<FLD.y+FLD.h+29)addShrub(x,y,5+(i%4),i+81,{belt:true})}
for(let i=0;i<83;i++){const y=153+i*9,x=FLD.x+FLD.w+16+(hash(i,88)*23|0);if(y<FLD.y+FLD.h+25&&i%3!==0)addShrub(x,y,5+(i%4),i+88,{belt:true})}
// Rozproszone krzaki i drzewa południowego wschodu oraz lasu
for(let i=0;i<91;i++){const x=1080+hash(i,104)*790,y=1020+hash(i,105)*560;if(i%5===0)addTree(x,y,12+(i%4)*2,i%3?'round':'pine',.7);else if(i%3!==0)addShrub(x,y,6+(i%5),i+104)}
for(let i=0;i<55;i++){const x=16+hash(i,140)*185,y=1050+hash(i,141)*530;if(i%3===0)addTree(x,y,13+(i%5)*2,i%4===0?'pine':'round',.7);else addShrub(x,y,7+(i%5),i+140)}
// Belki słomy na ściernisku
for(let i=0;i<15;i++){const s=.7+hash(i,83)*.8,x=100+hash(i,81)*820,y=1082+hash(i,82)*345;
 if(free(x,y,10*s,{belt:true})&&inRect(x,y,FIELDS[2],-6)){bales.push({x,y,s});addRect(x,y,17*s,10*s,'bale')}}

// Statyczne kolizje poza ruchem: indeks do szybkiego przeglądu.
export function nearbyColliders(x,y,r){
 const out=[];for(const c of colliders){const dx=c.x-x,dy=c.y-y,rr=r+c.br;if(dx*dx+dy*dy<rr*rr)out.push(c)}return out}

// Czy koło (x,y,r) zachodzi na stałą przeszkodę? (dokładny test, nie tylko okręgi otaczające)
export function pointBlocked(x,y,r=6){
 for(const c of nearbyColliders(x,y,r)){
  if(c.shape==='circle'){if(Math.hypot(c.x-x,c.y-y)<c.r+r)return true}
  else if(obbCircle(c,{x,y,r}))return true;
 }
 return false;
}

export const MAP={nodes:NODES,roads:ROADS,fields:FIELDS,woods:WOODS,farm:FARM,garden:GARDEN,beds:BEDS,pasture:PASTURE,buildings:BUILDINGS,props:PROPS,fences:FENCES,silos:SILOS,pit:PIT,puddles:PUDDLES,trees,shrubs,bales,colliders};
