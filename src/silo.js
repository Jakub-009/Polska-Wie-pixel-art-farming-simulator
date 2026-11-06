// Silosy zbożowe typu BIN (blacha falista ocynkowana, dach stożkowy z żebrami, właz, drabinka, wywietrznik),
// kosz zasypowy w gruncie i przenośnik ślimakowy — klasyczny wygląd polskiego gospodarstwa.
import {rect,poly,LIGHT,state,SILO_T,clamp} from './core.js';
import {SILOS,PIT} from './map.js';
const LA=Math.atan2(-LIGHT.y,-LIGHT.x); // kierunek ku światłu (północny zachód)
const hexToRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>{const A=hexToRgb(a),B=hexToRgb(b);return`rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`};
const JX=SILOS[0].x,JY=(SILOS[0].y+SILOS[1].y)/2;           // rozdzielacz między silosami
const PX=PIT.x+PIT.w,PY=PIT.y+PIT.h/2;                       // wylot kosza
// Warstwa niska: fundamenty, cienie, kosz zasypowy.
export function paintSiloLow(g){
 for(const s of SILOS){
  g.fillStyle='#a8a490';g.beginPath();g.arc(s.x,s.y,s.r+6,0,Math.PI*2);g.fill();
  g.fillStyle='#bcb8a3';g.beginPath();g.arc(s.x,s.y,s.r+3,0,Math.PI*2);g.fill();
 }
 // cień: suma kół przesuwanych wzdłuż światła (jedna ścieżka — bez podwójnego ciemnienia)
 const h=100;g.fillStyle='#3d563b52';g.beginPath();
 for(const s of SILOS)for(let t=0;t<=1.001;t+=.05){g.moveTo(s.x+LIGHT.x*h*t+s.r,s.y+LIGHT.y*h*t);g.arc(s.x+LIGHT.x*h*t,s.y+LIGHT.y*h*t,s.r,0,Math.PI*2)}
 g.fill();
 // kosz zasypowy: betonowa obwódka, ciemny lej i kratka
 rect(g,PIT.x-5,PIT.y-5,PIT.w+10,PIT.h+10,'#a6a28d');rect(g,PIT.x-3,PIT.y-3,PIT.w+6,PIT.h+6,'#c4c0ab');
 rect(g,PIT.x,PIT.y,PIT.w,PIT.h,'#33322d');
 for(let x=PIT.x+2;x<PIT.x+PIT.w-1;x+=5)rect(g,x,PIT.y+1,2,PIT.h-2,'#77746a');
 for(let y=PIT.y+10;y<PIT.y+PIT.h-4;y+=16)rect(g,PIT.x+1,y,PIT.w-2,2,'#8a867a');
 rect(g,PIT.x-3,PIT.y-3,PIT.w+6,2,'#e1ddc8');
 // cień przenośnika
 g.strokeStyle='#3d563b40';g.lineWidth=5;g.beginPath();g.moveTo(PX+8,PY+7);g.lineTo(JX+8,JY+7);g.stroke();
}
// Warstwa wysoka: przenośnik i dachy silosów (nad pojazdami).
export function paintSiloHigh(g){
 // przenośnik ślimakowy: rura na podporach od kosza do rozdzielacza i odnogi do włazów silosów
 const tube=(x1,y1,x2,y2,w)=>{
  g.lineCap='butt';
  g.strokeStyle='#4a565b';g.lineWidth=w+2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
  g.strokeStyle='#8f9ca0';g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
  g.strokeStyle='#c9d3d4';g.lineWidth=1;g.beginPath();g.moveTo(x1,y1-1);g.lineTo(x2,y2-1);g.stroke();
 };
 tube(PX-4,PY,JX-6,JY,6);
 for(const s of SILOS){tube(JX,JY,s.x,s.y+(s.y<JY?10:-10),4);}
 for(let x=PX+8;x<JX-8;x+=18)rect(g,x,PY+3,3,4,'#3f484c');
 rect(g,JX-7,JY-7,14,14,'#4a565b');rect(g,JX-6,JY-6,12,12,'#8f9ca0');rect(g,JX-4,JY-4,8,8,'#6c787c');
 rect(g,PX-9,PY-6,10,12,'#4a565b');rect(g,PX-8,PY-5,8,10,'#9aa6a9');
 for(const s of SILOS)binRoof(g,s);
}
function binRoof(g,s){
 const {x,y,r}=s,n=36;
 // żebra stożka: sektory zacieniowane względem światła, co drugi nieco ciemniejszy (blacha falista)
 for(let k=0;k<n;k++){
  const a0=k/n*Math.PI*2,a1=(k+1)/n*Math.PI*2,am=(a0+a1)/2;
  const lit=clamp(Math.cos(am-LA)*.5+.5+(k%2?-.07:.04),0,1);
  poly(g,[[x,y],[x+Math.cos(a0)*r,y+Math.sin(a0)*r],[x+Math.cos(a1)*r,y+Math.sin(a1)*r]],mix('#68757a','#eef3f2',lit));
 }
 // okap i obręcze wzmacniające
 g.strokeStyle='#4a565b';g.lineWidth=3;g.beginPath();g.arc(x,y,r-1.5,0,Math.PI*2);g.stroke();
 g.strokeStyle='#d9e2e1';g.lineWidth=1;g.beginPath();g.arc(x,y,r-3.6,Math.PI*.55,Math.PI*1.45);g.stroke();
 g.strokeStyle='#00000026';g.lineWidth=1;for(const k of [.72,.46]){g.beginPath();g.arc(x,y,r*k,0,Math.PI*2);g.stroke()}
 // szczyt: wywietrznik z daszkiem
 g.fillStyle='#4a565b';g.beginPath();g.arc(x,y,6.5,0,Math.PI*2);g.fill();
 g.fillStyle='#b9c4c5';g.beginPath();g.arc(x-.5,y-.5,5,0,Math.PI*2);g.fill();
 g.fillStyle='#e6eded';g.beginPath();g.arc(x-1.5,y-1.5,2.4,0,Math.PI*2);g.fill();
 // właz rewizyjny i ramię rozdzielacza
 rect(g,x-r*.52,y-r*.12,10,8,'#3e484c');rect(g,x-r*.52+1,y-r*.12+1,8,6,'#8d999c');rect(g,x-r*.52+1,y-r*.12+1,8,2,'#cfd8d8');
 // drabinka z klatką po wschodniej stronie
 rect(g,x+r-10,y-4,17,8,'#3e484c');
 for(let i=0;i<5;i++)rect(g,x+r-8+i*3,y-3,1,6,'#b8c2c4');
 rect(g,x+r-10,y-4,17,1,'#d5dcdc');rect(g,x+r-10,y+3,17,1,'#2f393d');
}
// Wskaźnik poziomu zboża przy silosach (rysowany dynamicznie).
export function drawSiloGauges(g){
 const f=clamp(state.stored/SILO_T,0,1);
 for(const s of SILOS){
  const gx=Math.round(s.x+s.r+9),gy=Math.round(s.y-16);
  rect(g,gx-1,gy-1,7,34,'#2b3538');rect(g,gx,gy,5,32,'#59666a');
  const hgt=Math.round(32*f);rect(g,gx,gy+32-hgt,5,hgt,'#e6bd4f');
  for(let i=1;i<4;i++)rect(g,gx,gy+i*8,5,1,'#2b353888');
 }
}
