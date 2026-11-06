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
 poly(g,[[0,1020],[1050,1014],[1050,1690],[0,1690]],'#b6aa76');for(let i=0;i<110;i++)line(g,0,1028+i*6,1014,1030+i*6,'#c6bb89',1);
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
// Drogi z grafu (0.6.0): wszystkie odcinki są osiowe, więc malujemy je prostokątami (ostre krawędzie).
// Warstwy: pobocze → krawężnik/skraj → wypełnienie polne → asfalt boczny → asfalt główny; skrzyżowania stapiają się bez łat.
const disc=(g,cx,cy,r,c)=>{for(let dy=-r;dy<=r;dy++){const w=Math.floor(Math.sqrt(r*r-dy*dy+.01));rect(g,cx-w,cy+dy,w*2,1,c)}};
const edgeRect=(e,add)=>{
 const A=MAP.nodes[e.a],B=MAP.nodes[e.b],h=(e.w+add)/2;
 if(A[0]===B[0])return[A[0]-h,Math.min(A[1],B[1]),h*2,Math.abs(B[1]-A[1])];
 return[Math.min(A[0],B[0]),A[1]-h,Math.abs(B[0]-A[0]),h*2];
};
const ASPH='#767b7f',ASPH2=['#6c7175','#81868a','#70757a'];
function paintRoads(){
 const E=MAP.roads.edges,isA=e=>e.kind==='main'||e.kind==='side';
 for(const e of E){const [x,y,w,h]=edgeRect(e,isA(e)?14:14);rect(g,x,y,w,h,'#829368')}
 disc(g,MAP.bulb.x,MAP.bulb.y,MAP.bulb.r+7,'#829368');
 for(const e of E){const [x,y,w,h]=edgeRect(e,6);rect(g,x,y,w,h,isA(e)?'#b8b7ac':'#99886b')}
 disc(g,MAP.bulb.x,MAP.bulb.y,MAP.bulb.r+3,'#b8b7ac');
 for(const kind of ['dirt','drive','side','main']){
  for(const e of E.filter(q=>q.kind===kind)){const [x,y,w,h]=edgeRect(e,0);rect(g,x,y,w,h,kind==='dirt'||kind==='drive'?'#b8a47d':ASPH)}
  if(kind==='side')disc(g,MAP.bulb.x,MAP.bulb.y,MAP.bulb.r,ASPH);
 }
 // faktura asfaltu: ziarno, łaty, pęknięcia
 for(const e of E.filter(isA)){
  const [x,y,w,h]=edgeRect(e,0);
  for(let i=0;i<w*h/9;i++){const px=x+hash(i,301+w)*(w-1)|0,py=y+hash(i,302+h)*(h-1)|0;rect(g,px,py,1+(i%5===0),1,ASPH2[i%3])}
  for(let i=0;i<w*h/1800;i++){const px=x+hash(i,310)*(w-14)|0,py=y+hash(i,311)*(h-8)|0;rect(g,px,py,10+(i%4)*4,5+(i%3)*2,'#6a6f73')}
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
 // oznaczenia drogi głównej: biała przerywana oś i ciągłe linie krawędziowe
 for(const e of E.filter(q=>q.kind==='main')){
  const A=nodes[e.a],B=nodes[e.b],x0=Math.min(A[0],B[0]),L=Math.abs(B[0]-A[0]),yc=A[1];
  for(let xx=x0;xx<x0+L;xx+=40){
   if(Math.abs(xx+10-945)<42)continue;      // brak linii na skrzyżowaniu z boczną
   rect(g,xx,yc-1,22,2,'#e6e4d8');
  }
  rect(g,x0,yc-e.w/2+4,L,2,'#dcdacd');rect(g,x0,yc+e.w/2-6,L,2,'#dcdacd');
 }
 // skraj drogi bocznej: cienka linia, chodnik, przejście dla pieszych
 for(const e of E.filter(q=>q.kind==='side')){
  const A=nodes[e.a],B=nodes[e.b],y0=Math.min(A[1],B[1]),L=Math.abs(B[1]-A[1]);
  rect(g,A[0]-e.w/2+3,y0,1,L,'#9aa0a0');rect(g,A[0]+e.w/2-4,y0,1,L,'#9aa0a0');
  for(let yy=y0;yy<y0+L;yy+=34)if(Math.abs(yy+8-1690)>30&&Math.abs(yy+8-501)>40)rect(g,A[0]-1,yy,2,14,'#d4d2c6');
 }
 paintSidewalk();
 const Z=MAP.zebra;
 for(let x=Z.x-Z.w/2+4;x<Z.x+Z.w/2-4;x+=9)rect(g,x,Z.y-Z.h/2,5,Z.h,'#e9e7dc');
 rect(g,Z.x-Z.w/2,Z.y-Z.h/2-3,Z.w,1,'#d4d2c6');rect(g,Z.x-Z.w/2,Z.y+Z.h/2+2,Z.w,1,'#d4d2c6');
}
// Chodnik z płytek po wschodniej stronie drogi bocznej oraz plac przystankowy; przerwany przy wjeździe na podwórze.
function paintSidewalk(){
 const S=MAP.sidewalk,w=S.x1-S.x0;
 const slab=(x,y,ww,hh)=>{
  rect(g,x,y,ww,hh,'#c6c2b4');
  for(let i=0;i<ww*hh/26;i++)rect(g,x+hash(i,330+x)*(ww-1)|0,y+hash(i,331+y)*(hh-1)|0,1,1,i%2?'#b4b0a2':'#d3cfc1');
  for(let yy=y;yy<y+hh;yy+=12)rect(g,x,yy,ww,1,'#aaa698');
  rect(g,x+ww-1,y,1,hh,'#aaa698');
 };
 slab(S.x0,S.y0,w,468-S.y0);slab(S.x0,534,w,S.y1-534);
 slab(996,40,36,78);                                  // plac przystankowy
 rect(g,S.x1,S.y0,3,468-S.y0,'#a9b07f');rect(g,S.x1,534,3,S.y1-534,'#a9b07f');
 // wjazd na podwórze: utwardzenie z kostki
 const x0=974,y0=468,w2=80,h2=66;
 rect(g,x0,y0,w2,h2,'#b3a58a');
 for(let yy=y0;yy<y0+h2;yy+=6){const off=((yy-y0)/6)%2?5:0;for(let xx=x0-off;xx<x0+w2;xx+=10){rect(g,Math.max(x0,xx),yy,1,6,'#9e9078');}rect(g,x0,yy,w2,1,'#9e9078')}
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
// Słup energetyczny (0.6.0): betonowy, z obrysem 1 px jak reszta świata; trzon pod pojazdami, poprzeczka i gniazdo nad nimi.
const DARK='#34382f';
function pole(x,y,nest){
 poly(dl,[[x-2,y+12],[x+3,y+12],[x+LIGHT.x*52+3,y+LIGHT.y*52+12],[x+LIGHT.x*52-3,y+LIGHT.y*52+12]],'#4a5f4a66');
 outlinedDraw(dl,x,y,G=>{
  rect(G,-3,-26,5,40,'#a8a89b');rect(G,-3,-26,1,40,'#c9c9bd');rect(G,1,-26,1,40,'#8a8a7f');
  for(let k=-22;k<10;k+=8)rect(G,-3,k,5,1,'#92928a');
  rect(G,-4,10,7,4,'#7f7f74');
 },DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-12,-22,24,3,'#5b5f58');rect(G,-12,-22,24,1,'#7a7e75');
  rect(G,-2,-19,5,2,'#4d514b');
  for(const ix of [-10,8]){rect(G,ix,-27,3,6,'#dde3dc');rect(G,ix,-28,3,1,'#42504b');rect(G,ix+1,-26,1,2,'#fff')}
  for(const ix of [-4,2]){rect(G,ix,-25,3,4,'#dde3dc');rect(G,ix,-26,3,1,'#42504b')}
 },DARK);
 if(nest)stork(x,y);
}
// Gniazdo z gałązek na poprzeczce i bocian: spójne z resztą (obrys, cień, paleta).
function stork(x,y){
 outlinedDraw(dh,x,y,G=>{
  for(let yy=-8;yy<=0;yy++){const w=Math.round(13*Math.sqrt(1-((yy+4)/5)**2));rect(G,-w,-30+yy,w*2,1,yy<-3?'#8d6e47':'#69553d')}
  for(let i=0;i<34;i++){const px=-12+hash(i,77)*24|0,py=-37+hash(i,78)*8|0;rect(G,px,py,3+(i%3),1,['#a98457','#6f5538','#c3a06b'][i%3])}
  // bocian (głową w prawo): biały korpus, czarne lotki, czerwony dziób i nogi
  rect(G,-5,-47,9,9,'#f3f1e7');rect(G,-6,-44,5,5,'#2e2e2e');rect(G,-5,-47,9,1,'#fffffc');
  rect(G,3,-52,3,8,'#f3f1e7');rect(G,2,-54,5,3,'#f3f1e7');rect(G,6,-53,8,2,'#c8402b');
  rect(G,-3,-38,1,6,'#c8402b');rect(G,1,-38,1,6,'#c8402b');
 },DARK);
}
// Latarnia uliczna: słup z wysięgnikiem nad jezdnię (wysięgnik i oprawa w warstwie nadziemnej).
function lamp(x,y){
 poly(dl,[[x-1,y+3],[x+2,y+3],[x+LIGHT.x*40+2,y+LIGHT.y*40+3],[x+LIGHT.x*40-1,y+LIGHT.y*40+3]],'#4a5f4a55');
 outlinedDraw(dl,x,y,G=>{rect(G,-2,-1,4,5,'#4f5650');rect(G,-1,-1,2,4,'#7a837b')},DARK);
 outlinedDraw(dh,x,y,G=>{
  rect(G,-2,-20,3,19,'#6b756d');rect(G,-1,-20,1,19,'#8f998f');
  rect(G,-24,-22,24,2,'#5d665f');rect(G,-26,-24,9,5,'#454d47');rect(G,-25,-23,7,3,'#f1e9b8');rect(G,-24,-23,2,1,'#fffbe0');
 },DARK);
}
function stopSign(x,y){
 poly(dl,[[x,y+2],[x+2,y+2],[x+LIGHT.x*12+2,y+LIGHT.y*12+2],[x+LIGHT.x*12,y+LIGHT.y*12+2]],'#4a5f4a55');
 outlinedDraw(dl,x,y,G=>{rect(G,-1,-12,2,16,'#8a8e87')},DARK);
 outlinedDraw(dh,x,y,G=>{rect(G,-6,-22,12,11,'#c2362b');rect(G,-5,-21,10,9,'#d9453a');rect(G,-4,-18,8,2,'#f4efe2');rect(G,-5,-21,10,1,'#ef7a6c')},DARK);
}
// Przystanek PKS: wiata ze szklanymi ścianami, ławka, słupek z tabliczką.
function busStop(){
 const B=MAP.busstop,{x,y,w,h}=B;
 shadow(dl,x,y,w,h,10);
 rect(dl,x+2,y+2,w-4,h-4,'#b6b4a6');                  // posadzka pod wiatą
 outlinedDraw(dl,x,y,G=>{rect(G,2,6,2,h-12,'#6e4a34');rect(G,3,7,1,h-14,'#a97a52')},DARK); // ławka
 outlinedDraw(dh,x,y,G=>{
  rect(G,0,0,w,h,'#d2d6d0');rect(G,2,2,w-4,h-4,'#4f7f9c');rect(G,3,3,w-6,5,'#6c9db8');   // dach z poliwęglanu
  rect(G,0,0,w,2,'#e9ece6');rect(G,w-2,0,2,h,'#7a8a86');
  for(const py of [3,h-5])rect(G,-1,py,2,3,'#3a403c');
 },DARK);
 const sg=B.sign;
 outlinedDraw(dl,sg.x,sg.y,G=>{rect(G,-1,-14,2,18,'#8a8e87')},DARK);
 outlinedDraw(dh,sg.x,sg.y,G=>{rect(G,-7,-25,14,12,'#2f66a8');rect(G,-6,-24,12,10,'#3b79c4');rect(G,-4,-22,8,2,'#f4efe2');rect(G,-4,-19,8,2,'#f4efe2');rect(G,-4,-16,5,1,'#f4efe2')},DARK);
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
 const pl=P.poles;
 for(let i=0;i<pl.length-1;i++)for(const dx of [-9,9]){
  const x1=pl[i].x+dx,y1=pl[i].y-27,x2=pl[i+1].x+dx,y2=pl[i+1].y-27;
  dh.strokeStyle='#3f4a3d';dh.lineWidth=1;dh.beginPath();dh.moveTo(x1,y1);dh.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+6,x2,y2);dh.stroke();
 }
 const s=P.sign;rect(dl,s.x+8,s.y+10,3,19,'#7c7155');rect(dl,s.x,s.y,47,13,'#e1d6b0');rect(dl,s.x+1,s.y+1,45,11,'#607c55');rect(dl,s.x+38,s.y+4,5,3,'#eee0b5');
 for(const f of MAP.fences)fence(f);
 for(const l of MAP.lamps)lamp(l.x,l.y);
 for(const q of MAP.signs)stopSign(q.x,q.y);
 busStop();
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
