// Klawiatura i przyciski dotykowe. Bez zależności od pętli gry.
import {C,$,keys,state,RT,toast,DEBUG,active} from './core.js';
import {toggleSound,updateSound,resumeSound} from './sound.js';
import {toggleHeader} from './header.js';
export function toggleTool(){if(!active())return;if(!state.headerOn){toast('BRAK HEDERA — H ZAKŁADA');return}state.tool=!state.tool;toast(state.tool?'HEDER OPUSZCZONY — MOŻESZ KOSIĆ':'HEDER PODNIESIONY')}
export function toggleTime(){state.rate=state.rate===1?5:state.rate===5?20:1;toast('PRĘDKOŚĆ CZASU '+state.rate+'×')}
// Pauza dotyczy tylko trwającej rozgrywki (nie ekranu startowego ani końcowego).
export function setPaused(p,silent){
 if(!state.playing||state.paused===p)return;
 state.paused=p;keys.clear();updateSound(false);
 if(!silent)toast(p?'PAUZA — P LUB KLIKNIĘCIE WZNAWIA':'WZNOWIONO');
}
export function bindControls(reset){
 $('#start').addEventListener('click',()=>{if(state.done)reset();state.playing=true;state.paused=false;resumeSound();$('#overlay').classList.add('hidden');C.focus();if(RT.frame<90)toast('SPACJA — OPUŚĆ HEDER · ODKRYWAJ WIEŚ')});
 addEventListener('keydown',e=>{
  let k=e.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright','f3'].includes(k))e.preventDefault();
  if(e.repeat&&[' ','t','m','p','h','f3'].includes(k))return;
  if(k===' '){toggleTool();return}
  if(k==='h'){toggleHeader();return}
  if(k==='t'){toggleTime();return}
  if(k==='m'){toggleSound();return}
  if(k==='f3'){DEBUG.on=!DEBUG.on;return}
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
 for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();if(state.paused)setPaused(false);b.setPointerCapture(e.pointerId);keys.add(k);b.classList.add('held')});const release=e=>{keys.delete(k);b.classList.remove('held')};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)}
}
