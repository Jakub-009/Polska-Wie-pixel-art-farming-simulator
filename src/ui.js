// HUD, komunikaty i karta zakończenia żniw.
import {$,state,RT,N,FIELD_HA,TANK_T,TRAILER_T,SILO_T,PX_PER_M,SETTINGS,displayNumber,formatDuration} from './core.js';
import {crop} from './world.js';
import {updateSound} from './sound.js';
import {canAttach} from './header.js';
import {hitchCandidate,towedBy} from './tow.js';
import {spoutOverTrailer} from './trailer.js';
const NAMES={grain:'PRZYCZEPA',header:'WÓZEK Z HEDEREM'};
// Panel podpowiedzi: tylko to, co ma sens w tej chwili (maks. 4 linie).
function contextHints(){
 const h=[],k=state.vehicle,tow=towedBy(k),c=state.carts.grain;
 if(k==='combine'){
  if(!state.headerOn){h.push(canAttach()?['H','załóż heder (jest przed maską)']:['H','podjedź do hedera przodem, równolegle']);}
  else h.push(['SPACJA',state.tool?'podnieś heder':'opuść heder i kosz']);
  if(state.tank>.9&&!state.augerOut)h.push(['U','zbiornik pełny — rozłóż rurę']);
  if(state.augerOut){h.push(['U','złóż rurę']);h.push(spoutOverTrailer()?['J',state.unloading?'wyłącz rozładunek':'rozładunek']:['','ustaw koniec rury nad przyczepą (znacznik)'])}
 }else{
  if(tow===c)h.push(['E',c.load>.01?'wysyp (nad koszem silosu!)':'przyczepa pusta']);
  h.push(tow?['R','odczep '+NAMES[tow.kind].toLowerCase()]:hitchCandidate()?['R','zaczep '+NAMES[hitchCandidate().kind].toLowerCase()]:['R','cofnij do dyszla, by zaczepić']);
 }
 if(state.stored>.05)h.push(['K','sprzedaj zboże z silosów']);
 h.push(['V','zmień pojazd · B odblokuj · F1 pomoc']);
 return h.slice(0,4);
}
function hud(){
 const t=Math.floor(state.time),hh=Math.floor(t/60)%24,mm=t%60;
 $('#time').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
 $('#rate').textContent=state.rate+'×';
 $('#speed').textContent=Math.round(Math.abs(state.v)/PX_PER_M*3.6);
 const tow=towedBy(state.vehicle);
 $('#toolstatus').textContent=state.vehicle==='tractor'?'TRAKTOR'+(tow?' + '+NAMES[tow.kind]:''):(!state.headerOn?'BEZ HEDERA':state.tool?'HEDER ↓ WŁ.':'HEDER ↑ WYŁ.')+(tow?' · WÓZEK':'');
 $('#tanklabel').textContent=state.unloading?'ROZŁADUNEK ▼':'ZBIORNIK';
 $('#tanktext').textContent=displayNumber(state.tank*TANK_T,2)+' / '+displayNumber(TANK_T,1)+' t';
 const c=state.carts.grain;
 $('#trltext').textContent=displayNumber(c.load,2)+' / '+displayNumber(TRAILER_T,1)+' t'+(c.towedBy?'':' (STOI)');
 $('#stored').textContent=displayNumber(state.stored,2)+' / '+displayNumber(SILO_T,1);
 $('#money').textContent=Math.round(state.money).toLocaleString('pl-PL');
 $('#tankbar').style.width=state.tank*100+'%';
 $('#progress').textContent=displayNumber(state.cut/N*100,1)+'%';
 $('#progressbar').style.width=state.cut/N*100+'%';
 $('#area').textContent=`${displayNumber(state.cut/N*FIELD_HA,2)} / ${displayNumber(FIELD_HA,2)} ha · ${formatDuration(state.elapsed)}`;
 const hp=$('#hints');
 if(SETTINGS.hints&&state.playing&&!state.paused){hp.style.display='block';hp.innerHTML=contextHints().map(([k,t])=>(k?`<b>${k}</b> `:'')+t).join('<br>')}else hp.style.display='none';
}
function finish(){
 state.playing=false;updateSound(false);
 $('#overlay').classList.remove('hidden');
 $('#cardtitle').textContent='Żniwa ukończone!';
 $('#cardtext').textContent=`Skoszono ${displayNumber(state.cut/N*100,1)}% pola (${displayNumber(state.cut/N*FIELD_HA,2)} ha) w ${formatDuration(state.elapsed)} rzeczywistego czasu. Zebrano około ${displayNumber(state.grain,2)} t zboża, w silosach jest ${displayNumber(state.stored,2)} t, na koncie ${Math.round(state.money)} zł. Kolejny etap: uprawa i siew.`;
 $('#keylegend').style.display='none';$('#start').textContent='SKOŚ PONOWNIE';$('#continue').style.display='none';
}

export {hud,finish};
