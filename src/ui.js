// HUD, pasek sterowania i komunikaty.
import {$,state,RT,N,FIELD_HA,TANK_T,TRAILER_T,SILO_T,PX_PER_M,SETTINGS,displayNumber,formatDuration} from './core.js';
import {crop} from './world.js';
import {updateSound} from './sound.js';
import {canAttach} from './header.js';
import {hitchCandidate,towedBy,TOOLS} from './tow.js';
import {spoutOverTrailer} from './trailer.js';
const NAMES={grain:'PRZYCZEPA',header:'WÓZEK Z HEDEREM',tiller:'AGREGAT',seeder:'SIEWNIK'};
// Panel podpowiedzi: tylko to, co ma sens w tej chwili (maks. 4 linie).
function contextHints(){
 const h=[],k=state.vehicle,tow=towedBy(k),c=state.carts.grain;
 if(k==='combine'){
  if(!state.headerOn){h.push(canAttach()?['H','załóż heder (jest przed maską)']:['H','podjedź do hedera przodem, równolegle']);}
  else h.push(['SPACJA',state.tool?'podnieś heder':'opuść heder i koś']);
  if(state.tank>.9&&!state.augerOut)h.push(['U','zbiornik pełny — rozłóż rurę']);
  if(state.augerOut){h.push(['U','złóż rurę']);h.push(spoutOverTrailer()?['J',state.unloading?'wyłącz rozładunek':'rozładunek']:['','ustaw koniec rury nad przyczepą (znacznik)'])}
 }else{
  if(tow===c)h.push(['E',c.load>.01?'wysyp (nad koszem silosu!)':'przyczepa pusta']);
  if(tow&&TOOLS.includes(tow.kind))h.push(['SPACJA',tow.working?'podnieś '+NAMES[tow.kind].toLowerCase():'opuść '+NAMES[tow.kind].toLowerCase()+(tow.kind==='tiller'?' (orze ściernisko)':' (sieje na zaoranym)')]);
  h.push(tow?['R','odczep '+NAMES[tow.kind].toLowerCase()]:hitchCandidate()?['R','zaczep '+NAMES[hitchCandidate().kind].toLowerCase()]:['R','cofnij do dyszla, by zaczepić']);
 }
 if(state.stored>.05)h.push(['K','sprzedaj zboże z silosów']);
 if(k==='tractor'&&tow&&TOOLS.includes(tow.kind))h.push(['G','przyspiesz wzrost (test)']);
 h.push(['V','zmień pojazd · B odblokuj · F1 pomoc']);
 return h.slice(0,4);
}
function hud(){
 const t=Math.floor(state.time),hh=Math.floor(t/60)%24,mm=t%60;
 $('#time').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
 $('#rate').textContent=state.rate+'×';
 $('#speed').textContent=Math.round(Math.abs(state.v)/PX_PER_M*3.6);
 const tow=towedBy(state.vehicle);
 $('#toolstatus').textContent=state.vehicle==='tractor'?'traktor'+(tow?' + '+NAMES[tow.kind].toLowerCase()+(TOOLS.includes(tow.kind)?(tow.working?' ↓':' ↑'):''):''):(!state.headerOn?'bez hedera':state.tool?'heder opuszczony':'heder w górze')+(tow?' · wózek':'');
 $('#tanklabel').textContent=state.unloading?'Rozładunek ▼':'Zbiornik';
 $('#tanktext').textContent=displayNumber(state.tank*TANK_T,2)+' / '+displayNumber(TANK_T,1)+' t';
 const c=state.carts.grain;
 $('#trltext').textContent=displayNumber(c.load,2)+' / '+displayNumber(TRAILER_T,1)+' t'+(c.towedBy?'':' (stoi)');
 $('#stored').textContent=displayNumber(state.stored,2)+' / '+displayNumber(SILO_T,1);
 $('#money').textContent=Math.round(state.money).toLocaleString('pl-PL');
 $('#tankbar').style.width=state.tank*100+'%';
 $('#progress').textContent=displayNumber(state.cut/N*100,1)+'%';
 $('#progressbar').style.width=state.cut/N*100+'%';
 $('#area').textContent=`${displayNumber(state.cut/N*FIELD_HA,2)} / ${displayNumber(FIELD_HA,2)} ha · ${formatDuration(state.elapsed)}`;
 keybar();tillage();
 const hp=$('#hints');
 if(SETTINGS.hints&&state.playing&&!state.paused){hp.style.display='block';hp.innerHTML=contextHints().map(([k,t])=>(k?`<b>${k}</b> `:'')+t).join('<br>')}else hp.style.display='none';
}
const KB={
 combine:[['W S','jazda'],['A D','skręt'],['Spacja','heder'],['H','zdejmij heder'],['U','rura'],['J','rozładunek'],['V','pojazd']],
 tractor:[['W S','jazda'],['A D','skręt'],['Spacja','narzędzie'],['R','zaczep'],['E','wysyp'],['K','sprzedaż'],['G','wzrost'],['V','pojazd']]
};
let kbSig='';
function keybar(){
 const el=$('#keybar');if(!el)return;
 const on=SETTINGS.keybar&&state.playing&&!state.paused;
 const sig=on?state.vehicle+(state.headerOn?1:0):'';
 if(sig===kbSig)return;kbSig=sig;
 if(!on){el.style.display='none';return}
 const set=(KB[state.vehicle]||KB.combine).concat([['Z','zoom'],['F1','pomoc']]);
 el.innerHTML=set.map(([k,t])=>'<span class="kk">'+k.split(' ').map(x=>'<b>'+x+'</b>').join('')+'<i>'+t+'</i></span>').join('');
 el.style.display='flex';
}
let tillT=0;
function tillage(){
 const now=performance.now();if(now<tillT)return;tillT=now+500;
 let t=0,s=0;const n=crop.length;
 for(let i=0;i<n;i++){const c=crop[i];if(c>=2)t++;if(c>=3)s++}
 const el=$('#tillage');
 if(t===0){el.style.display='none';return}
 el.style.display='block';el.textContent='Zaorane '+Math.round(t/N*100)+'% · obsiane '+Math.round(s/N*100)+'%';
}
export {hud};
