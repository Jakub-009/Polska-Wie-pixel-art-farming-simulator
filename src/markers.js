// Znaczniki pomocnicze w świecie: koniec rury nad przyczepą (zielony) lub obok (czerwony), dyszle w zasięgu zaczepu, heder gotowy do założenia.
import {ctx,rect,state,SETTINGS} from './core.js';
import {augerTip,spoutOverTrailer} from './trailer.js';
import {hitchPoint,hitchCandidate,standingCarts,tongueTip,towedBy} from './tow.js';
import {canAttach} from './header.js';
function bracket(x,y,col,r){
 x=Math.round(x);y=Math.round(y);
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){rect(ctx,x+sx*r-(sx>0?2:0),y+sy*r,3,1,col);rect(ctx,x+sx*r,y+sy*r-(sy>0?2:0),1,3,col)}
 rect(ctx,x-1,y-1,3,3,col);
}
export function drawMarkers(){
 if(!SETTINGS.hints||!state.playing)return;
 const pulse=(Math.sin(state.elapsed*6)+1)/2,r=5+Math.round(pulse*2);
 const cp=state.vehicle==='combine'?{x:state.x,y:state.y,angle:state.angle}:state.other.kind==='combine'?state.other:null;
 if(cp&&state.augerOut&&state.auger>.5){const [x,y]=augerTip(cp,state.auger);bracket(x,y,spoutOverTrailer()?'#8cf08c':'#f0705f',r)}
 const k=state.vehicle,H=hitchPoint(k);
 if(H&&!towedBy(k)){
  const cand=hitchCandidate();
  for(const c of standingCarts()){
   const [tx,ty]=tongueTip(c);
   if(Math.hypot(H[0]-tx,H[1]-ty)<90)bracket(tx,ty,cand===c?'#8cf08c':'#f0d36a',r);
  }
  if(standingCarts().length&&Math.hypot(H[0]-state.x,H[1]-state.y)>0)bracket(H[0],H[1],'#ffffff99',3);
 }
 if(canAttach()){const c=state.carts.header;bracket(c.x,c.y,'#8cf08c',r+4)}
}
