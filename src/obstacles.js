// Wspólna lista przeszkód-pojazdów dla zwierząt i ludzi: pojazdy gracza i drugi pojazd, stojące wózki, pojazdy NPC.
// Lista jest odświeżana raz na krok symulacji (refreshObstacles), zapytania są tanie.
import {clamp} from './core.js';
import {playerObbs,otherObbs} from './vehicles.js';
import {standingCarts,cartObb} from './tow.js';
import {obbCircle} from './geometry.js';
let list=[],mine=[],npc=[];
export function setNpcObbs(l){npc=l}
export function refreshObstacles(){mine=playerObbs();list=[...mine,...otherObbs(),...standingCarts().map(cartObb),...npc]}
export function distToObb(o,x,y){const cs=Math.cos(o.a),sn=Math.sin(o.a),dx=x-o.x,dy=y-o.y,px=dx*cs+dy*sn,py=-dx*sn+dy*cs;return Math.hypot(px-clamp(px,-o.hw,o.hw),py-clamp(py,-o.hh,o.hh))}
// odległość od najbliższego pojazdu / wózka (0 = w środku)
export function obstacleDist(x,y){let m=1e9;for(const o of list){const d=distToObb(o,x,y);if(d<m)m=d}return m}
// odległość od pojazdu gracza (z holowanym wózkiem)
export function playerDist(x,y){let m=1e9;for(const o of mine){const d=distToObb(o,x,y);if(d<m)m=d}return m}
export function pushOutObstacles(e,r){for(const o of list){const m=obbCircle(o,{x:e.x,y:e.y,r});if(m){e.x-=m.nx*(m.depth+.5);e.y-=m.ny*(m.depth+.5)}}}
