// Zapis gry i ustawienia (localStorage; wszystko w try/catch, bo magazyn bywa niedostępny).
import {state,SETTINGS,FLD,N,toast,INIT_CARTS,INIT_OTHER,RT} from './core.js';
import {crop} from './world.js';
const KEY='polska-wies-save-1',SKEY='polska-wies-settings-1';
function b64(u8){let s='';for(let i=0;i<u8.length;i+=4096)s+=String.fromCharCode.apply(null,u8.subarray(i,i+4096));return btoa(s)}
function unb64(s){const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u}
export function hasSave(){try{return !!localStorage.getItem(KEY)}catch(e){return false}}
export function clearSave(){try{localStorage.removeItem(KEY)}catch(e){}}
export function saveGame(){
 if(!state.playing||state.done)return;
 try{
  const keep=['vehicle','other','x','y','angle','headerOn','carts','tank','grain','stored','money','cut','time','elapsed','auger','augerOut'];
  const o={v:1,crop:b64(crop)};for(const k of keep)o[k]=state[k];
  localStorage.setItem(KEY,JSON.stringify(o));
 }catch(e){}
}
// Wczytuje stan; afterFn odświeża warstwy (pole, kamera).
export function loadGame(afterFn){
 try{
  const raw=localStorage.getItem(KEY);if(!raw)return false;
  const o=JSON.parse(raw);if(o.v!==1)return false;
  crop.set(unb64(o.crop).subarray(0,N));
  for(const k of ['vehicle','other','x','y','angle','headerOn','carts','tank','grain','stored','money','cut','time','elapsed','auger','augerOut'])if(o[k]!==undefined)state[k]=o[k];
  state.v=0;state.steer=0;state.tool=false;state.unloading=false;state.dumping=false;
  for(const c of Object.values(state.carts)){c.hx=null}
  let n=0;for(let i=0;i<N;i++)n+=crop[i]?1:0;state.cut=n;
  afterFn&&afterFn();return true;
 }catch(e){return false}
}
export function saveSettings(){try{localStorage.setItem(SKEY,JSON.stringify(SETTINGS))}catch(e){}}
export function loadSettings(){try{Object.assign(SETTINGS,JSON.parse(localStorage.getItem(SKEY)||'{}'))}catch(e){}}
