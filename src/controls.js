// Klawiatura i przyciski dotykowe. Bez zależności od pętli gry.
import {C,$,keys,state,RT,toast} from './core.js';
import {toggleSound,updateSound,resumeSound} from './sound.js';
export function toggleTool(){if(!state.playing)return;state.tool=!state.tool;toast(state.tool?'HEDER OPUSZCZONY — MOŻESZ KOSIĆ':'HEDER PODNIESIONY')}
export function toggleTime(){state.rate=state.rate===1?5:state.rate===5?20:1;toast('PRĘDKOŚĆ CZASU '+state.rate+'×')}
export function bindControls(reset){
$('#start').addEventListener('click',()=>{if(state.done)reset();state.playing=true;resumeSound();$('#overlay').classList.add('hidden');C.focus();if(RT.frame<90)toast('SPACJA — OPUŚĆ HEDER · ODKRYWAJ WIEŚ')});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat&&[' ','t','m','p'].includes(k))return;if(k===' '){toggleTool();return}if(k==='t'){toggleTime();return}if(k==='m'){toggleSound();return}if(k==='p'){state.playing=!state.playing;updateSound(false);toast(state.playing?'WZNOWIONO':'PAUZA');return}if(k==='enter'&&!state.playing&&!$('#overlay').classList.contains('hidden')){$('#start').click();return}keys.add(k)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
$('#speedbtn').addEventListener('click',toggleTime);$('#soundbtn').addEventListener('click',toggleSound);$('#mobiletool').addEventListener('pointerdown',e=>{e.preventDefault();toggleTool()});
for(const b of document.querySelectorAll('[data-key]')){const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);b.classList.add('held')});const release=e=>{keys.delete(k);b.classList.remove('held')};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)}
}
