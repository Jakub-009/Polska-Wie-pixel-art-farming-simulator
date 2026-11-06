// Klawiatura i przyciski dotykowe. Bez zależności od pętli gry.
import {C,$,keys,state,RT,toast,DEBUG,active,VIEW,SETTINGS} from './core.js';
import {saveSettings} from './save.js';
import {toggleSound,updateSound,resumeSound} from './sound.js';
import {toggleHeader,switchVehicle} from './header.js';
import {toggleAuger,toggleUnload,toggleDump,sellGrain} from './trailer.js';
import {toggleHitch,towedBy,TOOLS} from './tow.js';
import {growCrops} from './harvest.js';
const ACT={v:switchVehicle,u:toggleAuger,j:toggleUnload,r:toggleHitch,e:toggleDump,k:sellGrain,g:growCrops};
export function toggleTool(){if(!active())return;
 if(state.vehicle==='tractor'){const t=towedBy('tractor');if(!t||!TOOLS.includes(t.kind)){toast('Zaczep agregat lub siewnik (R), by pracować w polu.');return}t.working=!t.working;state.tool=t.working;toast(t.working?(t.kind==='tiller'?'Agregat opuszczony — orze ściernisko.':'Siewnik opuszczony — sieje na zaoranym.'):'Narzędzie podniesione.');return}
 if(state.vehicle!=='combine'){toast('Traktor nie ma hedera — przesiądź się (V).');return}if(!state.headerOn){toast('Brak hedera — załóż go klawiszem H.');return}state.tool=!state.tool;toast(state.tool?'Heder opuszczony — możesz kosić.':'Heder podniesiony.')}
export function toggleTime(){state.rate=state.rate===1?5:state.rate===5?20:1;toast('Czas płynie '+state.rate+'× szybciej.')}
// Pauza dotyczy tylko trwającej rozgrywki (nie ekranu startowego ani końcowego).
export function setPaused(p,silent){
 if(!state.playing||state.paused===p)return;
 state.paused=p;keys.clear();updateSound(false);
 if(!silent)toast(p?'Pauza — P lub kliknięcie wznawia grę.':'Gra wznowiona.');
}
// Zoom: poziomy oddalenia = mniejsza całkowita skala pikseli (obraz nadal ostry). Zmiana wywołuje przeliczenie rozmiaru w main.js.
function zoom(d,cycle){
 let z=VIEW.zoom+d;
 if(cycle&&z>VIEW.maxZoom)z=0;
 z=Math.max(0,Math.min(VIEW.maxZoom,z));
 if(z===VIEW.zoom){if(VIEW.maxZoom===0)toast('Ekran jest za mały na oddalenie.');return}
 VIEW.zoom=z;SETTINGS.zoom=z;saveSettings();dispatchEvent(new Event('resize'));
 toast(z?'Oddalenie '+z+' (Z, +, −).':'Widok standardowy.');
}
export function bindControls(reset,ext={}){
 ACT.b=()=>ext.unstuck&&ext.unstuck();
 C.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1:-1)},{passive:false});
 const begin=()=>{state.playing=true;state.paused=false;resumeSound();$('#overlay').classList.add('hidden');C.focus();if(RT.frame<90)toast('Witaj w gospodarstwie! F1 pokazuje sterowanie.')};
 const refreshStart=()=>{const s=ext.hasSave&&ext.hasSave();$('#continue').style.display=s?'block':'none';$('#start').textContent=s?'NOWA GRA':'ZACZNIJ GRĘ';$('#continue').textContent='WCZYTAJ ZAPIS'};
 refreshStart();
 $('#start').addEventListener('click',()=>{if(ext.hasSave&&ext.hasSave()){reset();ext.clearSave&&ext.clearSave()}begin()});
 $('#continue').addEventListener('click',()=>{if(ext.loadGame&&ext.loadGame())begin();else{toast('Nie udało się wczytać zapisu.');refreshStart()}});
 // ustawienia i pomoc
 const sp=$('#settings'),help=$('#help');
 const syncSettings=()=>{$('#set-volume').value=Math.round(SETTINGS.volume*100);$('#set-particles').checked=SETTINGS.particles;$('#set-hints').checked=SETTINGS.hints;$('#set-keybar').checked=SETTINGS.keybar};
 syncSettings();
 const toggleSettings=()=>{sp.classList.toggle('hidden');syncSettings()};
 $('#settingsbtn').addEventListener('click',toggleSettings);$('#set-close').addEventListener('click',toggleSettings);
 $('#set-volume').addEventListener('input',e=>{SETTINGS.volume=e.target.value/100;saveSettings()});
 $('#set-particles').addEventListener('change',e=>{SETTINGS.particles=e.target.checked;saveSettings()});
 $('#set-hints').addEventListener('change',e=>{SETTINGS.hints=e.target.checked;saveSettings()});
 $('#set-keybar').addEventListener('change',e=>{SETTINGS.keybar=e.target.checked;saveSettings()});
 $('#set-newgame').addEventListener('click',()=>{ext.clearSave&&ext.clearSave();reset();state.playing=true;sp.classList.add('hidden');toast('Nowa gra.')});
 $('#help-close').addEventListener('click',()=>help.classList.add('hidden'));
 window.__refreshStart=refreshStart;
 addEventListener('keydown',e=>{
  let k=e.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright','f1','f3'].includes(k))e.preventDefault();
  if(e.repeat&&[' ','t','m','p','h','v','u','j','r','e','b','k','g','f1','f3'].includes(k))return;
  if(k===' '){toggleTool();return}
  if(k==='h'){toggleHeader();return}
  if(ACT[k]){ACT[k]();return}
  if(k==='z'){zoom(e.shiftKey?-1:1,true);return}
  if(k==='+'||k==='='){zoom(-1);return}
  if(k==='-'||k==='_'){zoom(1);return}
  if(k==='t'){toggleTime();return}
  if(k==='m'){toggleSound();return}
  if(k==='f3'){DEBUG.on=!DEBUG.on;return}
  if(k==='f1'){$('#help').classList.toggle('hidden');return}
  if(k==='escape'){$('#settings').classList.toggle('hidden');return}
  if(k==='p'){setPaused(!state.paused);return}
  if(k==='enter'&&!state.playing&&!$('#overlay').classList.contains('hidden')){$('#start').click();return}
  if(state.paused)return;
  keys.add(k);
 });
 addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 addEventListener('blur',()=>{keys.clear();setPaused(true)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();setPaused(true)}});
 C.addEventListener('pointerdown',()=>{if(state.paused)setPaused(false)});
 $('#speedbtn').addEventListener('click',toggleTime);$('#soundbtn').addEventListener('click',toggleSound);$('#mobiletool').addEventListener('pointerdown',e=>{e.preventDefault();toggleTool()});$('#mobilehdr').addEventListener('pointerdown',e=>{e.preventDefault();toggleHeader()});
 for(const b of document.querySelectorAll('[data-act]'))b.addEventListener('pointerdown',e=>{e.preventDefault();ACT[b.dataset.act]()});
 for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();if(state.paused)setPaused(false);b.setPointerCapture(e.pointerId);keys.add(k);b.classList.add('held')});const release=e=>{keys.delete(k);b.classList.remove('held')};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)}
}
