// HUD, komunikaty i karta zakończenia żniw.
import {$,state,RT,N,FIELD_HA,TANK_T,TRAILER_T,PX_PER_M,displayNumber,formatDuration} from './core.js';
import {crop} from './world.js';
import {updateSound} from './sound.js';
function hud(){
 const t=Math.floor(state.time),hh=Math.floor(t/60)%24,mm=t%60;
 $('#time').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
 $('#rate').textContent=state.rate+'×';
 $('#speed').textContent=Math.round(Math.abs(state.v)/PX_PER_M*3.6);
 $('#toolstatus').textContent=state.vehicle==='tractor'?'TRAKTOR (TEST)':!state.headerOn?'BEZ HEDERA':state.tool?'HEDER ↓ WŁ.':'HEDER ↑ WYŁ.';
 $('#tanklabel').textContent=state.unloading?'ROZŁADUNEK ▼':'ZBIORNIK';
 $('#tanktext').textContent=displayNumber(state.tank*TANK_T,2)+' / '+displayNumber(TANK_T,1)+' t';
 $('#trltext').textContent=displayNumber(state.trailer.load,2)+' / '+displayNumber(TRAILER_T,1)+' t'+(state.trailer.hitched?'':' (ODCZEP.)');
 $('#stored').textContent=displayNumber(state.stored,2);
 $('#tankbar').style.width=state.tank*100+'%';
 $('#progress').textContent=displayNumber(state.cut/N*100,1)+'%';
 $('#progressbar').style.width=state.cut/N*100+'%';
 $('#area').textContent=`${displayNumber(state.cut/N*FIELD_HA,2)} / ${displayNumber(FIELD_HA,2)} ha · ${formatDuration(state.elapsed)}`;
}
function finish(){
 state.playing=false;updateSound(false);
 $('#overlay').classList.remove('hidden');
 $('#cardtitle').textContent='Żniwa ukończone!';
 $('#cardtext').textContent=`Skoszono ${displayNumber(state.cut/N*100,1)}% pola (${displayNumber(state.cut/N*FIELD_HA,2)} ha) w ${formatDuration(state.elapsed)} rzeczywistego czasu. Zebrano około ${displayNumber(state.grain,2)} t zboża, do magazynu trafiło ${displayNumber(state.stored,2)} t. Kolejny etap: uprawa i siew.`;
 $('#keylegend').style.display='none';$('#start').textContent='SKOŚ PONOWNIE';
}

export {hud,finish};
