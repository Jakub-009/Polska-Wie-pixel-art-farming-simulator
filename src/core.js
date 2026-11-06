// Wspólne jednostki, stan symulacji i małe funkcje rysowania.
// 0.4.0: stały krok czasowy, pauza jako osobny stan, tryb debug, liczniki czasu zamiast modulo klatek.
export const VERSION='0.6.0';
export const C=document.querySelector('#game');
export const ctx=C.getContext('2d',{alpha:false});
export const VIEW={w:640,h:360,scale:3,zoom:0,maxZoom:0};
export const $=s=>document.querySelector(s);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function hash(x,y,z=0){let n=Math.imul(x+1289|0,374761393)^Math.imul(y+3929|0,668265263)^Math.imul(z+17|0,2147483647);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296}
export function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
// Linia o nieparzystej grubości ląduje na środku piksela (+.5) — inaczej rozmywa się na dwa wiersze.
export function line(g,x,y,x2,y2,c,w=1){const o=(w%2===1)?.5:0;g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(Math.round(x)+o,Math.round(y)+o);g.lineTo(Math.round(x2)+o,Math.round(y2)+o);g.stroke()}
export const WORLD={w:2300,h:1840},FLD={x:235,y:177,n:80,t:8};FLD.w=FLD.n*FLD.t;FLD.h=FLD.w;export const N=FLD.n*FLD.n;

export function poly(g,pts,col){g.fillStyle=col;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill()}
// Jeden wektor światła dla całego świata: cienie padają na południowy wschód. Długość cienia = LIGHT * wysokość obiektu (px).
export const LIGHT={x:.84,y:.54};
export function shadow(g,x,y,w,h,height=45){const dx=LIGHT.x*height,dy=LIGHT.y*height;poly(g,[[x+6,y+6],[x+w+6,y+6],[x+w+dx,y+h+dy],[x+dx,y+h+dy]],'#40564268')}

export const keys=new Set();
// Start: podwórze gospodarstwa, kombajn skierowany na wyjazd (zachód), heder założony.
export const START={x:1380,y:515,angle:-Math.PI/2};
// Drugi pojazd (traktor) stoi na podwórzu; przyczepa zbożowa jest zaczepiona z tyłu traktora, wózek z hederem „leży” w kombajnie (mounted).
export const INIT_OTHER=()=>({kind:'tractor',x:1295,y:622,angle:0});
export const INIT_CARTS=()=>({
 grain:{kind:'grain',x:1295,y:702,angle:0,load:0,towedBy:'tractor'},
 header:{kind:'header',x:0,y:0,angle:0,load:0,towedBy:null},
 tiller:{kind:'tiller',x:1300,y:872,angle:0,load:0,towedBy:null},
 seeder:{kind:'seeder',x:1410,y:872,angle:0,load:0,towedBy:null}
});
export const state={vehicle:'combine',other:INIT_OTHER(),carts:INIT_CARTS(),auger:0,augerOut:false,unloading:false,dumping:false,flow:0,stored:0,money:0,grain:0,x:START.x,y:START.y,angle:START.angle,v:0,steer:0,tool:false,headerOn:true,tank:0,time:16*60+35,
  elapsed:0,rate:1,work:0,done:false,playing:false,paused:false,mute:true,cut:0};
// Ustawienia gracza (zapamiętywane w localStorage).
export const SETTINGS={volume:.8,particles:true,hints:true,zoom:0};
export const active=()=>state.playing&&!state.paused;
export const camera={x:state.x-340,y:state.y-200};
// Liczniki czasu (sekundy) zastępują dawne RT.frame%n — zachowanie nie zależy od odświeżania ekranu.
export const RT={hintT:0,last:0,frame:0,acc:0,stamp:0,msgT:0,reelSpin:0,birdT:0,wheelTravel:0,lifeT:0,strawT:0,dustT:0,warnT:0,hudT:0,fullT:0,hitchT:0,spillT:0};
export const DEBUG={on:false,fps:0,contacts:0};
export const fx=[];
// Jeden przelicznik px/metr na całą mapę i pojazdy.
export const PX_PER_M=12,COMBINE_SCALE=1,MAXSPEED=20,ROAD_SPEED=34,REVERSE_SPEED=12;
// Parametry jazdy: L = rozstaw osi (px) w modelu rowerowym; prędkości w px/s (12 px = 1 m).
// Dane pojazdów w jednym miejscu: model jazdy, obrys kolizji (półszerokość, półdługość, przesunięcie środka w tył) i punkt zaczepu (lokalne y, + = tył).
export const VEHICLES={
 combine:{L:38,work:MAXSPEED,road:ROAD_SPEED,rev:REVERSE_SPEED,acc:9,brake:23,hitch:49,obbs:[[26,22.5,-22.5],[22,23,23]],npcBody:[26,46,.5]},
 tractor:{L:30,work:56,road:62,rev:22,acc:17,brake:34,hitch:33,obbs:[[18,31.5,.5]],npcBody:[18,31.5,.5]},
 car:{npcBody:[10,23,0]},
 bus:{npcBody:[14,46,0]}
};
export const VEH=VEHICLES;
// Wózki: półszerokość/półdługość skrzyni, długość dyszla (px), położenie osi względem środka (ułamek półdługości w tył).
// Rura wysypowa kombajnu (lokalnie: x w prawo, y do tyłu): przegub na lewej burcie, po rozłożeniu sięga 73 px w bok — poza heder (44 px).
export const AUGER={px:-17,py:-14,len:56};
export const CARTS={grain:{hw:13,hh:31,tongue:16,axle:.5},header:{hw:12,hh:47,tongue:18,axle:0},
 tiller:{hw:29,hh:20,tongue:22,axle:.4},seeder:{hw:27,hh:22,tongue:22,axle:.4}};
export const HEADER_HALF=38*COMBINE_SCALE,HEADER_MIN=49*COMBINE_SCALE,HEADER_MAX=65*COMBINE_SCALE;
export const FIELD_HA=(FLD.w/PX_PER_M)*(FLD.h/PX_PER_M)/10000;
export const YIELD_T_HA=5.2,TANK_T=0.8,TRAILER_T=2.0,SILO_T=3.0,GRAIN_PRICE=1150,UNLOAD_TPS=.15,DUMP_TPS=.4,FINISH_SHARE=.992;
export function displayNumber(n,d=1){return n.toFixed(d).replace('.',',')}
export function formatDuration(t){const m=Math.floor(t/60),ss=Math.floor(t%60);return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0')}
export function toast(s){$('#msg').textContent=s;$('#msg').style.opacity='1';RT.msgT=3.3}
