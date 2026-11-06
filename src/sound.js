// WebAudio: silnik, młocarnia, wiatr, ptaki.
import {state,$,toast} from './core.js';
let snd=null;
function soundInit(){
 try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   const ac=new Audio(),master=ac.createGain(); master.gain.value=0;master.connect(ac.destination);
   const engineF=ac.createBiquadFilter();engineF.type='lowpass';engineF.frequency.value=350;
   const engineG=ac.createGain();engineG.gain.value=.11;engineF.connect(engineG).connect(master);
   const engA=ac.createOscillator();engA.type='sawtooth';engA.frequency.value=57;engA.connect(engineF);engA.start();
   const engB=ac.createOscillator();engB.type='triangle';engB.frequency.value=114;engB.connect(engineF);engB.start();
   const buffer=ac.createBuffer(1,Math.round(ac.sampleRate*.8),ac.sampleRate);
   let seed=1999,bd=buffer.getChannelData(0);
   for(let i=0;i<bd.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;bd[i]=(seed/2147483648)*.5}
   const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;
   const threshF=ac.createBiquadFilter();threshF.type='bandpass';threshF.frequency.value=730;threshF.Q.value=.55;
   const threshG=ac.createGain();threshG.gain.value=0;noise.connect(threshF).connect(threshG).connect(master);
   const windF=ac.createBiquadFilter();windF.type='lowpass';windF.frequency.value=290;
   const windG=ac.createGain();windG.gain.value=.017;noise.connect(windF).connect(windG).connect(master);
   noise.start();snd={ac,master,engA,engB,engineF,engineG,threshG,windG};
 }catch(e){state.mute=true}
}
function toggleSound(){
 if(!snd)soundInit();state.mute=!state.mute;
 $('#soundbtn').textContent=state.mute?'♪ WYŁ.':'♪ WŁ.';
 snd?.ac.resume();
 if(!state.mute)toast('DŹWIĘK WŁĄCZONY');
}
function updateSound(gas){
 if(!snd)return;
 const {ac,master,engA,engB,engineF,engineG,threshG,windG}=snd,t=ac.currentTime;
 const on=state.playing&&!state.mute;
 master.gain.setTargetAtTime(on?.30:0,t,.08);
 const speed=Math.abs(state.v)/MAXSPEED;
 // Revs depend on throttle and workload, not solely ground speed.
 const pitch=52+speed*26+(gas?13:0)+(state.tool&&gas?4:0);
 engA.frequency.setTargetAtTime(pitch,t,.11);
 engB.frequency.setTargetAtTime(pitch*2.02,t,.1);
 engineF.frequency.setTargetAtTime(260+speed*190+(gas?100:0),t,.12);
 engineG.gain.setTargetAtTime(.10+.025*speed,t,.15);
 threshG.gain.setTargetAtTime(state.tool&&Math.abs(state.v)>2?.047:0,t,.15);
 windG.gain.setTargetAtTime(.016+.008*Math.sin(state.elapsed*.25)**2,t,.3);
}
function birdNote(){
 if(!snd||state.mute||!state.playing)return;
 const {ac,master}=snd,t=ac.currentTime;
 const osc=ac.createOscillator(),v=ac.createGain();osc.type='sine';
 osc.frequency.setValueAtTime(1470,t);osc.frequency.linearRampToValueAtTime(2160,t+.11);osc.frequency.linearRampToValueAtTime(1670,t+.23);
 v.gain.setValueAtTime(.00001,t);v.gain.linearRampToValueAtTime(.012,t+.035);v.gain.exponentialRampToValueAtTime(.00001,t+.28);
 osc.connect(v).connect(master);osc.start(t);osc.stop(t+.29);
}

export function resumeSound(){snd?.ac.resume();}
export {toggleSound,updateSound,birdNote};
