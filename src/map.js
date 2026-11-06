// Mapa jako dane (0.4.0). Jedno źródło prawdy dla rysowania, kolizji i ścieżek NPC.
// Nic tutaj nie rysuje: world.js maluje z tych list, main.js liczy kolizje z MAP.colliders,
// life.js prowadzi pojazdy po grafie dróg ROADS.
import {hash,FLD,WORLD} from './core.js';
import {distToSegment} from './geometry.js';

// ── Skala drzew: jeden mnożnik na całą mapę (patrz plan 0.4.1 — korekta skali) ──
export const TREE_SCALE=1;

// ── Graf dróg ──
export const NODES={nN:[945,-35],jD:[945,386],jX:[945,962],nS:[945,1640],nW:[-35,962],nE:[1995,962],dE:[1180,386]};
export const EDGES=[
 {a:'nN',b:'jD',w:53,kind:'road'},{a:'jD',b:'jX',w:53,kind:'road'},{a:'jX',b:'nS',w:53,kind:'road'},
 {a:'nW',b:'jX',w:40,kind:'road'},{a:'jX',b:'nE',w:40,kind:'road'},
 {a:'jD',b:'dE',w:30,kind:'drive'}
];
export const ROADS={nodes:NODES,edges:EDGES,
 degree:Object.fromEntries(Object.keys(NODES).map(k=>[k,EDGES.filter(e=>e.a===k||e.b===k).length])),
 neighbours(k){return EDGES.filter(e=>e.a===k||e.b===k).map(e=>({edge:e,to:e.a===k?e.b:e.a}))}};
const SEG=EDGES.map(e=>({x1:NODES[e.a][0],y1:NODES[e.a][1],x2:NODES[e.b][0],y2:NODES[e.b][1],w:e.w}));
// Odległość punktu od krawędzi jezdni (ujemna = na jezdni).
export function roadClearance(x,y){let m=1e9;for(const s of SEG)m=Math.min(m,distToSegment(x,y,s.x1,s.y1,s.x2,s.y2)-s.w/2);return m}

// ── Pola, lasy, podwórze ──
export const YARD={outer:{x:1000,y:172,w:630,h:758},gravel:{x:1033,y:212,w:437,h:618}};
export const FIELDS=[
 {id:'rape-n',x:279,y:8,w:585,h:132,kind:'rape',seed:1},
 {id:'pasture',x:22,y:255,w:173,h:605,kind:'hay',seed:2,pasture:true},
 {id:'stubble-s',x:110,y:1051,w:762,h:484,kind:'stubble',seed:3},
 {id:'green-se',x:1035,y:1030,w:400,h:490,kind:'green',seed:4},
 {id:'rape-e',x:1646,y:60,w:288,h:858,kind:'rape',seed:5},
 {id:'hay-ne',x:1090,y:4,w:545,h:132,kind:'hay',seed:6},
 {id:'hay-se',x:1660,y:1040,w:276,h:495,kind:'hay',seed:7}
];
export const WOODS=[
 {id:'belt-n',x:3,y:0,w:258,h:72},
 {id:'forest-sw',x:0,y:993,w:195,h:607},
 {id:'wood-se',x:1440,y:1030,w:205,h:490}
];
export const PASTURE={x0:34,y0:268,x1:189,y1:849};

// ── Budynki i rekwizyty ze stałą kolizją ──
export const BUILDINGS=[
 {id:'house',type:'house',x:1086,y:237,w:140,h:96,color:'#b66d50'},
 {id:'barn',type:'barn',x:1102,y:471,w:194,h:115,color:'#8c5142'},
 {id:'shed',type:'shed',x:1369,y:618,w:86,h:60,color:'#8b6350'}
];
export const PROPS={
 tractor:{x:1290,y:714},
 pallets:{x:1350,y:478,n:6},barrels:{x:1089,y:690,n:3},
 pond:{x:1518,y:778,w:55,h:27},trough:{x:1109,y:792,w:31,h:15},
 poles:[{x:986,y:188,nest:true},{x:981,y:770,nest:false}],
 sign:{x:1004,y:333},laundry:{x:1446,y:735},garden:{x:1480,y:165,w:135,h:242}
};
export const FENCES=[ // płot przy drodze (z bramą na podjeździe)
 {x:1004,y0:193,y1:355},{x:1004,y0:416,y1:903}
];

// ── Kolizje ──
export const colliders=[];
function addRect(x,y,w,h,id){colliders.push({shape:'obb',x:x+w/2,y:y+h/2,hw:w/2,hh:h/2,a:0,id,br:Math.hypot(w,h)/2})}
function addCircle(x,y,r,id){colliders.push({shape:'circle',x,y,r,id,br:r})}
for(const b of BUILDINGS)addRect(b.x,b.y,b.w+2,b.h+10,b.id);
addRect(PROPS.tractor.x+1,PROPS.tractor.y-8,38,59,'tractor');
addRect(PROPS.pallets.x,PROPS.pallets.y,PROPS.pallets.n*11,14,'pallets');
addRect(PROPS.barrels.x,PROPS.barrels.y,PROPS.barrels.n*15,17,'barrels');
addRect(PROPS.pond.x,PROPS.pond.y,PROPS.pond.w,PROPS.pond.h,'pond');
addRect(PROPS.trough.x,PROPS.trough.y,PROPS.trough.w,PROPS.trough.h,'trough');
for(const p of PROPS.poles)addCircle(p.x,p.y+11,5,'pole');
addRect(PROPS.sign.x+8,PROPS.sign.y+10,3,19,'sign');
for(const f of FENCES)addRect(f.x-3,f.y0,7,f.y1-f.y0+4,'fence');
{const {x0,y0,x1,y1}=PASTURE; // czterobokowe pastwisko
 addRect(x0-3,y0-3,x1-x0+9,8,'pasture');addRect(x0-3,y1-3,x1-x0+9,8,'pasture');
 addRect(x0-3,y0-3,8,y1-y0+9,'pasture');addRect(x1-3,y0-3,8,y1-y0+9,'pasture');}

// ── Rozmieszczanie roślinności z regułami (nic nie ląduje na drodze, w polu ani w budynku) ──
const inRect=(x,y,r,m=0)=>x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m;
const mainField={x:FLD.x,y:FLD.y,w:FLD.w,h:FLD.h};
const solids=[...BUILDINGS.map(b=>({x:b.x,y:b.y,w:b.w+2,h:b.h+10})),
 {x:PROPS.tractor.x,y:PROPS.tractor.y-8,w:40,h:60},PROPS.pond,PROPS.trough,{x:PROPS.garden.x,y:PROPS.garden.y,w:PROPS.garden.w,h:PROPS.garden.h},
 {x:PROPS.laundry.x-4,y:PROPS.laundry.y-6,w:60,h:16},{x:PASTURE.x0-6,y:PASTURE.y0-6,w:PASTURE.x1-PASTURE.x0+12,h:PASTURE.y1-PASTURE.y0+12},
 {x:YARD.gravel.x,y:YARD.gravel.y,w:YARD.gravel.w,h:YARD.gravel.h}];
function free(x,y,r,o={}){
 if(x<4||y<4||x>WORLD.w-4||y>WORLD.h-4)return false;
 if(roadClearance(x,y)<r*.7+3)return false;
 for(const s of solids)if(inRect(x,y,s,r*.6))return false;
 if(!o.yard&&inRect(x,y,YARD.outer,r*.4))return false;
 if(!o.belt&&inRect(x,y,mainField,22))return false;
 const inWood=WOODS.some(w=>inRect(x,y,w));
 if(!inWood)for(const f of FIELDS)if(inRect(x,y,f,-2))return false;
 return true;
}
export const trees=[],shrubs=[],bales=[];
function addTree(x,y,r,type,s=1,o={}){
 s*=TREE_SCALE;
 if(!free(x,y,r*s,o))return;
 trees.push({x,y,r,type,s,tag:o.tag||''});
 addCircle(x+1,y+4,5,'tree');
}
function addShrub(x,y,r,seed,o={}){if(free(x,y,r,o))shrubs.push({x,y,r,seed})}

// Sad
for(let i=0;i<12;i++)addTree(1510+(i%4)*37,463+Math.floor(i/4)*87,18,'round',.8+hash(i,12)*.35,{yard:true,tag:'orchard'});
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
// Żywopłot po zachodniej stronie wschodniego pola
for(let i=0;i<86;i++){const y=62+i*10,x=1628+(hash(i,95)*10|0);if(i%9===0)addTree(x,y,16,'round',.8,{belt:true});else addShrub(x,y,6+(i%4),i+95,{belt:true})}
// Rozproszone krzaki i drzewa południowego wschodu oraz lasu
for(let i=0;i<91;i++){const x=1080+hash(i,104)*790,y=1020+hash(i,105)*560;if(i%5===0)addTree(x,y,12+(i%4)*2,i%3?'round':'pine',.7);else if(i%3!==0)addShrub(x,y,6+(i%5),i+104)}
for(let i=0;i<55;i++){const x=16+hash(i,140)*185,y=1050+hash(i,141)*530;if(i%3===0)addTree(x,y,13+(i%5)*2,i%4===0?'pine':'round',.7);else addShrub(x,y,7+(i%5),i+140)}
// Belki słomy na ściernisku
for(let i=0;i<15;i++){const s=.7+hash(i,83)*.8,x=100+hash(i,81)*820,y=1082+hash(i,82)*345;
 if(free(x,y,10*s,{belt:true})&&inRect(x,y,FIELDS[2],-6)){bales.push({x,y,s});addRect(x,y,17*s,10*s,'bale')}}

// Statyczne kolizje poza ruchem: indeks do szybkiego przeglądu.
export function nearbyColliders(x,y,r){
 const out=[];for(const c of colliders){const dx=c.x-x,dy=c.y-y,rr=r+c.br;if(dx*dx+dy*dy<rr*rr)out.push(c)}return out}

export const MAP={nodes:NODES,roads:ROADS,fields:FIELDS,woods:WOODS,yard:YARD,pasture:PASTURE,buildings:BUILDINGS,props:PROPS,fences:FENCES,trees,shrubs,bales,colliders};
