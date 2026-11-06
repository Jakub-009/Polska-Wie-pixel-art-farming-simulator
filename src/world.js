// Malowanie świata z danych (map.js). Każda warstwa to osobny canvas:
//  ground     — teren, pola sąsiadów, drogi, podwórze (raz)
//  field      — pszenica głównego pola (zmienia się kafelek po kafelku)
//  tracks     — ślady kół na ściernisku
//  decorLow   — płoty, krzewy, cienie, rekwizyty (pod pojazdami)
//  decorHigh  — dachy i korony drzew (NAD pojazdami)
import {WORLD,FLD,N,hash,rect,line,poly,shadow,LIGHT} from './core.js';
import {MAP,roadClearance} from './map.js';
import {SILOS,PIT} from './map.js';
import {paintSiloLow,paintSiloHigh} from './silo.js';

const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g]};
const [ground,g]=mk(WORLD.w,WORLD.h);
const [field,fc]=mk(FLD.w,FLD.h);
const [tracks,tc]=mk(WORLD.w,WORLD.h);
const [decorLow,dl]=mk(WORLD.w,WORLD.h);
const [decorHigh,dh]=mk(WORLD.w,WORLD.h);
const crop=new Uint8Array(N); // 1 = skoszone
// Obrys 1 px wokół narysowanego obiektu (wyostrzenie: drzewa i krzewy mają czytelną krawędź jak pojazdy).
const [otmp,og]=mk(200,200),[otmp2,og2]=mk(200,200);
function outlinedDraw(dst,x,y,drawFn,col='#1f3027'){
 og.clearRect(0,0,200,200);og.save();og.translate(100,100);drawFn(og);og.restore();
 og2.clearRect(0,0,200,200);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])og2.drawImage(otmp,dx,dy);
 og2.globalCompositeOperation='source-in';og2.fillStyle=col;og2.fillRect(0,0,200,200);og2.globalCompositeOperation='source-over';
 og2.drawImage(otmp,0,0);
 dst.drawImage(otmp2,Math.round(x)-100,Math.round(y)-100);
}
// Krawędzie malowane ścieżkami (wielokąty, elipsy) są wygładzane — progowanie alfa daje ostre, pikselowe brzegi.
function crispAlpha(cv,soft=false){
 const c=cv.getContext('2d'),im=c.getImageData(0,0,cv.width,cv.height),d=im.data;
 // soft: zostaw półprzezroczyste cienie (alfa < 140), utwardź tylko krawędzie obiektów
 for(let i=3;i<d.length;i+=4)d[i]=soft?(d[i]>=140?255:d[i]<24?0:d[i]):(d[i]<128?0:255);
 c.putImageData(im,0,0);
}

// ───────── teren ─────────
function paintGrass(){
 const [grass,gg]=mk(128,128);rect(gg,0,0,128,128,'#88a075');
 for(let i=0;i<820;i++){let x=(hash(i,8)*128)|0,y=(hash(i,19)*128)|0,p=hash(i,27);rect(gg,x,y,p>.75?2:1,1,['#9db180','#718b6b','#bdba83','#7e9c70','#aab784'][Math.floor(hash(i,38)*5)])}
 g.fillStyle=g.createPattern(grass,'repeat');g.fillRect(0,0,WORLD.w,WORLD.h);
 poly(g,[[0,0],[540,0],[465,128],[0,149]],'#9faf70');for(let i=0;i<34;i++){let y=i*4;line(g,0,y,480-y*.18,y+7,'#b4b681',1)}
 poly(g,[[0,1020],[1050,1014],[1050,1600],[0,1600]],'#b6aa76');for(let i=0;i<97;i++)line(g,0,1028+i*6,1014,1030+i*6,'#c6bb89',1);
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
// Drogi z grafu (0.6.1): wszystkie odcinki są osiowe, więc malujemy je prostokątami (ostre krawędzie).
// Warstwy: pobocze → skraj/krawężnik → wypełnienie polne → asfalt boczny → asfalt główny; skrzyżowania stapiają się bez łat.
const edgeRect=(e,add)=>{
 const A=MAP.nodes[e.a],B=MAP.nodes[e.b],h=(e.w+add)/2;
 if(A[0]===B[0])return[A[0]-h,Math.min(A[1],B[1]),h*2,Math.abs(B[1]-A[1])];
 return[Math.min(A[0],B[0]),A[1]-h,Math.abs(B[0]-A[0]),h*2];
};
const ASPH='#767b7f',ASPH2=['#6c7175','#81868a','#70757a'];
function paintRoads(){
 const E=MAP.roads.edges,isA=e=>e.kind==='main'||e.kind==='side';
 // trawiaste pobocze (szersze przy głównej), potem skraj jezdni: na bocznej wiejski (bez krawężnika), na głównej niski krawężnik
 for(const e of E){const [x,y,w,h]=edgeRect(e,e.kind==='main'?26:e.kind==='side'?30:14);rect(g,x,y,w,h,'#829368')}
 for(const e of E){const [x,y,w,h]=edgeRect(e,e.kind==='side'?26:6);rect(g,x,y,w,h,e.kind==='side'?'#a9a07f':isA(e)?'#b8b7ac':'#99886b')}
 for(const kind of ['dirt','drive','side','main']){
  for(const e of E.filter(q=>q.kind===kind)){const [x,y,w,h]=edgeRect(e,kind==='side'?-0:0);rect(g,x,y,w,h,kind==='dirt'||kind==='drive'?'#b8a47d':ASPH)}
 }
 // pobocze drogi bocznej: ubity żwir i piasek z kępkami trawy (lekko, bez wyraźnej krawędzi)
 for(const e of E.filter(q=>q.kind==='side')){
  const [x,y,w,h]=edgeRect(e,26);
  for(let i=0;i<w*h/16;i++){const px=x+hash(i,370)*(w-1)|0,py=y+hash(i,371)*(h-1)|0;rect(g,px,py,1+(i%4===0),1,['#b9b08e','#988f72','#c3bb9a','#8f9a6c'][i%4])}
 }
 // faktura asfaltu: ziarno, łaty (wiejskie, nierówne), pęknięcia
 for(const e of E.filter(isA)){
  const [x,y,w,h]=edgeRect(e,0),vert=e.a===e.b||MAP.nodes[e.a][0]===MAP.nodes[e.b][0];
  for(let i=0;i<w*h/8;i++){const px=x+hash(i,301+w)*(w-1)|0,py=y+hash(i,302+h)*(h-1)|0;rect(g,px,py,1+(i%5===0),1,ASPH2[i%3])}
  for(let i=0;i<w*h/3200;i++){const px=x+hash(i,310)*(w-14)|0,py=y+hash(i,311)*(h-8)|0,pw=vert?6+(i%3)*3:12+(i%4)*6,ph=vert?10+(i%4)*6:5+(i%3)*2;rect(g,px,py,pw,ph,i%3?'#727779':'#7d8285')}
  for(let i=0;i<w*h/7000;i++){let px=x+hash(i,315)*(w-8)|0,py=y+hash(i,316)*(h-8)|0;for(let k=0;k<10+(i%8);k++){rect(g,px,py,1,1,'#686c6f');if(hash(i,k,317)<.5)px+=(hash(i,k,318)<.5?-1:1);else py+=1}}
 }
 // koleiny polne: dwie ciemne smugi wzdłuż środka każdej drogi polnej (urywane przy skrzyżowaniach)
 const {nodes,degree}=MAP.roads;
 for(const e of E.filter(q=>q.kind==='dirt')){
  const A=nodes[e.a],B=nodes[e.b],vert=A[0]===B[0],L=Math.hypot(B[0]-A[0],B[1]-A[1]);
  const ta=degree[e.a]>2?e.w/2+3:0,tb=degree[e.b]>2?e.w/2+3:0;
  for(const off of [-e.w*.22,e.w*.22]){
   if(vert)rect(g,A[0]+off-1,Math.min(A[1],B[1])+ta,2,L-ta-tb,'#927e60');
   else rect(g,Math.min(A[0],B[0])+ta,A[1]+off-1,L-ta-tb,2,'#927e60');
  }
 }
 for(let i=0;i<520;i++){
  const x=(hash(i,202)*WORLD.w)|0,y=(hash(i,203)*WORLD.h)|0;
  if(roadClearance(x,y,['dirt','drive'])<-4&&roadClearance(x,y,['main','side'])>2)rect(g,x,y,1+(i%3),1,i%3===0?'#d6c093':'#917f61');
 }
 // droga główna: tylko przerywana oś (bez linii krawędziowych), urwana na skrzyżowaniach i przejściu
 for(const e of E.filter(q=>q.kind==='main')){
  const A=nodes[e.a],B=nodes[e.b],x0=Math.min(A[0],B[0]),L=Math.abs(B[0]-A[0]),yc=A[1];
  for(let xx=Math.ceil(x0/40)*40;xx<x0+L;xx+=40){
   if(Math.abs(xx+10-945)<46||Math.abs(xx+10-2150)<40||Math.abs(xx+10-MAP.zebra.x)<24)continue;
   rect(g,xx,yc-1,22,2,'#e6e4d8');
  }
 }
 paintDitches();
 paintMainWalk();
 const Z=MAP.zebra;
 for(let y=Z.y-Z.h/2+4;y<Z.y+Z.h/2-4;y+=9)rect(g,Z.x-Z.w/2,y,Z.w,5,'#e9e7dc');
}
// Rowy przydrożne: po zachodniej stronie drogi bocznej i po południowej stronie głównej; przepusty z betonowych rur przy wjazdach.
function paintDitches(){
 const ditchV=(x,y0,y1)=>{rect(g,x-4,y0,8,y1-y0,'#74905c');rect(g,x-2,y0,4,y1-y0,'#678557');for(let y=y0;y<y1;y+=70)rect(g,x-1,y,2,6+(y%3),'#86a39a')};
 const ditchH=(y,x0,x1)=>{rect(g,x0,y-4,x1-x0,8,'#6f8858');rect(g,x0,y-2,x1-x0,4,'#5f7a52');for(let x=x0;x<x1;x+=30)rect(g,x,y-1,8+(x%3),2,'#8aa7a0')};
 const culvertV=(x,y)=>{rect(g,x-9,y-12,18,24,'#8a8a80');rect(g,x-7,y-10,14,20,'#a7a79b');rect(g,x-8,y-12,16,3,'#6f6f66');rect(g,x-8,y+9,16,3,'#6f6f66');rect(g,x-4,y-9,8,18,'#3d4a45')};
 // zachodni rów drogi bocznej (przerwa na polną drogę i wjazdy)
 ditchV(906,-120,938);culvertV(906,962);ditchV(906,988,1650);
 // wschodni rów (przepust przy wjeździe na podwórze)
 ditchV(1002,-120,468);culvertV(1002,501);ditchV(1002,534,1650);
 ditchH(1792,-10,WORLD.w+10);
}
// Chodnik po północnej stronie drogi głównej, przerwany przy wylotach dróg; wiejski: kostka betonowa i trawa wciskająca się w spoiny.
function paintMainWalk(){
 const W=MAP.mainwalk,h=W.y1-W.y0;let x=0;
 const slab=(x0,x1)=>{
  if(x1<=x0)return;
  rect(g,x0,W.y0,x1-x0,h,'#c1bdaf');
  for(let i=0;i<(x1-x0)*h/22;i++)rect(g,x0+hash(i,330+x0)*(x1-x0-1)|0,W.y0+hash(i,331+x0)*(h-1)|0,1,1,i%2?'#aeaa9c':'#cfcbbd');
  for(let xx=x0;xx<x1;xx+=12)rect(g,xx,W.y0,1,h,'#a5a193');
  rect(g,x0,W.y0+h/2,x1-x0,1,'#a5a193');
  for(let xx=x0+3;xx<x1;xx+=29)rect(g,xx,W.y0+(xx%5),3,1,'#7f9a5e');
  rect(g,x0,W.y0-1,x1-x0,1,'#a9b07f');
 };
 for(const [g0,g1] of W.gaps){slab(x,g0);x=g1}slab(x,WORLD.w);
 // ścieżka wydeptana na pobocze przy wylocie drogi bocznej
 // plac przystankowy z płyt, nieco szerszy od chodnika
 const S=MAP.shelter;rect(g,S.x-14,S.y-6,S.w+44,h+8,'#b6b2a4');
 for(let xx=S.x-14;xx<S.x+S.w+30;xx+=12)rect(g,xx,S.y-6,1,h+8,'#9d998b');
 // wiejski wjazd na podwórze: kostka
 const x0=974,y0=468,w2=80,h2=66;
 rect(g,x0,y0,w2,h2,'#b3a58a');
 for(let yy=y0;yy<y0+h2;yy+=6){const off=((yy-y0)/6)%2?5:0;for(let xx=x0-off;xx<x0+w2;xx+=10)rect(g,Math.max(x0,xx),yy,1,6,'#9e9078');rect(g,x0,yy,w2,1,'#9e9078')}
 for(let i=0;i<150;i++)rect(g,x0+hash(i,340)*w2|0,y0+hash(i,341)*h2|0,2,1,i%2?'#c4b79d':'#a39579');
}
function paintFarm(){
 const F=MAP.farm,G=MAP.garden,B=MAP.beds;
 // główne podwórko: ubita ziemia z kamykami
 rect(g,F.x,F.y,F.w,F.h,'#c3b48a');
 for(let i=0;i<5200;i++){const x=F.x+(hash(i,25)*(F.w-4)|0),y=F.y+(hash(i,6)*(F.h-4)|0);rect(g,x,y,2,hash(i,9)>.5?2:1,['#b7aa87','#d4c6a0','#ad9f7b','#cdbf97'][i%4])}
 // koleiny i wydeptane szlaki przez podwórko
 for(const [x1,y1,x2,y2] of [[1000,470,1700,470],[1000,530,1700,530],[1240,470,1240,800],[1700,150,1700,800],[1760,150,1760,800]])line(g,x1,y1,x2,y2,'#b5a681',1);
 // błotko (większe, brunatne plamy) i małe kałuże
 for(const [x,y,rx,ry,wet] of MAP.puddles){
 g.fillStyle='#b3a57f';g.beginPath();g.ellipse(x,y,rx+6,ry+4,0,0,Math.PI*2);g.fill();
  g.fillStyle='#9a8b67';g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
  for(let i=0;i<14;i++){rect(g,x+(hash(i,x)-.5)*rx*1.6,y+(hash(i,y)-.5)*ry*1.6,2,1,'#867755')}
  if(wet){g.fillStyle='#7ea3a0';g.beginPath();g.ellipse(x+3,y,rx*.42,ry*.42,0,0,Math.PI*2);g.fill();g.fillStyle='#bcd2c4';g.beginPath();g.ellipse(x,y-ry*.12,rx*.15,ry*.1,0,0,Math.PI*2);g.fill()}
 }
 // betonowy plac przy silosach i koszu zasypowym (płyty co 24 px, spoiny, plamy)
 {const X=1672,Y=596,W=216,H=178;
  rect(g,X-2,Y-2,W+4,H+4,'#9d9a8d');rect(g,X,Y,W,H,'#bab7aa');
  for(let xx=X;xx<X+W;xx+=24)rect(g,xx,Y,1,H,'#a29f93');for(let yy=Y;yy<Y+H;yy+=24)rect(g,X,yy,W,1,'#a29f93');
  for(let i=0;i<260;i++)rect(g,X+hash(i,350)*(W-2)|0,Y+hash(i,351)*(H-2)|0,1+(i%3===0),1,i%2?'#c9c6b9':'#a9a699');
  for(let i=0;i<9;i++)rect(g,X+hash(i,352)*(W-20)|0,Y+hash(i,353)*(H-10)|0,14+(i%3)*6,3+(i%2),'#aaa79a');
 }
 // wybieg świń: ubite błoto, słoma, koryto
 {const P=MAP.pigpen,W=P.x1-P.x0,H=P.y1-P.y0;
  rect(g,P.x0,P.y0,W,H,'#85694a');
  for(let i=0;i<190;i++)rect(g,P.x0+hash(i,360)*(W-3)|0,P.y0+hash(i,361)*(H-2)|0,2+(i%3),1,['#735a3f','#957752','#6a533a','#a5875f'][i%4]);
  for(let i=0;i<14;i++)rect(g,P.x0+3+hash(i,362)*(W-14)|0,P.y0+hash(i,363)*(H-6)|0,6+(i%3)*2,1,'#d2bd7e');
  rect(g,P.x0+4,P.y1-12,22,6,'#5e4a39');rect(g,P.x0+5,P.y1-11,20,4,'#8c7a62');rect(g,P.x0+6,P.y1-10,18,2,'#b9a47a');
 }
 // ogródek: trawnik, grządki, ścieżki
 rect(g,G.x,G.y,G.w,G.h,'#8fa56b');
 for(let i=0;i<1500;i++){const x=G.x+(hash(i,41)*(G.w-3)|0),y=G.y+(hash(i,42)*(G.h-3)|0);rect(g,x,y,1+(i%2),1,['#a3b87c','#7e9a5f','#b2bf84'][i%3])}
 rect(g,B.x-4,B.y-4,B.w+8,B.h+8,'#7a8f5a');
 for(let x=B.x+4;x<B.x+B.w-10;x+=18){rect(g,x,B.y,10,B.h,'#6a855e');for(let y=B.y+6;y<B.y+B.h-8;y+=14)rect(g,x+2,y,6,6,'#4f7450')}
 g.lineCap='round';
 for(const pts of [[[1176,432],[1170,462],[1170,486]],[[1176,432],[1540,432],[1540,346],[1562,346]],[[1400,432],[1400,358]],[[1176,432],[1100,432],[1100,300]]]){
  g.strokeStyle='#d6caa8';g.lineWidth=9;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))g.lineTo(p[0],p[1]);g.stroke();
 }
 g.lineCap='butt';
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
 const k=j*FLD.n+i,x=i*FLD.t,y=j*FLD.t,st=crop[k],harvested=st===1;
 const n=vn(i/5,j/5)*.65+vn(i/1.6,j/1.6)*.35;
 if(st>=2){ // zaorane (2), obsiane (3), wschody (4), młode zboże (5)
  rect(fc,x,y,8,8,mixc('#7d5f40','#8e6d49',n));
  for(const ry of [0,4]){
   rect(fc,x,y+ry,8,1,mixc('#9a7852','#a98559',n));
   rect(fc,x,y+ry+2,8,2,mixc('#5f4630','#6d523a',n));
   for(let xx=0;xx<8;xx+=2){
    const h=hash(i*8+xx,j*8+ry,5);
    if(st===3&&h>.55)rect(fc,x+xx,y+ry+1,1,1,'#d8c284');
    if(st===4&&h>.35)rect(fc,x+xx,y+ry,1+(h>.8),2,h>.7?'#8cb458':'#6f9a47');
    if(st===5){rect(fc,x+xx,y+ry,2,3,h>.5?'#5d9a43':'#4b8438');if(h>.7)rect(fc,x+xx,y+ry,2,1,'#86b85a')}
   }
  }
  return;
 }
 if(harvested){
  rect(fc,x,y,8,8,mixc('#b3a073','#c0ad7f',n));
  for(const ry of [0,4]){
   rect(fc,x,y+ry+2,8,1,mixc('#9a855a','#a99366',n));
   for(let xx=0;xx<8;xx+=2){const h=hash(i*8+xx,j*8+ry,3);if(h>.45)rect(fc,x+xx,y+ry+1,2,1,h>.88?'#e6d59e':'#8c7950')}
  }
 }else{
  rect(fc,x,y,8,8,mixc('#bfa25c','#d0b370',n));
  for(const ry of [0,4]){
   rect(fc,x,y+ry+2,8,1,mixc('#977f3f','#aa8f4d',n));
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
 for(const [ax,ay,bx,by] of [[x,y,x+w,y],[x,y+h,x+w,y+h],[x,y,x,y+h],[x+w,y,x+w,y+h]])line(gh,ax,ay,bx,by,'#4b3328',1);
}
function house(b){
 const {x,y,w:W}=b;roof(dl,dh,x,y,W,b.h,b.color);
 rect(dh,x+W-41,y+15,14,13,'#a8a08a');rect(dh,x+W-39,y+17,10,9,'#cbbea3');rect(dh,x+W-36,y+18,4,4,'#444945');
 rect(dh,x+8,y+46,22,7,'#d9b07c');rect(dh,x+10,y+48,18,3,'#b9a98f');
 rect(dh,x+Math.round(W/2)-9,y+12,17,13,'#78584d');rect(dh,x+Math.round(W/2)-7,y+14,13,9,'#6d8e99');rect(dh,x+Math.round(W/2)-5,y+15,9,2,'#a1bbc0');
}
// Duże dachy: świetliki i zacieki wzdłuż połaci, żeby powierzchnia nie była płaska.
function barn(b){
 const {x,y,w:W,h:H}=b;roof(dl,dh,x,y,W,H,b.color);
 const vertical=H>=W;
 for(let k=0;k<(vertical?H:W)-60;k+=70){
  const px=vertical?x+10:x+30+k,py=vertical?y+30+k:y+10;
  rect(dh,px,py,24,16,'#725043');rect(dh,px+2,py+2,20,12,'#9d654f');for(let i=0;i<4;i++)line(dh,px+5+i*5,py+3,px+5+i*5,py+12,'#6b4539',1);
 }
 for(let k=0;k<(vertical?H:W)-80;k+=110){
  const px=vertical?x+W-34:x+60+k,py=vertical?y+60+k:y+H-30;
  rect(dh,px,py,24,11,'#684a3f');rect(dh,px+2,py+2,20,7,'#a77a55');
 }
}
// Wiata: otwarta od strony podwórza — słupy i cień pod okapem.
function wiata(b){
 roof(dl,dh,b.x,b.y,b.w,b.h,b.color);
 for(let yy=b.y+14;yy<b.y+b.h-10;yy+=46){rect(dh,b.x+b.w-6,yy,6,8,'#5e4a39');rect(dh,b.x+b.w-5,yy,3,5,'#a98a63')}
 for(let k=0;k<b.h-80;k+=95){rect(dh,b.x+12,b.y+28+k,28,14,'#725043');rect(dh,b.x+14,b.y+30+k,24,10,'#9d654f')}
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
 outlinedDraw(dl,x,y,G=>{crownPatch(G,-3,0,r*.68,sh[0],sh,seed);crownPatch(G,5,-2,r*.73,sh[1],sh,seed+13)},'#2a4231');
}
function treeShadow(t){
 const R=t.r*t.s;
 dl.fillStyle='#3d563b5a';dl.beginPath();dl.ellipse(Math.round(t.x+LIGHT.x*R*.9),Math.round(t.y+LIGHT.y*R*.9-R*.25),R*1.1,R*.72,Math.atan2(LIGHT.y,LIGHT.x),0,Math.PI*2);dl.fill();
}
function treeCrown(t){
 const r=t.r*t.s,seed=((t.x*7+t.y*11)|0);
 outlinedDraw(dh,t.x,t.y,G=>{
 rect(G,-3,-3,8,Math.round(r*.55+4),'#6d5b43');rect(G,0,0,2,Math.round(r*.55+2),'#a08557');
 if(t.type==='pine'){
  for(let layer=0;layer<4;layer++){
   const y=-r*.76+layer*r*.34,hw=r*(.34+layer*.14);
   poly(G,[[-hw,y+7],[0,y-r*.48],[hw,y+7]],['#284f44','#35684b','#437853','#547f52'][layer]);
   for(let i=0;i<13+r*.3;i++){const dx=(hash(i,seed,layer)*2-1)*hw*.8,dy=y+hash(i,seed+layer,4)*8;rect(G,dx,dy,2,1,i%4?'#739567':'#a0ae71')}
  }
 }else{
  crownPatch(G,-r*.30,-r*.30,r*.69,'#466b49',['#779967','#95a873','#3d674a'],seed);
  crownPatch(G,r*.26,-r*.39,r*.73,'#507652',['#8da66f','#638c5b','#a7af74'],seed+9);
  crownPatch(G,-r*.06,-r*.78,r*.64,'#5f8558',['#a2b47d','#779c65','#4c7857'],seed+15);
 }
 });
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
// Słup energetyczny (0.6.1): drewniany, wiejski — ciemny bal z pęknięciami, drewniana poprzeczka z zastrzałami i szklanymi izolatorami.
const DARK='#34382f';
function pole(x,y,nest){
 poly(dl,[[x-2,y+12],[x+3,y+12],[x+LIGHT.x*52+3,y+LIGHT.y*52+12],[x+LIGHT.x*52-3,y+LIGHT.y*52+12]],'#4a5f4a66');
 outlinedDraw(dl,x,y,G=>{
  rect(G,-3,-26,6,40,'#6b563d');rect(G,-3,-26,2,40,'#8c7455');rect(G,2,-26,1,40,'#4b3b29');
  for(let k=-22;k<12;k+=7)rect(G,-2+(k&1),k,3,1,'#4b3b29');
  rect(G,-4,12,8,3,'#5a4731');
 },DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-13,-22,26,3,'#5d4832');rect(G,-13,-22,26,1,'#82694a');
  for(let k=0;k<5;k++){rect(G,-8-k,-19+k,1,1,'#4b3b29');rect(G,8+k,-19+k,1,1,'#4b3b29')}   // zastrzały
  rect(G,-3,-19,6,2,'#4b3b29');
  for(const ix of [-11,9]){rect(G,ix,-27,3,6,'#cfe3dc');rect(G,ix,-28,3,1,'#3d4f49');rect(G,ix+1,-26,1,3,'#f4fffb')}
  for(const ix of [-4,2]){rect(G,ix,-25,3,4,'#cfe3dc');rect(G,ix,-26,3,1,'#3d4f49')}
 },DARK);
 if(nest)stork(x,y);
}
// Gniazdo z gałązek na poprzeczce i bocian: spójne z resztą (obrys, cień, paleta).
function stork(x,y){
 outlinedDraw(dh,x,y,G=>{
  for(let yy=-8;yy<=0;yy++){const w=Math.round(13*Math.sqrt(1-((yy+4)/5)**2));rect(G,-w,-30+yy,w*2,1,yy<-3?'#8d6e47':'#69553d')}
  for(let i=0;i<34;i++){const px=-12+hash(i,77)*24|0,py=-37+hash(i,78)*8|0;rect(G,px,py,3+(i%3),1,['#a98457','#6f5538','#c3a06b'][i%3])}
  rect(G,-5,-47,9,9,'#f3f1e7');rect(G,-6,-44,5,5,'#2e2e2e');rect(G,-5,-47,9,1,'#fffffc');
  rect(G,3,-52,3,8,'#f3f1e7');rect(G,2,-54,5,3,'#f3f1e7');rect(G,6,-53,8,2,'#c8402b');
  rect(G,-3,-38,1,6,'#c8402b');rect(G,1,-38,1,6,'#c8402b');
 },DARK);
}
// Latarnia wiejska: drewniany słup, krótki wysięgnik i stożkowy emaliowany klosz z żarówką. dir = strona, na którą wysunięty jest wysięgnik.
function lamp(x,y,dir='W'){
 const sx=dir==='W'?-1:0,sy=dir==='S'?1:0;
 poly(dl,[[x-1,y+3],[x+2,y+3],[x+LIGHT.x*34+2,y+LIGHT.y*34+3],[x+LIGHT.x*34-1,y+LIGHT.y*34+3]],'#4a5f4a55');
 outlinedDraw(dl,x,y,G=>{rect(G,-2,-1,4,5,'#5a4731');rect(G,-1,-1,2,4,'#7d6648')},DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-2,-22,4,21,'#6b563d');rect(G,-2,-22,1,21,'#8c7455');rect(G,1,-22,1,21,'#4b3b29');
  if(sx){rect(G,-14,-23,14,2,'#5d4832');rect(G,-14,-23,14,1,'#82694a');rect(G,-12,-21,1,3,'#4b3b29');
   rect(G,-19,-26,9,3,'#4f6a58');rect(G,-17,-28,5,2,'#3f5547');rect(G,-17,-23,5,2,'#f4e7a8')}
  else{rect(G,-1,-23,2,2,'#5d4832');rect(G,-2,-24,4,10,'#5d4832');rect(G,-2,-24,4,1,'#82694a');
   rect(G,-4,-16,8,3,'#4f6a58');rect(G,-3,-18,6,2,'#3f5547');rect(G,-3,-13,6,2,'#f4e7a8')}
 },DARK);
}
function trafficSign(x,y,kind){
 poly(dl,[[x,y+2],[x+2,y+2],[x+LIGHT.x*12+2,y+LIGHT.y*12+2],[x+LIGHT.x*12,y+LIGHT.y*12+2]],'#4a5f4a55');
 outlinedDraw(dl,x,y,G=>{rect(G,-1,-12,2,16,'#8a8e87')},DARK);
 outlinedDraw(dh,x,y,G=>{
  if(kind==='stop'){rect(G,-6,-22,12,11,'#c2362b');rect(G,-5,-21,10,9,'#d9453a');rect(G,-4,-18,8,2,'#f4efe2');rect(G,-5,-21,10,1,'#ef7a6c')}
  else{ // trójkąt ostrzegawczy „zwierzyna”
   for(let r=0;r<11;r++){const w=Math.round(r*.55)+1;rect(G,-w,-23+r,w*2,1,'#c2362b')}
   for(let r=2;r<10;r++){const w=Math.round(r*.55)-1;if(w>0)rect(G,-w,-23+r,w*2,1,'#f6f2e6')}
   rect(G,-1,-17,3,3,'#3a2e26');rect(G,1,-18,2,1,'#3a2e26');
  }
 },DARK);
}
// Wiata przystankowa PKS (drewniane słupy, blaszany dach) na chodniku; po drugiej stronie słupek i ławka.
function busStop(){
 const S=MAP.shelter,{x,y,w,h}=S;
 shadow(dl,x,y,w,h,8);
 rect(dl,x+2,y+3,w-4,h-5,'#b6b4a6');
 outlinedDraw(dl,x,y,G=>{rect(G,6,h-6,w-12,2,'#6e4a34');rect(G,7,h-7,w-14,1,'#a97a52')},DARK);   // ławka pod wiatą
 outlinedDraw(dh,x,y,G=>{
  rect(G,0,0,w,h,'#8d9189');rect(G,1,1,w-2,h-2,'#a7aca4');rect(G,0,0,w,2,'#c8ccc5');
  for(let k=6;k<w-4;k+=10)rect(G,k,2,1,h-3,'#8a8e86');                   // fałdy blachy
  for(const px of [2,w-4])rect(G,px,h-3,3,3,'#5d4832');
  rect(G,w/2-6,h-5,12,2,'#2f66a8');
 },DARK);
 const sg=S.sign;
 outlinedDraw(dl,sg.x,sg.y,G=>{rect(G,-1,-14,2,18,'#8a8e87')},DARK);
 outlinedDraw(dh,sg.x,sg.y,G=>{rect(G,-7,-25,14,12,'#2f66a8');rect(G,-6,-24,12,10,'#3b79c4');rect(G,-4,-22,8,2,'#f4efe2');rect(G,-4,-19,8,2,'#f4efe2');rect(G,-4,-16,5,1,'#f4efe2')},DARK);
 const ss=S.signS;
 outlinedDraw(dl,ss.x,ss.y,G=>{rect(G,-1,-14,2,18,'#8a8e87')},DARK);
 outlinedDraw(dh,ss.x,ss.y,G=>{rect(G,-7,-25,14,12,'#2f66a8');rect(G,-6,-24,12,10,'#3b79c4');rect(G,-4,-22,8,2,'#f4efe2');rect(G,-4,-19,8,2,'#f4efe2');rect(G,-4,-16,5,1,'#f4efe2')},DARK);
 const b=S.benchS;
 shadow(dl,b.x,b.y,b.w,b.h,3);
 outlinedDraw(dl,b.x,b.y,G=>{rect(G,0,0,b.w,b.h,'#8a6a47');rect(G,0,0,b.w,1,'#b48d62');rect(G,1,b.h,2,2,'#4b3b29');rect(G,b.w-3,b.h,2,2,'#4b3b29')},DARK);
}
// Kapliczka przydrożna: kamienny cokół, drewniany daszek i krzyż; obok kwiaty.
function shrine(){
 const {x,y}=MAP.shrine;
 poly(dl,[[x-6,y+6],[x+7,y+6],[x+LIGHT.x*20+7,y+LIGHT.y*20+6],[x+LIGHT.x*20-6,y+LIGHT.y*20+6]],'#4a5f4a66');
 outlinedDraw(dl,x,y,G=>{rect(G,-7,-1,14,9,'#9a9588');rect(G,-6,0,12,7,'#bdb8aa');rect(G,-6,0,12,1,'#d8d3c5');rect(G,-3,2,6,4,'#5a4731')},DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-6,-9,12,8,'#8d6e47');rect(G,-5,-8,10,2,'#b89260');rect(G,-5,-6,10,4,'#6f4f38');
  rect(G,-1,-20,2,10,'#d6cfba');rect(G,-4,-17,8,2,'#d6cfba');
 },DARK);
 for(const [dx,c] of [[-9,'#c8402b'],[-11,'#e3c14a'],[9,'#e8e4d8'],[11,'#c8402b']])rect(dl,x+dx,y+7,2,2,c);
}
// Tablica z nazwą wsi (biała, czarny napis „LIPY”) na wjazdach wzdłuż drogi głównej.
const GLY={L:'100100100100111',I:'111010010010111',P:'111101111100100',Y:'101101010010010'};
function villageSign(x,y){
 poly(dl,[[x-10,y+2],[x+10,y+2],[x+LIGHT.x*14+10,y+LIGHT.y*14+2],[x+LIGHT.x*14-10,y+LIGHT.y*14+2]],'#4a5f4a55');
 outlinedDraw(dl,x,y,G=>{rect(G,-9,-8,2,12,'#6b563d');rect(G,7,-8,2,12,'#6b563d')},DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-12,-22,24,12,'#f2f0e6');rect(G,-12,-22,24,1,'#ffffff');rect(G,-12,-11,24,1,'#cfccbf');
  let px=-10;for(const ch of 'LIPY'){const gl=GLY[ch];for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(gl[r*3+c]==='1')rect(G,px+c,-19+r,1,1,'#26302a');px+=5}
 },DARK);
}
// Chlewik z wybiegiem: dach z lekkim wywietrznikiem, drzwi w stronę wybiegu.
function pigsty(b){
 roof(dl,dh,b.x,b.y,b.w,b.h,b.color);
 rect(dh,b.x+b.w-22,b.y+14,12,10,'#a8a08a');rect(dh,b.x+b.w-20,b.y+16,8,6,'#cbbea3');
 rect(dh,b.x+14,b.y+b.h-12,22,8,'#5e4a39');rect(dh,b.x+16,b.y+b.h-10,18,4,'#2f2a26');   // drzwi na wybieg
}
function fence(f){
 const st=f.style==='inner'
  ?{r1:'#cfc6a6',r2:'#e3dbc0',post:'#b9aa80',cap:'#f1e8cc',step:20}
  :f.style==='pen'?{r1:'#8c6c48',r2:'#b08d62',post:'#6b4f33',cap:'#d3b385',step:14}
  :{r1:'#6f5236',r2:'#98764d',post:'#5f4329',cap:'#c9a574',step:24};
 const hor=f.y1===f.y2,L=Math.hypot(f.x2-f.x1,f.y2-f.y1);
 for(const [d,c] of [[0,st.r1],[3,st.r2]]){
  if(hor)line(dl,Math.min(f.x1,f.x2),f.y1+d,Math.max(f.x1,f.x2),f.y1+d,c,1);else line(dl,f.x1+d,Math.min(f.y1,f.y2),f.x1+d,Math.max(f.y1,f.y2),c,1);
 }
 const post=(x,y)=>{rect(dl,x+2,y+3,5,6,'#425e4760');rect(dl,x-2,y-3,5,7,st.post);rect(dl,x-1,y-3,3,2,st.cap)};
 for(let t=0;t<=L;t+=st.step){if(hor)post(Math.min(f.x1,f.x2)+t,f.y1);else post(f.x1,Math.min(f.y1,f.y2)+t)}
 if(hor)post(Math.max(f.x1,f.x2),f.y1);else post(f.x1,Math.max(f.y1,f.y2));
}
function paintObjects(){
 const P=MAP.props;
 for(const b of MAP.buildings){if(b.type==='house')house(b);else if(b.type==='barn')barn(b);else if(b.type==='pigsty')pigsty(b);else wiata(b)}
 paintSiloLow(dl);paintSiloHigh(dh);
 for(let i=0;i<5;i++){rect(dl,P.laundry.x+i*11,P.laundry.y,7,5,['#d6c6a2','#d9e6d4','#7396b0','#b86156','#d7d1b7'][i]);rect(dl,P.laundry.x+1+i*11,P.laundry.y+1,2,2,'#e9e3ce')}
 const k=P.kennel;rect(dl,k.x+4,k.y+4,k.w,k.h,'#42564255');rect(dl,k.x,k.y,k.w,k.h,'#6f4f38');rect(dl,k.x+1,k.y+1,k.w-2,k.h-2,'#a5714f');rect(dl,k.x+k.w/2-1,k.y+1,2,k.h-2,'#7d5238');rect(dl,k.x+k.w-4,k.y+k.h-1,5,3,'#2f2a26');
 for(const p of P.poles)pole(p.x,p.y,p.nest);
 // Przewody: dwa tory między końcami poprzeczek, z lekkim zwisem; warstwa nadziemna.
 const wire=(x1,y1,x2,y2,sag)=>{dh.strokeStyle='#3f4a3d';dh.lineWidth=1;dh.beginPath();dh.moveTo(x1,y1);dh.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+sag,x2,y2);dh.stroke()};
 P.lines.forEach((pl,li)=>{for(let i=0;i<pl.length-1;i++){
  const A=pl[i],B=pl[i+1];
  if(li===0){for(const dx of [-9,9])wire(A.x+dx,A.y-27,B.x+dx,B.y-27,6)}
  else{wire(A.x+9,A.y-27,B.x-9,B.y-27,5);wire(A.x+1,A.y-24,B.x+1,B.y-24,5)}
 }});
 const s=P.sign;rect(dl,s.x+8,s.y+10,3,19,'#7c7155');rect(dl,s.x,s.y,47,13,'#e1d6b0');rect(dl,s.x+1,s.y+1,45,11,'#607c55');rect(dl,s.x+38,s.y+4,5,3,'#eee0b5');
 for(const f of MAP.fences)fence(f);
 for(const l of MAP.lamps)lamp(l.x,l.y,l.dir);
 for(const q of MAP.signs)trafficSign(q.x,q.y,q.kind);
 for(const v of MAP.village)villageSign(v.x,v.y);
 busStop();shrine();
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
 paintRoads();
 paintFarm();
 for(let j=0;j<FLD.n;j++)for(let i=0;i<FLD.n;i++)fieldTile(i,j);
 paintObjects();
 crispAlpha(decorHigh);crispAlpha(decorLow,true);
}

export {ground,field,crop,tracks,tc,decorLow,decorHigh,fieldTile,buildWorld};
